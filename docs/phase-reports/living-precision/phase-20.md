# Phase 20 — Dispute and support-ticket connected-object details

Status: implemented; populated Route-pack visual proof and production-build
completion pending. Scope per §12.4/§12.6 of
`docs/IMPL_living_precision_product_ui.md` (R09, R20).

## Scope and implementation

- `/disputes/[id]` and `/tickets/[id]` now use the Phase-19 connected-object
  identity/provenance shell. The dispute view leads with source financial facts
  and source lifecycle events; it does not reuse or create a case lifecycle.
- Ticket subjects lead over provider IDs. Ordered source messages and ticket
  activity are the first joined section, using stored summaries only; body
  references, raw metadata, and payload hashes are not rendered.
- Existing merchant-scoped linked-record reads now expose available ticket
  order and refund context beside canonical customer and payout-case links.
  Each destination preserves a safe return path to the ticket/dispute detail.
- Source freshness and sync state remain in the fixed provenance position.
  The two route loaders reserve their real detail geometry, and route-owned
  not-found states name unavailable/deleted/disconnected records with a safe
  return action. Existing error and permission-redirect behavior is unchanged.

## Verification

| Command/check | Result |
|---|---|
| `npm test -- --runInBand tests/components/phase19ConnectedObjectDetail.test.tsx tests/components/phase20SupportObjectDetail.test.tsx` | Pass — Phase-19 regression plus ticket conversation/order/refund/case links, dispute financial lifecycle, provenance, and loading geometry |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run lint:authenticated-design` | Pass — 467 files checked; all ratchets within baseline |
| `npm run verify:ui-parity` | Existing repository-wide baseline failure: `/partners`, `/`, and `router.push` count; no Phase-20 route caused it |
| `npm run build` | Did not complete in the local tool session after `Creating an optimized production build …`; no build-pass claim |
| Diff-scope review | Pass — only R09/R20, their direct connected-object read model, state modules, tests, and phase evidence changed; no permissions, provider status, source timestamps, financial calculation, case lifecycle, or ownership semantics changed |

## Route-pack visual evidence

The authenticated local browser reached the ticket not-found state. At both
1440×900 and 1024×900 it retained its title, unavailable explanation, and
customer recovery link without horizontal overflow. No populated dispute or
ticket capture is claimed because a known populated record was not available
for deterministic local inspection.

Prior-phase pack: direct Phase-19 consumer regression test passed because the
shared detail component remains the common shell.

## File and module budget

- New reusable production modules: 2
  - `components/relationships/SupportObjectRouteSkeleton.tsx`
  - `components/relationships/ConnectedObjectNotFound.tsx`
- Production files changed: 8
  - `lib/relationships/objectSummary.ts`
  - `components/relationships/ConnectedObjectDetail.tsx`
  - the two modules above
  - `app/(app)/disputes/[id]/loading.tsx`
  - `app/(app)/disputes/[id]/not-found.tsx`
  - `app/(app)/tickets/[id]/loading.tsx`
  - `app/(app)/tickets/[id]/not-found.tsx`

The focused tests, §12.10 update, and this report do not count toward the
production-file budget.
