# Signed-In Light Workbench Redesign

Audience: follow-on implementation model.  
Scope: authenticated app only, under `app/(app)`. Do not redesign landing, public audit, signup, login, reset, onboarding, or legal pages.

## Objective

Redesign the signed-in product around the light version of the Claude §4 merchant dashboard artifact: dense, structured, operational, and connected across pages. The current app already has useful data and mostly good primitives, but it looks slightly dated because pages are composed as separate card stacks with inconsistent widths, sparse empty states, and local controls that do not share one workbench vocabulary.

Do **not** change the colors. The redesign must use the existing token palette from [TOKENS.md](/Users/malikibrahim/Downloads/Unauth/docs/internal/design/TOKENS.md) and [globals.css](/Users/malikibrahim/Downloads/Unauth/app/globals.css). Make the app feel current through layout, density, hierarchy, states, interaction, and component consistency.

## Visual References

Primary style reference:

- [MerchantDashboard.tsx](/Users/malikibrahim/Downloads/Unauth/app/(public)/landing/_components/MerchantDashboard.tsx)

Current signed-in evidence inspected:

- `reports/ux-audit/screenshots/dashboard.png`
- `reports/ux-audit/screenshots/customers.png`
- `reports/ux-audit/screenshots/audit-results-overview.png`
- `reports/ux-audit/screenshots/upload-idle.png`
- `reports/ux-audit/screenshots/inbox.png`
- `reports/ux-audit/screenshots/chargebacks.png`
- `reports/ux-audit/screenshots/watchlist.png`
- `reports/ux-audit/screenshots/settings.png`

Observed issues to fix:

- Pages use different max widths and visual rhythms.
- Many areas look like generic cards on a canvas rather than a coherent product workbench.
- Empty states are too large and centered for operational software.
- Tables are good, but surrounding controls vary from page to page.
- Top-level concepts are fragmented across `Dashboard`, `Inbox`, `Customers`, `Watchlist`, `Audit history`, and `Evidence packages`.
- The app has many useful links, but they are not consistently surfaced as cross-page workflow paths.

## Non-Negotiables

- Do not change color values or introduce a new palette.
- Do not add dark mode.
- Do not copy the landing artifact's dark colors.
- Do not redesign public/marketing/auth pages.
- Do not invent fake production data.
- Do not bypass merchant scoping, permissions, RLS assumptions, or shared data helpers.
- Do not create new backend schema just for visual redesign.
- Do not remove existing routes. New navigation labels can point to existing routes.
- Do not strand new UI components. Every CTA, row action, nav item, and drilldown must link to an existing route or a defined follow-up route.

## Design Direction

The signed-in app should feel like a current financial intelligence console:

- Light, calm, and sharp.
- Dense without being cramped.
- Hairline dividers over heavy shadows.
- One workbench frame per page.
- Compact local navigation where a page has views.
- Data rows as the main visual object.
- Right rails for context, not decorative cards.
- Clear route-to-route movement: overview -> case -> profile -> evidence -> report.

Keep the existing parchment/white/blue/risk-token world. Modernize with:

- tighter page widths and full-width workbench panels
- sticky section headers inside long workflows
- compact metric strips instead of large card grids
- shared row and table treatments
- consistent filter/action bars
- smaller, more useful empty states
- route-aware action clusters
- precise badges, icons, and mono metadata

## Signed-In IA

Adopt the §4 labels as the conceptual IA for the signed-in app, while preserving current routes.

| Label | Canonical route | Existing routes it connects |
|---|---|---|
| `Overview` | `/dashboard` | latest audits, case queue, clusters, reports |
| `Cases` | `/inbox` | `/customers`, `/customers/[id]`, `/audit/[runId]/transaction/[id]` |
| `Clusters` | `/customers?merchantsMin=2` | `/customers`, `/customers/[id]`, customer drawer/cluster graph |
| `Audits` | `/history` | `/upload`, `/audit/[runId]`, `/audit/[runId]/customers` |
| `Reports` | `/chargebacks` | `/chargebacks/[id]`, `/customers/[id]/evidence/new`, `/report/[runId]` |

