# Implementation Doc — Source-Agnostic Architecture and Connected Ecosystem (MVP+)

**Status:** Ready for phased implementation
**Audience:** Implementer model (follow the phases and gates exactly; do not redesign)
**Repository baseline:** `codex/refocus-claim-gate-map` at `1950bf64` (2026-07-11 audit)
**Primary outcome:** Shopify and Gorgias remain the first production connectors, but no core case, evidence, loss, recovery, financial, search, workflow, or UI behavior depends on either provider.

---

## 0. Read this first

Before changing code, read these files completely:

1. `CLAUDE.md`
2. `docs/product/MVP_STEERING.md`
3. `docs/product/PRODUCT_PRINCIPLES.md`
4. `docs/product/TERMINOLOGY.md`
5. This document

### 0.1 Requirement precedence

The source-agnostic MVP+ requirement that produced this implementation document **supersedes only the integration-specific limits** in the current steering material. In particular, it supersedes statements that the architecture may assume Shopify/Gorgias, that canonical CSV/API/webhook intake is out of scope, or that a support payout case must be anchored to a Shopify order or a known helpdesk ticket.

The existing product direction remains authoritative everywhere else:

- Unauth is a post-purchase payout-control, loss-accountability, and recovery product.
- Merchant rules recommend; Unauth does not autonomously approve, deny, refund, accuse, or assign blame.
- Use the neutral terminology in `docs/product/TERMINOLOGY.md`.
- Keep the Gorgias widget compressed; the full operating record belongs in Unauth.
- Do not change scoring, matching weights, identity-cluster logic, or thresholds unless separately authorised.

### 0.2 Non-negotiable engineering rules

- Do not add `as any`, `as never`, or `// eslint-disable` to production code. Existing instances encountered in touched files must be replaced with real types.
- Do not use `process.env` in server code. Use `env` from `lib/utils/env.ts`.
- Do not perform a big-bang schema rename or delete populated tables before backfill and parity verification.
- Do not resurrect the removed fraud-audit CSV worker, `lib/processing/worker.ts`, the old chunk dispatcher, or any v1 `fraud_entities` path. The CSV work in this plan is a new canonical business-record importer.
- Do not make external write-back or high-risk actions automatic. Refunds, denials, customer messages, and claim submissions require an explicit authorised user action in MVP+.
- Every new merchant-owned table must have direct `merchant_id`, RLS, service-role grants, the minimum authenticated grants, and registration in `lib/supabase/scoped.ts` if used through the scoped client.
- Money is stored as integer minor units plus ISO currency in all new canonical financial tables. Existing decimal columns remain compatibility fields until migrated.
- A missing source, unsupported capability, missing permission, absent record, stale record, and failed sync are different states. Do not collapse them into `null` or “not connected.”

### 0.3 Implementation method

Complete phases in order. At the end of every phase:

1. run the phase-specific tests;
2. run `npm run typecheck`;
3. run lint on changed production files;
4. run the full Jest suite;
5. apply the migration in the target environment only after local/static review;
6. verify every new table/RPC through Supabase REST;
7. do not start the next phase until the gate is green.

Use one commit per phase. Do not mix UI rewrites with foundational migrations.

---

## 1. Verified current-state audit

This section records what exists on the audited branch. Treat it as the baseline, not as a request to rebuild working features.

### 1.1 What is already source-aware and should be retained

- The v2 normalized tables in `supabase/full_schema.sql` already use provider-neutral records:
  - `source_customers` (`:324`)
  - `source_addresses` (`:356`)
  - `source_orders` (`:374`)
  - `source_refunds` (`:420`)
  - `source_fulfillments` (`:436`)
  - `source_disputes` (`:452`)
  - `source_tickets` (`:469`)
  - `source_ticket_events` (`:502`)
- `support_payout_cases` links to normalized order/ticket UUIDs rather than `shopify_order_id`/`gorgias_ticket_id` columns (`supabase/full_schema.sql:659`).
- `lib/integrations/registry.ts` and `lib/integrations/types.ts` provide a provider registry and an initial capability manifest.
- Production modules already exist for Shopify, Gorgias, AfterShip, UPS, FedEx, ShipBob, document upload, and a packaged Zendesk sidebar extension.
- Gorgias, Zendesk, and Freshdesk normalize through the shared support-intake layer under `lib/support/intake/`.
- `processed_webhooks` and `sync_jobs` provide reusable idempotency/job foundations (`supabase/full_schema.sql:1151` and `:1169`).
- The payout case is already the primary workbench route (`app/(app)/claims/[id]/page.tsx`).
- Recovery has a useful canonical read model and read-only board based on `recovery_cases` (`lib/recoveries/store.ts`, `app/(app)/recoveries/page.tsx`). It is not yet an operational board: the cards have no detail/action path and the recovery mutation routes deliberately return 405.
- A command palette and a partially unified search endpoint exist (`components/layout/CommandPalette.tsx`, `app/api/search/route.ts`).

### 1.2 Structural gaps that block the target architecture

#### Connections are split across three models

- Commerce accounts use `store_connections`.
- Helpdesks use `helpdesk_connections`.
- Tracking, carrier, warehouse, document, and other integrations use `merchant_integrations` plus `integration_credentials`.
- `lib/integrations/auth.ts` special-cases Shopify and Gorgias instead of using one connection contract.
- `app/api/integrations/[provider]/connect/route.ts`, `app/api/integrations/[provider]/sync/route.ts`, and `app/api/integrations/[provider]/disconnect/route.ts` branch directly on provider IDs.

There is no canonical source-account record and no universal source-record registry linking an external record to its Unauth entity.

#### Capability metadata is descriptive, not executable

`ConnectorCapabilityMap` in `lib/integrations/types.ts:53` is a loose set of booleans. It does not represent Read/Sync/Link/Write/Act/Subscribe levels, partial support, merchant permission, or disabled actions. The Integration Hub does not show a capability matrix.

#### Core logic still defaults to Shopify or Gorgias

Verified examples:

- `lib/claim-gate/createOrUpdateClaim.ts:21-29` defaults unknown ticket providers to Gorgias.
- `lib/claim-gate/buildEvidence.ts:101-105` defaults an unknown helpdesk platform to Gorgias.
- `lib/claim-gate/publicGate.ts:136-145` performs the same default.
- `lib/payouts/assembleEvidencePack.ts:137-169` explicitly requires Gorgias and Shopify rather than reading whichever connected source owns the ticket/order.
- `lib/support/intake/commerceOrderLookup.ts` remains Shopify-shaped (`shopify_order_id`, `shop_domain`, `shopify_signal`).
- `app/api/claims/route.ts` still exposes `shopify_order_id` compatibility fields and requires an existing order or ticket for manual creation.
- `components/claims/ClaimReviewContextColumn.tsx` labels the order through `shopify_order_id`/`order_ref` rather than a source-neutral reference.

#### Matching can silently choose the wrong order

`lib/support/intake/resolveTicketOrderLink.ts:43-79` selects the most recent order for an email and returns it as an `email_fallback`. It does not expose confirmed/probable/ambiguous/unmatched states or persist candidates. This conflicts with the requirement not to silently merge uncertain records.

#### Evidence is stored in four overlapping systems

- `claim_evidence` — current case attachments/checklist evidence.
- `integration_evidence_items` — connector-derived evidence.
- `evidence_items` — accountability workflow evidence.
- `loss_case_evidence` — loss/recovery evidence.

`lib/claims/decision/context.ts` reads multiple stores, while `lib/accountability/store.ts` creates another set. Provenance, freshness, URLs, confidence, and source timestamps are inconsistent.

#### Loss and recovery state is duplicated

- `support_payout_cases` contains attribution, recoverability, recovery state, and estimated loss fields.
- `loss_cases` models source-backed loss operations.
- `loss_sources` models accountability classifications.
- `recovery_cases` is the active recovery board.
- `recovery_tasks` is a separate narrow task system.

There is no one loss ledger or generic work-task model.

#### Money has multiple encodings and competing sources of truth

- Existing case/outcome/recovery/accountability tables use `numeric(12,2)`.
- `loss_cases` uses `*_minor bigint`.
- Dashboard and reports recalculate totals from different tables.

There is no append-only canonical financial ledger for requested, exposed, approved, paid, confirmed loss, recoverable, recovered, prevented, and written-off states.

#### Events are local audit logs, not an internal event architecture

`claim_events`, `support_case_events`, `recovery_case_events`, `loss_case_events`, and `accountability_events` exist, but there is no provider-neutral domain-event stream/outbox. Shopify and helpdesk handlers call case/rule/loss code directly after parsing raw payloads.

#### The connected-operating-environment UI is incomplete

- The case timeline only renders `claim_events`; it does not merge source events, decisions, recovery, tasks, financial changes, or sync events.
- “Related records” is a count, not a navigable relationship panel.
- There is no reusable case context side panel for queues/reports/search.
- Search covers customers, orders, and cases only, and the multi-entity path is feature-flagged.
- There is no Work page, Losses page, generic task inbox, comments, mentions, notification centre, or notification preferences.
- Rules exist; Flows do not.
- The Integrations Hub shows cards and connection actions, but not imported record counts, data freshness, capability status, coverage, webhook health, or affected data-quality records.

A file-level inventory of every verified residual provider/currency/status leak — with exact paths and line references — is in **§21 (Appendix)**. Work each item in the phase the appendix assigns; do not hunt for these independently.

### 1.3 Product-doc conflicts to correct during Phase 0

Do not delete historical context. Add a short “MVP+ source architecture override” note to:

- `docs/product/MVP_STEERING.md` sections 9, 10, 23, and 25;
- `docs/product/PRODUCT_PRINCIPLES.md` under “Out of MVP scope”;
- `docs/product/LAUNCH_BLUEPRINT.md` under locked launch decisions.

The note must say that Shopify/Gorgias remain launch connectors and that broad connector breadth is still later, while canonical CSV/webhook/API/manual intake and the connector/event foundation are now in scope.

---

## 2. Target architecture and ownership rules

### 2.1 Layers

All inbound data must pass through these layers:

```text
Provider webhook / scheduled sync / CSV / canonical API / manual UI
  -> authenticated ingestion inbox (raw provider event + idempotency)
  -> connector adapter or canonical-intake adapter
  -> normalized entity writes + source-record registry
  -> domain event outbox
  -> deterministic handlers
       - relationship matching
       - case create/update
       - rule evaluation
       - task/notification routing
       - loss/recovery projection
       - financial ledger projection
  -> read models used by every screen
```

Raw Shopify/Gorgias payloads stop at the adapter boundary. Core handlers accept normalized entities and domain events only.

### 2.2 Canonical table ownership

Retain and extend these as the canonical operational stores:

| Concept | Canonical store after this plan | Notes |
|---|---|---|
| Merchant | `merchants` | Add validated settings model; do not duplicate settings tables unnecessarily. |
| Connection | extended `merchant_integrations` | Make this the canonical connection model; backfill current store/helpdesk rows and keep compatibility views during cutover. |
| Source account | new `source_accounts` | One connection may expose one or more accounts/sites. |
| Source registry | new `source_records` | Universal external-ID/provenance mapping. |
| Customer | new `merchant_customers` aggregate plus existing `source_customers` | One merchant-local customer can relate to records from several sources; do not use a provider customer row as the universal customer ID. |
| Address/order/refund/fulfilment/dispute/ticket | existing `source_*` tables | Add account-scoped identity/provenance through `source_records`; keep normalized columns. |
| Missing canonical records | new `source_order_lines`, `source_payments`, `source_transactions`, `source_replacements`, `source_shipments`, `source_tracking_events`, `source_returns`, `source_messages` | Add only the source-neutral fields needed by MVP+ plus `raw_metadata`. |
| Payout case | `support_payout_cases` | Single shared case state; all transitions use one service. |
| Rule evaluation | `rule_evaluations` | Keep append-only audit behavior; expand recommendation vocabulary safely. |
| Evidence item | rebuilt/extended `evidence_items` plus new `evidence_links` | Migrate the other three evidence stores, then make them compatibility-only. |
| Loss record | `loss_cases` | Canonical loss ledger record; migrate `loss_sources` semantics into it. |
| Recovery record | `recovery_cases` | Add `loss_case_id`; keep active board/status behavior. |
| Task | new `work_tasks` | Supersedes narrow `recovery_tasks` after migration. |
| Comment/mention | new `case_comments`, `comment_mentions` | Merchant-internal collaboration only. |
| Notification | new `notifications`, `notification_preferences` | In-app first; email delivery through outbox. |
| Decision/outcome | new append-only `case_decisions` and `case_outcomes` | Existing mutable `claim_outcomes` becomes a current-state compatibility projection. |
| Audit/domain event | new `domain_events` | Existing local event tables remain compatibility projections until migrated. |
| Financial truth | new `case_financial_entries` + `case_financial_summaries` | Minor units and currency; all dashboards read summaries. |

