# Unauth Nav and Button Interaction Implementation Plan

Date: 2026-06-02

## Executive Summary

The app has two separate problems that are blending together for users:

1. Some buttons are genuinely broken because global redirects and stale route targets send users to the wrong page.
2. Many working buttons feel broken because route changes do not show immediate pending feedback and several pages block on dynamic server data before the visible page changes.

The highest-impact fix is not another one-off data-loading patch. We should first repair the route contract, then add immediate navigation feedback, then reduce the server work paid on every route transition.

## Evidence From This Audit

Runtime was checked against the local app on `http://localhost:3000` using the existing `interaction-audit` fixture account.

### Confirmed Broken Routes

Direct HTTP checks show these redirects happen before page auth or app code can run:

| Source | Current target | Why this is broken |
| --- | --- | --- |
| `/claims` | `/customers` | The app has a real `/claims` page and the sidebar links to `/claims`, but users land on customer intelligence. |
| `/inbox` | `/customers` | The app-level `/inbox` alias says it should redirect to `/claims`, but `next.config.js` overrides that. |
| `/saved` | `/dashboard` | The app-level `/saved` page redirects to `/history`, but `next.config.js` overrides that. |

Relevant code:

- `next.config.js` lines 42-46 define global redirects for `/inbox`, `/claims`, and `/saved`.
- `app/(app)/inbox/page.tsx` lines 3-5 says `/inbox` should be an alias for `/claims`.
- `app/(app)/saved/page.tsx` lines 3-5 says `/saved` should redirect to `/history`.
- `components/nav/Sidebar.tsx` lines 61-82 defines the visible sidebar and includes `Claims -> /claims`.

### Sidebar Runtime Timings

Visible mobile sidebar clicks from Dashboard were measured by waiting for URL/heading changes:

| Sidebar href | Final URL | Final heading | First visible route change |
| --- | --- | --- | --- |
| `/store` | `/store` | Store overview | 1284ms |
| `/customers` | `/customers` | Customer intelligence | 1736ms |
| `/claims` | `/customers` | Customer intelligence | 1701-1822ms |
| `/watchlist` | `/watchlist` | Watchlist | 1441ms |
| `/chargebacks` | `/chargebacks` | Evidence packages | 1127ms |
| `/reports` | `/reports` | Reports | 2049ms |
| `/upload` | `/upload` | Historical import | 1326ms |
| `/history` | `/history` | Import history | 938-1203ms |

Takeaway: even healthy routes feel slow because the old page remains visible for roughly 1-2 seconds. `/claims` is worse: it visibly resolves to the wrong page.

### Static Findings

- `app/(app)/layout.tsx` is `force-dynamic` and blocks the shell on auth, merchant context, merchant profile, jobs, Shopify status, connection state, watchlist count, and claims count.
- `getConnectionState()` calls `getShopifyConnectionStatus()`, while the layout also calls `getShopifyConnectionStatus()` separately. That duplicates Shopify connection work.
- Several pages repeat connection/setup/data-presence queries that the shell also performs.
- There are 29 instances of invalid `Link` wrapping a real `Button`. The shared `Button` always renders a `<button>`, so `<Link><Button /></Link>` creates nested interactive controls.
- `components/layout/CommandPalette.tsx` has stale nav/filter targets, including `Needs review queue -> /customers?status=needs_review`, while valid investigation statuses are `new`, `under_review`, `contacted`, `resolved`, and `cleared`.
- The Claims page uses `PERMISSIONS.SUBMIT_FRAUD_FEEDBACK` to view the page, even though viewer roles have `VIEW_INBOX` but not mutation permission. That can redirect read-only users away from a queue they should be able to see.

## Implementation Order

### Phase 1: Fix The Route Contract First

Goal: a click lands on the page it promises.

Changes:

1. Remove the global `/claims -> /customers` redirect from `next.config.js`.
2. Remove or change the global `/inbox -> /customers` redirect. Canonical recommendation: `/inbox -> /claims`.
3. Resolve `/saved` conflict. If saved views are not shipped, keep the app-level redirect to `/history` and remove `next.config.js` `/saved -> /dashboard`.
4. Update `lib/permissions/index.ts` default destinations so users with claim/inbox access resolve to `/claims`, not stale `/inbox`.
5. Change `app/(app)/claims/page.tsx` page-read permission from `SUBMIT_FRAUD_FEEDBACK` to a read permission. Use existing `VIEW_INBOX` for now or introduce `VIEW_CLAIMS` if we want cleaner naming.
6. Keep claim mutation API routes on `SUBMIT_FRAUD_FEEDBACK`; only the read/list page should be relaxed.

