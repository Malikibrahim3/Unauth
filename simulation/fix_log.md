# Fix Log

## FIX-001 — Claim history hidden on review panel

Issue:
- Linked issue id: ISS-001
- Severity: CRITICAL
- Route: /customers/:id/claims
- Persona: Fraud analyst

Root cause:
- The live Supabase schema is missing the newer order_ref/order_source claim columns, so /api/claims returned no rows to the panel when its select failed. The create route also used a non-existent customer_profiles.merchant_id ownership check instead of the merchant_ids helper.

Fix:
- Files changed: app/api/claims/route.ts, tests/api/claimsRoutes.test.ts
- What changed: Added a legacy read fallback without order_ref/order_source and used fetchMerchantScopedCustomerProfile for profile ownership. Added a route test for CSV/manual profile claim ownership.
- Why safe: The fallback remains scoped by merchant_id and profile_id; it does not bypass auth, RLS boundaries, or merchant ownership checks.

Tests:
- Commands run: npx tsc --noEmit; npx jest tests/api/claimsRoutes.test.ts --runInBand
- Result: Passed

Retest:
- Playwright step rerun: Open Customer E claim review panel
- Result: Passed; ORD-2025-00412 and prior claims are visible
- Screenshot: retest_ISS-001_customer_e_claim_history.png

Remaining risk:
- The connected DB still needs the additive decoupled-claims migration applied so CSV order refs can be stored in first-class columns.

## FIX-002 — Outcome save did not resolve claim

Issue:
- Linked issue id: ISS-002
- Severity: CRITICAL
- Route: /customers/:id/claims
- Persona: Fraud analyst

Root cause:
- The outcome route only inserted merchant_case_outcomes. It did not update merchant_claims.status, so final decisions left claims open. It also treated null shop_domain claims as not found.

Fix:
- Files changed: app/api/claims/[claimId]/outcome/route.ts, tests/api/claimsRoutes.test.ts
- What changed: The route now loads claim merchant ownership, supports null shop_domain when merchant_id matches, saves the outcome, and marks the claim resolved.
- Why safe: Resolution is scoped to the same merchant-owned claim id and does not relax tenant isolation.

Tests:
- Commands run: npx tsc --noEmit; npx jest tests/api/claimsRoutes.test.ts --runInBand
- Result: Passed

Retest:
- Playwright step rerun: Save Customer E denied/suspected-fraud outcome and check open/resolved filters
- Result: Passed; claim left open queue and appeared under resolved
- Screenshot: retest_ISS-002_open_filter.png

Remaining risk:
- There is still no explicit separate Reopen/Reverse action or immutable decision history UI.

## FIX-003 — CSV refund_requested rows persisted as non-claims

Issue:
- Linked issue id: ISS-003
- Severity: HIGH
- Route: /upload
- Persona: Fraud analyst

Root cause:
- The processing worker wrote audit_transactions.refund_claimed using only refund_status. CSVs with refund_requested=true but no refund_status were scored with refund context but persisted as non-claims.

Fix:
- Files changed: lib/processing/worker.ts, tests/processing/worker-bulk-writes.test.ts
- What changed: Added isRefundClaimedForPersistence and used it when inserting audit transactions. It accepts true/yes/1/y refund_requested values plus the existing refund_status values.
- Why safe: The change only broadens claim persistence when the merchant explicitly supplies a refund-requested signal.

Tests:
- Commands run: npx tsc --noEmit; npx jest tests/processing/worker-bulk-writes.test.ts --runInBand
- Result: Passed

Retest:
- Playwright step rerun: Upload fresh 20-row CSV through UI
- Result: Passed; three refund_requested rows persisted as refund_claimed=true
- Screenshot: retest_ISS-003_csv_processing_fresh.png

Remaining risk:
- The upload page still does not clearly show a finished-results screen; it relies on background completion/status elsewhere.

