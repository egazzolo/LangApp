alter table public.characters
  add column if not exists gender text;

alter table public.characters
  drop constraint if exists characters_gender_check;

alter table public.characters
  add constraint characters_gender_check
  check (gender is null or gender in ('woman', 'man'));
