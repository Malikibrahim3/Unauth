# 05 — Test & Verification Plan

## 0. Current test-gate state (run by the lead this audit)

| Gate | Command | Result |
|---|---|---|
| Types | `npm run typecheck` | ✅ PASS |
| Lint | `npm run lint` | ✅ PASS |
| Unit/integration | `npm test -- --runInBand` | ❌ **2 suites fail, 1 skipped, 291 pass; 3 tests fail, 3 skipped, 2247 pass** |
| Build | `npm run build` | not run (memory-heavy; deferred) |
| Design guard | `npm run lint:authenticated-design` | not run this pass (part of `release:readiness`) |

**Failing tests (must fix — B5):**
1. `tests/api/routeSecurity.test.ts` › "claims page owns auth and VIEW_INBOX permission enforcement" — **stale** (asserts pre-refactor `{ denied }`; page now uses `requirePagePermission`).
2. `tests/api/routeSecurity.test.ts` › "dashboard/page.tsx … does NOT ignore denied return value" — **stale** (same cause).
3. `tests/components/caseContextDrawer.test.tsx` › "loads the tenant-scoped context and preserves a route to the full case".

**Skipped (assurance gaps):**
- `tests/security/sourceAgnosticRls.test.ts` (whole suite; RUN_LIVE_DB gate) — the only cross-tenant DB test.
- `backfillFraudEntities` suite (legacy).
- 3 individual skipped tests.

> The green typecheck/lint alongside a red test suite means the deterministic `release:readiness` gate does not currently pass. Treat "green gate" as a launch precondition (B5).

---

## 1. Unit / integration gaps

| Area | Existing | Gap | Add |
|---|---|---|---|
| Money & currency | `moneyFormatting`, `formatCurrency` | 0-decimal/3-decimal edge amounts in UI formatting | Property test over ISO exponents |
| Financial states | `financialLedger`, `crossModuleFinancialIntegrity` | SCN-009 worked example (£100→£50→£30→net £50) end-to-end; "stage measures never summed" (FIN-013) | Ledger scenario test + a guard test that no aggregate sums two stage states |
| Metrics | `automationMetrics`, `claimsReporting` | Per-metric formula + 0-denominator "unavailable" (MET-031); dashboard↔report↔export parity (QAT-006) | Golden-metric fixtures reconciled across surfaces |
| Rules | `rulesEngine`, `configurationVersioning` | Rule-version-as-evaluated snapshot (RUL-005/SCN-017); unavailable field → unknown not false (RUL-002) | Version-history + unknown-field tests |
| Recovery | `recoveryCalculation`, `recoveryStatusSemantics` | Amount caps: recovered+written-off ≤ sought (JRN-091); recovery ≤ eligible (JRN-090) | Invariant tests |
| Evidence | `evidenceScore`, `evidenceRecompute` | Strength calc reasons visible (EVD-003); present/missing/not_tracked/unavailable/contradictory distinct (EVD-002) | State-matrix test |
| Identity | `matchScorer`, `identityMatchGating` | Weak/conflicting → exception not auto-merge (IDN-003/SCN-004); confidence not reused as evidence strength (IDN-007) | Gating + confidence-isolation tests |

## 2. Contract / API tests

- Webhook **replay** rejection for Gorgias/Zendesk/Freshdesk (currently none) — B6.
- Webhook **signature-before-parse** assertion for BigCommerce + support providers.
- **Out-of-order** event handling (SCN-002) — older event after newer preserves latest valid state.
- **CSV partial import** (SCN-015) — valid import once, invalid don't corrupt batch, retry processes intended subset, provenance retained.
- **Reconnect-no-duplication** (SCN-008/INT-006) per provider.
- **Export audit** — assert token issuance + download each write an audit row (B4).

## 3. Tenant-isolation tests (highest priority — B3)

A **live authenticated two-merchant** suite (not skipped) covering every SCN-013 vector:
- Direct object IDs on every `/api/**` route → 404/403, no data, no existence signal.
- Search, exports, signed storage URLs, background jobs, notifications, connector callbacks.
- Standardise not-found vs forbidden so existence never leaks.
- A **static guard** test: no `createServiceClient().from(<merchant table>)` without a merchant filter (ratchet for B2).

## 4. Consent & duplicate-send tests

- Unauth does not send customer messages at MVP+ (records decisions only). Verify no code path performs an autonomous external customer message/refund/submit (GOV-001, RCV-006). Add a guard test asserting connector `sync`/`webhook`/write paths for unimplemented capabilities return typed unsupported (already the pattern — lock it in).
- Duplicate financial effect: assert one refund/webhook cannot create two `case_financial_entries` (extend `webhookIdempotency`).

## 5. Provider live-proof (QAT-005) — B1 precondition

For every provider labelled `live`, a controlled-account run proving: account identity, import, a source update, reconciliation, a failure+repair, reconnect, and disconnect. Today this exists for **Gorgias** (11-scenario e2e) and **ShipBob** (`validate-controlled-live-connectors --sync-shipbob`), partially for **Shopify** (fixture fallback when write scopes absent). **Add carrier (UPS/FedEx) and a second helpdesk to the controlled evidence suite, or downgrade them.**

## 6. Performance & reliability (PER, RLY)

- Representative-volume tests for list pages (Payout Control/Losses/Recovery/Customers) — bounded server queries, cursor pagination, indexed filters, no full-dataset client download (PER-003).
- Search exact-ID p75 < 1s (PER-004).
- Reconciliation is safe to re-run and records repaired/missing/unchanged counts (RLY-005); retries use bounded backoff and permanent failures become exceptions (RLY-003); outbox guarantees a successful source write is not lost from projections (RLY-004). *(Ingestion domain un-audited — verify while auditing.)*

## 7. Accessibility (QAT-007)

- Execute `tests/current/accessibility-responsive.spec.ts` + axe on core decision/recovery flows; add keyboard + screen-reader walkthroughs of case-review→decision and recovery status change (A11Y-001/002); reduced-motion (A11Y-004); 768–1023px reflow (A11Y-005/006). *(Not executed this pass.)*

## 8. Manual release checklist (pre-pilot)

- [ ] `npm run release:readiness` green (typecheck, lint, design guard, tests, contract audit, migration sanity).
- [ ] No provider shows `live` without controlled proof + real health probe.
- [ ] Live two-merchant isolation suite passes and is not skipped.
- [ ] Every AUD-001 action class writes a durable audit row.
- [ ] Data & Privacy removal affects canonical data; subject-erasure exists.
- [ ] Webhooks verify-before-parse + replay-safe; no secret in any URL.
- [ ] Credentials rotated per `docs/SECURITY.md` operational action; identity salt handled via the provenance-rebuild process.
- [ ] The 11 un-audited domains have been audited to evidence standard.
- [ ] SCN-001 (full case chain) and SCN-009 (partial recovery + write-off) traced on a controlled merchant.

## 9. Production monitoring & alerting (OBS-002)

Add alerts for: ingestion failure, webhook signature-failure spikes, stale/revoked sources, job backlog, reconciliation mismatch, **financial invariant failure** (e.g. negative outstanding, recovered > sought), and tenant-isolation/security events. Ensure requests/webhooks/jobs/rules/flows/financial side-effects share correlation IDs (OBS-001) — this also unblocks the durable audit trail (B4/B18).
