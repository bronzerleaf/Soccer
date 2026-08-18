-- Not part of the Supabase migration history. This stands in for the
-- pieces of the hosted Supabase stack (roles, auth schema, auth.uid())
-- that migrations normally assume already exist, so the RLS migration
-- and pgTAP tests can run against a bare local Postgres.

create extension if not exists pgtap;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

grant anon, authenticated, service_role to current_user;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub')::uuid;
$$;

-- Every prior RLS policy in this project called auth.uid() only from
-- inside a USING/WITH CHECK expression, which Postgres resolves once
-- (as the policy owner) at CREATE POLICY time and re-checks only
-- EXECUTE-on-function afterward — so this grant's absence went
-- unnoticed for a while. Ad-hoc SQL text that calls auth.uid() directly
-- (as application code and some tests do) is parsed fresh under the
-- calling role each time, which does need USAGE on the schema to even
-- resolve the name. Real Supabase grants this by default.
grant usage on schema auth to anon, authenticated, service_role;

-- Minimal stand-in for Supabase Storage's schema: just enough of
-- storage.buckets/storage.objects/storage.foldername() for the
-- player-photos bucket policies to be testable locally.
create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz not null default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  created_at timestamptz not null default now()
);

alter table storage.buckets enable row level security;
alter table storage.objects enable row level security;

create or replace function storage.foldername(name text)
returns text[]
language plpgsql
immutable
as $$
declare
  _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1 : array_length(_parts, 1) - 1];
end;
$$;

grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.buckets, storage.objects to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
