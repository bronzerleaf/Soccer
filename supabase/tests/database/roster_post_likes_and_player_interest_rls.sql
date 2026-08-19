-- RLS coverage for roster_post_likes (parity with feed_post_likes) and
-- player_interest (a verified coach can mark interest in a player they
-- can already see; visible only to that coach and the player's own
-- parent -- never another coach, never another parent).

begin;
select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'parent-pi1@example.com'),
  ('00000000-0000-0000-0000-0000000000d2', 'parent-pi2@example.com'),
  ('00000000-0000-0000-0000-0000000000d3', 'coach-pi1@example.com'),
  ('00000000-0000-0000-0000-0000000000d4', 'coach-pi2@example.com');

update public.profiles set role = 'coach' where id in (
  '00000000-0000-0000-0000-0000000000d3',
  '00000000-0000-0000-0000-0000000000d4'
);

insert into public.coach_verifications (coach_id, status) values
  ('00000000-0000-0000-0000-0000000000d3', 'approved');
-- d4 stays unverified on purpose.

insert into public.clubs (id, name, city) values
  ('87000000-0000-0000-0000-000000000001', 'Test FC', 'Test City');

insert into public.roster_posts (id, coach_id, club_id, birth_year, description, expires_at) values
  ('88000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d3',
   '87000000-0000-0000-0000-000000000001', 2013, 'Need a keeper', now() + interval '30 days');

insert into public.players
  (id, parent_id, first_name, last_initial, birth_year, city, open_to_opportunities, consent_completed)
values
  ('89000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'Ivy', 'M', 2013, 'Test City', true, true),
  ('89000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000d1', 'Jax', 'B', 2012, 'Test City', false, false);

-- ---------------------------------------------------------------------
-- roster_post_likes: parity with feed_post_likes.
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.roster_post_likes (post_id, profile_id)
     values ('88000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1') $$,
  'a user can like an active roster post as themselves'
);

select throws_ok(
  $$ insert into public.roster_post_likes (post_id, profile_id)
     values ('88000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d2') $$,
  'new row violates row-level security policy for table "roster_post_likes"',
  'a user cannot like a roster post on someone else''s behalf'
);

with attempted as (
  delete from public.roster_post_likes
  where post_id = '88000000-0000-0000-0000-000000000001' and profile_id = '00000000-0000-0000-0000-0000000000d1'
  returning 1
)
select is(
  (select count(*) from attempted)::int,
  1,
  'a user can unlike their own roster post like'
);

-- ---------------------------------------------------------------------
-- player_interest: verified coach only, and only on an open + consented
-- player -- the exact same visibility gate search already uses.
-- ---------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d3", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.player_interest (player_id, coach_id)
     values ('89000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d3') $$,
  'a verified coach can mark interest in an open, consented player'
);

select throws_ok(
  $$ insert into public.player_interest (player_id, coach_id)
     values ('89000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000d3') $$,
  'new row violates row-level security policy for table "player_interest"',
  'a verified coach cannot mark interest in a player who is not open/consented -- same gate as search'
);

select throws_ok(
  $$ insert into public.player_interest (player_id, coach_id)
     values ('89000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1') $$,
  'new row violates row-level security policy for table "player_interest"',
  'nobody can mark interest as a coach they are not -- coach_id must be auth.uid()'
);

select is(
  (select count(*) from public.player_interest where coach_id = '00000000-0000-0000-0000-0000000000d3')::int,
  1,
  'the coach reads their own interest row'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d4", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.player_interest (player_id, coach_id)
     values ('89000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d4') $$,
  'new row violates row-level security policy for table "player_interest"',
  'an unverified coach cannot mark interest in any player'
);

select is(
  (select count(*) from public.player_interest)::int,
  0,
  'an unverified coach cannot see another coach''s interest row either'
);

-- ---------------------------------------------------------------------
-- The player's own parent sees who's interested; an unrelated parent
-- sees nothing.
-- ---------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';

select is(
  (select count(*) from public.player_interest where player_id = '89000000-0000-0000-0000-000000000001')::int,
  1,
  'the player''s own parent can see the coach''s interest'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d2", "role": "authenticated"}';

select is(
  (select count(*) from public.player_interest)::int,
  0,
  'an unrelated parent cannot see another family''s player interest at all'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d3", "role": "authenticated"}';

with attempted as (
  delete from public.player_interest
  where player_id = '89000000-0000-0000-0000-000000000001' and coach_id = '00000000-0000-0000-0000-0000000000d3'
  returning 1
)
select is(
  (select count(*) from attempted)::int,
  1,
  'the coach can remove their own marked interest'
);

select * from finish();
rollback;
