-- Proves a coach cannot self-approve their own club-affiliation claim:
-- not at submission time (status/reviewed_by/reviewed_at are locked to
-- their "freshly submitted" values), and not afterward (no UPDATE policy
-- grants a coach any write access to coach_verifications at all — only
-- an admin's own session can move status, per migration 1).

begin;
select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c3', 'coach-h1@example.com'),
  ('00000000-0000-0000-0000-0000000000ae', 'admin-h1@example.com');

update public.profiles set role = 'coach' where id = '00000000-0000-0000-0000-0000000000c3';
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000ae';

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c3", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.coach_verifications (coach_id, status)
     values ('00000000-0000-0000-0000-0000000000c3', 'approved') $$,
  'new row violates row-level security policy for table "coach_verifications"',
  'a coach cannot submit a verification that is already approved'
);

select throws_ok(
  $$ insert into public.coach_verifications (coach_id, reviewed_by, reviewed_at)
     values ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c3', now()) $$,
  'new row violates row-level security policy for table "coach_verifications"',
  'a coach cannot submit a verification that already claims to be reviewed'
);

select lives_ok(
  $$ insert into public.coach_verifications (id, coach_id, evidence)
     values ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c3', 'I coach U12 at Solar SC') $$,
  'a coach can submit a normal pending verification'
);

-- No UPDATE policy at all exists for a coach on this table — even
-- targeting their own freshly-inserted, still-pending row.
with attempted as (
  update public.coach_verifications set status = 'approved'
  where id = '40000000-0000-0000-0000-000000000001'
  returning 1
)
select is(
  (select count(*) from attempted)::int,
  0,
  'a coach cannot update their own verification to approve it'
);

-- An admin, using nothing but their own authenticated session (no
-- service role needed), can move it.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000ae", "role": "authenticated"}';

update public.coach_verifications
set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
where id = '40000000-0000-0000-0000-000000000001';

select is(
  (select status::text from public.coach_verifications
   where id = '40000000-0000-0000-0000-000000000001'),
  'approved',
  'an admin can approve a verification through their own session'
);

select is(
  (select public.is_verified_coach('00000000-0000-0000-0000-0000000000c3'))::boolean,
  true,
  'once approved, is_verified_coach reflects it'
);

select * from finish();
rollback;
