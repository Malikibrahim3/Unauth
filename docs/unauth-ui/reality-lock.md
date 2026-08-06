# Unauth UI reality lock

Date: 2026-08-04  
Binding plan: `docs/unauth/implementation/visual-first-product-ui-plan.md` v2.1  
Phase: P00 only  
Observed revision: `c9aecf461471f5d9e7abefe12e1089374cbb0a02` plus a protected pre-existing dirty worktree

This document records current executable frontend truth. Earlier P00/P01 statuses, certificates and governance artifacts were not used as phase-completion evidence. Factual repository and screenshot inventories were reused where they still matched the executable application.

## Stack and commands

| Concern | Current repository truth |
|---|---|
| Framework | Next.js 16.2.7 App Router, React 19.2.7, TypeScript 5.9 |
| Package manager | npm 10 with root `package-lock.json` |
| UI | CSS/Tailwind PostCSS, repository components, Lucide icons, Recharts 3.10.1 |
| Data runtime | Supabase clients and generated database types; server-rendered route loaders |
| Unit/component tests | Jest 29 and Testing Library |
| Browser/visual tests | Playwright 1.59.1 plus repository capture scripts |
| Development | `npm run dev` or `npm run dev:turbo` |
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| Build/serve | `npm run build`; `npm run start` |
| Focused/full test | `npm test -- --runInBand <paths>`; `npm test -- --runInBand` |
| Browser suites | `npm run test:critical`, `npm run test:redesign`, `npm run test:e2e` |
| Design checks | `npm run verify:design-contract`, `npm run verify:decision-ledger` |

The Chrome extension is a separate npm/Vite package under `extensions/chrome`; the checkout extension has its own package under `extensions/unauth-checkout`. Neither is part of the P00 authenticated-web proof.

## Reachable route inventory

The successful production build collected 100 page modules and 220 API route handlers. The authenticated tree contains 86 route-level loading/error boundary files. Route-page source paths, sorted as a set, hash to `37edb53f9cf6aba9986e89b76b06a89e9f70e4c1f2a9a3e7195cbbb385912748`.

| Family | Canonical routes and reachable detail routes |
|---|---|
| Entry/public | `/`, `/landing`, `/demo`, `/pricing`, `/signup`, `/login`, `/reset`, `/reset/update`, `/onboarding`, `/callback`, `/legal/*` |
| Orientation/work | `/overview`, `/work`, `/search`, `/notifications` |
| Cases | `/cases`, `/cases/[caseId]`, plus compatibility `/claims` and `/claims/[id]` |
| Financials | `/financials/losses`, `/financials/losses/[lossId]`, `/financials/recovery`, `/financials/recovery/[recoveryId]`, `/financials/reconciliation`, `/financials/reports`, `/financials/reports/[reportId]` |
| Controls | `/controls/rules`, `/controls/rules/[ruleId]`, `/controls/flows`, `/controls/flows/[flowId]`, `/controls/flows/runs`, `/controls/flows/runs/[runId]` |
| Sources/imports | `/sources/connected`, `/sources/browse`, `/sources/[sourceId]`, `/sources/setup/[providerId]`, `/sources/imports`, `/sources/imports/[jobId]` |
| Customers/objects | `/customers`, `/customers/[id]`, `/customers/[id]/claims`, `/customers/[id]/evidence/new`, plus order, ticket, shipment, refund, return and dispute detail routes |
| Supporting | `/help`, `/help/[articleSlug]`, workspace/product/developer/governance/legal settings routes, and provider-specific source/settings routes |
| Internal compatibility | `/dashboard`, `/losses`, `/recoveries`, `/reports`, `/rules`, `/flows`, `/integrations`, `/exceptions`, and legacy detail wrappers remain executable while canonical navigation points to the routes above |
| Development-only | `/dev/design-system`, `/integrations/dev-preview`, `/landing/prototypes/unauth-case-detail` |

Navigation truth lives in `lib/navigation/appRoutes.ts` and `lib/navigation/aliases.ts`. There are 10 explicit canonical aliases. `next.config.js` adds 31 compatibility redirects, including old inbox, audit/report, upload/import, integration and customer-context URLs. `proxy.ts` and per-route permission checks remain part of reachability.

