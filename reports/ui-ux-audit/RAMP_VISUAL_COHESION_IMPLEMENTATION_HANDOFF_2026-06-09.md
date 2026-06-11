# Ramp Visual Cohesion Implementation Handoff - 2026-06-09

This is an implementation handoff for a follow-up coding model. It is intentionally concrete and repo-aware.

Important: this document is the only intended output of the current pass. Do not treat it as evidence that the visual implementation is done. The implementation model must still run the app, capture screenshots, inspect rendered pages, make frontend code changes, verify, and produce a final report.

## Mission

Make Unauth feel like one cohesive enterprise SaaS product with a restrained Ramp-inspired product grammar: clean white and off-white surfaces, black primary actions, sparing lime highlight, dense but readable information, crisp tables, subtle borders, low shadow, precise typography, and no decorative noise.

The goal is not to clone Ramp. The goal is to use Ramp as a quality bar for operational polish, hierarchy, spacing, tables, card treatment, and product cohesion.

## Non-Negotiables

- Do not change backend logic, auth logic, billing logic, database logic, API behavior, scoring, matching, identity graph logic, or persistence enum values.
- Do not rename backend values such as claim decisions unless a dedicated migration is explicitly requested.
- Do not remove important merchant-facing information.
- Do not introduce fake data flows.
- Do not add legally risky UI language. The UI may show evidence and context, but must not tell merchants what decision to make.
- Avoid UI copy such as `fraudster`, `scam`, `block`, `ban`, `deny`, `reject`, `approve`, `blacklist`, `guilty`, `bad customer`, `safe customer`, `trust this customer`, `do not refund`, or `refund this customer`.
- Prefer neutral copy: `Evidence`, `Signals`, `Context`, `Pattern`, `Profile`, `Claim history`, `Identity confidence`, `Linked records`, `Review context`, `Supporting data`, `Network signal`, `Store signal`, `Integration health`.
- Preserve existing user changes. The current worktree is dirty. Never reset, checkout, or revert unrelated files.
- Use the existing design-system direction first. Do not add a new UI framework just to restyle controls.
- Use icons from `lucide-react` for icon buttons and UI actions.
- Do not use viewport-scaled font sizes for app UI. Replace `fontSize: clamp(...)` in product surfaces with fixed token/class-based responsive steps.
- Letter spacing must be `0` in app UI. Remove negative `letterSpacing` from app/product components unless it is an isolated brand asset that is explicitly approved.
- Keep product cards at 8px radius or less unless the existing tokenized primitive maps card radius differently and the visual pass proves it is cohesive.
- Reserve shadows for true floating overlays such as modals, drawers, dropdowns, and command palette. Product panels should rely on borders and spacing.

## Current Repo Context

Framework and stack:

- Next.js app router.
- Tailwind CSS with CSS variable tokens in `app/globals.css` and mappings in `tailwind.config.ts`.
- Existing UI primitives under `components/ui`.
- Existing shell primitives under `components/workbench`.
- Existing app shell under `app/(app)/layout.tsx`, `components/nav`, and `components/layout/AppHeader.tsx`.
- Existing screenshot/audit scripts under `design-audit` and UX scripts in `package.json`.

Existing visual-system files to build on:

- `app/globals.css`
- `tailwind.config.ts`
- `components/ui/index.ts`
- `components/ui/pageShellStyles.ts`
- `components/ui/Button.tsx`
- `components/ui/buttonStyles.ts`
- `components/ui/Card.tsx`
- `components/ui/SectionCard.tsx`
- `components/ui/ModuleCard.tsx`
- `components/ui/MetricCard.tsx`
- `components/ui/DataTable.tsx`
- `components/ui/dataTableStyles.ts`
- `components/ui/Badge.tsx`
- `components/ui/GradeBadge.tsx`
- `components/ui/ConfidenceBadge.tsx`
- `components/ui/PageHeader.tsx`
- `components/ui/EmptyState.tsx`
- `components/ui/LoadingState.tsx`
- `components/ui/Modal.tsx`
- `components/ui/Drawer.tsx`
- `components/workbench/WorkbenchPage.tsx`
- `components/workbench/DetailPageShell.tsx`
- `components/workbench/WorkbenchActionBar.tsx`
- `components/workbench/WorkbenchKpiStrip.tsx`
- `components/navigation/skeletons`

Current code-scan starting points:

- 71 `page.tsx` routes exist under `app`.
- 56 `loading.tsx`, `error.tsx`, and `not-found.tsx` route-state files exist under `app`.
- 8 files currently use `<WorkbenchPage`.
- 1 file currently uses `<DetailPageShell`.
- 3 files use `PageHeader` / `<PageHeader`.
- 14 files still contain raw `<table` usage.
- 2 files contain `rounded-xl` or `rounded-2xl`.
- 17 files contain negative inline `letterSpacing`.
- 13 files contain viewport-scaled `fontSize: clamp(...)` or CSS `font-size: clamp(...)`.

These counts are a snapshot from the dirty local repo on 2026-06-09. Rerun the commands before editing.

## Route Inventory

The implementation model must inspect every route below. Dynamic routes require seeded data or representative fixture IDs.

### Authenticated Product Routes

| Route | File | Page Type | Must Inspect |
|---|---|---|---|
| `/dashboard` | `app/(app)/dashboard/page.tsx` | dashboard | default, loading, error, empty/partial setup, connected/disconnected integrations |
| `/store` | `app/(app)/store/page.tsx` | dashboard/detail hybrid | default, loading, error, partial setup |
| `/customers` | `app/(app)/customers/page.tsx` | list/table | default, loading, error, search, filters open, empty results |
| `/customers/[id]` | `app/(app)/customers/[id]/page.tsx` | detail | top, middle, linked records, right rail, loading, error |
| `/customers/[id]/claims` | `app/(app)/customers/[id]/claims/page.tsx` | detail/workflow | claim review state, timeline, evidence rail |
| `/customers/[id]/evidence/new` | `app/(app)/customers/[id]/evidence/new/page.tsx` | form/drawer flow | empty/default, validation, success/failure |
| `/claims` | `app/(app)/claims/page.tsx` | work queue/list | default, loading, error, filters, bulk/selection if present, empty |
| `/inbox` | `app/(app)/inbox/page.tsx` | alias/legacy queue | ensure it feels identical to claims or intentionally redirects |
| `/chargebacks` | `app/(app)/chargebacks/page.tsx` | evidence package list | default, loading, error, empty |
| `/chargebacks/[id]` | `app/(app)/chargebacks/[id]/page.tsx` | evidence detail | header, sections, rail, loading, error |
| `/reports` | `app/(app)/reports/page.tsx` | analytics | overview, live tab, CSV tab, filters, loading, error |
| `/upload` | `app/(app)/upload/page.tsx` | import workflow | idle, file selected, mapping, processing, invalid file, loading, error |
| `/history` | `app/(app)/history/page.tsx` | import history/list | default, loading, error, empty |
| `/audit-history` | `app/(app)/audit-history/page.tsx` | alias/history | must match `/history` grammar |
| `/audits` | `app/(app)/audits/page.tsx` | audit list | default, loading, empty |
| `/audits/new` | `app/(app)/audits/new/page.tsx` | import/create flow | default, validation |
| `/new-audit` | `app/(app)/new-audit/page.tsx` | alias/import | must match `/upload` grammar |
| `/audit/[runId]` | `app/(app)/audit/[runId]/page.tsx` | audit result detail | overview, tab states, loading, error |
| `/audit/[runId]/customers` | `app/(app)/audit/[runId]/customers/page.tsx` | audit customer list | table, filters, empty |
| `/audit/[runId]/transaction/[id]` | `app/(app)/audit/[runId]/transaction/[id]/page.tsx` | transaction detail | evidence/context, loading, error |
| `/report/[runId]` | `app/(app)/report/[runId]/page.tsx` | report detail | loading, printable/export treatment |
| `/evidence` | `app/(app)/evidence/page.tsx` | evidence surface | default, loading |
| `/evidence-packages` | `app/(app)/evidence-packages/page.tsx` | alias/evidence | must match `/chargebacks` or redirect intentionally |
| `/global` | `app/(app)/global/page.tsx` | network intelligence | default, loading, error, gated/locked |
| `/graph` | `app/(app)/graph/page.tsx` | graph/network | default, loading, gated/locked |
| `/clusters` | `app/(app)/clusters/page.tsx` | clusters/list | default, loading, empty |
| `/lookup` | `app/(app)/lookup/page.tsx` | lookup/search | default, error, empty |
| `/saved` | `app/(app)/saved/page.tsx` | saved/history | default, empty, error |
| `/watchlist` | `app/(app)/watchlist/page.tsx` | legacy list | default, drawer/interaction, loading, error |
| `/apply` | `app/(app)/apply/page.tsx` | application form | default, loading, validation, submitted |

### Settings And Integration Routes

