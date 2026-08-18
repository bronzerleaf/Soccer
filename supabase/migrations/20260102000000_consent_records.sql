-- Milestone 2: player profiles + consent flow
--
-- Verifiable parental consent gates player-profile activation. The gate is
-- enforced at the database layer, not just in the app: a player row cannot
-- be open_to_opportunities unless consent_completed is true, and
-- consent_completed itself can only ever be set by the server (via the
-- service role) after a real Stripe authorization — never by the parent
-- directly through the normal authenticated client.

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  parent_id uuid not null references public.profiles (id) on delete cascade,
  method text not null,
  consented_at timestamptz not null default now(),
  ip inet not null,
  created_at timestamptz not null default now()
);

alter table public.consent_records enable row level security;

create index consent_records_player_id_idx on public.consent_records (player_id);
create index consent_records_parent_id_idx on public.consent_records (parent_id);

-- Immutable: insert-only, and even inserts aren't open to authenticated
-- users (see below) — only the service role, from the server action that
-- verifies the Stripe authorization, ever writes a row here.
create policy "consent_records: parent reads own"
  on public.consent_records for select
  to authenticated
  using (parent_id = auth.uid());

create policy "consent_records: admins read all"
  on public.consent_records for select
  to authenticated
  using (public.is_admin(auth.uid()));

-- No insert/update/delete policy for `authenticated` at all: a parent
-- cannot fabricate their own consent record. The service role bypasses
-- RLS entirely, which is the only path that writes this table.

-- A parent can flip open_to_opportunities on their own child (that's the
-- whole point of the toggle), but never past the consent gate.
alter table public.players
  add constraint players_consent_gates_open_to_opportunities
  check (not open_to_opportunities or consent_completed);

-- consent_completed is flipped exactly once, by the server, after it has
-- verified a real card authorization. `REVOKE UPDATE (col) ... FROM role`
-- alone does *not* narrow an existing table-level UPDATE grant — column-
-- and table-level privileges are additive, not overriding, so the role
-- would still be able to update the column via its table-level grant.
-- The working pattern (same as profiles.role in the previous migration)
-- is to revoke the table-level grant entirely and re-grant only the
-- columns a parent is actually allowed to touch.
--
-- Separately: this alone doesn't stop a parent from simply INSERTing a
-- new player row with consent_completed already set to true — column
-- privileges have no say over what an INSERT can set. Closing that
-- requires replacing the single "parent manages own children" FOR ALL
-- policy from the previous migration with separate per-command policies,
-- so the INSERT policy can carry its own, stricter check without also
-- constraining UPDATE (which must keep working on an already-consented
-- row without re-asserting consent_completed on every unrelated edit).
revoke update on public.players from authenticated;
grant update (
  first_name, last_initial, birth_year, positions, preferred_foot,
  current_club_id, city, bio, video_links, photo_url, open_to_opportunities
) on public.players to authenticated;

drop policy "players: parent manages own children" on public.players;

create policy "players: parent selects own children"
  on public.players for select
  to authenticated
  using (
    parent_id = auth.uid()
    and exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'parent'
    )
  );

-- New player rows always start unconsented; only the service role (after
-- a verified Stripe authorization) ever inserts a row with
-- consent_completed = true.
create policy "players: parent inserts own children"
  on public.players for insert
  to authenticated
  with check (
    parent_id = auth.uid()
    and consent_completed = false
    and exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'parent'
    )
  );

create policy "players: parent updates own children"
  on public.players for update
  to authenticated
  using (
    parent_id = auth.uid()
    and exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'parent'
    )
  )
  with check (
    parent_id = auth.uid()
    and exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'parent'
    )
  );

create policy "players: parent deletes own children"
  on public.players for delete
  to authenticated
  using (parent_id = auth.uid());
