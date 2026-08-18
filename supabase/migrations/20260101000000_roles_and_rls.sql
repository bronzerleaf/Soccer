-- Milestone 1: auth + roles + RLS
--
-- Establishes profiles/clubs/players/coach_verifications and locks every
-- table down with row-level security. Nothing is readable or writable by
-- default; each policy below is an explicit grant.

create type public.user_role as enum ('parent', 'coach', 'admin');
create type public.verification_status as enum ('pending', 'approved', 'rejected');
create type public.preferred_foot as enum ('left', 'right', 'both');

-- One row per adult user. The child is never a user, so there is no
-- "player" role here.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'parent',
  full_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Curated dropdown of DFW clubs. Parent-entered team affiliation picks
-- from this list; nobody scrapes anything to populate it.
create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  age_groups text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.clubs enable row level security;

-- The minor's data. Always owned by a parent profile; never has its own
-- auth identity.
create table public.players (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles (id) on delete cascade,
  first_name text not null,
  last_initial text not null,
  birth_year integer not null check (birth_year between 2000 and 2025),
  positions text[] not null default '{}',
  preferred_foot public.preferred_foot,
  current_club_id uuid references public.clubs (id),
  city text not null,
  bio text,
  video_links text[] not null default '{}',
  photo_url text,
  open_to_opportunities boolean not null default false,
  consent_completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.players enable row level security;

create index players_parent_id_idx on public.players (parent_id);

-- A coach's claim to represent a club. Nothing about a coach account is
-- trusted until this reaches 'approved'.
create table public.coach_verifications (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  claimed_club_id uuid references public.clubs (id),
  evidence text,
  status public.verification_status not null default 'pending',
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.coach_verifications enable row level security;

create index coach_verifications_coach_id_idx on public.coach_verifications (coach_id);

-- Helper: does auth.uid() belong to a coach with an approved verification?
-- security definer so it can read coach_verifications regardless of the
-- caller's own RLS visibility into that table.
create function public.is_verified_coach(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.coach_verifications cv
    where cv.coach_id = check_user_id
      and cv.status = 'approved'
  );
$$;

create function public.is_admin(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = check_user_id
      and p.role = 'admin'
  );
$$;

-- New auth.users row -> profile row. Role comes from signup metadata; it
-- is trusted only at creation time, never on update (see the revoke below).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'parent'),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

grant execute on function public.is_verified_coach(uuid) to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;

-- Column-level lock: a signed-in user may update their own profile row
-- (RLS below) but never the role column itself. Only the service role
-- (which bypasses RLS/grants entirely) can change a role, e.g. via the
-- admin approval flow.
revoke update on public.profiles from authenticated;
grant update (full_name, email) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- profiles policies
-- ---------------------------------------------------------------------

create policy "profiles: read own row"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles: admins read all rows"
  on public.profiles for select
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "profiles: update own row"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------
-- clubs policies (curated, admin-maintained, everyone signed-in can browse)
-- ---------------------------------------------------------------------

create policy "clubs: any authenticated user can read"
  on public.clubs for select
  to authenticated
  using (true);

create policy "clubs: admins manage"
  on public.clubs for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- players policies
-- ---------------------------------------------------------------------

-- parent_id = auth.uid() alone isn't enough: it would let any signed-in
-- user (a coach included) create a "player" row naming themselves as the
-- parent. Require that the caller's own profile is actually role='parent'.
create policy "players: parent manages own children"
  on public.players for all
  to authenticated
  using (
    parent_id = auth.uid()
    and exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'parent'
    )
  )
  with check (
    parent_id = auth.uid()
    and exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'parent'
    )
  );

-- The one rule this milestone exists to prove: a coach can see a player
-- row only once that coach is an *approved* verification AND the player
-- is both open to opportunities and past the consent gate. An unverified
-- or pending coach gets zero rows, full stop.
create policy "players: verified coaches read open, consented players"
  on public.players for select
  to authenticated
  using (
    open_to_opportunities = true
    and consent_completed = true
    and public.is_verified_coach(auth.uid())
  );

create policy "players: admins read all"
  on public.players for select
  to authenticated
  using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- coach_verifications policies
-- ---------------------------------------------------------------------

create policy "coach_verifications: coach reads own"
  on public.coach_verifications for select
  to authenticated
  using (coach_id = auth.uid());

create policy "coach_verifications: coach submits own"
  on public.coach_verifications for insert
  to authenticated
  with check (coach_id = auth.uid());

create policy "coach_verifications: admins read all"
  on public.coach_verifications for select
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "coach_verifications: admins review"
  on public.coach_verifications for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
