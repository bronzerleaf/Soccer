-- Milestone 4: player search
--
-- Search means a verified coach can now see photos, not just rows in
-- public.players — this was deliberately left out of the player-photos
-- bucket policies in migration 3 until there was a feature that needed
-- it. The rule mirrors the players table's own visibility policy
-- exactly: open_to_opportunities, consent_completed, and an approved
-- coach_verifications row, all three.

create policy "player-photos: verified coaches read visible players' photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'player-photos'
    and exists (
      select 1 from public.players p
      where p.photo_url = storage.objects.name
        and p.open_to_opportunities = true
        and p.consent_completed = true
        and public.is_verified_coach(auth.uid())
    )
  );
