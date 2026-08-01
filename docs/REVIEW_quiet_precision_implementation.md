# HISTORICAL REVIEW — Quiet Precision implementation

- **Date:** 2026-07-25
- **Reviewed against:** [`IMPL_quiet_precision_product_ui.md`](./IMPL_quiet_precision_product_ui.md), [`styles/authenticated/README.md`](../styles/authenticated/README.md)
- **Method:** live browser review at 1440×900 (light + dark) and 390×844, logged in as the seeded demo merchant; plus static audit of tokens, primitives, charts, states, and the deletion ledger
- **Verdict:** the *appearance* landed. The *cutover* did not. The doc claims "product-wide implementation complete"; the runtime is a new token layer sitting on top of the old one, and several page families never adopted the composition the spec prescribes.

> [!WARNING]
> Historical evidence only. This review and its source specification cannot
> override the Living Precision contract or its numbered execution phases.

---

## 1. What is genuinely good

Credit where it is due — these are real wins, not participation trophies.

**The palette and semantic system are right.** Every value I spot-checked in `styles/authenticated/tokens.css` matches the spec tables: canvas `#f3f3f2`, shell `#f8f8f7`, ink `#202020`, action `#242424`, and all six semantic triplets (`--warning: #775a12`, `--success: #246b4d`, `--risk-critical: #963f3f`). The chart series palette matches §8.2 slot-for-slot in both themes. Nobody fudged the numbers.

**Dark mode is the strongest part of the build.** It is a genuine relational inversion, not a second aesthetic. Surfaces step correctly, the primary button inverts to light-on-dark, semantic badges keep their meanings with subdued fills, and geometry is identical to light. This is the part that would survive a designer's review untouched.

**Near-black primary actions read correctly.** `Review evidence →` on `/claims` and `Invite` on `/settings/team` have exactly the ink-led weight the reference images have. The reference's core move — hierarchy from ink, not hue — is understood.

**`/claims` KPI group is the best surface in the app.** Four equal cells, one bordered container, dividers rather than gaps, 22px/500 tabular values, currency retained. This is the reference's grouped-stat treatment, correctly executed.

**Density controls exist and work.** The rows-per-page segmented control, the neutral filter chips with plain counts, and the date-range segmented control on `/reports` are all correctly restrained — neutral selected states, no borrowed semantic colour.

**Mobile fundamentals are sound.** 48px top bar, an `Open navigation` drawer trigger, KPI groups collapsing to a 2×2 grid, and **no page-level horizontal overflow at 390px**. The mobile contract in §4.5 was actually implemented, which is the part teams usually skip.

**`HatchDefs` is deleted.** The single most-named chart remnant is genuinely gone from the tree.

---

## 2. The architectural problem: the token cutover is inverted

This is the finding that matters most, because everything downstream inherits it.

Spec §14.2 orders, in this order: (1) define `--ua-*` **directly**, (2) remove duplicate unprefixed aliases, (3) do not forward `--accent`, `--surface`, `--bg-*`, `--chart-orange` "or similar historical names into the new system."

What shipped is the exact inverse:

```css
/* styles/authenticated/tokens.css */
.ua-app, .ua-auth-surface {
  --accent: #242424;              /* legacy name holds the new value  */
  --border-subtle: #f1f1f0;
  --chart-orange: #936b25;
  ...
  --ua-canvas: var(--surface-base);      /* --ua-* is the DERIVED layer */
  --ua-text-primary: var(--text-primary);
  --ua-chart-orange: var(--chart-orange);
}
```

The legacy namespace was not deleted — it was **promoted to canonical**, and `--ua-*` was added as an alias pointing back at it. The file's own header admits it: *"The `--ua-*` aliases below keep every product surface on one visual contract."*

Measured consequences in authenticated code (`app/(app)/**` + `components/**`):

