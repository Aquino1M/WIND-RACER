alter table public.player_profiles
  add column if not exists season_xp integer not null default 0 check (season_xp >= 0),
  add column if not exists season_level integer not null default 1 check (season_level >= 1),
  add column if not exists pending_chests integer not null default 0 check (pending_chests >= 0),
  add column if not exists chests_opened integer not null default 0 check (chests_opened >= 0);

with seeded as (
  select p.user_id, greatest(p.season_xp, coalesce(s.races, 0) * 30) as xp
  from public.player_profiles p
  left join public.player_stats s on s.user_id = p.user_id
)
update public.player_profiles p
set season_xp = seeded.xp,
    season_level = 1 + floor(seeded.xp / 100.0)::integer,
    pending_chests = greatest(p.pending_chests, floor(seeded.xp / 100.0)::integer)
from seeded where seeded.user_id = p.user_id;

create or replace function public.wind_finish_race(
  p_race_id uuid, p_position integer, p_checkpoints integer,
  p_collected integer, p_duration_ms integer
)
returns table(coins integer, reward integer)
language plpgsql security definer set search_path = ''
as $$
declare
  race public.race_sessions;
  position_bonus integer;
  total_reward integer;
  xp_gain integer;
  old_level integer;
  new_xp integer;
  new_level integer;
begin
  if (select auth.uid()) is null then raise exception 'authentication required'; end if;
  select * into race from public.race_sessions
  where id = p_race_id and user_id = (select auth.uid()) for update;
  if race.id is null or race.finished_at is not null then raise exception 'invalid or completed race'; end if;
  if p_position not between 1 and 10
    or p_checkpoints <> race.laps * 10
    or p_collected not between 0 and 250
    or p_duration_ms < race.laps * 15000
    or p_duration_ms > 3600000
    or extract(epoch from (now() - race.started_at))*1000 < greatest(10000,p_duration_ms*0.75)
  then raise exception 'race validation failed'; end if;

  position_bonus := (array[100,80,65,50,40,30,22,16,12,8])[p_position];
  total_reward := least(350,p_collected + position_bonus);
  xp_gain := 20 + greatest(0, 11 - p_position) * 3;
  update public.race_sessions set finished_at=now(),checkpoint_count=p_checkpoints,
    collected_coins=p_collected,position=p_position,reward=total_reward where id=race.id;
  insert into public.player_profiles(user_id) values ((select auth.uid())) on conflict do nothing;
  select season_level, season_xp into old_level, new_xp from public.player_profiles
    where user_id=(select auth.uid()) for update;
  new_xp := new_xp + xp_gain;
  new_level := 1 + floor(new_xp / 100.0)::integer;
  update public.player_profiles set coins=player_profiles.coins+total_reward,
    season_xp=new_xp,season_level=new_level,
    pending_chests=pending_chests+greatest(0,new_level-old_level),updated_at=now()
    where user_id=(select auth.uid());
  insert into public.player_stats(user_id,races,wins,podiums,best_time_ms,coins_collected)
  values ((select auth.uid()),1,(p_position=1)::int,(p_position<=3)::int,p_duration_ms,p_collected)
  on conflict (user_id) do update set
    races=player_stats.races+1,wins=player_stats.wins+(p_position=1)::int,
    podiums=player_stats.podiums+(p_position<=3)::int,
    best_time_ms=least(coalesce(player_stats.best_time_ms,p_duration_ms),p_duration_ms),
    coins_collected=player_stats.coins_collected+p_collected,updated_at=now();
  return query select p.coins,total_reward from public.player_profiles p where p.user_id=(select auth.uid());
end;
$$;

create or replace function public.wind_open_level_chest()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  p public.player_profiles;
  roll double precision;
  reward_type text;
  reward_boat text;
  reward_item text;
  reward_level integer;
  reward_amount integer;
  converted_from text;
  result jsonb;
