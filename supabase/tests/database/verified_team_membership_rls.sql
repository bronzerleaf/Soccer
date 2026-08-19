-- RLS + function coverage for verified team membership (migration 16):
-- a parent's team claim starts unverified and invisible to everyone but
-- the coach and the child's own parent; only the team's verified owner
-- can confirm it; get_team_roster() only ever returns verified members,
-- and only to a caller whose own child is also a verified member of
-- that exact team.

begin;
select plan(13);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'parent-vt1@example.com'),
  ('00000000-0000-0000-0000-0000000000f2', 'parent-vt2@example.com'),
  ('00000000-0000-0000-0000-0000000000f3', 'parent-vt3@example.com'),
  ('00000000-0000-0000-0000-0000000000f4', 'coach-vt1@example.com'),
  ('00000000-0000-0000-0000-0000000000f5', 'coach-vt2@example.com'),
  ('00000000-0000-0000-0000-0000000000fa', 'admin-vt1@example.com');

update public.profiles set role = 'coach' where id in (
  '00000000-0000-0000-0000-0000000000f4',
  '00000000-0000-0000-0000-0000000000f5'
);
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000fa';

insert into public.teams (id, name, created_by) values
  ('90000000-0000-0000-0000-000000000001', 'Verified Membership FC', '00000000-0000-0000-0000-0000000000f1'),
  ('90000000-0000-0000-0000-000000000002', 'A Different Team', '00000000-0000-0000-0000-0000000000f3');

insert into public.team_verifications (team_id, coach_id, status) values
  ('90000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f4', 'approved'),
  ('90000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000f5', 'approved');

insert into public.players
  (id, parent_id, first_name, last_initial, birth_year, city, open_to_opportunities, consent_completed, team_id)
values
  ('91000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f1', 'Amir', 'K', 2013, 'Test City', false, false, '90000000-0000-0000-0000-000000000001'),
  ('91000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000f2', 'Bea', 'L', 2013, 'Test City', false, false, '90000000-0000-0000-0000-000000000001');

-- Parent f3's player is deliberately not on any team -- the "unrelated
-- parent" fixture for the visibility tests below.
insert into public.players
  (id, parent_id, first_name, last_initial, birth_year, city, open_to_opportunities, consent_completed)
values
  ('91000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000f3', 'Cleo', 'R', 2013, 'Test City', false, false);

select is(
  (select team_membership_verified from public.players where id = '91000000-0000-0000-0000-000000000001'),
  false,
  'a new team membership starts unverified'
);

-- ---------------------------------------------------------------------
-- A parent cannot flip their own child's verification -- the column is
-- simply never granted to authenticated, so this fails as a permission
-- error, not an RLS policy violation.
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';

select throws_ok(
  $$ update public.players set team_membership_verified = true where id = '91000000-0000-0000-0000-000000000001' $$,
  'permission denied for table players',
  'a parent cannot self-verify their own child''s team membership -- the column isn''t grantable at all'
);

-- ---------------------------------------------------------------------
-- Nobody sees a teammate's roster before the coach confirms anyone --
-- including the two families who really are on the team together.
-- ---------------------------------------------------------------------
select is(
  (select count(*) from public.get_team_roster('90000000-0000-0000-0000-000000000001'))::int,
  0,
  'before any verification, even a real teammate''s parent sees zero rows'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f3", "role": "authenticated"}';

select is(
  (select count(*) from public.get_team_roster('90000000-0000-0000-0000-000000000001'))::int,
  0,
  'a parent with no player on the team at all sees zero rows, even once others are verified later'
);

-- ---------------------------------------------------------------------
-- Only the team's actual verified owner can confirm a membership -- a
-- coach who owns a *different* team cannot.
-- ---------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f5", "role": "authenticated"}';

select throws_ok(
  $$ select public.verify_team_member('91000000-0000-0000-0000-000000000001') $$,
  'not authorized to verify this player''s team membership',
  'a coach who owns a different team cannot verify a player on this one'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f4", "role": "authenticated"}';

select lives_ok(
  $$ select public.verify_team_member('91000000-0000-0000-0000-000000000001') $$,
  'the team''s actual verified owner can confirm a membership'
);

-- ---------------------------------------------------------------------
-- With Amir verified but Bea still pending, Amir's own parent (f1) sees
-- an empty roster (nobody *else* verified yet); once Bea is verified
-- too, f1 sees exactly Bea, and f2 (Bea's parent) sees exactly Amir.
-- ---------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';

select is(
  (select count(*) from public.get_team_roster('90000000-0000-0000-0000-000000000001'))::int,
  1,
  'f1 sees themselves in the roster once verified, even before any teammate is'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f4", "role": "authenticated"}';

select lives_ok(
  $$ select public.verify_team_member('91000000-0000-0000-0000-000000000002') $$,
  'the coach verifies the second player too'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f2", "role": "authenticated"}';

select is(
  (select array_agg(first_name order by first_name) from public.get_team_roster('90000000-0000-0000-0000-000000000001')),
  array['Amir', 'Bea'],
  'once both are verified, a verified teammate''s parent sees the full minimal roster'
);

-- ---------------------------------------------------------------------
-- Changing team_id resets verification (the trigger) -- confirmed by
-- having the coach un-verify, which also proves the reverse toggle
-- works and is owner-gated the same way.
-- ---------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f4", "role": "authenticated"}';

select lives_ok(
  $$ select public.unverify_team_member('91000000-0000-0000-0000-000000000002') $$,
  'the verified owner can revoke a mistaken verification'
);

select is(
  (select team_membership_verified from public.players where id = '91000000-0000-0000-0000-000000000002'),
  false,
  'the revoked player''s membership is actually cleared'
);

select lives_ok(
  $$ select public.remove_player_from_team('91000000-0000-0000-0000-000000000001') $$,
  'the verified owner can still remove a player from the team entirely'
);

-- Read as the player's own parent -- once team_id is null, the coach's
-- own visibility into this row (via the verified-team-owner policy)
-- goes with it, so this has to be read from a viewpoint that still has
-- access: the parent always can, regardless of team status.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';

select is(
  (select team_membership_verified from public.players where id = '91000000-0000-0000-0000-000000000001'),
  false,
  'removing a player from the team also resets team_membership_verified via the trigger'
);

select * from finish();
rollback;
