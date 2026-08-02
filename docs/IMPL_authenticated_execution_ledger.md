# Authenticated execution ledger

**Status:** active authority for authenticated product UI.
**Replaces:** `IMPL_stripe_grade_visual_upgrade.md` and the sixteen `IMPL_*` design documents preceding it.
**Scope:** `.ua-app` surfaces only. Out of scope: the public/landing tree (`--fl-*`), auth and onboarding entry surfaces, and the Chrome/Zendesk/Shopify extensions.
**Baseline measured:** 2026-08-02 against working tree at `76503cb4` + 105 uncommitted files.
**Visual evidence:** `.impeccable/final-production-core/` (28 captures, 1440×900 and 1024×900, 2026-07-31). Where a capture and current source disagree, source wins and the item says so.

This is not a design specification. The specification already exists and is largely correct. This is a ledger of adoption work, and every item in it is falsifiable by a grep or a capture.

---

## §1 Why eleven passes did not land

Seventeen `IMPL_*` documents, 29,316 lines, roughly 16,000 of them written between 28 Jul and 1 Aug. An eleven-link authority chain in which each document claims finality and re-diagnoses its predecessor as incomplete. The most recent, `IMPL_stripe_grade_visual_upgrade.md`, is the *most* concrete of them — 102 `file:line` citations, 13 numeric acceptance greps. It still produced no visible change. The reasons are mechanical.

### 1.1 Six breaks that stop an edit reaching a pixel

| # | Break | Evidence |
|---|---|---|
| B1 | **`tailwind.config.ts` never loads.** Tailwind v4.2.4 with `@import "tailwindcss"` at `app/globals.css:1` and no `@config` directive anywhere in the repo. v4 does not auto-load a JS config. Verified against compiled `.next/dev/static/css/app/layout.css`: none of its ~90 semantic utility names are emitted; `--font-sans`, `--spacing` and `--radius-lg` in `@layer theme` are all v4 defaults. The file is the *only* place a Tailwind-utility→`--ua-*` bridge is declared, so that bridge does not exist. | `tailwind.config.ts:26-237` |
| B2 | **Layer inversion.** Compiled order is `@layer theme, base, components, utilities`. `styles/authenticated/typography.css` correctly sits in `@layer components` — which means every `.ua-text-*` role class **loses to `text-sm` and `font-semibold`**. Adding a role class without deleting the utility on the same element changes nothing. | compiled `layout.css`; `typography.css:19` |
| B3 | **449 of 512 hand-written rules are unlayered.** Only `globals.css` and `typography.css` use `@layer`. `surfaces.css`, `tables.css`, `instrument.css`, `composition.css`, `states.css`, `foundations.css`, `tokens.css`, `status.css` and all 17 CSS Modules are unlayered, so they outrank *every* Tailwind utility on the same property. className edits in TSX are silently swallowed. | 348 unlayered rules in compiled output after `@layer utilities` closes |
| B4 | **Radius resolves through the wrong name.** `rounded-md` (244 uses) reads `--radius-md: 10px` from `app/globals.css:562`, not `--ua-radius-control: 8px`. `@layer base` beats `@layer theme`, so the legacy value wins. `--radius-md` has three competing definitions; `--shadow-sm/md/lg` have four each. | `globals.css:263-267, 562, 567-571, 822-824` |
| B5 | **Dashboard's one focal object had no surface at all.** `--ua-elev-1` *is* correctly wired into `.ua-working-surface`, `.ua-card--panel` and `.ua-focal-panel`. `/dashboard`'s "Payout position" panel (`.positionCanvas`) — the page's single dominant object per §2.2 — rendered as `background: transparent` with only top+bottom hairlines, so darkening the canvas darkened the whole screen instead of separating a panel from it. *(Corrected on investigation: `/work` and `/claims` were also named here in rev 1, but both are queue surfaces per §2.1, where elevation isn't the target — `.ua-section-panel`'s transparency there is only ever used for empty states, appropriately unelevated; `.ua-case-queue` already has `background: var(--ua-surface-primary)` and a proper `RegistrySurface` frame. Fixed: `.positionCanvas` only.)* | `dashboardPilot.module.css` (`.positionCanvas`, pre-fix) |
| B6 | **Two more "opt-outs" were flagged in rev 1 and are correct, not bugs.** `.ua-card--panel` gets `--ua-elev-1` at `surfaces.css:47-51`; `.ua-metric-card.ua-card--panel` zeroes it back out. Its one real caller (`CustomerProfilePageMainColumn.tsx:226-227`) nests `<MetricCard>` inside `<SectionCard>` — an already-framed container — so the zero-out is the correct "never nest a bordered card in another" rule, not a defect. Same for `claimReviewPrimitives.tsx:54`'s `ua-focal-panel rounded-none border-x-0 shadow-none`: it gives one `RailSection` a distinguishing background inside a rail that already has its own outer chrome. Neither should be touched. | `CustomerProfilePageMainColumn.tsx:223-228`; `claimReviewPrimitives.tsx:33-56` |

