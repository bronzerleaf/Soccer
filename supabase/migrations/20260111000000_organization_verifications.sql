-- Local Feed milestone 2 (CLAUDE.md section 9): a fourth role,
-- 'organization', verified the same way a coach is -- manual admin
-- approval, no exceptions. An organization is further from a child than
-- even a coach: it will only ever be able to post org_event listings
-- (milestone 3), never search players, never see a profile, never message
-- a family.
--
-- The insert policy here is written with the self-approval lockdown baked
-- in from the start (status/reviewed_by/reviewed_at all forced to their
-- unreviewed starting state) -- coach_verifications needed a follow-up
-- migration to close that same hole; no reason to repeat the mistake.

alter type public.user_role add value 'organization';

create table public.organization_verifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.profiles (id) on delete cascade,
  org_name text not null,
  evidence text,
  status public.verification_status not null default 'pending',
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.organization_verifications enable row level security;

create policy "organization_verifications: org reads own"
  on public.organization_verifications for select
  to authenticated
  using (organization_id = auth.uid());

create policy "organization_verifications: org submits own"
  on public.organization_verifications for insert
  to authenticated
  with check (
    organization_id = auth.uid()
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'organization'
    )
  );

create policy "organization_verifications: admins read all"
  on public.organization_verifications for select
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "organization_verifications: admins review"
  on public.organization_verifications for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Mirrors is_verified_coach() exactly -- used by feed_posts RLS
-- (milestone 3) to gate org_event inserts to approved organizations only.
create function public.is_verified_organization(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organization_verifications ov
    where ov.organization_id = check_user_id
      and ov.status = 'approved'
  );
$$;

grant execute on function public.is_verified_organization(uuid) to authenticated;