### 2.3 Relationship graph

Create a merchant-scoped `entity_relationships` table. It is the product graph, not the legacy identity graph.

Required fields:

```text
id uuid PK
merchant_id uuid NOT NULL
from_entity_type text NOT NULL
from_entity_id uuid NOT NULL
to_entity_type text NOT NULL
to_entity_id uuid NOT NULL
relationship_type text NOT NULL
match_status text NOT NULL  -- confirmed | probable | ambiguous | unmatched
match_method text            -- external_reference | order_number | transaction_id | tracking_number | customer_id | email | manual | connector_declared
confidence numeric(5,4)
evidence jsonb NOT NULL DEFAULT '{}'
resolved_by uuid NULL
resolved_at timestamptz NULL
created_at / updated_at
```

Use an application validator in `lib/relationships/entityTypes.ts` for the allowed entity types and relationship types. Every query must be merchant-scoped. Add a unique key preventing duplicate directed relationships. Do not connect ambiguous candidates to core case fields until a user resolves them.

### 2.4 Internal event vocabulary

Use namespaced, past-tense facts. Minimum MVP+ vocabulary:

```text
customer.created | customer.updated
order.created | order.updated
refund.created | refund.updated
replacement.created | replacement.updated
fulfilment.created | fulfilment.updated
shipment.created | shipment.updated | shipment.delivered | shipment.exception_recorded
tracking_event.recorded
return.created | return.updated | return.overdue
dispute.created | dispute.updated
ticket.created | ticket.updated | message.created
evidence.created | evidence.updated
relationship.confirmed | relationship.ambiguous | relationship.resolved
case.created | case.updated | case.assigned | case.decision_recorded | case.closed
rule.evaluated
loss.created | loss.confirmed | loss.written_off
recovery.created | recovery.submitted | recovery.completed
task.created | task.assigned | task.completed
notification.requested | notification.delivered | notification.failed
connection.sync_started | connection.sync_completed | connection.sync_failed
```

Every event stores `schema_version`, `merchant_id`, `aggregate_type`, `aggregate_id`, source record/connection references, `occurred_at`, `recorded_at`, actor type/id, idempotency key, correlation ID, causation ID, and a validated JSON payload.

### 2.5 Compatibility policy

During migration:

- New canonical services may dual-write legacy compatibility fields.
- New read models prefer canonical tables and fall back to legacy fields only when a backfill marker is absent.
- Do not add new business logic to legacy evidence/loss stores.
- When parity is verified, stop legacy writes first, observe for one release, then remove legacy reads in a separate migration.

---

## 3. Phase 0 — Freeze the contract and add test fixtures

### Goal

Make the new architecture unambiguous before schema work.

### Files to add

- `docs/product/SOURCE_AGNOSTIC_MVP_PLUS.md`
  - Copy the approved source-agnostic requirements into a concise product contract.
  - State the precedence rule from §0.1.
- `tests/fixtures/source-agnostic/`
  - `shopify-order-created.json`
  - `gorgias-ticket-created.json`
  - `canonical-order-created.json`
  - `canonical-refund-created.json`
  - `canonical-ticket-created.json`
  - `canonical-shipment-delivered.json`
  - `canonical-dispute-created.json`
  - `canonical-recovery-completed.json`
  - `ambiguous-email-orders.json`

### Files to edit

- The product docs listed in §1.3.
- `tests/banned-terms.test.ts` only if the new docs introduce neutral terminology not currently allowed. Do not weaken banned-term coverage.

### Establish the real schema baseline before authoring migrations

The v2 cutover source of truth is currently fragmented across `supabase/rebuild/`, `supabase/manual/`, normal `supabase/migrations/`, the live database, and generated `lib/supabase/types.ts`. Before a lesser model authors Phase 1 DDL:

1. dump the target database schema and `supabase_migrations.schema_migrations` ledger without dumping customer data;
2. compare it with the rebuild baseline, manual SQL, standard migrations, and generated types;
3. verify whether `evidence_items`, `loss_sources`, `recovery_tasks`, and `accountability_events` from `supabase/migrations/20260621120000_accountability_agreements.sql` actually exist in the target database;
4. regenerate types from an isolated verification environment and require no unexplained schema diff;
5. create/document one reproducible clean-install baseline for CI/staging;
6. record row counts and FK/uniqueness/RLS state for every table being consolidated.

Do not run `db reset`, migration-history repair, destructive squash, or schema rename against production. If live schema and repository history disagree, stop and report the exact sanitized difference before Phase 1.

### Gate

- A reviewer can answer which document wins when the current MVP steering conflicts with source independence.
- Fixtures contain no production credentials or customer data.
- The live/target schema, migration ledger, rebuild/manual SQL, and generated types have a documented reconciliation result.
- No runtime behavior changes in this phase.

---

## 4. Phase 1 — Database foundation: connections, provenance, events, relationships, finance

### Goal

Add the shared foundation without moving existing production reads yet.

### Migration

Add one additive migration, for example:

`supabase/migrations/YYYYMMDDHHMMSS_source_agnostic_foundation.sql`

Create or extend:

1. extend existing `merchant_integrations` into the canonical connection model
2. `source_accounts`
3. `source_records`
4. `ingestion_events`
5. `domain_events`
6. `domain_event_deliveries`
7. `entity_relationships`
8. `record_match_candidates`
9. `record_match_resolutions`
10. `case_financial_entries`
11. `case_financial_summaries`

Extend:

- `sync_jobs`
- `sync_job_chunks`
- `support_payout_cases`
- `processed_webhooks` only as a compatibility source; do not make it the new event inbox.

### Required connection columns

`merchant_integrations` (extended in place):

```text
id, merchant_id, provider_id, category, status
auth_mode, display_name
provider_account_id, provider_account_name, provider_base_url
capabilities_snapshot jsonb
granted_scopes text[]
writeback_enabled boolean default false
subscribed boolean default false
last_sync_started_at, last_sync_completed_at
last_successful_sync_at, next_scheduled_sync_at
data_fresh_through, sync_cursor jsonb
webhook_status, webhook_last_received_at
imported_record_count bigint default 0
last_error_code, last_error_message, last_error_at
connector_version, created_at, updated_at, disconnected_at
```

Status must distinguish `pending`, `connected`, `degraded`, `syncing`, `disabled`, `revoked`, and `error`.

Remove the current `unique (merchant_id, provider_id)` restriction: one merchant may have multiple connections/accounts for the same provider. Use a stable provider-account/install identity where available, and quarantine ambiguous legacy rows during backfill rather than guessing.

Keep credentials in a separate encrypted table. Extend/replace `integration_credentials` so its FK is `connection_id`, not only `(merchant_id, provider_id)`. Never expose encrypted payloads through a client read model.

### Required source registry columns

`source_records`:

```text
id, merchant_id, connection_id, source_account_id
source_system, source_entity_type, external_id
canonical_entity_type, canonical_entity_id
source_url
source_created_at, source_updated_at
ingested_at, last_synced_at
sync_state  -- current | pending | stale | failed | deleted
freshness_state -- fresh | ageing | stale | unknown
connector_version, payload_hash
source_metadata jsonb
created_at, updated_at
```

Unique: `(merchant_id, connection_id, source_entity_type, external_id)`.

### Account-scoped source identity migration

The current v2 constraints scope external IDs to provider rather than account:

- `source_customers`: `(merchant_id, source, external_id)`
- `source_orders`: `(merchant_id, source, external_id)`
- `source_tickets`: `(merchant_id, provider, external_id)`

That can collide when one merchant connects two Shopify stores, two Zendesk accounts, or any two accounts whose providers reuse an external ID. The foundation work must:

1. require `connection_id` for newly ingested connector records (manual/CSV/API records use a synthetic canonical connection);
2. backfill connection/source-account ownership for existing rows;
3. run a collision report before changing constraints;
4. replace provider-only uniqueness with connection/account-scoped uniqueness;
5. retain temporary non-unique lookup indexes on the old columns for compatibility;
6. update every affected connector upsert conflict target.

Platform customer/helpdesk identity observations have the same risk: `lib/identity/observations.ts` currently namespaces external IDs as provider + external ID. Add connection/source-account ID to that namespace. This is an identity-key scoping correction only: do not change weights, thresholds, cluster-building logic, or confidence calculations. Backfill/re-emit account-scoped keys and verify existing single-account merchants retain their effective links.

### Required event tables

`ingestion_events` is the authenticated inbox. It stores a redacted/encrypted payload or private-object pointer, payload hash, provider event ID, idempotency key, status, attempt count, next attempt, error, retention deadline, and timestamps. Restrict reads to service role; do not make raw source payloads merchant-readable by default.

`domain_events` is immutable and merchant-readable. Add a no-update/no-delete trigger. `domain_event_deliveries` tracks each handler independently so one failed handler does not replay successful handlers.

Add RPCs:

- `claim_ingestion_event(p_event_id, p_worker_id, p_lease_seconds)`
- `record_domain_event(...)`
- `claim_domain_event_deliveries(p_handler_name, p_limit, p_worker_id, p_lease_seconds)`
- `complete_domain_event_delivery(...)`
- `fail_domain_event_delivery(...)`

Use `FOR UPDATE SKIP LOCKED` and retry timestamps. Cap attempts; failed items remain visible as dead-letter records.

### Financial ledger rules

`case_financial_entries` is append-only:

```text
id, merchant_id, support_payout_case_id
loss_case_id, recovery_case_id
state -- requested | exposed | approved | paid | estimated_loss | confirmed_loss | recoverable | recovered | prevented | written_off
amount_minor bigint NOT NULL CHECK >= 0
currency char(3) NOT NULL
direction -- debit | credit | memo
source_record_id, domain_event_id
effective_at, recorded_at
reverses_entry_id, metadata
```

Never update an entry to correct it; append a reversal and replacement. `case_financial_summaries` is a projection keyed by `(merchant_id, support_payout_case_id, currency)` with one column per financial state and a `last_event_id` checkpoint.

Decimal-to-minor-unit backfill must use the ISO currency exponent; do not multiply every currency by 100. Test at least 0-, 2-, and 3-decimal currencies. Preserve the original amount/currency and record any reporting-currency conversion separately with rate, rate timestamp, and rate source. Remove the current implicit USD default from newly created recovery records; inherit or explicitly require case/loss currency.

### Extend existing tables

`support_payout_cases`:

- add `case_origin` (`connector`, `canonical_webhook`, `api`, `csv_import`, `manual`);
- add `manual_reference`, `manual_source_url`;
- add `state_version bigint default 1` for optimistic concurrency;
- relax `claims_anchor_required` so a manual/API/CSV case may exist without source order/ticket, but require `manual_reference` for an unanchored case;
- add `primary_currency char(3)` only if needed for compatibility; financial entries remain authoritative.

