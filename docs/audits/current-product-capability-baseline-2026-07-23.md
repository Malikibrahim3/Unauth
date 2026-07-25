# Unauth current product capability baseline

**Audit date:** 2026-07-23  
**Repository snapshot:** `perf/architecture-overhaul` at `2fef68a37d4b3e56eaf6425fed9e04f8f87d21a2`  
**Purpose:** Evidence-based current-product baseline for later Founder Roadmap, Product Map Release 1, and Product Map Release 1.1 work. This is not a roadmap and does not authorize implementation or removal.

## Classification key

Every capability classification in this report uses one of the required states:

- **Verified end-to-end** — surface, server/domain logic, persistence or provider interaction, authorization/tenant boundary, and tests or strong executable evidence are present.
- **Implemented but partial** — a meaningful path exists, but a required layer, state, integration, edge case, or runtime proof is incomplete.
- **UI-only or simulated** — the interface exists but relies on static/demo/no-op or non-persistent behaviour.
- **Backend-only** — schema/services/routes exist without a complete supported user journey.
- **Legacy or disconnected** — code exists but is not reached by the canonical product, duplicates another source of truth, or conflicts with the current architecture.
- **Documentation/type/schema only** — represented in documentation, types, or schema without an implementation path.
- **Unable to verify** — repository evidence is insufficient; the missing evidence is stated.

“Verified end-to-end” in this report means verified in the local/synthetic repository environment unless explicitly stated otherwise. It does **not** mean production-proven.

---

## 1. Executive summary

Unauth has a substantial, coherent local core for merchant payout-control work. The strongest path is:

`source/customer/order/ticket data → support_payout_case → evidence and deterministic recommendation → immutable merchant decision → verified source outcome → append-only financial projection → loss → recovery work → reports/audit`

The repository contains real authenticated surfaces, permission-checked APIs, database-backed state, idempotent PostgreSQL functions, event deliveries, tenant-isolation controls, and broad tests. The local focused verification run passed type checking, lint, authenticated design checks, the P0 evidence ledger, and 252 representative tests. Rules, work tasks, canonical financial reporting, loss/recovery records, customer history, team administration, privacy operations, audit history, and much of the Gorgias/Shopify ingestion code are meaningful existing product and must not be erased by a narrower pilot plan.

The application is not yet a complete or production-validated decision-to-recovery system:

1. **A merchant decision is authorization, not execution.** Recording “approved”, “refund”, or another decision does not issue a Shopify refund, reship, replacement, store credit, discount, carrier claim, or supplier/warehouse request. Actual financial outcomes enter through later source reconciliation.
2. **Pre-decision investigations are not implemented.** `case_clarification_requests` exists and recommendation text can suggest enquiries, but there is no supported create/send/chase/respond/attach/close journey for customer, carrier, warehouse/3PL, supplier, or partner investigations.
3. **“Delivered” is incorrectly promoted to proof of delivery.** The delivery evidence builders set proof-of-delivery true from delivered status plus a delivered timestamp, without requiring a photo, signature, or location. This can overstate evidence and responsibility confidence.
4. **Missing parcel and missing item are not reliably distinguished at ingestion.** The stored case enum has no `missing_item`; manual creation cannot select it; common “missing item” text/tag variants are not robustly normalized; and the public gate maps `MISSING_ITEM` to `not_as_described`.
5. **Rules are live, but Flows are not wired to normal domain events.** Flow definitions, versions, publishing, test runs, outputs, and run history exist. `workflowHandler` is registered in the worker registry, but the normal event-producing paths do not register a delivery for it, so published flows are effectively disconnected from production facts.
6. **No connector has current controlled-runtime proof in this snapshot.** The repository’s own proof matrix marks Shopify, Gorgias, ShipBob, WooCommerce, BigCommerce, Zendesk, and Freshdesk as Beta; UPS, FedEx, CSV, document upload, and self-fulfilment as Partial; and disputes/carrier-claims slots as Planned. “Live” must not be inferred from code or tests.
7. **Generic event ingestion accepts events into an inbox with no discovered worker or status endpoint.** `/api/v1/ingest/events` returns a status URL, but no matching status route or inbox processor was found.
8. **Two high-confidence tenant/token defects require attention before launch.** Partner recovery rules accept a `partner_id` without verifying that the partner belongs to the same merchant, while service-role code bypasses RLS and the schema lacks a composite tenant FK. Separately, revoking a merchant API key does not revoke or invalidate its paired widget token.
9. **Financial semantics are mostly careful and worth preserving.** Decisions, source-confirmed outcomes, approved recovery, and recovered cash are separate. Amounts use minor units and currencies are not silently combined. However, Shopify refund value is not an accounting-grade cost basis, a recovery-board KPI is mislabeled, and report trend bucketing does not fully apply the selected timezone.
10. **Release readiness remains unproven despite strong local evidence.** The local P0 ledger has 322 controls: 153 PASS, 0 FAIL, and 169 UNVERIFIED. Production schema/storage-policy parity, credential rotation, live provider behaviour, scheduled workers, webhooks, accessibility at full breadth, operational privacy policy, and production data-volume behaviour all still require runtime or organizational confirmation.

**Overall baseline classification:** **Implemented but partial** — **high confidence**.

The correct planning posture is to preserve the working canonical core and broader product surfaces, complete the missing operational loop, harden the identified integrity/security boundaries, and validate providers in controlled accounts. Repository evidence does not support a broad rewrite or the removal of capabilities merely because they fall outside an initial pilot.

## 2. Repository identity and audit limitations

### 2.1 Final inspected identity

| Item | Evidence |
|---|---|
| Working directory | `/Users/malikibrahim/Downloads/Unauth` |
| Branch | `perf/architecture-overhaul` |
| Commit | `2fef68a37d4b3e56eaf6425fed9e04f8f87d21a2` (`2fef68a3`) |
| Commit subject | `feat: complete MVP+ remediation and canonical baseline` |
| Commit date | 2026-07-23 13:43:23 +0100 |
| Upstream | `origin/perf/architecture-overhaul` |
| Ahead/behind | `0/0` at the final pre-report snapshot |
| Pre-report working tree | Clean |
| Node | `v22.14.0` |
| npm | `10.9.2` |

The audit began while another agent was actively editing the same working tree, as the user stated. During inspection those changes were committed. To avoid auditing a moving mixture, repository identity, status, key inventories, contradictions, and verification commands were re-run after the tree became clean. This report is therefore anchored to the final commit above, not the earlier observed `8f943e…` state.

The audit report itself is the only intended post-snapshot write. No application, migration, configuration, test, package, environment, seed, or existing documentation file was changed by this audit.

Relevant recent history:

| Commit | Date | Subject |
|---|---|---|
| `2fef68a3` | 2026-07-23 | `feat: complete MVP+ remediation and canonical baseline` |
| `8f943e03` | 2026-07-20 | Merge integration-health branch into main |
| `cde030cf` | 2026-07-20 | Implement merchant identity and integration linking updates |
| `5187cb10` | 2026-07-18 | Remove localhost fallback risk and debug logs |
| `63e786ed` | 2026-07-18 | Operational-page and shared summary UI changes |
| `2c71f70b` | 2026-07-17 | Shared-layer UI precision pass |

### 2.2 Authoritative instructions and documents read

- `CLAUDE.md`
- `.codex/rules/authenticated-product.md`
- `ARCHITECTURE.md`
- `docs/PRODUCT.md`
- `docs/TESTING.md`
- `docs/CONNECTORS.md`
- `docs/SECURITY.md`
- `docs/OPERATIONS.md`
- `PILOT_COMMAND_CENTRE.md`
- `docs/MVP_PLUS_CASE_INVESTIGATIONS_SCOPE.md`
- `docs/audits/unauth-mvp-plus/*`, including remediation status, requirements, journeys, security, provider proof, migration provenance, privacy data map, and production rollout packet
- The eight active migrations, relevant archived migration evidence, and `lib/supabase/types.ts`

No `AGENTS.md` or equivalent repository-local agent file was found beyond the instructions above.

### 2.3 Scale inspected

| Inventory | Count |
|---|---:|
| All `page.tsx` files | 64 |
| API `route.ts` files | 195 |
| Components (`.ts`/`.tsx`) | 251 |
| Library files (`.ts`/`.tsx`) | 530 |
| Test/spec files | 326 |
| Active migrations | 8 |
| Archived pre-canonical migrations | 223 |

### 2.4 Limitations

- No production, staging, sandbox, Supabase, provider, email, webhook, browser, or billing service was contacted.
- No database mutation or migration replay was performed in this audit.
- No production build was run because it writes `.next` artifacts and the prompt permits only the report write.
- Provider credentials, secrets, and live account state were not inspected or printed.
- Local tests use mocks, fixtures, and synthetic PostgreSQL evidence; they cannot prove live-provider semantics or production configuration.
- The exact production storage-policy and per-object privilege parity recorded in prior remediation evidence remains unverified.
- Current data volume, latency, job scheduling, provider registration, webhook delivery, email deliverability, and live RLS behaviour require controlled runtime confirmation.
- Absence findings are based on repository-wide route/service/call-site searches plus schema inspection. Runtime-injected infrastructure outside the repository could not be assessed.

## 3. Current architecture and canonical sources of truth

### 3.1 Architectural path

The intended architecture is provider-neutral:

`provider/API/manual input → source records → relationships → canonical customer/order/case → evidence/evaluation → immutable decision/outcome facts → domain events/deliveries → financial/loss/recovery projections → work, notifications, reports, and audit`

The strongest parts conform to that model. Provider adapters normalize Shopify, Gorgias, ShipBob, carrier, CSV, and related records into source tables; cases use canonical links; decisions and source outcomes are separate immutable facts; PostgreSQL functions enforce state versions and idempotency; projections build financial and operational views.

The architecture is not uniformly enforced. The public/legacy gate paths write directly to case status and compatibility events; the generic ingestion inbox is not connected to a discovered worker; normal domain-event producers omit `workflowHandler`; and older accountability/evidence systems remain alongside canonical models.

### 3.2 Canonical and derived records

| Concern | Current source of truth | Derived/read models and notes |
|---|---|---|
| Merchant/workspace | `merchants`, `merchant_users`, membership/permission tables | Selected-workspace cookie and auth metadata; application permission context |
| Provider connection | Provider-specific connection rows plus `merchant_integrations` | Catalogue/health/setup projections; duplicate provider-specific and canonical status must remain reconciled |
| Raw/source entities | `source_customers`, `source_orders`, `source_tickets`, `source_shipments`, `source_refunds`, related provider records | Normalized/provider-linked object pages and support context |
| Customer | Merchant-scoped customer/profile relationships plus source customers | Customer history, signals, possible matches, notes; network tables exist but merchant-facing disclosure is disabled |
| Payout case | `support_payout_cases` | Queue/detail, case events, exceptions, financial summary, work |
| Recommendation | Persisted recommendation/evaluation fields and rule snapshot/trace on the case | Deterministic evaluator output; advisory only |
| Merchant decision | Append-only `case_decisions` | Case decision state and timeline; does not prove provider action |
| Actual outcome | Append-only `case_outcomes` written by verified source reconciliation | Financial/loss projections; reversals preserve history |
| Evidence | `evidence_items` plus `evidence_links` | Decision checklist, attribution inputs, source provenance |
| Financial truth | Append-only `case_financial_entries`, with per-case summaries | Confirmed loss, recoverable, recovered, prevented, written off, net |
| Loss | `loss_cases`, `loss_case_events`, attribution candidates | Loss list/detail and recovery creation |
| Recovery | `recovery_cases`, `recovery_case_events`, correspondence/tasks | Recovery board/detail; external submission remains merchant-recorded |
| Work | `work_tasks` | Queue, assignment, due/overdue, status, deep links |
| Notifications | `notifications`, notification preferences | Read/unread UI; direct mention and scheduled operational projection paths |
| Payout rules | `merchant_rules`, `merchant_rule_versions` | Evaluation snapshot/trace and rule UI |
| Flows | `workflow_definitions`, workflow versions/runs/steps | Configuration/test surface is live; event dispatch is disconnected |
| Partners/terms | `partners`, `partner_recovery_rules` | Recovery estimation/deadlines; partner tenant-parent validation is incomplete |
| Audit | Immutable `domain_events`, delivery rows, case/loss/recovery compatibility events, durable audit projection | Audit/settings/timeline views |
| Privacy | Erasure receipts, cleanup jobs, retention-related fields/RPCs | Data privacy settings and account deletion paths |

### 3.3 Events, state transitions, and concurrency

- `record_domain_event` is idempotent by `(merchant_id, idempotency_key)` and creates named delivery rows.
- `transition_payout_case` locks the case, checks `state_version`, validates allowed patch fields and final-state/closure conditions, records an event, and writes a compatibility timeline entry atomically.
- `record_case_decision` and `record_case_source_outcome` separate merchant intent from externally observed fact and detect idempotency conflicts.
- `transition_recovery_case` separates submitted, approved, paid, rejected, appealed, and written-off semantics and uses stable idempotency keys at its supported call sites.
- Domain event handlers are leased and retried through `domain_event_deliveries`; dead-letter operations exist.
- Webhook safety migrations and helpers implement body limits, merchant resolution before service-role use, per-connection secrets where supported, deduplication, stale/conflict handling, and claim/complete/fail semantics.

### 3.4 Canonical boundary failures

| Boundary issue | Evidence and consequence | Classification | Confidence |
|---|---|---|---|
| Public/legacy gate bypass | `app/api/claim-gate/check/route.ts` and related public gate code directly update case fields and append compatibility events instead of using the canonical transition/decision/outcome services. | **Legacy or disconnected** | High |
| Generic inbox without consumer | `/api/v1/ingest/events` inserts `ingestion_events`; no application worker claiming those rows or returned event-status route was found. | **Implemented but partial** | High |
| Flow deliveries omitted | `workflowHandler` exists in `DOMAIN_EVENT_HANDLERS`, but normal case/outcome/recovery/refund producers register other handlers only. | **Legacy or disconnected** | High |
| Evidence dual model | Canonical `evidence_items`/`evidence_links` and PDF-oriented `evidence_packages` do not share a case-level source of truth. | **Legacy or disconnected** | High |
| Responsibility/recovery dual model | Canonical `partners`/`partner_recovery_rules`/`loss_cases`/`recovery_cases` coexist with `agreement_rules`/`loss_sources`/`recovery_tasks` reached by the legacy gate. | **Legacy or disconnected** | High |

## 4. Current navigation and surface inventory

Navigation is permission-filtered through `lib/navigation/appRoutes.ts`. Primary entries are Overview, Work, Payout Control, Losses, Recovery, Customers, Rules, Flows, Reports, Integrations, and Settings; Help is separate. The authenticated layout resolves the user, active membership, role/capabilities, profile, connector/setup state, and workspace before rendering. Global command search is in the header.

