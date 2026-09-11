alter table public.profiles
  add column if not exists interests text[] not null default '{}';

grant update (interests) on public.profiles to authenticated;

comment on column public.profiles.interests is
  'User-selected conversation topics. Values are non-sensitive category identifiers.';