`sync_jobs`:

- add `connection_id`, `source_account_id`, `cursor`, `next_attempt_at`, `attempts`, `max_attempts`, `started_at`, `last_error_code`;
- expand `job_kind` to `initial_import`, `incremental_sync`, `webhook_replay`, `csv_import`, `api_import`, and `reprocess`;
- retain old enum/check values until old rows are migrated.

### RLS and grants

- Every merchant table: member select; owner/admin write only where browser writes are intended; service role full access.
- Inbox/delivery/credential tables: no authenticated select.
- Domain events: member select, service-only insert.
- Financial entries: member select, service-only write.

### Structural tenant integrity

RLS alone does not prevent a row carrying Merchant A's `merchant_id` while referencing Merchant B's parent UUID. For merchant-owned parent/child relations:

1. add `UNIQUE (merchant_id, id)` to the parent;
2. add composite FKs `(merchant_id, parent_id)` to the child;
3. add them `NOT VALID` first;
4. report and quarantine/repair mismatches;
5. `VALIDATE CONSTRAINT` only after the report is clean.

Cover source customer/address/order children, case children, evidence links, rule evaluations, losses, recoveries, tasks, comments, notifications, and source records. Global identity IDs are exempt from a composite merchant FK; validate their merchant visibility through merchant-owned identity signals.

Correct `lib/supabase/scoped.ts` while touching tenancy: `source_orders` does contain `merchant_id` and must not bypass filtering. Expand scoped-client coverage from its current hand-maintained subset, and add real local/staging Postgres/JWT RLS tests in addition to mocked query-construction tests.

### Code files to edit

- `lib/supabase/tables.ts`
- `lib/supabase/scoped.ts`
- regenerate `lib/supabase/types.ts` using `npm run gen:supabase-types`
- `app/api/account/delete/route.ts` so GDPR deletion includes every new merchant-owned table in FK-safe order
- `tests/api/accountDelete.test.ts`
- `tests/api/scopedClient.test.ts`
- adapter upserts that currently conflict on provider-scoped external IDs
- `lib/identity/observations.ts` for account-scoped external-identifier namespacing only

### Tests to add

- `tests/lib/domainEventStore.test.ts`
- `tests/lib/sourceRegistry.test.ts`
- `tests/lib/financialLedger.test.ts`
- `tests/security/sourceAgnosticRls.test.ts`

### Gate

- Duplicate ingestion keys create one inbox row.
- Two accounts of the same provider can store identical external customer/order/ticket IDs without a collision or identity merge.
- Two workers cannot claim the same delivery lease.
- Domain events cannot be updated/deleted.
- Financial reversal produces the correct summary without mutating history.
- Merchant A cannot read Merchant B connections, source records, relationships, events, or financial summaries.
- Existing Shopify/Gorgias flows still pass unchanged.

---

## 5. Phase 2 — Connector contract and provider wrappers

### Goal

Make provider branching live behind a single connector interface while reusing working provider code.

### Files to add

```text
lib/connectors/types.ts
lib/connectors/capabilities.ts
lib/connectors/registry.ts
lib/connectors/runtime.ts
lib/connectors/connectionStore.ts
lib/connectors/sourceRegistry.ts
lib/connectors/ingestionInbox.ts
lib/connectors/domainEvents.ts
lib/connectors/syncEngine.ts
lib/connectors/errors.ts
lib/connectors/providers/shopify.ts
lib/connectors/providers/gorgias.ts
lib/connectors/providers/aftership.ts
lib/connectors/providers/shipbob.ts
lib/connectors/providers/documentUpload.ts
```

The provider files are wrappers around existing modules. Do not move or rewrite proven OAuth, API clients, signature verification, or normalizers in this phase.

### Connector interface

Implement and export a typed contract equivalent to:

```ts
export interface ConnectorAdapter {
  manifest: ConnectorManifest;
  testConnection(ctx: ConnectorContext): Promise<ConnectionTestResult>;
  initialImport(ctx: ConnectorContext, cursor?: SyncCursor): Promise<SyncPage>;
  incrementalSync(ctx: ConnectorContext, cursor?: SyncCursor): Promise<SyncPage>;
  processWebhook(ctx: WebhookContext): Promise<IngestionResult>;
  normalize(input: ConnectorRecord): Promise<NormalizedRecord[]>;
  deepLink(input: DeepLinkInput): string | null;
  executeAction?(ctx: ConnectorContext, action: ConnectorAction): Promise<ActionResult>;
  disconnect(ctx: ConnectorContext): Promise<DisconnectResult>;
}
```

`connect`/authentication remains route-specific where OAuth redirects require it, but the successful callback must finish by creating/updating canonical `merchant_integrations` and `source_accounts` rows through `connectionStore`.

### Capability model

Replace boolean-only capability display with records:

```ts
type CapabilityLevel = 'read' | 'sync' | 'link' | 'write' | 'act' | 'subscribe';
type CapabilitySupport = 'supported' | 'partial' | 'unsupported';

type ConnectorCapability = {
  id: string;                  // orders.read, refunds.subscribe, tickets.write_note
  level: CapabilityLevel;
  support: CapabilitySupport;
  enabledByDefault: boolean;
  requiredScopes: string[];
  risk: 'low' | 'medium' | 'high';
  description: string;
};
```

Runtime availability is separate from declared support:

```text
declared support + granted scope + merchant writeback setting + connection health
  -> enabled | permission_missing | merchant_disabled | degraded | unsupported
```

High-risk capabilities (`refund.issue`, `request.deny`, `claim.submit`) must remain unsupported or merchant-disabled in MVP+.

### Registry migration

- Keep `lib/integrations/registry.ts` as a compatibility export that delegates to `lib/connectors/registry.ts`.
- Convert current provider manifests to the new capability structure.
- Add descriptors for Zendesk/Freshdesk that point at their existing helpdesk connection stacks even if they are not promoted as launch connectors.
- Register implemented WooCommerce/BigCommerce adapters truthfully in the runtime even while `launchVisible: false` keeps their merchant-facing cards “coming soon.” Runtime availability, verification status, and launch visibility are separate fields.
- Do not label a connector “live” unless its test connection, import/sync, webhook, normalization, and disconnect path are implemented and tested.
- Do not report a successful sync for a no-op method. The current generic Gorgias sync branch returns no records and can still update `last_sync_at`; the adapter must return `unsupported` or delegate to the real Gorgias backfill.

### Route edits

Refactor these routes to call the registry/runtime instead of provider `if/else` chains:

- `app/api/integrations/[provider]/connect/route.ts`
- `app/api/integrations/[provider]/api-key/route.ts`
- `app/api/integrations/[provider]/sync/route.ts`
- `app/api/integrations/[provider]/webhook/route.ts`
- `app/api/integrations/[provider]/disconnect/route.ts`
- `app/api/integrations/route.ts`

Existing dedicated Shopify/Gorgias OAuth/webhook routes may remain, but after verification and parsing they must enqueue `ingestion_events` and invoke the connector adapter. They must no longer call case/loss/recovery code from raw payloads.

### Sync engine behavior

`lib/connectors/syncEngine.ts` must use `sync_jobs`/chunks as a real durable runner, not an in-request loop. It must support initial imports, scheduled incremental syncs, webhook-driven sync, resumable cursors, per-record partial failure, retry with exponential backoff/jitter, `Retry-After`, per-connection rate budgets, dead-letter state, cancellation/disconnect, and per-merchant isolation. A failed child record must not roll back unrelated valid records or advance the cursor past unreconciled data.

Characterize and repair current webhook behavior while routing it through the inbox:

- make webhook claim atomic; the current read-then-upsert `processed_webhooks` flow allows concurrent deliveries to proceed;
- implement helpdesk event idempotency instead of persisting `event_idempotency: 'not_implemented'`;
- return a retryable non-2xx response for processing failure (WooCommerce/BigCommerce must match Shopify's retry-safe behavior);
- never select the AfterShip merchant from an untrusted query parameter alone;
- log safe error codes to clients/health records rather than returning raw provider errors.

Add a cron/worker entry point with a lease and bounded batch size. Test crash-after-claim, resume, duplicate delivery, 429, poison record, disconnect during sync, and partial page failure.

### Connection backfill

Add a second migration/RPC that backfills the extended `merchant_integrations` model from:

- `store_connections`
- `helpdesk_connections`
- `merchant_integrations`

Preserve original row IDs in metadata and create one `source_accounts` row per current connected account. Do not copy plaintext credentials; point/migrate encrypted credential payloads server-side.

Run a parity report before switching reads:

```text
merchant_id, provider_id, old_status, new_status, old_last_sync, new_last_sync, mismatch_reason
```

### Tests

- `tests/unit/connectors/registry.test.ts`
- `tests/unit/connectors/capabilities.test.ts`
- `tests/unit/connectors/runtime.test.ts`
- adapter contract tests for Shopify, Gorgias, AfterShip, ShipBob, and document upload
- update integration route tests to assert no route-level provider branching behavior

### Gate

- All live adapters pass the same contract suite.
- Unknown providers fail with a typed `connector_not_registered` error.
- Connection status parity is 100% for the fixture database.
- A source connector can be added to the registry without editing the generic connect/sync/disconnect routes.

---

## 6. Phase 3 — Complete the canonical entity model and mapping layer

### Goal

Normalize all MVP+ record types without changing the payout product behavior yet.

### Migration

Create the missing tables listed in §2.2. Every table requires:

- `id`, `merchant_id`;
- parent FK(s) where known;
- source-neutral normalized fields;
- `raw_metadata jsonb` for permitted provider-specific attributes;
- timestamps;
- unique source identity enforced through `source_records`, not a provider-specific column name.

Create `merchant_customers` as the stable merchant-local customer aggregate. Link each `source_customers` record through a confirmed `entity_relationships` row (and optionally a direct projection FK after confirmation). A merchant customer may reference the existing identity aggregate, but must not depend on a globally scoped provider customer ID.

The closed `signal_source` enum currently forces a database migration for every custom/new provider. Make `source_account_id`/registry provider ID authoritative for operational source identity. Keep the enum column only as a temporary compatibility projection, or migrate source columns to validated text/FK-backed provider IDs after dual-write parity. Do not add every future provider as another core enum label.

Minimum normalized fields:

#### `source_order_lines`

`source_order_id`, external line ID, SKU, product/variant references, title, quantity, unit price minor, total minor, currency, cost minor when available.

#### `source_payments` and `source_transactions`

Order/customer link, provider, payment method category, status, amount minor, currency, captured/refunded timestamps, transaction type, parent transaction, provider transaction reference. Do not store full PAN or prohibited payment data.

#### `source_replacements`

Case/order link, requested/issued status, original/replacement line refs, item value minor, shipping cost minor, issued timestamp.

#### `source_shipments` and `source_tracking_events`

Fulfilment/order link, tracking number, carrier, service, canonical status, source status, shipped/delivered timestamps; tracking event status, location text, description, event time, source time. Do not invent GPS.

#### `source_returns`

Order/case link, status, requested/received/inspected timestamps, disposition, refund/replacement reference.

#### `source_messages`

Ticket link, external ID, actor type, channel, visibility, summary/body pointer according to retention policy, attachment metadata, source timestamps. Keep `source_ticket_events` for event history; messages are distinct records.

### Mapping files to add

```text
lib/canonical/entities.ts
lib/canonical/money.ts
lib/canonical/statuses.ts
lib/canonical/records.ts
lib/canonical/validation.ts
lib/connectors/mapping/types.ts
lib/connectors/mapping/normalizeValue.ts
lib/connectors/mapping/recordErrors.ts
lib/connectors/providers/shopify/mappings.ts
lib/connectors/providers/gorgias/mappings.ts
lib/connectors/providers/aftership/mappings.ts
lib/connectors/providers/shipbob/mappings.ts
```

### Mapping requirements

Every field mapping declares:

- canonical field;
- source path(s);
- required/optional;
- transformer;
- fallback behavior;
- validation rule;
- error severity;
- whether the raw source attribute may be retained.

All timestamps become ISO UTC. All new money becomes integer minor units plus currency. Preserve provider status in `source_status` and map separately to a canonical status.

Add `ingestion_field_errors` with merchant, ingestion event, source record, field, code, severity, raw-value hash, message, and resolution status. Never log raw secrets or unnecessary PII.

### Provider mapping work

- Extract Shopify record-to-table logic from `lib/shopify/ingest.ts` into mapping functions, leaving the existing module as orchestration compatibility.
- Extract helpdesk normalization outputs from `lib/support/intake/normalizeTicket.ts` into canonical ticket/message records. Keep its existing provider parsing functions.
- Convert AfterShip output to `source_shipments`/`source_tracking_events`; evidence is projected from those records rather than being the only persisted result.
- Convert ShipBob output to fulfilment/shipment/return canonical records; evidence is a projection.
- When a child record arrives before its parent (for example a refund before its order), retain it as pending reconciliation and retry after the parent arrives. Do not acknowledge success while discarding it, as current Shopify/WooCommerce/BigCommerce early-return paths can do.

### Tests

For every fixture in Phase 0, snapshot the normalized record and source registry row. Add cases for:

- missing optional fields;
- invalid currency;
- timestamp with offset;
- provider-native unknown status;
- same external ID in two different source accounts;
- replayed payload with a new connector version;
- forbidden/sensitive raw fields removed.

### Gate

- The same canonical order fixture can be produced by Shopify and by canonical API input.
- Evidence generation reads canonical records, not raw provider payloads.
- Provider-specific statuses and metadata remain inspectable through provenance.
- Invalid required fields create a visible ingestion error and do not create a partial canonical entity.

---

## 7. Phase 4 — Generic webhook, canonical API, CSV import, and manual case creation

### Goal

Make Unauth usable when Shopify or Gorgias is absent, without pretending these generic routes are full connectors.

### 7.1 Canonical webhook intake

Add:

```text
app/api/v1/ingest/events/route.ts
lib/api/v1/ingest/auth.ts
lib/api/v1/ingest/eventSchema.ts
lib/api/v1/ingest/acceptEvent.ts
tests/api/canonicalEventIngest.test.ts
```

Authenticate with existing merchant API keys (`validateApiKey`) or a dedicated per-connection webhook secret. Do **not** accept a caller-supplied `merchant_id` as authority. Derive the merchant from the credential.

Verify signatures against the raw request bytes before trusting JSON. Enforce a body-size limit, timestamp tolerance, replay protection, and a stable rate-limit key derived from the resolved connection—not an unauthenticated header or query parameter.

Request envelope:

```json
{
  "id": "merchant-event-123",
  "type": "order.created",
  "occurred_at": "2026-07-11T10:00:00Z",
  "source": {
    "system": "custom_oms",
    "account_id": "uk-store",
    "record_id": "ORDER-1001",
    "record_url": "https://merchant.example/orders/ORDER-1001"
  },
  "data": {},
  "schema_version": 1
}
```

Supported event types in MVP+:

- `customer.created`, `customer.updated`
- `order.created`, `order.updated`
- `refund.created`, `refund.updated`
- `replacement.created`, `replacement.updated`
- `ticket.created`, `ticket.updated`
- `message.created`
- `shipment.created`, `shipment.updated`, `shipment.delivered`, `shipment.exception_recorded`
- `tracking_event.recorded`
- `return.created`, `return.updated`
- `dispute.created`, `dispute.updated`
- `evidence.created`
- `loss.confirmed`
- `recovery.created`, `recovery.completed`

Validate `data` with a discriminated Zod schema per event type. Return `202 Accepted` with `ingestion_event_id`, `duplicate`, and a status URL. The route only validates and enqueues; it does not synchronously execute case/rule/recovery logic.

Idempotency key: `(merchant_id, source system/account, event id)`. If the same ID arrives with a different payload hash, reject with `409 idempotency_payload_conflict` and create an integration-health issue.

### 7.2 Canonical entity API

Add API-key authenticated upsert endpoints:

```text
app/api/v1/ingest/customers/route.ts
app/api/v1/ingest/orders/route.ts
app/api/v1/ingest/cases/route.ts
app/api/v1/ingest/evidence/route.ts
app/api/v1/ingest/losses/route.ts
app/api/v1/ingest/recoveries/route.ts
lib/api/v1/ingest/entitySchemas.ts
lib/api/v1/ingest/upsertEntity.ts
```

Use `POST` for create/upsert by external ID and `PATCH` for a known Unauth UUID. Require `Idempotency-Key` for writes. Responses include the Unauth ID, source-record ID, created/updated result, and emitted domain event IDs.

Do not repurpose current endpoints whose contracts mean something else:

- existing `GET /api/v1/customers` is a lookup;
- existing `POST /api/v1/evidence` creates a dispute evidence package.

Keep the new write contract under `/api/v1/ingest/*` to avoid a breaking collision.

### 7.3 Canonical CSV import

This is a new importer. It must never import or depend on legacy fraud scoring code.

Add:

```text
app/(app)/integrations/imports/page.tsx
components/imports/CanonicalCsvImportClient.tsx
components/imports/FieldMappingStep.tsx
components/imports/ImportValidationResults.tsx
app/api/imports/csv/prepare/route.ts
app/api/imports/csv/validate/route.ts
app/api/imports/csv/commit/route.ts
app/api/imports/[jobId]/route.ts
lib/imports/csv/fileValidation.ts
lib/imports/csv/entitySchemas.ts
lib/imports/csv/mapping.ts
lib/imports/csv/processor.ts
lib/imports/csv/errorReport.ts
tests/api/canonicalCsvImport.test.ts
tests/lib/canonicalCsvMapping.test.ts
```

Supported datasets:

- orders and order lines;
- refunds;
- customers;
- historic payout cases;
- loss records;
- recovery records.

Workflow:

1. upload to a private `canonical-imports` bucket;
2. detect entity type or require selection;
3. map headers to canonical fields;
4. preview the first rows;
5. validate every row and show required/optional errors;
6. commit as a `sync_jobs.job_kind = csv_import` job;
7. process in chunks through the same canonical persistence and domain-event path as connectors;
8. offer a row-level error CSV;
9. delete the source file according to retention settings.

Security and correctness:

- enforce content type, extension, magic bytes, maximum size/rows, formula-injection handling, and safe UTF-8 parsing;
- never trust a client-provided column map without server validation;
- deduplicate through `(merchant, import source account, entity type, external ID)`;
- do not emit domain events for invalid rows;
- allow partial job success but make failed rows visible;
- imported records show `CSV import` provenance, import name, job ID, and freshness `unknown` unless a later import supersedes them.

Reuse safe CSV parsing/validation utilities only where they are independent of the deleted fraud worker. Do not restore removed routes or old processing jobs.

### 7.4 Manual case creation

Add a prominent `Create case` action to Payout Control and the command palette.

Add:

```text
components/cases/CreateCaseDialog.tsx
lib/cases/createManualCase.ts
tests/api/manualCaseCreation.test.ts
```

Edit:

- `app/api/claims/route.ts`
- `lib/claims/store.ts`
- `app/(app)/claims/ClaimsPageView.tsx`
- `components/layout/CommandPalette.tsx`

Inputs:

- order reference (optional if no source is connected);
- customer name/email or existing customer;
- issue type;
- requested action;
- payout exposure amount and currency;
- evidence upload;
- source URL;
- attribution and recoverability, defaulting to unknown;
- owner;
- internal note.

If an order reference resolves to exactly one record, create a confirmed relationship. If it resolves to multiple candidates, create an ambiguous match and leave the case unanchored until resolved. If it resolves to none, retain `manual_reference` visibly; do not create a fake Shopify order.

### Gate

- A merchant with no Shopify/Gorgias connection can create and work a complete manual case.
- The same order sent through canonical webhook, API upsert, or CSV produces the same normalized entity shape.
- Duplicate webhook/API/CSV rows do not duplicate canonical records or domain events.
- CSV failures are row-specific and recoverable; valid rows are not rolled back because another row is invalid.
- Generic input never triggers automatic external write-back.

---

## 8. Phase 5 — Record matching and related-record graph

### Goal

Make cross-system matching explicit, reviewable, and safe.

### Files to add

```text
lib/relationships/entityTypes.ts
lib/relationships/matchTypes.ts
lib/relationships/candidateStore.ts
lib/relationships/matchOrder.ts
lib/relationships/matchCustomer.ts
lib/relationships/matchShipment.ts
lib/relationships/relationshipStore.ts
lib/relationships/resolveMatch.ts
app/api/matches/route.ts
app/api/matches/[id]/resolve/route.ts
components/relationships/MatchStatusBadge.tsx
components/relationships/AmbiguousMatchResolver.tsx
components/relationships/RelatedRecordsPanel.tsx
tests/lib/recordMatching.test.ts
tests/api/matchResolution.test.ts
```

### Matching rules

Use deterministic identifiers in this priority order:

1. explicit connector-declared link;
2. transaction/refund/fulfilment ID;
3. exact order external ID within the correct source account;
4. exact normalized order number, with source account/category constraints;
5. exact tracking number;
6. exact source customer ID;
7. exact normalized customer email plus a defensible time/order context;
8. other merchant-defined external references.

Email alone must never silently select the newest of multiple plausible orders.

Match statuses:

- `confirmed`: unique strong identifier or user resolution; may update case FK/read projections.
- `probable`: one plausible candidate from weaker evidence; display, but do not execute financial/case side effects that assume the match.
- `ambiguous`: multiple plausible candidates; require user resolution.
- `unmatched`: no candidate; retain source record and surface it in health/work queues.

`record_match_resolutions` is append-only and records selected/rejected candidate(s), prior/new status, reason, resolver, and timestamp. Do not overwrite the original candidate evidence when a user resolves or later reverses a match.

### Existing code to change

- `lib/support/intake/resolveTicketOrderLink.ts`
  - return status, method, confidence, candidate IDs, and reason;
  - remove first-row email fallback;
  - persist candidate/relationship records.
- `lib/support/intake/v2Bridge.ts`
  - update `source_order_id` only for confirmed links;
  - keep the ticket/case valid when unmatched.
- `app/api/gorgias/support-webhook/route.ts`
  - route its “unambiguous email order” helper through the shared matcher.
- `lib/claim-gate/buildEvidence.ts`
  - require confirmed order input or return explicit `ambiguous_order_match`/`order_unmatched` evidence state.
- `lib/support/intake/resolvePayoutCaseIdentity.ts`
  - do not change identity scoring/cluster algorithms;
  - consume only confirmed source-customer/order links when attaching a case.

### Related records API

Add `GET /api/claims/[claimId]/relationships` returning:

```text
entity type, entity id, display reference, relationship type,
match status/method, source system/account, source status/freshness,
last updated, deep link, available action
```

The panel must cover order, customer, ticket, messages, refund, replacement, fulfilment, shipment, tracking events, return, dispute, evidence, rule evaluations, loss, recovery, tasks, decisions, and audit events.

### Gate

- Two orders sharing one email produce an ambiguous candidate set and no automatic case-order FK.
- A unique exact order reference produces a confirmed relationship.
- Manual resolution records resolver and timestamp, emits `relationship.resolved`, and updates dependent projections once.
- The graph never crosses merchant boundaries.
- Every related record shows its source and freshness state.

---

## 9. Phase 6 — Shared case state, unified timeline, and financial integrity

### Goal

Make one case transition update every consumer through domain events and projections.

### Files to add

```text
lib/cases/types.ts
lib/cases/stateMachine.ts
lib/cases/transitionCase.ts
lib/cases/readModel.ts
lib/cases/timeline.ts
lib/cases/relatedRecords.ts
lib/events/handlers/caseProjection.ts
lib/events/handlers/lossProjection.ts
lib/events/handlers/recoveryProjection.ts
lib/events/handlers/financialProjection.ts
lib/events/handlers/customerProjection.ts
lib/events/handlers/notificationProjection.ts
app/api/cron/process-domain-events/route.ts
tests/lib/caseStateMachine.test.ts
tests/lib/caseTimeline.test.ts
tests/lib/crossModuleFinancialIntegrity.test.ts
```

### State ownership

`support_payout_cases.status`, `payout_decision_state`, and `recovery_state` remain separate axes with one transition service. Do not let routes update them directly.

`transitionCase` must:

1. validate current version and allowed transition;
2. write the case patch with optimistic concurrency (`state_version`);
3. record actor, reason, and source;
4. append the `domain_events` row;
5. preserve a compatibility `claim_events` row during migration;
6. return the new read model/version.

Move all direct mutations from:

- `app/api/claims/[claimId]/status/route.ts`
- `app/api/claims/[claimId]/assignment/route.ts`
- `app/api/claims/[claimId]/outcome/route.ts`
- `app/api/claims/[claimId]/reopen/route.ts`
- `app/api/claims/[claimId]/reverse/route.ts`
- `app/api/claims/[claimId]/snooze/route.ts`
- `lib/claim-gate/createOrUpdateClaim.ts`
- `lib/support/intake/v2Bridge.ts`
- Shopify refund/dispute retrospective-case paths

through the service or an equivalent transactional RPC.

### Reads must be side-effect free

Opening the current case workbench can trigger a POST/evaluation on mount through `lib/claims/workflowClient.ts`, `components/claims/claimReviewState.ts`, and `lib/claims/decision/evaluate.ts`; that path may sync provider evidence, change status/recommendation, and write audit rows. Split this behavior:

- `GET` case/read-model requests must never mutate case, evidence, financial, or provider state and require only view permission;
- an explicit `POST /api/claims/[claimId]/evaluate` (or a domain-event handler) requests re-evaluation with write permission, idempotency, progress, and audit;
- connector sync is its own requested job/event, not an implicit side effect of viewing;
- UI shows when the read model is stale and offers an explicit refresh/re-evaluate action.

Add an E2E/API test asserting that loading a case twice creates no rows, changes no timestamps/statuses, and performs no external fetch.

### Required event reactions

When a decision is recorded:

- the case leaves the decision queue when appropriate;
- a financial `approved`/`paid` entry is appended;
- confirmed loss is created only when value actually left or liability is confirmed;
- a recovery record is created only when recoverability rules allow it;
- customer history projection updates;
- dashboard/report summaries update from financial projections;
- tasks/notifications route to the responsible owner;
- timeline/audit records the transition.

All handlers must be idempotent using `(domain_event_id, handler_name)` delivery rows.

### Retrospective refund path

On `refund.created`:

1. match the refund to an order;
2. locate an existing relevant payout case;
3. if none exists, create a retrospective case with origin `connector`/`api`/`csv_import`;
4. link ticket/shipment/customer evidence when confirmed;
5. evaluate policy/duplication/recovery facts;
6. append `paid` and, when applicable, `confirmed_loss` financial entries;
7. create loss/recovery projections idempotently.

### Unified timeline

`lib/cases/timeline.ts` merges normalized facts into a single stable format:

```ts
type TimelineItem = {
  id: string;
  type: string;
  occurredAt: string;
  recordedAt: string;
  sourceSystem: string;
  sourceAccount?: string;
  actor: { type: string; id?: string; label?: string };
  title: string;
  summary?: string;
  relatedValue?: { amountMinor: number; currency: string };
  relatedEntity?: { type: string; id: string };
  sourceUrl?: string;
  freshness: string;
};
```

Merge source/domain/case/rule/decision/loss/recovery/task events. Sort by `occurredAt`, then `recordedAt`, then ID. Never overwrite provider occurrence time with ingestion time.

### Financial projection migration

Backfill financial entries from:

- `support_payout_cases` amount components;
- `claim_outcomes.amount_refunded/amount_recovered`;
- `recovery_cases` merchant/recoverable/recovered amounts;
- `loss_cases` minor-unit values;
- `loss_sources` money values.

Produce a discrepancy report by case/currency. Do not switch dashboard reads until unresolved discrepancies are zero or explicitly waived.

Characterize and replace the current reporting behavior explicitly:

- `claim_outcomes` has amounts but no currency of its own;
- Reports selects a dominant currency but several helpers sum all rows before labelling the result;
- recovery period inclusion can be based on any update rather than the financial event's effective date;
- some dashboard breakdowns bypass the display-currency filter;
- completing `recovery_tasks` can overwrite `claim_outcomes.amount_recovered` without updating the `recovery_cases` table read by dashboards.

New reports must cohort by financial event `effective_at`, group by original currency, and use ledger summaries. Multiple recoveries accumulate; they never overwrite one scalar outcome amount.

### Gate

- Replaying any domain event leaves projections unchanged.
- Concurrent transitions yield one success and one version conflict, not lost data.
- A decision/refund/recovery update is visible consistently on Overview, Payout Control, Losses, Recovery, Customers, Reports, and timeline after event processing.
- Mixed currencies are never summed as one currency.
- Dashboard/report money reads `case_financial_summaries`, not ad hoc case columns.
- Merely viewing a case is side-effect free.

---

## 10. Phase 7 — Consolidate evidence, losses, recoveries, and tasks

### Goal

Remove competing business stores while preserving history.

### 10.1 Canonical evidence

Evolve `evidence_items` into the canonical evidence record. Because its current shape is restrictive, use an additive migration to add/alter safely rather than dropping it.

Required canonical fields:

```text
id, merchant_id, evidence_type
title, summary, confidence
source_record_id, connection_id, source_system, source_account_id
source_url, source_created_at, source_updated_at
ingested_at, last_synced_at, freshness_state, sync_state
storage_path, content_hash, structured_value jsonb, source_metadata jsonb
created_by, created_at, updated_at
```

Create `evidence_links` with explicit nullable FKs to case/order/ticket/loss/recovery and a check that exactly one target is set per row. One evidence item may have several link rows.

Backfill in this order:

1. `claim_evidence`
2. `integration_evidence_items`
3. current `evidence_items` accountability rows
4. `loss_case_evidence`

Use deterministic migration keys so reruns do not duplicate. Preserve original table/ID in metadata.

Refactor reads/writes:

- `lib/claims/decision/context.ts`
- `lib/claims/decision/ensureEvidence.ts`
- `lib/payouts/assembleEvidencePack.ts`
- `lib/claim-gate/buildEvidence.ts`
- `lib/accountability/store.ts`
- `lib/recoveries/createFromSupportPayoutCase.ts`
- `app/api/claims/[claimId]/evidence/route.ts`
- `app/api/claims/[claimId]/route.ts`
- integration sync/webhook projection handlers

Provider-specific functions such as `mapShopifyOrderToEvidence` may remain adapter helpers, but `assembleEvidencePack` must select evidence related to the case and its confirmed graph—not check `hasConnected('shopify')` or `hasConnected('gorgias')`.

### 10.2 Append-only decisions and outcomes

The current `claim_outcomes` row is unique by case and is upserted, so a later decision overwrites the previous decision record. Add:

- `case_decisions`: append-only merchant decision, action, amount/currency, rule/recommendation snapshot, followed/overridden flag, reason, actor, effective/recorded timestamps, reversal/supersession link, idempotency key;
- `case_outcomes`: append-only operational/financial outcome such as refunded, reshipped, replaced, denied under merchant policy, escalated, evidence requested, recovered, written off, or no action.

Keep `claim_outcomes` as a current-state compatibility projection until all current readers migrate. Decision reversal appends a reversal/superseding decision; it never mutates history. Domain events and the financial ledger derive from the append-only records.

### 10.3 Canonical loss record

Designate `loss_cases` as the canonical `loss record` store.

Add/normalize fields for:

- financial state and linked financial entry IDs;
- attribution and confidence;
- recoverability;
- owner/counterparty;
- confirmed/estimated timestamps;
- prevention-only and written-off outcomes;
- case relationship and source record.

Migrate `loss_sources` classifications into `loss_cases`. If one case has several classifications, store the primary loss record and retain alternate attributions in a child `loss_attribution_candidates` table rather than creating double-counted financial losses.

Stop writing `loss_sources` after parity. Keep a read-only compatibility view for one release if old UI/tests require it.

### 10.4 Canonical recovery record

Keep `recovery_cases` and add `loss_case_id`. Recovery creation requires a canonical loss record unless it is a non-financial prevention/corrective-action route explicitly marked as such.

Recovery completion appends `recovered` financial entries. Rejection/closure does not erase recoverable history; it changes recovery status and may append `written_off` for the remaining value when the merchant records that outcome.

### 10.5 Generic work tasks

Create `work_tasks`:

```text
id, merchant_id, support_payout_case_id, loss_case_id, recovery_case_id
title, description, owner_user_id, owner_role
due_at, priority, status, blocking_reason
completion_outcome, completed_at, completed_by
source, domain_event_id, created_at, updated_at
```

Statuses: `open`, `in_progress`, `blocked`, `completed`, `cancelled`.

Migrate `recovery_tasks`. Update:

- `lib/accountability/store.ts`
- `app/api/recovery-tasks/[id]/complete/route.ts` (keep redirect/compatibility response temporarily)
- recovery board queries
- account deletion and RLS tests

### Gate

- Every case evidence row is visible exactly once after migration.
- Evidence provenance/freshness survives migration.
- Reversing or changing a decision preserves the previous decision, rule snapshot, actor, and financial reversal trail.
- A case cannot double-count one loss because it existed in both `loss_sources` and `loss_cases`.
- Recovery paid value updates the financial ledger once.
- All recovery tasks appear in the generic Work queue with ownership and due dates.
- No new runtime writes target legacy evidence/loss/task tables.

---

## 11. Phase 8 — Connected product UX

### Goal

Make the app feel like one operating environment while preserving the existing visual system.

### 11.1 Navigation

Edit `lib/navigation/appRoutes.ts` and related tests to expose:

1. Overview — `/dashboard`
2. Work — `/work`
3. Payout Control — `/claims`
4. Losses — `/losses`
5. Recovery — `/recoveries`
6. Customers — `/customers`
7. Rules and Flows — `/rules`
8. Reports — `/reports`
9. Integrations — `/integrations`
10. Settings — `/settings`

Change `/integrations` from a redirect to the canonical Integration Centre. Keep `/settings/integrations` as a compatibility redirect. Do not render two hubs.

Add routes/components:

```text
app/(app)/work/page.tsx
app/(app)/losses/page.tsx
app/(app)/integrations/page.tsx (replace redirect)
components/work/WorkQueue.tsx
components/losses/LossLedger.tsx
components/cases/CaseContextDrawer.tsx
components/cases/CaseTimeline.tsx
components/cases/CaseRelatedRecords.tsx
components/sources/SourceBadge.tsx
components/sources/FreshnessIndicator.tsx
```

### 11.2 Work page

Tabs/filters:

- My cases
- Assigned tasks
- Mentions
- Approaching deadlines
- Awaiting approval
- Evidence requests
- Integration failures

The page reads cases/tasks/notifications, not a manually maintained duplicate queue. Clicking any item opens the case context drawer; “Open full case” navigates to the canonical case page.

### 11.3 Payout case page

Refactor `app/api/claims/[claimId]/route.ts` into a read-model assembler and make `ClaimReviewPanel` consume it.

Required sections:

- header with case status, issue, requested action, exposure, customer/order, source badges, freshness;
- recommendation and merchant rule evaluation;
- evidence present/missing with missing reason distinctions;
- related-record panel;
- unified activity timeline;
- financial state summary;
- loss attribution/recoverability;
- recovery record and tasks;
- comments/mentions;
- controlled source actions.

Replace `shopify_order_id`/`gorgias` display assumptions in:

- `components/claims/ClaimReviewContextColumn.tsx`
- `components/claims/claimReviewTypes.ts`
- `components/claims/claimReviewState.ts`
- `components/claims/payout/EvidenceChecklistCard.tsx`
- API compatibility view models.

Compatibility aliases may remain in wire types for old widgets/tests, but no new UI should read them.

Repair the currently orphaned case actions, not just the read model. `components/claims/ClaimReviewActionRail.tsx` renders summary cards while working handlers in `components/claims/claimReviewState.ts` are not reachable; primary CTAs can target sections that are not rendered. The completed case UI must visibly support, subject to permission:

- assign/unassign owner;
- record decision and outcome;
- request/add evidence;
- transition/reopen/snooze a case;
- create/open a recovery record;
- run a controlled connector write-back.

Wire the existing handlers through the new transition/event APIs or replace them; do not leave duplicate local mutation paths. Remove CTAs to nonexistent sections. Add one browser test per action that asserts both the visible result and the emitted event/audit record.

### 11.4 Context drawer

The reusable drawer must work from Payout Control, Work, Losses, Recovery, Customers, Reports, and search. It loads by case ID and shows a compact version of:

- customer/order summary;
- current recommendation and evidence gaps;
- financial exposure/loss/recovery;
- related records;
- source links and freshness;
- current tasks and owner.

It must preserve the originating page's filters and scroll position.

### 11.5 Universal search and commands

Edit:

- `app/api/search/route.ts`
- `components/layout/commandPaletteFetch.ts`
- `components/layout/CommandPaletteResultsList.tsx`
- `components/layout/CommandPaletteInputBar.tsx`
- `lib/navigation/appRoutes.ts`

Search exact/prefix values for case ID, order ID/number, customer name/email, tracking number, ticket ID, transaction/refund ID, recovery/claim reference, product/SKU, and external source reference.

Group results into Cases, Orders, Customers, Tickets, Shipments, and Recoveries. Remove the legacy risk-grade badge from generic search results. Show source badge, status, and last updated.

Enable the multi-entity search path by default after performance and permission tests; do not leave it behind `FLAG_COMMAND_CENTER`.

Fix existing keyboard/result defects during the search refactor: unified order/case results currently render but are omitted from total keyboard item counts, so Enter/arrow selection can collide or skip them. Avoid `ilike` on UUIDs; use validated exact UUID/prefix/reference strategies. Do not swallow search-query failures silently, and give orders a real context/detail target rather than redirecting to an unrelated customer/list page. Cover mouse and keyboard selection for every result group.

Commands:

- Create case
- Find order
- Assign current case
- Open recovery queue
- Connect integration
- Import records
- View sync errors

Commands that mutate state must open a confirmation/dialog; keyboard selection alone must not perform a high-impact action.

### 11.6 Losses and Recovery

Losses page reads canonical `loss_cases` and financial summaries. Required views:

- confirmed loss;
- estimated loss;
- recoverable;
- prevented;
- written off;
- attribution/partner;
- source confidence/freshness.

Recovery board keeps existing columns but restores controlled quick actions through APIs backed by the transition/event service:

- mark evidence complete;
- mark ready;
- mark submitted;
- record chase;
- record approved/rejected/paid;
- close unrecoverable.

Every action requires permission, confirmation where financial state changes, event/audit entry, and idempotency.

Replace the current 405 recovery mutation routes only when these services are ready. Add a canonical `/recoveries/[id]` detail route and make every board/card deep link real. `maybeCreateRecoveryCaseFromSupportPayoutCase` currently has no production caller; either call its refactored event-backed successor or retire it after parity—do not imply “Check route” created a case when it only refreshed evaluation.

### Gate

- Navigation matches the ten target areas and retains redirects for old bookmarks.
- A user can open the same case context from all major modules without losing position.
- Timeline visibly merges at least one commerce event, one helpdesk event, one Unauth decision, one task, and one recovery/financial event.
- Search finds every required identifier and never leaks across merchants.
- No visible copy assumes all orders are Shopify or all tickets are Gorgias.

---

## 12. Phase 9 — Rules and Flows, collaboration, notifications, and controlled write-back

### Goal

Route work around normalized events without turning MVP+ into an unrestricted automation builder.

### 12.1 Keep rules and flows separate

Rules continue to evaluate facts and return a policy recommendation. Flows react to an event/rule result and create tasks/notifications or request a controlled connector action.

Do not add task assignment, webhooks, or notification side effects to `merchant_rules.action`.

Before adding the Flow UI, reconcile the existing routing logic:

- define one ordered case-transition graph; the current status machine allows overly broad non-final transitions;
- move deterministic investigation/routing behavior from `lib/payouts/workflow.ts` into versioned Flow templates so it cannot silently override merchant rules;
- ensure derived next action can advance a genuinely new case through the explicit transition service rather than preserving every existing v2 status unconditionally;
- remove retired/network-only rule fields such as `is_network_flagged` from merchant-selectable fields;
- replace `order_value_usd` with amount + currency semantics;
- make default monetary thresholds currency-aware instead of hard-coded £/USD-like raw numbers;
- expand recommendation vocabulary through a backward-compatible migration from the current approve/manual-review/deny action set; merchant rules still recommend, never execute.

Create:

```text
workflow_definitions
workflow_runs
workflow_step_runs
```

MVP+ workflow definition:

```text
trigger event type
conditions jsonb (validated limited operators)
investigation requirements
recommendation mapping
outputs: create/update case, assign owner, create task, request evidence,
         create recovery route, set deadline, request notification,
         request low-risk connector write-back
active/version/created_by/updated_at
```

No arbitrary code, loops, user-supplied HTTP URLs, secrets, or unrestricted action graphs.

Add:

```text
lib/workflows/types.ts
lib/workflows/validation.ts
lib/workflows/evaluate.ts
lib/workflows/run.ts
lib/events/handlers/workflowHandler.ts
app/api/workflows/route.ts
app/api/workflows/[id]/route.ts
components/rules/FlowsTab.tsx
components/rules/FlowBuilder.tsx
tests/lib/workflowEngine.test.ts
```

Initial triggers/outputs must cover the examples in the source-agnostic spec, but ship templates rather than requiring a complex builder for every combination.

### 12.2 Comments and mentions

Create:

```text
case_comments
comment_mentions
```

Comments can link to a case and optionally evidence, recovery, or rule evaluation. Store body as plain text/controlled rich text; sanitize output. Mentions must resolve to an active merchant member. Creating a mention emits `notification.requested` and adds a Work item. Editing/deleting a comment must preserve an audit event; soft-delete comment content where policy requires.

Add APIs/components:

```text
app/api/claims/[claimId]/comments/route.ts
app/api/comments/[id]/route.ts
components/collaboration/CaseComments.tsx
components/collaboration/MentionPicker.tsx
```

### 12.3 Notification centre

Create `notifications` and `notification_preferences` in the Phase 9 migration.

Notification kinds:

- assignment;
- mention;
- approaching deadline;
- evidence update;
- decision request;
- recovery outcome;
- sync failure;
- daily work summary;
- high-value case alert;
- scheduled report.

Add:

```text
app/(app)/notifications/page.tsx
app/api/notifications/route.ts
app/api/notifications/[id]/read/route.ts
components/notifications/NotificationCentre.tsx
lib/notifications/types.ts
lib/notifications/store.ts
lib/notifications/deliverEmail.ts
lib/events/handlers/notificationDelivery.ts
```

Every notification contains a direct internal target, is merchant/user scoped, and is deduplicated by event + recipient + kind. Email preferences are opt-in/configurable. Slack/Teams remain adapters/templates unless separately authorised; notifications must link users back into Unauth rather than store decisions externally.

### 12.4 Controlled source actions

Create one action service:

```text
lib/connectors/actions/types.ts
lib/connectors/actions/validate.ts
lib/connectors/actions/execute.ts
app/api/connector-actions/preview/route.ts
app/api/connector-actions/execute/route.ts
components/integrations/ConnectorActionConfirmation.tsx
```

Before execution show:

- destination system/account;
- action and affected record;
- capability/runtime availability;
- authorised user;
- expected result;
- whether the operation is reversible.

MVP+ allowed direct actions are low/medium risk only, for example add helpdesk tag, add internal note, update supported ticket status, attach Unauth case reference, assign ticket, or update a safe custom field.

For unsupported actions provide a copyable summary, source deep link, manual-completion checkbox, and recorded outcome.

Continue to forbid automatic refund issuance and autonomous denial. Existing Gorgias write-back in `lib/claim-gate/writeBackToGorgias.ts` must become a connector action implementation, not a direct special case in the core gate.

### Gate

- A rule evaluation has no side effect until a flow consumes its event.
- Replayed workflow events do not duplicate tasks/notifications/actions.
- Every automatic task/notification and every connector action appears in timeline/audit.
- Mentioning a non-member fails.
- A user cannot execute a capability lacking scope, permission, or merchant write-back enablement.
- Refund/deny actions remain unavailable.

---

## 13. Phase 10 — Integration Centre, health, freshness, coverage, and settings

### Goal

Turn Integrations into an operational control centre.

### API/read model

Extend `GET /api/integrations` or add `GET /api/integrations/health` to return per connection:

- provider/category/account;
- declared and runtime capabilities;
- status and last error;
- last sync started/completed/successful;
- data fresh through / freshness state;
- webhook status and last event;
- imported record counts by canonical type;
- active sync/ingestion errors;
- unmatched/ambiguous counts;
- reconnect/resync actions.

Add `integration_health_issues` or a derived query over ingestion/match/sync failures with stable issue codes and affected record links.

### UI refactor

Split the 1,900-line `components/integrations/IntegrationHubClient.tsx` into focused components:

```text
components/integrations/IntegrationCentre.tsx
components/integrations/ConnectionCard.tsx
components/integrations/CapabilityTable.tsx
components/integrations/CoverageTable.tsx
components/integrations/IntegrationHealthIssues.tsx
components/integrations/ConnectionSyncHistory.tsx
components/integrations/ConnectionDialogs.tsx
```

Remove existing `// eslint-disable-next-line react-hooks/exhaustive-deps` while refactoring. Use stable callbacks/dependency arrays.

Connection cards must show:

- system/category/account;
- connected/degraded/error status;
- capabilities;
- last successful sync;
- record count;
- freshness;
- active errors;
- manage/reconnect/sync action.

Preserve useful provider-specific setup details, but make the central card truthful. Today per-provider helpdesk pages expose some sync/webhook details while the central card ignores `lastSyncAt` and capabilities. Also remove two false assumptions from the current Hub: a merchant may have multiple payment processors/accounts, and UPS/FedEx/AfterShip must not claim GPS proof (`docs/product/INTEGRATION_COVERAGE.md` explicitly says standard APIs do not expose delivery GPS).

### Coverage view

Coverage is per category, not per logo. Required categories:

- orders;
- support tickets;
- payments/disputes;
- tracking/delivery proof;
- warehouse/fulfilment;
- returns;
- product cost;
- policies/agreements;
- notifications.

Status: `complete`, `partial`, `missing`, `not_applicable`, `error`, `stale`.

Calculate coverage from capabilities, record counts/freshness, applicability, and errors. Do not mark a category complete because credentials merely exist.

### Freshness display

Create one shared freshness helper and component. Case/evidence/integration panels must distinguish:

- source does not support the field;
- merchant permission is missing;
- record does not exist;
- sync failed;
- record is pending;
- source is stale;
- source was attempted but returned unavailable.

### Platform settings

Add validated merchant setting accessors under `lib/settings/` for:

- reporting currency, timezone, date range, source priority, retention;
- customer/record matching policy;
- cost basis, shipping/payment/replacement assumptions, loss/recovery methods;
- default owners, escalation thresholds, deadlines, approval limits, notification preferences;
- refund/replacement/return/high-value/repeat-case policy;
- connection permissions, sync frequency, write-back permissions, webhook health.

Do not read arbitrary `merchants.settings` keys across components. Centralize Zod parsing and defaults.

The current Settings surface does not implement these controls; it mainly covers Account, Billing, Team, Integrations, Agreements, Data & privacy, and Audit. Add real UI/API controls rather than copy that says retention “follows settings” when no retention setting exists. Update stale hidden-route/compliance tests to match the actual visible Settings tabs before adding new assertions.

### Gate

- A disconnected, stale, permission-limited, and failed connector render differently.
- Clicking a health issue opens affected records.
- Coverage percentages are reproducible from documented category rules.
- Every case source badge can open the source record when link capability is available.
- Stale data is never presented as current.

---

## 14. Phase 11 — Cutover, deprecation, and production hardening

### Goal

Remove compatibility paths only after measured parity.

### Required parity reports

Create scripts under `scripts/source-agnostic/`:

```text
report-connection-parity.ts
report-source-registry-coverage.ts
report-evidence-parity.ts
report-loss-parity.ts
report-financial-parity.ts
report-event-delivery-health.ts
```

Reports must be merchant-scoped and output counts/differences without dumping PII.

Required thresholds before cutover:

- connections: every active old row maps to one canonical connection/account;
- source registry: 100% of active canonical records have registry provenance, except documented manual legacy rows;
- evidence: no orphaned case evidence and no duplicate logical item;
- loss/recovery: no double-counted loss/recovery value;
- finance: zero unexplained case/currency discrepancies;
- events: no dead-letter item without an explicit issue/owner.

### Read/write cutover order

1. enable canonical dual-writes;
2. backfill and run parity reports;
3. switch read models behind `SOURCE_AGNOSTIC_READS`;
4. run integration/merchant-isolation/E2E suites;
5. enable reads for internal/demo merchant;
6. expand to pilot merchants;
7. stop legacy writes;
8. observe one release;
9. remove legacy reads;
10. only then create a separate destructive migration for obsolete tables/columns.

Add env flags to `lib/utils/env.ts` and test their defaults. Defaults must preserve the current production path until the relevant migration/backfill is complete.

### Dead-letter and retry operations

Provide internal/admin-safe views or scripts to:

- inspect failed ingestion events without exposing unnecessary raw payloads;
- retry one event or all events for a connection;
- mark a poison event ignored with reason/actor;
- replay a domain event handler from its checkpoint;
- observe rate limiting and retry-after behavior.

### Security review

Verify:

- webhook signature/secret validation happens before JSON trust or merchant resolution;
- merchant is derived from credential/connection, never body/query parameter alone;
- a failed/missing merchant credential lookup never falls back to a global provider credential in production (`lib/integrations/getProviderCredential.ts` must fail closed per connection);
- raw payload retention and logs meet data-minimization policy;
- external URLs are sanitized/allowlisted where fetched;
- connector credentials remain encrypted and server-only;
- encrypted credentials support key version/rotation metadata and bind merchant/connection/provider as authenticated encryption context;
- document uploads enforce size, magic bytes, strict MIME allowlist, private storage, and malware-scan/quarantine state before parsing;
- API/CSV/webhook rate limits are merchant-aware;
- idempotency conflicts cannot overwrite previous payloads;
- connector actions re-check user permission at execution time;
- GDPR deletion covers new tables, storage, raw events, and derived projections;
- audit/domain/financial history follows the approved retention/deletion policy.

Tracked `scripts/v2-tests/*.sh` (11 files) contain a hard-coded database connection string plus `PGPASSWORD`. Do not print or copy it. **Status verified 2026-07-11: the credential is dead** — a live `SELECT 1` against the pooler failed with `password authentication failed`, consistent with the rotation recorded in `docs/product/CODEX_HANDOFF.md` §1. Remaining hygiene (not an active exposure): remove the credential from tracked files, switch the scripts to validated environment-only configuration, and secret-scan the repo. History rewriting is a separate destructive owner-approved operation; do not perform it implicitly.

### Performance review

Add indexes for common merchant-scoped queries:

- source external lookup;
- case timeline by case/occurred time;
- relationship neighbors;
- unresolved match candidates;
- work tasks by owner/status/due;
- unread notifications by recipient;
- financial summaries by case/date;
- integration issues by connection/status;
- event deliveries by handler/status/next attempt.

Use pagination/cursors for timelines, search, tasks, notifications, and health issues. Avoid loading every case or every source record into memory.

### Final gate

- Source-agnostic reads are on for pilots with no parity discrepancies.
- Shopify/Gorgias/AfterShip/ShipBob smoke tests pass through the connector/event path.
- Canonical API, webhook, CSV, and manual scenarios pass.
- Zendesk replacement scenario proves the case workflow works without Gorgias.
- A custom/canonical order scenario proves the case workflow works without Shopify.
- Event retry/dead-letter, stale-source, ambiguous-match, mixed-currency, and merchant-isolation tests pass.

---

## 15. Required end-to-end acceptance scenarios

### Scenario A — Shopify + Gorgias launch stack

1. Shopify order/refund and Gorgias ticket enter through their adapters.
2. Records normalize and register provenance.
3. Exact order reference confirms relationships.
4. Case contains order, ticket, message, shipment, evidence, source links, and freshness.
5. Rule recommends an action.
6. Merchant records decision.
7. Loss/recovery/financial/task/timeline projections update once.

### Scenario B — Shopify + Zendesk

Repeat Scenario A with Zendesk. No Gorgias default, copy, ID, or write-back path may be required.

### Scenario C — Custom OMS + canonical webhook + manual support case

1. Order/customer/shipment arrive through canonical webhook.
2. User creates a case manually with the external order reference.
3. Exact source registry match connects the order.
4. The same evidence/rules/decision/loss/recovery workflow works without Shopify or a helpdesk connector.

### Scenario D — Ambiguous identity/order match

1. Two recent orders share one email.
2. Ticket has no order reference.
3. Both appear as candidates; no order is silently linked.
4. User selects one.
5. Resolution is audited and downstream handlers run once.

### Scenario E — Retrospective refund

1. A refund event arrives with no existing case.
2. Unauth creates a retrospective case.
3. It attaches confirmed surrounding records.
4. It records paid/confirmed-loss financial states.
5. It creates a recovery only when evidence/rules identify a viable route.

### Scenario F — Carrier recovery

1. Shipment exception/refund creates or updates a case.
2. Required/missing evidence is explicit.
3. Recovery task/deadline is assigned.
4. Submission/chase/outcome events update the recovery board.
5. Recovery payment updates case, loss, reports, customer history, ROI, and timeline from one financial event.

### Scenario G — Warehouse/3PL error

ShipBob or canonical warehouse events link fulfilment/pick-pack evidence, support a cautious warehouse attribution, create corrective/recovery work, and appear in partner reporting.

### Scenario H — Chargeback context

A dispute links order, fulfilment, ticket, refund, replacement, and support promise context. Unauth tracks exposure/outcome but does not pretend to replace a chargeback platform.

### Scenario I — Missing/stale source

One source is degraded or stale. The case explicitly identifies which facts are stale/unavailable and why; rules requiring those facts produce manual review/needs evidence rather than assuming false/current values.

### Scenario J — Merchant isolation

Two merchants use identical external IDs, emails, tracking numbers, and idempotency keys. Their records, matches, events, tasks, notifications, search results, and financial summaries remain isolated.

---

## 16. Spec-to-phase traceability

| Requirement section | Delivered in |
|---|---|
| 1-2 Foundational correction / stack independence | Phases 0, 2, 4 |
| 3 Canonical data model | Phases 1, 3, 7 |
| 4 Preserve source data/provenance | Phases 1, 3, 8, 10 |
| 5 Capability model | Phases 2, 10 |
| 6 Minimum connector framework | Phases 2, 4 |
| 7 Field mapping | Phase 3 |
| 8 Identity/record matching | Phase 5 |
| 9 Shared case/graph/timeline/context | Phases 5, 6, 8 |
| 10 Search/commands | Phase 8 |
| 11 Workflows/automation | Phase 9 |
| 12 Core merchant flows | Phases 6-9 and acceptance scenarios |
| 13 Collaboration | Phase 9 |
| 14 Notifications | Phase 9 |
| 15 Write-back/actions | Phases 2, 9 |
| 16 Integration Centre | Phase 10 |
| 17 Sync/freshness | Phases 1, 2, 10 |
| 18 Menus / Work | Phase 8 |
| 19 Rules vs flows | Phase 9 |
| 20 Financial integrity | Phases 1, 6, 7 |
| 21 Settings | Phase 10 |
| 22 MVP+ boundaries | Phase 0 and all phased gates |
| 23 Engineering requirements | Phases 1-3, 11 |
| 24 No hardcoding | Phases 2, 3, 5, 8 |
| 25 Merchant acceptance test | §15 and final definition of done |
| 26 Final architecture | Entire plan |

---

## 17. Test and verification matrix

### Per-phase commands

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
npm run gen:supabase-types
```

Run focused suites before the full suite. Keep the exact test count updated in the implementation handoff response; do not hard-code the historical 1596 count as the future expected count because this work adds tests.

### Required focused suites by area

- Connector contract/normalization/idempotency tests.
- Shopify OAuth/webhook/backfill tests.
- Gorgias connection/webhook/widget tests.
- Zendesk/Freshdesk normalization and webhook tests.
- Integration route and Hub tests.
- Canonical API/webhook/CSV/manual intake tests.
- Record matching and ambiguous-resolution tests.
- Case state machine/event replay tests.
- Evidence/loss/recovery/financial parity tests.
- Search/command/context-drawer tests.
- Workflow/task/comment/mention/notification tests.
- Account deletion, route security, RLS, scoped client, and merchant-isolation tests.

### Browser smoke

At minimum:

1. Overview metrics load from financial summaries.
2. Work filters and context drawer work.
3. Payout Control queue/detail/manual creation work.
4. Losses and Recovery reflect the same case values.
5. Customers show related cases and source provenance.
6. Rules and Flows remain distinct.
7. Search finds every entity group.
8. Integration Centre shows capability/coverage/health/freshness.
9. Notification/mention deep links open the correct case.
10. Existing Gorgias widget remains the compressed decision card.

---

## 18. Explicit non-goals for this implementation

- Building every named commerce/helpdesk/WMS/returns/payment connector.
- Public connector SDK or merchant-authored code execution.
- No-code arbitrary field-mapping UI; code-based mappings and internal tables are enough now.
- Automatic carrier claim submission.
- Automatic refund issuance or autonomous denial.
- AI contract extraction.
- Replacing the legacy identity-resolution/scoring engine.
- Cross-merchant data sharing or network claims.
- Full accounting/general-ledger reconciliation.
- Slack/Teams as an alternative system of record.

The architecture must permit these later where appropriate, but the implementer must not expand scope to build them now.

---

## 19. Definition of done

The work is complete only when all statements are true:

- Shopify and Gorgias run through connector adapters and normalized domain events.
- A Zendesk/custom-source case completes the same core workflow without provider-specific fallbacks.
- Canonical webhook, API, CSV, and manual intake are production-safe and idempotent.
- Every imported record has source/account/external-ID/provenance/freshness traceability.
- Ambiguous matches are visible and never silently merged.
- One case transition updates every relevant module through idempotent projections.
- Evidence, loss, recovery, task, and financial stores each have one canonical writer.
- Search, timeline, related records, context drawer, Work, Losses, notifications, and Integration Centre meet the requirements above.
- Rules recommend; Flows route; neither performs unauthorised high-risk actions.
- Stale, unsupported, permission-missing, absent, pending, and failed data states are distinct.
- Merchant isolation, RLS, API authentication, webhook verification, GDPR deletion, retry/dead-letter, and mixed-currency tests pass.
- Typecheck, lint, Jest, and browser smoke tests are green.
- Compatibility paths are removed only after backfill/parity/canary verification.

Merchant acceptance statement:

> We use Shopify and Gorgias today, but if we move to Zendesk or add another storefront, Unauth does not stop working. When something changes in one system, the relevant case updates everywhere. We can see where every fact came from, what is missing or stale, who owns the work, and what financial outcome followed.

---

## 20. Implementer completion response

After each phase, return:

1. phase completed;
2. files added/changed;
3. migrations/RPCs added and whether applied;
4. compatibility/backfill behavior;
5. tests run with exact results;
6. parity report results;
7. remaining flags or rollout steps;
8. known risks/blockers;
9. confirmation that no scoring/matching calibration, automatic payout decisioning, `as any`/`as never`, or ESLint disable was introduced.

If a provider API contract, production schema, or migration result contradicts this plan, stop at the current phase gate and report the evidence. Do not silently improvise a new architecture.

---

## 21. Appendix — Verified residual hardcoding and defect inventory (audited 2026-07-11)

Every item below was verified against `codex/refocus-claim-gate-map` at `1950bf64` by a line-level sweep. Line numbers may drift slightly; the identifier names will not. Fix each item **in the phase listed**, as part of that phase's normal work. When you fix one, search for the named identifier repo-wide — several are shuttled through multiple files.

### 21.1 Misnamed provider fields on generic data (DTO/type renames — Phase 8 §11.3, with API compatibility aliases)

These fields are populated from generic `external_id`/`order_number` values but are **named** as Shopify/Gorgias fields. Rename to `{ source_system, external_order_id }` / `order_ref` shapes; keep old wire-field names only as deprecated aliases on API responses.

| Location | Defect |
|---|---|
| `app/(app)/claims/claimsPageData.ts:53` | DTO field `shopify_order_id` filled from generic order refs (`page.tsx:272`) |
| `app/api/claims/route.ts:176,229,272` + `lib/claims/store.ts:115,155,255` | create/read contract keyed on `shopify_order_id`; resolves internally to the generic `source_order_id` FK |
| `components/claims/claimReviewTypes.ts:117`, `claimReviewState.ts:381-404` | `claimShopifyOrderId` computed by branching on `claimOrderSource === 'shopify'` |
| `app/(app)/customers/[id]/customerProfilePageLoad.ts:105,640` and `:124,249,679` | read model exposes `shopify_order_id` (from `external_id`) and `gorgiasTicketId` (from generic ticket id) |
| `lib/support/intake/linkSupportCase.ts` (throughout), `ingestSupportCase.ts:315,433`, `supportCaseReadModel.ts:14,125,246,264`, `commerceOrderLookup.ts`, `v2Bridge.ts:53,121`, `commerceSignals.ts` | the whole intake link/read model shuttles a `shopify_order_id` field; consolidate on `order_ref` once §21.2 columns are handled |
| `lib/claim-gate/types.ts:33` | gate request field `gorgias_domain` → generic helpdesk account field |
| `lib/claims/decision/types.ts:105` | `ClaimDecisionEvaluationSource = 'gorgias_widget' \| …` → add `helpdesk_widget`; keep the old literal accepted for stored rows |
| App-layer detection method `'shopify_dispute'` (`lib/support/intake/tagClaimDetection.ts:3`, `lib/support/intake/store.ts:197`, `lib/claims/store.ts:36,88`, `v2Bridge.ts:234`) | DB enum is already the generic `platform_dispute`; rename the app-layer value to match |

### 21.2 Legacy provider columns/tables still referenced (Phase 2 backfill + Phase 11 cutover)

Verify against the live schema (Phase 0 reconciliation) before dropping anything.

- `support_case_intake.shopify_order_id` and `.shop_domain` (generated types `lib/supabase/types.ts:3948-3949`) — legacy intake table columns feeding §21.1's shuttle. Fold into `order_ref` + connection-derived domain.
- `merchants.shopify_collector_init_script_tag_id`, `merchants.shopify_collector_script_tag_id`, `merchants.bigcommerce_script_uuid` (`types.ts:2453,2460-2461`) — provider install IDs on the core merchants table → move to connection metadata during the Phase 2 connection backfill.
- **Legacy v1 `shopify_connections` still read by 4 files** (verified): `lib/customers/commerceOrders.ts`, `lib/shopify/profileLinking.ts`, `lib/supabase/getMerchantDataPresence.ts`, `lib/gorgias/widgetData.ts`. Legacy `gorgias_connections` still read by `lib/support/gorgias/resolveConnection.ts`. The Phase 2 connection backfill must repoint these reads to the canonical connection model, or they will silently diverge after cutover.
- `lib/integrations/paymentProcessorInference.ts:61-78` — falls back to the dropped v1 `shopify_order_signals` table; remove the dead fallback.
- `lib/identity/writeIdentifierGraph.ts` and `app/api/checkout-signals/ingest/route.ts` still write the superseded Gen-4 pair `identity_identifiers`/`identifier_co_occurrence_edges`. Retire these writes at Phase 11 cutover. This is plumbing removal only — no scoring/weight/threshold change.

### 21.3 Provider-defaulting services not yet listed in Phase 7 (add to the Phase 7 refactor list)

- `lib/losses/evidenceRequirements.ts:213-397` — `SOURCE_PLAN` hardcodes `likelySourceProvider: 'shopify' | 'gorgias' | 'shopify_payments'` per evidence category. Must resolve the provider from the merchant's **connected** connector for each category (commerce/helpdesk/payments/tracking).
- `lib/accountability/store.ts:19,29,40` — evidence rows hardcode `source_system: 'GORGIAS'`/`'SHOPIFY'` regardless of the record's actual source. Derive from `order.source` / `ticket.provider`.
- `lib/customers/commerceOrders.ts:7,22-31,71,95` — `countShopifyCommerceOrdersForProfile` filters `.eq('source','shopify')`; WooCommerce/BigCommerce/CSV orders are invisible in customer profiles. Count across all commerce sources.
- `lib/rules/widgetSignals.ts:4,13` — the rules signal adapter imports its input type from `@/lib/gorgias/widgetData`. Define a neutral signal-input type; the Gorgias module implements it.
- `lib/claims/decision/claimLikeness.ts:19,30` and `lib/support/intake/tagClaimDetection.ts:221` — provider tag-config fallback is always `DEFAULT_TAG_CONFIGS.gorgias`. Fall back per the ticket's actual provider.
- `app/api/customers/[id]/shopify-orders/route.ts` — route path, `.eq('source','shopify')` filter (`:63`), and Shopify status vocab (`:78-79`). Rename to a commerce-orders route (redirect the old path), include all sources, map to canonical status.

### 21.4 Status-literal comparisons and one latent enum bug (Phase 3, `lib/canonical/statuses.ts`)

Route all order/fulfilment status checks through canonical helpers; do not compare enum literals inline.

- `lib/evidence/buildPackage.ts:266,306` — `financial_status === 'refunded'`; **`:292,308` fall back to `'completed'`, which is not a valid `fulfillment_state` enum value** (latent bug — fix while migrating).
- `lib/claims/decision/deliveryEvidence.ts:25-32`, `lib/claims/decision/context.ts:212-213`, `lib/claim-gate/buildEvidence.ts:54` — same pattern.
- Decision (already implicit in Phase 3, stated here explicitly): keep the existing `order_financial_status`/`fulfillment_state` enum **values** as the canonical commerce vocabulary (WooCommerce/BigCommerce adapters already map into them); do not rename DB enums. The change is that comparisons go through helpers and provider-native strings are preserved separately as `source_status`.

### 21.5 Currency defects (Phase 1 ledger work + Phase 6 reads)

- Split hardcoded defaults — `'USD'`: `lib/utils/format.ts:2,133,137,150`, `components/charts/chartFormatters.ts:9,32`, `lib/email/templates.ts:31`, `lib/evidence/pdfDocumentView.tsx:109`, `app/(app)/reports/reportsPageUtils.ts:235,258`. `'GBP'`: `lib/claim-gate/buildEvidence.ts:21,508`, `app/api/catches/route.ts:38`. Replace with one shared resolver that always threads the record's own currency.
- **Verified display bug**: `components/billing/BillingSettingsClient.tsx:122,246` renders `$${priceGbp}` — GBP amounts shown with a dollar glyph. Fix with the merchant/plan currency formatter.
- `lib/rules/payoutDefaults.ts:74,80` — default rule descriptions hardcode "£100"/"£25"; make threshold copy currency-aware (ties into the Phase 9 `order_value_usd` replacement).
- Schema note: `identity_catch_events.estimated_exposure_currency` defaults to `'GBP'` while `recovery_cases.currency` defaults to `'USD'`. New financial entries make both irrelevant; do not retrofit the identity table (scoring-adjacent, frozen).

### 21.6 Hardcoded provider copy on core screens (Phase 8)

Replace with connection-derived labels (name the merchant's actual connected commerce/helpdesk provider, or say "commerce source"/"helpdesk"):

- `app/(app)/customers/customersOverviewPageUtils.ts:19` — "Customer history from Shopify orders."
- `app/(app)/dashboard/dashboardPageUtils.ts:61-63,194` + `dashboard/page.tsx:53` — "Shopify orders are syncing. Connect Gorgias…" plus `shopify_only_*` setup-state keys.
- `app/(app)/reports/ReportsPageView.tsx:29` + `reportsPageUtils.ts:26` — "Shopify order data…".
- `components/claims/payout/EvidenceChecklistCard.tsx:38,112` and the service string it renders, `lib/payouts/evidenceChecklist.ts:84` — "No tracking number on Shopify order."
- `app/(app)/customers/[id]/CustomerProfilePageHero.tsx:98-99` — Gorgias-named ticket field in the hero.
- Onboarding/empty-state heroes (`components/EmptyDashboardHero.tsx`, `PartialSetupHero.tsx`, `OnboardingClient.tsx`) may keep naming the launch connectors — that is accurate setup guidance, not a leak — but must not claim they are the only possible sources.

### 21.7 Verified behavior facts to rely on (do not re-derive)

- The dashboard exposure metrics **silently zero** when a case status value falls outside the expected set — the maintainer comment at `lib/dashboard/payoutDashboardMetrics.ts:47` records a prior production-class incident. When Phase 6 repoints reads to financial summaries, add an explicit unknown-status guard/telemetry instead of silent exclusion.
- `claim_detection_method` already reserves unused values `platform_refund`/`woocommerce_refund`/`bigcommerce_refund` (`lib/claims/store.ts:28-39`). Use `platform_refund` for Phase 6 retrospective refund cases; no enum migration needed for the Shopify path.
- `components/customers/CustomerIntelligenceDrawer.tsx` (+8 sub-files) is fully orphaned — no importers. Evaluate it as the starting point for the Phase 8 case context drawer or delete it in the same change; do not leave it orphaned.
- Accountability `recovery_tasks` are currently created only on the `/api/claim-gate/check` path and surfaced only through the widget response (`app/api/claim-gate/check/route.ts:122`); no in-app UI reads them. The Phase 7 `work_tasks` migration is therefore low-risk for the app UI but must preserve the widget contract.
- The claims queue's generic source labels (`sourceSystemLabel` → "Helpdesk #…", "Commerce order", "Manual case" at `components/claims/ClaimsQueueClient.tsx:66-70`) and the `SOURCE_LABELS` maps keyed by the generic `source` enum (`claimReviewLabels.ts:79`, `CustomerProfilePageParts.tsx:69`) are the **correct existing pattern** — extend these, do not invent a parallel labeling system.
