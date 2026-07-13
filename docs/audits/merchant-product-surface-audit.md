# Unauth merchant product surface audit

**Date:** 2026-07-13  
**Scope:** authenticated merchant application, route code, navigation registry, database schema/types, tests, validation evidence, demo/onboarding/configuration code, and available browser evidence.  
**Status:** Product surface audit complete with documented limitations

## Audit method and evidence boundary

This is an inventory and evidence report, not a redesign or remediation plan. Evidence was taken from `.cursor/rules`, `docs/product/*`, `AGENTS.md`/repository guidance, route files, `lib/navigation/appRoutes.ts`, authenticated layout and permissions code, server actions/API routes, Supabase schema and generated types, component inventory, tests, validation reports, and the checked-in browser evidence under `docs/audit-evidence/2026-07-13` and `docs/audit-evidence/2026-07-13-remediation`.

The current product browser suite reports 34/34 checks across desktop/tablet and the validation report says the build/typecheck passed, but a fresh in-app browser walkthrough could not be completed in this environment: the app reachable from shell on port 3000 was not reachable by the in-app browser, and the temporary port 3001 process was also refused. No real external write action was attempted. Claims below distinguish implementation evidence, automated validation, fixture/demo evidence, and browser evidence.

## A. Executive summary

Unauth is currently a post-purchase loss-accountability workbench centered on Shopify/Gorgias payout control: it presents support payout cases, source context, evidence checklists, merchant-rule recommendations, attribution/recoverability, loss ledger records, recovery work, rules/flows, reports, integrations, and configuration. The approved MVP is not a cross-merchant fraud or identity network. The repository still contains identity/network, watchlist, global pattern context, legacy claims/evidence, and older connector/setup surfaces.

Strongest areas are the case workbench structure, source-linked evidence model, rule/recommendation presentation, recovery board scaffolding, route authorization/merchant-isolation tests, and deterministic financial/reconciliation tests. Weakest areas are end-to-end proof of the complete source-event-to-final-financial-result journey, integration freshness and real-provider coverage, legacy/canonical duplication, inconsistent naming, incomplete real data for losses/recoveries, and the amount of deep-linked or hidden functionality not represented in primary navigation.

Current maturity is **design-partner capable only for constrained review of the payout-case workflow and fixture-backed operational surfaces**. It is not release-ready as a complete merchant operating product: the validation report explicitly blocks readiness on invalid Shopify credentials, unverified deployed reconciliation, a noncanonical recovery seed, and absence of a complete built-application source-to-loss-to-recovery trace.

### Current approved scope in plain language

In scope: Shopify/Gorgias payout-control workflow; automatic source-driven case creation/update/reconciliation where data is available; evidence checklist; merchant rules and bounded flows; recommended actions; loss attribution and recoverability; manual recovery cases and recovery board; partner rulebook v1; source provenance, freshness, auditability, exceptions, reports, and customer/order context.

Explicitly deferred: automatic carrier claim submission, AI contract extraction, network benchmarks, full enterprise API ingestion, WMS/ERP integrations, all helpdesk/returns integrations, full supplier management, full chargeback automation, deep finance reconciliation, complex AI decisioning, and full rebrand/removal of every legacy identity/risk page.

Present but no longer aligned or legacy: `/watchlist`, `/global`, `/chargebacks`, identity tables and network language, `store`/`lookup` redirects, older claims labels and route aliases, legacy settings integration pages, and help pages for identity matching. The repository deliberately retains some claims code; it must not be interpreted as approval to revive the older identity-network concept.

## B. Complete authenticated route inventory

All 65 `page.tsx` files below are under the authenticated `(app)` layout unless noted as redirect/legacy/hidden. Dynamic routes are listed as templates. Page status is based on route code plus validation evidence, not the existence of a component alone.

