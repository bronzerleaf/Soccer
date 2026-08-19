-- RLS + function coverage for migration 19: a parent can message the
-- coach behind a coach-authored guest_play/training feed post, a coach
-- cannot be impersonated as that post's author, org_event stays fully
-- unmessageable, and the three pre-existing discovery contexts still
-- work after the insert policy was dropped and recreated again.

begin;
select plan(10);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000081', 'parent-fp1@example.com'),
  ('00000000-0000-0000-0000-000000000082', 'coach-fp1@example.com'),
  ('00000000-0000-0000-0000-000000000083', 'coach-fp2@example.com'),
  ('00000000-0000-0000-0000-000000000084', 'org-fp1@example.com');

update public.profiles set role = 'coach' where id in (
  '00000000-0000-0000-0000-000000000082',
  '00000000-0000-0000-0000-000000000083'
);
update public.profiles set role = 'organization' where id = '00000000-0000-0000-0000-000000000084';

insert into public.coach_verifications (coach_id, status) values
  ('00000000-0000-0000-0000-000000000082', 'approved'),
  ('00000000-0000-0000-0000-000000000083', 'approved');

insert into public.organization_verifications (organization_id, org_name, status) values
  ('00000000-0000-0000-0000-000000000084', 'Feed Post Messaging Test Cup', 'approved');

insert into public.cities (id, name, latitude, longitude) values
  ('96000000-0000-0000-0000-000000000001', 'Feed Msg Test City', 32.7, -96.8)
on conflict (id) do nothing;

insert into public.players
  (id, parent_id, first_name, last_initial, birth_year, city, open_to_opportunities, consent_completed)
values
  ('97000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000081', 'Nora', 'F', 2012, 'Test City', true, true);

-- A coach's "need a guest player" post -- no player_id, this is the gap
-- being closed.
insert into public.feed_posts (id, post_type, author_id, city_id, description) values
  ('98000000-0000-0000-0000-000000000001', 'guest_play', '00000000-0000-0000-0000-000000000082', '96000000-0000-0000-0000-000000000001', 'Need a guest forward for Saturday''s scrimmage.');

-- A coach's training post.
insert into public.feed_posts (id, post_type, author_id, city_id, description) values
  ('98000000-0000-0000-0000-000000000002', 'training', '00000000-0000-0000-0000-000000000083', '96000000-0000-0000-0000-000000000001', 'Weekly finishing clinic, all welcome.');

-- An organization's event -- must stay unmessageable no matter what.
insert into public.feed_posts (id, post_type, author_id, city_id, description) values
  ('98000000-0000-0000-0000-000000000003', 'org_event', '00000000-0000-0000-0000-000000000084', '96000000-0000-0000-0000-000000000001', 'Fall showcase, all clubs welcome.');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000081", "role": "authenticated"}';

-- ---------------------------------------------------------------------
-- feed_post_belongs_to_coach: the real gate behind the new branch.
-- ---------------------------------------------------------------------
select ok(
  public.feed_post_belongs_to_coach('98000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000082'),
  'feed_post_belongs_to_coach is true for the guest_play post''s real coach author'
);

select ok(
  not public.feed_post_belongs_to_coach('98000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000083'),
  'feed_post_belongs_to_coach is false for a different coach'
);

select ok(
  not public.feed_post_belongs_to_coach('98000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000084'),
  'feed_post_belongs_to_coach is false for an org_event, even against its real author -- orgs are never a valid conversation coach_id'
);

-- ---------------------------------------------------------------------
-- A parent can message the real coach behind a guest_play/training post.
-- ---------------------------------------------------------------------
select lives_ok(
  $$ insert into public.conversations (parent_id, coach_id, feed_post_id)
     values ('00000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000082', '98000000-0000-0000-0000-000000000001') $$,
  'a parent can start a conversation with the guest_play post''s real coach author'
);

select lives_ok(
  $$ insert into public.conversations (parent_id, coach_id, feed_post_id)
     values ('00000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000083', '98000000-0000-0000-0000-000000000002') $$,
  'a parent can start a conversation with the training post''s real coach author'
);

select throws_ok(
  $$ insert into public.conversations (parent_id, coach_id, feed_post_id)
     values ('00000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000083', '98000000-0000-0000-0000-000000000001') $$,
  'new row violates row-level security policy for table "conversations"',
  'a parent cannot message a coach who is not the actual author of the feed post being claimed as context'
);

-- ---------------------------------------------------------------------
-- org_event stays fully unmessageable -- no coach_id can be paired with
-- it, since feed_post_belongs_to_coach never matches an org_event row,
-- and an organization itself can never be a conversation's coach_id at
-- all (is_verified_coach(org_id) is false for an organization profile).
-- ---------------------------------------------------------------------
select throws_ok(
  $$ insert into public.conversations (parent_id, coach_id, feed_post_id)
     values ('00000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000082', '98000000-0000-0000-0000-000000000003') $$,
  'new row violates row-level security policy for table "conversations"',
  'a parent cannot start a feed_post-context conversation against an org_event at all'
);

select throws_ok(
  $$ insert into public.conversations (parent_id, coach_id, feed_post_id)
     values ('00000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000084', '98000000-0000-0000-0000-000000000003') $$,
  'new row violates row-level security policy for table "conversations"',
  'an organization can never be a conversation''s coach_id, feed_post context or not'
);

-- ---------------------------------------------------------------------
-- Regression: the pre-existing player-context path (a coach messaging
-- the family behind a looking_for_team/guest_play post) still works
-- after the insert policy was dropped and recreated again.
-- ---------------------------------------------------------------------
select lives_ok(
  $$ insert into public.conversations (parent_id, coach_id, player_id)
     values ('00000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000082', '97000000-0000-0000-0000-000000000001') $$,
  'regression: the pre-existing player-context conversation path still works'
);

select is(
  (select count(*) from public.conversations where parent_id = '00000000-0000-0000-0000-000000000081')::int,
  3,
  'exactly the three successful conversations exist -- two feed_post-context, one player-context'
);

select * from finish();
rollback;
