-- Proves the consent gate in 20260102000000_consent_records.sql actually
-- holds at the database layer: a parent can create and manage their own
-- player, but cannot self-grant consent through any path (INSERT or
-- UPDATE), cannot activate open_to_opportunities before consent, cannot
-- read another parent's consent history, and a hard delete of the player
-- takes its consent records with it.

begin;
select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'parent-f1@example.com'),
  ('00000000-0000-0000-0000-0000000000f2', 'parent-f2@example.com');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';

-- A brand-new player row must start unconsented; asserting
-- consent_completed = true at insert time is rejected outright.
select throws_ok(
  $$ insert into public.players
       (parent_id, first_name, last_initial, birth_year, city, consent_completed)
     values ('00000000-0000-0000-0000-0000000000f1', 'Zoe', 'Q', 2014, 'Plano', true) $$,
  'new row violates row-level security policy for table "players"',
  'a parent cannot insert a player that is already consented'
);

-- The DB-level gate: open_to_opportunities can never be true while
-- consent_completed is false, independent of any RLS policy.
select throws_ok(
  $$ insert into public.players
       (parent_id, first_name, last_initial, birth_year, city, open_to_opportunities)
     values ('00000000-0000-0000-0000-0000000000f1', 'Zoe', 'Q', 2014, 'Plano', true) $$,
  'new row for relation "players" violates check constraint "players_consent_gates_open_to_opportunities"',
  'open_to_opportunities cannot be set before consent_completed'
);

insert into public.players (id, parent_id, first_name, last_initial, birth_year, city)
values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f1', 'Zoe', 'Q', 2014, 'Plano');

-- A parent cannot flip consent_completed themselves via UPDATE either
-- (column-level revoke, same pattern as profiles.role).
select throws_ok(
  $$ update public.players set consent_completed = true
     where id = '20000000-0000-0000-0000-000000000001' $$,
  'permission denied for table players',
  'a parent cannot grant their own child consent via update'
);

-- Simulates the server-side consent flow: only the service role can flip
-- this, bypassing RLS and column grants entirely.
reset role;
update public.players set consent_completed = true
where id = '20000000-0000-0000-0000-000000000001';

insert into public.consent_records (player_id, parent_id, method, ip)
values (
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-0000000000f1',
  'stripe_card_authorization',
  '203.0.113.5'
);

-- Once actually consented, the parent can still edit the player normally
-- (this is the case the naive "just require consent_completed = false in
-- WITH CHECK everywhere" fix would have broken).
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';

select lives_ok(
  $$ update public.players set open_to_opportunities = true
     where id = '20000000-0000-0000-0000-000000000001' $$,
  'after consent, the parent can activate open_to_opportunities'
);

-- Parent reads their own consent history...
select is(
  (select count(*) from public.consent_records
   where player_id = '20000000-0000-0000-0000-000000000001')::int,
  1,
  'parent reads their own player''s consent record'
);

-- ...but a parent cannot write a consent record directly (no INSERT
-- policy grants this to `authenticated` at all).
select throws_ok(
  $$ insert into public.consent_records (player_id, parent_id, method, ip)
     values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f1', 'self-reported', '203.0.113.5') $$,
  'new row violates row-level security policy for table "consent_records"',
  'a parent cannot fabricate their own consent record'
);

-- ...nor read a different parent's consent history.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f2", "role": "authenticated"}';

select is(
  (select count(*) from public.consent_records
   where player_id = '20000000-0000-0000-0000-000000000001')::int,
  0,
  'a different parent cannot see this consent record'
);

-- Hard delete: the parent removes their child, and the consent record
-- (which references it) goes with it — no orphaned, no soft-deleted
-- trace of the minor's data.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';

delete from public.players where id = '20000000-0000-0000-0000-000000000001';

reset role;
select is(
  (select count(*) from public.consent_records
   where player_id = '20000000-0000-0000-0000-000000000001')::int,
  0,
  'hard-deleting the player cascades to its consent records'
);

select * from finish();
rollback;
