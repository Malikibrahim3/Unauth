# Phase 14 — Customers

Status: implemented; Route-pack visual proof pending. Scope per §12.4/§12.6
of `docs/IMPL_living_precision_product_ui.md` (R03–R06).

## Scope and implementation

- Rebuilt `/customers` around one `RegistrySurface`: search/sort, quick
  filters, active filters, matching count, table, row-size control, and
  pagination are now one working surface. The former workbench KPI strip,
  repeated open-case prose, and summary rail were removed so the table reaches
  the first viewport.
- Added an independent merchant-scoped base-record count across the source and
  canonical customer populations. Filters keep that unfiltered context visible
  and report matching customers separately. A filtered empty state now says
  that the directory still has base records and offers one clear-all recovery
  action; it does not represent the filter result as a zero-population
  directory.
- Made the customer table flush inside its registry frame, removing the nested
  table surface while retaining its existing keyboard preview behaviour,
  identity resolution, and merchant-scoped loader.
- Replaced the customer-preview drawer's generic bones with a state that mirrors
  its identity summary, four facts, and connected-record list. Preview failures
  now have a named, retryable unavailable surface rather than an unstructured
  error below a skeleton.
- Reduced customer-detail header facts to the non-repeated identity/value/order/
  case context and made the existing nested evidence entry the primary action
  when eligible. The existing orders, cases, identity, and activity sections
  remain the connected-record spine; no identity, evidence, or case behaviour
  changed.
- Added R04 loading/error boundaries and a matching in-page Suspense fallback.
  R03 continues to redirect exactly to the supplied case or customer-cases
  destination.

## Verification

| Command/check | Result |
|---|---|
| `npx jest tests/components/phase14Customers.test.tsx tests/lib/customerSemanticsDeprecation.test.ts tests/lib/watchlistDeprecation.test.ts --runInBand` | Pass — 3 suites, 12 tests |
| `npx eslint …Phase 14-owned files…` | Pass |
| `npm run lint:authenticated-design` | Pass |
| `npm run typecheck` | Pass |
| Diff-scope review | Pass — no shared component API or domain behaviour changed |

## Route-pack visual evidence

The populated signed-in 1440×900 and 1024×900 customer-route review remains
open. This implementation does not claim screenshots or a live visual pass;
the focused DOM test covers the filtered-empty base-context contract, while the
route loading/error geometry is established in source for the next authenticated
route inspection.

Prior-phase pack: N/A — no shared API or shared CSS contract changed. The
existing `RegistrySurface`, `DataTable`, `PageFrame`, and loading primitives are
used without modification.

## File and module budget

- New reusable production modules: 0.
- Production files changed: 9
  - `app/(app)/customers/page.tsx`
  - `app/(app)/customers/CustomersOverviewPageView.tsx`
  - `components/customers/CustomersTableClient.tsx`
  - `components/customers/CustomerPreviewDrawer.tsx`
  - `app/(app)/customers/[id]/CustomerProfilePageHero.tsx`
  - `app/(app)/customers/[id]/evidence/new/page.tsx`
  - `app/(app)/customers/[id]/evidence/new/loading.tsx`
  - `app/(app)/customers/[id]/evidence/new/error.tsx`
  - `components/navigation/skeletons/pageSkeletons.tsx`

This is within §12.2's maximum of two new reusable modules and twelve
production files. `tests/components/phase14Customers.test.tsx` and this report
do not count toward the production-file budget.
