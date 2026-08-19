-- Split into its own migration file/transaction on purpose: Postgres
-- cannot use a freshly added enum value (in a CHECK constraint's
-- validation scan, an index, etc.) inside the same transaction that adds
-- it. Supabase applies each migration file as one transaction, so the
-- enum addition needs a full migration to itself before anything below
-- (20260114000001) can reference 'training' in a constraint that
-- validates against existing rows.
alter type public.feed_post_type add value 'training';
