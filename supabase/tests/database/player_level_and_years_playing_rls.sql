-- Coverage for years_playing/player_level (migration 21): same shape as
-- player_social_profiles_rls.sql -- proves a parent can actually set
-- these two fields (not just that RLS would allow it), and that a coach
-- write is silently excluded rather than granted.

begin;
select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000081', 'parent-yl1@example.com'),
  ('00000000-0000-0000-0000-000000000082', 'coach-yl1@example.com');

update public.profiles set role = 'coach' where id = '00000000-0000-0000-0000-000000000082';
insert into public.coach_verifications (coach_id, status) values
  ('00000000-0000-0000-0000-000000000082', 'approved');

insert into public.players
  (id, parent_id, first_name, last_initial, birth_year, city, open_to_opportunities, consent_completed)
values
  ('96000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000081', 'Uma', 'P', 2012, 'Test City', true, true);

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000081", "role": "authenticated"}';

select lives_ok(
  $$ update public.players set years_playing = 6, player_level = 'ecnl_rl' where id = '96000000-0000-0000-0000-000000000001' $$,
  'a parent can set their own player''s years playing and player level'
);

select is(
  (select player_level::text from public.players where id = '96000000-0000-0000-0000-000000000001'),
  'ecnl_rl',
  'the player level is actually stored'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000082", "role": "authenticated"}';

select is(
  (select years_playing from public.players where id = '96000000-0000-0000-0000-000000000001'),
  6,
  'a verified coach sees years playing on an open, consented player -- same visibility as every other field'
);

-- No UPDATE policy grants a coach write access to any player row at all
-- (only "players: parent updates own children" exists) -- RLS silently
-- excludes the row from the UPDATE rather than throwing.
select lives_ok(
  $$ update public.players set years_playing = 99 where id = '96000000-0000-0000-0000-000000000001' $$,
  'a coach''s attempt to write years_playing runs without error...'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000081", "role": "authenticated"}';

select is(
  (select years_playing from public.players where id = '96000000-0000-0000-0000-000000000001'),
  6,
  '...but silently changes nothing -- RLS excluded the row from the UPDATE entirely'
);

select * from finish();
rollback;