| Surface and routes | User job and data | Main actions and persistence | States/permissions | Classification | Tests/evidence and limitations |
|---|---|---|---|---|---|
| Overview `/dashboard` | View financial position, queue health, trends, source freshness, and cases from canonical financial/case/connection data. | Filters, date range, drill-down, export; reads are live and exports are audited. | Loading/error/empty/source-health states; dashboard permission, advanced reports and exports gated. | **Verified end-to-end** | High confidence. Canonical report tests are strong. 10k case cap; trend buckets do not fully apply selected timezone; coverage freshness is a current 48-hour measure, independent of report range. |
| Work `/work` | Operate `work_tasks` plus linked cases/exceptions. | Assign, start, snooze, complete, reopen, and bulk update persist through APIs/RPCs. | Filters, empty/error, overdue derivation; write actions require payout-decision capability. | **Verified end-to-end** | High confidence. Live tables and API tests. Workflow-created tasks depend on disconnected flow dispatch; some decision/evidence filters are heuristic. |
| Payout Control `/claims` | Triage `support_payout_cases`, owners, unread/SLA/snooze, outcomes, orders, tickets, and customers. | Filter/search/sort, create manual case, assign/status/snooze via supported routes. | Empty/loading/error and legacy/canonical status handling; permission-gated. | **Implemented but partial** | High confidence. Real queue and tests; query caps; queue deliberately has no case-linked PDF evidence-package badge. |
| Case detail `/claims/[id]` | Review context, evidence, recommendation, financial history, recovery, comments, and timeline. | Evaluate, record/reverse decision, change status, add evidence/comment, copy a customer response. Most persist; copied response is not sent. | Merchant-scoped 404, errors, optimistic version conflicts, closure blockers, permission gates. | **Implemented but partial** | High confidence. Strong route/unit tests. No investigation/clarification management or responsibility confirmation. Decision choices do not execute commerce actions. |
| Losses `/losses`, `/losses/[id]` | View confirmed losses, attribution, evidence, activity, and recoveries. | Filter/drill down; UI supports write-off. | Unknown vs zero and currency-aware views; permission-gated. | **Verified end-to-end** | High confidence locally. Backend attribution/recoverability/owner mutations are not fully surfaced. Accounting cost basis remains limited. |
| Recovery `/recoveries`, `/recoveries/[id]` | Track partner recovery from ready through paid/closed. | Transition status, amounts, notes; persists through canonical recovery RPC. | Empty/error, multi-currency, status guards and permissions. | **Implemented but partial** | High confidence. No provider submission/action. “Submitted” means recorded as submitted externally; correspondence is read-only in UI. Board “Approved recovery” KPI uses recovered amount. |
| Customers `/customers`, `/customers/[id]` | Review merchant-scoped customer history, cases, orders, shipments, signals, matches, notes, and source links. | Filter, profile navigation, notes/status where a source customer exists. | Entitlement, loading/error/empty, merchant scope. | **Implemented but partial** | High confidence. Real data/tests. Support-only or guest canonical customers can lack the source-customer identity required by some notes/evidence actions. |
| Customer evidence `/customers/[id]/evidence/new` | Generate a PDF/CE3-style customer evidence package. | Generate/store package and spend credit; downloadable through signed access. | Tier/credit and permission gates, error/rollback. | **Implemented but partial** | High confidence. Uses legacy `evidence_packages`, not the case evidence graph; v1/Gorgias path can bypass the same entitlement/credit controls. |
| Rules `/rules`, `/rules/[id]` | Configure deterministic payout recommendations. | Draft/version, simulate, review conflict, publish atomically, rollback to draft. | Empty/loading/error, manage/view permissions. | **Verified end-to-end** | High confidence. Live persistence and tests. Actions are recommendation-only (`approve`, `manual_review`, `deny`) and first-priority wins. |
| Flows `/flows`, `/flows/[id]`, `/flows/runs`, `/flows/runs/[id]` | Configure event-triggered operational automations and inspect runs. | Draft/test/publish/rollback persist; supported outputs create tasks/notification requests/deadline/evidence-request tasks. | Empty/loading/error, permission gates, run status. | **Legacy or disconnected** | High confidence. UI and engine are real, but normal domain events do not register `workflowHandler` deliveries; test runs are not proof of production triggering. |
| Reports `/reports`, `/reports/records` | View/export canonical financial and case records. | Range/filter/drill-down/export; export is permission-checked and audited. | Empty/error, advanced-tier and audit/export permission gates. | **Verified end-to-end** | High confidence. Useful existing product. Keep separated identified/approved/paid/recoverable/recovered/prevented/written-off values. Timezone and one recovery label need hardening. |
| Integrations `/integrations`, `/integrations/[provider]`, `/integrations/imports`, `/integrations/shipbob/select` | Configure, sync, import, inspect health/capabilities. | Provider-specific connect/verify/sync/reconcile/disconnect actions where implemented; CSV import persists. | Setup, pending/syncing/degraded/error/disconnected/stale states; settings permissions. | **Implemented but partial** | High confidence on code, low on live operation. Provider maturity varies and no connector is controlled-runtime proven in this snapshot. |
| Integration developer preview `/integrations/dev-preview` | Preview connector UI/capability presentation. | Mostly visual/dev inspection. | Developer-oriented; not a merchant operational path. | **UI-only or simulated** | High confidence. Should not be counted as provider evidence. |
| Notifications `/notifications` | Review operational and mention notifications. | Mark one/all read; preferences under Settings. | Empty/error/read-unread, member scope. | **Implemented but partial** | High confidence. Real persistence. No dismissal; assignment does not itself emit a notification; operational projector is capped. |
| Settings root/account/platform/billing | Manage account, platform, subscription/credits, and workspace-facing preferences. | Mixed persistent forms and billing-provider paths. | Owner/admin capability gates, empty/error states. | **Implemented but partial** | Medium-high confidence. Billing lifecycle has tests, but live Stripe/Resend behaviour was not exercised. |
| Settings agreements `/settings/agreements` | Upload and enter verified contract/recovery terms. | Document and manual-term records persist. | Settings permissions and upload states. | **Legacy or disconnected** | High confidence. Terms feed the legacy accountability path, not the canonical partner recovery evaluator. No live AI extraction. |
| Settings API integrations `/settings/api-integrations` | Create/revoke API credentials and copy paired widget token. | Create is shown once; API key revoke persists and is audited. | Manage-settings permission and validation. | **Implemented but partial** | High confidence. Revoking the API key does not revoke or invalidate its paired widget token. |
| Settings audit `/settings/audit-trail` | Inspect sensitive/admin/domain activity. | Filter/read/export where allowed. | Audit permissions and empty/error. | **Verified end-to-end** | High confidence locally. Durable append-only audit tests exist; production retention/export operations need runtime proof. |
| Settings privacy `/settings/data-privacy` | Hide/delete subject data, manage account deletion and policy-related controls. | Subject erasure and account deletion use receipts/jobs/RPCs. | Owner/permission gates, confirmations, pending cleanup. | **Implemented but partial** | High confidence locally. Operational policy/retention values and storage cleanup in production remain unverified. |
| Settings team `/settings/team` | Invite/revoke members, change roles/delegated grants, transfer ownership. | Persistent membership and ownership-transfer RPC actions. | Owner/admin restrictions; server authorization. | **Verified end-to-end** | High confidence locally. Supabase invite delivery is externally unverified. |
| Settings notifications and provider setup routes | Configure preferences and Shopify/Gorgias/Zendesk/Freshdesk/Chrome setup. | Persist preferences and provider-specific credentials/config. | Provider error/verification states and settings permissions. | **Implemented but partial** | High confidence on code. Some verification paths do not make a meaningful external probe; no controlled live account evidence. |
| Onboarding `/onboarding` | Create profile and connect commerce/helpdesk/widget. | Profile save persists; connector steps navigate to separate setup/OAuth. | Loading/error and skip options. | **Implemented but partial** | High confidence. Saving profile sets setup complete, so the guard can end onboarding before connector steps; Shopify callback does not reliably return to the step flow; “widget live automatically” is unverified. |
| Search/command navigation | Find cases/customers/orders and jump to product routes. | GET `/api/search?q=…`; no mutation. | Partial-result tolerance, loading/error, merchant scope. | **Implemented but partial** | High confidence. Real scoped search with caps; query terms/PII travel in URL and may reach logs/history. |
| Gorgias widget `/api/gorgias/widget` and unlock routes | Show case/order/customer context inside helpdesk and deep-link into Unauth. | Context lookup; full-context unlock; case evaluation can be invoked by GET. | Zero/ambiguous match output, token auth, entitlement/credit states. | **Implemented but partial** | High confidence on code. No controlled install/latency proof; GET causes writes; token/query PII concerns; “network/full context” is store-only. |
| Connected-object detail `/orders/[id]`, `/refunds/[id]`, `/returns/[id]`, `/shipments/[id]`, `/tickets/[id]`, `/disputes/[id]` | Inspect normalized source/canonical objects and relationships. | Primarily read/drill-down. | Merchant-scoped missing/error states. | **Implemented but partial** | Medium-high confidence. Quality depends on connector population and linking; provider runtime unverified. |
| Help `/help` | Explain the product and route to support. | Static guide and `mailto:` support link. | Static. | **UI-only or simulated** | High confidence. No in-product support workflow. |
| Redirected/legacy routes | Preserve old links such as `/inbox`, `/catches`, `/chargebacks`, `/evidence`, `/watchlist`, `/audit`, and `/partners`. | Redirect through `next.config.js`; `/exceptions` and customer claims also redirect. | Compatibility only. | **Legacy or disconnected** | High confidence. Redirects are valuable migration compatibility; destinations and old bookmarks must be considered before removal. |
| Design system `/dev/design-system` | Internal visual QA. | Static/component preview. | Development surface. | **UI-only or simulated** | High confidence. Not a merchant capability. |

## 5. Comprehensive capability matrix

### 5.1 Cases and decisions

| Capability | End-to-end trace and evidence | Classification | Confidence | Current limitation |
|---|---|---|---|---|
| Canonical case lifecycle | Queue/detail → claim APIs → `transitionCase`/PostgreSQL transition RPC → `support_payout_cases`, events/deliveries → queue/detail/timeline; route, state-machine, and financial-integrity tests. | **Verified end-to-end** | High | Compatibility status vocabulary remains broad; legacy direct writers bypass the service. |
| Case creation from helpdesk | Gorgias/Zendesk/Freshdesk ingestion → normalized ticket/customer/order linking → case creation/linking → queue/widget. | **Implemented but partial** | High | Gorgias is the strongest path; provider runtime and some provider reconciliation are unverified. |
| Case creation from manual input | Queue action → `/api/claims` creation → scoped source/order link or explicit unmatched reference → case. | **Verified end-to-end** | High | Manual issue schema cannot select `missing_item`; matching can remain ambiguous/unmatched by design. |
| Case creation from generic API | API key → `/api/v1/ingest/cases` → canonical entity ingest → source/case/event records. | **Implemented but partial** | High | No controlled client run; status/operational docs do not prove production use. |
| Case creation from generic event webhook | API key → `/api/v1/ingest/events` → `ingestion_events`. | **Implemented but partial** | High | Stops in inbox; no worker or status route found. |
| Supported stored issue types | `item_not_received`, `damaged`, `wrong_item`, `not_as_described`, `refund_request`, `chargeback`, `return_abuse`, `other`. | **Verified end-to-end** | High | Product-level subtypes/actions are broader than the stored enum. |
| Normalized reason/subtype | Evaluator and helpdesk normalizers derive reason/requested action metadata. | **Implemented but partial** | High | Missing-item phrases/tags are unreliable; no complete correction surface. |
| Agent correction of issue/subtype | Case form displays type/reason. | **UI-only or simulated** | High | Current fields are read-only; no canonical correction/audit journey. |
| Recommendation generation | Case/widget evaluation → evidence collection, merchant rules, deterministic evaluator → persisted recommendation/workflow fields and audit → detail/widget. | **Verified end-to-end** | High | Recommendation is advisory; repeated GET from widget can mutate evaluation state. |
| Merchant rule explanation | Evaluation snapshot/trace → recommendation UI and rule details. | **Verified end-to-end** | High | Explanation does not compensate for missing investigation execution or flawed evidence semantics. |
| Approve/deny/escalate/no-action decisions | Case review → outcome route → `record_case_decision` RPC → immutable decision/domain event → detail/timeline. | **Verified end-to-end** | High | Endpoint name “outcome” is misleading; decision is not actual customer/provider action. |
| Partial/full refund decision | Explicit minor-unit amount/currency → immutable decision and compatibility state. | **Verified end-to-end** | High | Does not issue refund; later source outcome is required for actual loss. |
| Reship/replacement/store credit/discount decisions | Requested-action types and source outcome vocabulary exist. | **Backend-only** | High | These are not exposed as complete decision choices or execution actions in case review. |
| Manual review | Rule engine can recommend `manual_review`; case can be escalated. | **Implemented but partial** | High | No investigation work packet is created; the next operational step is not orchestrated. |
| Status and next action | Case state, evidence checklist, workflow derivation, recovery state, and closure blockers drive UI copy. | **Implemented but partial** | High | Open clarifications are not loaded into evaluator; some next actions are recommendation text only. |
| Final-state protection | Versioned transition RPC prevents unsupported reopen/closure and requires explicit exception for blockers; decisions/outcomes reverse immutably. | **Verified end-to-end** | High | Legacy public gate direct writes do not share the same guarantees. |
| Comments and mentions | Case comments API → persistent comments/events; author-only edit/delete; mentions → notifications. | **Verified end-to-end** | High | Mention notification delivery beyond in-app was not found. |
| Audit/timeline | Domain and compatibility events, durable audit projection, case history UI. | **Verified end-to-end** | High | Several audit models coexist; production retention and completeness remain runtime questions. |
| Selected vs actual merchant action | Decision stored separately from source-confirmed `case_outcomes`; Shopify refund reconciliation can create actual fact. | **Verified end-to-end** | High | Only the separation is verified; broad provider observation and commerce action execution are incomplete. |
| Estimated vs actual financial outcome | Recommendation/decision amount, confirmed source outcome, financial entries, loss/recovery states are separate. | **Verified end-to-end** | High | Refund value is not full accounting cost; reship/replacement cost capture is incomplete. |

### 5.2 Evidence

| Capability | End-to-end trace and evidence | Classification | Confidence | Current limitation |
|---|---|---|---|---|
| Canonical evidence records/links | Provider/evaluator/manual mapper → `evidence_items`, `evidence_links` → case checklist/attribution. | **Verified end-to-end** | High | PDF evidence packages are separate and not case-linked. |
| Provenance and identifiers | Evidence includes source, source account/record/external identifiers, observed/collected timestamps and metadata. | **Implemented but partial** | High | Completeness varies by adapter; manual evidence is generic. |
| Freshness/source health | Connection state and evidence timestamps influence availability and UI source health. | **Implemented but partial** | High | Carrier token health is not equivalent to evidence freshness; no live provider proof. |
| Shopify evidence | Order/refund/fulfilment/source records feed case context and actual refund reconciliation. | **Implemented but partial** | High | No controlled Shopify account; not all customer actions/costs are observed. |
| Gorgias evidence | Ticket/customer/messages/tags/order hints hydrate support context and case matching. | **Implemented but partial** | High | No controlled install; provider macros are inferred, not an action system. |
| Warehouse/3PL evidence | ShipBob and self-pack records can provide fulfilment/package evidence. | **Implemented but partial** | High | Weight, item-level pack proof, photos, cancellations, and reconciliation depend on sparse provider data. |
| Carrier evidence | UPS/FedEx on-demand tracking collectors map scans/exceptions/delivery evidence. | **Implemented but partial** | High | No controlled provider run; carrier claims submission is absent. |
| Customer evidence | Ticket/customer messages and manually linked findings can contribute context. | **Implemented but partial** | Medium-high | No customer evidence-request/send/response workflow. |
| Uploaded documents/files | Document connector and agreement/evidence package uploads persist metadata/files and use signed access in supported paths. | **Implemented but partial** | High | Quarantine/approval exists, but controlled malware scanning and unified case linking were not proven. |
| Delivery events/scans/exceptions | Tracking evidence records delivered/exception scan facts. | **Implemented but partial** | High | A delivered timestamp is incorrectly converted to proof of delivery. |
| Photos/signatures/GPS/location | Carrier mapping has separate photo/signature fields; location metadata may exist. | **Implemented but partial** | High | GPS is effectively unavailable; photo/signature are not required for `hasProofOfDelivery`. |
| Weights and package proof | Provider/self-pack models can hold weight/pack facts. | **Implemented but partial** | Medium | No reliable cross-provider completeness or item-level missing-item proof. |
| Manual evidence finding | Claim panel can add a URL/metadata-backed finding to canonical evidence. | **Implemented but partial** | High | No structured photo review, upload workflow, or provenance-strength taxonomy in the surface. |
| Evidence package generation | Customer evidence generator → PDF/storage → `evidence_packages`/activity/credit spend → signed download. | **Implemented but partial** | High | Separate from case evidence; v1/Gorgias generation bypasses normal tier/credit enforcement. |
| Missing parcel vs missing item | Multiple product subtypes are documented/evaluated in fixtures. | **Implemented but partial** | High | Live normalization and manual creation collapse or mis-map missing item. |
| Irrelevant provider evidence prevention | Workflow derivation selects likely carrier/3PL/supplier/customer follow-up. | **Implemented but partial** | Medium | Recommendations are heuristic and do not execute; no enforced request relevance boundary. |

### 5.3 Rules, Flows, investigations, responsibility, and operations