Recommended sidebar groups:

- `Workspace`: `Overview`, `Cases`
- `Analysis`: `Clusters`, `Audits`
- `Outputs`: `Reports`, `Watchlist`
- Footer: `Help`, `Settings`

Do not delete `Customers`, `Inbox`, or `Evidence packages` routes. This is an information architecture relabeling and visual unification pass, not a route migration.

## App Shell Changes

Files:

- [layout.tsx](/Users/malikibrahim/Downloads/Unauth/app/(app)/layout.tsx)
- [Sidebar.tsx](/Users/malikibrahim/Downloads/Unauth/components/nav/Sidebar.tsx)
- [AppHeader.tsx](/Users/malikibrahim/Downloads/Unauth/components/layout/AppHeader.tsx)
- [CommandPalette.tsx](/Users/malikibrahim/Downloads/Unauth/components/layout/CommandPalette.tsx)

Implementation:

- Pass `merchantProfile.name` and `user.email` into `Sidebar` and `AppHeader`; the components already accept these props but layout currently passes `null` or omits values.
- Update sidebar labels to the new signed-in IA while keeping hrefs stable.
- Keep the global header 56px and sticky.
- Keep command palette and avatar menu.
- Add a compact action/status slot pattern to `AppHeader` so pages can pass time range, export, or primary actions without building their own top-right islands.
- Make sidebar active states match the new IA aliases. Example: `/customers` should activate `Clusters`; `/customers/[id]` can activate `Cases` when reached from a case param, otherwise `Clusters`.

Avoid:

- Bigger logo treatment.
- New global nav bars above the current shell.
- Large breadcrumb stacks inside pages when the global header already handles breadcrumbs.

## Shared Components To Build

Create these components before page rewrites. This prevents every page from hand-rolling the style.

### `WorkbenchPage`

Suggested path: `components/workbench/WorkbenchPage.tsx`

Purpose: standard page container.

Props:

- `title`
- `subtitle`
- `eyebrow`
- `navItems`
- `activeNavKey`
- `actions`
- `children`
- `rail`
- `footerMeta`
- `density?: 'default' | 'compact'`

Behavior:

- Renders one bordered light workbench surface.
- Header contains compact local nav and actions.
- Body supports one-column, table-only, or `main + right rail`.
- Mobile stacks rail below main content.
- Keeps `h1` accessible even if visually compact.

### `WorkbenchNav`

Suggested path: `components/workbench/WorkbenchNav.tsx`

Purpose: local page-level nav using the `Overview / Cases / Clusters / Audits / Reports` language or page-specific tabs.

Rules:

- Active item uses `var(--accent)` bottom border.
- Links must be real Next `Link`s.
- No local nav item may be inert unless explicitly marked disabled with a tooltip.

### `WorkbenchKpiStrip`

Suggested path: `components/workbench/WorkbenchKpiStrip.tsx`

Purpose: compact metric row used on overview, cases, audits, reports, settings account health.

Rules:

- One bordered row with divided cells.
- Use mono tabular values.
- Use 10-11px overline labels.
- Do not use large hero metrics.
- Failed metric helper values render `Unavailable`, not `0`.

### `WorkbenchPanel`

Suggested path: `components/workbench/WorkbenchPanel.tsx`

Purpose: section shell with header strip, optional action slot, and dense body.

Rules:

- 4px radius.
- `var(--bg-surface)` body.
- `var(--bg-surface-alt)` or `var(--bg-canvas)` header strip.
- 1px borders only.
- Use for tables, rails, settings forms, evidence panels, upload stages.

### `WorkbenchTable`

Suggested path: extend [DataTable.tsx](/Users/malikibrahim/Downloads/Unauth/components/ui/DataTable.tsx) or wrap it as `components/workbench/WorkbenchTable.tsx`.

Purpose: standard dense table.

Rules:

- Compact rows default to 40px.
- Sticky header optional.
- Row actions live at far right.
- Row click target and explicit action link must agree.
- Support empty, loading, selected, and disabled rows.

