# Phase 12 — Losses registry and loss detail

Status: implemented; populated route smoke and responsive checks passed, with
screenshot-based route-pack capture pending. Scope per §12.4/§12.6 of
`docs/IMPL_living_precision_product_ui.md` (R11–R12; `/losses` and
`/losses/[id]` only).

## Scope and implementation

- Rebuilt `/losses` on the canonical `PageFrame`, `MetricGroup`, and one
  `RegistrySurface`. The first metric is net unrecovered value, followed by
  recoverable value, confirmed loss, and the record count.
- Added an immutable loss trend sourced from `case_financial_entries.effective_at`.
  It stacks confirmed loss by canonical cause, keeps the top five plus Other,
  exposes an accessible data-table alternative, and never uses mutable
  `updated_at` as the aggregate date.
- Replaced the repeated legacy insight/rail composition with a ranked cause
  contribution view, cause filter chips, and a single filterable loss ledger.
  Missing source metadata is secondary within the loss cell instead of a
  repeated empty table column. The Other filter and ledger selection share the
  same cause keys.
- Re-composed `/losses/[id]` around `DetailPageShell`, a human-readable title,
  a reconciled waterfall formula, and a joined attribution/recovery/linked
  records/evidence/activity surface. Hash IDs remain reference metadata only.
- Preserved zero versus unavailable semantics. The read path prefers
  `known_states`; for the current merchant schema where that column is absent,
  the registry retries the supported summary projection and derives known
  stages only from immutable financial entry states. Unsupported numeric
  defaults remain unavailable.
- Kept write-off mutation behavior and API boundaries unchanged, but made the
  detail action truthful: already-written-off, no-outstanding, and unreconciled
  records explain why no write-off action is offered; an available action still
  requires a rationale and uses the existing append-only endpoint.
- Added route loading, error, and not-found states using the canonical
  operational route-state primitives.

No ledger calculation, attribution meaning, currency conversion, or write-off
mutation was changed.

## Verification

| Command/check | Result |
|---|---|
| `npx jest tests/components/phase12Losses.test.tsx tests/unit/lossFinancialDisplay.test.ts tests/unit/authenticatedChartSelectors.test.ts --runInBand` | Pass — 3 suites, 13 tests |
| `npm run typecheck` | Pass |
| `npx eslint …Phase 12-owned files…` | Pass |
| `npm run lint:authenticated-design` | Pass — 454 files; ratchets unchanged |
| `npm run build` | Pass — production compile, TypeScript, 93 static pages, and route manifest |
| `npx playwright test --config=tests/playwright.config.ts tests/current/current-product.spec.ts --project=desktop --grep '/losses renders'` | Pass — authenticated `/losses` smoke at 1440×900 |
| `npx playwright test --config=tests/playwright.config.ts tests/current/authenticated-redesign.spec.ts --project=desktop --grep 'seeded dynamic record routes'` | Pass — seeded populated `/losses/[id]` route exercised |
| `npx playwright test --config=tests/playwright.config.ts tests/current/accessibility-responsive.spec.ts --project=desktop --grep '/losses'` | Pass — serious/critical axe and no-clipping checks; release widths include 1024 and 1440 |
| `git diff --check` | Pass |
| `npm run verify:ui-parity` | Known pre-existing dirty-worktree failure: missing `/` and `*`, plus `router.push( 22 -> 20`; no Phase 12-owned `router.push` removal |

The authenticated run logs the known current-merchant schema gap around
`case_clarification_requests.partner_id`/the partner relationship on unrelated
claims surfaces; the seeded dynamic route test still passes. The build emits
one CSS optimizer warning for an arbitrary rounded token but exits successfully.

## Route-pack visual evidence

Automated signed-in evidence exercised `/losses` at the desktop 1440×900
viewport, followed a seeded loss row into `/losses/[id]`, and passed the
responsive/overflow matrix at 320, 390, 768, 1024, and 1440 widths. The axe
check passed with no serious or critical violations after removing interactive
nested chart semantics and low-contrast ledger count treatment.

No deterministic screenshots are claimed in this report. The populated
1440×900 and 1024×900 screenshot capture remains the open Route-pack visual
proof; the current authenticated merchant is sufficient for smoke and
responsive checks but the phase report does not claim screenshot review.

Prior-phase pack: N/A — no shared primitive or shared stylesheet changed.

## File and module budget

- New reusable production modules: 1 — `components/losses/LossVisuals.tsx`
- Production files changed: 11
  - `app/(app)/losses/page.tsx`
  - `app/(app)/losses/loading.tsx`
  - `app/(app)/losses/error.tsx`
  - `app/(app)/losses/[id]/page.tsx`
  - `app/(app)/losses/[id]/loading.tsx`
  - `app/(app)/losses/[id]/error.tsx`
  - `app/(app)/losses/[id]/not-found.tsx`
  - `components/losses/LossActions.tsx`
  - `components/losses/LossLedger.tsx`
  - `components/losses/LossVisuals.tsx`
  - `lib/losses/readModel.ts`
- Focused test added: `tests/components/phase12Losses.test.tsx`

This is within §12.2's maximum of two new reusable modules and twelve
production files.
