# Unauth MVP+ Audit — Executive Summary

**Date:** 2026-07-20
**Branch:** `perf/architecture-overhaul`
**Target contract:** `unauth-mvp-plus-product-contract.md` v1.0 (the authenticated merchant product)
**Mode:** Read-only, evidence-based gap audit. No app code, config, DB, or external service was modified.

---

## 0. Read this first — audit coverage and its limitation

This audit was designed as a 16-agent parallel sweep (one agent per contract domain), reconciled by a lead. **The org hit its monthly model-spend limit partway through, so only 2 of the 16 domain agents completed** (Security/Isolation/Privacy/Audit, and Integration/Provider-truthfulness). The other 14 domain agents failed with the spend error and could not be re-run.

To keep the audit honest and useful, the lead **personally investigated** the highest-stakes P0 areas directly (read-only) to fill the most important gaps: financial/ledger correctness, recovery/loss arithmetic, information architecture, server-side authorization on the modified pages, the Shopify webhook path, the RBAC model, the status system, and the legacy surface. The full deterministic test gate was also run.

**Consequence for the reader:**

- Conclusions for **Security, Privacy, Audit, Tenant Isolation, and the Integration/Provider live-truthfulness catalogue** are deep and agent-verified (with lead spot-checks).
- Conclusions for **Financial truth, Losses, Recovery, IA/routing, RBAC, status system, and the legacy register** are lead-verified against source with high confidence on the items examined.
- Everything else — **Onboarding UX, Overview/Work, Rules engine internals, Flows runtime, Customers/Identity detail, Exceptions UX, Search/Notifications/Help/Widget/Connected-objects, Reports drill-down/export, the canonical object-model read/write completeness, evidence-strength calculation, decision-recording specifics, and the accessibility/performance runtime** — is marked **`NOT VERIFIED`** in the matrix, with the exact reason. `NOT VERIFIED` here means "not audited to evidence standard in this truncated pass," **not** "broken." Completing those domains is the immediate next step (see §7).

Confidence in the verified findings: **high.** Confidence in overall completeness: **~40–45% of the ~300 atomic requirements reached an evidence-backed status.**

---

## 1. Overall launch-readiness assessment

**Verdict: NOT YET MVP+ READY.** Unauth has a genuinely strong canonical foundation and does *not* read like a mock — but it is blocked from a safe design-partner launch by a small number of concrete, high-severity issues, plus a large unverified surface.

The product's core financial and operational **model is sound**: money is stored in ISO minor units, the financial ledger is append-only at the database layer with reversal semantics, the recovery board and loss arithmetic follow the contract's formulas exactly, tenant scoping fails closed, and the information architecture and merchant vocabulary already match the contract ("Payout Control", "Losses", "Recovery"). This is well above a typical MVP.

What blocks launch is **truthfulness and assurance**, not missing scaffolding: the integration catalogue advertises four providers as "live" that are not, tenant isolation is enforced by hand-written convention rather than systematically (with no live cross-tenant test), the security audit trail can silently drop records, and the deterministic release gate is currently red.

---

## 2. What works particularly well (genuine strengths)

1. **Append-only financial ledger with reversals** — `case_financial_entries` and `domain_events` block `UPDATE`/`DELETE` via DB triggers; corrections append a `reverses_entry_id` row; `projectSummary` nets currencies separately and never sums across currencies (`lib/finance/financialLedger.ts`, migration `20260711120000`). Directly satisfies FIN-016/FIN-018.
2. **Canonical money** — integer minor units with correct per-currency ISO exponents (JPY 0, BHD 3, etc.), never floating point (`lib/canonical/money.ts`). Satisfies FIN-015.
3. **Recovery model matches the contract verbatim** — all 8 board groups map every status so a card can never disappear (`lib/recoveries/status.ts`, REC-001); `outstanding = max(0, recoverable − recovered − written_off)` (`lib/losses/readModel.ts`, FIN-011); `chase_due` deliberately does not touch `last_chased_at` (SCN-016).
4. **Fail-closed tenant scoping** — `createScopedClient` throws on any unclassified table rather than running an unscoped service-role query, and validates caller-supplied `merchant_id` (`lib/supabase/scoped.ts`).
5. **Evidence-download security** — 15-minute, single-use signed tokens with a merchant match on both the token and the stored row before streaming (`app/api/v1/evidence/[id]/download/route.ts`).
6. **Honest connector wrappers** — unimplemented sync/webhook paths return a typed `RUNTIME_PENDING`/`MANUAL_ONLY` instead of falsely stamping `last_sync_at`; `slot_only` providers are forced to `not_connected` and cannot be connected (Stripe). This is the *right* instinct — the problem is it is applied inconsistently (see §4).
7. **Gorgias and ShipBob are genuinely live** — Gorgias has an 11-scenario controlled e2e suite, real health probe, auto webhook registration, and deleted-ticket reconciliation; ShipBob is the most complete adapter yet is conservatively labelled "beta". These are the model for what "live" should mean.
8. **Shared metric service** — the dashboard and all reports read one calculation service (`lib/reporting/intelligence`), so a metric is not recomputed with a different formula per page (RPT-004/MET-033).
9. **Strong test breadth** — 294 Jest suites / 2,253 tests, with dedicated tenant-isolation, idempotency, webhook, and financial-integrity suites; typecheck and lint are clean.

