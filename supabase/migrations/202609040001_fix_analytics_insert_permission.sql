-- Mobile clients may append sanitized analytics for their own authenticated user.
-- They cannot read, update, or delete analytics rows.
revoke all on table public.analytics_events from anon;
revoke all on table public.analytics_events from authenticated;

grant insert (
  user_id,
  anonymous_id,
  event_name,
  session_id,
  properties,
  occurred_at
) on table public.analytics_events to authenticated;

drop policy if exists "own analytics insert" on public.analytics_events;
create policy "own analytics insert"
on public.analytics_events
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and anonymous_id is null
);