| Capability | End-to-end trace and evidence | Classification | Confidence | Current limitation |
|---|---|---|---|---|
| Merchant payout rules | Rules UI → versioned APIs/store → simulate/conflict check → atomic publish → evaluator snapshot/trace. | **Verified end-to-end** | High | Limited action set; first matching priority wins. |
| Rule versions/approval/rollback | Draft/version/publish RPC and rollback-to-draft with audit. | **Verified end-to-end** | High | Approval is permission-based, not a multi-person approval workflow. |
| Rule thresholds/evidence requirements | Typed conditions and risk-band conflict checks drive recommendation. | **Implemented but partial** | High | Evidence requirements are not a universal configurable investigation policy. |
| Flow configuration/versioning | Flows UI/APIs → definitions/versions/test/publish/rollback/run tables. | **Verified end-to-end** | High | This classification covers configuration and test runs, not event-triggered production operation. |
| Flow event triggering | Domain event delivery → `workflowHandler` → active definition → run. | **Legacy or disconnected** | High | Producers do not register `workflowHandler`, so the trigger path is not reached normally. |
| Flow outputs | Engine can create task or notification request and task-shaped evidence/deadline work, idempotently. | **Backend-only** | High | No live event trigger; no external HTTP/email/payout action. |
| Contract/partner terms | Partner recovery rules are configurable and used in recovery calculation; agreements also persist terms. | **Implemented but partial** | High | Two competing models; partner contacts are only partly surfaced; no investigation SLA workflow. |
| AI contract extraction | Planning/schema/document-processing language exists. | **Documentation/type/schema only** | High | No live AI extraction/interpretation call path found. |
| Case clarification requests | `case_clarification_requests` schema and list/append helper exist. | **Backend-only** | High | No create/send/chase/response/close UI/API; evaluator does not load open requests before choosing next action. |
| External clarification/correspondence | `external_clarification_requests` and `external_correspondence` support post-loss/recovery facts. | **Backend-only** | High | Recovery correspondence POST exists but no current UI calls it. |
| Customer/carrier/3PL/supplier investigation | Recommendation text can say ask that party. | **Documentation/type/schema only** | High | No operational request lifecycle, email, portal, attachment, response, or SLA. |
| Internal investigation task | Generic `work_tasks` can be created manually/by flows. | **Implemented but partial** | Medium-high | Tasks are not a first-class investigation with request/response semantics; flow trigger is disconnected. |
| Multiple/parallel/primary investigation | Mentioned in investigation scope documentation. | **Documentation/type/schema only** | High | No implemented model/journey was found. |
| Responsibility attribution | Evaluator writes advisory `loss_attribution` and confidence; loss detail shows candidates/evidence. | **Implemented but partial** | High | Merchant cannot confirm/correct through the main UI; repeat-claimant network context is null. |
| Causal vs contractual responsibility | Attribution and partner recovery rules are separate concepts in code/data. | **Implemented but partial** | High | Confirmation and contract evidence linkage are incomplete; legacy agreement model competes. |
| Confirmed loss creation | Verified source outcome → domain event → loss/financial projections → loss page. | **Verified end-to-end** | High | Requires positive confirmed loss/currency and supported refund/reship/replacement facts; live source coverage varies. |
| Prevented payout | Denial/no-payout observation → waiting window → confirmation/cancellation → financial projection/report. | **Verified end-to-end** | High | Depends on later outcomes being observed; scheduled execution in production unverified. |
| Recovery creation | Loss/attribution/recoverability → recovery projection → `recovery_cases`/work. | **Verified end-to-end** | High | Provider submission is not performed. |
| Recovery lifecycle | Board/detail → status API → transition RPC/events/financial entries → reports. | **Verified end-to-end** | High | “Submitted” and “approved” are merchant-recorded external facts; correspondence UI is read-only. |
| Recovered cash vs approved recovery | Approved and paid/recovered amounts are distinct in storage/report logic. | **Verified end-to-end** | High | One board KPI label displays recovered as “approved”. |
| Written-off/net loss | Loss write-off RPC → financial entry/state → report. | **Verified end-to-end** | High | Only supported against outstanding recovery; accounting cost inputs remain limited. |
| Multi-currency arithmetic | Minor units, uppercase currency, per-currency summaries, unknown/unavailable semantics. | **Verified end-to-end** | High | No FX conversion; this is correct but must be preserved. |
| Work tasks | Multiple sources → `work_tasks` → work UI/API/RPC → statuses/deep links. | **Verified end-to-end** | High | One creation key includes a timestamp and is not stable across retries; flow tasks depend on flow dispatch. |
| Notifications | Mentions/operational projector/notification events → `notifications` → UI/read APIs. | **Implemented but partial** | High | No dismissal; operational scan caps merchants/items; assignment does not directly notify; non-request event projection is effectively a no-op. |
| Reports/exports | Canonical summaries/records → report services/pages → CSV export/audit. | **Verified end-to-end** | High | Timezone bucketing and one label need hardening; data caps exist. |
| Partner directory/recovery rules | Settings surface → partner/rule APIs/store → `partners`/`partner_recovery_rules` → recovery calculation. | **Implemented but partial** | High | Rule accepts a foreign-merchant partner ID; contacts/portal fields are only partly surfaced. |
| Team/RBAC/audit/privacy | Settings actions → permission services/RPCs/jobs/receipts → settings/audit UI. | **Verified end-to-end** | High | External invite delivery, production storage cleanup, and production privilege parity remain unverified. |

## 6. End-to-end journey traces

The step labels in this section use the requested journey shorthand: **Verified**, **Partial**, **Simulated**, **Disconnected**, or **Absent**. The final journey state also uses the formal capability classification.

### 6.1 Gorgias ticket → case → evidence → recommendation → merchant decision

`Gorgias webhook authentication/hydration [Partial: no live account] → merchant-scoped ticket/customer/order normalization [Verified locally] → case create/match [Verified locally] → support/carrier/order evidence [Partial] → deterministic evaluation and rule trace [Verified locally] → widget/case detail [Verified locally] → immutable merchant decision [Verified locally] → Gorgias tag/note best effort [Partial]`

**Journey classification:** **Implemented but partial** — **high confidence**. The code path is broad and well tested, including zero/ambiguous match handling, but provider install, webhook registration, latency, rate behaviour, and writeback are not runtime-proven. The decision does not issue a customer refund/replacement.

### 6.2 Shopify order/refund/reship event → case → loss

`Shopify OAuth/import/webhook [Partial: no controlled account] → source order/refund/fulfilment normalization [Verified locally] → order/case relationship [Partial by event type] → verified refund outcome [Verified locally] → financial/loss projection [Verified locally] → loss/report UI [Verified locally]`

**Journey classification:** **Implemented but partial** — **high confidence**. Refund reconciliation is the strongest actual-outcome path. Broad reship/replacement cost and reversal coverage is not live-proven, and Shopify is intentionally read-only for merchant actions.

### 6.3 Missing parcel → carrier evidence → responsibility → recovery

`Case issue normalization [Partial] → UPS/FedEx tracking collection [Partial/unverified provider] → evidence items [Verified locally] → responsibility recommendation [Partial] → merchant confirmation [Absent] → confirmed loss from source outcome [Verified locally] → recovery creation/status [Verified locally] → external carrier submission [Absent]`

**Journey classification:** **Implemented but partial** — **high confidence**. It has a usable analysis and internal recovery-record path, but proof-of-delivery semantics can be false, responsibility cannot be confirmed/corrected, and carrier submission is manual/outside Unauth.

### 6.4 Missing item → warehouse/3PL evidence → responsibility → recovery

`Missing-item recognition [Partial/disconnected] → ShipBob/self-pack evidence [Partial] → item-level proof [Partial] → responsibility recommendation [Partial] → merchant confirmation [Absent] → recovery [Partial]`

**Journey classification:** **Implemented but partial** — **high confidence**. The stored issue type and normalizers do not reliably preserve missing-item meaning, so the correct 3PL-specific evaluator path is not dependable from common ingestion/manual journeys.

### 6.5 Customer evidence request

`Recommendation says ask customer [Partial] → request creation [Absent] → template/send [Absent] → due/chase [Absent] → response/attachment [Absent] → evidence link and re-evaluation [Absent]`

**Journey classification:** **Documentation/type/schema only** — **high confidence**. Ticket messages can already serve as customer evidence, but Unauth cannot initiate and manage the request.

### 6.6 External clarification/investigation

`Clarification schema [Verified] → case helper/list [Backend-only] → create/select party [Absent] → send by email/portal/manual [Absent] → multiple/primary requests [Absent] → response/attachments [Absent] → case state/next action [Absent]`

**Journey classification:** **Backend-only** — **high confidence**. Post-loss external correspondence can be recorded by an API, but that is not a pre-decision investigation journey and has no current UI.

### 6.7 Recovery submission and recovered cash

`Confirmed loss [Verified locally] → recoverability/rule calculation [Verified locally] → recovery case [Verified locally] → merchant marks submitted [Verified locally] → external submission/provider response [Absent] → merchant records approved/rejected/paid [Verified locally] → recovered financial entry/report [Verified locally]`

**Journey classification:** **Implemented but partial** — **high confidence**. Internal bookkeeping is coherent; the external operational middle is manual and unverified.

### 6.8 Integration failure/stale data → user-visible state

`Provider/verification/sync result [Partial by provider] → provider-specific and canonical connection status [Verified locally] → connector health/source alert [Verified locally] → dashboard/integration/settings UI and operational notification [Partial]`

**Journey classification:** **Implemented but partial** — **high confidence**. Failure and freshness states exist, but some provider “verify” paths are local credential/config checks rather than external probes, and scheduled projection is runtime-unverified.

### 6.9 Final customer outcome followed by later partner evidence

`Immutable source outcome/final state [Verified locally] → later evidence can append [Partial] → final case cannot silently reopen through canonical transition [Verified locally] → responsibility correction [Absent] → separate recovery/correspondence can continue [Partial]`

**Journey classification:** **Implemented but partial** — **medium-high confidence**. Canonical final-state protection is good, but late-evidence review and responsibility correction are not an orchestrated workflow; legacy direct writes are outside the same guardrail.

### 6.10 Cross-merchant access attempt

`Authenticated user/API/widget credential [Verified locally] → active membership/credential-derived merchant [Verified locally] → permission + merchant-scoped query/RPC/RLS [Verified locally] → 404/denial/no foreign row [Verified in synthetic tests]`

**Journey classification:** **Verified end-to-end** — **high confidence locally, low confidence in production configuration**. Representative case, customer, service-role, scoped-client, RLS, and workspace tests pass. The partner-parent and widget-key lifecycle defects are exceptions to a generally strong boundary.

## 7. Gorgias and helpdesk capability baseline

| Capability | Current implementation | Classification | Confidence | Launch implication |
|---|---|---|---|---|
| Installation/auth configuration | Merchant enters Gorgias base URL/domain and access token; secret is encrypted and a per-connection webhook secret is stored/rotatable. This is not a Gorgias OAuth flow. | **Implemented but partial** | High | Manual setup, app/sidebar registration, required scopes, and live credential behaviour need controlled proof. |
| Ticket ingestion | Signed webhook resolves merchant before service-role use, applies body/rate/idempotency controls, hydrates ticket, normalizes ticket/customer/order context, and records source facts. | **Implemented but partial** | High | Strong mocked tests; no controlled webhook delivery, pagination, or provider-rate evidence. |
| Ticket-to-case matching | Store-scoped external IDs/order hints/customer relations support existing-case match and case creation where allowed. | **Implemented but partial** | High | Ambiguous and missing matches are surfaced; live data quality is unknown. |
| Backfill/reconcile | Settings routes and services support historical backfill/reconciliation for the dedicated Gorgias stack. | **Implemented but partial** | Medium-high | Generic connector adapter reports sync unsupported; dedicated and generic capability descriptions must not be conflated. |
| Widget authentication | Hashed merchant widget token resolves merchant and linked API key ID; token is accepted through widget/query inputs. | **Implemented but partial** | High | Revoking the API key leaves token valid; token and PII in URLs create log/history exposure risk. |
| Widget data source | Live server-side query of merchant-scoped Gorgias ticket/order/customer/case plus evaluation/context search. | **Implemented but partial** | High | No durable widget cache; provider hydration/evaluation can add latency. |
| Widget rendering | JSON/HTML/sidebar-compatible response with status, recommendation, context, zero/ambiguous states, unlock/deep links. | **Implemented but partial** | High | Browser/provider rendering and size/latency were not runtime-tested. |
| Widget actions | Unlock context, deep-link to Unauth, generate evidence, and evaluation side effects; Gorgias best-effort tag/internal note after decisions. | **Implemented but partial** | High | GET can write evidence/recommendation/audit; evidence generation bypasses normal tier/credit gate; no refund/reship or investigation action. |
| Macros | Macro names may be interpreted as input/outcome hints. | **Documentation/type/schema only** | High | No macro creation/execution/management capability was found. |
| Deep links | Widget and support context link to case/customer/order surfaces. | **Verified end-to-end** | High | Requires correct base URL/provider configuration in runtime. |
| Zero-match/multiple-match | Explicit widget response states; widget lookup does not force-create a case in its read path. | **Verified end-to-end** | High | The support webhook can still create/evaluate cases under its own rules. |
| Network/full-context claim | Unlock invokes a store-only profile search; `network_context` is null and network disclosure is false. | **UI-only or simulated** | High | Charging two credits for “full context” while returning store-only context is a material product/billing contradiction. |
| Provider writeback | Bounded Gorgias tags and internal notes; hold/resolve tag handling after a decision. | **Implemented but partial** | High | Best effort and mocked; no retry/reconciliation proof for failed writeback. |
| Production readiness | Repository proof matrix records Beta, not Live. | **Unable to verify** | High | Requires a controlled Gorgias account, installed widget, real webhook, latency/error/retry evidence, and credential rotation confirmation. |

Zendesk and Freshdesk have credential/configuration and support webhook paths, but materially less complete reconciliation/runtime proof than Gorgias. They must not be represented as equivalent helpdesk integrations until controlled tests establish the supported subset.

## 8. Integrations baseline

Capability columns mean: **Read** provider data, **Sync** bulk/incrementally, **Link** to canonical records, **Write** persist normalized/internal records, **Act** perform an external business action, and **Subscribe** receive provider webhooks. “Partial” includes implementation without controlled runtime proof.

| Provider/path | Read | Sync | Link | Write | Act | Subscribe | Configuration, ownership, operations, and records | Current status | Classification / confidence | Known blockers |
|---|---:|---:|---:|---:|---:|---:|---|---|---|---|
| Shopify | Partial | Partial | Yes | Yes | No | Partial | OAuth; merchant-owned connection and source account; import jobs/cursors, webhook dedup, reconcile/test/disconnect; populates customers/orders/refunds/fulfilments/shipments and case context. | Registry Beta; runtime unverified | **Implemented but partial** / High | No controlled account; intentionally no refunds/fulfilment actions; full cancellation/deletion/cost reconciliation unproven. |
| Gorgias | Partial | Partial | Yes | Yes | Partial | Partial | Manual token/base URL, merchant connection, backfill/reconcile/secret rotation/disable; ticket/customer/order/case context; tag/internal-note actions. | Registry Beta; runtime unverified | **Implemented but partial** / High | No OAuth; no controlled install; token/URL/latency/credit issues described above. |
| WooCommerce | Partial | Partial | Partial | Yes | No | Partial | API credential setup, webhook and connection routes; canonical commerce population intended. | Registry Beta; runtime unverified | **Implemented but partial** / Medium-high | No controlled probe/reconcile proof; narrower tests and operational lifecycle than Shopify. |
| BigCommerce | Partial | Partial | Partial | Yes | No | Partial | OAuth/callback, webhook, disconnect, merchant-owned connection. | Registry Beta; runtime unverified | **Implemented but partial** / Medium-high | No controlled account or complete reconcile/health evidence. |
| Zendesk | Partial | No | Partial | Yes | No | Partial | Manual credentials and webhook; merchant-scoped support connection. | Registry Beta; runtime unverified | **Implemented but partial** / High | Connection verification can mark connected without a meaningful external probe; no backfill/reconcile parity. |
| Freshdesk | Partial | No | Partial | Yes | No | Partial | Manual credentials, validation, webhook, disable/secret rotation. | Registry Beta; runtime unverified | **Implemented but partial** / High | No ongoing external health/reconcile proof; no controlled account. |
| ShipBob warehouse/3PL | Partial | Partial | Yes | Yes | No | Partial | OAuth or PAT; facility selection, import/pull/webhook; source fulfilment/shipment/package evidence; merchant/source-account ownership. | Registry Beta; runtime unverified | **Implemented but partial** / High | No controlled account; cancelled/deleted reconciliation and complete item/weight/photo semantics unproven. |
| UPS tracking | Partial | On demand | Yes | Yes | No | No | API credentials; token-level health and tracking evidence collector; links evidence to case/shipment. | Registry Partial; runtime unverified | **Implemented but partial** / High | No controlled evidence request; no carrier claim action; delivery/POD semantic defect. |
| FedEx tracking | Partial | On demand | Yes | Yes | No | No | Similar on-demand carrier evidence path and connection health. | Registry Partial; runtime unverified | **Implemented but partial** / High | Same runtime, claims-action, and POD blockers. |
| Shipment tracking sources generally | Partial | Partial | Yes | Yes | No | Partial | Shopify/3PL/carrier records normalize scans, delivered/exception states, timestamps and external IDs. | Mixed/unverified | **Implemented but partial** / High | Provider completeness varies; “delivered” is over-promoted to POD. |
| CSV/manual import | File read | Batch | Partial | Yes | No | No | Merchant upload/import jobs for orders/customers; validation and status UI. | Registry Partial | **Implemented but partial** / High | Refund rows unsupported; correction/retry/reconciliation and large-volume runtime proof incomplete. |
| Generic entity API | Request | Per request | Yes | Yes | No | No | Hashed merchant API key, bounded body, required idempotency; `/v1/ingest/customers`, `/orders`, `/cases`; canonical source/event writes. | Unverified | **Implemented but partial** / High | No controlled client/runtime proof; API-key/widget revocation coupling defect. |
| Generic event API | Request | Inbox only | No | Inbox only | No | Caller push | Validates 25 event types, API-key merchant derivation and idempotency, inserts `ingestion_events`, returns 202. | Disconnected | **Implemented but partial** / High | No discovered worker; returned event-status route does not exist. |
| Manual case creation | User form | N/A | Partial | Yes | No | No | Authenticated merchant context, optional order link or explicit manual reference; case/event persistence. | Local verified | **Verified end-to-end** / High | Missing-item selection absent; no provider fact is implied. |
| Document upload | File read | Job-like | Partial | Yes | No | No | Document connector/agreements upload, metadata, quarantine/approval concepts, signed file access. | Registry Partial | **Implemented but partial** / High | No controlled scanning/storage proof; case evidence and contract interpretation are not unified; no AI extraction. |
| Self-fulfilment pack confirmation | Signed callback | Per event | Partial | Yes | No | Callback | Signed, single-use pack confirmation can create local fulfilment evidence. | Registry Partial | **Implemented but partial** / High | Retry/correction/photo and operational deployment evidence incomplete. |
| Email transport | N/A | N/A | N/A | Yes | Billing/scale mail only | No | Resend-backed billing lifecycle and scale enquiry; Supabase Auth for team invites. | Runtime unverified | **Implemented but partial** / High | No case/investigation/recovery email; non-production can return skipped; production delivery unverified. |
| Stripe disputes | No | No | No | No | No | No | Catalogue/product slot; billing Stripe code is a different capability. | Registry Planned | **Documentation/type/schema only** / High | No dispute connector. |
| UPS/FedEx claims API | No | No | No | No | No | No | Catalogue/product slots only. | Registry Planned | **Documentation/type/schema only** / High | No carrier claim submission, response, or reconciliation. |

