-- RLS coverage for feed_posts.post_type = 'highlight' (migrations
-- 20260124000000/000001): a parent can cross-post a clip that's really
-- their own consented player's, never someone else's player or someone
-- else's highlight, and the type/id-matching CHECK constraints hold.

begin;
select plan(7);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'parent-hl1@example.com'),
  ('00000000-0000-0000-0000-0000000000f2', 'parent-hl2@example.com');

insert into public.cities (id, name, latitude, longitude) values
  ('84000000-0000-0000-0000-000000000001', 'Test City HL', 33.0, -96.0);

insert into public.players
  (id, parent_id, first_name, last_initial, birth_year, city, open_to_opportunities, consent_completed)
values
  ('85000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f1', 'Nia', 'C', 2013, 'Test City HL', false, true),
  ('85000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000f2', 'Zoe', 'D', 2013, 'Test City HL', false, false);

insert into public.player_highlights (id, player_id, url, caption, theme) values
  ('86000000-0000-0000-0000-000000000001', '85000000-0000-0000-0000-000000000001', 'https://youtube.com/watch?v=abc', 'Great through ball', 'assist'),
  ('86000000-0000-0000-0000-000000000002', '85000000-0000-0000-0000-000000000002', 'https://youtube.com/watch?v=def', 'Not mine', 'goal');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.feed_posts (id, post_type, author_id, city_id, player_id, highlight_id, description)
     values ('87000000-0000-0000-0000-000000000001', 'highlight', '00000000-0000-0000-0000-0000000000f1',
             '84000000-0000-0000-0000-000000000001', '85000000-0000-0000-0000-000000000001',
             '86000000-0000-0000-0000-000000000001', 'Great through ball') $$,
  'a parent can cross-post their own consented player''s own highlight'
);

select throws_ok(
  $$ insert into public.feed_posts (post_type, author_id, city_id, player_id, highlight_id, description)
     values ('highlight', '00000000-0000-0000-0000-0000000000f1',
             '84000000-0000-0000-0000-000000000001', '85000000-0000-0000-0000-000000000002',
             '86000000-0000-0000-0000-000000000002', 'Not mine') $$,
  'new row violates row-level security policy for table "feed_posts"',
  'a parent cannot cross-post another family''s player + highlight'
);

select throws_ok(
  $$ insert into public.feed_posts (post_type, author_id, city_id, player_id, highlight_id, description)
     values ('highlight', '00000000-0000-0000-0000-0000000000f1',
             '84000000-0000-0000-0000-000000000001', '85000000-0000-0000-0000-000000000001',
             '86000000-0000-0000-0000-000000000002', 'Mismatched highlight') $$,
  'new row violates row-level security policy for table "feed_posts"',
  'a parent cannot attach a highlight that belongs to a different player, even their own post'
);

select throws_ok(
  $$ insert into public.feed_posts (post_type, author_id, city_id, player_id, highlight_id, description)
     values ('looking_for_team', '00000000-0000-0000-0000-0000000000f1',
             '84000000-0000-0000-0000-000000000001', '85000000-0000-0000-0000-000000000001',
             '86000000-0000-0000-0000-000000000001', 'Sneaking a highlight id in') $$,
  'new row for relation "feed_posts" violates check constraint "feed_posts_highlight_id_matches_type"',
  'a non-highlight post_type cannot carry a highlight_id'
);

select throws_ok(
  $$ insert into public.feed_posts (post_type, author_id, city_id, player_id, description)
     values ('highlight', '00000000-0000-0000-0000-0000000000f1',
             '84000000-0000-0000-0000-000000000001', '85000000-0000-0000-0000-000000000001', 'No highlight attached') $$,
  'new row for relation "feed_posts" violates check constraint "feed_posts_highlight_id_matches_type"',
  'a highlight post_type requires a highlight_id'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f2", "role": "authenticated"}';

select is(
  (select count(*) from public.feed_posts where id = '87000000-0000-0000-0000-000000000001')::int,
  1,
  'any authenticated user can read an active highlight post, same as every other feed post kind'
);

reset role;

select is(
  (select first_name from public.players where id = (select player_id from public.feed_posts where id = '87000000-0000-0000-0000-000000000001')),
  'Nia',
  'sanity: the cross-posted highlight really points back at the right player'
);

select * from finish();
rollback;
