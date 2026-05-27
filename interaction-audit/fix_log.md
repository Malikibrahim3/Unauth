# Interaction Audit Fix Log

Important context before starting:
The previous live persisted-state retest passed for viewed/unread, assignment, unassignment, snooze, customer response, response timeline/audit trail, and evidence lifecycle. This audit did not re-fix those systems unless a fresh control issue appeared.

## FIX-001 — Inbox unassigned filter applies ownership state

Issue:
- Linked issue: ISS-001
- Severity: HIGH
- Route: /inbox

Root cause:
- The Unassigned tab incremented its count for every row and returned every row from its filter.

Fix:
- Files changed: components/inbox/InboxClient.tsx, tests/components/inboxFilters.test.ts
- What changed: added shared queue count/filter helpers and made Unassigned require assigned_to to be empty.
- Why safe: client-side filter logic only; no persistence or merchant isolation changes.

Tests:
- npm test -- --runInBand tests/components/inboxFilters.test.ts tests/api/auditTrailClaims.test.ts
- Result: pass

Retest:
- Playwright step: /inbox -> Unassigned
- Result: pass
- Screenshot: ./interaction-audit/screenshots/inbox_filter_unassigned.png

## FIX-002 — Audit trail claim rows deep-link to the claim workflow

Issue:
- Linked issue: ISS-002
- Severity: HIGH
- Route: /settings/audit-trail

Root cause:
- Claim event rows exposed only the claim id, so the client linked to the generic claims list.

Fix:
- Files changed: app/api/audit-trail/route.ts, components/settings/AuditTrailClient.tsx, tests/api/auditTrailClaims.test.ts
- What changed: resolved merchant-scoped claim customer ids server-side and added resource_href for claim events.
- Why safe: uses existing service-side merchant scope and does not expose other merchants' claims.

Tests:
- npm test -- --runInBand tests/components/inboxFilters.test.ts tests/api/auditTrailClaims.test.ts
- Result: pass

Retest:
- Playwright step: /settings/audit-trail -> first claim row link
- Result: pass
- Screenshot: ./interaction-audit/screenshots/audit_trail_claim_link_result.png

## FIX-003 — Customer search advertises order-reference lookup

Issue:
- Linked issue: ISS-003
- Severity: LOW
- Route: /customers

Root cause:
- Search copy mentioned only email/name even though order-reference search is implemented.

Fix:
- Files changed: components/customers/CustomersFilterSheet.tsx
- What changed: placeholder now includes order reference.
- Why safe: copy-only; it matches existing server behaviour.

Tests:
- npx tsc --noEmit --pretty false
- Result: pass

Retest:
- Playwright step: /customers -> search ORD-0001
- Result: pass
- Screenshot: ./interaction-audit/screenshots/customers_after_order_ref_search.png