| Route | Title / label | Parent / user / purpose | Data and key UI | Reachability and status |
|---|---|---|---|---|
| `/dashboard` | Overview | Overview; owner/admin/analyst; payout, loss, recovery and prevention summary | KPI strip, charts, work/exception/recovery summaries, date range, drilldowns | Sidebar + command; current, validated; dashboard metrics reconcile only for fixture/E2E USD exposure |
| `/store` | Store overview | Deep-linked store context | Store/source summary | Not sidebar; redirects or overlaps overview; legacy/current boundary unclear |
| `/work` | Work | Overview; operational reviewer; cross-object work queue | Tasks, assignment, priority, deadlines, status, case/loss/recovery links | Sidebar; current, automated coverage; live task volume not demonstrated |
| `/claims` | Payout Control | Operations; support/ops; review payout cases | Queue tabs/filters/search, case table, evidence/recommendation/financial columns, pagination | Sidebar; canonical MVP queue, current; old tests still call it Claims |
| `/claims/[id]` | Payout case detail | Operations; reviewer; inspect and decide a case | Header/action rail, source context, evidence rail/checklist, recommendation, exposure, attribution, recovery path, timeline/history, comments/mentions, assignment, snooze/outcome | Deep link from queue/search/exceptions; current and richest validated workbench; final financial closure not proven live |
| `/exceptions` | Exceptions | Operations; exception reviewer; resolve uncertain/failed matches and stale data | Exception queue, confidence/type, assignment, case link, release/assign action | Sidebar-adjacent/deep link; current; 17 fixture exceptions, financial resolution chain not demonstrated |
| `/losses` | Losses | Operations; finance/ops; canonical loss ledger | KPI strip, ledger table, filters/search, attribution/recoverability/status, empty/loading/error states | Sidebar; current but fixture/E2E merchant had no canonical loss cases |
| `/losses/[id]` | Loss detail | Operations; finance/ops; trace loss to source/case/recovery | Financial summary, attribution, evidence, related records, actions | Deep link; implemented, unverified end-to-end |
| `/recoveries` | Recovery board | Operations; recovery owner; manage recoverable work | Board/list, status lanes, owner/deadline, evidence, correspondence/task state | Sidebar; current scaffolding; direct verification seed is noncanonical |
| `/recoveries/[id]` | Recovery detail | Recovery owner; submit/track outcome | Recovery status, partner rule, evidence, submission/outcome, timeline, financial impact | Deep link; implemented/fixture-backed, not live-proven |
| `/customers` | Customers | Operations; support; customer history/context | Search/filter table, preview drawer, case summary, financial/customer context | Sidebar; current; customer drawer browser evidence exists |
| `/customers/[id]` | Customer detail | Support/ops; customer history | Profile, identity/order/support/case sections, financial summary, notes/context, related links | Deep link; browser evidence includes 404 for one view; customer context fix validated |
| `/customers/[id]/claims` | Customer cases | Support; customer-specific cases | Case list/detail links | Deep link; partial/duplicate with claims queue |
| `/customers/[id]/evidence/new` | New evidence package | Support/ops; manually assemble evidence | Evidence package form, fields, validation, upload/form states | Deep link; legacy chargeback/evidence surface, out of core MVP emphasis |
| `/rules` | Rules | Configure; admin/analyst; merchant policy | Rule list, status, priority, evaluations, builder drawer | Sidebar; current, fixture/test-backed |
| `/rules/[id]` | Rule detail | Configure; inspect/edit rule version | Version workbench, conditions, activation, history | Deep link; current/partial; write authority requires permission |
| `/flows` | Flows | Configure; admin/analyst; bounded workflow definitions | Flow list, status, versions, builder/editor | Sidebar; current/partial |
| `/flows/[id]` | Flow detail | Configure; inspect/edit workflow | Flow version workbench, steps/conditions, activation/history | Deep link; implemented/partially verified |
| `/flows/runs` | Flow runs | Configure/ops; inspect executions | Run list/status/retry/error/related records | Deep link/command only; implemented, not primary navigation |
| `/flows/runs/[id]` | Flow run detail | Configure/ops; trace execution | Run steps, events, failures, related case/task | Deep link; implemented/unverified |
| `/partners` | Partner Rulebook | Configure; ops/admin; partner liability/recovery rules | Partner list, rulebook client, rule conditions/caps/submission methods | Workbench/command, not sidebar; current MVP+ capability, partial |
| `/integrations` | Integrations | Configure; admin; source connection health | Provider cards, connected/stale/error state, readiness, connect/reconnect/disconnect, setup links | Sidebar; current; stale/unknown health is honest after validation fix |
| `/integrations/[provider]` | Provider detail | Configure; admin; provider lifecycle | Provider setup/health, credentials/OAuth, sync/webhook state | Deep link; provider-specific and partially verified |
| `/integrations/imports` | Imports | Configure/ops; monitor CSV/source import | Import progress/history/error rows | Deep link; current/partial |
| `/reports` | Reports | Outcomes; finance/ops; operational reporting | Date range/timezone, KPI summaries, charts, funnels, export, drilldowns | Sidebar; current but formulas/traceability need consolidation |
| `/reports/records` | Report records | Outcomes; reviewer; underlying record list | Filtered source/case records | Deep link; implemented, unverified |
| `/notifications` | Notifications | Global; all roles; assignments/evidence/deadlines/connection alerts | All/unread filter, mark read/all, related links | Header/deep link; current, in-app validated; external delivery unverified |
| `/settings` | Settings | Configure/admin; account/config hub | Settings cards, account/integrations/team/billing/notification links | Command/deep link; current shell; some linked subroutes redirect |
| `/settings/account` | Account | Account admin | Profile, password, danger actions | Deep link; implemented |
| `/settings/team` | Team | Account admin | Members, invites, roles, audit section | Hidden route; tests expect redirect to `/settings`; capability code exists but not exposed |
| `/settings/notifications` | Notification preferences | Account admin/user | Preferences form | Hidden route; tests expect redirect to `/settings` |
| `/settings/billing` | Billing | Account admin | Subscription/tier/feature access/status | Hidden route; billing code and banners exist, tests expect redirect |
| `/settings/audit-trail` | Audit trail | Admin/audit viewer | Audit trail client, filters/records | Hidden route; tests expect redirect; audit data exists in backend |
| `/settings/agreements` | Agreements | Account/setup admin | Upload agreement/document flow | Deep link; implemented, outside core MVP proof |
| `/settings/api-integrations` | API integrations | Admin/developer | API keys/widget tokens, create/revoke/copy dialogs, helpdesk section | Deep link; implemented, permission/tier gated |
| `/settings/data-privacy` | Data privacy | Admin | Privacy/data controls, bulk delete | Deep link; implemented/partial |
| `/settings/platform` | Platform | Admin | Platform settings client | Deep link; implemented/partial |
| `/settings/team` | Team management | Admin | Team management components | Duplicate row above; route intentionally redirecting in current tests |
| `/settings/integrations` | Legacy integrations hub | Admin | Provider setup cards | Alias of `/integrations`; duplicate active code path |
| `/settings/integrations/shopify` | Shopify setup | Admin | Shopify credentials/OAuth/setup | Deep link; provider legacy/current overlap |
| `/settings/integrations/gorgias` | Gorgias setup | Admin | Gorgias credentials/webhook/sync | Deep link; core provider setup, partial live proof |
| `/settings/integrations/zendesk` | Zendesk setup | Admin | Zendesk sync/setup | Deep link; fixture/partial, deferred breadth |
| `/settings/integrations/freshdesk` | Freshdesk setup | Admin | Freshdesk sync/setup | Deep link; fixture/partial, deferred breadth |
| `/settings/integrations/bigcommerce` | BigCommerce setup | Admin | Commerce connector setup | Deep link; fixture/partial, deferred breadth |
| `/settings/integrations/woocommerce` | WooCommerce setup | Admin | Commerce connector setup | Deep link; fixture/partial, deferred breadth |
| `/settings/integrations/chrome` | Chrome setup | Admin/support | Extension/setup flow | Deep link; implemented, not core MVP proof |
| `/chargebacks` | Evidence packages | Legacy/growth; disputes reviewer | Evidence package list/form and status | Hidden from current sidebar; legacy/partial; current product says full chargeback automation deferred |
| `/chargebacks/[id]` | Evidence package detail | Legacy/growth | Package detail/evidence actions | Deep link; legacy/partial |
| `/disputes/[id]` | Dispute detail | Legacy/current object | Dispute source context and evidence | Deep link; implemented/fixture-backed |
| `/watchlist` | Customer context | Legacy | Redirect/legacy customer context | Hidden, command false; legacy residue |
| `/global` | Pattern context | Legacy identity/network | Imported pattern/identity context | Hidden; legacy residue and not current direction |
| `/lookup` | Live lookup | Legacy/API-style lookup | Search/lookup redirect | Hidden; redirects to search/customer context |
| `/orders/[id]` | Order detail | Connected object | Order, customer, fulfillment, refund/dispute/source links | Deep link; implemented/partial |
| `/shipments/[id]` | Shipment detail | Connected object | Tracking, fulfillment, carrier evidence | Deep link; implemented/partial |
| `/returns/[id]` | Return detail | Connected object | Return state, refund, exception links | Deep link; fixture-backed/partial |
| `/refunds/[id]` | Refund detail | Connected object | Refund amount/status/source links | Deep link; fixture-backed/partial |
| `/tickets/[id]` | Ticket detail | Connected object | Support ticket/events/order/case links | Deep link; implemented/partial |
| `/audit/[runId]` | Audit run | Internal/validation | Run evidence/results | Deep link; validation/internal-adjacent, not merchant navigation |
| `/apply` | Apply | Legacy/onboarding-adjacent | Application/intake surface | Deep link; not represented in current merchant nav |
| `/catches` | Catches | Legacy residue | Catch cards/feed, exposure links | Hidden; older vocabulary/parallel case concept |
| `/help` | Help | Global | Help index | Deep link/header; current |
| `/help/how-it-works` | How it works | Global | Product explanation | Deep link; current docs |
| `/help/confidence-grades` | Confidence grades | Global | Confidence terminology | Deep link; current |
| `/help/identity-matching` | Identity matching | Global/legacy | Identity matching explanation | Deep link; current code but directionally legacy |
| `/help/integrations/yuma` | Yuma integration help | Global | Provider help | Deep link; unclear/currently unsupported |
| `/help/integrations/siena` | Siena integration help | Global | Provider help | Deep link; unclear/currently unsupported |

