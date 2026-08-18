-- Player profile photos: one per player, max 2MB, resized client-side
-- before upload. This is the only binary asset OpenRoster stores — no
-- video is ever hosted here.
--
-- Objects are keyed "{parent_id}/{player_id}" so ownership can be checked
-- from the storage path alone, the same way every other player-data
-- policy checks parent_id = auth.uid().

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'player-photos',
  'player-photos',
  false,
  2097152, -- 2MB
  array['image/jpeg', 'image/png', 'image/webp']
);

create policy "player-photos: parent uploads own player's photo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'player-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "player-photos: parent replaces own player's photo"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'player-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'player-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "player-photos: parent reads own player's photo"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'player-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "player-photos: parent deletes own player's photo"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'player-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "player-photos: admins manage all"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'player-photos' and public.is_admin(auth.uid()))
  with check (bucket_id = 'player-photos' and public.is_admin(auth.uid()));

-- Not yet: a verified coach reading a player's photo when browsing search
-- results. That policy belongs with the player-search milestone, mirroring
-- the same open_to_opportunities + consent_completed + is_verified_coach
-- check used on public.players — deliberately deferred until that feature
-- exists, so photos aren't reachable before search is.