### 8.1 Cross-cutting connector findings

- The executable connector registry covers Shopify, Gorgias, UPS, FedEx, ShipBob, and document upload; other providers are implemented through dedicated routes/services. Registry capability output is therefore not a complete call graph.
- Connection ownership is generally merchant-scoped and credentials are encrypted or hashed. Source-account IDs and external IDs are retained on normalized records.
- Webhook routing quality is strongest for Shopify and Gorgias, with merchant resolution, bounded bodies, deduplication, stale/conflict logic, and tests. Other providers are uneven.
- Reconciliation is provider-specific, not a universal guarantee. “Connected” or token health must not be interpreted as fresh canonical data.
- Disconnect/reconnect states are represented across provider-specific rows and `merchant_integrations`; keeping those mirrors consistent is an ongoing dependency.
- No provider may be labelled production-ready solely from route, test, or catalogue presence. The repository’s existing provider proof matrix records no Live provider.

## 9. Evidence and decision semantics

### 9.1 Two evidence systems

The canonical case-decision path uses:

`provider/manual fact → evidence_items → evidence_links → case evidence checklist → deterministic evaluator → recommendation/attribution`

The customer evidence export path uses:

`customer/order lookup → PDF/CE3 assembly → object storage → evidence_packages → credit/activity → signed download`

These systems have different keys and jobs. `evidence_packages` is keyed around source customer/order export context, not a payout case. The claims queue intentionally sets its package field to null because no case-level v2 equivalent exists. Treating a generated PDF as though it were canonical case evidence would therefore be false.

**Classification:** **Legacy or disconnected** for the relationship between the two systems — **high confidence**. Both individual systems have meaningful implementation; their integration does not.

### 9.2 Evidence semantics by source

| Source | Facts that can be represented | What is not established |
|---|---|---|
| Commerce | Order, line/refund/fulfilment timestamps, amounts, currency, source account and external IDs | Full accounting cost; proof that Unauth executed a refund/reship/replacement |
| Helpdesk | Ticket, messages, tags/macros-as-input, customer/order hints, observed timestamps | Customer statement verification; a sent investigation; macro execution |
| Warehouse/3PL | Fulfilment/package/shipment state, facility and available pack/weight data | Consistent item-level pick/pack proof, photos, cancellation reconciliation across providers |
| Carrier | Tracking scans, delivered/exception timestamps, available photo/signature metadata | Live provider accuracy; GPS in current mapping; claim submission; valid POD from timestamp alone |
| Customer | Support messages, profile/order history, manually linked findings | A managed evidence request/response/attachment lifecycle |
| Manual | URL and metadata-backed evidence finding | Strong structured provenance, file scanning, photo/signature review, independent verification |
| Document | Uploaded file metadata, quarantine/approval concepts, signed access | Unified case link, controlled malware scan evidence, AI extraction/interpretation |

### 9.3 Critical proof-of-delivery defect

`lib/claims/decision/deliveryEvidence.ts` and `lib/integrations/trackingEvidenceSlice.ts` derive:

`hasProofOfDelivery = status === 'delivered' && Boolean(deliveredAt)`

That value can cause the evaluator to create or use a `proof_of_delivery` evidence item even when no photo, recipient signature, safe-place image, geolocation, or equivalent corroborating fact exists. Separate photo/signature fields do exist, which makes the conflation especially clear.

Consequences:

- A normal carrier “delivered” scan can be described as proof of delivery.
- Evidence completeness and recommendation confidence can be overstated.
- A missing-parcel case can be attributed away from a carrier or toward a customer/merchant on insufficient evidence.
- Reports/audit may preserve the false semantic as though it were an observed provider fact.

**Classification:** the carrier evidence collector is **Implemented but partial** — **high confidence**; “delivered equals POD” is not a valid verified capability.

### 9.4 Missing parcel versus missing item

The product and evaluator understand a broader reason/subtype vocabulary than the stored case enum. In particular:

- `support_payout_cases.claim_type` includes `item_not_received`, not `missing_item`.
- Manual case validation does not offer `missing_item`.
- The helpdesk text normalizer matches some missing-parcel patterns but not ordinary “missing item” phrasing reliably; underscore-form tags such as `missing_item` are not robustly treated as natural words.
- The public gate maps `MISSING_ITEM` to `not_as_described` and does not preserve a reliable normalized reason.
- Missing-item-specific evaluator branches are therefore easiest to reach through fixtures, demo/caller-supplied normalized input, or narrow phrases rather than the principal ingestion paths.

**Classification:** **Implemented but partial** — **high confidence**. A Release 1 plan must preserve broader issue support while fixing this distinction; it must not narrow the product to missing parcel as a substitute.

### 9.5 Decision, action, outcome, and money

| Fact | Meaning | Current source of truth | Must not be called |
|---|---|---|---|
| Recommendation | Deterministic advisory result based on current evidence/rules | Persisted evaluation/recommendation fields and rule trace | Merchant decision or provider action |
| Merchant decision | User authorization/intention, with rationale and amount where relevant | Immutable `case_decisions` | Actual refund, replacement, credit, loss, or cash |
| Source outcome | An externally observed refund/reship/replacement/other fact | Immutable `case_outcomes` from verified source reconciliation | Mere selected action |
| Confirmed loss | Positive, currency-specific financial effect derived from supported source outcome | `case_financial_entries` plus `loss_cases` | Requested/approved payout estimate |
| Recoverable value | Contractual/operational amount thought claimable | Recoverable financial entries/recovery case | Submitted, accepted, or paid |
| Submitted value | Recovery the merchant records as sent externally | Recovery status/amount | Provider receipt or approval unless separately evidenced |
| Approved value | External party reportedly accepted | Recovery approval fields/status | Recovered cash |
| Recovered cash | Money recorded as paid/received | Paid recovery transition and recovered financial entry | Approval |
| Prevented payout | No later payout observed after a policy waiting window | Prevention observation and confirmed financial projection | Immediate saving at denial time |
| Written off | Outstanding recoverability explicitly abandoned with reason | Written-off financial entry/loss status | Recovered value |

This separation is a major existing strength. The case action UI currently exposes approved, denied, escalated, partial refund, full refund, chargeback disputed, internal watch, and no action. It does not offer a complete reship/replacement/store-credit/discount execution workflow. The best-effort Gorgias tag/note update is a helpdesk side effect, not fulfilment.

### 9.6 Finality and late facts

- Canonical decisions and source outcomes are not overwritten; reversals create linked immutable facts.
- Canonical case transitions check `state_version`, final states, decision history, source outcome, financial exceptions, recovery work, and prevention observations.
- Later evidence can be appended without silently rewriting the decision/outcome.
- Recovery can continue as a separate state axis after a customer outcome.
- There is no first-class late-evidence review/investigation or responsibility correction path.
- Direct legacy gate writes are not protected by the complete canonical service contract.

**Classification:** canonical finality is **Verified end-to-end** — **high confidence**; the whole late-evidence operational journey is **Implemented but partial** — **high confidence**.

### 9.7 Evidence entitlement inconsistency

The authenticated customer evidence generator checks `GENERATE_EVIDENCE`, paid tier/credits, generates the object, and compensates if credit spending fails. The v1/Gorgias evidence path invokes `performV1EvidenceCreate` without the same tier/credit gate. This creates an entitlement and billing inconsistency and can make the Gorgias surface appear to provide a capability that the main app would reject or charge for.

**Classification:** **Implemented but partial** — **high confidence**.

## 10. Rules and Flows baseline

### 10.1 Rules

The rule path is real:

`Rules UI → rules/version APIs → merchant_rules + merchant_rule_versions → simulation/conflict analysis → atomic publish RPC → load active merchant rules → deterministic evaluateRules → recommendation snapshot/trace → case UI/audit`

Existing behaviour:

- Merchant-configurable typed conditions, priority, active state, and `all`/`any` condition operator.
- Recommendation actions of approve, manual review, or deny.
- Versioned drafts, simulation, conflict acknowledgement, atomic publish, and rollback into a new draft.
- Server-side view/manage permissions.
- Active rules filtered at evaluation time.
- First matching priority wins, with stored explanation/trace.
- Rule evaluation does not execute a payout.

**Classification:** **Verified end-to-end** — **high confidence**.

Limitations:

- No complete configurable investigation/request action.
- Evidence requirements are not a unified case-evidence policy.
- Approval is a permission boundary, not a four-eyes approval process.
- Rule engine, claim-gate evaluator, and case evaluator still have overlapping/legacy entry points that can disagree.

### 10.2 Flows

The configuration path is also real:

`Flows UI → workflow APIs → definitions/versions → test/publish/rollback → workflow runs/steps`

The run engine supports bounded, internal outputs:

- create a work task;
- request an in-app notification through a domain event;
- request evidence by creating task-shaped work;
- set a deadline by creating task-shaped work.

It does not support arbitrary HTTP, provider writeback, email, refunds, credits, or carrier claims. Outputs are designed with run/step idempotency.

The production-trigger path is disconnected:

1. `workflowHandler` is included in `lib/events/handlers/registry.ts`.
2. The cron worker iterates the registered handlers.
3. A handler only receives work if a `domain_event_deliveries` row names it.
4. Default case transitions register financial, loss, recovery, customer, case, notification, and audit handlers — not `workflowHandler`.
5. Source-outcome, recovery, write-off, prevention, Shopify refund, and ShipBob audit call sites likewise omit it.
6. No migration trigger automatically adds workflow deliveries.

Published flow definitions therefore do not receive normal product events in the inspected call graph.

**Classification:** configuration/versioning is **Verified end-to-end** — **high confidence**; event-triggered operation is **Legacy or disconnected** — **high confidence**; outputs are **Backend-only** — **high confidence** until dispatch is connected.

### 10.3 Rules versus Flows

They are genuinely separate concepts:

- **Rules** synchronously produce a recommendation from current case/evidence context.
- **Flows** are intended to react asynchronously to a domain fact and create internal work/notifications.

The distinction should be preserved. The current problem is not conceptual duplication; it is missing event delivery and incomplete operational actions.

### 10.4 Contract and partner terms

Canonical recovery uses `partners` and `partner_recovery_rules` for claim type, recovery type, claimable/excluded costs, required evidence, deadline days, caps, confidence, and submission method/URL/email. These rules influence recovery estimation/deadline logic.

Settings Agreements instead persists documents and `agreement_rules`, evaluated through `lib/accountability/store.ts`. The discovered live call path is the legacy `/api/claim-gate/check` path, which writes `loss_sources` and `recovery_tasks`. It is not the canonical loss/recovery projection.

No live AI contract extraction or interpretation service call was found.

**Classification:** canonical partner rules are **Implemented but partial** — **high confidence**; the agreement/accountability relationship to current cases is **Legacy or disconnected** — **high confidence**; AI extraction is **Documentation/type/schema only** — **high confidence**.

## 11. Investigations/clarifications baseline

There is no supported pre-decision investigation product today.

| Investigation capability | Repository evidence | Classification | Confidence |
|---|---|---|---|
| Case clarification storage | `case_clarification_requests` schema/types and a case decision helper that can list/append after evaluation. | **Backend-only** | High |
| Create a clarification from case UI/API | No supported route/action/component found. | **Documentation/type/schema only** | High |
| Make open clarification affect next action | Evaluator derives workflow before loading/appending clarification list. | **Legacy or disconnected** | High |
| Customer evidence request | Recommendation vocabulary only. | **Documentation/type/schema only** | High |
| Carrier enquiry | Recommendation vocabulary only; tracking fetch is evidence collection, not an enquiry. | **Documentation/type/schema only** | High |
| Warehouse/3PL enquiry | Recommendation vocabulary only. | **Documentation/type/schema only** | High |
| Supplier enquiry | Recommendation vocabulary only. | **Documentation/type/schema only** | High |
| Partner enquiry | Partner contacts/rules exist but no case request lifecycle. | **Documentation/type/schema only** | High |
| Internal task | Generic work tasks are real. | **Implemented but partial** | High |
| Draft/template | Investigation scope documentation describes the need; no live template/send model. | **Documentation/type/schema only** | High |
| Email send | Resend is used for billing lifecycle/scale enquiry, not case requests. | **Documentation/type/schema only** | High |
| Portal/manual send tracking | Partner rules store method/URL/email; recovery status can be manually recorded. | **Backend-only** | High |
| Due date/SLA/overdue/chase | Generic task due dates exist; no investigation SLA, chase count, or request scheduler. | **Documentation/type/schema only** | High |
| Response/correspondence | `external_correspondence` API can record post-loss/recovery facts. | **Backend-only** | High |
| Attachments | No investigation attachment/request-response link found. | **Documentation/type/schema only** | High |
| Multiple/parallel requests | Planning document only. | **Documentation/type/schema only** | High |
| Primary-request selection | Planning document only. | **Documentation/type/schema only** | High |
| Parent-case state effect | No investigation state machine feeding case state/next action. | **Documentation/type/schema only** | High |
| Continue after customer decision | Recovery records/correspondence can continue separately. | **Implemented but partial** | High |

`docs/MVP_PLUS_CASE_INVESTIGATIONS_SCOPE.md` is a detailed planning artifact, not implementation evidence. It correctly notes that appending clarification output after evaluation is insufficient. It must not be used to describe current customer/carrier/warehouse/supplier investigations as working.

## 12. Responsibility, Losses, and Recovery baseline

### 12.1 Responsibility

The evaluator can persist an advisory attribution and confidence; loss detail can display attribution candidates, evidence, and the selected case attribution. Types distinguish merchant/customer/carrier/3PL/supplier/internal/unknown-like responsibility values and high/medium/low confidence.

The main product does not provide a supported merchant confirmation/correction action. Backend loss mutation logic can update some attribution/recoverability/owner fields, but no complete current UI call was found. Repeat-claimant network context is null in the decision context, so responsibility must not be described as network-informed.

**Classification:** **Implemented but partial** — **high confidence**.

### 12.2 Causal responsibility versus contractual recoverability

The architecture correctly treats these as separate:

- Case attribution asks who probably caused the customer loss.
- Partner recovery rules ask whether and how a merchant can recover value contractually/operationally.

However, the relationship is incomplete because attribution is advisory and unconfirmed, contract documents are in a competing agreement model, and the canonical partner rule is not guaranteed to belong to the same merchant as its chosen partner.

**Classification:** **Implemented but partial** — **high confidence**.

### 12.3 Loss creation trace

`verified provider/source fact → record_case_source_outcome → case.outcome_reconciled → financialProjection/lossProjection/recoveryProjection → case_financial_entries + loss_cases (+ recovery when eligible) → losses/recovery/reports`

Loss is intentionally **not** created merely because a merchant selected “approve” or “refund”. Supported positive source outcomes for refund/reship/replacement can create confirmed loss; reversals create linked reversing facts and adjust projections. Outcome conflicts create exceptions instead of silently merging.

**Classification:** **Verified end-to-end** locally — **high confidence**.

### 12.4 Cost semantics

- Refund source amount is useful payout value but is not accounting-grade cost basis.
- Reship/replacement cost fields and event vocabulary exist, but broad provider-populated cost evidence is incomplete.
- Unknown is not coerced to zero.
- Amounts are stored in minor units and currency is explicit.
- No FX conversion silently combines currencies.

