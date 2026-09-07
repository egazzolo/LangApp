create table if not exists public.ai_reply_deliveries (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_client_id text not null,
  character_name text not null,
  status text not null default 'pending' check (status in ('pending','processing','completed','failed')),
  response jsonb,
  error_code text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists ai_reply_deliveries_user_pending_idx on public.ai_reply_deliveries(user_id, created_at) where delivered_at is null;

create table if not exists public.device_push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('android','ios')),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
create index if not exists device_push_tokens_user_idx on public.device_push_tokens(user_id) where enabled;

alter table public.ai_reply_deliveries enable row level security;
alter table public.device_push_tokens enable row level security;
create policy "own reply deliveries read" on public.ai_reply_deliveries for select using (user_id = auth.uid());
create policy "own reply deliveries update" on public.ai_reply_deliveries for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own push tokens" on public.device_push_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());

