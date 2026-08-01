-- Backend autoritativo do Wind Racer. Aplique em um projeto Supabase novo.
create extension if not exists pgcrypto;

create table public.game_rooms (
  code text primary key check (code ~ '^[A-Z0-9]{5}$'),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  host_name text not null check (char_length(host_name) between 1 and 16),
  is_public boolean not null default true,
  max_players integer not null default 8 check (max_players between 2 and 12),
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create table public.room_members (
  room_code text not null references public.game_rooms(code) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 16),
  is_host boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (room_code,user_id)
);
create table public.player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default 'MARUJO' check (char_length(nickname) between 1 and 16),
  coins integer not null default 0 check (coins >= 0),
  owned_boats text[] not null default array['vento'],
  selected_boat text not null default 'vento',
  owned_skins jsonb not null default '{"vento":["classica"]}',
  selected_skins jsonb not null default '{"vento":"classica"}',
  upgrades jsonb not null default '{}',
  preferences jsonb not null default '{"quality":"medium","sound":true,"laps":3,"difficulty":"medium"}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.race_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_code text,
  mode text not null check (mode in ('solo','multi','ghost','championship')),
  laps integer not null check (laps between 1 and 10),
  track_version integer not null default 1,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  checkpoint_count integer not null default 0,
  collected_coins integer not null default 0,
  position integer,
  reward integer not null default 0,
  unique (id,user_id)
);
create table public.player_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  races integer not null default 0,
  wins integer not null default 0,
  podiums integer not null default 0,
  best_time_ms integer,
  coins_collected bigint not null default 0,
  current_streak integer not null default 0,
  updated_at timestamptz not null default now()
);

create index game_rooms_host_user_id_idx on public.game_rooms(host_user_id);
create index room_members_user_id_idx on public.room_members(user_id);
create index race_sessions_user_id_idx on public.race_sessions(user_id);

alter table public.game_rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.player_profiles enable row level security;
alter table public.race_sessions enable row level security;
alter table public.player_stats enable row level security;

create policy "read joined rooms" on public.game_rooms for select to authenticated
using (exists(select 1 from public.room_members m where m.room_code=code and m.user_id=(select auth.uid())));
create policy "read own memberships" on public.room_members for select to authenticated
using ((select auth.uid())=user_id);
create policy "read own profile" on public.player_profiles for select to authenticated
using ((select auth.uid())=user_id);
create policy "read own races" on public.race_sessions for select to authenticated
using ((select auth.uid())=user_id);
create policy "read own stats" on public.player_stats for select to authenticated
using ((select auth.uid())=user_id);

create policy "wind racer private receive" on realtime.messages for select to authenticated
using (exists(select 1 from public.room_members m where m.user_id=(select auth.uid()) and 'wind-racer-'||m.room_code=realtime.topic()));
create policy "wind racer private send" on realtime.messages for insert to authenticated
with check (exists(select 1 from public.room_members m where m.user_id=(select auth.uid()) and 'wind-racer-'||m.room_code=realtime.topic() and m.last_seen>now()-interval '5 minutes'));

create or replace function public.wind_get_profile() returns public.player_profiles
language plpgsql security definer set search_path='' as $$
declare result public.player_profiles;
begin
  if (select auth.uid()) is null then raise exception 'authentication required'; end if;
  insert into public.player_profiles(user_id) values ((select auth.uid())) on conflict do nothing;
  insert into public.player_stats(user_id) values ((select auth.uid())) on conflict do nothing;
  select * into result from public.player_profiles where user_id=(select auth.uid());
  return result;
end $$;

create or replace function public.wind_begin_race(p_mode text,p_laps integer,p_room_code text default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare new_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'authentication required'; end if;
  if p_mode not in ('solo','multi','ghost','championship') or p_laps not between 1 and 10 then raise exception 'invalid race configuration'; end if;
  if p_mode='multi' and not exists(select 1 from public.room_members where room_code=p_room_code and user_id=(select auth.uid())) then raise exception 'not a room member'; end if;
  insert into public.race_sessions(user_id,room_code,mode,laps) values ((select auth.uid()),p_room_code,p_mode,p_laps) returning id into new_id;
  return new_id;
end $$;

create or replace function public.wind_finish_race(p_race_id uuid,p_position integer,p_checkpoints integer,p_collected integer,p_duration_ms integer)
returns table(coins integer,reward integer) language plpgsql security definer set search_path='' as $$
declare race public.race_sessions; position_bonus integer; total_reward integer;
begin
  if (select auth.uid()) is null then raise exception 'authentication required'; end if;
  select * into race from public.race_sessions where id=p_race_id and user_id=(select auth.uid()) for update;
  if race.id is null or race.finished_at is not null then raise exception 'invalid or completed race'; end if;
  if p_position not between 1 and 10 or p_checkpoints<>race.laps*10 or p_collected not between 0 and 250
    or p_duration_ms<race.laps*15000 or p_duration_ms>3600000
    or extract(epoch from(now()-race.started_at))*1000<greatest(10000,p_duration_ms*.75) then raise exception 'race validation failed'; end if;
  position_bonus:=(array[100,80,65,50,40,30,22,16,12,8])[p_position];
  total_reward:=least(350,p_collected+position_bonus);
  update public.race_sessions set finished_at=now(),checkpoint_count=p_checkpoints,collected_coins=p_collected,position=p_position,reward=total_reward where id=race.id;
  insert into public.player_profiles(user_id) values ((select auth.uid())) on conflict do nothing;
  update public.player_profiles set coins=player_profiles.coins+total_reward,updated_at=now() where user_id=(select auth.uid());
  insert into public.player_stats(user_id,races,wins,podiums,best_time_ms,coins_collected)
  values ((select auth.uid()),1,(p_position=1)::int,(p_position<=3)::int,p_duration_ms,p_collected)
  on conflict(user_id) do update set races=player_stats.races+1,wins=player_stats.wins+(p_position=1)::int,
    podiums=player_stats.podiums+(p_position<=3)::int,best_time_ms=least(coalesce(player_stats.best_time_ms,p_duration_ms),p_duration_ms),
    coins_collected=player_stats.coins_collected+p_collected,updated_at=now();
  return query select p.coins,total_reward from public.player_profiles p where p.user_id=(select auth.uid());
end $$;

revoke all on public.game_rooms,public.room_members,public.player_profiles,public.race_sessions,public.player_stats from anon;
grant select on public.game_rooms,public.room_members,public.player_profiles,public.race_sessions,public.player_stats to authenticated;
revoke all on function public.wind_get_profile(),public.wind_begin_race(text,integer,text),public.wind_finish_race(uuid,integer,integer,integer,integer) from public,anon;
grant execute on function public.wind_get_profile(),public.wind_begin_race(text,integer,text),public.wind_finish_race(uuid,integer,integer,integer,integer) to authenticated;
