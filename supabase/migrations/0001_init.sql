-- NZ Outdoor · 0001_init
-- 决策: MapLibre+PMTiles / check-in 500m 服务端校验 / 登录才能 check-in / Auckland 试点
create extension if not exists postgis;
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create type place_category as enum (
  'walk','hiking','beach','fishing','campsite','hut','waterfall',
  'lookout','swimming','kayaking','mtb','park','picnic','other'
);

-- 地点主表: 所有事实字段 NULL = Unknown, 绝不猜测
create table public.places (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  category      place_category not null default 'other',
  tags          text[] not null default '{}',
  geom          geography(Point,4326) not null,
  region        text,
  city          text,
  address       text,
  distance_km              numeric,
  estimated_time_minutes   integer,
  difficulty               text check (difficulty in ('easy','moderate','hard')),
  dog_allowed              boolean,
  parking                  boolean,
  accessibility            text,
  camping_allowed          boolean,
  fishing_allowed          boolean,
  swimming_allowed         boolean,
  family_friendly          boolean,
  fee_required             boolean,
  -- 可追溯性
  source_name    text not null,
  source_url     text,
  source_id      text not null,
  last_updated   timestamptz,
  raw            jsonb,
  created_at     timestamptz not null default now(),
  unique (source_name, source_id)
);
create index places_geom_gix   on public.places using gist (geom);
create index places_name_trgm  on public.places using gin (name gin_trgm_ops);
create index places_category_ix on public.places (category);
create index places_region_ix  on public.places (region);

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  display_name text,
  created_at   timestamptz not null default now()
);

create table public.checkins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  place_id   uuid not null references public.places(id) on delete cascade,
  geom       geography(Point,4326) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, place_id)          -- 同人同地只算一次, Passport 不虚高
);

create table public.favourites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  place_id   uuid not null references public.places(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, place_id)
);

create table public.data_imports (
  id           uuid primary key default gen_random_uuid(),
  source_name  text not null,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  fetched      integer default 0,
  inserted     integer default 0,
  updated      integer default 0,
  errors       jsonb
);

-- ---------- RLS ----------
alter table public.places      enable row level security;
alter table public.profiles    enable row level security;
alter table public.checkins    enable row level security;
alter table public.favourites  enable row level security;

-- places: 所有人可读; 写仅限 service_role (ETL), 无客户端写策略
create policy places_read on public.places for select using (true);

create policy profiles_owner on public.profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

create policy checkins_owner on public.checkins for select
  using (auth.uid() = user_id);
-- 插入/更新只允许走 check_in() RPC (security definer)

create policy favourites_owner on public.favourites for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 新用户自动建 profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- RPC: 地图范围取点 ----------
create or replace function public.places_in_bbox(
  min_lng float, min_lat float, max_lng float, max_lat float,
  cat place_category default null, limit_n int default 500
)
returns table (
  id uuid, name text, category place_category, lng double precision, lat double precision,
  difficulty text, region text, city text
) language sql stable as $$
  select p.id, p.name, p.category,
         st_x(p.geom::geometry), st_y(p.geom::geometry),
         p.difficulty, p.region, p.city
  from public.places p
  where p.geom && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography
    and (cat is null or p.category = cat)
  limit limit_n;
$$;

-- ---------- RPC: 附近地点 ----------
create or replace function public.places_near(lat float, lng float, radius_m int default 10000, limit_n int default 100)
returns table (
  id uuid, name text, category place_category, lng double precision, lat double precision,
  distance_m double precision, difficulty text
) language sql stable as $$
  select p.id, p.name, p.category,
         st_x(p.geom::geometry), st_y(p.geom::geometry),
         ST_Distance(p.geom, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography),
         p.difficulty
  from public.places p
  where ST_DWithin(p.geom, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, radius_m)
  order by 6
  limit limit_n;
$$;

-- ---------- RPC: 文本搜索 ----------
create or replace function public.search_places(
  q text default null, cat place_category default null,
  region_f text default null, difficulty_f text default null,
  near_lat float default null, near_lng float default null,
  limit_n int default 50
)
returns table (
  id uuid, name text, category place_category, lng double precision, lat double precision,
  region text, city text, difficulty text, distance_m double precision
) language plpgsql stable as $$
begin
  return query
  select p.id, p.name, p.category,
         st_x(p.geom::geometry), st_y(p.geom::geometry),
         p.region, p.city, p.difficulty,
         case when near_lat is not null
              then ST_Distance(p.geom, ST_SetSRID(ST_MakePoint(near_lng, near_lat),4326)::geography)
         end
  from public.places p
  where (q is null or q = '' or
         p.name ilike '%'||q||'%' or
         coalesce(p.city,'') ilike '%'||q||'%' or
         coalesce(p.region,'') ilike '%'||q||'%' or
         similarity(p.name, q) > 0.25)
    and (cat is null or p.category = cat)
    and (region_f is null or coalesce(p.region,'') ilike '%'||region_f||'%')
    and (difficulty_f is null or p.difficulty = difficulty_f)
    and (near_lat is null or
         ST_DWithin(p.geom, ST_SetSRID(ST_MakePoint(near_lng, near_lat),4326)::geography, 50000))
  order by distance_m nulls last, p.name
  limit limit_n;
end $$;

-- ---------- RPC: Check-in (服务端 500m 校验, 必须登录) ----------
create or replace function public.check_in(p_place_id uuid, p_lat double precision, p_lng double precision)
returns public.checkins language plpgsql security definer set search_path = public as $$
declare
  v_place geography; v_dist double precision; v_row public.checkins;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select geom into v_place from public.places where id = p_place_id;
  if not found then raise exception 'place not found'; end if;
  v_dist := ST_Distance(v_place, ST_SetSRID(ST_MakePoint(p_lng, p_lat),4326)::geography);
  if v_dist > 500 then raise exception 'too far from place: % m (limit 500)', round(v_dist); end if;
  insert into public.checkins (user_id, place_id, geom)
  values (auth.uid(), p_place_id, ST_SetSRID(ST_MakePoint(p_lng,p_lat),4326)::geography)
  on conflict (user_id, place_id) do update
    set geom = excluded.geom, updated_at = now()
  returning * into v_row;
  return v_row;
end $$;
grant execute on function public.check_in(uuid, double precision, double precision) to authenticated;

-- ---------- RPC: My Passport ----------
create or replace function public.my_passport()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_total int; v_by_cat jsonb; v_points jsonb;
begin
  if v_uid is null then return jsonb_build_object('total',0,'by_category','[]','places','[]'); end if;
  select count(*) into v_total from public.checkins where user_id = v_uid;
  select coalesce(jsonb_agg(jsonb_build_object('category', category, 'count', n)), '[]')
    into v_by_cat from (
      select p.category, count(*) n
      from public.checkins c join public.places p on p.id = c.place_id
      where c.user_id = v_uid group by p.category order by n desc) t;
  select coalesce(jsonb_agg(jsonb_build_object(
             'place_id', p.id, 'name', p.name, 'category', p.category,
             'lng', st_x(p.geom::geometry), 'lat', st_y(p.geom::geometry),
             'checked_in_at', c.created_at)), '[]')
    into v_points
  from public.checkins c join public.places p on p.id = c.place_id
  where c.user_id = v_uid;
  return jsonb_build_object('total', v_total, 'by_category', v_by_cat, 'places', v_points);
end $$;
grant execute on function public.my_passport() to authenticated;