### 1.2 The system is good. Adoption is not.

The token layer is genuinely well-built: 241 `--ua-*` tokens, colour 94% tokenized with **zero** default-Tailwind-palette leakage, role-named chart slots, a three-step elevation ladder, WCAG reasoning in the comments. `typography.css` defines eleven complete type roles carrying size, weight, leading and tracking together. `Select.tsx` is correct — `appearance-none`, custom chevron, tokenized.

None of that reaches the product.

| Asset | Defined | Actually consumed |
|---|---|---|
| `.ua-text-working-title` | complete role | **0 files** |
| `.ua-text-caption-role` | complete role | **0 files** |
| `.ua-text-hero-value` / `-kpi` / `-detail-identity` / `-body` | complete roles | **1 file each** |
| `.ua-text-label` | complete role | 2 files |
| `.ua-text-section-title` | complete role | 5 files |
| `.ua-text-page-title` | complete role | 7 files |
| `.ua-text-dense` | complete role | 14 files |
| `.ua-text-metadata` | complete role | 72 files *(the one success)* |
| `--ua-elev-2` | 3-layer recipe | **0 references** |
| `--ua-elev-1` | 3-layer recipe | 4 CSS references |
| `Select.tsx` | correct primitive | **2 importers** vs **20 files** shipping a bare `<select>` (39 occurrences) |

What runs the app instead: **`text-sm` ×571, `text-xs` ×558, `font-semibold` ×472, `font-medium` ×290** — all resolving to Tailwind v4 defaults. 1,129 of 1,164 type-scale declarations sit on two sizes; 762 of 781 weight declarations sit on two weights. The collapsed hierarchy visible in every capture is not a matter of taste. It is arithmetic.

Tokenization by dimension: colour **94%** · shadow 87% (of only 60 sites) · radius **43%** · typography **24%** · spacing **9%** (3,265 numeric utilities against 8 `--ua-space-*` call sites).

### 1.3 Nothing was committed

105 tracked files changed, **+1,214 / −1,181 = net +33 lines**, all uncommitted. HEAD is *"add password visibility toggle to login"*. Re-running the stripe doc's own §11.1 acceptance greps on 2026-08-02:

| Grep | Its baseline | Its target | Today |
|---|---|---|---|
| `text-sm` | 571 | 0 | **571** |
| `text-xs` | 560 | 0 | **559** |
| `#hex` in app/components/lib | 723 | <150 | **723** |
| `style={{` | 1018 | <300 | **1019** |
| arbitrary Tailwind values | 2330 | <400 | **2332** |
| `font-weight: 650` | 40 | 0 | **40** |
| `sortable=|onSort=` outside DataTable | 0 | >12 | **0** |

Nine of thirteen sit at baseline ±2. The value-level prescriptions landed in full; every sweep and every composition change did not. You did implement the doc — you implemented the quarter of it that is invisible.

### 1.4 The same gap has now been diagnosed in writing three times

`REVIEW_quiet_precision_implementation.md` (25 Jul) → `IMPL_decision_ledger_instrument_grade_final_iteration.md` §1.3 "Adoption gap" (31 Jul) → `IMPL_stripe_grade_visual_upgrade.md` §8.0 (1 Aug). All three list the same signature primitives at one or zero consumers. All three counts are unchanged today. The 31 Jul document states: *"An exported component with no production consumer is not a design system."* Its own §1.7 states: *"Unauth does not need another visual direction."* Two more visual-direction documents were written after that line.

### 1.5 Authority is self-contradictory, so contributors get pulled back

`CLAUDE.md`, `styles/authenticated/README.md`, `.codex/rules/authenticated-product.md` and `.cursor/rules/authenticated-design-system.mdc` all point at `IMPL_decision_ledger_instrument_grade_final_iteration.md`, which mandates page identity at **28px / weight 650** and states *"inline surfaces are flat — not allowed: chart panels, metric blocks."* The shipped CSS is **20px / weight 600** with `--ua-elev-1` on chart panels and metric blocks. The stripe doc explicitly declined to repoint those files because doing so fails `npm run verify:decision-ledger`.

