# Implementation prompt — Phase 1: Safety, contracts, shell and shared foundations

> Execute this phase only. Do not begin a later phase. Treat this file as a self-contained implementation brief.

# Unauth authenticated product revamp — repository audit and implementation plan

**Audit date:** 12 July 2026  
**Repository:** `/Users/malikibrahim/Downloads/Unauth`  
**Scope:** authenticated merchant application, onboarding, authenticated utility routes, supporting API/read models, design system, permissions, source connections, seeded/demo states and tests  
**Method:** static inspection of the App Router manifest, route/layout/component trees, API and business logic, generated Supabase types and migrations; rendered verification against the local authenticated E2E merchant at desktop/tablet widths; targeted type, lint and unit baselines. No production data, schema, migration, environment or application-code changes were made.

## A. Executive assessment

### Verdict

Unauth is a technically substantial but product-incomplete system. The repository already contains a credible source-agnostic canonical entity layer, merchant-scoped permissions, event delivery, a financial ledger, rule evaluation snapshots, losses, recoveries, collaboration, notifications, workflows and connector capability concepts. The authenticated UI, however, exposes these capabilities as several disconnected generations of product. It currently feels like a payout-case queue with adjacent prototypes rather than one end-to-end payout-control and loss-recovery operating system.

**Current maturity: late alpha / early operational beta.** Payout Control, Integrations and Reports can demonstrate intent. They cannot yet support an enterprise sales claim that a user can move reliably from request to evidence, decision, realised loss, recovery and reconciled financial outcome without reconstructing context manually.

### Strongest existing areas

- The canonical database direction is strong: `source_accounts`, `source_records`, canonical customers/orders/lines/payments/transactions/refunds/replacements/fulfilments/shipments/tracking/returns/tickets/messages/disputes, `support_payout_cases`, append-only decisions/outcomes, loss attribution candidates, loss cases, recovery cases, work tasks, comments, notifications and workflows exist in generated types.
- Payout Control has meaningful queue filters, pagination, SLA states, assignment/snooze APIs, merchant-rule recommendations, outcomes, support context and case comments.
- Integration code explicitly distinguishes capability support from runtime availability and forbids high-risk automatic refund, denial and claim submission capabilities.
- Source setup communicates readiness, freshness, coverage and missing categories more honestly than most of the app.
- Tenant-scoped queries and `requirePermission` are common; append-only audit structures exist for consequential events.
- Reports avoid sample charts and use the canonical financial summary when available.

### Weakest existing areas

- **The connected-object experience is absent.** There are no order, shipment, ticket, refund, return, payment or dispute detail routes; Losses has no detail route; search often falls back to `/claims`; the customer/profile link from a case can resolve to a non-existent source-customer page.
- **The core lifecycle is not visible as one lifecycle.** Case, loss, recovery, task, exception, decision and financial entries use separate surfaces and partial projections. The live E2E merchant showed 17 payout cases, 17 exceptions, zero work tasks, zero loss records and one recovery.
- **Case review is not decision-ready.** The rendered case lacked an accessible `h1`, showed no requested action or amount-at-risk in the fixed header, displayed generic evidence instructions rather than the evidence set, and exposed a mixed legacy/current status list.
- **Financial meaning is inconsistent.** The Losses list labels `estimated_recovery_minor` as “Exposure”; customer/reports/dashboard projections mix legacy major-unit amounts with canonical minor-unit ledgers; mixed currencies are excluded in some totals but not consistently disclosed at the object level.
- **Administration is fragmented.** `/integrations` is canonical, `/settings/integrations` redirects out of Settings, while provider detail pages still live below Settings. Platform Settings rendered “Unable to load platform settings” in the audited tenant.
- **The visual system is layered rather than governed.** `app/globals.css` is 4,727 lines and redefines many central tokens up to four times. The root loads Inter/Inter Tight under legacy DM Sans variables, while the intended direction specifies DM Sans. There are extensive hard-coded colours and multiple chart/motion systems.

### Highest-risk usability and credibility problems

1. A user cannot reliably answer “what is the request, amount at risk, policy result, evidence, next action and consequence?” without scrolling and interpreting empty placeholders.
2. Losses can be empty while exposure and recoveries exist, making the financial story look internally inconsistent.
3. Work is not an operational queue: it has tabs but no assignment, update, bulk, saved-view or completion actions; exceptions are a separate duplicate workload.
4. Customer records can show contradictory totals and raw broken event copy (“Review status changed to undefined”).
5. Search advertises multi-object coverage but orders, tickets, shipments and transactions have no first-class destinations.
6. Onboarding says “Connect Shopify / Connect Gorgias / Widget is live,” offers Magento as a selectable platform, then the authenticated gate still requires Shopify and a helpdesk.
7. The app implements a responsive shell while middleware redirects phone user agents to “Desktop required”; a 1024px viewport still showed an “optimised for 1024px and wider” warning.
8. Navigation is not permission-filtered, has no real merchant switcher, and resolves multi-merchant users to their highest-privilege membership rather than a selected workspace.
9. Rules are editable and auditable in the backend, but version history, simulation, publish/rollback, conflict detection and historical evaluations are absent from the UI.
10. Demo seeding does not seed `loss_cases`, `work_tasks`, canonical decisions/outcomes, evidence links, comments or notifications, so the commercial demo cannot prove the full product.

### Recommended revamp approach

Do not rewrite the backend or introduce another component library. Treat the canonical source and operations model as the target, build a single case read model/BFF around it, and migrate the UI in vertical workflows. First reconcile status, money and object identity contracts; then rebuild the shell and detail framework; then ship the payout-case → loss → recovery lifecycle; then align customer/reporting/configuration surfaces. Keep legacy routes as measured redirects until links and tests show they are no longer used.

### Zero-trust implementation directive

For the purposes of this revamp, **nothing in the current authenticated interface is approved for direct visual reuse**. Existing code may be retained only as an implementation aid after its data contract, behaviour, accessibility, responsive layout, content, visual hierarchy and failure states have each passed the target specification in this document. “Keep” means keep the underlying capability or verified logic—not preserve the present rendering. “Refactor” does not mean reskin. Every route, view, tab, panel, table, card, drawer, modal, chart, form, filter, state and interaction must receive an explicit **replace, rebuild, consolidate, redirect, or retire** decision.

The implementing model must not infer that an omitted detail is acceptable because it already exists. If a current surface is not explicitly approved by an acceptance criterion, it remains unapproved. It must not copy current layouts, chart options, CSS classes or copy merely because they compile. It must work phase-by-phase, satisfy the route and component disposition ledgers, and stop for founder input only on the decisions explicitly identified as requiring it.

The definition of “top-tier” for each rebuilt surface is evidence-based rather than aesthetic: the user can identify the object, amount, state, source, owner, next action and consequence; can reach every connected record; can recover from loading/empty/partial/stale/error/permission states; can operate it with keyboard and at supported widths; and can reconcile every financial value to underlying records. Passing visual review alone is insufficient.

### Decision scorecard for major changes

| Change | Customer | Operational | Commercial | Effort | Technical/data risk | Reuse | Priority |
|---|---:|---:|---:|---:|---:|---:|---|
| Canonical case read model and status contract | High | High | High | High | High | Medium | P0 |
| Fixed decision-ready case header/workspace | High | High | High | High | Medium | High | P0 |
| Financial semantics and ledger reconciliation | High | High | High | High | High | Medium | P0 |
| Loss detail and recovery linkage | High | High | High | High | Medium | High | P0 |
| Work queue consolidation | High | High | High | Medium | Medium | High | P1 |
| Connected-object routes/search | High | High | High | High | Medium | High | P1 |
| Permission-aware shell and merchant selection | Medium | High | High | High | High | High | P1 |
| Token/component consolidation | Medium | Medium | High | Medium | Low | High | P1 |
| Rules/Flows publish and run history | Medium | High | High | High | Medium | Medium | P2 |
| Reports drill-down and saved definitions | Medium | High | High | High | Medium | High | P2 |


## Phase boundary and required outcome

### Phase 0 — Safety, contracts and evidence baseline

**Objective:** make the revamp executable without corrupting tenant, status, audit or financial semantics.  
**Scope/routes:** all active routes; no visual rollout. Capture desktop/tablet/mobile snapshots, route/redirect matrix, empty/partial/demo tenants, API/query baselines and key Web Vitals. Define canonical status, money, object-ID and source-provenance contracts. Add feature flags by vertical workflow, not by decorative component.  
**Components/files:** route manifest tests, `lib/canonical/*`, `lib/cases/*`, `lib/finance/financialLedger.ts`, `lib/permissions`, `lib/navigation/appRoutes.ts`, generated types and seed scripts.  
**Backend/migration:** review only first; then approve compatibility views/backfills for status, case decisions/outcomes, financial summaries and merchant customers. Never destructive.  
**Risks:** dual legacy/canonical writes, major/minor units, append-only tables blocking cleanup, stale generated types, service-role tenant leaks.  
**Tests:** tenant-isolation matrix, cross-module financial invariants, status transitions, idempotency, route redirects preserving IDs, seed repeatability.  
**Completion:** signed contract document; reconciled fixture for at least 20 cases across two currencies; route and source-object inventory in tests; rollback/flag plan; no unexplained ledger variance.

### Phase 1 — Foundations: shell, tokens and shared workbench

**Objective:** establish one orientation and interaction system.  
**Scope/routes:** App shell, Settings shell, all list/detail pages, search. Permission-filtered nav; active merchant selection; unread/source-health indicators; human breadcrumbs; canonical page/detail shells; URL filters/tabs/drawers; responsive navigation. Consolidate tokens, table, form, status, confirmation, state, provenance and object-link primitives. Remove prohibited chart styling/components from operational routes; establish the empty `DataVizFrame`/metric-definition contracts without inventing new charts.  
**Backend:** active merchant context and permission-filtered search.  
**Migration:** optional selected-workspace preference only; no domain migration.  
**Risks:** multi-merchant session switching, old CSS regressions, provider flows embedded in Settings.  
**Tests:** visual regression for every primitive/theme; keyboard/focus/escape; permissions; 320–1440 widths; search result permissions.  
**Completion:** every active page uses a supported shell/state pattern; no token is multiply declared within the authenticated theme; no phone UA block; sidebar only exposes authorised destinations.


The scope above is a hard delivery boundary, not permission to ignore dependencies. Inspect the current repository before editing, preserve verified backend capability, and rebuild every in-scope view/component from the assumption that its current presentation is not fit for purpose. Do not silently expand into later phases. If a later-phase dependency is needed, introduce the smallest typed seam or temporary compatibility adapter and record it in the handoff.

Completion means implementation, migrations where explicitly required, tests, accessibility checks, responsive verification, and a clean handoff—not a plan or visual mock-up. Do not mark the phase complete while any in-scope route, component, state, interaction, chart, or acceptance item is unverified.

## Relevant audited specification

## B. Complete authenticated route inventory

Status legend: **active** = purposeful current surface; **partial** = current but materially incomplete; **compat** = retained redirect/compatibility path; **hidden** = not in primary navigation; **utility** = authenticated route outside the app shell. Layout is `App` (`app/(app)/layout.tsx`), `Settings` (App + settings layout), `Root` or `Onboarding`.

