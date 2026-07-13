# Implementation prompt — Phase 6: Configuration and administration

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

### Phase 6 — Configuration and administration

**Objective:** make merchant control safe and understandable.  
**Scope/routes:** `/rules` + detail/version, `/flows` + runs, Integrations + connection detail, Settings information architecture, notifications, agreements and provider routes.  
**Backend:** rule/workflow versioning, simulation, publish/rollback, registry/status SSOT, connection health/run history, retention only if approved.  
**Migration:** current rules/flows become v1; connector legacy state mapped non-destructively.  
**Risks:** changing live policy behaviour, connector credential/state divergence, retries executing twice.  
**Tests:** rule simulation/publish/history, flow idempotency/retry, connector capabilities/scopes, reauth/disconnect, role/permission matrix, audit trail.  
**Completion:** Journeys F/G pass; past decisions trace to immutable configuration; all provider status comes from one contract; no planned integration appears live.


The scope above is a hard delivery boundary, not permission to ignore dependencies. Inspect the current repository before editing, preserve verified backend capability, and rebuild every in-scope view/component from the assumption that its current presentation is not fit for purpose. Do not silently expand into later phases. If a later-phase dependency is needed, introduce the smallest typed seam or temporary compatibility adapter and record it in the handoff.

Completion means implementation, migrations where explicitly required, tests, accessibility checks, responsive verification, and a clean handoff—not a plan or visual mock-up. Do not mark the phase complete while any in-scope route, component, state, interaction, chart, or acceptance item is unverified.

## Relevant audited specification

### Rules and Flows

**Rules current strengths:** ordered merchant rules, conditions, actions, templates, optimistic enable/disable and evaluation snapshots. **Target:** list with draft/published/disabled status, priority/conflicts, affected case volume and last evaluation; detail/editor with plain-language builder, data requirements, sample-case simulation, version diff, publish confirmation, rollback and evaluation history. Editing a published rule creates a draft version rather than mutating historical meaning.  
**Flows current strengths:** distinct event/condition/output backend with run/step tables. **Target:** separate `/flows`; trigger → conditions → branches/actions canvas or structured step builder; bounded actions only; test mode, publish/version, run history, failure/retry and idempotency detail. Do not add drag/drop until the structured builder is complete and keyboard-accessible.

**Complexity/dependency:** XL/P1 Rules, XL/P2 Flows. Schema currently has rule snapshots but not first-class rule versions/drafts; workflow definition versions exist but API/UI do not edit/publish them.  
**Acceptance:** Journey F traces a case to immutable rule snapshot; simulation never writes decisions; publish reports affected data requirements/conflicts; flow run exposes every step/result/error; Rules never appear to execute payouts.

### Reports

**Current strengths:** canonical ledger overlay, range controls, honest empty states, recovery/partner metrics and export audit.  
**Weaknesses:** the current presentation is chart-heavy without improving decisions: gauge cards, repeated horizontal bars, non-drillable KPIs and decorative chart styling consume space while hiding definitions and underlying records. No loss-cause view exists; source coverage uses rough 50/50 connection arithmetic; prior-period projection does not overlay the same canonical financial summary; mixed currencies use dominant currency; “integration” query maps to recovery.

**Target report definitions:** Financial performance, Loss causes, Payout prevention, Recovery performance, Policy effectiveness, Operations/SLA, Evidence gaps and Source coverage. Every metric defines numerator, denominator, time basis, currency policy and record drill-down. Default to reconciled metric rows, ranked tables and record lists. Use only the approved visual forms in the chart replacement specification: a restrained time series for genuine change over time, a labelled financial value bridge, and a ranked bar-table/ageing distribution when the shape materially improves understanding. Donuts, gauges and decorative dashboards are prohibited. Saved report/filter definitions are P2; scheduled delivery is P3.

**Complexity/dependency:** XL/P1; reporting API/materialised views, consistent ledger period queries and dimensional fields for cause/owner/source/team.  
**Acceptance:** Journey E drills from KPI/chart to exact records and back with filters intact; source coverage derives from objects/freshness, not connection booleans; CSV exports match on-screen filters and canonical terms; multi-currency is never silently combined.

### Integrations and imports