## Shared UI inventory

| Area | Current implementation | P00 disposition |
|---|---|---|
| Shell/navigation | `app/(app)/layout.tsx`, `components/nav/*`, `components/layout/AppHeader.tsx`, command palette, account/workspace controls, data-health drawer | Keep behaviour and route/permission semantics; P01 may replace composition and styling |
| Foundations | `app/globals.css`, `styles/authenticated/*`, 55 components in `components/ui` | Reuse valid tokens/primitives; reconcile with v2.1 visual tokens in P01/P02 |
| Tables | `DataTable`, `DataTableServer`, registry surfaces, Work queue, exception queue and route-local tables | Keep proven behaviour; consolidate to one canonical operating table in P02/P03 |
| Charts | 22 React chart modules including `components/charts/authenticated/*`, `ChartFrame`, chart-data disclosure and route/canonical compositions | Keep accessibility/data-disclosure strengths; replace open-ended/legacy grammar with V01–V08 only in owning phases |
| Financial presentation | `FinancialEquation`, `MetricValueCell`, canonical overview/report components and route-specific display helpers | Keep typed minor-unit and known/unavailable semantics; consolidate formatters and qualifiers later |
| Forms | Shared inputs/selects/form fields plus case decision, rule/workflow, source/import, recovery and settings forms | Preserve validation and mutation behaviour; restyle/compose only in owning phases |
| Overlays | `Drawer`, `Modal`, `Toast`, tooltip, overlay portal, command palette, row actions, data-health and resolution drawers | Keep focus/portal behaviour; use only when a real route needs each overlay |
| States | Route `loading.tsx`/`error.tsx`, `OperationalState`, `LoadingState`, skeletons, empty state and retained client fetch/error treatments | Keep truthful state distinction; unify the visual pattern as real consumers move through P01–P06 |

## Financial and authority-sensitive data inventory

| Surface | Authoritative frontend/server contract |
|---|---|
| Overview/reports | `lib/reporting/intelligence.ts`: `IntelligenceReport`, `MoneyBridge`, `ReportTrendPoint`, `FinancialConfidence`, `FinancialReportMetric`; server loader `loadIntelligenceReport` |
| Losses | `lib/losses/types.ts`, `lib/losses/financialDisplay.ts`, `lib/finance/financialLedger.ts`; nullable display helpers preserve unavailable versus exact zero |
| Recovery | `lib/recoveries/types.ts`, `lib/recoveries/amounts.ts`, `lib/recoveries/calculation.ts`, `lib/recoveries/store.ts`, payout recovery contracts |
| Reconciliation | `lib/reconciliation/types.ts`, case store, detectors, recommendations, outcomes and provider-credit contracts; facts distinguish source fact, human finding and inference |
| Case recommendation/decision | `lib/claims/decision/types.ts`, claim-gate recommendation contracts and the existing decision/recovery-handoff API routes |
| Permissions/authority | Named permissions, roles, caller context and delegated grants in `lib/permissions/index.ts`; request enforcement in `lib/auth/requestContext.ts` |
| Database/client boundary | Generated Supabase types in `lib/supabase/types.ts`, table registry and scoped request/service clients |

Confirmed distinctions already represented in executable types or presentation logic include requested, exposed, approved, paid, estimated loss, confirmed loss, recoverable, recovered, outstanding, written off and final net loss. Current code uses integer minor units and known-state/null boundaries. The v2.1 rebuild must not reinterpret those fields by label similarity or move calculations into charts.

## Baseline visual proof

Existing 2026-08-03 screenshots are reused as factual baselines, not as v2.1 phase certificates. Canonical wrappers preserve the same underlying surfaces where the earlier capture used a legacy URL.

