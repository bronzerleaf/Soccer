-- Local Feed milestone 1 (CLAUDE.md section 9): a curated, coordinate-
-- bearing city list, plus opt-in location-preference columns on profiles.
--
-- Radius math needs real coordinates; players.city and clubs.city are free
-- text with none. A new public.cities table (curated + admin-maintained,
-- same spirit as public.clubs) supplies them. Nothing here stores a user's
-- actual device location -- home_city_id only ever points at one of these
-- curated rows, never a raw lat/long captured from the browser.

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  state text not null default 'TX',
  latitude double precision not null,
  longitude double precision not null
);

alter table public.cities enable row level security;

create policy "cities: any authenticated user can read"
  on public.cities for select
  to authenticated
  using (true);

create policy "cities: admins manage"
  on public.cities for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Feed participation is opt-in: both columns default to null, meaning "not
-- in the feed" until a user deliberately sets a city and radius. radius is
-- a fixed set of choices (5/10/25/50 mi) rather than an arbitrary integer
-- -- self-documenting valid values, same reasoning as the preferred_foot
-- enum on players.
alter table public.profiles
  add column home_city_id uuid references public.cities (id),
  add column radius_miles integer check (radius_miles is null or radius_miles in (5, 10, 25, 50));

-- The column-level lock from migration 1 only grants UPDATE on
-- (full_name, email) -- extend it to cover the two new columns, same
-- revoke-then-regrant pattern used for players.consent_completed in
-- migration 2. "profiles: update own row" (migration 1) already covers
-- row-level access for these columns; nothing new needed there.
revoke update on public.profiles from authenticated;
grant update (full_name, email, home_city_id, radius_miles) on public.profiles to authenticated;

-- Seed the curated DFW city list from the same cities already used by
-- supabase/seed.sql's clubs list, so home_city_id has something to point
-- at. Centroid coordinates are public, well-known city-center figures --
-- not derived from any user's location.
insert into public.cities (name, latitude, longitude) values
  ('Dallas', 32.7767, -96.7970),
  ('Frisco', 33.1507, -96.8236),
  ('Plano', 33.0198, -96.6989),
  ('McKinney', 33.1972, -96.6398),
  ('Fort Worth', 32.7555, -97.3308),
  ('Southlake', 32.9412, -97.1342),
  ('Arlington', 32.7357, -97.1081);
