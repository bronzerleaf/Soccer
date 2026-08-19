-- PitchLink discovery/social refinement.
--
-- 1) Keep player discoverability private: the existing
--    players.open_to_opportunities flag remains the database search gate,
--    but the UI now presents it as a private "Allow verified professionals
--    to find this profile" setting rather than broadcasting availability.
-- 2) Add soccer-focused profile fields (experience + level of play).
-- 3) Let a parent choose whether each linked clip is profile-only or also
--    shown in the authenticated feed, with likes/comments on feed clips.
-- 4) Add verified trainer accounts for training/event posts.
-- 5) Let parents explicitly show interest in roster/feed opportunities.
-- 6) Store user-entered GotSport team identifiers/links only. No scraping,
--    copying, embedding, or automated ingestion of GotSport content.

-- ---------------------------------------------------------------------
-- Player profile fields
-- ---------------------------------------------------------------------

alter table public.players
  add column years_experience smallint
    check (years_experience is null or years_experience between 0 and 18),
  add column level_of_play text
    check (
      level_of_play is null or level_of_play in (
        'recreational', 'academy', 'competitive', 'select', 'pre_ecnl',
        'ecnl_rl', 'ecnl', 'mls_next', 'girls_academy', 'other'
      )
    );

grant update (years_experience, level_of_play) on public.players to authenticated;

-- ---------------------------------------------------------------------
-- GotSport references on PitchLink teams
-- ---------------------------------------------------------------------

alter table public.teams
  add column gotsport_team_id text,
  add column gotsport_url text
    check (gotsport_url is null or gotsport_url ~ '^https://');

create unique index teams_gotsport_team_id_unique
  on public.teams (gotsport_team_id)
  where gotsport_team_id is not null;

-- ---------------------------------------------------------------------
-- Clip visibility + engagement
-- ---------------------------------------------------------------------

alter table public.player_highlights
  add column show_in_feed boolean not null default false;

-- A parent explicitly choosing feed visibility is a separate disclosure
-- from making the whole player profile searchable. Any authenticated adult
-- account may see the clip row while it is feed-visible, but reading the
-- player's full profile still goes through the players table's own RLS.
create policy "player_highlights: authenticated users read feed clips"
  on public.player_highlights for select
  to authenticated
  using (
    show_in_feed = true
    and exists (
      select 1 from public.players p
      where p.id = player_highlights.player_id
        and p.consent_completed = true
    )
  );

create table public.player_highlight_likes (
  highlight_id uuid not null references public.player_highlights (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (highlight_id, profile_id)
);

alter table public.player_highlight_likes enable row level security;

create policy "player_highlight_likes: authenticated users read"
  on public.player_highlight_likes for select
  to authenticated
  using (true);

create policy "player_highlight_likes: like visible feed clip"
  on public.player_highlight_likes for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and exists (
      select 1
      from public.player_highlights h
      join public.players p on p.id = h.player_id
      where h.id = player_highlight_likes.highlight_id
        and h.show_in_feed = true
        and p.consent_completed = true
    )
  );

create policy "player_highlight_likes: unlike own"
  on public.player_highlight_likes for delete
  to authenticated
  using (profile_id = auth.uid());

create table public.player_highlight_comments (
  id uuid primary key default gen_random_uuid(),
  highlight_id uuid not null references public.player_highlights (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table public.player_highlight_comments enable row level security;
create index player_highlight_comments_highlight_idx
  on public.player_highlight_comments (highlight_id, created_at);

create policy "player_highlight_comments: authenticated users read feed clip comments"
  on public.player_highlight_comments for select
  to authenticated
  using (
    exists (
      select 1
      from public.player_highlights h
      join public.players p on p.id = h.player_id
      where h.id = player_highlight_comments.highlight_id
        and h.show_in_feed = true
        and p.consent_completed = true
    )
  );

create policy "player_highlight_comments: comment on feed clip"
  on public.player_highlight_comments for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1
      from public.player_highlights h
      join public.players p on p.id = h.player_id
      where h.id = player_highlight_comments.highlight_id
        and h.show_in_feed = true
        and p.consent_completed = true
    )
  );

create policy "player_highlight_comments: author deletes own"
  on public.player_highlight_comments for delete
  to authenticated
  using (author_id = auth.uid());

-- A parent can moderate comments on a clip belonging to their own child.
create policy "player_highlight_comments: parent moderates own child clip"
  on public.player_highlight_comments for delete
  to authenticated
  using (
    exists (
      select 1
      from public.player_highlights h
      join public.players p on p.id = h.player_id
      where h.id = player_highlight_comments.highlight_id
        and p.parent_id = auth.uid()
    )
  );

create policy "player_highlight_comments: admins manage"
  on public.player_highlight_comments for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- Trainer verification
-- ---------------------------------------------------------------------

