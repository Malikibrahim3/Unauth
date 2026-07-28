# Implementation Plan — Chart Variety, Integrity, and Geometry Consistency

**Status:** Proposed; implementation approval required  
**Created:** 2026-07-28  
**Scope:** Authenticated Overview and Reports visualisations  
**Canonical parent:** [`IMPL_living_precision_product_ui.md`](./IMPL_living_precision_product_ui.md), especially §6–§7  
**Evidence:** `Screenshot 2026-07-28 at 05.10.22.png` and `Screenshot 2026-07-28 at 05.10.51.png`

This document specifies the next visualisation pass. It does not authorise
product-code changes by itself.

---

## 1. Outcome

Overview and Reports must feel like one deliberate analytical product rather
than a sequence of interchangeable bar and line charts.

The implementation must:

1. fix the broken Reports trend;
2. restore visible fills to linked ranked bars;
3. introduce meaningful chart variety based on the question and data shape;
4. standardise the physical thickness of comparable marks across the app;
5. preserve exact values, financial truth, drill-downs, and accessible tables;
6. retain the existing flat, low-chroma Living Precision visual language; and
7. avoid decorative charts, gradients, 3D effects, glow, and invented history.

Chart variety is not a target count. Each visual form must earn its place by
answering a different business question more clearly than the alternatives.

---

## 2. Evidence and diagnosis

| Evidence | Diagnosis | Required response |
|---|---|---|
| Reports exposure line appears as isolated dots and short disconnected fragments | Daily financial buckets contain valid null gaps. `DualLineChart` correctly refuses to connect them, but a line is the wrong encoding for this sparse event series | Replace the raw daily line with a cumulative area-and-line view that can truthfully carry a known balance through event-free buckets |
| The explanatory “gaps are not zero” copy is more prominent than the plotted story | The visual requires prose to excuse its geometry | Remove the gap disclaimer from the normal state; reserve partial-data messaging for genuinely unknown intervals |
| Overview priority tracks appear empty | Linked ranked rows render the fill as an inline `span`; percentage width and full height are therefore not reliably painted | Make the fill a block-level mark and add a visual regression assertion for non-zero fill width |
| Several screens repeat columns, lines, and horizontal bars | Components were selected by availability rather than question/data shape | Adopt the route-level chart assignment in §5 |
| Workflow, recovery, ranked, and health bars use visibly different thicknesses | Geometry is split across TypeScript constants, CSS values, and route-local utility classes | Adopt the shared thickness contract in §4 and remove local values |
| Wide charts use large amounts of empty plot area | Sparse series and one-category rankings expand to the full available width | Use cumulative state, constrained plots, or a non-chart single-category state as specified below |

### 2.1 Root cause of the Reports trend

`DashboardCharts.tsx` builds daily exposure and recovery values with
`buildDashboardChartBuckets`. Buckets without a reconciled event remain `null`.
`DualLineChart` uses `connectNulls={false}`, so:

- a single known bucket becomes a dot;
- two adjacent known buckets become a short segment; and
- separated known buckets remain disconnected.

Changing `connectNulls` to `true` is not an acceptable fix. It would draw a
continuous trend through unknown intervals and imply observations that do not
exist.

The correct fix is to change the measure shown by the chart:

- raw event amount remains available in the table and tooltip;
- the plot shows cumulative known exposure and cumulative recovered value over
  the selected period;
- an event-free, fully observed bucket carries the last cumulative value
  forward; and
- a genuinely unknown or incomplete bucket remains unknown and visibly
  interrupts the plot.

### 2.2 Root cause of the ranked-bar failure

`RankedContributionChart` uses a linked `span.rankedFill` inside
`a.rankedTrack`. The fill is not explicitly block-level, so its percentage width
and `height: 100%` are not dependable. The implementation must make both linked
and non-linked paths share the same block-level mark primitive.

---

## 3. Chart-selection rules

Use this decision order before choosing a component:

| Question | Preferred encoding | Avoid |
|---|---|---|
| How is a known total accumulating over time? | Cumulative area with a related line | Raw line through sparse event values |
| What happened in discrete time buckets? | Fixed-width columns | Widely stretched columns or smoothed lines |
| Where is value or work concentrated? | Ranked horizontal bars | Donut with more than five categories |
| What share belongs to each mutually exclusive state? | Donut for 2–5 states | Multiple separate progress bars |
| What proportion is healthy/current? | Waffle matrix or compact percentage ring | Another full-width progress rail |
| How do stage amounts compare on one scale? | Stage dot plot | Four unrelated progress bars |
| How did components reconcile to a total? | Waterfall, only when mathematically reconciled | Decorative funnel |
| Is there only one category? | Exact fact with context and drill-down | One-slice donut or a needlessly stretched chart |

Additional rules:

- A line represents continuity. Do not use one for intermittent event amounts.
- An area represents an accumulated or continuous magnitude. It must not be
  used for unrelated categorical totals.
- A donut is part-to-whole only, with mutually exclusive categories and no more
  than five visible slices.
- Bar length may vary because it encodes value. Cross-axis thickness must not
  vary within a geometry class.
- Do not smooth financial lines with cubic interpolation.
- Never replace null, unavailable, or unreconciled values with zero.

---

## 4. Shared geometry contract

“Consistent bars” means consistent **thickness**, corner treatment, and spacing.
Length continues to encode the data and must remain variable.

### 4.1 Mark classes

| Geometry class | Target | Applies to |
|---|---:|---|
| Full cartesian column | `36px` fixed width | Overview hero and other full-size temporal column charts |
| Compact cartesian column | `24px` fixed width | Compact histograms and supporting charts |
| Quantitative horizontal bar | `12px` height | Ranked contribution and recovery/progression bars that remain |
| Composition strip | `12px` height | Workflow composition and other 100% stacked strips |
| Micro meter | `8px` height | KPI rails only |
| Primary line | `2.25px` stroke | Current continuous series |
| Comparison line | `1.5px` stroke, dashed | Prior-period comparison |
| Area boundary | `2px` stroke | Cumulative area outline |
| Area fill | Flat primary fill at `10–14%` opacity | Cumulative magnitude; never a gradient |
| Dot-plot mark | `8px` diameter with `2px` surface ring | Stage dot plot |
| Waffle cell | `7px` square with `2px` gap | Data-health matrix |

### 4.2 Geometry ownership

Implement one source of truth:

- Recharts dimensions live in
  `components/charts/authenticated/core/geometry.ts`.
- CSS-backed charts consume matching custom properties defined in
  `styles/authenticated/tokens.css`.
- Route components may choose a named geometry class, but may not provide a
  numeric width, height, radius, or gap.
- Add a design-contract check that rejects route-local bar thicknesses and
  superseded geometry constants.

Proposed names:

```text
CARTESIAN_BAR_SIZE = 36
CARTESIAN_BAR_SIZE_COMPACT = 24
HORIZONTAL_BAR_HEIGHT = 12
COMPOSITION_STRIP_HEIGHT = 12
MICRO_METER_HEIGHT = 8
DOT_PLOT_MARK_DIAMETER = 8
```

CSS mirrors:

```text
--ua-chart-bar-thickness: 12px
--ua-chart-composition-thickness: 12px
--ua-chart-meter-thickness: 8px
```

### 4.3 Width behavior

- Recharts columns use explicit `barSize`, not only `maxBarSize`.
- All columns in the same plot have identical rendered width.
- Full and compact sizes are the only permitted cartesian column variants.
- At narrow widths, reduce visible buckets or enable internal horizontal
  scrolling before shrinking marks below the compact size.
- A chart with four or fewer categories changes to ranked horizontal bars.

---

## 5. Target chart map

### 5.1 Overview

