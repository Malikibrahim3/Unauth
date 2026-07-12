# Source-Agnostic Architecture — Live Work Checkpoint

**Purpose:** Disk-backed continuation state for another model if this task is interrupted.
**Last updated:** 2026-07-11 (Phase 7 closed; Phase 8 interactive recovery/search units landed)
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
- 7.1 (provider hardcoding) `ed46e9a8` — `assembleEvidencePack` selects evidence by
  the presence of canonical source-graph data instead of `hasConnected('shopify'|
  'gorgias')`; connection state now only informs the missing-evidence hints.

- 7.1 (integration evidence) `ca068ecc` — retired `integration_evidence_items`: all
  integration + claim-gate evidence writers now persist to canonical `evidence_items`
  (+ `evidence_links`) via `lib/integrations/canonicalEvidence.ts`; readers
  (`assembleEvidencePack`, claim decision `context.ts`) reconstruct the provider shape.

Full suite green after each: latest 1,778 passed, 3 skipped, 0 failed. TypeScript clean.

**Phase 7 is fully closed** (`8a505ec3`): `claim_evidence` retired into canonical
`evidence_items` + `evidence_links`. Migration `20260711160000` (applied live)
reproduces the fulfillment-sync idempotency as a partial unique index on
`evidence_items` and indexes the claim-evidence-origin subset. Writers
(`ensureClaimDecisionEvidence`, `upsertClaimEvidenceItem`) write canonical with
`origin_store='claim_evidence'`; readers (decision context, claims list+detail,
recovery creator) read the origin-filtered subset (`legacy_table` OR `origin_store`)
so decision-context counts — and therefore frozen scoring — are unchanged. or-filter
verified against live DB (74 rows). `loss_case_evidence` had no runtime writer.

All four legacy evidence stores (`integration_evidence_items`, `claim_evidence`,
`loss_case_evidence`, plus the legacy `evidence_items.claim_id`-only linkage) are now
retired at runtime; canonical `evidence_items` + `evidence_links` is the single store.

## Phase 8 — Connected product UX (in progress)

Landed `f1b9e430` (§11.1 partial): sidebar restructured to the ten target areas
(Customers + Integrations now surfaced; `/integrations` kept as a compatibility
alias to the hub; Rules → "Rules and Flows"; Partners dropped from the sidebar but
route retained). New canonical-backed pages `/work` (WorkQueue over `work_tasks`)
and `/losses` (LossLedger over `loss_cases`), plus `SourceBadge` + `FreshnessIndicator`
primitives. Both routes compile and serve (auth-gated 307); not yet rendered
authenticated in-browser (login requires a password the agent does not enter).

§11.3 (case action rail) landed `1e8d1017`: the payout case workbench had working
mutation handlers (record decision/outcome, add evidence, assign/unassign,
transition/reopen, snooze, reverse) that were never rendered. Added a
permission-gated `ClaimReviewManageCard` wired to those handlers with confirmation
before financial-state changes; `canManage` resolved server-side via
`hasPermission(SUBMIT_PAYOUT_DECISIONS)`. Installed `jest-environment-jsdom` and added
a deterministic 6-case render/permission/wiring test (dev in-browser drive of this
heaviest route was compile-flaky; the component test is the CI-repeatable substitute).
E2E in-browser verification uses `/api/test/e2e-auth` (local-only, `E2E_AUTH_SECRET`
in gitignored `.env.local`) — password-free owner session bootstrap.

Phase 8 completed since the prior checkpoint:

- `85f4686b` — `/integrations` is the canonical Integration Centre; the
  `/settings/integrations` index now redirects without removing provider setup
  deep links.
- `0e4da830` — recovery-board quick actions are permission-gated, confirmed
  when consequential, append immutable activity events, and use an additive
  live migration (`20260711170000`) for action idempotency.
