-- RLS + constraint coverage for Local Feed milestone 1 (CLAUDE.md section
-- 9): public.cities is a curated, admin-managed, everyone-reads list; a
-- profile can set its own home_city_id/radius_miles and nobody else's;
-- radius_miles only accepts the fixed 5/10/25/50 set.

begin;
select plan(7);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'parent-f1@example.com'),
  ('00000000-0000-0000-0000-0000000000f2', 'parent-f2@example.com'),
  ('00000000-0000-0000-0000-0000000000fa', 'admin-f@example.com');

update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000fa';

insert into public.cities (id, name, latitude, longitude) values
  ('80000000-0000-0000-0000-000000000001', 'Denton', 33.2148, -97.1331);

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';

select is(
  (select count(*) from public.cities)::int,
  8,
  'any signed-in user reads the full curated city list (7 seeded + 1 test row)'
);

select throws_ok(
  $$ insert into public.cities (name, latitude, longitude) values ('Nowhere', 0, 0) $$,
  'new row violates row-level security policy for table "cities"',
  'an ordinary user cannot add a city to the curated list'
);

select lives_ok(
  $$ update public.profiles
     set home_city_id = '80000000-0000-0000-0000-000000000001', radius_miles = 25
     where id = '00000000-0000-0000-0000-0000000000f1' $$,
  'a user can set their own home city and radius'
);

select throws_ok(
  $$ update public.profiles set radius_miles = 7 where id = '00000000-0000-0000-0000-0000000000f1' $$,
  'new row for relation "profiles" violates check constraint "profiles_radius_miles_check"',
  'radius_miles rejects a value outside the fixed 5/10/25/50 set'
);

with attempted as (
  update public.profiles
  set home_city_id = '80000000-0000-0000-0000-000000000001'
  where id = '00000000-0000-0000-0000-0000000000f2'
  returning 1
)
select is(
  (select count(*) from attempted)::int,
  0,
  'a user cannot set another profile''s home city'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000fa", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.cities (name, latitude, longitude) values ('Denison', 33.7557, -96.5372) $$,
  'an admin can add a city to the curated list'
);

select is(
  (select count(*) from public.cities)::int,
  9,
  'the new city is now visible to everyone'
);

select * from finish();
rollback;
