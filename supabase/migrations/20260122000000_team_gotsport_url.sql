-- Team-level canonical GotSport link (PLAYER_AND_TEAM_MODEL.md's "best
-- model: team-level canonical external link"). Same external-link-only
-- philosophy as everything else on this platform -- store the URL,
-- render a click-through, never scrape or import GotSport data.
--
-- Unlike players, teams has no column-level UPDATE grant lockdown (its
-- only write path is "teams: verified owner updates own team", a plain
-- RLS policy with no self-approval risk to guard against) -- so this
-- needs no additive grant statement, just the column.

alter table public.teams
  add column gotsport_url text;
