# Layout, Loading, and Consistency Implementation Plan

Date: 2026-06-02

Status: audit and implementation plan only. No implementation code changes are included in this pass.

## Scope

This document audits the layout, visual consistency, collapsed navigation loading state, and slow or long-running loading indicators shown in the supplied screenshots and reproduced locally at `localhost:3000`.

The goal is to define the implementation work needed to make the app feel like one coherent product: shared shells, shared spacing, shared card and table primitives, predictable loading states, and no navigation spinner layout shift.

## Screens Reviewed

- Audit result overview
- Import history
- Reports overview
- Customer profile hero and summary
- Customer profile order and claim history
- Customer profile network footprint and details

## Local Evidence

The following files are the main sources behind the audit findings:

- `components/navigation/NavigationProvider.tsx`
- `components/navigation/AppNavLink.tsx`
- `components/navigation/RouteProgressBar.tsx`
- `components/nav/SidebarNavItem.tsx`
- `components/nav/SidebarAside.tsx`
- `components/navigation/skeletons/pageSkeletons.tsx`
- `components/navigation/skeletons/WorkbenchPageSkeleton.tsx`
- `app/(app)/layout.tsx`
- `app/(app)/reports/page.tsx`
- `app/(app)/audit/[runId]/page.tsx`
- `app/(app)/audit/[runId]/AuditRunPageView.tsx`
- `app/(app)/audit/[runId]/AuditRunPageSummarySections.tsx`
- `app/(app)/history/page.tsx`
- `components/audit/AuditHistoryTableClient.tsx`
- `app/(app)/reports/ReportsPageView.tsx`
- `app/(app)/reports/ReportsOverviewTab.tsx`
- `app/(app)/customers/[id]/CustomerProfilePageView.tsx`
- `app/(app)/customers/[id]/CustomerProfilePageHero.tsx`
- `app/(app)/customers/[id]/CustomerProfilePageMainColumn.tsx`
- `app/(app)/customers/[id]/CustomerProfilePageSidebar.tsx`
- `app/(app)/customers/[id]/customerProfilePageLoad.ts`
- `components/common/PageHeader.tsx`
- `components/ui/PageHeader.tsx`
- `components/workbench/WorkbenchPage.tsx`
- `components/ui/MetricCard.tsx`
- `components/ui/SectionCard.tsx`
- `components/ui/DataTable.tsx`
- `app/globals.css`

## Executive Summary

The app currently has three overlapping UI systems:

1. A Workbench shell used by pages such as Reports, Claims, Customers, Upload, History, and Chargebacks.
2. A bespoke detail-page system used by Customer Profile and Audit Result pages.
3. Older shared primitives such as `components/common/PageHeader`, custom tables, custom cards, and duplicated typography tokens.

The supplied screenshots feel inconsistent because those systems are active at the same time. Cards, headers, tab treatments, KPI strips, table density, metric typography, gutters, and loading skeletons vary by page.

The collapsed navigation issue is concrete: `AppNavLink` appends a spinning loader inside the link when `pendingHref` matches the destination. In collapsed mode the sidebar item only has an icon-sized area, so the appended spinner competes with the icon and badge. That creates visual overlap and can push the icon away.

The long spinner issue is also concrete: route pending state is started on link click and cleared only when the pathname changes or after a 15 second timeout. It is not tied to whether meaningful page content is visible. Some pages also do substantial server work on navigation, so a real delay and a stale pending indicator can combine into the perception that loading never ends.

## Target Product Direction

Use two canonical layout families:

1. Workbench pages
   - Dense operational pages with tables, filters, action bars, KPI strips, and page-level tabs.
   - Examples: Dashboard, Customers, Claims, Watchlist, Evidence Packages, Reports, Import History, Uploads, Chargebacks.
   - Canonical primitive: `components/workbench/WorkbenchPage.tsx`.

2. Detail pages
   - Investigation or record pages with a focused header, actions, summary metrics, main content, and optional right rail.
   - Examples: Customer Profile, Audit Result, Evidence Package Detail, Transaction Detail, Claim Detail.
   - New canonical primitive recommended: `DetailPageShell`.

Every page should clearly belong to one of these two families. Avoid one-off page wrappers unless there is a product reason strong enough to document.

## Design System Decisions

### Canonical Shells

- Keep `WorkbenchPage` as the top-level operational shell.
- Add a `DetailPageShell` for focused investigation/detail pages.
- Move Audit Result and Customer Profile into `DetailPageShell`.
- Use the same maximum content width, side gutters, header rhythm, section spacing, card radius, and tabs across both shells.