---

## 3. Largest merchant-facing gaps

1. **Four providers falsely advertised as "live"** (Zendesk, Freshdesk, UPS, FedEx). None has controlled proof; Zendesk/Freshdesk have no effective-health probe and no reconciliation; the carriers are on-demand proof-lookup only and report "verified" health after merely refreshing an OAuth token. A merchant will trust a case-intake or tracking source that is not actually validated or monitored. *(INT-002/003/004, REL-010)*
2. **Merchant data removal targets legacy tables only** — the Data & Privacy "remove" action operates on `customer_notes`/`watchlist_entries`/`processing_jobs`, not the canonical v2 data (`support_payout_cases`, `source_records`). A merchant cannot remove/hide their real operational data short of deleting the whole workspace. *(PRV-002)*
3. **No per-customer (data-subject) erasure** — only whole-account deletion exists; a merchant cannot honour a single customer's GDPR erasure request while preserving financial/audit history. *(PRV-004, MISSING)*
4. **Silent audit loss** — `logAction` is fire-and-forget (never awaited, never throws), and its action enum omits payout decisions, financial reversals, attribution edits, recovery transitions, identity links, rule/flow publishes, and evidence exports. A sensitive action can occur with no immutable record. *(AUD-001)*
5. **The release gate is red** — 2 test suites fail (a stale `routeSecurity` assertion against the uncommitted auth refactor; a `caseContextDrawer` test), and the security refactor (`lib/auth/requestContext.ts`) is uncommitted/untracked. The product cannot pass its own `release:readiness` gate as it stands.

---

## 4. Critical safety / integrity risks

