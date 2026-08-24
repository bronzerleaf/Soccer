-- Continuation of 20260124000000 -- the new 'highlight' enum value can't
-- be used in the same migration transaction that added it.

alter table public.feed_posts
  add column highlight_id uuid references public.player_highlights (id) on delete cascade;

alter table public.feed_posts
  add constraint feed_posts_highlight_id_matches_type check (
    (post_type = 'highlight' and highlight_id is not null) or
    (post_type <> 'highlight' and highlight_id is null)
  );

-- Widen the player_id-matches-type constraint one more time: a highlight
-- post always carries the player it's about (unlike looking_for_team/
-- guest_play's identity-hiding intent, a highlight is meant to show whose
-- clip it is).
alter table public.feed_posts drop constraint feed_posts_player_id_matches_type;
alter table public.feed_posts add constraint feed_posts_player_id_matches_type check (
  (post_type = 'looking_for_team' and player_id is not null)
  or (post_type = 'guest_play')
  or (post_type = 'highlight' and player_id is not null)
  or (post_type in ('org_event', 'training') and player_id is null)
);

-- Same shape as "feed_posts: parent posts about own consented player"
-- (migration 12), plus proving the highlight itself actually belongs to
-- that same player -- otherwise a parent could cross-post a clip that
-- isn't theirs by guessing another highlight's id.
create policy "feed_posts: parent posts a highlight for own consented player"
  on public.feed_posts for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and post_type = 'highlight'
    and exists (
      select 1 from public.players p
      where p.id = feed_posts.player_id
        and p.parent_id = auth.uid()
        and p.consent_completed = true
    )
    and exists (
      select 1 from public.player_highlights h
      where h.id = feed_posts.highlight_id
        and h.player_id = feed_posts.player_id
    )
  );
