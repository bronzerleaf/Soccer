-- profiles: a verified coach's and a verified organization's full_name
-- become readable by any authenticated user (migration 25) -- but a
-- pending coach, and any ordinary parent, stay exactly as invisible to
-- a stranger as before.

begin;
select plan(7);

insert into public.clubs (id, name, city) values
  ('60000000-0000-0000-0000-000000000005', 'Test Club E', 'Dallas');

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000101', 'stranger-p1@example.com'),
  ('00000000-0000-0000-0000-000000000102', 'other-p2@example.com'),
  ('00000000-0000-0000-0000-000000000103', 'verified-coach1@example.com'),
  ('00000000-0000-0000-0000-000000000104', 'pending-coach1@example.com'),
  ('00000000-0000-0000-0000-000000000105', 'verified-org1@example.com'),
  ('00000000-0000-0000-0000-000000000106', 'pending-org1@example.com');

update public.profiles set role = 'coach' where id in (
  '00000000-0000-0000-0000-000000000103',
  '00000000-0000-0000-0000-000000000104'
);
update public.profiles set role = 'organization' where id in (
  '00000000-0000-0000-0000-000000000105',
  '00000000-0000-0000-0000-000000000106'
);

insert into public.coach_verifications (coach_id, claimed_club_id, status) values
  ('00000000-0000-0000-0000-000000000103', '60000000-0000-0000-0000-000000000005', 'approved'),
  ('00000000-0000-0000-0000-000000000104', '60000000-0000-0000-0000-000000000005', 'pending');

insert into public.organization_verifications (organization_id, org_name, status) values
  ('00000000-0000-0000-0000-000000000105', 'Test Org E', 'approved'),
  ('00000000-0000-0000-0000-000000000106', 'Test Org Pending', 'pending');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000101", "role": "authenticated"}';

select isnt(
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-000000000103'),
  null,
  'a stranger can read a verified coach''s name'
);

select is(
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-000000000104'),
  null,
  'a stranger cannot read a pending (unverified) coach''s name -- still invisible'
);

select isnt(
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-000000000105'),
  null,
  'a stranger can read a verified organization''s name'
);

select is(
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-000000000102'),
  null,
  'a stranger cannot read an ordinary parent''s name'
);

select isnt(
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-000000000101'),
  null,
  'a user can always still read their own row'
);

select isnt(
  (select org_name from public.organization_verifications where organization_id = '00000000-0000-0000-0000-000000000105'),
  null,
  'a stranger can read an approved organization''s org_name'
);

select is(
  (select count(*) from public.organization_verifications where organization_id = '00000000-0000-0000-0000-000000000106')::int,
  0,
  'a stranger cannot read a pending organization''s verification row'
);

select * from finish();
rollback;
