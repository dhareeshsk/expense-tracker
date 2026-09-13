# Expense Tracker — Test Case Reference

Living document. Update this whenever a feature area changes — don't create a new one-off checklist next time. Each case lists what to do, the expected result, and whether it's currently checked manually or is a good candidate for automation (none are automated yet; this repo has no test runner configured).

Legend: **[M]** manual only for now · **[A]** good automation candidate (Playwright E2E or a route-level integration test)

---

## 1. Auth

| # | Test case | Expected result | Type |
|---|---|---|---|
| 1.1 | Sign up with a new email/password | Account created, auto-logged in, redirected to `/dashboard`; 3 default transaction types + default categories seeded | [A] |
| 1.2 | Sign up with an email that already exists | 409 "An account with this email already exists", no duplicate created | [A] |
| 1.3 | Sign up with password < 8 chars | Rejected client-side (disabled submit) AND server-side (400) if called directly | [A] |
| 1.4 | Log in with correct credentials | Redirected to `/dashboard` (or `callbackUrl` if present) | [A] |
| 1.5 | Log in with wrong password | Inline "Invalid email or password", stays on `/login` | [A] |
| 1.6 | Log in with non-existent email | Same generic "Invalid email or password" (no user enumeration) | [A] |
| 1.7 | Visit any `/dashboard`, `/transactions`, `/budgets`, `/categories`, `/households`, `/reminders`, `/settings`, `/profile`, `/admin` route while logged out | Redirected to `/login?callbackUrl=<original path>` | [A] |
| 1.8 | Log out | Session cleared, redirected to `/` (landing page), not `/login` | [A] |
| 1.9 | Forgot password with an email that has an account | Generic "reset link sent" message; real email sent (or logged to console if `RESEND_API_KEY` unset); token stored hashed with 1hr expiry | [M] (needs email inbox or log inspection) |
| 1.10 | Forgot password with an email that has no account | Same generic message returned (no enumeration) | [A] |
| 1.11 | Submit forgot-password 6+ times in 15 minutes from one IP | 6th+ request gets 429 "Too many requests" | [A] |
| 1.12 | Use a valid, unexpired reset link | Can set new password, redirected to `/login` after ~1.5s | [A] |
| 1.13 | Reuse an already-used reset link | Rejected — "This reset link is invalid or has expired" (token is nulled after first use) | [A] |
| 1.14 | Use an expired reset link (>1hr old) | Rejected with the same expired message | [M] (needs manipulating `resetTokenExpiry` or waiting) |
| 1.15 | Use a garbage/guessed token | Rejected — token isn't in the DB (hashed lookup miss) | [A] |
| 1.16 | Change password from Profile with wrong current password | 400 "Current password is incorrect" | [A] |
| 1.17 | Change password from Profile with mismatched confirm field | Inline "Passwords do not match", submit stays disabled | [A] |
| 1.18 | Change email to one already in use by another account | 409 "An account with this email already exists" | [A] |

## 2. Transactions

