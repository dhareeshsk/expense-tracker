# Expense Tracker

A multi-user personal finance tracker (income, expenses, investments) built with
Next.js App Router, Prisma, PostgreSQL, and NextAuth (Auth.js) credentials login.

## Status

**Implemented (v1 complete):**
- Email/password sign up & login (NextAuth v5, JWT sessions), route protection via `src/proxy.ts`
- Per-user data isolation on every query (`userId` scoping)
- Categories: default set seeded on signup, custom create/edit/delete
- Transactions: create/edit/delete with type, amount, category, date, note, payment method, filters, and optional household sharing
- Budgets: per-category monthly limits with 80%/100% in-app alert banners on the dashboard
- Households: create/rename/leave, email invites (accept/decline), shared transactions, per-household category budgets, shared-spend summary (by category and by member)
- Dashboard: monthly summary cards, expense-by-category pie chart, 12-month income/expense/investment bar chart, budget alert banners
- Settings: profile (name/email) and password change
- PWA: manifest + hand-rolled service worker (caches the static shell, offline fallback page, never caches `/api/*` so financial data stays live)

**Fast-follow (v2, per spec §9):**
- Split tracking / settlements (who-owes-whom) for household expenses
- Household transaction edit permissions (creator-only vs any member)

## Local development

Requires Docker (for local Postgres) and Node 20+.

```bash
docker compose up -d          # starts local Postgres on localhost:5432
npx prisma migrate dev        # applies schema (already run once; re-run after schema changes)
npm run dev                   # http://localhost:3000
```

`.env` already contains a working local `DATABASE_URL` and a **dev-only** `AUTH_SECRET`.
Before deploying anywhere real:
- Point `DATABASE_URL` at your hosted Postgres (Neon/Supabase).
- Replace `AUTH_SECRET` with a strong random value (`openssl rand -base64 32`).
- Set `NEXTAUTH_URL` to your production URL.

## Tech stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS · Prisma 6 ·
PostgreSQL · NextAuth v5 (credentials) · Recharts · Zod

## Deploy on Vercel

Set `DATABASE_URL`, `AUTH_SECRET`, and `NEXTAUTH_URL` as project environment
variables, then connect the repo. Run `prisma migrate deploy` against the
production database as part of your deploy step.
