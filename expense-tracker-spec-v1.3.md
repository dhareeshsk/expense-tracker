# Expense Tracker Web App — Build Specification (v1.3)

**Purpose of this document:** Hand this to an AI coding assistant (or a developer) to build a multi-user personal finance / expense tracker web app, deployed on Vercel with a Neon Postgres backend. v1.1 added public-facing pages, account management, and a super admin layer. v1.2 added a native-app-quality motion/interaction pass. v1.3 adds a standalone calculators suite, push notifications, custom reminders, dashboard drill-down/comparison analytics, stricter form/validation rules across Transactions and Budgets, and backend scalability groundwork for Neon + Vercel at higher user counts.

---

## 0. What's New in v1.1

| Area | Change |
|---|---|
| Layout | Global **Header** and **Footer** added to all pages |
| Branding | Site **name/logo** — text-based logo for now (image logo later), editable from admin |
| Public site | New **Landing Page** for logged-out visitors, with Login/Signup in the header |
| Auth flow | **Logout** now redirects to the Landing Page (not the login screen) |
| Account | **Show Profile** page, **Change Password**, **Forgot Password** flow |
| Tools | Standalone **Expense Calculator** (quick totals, no login/save required) |
| Admin | **Super Admin Dashboard** — view all users, all transaction/account details, update logo, manage footer content |
| Design | Mobile-first responsiveness pass (primary usage is the installed PWA on mobile) — plus a proper color system instead of default/generic tones |

## 0.1 What's New in v1.2

| Area | Change |
|---|---|
| Navigation | **Bottom navigation bar** replaces top nav links on mobile (Dashboard, Transactions, Budgets, Households) — native app pattern |
| Quick add | **Floating action button (FAB)** for "Add Transaction," persistent on relevant screens |
| Motion | Page transitions, animated number counters on summary cards, animated budget progress bar fills, skeleton loading states, animated toast/banner alerts |
| Interaction | Swipe-to-delete on transaction list items, pull-to-refresh on dashboard/transaction list, tap feedback (ripple/highlight) on interactive elements |
| Visual depth | Subtle shadows/elevation and card-based layering instead of flat, static surfaces |
| Accessibility | All motion respects `prefers-reduced-motion` |

See §11 for full detail. Everything from v1.0 and v1.1 stays as-is except where §11 explicitly changes the header/nav structure.

## 0.2 What's New in v1.3

| Area | Change |
|---|---|
| Calculators | New **Calculators hub** (`/tools/calculators`) — tile grid, works for logged-out and logged-in users. Two calculators for now: **Expense Splitter** (trips/room rent/group expenses) and **Budget Calculator** (daily/monthly/yearly). Save & resume; logged-in users can save multiple named calculators |
| Notifications | **Notification bar** with real push notifications for household activity and budget-limit alerts — supersedes v1.0's "in-app banner only" decision (see §17) |
| Reminders | New **Custom Reminders** feature — date, category, amount, missed/paid/pending status (EMI, electricity, rent, etc.) |
| Global UI | Loaders on every action that takes time; success/failure toasts everywhere; buttons disabled until all mandatory fields are valid; consistent content-based icons (income/expense/investment/transaction types) throughout, more native-app in feel |
| Dashboard | Day/month/year filters with this-period-vs-last-period comparison on modern charts; clicking a summary tile or a pie-chart segment drills into the filtered transaction list |
| Transactions | All fields mandatory except Note; **Transaction Type becomes user-customizable** (no longer a fixed enum); server-side pagination + search (API-driven, not client-side filtering) for performance at scale; delete requires a yes/no confirmation |
| Budgets | All fields mandatory; edit option added |
| Households | Deferred — no changes in v1.3, revisit next version |
| Backend/scale | Connection pooling for Neon + Vercel serverless, pagination/indexing discipline, background jobs for reminders/push, groundwork so the app holds up as user count grows (see §16) |

---

---

## 1. New Pages & Routing

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | **Landing page** — marketing/intro content, header shows Login / Sign Up (see §2) |
| `/login` | Public | Existing login |
| `/signup` | Public | Existing signup |
| `/forgot-password` | Public | Enter email → request reset link |
| `/reset-password/:token` | Public (token-gated) | Set new password from emailed link |
| `/profile` | Authenticated | View/edit name, email; entry point to change password |
| `/tools/calculator` | Public (works logged-out too) | Standalone expense calculator, no save |
| `/admin` | Super Admin only | Admin dashboard home |
| `/admin/users` | Super Admin only | List/search all users, view their account + activity summary |
| `/admin/users/:id` | Super Admin only | Single user detail view (their transactions/budgets/households at a glance) |
| `/admin/settings` | Super Admin only | Update site name/logo, edit footer content |

