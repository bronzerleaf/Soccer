-- mark_conversation_read (migration 23): a participant can mark their
-- own side read, it never touches the other participant's column, and
-- a non-participant is rejected outright.

begin;
select plan(6);

insert into public.clubs (id, name, city) values
  ('60000000-0000-0000-0000-000000000004', 'Test Club D', 'Dallas');

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000091', 'parent-rs1@example.com'),
  ('00000000-0000-0000-0000-000000000092', 'parent-rs2@example.com'),
  ('00000000-0000-0000-0000-000000000093', 'coach-rs1@example.com');

update public.profiles set role = 'coach' where id = '00000000-0000-0000-0000-000000000093';
insert into public.coach_verifications (coach_id, claimed_club_id, status) values
  ('00000000-0000-0000-0000-000000000093', '60000000-0000-0000-0000-000000000004', 'approved');

insert into public.players
  (id, parent_id, first_name, last_initial, birth_year, city, open_to_opportunities, consent_completed)
values (
  '97000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000091',
  'Wes', 'T', 2012, 'Dallas', true, true
);

insert into public.conversations (id, parent_id, coach_id, player_id) values
  ('a7000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000091',
   '00000000-0000-0000-0000-000000000093', '97000000-0000-0000-0000-000000000001');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000091", "role": "authenticated"}';

select lives_ok(
  $$ select public.mark_conversation_read('a7000000-0000-0000-0000-000000000001') $$,
  'a participant can mark their own side of the conversation read'
);

reset role;

select isnt(
  (select parent_last_read_at from public.conversations where id = 'a7000000-0000-0000-0000-000000000001'),
  null,
  'the parent''s own read marker is actually set'
);

select is(
  (select coach_last_read_at from public.conversations where id = 'a7000000-0000-0000-0000-000000000001'),
  null,
  'the coach''s read marker is untouched by the parent''s call'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000093", "role": "authenticated"}';

select lives_ok(
  $$ select public.mark_conversation_read('a7000000-0000-0000-0000-000000000001') $$,
  'the other participant (the coach) can mark their own side read too'
);

reset role;

select isnt(
  (select coach_last_read_at from public.conversations where id = 'a7000000-0000-0000-0000-000000000001'),
  null,
  'the coach''s read marker is now set'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000092", "role": "authenticated"}';

select throws_ok(
  $$ select public.mark_conversation_read('a7000000-0000-0000-0000-000000000001') $$,
  'not a participant in this conversation',
  'a non-participant cannot mark someone else''s conversation read'
);

select * from finish();
rollback;