| Surface | Current | Target | Reason |
|---|---|---|---|
| Financial hero | Daily columns plus recovery line | Keep combo chart; enforce fixed 36px columns and correct plot padding | Discrete event amounts suit columns; recovery remains a related line |
| Priority work | Ranked horizontal bars, currently visually empty | Keep and fix ranked bars at 12px | Ranking is the correct question and encoding |
| Workflow breakdown | 100% strip plus repeated rows | Replace the strip with a composition donut and direct four-item legend/list | Adds part-to-whole variety and makes the workflow mix immediately legible |
| Data health | 28px progress rail | Replace with a 10×10 waffle matrix plus exact current/stale counts | Health is a proportion; a matrix is visually distinct and avoids another bar |
| KPI row | Three 8px micro rails | Keep micro rails; use them only as KPI context | Micro marks are appropriately compact and not standalone charts |

The Overview should therefore contain:

1. one combo column/line chart;
2. one ranked-bar chart;
3. one composition donut;
4. one waffle matrix; and
5. optional KPI micro meters.

### 5.2 Reports

| Surface | Current | Target | Reason |
|---|---|---|---|
| Financial hero | Sparse dual-line chart | Cumulative exposure area with recovered line; optional dashed prior-period line | Produces truthful continuity and removes broken fragments |
| Loss causes | Ranked bars | Keep for 2–6 causes; use a single-cause fact when only one cause exists | Ranking remains the best encoding; a one-item chart adds no information |
| Recovery progression | Four proportional horizontal bars | Replace with a stage dot plot on one shared monetary scale | Shows stage drop-off without repeating another bar treatment |
| Headline metrics | Values with optional sparklines | Keep | Appropriate compact trend context |
| Needs attention | Ranked bars | Keep below the financial analysis | Operational concentration is a ranking question |
| Recovery performance | Ranked bars | Keep only when it represents multiple recovery sources; otherwise use an exact fact | Avoid a one-row pseudo-chart |

The Reports page should therefore contain:

1. one cumulative area/line chart;
2. one stage dot plot;
3. ranked bars only where there is a real ranking; and
4. small sparklines inside headline metrics.

---

## 6. New and changed primitives

### 6.1 `CumulativeAreaLineChart`

**New file:**  
`components/charts/authenticated/cartesian/CumulativeAreaLineChart.tsx`

Responsibilities:

- accept already prepared cumulative points;
- render one flat low-opacity area for cumulative exposure;
- render recovered value as a 2.25px semantic line;
- optionally render prior exposure as a neutral dashed line;
- use linear or step-after interpolation, selected by the data contract;
- expose exact raw increment and cumulative value in the tooltip;
- share `ChartCursor`, `ChartTooltip`, `useChartMotion`, and measured width;
- render no dots by default; show one active point on hover/focus;
- retain an accessible data table containing raw and cumulative values.

The preferred interpolation is `stepAfter` because a cumulative financial total
changes on a dated event and then remains stable until the next event.

### 6.2 Cumulative series builder

**New file:**  
`components/reporting/reportChartModel.ts`

Define a pure function that returns:

```ts
type CumulativeFinancialPoint = {
  key: string;
  label: string;
  exposureIncrementMinor: number | null;
  recoveredIncrementMinor: number | null;
  cumulativeExposureMinor: number | null;
  cumulativeRecoveredMinor: number | null;
  previousCumulativeExposureMinor?: number | null;
  state: 'observed' | 'empty' | 'unknown';
};
```

Rules:

- `observed`: add the reconciled increment to the prior cumulative value;
- `empty`: carry the prior cumulative value forward;
- `unknown`: emit `null` and do not bridge the interval;
- after an unknown interval, resume only from a server-supplied known cumulative
  checkpoint or show the remainder as partial;
- never infer zero from a missing financial state;
- final cumulative values must reconcile to the headline report totals within
  currency rounding;
- comparison uses an equal-length prior period and the same bucket cadence.

### 6.3 `CompositionDonutChart`

Refactor or replace the current `AnalyticsDonutChart` so the authenticated
version:

- uses role-based chart tokens rather than the legacy severity palette;
- accepts 2–5 mutually exclusive segments;
- places the total or selected percentage in the centre;
- uses a flat 2px surface separator and no gradient;
- uses the shared measured-width strategy;
- supports restrained initial motion through `useChartMotion`;
- supplies a direct legend and accessible table.

