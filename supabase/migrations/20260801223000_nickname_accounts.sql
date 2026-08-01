alter table public.player_profiles
  add column if not exists account_name text;

alter table public.player_profiles
  drop constraint if exists player_profiles_account_name_format;

alter table public.player_profiles
  add constraint player_profiles_account_name_format
  check (account_name is null or account_name ~ '^[a-z0-9_]{3,16}$');

create unique index if not exists player_profiles_account_name_unique
  on public.player_profiles (account_name)
  where account_name is not null;

comment on column public.player_profiles.account_name is
  'Identificador único de login; definido somente pela Edge Function player-account.';
