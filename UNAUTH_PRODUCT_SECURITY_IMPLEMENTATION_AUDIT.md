# Unauth Product and Security Implementation Audit

Date: 2026-06-01

Scope: Next.js app, Supabase data model, authenticated product pages, public audit flow, integrations, tenant isolation, data-state handling, and visual/product readiness. This audit treats the current working tree as the observed product state. Several recent UI/data-state changes are already present, but they are partial and must not be considered complete.

Non-negotiable product constraint: keep the existing Unauth palette and brand colors. The app should be rebuilt around those colors, not recolored. External integration logos can keep their brand colors, but product UI controls should stay inside the Unauth system.

## Evidence Used

Populated test data was seeded with `node design-audit/seed-audit-data.mjs`.

Observed populated seed:

- Merchant: `aurora outfitters`
- Customers: 12 newly seeded in this pass, 18 visible profiles in the app due existing test data
- Claims: 22
- Jobs: 5 newly seeded in this pass, 8 visible processing jobs due existing test data
- Evidence packages: 4

Empty state was captured using a fresh merchant with setup complete and no customer/order/claim data.

Key screenshots:

- Populated dashboard: `design-audit/screenshots/01_dashboard_overview.png`
- Empty dashboard: `design-audit/screenshots/empty_01_dashboard.png`
- Populated customers: `design-audit/screenshots/03_customers_list.png`
- Empty customers: `design-audit/screenshots/empty_02_customers.png`
- Store empty state: `design-audit/screenshots/empty_03_store.png`
- Reports capture: `design-audit/screenshots/07_reports.png`
- Watchlist: `design-audit/screenshots/09_watchlist_loaded.png`
- Evidence packages: `design-audit/screenshots/12_evidence_packages.png`
- Settings integrations: `design-audit/screenshots/13_settings_integrations_shopify.png`
- Empty integrations: `design-audit/screenshots/empty_08_settings_integrations.png`

Captured issue during visual QA:

- `GET /customers/[id]/claims` logged a 500 while the route still rendered a claim review page with `Failed to mark claim viewed`. This must be fixed before the claim review workflow is considered production-ready.

## Executive Summary

Unauth has the right raw ingredients for a serious B2B fraud and identity intelligence product: merchant-scoped helper functions, RBAC, Shopify OAuth and webhooks, helpdesk ingestion, evidence package generation, API keys, and a product shell that is starting to separate live integrations from CSV imports.

It is not yet implementation-complete. The current product still behaves like a CSV audit tool with a few connected-data surfaces bolted on. The biggest product risk is the absence of a single canonical data-state model. The biggest security risk is inconsistent tenancy: some areas use `ctx.merchantId`, some still use `user.id`, and some RLS policies still compare merchant-owned rows directly to `auth.uid()`.

Highest priority fixes:

1. Normalize tenant identity everywhere: merchant-owned rows should use `merchants.id`, not `auth.users.id`, except in explicitly legacy migration code.
2. Fix the evidence-package note query immediately. It reads `customer_notes` by profile only and can pull notes from another merchant sharing the profile.
3. Replace page-local data gates with one canonical merchant data presence service and one setup-state service.
4. Convert the product IA from "audit upload first" to "connected identity and claim intelligence first, CSV as import/backfill".
5. Modernize RLS and `createScopedClient` to match the actual 2026 table set.
6. Rebuild every page state: empty, partial setup, data-present incomplete setup, fully connected, CSV-only legacy, and public-audit claimed.

## Current State Diagnosis

### What The App Communicates Today

The app currently communicates three competing products:

- A CSV audit/history product: `Upload CSV`, `Import history`, `New audit`, `Audit history`.
- A customer intelligence product: customers, identity confidence, profiles, watchlist, evidence packages.
- A connected ops product: Shopify, Gorgias, Zendesk, claims, live reports.

Those products are not yet unified into one hierarchy. The sidebar has improved by separating "Data import", but the dashboard, store, reports, empty states, and CTAs still drift.

### What The App Should Communicate

Unauth should feel like a merchant intelligence cockpit:

- Primary job: understand risky customer identity and claim patterns.
- Primary data sources: Shopify orders plus helpdesk claims.
- Primary actions: review customers, investigate claims, create evidence packages, monitor repeat claim identities.
- Secondary action: upload CSV for historical import, backfill, and merchants who are not connected yet.
- Public acquisition flow: free audit is separate from merchant workspace data until claimed and re-tenanted.

### The Main Product Defect

There is no canonical "what data does this merchant have?" contract. Pages each infer state differently:

- Dashboard uses `getMerchantDataPresence()` but that helper only counts customer profiles, processing jobs, evidence packages, and claims.
- Customers uses the filtered result count as `hasData`.
- Reports uses `rows.length > 0 || claims.length > 0`.
- Store only looks for a Shopify-sourced `processing_jobs` row.
- Watchlist reads `watchlist_entries` using `user.id`.
- Upload/history still speak as if CSV is the first-class product.

This is why the app can show customers in one place while another page acts empty or incomplete.

## Correct Target Product Model

### Canonical Setup States

Every authenticated product page should render from the same state object.

| State | Definition | Product behavior |
| --- | --- | --- |
| Fresh merchant | No useful merchant data and no integrations | Full first-run setup experience. Primary CTA: connect Shopify and helpdesk. Secondary CTA: upload CSV. |
| Shopify only, no data yet | Shopify connected, helpdesk missing, no imported customer/order data yet | Partial setup hero. Primary CTA: connect helpdesk. Mention Shopify is waiting/syncing if relevant. |
| Shopify only, data present | Shopify connected, helpdesk missing, profiles/orders exist | Show data with a persistent warning. Never hide customer/store intelligence behind a full gate. Label claim counts as incomplete. |
| Helpdesk only, no data yet | Helpdesk connected, Shopify missing, no customers/orders | Partial setup hero. Primary CTA: connect Shopify. |
| Helpdesk only, data present | Helpdesk connected with claims but no Shopify order data | Show claim data with warnings about missing order context. |
| Fully connected, no data yet | Both integrations connected but no useful data has synced | Sync progress/diagnostic state. Do not ask user to reconnect. |
| Fully connected, data present | Both integrations connected and useful data exists | Normal product experience. No setup banner unless sync is stale. |
| CSV-only legacy | Processing jobs or profiles exist but no live integrations | Show historical intelligence. Primary CTA: connect integrations. CSV remains a historical/backfill source. |
| Public audit unclaimed | Public audit exists under intake merchant | Public report gate only. Must not count as merchant workspace data. |
| Public audit claimed | Public audit linked to merchant | Re-tenant every downstream row and then show inside merchant workspace as an imported audit. |

