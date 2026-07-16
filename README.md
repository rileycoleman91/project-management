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

## Creating logins

There's no self-service signup. Add staff accounts from the Supabase
dashboard: **Authentication → Users → Add user** (set an email + password,
or send an invite). Anyone with a Supabase Auth account can see and edit
every project — there's no per-customer scoping.

## Deploying

Push to the connected GitHub repo; Vercel deploys automatically. Set
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Environment Variables in
the Vercel project settings (Production + Preview) — they aren't read from
`.env.local` in that environment.
