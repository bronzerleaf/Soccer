-- Proves player-photos storage objects are scoped to the uploading
-- parent by path (first folder segment = auth.uid()), same ownership
-- model as every other player-data table.

begin;
select plan(4);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e5', 'parent-g1@example.com'),
  ('00000000-0000-0000-0000-0000000000e6', 'parent-g2@example.com');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000e5", "role": "authenticated"}';

select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('player-photos', '00000000-0000-0000-0000-0000000000e5/30000000-0000-0000-0000-000000000001.jpg') $$,
  'a parent can upload a photo under their own folder'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('player-photos', '00000000-0000-0000-0000-0000000000e6/30000000-0000-0000-0000-000000000002.jpg') $$,
  'new row violates row-level security policy for table "objects"',
  'a parent cannot upload a photo under someone else''s folder'
);

select is(
  (select count(*) from storage.objects where bucket_id = 'player-photos')::int,
  1,
  'a parent sees only their own uploaded photos'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000e6", "role": "authenticated"}';

select is(
  (select count(*) from storage.objects where bucket_id = 'player-photos')::int,
  0,
  'a different parent cannot see the first parent''s photo'
);

select * from finish();
rollback;
