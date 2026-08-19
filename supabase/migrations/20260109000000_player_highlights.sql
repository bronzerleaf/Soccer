-- Replaces players.video_links (a bare text[] of URLs, no way to say what
-- a clip actually shows) with public.player_highlights: one row per link,
-- carrying an optional parent-written caption and an optional theme tag
-- (goal/assist/defense/offense/skills/full match) so the gallery on a
-- player's profile can show more than a wall of identical link icons.
--
-- Still never hosts anything — url stays a plain link-out, same as before.
-- No production data exists yet (this app has never been deployed against
-- a real Supabase project), so the old column is dropped outright rather
-- than kept around or backfilled.

create type public.highlight_theme as enum (
  'goal', 'assist', 'defense', 'offense', 'skills', 'full_match'
);

create table public.player_highlights (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  url text not null check (char_length(url) > 0),
  caption text check (caption is null or char_length(caption) <= 200),
  theme public.highlight_theme,
  created_at timestamptz not null default now()
);

alter table public.player_highlights enable row level security;

create index player_highlights_player_id_idx on public.player_highlights (player_id);

-- A parent already has direct SELECT (and, per migration 2, scoped UPDATE)
-- on their own player row via "players: parent selects own children" /
-- "players: parent updates own children" — so checking "is this my
-- player" here with a plain EXISTS is exactly the access their own RLS
-- already grants them, same reasoning as the message_flags policy in
-- migration 8. No security definer wrapper needed.
create policy "player_highlights: parent manages own children's highlights"
  on public.player_highlights for all
  to authenticated
  using (
    exists (
      select 1 from public.players p
      where p.id = player_highlights.player_id
        and p.parent_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.players p
      where p.id = player_highlights.player_id
        and p.parent_id = auth.uid()
    )
  );

-- Mirrors "player-photos: verified coaches read visible players' photos"
-- from migration 5 exactly: same open_to_opportunities + consent_completed
-- + is_verified_coach check, plain EXISTS (a verified coach already has
-- direct SELECT on exactly these player rows via "players: verified
-- coaches read open, consented players").
create policy "player_highlights: verified coaches read visible players' highlights"
  on public.player_highlights for select
  to authenticated
  using (
    exists (
      select 1 from public.players p
      where p.id = player_highlights.player_id
        and p.open_to_opportunities = true
        and p.consent_completed = true
        and public.is_verified_coach(auth.uid())
    )
  );

alter table public.players drop column video_links;
