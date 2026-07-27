# Product polish — Phase 4

- Status: COMPLETE
- Phase: 4 — Shared hierarchy, components, and “AI slop” removal
- Active IDs: SYS-01–SYS-28
- Result: 28/28 PASS

## Changes

- SYS-01–02 — made breadcrumbs parent-only and kept page titles in the page header; route links remain ordinary navigation.
- SYS-03–08 — converged composition around working surfaces, joined sections, inset groups, metric groups, and one-primary-action patterns; removed decorative KPI icons and repeated presentation chrome from shared surfaces.
- SYS-09–11 — aligned canonical table headers and 40/44/52px densities, removed the Customers double perimeter, and added joined detail-section primitives.
- SYS-12 — added the shared 1024px Desktop required boundary with CSS pre-hydration hiding, live resize handling, deep-link safety, and a narrow accessibility tree containing only the notice.
- SYS-13–16 — reconciled spacing/type/contrast tokens, raised chart labels and essential metadata, set the selected boundary token to a 3:1-capable value, and added forced-colour focus/boundary fallbacks.
- SYS-17–18 — added shared geometry-aware operational states and kept callouts/state copy focused on a distinct conclusion or next action.
- SYS-19–20 — separated true in-page tabs, route links, pressed view selectors, and compact provider-row composition semantics.
- SYS-21–23 — reconciled the Quiet Precision document, tokens, contracts, and gallery; moved static canonical primitive presentation into the authenticated CSS layer while retaining only data-derived inline values.
- SYS-24–26 — removed clickable/focusable table rows, added real identity-cell links/buttons, consolidated loading announcements, implemented APG tab keyboard behaviour, and matched table/metric skeleton geometry to resolved tokens.
- SYS-27–28 — removed the generic four-square empty motif and replaced native-title-only help with a shared labelled tooltip trigger and tooltip role.

## Checks

- `npm run verify:design-contract` — PASS (422 files; arbitrary design values 0/0; uppercase eyebrows 0/0; hand-rolled tables 10/10).
- `npm run lint:authenticated-design` — PASS.
- `npm run typecheck` — PASS.
- `npm run lint -- --max-warnings=0` — PASS.
- `npm test -- --runInBand tests/unit/statusBadge.test.ts tests/components/no-link-button-nesting.test.ts` — PASS (5 tests).
- `git diff --check` — PASS.
- Gallery/browser session — PASS at 1440px and 1024px in light mode; dark-mode representative rendered; long labels, disabled/loading/error states, all shared operational states, odd MetricGroup dividers, canonical table geometry, tooltip semantics, and tab ArrowRight focus were checked. Live resize across 1023px showed only the shared Desktop required notice in the accessibility tree; capture mode reported ready with transitions/animations disabled and a clean runtime log.

## Remaining

None.
