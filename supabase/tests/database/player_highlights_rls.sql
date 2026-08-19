-- RLS proof for public.player_highlights (migration 9): a parent has full
-- control over their own children's highlights and nobody else's; a
-- verified coach can only read highlights belonging to a player who is
-- open_to_opportunities + consent_completed, exactly mirroring player-row
-- and photo visibility; an unverified coach reads nothing.

begin;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'parent-e1@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'parent-e2@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'coach-pending3@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'coach-approved3@example.com');

update public.profiles set role = 'coach' where id in (
  '00000000-0000-0000-0000-0000000000e3',
  '00000000-0000-0000-0000-0000000000e4'
);

insert into public.coach_verifications (coach_id, status) values
  ('00000000-0000-0000-0000-0000000000e3', 'pending'),
  ('00000000-0000-0000-0000-0000000000e4', 'approved');

-- Parent e1: one open+consented child, one still consent-gated.
-- Parent e2: one open+consented child.
insert into public.players
  (id, parent_id, first_name, last_initial, birth_year, city, open_to_opportunities, consent_completed)
values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000e1', 'Nora', 'K', 2012, 'Frisco', true, true),
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000e1', 'Owen', 'K', 2015, 'Frisco', false, false),
  ('60000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000e2', 'Priya', 'M', 2013, 'Plano', true, true);

insert into public.player_highlights (id, player_id, url, caption, theme) values
  ('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'https://hudl.com/nora', 'Winning goal vs Frisco FC', 'goal'),
  ('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', 'https://hudl.com/owen', 'Full match reel', 'full_match'),
  ('70000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000003', 'https://hudl.com/priya', 'Season assists', 'assist');

-- ---------------------------------------------------------------------
-- Parent e1: full CRUD on their own two children's highlights, nothing
-- belonging to parent e2.
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated"}';

select is(
  (select count(*) from public.player_highlights)::int,
  2,
  'parent e1 reads exactly their own two children''s highlights'
);

select lives_ok(
  $$ insert into public.player_highlights (id, player_id, url, caption, theme)
     values ('70000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000001', 'https://veo.co/nora-2', 'Defensive clearance', 'defense') $$,
  'parent e1 can add a highlight to their own child'
);

select throws_ok(
  $$ insert into public.player_highlights (player_id, url)
     values ('60000000-0000-0000-0000-000000000003', 'https://hudl.com/hijack') $$,
  'new row violates row-level security policy for table "player_highlights"',
  'parent e1 cannot add a highlight to parent e2''s child'
);

with attempted as (
  delete from public.player_highlights
  where id = '70000000-0000-0000-0000-000000000003'
  returning 1
)
select is(
  (select count(*) from attempted)::int,
  0,
  'parent e1 cannot delete parent e2''s highlight'
);

select lives_ok(
  $$ delete from public.player_highlights where id = '70000000-0000-0000-0000-000000000004' $$,
  'parent e1 can delete their own child''s highlight'
);

-- ---------------------------------------------------------------------
-- Pending coach: zero visibility, same as the players table itself.
-- ---------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000e3", "role": "authenticated"}';

select is(
  (select count(*) from public.player_highlights)::int,
  0,
  'pending coach reads zero highlights'
);

-- ---------------------------------------------------------------------
-- Approved coach: read-only, and only for open + consented players.
-- ---------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000e4", "role": "authenticated"}';

select is(
  (select count(*) from public.player_highlights)::int,
  2,
  'approved coach reads highlights only for open + consented players (Nora + Priya)'
);

select is(
  (select count(*) from public.player_highlights where player_id = '60000000-0000-0000-0000-000000000002')::int,
  0,
  'approved coach never sees the consent-gated child''s highlight, even though it still exists'
);

with attempted as (
  delete from public.player_highlights
  where id = '70000000-0000-0000-0000-000000000001'
  returning 1
)
select is(
  (select count(*) from attempted)::int,
  0,
  'approved coach has no write access — cannot delete a highlight it can read'
);

select * from finish();
rollback;