A contributor reading the enforced rules is instructed to undo the shipped code. **This document repoints them (M9). That is not optional cleanup; it is the reason changes revert.**

### 1.6 Why this document is shaped differently

1. **One flat list of atomic items.** Each has an ID, a `file:line`, a change, and an acceptance test. The stripe doc stated each item three times — as a tier, as a contract, as a per-surface defect — with no single work list anywhere, and gave per-surface acceptance for only 4 of its 12 surfaces.
2. **No item is done until `scripts/verify-visual-adoption.mjs` says so.** It prints `before → target → actual` per item. Completion cannot be claimed by assertion.
3. **It becomes the authority in the same change** (M9), resolving §1.5.
4. **Phase-end commits are named and mandatory** (§8.3). No more net +33 on a 105-file dirty tree.

---

## §2 The target, in numbers

Two densities, one system. Queue surfaces are for triage; money surfaces are for reading carefully. They share tokens, type roles and controls — they differ only in row height and in whether a focal object is elevated.

### 2.1 Queue surfaces — Work, Cases, Recovery board, Flow runs, Audit trail

| Property | Today | Target | Token |
|---|---|---|---|
| Row height | Work 64px two-line; Cases list ~138px cards | **40px** metadata / **48px** default; two-line **64px** only where a second line carries per-row-distinct information | `--ua-table-row-height-metadata/-default/-two-line` (`tokens.css:206-209`) |
| Rows visible at 1440×900 | 8 (Work) | **~20** | — |
| Body type | `text-sm` (14px/400 default leading) | **13px/18px** dense role | `.ua-text-dense` |
| Column labels | 12px/600 grey | **12px/500** tertiary, unchanged | `.ua-text-metadata` |
| Row title | `text-sm font-semibold` | **14px/600/20px** | `.ua-text-working-title` |
| Status | dot + tinted pill + border on every value | pill for **exceptional** values only; ordinary values are plain `.ua-text-dense` | §3.2 |
| Hover | none | background + border-color, 100ms | §7 amendment A2 |

### 2.2 Money surfaces — Overview, Reports, Losses, Recovery detail, Billing

| Property | Today | Target |
|---|---|---|
| Focal object | none; every panel identical | **exactly one** per view carrying `--ua-elev-1`; all others hairline (§7 amendment A1) |
| Hero value | 32px/600, correct | unchanged — `.ua-text-hero-value` |
| KPI value | `text-2xl`-ish ad hoc | 24px/600/−0.018em — `.ua-text-kpi` |
| KPI definitions | two lines of dictionary text under each of four metrics (`lib/ui/merchantCopy.ts`, 14 `definition:` fields, rendered `IntelligenceReportView.tsx:95`) | **tooltip on an info affordance**; never permanent |
| Numerals | `tabular-nums` at surface root — correct | unchanged |
| Section title | `text-sm`/`text-base font-semibold`, indistinguishable from page title | **16px/600/−0.006em** — `.ua-text-section-title` |

### 2.3 The type contract, applied

Eleven roles exist and are correct. This is the mapping the migration (M5) executes. **Adding the class is not enough — the utility must be deleted from the same element (B2).**

| Current utility pair | Role class | Renders |
|---|---|---|
| `text-2xl`/`text-xl font-semibold` on a page H1 | `.ua-text-page-title` | 20/26/600/−0.012em |
| `text-lg`/`text-base font-semibold` on a panel heading | `.ua-text-section-title` | 16/22/600/−0.006em |
| `text-sm font-semibold` on a row or chart title | `.ua-text-working-title` | 14/20/600/0 |
| `text-sm` prose in a form or panel body | `.ua-text-body` | 14/20/400/0 |
| `text-sm` inside a table, toolbar or dense list | `.ua-text-dense` | 13/18/400/0 |
| `text-xs font-medium` on a control label | `.ua-text-label` | 13/18/500 + secondary ink |
| `text-xs` supporting copy | `.ua-text-caption-role` | 12/16/400 + secondary ink |
| `text-xs` tertiary metadata | `.ua-text-metadata` | 12/16/500 + tertiary ink |

Rendered sizes after migration: **12 / 13 / 14 / 16 / 20 / 24 / 32** — seven steps, three weights, three ink levels. Today: two sizes, two weights.

---

## §3 What cheap looks like, and what good requires

You asked for this grounded in real observation rather than generic advice, and specifically for the tells of machine-generated UI. Every item below is an instance in this app, cited.

### 3.1 The thirteen tells

