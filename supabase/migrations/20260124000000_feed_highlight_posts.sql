-- A parent can already add a highlight clip to their player's profile
-- (player_highlights, migration 9). This adds the option to also show
-- that same clip in the local feed -- opt-in per clip, not automatic.
-- Reuses the existing highlight row rather than duplicating url/caption/
-- theme onto feed_posts, so there's exactly one place that data lives.
--
-- Visibility note: unlike looking_for_team/guest_play (deliberately no
-- name/photo in the card -- CLAUDE.md section 9), a highlight post shows
-- first name + last initial, same minimal disclosure already used
-- everywhere else a player is visible (search results, team rosters,
-- the player profile itself) -- not a new exposure, just the existing
-- one appearing in one more place the parent explicitly opted into.
-- Still gated on consent_completed, same as every other player-data
-- write path in this app.

alter type public.feed_post_type add value 'highlight';
