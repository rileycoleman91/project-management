# Siteline

Construction project management dashboard — portfolio overview, per-project
schedule (Gantt), budget tracking, punch lists, documents, and team/subs.

## Stack

- React + Vite, deployed to Vercel
- Supabase (Postgres + Auth) — internal-staff-only login, no public signup

## Local development

```
npm install
npm run dev
```

Requires a `.env.local` (copy `.env.local.example`):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key from Supabase dashboard>
```

## Database setup

In the Supabase SQL editor, run in order:

1. `supabase/schema.sql` — creates tables and row-level security policies
2. `supabase/seed.sql` — loads the five demo projects (safe to skip/delete
   once real project data is entered)
3. `supabase/migrations/002_roles_and_documents.sql` — adds admin/member
   roles and file-upload support for documents
4. `supabase/migrations/003_rooms_and_materials.sql` — materials/selections
   tracking, scoped per room per project
5. `supabase/migrations/004_materials_phase_and_budget_links.sql` — optional
   phase/budget-category links + cost on materials

Also deploy the edge function (from the Supabase CLI, or paste
`supabase/functions/admin-create-user/index.ts` into a new Edge Function in
the dashboard): `supabase functions deploy admin-create-user`. It needs no
extra secrets — `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` are auto-injected for every edge function in a
project.

## Roles

Every signed-in user can view, add, and edit everything. Only **admins** can
delete records or promote/demote other users' roles (Admin nav item, visible
to admins only). The first user that existed when migration 002 ran was
bootstrapped as admin; promote anyone else from that Admin page.

## Creating logins

Admins can create staff accounts directly from the in-app **Admin** page
(New User → email + temporary password + role) — this calls the
`admin-create-user` edge function, which is the only thing allowed to use
the service-role key. Share the email/temporary password with the new user
directly; there's no invite-email flow. Accounts can still be created from
the Supabase dashboard (**Authentication → Users → Add user**) too, if
preferred — those start as Member until an admin promotes them.

## Deploying

Push to the connected GitHub repo; Vercel deploys automatically. Set
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Environment Variables in
the Vercel project settings (Production + Preview) — they aren't read from
`.env.local` in that environment.
