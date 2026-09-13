# Expense Tracker Web App — Build Specification

**Purpose of this document:** Hand this to an AI coding assistant (or a developer) to build a multi-user personal finance / expense tracker web app, deployed on Vercel.

---

## 0. V1 Implementation Status (as deployed)

This section reflects what was actually built and deployed, compared against the spec below. Deployed at your Vercel URL, database on Neon, code on GitHub (`dhareeshsk/expense-tracker`).

**Deviations from the spec (deliberate, working as intended):**
- **Prisma pinned to 6.19.3**, not the latest — Prisma 8 is a release candidate with breaking config changes (drops the classic `datasource url` syntax in `schema.prisma`); 6.x is the last stable line matching this spec's simple setup.
- **PWA built manually** (manifest + hand-rolled service worker) rather than via `next-pwa` — that package is unmaintained and incompatible with Turbopack, which Next 16 uses by default. This was the spec's own documented fallback option.
- **React Hook Form is installed but unused** — all forms use plain controlled `useState` inputs instead. Validation still happens (client-side basic checks + server-side Zod on every API route), just not via RHF. Either wire it up or remove the dependency.
- **Auth.js v5 (beta)** used — same library referred to as "NextAuth.js" in the spec, just the current major version.
- Extra model not in the original schema sketch: **`HouseholdInvite`** (needed to support the "invite by email → accept/decline" flow described in §3.2). Also added `@@unique([userId, name])` on `Category` and cascade deletes throughout.

**Real gaps — spec called for these, not yet built:**
1. **Dashboard line/trend chart** — §3.6 asks for pie + bar + line. Only pie (expense by category) and bar (12-month income/expense/investment comparison) exist.
2. **Budget progress bars on the dashboard itself** — §3.6 wants per-category progress bars there. Currently the dashboard only shows alert *banners*; the actual progress bars live on the separate `/budgets` page.
3. **Recent transactions list on the dashboard** — §3.6 wants a quick-edit/delete list on the dashboard. That only exists on the `/transactions` page.
4. **Month/year picker + filters on the dashboard** — the API (`/api/dashboard-summary`) already accepts `?month=&year=`, but the dashboard UI never exposes a picker; it always shows the current month.
5. **Category reorder** — §3.7 mentions add/edit/delete/reorder; only add/edit/delete exist.

**Fully implemented, matching spec:**
- Email/password auth (§3.1), per-user data isolation via `userId` scoping on every query, route protection.
- Households: create/rename/leave, email invites (accept/decline), shared transactions, per-household category budgets, shared-spend summary by category and by member (§3.2).
- Transaction CRUD including private/shared flag, filters by type/category (§3.3).
- Category CRUD with color, default seed set on signup (§3.4).
- Per-category budgets with 80%/100% in-app alert banners; household budgets too (§3.5).
- Settings: profile (name/email) + password change (§3.7).
- PWA: manifest, icons, offline fallback page, service worker that never caches `/api/*` (§3.8).
- INR fixed as currency, not hardcoded into logic (§3.7).

---

## 1. Overview

A web application where multiple users can sign up and independently track their **income**, **expenses**, and **investments**, categorize spending, set monthly limits per category, get alerted when they're close to or over a limit, and view their financial activity through a dashboard with charts.

- **Multi-tenant:** Each user has their own private account and data (not shared household data, unless specified otherwise later).
- **Frontend + Backend:** Next.js (App Router) full-stack app.
- **Deployment target:** Vercel.

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14+ (App Router) | Full-stack: API routes / Server Actions + React frontend |
| Language | TypeScript | Type safety across frontend/backend |
| Styling | Tailwind CSS | Fast, consistent styling; works well with Vercel |
| Auth | NextAuth.js (Auth.js) | Email/password sign-in for v1, multi-user sessions |
| Database | PostgreSQL (e.g. Neon or Supabase — both have Vercel-friendly free tiers) | Relational data fits transactions/categories/budgets/households well |
| ORM | Prisma | Type-safe DB access, easy migrations |
| Charts | Recharts or Chart.js | Pie charts, bar charts, line/trend charts |
| Forms/validation | React Hook Form + Zod | Input validation on transaction/budget forms |
| Hosting | Vercel | Matches current deployment target |
| PWA | `next-pwa` (or manual manifest + service worker) | Installable app + offline shell, deploys fine on Vercel |

---

## 3. Core Features

