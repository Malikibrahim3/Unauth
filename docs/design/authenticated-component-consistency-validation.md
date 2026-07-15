# Authenticated component consistency validation

Date: 2026-07-14

## Shared primitives changed

`Button`, `ButtonLink`, `IconButton`, `StatusBadge`, `FilterChip`, `SegmentedControl`, `Tabs`, `MetadataChip`, `Card`, `MetricCard`, `MetricGroup`, `DataTable`, `EmptyState`, `EvidenceChecklist`, `RecommendationBlock`, `Modal`, `Drawer`, and `PageSizeSelect` now consume the authenticated geometry and action aliases where they are touched. Claims, dashboard, reports, notifications, losses and the development gallery use the canonical filter/sort/action primitives.

## Tokens and deprecated variants

- Actions now use ink, with blue reserved for links, information, provider marks, data visualisation and focus.
- Warm-neutral canvas, selected, hover and border values are authoritative.
- The final radius names are `control`, `card`, `overlay` and `pill`.
- Shared heights are `control-height-sm/md/lg`, `badge-height` and `chip-height`.
- Ordinary cards have no shadow; overlay shadows remain reserved for overlays.
- Claims recommendation/status chips and cobalt selected-row treatment were removed.
- The gallery includes a development-only “Do not use” section.

## Payout Control before/after

| Area | Before | After |
|---|---|---|
| Header | Eyebrow and self-explanatory subtitle | One compact canonical title |
| KPI strip | Separate/marketing-like cards | One bordered four-cell group with quiet descriptions |
| Filters and sort | Mixed local geometry and cobalt selection | `FilterChip` and `SegmentedControl` on shared heights |
| Queue rows | Three competing badges | One status and optional SLA attention; age is text |
| Selected row | Blue/lavender block and bar | Warm-neutral selected surface and ink border |
| Workflow | Blue tinted panel and repeated status chips | Neutral recommendation block with state/action rows |
| Recovery | Raw evidence keys and evidence pills | Humanised evidence checklist and one recovery status |
| Empty state | Detached sentence | Shared compact empty state |

## Guardrails and validation status

`npm run lint:authenticated-design` passes after the changes. It enforces hardcoded colour, arbitrary radius/shadow, old-palette, landing-token and deprecated-import checks, plus a held per-file native-control baseline, a no-new-text-arrow baseline, and a hard ban on authenticated `PanelCard` call sites. Low-level controls remain only as explicit documented exceptions.

## Verification record

| Check | Result |
|---|---|
| TypeScript | Passed |
| Authenticated design lint | Passed |
| ESLint | Passed |
| Build | Passed; 94/94 routes generated |
| Focused payout/component tests | Passed; 3 suites, 44 tests |
| Playwright redesign suite | Passed; 9 tests across desktop, tablet and mobile |
| Playwright critical suite | Passed; 18 desktop tests |
| Playwright content compliance | Passed; 1 desktop test |
| Final evidence spec | Passed; 1 test, 26 screenshot states |

The browser checks cover the seeded route and interaction suites plus the final 26-state evidence capture, but not a manual walkthrough of every authenticated route at every requested width. The final migration counts and limitations are recorded in `authenticated-final-migration-register.md`, `authenticated-final-browser-validation.md`, and `authenticated-responsive-validation.md`.

## Final migration counts

| Pattern | Before | After | Interpretation |
|---|---:|---:|---|
| Authenticated `PanelCard` opening tags | 109 | 0 | Public landing `PanelCard` remains intentionally isolated. |
| Raw `<table>` openings | 15 | 10 | Two are canonical (`DataTable` and `DataTableServer`); eight specialized/legacy views remain documented. |
| Native controls | 235 | 235 | Exact baseline held by the authenticated design guard. |
| Authenticated route files | 66 | 66 | Inventory retained; evidence is curated rather than exhaustive. |
