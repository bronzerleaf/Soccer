-- The feed has had likes since migration 15 but no way to actually reach
-- the person behind a post -- which defeats the point of a roster-spot
-- or training listing ("more information," "is this still open") and of
-- a family's looking_for_team/guest_play post. This adds the same
-- "message the person behind this" affordance the rest of the platform
-- already has, along exactly the two directions that are actually safe:
--
-- 1. A verified coach messaging the family behind a looking_for_team or
--    guest_play post. No new context needed at all -- these posts always
--    carry player_id, and the existing player_id branch (migration 6)
--    already allows a coach to start a conversation with any open,
--    consented player's parent. This migration adds no policy for it;
--    it only needed the UI, which ships alongside this migration.
--
-- 2. A parent messaging the coach behind a coach-authored guest_play
--    ("need a guest player") or training post -- these never carry a
--    player_id, so there's no existing context linking them to a
--    conversation. This is the actual gap this migration closes, via a
--    new feed_post_id context on conversations, the same shape as
--    roster_post_id (migration 6) and team_id (migration 17): a narrow
--    security definer function proving the post really belongs to the
--    coach being messaged, added as one more OR-branch on the existing
--    insert policy.
--
-- Deliberately absent: any messaging path for org_event. CLAUDE.md
-- section 9 is explicit that an organization account "has no access to
-- player search, player profiles, or messaging" and "must never be
-- treated as [a coach] in RLS" -- so feed_post_belongs_to_coach below
-- only ever matches guest_play/training, and there is no
-- is_verified_organization-based branch anywhere in this file. A family
-- can like or share a tournament listing, same as today, but not
-- message the organization running it.

alter table public.conversations
  add column feed_post_id uuid references public.feed_posts (id) on delete set null;

create function public.feed_post_belongs_to_coach(check_feed_post_id uuid, check_coach_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.feed_posts fp
    where fp.id = check_feed_post_id
      and fp.author_id = check_coach_id
      and fp.post_type in ('guest_play', 'training')
  );
$$;

grant execute on function public.feed_post_belongs_to_coach(uuid, uuid) to authenticated;

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
      or (feed_post_id is not null and public.feed_post_belongs_to_coach(feed_post_id, coach_id))
    )
  );
