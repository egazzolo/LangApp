alter table public.learning_skill_signals add column if not exists successful_uses integer not null default 0;
alter table public.learning_skill_signals add column if not exists mastered_at timestamptz;

create or replace function public.record_learning_skill_success(p_user_id uuid,p_target_language text,p_skill_key text,p_successes integer)
returns void language sql security definer set search_path=public as $$
 update public.learning_skill_signals set successful_uses=successful_uses+greatest(1,least(p_successes,3)),mastered_at=case when successful_uses+greatest(1,least(p_successes,3))>=3 then now() else mastered_at end,last_seen_at=now()
 where user_id=p_user_id and target_language=p_target_language and skill_key=p_skill_key and mastered_at is null;
$$;
revoke all on function public.record_learning_skill_success(uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.record_learning_skill_success(uuid,text,text,integer) to service_role;

alter table public.profiles add column if not exists focused_practice_enabled boolean not null default false;
grant update (focused_practice_enabled) on public.profiles to authenticated;