Acceptance checks:

- `HEAD /claims` no longer returns a redirect to `/customers`.
- Authenticated sidebar `Claims` lands on `/claims` with heading `Claims`.
- `/inbox` lands on `/claims` if we keep it as an alias.
- `/saved` behavior matches exactly one source of truth.

### Phase 2: Create A Single Navigation Registry

Goal: sidebar, workbench nav, command palette, aliases, and tests all use the same route truth.

Add:

- `lib/navigation/appRoutes.ts`
- Optional `lib/navigation/aliases.ts`

Suggested route shape:

```ts
export type AppRouteKey =
  | 'dashboard'
  | 'store'
  | 'customers'
  | 'claims'
  | 'watchlist'
  | 'evidencePackages'
  | 'reports'
  | 'upload'
  | 'history'
  | 'settings'
  | 'help';

export const APP_ROUTES = {
  claims: {
    href: '/claims',
    label: 'Claims',
    permission: PERMISSIONS.VIEW_INBOX,
    aliases: ['/inbox'],
  },
  // ...
} satisfies Record<AppRouteKey, AppRoute>;
```

Refactor:

- `components/nav/Sidebar.tsx`
- `components/workbench/workbenchNavItems.ts`
- `components/layout/CommandPalette.tsx`
- `components/layout/AppHeader.tsx` path labels
- route alias pages under `app/(app)`
- `lib/permissions/index.ts` default destinations

Command palette corrections:

- Replace `Needs review queue -> /customers?status=needs_review` with a valid filter, probably `/customers?risk=high&status=new`.
- Update "High-confidence matches" copy or target so it matches the actual customer filters.
- Add Claims to command palette nav once `/claims` is fixed.

Tests:

- Registry unit test: every sidebar/workbench/command href either exists as a page or is listed as an alias.
- Redirect test: every alias resolves to its canonical route, and no canonical route redirects to another product surface.
- Snapshot test: sidebar and command palette are generated from the registry.

### Phase 3: Fix Link/Button Composition

Goal: remove invalid nested interactive controls.

Problem:

- `components/ui/Button.tsx` always renders `<button>`.
- 29 locations render `<Link><Button /></Link>`, creating anchor-inside-button behavior risk in reverse: an anchor wrapping a real button.

Recommended implementation:

1. Add `ButtonLink` to `components/ui/Button.tsx` or a sibling `components/ui/ButtonLink.tsx`.
2. It should render a Next `Link` styled with the same button classes.
3. Keep `Button` for actions and forms only.
4. Replace all `<Link><Button /></Link>` usages.

Target files include:

- `app/(app)/claims/page.tsx`
- `app/(app)/upload/page.tsx`
- `app/(app)/customers/page.tsx`
- `app/(app)/watchlist/page.tsx`
- `app/(app)/history/page.tsx`
- `app/(app)/chargebacks/page.tsx`

Add a guard:

- ESLint custom rule or simple AST test that fails on `Link` with descendant `Button`.

Acceptance checks:

- No rendered `<a><button>` or `<button><a>` in app pages.
- Pagination buttons still navigate.
- CTA buttons remain visually identical.

### Phase 4: Add Immediate Navigation Feedback

Goal: every click responds instantly, even if the server route still takes 1-2 seconds.

Changes:

1. Create a shared nav-link component, for example `components/navigation/AppNavLink.tsx`.
2. On click, set a pending href immediately.
3. Render an optimistic active state/spinner in the sidebar item.
4. On mobile, close the drawer immediately on link click, not only after `pathname` changes.
5. Add a top progress bar or compact header loading indicator for route transitions.
6. Clear pending state when `usePathname()` changes or after a timeout with an error state.

Why:

- The current App Router behavior leaves old content on screen while RSC payloads load.
- Users experience that as "I clicked and nothing happened."

Acceptance checks:

- Visual click acknowledgement under 150ms.
- Mobile drawer closes under 150ms after clicking a nav item.
- If the final route errors or redirects, the pending indicator clears and the final route is visible.

### Phase 5: Add Route Loading States

Goal: make slow server routes look intentional instead of frozen.

Add `loading.tsx` or segment-level skeletons for:

- `app/(app)/dashboard/loading.tsx`
- `app/(app)/store/loading.tsx`
- `app/(app)/customers/loading.tsx`
- `app/(app)/claims/loading.tsx`
- `app/(app)/reports/loading.tsx`
- `app/(app)/watchlist/loading.tsx`
- `app/(app)/chargebacks/loading.tsx`
- `app/(app)/upload/loading.tsx`

Existing useful loading files:

- `app/(app)/customers/[id]/loading.tsx`
- `app/(app)/history/loading.tsx`

Acceptance checks:

- Route transitions show a page-specific skeleton when data is not ready.
- The skeleton preserves the shell, sidebar, and header.
- No route looks unchanged for more than 150ms after a click.

### Phase 6: Reduce Shell And Page Data Blocking

Goal: cut route-settle time after the route contract is fixed.

Shell changes:

1. Replace the layout's multiple independent shell queries with one `getAppShellSnapshot(user.id)` helper.
2. Avoid duplicate Shopify work by returning `shopifyStatus` from `getConnectionState()` or by deriving `connectionState` from a single Shopify status query.
3. Move badge counts out of the blocking layout path.
4. Add `/api/nav-counts` for `claimsCount` and `watchlistCount`, loaded by a small client badge component after the shell renders.
5. Remove `headers()`/`x-pathname` onboarding checks from `app/(app)/layout.tsx` if they are not needed in the app route group. Onboarding lives in `app/(auth)`, so this should not be required in the app shell.

Page changes:

1. Parallelize connection/data-presence calls in Customers and Reports.
2. Reuse `getMerchantSetupState()` where pages currently call `getConnectionState()` plus `getMerchantDataPresence()` sequentially.
3. Avoid exact counts on every route transition when only existence or page-local counts are needed.
4. Keep expensive trend/report data behind Suspense or a secondary client fetch where possible.

Acceptance target:

- Warm sidebar route completion below 800ms for simple pages in production build.
- No duplicate Shopify connection query during a single app-shell render.
- Nav badge counts do not block first paint.

### Phase 7: Instrument And Enforce

Goal: prevent this class of issue from returning.

Add Playwright coverage:

1. Authenticated sidebar click matrix:
   - Start at `/dashboard`.
   - Click each visible sidebar item.
   - Assert final URL and `main h1`.
   - Assert first visual pending feedback under 150ms.
2. Route redirect matrix:
   - Canonical routes must not redirect to unrelated surfaces.
   - Aliases must redirect only to their canonical route.
3. Button semantics test:
   - No nested interactive controls.
4. Command palette matrix:
   - Every palette item navigates to a valid route/filter.
5. Performance budget:
   - Track route click to heading change.
   - Fail only on production build or set a looser dev budget, because `next dev` includes compilation overhead.

Update existing scripts:

- `interaction-audit/run-control-audit.mjs` currently checks many controls but does not enforce route correctness or latency budgets. Extend it rather than treating its previous "890 controls passed" as sufficient.

## Priority Fix List

P0:

- Remove `/claims -> /customers` global redirect.
- Fix `/inbox` alias to `/claims`.
- Fix Claims page read permission.
- Add a sidebar route matrix test.

P1:

- Create route registry.
- Update Sidebar, WorkbenchNav, CommandPalette, default destinations.
- Fix stale command palette filters.
- Replace `Link<Button>` instances.

P2:

- Add immediate pending UI for nav links.
- Add route `loading.tsx` skeletons.
- Move nav badge counts out of blocking layout.

P3:

- Consolidate shell queries.
- Parallelize page setup/data-presence work.
- Add production performance budgets.

## Open Product Decisions

1. Should the canonical queue be called Claims or Inbox? Current product copy and sidebar say Claims, so this plan assumes `/claims` is canonical and `/inbox` is only an alias.
2. Should Saved Views remain hidden? If yes, `/saved` should redirect to `/history` or be removed from default destinations until the feature flag ships.
3. Should viewers be allowed to view claims but not mutate them? Existing RBAC suggests yes: viewers have `VIEW_INBOX`, analysts have `SUBMIT_FRAUD_FEEDBACK`.

## Definition Of Done

- Sidebar Claims opens Claims.
- Dashboard "Open claims" opens Claims.
- `/inbox` resolves to Claims or is removed everywhere.
- No canonical app route redirects to an unrelated app page.
- No `Link` wraps a `Button`.
- Every nav click has immediate visible feedback.
- Route click matrix is automated.
- Warm production route changes meet the agreed latency budget.
