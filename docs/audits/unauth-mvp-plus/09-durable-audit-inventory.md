# Durable sensitive-audit inventory (Task 2)

**Inventory date:** 2026-07-21
**Implementation baseline:** `8f943e03` plus the preserved Task 1/1A worktree
**Scope:** ACC-003, ACC-004, GOV-009, AUD-001–AUD-004, RLY-004

## Result

The durable source is now the existing immutable `domain_events` outbox. A
database `AFTER` trigger on each inventoried sensitive business table calls
`record_domain_event(..., handlers => ['auditTimelineProjection'])`. The trigger
and row mutation share one PostgreSQL transaction: if the outbox insert fails,
the mutation is rolled back. The worker projects the event into
`user_action_log`; `domain_event_id` is unique, so retries create one logical
timeline row. The existing delivery ledger provides leases, bounded attempts,
backoff, `dead_letter`, error text, and operator retry/ignore/replay.

`user_action_log` is a readable append-only projection, not the durable source.
Existing claim, financial, loss, recovery, and lifecycle history remains in
place and is not rewritten.

## Sensitive mutation inventory

| Mutation family | Located implementation / prior condition | Atomic durable source after Task 2 | Actor and scope evidence |
|---|---|---|---|
| Decisions, outcomes, reversals, case state and assignment | `support_payout_cases`, `case_decisions`, `case_outcomes`; `transitionCase`; decision/outcome/reverse routes. Application sequencing was non-atomic even where domain events were awaited. | Triggers on all three canonical tables; semantic actions include `payout_decision_recorded`, `payout_decision_reversed`, and outcome facts. | Merchant and case IDs come from the row; canonical decision rows preserve `actor_type`, `actor_user_id`, effective and recorded time. |
| Rule evaluation and recommendation audit | `rule_evaluations`; both rule-audit writers previously logged/swallowed or returned `failed`. | Trigger on `rule_evaluations`; both writers now reject on insert failure. | Claim/rule IDs, hashes, evaluation source, actor metadata, and recommendation are bounded audit details. |
| Financial entry and reversal | Append-only `case_financial_entries`; corrections use `reverses_entry_id`. | Trigger on insert; action distinguishes entry from reversal. | Merchant, financial entry, linked case, state, amount, currency, effective time, and reversal reference are retained. |
| Loss attribution and corrections | `loss_cases`, `loss_attribution_candidates`, `accountability_events`; loss-source override route previously updated multiple rows before appending history. | Triggers on the canonical loss and candidate rows make each mutation atomic with its audit event; accountability events are also captured. | Prior/new attribution, confidence, primary-candidate and financial state are retained; explicit accountability events preserve human/system meaning. |
| Recovery state and amount | `recovery_cases` plus append-only `recovery_case_events`; service methods previously updated the case then appended history. | Trigger on `recovery_cases` records the primary update atomically, including amount and status changes. | Merchant/recovery/case, prior/new status, prior/new amount, currency, effective/recorded time. Missing application actor data is represented truthfully as `system`, not invented. |
| Identity-link resolution | `record_match_resolutions` and `resolveMatch`; the resolution insert and later domain event were separate calls. | Trigger on the immutable resolution row. | Resolved-by user, subject object, selected candidate, prior/new status, reason. |
| Rule and workflow versions | `merchant_rule_versions`, `workflow_definitions`; publish RPCs were atomic for configuration state, but no unified security audit existed. | Triggers on both version stores. | Creator/updater/publisher where present, version/status/name, merchant and object. |
| Integration lifecycle and connector actions | `merchant_integrations`, `store_connections`, `helpdesk_connections`, `commerce_store_connections`, `connector_action_runs`; legacy `logAction` and ShipBob logger were separate and ShipBob swallowed failures. | Triggers cover connection rows and connector actions. ShipBob audit now uses the same domain-event outbox and rejects on failure. | Provider, prior/new status, connection/action ID, user or system actor, environment-safe metadata. Credential/token values are never copied. |
| Permissions, ownership/team, API keys | `user_permission_grants`, `merchant_users`, `merchant_api_keys`; mutations and `logAction` were separate. | Triggers on all three tables. Routine API-key `last_used_at` stamps are deliberately excluded; key creation/revocation is captured. | Grantor/grantee/permission, member/role change, and key name/prefix only. Key hashes and secrets are excluded. |
| Exports and sensitive access | Audit/report `logAction`; `evidence_download_tokens`; `access_audit_log`. Gorgias widget used `void` inserts and public API access swallowed errors. | Action-only `logAction` is async and writes the outbox before success. Export-token and access-log inserts are trigger-audited. Widget/public API audit failures now reject. | Actor/API-key type, merchant, object, request IP where supplied, result category, correlation and idempotency reference. Queried hashes are not copied into the merchant timeline projection. |
| Soft/destructive actions | `source_orders`, `sync_jobs`, `customer_notes`, `merchant_identity_state`, `evidence_packages`; bulk delete routes previously mutated then fire-and-forgot audit. | Per-row triggers make every successfully changed row atomic with an audit event. Multi-row/ multi-table partial failure remains truthful because each committed row has its own event. | Merchant/object/action and changed-field names; bounded safe details only. |
| Full account erasure | Multi-system account-delete saga intentionally removes the merchant timeline and auth identity. Previously it also deleted `user_action_log` directly. | Append-only `account_deletion_audit_receipts` records deletion and auth-deletion intent before each destructive stage. A flag-gated service-only RPC purges the merchant projection without weakening normal immutability. | Merchant and actor UUID references, correlation, idempotency reference, effective/recorded time, readable meaning. No merchant FK means the receipt survives lawful erasure. |

