-- Applied 2026-07-16 via the Supabase MCP connector (apply_migration).
-- Materials/selections tracking, scoped per room within a project.

create table rooms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table materials (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  item text not null,
  manufacturer text,
  color text,
  details text,
  status text not null default 'Selected' check (status in ('Selected', 'Ordered', 'Delivered', 'Installed')),
  created_at timestamptz not null default now()
);

create index materials_project_id_idx on materials(project_id);
create index materials_room_id_idx on materials(room_id);

alter table rooms enable row level security;
alter table materials enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['rooms','materials']
  loop
    execute format('create policy "select_authenticated" on %I for select using (auth.role() = ''authenticated'')', t);
    execute format('create policy "insert_authenticated" on %I for insert with check (auth.role() = ''authenticated'')', t);
    execute format('create policy "update_authenticated" on %I for update using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')', t);
    execute format('create policy "delete_admin_only" on %I for delete using (public.is_admin())', t);
  end loop;
end $$;
