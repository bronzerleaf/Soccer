# OpenRoster

Club soccer roster matching for Dallas–Fort Worth. See [`CLAUDE.md`](./CLAUDE.md) for the full project brief, constraints, and build order.

## Stack

Next.js (App Router, TypeScript), Supabase (Postgres, Auth, RLS, Storage), Tailwind CSS, Resend, Stripe (feature-flagged), Vercel.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase project URL + anon key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database

Schema and row-level security policies live in `supabase/migrations/`. RLS is the actual access-control boundary in this app — a misconfigured client query must not be able to leak a minor's profile, so every table that touches player data ships with policies and a pgTAP test proving them.

To run against a real local Supabase stack (requires Docker):

```bash
npx supabase start
npx supabase db reset   # applies migrations + supabase/seed.sql
npx supabase test db
```

If Docker/Supabase's image registry isn't reachable from your machine, the same migration, seed, and pgTAP tests can be run against a bare local Postgres install (16+, with the `postgresql-16-pgtap` package) instead:

```bash
createdb openroster_test
psql -d openroster_test -v ON_ERROR_STOP=1 -f supabase/tests/_local_bootstrap.sql   # stand-in for the auth schema/roles the hosted stack provides
psql -d openroster_test -v ON_ERROR_STOP=1 -f supabase/migrations/20260101000000_roles_and_rls.sql
psql -d openroster_test -v ON_ERROR_STOP=1 -f supabase/seed.sql
psql -d openroster_test -f supabase/tests/database/players_rls.sql
psql -d openroster_test -f supabase/tests/database/profiles_and_verifications_rls.sql
```

`supabase/tests/_local_bootstrap.sql` is not a migration — it only exists to approximate the `auth` schema and `anon`/`authenticated`/`service_role` roles that the hosted/Dockerized Supabase stack already provides, so the RLS tests have something to run against locally.
