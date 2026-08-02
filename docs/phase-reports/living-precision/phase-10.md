# Phase 10 — Cases registry and split preview

Status: implemented; Route-pack visual gate pending. Scope per §12.4/§12.6 of
`docs/IMPL_living_precision_product_ui.md` (R02; `/claims` only).

## Scope and implementation

- Replaced the legacy Workbench wrapper with the canonical `PageFrame`,
  four-item `MetricGroup`, and one `RegistrySurface`. Search, filters, sorting,
  page size, result count, queue, selected preview, and pagination now share
  that one working surface.
- Kept selection local and URL-addressable with `focus`; the selected queue row
  now uses a quiet violet wash/marker without a layout shift. The preview is a
  labelled region and leads with value at issue, evidence readiness, waiting
  time, and next action. It retains the existing link to the case detail rather
  than adding an index-route decision action.
- Retained `PageConnectionGate` as the sole connection-health treatment. It
  still renders a full setup gate only when no useful data exists and otherwise
  one non-blocking completeness strip.
- Replaced the failing PostgREST `partner:partners(name)` embed with an explicit
  merchant-scoped partner-name lookup, preserving the target-name fallback for
  deleted/unresolved partners. Added the missing `recoveryStatus.open` label.
- Mirrored the resolved queue/preview geometry in loading and used the
  canonical retryable route error with truthful no-mutation copy.

No case lifecycle, decision behaviour, permissions, search/filter/sort query
semantics, or `/claims/[id]` implementation changed.

## Verification

| Command | Result |
|---|---|
| `npx jest tests/components/phase10Cases.test.tsx --runInBand` | Pass — selected preview hierarchy, in-place selection, focus query, and unchanged deep link |
| `npm run typecheck` | Pass |
| `npm run lint:authenticated-design` | Pass — 451 files; ratchet unchanged |
| `npm run lint` | Blocked by a pre-existing, unrelated `components/dashboard/DashboardOverview.tsx` React Compiler `preserve-manual-memoization` error; two unrelated warnings also remain |
| `npm run build` | No pass claimed — initial attempt could not resolve `fonts.googleapis.com`; approved retry did not return a terminal result from this environment |
| `git diff --check` | Pass |

### Route-pack visual evidence

The in-app browser was set to 1440×900 and navigated to
`http://localhost:3000/claims`. The local app returned `ERR_CONNECTION_REFUSED`,
so neither the populated 1440×900 view nor the required 1024px check could be
captured. No screenshot is claimed. Repeat the Cases route inspection when a
persistent local server and merchant session are available.

## File and module budget

- New reusable production modules: 0
- Production files changed: 6
  - `app/(app)/claims/ClaimsPageView.tsx`
  - `app/(app)/claims/ClaimsQueueClient.tsx`
  - `app/(app)/claims/page.tsx`
  - `app/(app)/claims/loading.tsx`
  - `app/(app)/claims/error.tsx`
  - `lib/ui/labels.ts`
- Focused test added: `tests/components/phase10Cases.test.tsx`

This is within §12.2's maximum of two new reusable modules and twelve
production files.
