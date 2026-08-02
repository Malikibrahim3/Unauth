# Phase 05 — Detail, board, settings, and builder shells

Status: closed. Scope per §12.4/§12.5 of `docs/IMPL_living_precision_product_ui.md`
(LP2, LP-CMP-05–08, LP-MOT-10).

## 1. Scope and baseline

Predecessor Phase 04 is closed (`phase-04.md`, ledger §12.10: `PageFrame`,
`Surface`, `MetricGroup`, `RegistrySurface`, `DataTable`, state primitives, and
the verified LP-MOT-07/08 grammar). Phase 02 landed LP-MOT-10 (the one-shot
changed-value wash) as **provisional pre-work**; §12.10 assigns verifying and
closing it to Phase 05 at its first real consumer. Phase 05 owns that plus the
four composition shells above.

This is a shared-system phase, not a route phase. Following the Phase 03/04
pattern, it lands the canonical primitives and proves them in the design-system
gallery plus, where one already exists, the single representative consumer. It
does **not** redesign production detail/board/settings/builder routes — those
migrate in their owning route phases (Detail 11–13/19–20, Settings 21–22, Rules
15, Flows 16). Regression lock respected: **no route-specific data or wording
changes**.

Owned surfaces:

- new canonical primitives: `components/settings/SettingsNav.tsx`,
  `components/ui/BuilderShell.tsx` (+ co-located `BuilderValidationSummary` /
  `BuilderSequence` / `BuilderStep`);
- refined existing owners: `components/workbench/DetailPageShell.tsx`,
  `components/settings/SettingsPageShell.tsx`, `app/(app)/settings/layout.tsx`;
- new shared CSS: `styles/authenticated/composition.css` (detail/board/
  settings-nav/builder families), imported in `styles/authenticated/index.css`;
- pruned dead CSS + skeleton mirror:
  `components/authenticated/AuthenticatedPageChrome.module.css`,
  `components/navigation/skeletons/pageSkeletons.tsx`.

Complexity budget (≤2 new reusable modules, ≤12 production files) respected:
**2 new modules** (`SettingsNav`, `BuilderShell`) and **10 production files**.
The dev-only gallery harness, the focused test file, and the doc do not count
per §12.2.

## 2. Delivered

**LP-CMP-05 — one detail shell** (`components/workbench/DetailPageShell.tsx`)

§8.4 requires "functional back navigation" and states "`DetailPageShell` must
render its existing `backHref`/`backLabel` contract" — but those two props were
declared and never destructured, so the only consumer (`/losses/[id]`) passed
them into a no-op. The shell now renders a real in-page back link
(`ArrowLeft` + `backLabel` → `backHref`) and adds the remaining §8.4 header
anatomy in one consistent place: a provenance/owner/updated `meta` row (typed
`DetailMetaItem[]`, mid-dot separated, each item optional) and previous/next
`recordNav` (a missing edge is a non-interactive `aria-disabled` span, never a
dead link). Identity uses the existing `--ua-text-detail-identity-*` tokens;
status stays in the header action slot. The API is additive, so the existing
`/losses/[id]` call keeps working and now shows its back link.

**LP-CMP-06 — board width/overflow geometry** (`.ua-board-*` in `composition.css`)

The only board (recovery) was a wrapping grid (`xl:grid-cols-3 2xl:grid-cols-5`)
that reflowed 8 stage columns into ragged rows. The canonical `.ua-board` is a
horizontal scroll rail inside its working surface: fixed-width columns
(288px, 272px ≤1279) with header (title + tabular count) and an independently
scrolling card body. Only the number of visible columns changes across 1024/
1280/1440 — never a column's legibility (§5.2) — and the board scrolls inside
the surface with no page-level horizontal overflow. Production recovery-board
migration is owned by Phase 13.

**LP-CMP-07 — grouped settings navigation + form column**
(`SettingsNav`, `SettingsPageShell`, `settings/layout.tsx`)

The settings nav was a flat ten-link strip that scrolled horizontally
(`overflow-x-auto`) once it ran out of room. `SettingsNav` renders the same ten
destinations grouped into always-visible labelled sections (Workspace /
Connections / Governance); it is presentation-only (takes `currentPath`, stays
server-renderable) and offers a `vertical` left-rail variant for the §5.4 form
layout. The real `settings/layout.tsx` now uses it — the ten-tab overflow strip
is gone. `SettingsPageShell` drops the fixed "Workspace controls" guidance card +
"Settings help" link that repeated on ~12 settings pages (§5.5) and constrains
the form to a single `.ua-settings-form` column (max 820px, §5.4). The
now-orphaned `.settingsGrid`/`.settingsMain`/`.guidance*` CSS-module classes are
removed, and the settings loading skeleton is updated to mirror the resolved
single-column screen (§8.6).

**LP-CMP-08 — one builder/configuration shell** (`components/ui/BuilderShell.tsx`)

Rules (`RuleVersionWorkbench`) and Flows (`FlowVersionWorkbench`) had grown the
same layout by copy-paste: a header card (status + version + readable summary +
simulate/edit/publish) above a `minmax(0,1fr) 340px` grid (readable config +
draft-impact aside). `BuilderShell` is that shared structure. It encodes the
§8.5 rules: one persistent `BuilderValidationSummary` whose tone carries state
(blocking = semantic-critical `role="alert"`; ready = success `role="status"`;
selection/accent never stands in), a live-preview aside fixed at 340px so it
never competes with the dominant work surface (Phase 05 gate), and a
`BuilderSequence`/`BuilderStep` causal list with a quiet 1px connecting rule and
CSS-counter numbering — not decorative flowchart nodes/arrows. Rules/Flows
migrate onto it in Phases 15/16.