| # | Tell | Instance |
|---|---|---|
| T1 | **Identical prose repeated per record.** Nothing real repeats the same sentence on every row. On `/work` a generic sentence rendered on all 8 visible rows — roughly 30% of the table's pixels carrying zero information. A `REDUNDANT_DESCRIPTIONS` filter already exists at `WorkQueue.tsx:56-66`, but it is an **exact-string denylist** that the shipped copy evades: the set contains *"Verify the case evidence and record the next merchant action."* while the captured render shows *"Review the latest connected evidence and record the next merchant action."* A near-miss defeats it. | `WorkQueue.tsx:56-66` |
| T2 | **The same sentence on sibling cards.** Case detail renders three "Independent recommendations" cards whose body copy is byte-identical across all three. Reads as unfilled placeholder. | capture `case-detail-1440x900.png` |
| T3 | **Dictionary definitions under KPIs.** Two lines of explanatory prose beneath each of four Reports metrics. Definitions belong in a tooltip; permanent help text is the surest sign nobody decided what the number was for. | `merchantCopy.ts` (14 `definition:`), `IntelligenceReportView.tsx:95` |
| T4 | **Triple-encoded status.** Dot **and** tinted fill **and** border **and** colour for one state — then `Ageing` appears on every visible row, so the most emphatic element on screen encodes nothing. | `cases-1440x900.png` |
| T5 | **Decorative bars duplicating the number beside them.** Overview "What needs attention" pairs a thin violet track with the same count as a numeral 40px to its right. Two encodings, one fact, neither improved. | `overview-1440x900.png` |
| T6 | **Zero-count filters at full weight.** `Awaiting 3PL 0`, `Awaiting supplier 0` render identically to filters with results. | `cases-1440x900.png` |
| T7 | **Native form controls.** 39 bare `<select>` across 20 files and 24 bare `<textarea>` across 20 more — OS chevron, OS focus ring, visible resize grip. One `appearance-none` in the entire codebase outside the primitive. The single loudest amateur signal in the product. | `verify-visual-adoption` M6.a / M6.b |
| T8 | **Raw `<details>` disclosure triangles.** `▶ View chart data`, six instances, browser-default marker. | `grep -rn '<details' app components` |
| T9 | **Full-width everything.** A 685px-wide email input inside a 720px settings column. Input width should follow content, not container. | `settings-1440x900.png` |
| T10 | **Four different "selected" treatments.** Sidebar (tint + 2px bar + accent ink), filter chips (dark fill), tabs (underline), settings rail (tinted pill). One product, four vocabularies. | four captures |
| T11 | **The same fact three times on one screen.** Integrations states "4 need attention" in the stat row, again in a full-width amber banner, again as amber body text on each affected row. | `integrations-1440x900.png` |
| T12 | **Truncation leaving one or two characters.** `Avery Shah · A…`, `Jordan Bell · An…`. Either the column fits the content or the field does not belong in the column. | `work-1440x900.png` |
| T13 | **Visible defects shipped.** A refresh glyph overlapping the label of "Update recommendations"; a disabled "Decision not ready" button at grey-on-grey; mixed button hierarchy (solid violet, outlined, bare text, icon+text) with no legible logic on a single Overview viewport. | `case-detail-1440x900.png`, `overview-1440x900.png` |

The common thread: **generated content that was never edited, and encodings applied uniformly rather than selectively.** Real interfaces are edited down. A status that is true of every row gets deleted, not styled. A sentence that is identical on every row gets deleted, not repeated.

### 3.2 The flat-design covenant

Flat with hairline separation is a legitimate world-class choice and the right one for a financial-operations tool. It is also the least forgiving choice available, because it removes depth as a hierarchy tool and spends its entire budget on five things:

1. **A type scale with real contrast.** Not size alone — size *and* weight *and* ink level moving together. Two adjacent headings that differ only by 2px read as a mistake. The app currently has two sizes and two weights (§1.2); the covenant needs the seven-step ramp of §2.3.
2. **A neutral ramp with enough steps, slightly tinted.** `tokens.css:74-105` already does this correctly — a cool zinc ramp with five alpha-based border weights, because a dead-grey ramp reads dirty beside a violet accent. Keep it. The failure is not the ramp; it is that 620 `--ua-border-subtle`/`-default` references draw hairline rectangles around everything, so the ramp encodes no hierarchy.
3. **Strict density and optical alignment.** Consistent row heights, one gutter, one vertical rhythm, numerals right-aligned and tabular, labels optically aligned rather than mathematically. The chrome module is right (`max-width: 1600px`, 32px gutter, 20px stack gap); the interiors are not.
4. **Accent scarcity.** One violet, used for selection, focus and current-series only — never for "this is important". `tokens.css:108-113` states this rule exactly. Overview currently spends it on selected nav, primary button, all chart bars, every progress fill and every link at once, so it means nothing.
5. **Impeccable micro-states.** Focus, hover, pressed, disabled, loading, empty, error — each designed, each consistent. This is where the covenant is currently unpaid: there is no row hover at all, and disabled states are grey-on-grey.