**Classification:** financial arithmetic is **Verified end-to-end** — **high confidence**; accounting cost completeness is **Implemented but partial** — **high confidence**.

### 12.5 Recovery lifecycle

Current statuses include ready, submitted, chased, approved, partially approved, rejected, appealed, paid, and closed-unrecoverable variants. The transition RPC:

- validates status progression and amount deltas;
- separates approval from recovered cash;
- writes recovery events;
- updates case recovery state;
- writes recovered or written-off financial entries when appropriate;
- uses idempotency and immutable history.

The merchant records that an external submission, approval, rejection, or payment occurred. Unauth does not submit a carrier/warehouse/supplier claim or reconcile a provider claims API.

**Classification:** internal lifecycle is **Verified end-to-end** — **high confidence**; external recovery execution is **Documentation/type/schema only** for carrier claims and **Implemented but partial** for manual recordkeeping — **high confidence**.

### 12.6 Correspondence, deadlines, late evidence, and write-off

- Recovery detail reads correspondence/tasks/activity.
- A correspondence POST route can persist an external fact, but the current UI does not invoke it.
- Partner rules can calculate a deadline and store submission method/contact.
- No live chase/email/portal workflow was found.
- Late evidence can coexist with final customer outcome and recovery work, but no review/correction workflow connects it.
- Loss write-off is a real, reasoned, permission-checked action against outstanding recoverability.

### 12.7 Recovery presentation defects

- Recovery board copy says “Approved recovery” while the value is calculated from recovered amount.
- “Submitted” can be misread as Unauth having submitted externally; current implementation records the merchant’s external action.
- Approval is correctly not cash in data/report logic, but copy must maintain that distinction.

## 13. Work, notifications, reports, and administration baseline

### 13.1 Work

`work_tasks` are live, not demo data. Tasks can originate from canonical operational services, recovery/accountability compatibility paths, exceptions, and the workflow engine. The Work page supports owner/status/source/due/overdue filters, assignment, start, snooze, complete, reopen, bulk operations, and deep links.

Server-side writes require the payout-decision capability. The bulk RPC and principal transition paths are tested. Due/overdue is derived from real timestamps.

Limitations:

- Flow-sourced tasks will not arise from normal domain events until flow delivery is connected.
- One task event idempotency key includes the current timestamp, so a retry can create a new event/task identity instead of replaying the first operation.
- Evidence/decision filters infer state from available fields and are not a complete investigation queue.
- List/count paths cap rows.

**Classification:** **Verified end-to-end** — **high confidence**.

### 13.2 Notifications

Notifications persist in `notifications`; users can mark one or all read and configure preferences. Mentions create in-app notifications with preference filtering. A scheduled operational projector scans overdue tasks, cases, recoveries, and failing integrations.

Limitations:

- Read/unread exists; dismissal does not.
- Assignment is not itself a notification-producing event.
- The projector scans at most 100 merchants and a small number of items per category per merchant per run.
- It can fall back to the owner for unassigned items.
- `notificationProjection` does meaningful work for `notification.requested`; merely registering it on unrelated case events does not create a notification.
- Scheduled report/daily-summary notification kinds exist but have no established general call sites.
- Cron scheduling and production delivery are unverified.

**Classification:** **Implemented but partial** — **high confidence**.

### 13.3 Dashboard and reports

Existing reporting is valuable and should be preserved:

- separate approved/paid/confirmed-loss/recoverable/recovered/prevented/written-off/net semantics;
- date range and record drill-down;
- per-currency display without implicit FX;
- explicit unavailable/unknown handling;
- advanced-report entitlement;
- audited CSV export with formula-injection protection;
- source-health/coverage presentation;
- linked case/recovery detail.

Limitations:

- Trend dates are ISO bucket values rather than true selected-timezone boundary conversion.
- Recovery report timestamps are recovery-update based and not strictly identical to case-period semantics.
- Coverage freshness is a current 48-hour metric, independent of selected report range.
- Dashboard queries cap records.
- Recovery board’s approved label is wrong.

**Classification:** **Verified end-to-end** — **high confidence**.

### 13.4 Partners

The partner directory supports carrier, 3PL, warehouse, supplier, internal, and other partner types. The model stores external reference, email, URL, notes, active state, recovery terms, required evidence, deadline, cap, submission method, URL/email, source, and confidence.

The current create UI principally exposes name/type; contacts and full recovery terms are more completely represented in API/schema than in the user surface. Recovery rules are used by canonical recovery calculation.

Critical ownership gap:

- API overwrites the rule’s `merchant_id` from authenticated context.
- It accepts the caller’s `partner_id` without checking that `partners.merchant_id` equals that context.
- Service-role code bypasses RLS.
- The schema has separate foreign keys rather than a composite `(partner_id, merchant_id)` parent constraint.
- Nested `partner:partners(*)` selection can therefore associate or expose a foreign merchant’s partner row through a merchant-owned rule.

**Classification:** **Implemented but partial** — **high confidence**.

### 13.5 Administration

| Area | Baseline | Classification | Confidence |
|---|---|---|---|
| Team/membership | Invite, revoke, roles, delegated grants, owner-only grants, atomic ownership transfer. | **Verified end-to-end** | High locally |
| Workspace switching | Exact active membership, fail-closed multi-workspace selection, HttpOnly/SameSite cookie and auth metadata mirror. | **Verified end-to-end** | High locally |
| Audit | Durable sensitive-action audit plus domain/case/loss/recovery history and audit UI. | **Verified end-to-end** | High locally |
| Privacy | Subject erasure receipt/RPC, soft-hide operations, storage cleanup queue, account deletion and receipt. | **Implemented but partial** | High |
| Billing/credits | Stripe subscription/credit and billing lifecycle surfaces/services; evidence/context credit use. | **Implemented but partial** | Medium-high |
| API credentials | Hashed API keys, shown once, rate limit, revoke and audit; paired hashed widget token. | **Implemented but partial** | High |
| Platform/preferences | Persistent platform, notification, and account settings. | **Implemented but partial** | High |
| Help | Static guide and mail link. | **UI-only or simulated** | High |

## 14. Data model and migration baseline

### 14.1 Active and archived history

Active forward migration set:

1. `supabase/migrations/20260720000000_canonical_production_baseline.sql`
2. `supabase/migrations/20260720100000_canonical_environment_supplement.sql`
3. `supabase/migrations/20260721120000_durable_sensitive_audit.sql`
4. `supabase/migrations/20260722100000_tenant_authorization_hardening.sql`
5. `supabase/migrations/20260722200000_webhook_event_safety.sql`
6. `supabase/migrations/20260722300000_privacy_erasure_retention.sql`
7. `supabase/migrations/20260722400000_source_to_recovery_integrity.sql`
8. `supabase/migrations/20260722500000_ownership_transfer_integrity.sql`

There are 223 archived pre-canonical migrations under `supabase/migrations_archive/pre_canonical_20260722`. Existing remediation evidence records a much larger production migration-version history and historical content drift. The eight-file active history replays locally in the prior verification evidence, but the production rollout packet explicitly does not authorize deployment.

Prior remediation status:

- active migration history: PASS locally;
- canonical baseline replay: PASS in local clean databases;
- exact production storage-policy definitions and per-object privilege parity: UNVERIFIED;
- no production rollout performed;
- production-only credentials/storage/ACL state still requires controlled comparison.

**Classification:** local canonical migration history is **Verified end-to-end** — **high confidence**; production parity is **Unable to verify** — **high confidence that runtime evidence is missing**.

### 14.2 Important entity groups

- **Tenant/auth:** merchants, merchant users/memberships, permission grants, invitations, ownership-transfer integrity.
- **Connections/source accounts:** provider-specific connection tables, `merchant_integrations`, sync jobs, source account IDs.
- **Source/canonical commerce/support:** source customers/orders/tickets/shipments/refunds/returns/disputes and relationship/link records.
- **Case:** `support_payout_cases`, `case_decisions`, `case_outcomes`, `case_clarification_requests`, case events/exceptions/prevention observations.
- **Evidence:** `evidence_items`, `evidence_links`, `evidence_packages`, processing/upload records.
- **Finance:** `case_financial_entries`, case financial summaries, `loss_cases`, attribution candidates, `recovery_cases`.
- **Operations:** recovery events/correspondence, `work_tasks`, notifications/preferences.
- **Configuration:** rules/versions, workflows/versions/runs, partners/recovery rules, agreements/agreement rules.
- **Reliability:** processed webhooks, `ingestion_events`, domain events/deliveries/dead letters, sync/action runs.
- **Governance:** durable audit, privacy erasure receipts/cleanup jobs, account-deletion receipts.

### 14.3 Jobs and asynchronous paths

| Async path | Current state |
|---|---|
| Provider sync jobs | Implemented per supported provider; cron processor exists; runtime scheduling/provider proof unverified. |
| Processed webhooks | Safety migration and provider handlers implement claim/complete/fail/dedup patterns; provider coverage varies. |
| Generic ingestion inbox | Enqueue exists; worker/status journey not found. |
| Domain event deliveries | Worker cron, leased handlers, retry/dead-letter operations exist and are tested. |
| Workflow delivery | Handler/engine exist; normal producers do not register delivery. |
| Operational notifications | Cron projector exists with caps; production schedule unverified. |
| Prevention observations | Finalization RPC/cron-like operation exists; production schedule unverified. |
| Privacy storage cleanup | Claim/complete/fail job RPCs exist; production object cleanup runtime unverified. |
| Connection verification/reconciliation | Cron routes exist; provider probe quality and schedules vary. |

### 14.4 Tenant constraints and data integrity

Strengths:

- Broad merchant foreign keys and RLS policies.
- Composite foreign keys on several source/account/event relationships.
- Immutable or append-only decision/outcome/financial/audit records.
- Server-only security-definer functions revoked from public/anon/authenticated direct execution.
- Optimistic state versioning and row locks for case transitions.
- Idempotency conflict fingerprints rather than “first write silently wins”.
- Multi-currency values remain separated.

Gaps:

- Partner recovery child rows do not enforce same-merchant ownership of `partner_id`.
- API key revocation and widget-token revocation are not coupled.
- Generic ingestion status/worker lifecycle is incomplete.
- Older direct gate writers bypass canonical transition guarantees.
- Multiple provider-specific and canonical connection tables require mirror consistency.
- Exact production RLS/storage/ACL parity remains unverified.

## 15. Security, permissions, and tenant-isolation baseline

### 15.1 Authentication, membership, and RBAC

- Supabase Auth supplies the authenticated user.
- Server layout and routes resolve active merchant membership; multi-workspace users without a valid selected workspace fail closed.
- Default roles include owner, admin, analyst, and viewer, with delegated capability grants.
- Owners control delegated grants and ownership transfer.
- Authenticated navigation is permission-filtered, and sensitive APIs call `requirePermission`.
- Viewer currently includes `EXPORT_AUDIT` by default; whether that is commercially intended requires a founder/security decision.

**Classification:** **Verified end-to-end** locally — **high confidence**.

### 15.2 Service-role and RLS

The application commonly authenticates a user with the caller client, resolves merchant/permission context, then uses a service-role client for canonical writes. `createScopedClient` injects merchant filters/values for classified tables and fails closed for unclassified use. Static and unit tests inspect representative service-role routes.

Active hardening migrations:

- revoke direct authenticated mutations on canonical sensitive tables;
- revoke security-definer functions from public/anon/authenticated;
- enable merchant-member read policies and service-role write policies;
- add source-agnostic tenant relationships and ownership-transfer integrity.

This is a sound pattern only when every parent/child ID is also validated in application code or a composite database constraint. The partner rule defect demonstrates why table-level `merchant_id` scoping alone is insufficient.

**Classification:** representative tenant isolation is **Verified end-to-end** locally — **high confidence**; universal/production correctness is **Unable to verify**.

### 15.3 High-priority security findings

| Finding | Evidence | Severity | Confidence |
|---|---|---:|---|
| Foreign-merchant partner association/read | Partner rule create/update accepts arbitrary `partner_id`; no same-merchant lookup; service role; no composite FK; nested partner select. | Critical before multi-tenant production | High |
| Widget token survives API-key revocation | API key DELETE sets only `merchant_api_keys.revoked_at`; widget validator checks only widget row `revoked_at` and does not join active key. FK cascades on deletion, not revoke. | High | High |
| Credentials previously exposed during diagnostic session | `docs/SECURITY.md` records local exposure and requires rotation of service role/internal/Shopify/Gorgias/transactional-email credentials before trust. | Critical operational blocker | High |
| PII and tokens in query URLs | Search, widget, lookup/context routes accept query parameters containing emails/order/ticket/token values; request logging/browser history may retain them. | High | High |
| CSP report-only with permissive directives | Current CSP is report-only and includes unsafe inline/eval allowances. | Medium-high | High |
| Entitlement bypass on v1/Gorgias evidence | Main evidence generator checks tier/credit; v1 helper path does not. | Medium-high | High |
| GET with side effects in widget | Widget GET can evaluate and persist evidence/recommendation/audit. | Medium | High |

### 15.4 Evidence files and signed access

Evidence/profile downloads use bounded signed URLs/tokens in supported routes, and stored secrets/tokens are encrypted or hashed. Upload/document systems have quarantine/approval concepts. Production bucket policies, object ACL parity, malware scanning, signed-link revocation, and cleanup execution were not controlled-runtime verified.

**Classification:** **Implemented but partial** — **high confidence**.

### 15.5 Audit coverage

Durable audit triggers cover sensitive tables/actions, while domain events and compatibility timelines cover case/loss/recovery behaviour. API key/team/privacy/permissions paths use audited clients or receipt records. Existing local PostgreSQL verification passed.

Limitations:

- Multiple audit/event tables make universal coverage non-trivial.
- Legacy direct writers may not emit the same canonical event set.
- Production retention/export and service-role configuration are unverified.

**Classification:** **Verified end-to-end** locally — **high confidence**.

### 15.6 PII, privacy, retention, and deletion

The product supports merchant-visible hiding/soft deletion, data-subject erasure, storage-cleanup jobs, account deletion, and immutable receipts. Data-subject RPCs use merchant and subject IDs and are covered by local tests. Retention values can be null, and policy/legal decisions are not encoded simply by having the schema.

**Classification:** **Implemented but partial** — **high confidence**.

### 15.7 External-action permissions

Payout decisions, exports, integrations/settings, audit, team, evidence, and privacy actions have server-side capability checks in representative paths. Because Unauth does not currently execute commerce payouts, carrier claims, or investigation emails, there is no complete external-action permission model for those future actions.

**Classification:** existing actions are **Verified end-to-end** locally — **high confidence**; future external actions are **Documentation/type/schema only** — **high confidence**.

## 16. Tests and release-readiness evidence

### 16.1 Commands executed during this audit

All commands below were local and non-mutating in intended behaviour. No generated/untracked artifact was observed before the audit report was created.

| Command | Result | Evidence |
|---|---|---|
| `./node_modules/.bin/tsc --noEmit --incremental false` | Exit 0 | TypeScript passed. |
| `./node_modules/.bin/eslint app components lib --no-cache` | Exit 0 | Lint passed. |
| `node scripts/check-authenticated-design.mjs` | Exit 0 | 397 authenticated/design files checked. |
| `node scripts/verify-p0-ledger.mjs` | Exit 0 | 322 unique controls across 44 namespaces: 153 PASS, 0 FAIL, 169 UNVERIFIED. |
| Focused Jest command covering canonical ingest, claims, Gorgias, tenant boundaries, decisions, evidence, payouts, rules, workflows, recovery, finance, reports, notifications, and product surface | Exit 0 | 26 suites passed, 1 suite skipped; 252 tests passed, 3 skipped, 255 total; 0 snapshots; 5.996 s reported. |

Focused Jest invocation:

```text
./node_modules/.bin/jest --no-cache --runInBand --silent \
  tests/api/canonicalEntityIngest.test.ts \
  tests/api/canonicalEventIngest.test.ts \
  tests/api/manualCaseCreation.test.ts \
  tests/api/claimsRoutes.test.ts \
  tests/api/gorgiasSupportWebhook.test.ts \
  tests/api/gorgiasWidgetHelpdeskLink.test.ts \
  tests/api/merchantIsolation.test.ts \
  tests/api/scopedClient.test.ts \
  tests/security/tenantBoundaryContract.test.ts \
  tests/security/sourceAgnosticRls.test.ts \
  tests/unit/claimDecision.test.ts \
  tests/unit/decisionEngine.adversarial.test.ts \
  tests/unit/merchantDecisionContract.test.ts \
  tests/unit/trackingEvidence.test.ts \
  tests/unit/payouts/mvpScenarios.test.ts \
  tests/unit/rulesEngine.test.ts \
  tests/lib/workflowEngine.test.ts \
  tests/unit/recoveries/recoveryCalculation.test.ts \
  tests/unit/recoveries/recoveryStatusSemantics.test.ts \
  tests/unit/recoveries/recoveryStore.test.ts \
  tests/lib/crossModuleFinancialIntegrity.test.ts \
  tests/lib/reportsPayoutContract.test.ts \
  tests/unit/intelligenceReporting.test.ts \
  tests/unit/notificationProjection.test.ts \
  tests/lib/gorgiasWidgetJson.test.ts \
  tests/lib/gorgiasWidgetUnlock.test.ts \
  tests/lib/e2eProductSurface.test.ts
```