Existing routes (`/dashboard`, `/transactions`, `/budgets`, `/categories`, `/households`, `/settings`) are unchanged and remain behind login.

---

## 2. Header & Footer (global layout)

Applied to every page via a shared layout component; content adapts by auth state.

**Header — logged out:**
- Site name (text logo, e.g. "ExpenseTrack") on the left, linking to `/`
- **Login** and **Sign Up** buttons on the right

**Header — logged in (desktop):**
- Site name/logo on the left, linking to `/dashboard`
- Nav links: Dashboard, Transactions, Budgets, Households
- Right side: avatar/name dropdown → Profile, Settings, **Logout**
- Super Admins additionally see an **Admin** link in this dropdown

**Header — logged in (mobile, updated in v1.2):**
- Site name/logo only, plus the avatar/profile dropdown (Profile, Settings, Logout, Admin for Super Admins) — the Dashboard/Transactions/Budgets/Households links move to the **bottom navigation bar** described in §11, they are not duplicated in the header on mobile

**Logout behavior:** clears the session and redirects to `/` (Landing Page), not back to `/login`.

**Footer (all pages):**
- Site name
- A short line of footer text/links (About, Contact, Privacy — placeholder copy for now)
- Footer text is editable by a Super Admin (see §5) rather than hardcoded, so it can be updated without a redeploy

---

## 3. Landing Page (`/`)

For logged-out visitors. Content sections:
1. **Hero** — app name, one-line value proposition (e.g. "Track income, expenses, and shared bills — in one place"), primary CTA button → Sign Up, secondary → Login
2. **Feature highlights** (3–4 short cards): categorized expense tracking, budget alerts, household/shared expense splitting, install-as-app (PWA)
3. **How it works** — 3-step strip: Sign up → Log transactions → See your dashboard
4. **Final CTA** — Sign Up button again before the footer

Keep it a single scrollable page for v1.1 — no separate pricing/blog pages needed.

---

## 4. Account Management

### 4.1 Show Profile (`/profile`)
- Display name, email (read-only or editable per your call — recommend allowing name edits, keep email fixed for v1.1 to avoid re-verification flow)
- Link/button to **Change Password**
- Shows which household(s) the user belongs to (read-only summary, links to `/households` for management)

### 4.2 Change Password
- Requires current password + new password + confirm — while already logged in
- Validate new password strength (reuse the same Zod validation approach as signup)

### 4.3 Forgot Password
- `/forgot-password`: user enters email → if it exists, generate a signed, time-limited reset token and email a reset link (`/reset-password/:token`)
- `/reset-password/:token`: validate token, let user set a new password, then redirect to `/login`
- **New dependency this introduces:** an email-sending service (e.g. Resend, or the NextAuth email provider) — v1.0 explicitly had no email/push notifications, so this is the first place the stack needs outbound email. Worth confirming which provider before building.

---

## 5. Super Admin Dashboard

A new role, not a new user type — add a `role` field to `User` (`USER` default, `SUPER_ADMIN` for admins). No self-serve way to become an admin; seed/assign manually (e.g. via a seed script or direct DB update).

**`/admin` (home):** at-a-glance counts — total users, total households, total transactions logged, users active this month.

**`/admin/users`:** searchable/sortable table of all users — name, email, signup date, household count, transaction count. Row click → `/admin/users/:id`.

**`/admin/users/:id`:** read-only detail view of a single user's account: their profile info, their categories, their budgets, their households, and a paginated list of their transactions. This is for support/debugging visibility — not for the admin to edit another user's financial data in v1.1.

**`/admin/settings`:**
- **Update logo:** for now this is just editing the site **name text** used in the header/footer (image upload is a fast-follow, not v1.1 scope)
- **Footer details:** editable text fields for the footer copy/links described in §2

Route protection: every `/admin/*` route must check `role === SUPER_ADMIN` server-side (not just hide the nav link) — a regular user hitting the URL directly should get redirected/403'd.

---

## 6. Expense Calculator (`/tools/calculator`)

