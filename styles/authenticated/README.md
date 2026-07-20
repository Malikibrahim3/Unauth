# Authenticated design system

Single source of truth for every visual value used by `app/(app)/**` and the authenticated-consumed parts of `components/**`. If you're building or editing an authenticated surface, styles come from here — never invent a new colour, radius, shadow, control height, or chart palette locally.

The approved dashboard and Autumn CRM references are the visual benchmark for the complete signed-in product. A page is not finished merely because it uses the right colours: its composition must belong beside that dashboard — warm neutral shell, compact utility chrome, dense bordered white cards, restrained type, small-radius controls, orange action/performance signals, and blue operational-health visuals.

## Global product rules

1. **Functionality is the baseline.** Presentation work must preserve every committed route, query parameter, permission check, server action, mutation, export, deep link, keyboard path, mobile path, and truthful unavailable state. Moving a secondary action is allowed only when it remains labelled, keyboard-accessible, and no more than one activation further away. Primary actions stay visible.
2. **Use composition, not cosmetic wrapping.** Signed-in index pages use `WorkbenchPage`; detail pages use `DetailPageShell`; settings use `SettingsPageShell`; exceptional pages use `AuthenticatedPageHeader` and `AuthenticatedPanel`. Do not place an old text-heavy page inside a newly coloured container and call it migrated.
3. **Visuals explain real data without templating the app.** Data-rich operational pages normally have one primary visual and at most two compact supporting visuals. Select the chart by the operational question, then pass it already-authorised, already-filtered data from the page loader. Cohesion comes from `components/charts/authenticated/**`, not from repeating one composition. Never fabricate history, infer nulls as zero, combine currencies, or chart a paginated subset as if it were the full population.
4. **Density follows the reference.** Desktop pages use the 208px rail, 48px utility header, 20px content gutters, 10–13px supporting text, 20–24px primary metrics, 6–8px radii, subtle borders, and minimal shadow. Empty space should clarify grouping, not turn operational pages into marketing layouts.
5. **Loading geometry is a contract.** A route skeleton must reserve the same header, KPI, chart family, toolbar, main-card, and side-rail positions as the resolved page. Select the matching `AuthenticatedChartSkeleton` variant (`trend · combo · rail · meter · matrix · segment · ranked · columns · bands · dotplot · sequence · sparkline · health`); do not substitute a generic rectangle. If the resolved layout changes, its skeleton changes in the same pull request.
6. **Navigation work stays off the critical path.** Shared layouts must batch independent database reads, avoid per-permission query fan-out, and defer non-blocking badges or notification counts to cached client resources. Page loaders parallelise independent queries and retain the same authorisation boundary.
7. **Responsive and dark mode are first-class.** Controls remain reachable at 320px, cards stack without page-level horizontal overflow, dense tables scroll within their panel, and every chart token has a dark equivalent.

## Entry point

`index.css` is the **only** authenticated stylesheet entry point. It's imported from three route-layout files (`app/(app)/layout.tsx`, `app/onboarding/layout.tsx`, `app/audit-running/page.tsx`) — all three import the same relative path, `../../styles/authenticated/index.css`. Do not add a fourth import site; do not import any file in this folder except `index.css` from application code.

## File map

