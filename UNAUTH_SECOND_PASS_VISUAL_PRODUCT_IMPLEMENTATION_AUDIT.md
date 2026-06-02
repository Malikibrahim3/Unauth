# Unauth Second-Pass Visual Product Implementation Audit

Date: 2026-06-01

Scope: current post-Claude app only. The first audit is not treated as current truth.

Deliverable type: audit and implementation plan only. No product fixes are included in this pass.

## 1. Source Of Truth And Evidence

I inspected the current codebase, booted the already-running local app at `http://localhost:3000`, captured a populated merchant workspace and a fresh empty workspace, and ran TypeScript/build verification.

Fresh Playwright evidence is in:

- `second-pass-audit/capture_manifest.json`
- `second-pass-audit/screenshots/01_dashboard.png`
- `second-pass-audit/screenshots/02_customers_list.png`
- `second-pass-audit/screenshots/03_customer_dossier.png`
- `second-pass-audit/screenshots/04_customer_claim_review.png`
- `second-pass-audit/screenshots/05_reports_overview_query.png`
- `second-pass-audit/screenshots/06_reports_csv_query.png`
- `second-pass-audit/screenshots/07_reports_live_query.png`
- `second-pass-audit/screenshots/08_store_route.png`
- `second-pass-audit/screenshots/09_watchlist.png`
- `second-pass-audit/screenshots/10_evidence_packages.png`
- `second-pass-audit/screenshots/11_evidence_detail.png`
- `second-pass-audit/screenshots/12_upload_import_csv.png`
- `second-pass-audit/screenshots/13_import_history.png`
- `second-pass-audit/screenshots/14_settings_integrations.png`
- `second-pass-audit/screenshots/15_settings_shopify.png`
- `second-pass-audit/screenshots/16_settings_gorgias.png`
- `second-pass-audit/screenshots/17_settings_zendesk.png`
- `second-pass-audit/screenshots/18_inbox.png`
- `second-pass-audit/screenshots/19_claims.png`
- `second-pass-audit/screenshots/empty_01_dashboard.png`
- `second-pass-audit/screenshots/empty_02_customers.png`
- `second-pass-audit/screenshots/empty_03_reports_overview.png`
- `second-pass-audit/screenshots/empty_04_store.png`
- `second-pass-audit/screenshots/empty_05_watchlist.png`
- `second-pass-audit/screenshots/empty_06_upload.png`
- `second-pass-audit/screenshots/empty_07_history.png`
- `second-pass-audit/screenshots/empty_08_settings_integrations.png`

Verification results:

- `npm exec tsc -- --noEmit --pretty false` failed.
- `npm run build` compiled JS successfully, then failed TypeScript.
- Blocking error: `app/api/shopify/disconnect/route.ts:30` uses `action: 'disconnect_shopify'`, which is not assignable to `AuditAction`.
- Reports overview screenshot logged one browser console error: `Failed to load resource: the server responded with a status of 500 (Internal Server Error)`.

Seed-state check:

- The populated merchant has useful customers and claims.
- The fresh merchant shows empty/setup flows.
- Existing audit seed data still writes watchlist rows under the auth user id, while the current app reads watchlist rows by merchant id. This makes the populated Watchlist render as empty even though seeded profiles show `on_watchlist`.

## 2. Executive Summary

Claude improved a lot. The app no longer feels like only a CSV uploader. It now has clearer setup states, a stronger Shopify/helpdesk connection model, a real Store overview, source-labelled Reports tabs, a more serious Settings -> Integrations page, and more operational customer/claim surfaces.

The app is still not demo-ready as a premium B2B fraud/identity cockpit. The main problem is not only missing polish; it is product hierarchy. The strongest story should be "Shopify orders + helpdesk claims become an identity and dispute cockpit." Instead, the first impression still leans toward cards, tables, sparse lists, and CSV import affordances. The product has the right nouns now, but not yet enough "cockpit" behavior.

Highest-risk pre-demo issues:

1. Production build currently fails TypeScript.
2. `/inbox` and `/claims` captured as redirects to `/customers`, so the helpdesk workflow is not reliably reachable in the current demo account.
3. The Dashboard has almost no charting and a lot of empty space.
4. Customer detail has visible metric overflow in the hero.
5. Watchlist renders empty despite seeded watchlisted profiles because legacy/seeded rows are still under `user.id`.
6. Reports overview emits a 500 resource error.
7. CSV remains too prominent in primary actions, sidebar, dashboard, reports, history, and empty-state escape hatches.
8. Helpdesk is framed as "not connected" but not yet as the second half of the core product experience.

## 3. What Claude Improved

### 3.1 Setup And Data Presence

Claude introduced a more coherent connection/data model:

- `lib/supabase/getMerchantDataPresence.ts` now counts multiple workspace data sources, including customer profiles, audit transactions, CSV imports, Shopify order signals, merchant claims, support cases, evidence packages, watchlist entries, and customer activity.
- `lib/connections/getMerchantSetupState.ts` defines explicit setup states such as `fresh`, `shopify_only_with_data`, `csv_only`, and `fully_connected_with_data`.
- `components/connections/PageConnectionGate.tsx` now avoids full-gating useful data when a merchant is partially connected.

