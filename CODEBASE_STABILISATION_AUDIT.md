# Codebase Stabilisation Audit (working note)

> Forensic stabilisation pass — Opus 4.8. Working scratch document; promoted to handoff at the end.
> Date: 2026-06-20. Branch: `cleanup/current-direction-stabilisation`.

## Phase 0 — Git Safety Checkpoint ✅

| Item | Result |
|---|---|
| Starting branch | `feat/evidence-scoring-engine` |
| Uncommitted changes | YES — 247 tracked + 109 untracked (in-progress payout-control migration) |
| Safety branch | `cleanup/current-direction-stabilisation` |
| Safety commit | `81d70de` — "chore: checkpoint before codebase stabilisation" |
| Push | ✅ pushed to `origin/cleanup/current-direction-stabilisation` |
| Sensitive files | none committed; `.env.local` gitignored; `lib/integrations/secrets.ts` is a crypto helper, not a secret dump |

## Baseline (before any changes) ✅ all green

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ exit 0 |
| `npm run build` | ✅ exit 0 (Next.js 16.2.7) |
| `npm test` | ✅ exit 0 (1464 tests, prior audit confirms 170 suites) |

The working tree is in a buildable, passing state. Any breakage I introduce is therefore my responsibility.

## Product Direction (Phase 1)

Unauth is mid-migration: OLD = cross-merchant **fraud / identity / risk network**; NEW = **post-purchase loss
accountability platform** ("Control payouts. Recover where possible. Prevent where not.").

- SSOT docs: `docs/product/MVP_STEERING.md` (protected — never delete), `PRODUCT_PRINCIPLES.md`, `TERMINOLOGY.md`, `CLAUDE.md`.
- A prior forensic audit exists: `docs/audits/PAYOUT_CONTROL_FORENSIC_AUDIT.md` (4 Critical / 15 High / 10 Med / 5 Low; applied **zero** fixes).
- Core workflow: support payout case → Gorgias 4-line card → evidence checklist → merchant-rule recommendation →
  attribution/recoverability → recovery case → recovery board → partner rulebook → dashboard.
- Banned user-facing language: fraudster, bad actor, blacklist, guilty, caught, scammer, customer fraud, cross-merchant accusation.

## Phase 3 — SQL / Migration Audit (DEFINITIVE)

Remote linked project: **`lquvbikyvmbjbfffrlky` ("Unauth New")** — treated as LIVE. No local dev DB is running.
`supabase migration list --linked` is authoritative for applied-state.

**Applied to remote** (through `20260619130000`): all historical migrations + `rename_claims_to_support_payout_cases`
(`public.claims` → `support_payout_cases`, confirmed: claims table no longer exists) + `recovery_operations`
(partners, partner_recovery_rules, recovery_cases, recovery_case_events).

**PENDING — NOT applied to remote (6):**

| Migration | Change | Idempotent | Destructive | Risk |
|---|---|---|---|---|
| `20260619140000_payout_recommendation_outcomes` | `add column if not exists` on support_payout_cases + claim_outcomes | ✓ | no | safe |
| `20260619150000_restate_claim_evidence_type_without_location` | drop+re-add CHECK constraint (expands evidence_type list) | ✓ | no (data-preserving) | low-med — `ADD CONSTRAINT` re-validates existing rows; could fail if a legacy row holds a removed value (e.g. `location`) |
| `20260619160000_extend_requested_action_taxonomy` | `alter type ... add value if not exists` (return_label, investigation) | ✓ | no | safe |
| `20260620120000_integration_layer_connectors` | new tables (merchant_integrations, integration_credentials, integration_evidence_items, integration_documents, extracted_partner_terms) + RLS | ✓ | no | safe-additive |
| `20260620143000_automation_first_loss_recovery` | new tables (loss_cases, loss_case_evidence, external_correspondence, …) + RLS | ✓ | no | safe-additive |
| `20260620170000_pre_payout_investigation_workflow` | new table (case_clarification_requests) + RLS | ✓ | no | safe-additive |

**RESOLVED — applied to production 2026-06-20 with explicit user authorization** via `supabase db push --linked`
(dry-run first). All 6 now recorded in the remote `schema_migrations` (verified via `migration list`). Notable:
- `…150000` (constraint re-validation risk) **applied cleanly** — no existing `claim_evidence` row violated the expanded CHECK.
- `…140000` columns already existed → idempotent "skipping" NOTICEs (no harm).
- `…143000` relabel UPDATEs (`auth_mode 'manual_upload'→'custom'`; `partner_recovery_rules` `'manual'→'unknown'/'merchant_configured'`) ran without error.
- All other NOTICEs were idempotent `drop … if exists` guards firing before first-time creation. Push exit 0.