| | count |
|---|---:|
| `var(--ua-*)` references | **434** |
| `var(--legacy-*)` references | **3,271** |
| distinct legacy token names still consumed | 102 |
| `var(--accent)` references (the old rust hue's name) | 145 |

So ~12% of token references went through the migration. The other 88% still read names the deletion ledger requires absent. It *looks* right only because the alias block backfills them.

Why this is not merely doc purity:

- **Semantics have rotted.** `--accent` now means "near-black ink". A contributor reaching for an accent gets graphite. `--chart-orange` resolves to gold. The names actively lie about their values.
- **`--ua-border-subtle` is off by one step.** It resolves to `#f1f1f0`, but §3.1 assigns `#ECECEA` to `--ua-border-subtle` and `#F1F1F0` to `--ua-surface-muted`. The alias chain picked the muted-*surface* value for a *border*. `#F1F1F0` on `#FFFFFF` is ~1.03:1 — effectively invisible. This is why panel dividers and section rules across the app read as absent rather than quiet, and why several pages look like floating blocks instead of joined sections.
- **The radius hierarchy is flattened.** `--radius-sm` and `--radius-md` are both aliased to `6px`, so any surface that historically asked for `--radius-md` now renders at control radius. §3.4's "nested surfaces step down in radius" (overlay 14 → surface 10 → control 6) cannot hold where that alias is in play.
- **Spec token names do not exist in the code.** `--ua-radius-surface`, `--ua-radius-round`, `--ua-shadow-float`, `--ua-shadow-menu`, `--ua-space-0-5`, `--ua-space-1-5`, `--ua-space-2-5` are all in the spec tables and **none are defined**. The implementation shipped a different vocabulary (`--ua-radius-card`, `--ua-shadow-card`, `--ua-space-0..6,8,10,12,16`). The spec is now describing a system that isn't there.
- **Shadow and control values diverge from the spec.** `--shadow-lg` is `0 12px 30px / 10%` vs spec `--ua-shadow-menu: 0 8px 24px / 12%`; overlay is `0 18px 48px / 14%` vs spec `0 24px 64px / 18%`. Input height is `34px` vs spec **38px**; large button `36px` vs spec **40px**.
- **The spacing migration was consciously abandoned.** `tokens.css:247-259` carries a warning that `--ua-space-N` is not `var(--space-N)` above N=6, ending: *"component migration in this pass left every existing `--space-N` reference above 6 untouched rather than risk a mismatched swap."* That is an in-code admission that a required migration step was skipped.
- **Every badge is a pill.** `--ua-badge-radius: var(--ua-radius-pill)`. §6.7 permits round "only for compact status pills"; §6.3 requires status, metadata, and filters to stay visually distinct. Because all three render as pills, they are indistinguishable — see §4 below.

**Dark-mode remnant:** inside `.ua-app`, dark canvas is the correct `#101010`. But `document.body` outside that wrapper still computes to `#0E0B08` — a warm brown-black from the legacy dark palette. Latent rather than prominent (the app wrapper covers the viewport), but it is precisely the espresso remnant the ledger names, and it will surface on overscroll.

---

## 3. The enforcement gates do not enforce

Spec §17.1 requires the design lint to reject forbidden token names, palette literals, landing primitives in product, page-local static colour/radius/shadow, unapproved table/status/overlay implementations, chart textures, and route-local skeleton markup.

```
$ npm run lint:authenticated-design
Authenticated design guard passed (404 files checked).
```

It passes with 3,271 legacy token references in the tree. `scripts/check-authenticated-design.mjs` is not empty — it does check old palette literals, landing *tokens*, hardcoded colours, arbitrary rounded-value utilities/`boxShadow`, direct chart-library imports, echarts, the deleted `--dashboard-*` remap, Recharts defaults, and `animate-pulse` in `loading.tsx`. The gap is narrower but decisive: **there is no rule for the legacy token namespace itself**. `oldPalette` only matches `--copper-*` and `--brand-rust*`, so all 3,271 `var(--accent)` / `var(--surface)` / `var(--text-primary)` references pass unnoticed — and that is the single violation the whole cutover turns on. Missing alongside it: landing *primitive* imports, arbitrary non-radius design literals (`text-[13px]`, arbitrary tracking utilities), hand-rolled tables, uppercase type, and loading files that hand-build geometry without importing a shared skeleton.

Meanwhile the gate that *does* work is red:

```
$ npm run verify:ui-parity
Authenticated functional parity check failed.
Missing destinations:
- /reports?range=${value}
- /api/shopify/install?shop=${value}
```

Two navigation destinations were lost in the refactor. §17.1 lists this gate as mandatory and §17.3 requires "every route and redirect" preserved. This is currently failing on the working tree.

**Arbitrary Tailwind values** (§14.4 prohibited, §16.2 listed for deletion) are still pervasive in authenticated code: **1,955** arbitrary-value classes, of which **428 contain a raw hex or px literal** (`text-[13px]`, `rounded-[10px]`, raw-hex background utilities) and only 229 route through `var(--ua-*)`. These are visible in the live DOM — e.g. the `/work` filter chips render with a CSS-variable rounded utility and a compact fixed height.

---

## 4. Systemic design problems

These recur on nearly every surface, so fixing them once fixes the app.

### 4.1 The same numbers are stated three times per page

This is the most damaging *design* problem, and it is not a spec violation — it is worse, it is an information-design failure the spec's structure invited.

On `/claims`: the KPI group says *Open payout cases 12 · Ready for decision 4 · Payout exposure £1,468.23*. Directly below, a callout says *"12 open cases holding £1,468.23 in exposure — 4 ready to decide now."* To the right, a "Decision states" rail restates *Needs evidence 3 · Ready for decision 4 · Manual review 3* — which the filter tabs above already show as *Needs evidence 3 · Ready for decision 4 · Manual review 3*.

That is the same dataset rendered **four** times in one viewport.

`/work` does it too (KPI group → "Deadline risk" callout → "Deadline risk" rail, all saying *21 overdue, 0 due today*). `/recoveries` does it three times (KPI group → callout → "Recovery progress" rail, all saying *£58.25 of £941.83, 6%*).

Worse, on `/recoveries` the two groupings **disagree**: the board columns total 8 cases (3 / 2 / 3) against a KPI of 9 open, while the "Stage volume" rail totals 10 (2 / 6 / 1 / 1). Two incompatible partitions of the same cases sit side by side with no explanation.

The `KeyInsightCallout` + `SummaryRail` primitives were introduced to de-chart operational pages. They have become a mechanism for restating the KPI strip in prose and then again in a rail. Pick one carrier per fact.

### 4.2 Pill soup

Because every badge is round, a single `/recoveries` card shows six pills: `Evidence needed` (gold), `2 evidence missing` (gold), `Royal Mail` (neutral), `Case context` (neutral), `Evidence complete` (green), `Evri` (neutral). Three different semantics — status, evidence gap, source provenance — in one shape. `/claims` is the same: `Recovery opened`, `Ageing`, `Recoverable`, `Open`, plus two recommendation chips, all pills.

§6.3 is explicit: *"Do not visually conflate tabs, filters, status, and metadata."* Give status badges the round geometry and move metadata/source chips to control radius (6px) with no dot, per §6.7.

### 4.3 Cards nested inside cards, everywhere

`styles/authenticated/README.md` states: *"Do not nest free-standing bordered cards directly inside another bordered panel."*

- `/settings/team`: an outer bordered "Team" panel contains three free-standing bordered cards (Invite teammate / Active members / Role audit).
- `/reports`: a bordered "Value this period" panel contains a bordered "Payout performance" card whose entire content is one sentence of unavailable-state copy.
- `/claims` detail pane: bordered "WORKFLOW" and "RECOVERY CHASE-UP" cards inside the bordered detail pane inside the bordered split surface.
- `/recoveries`: shaded column → white bordered card → a third bordered inset holding "Case context" and the actions. Three surface levels per card.

These should be joined sections divided by a 1px rule, per §6.4. The invisible `--ua-border-subtle` (§2) makes teams reach for a full card border to get any separation at all — so fixing the border token will remove much of the motive for this.

### 4.4 All-caps letter-spaced eyebrows are back

§3.2: *"Sentence case everywhere"* and *"Avoid letter spacing except machine codes."* Present on nearly every page: `OVERVIEW` / `WORK` / `CONFIGURE` / `REPORTS AND SETUP` (sidebar groups), `SETTINGS`, `WORKSPACE ACCESS`, `DEADLINE RISK`, `PAYOUT DECISIONS`, `RECOVERY`, `WORKFLOW`, `RECOVERY CHASE-UP`. 30 files use `uppercase`. They read as a second type system layered over the sentence-case one.

### 4.5 Duplicated location labels

`/settings/team` stacks **four** location indicators: utility-header breadcrumb `Settings › Team`, in-page breadcrumb `Settings / Team`, eyebrow `WORKSPACE ACCESS`, then title `Team management`. §4.3 says the header "must not duplicate the page title"; §4.4 says eyebrows are omitted unless they express something breadcrumbs cannot. `/dashboard` does it too (`Overview` in the header, `Overview` as the title).

### 4.6 Charts still carry forbidden treatments

Verified in the running app and in code:

- **The dashboard's primary series is gold.** The "Workflow breakdown" bar and its `Needs action` / `Waiting` legend render `rgb(147,107,37)` via the still-live `AuthenticatedCharts_orange__` / `_yellow__` module classes. `components/dashboard/dashboardModel.ts:29` binds the first financial metric (Payout exposure) to `--ua-chart-orange` / tone `orange`. §8.2 assigns slot 1 to `#4F6FA8`; §16.4 lists the orange-leading financial convention for deletion. This is the single most visible violation in the app.
- **`/recoveries` "Recovery progress" is a patterned track.** The meter renders ~56 discrete repeated ticks rather than one flat fill on a neutral track (`TickMeterRow.module.css`). §16.4 lists "Hatch patterns and patterned tracks" for deletion; §8.3 requires one flat fill.
- **`TrendLineChart` still paints an opacity-wash area fill** under the line (`TrendLineChart.tsx:65`). §8.3: *"Line: 2px stroke … no area wash by default."*
- **The tone model is hue-named, not slot-numbered.** `components/charts/authenticated/types.ts` exposes seven hue names where §8.2 defines five numbered slots plus neutral, and `orange` and `yellow` resolve to the *same* hex in both themes — so meaning rides on an arbitrary hue name.
- **`/reports` has a page-local `ChartPanel`** (`components/reporting/DashboardCharts.tsx:147`) shadowing the canonical one, bypassing the accessible-table/legend/caption contract.
- **The dashboard's main chart has no accessible table or text summary** (`DashboardOverview.tsx:280`), failing §8.1.

### 4.7 Landing primitives are still the product's card primitive

22 independently-verified findings, all confirmed against source. The root cause is one line: `components/ui/index.ts:67` re-exports the entire `LandingPrimitives` family from the **product** design-system barrel. Because of it, `PanelCard` is the section shell on `/claims`, `/recoveries`, `/customers`, `/customers/[id]`, `RecoveryCaseCard`, `NotificationPreferencesForm`, `BillingSettingsClient`, `BehaviorRoadmap`, `ConnectedObjectDetail`, `NotificationCentre` — **and on `/login`, `/reset`, `/reset/update`, and `/signup`**. Worse, `LandingPrimitives.tsx:130` gave `PanelCard` authenticated-only variants (`app`, `appMuted`, `appInset`), which is the "second product primitive" §6.11 explicitly forbids.

There are zero direct imports of `./LandingPrimitives` outside the barrel — so deleting that one re-export block is the whole lever.

Also outstanding from §6.11: `Card` retains the full appearance-only variant sprawl the spec orders removed, and **two** page-header primitives (`PageHeader` and `AuthenticatedPageHeader`) are still exported where the spec mandates one.

---

## 5. Per-surface findings

### `/settings/team` — the biggest miss

§5.4 names this page *"the closest direct adaptation of the supplied reference"*, and §12.4 specifies "reference-led tabs, KPI group, member table, invite dialog, audit section." Compared against `IMG_9611`/`IMG_9613`, almost none of it arrived:

| Reference has | Shipped |
|---|---|
| 4-stat KPI group (Total / Active / Pending / Seats) | **absent** |
| Dense member table: ID, name+avatar, role, dept, contact, status, joined, workflow, action | a single unstructured list row |
| Search + 3 filter selects + Filter | **absent** |
| `Showing 1–10` + pagination | **absent** |
| Export CSV | **absent** |
| Primary `+ Invite Member` in the page header | no header actions at all |
| Structured invite **dialog** with 2-column role option tiles + department select | inline form: one email input + native `<select>` |

§6.2 and §7.8 both specify the role option tiles explicitly. This page is the spec's own acceptance criterion for the whole redesign, and it is the least-converted surface in the app.

One real bug: while the member list loads, the header renders **"0 active user(s)"** next to skeleton rows, then resolves to "1 active user(s)". The count is outside the loading state, so it briefly asserts a false value. §13 requires initial loading to be a geometry-matched skeleton, not a skeleton with a confidently wrong number attached.

### `/dashboard`

- **No KPI group**, though §12.1 requires "grouped KPIs" first.
- **No priority work table**, though §8.4 and §12.1 both require one. The page ends ~200px short of the fold with empty canvas below — it reads unfinished.
- **Three header actions** (`Open work`, `Review high-value cases`, `Full reports →`) where §4.4 allows at most two, and **none is primary** — so the page has no ink anchor.
- The period/compare/export toolbar floats naked on the canvas between two hairlines rather than belonging to a surface.
- "Data health" renders as a single lone blue block with a stray tick line — reads as a broken chart rather than a composition.

### `/work`

- **Content is clipped, not scrolled.** The `Actions` column header truncates to `Action` and the `Decision needed 5` tab is cut off at the panel edge. §6.6 requires overflow to stay *inside* the table surface with an affordance; here it is simply lost.
- **Row heights range ~40px to ~90px** because `Next action` wraps to two lines and `Due / SLA` wraps to three (`Overdue · 31 May 2026`). The date column is too narrow. §6.6 wants 40px rows and consistent widths for status/date/action columns — this is the opposite of compact density.
- **`Case #57CF3` breaks across two lines** — an identifier split mid-value.
- **No search/filter toolbar** at all, though §5.1 requires one; and checkboxes exist with no visible bulk-action region (§7.2 requires it on selection).
- Every visible row is `Urgent`, so priority carries no signal — and priority is rendered in critical/red, conflating priority with severity.
- No page subtitle and no header actions, where `/dashboard` has both. Inconsistent page-header application.

### `/claims`

Strongest KPI treatment in the app, but the composition is not the one specified. §12.1 defines `/claims` as an index: "queue tabs; KPIs; filters; payout-case **table**; pagination." What shipped is a master–detail split with a **card list** — ~100px tall items, four text lines and two pills each, no columns, no sortable headers, no bulk selection. §6.6: *"Never transform every table row into an oversized marketing card."* The split-pane is arguably a better interaction for this task than a bare table — but that is a spec amendment to make deliberately, not a drift to leave undocumented.

Selection cue is fill-only; §9.1 requires fill **plus** border, text, or glyph.

### `/recoveries`

- **`Loss` and `Recoverable` show the identical value in every single card** (£118.40/£118.40, £86.20/£86.20, £64.75/£64.75, …). Two columns of the same number consume half of each ~290px card.
- **`Deadline 17 Jul` and `Last source update 13 Jul` are identical across every card**, and 17 Jul is in the past with no overdue state shown. Worth a data/logic check independent of design.
- The two case groupings disagree (see §4.1).
- The helper line "Cards update automatically as your connected tools sync…" sits as unbordered prose inside the board surface above the columns — a fourth structural layer.
- Header action (`Partner rulebook`) is vertically centred against a two-line subtitle and reads misaligned.

### `/reports`

- **No KPI group**, though §12.2 requires one.
- The unavailable-state message is written **twice** in slightly different words, stacked — once in the panel body, once in a nested bordered card.
- "Needs attention" is a bare `h2` on the canvas above a ~745px list, leaving ~800px of empty space to its right. No grid discipline.
- That list is 54px per row for one label and one count — very low density for what is a 7-row count table, and it is a list rather than the canonical table.

### `/login` and entry flows

Calm and correctly ink-led, but the vertical rhythm is broken: the `Unauth.` mark floats ~250px above the card with no visual connection, and `Forgot password? Reset it · Don't have an account? Create one` is one run-on line that wraps with `Create one` orphaned. All four entry surfaces build their card from the landing `PanelCard` (§4.7).

### Mobile (390px)

Good bones — 48px bar, working drawer trigger, no page overflow, 2×2 KPI grid. Two issues: the demo banner renders at **16px**, making it the largest text on screen and pushing it to two lines (§7.9 wants a compact strip; §5.7 specifies 12–13px), and the filter chip strip scrolls to **1,227px** wide with no visible affordance that it scrolls.

---

## 6. Blockers to completing this review

Two things stopped me short of a full pass, both worth fixing before the next review round.

**The demo seeder is broken against the live schema.** `npm run seed:demo` fails partway:

```
Upserted 12 loss_cases rows.
Seed failed: recovery_cases upsert failed:
  Could not find the 'amount_approved_minor' column of 'recovery_cases' in the schema cache
```

The seeder writes `amount_*_minor` integer columns; the live table has decimal `amount_recovered`, `eligible_loss_amount`, `estimated_recoverable_min`/`_max`, `merchant_loss_amount`. Because it aborts at `recovery_cases`, it never reaches the canonical decision/outcome rows that carry amount + currency — which is exactly why `/dashboard` and `/reports` both show *"No canonical financial entries were found."*

**Consequence:** the reporting family and most of the chart grammar (§8) **could not be reviewed** — every chart surface is showing its unavailable state. Those states are themselves correct and well-written, but the charts behind them are unverified. I did not hand-write financial ledger rows to work around this: that is live merchant data and CLAUDE.md invariant 1 puts financial calculations off-limits to casual edits. Fixing the seeder's column mapping is the right unblock, and it needs your call.

**The static audit is partially verified.** The adversarial verification pass lost 59 of 90 agents to the org monthly spend limit. The 22 findings cited here all completed verification with source citations; a further ~60 raw findings were never verified and are not reported.

---

## 7. Ranked fix plan

**P0 — invert the token layer.** Define `--ua-*` with literal values; delete the legacy alias block from `tokens.css`; codemod the 3,271 legacy references. Fix `--ua-border-subtle` to `#ECECEA` first — it is one line and it will visibly repair section separation across every page, and remove most of the motive for card-in-card nesting. Add the missing spec tokens (`--ua-radius-surface`, `--ua-radius-round`, `--ua-shadow-float`, `--ua-shadow-menu`, `--ua-space-0-5`/`1-5`/`2-5`) or amend the spec to the shipped names — but stop the two documents disagreeing.

**P0 — delete `components/ui/index.ts:67-80`.** One block; it is the only path by which landing primitives reach the product. Then migrate the ~14 consumers onto `AuthenticatedPanel`/`Card` and strip the `app`/`appMuted`/`appInset` variants from `PanelCard`.

**P0 — make the gates real.** Implement the seven §17.1 lint rules. A guard that passes on 3,271 forbidden references and 428 raw literals is worse than no guard, because it certifies the opposite of the truth. Fix the two `verify:ui-parity` destinations.

**P1 — de-duplicate the numbers.** One fact, one carrier. Pick KPI group *or* callout *or* rail per dataset and delete the other two. Reconcile the `/recoveries` stage groupings.

**P1 — rebuild `/settings/team` to the reference.** It is the spec's own acceptance criterion: 4-stat KPI group, dense member table with pagination, search/filter toolbar, and the invite **dialog** with 2-column role option tiles. Fix the "0 active user(s)"-during-loading bug.

**P1 — finish the charts.** Rebind the dashboard's primary financial series to slot 1 (`#4F6FA8`), replace the `TickMeterRow` patterned track with one flat fill, drop the `TrendLineChart` area wash, collapse the hue-named tones to numbered slots, delete the page-local `ChartPanel`, and add the accessible table to the dashboard chart.

**P2 — fix `/work` density.** Widen the date column, stop the identifier wrap, give the table a real contained scroll with an affordance, add the search/filter toolbar and the bulk-action region.

**P2 — split badge geometry.** Round for status only; 6px control radius for metadata and source chips.

**P2 — sentence-case the eyebrows** and drop the letter-spacing (30 files). Remove the duplicated breadcrumb/eyebrow/title stacks.

**P2 — finish `/dashboard`.** Add the KPI group and the priority work table §12.1 requires; reduce to one primary + one secondary header action; bring the toolbar into a surface.

**P3 — mobile polish.** Banner to 12–13px; add a scroll affordance to the chip strip.

---

## 8. One judgement call for you

`/claims` shipped as a master–detail split-pane where the spec says index-plus-table. Having used it, the split-pane is the better interaction for a decision queue — you see the case and its evidence without a round trip. I would **keep it and amend §12.1**, rather than regress it to a table to satisfy the document. But make that an explicit decision recorded in the spec, because right now it is undocumented drift, and undocumented drift is how the last design system fragmented.

---

## 9. Remediation status — 2026-07-25

### Landed in this pass

**Token layer inverted (P0).** `styles/authenticated/{tokens,status,typography}.css` now
define `--ua-*` with literal values and define **no** legacy name. The alias block is gone.
A codemod rewrote **4,158 references across 229 files**; authenticated code now contains
**zero** non-`--ua-*` custom-property references. Verified in the browser: every `--ua-*`
token resolves to its spec value, `--accent` still resolves to rust at `:root` for the public
site but **no product element resolves to a warm hue**, and an off-palette scan of `/claims`
and `/dashboard` returns nothing.

Deliberate value fixes carried by the cutover:
- `--ua-border-subtle` `#F1F1F0` → **`#ECECEA`** (spec §3.1). Dividers are visible again.
- Input height `34px` → **`38px`**; large button `36px` → **`40px`** (§3.6).
- Added the missing spec tokens: `--ua-radius-surface` / `-round`, `--ua-shadow-float` /
  `-menu`, `--ua-space-0-5` / `-1-5` / `-2-5`.
- Radius aliases collapsed to the canonical five, restoring the 6 → 10 → 14 step-down.
- Badge geometry split into `--ua-badge-radius-status` (round) and `--ua-badge-radius-meta`
  (control), so status, metadata, and source chips are no longer all pills.

**LandingPrimitives removed from product UI (P0).** The re-export block is deleted from
`components/ui/index.ts`; `PanelCard`'s `app` / `appMuted` / `appInset` variants are gone.
New canonical `Panel` (structural: panel / muted / inset) and `EvidenceRow` primitives
replace them across 14 files, including `/login`, `/reset`, `/reset/update` and `/signup`.
The three public consumers now import the landing family from its own module.

Four hand-rolled `btn-accent` buttons — the reason the `/claims` primary action rendered
rust once the alias layer was removed — now use `ButtonLink`.

**The gates are real (P0).** `scripts/check-authenticated-design.mjs` gained the missing
§17.1 rules: forbidden legacy token namespace, landing-primitive imports, chart
textures/gradients, hand-rolled tables, route-local skeletons, arbitrary design literals,
and sentence-case enforcement. Debt is held by a **ratchet** rather than a per-file
grandfather list, because a single number cannot be quietly extended to admit a new
violation. Current state: `arbitraryDesignValue 0/0`, `upperCaseEyebrow 0/0`,
`handRolledTable 10/10`.

`verify:ui-parity` passes. The two "missing destinations" were query-parameter *additions*
(`&timezone=`, `&returnTo=`), so the check now treats a superset as satisfying the baseline
instead of maintaining a list that grows every time a link gains state.

**Seeder fixed.** `scripts/seed-demo-v2.mjs` wrote four `amount_*_minor` columns that do not
exist on `recovery_cases`; the decimal columns it also wrote were already correct. Removing
them lets the seeder run to completion (10 recovery cases, 13 work tasks, and the immutable
`case_decisions` / `case_outcomes` rows).

**Charts.** Financial series rebound from slot 4 (gold) to **slot 1** on both `/dashboard`
and `/reports`; loss causes moved to slot 5. `TickMeterRow`'s ~56-tick patterned track
replaced by one flat fill on a neutral track with a real `role="meter"`. `TrendLineChart`'s
opacity area wash deleted. `ComboBarLineChart` bar radius 6px → 4px via a new
`BAR_END_RADIUS` geometry constant. Hue-named tones (`orange`/`blue`/`yellow`…) replaced by
role names (`primary`/`positive`/`secondary`/`attention`/`negative`/`neutral`) in both the
type and the CSS module, so meaning no longer rides on a hue. `DashboardCharts`' page-local
`ChartPanel` no longer shadows the canonical one and consumes its CSS module.

**Type.** `uppercase` and `tracking-*` removed from 30 files / 54 class strings; 10px and 9px
type normalised to the 11px metadata role. Sidebar groups and section eyebrows are sentence
case. In-page eyebrows removed from 35 pages where breadcrumbs already state the parent.

**Spec amended (§5.1.1).** `/claims` is recorded as a deliberate master–detail decision
workspace, with the constraints that still bind, rather than left as undocumented drift.

Gates at the end of the pass: `npm run lint` ✅, `lint:authenticated-design` ✅,
`verify:ui-parity` ✅, `tsc --noEmit` clean in `app/`, `components/`, `styles/`, `scripts/`.

### Second pass — everything closed

**`/settings/team` rebuilt to the reference.** Four-stat KPI group, search plus
role/status filters, Export CSV, a primary **Invite member** action, a canonical
`DataTable` member table (identity + avatar, role select, status badge, joined
date, row-action menu), and a footer result count — all in one working surface.
The invite flow is now a **dialog** with the role as a selectable option tile
(new `ua-option-tile` primitive in `controls.css`), labelled email field and a
fixed Cancel / Send invitation footer. Roles offered are the ones the product
actually assigns; ownership stays on the explicit transfer flow rather than being
shown and disabled. The KPI values render as an em dash while loading, so the
page no longer asserts "0 active user(s)" next to skeleton rows, and the primary
action renders disabled during the permission check instead of popping in.

**Numbers de-duplicated.** The `KeyInsightCallout` on `/work`, `/claims` and
`/recoveries` restated the KPI strip verbatim and is gone; the KPI group plus a
rail that adds a genuine distribution remain. The `/recoveries` rail now derives
from `RECOVERY_BOARD_COLUMNS` — the same SSOT as the board — so the two totals
agree by construction instead of 8 vs 9 vs 10, and its bars are neutral because a
distribution is not a severity scale.

**`/work` density fixed.** A `colgroup` fixes the column widths, the identifier
and deadline no longer wrap, and the blocking note is clamped to one line: rows
are now **61–79px** (were 40–115px). The supporting rail stacks below the primary
surface until 1600px, which gives the table the full 1170px at 1440 — measured
`scrollWidth === clientWidth`, so nothing is clipped and the Actions column is
visible. A search field filters the loaded page without lying about the tab
counts. (Bulk actions already existed — my first review was wrong about that.)

**`/dashboard` completed.** An always-present four-cell operational KPI group
(the financial `MetricTabs` sat inside the performance panel and vanished when
the ledger was incomplete), a **Priority work** table built on `DataTable`, and a
header reduced to one primary `Open work` plus the `Full reports` text link.

**Card-in-card removed** on `/settings/team`, `/reports` and the reports
attention list — now joined sections divided by a 1px rule. Verified in the
browser with an all-four-sides border test: zero card-in-card on `/reports`.

**Badge geometry split.** Generic `Badge`, `MetadataChip` and `SourceBadge` take
the 6px control radius; `StatusBadge` keeps the round pill. Status, metadata and
source labels are now distinguishable at a glance.

**One page header.** `components/ui/PageHeader.tsx` deleted — it had no renderer
left, every surface already used `AuthenticatedPageHeader`. The `Breadcrumb` type
moved to the survivor. In-page breadcrumbs removed from 9 settings pages that
were restating the global header's.

**`Card` variants collapsed** from six appearance names to four structures:
`raised`≡`flat` and `muted`≡`inset` were byte-identical. Now `panel | muted |
overlay | plain`, migrated across 32 files.

**The Tailwind theme leak — a regression I introduced and caught.** Deleting the
alias layer left Tailwind's theme pointing at `var(--radius-*)`/`var(--shadow-*)`,
which no longer resolve inside `.ua-app`, so 638 `rounded-*` usages fell through
to public values and `shadow-sm`/`shadow-md` gained **real drop shadows** on flat
product surfaces. 93 theme entries now resolve `var(--ua-token, var(--legacy))`:
product gets the canonical value, public keeps its own scale, and no legacy name
is *defined* in the authenticated scope. Verified: zero off-palette colours and
zero shadowed inline surfaces on `/claims`, `/dashboard` and `/reports`.

**Terminology settled.** `docs/PRODUCT.md` says "a case is the shared unit of
work", so the nav label, page title and help copy all read **case** now.

**`sort=value` implemented rather than deleted.** The dashboard's "Review
high-value cases" link pointed at a sort the server never honoured — only `age`
and `filed_desc` were, so it silently fell back to `updated`. It now orders by
`amount_at_risk` and is exposed as **Highest value** in the `/claims` sort
control, where the other sorts live.

**Four dead `/recoveries?stage=` links removed.** No route ever read `?stage=`.

**Two real blind spots fixed in the parity gate.** Its href extractor rejected
any candidate containing whitespace, so every template href with a
multi-argument call inside it was invisible — that had been hiding the Shopify
install href among others. Interpolation collapsing was also not brace-aware, so
`${buildQuery(sp, { sort: 'value' })}` mangled to `${value})}`. Both fixed; the
gate now tracks **191** destinations, up from 188, and understands both
query-param supersets and literal-to-template moves.

**Widget type errors fixed.** `lib/gorgias/renderWidgetHtml.ts` still referenced
the pre-rename row labels, and `WidgetCorePayload` demanded fields
`withUnlockFields` supplies from defaults. Both corrected — these were the errors
that appeared and vanished between runs.

**Mobile.** Demo banner is 12px / 29px tall (was 16px and two lines eating a
quarter of the viewport). Chip strips carry the styled scroll affordance. At
390px: 48px bar, working drawer trigger, no page-level horizontal overflow.

Final gates: `tsc --noEmit` clean, `eslint app components lib` clean,
`lint:authenticated-design` passing with the real §17.1 rules
(`arbitraryDesignValue 0/0`, `upperCaseEyebrow 0/0`, `handRolledTable 10/10`),
`verify:ui-parity` passing on 191 destinations, **zero** non-`--ua-*` token
references in authenticated code.

### Still outstanding — deliberately

**Ten hand-rolled tables** (`WorkQueue`, `LossLedger`, `AuditTrailClient`,
`ClaimReviewHistoryTable`, `CanonicalCsvImportClient`, `IntelligenceReportView`,
`DashboardCharts`, `CustomerProfilePageMainColumn` ×2, `reports/records`) still
predate `DataTable`. Held at a ratchet of 10 that can only go down. Migrating a
financial or audit table changes behaviour, not just appearance, so each wants
its own change with its own test — not a bulk sweep.

### One thing left for you

**The demo dataset has no money in it.** The seeder completes, but its three
outcomes are all denials at £0, so "No canonical financial entries" is the
*correct* reading — not a bug. The reporting surfaces and the chart grammar
therefore still cannot be exercised end to end. Giving the demo merchant approved
payouts with real amounts changes what the dataset asserts about a merchant's
finances, which is a content decision about the demo story rather than a fix, so
I have left the figures alone.
