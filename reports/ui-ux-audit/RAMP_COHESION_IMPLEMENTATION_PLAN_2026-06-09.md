# Ramp Cohesion Implementation Plan - 2026-06-09

## Goal

Make every page feel authored by one source-of-truth component library and one Ramp-quality product grammar.

This plan is intentionally consolidation-first. The app already has too many near-primitives. The next pass should delete bespoke wrappers, route everything through shared shells, and enforce the system with lint/tests.

## Design System Contract

### App Grammar

Every authenticated page must be composed from:

```tsx
<AppShell>
  <Sidebar />
  <TopBar />
  <main>
    <WorkbenchPage | DetailPageShell | SettingsPageShell>
      <PageTitleRow />
      <TabsOrToolbar />
      <DataSurface | DetailSurface | FormSurface />
    </...>
  </main>
</AppShell>
```

### Component Ownership

Allowed primitives:

- `Button`
- `ButtonLink`
- `IconButton`
- `Badge`
- `CountPill`
- `Input`
- `Select`
- `SegmentedControl`
- `Tabs`
- `Toolbar`
- `DataTable`
- `TableAction`
- `Section`
- `Panel`
- `Metric`
- `Gauge`
- `EmptyState`
- `Drawer`
- `Modal`
- `Tooltip`
- `Toast`
- `PageTitleRow`
- `WorkbenchPage`
- `DetailPageShell`
- `SettingsPageShell`
- `PublicFlowShell`

Deprecated in product pages:

- `components/common/PageHeader`
- page-local headers
- page-local raw tables
- page-local card/section wrappers
- `rounded-xl` / `rounded-2xl`
- hard-coded UI hex
- text arrows for controls
- direct deep imports from `@/components/ui/*`

## Phase 0 - Guardrails Before More UI Work

### 0.1 Add design lint checks

Create `scripts/design-system-audit.mjs`.

Checks:

- Fail on `components/common/PageHeader` imports in `app/(app)` and `components`.
- Fail on `rounded-xl|rounded-2xl` in `app/(app)` and authenticated components.
- Fail on raw `<table>` outside allowlist.
- Fail on UI hard-coded hex outside allowlist.
- Warn on `→|›|↑|↓` in controls.
- Warn on deep `@/components/ui/*` imports.
- Report per-route shell usage.

Add package scripts:

```json
"design:audit": "node scripts/design-system-audit.mjs",
"design:audit:strict": "node scripts/design-system-audit.mjs --strict"
```

Acceptance:

- Existing violations are captured in a baseline file.
- New violations fail CI.

### 0.2 Create a route migration matrix

Create `reports/ui-ux-audit/route-shell-migration-matrix.json`.

Fields:

- route
- route family
- current shell
- target shell
- raw table count
- hard-coded hex count
- text arrow count
- migration status

Acceptance:

- All 71 page routes are listed.
- Dynamic routes are grouped but still represented.

## Phase 1 - Source-of-Truth Primitives

### 1.1 Replace current page shells with a stricter set

Files:

- `components/workbench/WorkbenchPage.tsx`
- `components/workbench/DetailPageShell.tsx`
- `components/settings/SettingsPageShell.tsx` (new)
- `components/public/PublicFlowShell.tsx` (new)
- `components/ui/PageTitleRow.tsx` (new)

Spec:

- `PageTitleRow`
  - eyebrow/category
  - title
  - count
  - subtitle
  - right actions
  - tabs slot
- `WorkbenchPage`
  - no outer decorative card
  - full-width page plane
  - header band, toolbar band, content band
  - optional right rail only for operational context
- `DetailPageShell`
  - header, main column, right sticky rail
  - no page-local header variants
- `SettingsPageShell`
  - left settings subnav optional
  - dense form panels
  - consistent max width
- `PublicFlowShell`
  - login/signup/audit public flows using product tokens, not landing tokens

Acceptance:

- `/dashboard`, `/customers`, `/reports`, `/upload`, `/history`, `/chargebacks`, `/settings/account` all share the same title/action rhythm.
- No page body appears inside one giant card unless it is a contained tool.

### 1.2 Build missing primitives

Files:

- `components/ui/IconButton.tsx`
- `components/ui/CountPill.tsx`
- `components/ui/Tabs.tsx`
- `components/ui/Toolbar.tsx`
- `components/ui/TableAction.tsx`
- `components/ui/Panel.tsx`
- `components/ui/StatCell.tsx`
- `components/ui/Toast.tsx`

