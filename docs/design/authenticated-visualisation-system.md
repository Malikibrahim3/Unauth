# Authenticated visualisation-system audit

Baseline commit: `b413ab4c97881a5df9b127c1916d7db07d12303b`

This document records the visualisation audit and source-data mapping for the reference-led authenticated redesign. The committed route, permission, loader, mutation, export and URL contracts remain the product baseline; chart work is presentation-only.

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

## Approved authenticated chart library

All current-state primitives live in `components/charts/authenticated/**`. They are server-rendered HTML/CSS, use shared chart tokens, add no route JavaScript bundle, query no data and own no merchant business logic.

| Primitive | Intended question | Accessible representation | Skeleton |
|---|---|---|---|
| `DeadlineRiskChart` | How much work is overdue, due today, upcoming or unscheduled? | Named rows plus expandable data table | `deadline` |
| `ColumnComparisonChart` | How do a few categorical states compare? | Labels, numerical values and data table | `columns` |
| `RankedContributionChart` | Which compatible categories contribute most value? | Ordered labels, formatted values and data table | `ranked` |
| `StageFunnelChart` | How much case volume is at each operational stage? | Stage counts and explicit non-conversion copy | `funnel` |
| `RangePlotChart` | What share of one population has each condition? | Percentages, counts and common-denominator table | `range` |
| `StatusMatrixChart` | What is the current state of each configuration family? | Per-cell screen-reader labels and summary table | `matrix` |
| `MiniBarSequenceChart` | How does configured action load vary by definition? | Definition/action table and lifecycle legend | `sequence` |
| `SourceHealthMatrixChart` | What is each provider's connection, freshness and record state? | Matrix mirrored into a row-by-dimension table | `health` |
| `ActivityStripChart` | When did real inbox records arrive, and were they read? | Date/read/unread data table | `activity` |

`ChartPanel` supplies the shared panel header, annotation, compact legend, focus-visible `View chart data` disclosure, table treatment and empty-state geometry. Dashboard and Reports retain their existing historical Recharts views because those routes already load truthful dated series; they use the same `--ua-chart-*` tokens and reduced-motion rules.

## Route mapping and real-data contract

| Route | Visual | Why it fits | Existing source fields | State/filter scope |
|---|---|---|---|---|
| `/dashboard` | Performance bars/previous-period line, workflow composition, data health | Merchant operating overview and period comparison | Existing intelligence report bridge, trend, workflow and source coverage loaders | `range`, `compare`, `currency`, `timezone` |
| `/work` | Deadline-risk bands | Queue decisions are driven by deadlines | Existing `work_tasks.status`, `due_at`; exceptions remain separately counted | Full merchant active-task population; queue table retains `view` and `page` |
| `/claims` | Decision-state columns | Compares evidence and merchant-decision stages | Existing full-queue counts from `fetchClaimQueueCounts` | Entire active queue, explicitly labelled; table filters and pagination remain unchanged |
| `/losses` | Ranked loss contribution | Shows where compatible current loss value is concentrated | Existing ledger rows: `attribution`, `case_category`, realised/estimated loss, written-off state and currency | Same dominant currency as KPI; written-off and incompatible currency rows disclosed and excluded |
| `/recoveries` | Recovery stage-volume funnel | Makes evidence, active, chase and closed volumes legible | Existing `RecoveryCase.status` and `evidence_missing` | Full merchant recovery population already loaded by the board |
| `/customers` | Customer-context range plot | Compares conditions against one filtered customer denominator | Existing filtered KPI totals: customers with open cases, any history and no recorded history | Search, refund, chargeback, open-case and other existing URL filters |
| `/rules` | Rule lifecycle matrix | One cell per actual rule family is more useful than a repeated percentage rail | Existing derived `hasDraft`, `publishedVersion` and disabled state | Full visible, non-archived merchant rule set |
| `/flows` | Flow action-load sequence | Shows definition complexity without implying executions or outcomes | Existing `outputs.length`, active state and draft state | Full visible merchant flow-family set |
| `/integrations` | Source-health matrix | Provider × connection/freshness/records is inherently matrix-shaped | Existing connector catalogue status, canonical freshness confidence/timestamp and imported-record count | Merchant connector catalogue; deferred live verification refreshes canonical stored state after paint |
| `/notifications` | Read/unread activity strip | Inbox records have real timestamps and attention state | Existing latest notification rows: `created_at`, `read_at` | Latest seven represented UTC dates within the existing newest-100 result limit |
| `/reports` | Historical line, ranked cause bars and recovery progression | Configurable analysis supports greater density | Existing intelligence report trend, causes and money bridge | Existing report range/timezone/currency/export state |

## Routes intentionally not given a primary chart

Settings forms, onboarding forms, help, errors, permission states, import/setup screens and most record-detail pages do not already load a complete population suitable for a truthful aggregate chart. Their forms, timelines, evidence lists, source context, tables and actions remain intact. No duplicate query was added merely to make those pages more graphical. Compatibility and redirect-only routes retain their existing destinations and query context.

Detail pages keep compact, record-specific progress/timeline treatments only where already supported by the loaded record. A flat zero series, invented history or cross-record aggregate is not introduced.

## Truth and performance rules

- No chart creates random/static production values, historical points, cross-currency totals or null-to-zero substitutions.
- Page loaders prepare chart data from the same merchant-scoped records already used by KPIs/tables. Chart components do not fetch.
- Current-state operational charts are server-rendered and CSS-based, with bounded DOM counts and no animation.
- External integration verification remains deferred; the initial matrix renders stored canonical state and refreshes after the page is interactive.
- Every migrated route selects a chart-specific loading geometry to prevent the old generic-summary layout shift.
- The authenticated design guard rejects the removed `OperationalVisualSummary`, route-local chart-library imports and route-local pulse skeletons.