This is a major improvement over binary "connected or empty" behavior.

Remaining issue: the full-gate state list includes `fully_connected_empty`, which may be too harsh for a merchant that connected both sources but is waiting for sync. That state should likely become a sync/progress empty state, not a connect gate.

### 3.2 Empty And Partial Setup States

The empty Dashboard now clearly says:

- Connect Shopify and your helpdesk to get started.
- Shopify provides order data.
- Gorgias or Zendesk provides claim history.
- CSV is optional.

Relevant files:

- `components/EmptyDashboardHero.tsx`
- `components/PartialSetupHero.tsx`
- `components/connections/ConnectionPromptStrip.tsx`
- `components/connections/PageConnectionGate.tsx`

This is one of the best Claude improvements. The empty Dashboard finally teaches the product model.

Remaining issue: the illustration is static and card-like. It does not yet feel like a premium live cockpit. It should preview the actual operating loop: new order -> identity match -> helpdesk claim -> evidence package -> decision.

### 3.3 Integrations Page

Settings -> Integrations is now much better:

- `app/(app)/settings/integrations/page.tsx` frames two required sources.
- `components/settings/OrderSourceClient.tsx` puts Shopify in the order-source lane.
- `components/settings/ApiIntegrationsClient.tsx` treats Gorgias and Zendesk as helpdesk options under one requirement.
- API keys are moved under "Advanced", which is the right hierarchy.

This page is now directionally correct.

Remaining issue: it still feels like a settings form, not the activation center of the product. The "Required sources" section should become the canonical two-source setup map and should show exactly what each source unlocks in Dashboard, Customers, Claims, Reports, and Evidence.

### 3.4 Store Overview

`app/(app)/store/page.tsx` is no longer just a redirect to an audit job. It now renders a Shopify-centric overview with source completeness, sync health, and store data detected.

This was necessary and is a clear improvement.

Remaining issue: it is still mostly KPI cards and source checklist. It needs at least one real store-level visual: orders synced over time, claim rate by week, top matched identities, source freshness timeline, or dispute exposure.

### 3.5 Reports Separation

`app/(app)/reports/page.tsx` now separates:

- Overview
- CSV audits
- Live reports

It uses source tags and starts to make CSV secondary.

Remaining issue: the visual result is still list-heavy, and the overview leads with CSV audit counts. The page has charts buried in tabs, while the overview should lead with visual trends and source health.

### 3.6 Customer And Claim Surfaces

The Customer detail and claim-review route now contain much more domain-specific material:

- Customer identity grade.
- Cross-merchant context.
- Claim summary.
- Evidence package action.
- Claim decision workflow.
- Event timeline.
- Merchant ownership controls.

This is much closer to the intended product.

Remaining issue: the detail page is visually overloaded and has a hero layout bug; the claim route is useful but not obviously part of the main navigation/workflow.

## 4. What Still Feels Weak

### 4.1 The App Does Not Yet Feel Like A Cockpit

The desired product is a premium B2B fraud/identity cockpit. A cockpit should answer, at a glance:

- What is happening right now?
- What changed since yesterday/last week?
- Which identities need action?
- What is the money at risk?
- Which source is missing or stale?
- What should the operator do next?

The current app mostly answers:

- How many rows exist?
- Which table can I browse?
- Which integration is missing?
- Which CSV files were imported?

The product has the data vocabulary, but the first screen still lacks command-center visuals.

Next implementation should add charts/graphs to overviews, especially:

- Dashboard: risk/claim trend, source freshness, exposure at risk, queue funnel.
- Store overview: Shopify orders over time, claims by source/status, refund/claim rate trend.
- Customers: risk distribution, watchlist resurfacing, identity grade breakdown.
- Reports overview: live-vs-CSV source split, match rate trend, claims funnel.
- Evidence packages: readiness distribution and dispute outcome/recovery visual.

### 4.2 The UI Is Still Table-Heavy

Tables are appropriate for repeated operational work, but too many pages rely on tables/lists as the primary experience:

- Customers list.
- Evidence packages.
- Import history.
- Recent CSV audits.
- Claims list when reachable.
- Watchlist roster.

The app needs more overview composition before tables. Tables should be the drill-down, not the top-level proof of value.

### 4.3 CSV Is Still Too Prominent

CSV is better labelled as secondary, but it still appears too often:

- Sidebar has a dedicated "Data import" group with "Upload CSV" visible at all times.
- Dashboard primary area still shows an "Import CSV" action in partial setup.
- Customers page shows "Import CSV" in the page action row.
- Upload and Import history are polished enough to feel like core product surfaces.
- Reports overview still leads with "CSV audits 8" and recent CSV audit cards.
- Empty Dashboard still offers "Upload CSV" as an escape hatch.

