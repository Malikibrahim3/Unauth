# Canonical privacy, erasure, and retention map

Date: 2026-07-22
Scope: signed-in MVP+ canonical schema after `20260722300000_privacy_erasure_retention.sql`

This map distinguishes direct identifiers and free-form content from the
minimal operational and monetary history needed to reconcile a merchant's
case. A customer erasure is always anchored to one merchant plus a canonical
`merchant_customers.id` (or a merchant-owned `source_customers.id` fallback).
The same provider/customer identifiers in another merchant are not a match.

| Data class | Canonical stores | Subject linkage | Erasure or retention action | Intentionally retained |
|---|---|---|---|---|
| Raw provider/API inbox | `ingestion_events`, `ingestion_field_errors`, `domain_events.ingestion_event_id` | Linked domain-event aggregate IDs for customer/order/ticket/case/loss/recovery | Subject erasure nulls linked inline payloads and field errors. Time-based maintenance nulls terminal inline payloads only when `retention_deadline` is explicitly set. | Inbox envelope, hash, status, timestamps, and domain-event linkage for replay/audit reconciliation. |
| Canonical customer | `merchant_customers`, `source_customers`, `source_addresses` | Merchant-local customer FK and source-customer IDs | Names, email, phone, addresses, notes, tags, raw metadata, provider customer ID, totals, and account dates are nullified or replaced by an `erased:<uuid>` sentinel. | Internal UUIDs, merchant/source provenance, and row timestamps. |
| Identity links and derived context | `merchant_customer_signals`, `identity_signals`, `identity_edges`, `customer_identity_signals`, `customer_claim_summary`, `merchant_identity_state`, `identity_notes`, `identity_catch_events`, `record_match_*` | Merchant-local customer and source entity IDs; collected signal hashes | Merchant-owned signals/edges/summaries are deleted; displays, notes, candidates, and resolution evidence are redacted. The merchant's global identity links are severed. | A global identity is deleted only if no merchant or case still references it; a genuinely shared identity remains for the other merchant. |
| Commerce and fulfillment | `source_orders`, addresses, lines, payments, transactions, returns, replacements, shipments, tracking events | `merchant_customer_id`, `source_customer_id`, and source-order IDs | Contact/device/address/browser fields and child raw metadata are redacted. Tracking locations/descriptions are cleared. | Provider order/payment references, amounts, ISO currency, statuses, product/fulfillment facts, and timestamps required for source reconciliation. |
| Helpdesk | `source_tickets`, `source_messages`, `source_ticket_events`, `support_case_intake` | `merchant_customer_id`, `source_customer_id`, ticket and case IDs | URLs, subjects, messages, attachments, extracted identifiers, tags, and free-form summaries are cleared. | Ticket/provider IDs, channel/status, counts, and event timestamps. |
| Payout case and collaboration | `support_payout_cases`, `claim_events`, `case_comments`, `case_comment_events`, `case_decisions`, `case_outcomes`, `case_exceptions`, clarification requests, `accountability_events`, `work_tasks` | Canonical customer, order, ticket, and case IDs | Raw reasons, manual URLs/references, comments, snapshots, exception/context text, task text, and clarification responses are redacted through a service-only transaction. | Case state, normalized reason category, recommendation/decision/outcome type, actor references, amounts, currency, and effective/recorded timestamps. |
| Evidence and exports | `evidence_items`, `evidence_links`, `claim_evidence`, `integration_evidence_items`, `evidence_packages`, download/view tokens | Case/order/ticket/source-customer links | Evidence content/URLs/metadata are redacted; access tokens are deleted; object paths are queued before being nulled. | Evidence type, content hash, provenance envelope, confidence, row ID, and case link. |
| Storage objects | `privacy_storage_cleanup_jobs` for evidence packages, claim evidence, pack photos, and source CSVs | Immutable erasure receipt | Leased, bounded, allow-listed deletion with retry/dead-letter state. A database erasure cannot appear to remove an object when Storage deletion failed. | Bucket/path only while cleanup is pending; completion/error timestamps and bounded error text. |
| Financial ledger and reporting | `case_financial_entries`, `case_financial_summaries`, `reporting_case_dimensions`, loss/recovery amounts | Case/loss/recovery IDs | Only free-form metadata is replaced under a narrowly allow-listed privacy trigger exception. | Append-only state, minor-unit amount, ISO currency, direction, reversals, effective/recorded time, summaries, and reporting dimensions. |
| Loss and recovery | `loss_cases`, `loss_case_events`, `loss_case_evidence`, correspondence/clarification, `recovery_cases`, `recovery_case_events`, `recovery_tasks` | Case, loss, and recovery IDs | Customer identity, counterparty/contact text, message/thread data, raw evidence values, notes, calculation explanation, and source metadata are cleared. | Attribution/recoverability categories, deadlines, status, owner role, source references needed for recovery reconciliation, and monetary values/currency. |
| Audit and projections | `domain_events`, `user_action_log`, `accountability_events`, notifications | Aggregate/case IDs and correlation IDs | Target domain-event payload becomes `{"privacy_state":"erased"}` while its immutable envelope remains. Notifications and free-form accountability detail are scrubbed. `user_action_log` already stores minimised action metadata and is not rewritten. | Event type, aggregate/resource IDs, actor/correlation, action meaning, timestamps, and non-PII financial details. |
| Jobs and workflow queues | `sync_jobs`, `sync_job_chunks`, `connector_action_runs`, `workflow_runs`, `workflow_step_runs`, `domain_event_deliveries` | Source-order job ID, case ID, domain event ID | A source import containing the subject is hidden, its stored upload is queued for deletion, and cursor/error/column-map content is cleared. Connector payload/results are redacted. | Job/delivery status, attempts, leases, counters, and completion timestamps for operational observability. |
| Integration documents | `integration_documents`, `agreements`, clauses/rules, upload jobs | Merchant-level, not customer-level | Not touched by subject erasure because these are merchant contracts/configuration rather than customer records. Full account deletion removes them and their Storage objects. | Merchant contractual source material until a separately approved retention policy says otherwise. |