### Canonical Data Presence Contract

Replace `lib/supabase/getMerchantDataPresence.ts` with a broader service, for example:

```ts
type MerchantDataPresence = {
  hasAnyData: boolean;
  hasCustomerProfiles: boolean;
  hasOrders: boolean;
  hasShopifySignals: boolean;
  hasHelpdeskClaims: boolean;
  hasEvidencePackages: boolean;
  hasWatchlist: boolean;
  hasCustomerActivity: boolean;
  hasCsvImports: boolean;
  hasLiveIntegrationReports: boolean;
  sources: {
    customerProfiles: number;
    auditTransactions: number;
    processingJobs: number;
    shopifyOrderSignals: number;
    merchantClaims: number;
    supportCases: number;
    evidencePackages: number;
    watchlistEntries: number;
    customerActivity: number;
  };
};
```

Implementation notes:

- Count `customer_profiles` by `merchant_ids` containing `ctx.merchantId` and legacy `user.id`.
- Count `audit_transactions` by `merchant_id` when present, otherwise via merchant-owned `processing_jobs`.
- Count Shopify data by `merchant_shopify_connections -> shop_domain -> shopify_order_signals`.
- Count helpdesk data by `support_case_intake.merchant_id` and `merchant_claims.merchant_id`.
- Count watchlist by `watchlist_entries.merchant_id = ctx.merchantId` after migration.
- Exclude `public_audits` unless `linked_merchant_id = ctx.merchantId` and downstream rows are fully re-tenanted.
- Use `head: true, count: 'exact'` for existence/count only; use indexes for each counted column.

### Canonical Page Gate

`PageConnectionGate` should not decide page behavior from `hasData?: boolean` alone. It should receive:

```ts
type MerchantSetupState =
  | 'fresh'
  | 'shopify_only_empty'
  | 'shopify_only_with_data'
  | 'helpdesk_only_empty'
  | 'helpdesk_only_with_data'
  | 'csv_only'
  | 'fully_connected_empty'
  | 'fully_connected_with_data'
  | 'stale_existing_data';
```

Then every page can render:

- Full gate only when no useful data exists and required sources are missing.
- Non-blocking warning when data exists but setup is incomplete.
- Real page content whenever data exists.

## Page Audit

### Dashboard

Screenshot refs:

- `design-audit/screenshots/01_dashboard_overview.png`
- `design-audit/screenshots/empty_01_dashboard.png`

Current communicates:

- Empty state correctly starts with "Connect Shopify and your helpdesk".
- Populated Shopify-only state shows customers, evidence packages, and CSV runs.
- However the page still feels like a compact audit table with a right rail, not the primary intelligence cockpit.

Should communicate:

- "Here is what needs attention today."
- Top hierarchy should be: review queue, claim context completeness, evidence ready, watchlist appearances, sync health.
- CSV runs should be secondary, not one of four hero metrics unless the merchant is explicitly CSV-only.

Product logic problems:

- `getMerchantDataPresence()` only counts four data sources (`customer_profiles`, `processing_jobs`, `evidence_packages`, `merchant_claims`) and misses Shopify order signals, support cases, watchlist, activity logs, live reports, and audit transactions. See `lib/supabase/getMerchantDataPresence.ts:39-62`.
- "Data synced" depends on completed processing jobs, not live source freshness. See `app/(app)/dashboard/page.tsx:256-260`.
- Evidence package count fetches all rows and filters in memory. See `app/(app)/dashboard/page.tsx:131-137`.
- The dashboard still exposes a dev details block in screenshots. See `app/(app)/dashboard/page.tsx:522-539`.

Visual hierarchy problems:

- The card is large but the primary action is small.
- The most important row, "Customers with claim history", has only one visible item and leaves a large empty body below it.
- The right rail is useful but visually equal to the main review area.

CTA problems:

- In populated Shopify-only state, "Connect helpdesk" is correct, but it should be visually treated as setup completion, not a normal page action.
- "New audit" should never be the fallback primary CTA on a merchant with active customer data unless the user is in the CSV import area.

Data-state recommendation:

- Replace the current `isFresh` and `partialSetup` branches with `resolveMerchantSetupState()`.
- Show real dashboard whenever any useful data exists.
- Put setup warnings in a sticky, dismissible but persistent strip.

Files/components:

- `app/(app)/dashboard/page.tsx`
- `lib/supabase/getMerchantDataPresence.ts`
- `components/EmptyDashboardHero.tsx`
- `components/PartialSetupHero.tsx`
- `components/connections/PageConnectionGate.tsx`

Priority: P0 for data-state correctness, P1 for visual rebuild.

### Customers List

Screenshot refs:

- `design-audit/screenshots/03_customers_list.png`
- `design-audit/screenshots/empty_02_customers.png`

Current communicates:

- Populated state is useful: searchable customer list, confidence grades, network count, orders, refunds.
- Empty state correctly gates when no data, but the old empty copy still says "Run an audit" and "Upload a CSV".

Should communicate:

- "Customer profiles are built from Shopify, helpdesk, and optional CSV imports."
- Primary empty CTA should be integrations. CSV is secondary.

Product logic problems:

- `merchantFilter` correctly checks both `ctx.merchantId` and legacy `user.id`. See `app/(app)/customers/page.tsx:165-170`.
- The page uses `hasData={total > 0}`. If a merchant has profiles but filters return zero, the page can behave as if no data exists. See `app/(app)/customers/page.tsx:355-367`.
- KPI strip values are a mix of total and current-page values. See `app/(app)/customers/page.tsx:377-381`.
- Empty copy still says uploaded transaction data. See `app/(app)/customers/page.tsx:457-462`.
- Primary action is "New audit", linking to CSV upload. See `app/(app)/customers/page.tsx:373`.

Visual hierarchy problems:

- The list is dense and operational, which is good for B2B SaaS, but the "Network" column is ambiguous. It should say "Merchants" or "Stores seen" with a tooltip.
- Saved views are useful but should become actual persisted views or be framed as quick filters.

CTA recommendation:

- Populated: primary CTA should be "Review queue" or "Create evidence package" depending state.
- Empty: primary CTA should be "Set up integrations"; secondary "Upload CSV".
- Filtered zero: show "No customers match filters" without showing the first-run gate.

Files/components:

- `app/(app)/customers/page.tsx`
- `components/customers/CustomersTableClient.tsx`
- `components/customers/CustomersFilterSheet.tsx`
- `components/connections/PageConnectionGate.tsx`

Priority: P1.

### Customer Detail And Customer Claims

Screenshot refs:

- `design-audit/screenshots/04_customer_profile_top.png`
- `design-audit/screenshots/04_customer_profile_mid_dossier.png`
- `design-audit/screenshots/04_customer_profile_claims_orders.png`
- `design-audit/screenshots/05_customer_claim_review_route.png`

Current communicates:

- The customer detail direction is strong: identity confidence, evidence, order history, claims/dispute context.
- Claim review route has meaningful case workflow information.

Should communicate:

- A customer dossier, not a raw table record.
- Identity confidence and claim evidence are separate concepts.
- Merchant action remains the merchant's responsibility; Unauth supplies evidence and context.

Product logic problems:

- Visual QA logged a 500 on `/customers/[id]/claims` while the page showed `Failed to mark claim viewed`. The route needs an API/server action audit for claim-view writes.
- Customer detail uses merchant-scoped helpers, which is good, but every side table on the page must follow the same pattern.
- Watchlist status in customer APIs still uses `user.id` in places, which will disagree with merchant-scoped pages.

Visual hierarchy problems:

- The page is information-rich but can feel like many bordered panels. The target should be a dossier layout with a clear summary band, evidence timeline, and action rail.
- Sensitive fields should be deliberately masked/unmasked with role-aware controls, not displayed as normal text everywhere.

CTA recommendation:

- Primary: "Generate evidence package" when a disputed order exists.
- Secondary: "Add to watchlist", "Mark reviewed", "Copy helpdesk summary".

Files/components:

- `app/(app)/customers/[id]/page.tsx`
- `app/(app)/customers/[id]/claims/page.tsx`
- `components/claims/ClaimReviewPanel.tsx`
- `lib/supabase/merchantHelpers.ts`
- `app/api/customers/[id]/route.ts`

Priority: P0 for claim route 500, P1 for dossier polish and PII handling.

### Store Overview

Screenshot ref:

- `design-audit/screenshots/empty_03_store.png`

Current communicates:

- If a Shopify processing job exists, `/store` redirects to `/audit/[job]?source=shopify`.
- If no Shopify job exists, it shows a setup prompt.

Should communicate:

- A real store overview: synced orders, claim health, refund/chargeback trend, Shopify sync freshness, helpdesk completeness, customer risk segments.

Product logic problems:

- `/store` is not a store overview. It is a redirect wrapper. See `app/(app)/store/page.tsx:7-34`.
- It depends on a `processing_jobs.upload_type = 'shopify'` row. A merchant can have Shopify profiles/signals but no current Shopify processing job and still be treated as empty. See `app/(app)/store/page.tsx:22-30`.

Visual hierarchy problems:

- Empty state is centered and simple, but it does not show any diagnostic details: whether Shopify is disconnected, helpdesk is disconnected, or sync has not produced jobs.

CTA recommendation:

- Fully connected/data present: "Review risky customers", "Review open claims", "View evidence-ready orders".
- Incomplete: "Connect missing source".
- CSV fallback should remain a secondary text link.

Files/components:

- `app/(app)/store/page.tsx`
- `lib/shopify/connectionStatus.ts`
- `lib/shopify/auditBridge.ts`
- `lib/shopify/profileLinking.ts`
- `lib/supabase/getMerchantDataPresence.ts`

Priority: P1.

### Reports

Screenshot refs:

- `design-audit/screenshots/07_reports.png`
- `design-audit/screenshots/empty_04_reports.png`

Current communicates:

- Code has a good direction: tabs for Overview, CSV audits, Live reports. See `app/(app)/reports/page.tsx:107-135`.
- Visual capture for `/reports` landed on `/dashboard` for the populated merchant, which needs route/debug verification before release.
- Empty state uses the full setup gate.

Should communicate:

- Reports should be generated intelligence, not just CSV run charts.
- Overview should combine live integrations and imports.
- CSV audit history should be a sub-tab.
- Live reports should be available when Shopify/helpdesk data exists.

Product logic problems:

- Permission check uses `VIEW_DASHBOARD`, not a reports-specific permission. See `app/(app)/reports/page.tsx:143`.
- `hasAnyData = rows.length > 0 || claims.length > 0`, missing customer profiles, Shopify signals, support cases, evidence packages, and watchlist. See `app/(app)/reports/page.tsx:258`.
- Transaction grade distribution reads only 2,000 rows. See `app/(app)/reports/page.tsx:179-186`.
- `PageConnectionGate` can block a data-present merchant if the page's local data test is incomplete. See `app/(app)/reports/page.tsx:550-581`.

Visual hierarchy problems:

- The intended report tabs are useful, but reports should be a first-class nav page with its own subnav. It should not inherit a workbench subnav that lacks Reports.

CTA recommendation:

- Overview: "Export report" and "Schedule report".
- CSV tab: "Upload CSV".
- Live tab: "Connect missing source" only when needed.

Files/components:

- `app/(app)/reports/page.tsx`
- `components/reports/ExportMenu.tsx`
- `lib/claims/reporting.ts`
- `components/workbench/workbenchNavItems.ts`

Priority: P1.

### Watchlist

Screenshot refs:

- `design-audit/screenshots/09_watchlist_loaded.png`
- `design-audit/screenshots/empty_05_watchlist.png`

Current communicates:

- Simple watchlist page with table, recent appearances, and remove actions.
- Empty state says "No customers on watchlist".

Should communicate:

- "These are identities you are actively monitoring across future orders, claims, and evidence workflows."

Product logic problems:

- The page queries `watchlist_entries.merchant_id = user.id`, not `ctx.merchantId`. See `app/(app)/watchlist/page.tsx:46-66`.
- The API also reads/inserts `merchant_id: user.id`. See `app/api/watchlist/route.ts:26-31` and `app/api/watchlist/route.ts:58-68`.
- Delete uses `user.id` too. See `app/api/watchlist/[id]/route.ts:31-42`.
- Recent appearances query is not scoped by merchant before local filtering. See `app/(app)/watchlist/page.tsx:67-80`.
- `activeNavKey="customers"` makes Watchlist appear as a Customers subpage, not its own risk-monitoring workflow. See `app/(app)/watchlist/page.tsx:138-143`.

Visual hierarchy problems:

- Recent appearances often says none even when the table is populated, because the data join/tenant basis is inconsistent.
- Empty state should include "Add from customer profile" and "Import watchlist" patterns later.

CTA recommendation:

- Primary: "Browse customers".
- Secondary: "Import watchlist" when supported.
- Row CTA: "Open dossier", not just remove.

Files/components:

- `app/(app)/watchlist/page.tsx`
- `app/api/watchlist/route.ts`
- `app/api/watchlist/[id]/route.ts`
- `components/watchlist/WatchlistTableClient.tsx`
- `supabase/migrations/0015_watchlist.sql`
- `supabase/migrations/0082_fix_watchlist_appearances_rls.sql`

Priority: P0/P1. The tenant mismatch is security/data integrity critical.

### Evidence Packages

Screenshot refs:

- `design-audit/screenshots/12_evidence_packages.png`
- `design-audit/screenshots/12_evidence_package_detail.png`

Current communicates:

- Evidence packages exist and are merchant-scoped at list level.
- Route name is still `/chargebacks`, with `/evidence-packages` redirecting to it.

Should communicate:

- "Evidence packages" is the product concept; chargebacks are one use case.

Product logic problems:

- `buildEvidencePackage()` fetches `customer_notes` by `customer_profile_id` only. It must filter by `merchant_id` and `deleted_by_merchant = false`. See `lib/evidence/buildPackage.ts:246-253`.
- RLS for evidence packages still uses `merchant_id = auth.uid()` in migrations, which does not align with `merchants.id`. See `supabase/migrations/0062_evidence_packages.sql:30-32`.
- PDF theme uses blue (`#2563EB`) despite the product color constraint. See `lib/evidence/pdf.tsx:26-36`.

Visual hierarchy problems:

- The table is serviceable but should present packages as evidence artifacts with status, dispute order, CE3 readiness, last generated, and download/open actions.

CTA recommendation:

- Primary: "Generate from customer".
- Secondary: "View dispute-ready".

Files/components:

- `app/(app)/chargebacks/page.tsx`
- `app/(app)/chargebacks/[id]/page.tsx`
- `app/(app)/evidence-packages/page.tsx`
- `lib/evidence/buildPackage.ts`
- `lib/evidence/pdf.tsx`
- `app/api/evidence/route.ts`
- `app/api/evidence/[id]/pdf/route.ts`

Priority: P0 for note scoping, P1 for route/IA cleanup.

### Upload CSV

Screenshot refs:

- `design-audit/screenshots/10_upload_flow.png`
- `design-audit/screenshots/empty_06_upload_csv.png`

Current communicates:

- "New audit" and "Upload a CSV export" are still prominent.

Should communicate:

- CSV import is a historical import/backfill workflow. It is useful, but it is not the product center.

Product logic problems:

- The page itself can stay focused on CSV, but app-wide CTAs should not send data-present merchants to CSV as the default.
- Workbench nav labels "Audit history" and "Evidence packages" are visible in the CSV flow, reinforcing that CSV is the central product.

Visual hierarchy problems:

- The upload interaction is adequate but should be named "Import CSV" or "Historical import".

CTA recommendation:

- Rename page title to "Import CSV" or "Historical import".
- Keep `New audit` only inside CSV-specific flows if the business wants that wording.

Files/components:

- `app/(app)/upload/page.tsx`
- `components/upload/*`
- `components/workbench/workbenchNavItems.ts`

Priority: P2.

### Import History

Screenshot refs:

- `design-audit/screenshots/11_audit_history.png`
- `design-audit/screenshots/empty_07_history.png`

Current communicates:

- "Audit history" and "Upload your first CSV".

Should communicate:

- "Import history" for CSV and historical files.
- Do not imply the merchant has no product data if integrations or customers exist.

Product logic problems:

- Empty state is CSV-first.
- Page summary KPIs are current-page scoped in places; large merchants need total aggregates.

CTA recommendation:

- Primary: "Import CSV".
- Secondary: "Set up integrations" if no live sources connected.

Files/components:

- `app/(app)/history/page.tsx`
- `components/common/PageSizeSelect.tsx`

Priority: P2.

### Settings And Integrations

Screenshot refs:

- `design-audit/screenshots/13_settings_integrations_shopify.png`
- `design-audit/screenshots/empty_08_settings_integrations.png`

Current communicates:

- Settings has Shopify status, API keys, and integration tiles.
- Gorgias/Zendesk/Chrome are available, but the setup hierarchy is weak.

Should communicate:

- "Complete your required data pair: Shopify orders plus helpdesk claims."
- API keys and Chrome should be advanced/optional, not equal to the required pair.

Product logic problems:

- Chrome install pill uses Google blue as product UI, not just a logo. See `components/settings/ApiIntegrationsClient.tsx:318-325`.
- Zendesk connection appears not connected by default because it has no backing status source in the integration model. See `components/settings/ApiIntegrationsClient.tsx:15-23`.
- Gorgias webhook registration places a webhook secret in the query string for Gorgias-side registration. See `lib/support/gorgias/settingsConnection.ts:147-167` and `lib/support/gorgias/settingsConnection.ts:543-552`.

Visual hierarchy problems:

- `max-w-2xl` settings pages are too narrow for an operational setup surface.
- The top of integrations should be a required-pair checklist, with optional API/Chrome below.

CTA recommendation:

- Fresh: "Connect Shopify" and "Connect helpdesk".
- Shopify-only: "Connect helpdesk".
- Helpdesk-only: "Connect Shopify".
- Fully connected: "Sync now", "Manage credentials", "View sync health".

Files/components:

- `app/(app)/settings/integrations/page.tsx`
- `components/settings/ApiIntegrationsClient.tsx`
- `app/(app)/settings/integrations/gorgias/page.tsx`
- `app/(app)/settings/integrations/zendesk/page.tsx`
- `components/shopify/SyncStatusCard.tsx`

Priority: P1.

### Inbox And Claims

Screenshot refs:

- `design-audit/screenshots/02_inbox_queue.png`
- `design-audit/screenshots/05_claims_list.png`
- `design-audit/screenshots/05_claims_open_filter.png`
- `design-audit/screenshots/05_claims_overdue_filter.png`

Current communicates:

- This is the closest surface to the target ops product: open claims, SLA, owner, evidence, decision.

Should communicate:

- "This is where the merchant decides what to do."
- Identity confidence, claim status, evidence readiness, and SLA should be visually separate.

Product logic problems:

- Claim route 500 must be resolved.
- Claims use service-role tables with service-only RLS. That is acceptable only if every route uses `ctx.merchantId` and permission checks consistently.

Visual hierarchy problems:

- `ClaimReviewPanel` has many hardcoded fallback colors and status palettes. See `components/claims/ClaimReviewPanel.tsx`.
- The panel should be refactored into smaller audited components: claim header, identity evidence, order context, merchant decision, evidence checklist, event timeline.

CTA recommendation:

- Primary: "Record decision" or "Generate evidence" depending claim state.
- Secondary: "Assign", "Snooze", "Mark not fraud", "Send summary".

Files/components:

- `app/(app)/claims/page.tsx`
- `app/(app)/customers/[id]/claims/page.tsx`
- `components/claims/ClaimReviewPanel.tsx`
- `lib/claims/*`

Priority: P0 for 500, P1 for workflow clarity.

### Public Audit And Acquisition

Screenshot refs:

- `design-audit/screenshots/00_root_landing_or_redirect.png`
- `design-audit/screenshots/15_new_audit_missing_route.png`
- `design-audit/screenshots/15_audit_history_missing_route.png`

Current communicates:

- Public free audit exists and is separated from the authenticated app in UI.
- The public report masks PII unless the submitter can view it.

Should communicate:

- Free audit is an acquisition funnel and should not pollute merchant workspace counts until claimed and fully migrated.

Product logic problems:

- Public audit submission uses `PUBLIC_INTAKE_MERCHANT_ID` and creates a processing job under that intake merchant. See `app/api/public-audit/submit/route.ts:79-118`.
- Claim route re-tenants `processing_jobs`, `csv_upload_queue`, and `audit_transactions`, but not clearly every downstream identity/profile/appearance/watchlist/evidence summary row. See `app/api/public-audit/[runId]/claim/route.ts:91-111`.
- Public report authorization is email-based or linked user based. See `app/(public)/audit/[runId]/report/page.tsx:72-77`. This is acceptable for a claim gate, but it should have explicit rate limiting and ownership tests.
- Purge cron deletes several downstream rows for unclaimed audits but not customer profiles or global identity appearances created during processing. See `app/api/cron/purge-expired-audits/route.ts:56-63`.

CTA recommendation:

- Public report: "Create account to keep report" and "Connect Shopify for live monitoring".
- Claimed report should land in a clear "Imported audit" state.

Files/components:

- `app/(public)/audit/*`
- `app/api/public-audit/submit/route.ts`
- `app/api/public-audit/[runId]/claim/route.ts`
- `app/api/cron/purge-expired-audits/route.ts`

Priority: P1.

### Navigation And IA

Current communicates:

- Sidebar has better grouping than before: Workspace, Review, Data import.
- Workbench subnav is still stale: Overview, Customers, Audit history, Evidence packages. It does not include Reports or Watchlist. See `components/workbench/workbenchNavItems.ts:1-7`.

Should communicate:

- Sidebar is the primary IA.
- Page-level subnav should be local to the workflow, not repeated across unrelated pages.

Required changes:

- Make Dashboard, Customers, Watchlist, Evidence Packages, Claims, Reports, Store Overview first-class where appropriate.
- Move CSV import/history into a clear "Imports" area.
- Stop using `activeNavKey="customers"` on Watchlist and Evidence Packages.

Priority: P1.

## Dashboard Deep Dive

### Why Customers Can Show Profiles While Dashboard Does Not

The original mismatch is structural:

- `customer_profiles` does not use a scalar `merchant_id`.
- It uses `merchant_ids`, a JSON array.
- Customers page scopes with `merchant_ids.cs.[ctx.merchantId]` and legacy `merchant_ids.cs.[user.id]`. See `app/(app)/customers/page.tsx:165-170`.
- Older dashboard logic treated merchant data as if every table had scalar `merchant_id`.

The current working tree partially fixes this by introducing `getMerchantDataPresence()` and calling it from Dashboard. See `app/(app)/dashboard/page.tsx:110-120`.

Remaining mismatch:

- `getMerchantDataPresence()` is too narrow. It counts only `customer_profiles`, `processing_jobs`, `evidence_packages`, and `merchant_claims`. See `lib/supabase/getMerchantDataPresence.ts:39-62`.
- Dashboard still makes KPI decisions from processing jobs and review queue helpers, so Shopify-only data without audit jobs can still look inactive.
- Reports, Customers, Store, Watchlist, History, and Upload do not all use the same data presence logic.

### Correct Dashboard Query Model

Dashboard should load:

1. `merchantSetupState = getMerchantSetupState(serviceClient, ctx.merchantId, user.id)`
2. `dataPresence = getMerchantDataPresence(serviceClient, ctx.merchantId, user.id)`
3. `reviewQueue = getDashboardReviewQueue(serviceClient, ctx.merchantId)`
4. `claimsOps = getClaimsOpsSummary(serviceClient, ctx.merchantId)`
5. `evidenceSummary = getEvidenceSummary(serviceClient, ctx.merchantId)`
6. `syncHealth = getIntegrationSyncHealth(serviceClient, ctx.merchantId)`
7. `recentActivity = getMerchantActivityFeed(serviceClient, ctx.merchantId)`

Dashboard must not directly know every table's schema. It should consume domain summaries.

### Correct Dashboard KPIs

Replace current four hero metrics:

- Customer profiles
- Linked identities
- Evidence packages ready
- CSV audit runs

With state-dependent metrics:

Fully connected/data present:

- Customers monitored
- Review queue
- Claims needing action
- Evidence ready
- Sync health

Shopify-only/data present:

- Customers synced
- Orders synced
- Identity matches
- Missing claim context
- Evidence available

CSV-only:

- Imported customers
- Review queue
- Matched orders
- Evidence ready
- Connect live sources

Fresh:

- Setup progress, not KPIs.

### Dashboard Implementation Checklist

- Expand `getMerchantDataPresence()`.
- Add `getMerchantSetupState()`.
- Remove dev-only debug panel from dashboard.
- Stop showing "Data synced" from processing jobs only.
- Replace evidence full-row fetch with counted queries.
- Replace raw CSV runs in the hero with a secondary import status.
- Add tests for every setup state.
- Add Playwright snapshots for fresh, Shopify-only, helpdesk-only, CSV-only, fully connected, and stale data states.

## Security And Data Isolation Audit

### Positive Controls Already Present

