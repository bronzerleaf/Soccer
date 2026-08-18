-- Milestone 3: coach verification + admin queue
--
-- The INSERT policy on coach_verifications from migration 1 only checked
-- coach_id = auth.uid() — it never constrained status, reviewed_by, or
-- reviewed_at. That's the same bug class as the consent gate: a coach
-- could INSERT their own verification row with status = 'approved'
-- directly, self-approving without any admin ever looking at it. Closing
-- it means a fresh submission must start pending and unreviewed; only an
-- admin's own UPDATE (already policied in migration 1) can move it.

drop policy "coach_verifications: coach submits own" on public.coach_verifications;

create policy "coach_verifications: coach submits own"
  on public.coach_verifications for insert
  to authenticated
  with check (
    coach_id = auth.uid()
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'coach'
    )
  );