Redirect behavior: `/claims` has alias `/inbox`; `/integrations` aliases `/settings/integrations`; `/store` and `/lookup` are redirect/overlap surfaces; protected routes redirect unauthenticated users to `/login`; onboarding gates incomplete merchant contexts to `/onboarding`; tests assert `/settings/team`, `/settings/billing`, `/settings/notifications`, and `/settings/audit-trail` redirect to `/settings`.

## C. View and component inventory

The major-view count used for the summary is **92**, counting route-level views plus distinct named panels/drawers/modals/builders used by the authenticated surface. The most important view families are:

| Family | Views and controls | Merchant question / current condition |
|---|---|---|
| Shell | Sidebar groups; workbench nav; breadcrumbs; app header; workspace switcher; environment/demo chip; billing banner; command palette; route progress; toast provider | Where am I, which merchant am I in, and what needs attention? Present and broadly consistent, but hidden/deep routes and aliases fragment the model. |
| Overview/reporting | KPI strip; exposure/loss/recovery/prevention cards; charts; trend/period controls; report export; record drilldown | What is happening financially and operationally? Present; definitions and final-loss traceability are not fully unified. |
| Work/cases | Work queue; payout queue tabs; filters/search; case table; case header/action rail; source context; evidence rail; recommendation; exposure; attribution; recovery path; timeline/history; comments/mentions; assignment; snooze; outcome dialog | Why does this need review and what should happen next? This is the strongest current surface; live final outcome chain remains unproven. |
| Exceptions | Exception queue; confidence/type badges; assignment/release; full-case link | What uncertain or stale fact needs my judgement? Present and tested; one focused queue exists conceptually, but duplicate legacy queues remain. |
| Customer/object context | Customers table; filters sheet; preview drawer; profile main/sidebar; customer cases; order/shipment/ticket/refund/return/dispute detail | What happened around this customer/order? Present but multiple object routes and a documented prior 404/context defect reduce confidence. |
| Evidence | Checklist; delivery evidence; integration source panel; evidence package form; upload/availability states; source deep links | What evidence exists, is missing, unavailable, or stale? Present; provenance and unavailable states are explicit in code. |
| Loss/recovery | Loss ledger; loss actions; recovery board; recovery card/path; recovery detail; partner rulebook; deadlines/outcomes | What loss is confirmed, what is recoverable, and who owns recovery? UI exists; canonical live loss/recovery data is insufficient for proof. |
| Rules/flows | Rule index; builder drawer; condition blocks; version workbench; flow editor; runs index/detail; simulation/retry/status controls | What policy will be applied and did automation run? Present/partial; configuration breadth and execution trace need partner validation. |
| Integrations/setup | Connection cards/actions; provider detail; OAuth/credential forms; webhook setup; sync/import progress; connector-specific setup clients | What is connected, fresh, and ready? Present; real Shopify is blocked by 401, Gorgias connectivity is read-only/preflight only. |
| Collaboration/notifications | Notification centre; unread/all; mark read/all; preferences; comments, mentions, assignments, tasks, deadlines | Who owns the work and what changed? In-app behaviors have automated coverage; provider email delivery not proven. |
| Account/admin/legacy | Account/profile/password/danger; team/invite/roles; API key dialogs; billing; privacy/bulk delete; audit trail; identity/network help | How is the workspace administered? Code exists, but multiple admin pages are hidden/redirected and legacy concepts remain discoverable by deep link. |

