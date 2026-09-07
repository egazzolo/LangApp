create table if not exists public.ferson_voice_reply_reservations (
  delivery_id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists ferson_voice_reply_reservations_user_time_idx
  on public.ferson_voice_reply_reservations(user_id, created_at desc);
alter table public.ferson_voice_reply_reservations enable row level security;
revoke all on table public.ferson_voice_reply_reservations from anon, authenticated;
grant all on table public.ferson_voice_reply_reservations to service_role;

create or replace function public.reserve_ferson_voice_reply(p_user_id uuid, p_delivery_id uuid, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  anchor_at timestamptz;
  months_since integer;
  period_start timestamptz;
  used_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  if exists (select 1 from public.ferson_voice_reply_reservations where delivery_id = p_delivery_id) then return true; end if;
  select created_at into anchor_at from public.profiles where id = p_user_id;
  if anchor_at is null then return false; end if;
  months_since := greatest(0, (extract(year from age(now(), anchor_at))::integer * 12) + extract(month from age(now(), anchor_at))::integer);
  period_start := anchor_at + make_interval(months => months_since);
  if period_start > now() then period_start := anchor_at + make_interval(months => greatest(0, months_since - 1)); end if;
  select count(*) into used_count from public.ferson_voice_reply_reservations where user_id = p_user_id and created_at >= period_start;
  if used_count >= greatest(0, p_limit) then return false; end if;
  insert into public.ferson_voice_reply_reservations(delivery_id, user_id) values (p_delivery_id, p_user_id);
  return true;
end;
$$;
revoke all on function public.reserve_ferson_voice_reply(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.reserve_ferson_voice_reply(uuid, uuid, integer) to service_role;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('ferson-voice-replies', 'ferson-voice-replies', false, 10485760, array['audio/mpeg'])
on conflict(id) do update set public=false, file_size_limit=10485760, allowed_mime_types=array['audio/mpeg'];

drop policy if exists "ferson voice reply owner read" on storage.objects;
create policy "ferson voice reply owner read" on storage.objects for select to authenticated
using (bucket_id='ferson-voice-replies' and (storage.foldername(name))[1]=auth.uid()::text);
