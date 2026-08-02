# Phase 11 — Case detail and evidence spine

Status: implemented; populated live-route gate pending. Scope per
§12.4/§12.6 of `docs/IMPL_living_precision_product_ui.md` (R01;
`/claims/[id]` only).

## Scope and implementation

- Migrated the case detail to the canonical `DetailPageShell`: the header now
  leads with a human-readable customer/case identity, case type, status, value
  at issue, owner, opened/updated time, functional back/customer links, and
  optional next-record navigation.
- Re-composed the body as one evidence-led work column plus a 320px merchant
  decision rail at desktop widths. At 1024px the rail stacks, while the
  readiness summary and next action remain in the first viewport.
- Replaced the former pseudo-tabs with honest in-page section links for
  Evidence & recommendations, Responsibility, Recovery, and Activity. Legacy
  deep-link anchors remain valid.
- Made Evidence and readiness the dominant working surface. Its summary is
  always present through loading, error, empty, and populated states and names
  readiness, provenance count, named evidence gaps, and next action.
- Kept customer action, responsibility, and recovery recommendations separate
  and advisory. Canonical evidence facts render in explicit Source facts,
  Human findings, and Inferences groups with provider/reference/timestamp/
  freshness provenance.
- Bounded the required evidence request at eight seconds. Failure is explicit,
  retryable, and states that no recommendation or decision changed; refreshing
  preserves last-loaded data. Required decision-context failure receives the
  same truthful degraded treatment.
- Clarified the decision hierarchy: an incomplete decision uses a neutral,
  disabled “Choose a decision to continue” control; the existing confirmation
  dialog retains the sole commit action, “Confirm & record”.
- Added geometry-aware nested-route loading and error files using the
  canonical route-state components.

Recommendation logic, merchant authority, mutation endpoints, investigation
semantics, case lifecycle, and audit history were not changed.

## Verification

| Command/check | Result |
|---|---|
| `npx jest tests/components/phase11CaseDetail.test.tsx tests/components/claimReviewManageCard.test.tsx tests/components/claimReviewDraft.test.ts tests/claims/merchant-facing-copy.test.ts tests/unit/reconciliation/recommendations.test.ts --runInBand` | Pass — 5 suites, 18 tests |
| `npm run typecheck` | Pass |
| `npx eslint …phase-11-owned files…` | Pass |
| `npm run lint:authenticated-design` | Pass — 453 files; ratchets unchanged |
| `npm run build` | Pass — production compile, TypeScript, 93 static pages, and route manifest |
| `git diff --check` | Pass |
| `npm run verify:ui-parity` | Known Phase-01 false positive remains: reports missing destination `/ *` |

The focused pre-edit baseline passed
`tests/components/claimReviewManageCard.test.tsx`. Two
`CaseFinancialHistoryCard` expectations were already stale against current
labels/empty copy; that unrelated suite was not changed.

## Route-pack visual evidence

The signed-in in-app browser inspected
`/claims/68552a04-9685-4225-aa21-d143fe892d75` at 1440×900 and 1024×900.

- 1440×900: no page-level horizontal overflow (`scrollWidth=1440`); the case
  identity/value/status, evidence summary, and 320px merchant decision rail
  are visible together. In the degraded state the rail replaces all decision
  controls with a no-action status at `top=208px`; outcome controls are also
  disabled.
- 1024×900: no page-level horizontal overflow (`scrollWidth=1024`); identity,
  £122.43 value at issue, state, Evidence and readiness, and Next action are
  all visible before `bottom=684px`. The decision rail stacks below the primary
  evidence and case-context content.
- The live data path exceeded the eight-second evidence threshold during cold
  compilation, rendering the explicit no-mutation retry state. Retrying after
  compilation resolved the evidence surface, proving it does not hang.

The live merchant schema is missing
`case_clarification_requests.partner_id` and the clarification-request/partner
relationship. The decision and investigation endpoints therefore return
degraded states for this merchant. This pre-existing data/schema blocker
prevents a populated live-route proof; the populated facts, three evidence
kinds, provenance, and independent recommendations are covered by the focused
DOM test. The Route pack remains open until a migrated merchant fixture can
exercise that populated state.

The R01 matrix also calls for a reconciliation waterfall. No auditable
recommended-payable amount or derivation is exposed by the current case
contract, so Phase 11 does not fabricate a monetary waterfall from value at
issue. That visual remains a data-contract blocker rather than a misleading
chart.

Prior-phase pack: N/A — no shared primitive or shared stylesheet changed.

## File and module budget

- New reusable production modules: 0
- Production files changed: 10
  - `app/(app)/claims/[id]/loading.tsx`
  - `app/(app)/claims/[id]/error.tsx`
  - `components/claims/ClaimReviewPanel.tsx`
  - `components/claims/ClaimReviewHeader.tsx`
  - `components/claims/ClaimReviewActionRail.tsx`
  - `components/claims/ClaimReviewContextColumn.tsx`
  - `components/claims/ClaimReviewFormSection.tsx`
  - `components/claims/ClaimReviewManageCard.tsx`
  - `components/claims/claimReviewState.ts`
  - `components/claims/payout/ReconciliationSummaryCard.tsx`
- Focused test added:
  `tests/components/phase11CaseDetail.test.tsx`
- Focused test updated:
  `tests/components/claimReviewManageCard.test.tsx`

This is within §12.2's maximum of two new reusable modules and twelve
production files.