## FIX-004 — CSV/audit order claim save failed on legacy schema

Issue:
- Linked issue id: ISS-004
- Severity: CRITICAL
- Route: /customers/:id/claims
- Persona: Fraud analyst

Root cause:
- The app was sending order_ref/order_source for CSV/audit claims, but the connected Supabase schema has not applied the additive decoupled-claims migration. The server returned a generic upsert failure.

Fix:
- Files changed: app/api/claims/route.ts, tests/api/claimsRoutes.test.ts
- What changed: Added a legacy fallback that stores the selected CSV/audit order ref in shopify_order_id only when the order_ref/order_source upsert path fails due missing columns.
- Why safe: The fallback still requires an owned customer profile and an owned active shop; it does not remove auth or merchant checks.

Tests:
- Commands run: npx tsc --noEmit; npx jest tests/api/claimsRoutes.test.ts --runInBand
- Result: Passed

Retest:
- Playwright step rerun: Create Customer D missing-parcel claim from order picker, navigate away, return
- Result: Passed; claim saved and persisted
- Screenshot: retest_ISS-004_customer_d_persisted.png

Remaining risk:
- This is compatibility glue. The proper fix is to apply the additive decoupled-claims migration to the live Supabase project.

## FIX-005 — Customer search could not find order references

Issue:
- Linked issue id: ISS-005
- Severity: CRITICAL
- Route: /customers?q=ORD-2025-00341
- Persona: Support agent

Root cause:
- /customers only searched profile email/name. Order IDs live on merchant_claims and audit_transactions, so support order references never mapped back to profiles.

Fix:
- Files changed: app/(app)/customers/page.tsx, lib/customers/orderSearch.ts, tests/customers/orderSearch.test.ts
- What changed: Detect order-reference searches, find matching merchant-owned claims/audit transactions, map transaction appearances to profile IDs, and filter profiles by those IDs.
- Why safe: Audit transaction lookup is scoped to merchant-owned processing jobs, and claims lookup is scoped by merchant_id.

Tests:
- Commands run: npx tsc --noEmit; npx jest tests/customers/orderSearch.test.ts --runInBand
- Result: Passed

Retest:
- Playwright step rerun: Search ORD-2025-00341 and 00341 in Customers
- Result: Passed; Priya Mehta appeared for both
- Screenshot: retest_ISS-005_ORD_2025_00341.png

Remaining risk:
- Search results route to customer profile rather than directly highlighting the matching claim/order.

## FIX-006 — Claim age and SLA visibility

Issue:
- Linked issue id: ISS-006
- Severity: HIGH
- Route: /claims, /inbox, /customers/:id/claims

Fix:
- Files changed: app/(app)/claims/page.tsx, app/(app)/inbox/page.tsx, components/claims/ClaimReviewPanel.tsx, lib/claims/sla.ts, tests/lib/claimsSla.test.ts
- What changed: Added filed date, days-open age, SLA badges, age/date sorting, SLA filters, resolved duration handling, and inbox urgency metrics.
- Why safe: Presentation and filtering use merchant-scoped claim data already returned by authenticated routes.

Tests:
- Commands run: npx tsc --noEmit; npx jest tests/lib/claimsSla.test.ts --runInBand; consolidated claims/regression Jest run
- Result: Passed

Retest:
- Playwright step rerun: Addendum B — Claim Aging and SLA Visibility
- Result: Passed; /claims shows Filed, Age, SLA and /inbox shows claim urgency.
- Screenshots: retest_addendum_B_sla_after.png, retest_inbox_claim_urgency_after.png

## FIX-007 — Reopen and reverse decisions

Issue:
- Linked issue id: ISS-007
- Severity: CRITICAL
- Route: /customers/:id/claims

