# Unauth Fraud Ops Simulation Report

## 1. Simulation Summary
- Build info/date: local Next.js app at http://localhost:3000, retested 2026-05-27.
- Personas tested: Maya (fraud analyst), James (risk manager), Kezia (support agent) plus end-of-shift/addendum checks.
- Seed summary: 1 simulation merchant, 6 masked customer profiles, 40 seeded historical order transactions, 9 seeded claims, 1 watchlisted critical-risk profile, plus CSV uploads through the UI.
- Database change: additive migration 20260527090000_claim_events_and_ops_statuses.sql added append-only claim_events and pending/escalated status support.
- Total issues by severity: CRITICAL 5, HIGH 7, MEDIUM 1, LOW 0.
- Total fixed: 13.
- Total unresolved required blockers: 0.
- Updated verdict: STRONG PILOT READY.

## 2. What Was Fixed
- Immutable claim event history with merchant-scoped attribution for claim creation, updates, evidence, outcomes, status changes, reopen, reversal, customer response copy, and escalation.
- Real /settings/audit-trail page now shows claim events alongside user actions.
- Resolved claims can be reopened with a required reason, and decisions can be reversed while preserving prior outcomes.
- API-enforced duplicate active claim detection by merchant, order reference, claim type, and active status.
- Claim filed date, age, SLA badges, age/date sorting, SLA filters, and inbox claim urgency.
- Pending external evidence status and escalation status with required notes and event history.
- Customer-safe response templates with copy-to-clipboard and no internal fraud/watchlist language in the customer-facing text.
- Post-resolution Next claim and Back to queue navigation.
- Claims Operations reporting with real claim totals, statuses, outcomes, value at risk, refund amount, resolution rate, overdue count, date filters, and CSV export.
- Customer profile claim summary showing open count, latest claim status/type/date, SLA badge, and Open review link.

## 3. Remaining Gaps
- No required simulation blockers remain open.
- Out of scope by design: email sending, a full assignment/manager queue system, and enterprise-grade workflow approvals.
- The no-more-open-claims queue state is implemented but was not naturally reached in the seeded browser session because unresolved claims remained in the queue.

## 4. Lifecycle Verification Table

| Workflow | Persona | Works after fixes? | Notes |
|----------|---------|--------------------|-------|
| Morning queue review | Maya | ✓ | Queue now exposes SLA, age, pending/escalated states, and open-review row actions. |
| Investigate high-risk customer | Maya | ✓ | Customer profile exposes risk, history, and compact claim summary. |
| File new claim | Maya | ✓ | Claim creation persists and writes claim_created events. |
| Add evidence | Maya | ✓ | Evidence save writes evidence_added events. |
| Deny/approve claim | Maya | ✓ | Outcome save resolves or escalates claims and writes history. |
| Reopen/reverse decision | James | ✓ | Required reason, previous outcome retained, current outcome clearly shown. |
| Add notes/status | Kezia | ✓ | Status notes are appended to immutable event history. |
| Look up claim status | Kezia | ✓ | Profile summary, /claims table, and review panel all expose status. |
| View audit trail | Manager | ✓ | /settings/audit-trail shows claim events scoped to the merchant. |
| Reports review | Manager | ✓ | Claims Operations report uses real current claim data. |

## 5. Addendum Week-One Email Risk Assessment

| Gap | Present after fixes? | Severity | Would generate week-1 email? |
|-----|----------------------|----------|------------------------------|
| Order reference search | ✓ | CRITICAL fixed | NO |
| Claim age/SLA visibility | ✓ | HIGH fixed | NO |
| Decision reversal/reopen | ✓ | CRITICAL fixed | NO |
| Duplicate claim detection | ✓ | HIGH fixed | NO |
| Next-claim queue navigation | ✓ | HIGH fixed | NO |
| Reports accuracy | ✓ | HIGH fixed | NO |
| Customer communication workflow | ✓ | HIGH fixed | NO |
| Pending/awaiting-info status | ✓ | MEDIUM fixed | NO |
| Audit trail attribution | ✓ | HIGH fixed | NO |
| Profile claim summary | ✓ | Partial gap fixed | NO |
| Escalation visibility | ✓ | Partial gap fixed | NO |

Week-one risk score: 0 YES. The simulation moves from week-one blocker risk to pilot-operational risk.

## 6. Updated ASOS-Level Scorecard
- Visual credibility: 84/100
- Navigation clarity: 84/100
- Shopify sync clarity: 76/100
- Customer profile usefulness: 90/100
- Claim review workflow: 92/100
- Evidence/outcome workflow: 90/100
- Search and queue workflow: 88/100
- Reporting usefulness: 84/100
- Operational trust: 90/100
- Enterprise polish: 82/100
- Overall ASOS readiness: 88/100