## Legacy logger call trace

All `logAction` calls under `app/` are now awaited. Before this task, every
call was effectively fire-and-forget because `logAction` returned `void`, even
the claims-report route that syntactically used `await`. Calls cover jobs,
transactions, customers/notes/status, evidence, bulk dismiss/delete, team and
permission changes, API keys, Shopify/BigCommerce/WooCommerce/helpdesk
connections, claim reports, and audit-trail view/export. Mutating rows are
independently protected by the database triggers above; action-only reads and
exports depend directly on the awaited outbox write.

Two other lossy paths were found and repaired:

- `performWidgetContextUnlock` used three `void access_audit_log.insert(...)`
  calls. Each insert is now awaited and failure rejects.
- `recordShipBobAudit` wrote `user_action_log` directly and only emitted a
  console error on failure. It now writes the canonical outbox with an
  idempotency reference and `auditTimelineProjection` delivery.

`access_audit_log` remains a dedicated restricted evidence store for sensitive
lookup mechanics, but its inserts atomically enqueue a canonical merchant audit
event. It is not allowed to upgrade or replace the security audit stream.

## Evidence fields and operational visibility

Every canonical audit event distinguishes:

- implementation/business event time (`effective_at` / domain `occurred_at`);
- durable recording time (`recorded_at`);
- user, system, workflow, or API-key actor type and actor ID when present;
- merchant, resource type and resource ID;
- namespaced event type plus human-readable meaning;
- correlation ID and idempotency reference;
- bounded, non-secret metadata.

Projection failures remain in `domain_event_deliveries` with `attempts`,
`max_attempts`, `next_attempt_at`, `last_error`, and terminal `dead_letter`.
The existing `/api/ops/domain-event-deliveries` surface exposes failed/dead
deliveries to authorised operators. The dispatcher now also treats a failure to
record the failed attempt as an error instead of silently claiming observability.

## Verification performed

- Targeted Jest durability set: 8 suites / 45 tests passed (audit store failure,
  projection failure/retry, duplicate delivery, user/system actor, scope and
  correlation, immutable/idempotent projection, sensitive trigger inventory,
  repeated-transition preservation, rule-audit failure, account erasure,
  widget access audit, and ShipBob safe metadata). The expected simulated
  account-delete failure console output is unchanged.
- TypeScript: `npm run typecheck` passed.
- Complete unmodified `npm run release:readiness` passed on 2026-07-21:
  296 suites passed / 1 existing suite skipped; 2,287 tests passed / 3
  existing tests skipped; the snapshot, lint, authenticated-design guard,
  generated Supabase contract (132 live tables), production build, whitespace
  integrity, and 141-file migration-history checks passed. The gate reported
  `status: ready` with zero failed checks. Its remote-migration phase remained
  skipped because `--remote-migrations` was intentionally not supplied.
- Local migration execution is **not verified** in this environment because the
  Docker daemon was unavailable (`supabase status` could not inspect container
  health). Static migration contract tests passed, but migration application
  must still be run in an isolated database before deployment.

This document records implementation/test evidence only. It is not an MVP+
certification or production-runtime PASS.

## Runtime rehearsal against isolated PostgreSQL (Task 2A — 2026-07-21)

**Status: Task 2A PARTIAL. Durable-audit runtime AUD-001–AUD-004 / RLY-004 =
UNVERIFIED this round. Clean complete migration replay = BLOCKED. Migration
history = P0 disaster-recovery blocker (see below).**

### Environment (isolated, non-production, synthetic-only)

- Docker runtime installed via Homebrew **Colima 0.10.3** (macOS Virtualization.framework; no Docker Desktop). Docker Engine 29.x.
- Official local Supabase stack (CLI upgraded 2.40.7 → **2.109.1**) started local-only, **not linked**; never ran `link`/`db push`/`db pull`/`--linked`. All endpoints localhost: API `127.0.0.1:54321`, DB `127.0.0.1:54322`; local demo JWTs (`iss: supabase-demo`). Prod `.env.local` credentials and the linked project ref (`lquvbikyvmbjbfffrlky`) were never used as a target.
- DB engine: **PostgreSQL 17.6** (`supabase/postgres:17.6.1.113`) — matches prod's 17.6.1.x line. Base image provisions the full managed schema (`auth.users`, `storage.objects`, `vault`, `graphql`, …); **no compatibility shim required**.
- Schema-only baseline captured pre-migration (empty `public`).