CSV should remain available, but the demo should make it feel like historical backfill, not the product center.

### 4.4 Shopify + Helpdesk Is Stronger, But Not Strong Enough

The app now says Shopify + helpdesk repeatedly. It does not yet show enough of the combined intelligence.

Current pattern:

- Shopify connected.
- Helpdesk not connected.
- Claim data missing.
- Connect helpdesk.

Desired pattern:

- Shopify order arrives.
- Helpdesk claim arrives.
- Unauth links them to identity.
- Operator sees risk, evidence, next decision, and recovery impact.

The UI should show "why the pair matters" through product artifacts, not only banners.

### 4.5 Routes And Navigation Are Disconnected

Observed routes:

- `/inbox` captured as final URL `/customers`.
- `/claims` captured as final URL `/customers`.
- Sidebar does not list Inbox or Claims.
- Workbench subnav omits Inbox by default and only Claims adds itself locally.

This weakens the helpdesk core pair. If claims are one of the two core sources, the claim queue must be a first-class workflow.

Relevant files:

- `components/nav/Sidebar.tsx`
- `components/workbench/workbenchNavItems.ts`
- `app/(app)/layout.tsx`
- `app/(app)/inbox/page.tsx`
- `app/(app)/claims/page.tsx`
- `lib/permissions/index.ts`

## 5. Highest ROI Fixes Before Demo

### P0. Make The App Build

Problem:

- `npm exec tsc -- --noEmit --pretty false` fails.
- `npm run build` fails after compile during TypeScript.

Error:

- `app/api/shopify/disconnect/route.ts:30`
- `action: 'disconnect_shopify'` is not assignable to `AuditAction`.

Implementation target:

- Either add `disconnect_shopify` to the `AuditAction` union/source of truth, or change the action to an existing valid audit action.
- Add a narrow test or type-level coverage if audit actions have a registry.

Acceptance:

- `npm exec tsc -- --noEmit --pretty false` passes.
- `npm run build` passes.

### P0. Make Claims And Inbox Reachable

Problem:

- Playwright captured `/inbox` at final URL `/customers`.
- Playwright captured `/claims` at final URL `/customers`.
- Sidebar does not expose either route.
- This makes the helpdesk side of the core product disappear during demo.

Implementation target:

- Decide whether the main operational queue is Inbox, Claims, or a combined "Claims" surface.
- Put it in the sidebar under Review.
- Put counts/badges in the shell.
- Ensure owner/demo account can access the route.
- Keep empty/partial states visible when helpdesk is missing, instead of redirecting to Customers.

Files to change:

- `components/nav/Sidebar.tsx`
- `app/(app)/layout.tsx`
- `components/workbench/workbenchNavItems.ts`
- `app/(app)/inbox/page.tsx`
- `app/(app)/claims/page.tsx`
- `lib/permissions/index.ts`

Acceptance:

- `/claims` loads a Claims page for the populated seeded account.
- `/inbox` either loads a real page or permanently redirects to the chosen canonical claim queue with a clear route decision.
- Sidebar includes the chosen queue.
- Helpdesk-missing state still explains what would appear there.

### P0. Fix Customer Detail Hero Overflow

Problem:

- `second-pass-audit/screenshots/03_customer_dossier.png` shows the hero metric strip clipping text.
- "2 merchants" is cut to "2 mercha".
- The order value is visibly clipped.

Likely source:

- `app/(app)/customers/[id]/page.tsx`, especially the hero grid at lines around 626-723.
- The right metric grid uses `lg:grid-cols-[minmax(0,1fr)_minmax(560px,0.9fr)]` and `md:grid-cols-5` with `t-display` text.

Implementation target:

- Replace the five-column metric grid with a responsive summary module that has stable min widths and wraps cleanly.
- Use compact metric typography inside hero panels.
- Do not allow long values to clip.

Acceptance:

- Customer detail at 1440 px, 1280 px, and tablet width has no clipped metric text.
- Long currency, "This store only", and multi-merchant labels wrap or resize cleanly.

### P0. Fix Watchlist Tenancy/Seed Mismatch

Problem:

- UI shows Watchlist empty.
- Current DB check for seeded merchant showed `watchlist_entries` count by merchant id = 0 and by auth user id = 3.
- Seeded customer profiles show `on_watchlist = true`, but the Watchlist page reads `watchlist_entries.merchant_id = ctx.merchantId`.

Important nuance:

- The current product code appears directionally corrected to merchant id in `app/(app)/watchlist/page.tsx` and `app/api/watchlist/route.ts`.
- The seed/demo data and/or legacy migration path still leaves entries under `user.id`.

Files to change:

- `design-audit/seed-audit-data.mjs` lines around 917-930.
- Any demo seed scripts still writing `watchlist_entries.merchant_id = userId`.
- Migration/backfill for existing legacy rows if needed.
- `app/(app)/layout.tsx` should pass a real watchlist count to `Sidebar`.

Acceptance:

- Populated demo Watchlist shows the seeded watched identities.
- Sidebar badge can show non-zero watchlist count.
- Adding/removing watchlist entries stays merchant-scoped.

### P0. Resolve Reports Overview 500

Problem:

- Reports overview renders, but Playwright recorded a 500 resource error on `/reports?tab=overview`.

Files to investigate:

- `app/(app)/reports/page.tsx`
- `components/reports/ExportMenu.tsx`
- API routes called by export/report controls.
- Server logs for the 500 request during reports load.

Acceptance:

- Reports overview loads with zero browser console errors.
- No 500s during initial page render.

### P1. Replace Sparse Dashboard With Cockpit Overview

Problem:

- `second-pass-audit/screenshots/01_dashboard.png` has five KPI cards, one attention item, right rail cards, and a lot of blank space.
- There are no meaningful charts or trend visuals.
- The page does not yet feel premium or operational.

Implementation target:

Create a real dashboard composition:

- Top row: source health, active queue, exposure at risk, evidence ready.
- Main left: "Risk and claims trend" chart over time.
- Main right: "Next best actions" queue with customer/claim/evidence context.
- Secondary: "Identity grade distribution" and "source freshness".
- CSV/backfill becomes a small secondary affordance.

Files to change:

- `app/(app)/dashboard/page.tsx`
- `components/dashboard/InsightsStrip.tsx`
- `components/dashboard/NextUpPanel.tsx`
- `components/dashboard/SavingsCard.tsx`
- Add small chart components, preferably using existing `recharts` or existing SVG style.

Acceptance:

- First viewport contains at least one trend chart and one action queue.
- CSV is not the dominant call-to-action.
- Partial setup still shows real Shopify data with claim context clearly marked incomplete.

### P1. Make Reports Overview Visual, Not List-First

Problem:

- Reports overview leads with CSV counts and recent CSV audit list.
- Live reports tab has a stronger claims metrics layout, but overview does not summarize the product's live value.

Implementation target:

- Overview should show "source coverage" and "business outcome" first.
- CSV audits should remain a tab and a small source card.
- Put match rate trend, claims funnel, and live source freshness on overview.

Files to change:

- `app/(app)/reports/page.tsx`
- `components/reports/ExportMenu.tsx`
- New report chart components if needed.

Acceptance:

- Overview first viewport has at least two visual summaries.
- CSV list is below the fold or inside CSV tab.
- Live reports are visually equal or stronger than CSV.

### P1. Demote CSV In Shell And Page Actions

Problem:

- "Upload CSV" is constantly visible in the sidebar.
- Dashboard, Customers, Store, Reports, and empty states repeatedly expose CSV.

Implementation target:

- Rename sidebar group to "Backfill" or "Imports".
- Rename "Upload CSV" to "Historical import" or "Import history" depending on destination.
- On Dashboard and Customers, make CSV a tertiary action or overflow action.
- On empty states, keep CSV as "Explore with CSV" after the Shopify/helpdesk CTA.

Files to change:

- `components/nav/Sidebar.tsx`
- `app/(app)/dashboard/page.tsx`
- `app/(app)/customers/page.tsx`
- `app/(app)/store/page.tsx`
- `app/(app)/upload/page.tsx`
- `app/(app)/history/page.tsx`
- `components/EmptyDashboardHero.tsx`
- `components/PartialSetupHero.tsx`

Acceptance:

- Shopify/helpdesk is the primary product path everywhere.
- CSV appears as historical backfill, not core workflow.

### P1. Improve Store Overview With Shopify-Specific Charts

Problem:

- Store overview is now real, but it still reads like setup cards.

Implementation target:

- Add Shopify order volume trend.
- Add claims/refunds trend if helpdesk exists; otherwise show the placeholder trend with missing-helpdesk state.
- Add source freshness timeline: Shopify sync, helpdesk sync, last import.
- Add top identity clusters from this store.

Files to change:

- `app/(app)/store/page.tsx`
- `lib/customers/commerceOrders.ts`
- `lib/supabase/getMerchantDataPresence.ts`
- New store chart component if needed.

Acceptance:

- Store overview feels like the Shopify home for Unauth, not a settings checklist.

### P1. Rework Customers List Into A Review Cockpit

Problem:

- Customers list is dense and useful, but still table-first.
- KPI strip uses current-page counts for some values, which can mislead.
- Saved views are helpful but visually secondary.

Implementation target:

- Add a compact review overview above the table:
  - grade distribution
  - watchlisted resurfacing
  - high-risk customer count
  - claims missing/incomplete indicator when helpdesk is absent
- Keep table, but make it the drill-down.
- Ensure KPI labels make clear whether they are all-results or current-page counts.

Files to change:

- `app/(app)/customers/page.tsx`
- `components/customers/CustomersTableClient.tsx`
- `components/customers/CustomersFilterSheet.tsx`

Acceptance:

- First viewport explains the customer risk shape, not only row count.
- Table remains efficient and stable.

### P1. Make Evidence Packages Less Table-Only

