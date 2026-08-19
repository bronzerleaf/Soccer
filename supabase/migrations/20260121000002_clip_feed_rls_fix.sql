-- Feed-visible clips are an explicit parent disclosure, but the player's
-- full row must remain behind its own RLS. Use a security-definer helper to
-- test clip visibility/consent without requiring the viewer to be able to
-- SELECT the player profile itself.
create function public.is_feed_visible_highlight(check_highlight_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.player_highlights h
    join public.players p on p.id = h.player_id
    where h.id = check_highlight_id
      and h.show_in_feed = true
      and p.consent_completed = true
  );
$$;

grant execute on function public.is_feed_visible_highlight(uuid) to authenticated;

drop policy "player_highlights: authenticated users read feed clips"
  on public.player_highlights;
create policy "player_highlights: authenticated users read feed clips"
  on public.player_highlights for select
  to authenticated
  using (public.is_feed_visible_highlight(id));

drop policy "player_highlight_likes: like visible feed clip"
  on public.player_highlight_likes;
create policy "player_highlight_likes: like visible feed clip"
  on public.player_highlight_likes for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and public.is_feed_visible_highlight(highlight_id)
  );

drop policy "player_highlight_comments: authenticated users read feed clip comments"
  on public.player_highlight_comments;
create policy "player_highlight_comments: authenticated users read feed clip comments"
  on public.player_highlight_comments for select
  to authenticated
  using (public.is_feed_visible_highlight(highlight_id));

drop policy "player_highlight_comments: comment on feed clip"
  on public.player_highlight_comments;
create policy "player_highlight_comments: comment on feed clip"
  on public.player_highlight_comments for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and public.is_feed_visible_highlight(highlight_id)
  );
