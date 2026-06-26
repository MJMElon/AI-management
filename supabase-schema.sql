-- ============================================================
--  Vibe Proposals — Supabase schema  (safe to run / re-run)
--  Tables are prefixed `ai_management_` so this module can share
--  one Supabase database with other modules added later.
--  Covers: profiles (with department), proposals, comments,
--          status_history, time_sessions, plus Row Level Security
--          and realtime.
-- ============================================================

-- 1. PROFILES ------------------------------------------------
-- One row per user, linked to Supabase Auth. `department` doubles
-- as the role and decides which stages a user can act on.
create table if not exists ai_management_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  department  text not null default 'operation'
              check (department in ('operation','management','it','admin')),
  created_at  timestamptz not null default now()
);

-- Heal an older/pre-existing table that may be missing columns
-- (otherwise `create table if not exists` above silently does nothing).
alter table ai_management_profiles add column if not exists name       text;
alter table ai_management_profiles add column if not exists department text default 'operation';
alter table ai_management_profiles add column if not exists created_at timestamptz default now();
do $$
begin
  alter table ai_management_profiles add constraint ai_management_profiles_department_check
    check (department in ('operation','management','it','admin'));
exception
  when duplicate_object then null;  -- constraint already present
end $$;

-- Auto-create a profile when a new auth user signs up.
create or replace function ai_management_handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.ai_management_profiles (id, name, department)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), 'operation');
  return new;
end;
$$;

drop trigger if exists ai_management_on_auth_user_created on auth.users;
create trigger ai_management_on_auth_user_created
  after insert on auth.users
  for each row execute function ai_management_handle_new_user();

-- Helper: the calling user's department.
create or replace function ai_management_my_department()
returns text language sql stable security definer as $$
  select department from public.ai_management_profiles where id = auth.uid();
$$;