begin
  if (select auth.uid()) is null then raise exception 'authentication required'; end if;
  select * into p from public.player_profiles where user_id=(select auth.uid()) for update;
  if p.user_id is null or p.pending_chests < 1 then raise exception 'no pending chest'; end if;
  roll := random();
  reward_type := case when roll < .38 then 'coins' when roll < .63 then 'upgrade'
    when roll < .80 then 'skin' when roll < .88 then 'boat' else 'nothing' end;

  if reward_type = 'coins' then
    reward_amount := 30 + floor(random()*61)::integer;
  elsif reward_type = 'boat' then
    select candidate into reward_boat from unnest(array['coral','tempestade','espectro','caravela','viking','baleeira','bigdog','solar']) candidate
      where not (candidate = any(p.owned_boats)) order by random() limit 1;
    if reward_boat is null then converted_from:='boat'; reward_type:='coins'; reward_amount:=60; end if;
  elsif reward_type = 'skin' then
    select s.item_id,s.boat_id into reward_item,reward_boat from (values
      ('vento_hidro','vento'),('vento_arraia','vento'),('vento_sucuri','vento'),
      ('coral_recife','coral'),('coral_perola','coral'),('coral_tubarao','coral'),
      ('temp_raio','tempestade'),('temp_furacao','tempestade'),('temp_leviata','tempestade'),
      ('esp_abissal','espectro'),('esp_plasma','espectro'),('esp_eclipse','espectro'),
      ('car_ordem','caravela'),('car_corsaria','caravela'),('car_celeste','caravela'),
      ('viking_imperial','viking'),('viking_noturna','viking'),('viking_midgard','viking'),
      ('baleeira_predador','baleeira'),('baleeira_rainha','baleeira'),('baleeira_vitoria','baleeira'),
      ('bigdog_ferro','bigdog'),('bigdog_caodomar','bigdog'),('bigdog_tormenta','bigdog'),
      ('solar_ra','solar'),('solar_anubis','solar'),('solar_nilo','solar')
    ) s(item_id,boat_id)
    where s.boat_id=any(p.owned_boats) and not (coalesce(p.owned_skins->s.boat_id,'[]'::jsonb) ? s.item_id)
    order by random() limit 1;
    if reward_item is null then converted_from:='skin'; reward_type:='coins'; reward_amount:=60; end if;
  elsif reward_type = 'upgrade' then
    select candidate.boat_id,candidate.item_id,candidate.current_level+1
      into reward_boat,reward_item,reward_level
    from (
      select boat_id,item_id,coalesce((p.upgrades #>> array[boat_id,item_id])::integer,0) current_level
      from unnest(p.owned_boats) boat_id
      cross join unnest(array['speed','accel','draft','turn','hull','capacity','regen','magnet','coins']) item_id
    ) candidate where candidate.current_level < 5 order by random() limit 1;
    if reward_item is null then converted_from:='upgrade'; reward_type:='coins'; reward_amount:=60; end if;
  end if;

  if reward_type='coins' then
    update public.player_profiles set coins=coins+reward_amount where user_id=p.user_id;
  elsif reward_type='boat' then
    update public.player_profiles set owned_boats=array_append(owned_boats,reward_boat),
      owned_skins=jsonb_set(owned_skins,array[reward_boat],'["classica"]'::jsonb,true)
      where user_id=p.user_id;
  elsif reward_type='skin' then
    update public.player_profiles set owned_skins=jsonb_set(owned_skins,array[reward_boat],
      coalesce(owned_skins->reward_boat,'["classica"]'::jsonb)||to_jsonb(reward_item),true)
      where user_id=p.user_id;
  elsif reward_type='upgrade' then
    update public.player_profiles set upgrades=jsonb_set(upgrades,array[reward_boat],
      coalesce(upgrades->reward_boat,'{}'::jsonb)||jsonb_build_object(reward_item,reward_level),true)
      where user_id=p.user_id;
  end if;
  update public.player_profiles set pending_chests=pending_chests-1,
    chests_opened=chests_opened+1,updated_at=now() where user_id=p.user_id returning * into p;
  result := jsonb_strip_nulls(jsonb_build_object('type',reward_type,'amount',reward_amount,
    'boat_id',reward_boat,'item_id',reward_item,'level',reward_level,'converted_from',converted_from));
  return jsonb_build_object('reward',result,'profile',to_jsonb(p));
end;
$$;

revoke execute on function public.wind_open_level_chest() from public, anon;
grant execute on function public.wind_open_level_chest() to authenticated;
