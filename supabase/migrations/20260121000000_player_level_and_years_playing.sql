-- Two more player attributes surfaced by the design handoff's player
-- model (PLAYER_AND_TEAM_MODEL.md): years_playing and a standardized
-- player_level. positions stays a text[] -- primary/secondary is just
-- index 0/1 in the UI now, no schema change needed for that part.

create type public.player_level as enum (
  'recreational',
  'academy',
  'competitive_select',
  'pre_ecnl',
  'ecnl_rl',
  'ecnl',
  'mls_next',
  'girls_academy',
  'other'
);

alter table public.players
  add column years_playing integer check (years_playing between 0 and 20),
  add column player_level public.player_level;

-- Same additive column-grant pattern as every prior parent-writable
-- field (migration 2, 13, 18): UPDATE on players is column-listed, not
-- table-wide, so a new writable field has to be granted explicitly.
grant update (years_playing, player_level) on public.players to authenticated;
