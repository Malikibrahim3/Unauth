# IMPL — Chart & Visualisation System ("Autumn" language)

**Status:** ready to execute · **Written:** 2026-07-17 · **Baseline commit:** `1efc14ae` (branch `integration-health-merge-ready-preRebase-b413ab4c`)
**Supersedes the visual layer of:** `docs/design/authenticated-visualisation-system.md` (its structural contracts remain binding; update it in WS6)
**Binding prerequisites:** `styles/authenticated/README.md`, `docs/product/MVP_STEERING.md`, `docs/product/TERMINOLOGY.md`, `CLAUDE.md`

**Reference images:** the four Autumn CRM screenshots (Barly, `@barlydesign` — "Autumn – CRM Dashboard – Insight"). Store them at `docs/design/references/autumn/{01-line-trend,02-combo-bars,03-system-health-popover,04-desktop-dot-matrix}.png`. Section 1 of this document is the authoritative written decode of those images; if the files are absent, section 1 governs.

**The core test (unchanged from the original prompt):** if a page were placed directly beside the source images, would it feel like part of the same product? If not, it is not finished.

---

## 0. What this pass is — and why the last one failed

The previous pass (`1efc14ae`) got the **architecture** right and the **visual language** wrong.

What it built is genuinely sound and must be kept:

- One purpose-built primitive per route, in `components/charts/authenticated/**`, behind a shared `ChartPanel` shell with an accessible `View chart data` table.
- Server-rendered CSS/div charts for operational routes; Recharts confined to `/dashboard` and `/reports`.
- Server-side data selectors (`lib/visualisation/chartSelectors.ts`); charts receive prepared arrays and own no business logic.
- Token discipline (`--ua-chart-*` everywhere, zero hardcoded hex in chart components).
- Skeleton-geometry parity (`AuthenticatedChartSkeleton` variants) and the design lint guard.

What failed: **six of the nine primitives are bar variants** (bar-meter rows, columns, ranked bars, funnel bars, mini bars, stacked bar strip). Every page reads as "flat bars on a grey track". None of the reference's signature treatments exist: no hatch texture, no dot-matrix, no block rail with pin annotations, no tick meters, no cap-top gradient bars, no dashed comparison overlays, no metric-tab switcher, no mono numerals in the plots, no crosshair-and-pill tooltip grammar. Cohesion was achieved by *sameness* again — one level down.

**This pass keeps the skeleton and replaces the rendering layer.** Data contracts, render sites, selectors, panel shell, table fallbacks and skeletons stay; the marks, geometry, colour system, typography, interaction grammar and several chart *forms* change. A small number of forms are genuinely new (rail, tick meter, dot matrix, segment-composition card, sparkline, metric tabs).

Everything in the original PDF prompt still binds: exact functional parity with the committed baseline, real already-loaded data only, existing filters respected, no fake series, truthful unavailable states, no product-contract changes.

---

## 1. The reference language, decoded

Ten treatments define the Autumn language. Each has a name — the rest of this document refers to them as **T1–T10**. All colour references are tokens from §2; all geometry constants live in one module (§4.3).

### T1 — Quiet cartesian frame

The plot chrome is nearly invisible; ink is spent on data and numbers.

- **No axis lines.** No plot border. No tick marks.
- **Gridlines:** horizontal only, 1px solid `--ua-chart-grid`, at most 4–5 lines. Never dashed (dashes are reserved for the cursor and comparison series).
- **Y labels:** 10px DM Mono, `--text-tertiary`, right-aligned in a fixed 36px gutter, clean rounded values (`0`, `100`, `200` / `0.0%`, `1.5%`, `3.0%`).
- **X labels:** 10px DM Mono, `--text-tertiary`; the active/hovered period label switches to `--text-primary` weight 500. A comparison-anchor period may carry a 2px × 12px underline in `--text-primary`.
- **Plot padding:** 12px top (room for pins/tooltip), 8px bottom above the x-label band. The container must include the x-label band in its height — never a nested scroll.

### T2 — Hatch, the signature texture

A 45° diagonal line texture. It is the single most recognisable element of the reference — and it must carry **fixed meanings**, never decoration:

1. **Single-series area wash** under a trend line (T3) — replaces gradient washes entirely.
2. **Remainder / headroom** — the unfilled tail of a rail or capacity bar (T6).
3. **Unavailable / disconnected region** — plot areas where data genuinely does not exist (§9). Never on a value-carrying mark (a bar, a segment, a cell) and never as a background pattern.

Implementation: one shared SVG `<pattern>` (per hue) in a `HatchDefs` component for SVG charts, and a `repeating-linear-gradient(45deg, <colour> 0 1px, transparent 1px 5px)` utility for CSS charts. Spec: **1px stroke, 5px pitch, 45°**. Colour: the series hue at 40% opacity for area washes; `--chart-neutral` at 55% opacity for remainder/unavailable. The existing hatched *tracks* in `AuthenticatedCharts.module.css` (`.riskTrack`) are wrong per this grammar — tracks become flat `--ua-chart-track`; hatch moves to remainders.

### T3 — Trend line with hatched fall

The reference's line chart (screenshot 1).

- Line: **2px**, round join/cap, series hue (default `--ua-chart-blue` for health/coverage, `--ua-chart-orange` for financial/attention — §2.4).
- Area: hatch (T2) in the line's hue, masked with `linear-gradient(180deg, rgb(0 0 0 / 0.85), rgb(0 0 0 / 0.1))` so it falls off toward the baseline.
- No always-on point markers. The hovered point gets an **8px dot** (r=4) in the hue with a **2px surface ring**.
- Multi-series: max 3 lines, no hatch (the wash is a single-series treatment), legend mandatory (§8.4); the comparison series uses T4's dashed treatment, not a second solid.

### T4 — Cap-top gradient bars + dashed comparison overlay

The reference's combo chart (screenshot 2). This is the flagship dashboard form.

