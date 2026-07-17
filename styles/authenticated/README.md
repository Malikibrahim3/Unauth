# Authenticated design system

Single source of truth for every visual value used by `app/(app)/**` and the authenticated-consumed parts of `components/**`. If you're building or editing an authenticated surface, styles come from here — never invent a new colour, radius, shadow, control height, or chart palette locally.

The approved dashboard and Autumn CRM references are the visual benchmark for the complete signed-in product. A page is not finished merely because it uses the right colours: its composition must belong beside that dashboard — warm neutral shell, compact utility chrome, dense bordered white cards, restrained type, small-radius controls, orange action/performance signals, and blue operational-health visuals.

## Global product rules

1. **Functionality is the baseline.** Presentation work must preserve every committed route, query parameter, permission check, server action, mutation, export, deep link, keyboard path, mobile path, and truthful unavailable state. Moving a secondary action is allowed only when it remains labelled, keyboard-accessible, and no more than one activation further away. Primary actions stay visible.
2. **Use composition, not cosmetic wrapping.** Signed-in index pages use `WorkbenchPage`; detail pages use `DetailPageShell`; settings use `SettingsPageShell`; exceptional pages use `AuthenticatedPageHeader` and `AuthenticatedPanel`. Do not place an old text-heavy page inside a newly coloured container and call it migrated.
3. **Visuals explain real data without templating the app.** Data-rich operational pages normally have one primary visual and at most two compact supporting visuals. Select the chart by the operational question, then pass it already-authorised, already-filtered data from the page loader. Cohesion comes from `components/charts/authenticated/**`, not from repeating one composition. Never fabricate history, infer nulls as zero, combine currencies, or chart a paginated subset as if it were the full population.
4. **Density follows the reference.** Desktop pages use the 208px rail, 48px utility header, 20px content gutters, 10–13px supporting text, 20–24px primary metrics, 6–8px radii, subtle borders, and minimal shadow. Empty space should clarify grouping, not turn operational pages into marketing layouts.
5. **Loading geometry is a contract.** A route skeleton must reserve the same header, KPI, chart family, toolbar, main-card, and side-rail positions as the resolved page. Select the matching deadline, column, ranked, funnel, range, matrix, sequence, health, or activity skeleton; do not substitute a generic rectangle. If the resolved layout changes, its skeleton changes in the same pull request.
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

**Buttons** — `components/ui/Button.tsx` / `ButtonLink.tsx`. Variants: `primary`, `cta`, `secondary`, `ghost`, `danger`, `link`. All share height/radius/typography/focus/disabled treatment from `buttonStyles.ts`. There is no canonical `IconButton` yet — see the migration register.

**Status badges** — `components/ui/StatusBadge.tsx`. Non-interactive. Communicates neutral/informational/warning/critical/success. Do not build a page-specific status badge; if a status doesn't fit the existing tone map, extend `STATUS_TONES`, don't hand-roll a pill.

**Badge** — `components/ui/Badge.tsx`. Generic labelling (not lifecycle status). Distinct height/radius/case convention from `StatusBadge` intentionally — they solve different problems (see the migration register for where this line has blurred in practice).

**Filter chips** — `components/ui/FilterChip.tsx`. Filter chips must never borrow semantic warning/success/critical colour merely because they're selected — selection uses the neutral selected surface and strong border.

**Segmented controls** — `components/ui/SegmentedControl.tsx`. Use only for mutually exclusive views/sort choices — one container, one height, one selected-state treatment, not per-segment pill styling.

**Authenticated charts** — `components/charts/authenticated/**`. `ChartPanel` owns the compact panel header, annotation, legend, accessible data table, focus treatment, empty state and spacing. Purpose-built primitives currently include deadline risk, column comparison, ranked contribution, stage funnel, range plot, status matrix, mini-bar sequence, source-health matrix and activity strip. Route code prepares the business dataset; chart components only render it.

### Chart selection rules

| Data question | Preferred primitive |
|---|---|
| Deadline or SLA bands | `DeadlineRiskChart` |
| Compare a small set of categorical counts | `ColumnComparisonChart` |
| Rank contribution to a compatible financial total | `RankedContributionChart` |
| Show stage volume without claiming conversion | `StageFunnelChart` with an explicit volume note |
| Compare proportions against one common population | `RangePlotChart` |
| Show one state per rule/entity across a population | `StatusMatrixChart` |
| Compare configured action load across definitions | `MiniBarSequenceChart` |
| Cross provider and health dimensions | `SourceHealthMatrixChart` |
| Show real received records over represented dates | `ActivityStripChart` |
| Historical financial trends and configurable analysis | dashboard/reporting chart modules using the same tokens |

Use a trend only when dated observations exist. Use a money chart only when every plotted value has one compatible currency. Do not use a funnel for causal conversion, a bubble without a third quantitative variable, a doughnut for precise comparison, or a heatmap when absence cannot be distinguished from zero.

### Chart grammar and performance

- Orange is operational attention or financial emphasis; blue is measured coverage/health; green/yellow/red retain semantic status meaning; neutral is unavailable, inactive, or comparison context.
- Axes and grids are quiet, labels are 9–11px, radii are 2px inside plots and 6–8px on panels, legends stay compact, and third-party defaults never leak through.
- Every important chart exposes `View chart data`; meaning is never available only on hover or by colour.
- Charts receive stable prepared arrays and do not query, authorise, aggregate merchant business rules, or create historical points.
- Server/CSS primitives are preferred for current-state charts. Heavier client chart libraries are restricted to dashboard/reporting, code-split where possible, reduced-motion aware, and capped to a truthful point density.
- Empty, zero, insufficient, partial, unavailable and disconnected states are distinct. A missing series never becomes a flat zero line.
- Chart changes must include the corresponding skeleton variant, parity run, total cross-check, responsive inspection and dark-mode inspection.

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