| Route | Type/layout | Purpose, main component and data | Nav/status | Priority and notable issues |
|---|---|---|---|---|
| `/dashboard` | Page/App | Overview; `DashboardPageCockpit`; claims, recovery store, financial metrics, connection state | Sidebar; active | P1. Good operational summary but no period control, realised/prevented/recovered bridge or drill-down table. |
| `/work` | Page/App | Work queue + exceptions; `WorkQueue`, `ExceptionQueue`; `work_tasks`, `case_exceptions` | Sidebar; partial | P0. Read-only tasks, no saved views/bulk/ownership updates; duplicate exception workload. |
| `/exceptions` | Page/App | Automation exceptions; `ExceptionQueue`; `case_exceptions` | Hidden; active/partial | P1. Should be a Work view; 17 exceptions duplicated on Work in audited tenant. |
| `/claims` | List/App | Payout Control; `ClaimsPageView`, `ClaimsQueueClient`; cases, outcomes, source orders/tickets | Sidebar; active | P0. Strong filters, but card queue instead of operational table; evidence badge intentionally null in v2; `queue=evidence` shortcut is not a recognised queue parameter. |
| `/claims/[id]` | Dynamic detail/App | Canonical case workspace; `ClaimReviewPanel`; customer APIs, claims API, rules, support context | Linked; active/partial | P0. No `h1`; case-first server route feeds a legacy customer-first client model; generic evidence copy; stale recommendation; mixed status taxonomies. |
| `/losses` | List/App | Loss ledger; `LossLedger`; `loss_cases` | Sidebar; partial | P0. No detail route/actions; “Exposure” is `estimated_recovery_minor`; canonical loss amounts/evidence/candidates are not surfaced. |
| `/recoveries` | Board/App | Recovery board; `RecoveryBoardClient`; `recovery_cases`, cases/orders/tickets | Sidebar; active/partial | P0. Useful stages/actions, but no filters/owners/ageing/SLA/correspondence/reference/partial recovery controls; uses browser confirm/reload. |
| `/recoveries/[id]` | Dynamic detail/App | Recovery summary/activity; `WorkbenchPage`; recovery + events | Linked; partial | P1. Read-only, sparse, no source claim reference, correspondence, tasks, evidence objects or financial reconciliation. |
| `/customers` | List/App | Merchant customer directory; `CustomersOverviewPageView`; source customers/orders/cases + identity grouping | Sidebar; active/partial | P1. In-memory grouping cap, contradictory order KPI, duplicated identities and no saved views. The live table navigates directly to full profile; the apparent `CustomerIntelligenceDrawer` family is orphaned and must not be wired back unchanged. |
| `/customers/[id]` | Dynamic detail/App | Customer payout history; custom hero/main/sidebar; source customer/order/case + legacy identity projections | Linked; active/partial | P1. Repeats metrics, carries legacy risk fields, no connected order detail, broken activity copy, USD fallback can misstate source currency. |
| `/customers/[id]/claims` | Dynamic compatibility/App | Redirects to case when `claimId`; otherwise legacy new-case form | Hidden; compat/partial | P1. No permission passed to creation form; ambiguous route purpose. Replace with explicit `/claims/new`. |
| `/customers/[id]/evidence/new` | Dynamic form/App | Evidence package creation; `EvidencePackageForm` | Hidden; legacy active | P2. Duplicates drawer flow and legacy evidence-package model. |
| `/rules` | Page/App | Rules and Flows tabs; `RulesPageClient`, `FlowsTab` | Sidebar; active/partial | P1. Rules are credible basics; Flows is a minimal single-task form; tab state not URL-backed; no versions/test/publish/history. |
| `/partners` | Page/App | Partner rulebook; `PartnerRulebookClient`; partners/rules | Command palette only; partial | P2. Valuable recovery configuration is hidden; raw comma-separated configuration and no edit/version/effective-date UI. |
| `/reports` | Page/App | Payout/recovery analytics; ECharts components; cases/outcomes/recoveries/financial summaries | Sidebar; active/partial | P1. Honest data, but no underlying-record drill-down; “integration” tab aliases recovery; period comparisons and currency handling are incomplete. |
| `/integrations` | Page/App | Canonical setup centre; `SetupExperience`, `IntegrationHubClient`, advanced API settings | Sidebar; active | P1. Best current admin surface but duplicated setup/health projections, slow client loading, contradictory Gorgias states, 2,100+ line client, health component unused. |
| `/integrations/imports` | Page/App | Canonical CSV paste/import; `CanonicalCsvImportClient` | Hidden; active/partial | P2. Paste-only textarea, raw canonical fields, no file upload/history/downloadable error file/permission page shell. |
| `/notifications` | Page/App | In-app notifications; `NotificationCentre` | Header bell; partial | P2. No unread badge in shell, preferences UI, grouping or pagination. |
| `/settings` | Redirect/Settings | Redirect to `/settings/account` | Sidebar footer; compat | P3. Canonical href resolves through an extra redirect. |
| `/settings/account` | Page/Settings | Merchant profile, theme, password, delete | Settings tab; active | P1. Client-side hydration dispatch during render; old “fraudConcern” field names; destructive alert; no locale/currency terminology configuration. |
| `/settings/billing` | Page/Settings | Billing and credits; `BillingSettingsClient` | Settings tab; active | P2. Custom loading only; lint reports effect dependency warning. |
| `/settings/team` | Page/Settings | Invites/roles/audit; `TeamManagementClient` | Settings tab; active/partial | P1. Custom page layout, no permission matrix summary, labels still “analysts investigate customers.” |
| `/settings/platform` | Page/Settings | Reporting/matching/financial/workflow/connection defaults | Settings tab; partial | P1. One dense form; audited tenant rendered “Unable to load platform settings.” |
| `/settings/agreements` | Page/Settings | Upload agreements and manually approve extracted terms | Settings tab; partial | P2. No agreement list/detail/version/status; upload and verified-rule entry are fused. |
| `/settings/data-privacy` | Page/Settings | Scope, retention, deletion and legal links | Settings tab; active/partial | P1. Copy claims retention is plan-controlled but no retention control is exposed; inconsistent page shell. |
| `/settings/audit-trail` | Page/Settings | Merchant actions and case events; `AuditTrailClient` | Settings tab; active | P1. Valuable but separate from object timelines and custom layout. |
| `/settings/api-integrations` | Redirect/Settings | Redirect to settings integrations then canonical Integrations | Hidden; compat | P3. Double conceptual redirect. |
| `/settings/integrations` | Redirect/Settings | Preserves query then redirects to `/integrations` | Settings tab; compat | P1. Settings navigation unexpectedly exits Settings. |
| `/settings/integrations/shopify` | Provider detail/Settings | OAuth/sync/disconnect | Linked; active | P1. Keep as canonical connection detail or move under `/integrations/shopify`. |
| `/settings/integrations/gorgias` | Provider detail/Settings | Sync + widget setup | Linked; active | P1. Two setup clients and state sources; canonical hub showed conflicting connection status. |
| `/settings/integrations/freshdesk` | Provider detail/Settings | Credential/support sync | Linked; active | P2. Provider-specific legacy architecture; lint effect warning. |
| `/settings/integrations/zendesk` | Provider detail/Settings | App/support setup | Linked; active | P2. Provider-specific legacy architecture. |
| `/settings/integrations/chrome` | Provider detail/Settings | Extension setup/API keys | Hidden; active | P3. Adjacent utility, not a source connection; should be an access channel. |
| `/settings/integrations/woocommerce` | Redirect/Settings | Redirect to settings integrations | Hidden; compat | P3. Backend connection routes exist while UI redirects. |
| `/settings/integrations/bigcommerce` | Redirect/Settings | Redirect to settings integrations | Hidden; compat | P3. OAuth/webhook APIs exist while UI redirects. |
| `/apply` | Page/App | Founding merchant application after completed audit | Hidden; active campaign | P3. Product-shell route tied to legacy completed sync-job prerequisite. |
| `/help` | Page/App | Help index and shortcuts | Sidebar footer; active/partial | P2. Mostly links back to product, not searchable documentation; custom shell. |
| `/help/integrations/yuma` | Guide/App | Gate API setup for Yuma | Help only; active | P3. Static example, no connection health/test result. |
| `/help/integrations/siena` | Guide/App | Gate API setup for Siena | Help only; active | P3. Static example, no connection health/test result. |
| `/help/confidence-grades` | Redirect/App | Redirect to Help | Hidden; compat | P3. Legacy identity-risk concept. |
| `/help/how-it-works` | Redirect/App | Redirect to Help | Hidden; compat | P3. Legacy article path. |
| `/help/identity-matching` | Redirect/App | Redirect to Help | Hidden; compat | P3. Legacy identity-risk concept. |
| `/lookup` | Redirect/App | Email query mapped to Customers search | Hidden; compat | P3. Also intercepted by `proxy.ts`. |
| `/global` | Redirect/App | Redirect to Customers | Hidden; compat | P3. Also intercepted; legacy cross-merchant product. |
| `/watchlist` | Redirect/App | Redirect to Customers | Hidden; compat | P3. Legacy denial-list implication. |
| `/catches` | Redirect/App | Redirect to Claims | Hidden; compat | P3. Legacy accusation language. |
| `/chargebacks` | Redirect/App | Redirect to Claims | Hidden; compat | P3. Legacy evidence-pack list files remain but are unreachable. |
| `/chargebacks/[id]` | Redirect/App | Redirect to Claims, discarding object ID | Hidden; compat | P2. Existing deep links lose context. |
| `/store` | Redirect/App | Redirect to Dashboard | Hidden; compat | P3. Legacy overview. |
| `/audit/[runId]` | Redirect/App | Redirect to Reports | Hidden; compat | P3. Run ID is discarded; historic audit deep link is not preserved. |
| `/audit-running` | Utility/Root | Authenticated backfill-running message | Hidden; utility | P2. Outside app shell, hard-coded brand styles, accepts email query for display. |
| `/onboarding` | Page/Onboarding | Profile + required connections | Auth gate; active/partial | P0. Shopify/Gorgias-first language contradicts source-agnostic architecture; Magento selectable but cannot satisfy gate. |
| `/mobile-unsupported` | Utility/Root | Phone redirect destination | Middleware; active | P1. Contradicts responsive requirements and existing mobile nav. |

### Modal, drawer, sheet and transient-state inventory

| Surface | Current component/use | Assessment |
|---|---|---|
| Command palette | Native `dialog`, `CommandPaletteSurface` | Good keyboard basis; multi-entity search is gated by `VIEW_CUSTOMERS`, lacks recent items and true previews. |
| Case context | Custom `CaseContextDrawer` from Work/Loss/Recovery | Useful continuity, but shallow and not based on shared `Drawer`; money formatting is ad hoc. |
| Customer summary | Orphaned `CustomerIntelligenceDrawer` family; live `CustomersTableClient` routes directly to `/customers/[id]` | **Not a current live pattern.** Build a new customer preview on the shared object-preview contract; do not reconnect the legacy drawer unchanged. Full forensic specification is in “Customer preview drawer” below. |
| Rule builder/templates | Shared `Drawer` | Reusable; needs versions, simulation and publish semantics. |
| Evidence package | Shared `Drawer` and full page | Duplicated interaction and legacy model. |
| Integration setup/manage/sync/upload | Several custom modals/sheets inside `IntegrationHubClient`, `SetupExperience`, Shopify | Four competing modal patterns; consolidate. |
| API key create/revoke | Custom dialogs | High-risk actions need the shared confirmation pattern and audit acknowledgement. |
| Decision/recovery/exception confirmation | `window.confirm` | P0 interaction debt: no consequence summary, rationale, amount or audit context. |
| Account error/delete | `alert` plus in-page confirmation | Replace alerts; preserve deliberate typed confirmation. |
| Toasts | Page-local fixed elements or messages | No global toast provider, live-region policy, undo model or consistent duration. |

Loading/error coverage is concentrated on older Claims, Customers, Dashboard, Reports and Settings routes. Work, Exceptions, Losses, Recoveries, Rules, Integrations, Notifications, Partners, Help and most provider routes have no route-specific `loading.tsx`/`error.tsx`. There is no authenticated-group loading/error boundary; `app/global-error.tsx` is the last resort.

### Tabs, filters, panels and data-dependent subview disposition

