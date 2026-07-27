# Product polish — Phase 6

- Status: COMPLETE
- Phase: 6 — Cases registry and case detail
- Active IDs: CASES-01–CASES-10, CDET-01–CDET-17
- Result: 27/27 PASS

## Changes

- CASES-01–02 — replaced the null/placeholder evidence path with the seeded case read model and derived waiting age from filed/submitted timestamps, preserving varied ages across the registry.
- CASES-03–08 — standardised the registry around Cases, kept one compact source warning/repair action, flattened the selected preview, and limited rows to lifecycle plus urgency badges.
- CASES-09–10 — added merchant-scoped server search for customer, order, ticket, and case references; preserved selected-case focus and routed evidence CTAs to case anchors.
- CDET-01–05 — kept the detail route read-safe on load, rendered the matched item/evidence/rule snapshot/recommendations, and removed `PayoutCaseLeadBlock` compatibility residue.
- CDET-06–11 — recomposed the workspace into Customer action, Responsibility, Recovery, and one chronological Timeline with joined evidence, investigations, finance, source context, previous-case links, and recovery state.
- CDET-07–08, CDET-12–17 — added URL-restorable section anchors, direct refresh/task copy, merchant-facing financial states, major-unit amount inputs, stable server-rendered identity/header, explicit decision requirements, semantic desktop order, and the single supervised-decision disclaimer.
- Hydration/loading polish — restored saved drafts after the first client render, sourced the server header customer name from the linked order/customer, and gave intermediate loading controls named states and next-step copy.

## Checks

- `npm run verify:evidence` — PASS (35 tests).
- Focused Jest suite (`claimsRoutes`, `caseReadModel`, `caseStore`, `recommendations`) — PASS (4 suites, 34 tests).
- `npm run typecheck` — PASS.
- `npm run lint -- --max-warnings=0` — PASS.
- `git diff --check` — PASS.
- One authenticated browser session — PASS at 1440px and 1024px. Search found the hero case by customer, order, helpdesk ticket, and case reference; selection/back restored focus; required sections populated; anchors, major-unit round trips, decision validation, stable identity, reload purity, zero overflow, blank-control scan, hydration, and console checks passed.
- `npm run verify:rules` — the rules-engine Jest suite passed (26 tests), but the follow-on legacy `scripts/verify-rules.ts` reported 46 contract mismatches in rules/IdentitySignals/widget checks. No Phase 6 rules-engine files were changed; this is outside the owned Phase 6 IDs.

## Remaining

None for Phase 6. The legacy `verify-rules` script mismatch is recorded above as an existing out-of-scope baseline failure.