create table public.trainer_verifications (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  business_name text,
  evidence text not null,
  status public.verification_status not null default 'pending',
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.trainer_verifications enable row level security;
create index trainer_verifications_trainer_idx on public.trainer_verifications (trainer_id);

create policy "trainer_verifications: trainer reads own"
  on public.trainer_verifications for select
  to authenticated
  using (trainer_id = auth.uid());

create policy "trainer_verifications: trainer submits own"
  on public.trainer_verifications for insert
  to authenticated
  with check (
    trainer_id = auth.uid()
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'trainer'
    )
  );

create policy "trainer_verifications: admins read all"
  on public.trainer_verifications for select
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "trainer_verifications: admins review"
  on public.trainer_verifications for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create function public.is_verified_trainer(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.trainer_verifications tv
    where tv.trainer_id = check_user_id and tv.status = 'approved'
  );
$$;

grant execute on function public.is_verified_trainer(uuid) to authenticated;

-- Trainers may publish training/event opportunities after verification.
create policy "feed_posts: verified trainer posts training"
  on public.feed_posts for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and post_type = 'training'
    and player_id is null
    and public.is_verified_trainer(auth.uid())
  );

-- ---------------------------------------------------------------------
-- Parent interest in opportunities
-- ---------------------------------------------------------------------

create table public.opportunity_interests (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  parent_id uuid not null references public.profiles (id) on delete cascade,
  roster_post_id uuid references public.roster_posts (id) on delete cascade,
  feed_post_id uuid references public.feed_posts (id) on delete cascade,
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  constraint opportunity_interests_one_target check (
    (roster_post_id is not null and feed_post_id is null)
    or (roster_post_id is null and feed_post_id is not null)
  )
);

alter table public.opportunity_interests enable row level security;

create unique index opportunity_interests_roster_unique
  on public.opportunity_interests (player_id, roster_post_id)
  where roster_post_id is not null;
create unique index opportunity_interests_feed_unique
  on public.opportunity_interests (player_id, feed_post_id)
  where feed_post_id is not null;

create policy "opportunity_interests: parent reads own"
  on public.opportunity_interests for select
  to authenticated
  using (parent_id = auth.uid());

create policy "opportunity_interests: target author reads"
  on public.opportunity_interests for select
  to authenticated
  using (
    exists (
      select 1 from public.roster_posts rp
      where rp.id = opportunity_interests.roster_post_id
        and rp.coach_id = auth.uid()
    )
    or exists (
      select 1 from public.feed_posts fp
      where fp.id = opportunity_interests.feed_post_id
        and fp.author_id = auth.uid()
    )
  );

create policy "opportunity_interests: parent creates for own consented player"
  on public.opportunity_interests for insert
  to authenticated
  with check (
    parent_id = auth.uid()
    and exists (
      select 1 from public.players p
      where p.id = opportunity_interests.player_id
        and p.parent_id = auth.uid()
        and p.consent_completed = true
    )
    and (
      exists (
        select 1 from public.roster_posts rp
        where rp.id = opportunity_interests.roster_post_id
          and rp.expires_at > now()
      )
      or exists (
        select 1 from public.feed_posts fp
        where fp.id = opportunity_interests.feed_post_id
          and fp.expires_at > now()
      )
    )
  );

create policy "opportunity_interests: parent removes own"
  on public.opportunity_interests for delete
  to authenticated
  using (parent_id = auth.uid());

-- A post author can inspect only players who deliberately expressed
-- interest in that exact post. This does not make those players globally
-- searchable and does not change the player's normal RLS visibility.
create function public.get_opportunity_interested_players(
  target_kind text,
  target_id uuid
)
returns table (
  interest_id uuid,
  player_id uuid,
  first_name text,
  last_initial text,
  birth_year integer,
  positions text[],
  years_experience smallint,
  level_of_play text,
  note text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if target_kind = 'roster' then
    if not exists (
      select 1 from public.roster_posts rp
      where rp.id = target_id and rp.coach_id = auth.uid()
    ) then
      raise exception 'not authorized to view interest for this post';
    end if;

    return query
      select oi.id, p.id, p.first_name, p.last_initial, p.birth_year,
             p.positions, p.years_experience, p.level_of_play, oi.note,
             oi.created_at
      from public.opportunity_interests oi
      join public.players p on p.id = oi.player_id
      where oi.roster_post_id = target_id
      order by oi.created_at desc;
  elsif target_kind = 'feed' then
    if not exists (
      select 1 from public.feed_posts fp
      where fp.id = target_id and fp.author_id = auth.uid()
    ) then
      raise exception 'not authorized to view interest for this post';
    end if;

    return query
      select oi.id, p.id, p.first_name, p.last_initial, p.birth_year,
             p.positions, p.years_experience, p.level_of_play, oi.note,
             oi.created_at
      from public.opportunity_interests oi
      join public.players p on p.id = oi.player_id
      where oi.feed_post_id = target_id
      order by oi.created_at desc;
  else
    raise exception 'unknown opportunity kind';
  end if;
end;
$$;

grant execute on function public.get_opportunity_interested_players(text, uuid) to authenticated;