### 3.1 Authentication & Multi-User Support
- Sign up / log in / log out — **email + password only for v1** (no OAuth).
- Each user's data (transactions, categories, budgets) is **private by default** — scoped by `userId` on every query.
- Session-based route protection (dashboard and all data routes require login).

### 3.2 Household / Sharing (family members)
Users can optionally share specific spending with family — e.g. a joint EMI, rent, or a shared credit card bill — without making their whole account shared.

- A user can create a **Household** (or "Group") and invite other users to it (via email invite → they accept to join).
- When adding/editing a **transaction**, the user can mark it as **"Shared with [Household name]"** instead of keeping it private.
- Shared transactions are visible to all members of that household, but each member's *private* transactions remain visible only to them.
- A household has its own shared view: total shared spend, split by category, and (nice-to-have for v2) a simple "who owes whom" split if members mark their share/percentage on a transaction.
- A user can belong to more than one household (e.g. "Family" and "Roommates") and choose which household a transaction is shared to.
- Categories and budgets stay per-user by default; a **shared budget per household per category** (e.g. household EMI limit) is a reasonable v1 addition since it directly supports the EMI/shared-expense use case.

### 3.3 Transactions
Users can log three transaction types:
- **Income** — salary, freelance, other inflows.
- **Expense** — money spent.
- **Investment** — money moved into savings/investments (tracked separately from spending).

Each transaction has:
- Amount
- Type (income / expense / investment)
- Category (see 3.3)
- Date
- Note/description (optional)
- Payment method (optional: cash, card, UPI, bank transfer)
- Shared flag (private / shared with a specific household — see 3.2)

CRUD: create, edit, delete, list (with filters by date range, type, category, shared/private).

### 3.4 Categories
Default categories (pre-seeded, editable):
- EMI
- Groceries
- Travel
- Credit Card Bills
- Utilities (suggested addition)
- Others

**Custom categories:** Users can add/edit/delete their own categories, each with:
- Name
- Icon or color (for chart legibility)
- Type it applies to (usually expense, but allow flexibility)

### 3.5 Budgets / Limits & Alerts
- Users set a **monthly limit per category** (e.g. Groceries: ₹8,000/month). Household-level limits also supported for shared categories (e.g. shared EMI).
- App tracks running total spent per category for the current month.
- **Alert thresholds** (configurable, default suggestion):
  - 80% of limit reached → warning notification
  - 100%+ of limit reached → over-budget alert
- **v1 scope: in-app banners/toasts only** — no email or push notifications for now.
- Overall monthly spending limit (across all categories) is a nice-to-have in addition to per-category limits.

### 3.6 Dashboard
- **Summary cards:** Total income, total expenses, total invested, net balance — for the selected month.
- **Pie chart:** Expense breakdown by category (current month).
- **Bar chart:** Monthly comparison (income vs expense vs investment) over last 6–12 months.
- **Line/trend chart:** Spending trend over time.
- **Budget progress bars:** Per category, showing spent vs limit (color-coded: green/yellow/red).
- **Recent transactions list** with quick edit/delete.
- Filters: month/year picker, category filter, transaction-type filter, private/shared/household filter.
- A **household view** (if the user belongs to one) showing combined shared spending and each member's contribution.

### 3.7 Settings
- Manage categories (add/edit/delete/reorder).
- Manage budgets/limits per category (and household budgets, if applicable).
- Manage households: create, invite members, leave, rename.
- Manage profile (name, email, password).
- Currency: **fixed to INR for v1** (build the amount fields so currency isn't hardcoded into logic, making it easy to make configurable later).

### 3.8 PWA (installable app)
Yes — this fits naturally on top of a Next.js app and works fine with Vercel hosting:
- Add a `manifest.json` (app name, icons, theme color) and a service worker (via `next-pwa` plugin, which wraps Next.js's build output).
- Gives users "Add to Home Screen" on mobile and desktop installs, an app-like icon/splash screen, and basic offline caching of the shell (won't work fully offline since data comes from the DB, but the UI shell and last-loaded data can be cached).
- No extra backend or app-store submission needed — it's still just the same web app, just installable.
- Low effort to add; can be done after the core app works, so it doesn't need to block v1 functionality.

---

## 4. Data Model (Prisma schema sketch)

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  passwordHash  String
  createdAt     DateTime  @default(now())
  transactions  Transaction[]
  categories    Category[]
  budgets       Budget[]
  memberships   HouseholdMember[]
}

model Household {
  id          String   @id @default(cuid())
  name        String
  createdAt   DateTime @default(now())
  members     HouseholdMember[]
  transactions Transaction[]
  budgets     HouseholdBudget[]
}

model HouseholdMember {
  id          String    @id @default(cuid())
  householdId String
  household   Household @relation(fields: [householdId], references: [id])
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  joinedAt    DateTime  @default(now())

  @@unique([householdId, userId])
}

model Category {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  name      String
  color     String?
  icon      String?
  isDefault Boolean  @default(false)
  transactions Transaction[]
  budgets   Budget[]
}

model Transaction {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])
  type        TransactionType // income | expense | investment
  amount      Decimal
  date        DateTime
  note        String?
  paymentMethod String?
  householdId String?     // null = private; set = shared with this household
  household   Household?  @relation(fields: [householdId], references: [id])
  createdAt   DateTime @default(now())
}

