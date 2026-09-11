alter table public.profiles drop constraint if exists profiles_target_language_check;
alter table public.profiles
  add constraint profiles_target_language_check
  check (target_language in ('en', 'es'));

comment on column public.profiles.target_language is
  'Language practised with Fersons. Supported values: en, es.';
