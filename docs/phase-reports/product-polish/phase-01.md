# Product polish — Phase 1 completion report

- Status: IN PROGRESS
- Phase: 1 — Schema, API, read-model, and runtime integrity
- Owned IDs: RUN-01–RUN-21 (21)
- Starting revision: `4de9ef6f41dab78ffd8ea1492c183672d45af307`
- Final verified source revision and phase-diff hash: not applicable — no phase checkpoint created
- Checkpoint policy: required, but not reached (universal gate has not passed)
- Date: 27 July 2026
- Environment: isolated local Supabase only (`http://127.0.0.1:54321`, container `supabase_db_Unauth`)
- Owned-ID result: 10/21 PASS (RUN-01–RUN-08, RUN-10, RUN-14)
- Final verification seed/manifest version: `scripts/polish/phase-01.manifest.mjs`; QA fixture v3, `asOf=2026-07-26T12:00:00.000Z`, fingerprint `885069f0bae7…`

## Correction to the previous run's report

The previous report claimed **4/21 PASS**. That count was wrong and is withdrawn:

| Claim | Correction |
|---|---|
| RUN-01 "PARTIAL" counted toward the total | A partial result is not a PASS. RUN-01 is now genuinely complete (the preflight exists and fails closed), so it counts — but it did not before. |
| RUN-03 counted as PASS | Schema parity alone does not satisfy RUN-03. Its success metric additionally requires the match endpoint to return 2xx and the captured case to render the claimed item and source order line, with one unambiguous and one resolved seeded match. No fixture exists yet, so RUN-03 is **NOT VERIFIED**. |
| RUN-06 counted as PASS | The component contract is proven, but RUN-06's metric also requires a live 2xx from `/api/work/views` and an existing seeded view that loads. No fixture exists yet, so RUN-06 is **NOT VERIFIED**. |
| RUN-08 absent from the failing-ID list | RUN-08 was unimplemented and was omitted from the list. It is now implemented but not yet runtime-proven. |

Corrected count for this run: **3/21 PASS** (RUN-01, RUN-02, RUN-07).

## Audit of the previous run's changes

Every change from the blocked run was re-read before continuing. One real defect
was found and fixed:

- **RUN-07 selection handling was only cosmetically correct.** The previous
  implementation intersected the selection with the visible set at read time,
  so out-of-result rows were hidden from the count and from bulk actions but
  were still held in state and reappeared when the search was cleared. RUN-07
  requires the selection to be *cleared*. `components/work/WorkQueue.tsx` now
  prunes the selection in `applyQuery` at the moment the result set narrows, and
  the regression test asserts the selection does not return when the search is
  cleared.

The schema-parity baseline updates and the RUN-06 saved-view states were
re-reviewed and found correct; the triple clean replay reproduces the recorded
hash exactly.

## Requirement ledger

