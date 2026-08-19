-- Two additions, both scoped to stay inside CLAUDE.md's existing rules:
--
-- 1. roster_post_likes -- brings roster spots to parity with feed_posts,
--    which already support likes (migration 12). Mirrors
--    feed_post_likes exactly.
--
-- 2. player_interest -- lets a verified coach mark interest in a player
--    profile they can already see (same open_to_opportunities +
--    consent_completed + verified-coach gate search already uses), and
--    lets that player's own parent see who's shown interest. Nothing
--    here is called a "like" or shown with a heart icon on purpose:
--    CLAUDE.md section 7 explicitly warns against anything that reads as
--    a dating-app mechanic, and an adult marking interest in a child's
--    profile is exactly that pattern if it's dressed up that way. The
--    visibility is deliberately narrow -- readable by the liking coach
--    (their own row) and the player's own parent (every row on their
--    own player), never by another coach or another parent. This is not
--    a new exposure: a coach who can insert a row here could already see
--    this exact player through search, and a parent who can read it
--    could already see their own player's full profile.

create table public.roster_post_likes (
  post_id uuid not null references public.roster_posts (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

alter table public.roster_post_likes enable row level security;

create policy "roster_post_likes: any authenticated user reads"
  on public.roster_post_likes for select
  to authenticated
  using (true);

create policy "roster_post_likes: like an active post as yourself"
  on public.roster_post_likes for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.roster_posts rp
      where rp.id = roster_post_likes.post_id
        and rp.expires_at > now()
    )
  );

create policy "roster_post_likes: unlike your own"
  on public.roster_post_likes for delete
  to authenticated
  using (profile_id = auth.uid());

create table public.player_interest (
  player_id uuid not null references public.players (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (player_id, coach_id)
);

alter table public.player_interest enable row level security;

-- A coach already has direct SELECT on exactly these player rows via
-- "players: verified coaches read open, consented players" -- same
-- established pattern player_highlights uses (no security definer
-- wrapper needed, since the EXISTS subquery is evaluated under the
-- inserting coach's own RLS-restricted view of players, which only ever
-- includes rows they're already allowed to see).
create policy "player_interest: verified coach marks interest"
  on public.player_interest for insert
  to authenticated
  with check (
    coach_id = auth.uid()
    and public.is_verified_coach(auth.uid())
    and exists (
      select 1 from public.players p
      where p.id = player_interest.player_id
        and p.open_to_opportunities = true
        and p.consent_completed = true
    )
  );

-- The liking coach reads their own row (to know if they've already
-- marked interest); the player's own parent reads every row on their
-- own player (to see who's interested). Nobody else -- not another
-- coach, not another parent -- can read any of this.
create policy "player_interest: coach reads own"
  on public.player_interest for select
  to authenticated
  using (coach_id = auth.uid());

create policy "player_interest: parent reads own player's interest"
  on public.player_interest for select
  to authenticated
  using (
    exists (
      select 1 from public.players p
      where p.id = player_interest.player_id
        and p.parent_id = auth.uid()
    )
  );

create policy "player_interest: coach removes own"
  on public.player_interest for delete
  to authenticated
  using (coach_id = auth.uid());
