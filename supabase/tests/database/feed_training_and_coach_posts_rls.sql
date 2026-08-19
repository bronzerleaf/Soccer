-- RLS coverage for the coach-authored feed additions (migration
-- 20260114000001): a verified coach can post "need a guest player"
-- (no player attached) and "training" (with an optional cost/duration);
-- an unverified coach, a parent, and an organization all stay locked out
-- of both.

begin;
select plan(10);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'parent-tr1@example.com'),
  ('00000000-0000-0000-0000-0000000000c2', 'coach-tr1@example.com'),
  ('00000000-0000-0000-0000-0000000000c3', 'coach-tr2@example.com'),
  ('00000000-0000-0000-0000-0000000000c4', 'org-tr1@example.com');

update public.profiles set role = 'coach' where id in (
  '00000000-0000-0000-0000-0000000000c2',
  '00000000-0000-0000-0000-0000000000c3'
);
update public.profiles set role = 'organization' where id = '00000000-0000-0000-0000-0000000000c4';

insert into public.coach_verifications (coach_id, status) values
  ('00000000-0000-0000-0000-0000000000c2', 'approved');
-- c3 stays unverified (no row at all) on purpose.
insert into public.organization_verifications (organization_id, org_name, status) values
  ('00000000-0000-0000-0000-0000000000c4', 'DFW Youth Alliance', 'approved');

insert into public.cities (id, name, latitude, longitude) values
  ('84000000-0000-0000-0000-000000000001', 'Test City Two', 33.1, -96.1);

-- Only needed so the "coach tries to attach a real player_id anyway"
-- case below hits the RLS policy, not an unrelated foreign-key error.
insert into public.players
  (id, parent_id, first_name, last_initial, birth_year, city, open_to_opportunities, consent_completed)
values
  ('86000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'Tam', 'R', 2012, 'Test City Two', false, true);

-- ---------------------------------------------------------------------
-- A verified coach can post both new types.
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c2", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.feed_posts (id, post_type, author_id, city_id, description)
     values ('85000000-0000-0000-0000-000000000001', 'guest_play', '00000000-0000-0000-0000-0000000000c2',
             '84000000-0000-0000-0000-000000000001', 'Need a guest defender for Saturday''s match') $$,
  'a verified coach can post that their team needs a guest player'
);

select throws_ok(
  $$ insert into public.feed_posts (post_type, author_id, city_id, player_id, description)
     values ('guest_play', '00000000-0000-0000-0000-0000000000c2',
             '84000000-0000-0000-0000-000000000001', '86000000-0000-0000-0000-000000000001', 'Should be rejected') $$,
  'new row violates row-level security policy for table "feed_posts"',
  'a coach''s guest-play post is rejected if it tries to attach a player_id'
);

select lives_ok(
  $$ insert into public.feed_posts (id, post_type, author_id, city_id, description, cost_cents, duration_minutes)
     values ('85000000-0000-0000-0000-000000000002', 'training', '00000000-0000-0000-0000-0000000000c2',
             '84000000-0000-0000-0000-000000000001', 'Summer skills clinic, all ages welcome', 2500, 90) $$,
  'a verified coach can post a training session with a cost and duration'
);

select is(
  (select cost_cents from public.feed_posts where id = '85000000-0000-0000-0000-000000000002'),
  2500,
  'the cost is stored correctly'
);

select throws_ok(
  $$ insert into public.feed_posts (post_type, author_id, city_id, description, cost_cents)
     values ('guest_play', '00000000-0000-0000-0000-0000000000c2', '84000000-0000-0000-0000-000000000001', 'Sneaking a cost onto a guest-play post', 500) $$,
  'new row for relation "feed_posts" violates check constraint "feed_posts_cost_duration_only_for_training"',
  'cost_cents cannot be set on a post type other than training, even one this coach can otherwise post'
);

select throws_ok(
  $$ insert into public.feed_posts (post_type, author_id, city_id, description)
     values ('org_event', '00000000-0000-0000-0000-0000000000c2', '84000000-0000-0000-0000-000000000001', 'A coach is not an organization') $$,
  'new row violates row-level security policy for table "feed_posts"',
  'a coach still cannot post org_event'
);

-- ---------------------------------------------------------------------
-- An unverified coach gets neither new post type.
-- ---------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c3", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.feed_posts (post_type, author_id, city_id, description)
     values ('guest_play', '00000000-0000-0000-0000-0000000000c3', '84000000-0000-0000-0000-000000000001', 'Unverified coach, should fail') $$,
  'new row violates row-level security policy for table "feed_posts"',
  'an unverified coach cannot post a guest-player-needed listing'
);

select throws_ok(
  $$ insert into public.feed_posts (post_type, author_id, city_id, description)
     values ('training', '00000000-0000-0000-0000-0000000000c3', '84000000-0000-0000-0000-000000000001', 'Unverified coach, should fail') $$,
  'new row violates row-level security policy for table "feed_posts"',
  'an unverified coach cannot post a training listing'
);

-- ---------------------------------------------------------------------
-- Neither a parent nor an organization can post a training listing --
-- this stays a verified-coach-only post type.
-- ---------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c1", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.feed_posts (post_type, author_id, city_id, description)
     values ('training', '00000000-0000-0000-0000-0000000000c1', '84000000-0000-0000-0000-000000000001', 'A parent is not a coach') $$,
  'new row violates row-level security policy for table "feed_posts"',
  'a parent cannot post a training listing'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c4", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.feed_posts (post_type, author_id, city_id, description)
     values ('training', '00000000-0000-0000-0000-0000000000c4', '84000000-0000-0000-0000-000000000001', 'An organization is not a coach') $$,
  'new row violates row-level security policy for table "feed_posts"',
  'a verified organization cannot post a training listing either -- it stays coach-only'
);

select * from finish();
rollback;