## D. Complete merchant-flow map

### D1. Onboarding and first useful outcome

Entry: account creation/login -> `/onboarding` when setup is incomplete -> merchant context creation -> connector selection -> Shopify/Gorgias OAuth or credential setup -> import/sync progress -> readiness state -> rules -> `/claims` case queue -> case detail. Data crosses `merchants`, membership/context, store/helpdesk connections, source orders/tickets, sync jobs and canonical cases. Background jobs include imports, webhooks, scheduled sync and reconciliation. Failure paths are missing/invalid credentials, stale or failed sync, no merchant context, and partial imports. The app can reach a first review case from fixture/source data; a fresh live first-use source-to-final-outcome was not demonstrated.

### D2. Integration lifecycle

Providers represented in code: Shopify, Gorgias, Zendesk, Freshdesk, BigCommerce, WooCommerce, Chrome, generic/API/CSV intake, tracking/warehouse/payment/dispute data models, and help pages for Yuma/Siena. Lifecycle surfaces include connect, OAuth/callback, credentials, webhook setup, import history/progress, sync/reconnect/disconnect and health/readiness. Shopify external preflight returned 401; Gorgias read-only preflight and webhook reachability were verified; most other providers are fixture/simulation-backed. Reconciliation is scheduled at `0 6 * * *` for `/api/cron/reconcile`, but deployed execution is unverified. Data retention/deletion is represented by privacy/bulk-delete code but not proven as a merchant walkthrough.

### D3. Support complaint to payout case

Entry: Gorgias ticket/webhook or canonical support intake -> match merchant/customer/order -> create or update support payout case idempotently -> collect source evidence -> evaluate merchant rules -> recommendation and evidence strength -> assign/review -> merchant decision/outcome -> later refund/reship/replacement/payout detection -> loss and recoverability -> recovery opportunity. Relevant states and audit/timeline mutations are modeled. Automated tests cover intake, matching, rules, evidence, state, permissions and idempotency. The browser evidence for case `361dd765-8451-428d-9562-d490b1e13c68` proves source ticket/order, USD 185 exposure, evidence-needed warning, rule recommendation, timeline, comments and controls, but not final canonical loss/recovery closure.

### D4. Retrospective refund/replacement, carrier/3PL, return and dispute flows

The schema and tests support refund, replacement, shipment/tracking, fulfillment/warehouse, return, payment and dispute source events. Each should normalize the event, match to customer/order/case, update evidence/recommendation/financial projection, create an exception for probable/unknown/conflicting matches, and create/update loss or recovery records. These paths are primarily fixture/simulation tested; no real destructive external action was attempted. Chargeback/evidence pages exist but full chargeback automation is explicitly deferred.

### D5. Exception, recovery, reporting and collaboration

Exceptions enter from ambiguous matches, stale source data, conflicting financial values, missing outcomes, unsupported offline outcomes, or policy overrides. The reviewer assigns, opens the case, confirms/rejects/resolves/dismisses, and the record/timeline/financial projection should update. Recovery enters from recoverability/attribution, applies partner rules, assigns owner/deadline, gathers evidence, submits/chases/records partial/full/rejected/expired outcome, and closes net loss. Reports should drill to cases/source records and export. Comments, mentions, tasks, assignment, deadlines and notifications form the collaboration layer. Automated coverage is broad; live complete closure and external notification evidence are missing.

## E. Data, fields and financial definitions

Canonical source entities are merchants/members, store/helpdesk connections, source customers/addresses/orders/refunds/fulfillments/disputes/tickets/events, support payout cases/events/outcomes/evidence, partners/rules/recovery cases/events, sync jobs/chunks, notifications, audit/user-action records, and retained identity/network tables. Server reads are scoped by merchant context and permissions; source provenance/deep links are represented in connected-object and evidence components.

