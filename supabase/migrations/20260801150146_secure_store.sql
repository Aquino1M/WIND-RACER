create or replace function public.wind_purchase(p_kind text,p_boat_id text,p_item_id text) returns public.player_profiles
language plpgsql security definer set search_path='' as $$
declare p public.player_profiles; price integer; current_level integer; expected_boat text;
declare boats jsonb:='{"vento":0,"coral":45,"tempestade":90,"espectro":160,"caravela":240,"viking":220,"baleeira":185,"bigdog":360,"solar":310}';
declare skins jsonb:='{"vento_hidro":[120,"vento"],"vento_arraia":[135,"vento"],"vento_sucuri":[150,"vento"],"coral_recife":[140,"coral"],"coral_perola":[155,"coral"],"coral_tubarao":[165,"coral"],"temp_raio":[170,"tempestade"],"temp_furacao":[175,"tempestade"],"temp_leviata":[190,"tempestade"],"esp_abissal":[180,"espectro"],"esp_plasma":[195,"espectro"],"esp_eclipse":[205,"espectro"],"car_ordem":[190,"caravela"],"car_corsaria":[205,"caravela"],"car_celeste":[215,"caravela"],"viking_imperial":[220,"viking"],"viking_noturna":[235,"viking"],"viking_midgard":[245,"viking"],"baleeira_predador":[190,"baleeira"],"baleeira_rainha":[200,"baleeira"],"baleeira_vitoria":[210,"baleeira"],"bigdog_ferro":[260,"bigdog"],"bigdog_caodomar":[250,"bigdog"],"bigdog_tormenta":[280,"bigdog"],"solar_ra":[215,"solar"],"solar_anubis":[230,"solar"],"solar_nilo":[220,"solar"]}';
begin
  if (select auth.uid()) is null then raise exception 'authentication required'; end if;
  insert into public.player_profiles(user_id) values ((select auth.uid())) on conflict do nothing;
  select * into p from public.player_profiles where user_id=(select auth.uid()) for update;
  if p_kind='boat' then
    price:=(boats->>p_item_id)::integer;
    if price is null or p_item_id=any(p.owned_boats) then raise exception 'invalid purchase'; end if;
    if p.coins<price then raise exception 'insufficient coins'; end if;
    update public.player_profiles set coins=coins-price,owned_boats=array_append(owned_boats,p_item_id),owned_skins=jsonb_set(owned_skins,array[p_item_id],'["classica"]',true),updated_at=now() where user_id=(select auth.uid()) returning * into p;
  elsif p_kind='skin' then
    price:=(skins->p_item_id->>0)::integer; expected_boat:=skins->p_item_id->>1;
    if price is null or expected_boat<>p_boat_id or not(p_boat_id=any(p.owned_boats)) or coalesce(p.owned_skins->p_boat_id,'[]')?p_item_id then raise exception 'invalid purchase'; end if;
    if p.coins<price then raise exception 'insufficient coins'; end if;
    update public.player_profiles set coins=coins-price,owned_skins=jsonb_set(owned_skins,array[p_boat_id],coalesce(owned_skins->p_boat_id,'["classica"]')||to_jsonb(p_item_id),true),updated_at=now() where user_id=(select auth.uid()) returning * into p;
  elsif p_kind='upgrade' then
    if not(p_boat_id=any(p.owned_boats)) or p_item_id not in ('speed','accel','draft','turn','hull','capacity','regen','magnet','coins') then raise exception 'invalid purchase'; end if;
    current_level:=coalesce((p.upgrades#>>array[p_boat_id,p_item_id])::integer,0);
    if current_level>=5 then raise exception 'maximum level'; end if;
    price:=case p_item_id when 'speed' then (array[35,70,105,150,210])[current_level+1] when 'accel' then (array[40,80,125,180,250])[current_level+1]
      when 'draft' then (array[50,100,155,220,300])[current_level+1] when 'turn' then (array[45,90,140,200,275])[current_level+1]
      when 'hull' then (array[55,110,170,240,330])[current_level+1] when 'capacity' then (array[80,160,250,360,500])[current_level+1]
      when 'regen' then (array[45,90,135,190,260])[current_level+1] when 'magnet' then (array[50,100,160,230,320])[current_level+1]
      when 'coins' then (array[60,120,180,250,340])[current_level+1] end;
    if p.coins<price then raise exception 'insufficient coins'; end if;
    update public.player_profiles set coins=coins-price,upgrades=jsonb_set(upgrades,array[p_boat_id],coalesce(upgrades->p_boat_id,'{}')||jsonb_build_object(p_item_id,current_level+1),true),updated_at=now() where user_id=(select auth.uid()) returning * into p;
  else raise exception 'invalid purchase kind'; end if;
  return p;
end $$;

create or replace function public.wind_set_loadout(p_boat_id text,p_skin_id text,p_nickname text,p_preferences jsonb) returns public.player_profiles
language plpgsql security definer set search_path='' as $$
declare p public.player_profiles; clean_name text;
begin
  if (select auth.uid()) is null then raise exception 'authentication required'; end if;
  select * into p from public.player_profiles where user_id=(select auth.uid()) for update;
  if p.user_id is null then select public.wind_get_profile() into p; end if;
  if not(p_boat_id=any(p.owned_boats)) then raise exception 'boat not owned'; end if;
  if p_skin_id<>'classica' and not(coalesce(p.owned_skins->p_boat_id,'[]')?p_skin_id) then raise exception 'skin not owned'; end if;
  clean_name:=left(regexp_replace(coalesce(p_nickname,'MARUJO'),'[^[:alnum:] _-]','','g'),16);
  if length(trim(clean_name))=0 then clean_name:='MARUJO'; end if;
  update public.player_profiles set nickname=clean_name,selected_boat=p_boat_id,selected_skins=jsonb_set(selected_skins,array[p_boat_id],to_jsonb(p_skin_id),true),
    preferences=jsonb_build_object('quality',case when p_preferences->>'quality' in ('auto','low','medium','high') then p_preferences->>'quality' else 'auto' end,
      'sound',coalesce((p_preferences->>'sound')::boolean,true),'laps',greatest(1,least(10,coalesce((p_preferences->>'laps')::integer,3))),
      'difficulty',case when p_preferences->>'difficulty' in ('easy','medium','hard') then p_preferences->>'difficulty' else 'medium' end),updated_at=now()
    where user_id=(select auth.uid()) returning * into p;
  return p;
end $$;

revoke all on function public.wind_purchase(text,text,text),public.wind_set_loadout(text,text,text,jsonb) from public,anon;
grant execute on function public.wind_purchase(text,text,text),public.wind_set_loadout(text,text,text,jsonb) to authenticated;
