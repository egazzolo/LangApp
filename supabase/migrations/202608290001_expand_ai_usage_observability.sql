alter table public.ai_usage
  add column if not exists http_status int,
  add column if not exists retryable boolean not null default false,
  add column if not exists retry_count int not null default 0;

alter table public.ai_usage
  add constraint ai_usage_retry_count_nonnegative check (retry_count >= 0);