| Parent surface | Current subviews/interactions | Required target disposition |
|---|---|---|
| App shell | Expanded/collapsed/hover sidebar, mobile overlay, avatar menu, command palette, breadcrumb override, demo/environment/credits indicators | Rebuild as one deterministic responsive state model. Permission/workspace/source/unread states are server-provided; overlay focus/escape/return is tested; dev/demo markers cannot obscure production actions. |
| Dashboard | No-source hero, partial-setup hero, sync-waiting hero, connected cockpit, completeness banner, attention/sync panels | Consolidate into setup, syncing/partial and operational states using the universal state contract. Current card positions and trend chart are not approved. |
| Work | Local `Open`, `In progress`, `Blocked`, `Approaching deadline`, `Completed`, `All` tabs plus appended Exceptions and case drawer | Replace with URL-backed saved views and shared filters. Counts are server-wide; Exceptions is one view; selection opens common preview. |
| Payout Control | URL queue tabs/counts, search/type/owner/source/status filters, current card queue, pagination, two charts | Replace with saved views/filter bar/table/preview. Retain only validated filter semantics; remove current-page/request-type and queue-health charts. |
| Payout detail | Header, context column, evidence rail, recommendation, action rail/form, manage/next-step/history/comments/toast | Re-map every region to the case-first workspace. No region survives by default; each must have canonical field ownership and state acceptance. |
| Losses | Ledger rows, empty list, case-context drawer | Replace with saved views/table/customer/case preview plus full loss detail and attribution/recoverability actions. |
| Recoveries | Fixed status columns, card action dropdowns, case-context drawer, read-only detail activity | Replace with queue/optional board and Summary/Evidence/Correspondence/Tasks/Activity detail tabs; action composer replaces dropdown-confirm-reload. |
| Customers | Compact filter bar, filter sheet/chips, server page controls, row/full-profile navigation, profile hero/main/sidebar/history | Keep filter intent but rebuild list and full profile; add the mandated URL preview. Every present profile panel is mapped to one of the target tabs or deleted. |
| Customer preview | Orphaned drawer, nested evidence drawer, narrative/verdict/case card/stats/density/history/notes | Replace exactly as specified; no nested overlay, verdict, density or “clean” state. |
| Rules | Client-local Rules/Flows tabs, rule cards, builder/template drawers, toggles/reorder/delete | Split URL routes; rebuild versioned rules and workflows. All high-consequence actions use publish/version/audit flows. |
| Reports | Current URL `overview` and `recovery` tabs, ranges, KPI/gauge/chart cards, export | Replace with defined report areas and shared scope controls. Tables/definitions/drill-down precede any admitted chart. |
| Integrations | Setup summary, category/provider rows, setup/manage/sync/upload/custom dialogs, provider-specific pages | Consolidate catalogue, connection detail, sync runs/health and setup stepper. One overlay/confirmation system; no provider-specific visual shell. |
| Settings | Account/Billing/Team/Platform/Integrations/Agreements/Data privacy/Audit tabs/pages plus redirects | Rebuild secondary IA with one shell/form/state model. Redirects preserve intent; unavailable/permission states are explicit. |
| Notifications/search | Notification list/read action; command results grouped by type with fallbacks | Rebuild pagination/grouping/preferences/unread and canonical preview/detail destinations. Empty, stale target and permission-loss states are explicit. |
| Forms/overlays globally | Raw dropdowns, filter sheets, custom provider modals, API-key dialogs, browser confirms/alerts, local toasts | Replace with shared fields, popover/menu, filter drawer, modal/drawer, confirmation and toast/live-region contracts. Inventory and remove every bespoke implementation during its owning phase. |

## C. Current information architecture

```text
Authenticated shell
├─ Overview
│  ├─ Dashboard
│  └─ Work
├─ Operations
│  ├─ Payout Control
│  ├─ Losses
│  ├─ Recoveries
│  └─ Customers
├─ Configure
│  ├─ Rules and Flows
│  └─ Integrations
├─ Outcomes
│  └─ Reports
└─ Footer
   ├─ Help
   └─ Settings
```

Hidden but active: Exceptions, Notifications, Partners, Imports, provider setup pages, Agreements, Audit Trail, application form, Yuma/Siena guides. Hidden legacy redirects: Store, Lookup, Global, Watchlist, Catches, Chargebacks and historic audits.

Major dead ends and duplication:

- Work, Exceptions and Notifications represent overlapping action demand without one queue model.
- Loss rows open case context rather than a loss; no `/losses/[id]` exists.
- Orders/tickets/shipments/transactions in search often land on a case or generic queue; no object detail system exists.
- Rules and Flows are correctly distinguished in copy but share client-only tab state and no lifecycle/history model in UI.
- Integrations has three overlapping layers: `SetupExperience`, the older `IntegrationHubClient`, and unused `IntegrationCentre` health UI; provider details live under Settings.
- Customer list → drawer → full profile → case history → case can preserve context only through manual back navigation; tab/filter/scroll state is not encoded.
- The `WorkbenchPage` still accepts `navItems`/`activeNavKey`, but explicitly ignores them; `/partners` was marked workbench-visible but is only discoverable through command search.
- Sidebar is generated from central route metadata but not filtered by the current user's permissions.

## D. Proposed information architecture

### Primary navigation

1. **Overview** — executive and operational health, not “Dashboard.”
2. **Work** — a unified queue for cases, evidence tasks, loss attribution decisions, recovery follow-ups, sync exceptions and mentions.
3. **Payout Control** — payout-case list and detail.
4. **Loss & Recovery** — secondary nav: **Losses**, **Recoveries**, **Partners & agreements**.
5. **Customers** — customer context directory.
6. **Reports** — secondary nav: **Performance**, **Loss causes**, **Recovery**, **Operations**, **Data coverage**.
7. **Configure** — secondary nav: **Rules**, **Flows**, **Integrations**.

Keep Notifications in the header; keep Settings and Help in the account/footer area. Make all items permission-aware. Show plan locks without allowing a click to end in a redirect loop.

### Proposed routes

```text
/overview                              replaces /dashboard label; keep redirect
/work?view=&owner=&status=&source=
/payout-cases                          canonical label; retain /claims redirect
/payout-cases/[caseId]?tab=
/payout-cases/new
/losses
/losses/[lossId]?tab=
/recoveries
/recoveries/[recoveryId]?tab=
/partners
/partners/[partnerId]
/customers
/customers/[customerId]?tab=
/orders/[orderId]
/shipments/[shipmentId]
/tickets/[ticketId]
/refunds/[refundId]
/returns/[returnId]
/disputes/[disputeId]
/reports?view=&range=&currency=&filters=
/rules
/rules/[ruleId]?version=
/flows
/flows/[flowId]?tab=runs
/integrations
/integrations/[connectionId]
/settings/{workspace,team,permissions,notifications,financial,security,data,billing,audit}
```

Route renaming is not a prerequisite for the revamp. Internally, keep `/claims` during Phases 0–3 and introduce aliases only after analytics and link migration. User-facing copy should say “payout case.”

### Connected-object model

Every detail page should share an identity header and object switcher, while allowing task-specific bodies:

- identity: object type, human reference, source ID/provider, current state and freshness;
- financial strip: requested payout, paid/compensated, realised loss, recoverable and recovered values;
- ownership: current owner, SLA/deadline and next action;
- connected records: customer, order, shipment, ticket, refund/replacement, return/dispute, loss and recovery;
- activity: evidence, rule evaluations, decisions, outcomes, tasks, comments and immutable audit events.

Use full pages for primary work objects and high-consequence decisions. Use a right drawer for quick previews and selection without losing queue state. Use modals only for bounded confirmations/forms. Persist list view, filters, sort, selected tab and preview object in the URL; restore scroll position when closing a drawer.

### Breadcrumbs and search

- Breadcrumbs should use human references, never truncated UUIDs; the current override mechanism is reusable.
- Search should group Customer, Payout case, Order, Ticket, Shipment, Refund, Return, Dispute, Loss and Recovery. Each result must show type, human ID, source, state, primary amount and updated time, then deep-link to its real object route.
- Permission-filter results server-side per object, not by requiring `VIEW_CUSTOMERS` for the whole command centre.
- Add recent objects and keyboard actions only after direct destinations exist. Do not add fuzzy matching until exact ID/email/order/tracking/provider-reference behaviour is measured.

## E. Page-by-page audit and target specification

The route inventory records every low-priority and compatibility page. This section specifies every active product area. Complexity is S/M/L/XL; dependency indicates the main blocker. Unless stated otherwise, every page must provide scoped loading, no-data, partial/stale-source, permission-denied, not-found and failed-request states; preserve URL state; meet WCAG 2.2 AA keyboard/focus/contrast requirements; and avoid horizontal document overflow.

### Global shell and onboarding

| Surface | Current strengths | Current weaknesses | Target layout/actions/connectivity | Mobile, performance, data and acceptance |
|---|---|---|---|---|
| App shell | Central route metadata; collapsible/mobile sidebar; breadcrumbs; command palette; context credits; demo/environment indicators | No merchant switcher; no permission filtering; notification count absent; breadcrumb map incomplete; hover-expand can surprise; 56px header plus 240px sidebar; multi-merchant context is implicit | Permission-filtered 224px rail with collapsed icon mode; real workspace switcher; global Create/Search; unread indicator; compact source-health alert; human breadcrumbs; command search. Primary action stays page-owned | **L/P1.** Add explicit selected merchant membership/session contract. At 768–1023 use overlay nav; under 768 retain read-only/essential workflows instead of middleware block. Acceptance: current merchant is explicit, focus order is deterministic, denied routes never appear, route/filter state survives navigation. |
| Onboarding | Collects merchant profile and source applicability; shows connection progress | Hard-coded Shopify/Gorgias/widget journey; Magento is selectable but gate requires Shopify; setup-complete is saved before required connections; no sync verification or first-value handoff | 5 stages: business context → commerce source → helpdesk/case intake → optional evidence sources → verify coverage and open first case. Source category first, provider second. “Skip with limited mode” where safe | **L/P0.** Change gate to `orderSourceConnected` and supported helpdesk/manual intake, not Shopify boolean. Acceptance: every offered platform has an achievable path; finish requires a verified source or explicitly limited mode; failure/reauth resumes safely. |
| Mobile unsupported | Protects an unoptimised experience | Directly contradicts responsive requirement and existing mobile UI | Remove phone UA redirect after core routes pass responsive tests. Until then, allow Overview, Work, case summary and notifications; disable only unsafe dense editors with route-local explanation | **M/P1.** Acceptance: no global phone redirect; 320/375/768/1024/1440 matrices pass; no warning appears at the exact supported breakpoint. |

### Overview

**Current purpose/strength:** aggregates open exposure, recovery counts, evidence gaps, likely owners, trend and connection state with truthful empty setup variants.  
**Weaknesses:** repeats exposure twice, uses a generic case-count trend, omits realised loss/prevented/recovered bridge and change drivers, has no period/currency control, and labels attribution rows “likely loss owners” without direct record drill-down.

**Target:** a two-audience page. The first row is a reconciled value bridge for the selected period/currency: requested exposure → paid customer compensation → prevented payout → realised loss → recoverable → recovered → outstanding/write-off. Implement the first release as labelled, reconciled amount steps plus a records table—not by reusing the current chart styling. The second row is “Needs attention” grouped by value/SLA. Below it show loss causes/owners, recovery ageing and source health as ranked drill-down lists by default. A chart may be introduced only after the underlying table and metric contract pass and only when it answers a time/change question better than the table.

**Primary actions:** Open Work; review high-value cases. **Secondary:** change period/currency, export, inspect source health.  
**States:** no sources, partially connected, syncing, no financial entries, mixed currency, stale data, ledger reconciliation failure.  
**Complexity/dependency:** L/P1; canonical `case_financial_summaries`, loss/recovery linkage and comparison queries.  
**Acceptance:** all displayed money derives from ledger summaries; mixed currencies are separated or converted with an explicit method; every KPI drills to matching records; an executive can answer exposure/loss/prevention/recovery/attention within 30 seconds.


## F. Shared component and design-system audit

