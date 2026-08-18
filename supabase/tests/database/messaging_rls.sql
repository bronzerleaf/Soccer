-- The highest-severity concern in this codebase: prove there is no path
-- from a coach to a child. Every conversation participant column
-- (parent_id, coach_id) is an adult profile; player_id is context only.
-- Also proves conversations require a real discovery context (a
-- visible player or the coach's own roster post), participants-only
-- read/write, and the scoped profiles cross-read.

begin;
select plan(11);

insert into public.clubs (id, name, city) values
  ('60000000-0000-0000-0000-000000000003', 'Test Club C', 'Dallas');

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f5', 'parent-j1@example.com'),
  ('00000000-0000-0000-0000-0000000000f6', 'parent-j2@example.com'),
  ('00000000-0000-0000-0000-0000000000c8', 'coach-j1@example.com'),
  ('00000000-0000-0000-0000-0000000000c9', 'coach-j2-pending@example.com');

update public.profiles set role = 'coach' where id in (
  '00000000-0000-0000-0000-0000000000c8',
  '00000000-0000-0000-0000-0000000000c9'
);

insert into public.coach_verifications (coach_id, claimed_club_id, status) values
  ('00000000-0000-0000-0000-0000000000c8', '60000000-0000-0000-0000-000000000003', 'approved'),
  ('00000000-0000-0000-0000-0000000000c9', '60000000-0000-0000-0000-000000000003', 'pending');

insert into public.players
  (id, parent_id, first_name, last_initial, birth_year, city, open_to_opportunities, consent_completed)
values (
  '80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f5',
  'Ivy', 'K', 2013, 'Dallas', true, true
);

insert into public.roster_posts (id, coach_id, club_id, birth_year, description, expires_at)
values (
  '90000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c8',
  '60000000-0000-0000-0000-000000000003', 2013, 'Need a forward', now() + interval '30 days'
);

-- ---------------------------------------------------------------------
-- Coach-initiated, from a real discovery context
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c8", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.conversations (id, parent_id, coach_id, player_id)
     values ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f5',
             '00000000-0000-0000-0000-0000000000c8', '80000000-0000-0000-0000-000000000001') $$,
  'a verified coach can start a conversation about a player they can actually see'
);

select throws_ok(
  $$ insert into public.conversations (parent_id, coach_id, player_id)
     values ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-0000000000c8',
             '80000000-0000-0000-0000-000000000001') $$,
  'new row violates row-level security policy for table "conversations"',
  'a coach cannot claim a player belongs to a parent it doesn''t'
);

select throws_ok(
  $$ insert into public.conversations (parent_id, coach_id)
     values ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-0000000000c8') $$,
  'new row violates row-level security policy for table "conversations"',
  'a coach cannot cold-message a parent with no player or roster-post context'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c9", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.conversations (parent_id, coach_id, player_id)
     values ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000c9',
             '80000000-0000-0000-0000-000000000001') $$,
  'new row violates row-level security policy for table "conversations"',
  'an unverified coach cannot start a conversation at all'
);

-- ---------------------------------------------------------------------
-- Parent-initiated, from their own roster-post context
-- ---------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f5", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.conversations (parent_id, coach_id, roster_post_id)
     values ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000c9',
             '90000000-0000-0000-0000-000000000001') $$,
  'new row violates row-level security policy for table "conversations"',
  'a parent cannot attribute a roster post to a coach who didn''t post it'
);

-- ---------------------------------------------------------------------
-- Messages: participants only, sender forced to auth.uid()
-- ---------------------------------------------------------------------
select lives_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     values ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f5', 'Hi, tell me more!') $$,
  'a participant can send a message in their own conversation'
);

select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     values ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c8', 'pretending to be the coach') $$,
  'new row violates row-level security policy for table "messages"',
  'a participant cannot send a message forging someone else''s sender_id'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f6", "role": "authenticated"}';

select is(
  (select count(*) from public.conversations where id = 'a0000000-0000-0000-0000-000000000001')::int,
  0,
  'a non-participant cannot read the conversation at all'
);

select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     values ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f6', 'butting in') $$,
  'new row violates row-level security policy for table "messages"',
  'a non-participant cannot send a message into someone else''s conversation'
);

-- ---------------------------------------------------------------------
-- profiles cross-read: only between actual conversation participants
-- ---------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c8", "role": "authenticated"}';

select is(
  (select count(*) from public.profiles where id = '00000000-0000-0000-0000-0000000000f5')::int,
  1,
  'a coach can read the profile of a parent they''re actually talking to'
);

select is(
  (select count(*) from public.profiles where id = '00000000-0000-0000-0000-0000000000f6')::int,
  0,
  'but not the profile of a parent they''ve never messaged'
);

select * from finish();
rollback;
