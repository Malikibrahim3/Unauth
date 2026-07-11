# Source-Agnostic Architecture — Live Work Checkpoint

**Purpose:** Disk-backed continuation state for another model if this task is interrupted.
**Last updated:** 2026-07-11 (Phase 7 runtime cutover: 7.2–7.5 complete, 7.1 partial)
**Branch:** `codex/refocus-claim-gate-map`
**Requested deliverable:** Implement the source-agnostic MVP+ plan through Phase 11, with live migrations, tests, and one commit per phase/sub-phase.

## Primary saved deliverable

## Implementation progress

Phases 0 through 5 are implemented and committed. Phase 5 is commit `ae4aa1de`
(`feat(source-agnostic): Phase 5 — record matching + related-record graph`).

Phase 6 is complete. The foundation commit is `4c5f3774`; the completion commit is
the next Phase 6 commit after this checkpoint update. All case mutations now route
through the optimistic-concurrency transition service, reads are side-effect free,
the merged timeline projects claim and domain events, and financial/loss/recovery/
customer/refund handlers maintain the compatibility projections.

Migration `20260711133000_phase6_financial_backfill.sql` was pushed to live Supabase
project `lquvbikyvmbjbfffrlky`. Live verification found 242 financial entries and
180 summaries. The parity report returned zero mismatches, orphaned entry groups,
or duplicate migration keys; domain-event deliveries had zero pending, failed, or
dead-letter rows. Generated Supabase types are current (the data/index-only migration
did not alter the generated type file).

Phase 6 verification: changed-file ESLint passed, source TypeScript passed (excluding
known stale `.next` declarations), `git diff --check` passed, and the complete Jest
suite passed with 1,773 tests passed, 3 skipped, and 0 failed.

Phase 7 runtime cutover is largely complete (commits after the Phase 7 foundation
`15ab4b51`):

- 7.5 `d9141e51` — recovery-task writes/completion routed through canonical `work_tasks`.
- 7.3 `26c41ba0` — loss classification writes routed through `loss_cases` +
  `loss_attribution_candidates`; override route reads/updates canonical loss.
- 7.2 `2b6a4086` — every recorded outcome appends immutable `case_decisions` +
  `case_outcomes` alongside the legacy `claim_outcomes` compatibility projection;
  reversals set `reverses_decision_id`.
- types regenerated `2d071085`.
- 7.4 `baf47091` — `recovery_cases.loss_case_id`/`prevention_only`; recovery
  creation requires a canonical loss record.
- 7.1 (partial) `0aebad73` — accountability evidence now written with `evidence_links`.

Full suite green after each: 1,777 passed, 3 skipped, 0 failed. TypeScript clean.

Remaining before Phase 7 is fully closed (next unit): the broader §10.1 evidence
read-model cutover — migrate the legacy evidence readers (`lib/claims/decision/
context.ts`, `lib/claim-gate/buildEvidence.ts`, `app/api/claims/[claimId]/route.ts`,
`app/api/claims/route.ts`) and the integration evidence writers (`lib/integrations/
syncAfterShipEvidence.ts`, `app/api/integrations/[provider]/{sync,webhook}/route.ts`,
`app/api/integrations/documents/[id]/approve/route.ts`, `app/api/fulfillment/
pack-confirmation/route.ts`) onto canonical `evidence_items` + `evidence_links`, and
remove the `hasConnected('shopify'|'gorgias')` provider-hardcoding in
`lib/payouts/assembleEvidencePack.ts` so it selects evidence by the case graph. This
sits next to decision/evidence-pack logic near the frozen scoring boundary, so it
should be done as its own carefully-verified unit. Then continue through Phase 11.

`docs/IMPL_source_agnostic_connected_ecosystem.md`

Current state: the implementation document is written through Phase 11 and includes:

- precedence and engineering constraints;
- verified current-state gap analysis;
- target data/event/connector architecture;
- phased database, connector, ingestion, matching, case-state, finance, evidence/loss/recovery, UI, workflow/collaboration/notification, health, and cutover work;
- exact file targets and proposed new files;
- phase gates, acceptance scenarios, traceability matrix, verification matrix, and definition of done.