| Area | Existing | Decision |
|---|---|---|
| Shell/navigation | `Sidebar*`, `AppHeader`, `BreadcrumbOverrideContext`, `NavigationProvider`, `RouteProgressBar` | **Refactor/reuse.** Add permission/workspace inputs, mobile contract, unread/source state; keep route progress and breadcrumb override. |
| Page shells | `WorkbenchPage`, `DetailPageShell`, two `SettingsPageShell` import paths, custom page layouts | **Consolidate.** One list page shell, one detail shell, one settings shell. Remove deprecated workbench nav props. |
| Cards/metrics | `PanelCard`, `SectionCard`, `Card`, `ModuleCard`, `MetricCard`, analytics KPI cards and page-local metric cards | **Consolidate.** Keep Panel/Section + one Metric primitive with density/semantic variants; retire duplicates. |
| Tables | Generic `DataTable`, customer table, loss table, integration table, card queues | **Refactor.** Add keyboard rows, selection, sticky header, server sort/filter/pagination, column definitions, empty/error/skeleton slots. Use for Work/Payout/Loss/Recovery/Customers. |
| Filters/tabs | Page-local links/buttons, customer filter sheet, claims URL filters | **Create shared.** URL filter bar, saved-view picker, responsive filter drawer, accessible tabs tied to URL. |
| Forms | `Input`, `Select`, many raw controls and page-specific styles | **Create shared field system.** Label/help/error, money/date/user/source inputs, validation summary and dirty-state guard. |
| Status | `Badge`, `StatusBadge`, confidence/grade badges, page-local status pills | **Consolidate.** Object-specific canonical status maps; never infer semantics from arbitrary status strings. |
| Drawers/modals | Shared `Drawer`/`Modal` plus several custom dialogs and browser confirms | **Replace custom patterns.** Add focus restoration, escape/body lock to Modal, shared confirmation with consequence summary and typed high-risk variant. |
| Evidence | Evidence package components, payout evidence cards, evidence strength, generic case rail | **Build canonical `EvidenceGroup`/`EvidenceItemRow`** backed by `evidence_items/evidence_links`, with source, freshness, relevance and missing/unavailable/conflict states. |
| Connected objects | `RelatedRecordsPanel`, case/customer context drawers, source badges | **Build `ConnectedObjectLink`, `ObjectPreviewDrawer`, `SourceProvenance`.** Reuse relationship APIs after canonical route targets exist. |
| Activity/audit | Claim events, customer activity, recovery events, comments, settings audit | **Build one typed timeline renderer** with event adapters, actor/source/before-after and deep links. Unknown payloads render safely, never `undefined`. |
| Tasks/comments | `WorkQueue`, `ExceptionQueue`, `CaseComments`, mentions | **Refactor.** Shared owner picker, SLA badge, task row/editor and comment thread; connect to all primary objects. |
| Charts | ECharts wrapper/theme, legacy chart components, Recharts dependencies and CSS/SVG mini-graphs | **Reject and replace the current visual layer.** Remove prohibited instances, retire dead stacks, and retain ECharts only as a low-level renderer for newly admitted visual forms after metric/table/drill-down contracts pass. |
| Motion | Framer Motion, Motion and CSS transitions | **Standardise on CSS for routine state and one library only where needed.** Respect reduced motion. |
| States | `EmptyState`, skeleton sets, `ErrorBoundaryUI`, many local paragraphs | **Consolidate** into page/list/inline state components with retry, source context and request ID. Add route boundaries for every active area. |

Accessibility defects to fix in foundations: clickable table rows are not keyboard controls; shared `Modal` lacks focus trap, focus restoration, Escape and body-scroll lock; some custom sheets have no dialog semantics; case detail has no `h1`; browser confirmations are not contextual; focus styles are inconsistent on raw controls; charts need textual/tabular alternatives; and status cannot rely on colour alone.

## G. Design-system proposal

1. **Token architecture:** split authenticated tokens from landing tokens. `app/globals.css` should import scoped `styles/tokens/base.css`, `light.css`, `dark.css`, `type.css`, `utilities.css`; a token name is declared once per theme. Keep a temporary compatibility layer with deprecation comments and tests. Eliminate the current four-fold redefinitions.
2. **Brand:** authenticated canvas `#F4F3F1`/warm cream, white work surfaces, espresso `#1C1008`, rust `#7B2D26`; use rust for actions/selection, not every information signal. Avoid white-on-white page bands seen in the current last-declared tokens.
3. **Typography:** use DM Sans intentionally (or founder-approved Inter, but not Inter masquerading under DM Sans variables), DM Mono for IDs, timestamps and tabular amounts. Scale: 28/34 page title, 20/26 section, 16/24 body, 14/20 dense body, 12/16 caption, 11/14 label. Minimum 12px for non-decorative UI.
4. **Spacing/density:** retain 4px base. Operational tables 40–44px row, default tables 48–52px, decision forms 36–40px controls. Page max width 1,600px; detail investigation width is not card-stacked arbitrarily.
5. **Borders/radii/shadows:** 1px warm-neutral borders; radii 4/6/10 only; shadow only for overlays, selected floating previews and sticky elevation. Remove decorative nested-card shadowing.
6. **Surfaces:** canvas, surface, inset, hover, selected and overlay are distinct. A nested card cannot be visually identical to its parent.
7. **Status colours:** green = completed/recovered/evidence present; amber = waiting/limited/attention; red = failed/overdue/destructive, not “fraud”; blue-grey = informational; rust = selection/action. Every status includes text/icon.
8. **Iconography:** Lucide only; 16px controls, 14px dense data, 20px section empty state. No mixed bespoke icons except brand/source logos.
9. **Tables/forms:** one density contract, sticky headers, visible focus, 44px touch targets at narrow widths, numeric right alignment, currency code where ambiguous, validation adjacent to fields and at form summary.
10. **Charts:** no current chart is visually approved. Default to exact metrics/ranked tables; prohibit donut, gauge, decorative sparkline/density and gradient/animated charts; admit only the forms and frame defined below with source/period/currency, data table and exact-record drill-down.
11. **Motion:** 100ms hover/focus, 160–180ms drawer/tab transition, 200–240ms modal; no layout animation for financial/status changes; `prefers-reduced-motion` removes non-essential motion.
12. **Dark mode:** either support and test every authenticated primitive or remove the user-facing switch for this revamp. Current `[data-theme=dark]` and unused `.dark` systems must be reconciled.

### Chart, graph and data-visualisation replacement specification

**Decision:** the present authenticated chart aesthetic and component contracts are rejected. Do not restyle them in place or carry their option objects forward. The repository currently mixes ECharts and Recharts, SVG/CSS mini-graphs, gradient fills, animated lines, donuts, gauges, stacked colour strips and chart-like metric cards. Most are disconnected from record drill-down, comparison definitions and accessible data. Keep ECharts only as a possible low-level renderer after the new semantic contracts exist; it is not an endorsement of `components/analytics/*` as designed today.

**Visualisation admission test.** A chart is permitted only if all answers are yes:

1. Does it answer a named operating or financial question that is materially harder to answer from a number or table?
2. Is its metric definition, period, timezone, currency and source coverage explicit?
3. Can every point, bar or segment drill to the exact server-filtered records behind it?
4. Is the same dataset available as an adjacent accessible table/download?
5. Does it remain truthful for zero, one, sparse, large, negative, partial, stale and mixed-currency data?
6. Can it be understood without colour, hover, animation or a legend detached from the data?

If any answer is no, use a KPI with comparison, a ranked table, a value row or a record list. The implementation model may not add a chart merely to fill a card or create a dashboard appearance.

#### Current authenticated chart-instance disposition

| Current instance | Current problem | Required outcome |
|---|---|---|
| Dashboard `WeeklyTrendChart` (“Support payout cases over time”) | Gradient area fill, generic case count, fixed eight weeks, no comparison, no drill-down, Recharts-specific animation/CSS | **Remove in Phase 1.** First ship period selector + current/prior case counts + weekly data table linking to `/claims` filters. Add a new restrained line chart in Phase 5 only if trend shape remains a validated executive need. |
| Claims `AnalyticsDonutChart` (“Queue health”) | Donut is difficult to compare, duplicates queue filters, mixes open/unread/overdue/resolved concepts, sits below pagination and may describe only loaded/derived scope ambiguously | **Delete.** Replace with clickable saved-view counts and value/SLA summaries above the table, each server-derived from the full filtered scope. |
| Claims `AnalyticsHBarChart` (“Current page request types”) | Describes only the current page, is not decision-critical and can misrepresent the full queue | **Delete.** Request type remains a filter/group option with count and amount; no queue chart. |
| Reports six `AnalyticsGaugeCard` instances | Gauges waste space, imply targets/quality thresholds that are not defined and make exact comparison difficult | **Delete component and usages.** Replace each with numerator/denominator, percentage, target if founder-defined, prior-period delta, definition and drill-down. No semicircular gauges. |
| Reports payout-action, evidence-gap, case-reason, final-outcome, recovery-status, partner-performance and recovery-ageing `AnalyticsHBarChart` instances | Repetitive cards, arbitrary colours/heights, weak hierarchy and no underlying-record selection | **Replace.** Default to sortable ranked bar-tables: label, exact count, amount, share, delta, inline neutral bar and drill-down link. Use a true ageing distribution only when bucket shape matters. |
| Customer profile density/cadence bars in `CustomerProfilePageHero` and `CaseSummaryStrip` | Unlabelled/sparsely labelled decorative activity, time basis hidden in tooltip, generated relative to render time and not actionable | **Delete.** Replace with plain “last activity / frequency” facts plus an accessible chronological activity table. |
| `BehaviorRoadmap` `DensitySvg` and glyph timeline | Decorative micro-chart, tooltips/shape dependence and legacy risk-event language | **Delete from preview.** Rebuild the full-profile activity feed using source-labelled icons/text and filters; no density strip. |
| `GradeDistBar` | Confidence-grade distribution belongs to the older identity-risk product and colour segments do not support the post-purchase loss proposition | **Retire from authenticated merchant UI.** If an internal diagnostic still needs it, isolate it outside merchant routes with a separate internal design review. |
| `ReadinessFunnel` | CSS stacked bar uses “CE 3.0” legacy evidence terminology and suggests a funnel without an actual stage flow | **Delete.** Evidence readiness becomes explicit requirement counts and missing-item task list. |
| `MetricCard.microchart` slot and chart-draw motion | Encourages unlabeled decorative sparklines and animation | **Remove the slot from the approved authenticated Metric contract.** A trend requires a labelled chart frame or a textual delta. |
| Unused Recharts `DonutChart`, `HBarChart`, clients and CSS animation | Second rendering stack and dead authenticated-era code | **Delete after import verification.** Remove Recharts if no remaining public/internal owner needs it; otherwise isolate it outside authenticated bundles. |
| `AnalyticsBarChart` and `AnalyticsLineChart` | Currently not in the authenticated route graph, but their options preserve rejected gradients/animation/empty rendering | **Do not promote them.** Delete or replace with new contracts after checking public demo ownership. |
| `NetworkMetricsCharts*` and network/globe visuals | Not part of the target merchant operating product; risk of reintroducing broad fraud/network-dashboard framing | **Exclude from authenticated revamp.** Any internal route gets separate scope, access control and design system. |

#### Approved replacement forms

| Form | Permitted use | Required construction |
|---|---|---|
| Metric row/card | One exact value and comparison | Label, exact value, ISO currency/unit, prior-period absolute and percentage delta, definition popover, `asOf`, source-coverage state and drill-down. Never use large decorative icons, gradients or a microchart. |
| Ranked bar-table | Causes, owners, partners, evidence gaps, outcomes | A semantic table is primary. Columns: rank/label, exact count, exact amount, share, delta. A subtle single-colour bar may sit behind/in its own column on one common scale. Rows are links; “Other” is expandable. |
| Time series | A genuine trend over a user-selected period | Maximum two comparable series plus optional target. No area gradient. 2px neutral/rust line, direct end labels where possible, sparse grid, zero baseline when meaningful, explicit missing-data gaps, UTC/local timezone label, point drill-down and table view. Do not smooth lines in a way that invents values. |
| Financial value bridge | Requested → paid/prevented → loss → recovered/outstanding | Prefer labelled step rows in the first release. If a waterfall is later validated, positive/negative meaning is textual and patterned as well as coloured; every step reconciles to ledger records and the arithmetic identity is displayed. |
| Ageing distribution | Cases/recoveries by SLA/age bucket | Ordered mutually exclusive buckets with count and amount, explicit bucket boundaries and overdue threshold. A horizontal stacked bar is optional only alongside the table; no rainbow palette. |
| Cohort/coverage matrix | Source coverage or completeness across object types | Use a labelled table/matrix with text/icon states, not heatmap colour alone. Rows and columns have totals and links to missing/stale records. |

**Forbidden forms and styling:** donut/pie charts; gauges/speedometers; 3D; gradients or glow; glass panels; floating legends; rainbow categorical palettes; animated drawing/count-up; smoothed curves that imply unsampled values; dual axes; truncated axes that exaggerate change; chart cards without exact values; decorative sparklines; status encoded only by colour; auto-rotated labels; hidden “Other”; silent aggregation of currencies; and tooltip-only facts.

**Chart frame specification.** Any admitted chart uses a shared `DataVizFrame`: question as title, one-sentence interpretation-free subtitle, period/currency/timezone controls or inherited-scope label, definition/source button, data freshness, plot, always-visible legend/direct labels, “View data” toggle, download and exact-record drill-down. Use flat canvas/surface colours, no shadow, 1px border only when needed, 16px outer padding, 12px plot-to-caption gap and minimum 240px usable plot height. Axes use 12px text, at most five major grid lines and locale-aware compact labels; the accessible table retains full precision. Tooltip content is keyboard reachable, uses exact timestamp/value/series and never contains the only drill-down control.