**Runtime consequence — now resolved:** the integration / loss-recovery / pre-payout-investigation features that
referenced not-yet-created tables now have their backing tables on the remote and will function.

**Schema artifact drift:** `supabase/full_schema.sql` is a HAND-CURATED "REBUILT SCHEMA v2" target (not a live dump). It
includes some pending objects (recommended_payout_action columns) but NOT others (merchant_integrations, loss_cases) →
internally inconsistent. `lib/supabase/types.ts` likely also stale. Regenerating requires DB access → manual review.

---

## Phase 2/4 — Verified state vs prior audit

The prior audit (`docs/audits/PAYOUT_CONTROL_FORENSIC_AUDIT.md`) is **significantly stale**: the in-progress
work captured in checkpoint `81d70de` already resolved most of its Critical findings. Re-verified:

| Prior finding | Now | Evidence |
|---|---|---|
| CR-1 case workflow claim/identity-rooted | **largely addressed** | first-class `app/(app)/claims/[id]/page.tsx` exists; queue links to it; `customers/[id]/claims` is a redirect shim. Residual: `claimReviewState.ts` still fetches customer profile first |
| CR-2 recommendations risk/identity-driven | **partial** | UI now "Payout Rules"; defaults seed `DEFAULT_PAYOUT_RULES`. Residual: `lib/rules-engine.ts:4` header still says "fraud rules engine"; network fields still selectable (`lib/rules/fields.ts:132-135`) |
| CR-3 recovery board hides cases / decision side-effect | **resolved** | `RECOVERY_BOARD_COLUMNS` maps every status; decision route no longer auto-creates recovery cases. `maybeCreateRecoveryCaseFromSupportPayoutCase` now orphaned |
| CR-4 prohibited outcome vocabulary in write paths | **resolved** | `lib/claims/store.ts:41-44` rejects `blacklist`/`suspected_fraud` on write; historical rows read-compat to "Denied under policy" |
| H-10 schema artifacts (full_schema.sql 0 lines) | **stale claim** | full_schema.sql is now 62KB (still drifts vs Jun-20 migrations — see Phase 3) |
| H-12 customers primary identity surface | **still true** | `/customers` still in primary nav with identity context |
| H-13 legacy routes still ship | **still true (mitigated)** | legacy routes are redirect stubs, nav-hidden, proxy-redirected |

The repo is **close to the payout-control MVP on the user-facing surface** (dashboard, claims, recoveries, partners,
rules, reports all wired). Remaining gap is internal debt (legacy engine/v1 APIs, residual fraud-named internals,
stale schema artifacts), not missing core flows. No test requires banned language/behavior.

## Route & API surface classification (Phase 4)

| Group | Status | Reachable | Verdict |
|---|---|---|---|
| dashboard, claims, recoveries, partners, rules, reports, customers, `/claims/[id]` | current | in sidebar | keep |
| `/lookup`, `/global`, `/watchlist`, `/catches`, `/chargebacks`, `/store`, `/audit/[runId]` | legacy | redirect stubs, nav-hidden, proxy-redirected | keep stubs (hide-or-gate is a product call) |
| `/help/identity-matching`, `/help/confidence-grades`, `/help/how-it-works` | legacy | proxy-redirected to `/help` | hide-or-gate (manual) |
| `/eval`, `/network-metrics` | legacy/dead | redirect runs before `is_internal` gate → unreachable | manual-review (redirect-order) |
| `/integrations` standalone hub | transitional | duplicates `/settings/integrations` | manual-review |
| `/api/fraud-feedback` | legacy | HTTP 410 stub | keep (no live path) |
| `/api/v1/customers` + `lib/api/v1/signals.ts` | legacy, **HIGH RISK** | external API-key | manual-review — emits `risk_grade`/accusatory prose to external consumers (API contract) |
| `/api/lookup*`, `/api/watchlist`, `/api/catches`, `/api/customers/[id]/cross-merchant`, `/api/v1/*` | legacy | run fraud-scoring/cross-merchant | hide-or-gate (manual) |

## Banned-language / legal-trust risk (Phase 4)

There is a **working guardrail layer**: writes reject `blacklist`/`suspected_fraud`; scorer scrubs forbidden words at
output; help/reports copy is clean. Real residual **user-facing** risks (all DEFERRED — behavioral or external):

1. `ClaimsQueueClient.tsx:498-500` renders `{outcome.outcome}` raw (no `OUTCOME_LABELS` map) → a historical
   `suspected_fraud` row would render the literal term. **medium; needs careful mapping.**