### `WorkbenchActionBar`

Suggested path: `components/workbench/WorkbenchActionBar.tsx`

Purpose: standard controls area for search, filters, saved views, page size, export.

Rules:

- Search left.
- Filters and saved views middle.
- Page size, export, primary action right.
- Mobile wraps predictably.
- Do not hide critical actions behind icon-only controls unless there is a tooltip.

### `WorkbenchEmptyState`

Suggested path: `components/workbench/WorkbenchEmptyState.tsx`

Purpose: smaller operational empty states.

Rules:

- Lives inside a panel.
- Compact, left-aligned by default.
- Always includes the next real route.
- Avoid large centered blank boxes except for true first-run onboarding.

### `InsightRail`

Suggested path: `components/workbench/InsightRail.tsx`

Purpose: right-column contextual rail.

Sections:

- `Summary`
- `Activity`
- `Top signals`
- `Related`
- `Next actions`

Every item in `Related` and `Next actions` must link somewhere real.

## Route Connection Contract

Every page rewrite must include a `route contract` section in code review:

- Primary action route.
- Main row click route.
- Secondary action routes.
- Empty state route.
- Back/breadcrumb route.
- Related rail routes.

Examples:

- `/dashboard` case row -> `/customers/[id]` when profile id exists, else `/audit/[runId]/transaction/[id]`.
- `/inbox` row -> same as dashboard case row.
- `/customers` row -> opens drawer and has `View full profile` -> `/customers/[id]`.
- `/customers/[id]` evidence CTA -> `/customers/[id]/evidence/new`.
- `/customers/[id]/evidence/new` completion -> `/chargebacks/[id]`.
- `/chargebacks/[id]` download -> `/api/evidence/[id]/pdf`.
- `/history` row -> `/audit/[runId]`.
- `/audit/[runId]` transaction row -> `/audit/[runId]/transaction/[id]`.
- `/audit/[runId]` customers tab row -> `/customers/[id]?audit=[runId]` where possible.

Do not ship a new component if its main action is a placeholder.

## Page-By-Page Implementation

### 1. Overview

Routes:

- [dashboard/page.tsx](/Users/malikibrahim/Downloads/Unauth/app/(app)/dashboard/page.tsx)

Status:

- Already partly converted to a light workbench.

Next edits:

- Extract current dashboard workbench into shared `components/workbench/*`.
- Replace local hard-coded patterns with shared components.
- Keep `Overview / Cases / Clusters / Audits / Reports` local nav.
- Add `Related` rail items for latest audit, top cluster, and latest evidence package.
- Ensure dashboard `Cases` nav target matches final IA decision: `/inbox` for case queue or `/customers?risk=high&status=new` for profiles. Prefer `/inbox`.

### 2. Cases

Routes:

- [inbox/page.tsx](/Users/malikibrahim/Downloads/Unauth/app/(app)/inbox/page.tsx)
- [InboxClient.tsx](/Users/malikibrahim/Downloads/Unauth/components/inbox/InboxClient.tsx)

Redesign:

- Make `/inbox` the canonical `Cases` view.
- Replace the single `MetricCard` and large empty box with `WorkbenchPage`.
- Add a KPI strip: `Open cases`, `Value under review`, `Definite`, `Probable`, `Oldest case`.
- Use `WorkbenchActionBar` for export, page size, and `New Audit`.
- Use dense rows with customer, order, grade, amount, top reason, age, and action.
- Add right rail: `Top reasons`, `Recent audit source`, `Queue hygiene`, `Shortcuts`.

Connections:

- Row primary -> `/customers/[id]` if profile id exists.
- Fallback row -> `/audit/[runId]/transaction/[id]`.
- Export -> `/api/inbox/export`.
- Empty -> `/upload`.
- Related cluster -> `/customers?merchantsMin=2`.

### 3. Clusters

Routes:

- [customers/page.tsx](/Users/malikibrahim/Downloads/Unauth/app/(app)/customers/page.tsx)
- [CustomersTableClient.tsx](/Users/malikibrahim/Downloads/Unauth/components/customers/CustomersTableClient.tsx)
- [CustomerIntelligenceDrawer.tsx](/Users/malikibrahim/Downloads/Unauth/components/customers/CustomerIntelligenceDrawer.tsx)
- [customers/[id]/page.tsx](/Users/malikibrahim/Downloads/Unauth/app/(app)/customers/[id]/page.tsx)

Redesign:

- Treat `/customers` as the canonical `Clusters` explorer.
- Replace cohort cards with a compact segmented strip: `All`, `Needs review`, `Linked identities`, `Watchlisted`, `Resolved`.
- Move saved views into `WorkbenchActionBar`.
- Keep dense table, but update columns to cluster language: `Identity`, `Status`, `Grade`, `Score`, `Orders`, `Refunds`, `Merchants`, `Last seen`, `Open`.
- Add a right rail on desktop: selected cluster preview, top filters, saved views, watchlist summary.
- Keep drawer, but make its header/body use `WorkbenchPanel` and ensure `View full profile`, `Generate evidence`, and `View audit source` routes are always present when data allows.

Connections:

- Table row -> drawer.
- Drawer `View full profile` -> `/customers/[id]`.
- Full profile back link -> originating `audit` or `/customers`.
- Evidence CTA -> `/customers/[id]/evidence/new`.
- Watchlist action -> `/watchlist`.
- Status updates stay in place with existing API.

### 4. Audits

Routes:

- [upload/page.tsx](/Users/malikibrahim/Downloads/Unauth/app/(app)/upload/page.tsx)
- [UploadClient.tsx](/Users/malikibrahim/Downloads/Unauth/components/upload/UploadClient.tsx)
- [history/page.tsx](/Users/malikibrahim/Downloads/Unauth/app/(app)/history/page.tsx)
- [AuditHistoryTableClient.tsx](/Users/malikibrahim/Downloads/Unauth/components/audit/AuditHistoryTableClient.tsx)
- [audit/[runId]/page.tsx](/Users/malikibrahim/Downloads/Unauth/app/(app)/audit/[runId]/page.tsx)

Upload redesign:

- Wrap upload in `WorkbenchPage` with local nav: `Upload`, `History`, `Data guide`.
- Make upload flow a workbench panel with a left stage area and right guidance rail.
- Keep export guide, column mapping, context step, duplicate warning, processing progress.
- Replace large dashed dropzone dominance with a compact but obvious dropzone plus stage metadata.
- Use consistent stage headers: `01 Upload`, `02 Map`, `03 Context`, `04 Process`.

History redesign:

- Use `WorkbenchPage` and `WorkbenchTable`.
- KPI strip: `Audits`, `Rows processed`, `Matched`, `Last upload`, `Failed`.
- Row -> `/audit/[runId]`.
- Empty -> `/upload`.

Audit result redesign:

- Use `WorkbenchPage` with local nav: `Overview`, `Customers`, `Transactions`, `Data quality`.
- Replace grade card grid with `WorkbenchKpiStrip` plus dense distribution strip.
- Put audit metadata and actions in one action/status bar.
- Customers and transactions tabs should use the same `WorkbenchTable` density.
- Right rail: `Run metadata`, `Top signals`, `Data quality`, `Exports`.

Connections:

- Upload complete -> `/audit/[runId]`.
- History row -> `/audit/[runId]`.
- Audit customer row -> `/customers/[id]?audit=[runId]` when possible.
- Audit transaction row -> `/audit/[runId]/transaction/[id]`.
- Export -> `/api/audit/[runId]/export`.
- Data quality docs -> `/help/csv-export`.

### 5. Reports

Routes:

- [chargebacks/page.tsx](/Users/malikibrahim/Downloads/Unauth/app/(app)/chargebacks/page.tsx)
- [chargebacks/[id]/page.tsx](/Users/malikibrahim/Downloads/Unauth/app/(app)/chargebacks/[id]/page.tsx)
- [customers/[id]/evidence/new/page.tsx](/Users/malikibrahim/Downloads/Unauth/app/(app)/customers/[id]/evidence/new/page.tsx)
- [report/[runId]/page.tsx](/Users/malikibrahim/Downloads/Unauth/app/(app)/report/[runId]/page.tsx)