- `eec310f5` — unified command search is default-on; its displayed order/case
  results now participate in Arrow/Enter navigation, failures are visible, and
  UUID searches avoid invalid `ilike` filters.

Phase 8 remaining (larger interactive units):
- §11.3 tail — refactor `app/api/claims/[claimId]/route.ts` into a read-model
  assembler; audit primary CTAs for targets that don't render.
- §11.4 reusable Case context drawer across modules + CaseTimeline (merge commerce +
  helpdesk + decision + task + recovery events) + CaseRelatedRecords.
- §11.5 universal multi-entity search + command palette (default-on, fix keyboard
  defects, no `ilike` on UUIDs).
- §11.6 tail — wire `SourceBadge`/`FreshnessIndicator` into more surfaces and
  expand recovery action coverage where a source-backed transition is available.

## Continuation through Phases 9–11 (Codex, 2026-07-11)

Further committed work:

- `f2c550af`, `9e5c5555`, `c27f9c24` — reusable tenant-scoped case context
  drawer from Work/Losses/Recovery plus unified claim/domain/task/recovery/helpdesk
  activity timeline.
- `2982bc3c`, `a8e6c104`, `1afc38d1` — comments, active-member mentions,
  immutable comment audit, deduplicated notifications, recipient-scoped centre,
  and real notification event projection. Migration `20260711180000` is live.
- `20735189`, `fe9c08d8`, `50281dfe` — bounded/versioned workflow engine,
  idempotent run/step/task execution, APIs, and separate Rules/Flows UI. Migration
  `20260711190000` is live.
- `0bf16200` — controlled connector-action preview/execution service with
  permission re-check, capability/runtime/write-back checks, forbidden high-risk
  actions, confirmation primitive, manual-completion outcome, and idempotent
  action ledger. Migration `20260711200000` is live.
- `7b2459cd`, `3d6d1334` — Integration Centre health/coverage read model and UI,
  plus validated platform settings API/UI.
- `71236438`, `f4cb1e4f`, `46f6d78e`, `881de0b4` — all six parity/health reports
  now require merchant scope; production credential fallback fails closed;
  AfterShip webhook tenancy resolves from canonical connection; uploads are
  quarantined and extraction is blocked pending clean malware scan; rotated DB
  credential removed from 11 tracked scripts; cutover flags and operational
  indexes added. Migrations `20260711210000` and `20260711220000` are live.

Latest verification: full Jest suite green (226 passed suites, 1 skipped; 1,806
passed tests, 3 skipped), application lint has 0 errors (73 pre-existing warnings),
and all new migrations are applied to the linked project. Full `tsc` remains
blocked only by the known stale `.next` route declaration for support-context.

Residual roadmap gates — CLOSED in the Claude follow-up pass (2026-07-12):

- ✅ Universal search now covers tickets, shipments, transactions, recovery
  references, and SKU/external-ref matching; command palette renders + keyboard-
  navigates all six non-customer groups. `feat: complete universal search coverage`.
- ✅ Commerce events (order placed / fulfillment / refund) project into the unified
  case timeline; a test proves all five source kinds merge. `feat: project commerce
  events into unified case timeline`.
- ✅ Comment edit/delete APIs with append-only audit events (author-scoped, soft
  delete). `feat: comment edit and delete with audit trail`.
- ✅ Real low-risk connector executor: Gorgias `tickets.write_note`/`write_tag`
  now `executeAction` through the live API (no more forced manual-required).
  `feat: real low-risk connector executor for Gorgias`.
- ✅ Dead-letter retry/ignore/replay operational endpoints
  (`/api/ops/domain-event-deliveries`). `feat: dead-letter retry/ignore/replay`.
- ✅ GDPR coverage completed AND a real bug fixed: append-only triggers
  (recovery_case_events, loss_case_events, case_comment_events, case_decisions,
  case_outcomes) blocked account deletion via the merchants cascade; they now
  permit DELETE under a purge flag and are purged in the RPC. Migrations
  `20260712090000`, `20260712100000` applied live. `fix(gdpr): purge append-only
  tables on account deletion`.
