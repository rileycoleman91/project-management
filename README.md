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
6. `supabase/migrations/005_three_tier_roles.sql` — replaces admin/member
   with the three-tier viewer/editor/admin model described below

Also deploy the edge function (from the Supabase CLI, or paste
`supabase/functions/admin-create-user/index.ts` into a new Edge Function in
the dashboard): `supabase functions deploy admin-create-user`. It needs no
extra secrets — `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` are auto-injected for every edge function in a
project.

## Roles

Three tiers, each including everything the tier below it can do:

- **Viewer** — read-only. Add/edit/delete controls don't render for them,
  and it's enforced server-side too (RLS), not just hidden in the UI.
- **Editor** — full add/edit/delete on all project content (projects,
  schedules, budgets, punch lists, documents, materials, team). Cannot
  create users or change anyone's role.
- **Admin** — everything Editor can do, plus the Admin page: creating staff
  accounts and promoting/demoting roles.

New accounts start as Viewer by default; promote them from the Admin page.

## Creating logins

Admins can create staff accounts directly from the in-app **Admin** page
(New User → email + temporary password + role) — this calls the
`admin-create-user` edge function, which is the only thing allowed to use
the service-role key. Share the email/temporary password with the new user
directly; there's no invite-email flow. Accounts can still be created from
the Supabase dashboard (**Authentication → Users → Add user**) too, if
preferred — those also start as Viewer until an admin promotes them.

## Deploying

Push to the connected GitHub repo; Vercel deploys automatically. Set
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Environment Variables in
the Vercel project settings (Production + Preview) — they aren't read from
`.env.local` in that environment.