| # | Test case | Expected result | Type |
|---|---|---|---|
| 2.1 | Add a transaction with all fields filled | 201, appears at top of the list, toast "Transaction added" | [A] |
| 2.2 | Try to submit with Amount, Category, Date, Payment Method, or Type empty | Submit button stays disabled; if called directly via API, 400 with a specific field message (not generic) | [A] |
| 2.3 | Enter a negative or zero amount | Inline "Amount must be greater than 0"; API also rejects with 400 | [A] |
| 2.4 | Leave Note empty | Allowed — Note is the only optional field | [A] |
| 2.5 | Edit an existing transaction | Row updates in place, values persist after reload | [A] |
| 2.6 | Delete a transaction | Confirmation dialog appears first; canceling leaves it intact; confirming removes it and shows a toast | [A] |
| 2.7 | Filter by transaction type | List narrows to matching type only, server-side (check network tab shows `transactionTypeId` query param, not a full unfiltered fetch) | [A] |
| 2.8 | Filter by category | Same, via `categoryId` param | [A] |
| 2.9 | Free-text search (note/payment method/category name) | Matches narrow correctly, case-insensitive | [A] |
| 2.10 | Page through results when a user has >20 transactions | Prev/Next buttons work, page count is correct, no client-side-only filtering (check network tab for `page`/`pageSize` params) | [A] |
| 2.11 | Share a transaction with a household | Other household members receive a notification ("X added a ₹Y transaction to Z") | [A] |
| 2.12 | Try to create a transaction using another user's `categoryId` or `transactionTypeId` via direct API call | 400 "Invalid category" / "Invalid transaction type" | [A] |
| 2.13 | Try to edit/delete another user's transaction by ID via direct API call | 404 "Not found" (never leaks existence) | [A] |
| 2.14 | Add a custom transaction type via `/api/transaction-types` | New type appears in the Type dropdown on Transactions and the FAB | [M] |
| 2.15 | Click an Income/Expense/Investment/Net-balance summary tile on the Dashboard | Navigates to `/transactions` filtered to that type + the selected period's date range | [A] |
| 2.16 | Click a pie-chart category segment on the Dashboard | Navigates to `/transactions` filtered to that category + period | [A] (click the visible ring, not the shape's bounding-box center — donut charts have a hollow middle) |
| 2.17 | Arrive at `/transactions` via a drill-down link | Shows the "drill-down range" banner with a working Clear button that also resets the URL | [A] |

## 3. Budgets

| # | Test case | Expected result | Type |
|---|---|---|---|
| 3.1 | Create a budget for a category with no existing budget | 201, appears in the list with a 0%-filled progress bar | [A] |
| 3.2 | Try to create a second budget for a category that already has one | 409 "A budget for this category already exists — edit it instead" | [A] |
| 3.3 | Leave Category, Monthly Limit, or Alert Threshold empty | Submit disabled; direct API call gets 400 with specific message | [A] |
| 3.4 | Edit an existing budget's limit/threshold | Category field is locked during edit (can't reassign), limit/threshold update and persist | [A] |
| 3.5 | Spend crosses the alert threshold (e.g. 80%) | Dashboard shows an "Approaching limit" banner; progress bar turns amber | [M] (needs real transaction data to cross the line) |
| 3.6 | Spend exceeds 100% of the limit | Dashboard shows "Over budget" banner in red, bar turns red | [M] |
| 3.7 | Delete a budget | Confirmation required first; removed after confirming | [A] |
| 3.8 | Try to edit/delete another user's budget by ID | 404 "Not found" | [A] |
| 3.9 | Cron sweep runs with a budget over its alert threshold | A `budget_alert` notification is created once; running the sweep again the same month does **not** duplicate it | [A] (call `/api/cron/daily` with the real `CRON_SECRET` twice, check notification count) |

## 4. Categories

| # | Test case | Expected result | Type |
|---|---|---|---|
| 4.1 | Add a new category with a name and color | Appears in the list with the chosen color/icon-fallback | [A] |
| 4.2 | Try to add a category with a duplicate name (same user) | 409 "A category with this name already exists" | [A] |
| 4.3 | Leave the name empty | Add button disabled; direct API call gets 400 | [A] |
| 4.4 | Edit a category's name/color | Updates in place; transactions previously logged under it show the new name/color | [A] |
| 4.5 | Delete a category | Confirmation dialog required; check what happens to existing transactions referencing it (should be blocked or handled — verify current server behavior) | [M] |
| 4.6 | Try to edit/delete another user's category by ID | 404 "Not found" | [A] |

## 5. Households

| # | Test case | Expected result | Type |
|---|---|---|---|
| 5.1 | Create a household | Appears in the list, creator is the sole member | [A] |
| 5.2 | Invite a member by email (account exists) | Invite created; invited user gets a notification "You've been invited to join X" | [A] |
| 5.3 | Invite a member by email (no account exists) | Invite created (pending), no notification sent (nothing to notify) | [A] |
| 5.4 | Invite an email that's already a member | 409 "This person is already a member" | [A] |
| 5.5 | Invite an email that already has a pending invite to the same household | 409 "An invite has already been sent to this email" | [A] |
| 5.6 | Accept an invite | Becomes a member, can see shared household data | [A] |
| 5.7 | Decline/cancel an invite (as the invitee or as a household member) | Invite removed; a third party (not the invitee, not a member) cannot cancel it | [A] |
| 5.8 | Add a shared transaction | Total/by-category/by-member summaries update; other members are notified | [A] |
| 5.9 | Add a household budget, cross its threshold | Reflected in the household's budget list with correct color/percentage | [M] |
| 5.10 | Leave a household | Confirmation required; membership removed, redirected to `/households` | [A] |
| 5.11 | Try to access another household's detail page/API by ID (not a member) | Blocked — 404, not the household's data | [A] |