| Field family | Examples shown or modeled | Source / calculation / risk |
|---|---|---|
| Identity/customer | customer id, name, email, phone, identity id, customer history, notes | source customer plus canonical identity/profile; identity/network residue can confuse canonical customer meaning |
| Order/commerce | order id, value, currency, financial status, created/updated time, line items, refund amount | `source_orders`, `source_refunds`; live only when connector sync is current; currency and duplicate-event protection are tested |
| Support | ticket id, channel, subject/body/events, requested action, complaint type | `source_tickets`/events and Gorgias intake; source link is available in case view |
| Shipment/fulfillment/return | tracking, carrier, delivery state, fulfillment state, return created/in-transit/received, warehouse/3PL | source fulfillment/tracking/returns models; provider availability can be unknown/unavailable/stale |
| Evidence | checklist item, present/missing/unavailable/unknown, strength, provider, reason, source URL, freshness | `claim_evidence` and integration evidence; explicit unavailable state is good, but stale provenance needs consistent display everywhere |
| Recommendation/rule | rule fired, conditions, recommended action, confidence/evidence strength, outdated warning, evaluations/history | rule evaluation/read models; recommendation is advisory, not an external write; repeated evaluations must not become duplicate finance |
| Case lifecycle | new, evidence needed, awaiting customer/carrier/3PL/supplier evidence, ready for decision, manual review, decision recorded, recovery opened, closed, pending/open/escalated/resolved variants, stale/voided | `claim_status` contains overlapping generations; merchant labels differ between old claims and payout-control surfaces |
| Financial | requested/exposure, paid/payout, estimated loss, confirmed loss, recoverable/possibly recoverable, recovered, prevented, written off, final net loss | support case financial projections, loss ledger, recovery cases and reports; E2E USD exposure reconciles, but canonical completed loss/recovery chain is absent |
| Attribution/recovery | attribution, attribution confidence, recoverability, recovery owner/type/status, liability cap, submission method, deadline, recovery outcome | schema enums and partner rules; status transitions are modeled/tested, live merchant proof absent |
| Ownership/audit | assignee, role, task, priority, deadline, comments, mentions, notification, audit event, actor/time | cases/tasks/notifications/audit log; audit null-metadata defect was fixed, but complete financial audit trace remains unproven |
| Freshness/health | connected/stale/unknown/error, sync pending/running/completed/failed, webhook health, import progress | connection state, sync jobs/chunks and readiness; fail-closed integration gate fixed, deployed reconciliation unverified |

Financial language is not fully consolidated. `/dashboard`, `/reports`, `/losses`, `/recoveries`, case cards and older claims/evidence surfaces can use exposure, payout, loss, recoverable, recovered, prevented and outcome terms with different scope. The current source of truth should be the canonical financial ledger/read model, but several pages still expose legacy claims terminology. `DATA-VAL-001` demonstrates a concrete risk: a GBP recovery seed was linked to a USD case without a loss and is excluded from proof.

## F. Global controls

| Control | Location / behavior | Consistency and risk |
|---|---|---|
| Primary navigation | Sidebar groups Overview, Operations, Configure, Outcomes | Current routes are well grouped, but store, partners, hidden settings and object routes are not visible; legacy/deep links compete with canonical paths |
| Workbench sub-nav | Overview, Work, Customers, Payout Control, Losses, Recoveries, Rules, Flows, Integrations, Reports | Connects current workbench; legacy claims/evidence are still separately reachable |
| Command palette | Header; current routes plus “cases missing evidence” and recovery correspondence shortcut | Useful global access; excludes hidden/legacy routes by design, which creates discoverability mismatch |
| Search/lookup | Header command search, queue/customer filters, `/lookup` redirect | Search behavior is tested for IDs/customer/order/no-results; lookup naming is legacy and not a distinct canonical surface |
| Merchant/workspace switcher | App header, active merchant cookie, memberships/roles | Server context and isolation are implemented/tested; persistence depends on cookie/context and needs persona/browser proof |
| Date range/timezone | Dashboard/reports | State is query-based on reports; cross-page persistence is not uniform |
| Notifications | Header unread count, `/notifications`, preferences route | In-app read state/deduplication tested; real provider email not verified |
| Setup/readiness | Onboarding gate, integrations health, automation readiness, demo banner | Health is now fail-closed; readiness can still be misunderstood when source data is stale or absent |
| User menu / environment | Avatar menu, environment chip, demo mode, billing status | Present; demo state is explicit, but dev tier/billing previews add non-production branches |
| Breadcrumb/back/related links | App header, detail shells, connected object panels | Related links exist; multiple object routes and redirects can lose conceptual place |
| Export/refresh/sync | Reports export, integration sync/reconnect, import progress | Export is tier-gated; external write actions excluded; refresh semantics differ by page |

## G. Actions and permissions

Observed action families: create/manual case fallback; assign/release; comment/mention; snooze; decide/approve/deny/escalate/no action; record outcome; resolve/dismiss exception; upload evidence; import/sync/reconnect/disconnect; create/edit/activate rule or flow; run/retry workflow; create/record recovery; add evidence; export; create/revoke API key/widget token; open source record; change attribution/recoverability; write off/close where supported; manage account/team/settings.