- Bars: max **24px** wide, centred in the band; **2px radius on the top corners only**, square at the baseline.
- Bar fill: vertical gradient of the series hue — 22% opacity at the top → 4% at the baseline — with a **solid 2px top cap** in the hue at 100%. The cap is the value-carrying edge; the body is a shadow of it.
- Comparison/previous-period series: **1.5px dashed line** (dash `5 4`) in `--icon-muted` (neutral = comparison context, per the design-system grammar), with 5px vertex dots (r=2.5) carrying a 2px surface ring. The dashed overlay may also carry a rolling average — one overlay per chart, never two.
- Adjacent bars in grouped mode keep a 2px surface gap. Stacked mode: 2px surface gaps between segments, no strokes.

### T5 — Dot-matrix activity grid

The reference's desktop trend (screenshot 4): a waffle of small squares, columns = periods, filled from the baseline, intensity = magnitude.

- Cells: **7px square, 2px gap, 2px radius**.
- Background cells (the empty grid): `--ua-chart-track`.
- Filled cells: the **ordinal ramp** of the context hue (§2.3) — intensity buckets, darker = more. Zero is a track-coloured cell (visible, distinct from absent); absent periods render as a hatched column gap (T2 meaning 3), never as zero.
- Hover/focus on a column: cursor + tooltip per T10.
- This is a **sequential/ordinal encoding** — one hue only. Never encode two measures as two hues in one matrix.

### T6 — Block rail with pin annotations and hatched remainder

The reference's "System health" bar (screenshots 3–4): a horizontal rail of rounded blocks with thin annotation pins above and a hatched tail.

- Rail height **36px** (28px compact). Blocks: flat series hue, **4px radius, 3px gaps**, min-width 6px; block widths proportional to values.
- Remainder (unrealised / outstanding / headroom): hatch (T2) in `--chart-neutral`, no background fill.
- **Pins:** 1px vertical line in `--border-strong`, 16–28px tall, rising from the rail's top edge; label above in 10px DM Mono — `--text-secondary` for counts, `--text-primary` weight 500 for the headline value (e.g. the current percentage).
- One hue per rail (blocks may step through the ordinal ramp to show stage order). Semantic status hues only when the blocks *are* statuses.

### T7 — Tick meter ("barcode" meter)

The reference's metric rows (screenshot 3): a dense row of vertical ticks, filled portion in the metric's hue.

- Ticks: **3px wide × 14px tall, 2px gap, 1px radius**. The row fills its container; tick count derives from width (target ~40–56 ticks).
- Filled ticks: metric hue at 100%; unfilled: `--ua-chart-track`.
- Row anatomy: label (13px, `--text-secondary`) left · value right in **13px DM Mono 500**, coloured with the metric hue *only if* that hue clears 4.5:1 as text — otherwise `--text-primary` (in practice: green-700/violet-600/red pass; orange gets `--text-primary`).
- Optional **interpretive caption** under the meter: 12px italic, `--text-tertiary` ("Most cases carried full evidence"). This is the only italic in the product; it marks *interpretation*, never data.
- Hue assignment: positive-rate metrics → `--ua-chart-green`; failure/leakage-rate → `--ua-chart-red` (or orange for attention-not-failure); duration/velocity → `--ua-chart-violet`; coverage/health → `--ua-chart-blue`.

### T8 — Segment bar + dot legend + ranked rows (composition card)

The reference's "Workflow breakdown" card (screenshots 1, 4).

- Headline: big value + delta (T9 tile anatomy) when the composition has a headline rate.
- Segment bar: **10px tall**, segments in series hues with **4px gaps** and **3px radius per segment** (visually near-pill). ≤ 6 segments; overflow folds into "Other" in `--chart-neutral`.
- Dot legend directly below: 6px dots, 12px labels in `--text-secondary`.
- Ranked rows: optional icon · name (13px `--text-primary`) · value in 13px DM Mono, right-aligned · delta glyph + signed % (12px, direction-coloured, §3.4).
- Fixed slot assignment: a segment's hue follows the *category*, never its rank (§2.2).

### T9 — Metric tab strip (stat tiles that drive the chart)

The reference's row of four metrics under the trend (all screenshots) — simultaneously a KPI row and the chart's series selector.

- Tile anatomy: **icon chip** 26px (4px radius, `--surface-muted` bg, 14px icon in `--icon`) · label 12px `--text-secondary` · value **20px DM Mono 500 `--text-primary`** · delta line: signed value 12px direction-coloured + "vs previous period" in `--text-tertiary`.
- Strip: equal columns, separated by 1px `--border-muted` dividers (not boxed cards).
- Selected state (when the strip drives a chart): icon chip inverts (`--ua-surface-inverse` bg, `--text-inverse` icon) **and** the tile gets a `--surface-sunken` background — two cues, never colour alone. Tiles are real buttons: focus-visible ring, `aria-pressed`, keyboard navigable.
- Non-switching KPI strips (`WorkbenchKpiStrip`) use the identical anatomy minus selection.

### T10 — Cursor + tooltip grammar

One hover grammar everywhere (screenshots 1, 2, 4):

- **Crosshair:** 1px dashed (`4 4`) vertical line in `--border-strong`, snapping to the nearest data position. Line/combo/matrix charts only; bars and cells are their own hit targets and lift on hover (fill opacity step, no stroke).
- **Tooltip card:** `--surface-overlay` bg, 1px `--border-default`, radius `--ua-radius-card`, shadow `--ua-shadow-overlay`, padding 8px 10px. **Value first**: 14px DM Mono 600 `--text-primary`; period/caption second: 11px `--text-tertiary`. Multi-series rows: 10px × 2px line-key in the series colour + label `--text-secondary` + value DM Mono, one row per series at that X (never only the hovered one).
- **Axis pill:** the active x label may render as an inverse chip (`--ua-surface-inverse` bg, `--text-inverse` text, 10px DM Mono, 4px radius, 2px 6px padding) on the axis band.
- Keyboard focus shows exactly what hover shows. Tooltips never gate a value (table fallback always exists). No animation over 120ms; respect reduced motion by disabling the lift/fade entirely.