## 6. Calculators (`/tools/calculators`)

| # | Test case | Expected result | Type |
|---|---|---|---|
| 6.1 | Visit the hub while logged out | Both tiles visible, no "+ Add calculator" tile, a "Sign up to save permanently" note shown | [A] |
| 6.2 | Visit the hub while logged in | Both tiles + "+ Add calculator" tile + a "Your saved calculators" list (from the DB) | [A] |
| 6.3 | Create an Expense Splitter (logged out), fill in people + line items | Totals/per-person shares/balances compute correctly (share = total ÷ people; balance = share − paid − advance) | [A] |
| 6.4 | Save an Expense Splitter while logged out | Saved to `localStorage` only (toast says "Saved to this device"); reappears on the hub under "Saved on this device"; survives a page reload | [A] |
| 6.5 | Save the same calculator while logged in | Saved via `/api/calculators` (toast says "Saved", no "to this device"); persists across devices/reload from the DB, not `localStorage` | [A] |
| 6.6 | Copy summary | Clipboard receives correctly formatted text with names/shares/balances | [M] (clipboard access needs a real browser context or a stub in headless tests) |
| 6.7 | Share summary | Opens native share sheet if supported, else a `wa.me` WhatsApp link with the summary pre-filled | [M] |
| 6.8 | Create and save a Budget Calculator with Daily/Monthly/Yearly/Custom period | Total budgeted computes correctly; Custom shows date-range pickers | [A] |
| 6.9 | Delete a saved calculator (either type, either storage) | Confirmation required; removed from the hub list and from its storage (DB row actually deleted — verify via direct query, not just UI) | [A] |
| 6.10 | Try to access/edit/delete another user's saved calculator by ID | 404 "Not found" | [A] |
| 6.11 | Leave Calculation Name empty | Save button disabled | [A] |

## 7. Reminders

| # | Test case | Expected result | Type |
|---|---|---|---|
| 7.1 | Add a one-off (non-recurring) reminder | Appears with a "Pending" badge | [A] |
| 7.2 | Add a recurring reminder, interval = Weekly/Monthly | No extra field needed beyond the interval picker | [A] |
| 7.3 | Add a recurring reminder, interval = Custom days | "Every N days" field required, defaults to 30, must be a positive integer | [A] |
| 7.4 | Leave Label, Category, Amount, or Due Date empty | Add button disabled; direct API call gets 400 with a specific message | [A] |
| 7.5 | Check "This repeats" without picking an interval, then submit via direct API call | 400 "Choose a recurrence interval for a recurring reminder" | [A] |
| 7.6 | A reminder's due date is today, not yet actioned | Shows "Pending" (not "Overdue") until the day is fully over; cron sweep creates a one-time "is due today" notification | [A] |
| 7.7 | A reminder's due date has fully passed (yesterday or earlier), still Pending | Client shows an "Overdue" badge even before the cron runs; cron sweep flips it to "Missed" and notifies | [A] |
| 7.8 | Mark a non-recurring reminder Paid | Status → Paid, no new reminder generated | [A] |
| 7.9 | Mark a recurring reminder Paid | Status → Paid, AND a new Pending reminder is created with the due date advanced by the correct interval (7 days / 1 month / N days) — verify via direct DB query, not just a toast | [A] |
| 7.10 | Cron sweep flips a recurring reminder to Missed (never actioned) | Same as 7.9 but triggered by the sweep instead of a manual mark | [A] |
| 7.11 | Filter the list by status (Pending/Paid/Missed) | Narrows server-side | [A] |
| 7.12 | Page through >20 reminders | Prev/Next work correctly | [A] |
| 7.13 | Delete a reminder | Confirmation required | [A] |
| 7.14 | Try to mark-paid/delete another user's reminder by ID | 404 "Not found" | [A] |
| 7.15 | Call `/api/cron/daily` without the `CRON_SECRET` bearer token, or with the wrong one | 401 Unauthorized both times | [A] |

## 8. Push Notifications / In-app Bell

