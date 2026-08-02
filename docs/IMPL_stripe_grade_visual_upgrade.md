# Unauth — Stripe-grade visual upgrade

**Status:** implementation specification. No product code has been written for this document.
**Date:** 2026-08-01 (rev 2)
**Scope:** every user-visible surface — authenticated app, public site, entry, onboarding, embedded.
**Verdict on the current build:** 6.0 / 10.
**Target:** 9.0 / 10 — Stripe Dashboard / Ramp / Linear execution, under Apple's interface principles.

> **Authority update — 2026-08-02:** For authenticated (`.ua-app`) surfaces,
> this document is superseded by
> [`IMPL_authenticated_execution_ledger.md`](IMPL_authenticated_execution_ledger.md) —
> written specifically because this document's own §11.1 acceptance greps sat
> at baseline three weeks after being marked complete. Its guidance for the
> public site, entry, onboarding, and embedded surfaces named in this
> document's scope line (see §9.11) remains in force until a dedicated
> programme replaces it.

---

## 0. How to read this document

### 0.1 Relationship to the existing authority — read this before editing anything

`docs/IMPL_decision_ledger_instrument_grade_final_iteration.md` ("Decision Ledger — Instrument
Grade") **remains the named authority**. This document is an amendment *under* it, not a replacement.

That is not deference — it is a build constraint. `scripts/verify-decision-ledger.mjs` hard-asserts
that `CLAUDE.md`, `styles/authenticated/README.md`, `.codex/rules/authenticated-product.md` and
`.cursor/rules/authenticated-design-system.mdc` each contain the literal string
`IMPL_decision_ledger_instrument_grade_final_iteration.md` **and** `IG-00` **and** `IG-16`. It also
asserts `package.json` exposes exactly five `*decision-ledger*` scripts and does **not** expose
`verify:apple-quality` or `verify:living-precision`.

> **Repointing those four files at this document fails `npm run verify:decision-ledger`.** If the
> team decides this document should become the authority, `scripts/verify-decision-ledger.mjs` must
> be updated in the same commit. Until then: leave the pointers alone. `[code]`

This document amends the authority on **five** points, each argued below. Everything else in it stands.

| # | Old rule | New rule | Argued in |
|---|---|---|---|
| 1 | §4.5 "Inline surfaces are flat" — shadows forbidden on panels, charts, metric blocks | One dominant working surface per view carries `--ua-elev-1` | §6.1 |
| 2 | §4.1 canvas `#F6F7F9` | canvas `#EEF0F4`, shell `#E7EAF0` | §6.1 |
| 3 | §4.3 rows 48 / 56 / 64 | 40 / 48 / 56 / 64, one class per registry type | §7.3 |
| 4 | §4.2 weights up to 650 | 400 / 500 / 600 only, or ship variable Inter | §6.4 |
| 5 | §5.2 signature primitives are "provided" | They exist but are **semantically inert**; specified properly in §8 | §8 |

Amendment 5 is not a disagreement — the authority doc reached the same conclusion itself at
lines 132-135: *"The signature system is mostly theoretical… DecisionSentence, RecordedOutcome, and
ActionDock have no real consumers."* This document supplies the specification that observation asks for.

### 0.2 Evidence classes

- **`[code]`** — read directly in source; file and line given.
- **`[render]`** — observed in the running app at 1440×900 and 1024×900, light and dark, against the
  real merchant workspace (Simeon Murray Store: 113 cases, 215 work items, 917 source records).
  106 screenshots across 30 route variants.
- **`[measured]`** — computed from shipped token values (WCAG contrast, CIE L\*, geometry ratios).
- **`[unverified]`** — inferred, not confirmed. Confirm before acting.

### 0.3 Verification results

Every P0 and the load-bearing P1s were re-verified line-by-line against the working tree.
**Nothing was refuted. Three counts were wrong and are corrected throughout. Two of my own earlier
claims were wrong and are corrected in §0.4.**

| Claim | Verdict | Proof |
|---|---|---|
| `danger` badge = red ink on green fill | **CONFIRMED** | `badgeStyles.ts` `danger.background = --ua-severity-definite-bg`; `status.css:74` = `#ebf7f1`, byte-identical to `--ua-success-bg` (`:30`). Dark too (`:181` `#18372b`) |
| `success` badge has no green ink | **CONFIRMED** | `success.color = --ua-neutral` (grey) on a green fill |
| `warning` badge carries a red border | **CONFIRMED** (new) | `warning.border = --ua-risk-high-border` `#e8c2c2` — same literal as `--ua-risk-critical-border` (`:54`) |
| ShipBob error ≡ success | **CONFIRMED** | `ShipBobIntegrationBanner.tsx:58` error bg `#ebf7f1`; `:56` success bg `#ebf7f1` |
| Focus ring paints a white halo | **CONFIRMED** | `tokens.css:175` first layer is opaque `--ua-surface-primary`; `foundations.css` applies it with `outline: none` |
| Dark has no elevation model | **CONFIRMED** | `--ua-surface-overlay` **does not exist**; `Modal.tsx:91` / `Drawer.tsx:81` use `--ua-surface-primary` = `#1b1c20` |
| `.text-caption` kills `font-semibold` | **CONFIRMED** | `typography.css` has **zero** `@layer` statements; `.ua-app .text-caption` sets weight 400. Unlayered CSS beats every layered utility |
| Weight 650 does not exist | **CONFIRMED** | `app/layout.tsx:17` `weight: ['300','400','500','600','700']` — an explicit array requests static instances |
| Work queue has no pager | **CONFIRMED** | grep for `Pagination\|Previous\|Next page\|page=\|ButtonLink` in `WorkQueue.tsx` returns nothing |
| Work pagination arithmetic is wrong | **CONFIRMED** | `work/page.tsx:56` `pageSize = 25`; `:150` fetches exceptions with `limit` only and `store.ts:116` has no offset, so exceptions repeat on every page while `resultEnd` sums both lists to 50 |
| Cases panes do not own overflow | **CONFIRMED** | `ClaimsQueueClient.tsx:146` `lg:max-h-none`; `tables.css:373` `max-height: none` at `lg`; preview has no height bound |
| Zero renders as "no data" | **CONFIRMED** | `RankedContributionChart.tsx` — `max === 0 ? <ChartState kind="empty" …>` |
| Fabricated "Peak £0.00" | **CONFIRMED** | `DashboardPositionChart.tsx:89-92` reduces with `>=` against `?? -1`; `:179` prints `Peak {value}` |
| Y-axis ticks left-aligned in a fixed gutter | **CONFIRMED** | `.timelineAxis` — `left:0; width:48px` with no `text-align`, no `overflow` |
| Forced colours collapses both series | **CONFIRMED** | `dashboardPilot.module.css:1471+` — `.timelinePrimaryBar, .timelineSecondaryBar { background: Highlight }` |
| Raw `source_order` in operator copy | **CONFIRMED** | `lib/reconciliation/detectors.ts:311-314` interpolates `rows[0].subject_entity_type` into title and description |
| Violet wash on passive metadata | **CONFIRMED** | `tables.css:357-360` `.ua-case-preview__priority { border-bottom: 1px solid var(--ua-accent-200); background: var(--ua-accent-50) }` |
| Cases section labels are a non-treatment | **CONFIRMED — closed loop** | `ClaimsQueueClient.tsx:331` `className="text-caption font-semibold"` + `letterSpacing: 0.06em`. Predicted render 12px/400/+0.72px/`#6b6b75`; **live DOM measurement returned exactly `12px / 400 / 0.72px / rgb(107,107,117)`** |
| "Ageing" fires after 72h | **CONFIRMED** | `lib/claims/sla.ts:75` `if (hours > 72) return { state: 'overdue' … }` |
| The product has no elevation | **CONFIRMED** | `--ua-shadow-raised` has exactly one consumer outside `tokens.css`; `tailwind.config.ts:203-211` maps `xs/sm/md/s0/s1/s2` → `--ua-shadow-none` |
| `MetricCard` is fully transparent | **CONFIRMED** | `surfaces.css:255-262` transparent background, transparent border, radius 0 |
| `.ua-focal-panel` has no radius | **CONFIRMED** | `surfaces.css:239-242` declares border + background, no `border-radius` |
| Sorting is dead code | **CONFIRMED** | grep for `sortable=\|onSort=` outside `DataTable.tsx` returns nothing |
| Doubled hairline on the dashboard | **CONFIRMED — worse** | `DecisionLedger.module.css:7` subtle bottom rule, then `dashboardPilot.module.css:154-158` `margin-top: 18px` + a darker top rule **and** a `border-bottom`, so it recurs below the canvas |
| Duplicate token layer disagrees | **CONFIRMED — new detail** | Dark `--ua-surface-primary` ships as **`#1b1b1e`** (`tokens.css:50`, `:258`) *and* **`#1b1c20`** (`:377`). And `tokens.css:26` `.ua-desktop-boundary` is a **fourth** declaration site with a third border value (`#d8d8dc` vs `.ua-app`'s `#d7d7de`) |
| EvidenceThread is semantically inert | **CONFIRMED** | `ClaimReviewContextColumn.tsx:221` hardcodes `authority: 'source'`; `instrument.css` styles `data-authority` only for `recommendation`/`decision`/`outcome` — `source`, `fact`, `inference` have **no rule** |
| `DesktopRequiredBoundary` blocks at 200% zoom | **REFUTED** | It is now a no-op pass-through returning `children`; the product reflows. Removed from this document |

**Corrected counts:** `font-weight: 650` — **40** in `app/`+`components/`+`styles/` (53 repo-wide; the
extra 13 are Chrome-extension and Gorgias-widget CSS *outside* the Inter context — do not sweep those).
`.text-caption` with a defeated utility — **57** lines, not 94. Severity-ladder consumers — **15
references across 8 files**, not 9.

**Line-number drift.** A concurrent session has uncommitted edits to `ClaimsQueueClient.tsx`,
`WorkQueue.tsx`, `surfaces.css`, `tables.css`, `LeadSummary.tsx`, `LossVisuals.tsx`,
`CommandPalette.tsx`, `AuthenticatedPageChrome.module.css`, `pageSkeletons.tsx` and `lib/ui/labels.ts`.
Line numbers were re-checked 2026-08-01 but **will drift — search by symbol, not by line.**

### 0.4 Corrections to rev 1 of this document

Two claims in the first revision were wrong. Both are corrected in place; recording them here because
they change what the team should work on.

**1. Motion is not broken — it is the strongest system in the codebase.** Rev 1 said the authenticated
stylesheet "contains four transition declarations in total" and that "table rows have none: every
hover is an instant snap." That was a bad grep. `controls.css:24-26` blankets **every `<button>` and
`<a>`** inside `.ua-app` with a tokenised colour/border/shadow transition, and `tables.css:24` blankets
**every `tbody tr`**. A search for `<div|li|tr|span>` carrying `onClick` returns **zero** matches — every
interactive affordance in the product is a real `<button>` or `<a>`, so essentially everything already
transitions. There are **zero** hardcoded Tailwind numeric durations and **zero** `transition-all`.
All four keyframes are tokenised and reduced-motion gated. The real motion findings are narrow and
listed in §7.6. `[code]`

**2. The money formatter layer is good, and the zero-vs-unavailable defect runs the other way.**
Rev 1 said to "find every place a null renders as 0". There are **zero** instances of
`format*(x ?? 0)` anywhere; `lib/canonical/money.ts` handles ISO exponents correctly (JPY 0, BHD 3)
and `formatMoneyOrDash` behaves. The actual defect is the **inverse and worse**: a genuine £0.00
renders as *unknown*. See §10.2 D1. `[code]`

### 0.5 Severity

**P0** — visibly broken or actively misleading in a financial product. **P1** — a primary reason the
product reads 6/10 not 9/10. **P2** — noticeable craft gap. **P3** — polish.

---

## 1. Executive summary

The product is not badly designed. Its information architecture is good, its restraint is right for a
financial tool, and several surfaces — Integrations, the Reports financial equation, the case dossier
header — are already near-professional. The problem is narrower and more fixable than "redesign it".

### 1.1 The reframe

**The data model already carries every distinction a world-class design needs. The UI throws it away.**

`ReconciliationFact` types `factKind` (source_fact / human_finding / inference), `freshness` (fresh /
stale / unavailable / unknown), and — critically — `supports[]` and `conflicts[]` per fact.
`MissingEvidenceItem` carries `attempted`, distinguishing *we asked and got nothing* from *we never
asked*. `NormalizedEvidenceItem` carries a per-item `confidence` grade. `ClaimDecisionContext` carries
typed `trackingGap` reasons and a `deliveryPhotoFinding` with its own rationale and timestamp.
`CASE_FINANCIAL_SUMMARIES` carries an explicit `known_states` set. `EvidenceChecklistItem` knows which
`contextField` backs it, its scoring `weight`, and a human `reason`. `[code]`

Almost none of it renders. The dossier flattens it into concatenated strings and — literally — text
glyphs. `components/claims/payout/EvidenceChecklistCard.tsx:59`:

```
const mark = isPresent ? '✓' : isMissing ? '○' : isUnavailable ? '–' : '–';
```

Evidence state drawn as three text characters — and note the last two branches are **identical**, so
*unavailable* and *unknown* render the same glyph. Meanwhile `EvidenceThread`, which already encodes
exactly those states as a designed node system, sits one import away rendering a uniform grey
timeline. `[code]`

> **The upgrade is not "invent a richer design". It is "render the truth the system already knows."**
> That is cheaper, more defensible, and it is where the wow actually is.

### 1.2 The five changes that matter most

If only five things happen, these five:

1. **Build the signature system** (§8). Six primitives are declared; in production they are inert.
   Making `EvidenceThread` show fact-vs-inference, freshness, **gaps** and **contradictions** is the
   single largest perceived-quality change available, and the data is already there.
2. **Give the product depth** (§6.1). Canvas→panel is 1.07:1 and `--ua-shadow-raised` is used on one
   toggle thumb. One tonal step and one elevation token change every screen at once.
3. **Enforce the type ramp** (§6.4). ~20 rendered sizes, 57 silently-dead utilities, and 40
   `font-weight: 650` declarations that render 700.
4. **Fix the colour map** (§6.3). `danger` badges are red-on-green. Not a taste issue — a defect.
5. **Fix the registry** (§7.3). No pager on Work, no sticky headers anywhere, sorting fully built and
   wired to zero surfaces, and a Cases layout that leaves ~2,500px of white void.

### 1.3 Nine root causes

1. **No layering.** Canvas→panel ΔL\* 2.8 (1.07:1); the rescuing hairline is 1.24:1. `--ua-shadow-raised`
   has one consumer — a 20px toggle thumb. Tailwind maps `shadow-xs/sm/md` to *none*. `[code][measured]`
2. **The design doc forbids the fix.** §4.5 bans the exact mechanism (hairline ring + 1px shadow) that
   makes a Stripe card read as an object. `[code]`
3. **The type ramp is declared but not enforced.** 560 `text-xs` + 571 `text-sm` + 154 `.text-caption`
   + ~60 hard-coded `fontSize:` against a token ramp almost nothing consumes. `[code]`
4. **Two typographic defects are broken, not loose.** `.ua-app .text-caption` is unlayered and defeats
   57 utilities; Inter loads as five static weights so 650 renders 700. `[code]`
5. **The colour map is wrong.** `danger` = red on green; ShipBob's error banner ≡ its success banner;
   `warning` wears a red border. Root cause: a severity ladder whose names invert its values. `[code]`
6. **Colour is worn out.** A red "Ageing" pill fires after 72h in a domain where waiting a week on a
   carrier is normal — so nearly every row in Cases and Work is red. `[code][render]`
7. **The registry is the weakest system**, and an operations buyer judges tables first. `[code][render]`
8. **There is no chart system** — four unrelated implementations; the one merchants see imports nothing
   from the file that declares itself the plot-geometry SSOT; ~2,000 of 2,954 lines ship to nobody. `[code]`
9. **No signature moment.** The six named primitives are ordinary rows wearing ambitious names — and
   the marketing site's *mock* of the evidence thread is better designed than the real one. `[render]`

---

## 2. The thesis: what "premium" means here

Six mechanical properties. Argue reviews in these terms, not in taste terms.

**1. Layering.** A viewer must be able to name, without effort, which plane each element is on: canvas
→ working surface → raised control → transient overlay. Tone *and* hairline *and* — for the dominant
surface only — a shadow so slight it reads as an edge rather than a lift.

**2. A hierarchy ramp that ramps.** Adjacent text roles differ on **at least two axes** — size *and*
weight, or weight *and* colour. Same-size same-weight neighbours read as unfinished regardless of how
correct the content is.

**3. Rhythm.** One spacing scale, obeyed. One panel anatomy. One gutter. Fourteen panel anatomies is
not variety, it is the absence of a system, and the eye registers it as sloppiness.

**4. Colour as information.** One accent — action / focus / selection / current series. Five semantic
families, reserved. A status colour firing on most rows is decoration.

**5. Numeric craft.** Tabular figures; one decimal policy; compact axis notation; right-aligned
currency; no over-precision; **a recorded zero visually distinct from an unavailable value**. In a
financial product this *is* the design.

**6. Response.** Every interactive element acknowledges pointer and keyboard within 100ms. This one
is largely already true (§0.4) — protect it.

### 2.1 Apple's principles, applied

Desktop web. Never imitate iOS/macOS chrome, SF Symbols, Liquid Glass, translucency, or traffic
lights. Apply the principles:

| Principle | Binding consequence |
|---|---|
| Clarity | No colour-only status; no unlabelled meter; no truncated alert (§9.1) |
| Deference to content | Chrome recedes; the case, the money and the evidence are loudest |
| Consistency | One panel anatomy, one type ramp, one pager, one badge vocabulary |
| Progressive disclosure | Decision first, provenance on demand |
| Predictable interaction | Selection never moves the row you clicked (§7.3); the rail never opens on hover |
| Immediate feedback | ≤100ms acknowledgement everywhere |
| Accessibility | Focus visible on every surface (currently broken twice over, §6.5) |
| Restrained motion | Motion explains causality only |
| Fit and finish | No clipped menu, no doubled hairline, no orphaned control, no 0%-meter that reads as a bug |

**Where they conflict with art direction, clarity wins.** If a deeper canvas or a stronger shadow ever
reduces the legibility of a financial value, the value wins.

---

## 3. The north star

What the product looks like when this is done. No images — read it as a walkthrough.

### 3.1 Overview

You land on a canvas that is unmistakably *behind* the work. The rail sits a step below it; the panels
sit clearly above it, each one an object with a hairline ring and a shadow you would not notice unless
it were removed. Nothing floats without reason.

One number leads: the payout exposure, at 32px, tabular, with its scope stated beneath it in 12px
tertiary — period, currency, case count. To its right, three supporting figures at 24px, visibly
subordinate, separated by hairline verticals rather than boxes. You can tell in half a second which
number is the headline and which three are context. Today they are all the same size.

The chart beside it answers the question in its title. Bars occupy roughly two-thirds of their band
instead of a third, so the series reads as a shape rather than as scattered posts. Five gridlines, not
three. Ticks say `£500`, not `£500.00`. The last x-label is not cut off. The peak annotation sits above
its own bar — and when the series is flat or empty, it does not appear at all, because a peak of zero
is not a peak.

Below, "What needs attention" is a ranked ledger with real column headers, where the share bar is
labelled and the arrow targets are 32px. The trust rail states source freshness with a meter that,
at zero, still reads as a deliberate zero rather than a rendering failure.

Nothing is red unless something is actually wrong.

### 3.2 The case dossier

The heaviest surface, and the one that should feel like nothing else on the market.

The header states the case in one line: customer, reference, value at issue, age, owner. Beneath it,
one sentence — generated, not written — saying what the system recommends and on what basis, with the
rule that produced it named and linked.

Then the evidence thread. A single hairline spine down the left, with each fact hanging off it. A
**source fact** carries a filled node and its provider's mark. A **human finding** carries a hollow
node. An **inference** carries a hollow node on a dashed segment — you can see, at a glance and without
reading, which parts of the story are observed and which are deduced. Stale facts are dimmed with their
age stated. And where a fact is *missing*, the spine goes dashed and the row is still there: the missing
fact is named, and next to it is the exact action that would close the gap — or, if we already asked and
got nothing back, that is said plainly instead.

Where two sources disagree, the thread joins them into a single bracketed pair with one critical marker
and the conflict stated once. This is the moment no competitor has, and the data for it —
`ReconciliationFact.conflicts[]` — is already being parsed and thrown away.

To the right, the decision. Not a form: a consequence. The recommendation, the amount, what changes
financially if you approve it, and one commit control in near-black — deliberately not violet, because
violet is for ordinary actions and this one is a recorded, irreversible commitment. Beneath it, once
you have decided, the recorded outcome: actor, timestamp, decision, amount, with a coloured spine that
matches the outcome rather than being green whatever you chose. It sits where you made the decision,
not four sections away at the bottom of the page.

The financial equation runs across the top of the recovery section: exposure − recovered = net, with
the operator glyphs actually rendered (they are implemented today and no caller has ever passed them),
each term stating whether it is known, partial or unavailable.

### 3.3 The test

A stranger, shown the dossier for five seconds, can say what the evidence shows, what is missing, and
what they are being asked to decide. That is the acceptance criterion for the whole programme.

---

## 4. Constraints: how to land this without breaking the build

**Read this before writing code.** The repo has ~25 automated gates that a visual upgrade trips. Most
run only locally — **CI gates almost none of it** (only `tests/current/current-product.spec.ts` at
1440 and 390 runs in GitHub Actions), so breakage surfaces late, at `release:readiness` or
`verify:decision-ledger`. `[code]`

### 4.1 The five mechanical rules

Every prescription in this document must be landed this way:

1. **Every new value is a `--ua-*` token declared in `styles/authenticated/tokens.css`.** That file is
   the only one in the guard's `ignored` set. A `#hex` or `rgb()` anywhere else in the scanned tree
   fails `check-authenticated-design.mjs` (`hardcodedColor`).
2. **Consume tokens only as `var(--ua-…)` inside arbitrary values.** `RATCHET.arbitraryDesignValue`
   is **0** — a single `h-[40px]`, `p-[6px]`, `gap-[10px]`, `text-[13px]` or `duration-[160ms]` fails
   the build. Row heights become `h-[var(--ua-table-row-height-compact)]`.
3. **No `hover:shadow-*`, no `transition-all`, no gradients.** `forbiddenMotion` bans the first two
   outright; `chartTexture` bans `linear-gradient(`, `radial-gradient(`, `<linearGradient>`,
   `<pattern>` and `feGaussianBlur` **anywhere in the scanned dirs**, not just in charts. The
   elevation ladder in §6.1 is therefore static box-shadow only — which is what it specifies.
4. **No file creation, rename or deletion matching the coverage-ledger name patterns without updating
   `docs/APPX_whole_product_visual_coverage_ledger.md` in the same commit.**
   `check-coverage-ledger.mjs` requires a ledger row for every `.tsx` whose basename matches
   `View|Screen|Modal|Dialog|Drawer|Panel|Menu|Popover|Tooltip|Toast|Skeleton|Loading|Error|Empty`.
   Renaming `MetricCard.tsx` → `StatTile.tsx` produces *both* a missing entry and an orphan. **This is
   the single highest-friction gate for component work.**
5. **Any new transition or animation must be covered by `foundations.css`'s
   `animation: none !important` reduced-motion block**, or `phase27-cross-product.spec.ts:152-169`
   and `living-precision-a11y.spec.ts:21-31` fail — both assert `document.getAnimations()` with
   `playState !== 'finished'` is exactly **0** under reduced motion.

### 4.2 Risk register

| # | Change | Fails | Enforced by |
|---|---|---|---|
| 1 | Any `#hex`/`rgb()` outside `tokens.css` + 10 grandfathered files | `hardcodedColor` | `check-authenticated-design.mjs` |
| 2 | New row height / spacing as an arbitrary literal | `RATCHET.arbitraryDesignValue = 0` | same |
| 3 | `--ua-elev-1` as a literal `boxShadow`, or any non-`--ua-` custom property | `arbitraryShadow`, `anyCustomPropRef` | same |
| 4 | Hover elevation via `hover:shadow-*`, or `transition-all` | `forbiddenMotion` | same |
| 5 | Any gradient in a scanned dir | `chartTexture` | same |
| 6 | Re-introducing `--ua-chart-1..5`, `--ua-violet`, `--ua-text-micro-*` etc. | `deletedTokenRef` | same |
| 7 | Any `<table>` outside the 4 allowed files | `RATCHET.handRolledTable = 0` | same |
| 8 | The `uppercase` class or `text-transform` anywhere | `RATCHET.upperCaseEyebrow = 0` | same |
| 9 | Changing `--ua-text-tertiary` from `#6b6b75` | literal string assertion | `phase27CrossProductSweep.test.tsx:262` |
| 10 | Changing which accent steps chip selection uses | literal class assertion | `registrySurface.test.tsx:118-122` via `contracts.ts:28-30` |
| 11 | Renaming `.ua-registry-surface`, `.ua-data-table--flush`, `.ua-data-table__row--selected`, `.ua-working-surface`, `.ua-joined-section`, `.ua-section-card--joined`, `.ua-metric-card__value`, `.ua-value-wash`, `.ua-detail-back`, `.ua-app`, `.ua-app-sidebar`, `.ua-desktop-product` | many | component tests, a11y specs, both capture harnesses |
| 12 | Merging or splitting settings / detail sections | hard-coded counts (4, 3, 3) | `phase21CoreSettings.test.tsx:100`, `phase19`, `phase20` |
| 13 | Creating/renaming any `*{View,Panel,Modal,Drawer,Menu,Skeleton,Empty,…}.tsx` | missing + orphan ledger rows | `check-coverage-ledger.mjs` |
| 14 | Adding or removing any `app/**/page.tsx` | 65-route assertion + glob reconciliation | `verify-decision-ledger.mjs` |
| 15 | Losing an `href`, `onClick` or `router.push` during restructure | interaction-count diff vs HEAD | `check-authenticated-functional-parity.mjs` |
| 16 | **Any visual change to `/demo`** | SHA-256 mismatch on `public/product-proof/*.webp` | `scripts/living-precision/capture.mjs` `verifyCheckedProductProof` |
| 17 | Any visual change, once release evidence is required | all 63 route scorecards invalidated; 2 reviewers needed on 7 flagships | `capture:decision-ledger:verify` |
| 18 | Lowering contrast anywhere on 29 core routes | axe `color-contrast` serious | `accessibility-responsive.spec.ts` |
| 19 | Two dark-mode role tokens collapsing to the same value | `size === 6` assertion | `phase27-cross-product.spec.ts:119` |
| 20 | Any new transition not covered by the reduced-motion kill switch | `getAnimations()` ≠ 0 | `phase27-cross-product.spec.ts`, `living-precision-a11y.spec.ts` |
| 21 | Wider/taller content at 320 / 390 / 768 / 1024 | reflow, `documentOverflow ≤ 1px` | `accessibility-responsive.spec.ts` (58 assertions) |
| 22 | Changing the changed-value highlight past 700ms | `jest.advanceTimersByTime(700)` | `phase05Shells.test.tsx:176-183` |
| 23 | Repointing the 4 authority files at this document | authority-needle + `IG-00`/`IG-16` | `verify-decision-ledger.mjs` |
| 24 | Renaming a merchant-facing heading | 15 banned patterns | `verify-merchant-copy.mjs`, `content-compliance.spec.ts` |
| 25 | Renaming chart headings or `data-auth-chart` values, or any chart token | literal assertions | `phase06Charts.test.tsx:61,65`, `chartContract.test.ts` |

### 4.3 What must be re-baselined at the end

- `public/product-proof/case-evidence.webp` and `case-recommendation.webp` — the only true golden
  bytes in the repo. Note the crop rectangles are hard-coded, so a layout shift on `/demo` silently
  re-crops the wrong region even after the hash is refreshed. Check the images, not just the hash.
- All 63 route scorecards for `capture:decision-ledger:verify`, with two independent reviewers on the
  7 flagship routes.
- `styles/authenticated/contracts.ts`'s `authenticatedDesignEthos` prose hard-codes
  `'200px expanded or 56px compact navigation plane, 52px utility toolbar'`. Nothing tests it, so if
  shell geometry changes this string becomes a lie no gate catches. Update it by hand.

---

## 5. The programme — everything, big to small

Ordered strictly by magnitude. Tier 1 changes what the product *is*; Tier 4 is nits. Ship the P0 block
regardless of tier.

### 5.0 P0 — correctness, ship first (~2 days)

Independent of everything below; none of it is blocked by the foundation.

| Item | Fix | §|
|---|---|---|
| `danger` badges red-on-green; `success` grey-on-green; `warning` red-bordered | Rewrite `CHIP_STYLES` so each row reads one family prefix | 6.3 |
| ShipBob error ≡ success banner | Repoint `error` to `--ua-critical-*` | 6.3 |
| Focus ring white halo | Replace with `outline` + `outline-offset` | 6.5 |
| `IconButton` and `Tabs` have no focus ring of their own | Give each an explicit ring | 6.5 |
| Work queue: no pager, wrong count, exceptions repeat every page | Add `Pagination`; give `listExceptions` an offset | 7.3 |
| Cases: neither pane owns overflow | Bound the grid, scroll both panes | 7.3 |
| Work row overflow menu clipped | Move to `rowActions` | 7.3 |
| Chart: zero renders as "no data"; fabricated `Peak £0.00`; both series identical in forced colours | §7.5 | 7.5 |
| A real £0.00 renders as `—` on a tile labelled "Recovered" | Drop `|| null` | 10.2 |
| `parseFloat(amount) || 0` turns garbage into `£0.00` | Guard `NaN` | 10.2 |
| Hardcoded `/100` in `formatMoney` — 100× error on JPY | Route through `lib/canonical/money.ts` | 10.2 |
| `source_order` in operator copy | Map through `lib/ui/labels.ts` | 10.1 |

### 5.1 Tier 1 — Structural

Each changes what the product fundamentally is.

**T1.1 — The signature system** (§8). *Largest item in the programme.* Six primitives specified,
built and adopted; the dossier recomposed around them. **Effort:** 8–12 days. **Depends on:** T1.2
(tokens), T2.1 (panel). **Trips:** gates 13 (new files), 15 (restructure), 17. **Acceptance:** the
five-second test in §3.3.

**T1.2 — Surface and elevation foundation** (§6.1). New neutral ramp, alpha borders, the elevation
ladder, and a real dark theme. **Effort:** 3–5 days. **Depends on:** nothing. **Blocks:** everything.
**Trips:** 1, 3, 9, 18, 19. **Acceptance:** canvas→panel ≥ 1.13:1; a dark overlay is distinguishable
from the panel beneath it; no axe contrast regression on 29 routes.

**T1.3 — The registry contract** (§7.3). Density classes, sticky headers, one pager, wired sorting,
bulk mode in place, skeleton parity, column widths. **Effort:** 5–8 days. **Depends on:** T2.1.
**Trips:** 2, 11, 12, 15. **Acceptance:** every registry has a sticky header, one pager, sortable
comparable columns, no layout shift on selection.

**T1.4 — The chart system** (§7.5). Collapse four implementations to one; delete the twelve dead
components; geometry, ticks, states, forced colours. **Effort:** 5–8 days. **Depends on:** T1.2.
**Trips:** 5, 13, 16, 25. **Acceptance:** every chart useful before interaction; values reconcile with
table and export; both series distinguishable in forced colours.

### 5.2 Tier 2 — System

Each changes every surface at once.

**T2.1 — One panel anatomy** (§7.1). Collapse fourteen anatomies to one. **Effort:** 3–4 days.
**Trips:** 11, 13. **Acceptance:** grep finds one panel class.

**T2.2 — The type ramp** (§6.4). Variable Inter (or the 650→600 sweep), kill the unlayered caption
rules, seven sizes, add the missing working-title role. **Effort:** 3–5 days. **Trips:** 2, 9.
**Acceptance:** ≤9 distinct rendered sizes; zero `font-weight: 650`; `@layer` present in typography.css.

**T2.3 — The colour contract** (§6.3). Delete the severity ladder, restate the five semantic families,
formalise the accent roles, implement the attention scale. **Effort:** 2–3 days. **Trips:** 1, 9, 10, 18.

**T2.4 — Controls and forms** (§7.4). The size ladder, the state matrix, 36 opacity-only disabled
states, `FormField` adoption across 149 labels. **Effort:** 4–6 days. **Trips:** 2, 15.

**T2.5 — The state system** (§7.7). Give the 8 unstyled `OperationalState` kinds real treatments;
collapse the two parallel empty-state systems; fix skeleton fidelity; delete 9 dead skeletons.
**Effort:** 3–4 days. **Trips:** 13.

**T2.6 — Motion** (§7.6). Narrow: add `opacity` to the transition property list, tokenise the spinner,
drop `framer-motion`, delete 15 unused keyframes. **Effort:** ½–1 day. **Trips:** 20.

### 5.3 Tier 3 — Surface

Per-page composition, in this order (§9): Overview → Cases → case dossier → Work → Reports → Recovery
→ Settings → Losses/Customers → Rules/Flows → Notifications/Help → public/entry → embedded.
**Effort:** 1–2 days each. **Depends on:** Tiers 1–2. Doing these first guarantees rework.

### 5.4 Tier 4 — Detail

Explicitly deprioritised; do them opportunistically while in the file. The notification badge anchor;
the "Cases 99+" cap vs the page's own 113; zero-count filter chips; "More views 6"; the single-item
bullet list on Reports; the `▶` disclosure markers; the `Records` column alignment on Integrations;
the three "Settings" identities on one screen; `LoadingState.tsx` containing no loading state.

---

## 6. Foundations

### 6.1 Surface and elevation `[P0]`

**Current** `[measured]` — `tokens.css:333-338`:

| Role | Value | L\* | Step to panel |
|---|---|---|---|
| canvas | `#F6F7F9` | 97.21 | ΔL\* 2.79 · **1.07:1** |
| shell | `#F1F2F5` | 95.50 | ΔL\* 4.50 · 1.12:1 |
| panel | `#FFFFFF` | 100.00 | — |
| border-subtle | `#E6E6EA` | — | **1.24:1** on white, **1.16:1** on canvas |

Shell → canvas is **1.04:1**. These are not distinguishable planes.

**Prescribed — light:**

```
--ua-canvas:            #EEF0F4   /* L* 94.75 — canvas→panel ΔL* 5.25 (1.14:1), ~1.9× today */
--ua-shell:             #E7EAF0   /* L* 92.63 — the rail becomes a distinct plane */
--ua-surface-primary:   #FFFFFF
--ua-surface-secondary: #F5F6F9   /* recessed group INSIDE a white panel */
--ua-surface-muted:     #EAECF1
--ua-surface-hover:     #F1F3F7
--ua-surface-selected:  #EAE8FF   /* accent-carried — see §6.3 */
```

**Borders move to alpha** so a hairline composites consistently. Opaque hex is why the same divider
currently reads as three different weights (1.08:1 on secondary, 1.16:1 on canvas, 1.24:1 on white).

```
--ua-border-hairline: rgb(24 26 42 / 6%)    /* NEW — internal dividers inside a panel */
--ua-border-subtle:   rgb(24 26 42 / 10%)   /* panel perimeter */
--ua-border-default:  rgb(24 26 42 / 15%)   /* control outlines */
--ua-border-strong:   rgb(24 26 42 / 28%)
--ua-border-control:  rgb(24 26 42 / 36%)
```

**Elevation ladder** — amendment 1 to §4.5:

```
--ua-elev-0: none;
--ua-elev-1: 0 0 0 1px rgb(23 23 27 / 6%),
             0 1px 2px rgb(23 23 27 / 5%),
             0 4px 8px -4px rgb(23 23 27 / 4%);
--ua-elev-2: 0 12px 32px rgb(23 23 27 / 12%);
--ua-elev-3: 0 28px 72px rgb(23 23 27 / 18%);
```

Rules that keep this from becoming card soup:
- Exactly **one** elevated surface per view — the dominant working object.
- `--ua-elev-1` **replaces** the perimeter border; never both (the ring is the shadow's first layer).
- Never on: table rows, nested regions, joined sections, selected items, metric cells, board columns,
  inline forms, chart plots.
- **Static only.** Gate 4 bans `hover:shadow-*`, so there is no hover elevation. This is the correct
  restraint for a financial tool anyway.

**Dark** — there is no elevation model at all today: every overlay and panel resolve to the same
`#1b1c20`, so a dropdown is byte-identical to the panel beneath it. **P0.** `[code][measured]`

```
--ua-canvas:            #0B0C0F   /* L*  3.3 */
--ua-shell:             #111318   /* L*  5.9 */
--ua-surface-primary:   #181A20   /* L*  9.3  panel */
--ua-surface-raised:    #1F222A   /* L* 13.3  ΔL* +4.0 */
--ua-surface-overlay:   #22252E   /* L* 14.7  ΔL* +5.4 — NEW token, does not exist today */
--ua-surface-secondary: #202329
--ua-surface-hover:     #22252C
--ua-border-hairline:   rgb(255 255 255 / 7%)
--ua-border-subtle:     rgb(255 255 255 / 12%)
--ua-border-default:    rgb(255 255 255 / 18%)
--ua-border-control:    #6A6F7C          /* 3.46:1 vs panel — passes WCAG 1.4.11 */
--ua-elev-1: 0 0 0 1px rgb(255 255 255 / 7%), inset 0 1px 0 rgb(255 255 255 / 5%);
```

**In dark, light is the elevation currency, not shadow.** Add `--ua-surface-overlay` and repoint Modal,
Drawer, Tooltip, Toast, Select menus and the command palette at it. Keep the six dark role tokens
mutually distinct or gate 19 fails.

### 6.2 Geometry `[P1]`

**Radius concentricity — unstated anywhere today, violated in five places:**

> **Inner radius = clamp(4px, outer − padding, outer − 4px). No two nested framed elements may share
> a radius value.**

| Outer | Inset | Inner |
|---|---|---|
| 12px panel | 20px | 8px |
| 12px panel | 12px | 4px |
| 12px panel | 0 | **0 — child must be flush, never its own card** |
| 16px overlay | 16px | 8px |

Known violations: `.ua-data-table` r12 inside a r12 panel at zero inset; `Card variant="panel"` r12
inside r12 containers; **`.ua-focal-panel` ships no radius at all**, so four call sites render square
white cards beside 12px ones and the loading skeleton visibly rounds off when data lands. `[code]`

**Border doubling:** `integrations/[provider]/page.tsx:164-262` renders a bordered r12 `detailStack`
whose direct children are four bordered r12 `Card`s. The `.detailStack > section` selector only
matches `<section>`, so `<div>` children keep their borders. Change to `> *`, and replace every
`Card variant="muted"` nested inside a card with a tonal plane (no border, `--ua-surface-secondary`,
8px radius). `[code]`

### 6.3 Colour `[P0]`

**P0 — `danger` badges render red ink on a green fill.** `badgeStyles.ts` `danger.background =
--ua-severity-definite-bg`, which `status.css:74` resolves to `#ebf7f1` — the same literal as
`--ua-success-bg`. Live at `CustomerProfilePageMainColumn.tsx:147` as the "Chargeback" badge. `[code]`

**P0 — the ShipBob error banner is identical to its success banner.**
`ShipBobIntegrationBanner.tsx:58` also uses `--ua-severity-definite-bg`. A failed OAuth handshake and
a successful connection render the same. `[code]`

**P0 — `success` and `warning` are cross-wired too.** `success` renders `--ua-neutral` **grey** ink on
a green fill (and the dot inherits `currentColor`, so it is grey too). `warning` takes
`--ua-risk-high-border` `#e8c2c2` — **the same literal as `--ua-risk-critical-border`** — so every
warning chip wears a red outline. Three of six rows are wrong. `[code]`

**Root cause — the severity ladder's names invert its values.** `status.css:73-80` defines
`--ua-severity-definite: #217a5b` (green). In a claims product "definite" reads as *definitely a
problem*; the token means *definite confidence*. Two engineers have already mis-read it. **Delete the
ladder** (`status.css:72-80`, `180-187`) and migrate its **15 references across 8 files**
(`badgeStyles.ts` ×3, `OnboardingClient.tsx` ×4, `AnalyticsDonutChart.tsx` ×3, `claimReviewStyles.ts`
×2, `claimsPageData.ts`, `ShipBobIntegrationBanner.tsx`, `HelpdeskSidebarPreview.tsx`,
`SyncStatusDisconnectedView.tsx`). If a confidence ladder is needed later, name it
`--ua-confidence-{high,medium,low,none}`. `[code]`

**Semantic families — replacement values.** Current tints are 100%-saturation hues with mid-tone
foregrounds at 5.25–6.04:1 — the clearest "default framework" tell in the product. `[measured]`

| Family | fg | bg | border | line |
|---|---|---|---|---|
| info | `#1d5a87` | `#eef4fa` | `#cbdcea` | `#5f90b5` |
| success | `#12684a` | `#eef6f1` | `#c3dfd0` | `#47916f` |
| warning | `#78530b` | `#f7f3e6` | `#e2d5ae` | `#b08c34` |
| critical | `#9c2b2b` | `#faeeee` | `#e6c6c4` | `#bf6a68` |
| neutral | `#5a5a63` | `#f2f2f4` | `#d9d9de` | `#94949d` |

Foregrounds land 6.76–7.52:1 on white, 6.10–6.63:1 on their own tint. Borders 1.26–1.40:1 against
their own fill. **Dark is already well calibrated (6.29–7.63:1) — do not re-derive it.**
**Do not change `--ua-text-tertiary` from `#6b6b75`** — gate 9 asserts the literal.

**The accent contract.** Violet = action, focus, selection, current series. Never status, severity or
freshness.

```
--ua-accent-50:  #F2F1FF   /* hover / heat only */
--ua-accent-100: #E6E4FF   /* selected control fill */
--ua-accent-200: #C9C6FA   /* selected control border — 1.62:1, vs today's invisible 1.33:1 */
--ua-accent-500: #5B5BD6   /* focus ring, 2px selection marker, primary action, current series */
--ua-accent-800: #303078   /* text on accent-100 */
/* delete --ua-accent-300 / -400 — zero consumers */
```

Changing which steps chip selection uses trips gate 10 (`registrySurface.test.tsx:118-122` asserts
the literal classes via `contracts.ts:28-30`) — update both in the same commit.

**Two confirmed violations:** `tables.css:357-360` puts the read-only "Review context" grid on
`--ua-accent-50` with an `--ua-accent-200` border while the selected row uses `--ua-surface-selected`
— selection and passive metadata share a hue. Fix: the metadata band becomes `--ua-surface-secondary`
+ `--ua-border-hairline`. And selection must be **hue-carried**: `#EAE8FF` against a neutral hover,
plus a 3px `--ua-accent-500` inset marker on the full row and `font-weight: 600` on the identity cell.
Today selected and hovered rows are 5/255 apart. `[code][measured]`

**The attention scale.** `lib/claims/sla.ts:75` marks anything over 72 hours `overdue`; `labels.ts`
maps that to "Ageing"; `STATUS_TONES` paints it danger red. The domain is claims awaiting carrier /
3PL / supplier responses, which routinely take a week. `[code][render]`

> **Hard rule: a state that fires on more than ~25% of visible rows may not use a tinted fill.**

| Level | Treatment | Use |
|---|---|---|
| 0 — ordinary | plain `--ua-text-secondary` text, no chip | the common case |
| 1 — worth noticing | neutral chip + a 6px dot in the semantic hue | "Ageing" belongs here |
| 2 — act now | full tinted chip | a hard breach only |

Raise the threshold to a per-claim-type deadline (or ≥168h), retone `overdue → warning`, and prefer
rendering **the age itself carrying the tone** (`6d open`) over a separate pill.

**Consolidate the five contradictory status→colour maps.** `STATUS_TONES` is canonical; `STATUS_META`,
two separate `SLA_COLOUR_MAP`s, `STATUS_COLOUR_MAP`, `slaToneStyle` (keyed on colour *names*) and
`GRADE_COLOURS` duplicate and contradict it. Delete them. Add an ESLint rule banning object literals
pairing a `--ua-*-bg` with a `--ua-*` foreground outside `components/ui/`. Also delete `GradeBadge`
and `lib/utils/confidenceStyles.ts` — they read an orphaned legacy palette and have zero usage. `[code]`

### 6.4 Typography `[P0]`

**P0 — 57 dead utility declarations.** `typography.css:144-158` declares `.ua-app .text-caption
{ font-weight: … }` as **unlayered** CSS (the file has zero `@layer` statements), which beats
Tailwind's `@layer utilities` regardless of specificity. Every adjacent `font-semibold`, `tracking-*`
or `leading-*` is silently discarded — including the Cases section labels. Fix: strip `font-weight`
and `letter-spacing` from those two rules, wrap the remainder in `@layer components`, migrate the 154
`.text-caption` / 2 `.text-meta` call sites to real role classes, delete the legacy names. `[code]`

**P0 — 46 declared weights do not exist.** `app/layout.tsx:17` loads Inter with an explicit
`weight: ['300','400','500','600','700']` array, requesting five *static* instances. The codebase then
declares `font-weight: 650` **40 times in-app** and `550` six times. Every in-app 650 renders **700**.
(13 further 650s live in Chrome-extension and Gorgias-widget CSS, outside the Inter context — do not
sweep those.) `[code]`

> Preferred fix: load Inter as a variable font — drop the `weight` key, add `font-optical-sizing: auto`
> on `.ua-app`. Then 550/650 become real. Otherwise sweep 650→600, 550→500 and update §4.2 of the
> authority doc.

**The ramp — consolidate ~20 rendered sizes to seven: 12, 13, 14, 16, 20, 24, 32.**

| Role | Size / leading | Weight | Tracking | Colour | Use |
|---|---|---|---|---|---|
| Hero value | 32 / 38 | 600 | −0.022em | primary | one financial hero per view |
| KPI value | 24 / 30 | 600 | −0.018em | primary | metric cells |
| Page identity | 20 / 26 | 600 | −0.012em | primary | one per page |
| Record identity | 20 / 26 | 600 | −0.012em | primary | dossier subject |
| Section identity | 16 / 22 | 600 | −0.006em | primary | panel + section headings |
| Working title | 14 / 20 | 600 | 0 | primary | row titles, chart titles, dialog titles |
| Body | 14 / 20 | 400 | 0 | primary | prose, form values |
| Dense | 13 / 18 | 400 | 0 | primary | table cells |
| Label | 13 / 18 | 500 | 0 | secondary | form labels |
| Caption | 12 / 16 | 400 | 0 | secondary | supporting text |
| Metadata | 12 / 16 | 500 | 0 | tertiary | provenance, timestamps |

**Tracking is a function of size, applied once**: ≥32px −0.022em · 24–28px −0.018em · 20px −0.012em ·
16px −0.006em · 13–14px 0 · 12px 0. Add `--ua-text-kpi-tracking` and `--ua-text-hero-value-tracking`
— they do not exist, so the two largest roles render at browser-default tracking while six ad-hoc
negative values are hand-authored elsewhere. **Do not add an uppercase eyebrow role** — gate 8 bans
`text-transform` outright. `[code]`

**Enforce the two-axis rule.** Caption and metadata are both 12/16 — separate by weight *and* colour.
Dense and Label are both 13/18 — same.

**Delete the second ramp.** `typography.css:109-139` re-declares the scale for `.ua-app` alone while
`.ua-auth-surface` keeps a compact variant. Auth screens do not need a second density. `[code]`

**Add the missing role.** The authority doc prescribes `Working title 16/22/600`; the token layer never
defined it, so panel headings render at **six** different sizes. `[code]`

**Inter Tight** is loaded and bound to no `--ua-*` token. Bind it as the display face for financial
heroes and public display type — it is what gives the landing page its confidence — or drop it. `[code]`

### 6.5 Focus `[P0]`

**P0 — the focus ring paints a white halo on every non-white surface.** `tokens.css:175` —
`--ua-shadow-focus: 0 0 0 2px var(--ua-surface-primary), 0 0 0 4px var(--ua-border-focus)`. The first
layer is an opaque 2px ring of the *panel* colour, applied by `foundations.css:27-31` with
`outline: none` to every focusable element. On the sidebar, the canvas, a hovered row, a selected row
and every semantic fill it renders as a white rectangle punched out of the background. `[code]`

> Fix: Safari has clipped `outline` to `border-radius` since 16.4 — the workaround comment at
> `foundations.css:24-26` is obsolete. Use `outline: 2px solid var(--ua-border-focus);
> outline-offset: 2px; box-shadow: none;`. Keep a single-layer shadow ring only for composite controls
> (the switch). Unify the 22 sites using `focus-visible:shadow-[inset_var(--ua-shadow-focus)]` — an
> inset 4px ring on a 28px chip eats a quarter of the control.

**P0 — two components have no focus ring of their own, and survive on a coincidence.** `IconButton.tsx:21`
and `contracts.ts`'s `tabContract.item` both set `focus-visible:outline-none` with **no replacement
ring**. They are visible only because the global rule in `foundations.css:27-31` wins a specificity tie
on source order — `styles/authenticated/index.css` is imported *after* `globals.css` in
`app/layout.tsx:7-8`. **Swap those two import lines and every icon button and tab in the product loses
its focus indicator.** Give each an explicit ring. `[code]`

### 6.6 Token hygiene `[P1]`

- **The base ramp is declared twice**: `tokens.css:57-246` at `.ua-app, .ua-auth-surface`, then 31
  tokens re-declared at `.ua-app` alone — 24 with different values, including inverting `--ua-shell`
  from white to grey while the comment three lines above still says it is white. **Worked cost:** the
  dark panel colour ships as **two values at once** — `#1b1b1e` (`:50`, `:258`) and `#1b1c20` (`:377`)
  — and `tokens.css:26` `.ua-desktop-boundary` is a **fourth** declaration site with a third border
  value (`#d8d8dc` vs `.ua-app`'s `#d7d7de`). Which one an element gets depends on selector
  precedence. Collapse to one block. `[code]`
- **`app/globals.css` declares 404 custom properties** resolving to 272 unique names, 132 duplicated,
  and **six squat on the `--ua-*` namespace** (`--ua-font-display`, `--ua-shadow-sm/md/lg/xl`,
  `--ua-section-y`). Rename to `--fl-*`, delete the dead `.dark` block, add a CI grep asserting
  `--ua-` is never *declared* outside `styles/authenticated/`. `[code]`
- **Tailwind legacy fallbacks**: every value is `var(--ua-x, var(--legacy-x))`; `s10`/`s11` have no
  `--ua-*` equivalent; `copper-bright/mid/dim` and bare `accent-500/600/700` still point at legacy
  vars; `rounded-sm` and `rounded-md` both resolve to 8px across 255 call sites. `[code]`
- **Spacing** stops at 48px; the authority doc names 64/80/96. Add `--ua-space-16/20/24`.
- **Stale pointers**: `DESIGN.md` and `.impeccable/design.json` still carry canvas `#F7F7F8`;
  `docs/IMPL_chart_visualisation_system.md` redirects to a superseded programme.

---

## 7. Component contracts

### 7.1 The canonical panel `[P1]`

**Fourteen distinct panel anatomies ship today** — no two share header height, inset or divider weight.
`AuthenticatedPanel` uses border-subtle / r12 / header `18/20/16` / body 0 but `> section { padding:
13px }`; `ChartFrame` uses border-**default** / r12 / header `12/15/10` min-height **54px** / plot pad
**15px**; `dashboardPilot` panels use their own insets again. Perimeters render in two different greys
side by side depending on which primitive a route happened to use. `[code]`

```
.ua-panel {
  background: var(--ua-surface-primary);
  border-radius: 12px;
  box-shadow: var(--ua-elev-1);      /* replaces the perimeter border — never both */
  overflow: hidden;
  --ua-panel-inset: 20px;
}
.ua-panel__header {
  min-height: 52px;
  padding: 14px var(--ua-panel-inset);
  border-bottom: 1px solid var(--ua-border-hairline);
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
}
/* title 16/22/600 primary · caption 12/16/400 tertiary at margin-top 2px
   actions right, gap 8px, 32px control height */
.ua-panel__body        { padding: var(--ua-panel-inset); }
.ua-panel__body--flush { padding: 0; }   /* table or joined sections only */
.ua-panel__footer      { min-height: 52px; padding: 10px var(--ua-panel-inset);
                         border-top: 1px solid var(--ua-border-hairline); }
```

**Rule:** perimeter = the elevation ring · internal divider = `--ua-border-hairline` · control outline
= `--ua-border-default`. Never `--ua-border-default` on a panel perimeter.

**Gate note:** naming this component's file `Panel.tsx` or anything matching the coverage-ledger
pattern requires a ledger row in the same commit (gate 13). Prefer extending the existing
`components/ui/Surface.tsx` over creating a new file.

### 7.2 KPI / metric surface `[P1]`

`MetricCard` composes `ua-card ua-card--panel` and then `surfaces.css:255-262` strips everything:
transparent background, **transparent border**, radius 0. A "card" with a transparent 1px border that
still consumes layout space, sitting directly on the canvas. `[code]`

**The KPI strip is one panel, not N cards.** `MetricGroup` becomes a single `.ua-panel` whose cells are
separated by `1px var(--ua-border-hairline)` verticals. Delete the transparency overrides. Retire
`LeadSummary` as a separate primitive; express "one lead fact + supporting facts" as a `data-lead`
variant — lead cell gets `--ua-surface-secondary` and the hero ramp, supporting cells stay white.

Cell anatomy: label 12/16/500 tertiary · value 24/30/600 primary tabular · caption 12/16/400 tertiary.
Lead cell value 32/38/600. Right-align when the strip is comparative, left-align when it is a single
ledger reading — pick one per surface, never mix within a strip.

**Gate note:** `.ua-metric-card__value` and `.ua-value-wash` are asserted by
`phase05Shells.test.tsx` — keep the class names, and keep the changed-value highlight ≤700ms (gate 22).

### 7.3 Registry / table `[P0]`

The primitives are well-conceived; almost none of the good parts are wired. `sortable`/`onSort` is used
by **zero** production registries, `rowActions` by two, `loading` by one, and the Work queue — the
most-used surface — bypasses `RegistrySurface` entirely. `[code]`

**P0 — the Work pager does not exist and its arithmetic is wrong.** `work/page.tsx:56` sets
`pageSize = 25` and ranges tasks correctly, but exceptions are fetched with `limit` and **no offset**
(`lib/exceptions/store.ts:116` supports only `.limit()`), so **the same exceptions appear on every
page**. The UI prints "Showing 1–50 of 215" — `resultEnd` sums two independently-paginated lists — with
no pager control at all. Pages 2+ are unreachable. `[code][render]`

**P0 — Cases master-detail: neither pane owns overflow.** `ClaimsQueueClient.tsx:146` is
`lg:max-h-none` and the preview has no height bound, so a 25-row list is ~3,400px tall, the detail pane
stretches to match, and ~2,500px of white void appears. `[code][render]`

```
.ua-case-queue          { display: grid; grid-template-columns: 360px minmax(0,1fr);
                          height: calc(100dvh - var(--ua-utility-header-height) - 96px);
                          min-height: 560px; }
.ua-case-queue__list,
.ua-case-queue__preview { height: 100%; overflow-y: auto; overscroll-behavior: contain; }
```

Note the app already locks the document to `100dvh; overflow: hidden` (`responsive.css:2-19`), so
`<main>` is the scroll owner. Any pane that does not own its own overflow makes content unreachable
rather than merely awkward. `[code]`

**P0 — the Work row overflow menu is clipped.** `WorkQueue.tsx:690-708` stuffs actions inside the 156px
`deadline` column next to a `whitespace-nowrap` date on a `table-layout: fixed` table. Move them to
`DataTable`'s trailing `rowActions` cell at a fixed 48px. `[code]`

**Row density — one contract**, replacing the three that ship simultaneously (doc says 48/56/64,
`tables.css` ships 40/44/52, `tokens.css` ships a dead 44/56 pair, and Work actually renders a ragged
64–76px because cells carry zero vertical padding):

| Class | Height | Surfaces |
|---|---|---|
| metadata | 40px | audit trail, flow runs, team, report records |
| default | 48px | Customers, Losses |
| rich | 56px | two-line identity cell |
| two-line | 64px | Work |

Add `.ua-data-table__cell { padding-block: var(--ua-space-2) }` and cap content so the declared height
is authoritative. **Declare these as tokens** — `h-[40px]` fails gate 2.

**Also required:**
- **Sticky headers** — there are none anywhere. Bound the body (`max-height: min(72vh, 860px)`) and
  stick `th` with `box-shadow: inset 0 -1px 0 var(--ua-border-hairline)` (a sticky `th`'s
  `border-bottom` does not paint reliably during scroll). `[code]`
- **One `Pagination` component**, always rendered so the footer is a constant 52px. Replaces five
  hand-rolled treatments; add real server pagination to Losses (currently `.limit(500)`),
  Notifications, Rules and Flows.
- **Wire sorting**, URL-backed (`?sort=lossValue&dir=desc`) and **server-side** wherever paginated —
  sorting only the visible page is a correctness bug.
- **Bulk mode swaps the toolbar in place** at a fixed 56px. Today the bulk bar is injected *above* the
  table, so ticking one checkbox pushes the table down ~50px and the row you clicked moves out from
  under the pointer — a direct violation of predictable interaction. `[code]`
- **Checkboxes**: four sites render bare browser defaults with no `ua-checkbox` class and no
  indeterminate state on select-all. `[code]`
- **Column widths**: `table-layout: fixed` by default, `<colgroup>` rather than per-`th` inline widths,
  and a min-width floor per registry (Customers 880, Losses 960, records 900, audit 820).
- **Skeleton parity**: skeleton rows are 28px against 44–48px real rows — a ~100px jump — and the bar
  widths are inverted (column 0 at 60%, column 1 at 80%). Use 68/44/32/32/24%. `[code]`
- **Filtered-empty** collapses the body from ~1,100px to 72px with a doubled hairline. Give it
  `min-height: 320px` and centre the state.

**Row repetition** — Work prints five identical tokens on every one of 50 rows: the literal word
"Object" before each link, an identical 30px provider tile, an identical owner, an identical amber
"Needs attention" sentence, and an identical red deadline. `[code][render]`

> Rule: **compute variance per page.** If `new Set(rows.map(r => r.field)).size === 1`, state it once
> in the toolbar ("All from Gorgias") and drop it from rows. Otherwise render at 16px, not 30px.
> Promote repeated labels to column headers. Delete "Object" — the column is already headed.

### 7.4 Controls and forms `[P1]`

**Size ladder.** Ships sm 30 / md 36 / lg 40 with padding-x 8 / 16 / 20 — a non-linear padding ramp
against a linear height ramp, and `md`/`lg` share an identical 16px icon. `IconButton` is 30/36/40 and
**does not use `--ua-control-height-icon: 32px`**, which exists and is consumed only by
`composition.css` and `tables.css` — so icon buttons in a toolbar are 30px while table icon affordances
are 32px. Adopt **32 / 36 / 44** with padding-x 10 / 14 / 20, icon 14 / 16 / 18, and a **44px minimum
pointer hit target** even where the visual control is 32px (pad with a transparent inset). `[code]`

**State matrix** — three real defects:

| Variant | Rest | Hover | Press | Focus | Disabled | Loading |
|---|---|---|---|---|---|---|
| primary / commit / secondary / ghost | ✅ | ✅ | ✅ | ✅ | ✅ inert fill | ✅ |
| **danger** | ✅ | ⚠️ `hover:opacity-90` | ⚠️ `active:opacity-80` | ✅ | ✅ | ✅ |
| **link** | ✅ | ✅ underline | ❌ **none** | ✅ | ✅ | ⚠️ broken |

1. **`danger` is the only variant whose hover/press is opacity** — it dims the entire button including
   its label, on the one variant used for destructive financial actions. And because `opacity` is not
   in the global transition property list (§7.6), it is also the only completely un-eased hover in the
   product.
2. **`link` has no press state.** Hover underlines; mousedown does nothing.
3. **A loading button still lights up on hover and press.** `Button.tsx:36` passes
   `Boolean(disabled) && !loading`, so when `loading` is true the `disabled` argument is `false` and
   `buttonStyles.ts:82` keeps the variant classes. Tailwind's `hover:`/`active:` carry no
   `:not(:disabled)` guard. `[code]`

**36 opacity-only disabled states across 20 files** — against the system's own written rule at
`buttonStyles.ts:12-13`. The canonical `Button` honours it; nothing else does. All 36 are
`disabled:opacity-{40,50,60}` on hand-rolled elements, concentrated in `components/settings/` (20 of
36). Plus one that is not even conditional: `AccountProfileSection.tsx:27` `className="opacity-50
cursor-not-allowed"`. `[code]`

**Labels: 149 elements, 37 distinct treatments, the canonical class used once.** `text-sm font-medium`
×63 (14px/500) and `text-xs font-semibold` ×13 (12px/600) are two different label systems, and
**neither matches the token** `--ua-text-label` (13px/500). The canonical `ua-form-field__label`
appears exactly once — inside `FormField.tsx` itself. **`FormField` has zero production adoption**; its
only consumer is the dev gallery. Every real form hand-rolls label + control + error. `[code]`

Primitive adoption generally: `<Button>` 159 vs raw `<button>` **166**; `<Input>` 71 vs `<input>` **59**;
`<Select>` 33 vs `<select>` **38**; `<FormField>` **1**.

**`FormField` does not reserve height for error text.** `instrument.css:343-347` is a bare grid with no
`min-height` and no reserved row, and the error renders conditionally — so on validation failure a new
grid row appears and **every field below it jumps down**. `success` also injects a 16px icon, so
success and error produce *different* shift amounts. The error carries `role="alert"`, so a screen
reader announces it at the moment sighted users lose their place. Currently latent (one consumer) —
fix it before migrating 149 labels onto it. `[code]`

**Toolbar system.** Row 1 = **scope** (durable: date range, currency, owner, saved view). Row 2 =
**filter + search** (transient). **Trailing slot** = utility actions. **Footer** = pagination and page
size. Primary page action lives in the page header, never in the toolbar. **One primary violet action
per view.**

### 7.5 Charts `[P1]`

**There is no chart system — there are four.** Recharts under `cartesian/`, a hand-rolled CSS chart in
`DashboardPositionChart`, more hand-rolled CSS in `AuthenticatedCharts.module.css`, and raw-Tailwind
stacked bars in `LossVisuals`. The one chart merchants see imports nothing from `geometry.ts` — the
file that declares itself the plot-geometry SSOT. Twelve of fifteen components are dead (~2,000 of
2,954 lines), including two whose last consumers were removed in `10941f8e` and which are still
exported. `[code]`

| Sev | Defect |
|---|---|
| P0 | Y-axis ticks **left-aligned in a fixed 48px gutter with no overflow guard** — any 4-digit value collides with the plot |
| P0 | A genuine **zero renders as "no data"** in `RankedContributionChart` and `StageDotPlot` |
| P0 | An **all-zero series fabricates "Peak £0.00"** — `peakIndex` reduces with `>=` against `?? -1`, so ties resolve to the last bucket |
| P0 | On "All time" with >30 buckets the right-hand months are **silently clipped** by a 22px `grid-auto-columns` floor |
| P0 | **Forced colours** collapses both series to `Highlight` |
| P1 | Bar bandwidth **30–43%** where Stripe-grade is 65–80% |
| P1 | The bar group **re-centres per bucket** when the secondary value is absent, so positions jitter |
| P1 | Bars drawn with `scaleY`, **distorting each bar's corner radius differently** |
| P1 | Axis ticks print **full-precision currency** and a bare unlabelled `0`, while a compact formatter exists unwired |
| P1 | **Three hard-coded gridlines**, no tick algorithm, labels not aligned to their own rules |
| P1 | X-axis **truncation** — the label box is clamped to band width and the overflow rules are inverted against the breakpoint |
| P1 | The **Recovery board chart inverts its colour roles**: heavy dark-grey "outstanding" dominates while violet "recovered" is a sliver `[render]` |
| P1 | Its **dual axes disagree** — left `7,500.00 / 5,000.00 / 2,500.00 / £0.00` (only the last carries a symbol) against right `100 / 70 / 35 / 0%` (non-uniform intervals) `[render]` |
| P2 | The legend is a **text sentence** rather than swatches `[render]` |
| P2 | "View chart data" uses a raw `▶` native `<details>` marker `[render]` |

**The specification:**

- **Geometry.** Band = plot width ÷ bucket count. Single series: `clamp(8px, band × 0.62, 32px)`.
  Two-series grouped: each `clamp(6px, (band × 0.70 − 4px) / 2, 20px)`, 4px inner gap. **Always render
  both bars**; drive absence through a `0` scale. Animate `height`, never `scaleY`. Square the bottom
  corners; 3px top radius.
- **Ticks.** Five ticks / four intervals at 0/25/50/75/100% of a nice ceiling. Extend the nice-number
  step set to {1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10} so `ceiling/4` is round. Each tick is one
  absolutely-positioned row containing both label and rule so they cannot drift apart.
- **Axis labels.** Right-aligned in a **measured** gutter (`clamp(36px, measured, 64px)`), compact
  currency (`£500`, `£1.5k`, `£1.2M`), zero formatted through the same function so it reads `£0`.
- **Colour.** Current series = `--ua-accent-500`. Every comparison series = the neutral ramp. Semantic
  hues only when the encoded value *is* success/warning/critical. **The dominant visual mass must be
  the primary series.**
- **Annotation.** Gate the peak on significance, not argmax: render only when
  `peak > 0 && peak ≥ max(1.2 × median, secondHighest × 1.15)` with ≥3 non-null buckets. Anchor to its
  bar.
- **States.** `rows.length === 0` → empty. `rows.length > 0 && max === 0` → **render the chart** with
  all tracks at zero and each row showing `£0.00`, plus a frame caption — never a "no data" state.
- **Access.** Hover crosshair with snapping, consistent tooltip anatomy, keyboard traversal per bucket,
  and a table equivalent behind a proper disclosure control.
- **Forced colours.** Primary `Highlight` solid; secondary `Canvas` with a 1px `CanvasText` outline
  (hollow vs solid); grid `GrayText`. Mirror on the legend swatches.
- **Delete the twelve dead components** rather than leaving them exported. Gate 13 applies; and
  renaming chart headings or `data-auth-chart` values trips gate 25.
- **No gradients** (gate 5) — which the chart contract already forbids anyway.

### 7.6 Motion `[P2]`

**Correction to rev 1: motion is the strongest system in the codebase.** `controls.css:24-26` blankets
every `<button>` and `<a>` in `.ua-app` with a tokenised `color, background-color, border-color,
box-shadow` transition at `--ua-duration-fast`; `tables.css:24` blankets every `tbody tr`. A search for
`<div|li|tr|span>` carrying `onClick` returns **zero** matches, so every interactive affordance is a
real `<button>` or `<a>` and already transitions. Zero hardcoded Tailwind durations, zero
`transition-all`. All four keyframes are tokenised and reduced-motion gated. Thirteen files import
`lib/design/motion.ts` and none deviate. `[code]`

The real findings are narrow:

1. **`opacity` is absent from the global transition property list.** So all 36 `disabled:opacity-*`
   states snap instantly, as does the `danger` button's `hover:opacity-90`. Add `opacity` to
   `controls.css:24-26`.
2. **`animate-spin` is the one untokenized animation.** `Spinner.tsx:52` uses Tailwind's built-in
   1000ms linear, while `--ua-duration-spinner: 800ms` and `DURATION.spinner: 800` both exist and are
   **referenced by nothing**. `EASE.linear` is documented as spinner-only and never read.
3. **`framer-motion@^12.40.0` is a dead dependency** — zero imports outside `node_modules`. ~120KB in
   the lockfile for a product whose motion system is four keyframes.
4. **15 unused `@keyframes` in `app/globals.css`** (`shimmer`, `ua-shimmer-bg`, `ua-meteor`,
   `ua-border-beam`, `ua-scan-sweep`, …). Globally scoped, and `states.css:21-23` explicitly forbids
   their aesthetic in the product. One autocomplete away from a violation.

Anything added must stay inside `foundations.css`'s reduced-motion kill switch (gate 20).

### 7.7 States `[P1]`

44 `error.tsx` and 44 `loading.tsx` exist — coverage is not the problem; fidelity is.

**Errors: 2 implementations for 44 files, split into two quality tiers.** 43 of 44 route to
`OperationalRouteError`; 26 call it directly and pass specific, domain-accurate copy ("No evidence,
recommendation, investigation, merchant decision, outcome, or audit history was changed"), while 17 go
through the `ErrorBoundaryUI` passthrough and pass **no `description`**, falling back to a generic
string. 14 of those 17 also pass no `fallbackHref`, so an error in `settings/billing` offers "Leave
this page" → `/dashboard`. The copy is good; the split is accidental. `[code]`

**Loading: 18 geometries for 44 files, with real fidelity at the top and generic at the tail.**
`WorkbenchPageSkeleton` imports the *actual* page chrome module and reserves the real slots — that is
genuine geometry-matching. But:
- **11 routes share a fixed-count generic block** — `SettingsGeometrySkeleton` renders exactly 3 field
  bones or 5 list rows with no props to vary it, so seven settings pages all show 3 bones regardless
  of field count.
- **`TablePageLoadingSkeleton` and `SettingsListLoadingSkeleton` are the same function** — two named
  exports, one geometry.
- **`DashboardLoadingSkeleton` has drifted off its page**: it hardcodes `min-[981px]:grid-cols-…`
  and `min-h-[270px]`, none of which appear anywhere else in the product. It reserves space for a
  layout that no longer exists. `[code]`
- **9 dead skeleton exports** in `pageSkeletons.tsx` — about a third of a 26KB file is unreachable.

**Empty states: two parallel systems that never reference each other.** `OperationalState` has 10
*semantic* kinds (19 uses); `EmptyState` has 3 *layout* variants (17 uses). Within `OperationalState`,
`states.css` defines modifier CSS for exactly **two** kinds (`error`, `unavailable`) — so **8 of 10,
including all three empty kinds, render pixel-identically**. `data-state` is set and nothing styles it.
`zero` (first-run) appears **once** in production. And `filtered-empty`'s copy says "Clear a filter or
broaden the range" while its sole call site ships **no control to do so**. `[code]`

**Prescription:** collapse to one system with three genuinely distinct treatments — first-run (what
this becomes + the setup action), legitimate (quiet confirmation), filtered (name the active
constraints + one reset **control**). Give every `data-state` a real modifier. Delete the 9 dead
skeletons, give `SettingsGeometrySkeleton` a field-count prop, and regenerate `DashboardLoadingSkeleton`
from the real layout. Rename `LoadingState.tsx`, which contains no loading state (`states.css:11-12`
already documents this).

**The 0% meter.** The dashboard trust rail renders "917 stale · 0 of 917 current · 0%" with a
completely empty track, which reads as a rendering failure. Render a true-zero meter with a visible
track, a zero-width fill marker at the origin, and the value stated in text. `[render]`

---

## 8. The signature system

**This is the largest and most important section.** Everything above makes the product look
professional. This is what makes it memorable — and it is almost entirely a matter of rendering data
that already exists and is currently discarded.

### 8.0 Current state, honestly

| Primitive | Production consumers | Verdict |
|---|---|---|
| `EvidenceThread` | 1 (activity timeline) | Real component, **semantics switched off** |
| `FinancialEquation` | 1 (Reports, not the case) | Real component, **signature feature never invoked** |
| `SourceBeacon` | 1 (inside a dashboard modal) | Real component, **misdeployed** |
| `SourceTraceRow` | 1 (the dossier evidence spine) | Ordinary row wearing an ambitious name |
| `LedgerBridge` | **0** | Strictly worse duplicate of `FinancialEquation` |
| `DecisionSentence` | **0** | A 6-line styled `<p>` with a bullet |
| `ActionDock` | 1 | A container: `border-top` + padding + right-aligned flex |
| `RecordedOutcome` | 1 (bottom of the page) | One real idea (the spine) in an otherwise plain row |

The authority doc reached this conclusion itself (lines 132-135, 192-205). What follows is the
specification it asked for.

### 8.1 The data that already exists

Nothing below needs inventing. Cite these types when building. `[code]`

| Type | File | Fields that matter |
|---|---|---|
| `ReconciliationFact` | `lib/reconciliation/types.ts:32-49` | `factKind: 'source_fact'\|'human_finding'\|'inference'` · `freshness: 'fresh'\|'stale'\|'unavailable'\|'unknown'` · `supports[]` · **`conflicts[]`** · `occurredAt` vs `collectedAt` · `sourceProvider` · `externalReference` |
| `ReconciliationRecommendation` | same, `:143-159` | `assessmentState: 'known'\|'likely'\|'unresolved'\|'not_applicable'\|'blocked'` · `headline` · `explanation` · `reasonCodes[]` · `supportingEvidenceIds[]` · `conflictingEvidenceIds[]` · `missingEvidence[]` · `policyVersionId` · `engineVersion` |
| `MissingEvidenceItem` | `lib/integrations/types.ts:277-290` | `capability` · `reason` · `message` · **`attempted`** |
| `NormalizedEvidenceItem` | same, `:238-252` | **`confidence: 'high'\|'medium'\|'low'`** |
| `EvidenceChecklistItem` | `lib/payouts/types.ts:291-300` | `state` · **`contextField`** · **`weight`** · **`reason`** |
| `ClaimDecisionContext` | `lib/claims/decision/types.ts` | `trackingGap` (4 typed reasons) · `deliveryPhotoFinding` + `…Rationale` + `…At` · `scanCount` · `exceptionCount` |
| `CASE_FINANCIAL_SUMMARIES` | selected at `claims/[id]/page.tsx:72` | per-currency minor amounts + **`known_states`** |

`supports[]` and `conflicts[]` are explicitly parsed at `lib/reconciliation/caseStore.ts:75-76` and
then never rendered. **A per-fact contradiction graph reaches the client and is thrown away.**

### 8.2 EvidenceThread — the defining object

**Current.** `components/ui/EvidenceThread.tsx` + `instrument.css:6-117`. The CSS is genuinely good:
a 3-column grid (`20px | 1fr | auto`), a 1px rail from `top: 20px` to `bottom: -4px` suppressed on
`:last-child`, and an 8px node with a 2px surface ring and a 1px `--ua-border-strong` outer shadow — a
real "bead on a wire". It declares `EvidenceAuthority` (6 values) and `EvidenceThreadState` (5 values).

**But only 3 of 6 authorities and 3 of 5 states have any CSS rule**, and its sole consumer
(`ClaimReviewContextColumn.tsx:221`) hardcodes `authority: 'source'` and `state: 'recorded'` — *neither
of which is styled*. **In production it renders as a uniform grey-dot timeline.** The full vocabulary
is exercised only in the dev gallery. `[code]`

**Data contract.** Accept `ReconciliationFact[]` plus `MissingEvidenceItem[]`, mapping
`factKind → authority` and `freshness → state`. Stop passing constants.

**Node treatment — all six authorities:**

| Authority | Node | Rail segment | Meaning |
|---|---|---|---|
| `source` | filled `--ua-text-secondary` + provider mark | solid | observed from a connected system |
| `fact` | filled `--ua-text-primary` | solid | recorded by a person |
| `inference` | hollow, 1px `--ua-border-strong` | **dashed** | deduced, not observed |
| `recommendation` | filled `--ua-accent-500` | solid | the system's advice |
| `decision` | filled `--ua-action-commit` | solid | the merchant's choice |
| `outcome` | filled `--ua-action-commit`, 2px ring | solid | what was recorded |

**All five states:**

| State | Treatment |
|---|---|
| `known` | full-opacity value, normal ink |
| `partial` | value + a `--ua-warning` dot and the missing scope named inline |
| `missing` | **dashed rail, hollow node, the missing fact named in `--ua-warning` ink, and the action that closes it** |
| `stale` | value at `--ua-text-secondary` + age (`observed 6d ago`) in `--ua-warning` |
| `recorded` | value in primary ink + actor and timestamp in metadata |

**Gaps are first-class rows.** Use `MissingEvidenceItem.attempted` to choose the sentence:
`attempted: true` → "Requested from Royal Mail · no response". `attempted: false` → "Not requested —
connect a carrier to collect this." Never omit the row; an absent fact is a decision input.

**Contradictions — the moment no competitor has.** When `fact.conflicts[]` is non-empty, render the
conflicting pair as a **joined bracket**: a single 2px `--ua-critical-line` spine spanning both rows,
one `--ua-critical` marker at its midpoint, and one sentence naming the disagreement ("Carrier scan
says delivered; customer reports not received"). Do not colour either fact — neither is wrong yet.

**Anatomy** — what a builder should have in their head:

```
 rail    content                                             meta
┌────┬──────────────────────────────────────────────────┬──────────────┐
│ ●  │ Carrier · Delivery scan            [source]      │  09:20 UTC   │  solid rail, filled node
│ │  │ Parcel marked delivered to front porch           │  Royal Mail  │
├────┼──────────────────────────────────────────────────┼──────────────┤
│ ○  │ Warehouse · Pack weight            [inference]   │  09:12 UTC   │  dashed rail, hollow node
│ ┆  │ Two items picked; parcel weight not confirmed    │  derived     │
├────┼──────────────────────────────────────────────────┼──────────────┤
│ ◌  │ Parcel contents                    [missing]     │              │  dashed rail, open node
│ ┆  │ Not requested — connect a carrier to collect it  │  [Connect →] │  action closes the gap
├════┼══════════════════════════════════════════════════┼══════════════┤
│ ⚠  │ Carrier says delivered; customer reports not     │              │  contradiction bracket
│ │  │ received.                        [conflict]      │              │  2px critical spine
└────┴──────────────────────────────────────────────────┴──────────────┘
```

**Geometry:** rows 48px min-height, `20px | minmax(0,1fr) | auto` grid, 12px gap, content padded 16px
bottom (8px compact), label 12/16/500 tertiary, value 13/18/400 primary, meta 12/16/500 tertiary
right-aligned reflowing to column 2 under 767px. Node 8px with a 2px `--ua-surface-primary` ring and a
1px `--ua-border-strong` outer shadow (keep — this detail is already good). Rail 1px from `top: 20px`
to `bottom: -4px`, suppressed on `:last-child`. Contradiction bracket: 2px `--ua-critical-line`
spanning both rows, marker at the midpoint.

**Interaction:** hovering a row reveals retrieval method and freshness inline (progressive disclosure,
not a second permanent block). Focus moves per row. `href` opens the source record.

**Motion:** a newly-landed fact settles with the existing 600ms highlight (`--ua-duration-highlight`,
currently 700ms — align to 600 and mind gate 22). Nothing else moves.

**Behaviour at scale — currently unspecified, and a real gap.** The component today handles no empty
state (its caller guards with a `timelineEvents.length === 0` ternary), no loading state, no
truncation and no grouping. The dossier's existing evidence spine caps at `.slice(0, 8)` with no
affordance to see the rest. Specify:

| Condition | Behaviour |
|---|---|
| 0 facts | The thread renders its own empty state, not a caller ternary: "No evidence collected yet" + the action that starts collection |
| Loading | Skeleton with the **real** rail and node geometry — 4 rows, dimmed spine — so nothing shifts when facts land |
| > 12 facts | Group by `factKind` with sticky group labels (Source facts / Human findings / Inferences), preserving chronological order within each group |
| > 40 facts | Collapse each group past the 8th item behind "Show 14 more source facts" — **never a hard `.slice()` with no affordance** |
| Gaps and contradictions | **Never collapsed or truncated.** They are the point; they pin to the top of their group |

**Acceptance:** a reviewer can state, without reading the values, which facts are observed, which are
deduced, which are stale, which are missing, and where two sources disagree — and can do so equally on
a case with 3 facts and one with 60.

### 8.3 FinancialEquation — the ledger bridge

**Current.** `components/ui/FinancialEquation.tsx` + `instrument.css:119-253`. Genuinely distinctive:
KPI-scale tabular values, hairline cell dividers, a well-built `--summary` variant that reflows 2-up
under 1099px and 1-up under 599px, and a **20px circular operator badge straddling the divider**.

**The operator badge has never rendered in production.** The `operator` prop (`'minus'|'plus'|'equals'`,
with real `− + =` glyphs) is implemented and **no consumer has ever passed it**. `partial` is declared
and unstyled. And the component does not appear on the case dossier at all — the dossier hand-rolls a
4-up `<dl>` instead. `[code]`

**`LedgerBridge` is a strictly worse duplicate with 0 consumers** — except for one thing it does
better: a horizontal connector rail through the node row, half-width on first/last so it terminates at
the end beads. That is the better metaphor for money moving through stages.

**Prescription:** fold `LedgerBridge`'s connector rail into `FinancialEquation`, delete `LedgerBridge`
(and its `components/ui/index.ts:92` re-export), wire the `operator` prop everywhere, style `partial`,
and put it on the dossier replacing the hand-rolled `<dl>`. Drive `state` from
`CASE_FINANCIAL_SUMMARIES.known_states` — the field exists precisely for this, and
`IntelligenceReportView` already uses it correctly via `financialMetricIsKnown`.

**Geometry:** `grid-auto-flow: column`, `grid-auto-columns: minmax(10rem, 1fr)`, 16px cell padding,
1px `--ua-border-hairline` left divider, value 24/30/600 tabular, label 12/16/500 tertiary. Operator
badge 20px circle, `--ua-surface-primary` fill, 1px `--ua-border-default`, centred on the divider.
Terminal cell: 2px `--ua-border-strong` top rule and hero type.

**States:** `known` (full), `partial` (value + named missing scope), `unavailable` (em-dash, tertiary,
reason on demand). **Never render an unavailable term as `£0.00`.**

### 8.4 SourceBeacon + SourceTraceRow — merge

**The irony is the finding.** `SourceTraceRow` — the component actually rendering per-fact provenance
on the dossier — is a 12-line three-column grid with **no domain awareness at all**: no enums, no
state, no href. Its call site string-concatenates provenance into props:

```
kind={`Provider record · ${humanize(fact.sourceProvider)}`}
meta={`Ref ${fact.externalReference} · ${formatDateTime(...)} · ${humanize(fact.freshness)}`}
```

Meanwhile `SourceBeacon` models `current | stale | partial | disconnected | unavailable` as
first-class coloured states with a `currentColor` dot — and is buried in a dashboard modal, never
seeing a case fact. `[code]`

**Prescription:** delete `SourceTraceRow`; put `SourceBeacon` on the dossier evidence spine, fed
`ReconciliationFact` directly. Add the missing `unavailable` colour rule (today it falls through to
`--ua-text-secondary`, so "unavailable" looks identical to a neutral default — and the dashboard call
site passes exactly that when `records === 0`). Pass a real provider mark; the slot exists and no
consumer fills it.

**Geometry:** `auto | minmax(0,1fr) | auto | auto`, 8px/12px gap, 8px vertical padding, no border and
no background — it is a row inside the thread, not a card. Identity 13/18/600 with ellipsis; status
dot 6px `currentColor` + label; `limitation` spans `grid-column: 2 / -1` as a second line.

### 8.5 DecisionSentence — build it properly

**Current: a 6-line file.** `<p className={styles.decisionLine}>{children}</p>`. Zero consumers.
And there are **two diverging sentence styles** — `DecisionSentence` uses `.decisionLine` (bulleted,
13px secondary) while `DecisionHeader.tsx:21` uses a different class `.decisionSentence` (72ch, 14px,
no bullet). The named component and the header's sentence slot have drifted apart. `[code]`

**This is the product's central claim and it deserves a real primitive.** Typed slots, not `children`:

```
subject     — what this is about (the case, the order)
action      — what is recommended or was decided
amount      — the money, tabular, in primary ink
basis       — the rule or evidence that produced it, linked
confidence  — assessmentState, rendered as text + a marker, never colour alone
actor       — for recorded sentences: who and when
```

**Geometry:** 16/24/400 in `--ua-text-primary`, `max-width: 72ch`, with `amount` and `action` at
weight 600. No bullet — a sentence is not a list item. Reconcile `.decisionLine` and `.decisionSentence`
into one class.

**Acceptance:** the sentence reads as English, names its own basis, and never states a recommendation
without stating what it rests on.

### 8.6 ActionDock — the decision moment

**Current: `border-top` + padding + right-aligned flex, 11 lines.** `actions` is an opaque
`ReactNode` — no button model, no primary/secondary slotting, no busy state, no disabled reason. The
`sticky` prop exists and **its one consumer never passes it**, so the dock's entire reason to exist is
dead code. All the real behaviour is hand-rolled around it in `ClaimReviewManageCard`: `decisionReady`
gating, `setConfirming(true)` opening a separate modal, `role="alert"` validation paragraphs, and an
`aria-describedby` requirement string. `[code]`

It does one thing well already: `copy` carries a live consequence line ("Records an internal
authorization only. No external payout is sent."). That instinct is right — build around it.

**Prescription — absorb the surrounding behaviour:**

| Slot | Contract |
|---|---|
| `consequence` | required; the financial consequence of the primary action, 13/18/400 secondary |
| `primary` | one action, `commit` variant (near-black), never violet |
| `secondary` | at most one |
| `blockedReason` | when set, the primary is inert **with a real neutral surface** and this states why |
| `busy` | spinner in the primary, and hover/press suppressed (fix `Button.tsx:36`) |
| `confirmation` | staged inline, not a separate modal, for reversible actions |

**Geometry:** sticky bottom, 52px min-height, 12px padding, `border-top: 1px solid
var(--ua-border-hairline)`, `--ua-elev-2` when stuck. Under 767px actions stretch full-width.

### 8.7 RecordedOutcome — the terminal node

**Current.** One real design idea — a 2px full-height left spine — inside an otherwise plain row. But
**the spine is hardcoded `--ua-success`**, so an approval, a denial, a reversal and an escalation all
render with the same green bar. `urgent` changes only the ARIA role and has **no visual effect**. Its
consumer renders genuinely good content the component has no model for: decision label, outcome label,
actor, timestamp, and a *previous* outcome for reversals. `[code]`

**Prescription:** type the outcome and colour the spine from it.

| Outcome | Spine |
|---|---|
| approved / recovered | `--ua-success` |
| denied / written off | `--ua-neutral` — a recorded denial is a completed state, not an alarm |
| reversed | `--ua-warning`, with the previous outcome stated inline |
| escalated | `--ua-info` |
| failed | `--ua-critical` |

Give it real slots (`decision`, `outcome`, `amount`, `actor`, `at`, `previous`) and **move it adjacent
to the decision it records** (§8.8). Keep the spine geometry — it is the one signature move in the file.

### 8.8 The dossier recomposition

Today: `ClaimReviewPanel` renders a fluid main column plus a fixed 20rem rail. The **decision controls
live in the rail**, while `RecordedOutcome` sits in the **Activity** section — the *fourth* section of
the main column, at the bottom of the page. The thing you did and the record that you did it are as far
apart as the layout allows. `[code]`

The header uses `DetailPageShell`, not `DecisionHeader`/`ScopeStrip`/`DecisionSentence` — so three of
the "canonical compositions" are absent from the product's most important page.

**Target order, main column:**

1. **Decision sentence** (§8.5) — what is recommended, on what basis, immediately under the header.
2. **Evidence thread** (§8.2) — facts, inferences, gaps, contradictions, in one instrument. Replaces
   the hand-rolled "Evidence spine" *and* `EvidenceChecklistCard`'s `'✓' : '○' : '–'` glyphs, which
   encode exactly the states the thread already models.
3. **Financial equation** (§8.3) — replaces the hand-rolled 4-up `<dl>`.
4. **Responsibility and recovery** — unchanged in content.
5. **Activity** — history only, no longer carrying the outcome.

**Rail:** `ActionDock` (§8.6) with the consequence preview, and **`RecordedOutcome` directly beneath it
once a decision exists**. Decision and record occupy one place.

**Gate warning:** this is the highest-risk restructure in the programme. It trips gate 15
(`verify:ui-parity` diffs interaction handlers and hrefs against HEAD) and gate 13 if any file is
renamed. Move behaviour, not files, where possible.

### 8.9 Build order

The signature system has internal dependencies. Build in this order or you will rework:

| # | Step | Why here | Blocked by |
|---|---|---|---|
| 1 | Give `EvidenceThread` all 6 authority + 5 state CSS treatments | Pure CSS, no consumer change, immediately visible in the dev gallery | §6.1 tokens |
| 2 | Stop hardcoding its consumer; map `factKind`→authority, `freshness`→state | The component is already correct once fed real data | 1 |
| 3 | Add gap rows from `MissingEvidenceItem` (+ `attempted` copy) | Gaps are the highest-value new information | 2 |
| 4 | Add the contradiction bracket from `conflicts[]` | The differentiating moment; needs the thread stable first | 3 |
| 5 | Merge `SourceBeacon` into the thread rows; delete `SourceTraceRow` | Provenance belongs on the fact, not in a parallel row type | 2 |
| 6 | Wire `FinancialEquation`'s `operator`; fold in `LedgerBridge`'s rail; delete `LedgerBridge` | Independent of the thread; ship in parallel | §6.1 |
| 7 | Build `DecisionSentence` with typed slots; reconcile the two sentence classes | Needs `assessmentState` and the rule link, both already available | — |
| 8 | Extend `ActionDock` to absorb gating, validation and confirmation | Behaviour move, highest parity risk — do it alone in one commit | 7 |
| 9 | Type `RecordedOutcome`'s spine; move it under the dock | Cheap once 8 lands | 8 |
| 10 | Recompose the dossier (§8.8) | Everything else must be stable first | 1–9 |

Steps 1–4 alone deliver most of the perceived change and touch no file names, so they clear gate 13
entirely. Step 8 is the one to isolate in its own commit for gate 15.

### 8.10 Acceptance criteria for the signature system

| Primitive | Acceptance |
|---|---|
| `EvidenceThread` | A reviewer states, without reading values, which facts are observed, deduced, stale, missing, and where sources disagree. Every `factKind` and `freshness` value has a distinct treatment. Zero hardcoded `authority`/`state` at any call site. |
| `FinancialEquation` | Operator glyphs render. Every term declares known / partial / unavailable from `known_states`. No unavailable term renders as `£0.00`. Reflows 2-up ≤1099px and 1-up ≤599px with every total visible. |
| `SourceBeacon` | Every fact on the dossier carries provider, method, freshness and a working `unavailable` treatment. `SourceTraceRow` no longer exists. |
| `DecisionSentence` | Reads as English, names its own basis, links the rule, and never states a recommendation without what it rests on. One sentence class, not two. |
| `ActionDock` | Sticky in production. One primary in `commit` near-black. A consequence line above every irreversible action. Blocked state explains itself with a real surface, not opacity. Busy suppresses hover and press. |
| `RecordedOutcome` | Spine colour matches the outcome. Approve, deny, reverse and escalate are visually distinguishable. Sits adjacent to the control that produced it. |
| The system | The five-second test (§3.3). No recorded action ends only in a toast. |

---

## 9. Surface-by-surface teardown

Each surface: current composition → defects → target → acceptance.

### 9.1 Shell, navigation, header `[P1]`

**Current:** 200px rail (56px compact) on `#F1F2F5`, 52px header with Search ⌘K + bell + avatar.

| Sev | Defect |
|---|---|
| P1 | **The workspace alert truncates to "1 source needs attenti…"** — an alert the operator cannot read, on every page. The fix is not a tooltip: two lines in the rail, or move it to the header as a dismissible notice naming the source `[render]` |
| P1 | Shell has no spatial identity — 1.04:1 against canvas (fixed by §6.1) `[measured]` |
| P2 | The notification badge floats detached above-right of the bell. Anchor to the bell's bounding box with a 2px canvas-coloured ring `[render]` |
| P2 | Help and Sign out sit inside the nav list while Privacy / Data handling / DPA are crammed at the bottom in 12px grey. Separate: a utility group with a hairline above it; legal links into Settings `[render]` |
| P2 | The header does not earn 52px. Add the workspace/currency scope and breadcrumbs, or reduce to 44px `[render]` |
| P2 | Page-frame inconsistency — Cases uses a subtitle stat line, Work another form, Reports another, Recovery a two-line paragraph. One `DecisionHeader` anatomy `[render]` |
| P3 | "Cases 99+" caps while the page itself says 113 `[render]` |

**Target:** rail at `--ua-shell` `#E7EAF0`, one header anatomy, one page-frame anatomy.
**Acceptance:** no truncated alert; the rail is visibly a distinct plane; every page header has the
same five slots.

### 9.2 Overview `[P1]`

**Current:** filter toolbar → payout position panel (hero + chart) → trust band → attention list + trust rail.

| Sev | Defect |
|---|---|
| P1 | **A doubled hairline with 18px of nothing between it**, full width — `DecisionLedger.module.css:7` draws a subtle bottom rule, then `dashboardPilot.module.css:154-158` sets `margin-top: 18px` and draws a *darker* top rule. It recurs below the canvas because `.positionCanvas` also carries a `border-bottom`. Reads as a rendering bug `[code][render]` |
| P1 | The KPI cluster has no ramp — Recovered / Prevented / Realised loss render at identical size and weight (§7.2) |
| P1 | Chart defects (§7.5) |
| P2 | Redundant trust messaging — a full-width amber "Validated values only" band above a trust rail whose third row says the same thing `[render]` |
| P2 | In dark the amber band **loses its tint entirely** — the state is expressed in light and not in dark `[render]` |
| P2 | "What needs attention" has an unexplained progress bar per row, no column header, ~16px arrow targets `[render]` |
| P2 | Toolbar composition — inconsistent control widths, a floating "Compare" label, an orphaned "Reports" button (§7.4) `[render]` |

**Target:** one elevated panel per region; hero at 32px with three 24px supporting figures; the trust
band deleted in favour of the rail; the attention list as a real registry.
**Acceptance:** the operating answer is readable in five seconds; no duplicated trust sentence.

### 9.3 Cases `[P0]`

**Current:** setup banner → title stat line → toolbar → workflow chips → master list + detail preview.

| Sev | Defect |
|---|---|
| P0 | **Neither pane owns overflow** — ~2,500px of white void (§7.3) |
| P1 | Violet wash on passive metadata collides with violet selection (§6.3) |
| P1 | **Section labels are a non-treatment** — 12px/400 tertiary with +0.72px tracking, identical to the field labels they head, because `font-semibold` is dead (§6.4). Promote to 16/22/600 primary with a rule above; demote field labels to 12/16/500 tertiary and raise values to 13/18/500 primary |
| P1 | A red "Ageing" pill on essentially every row (§6.3) |
| P1 | A **violet primary "Search" submit button** beside a search field; sort options as bare unstyled text; "Rows per page" in prime toolbar space (§7.4) |
| P2 | Zero-count workflow chips at full weight |
| P2 | List rows ~150px carrying six lines — a card list, not a queue. Target 64px two-line with the value right-aligned |

**Acceptance:** both panes scroll independently; selection is unmistakable; no row wears more than two chips.

### 9.4 Case dossier `[P1]`

**Current:** `DetailPageShell` header → tabs → 4 sections → 20rem rail. See §8.8 for the target.

| Sev | Defect |
|---|---|
| P1 | Decision controls and the recorded outcome are four sections apart (§8.8) |
| P1 | **"New request" button overlaps the panel edge** it belongs to `[render]` |
| P1 | `Requested action: Not specified` renders a null as a value in the identity block |
| P1 | Nested card in a section in a panel — three perimeters deep (§6.2) |
| P1 | The Decision rail hollows out on failure — the most important object becomes a grey paragraph in an empty 300px column `[render]` |
| P2 | **Four consecutive cells reading "Unavailable — retry", "Unavailable", "Not yet evaluated"** present three different flavours of absence with no visual distinction between *unknown*, *not yet computed* and *failed to load* `[render]` |
| P2 | "Recommendation updates unavailable." renders as a centred orphan breaking mid-phrase `[render]` |

**Acceptance:** the five-second test (§3.3).

### 9.5 Work `[P0]`

| Sev | Defect |
|---|---|
| P0 | No pager; exceptions repeat on every page; the count is wrong (§7.3) |
| P0 | Clipped row overflow menu (§7.3) |
| P1 | **`source_order` in operator copy** (§10.1) |
| P1 | Inconsistent priority encoding — "High" is an amber pill, "Medium" is plain text |
| P1 | Five repeated tokens per row (§7.3) |
| P2 | The deadline panel shows six legend entries of which **three are zero**, while the real story ("No deadline 102") is last |
| P2 | "More views 6" means six *views* in a row where every other number is an item count |
| P2 | "Save view" is an action inside the filter-tab row |

### 9.6 Reports `[P2]`

The **strongest** authenticated surface. The four-cell equation (Maximum exposure → Confirmed loss →
Recovered cash → Final net loss) with vertical rules and per-cell definitions is the right instrument
and should become the model (§8.3).

Defects: three-line definitions make the strip heavy — move to disclosure; the amber reconciliation
band renders a **single-item bullet list**; "Loss causes" shows one row then ~120px of empty panel;
date-range tabs with an orphaned Export button; chart defects per §7.5.

### 9.7 Integrations `[P2]`

The **best-executed page**. The "Evidence coverage sequence" (five numbered layers, "4 of 5 layers
connected") is genuinely good IA and answers the sequencing question a merchant actually has.

Defects: "Review list" is an underlined text link inside an amber banner — make it a secondary button;
the "Records" header and value are not aligned to the same edge; the numbered group headers repeat the
coverage numerals without a visual tie.

### 9.8 Settings `[P2]`

| Sev | Defect |
|---|---|
| P2 | **Three "Settings" identities on one screen** — breadcrumb, index title, page title `[render]` |
| P2 | The content column is ~720px in a 1440px viewport with nothing in the remaining 280px. Widen, or add a contextual rail (what this affects, when it last changed, who changed it — which also serves the audit story) `[render]` |
| P2 | Empty email field with no value and no placeholder for a signed-in user `[render]` |
| P2 | Save ownership unclear — a disabled "Save changes" mid-card while later sections carry their own controls. One save owner per dirty state, in a sticky footer |
| P2 | Inputs stretch to full panel width regardless of content class (§7.4) |

**Gate warning:** merging or splitting settings sections trips gate 12 (`phase21CoreSettings.test.tsx`
asserts exactly 4 `.ua-section-card--joined`).

### 9.9 Losses, Recovery, Customers `[P1]`

Recovery: chart colour-role inversion and axis disagreement (§7.5); its KPI lead cell is the best
metric strip in the product and should become the template (§7.2); header prose runs two lines where
one operating sentence would do. Losses: no server pagination (`.limit(500)`). Customers: **timed out
repeatedly at 1440 against a 917-record workspace** — a registry that cannot render is a design problem
too `[render]`. Connected-object routes share one renderer; each type must be recognisable from its
first viewport rather than six identical layouts.

### 9.10 Rules, Flows, Notifications, Help `[P2]`

These captured as short single-viewport pages, which is itself the finding: they are thin. Each needs
the standard registry contract (§7.3). The rule and flow workbenches must express **When → If →
Recommend/Act** as a readable causal sentence, not a stack of equal nested cards.

### 9.11 Public site, entry, onboarding `[P1]`

**The landing page out-executes the product.** Display type is large, tight-tracked and confident; the
hero carries a monospace-labelled product frame; the CTA hierarchy is clear. And the evidence table
inside that frame — source-labelled rows (Commerce / Helpdesk / Warehouse / Carrier) with timestamps
and an explicit "Parcel contents are not confirmed by the available sources" gap notice — **is a
better-designed EvidenceThread than the one the product ships.** `[render]`

> Two consequences. The product should inherit the landing's typographic confidence: bind Inter Tight
> to a display role (§6.4). And the hero mock is effectively an approved design for §8.2 — build it.

- P1 — the public site runs on a **separate token set** (`app/globals.css :root`) with its own ramp,
  colours and spacing. Unify via `--fl-*` tokens that *derive* from the same palette.
- P1 — auth surfaces are the first pixel a customer sees. Verify the anatomy does not jump between
  loading, error and success (reserved heights), and give sign-in the landing's confidence. `[unverified]`
- P2 — onboarding: confirm **one** progress model and that completion reflects actual readiness
  (connected sources) rather than steps clicked. `[unverified]`
- Legal pages: 60–72ch measure, section nav, deliberate print stylesheet.

**Gate warning:** **any visual change to `/demo` trips gate 16** — `public/product-proof/*.webp` are
SHA-256 golden bytes with hard-coded crop rectangles. Regenerate and *look at* the images.

### 9.12 Embedded surfaces `[P2]`

Gorgias widget (native primitives only — no HTML/CSS), Zendesk iframe, Chrome popup. Must read as the
same product at Pocket-Brief density: 13px body minimum, 38px primary controls, the decisive state
inside the first 120px, no emoji, no uppercase grade, no horizontal overflow. Not re-verified. `[unverified]`

---

## 10. Cross-cutting

### 10.1 Copy and terminology `[P1]`

**The worst defect in the product's copy:** `lib/reconciliation/detectors.ts:311-314` interpolates
`rows[0].subject_entity_type` straight into the title and description, so the Work queue renders
**"Ambiguous source_order match"** and "3 plausible matches for this source_order." It tells the
operator they are looking at a database. Map every entity type through `lib/ui/labels.ts`. `[code][render]`

Build `lib/ui/labels.ts` into the single internal→operator mapping and lint against raw enum
interpolation into user-visible strings. Sentence case everywhere; **no ALL-CAPS micro-labels** (gate 8
enforces this); no terminal punctuation on labels, always on sentences.

**Heading voice.** Question-led titles ("How is financial value accumulating?") belong on **charts**,
where the question names what the geometry answers. They do not belong on operational panels — "When
will the queue become risky?" makes the operator parse a rhetorical question before reaching the data.
Panels get noun phrases. **Gate warning:** renaming a merchant-facing heading trips gate 24, and
renaming a chart heading trips gate 25.

### 10.2 Numbers, currency, dates `[P0]`

**Credit first: the formatter layer is well built.** `lib/canonical/money.ts` handles ISO exponents
correctly (JPY 0, BHD 3), `formatMoneyOrDash` and `formatMinorCurrencyNullable` behave, `formatCurrency`
emits a data-quality report rather than guessing a symbol, and there are **zero** instances of
`format*(x ?? 0)` anywhere. The defects are at the boundaries. `[code]`

**D1 (P0) — a real £0.00 renders as "unknown".** Three sites use `value || null`:

```
app/(app)/recoveries/page.tsx:190   formatCurrencyNullable(estimatedRecoverable || null, currency) ?? '—'
app/(app)/recoveries/page.tsx:197   { label: 'Recovered', value: formatCurrencyNullable(recovered || null, …) }
app/(app)/claims/ClaimsPageView.tsx:135  formatCurrencyNullable(totalAtRisk || null, displayCurrency)
```

`0 || null` is `null`, so a genuine zero takes the null branch and prints `—`. **On a KPI tile
literally labelled "Recovered", "you have recovered £0.00" and "we do not know what you have recovered"
render identically.** This is the inverse of the defect rev 1 hunted, and it is worse. (The trailing
`?? '—'` is also dead — `formatCurrencyNullable` never returns nullish.) `[code]`

**D2 (P0) — an unparseable string silently becomes £0.00.** `lib/utils/format.ts:251`:

```
const numericAmount = typeof amount === 'string' ? Number.parseFloat(amount) || 0 : amount;
```

Guards `null`/`undefined` but not `''`, `'N/A'` or `NaN`. `Number.parseFloat('') || 0` → `0` → renders
**`£0.00`**. Any string-typed money column arriving empty from a source integration prints a confident
zero. 12 call sites including `ClaimsQueueClient`, `reports/records`, `CustomerPreviewDrawer`,
`CaseContextDrawer`. (`parseFloat('12.5abc')` → `12.5` silently, too.) `[code]`

**D3 (P0) — hardcoded `/100` contradicts the canonical module.** `lib/utils/format.ts:174`, in
`formatMoney`'s unknown-currency branch: `(minor / 100).toFixed(2)`. ¥1,000 (exponent 0) renders as
`10.00` — a **100× error**, with no symbol, in a column where neighbouring rows show symbols. `[code]`

**D4 (P1) — ~20 loader-level null→0 aggregations presented as definite totals.** 108 `?? 0` and 14
`|| 0` in `components/` + `app/`; the money-relevant ones concentrate in `lib/reporting/intelligence.ts`
(ten consecutive `Number(row.x || 0)` accumulations into KPI bridge values),
`app/(app)/reports/reportsPageUtils.ts:140,151,168`, `lib/analysis/auditSummary.ts:62-63`, and a dozen
more. None marks the result as partial. `OperationalState` has a `kind="partial"` built for precisely
this and it is used **once** in the entire product. `contracts.ts` explicitly forbids null-to-zero in
chart data, and `LossVisuals` / `dashboardModel` do it anyway. `[code]`

**The system:** money symbol-prefixed, thousands-separated, 2dp in ledgers, **compact in chart axes**
(`£500`, `£1.5k`, `£1.2M`), never monospace, always tabular. `£0.00` is a recorded zero; unavailable is
an em-dash with a reason on demand — **never interchangeable**. Dates absolute (`20 Feb 2026`) for
recorded events, relative only for freshness. Ages as `162d open`, not `162d waiting` in one place and
`Age 162 days open` in another — both ship today `[render]`.

### 10.3 Accessibility `[P1]`

- The focus ring (§6.5) is the P0 — twice over: the white halo, and `IconButton`/`Tabs` surviving only
  on a CSS import-order coincidence.
- Forced-colours chart series (§7.5) is the second.
- **`DesktopRequiredBoundary` is now a no-op pass-through and the product reflows at 200% zoom** — the
  rev-1 concern is refuted. `[code]`
- Keyboard: row actions, chart buckets and the command palette must all be reachable; Escape closes
  only the topmost overlay and restores focus to the trigger.
- Every icon-only control needs an accessible name; every async result needs an `aria-live` region.
- **Do not lower contrast** — gate 18 runs axe on 29 routes at four viewports.

---

## 11. Verification

### 11.1 Greps with target counts

Baselines measured 2026-08-01.

```bash
rg -o '\b(?:text|w|h|p|px|py|gap|bg|border|rounded|max-w|min-w)-\[[^\]]+\]' app components | wc -l   # 2330 → <400
rg -o '#[0-9a-fA-F]{6}\b' app components lib | wc -l                                                # 723  → <150
rg -o 'style=\{\{' app components | wc -l                                                           # 1018 → <300
rg -o '\btext-xs\b' app components | wc -l                                                          # 560  → 0
rg -o '\btext-sm\b' app components | wc -l                                                          # 571  → 0
rg -o '\btext-caption\b|\btext-meta\b' app components | wc -l                                       # 156  → 0
rg -o 'font-weight:\s*650|fontWeight:\s*650' app components styles | wc -l                          # 40   → 0
rg -n 'severity-(definite|clear|probable|possible)' --glob '!styles/**' app components lib | wc -l  # 15   → 0
rg -n 'sortable=|onSort=' app components | grep -v DataTable.tsx | wc -l                            # 0    → >12
rg -c '@layer' styles/authenticated/typography.css                                                  # 0    → >0
rg -n 'surface-overlay' styles | wc -l                                                              # 0    → >6
rg -o 'disabled:opacity-' app components | wc -l                                                    # 36   → 0
rg -n 'ua-form-field__label' app components | wc -l                                                 # 1    → >80
```

Run at the start and end of every tier and paste the deltas into the PR.

### 11.2 Commands, in the order they will fail

```bash
npm run typecheck
npm run lint                                   # raw Tailwind colour ban
npm run lint:authenticated-design              # the primary design gate
npm run verify:decision-ledger                 # + coverage ledger + design guard
npm run test:decision-ledger:components        # 24 phase suites + contracts
npm run test:decision-ledger:a11y              # axe + reflow + dark + forced colours
npm run verify:ui-parity                       # interaction/href diff vs HEAD
npm run capture:decision-ledger                # product-proof SHA-256
```

`npm run release:readiness` runs 22 gates but **does not** include `verify:decision-ledger` or
`verify:ui-parity` — run those separately.

### 11.3 Acceptance scorecard

Each surface family scores 1–10 on: layering · hierarchy · rhythm · colour discipline · numeric craft ·
response · state honesty · accessibility · consistency · fit and finish. **Ship gate: every family ≥9,
no dimension below 8 anywhere.** Plus the five-second test (§3.3) on the dossier.

### 11.4 Regression guards worth adding

- A unit test asserting every `CHIP_STYLES` row's three tokens share a family prefix (would have caught
  the P0).
- A CI grep asserting `--ua-*` is never *declared* outside `styles/authenticated/`.
- An ESLint rule banning object literals pairing a `--ua-*-bg` with a `--ua-*` foreground outside
  `components/ui/`.
- A build-time check that no rendered text role resolves below 12px.
- **Wire the design gates into CI** — today only `current-product.spec.ts` runs there.

---

## 12. Appendix

### 12.1 File map

| Concern | Files |
|---|---|
| Tokens | `styles/authenticated/tokens.css`, `foundations.css`, `contracts.ts`, `tailwind.config.ts`, `app/globals.css` |
| Type | `styles/authenticated/typography.css`, `app/layout.tsx` |
| Surfaces | `styles/authenticated/surfaces.css`, `components/ui/{Surface,Panel,Card,SectionCard,JoinedSection,InsetGroup}.tsx`, `components/authenticated/AuthenticatedPageChrome.module.css` |
| Colour | `styles/authenticated/status.css`, `components/ui/badgeStyles.ts`, `StatusBadge.tsx`, `lib/utils/confidenceStyles.ts` |
| Tables | `components/ui/{DataTable,DataTableServer,RegistrySurface,RowActionsMenu}.tsx`, `styles/authenticated/tables.css` |
| Charts | `components/charts/authenticated/**`, `components/dashboard/DashboardPositionChart.tsx`, `dashboardPilot.module.css` |
| Signature | `components/ui/{EvidenceThread,FinancialEquation,SourceBeacon}.tsx`, `components/authenticated/{DecisionSentence,ActionDock,RecordedOutcome,LedgerBridge,SourceTraceRow}.tsx`, `styles/authenticated/instrument.css`, `components/authenticated/DecisionLedger.module.css` |
| Dossier | `components/claims/{ClaimReviewPanel,ClaimReviewContextColumn,ClaimReviewManageCard,ClaimReviewActionRail,ReconciliationSummaryCard,EvidenceChecklistCard}.tsx` |
| Data types | `lib/reconciliation/types.ts`, `lib/integrations/types.ts`, `lib/payouts/types.ts`, `lib/claims/decision/types.ts` |
| Money | `lib/canonical/money.ts`, `lib/utils/format.ts` |
| States | `components/states/*`, `components/ui/{OperationalState,EmptyState,LoadingState}.tsx`, `components/navigation/skeletons/pageSkeletons.tsx` |
| Copy | `lib/ui/labels.ts`, `lib/reconciliation/detectors.ts`, `docs/PRODUCT.md` |
| Guards | `scripts/check-authenticated-design.mjs`, `scripts/verify-decision-ledger.mjs`, `scripts/visual-rebuild/check-coverage-ledger.mjs`, `scripts/check-authenticated-functional-parity.mjs` |

### 12.2 Discrepancy register — authority doc vs shipped code

| # | Doc says | Code ships | Resolution |
|---|---|---|---|
| 1 | no text below 12px | `badgeStyles.ts` sm = 11px | Fix code |
| 2 | rows 48/56/64 | `tables.css` 40/44/52; `tokens.css` a third dead pair | §7.3 — four classes |
| 3 | controls 32/36/44 | 30/36/40; `IconButton` ignores the 32px icon token | Adopt doc |
| 4 | spacing to 96px | stops at 48px | Add tokens |
| 5 | Outcome Echo 600ms | token 700ms | Adopt 600ms (mind gate 22) |
| 6 | canvas `#F7F7F8` (DESIGN.md) | `#F6F7F9` (`.ua-app`) | Both superseded — `#EEF0F4` |
| 7 | no duplicate token layer | declared **four** times; dark panel ships two values | §6.6 |
| 8 | no decorative sparkline/waffle | `SparkTrend` in `SummaryRail`; `WaffleMatrixChart` dead-exported | Delete waffle; justify or delete SparkTrend |
| 9 | `--ua-*` sole namespace | `copper-*`, `accent-*`, 6 squatters in `globals.css` | §6.6 |
| 10 | Inter Tight for display | loaded, unbound | Bind (§6.4) |
| 11 | one active chart authority | `IMPL_chart_visualisation_system.md` → superseded doc | Repoint here |
| 12 | inline surfaces are flat | — | **Amended** by §6.1 |
| 13 | signature primitives "provided" | inert; 0–1 consumers each | **Specified** by §8 |

### 12.3 Signature primitive consumer counts

| Primitive | Production consumers | Location |
|---|---|---|
| `EvidenceThread` | 1 | `ClaimReviewContextColumn.tsx:217` (activity only, constants only) |
| `FinancialEquation` | 1 | `IntelligenceReportView.tsx:155` (Reports, not the case) |
| `SourceBeacon` | 1 | `DashboardOverview.tsx:674` (inside a modal) |
| `SourceTraceRow` | 1 | `ReconciliationSummaryCard.tsx:475` |
| `ActionDock` | 1 | `ClaimReviewManageCard.tsx:160` (never passes `sticky`) |
| `RecordedOutcome` | 1 | `ClaimReviewContextColumn.tsx:192` (bottom of page) |
| `LedgerBridge` | **0** | re-export only |
| `DecisionSentence` | **0** | re-export only |
