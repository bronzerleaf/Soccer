-- Roster posts and feed posts (training/guest_play/org_event) were
-- burying "when, where, and how do I sign up" inside free-text
-- description prose -- a family had to read a paragraph to find a time.
-- This adds structured fields so a card can show them at a glance, plus
-- an optional link-out to wherever the poster actually collects RSVPs
-- (a club's GotSport tryout page, a Google Form, whatever they already
-- use). Same platform philosophy as every other link on this app: store
-- the URL, render a click-through, never host or process the sign-up
-- itself.
--
-- No new RLS surface on either table: these are more nullable columns
-- on an already-visible row, covered by the exact same insert/update
-- policies every other field on these tables already has. Neither table
-- restricts UPDATE to a column allowlist the way `players` does, so no
-- grant changes are needed either -- unlike the instagram_url/youtube_url
-- migration, there's nothing else to add here.

alter table public.roster_posts
  add column tryout_time time,
  add column location text,
  add column signup_url text;

-- Nullable and unconstrained by post_type on purpose: a training or
-- org_event listing is the obvious case, but nothing about "when/where/
-- how to sign up" is exclusive to those two, and a CHECK constraint here
-- would just be one more thing to widen the next time a post type wants
-- to use it. The UI decides which composer forms surface these fields.
alter table public.feed_posts
  add column event_date date,
  add column event_time time,
  add column location text,
  add column signup_url text;
