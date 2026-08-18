-- Proves photo visibility for a coach exactly mirrors player-row
-- visibility: open_to_opportunities + consent_completed + an approved
-- coach_verifications row, all three, nothing less.

begin;
select plan(4);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f3', 'parent-f3@example.com'),
  ('00000000-0000-0000-0000-0000000000c4', 'coach-pending2@example.com'),
  ('00000000-0000-0000-0000-0000000000c5', 'coach-approved2@example.com');

update public.profiles set role = 'coach' where id in (
  '00000000-0000-0000-0000-0000000000c4',
  '00000000-0000-0000-0000-0000000000c5'
);

insert into public.coach_verifications (coach_id, status) values
  ('00000000-0000-0000-0000-0000000000c4', 'pending'),
  ('00000000-0000-0000-0000-0000000000c5', 'approved');

insert into public.players
  (id, parent_id, first_name, last_initial, birth_year, city, open_to_opportunities, consent_completed, photo_url)
values
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f3', 'Mia', 'R', 2012, 'Frisco', true, true,
   '00000000-0000-0000-0000-0000000000f3/50000000-0000-0000-0000-000000000001.jpg'),
  ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000f3', 'Noa', 'R', 2015, 'Frisco', false, false,
   '00000000-0000-0000-0000-0000000000f3/50000000-0000-0000-0000-000000000002.jpg');

insert into storage.objects (bucket_id, name) values
  ('player-photos', '00000000-0000-0000-0000-0000000000f3/50000000-0000-0000-0000-000000000001.jpg'),
  ('player-photos', '00000000-0000-0000-0000-0000000000f3/50000000-0000-0000-0000-000000000002.jpg');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c4", "role": "authenticated"}';

select is(
  (select count(*) from storage.objects where bucket_id = 'player-photos')::int,
  0,
  'a pending coach reads zero player photos'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c5", "role": "authenticated"}';

select is(
  (select count(*) from storage.objects where bucket_id = 'player-photos')::int,
  1,
  'an approved coach reads exactly the one open + consented player''s photo'
);

select is(
  (select count(*) from storage.objects
   where bucket_id = 'player-photos'
     and name = '00000000-0000-0000-0000-0000000000f3/50000000-0000-0000-0000-000000000001.jpg')::int,
  1,
  'and specifically the open + consented player''s photo'
);

select is(
  (select count(*) from storage.objects
   where bucket_id = 'player-photos'
     and name = '00000000-0000-0000-0000-0000000000f3/50000000-0000-0000-0000-000000000002.jpg')::int,
  0,
  'never the not-open, not-consented player''s photo'
);

select * from finish();
rollback;
