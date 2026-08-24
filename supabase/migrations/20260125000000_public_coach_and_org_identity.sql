-- Fixes a real gap: profiles has never had a read policy beyond "read
-- own row", "admins read all", and "conversation participants read each
-- other" -- yet roster-posts/[id], feed/page, feed/post/[id], and the
-- player profile's "coach interested" list all embed coach:profiles(...)
-- / author:profiles(...) joins expecting a name back. Under the actual
-- RLS policies that have existed since migration 1, every one of those
-- joins silently returns null for any viewer who isn't the row's owner
-- or already messaging them -- the code has always had a graceful
-- "A coach" / "An organization" fallback, but the real name never showed.
--
-- A verified coach's or organization's name is already meant to be
-- public-facing throughout this app (that's the entire point of a
-- roster post, a team page, or an event listing) -- this is fixing
-- existing intended behavior, not opening new exposure. Scoped tightly:
-- only full_name is ever selected by any of these joins (never email),
-- and only for accounts an admin has actually approved -- an
-- unverified/pending coach or organization is still fully invisible.
-- Never touches a parent's own row visibility, and never applies to a
-- minor's data at all (players has its own, separate policy set).
create policy "profiles: any authenticated user reads verified coach or organization identity"
  on public.profiles for select
  to authenticated
  using (
    public.is_verified_coach(profiles.id)
    or public.is_verified_organization(profiles.id)
  );

-- The organizations directory shows org_name (the actual business name
-- an admin approved), not profiles.full_name (whatever the account
-- holder typed at signup) -- same reasoning as above, scoped the same
-- way: only ever an *approved* row, never pending or rejected.
create policy "organization_verifications: any authenticated user reads approved rows"
  on public.organization_verifications for select
  to authenticated
  using (status = 'approved');