Problem:

- Evidence packages page is a KPI strip plus table.
- It does not yet communicate readiness, dispute value, CE3 readiness, or missing evidence visually.

Implementation target:

- Add readiness distribution.
- Add evidence strength/readiness funnel.
- Add "packages needing completion" as next actions.
- Keep table below.

Files to change:

- `app/(app)/chargebacks/page.tsx`
- `app/(app)/chargebacks/[id]/page.tsx`
- `components/evidence/EvidenceStrengthMeter.tsx`
- `components/evidence/DisputeReadinessPanel.tsx`

Acceptance:

- Evidence page feels like a dispute operations surface, not only an artifact list.

## 6. Page-By-Page Current Findings

### 6.1 Dashboard

Screenshot: `second-pass-audit/screenshots/01_dashboard.png`

What works:

- Shopify connection is visible in the header.
- Helpdesk missing state is clear.
- CSV is described as secondary in copy.
- KPI card vocabulary is better: customers monitored, orders synced, identity matches, claims needing action, evidence ready.

What still feels weak:

- No chart/graph in the first viewport.
- Huge blank area under Attention queue.
- Right rail is fragmented.
- The primary "cockpit" question is unanswered: what changed and what should I act on?
- "Import CSV" remains a visible top action.

Highest ROI change:

- Replace the sparse center with one trend chart and one action queue.

Implementation files:

- `app/(app)/dashboard/page.tsx`
- `components/dashboard/*`
- `lib/claims/reporting.ts`
- `lib/supabase/merchantHelpers.ts`

### 6.2 Customers List

Screenshot: `second-pass-audit/screenshots/02_customers_list.png`

What works:

- Much denser and more B2B-operational than before.
- Saved views and filters make it feel usable.
- Shopify partial setup warning is clear.

What still feels weak:

- Still primarily a table.
- "Import CSV" is too visible.
- KPIs mix all-customer and current-page concepts.
- No risk distribution, no trend, no visible helpdesk impact beyond warning copy.

Highest ROI change:

- Add a compact "customer risk overview" row before the table.

Implementation files:

- `app/(app)/customers/page.tsx`
- `components/customers/CustomersTableClient.tsx`
- `components/workbench/WorkbenchKpiStrip.tsx`

### 6.3 Customer Detail / Dossier

Screenshot: `second-pass-audit/screenshots/03_customer_dossier.png`

What works:

- The page has the right job: a customer dossier.
- It includes identity grade, cross-merchant context, claim summary, evidence action, and status workflow.
- It clearly points back to Gorgias/Zendesk and Shopify disputes.

What still feels weak:

- Hero metric strip visibly clips text.
- It is visually busy.
- The strongest evidence narrative is not yet the first thing the eye sees.
- Too much of the page reads as stacked panels and tables.

Highest ROI change:

- Rebuild the hero as a stable dossier summary with no clipping, then put "why this customer matters" above raw details.

Implementation files:

- `app/(app)/customers/[id]/page.tsx`
- `components/customers/CaseSummaryStrip.tsx`
- `components/customers/BehaviorRoadmap.tsx`
- `components/customers/IdentityTimeline.tsx`

### 6.4 Customer Claim Review Route

Screenshot: `second-pass-audit/screenshots/04_customer_claim_review.png`

What works:

- This is one of the more product-specific screens.
- It has claim context, identity confidence, cross-merchant signal context, timeline, and merchant decision workflow.
- The right-hand decision panel is clear.

What still feels weak:

- It is not first-class in app navigation.
- It is unclear how operators enter this workflow other than from customer detail.
- The page could use stronger visual prioritization of next action, evidence sufficiency, and money at risk.

Highest ROI change:

- Make Claims/Inbox reachable and put this route in a visible queue loop.

Implementation files:

- `app/(app)/customers/[id]/claims/page.tsx`
- `components/claims/ClaimReviewPanel.tsx`
- `app/(app)/claims/page.tsx`
- `app/(app)/inbox/page.tsx`

### 6.5 Reports

Screenshots:

- `second-pass-audit/screenshots/05_reports_overview_query.png`
- `second-pass-audit/screenshots/06_reports_csv_query.png`
- `second-pass-audit/screenshots/07_reports_live_query.png`

What works:

- Reports are now source-labelled.
- CSV and live reports are separated.
- Live reports tab has useful operational claim metrics.
- There are some visual elements: trend SVG, grade distribution, funnel bars.

What still feels weak:

- Overview still leads with CSV count and CSV audit cards.
- The best visual work is hidden in tabs, not in the overview.
- A 500 resource error appears during overview capture.
- "CSV audits" tab has more obvious substance than live reporting in the overview.

Highest ROI change:

- Make overview a visual executive cockpit: source coverage, live claim trend, match rate, exposure at risk.

Implementation files:

- `app/(app)/reports/page.tsx`
- `components/reports/ExportMenu.tsx`
- `lib/claims/reporting.ts`

### 6.6 Store Overview