A lightweight, standalone utility — deliberately **not** tied to the transaction/budget system:
- Add line items (label + amount), running total updates live
- Optional: group by a simple category dropdown for a quick breakdown, but nothing is saved to the database
- Works without login (useful as a quick public utility / low-friction way for a visitor to see the app is useful before signing up)
- No persistence — refresh clears it. If someone wants it saved, that's just... a transaction, via the real flow.

---

## 7. Data Model Additions (Prisma)

```prisma
enum Role {
  USER
  SUPER_ADMIN
}

model User {
  id                String    @id @default(cuid())
  name              String?
  email             String    @unique
  passwordHash      String
  role              Role      @default(USER)
  resetToken        String?
  resetTokenExpiry  DateTime?
  createdAt         DateTime  @default(now())
  transactions      Transaction[]
  categories        Category[]
  budgets           Budget[]
  memberships       HouseholdMember[]
}

model SiteSettings {
  id          String   @id @default("singleton")
  siteName    String   @default("ExpenseTrack")
  footerText  String   @default("")
  updatedAt   DateTime @updatedAt
}
```

`SiteSettings` is a singleton row (fixed id) holding the editable site name and footer copy that `/admin/settings` writes to and the global layout reads from. All other v1.0 models (`Household`, `HouseholdMember`, `Category`, `Transaction`, `Budget`, `HouseholdBudget`) are unchanged.

---

## 8. Responsive & Visual Design Pass

Since the app is used primarily as an **installed PWA on mobile**, treat mobile as the primary layout target and scale up to desktop — not the reverse.

- Header collapses to a compact bar with a hamburger/menu for nav links and the profile dropdown on small screens
- Dashboard summary cards stack vertically on mobile, grid out from tablet width up
- Charts (pie/bar/line) resize to full container width on mobile; avoid fixed pixel widths
- Forms (transaction add/edit, budgets) use full-width single-column inputs on mobile with adequately large touch targets
- Bottom-safe-area padding for PWA mode (avoid content sitting under mobile home-indicator/notch areas)