### Canonical Header

- Use one app header primitive.
- Retire or stop using `components/common/PageHeader.tsx`.
- Prefer a single `components/ui/PageHeader.tsx` or a new shell-owned header API shared by `WorkbenchPage` and `DetailPageShell`.
- Breadcrumbs, back links, title, subtitle, status badge, tabs, and actions should have one visual treatment.

### Canonical Card, Metric, Table, and Tabs

- Use `SectionCard` for section containers.
- Use `MetricCard` or a new compact metric item consistently for KPIs.
- Use `DataTable` or a Workbench table wrapper for all dense tabular surfaces.
- Use one tabs component/treatment for Workbench and Detail pages, with only density adjustments.

### Canonical Tokens

`app/globals.css` currently contains overlapping token families:

- `--bg-*`, `--text-*`, `--space-*`, `--radius-*`
- `--surface-*`, `--ink-*`, `--copper-*`
- `.text-heading-*`, `.text-h1`, `.text-h2`, `.text-h3`
- `.t-*`

Implementation should choose one active vocabulary for app surfaces. Recommended direction:

- Use `--surface-*` for backgrounds and panels.
- Use `--ink-*` for text.
- Use `--copper-*` for the primary action and selected states.
- Use one type scale for product UI, preferably the compact `.t-*` scale already used by Workbench pages.
- Stop adding negative letter spacing. Existing negative letter spacing in UI primitives should be removed during the migration.

### Density and Radius

- Cards should stay at 8px radius or less.
- Page sections should not be floating cards inside floating cards.
- Nested cards should be replaced with rows, panels, or metric strips unless the nested element is a repeated item or modal.
- Operational pages should remain dense and scannable, not marketing-like.

## Findings

### F1. Collapsed Nav Spinner Collides With Icons

Source:

- `components/navigation/AppNavLink.tsx`
- `components/nav/SidebarNavItem.tsx`
- `components/nav/SidebarAside.tsx`

Observed behavior:

- In collapsed navigation, a route click shows a spinner inside the nav item.
- The spinner appears where the icon and collapsed badge already need space.
- The icon appears covered or pushed away while the page is pending.

Root cause:

- `AppNavLink` appends a `<Loader2>` after `children` when the link is pending.
- `SidebarNavItem` renders collapsed items as an icon-only flex row with `justify-center`.
- There is no reserved second slot for a pending indicator in collapsed mode.

Implementation:

- Remove the inline appended spinner from collapsed sidebar nav items.
- Keep route-level progress in `RouteProgressBar`.
- Represent pending state on a collapsed icon with a non-layout-affecting visual treatment:
  - an overlay ring,
  - a subtle icon opacity change,
  - or a positioned mini spinner that sits inside the fixed icon button bounds.
- Do not add children that change flex layout width.
- Add `aria-busy="true"` to the pending link if useful, but avoid duplicate visual indicators.
- Ensure the icon slot remains the same size across default, hover, active, pending, and badge states.

Acceptance criteria:

- Collapsed nav icons do not move during navigation.
- The pending indicator never covers the icon in a way that hides the destination.
- Badges and pending state can coexist.
- Expanded nav remains readable and does not shift label text.

### F2. Route Spinner Can Continue After Content Appears

Source:

- `components/navigation/NavigationProvider.tsx`
- `components/navigation/AppNavLink.tsx`
- `components/navigation/RouteProgressBar.tsx`

Observed behavior:

- The top route progress bar and per-link spinner can remain active for a long time.
- The UI can look loaded while the spinner continues.
- Pending state currently has a 15 second fail-safe.

Root cause:

- Pending state starts on link click, not on a verified route transition event.
- Pending state clears on pathname change or timeout.
- Query-string/tab changes and cases where content is already visible are not handled precisely.
- `NavigationProvider` calls `setPendingHref(null)` during render when the current pathname matches the pending path. This should be moved to an effect.

Implementation:

- Move pending cleanup into `useEffect`.
- Track both pathname and search params so query-only navigation can clear.
- Clear pending after the next paint once the destination path or query is active.
- Shorten the fail-safe timeout to a product-appropriate value, likely 3 to 4 seconds.
- Do not start pending for:
  - same-page links,
  - hash-only links,
  - modified clicks,
  - external links,
  - links opened in a new tab.
- Avoid per-link spinners for route navigation. Use the top progress bar as the primary route transition signal.
- Keep inline spinners only for local operations such as importing, saving, deleting, or generating.