| Risk | Severity | Evidence | Requirement |
|---|---|---|---|
| Tenant isolation is by hand-written convention, not systematic. Only 16/179 API routes use the scoped client; ~163 use the raw service-role client with a manual `.eq('merchant_id', …)`. RLS covers only ~32 tables. One omitted filter = cross-tenant leak with no DB backstop. | **High** (not proven-Critical) | `lib/supabase/scoped.ts`; RLS grep of `supabase/migrations`; `tests/security/sourceAgnosticRls.test.ts` **skipped** | SEC-001, GOV-012 |
| No live authenticated cross-merchant test. The only cross-tenant DB test is skipped and checks anon rejection only — the real SCN-013 attack (merchant A supplies merchant B's IDs) is never exercised end-to-end. A regression could ship green. | **High** | SEC-010, SCN-013 evidence | SEC-010 |
| False "live" provider claims (see §3.1). This is a *fundamentally false release claim* under the contract's own severity rubric. | **High** | Provider matrix (`03-security-data-integrity.md` §Integrations) | INT-002, REL-010 |
| Audit records can be silently lost (fire-and-forget writes). | **High** | `lib/permissions/audit.ts logAction` | AUD-001 |
| Webhook hardening gaps: BigCommerce parses JSON before verifying signature; Gorgias/Zendesk/Freshdesk verify a static shared secret *after* body parse, accept it via URL query param, and have no replay defence. | **Medium** | `03-security-data-integrity.md` §Webhooks | SEC-004, SEC-005, SEC-009 |

No **proven cross-tenant data leak, financial-history corruption, or secret-return-to-browser** was found in the paths examined — the isolation and financial architectures are sound where reviewed. The risks above are *assurance* and *systematisation* gaps, not confirmed exploits; but by the contract's P0 bar ("passes adversarial tests", "truthful live catalogue"), they block launch.

---

## 5. Counts by status and priority (verified subset)

These counts cover **only the requirements that reached an evidence-backed status** in this truncated pass (~130 of ~300). The remainder are `NOT VERIFIED` (see §0). Full per-ID detail is in `01-requirements-matrix.md`.

| Status | P0 | P1 | Total |
|---|---:|---:|---:|
| PASS | 11 | 3 | 14 |
| PARTIAL | 34 | 7 | 41 |
| MISSING | 2 | 1 | 3 |
| BROKEN | 0 | 0 | 0 |
| MISLEADING | 4 | 0 | 4 |
| UNVERIFIED / NOT VERIFIED | ~150 | ~70 | ~220 |
| DUPLICATE_OR_LEGACY | 6 | 2 | 8 |
| OUT_OF_SCOPE (correctly deferred, no conflict) | — | — | 10 |

**P0 pass rate on the verified subset: 11 / 51 evaluated P0s ≈ 22%.** Extrapolation to the full P0 set is not warranted until the remaining domains are audited — but the verified subset already contains enough P0 PARTIAL/MISLEADING items to say MVP+ is not met.

Gaps by priority (verified subset): **P0 launch-blockers: 9** · **P1: 4** · P2 exposed-in-conflict: 0.

---

## 6. Recommended launch blockers (must clear before a design-partner pilot)

1. **Downgrade Zendesk, Freshdesk, UPS, FedEx to `partial`/`planned`** until each has controlled proof + a real effective-health probe + (helpdesks) reconciliation. *(INT-002/003/004)*
2. **Systematise tenant isolation** — route merchant reads/writes through the scoped client *or* add `is_merchant_member` RLS to every `merchant_id` table, and add a static guard forbidding raw service-role `.from()` on merchant tables without a filter. *(SEC-001, GOV-012)*
3. **Add a live authenticated two-merchant isolation suite** across routes/search/exports/storage/jobs/callbacks, and un-skip the RLS test. *(SEC-010, SCN-013)*
4. **Make audit writes durable** (await + retry/outbox) and add the missing AUD-001 action classes (decisions, reversals, attribution edits, recovery transitions, identity links, rule/flow publishes, exports). *(AUD-001)*
5. **Fix the red release gate** — update the stale `routeSecurity` assertions to the `requirePagePermission` pattern, fix `caseContextDrawer`, and commit the `requestContext.ts` auth refactor. *(SEC-002/010)*
6. **Point merchant data-removal at canonical v2 tables and add per-subject erasure/pseudonymisation** preserving financial/audit history. *(PRV-002, PRV-004)*
7. **Harden webhooks** — verify signature before parse (BigCommerce + support providers), add replay defence, stop accepting secrets via query param. *(SEC-004/005/009)*

Plus: **complete the audit of the 11 unverified domains** — a launch decision cannot be made while a third of the P0 surface is unaudited.

---

## 7. Recommended implementation sequence (by dependency, not product area)

1. **Security & tenant integrity first** — systematise scoping/RLS (blocker 2), durable audit (blocker 4), live isolation suite (blocker 3), webhook hardening (blocker 7). These are foundational; everything else assumes them.
2. **Truthful catalogue & connector data** — downgrade the four false-live providers (blocker 1); add carrier/helpdesk-2 to the controlled-evidence suite; make health probes real.
3. **Release-gate green & privacy** — fix stale/failing tests and commit the auth refactor (blocker 5); canonical data removal + subject erasure (blocker 6).
4. **Finish the audit** — run the 11 remaining domain audits (canonical model, case/decision/evidence, rules/flows, customers/identity, overview/work, states, reports drill-down, search/notifications, non-functional) to evidence standard.
5. **Core journeys & actions** — address whatever P0/P1 gaps that audit surfaces in decision recording, evidence strength, rule versioning, and reconciliation.
6. **States, navigation, accessibility, performance, polish** — last.

---

## 8. Confidence and limitations

- **High confidence** in the Security/Isolation/Privacy/Audit and Integration/Provider-truthfulness findings (agent-verified + lead spot-checks) and in the financial/recovery/IA/status/RBAC findings the lead read directly.
- **This is a static + test-gate audit.** No provider was exercised live; no authenticated browser walkthrough of a running app was performed. All connector "live" judgements are code + script + README based, and are explicitly marked runtime-unverified.
- **~55–60% of atomic requirements are `NOT VERIFIED`** solely because the multi-agent pass was truncated by an org spend limit — this is an audit-process limitation, not a product verdict on those items.
- The most reliable single artefact here is `03-security-data-integrity.md`; the least complete is the non-security half of `01-requirements-matrix.md`.