Permissions are server-checked through owner/admin/analyst/viewer roles and route permission constants (`VIEW_DASHBOARD`, `VIEW_INBOX`, `VIEW_CUSTOMERS`, `VIEW_SETTINGS`, `VIEW_AUDIT`, `VIEW_CHARGEBACKS`, `VIEW_WATCHLIST`). Tests cover route security, ID tampering and isolation. The action map is fragmented across route handlers and components; not every visible action has a single documented reversible/audit contract. High-risk external actions are not present as approved write-through behavior. The UI can imply a complete case decision even when source freshness/evidence/final outcome is not available.

## H. Status and lifecycle map

Case status is the most fragmented enum: current payout states coexist with legacy claims states (`new`, `evidence_needed`, `awaiting_*_evidence`, `ready_for_decision`, `manual_review`, `decision_recorded`, `recovery_opened`, `closed`, plus `pending`, `open`, `escalated`, resolved variants, `voided`, `stale`). Recommendation, evidence and financial states are separate but displayed together. Recovery status is clearer: `draft`, `evidence_needed`, `ready_to_submit`, `submitted`, `waiting_response`, `chase_due`, `approved`, `partially_approved`, `rejected`, `appealed`, `paid`, `closed_unrecoverable`. Sync is `pending/running/completed/failed`; connection is `active/disabled/revoked/error`; partner/rule statuses use active/inactive and versioned activation; notification read state is read/unread.

Invalid or confusing combinations include a recovery without a loss, mixed currencies, source data stale while readiness appears ready (fixed for canonical integration health), old resolved claim labels alongside payout-control labels, and a recommendation that may be outdated while still visually actionable. Automated state-machine tests pass for supported transitions; UI-wide status vocabulary is not consolidated.

## I. Navigation and information architecture findings

The current architecture has a coherent primary workbench but a fragmented long tail. The same underlying customer/order/case can be reached from queue, work, exceptions, search, customer profile, object detail, reports, notifications and legacy aliases. This is useful for deep linking but makes canonical ownership unclear. `/claims` is canonical in current navigation while tests and older components still call it Claims; `/chargebacks` is evidence packages but full chargeback automation is deferred; `/watchlist`, `/global`, `/lookup`, `/catches`, `/store`, and older settings integrations remain accessible outside the main sidebar.

Dead ends/weak transitions include hidden settings pages redirecting to `/settings`, customer detail views with prior 404 evidence, unsupported Yuma/Siena help routes, legacy pages with no current workbench bridge, and source/object pages whose final case/financial relationship is not always obvious. A merchant can lose place when moving between a case, customer, source order, recovery and report because several are separate shells rather than one canonical connected-object path.

## J. Dashboards, metrics and reports

Current KPIs/charts and tables cover payout exposure, confirmed/estimated loss, recoverable/recovered, prevented, written off, final net loss, open case count, ageing/backlog, recovery funnel, attribution, source/partner performance, automation/readiness, reconciliation lag, workload/task state, and ROI-like summaries. Reports include date range/timezone, charts, tables, exports and record drilldowns. Dashboard exposure reconciles to eight canonical USD summaries totaling USD 3,739.80 in the retained validation merchant; confirmed loss and canonical recovery are zero. The recovery board’s direct seed must not be included in reconciliation.

Metric risks: definitions are distributed across read models/components; date scope and currency behavior are not visibly identical everywhere; “prevented” and “exposure” can be confused with confirmed loss; ROI/readiness/workload may be more indicative than independently verifiable; reports are rendered and underlying-record navigation exists, but the complete case-to-final-loss-to-recovery trace is not proven.

## K. Empty, loading, failure and stale states

Route-level `loading.tsx` and `error.tsx` exist for dashboard, work, claims, losses, recoveries, reports, integrations, settings, watchlist, chargebacks and dynamic detail routes. Components include workbench empty states, no-search/no-filter results, evidence unavailable/unsupported/unknown, import progress, connection stale/unknown/error, billing unavailable, and demo/setup banners.

Strength: the evidence model distinguishes present, missing, unavailable and unknown; validation found the integration gate previously contradicted stale health and fixed it to fail closed. Gaps: not every deep object route has an equally useful first-use state; stale source data can still make a page feel current; legacy pages can look valid despite being outside MVP; several error states expose a technical failure without a clear next action; live provider outage and deployed cron failure states were not browser-tested.

## L. Responsive and interaction audit

Checked-in remediation evidence covers desktop and mobile screenshots for overview, work, payout control, losses, recoveries, customers/customer detail, rules, flows, reports, integrations, settings, notifications and payout control. The validation report says no horizontal overflow or generic crash state appeared at desktop/tablet widths. Automated current-product coverage is 1440px desktop and 1024px tablet. The requested mobile browser walkthrough could not be freshly run in this environment, so mobile conclusions are screenshot evidence rather than current interactive verification.

Known interaction risks are dense tables and detail rails on small widths, long IDs/names/financial values, drawer/modal focus and keyboard behavior, hidden/disabled actions, duplicated back paths, and toast/confirmation states. No destructive action was executed.

## M. Implementation maturity matrix