| Route | File | Page Type | Must Inspect |
|---|---|---|---|
| `/settings` | `app/(app)/settings/page.tsx` | settings overview | default, error |
| `/settings/account` | `app/(app)/settings/account/page.tsx` | settings form | default, loading, error, validation |
| `/settings/team` | `app/(app)/settings/team/page.tsx` | settings/team | default, loading, error, invite state |
| `/settings/billing` | `app/(app)/settings/billing/page.tsx` | billing settings | default, loading, error, gated |
| `/settings/audit-trail` | `app/(app)/settings/audit-trail/page.tsx` | audit table | default, loading, error, empty |
| `/settings/data-privacy` | `app/(app)/settings/data-privacy/page.tsx` | settings/legal | default, loading, error |
| `/settings/api-integrations` | `app/(app)/settings/api-integrations/page.tsx` | API settings | default, loading, error, dialogs |
| `/settings/integrations` | `app/(app)/settings/integrations/page.tsx` | integration hub | default, loading, error, connected/disconnected |
| `/settings/integrations/shopify` | `app/(app)/settings/integrations/shopify/page.tsx` | integration detail | connected, disconnected, modal, error |
| `/settings/integrations/bigcommerce` | `app/(app)/settings/integrations/bigcommerce/page.tsx` | integration detail | default, connect form, error |
| `/settings/integrations/woocommerce` | `app/(app)/settings/integrations/woocommerce/page.tsx` | integration detail | default, connect form, error |
| `/settings/integrations/chrome` | `app/(app)/settings/integrations/chrome/page.tsx` | integration/setup | default, install/download |
| `/settings/integrations/zendesk` | `app/(app)/settings/integrations/zendesk/page.tsx` | helpdesk setup | connected, disconnected, webhook/API state |
| `/settings/integrations/gorgias` | `app/(app)/settings/integrations/gorgias/page.tsx` | helpdesk setup | connected, disconnected, webhook/API state |
| `/settings/integrations/freshdesk` | `app/(app)/settings/integrations/freshdesk/page.tsx` | helpdesk setup | connected, disconnected, webhook/API state |

### Help, Auth, Public, Internal, And Utility Routes

| Route | File | Page Type | Must Inspect |
|---|---|---|---|
| `/help` | `app/(app)/help/page.tsx` | help index | default, error |
| `/help/how-it-works` | `app/(app)/help/how-it-works/page.tsx` | help article | article density, nav cohesion |
| `/help/csv-export` | `app/(app)/help/csv-export/page.tsx` | help article | article density, CTA style |
| `/help/identity-matching` | `app/(app)/help/identity-matching/page.tsx` | help article | diagrams/tables |
| `/help/confidence-grades` | `app/(app)/help/confidence-grades/page.tsx` | help article | grade language, status chips |
| `/login` | `app/(auth)/login/page.tsx` | auth | login, signup toggle, validation |
| `/onboarding` | `app/(auth)/onboarding/page.tsx` | onboarding | empty, partial, upload/setup states |
| `/reset` | `app/(auth)/reset/page.tsx` | auth | default, validation |
| `/reset/update` | `app/(auth)/reset/update/page.tsx` | auth | default, validation |
| `/` | `app/page.tsx` and `app/(public)/landing/page.tsx` | root/landing | logged out, logged in redirect |
| `/signup` | `app/(public)/signup/page.tsx` | public signup | default, validation |
| `/demo` | `app/(public)/demo/page.tsx` | public demo | tables, CTA consistency |
| `/audit` | `app/(public)/audit/page.tsx` | public audit upload | idle, validation, submitted path |
| `/audit/submitted` | `app/(public)/audit/submitted/page.tsx` | public state | submitted/confirmation |
| `/audit/[runId]/submitted` | `app/(public)/audit/[runId]/submitted/page.tsx` | public state | gated submitted state |
| `/audit/[runId]/report` | `app/(public)/audit/[runId]/report/page.tsx` | public report | report, gate, table |
| `/audit-demo` | `app/(public)/audit-demo/page.tsx` | public demo | steps, responsive |
| `/legal/privacy` | `app/(public)/legal/privacy/page.tsx` | legal | typography, sections |
| `/legal/data-handling` | `app/(public)/legal/data-handling/page.tsx` | legal | typography, sections |
| `/legal/dpa` | `app/(public)/legal/dpa/page.tsx` | legal | typography, sections |
| `/legal/pilot-terms` | `app/(public)/legal/pilot-terms/page.tsx` | legal | typography, sections |
| `/audit-running` | `app/audit-running/page.tsx` | utility state | progress/status |
| `/mobile-unsupported` | `app/mobile-unsupported/page.tsx` | utility state | responsive/card radius |
| `not-found` | `app/not-found.tsx`, `app/(app)/not-found.tsx` | error | empty/error grammar |
| `/internal/eval` | `app/(internal)/eval/page.tsx` | internal | raw table acceptable only if intentionally internal |
| `/internal/network-metrics` | `app/(internal)/network-metrics/page.tsx` | internal analytics | charts/tables |

