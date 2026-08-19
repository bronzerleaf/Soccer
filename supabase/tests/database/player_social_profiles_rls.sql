-- Coverage for instagram_url/youtube_url (migration 18): no new RLS
-- surface, but the column-level UPDATE grant is easy to forget (as
-- consent_completed's own history proves) -- this proves a parent can
-- actually set these two fields, not just that RLS would allow it.

begin;
select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000071', 'parent-sp1@example.com'),
  ('00000000-0000-0000-0000-000000000072', 'coach-sp1@example.com');

update public.profiles set role = 'coach' where id = '00000000-0000-0000-0000-000000000072';
insert into public.coach_verifications (coach_id, status) values
  ('00000000-0000-0000-0000-000000000072', 'approved');

insert into public.players
  (id, parent_id, first_name, last_initial, birth_year, city, open_to_opportunities, consent_completed)
values
  ('95000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000071', 'Tess', 'K', 2013, 'Test City', true, true);

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000071", "role": "authenticated"}';

select lives_ok(
  $$ update public.players set instagram_url = 'https://instagram.com/tess_soccer', youtube_url = 'https://youtube.com/@tesssoccer'
     where id = '95000000-0000-0000-0000-000000000001' $$,
  'a parent can set their own player''s Instagram and YouTube profile links'
);

select is(
  (select instagram_url from public.players where id = '95000000-0000-0000-0000-000000000001'),
  'https://instagram.com/tess_soccer',
  'the Instagram link is actually stored'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000072", "role": "authenticated"}';

select is(
  (select youtube_url from public.players where id = '95000000-0000-0000-0000-000000000001'),
  'https://youtube.com/@tesssoccer',
  'a verified coach sees the YouTube link on an open, consented player -- same visibility as every other field'
);

-- No UPDATE policy grants a coach write access to any player row at all
-- (only "players: parent updates own children" exists) -- RLS silently
-- excludes the row from the UPDATE rather than throwing, so this proves
-- it had no effect instead of expecting an error.
select lives_ok(
  $$ update public.players set instagram_url = 'https://instagram.com/hijacked' where id = '95000000-0000-0000-0000-000000000001' $$,
  'a coach''s attempt to write a player''s social links runs without error...'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000071", "role": "authenticated"}';

select is(
  (select instagram_url from public.players where id = '95000000-0000-0000-0000-000000000001'),
  'https://instagram.com/tess_soccer',
  '...but silently changes nothing -- RLS excluded the row from the UPDATE entirely'
);

select * from finish();
rollback;