2. `/api/v1/customers` + `lib/api/v1/signals.ts` emit `risk_grade`/`humanizeFraudFlags` accusatory prose to external
   systems. **high; external API contract — needs product/legal + consumer review.**
3. `DECISION_LABELS['blacklist'] = 'Escalated hold'` inconsistency — **FIXED this pass** (see execution log).

Internal noise (NOT legal risk, do not touch blindly): `blacklist`/`suspected_fraud` as live DB enum tokens +
read-compat keys (status machine); `fraudster` in frozen scoring-engine internals; demo-seed `abuser` strings.

## Deletion candidates (Phase 5) — verified

**Deleted this pass (8 — all zero-reference AND created pre-cutover AND clearly abandoned fraud product):** see execution log.

**Explicitly NOT deleted — NEW scaffolding (0 importers but created since ~2026-06-05, pending wiring):**
`components/CheckoutSignalPanel.tsx`, `UnauthGlobeHero.tsx`, `UnauthNetworkHero.tsx`,
`UnauthIntakeContextEvidenceSection.tsx`, `lib/stripe-globe/stripeGlobeEngine.ts`,
`components/catches/RecentCatchesFeed.tsx`, `components/settings/providerBrand.ts`.

**Borderline — left for manual review:** `DashboardReachableWidgets.tsx`, `ReadinessFunnel.tsx`,
`CustomerProfileEvidenceTrigger.tsx`, `DevTierSwitcher.tsx`, `lib/support/intake/identityLinking.ts`,
`maybeCreateRecoveryCaseFromSupportPayoutCase` (orphaned function, plausibly for future explicit recovery wiring).

**Script-backed (NOT dead):** `lib/engine/signal-descriptions.ts`, `lib/shopify/orderSignals.ts`,
`lib/support/intake/smokeConstants.ts`.

## Env var findings (Phase 9)

- **No secret exposed as `NEXT_PUBLIC_`.** Zod schema (`lib/utils/env.ts`) is the runtime SSOT and healthy.
- Used-but-unschema'd: `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` (lib/sentry.ts), `NEXT_PUBLIC_DEMO_MERCHANT_ID` — inert when unset.
- `.env.local.example` was missing ~25 schema vars incl. prod-required `CRON_SECRET`, `UPSTASH_*` → **FIXED this pass** (added as commented placeholders).
- Stale: `PUBLIC_INTAKE_MERCHANT_ID` (legacy fraud-network var, server-only despite name) → manual review.

---

## EXECUTION LOG (this pass — safe set only)

| # | Change | Files | Why safe |
|---|---|---|---|
| 1 | Deleted 8 orphaned fraud-product files | components/global/GlobalIdentityGraphClient.tsx, components/audit/{AuditHistoryTableClient,WatchlistStarButton}.tsx, components/customers/{InvestigationStatusSelect,IdentityChangesDisclosure,CustomerIntelligenceDrawerIdentitySection,CustomerIntelligenceDrawerReviewStatus}.tsx, lib/audit/resultsSummary.ts | 0 references anywhere; created 2026-05-02→06-02 (pre-cutover); abandoned-product; git-reversible |
| 2 | `blacklist` label → "Denied under policy" | app/(app)/claims/claimsPageData.ts:18 | pure label string; aligns with canonical events.ts; no test pins old value |
| 3 | Stale `/upload` comment → current routes | proxy.ts:99 | comment-only |
| 4 | Documented ~17 missing runtime vars | .env.local.example | example file, never loaded; no secret values |

### Verification after changes

| Check | Baseline (checkpoint) | After my changes | Verdict |
|---|---|---|---|
| `npm run typecheck` | exit 0 | **exit 0** | ✅ green |
| `npm run build` | exit 0 | **exit 0** | ✅ green |
| `npm test` | **5 failed / 1487 passed / 1492** | **5 failed / 1487 passed / 1492** | ⚠️ identical — my changes added **zero** regressions |

**IMPORTANT — the test suite was NOT green at baseline.** 5 tests in 4 suites fail in the checkpointed working tree
(pre-existing, part of the in-progress migration, NOT caused by this pass). The identical failing-suite set before and
after proves my edits are clean. Diagnosis of each (per task Phase 7 — bug vs stale test):

