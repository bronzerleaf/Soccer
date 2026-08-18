-- RLS coverage for profiles (no self role-escalation) and
-- coach_verifications (a coach only ever sees their own submission).

begin;
select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'parent-b1@example.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'parent-b2@example.com');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}';

select is(
  (select count(*) from public.profiles)::int,
  1,
  'a user reads only their own profile row'
);

select lives_ok(
  $$ update public.profiles set full_name = 'B One' where id = '00000000-0000-0000-0000-0000000000b1' $$,
  'a user can update their own display fields'
);

select throws_ok(
  $$ update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000b1' $$,
  'permission denied for table profiles',
  'a user cannot grant themselves the admin role'
);

with attempted as (
  update public.profiles set full_name = 'nope'
  where id = '00000000-0000-0000-0000-0000000000b2'
  returning 1
)
select is(
  (select count(*) from attempted)::int,
  0,
  'a user cannot edit someone else''s profile'
);

insert into public.coach_verifications (coach_id, evidence) values
  ('00000000-0000-0000-0000-0000000000b1', 'club admin confirmed by email');

select is(
  (select count(*) from public.coach_verifications)::int,
  1,
  'a coach reads their own verification submission'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated"}';

select is(
  (select count(*) from public.coach_verifications)::int,
  0,
  'a different coach cannot see someone else''s verification submission'
);

select * from finish();
rollback;
