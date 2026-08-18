-- Milestone 5: roster posts
--
-- A coach posts an open roster spot for a specific age group; any signed-
-- in adult can browse active posts. The trust boundary matters here too:
-- a coach may only post on behalf of the exact club their approved
-- coach_verifications claims — verification proves affiliation with one
-- club, not a blanket "trusted coach" badge good for posting anywhere.

create table public.roster_posts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  club_id uuid not null references public.clubs (id),
  birth_year integer not null check (birth_year between 2000 and 2025),
  positions text[] not null default '{}',
  tryout_date date,
  description text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint roster_posts_expires_after_creation check (expires_at > created_at)
);

alter table public.roster_posts enable row level security;

create index roster_posts_club_id_idx on public.roster_posts (club_id);
create index roster_posts_expires_at_idx on public.roster_posts (expires_at);
create index roster_posts_coach_id_idx on public.roster_posts (coach_id);

-- Browsing: any signed-in adult (parent or coach) sees active posts —
-- this is the "parent sees the roster post and reaches out" half of the
-- core loop, and it isn't player data, so it doesn't need the
-- verified-coach gate that guards the player pool.
create policy "roster_posts: any authenticated user reads active posts"
  on public.roster_posts for select
  to authenticated
  using (expires_at > now());

-- A coach managing their own posting needs to see it even after it
-- expires (to review, or delete it outright).
create policy "roster_posts: coach reads own regardless of expiry"
  on public.roster_posts for select
  to authenticated
  using (coach_id = auth.uid());

create policy "roster_posts: admins read all"
  on public.roster_posts for select
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "roster_posts: verified coach posts for their own club"
  on public.roster_posts for insert
  to authenticated
  with check (
    coach_id = auth.uid()
    and exists (
      select 1 from public.coach_verifications cv
      where cv.coach_id = auth.uid()
        and cv.status = 'approved'
        and cv.claimed_club_id = roster_posts.club_id
    )
  );

-- Same club-affiliation check as the insert policy: without it, a coach
-- could post legitimately for their own club, then UPDATE club_id to a
-- club they were never verified for.
create policy "roster_posts: coach updates own"
  on public.roster_posts for update
  to authenticated
  using (coach_id = auth.uid())
  with check (
    coach_id = auth.uid()
    and exists (
      select 1 from public.coach_verifications cv
      where cv.coach_id = auth.uid()
        and cv.status = 'approved'
        and cv.claimed_club_id = roster_posts.club_id
    )
  );

create policy "roster_posts: coach deletes own"
  on public.roster_posts for delete
  to authenticated
  using (coach_id = auth.uid());

create policy "roster_posts: admins manage all"
  on public.roster_posts for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