Fix:
- Files changed: app/api/claims/[claimId]/reopen/route.ts, app/api/claims/[claimId]/reverse/route.ts, components/claims/ClaimReviewPanel.tsx, lib/claims/access.ts, lib/claims/events.ts, tests/api/claimsRoutes.test.ts
- What changed: Added merchant-scoped reopen and reverse routes, required reasons, preserved prior outcomes, and surfaced current/previous decision, outcome, actor, and timestamp in the review panel.
- Why safe: Both actions load the claim through merchant ownership checks and append history instead of mutating old outcome records.

Tests:
- Commands run: npx tsc --noEmit; npx jest tests/api/claimsRoutes.test.ts --runInBand; consolidated claims/regression Jest run
- Result: Passed

Retest:
- Playwright step rerun: Addendum C — Decision Reversal and Reopen
- Result: Passed; resolved claim reopened, then reversed from denied/suspected-fraud to approved/legitimate with previous outcome retained.
- Screenshots: retest_addendum_C_reopen_after.png, retest_addendum_C_reverse_after.png

## FIX-008 — Duplicate claim detection

Issue:
- Linked issue id: ISS-008
- Severity: HIGH
- Route: /customers/:id/claims

Fix:
- Files changed: app/api/claims/route.ts, components/claims/ClaimReviewPanel.tsx, tests/api/claimsRoutes.test.ts
- What changed: Added API-enforced duplicate detection for same merchant, order, claim type, and active statuses. Resolved duplicates return reopen/review guidance, while active duplicates are blocked with a clear warning.
- Why safe: Detection is merchant-scoped and never overwrites existing claim rows.

Tests:
- Commands run: npx tsc --noEmit; npx jest tests/api/claimsRoutes.test.ts --runInBand; consolidated claims/regression Jest run
- Result: Passed

Retest:
- Playwright step rerun: Addendum D — Duplicate Claim Detection
- Result: Passed; duplicate active missing-parcel warning appeared and save was blocked.
- Screenshot: retest_addendum_D_duplicate_after.png

## FIX-009 — Next-claim queue navigation

Issue:
- Linked issue id: ISS-009
- Severity: HIGH
- Route: /customers/:id/claims

Fix:
- Files changed: app/api/claims/route.ts, components/claims/ClaimReviewPanel.tsx, app/(app)/claims/page.tsx
- What changed: Added Next claim, Back to queue, next unresolved claim lookup, row Open review actions, and a clear no-more-open-claims state.
- Why safe: Queue navigation only requests merchant-scoped active claims and excludes the current claim.

Tests:
- Commands run: npx tsc --noEmit; consolidated claims/regression Jest run
- Result: Passed

Retest:
- Playwright step rerun: Addendum E — Queue Throughput / Next Claim Navigation
- Result: Passed; resolving a claim exposed Next claim and opened another unresolved claim in the queue.
- Screenshots: retest_addendum_E_next_after.png, retest_addendum_E_next_clicked.png

## FIX-010 — Claims operations reporting

Issue:
- Linked issue id: ISS-010
- Severity: HIGH
- Route: /reports

Fix:
- Files changed: app/(app)/reports/page.tsx, app/api/reports/claims/route.ts, lib/claims/reporting.ts, tests/lib/claimsReporting.test.ts
- What changed: Added Claims Operations metrics from real claim data, date filters, CSV export, outcome totals, value at risk, refunded amount, resolution rate, and overdue counts.
- Why safe: Report queries stay scoped to the authenticated merchant and do not invent placeholder values when claim data exists.

Tests:
- Commands run: npx tsc --noEmit; npx jest tests/lib/claimsReporting.test.ts --runInBand; consolidated claims/regression Jest run
- Result: Passed

Retest:
- Playwright step rerun: Addendum F — Reports Accuracy with Real Data
- Result: Passed; claims report shows non-zero current metrics and export link.
- Screenshot: retest_addendum_F_reports_after.png

## FIX-011 — Customer-safe response workflow

Issue:
- Linked issue id: ISS-011
- Severity: HIGH
- Route: /customers/:id/claims

