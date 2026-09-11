create table if not exists public.learning_skill_signals (
  user_id uuid not null references auth.users(id) on delete cascade,
  target_language text not null,
  skill_key text not null,
  category text not null check (category in ('grammar','vocabulary','naturalness','pronunciation','fluency','other')),
  label text not null,
  evidence_count integer not null default 1 check (evidence_count > 0),
  confidence real not null default 0.5 check (confidence between 0 and 1),
  successful_uses integer not null default 0,
  mastered_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (user_id,target_language,skill_key)
);
alter table public.learning_skill_signals enable row level security;
revoke all on table public.learning_skill_signals from anon,authenticated;
grant select on table public.learning_skill_signals to authenticated;
grant all on table public.learning_skill_signals to service_role;
create policy "users can read their learning signals" on public.learning_skill_signals for select to authenticated using(user_id=auth.uid());
create or replace function public.record_learning_skill_signal(p_user_id uuid,p_target_language text,p_skill_key text,p_category text,p_label text,p_evidence_count integer,p_confidence real)
returns void language sql security definer set search_path=public as $$
  insert into public.learning_skill_signals(user_id,target_language,skill_key,category,label,evidence_count,confidence)
  values(p_user_id,left(p_target_language,20),left(p_skill_key,80),p_category,left(p_label,120),greatest(1,least(p_evidence_count,20)),greatest(0,least(p_confidence,1)))
  on conflict(user_id,target_language,skill_key) do update set category=excluded.category,label=excluded.label,evidence_count=learning_skill_signals.evidence_count+excluded.evidence_count,confidence=greatest(learning_skill_signals.confidence,excluded.confidence),last_seen_at=now();
$$;
revoke all on function public.record_learning_skill_signal(uuid,text,text,text,text,integer,real) from public,anon,authenticated;
grant execute on function public.record_learning_skill_signal(uuid,text,text,text,text,integer,real) to service_role;

create or replace function public.record_learning_skill_success(p_user_id uuid,p_target_language text,p_skill_key text,p_successes integer)
returns void language sql security definer set search_path=public as $$
 update public.learning_skill_signals set successful_uses=successful_uses+greatest(1,least(p_successes,3)),mastered_at=case when successful_uses+greatest(1,least(p_successes,3))>=3 then now() else mastered_at end,last_seen_at=now()
 where user_id=p_user_id and target_language=p_target_language and skill_key=p_skill_key and mastered_at is null;
$$;
revoke all on function public.record_learning_skill_success(uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.record_learning_skill_success(uuid,text,text,integer) to service_role;

alter table public.profiles add column if not exists focused_practice_enabled boolean not null default false;
grant update (focused_practice_enabled) on public.profiles to authenticated;
