# Phase 23 — Notifications and Help

Status: implemented; Route-pack visual proof pending. Scope per §12.4/§12.6
of `docs/IMPL_living_precision_product_ui.md` (R13, R26).

## Scope and implementation

- `/notifications` now uses the canonical page frame and a single compact
  inbox surface. The two supporting metrics describe inbox volume and recent
  arrival volume; unread remains one state signal, rather than becoming a
  competing metric, callout, tab count, and list badge.
- The inbox groups messages by recency, provides a compact 14-day activity
  histogram, transitions a message to read before navigating to its existing
  destination, and reports bulk-read success or failure in place. Both empty
  and unread-filter-empty states retain useful recovery actions.
- The shell bell receives the immediate unread change through a browser event,
  so its count settles with the page/list transition without a full route
  rerender. The existing permission-protected unread endpoint remains the
  initial shell source.
- `/help` now has searchable, anchored in-page guides for cases, rules,
  recoveries, and integrations. Each guide action targets a shipping product
  route; the only support action is the pre-existing `mailto:support@unauth.app`
  destination. No documentation route was invented.
- The notification loading state now matches the compact activity-and-list
  anatomy. The existing notification and help error boundaries remain truthful.

## Verification

| Command/check | Result |
|---|---|
| `npm test -- --runInBand tests/components/notificationCentre.test.tsx tests/components/phase23NotificationsHelp.test.tsx` | Pass — unread transition reaches the shell event; Help search retains anchored and valid destinations |
| `npm run typecheck` | Pass |
| Focused `npx eslint` on the 8 Phase 23 source/test files | Pass |
| `npm run lint` | Does not pass because of the pre-existing `components/dashboard/DashboardOverview.tsx:206` React Compiler `preserve-manual-memoization` error; no Phase 23 file is reported |
| `npm run lint:authenticated-design` | Pass — 474 files checked; all ratchets within baseline |
| `npm run build` | Pass — `/notifications` and `/help` compile as dynamic routes; Next reports one generated-CSS optimisation warning but completes with exit code 0 |
| `npm run verify:ui-parity` | Retains pre-existing baseline failures for `/partners`, `/`, and the global `router.push` interaction count (22 → 20); Phase 23 adds no broken help destination or navigation mutation |
| `git diff --check` | Pass |
| Route-pack visual review | Pending — no authenticated local browser was available during implementation |

## Regression and scope review

Notification creation/delivery, merchant/user permission checks, API read and
bulk-read mutations, deep links, preferences, and the support address are
unchanged. The shell patch is limited to rendering and synchronising the
existing unread signal.

## File and module budget

- New reusable production modules: 0
- New route-owned production modules: 1 — `components/help/HelpCentre.tsx`
- Production files changed: 6
  - `app/(app)/notifications/page.tsx`
  - `app/(app)/notifications/loading.tsx`
  - `components/notifications/NotificationCentre.tsx`
  - `components/layout/AppHeader.tsx`
  - `app/(app)/help/page.tsx`
  - `components/help/HelpCentre.tsx`

The focused tests and phase evidence do not count toward the production-file
budget.
