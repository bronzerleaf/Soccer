# OpenRoster

Club soccer roster matching for Dallas–Fort Worth. See [`CLAUDE.md`](./CLAUDE.md) for the full project brief, constraints, and build order.

## Stack

Next.js (App Router, TypeScript), Supabase (Postgres, Auth, RLS, Storage), Tailwind CSS, Resend, Stripe, Vercel. Stripe is live now for the $0.50 parental-consent card authorization (immediately voided, never captured); Stripe *subscriptions* for paid roster posts are separate and still feature-flagged off for the DFW launch.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase + Stripe test-mode keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). `SUPABASE_SERVICE_ROLE_KEY` is server-only and used exclusively by the consent flow (`src/app/players/[id]/consent/actions.ts`) to write `consent_records` and flip `players.consent_completed` after a verified Stripe authorization — a parent's own session is never allowed to do either directly (see Database below).

## Database

Schema and row-level security policies live in `supabase/migrations/`. RLS is the actual access-control boundary in this app — a misconfigured client query must not be able to leak a minor's profile, so every table that touches player data ships with policies and a pgTAP test proving them.

To run against a real local Supabase stack (requires Docker):

```bash
npx supabase start
npx supabase db reset   # applies migrations + supabase/seed.sql
npx supabase test db
```

If Docker/Supabase's image registry isn't reachable from your machine, the same migrations, seed, and pgTAP tests can be run against a bare local Postgres install (16+, with the `postgresql-16-pgtap` package) instead:

```bash
createdb openroster_test
psql -d openroster_test -v ON_ERROR_STOP=1 -f supabase/tests/_local_bootstrap.sql   # stand-in for the auth/storage schema + roles the hosted stack provides
for f in supabase/migrations/*.sql; do psql -d openroster_test -v ON_ERROR_STOP=1 -f "$f"; done
psql -d openroster_test -v ON_ERROR_STOP=1 -f supabase/seed.sql
for f in supabase/tests/database/*.sql; do psql -d openroster_test -f "$f"; done
```

`supabase/tests/_local_bootstrap.sql` is not a migration — it only exists to approximate the `auth`/`storage` schemas and `anon`/`authenticated`/`service_role` roles that the hosted/Dockerized Supabase stack already provides, so the RLS tests have something to run against locally.

## Consent gate

`players.consent_completed` and `players.open_to_opportunities` are both locked down at the database layer, not just in the app:

- A parent can never set `consent_completed` themselves — not via `UPDATE` (column-level grant excludes it) and not via `INSERT` (the insert policy requires it to be `false`). Only the service-role client can flip it, and only from the consent server action after Stripe confirms a real card authorization.
- A `CHECK` constraint (`players_consent_gates_open_to_opportunities`) forbids `open_to_opportunities = true` while `consent_completed = false`, independent of any RLS policy or app-layer bug.
- Deleting a player is a hard delete (`ON DELETE CASCADE` takes its `consent_records` with it) — no soft-delete, no orphaned trace of the minor's data.

See `supabase/tests/database/consent_gate_rls.sql` for the proof, including the two bugs this caught while it was being written: a parent could otherwise insert a player row with consent pre-set to `true`, and `REVOKE UPDATE (col) ... FROM role` silently does nothing when that role still holds the table-level grant (fixed by revoking the table-level grant and re-granting only the columns a parent may edit — same pattern as `profiles.role`).

## Coach verification

A coach account can't search players or message anyone until an admin approves a `coach_verifications` row for them (`public.is_verified_coach()`, used throughout the player-visibility policies). The submission itself is locked down the same way as the consent gate: a coach's own `INSERT` policy requires `status = 'pending'` and `reviewed_by`/`reviewed_at` to be null, so a coach can't self-approve by just inserting a row that already claims to be reviewed. Only an admin's own authenticated session can move `status` — no service role needed for that path, since migration 1 already grants admins `UPDATE` on this table directly.

**Bootstrapping the first admin.** There is deliberately no self-serve way to become an admin — `profiles.role` can only be set at signup (defaulting to `parent`/`coach`) or changed by a query that bypasses RLS. To promote a user, run this once against the database with the service role (e.g. the Supabase SQL Editor, or `psql` using the service-role/postgres connection string — never the anon/authenticated one):

```sql
update public.profiles set role = 'admin' where id = '<their auth.users uuid>';
```

## Admin queue

`/admin/coaches` lists pending `coach_verifications` for an admin to approve or reject. It's gated by checking `profiles.role = 'admin'` server-side and redirecting otherwise — there's no separate admin subdomain or deploy, just a route ordinary users are redirected away from.

## Player search

`/search` is gated to coaches with an `approved` `coach_verifications` row (`requireVerifiedCoach()`); anyone else is redirected to `/coach/verify` or `/dashboard`. There's no "open to opportunities" filter in the UI because it isn't a real filter from a coach's point of view — the RLS policy on `players` already means every row a coach can see has `open_to_opportunities = true`, full stop.

Photos follow the same rule as everything else here: the `player-photos` storage bucket had no coach-facing `SELECT` policy at all until this milestone (deliberately — no feature needed it yet). The policy added for search mirrors the `players` table's own visibility check exactly (open + consented + an approved verification), rather than trusting that whatever the app queries for is what the storage layer will actually serve. `/players/[id]` and `/search/[id]` — the two actual player-profile routes — set `robots: noindex` in their layouts, per the "never publicly indexable" requirement.