- ✅ Notification preferences (in-app mute + email opt-in) store + self-service API;
  mention notifications respect the in-app preference. `feat: notification preferences`.

Suite after the pass: 1,835 passed, 3 skipped, 0 failed; TypeScript clean; lint 0 errors.

Still genuinely open (larger refactors or infra/ops — NOT yet done):

- Claim-detail read-model **adoption**: `getCaseReadModel` exists and now includes
  commerce events, but `ClaimReviewPanel`/`app/api/claims/[claimId]/route.ts` do not
  yet consume it as their single read-model assembler.
- Context drawer entry points from Customers, Reports, and search (drawer is wired
  from Work/Losses/Recovery only).
- Email **delivery worker**: preferences/opt-in are recorded, but no SMTP/provider
  sender exists — needs an email provider decision + credentials.
- Workflow templates/outputs expansion + ordered transition-graph reconciliation.
- IntegrationHubClient decomposition, per-connection issue links, capability/
  sync-history dialogs, applicability-aware coverage.
- Non-empty parity reports for pilot merchants + staged pilot cutover (needs pilot
  data + an operational go decision).
- Destructive legacy-table removal (separate owner-approved migration).

## Automation-first — product decision + Phase 12 (2026-07-12)

Automation-first is now a **core** requirement, documented and partly built:

- `docs/product/MVP_STEERING.md` → "Automation-First Operating Principle" (product =
  what Unauth is: self-maintaining from connected-source activity; confirmed/
  probable/unknown match states; one exception queue; manual input as fallback).
- `docs/IMPL_source_agnostic_connected_ecosystem.md` → §0.25 automation-first
  requirement, per-phase "Automation requirements" notes (Phases 1/4/5/6/7), and a
  new **Phase 12 — Reconciliation and exception operations** with its own gate.
- **Built:** exception queue (`case_exceptions` table + `lib/exceptions/store.ts` +
  `/api/ops/exceptions` [list] and `/api/ops/exceptions/[id]` [resolve/dismiss];
  idempotent raise via dedup_key). Scheduled reconciliation (`lib/reconciliation/
  reconcileMerchant.ts` + `/api/cron/reconcile`, CRON_SECRET-gated) with the first
  detector (`detectUnmatchedRefunds`). Migration `20260712110000` applied live.

Phase 12 remaining:
- **Complete (`4321fc5a`)**: merchant-facing `/exceptions` queue plus Work
  queue section; assign/release, candidate selection, confirm/reject/resolve/
  dismiss actions; canonical case link; and a Work automation-completion card.
  The assignee migration `20260712120000` is applied live.
- **Complete**: Vercel daily `/api/cron/reconcile` schedule at `06:00 UTC`,
  cursor/merchant-scoped resume support, and safe test/deployment documentation
  in `docs/operations/reconciliation-schedule.md`.
- **Complete**: metric API/card distinguishes automatic outcomes, probable
  outcomes requiring confirmation, unknown outcomes, unresolved exceptions,
  merchant inputs per case, and reconciliation lag.
- **Complete**: resolution now dispatches `exceptionProjection`, refreshing the
  canonical case and recomputing the existing append-only financial summary;
  relationship resolution preserves candidate/relationship/resolution history
  and emits the normal audit/domain events.

Phase 12 verification: 34 focused detector/store/resolution/UI/metric/projection
tests passed; full Jest suite passed (226 suites, 1 skipped; 1,812 tests, 3
skipped); lint has zero errors (73 pre-existing warnings).

External deployment dependencies only: set `CRON_SECRET` in Vercel and deploy
the committed `vercel.json` schedule; run the documented E2E/demo-merchant
smoke call before enabling pilot reconciliation. No live email credentials or
pilot data are required to consider the implementation complete.

Then continue through Phases 9–11.

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
