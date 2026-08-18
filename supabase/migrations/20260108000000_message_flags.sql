-- Milestone 7: admin moderation tools
--
-- Messages stay immutable forever (no UPDATE/DELETE policy on messages
-- for anyone, admin included — see migration 6). Flagging is therefore
-- a separate, append-only table: a report *about* a message, never a
-- change *to* one. Dismissing a flag deletes the flag row; the message
-- it pointed at is untouched either way.

create table public.message_flags (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  flagged_by uuid not null references public.profiles (id),
  reason text,
  created_at timestamptz not null default now()
);

alter table public.message_flags enable row level security;

create index message_flags_message_id_idx on public.message_flags (message_id);

-- A participant can only flag a message in a conversation they're
-- actually part of. Unlike the messaging insert-policy checks in
-- migration 6, this doesn't need a security-definer wrapper: the
-- flagger is checking their *own* access (are they a participant on
-- this message's conversation?), which their own RLS on
-- messages/conversations already grants them the visibility to answer
-- correctly — there's no third party's row involved.
create policy "message_flags: participant flags a message they can see"
  on public.message_flags for insert
  to authenticated
  with check (
    flagged_by = auth.uid()
    and exists (
      select 1 from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = message_flags.message_id
        and (c.parent_id = auth.uid() or c.coach_id = auth.uid())
    )
  );

create policy "message_flags: admins read all"
  on public.message_flags for select
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "message_flags: admins dismiss"
  on public.message_flags for delete
  to authenticated
  using (public.is_admin(auth.uid()));

-- "View flagged messages" (CLAUDE.md's admin-dashboard scope) means
-- actually reading a flagged message's content and the conversation it
-- came from — migration 6 never granted admins SELECT on either table,
-- only participants. Read-only: there is still no UPDATE/DELETE policy
-- on messages for anyone, admin included. Retention is unconditional;
-- visibility for moderation is a separate, additive grant.
create policy "messages: admins read all"
  on public.messages for select
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "conversations: admins read all"
  on public.conversations for select
  to authenticated
  using (public.is_admin(auth.uid()));
