-- Local Feed follow-up: a verified coach can now post two more things to
-- the feed alongside roster spots (which stay in public.roster_posts,
-- unchanged) -- "need a guest player" (the mirror image of a parent's
-- guest_play post: no player attached, since it's the coach's team
-- asking, not a family offering one) and "training" (a club-run training
-- session or clinic, with an optional cost and duration).
--
-- Scope note, because CLAUDE.md section 3 explicitly rules out a
-- "trainer marketplace" and "in-app payments to trainers": this is
-- neither. There is no trainer discovery, no trainer profile, no
-- independent-contractor listing, and no payment processing anywhere in
-- this migration -- cost_cents is a plain informational number shown on
-- the card, the same as a roster post's tryout date or an org_event's
-- description already tell a family when/where/how to show up. Payment,
-- like a tryout, happens off-platform. This is a verified coach posting
-- on behalf of their own club, gated the same way a roster spot already
-- is -- not a marketplace matching independent trainers to families.

alter table public.feed_posts
  add column cost_cents integer check (cost_cents is null or cost_cents >= 0),
  add column duration_minutes integer check (duration_minutes is null or duration_minutes > 0);

-- cost/duration only ever mean something on a training post -- guard
-- against them being set (accidentally or otherwise) on any other type,
-- the same spirit as the existing player_id-matches-type constraint below.
alter table public.feed_posts
  add constraint feed_posts_cost_duration_only_for_training check (
    post_type = 'training' or (cost_cents is null and duration_minutes is null)
  );

-- Widen the existing player_id-matches-type constraint: guest_play no
-- longer always carries a player -- a parent's guest_play still requires
-- one (enforced by that role's own insert policy below, unchanged), but
-- a coach's "need a guest" post never has one. training/org_event never
-- carry a player either way.
alter table public.feed_posts drop constraint feed_posts_player_id_matches_type;
alter table public.feed_posts add constraint feed_posts_player_id_matches_type check (
  (post_type = 'looking_for_team' and player_id is not null)
  or (post_type = 'guest_play')
  or (post_type in ('org_event', 'training') and player_id is null)
);

-- A verified coach posting that their own team needs a guest player --
-- the mirror of a parent's "my player is available to guest", but
-- nothing about it is player-specific, so player_id must stay null
-- (a coach has no player of their own to attach).
create policy "feed_posts: verified coach posts guest player needed"
  on public.feed_posts for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and post_type = 'guest_play'
    and player_id is null
    and public.is_verified_coach(auth.uid())
  );

create policy "feed_posts: verified coach posts training or event"
  on public.feed_posts for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and post_type = 'training'
    and player_id is null
    and public.is_verified_coach(auth.uid())
  );
