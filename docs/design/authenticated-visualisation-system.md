# Authenticated visualisation-system audit

Baseline commit: `b413ab4c97881a5df9b127c1916d7db07d12303b` · **Superseded (visual layer) by:** `docs/IMPL_chart_visualisation_system.md` (the "Autumn" chart language, T1–T10) — this document's structural contracts (real-data-only, no query duplication, truthful states, per-route mapping) remain binding; the primitive roster and skeleton variant names below reflect the shipped Autumn result.

This document records the visualisation audit and source-data mapping for the reference-led authenticated redesign. The committed route, permission, loader, mutation, export and URL contracts remain the product baseline; chart work is presentation-only.

> **Update — 2026-07-17 (operational de-chart).** Full charts are now concentrated on `/dashboard` and `/reports` only. Every operational route (`/work`, `/claims`, `/customers`, `/losses`, `/recoveries`, `/rules`, `/flows`, `/integrations`, `/notifications`) had its hero chart removed and replaced by a `KeyInsightCallout` (a one-line insight computed from data the loader already holds, in the `primaryVisual` band) plus a `SummaryRail` in `WorkbenchPage.rail` (distributions, counts, a `SparkTrend`/`TickMeterRow`). Deleted components: `DeadlineRiskChart`, `ColumnComparisonChart`, `RangePlotChart`, `SourceHealthMatrixChart`, `StatusMatrixChart`, `MiniBarSequenceChart`, `DotMatrixChart`. Retained for dashboard/reports/rail use: `SegmentCompositionCard`, `BlockRailChart`, `TickMeterRow`, `RankedContributionChart`, `SparkTrend`, and the `cartesian/*` charts. Per-route mapping: `styles/authenticated/README.md` §6.

## Repetition found

The previous pass used one `OperationalVisualSummary` composition—segmented distribution on the left and a sixteen-cell coverage meter on the right—on nine unrelated routes:

- `/work`
- `/claims`
- `/losses`
- `/recoveries`
- `/customers`
- `/rules`
- `/flows`
- `/integrations`
- `/notifications`

That component made deadlines, payout decisions, money, customer context, configuration state, provider health and inbox activity look like the same question. It was removed after all nine usages were migrated.

## Approved authenticated chart library (Autumn — T1–T10)

All current-state primitives live in `components/charts/authenticated/**`. Operational-route primitives are server-rendered HTML/CSS/SVG; only `cartesian/**` (Dashboard, Reports) uses Recharts, code-split and confined by the design lint guard. Every plot-geometry constant (hatch pitch, rail height, tick dimensions, bar caps, cursor dash, …) lives once in `core/geometry.ts` — the T1–T10 treatment vocabulary is decoded in full in `docs/IMPL_chart_visualisation_system.md` §1.

| Primitive | Intended question | Treatment | Skeleton variant |
|---|---|---|---|
| `DeadlineRiskChart` | How much work is overdue, due today, upcoming or unscheduled? | Flat tracks, orange ordinal ramp | `bands` |
| `ColumnComparisonChart` | How do a few categorical states compare? | T4 cap-top bars | `columns` |
| `RankedContributionChart` | Which compatible categories contribute most value? | Mono ranked rows, tone-coloured fills | `ranked` |
| `BlockRailChart` | How much volume/value is at each operational stage, with what's still outstanding? | T6 block rail + pins + hatched remainder | `rail` |
| `TickMeterRow` | What share of a total has come through, as a rate? | T7 tick meter + interpretive caption | `meter` |
| `SegmentCompositionCard` | How does a total decompose by category, ranked? | T8 segment bar + dot legend + ranked rows | `segment` |
| `RangePlotChart` | What share of one population has each condition? | Hairline dot-plot ranges | `dotplot` |
| `StatusMatrixChart` | What is the current state of each configuration family? | T5 cell geometry, status hues + glyph key | `matrix` |
| `MiniBarSequenceChart` | How does configured action load vary by definition? | Cap-top bars, 2px surface gaps | `sequence` |
| `SourceHealthMatrixChart` | What is each provider's connection, freshness and record state? | Status-hue block cells + icon key | `health` |
| `DotMatrixChart` | When did real records arrive, at what intensity? | T5 dot-matrix, ordinal/single-hue | `matrix` |
| `SparkTrend` | What's the recent trend behind a single metric tile? | 60×20 inline sparkline | `sparkline` |
| `MetricTabs` / `WorkbenchKpiStrip` | KPI row that may also drive a chart's series | T9 tile anatomy | — |
| `TrendLineChart` / `ComboBarLineChart` / `DualLineChart` | Historical financial trend or period comparison (Dashboard/Reports only) | T3 trend + hatched fall / T4 cap-top + dashed comparison | `trend` / `combo` |

`ChartPanel` supplies the shared panel header, annotation, compact/dot legend, tab-strip slot, pin-annotation slot, interpretive-caption slot, focus-visible `View chart data` disclosure, table treatment and empty-state geometry.