## Runtime guarantees

- `erase_merchant_data_subject(...)` is service-role-only, validates the
  merchant/subject pair, takes an advisory transaction lock, and writes one
  immutable `data_subject_erasure_receipts` row per idempotency key.
- Its controlled append-only exceptions permit changing only known PII-bearing
  JSON/free-text columns. Event headers, decisions, outcomes, amounts,
  currencies, reversals, and timestamps cannot change through that exception.
- `privacy_storage_cleanup_jobs` uses skip-locked leases, owner-fenced
  completion, bounded retries, and dead letters. Only the four configured
  application buckets are accepted by the worker.
- `purge_expired_ingestion_payloads(...)` acts only on terminal
  `normalized`/`dead_letter`/`ignored` rows with an explicit, elapsed deadline.
  Pending/processing/failed rows and rows without a deadline are untouched.
- Disconnect sets the canonical/provider connection inactive and wipes
  credentials/secrets; webhook resolvers accept active connections only. The
  focused connection/webhook suites cover revoked Shopify and disabled Gorgias,
  Freshdesk, and Zendesk paths.

## Truthful blockers and exclusions

1. No approved legal/contractual period exists for canonical cases, evidence,
   documents, append-only audit, or financial history. Those records therefore
   have no automatic age-based purge. `platform.retentionDays` defaults to
   `null`; only a value explicitly saved by the merchant may stamp future raw
   ingestion rows.
2. Historical raw inbox events without a domain-event aggregate link cannot be
   assigned to one subject without guessing. Subject erasure does not use
   string-substring matching over provider payloads because that could erase an
   unrelated subject. Linked rows are covered; unlinked historical rows require
   an approved mapping/backfill policy or full merchant deletion.
3. A non-null legacy `payload_ref` has no canonical bucket/path contract in the
   current repository. Retention reports such rows as
   `external_payload_refs_blocked` and leaves them intact rather than orphaning
   an unknown object. No current ingestion caller writes `payload_ref`.
4. Existing data can be re-supplied by an active upstream provider after
   erasure. Operators must disconnect the source when future ingestion must
   stop; the erasure route does not silently disconnect a whole merchant source
   for one customer.

## Local evidence

- `scripts/verify-privacy-erasure-runtime.sql/.mjs`: overlapping subject data in
  two merchants; redaction, replay, receipt, financial/event preservation,
  Storage retry fencing, explicit retention, pending-row protection, and
  external-reference blocking.
- `tests/api/dataSubjectErasure.test.ts`: auth, permission/merchant scoping,
  confirmation, not-found non-disclosure, and deferred Storage reporting.
- `tests/api/bulkDeleteCanonical.test.ts`: actual canonical hide fields
  (`identity_notes.deleted_at`, `merchant_identity_state.on_watchlist`, and
  `sync_jobs.hidden`) rather than nonexistent legacy columns.
- `tests/api/privacyMaintenanceCron.test.ts` and
  `tests/lib/privacyStorageCleanup.test.ts`: authenticated counted maintenance,
  allow-listed object removal, and retry visibility.