Latest refinement pass has now also merged:

- account-scoped external IDs and identity-key namespacing;
- schema-ledger/live-schema reconciliation before migrations;
- composite tenant FKs and real RLS testing;
- currency-exponent-aware financial migration;
- append-only decision/outcome history;
- child-before-parent deferred reconciliation;
- side-effect-free case reads;
- repair of orphaned case actions and read-only recovery APIs/board;
- command-palette keyboard/search correctness;
- rules-vs-flows/status/currency cleanup;
- truthful Integration Centre GPS/payment/account capability copy;
- credential fallback/document upload/script-secret security requirements.

Do not restart the audit or create a second competing implementation document. Continue by verifying and refining the saved document.

## Recovered prior-work status

The interrupted task shown in the user's screenshot said it had created transient files named:

- `report-1-schema.md`
- `report-2-connectors.md`
- `report-3-screens.md`
- `report-4-hardcoding.md`
- `report-5-lifecycle.md`

Those exact files were not present in the worktree, Git history/reflog, or Codex session storage. Their headline findings were preserved in the user's pasted request and have been re-verified against the current branch. Do not spend more time searching for those transient report files.

**Update (Claude continuation pass, 2026-07-11):** the five report files were located in the original Claude session's scratchpad and used for a full cross-check of the implementation document. Result: the document's architecture, phases, and file references were confirmed accurate (all spot-checked paths exist). The cross-check surfaced ~30 verified file:line residual leaks (provider-named DTO fields, provider-defaulting services, legacy `shopify_connections`/`gorgias_connections` readers, status-literal comparisons including an invalid `'completed'` enum fallback, split USD/GBP defaults, a GBP-rendered-as-`$` billing display bug) that the document referenced only generically. These are now recorded as **§21 Appendix** in the implementation document, each mapped to its phase. No further audit passes are needed; implementers work from §21 plus the phases.

Useful older repo audit provenance:

- `CODEBASE_STABILISATION_AUDIT.md`
- `docs/audits/PAYOUT_CONTROL_FORENSIC_AUDIT.md`

Treat both as historical/stale where they conflict with current code.

## Required repository instructions already read

- `CLAUDE.md`
- `docs/product/MVP_STEERING.md`
- `docs/product/PRODUCT_PRINCIPLES.md`
- `docs/product/TERMINOLOGY.md`
- `docs/product/CODEX_HANDOFF.md`
- `docs/product/LAUNCH_BLUEPRINT.md`
- `docs/product/INTEGRATION_COVERAGE.md`
- existing `docs/IMPL_*.md` handoff examples

Important precedence conclusion: the user's new source-agnostic MVP+ specification supersedes only integration-specific limits in the current steering docs. Product positioning, neutral language, merchant-controlled decisions, and frozen scoring/matching calibration remain authoritative.

## Verified highest-severity findings

1. **Split connection stores:** `store_connections`, `helpdesk_connections`, and `merchant_integrations`/`integration_credentials` are combined through provider special cases in `lib/integrations/auth.ts`.
2. **No executable connector contract:** `lib/integrations/types.ts` has descriptive booleans; generic integration routes branch on provider IDs.
3. **No internal event/outbox:** existing event tables are local audit histories; provider handlers directly invoke case/rule/loss logic.
4. **Provider hardcoding:** `lib/payouts/assembleEvidencePack.ts`, `lib/claim-gate/createOrUpdateClaim.ts`, `lib/claim-gate/buildEvidence.ts`, and `lib/claim-gate/publicGate.ts` default/require Shopify, Gorgias, or specific tracking providers.
5. **Account collision risk:** source-table unique keys omit connection/account, and platform customer identity keys are provider-scoped rather than account-scoped. Two accounts of the same provider can collide.
6. **Unsafe matching:** `lib/support/intake/resolveTicketOrderLink.ts` can choose the newest order by email without exposing ambiguity.
7. **Four evidence stores:** `claim_evidence`, `integration_evidence_items`, `evidence_items`, and `loss_case_evidence` overlap.
8. **Divergent loss/recovery/finance:** `support_payout_cases`, `loss_cases`, `loss_sources`, `recovery_cases`, `recovery_tasks`, and `claim_outcomes` duplicate state and money. Decimal and minor-unit encodings coexist.
9. **Generic ingestion missing:** existing v1 API is lookup/evidence-package oriented; canonical create/update webhook/API/CSV routes do not exist. Manual case creation still requires an existing order or ticket.
10. **UI gaps:** case actions and recovery board are effectively read-only; related records are not a graph panel; timeline only shows claim events; no Work/Losses/comments/mentions/notification centre/Flows layer.
11. **Search/Integration Centre gaps:** search covers only customers/orders/cases; Integration Hub lacks truthful capability/coverage/freshness/error/record-count views.
12. **Sync/idempotency gaps:** commerce webhook claim is read-then-upsert rather than atomic; helpdesk event idempotency says `not_implemented`; no durable lease/retry/DLQ processing exists.