Redesign:

- Make `/chargebacks` the canonical `Reports` view.
- Replace centered empty panel with compact `WorkbenchEmptyState` and a right rail explaining where reports come from.
- Table columns: `Reference`, `Customer`, `Order`, `Generated`, `CE3`, `Cross-merchant`, `Actions`.
- Use icons for download/view where sensible, with tooltips.
- Package detail should use workbench panels: `Summary`, `Evidence strength`, `Narrative`, `Transactions`, `Download`.
- Evidence creation flow should look like a report builder, not a form page.

Connections:

- Reports empty -> `/customers`.
- Reports row view -> `/chargebacks/[id]`.
- Download -> `/api/evidence/[id]/pdf`.
- Customer link -> `/customers/[id]`.
- Create evidence -> `/customers/[id]/evidence/new`.

### 6. Watchlist

Routes:

- [watchlist/page.tsx](/Users/malikibrahim/Downloads/Unauth/app/(app)/watchlist/page.tsx)
- [WatchlistTableClient.tsx](/Users/malikibrahim/Downloads/Unauth/components/watchlist/WatchlistTableClient.tsx)

Redesign:

- Keep Watchlist as an output/monitoring utility, not a primary top-level §4 tab.
- Use `WorkbenchPage`.
- Merge `Appeared in recent audits` and `All watchlisted customers` into one workbench with two compact panels.
- Add KPI strip: `Watched`, `Appeared 30d`, `Needs review`, `Resolved`.
- Empty state should route to `/customers` and `/upload`.

Connections:

- Appearance row -> `/audit/[runId]`.
- Watchlist row -> `/customers/[id]` where possible.
- Search persists with query params.
- Remove action stays inline.

### 7. Saved Views

Routes:

- [saved/page.tsx](/Users/malikibrahim/Downloads/Unauth/app/(app)/saved/page.tsx)

Redesign:

- Treat as a small utility page.
- Use `WorkbenchPage`.
- Empty state routes to `/customers`, `/inbox`, and `/history`.
- Future saved views should store label, source route, query string, created at, and count snapshot.

Connections:

- Saved customer view -> `/customers?[query]`.
- Saved cases view -> `/inbox?[query]`.
- Saved audit view -> `/history?[query]`.

### 8. Settings

Routes:

- [settings/account/page.tsx](/Users/malikibrahim/Downloads/Unauth/app/(app)/settings/account/page.tsx)
- [settings/team/page.tsx](/Users/malikibrahim/Downloads/Unauth/app/(app)/settings/team/page.tsx)
- [settings/audit-trail/page.tsx](/Users/malikibrahim/Downloads/Unauth/app/(app)/settings/audit-trail/page.tsx)

Redesign:

- Use a settings-specific `WorkbenchPage` with local nav: `Account`, `Team`, `Audit trail`.
- Replace large form cards with compact `WorkbenchPanel` sections.
- Forms should use the shared `Input`, `Select`, `Button`, and an inline save status row.
- Dangerous actions should remain visibly separate using existing risk tokens.

Connections:

- Account -> `/settings/account`.
- Team -> `/settings/team`.
- Audit trail -> `/settings/audit-trail`.
- Support link remains `mailto:support@unauth.io`.

### 9. Help

Routes:

- [help/page.tsx](/Users/malikibrahim/Downloads/Unauth/app/(app)/help/page.tsx)
- [help/csv-export/page.tsx](/Users/malikibrahim/Downloads/Unauth/app/(app)/help/csv-export/page.tsx)
- [help/how-it-works/page.tsx](/Users/malikibrahim/Downloads/Unauth/app/(app)/help/how-it-works/page.tsx)
- [help/confidence-grades/page.tsx](/Users/malikibrahim/Downloads/Unauth/app/(app)/help/confidence-grades/page.tsx)
- [help/identity-matching/page.tsx](/Users/malikibrahim/Downloads/Unauth/app/(app)/help/identity-matching/page.tsx)