Acceptance:

- All table/filter/action rows use `Toolbar`.
- All page tabs use `Tabs`.
- All counts use `CountPill`.
- All icon-only buttons use `IconButton`.

### 1.3 Enforce the barrel

File:

- `components/ui/index.ts`

Rules:

- Export every public primitive from the barrel.
- Convert app imports to `@/components/ui`.
- Allow deep imports only inside `components/ui` itself.

Acceptance:

- Deep UI imports drop from 69 to an allowlisted minimum.

## Phase 2 - Shell And Navigation

### 2.1 Sidebar v2

Files:

- `components/nav/SidebarAside.tsx`
- `components/nav/SidebarNavItem.tsx`
- `components/nav/SidebarInner.tsx`
- `lib/navigation/appRoutes.ts`

Changes:

- Smaller logo mark.
- Remove footer legal clutter from primary rail.
- Compact groups with Ramp-like nested selected block.
- Count chips use `CountPill` with lime.
- Active item is one white/near-white lifted row, not multiple styles.
- Search affordance integrated with shell grammar.

Acceptance:

- Sidebar visually matches the density of the Ramp references.
- No nav count badge is hand-styled.
- Active state is identical across all route families.

### 2.2 Top bar v2

Files:

- `components/layout/AppHeader.tsx`
- `components/layout/CommandPalette*.tsx`

Changes:

- Keep it quiet and compact.
- Remove decorative dot in breadcrumb if not in Ramp reference.
- Standardize search button.
- Avatar/menu as `IconButton` or compact menu trigger.

Acceptance:

- Header does not compete with page title.
- Page title owns first-viewport hierarchy.

## Phase 3 - Data/Table Pages

### 3.1 Upgrade `DataTable` to the only product table

Files:

- `components/ui/DataTable.tsx`
- `components/ui/dataTableStyles.ts`

Add:

- column types
- row density
- row action slot
- sticky header option
- selection checkbox column
- sortable header icon
- empty row state
- inline status/select cell styles
- mobile stacked row variant

Acceptance:

- Table header and row rhythm match Ramp references.
- No raw product table remains outside allowlist.

### 3.2 Migrate table pages

Priority order:

1. `components/audit/AuditCustomersTableClient.tsx`
2. `app/(app)/audit/[runId]/AuditRunTransactionsPanel.tsx`
3. `components/audit/AuditHistoryTableClient.tsx`
4. `components/claims/ClaimReviewHistoryTable.tsx`
5. `components/customers/IdentityTimeline.tsx`
6. `components/settings/AuditTrailClient.tsx`
7. `app/(public)/audit/[runId]/report/page.tsx`

Acceptance:

- Raw table count drops from 14 to internal/public allowlist only.
- Customer, audit, claims, settings history tables share one row/action style.

### 3.3 Add table toolbars

Files:

- `components/workbench/WorkbenchActionBar.tsx`
- `components/ui/Toolbar.tsx`
- page-specific action bar components

Pages:

- `/customers`
- `/claims`
- `/reports`
- `/history`
- `/chargebacks`
- `/audit/[runId]`
- `/settings/audit-trail`

Acceptance:

- Every data page has search/filter/sort controls in the same toolbar position.
- Counts and segmented filters match Ramp.

## Phase 4 - Page Family Migration

### 4.1 Core workbench routes

Routes:

- `/dashboard`
- `/store`
- `/customers`
- `/claims`
- `/reports`
- `/upload`
- `/history`
- `/audit-history`
- `/audits`
- `/new-audit`
- `/chargebacks`
- `/evidence-packages`
- `/watchlist`

Target:

- `WorkbenchPage`
- `PageTitleRow`
- `Tabs`
- `Toolbar`
- `DataTable`

Specific changes:

- Dashboard: reduce card sprawl; make "Claims for review" or "Customers" the dominant operational table.
- Customers: keep table-first; remove card-like saved views if they feel like marketing tiles.
- Reports: gauges may stay only if they are in a Ramp-like reporting grid; otherwise flatten into a chart row.
- Upload: convert mapping into a dense tool with required fields pinned and optional fields grouped.
- Watchlist: remove `PageHeader`; use `WorkbenchPage` and `DataTable`.
- Store: remove `PageHeader`; use `WorkbenchPage`.