## Additional findings incorporated in the latest pass

### Account-scoped identity and uniqueness

The implementation doc now explicitly requires:

- replacing `unique (merchant_id, source, external_id)` on source customers/orders and provider-only ticket uniqueness with connection/source-account scoped uniqueness;
- adding account/connection namespace to platform customer/helpdesk identity observations;
- a collision audit/backfill before changing unique indexes;
- a test where two Shopify/Zendesk accounts use identical external IDs;
- no changes to scoring weights or thresholds.

Relevant evidence:

- `supabase/rebuild/001_new_schema.sql:324-493`
- `lib/identity/observations.ts:60-65`

### Connector truthfulness/security

The implementation doc now includes these verified details:

- registry omits some existing connector stacks (WooCommerce, BigCommerce, Zendesk, Freshdesk) while the UI hardcodes them separately;
- generic Gorgias sync currently performs no work and can report success;
- WooCommerce/BigCommerce webhook errors can return HTTP 200 while Shopify correctly returns 500;
- generic AfterShip webhook selects merchant through a query parameter and lacks a durable delivery ledger;
- refund-before-order paths can discard data instead of deferring reconciliation;
- `lib/integrations/getProviderCredential.ts` must not fall back from a failed merchant credential lookup to a global credential in production;
- document upload needs size/magic-byte/allowlist/malware controls;
- write-back needs preview, permission, idempotency, retry, and audit.

### Product/UI accuracy

The implementation doc now includes these verified current behaviors:

- action handlers exist in claim state but the action rail is not rendered;
- recovery mutation APIs are intentionally 405/display-only and `maybeCreateRecoveryCaseFromSupportPayoutCase` has no production caller;
- reports have mixed-currency correctness risk;
- a recovery-task completion can update one outcome store while reports read another store.

## Immediate security note

Schema audit found tracked scripts under `scripts/v2-tests/` (11 `.sh` files, one shared connection string + `PGPASSWORD`) containing a hard-coded Supabase database credential. Never print or copy it.

**Resolved status (verified 2026-07-11, Claude continuation pass):** a live authentication test (`SELECT 1` against the pooler, secret never echoed) failed with `password authentication failed` — the credential is **dead**, matching the rotation recorded in `docs/product/CODEX_HANDOFF.md` §1. No active exposure. Remaining hygiene only:

1. replace hard-coded connection strings with validated environment variables;
2. remove the dead secret from tracked files and secret-scan the repository;
3. history rewriting is a separate owner-approved action.

## Final handoff status

The planning/audit work is complete and implementation is active. Phases 0–6 have
been implemented; their migrations were applied to the live linked Supabase project.
Continue from Phase 7 without restarting the audit.

## Continuation commands

```bash
git status --short --branch
wc -l docs/IMPL_source_agnostic_connected_ecosystem.md docs/SOURCE_AGNOSTIC_WORK_CHECKPOINT.md
git diff --no-index /dev/null docs/IMPL_source_agnostic_connected_ecosystem.md
git diff --no-index /dev/null docs/SOURCE_AGNOSTIC_WORK_CHECKPOINT.md
```

## Scope boundary

The user explicitly requested end-to-end implementation through Phase 11. Apply and
verify migrations, update generated types, test, and commit each phase/sub-phase. Do
not change scoring or matching algorithms, and do not include unrelated worktree files.
