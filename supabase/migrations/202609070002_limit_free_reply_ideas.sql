create table if not exists public.reply_assistance_uses (
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id text not null,
  used_at timestamptz not null default now(),
  primary key (user_id, conversation_id)
);

alter table public.reply_assistance_uses enable row level security;
revoke all on table public.reply_assistance_uses from anon, authenticated;
grant select on table public.reply_assistance_uses to authenticated;
grant all on table public.reply_assistance_uses to service_role;

drop policy if exists "users can read their reply idea use" on public.reply_assistance_uses;
create policy "users can read their reply idea use"
on public.reply_assistance_uses for select to authenticated
using (user_id = auth.uid());