Screenshot: `second-pass-audit/screenshots/08_store_route.png`

What works:

- `/store` is now a real page.
- Shopify-first framing is present.
- Source completeness is clear.
- It uses data presence from Shopify, imports, claims, evidence, and watchlist.

What still feels weak:

- No Shopify-specific chart.
- Store view still feels like a setup/status page.
- Claims show as tracked even though the global connection state says helpdesk not connected; this needs copy/data nuance so demo users do not distrust the state.

Highest ROI change:

- Add store-level time-series and source freshness visuals.

Implementation files:

- `app/(app)/store/page.tsx`
- `lib/supabase/getMerchantDataPresence.ts`
- `lib/customers/commerceOrders.ts`

### 6.7 Watchlist

Screenshot: `second-pass-audit/screenshots/09_watchlist.png`

What works:

- Page framing is better: "Identities you're actively monitoring."
- Empty-state copy explains the purpose.

What still feels weak:

- It shows zero monitored identities in the populated seeded account.
- Seeded DB has watchlist rows under auth user id, not merchant id.
- Sidebar badge does not receive a count from layout.
- Without resurfaced identities, the page feels disconnected from the risk cockpit.

Highest ROI change:

- Fix seed/backfill, then make Watchlist show resurfacing as an active monitoring surface.

Implementation files:

- `design-audit/seed-audit-data.mjs`
- `scripts/*seed*`
- `app/(app)/watchlist/page.tsx`
- `app/(app)/layout.tsx`
- `components/nav/Sidebar.tsx`

### 6.8 Evidence Packages

Screenshots:

- `second-pass-audit/screenshots/10_evidence_packages.png`
- `second-pass-audit/screenshots/11_evidence_detail.png`

What works:

- Evidence package vocabulary is much clearer.
- Detail page has provenance, checklist, prior match detail, summary narrative, identity evidence, merchant notes.
- Notes query in `lib/evidence/buildPackage.ts` is now merchant-scoped and excludes deleted notes.

What still feels weak:

- List page is a table with KPIs.
- It lacks a visual evidence readiness model.
- It does not yet show "what should be completed before dispute submission."

Highest ROI change:

- Add readiness/strength distribution and action queue.

Implementation files:

- `app/(app)/chargebacks/page.tsx`
- `app/(app)/chargebacks/[id]/page.tsx`
- `components/evidence/DisputeReadinessPanel.tsx`
- `components/evidence/EvidenceStrengthMeter.tsx`

### 6.9 Upload / Import CSV

Screenshot: `second-pass-audit/screenshots/12_upload_import_csv.png`

What works:

- The upload flow is polished and functional-looking.
- Copy now says CSV is optional and live sources are primary.

What still feels weak:

- The page is too polished relative to its intended secondary role.
- It still feels like a core app destination.
- The large upload area dominates the experience.

Highest ROI change:

- Keep it useful, but rename and demote it to historical backfill.

Implementation files:

- `app/(app)/upload/page.tsx`
- `components/upload/UploadClient.tsx`
- `components/nav/Sidebar.tsx`

### 6.10 Import History

Screenshot: `second-pass-audit/screenshots/13_import_history.png`

What works:

- It is clear and operational.
- It handles empty state correctly.

What still feels weak:

- It reinforces CSV as a major app lane.
- "Rows processed" and "Matched" feel like old CSV audit metrics, not live B2B operations.

Highest ROI change:

- Rename and tuck under Backfill.

Implementation files:

- `app/(app)/history/page.tsx`
- `components/nav/Sidebar.tsx`
- `components/workbench/workbenchNavItems.ts`

### 6.11 Settings / Integrations

Screenshots:

- `second-pass-audit/screenshots/14_settings_integrations.png`
- `second-pass-audit/screenshots/15_settings_shopify.png`
- `second-pass-audit/screenshots/16_settings_gorgias.png`
- `second-pass-audit/screenshots/17_settings_zendesk.png`

What works:

- Stronger required-source model.
- Shopify, Gorgias, and Zendesk are all visible.
- API keys are below Advanced.
- Gorgias and Zendesk setup screens communicate sidebar/ticket usage.

What still feels weak:

- The setup page is still more settings-like than activation-like.
- Shopify connected but "106 orders synced / 0 scored" can feel broken unless explained.
- Gorgias page is credential-heavy.
- Zendesk page is app-download-heavy but not connected back to claims and identity workflow strongly enough.

Highest ROI change:

- Turn Integrations into "Live sources" activation with unlock previews.

Implementation files:

- `app/(app)/settings/integrations/page.tsx`
- `components/settings/OrderSourceClient.tsx`
- `components/settings/ApiIntegrationsClient.tsx`
- `components/settings/GorgiasSetupClient.tsx`
- `components/settings/ZendeskSetupClient.tsx`
- `app/(app)/settings/integrations/shopify/page.tsx`

### 6.12 Empty States

Screenshots:

- `second-pass-audit/screenshots/empty_01_dashboard.png`
- `second-pass-audit/screenshots/empty_02_customers.png`
- `second-pass-audit/screenshots/empty_03_reports_overview.png`
- `second-pass-audit/screenshots/empty_04_store.png`
- `second-pass-audit/screenshots/empty_05_watchlist.png`
- `second-pass-audit/screenshots/empty_06_upload.png`
- `second-pass-audit/screenshots/empty_07_history.png`
- `second-pass-audit/screenshots/empty_08_settings_integrations.png`

What works:

- Dashboard empty state is much better.
- Customers and Reports full gates now explain why both sources matter.
- Store empty state correctly offers Shopify/helpdesk first and CSV second.

What still feels weak:

- Empty Watchlist is reachable even when no integrations are connected, which may be okay, but it lacks a setup-aware explanation.
- Empty Upload and History still feel like major setup paths.
- Empty Dashboard could use a more premium product preview and less static card illustration.

Highest ROI change:

- Use a consistent source/setup state system across every empty page, with CSV as the secondary exploration path.

Implementation files:

- `components/EmptyDashboardHero.tsx`
- `components/PartialSetupHero.tsx`
- `components/connections/PageConnectionGate.tsx`
- `app/(app)/store/page.tsx`
- `app/(app)/watchlist/page.tsx`
- `app/(app)/upload/page.tsx`
- `app/(app)/history/page.tsx`

## 7. Visual System And Layout Audit

### 7.1 Charts And Graphs Are Underused

The app already has `recharts` and custom SVG chart patterns, but the current main overview pages do not use them enough.

Add charts where they answer operator questions:

- Dashboard: claims/risk trend, source freshness, queue funnel.
- Store: Shopify orders synced, claims rate, refund value.
- Customers: grade distribution, high-risk trend, watchlist resurfacing.
- Reports: match rate trend and live-vs-CSV source coverage in overview.
- Evidence: readiness distribution and package completion status.

Avoid decorative charts. Every chart must answer a business question and link to the drill-down.

### 7.2 Cards Are Overused

The UI leans on repeated cards inside larger panels. It looks tidy but can feel dated and modular in a generic SaaS way.

Next pass should:

- Use more full-width operational bands.
- Use chart + queue layouts.
- Reduce nested cards.
- Keep cards for repeated records, modals, and clear metric tiles.

### 7.3 Tables Need Better Previews

Tables are useful after context. Most pages should begin with:

- A visual summary.
- A ranked action list.
- A source completeness state.
- Then the table.

### 7.4 Typography And Overflow

Critical visible issue:

- Customer detail metric grid clips large text.

Broader rule:

- Use compact headings inside cards.
- Do not use display-scale numbers in narrow grid cells.
- Set stable min/max widths and allow wrapping.

### 7.5 Color

The current authenticated app mostly respects the warm copper/neutral palette. Remaining concerns:

- `lib/utils/investigationStatus.ts` still has blue fallback values for `under_review`.
- Some product icons/tints read blue-grey, but not enough to violate the color direction.
- Public/landing gradients are outside this authenticated cockpit audit unless reused in-app.

Do not introduce blue/purple SaaS gradients in the next polish pass.

## 8. Security And Data-Correctness Regression Check

This was not a full security audit, but I checked the specific regressions that affect product trust.

### 8.1 Evidence Notes Scoping Looks Improved

`lib/evidence/buildPackage.ts` now filters merchant notes by:

- `merchant_id = merchantId`
- `customer_profile_id = customerProfileId`
- `deleted_by_merchant = false`

That addresses the specific evidence-note cross-merchant leak risk in implementation code.

Remaining caveat:

- Some seed scripts still insert notes under `userId`, so demo notes may not line up with merchant-scoped reads unless seeds are updated/backfilled.

### 8.2 Watchlist Product State Is Still Inconsistent

Implementation code now generally reads/writes watchlist rows by `ctx.merchantId`.

However, current seeded data still has legacy rows under `user.id`. That causes:

- Customer list shows watchlisted profiles.
- Watchlist page shows zero watched identities.

This is both a demo problem and a data migration problem.

### 8.3 Claim Route No Longer 500s In Current Capture

The customer claim review route captured successfully:

- `/customers/52b9005d-819a-4c6d-b852-10498cc9c75c/claims`

This is improved versus the earlier observation.

Remaining issue:

- `/claims` and `/inbox` did not remain on their own pages in the current capture. That is now the bigger workflow issue.

### 8.4 Public Audits Are Excluded From Data Presence

`lib/supabase/getMerchantDataPresence.ts` explicitly excludes `public_audits` from merchant workspace data until claimed/re-tenanted. That is correct.

Remaining check for implementation model:

- Verify public audit claim/finalize flows re-tenant every downstream row before those rows appear in authenticated workspace surfaces.

### 8.5 Build Failure Blocks Demo Confidence

The current codebase cannot pass TypeScript/build because of the Shopify disconnect audit action. This should be fixed before visual polish work proceeds.

## 9. Implementation Map By Priority

