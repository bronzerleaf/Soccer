-- Proves the roster_posts trust boundary: verification proves
-- affiliation with one specific club, not a blanket "trusted coach"
-- badge good for posting (or moving a post) anywhere, and that
-- browsing only ever surfaces active posts to someone who isn't the
-- post's own coach or an admin.

begin;
select plan(9);

insert into public.clubs (id, name, city) values
  ('60000000-0000-0000-0000-000000000001', 'Test Club A', 'Dallas'),
  ('60000000-0000-0000-0000-000000000002', 'Test Club B', 'Plano');

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c6', 'coach-i1@example.com'),
  ('00000000-0000-0000-0000-0000000000c7', 'coach-i2@example.com'),
  ('00000000-0000-0000-0000-0000000000f4', 'parent-i1@example.com');

update public.profiles set role = 'coach' where id in (
  '00000000-0000-0000-0000-0000000000c6',
  '00000000-0000-0000-0000-0000000000c7'
);

insert into public.coach_verifications (coach_id, claimed_club_id, status) values
  ('00000000-0000-0000-0000-0000000000c6', '60000000-0000-0000-0000-000000000001', 'approved'),
  ('00000000-0000-0000-0000-0000000000c7', '60000000-0000-0000-0000-000000000002', 'approved');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c6", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.roster_posts
       (coach_id, club_id, birth_year, description, expires_at)
     values ('00000000-0000-0000-0000-0000000000c6', '60000000-0000-0000-0000-000000000002',
             2014, 'Need a keeper', now() + interval '30 days') $$,
  'new row violates row-level security policy for table "roster_posts"',
  'a coach cannot post for a club other than the one they''re verified with'
);

select lives_ok(
  $$ insert into public.roster_posts
       (id, coach_id, club_id, birth_year, description, expires_at)
     values ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c6',
             '60000000-0000-0000-0000-000000000001', 2014, 'Need a keeper', now() + interval '30 days') $$,
  'a verified coach can post for their own club'
);

-- The bypass this policy exists to close: legitimately create a post,
-- then try to reassign it to a club never verified for.
select throws_ok(
  $$ update public.roster_posts set club_id = '60000000-0000-0000-0000-000000000002'
     where id = '70000000-0000-0000-0000-000000000001' $$,
  'new row violates row-level security policy for table "roster_posts"',
  'a coach cannot move their own post to an unaffiliated club'
);

select lives_ok(
  $$ update public.roster_posts set description = 'Need a keeper, U12'
     where id = '70000000-0000-0000-0000-000000000001' $$,
  'a coach can still make an ordinary edit to their own post'
);

-- A different coach has no UPDATE policy matching someone else's post —
-- silently zero rows affected, same as every other "not your row" case
-- in this schema.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c7", "role": "authenticated"}';

with attempted as (
  update public.roster_posts set description = 'hijacked'
  where id = '70000000-0000-0000-0000-000000000001'
  returning 1
)
select is(
  (select count(*) from attempted)::int,
  0,
  'a different coach cannot edit someone else''s post'
);

select is(
  (select count(*) from public.roster_posts
   where id = '70000000-0000-0000-0000-000000000001')::int,
  1,
  'but can still browse it as an active post'
);

-- An expired post: invisible to anyone browsing, but still visible (and
-- manageable) by its own coach.
reset role;
insert into public.roster_posts
  (id, coach_id, club_id, birth_year, description, created_at, expires_at)
values (
  '70000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000c6',
  '60000000-0000-0000-0000-000000000001', 2013, 'Old post', now() - interval '10 days', now() - interval '1 day'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f4", "role": "authenticated"}';

select is(
  (select count(*) from public.roster_posts
   where id = '70000000-0000-0000-0000-000000000002')::int,
  0,
  'a parent browsing never sees an expired post'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c6", "role": "authenticated"}';

select is(
  (select count(*) from public.roster_posts
   where id = '70000000-0000-0000-0000-000000000002')::int,
  1,
  'the owning coach still sees their own expired post'
);

select lives_ok(
  $$ delete from public.roster_posts where id = '70000000-0000-0000-0000-000000000002' $$,
  'the owning coach can delete their own expired post'
);

select * from finish();
rollback;