Acceptance:

- All routes share title/action/tabs/toolbar/body rhythm.

### 4.2 Detail routes

Routes:

- `/customers/[id]`
- `/customers/[id]/claims`
- `/customers/[id]/evidence/new`
- `/audit/[runId]/transaction/[id]`
- `/chargebacks/[id]`
- `/report/[runId]`

Target:

- `DetailPageShell`
- shared right rail
- shared section headers
- no custom page-local title wrapper

Specific changes:

- Customer profile: split hero into `DetailPageShell` header and `MetricStrip`.
- Chargeback detail: migrate from page-local `p-6 md:p-8`.
- Transaction detail: make it a drawer or detail shell, not a separate old panel grid.

Acceptance:

- All detail pages feel like the same detail mode.

### 4.3 Settings routes

Routes:

- `/settings`
- `/settings/account`
- `/settings/team`
- `/settings/billing`
- `/settings/data-privacy`
- `/settings/audit-trail`
- `/settings/api-integrations`
- `/settings/integrations/*`

Target:

- `SettingsPageShell`
- `FormPanel`
- `DataTable` for audit trail
- provider colors via tokenized icon slots only

Specific changes:

- Remove `PageHeader` from Shopify integration page.
- Retoken provider hard-coded colors.
- Convert narrow form cards into dense settings panels.

Acceptance:

- Settings pages feel like one subsystem.

### 4.4 Help, legal, auth, public

Routes:

- `/help/*`
- `/legal/*`
- `/login`
- `/signup`
- `/onboarding`
- `/reset`
- `/audit`
- `/audit-demo`
- `/demo`

Target:

- Help/legal use `PublicFlowShell` or `ContentPageShell`.
- Login/signup use product tokens, not old cream/serif styling.
- Demo/public audit use the same table and panel primitives where possible.

Acceptance:

- Auth/public no longer feel like a separate visual era.

## Phase 5 - Color And Token Cleanup

### 5.1 Token strictness

Files:

- `app/globals.css`
- `docs/internal/design/TOKENS.md`
- `components/ui/*`

Changes:

- Define final Ramp-like token roles:
  - `--surface-page`
  - `--surface-rail`
  - `--surface-panel`
  - `--surface-row`
  - `--line-subtle`
  - `--line-strong`
  - `--ink-strong`
  - `--ink-muted`
  - `--accent-lime`
- Keep compatibility aliases temporarily.

Acceptance:

- New components use semantic roles only.
- No product UI uses rust/copper except legacy aliases during migration.

### 5.2 Hard-coded color cleanup

Priority:

1. Auth/signup components.
2. Settings provider pages.
3. Dashboard/upload helper components.
4. Customer/detail pages.
5. Public demo/audit.

Acceptance:

- Hard-coded UI hex count drops from 210 to provider/logo allowlist.

## Phase 6 - Charts And Empty States

### 6.1 Chart consolidation

Files:

- `components/analytics/*`
- `components/charts/*`
- `components/internal/NetworkMetricsChartsClient.tsx`

Changes:

- One chart wrapper.
- One empty state.
- One tooltip.
- One axis/grid style.
- One gauge arc style.
- Avoid chart cards when charts can sit in the page/table plane.

Acceptance:

- Reports, global, dashboard, and audit charts share one visual language.

### 6.2 Empty/loading/error state consolidation

Files:

- `components/ui/EmptyState.tsx`
- `components/ui/LoadingState.tsx`
- `components/navigation/skeletons/*`
- all `loading.tsx` and `error.tsx`

Acceptance:

- Empty states are compact, actionable, and consistent.
- Loading states use the same skeleton density as final pages.

## Phase 7 - Visual Regression Harness

### 7.1 Fix screenshot harness

Current problem:

- `npm run ux:screenshots` deletes `.next` while an existing dev server may still be using it.

Fix:

- Do not `rm -rf .next` in the screenshot command.
- Add `ux:screenshots:fresh` for the destructive clean run.
- Add a preflight that detects an existing server and either reuses it or exits with instructions.

Scripts:

```json
"ux:screenshots": "playwright test --config=tests/ux-audit/playwright.config.ts",
"ux:screenshots:fresh": "rm -rf .next && playwright test --config=tests/ux-audit/playwright.config.ts"
```

Acceptance:

- Fresh screenshots can run without breaking a developer server.

### 7.2 Expand screenshot coverage