- Server routes generally use `createServiceClient()` server-side only. See `lib/supabase/server.ts:65-88`.
- RBAC exists via `requirePermission()`.
- Merchant helper functions explicitly prove ownership for customer profiles and transactions. See `lib/supabase/merchantHelpers.ts`.
- CSV export escapes spreadsheet formulas via `escapeCsvCell()`.
- Shopify OAuth verifies state and HMAC.
- Shopify webhooks verify HMAC, rate limit, and dedupe via `processed_webhooks`.
- Gorgias support webhooks use connection-level secrets and rate limiting.
- Public API keys are hashed at rest and rate-limited.
- Evidence signed URLs use token hashes and expiry.

These are good foundations. The issues below are mostly consistency and coverage failures.

### P0: Evidence Package Notes Can Cross Tenant Boundaries

Risk:

- A customer profile can be associated with multiple merchants.
- `buildEvidencePackage()` fetches notes by `customer_profile_id` only.
- That can include another merchant's notes in an evidence PDF.

Evidence:

- `lib/evidence/buildPackage.ts:246-253`

Required fix:

```ts
const { data: noteRows } = await supabaseServiceRole
  .from('customer_notes')
  .select('note, created_at')
  .eq('merchant_id', merchantId)
  .eq('customer_profile_id', customerProfileId)
  .eq('deleted_by_merchant', false)
  .order('created_at', { ascending: false })
  .limit(3);
```

Tests:

- Create two merchants sharing the same `customer_profile_id`.
- Add notes for both.
- Generate evidence for merchant A.
- Assert merchant B notes are absent.

Priority: P0.

### P0/P1: Watchlist Tenant Identifier Is Wrong

Risk:

- Watchlist page and APIs use `user.id` as `merchant_id`.
- Current merchant-owned data model uses `ctx.merchantId` / `merchants.id`.
- Team members and owner/team contexts can diverge.
- Watchlist entries, appearances, and customer profile flags can become inconsistent.

Evidence:

- Page read: `app/(app)/watchlist/page.tsx:46-66`
- API read/write: `app/api/watchlist/route.ts:26-31` and `app/api/watchlist/route.ts:58-68`
- API delete: `app/api/watchlist/[id]/route.ts:31-42`
- Original RLS uses `merchant_id = auth.uid()`: `supabase/migrations/0015_watchlist.sql:19-23`
- Appearance RLS was later fixed to `merchants.id`: `supabase/migrations/0082_fix_watchlist_appearances_rls.sql`

Required fix:

- Migrate `watchlist_entries.merchant_id` to reference `merchants.id`.
- Backfill legacy rows by joining `merchants.user_id`.
- Change every watchlist read/write/delete to `ctx.merchantId`.
- Add temporary legacy read support only during migration.
- Add owner and team-member tests.

Priority: P0 for API/data model, P1 for UI cleanup.

### P1: RLS Policies Are Not Aligned To The Merchant Model

Risk:

- The app often uses service role and app-level scoping, but direct browser/RLS policies are still inconsistent.
- A future client-side query or refactor can silently expose or hide tenant data.

Evidence:

- `customer_profiles_select_own` checks `auth.uid()` inside `merchant_ids`, not `merchants.id` or team membership. See `supabase/migrations/0017_security_hardening.sql:49-52`.
- `customer_profile_audit_appearances` inherits the same auth-user assumption. See `supabase/migrations/0017_security_hardening.sql:59-65`.
- `evidence_packages` uses `merchant_id = auth.uid()`. See `supabase/migrations/0062_evidence_packages.sql:30-32`.
- `watchlist_entries` uses `merchant_id = auth.uid()`. See `supabase/migrations/0015_watchlist.sql:19-23`.
- `customer_notes` policies allow active `merchant_members` but do not include owner unless owner is also a member. See `supabase/migrations/0079_tenancy_alignment_customer_notes.sql:18-76`.
- `fraud_identity_clusters` remains readable to all authenticated users in old migration. See `supabase/migrations/0010_refund_pattern_intelligence.sql:34-40`.

Required fix:

- Create a reusable SQL predicate or helper view:

```sql
exists (
  select 1 from merchants m
  where m.id = target.merchant_id and m.user_id = auth.uid()
)
or exists (
  select 1 from merchant_members mm
  where mm.merchant_id = target.merchant_id
    and mm.user_id = auth.uid()
    and mm.invite_status = 'active'
)
```

- For `customer_profiles`, use `merchant_ids` containing any merchant id owned or joined by the user.
- Revoke authenticated access from global identity tables unless a k-anonymity RPC is the only path.
- Add RLS tests with owner, team member, unrelated user, and anonymous user.

Priority: P1.

### P1: `createScopedClient` Table Registry Is Stale

Risk:

- The helper only scopes tables listed in `TENANT_TABLES`.
- Current app tables such as `merchant_claims`, `merchant_case_outcomes`, `claim_evidence_items`, `support_provider_connections`, `support_case_intake`, `merchant_shopify_connections`, `shopify_order_signals`, `merchant_identities`, `customer_profile_identities`, `audit_transactions`, and `watchlist_entries` are missing or not adequately represented.

Evidence:

- `lib/supabase/scoped.ts:8-48`

Required fix:

- Update `TENANT_TABLES` to match all active tenant tables.
- Add table-specific scoping where tenant is derived through `shop_domain`, `claim_id`, `profile_id`, or `job_id`.
- Make unregistered tenant tables fail closed in development/test.
- Add tests proving scoped select/update/delete/insert behavior per table.

Priority: P1.

### P1: Public Audit Claim Does Not Clearly Re-Tenant All Downstream Data

Risk:

- Public audit processing under `PUBLIC_INTAKE_MERCHANT_ID` can produce jobs, transactions, profiles, appearances, global identity rows, and summaries.
- Claim route only re-tenants `processing_jobs`, `csv_upload_queue`, and `audit_transactions`.

Evidence:

- Public submission intake merchant: `app/api/public-audit/submit/route.ts:79-118`
- Claim re-tenancy: `app/api/public-audit/[runId]/claim/route.ts:91-111`
- Unclaimed purge cascade: `app/api/cron/purge-expired-audits/route.ts:56-63`

Required fix:

- Create one transactional server function: `claimPublicAudit(publicAuditId, userId, merchantId)`.
- Re-tenant or rebuild:
  - `processing_jobs`
  - `csv_upload_queue`
  - `audit_transactions`
  - `customer_profile_audit_appearances`
  - `audit_customer_summaries`
  - `audit_result_summaries`
  - `customer_profiles.merchant_ids`
  - `customer_profile_identities`
  - global identity appearances/attributes where applicable