**Semantic palette.** Use neutral ink/slate for comparison/context, rust only for the primary selected series, green only for completed/recovered/positive outcomes, amber for attention/waiting, and red only for failed/overdue/destructive—not for customer risk. Category charts default to one neutral scale and direct labels; categories are not assigned arbitrary brand colours. Ensure 3:1 graphical-object contrast and pair every semantic colour with label/icon/pattern.

**Data and performance contract.** Chart APIs return versioned metric IDs, definition version, timezone, currency, period boundaries, comparison boundaries, source coverage, freshness, bucket/point values and a canonical drill-down query. Aggregation is server-side and must match exports; current-page arrays are never chart inputs for full-scope claims. Large series are bounded/downsampled on the server with the method disclosed. Resize uses `ResizeObserver`; visualisation code is lazy-loaded below the fold; route text/table content does not wait for the renderer. Rendering failure falls back to the data table, not an empty card.

**Visualisation acceptance:** design review at 320/375/768/1024/1440/1920; zero/one/sparse/dense/negative/very-large values; long labels; light and dark only if dark survives; keyboard/screen-reader; reduced motion; Windows high contrast; print/export; mixed currency; stale/partial source; renderer failure. Automated tests reconcile each plotted value and its drill-down count against the same fixture/query. Snapshot-only chart tests are insufficient.

## H. Data and object-model gaps

Many “missing” experiences are UI/read-model gaps rather than absent tables. Changes below are explicit so the UI does not invent capabilities.

| Gap | Affected experience | Proposed change | Migration/backfill/source | Risk/priority |
|---|---|---|---|---|
| Canonical case summary/read model | Queue/detail/search/widget | Server BFF or SQL view joining case, customer, source objects, evidence summary, current rule evaluation, decision, financial summary, loss/recovery/task counts and freshness | View/API; backfill links only; mixed source/user | High/P0 |
| One case status contract | Case/queue/work/reports | Define canonical states/transitions; map legacy `pending/open/escalated/under_review/...`; remove legacy picker values after backfill | Migration + backfill + compatibility adapter | High/P0 |
| Decision/action/outcome compatibility | Case/financial/reporting | Valid combination schema and append-only canonical write path to `case_decisions`/`case_outcomes`; legacy projection becomes read compatibility | API change; backfill already partly exists; user-entered | High/P0 |
| Evidence summary and relevance | Case/work/loss/recovery | Link `evidence_items` through `evidence_links`; add relevance/requirement state and conflict/unavailable reason if not already metadata | Possible additive columns/view; backfill legacy claim/integration evidence; source-derived/user | High/P0 |
| True loss amount | Losses/detail/overview | Derive realised/estimated loss from `case_financial_summaries`/entries, not `estimated_recovery_minor`; store currency-consistent linkage | View/API; reconcile/backfill financial entries | High/P0 |
| Loss mutation/history API | Loss detail | Confirm attribution, assign owner, set recoverability, write off with immutable `loss_case_events` and financial effect | API; existing entities, possible event payload additions | High/P0 |
| Recovery correspondence/reference | Recovery | Expose/link external correspondence; add provider claim/reference, submission channel and appealed/partial amounts if metadata is insufficient | Additive fields/API; backfill where source metadata has refs | Medium/P0 |
| Task operations and unified exceptions | Work | CRUD/transition API for owner/status/priority/due/completion; project `case_exceptions` as task subtype or union read model | View/API; migration/backfill for existing exceptions | Medium/P0 |
| Canonical merchant customer | Customers/search/case links | Make `merchant_customers` the UI identity, map source customers and network identity; add stable display/source coverage projection | Migration/backfill from source customers/identity links | High/P1 |
| First-class object read APIs/routes | Order/shipment/ticket/refund/return/dispute | Object summary endpoints with connected relationships, provenance and permission scope | APIs/views; canonical tables already exist | Medium/P1 |
| Selected merchant context | Shell/permissions/all queries | Explicit active `merchant_id` session/cookie constrained to active memberships; do not choose highest role implicitly | Auth/session API; no business-data migration | High/P1 |
| Rule versions/drafts | Rules/traceability | `rule_definitions` + immutable versions or version columns/parent IDs; published pointer; simulations stored separately | Migration/backfill current rules as v1 | Medium/P1 |
| Workflow publish/edit semantics | Flows | New version on edit, published pointer, retry permissions; expose run/step history | API, likely additive columns/view; no backfill beyond v1 | Medium/P2 |
| Saved views | Work/Payout/Loss/Recovery/Customers/Reports | Merchant/user scoped view definition: route, filters, columns, sort, grouping, sharing | New table/migration; user-entered | Low/P2 |
| Reporting dimensions | Reports | Consistent cause, owner, team, source, time and currency dimensions/materialised summaries | Views/materialisation + backfill derived from existing objects | Medium/P2 |
| Retention/security settings | Settings/privacy | If offered, store policy, legal hold and purge state; otherwise remove unsupported copy | New settings/migration only if product commits | High/P1 |
| Demo coverage | Entire sales journey | Seed canonical financial entries, decisions/outcomes, evidence, loss, work, comments, notifications, recovery events and connector health with explicit sample provenance | Seeder only; no production backfill | Medium/P0 |

Current entity implementation status:

- **Strong/backend-operational:** merchants/members, cases, source customers/orders/tickets, rules/evaluations, recoveries, connector/source account foundations, financial entries/summaries, events and permissions.
- **Partially surfaced:** order lines, refunds, fulfilments, shipments/tracking, support messages, evidence, losses, tasks, notifications, comments, outcomes and audit history.
- **Schema/ingestion present but effectively disconnected from product UI:** payments, payment transactions, replacements, returns, disputes, merchant-customer aggregate, relationship/match resolution, workflow runs/steps, connector action runs and unmatched correspondence.
- **Mocked/seeded/demo:** `scripts/seed-demo-v2.mjs` seeds source customers/orders/tickets, support payout cases, legacy claim outcomes, recoveries, partners and rules only. It deliberately creates no live connection rows and does not seed the end-to-end loss/work/evidence/financial/collaboration lifecycle.
- **Legacy:** audit/identity/watchlist/evidence-package structures and APIs still influence copy, permissions, customer profile types and compatibility routes.

## I. Terminology and content proposal

| Current/inconsistent | Canonical term | Definition/use | Do not use when |
|---|---|---|---|
| Claim, dispute, support claim | **Payout case** | Connected operational record for a refund/replacement/credit/compensation request | Referring to a carrier claim, payment dispute or raw source ticket |
| Claim type | **Request reason** | Normalised post-purchase issue category | Describing the requested remedy |
| Requested action | **Requested action** | Refund, replacement, reship, credit, discount, investigation | Describing Unauth recommendation or merchant decision |
| Value at risk / exposure / loss | **Amount at risk** | Maximum requested payout/compensation before decision | Describing realised merchant loss |
| Approved refund | **Customer compensation** | Value paid/issued to customer across refund/replacement/credit | Assuming it equals merchant loss |
| Saved / caught / blocked | **Prevented payout** | Requested payout not issued because merchant decision/policy prevented it | No recorded merchant decision exists |
| Total estimated loss | **Estimated loss** | Provisional merchant loss with stated basis | Financial ledger confirms the loss |
| Confirmed loss | **Realised loss** | Ledger-confirmed merchant loss after compensation/cost effects | Only exposure exists |
| Recoverable | **Recoverable amount** | Supported value eligible for a defined recovery route | It is only a maximum estimate; label that explicitly |
| Approved recovery | **Recovered amount** | Money/credit actually received and reconciled | A counterparty only approved but has not paid |
| Outstanding | **Outstanding recovery** | Amount sought minus recovered/written-off | Mixing currencies |
| Likely loss owner | **Loss owner** / **Attribution candidate** | Confirmed accountable party / evidence-supported candidate | Confidence is insufficient for confirmed language |
| Recovery owner | **Recovery owner** | User/team responsible for next recovery action | Referring to accountable counterparty |
| Route | **Recovery route** | Carrier claim, supplier credit, 3PL claim, payment dispute, internal correction | It is only the next task |
| Evidence strength | **Evidence state** | Present, missing, unavailable, conflicting, or verified, with source | Implying truth/fraud probability |
| Recommendation/verdict | **Policy result** and **Recommended action** | Merchant rule result and non-binding next action | Calling it an autonomous decision |
| Rule fired | **Rule matched** | A named/versioned merchant rule matched its inputs | The system performed an action |
| Decision/outcome | **Decision** / **Outcome** | Merchant action choice / resulting operational or financial state | Combining them into one ambiguous select |
| Integration/source | **Connection** / **Source record** | Configured account / imported provider record | Describing a planned provider as connected |
| Sync | **Sync** | Pull/push import process with freshness and status | Generic “connected” when data is stale |
| Claim status | **Case status** | Canonical workflow state | Legacy “under review/high evidence/archived” values |

Credibility-damaging copy to remove or correct:

- “Clean record: no claims or chargebacks in your data” overstates incomplete source coverage.
- “Review status changed to undefined” exposes unvalidated event payloads.
- “Merchant-wide” on a merchant-scoped customer page is ambiguous and sounds cross-merchant.
- “Every merchant has exactly one [payment processor]” is not true for enterprise/omnichannel merchants.
- “Widget is live” should only appear after verified widget/webhook installation, not merely a helpdesk connection.
- Onboarding references “trust indicators,” “claim rate” and Gorgias throughout despite source-agnostic product direction.
- Error titles still say “Claim evidence unavailable”; use “Payout case unavailable.”
- Permissions still include “Fraud feedback,” “Watchlist,” “Inbox / Alerts” and “Saved Reports”; migrate labels and eventually constants.
- Search input’s accessible label says “customers, audits, evidence packages,” while results now include orders/cases/tickets/shipments/transactions/recoveries.
- “Approved recovery” in Reports/Overview must mean received/reconciled or be renamed “Counterparty approved.”


## File-level and component disposition requirements

## L. File-level implementation map

Only existing repository paths are listed. New files should be created inside the named existing directories during implementation; names require the implementing agent's normal design review.