Acceptance criteria:

- Route progress clears within one animation frame after the URL and visible shell are updated.
- A stale route indicator cannot remain for 15 seconds.
- Content-visible pages do not show an unrelated spinner.
- Pending state works for path and query navigation.

### F3. Loading Skeletons Do Not Always Match Final Layouts

Source:

- `components/navigation/skeletons/pageSkeletons.tsx`
- `components/navigation/skeletons/WorkbenchPageSkeleton.tsx`
- `app/(app)/customers/[id]/loading.tsx`

Observed behavior:

- Skeletons and final pages use different shells and spacing.
- Customer Profile loading does not mirror the real hero, rail, or section structure closely enough.
- The mismatch makes loading feel longer and less trustworthy.

Implementation:

- Create skeletons per canonical shell:
  - `WorkbenchPageSkeleton`
  - `DetailPageSkeleton`
- Detail skeletons should reserve the same header, action row, metric strip, main column, and right rail as the final layout.
- Avoid full-screen spinners for route data where structural skeletons are possible.
- For lower sections, use Suspense boundaries and skeleton only the section that is still loading.

Acceptance criteria:

- Skeleton layout does not jump when content appears.
- Loading states look like the final page, just without final data.
- No global spinner remains after primary content is visible.

### F4. Some Navigations Are Actually Slow

Source:

- `app/(app)/layout.tsx`
- `app/(app)/reports/page.tsx`
- `app/(app)/audit/[runId]/page.tsx`
- `app/(app)/customers/[id]/customerProfilePageLoad.ts`

Observed behavior:

- Pages can take several seconds to become interactive.
- A single route can fetch shell data, merchant context, connection state, jobs, records, claims, orders, exposure data, and summaries before rendering.

Root causes:

- `app/(app)/layout.tsx` is `force-dynamic` and awaits multiple shell-level data calls for every app page.
- Reports fetches many datasets for the overview, including claim/outcome and import-derived datasets.
- Audit result fetches summary, transactions, cross-merchant checks, and customer fallback calculations.
- Customer profile loading has multiple independent data groups that can be parallelized or streamed.

Implementation:

- Separate shell-critical data from page-specific data.
- Cache or revalidate stable shell data such as merchant profile, connection state, and nav counts.
- Move non-critical shell counts to client-side background fetches or Suspense islands.
- Parallelize independent page queries with `Promise.all`.
- Fetch tab-specific datasets only when that tab is active.
- Stream lower-priority detail sections after the hero and key summary are visible.
- Persist heavy audit/import summary metrics where possible instead of recomputing them on every detail view.

Acceptance criteria:

- Primary page shell and header render quickly.
- Page lower sections can load independently.
- Reports and Audit Result do not fetch invisible tab data before first paint.
- Customer Profile hero is visible before long history/sidebar sections finish.

### F5. App Has Multiple Active Layout Systems

Source:

- `components/workbench/WorkbenchPage.tsx`
- `components/common/PageHeader.tsx`
- `components/ui/PageHeader.tsx`
- `components/ui/SectionCard.tsx`
- `components/ui/MetricCard.tsx`
- `app/globals.css`

Observed behavior:

- Reports and History use Workbench.
- Audit Result and Customer Profile use bespoke wrappers.
- Store/settings-like areas use `components/ui/PageHeader`.
- Audit Result uses `components/common/PageHeader`.
- Cards, tabs, page gutters, and type styles vary by page.

Implementation:

- Create an inventory of all app routes and assign each to Workbench or Detail shell.
- Remove direct page-level padding and width decisions from individual pages where the shell can own them.
- Replace custom card wrappers with `SectionCard` or documented shell sections.
- Replace one-off tabs with the canonical tabs component.
- Replace one-off tables with `DataTable` or a Workbench table wrapper.

Acceptance criteria:

- A user can move between Reports, Import History, Audit Result, and Customer Profile without seeing a new visual grammar each time.
- All app routes use the same spacing scale and card radius.
- No route imports `components/common/PageHeader`.

## Page-Specific Plans

### Audit Result

Current issues:

- Uses a bespoke page wrapper instead of Workbench or a detail shell.
- Header, breadcrumbs, tabs, summary card, KPI row, and match cards all have different density and rhythm from Reports and History.
- The summary card is very wide but contains little content.
- KPI row is uneven: small cards, a larger breakdown card, and a tall completed card compete for attention.
- The empty green callout at the bottom is oversized compared with the actionable information it contains.

Implementation:

- Move the page into `DetailPageShell`.
- Use canonical detail header:
  - back link,
  - title,
  - upload filename and timestamp,
  - status badge,
  - primary action.
- Replace the full-width summary card with a compact evidence summary band.
- Use one metric strip for:
  - orders analysed,
  - matched profiles,
  - linked across stores,
  - strong matches,
  - completed date.
- Move match strength into a canonical chart section below the metric strip.
- Use canonical tabs for Overview, Customers, Transactions, and Data Quality.
- Convert match-grade cards into a compact distribution component using the same color tokens as Reports.
- Reduce empty-state height and align actions to the same button system.

Acceptance criteria:

- Audit Result looks like an investigation detail page from the same app as Customer Profile.
- No sparse full-width card dominates the first screen.
- Metric typography does not clip or over-scale.
- Tabs match the rest of the product.

### Import History

Current issues:

- This page is closest to the desired operational density.
- It uses Workbench, but the table is hand-rolled instead of the shared DataTable.
- KPI labels say "Current page scope", which can be confusing in a page that reads like an import ledger.
- The page reinforces CSV/import history as a primary product area rather than a backfill or audit lane.

Implementation:

- Keep it as a Workbench page.
- Replace the hand-rolled table with the canonical table wrapper.
- Decide whether KPI totals should be global or current filtered/page scope.
- If they remain page-scope, make the label explicit in a less prominent way.
- Rename or position the area as Historical Imports or Backfill Runs if product direction is to emphasize live intelligence.
- Keep row density and right-aligned actions.

Acceptance criteria:

- Table header, checkboxes, row hover, action affordances, pagination, and density match other Workbench tables.
- KPI scope is clear.
- Import History visually belongs with Reports and Customers.

### Reports

Current issues:

- Uses Workbench shell, but overview cards are custom and not fully aligned with shared primitives.
- Source status cards, historical import cards, chart cards, and live summary cards use slightly different composition.
- The most analytical visuals are not the first thing the eye understands.
- There is at least one non-canonical text class usage in the overview implementation.

Implementation:

- Keep Reports as a Workbench page.
- Convert custom overview cards to shared section primitives.
- Make the first row a concise health and outcome summary:
  - live source health,
  - historical import coverage,
  - claims at risk,
  - match rate.
- Put the strongest visual summary above secondary metric cards.
- Use one source badge treatment for Live Source and CSV Import.
- Make timeframe controls and export actions use canonical segmented control and button styles.
- Ensure all chart cards use the same header, description, action, and badge placement.

Acceptance criteria:

- Reports feels like the analytical peer of Import History, not a separate dashboard design.
- Source badges, chart cards, and metric cards are visually consistent.
- The overview answers "what changed and what needs attention" in the first viewport.

### Customer Profile

Current issues:

- Uses a bespoke wrapper and hero layout.
- Hero metric grid forces a wide right column and then squeezes text inside narrow metric cells.
- Long metric labels and values wrap poorly:
  - "4 merchants" splits awkwardly.
  - date values break across lines.
  - currency values wrap in ways that look unintentional.
- The first screen has too many competing panels.
- Main column and sidebar cards are useful but visually heavy and nested.
- Lower pages look more like stacked report cards than one investigation flow.

Implementation:

- Move Customer Profile into `DetailPageShell`.
- Rebuild the hero as a dossier header:
  - identity name and grade,
  - primary identifier,
  - risk/claim summary sentence,
  - status/action group,
  - compact key metric strip.
- Remove the fixed `minmax(560px, 0.9fr)` hero metric grid.
- Use responsive metric columns such as `minmax(160px, 1fr)` with stable min widths.
- Cap metric value font size in compact contexts.
- Use `white-space: nowrap` only for small known tokens; otherwise use controlled wrapping.
- Move deep metrics to the right rail or summary section rather than forcing all of them into the hero.
- Convert the timeline/history section into the dominant main investigation surface.
- Reduce nested cards inside `SectionCard`; use rows and panels instead.
- Keep the right rail sticky, but align its spacing and metric style with the hero.

Acceptance criteria:

- No customer hero text clips or splits awkwardly at 2048, 1440, 1280, 1024, tablet, or mobile widths.
- The first viewport shows identity, risk, next action, and key metrics without visual crowding.
- Main content and right rail use the same card and metric system.
- Detail page spacing matches Audit Result after migration.

## Implementation Phases

### Phase 0. Instrument and Baseline

Tasks:

