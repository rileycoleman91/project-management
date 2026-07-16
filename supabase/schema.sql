-- Siteline schema
-- Run this once in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists "pgcrypto";

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  address text not null,
  client text not null,
  status text not null check (status in ('On Schedule', 'Behind Schedule', 'Pre-Construction', 'Punch List')),
  phase text not null,
  percent_complete int not null default 0 check (percent_complete between 0 and 100),
  start_date date not null,
  target_date date not null,
  budget_total numeric not null default 0,
  budget_spent numeric not null default 0,
  pm text,
  superintendent text,
  created_at timestamptz not null default now()
);

create table schedule_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  phase text not null,
  start_date date not null,
  end_date date not null,
  status text not null check (status in ('Complete', 'In Progress', 'Upcoming', 'Delayed')),
  trade text,
  sort_order int not null default 0
);

create table budget_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  category text not null,
  budgeted numeric not null default 0,
  actual numeric not null default 0
);

create table punchlist_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  item text not null,
  location text,
  trade text,
  status text not null default 'Open' check (status in ('Open', 'In Progress', 'Complete')),
  created_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  category text not null,
  doc_date date not null,
  status text not null check (status in ('Draft', 'Current', 'Approved', 'Signed'))
);

create table team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  type text not null check (type in ('Staff', 'Subcontractor')),
  trade text,
  phone text
);

create table project_team (
  project_id uuid not null references projects(id) on delete cascade,
  team_member_id uuid not null references team_members(id) on delete cascade,
  primary key (project_id, team_member_id)
);

create table alerts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  text text not null,
  level text not null check (level in ('high', 'medium', 'low')),
  created_at timestamptz not null default now()
);

-- Internal-staff-only access: any authenticated user can read/write everything.
-- No public/anon access, no per-customer row scoping.
alter table projects enable row level security;
alter table schedule_phases enable row level security;
alter table budget_items enable row level security;
alter table punchlist_items enable row level security;
alter table documents enable row level security;
alter table team_members enable row level security;
alter table project_team enable row level security;
alter table alerts enable row level security;

create policy "authenticated read/write" on projects for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated read/write" on schedule_phases for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated read/write" on budget_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated read/write" on punchlist_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated read/write" on documents for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated read/write" on team_members for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated read/write" on project_team for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated read/write" on alerts for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
