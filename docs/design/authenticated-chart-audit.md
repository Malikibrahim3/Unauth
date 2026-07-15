# Authenticated chart audit

Date: 2026-07-14 · Final pass

| Chart ID | Route | Purpose | Current issue | Final form | Drill-down | Empty state |
|---|---|---|---|---|---|---|
| `overview-exposure-recovered` | `/dashboard` and `/reports` | Reconciled exposure versus recovered value over time | Recharts defaults needed explicit token and motion rules | Linear two-series line, no animation, tabular tooltip values | Records and underlying cases | Plain explanatory empty state |
| `overview-loss-causes` | `/dashboard` and `/reports` | Ranked confirmed loss causes | Category comparison must stay readable at narrow widths | Horizontal ranked bars, one neutral series, direct labels | Records by category | Plain explanatory empty state |
| `overview-recovery-progression` | `/dashboard` and `/reports` | Requested, pursued and recovered value | Decorative funnel would imply unsupported precision | Stepped ledger/table with ratios only when denominator exists | Claims and recovery records | “Nothing recorded”, never zero for unknown |
| `analytics-line` | Shared analytics consumers | Small time series | Legacy ECharts wrapper allowed gradients and smooth curves | Token-backed restrained line; no smoothing or animation | Consumer-defined | In-chart text state |
| `analytics-bar` | Shared analytics consumers | Small category comparison | Per-entry colours could create arbitrary palettes | Token-backed single-series bars | Consumer-defined | In-chart text state |
| `analytics-donut` | Public demo compatibility only | The former shared component was not used by authenticated routes | Donuts are easy to overuse and hide category comparisons | Retained only for the public demo; no authenticated donut consumer remains | None in authenticated product | In-chart text state |

## Shared chart contract

Chart chrome reads authenticated tokens for axis text, grid, primary/comparison/semantic series, tooltip surface/text, active point and chart heights. Financial charts disable animation and use canonical money formatters. The dashboard reconciles chart inputs from the same `MoneyBridge` values used by the KPI and ledger sections. The expandable chart-data table remains intentionally specialised because it is the reconciliation view for the chart, not a second operational table.

Responsive review points are 1440, 1280, 1024, tablet and critical mobile. The primary line chart has a deliberate minimum height; the category chart uses direct labels and a vertical layout so the legend cannot collide with the plot.

Final evidence: `screenshots-app-2026-07-14-final-craft/01-shell-overview.png` and `12-reports.png` cover the dashboard/report chart compositions at 1440; `22-tablet-overview.png`, `23-mobile-overview.png`, and `25-laptop-overview.png` cover the responsive dashboard chart container. The 768px chart state remains unverified.