| Existing file/directory | Current role | Intended change | Action | Dependencies/risk/phase |
|---|---|---|---|---|
| `app/(app)/layout.tsx` | Auth gate, merchant/connection/demo context, shell | Consume explicit selected merchant, permission nav model and source/unread summary; remove global mobile warning | Modify | Auth/tenant high; P1 |
| `proxy.ts` | Session, legacy/mobile/internal routing | Remove phone block after responsive pass; replace obsolete `merchants.user_id` API-header lookup; preserve legacy IDs/query | Modify | Security high; P0/P1/P7 |
| `lib/permissions/index.ts` | RBAC and implicit merchant resolution | Add explicit membership selection and route capability map; migrate legacy labels | Modify/split | Tenant high; P0/P1 |
| `lib/navigation/appRoutes.ts`, `lib/navigation/aliases.ts` | Route/nav metadata | Canonical IA, permission filtering, aliases with parameter preservation; remove dead tier metadata after entitlement alignment | Modify | Medium; P1/P7 |
| `components/nav/*`, `components/layout/*`, `components/navigation/*` | Sidebar/header/search/progress | Workspace switcher, authorised nav, unread/source state, human breadcrumbs, recent search, responsive focus handling | Refactor | Medium; P1 |
| `components/workbench/WorkbenchPage.tsx`, `DetailPageShell.tsx`, `components/ui/pageShellStyles.ts` | Page shells | Consolidate supported list/detail/settings layouts; delete deprecated nav props | Modify | Low; P1 |
| `app/globals.css` | All landing/auth tokens and legacy classes | Split/scoped token architecture; retain temporary compatibility imports; remove duplicate authenticated declarations | Split/replace carefully | Visual regression high; P1/P7 |
| `app/layout.tsx`, `lib/theme/preference.ts`, `components/settings/AppearanceSettings.tsx` | Fonts/theme | Resolve DM Sans vs Inter decision and `[data-theme]` vs `.dark`; test or remove dark switch | Modify | Medium; P1 |
| `components/ui/*` | Shared primitives | Consolidate cards/metrics/status/forms; make table rows keyboard-safe; fix Modal focus/escape/scroll; add confirmation/state/provenance primitives | Refactor/add/remove duplicates | Accessibility high; P1 |
| `components/analytics/*`, `components/charts/*` | ECharts, Recharts and legacy mini-visualisations | Reject current presentation/contracts; remove prohibited operational charts; build metric/table foundations and only new admitted visual forms with accessible data/drill-down | Replace/delete selectively | Medium; P1/P5 |
| `app/(app)/work/page.tsx`, `components/work/WorkQueue.tsx`, `components/exceptions/ExceptionQueue.tsx`, `app/(app)/exceptions/page.tsx` | Task and exception queues | Unified server-paginated Work table/drawer/actions; Exceptions becomes saved view/redirect later | Replace/refactor | Task API/backfill; P2 |
| `app/api/ops/exceptions/*`, `lib/exceptions/*`, `TABLES.WORK_TASKS` consumers | Exception/task operations | Unified read projection and mutation/audit contract | Modify/add API in existing route areas | Medium; P2 |
| `app/(app)/claims/page.tsx`, `ClaimsPageView.tsx`, `ClaimsQueueClient.tsx`, `claimsPage*` | Payout queue | Server filter contract, evidence/task summary, shared table/preview, URL saved views | Refactor/split | Performance/status; P2 |
| `app/(app)/claims/[id]/page.tsx` | Case gate/detail entry | Load canonical BFF and human reference; retain permission/read-only handling | Modify | High; P2 |
| `components/claims/ClaimReviewPanel.tsx`, `ClaimReview*`, `claimReviewState.ts` | Legacy customer-first case workbench | Replace with case-first regions; split data/mutations; eliminate invalid legacy state picker and local draft coupling | Replace/split; remove obsolete pieces after parity | Highest; P2 |
| `components/claims/payout/*` | Unused/partly used payout-specific cards | Reuse strong exposure/evidence/attribution/recovery components within canonical case workspace after contract alignment | Refactor/reuse | Medium; P2 |
| `lib/cases/*`, `lib/claims/*`, `app/api/claims/*` | Dual case read/write/state systems | Establish canonical read model/state/decision path; keep compatibility adapters; delete only after telemetry | Modify/consolidate | Highest; P0/P2/P7 |
| `lib/finance/financialLedger.ts`, `lib/events/handlers/financialProjection.ts`, `CASE_FINANCIAL_*` consumers | Ledger/projection | Make the only UI money source and expose reconciliation diagnostics | Modify/reuse | Highest; P0/P2/P3/P5 |
| `components/evidence/*`, `lib/evidence/*`, `lib/integrations/canonicalEvidence.ts` | Legacy packages/PDF and canonical mapping | Separate operational evidence items from dispute package export; canonical group/requirement/provenance components | Refactor/split | High; P2/P3 |
| `app/(app)/losses/page.tsx`, `components/losses/LossLedger.tsx`, `lib/losses/*`, `lib/accountability/*` | Thin loss list + classification | True amounts, table/views, detail/mutations/evidence/candidates | Replace/refactor | High; P3 |
| `app/(app)/recoveries/*`, `lib/recoveries/*`, `app/api/recoveries/*` | Board/detail/status | Queue/board, action composer, partial amounts, owner/correspondence/tasks/ledger | Refactor/split | High; P3 |
| `app/(app)/partners/*`, `lib/partners/*`, `app/(app)/settings/agreements/*`, `lib/agreements/*` | Partner rules/manual agreements | Connected partner/agreement details, versions/effective terms/approval | Refactor | Medium; P3/P6 |
| `app/(app)/customers/page.tsx`, `customersOverviewPage*`, `components/customers/*` | In-memory identity grouping, live full-page table navigation, orphaned legacy drawer family | Use merchant-customer projection and server table; build new URL-backed preview from object-preview contract; delete/replace legacy drawer/density/risk-era UI | Replace/refactor/delete | High identity risk; P4 |
| `app/(app)/customers/[id]/*`, `lib/customers/*`, `app/api/customers/*` | Rich legacy/source profile | Canonical customer tabs, connected objects, safe event renderer and currency/source state | Refactor/split | High; P4 |
| `app/api/search/route.ts`, `components/layout/commandPalette*` | Unified search with fallback destinations | Per-object permissions, canonical customer, loss/refund/return/dispute, true destinations and previews | Modify | Medium; P1/P4 |
| `lib/relationships/*`, `components/relationships/*`, `app/api/matches/*` | Relationship/match foundations | Power connected-object panel and ambiguous-match exception flow | Reuse/refactor | High matching risk; P4 |
| `app/(app)/dashboard/*`, `lib/dashboard/payoutDashboardMetrics.ts` | Overview | Ledger bridge, period/currency, attention and drill-downs | Refactor | Reporting/ledger; P5 |
| `app/(app)/reports/*`, `lib/claims/reporting.ts`, `app/api/reports/claims/route.ts` | Reports/export | Definitions, canonical period comparison, drill-down filters, multi-currency, export parity | Refactor/split | High metric risk; P5 |
| `app/(app)/rules/*`, `components/rules/*`, `lib/rules/*`, `app/api/rules/*` | Mutable ordered rules | Version/draft/test/publish/history; URL route separation from Flows | Refactor/add | Medium; P6 |
| `lib/workflows/*`, `app/api/workflows/*` | Event workflow engine and minimal API | Version publish/edit, conditions/actions UI, run/step/retry history | Modify/reuse | Idempotency high; P6 |
| `app/(app)/integrations/page.tsx`, `components/integrations/*` | Three overlapping setup/health UIs | Compose one catalogue/connection detail; split `IntegrationHubClient`; render canonical health | Replace/split/remove unused overlap | High; P6 |
| `lib/connectors/*`, `lib/integrations/registry.ts`, provider directories | Two registries/runtime models | Designate connector manifest/runtime SSOT; compatibility shim only | Consolidate | High integration risk; P0/P6 |
| `app/(app)/integrations/imports/page.tsx`, `components/imports/*`, `lib/imports/*` | Paste-based canonical CSV import | File/mapping/preview/history/error download; shared shell and permission handling | Refactor | Medium; P6 |
| `app/(app)/settings/*`, `components/settings/*`, `app/api/settings/*` | Fragmented admin pages | New secondary IA, supported shells/states, notification/security/financial sections; canonical integration redirects | Refactor/split | Medium/high permissions; P6 |
| `components/notifications/*`, `lib/notifications/*`, notification APIs | Simple list/preferences backend | Unread count, preferences, pagination/grouping and safe targets | Modify | Low/medium; P2/P6 |
| `scripts/seed-demo-v2.mjs` | Partial canonical demo | Seed complete case→evidence→decision→loss→recovery→work→ledger→audit lifecycle with sample provenance | Modify script only | Demo integrity; P0/P7 |
| `supabase/migrations/*`, `lib/supabase/types.ts`, `lib/supabase/tables.ts` | Schema history/types/constants | Add only reviewed additive migrations/backfills; regenerate types; no raw table strings in new code | Add migration/regenerate | Highest; all phases |
| `tests/current/*`, `tests/navigation/*`, `tests/api/*`, `tests/lib/*`, `tests/claims/*`, `tests/customers/*`, `tests/security/*` | Existing strong but legacy-heavy suite | Extend to new IA/journeys/contracts; retain financial/tenant/security suites | Modify/add | P0–P7 |
| Legacy route files under `app/(app)/{audit,catches,chargebacks,global,lookup,store,watchlist,help}` | Compatibility redirects/dead components | Instrument, preserve context, then delete dead components/routes only after retirement threshold | Modify/delete late | Link risk; P7 |

### Complete authenticated view and component disposition ledger

This ledger closes the difference between “all routes were listed” and “all rendered implementation surfaces were given a decision.” A static import walk from all authenticated `page`, `layout`, `loading`, `error` and `not-found` entries found **90 authenticated route-entry/boundary modules and 213 transitively imported component modules** at audit time. It also found 82 component modules outside that graph; that number includes public/internal code as well as authenticated-era orphans, so each must be checked before deletion. Section B owns all 53 built authenticated/auth-adjacent routes. The tables below own the view/component code that renders or previously rendered them.

The implementing model must create a migration checklist from this ledger before changing code. For every exact file or wildcard family it must record: current importer(s), target importer(s), disposition, test owner and deletion condition. A wildcard means every module in that directory—not only the named examples. No file may silently survive because it was overlooked, and no apparently inactive file may be deleted until public/internal/dynamic imports are checked.

#### Route-view module ledger

| Exact surface/family | Modules included | Mandatory disposition |
|---|---|---|
| Authenticated shell | `app/(app)/layout.tsx`, `not-found.tsx`, `global/{loading,error}.tsx` | **Rebuild/consolidate.** Permission/merchant-aware shell; one authenticated group fallback; human recovery paths. Do not preserve present spacing or mobile warning. |
| Dashboard | `app/(app)/dashboard/*` | **Replace presentation.** Keep verified metric/loading logic only; remove current trend/card composition and rebuild to the Overview specification. |
| Work/Exceptions | `app/(app)/work/page.tsx`, `exceptions/page.tsx` | **Replace/merge.** One work surface; keep `/exceptions` as measured compatibility view/redirect until links retire. |
| Payout list | `app/(app)/claims/{page,ClaimsPageView,ClaimsQueueClient,claimsPageData,claimsPageLogic,claimsPageUi,loading,error}.tsx/ts` | **Replace presentation and query contract.** Server-paginated table/saved views/preview; remove both current queue charts; preserve only validated filters/state mappings. |
| Payout detail | `app/(app)/claims/[id]/page.tsx`, `components/claims/ClaimReview*`, `claimReview*` | **Case-first rebuild.** Current component split is not an approved layout. Migrate verified draft/validation logic behind the canonical BFF; delete customer-first and legacy-status paths after parity. |
| Payout-specific cards | `components/claims/payout/*` | **Audit individually, then recompose or replace.** Delivery evidence, exposure, loss attribution and recovery capability may survive logically, but none is visually approved and every value must use canonical contracts. |
| Losses | `app/(app)/losses/page.tsx`, `components/losses/LossLedger.tsx` | **Replace and add detail.** No current card/drawer layout survives; build list/detail/actions and exact money semantics. |
| Recoveries | `app/(app)/recoveries/{page,RecoveryBoardClient}.tsx`, `[id]/page.tsx` | **Replace presentation/extend behaviour.** Queue-first default, optional board, full detail composer; remove browser confirmation/reload. |
| Customer directory | `app/(app)/customers/{page,CustomersOverviewPageView,CustomersOverviewFilterChip,CustomersPageActionBarLeft,CustomersPageWorkbench,customersOverviewPageUtils}.tsx/ts`, `components/customers/CustomersTableClient.tsx`, filter sheet files | **Replace list presentation and URL contract.** Canonical merchant-customer projection, server paging/saved views and new preview drawer. Existing full-page navigation-on-row is replaced. |
| Customer detail | `app/(app)/customers/[id]/{page,CustomerProfilePageView,CustomerProfilePageHero,CustomerProfilePageMainColumn,CustomerProfilePageSidebar,CustomerProfilePageParts,customerProfilePageLoad,customerProfilePageLabels,loading,error}.tsx/ts` | **Full layout/content rebuild.** Preserve validated source reads only. Delete density/cadence visuals, duplicated metric grids, unsupported risk/clean language and broken generic event rendering. |
| Customer compatibility/evidence | `app/(app)/customers/[id]/claims/page.tsx`, `evidence/new/page.tsx` | **Split/redirect deliberately.** New-case and evidence work use explicit case routes; preserve valid deep-link parameters and return state. |
| Rules/Flows | `app/(app)/rules/page.tsx`, `components/rules/*` | **Rebuild into separate versioned products.** Existing cards/drawers/forms are reference only; do not ship mutable published rules or a decorative flow canvas. |
| Partners/Agreements | `app/(app)/partners/*`, `settings/agreements/page.tsx` | **Rebuild/relocate.** One recovery-configuration information model with list/detail/version/effective-date/approval states. |
| Reports | `app/(app)/reports/*` | **Replace visual layer and metric contract.** Keep validated range/export logic only; remove gauges/current chart composition and follow the chart ledger. |
| Integrations hub | `app/(app)/integrations/page.tsx`, `components/integrations/{IntegrationHubClient,SetupExperience}.tsx` and all integration family modules | **Replace/consolidate.** One catalogue/detail/health model. Split oversized clients; no current modal/card layout is approved. |
| Imports | `app/(app)/integrations/imports/page.tsx`, `components/imports/*` | **Rebuild.** File upload/mapping/preview/commit/history/errors; present paste mode only as developer fallback if retained. |
| Settings shell | `app/(app)/settings/{layout,page,error}.tsx`, `components/settings/SettingsPageShell.tsx` | **Rebuild/consolidate.** One secondary navigation, permission model, page header/form/state contract. |
| Account/Billing/Team/Platform/Privacy/Audit/API | Every corresponding `app/(app)/settings/**/{page,loading,error}.tsx` and `components/{settings,billing}/*` | **Rebuild each screen against its Section E target.** Existing reducers/API logic may be reused after contract tests; current forms, dialogs, copy and page-specific shells are not approved. |
| Provider settings | `app/(app)/settings/integrations/{page,loading,error,shopify,gorgias,freshdesk,zendesk,chrome,woocommerce,bigcommerce}/**`, `components/{settings,shopify}/*` | **Consolidate into canonical connection detail templates.** Provider steps plug into shared shell; remove duplicated status/progress/modal implementations and false live providers. |
| Notifications | `app/(app)/notifications/page.tsx`, `components/notifications/*` | **Rebuild.** Paginated/grouped centre, unread shell state, preferences and safe targets. |
| Help and application | `app/(app)/help/**`, `apply/**` | **Reassess/rebuild or move outside core shell.** Static legacy language and campaign gating do not inherit approval. Every retained help page needs current terminology, search/navigation and ownership. |
| Legacy merchant routes | `app/(app)/{audit,catches,chargebacks,global,lookup,store,watchlist}/**` | **Redirect/retire.** Preserve IDs/query context, instrument usage, and delete unreachable detail components only after threshold. No legacy visual should be revived. |
| Root authenticated utilities | `/onboarding`, `/audit-running`, `/mobile-unsupported` files and auth/proxy gates | **Rebuild/retire per route specification.** Onboarding becomes source-agnostic; audit-running joins the product shell or secure status flow; phone block is removed after responsive acceptance. |