| ID | Implemented change | Verification evidence | Result |
|---|---|---|---|
| RUN-01 | Schema-parity allow-lists corrected, contracts regenerated, and the deploy preflight added: `lib/supabase/requiredSchema.json` + `scripts/verify-schema-preflight.mjs`, now covering relations, columns, foreign keys **and grants**. Wired into `release:readiness`. | `verify:canonical-db` ×3 identical hash; `verify:schema-preflight` PASS (5 relations, 36 columns, 3 FKs, 7 grant sets); negative injection of a bogus column, FK and grant each exits 1 | PASS |
| RUN-02 | Removed the swallow in `lib/payouts/clarifications.ts` that turned any error into an empty history; `partner_id` now selected and partners resolved by an explicit merchant-scoped read, with an explicit unresolved-partner shape. | `verify:investigations-runtime` PASS; fixture seeds both a resolved and a missing partner and the validator asserts both | PASS |
| RUN-03 | `case_claimed_items` brought inside the replayed chain and the preflight. The match endpoint was still 500ing because the table — and five sibling reconciliation tables — were created with **no privileges at all**; migration `20260727100000` restores them. | `phase-01-claimed-item-render.json`: match API 200, claimed item `QA-JKT-001` and source order line `QA-1001` both rendered, no error placeholder, `routeState: ready` | PASS |
| RUN-04 | Case detail POSTed `/api/claims/[id]/decision` on every load. Added a read-only `GET` that runs the same pure `computeClaimDecision` but performs none of the POST's writes (evidence backfill, carrier sync, payout-case persistence, rule audit, reconciliation refresh); the client now reads by default and only the explicit refresh mutates. | `phase-01-read-purity.json`: 5 reloads, `mutated: false`, zero write requests; the only audit rows are `view_customer` PII-access entries, asserted against an allow-list | PASS |
| RUN-05 | Lifecycle markup verified stable across a production build in a clean browser session. | `phase-01-browser-runtime.json`: `hydrationWarnings: 0` across five routes | PASS |
| RUN-06 | Explicit `loading`/`ready`/`unavailable` saved-view states with an inline notice and bounded retry; the underlying 500 was the missing `work_saved_views` grants, now restored. | `phase-01-completeness-injection.json`: injected 500 surfaces the notice and retry, all 11 system views survive, healthy control loads the seeded view and shows no notice; `tests/components/workQueueResultModel.test.tsx` (6 tests) | PASS |
| RUN-07 | Table, empty state, selectable IDs and footer derive from one visible result model; selection is pruned when the result set narrows. | `tests/components/workQueueResultModel.test.tsx`, including proof that a dropped selection does not return when the search clears | PASS |
| RUN-08 | Replaced the hard-coded `null` evidence projection in the Cases loader with the real `evidence_packages` read, throwing on query error rather than rendering "no package". | `phase-01-browser-runtime.json` (Cases route clean); registry reads the seeded package for the hero order | PASS |
| RUN-09 | Not implemented. Fixture carries the missing-currency, mixed-currency and known-zero records the metric needs. | fixture matrix only | NOT VERIFIED |
| RUN-10 | Added the named route-ready signal (`data-route-ready` / `data-route-state`). It now waits for every shared client resource in `lib/react/useFetchJson` to settle, with an 8s bound after which the route reports `degraded` rather than hanging. This exposed, and then proved fixed, the permanent "Loading case context…" state. | `phase-01-route-performance.json` (`readySignal: data-route-ready`); `routeState: ready` asserted on case detail | PASS |
| RUN-11 | Not implemented. | none | NOT VERIFIED |
| RUN-12 | Not implemented. | none | NOT VERIFIED |
| RUN-13 | Production TTFB and route-ready measured separately over 20 warmed navigations per capture route. Two real optimisations landed: the duplicate `merchants` round trip removed from every navigation, and the case-detail permission check overlapped with the case read. | `phase-01-route-performance.json`: TTFB p75 144–154ms against an 800ms budget. Route-ready p75 is 1144/1288/2183/2038ms against a 2000ms budget — **case detail and customers exceed it** | NOT VERIFIED |
| RUN-14 | Required/optional distinction proven by injection. `/api/billing` returning 404 for a workspace with no billing record — logged on every page load and swallowed by the banner — now returns a known `not_configured` state, and the banner reports a genuine failure instead of vanishing. | `phase-01-completeness-injection.json`; `requiredRequestFailures: 0` | PASS |
| RUN-15 | Not implemented. The fixture has a fixed `asOf` and reproduces its fingerprint, but the shared application clock boundary does not exist. | fixture determinism only | NOT VERIFIED |
| RUN-16 – RUN-21 | Not implemented. | none | NOT VERIFIED |

### Additional production defects found and fixed

These were found by the runtime harness, not by inspection, and none was visible before Phase 1 had real browser evidence:

1. **Seven tables created with no privileges.** `work_saved_views`, `case_claimed_items`, `case_outcome_events`, `case_recommendation_snapshots`, `source_shipment_lines`, `provider_credit_records` and `case_prevention_observations` all lacked `service_role` grants, so every request through them failed with SQLSTATE 42501 and surfaced as a 500. Migration `20260727100000` restores the grants; the preflight now checks grants so this class cannot recur silently.
2. **`support-context` 500 on any non-numeric order reference.** `linked_order_external_ids` is `jsonb`, but containment was called with a JS array, so PostgREST emitted array-literal syntax and Postgres rejected it with 22P02. Numeric Shopify order numbers happen to parse as JSON, which is why it had never been seen.
3. **`/api/billing` 404 on every authenticated page load** for any workspace without a billing record.

## Deliverables