### P0 Before Any Demo

1. Fix TypeScript/build blocker.
2. Make Claims/Inbox reachable and first-class.
3. Fix customer detail hero overflow.
4. Fix watchlist seed/migration mismatch.
5. Investigate Reports 500.

### P1 High-ROI Visual Product Pass

1. Rebuild Dashboard as chart + action cockpit.
2. Make Reports overview visual and live-source-led.
3. Add Shopify-specific charts to Store overview.
4. Add Customers overview visuals before table.
5. Demote CSV in sidebar and page actions.

### P2 Deeper Polish

1. Evidence readiness visualization.
2. Helpdesk setup activation previews.
3. Consistent empty/setup states across Watchlist, Upload, History, Claims, and Reports.
4. Sidebar counts and nav badges.
5. Remove remaining blue fallbacks.

## 10. Files The Next Implementation Model Should Change

Build and correctness:

- `app/api/shopify/disconnect/route.ts`
- `lib/permissions/audit.ts`
- Any file defining the `AuditAction` type/registry

Navigation and core workflow:

- `components/nav/Sidebar.tsx`
- `app/(app)/layout.tsx`
- `components/workbench/workbenchNavItems.ts`
- `app/(app)/inbox/page.tsx`
- `app/(app)/claims/page.tsx`
- `lib/permissions/index.ts`

Dashboard cockpit:

- `app/(app)/dashboard/page.tsx`
- `components/dashboard/InsightsStrip.tsx`
- `components/dashboard/NextUpPanel.tsx`
- `components/dashboard/SavingsCard.tsx`
- `lib/claims/reporting.ts`
- `lib/supabase/merchantHelpers.ts`

Customer intelligence:

- `app/(app)/customers/page.tsx`
- `components/customers/CustomersTableClient.tsx`
- `components/customers/CustomersFilterSheet.tsx`
- `app/(app)/customers/[id]/page.tsx`
- `components/customers/CaseSummaryStrip.tsx`
- `components/customers/BehaviorRoadmap.tsx`
- `components/customers/IdentityTimeline.tsx`

Reports and charts:

- `app/(app)/reports/page.tsx`
- `components/reports/ExportMenu.tsx`
- New chart components under `components/reports/` or `components/dashboard/`

Store overview:

- `app/(app)/store/page.tsx`
- `lib/customers/commerceOrders.ts`
- `lib/supabase/getMerchantDataPresence.ts`

Watchlist:

- `app/(app)/watchlist/page.tsx`
- `app/api/watchlist/route.ts`
- `app/api/watchlist/[id]/route.ts`
- `design-audit/seed-audit-data.mjs`
- Demo/realistic seed scripts that still write `watchlist_entries.merchant_id = userId`

Evidence:

- `app/(app)/chargebacks/page.tsx`
- `app/(app)/chargebacks/[id]/page.tsx`
- `components/evidence/DisputeReadinessPanel.tsx`
- `components/evidence/EvidenceStrengthMeter.tsx`

CSV demotion:

- `app/(app)/upload/page.tsx`
- `components/upload/UploadClient.tsx`
- `app/(app)/history/page.tsx`
- `components/EmptyDashboardHero.tsx`
- `components/PartialSetupHero.tsx`

Integrations:

- `app/(app)/settings/integrations/page.tsx`
- `app/(app)/settings/integrations/shopify/page.tsx`
- `components/settings/OrderSourceClient.tsx`
- `components/settings/ApiIntegrationsClient.tsx`
- `components/settings/GorgiasSetupClient.tsx`
- `components/settings/ZendeskSetupClient.tsx`

Visual color cleanup:

- `lib/utils/investigationStatus.ts`
- `lib/evidence/pdf.tsx`

## 11. Acceptance Checklist For The Next Implementation Pass

The next implementation pass is complete only when:

- TypeScript and production build pass.
- `/claims` or the chosen claim queue is first-class in sidebar navigation.
- `/inbox` has an intentional route decision: real page or redirect to canonical queue.
- Dashboard first viewport has at least one meaningful chart and one action queue.
- Reports overview has live-source visual summaries and no 500s.
- Customer detail hero has no clipped text at desktop/tablet widths.
- Watchlist shows seeded watched identities for the populated demo account.
- CSV is consistently described as historical backfill and is not a primary product CTA except on the import page.
- Store overview includes a Shopify-specific visual trend.
- Empty states consistently lead with Shopify + helpdesk, with CSV as secondary.
- Visual QA screenshots exist for populated and empty states.

## 12. Bottom Line

Claude moved the product in the right direction: the app now understands Shopify + helpdesk as the core pair and CSV as secondary. The remaining work is to make that product truth visible in layout, navigation, and charts.

Before demo, fix build, route accessibility, hero overflow, watchlist data mismatch, and reports 500. Then spend the main visual polish pass on Dashboard, Reports, Store, and Customer detail. Those four pages will determine whether Unauth feels like a premium fraud/identity cockpit or a well-organized set of SaaS tables.
