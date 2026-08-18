-- Milestone 6: messaging + notifications
--
-- The highest-severity bug class in this codebase (per CLAUDE.md) is any
-- path from an adult to a child outside the parent inbox. This schema
-- makes that structurally impossible rather than merely policed: a
-- conversation's two participant columns (parent_id, coach_id) both
-- reference public.profiles — adults only — and player_id is optional
-- *context*, never a recipient. There is no column anywhere in this
-- table, or in messages, that a message could be addressed to a player
-- through.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  player_id uuid references public.players (id) on delete set null,
  roster_post_id uuid references public.roster_posts (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint conversations_parent_coach_distinct check (parent_id <> coach_id)
);

alter table public.conversations enable row level security;

create index conversations_parent_id_idx on public.conversations (parent_id);
create index conversations_coach_id_idx on public.conversations (coach_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id),
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create index messages_conversation_id_idx on public.messages (conversation_id);

-- These four checks all need to see rows outside whatever the calling
-- user's own RLS otherwise permits — a coach starting a conversation
-- can't see the parent's profiles row (profiles RLS only allows reading
-- your own), and reusing raw EXISTS subqueries against profiles/players/
-- roster_posts inside a *different* table's policy does NOT bypass
-- those tables' own RLS just because it's convenient; it's evaluated
-- under the caller's normal restricted view, so it would silently
-- always return false. Same reasoning as is_admin()/is_verified_coach()
-- in migration 1: security definer functions are how a policy checks
-- facts about a row the caller isn't otherwise allowed to see.

create function public.is_parent(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles pr
    where pr.id = check_user_id and pr.role = 'parent'
  );
$$;

grant execute on function public.is_parent(uuid) to authenticated;

create function public.player_is_open_for_parent(check_player_id uuid, check_parent_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.players p
    where p.id = check_player_id
      and p.parent_id = check_parent_id
      and p.open_to_opportunities = true
      and p.consent_completed = true
  );
$$;

grant execute on function public.player_is_open_for_parent(uuid, uuid) to authenticated;

create function public.roster_post_belongs_to_coach(check_roster_post_id uuid, check_coach_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.roster_posts rp
    where rp.id = check_roster_post_id and rp.coach_id = check_coach_id
  );
$$;

grant execute on function public.roster_post_belongs_to_coach(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- conversations policies
-- ---------------------------------------------------------------------

create policy "conversations: participants read"
  on public.conversations for select
  to authenticated
  using (parent_id = auth.uid() or coach_id = auth.uid());

-- Whichever side starts it, both roles and the coach's verification are
-- re-checked here — not assumed from whatever the client claims. Beyond
-- that, a conversation must be backed by an actual discovery context:
-- either a specific player this coach can currently see (open,
-- consented, and belonging to this parent) or a roster post this coach
-- actually posted. Without this, a coach could cold-message any
-- parent-role profile it happens to know the id of, with no player of
-- theirs ever having been open to opportunities in the first place.
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
    )
  );

-- Deliberately no UPDATE or DELETE policy: a conversation's participants
-- and context are fixed at creation, and nothing here is meant to be
-- edited after the fact.

-- ---------------------------------------------------------------------
-- messages policies
-- ---------------------------------------------------------------------

create policy "messages: participants read"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.parent_id = auth.uid() or c.coach_id = auth.uid())
    )
  );

create policy "messages: participants send"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.parent_id = auth.uid() or c.coach_id = auth.uid())
    )
  );

-- No UPDATE or DELETE policy on messages at all, for any role including
-- admin: every message is logged and retained, full stop. Moderation
-- (milestone 7) reads and flags; it does not edit or erase.

-- ---------------------------------------------------------------------
-- profiles: let two people see each other once they're actually talking
-- ---------------------------------------------------------------------
--
-- Without this, an inbox is unusable — a coach has no way to know the
-- name of the parent they're messaging, and vice versa. This is scoped
-- tightly: it only ever applies between the two adults on one shared
-- conversation row, which is the one relationship this whole feature
-- exists to support. It has nothing to do with, and does not touch, the
-- adult-to-child boundary.
create policy "profiles: conversation participants read each other"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where (c.parent_id = profiles.id and c.coach_id = auth.uid())
         or (c.coach_id = profiles.id and c.parent_id = auth.uid())
    )
  );
