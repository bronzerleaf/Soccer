-- Lets a parent browse the team list (already non-sensitive org metadata
-- any authenticated user can read, same as clubs) and message that
-- team's verified coach directly -- the same "message the club" shape
-- that already exists from a roster post, just discovered by team name
-- instead. This is deliberately narrow: it exposes nothing about who is
-- on a team (that stays exactly as verified_team_membership.sql left
-- it -- get_team_roster() is untouched, still gated on the caller's own
-- verified membership) and nothing about a team's claim evidence. It
-- only ever reveals the same thing a roster post already does: which
-- coach is behind this listing, so a family can reach out.

alter table public.conversations
  add column team_id uuid references public.teams (id) on delete set null;

-- Replaces the milestone-6 insert policy to add a third discovery
-- context alongside the existing two (a specific open/consented player,
-- or a roster post the coach posted): a team the coach is the verified
-- owner of. Same shape, same reasoning -- a conversation still can't be
-- started out of nowhere.
drop policy "conversations: participants start a conversation" on public.conversations;

create policy "conversations: participants start a conversation"
  on public.conversations for insert
  to authenticated
  with check (
    (parent_id = auth.uid() or coach_id = auth.uid())
    and public.is_parent(parent_id)
    and public.is_verified_coach(coach_id)
    and (
      (player_id is not null and public.player_is_open_for_parent(player_id, parent_id))
      or (roster_post_id is not null and public.roster_post_belongs_to_coach(roster_post_id, coach_id))
      or (team_id is not null and public.is_verified_team_owner(coach_id, team_id))
    )
  );

-- The only way a parent browsing /teams learns who to message: which
-- coach, if any, is this team's *approved* verified owner. Never
-- evidence text, never a pending/rejected claim, never for a team with
-- no verified owner at all. A plain RLS policy on team_verifications
-- can't do this without also exposing evidence to every browsing
-- parent (RLS filters rows, not columns) -- a narrow function is how
-- this codebase already handles "expose less than the whole row."
create function public.get_team_coach(target_team_id uuid)
returns table (coach_id uuid, full_name text)
language sql
security definer
set search_path = public
stable
as $$
  select tv.coach_id, pr.full_name
  from public.team_verifications tv
  join public.profiles pr on pr.id = tv.coach_id
  where tv.team_id = target_team_id
    and tv.status = 'approved'
  limit 1;
$$;

grant execute on function public.get_team_coach(uuid) to authenticated;
