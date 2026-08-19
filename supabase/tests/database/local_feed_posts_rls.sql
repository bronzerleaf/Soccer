-- RLS coverage for feed_posts + feed_post_likes (Local Feed milestone 3,
-- CLAUDE.md section 9): a parent can only post looking_for_team/guest_play
-- about their own consented player; an organization can only post
-- org_event, and only once verified; posting to the feed never unlocks a
-- player row that wasn't independently visible before.

begin;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'parent-fp1@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'parent-fp2@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'coach-fp1@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'org-fp1@example.com'),
  ('00000000-0000-0000-0000-0000000000e5', 'admin-fp1@example.com');

update public.profiles set role = 'coach' where id = '00000000-0000-0000-0000-0000000000e3';
update public.profiles set role = 'organization' where id = '00000000-0000-0000-0000-0000000000e4';
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000e5';

insert into public.coach_verifications (coach_id, status) values
  ('00000000-0000-0000-0000-0000000000e3', 'approved');
insert into public.organization_verifications (organization_id, org_name, status) values
  ('00000000-0000-0000-0000-0000000000e4', 'DFW Fall Showcase', 'approved');

insert into public.cities (id, name, latitude, longitude) values
  ('81000000-0000-0000-0000-000000000001', 'Test City', 33.0, -96.0);

-- e1's player is consent_completed but NOT open_to_opportunities -- proves
-- the feed post itself doesn't unlock anything a coach couldn't already
-- see. e2's player is not even consented yet.
insert into public.players
  (id, parent_id, first_name, last_initial, birth_year, city, open_to_opportunities, consent_completed)
values
  ('82000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000e1', 'Kai', 'N', 2013, 'Test City', false, true),
  ('82000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000e2', 'Rio', 'P', 2014, 'Test City', false, false);

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.feed_posts (id, post_type, author_id, city_id, player_id, birth_year, description)
     values ('83000000-0000-0000-0000-000000000001', 'looking_for_team', '00000000-0000-0000-0000-0000000000e1',
             '81000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001', 2013, 'Looking for a competitive U12 team') $$,
  'a parent can post looking_for_team about their own consented player'
);

select throws_ok(
  $$ insert into public.feed_posts (post_type, author_id, city_id, player_id, description)
     values ('looking_for_team', '00000000-0000-0000-0000-0000000000e1',
             '81000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000002', 'Hijacking someone else''s child') $$,
  'new row violates row-level security policy for table "feed_posts"',
  'a parent cannot post about a player they don''t own'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000e2", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.feed_posts (post_type, author_id, city_id, player_id, description)
     values ('guest_play', '00000000-0000-0000-0000-0000000000e2',
             '81000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000002', 'Guest play this weekend') $$,
  'new row violates row-level security policy for table "feed_posts"',
  'a parent cannot post about their own player before consent is complete'
);

select throws_ok(
  $$ insert into public.feed_posts (post_type, author_id, city_id, description)
     values ('org_event', '00000000-0000-0000-0000-0000000000e2',
             '81000000-0000-0000-0000-000000000001', 'Fake tournament ad') $$,
  'new row violates row-level security policy for table "feed_posts"',
  'a parent cannot post an org_event -- not an organization at all'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000e4", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.feed_posts (post_type, author_id, city_id, player_id, description)
     values ('looking_for_team', '00000000-0000-0000-0000-0000000000e4',
             '81000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001', 'Organizations cannot post this type') $$,
  'new row violates row-level security policy for table "feed_posts"',
  'a verified organization cannot post looking_for_team/guest_play'
);

select lives_ok(
  $$ insert into public.feed_posts (id, post_type, author_id, city_id, description)
     values ('83000000-0000-0000-0000-000000000002', 'org_event', '00000000-0000-0000-0000-0000000000e4',
             '81000000-0000-0000-0000-000000000001', 'DFW Fall Showcase -- U11-U14 sign-ups open') $$,
  'a verified organization can post org_event'
);

-- ---------------------------------------------------------------------
-- A coach can read the active feed, and posting to it never unlocks a
-- player row that wasn't independently visible before.
-- ---------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000e3", "role": "authenticated"}';

select is(
  (select count(*) from public.feed_posts)::int,
  2,
  'a coach reads both active feed posts'
);

select is(
  (select count(*) from public.players where id = '82000000-0000-0000-0000-000000000001')::int,
  0,
  'the looking_for_team post did not unlock the player row -- still not open_to_opportunities, RLS still denies it'
);

with attempted as (
  delete from public.feed_posts where id = '83000000-0000-0000-0000-000000000001' returning 1
)
select is(
  (select count(*) from attempted)::int,
  0,
  'a coach cannot delete a parent''s feed post'
);

-- ---------------------------------------------------------------------
-- feed_post_likes
-- ---------------------------------------------------------------------
select lives_ok(
  $$ insert into public.feed_post_likes (post_id, profile_id)
     values ('83000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000e3') $$,
  'a coach can like an active feed post as themselves'
);

select throws_ok(
  $$ insert into public.feed_post_likes (post_id, profile_id)
     values ('83000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000e1') $$,
  'new row violates row-level security policy for table "feed_post_likes"',
  'a user cannot like a post on someone else''s behalf'
);

with attempted as (
  delete from public.feed_post_likes
  where post_id = '83000000-0000-0000-0000-000000000002' and profile_id = '00000000-0000-0000-0000-0000000000e3'
  returning 1
)
select is(
  (select count(*) from attempted)::int,
  1,
  'a user can unlike their own like'
);

-- ---------------------------------------------------------------------
-- Author can manage their own post; nobody else can.
-- ---------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated"}';

select lives_ok(
  $$ update public.feed_posts set description = 'Updated: looking for a competitive U13 team'
     where id = '83000000-0000-0000-0000-000000000001' $$,
  'the author can update their own feed post'
);

select lives_ok(
  $$ delete from public.feed_posts where id = '83000000-0000-0000-0000-000000000001' $$,
  'the author can delete their own feed post'
);

select * from finish();
rollback;
