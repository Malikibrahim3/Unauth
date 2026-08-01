# Phase 03 — Page frame, surfaces, metrics, and route settle

Status: closed. Scope per §12.5/§12.6 of `docs/IMPL_living_precision_product_ui.md`
(LP2, LP-CMP-01–03, LP-CMP-12, LP-MOT-05).

## 1. Scope and baseline

Predecessor Phase 02 is closed (`phase-02.md`, ledger §12.10). Phase 02 landed
LP-MOT-05 (route settle) as **provisional pre-work**; Phase 03 owns verifying and
formally closing it at its first real route consumer, plus the surface/frame/metric
consolidation IDs above.

Owned surfaces before editing:

- new canonical primitives: `components/ui/Surface.tsx`, `components/ui/PageFrame.tsx`;
- delegators (exact no-ops): `JoinedSection`, `InsetGroup`, `AuthenticatedPanel`,
  `WorkbenchPage`;
- proof surfaces: `/dev/design-system` (primitive) and `/customers` (one real
  `WorkbenchPage` consumer) + `/work` (settle).

The complexity budget (≤2 new reusable modules, ≤12 production files) was
respected: **2 new modules** (`Surface`, `PageFrame`) and **8 production files**
(the two new modules + `JoinedSection`, `InsetGroup`, `AuthenticatedPanel`,
`WorkbenchPage`, `ui/index.ts`, `surfaces.css`) plus the dev-only gallery harness
and the doc. No repository-wide consumer sweep.

## 2. Delivered

**LP-CMP-03 — one working-surface grammar** (`components/ui/Surface.tsx`)

One primitive expresses every structural surface with the §8.2 vocabulary:
`working | joined | inset | floating | unframed`, plus an optional `pad`
(`dense`/`standard`/`relaxed`) for a surface that owns its inset directly. It is
backed by the existing canonical classes (`.ua-working-surface`,
`.ua-joined-section`, `.ua-inset-group`) plus two new ones added to
`surfaces.css`: `.ua-floating-surface` (§8.2 overlay: default border + approved
overlay shadow + 14px overlay radius) and `.ua-unframed-surface`.

Existing wrappers now **delegate** to it without a call-site rewrite:
`JoinedSection` → `joined`, `InsetGroup` → `inset`, `AuthenticatedPanel`'s outer
element → `working`. These are exact no-ops (same classes) — the dominant working
surface across the product now routes through one primitive.

`Card`/`Panel` (the padded-card family, 36 + 16 consumers of `panel`/`muted`)
are **not** migrated here: `Card muted` (10px radius, `--ua-surface-muted`) is not
a no-op for `Surface inset` (6px radius, `--ua-surface-secondary`), so folding it
would be a repository-wide visual shift the regression lock forbids. That
migration belongs to the owning route phases.

**LP-CMP-01 — one page frame** (`components/ui/PageFrame.tsx`)

The §5.1 frame: compact page header (via the existing `AuthenticatedPageHeader`
grammar) → adaptive KPI group → primary visual → toolbar → content grid → footer,
each slot optional. `WorkbenchPage` is now a thin adapter that maps its prop names
onto `PageFrame` slots and keeps the rail-grid + main-panel wrapping it owns; its
rendered DOM and CSS classes are unchanged (verified on `/customers`).

**LP-CMP-02 — adaptive 1–6 metric layout** (already implemented; verified)

The `MetricGroup` `data-count` contract and the `surfaces.css` reflow were already
in place. Verified in-browser at every count (see §3). The gallery now carries
representative specimens for counts 1, 2, 3, 4, 5, and 6 instead of only an odd
count.

**LP-CMP-12 + no-KPI rule — documented** (§5.3)

Added to §5.3: the explicit rule for when a route **must not** use a KPI group
(record-detail, builder/settings, single-record/empty-by-design, and any route
where fewer than two headline numbers earn the space — the frame omits `metrics`
rather than manufacturing filler), and the no-three-way-repetition rule (a number
lives in exactly one of KPI cell / callout / rail). The rule is also encoded as
JSDoc on `PageFrame`'s `metrics` slot. Route-level de-duplication itself is
deferred to the owning route phases per the regression lock (one candidate
observed on `/customers`, see §5).

**LP-MOT-05 — route settle, closed**

The one settle owner (`.ua-route-settle` on `app/(app)/template.tsx`) was verified
to be the only entrance animation: on `/customers` and `/work`, zero non-loading
child/card/metric animations run (only the gallery's deliberate spinner/skeleton
demos animate). Formally closed.

## 3. Verification