model Budget {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])
  monthlyLimit Decimal
  alertThreshold Int   @default(80) // percentage
}

model HouseholdBudget {
  id             String    @id @default(cuid())
  householdId    String
  household      Household @relation(fields: [householdId], references: [id])
  categoryName   String    // shared categories referenced by name (e.g. "EMI")
  monthlyLimit   Decimal
  alertThreshold Int       @default(80)
}

enum TransactionType {
  income
  expense
  investment
}
```

---

## 5. Suggested Pages / Routes

| Route | Purpose |
|---|---|
| `/login`, `/signup` | Auth |
| `/dashboard` | Main overview: summary cards + charts |
| `/transactions` | Full transaction list + add/edit/delete |
| `/budgets` | Manage per-category limits |
| `/categories` | Manage custom categories |
| `/households` | Create/join households, view shared spending, invite members |
| `/settings` | Profile, preferences |

API (or Server Actions) needed:
- `POST/GET/PUT/DELETE /api/transactions`
- `POST/GET/PUT/DELETE /api/categories`
- `POST/GET/PUT/DELETE /api/budgets`
- `POST/GET/PUT/DELETE /api/households`
- `POST /api/households/:id/invite`
- `GET /api/dashboard-summary?month=&year=`
- `GET /api/households/:id/summary?month=&year=`

---

## 6. Non-Functional Requirements
- Responsive design (mobile + desktop).
- Data isolation per user (critical — enforce `userId` scoping on every query, not just at the UI level).
- Environment variables for DB connection string and auth secrets, managed via Vercel project settings.
- Basic input validation (no negative amounts, required fields, etc.).

---

## 7. Suggested Build Order (for whoever/whatever implements this)
1. Scaffold Next.js + TypeScript + Tailwind project.
2. Set up Prisma + Postgres (Neon/Supabase), run initial migration with the schema above.
3. Implement auth (NextAuth) with email/password.
4. Build Category CRUD (seed default categories on signup).
5. Build Transaction CRUD (including private vs. shared-with-household flag).
6. Build Household create/invite/join flow.
7. Build Budget CRUD (personal + household) + limit-checking logic.
8. Build Dashboard with summary cards + charts (pie/bar/line), including household view.
9. Add in-app alert banners for budget thresholds.
10. Polish responsive UI, add filters.
11. Add PWA support (manifest + service worker via `next-pwa`).
12. Deploy to Vercel, connect production DB, set env vars.

---

## 8. V1 Decisions (confirmed)
- **Accounts:** Private by default; users can optionally share individual transactions (e.g. EMI, rent) with a household group they create or join.
- **Sharing model:** Combined total only — a shared transaction just adds to the household's shared total per category. No per-member split or "who owes whom" tracking in v1.
- **Alerts:** In-app banners only — no email/push for v1.
- **Currency:** INR, fixed for v1 (not user-configurable yet).
- **Auth:** Email + password only — no OAuth for v1.
- **PWA:** Included — installable via manifest + service worker, works fine on Vercel.

## 9. Fast-Follow (v2 candidates, not needed now)
- **Split tracking / settlements:** who-owes-whom balances per household member, with a way to mark a balance as settled. The schema already stores `householdId` on each transaction, so this can be added later via a `paidByUserId` field + a `splits` sub-table — no rework of v1 needed.
- Whether a household member can edit/delete a shared transaction someone else added, or only the original creator (decide once split tracking is in scope, since it affects who "owns" a shared entry).
- Dashboard line/trend chart, dashboard budget progress bars, dashboard recent-transactions list, dashboard month/year picker, category reorder (see §0 — deferred from v1, not full v2 scope, just not built yet).
