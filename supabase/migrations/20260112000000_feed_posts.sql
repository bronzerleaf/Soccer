-- Local Feed milestone 3 (CLAUDE.md section 9): feed_posts covers the
-- three post types that don't already have a home -- roster_spot is left
-- alone as today's public.roster_posts, unchanged, and gets folded into
-- the feed at the query layer in milestone 4 rather than duplicated into
-- this table. Migrating existing roster_posts rows/RLS/UI into a merged
-- table would be a much bigger, riskier change for no real benefit; two
-- tables behind one feed view is the boring choice here.
--
-- Identity-leak note: a feed_posts row's player_id is a plain UUID,
-- visible to anyone who can read the row (same as roster_posts.coach_id
-- today). That alone reveals nothing. Resolving it to an actual name
-- still requires a separate read of public.players, which stays gated by
-- that table's own RLS (open_to_opportunities + consent_completed +
-- verified coach) -- posting to the feed does not unlock a player row
-- that wasn't independently visible already. See
-- local_feed_posts_rls.sql for the assertion that proves it.

create type public.feed_post_type as enum ('looking_for_team', 'guest_play', 'org_event');

create table public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  post_type public.feed_post_type not null,
  author_id uuid not null references public.profiles (id) on delete cascade,
  city_id uuid not null references public.cities (id),
  player_id uuid references public.players (id) on delete cascade,
  birth_year integer check (birth_year is null or birth_year between 2000 and 2025),
  positions text[] not null default '{}',
  description text not null check (char_length(description) > 0),
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  constraint feed_posts_player_id_matches_type check (
    (post_type in ('looking_for_team', 'guest_play') and player_id is not null)
    or (post_type = 'org_event' and player_id is null)
  )
);

alter table public.feed_posts enable row level security;

create index feed_posts_city_id_idx on public.feed_posts (city_id);
create index feed_posts_author_id_idx on public.feed_posts (author_id);

create policy "feed_posts: any authenticated user reads active posts"
  on public.feed_posts for select
  to authenticated
  using (expires_at > now());

create policy "feed_posts: author reads own regardless of expiry"
  on public.feed_posts for select
  to authenticated
  using (author_id = auth.uid());

create policy "feed_posts: admins read all"
  on public.feed_posts for select
  to authenticated
  using (public.is_admin(auth.uid()));

-- Same "is this actually my player" EXISTS pattern as player_highlights: a
-- parent already has direct SELECT on their own player rows via
-- "players: parent selects own children", so this needs no security
-- definer wrapper. consent_completed = true is required -- a player isn't
-- "live" anywhere else on the platform until consent finishes, and the
-- feed doesn't get a carve-out from that.
create policy "feed_posts: parent posts about own consented player"
  on public.feed_posts for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and post_type in ('looking_for_team', 'guest_play')
    and exists (
      select 1 from public.players p
      where p.id = feed_posts.player_id
        and p.parent_id = auth.uid()
        and p.consent_completed = true
    )
  );

create policy "feed_posts: verified organization posts events"
  on public.feed_posts for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and post_type = 'org_event'
    and player_id is null
    and public.is_verified_organization(auth.uid())
  );

create policy "feed_posts: author updates own"
  on public.feed_posts for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "feed_posts: author deletes own"
  on public.feed_posts for delete
  to authenticated
  using (author_id = auth.uid());

create policy "feed_posts: admins manage all"
  on public.feed_posts for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- feed_post_likes -- scoped to feed_posts only, per CLAUDE.md section 9:
-- never a player profile, never a message.
-- ---------------------------------------------------------------------

create table public.feed_post_likes (
  post_id uuid not null references public.feed_posts (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

alter table public.feed_post_likes enable row level security;

create policy "feed_post_likes: any authenticated user reads"
  on public.feed_post_likes for select
  to authenticated
  using (true);

create policy "feed_post_likes: like an active post as yourself"
  on public.feed_post_likes for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.feed_posts fp
      where fp.id = feed_post_likes.post_id
        and fp.expires_at > now()
    )
  );

create policy "feed_post_likes: unlike your own"
  on public.feed_post_likes for delete
  to authenticated
  using (profile_id = auth.uid());