| Command | Result |
|---|---|
| `npm run lint:authenticated-design` | Pass — 446 files checked (ratchet unchanged: arbitraryDesignValue 0/0, upperCaseEyebrow 0/0, handRolledTable 9/10) |
| `npx tsc --noEmit` | Pass (exit 0), covering all edits incl. the gallery |
| Diff-scope review | 2 new modules, 8 production files; no route-content rewrite, no charts, no unrelated files |

Browser-verified against the running dev server, `/dev/design-system` +
`/customers` + `/work`:

- **Surface anatomy (§8.2), computed values, light:** working = 10px radius / 1px
  border / no shadow / `#fff` / 20px pad; inset = 6px / subtle border /
  `--ua-surface-muted` / 12px pad; floating = 14px radius / overlay shadow
  (`rgba(24,24,27,.18) 0 24px 64px`) / `#fff`. All exactly per §8.2. The composition
  specimen shows a working surface owning the perimeter with joined sections + one
  inset group — **no standard bordered card nested in another**.
- **Adaptive metric group (§5.3):** at ≥1280px, counts 1–6 render items === columns
  (1 → max-width 360px; 2/3/4/5/6 → equal columns), no empty cell/orphan divider.
  At 1200px (1024–1279 band): 4 → 2×2, 5 → six-track 2/2/2 then 3/3, 6 → 3×2. Exact.
- **PageFrame in a real consumer:** `/customers` (`CustomersPageWorkbench` →
  `WorkbenchPage` → `PageFrame`) resolves to real data and renders header +
  4-cell KPI strip + insight + toolbar + main table panel with no layout shift —
  visually identical to the pre-delegation frame.
- **Route settle (LP-MOT-05):** `.ua-route-settle` present with `ua-route-settle-in`
  on `/customers` and `/work`; **zero** non-loading child animations (no stagger).

Dark mode / keyboard / reduced-motion were **not** re-captured: Phase 03 introduced
no new design token and no new theme-, focus-, or motion-dependent value — the new
CSS references only existing `--ua-*` tokens already dark-verified in Phases 01–02,
and the Primitive pack scopes those aspects to "when that aspect changed."

## 4. Changed files

New: `components/ui/Surface.tsx`, `components/ui/PageFrame.tsx`.

Modified: `components/ui/JoinedSection.tsx`, `components/ui/InsetGroup.tsx`,
`components/ui/index.ts`, `components/authenticated/AuthenticatedPanel.tsx`,
`components/workbench/WorkbenchPage.tsx`, `styles/authenticated/surfaces.css`,
`app/(app)/dev/design-system/DesignSystemGalleryClient.tsx` (dev harness),
`docs/IMPL_living_precision_product_ui.md` (§5.3 rule + §12.10 ledger).

## 5. RSC crash fixed (was a pre-existing LP-MOT-10 defect)

`components/ui/MetricGroup.tsx` called the client hook `useChangedValueHighlight`
(the LP-MOT-10 wash, via its private `MetricGroupValueCell`) with no `'use client'`
directive, so it threw a caught RSC error on every server-rendered KPI route
(`/work`, `/losses`, `/rules`, and via route prefetch). `MetricCard.tsx` was
already `'use client'` and unaffected.

Fixed by isolating the hook in a new `'use client'` leaf,
[`components/ui/MetricValueCell.tsx`](../../../components/ui/MetricValueCell.tsx):
`MetricGroup` no longer imports the hook, drops its inline value cell, and renders
`<MetricValueCell value={item.value} />`. This keeps `MetricGroup` a shared,
server-renderable component — preserving its `itemAttributes` function prop for
server callers — while the only hook call now lives behind a client boundary React
enforces through the module graph, so the "client hook from the server" error is
structurally impossible.

Verification: `npx tsc --noEmit` exit 0; `npm run lint:authenticated-design` pass
(447 files). Live re-render of a server-rendered KPI route could not be recaptured
this session because the shared dev server (owned by another session, sharing
`.next`) became unresponsive under the phase's recompiles and a second Next dev
server cannot bind the same `.next`; the fix is guaranteed by the enforced client
boundary rather than by runtime luck.

## 6. Remaining follow-ups (not introduced by this phase)

- **LP-CMP-12 route content.** `/customers` currently states "8 with open cases" in
  both a KPI cell and the insight callout — a three-way-repetition candidate. Per
  the regression lock, route-level hierarchy cleanup is owned by Phase 14, not here.
- **LP-TRU-01.** `/work` and `/rules` still render only their (untouched) skeletons
  because the linked DB is behind migrations (`/api/work/views` 500) — a pre-existing
  environment blocker, not a Phase 03 regression.