| # | Test case | Expected result | Type |
|---|---|---|---|
| 8.1 | Bell icon with zero unread notifications | No badge shown | [A] |
| 8.2 | A new notification arrives (any trigger) | Badge count increments (bell polls every 60s, or check immediately after the triggering action + a page reload) | [A] |
| 8.3 | Open the dropdown | Lists notifications newest-first with a relative timestamp | [A] |
| 8.4 | Click a reminder-type notification | Marked read, navigates to `/reminders` | [A] |
| 8.5 | Click a budget_alert-type notification | Marked read, navigates to `/budgets` | [A] |
| 8.6 | Click a household-type notification | Marked read, navigates to `/households/[id]` for the specific household | [A] |
| 8.7 | "Mark all read" | All notifications in the dropdown become read, badge clears | [A] |
| 8.8 | Household member adds a shared transaction | Every *other* member gets a notification; the actor does not notify themselves | [A] |
| 8.9 | Invite sent to an email with an existing account | That user gets a notification | [A] |
| 8.10 | Invite sent to an email with no account | No notification created (nothing to target) | [A] |
| 8.11 | Enable push notifications (browser permission prompt) | Permission requested; on grant, a subscription is POSTed to `/api/push/subscribe` and stored | [M] (needs a real browser with notification permission UI — not fully testable headless) |
| 8.12 | An actual push-triggering event occurs after subscribing | OS-level notification appears (service worker `push` handler); clicking it opens/focuses the app at the right URL | [M] (needs a real deployed HTTPS origin + real push service connectivity — not testable in a sandboxed/headless environment) |
| 8.13 | A stored push subscription becomes invalid (expired/revoked) | Next delivery attempt gets a 404/410 from the push service and the subscription is automatically deleted from the DB | [A] (can be tested by seeding a syntactically-valid-but-fake subscription and triggering a send) |
| 8.14 | Try to read/mark-read another user's notification by ID | 404 "Not found" | [A] |
| 8.15 | Try to `POST /api/push/subscribe` a malformed payload (bad URL, missing keys) | 400, rejected before touching the DB | [A] |

## 9. Dashboard

