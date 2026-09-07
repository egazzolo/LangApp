-- RLS policies define which rows clients may access, but explicit table grants
-- are still required after creating these tables.
revoke all on table public.ai_reply_deliveries from anon, authenticated;
revoke all on table public.device_push_tokens from anon, authenticated;

grant select, update (delivered_at) on table public.ai_reply_deliveries to authenticated;
grant select, insert, update, delete on table public.device_push_tokens to authenticated;

grant all on table public.ai_reply_deliveries to service_role;
grant all on table public.device_push_tokens to service_role;
