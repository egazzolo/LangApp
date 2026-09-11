-- Explicit administrators only. No self-service enrollment or learner write access.
create table public.activity_administrators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  label text not null,
  granted_at timestamptz not null default now()
);
alter table public.activity_administrators enable row level security;
revoke all on public.activity_administrators from anon,authenticated;
grant select on public.activity_administrators to authenticated;
grant all on public.activity_administrators to service_role;
create function public.is_activity_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.activity_administrators where user_id=auth.uid());
$$;
revoke all on function public.is_activity_admin() from public,anon;
grant execute on function public.is_activity_admin() to authenticated,service_role;
create policy "admins see administrator labels" on public.activity_administrators for select to authenticated using(public.is_activity_admin());

create table public.teaching_activities (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id),
  locked_blueprint jsonb,
  created_at timestamptz not null default now()
);
create table public.activity_sources (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.teaching_activities(id),
  storage_path text not null unique,
  filename text not null,
  mime_type text not null,
  bytes integer not null check(bytes>0 and bytes<=10485760),
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.activity_versions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.teaching_activities(id),
  source_id uuid not null references public.activity_sources(id),
  version integer not null check(version>0),
  revision integer not null default 1,
  status text not null check(status in ('uploaded','converting','converted_draft','needs_review','approved','published','rejected','retired')),
  document jsonb,
  validation jsonb,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  approved_digest text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(activity_id,version)
);
create unique index activity_one_published on public.activity_versions(activity_id) where status='published';
create index activity_filter_idx on public.activity_versions(status,activity_id,version desc);
create table public.activity_answer_keys (
  version_id uuid primary key references public.activity_versions(id),
  answer_key jsonb not null
);
create table public.activity_audit (
  id bigint generated always as identity primary key,
  activity_id uuid not null references public.teaching_activities(id),
  version_id uuid not null references public.activity_versions(id),
  actor_id uuid not null references auth.users(id),
  action text not null,
  from_status text,
  to_status text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
do $$ declare t text; begin
  foreach t in array array['teaching_activities','activity_sources','activity_versions','activity_answer_keys','activity_audit'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('grant all on public.%I to service_role',t);
    execute format('create policy "activity administrators read" on public.%I for select to authenticated using(public.is_activity_admin())',t);
  end loop;
end $$;
grant usage,select on sequence public.activity_audit_id_seq to service_role;

create function public.protect_approved_activity() returns trigger language plpgsql set search_path=public as $$
begin
  if old.approved_at is not null and (
    new.document is distinct from old.document or new.source_id<>old.source_id or new.activity_id<>old.activity_id
    or new.version<>old.version or new.approved_at is distinct from old.approved_at
    or new.approved_by is distinct from old.approved_by or new.approved_digest is distinct from old.approved_digest
    or new.validation is distinct from old.validation or new.status not in ('approved','published','retired')
  ) then raise exception 'APPROVED_VERSION_IMMUTABLE'; end if;
  return new;
end $$;
create trigger protect_approved_activity before update on public.activity_versions for each row execute function public.protect_approved_activity();
create function public.protect_activity_key() returns trigger language plpgsql set search_path=public as $$
begin
  if exists(select 1 from public.activity_versions where id=old.version_id and approved_at is not null) then raise exception 'APPROVED_KEY_IMMUTABLE'; end if;
  if tg_op='DELETE' then return old; end if; return new;
end $$;
create trigger protect_activity_key before update or delete on public.activity_answer_keys for each row execute function public.protect_activity_key();
create function public.protect_activity_blueprint() returns trigger language plpgsql as $$
begin
  if old.locked_blueprint is not null and new.locked_blueprint is distinct from old.locked_blueprint then raise exception 'BLUEPRINT_IMMUTABLE'; end if;
  return new;
end $$;
create trigger protect_activity_blueprint before update on public.teaching_activities for each row execute function public.protect_activity_blueprint();

-- The authenticated Edge Function supplies the verified actor. Browser roles cannot call this.
create function public.activity_admin_write(p_actor uuid,p_action text,p_version uuid default null,p_payload jsonb default '{}')
returns uuid language plpgsql security definer set search_path=public as $$
declare a public.teaching_activities%rowtype; v public.activity_versions%rowtype; result_id uuid;
  old_status text; aid uuid; sid uuid; next_version integer; keys jsonb; doc jsonb; previous public.activity_versions%rowtype;
begin
  if not exists(select 1 from public.activity_administrators where user_id=p_actor) then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
  if p_action='create' then
    if split_part(p_payload->>'storage_path','/',1)<>p_actor::text then raise exception 'INVALID_SOURCE'; end if;
    insert into public.teaching_activities(created_by) values(p_actor) returning id into aid;
    insert into public.activity_sources(activity_id,storage_path,filename,mime_type,bytes,uploaded_by)
      values(aid,p_payload->>'storage_path',left(p_payload->>'filename',200),p_payload->>'mime_type',(p_payload->>'bytes')::integer,p_actor) returning id into sid;
    insert into public.activity_versions(activity_id,source_id,version,status) values(aid,sid,1,'uploaded') returning id into result_id;
    insert into public.activity_audit(activity_id,version_id,actor_id,action,to_status) values(aid,result_id,p_actor,'uploaded','uploaded');
    return result_id;
  end if;
  select activity_id into aid from public.activity_versions where id=p_version;
  select * into a from public.teaching_activities where id=aid for update;
  select * into v from public.activity_versions where id=p_version for update;
  if v.id is null then raise exception 'VERSION_NOT_FOUND'; end if;
  if v.revision<>coalesce((p_payload->>'revision')::integer,-1) then raise exception 'REVISION_CONFLICT'; end if;
  old_status:=v.status; result_id:=v.id;
  if p_action='fork' then
    if v.document is null or v.status='converting' then raise exception 'NO_DRAFT_TO_COPY'; end if;
    select coalesce(max(version),0)+1 into next_version from public.activity_versions where activity_id=aid;
    insert into public.activity_versions(activity_id,source_id,version,status,document)
      values(aid,v.source_id,next_version,'converted_draft',v.document) returning id into result_id;
    insert into public.activity_answer_keys(version_id,answer_key) select result_id,answer_key from public.activity_answer_keys where version_id=v.id;
    v.status:='converted_draft';
  elsif p_action in ('save','finish_convert') then
    if v.approved_at is not null or (p_action='finish_convert' and v.status<>'converting')
      or (p_action='save' and v.status not in ('uploaded','converted_draft','needs_review','rejected')) then raise exception 'INVALID_TRANSITION'; end if;
    doc:=p_payload->'document';
    if jsonb_typeof(doc)<>'object' or jsonb_typeof(doc->'answerKey')<>'array' then raise exception 'INVALID_DOCUMENT'; end if;
    update public.activity_versions set document=doc-'answerKey',validation=p_payload->'validation',status='converted_draft',revision=revision+1,updated_at=now() where id=v.id;
    insert into public.activity_answer_keys values(v.id,doc->'answerKey') on conflict(version_id) do update set answer_key=excluded.answer_key;
    v.status:='converted_draft';
  elsif p_action='begin_convert' then
    if v.approved_at is not null or v.status not in ('uploaded','converted_draft','needs_review','rejected') then raise exception 'INVALID_TRANSITION'; end if;
    v.status:='converting';
    update public.activity_versions set status=v.status,revision=revision+1,updated_at=now() where id=v.id;
  elsif p_action='recover_conversion' then
    if v.status<>'converting' or v.updated_at>now()-interval '5 minutes' then raise exception 'CONVERSION_STILL_RUNNING'; end if;
    v.status:=case when v.document is null then 'uploaded' else 'converted_draft' end;
    update public.activity_versions set status=v.status,revision=revision+1,updated_at=now() where id=v.id;
  elsif p_action='fail_convert' then
    if v.status<>'converting' then raise exception 'INVALID_TRANSITION'; end if;
    v.status:=case when v.document is null then 'uploaded' else 'converted_draft' end;
    update public.activity_versions set status=v.status,revision=revision+1,updated_at=now() where id=v.id;
  elsif p_action='submit' then
    if v.status<>'converted_draft' then raise exception 'INVALID_TRANSITION'; end if;
    v.status:='needs_review';
    update public.activity_versions set status=v.status,revision=revision+1,updated_at=now() where id=v.id;
  elsif p_action='approve' then
    if v.status<>'needs_review' or coalesce((p_payload->>'human_reviewed')::boolean,false) is not true then raise exception 'HUMAN_REVIEW_REQUIRED'; end if;
    select answer_key into keys from public.activity_answer_keys where version_id=v.id;
    if (v.document||jsonb_build_object('answerKey',keys)) is distinct from p_payload->'document' then raise exception 'REVISION_CONFLICT'; end if;
    if jsonb_typeof(p_payload->'validation'->'errors') is distinct from 'array' or jsonb_array_length(p_payload->'validation'->'errors')<>0 then raise exception 'VALIDATION_FAILED'; end if;
    if a.locked_blueprint is not null and a.locked_blueprint is distinct from p_payload->'blueprint' then raise exception 'LOCKED_BLUEPRINT'; end if;
    if p_payload->'blueprint' is null then raise exception 'BLUEPRINT_REQUIRED'; end if;
    update public.teaching_activities set locked_blueprint=coalesce(locked_blueprint,p_payload->'blueprint') where id=aid;
    v.status:='approved';
    update public.activity_versions set status=v.status,approved_at=now(),approved_by=p_actor,
      approved_digest=md5((v.document||jsonb_build_object('answerKey',keys))::text),
      validation=p_payload->'validation',revision=revision+1,updated_at=now() where id=v.id;
  elsif p_action='publish' then
    if v.status<>'approved' or v.approved_at is null then raise exception 'APPROVAL_REQUIRED'; end if;
    for previous in select * from public.activity_versions where activity_id=aid and status='published' loop
      update public.activity_versions set status='retired',revision=revision+1,updated_at=now() where id=previous.id;
      insert into public.activity_audit(activity_id,version_id,actor_id,action,from_status,to_status,note)
        values(aid,previous.id,p_actor,'superseded','published','retired','Replaced by approved version');
    end loop;
    v.status:='published';
    update public.activity_versions set status=v.status,published_at=now(),revision=revision+1,updated_at=now() where id=v.id;
  elsif p_action='reject' then
    if v.status not in ('converted_draft','needs_review') then raise exception 'INVALID_TRANSITION'; end if;
    v.status:='rejected';
    update public.activity_versions set status=v.status,revision=revision+1,updated_at=now() where id=v.id;
  elsif p_action='retire' then
    if v.status not in ('approved','published') then raise exception 'INVALID_TRANSITION'; end if;
    v.status:='retired';
    update public.activity_versions set status=v.status,revision=revision+1,updated_at=now() where id=v.id;
  else raise exception 'INVALID_ACTION';
  end if;
  insert into public.activity_audit(activity_id,version_id,actor_id,action,from_status,to_status,note)
    values(aid,result_id,p_actor,p_action,old_status,v.status,left(coalesce(p_payload->>'note',''),500));
  return result_id;
end $$;
revoke all on function public.activity_admin_write(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.activity_admin_write(uuid,text,uuid,jsonb) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('activity-originals','activity-originals',false,10485760,array[
'application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
create policy "activity originals admin insert" on storage.objects for insert to authenticated
  with check(bucket_id='activity-originals' and public.is_activity_admin() and (storage.foldername(name))[1]=auth.uid()::text);
create policy "activity originals admin read" on storage.objects for select to authenticated
  using(bucket_id='activity-originals' and public.is_activity_admin());
-- No update/delete grants: originals are immutable. Replacement uploads create another source/activity.
