# Phase 06 — Minimum shared chart contract

Status: closed. Scope per §12.4/§12.5 of `docs/IMPL_living_precision_product_ui.md`
(LP2, LP-VIZ-02, LP-VIZ-04…08, LP-VIZ-11, LP-MOT-06).

## 1. Scope and baseline

Predecessor Phase 05 is closed (`phase-05.md`, ledger §12.10: `DetailPageShell`,
`.ua-board`, `SettingsNav`, `BuilderShell`, and the verified LP-MOT-10 wash).
This is a **shared-system** phase, not a route phase. Following the Phase 03/04/05
pattern, it lands the canonical chart primitives, proves them in the design-system
gallery, and converges the two existing consumers that carried duplicated frame
anatomy. It does **not** add a chart to any production route.

Regression lock respected: **no production route receives a new chart in this
phase.** The two migrated consumers keep their exact visible output (the report
hero even keeps the same three-way chart/unavailable/empty branch and the same
five-column drillable table); only the *anatomy owner* changes.

Existing baseline before editing:

- `ChartPanel.tsx` was the shared frame, but `components/reporting/DashboardCharts.tsx`
  had grown a **second, hand-rolled** panel (`ReportChartPanel`, reusing the CSS
  module), a hand-rolled empty state (`ChartEmpty`), and a hand-rolled two-series
  `<table>` (`ReportChartDataTable`). That is the duplicated anatomy §12.5 says
  `ChartFrame`/`ChartState` should replace once "at least two consumers" need it.
- `ChartState` was a thin title/description status with no §6.6 state matrix.
- The frame exposed no §6.4 source/freshness metadata (item 7) or "View records"
  drill-down (item 8), and the table could not express more than one series.
- `useChartMotion` had a density cap and a reduced-motion/capture gate but no
  topology-aware initial/update/none phase model (LP-MOT-06).

Owned surfaces:

- new reusable modules: `lib/visualisation/chartContract.ts` (pure role mapping +
  aggregation guards) and `components/charts/authenticated/ChartFrame.tsx`
  (`ChartFrame` / `ChartState` / `ChartDataTable` / `ChartLegend`, plus a
  deprecated `ChartPanel` compatibility shim);
- edited canonical owners: `core/useChartMotion.ts` (topology phases),
  `AuthenticatedCharts.module.css` (state/footer/table styles),
  `RankedContributionChart.tsx` and `DashboardCharts.tsx` (converged onto the
  frame), `cartesian/AnalyticsChartPrimitives.tsx` and `index.ts` (import repoint),
  and `scripts/check-authenticated-design.mjs` (table-primitive allowlist path).

Complexity budget (≤2 new reusable modules, ≤12 production files) respected:
**2 new modules** (`chartContract`, `ChartFrame`) and **9 production files** changed
(incl. the `ChartPanel.tsx` delete). The dev-only gallery harness, the two new test
files, the one updated test, and this doc do not count per §12.2.

## 2. Delivered

**Role mapping + aggregation guards** (`lib/visualisation/chartContract.ts`)

The pure, framework-free half of the contract. `resolveSeriesRole` /
`resolveSeriesSet` implement §6.2: `current` → solid accent, `comparison` →
neutral **dashed**, `related`/`strong`/`secondary`/`tertiary` → the neutral ramp,
`baseline` → neutral-300 (and can never encode a meaningful mark), and the three
semantic roles → the status triplets — reachable only through an explicit semantic
role, never as the fourth categorical colour. `resolveSeriesSet` throws past five
simultaneous analytical categories (semantic/baseline marks do not count toward the
budget). The LP-VIZ-08 guards reject invalid aggregation: `computeRateFromBuckets`
pools raw numerators/denominators (never averages pre-aggregated percentages, and
throws on non-finite/negative/over-unity counts), `assertWaterfallReconciles`
throws when components do not reconcile to the displayed total within currency
rounding, `assertSingleCurrency` blocks a mixed-currency aggregation, and
`classifyValue` keeps null/unavailable distinct from a measured zero.

**Shared chart frame** (`ChartFrame`, LP-VIZ-02)

One server-renderable frame implementing the full §6.4 nine-part anatomy:
question-led title, supporting sentence/value, unit + scope, optional control,
legend/end labels, plot, **source/freshness metadata**, **"View records"
drill-down**, and the accessible **`ChartDataTable`**. The deprecated `ChartPanel`
export maps the legacy prop names onto the frame so nothing breaks during the
route-phase migrations.

**State matrix** (`ChartState`, LP-VIZ-07)