## Visual Audit Procedure

Do this before changing code.

1. Check worktree state:

```bash
git status --short
```

2. Install dependencies only if needed:

```bash
npm install
```

3. Start the app:

```bash
npm run dev
```

4. Seed visual/audit data if the environment is configured:

```bash
npm run design-audit:seed
```

5. Capture the existing screenshot set:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000 npm run design-audit:capture
```

6. If auth or env blocks the capture script, update only the audit script or local env needed for screenshots. Do not fake product UI.

7. Add missing route captures for every route in this document. Include desktop, laptop, tablet, and the relevant mobile/unsupported breakpoint:

```text
1440x980 desktop
1280x820 laptop
1024x768 tablet
390x844 mobile or mobile-unsupported state
```

8. Build a screenshot inventory at `reports/ui-ux-audit/ramp-cohesion-screenshot-inventory.json`.

Required inventory fields:

```json
{
  "route": "/claims",
  "page_name": "Claims",
  "page_type": "list",
  "state": "default",
  "viewport": "1440x980",
  "screenshot_path": "design-audit/screenshots/05_claims_list.png",
  "initial_visual_consistency_score": 6,
  "main_problems": ["example"],
  "components_used": ["WorkbenchPage", "DataTable"],
  "components_that_should_be_reused": ["Toolbar", "Tabs", "EmptyState"]
}
```

9. Score each page harshly:

- 10: indistinguishable from the rest of the product system.
- 8: cohesive, with only minor density/spacing issues.
- 6: functional but visibly different from comparable pages.
- 4: appears from a different template or era.
- 2: unfinished, broken, or visually incoherent.

10. Do not start implementation until the route inventory has screenshots and scores.

## Code Audit Commands

Rerun these before editing and paste results into the final report.

```bash
find app -type f -name 'page.tsx' | sort
find app -type f \( -name 'loading.tsx' -o -name 'error.tsx' -o -name 'not-found.tsx' \) | sort
find components -maxdepth 3 -type f \( -name '*.tsx' -o -name '*.ts' \) | sort
rg "components/common/PageHeader|components/ui/PageHeader|<PageHeader|<WorkbenchPage|<DetailPageShell|rounded-2xl|rounded-xl|letterSpacing: '-|clamp\(" app components lib -g '*.tsx' -g '*.ts'
rg "<table|<thead|<tbody|<tr|DataTable" app components -g '*.tsx'
rg "#[0-9A-Fa-f]{3,8}|rgba\(|color-mix\(" app components lib -g '*.tsx' -g '*.ts' -g '*.css'
rg "fraudster|scam|blacklist|\bblock\b|\bban\b|\bdeny\b|\breject\b|\bapprove\b|guilty|bad customer|safe customer|trust this customer|do not refund|refund this customer" app components lib -g '*.tsx' -g '*.ts'
```

Interpretation notes:

- Raw table usage is acceptable inside `components/ui/DataTable.tsx` and skeleton primitives. Product tables should migrate to `DataTable` or a shared table primitive.
- Hard-coded integration brand colors may remain only when they represent actual third-party logos/icons, not generic UI chrome.
- Backend enum names and engine comments may contain restricted terms. Do not rename them unless product logic migration is requested. Remove or neutralize UI-facing strings.
- `color-mix()` can remain when token-driven and consistent, but scattered fallback hex values should be eliminated from product UI.

## Target Product Grammar

### Layout

- Authenticated pages use one app shell: sidebar, sticky top header, one scrollable main plane.
- Main page content uses `PAGE_SHELL_INNER_CLASS` or its successor with one max width, one gutter model, and one section gap model.
- List/workbench pages use `WorkbenchPage`.
- Detail pages use `DetailPageShell`.
- Settings pages should get a shared `SettingsPageShell` if they are currently page-local.
- Public/auth flows should get a shared `PublicFlowShell` if login, signup, reset, public audit, and audit-running still feel disconnected.
- Comparable pages must share header height, title placement, subtitle placement, action placement, toolbar placement, and table/card spacing.

### Typography

- Font family: use the existing Inter/Inter Tight token setup in `app/layout.tsx`.
- Do not scale app font sizes with viewport width.
- Use static title sizes via classes/tokens.
- Letter spacing must be `0` in app UI.
- Labels should be 11-12px, medium weight, consistent casing.
- Body text should stay concise. Replace paragraphs with structured rows, metadata, or panels where useful.
- Page titles should not be marketing hero sized inside the app.

### Color

- Use `app/globals.css` tokens, not hard-coded hex.
- White and near-white surfaces dominate.
- Black/near-black is the workhorse primary action.
- Lime is a sparing accent for strong CTAs, count chips, selected highlights, and selected charts/gauges only.
- Risk/status colors are semantic and muted.
- Do not use rust/brown/orange as general UI decoration.

### Radius, Borders, Shadows

- Product card/panel radius: 8px target.
- Button/input radius: 6-8px target.
- Badge radius: small or pill depending on primitive.
- Borders: `1px solid var(--border-default)` for outer containers, `var(--border-subtle)` for inner separators.
- Product cards are flat or near-flat. Avoid heavy shadows.
- Overlays use `--shadow-modal`, `--shadow-drawer`, or a shared dropdown shadow.

### Tables

- Tables are a primary product surface. They should look premium and dense, not default HTML.
- Use shared `DataTable` or a shared table suite for all product list/table views.
- Header height: 40-42px.
- Default row height: 52px. Compact row height: 40px only for dense secondary tables.
- Headers: 11px, medium, muted, no letter spacing.
- Cells: 13px, primary text plus muted metadata.
- Row dividers use `var(--border-subtle)`.
- Empty tables use shared `EmptyState` in compact/table mode.
- Loading tables use shared skeleton rows.
- Table toolbars use a shared `Toolbar` with search, filters, tabs, and right actions.

### States

- Loading states should use the same skeleton grammar as the final page layout.
- Error states should use shared `ErrorBoundaryUI` or a new shared route error primitive.
- Empty states should be evidence/context oriented, concise, and visually consistent.
- Locked/gated states should use shared locked/upgrade components and neutral copy.
- Modal and drawer footers should use the same action alignment and button variants.

## Implementation Phases

### Phase 0 - Baseline And Guardrails

Deliverables:

- Screenshot inventory JSON with route, state, viewport, path, score, issues, components used, components to reuse.
- Route migration matrix at `reports/ui-ux-audit/ramp-cohesion-route-migration-matrix.json`.
- Baseline code-audit counts from the commands above.

Recommended migration matrix fields:

```json
{
  "route": "/customers",
  "family": "workbench-list",
  "current_shell": "WorkbenchPage",
  "target_shell": "WorkbenchPage",
  "raw_table_files": [],
  "hardcoded_color_files": [],
  "typography_violations": [],
  "state_files": ["loading.tsx", "error.tsx"],
  "priority": "P0",
  "status": "pending"
}
```

Acceptance:

- Every route in this document has a row.
- Every key route has at least one screenshot.
- The final implementation plan is based on rendered screenshots, not only source inspection.

### Phase 1 - Token And Primitive Cleanup

Files to prioritize:

- `app/globals.css`
- `tailwind.config.ts`
- `components/ui/pageShellStyles.ts`
- `components/ui/Card.tsx`
- `components/ui/SectionCard.tsx`
- `components/ui/MetricCard.tsx`
- `components/ui/Button.tsx`
- `components/ui/buttonStyles.ts`
- `components/ui/DataTable.tsx`
- `components/ui/dataTableStyles.ts`
- `components/ui/Badge.tsx`
- `components/ui/GradeBadge.tsx`
- `components/ui/ConfidenceBadge.tsx`
- `components/ui/EmptyState.tsx`
- `components/ui/LoadingState.tsx`
- `components/ui/Modal.tsx`
- `components/ui/Drawer.tsx`
- `components/ui/index.ts`

Required changes:

- Keep the current token names, but make the last-declared app token layer canonical and remove or clearly isolate contradictory legacy blocks where safe.
- Export all public UI primitives from `components/ui/index.ts`.
- Prefer imports from `@/components/ui` instead of deep UI paths outside `components/ui`.
- Add missing primitives only when repeated patterns prove they need them:
  - `IconButton`
  - `CountPill`
  - `Tabs`
  - `Toolbar`
  - `Panel`
  - `ChartCard`
  - `FormSection`
  - `FormRow`
  - `TableEmptyState`
  - `LockedState`
  - `SettingsPageShell`
  - `PublicFlowShell`
- Remove viewport-scaled font sizes and negative letter spacing from app primitives.
- Ensure `Card`, `SectionCard`, `MetricCard`, `DataTable`, `Modal`, and `Drawer` share the same border/radius/shadow rules.
- Ensure `ErrorBoundaryUI` uses shared buttons/links instead of hand-styled link buttons.

Acceptance:

- Product pages can be built mostly from `WorkbenchPage`, `DetailPageShell`, `SettingsPageShell`, and `components/ui`.
- There is one table grammar, one panel grammar, one modal grammar, and one empty/loading/error grammar.

### Phase 2 - Shell, Header, Sidebar, Navigation

Files to prioritize:

- `app/(app)/layout.tsx`
- `components/layout/AppHeader.tsx`
- `components/nav/SidebarAside.tsx`
- `components/nav/SidebarInner.tsx`
- `components/nav/SidebarNavItem.tsx`
- `lib/navigation/appRoutes.ts`
- `components/workbench/WorkbenchPage.tsx`
- `components/workbench/DetailPageShell.tsx`
- `components/workbench/WorkbenchActionBar.tsx`
- `components/workbench/WorkbenchKpiStrip.tsx`

Required changes:

- Make sidebar active/hover/focus states consistent and restrained.
- Use shared count/status pills in nav instead of local badge styles.
- Align header breadcrumbs, merchant chip, command palette trigger, and avatar to the same density.
- Remove text glyph separators such as `>` or `›` from app UI controls; use lucide icons or real separators from shared primitives.
- Standardize page title/action/subtitle rhythm across `WorkbenchPage`, `DetailPageShell`, and `PageHeader` or replace `PageHeader` with one title-row primitive.
- Remove viewport `clamp()` title sizes and negative letter spacing from shell components.
- Keep mobile handling intentional. If product app is unsupported on narrow mobile, the unsupported state must look like the same product.

Acceptance:

- Moving through Dashboard -> Claims -> Claim detail -> Customer detail feels like one app.
- Settings and integration pages no longer feel like a separate admin template.
- App shell density is stable at 1440, 1280, and 1024 widths.

### Phase 3 - Tables, Toolbars, Filters, Tabs

Known files with raw table usage to inspect/migrate:

- `components/claims/ClaimReviewHistoryTable.tsx`
- `components/watchlist/WatchlistTableClient.tsx`
- `app/(app)/audit/[runId]/AuditRunTransactionsPanel.tsx`
- `app/(app)/audit/[runId]/AuditRunOverviewPanel.tsx`
- `components/audit/AuditCustomersTableClient.tsx`
- `components/audit/AuditHistoryTableClient.tsx`
- `components/settings/AuditTrailClient.tsx`
- `components/customers/IdentityTimeline.tsx`
- `app/(public)/audit/[runId]/report/page.tsx`
- `app/(public)/demo/page.tsx`
- `app/(internal)/eval/page.tsx`
- `components/navigation/skeletons/primitives.tsx`
- `app/(public)/landing/_components/sections/LandingProductTierSection.tsx`
- `components/ui/DataTable.tsx`

Required changes:

- Migrate product raw tables to `DataTable` or a shared table primitive.
- If a table is too custom for generic `DataTable`, create a shared lower-level `TableShell`, `TableHeaderCell`, `TableRow`, and `TableEmptyState`.
- Standardize toolbars for `/customers`, `/claims`, `/reports`, `/history`, `/chargebacks`, `/watchlist`, audit results, and settings audit trail.
- Standardize tabs for reports, audit result pages, claims/status filters, settings sections, and integration detail views.
- Ensure table empty and loading states are visually tied to the table container.

Acceptance:

- A user can jump between Customers, Claims, History, Evidence packages, Watchlist, and Audit trail without seeing table style drift.

### Phase 4 - Page Family Migration

Migrate by route family, not random files.

#### Workbench Lists And Dashboards

Routes:

- `/dashboard`
- `/store`
- `/customers`
- `/claims`
- `/reports`
- `/history`
- `/audit-history`
- `/audits`
- `/chargebacks`
- `/upload`
- `/new-audit`
- `/watchlist`
- `/global`
- `/graph`
- `/clusters`
- `/lookup`
- `/saved`

Required:

- Shared shell rhythm.
- Shared KPI strip or metric grid.
- Shared toolbar and table shells.
- Shared empty/loading/error.
- No local oversized headings.
- No page-local card styles when shared card/panel works.

#### Detail Pages

Routes:

- `/customers/[id]`
- `/customers/[id]/claims`
- `/customers/[id]/evidence/new`
- `/chargebacks/[id]`
- `/audit/[runId]`
- `/audit/[runId]/customers`
- `/audit/[runId]/transaction/[id]`
- `/report/[runId]`

Required:

- Use `DetailPageShell` or a compatible shared detail shell.
- Header has back link, title, subtitle/meta, status, actions in one grammar.
- Right rail uses one width and sticky behavior.
- Detail sections use `SectionCard`/`Panel`.
- Evidence/status language remains neutral.

#### Settings And Integrations

Routes:

- `/settings`
- `/settings/account`
- `/settings/team`
- `/settings/billing`
- `/settings/audit-trail`
- `/settings/data-privacy`
- `/settings/api-integrations`
- `/settings/integrations`
- all `/settings/integrations/*` detail routes

Required:

- Create or strengthen `SettingsPageShell`.
- Create or strengthen `IntegrationCard`, `IntegrationHealthSummary`, `SettingsSection`, `FormRow`, and shared connection-state components.
- All integration cards use identical padding, icon size, status pill, action placement, and border/radius.
- Connected/disconnected/error/loading states use one grammar.

#### Auth And Public Product Flows

Routes:

- `/login`
- `/onboarding`
- `/reset`
- `/reset/update`
- `/signup`
- `/audit`
- `/audit/submitted`
- `/audit/[runId]/submitted`
- `/audit/[runId]/report`
- `/audit-running`
- `/mobile-unsupported`

Required:

- Use product tokens where these flows are product-like.
- Avoid landing-page marketing flourishes inside operational flows.
- Remove hard-coded cream/rust UI hex unless isolated to marketing landing.
- Replace viewport-scaled headings and negative letter spacing.
- Form labels, input heights, validation messages, and primary actions match app primitives.

#### Landing And Legal

Routes:

- `/`
- `/landing`
- `/demo`
- `/audit-demo`
- `/legal/*`

Required:

- Do not over-prioritize landing if the core product is inconsistent.
- Landing can be more editorial, but public audit/demo/legal pages still need shared typography and form/control consistency.
- Legal pages should not use `rounded-xl` cards if product grammar is tighter.

### Phase 5 - Loading, Error, Empty, Locked, Modal, Drawer

Files to prioritize:

- all route `loading.tsx` files
- all route `error.tsx` files
- `components/navigation/skeletons/pageSkeletons.tsx`
- `components/navigation/skeletons/WorkbenchPageSkeleton.tsx`
- `components/navigation/skeletons/primitives.tsx`
- `components/product/LockedFeaturePreview.tsx`
- `components/product/UpgradeCard.tsx`
- `components/connections/PageConnectionGate.tsx`
- `components/ui/Modal.tsx`
- `components/ui/Drawer.tsx`
- settings key dialogs and API dialogs
- claim review drawer/toast/modal surfaces

Required:

- Loading states mirror the final layout geometry.
- Error states use one recovery layout and shared actions.
- Empty states use compact table empty state inside table shells and full-page empty state only when the whole page is empty.
- Locked/gated states explain unavailable capability without salesy language.
- Modals and drawers share overlay color, width scale, padding, title hierarchy, close button, and footer actions.
- Toasts use one shared component.

Acceptance:

- Loading or error on any route feels like the same app, not a fallback page.

### Phase 6 - Copy And Compliance Sweep

Required:

- Audit rendered UI text, not just source strings.
- Keep backend/internal enum terms intact where changing them would affect behavior.
- Replace UI labels and helper copy that instructs merchant decisions with neutral intelligence language.
- Claims UI should say things like `Review context`, `Evidence summary`, `Next review step`, `Merchant response recorded`, `Supporting signals`.
- Evidence package UI should say `Evidence readiness`, `Supporting records`, `Identity signals`, `Timeline`, not `win`, `deny`, or `approve`.

Acceptance:

- No visible UI text tells a merchant to accept, reject, deny, block, ban, blacklist, approve, or refund a customer.
- Decision-state labels are neutral where product logic permits.

### Phase 7 - Responsive And Journey QA

Inspect these journeys visually:

- Dashboard -> Claims
- Claims -> Claim detail
- Claims -> Customer profile
- Customers -> Customer detail
- Dashboard -> Analytics/Reports
- Reports -> CSV/live tab states
- Settings -> Integrations
- Integrations hub -> Shopify/Helpdesk detail
- Integration connected -> disconnected/error state
- Upload/import -> mapping -> processing -> history/results
- Audit history -> Audit run detail -> transaction detail
- Evidence packages -> Evidence package detail
- Gated/locked state -> next available setup action
- Login -> onboarding -> dashboard
- Public audit -> submitted/report gate

Required breakpoints:

- 1440x980
- 1280x820
- 1024x768
- 390x844 or mobile-unsupported

Acceptance:

- No incoherent overlaps.
- Text fits inside buttons, badges, cards, table cells, and rails.
- Header/sidebar/toolbar do not squeeze primary content into unreadable states.
- Comparable pages share the same structure.

## Specific Starting Fix List

These are the first files to inspect after screenshots because the code scan already shows likely drift.

1. `components/ui/PageHeader.tsx`, `components/workbench/WorkbenchPage.tsx`, `components/workbench/DetailPageShell.tsx`, `components/workbench/WorkbenchKpiStrip.tsx`, `components/ui/MetricCard.tsx`
   - Remove viewport `clamp()` font sizing in app UI.
   - Remove negative `letterSpacing`.
   - Ensure one title/action/subtitle grammar.

2. `app/(app)/store/page.tsx`, `app/(app)/watchlist/page.tsx`, `app/(app)/settings/integrations/shopify/page.tsx`
   - Current `<PageHeader>` usage should be compared with `WorkbenchPage` and migrated or standardized.

3. Raw product tables:
   - `components/claims/ClaimReviewHistoryTable.tsx`
   - `components/watchlist/WatchlistTableClient.tsx`
   - `components/audit/AuditCustomersTableClient.tsx`
   - `components/audit/AuditHistoryTableClient.tsx`
   - `components/settings/AuditTrailClient.tsx`
   - `app/(app)/audit/[runId]/AuditRunTransactionsPanel.tsx`
   - `app/(app)/audit/[runId]/AuditRunOverviewPanel.tsx`
   - `components/customers/IdentityTimeline.tsx`

4. Settings/integration color drift:
   - `components/shopify/*`
   - `components/settings/*SupportSync*`
   - `components/settings/*Webhook*`
   - `components/settings/*ConnectClient.tsx`
   - `components/settings/ApiKey*Dialog.tsx`
   - Replace generic hard-coded fallback hex and local buttons with shared primitives.

5. Public/auth hard-coded styling:
   - `app/(auth)/login/page.tsx`
   - `components/signup/*`
   - `components/apply/FoundingMerchantApplicationForm.tsx`
   - `app/audit-running/page.tsx`
   - `app/mobile-unsupported/MobileUnsupportedClient.tsx`
   - Replace hard-coded cream/rust styling with product/public-flow tokens and shared controls.

6. Skeleton drift:
   - `components/navigation/skeletons/pageSkeletons.tsx`
   - Convert page-specific skeletons to use `WorkbenchPageSkeleton`, `TableSkeleton`, and shared panel skeletons with the same dimensions as final pages.

7. Decorative leftovers:
   - `components/ui/meteors.tsx`
   - `components/ui/border-beam.tsx`
   - `components/ui/spotlight.tsx`
   - `components/ui/animated-grid-pattern.tsx`
   - These should not appear in authenticated product UI. Keep only if isolated to public marketing and visually justified.

## Verification Commands

Run the strongest available set that the repo can support. At minimum:

```bash
npm run lint
npx tsc --noEmit
npm test -- --runInBand
npm run build
```

For visual and interaction verification:

```bash
npm run design-audit:smoke
NEXT_PUBLIC_APP_URL=http://localhost:3000 npm run design-audit:capture
npm run ux:audit
npm run test:critical
```

If a command cannot run because of missing environment variables or services, document the exact blocker and run the nearest useful subset. Do not report unrun checks as passing.

## Final Report Required From Implementation Model

The final implementation response must include:

1. Routes inspected.
2. Screenshot inventory path and final screenshot paths.
3. Major inconsistencies found.
4. Components standardized.
5. Shared components created or improved.
6. Pages updated.
7. Visual system rules enforced.
8. Remaining issues and why they remain.
9. Commands run.
10. Test/build/typecheck results.
11. Final recommendation on whether the app now feels cohesive.

Also include:

- Before: what felt disconnected.
- After: what now feels cohesive.

## Done Criteria

The pass is not complete until all of these are true:

- Every route family has been visually inspected in browser screenshots.
- Core product journeys feel connected page to page.
- Repeated visual patterns are routed through shared primitives.
- Product tables share one grammar.
- Product headers share one grammar.
- Settings and integrations no longer feel separate from the workbench.
- Loading, error, empty, and gated states share the same visual language.
- App UI has no viewport-scaled font sizes or negative letter spacing.
- Product UI avoids hard-coded generic colors where tokens exist.
- UI copy remains neutral and evidence/context based.
- Build/typecheck/lint/tests have been run or blockers are clearly documented.