| Area | Current capability | Evidence | Maturity | Merchant impact | Main gap |
|---|---|---|---|---|---|
| Auth/tenant context | Authenticated layout, onboarding gate, merchant switcher, server permissions | layout code, route-security/RLS tests | Production-capable in tested paths | Strong isolation baseline | Persona/browser coverage incomplete |
| Payout case queue/detail | Case review, source context, evidence, recommendation, comments, assignment, outcome controls | current browser suite, case evidence, unit/integration tests | Design-partner capable for review workflow | Clear central job | Final financial closure unproven |
| Evidence | Checklist and source/unavailable states | evidence components/tests | Design-partner capable | Supports explainability | Provider breadth/freshness proof |
| Rules/flows | Rule builder, versioning, flow editor/runs | code/tests/browser screenshots | Implemented but unverified | Policy configuration exists | Operational usability and run proof |
| Exceptions | Focused queue, assignment, case links, reconciliation exceptions | code, 17 fixture rows, tests | Design-partner capable with fixtures | Exception concept is clear | Live financial resolution not shown |
| Loss ledger | Loss list/detail/actions and calculations | schema, finance tests, screenshots | Partially implemented | Expected financial destination exists | No canonical live loss chain |
| Recovery board | Board/detail/status/evidence/outcome | recovery tests/screenshots | Partially implemented | Recovery job visible | Noncanonical seed and no live proof |
| Integrations | Provider cards, OAuth/setup, health, imports | code, Gorgias preflight, Shopify 401 | Implemented but unverified | Setup path exists | Real provider coverage and stale data |
| Reporting | Dashboard/reports/export/record drilldown | browser evidence, reconciliation report | Implemented but unverified | Operational summaries exist | Metric definitions/traceability |
| Customers/objects | Customer table/drawer/profile plus order/shipment/ticket/refund/return/dispute pages | screenshots, tests, prior 404 defect | Partially implemented | Context can support review | Duplicate routes and missing live context |
| Notifications/collaboration | In-app notifications, comments, mentions, tasks | tests/browser evidence | Design-partner capable in-app | Ownership supported | Email/provider delivery absent/unverified |
| Admin/billing/API | settings, team/API/billing/privacy/audit code | route code, hidden-route tests | Implemented but hidden/partial | Admin capability exists | Navigation/entitlement fragmentation |
| Legacy identity/network | watchlist/global/identity schema/help/catches | routes/schema/rules | Legacy | Can misframe product | Must remain out of current MVP story |

## N. Defect register

| ID | Severity | Route/flow | Problem | Merchant impact | Evidence |
|---|---|---|---|---|---|
| DEF-001 | Critical | Source-to-financial lifecycle | No complete built-app demonstration from source event through case, loss, recovery and final report | Merchant cannot yet rely on end-to-end financial accountability | phase-12 validation §37–39 |
| DEF-002 | High | Integrations | Shopify credential returns 401; most providers are fixtures/simulations only | First-use setup and automatic case creation cannot be proven | phase-12 §10–11 |
| DEF-003 | High | Reconciliation | Deployed scheduled reconciliation has not run with `CRON_SECRET` | Missed source changes may remain unverified in production | phase-12 §16, §37 |
| DEF-004 | High | Recoveries | Retained recovery seed has no loss, mismatched GBP/USD currency and bypassed invariants | Recovery board can show financially misleading work | DATA-VAL-001 |
| DEF-005 | High | Navigation/IA | Canonical payout-control model competes with claims, chargebacks, watchlist, global, catches and legacy settings routes | Merchant language and object ownership are unclear | appRoutes, route inventory, screenshots |
| DEF-006 | High | Metrics | Financial definitions and labels are distributed across dashboard/reports/cases/losses/recoveries/legacy claims | Totals can be interpreted inconsistently | component/schema/report inspection |
| DEF-007 | High | Case/customer context | Customer/order context had a source-customer-vs-identity ID mismatch; fixed but identity-less/order-less cases still omit fetch | Reviewers may lack context exactly when deciding payout | APP-VAL-004 |
| DEF-008 | High | Audit | Null audit metadata previously dropped `view_customer`; fixed, but full financial-chain audit proof is absent | Accountability may be incomplete | APP-VAL-005; phase-12 §27 |
| DEF-009 | Medium | Customer/object navigation | Customer view 404 evidence and many separate object detail routes | Dead ends and loss of place | `docs/audit-evidence/2026-07-13/09-customer-view-404.png` |
| DEF-010 | Medium | Settings/admin | Team, billing, notifications and audit trail routes exist but redirect; code and header banners still expose related concepts | Admin capability is hidden or confusing | hidden-routes test, settings components |
| DEF-011 | Medium | Browser validation | Fresh in-app browser walkthrough blocked by local browser/network boundary | Current interactive state not independently re-observed in this audit | audit execution limitation |
| DEF-012 | Medium | Collaboration | Durable provider-bound email queue/live delivery not found | External notification expectations may not be met | phase-12 §25, §34 |
| DEF-013 | Medium | Data/schema | Database lint reports broken `legacy_v1` functions referencing moved legacy tables | Legacy paths may fail unexpectedly | phase-12 §7 |
| DEF-014 | Low | Quality/dependency | 73 lint warnings and seven production dependency advisories remain | Maintenance/security debt | phase-12 §6, §30 |

The five application defects listed in the validation report (reconciliation false success, fail-open integration readiness, route-param typing, case customer context mismatch, and null audit metadata) were fixed and have regression coverage. They remain relevant audit evidence because they show the boundary of current confidence; the critical/high items above are current product-surface risks, not necessarily unfixed code defects.

## O. Duplication and legacy register