| Required surface | Baseline proof |
|---|---|
| Overview | `artifacts/claude-design-review-2026-08-03/screenshots/01-overview-dashboard-full.png` |
| Work | `artifacts/claude-design-review-2026-08-03/screenshots/02-work-queue-full.png` |
| Case detail | `artifacts/claude-design-review-2026-08-03/screenshots/14-case-detail-maya-chen-full.png` |
| Losses | `artifacts/claude-design-review-2026-08-03/screenshots/15-losses-ledger-full.png` |
| Recovery | `artifacts/claude-design-review-2026-08-03/screenshots/16-recovery-board-full.png` |
| Reconciliation | `artifacts/unauth-ui/p00/baseline/reconciliation-1440x900.png` (new gap-closing capture from the current production build) |
| Rules impact precursor | `artifacts/claude-design-review-2026-08-03/screenshots/62-rule-detail-delivered-proof.png` (real rule detail and simulation workbench; not a claim that v2.1 V08 exists) |

The new Reconciliation proof used the existing local-only authenticated test path and production adapter, reached a settled populated queue at 1440×900, and moved keyboard focus to a real link. No DemoAdapter was needed.

## Reusable strengths

- Server-side route loading and explicit permission redirects already prevent unauthorised shell content from becoming the data boundary.
- Financial report contracts use integer minor units, known-state qualifiers and nullable display values.
- Recommendation, merchant decision, recovery handoff and ledger concepts exist as separate contracts and mutations.
- Chart frames already expose a keyboard-reachable data-table disclosure and route-provided deep links.
- Shared focus-aware overlays, route loading/error boundaries, URL-backed filters and command navigation are established.
- Existing deterministic capture infrastructure, local-only E2E authentication and seeded test merchant make later visual verification reproducible.

## Visible design failures to address after P00

- Analytical pages still mix KPI slabs, framed panels and route-specific chart compositions instead of the closed V01–V08 grammar and visual-first first viewport.
- Reconciliation is an exception registry with summary cards; it does not yet provide the v2.1 source-to-ledger bridge, ageing, comparison workspace and resolution rail.
- Rules has a real simulation seam, but the required V08 live/draft and reconciled-exposure impact composition does not yet exist.
- Legacy and canonical routes/components coexist, and table, money-display and chart patterns are duplicated across old and new surface families.
- Several headers exceed the v2.1 context-copy budget, and explanatory copy competes with the primary analytical or operating object.
- Nested surfaces, broad status-pill use and uneven density still produce generic-dashboard moments.
- Some asynchronous supporting surfaces in the reused baseline remain slow or persist in loading; these are real adverse-state evidence, not P00 blockers.

## Keep, consolidate, replace

Keep the executable API meanings, generated types, loaders, RBAC, mutations, audit receipts, URL/deep-link behaviour and truthful unavailable states. Keep shared controls where their behaviour is already correct.

Consolidate table, financial-value, qualifier, state and overlay presentation only when the owning v2.1 route consumes the shared result. Replace the analytical compositions and chart grammar in P01–P06. Do not remove compatibility redirects or legacy route wrappers until later phases prove equivalent canonical reachability.

## Frontend-safe boundary and frozen non-goals

P01–P07 may change React components, route composition, CSS/tokens, browser formatting, accessible chart/table presentation, frontend-only view models and a typed development adapter when a real API is unavailable.

They may not rewrite backend/domain logic, change any financial formula or field meaning, alter permissions or merchant authority, change audit behaviour, migrate the database, mutate persisted production data, deploy/publish, or perform unrelated cleanup. Exact zero remains distinct from unavailable; approved and pending receipt remain distinct from recovered; recommendation remains distinct from merchant decision.

## Verification baseline

- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS; 94 static pages generated and all dynamic routes collected.
- Focused Jest gate for app routes, report payout contract, chart contract and claim decision: PASS, 4 suites / 43 tests / 1 snapshot.
- Current production-built `/financials/reconciliation`: PASS, authenticated render with production types, populated settled queue and keyboard focus.
- Historical factual full-suite observation from 2026-08-03 recorded 375 passing suites and four pre-existing failing suites (claim-review expectations, polish-runner status, Docker-dependent customer aggregates and legacy redirect expectations). The full suite was not duplicated in P00 because v2.1 reserves the integrated full regression for P07; current targeted and build gates introduced no failure.

P01 can start from this lock without requesting product, API, fixture, owner or design decisions.
