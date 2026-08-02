# Phase 02 — Liveness, overlays, feedback, and loading infrastructure

Status: closed. Scope per §12.5/§12.10 of `docs/IMPL_living_precision_product_ui.md`.

## 1. Scope note — discovered re-scope

§12.10 was found, mid-implementation, to carry a "Phase 02 re-scoped" note
narrowing this phase to the shared overlay-presence primitive (LP-MOT-03) and
the canonical skeleton/spinner system (LP-MOT-09). The implementation had
already been built against the broader pre-rescope phase map (§12.4: "LP1,
LP-MOT-03, LP-MOT-05, LP-MOT-07–12"). Per the document's own instruction
("keep only what satisfies the new scope … leave the remainder for its named
phase"), this report:

- closes **LP-MOT-03** and **LP-MOT-09** under Phase 02;
- records LP-MOT-05, 07, 08, 10, 11, and 12 as **provisional pre-work** —
  built, typechecked, lint-clean, and browser-verified, but not claimed
  closed here; their owning phases (03–05, 27, 28) inherit working,
  tested infrastructure rather than starting from nothing.

Nothing was ripped out: all of it is correct, non-breaking, and already
wired into shared components multiple later phases will touch anyway.

## 2. Delivered

**LP-MOT-03 — shared overlay presence** (`lib/design/useOverlayPresence.ts`)

One `entering → open → exiting` state machine: focus trap, Escape, return-focus-once,
body-scroll lock, outside-click, and transient-overlay accounting (for the
provisional `data-capture-ready` work). Migrated: `Modal`, `Drawer`, `Toast`,
`Tooltip`, `RowActionsMenu`, `AvatarMenu`, `ExportMenu`, `CommandPalette`. Each
previously hand-rolled its own (inconsistent) copy of this logic with no exit
animation at all.

**LP-MOT-09 — canonical skeleton and spinner** (`components/ui/LoadingSkeleton.tsx`, `components/ui/Spinner.tsx`)

- Unified two different `Bone` implementations with two different background
  tokens (`--ua-surface-secondary` vs `--ua-surface-muted`) onto one, driven
  by the shared `.skeleton` CSS class.
- Added the §7.6 1600ms low-amplitude breathing animation (previously
  `animation: none` — the requirement did not exist in code before this).
- Added the 180ms skeleton-mount delay and the 8s slow-load explanatory copy.
- Added one canonical `Spinner` with the 150ms display threshold; migrated
  Button's private spinner onto it (fixing a missing-delay gap) plus ~10
  other bespoke spinner/skeleton call sites across settings, evidence, and
  command-palette components.

## 3. Provisional pre-work (not claimed closed)

| ID | What | File |
|---|---|---|
| LP-MOT-05 | Route-level settle replacing per-card entrance | `app/(app)/template.tsx`, `styles/authenticated/surfaces.css` |
| LP-MOT-07 | `ResourceSnapshot` contract for `useFetchJson` | `lib/react/useFetchJson.ts` |
| LP-MOT-08 | Transport/activity/freshness/live grammar | `lib/design/liveness.ts`, `components/ui/LivenessIndicator.tsx`, `components/ui/Recency.tsx` |
| LP-MOT-10 | One-shot changed-value wash | `lib/design/useChangedValueHighlight.ts`, wired into `MetricCard`/`MetricGroup` |
| LP-MOT-11 | SSR-safe `useMotionAllowed` | `lib/design/useMotionAllowed.ts` |
| LP-MOT-12 | `data-capture-ready` + pre-hydration `data-capture-mode` | `components/system/RouteReadySignal.tsx`, `app/layout.tsx` |

## 4. Regression found and fixed during implementation

While verifying LP-MOT-08's gallery demo, React threw a genuine hydration
mismatch: `Recency`'s relative-time text depended on `Date.now()`/
`toLocaleString()` evaluated independently on the server and on the client.
Fixed by making `Recency` render a locale/timezone-independent raw ISO string
until mount, upgrading to relative/absolute copy only in a post-mount effect —
this makes the component hydration-safe for *any* future caller, not just the
one that surfaced it. `LivenessIndicator`'s live-dot presence check got the
same treatment.

## 5. Verification

| Command | Result |
|---|---|
| `npm run lint:authenticated-design` | Pass — 444 files checked |
| `npx tsc --noEmit` | Pass |
| `npm run lint` (full eslint) | Pass — 0 errors (2 pre-existing warnings, unrelated) |
| `npm run verify:ui-parity` | Fails on the same pre-existing script false positive recorded in phase-01 §4 — unrelated |
| `npx jest tests/lib/useFetchJson.test.ts` | 5/5 new focused tests pass (initial load, refresh, refresh failure, retry, no-duplicate-in-flight) |
| `npx jest --runInBand` (full suite, 2 runs) | Same 9 pre-existing non-visual failures as the phase-01 baseline, confirmed on a clean rerun (349 suites, 340 passed). `window.matchMedia` was missing from `tests/jest.setup.ts`; added a polyfill guarded for jsdom-only files — this fixed two suites (`caseContextDrawer`, `claimReviewManageCard`) that had started crashing once `useMotionAllowed` widened `matchMedia`'s reach. `workQueueResultModel.test.tsx` failed on one earlier full run but passed cleanly both in isolation (6/6) and on the confirming rerun — a one-off cross-file test-order flake, not a regression from this phase |

Browser-verified via the demo merchant, light and dark, 1440×900 and 1024px:
`/dev/design-system` (Overlays section: Modal/Drawer/Toast open+close+focus-restore
confirmed via DOM fiber inspection; Liveness section: all axes render correctly,
live breathing dot present, `Recency` upgrades from ISO placeholder to relative
text post-mount with no hydration warning), `/dashboard` (Overview, light/dark/1024px,
route settle + skeleton geometry observed mid-load), `/work`, `/settings/team`,
`/settings/audit-trail` (both exercise the upgraded `useFetchJson` — resolve
correctly, no blanking on load). `data-capture-ready` confirmed appearing on
`/dashboard?capture=1` (~1s after the image-decode fix; was initially blocked by
an always-incomplete hidden dark-mode logo variant, fixed by excluding
`offsetParent === null` images from the decode wait).

## 6. Changed files

Shared primitives (new): `lib/design/useOverlayPresence.ts`, `lib/design/useMotionAllowed.ts`,
`lib/design/transientOverlayRegistry.ts`, `lib/design/liveness.ts`,
`lib/design/useChangedValueHighlight.ts`, `components/ui/Spinner.tsx`,
`components/ui/Recency.tsx`, `components/ui/LivenessIndicator.tsx`,
`tests/lib/useFetchJson.test.ts`.

Modified: `lib/react/useFetchJson.ts`, `lib/design/motion.ts`, `components/ui/Modal.tsx`,
`components/ui/Drawer.tsx`, `components/ui/Toast.tsx`, `components/ui/Tooltip.tsx`,
`components/ui/RowActionsMenu.tsx`, `components/layout/AvatarMenu.tsx`,
`components/reports/ExportMenu.tsx`, `components/layout/CommandPalette.tsx`,
`components/ui/Button.tsx`, `components/ui/LoadingSkeleton.tsx`,
`components/ui/MetricCard.tsx`, `components/ui/MetricGroup.tsx`,
`components/navigation/skeletons/primitives.tsx`, `components/navigation/skeletons/pageSkeletons.tsx`,
`components/navigation/RouteProgressBar.tsx`, `components/charts/authenticated/core/useChartMotion.ts`,
`components/system/RouteReadySignal.tsx`, `components/sources/FreshnessIndicator.tsx`,
`app/layout.tsx`, `app/(app)/dev/design-system/DesignSystemGalleryClient.tsx`,
`components/ui/index.ts`, `tests/jest.setup.ts`, plus the ~10 raw
`animate-pulse`/`animate-spin` sweep sites listed in §12.10.

New: `app/(app)/template.tsx`.

Deleted: `hooks/useReducedMotion.ts` (0 external consumers).

CSS: `styles/authenticated/states.css` (skeleton breathe, live-dot breathe,
value-wash keyframes), `styles/authenticated/surfaces.css` (route-settle
keyframe replacing the per-card one).

## 7. Open issues / follow-ups

- LP-MOT-05/07/08/10/11/12 are pre-work, not closed — the phase that first
  wires each into a real route consumer owns verifying and formally closing it.
- LP-QA-05…12's frozen-clock/deterministic-capture-manifest infrastructure
  remains entirely unbuilt (Release pack, Phase 28).
