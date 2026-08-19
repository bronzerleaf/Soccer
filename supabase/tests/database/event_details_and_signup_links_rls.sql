-- Coverage for migration 20 (tryout_time/location/signup_url on
-- roster_posts; event_date/event_time/location/signup_url on
-- feed_posts): no new RLS surface, but proves a coach and a parent can
-- actually set these fields through the existing insert/update
-- policies, not just that a column exists.

begin;
select plan(4);

insert into public.clubs (id, name, city) values
  ('61000000-0000-0000-0000-000000000001', 'Event Fields Test Club', 'Dallas');

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000091', 'coach-ev1@example.com'),
  ('00000000-0000-0000-0000-000000000092', 'parent-ev1@example.com');

update public.profiles set role = 'coach' where id = '00000000-0000-0000-0000-000000000091';

insert into public.coach_verifications (coach_id, claimed_club_id, status) values
  ('00000000-0000-0000-0000-000000000091', '61000000-0000-0000-0000-000000000001', 'approved');

insert into public.cities (id, name, latitude, longitude) values
  ('61000000-0000-0000-0000-000000000002', 'Event Fields Test City', 32.7, -96.8)
on conflict (id) do nothing;

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000091", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.roster_posts
       (coach_id, club_id, birth_year, description, expires_at, tryout_time, location, signup_url)
     values ('00000000-0000-0000-0000-000000000091', '61000000-0000-0000-0000-000000000001',
             2014, 'Need a keeper', now() + interval '30 days', '18:00', 'Toyota Soccer Center, Field 3',
             'https://forms.example.com/tryout-signup') $$,
  'a verified coach can set tryout_time/location/signup_url when posting a roster spot'
);

select is(
  (select location from public.roster_posts where coach_id = '00000000-0000-0000-0000-000000000091'),
  'Toyota Soccer Center, Field 3',
  'the roster post location is actually stored'
);

insert into public.feed_posts (id, post_type, author_id, city_id, description, event_date, event_time, location, signup_url) values
  ('62000000-0000-0000-0000-000000000001', 'training', '00000000-0000-0000-0000-000000000091',
   '61000000-0000-0000-0000-000000000002', 'Finishing clinic', '2026-09-20', '17:30',
   'Fields at Toyota Stadium', 'https://forms.example.com/clinic-signup');

select is(
  (select signup_url from public.feed_posts where id = '62000000-0000-0000-0000-000000000001'),
  'https://forms.example.com/clinic-signup',
  'a verified coach can set a sign-up link on a training feed post'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000092", "role": "authenticated"}';

select is(
  (select event_date from public.feed_posts where id = '62000000-0000-0000-0000-000000000001')::text,
  '2026-09-20',
  'a different authenticated user (parent) still reads the same event fields on an active post, same as every other field'
);

select * from finish();
rollback;