### 6.4 `WaffleMatrixChart`

**New file:**  
`components/charts/authenticated/operational/WaffleMatrixChart.tsx`

For Overview data health:

- render 100 cells in a 10×10 matrix;
- filled cells represent rounded freshness percentage;
- remainder cells use the neutral track token;
- use the analytical primary colour for “current” and warning only for the
  explicit reconciliation state;
- show the exact percentage, current count, stale count, and ledger status in
  text;
- cells are not individually focusable;
- accessible name reports exact counts, not the rounded cell count.

### 6.5 `StageDotPlot`

**New file:**  
`components/charts/authenticated/operational/StageDotPlot.tsx`

For Reports recovery progression:

- use one common zero-to-maximum-exposure scale;
- render a 1px baseline and one 8px dot for each stage;
- keep row height and dot size identical across stages;
- show stage label, exact amount, and conversion text;
- use primary for exposure/eligible, positive for recovered, and neutral for
  outstanding;
- preserve the existing stage record links;
- expose an accessible table or definition list.

### 6.6 Ranked-bar repair

Change `RankedContributionChart` and its styles so:

- the linked and non-linked branches use the same mark element;
- `.rankedFill` is `display: block`;
- the track and fill are both exactly 12px high;
- zero renders no fill;
- positive non-zero values render at least a visible 2px length while retaining
  the exact value in text;
- one-row input uses the single-category state instead of a full chart;
- all row links retain a 24px minimum interaction target.

---

## 7. Copy changes

### Reports hero

Current:

> How is financial exposure changing?  
> Daily ledger value  
> Gaps indicate that no reconciled value was recorded for that bucket; they are
> not zero.

Target:

> How is financial value accumulating?  
> Cumulative exposure and recovered value · Last 30 days · GBP

Only show a partial-data notice when an interval is genuinely unknown:

> Some dates could not be reconciled. The chart does not bridge those intervals.

### Overview support titles

- Workflow: **How is work distributed by state?**
- Data health: **How much source data is current?**
- Priority: keep **Where is work accumulating?**

Copy must describe the measure actually encoded. “Daily” must not remain on a
cumulative chart.

---

## 8. Implementation sequence

### Phase 1 — Repair and geometry

1. Add the shared geometry constants and CSS custom properties.
2. Repair linked ranked-bar fills.
3. Give every full cartesian column an explicit shared `barSize`.
4. Remove route-local horizontal bar heights.
5. Add geometry-focused unit and browser assertions.

This phase may ship independently because it fixes visible defects without
changing report semantics.

### Phase 2 — Reports truthfulness

1. Add the cumulative series builder and reconciliation tests.
2. Build `CumulativeAreaLineChart`.
3. Replace the sparse Reports dual-line hero.
4. Add raw-increment and cumulative columns to the accessible table.
5. Replace recovery bars with `StageDotPlot`.
6. Add the single-cause and single-recovery-source states.

### Phase 3 — Overview variety

1. Build/refactor `CompositionDonutChart`.
2. Replace Workflow’s composition strip.
3. Build `WaffleMatrixChart`.
4. Replace the Data health block rail.
5. Verify that the lower cards remain balanced at 1024, 1280, 1440, and 1920px.

### Phase 4 — Consolidation

1. Remove visual primitives no longer used by authenticated routes.
2. Add the route-to-chart map to the authenticated design guard.
3. Update screenshots and visual regression fixtures.
4. Fold the approved decisions from this document into the canonical Living
   Precision specification.

---

## 9. Acceptance criteria

### 9.1 Reports hero

- No normal report renders isolated line dots or disconnected fragments.
- Event-free observed dates produce a horizontal cumulative plateau.
- Unknown intervals remain visibly interrupted and are never bridged.
- The final cumulative exposure and recovery values match the headline totals
  within currency rounding.
- The chart contains a visible area, recovered line, and optional dashed
  comparison line.
