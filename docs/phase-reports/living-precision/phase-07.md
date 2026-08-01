# Phase 07 — Overview

Status: implemented; Route-pack visual gate pending. Scope per §12.4/§12.6 of `docs/IMPL_living_precision_product_ui.md`
(R07, `/dashboard`).

## Scope and implementation

The Phase 06 predecessor report is present and its shared `ChartFrame`,
`ChartDataTable`, and chart role contract are the only shared dependencies used.
This phase changes the Overview route only:

- Replaced the hand-built financial card with the shared, question-led
  `ChartFrame`. It carries the selected value, scope, metric control, direct
  legend, source/reconciliation freshness, scoped records link, and accessible
  data table as one focal surface.
- Kept range, currency, and metric scope synchronized across the chart, table,
  and `/reports/records` drill-down. The table keeps null values explicitly
  unavailable; it never substitutes zero.
- Moved empty and missing-currency outcomes to `ChartState`, preserving the
  320px visual geometry and a relevant integration action.
- Corrected the existing comparison series to a neutral dashed line, matching
  §6.2 rather than presenting prior-period values as dots alone.
- Added a focused DOM test that mounts the real `DashboardOverview` and proves
  frame anatomy, reconciliation metadata, accessible table values, and the
  metric-switcher records URL.

No financial definitions, read-model queries, range semantics, export behavior,
or routes outside `/dashboard` changed.

## Verification

| Command | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint:authenticated-design` | Pass — 451 files; ratchet unchanged |
| `npm run lint -- --file components/dashboard/DashboardOverview.tsx --file components/charts/authenticated/cartesian/ComboBarLineChart.tsx` | Pass |
| `npx jest tests/components/phase07Dashboard.test.tsx --runInBand` | Pass — 1 suite, 2 tests |
| `npx jest tests/unit/dashboardModel.test.ts tests/lib/reportsPayoutContract.test.ts tests/components/phase06Charts.test.tsx --runInBand` | Pass — 3 suites, 23 tests |
| `git diff --check` | Pass |

### Route-pack visual evidence

A browser session was set to 1440×900 and targeted at
`http://localhost:3000/dashboard`, but the local server was not running
(`ERR_CONNECTION_REFUSED`). Two local `next dev` attempts, including one approved
outside the sandbox, did not retain a server process or emit a server log, so a
live 1440×900/1024px capture was not possible in this execution environment. No
screenshot is claimed. The changed route anatomy and all user-facing state/scope
behaviour are covered by the focused jsdom mount above; the normal visual capture
should be repeated when a persistent authenticated local server is available.

## File and module budget

- New reusable production modules: 0
- Production files changed: 3
  - `components/dashboard/DashboardOverview.tsx`
  - `components/dashboard/dashboardPilot.module.css`
  - `components/charts/authenticated/cartesian/ComboBarLineChart.tsx`
- New focused test: `tests/components/phase07Dashboard.test.tsx`

This is inside the §12.2 maximum of two new reusable modules and twelve production
files. The chart component is a direct Overview consumer; its one-line comparison
stroke correction is the smallest missing Phase 06 contract dependency.
