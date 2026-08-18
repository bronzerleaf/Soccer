-- RLS proof for the milestone-1 requirement in CLAUDE.md:
-- "Verify with tests that a coach cannot read an unverified-visibility
-- player row."
--
-- Run with: supabase test db

begin;
select plan(9);

-- Fixture identities. auth.users needs a row per test identity so
-- auth.uid() (via request.jwt.claims) resolves and the handle_new_user
-- trigger populates profiles.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'parent-a@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'parent-b@example.com'),
  ('00000000-0000-0000-0000-0000000000c1', 'coach-pending@example.com'),
  ('00000000-0000-0000-0000-0000000000c2', 'coach-approved@example.com'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@example.com');

update public.profiles set role = 'coach' where id in (
  '00000000-0000-0000-0000-0000000000c1',
  '00000000-0000-0000-0000-0000000000c2'
);
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000ad';

insert into public.coach_verifications (coach_id, status) values
  ('00000000-0000-0000-0000-0000000000c1', 'pending'),
  ('00000000-0000-0000-0000-0000000000c2', 'approved');

-- Parent A has two children: one open+consented, one still gated by
-- consent. Parent B has one open+consented child.
insert into public.players
  (id, parent_id, first_name, last_initial, birth_year, city, open_to_opportunities, consent_completed)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Ava', 'S', 2014, 'Frisco', true, true),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1', 'Ben', 'S', 2016, 'Frisco', true, false),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a2', 'Cora', 'T', 2013, 'Plano', true, true);

-- ---------------------------------------------------------------------
-- Pending (unverified) coach: zero visibility into the player pool.
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c1", "role": "authenticated"}';

select is(
  (select count(*) from public.players)::int,
  0,
  'pending coach reads zero player rows'
);

select throws_ok(
  $$ insert into public.players (parent_id, first_name, last_initial, birth_year, city)
     values ('00000000-0000-0000-0000-0000000000c1', 'X', 'Y', 2015, 'Dallas') $$,
  'new row violates row-level security policy for table "players"',
  'pending coach cannot insert a player row'
);

-- ---------------------------------------------------------------------
-- Approved coach: sees only open_to_opportunities + consent_completed
-- rows, across parents, and nothing else.
-- ---------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c2", "role": "authenticated"}';

select is(
  (select count(*) from public.players)::int,
  2,
  'approved coach reads exactly the open + consented rows'
);

select is(
  (select count(*) from public.players where id = '10000000-0000-0000-0000-000000000002')::int,
  0,
  'approved coach cannot see the consent-gated child'
);

-- A coach has no UPDATE policy at all, so a row it can SELECT is still
-- invisible to UPDATE's USING clause: Postgres silently updates zero
-- rows rather than raising an error.
with attempted as (
  update public.players set bio = 'hi'
  where id = '10000000-0000-0000-0000-000000000001'
  returning 1
)
select is(
  (select count(*) from attempted)::int,
  0,
  'approved coach cannot write to a player row'
);

-- ---------------------------------------------------------------------
-- Parent: full access to own children, none of anyone else's.
-- ---------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';

select is(
  (select count(*) from public.players)::int,
  2,
  'parent A reads exactly their own two children'
);

select lives_ok(
  $$ update public.players set bio = 'loves left wing' where id = '10000000-0000-0000-0000-000000000002' $$,
  'parent can update their own child'
);

with attempted as (
  update public.players set bio = 'nope'
  where id = '10000000-0000-0000-0000-000000000003'
  returning 1
)
select is(
  (select count(*) from attempted)::int,
  0,
  'parent A cannot write to parent B''s child'
);

-- ---------------------------------------------------------------------
-- Admin: sees everything.
-- ---------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000ad", "role": "authenticated"}';

select is(
  (select count(*) from public.players)::int,
  3,
  'admin reads every player row regardless of consent/open status'
);

select * from finish();
rollback;
