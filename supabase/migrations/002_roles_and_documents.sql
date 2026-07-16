-- Applied 2026-07-16 via the Supabase MCP connector (apply_migration).
-- Adds role-tiered permissions (admin vs member) and file-upload support
-- for documents. Run after schema.sql + seed.sql on a fresh project.

-- ---- profiles + roles ----
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;
revoke all on function public.is_admin() from public, anon;

create policy "profiles_select_all" on profiles for select using (auth.role() = 'authenticated');
create policy "profiles_update_self_or_admin" on profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role <> old.role and not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end;
$$;

create trigger profiles_role_guard
  before update on profiles
  for each row execute function public.prevent_role_escalation();

revoke all on function public.prevent_role_escalation() from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'member');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Bootstrap: make the first user (whoever exists at migration time) an admin.
-- Adjust the WHERE clause if you need a specific account instead.
insert into profiles (id, email, role)
select id, email, 'admin' from auth.users
on conflict (id) do update set role = 'admin';

-- Replace the original "any authenticated user can do anything" policy with
-- granular ones: view/add/edit for any signed-in user, delete admin-only.
do $$
declare
  t text;
begin
  foreach t in array array['projects','schedule_phases','budget_items','punchlist_items','documents','team_members','project_team','alerts']
  loop
    execute format('drop policy if exists "authenticated read/write" on %I', t);
    execute format('create policy "select_authenticated" on %I for select using (auth.role() = ''authenticated'')', t);
    execute format('create policy "insert_authenticated" on %I for insert with check (auth.role() = ''authenticated'')', t);
    execute format('create policy "update_authenticated" on %I for update using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')', t);
    execute format('create policy "delete_admin_only" on %I for delete using (public.is_admin())', t);
  end loop;
end $$;

-- ---- document file uploads ----
alter table documents add column file_path text;

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents_select_authenticated" on storage.objects for select
  using (bucket_id = 'documents' and auth.role() = 'authenticated');

create policy "documents_insert_authenticated" on storage.objects for insert
  with check (bucket_id = 'documents' and auth.role() = 'authenticated');

create policy "documents_update_authenticated" on storage.objects for update
  using (bucket_id = 'documents' and auth.role() = 'authenticated')
  with check (bucket_id = 'documents' and auth.role() = 'authenticated');

create policy "documents_delete_admin_only" on storage.objects for delete
  using (bucket_id = 'documents' and public.is_admin());
