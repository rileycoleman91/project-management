-- Applied 2026-07-16 via the Supabase MCP connector (apply_migration).
-- Replaces the two-tier admin/member model with three tiers:
--   viewer: read-only
--   editor: full add/edit/delete on all content, but not user management
--   admin:  everything editor can do, plus creating users and managing roles

update profiles set role = 'editor' where role = 'member';

alter table profiles drop constraint profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('admin', 'editor', 'viewer'));
alter table profiles alter column role set default 'viewer';

-- New users default to the least-privileged tier; an admin promotes them.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'viewer');
  return new;
end;
$$;

-- Editors and admins can add/edit/delete content; viewers can only read.
-- (User management itself stays admin-only via is_admin(), unchanged.)
create or replace function public.can_edit()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'editor')
  );
$$;

grant execute on function public.can_edit() to authenticated;
revoke all on function public.can_edit() from public, anon;

do $$
declare
  t text;
begin
  foreach t in array array['projects','schedule_phases','budget_items','punchlist_items','documents','team_members','project_team','alerts','rooms','materials']
  loop
    execute format('drop policy if exists "insert_authenticated" on %I', t);
    execute format('drop policy if exists "update_authenticated" on %I', t);
    execute format('drop policy if exists "delete_admin_only" on %I', t);
    execute format('create policy "insert_can_edit" on %I for insert with check (public.can_edit())', t);
    execute format('create policy "update_can_edit" on %I for update using (public.can_edit()) with check (public.can_edit())', t);
    execute format('create policy "delete_can_edit" on %I for delete using (public.can_edit())', t);
  end loop;
end $$;

-- Same tightening for the documents storage bucket.
drop policy if exists "documents_insert_authenticated" on storage.objects;
drop policy if exists "documents_update_authenticated" on storage.objects;
drop policy if exists "documents_delete_admin_only" on storage.objects;

create policy "documents_insert_can_edit" on storage.objects for insert
  with check (bucket_id = 'documents' and public.can_edit());

create policy "documents_update_can_edit" on storage.objects for update
  using (bucket_id = 'documents' and public.can_edit())
  with check (bucket_id = 'documents' and public.can_edit());

create policy "documents_delete_can_edit" on storage.objects for delete
  using (bucket_id = 'documents' and public.can_edit());