**This app is flat and has none of the five.** That is why flat currently reads as unfinished rather than as precise. The direction is not the problem; the unpaid covenant is.

### 3.3 Standing rules

- A visual encoding that is true of every row is deleted, not styled.
- Help text that is permanent is a tooltip that has not been built.
- If two elements are adjacent and differ by less than one full step of the type ramp, they are the same level — make them identical or move one a full step.
- Any element that can be identified by position or proximity does not also need a border.
- Every interactive element has hover, focus-visible, active and disabled defined at the primitive, never at the call site.
- Numbers that can be compared down a column are right-aligned and tabular. Numbers that cannot are left-aligned.

---

## §4 P0 — mechanism

Nothing in §5 or §6 can land until these are true. Each item is atomic and independently verifiable.

| ID | Item | Change | Acceptance |
|---|---|---|---|
| **M1** | Dead Tailwind config | Delete `tailwind.config.ts`. Move the semantic mapping into a `@theme` block in `app/globals.css` — the v4-native path. Only port names with live consumers; the ~90 unused semantic colours go. `tailwindcss-animate` is also not loaded, so either wire it via `@plugin` or delete the dependency. | `tailwind.config.ts` absent; `@theme` present in `globals.css`; `grep -c 'animate-in' ` compiled CSS matches intent |
| **M2** | Layer inversion | Wrap the 12 unlayered files in `styles/authenticated/*.css` in `@layer components` (`typography.css` is the one already correct). Wrap the 17 `*.module.css` files too, or accept CSS as authority and stop editing their classNames — pick one and record it. | `verify-visual-adoption` M2.a = 0; 0 unlayered class rules in compiled output after `@layer utilities` closes (currently 348) |
| **M3** | Radius collision — **done** | The three `--radius-md`/`--shadow-*` blocks in `globals.css:root` are correct as-is — they serve the public/marketing tree (out of scope) and were left untouched. The actual defect was `.ua-app` inheriting the public value instead of `--ua-radius-control`; fixed with a scoped legacy-name bridge in `tokens.css`'s `.ua-app, .ua-auth-surface` block, so `rounded-md`/`shadow-md` resolve correctly only within authenticated surfaces. Deleted the dead `.dark` selector block (73 lines, confirmed zero call sites — this app uses `data-theme`, not a `.dark` class). | confirmed empirically: `:root`'s `--radius-md` computes 10px (public, unchanged); `.ua-app`'s computes 8px = `--ua-radius-control` |
| **M4** | Transparent focal surface (B5) — **done** | `.positionCanvas` (Dashboard's "Payout position") now carries `--ua-elev-1` + `--ua-surface-primary` in place of its top/bottom hairlines, matching `.ua-focal-panel`'s recipe exactly. `/work` and `/claims` were re-scoped out on investigation (B5) — no change needed there. The `MetricCard`/`RailSection` "opt-outs" (B6) are correct nested-composition exceptions and were left alone. | `verify-visual-adoption` M4.a/M4.b show measured progress (4→5, 8→7); remaining headroom is future `--ua-elev-1` adoption on money surfaces in §5/§6, not this item |
| **M5** | Type migration | Migrate 1,129 `text-sm`/`text-xs` and 472 `font-semibold` sites onto the eight role classes per §2.3. **Delete the utility on each element as you add the class** (B2) — this is the step that makes it visible. Mechanical, file by file, `.ua-app` only. | `text-sm` 571→<40, `text-xs` 558→<40, `font-semibold` 472→<60; `.ua-text-working-title` 0→>30 files; `.ua-text-caption-role` 0→>20 files |
| **M6** | Native controls | Replace 39 bare `<select>` (20 files) with `components/ui/Select`, 24 bare `<textarea>` with a new `Textarea` primitive built to match `Input.tsx`, 6 `<details>` with a styled disclosure, and 10 raw checkboxes with a styled primitive. | `verify-visual-adoption` M6.a–M6.d all 0 |
| **M7** | Repeated copy (T1–T3) | Replace the exact-string denylist at `WorkQueue.tsx:56-66` with a structural rule: suppress any description shared by more than one row in the current result set. Do the same for the case-detail recommendation cards. Move the 14 `merchantCopy.ts` `definition:` fields behind a tooltip. | no string renders identically on >1 row of any queue; `IntelligenceReportView.tsx:95` `<dd>` removed |
| **M8** | Status encoding (T4, T10) | One selected-state vocabulary across sidebar, chips, tabs and settings rail. Pills reserved for exceptional values; ordinary values render as plain dense text. Drop `Ageing` where it is true of every row. | 1 selected treatment; `StatusBadge` call sites carrying an always-true value = 0 |
| **M9** | Authority convergence | Repoint `CLAUDE.md`, `styles/authenticated/README.md`, `.codex/rules/authenticated-product.md`, `.cursor/rules/authenticated-design-system.mdc` at this document. Reduce the 16 superseded `IMPL_*` docs to one-line "Superseded by" stubs. Update `scripts/verify-decision-ledger.mjs` for the new authority. Record the resolution: **type ramp is 20px/600, not 28px/650**; **elevation is permitted per §7 A1**. | `verify:decision-ledger` green; 0 rule files citing the old authority |
| **M10** | Verifier | Build `scripts/verify-visual-adoption.mjs` with the §Appendix baselines; wire into `npm run verify:polish`. | runs green with every M-item at target |

**M1–M4 must land before M5.** Migrating type into a cascade where utilities are swallowed by unlayered CSS wastes the sweep.

---

## §5 P1 — three flagships to 9.5

These are the reference implementations. Everything in §6 applies patterns proven here. Each defect is keyed to the 2026-07-31 capture; re-capture before starting, since the tree has moved.

### 5.1 Work — `app/(app)/work/page.tsx`, `components/work/WorkQueue.tsx`

| ID | Defect | Target |
|---|---|---|
| W1 | Rows 64px carrying a title, an object link and a boilerplate sentence; 8 rows visible | Drop the boilerplate line (M7). 48px `default` rows, two-line only where line 2 is row-distinct. ~20 rows visible |
| W2 | "When will the queue become risky?" is a 3-segment full-width bar over a 3×2 legend whose numbers are misaligned and whose two grey segments are indistinguishable | Delete the bar. The six counts are a single dense row of label/value pairs; overdue is the only coloured one |
| W3 | Priority is a yellow pill for `High` and plain text for `Medium`/`Low` | One encoding. Plain dense text for all three, with `High` in critical ink. No pill |
| W4 | Two pills stacked vertically per row (priority + state) forcing row height | State moves to its own column as plain text; the pill goes |
| W5 | Owner truncates to `Avery Shah · A…` (T12) | Widen to fit, or drop the secondary fragment |
| W6 | Identical decorative icon with grey circular background on every row | Delete |
| W7 | `⋯` menu on some rows, absent on the two overdue rows | Present on all rows, revealed on hover/focus |
| W8 | Checkbox column with no bulk-action bar | Wire the bulk bar, or remove the column |
| W9 | `Save view` sits inside the filter tab list | Move to the right of the toolbar as a secondary action |
| W10 | Table header 13px/600 grey on near-white, barely distinguishable from body | `.ua-text-metadata`, tertiary ink, sticky (already correct at `tables.css:78`) |

**Acceptance:** ≥18 rows at 1440×900; one status encoding; zero repeated strings; `verify-visual-adoption` green for W1–W10.

### 5.2 Cases — `ClaimsPageView.tsx`, `ClaimsQueueClient.tsx`, and case detail

| ID | Defect | Target |
|---|---|---|
| C1 | List items are ~138px five-line cards with two pills | 64px two-line rows: line 1 name + value, line 2 reference + state + age |
| C2 | Toolbar carries input + primary Search button + 4-way segmented sort + "Rows per page" + 3-way segmented, on one line, in three visual styles | Search is secondary, not primary violet. One segmented-control style. Page size moves to the pagination footer |
| C3 | Eight filter chips including two at count 0 (T6) | Zero-count filters render disabled or are omitted |
| C4 | Selected row uses violet tint **and** left violet bar, adjacent to a second violet tint in the detail pane | One selection treatment (M8); the detail pane's top section is not tinted |
| C5 | Mono and sans mixed mid-sentence with visible size mismatch (`Helpdesk #G-4316 · Assigned · 43d waiting`) | Mono for the identifier only, at matched optical size |
| **Case detail** | | |
| C6 | Native `<select>` "Choose a decision…" and native `<textarea>` with visible resize grip in the Decision rail — the loudest defect in the product | `Select` + new `Textarea` primitive (M6) |
| C7 | Refresh icon overlaps the label of "Update recommendations" (T13) | Fix the gap |
| C8 | Three recommendation cards with byte-identical body copy (T2) | Per-axis copy, or delete the body and keep the verdict |
| C9 | Five bold near-black headings in one viewport, differentiated by size alone | Page title 20 → section 16 → working 14, with ink stepping down (§2.3) |
| C10 | Right rail top edge sits 56px above the main column's first heading | Shared baseline |
| C11 | Disabled "Decision not ready" is grey-on-grey; the Decision panel header carries a raw `▲` | Use the disabled token pair; replace the glyph with the disclosure primitive |
| C12 | Tabs' active state is not legible | Active tab: primary ink + 2px accent underline; inactive: secondary ink |

**Acceptance:** no native controls on the route; ≥3× list density; one heading step between every adjacent level.

### 5.3 Overview — `app/(app)/dashboard/page.tsx`, `components/dashboard/DashboardOverview.tsx`

| ID | Defect | Target |
|---|---|---|
| O1 | Every panel identical weight; no focal point | "Payout position" is the single elevated object (`--ua-elev-1`, §7 A1). Everything else hairline |
| O2 | Section headings ("Payout position", "What needs attention", "Data trust") compete with the page title | `.ua-text-section-title` at 16/600 against a 20/600 page title |
| O3 | Progress bars duplicating adjacent counts (T5) | Delete the bars; keep count + exposure |
| O4 | Chart: two gridlines, default dot legend, axis labels at body ink, `0` misaligned against the other y-labels, one green bar invisible among violet | Full grid at `--ua-chart-grid`, axis at `.ua-text-metadata` tertiary, right-aligned y-labels, legend inline in the header, recovered series at `--ua-chart-neutral-700` |
| O5 | `▶ View chart data` raw disclosure (T8), also on Reports | `ChartDataTableDisclosure` styled (M6) |
| O6 | Amber "Financial values only" strip is a full-bleed row with a small triangle — reads as a browser notification bar | Inset callout at `--ua-radius-control`, tinted, 12px inset from the panel edge |
| O7 | Four button treatments in one viewport with no logic (T13) | One primary per view; everything else secondary or link |
| O8 | `Reports` outlined button stranded in the filter row | Move to the page header action slot |
| O9 | Sidebar dead zone between `Settings` and `Morgan Ellis`; footer links wrap 2 + 1 | Pin the account block; single-line footer or stacked consistently |

**Acceptance:** exactly one elevated object; one primary button; chart passes the §7 chart rules; three legible heading levels.

---

## §6 P2 / P3 — remaining surfaces

Shorter teardowns applying the proven patterns. Ordered by traffic.

**P2 — Reports · Losses · Recovery · Customers**
- Reports: KPI definitions → tooltip (M7); "8 cases with recorded exposure" link and "8 cases carry recorded exposure in this scope." state the same fact twice — keep one; the step-area chart's plot area stops ~27px short of its container; the "Loss causes" panel holds one row above ~200px of void — collapse to content height; two identically-styled `Export` buttons at different scopes.
- Losses · Recovery · Customers: apply §5.1 queue density and §5.2 detail patterns. `CustomerProfilePageView.tsx` has an in-file comment describing a `[1fr 380px]` sticky-rail layout that the JSX does not build (`grid-cols-1 gap-3`) — build it or delete the comment.

**P3 — Integrations · Settings · Rules · Flows · Notifications · Help · Audit trail · Billing**
- Integrations is the strongest surface today; fix the triple-stated fact (T11), the two states sharing one amber (`Stale` and `Not syncing`), the merged `Records`/`Last data` columns, and the variable row heights caused by 2- vs 3-line descriptions.
- Settings: native selects (M6); constrain input width to content (T9); one save scope per section; the three-level nav states its location three times (topbar breadcrumb, rail title, page title) — keep one.

**Shell consistency (cross-cutting).** Five competing page shells — `PageFrame` (16), `WorkbenchPage` (3), `DetailPageShell` (3), `SettingsPageShell` (6), plus ~21 files hand-importing `AuthenticatedPageChrome.module.css` directly — and two routes with no shell at all (`/dashboard`, `/settings/billing`). Converge on `PageFrame` with documented variants. This is the largest single source of "every page looks like a different redesign".

---

## §7 Rule amendments

Stated explicitly, with rationale, because §1.5 is what makes changes revert.

**A1 — Elevation on the focal object.** `--ua-elev-1` is permitted on **exactly one** surface per view: the dominant working object. It replaces that surface's perimeter border; never both. All other surfaces stay hairline. *Rationale: with zero elevation anywhere, hierarchy must be carried entirely by type and density, and the type ramp is not yet in place. One elevated object costs nothing in restraint and gives every view a focal point.* Supersedes `decision_ledger §6.41`'s blanket "chart panels, metric blocks: not allowed".

**A2 — Row hover.** Permitted on `background` and `border-color` only, `--ua-duration-fast` (100ms), `--ua-ease-standard`. *Rationale: a dense queue with no hover feedback reads as a static image. Background is not elevation.*

**Unchanged and still enforced:** no gradients, no `radial-gradient`/`linear-gradient`, no `feGaussianBlur`, no glow, no chart textures; no `transition-all`; no `hover:-translate-`, `hover:shadow-`, `ua-hover-lift`, `ua-hover-glow`; one product accent; semantic colour meaning reserved to `status.css`; `--ua-*` as the only authenticated namespace; Recharts defaults never rendered.

`scripts/check-authenticated-design.mjs` is amended for A1 and A2 only, in the same commit as M9.

---

## §8 Verification

### 8.1 The runner
`node scripts/verify-visual-adoption.mjs` — every ledger item, `before → target → actual`, non-zero exit on regression. Wired into `npm run verify:polish`.

### 8.2 Gates
```
npm run lint:authenticated-design && npm run verify:polish && npm run typecheck
npm run test:decision-ledger:components
npm run test:decision-ledger:a11y
npm run capture:decision-ledger
```
Captures authenticate through `/api/test/e2e-auth`; no password entry is required. Capture **light and dark at 1440 and 1024**: 130 of 241 tokens have a dark counterpart, so every colour change is two edits, and chart colour is resolved in JS via `getComputedStyle` (`useChartTheme.ts:39-71`) — a third path that must be checked visually.

`/dev/design-system` (`DesignSystemGalleryClient.tsx`, 1,111 LOC) is the primitive-level harness. Use it for M5 and M6.

### 8.3 Commit plan — mandatory
| Commit | Contents |
|---|---|
| 1 | M1–M3 (cascade + config). No visual change expected; captures must be identical. |
| 2 | M4 (focal surfaces) + §7 amendments + M9 (authority) |
| 3 | M5 (type migration) |
| 4 | M6 (controls) + M7 (copy) + M8 (status) |
| 5 | M10 + baseline re-capture |
| 6–8 | §5 flagships, one commit each |
| 9+ | §6 surfaces, grouped |

Commit 1 is the proof that the mechanism is fixed: if captures change, something else was wrong. Commit 3 is the one that will look dramatic.

### 8.4 Scorecard
Machine-checkable only. No 1–10 subjective dimensions, no five-second stranger test — the previous document's ship gate was unfalsifiable and passed while the build scored 6/10.

- Rendered type sizes inside `.ua-app`: exactly 7 · weights: exactly 3
- Elevated objects per view: exactly 1
- Native form controls outside `components/ui/`: 0
- Distinct selected-state treatments: 1
- Strings rendering identically on >1 row of any queue: 0
- Rows visible at 1440×900 on Work: ≥18
- Unlayered class rules in compiled CSS: 0
- All §8.2 gates green

---

## Appendix — baseline, 2026-08-02

| Measure | Value |
|---|---|
| `text-sm` / `text-xs` / `text-base` / `text-lg` / `text-xl` / `text-2xl` | 571 / 558 / 22 / 9 / 2 / 2 |
| `font-semibold` / `font-medium` / `font-bold` / `font-normal` | 472 / 290 / 10 / 9 |
| Role-class adoption (files): hero-value · kpi · page-title · detail-identity · section-title · working-title · body · dense · label · caption-role · metadata | 1 · 1 · 7 · 1 · 5 · **0** · 1 · 14 · 2 · **0** · 72 |
| `--ua-elev-1` / `--ua-elev-2` references | 4 / **0** |
| `--ua-border-subtle` / `--ua-border-default` references | 325 / 295 |
| `<select>` / `<textarea>` / `<details>` / raw checkbox — occurrences outside `components/ui/` | 39 (20 files) / 24 (20 files) / 6 (5 files) / 10 (6 files) |
| `ui/Select` importers | 2 |
| `styles/authenticated/*.css` files / unlayered | 13 / 12 |
| `dashboardPilot.module.css` `background: transparent` | 8 |
| `rounded-md` / tokenized radius / total radius | 244 / 174 / 561 |
| Numeric spacing utilities / `--ua-space-*` call sites | 3,265 / 8 |
| Unlayered hand-written rules | 449 of 512 |
| Tokenized share — colour · shadow · radius · type · spacing | 94% · 87% · 43% · 24% · 9% |
| `--ua-*` tokens defined / with a dark counterpart | 241 / 130 |
| Uncommitted working tree | 105 files, +1,214 / −1,181 |