- Capture baseline screenshots for the supplied routes at desktop and tablet widths.
- Capture collapsed-sidebar navigation screenshots during route pending.
- Add temporary development-only timing logs or marks for route pending start/clear.
- Record first visible shell time and full data-ready time for Reports, Audit Result, Import History, and Customer Profile.

Output:

- Baseline screenshot folder.
- Simple navigation timing notes.
- Confirmed route list assigned to Workbench or Detail shell.

### Phase 1. Fix Navigation Pending UI

Tasks:

- Refactor `NavigationProvider` so pending cleanup happens in effects.
- Track pathname and search params.
- Shorten stale pending fail-safe from 15 seconds to 3 to 4 seconds.
- Remove layout-affecting inline route spinners from sidebar links.
- Add a non-layout-affecting pending treatment for collapsed nav items.
- Keep `RouteProgressBar` as the primary route transition indicator.
- Add tests for collapsed sidebar pending state.

Files likely touched:

- `components/navigation/NavigationProvider.tsx`
- `components/navigation/AppNavLink.tsx`
- `components/navigation/RouteProgressBar.tsx`
- `components/nav/SidebarNavItem.tsx`
- `components/nav/SidebarAside.tsx`

Acceptance criteria:

- No collapsed icon displacement.
- No spinner covering the destination icon.
- Pending state clears reliably after route change.
- Same-page links do not start route pending.

### Phase 2. Define Canonical Layout Primitives

Tasks:

- Add or formalize `DetailPageShell`.
- Decide whether `PageHeader` lives in `components/ui` or shell-specific components.
- Deprecate `components/common/PageHeader.tsx`.
- Normalize section spacing, card radius, title styles, subtitles, tabs, and action rows.
- Define compact metric behavior for dense panels and detail rails.
- Align `MetricCard`, `SectionCard`, `DataTable`, and tabs to the chosen token and type scale.

Files likely touched:

- `components/workbench/WorkbenchPage.tsx`
- `components/ui/PageHeader.tsx`
- `components/common/PageHeader.tsx`
- `components/ui/MetricCard.tsx`
- `components/ui/SectionCard.tsx`
- `components/ui/DataTable.tsx`
- `app/globals.css`

Acceptance criteria:

- There is a documented shell choice for every app route.
- App pages stop defining unrelated local spacing systems.
- Metric values fit in compact containers.
- No new negative letter spacing is introduced.

### Phase 3. Migrate the Reviewed Pages

Tasks:

- Migrate Audit Result to `DetailPageShell`.
- Keep Import History on `WorkbenchPage`, but convert its table and KPI strip to canonical components.
- Keep Reports on `WorkbenchPage`, but convert custom overview cards and source badges to canonical components.
- Migrate Customer Profile to `DetailPageShell` and rebuild the hero metric layout.

Files likely touched:

- `app/(app)/audit/[runId]/AuditRunPageView.tsx`
- `app/(app)/audit/[runId]/AuditRunPageSummarySections.tsx`
- `components/audit/AuditTabs.tsx`
- `components/audit/AuditHistoryTableClient.tsx`
- `app/(app)/history/page.tsx`
- `app/(app)/reports/ReportsPageView.tsx`
- `app/(app)/reports/ReportsOverviewTab.tsx`
- `app/(app)/customers/[id]/CustomerProfilePageView.tsx`
- `app/(app)/customers/[id]/CustomerProfilePageHero.tsx`
- `app/(app)/customers/[id]/CustomerProfilePageMainColumn.tsx`
- `app/(app)/customers/[id]/CustomerProfilePageSidebar.tsx`

Acceptance criteria:

- The four reviewed page families share the same shell language.
- The Customer Profile hero has no clipped or awkwardly broken metrics.
- Audit Result no longer feels like a separate legacy page.
- Reports and Import History feel like sibling Workbench pages.

### Phase 4. Improve Loading and Data Fetching

Tasks:

- Split shell-critical data from page data in `app/(app)/layout.tsx`.
- Cache or revalidate stable merchant and connection data.
- Fetch non-critical nav counts after shell render.
- Parallelize independent page data calls.
- Stream slow lower sections behind Suspense boundaries.
- Fetch data only for active tabs where possible.
- Replace page-level loading screens with shell-matching skeletons.

Files likely touched:

- `app/(app)/layout.tsx`
- `components/navigation/skeletons/pageSkeletons.tsx`
- `components/navigation/skeletons/WorkbenchPageSkeleton.tsx`
- `app/(app)/customers/[id]/loading.tsx`
- `app/(app)/reports/page.tsx`
- `app/(app)/audit/[runId]/page.tsx`
- `app/(app)/customers/[id]/customerProfilePageLoad.ts`

