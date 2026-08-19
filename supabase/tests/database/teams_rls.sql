-- RLS + function coverage for teams: a parent can create/assign a team;
-- any authenticated user can browse the team list (non-sensitive org
-- metadata, same as clubs); a coach can claim a team the same way they
-- verify a club, with the same self-approval lockdown built in from the
-- start as organization_verifications; and — the actual point of this
-- feature — a verified team owner sees a minimal roster of *only their
-- own* team, never another parent, never an unverified coach, never a
-- different team.

begin;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'parent-t1@example.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'parent-t2@example.com'),
  ('00000000-0000-0000-0000-0000000000b3', 'coach-t1@example.com'),
  ('00000000-0000-0000-0000-0000000000b4', 'coach-t2@example.com'),
  ('00000000-0000-0000-0000-0000000000ba', 'admin-t1@example.com');

update public.profiles set role = 'coach' where id in (
  '00000000-0000-0000-0000-0000000000b3',
  '00000000-0000-0000-0000-0000000000b4'
);
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000ba';

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.teams (id, name, created_by) values ('70000000-0000-0000-0000-000000000001', 'Solar SC 2013 Boys', '00000000-0000-0000-0000-0000000000b1') $$,
  'a parent can create a new team'
);

insert into public.players
  (id, parent_id, first_name, last_initial, birth_year, city, open_to_opportunities, consent_completed)
values
  ('71000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'Amara', 'S', 2013, 'Frisco', false, false);

select lives_ok(
  $$ update public.players set team_id = '70000000-0000-0000-0000-000000000001' where id = '71000000-0000-0000-0000-000000000001' $$,
  'a parent can put their own player on a team'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated"}';

select is(
  (select count(*) from public.teams)::int,
  1,
  'any authenticated user browses the team list (non-sensitive metadata)'
);

select is(
  (select count(*) from public.players where team_id = '70000000-0000-0000-0000-000000000001')::int,
  0,
  'an unrelated parent cannot see who is on a team through the team_id link'
);

-- ---------------------------------------------------------------------
-- Coach t3 claims the team; self-approval lockdown same as
-- organization_verifications.
-- ---------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b3", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.team_verifications (team_id, coach_id, status)
     values ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b3', 'approved') $$,
  'new row violates row-level security policy for table "team_verifications"',
  'a coach cannot submit a team claim that is already approved'
);

select lives_ok(
  $$ insert into public.team_verifications (id, team_id, coach_id, evidence)
     values ('72000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b3', 'I coach this team, ask any parent') $$,
  'a coach can submit a normal pending team claim'
);

select is(
  (select count(*) from public.players where team_id = '70000000-0000-0000-0000-000000000001')::int,
  0,
  'still pending, so the claiming coach cannot see the roster yet'
);

select throws_ok(
  $$ select public.remove_player_from_team('71000000-0000-0000-0000-000000000001') $$,
  'not authorized to remove this player from their team',
  'an unverified coach cannot remove a player from the team'
);

-- ---------------------------------------------------------------------
-- Admin approves.
-- ---------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000ba", "role": "authenticated"}';

update public.team_verifications
set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
where id = '72000000-0000-0000-0000-000000000001';

select is(
  (select public.is_verified_team_owner('00000000-0000-0000-0000-0000000000b3', '70000000-0000-0000-0000-000000000001'))::boolean,
  true,
  'once approved, is_verified_team_owner reflects it'
);

-- ---------------------------------------------------------------------
-- The verified owner sees exactly their own team's roster, can edit the
-- team profile, can remove a player, and can fold an unclaimed duplicate
-- in — but never a team another coach already owns.
-- ---------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b3", "role": "authenticated"}';

select is(
  (select count(*) from public.players where team_id = '70000000-0000-0000-0000-000000000001')::int,
  1,
  'the verified owner now sees the one player on their team'
);

select lives_ok(
  $$ update public.teams set name = 'Solar SC 2013 Boys Red', leagues = array['NTX Fall League'] where id = '70000000-0000-0000-0000-000000000001' $$,
  'the verified owner can edit their team''s profile'
);

reset role;
insert into public.teams (id, name, created_by) values ('70000000-0000-0000-0000-000000000002', 'Solar 13B (dup)', '00000000-0000-0000-0000-0000000000b2');
insert into public.team_verifications (team_id, coach_id, status) values ('70000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b4', 'approved');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b3", "role": "authenticated"}';

select throws_ok(
  $$ select public.merge_unclaimed_team_into('70000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001') $$,
  'that team is already claimed by another coach',
  'a coach cannot merge a team another coach already owns'
);

select lives_ok(
  $$ select public.remove_player_from_team('71000000-0000-0000-0000-000000000001') $$,
  'the verified owner can remove a player from their team'
);

select is(
  (select team_id from public.players where id = '71000000-0000-0000-0000-000000000001'),
  null,
  'the player''s team_id is actually cleared'
);

select * from finish();
rollback;