- Purge unclaimed public audits from every downstream table.

Priority: P1.

### P1: Service Role Usage Needs A Review Rule

Risk:

- Service role bypasses RLS. The codebase uses it broadly, which is acceptable only if every query has explicit tenant filtering or uses a helper.

Required policy:

- Any service-role query against tenant data must satisfy one of:
  - Uses `createScopedClient()`.
  - Uses a domain helper with a documented ownership proof.
  - Filters directly by `ctx.merchantId` and has a test.
  - Resolves ownership through a parent row, then filters child rows by parent IDs.

Add a lint/test grep:

- Flag `createServiceClient()` usage in API/pages.
- Require nearby `requirePermission`, `resolveCallerContext`, or documented public/internal secret auth.

Priority: P1.

### P1: Gorgias Webhook Secret In Query String

Risk:

- Gorgias supports custom HTTP integration URLs, and the app places the one-time webhook secret in the query string for auto-registration.
- Query strings can appear in logs and analytics infrastructure even if app logs avoid printing them.

Evidence:

- URL builder: `lib/support/gorgias/settingsConnection.ts:147-167`
- Auto-registration with query secret: `lib/support/gorgias/settingsConnection.ts:543-552`
- Header-or-query reader: `lib/support/gorgias/webhookAuth.ts:25-33`

Required fix:

- Prefer header secret when provider supports it.
- If query secret is unavoidable, make it a short-lived connection bootstrap token exchanged into a stored hash, then rotate immediately.
- Do not include reusable secrets in persistent third-party integration URLs.

Priority: P1.

### P2: Signed Token Secret Fallback Coupled To Service Role

Risk:

- `signedAccess` falls back to `SUPABASE_SERVICE_ROLE_KEY` if dedicated secrets are missing.

Evidence:

- `lib/api/signedAccess.ts:11-15`

Required fix:

- Require `PDF_SIGNING_SECRET` in production.
- Fail boot or route execution if missing.
- Add key rotation plan.

Priority: P2.

### PII And Privacy Audit

Current good patterns:

- API v1 customer profile masks email/address/card fields.
- Public audit report redacts email/address.
- Evidence PDFs mask identity values.
- Support intake stores hashes and summaries rather than raw payloads in many places.

Issues:

- Customer profile UI can expose plaintext emails and addresses to any role with `VIEW_CUSTOMERS`. Add role-based masking/unmasking.
- Evidence package note leak must be fixed.
- Global identity tables must remain service-only and k-anonymity-gated.
- Public audit claim and purge flows need complete deletion/re-tenancy tests.

Recommended components:

- `SensitiveField`
- `MaskedEmail`
- `MaskedAddress`
- `CopyWithAudit`
- `UnmaskButton` requiring permission and logging.

## Integration Security

### Shopify

Strengths:

- OAuth state cookie exists.
- OAuth HMAC is verified.
- Webhook HMAC is verified.
- Webhook processing is rate-limited and idempotent through `processed_webhooks`.
- App uninstalled webhook revokes access token and deactivates connection.

Issues:

- Shopify data presence must not depend on `processing_jobs.upload_type = 'shopify'`.
- `merchant_identities` and `shopify_order_signals` are keyed by `shop_domain`; any service-role consumer must resolve `shop_domain -> merchant_shopify_connections -> merchant_id`.
- Webhook logs should avoid any accidental PII or token context.

### Gorgias/Zendesk

Strengths:

- Gorgias API credentials are encrypted with AES-GCM.
- Connection settings return no raw tokens.
- Webhook auth supports connection-specific secret hashes.
- Support tables are service-role only in migrations.

Issues:

- Query-string secret pattern should be replaced or shortened.
- Zendesk is visually present but less complete than Gorgias; avoid representing it as equivalent until status, sync, and webhook behavior are implemented.

## API v1 Audit

Strengths:

- API keys are hashed.
- API keys are rate-limited.
- CORS is limited to Zendesk origins.
- Lookup uses k-anonymity before returning cross-merchant data.
- Own-store claim amounts are scoped to calling merchant.

Issues:

- API key permissions are currently broad once a key exists. Add per-key scopes.
- `profile-link` has a suspicious query pattern: `.contains('emails', JSON.stringify([normEmail])).or(filters)` should be tested because PostgREST `contains` expects array/json, and the `.or` only scopes merchant after the email match chain. Add a regression test for cross-tenant profile link denial.
- API audit logs should include route, API key id, merchant id, k-anonymity result, and result type.

Priority: P2 unless tests reveal leakage.

## Performance And Data Correctness

### Exact Counts

`getMerchantDataPresence()` uses exact counts, which is fine for small tables but can become expensive. Keep exact counts only where the UI displays the number. For `hasAnyData`, use existence checks or indexed head counts.

### Reports Row Limit

Reports grade distribution reads up to 2,000 transactions. See `app/(app)/reports/page.tsx:179-186`. Large merchants will get wrong grade distribution. Replace with SQL aggregate/RPC.

### Dashboard Evidence Count

Dashboard reads all evidence package rows just to count CE3 eligibility. See `app/(app)/dashboard/page.tsx:131-137`. Replace with two `head` counts.

### Customer KPIs

Customers KPI strip mixes filtered totals and current-page values. See `app/(app)/customers/page.tsx:377-381`. Replace with aggregate counts for the current filtered result set, or label clearly as "shown on page".

### Watchlist Appearance Count

Watchlist appearance count is not tenant scoped before filtering by watched profile IDs. See `app/(app)/watchlist/page.tsx:99-107`. After watchlist migration, count appearances by `merchant_id = ctx.merchantId` and `profile_id in watchlist`.

### Review Queue Definitions

Review-worthy logic has improved in helpers, but old code/comments still refer to grade/status variants. Keep one canonical function and ban ad hoc review-worthy filters.

### Route/Proxy Notes

The proxy uses `pathname.startsWith('/audit')` as a mobile allowed route. See `proxy.ts:54-67`. This also matches routes like `/audit-history`; be explicit with `/audit` and `/audit/`.

## Implementation Plan

### Phase 0 - Guardrails And Fixtures

Owner: product engineering

1. Freeze current palette tokens as the only allowed product UI palette.
2. Add seed fixtures for:
   - fresh merchant
   - Shopify-only empty
   - Shopify-only with data
   - helpdesk-only empty
   - helpdesk-only with data
   - fully connected empty
   - fully connected populated
   - CSV-only legacy
   - public audit unclaimed
   - public audit claimed