- Axis labels, including the leading currency symbol, are fully visible.
- Tooltip reports date, raw increment, cumulative total, and comparison when
  present.
- “View chart data” exposes both raw and cumulative values.

### 9.2 Bar consistency

- Every full cartesian column on a given viewport is exactly 36px wide.
- Every compact cartesian column is exactly 24px wide.
- Every full horizontal quantitative bar and composition strip is exactly 12px
  high.
- Every KPI micro meter is exactly 8px high.
- Bar radius and category gap come only from the shared geometry contract.
- Ranked bars with non-zero values visibly paint their fill.
- Tests compare cross-axis thickness, never value-encoded length.

### 9.3 Variety

- Overview visibly contains combo, ranked, donut, and matrix encodings.
- Reports visibly contains area/line, dot-plot, ranked, and sparkline encodings.
- No page contains two adjacent full-width visuals with the same encoding unless
  they are intentional small multiples sharing one scale.
- A one-category dataset does not render a donut or a stretched full chart.

### 9.4 Accessibility and truth

- Every chart has a question-led accessible name.
- Colour is not the only series discriminator.
- Exact values remain visible or available in an adjacent table/definition list.
- Drill-down links preserve the current report range, timezone, currency, and
  metric/stage.
- Reduced motion and capture mode render settled geometry.
- Forced-colour mode retains visible marks, focus states, and comparisons.
- Null, zero, empty, stale, and unknown remain distinct.

### 9.5 Responsive visual QA

Capture and inspect:

- `1920×1080`
- `1440×900`
- `1280×800`
- `1024×768`

At every size:

- no chart is clipped;
- no currency tick loses its leading symbol or digit;
- no legend overlaps the plot;
- no full chart drops below its geometry floor;
- the Reports hero remains at least 300px high;
- the Overview support cards align without artificial empty height; and
- expanding “View chart data” does not move or resize the plot above it.

---

## 10. Test plan

### Unit

- cumulative series: observed increment, empty carry-forward, unknown break,
  resume behavior, negative/invalid input rejection, and final reconciliation;
- bar width and height constants;
- one-category fallback;
- donut maximum-category handling;
- waffle rounding with exact text values;
- stage dot positions and zero baseline.

### Component

- linked ranked bars have non-zero computed fill dimensions;
- area chart renders area path, recovered path, and optional comparison path;
- reduced motion disables Recharts animation;
- chart tables retain record URLs;
- tooltip values match source data;
- no visual bridges an unknown interval.

### Browser

- authenticated Overview and Reports at all supported widths;
- `7d`, `30d`, `90d`, and `all` ranges;
- one event, sparse events, dense events, all-zero, mixed known/unknown, and no
  financial data;
- one cause, five causes, more than five causes;
- light, dark, forced-colour, reduced-motion, and capture modes;
- screenshot comparison for mark thickness and plot clipping.

### Required commands

```text
npm run typecheck
npm run lint
npm run lint:authenticated-design
npm run test -- --runInBand
```

Run the focused authenticated browser suite after local visual approval.

---

## 11. Non-goals

- Replacing Recharts solely for visual novelty.
- Adding decorative gauges, 3D funnels, radar charts, gradients, or animated
  backgrounds.
- Inventing a historical balance where only current totals exist.
- Making all bars the same length.
- Combining currencies.
- Changing report calculations, workflow definitions, permissions, or business
  actions.
- Expanding the page into a chart wall.

Recharts remains capable of the required area, line, column, donut, and tooltip
behavior. The defects are primarily chart selection, data semantics, geometry
ownership, and component implementation—not a library limitation.

---

## 12. Definition of done

This plan is complete when:

1. both screenshot defects are covered by automated regression checks;
2. the Reports trend communicates a continuous, truthful cumulative story;
3. linked ranked bars visibly encode their values;
4. bar thickness is owned by one shared system;
5. Overview and Reports use the approved chart map;
6. all exact values and drill-downs remain available;
7. responsive, accessibility, and motion checks pass; and
8. the final browser screenshots are approved before merge.