The skipped suite contains three live-only tests and is consistent with the lack of controlled provider/runtime credentials.

### 16.2 Established repository evidence not re-run in this audit

The committed remediation status records a final local gate at `2026-07-23T05:26:38.485Z` with:

- type and lint checks;
- authenticated design check over 397 files;
- 135-table contract;
- two canonical migration replays;
- five PostgreSQL verification gates;
- P0 ledger and release rehearsal;
- 315/315 Jest suites and 2,389 tests passing;
- 92 static pages;
- 105 browser tests;
- whitespace/history checks;
- eight active migrations.

That is useful existing evidence, but it predates the final commit time and was not independently rerun in full here. It must be described as committed evidence, not as this audit’s live result.

### 16.3 Commands intentionally not run

| Check | Reason |
|---|---|
| Production build | Writes `.next`; only the report write was authorized. |
| Full Playwright/browser suite | Can start servers/write artifacts and may depend on runtime services; existing evidence was inspected instead. |
| Migration reset/replay/PostgreSQL gates | Mutates a database; prior committed outputs were inspected. |
| Provider/live suites | Would require external services, credentials, and possibly mutations. |
| Webhook/email/billing tests against providers | Explicitly prohibited and not safe read-only. |
| Production schema/ACL comparison | Requires production access. |

### 16.4 Release-readiness conclusion

Local code quality and synthetic integrity evidence are strong. Release readiness is nevertheless **Unable to verify** — **high confidence** — because 169 P0 controls remain unverified, no provider is recorded Live, production schema/storage parity is incomplete, credential rotation is outstanding, and the critical partner/token and product-loop gaps above remain.

## 17. Documentation-versus-code contradictions

Documentation was treated as a claim source, not proof. These are the material contradictions found:

| Document/product claim or implication | Implementation evidence | Audit conclusion |
|---|---|---|
| The architecture implies every inbound provider event enters an inbox before domain processing. | Most provider webhooks normalize/write directly; generic events enqueue but have no discovered consumer; ShipBob both enqueues and separately writes a domain event. | The universal inbox boundary is not implemented. |
| The provider-neutral event bus can run published Flows on matching events. | `workflowHandler` is registered in the worker registry but omitted from normal event-delivery handler arrays. | Flow configuration is real; automatic production triggering is disconnected. |
| Onboarding is a four-step profile → Shopify → Gorgias → live widget journey. | Profile save sets `setupComplete`; the guard can redirect before connector steps, Shopify callback does not reliably resume onboarding, and no widget-install runtime proof exists. | Onboarding is partial and overstates completion. |
| Gorgias “full context”/“Network Check” implies cross-network information. | Widget unlock calls a store-only profile search, returns `network_context: null`, and sets network disclosure false. | The label and two-credit charge exceed the delivered context. |
| Delivered shipment evidence is proof of delivery. | Evidence code sets POD from delivered status and timestamp without photo/signature/location. | The semantic is false and can alter recommendation/responsibility. |
| Missing parcel and missing item are separate supported decision paths. | Stored enum/manual form/normalizers/public gate do not reliably preserve missing-item meaning. | The distinction exists conceptually/tests but is not a dependable live path. |
| Case clarification/investigation scope describes a complete request lifecycle. | Only schema/helpers and post-loss correspondence fragments exist; no create/send/chase/respond UI/service path. | The scope document is planning-only. |
| Evidence packages support the payout-control queue. | Claims queue intentionally sets package association to null; `evidence_packages` are customer/order PDF exports, separate from case evidence links. | Do not count PDF packages as case evidence status. |
| Recovery “approved” KPI represents accepted recovery. | Recovery board value is calculated from recovered amount. | Presentation label is wrong even though canonical data separates approval and cash. |
| Selected reporting timezone controls report buckets. | Timezone is accepted/displayed, but trend grouping is based on ISO date buckets without complete boundary conversion. | Date-range presentation can be misleading around boundaries. |
| Connected/verified provider means operationally healthy. | Several provider verification paths are configuration/token checks or locally mocked; existing proof matrix has no Live provider. | “Connected” must not be marketed as production-proven freshness. |
| Canonical migration baseline matches production. | Local replay passes, but exact production-only storage policies/per-object privileges remain unverified and prior production history differs. | Production parity is an open release gate. |
| Merchant API key revocation revokes its paired access. | Widget validator checks only widget-token revocation; key DELETE does not touch token. | Credential lifecycle is internally inconsistent. |
| Partner recovery rules are tenant-owned because each row has `merchant_id`. | Caller can provide another merchant’s `partner_id`; no parent lookup/composite FK; service-role nested read. | Child-row scoping does not guarantee parent ownership. |
| Gorgias widget is a read surface. | Widget GET can evaluate and persist evidence/recommendation/audit. | The route has side effects and cannot be treated as cacheable/read-only. |
| The “outcome” endpoint records an outcome. | `/api/claims/[claimId]/outcome` calls `record_case_decision`; actual outcomes use source reconciliation. | Endpoint naming obscures an otherwise correct decision/outcome separation. |
| Agreement uploads/terms drive current recovery decisions. | Agreement rules are reached through the legacy claim-gate/accountability path; canonical recovery uses partner recovery rules. | Two competing term models exist. |

## 18. Duplicate sources of truth and legacy/disconnected systems

| Competing concept | Current models | Canonical/use conclusion | Classification | Migration caution |
|---|---|---|---|---|
| Case evidence versus export package | `evidence_items`/`evidence_links` vs `evidence_packages`/PDF storage | Canonical case decisions use items/links; packages serve customer/order export. | **Legacy or disconnected** | Do not delete packages until export consumers, credits, files, and history are migrated; do not merge semantics by name alone. |
| Decision versus “outcome” route naming | `case_decisions` vs `case_outcomes`; outcome-named API records a decision | Data model is correct; route terminology is legacy/misleading. | **Implemented but partial** | Preserve immutable separation while migrating clients/copy. |
| Canonical case transitions versus public gate | `transition_payout_case`/decision RPCs vs direct `claim-gate`/public-gate updates | Canonical services own current lifecycle; gate paths bypass invariants. | **Legacy or disconnected** | Replace only with caller migration, idempotency mapping, and event-history preservation. |
| Recovery terms | `partner_recovery_rules` vs `agreement_rules` | Canonical recovery calculation uses partner rules; agreement model feeds legacy accountability. | **Legacy or disconnected** | Migrate documents, extracted/manual terms, provenance, and linked recoveries before consolidation. |
| Loss/recovery work | `loss_cases`/`recovery_cases` vs `loss_sources`/`recovery_tasks` | Canonical projections use the first pair; second pair is reached from legacy accountability. | **Legacy or disconnected** | Preserve old audit/history until explicit reconciliation and migration. |
| Flow event automation | `workflow_definitions`/runs/steps vs domain events/deliveries | Both are designed to connect, but delivery registration is missing. | **Legacy or disconnected** | Do not remove Flow UI/records; connect with replay/idempotency safeguards. |
| Generic ingestion | `ingestion_events` inbox vs direct provider normalization/domain events | Architecture expects an inbox; most live code is direct and generic inbox has no worker. | **Legacy or disconnected** | Choose and migrate an operating model; avoid processing old inbox rows twice. |
| Connection status | Provider-specific connection tables vs `merchant_integrations` | Both are actively used; canonical mirror is a projection, not yet an exclusive source. | **Implemented but partial** | Preserve reconciliation and source-specific credentials/state during any consolidation. |
| Customer identity | Source customers, merchant-scoped customer/profile relationships, and older network identity/signals | Merchant views are scoped; network schema remains but disclosure is disabled. | **Implemented but partial** | Do not remove source identifiers or customer history; privacy/erasure and link migration are dependencies. |
| Audit/timeline | Domain events, domain deliveries, claim/loss/recovery compatibility events, durable audit records | Different purposes overlap; no single UI covers every event. | **Implemented but partial** | Preserve append-only evidence and retention guarantees; consolidation needs provenance mapping. |
| Notification creation | Direct inserts for mentions/operational projection vs `notification.requested` domain projection | Both are live creation paths. | **Implemented but partial** | Standardize only after dedup/preference/recipient behaviour is equivalent. |
| Helpdesk integration abstraction | Generic connector registry/capabilities vs dedicated Gorgias/Zendesk/Freshdesk routes | Dedicated stacks contain the real behaviour; registry output is incomplete. | **Implemented but partial** | Do not remove provider-specific services based on generic registry capability flags. |
| Rules/evaluation entry points | Canonical case evaluator and `merchant_rules` vs public gate/accountability helpers | Canonical case evaluator is current; gate paths can reach different side effects. | **Legacy or disconnected** | Compare decision outcomes and callers before retirement. |

No duplicate above should be deleted merely because it is non-canonical. Each contains records, external callers, compatibility links, file objects, credits, or audit history that require explicit migration and founder approval.

## 19. Regression-risk register

This register focuses on existing working or partially working value that a narrower Release 1 plan could accidentally remove, and on defects that can corrupt that preserved value.

### 19.1 Capability preservation risks

| ID | Capability and current use | Quality/dependencies/alignment | Regression if narrowed or replaced | Preservation requirement | Confidence |
|---|---|---|---|---|---|
| RR-01 | Canonical payout cases, queue, detail, assignment, snooze, comments, timeline, decisions and reversals are usable. | Strong local quality; depends on membership, case RPCs, events, evidence, source links. Core direction. | Existing users lose triage/history or clients bypass immutable decisions. | **Preserved unchanged** at the semantic boundary; UI may be hardened. | High |
| RR-02 | Broader issue taxonomy supports damaged, wrong item, not-as-described, refund request, chargeback, return abuse and other in addition to non-receipt. | Meaningful existing case/evaluator breadth; provider normalization varies. Aligned beyond first pilot. | A missing-parcel-only plan makes existing cases unclassifiable and breaks rules/history. | **Preserved and hardened**; never remove solely for pilot focus. | High |
| RR-03 | Merchant decision and actual source outcome are separate immutable facts. | Strong and tested; depends on decision/outcome RPCs and projections. Foundational. | “Approve” could be reported as money paid/lost; audit and financial truth regress. | **Preserved unchanged**. | High |
| RR-04 | Append-only financial entries distinguish confirmed, recoverable, recovered, prevented and written-off values by currency. | Strong local tests; depends on projection handlers and source outcomes. Core direction. | Dashboard/reports conflate estimates, approval and cash; reversals/currency break. | **Preserved unchanged** and extended only with compatible entries. | High |
| RR-05 | Loss and recovery lists/details/lifecycle are usable internal recordkeeping. | Strong locally; external submission is manual. Core decision-to-recovery direction. | Existing losses/recoveries/history disappear or a new model double-counts them. | **Preserved and hardened**; integrate external operations into this model. | High |
| RR-06 | Dashboard/reports/record drill-down/export already provide useful separated financial metrics. | Strong tests; timezone/label/caps need hardening. Direct management value. | Users lose visibility or new metrics silently change definitions. | **Preserved and hardened** with metric contracts. | High |
| RR-07 | Work tasks support real assignment/due/status/bulk/deep-link operations. | Strong; depends on task RPCs and case/recovery sources. Core operations. | New investigation queue duplicates or hides existing work; ownership/status history fragments. | **Integrated into the new decision-to-recovery model** as the operational queue. | High |
| RR-08 | In-app notifications and preferences are real. | Partial; capped projector/no dismiss/assignment gap. Aligned. | New alerting ignores existing preferences/read state or duplicates notifications. | **Preserved and hardened**. | High |
| RR-09 | Merchant Rules are live, versioned, explainable and audited. | Strong; limited actions. Core policy capability. | Hard-coded pilot policy removes merchant configuration and invalidates trace/history. | **Preserved unchanged** at evaluation boundary; extend compatibly. | High |
| RR-10 | Flows UI, definitions, versions, test runs, outputs and history exist. | Configuration good; domain dispatch disconnected. Potentially aligned operational automation. | A plan assumes “absent” and deletes customer configuration/history instead of completing dispatch. | **Preserved and hardened**; connect only with replay/idempotency design. | High |
| RR-11 | Customer list/detail/history, notes, signals, cases/orders/shipments and source links are useful. | Broad real data; some support-only identities lack source-customer actions. Core context. | Pilot case UI loses longitudinal history or identity/source links. | **Preserved and hardened**. | High |
| RR-12 | Gorgias ingestion/widget/deep links/tag/note paths are substantial. | Partial and runtime-unverified; depends on support connections, tokens, source linking, credits. Strong pilot alignment. | Replacing widget or token model removes existing integration behaviour/links and obscures beta limitations. | **Preserved and hardened**; replace only after controlled migration. | High |
| RR-13 | Shopify import/webhooks/reconciliation and source-object pages underpin actual outcomes. | Partial/runtime-unverified; depends on OAuth, webhooks, source relations. Core. | A helpdesk-only plan loses financial truth and outcome reconciliation. | **Preserved and hardened**. | High |
| RR-14 | ShipBob, UPS, FedEx, WooCommerce, BigCommerce, Zendesk, Freshdesk, CSV, documents and self-pack have varying real implementation. | Beta/Partial, no live proof. Broader than first pilot but potentially valuable. | Removing routes/schema loses future customers and existing source records; pretending parity creates sales risk. | **Retained but hidden from initial pilot users** where necessary, while preserving code/data; founder decides exposure. | High |
| RR-15 | Canonical evidence items/links retain provider provenance and feed decisions. | Strong core; adapter completeness/POD semantics need work. Essential. | New case model reduces evidence to a boolean/checklist and loses provenance/audit. | **Preserved and hardened**. | High |
| RR-16 | PDF/CE3 evidence generation, credit spend, signed download and history are usable. | Partial and disconnected from cases; direct API entitlement mismatch. Adjacent value. | A new case evidence screen deletes paid export history/files or double-charges. | **Replaced only after migration** or retained separately. | High |
| RR-17 | Partner directory and recovery-rule terms affect recovery calculation. | Partial; parent tenant gap and incomplete UI. Core recovery dependency. | New investigation contacts duplicate partners or lose deadlines/caps/provenance. | **Integrated into the new decision-to-recovery model** after ownership hardening. | High |
| RR-18 | Agreements/documents and legacy accountability contain terms/history. | Legacy/disconnected, but records and files may exist. Directionally related. | Deletion loses contract documents and recovery history; parallel use double-counts. | **Replaced only after migration** and founder approval. | High |
| RR-19 | Manual case and generic entity API ingestion provide provider-independent entry. | Meaningful, locally tested; event inbox separate. Aligned with extensibility. | A connector-only launch removes manual/API design-partner onboarding paths. | **Preserved and hardened**. | High |
| RR-20 | Team roles, delegated permissions, workspace switching, audit and privacy operations are implemented. | Strong locally; production parity/policy runtime open. Required trust foundation. | Simplified pilot auth weakens tenant boundary, audit, deletion, or owner controls. | **Preserved unchanged** at security boundary and hardened operationally. | High |
| RR-21 | Connected-object detail pages and global search provide cross-product navigation. | Partial based on connector data; merchant-scoped. Useful operations. | New navigation hides evidence/source context or breaks widget/deep links. | **Preserved and hardened**. | Medium-high |
| RR-22 | Legacy redirects preserve bookmarks and old product links. | Simple but active compatibility layer. | Removing them breaks stored links, widget references, documentation and returning users. | **Preserved unchanged** until telemetry/caller migration supports removal. | High |
| RR-23 | Broader planned slots (disputes, carrier claims) communicate intended expansion but are not working. | Schema/catalogue only. Direction depends on market proof. | Presenting them as live creates trust risk; deleting without founder decision loses product intent. | **Retained but hidden from initial pilot users** or clearly labelled planned. | High |

### 19.2 Integrity and launch risks to preserved capabilities

