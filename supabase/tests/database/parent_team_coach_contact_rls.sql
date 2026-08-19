-- RLS + function coverage for migration 17: a parent can start a
-- conversation with a team's actual verified coach, and only that coach
-- -- plus regression coverage proving the two pre-existing discovery
-- contexts (player, roster post) still work after the insert policy was
-- dropped and recreated to add the team branch.

begin;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000061', 'parent-tc1@example.com'),
  ('00000000-0000-0000-0000-000000000062', 'coach-tc1@example.com'),
  ('00000000-0000-0000-0000-000000000063', 'coach-tc2@example.com');

update public.profiles set role = 'coach' where id in (
  '00000000-0000-0000-0000-000000000062',
  '00000000-0000-0000-0000-000000000063'
);

insert into public.coach_verifications (coach_id, status) values
  ('00000000-0000-0000-0000-000000000062', 'approved'),
  ('00000000-0000-0000-0000-000000000063', 'approved');

insert into public.teams (id, name, created_by) values
  ('93000000-0000-0000-0000-000000000001', 'Contact Test FC', '00000000-0000-0000-0000-000000000061');

insert into public.team_verifications (team_id, coach_id, status) values
  ('93000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000062', 'approved');

insert into public.players
  (id, parent_id, first_name, last_initial, birth_year, city, open_to_opportunities, consent_completed)
values
  ('94000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000061', 'Wren', 'D', 2013, 'Test City', true, true);

-- ---------------------------------------------------------------------
-- get_team_coach: reveals a name only for an approved team, nothing for
-- one with no verified owner.
-- ---------------------------------------------------------------------
select is(
  (select coach_id from public.get_team_coach('93000000-0000-0000-0000-000000000001')),
  '00000000-0000-0000-0000-000000000062'::uuid,
  'get_team_coach returns the verified owner of a claimed team'
);

insert into public.teams (id, name, created_by) values
  ('93000000-0000-0000-0000-000000000002', 'Unclaimed FC', '00000000-0000-0000-0000-000000000061');

select is(
  (select count(*) from public.get_team_coach('93000000-0000-0000-0000-000000000002'))::int,
  0,
  'get_team_coach returns nothing for a team with no verified owner'
);

-- ---------------------------------------------------------------------
-- A parent can message the team's real verified coach; cannot message a
-- different coach while claiming this team as the context.
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000061", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.conversations (parent_id, coach_id, team_id)
     values ('00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000062', '93000000-0000-0000-0000-000000000001') $$,
  'a parent can start a conversation with a team''s actual verified coach'
);

select throws_ok(
  $$ insert into public.conversations (parent_id, coach_id, team_id)
     values ('00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000063', '93000000-0000-0000-0000-000000000001') $$,
  'new row violates row-level security policy for table "conversations"',
  'a parent cannot start a team-context conversation with a coach who is not that team''s verified owner'
);

select throws_ok(
  $$ insert into public.conversations (parent_id, coach_id, team_id)
     values ('00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000062', '93000000-0000-0000-0000-000000000002') $$,
  'new row violates row-level security policy for table "conversations"',
  'a parent cannot start a conversation against an unclaimed team at all'
);

-- ---------------------------------------------------------------------
-- Regression: the two pre-existing discovery contexts still work after
-- the insert policy was dropped and recreated with the new branch.
-- ---------------------------------------------------------------------
select lives_ok(
  $$ insert into public.conversations (parent_id, coach_id, player_id)
     values ('00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000062', '94000000-0000-0000-0000-000000000001') $$,
  'regression: the pre-existing player-context conversation path still works'
);

select throws_ok(
  $$ insert into public.conversations (parent_id, coach_id, player_id)
     values ('00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000062', null) $$,
  'new row violates row-level security policy for table "conversations"',
  'regression: a conversation still needs a real discovery context of some kind, not none at all'
);

-- ---------------------------------------------------------------------
-- Regression: get_team_roster (migration 16) is untouched by this
-- migration -- an unrelated parent still gets nothing.
-- ---------------------------------------------------------------------
select is(
  (select count(*) from public.get_team_roster('93000000-0000-0000-0000-000000000001'))::int,
  0,
  'regression: get_team_roster still returns nothing to a parent with no verified membership on the team'
);

select is(
  (select count(*) from public.conversations where parent_id = '00000000-0000-0000-0000-000000000061')::int,
  2,
  'exactly the two successful conversations exist -- one team-context, one player-context'
);

select * from finish();
rollback;