- [x] **1 — regenerated database contracts** and one new forward migration (`20260727100000`).
- [x] **2 — schema/deployment preflight**, covering relations, columns, foreign keys and grants; proven fail-closed on all four.
- [x] **3 — side-effect-free detail reads**: read-only decision `GET`, proven by measured row counts.
- [x] **8 — fail-closed `verify:polish` runner**, manifest, report validation, zero-selection guard, `--through`, `--ledger`, and `release:readiness` integration. 22 self-tests.
- [x] **9 — deterministic isolated QA fixture and validator** (`seed:phase1-qa`, `validate:phase1-qa`, `evidence:phase1`). Guarded to the local container, idempotent, fingerprint `885069f0bae7…` stable across runs, 21 fail-closed assertions.
- [ ] **4 — healthy read models** — case/investigation/reconciliation/Work-view paths are healthy and proven; financial, customer, connection, source, waiting-time and reporting are not started.
- [ ] **5 — shared clock boundary and completeness contract** — the completeness half exists and is proven (RUN-14); the shared clock boundary does not.
- [ ] **6 — executable financial/time-scope definitions** — not started.
- [ ] **7 — focused regressions for every RUN ID** — 10 of 21 covered.

## Focused verification

| Command or inspection | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint -- --max-warnings=0` | PASS |
| `npm run verify:canonical-db` | PASS — 20 active migrations, hash `f42c76ae…62e5` |
| `npm run verify:schema-preflight` | PASS — and exits 1 on an injected missing column, FK or grant |
| `npm run verify:rollout-rehearsal` | PASS |
| `npm run seed:phase1-qa -- --reset` then again without `--reset` | PASS — identical fingerprint, no row growth, unrelated merchants unchanged |
| `npm run validate:phase1-qa` | PASS — 21 assertions |
| `npm run evidence:phase1` | 4 of 5 runtime tests PASS; the performance test fails on route-ready |
| Focused Jest (`tests/polish`, work queue, claims routes, case read model, reconciliation) | PASS — 66 tests |
| `git diff --check` | PASS |

## Universal completion gate

Not yet runnable to completion: `verify:polish -- --phase=01` correctly refuses while eleven owned IDs are non-PASS, and `release:readiness` has not been run on the final source state.

## Continuation queue

1. **RUN-13 route-ready budget.** TTFB is comfortably inside budget (p75 ~150ms); route-ready is not, at 2183ms (case detail) and 2038ms (customers) against 2000ms. Now that the signal is honest it is measuring a real client waterfall: `/api/claims`, `/api/customers/[id]`, `/shopify-orders`, `/support-context`, `/decision` and `/matches` largely in series. Collapse it — server-load the required panels or batch the reads — rather than relaxing the budget.
2. **RUN-09** currency truth, **RUN-11** merchant-safe error copy, **RUN-12** exhaustive enum handling, **RUN-15** shared clock boundary.
3. **RUN-16–RUN-21** financial reconciliation, customer aggregates, canonical connection health, waiting/deadline semantics, provenance/freshness, executable reporting formulas. RUN-18 may touch the pre-existing integrations files; every recorded hunk must survive, as `app/(app)/layout.tsx` already demonstrates.
4. Re-run the full §4.2 gate, both `verify:polish` commands, `verify:ui-parity`, `release:readiness`, and `git diff --check`; then 21/21, ledger COMPLETE, phase-only checkpoint.

## Resumable state

- Ledger row: `IN PROGRESS`. No checkpoint exists and none should until 21/21.
- Local Supabase running; QA fixture seeded and validated.
- Rebuild and re-measure with `npm run evidence:phase1`; add `-- --skip-build` to reuse the current build, and `-- --grep=RUN-03` to run one test.
- Evidence artifacts in `docs/phase-reports/product-polish/evidence/` are current as of the final source state, except `phase-01-route-performance.json`, which records the failing route-ready figures.
- Pre-existing work: the seven integrations files are byte-identical; `app/(app)/layout.tsx` retains its original hunk verbatim with two additive Phase 1 hunks. Verified by diffing every recorded `+`/`-` line against the baseline patch — no recorded line is missing.

## Remaining issues

Eleven owned IDs are not yet PASS: RUN-09, RUN-11, RUN-12, RUN-13, RUN-15, RUN-16, RUN-17, RUN-18, RUN-19, RUN-20, RUN-21. See the continuation queue.
