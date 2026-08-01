# Phase 09 — Reports and report records

Status: implemented; Route-pack visual gate pending. Scope per §12.4/§12.6 of
`docs/IMPL_living_precision_product_ui.md` (R32–R33; `/reports` and
`/reports/records`).

## Scope and implementation

- Kept reconciliation status to one report-level notice. The per-currency chart
  repetition was removed without hiding valid, currency-separated figures.
- Added a scoped “View exposure records” action and a per-currency export to
  the primary financial chart. The chart, accessible table, records URL, and
  export now share the range, timezone, currency, and selected exposure metric.
- Made report-record scope visible in the page header and toolbar. Pagination,
  retry, filtered-empty state, and links back to Reports preserve that
  range/currency/metric-or-category/timezone scope. CSV export appears only for
  financial-metric and loss-category record slices, where it can preserve the
  exact scope without implying that a workflow-status list has a matching
  financial export.
- Replaced the hand-built records table with the canonical `RegistrySurface` +
  flush `DataTableServer`, retaining right-aligned financial values, internal
  horizontal overflow, exact record links, and a truthful retryable error.
- Re-mirrored loading as scope controls, four metrics, the 340px financial
  hero, and the records registry. The report export now supports a selected
  financial metric or loss category instead of expanding a current scope.

No financial definition, aggregate calculation, currency aggregation,
permission, merchant isolation, case/recovery link, or report range semantics
changed.

## Verification

| Command | Result |
|---|---|
| `npx jest tests/unit/reportingExport.test.ts tests/lib/reportsPayoutContract.test.ts tests/unit/reportChartModel.test.ts --runInBand` | Pass — 3 suites, 12 tests |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run lint:authenticated-design` | Pass — 451 files; ratchet unchanged |
| `npm run build` | Pass |
| `git diff --check` | Pass |

### Route-pack visual evidence

The in-app browser was set to 1440×900 and navigated to
`http://localhost:3000/reports`. The local server returned
`ERR_CONNECTION_REFUSED`, so neither the populated 1440×900 view nor the
required 1024px check could be captured. No screenshot is claimed. Repeat the
normal authenticated Route-pack inspection when a persistent local server and
merchant session are available.

## File and module budget

- New reusable production modules: 0
- Production files changed: 8
  - `app/(app)/reports/loading.tsx`
  - `app/(app)/reports/records/page.tsx`
  - `app/api/reports/claims/route.ts`
  - `components/navigation/skeletons/pageSkeletons.tsx`
  - `components/reporting/DashboardCharts.tsx`
  - `components/reports/ExportMenu.tsx`
  - `components/ui/DataTableServer.tsx`
  - `lib/reporting/export.ts`
- Focused tests updated:
  - `tests/lib/reportsPayoutContract.test.ts`
  - `tests/unit/reportingExport.test.ts`

This is within the §12.2 maximum of two new reusable modules and twelve
production files. `DashboardCharts`, `ExportMenu`, and the shared skeleton file
already contained unrelated uncommitted foundation work; this phase changes only
the Reports-specific paths described above.
