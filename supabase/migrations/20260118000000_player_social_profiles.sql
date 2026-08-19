-- Two more profile-level link-out fields, alongside the existing
-- player_highlights list: a parent can add their player's Instagram and
-- YouTube profile URLs, shown near the top of the profile. Same
-- philosophy as every other link on this platform -- store the URL,
-- render a click-through, never fetch, embed, or host the destination
-- content ("We do not host video. Ever.").
--
-- No new RLS surface: these are two more columns on players, covered by
-- the exact same visibility every other profile field already has --
-- full read/write for the owning parent, read-only for a verified coach
-- once the player is open_to_opportunities + consent_completed. Nothing
-- here changes who can see a player row, only what one more field on an
-- already-visible row contains.
--
-- Scope note: this is an account-level link (a coach can browse
-- everything on that profile, not just a parent-curated clip), which is
-- a materially larger surface than one highlight video -- particularly
-- for Instagram, where a personal account can reveal school, location,
-- and social circle well beyond soccer. The UI nudges toward a
-- recruiting/highlights-focused account rather than hard-blocking a
-- personal one, since that's already common practice in youth sports
-- and the app has no way to tell the two apart technically anyway.

alter table public.players
  add column instagram_url text,
  add column youtube_url text;

-- UPDATE on players is column-listed, not table-wide (locked down in
-- migration 2 so consent_completed couldn't be set directly) -- every
-- new parent-writable field has to be added to that grantable set
-- explicitly, same as team_id was in migration 13. Without this, a
-- parent's own RLS policy would still say yes, but the column-privilege
-- check underneath it would reject the update anyway.
grant update (instagram_url, youtube_url) on public.players to authenticated;
