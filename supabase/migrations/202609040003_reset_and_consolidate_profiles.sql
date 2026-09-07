-- Approved development reset: all existing Lang App users are test accounts.
-- Deleting auth users cascades through their Fersons, chats, learning data, and preferences.
-- Observability rows use SET NULL on user deletion, so clear those test records explicitly.
delete from public.analytics_events;
delete from public.ai_usage;
delete from auth.users;

-- Entitlement state now lives directly on profiles. Store webhooks will update it
-- with the service role; clients can read it but cannot change it.
drop table if exists public.subscription_events cascade;
drop table if exists public.subscriptions cascade;
drop function if exists public.sync_premium_entitlement_from_subscription() cascade;
drop function if exists public.refresh_premium_entitlement(uuid) cascade;

-- Recreate the table so account and entitlement columns appear first in Table Editor.
drop table public.profiles cascade;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  is_premium boolean not null default false,
  premium_plan text,
  premium_source text,
  trial_ends_at timestamptz,
  grace_period_ends_at timestamptz,
  premium_expires_at timestamptz,
  store_original_transaction_id text,
  store_product_id text,
  entitlement_updated_at timestamptz not null default now(),
  interface_language text not null default 'en',
  support_language text not null default 'en',
  target_language text not null default 'en' check (target_language = 'en'),
  english_level text,
  pronunciation_target text not null default 'general-american',
  correction_intensity text not null default 'balanced',
  timezone text not null default 'UTC',
  country_code text,
  voice_processing_consent_at timestamptz,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_premium_plan_check
    check (premium_plan is null or premium_plan in ('premium_monthly', 'premium_annual'))
);

alter table public.profiles enable row level security;
create policy "own profiles read" on public.profiles for select using (id = auth.uid());
create policy "own profiles update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (
  interface_language, support_language, target_language, english_level,
  pronunciation_target, correction_intensity, timezone, country_code,
  voice_processing_consent_at, onboarding_completed_at, updated_at
) on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

-- Dropping profiles removed its incoming foreign keys. Restore them.
alter table public.characters add constraint characters_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.character_connections add constraint character_connections_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.revealed_character_facts add constraint revealed_character_facts_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.conversations add constraint conversations_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.messages add constraint messages_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.voice_messages add constraint voice_messages_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.memories add constraint memories_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.learner_profiles add constraint learner_profiles_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.language_assessments add constraint language_assessments_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.pronunciation_assessments add constraint pronunciation_assessments_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.analytics_events add constraint analytics_events_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete set null;
alter table public.ai_usage add constraint ai_usage_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete set null;
alter table public.notification_preferences add constraint notification_preferences_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.generated_notifications add constraint generated_notifications_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, new.raw_user_meta_data ->> 'email'));
  insert into public.notification_preferences (user_id) values (new.id);
  insert into public.learner_profiles (user_id) values (new.id);
  return new;
end;
$$;

create or replace function public.sync_profile_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set email = coalesce(new.email, new.raw_user_meta_data ->> 'email'),
      updated_at = now()
  where id = new.id;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.sync_profile_email() from public, anon, authenticated;

drop trigger if exists sync_profile_email_on_auth_user on auth.users;
create trigger sync_profile_email_on_auth_user
after update of email, raw_user_meta_data on auth.users
for each row execute procedure public.sync_profile_email();
