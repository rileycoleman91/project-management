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

## Roles

Every signed-in user can view, add, and edit everything. Only **admins** can
delete records or promote/demote other users' roles (Admin nav item, visible
to admins only). The first user that existed when migration 002 ran was
bootstrapped as admin; promote anyone else from that Admin page.

## Creating logins

There's no self-service signup. Add staff accounts from the Supabase
dashboard: **Authentication → Users → Add user** (set an email + password,
or send an invite). New accounts start as Member — an admin promotes them
from the in-app Admin page if they need delete/role-management access.

## Deploying

Push to the connected GitHub repo; Vercel deploys automatically. Set
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Environment Variables in
the Vercel project settings (Production + Preview) — they aren't read from
`.env.local` in that environment.