| File | Contents |
|---|---|
| `tokens.css` | Surfaces, ink/text, borders, brand/accent, chart palette, geometry (radius/shadow/focus), density (control heights), plus the `--ua-*` alias layer |
| `status.css` | Semantic/risk/severity/gauge colour tokens, plus `--ua-success/-warning/-critical/-info` (+ `-bg`/`-border`) aliases |
| `typography.css` | Font stacks + `--ua-text-*` named type-role tokens |
| `foundations.css` | Canvas/base text rendering, selection, focus-visible, reduced motion, logo mark, scrollbar |
| `controls.css` | Base input/button/link visual contract (component-level variants live in `components/ui/*.tsx`) |
| `surfaces.css` | Sidebar/header chrome, identity tile, focal/section panels, metric card, empty-state visual |
| `tables.css` | Table shell/header/row base rules |
| `overlays.css` | Documents where modal/drawer/tooltip/toast styling actually lives (component TSX, not CSS) and the one known gap (Toast's DOM-sibling issue — see audit) |
| `states.css` | Documents the three still-separate loading/skeleton systems (not unified in this pass) |
| `responsive.css` | Shared responsive density override |

## The `--ua-*` alias layer

Every token above also has a `--ua-`-prefixed name (e.g. `--ua-radius-card: var(--radius-md)`). These are declared once in the light-mode block and are **not** re-declared in the dark-mode block — dark values flow through automatically, because a custom property's `var()` reference resolves against the nearest declaration of the *referenced* property at the point of use, not at the point where the alias itself was declared. Since the dark-mode selector (`:root[data-theme="dark"] .ua-app`) redeclares the base variables (`--surface-base`, `--critical`, etc.) that the `--ua-*` aliases point to, any element under that scope automatically gets the dark value with zero extra code.

New and migrated code should read `--ua-*` names. Existing code reading the older unprefixed names (`--accent`, `--radius-md`, `--shadow-md`, …) keeps working unchanged during the transition — both names resolve to the same value today.

### Known mismatches the alias layer surfaces honestly, not silently

- **Control radius**: buttons use `--radius-sm` (4px); inputs/selects use `--radius-md` (6px). `--ua-radius-control` forwards to 4px (matches Button); a separate `--ua-radius-input` forwards to 6px (matches Input/Select) rather than forcing one onto the other's current value. Converging these is a craft-pass decision, not made here.
- **Card radius**: `Card.tsx`/`SectionCard.tsx`/`ModuleCard.tsx`/`MetricCard.tsx`/`Modal.tsx`/`DataTable.tsx` all use `--radius-md` (6px) — `--ua-radius-card`/`--ua-radius-overlay` forward to that. The page-chrome panels (`AuthenticatedPageChrome.module.css`: `.panel`, `.kpiStrip`, `.toolbar`, `.detailSection`, `.guidanceCard`) now also read `--ua-radius-card` — do not reintroduce literal panel radii. `PanelCard`'s `app`/`appMuted`/`appInset` variants (in `components/ui/LandingPrimitives.tsx`) still use `--radius-lg` (8px) — pre-existing, tracked in the migration register.

### Focus treatment (binding)

Every interactive control gets a visible keyboard focus state from `--shadow-focus`. `Button`/`ButtonLink` (via `buttonStyles.ts`), `FilterChip`, and the Modal/Drawer close buttons apply `focus-visible:shadow-[var(--shadow-focus)]`; list rows that fill their container use the inset form `focus-visible:shadow-[inset_var(--shadow-focus)]`. New interactive components must not ship with `focus-visible:outline-none` and no replacement ring.

### Panel composition (binding)

Content passed as `WorkbenchPage`'s `main` renders inside an `AuthenticatedPanel` (bordered, unpadded body). Do not nest free-standing bordered cards (`PanelCard`, `Card`) directly inside it — that produces double borders and flush-to-edge controls. Instead compose joined sections: a toolbar row (`px-4 py-3`, `border-b border-[var(--border-muted)]`) holding the section note and its actions, then a `divide-y` list of padded rows, then `EmptyState` for the empty case. `RulesIndexClient`/`FlowsIndexClient` are the reference implementations.

## Component taxonomy — one primitive per situation

**Buttons** — `components/ui/Button.tsx` / `ButtonLink.tsx`. Variants: `primary`, `cta`, `secondary`, `ghost`, `danger`, `link`. All share height/radius/typography/focus/disabled treatment from `buttonStyles.ts`. **Disabled (binding):** a disabled filled button renders inert — muted `--surface-sunken` background + `--text-tertiary` text, not a faded-accent tint (a 50%-opacity orange primary reads as "enabled but light"). `loading` keeps the accent + spinner; only the real `disabled` prop triggers the inert look. There is no canonical `IconButton` yet — see the migration register.

**Status badges** — `components/ui/StatusBadge.tsx`. Non-interactive. Communicates neutral/informational/warning/critical/success. Do not build a page-specific status badge; if a status doesn't fit the existing tone map, extend `STATUS_TONES`, don't hand-roll a pill.

**Badge** — `components/ui/Badge.tsx`. Generic labelling (not lifecycle status): counts, partner names, tags, record types. **Sentence-case (binding):** Badge shares StatusBadge's sentence-case, medium-weight typography — it is no longer uppercase/700 (that clashed with the sentence-case StatusBadge on shared screens). It still differs from StatusBadge in that it carries no semantic tone-map and takes free children; use StatusBadge for anything that is a lifecycle status value.

**KPI strip** — `WorkbenchKpiStrip` / `AuthenticatedPageChrome.module.css .kpiStrip`. A non-interactive metrics row. It carries no selected/active accent — do not add a first-tile top-border or any per-tile highlight; the tiles are not tabs. If a metric row ever needs to filter, build it as a real `SegmentedControl`/tab, not a styled KPI strip.

**Internal vs external link affordance (binding):** the up-right arrow (`ArrowUpRight` / ↗ / `ExternalLink`) is reserved for links that open a genuinely external target (`target="_blank"` — helpdesk/Shopify/docs). Internal navigation uses `ArrowRight` (→) or a chevron.

**Filter chips** — `components/ui/FilterChip.tsx`. Filter chips must never borrow semantic warning/success/critical colour merely because they're selected — selection uses the neutral selected surface and strong border.

**Segmented controls** — `components/ui/SegmentedControl.tsx`. Use only for mutually exclusive views/sort choices — one container, one height, one selected-state treatment, not per-segment pill styling.

**Authenticated charts** — `components/charts/authenticated/**`. `ChartPanel` owns the compact panel header, annotation, legend, tab-strip slot, pin-annotation slot, interpretive-caption slot, accessible data table, focus treatment, empty state and spacing. Route code prepares the business dataset; chart components only render it. This is the "Autumn" chart language — ten fixed treatments, T1–T10, decoded in full in `docs/IMPL_chart_visualisation_system.md` §1; every geometry constant they use lives once in `components/charts/authenticated/core/geometry.ts` (the plot-geometry SSOT — a PR that hardcodes plot geometry in a component fails review).

**Operational summaries** — `components/ui/KeyInsightCallout.tsx` and `components/ui/SummaryRail.tsx`. Unauth is an operational system, not a BI dashboard: **full charts live only on `/dashboard` and `/reports`.** Operational routes are intentionally chart-free. Each states its one actionable fact as a `KeyInsightCallout` in the `primaryVisual` band (a sentence with emphasised figures, computed from data the loader already holds — never a new query) and puts lightweight context — a distribution, counts, a `SparkTrend`, a `TickMeterRow` — in a `SummaryRail` in `WorkbenchPage.rail`. Both are non-interactive (rail rows may deep-link), token-only, and their tones mirror the five `StatusBadge` tones. Do not add a hero chart to an operational route; do not reintroduce the removed `OperationalVisualSummary`.

### T1–T10 vocabulary

| # | Treatment | Where it lives |
|---|---|---|
| T1 | Quiet cartesian frame — no axis/border/ticks, ≤5 horizontal gridlines, mono axis labels | `core/geometry.ts` frame constants; CSS `.frameGrid`/`.frameYAxis`/`.frameXLabel` |
| T2 | Hatch — 45°, 1px stroke, 5px pitch. Fixed meanings only: single-series area wash, remainder/headroom, or unavailable/disconnected region. Never decoration, never on a value-carrying mark | `core/HatchDefs.tsx` (SVG), `.hatch{Hue}`/`.hatchNeutral` (CSS) |
| T3 | Trend line with hatched fall | `cartesian/TrendLineChart.tsx`, `cartesian/DualLineChart.tsx` |
| T4 | Cap-top gradient bars + dashed comparison overlay | `cartesian/ComboBarLineChart.tsx` |
| T5 | Dot-matrix / status-matrix grid (7px cells, ordinal ramp, sequential/single-hue only) | _Removed in the operational de-chart (2026-07-17); no current implementer_ |
| T6 | Block rail with pin annotations + hatched remainder | `operational/BlockRailChart.tsx` |
| T7 | Tick meter ("barcode" meter) | `operational/TickMeterRow.tsx` |
| T8 | Segment bar + dot legend + ranked rows (composition card) | `operational/SegmentCompositionCard.tsx` |
| T9 | Metric tab strip (KPI row that doubles as a chart's series selector) | `micro/MetricTabs.tsx`; passive variant is `WorkbenchKpiStrip` |
| T10 | Cursor + tooltip grammar (dashed crosshair, value-first tooltip card, axis pill) | `core/ChartCursor.tsx`, `core/ChartTooltip.tsx` |

Every in-chart numeral — axis ticks, tile values, tooltip values, pins, meter values, ranked values — is DM Mono (`--ua-font-mono`) with `tabular-nums`; the CSS utility is `.mono`. The interpretive caption (`.caption`) is the only italic in the product and states interpretation, never a number.

### Route map (§6 of the IMPL doc — keep in sync when a route's primary visual changes)

Only `/dashboard` and `/reports` carry full charts. Every operational route uses a `KeyInsightCallout` (primary) + `SummaryRail` (supporting) instead — see "Operational summaries" above.

| Route | Primary | Supporting |
|---|---|---|
| `/dashboard` | `MetricTabs` (T9) driving `ComboBarLineChart` (T4) | `SegmentCompositionCard` (T8) work composition, `BlockRailChart` (T6) data health |
| `/reports` | `DualLineChart` (T3, 2-series) | `RankedContributionChart` loss causes |
| `/work` | `KeyInsightCallout` — deadline risk | `SummaryRail` deadline-band distribution |
| `/claims` | `KeyInsightCallout` — exposure awaiting decision | `SummaryRail` decision-state distribution |
| `/losses` | `KeyInsightCallout` — top loss driver | `SummaryRail` loss-contribution breakdown |
| `/recoveries` | `KeyInsightCallout` — recovered vs recoverable | `SummaryRail` with `TickMeterRow` (T7) + stage volume |
| `/customers` | `KeyInsightCallout` — open-case context | `SummaryRail` case-context distribution |
| `/customers/[id]` | `BehaviorRoadmap`, `EvidenceScoreBadge` | — |
| `/rules` | `KeyInsightCallout` — published vs draft | `SummaryRail` rule-lifecycle counts |
| `/flows` | `KeyInsightCallout` — active vs draft | `SummaryRail` per-flow action load |
| `/integrations` | `KeyInsightCallout` — connected / needs attention | `SummaryRail` source-health counts |
| `/notifications` | `KeyInsightCallout` — unread | `SummaryRail` activity `SparkTrend` + read/unread |
| `/partners` | KPI-only (no chart — rows not yet loaded for a useful visual) | — |

### Palette rules (binding — computed, not aesthetic; see IMPL doc Appendix A for the validation evidence)

- **Fixed categorical slot order, never cycled, never reassigned on filter:** 1 orange · 2 blue · 3 yellow(amber) · 4 green · 5 violet · 6 red. Colour follows the entity — filtering out a series must not repaint the survivors. More than 6 real series fold into `--ua-chart-neutral` ("Other") or facet; never generate a 7th hue.
- **Amber relief rule:** slot 3 (yellow) is 2.27:1 on white — below text-contrast. Wherever amber appears, it must carry a direct label (never colour alone); the `View chart data` table is the mandatory fallback.
- **Scatter/matrix/small-multiples subset:** where any two marks can neighbour, restrict to slots {1, 2, 4, 6} (orange/blue/green/red) — the full 6-slot set is only CVD-safe adjacent, not all-pairs.
- **Ordinal ramps** (`--ua-chart-ramp-{orange,blue}-{1..4}`) are for ordered intensity (dot-matrix buckets, ageing bands, stage order) — one hue, monotone lightness. `--ua-chart-heat-*` extensions are heat-only (dense continuous fills near zero); never for discrete marks.
- Text never wears a series colour, with one audited exception: T7's row value, which falls back to `--text-primary` for orange/yellow (they fail 4.5:1 as text).

### Hatch semantics (T2 — binding)

Hatch has exactly three meanings and no others: (1) the area wash under a single-series trend line, (2) the unfilled remainder/headroom of a rail or capacity bar, (3) a plot region where data genuinely does not exist. Never on a value-carrying mark (a bar, a segment, a cell), never as a decorative background pattern.

### Chart grammar and performance

- Server/CSS primitives are preferred for current-state charts (`operational/**`, zero chart JS on those routes). Recharts is confined to `cartesian/**` (`/dashboard`, `/reports` only), code-split via `next/dynamic`, reduced-motion aware (`isAnimationActive={false}`), and capped to a truthful point density (60 plotted buckets, 26×7 matrix cells).
- Recharts components never hardcode hex and never read a page-local remap layer — `core/useChartTheme.ts` resolves `--ua-chart-*` (and border/ink tokens) once per mount and on `data-theme` change.
- Every important chart exposes `View chart data`; meaning is never available only on hover or by colour. A mark is a real `<Link>` (not an inert `onClick`) only when a genuine destination exists for that entity/filtered slice — see the IMPL doc §4.5 for the per-route destination table.
- Charts receive stable prepared arrays and do not query, authorise, aggregate merchant business rules, or create historical points.
- Empty, zero, insufficient, partial, unavailable and disconnected states are distinct (IMPL doc §9). A missing series never becomes a flat zero line; null is never coerced to zero.
- Chart changes must include the corresponding skeleton variant (`AuthenticatedChartSkeleton`'s variant set: `trend · combo · rail · meter · matrix · segment · ranked · columns · bands · dotplot · sequence · sparkline`), parity run, total cross-check, responsive inspection and dark-mode inspection.

The removed `OperationalVisualSummary` must not be reintroduced. Repeating a generic distribution-plus-coverage card across unrelated routes is a design-system violation.

**Skeletons** — route loading files select from `components/navigation/skeletons/**` or `OperationalRouteSkeleton`. `AuthenticatedChartSkeleton` supplies a geometry for every approved operational chart family. Skeletons mirror resolved geometry and never contain their own bespoke pulse markup.

**Cards and panels** — `components/ui/Card.tsx` (`raised`/`overlay`/`flat`) is authoritative going forward. `SectionCard`/`ModuleCard` wrap it. `PanelCard` (`LandingPrimitives.tsx`) remains in heavy authenticated use today (see mismatch note above) and is not migrated in this pass — do not add *new* authenticated call sites of `PanelCard`; use `Card`/`SectionCard` instead.

**Tables** — `components/ui/DataTable.tsx` is authoritative. Nine hand-rolled `<table>` implementations exist today (see migration register) and are not migrated in this pass — do not add a tenth.

## Exception mechanism (for the lint guard in `scripts/check-authenticated-design.mjs`)

Hardcoded colour/radius/shadow values are flagged by the authenticated design lint. Documented exceptions:

- **Data visualisation** — authenticated charts use `--ua-chart-*` or semantic status tokens. Literal series colours belong only in token definitions; page and component code must not invent hues.
- **Provider/third-party brand marks** — a connector's own logo colour (e.g. Shopify green, Gorgias mark) is not a product theme choice and may be literal.
- **`styles/authenticated/tokens.css` and `status.css` themselves** — these are the token *definitions*; they are excluded from the hardcoded-value scan by design (that's where hex values are supposed to live).

Anything else — a literal hex/rgb/hsl colour, an arbitrary `rounded-[Npx]`, an inline `boxShadow`/`borderRadius` — should reference a token instead. If you believe you have a genuine new exception category, add it to the `ignored`/exception list in `scripts/check-authenticated-design.mjs` with a comment explaining why, rather than working around the lint.
