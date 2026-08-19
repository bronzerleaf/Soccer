-- Mirrors coach_verification_lockdown_rls.sql for the new 'organization'
-- role (Local Feed milestone 2, CLAUDE.md section 9): an organization
-- cannot self-approve, cannot see another organization's submission, and
-- only an admin's own session can move status.

begin;
select plan(7);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'org-o1@example.com'),
  ('00000000-0000-0000-0000-0000000000d2', 'org-o2@example.com'),
  ('00000000-0000-0000-0000-0000000000da', 'admin-o1@example.com');

update public.profiles set role = 'organization' where id in (
  '00000000-0000-0000-0000-0000000000d1',
  '00000000-0000-0000-0000-0000000000d2'
);
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000da';

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.organization_verifications (organization_id, org_name, status)
     values ('00000000-0000-0000-0000-0000000000d1', 'DFW Fall Showcase', 'approved') $$,
  'new row violates row-level security policy for table "organization_verifications"',
  'an organization cannot submit a verification that is already approved'
);

select lives_ok(
  $$ insert into public.organization_verifications (id, organization_id, org_name, evidence)
     values ('90000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'DFW Fall Showcase', 'events@dfwfallshowcase.example, tournament director') $$,
  'an organization can submit a normal pending verification'
);

with attempted as (
  update public.organization_verifications set status = 'approved'
  where id = '90000000-0000-0000-0000-000000000001'
  returning 1
)
select is(
  (select count(*) from attempted)::int,
  0,
  'an organization cannot update its own verification to approve it'
);

reset role;
insert into public.organization_verifications (id, organization_id, org_name, evidence) values
  ('90000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000d2', 'Metroplex Cup', 'director@metroplexcup.example');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';

select is(
  (select count(*) from public.organization_verifications)::int,
  1,
  'an organization reads only its own submission, never another org''s'
);

select is(
  (select public.is_verified_organization('00000000-0000-0000-0000-0000000000d1'))::boolean,
  false,
  'still pending, so is_verified_organization is false'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000da", "role": "authenticated"}';

update public.organization_verifications
set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
where id = '90000000-0000-0000-0000-000000000001';

select is(
  (select status::text from public.organization_verifications
   where id = '90000000-0000-0000-0000-000000000001'),
  'approved',
  'an admin can approve an organization verification through their own session'
);

select is(
  (select public.is_verified_organization('00000000-0000-0000-0000-0000000000d1'))::boolean,
  true,
  'once approved, is_verified_organization reflects it'
);

select * from finish();
rollback;
