-- Proves the moderation surfaces: a participant can flag a message in
-- their own conversation but nobody else can, only an admin can read or
-- dismiss flags (dismissing never touches the underlying message), only
-- an admin can manage the curated club list, and an admin can remove any
-- roster post regardless of which coach posted it.

begin;
select plan(8);

insert into public.clubs (id, name, city) values
  ('60000000-0000-0000-0000-000000000004', 'Test Club D', 'Frisco');

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f7', 'parent-k1@example.com'),
  ('00000000-0000-0000-0000-0000000000f8', 'parent-k2@example.com'),
  ('00000000-0000-0000-0000-0000000000ca', 'coach-k1@example.com'),
  ('00000000-0000-0000-0000-0000000000af', 'admin-k1@example.com');

update public.profiles set role = 'coach' where id = '00000000-0000-0000-0000-0000000000ca';
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000af';

insert into public.coach_verifications (coach_id, claimed_club_id, status) values
  ('00000000-0000-0000-0000-0000000000ca', '60000000-0000-0000-0000-000000000004', 'approved');

insert into public.players
  (id, parent_id, first_name, last_initial, birth_year, city, open_to_opportunities, consent_completed)
values (
  '80000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000f7',
  'Cody', 'M', 2012, 'Frisco', true, true
);

insert into public.conversations (id, parent_id, coach_id, player_id) values (
  'a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000f7',
  '00000000-0000-0000-0000-0000000000ca', '80000000-0000-0000-0000-000000000002'
);

insert into public.messages (id, conversation_id, sender_id, body) values (
  'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-0000000000ca', 'a slightly off message'
);

insert into public.roster_posts (id, coach_id, club_id, birth_year, description, expires_at) values (
  '90000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000ca',
  '60000000-0000-0000-0000-000000000004', 2012, 'Need a defender', now() + interval '30 days'
);

-- ---------------------------------------------------------------------
-- Flagging
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f7", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.message_flags (id, message_id, flagged_by, reason)
     values ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
             '00000000-0000-0000-0000-0000000000f7', 'made me uncomfortable') $$,
  'a conversation participant can flag a message they can see'
);

select is(
  (select count(*) from public.message_flags)::int,
  0,
  'the flagger themselves cannot read flags back — no SELECT policy grants that'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f8", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.message_flags (message_id, flagged_by, reason)
     values ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f8', 'butting in') $$,
  'new row violates row-level security policy for table "message_flags"',
  'a non-participant cannot flag a message they were never part of'
);

-- ---------------------------------------------------------------------
-- Admin moderation
-- ---------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000af", "role": "authenticated"}';

select is(
  (select count(*) from public.message_flags)::int,
  1,
  'an admin can read the flag'
);

select lives_ok(
  $$ delete from public.message_flags where id = 'c0000000-0000-0000-0000-000000000001' $$,
  'an admin can dismiss a flag'
);

select is(
  (select count(*) from public.messages where id = 'b0000000-0000-0000-0000-000000000001')::int,
  1,
  'dismissing the flag never touches the underlying message'
);

select lives_ok(
  $$ delete from public.roster_posts where id = '90000000-0000-0000-0000-000000000002' $$,
  'an admin can remove any roster post regardless of which coach posted it'
);

-- ---------------------------------------------------------------------
-- Club management stays admin-only
-- ---------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f7", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.clubs (name, city) values ('Rogue Club', 'Dallas') $$,
  'new row violates row-level security policy for table "clubs"',
  'an ordinary parent cannot add a club to the curated list'
);

select * from finish();
rollback;