| ID | Risk | Failure mode | Required disposition before relying on capability |
|---|---|---|---|
| IR-01 | Delivered scan equals POD | False evidence and responsibility/recommendation. | Harden evidence semantics and regression-test photo/signature/location distinctions. |
| IR-02 | Missing item collapses into another reason | Wrong evidence source, attribution and recovery party. | Establish canonical subtype from every ingestion/manual path without removing other issues. |
| IR-03 | Investigations absent | “Manual review” has no operable next step; decisions stall or occur outside audit. | Add a first-class request/response lifecycle integrated with work/evidence/case state. |
| IR-04 | Flow delivery disconnected | Published flows appear active but never run on normal events. | Connect delivery or explicitly prevent/label publication until it is real; preserve definitions/history. |
| IR-05 | Partner parent ownership gap | Cross-tenant association and possible partner metadata disclosure. | Enforce same-merchant parent in service and database; add focused cross-tenant tests. |
| IR-06 | Widget token survives API key revoke | Revoked credential pair still authorizes embedded access. | Revoke/join-check token lifecycle and test rotations/revocation. |
| IR-07 | Generic event inbox has no consumer/status route | Accepted events remain pending; clients receive unusable status URL. | Complete worker/status/retry contract or stop advertising acceptance, with migration for queued rows. |
| IR-08 | Public gate bypasses canonical services | State/event/financial invariants diverge. | Migrate callers through canonical transition/decision/outcome contracts. |
| IR-09 | Evidence entitlement paths differ | Paid control bypass and inconsistent billing. | Unify permission/tier/credit semantics with idempotent spend. |
| IR-10 | No provider controlled-runtime proof | Sales/launch claims exceed evidence; webhook/retry/latency failures surface late. | Run provider-specific controlled proof and retain explicit maturity labels. |
| IR-11 | Credential rotation outstanding | Previously exposed credentials may remain trusted. | Rotate and confirm old credentials invalid before production trust. |
| IR-12 | Production schema/storage parity unverified | Local security/integrity assumptions may not exist in production. | Compare/deploy through approved forward plan; verify object policies/ACLs. |
| IR-13 | PII/tokens in URLs and logs | Browser/server/provider logs retain sensitive identifiers or bearer token. | Minimize/query redesign and logging redaction before production widget scale. |
| IR-14 | Report timezone/KPI copy defects | Management decisions use incorrect time boundary or recovery meaning. | Preserve metric contracts and fix presentation before financial claims. |
| IR-15 | Onboarding completes too early | Merchants appear activated without commerce/helpdesk/widget. | Align completion with verified connector milestones or explicitly separate optional setup. |

## 20. Current-product preservation requirements

These requirements are constraints for later planning, not implementation instructions.

### 20.1 Preserve unchanged at the semantic/security boundary

- Merchant decision must remain distinct from externally observed source outcome.
- Recommendation must remain advisory and traceable to evidence/rule snapshot.
- Confirmed loss, recoverable value, submitted value, approved value, recovered cash, prevented payout, written-off value, and net loss must remain distinct.
- Amounts must remain minor-unit and currency-specific; unknown must not become zero and currencies must not be silently converted/combined.
- Decisions, outcomes, financial entries, and sensitive audit facts must remain append-only/reversible through linked facts.
- Case and recovery transitions must retain idempotency, optimistic concurrency, final-state protection, and closure blockers.
- Merchant membership, server-side permissions, service-role scoping, RLS, workspace fail-closed behaviour, and owner transfer integrity must not be weakened for a pilot.
- Existing broader issue types must remain representable even if initial validation focuses on missing parcel/item.
- Existing URLs/deep links and compatibility redirects must be retained until callers/bookmarks are migrated.

### 20.2 Preserve and harden

- Payout Control queue/detail, manual case creation, comments, ownership, status and timeline.
- Customer history/search/object-detail context.
- Dashboard, financial reports, exports, audit and metric definitions.
- Work tasks, notifications and preferences.
- Rules configuration/versioning/explanations.
- Loss and recovery recordkeeping.
- Shopify, Gorgias and ShipBob paths; retain explicit maturity labels until runtime-proven.
- Carrier, CSV, API, document and self-pack paths; do not expose unsupported actions.
- Canonical evidence provenance, freshness and source health.
- Partner directory/recovery terms after same-tenant parent enforcement.
- Onboarding, connection health and stale/failure visibility.
- Team, privacy, credential and audit administration.

### 20.3 Integrate into the decision-to-recovery model

- First-class clarification/investigation requests should connect case next action, work assignment, due/overdue, templates, send method, responses, attachments, evidence provenance, re-evaluation, responsibility confirmation, and post-decision recovery.
- Partner contacts, submission URL/email, required evidence, deadlines and caps should be reused rather than recreated.
- Flow definitions/runs should connect to canonical domain-event deliveries and existing Work/Notifications, with replay safety.
- Existing PDF evidence export should be linked or deliberately separated from case evidence with truthful labels.
- Responsibility confirmation/correction should preserve advisory evaluator output and an immutable merchant judgment.

### 20.4 Replace only after explicit migration

- Legacy `claim-gate`/public-gate writers.
- `agreement_rules`/accountability `loss_sources`/`recovery_tasks` if canonical partner/loss/recovery models replace them.
- Any old identity/network read model superseded by merchant-scoped customer relationships.
- The current widget token/API key pairing if a new embedded-auth model is introduced.
- `evidence_packages` only after files, credits, activity, downloads and customer/order history have a supported destination.

### 20.5 Retain but hide or label for an initial pilot when necessary

- Uncontrolled Beta/Partial connectors not selected for the design partner.
- Developer preview/design-system routes.
- Planned disputes/carrier-claims slots.
- Network/full-context language until the delivered dataset and credit value are accurate.

### 20.6 Removal requires explicit founder approval

No capability should be removed simply because it is outside the first pilot. Founder approval plus caller/data/contract/telemetry evidence is required before removing:

- any existing issue type;
- Rules or Flows;
- customer history/search;
- reports/exports;
- loss/recovery history;
- partner/contact/term records;
- integration routes or populated source records;
- widget/deep links;
- manual/API ingestion;
- evidence packages/files;
- agreement/accountability history;
- legacy redirects.

## 21. Release-planning input matrix

This is provisional input only. It does not sequence work or constitute a roadmap.

| Capability | Provisional planning class | Current implementation state | Business/user value | Dependencies and regression risk | Reason / founder decision required | Confidence |
|---|---|---|---|---|---|---|
| Canonical cases, queue, detail, comments, decisions and reversals | **Existing baseline — preserve** | **Verified end-to-end** | Core payout-control operation and audit trail. | Auth/RBAC, transition/decision RPCs, evidence, events. Very high regression risk. | Preserve semantics and URLs. Founder only needs to decide pilot defaults, not whether it exists. | High |
| Decision versus source-outcome separation | **Existing baseline — preserve** | **Verified end-to-end** | Prevents approved intent being misreported as real payout/loss. | Provider reconciliation and financial projections. Critical integrity risk. | Non-negotiable data contract unless founder explicitly accepts weaker financial truth. | High |
| Append-only financial/loss/recovery model | **Existing baseline — preserve** | **Verified end-to-end** | Trustworthy loss/recovery reporting and reversals. | PostgreSQL functions, event handlers, currencies. Critical regression risk. | Preserve; founder should define commercial metric names/cost basis. | High |
| Internal loss and recovery workflow | **Existing baseline — preserve** | **Verified end-to-end** internally | Tracks recoverable work through paid/write-off. | Source outcomes, attribution, partner rules, work/reporting. | Preserve and extend external middle; founder defines pilot recovery party/process. | High |
| Dashboard/reports/export | **Existing baseline — preserve** | **Verified end-to-end** | Management visibility and proof of value. | Financial contracts, permissions, audit, source freshness. | Preserve all distinctions; founder decides launch report set/tier, not deletion. | High |
| Work tasks | **Existing baseline — preserve** | **Verified end-to-end** | Operational ownership, deadlines and queue. | Task RPCs, cases/recoveries/flows. | Use as investigation execution surface unless research proves a separate queue is needed. | High |
| Notifications/preferences | **Existing baseline — harden or complete** | **Implemented but partial** | Alerts users to overdue work/cases/recovery. | Projector schedule, recipient policy, task assignment, dedup. | Complete assignment/dismissal/scale semantics; founder decides channel strategy. | High |
| Merchant Rules | **Existing baseline — preserve** | **Verified end-to-end** | Configurable, explainable payout policy. | Evidence context and evaluator. | Preserve broader configurability; founder decides default policies and approval governance. | High |
| Flow configuration and records | **Existing baseline — harden or complete** | **Legacy or disconnected** at runtime | Potential operational automation; users can configure/test today. | Domain deliveries, Work/Notifications, replay/idempotency. | Connect or truthfully disable publication; founder decides whether exposed in Release 1. | High |
| Customer history/search/object pages | **Existing baseline — preserve** | **Implemented but partial** | Essential decision context and helpdesk deep links. | Source connectors, identity relationships, privacy. | Preserve; harden support-only identities and PII query handling. | High |
| Team/workspaces/RBAC/audit/privacy | **Existing baseline — preserve** | **Verified end-to-end** locally | Required multi-user trust and governance. | Supabase Auth/RLS, production configuration, policy. | Preserve; founder/security decide viewer export, retention, compliance posture. | High |
| Broader issue taxonomy | **Existing baseline — preserve** | **Implemented but partial** | Supports real claims beyond initial pilot. | Normalization, rules, reports. | Default to preservation; founder may hide unsupported paths but not erase history/types. | High |
| Manual case + generic entity API | **Existing baseline — preserve** | **Verified end-to-end** manual; **Implemented but partial** API runtime | Provider-independent onboarding and design-partner flexibility. | API keys, idempotency, canonical links. | Preserve; founder decides API availability/tier and support contract. | High |
| Gorgias ingestion and widget | **Existing baseline — harden or complete** | **Implemented but partial** | Strong helpdesk-in-context pilot value. | Connection setup, token lifecycle, matching, credits, latency, writeback. | Controlled proof and security/billing fixes required; founder selects design-partner account. | High |
| Shopify ingestion/reconciliation | **Existing baseline — harden or complete** | **Implemented but partial** | Order/refund truth and loss creation. | OAuth, webhooks, reconcile, source links. | Controlled proof required; founder decides read-only launch contract. | High |
| ShipBob/warehouse and carrier tracking evidence | **Existing baseline — harden or complete** | **Implemented but partial** | Responsibility evidence for missing parcel/item. | Provider accounts, subtype correctness, evidence semantics. | Fix POD and validate providers; founder selects supported 3PL/carrier combination. | High |
| WooCommerce/BigCommerce/Zendesk/Freshdesk/CSV/doc/self-pack | **Existing baseline — harden or complete** | **Implemented but partial** | Broader customer/provider coverage. | Provider-specific runtime/reconcile/security. | Preserve; founder decides which are exposed versus retained/hidden for Release 1. | High |
| Evidence provenance and source health | **Existing baseline — harden or complete** | **Implemented but partial** | Explainable decisions and defensible responsibility. | Adapters, evidence links, timestamps, connection health. | Correct semantics/completeness without replacing the graph. | High |
| Missing-item canonical subtype/correction | **Release 1 candidate — missing but required for the complete decision-to-recovery loop** | **Implemented but partial** | Routes missing-item cases to correct warehouse/3PL evidence and recovery. | Case schema/metadata, all normalizers/forms/rules/reports, migration compatibility. | Required if pilot claims missing-item support; founder confirms language/policy. | High |
| Investigation/clarification lifecycle | **Release 1 candidate — missing but required for the complete decision-to-recovery loop** | **Backend-only** fragments | Makes manual review operable and auditable. | Cases, Work, Notifications, email/manual/portal transport, evidence, partners. | Repository proves the gap, not the exact UX/channel. Founder decides pilot request parties and send channels. | High |
| Responsibility confirmation/correction | **Release 1 candidate — missing but required for the complete decision-to-recovery loop** | **Implemented but partial** advisory attribution only | Turns machine recommendation into accountable merchant judgment. | Evidence, case state, loss/recovery, audit. | Required before responsibility drives external recovery; founder defines approval role. | High |
| Recovery submission/response capture | **Release 1 candidate — missing but required for the complete decision-to-recovery loop** | **Implemented but partial** manual status only | Closes operational gap between recoverable and cash. | Partners, correspondence, Work, evidence, deadlines, external/manual channel. | Founder decides whether first pilot is assisted/manual or in-product send. | High |
| Partner parent ownership enforcement | **Existing baseline — harden or complete** | **Implemented but partial** | Protects tenant confidentiality and recovery integrity. | API/service lookup, composite constraint/migration, tests. | Security requirement, not optional roadmap expansion. | High |
| API key/widget token lifecycle | **Existing baseline — harden or complete** | **Implemented but partial** | Safe embedded/API credential revocation. | Credential tables/validation/rotation/UI. | Security requirement; founder decides whether credentials stay paired. | High |
| Generic event inbox worker/status | **Existing baseline — harden or complete** | **Implemented but partial** | Reliable generic webhook intake. | Inbox leasing, normalization, event handlers, status API, replay. | Complete or stop exposing acceptance. Founder decides supported generic event contract. | High |
| Onboarding connector milestones | **Existing baseline — harden or complete** | **Implemented but partial** | Prevents false activation and setup abandonment. | Profile/setup guard, OAuth callbacks, provider health/widget install. | Founder decides required vs optional connector mix and definition of “live”. | High |
| PDF evidence packages linked to cases | **Unable to classify** | **Implemented but partial** separate product | Paid/exportable customer evidence may support disputes or support operations. | Storage, credits, source customer/order identity, canonical evidence. | Founder decides whether it is a distinct product, a case artifact, or a migrated legacy capability. | Medium |
| Agreement/accountability migration | **Legacy/removal candidate — requires explicit founder approval** | **Legacy or disconnected** | Contains contract documents/terms and older recovery history. | Document/files, agreement rules, legacy loss/recovery records, canonical partner model. | Do not remove until data/callers are inventoried and migrated; founder chooses canonical term model. | High |
| Public/claim-gate migration | **Legacy/removal candidate — requires explicit founder approval** | **Legacy or disconnected** | May serve API/widget/older callers. | Caller inventory, canonical decision/transition semantics, events/idempotency. | Replace only after equivalent caller migration and history proof. | High |
| Carrier claims API action | **Release 1.1 candidate — genuine net-new expansion** | **Documentation/type/schema only** | Automates external recovery submission/status. | Validated internal recovery, provider agreements/APIs, permissions, retries, evidence package. | Founder decides after manual/assisted recovery proves workflow and provider priority. | Medium-high |
| Investigation email/templates/multiple parallel requests | **Release 1.1 candidate — genuine net-new expansion** if not required by selected Release 1 pilot | **Documentation/type/schema only** | Scales multi-party evidence collection. | Base investigation model, email compliance, attachments, SLA/chases. | Exact cut depends on design-partner workflow; a minimal auditable request may still be Release 1. | Medium |
| AI contract extraction/interpretation | **Later candidate — speculative or dependent on market proof** | **Documentation/type/schema only** | Could reduce partner-term setup effort. | Canonical partner terms, document security, evaluation/approval, model governance. | Founder must validate demand, acceptable error/risk and human review. | High |
| Cross-merchant network/full context | **Later candidate — speculative or dependent on market proof** | **UI-only or simulated** in widget; schema history exists | Potential fraud/identity signal value. | Consent/privacy, data rights, accuracy, pricing, network density. | Founder/legal decision required; current two-credit label must not imply delivery. | High |
| Stripe dispute connector | **Later candidate — speculative or dependent on market proof** | **Documentation/type/schema only** | Potential chargeback workflow expansion. | Provider integration, dispute evidence/actions, product focus. | Founder validates demand and sequencing. Billing Stripe is not evidence. | High |

## 22. Unanswered questions and items requiring runtime confirmation

Repository evidence cannot answer the following. Each has a concrete decision or launch impact.

### 22.1 Production data and infrastructure

1. Does production exactly contain the eight active migration outcomes, including the three production-only storage-policy definitions and per-object grants?
2. Are all archived/version-drift production migrations accounted for in the forward rollout plan without destructive reset?
3. Are domain-event, sync, notification, prevention, reconciliation, privacy-cleanup, and connection-verification cron routes actually scheduled, authenticated, monitored, and meeting SLAs?
4. What are production queue depths, dead letters, retry rates, duplicate rates, and oldest pending rows for `ingestion_events`, domain deliveries, sync jobs, work tasks, notifications, and privacy cleanup?
5. Are storage buckets private, signed URLs correctly bounded, object policies equivalent, malware scanning active, and cleanup jobs deleting every derived object?
6. Do realistic tenant/data volumes stay within the 1k/4k/10k/100-merchant caps without silent undercount or unacceptable latency?

### 22.2 Security and operations

7. Have all credentials listed in `docs/SECURITY.md` been rotated, and are old credentials demonstrably invalid?
8. Can the partner-rule foreign-parent association be reproduced against the deployed schema, and what existing rows are already inconsistent?
9. Are any revoked API keys paired with still-active widget tokens in deployed data?
10. What PII/token values appear in CDN, platform, application, provider, browser, and support logs for search/widget/lookup URLs, and what are their retention periods?
11. Is viewer access to audit export intentional?
12. What retention periods, legal bases, deletion exceptions, and support procedures have been approved for merchant, customer, evidence, audit, and provider data?
13. Are CSP reports monitored, and what prevents moving from report-only/unsafe directives to an enforced policy?

