# Phase 08 — Work

Status: implemented; Route-pack visual gate pending. Scope per §12.4/§12.6 of
`docs/IMPL_living_precision_product_ui.md` (R10, R21; `/exceptions` redirect and
`/work`).

## Scope and implementation

- Made the first KPI explicitly describe the selected Work view; deadline risk
  remains a separately labelled aggregate across active work, so the two-metric
  strip has no repeated value.
- Consolidated the five primary views, `More`, `Save view`, and search into one
  operational toolbar. Ownership remains available through the existing `My
  work` and `Unassigned` system views; all remaining views stay behind `More`.
- Added a bounded `q` URL state for the client-side loaded-result search. It is
  retained by system-view links, deadline-band drill-downs, saved-view links,
  and linked-record return paths. Saved views deliberately do not persist free
  text.
- Kept saved-view unavailable distinct from an empty saved-view list, with the
  existing retry path intact; added focused proof for retained search context.
- Re-mirrored Work loading as two metrics, a deadline-band visual, toolbar, and
  table, without the unrelated insight or rail placeholders.

No case, exception, assignment, deadline, query count, or saved-view permission
semantics changed. `/exceptions` remains its exact redirect to
`/work?view=integration-exceptions`.

## Verification

| Command | Result |
|---|---|
| `npx jest tests/components/workQueueResultModel.test.tsx --runInBand` | Pass — 1 suite, 8 tests |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run lint:authenticated-design` | Pass — 451 files; ratchet unchanged |
| `git diff --check` | Pass |

### Route-pack visual evidence

The local `npm run dev` process did not remain available in this sandbox, so a
populated authenticated `/work` inspection at 1440×900 and 1024px could not be
captured. No screenshot is claimed. The changed toolbar, saved-view failure/retry,
visible-result, and retained-query behaviours are covered by the focused jsdom
mount. Repeat the normal Route-pack capture when a persistent authenticated local
server is available.

## File and module budget

- New reusable production modules: 0
- Production files changed: 4
  - `app/(app)/work/page.tsx`
  - `app/(app)/work/loading.tsx`
  - `components/work/WorkQueue.tsx`
  - `components/work/WorkQueuePulse.tsx`
- Focused test updated: `tests/components/workQueueResultModel.test.tsx`

This is within the §12.2 maximum of two new reusable modules and twelve
production files.