| # | Test case | Expected result | Type |
|---|---|---|---|
| 9.1 | Default view on load | Shows current month, correct totals for Income/Expense/Investment/Net balance | [A] |
| 9.2 | Switch period type to Day | Picker becomes a date input; totals recompute for that single day | [A] |
| 9.3 | Switch period type to Year | Picker becomes a year number input; totals recompute for the full year | [A] |
| 9.4 | Use the Prev/Next step buttons | Moves the selected period back/forward by exactly one unit of the current period type | [A] |
| 9.5 | Comparison stats | Each summary card shows a "▲/▼ N% vs last period" delta; direction color (green/red) is correct per-metric (lower expense = green, lower income = red, etc.) | [A] |
| 9.5b | Verify comparison figures against known seeded data | Percentage math matches `(current − previous) / |previous| × 100` — don't just trust it renders, check the number | [M] |
| 9.6 | "Last 12 months" trend chart | Always shows the trailing 12 real calendar months, independent of whatever period is selected for the cards above | [A] |
| 9.7 | Budget threshold alert banner | Appears when any budget crosses its threshold, links to `/budgets` | [M] |
| 9.8 | Animated summary counters | Numbers spring/count up to the correct final value on load or period change (don't screenshot mid-animation and assume a mismatch — wait for it to settle, ~2–3s) | [M] |
| 9.9 | No data for the selected period | Cards show ₹0, pie chart shows "No expenses this period", no crash | [A] |

## 10. Admin

| # | Test case | Expected result | Type |
|---|---|---|---|
| 10.1 | Visit any `/admin/*` route as a non-admin (logged in) | Redirected to `/dashboard` by middleware | [A] |
| 10.2 | Visit any `/admin/*` route while logged out | Redirected to `/login` | [A] |
| 10.3 | Call any `/api/admin/*` route directly as a non-admin | 403 Unauthorized, even if the request is otherwise well-formed | [A] |
| 10.4 | A user's role changes from USER to SUPER_ADMIN mid-session | Admin access granted on next request (role is re-checked against the DB every time, not read from a stale JWT claim) | [M] |
| 10.5 | `/admin` overview | Shows correct total users/households/transactions/active-this-month counts | [A] |
| 10.6 | `/admin/users` search | Narrows by name/email, server-side | [A] |
| 10.7 | `/admin/users` pagination | Works correctly beyond one page of results | [A] |
| 10.8 | `/admin/users/:id` detail view | Shows that user's categories/budgets/households/recent transactions, read-only (no edit controls) | [A] |
| 10.9 | `/admin/settings` update site name/footer | Persists; reflected in the header/footer on next page load for all users | [A] |
| 10.10 | Leave site name empty on save | Save disabled | [A] |

## 11. PWA / Offline Shell

| # | Test case | Expected result | Type |
|---|---|---|---|
| 11.1 | Service worker registers successfully | `navigator.serviceWorker.getRegistrations()` returns a registration whose `active` state is `"activated"` | [A] — ✅ fixed & verified 2026-09-14 |
| 11.2 | Manifest icons resolve | `/icons/icon-192.png`, `/icons/icon-512.png`, `/icons/icon-512-maskable.png` all return 200, not 404 | [A] — ✅ fixed & verified 2026-09-14 |
| 11.3 | "Install as an app" prompt is offerable | Browser's `beforeinstallprompt` fires (requires a valid manifest + a successfully-registered service worker) | [M] |
| 11.4 | Go offline, navigate to a page not yet cached | Shows `/offline.html`, not a browser error page | [A] — ✅ verified live 2026-09-14 |
| 11.5 | Go offline, navigate to a previously-visited page | Served from cache | [M] |
| 11.6 | `service-worker-registration.tsx`'s registration failure | Now logs via `console.error` instead of swallowing silently | ✅ fixed 2026-09-14 |

> **Resolved 2026-09-14:** the three missing icon PNGs (`icon-192.png`, `icon-512.png`, `icon-512-maskable.png`) were generated from the existing `public/logo.svg` (composited onto a square canvas matching the manifest's `background_color`, with the maskable variant kept within a ~55%-of-canvas safe zone so OS circle/squircle crops never clip it) and placed in `public/icons/`. Verified live: the service worker now reaches `active: "activated"`, the shell cache actually holds `/offline.html` + `/manifest.json` + both icons, and navigating to an uncached page while offline correctly serves the offline fallback page instead of a browser error. Also fixed the silent error-swallowing in `service-worker-registration.tsx` so a future registration failure won't go unnoticed again.

## 12. Cross-cutting / Security (re-run this section after *any* change that adds a new user-owned resource type)

| # | Test case | Expected result | Type |
|---|---|---|---|
| 12.1 | For every `[id]` API route (transactions, budgets, categories, calculators, reminders, notifications, households, household budgets, invites): fetch/mutate a resource ID belonging to a different user | 404 "Not found" — never 200, never a 403 that confirms existence | [A] |
| 12.2 | For every list/collection GET route: confirm the response never includes another user's rows | Verified by comparing response contents against known other-user resource IDs | [A] |
| 12.3 | Submit every mandatory-field form via a direct API call with fields missing/invalid (not just through the UI) | Server returns 400 with a specific message — a disabled button must never be the only line of defense | [A] |
| 12.4 | Grep the codebase for hardcoded secrets/keys/connection strings | None found outside `process.env.*` references | [A] (a repo-wide grep, cheap to re-run) |
| 12.5 | Confirm `.env` is git-ignored and not tracked | `git ls-files | grep env` returns nothing | [A] |
| 12.6 | Password reset token: confirm it's single-use | A second attempt with the same token after a successful reset fails | [A] |
| 12.7 | Rate limit on `/api/auth/forgot-password` | 6th request within 15 minutes from one IP gets 429 | [A] |
| 12.8 | `passwordHash` never appears in any API response | Grep + a runtime check on `/api/profile`, `/api/admin/users/:id`, `/api/signup` responses | [A] |

---

## Notes on running this suite

- All `[A]` cases in this document were exercised at least once as real Playwright/network-traced tests during the v1.3 pre-deploy review (2026-09-14), against throwaway test accounts created and destroyed for that purpose — this file itself has no test runner wired up yet.
- There is currently no automated test suite (no Jest/Vitest/Playwright config committed). If/when one is added, this table is the source of truth for what to encode as actual test files — file each `[A]` row as a real test rather than re-deriving cases from scratch.
- When testing locally, always create a dedicated throwaway user (or reuse a clearly-named one like `qa-test@example.com`) rather than testing against real accounts, and clean up test data afterward — several of these cases (cron sweep, cross-user checks) mutate real database state.
