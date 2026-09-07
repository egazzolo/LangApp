alter table public.profiles
  add column if not exists is_premium boolean not null default false,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists grace_period_ends_at timestamptz,
  add column if not exists premium_expires_at timestamptz,
  add column if not exists premium_plan text,
  add column if not exists premium_source text,
  add column if not exists entitlement_updated_at timestamptz not null default now();

alter table public.profiles drop constraint if exists profiles_premium_plan_check;
alter table public.profiles add constraint profiles_premium_plan_check
  check (premium_plan is null or premium_plan in ('premium_monthly', 'premium_annual'));

alter table public.subscriptions add column if not exists grace_period_ends_at timestamptz;

revoke update on table public.profiles from authenticated;
grant update (interface_language, support_language, target_language, english_level, pronunciation_target, correction_intensity, timezone, country_code, voice_processing_consent_at, onboarding_completed_at, updated_at)
on table public.profiles to authenticated;

create or replace function public.refresh_premium_entitlement(target_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  next_is_premium boolean := false;
  next_trial_ends_at timestamptz;
  next_grace_ends_at timestamptz;
  next_expires_at timestamptz;
  next_plan text;
  next_source text;
begin
  select
    coalesce(bool_or(status in ('active', 'canceled') and (current_period_ends_at is null or current_period_ends_at > now())), false),
    max(trial_ends_at) filter (where status = 'trialing' and trial_ends_at > now()),
    max(grace_period_ends_at) filter (where status = 'past_due' and grace_period_ends_at > now()),
    max(current_period_ends_at) filter (where status in ('active', 'canceled') and (current_period_ends_at is null or current_period_ends_at > now()))
  into next_is_premium, next_trial_ends_at, next_grace_ends_at, next_expires_at
  from public.subscriptions where user_id = target_user_id;

  select plan_key, store into next_plan, next_source
  from public.subscriptions
  where user_id = target_user_id and (
    (status in ('active', 'canceled') and (current_period_ends_at is null or current_period_ends_at > now()))
    or (status = 'trialing' and trial_ends_at > now())
    or (status = 'past_due' and grace_period_ends_at > now())
  )
  order by coalesce(grace_period_ends_at, trial_ends_at, current_period_ends_at, 'infinity'::timestamptz) desc
  limit 1;

  update public.profiles
  set is_premium = next_is_premium,
      trial_ends_at = next_trial_ends_at,
      grace_period_ends_at = next_grace_ends_at,
      premium_expires_at = next_expires_at,
      premium_plan = next_plan,
      premium_source = next_source,
      entitlement_updated_at = now()
  where id = target_user_id;
end;
$$;

revoke all on function public.refresh_premium_entitlement(uuid) from public, anon, authenticated;
grant execute on function public.refresh_premium_entitlement(uuid) to service_role;

create or replace function public.sync_premium_entitlement_from_subscription()
returns trigger language plpgsql security definer set search_path = public as $$
declare affected_user_id uuid;
begin
  affected_user_id := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
  perform public.refresh_premium_entitlement(affected_user_id);
  if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id then
    perform public.refresh_premium_entitlement(old.user_id);
  end if;
  return null;
end;
$$;

revoke all on function public.sync_premium_entitlement_from_subscription() from public, anon, authenticated;
drop trigger if exists sync_premium_entitlement_on_subscription on public.subscriptions;
create trigger sync_premium_entitlement_on_subscription
after insert or update or delete on public.subscriptions
for each row execute function public.sync_premium_entitlement_from_subscription();

do $$
declare existing_user_id uuid;
begin
  for existing_user_id in select id from public.profiles loop
    perform public.refresh_premium_entitlement(existing_user_id);
  end loop;
end;
$$;