| Failing test | Diagnosis | Why not fixed here |
|---|---|---|
| `claimsStatusMachine › allows stale only from pending` (open→stale now allowed) | **REAL BUG** | see below |
| `claimsStatusMachine › blocks backward/unsupported transitions` (open→pending now allowed) | **REAL BUG** | see below |
| `claimsRoutes › cannot move backward open→pending` (200 not 409) | **REAL BUG** (same root cause) | see below |
| `appRoutes › sidebar labels snapshot` ("Recoveries"→"Loss Cases") | stale snapshot OR premature label change | "Loss Cases" **conflicts** with steering doc's "Recoveries"/"Recovery board" → product decision; don't blindly update snapshot |
| `resolverEvidenceHook › evidence score after rollup` (61 not 65) | stale expectation from scoring refinement | scoring is frozen by CLAUDE.md Ground Rule 1; recalibration is the team's |

**Status-machine regression — FIXED 2026-06-20 (commit `6f43ddf6`).** In `lib/claims/statusMachine.ts`,
`canTransitionClaimStatus` returned `true` at the former lines **89-90** for any non-final `from` (after line 87
guarantees `from` is non-final, those two lines cover both final/non-final `to`), making the specific per-state guards
unreachable. Result: illegal backward transitions (`open→pending`, `open→stale`, `escalated→resolved_refunded`) were
wrongly allowed (the status route returned 200 instead of 409). The tests correctly encode the canonical diagram.

The fix was **not** a reorder (that would have blocked `open → <new v2 status>` and broken the payout workflow —
claims are created as `open` and advance into the new statuses). Instead the bypassing permissive rules were replaced
with explicit guards for the forbidden transitions, leaving forward progress open: `stale` only from `pending`,
`pending` never a forward target, `escalated` resolves only to won/lost, finals terminal except void/reopen. Added
v2-pipeline / backward-block / terminal tests; existing assertions unchanged. Test failures 5 → 2 (the remaining 2 are
unrelated — see table above). typecheck/build green.

### Phase 8 — Browser smoke (HTTP, against running dev server :3000)

Managed visual browser preview was unavailable (Next 16 refuses a 2nd `next dev` for the same dir while the user's
server holds PID 256; not killed). HTTP smoke instead — after warming dev cold-compile, all green:

| Route | Result | Note |
|---|---|---|
| `/` | 200 | landing renders, `<title>Unauth</title>` |
| `/login` | 200 | |
| `/claims`, `/dashboard` | 200 | new payout-control surfaces serve |
| `/recoveries` | 307 | auth-gate redirect; new route wired correctly |

No 500s. Recommend a manual visual browser pass (logged-in dashboard/claims/recoveries) for completeness.

## DEFER / MANUAL-REVIEW (not done in this pass — see final report for rationale)

1. ~~Apply the 6 pending migrations to the live remote~~ — **DONE 2026-06-20** (user-authorized `supabase db push`).
2. ~~Regenerate `lib/supabase/types.ts`~~ — **DONE 2026-06-20** (commit `6e30d6b1`). Regenerated from the live remote via `supabase gen types --linked` (the `--project-id` Management API path needs unavailable keychain auth; `--linked` uses the DB connection like `migration list`). Types went 2911→5647 lines / 44→89 public tables. The regen surfaced 14 pre-existing compile errors in **dead** v1 audit/processing/identity dual-write code referencing v2-dropped objects (`processing_jobs`, `audit_transactions`, `source_orders.order_id`, `bulk_upsert_*` RPCs — all confirmed 404/400 on the live DB; no live callers). These were quarantined behind a documented legacy type bridge (`lib/supabase/legacyV1Types.ts`) using type-only casts — no runtime change, no frozen-logic edits. typecheck/build green; tests unchanged. **Still pending:** (a) `full_schema.sql` (hand-curated artifact, not app-consumed) — regenerate or note as advisory; (b) **full retirement** of the dead v1 audit pipeline (`lib/processing/*` worker/job/restitch, `auditBridge`s, `/audit/[runId]` view tree, dual-write graph) and removal of the legacy bridge — deferred to the legacy_v1 cutover (2026-09-09).
3. `ClaimsQueueClient.tsx` raw-enum render leak (behavioral copy).
4. `/api/v1/customers` external accusation prose (external contract).
5. `/eval` + `/network-metrics` redirect-order bug.
6. Residual fraud-named internals (`rules-engine.ts` header, network rule fields), dead `SUBMIT_FRAUD_FEEDBACK` permission.
7. Behavioral status-machine / DB-enum vocabulary (`blacklist`/`suspected_fraud` tokens).
8. `/api/claims/[claimId]/decision` gated by read-tier `VIEW_INBOX` while persisting an audit row.
9. Legacy route/API retirement + legacy engine/eval test cohort (protected by CLAUDE.md Ground Rule 1).
