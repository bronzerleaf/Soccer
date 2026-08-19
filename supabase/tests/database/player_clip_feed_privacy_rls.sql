begin;
select plan(4);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'parent-f1@example.com'),
  ('00000000-0000-0000-0000-0000000000f2', 'trainer-f2@example.com');

update public.profiles set role = 'parent' where id = '00000000-0000-0000-0000-0000000000f1';
update public.profiles set role = 'trainer' where id = '00000000-0000-0000-0000-0000000000f2';

insert into public.players (
  id, parent_id, first_name, last_initial, birth_year, positions, city,
  consent_completed, open_to_opportunities
) values (
  '92000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-0000000000f1',
  'Test', 'P', 2015, array['CAM'], 'Roanoke', true, false
);

insert into public.player_highlights (
  id, player_id, url, caption, theme, show_in_feed
) values (
  '92000000-0000-0000-0000-000000000002',
  '92000000-0000-0000-0000-000000000001',
  'https://example.com/clip', 'Passing clip', 'skills', false
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f2", "role": "authenticated"}';

select is(
  (select count(*) from public.players where id = '92000000-0000-0000-0000-000000000001')::int,
  0,
  'a trainer cannot read the underlying non-searchable player profile'
);

select is(
  (select count(*) from public.get_feed_clips(30) where highlight_id = '92000000-0000-0000-0000-000000000002')::int,
  0,
  'a profile-only clip does not appear in the feed RPC'
);

reset role;
update public.player_highlights
set show_in_feed = true
where id = '92000000-0000-0000-0000-000000000002';

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f2", "role": "authenticated"}';

select is(
  (select count(*) from public.get_feed_clips(30) where highlight_id = '92000000-0000-0000-0000-000000000002')::int,
  1,
  'an explicitly feed-published clip appears in the social feed'
);

select is(
  (select count(*) from public.players where id = '92000000-0000-0000-0000-000000000001')::int,
  0,
  'publishing a clip does not unlock the full player profile'
);

select * from finish();
rollback;