-- Trainer accounts are adult professional accounts, parallel to coaches and
-- organizations. This migration only adds the enum value because PostgreSQL
-- requires a newly-added enum value to be committed before later migrations
-- safely reference it in policies/functions.
alter type public.user_role add value if not exists 'trainer';
