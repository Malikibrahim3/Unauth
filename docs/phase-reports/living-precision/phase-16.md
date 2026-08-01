# Phase 16 — Flows

Status: implemented; Route-pack visual proof pending. Scope per §12.4/§12.6
of `docs/IMPL_living_precision_product_ui.md` (R22–R25).

## Scope and implementation

- Rebuilt `/flows` as one `RegistrySurface`. The KPI strip, availability
  callout, and action-load rail are removed; the toolbar now contains only run
  history and the authorised new-flow action, with a truthful result count.
- Migrated `/flows/[id]` to the shared `BuilderShell`, removing its duplicate
  page header. The dominant work surface reads in order: `Trigger → Conditions
  → Bounded action`. The persistent review summary describes test/review/publish
  sequencing and publication unavailability once, without changing either.
- Draft comparison is now conditional on a real difference between a draft and
  published version. Empty impact panels and repeated lifecycle messages no
  longer render; version history remains available as audit context.
- Rebuilt `/flows/runs` as a headed run registry and `/flows/runs/[id]` as a
  structured execution record. Outcome, trigger event, timestamps, action
  order, step result, and failure context appear before raw data. Raw JSON is a
  native accessible disclosure rather than the primary run surface.
- Added run-list and run-detail route loading/error boundaries. The index
  loading state now matches its single registry rather than reserving metrics,
  an insight band, and a rail.

Trigger contracts, bounded-action validation, publication gating, execution
behaviour, and workflow audit records are unchanged.

## Verification

| Command/check | Result |
|---|---|
| `npm test -- --runInBand tests/components/phase16Flows.test.tsx` | Pass — 2 focused DOM tests |
| `npx eslint …Phase 16-owned files…` | Pass |
| `npm run typecheck` | Pass |
| `npm run lint:authenticated-design` | Pass — 460 files checked; all ratchets within baseline |
| Diff-scope review | Pass — no shared primitive API, workflow API, or domain contract changed |

## Route-pack visual evidence

The populated signed-in 1440×900 and 1024×900 Flow-route review remains open.
The approved local server started, but the in-app browser session could not
reach the localhost route under its URL policy; this report therefore makes no
screenshot or live visual-pass claim. The focused DOM test proves the causal
sequence and conditional draft comparison, and the route loading/error geometry
is established in source for the next authenticated inspection.

Prior-phase pack: N/A — `PageFrame`, `RegistrySurface`, `BuilderShell`, and
state primitives are consumed without changing their API or CSS contract.

## File and module budget

- New reusable production modules: 0.
- Production files changed: 12
  - `app/(app)/flows/page.tsx`
  - `components/rules/FlowsIndexClient.tsx`
  - `app/(app)/flows/[id]/page.tsx`
  - `components/rules/FlowVersionWorkbench.tsx`
  - `components/rules/FlowEditor.tsx`
  - `app/(app)/flows/loading.tsx`
  - `app/(app)/flows/runs/page.tsx`
  - `app/(app)/flows/runs/[id]/page.tsx`
  - `app/(app)/flows/runs/loading.tsx`
  - `app/(app)/flows/runs/error.tsx`
  - `app/(app)/flows/runs/[id]/loading.tsx`
  - `app/(app)/flows/runs/[id]/error.tsx`

This is within §12.2's maximum of two new reusable modules and twelve
production files. The focused test and this report do not count toward the
production-file budget.