3. Add Playwright capture matrix for desktop and 1024px tablet.
4. Add a smoke assertion that no authenticated route renders a first-run gate when `MerchantDataPresence.hasAnyData = true`.

### Phase 1 - Tenant Model Hardening

Owner: backend/security

1. Migrate `watchlist_entries.merchant_id` to `merchants.id`.
2. Backfill legacy user-id rows.
3. Fix watchlist page/API/delete to use `ctx.merchantId`.
4. Fix evidence package note query.
5. Update RLS policies for customer profiles, appearances, evidence packages, watchlist entries, customer notes, and global identity tables.
6. Expand `createScopedClient`.
7. Add tenant isolation tests:
   - owner can read own data
   - active team member can read permitted data
   - unrelated user cannot read data
   - service-role helper cannot return cross-merchant child rows

### Phase 2 - Canonical State Services

Owner: full stack

1. Replace `getMerchantDataPresence()` with complete data presence service.
2. Add `getMerchantSetupState()`.
3. Refactor `PageConnectionGate` into:
   - `SetupStateGate`
   - `ConnectionPromptStrip`
   - `DataCompletenessBanner`
4. Apply the same service to Dashboard, Customers, Store, Reports, Watchlist, Evidence, Upload, and History.

### Phase 3 - Product IA And Page Rebuild

Owner: product/design/full stack

1. Dashboard:
   - Rebuild as attention cockpit.
   - Remove debug panel.
   - Use live data summaries, not CSV-run summaries.
2. Customers:
   - Fix empty state and CTAs.
   - Make KPIs aggregate-correct.
3. Store:
   - Build a native store overview.
   - Stop redirecting to audit detail as the primary behavior.
4. Reports:
   - Fix route/capture issue.
   - Use canonical data presence.
   - Move CSV into a sub-tab.
5. Watchlist:
   - Fix tenancy.
   - Make appearances and status meaningful.
6. Evidence:
   - Rename route/UI around evidence packages.
   - Fix PDF palette.
7. Upload/History:
   - Rename to import/backfill language.

### Phase 4 - Integration And Security Polish

Owner: backend/security

1. Require dedicated `PDF_SIGNING_SECRET`.
2. Replace or rotate Gorgias query-string secrets.
3. Add per-API-key scopes.
4. Add API v1 cross-tenant tests.
5. Add integration status health model:
   - connected
   - authenticated but stale
   - webhook unhealthy
   - sync pending
   - revoked
6. Add audit logging for unmask/copy/export actions.

### Phase 5 - QA And Release Criteria

Owner: QA/product engineering

1. Run Playwright matrix against every setup state.
2. Check screenshots for:
   - no overlapping text
   - no inappropriate blue/purple product UI
   - no CSV-first empty state outside import pages
   - no full gate when data exists
   - mobile unsupported behavior only where intended
3. Run security tests for every tenant table.
4. Run route smoke tests for:
   - `/dashboard`
   - `/customers`
   - `/customers/[id]`
   - `/customers/[id]/claims`
   - `/store`
   - `/watchlist`
   - `/chargebacks`
   - `/reports`
   - `/upload`
   - `/history`
   - `/settings/integrations`
   - public audit routes

## Prioritized Issue Register

| Priority | Issue | Files |
| --- | --- | --- |
| P0 | Evidence package can include notes from another merchant | `lib/evidence/buildPackage.ts` |
| P0 | Watchlist reads/writes use `user.id` instead of `ctx.merchantId` | `app/(app)/watchlist/page.tsx`, `app/api/watchlist/*` |
| P0 | Customer claim route throws/logs 500 when marking viewed | `app/(app)/customers/[id]/claims/page.tsx`, claim APIs |
| P1 | RLS policies still assume `auth.uid() = merchant_id` in multiple tables | `supabase/migrations/*` |
| P1 | `createScopedClient` table registry omits active tenant tables | `lib/supabase/scoped.ts` |
| P1 | Data presence helper misses major data sources | `lib/supabase/getMerchantDataPresence.ts` |
| P1 | Dashboard shows processing-job-driven sync and dev debug panel | `app/(app)/dashboard/page.tsx` |
| P1 | Store overview is a redirect wrapper | `app/(app)/store/page.tsx` |
| P1 | Reports uses incomplete data gate and row-limited aggregates | `app/(app)/reports/page.tsx` |
| P1 | Public audit claim/purge flows do not clearly re-tenant/delete all downstream rows | `app/api/public-audit/*`, `app/api/cron/purge-expired-audits/route.ts` |
| P1 | Settings integrations lack required-pair hierarchy | `app/(app)/settings/integrations/page.tsx`, `components/settings/ApiIntegrationsClient.tsx` |
| P1 | Gorgias webhook secret can live in query string | `lib/support/gorgias/settingsConnection.ts`, `lib/support/gorgias/webhookAuth.ts` |
| P2 | CSV language remains primary outside import pages | `app/(app)/upload/page.tsx`, `app/(app)/history/page.tsx`, dashboard/customers CTAs |
| P2 | Product UI has blue remnants | `components/settings/ApiIntegrationsClient.tsx`, `lib/evidence/pdf.tsx`, `lib/utils/investigationStatus.ts` |
| P2 | Workbench nav is stale and omits reports/watchlist | `components/workbench/workbenchNavItems.ts` |
| P2 | API keys need per-key scopes | `app/api/settings/api-keys/route.ts`, `lib/api/validateApiKey.ts` |

## Definition Of Done

This audit is implemented when:

- Every page renders correctly for every setup state in the seed matrix.
- Customers can exist without Dashboard, Reports, Store, or Watchlist acting empty.
- CSV is only primary inside import/history workflows.
- Dashboard has no dev debug UI and no processing-job-only sync truth.
- Watchlist uses `ctx.merchantId` everywhere and has migrated legacy rows.
- Evidence packages cannot read cross-merchant notes.
- RLS policies align to `merchants.id` plus active team membership.
- `createScopedClient` covers all tenant tables or fails closed for unknown tenant tables.
- Public audit claim and purge flows re-tenant or delete every downstream row.
- Gorgias/Zendesk/Shopify integration states are explicit and actionable.
- Reports use aggregates, not row-limited samples.
- Visual QA passes desktop and tablet screenshots with no overlap and no off-palette product UI.
- Security tests prove owner, team member, unrelated user, API key, public audit user, and anon behavior.

