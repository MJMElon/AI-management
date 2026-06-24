-- ============================================================
--  Vibe Proposals — Supabase schema
--  Paste this into your Supabase project's SQL Editor and run.
--  Covers: profiles (with department), proposals, comments,
--          status_history, time_sessions, plus Row Level Security.
-- ============================================================

-- 1. PROFILES ------------------------------------------------
-- One row per user, linked to Supabase Auth. `department` doubles
-- as the role and decides which stages a user can act on.
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  department  text not null default 'operation'
              check (department in ('operation','management','it','admin')),
  created_at  timestamptz not null default now()
);

-- Heal an older/pre-existing profiles table that may be missing columns
-- (otherwise `create table if not exists` above silently does nothing).
alter table profiles add column if not exists name       text;
alter table profiles add column if not exists department text default 'operation';
alter table profiles add column if not exists created_at timestamptz default now();
do $$
begin
  alter table profiles add constraint profiles_department_check
    check (department in ('operation','management','it','admin'));
exception
  when duplicate_object then null;  -- constraint already present
end $$;

-- Auto-create a profile when a new auth user signs up.
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, department)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), 'operation');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Helper: the calling user's department.
create or replace function my_department()
returns text language sql stable security definer as $$
  select department from public.profiles where id = auth.uid();
$$;

-- 2. PROPOSALS -----------------------------------------------
create table if not exists proposals (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  problem     text not null,
  benefit     text not null,
  est_hours   numeric not null default 0,
  priority    text not null default 'Medium' check (priority in ('Low','Medium','High')),
  category    text not null default 'Tooling',
  tools       text,
  status      text not null default 'draft'
              check (status in ('draft','pending_approval','needs_revision','rejected',
                                'it_review','building','final_review','needs_rework',
                                'final_rejected','ready_to_deploy','deploying','live')),
  created_by  uuid not null references profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists proposals_status_idx on proposals(status);

-- 3. COMMENTS ------------------------------------------------
create table if not exists comments (
  id          uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals(id) on delete cascade,
  author_id   uuid not null references profiles(id),
  body        text not null,
  created_at  timestamptz not null default now()
);

-- 4. STATUS HISTORY ------------------------------------------
create table if not exists status_history (
  id          uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals(id) on delete cascade,
  to_status   text not null,
  actor_id    uuid not null references profiles(id),
  note        text,
  created_at  timestamptz not null default now()
);

-- 5. TIME SESSIONS -------------------------------------------
-- started_at / ended_at are server timestamps. Duration is derived;
-- an open session (ended_at is null) means a timer is running.
create table if not exists time_sessions (
  id          uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals(id) on delete cascade,
  user_id     uuid not null references profiles(id),
  started_at  timestamptz not null default now(),
  ended_at    timestamptz
);

-- ============================================================
--  ROW LEVEL SECURITY
--  Internal tool: every signed-in user can READ everything.
--  WRITES are gated by department so the browser can't skip steps.
-- ============================================================
alter table profiles       enable row level security;
alter table proposals      enable row level security;
alter table comments       enable row level security;
alter table status_history enable row level security;
alter table time_sessions  enable row level security;

-- profiles: read all; edit only your own (admins edit anyone).
drop policy if exists "read profiles" on profiles;
create policy "read profiles"   on profiles for select using (auth.uid() is not null);
drop policy if exists "update own profile" on profiles;
create policy "update own profile" on profiles for update
  using (id = auth.uid() or my_department() = 'admin');

-- proposals: everyone signed-in can read.
drop policy if exists "read proposals" on proposals;
create policy "read proposals" on proposals for select using (auth.uid() is not null);

-- only Operation (or admin) can create a proposal.
drop policy if exists "create proposals" on proposals;
create policy "create proposals" on proposals for insert
  with check (my_department() in ('operation','admin') and created_by = auth.uid());

-- updates: the department that owns the CURRENT status may change it.
-- (For strict per-transition rules, move this into a trigger; this
--  baseline already stops, e.g., Operation approving its own proposal.)
drop policy if exists "update proposals by owner" on proposals;
create policy "update proposals by owner" on proposals for update
  using (
    my_department() = 'admin'
    or (status in ('draft','needs_revision','building','needs_rework') and my_department() = 'operation')
    or (status in ('pending_approval','final_review')               and my_department() = 'management')
    or (status in ('it_review','ready_to_deploy','deploying','live') and my_department() = 'it')
  );

-- comments: read all; anyone signed-in can post as themselves.
drop policy if exists "read comments" on comments;
create policy "read comments"  on comments for select using (auth.uid() is not null);
drop policy if exists "write comments" on comments;
create policy "write comments" on comments for insert with check (author_id = auth.uid());

-- status_history: read all; insert as yourself.
drop policy if exists "read history" on status_history;
create policy "read history"  on status_history for select using (auth.uid() is not null);
drop policy if exists "write history" on status_history;
create policy "write history" on status_history for insert with check (actor_id = auth.uid());

-- time_sessions: read all; you manage your own sessions.
drop policy if exists "read sessions" on time_sessions;
create policy "read sessions"   on time_sessions for select using (auth.uid() is not null);
drop policy if exists "insert sessions" on time_sessions;
create policy "insert sessions" on time_sessions for insert with check (user_id = auth.uid());
drop policy if exists "update sessions" on time_sessions;
create policy "update sessions" on time_sessions for update using (user_id = auth.uid());

-- ============================================================
--  REALTIME
--  Let the browser receive live updates so every department sees
--  status changes, comments, and timers as they happen.
-- ============================================================
do $$
begin
  alter publication supabase_realtime add table proposals;
  alter publication supabase_realtime add table comments;
  alter publication supabase_realtime add table status_history;
  alter publication supabase_realtime add table time_sessions;
exception
  when duplicate_object then null;  -- already in the publication
end $$;

-- ============================================================
--  Done. Next: create users in Authentication, then set their
--  department in the profiles table (default is 'operation').
--  In the app, click ⚙ Settings and paste your Project URL +
--  anon key — no code edits needed.
-- ============================================================