-- 2. PROPOSALS -----------------------------------------------
create table if not exists ai_management_proposals (
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
  created_by  uuid not null references ai_management_profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists ai_management_proposals_status_idx on ai_management_proposals(status);

-- 3. COMMENTS ------------------------------------------------
create table if not exists ai_management_comments (
  id          uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references ai_management_proposals(id) on delete cascade,
  author_id   uuid not null references ai_management_profiles(id),
  body        text not null,
  created_at  timestamptz not null default now()
);

-- 4. STATUS HISTORY ------------------------------------------
create table if not exists ai_management_status_history (
  id          uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references ai_management_proposals(id) on delete cascade,
  to_status   text not null,
  actor_id    uuid not null references ai_management_profiles(id),
  note        text,
  created_at  timestamptz not null default now()
);

-- 5. TIME SESSIONS -------------------------------------------
-- started_at / ended_at are server timestamps. Duration is derived;
-- an open session (ended_at is null) means a timer is running.
create table if not exists ai_management_time_sessions (
  id          uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references ai_management_proposals(id) on delete cascade,
  user_id     uuid not null references ai_management_profiles(id),
  started_at  timestamptz not null default now(),
  ended_at    timestamptz
);

-- 6. ATTACHMENTS ---------------------------------------------
-- Metadata for files uploaded with a proposal. The file bytes live in
-- Supabase Storage (bucket below); `path` points at the object.
create table if not exists ai_management_attachments (
  id          uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references ai_management_proposals(id) on delete cascade,
  name        text not null,
  path        text not null,
  size        bigint,
  kind        text not null default 'file',  -- 'slide' | 'file'
  uploaded_by uuid not null references ai_management_profiles(id),
  created_at  timestamptz not null default now()
);
alter table ai_management_attachments add column if not exists kind text not null default 'file';

-- ============================================================
--  ROW LEVEL SECURITY
--  Internal tool: every signed-in user can READ everything.
--  WRITES are gated by department so the browser can't skip steps.
-- ============================================================
alter table ai_management_profiles       enable row level security;
alter table ai_management_proposals      enable row level security;
alter table ai_management_comments       enable row level security;
alter table ai_management_status_history enable row level security;
alter table ai_management_time_sessions  enable row level security;
alter table ai_management_attachments    enable row level security;

-- profiles: read all; edit only your own (admins edit anyone).
drop policy if exists "read profiles" on ai_management_profiles;
create policy "read profiles" on ai_management_profiles for select using (auth.uid() is not null);
drop policy if exists "update own profile" on ai_management_profiles;
create policy "update own profile" on ai_management_profiles for update
  using (id = auth.uid() or ai_management_my_department() = 'admin');

-- proposals: everyone signed-in can read.
drop policy if exists "read proposals" on ai_management_proposals;
create policy "read proposals" on ai_management_proposals for select using (auth.uid() is not null);

-- only Operation (or admin) can create a proposal.
drop policy if exists "create proposals" on ai_management_proposals;
create policy "create proposals" on ai_management_proposals for insert
  with check (ai_management_my_department() in ('operation','admin') and created_by = auth.uid());

-- updates: the department that owns the CURRENT status may change it.
drop policy if exists "update proposals by owner" on ai_management_proposals;
create policy "update proposals by owner" on ai_management_proposals for update
  using (
    ai_management_my_department() = 'admin'
    or (status in ('draft','needs_revision','building','needs_rework') and ai_management_my_department() = 'operation')
    or (status in ('pending_approval','final_review')               and ai_management_my_department() = 'management')
    or (status in ('it_review','ready_to_deploy','deploying','live') and ai_management_my_department() = 'it')
  );

-- comments: read all; anyone signed-in can post as themselves.
drop policy if exists "read comments" on ai_management_comments;
create policy "read comments" on ai_management_comments for select using (auth.uid() is not null);
drop policy if exists "write comments" on ai_management_comments;
create policy "write comments" on ai_management_comments for insert with check (author_id = auth.uid());

-- status_history: read all; insert as yourself.
drop policy if exists "read history" on ai_management_status_history;
create policy "read history" on ai_management_status_history for select using (auth.uid() is not null);
drop policy if exists "write history" on ai_management_status_history;
create policy "write history" on ai_management_status_history for insert with check (actor_id = auth.uid());

-- time_sessions: read all; you manage your own sessions.
drop policy if exists "read sessions" on ai_management_time_sessions;
create policy "read sessions" on ai_management_time_sessions for select using (auth.uid() is not null);
drop policy if exists "insert sessions" on ai_management_time_sessions;
create policy "insert sessions" on ai_management_time_sessions for insert with check (user_id = auth.uid());
drop policy if exists "update sessions" on ai_management_time_sessions;
create policy "update sessions" on ai_management_time_sessions for update using (user_id = auth.uid());

-- attachments: read all; upload as yourself.
drop policy if exists "read attachments" on ai_management_attachments;
create policy "read attachments" on ai_management_attachments for select using (auth.uid() is not null);
drop policy if exists "write attachments" on ai_management_attachments;
create policy "write attachments" on ai_management_attachments for insert with check (uploaded_by = auth.uid());

-- ============================================================
--  STORAGE  (proposal attachments)
--  Private bucket; signed URLs are minted by the app for downloads.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('ai-management-attachments', 'ai-management-attachments', false)
on conflict (id) do nothing;

drop policy if exists "ai_mgmt read attachments" on storage.objects;
create policy "ai_mgmt read attachments" on storage.objects for select
  using (bucket_id = 'ai-management-attachments' and auth.uid() is not null);
drop policy if exists "ai_mgmt upload attachments" on storage.objects;
create policy "ai_mgmt upload attachments" on storage.objects for insert
  with check (bucket_id = 'ai-management-attachments' and auth.uid() is not null);

-- ============================================================
--  REALTIME
--  Let the browser receive live updates so every department sees
--  status changes, comments, and timers as they happen.
-- ============================================================
do $$
begin
  alter publication supabase_realtime add table ai_management_proposals;
  alter publication supabase_realtime add table ai_management_comments;
  alter publication supabase_realtime add table ai_management_status_history;
  alter publication supabase_realtime add table ai_management_time_sessions;
  alter publication supabase_realtime add table ai_management_attachments;
exception
  when duplicate_object then null;  -- already in the publication
end $$;

-- ============================================================
--  Done. Next: create users in Authentication, then set their
--  department in the ai_management_profiles table (default is
--  'operation'). In the app, click ⚙ Settings and paste your
--  Project URL + anon key — no code edits needed.
-- ============================================================
