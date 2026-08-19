begin;
select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'trainer-e1@example.com'),
  ('00000000-0000-0000-0000-0000000000ea', 'admin-e1@example.com');

update public.profiles set role = 'trainer' where id = '00000000-0000-0000-0000-0000000000e1';
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000ea';

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.trainer_verifications (trainer_id, evidence, status)
     values ('00000000-0000-0000-0000-0000000000e1', 'licensed trainer', 'approved') $$,
  'new row violates row-level security policy for table "trainer_verifications"',
  'a trainer cannot self-submit as approved'
);

select lives_ok(
  $$ insert into public.trainer_verifications (id, trainer_id, business_name, evidence)
     values ('91000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000e1', 'North Texas Skills', 'USSF license and academy website') $$,
  'a trainer can submit a pending verification'
);

with attempted as (
  update public.trainer_verifications set status = 'approved'
  where id = '91000000-0000-0000-0000-000000000001'
  returning 1
)
select is((select count(*) from attempted)::int, 0, 'a trainer cannot approve their own verification');

select is(public.is_verified_trainer('00000000-0000-0000-0000-0000000000e1'), false, 'pending trainer is not verified');

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000ea", "role": "authenticated"}';

update public.trainer_verifications
set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
where id = '91000000-0000-0000-0000-000000000001';

select is(public.is_verified_trainer('00000000-0000-0000-0000-0000000000e1'), true, 'admin approval verifies the trainer');

select * from finish();
rollback;