The §6.6 states as a `kind` discriminator (`empty`, `filtered-empty`,
`insufficient-history`, `partial`, `stale`, `disconnected`, `error`,
`mixed-currency`, `unavailable`, `refreshing`), each with an explanation and an
optional next step. Data-integrity blocks (`error`, `mixed-currency`) announce
assertively (`role="alert"`); the rest are polite status regions so a background
refresh never shouts. The tone lives on the state label, never on the series
(§6.6). `loading` stays owned by the geometry-matched skeleton, not this component.

**Accessible data table** (`ChartDataTable`, LP-VIZ-06)

The single accessible-alternative primitive: a multi-column model (a leading
row-header column plus numeric/text data columns), a `<caption>`, right-aligned
tabular numeric columns, and optional per-row deep links — the keyboard-equivalent
of the pointer tooltip. `simpleChartTable` folds the legacy single-value
label/value/context rows onto the same primitive so no consumer hand-rolls a
`<table>`.

**Topology-aware motion** (`useChartMotion`, LP-MOT-06)

The hook now returns a `phase`: it grows once on the first paint where motion is
actually permitted (`initial`), morphs on a value-only update within a stable
category/point set (`update`), and **snaps** (`none`) whenever the topology
changes — tweening between two non-comparable shapes animates a lie — or when the
density cap (>40 marks), reduced motion, or capture mode disallow it. `animatedOnce`
only flips once an animation runs, so the deliberately-false SSR/first-paint render
does not burn the one-shot grow.

**Converged consumers (the duplication removed)**

- `RankedContributionChart` now renders through `ChartFrame` (+ `simpleChartTable`),
  dropping its `ChartPanel` dependency. Visible output unchanged; gained an optional
  `records` drill-down prop for route phases (unused in production).
- `DashboardCharts` deleted `ReportChartPanel`, `ChartEmpty`, and the hand-rolled
  `ReportChartDataTable`. The hero is now a `ChartFrame` with a `ChartState`
  unavailable/empty branch and a five-column `ChartDataTable` model (`trendTable`)
  carrying the exact same period/exposure/recovered columns. No data, wording, or
  visible affordance changed — the `<table>` simply moved into the canonical
  primitive (`scripts/check-authenticated-design.mjs` table-primitive allowlist
  updated `ChartPanel.tsx` → `ChartFrame.tsx`; ratchet held at 9/10).

## 3. Verification

| Command | Result |
|---|---|
| `npm run lint:authenticated-design` | Pass — 451 files; ratchet unchanged (arbitraryDesignValue 0/0, upperCaseEyebrow 0/0, handRolledTable 9/10 — the report table consolidated into `ChartFrame`, net count flat) |
| `npx tsc --noEmit` | Pass (exit 0), covering the two new modules, the migrated consumers, and the gallery |
| `npx jest chartContract phase06Charts reportsPayoutContract reportChartModel authenticatedChartSelectors` | Pass — 5 suites, 42 tests (31 new) |
| `npm run lint` (eslint) | Pass (exit 0). Two pre-existing warnings remain in files this phase did not touch (`app/global-error.tsx`, `lib/evidence/pdfDocumentView.tsx`) and do not fail the build. One pre-existing **error** — a `.toLocaleString()` in the Phase-05 changed-value gallery demo (`DesignSystemGalleryClient.tsx`), never caught because Phase 05 ran the design lint but not full eslint — was surfaced by this phase's full run and fixed in passing (`formatNumber`, dev-only, one line) so the gate is genuinely green |
| Diff-scope review | 2 new modules, 9 production files (incl. `ChartPanel.tsx` delete); no route-content rewrite, no data/fetch change, no new production chart. Large `git diff --stat` numbers on `docs/IMPL_living_precision_product_ui.md` and the dev gallery are cumulative prior-phase uncommitted work on this branch, not Phase 06 scope |

### 3.1 Focused-pack tests

- `tests/unit/chartContract.test.ts` (18 tests): role → token/dash/meaning
  mapping; ≤5-category enforcement and the semantic/baseline exemption; the
  baseline-as-meaningful rejection; **rate never averages percentages** (pooled
  0.2 ≠ mean 0.3125) and throws on bad counts; waterfall reconciliation accept/
  reject; mixed-currency block; null/zero/unavailable distinctness; the 3/7 minimum
  points rule. This is the "invalid aggregation fails focused domain tests" gate.
