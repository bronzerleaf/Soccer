begin;
select plan(4);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000101', 'parent-101@example.com'),
  ('00000000-0000-0000-0000-000000000102', 'trainer-102@example.com'),
  ('00000000-0000-0000-0000-000000000103', 'trainer-103@example.com');

update public.profiles set role = 'parent' where id = '00000000-0000-0000-0000-000000000101';
update public.profiles set role = 'trainer' where id in (
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000103'
);

insert into public.trainer_verifications (trainer_id, evidence, status)
values
  ('00000000-0000-0000-0000-000000000102', 'verified', 'approved'),
  ('00000000-0000-0000-0000-000000000103', 'verified', 'approved');

insert into public.cities (id, name, latitude, longitude)
values ('93000000-0000-0000-0000-000000000001', 'Test City', 32.9, -97.2);

insert into public.players (
  id, parent_id, first_name, last_initial, birth_year, positions, city,
  consent_completed, open_to_opportunities
) values (
  '93000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000101',
  'Test', 'P', 2015, array['CM'], 'Test City', true, false
);

insert into public.feed_posts (
  id, post_type, author_id, city_id, birth_year, positions, description, expires_at
) values (
  '93000000-0000-0000-0000-000000000003', 'training',
  '00000000-0000-0000-0000-000000000102',
  '93000000-0000-0000-0000-000000000001', 2015, array['CM'],
  'Training opportunity', now() + interval '7 days'
);

insert into public.opportunity_interests (
  id, player_id, parent_id, feed_post_id, note
) values (
  '93000000-0000-0000-0000-000000000004',
  '93000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000101',
  '93000000-0000-0000-0000-000000000003',
  'Interested in this session'
);

select is(
  public.professional_can_contact_interest(
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000101',
    '93000000-0000-0000-0000-000000000004'
  ),
  true,
  'the verified trainer who authored the post can contact an interested family'
);

select is(
  public.professional_can_contact_interest(
    '00000000-0000-0000-0000-000000000103',
    '00000000-0000-0000-0000-000000000101',
    '93000000-0000-0000-0000-000000000004'
  ),
  false,
  'another verified trainer cannot use somebody else''s interest context'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000102", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.conversations (
       id, parent_id, coach_id, opportunity_interest_id
     ) values (
       '93000000-0000-0000-0000-000000000005',
       '00000000-0000-0000-0000-000000000101',
       '00000000-0000-0000-0000-000000000102',
       '93000000-0000-0000-0000-000000000004'
     ) $$,
  'the opportunity author can start an adult conversation after explicit interest'
);

select is(
  (select count(*) from public.players where id = '93000000-0000-0000-0000-000000000002')::int,
  0,
  'interest-backed messaging does not make the player globally searchable to the trainer'
);

select * from finish();
rollback;