# Product polish — Phase 5

- Status: COMPLETE
- Phase: 5 — Shell, Overview, and Work
- Active IDs: SHELL-01–SHELL-06, OVR-01–OVR-05, OVR-07, OVR-09, WORK-01–WORK-09
- Result: 22/22 PASS

## Changes

- SHELL-01–02 — bound workspace/operator identity to the approved marketing merchant and auth profile, and render the canonical connection read model in the shell with provider-specific state and an Integrations repair link.
- SHELL-03–05 — kept one Settings destination, removed the footer duplicate, made the header/breadcrumb flex layout width-safe, and retained parent-only breadcrumbs so index titles are not repeated.
- SHELL-06 — labelled the Cases badge as active-status work requiring review; the marketing shell count is 9 while Overview’s period count remains explicitly labelled as 10 cases in period.
- OVR-01–02 — moved Priority work directly below the compact metric summary and removed the repeated Open work action from Workflow breakdown.
- OVR-03–04 — kept the financial chart compact and added a visible neutral remainder track to the data-health rail.
- OVR-05, OVR-09 — removed decorative generated metadata and routed dashboard, report, export, KPI, and chart range text through the shared range labels.
- OVR-07 — corrected the marketing fixture’s source freshness and financial-state projection: 137 current records, one delayed carrier record, and ledger checks pass without hiding a degraded source.
- WORK-01–02 — kept five high-value system views and Save view visible, moved the remaining six system views and saved views into an accessible More views group, and kept saved-view unavailable/retry distinct from an empty list.
- WORK-03, WORK-06 — used one visible-result model for rows, empty state, selection, and footer counts; filtered results now say `N of M loaded results`, while unfiltered paginated results say `Showing X–Y of N`.
- WORK-04–05 — resolved merchant team names/roles for Work owners and ordered the default controls as view navigation, search, then table/bulk actions.
- WORK-07–09 — removed the Work summary rail, standardised Work/view terminology, and replaced No SLA with No deadline.
- Capture-clock correction — passed the server capture timestamp into Work due-state rendering so frozen server/client dates hydrate consistently.

## Checks

- `npm test -- --runInBand tests/unit/navigationPermissions.test.ts tests/unit/dashboardModel.test.ts tests/components/workQueueResultModel.test.tsx` — PASS (18 tests).
- `npm run seed:marketing -- --as-of=2026-07-26T12:00:00.000Z` — PASS (Alder & Ash, one saved view, nine Work tasks).
- `npm run validate:marketing-seed -- --as-of=2026-07-26T12:00:00.000Z` — PASS (767 records, stable capture URLs and reconciliation).
- Identical second marketing seed — PASS with no duplicate growth.
- `npm run typecheck` — PASS.
- `npm run lint -- --max-warnings=0` — PASS.
- `git diff --check` — PASS.
- One authenticated browser session — PASS at 1440px and 1024px for shell, Overview, and Work. Page overflow was false at both widths; Work table overflow stayed inside its scroll surface. Overview showed Priority work before the financial chart, 99% current data with one stale carrier record, stable range labels, no generated metadata, and visible chart tracks. Work kept Save view and five primary views visible; the healthy saved view appeared in More views alongside the six additional system views. The zero-result search and selection-pruning states were checked in-browser, while the injected saved-view failure/retry state passed in the focused component test. Browser console/hydration logs were empty after the frozen-clock fix, and read-only route checks produced no unintended writes.

## Remaining

None.