Add pages to UX audit:

- `/reports`
- `/claims`
- `/store`
- `/settings/account`
- `/settings/integrations`
- `/settings/audit-trail`
- `/global`
- `/chargebacks/[id]` when fixture exists
- `/customers/[id]` when fixture exists
- `/audit/[runId]/transaction/[id]` when fixture exists

Acceptance:

- At least one screenshot per page family.
- Dynamic route samples recorded in evidence JSON.

## Execution Order

### Pass A - Guardrails and shells

1. Add design audit script and baseline.
2. Add `PageTitleRow`, `Tabs`, `Toolbar`, `CountPill`, `IconButton`.
3. Refactor `WorkbenchPage` so it is not a giant card.
4. Create `SettingsPageShell` and `PublicFlowShell`.

### Pass B - Workbench routes

1. Migrate `/watchlist` and `/store` off `PageHeader`.
2. Migrate `/dashboard` off custom `MetricCard`/`ModuleCard` copies where possible.
3. Migrate `/reports` toolbar/tabs/gauges to the new system.
4. Migrate `/upload` mapping/context layout.

### Pass C - Tables

1. Upgrade `DataTable`.
2. Migrate audit/customer/history/settings raw tables.
3. Add mobile stacked rows.

### Pass D - Detail/settings/auth

1. Migrate customer and chargeback detail shells.
2. Migrate settings subpages.
3. Retoken login/signup/onboarding/reset.

### Pass E - Polish and visual QA

1. Fix screenshot harness.
2. Run `npm run build`.
3. Run `npm run design:audit`.
4. Run `npm run ux:screenshots`.
5. Review screenshots beside the Ramp references.

## File-Level Priority List

Highest impact:

- `components/workbench/WorkbenchPage.tsx`
- `components/layout/AppHeader.tsx`
- `components/nav/SidebarAside.tsx`
- `components/nav/SidebarNavItem.tsx`
- `components/ui/DataTable.tsx`
- `components/ui/index.ts`
- `app/globals.css`

Routes first:

- `app/(app)/dashboard/DashboardPageCockpit.tsx`
- `app/(app)/reports/ReportsPageView.tsx`
- `app/(app)/reports/ReportsOverviewTab.tsx`
- `app/(app)/reports/ReportsLiveTab.tsx`
- `app/(app)/customers/CustomersOverviewPageView.tsx`
- `app/(app)/claims/ClaimsPageView.tsx`
- `app/(app)/upload/page.tsx`
- `app/(app)/store/page.tsx`
- `app/(app)/watchlist/page.tsx`

Raw table cleanup:

- `components/audit/AuditCustomersTableClient.tsx`
- `components/audit/AuditHistoryTableClient.tsx`
- `app/(app)/audit/[runId]/AuditRunTransactionsPanel.tsx`
- `components/customers/IdentityTimeline.tsx`
- `components/settings/AuditTrailClient.tsx`
- `components/claims/ClaimReviewHistoryTable.tsx`

Detail cleanup:

- `app/(app)/customers/[id]/CustomerProfilePageHero.tsx`
- `app/(app)/customers/[id]/CustomerProfilePageMainColumn.tsx`
- `app/(app)/customers/[id]/CustomerProfilePageSidebar.tsx`
- `app/(app)/chargebacks/[id]/EvidenceDetailPageView.tsx`
- `app/(app)/audit/[runId]/transaction/[id]/page.tsx`

Auth/public cleanup:

- `app/(auth)/login/page.tsx`
- `components/signup/SignupFlow.tsx`
- `components/signup/SignupFlowSteps.tsx`
- `components/signup/SignupFlowAccountStep.tsx`
- `components/signup/SignupFlowUploadStep.tsx`
- `app/(public)/demo/page.tsx`
- `app/(public)/audit/[runId]/report/page.tsx`

## Definition Of Done

- `npm run build` passes.
- `npm run design:audit:strict` passes or has only explicit allowlisted exceptions.
- `npm run ux:screenshots` runs without breaking a running dev server.
- Authenticated screenshots show:
  - one shell language
  - one title/header rhythm
  - one tab style
  - one toolbar style
  - one table style
  - one chart style
  - no marketing card stack in app workflows
- Hard-coded UI hex count is reduced to provider/logo allowlist.
- Raw product tables are eliminated or migrated.
- Every route family is represented in visual evidence.