- `tests/components/phase06Charts.test.tsx` (13 tests, jsdom): `ChartFrame` exposes
  question/summary/scope/freshness/drill-down and names its region; `ChartDataTable`
  renders one accessible table with a caption, right-aligned numeric columns, a
  `<th scope="row">`, row deep-links, and every plotted value as text
  (keyboard-equivalent), and renders nothing when empty; the `ChartState` matrix
  announces alert vs status by kind and carries `data-kind`; `RankedContributionChart`
  renders inside a labelled frame with its table and empty state; and `useChartMotion`
  goes initial → update → snap-on-topology-change, respects the density cap, and
  respects reduced motion/capture.
- `tests/lib/reportsPayoutContract.test.ts` updated: the Phase-06 consolidation
  moved the hand-rolled `<table>` + "View chart data" out of `DashboardCharts` into
  `ChartFrame`. The test now asserts the drillable accessible table still exists (in
  the frame) and that `DashboardCharts` still feeds it the exact five-column model
  (`trendTable`, `Exposure to date`, `Recovered to date`). Behavioural intent
  preserved; the assertion tracks the new owner.

### 3.2 Primitive-pack (design-system specimen)

Two new gallery sections were added (`/dev/design-system`): "Shared chart frame —
§6.4 anatomy" (a real `ChartFrame` with question, summary, scope, control, role
legend, area plot, freshness line, "View records" drill-down, and the accessible
`ChartDataTable`) and "Chart data states — §6.6 matrix" (all ten `ChartState`
kinds with their next-step actions). The design-system gallery sits behind the
authenticated `(app)` layout and this session's browser is unauthenticated (safety
rules prohibit entering a password) and cannot reach the other session's dev server
running in this folder — the same constraint documented and closed against in
phase-03 §5 / phase-04 §4 / phase-05 §3. Visual correctness is therefore proved by:
the design lint (every mark reads a `--ua-chart-*`/semantic token — no raw literal),
`tsc` over the real gallery specimen, and the 13 focused DOM mounts above (which
assert the real rendered anatomy, roles, and table structure). The role/dash/theme
behaviour is inherited from the existing tokenised CSS module (`--ua-chart-*` light
and dark values already verified in Phase 01) and the `resolveSeriesRole` contract
tests; reduced-motion/capture is covered by the `useChartMotion` test.

## 4. Changed files

New: `lib/visualisation/chartContract.ts`,
`components/charts/authenticated/ChartFrame.tsx`,
`tests/unit/chartContract.test.ts`, `tests/components/phase06Charts.test.tsx`.

Modified: `components/charts/authenticated/index.ts`,
`components/charts/authenticated/RankedContributionChart.tsx`,
`components/charts/authenticated/cartesian/AnalyticsChartPrimitives.tsx`,
`components/charts/authenticated/core/useChartMotion.ts`,
`components/charts/authenticated/AuthenticatedCharts.module.css`,
`components/reporting/DashboardCharts.tsx`,
`scripts/check-authenticated-design.mjs`,
`tests/lib/reportsPayoutContract.test.ts`,
`app/(app)/dev/design-system/DesignSystemGalleryClient.tsx` (dev gallery),
`docs/IMPL_living_precision_product_ui.md` (§12.10 ledger).

Deleted: `components/charts/authenticated/ChartPanel.tsx` (moved to `ChartFrame.tsx`).

## 5. Remaining follow-ups (not introduced by this phase)

- **Route chart migration (LP-VIZ-09/10).** Only the two representative consumers
  were converged. Every production route wires the full §6.8 contract — declared
  measure/dimension/drill-down, freshness, `records` link, filter scope — onto the
  frame in its owning route phase (07–26). Waterfall / ranked / composition /
  metric-switcher / pinned-selection / drill-down primitives are built by the first
  route phase that genuinely uses each form, then shared (§12.5); Phase 06 built no
  speculative catalogue.
- **Drillable keyboard interaction (LP-VIZ-04 roving focus, LP-VIZ-05).** Phase 06
  delivers the *keyboard-equivalent values* half (labelled summary + `ChartDataTable`
  + keyboard-reachable drill links — the model every current, non-drillable product
  chart uses) and the tooltip contract. The drillable roving-mark-focus + pinned-
  selection-into-records + Escape-restore interaction is expanded by the first route
  phase that ships a drillable production chart, exactly as the LP-MOT-06 ledger note
  directs; building it now with no consumer would be the speculative catalogue §12.5
  forbids.
- **LP-VIZ-11 hero substitutes.** The deprecation contract for prose/3px-rail hero
  substitutes is recorded (§6.7; `KeyInsightCallout`/`SummaryRail` remain for concise
  editorial context only). The route-level "no data-rich primary route uses them as
  its lead visual" check rides with the route phases; Phase 06's regression lock
  forbids route changes and it introduced no lead-visual substitute.