Scoring interpretation: the app is now strong enough for a controlled/strong pilot with real analysts on seeded and limited live claim workflows. It is not yet enterprise-ready because it still lacks full assignment, approvals, and outbound communications.

## 7. Retest Results

| Retest | Result | Evidence |
|--------|--------|----------|
| Addendum B — Claim Aging and SLA Visibility | PASS | retest_addendum_B_sla_after.png; retest_inbox_claim_urgency_after.png |
| Addendum C — Decision Reversal and Reopen | PASS | retest_addendum_C_reopen_after.png; retest_addendum_C_reverse_after.png |
| Addendum D — Duplicate Claim Detection | PASS | retest_addendum_D_duplicate_after.png |
| Addendum E — Queue Throughput / Next Claim Navigation | PASS | retest_addendum_E_next_after.png; retest_addendum_E_next_clicked.png |
| Addendum F — Reports Accuracy with Real Data | PASS | retest_addendum_F_reports_after.png |
| Addendum G — Post-Denial Customer Communication | PASS | retest_addendum_G_customer_response_after.png |
| Addendum H — Pending / Awaiting Info Status | PASS | retest_addendum_H_pending_after.png |
| End-of-shift audit trail check | PASS | retest_audit_trail_claim_events_after.png |
| Customer profile claim status visibility check | PASS | retest_customer_profile_claim_summary_after.png |
| Escalation visibility check | PASS | retest_escalation_after.png |

## 8. Issues List

### CRITICAL
- ISS-001: fixed — claim history visible from review panel.
- ISS-002: fixed — final outcomes resolve claims and clear the open queue.
- ISS-004: fixed — CSV/audit order claims can be created and persisted.
- ISS-005: fixed — full and partial order reference search finds the customer.
- ISS-007: fixed — resolved claims can be reopened and decisions reversed with preserved history.

### HIGH
- ISS-003: fixed — refund_requested rows persist as refund_claimed.
- ISS-006: fixed — claim age/SLA visibility and prioritisation added.
- ISS-008: fixed — duplicate active claim detection added in API and UI.
- ISS-009: fixed — next-claim queue navigation added.
- ISS-010: fixed — claims operations reports are backed by real data.
- ISS-011: fixed — customer-safe response workflow added.
- ISS-013: fixed — claim event attribution appears in audit trail.

### MEDIUM
- ISS-012: fixed — Pending external evidence status added.

## 9. Fix Summary

| Fix ID | Issue | Severity | Retest Passed |
|--------|-------|----------|---------------|
| FIX-001 | ISS-001 | CRITICAL | Yes |
| FIX-002 | ISS-002 | CRITICAL | Yes |
| FIX-003 | ISS-003 | HIGH | Yes |
| FIX-004 | ISS-004 | CRITICAL | Yes |
| FIX-005 | ISS-005 | CRITICAL | Yes |
| FIX-006 | ISS-006 | HIGH | Yes |
| FIX-007 | ISS-007 | CRITICAL | Yes |
| FIX-008 | ISS-008 | HIGH | Yes |
| FIX-009 | ISS-009 | HIGH | Yes |
| FIX-010 | ISS-010 | HIGH | Yes |
| FIX-011 | ISS-011 | HIGH | Yes |
| FIX-012 | ISS-012 | MEDIUM | Yes |
| FIX-013 | ISS-013 | HIGH | Yes |

## 10. Validation Commands
- npx tsc --noEmit — passed.
- npx jest tests/api/claimsRoutes.test.ts tests/api/auditTrailClaims.test.ts tests/lib/claimsSla.test.ts tests/lib/customerResponses.test.ts tests/lib/claimsReporting.test.ts tests/lib/claimsWorkflowClient.test.ts tests/lib/claimsStore.test.ts --runInBand — passed.
- npx jest tests/customers/orderSearch.test.ts tests/processing/worker-bulk-writes.test.ts --runInBand — passed.

## 11. Final Verdict
STRONG PILOT READY

Updated score: 88/100.

The app is now ready for a limited pilot with real analyst workflows, audit traceability, SLA triage, safe customer response copy, duplicate controls, and claim operations reporting. It should not be labelled enterprise-ready until assignment, approval governance, and outbound communication controls are built and tested.

## Artifact Index
- Seed log: simulation/seed_log.json
- Issues: simulation/issues.json
- Fix log: simulation/fix_log.md
- Screenshots: simulation/screenshots/
