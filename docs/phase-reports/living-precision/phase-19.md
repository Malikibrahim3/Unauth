# Phase 19 — Commerce and fulfilment connected-object details

Status: implemented; Route-pack visual proof and production-build completion
pending. Scope per §12.4/§12.6 of `docs/IMPL_living_precision_product_ui.md`
(R14, R17–R19).

## Scope and implementation

- Commerce records now use one joined connected-object detail shell while the
  Phase-20 ticket and dispute branch remains unchanged. Its stable header
  positions source, canonical customer context, updated time, and current
  source state before its joined details.
- Orders, refunds, returns, and shipments retain their canonical facts and
  lifecycle meanings. Financial facts are separated into financial context;
  source order lines provide item context, shipment lines provide shipment-item
  context, and provider tracking events extend the existing shipment milestone
  timeline without creating a parallel timeline.
- Connected records keep canonical customer and case navigation continuous.
  Default back/error recovery now uses the valid customer directory rather than
  a non-existent object index. Untrusted external return destinations are
  rejected.
- Provider IDs, payload hashes, and UUID-only source references are not lead
  identity. When no human-readable reference exists, the header uses a neutral
  record identity instead.
- All four route loaders now reserve the actual shared detail geometry.

## Verification

| Command/check | Result |
|---|---|
| `npm test -- --runInBand tests/components/phase19ConnectedObjectDetail.test.tsx` | Pass — joined financial/items/lifecycle/provenance anatomy, customer/case return navigation, UUID-safe heading, and shared loading geometry |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run lint:authenticated-design` | Pass — 463 files checked; all ratchets within baseline |
| `npm run verify:ui-parity` | Existing repository-wide baseline failure: `/partners`, `/`, and `router.push` count; no Phase-19 route caused it |
| `npm run build` | Did not complete: two local Next builds stalled while creating the optimized build and were stopped; no build-pass claim |
| Diff-scope review | Pass — no permissions, source identifiers, financial calculation, lifecycle, provider, or case ownership semantics changed |

## Route-pack visual evidence

No populated 1440×900 or 1024px authenticated capture is claimed. The local
Next build did not finish, so the Playwright route pack could not be started.
The focused DOM test covers the changed visual anatomy and return-link safety;
the existing error boundaries retain their route-specific no-change messaging
and valid customer recovery destination.

Prior-phase pack: N/A — the Phase-19 branch is isolated from the unchanged
ticket/dispute branch, and no previously closed shared visual primitive changed.

## File and module budget

- New reusable production modules: 1 —
  `components/relationships/CommerceObjectRouteSkeleton.tsx`.
- Production files changed: 7
  - `components/relationships/ConnectedObjectDetail.tsx`
  - `components/relationships/CommerceObjectRouteSkeleton.tsx`
  - `lib/relationships/objectSummary.ts`
  - four R14/R17–R19 loading-route modules

The focused test, phase report, and §12.10 update do not count toward the
production-file budget.