### P0 finding — the complete migration history cannot be applied to a fresh database

Runtime-proven on the isolated PG 17.6 stack. Multiple independent defect classes, all pre-existing (consistent with the 2026-07-20 76-conflict main merge), **independent of Task 2**:

1. **Syntax error** — `0008_csv_upload_queue.sql` has an orphaned duplicate `USING(...)` on the storage DELETE policy (introduced by commit `50032e73` editing an already-applied migration) → `syntax error at or near "USING"`.
2. **Duplicated migration block** — `0060–0077` re-introduce `0029–0049` stems (18 files; most byte-identical, `schema_rename` 0031↔0061 diverges) → duplicate-object collisions (`policy/index already exists`).
3. **Broken post-rename reference** — `0073_fix_audit_transactions_rls.sql` drops policies `ON fraud_transactions` after `0031` renamed it to `audit_transactions` → `relation "fraud_transactions" does not exist`.
4. **Dependency-ordering violation** — `20260528054700_merchant_widget_tokens.sql` FK-references `merchant_api_keys`, created later at `20260528120000`.
5. **Lost schema-evolution migration** — `merchant_users` is referenced by 9 migrations (`20260613+`) and by app code + committed `types.ts`, but is **never created** in any repo migration. `merchant_members` (created `0036`/`0066`, identical columns) is the stale name; prod renamed it to `merchant_users` and converted `role`/`invite_status` to enums (`member_role`/`invite_status`) — that migration is absent from the repo.

`supabase db push --dry-run` (the gate's remote-migration phase) cannot detect any of this: it compares recorded migration **names**, never executing SQL. A clean fresh apply (disaster recovery, new environment) is the only thing that surfaces it — and it fails.

### Bounded scratch reconstruction (authorized; scratch-only, cap 10, 8 used)

Repo migrations were **not** modified (all 223 verified byte-identical to pristine `sha256`). On disposable copies only, 8 mechanically-provable repairs were applied (full ledger: `COLLISION_LEDGER.md`): 0008 syntax repair; idempotency guards on identical duplicates 0062/0063/0066/0067/0070; canonical-name correction on 0073 (`fraud_transactions`→`audit_transactions`); move-after-dependency reorder of `merchant_widget_tokens`.

Reconstruction reached **139/223** migrations, then **STOPPED** at defect class 5 (the lost `merchant_users` migration): reconstructing it requires inventing business schema (enums, column-type changes) and guessing an intended dependency — both prohibited. The durable-audit migration `20260721120000_durable_sensitive_audit.sql` and the 27 audited tables (created `20260711120000+`) are **after** the stop point, so they were never created and the durable-audit runtime tests could not run against a faithful schema.

### Consequences for acceptance criteria

- "Migration applies cleanly from clean/preceding states" — **BLOCKED** (history unbuildable).
- "Generated types match applied schema" — **UNVERIFIED** (schema could not be built to compare against; repo migrations left untouched, types not regenerated/committed).
- Atomic rollback, one-event-per-mutation, projection retry/duplicate/dead-letter/recovery, account-erasure receipts, deployment-order rehearsal, batch measurement — **UNVERIFIED at runtime** (durable-audit schema unreachable).
- Isolated environment reusable for Task 3 — **NO**: the reconstructed DB is partial/synthetic-repaired; Task 3 tenant/RLS isolation must wait for a canonical schema.
- Complete automated gate — see below (unchanged by this work; scratch-only, no repo edits).

### Static findings requiring runtime confirmation once a canonical schema exists

- **Possible double-audit (contradicts "exactly one logical event"):** routes that mutate a trigger-audited table **and** also call `logAction` for the same action would emit two differently-keyed events — `transactions/[id]/dismiss` (updates `source_orders` + `logAction('dismiss_transaction')`), `jobs/[id]/hide` (updates `sync_jobs` + `logAction('hide_job')`), `customers/[id]/status` (updates `merchant_identity_state` + `logAction('update_customer_status')`). Not confirmable at runtime this round.
- **Phantom in the 27-table inventory:** `customer_notes` is listed for trigger capture but is never created as a table (the notes feature writes `identity_notes`, which is not in the trigger set). The `trg_durable_audit` DO-block is guarded by `to_regclass`, so the trigger is simply never attached. Needs runtime confirmation.

### Next dependency (P0)

A dedicated migration-history remediation task must reconstruct the canonical linear history (deduplicate `0060–0077`, repair `0008`/`0073`, fix the `merchant_widget_tokens` ordering, and restore the lost `merchant_members`→`merchant_users` rename + enum migration), validated by a clean fresh `supabase db reset` and a types diff against prod. Only then can Task 2A durable-audit runtime verification (and Task 3 tenant isolation) proceed against a faithful schema. The release gate should add a real fresh-apply check (e.g. `supabase db reset` on a disposable DB) so this class of defect fails CI instead of hiding behind name-only `db push --dry-run`.
