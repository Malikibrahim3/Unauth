# Phase 13 — Recovery board and recovery detail

Status: implemented; Route-pack visual proof pending. Scope per §12.4/§12.6
of `docs/IMPL_living_precision_product_ui.md` (R15–R16; `/recoveries` and
`/recoveries/[id]` only).

## Scope and implementation

- Re-composed `/recoveries` around its five adaptive metrics, a question-led
  weekly recovery visual, and the canonical horizontally-contained board. The
  former summary rail is gone, so the board never competes with five compressed
  columns beside it.
- The weekly visual uses only append-only `case_financial_entries` with an
  `effective_at` date. It treats `recoverable` as balance introduced,
  `recovered` as cash/credit movement, and `written_off` as balance removed.
  The displayed rate is cumulative recovered divided by cumulative recovered
  plus the outstanding balance. It does not reconstruct history from mutable
  recovery rows; fewer than three weekly points and mixed currencies render a
  named truthful chart state instead.
- Consolidated the board into four readable stages: Prepare, Submitted / follow
  up, Source outcome, and Reconciled. Every canonical recovery status is still
  assigned to exactly one stage and remains visible on each card through its
  semantic status label. No drag-and-drop workflow was added.
- Reordered cards around next action, recoverable value, deadline, evidence
  completeness, and source update. Existing actions, confirmation, external
  submission wording, idempotency, and status endpoints are unchanged.
- Rebuilt `/recoveries/[id]` with `DetailPageShell`, a factual
  sought → approved → recovered → outstanding progression, an evidence-readiness
  work surface, state-dependent next-action copy, and one joined
  correspondence/task/activity context. Approval remains explicitly distinct
  from recovered cash.
- Updated route skeletons to mirror the recovery trend/board and
  detail/progression/evidence/context geometry. The board header’s Partner
  rulebook link now targets the shipped `/rules/recovery` route.

## Verification

| Command/check | Result |
|---|---|
| `npx jest tests/components/phase13Recoveries.test.tsx tests/unit/recoveries/recoveryStatusSemantics.test.ts --runInBand` | Pass — 2 suites, 6 tests |
| `npx eslint …Phase 13-owned files…` | Pass |
| `npm run lint` | Pass |
| `npm run lint:authenticated-design` | Pass — 454 files; ratchets unchanged |
| `npm run typecheck` | Pass |
| `npm run build` | Pass — production build completed and emitted `.next/BUILD_ID` |
| Targeted Playwright Route pack | Not runnable here — the sandbox rejects the local server socket with `listen EPERM` on `0.0.0.0:3000` |
| `git diff --check` | Pass |

## Route-pack visual evidence

The populated signed-in 1440×900 and 1024×900 route review is still open: the
targeted Playwright check could not start its local server because this sandbox
rejects `0.0.0.0:3000` with `EPERM`. This report makes no screenshot,
responsive, or live-route claim. The focused component test proves the
four-stage board coverage, accessible weekly chart data table, and distinction
between approved and recovered progression values.

Prior-phase pack: `OperationalRouteSkeleton` gained a recovery-detail geometry
variant; no completed route consumer changed its default contract.

## File and module budget

- New reusable production modules: 1 — `components/recoveries/RecoveryVisuals.tsx`
- Production files changed: 8
  - `app/(app)/recoveries/page.tsx`
  - `app/(app)/recoveries/RecoveryBoardClient.tsx`
  - `app/(app)/recoveries/loading.tsx`
  - `app/(app)/recoveries/[id]/page.tsx`
  - `app/(app)/recoveries/[id]/loading.tsx`
  - `components/recoveries/RecoveryVisuals.tsx`
  - `components/states/OperationalRouteSkeleton.tsx`
  - `lib/recoveries/status.ts`

This is within §12.2’s maximum of two new reusable modules and twelve
production files. `tests/components/phase13Recoveries.test.tsx` and the
route-pack expectation update do not count toward the production-file budget.