Acceptance criteria:

- Primary shell appears quickly.
- Lower sections can render after primary content.
- Route progress does not mask content that is already usable.
- Reports, Audit Result, and Customer Profile avoid fetching invisible tab data before first paint.

### Phase 5. QA and Regression Checks

Tasks:

- Run visual checks at:
  - 2048 x 1329,
  - 1440 x 900,
  - 1280 x 800,
  - 1024 x 768,
  - mobile width.
- Test collapsed and expanded sidebar navigation.
- Test slow network or delayed server responses.
- Test direct route loads and in-app route transitions.
- Test query/tab navigation.
- Check console for browser errors.
- Check server logs for slow or duplicate queries.

Acceptance criteria:

- No loading spinner overlaps a nav icon.
- No route progress bar remains after visible route content is ready.
- No customer metric text clips or wraps awkwardly.
- No layout shift between skeleton and loaded content.
- All reviewed pages use the same card, tab, metric, and spacing system.

## Proposed Route Classification

Workbench pages:

- `/dashboard`
- `/customers`
- `/claims`
- `/watchlist`
- `/evidence-packages`
- `/reports`
- `/history`
- `/upload`
- `/chargebacks`

Detail pages:

- `/customers/[id]`
- `/audit/[runId]`
- evidence package detail routes
- claim detail routes
- transaction detail routes

Settings/store pages:

- Keep their current domain-specific content, but migrate the header, cards, spacing, and tabs to the canonical app primitives.

## Detailed Acceptance Checklist

Navigation and loading:

- Collapsed sidebar icons occupy fixed-size slots.
- Pending state does not add flex children that change nav item layout.
- Top progress bar is the only default route-level loading indicator.
- Inline spinners are reserved for local mutations and background operations.
- Pending state clears on path and query changes.
- Pending fail-safe is no longer 15 seconds.
- Same-route clicks do not start pending.

Layout:

- Every route is classified as Workbench, Detail, or Settings.
- Workbench pages use `WorkbenchPage`.
- Detail pages use `DetailPageShell`.
- Page gutters, max widths, section gaps, and title styles are consistent.
- Cards use 8px radius or less.
- Page sections are not styled as nested floating cards.

Components:

- One `PageHeader` implementation remains active.
- `components/common/PageHeader.tsx` is removed or made a compatibility wrapper with no direct route imports.
- Tables use `DataTable` or the canonical Workbench table wrapper.
- Tabs use one treatment.
- Metric cards have compact and regular variants with stable text behavior.

Reviewed pages:

- Audit Result has a compact detail header and metric strip.
- Audit Result tabs match the canonical tab system.
- Import History uses the shared table and clarified KPI scope.
- Reports overview uses shared cards and source badges.
- Customer Profile hero uses stable responsive metrics.
- Customer Profile right rail and main column use consistent section spacing.

Performance:

- App shell data is cached, streamed, or deferred where possible.
- Independent queries run in parallel.
- Heavy tab data is loaded only when visible.
- Skeletons mirror the final layout.

## Suggested Work Order

1. Fix the nav pending state first. It is isolated, user-visible, and will improve confidence immediately.
2. Add `DetailPageShell` and normalize header/card/tabs tokens before page migrations.
3. Migrate Customer Profile next because it has the most obvious layout breakage.
4. Migrate Audit Result after Customer Profile so both detail pages share the same shell.
5. Clean up Reports and Import History within Workbench.
6. Optimize server data loading and skeletons after the shells are stable.

## Risks and Notes

- Reducing loading indicators without improving real data fetch time can hide useful feedback. Keep the top progress bar, but make it accurate and short-lived.
- Migrating tokens should be done carefully because many components share global CSS classes.
- Customer Profile has the highest responsive risk because it contains long identifiers, dates, currency, action buttons, and a sticky rail.
- Audit Result and Reports share concepts such as match grades and source badges. Their color and badge logic should be centralized.
- Import History should remain dense and operational; the goal is consistency, not making it more decorative.

## Definition of Done

The implementation is complete when:

- The collapsed nav bug is fixed and verified in browser.
- Route pending indicators clear when content is visible.
- Audit Result and Customer Profile use the same detail shell.
- Reports and Import History use the same Workbench component language.
- The duplicate header systems are removed from active route usage.
- The supplied pages pass visual QA at the listed viewport sizes.
- No implementation introduces new one-off page-level spacing, tabs, metric cards, or loading spinners.
