# Kaif ERP

Shop management for Kaif Pipes and Small Inventory Solutions. Next.js 15 + Supabase, deployed on Vercel.
Developer contract: [docs/CONTRACT.md](docs/CONTRACT.md).

## Setup

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, paste and run `supabase/migrations/0001_init.sql`, then `supabase/seed.sql` (demo data, optional).
3. In **Authentication → Users**, click **Add user**, enter the owner's email + password, tick *Auto Confirm*. (There is no sign-up page.)
4. Copy **Project Settings → API**: Project URL and `anon` public key.
5. Local: `cp .env.example .env.local`, fill both values, then `npm install && npm run dev`.
6. Vercel: import the repo, add env vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, deploy.
