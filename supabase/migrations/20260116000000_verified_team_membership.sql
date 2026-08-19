-- Verified team membership: a parent can still attach their player to a
-- team instantly (unchanged, self-service, no coach in the loop for the
-- claim itself) -- but that membership starts unverified, and stays
-- invisible to every other family until the team's verified coach
-- confirms it. This is the piece that makes "show parents their
-- teammates' roster" safe to build: without it, team_id is a free-text
-- match anyone could type, so "same team" would prove nothing about a
-- real connection between two families. With it, a coach -- a real,
-- admin-approved human -- is in the loop before any child becomes
-- visible to a family that isn't their own.
--
-- Deliberately NOT shown to other parents even with an "unverified"
-- label: an unconfirmed, possibly fabricated membership is still
-- exposure to a real family if it's visible at all, badge or not.
-- Visibility is gated on verification, not just labeled by it.

alter table public.players
  add column team_membership_verified boolean not null default false;

-- Never grantable to the authenticated role directly -- this column is
-- settable only through verify_team_member() below, which runs as this
-- migration's own elevated role. If team_id ever landed in the same
-- column-level UPDATE grant parents already have, a parent could just
-- flip this to true on their own child and defeat the entire point, the
-- same self-approval hole coach_verifications had to close after the
-- fact. Not repeating that here -- this column is simply never granted.

-- A membership can't outlive the team_id it was verified for: changing
-- (or clearing) team_id always resets verification, regardless of which
-- code path touches the column -- this is a database-level guarantee,
-- not something that depends on every caller remembering to do it.
create function public.reset_team_membership_verification()
returns trigger
language plpgsql
as $$
begin
  if new.team_id is distinct from old.team_id then
    new.team_membership_verified := false;
  end if;
  return new;
end;
$$;

create trigger players_reset_team_membership_verification
  before update on public.players
  for each row
  execute function public.reset_team_membership_verification();

-- Only the verified owner of a player's *current* team can confirm that
-- player actually belongs there.
create function public.verify_team_member(target_player_id uuid)
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
    raise exception 'not authorized to verify this player''s team membership';
  end if;

  update public.players set team_membership_verified = true where id = target_player_id;
end;
$$;

grant execute on function public.verify_team_member(uuid) to authenticated;

-- The coach might click verify by mistake, or need to correct one --
-- same authorization check, just the other direction. Lower risk than
-- verifying (it only ever removes visibility, never grants it).
create function public.unverify_team_member(target_player_id uuid)
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
    raise exception 'not authorized to change this player''s team membership';
  end if;

  update public.players set team_membership_verified = false where id = target_player_id;
end;
$$;

grant execute on function public.unverify_team_member(uuid) to authenticated;

-- The actual roster feature: returns the minimal, non-identifying-beyond-
-- what-search-already-shows fields (first name, last initial, birth
-- year, positions -- never bio, photo, or highlights) for every
-- *verified* member of a team, but only to a caller whose own player is
-- also a verified member of that same team. An unrelated parent, or a
-- parent whose own child is still pending verification, gets zero rows
-- back -- same as if the team didn't exist for them.
--
-- security definer so it can read across other families' player rows
-- (nothing in the caller's own RLS would otherwise allow that); the
-- function body is the entire security boundary, so it re-checks the
-- caller's own verified membership on every call rather than trusting
-- the fact that it was reachable at all.
create function public.get_team_roster(target_team_id uuid)
returns table (
  id uuid,
  first_name text,
  last_initial text,
  birth_year integer,
  positions text[]
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.first_name, p.last_initial, p.birth_year, p.positions
  from public.players p
  where p.team_id = target_team_id
    and p.team_membership_verified = true
    and exists (
      select 1 from public.players mine
      where mine.parent_id = auth.uid()
        and mine.team_id = target_team_id
        and mine.team_membership_verified = true
    )
  order by p.first_name;
$$;

grant execute on function public.get_team_roster(uuid) to authenticated;
