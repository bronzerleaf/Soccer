-- Per-participant "unread" state for the inbox (NAVIGATION/SCREEN spec's
-- "unread state" bullet). conversations deliberately has no general
-- UPDATE policy ("participants and context are fixed at creation") --
-- this doesn't relax that. mark_conversation_read() is a narrow
-- security-definer function that only ever sets the caller's own
-- last-read column, exactly like verify_team_member() only ever
-- touches team_membership_verified: the function body is the entire
-- write surface, not a general grant.

alter table public.conversations
  add column parent_last_read_at timestamptz,
  add column coach_last_read_at timestamptz;

create function public.mark_conversation_read(target_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  conv record;
begin
  select parent_id, coach_id into conv
  from public.conversations
  where id = target_conversation_id;

  if conv is null then
    raise exception 'conversation not found';
  end if;

  if conv.parent_id = auth.uid() then
    update public.conversations set parent_last_read_at = now() where id = target_conversation_id;
  elsif conv.coach_id = auth.uid() then
    update public.conversations set coach_last_read_at = now() where id = target_conversation_id;
  else
    raise exception 'not a participant in this conversation';
  end if;
end;
$$;

grant execute on function public.mark_conversation_read(uuid) to authenticated;