**Color system:** move off default/generic component-library colors toward an intentional palette — this is a good fit for the `frontend-design` skill (Anthropic's official skill) and/or Impeccable's design rules if installed in your coding environment, so the AI assistant applies real design judgment (a defined primary/accent pair, consistent semantic colors for budget status — under/near/over limit — and no default-template gradients or overused fonts) rather than defaulting to generic Tailwind palette values.

**Tooling decision:** this design pass is done using **`anthropics/claude-code`** (the official Anthropic CLI) with the **`frontend-design`** skill installed (`claude plugin add anthropics/frontend-design`, or the skill file dropped into `.claude/skills/frontend-design/SKILL.md` so it's committed with the repo). Run it directly against the codebase, in scoped passes rather than one broad "make it look better" prompt:
1. Color tokens + `tailwind.config.ts` — define the primary/accent pair and budget-status semantic colors first, everything else builds on this.
2. Header, Footer, Landing Page — highest-visibility surfaces, do these next.
3. Dashboard summary cards, charts, budget progress bars.
4. Forms (transaction/budget add-edit) + the mobile responsiveness items above.

Each prompt should explicitly state the app is used **mobile-first as an installed PWA**, since the assistant will otherwise default to a desktop-first layout. Review each pass (screenshot or dev server) before moving to the next.

---

## 9. Updated Build Order (v1.1 delta — do after v1.0 core is working)

1. Add `role` to `User` model + `SiteSettings` model, migrate.
2. Build global Header/Footer layout components, wired to `SiteSettings` and auth state.
3. Build Landing Page (`/`), wire Login/Sign Up buttons and logout redirect.
4. Build Profile page + Change Password flow.
5. Set up an email provider; build Forgot Password + Reset Password flow.
6. Build Expense Calculator as a standalone, no-auth-required page.
7. Add Super Admin role check middleware/guard.
8. Build `/admin`, `/admin/users`, `/admin/users/:id`, `/admin/settings`.
9. Responsive pass across all existing v1.0 pages, mobile-first.
10. Color system pass via `anthropics/claude-code` + the `frontend-design` skill, done in the four scoped passes described in §8 (tokens → header/footer/landing → dashboard/charts → forms/responsiveness) rather than as one prompt.
11. Re-test PWA install + offline shell behavior with the new pages included.
12. Deploy to Vercel; add the new email-provider env vars alongside existing DB/auth secrets.

---

## 10. Open Decisions for v1.1

- **Email provider** for password reset (Resend, SendGrid, or NextAuth's built-in email provider) — needs picking before §4.3 can be built.
- **Logo:** confirmed text-only for now; image upload is out of scope for v1.1.
- **Admin editing power:** confirmed read-only for user data in `/admin/users/:id` for v1.1 — no edit/delete-other-user actions yet.
- **Email verification on signup:** not explicitly requested; assuming still out of scope unless you want it added alongside the new email provider.

---

## 11. Native-App Motion & Interaction Pass (v1.2)

Goal: the app should feel like a premium native iOS/Android app, not a web dashboard — applied on top of the v1.1 color/responsive pass, using `anthropics/claude-code` with the `frontend-design` skill.

### 11.1 Structural navigation changes
- **Bottom navigation bar** (mobile only): Dashboard, Transactions, Budgets, Households — replaces the top nav links on mobile (desktop keeps the existing top nav from §2)
- **Floating action button (FAB):** bottom-right, persistent on Dashboard/Transactions/Budgets — opens "Add Transaction"

### 11.2 Motion
- Page/route transitions: slide or fade, matching native navigation feel
- Animated number counters on dashboard summary cards (income/expense/balance) when values load or update
- Budget progress bars animate filling in on load rather than appearing at final width instantly
- Skeleton loading states in place of blank screens or bare spinners while data fetches
- Toast/banner alerts (budget threshold warnings) slide/fade in and out rather than appearing/disappearing instantly

### 11.3 Interactivity
- Swipe-to-delete (or swipe actions) on transaction list items
- Pull-to-refresh on the Dashboard and Transactions list
- Tap/press feedback (ripple or highlight state) on all interactive elements, matching platform conventions
- Micro-interactions (subtle scale/opacity) on buttons, cards, and toggles instead of default browser states

### 11.4 Visual depth
- Card-based layering with subtle shadows/elevation, consistent rounded corners — not flat/static surfaces
- Consistent icon system (pick outline or filled, not mixed) throughout

### 11.5 Constraints
- Use CSS/Tailwind transitions or a lightweight animation library already common in Next.js (e.g. Framer Motion) — no heavy new dependencies
- Respect `prefers-reduced-motion` for all animation
- Mobile is the priority; desktop inherits the same visual polish but keeps its existing top-nav layout

### 11.6 Execution order (do after §8's color/responsive pass)
1. Bottom nav + FAB — biggest structural change, do first since other passes build on the new layout
2. Dashboard animations (counters, skeleton states, progress bar fill)
3. Transaction list interactions (swipe-to-delete, pull-to-refresh)
4. Remaining micro-interactions and tap feedback across other components

Review each pass on an actual device or mobile viewport before moving to the next — motion and touch interactions are easy to get subtly wrong in a desktop browser preview.

---

## 12. Open Decisions for v1.2

- **Bottom nav vs. existing top nav on mobile:** confirmed bottom nav replaces the mobile top nav links (§2); desktop is unaffected. Flag if you'd rather keep top nav on mobile too and treat bottom nav as an addition.
- **Animation library:** defaulting to Framer Motion as the likely fit for Next.js — confirm before adding the dependency.
- **FAB scope:** currently scoped to Dashboard/Transactions/Budgets; confirm if it should also appear on Households.

---

## 13. Calculators Suite (`/tools/calculators`)

### 13.1 Hub page
- Route: `/tools/calculators` — accessible to **both logged-out and logged-in users**, linked from the header/nav and from the Landing Page feature list
- Tile grid layout (icon + name per tile), matching the native-app visual language from §11 — for now, exactly two tiles:
  1. **Expense Splitter** — trips, room rent, group/function expenses
  2. **Budget Calculator** — daily/monthly/yearly budgeting
- Designed to be extended later — logged-in users get an **"+ Add Calculator"** tile that lets them create another instance of either type with its own name (e.g. "Goa Trip", "Diwali Function", "Flat Rent Q1")

### 13.2 Calculator 1 — Expense Splitter
This is the generalized, saved version of the original quick calculator — built for real recurring use cases (trips, shared room rent, group functions, any split expense), not just a one-off tally.

**Fields:**
- Calculation name (e.g. "Goa Trip", "Flat 3B Rent — Sept")
- People — add/remove any number of names
- Line items — each with: amount, category (free text or simple dropdown: Food, Travel, Stay, Misc, etc.), which person paid, add/remove
- Advance paid — per person, amount paid upfront/in advance
- Balance — auto-computed per person (their share owed minus what they've already paid/advanced)
- Other comments — free text notes field
- **Total** — auto-computed sum of all line items
- **Per-person individual share** — auto-computed (equal split by default; equal-split-only is fine for v1.3, a "custom % per person" option is a reasonable v1.4 addition, not required now)
- **Copy option** — copies a formatted text summary (names, shares, who owes what) to clipboard
- **Share option** — Web Share API where supported, with a WhatsApp deep link fallback (`wa.me` / `https://api.whatsapp.com/send?text=...`) pre-filled with the same summary text

**Save & resume:**
- Logged-out: persisted to **browser local storage only** — resumes on the same device/browser, with a visible note that signing up saves it permanently and makes it accessible across devices
- Logged-in: persisted to the database, tied to the user, listed back on the hub as a named tile alongside the two default calculator types

### 13.3 Calculator 2 — Budget Calculator
- User picks a period type: **Daily, Monthly, or Yearly** (default Monthly), with the option to customize the period further (e.g. custom date range)
- Add budget line items by category with an amount for that period
- Shows total budgeted, and — for logged-in users — can optionally compare against actual spend already logged in Transactions for the same period (nice integration point with §5's Budgets feature, not required for v1.3 if it adds too much scope, but flagged as a strong fast-follow)
- Same save/resume behavior as §13.2 (local storage when logged out, DB-backed and nameable when logged in)

### 13.4 Data model

```prisma
enum CalculatorType {
  EXPENSE_SPLIT
  BUDGET
}

model Calculator {
  id          String         @id @default(cuid())
  userId      String?        // null when created anonymously then later claimed on signup, otherwise always set for logged-in saves
  user        User?          @relation(fields: [userId], references: [id])
  type        CalculatorType
  name        String
  data        Json           // flexible structure per calculator type (people, line items, shares, etc.)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
}
```

Using a single `Json` field for `data` keeps this flexible while the calculator formats are still evolving — avoids a schema migration every time a field is tweaked inside a calculator type. Revisit a normalized schema only if calculators need to be queried/reported on later (e.g. admin analytics on calculator usage).

---

## 14. Custom Reminders

A new feature independent of Budgets — for recurring or one-off obligations (EMI, electricity, rent, credit card due dates) rather than spending limits.

**Fields per reminder:** date (due date), category, amount, label/note, status (`PENDING`, `PAID`, `MISSED`)
- A reminder due today with no action becomes visually flagged (not yet `MISSED` until the date has actually passed — status transitions automatically from `PENDING` → `MISSED` if the due date passes unmarked, or the user marks it `PAID` manually)
- Recurring option (monthly repeat is the realistic default for EMI/rent/utility use cases) — generates the next instance automatically once the current one is marked `PAID` or `MISSED`
- Feeds into the notification bar (§17) — a reminder due soon or overdue triggers a push/in-app notification

**Data model:**

```prisma
enum ReminderStatus {
  PENDING
  PAID
  MISSED
}

model Reminder {
  id           String         @id @default(cuid())
  userId       String
  user         User           @relation(fields: [userId], references: [id])
  label        String         // e.g. "Electricity Bill", "Home Loan EMI"
  category     String
  amount       Decimal
  dueDate      DateTime
  status       ReminderStatus @default(PENDING)
  isRecurring  Boolean        @default(false)
  createdAt    DateTime       @default(now())
}
```

A scheduled job (see §16.3) checks daily for reminders whose `dueDate` has passed while still `PENDING`, flips them to `MISSED`, and triggers the relevant notification.

---

## 15. Global UI/UX Rules (applies across the whole app, not just new features)

- **Loaders:** every action with any network/processing delay (form submits, page data fetches, calculator saves, report/chart generation) shows a loading state — button-level spinners for actions, skeleton states for content loads (already established in §11 for the dashboard; this extends the same rule everywhere else: Transactions, Budgets, Reminders, Calculators, Admin tables)
- **Toasts:** every create/update/delete action shows a success or failure toast — consistent placement, auto-dismiss, matches the motion style from §11.2
- **Disabled submit buttons:** every form's primary action button stays disabled until all mandatory fields are filled and valid — pairs with the new mandatory-field rules in §18 and §19
- **Icons everywhere relevant:** consistent, content-matched icons for Income, Expense, Investment, and each transaction type/category, used in list rows, dashboard tiles, and the bottom nav/FAB — not just decorative, meant to make scanning the app faster the way native finance apps do. A single icon set (e.g. Lucide, which is already available in this stack) should be used throughout rather than mixing icon styles.

---

## 16. Backend & Scalability (Neon + Vercel)

Since this needs to support a growing number of users, a few things are worth locking in now rather than retrofitting later:

### 16.1 Database connections (Neon on Vercel serverless)
- Vercel's serverless functions can open many concurrent short-lived connections; Neon has a connection limit like any Postgres instance. Use **Neon's pooled connection string** (via PgBouncer, which Neon provides built-in) for all app queries, and Prisma's `directUrl` only for migrations — this is the standard fix for "too many connections" failures under load on this exact stack.
- Alternative/complementary option: the `@neondatabase/serverless` driver (HTTP-based) for edge/serverless contexts if any routes move to the Edge Runtime later.

### 16.2 API & data-loading discipline
- **Every list view is paginated and filtered server-side** — this is now an explicit rule (already called out for Transactions in §19, but applies equally to Admin's user list, Reminders, and Calculators-you've-saved) — never fetch the full table and filter/paginate in the browser, since that stops scaling almost immediately as data grows.
- Add database indexes on the columns actually filtered/sorted on: `Transaction.userId + date`, `Transaction.userId + categoryId`, `Reminder.userId + dueDate`, `Reminder.status`.
- Add basic API rate limiting on public/unauthenticated endpoints (the Calculators hub and password-reset request endpoint are reachable without login) — Vercel's edge middleware or a lightweight package like `@upstash/ratelimit` (pairs well with Vercel + Upstash Redis) is a reasonable fit.

### 16.3 Background jobs (new requirement introduced by Reminders + Push)
- Neither Reminders' daily status check (§14) nor push notification delivery (§17) can run as part of a normal request — both need a scheduled job.
- **Vercel Cron Jobs** (built into Vercel, no extra infra) calling a protected API route on a daily schedule is the simplest fit for this stack and this scale — covers both the Reminder status sweep and checking budget thresholds for alerts.

### 16.4 Caching
- Dashboard summary/comparison stats (§20) are a reasonable candidate for short-lived caching (e.g. a few minutes) per user/period rather than recomputing on every load, especially once comparison-across-periods queries are involved — worth adding once real usage patterns are visible, not a v1.3 blocker.

---

## 17. Push Notifications (supersedes the v1.0 "in-app banners only" decision)

v1.0 explicitly scoped alerts to in-app banners only. v1.3 introduces a **notification bar with real push notifications**, which changes the stack requirements:

- **Web Push** (via a service worker — already present for the PWA per v1.0 §3.8) using the standard Push API + VAPID keys, with the `web-push` npm package on the backend. This avoids a third-party dependency and fits naturally since the PWA service worker already exists.
- Alternative if you'd rather not manage VAPID/subscription storage yourself: a managed push provider (e.g. OneSignal) — trades a bit of control for less plumbing. Worth deciding based on how much time you want to spend on notification infrastructure vs. feature work.
- **Triggers:** household activity (a new shared transaction or invite), budget threshold alerts (80%/100%, per v1.0 §3.5), and reminder due/overdue alerts (§14)
- **In-app notification bar:** a persistent bell/notification icon in the header showing unread alerts, independent of whether push permission was granted — so users who decline push notifications still see alerts inside the app
- **New data model** to track subscriptions and notification history:

```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  type      String   // "household", "budget_alert", "reminder"
  message   String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

---

## 18. Transactions Updates (v1.3)

- **All fields mandatory except Note** — Amount, Type, Category, Date, Payment Method all become required (Payment Method was optional in v1.0; confirm you're fine promoting it to mandatory, since that's a stricter change than just "keep everything from before")
- **Transaction Type becomes customizable** rather than the fixed `income | expense | investment` enum — mirrors how Categories already work per-user. Practically: keep the three defaults seeded for every user (so nothing breaks), but let users add their own types if needed. This requires migrating `Transaction.type` from an enum column to a relation:

```prisma
model TransactionType {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  name      String   // e.g. "Income", "Expense", "Investment", or a user-added type
  icon      String?  // matches the icon system from §15
  isDefault Boolean  @default(false)
  transactions Transaction[]
}
```
`Transaction.type` (currently an enum field) becomes `transactionTypeId` referencing this table. This is a real migration on existing data — plan to backfill the three default types per existing user and map old enum values across before dropping the enum column.

- **Table behavior:** pagination and search both happen server-side via the API (ties into §16.2) — the table should never load "all transactions" into the browser and filter client-side, since that's the first thing that breaks as a user's history grows
- **Delete confirmation:** deleting a transaction requires a yes/no confirmation modal before it's removed

---

## 19. Budgets Updates (v1.3)

- All fields (category, monthly limit, alert threshold) become mandatory — no partial/incomplete budgets
- **Edit option added** — v1.0/v1.1 covered create; v1.3 adds editing an existing budget's limit/threshold without needing to delete and recreate it

---

## 20. Dashboard Updates (v1.3)

- **Period filters:** Day, Month, Year — selectable, driving all dashboard data for that view
- **Comparison stats:** this-period-vs-last-period comparison (e.g. this month vs last month) shown alongside the existing summary cards and charts, using the chart library already in the stack (Recharts/Chart.js per v1.0 §2)
- **Drill-down interaction:** clicking the Income, Expense, or Investment summary tile opens the filtered Transactions list for that type and period; clicking a pie-chart category segment does the same, filtered to that category — this is a genuine navigation action (to `/transactions` with query params), not a modal, so the paginated/searchable table from §18 does the heavy lifting rather than duplicating list logic on the dashboard itself

---

## 21. Households (v1.3)

No changes in this version — carrying forward as-is from v1.0/v1.1. Revisit in the next version as noted.

---

## 22. Updated Build Order (v1.3 delta — do after v1.1/v1.2 are working)

1. **Backend groundwork first** (§16): switch to Neon's pooled connection string, add the indexes listed, set up Vercel Cron Jobs infrastructure (even with a placeholder job) — this underpins Reminders and Push before either exists.
2. Migrate `Transaction.type` from enum to `TransactionType` relation (§18) — this is the riskiest schema change in this version, do it early and in isolation with a proper backfill/migration script, not bundled with feature work.
3. Build the Transactions mandatory-field rules, server-side pagination/search, and delete confirmation (§18).
4. Build Budgets mandatory-field rules + edit flow (§19).
5. Build the Reminders feature end-to-end (§14) including the daily Cron sweep for `MISSED` status.
6. Build Push Notifications: service worker subscription flow, `web-push` backend integration, `PushSubscription`/`Notification` models, and the in-app notification bar (§17). Wire budget-threshold and household triggers (already partly built in v1.0/v1.1) into this new pipeline in place of the old in-app-banner-only path.
7. Build the Calculators hub + Expense Splitter + Budget Calculator (§13), including local-storage save for logged-out users and DB-backed save/list for logged-in users.
8. Build Dashboard filters, comparison stats, and drill-down navigation (§20).
9. Apply the global UI/UX rules (§15) — loaders, toasts, disabled-until-valid buttons, consistent icon set — as a pass across every page touched above, plus everything from v1.0–v1.2 that wasn't already covered.
10. Load-test the paginated endpoints and Neon pooled connection under a realistic concurrent-user simulation before considering this version done — the whole point of §16 is to catch scaling issues now rather than after real users show up.

---

## 23. Open Decisions for v1.3

- **Push notification approach:** self-managed Web Push (`web-push` + VAPID) vs. a managed provider (e.g. OneSignal) — affects §17's build effort meaningfully, worth deciding before starting that section.
- **Anonymous calculator persistence:** confirmed local-storage-only for logged-out users in §13; if you want anonymous calculators to survive a browser data clear (e.g. via a cookie-linked temporary DB record that gets claimed on signup), that's a step up in complexity — flag if wanted.
- **Transaction Type migration:** confirmed as a real schema migration with backfill, not just a UI relabel — budget time for this specifically in the build order (§22, step 2).
- **Payment Method mandatory:** confirmed promoted from optional (v1.0) to mandatory (v1.3) on transactions — flag if that's not actually intended.
- **Budget-vs-actual comparison inside the Budget Calculator** (§13.3): flagged as a strong fast-follow rather than required now, to avoid scope creep between "planning tool" and "the real Budgets feature."
- **Recurring reminder generation:** confirmed monthly auto-repeat is the default recurrence pattern; call out if weekly/custom intervals are needed for your actual use cases (EMI/rent/electricity are all realistically monthly, so this may be a non-issue).