Fix:
- Files changed: components/claims/ClaimReviewPanel.tsx, app/api/claims/[claimId]/customer-response-copied/route.ts, lib/claims/customerResponses.ts, tests/lib/customerResponses.test.ts, tests/api/claimsRoutes.test.ts
- What changed: Added copyable decision response templates, internal-note separation, internal-risk-term guard tests, and a customer_response_copied event.
- Why safe: No email is sent; the workflow only generates copyable customer-facing language and records the copy action.

Tests:
- Commands run: npx tsc --noEmit; npx jest tests/lib/customerResponses.test.ts --runInBand; consolidated claims/regression Jest run
- Result: Passed

Retest:
- Playwright step rerun: Addendum G — Post-Denial Customer Communication
- Result: Passed; denied copy rendered safe customer language, copy worked, and the response text contained no internal fraud/watchlist terms.
- Screenshot: retest_addendum_G_customer_response_after.png

## FIX-012 — Pending external evidence status

Issue:
- Linked issue id: ISS-012
- Severity: MEDIUM
- Route: /customers/:id/claims, /claims

Fix:
- Files changed: app/api/claims/[claimId]/status/route.ts, app/(app)/claims/page.tsx, components/claims/ClaimReviewPanel.tsx, lib/claims/store.ts, supabase/migrations/20260527090000_claim_events_and_ops_statuses.sql, tests/api/claimsRoutes.test.ts
- What changed: Added pending and escalated claim statuses, merchant-friendly labels, required status notes, filters, and immutable status-change events.
- Why safe: Status updates are merchant-scoped and append an event before returning refreshed claim state.

Tests:
- Commands run: npx tsc --noEmit; npx jest tests/api/claimsRoutes.test.ts --runInBand; consolidated claims/regression Jest run
- Result: Passed

Retest:
- Playwright step rerun: Addendum H — Pending / Awaiting Info Status
- Result: Passed; claim changed to Pending external evidence and history recorded the status change.
- Screenshot: retest_addendum_H_pending_after.png

## FIX-013 — Claim event history and audit attribution

Issue:
- Linked issue id: ISS-013
- Severity: HIGH
- Route: /settings/audit-trail, /customers/:id/claims

Fix:
- Files changed: supabase/migrations/20260527090000_claim_events_and_ops_statuses.sql, lib/claims/events.ts, app/api/audit-trail/route.ts, app/(app)/settings/audit-trail/page.tsx, components/claims/ClaimReviewPanel.tsx, tests/api/auditTrailClaims.test.ts
- What changed: Added append-only claim_events, merchant-scoped event reads, action attribution fields, event timeline in the claim panel, and a real audit-trail page that includes claim actions.
- Why safe: The table is append-only by trigger, RLS permits only service-role access, and app reads/writes always include merchant ownership.

Tests:
- Commands run: npx tsc --noEmit; npx jest tests/api/auditTrailClaims.test.ts --runInBand; consolidated claims/regression Jest run
- Result: Passed

Retest:
- Playwright step rerun: End-of-shift audit trail check
- Result: Passed; /settings/audit-trail shows claim events with timestamps and claim resource IDs.
- Screenshot: retest_audit_trail_claim_events_after.png

## Additional workflow checks — profile summary and escalation

Fix:
- Files changed: app/(app)/customers/[id]/page.tsx, app/api/claims/[claimId]/status/route.ts, components/claims/ClaimReviewPanel.tsx, app/(app)/claims/page.tsx
- What changed: Added compact claim summary on customer profile and operational escalation status/event visibility.

Retest:
- Customer profile claim status visibility check: Passed; profile overview shows open count, latest claim type/status/date/SLA and Open review link. Screenshot: retest_customer_profile_claim_summary_after.png
- Escalation visibility check: Passed; claim was set to Escalated and event/history visibility was confirmed. Screenshot: retest_escalation_after.png

