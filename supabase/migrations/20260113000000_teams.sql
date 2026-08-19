-- Teams: parents can group their player under a team name (created on the
-- fly if it doesn't exist yet, same spirit as picking a club); a coach can
-- claim/verify ownership of a specific team the same way they verify a
-- club affiliation; once verified, that coach can edit the team's profile
-- and manage who's on it.
--
-- Deliberately NOT built: any way for one parent to see another family's
-- child through shared team membership. CLAUDE.md's core rule --
-- "profiles are private by default and visible only to verified coach
-- accounts" -- would be broken by parent-to-parent roster visibility, and
-- "team management/scheduling" is explicitly out of scope for a public-
-- facing roster feature. What's built here stays inside that rule: a
-- team's name/city/leagues are non-sensitive org metadata (same
-- visibility level clubs already have), but which children belong to a
-- team is visible to nobody except that child's own parent and, for a
-- verified team owner, the coach who owns it -- never another family.

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) > 0),
  city_id uuid references public.cities (id),
  leagues text[] not null default '{}',
  merged_into_team_id uuid references public.teams (id),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.teams enable row level security;

create index teams_merged_into_team_id_idx on public.teams (merged_into_team_id);

-- Non-sensitive org metadata, same level of visibility clubs already have
-- ("clubs: any authenticated user can read") -- needed so a parent can
-- search for an existing team before creating a duplicate.
create policy "teams: any authenticated user reads"
  on public.teams for select
  to authenticated
  using (true);

create policy "teams: authenticated user creates"
  on public.teams for insert
  to authenticated
  with check (created_by = auth.uid());

create table public.team_verifications (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  evidence text,
  status public.verification_status not null default 'pending',
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.team_verifications enable row level security;

create policy "team_verifications: coach reads own"
  on public.team_verifications for select
  to authenticated
  using (coach_id = auth.uid());

-- Self-approval lockdown built in from the start, same as
-- organization_verifications -- coach_verifications needed a follow-up
-- migration to close this same hole; no reason to repeat that history.
create policy "team_verifications: coach submits own"
  on public.team_verifications for insert
  to authenticated
  with check (
    coach_id = auth.uid()
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'coach'
    )
  );

create policy "team_verifications: admins read all"
  on public.team_verifications for select
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "team_verifications: admins review"
  on public.team_verifications for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create function public.is_verified_team_owner(check_coach_id uuid, check_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.team_verifications tv
    where tv.coach_id = check_coach_id
      and tv.team_id = check_team_id
      and tv.status = 'approved'
  );
$$;

grant execute on function public.is_verified_team_owner(uuid, uuid) to authenticated;

-- A verified owner can update their team's profile fields (name, city,
-- leagues) and set merged_into_team_id to fold a duplicate in -- see the
-- merge_unclaimed_team_into() function below for the actual merge, which
-- only ever touches an *unclaimed* team, never one another coach already
-- owns.
create policy "teams: verified owner updates own team"
  on public.teams for update
  to authenticated
  using (public.is_verified_team_owner(auth.uid(), id))
  with check (public.is_verified_team_owner(auth.uid(), id));

alter table public.players
  add column team_id uuid references public.teams (id);

-- Extends the column-level UPDATE grant from migration 2 (GRANT is
-- additive -- this adds team_id to the existing grantable set rather
-- than replacing it) so a parent can actually set it on their own child,
-- same as every other profile field.
grant update (team_id) on public.players to authenticated;

-- Minimal roster visibility: a verified team owner can read the players
-- on *their own* verified team -- and only that. This is a second,
-- narrower unlock condition alongside the existing
-- open_to_opportunities + consent_completed one search already uses;
-- it never exposes a player to any parent, and never to a coach who
-- isn't the verified owner of that exact team.
create policy "players: verified team owner reads own team roster"
  on public.players for select
  to authenticated
  using (
    team_id is not null
    and public.is_verified_team_owner(auth.uid(), team_id)
  );

-- Removing a player from a team is a narrow, single-purpose action, not a
-- general write grant: rather than add team_id to players' column-level
-- UPDATE grant (which is table-wide for the authenticated role and would
-- have no way to stop a coach editing anything else about the child), a
-- security definer function performs exactly one thing -- setting
-- team_id to null -- after checking the caller owns that player's
-- current team. No broader players UPDATE policy exists for coaches at
-- all.
create function public.remove_player_from_team(target_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_team_id uuid;
begin
  select team_id into current_team_id from public.players where id = target_player_id;

  if current_team_id is null or not public.is_verified_team_owner(auth.uid(), current_team_id) then
    raise exception 'not authorized to remove this player from their team';
  end if;

  update public.players set team_id = null where id = target_player_id;
end;
$$;

grant execute on function public.remove_player_from_team(uuid) to authenticated;

-- Folds an unclaimed duplicate team into the caller's own verified team.
-- Deliberately restricted to unclaimed source teams only (no approved
-- team_verifications row of its own) -- one coach should never be able
-- to unilaterally absorb a team another coach already verified
-- ownership of.
create function public.merge_unclaimed_team_into(source_team_id uuid, target_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_verified_team_owner(auth.uid(), target_team_id) then
    raise exception 'not authorized to merge into this team';
  end if;

  if source_team_id = target_team_id then
    raise exception 'cannot merge a team into itself';
  end if;

  if exists (
    select 1 from public.team_verifications tv
    where tv.team_id = source_team_id and tv.status = 'approved'
  ) then
    raise exception 'that team is already claimed by another coach';
  end if;

  update public.teams set merged_into_team_id = target_team_id where id = source_team_id;
end;
$$;

grant execute on function public.merge_unclaimed_team_into(uuid, uuid) to authenticated;