#### Active shared-component family ledger

| Family | Current modules/behaviour | Mandatory target decision |
|---|---|---|
| `components/nav/*`, `layout/*`, `navigation/*` | Sidebar, header, avatar, breadcrumbs, command palette, progress, skeletons | **Rebuild/consolidate.** One responsive, permission-filtered navigation system and one URL-aware object preview/search system. Verify every command result destination and focus transition. |
| `components/workbench/*` | Page/action/nav/KPI/empty shells with partially overlapping APIs | **Consolidate.** Create documented list/detail/settings shell variants; remove deprecated/unused `DetailPageShell` only after importer check. No arbitrary per-page card composition. |
| `components/work/*`, `exceptions/*`, `cases/CaseContextDrawer.tsx` | Read-only tasks/exceptions and shallow custom case drawer | **Replace.** Unified Work table/mutations and shared object preview; custom drawer must not survive beside new Drawer. |
| `components/claims/*` | Large customer-first workbench, local primitives/styles/state | **Replace presentation; selectively migrate logic.** Every module gets an explicit mapping to header/context/evidence/decision/action/activity target or deletion. |
| `components/evidence/*` | Legacy evidence-package form/drawer/preview/strength/readiness | **Reframe and consolidate.** Operational evidence requirements/items live in case; export packages are separate. Delete strength scores, CE jargon and nested drawer paths. |
| `components/customers/*` | Live table/filter plus orphaned drawer and legacy density/timeline visuals | **Replace as specified in Customer preview drawer.** No blanket reuse. Full-profile activity/provenance can be rebuilt from safe source data only. |
| `components/losses/*`, recoveries page clients | Thin ledger/board | **Replace.** Common queue/detail/action/provenance patterns, canonical money and task context. |
| `components/rules/*` | Local drawers/cards/builder/flow UI | **Replace layout/behaviour contracts.** Version, test, publish and history precede polish; accessible structured builder precedes canvas. |
| `components/analytics/*`, `components/charts/*` | ECharts/Recharts/mini visualisations | **Reject current visual layer.** Apply the full chart replacement specification; delete prohibited/orphaned components after ownership verification. |
| `components/integrations/*`, `settings/*`, `shopify/*` | Multiple connector cards/status/setup/modals/reducers | **Consolidate.** One manifest/status/setup primitive family; provider adapters supply fields/steps, not whole UI systems. |
| `components/imports/*` | Canonical paste importer | **Replace presentation and workflow.** Retain schema validation/security utilities behind staged import UX. |
| `components/notifications/*`, `collaboration/*`, `audit/CustomerNotes.tsx` | Notifications/comments/mentions/notes | **Consolidate activity and messaging primitives.** Preserve authorship/audit semantics; add pagination, safe mentions, optimistic rollback and live-region policy. |
| `components/relationships/*`, `sources/*`, `support/*` | Related records, match status, freshness/source, support context | **Rebuild/reuse logic selectively.** Power canonical connected-object links and provenance; no ambiguous match is silently resolved or risk-labelled. |
| `components/connections/*` | Connection state context/prompts/gates | **Consolidate.** One canonical source health model with partial/stale/degraded states; gates explain exact missing capability and route to the correct connection. |
| `components/product/*` | Feature gates, tier badges, locked previews, dev preview | **Reconcile or retire.** Entitlements must be server-enforced and commercially current; no misleading locked UI or dev switch in production. |
| `components/common/*` | Duplicate headers, demo/tracking banners, telemetry | **Consolidate/retire duplicates.** Banners use one priority/stacking contract; telemetry is non-blocking and consent/privacy compliant. |
| `components/mobile/MobileOptimizationNotice.tsx` | Warning combined with global phone block | **Delete after responsive rollout.** Route-local unsupported-editor notices only where genuinely needed. |
| `components/EmptyDashboardHero.tsx`, `PartialSetupHero.tsx`, `Onboarding/SetupSummaryCard.tsx` and onboarding state modules | First-use/partial-setup/dashboard handoff variants | **Replace/consolidate.** One source-agnostic setup-state system driven by verified capability/coverage, with exact resume action and no Shopify/Gorgias-only assumptions. |
| `components/automation/*`, dashboard auxiliary/orphaned widgets | Completion and older insight/savings/next-up/demo widgets | **Audit ownership then replace/delete.** Do not reintroduce generic savings, fraud insight or decorative dashboard blocks without target metric definitions. |
| `components/billing/*`, `apply/*` | Billing and application forms | **Rebuild with shared form/state/confirmation primitives.** Underlying provider calls require contract/security review. |

#### Shared primitive-by-primitive ledger

| Primitive/module | Decision and non-negotiable target |
|---|---|
| `ui/Button.tsx`, `ButtonLink.tsx`, `buttonStyles.ts` | **Consolidate.** Same sizes/variants/focus/loading/icon contract for buttons and links; destructive meaning explicit; no disabled-looking links that still navigate. |
| `ui/Badge.tsx`, `badgeStyles.ts`, `GradeBadge*`, `ConfidenceBadge*`, `GradeHeader.tsx`, `PrivacyBadge.tsx` | **Replace taxonomy.** Keep only status/source/privacy badges supported by target language. Retire merchant-facing confidence/risk grades; text/icon accompanies colour. |
| `ui/Card.tsx`, `ModuleCard.tsx`, `SectionCard.tsx`, legacy `PanelCard` exports | **Collapse hierarchy.** Base surface, section and selected preview only; no nested identical cards/shadow stacks. Migrate all importers before deleting aliases. |
| `ui/DataTable.tsx`, `dataTableStyles.ts` | **Rebuild.** Semantic keyboard-operable rows/links, sticky header, server sort/page, column config, selection, loading/empty/error rows, responsive alternative and virtualisation threshold. Row click alone is not navigation semantics. |
| `ui/Drawer.tsx` | **Rebuild.** Visible title/`aria-labelledby`, inert background, focus trap/restoration, escape/backdrop policy, body-lock compensation, stacked-overlay prohibition, URL/deep-link support and responsive full-screen mode. |
| `ui/Modal.tsx` and every custom dialog | **Replace/consolidate.** Native/dialog-equivalent semantics, focus lifecycle, consequence summary, form errors, pending/rollback, safe close and typed destructive confirmation. Remove `window.confirm`, `alert` and parallel modal shells. |
| `ui/Input.tsx`, `Select.tsx`, `SensitiveField.tsx` | **Rebuild form contract.** Persistent label/help/error, required/optional, autocomplete/input mode, permission/redaction, loading/read-only/disabled distinctions and 44px narrow touch target. Add textarea/checkbox/radio/date/money/source selectors to same system. |
| `ui/EmptyState.tsx`, `LoadingState.tsx`, route skeletons/error UI | **Consolidate by scope.** Page/list/section/inline variants; skeleton geometry matches content; errors include retry/context/request ID; empty distinguishes no data/no matches/no permission/no source. |
| `ui/MetricCard.tsx`, analytics KPI cards | **Replace.** One exact metric component with definition, scope, currency/unit, comparison, freshness and drill-down. Remove `microchart`, gauges and decorative icons. |
| `ui/PageHeader.tsx`, `common/PageHeader.tsx`, page-local headers | **Consolidate.** One page/detail/settings header contract with `h1`, description, breadcrumbs, scope controls, primary/secondary actions and responsive collapse. |
| `ui/Tooltip.tsx` | **Restrict.** Supplemental explanation only, keyboard/touch accessible; never the sole label, value, action or source disclosure. |
| `ui/MotionWrap.tsx` | **Reduce/replace.** Remove chart-draw and decorative reveal/lift defaults; CSS state transitions only, reduced-motion safe. |
| `ui/UnauthLogo.tsx` | **Keep asset capability after visual check.** Consistent accessible name/size/contrast; no duplicate brand renderers in authenticated shell. |
| `ui/LandingPrimitives.tsx` | **Exclude.** Public-site primitives must not leak into authenticated product styling. |
| `ui/tokens.ts`, `pageShellStyles.ts`, global CSS utility aliases | **Replace/migrate.** Typed semantic tokens backed by one theme declaration; compatibility layer is temporary, measured and deleted in Phase 7. |

#### Orphaned and legacy authenticated-era code audit

The import walk specifically confirmed the entire `CustomerIntelligenceDrawer*` family is outside the live authenticated graph. It also found authenticated-era chart/form/dashboard/integration components outside that graph, including Recharts `DonutChart*`/`HBarChart*`, `ReadinessFunnel`, `AnalyticsBarChart`, `AnalyticsLineChart`, `BuildEvidencePackageDrawer`/triggers/preview/strength components, `CustomersFilterExpandedPanel`, older dashboard widgets, several integration cards/centres, `AmbiguousMatchResolver`, `NetworkFootprint` and `DetailPageShell`. Some may still belong to public demos, tests, dynamic imports or intended future work. Their disposition is **quarantine → ownership search → port required capability or delete**. They must not remain as an undocumented second design system and must not be revived by the lesser implementation model merely because a component already exists.

Before deleting any candidate, search static imports, dynamic imports, tests, Storybook/examples, public routes and documentation; run route/type/test baselines; then delete its styles/tokens/dependency only when no owner remains. Before retaining one, add it to an explicit target surface with the same acceptance bar as newly written code.

### Universal per-view state and interaction contract

Every active route, tab, preview, drawer, modal and major panel must have an explicit fixture and acceptance test for the applicable rows below. “The API usually returns data” is not a waiver.

| State | Required behaviour |
|---|---|
| Initial loading | Stable shell/header/action geometry; meaningful skeleton; no fake values, layout jump or blocked close/back control. |
| Background refresh | Preserve readable data, show scoped progress/freshness, and never reset selection/filter/scroll. |
| First-use/no source | Explain value and exact required source/capability; one authorised setup action; no fabricated demo metrics. |
| Legitimate zero data | Confirm scope/period/source checked; do not present missing data as success/clean/zero financial outcome. |
| No filter results | Preserve filters, show result count zero and clear/remove controls; distinguish from no merchant data. |
| Partial coverage | Identify missing object types/providers/time ranges and impact on conclusions; allow safe continuation. |
| Stale/degraded source | Show last successful sync, affected metrics/objects, retry/reauth path and whether data remains usable. |
| Mixed currencies/timezones | Split values or disclose approved conversion; show currency/timezone at control and value level. No silent USD/local-time fallback. |
| Permission denied/read-only | Hide unauthorised mutation controls, explain read-only where useful, provide safe next path; API independently denies. |
| Feature unavailable | Honest entitlement/provider/beta state; no dead control or misleading upgrade prompt. |
| Validation failure | Field-level and summary errors, preserved user input, focus first invalid field and source-specific recovery help. |
| Mutation pending/success | Disable duplicate submission, preserve context, announce result, update all projections or show processing state, and provide undo only when semantically safe. |
| Mutation conflict/stale version | Do not overwrite silently; show changed fields/version, reload/compare and preserve draft. |
| Mutation/API failure | Retain user input/selection, show scoped retry and request ID; roll back optimistic state; no generic permanent toast only. |
| Not found/deleted/merged | Explain stale/deleted/merged object, preserve merchant boundary and offer canonical replacement/return. Never leak existence across tenants. |
| Offline/timeout | Distinguish from zero/no permission; allow retry and prevent ambiguous double submission. |
| Long/large data | Server paging/virtualisation, safe truncation/copy, long names/IDs/locales, 0/1/50/10k child records and no document overflow. |
| Responsive | 320/375/768/1024/1280/1440/1920, keyboard and touch; content priority changes deliberately rather than merely wrapping desktop cards. |
| Accessibility | Correct landmark/heading, visible focus, logical order, names/descriptions, live announcements, no colour/hover-only information, zoom/reflow and reduced motion. |