### 22.3 Provider runtime

14. For each selected provider, can a controlled account prove connect, initial sync, incremental sync, webhook, stale/duplicate/out-of-order event, reconcile, credential expiry, disconnect, reconnect, rate limit, and tenant isolation?
15. Is the Gorgias widget actually installed and rendered in supported Gorgias plans/accounts, within acceptable p50/p95 latency and payload limits?
16. Does Gorgias tag/internal-note writeback retry or reconcile after a provider failure?
17. What exact Shopify read scopes and webhook subscriptions are granted, and are refund reversals/cancellations/deletions reconciled?
18. Do ShipBob, UPS and FedEx return the weight, item, photo, signature, exception and source-account fields assumed by evaluators for representative cases?
19. Do Zendesk/Freshdesk/WooCommerce/BigCommerce connection checks prove provider access, or merely store credentials/config?
20. Is any production client using generic `/v1/ingest/events`, and are pending inbox rows being processed by infrastructure not present in this repository?
21. Are CSV imports recoverable/correctable after partial failure, and what duplicate policy applies across imports and connectors?

### 22.4 Product and commercial policy

22. Which issue types and normalized subtypes must be first-class at launch, and what is the authoritative distinction between missing parcel, missing item, wrong item and not-as-described?
23. What evidence qualifies as valid POD for each provider and market? A delivered scan alone must not be assumed.
24. Who must confirm/correct responsibility, and is four-eyes approval required before payout or recovery?
25. Which investigation parties/channels are required for the first design partner: customer, carrier, warehouse/3PL, supplier, internal, email, portal, or manual?
26. Is Release 1 allowed to be an assisted/manual recovery process, or must Unauth send submissions and ingest responses?
27. What is the accounting definition of refund/reship/replacement cost and net loss, including taxes, shipping, inventory cost, fees and FX?
28. What waiting window and evidence are required before a denied payout counts as prevented?
29. Is PDF/CE3 evidence a separate paid product, a case artifact, or a legacy export to migrate?
30. What does “full context” mean, what network data may legally be disclosed, and when may credits be charged?
31. Which provider surfaces should be visible, beta-labelled, invitation-only, or hidden for Release 1?
32. Which recovery KPI labels and report timezone semantics are contractually/commercially promised?

### 22.5 User experience and accessibility

33. Do onboarding, workspace switching, provider callbacks, widget deep links, case decisions, recovery transitions, exports, erasure and ownership transfer pass a controlled browser journey with realistic accounts?
34. Does the entire authenticated product meet the target accessibility standard, not only the representative 105-browser/397-file checks?
35. Are empty, stale, offline, permission-denied, retry, version-conflict and provider-partial states understandable to design partners?

## 23. Evidence appendix with paths, routes, services, tables, migrations, and tests

### 23.1 Governing and product documents

- `CLAUDE.md`
- `.codex/rules/authenticated-product.md`
- `ARCHITECTURE.md`
- `docs/PRODUCT.md`
- `docs/TESTING.md`
- `docs/CONNECTORS.md`
- `docs/SECURITY.md`
- `docs/OPERATIONS.md`
- `PILOT_COMMAND_CENTRE.md`
- `docs/MVP_PLUS_CASE_INVESTIGATIONS_SCOPE.md`
- `docs/audits/unauth-mvp-plus/00-executive-summary.md`
- `docs/audits/unauth-mvp-plus/01-requirements-matrix.md`
- `docs/audits/unauth-mvp-plus/02-merchant-journeys.md`
- `docs/audits/unauth-mvp-plus/03-security-data-integrity.md`
- `docs/audits/unauth-mvp-plus/06-feature-inventory.md`
- `docs/audits/unauth-mvp-plus/07-p0-verification-ledger.md`
- `docs/audits/unauth-mvp-plus/08-provider-proof-matrix.md`
- `docs/audits/unauth-mvp-plus/09-durable-audit-inventory.md`
- `docs/audits/unauth-mvp-plus/10-migration-history-remediation-plan.md`
- `docs/audits/unauth-mvp-plus/11-production-schema-manifest.md`
- `docs/audits/unauth-mvp-plus/12-migration-provenance-register.md`
- `docs/audits/unauth-mvp-plus/13-production-rollout-approval-packet.md`
- `docs/audits/unauth-mvp-plus/privacy-data-map.md`
- `docs/audits/unauth-mvp-plus/remediation-status.md`

### 23.2 Authenticated routes inventoried

```text
/dashboard
/work
/claims
/claims/[id]
/losses
/losses/[id]
/recoveries
/recoveries/[id]
/customers
/customers/[id]
/customers/[id]/claims
/customers/[id]/evidence/new
/rules
/rules/[id]
/rules/recovery
/flows
/flows/[id]
/flows/runs
/flows/runs/[id]
/reports
/reports/records
/integrations
/integrations/[provider]
/integrations/dev-preview
/integrations/imports
/integrations/shipbob/select
/notifications
/orders/[id]
/refunds/[id]
/returns/[id]
/shipments/[id]
/tickets/[id]
/disputes/[id]
/exceptions
/help
/settings
/settings/account
/settings/agreements
/settings/api-integrations
/settings/audit-trail
/settings/billing
/settings/data-privacy
/settings/integrations/chrome
/settings/integrations/freshdesk
/settings/integrations/gorgias
/settings/integrations/shopify
/settings/integrations/zendesk
/settings/notifications
/settings/platform
/settings/team
/dev/design-system
```

Other important surfaces:

- `app/onboarding/page.tsx`
- `components/OnboardingClient.tsx`
- authenticated layout: `app/(app)/layout.tsx`
- navigation: `lib/navigation/appRoutes.ts`, `components/nav/SidebarAside.tsx`, `components/layout/AppHeader.tsx`
- legacy redirects/security headers: `next.config.js`

### 23.3 Principal API routes

Cases and evidence:

- `app/api/cases/[caseId]/context/route.ts`
- `app/api/claims/route.ts`
- `app/api/claims/[claimId]/route.ts`
- `app/api/claims/[claimId]/decision/route.ts`
- `app/api/claims/[claimId]/outcome/route.ts`
- `app/api/claims/[claimId]/reverse/route.ts`
- `app/api/claims/[claimId]/status/route.ts`
- `app/api/claims/[claimId]/evidence/route.ts`
- `app/api/claims/[claimId]/comments/route.ts`
- `app/api/claims/[claimId]/support-context/route.ts`
- `app/api/evidence/route.ts`
- `app/api/claim-gate/check/route.ts`
- `app/api/v1/gate/evaluate/route.ts`
- `app/api/v1/gate/escalation/route.ts`

Loss, recovery and reports:

- `app/api/losses/[id]/route.ts`
- `app/api/recoveries/route.ts`
- `app/api/recoveries/[id]/route.ts`
- `app/api/recoveries/[id]/status/route.ts`
- `app/api/recoveries/[id]/correspondence/route.ts`
- `app/api/recovery-tasks/[id]/complete/route.ts`
- `app/api/reports/claims/route.ts`

Work, notifications, rules, Flows and partners:

- `app/api/work-tasks/[id]/route.ts`
- `app/api/work-tasks/bulk/route.ts`
- `app/api/notifications/route.ts`
- `app/api/notifications/[id]/read/route.ts`
- `app/api/notifications/preferences/route.ts`
- `app/api/notifications/unread-count/route.ts`
- `app/api/rules/*`
- `app/api/workflows/*`
- `app/api/partners/route.ts`
- `app/api/partners/[id]/route.ts`
- `app/api/partner-recovery-rules/route.ts`
- `app/api/partner-recovery-rules/[id]/route.ts`

Connectors and intake:

- `app/api/shopify/*`
- `app/api/gorgias/support-webhook/route.ts`
- `app/api/gorgias/widget/route.ts`
- `app/api/gorgias/widget/unlock/route.ts`
- `app/api/gorgias/widget/unlock/action/route.ts`
- `app/api/settings/gorgias/support-connection/*`
- `app/api/integrations/shipbob/*`
- `app/api/woocommerce/*`
- `app/api/bigcommerce/*`
- `app/api/zendesk/support-webhook/route.ts`
- `app/api/freshdesk/support-webhook/route.ts`
- `app/api/imports/*`
- `app/api/v1/ingest/customers/route.ts`
- `app/api/v1/ingest/orders/route.ts`
- `app/api/v1/ingest/cases/route.ts`
- `app/api/v1/ingest/events/route.ts`
- `app/api/fulfillment/pack-confirmation/route.ts`

Administration/reliability:

- `app/api/search/route.ts`
- `app/api/settings/api-keys/route.ts`
- `app/api/settings/api-keys/[keyId]/route.ts`
- `app/api/settings/data-subject-erasure/route.ts`
- `app/api/settings/bulk-delete/route.ts`
- `app/api/account/delete/route.ts`
- `app/api/team/*`
- `app/api/workspace/route.ts`
- `app/api/audit-trail/route.ts`
- `app/api/cron/process-domain-events/route.ts`
- `app/api/cron/process-sync-jobs/route.ts`
- `app/api/cron/project-notifications/route.ts`
- `app/api/cron/reconcile/route.ts`
- `app/api/cron/verify-connections/route.ts`
- `app/api/ops/domain-event-deliveries/route.ts`

### 23.4 Principal services and exported functions

Case and decision:

- `lib/cases/transitionCase.ts` — `transitionCase`
- `lib/claims/decision/*` — decision context, evidence collection, evaluation, audit hashes
- `lib/claims/decision/deliveryEvidence.ts` — delivery/POD derivation
- `lib/payouts/workflow.ts` — next-action/workflow derivation
- `lib/rules-engine.ts` and `lib/rules/*` — deterministic rule evaluation/store/versioning
- PostgreSQL: `transition_payout_case`, `record_case_decision`, `record_case_source_outcome`

Evidence and provider normalization:

- `lib/integrations/trackingEvidenceSlice.ts`
- `lib/connectors/providers/*`
- `lib/shopify/ingest.ts`
- `lib/support/gorgias/*`
- `lib/gorgias/widgetData.ts`, `widgetDataV2.ts`, `widgetJson.ts`
- `lib/api/v1/evidence*` / evidence generation services

Events, projections and Flows:

- `lib/events/domainEventStore.ts` — `recordDomainEvent`
- `lib/events/handlers/registry.ts` — `DOMAIN_EVENT_HANDLERS`, `runDomainEventHandler(s)`
- `lib/events/handlers/financialProjection.ts`
- `lib/events/handlers/lossProjection.ts`
- `lib/events/handlers/recoveryProjection.ts`
- `lib/events/handlers/caseProjection.ts`
- `lib/events/handlers/notificationProjection.ts`
- `lib/events/handlers/workflowHandler.ts`
- `lib/workflows/evaluate.ts`, `run.ts`, `validation.ts`
- `lib/events/deadLetterOps.ts`

Operations, finance and partners:

- `lib/recoveries/*`
- `lib/partners/store.ts` — partner/rule CRUD and best-rule selection
- `lib/notifications/projectOperational.ts`
- `lib/reports/*`, dashboard/reporting models
- `lib/accountability/store.ts`
- `lib/api/widgetTokens.ts`
- `lib/api/apiKeys.ts`
- `lib/supabase/scoped.ts`
- `lib/permissions/*`

### 23.5 Important tables

```text
merchants
merchant_users
user_permission_grants
merchant_integrations
store_connections
helpdesk_connections
support_provider_connections
source_customers
source_orders
source_tickets
source_shipments
source_refunds
support_payout_cases
case_decisions
case_outcomes
case_clarification_requests
case_events / claim_events
case_exceptions
case_prevention_observations
evidence_items
evidence_links
evidence_packages
case_financial_entries
case_financial_summaries
loss_cases
loss_attribution_candidates
loss_case_events
recovery_cases
recovery_case_events
external_clarification_requests
external_correspondence
work_tasks
notifications
notification_preferences
merchant_rules
merchant_rule_versions
workflow_definitions
workflow_runs
workflow_run_steps
partners
partner_recovery_rules
agreement_rules
loss_sources
recovery_tasks
ingestion_events
processed_webhooks
domain_events
domain_event_deliveries
sync_jobs
merchant_api_keys
merchant_widget_tokens
audit records
data_subject_erasure_receipts
privacy_storage_cleanup_jobs
account_deletion_audit_receipts
```

Generated database contract:

- `lib/supabase/types.ts`

### 23.6 Active migrations

- `supabase/migrations/20260720000000_canonical_production_baseline.sql`
- `supabase/migrations/20260720100000_canonical_environment_supplement.sql`
- `supabase/migrations/20260721120000_durable_sensitive_audit.sql`
- `supabase/migrations/20260722100000_tenant_authorization_hardening.sql`
- `supabase/migrations/20260722200000_webhook_event_safety.sql`
- `supabase/migrations/20260722300000_privacy_erasure_retention.sql`
- `supabase/migrations/20260722400000_source_to_recovery_integrity.sql`
- `supabase/migrations/20260722500000_ownership_transfer_integrity.sql`

Archived history:

- `supabase/migrations_archive/pre_canonical_20260722/` — 223 SQL files

### 23.7 Representative tests inspected or executed

Case/decision/evidence:

- `tests/api/claimsRoutes.test.ts`
- `tests/api/manualCaseCreation.test.ts`
- `tests/unit/claimDecision.test.ts`
- `tests/unit/decisionEngine.adversarial.test.ts`
- `tests/unit/merchantDecisionContract.test.ts`
- `tests/unit/trackingEvidence.test.ts`
- `tests/unit/payouts/mvpScenarios.test.ts`
- `tests/lib/crossModuleFinancialIntegrity.test.ts`

Rules, Flows, work and notifications:

- `tests/unit/rulesEngine.test.ts`
- `tests/lib/workflowEngine.test.ts`
- `tests/lib/domainEventDispatcher.test.ts`
- `tests/api/workTasksBulk.test.ts`
- `tests/unit/notificationProjection.test.ts`

Recovery and reports:

- `tests/unit/recoveries/recoveryCalculation.test.ts`
- `tests/unit/recoveries/recoveryStatusSemantics.test.ts`
- `tests/unit/recoveries/recoveryStore.test.ts`
- `tests/lib/reportsPayoutContract.test.ts`
- `tests/unit/intelligenceReporting.test.ts`

Connectors/helpdesk/intake:

- `tests/api/gorgiasSupportWebhook.test.ts`
- `tests/api/gorgiasWidgetHelpdeskLink.test.ts`
- `tests/lib/gorgiasWidgetJson.test.ts`
- `tests/lib/gorgiasWidgetUnlock.test.ts`
- `tests/api/shopifyWebhookP0.test.ts`
- `tests/api/canonicalEntityIngest.test.ts`
- `tests/api/canonicalEventIngest.test.ts`
- provider/unit connector tests under `tests/unit/integrations/` and `tests/unit/*Provider.test.ts`

Tenant/security/privacy:

- `tests/api/merchantIsolation.test.ts`
- `tests/api/scopedClient.test.ts`
- `tests/api/routeSecurity.test.ts`
- `tests/security/tenantBoundaryContract.test.ts`
- `tests/security/sourceAgnosticRls.test.ts`
- `tests/security/evidenceIsolation.test.ts`
- `tests/security/durableAuditMigration.test.ts`
- `tests/security/ownershipTransferContract.test.ts`
- `tests/api/dataSubjectErasure.test.ts`
- `tests/api/accountDelete.test.ts`

Surface and release evidence:

- `tests/lib/e2eProductSurface.test.ts`
- `scripts/check-authenticated-design.mjs`
- `scripts/verify-p0-ledger.mjs`
- `scripts/verify-privacy-erasure-runtime.sql`
- `scripts/validate-connector-migration-preflight.mjs`

### 23.8 Evidence standard applied

- Routes, tables, types, UI labels, fixtures, and documentation were never treated alone as proof.
- Important positive findings were traced through user surface, server action, service/RPC, persistence/provider boundary, resulting projection, and tests.
- Negative/disconnected findings were checked through repository-wide call-site searches, not inferred from one missing component.
- Provider claims were capped at the level supported by code/tests and the existing proof matrix; no Live status was assigned.
- Security conclusions distinguish local synthetic verification from production configuration.
- No implementation, external mutation, deployment, migration, or remediation was performed.

---

**Baseline conclusion:** Preserve the existing canonical cases, immutable decision/outcome separation, financial ledger, loss/recovery records, Rules, Work, reports, customer context, administration, and connector investments. Treat the product as **Implemented but partial**, not as either a blank MVP or a production-complete platform. The first complete launch loop needs truthful evidence semantics, reliable missing-item classification, operable investigations, responsibility confirmation, an auditable external recovery middle, connected Flow delivery, security-bound parent/token lifecycles, provider runtime proof, credential rotation, and production migration/storage verification.