**Current strengths:** source categories, provider registry, capability/risk model, setup readiness, applicability, sync states, scopes and errors.  
**Weaknesses:** two registries (`lib/connectors/registry.ts`, `lib/integrations/registry.ts`) with different provider lists; setup status and canonical provider status can conflict; current page composes overlapping clients; health code exists but `IntegrationCentre` is unused; live/beta/planned/manual status is inconsistently encoded; imports are paste-only.

**Target:** one catalogue generated from the connector manifest and runtime availability. Sections: Required coverage, Connected, Available, Manual/import and Planned. Card shows stage (live/beta/planned), category, Read/Sync/Link/Write/Act/Subscribe capabilities, account/environment, scopes, freshness, imported objects and issues. Connection detail shows setup, capability matrix, sync/webhook history, reconciliation, errors and destructive controls. Generic CSV import gets upload, mapping preview, validation, job history and error download.

**Complexity/dependency:** XL/P1; designate connector registry SSOT and adapt legacy providers; unify connection status projections.  
**Acceptance:** Journey G sees one status everywhere; no unavailable connector has an enabled Connect action; planned/beta/live/manual labels are explicit; freshness and imported object counts reconcile to source records; reauth/resync errors are actionable and audited.

### Settings, Notifications, Help and utility pages

| Surface | Target and acceptance | Complexity/priority |
|---|---|---|
| Workspace/account | Separate workspace profile from personal security; canonical store name, locale, timezone and default currency. No fraud-era field/copy. Save states are accessible and server-confirmed. | M/P1 |
| Team/permissions | Member table with role, effective permission summary, teams, invite state and last active; route/nav enforcement matches effective permissions. Owner change/removal is guarded. | L/P1 |
| Financial/workflow defaults | Split dense Platform form into Financial, SLA/workflow, Matching and Connection policy sections; load failure gives retry and request ID, never a dead form. | M/P1 |
| Notification preferences | Add in-app/email preferences using existing table; bell shows unread count; notification targets are permission-checked. | M/P2 |
| Agreements/partners | Agreement list/detail/version/effective dates and approved clauses feed partner rulebook; uploaded extraction is always pending approval. | L/P2 |
| Data/security/API | Make retention real or remove the claim; show API key scope/last used/expiry; webhooks and audit export; consistent destructive confirmations. | L/P1 |
| Billing | Preserve existing entitlement/credit logic; align plan language with source capabilities and remove UI-only product gates. | M/P2 |
| Help/Yuma/Siena | Contextual help links from each workflow; guides show supported status and a safe test result. Static payloads remain examples, never “connected.” | M/P3 |
| Audit-running/apply | Move into shell notifications/status where appropriate; never display an email supplied only by query string; preserve campaign history separately. | S/P2–P3 |
| Legacy redirects | Preserve source ID/query when mapping to canonical equivalents; instrument hits; return a clear moved-state if context cannot map. Delete only after 90 days without legitimate traffic and test/link cleanup. | M/P2–P3 |


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


## Relevant end-to-end journeys

### Journey F — Configure a policy

**Current:** `/rules` → New/Edit drawer → save mutates rule → reorder/toggle → case recommendation; no simulation/version/publish/rollback/history.  
**Proposed:** `/rules` → `/rules/[id]?version=draft` → conditions/data requirements → preview affected cases and fixtures → test → publish version with impact summary → case links to exact evaluation snapshot → version history/rollback.

**Required:** rule version model, simulation endpoint that cannot write outcomes, publish/rollback APIs and evaluation list.  
**Acceptance:** operator understands first-match ordering/conflicts; testing is read-only; published versions are immutable; historical decisions remain interpretable after edits/deletion.

### Journey G — Connect a source

**Current:** onboarding or `/integrations` → provider/custom modal → OAuth/key → hub reload/status → provider detail under Settings; setup and canonical statuses can disagree.  
**Proposed:** `/integrations` category coverage → provider → permission/capability review → authenticate → `/integrations/[connectionId]` import progress → object coverage/failures/webhooks → resolve/retry → open an imported source record and linked case.

**Required:** registry/status SSOT, connection detail route, sync job/event history and source-record drill-down.  
**Acceptance:** provider stage/capabilities/scopes are accurate; no fake connector; progress survives refresh; errors are actionable; source records show provenance/freshness; disconnect impact is explicit and audited.


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