## Mandatory implementation and verification protocol

### Universal per-view state and interaction contract

Every active route, tab, preview, drawer, modal and major panel must have an explicit fixture and acceptance test for the applicable rows below. “The API usually returns data” is not a waiver.

| State | Required behaviour |
|---|---|
| Initial loading | Stable shell/header/action geometry; meaningful skeleton; no fake values, layout jump or blocked close/back control. |
| Background refresh | Preserve readable data, show scoped progress/freshness, and never reset selection/filter/scroll. |
| First-use/no source | Explain value and exact required source/capability; one authorised setup action; no fabricated demo metrics. |
| Legitimate zero data | Confirm scope/period/source checked; do not present missing data as success/clean/zero financial outcome. |
| No filter results | Preserve filters, show result count zero and clear/remove controls; distinguish from no merchant data. |
| Partial coverage | Identify missing object types/providers/time ranges and impact on conclusions; allow safe continuation. |
| Stale/degraded source | Show last successful sync, affected metrics/objects, retry/reauth path and whether data remains usable. |
| Mixed currencies/timezones | Split values or disclose approved conversion; show currency/timezone at control and value level. No silent USD/local-time fallback. |
| Permission denied/read-only | Hide unauthorised mutation controls, explain read-only where useful, provide safe next path; API independently denies. |
| Feature unavailable | Honest entitlement/provider/beta state; no dead control or misleading upgrade prompt. |
| Validation failure | Field-level and summary errors, preserved user input, focus first invalid field and source-specific recovery help. |
| Mutation pending/success | Disable duplicate submission, preserve context, announce result, update all projections or show processing state, and provide undo only when semantically safe. |
| Mutation conflict/stale version | Do not overwrite silently; show changed fields/version, reload/compare and preserve draft. |
| Mutation/API failure | Retain user input/selection, show scoped retry and request ID; roll back optimistic state; no generic permanent toast only. |
| Not found/deleted/merged | Explain stale/deleted/merged object, preserve merchant boundary and offer canonical replacement/return. Never leak existence across tenants. |
| Offline/timeout | Distinguish from zero/no permission; allow retry and prevent ambiguous double submission. |
| Long/large data | Server paging/virtualisation, safe truncation/copy, long names/IDs/locales, 0/1/50/10k child records and no document overflow. |
| Responsive | 320/375/768/1024/1280/1440/1920, keyboard and touch; content priority changes deliberately rather than merely wrapping desktop cards. |
| Accessibility | Correct landmark/heading, visible focus, logical order, names/descriptions, live announcements, no colour/hover-only information, zoom/reflow and reduced motion. |

### Implementation handoff protocol for a lower-capability model

1. Work only one roadmap phase and one vertical journey slice at a time. Do not perform a repo-wide visual rewrite.
2. Before coding a slice, copy its route rows, component-ledger rows, state rows and acceptance tests into a task checklist. Identify the canonical object IDs, permissions, money/status/source contracts and fixtures.
3. Capture current route tests and screenshots only as regression evidence, not as the desired design. Produce a target wireframe/content hierarchy and query/mutation contract before JSX/CSS.
4. Build or repair shared primitives first when the slice needs them. Do not create a page-local button, badge, table, modal, drawer, toast, chart frame, state or formatter because the shared version is inconvenient.
5. Implement server/read-model changes and deterministic fixtures before visual polish. Every displayed value needs a named field/derivation, currency/unit, freshness and source.
6. Complete all universal states and role/tenant tests for the slice before starting another route. Do not defer empty/error/mobile/accessibility to a final cleanup phase.
7. Run typecheck, lint, targeted unit/component/route/E2E, axe and responsive visual checks. Reconcile money and chart/table/drill-down counts programmatically.
8. Delete legacy component paths only after target parity, importer search and telemetry/redirect conditions pass. Remove accompanying CSS/tokens/dependencies in the same controlled cleanup.
9. Record deviations and founder decisions in the document/ADR. Never invent commercial metric definitions, supported providers, automation authority or accounting policy.
10. A slice is done only when its originating list, preview, full detail, connected-object return path, mutations, audit event, notifications/tasks, all states and production telemetry work as one journey.

## M. Testing strategy

- **Unit:** money/currency invariants; case/loss/recovery state machines; evidence requirement state; status compatibility; rule/flow evaluation; terminology maps; URL filter serializers; source freshness; event rendering with unknown/missing fields.
- **Component:** table keyboard selection, saved views, filters, detail header, evidence groups, decision/recovery confirmations, activity timeline, provenance, responsive drawers, all empty/loading/error/permission states.
- **Route/integration:** every manifest route under authenticated/unauthenticated/denied roles; alias parameter/ID preservation; BFF queries; decision → ledger → loss/recovery projections; task/exception union; search destinations.
- **End to end:** Journeys A–G with fully connected, partial, disconnected, stale and demo tenants; include approve/deny/escalate, reversal, partial recovery, write-off, rule publish, source reauth and failed sync.
- **Accessibility:** axe plus manual keyboard/screen reader on shell, data tables, tabs, drawers, modals, forms, charts and live regions; visible focus; no colour-only state; `h1` and landmarks; reduced motion.
- **Visual regression:** light/dark if retained; 320, 375, 768, 1024, 1280, 1440 and 1920 widths; short/tall viewports; long IDs/text; 0/1/50 evidence/timeline items; high/zero/large values.
- **Permission:** owner/admin/analyst/viewer plus delegated permissions; hidden nav, direct route, mutation API, search results, exports, comments and integration controls.
- **Tenant isolation:** two-merchant fixtures for every canonical object and relationship; active workspace switching; forged IDs/source refs; notification targets; signed customer links.
- **Performance/large data:** 100k cases/customers/tasks, 10k timeline/evidence records, server pagination, query explain/index thresholds, route payload sizes and Web Vitals. Eliminate list-side in-memory filtering/grouping.
- **Failure/loading:** delayed APIs, partial connector failure, stale sync, source deletion, unmatched/duplicate records, conflict evidence, webhook failure, retry/idempotency, offline mutation rollback.
- **Migration:** staging clone rehearsal, row counts/checksums, financial reconciliation before/after, status mapping exception report, reversible additive rollout, generated-type check and RLS policy audit.
- **Production smoke:** login/onboarding, workspace switch, Overview, queue/detail decision read-only test, loss/recovery read, search, rule read, integration health, settings/audit, source webhook and error monitoring. Never create a real payout in smoke tests.

Baseline observed during this audit:

- `npm run typecheck`: passed.
- `npm run lint`: passed with **78 warnings**, including unused current-product code and effect-dependency warnings in billing/integration clients.
- Targeted Jest: 7 suites / 28 tests passed (`appRoutes`, reports contract, cross-module finance, case read model, onboarding gate, integration health, workflow engine).
- Existing E2E is desktop/tablet only; current product tests check page headings and overflow but do not prove full A–G journeys or phone support.

## N. Master acceptance checklist

### Route and navigation completeness

- [ ] Every active/hidden/redirect route in Section B has an owner, test and retirement/status decision.
- [ ] Every authenticated route-entry module and every active shared-component family in the disposition ledger has a recorded importer, target, disposition, test owner and deletion condition; no current UI is implicitly approved.
- [ ] Primary navigation reflects the proposed IA and effective permissions.
- [ ] Every detail breadcrumb uses a human reference and every legacy redirect preserves relevant ID/query context.
- [ ] Search results for all supported object types have first-class, permission-safe destinations.
- [ ] Queue/list filters, tabs, sort, selection and return scroll are URL-persistent.

### Product workflow

- [ ] Work contains all actionable tasks/exceptions once, with owner, priority, amount, blocker, age and SLA.
- [ ] Case detail exposes request, amount, policy result/version, evidence/missing evidence, source, owner, next action and consequence before decision.
- [ ] Case decisions are merchant-owned, validated, rationale-bearing and append-only/auditable.
- [ ] Payout case, loss and recovery are distinct but connected objects.
- [ ] Loss amount/attribution/recoverability/preventability are supported by evidence and financial entries.
- [ ] Recovery supports owner, counterparty, route, evidence, source reference, correspondence, deadline, partial/full outcome and write-off.
- [ ] Customers provide relevant merchant context without unsupported fraud/risk labels.
- [ ] Customer directory row selection opens the new URL-backed canonical customer preview; it restores list filters/scroll/focus, reconciles money/source freshness, contains no nested drawer or legacy density/risk UI, and links to the full profile/connected objects with safe return state.
- [ ] Rules and Flows are separate, versioned, testable and traceable; automation cannot silently decide or issue payouts.

### Financial/source trust

- [ ] Requested amount, compensation, prevented payout, estimated/realised loss, recoverable, recovered, outstanding and write-off are canonical and consistently labelled.
- [ ] Every money KPI reconciles to case financial summaries/entries; multi-currency is separated or explicitly converted.
- [ ] Source provider/account/record ID/URL/timestamp/freshness/sync/raw availability is visible where material.
- [ ] Connected/degraded/disconnected/live/beta/planned/manual states are honest and consistent everywhere.
- [ ] Audit events show actor, timestamp, source, before/after, rule, rationale, evidence, task owner and outcome where applicable.

### Design, states and interaction

- [ ] Authenticated tokens have one declaration per theme; no new hard-coded colours outside approved source logos/data visualisation exceptions.
- [ ] List/detail/settings/card/table/form/status/chart primitives are consolidated and documented.
- [ ] Existing authenticated donuts, gauges, decorative sparklines/density bars, gradient chart fills, chart-draw animation and current-page queue charts are removed; no old chart option object is treated as the target design.
- [ ] Every admitted visual passes the six-question admission test, has exact values/definition/period/currency/timezone/freshness, an accessible data table, renderer-failure fallback and point/bar/segment-to-record drill-down reconciliation.
- [ ] Every active route has loading, empty, partial, stale, error, permission and not-found states.
- [ ] High-risk confirmations summarise amount, action, downstream effect and audit consequence; no `window.confirm`/`alert` remains.
- [ ] Tables support keyboard navigation/selection, sticky headers, server paging and large datasets.
- [ ] Optimistic mutations have rollback/error state; destructive/irreversible actions are never optimistic.
- [ ] Responsive matrices pass without global phone blocking or horizontal document overflow.
- [ ] WCAG 2.2 AA, focus, landmarks, headings, dialog focus, reduced motion and chart alternatives pass.

### Security, performance and production

- [ ] Active workspace is explicit and constrained to membership; tenant-isolation tests cover every object/API.
- [ ] UI, direct routes, search and APIs enforce the same permission model.
- [ ] Service-role reads always follow authenticated permission + merchant scope; proxy no longer depends on dropped tenancy fields.
- [ ] Queries are server-paginated/indexed; no 4,000-customer identity scan or 1,000-case SLA client filter remains.
- [ ] Migration rehearsals reconcile counts, links and money; rollback is documented.
- [ ] Demo data covers the full lifecycle and is unmistakably sample data.
- [ ] Production smoke, telemetry, error monitoring, source-health alerts and support runbook pass before broad rollout.


## Phase completion response

Return: (1) outcome summary, (2) routes/components changed, (3) schema/API/read-model changes, (4) tests and exact commands/results, (5) screenshots or rendered evidence at supported widths, (6) accessibility/performance/security checks, (7) redirects/compatibility retained, (8) known limitations, and (9) the exact commit hash. Explicitly state every unchecked acceptance item; never describe an unverified item as complete.