**LP-MOT-10 — changed-value wash, verified and closed**

The Phase-02 pre-work (`lib/design/useChangedValueHighlight.ts` +
`.ua-value-wash`) is wired into the real `MetricCard` (and `MetricGroup` via the
`MetricValueCell` client leaf). Phase 05 verifies it at that real consumer: a
focused test proves no wash on first mount, exactly one wash when the value
changes (cleared after the 700ms highlight), and no wash when a re-render keeps
the same value. A live gallery demo drives the same MetricCard. No count-up.

## 3. Verification

| Command | Result |
|---|---|
| `npm run lint:authenticated-design` | Pass — 451 files; ratchet unchanged (arbitraryDesignValue 0/0, upperCaseEyebrow 0/0, handRolledTable 9/10 — no new `<table>`) |
| `npx tsc --noEmit` | Pass (exit 0), covering all edits incl. the gallery |
| `npx jest phase05Shells registrySurface` | Pass — 2 suites, 17 tests (11 new) |
| Diff-scope review | 2 new modules, 10 production files; no route-content rewrite, no fetch/data change, no charts, no unrelated files |

**Focused test coverage (Focused pack)** —
`tests/components/phase05Shells.test.tsx` (jsdom, real component mounts):

- DetailPageShell: back link renders `href`/label and `ua-detail-back`; the
  meta row renders provenance/owner/updated; `recordNav` renders a real next
  link and a disabled prev edge; no back link when `backHref` is omitted.
- SettingsNav: labelled groups render with every destination visible (no scroll
  strip); the active item carries `aria-current="page"`; `isSettingsNavItemActive`
  treats an exact route and any child route as active (incl. the `/integrations`
  item) and rejects siblings.
- BuilderShell: identity/actions/main/preview compose; a blocking validation
  summary is `role="alert"` with the critical treatment and a ready summary is a
  polite `role="status"`; the preview aside is a labelled `complementary`; the
  sequence is a real ordered list of steps.
- LP-MOT-10 at MetricCard: no first-mount wash; one wash on value change then
  cleared after 700ms; no wash on a same-value re-render.

**Browser verification (Primitive pack) — real CSS, isolated harness.** The
`/dev/design-system` gallery sits behind the authenticated `(app)` layout and
this session's browser is unauthenticated (safety rules prohibit entering a
password); starting a competing Next dev server would also risk the shared
`.next` owned by another session (the constraint documented and closed against
in phase-03 §5 / phase-04 §4). Rather than skip visual proof, the **real**
`composition.css` (plus `tokens`/`typography`/`status`/`surfaces`) was served in
an isolated static harness rendering each shell's exact markup, and inspected in
the Browser pane at 1440×900 and 1024×820, light and dark:

- Board: `scrollWidth 2436 > clientWidth` at both widths with
  `document.body.scrollWidth == innerWidth` (scrolls inside the surface, **no**
  page-level horizontal overflow); columns 288px→274px at ≤1279 stay legible.
- Builder grid computes `… 340px` (aside exactly 340px, never dominant) at both
  1440 and 1024; the blocking validation summary computes `role="alert"` on
  `--ua-critical-bg`.
- Settings nav renders three labelled groups with all ten links visible
  (horizontal and vertical), "Team" active.
- Dark mode resolves every family onto the correct `--ua-*` dark values
  (surface-muted `#29292e`, critical-bg `#422326`, border-default `#37373e`,
  text-primary `#f5f5f6`, text-secondary `#b8b8c0`).

The harness exposed one genuine finding: the board must sit in a containment
context (`overflow: hidden`, as `RegistrySurface` does, or `min-width: 0`) or a
plain-block wrapper lets the columns widen the page. `.ua-board` now carries a
defensive `min-width: 0` and the containment contract is documented inline; the
gallery specimen wraps it in a `Surface working` with `overflow: hidden`. The
harness was torn down (temporary `launch.json` entry reverted, servers stopped);
no repo file outside the changed set remains modified.

## 4. Changed files

New: `components/settings/SettingsNav.tsx`, `components/ui/BuilderShell.tsx`,
`styles/authenticated/composition.css`,
`tests/components/phase05Shells.test.tsx`.

Modified: `components/workbench/DetailPageShell.tsx`,
`components/settings/SettingsPageShell.tsx`, `app/(app)/settings/layout.tsx`,
`components/authenticated/AuthenticatedPageChrome.module.css`,
`components/navigation/skeletons/pageSkeletons.tsx`, `components/ui/index.ts`,
`styles/authenticated/index.css`,
`app/(app)/dev/design-system/DesignSystemGalleryClient.tsx` (dev harness),
`docs/IMPL_living_precision_product_ui.md` (§12.10 ledger).

## 5. Remaining follow-ups (not introduced by this phase)

- **Production shell migration.** No production detail/board/settings/builder
  route was redesigned (regression lock). Each migrates its own layout onto the
  Phase-05 shell in its owning route phase: recovery board + detail (13), case
  detail + evidence spine (11), losses detail (12), connected-object details
  (19–20), core/governance settings (21–22), Rules (15), Flows (16). The
  `SettingsNav` vertical left-rail variant is available for 21–22 to adopt.
- **DetailPageShell body spine.** Phase 05 owns the detail *header* anatomy; the
  §8.4 body order (lead visual → decision → evidence → connected → activity)
  stays with the record route phases.