Redesign:

- Keep content simple, but use `WorkbenchPage`.
- Help index should use dense article rows, not floating cards.
- Add related workflow links from docs back into app routes.

Connections:

- CSV export docs -> `/upload`.
- Confidence docs -> `/customers`.
- Identity matching docs -> `/audit/[latestRun]` if available, otherwise `/history`.

## Currentness Without New Colors

Use these techniques to make the app feel current while preserving colors:

- Reduce page padding variance. Standard: `p-4 md:p-6`.
- Prefer full-width workbench surfaces over centered narrow cards, except settings/help content.
- Use structured header strips instead of standalone page title plus scattered controls.
- Add subtle sticky headers for long tables and multi-step flows.
- Use consistent 4px radius for operational panels; 8px only for larger modal/drawer surfaces.
- Replace big empty states with compact route-aware panels.
- Use lucide icons in buttons where actions are clear: upload, download, filter, save, search, export.
- Keep typography inside compact panels restrained; no hero-scale type in signed-in workflows.
- Use mono values for IDs, scores, dates, counts, and money.
- Keep row actions terse and consistent: `Open`, `Review`, `View`, `Download`.
- Put secondary metadata in right rails instead of below every section.

Avoid:

- Adding gradients or decorative background shapes to the signed-in app.
- Purple or dark UI drift.
- Marketing-style hero layouts.
- Over-rounded cards.
- Large shadows.
- Floating cards inside other cards.

## Data And Safety Rules

Use existing safe helpers when dealing with service-role data:

- [merchantHelpers.ts](/Users/malikibrahim/Downloads/Unauth/lib/supabase/merchantHelpers.ts)
- `fetchMerchantReviewQueueRows`
- `fetchReviewQueueProfileIds`
- `countMerchantReviewQueueProfiles`
- `getExposureAtRisk`
- `fetchMerchantScopedCustomerProfile`
- `fetchMerchantScopedCustomerTransactions`

When service-role access is necessary:

- prove merchant ownership through `ctx.merchantId`, owned job IDs, or an existing helper
- do not query `audit_transactions` across tenants
- do not query `customer_profiles` without merchant filtering
- preserve failed-helper rendering as `Unavailable`
- never convert a failed metric helper into `0`

## Implementation Sequence

1. Add `components/workbench/*` shared components.
2. Update app shell props and sidebar IA labels.
3. Convert `/dashboard` to consume shared workbench components.
4. Convert `/inbox` as canonical `Cases`.
5. Convert `/customers` and customer drawer/full profile as `Clusters`.
6. Convert `/history`, `/upload`, and `/audit/[runId]` as `Audits`.
7. Convert `/chargebacks`, package detail, and evidence generation as `Reports`.
8. Convert `/watchlist`, `/saved`, `/settings/*`, `/help/*`.
9. Run route contract review for every converted page.
10. Run build and visual verification.

## Verification Checklist

Technical:

- `npm run build`
- relevant unit tests for touched helpers/components
- Playwright or manual browser pass across desktop and mobile

Visual:

- No signed-in page uses a dark workbench.
- No new raw colors outside existing token references.
- Page widths and padding feel consistent.
- Tables and rows share one density.
- Empty states are compact and route-aware.
- Text does not overflow in nav, badges, table cells, buttons, or rails.

Workflow:

- `Overview` links into cases, clusters, audits, and reports.
- `Cases` rows open a customer/profile or transaction.
- `Clusters` rows open drawer and full profile.
- `Audits` flow connects upload -> audit result -> customers/transactions -> export.
- `Reports` connects evidence generation -> package detail -> PDF download.
- `Watchlist` connects appearances back to audits and customers.
- Settings and help remain reachable from the shell footer/header.

## Definition Of Done

The signed-in app should look like one current product surface, not a collection of pages. A user should be able to start at `/dashboard`, move into a case, inspect a cluster, open the source audit, generate an evidence package, and return to reports without encountering a visual style break or a dead-end action.

The colors stay the same. The product should feel newer because the structure is sharper, the information is denser, and the paths between pages are obvious.
