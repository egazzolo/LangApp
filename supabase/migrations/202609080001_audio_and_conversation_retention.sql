-- Retention never deletes academic records. Account deletion remains explicit.
alter table public.language_assessments drop constraint language_assessments_message_id_fkey;
alter table public.language_assessments add constraint language_assessments_message_id_fkey
  foreign key (message_id) references public.messages(id) on delete set null;
alter table public.pronunciation_assessments drop constraint pronunciation_assessments_voice_message_id_fkey;
alter table public.pronunciation_assessments alter column voice_message_id drop not null;
alter table public.pronunciation_assessments add constraint pronunciation_assessments_voice_message_id_fkey
  foreign key (voice_message_id) references public.voice_messages(message_id) on delete set null;

create table public.audio_retention_objects (
  object_id uuid primary key,
  bucket_id text not null,
  name text not null,
  original_created_at timestamptz not null,
  degraded_at timestamptz
);
alter table public.audio_retention_objects enable row level security;
revoke all on public.audio_retention_objects from anon, authenticated;
grant all on public.audio_retention_objects to service_role;

-- Keep an immutable birth time: replacing audio must not restart its lifetime.
create function public.retention_audio_page(p_after uuid default null, p_limit integer default 100)
returns setof public.audio_retention_objects
language plpgsql security definer set search_path = public set timezone = 'UTC' as $$
begin
  insert into public.audio_retention_objects(object_id,bucket_id,name,original_created_at)
    select id,bucket_id,name,created_at from storage.objects
    where bucket_id in ('voice-notes','ferson-voice-replies') and (p_after is null or id > p_after)
    order by id limit least(greatest(p_limit,1),100)
    on conflict(object_id) do nothing;
  return query select r.* from public.audio_retention_objects r join storage.objects o on o.id=r.object_id
    where o.bucket_id in ('voice-notes','ferson-voice-replies') and (p_after is null or o.id > p_after)
    order by o.id limit least(greatest(p_limit,1),100);
end $$;
revoke all on function public.retention_audio_page(uuid,integer) from public,anon,authenticated;
grant execute on function public.retention_audio_page(uuid,integer) to service_role;

create table public.retention_worker_lease (id boolean primary key default true check(id), token uuid, expires_at timestamptz);
insert into public.retention_worker_lease(id) values(true);
alter table public.retention_worker_lease enable row level security;
revoke all on public.retention_worker_lease from anon,authenticated;
create function public.retention_acquire(p_token uuid) returns boolean
language plpgsql security definer set search_path=public as $$
begin
  update public.retention_worker_lease set token=p_token,expires_at=now()+interval '30 minutes'
  where id and (expires_at is null or expires_at < now());
  return found;
end $$;
create function public.retention_release(p_token uuid) returns void
language sql security definer set search_path=public as $$
  update public.retention_worker_lease set expires_at=null,token=null where token=p_token;
$$;
revoke all on function public.retention_acquire(uuid),public.retention_release(uuid) from public,anon,authenticated;
grant execute on function public.retention_acquire(uuid),public.retention_release(uuid) to service_role;

-- Storage API deletions run first. Never remove storage.objects with SQL.
create function public.retention_purge_history(p_limit integer default 500) returns jsonb
language plpgsql security definer set search_path=public set timezone='UTC' as $$
declare cutoff timestamptz := now()-interval '6 months'; n integer; d integer; c integer;
begin
  with expired as (select m.id from public.messages m where m.created_at <= cutoff
    and not exists(select 1 from public.voice_messages v join storage.objects o on o.bucket_id='voice-notes' and o.name=v.storage_path where v.message_id=m.id)
    order by m.created_at,m.id limit least(greatest(p_limit,1),500))
  delete from public.messages where id in (select id from expired);
  get diagnostics n=row_count;
  with expired as (select id from public.ai_reply_deliveries a where created_at<=cutoff
    and not exists(select 1 from storage.objects o where o.bucket_id='ferson-voice-replies' and o.name=a.response->>'audioPath')
    order by created_at,id limit least(greatest(p_limit,1),500))
  delete from public.ai_reply_deliveries where id in (select id from expired);
  get diagnostics d=row_count;
  -- Summaries and memories are conversation content, not academic records.
  delete from public.memories where created_at<=cutoff;
  update public.conversations set summary=null,summary_through=null where summary is not null and (summary_through is null or summary_through<=cutoff);
  delete from public.conversations c where coalesce(c.last_message_at,c.created_at)<=cutoff
    and not exists(select 1 from public.messages m where m.conversation_id=c.id);
  get diagnostics c=row_count;
  delete from public.generated_notifications where scheduled_for<=cutoff;
  delete from public.audio_retention_objects r where not exists(select 1 from storage.objects o where o.id=r.object_id);
  return jsonb_build_object('messages',n,'deliveries',d,'conversations',c);
end $$;
revoke all on function public.retention_purge_history(integer) from public,anon,authenticated;
grant execute on function public.retention_purge_history(integer) to service_role;

-- Reusable server-side entitlement check; clients cannot supply their plan.
create function public.can_export_conversations() returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and (
    (is_premium and (premium_expires_at is null or premium_expires_at>now()))
    or trial_ends_at>now() or grace_period_ends_at>now()));
$$;
revoke all on function public.can_export_conversations() from public,anon;
grant execute on function public.can_export_conversations() to authenticated;

-- Academic history is separate from chat history and has no age-based expiry.
create table public.academic_records (
  user_id uuid not null references public.profiles(id) on delete cascade,
  record_id text not null,
  record jsonb not null,
  created_at timestamptz not null default now(),
  primary key(user_id,record_id)
);
alter table public.academic_records enable row level security;
create policy "own academic records" on public.academic_records for all to authenticated
  using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,update,delete on public.academic_records to authenticated;
grant all on public.academic_records to service_role;

-- Uploaded offline audio keeps its original recording date, never a fresh six months.
create function public.register_user_audio_age(p_path text,p_created_at timestamptz) returns void
language plpgsql security definer set search_path=public as $$
declare obj storage.objects%rowtype;
begin
  if auth.uid() is null or split_part(p_path,'/',1) <> auth.uid()::text or p_created_at is null then
    raise exception 'unauthorized' using errcode='42501';
  end if;
  select * into obj from storage.objects where bucket_id='voice-notes' and name=p_path;
  if obj.id is null then raise exception 'audio_not_found'; end if;
  insert into public.audio_retention_objects(object_id,bucket_id,name,original_created_at)
    values(obj.id,obj.bucket_id,obj.name,least(p_created_at,obj.created_at,now()))
    on conflict(object_id) do update set original_created_at=least(audio_retention_objects.original_created_at,excluded.original_created_at);
end $$;
revoke all on function public.register_user_audio_age(text,timestamptz) from public,anon;
grant execute on function public.register_user_audio_age(text,timestamptz) to authenticated;
