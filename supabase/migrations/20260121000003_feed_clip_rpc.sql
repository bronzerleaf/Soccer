-- Security-definer read models for the social clip feed. They return only
-- the fields deliberately published with a feed-visible clip; they do not
-- unlock the underlying player profile for the caller.

create function public.get_feed_clips(max_rows integer default 30)
returns table (
  highlight_id uuid,
  player_id uuid,
  first_name text,
  last_initial text,
  birth_year integer,
  positions text[],
  level_of_play text,
  years_experience smallint,
  team_name text,
  team_verified boolean,
  url text,
  caption text,
  theme text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    h.id,
    p.id,
    p.first_name,
    p.last_initial,
    p.birth_year,
    p.positions,
    p.level_of_play,
    p.years_experience,
    t.name,
    p.team_membership_verified,
    h.url,
    h.caption,
    h.theme::text,
    h.created_at
  from public.player_highlights h
  join public.players p on p.id = h.player_id
  left join public.teams t on t.id = p.team_id
  where auth.uid() is not null
    and h.show_in_feed = true
    and p.consent_completed = true
  order by h.created_at desc
  limit greatest(1, least(coalesce(max_rows, 30), 100));
$$;

grant execute on function public.get_feed_clips(integer) to authenticated;

create function public.get_feed_clip_comments(target_highlight_id uuid)
returns table (
  id uuid,
  author_id uuid,
  author_name text,
  body text,
  created_at timestamptz,
  can_delete boolean
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_feed_visible_highlight(target_highlight_id) then
    return;
  end if;

  return query
    select
      c.id,
      c.author_id,
      p.full_name,
      c.body,
      c.created_at,
      (
        c.author_id = auth.uid()
        or public.is_admin(auth.uid())
        or exists (
          select 1
          from public.player_highlights h
          join public.players pl on pl.id = h.player_id
          where h.id = target_highlight_id and pl.parent_id = auth.uid()
        )
      ) as can_delete
    from public.player_highlight_comments c
    join public.profiles p on p.id = c.author_id
    where c.highlight_id = target_highlight_id
    order by c.created_at asc;
end;
$$;

grant execute on function public.get_feed_clip_comments(uuid) to authenticated;