**Micro-rules that ride every treatment:** every numeral inside a visualisation (axis ticks, values, pins, tooltip values, tile values, ranked values) is **DM Mono** (`--ua-font-mono`) with `font-variant-numeric: tabular-nums`; all other text stays Inter. Text never wears a series colour (T7's value is the one audited exception). Delta glyphs are `↑`/`↓`/`→` characters (or the existing lucide arrows in `MetricCard`), coloured by direction × goodness, never bare red/green without the glyph.

---

## 2. Colour — the validated chart palette

The palette was validated on 2026-07-17 with the OKLCH lightness-band / chroma-floor / Machado-2009 CVD / WCAG contrast checks (evidence in Appendix A). These values are **computed, not aesthetic preferences** — do not nudge them without re-running the same checks.

### 2.1 Token changes in `styles/authenticated/tokens.css`

Light block (charts render on white cards — validated against `#ffffff`):

```css
/* Data visualisation. Orange leads financial/attention charts; blue is
 * reserved for operational health/coverage; violet is duration/velocity.
 * Series values are CVD-validated as a set — change only as a set. */
--chart-orange: #ff5a0a;            /* unchanged */
--chart-blue: #7088e8;              /* unchanged */
--chart-green: #0e9f6e;             /* was #10b981 — darkened to clear 3:1 */
--chart-yellow: #d9a400;            /* was #f5c400 — failed the lightness band */
--chart-red: #e65745;               /* unchanged */
--chart-violet: #8b5cf6;            /* NEW — duration/velocity metrics */
--chart-neutral: #c9c7be;           /* unchanged — context/comparison/Other */
--chart-track: #efeee8;             /* unchanged — unfilled meters/cells */
--chart-grid: #eceae4;              /* unchanged — hairline gridlines */

/* Ordinal/sequential ramps (4 mark-carrying steps each, validated).
 * Steps 1–2 below the ramp (…-soft tints) are heat-only extensions and
 * may recede below 2:1 — never use them for discrete ordered marks. */
--chart-ramp-orange-1: #ff9058;  --chart-ramp-orange-2: #ff5a0a;
--chart-ramp-orange-3: #d94b08;  --chart-ramp-orange-4: #a83a04;
--chart-ramp-blue-1: #93a4ee;    --chart-ramp-blue-2: #7088e8;
--chart-ramp-blue-3: #5568c9;    --chart-ramp-blue-4: #3f519c;
--chart-heat-orange-0: #fff0e8;  --chart-heat-orange-1: #ffd8c2; --chart-heat-orange-2: #ffb28a;
--chart-heat-blue-0: #eff2ff;    --chart-heat-blue-1: #d9dffb;   --chart-heat-blue-2: #b8c3f5;
```

Dark block (`:root[data-theme="dark"]` — validated against `#20201c`; the existing dark chart values sit *above* the dark lightness band and glare):

```css
--chart-orange: #d95514;   /* chart orange decouples from the #ff7838 action accent in dark — deliberate */
--chart-blue: #6e84e2;
--chart-green: #169a72;
--chart-yellow: #b28c22;
--chart-red: #d55a50;
--chart-violet: #8a68e4;
--chart-neutral: #5d5a52;  /* unchanged */
--chart-track: #2a2923;    /* unchanged */
--chart-grid: #302f29;     /* unchanged */
--chart-ramp-orange-1: #8f3f14; --chart-ramp-orange-2: #b34a10;
--chart-ramp-orange-3: #d95514; --chart-ramp-orange-4: #f07434;
--chart-ramp-blue-1: #48588f;   --chart-ramp-blue-2: #5c6ec0;
--chart-ramp-blue-3: #7a90ea;   --chart-ramp-blue-4: #a3b2f4;
/* heat extensions: derive as darker analogues; heat-only, non-gated */
```

Alias additions in the `--ua-*` layer (light block only, per the alias mechanism): `--ua-chart-violet`, `--ua-chart-ramp-{orange,blue}-{1..4}`, `--ua-chart-heat-{orange,blue}-{0..2}`.

**Also fix while in this file's sibling:** `--sev-definite/-probable/-possible/-neutral/-clear`, `--data-neutral`, `--gauge-from/-mid/-to` in `status.css` have **no dark-mode overrides** (confirmed — each is declared once). Add dark values consistent with the dark `--risk-*` family. This is a live dark-mode bug independent of this redesign.

### 2.2 Categorical assignment (fixed order, never cycled)

Multi-series charts assign hues in this fixed slot order, always starting at slot 1, never skipping, never reassigning on filter:

| Slot | Token | Hue |
|---|---|---|
| 1 | `--ua-chart-orange` | orange |
| 2 | `--ua-chart-blue` | blue |
| 3 | `--ua-chart-yellow` | amber |
| 4 | `--ua-chart-green` | green |
| 5 | `--ua-chart-violet` | violet |
| 6 | `--ua-chart-red` | red |

- Worst adjacent CVD ΔE for this order: **48.7** (target ≥ 12). Amber sits at 2.27:1 contrast on white — the relief rule applies wherever slot 3 appears: direct labels or the (already mandatory) `View chart data` table.
- **Scatter / matrix / small-multiples** (any two marks can neighbour): restrict to slots {1, 2, 4, 6} — validated all-pairs at ΔE 13.7. Amber and violet are excluded from those forms.
- More than 6 real series → fold into "Other" (`--chart-neutral`) or facet; never generate a 7th hue.
- Colour follows the **entity**: filtering out a series must not repaint the survivors.

### 2.3 Ramps (ordinal and heat)

- Ordered intensity (dot-matrix buckets, deadline-ageing bands, stage order) uses `--ua-chart-ramp-{hue}-1..4` — one hue, monotone lightness, validated.
- Heat-only extensions (`--chart-heat-*-0..2`) are for dense continuous fills (matrix cells near zero) where receding toward the surface is correct. Never for discrete marks.
- Dark mode flips the anchor (near-surface end is darkest) — the dark ramp tokens already encode this; components just read tokens 1→4.

### 2.4 Semantic grammar (unchanged, now enforced per treatment)

- **Orange** — payout exposure, financial emphasis, operational attention.
- **Blue** — coverage, freshness, connector/system health, activity.
- **Green** — recovered value, positive outcome rates.
- **Red** — leakage, failure rates, critical ageing.
- **Violet** — durations, velocity, time-to-X metrics.
- **Neutral** — previous period, context, inactive, "Other".
- **Status tokens** (`--ua-success/-warning/-critical`, `--risk-*`) only when a mark *is* a state, always with icon/label, never as "series 4". Confidence grades keep `GRADE_COLOURS` (`lib/utils/confidenceStyles.ts`) — grades express confidence, not verdicts, and are not restyled by this system.

---

## 3. Type & number rules

1. Panel titles: `--ua-text-card-title` (14px/600 Inter). Panel captions/annotations: 12px `--text-tertiary`.
2. **Every in-chart numeral is DM Mono** (`--ua-font-mono`), `tabular-nums`: axis ticks, tile values, tooltip values, pins, meter values, ranked values, matrix legends. Sizes: axis 10px · pins 10px · tooltip value 14px/600 · row values 13px/500 · tile values 20px/500. Numbers outside visualisations (body copy, tables) keep their existing treatment.
3. The interpretive caption (T7) is the only italic: 12px italic Inter, `--text-tertiary`. It states interpretation ("Most cases carried full evidence"), never a number.
4. Deltas: glyph + signed value, colour by direction × goodness (`TONE_COLOR` in `MetricCard` is the existing pattern — keep `--risk-low-fg` / `--risk-critical-fg` / `--text-secondary`). "vs previous period" qualifier in `--text-tertiary`. A delta without a named comparison period is prohibited.
5. Currency, percentages and dates come from `lib/utils/format.ts` **only** (the ws0.4 formatter SSOT). No new formatting paths, no mixed-currency aggregates — per-currency groups render separate charts, as `DashboardCharts` already does.

---

## 4. Primitive architecture

### 4.1 Engines — one decision, applied everywhere

| Layer | Engine | Scope |
|---|---|---|
| Cartesian (trend, combo, multi-line, scatter) | **Recharts 2.13** (already a dependency), client, code-split via `next/dynamic` | `/dashboard`, `/reports` only |
| Operational visuals (rail, meters, matrices, segments, ranked, bands, dot plots, sequences, sparklines) | **Server-rendered CSS/SVG** (no library) | all other routes + detail pages |
| ECharts (`echarts`, `echarts-for-react`) | **Deleted** (§12) | — |

Rationale: the Autumn treatments are all trivially expressible in SVG/CSS with tokens; canvas fights CSS variables and ships ~1MB for two orphaned demo charts. Recharts stays because the two reporting surfaces already use it correctly (composed bar+line, responsive container, reduced-motion aware) and its SVG output accepts custom shapes for T3/T4.

### 4.2 File layout

```
components/charts/authenticated/
  core/
    ChartPanel.tsx            (exists — extend: dot legend, caption slot, tab-strip slot)
    ChartTooltip.tsx          (new — T10 card, shared by Recharts + client hover wrappers)
    ChartCursor.tsx           (new — dashed crosshair + axis pill for Recharts)
    HatchDefs.tsx             (new — SVG patterns; plus .hatch CSS utility in the module CSS)
    geometry.ts               (new — every T1–T10 constant; the plot-geometry SSOT)
    useChartTheme.ts          (new — getComputedStyle token bridge for Recharts; observes data-theme)
  cartesian/                  (client, dynamic-imported)
    TrendLineChart.tsx        (T3)
    ComboBarLineChart.tsx     (T4 — generalises DashboardOverview's ComposedChart)
    DualLineChart.tsx         (T3 multi-series — reports)
  operational/                (server components)
    BlockRailChart.tsx        (T6)
    TickMeterRow.tsx          (T7)
    DotMatrixChart.tsx        (T5)
    SegmentCompositionCard.tsx(T8)
    RankedBarsChart.tsx       (restyle of RankedContributionChart)
    ColumnChart.tsx           (restyle of ColumnComparisonChart — cap-top bars)
    DeadlineBandsChart.tsx    (restyle of DeadlineRiskChart — ordinal ramp)
    DotPlotChart.tsx          (restyle of RangePlotChart)
    StatusMatrixChart.tsx     (restyle — T5 cell geometry)
    SourceHealthMatrixChart.tsx (restyle — status blocks)
    MiniBarSequenceChart.tsx  (restyle — 2px gaps, cap tops)
  micro/
    SparkTrend.tsx            (new — 60×20 server SVG sparkline)
    MetricTabs.tsx            (new, client — T9 switcher; WorkbenchKpiStrip stays the passive variant)
```

Existing flat files migrate into this shape (git `mv`, keep exports stable via the folder's `index.ts` if imports are widespread).

### 4.3 `geometry.ts` — the plot-geometry SSOT

Every constant from §1 lives here once (`HATCH_PITCH = 5`, `RAIL_HEIGHT = 36`, `TICK_W = 3`, `MATRIX_CELL = 7`, `BAR_MAX_W = 24`, `CURSOR_DASH = [4,4]`, …) and both the CSS module (via fixed classes) and the Recharts components (via props) consume it. New geometry requires editing this file — a PR that hardcodes plot geometry in a component fails review. (Panel-level chrome — radii, shadows, control heights — still comes from `--ua-*` tokens, not this file.)

### 4.4 Recharts restyling rules

- `useChartTheme()` resolves token hexes once per mount (and on `data-theme` change) via `getComputedStyle`; components never hardcode hex and never read `--dashboard-*` (that remap layer is deleted, §12).
- Custom `shape` for T4 bars (cap + gradient via `<defs>`), `<Customized>` or `content` renderers for T10 cursor/tooltip, `HatchDefs` for T3 areas.
- `isAnimationActive={false}` globally. Recharts defaults (its `#8884d8` purple, default tooltip, default legend) must never render — the lint guard greps for them (§13).

---

## 5. The primitive roster — verdicts and specs

| Component (current) | Verdict | Becomes |
|---|---|---|
| `ChartPanel.tsx` | **Extend** | Adds: dot legend row (T8), italic caption slot, tab-strip slot (T9), pin-annotation slot; keeps header, `View chart data`, empty states |
| `DashboardOverview.tsx` chart | **Rebuild render** | `ComboBarLineChart` (T4) driven by `MetricTabs` (T9); same `DASHBOARD_METRICS` model, same props/data |
| `DashboardCharts.tsx` (reports) | **Rebuild render** | `DualLineChart` (T3, 2 series + legend) + `RankedBarsChart`; per-currency grouping and `View chart data` retained |
| `DeadlineRiskChart` | **Restyle** | `DeadlineBandsChart` — flat `--ua-chart-track` tracks (hatch removed), fills step the orange ordinal ramp by ageing severity, values in DM Mono |
| `ColumnComparisonChart` | **Restyle** | `ColumnChart` — T4 cap-top bars (static, no overlay), T1 frame, mono axis |
| `RankedContributionChart` | **Restyle** | `RankedBarsChart` — 4px data-end radius, square baseline, mono right-aligned values, hairline tracks |
| `StageFunnelChart` | **Replace** | `BlockRailChart` stage variant (T6): blocks = stages (ordinal ramp), pins = stage counts, hatched tail = outstanding value; clip-path funnel deleted. Volume note stays (no conversion claims) |
| `RangePlotChart` | **Restyle** | `DotPlotChart` — 8px dots + 2px surface rings on 1px hairline ranges, mono tick labels |
| `StatusMatrixChart` | **Restyle** | T5 cell geometry (7px/2px/2px), status hues with glyph key, absence ≠ zero preserved |
| `MiniBarSequenceChart` | **Restyle** | 2px surface gaps, 2px top radius, cap-top treatment at full opacity (bars are small) |
| `SourceHealthMatrixChart` | **Restyle** | Block cells (4px radius) in status hues + icon key; row/column labels 12px; gains an optional freshness `BlockRailChart` sibling |
| `ActivityStripChart` | **Replace** | `DotMatrixChart` (T5) — per-day intensity on the blue ramp |
| `WorkbenchKpiStrip` | **Restyle** | T9 tile anatomy (mono values, delta glyphs, optional `SparkTrend`), stays a server `<dl>` |
| `MetricCard` | **Restyle** | Mono value, T9 anatomy; the dormant `microchart` slot finally receives `SparkTrend` |
| `BehaviorRoadmap` | **Restyle-lite** | Token/type alignment only (mono dates/amounts, 8px nodes + surface rings); form is already right |
| `EvidenceScoreBadge` | **Extend** | Adds a `TickMeterRow` (T7) for evidence completeness; grade chips keep `GRADE_COLOURS` |
| `AnalyticsBarChart/LineChart/DonutChart`, `EChartWrapper`, `echartsTheme.ts` | **Delete** | `/demo` migrates to the primitives above (§12); donuts are expressed as `SegmentCompositionCard` |
| `AuthenticatedChartSkeleton` | **Extend** | Variant set becomes `trend · combo · rail · meter · matrix · segment · ranked · columns · bands · dotplot · sequence · sparkline`; each mirrors its primitive's exact geometry from `geometry.ts` |

New primitives (`BlockRailChart`, `TickMeterRow`, `DotMatrixChart`, `SegmentCompositionCard`, `SparkTrend`, `MetricTabs`, `TrendLineChart`) follow the T-specs in §1. Every primitive keeps the subsystem-A contract: typed prepared-data props, no fetching, no business math, `ChartPanel` wrapping, a skeleton twin, and a `View chart data` table.

---

## 6. Route-by-route assignment

Format per route: **operational question → primary visual · supporting (≤2) · data source · filters honoured · what changes**. Data sources are the *existing* loaders/selectors — no new queries. Where a supporting visual needs a field the loader doesn't currently expose, it is marked *conditional*: derive it in `lib/visualisation/chartSelectors.ts` from already-fetched rows or skip it. Never add a duplicate fetch for a chart.

### `/dashboard` — Overview *(flagship — build first, it sets the bar)*
- **Question:** what is my current operating state — exposure, recovery, prevention — and how is it moving?
- **Primary:** T9 `MetricTabs` (exposure / recovered / prevented / realised loss — the existing `DASHBOARD_METRICS`) driving `ComboBarLineChart` (T4): current period bars + dashed previous-period overlay. Money metrics may alternatively render `TrendLineChart` (T3) where the series is cumulative — one form per metric, chosen once in `dashboardModel.ts`.
- **Supporting:** work composition as `SegmentCompositionCard` (T8) — replaces the `.workflowBar` div (`DashboardOverview.tsx:378`); data health as `BlockRailChart` (T6) with a freshness pin — replaces the 24-cell meter (`:423`).
- **Data:** `IntelligenceReport` + comparison props already passed to `DashboardOverview`. **Filters:** date range, compare period, currency — all existing.
- Render site unchanged: `app/(app)/dashboard/page.tsx:60`.

### `/reports` — Reports
- **Question:** configurable analysis of exposure vs recovery and loss causes.
- **Primary:** `DualLineChart` (T3 rules, 2 solid 2px lines — exposure `--ua-chart-orange`, recovered `--ua-chart-green` — no hatch on multi-series, legend + crosshair tooltip). **Supporting:** loss causes as `RankedBarsChart`; `RecoveryLedger` tiles restyled to T9 anatomy.
- **Data/filters:** `IntelligenceReport` per-currency groups, unchanged (`DashboardCharts.tsx:100,178`). Reports may carry greater density than operational routes.

### `/work` — Work queue
- **Question:** what needs action now, and how old is it?
- **Primary:** `DeadlineBandsChart` — ageing bands on the orange ordinal ramp (due today → overdue = ramp-1 → ramp-4). **Supporting:** none; the queue table is the page.
- **Data:** `selectDeadlineBands` (`lib/visualisation/chartSelectors.ts`). Render: `app/(app)/work/page.tsx:204`.

### `/claims` — Payout Control
- **Question:** where is payout exposure concentrated, and what are we deciding?
- **Primary:** `ColumnChart` (cap-top) — exposure by claim type. **Supporting (conditional):** decision-outcome mix (approve / manual review / deny) as `SegmentCompositionCard` if the page's already-loaded rows carry decision state.
- **Data:** existing `ClaimsPageView` aggregation (`ClaimsPageView.tsx:157`). **Terminology:** recommended action / manual review — never verdict language.

### `/losses` — Losses
- **Question:** where did money leak, attributed to what?
- **Primary:** `SegmentCompositionCard` (T8) — loss attribution: segment bar of attribution categories + ranked rows with amounts and share. This is the reference's "Workflow breakdown" card carrying Unauth's core concept. Replaces the plain ranked bars as the lead visual; `RankedBarsChart` remains the fallback if only top-N causes exist.
- **Data:** `selectLossContributions`. `FreshnessIndicator` stays. Render: `app/(app)/losses/page.tsx:172`.

### `/recoveries` — Recovery
- **Question:** how much recoverable value is in flight, at which stage, and what came back?
- **Primary:** `BlockRailChart` (T6) — pipeline rail: blocks = stages on the blue/green ramp, pins = stage counts, hatched tail = outstanding recoverable value. Replaces the clip-path funnel. **Supporting:** `TickMeterRow` (T7) — recovered vs recoverable %, green, with interpretive caption.
- **Data:** the funnel's existing stage dataset (`recoveries/page.tsx:133`).

### `/customers` — Customers
- **Question:** how are loss and contact patterns distributed across identities?
- **Primary:** `DotPlotChart` (restyled) — proportion ranges on hairline tracks. **Supporting:** none.
- **Data:** unchanged (`CustomersOverviewPageView.tsx:82`). No verdict framing — patterns, not accusations.

### `/customers/[id]` — Customer detail
- `BehaviorRoadmap` restyle-lite; sidebar `MetricCard`s gain `SparkTrend` where a history series already exists in the loaded profile; `EvidenceScoreBadge` gains the T7 evidence-completeness meter. Grade colours untouched (`GRADE_COLOURS`).

### `/rules` — Merchant rules
- **Question:** which rules are firing, how often, with what outcome association?
- **Primary:** `StatusMatrixChart` restyled; **if** hit-frequency counts are already loaded, upgrade cells to ordinal-ramp intensity (T5 grammar) — frequency reads as darkness, state reads as glyph.
- **Data:** unchanged (`rules/page.tsx:103`). Rules recommend; charts must not imply automated decisions.

### `/flows` — Flows
- **Primary:** `MiniBarSequenceChart` restyled (execution volume per definition). **Supporting (conditional):** completion vs drop-off as a two-block rail per flow if run outcomes are already in the payload.
- **Data:** unchanged (`flows/page.tsx:94`).

### `/integrations` — Integrations
- **Question:** are my sources connected, fresh, and syncing?
- **Primary:** `SourceHealthMatrixChart` restyled (provider × dimension status blocks). **Supporting:** connector freshness `BlockRailChart` — sync windows as blocks, incidents as pins, gaps hatched — fed by the integration-health status data this branch just added.
- **Data:** existing page loader + integration-health polling state (`integrations/page.tsx:134`).

### `/notifications`
- **Primary:** `DotMatrixChart` (T5) — per-day intensity on the blue ramp, intensity = unread count, caption carries totals; replaces `ActivityStripChart`.
- **Data:** `selectNotificationActivity` (both read and unread stay in the table fallback).

### `/partners` — Partner accountability *(currently KPI-only)*
- **Primary (conditional):** `RankedBarsChart` — exposure or chase-due value by partner, with recoverability share if present in the loaded rows. If the partners loader exposes only aggregate KPIs today, extend `chartSelectors.ts` over the rows it already fetches; if the rows genuinely aren't loaded, the page stays KPI-only and this is recorded in the final report (no new queries in this pass).

### Intentionally chart-free (unchanged)
`/reports/records`, `/exceptions`, `/catches`, `/watchlist`, `/global`, `/store`, settings, onboarding, help, and remaining `[id]` detail pages — per `docs/design/authenticated-visualisation-system.md`. Do not decorate them.

---

## 7. Composition & density rules

1. Operational routes: **one primary visual, ≤ 2 compact supporting visuals**, then the table/queue/detail content. Reports and Overview may justify more. A chart that doesn't answer the route's question is removed, not restyled.
2. The primary visual sits with its controls: T9 tabs belong inside the chart panel; page-level filters stay in the one filter row above everything they scope (never per-chart, never inside a card).
3. Chart + ranked values pair inside one panel (T8) rather than two side-by-side cards saying the same thing.
4. Small multiples (per-currency, per-provider) over any dual-axis chart — **two y-scales on one plot are prohibited**, no exceptions.
5. Legends: single series → none (the title names it); 2–4 series → dot legend in the panel header row; >4 → rethink the form.
6. Pages must not converge on one template: the per-route forms in §6 are deliberately distinct. A new page picks the form by its question, from the approved roster only.

---

## 8. Interaction spec

1. Hover/focus per T10. Crosshair on continuous X (line/combo/matrix columns); per-mark lift + tooltip on bars/cells/dots/segments/ticks-groups. Hit targets ≥ 24px (transparent expansion around small marks; column-band targets on matrices).
2. Keyboard: every interactive chart is reachable — tab strips are buttons; plots expose focusable data positions (arrow keys move the active X) with the same readout as hover. Meaning is never hover-only or colour-only.
3. `MetricTabs` switching swaps series data in place — axes re-scale, geometry doesn't jump, no skeleton flash. Refetch (filter change) holds the previous render at 60% opacity until data lands.
4. Motion: 100–120ms opacity/transform only; no entry animations on plots (`isAnimationActive={false}`); `prefers-reduced-motion` disables the residual lift/fade and the count-up in `MetricCard`.
5. Touch: tap = hover (tooltip toggles), second tap on a link/tab activates; targets ≥ 40px on coarse pointers.

---

## 9. States — nothing fake, nothing flat-zero

Distinct, per the baseline doc, now with fixed visual treatments:

| State | Treatment |
|---|---|
| Loading | The primitive's skeleton twin — exact geometry from `geometry.ts`, no generic rectangle, no layout shift on resolve |
| No records in period | Empty plot frame (T1 chrome intact) + 13px `--text-secondary` line + the period; axes render with real bounds |
| Insufficient for a trend | Render the real points as dots without a line + caption "Not enough history for a trend" |
| Source unavailable / disconnected | Hatched region (T2 meaning 3) + status line + the existing connect/repair action; never an empty chart hiding a failure |
| Permission-restricted | Panel renders with a restriction note; no ghost data |
| Zero (real) | Real marks at zero on real axes — zero is data |
| Partial period | Solid marks for complete buckets; the incomplete bucket renders at 50% opacity with a "period in progress" caption |

Null is never coerced to zero. A missing series never renders as a flat line.

---

## 10. Accessibility

1. Every panel keeps `View chart data` (the existing `<details>` table) — the WCAG-clean twin. New primitives must ship it via `ChartPanel`.
2. Series identity never rides colour alone: legends + direct labels per §7.5; amber (slot 3) always direct-labelled (contrast relief); status marks always carry glyph/label.
3. `role="img"` + `aria-label` summarising the headline reading on server visuals; interactive plots expose focusable positions (§8.2).
4. Contrast: marks ≥ 3:1 against the card surface (validated; amber's relief rule noted); text in charts uses ink tokens (≥ 4.5:1).
5. Forced-colors / print: hatch (T2) and glyph keys carry what hue carries; verify `forced-colors: active` renders legible rails/meters (borders appear, fills flatten — acceptable if values + labels survive).
6. Reduced motion per §8.4.

---

## 11. Performance budget

1. **Removing ECharts** (§12) drops the heaviest chart dependency; `/demo` stops shipping a canvas engine for four charts.
2. Recharts loads only on `/dashboard` and `/reports` via `next/dynamic`; operational routes ship **zero chart JS** (server CSS/SVG), except the small hover-layer client wrapper on `DotMatrixChart` and `MetricTabs`.
3. Selectors stay server-side and memo-stable; charts receive prepared arrays (existing contract). No chart triggers its own fetch; no duplicate aggregation of data the page already computed.
4. Point caps: trend/combo plots cap at 60 plotted buckets (aggregate upstream, truthfully — totals must still reconcile with tables); matrices cap at 26 columns × 7 rows visible.
5. No resize-observer loops: `ResponsiveContainer` only in the two cartesian surfaces; CSS-intrinsic sizing everywhere else.
6. Verify before/after: route-transition feel on `/dashboard`, `/losses`, `/integrations`, plus `next build` bundle diff for the echarts removal. Do not disguise slowness with longer skeletons.

---

## 12. Deletion & consolidation list

Execute late (WS5), after replacements are live and verified:

1. `echarts`, `echarts-for-react` removed from `package.json`; delete `components/analytics/{EChartWrapper,AnalyticsBarChart,AnalyticsLineChart,AnalyticsDonutChart}.tsx` and `components/charts/echartsTheme.ts`. Migrate `app/(public)/demo/page.tsx` (5 render sites: `:104/114/213/227/288`) to the new primitives — verify the demo page carries the `.ua-app`/`.ua-auth-surface` token scope; donut usages become `SegmentCompositionCard`.
2. Delete the `--dashboard-*` remap layer (`dashboardPilot.module.css:21-29`) — components read `--ua-chart-*` directly (via `useChartTheme` in Recharts land).
3. Delete `StageFunnelChart` + its clip-path CSS; delete `ActivityStripChart`; delete the `.workflowBar` and `.healthVisual` bespoke divs in `dashboardPilot.module.css` once T8/T6 replace them.
4. Delete the hatched-track styles (`.riskTrack` gradient) per T2 semantics.
5. Sweep for: unused tone classes in `AuthenticatedCharts.module.css`, dead skeleton variants, `chart-gallery/` and `signal-charts/` empty directories, orphaned exports. One source of truth per primitive and per formatter afterwards.
6. Confirm before each deletion that no public/auth/compat surface imports it (the echarts stack's only consumer is `/demo` — already inventoried).

---

## 13. Codification — make the system permanent

1. **`styles/authenticated/README.md`:** replace the chart-selection table with the T1–T10 vocabulary + the §6 route map; add the palette table (§2.2) with the fixed-order/no-cycling rule, the scatter-subset rule, and the amber relief rule; state hatch semantics (T2) and the mono-numeral rule; keep the `OperationalVisualSummary` prohibition.
2. **`docs/design/authenticated-visualisation-system.md`:** update the primitive roster, route mapping, and skeleton variants to match the shipped result (it remains the product-truth companion doc).
3. **Lint guard (`scripts/check-authenticated-design.mjs`):** add — (a) `echarts`/`echarts-for-react` imports are errors anywhere; (b) `recharts` imports are errors outside `components/charts/authenticated/cartesian/`; (c) `--dashboard-` variable references are errors; (d) Recharts default-style tells (`#8884d8`, `#82ca9d`, default `<Tooltip` without custom `content`) are errors; (e) hex literals in `components/charts/**` outside `geometry.ts`… remain errors (existing rule, re-verify scope).
4. **PR checklist** (append to the visualisation doc): form chosen from the roster by question · data from an existing loader/selector · filters honoured · skeleton twin updated · `View chart data` present · widths 1440/1280/1024/768/390 checked · dark mode checked · reduced motion checked · totals cross-checked against the page's table/KPIs · `npm run lint:authenticated-design` green.

---

## 14. Execution plan

Work top-down; each workstream has a hard gate. Browser-verify with the dev preview at every gate — screenshots beside the reference images, not DOM assertions alone.

**WS1 — Foundations** (tokens + core)
Token blocks §2.1 (including the `status.css` dark-mode fix) · `geometry.ts` · `HatchDefs` + hatch CSS utility · `ChartTooltip`/`ChartCursor` · `useChartTheme` · `ChartPanel` extensions · skeleton variant scaffolding · render every treatment in `/dev/design-system` (the gallery is the visual regression surface).
*Gate:* gallery shows T1–T10 faithful to the reference; lint/typecheck/design-guard green.

**WS2 — Flagship cartesian** (`/dashboard`, `/reports`)
`MetricTabs` + `ComboBarLineChart` + `TrendLineChart` + `DualLineChart` + `RankedBarsChart` (reports) + T9 restyle of the ledger/KPI tiles.
*Gate:* side-by-side with screenshots 1/2/4 passes the core test; metric totals reconcile with the tiles; widths + dark + reduced-motion verified; no hydration warnings.

**WS3 — Operational primitives v2**
`BlockRailChart`, `TickMeterRow`, `DotMatrixChart`, `SegmentCompositionCard`, `SparkTrend`, and the six restyles (§5 table).
*Gate:* gallery + unit-level visual check per primitive; skeleton twins match geometry.

**WS4 — Route rollout** (grouped; verify each group in the browser before the next)
(a) `/losses`, `/recoveries` · (b) `/work`, `/claims` · (c) `/customers`, `/customers/[id]`, `/rules`, `/flows` · (d) `/integrations`, `/notifications`, `/partners`.
*Gate per group:* §15 parity + data-correctness checklist; totals cross-checked; the route sits beside the reference without looking like another product.

**WS5 — Consolidation** — §12 deletions, `/demo` migration, bundle diff recorded.
*Gate:* `next build` clean; no import of deleted modules; demo visually intact.

**WS6 — Codification & full verification** — §13 items + §15 protocol run end-to-end + final report.

---

## 15. Verification protocol & final report

**Functional parity (against `1efc14ae`):** every authenticated destination reachable · filters/exports/deep links/URL state work · drawers, modals, mobile nav intact · no table or control lost · API/mutation behaviour unchanged.

**Data correctness:** per chart — source fields, aggregation, grouping, date range, timezone, merchant boundary verified; chart totals cross-checked against the co-located table/KPIs; null vs zero vs unavailable spot-checked; currencies never mixed.

**Visual QA:** 1440 / 1280 / 1024 / 768 / 390px on every changed route — no horizontal overflow, no clipped labels, no tooltip clipping, correct skeleton geometry, correct dark mode, reduced motion respected. Final judgement is made against the reference images.

**Automated:** `npm run lint`, `npm run lint:authenticated-design`, typecheck, unit/integration suites, `next build`. A check not run is reported as not run — never claimed.

**Final report (deliverable of WS6):** primitives created/extended/deleted · per-route: form chosen, why it fits the question, data source, filters honoured · functional parity result + anything restored · bundle/perf deltas · checks run with results · routes that genuinely lacked data for a useful visual (expected: possibly `/partners`) · remaining risks.

---

## Appendix A — palette validation evidence (2026-07-17)

Method: OKLCH lightness band (light 0.43–0.77, dark 0.48–0.67) · chroma floor C ≥ 0.10 · Machado-2009 protan/deutan simulation, adjacent-pair ΔE ≥ 12 (all-pairs for scatter/matrix) · WCAG contrast vs the actual card surface.

| Check | Set | Result |
|---|---|---|
| Light categorical (on `#ffffff`) | `#ff5a0a, #7088e8, #d9a400, #0e9f6e, #8b5cf6, #e65745` | **PASS** — worst adjacent ΔE 48.7; WARN amber 2.27:1 → relief rule |
| Light scatter subset, all-pairs | `#ff5a0a, #7088e8, #0e9f6e, #e65745` | **PASS** — worst pair ΔE 13.7 |
| Dark categorical (on `#20201c`) | `#d95514, #6e84e2, #b28c22, #169a72, #8a68e4, #d55a50` | **PASS** — in band, worst adjacent ΔE 43.7, all ≥ 3:1 |
| Ordinal orange light | `#ff9058 → #ff5a0a → #d94b08 → #a83a04` | **PASS** (monotone L, ΔL ≥ 0.06, light end 2.24:1) |
| Ordinal blue light | `#93a4ee → #7088e8 → #5568c9 → #3f519c` | **PASS** (light end 2.39:1) |
| Ordinal orange dark | `#8f3f14 → #b34a10 → #d95514 → #f07434` | **PASS** |
| Ordinal blue dark | `#48588f → #5c6ec0 → #7a90ea → #a3b2f4` | **PASS** |

Rejected along the way: `#f5c400` (legacy chart-yellow — L 0.84, outside band), `#10b981` (legacy chart-green — 2.54:1), the legacy dark set (`#ff7838/#8ea2f2/#e9c949/#35c99a/#ef786a` — all above the dark band), amber+orange in any all-pairs form (deutan ΔE 7.4 — hence the scatter-subset rule).

## Appendix B — implementation notes for the two tricky marks

**Hatch pattern (SVG):** one `<pattern id="ua-hatch-{hue}" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">` containing `<line x1="0" y1="0" x2="0" y2="5" stroke-width="1">`; stroke reads the resolved token. CSS variant: `repeating-linear-gradient(45deg, <colour> 0 1px, transparent 1px 5px)`. Area fall-off via `mask-image: linear-gradient(180deg, rgb(0 0 0 / .85), rgb(0 0 0 / .1))` on the fill group.

**Cap-top bar (Recharts custom shape):** a `shape` function rendering two rects — body: `y..baseline`, fill `url(#ua-capfade-{hue})` (a `<linearGradient>` 22%→4% opacity), top corners 2px radius via path; cap: `y..y+2`, solid hue. Register both defs once per chart via `<defs>` inside `<Customized>`; hover lift = body opacity 22%→32%, no stroke.
