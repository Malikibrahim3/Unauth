# Authenticated final migration register

Date: 2026-07-14

This register is the final-pass inventory after the authenticated visual migration. Counts are repository counts taken before and after this pass; “Browser verified” refers only to the executed evidence set, not to static inventory.

| ID | Route/component | Legacy pattern | Correct replacement | Severity | Fixed | Browser verified |
|---|---|---|---|---|---|---|
| MIG-001 | Authenticated app/components | 109 `<PanelCard>` opening tags across the pre-pass tree | Canonical `Card` variants (`flat`, `muted`, `inset`, `plain`, or `unstyled`) | High | Yes; 0 authenticated call sites remain. The one remaining `PanelCard` belongs to public landing primitives. | Partial; representative route set captured |
| MIG-002 | Reports, losses, claims, customer profile, integrations, claim history | 15 raw `<table>` openings before migration | `DataTable` for interactive client views and `DataTableServer` for server-rendered views | High | Yes for the six operational tables migrated. Current total is 10 openings: two canonical tables plus eight documented specialized/legacy tables. | Yes for reports, losses, claims, customer profile, integrations and case detail evidence |
| MIG-003 | Authenticated app/components | 235 native button/input/select/textarea occurrences | Shared controls where the surface is ordinary product UI; exact low-level exceptions are guarded by file/count baseline | Medium | Baseline held at 235. New files cannot add controls and existing files cannot increase their count without an explicit migration update. | Partial; controls exercised in evidence routes and Playwright suites |
| MIG-004 | Route loading and skeleton systems | Multiple navigation skeleton wrappers plus inline route loading states | `LoadingSkeleton` as the canonical contract; `OperationalRouteSkeleton` remains a compatibility wrapper | Medium | Partial; six route loading files now use the canonical primitive. Legacy navigation skeleton consumers remain documented for follow-up. | Partial; loading transitions covered where seeded routes expose them |
| MIG-005 | Authenticated analytics and reporting | Donut/gradient/default chart affordances and ambiguous chart empty states | Token-backed restrained line/bar/ledger charts with explicit empty states and accessible reconciliation data | High | Yes for authenticated consumers. `AnalyticsDonutChart` remains only for the public demo compatibility path and has no authenticated consumer. | Yes for dashboard/reports evidence; all chart consumers not manually walked |
| MIG-006 | Claims, recovery, integration, settings and notification copy | Raw enum values, UUID-like labels, sentence-shaped status pills, and direct text arrows | `label`/humanise helpers, `StatusBadge`, `MetadataChip`, `EvidenceChecklist`, and Lucide directional icons | Medium | Targeted sweep fixed the inspected authenticated surfaces; comments/public landing copy are outside this pass. | Partial; captured routes and content-compliance suite |
| MIG-007 | Authenticated route inventory | 66 `page.tsx` route files under `app/(app)` | Shared shell and canonical primitives across the route inventory | High | Inventory complete; no route file was deleted. Full migration is not claimed for every route file. | Partial; 26 screenshot states / 19 distinct URL or overlay states exercised |
| MIG-008 | Browser evidence | No final craft evidence directory or route-to-screenshot mapping | `screenshots-app-2026-07-14-final-craft/README.md` plus 26 PNG captures | Medium | Yes for the fallback Playwright evidence set | Yes; evidence spec passed 1/1 |

## Remaining documented exceptions

- Eight non-canonical `<table>` implementations remain because they are public landing content, CSV preview, skeleton internals, chart reconciliation/report-specialised views, audit trail, or work-queue legacy consumers. They are named in the browser and defect registers rather than silently treated as migrated.
- Low-level controls remain in legacy/specialised components. The authenticated design guard records their exact per-file counts.
- The browser plugin could not initialize in this environment (`Cannot redefine property: process`), so Playwright was used as the browser-led fallback.
- The requested 768px pass and a manual walkthrough of every authenticated route remain unverified.