| Duplication | Locations | Authoritative/current | Merchant impact / future consolidation |
|---|---|---|---|
| Claims vs payout control | `/claims`, `/claims/[id]`, older claims components/tests and payout components | Payout-control case workbench | One canonical case vocabulary and route should own review |
| Integrations hubs | `/integrations`, `/settings/integrations`, provider pages under both concepts | `/integrations` health centre plus provider detail | One setup/health path; current aliases create ambiguity |
| Customer context | `/customers`, customer profile, `/watchlist`, `/global`, `/lookup`, object panels | Customers/profile plus connected-object links | Retire/contain identity/network framing and clarify canonical customer object |
| Evidence surfaces | payout evidence rail/checklist vs `/chargebacks` evidence package forms | Payout evidence checklist for MVP | Chargeback evidence remains a separate deferred/legacy capability |
| Financial summaries | dashboard, reports, case exposure/loss cards, losses, recoveries, legacy claims | canonical financial summary/loss ledger | Centralize definitions and drilldown semantics |
| Status logic | claim enum legacy/current values, recovery status, UI labels | current state machine/read models | Map one merchant label set and reject invalid combinations |
| Onboarding/setup guidance | onboarding, integrations, settings provider setup, help pages, readiness cards | onboarding + integration centre | Make one source of truth for next setup action |
| Source matching/identity | canonical customer/order matching plus identity/network tables/help | source-agnostic matching for MVP | Keep matching, contain network residue, do not revive cross-merchant identity product |
| Reports and records | `/reports`, `/reports/records`, queue tables and dashboards | reports + canonical record drilldown | Align filters/date/currency and source traceability |

## P. Missing merchant-capability register (approved MVP+ only)

1. A merchant cannot yet prove the complete source-event -> payout case -> confirmed loss -> recovery -> final net loss -> report journey in the built app.
2. A merchant cannot reliably distinguish all estimated, exposed, paid, confirmed-loss, recoverable, recovered, prevented, written-off and final-net-loss meanings across every surface.
3. A merchant cannot always see a single canonical next action when source data is stale, unavailable, probable or conflicting.
4. A merchant cannot complete a fully evidenced recovery outcome against a live canonical loss in the validated merchant dataset.
5. A merchant cannot rely on a verified live Shopify connection/import/reconciliation path.
6. A merchant cannot discover or use all account/team/audit/notification administration consistently because several pages redirect or are hidden.
7. A merchant cannot consistently navigate between customer, order, ticket, case, loss, recovery and report without encountering parallel/deep-link models.
8. A merchant cannot independently verify every major KPI from the underlying record with uniform date/currency/provenance semantics.
9. A merchant cannot rely on production scheduled reconciliation or provider-bound email notification from current evidence.
10. A merchant may encounter legacy identity/network terminology that is not part of the approved MVP direction.

## Q. Recommended priority order (no implementation performed)

1. Establish real design-partner evidence: valid Shopify/Gorgias credentials, a clean merchant dataset, deployed cron run, and one complete source-to-final-financial-result walkthrough.
2. Make canonical financial definitions and status labels consistent across case, dashboard, reports, losses and recoveries.
3. Make payout case, exception, loss and recovery the canonical connected object chain; contain legacy routes and aliases.
4. Verify integration freshness, import/reconciliation failure handling and source provenance as merchant-facing states.
5. Close the live recovery and auditability gap with a canonical loss/recovery chain and independently verifiable report drilldown.
6. Validate role/persona, keyboard, tablet/mobile and hidden-admin behavior with safe data.
7. Decide which legacy/unsupported provider/help surfaces remain accessible in the design-partner build and document the boundary.

## R. Summary counts and evidence conclusion

- **Authenticated route pages found:** 65
- **Major views found:** 92 counted route-level views plus distinct named panels/drawers/modals/builders
- **Major merchant flows found:** 12 end-to-end families (onboarding, integration lifecycle, support payout, retrospective refund/replacement, carrier/delivery, warehouse/3PL, returns, disputes, exception resolution, recovery, management/reporting, collaboration)
- **Current critical product-surface defects:** 1 evidence-blocking critical item (no complete source-to-final-financial-result demonstration)
- **Current high product-surface defects/risks:** 8
- **Pages that appear complete:** `/work`, `/claims`, `/claims/[id]`, `/exceptions`, `/customers`, `/rules`, `/integrations` and `/reports` are the strongest current workbench pages, with the qualification that “complete” means usable/validated for their demonstrated slice, not production-ready end-to-end.
- **Pages requiring major work:** `/losses`, `/recoveries`, `/recoveries/[id]`, `/integrations/[provider]`, `/reports`, object-detail routes, hidden settings/admin routes, and legacy/canonical boundary surfaces.
- **Broken or misleading flows:** Shopify setup/import (401), deployed reconciliation evidence, recovery proof with orphan/mismatched-currency seed, legacy route competition, inconsistent financial/status wording, prior customer-view 404/context failure, and absent complete financial closure trace.
- **Legacy or duplicated areas:** claims/chargebacks/evidence parallelism; watchlist/global/identity/network/catches; integrations/settings duplicates; customer/lookup object duplicates; dashboard/reports/ledger financial duplicates; legacy status values.
- **Five highest-priority product gaps:** complete live lifecycle proof; canonical financial/status definitions; canonical connected object navigation; verified integration freshness/reconciliation; canonical recovery/audit/report traceability.

**Final status: Product surface audit complete with documented limitations**