**Superseded/removed:** `StageFunnelChart` (replaced by `BlockRailChart`'s stage variant — clip-path funnel implied a conversion rate the data never supported) and `ActivityStripChart` (replaced by `DotMatrixChart`) were deleted; no route imports them.

## Route mapping and real-data contract

| Route | Visual | Why it fits | Existing source fields | State/filter scope |
|---|---|---|---|---|
| `/dashboard` | `MetricTabs` (T9) driving `ComboBarLineChart` (T4); `SegmentCompositionCard` work composition; `BlockRailChart` data health | Merchant operating overview and period comparison | Existing intelligence report bridge, trend, workflow and source coverage loaders | `range`, `compare`, `currency`, `timezone` |
| `/work` | `DeadlineRiskChart` (flat tracks, orange ordinal ramp) | Queue decisions are driven by deadlines | Existing `work_tasks.status`, `due_at`; exceptions remain separately counted | Full merchant active-task population; queue table retains `view` and `page` |
| `/claims` | `ColumnComparisonChart` (T4 cap-top), decision-state grouping | Compares evidence and merchant-decision stages | Existing full-queue counts from `fetchClaimQueueCounts` | Entire active queue, explicitly labelled; table filters and pagination remain unchanged |
| `/losses` | `SegmentCompositionCard` (T8) loss attribution | Shows where compatible current loss value is concentrated, ranked by category | Existing ledger rows: `attribution`, `case_category`, realised/estimated loss, written-off state and currency; `selectLossContributions` groups by raw attribution/category key (not the humanised label) so `href`/`key` stay stable | Same dominant currency as KPI; written-off and incompatible currency rows disclosed and excluded |
| `/recoveries` | `BlockRailChart` (T6) stage rail with pins + hatched remainder; `TickMeterRow` (T7) recovered vs recoverable | Makes evidence, active, chase and closed volumes legible, plus the recovery rate | Existing `RecoveryCase.status` and `evidence_missing`; `estimated_recoverable_max`/`amount_recovered` sums | Full merchant recovery population already loaded by the board |
| `/customers` | `RangePlotChart` (dot-plot restyle) | Compares conditions against one filtered customer denominator | Existing filtered KPI totals: customers with open cases, any history and no recorded history | Search, refund, chargeback, open-case and other existing URL filters |
| `/rules` | `StatusMatrixChart` (T5 cell geometry) | One cell per actual rule family is more useful than a repeated percentage rail | Existing derived `hasDraft`, `publishedVersion` and disabled state | Full visible, non-archived merchant rule set |
| `/flows` | `MiniBarSequenceChart` | Shows definition complexity without implying executions or outcomes | Existing `outputs.length`, active state and draft state | Full visible merchant flow-family set |
| `/integrations` | `SourceHealthMatrixChart` | Provider × connection/freshness/records is inherently matrix-shaped | Existing connector catalogue status, canonical freshness confidence/timestamp and imported-record count | Merchant connector catalogue; deferred live verification refreshes canonical stored state after paint |
| `/notifications` | `DotMatrixChart` (T5, blue ramp) | Inbox records have real timestamps and attention state | Existing latest notification rows: `created_at`, `read_at` | Latest seven represented UTC dates within the existing newest-100 result limit |
| `/partners` | KPI-only, intentionally | Rows aren't yet loaded in a shape a useful chart could summarise | Existing partner/rule KPI counts only | No chart added — recorded here rather than forcing a new query |
| `/reports` | `DualLineChart` (T3, 2-series) exposure/recovered; `RankedContributionChart` loss causes | Configurable analysis supports greater density | Existing intelligence report trend, causes and money bridge | Existing report range/timezone/currency/export state |

## Routes intentionally not given a primary chart

Settings forms, onboarding forms, help, errors, permission states, import/setup screens and most record-detail pages do not already load a complete population suitable for a truthful aggregate chart. Their forms, timelines, evidence lists, source context, tables and actions remain intact. No duplicate query was added merely to make those pages more graphical. Compatibility and redirect-only routes retain their existing destinations and query context.

Detail pages keep compact, record-specific progress/timeline treatments only where already supported by the loaded record. A flat zero series, invented history or cross-record aggregate is not introduced.

## Truth and performance rules

- No chart creates random/static production values, historical points, cross-currency totals or null-to-zero substitutions.
- Page loaders prepare chart data from the same merchant-scoped records already used by KPIs/tables. Chart components do not fetch.
- Current-state operational charts are server-rendered and CSS-based, with bounded DOM counts and no animation.
- External integration verification remains deferred; the initial matrix renders stored canonical state and refreshes after the page is interactive.
- Every migrated route selects a chart-specific loading geometry to prevent the old generic-summary layout shift.
- The authenticated design guard rejects the removed `OperationalVisualSummary`, route-local chart-library imports and route-local pulse skeletons, any `echarts`/`echarts-for-react` import (removed entirely — §12), any reference to the deleted `--dashboard-*` remap layer, and Recharts' own default palette/tooltip leaking through un-themed.
- A chart mark links to a real destination (`Link`, not a bare `onClick`) only when the route's loader already has the entity id or filter value to build it; otherwise the mark stays inert and is named as such rather than wired to a fabricated href. See `docs/IMPL_chart_visualisation_system.md` §4.5 for the per-route destination table.

## PR checklist for chart changes

- [ ] Form chosen from the T1–T10 roster by the route's operational question (not by what looks nice)
- [ ] Data comes from an existing loader/selector — no new query added merely to feed a chart
- [ ] Filters already active on the page are honoured by the chart
- [ ] The corresponding `AuthenticatedChartSkeleton` variant is updated to match resolved geometry
- [ ] `View chart data` is present and its rows carry the same `href` as any linked mark
- [ ] Widths 1440 / 1280 / 1024 / 768 / 390 checked — no horizontal overflow, no clipped labels, no tooltip clipping
- [ ] Dark mode checked
- [ ] Reduced motion checked (no entry animation, hover lift/fade disabled)
- [ ] Totals cross-checked against the page's own table/KPIs
- [ ] `npm run lint:authenticated-design` green
