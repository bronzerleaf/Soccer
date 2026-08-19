-- Generalize the existing adult-to-adult conversation model for verified
-- trainers/organizations, but only after a parent explicitly expresses
-- interest in that professional's post. The legacy column name coach_id is
-- retained to avoid a risky table-wide rename; it now means the adult
-- professional participant for this narrow interest-backed context.

alter table public.conversations
  add column opportunity_interest_id uuid references public.opportunity_interests (id) on delete set null;

create unique index conversations_opportunity_interest_unique
  on public.conversations (opportunity_interest_id)
  where opportunity_interest_id is not null;

create function public.professional_can_contact_interest(
  check_professional_id uuid,
  check_parent_id uuid,
  check_interest_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.opportunity_interests oi
    join public.profiles pr on pr.id = check_professional_id
    where oi.id = check_interest_id
      and oi.parent_id = check_parent_id
      and (
        (
          oi.roster_post_id is not null
          and pr.role = 'coach'
          and public.is_verified_coach(check_professional_id)
          and exists (
            select 1 from public.roster_posts rp
            where rp.id = oi.roster_post_id and rp.coach_id = check_professional_id
          )
        )
        or
        (
          oi.feed_post_id is not null
          and exists (
            select 1 from public.feed_posts fp
            where fp.id = oi.feed_post_id and fp.author_id = check_professional_id
          )
          and (
            (pr.role = 'coach' and public.is_verified_coach(check_professional_id))
            or (pr.role = 'trainer' and public.is_verified_trainer(check_professional_id))
            or (pr.role = 'organization' and public.is_verified_organization(check_professional_id))
          )
        )
      )
  );
$$;

grant execute on function public.professional_can_contact_interest(uuid, uuid, uuid) to authenticated;

-- Replace the original insert gate with the original coach paths plus a
-- new explicit-interest path for verified professionals.
drop policy "conversations: participants start a conversation" on public.conversations;

create policy "conversations: participants start a conversation"
  on public.conversations for insert
  to authenticated
  with check (
    (parent_id = auth.uid() or coach_id = auth.uid())
    and public.is_parent(parent_id)
    and (
      (
        public.is_verified_coach(coach_id)
        and opportunity_interest_id is null
        and (
          (player_id is not null and public.player_is_open_for_parent(player_id, parent_id))
          or (roster_post_id is not null and public.roster_post_belongs_to_coach(roster_post_id, coach_id))
          or (feed_post_id is not null and public.feed_post_belongs_to_coach(feed_post_id, coach_id))
          or (team_id is not null and public.is_verified_team_owner(coach_id, team_id))
        )
      )
      or
      (
        opportunity_interest_id is not null
        and player_id is null
        and roster_post_id is null
        and feed_post_id is null
        and team_id is null
        and public.professional_can_contact_interest(coach_id, parent_id, opportunity_interest_id)
      )
    )
  );
