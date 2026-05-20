# In-App Premium UI Implementation Plan

Audience: a follow-on coding agent (Codex / Cursor).
Scope: the authenticated product UI only — everything under `app/(app)`, plus shared components in `components/ui`, `components/nav`, `components/layout`, `components/workbench`, `components/audit`, `components/customers`, `components/inbox`, `components/evidence`, `components/upload`, `components/watchlist`, `components/settings`.

**Out of scope:** `app/(public)/landing`, marketing pages, hero, signup, login, reset, onboarding visuals, public audit pages, legal pages. Do not touch any landing-page artifact, copy, SVG, or animation. Do not edit `components/ui/animated-grid-pattern.tsx`, `border-beam.tsx`, `dot-pattern.tsx`, `meteors.tsx`, `spotlight.tsx`.

The goal is to take the in-app UI from "better than before but still slightly generic" to "premium, enterprise-grade, cohesive with the Unauth brand." Codex has already shifted the app onto a light workbench pattern with rust/ink tokens. This pass is a calm, surgical refinement — not a rebuild.

---

## 1. Current Visual Diagnosis

### What Codex has already improved

- **Token system in `app/globals.css` exists and is mostly mature.** Rust + ink + paper palette, risk-tier tokens, type scale (`text-display`, `text-h1`, `text-h2`, `text-body`, `text-meta`, `text-overline`, `text-mono-*`), spacing scale (`--space-1…11`), shadow scale, motion tokens.
- **Workbench primitives have been built** under `components/workbench/`: `WorkbenchPage`, `WorkbenchNav`, `WorkbenchKpiStrip`, `WorkbenchActionBar`, `WorkbenchPanel`, `WorkbenchEmptyState`. Most operational pages (`/inbox`, `/customers`, `/chargebacks`, `/history`, `/watchlist`, `/saved`, `/upload`, `/help`) now route through `WorkbenchPage`.
- **Dashboard** has been converted to a single bordered workbench surface with local nav, KPI strip, cases queue + right rail (clusters, signals, activity, trend bar).
- **Sidebar** uses 2px rust left-rail for active items, group labels with a rust dot prefix, compact 32px row height, expand/collapse with hover-preview.
- **AppHeader** uses a glass effect (`backdrop-filter: blur(8px) saturate(130%)`), 56px sticky, breadcrumb with rust dot on the active segment, ⌘K search, MerchantEnvChip, AvatarMenu.
- **Buttons, Badges, Tabs, DataTable** have been moved off the old blue palette onto rust + ink + risk tokens. 3-4px radius, 10-12px overline labels, mono tabular numerics, 36-44px row heights.
- **Charts** in `AuditCharts.tsx` use a brand-aligned ink/rust/grey palette and `ua-section-dot` markers in tooltips.
- **Empty states** have a compact workbench variant (`WorkbenchEmptyState`) with a rust dot title, short description, and a single next action.

### What still feels off (the gap to "premium")

These are not all individually critical — but together they are why the app still reads as "improved SaaS dashboard" instead of "Ramp-level fraud intelligence console."

1. **Token duplication and naming drift.** `globals.css` defines two parallel sets of tokens — the §5 "spec" tokens (`--text-primary`, `--text-secondary`, `--text-tertiary`, `--bg-surface`, `--bg-surface-alt`, `--border-default`) and the legacy tokens (`--text`, `--text-muted`, `--text-subtle`, `--bg-subtle`, `--bg-muted`, `--border`). Components mix the two freely. `globals.css:18-21` and `globals.css:117-126` redefine `--bg-surface` and `--border-subtle` further down the file, overwriting the spec values. `EmptyState.tsx` uses `--text-primary` / `--text-secondary`; `Sidebar.tsx` uses `--text-muted`. This is the single biggest source of low-grade visual drift.
2. **Hard-coded hex values leak through "branded" components.** `RiskScoreBadge.tsx`, `ConfidenceBadge.tsx`, `CustomerProfileCard.tsx`, `Tabs.tsx` (line 39, 45), and `Badge.tsx` (`CHIP_STYLES` and `SOLID_STYLES`) embed `#1A1814`, `#7B2D26`, `#FBEFEC`, `#F2EDE3`, `#F5F3EF`, `#D8AFA3`, etc. directly. The right behavior is to source these from `var(--brand-ink)`, `var(--brand-rust)`, `var(--risk-*)`. The current pattern means a token change won't propagate cleanly.
3. **Border radius drift.** The token scale defines `--radius-1=4`, `--radius-2=6`, `--radius-3=8`, `--radius-4=12`, `--radius-pill=9999`. In practice components use raw `borderRadius: 4`, `5`, `6`, `8`, `999`, plus Tailwind `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-full`. `WorkbenchPage` shell uses `borderRadius: 5` (off-scale). `customers/page.tsx:337` uses `rounded-lg` on cohort cards. The hover-card glow shadow on the customer cohort grid (`hover:shadow-sm`) and the saved-views pill (`rounded-full`) push the page toward generic SaaS.
4. **Two empty-state systems coexist.** `components/ui/EmptyState.tsx` is the original large centered version (used in legacy flows and customers detail). `components/workbench/WorkbenchEmptyState.tsx` is the new compact version. The product still mixes them.
5. **Two header systems coexist.** `components/ui/PageHeader.tsx` (eyebrow + breadcrumbs + title + meta + tabs) versus `WorkbenchPage` header (nav + title + actions). Some routes use neither and roll a custom header (the old `/dashboard` did this — now converted, but `audit/[runId]/page.tsx` is on the in-between path).
6. **Tables are inconsistent.** `DataTable` is canonical and correct. But `chargebacks/page.tsx:110-188` renders a hand-built `<table>` with its own column styling that does not match `DataTable`. Similarly the dashboard rows (`dashboard/page.tsx:338-372`) are grid-based cards instead of a true table. There is a third style in the customer drawer.
7. **Charts read as "stock dashboard."** `AuditCharts.tsx` ships a pie + bar + horizontal progress combo. The colors are brand-correct, but the chart-type choices are generic — donut + grouped bar = MetricsBase template. The composition bar uses pure `#7B2D26` for "with signals" without any structural cue (rule line, end label, density tick).
8. **Cards still occasionally feel decorative.** `customers/page.tsx:333-349` cohort cards use `rounded-lg`, `hover:shadow-sm`, and `border-color` switches on highlight — that's a SaaS marketing pattern. Real fraud consoles don't have hovering cards; they have rows in a ledger.
9. **Sidebar has a subtle vertical gradient** (`Sidebar.tsx:250` — `linear-gradient(180deg, var(--bg-canvas) 0%, #F6F1E8 100%)`). It's visible enough to register as decoration but not strong enough to read as intentional. A flat surface would feel more confident.
10. **Buttons are close but a hair toy.** Primary uses `boxShadow: '0 1px 0 rgba(94,32,24,0.18)'` (good), but the radius is `4` and `letter-spacing: 0.01em` — and the font is DM Sans at 13px. On a dense action bar this can read as "Tailwind starter button" rather than "Ramp button." Secondary buttons on the paper canvas can be hard to distinguish from inputs.
11. **Inputs are minimal.** `Input.tsx` and `Select.tsx` are essentially default — `var(--bg-surface)` + `1px border-default` + `4px radius`. There's no defined label component, no inline helper text pattern, no error state, no leading-icon pattern. Settings forms (`settings/account/page.tsx`) hand-roll this.
12. **Filter chips drift.** `customers/page.tsx` defines its own `FilterChip` inline (rust outline + soft rust fill + ×). Saved-view pills next to it use `rounded-full` with a different border color. The pattern isn't centralized.
13. **Spacing rhythm is not rigorous.** Pages use a mix of `p-4`, `p-4 md:p-6`, hard-coded `padding: '9px 14px'`, `padding: '0 14px'`. There's no enforced page padding, no enforced gap between major sections.
14. **No serif anywhere except in the wordmark.** The brand has a strong editorial / case-file identity (serif wordmark, rust dot, ledger feel from `MerchantDashboard.tsx`). Inside the app, every label, title, and value is DM Sans. The app reads correctly but doesn't echo the brand voice.
15. **Loading and skeleton patterns exist but are uneven.** `DataTable` has built-in skeleton rows; `LoadingState.tsx` provides a shimmer block; but the dashboard, drawer, and detail pages don't all wire them up consistently. Some sections fall back to plain `Loading…` strings.
16. **Audit detail page (`audit/[runId]/page.tsx`) is the visual outlier.** Mixes hard-coded `#1A1814` button colors, repeats pagination top/bottom/middle, stacks a hero metric grid + status bar + risk chart in one viewport. This is the page that still feels most like "generic dashboard."
17. **Drawers are decent but not premium.** `Drawer.tsx` uses `--shadow-drawer` and a 560px default — correct. But the inner content drives the styling, and the `CustomerIntelligenceDrawer.tsx` defines CHIP styling as inline JS objects instead of pulling from tokens.
18. **The dashboard's local nav is inlined instead of using `WorkbenchNav`.** `dashboard/page.tsx:234-249` hand-rolls the nav. Every other workbench page uses `WorkbenchNav`. Tiny inconsistency, visible to the eye.

---

## 2. Brand Cohesion Gap

The brand reads as: editorial, serious, ledger-like, ink-on-paper, with a single rust accent. The wordmark is a serif "Unauth" + rust dot. The logo mark is a sharp ink "U" with a rust offshoot — a "filed" stamp. The landing page leans into the case-file / evidence-folder aesthetic.

### Where the app already matches the brand
- Paper canvas (`#F8F5EE`) and ink text (`#1A1814`) are correct.
- Rust accent (`#7B2D26`) is now used for primary actions, active tabs, focus rings, the sidebar active rail, breadcrumb dot, section overline dots.
- Mono tabular numerics for IDs, scores, money, timestamps — correct.
- Compact 10-11px uppercase overline section labels with a leading rust dot — correct.
- Workbench shell with thin borders and minimal shadow — directionally correct.

### Where the app conflicts with the brand
- **The app never uses a serif.** The wordmark is the only serif element in the system. The product reads as a clean sans-serif SaaS console rather than an editorial / ledger console. There is no visual through-line from brand → product beyond the rust accent.
- **Surfaces are pure white-ish (`#FEFCF7`).** This is a defensible choice on a paper canvas, but it makes panels feel like generic cards rather than evidence folios. The landing artifact uses warmer panel colors and stronger inner structure.
- **Radii are too soft for the brand.** Newspapers and ledgers have sharp corners. The brand mark itself has hard right angles. The app uses 4-8px radii on panels and buttons (Tailwind defaults), which reads "modern SaaS" rather than "case file."
- **No editorial rule lines.** The brand language is dividers, columns, and rules. The app uses bordered card containers — every section is a box. Replacing some borders with single 1px rules between sections (Ramp's pattern) would feel more editorial.
- **Section overline dots are correctly placed in some primitives** (`PageHeader`, `SectionCard`, `WorkbenchEmptyState`, sidebar group labels) but missing on `DataTable` headers, chart legends, drawer headers, and audit-page action bars. The rust dot is one of the brand's strongest visual signatures and should appear consistently anywhere there is an overline.
- **Active filter chips, saved views, and action bars all look slightly different** across pages. The brand asks for one ruled, deliberate vocabulary — not three near-misses.
- **The logo mark itself is not used inside the app** — only the wordmark, in the sidebar header. The mark could appear in onboarding empty states, in evidence-package "filed" headers, in the loading splash, and on PDF/report previews to pull the brand deeper into the product.

### What makes the current app feel dated or generic
- Tailwind defaults bleeding through (`rounded-lg`, `shadow-sm`, `hover:shadow-md`, `rounded-full` saved-view chips).
- Two token namespaces (`--text` vs `--text-primary`).
- Cohort cards on `/customers` with hovering shadow + filter-arrow CTA.
- Donut chart on audit detail.
- Repeated pagination controls.
- No serif typographic accent.
- "Open →" / "View →" / "Generate From Customer" arrow CTAs (slight Tailwind SaaS feel).

### What should change to make it feel like a premium fraud intelligence platform
- Single token namespace, single empty-state primitive, single header primitive, single table primitive.
- Sharper radii, fewer floating cards, more ruled dividers.
- One serif typographic accent — page titles or KPI value display — to pull the editorial brand into the product. Recommended: ship DM Serif Display (already loadable via the same `next/font` setup as DM Sans) at 18-20px on workbench page titles.
- Rust evidence-dot prefix on every overline in the app.
- Brand mark used in onboarding/empty/loading/PDF surfaces — sparingly, never as decoration.
- Calm, ledger-style chart treatments. Replace the donut. Use horizontal evidence-bars + sparklines.
- Mono numerics with `font-feature-settings: "tnum" 1, "ss01" 1` everywhere a number is shown (already a utility, needs to be applied consistently).

---

## 3. Final In-App Design Direction

The app should feel like a **light editorial workbench for fraud investigators**: paper canvas, ink type, rust signature, ruled structure, dense tabular data, minimal decoration. Calm, trustworthy, precise.

**Adopt this short brief and enforce it everywhere:**

- **Premium**: every element is intentional, sized to the data, and visually quiet. Nothing is decorative.
- **Modern**: sharp edges, thin rules, clear hierarchy, generous tabular numerics, current type stack.
- **Enterprise-grade**: dense, scannable, predictable, no surprises across pages.
- **Calm**: one accent color, one signature dot, no gradients, no animation on hover except subtle border/background color changes.
- **Trustworthy**: every number is mono and tabular, every status uses the canonical risk palette, every CTA leads somewhere real, every empty state explains the cause.
- **Technical**: borders and rules over shadows and cards, mono for IDs and scores, overlines for section labels.
- **Serious**: no smiling SaaS copy, no celebratory colors, no purple/teal accents, no "Yay!" empty states.
- **Clean**: one workbench per page, one KPI strip per page, one action bar per page, one main + one optional rail. Never a second container nested decoratively inside the first.
- **Suitable for fraud / risk / compliance**: every row is a case, every column is a fact, every action is a verb.

**Avoid:**
- Generic SaaS dashboard styling (gradient cards, rounded-2xl, drop shadows on hover, "+ Add" CTAs with rounded-full).
- Tailwind template feel (default `shadow-sm`, default `rounded-lg`, default focus rings).
- Childish or random accent colors. Only ink, rust, neutral, plus the four risk tiers.
- Heavy gradients. None on surfaces. Subtle warming gradient on the workbench header is the only allowed exception, and only if it is below the noise floor.
- Glassmorphism. The AppHeader's backdrop blur is the only acceptable use; nowhere else.
- Messy shadows. One drawer shadow, one modal shadow, one workbench-shell hairline shadow. That's all.
- Toy radii (everything ≥ 8px). Cap at 6px in the product UI; 8px only on drawers/modals.
- Hover/scale animation on cards or rows.
- Visual clutter — no "rainbow status" charts, no decorative dividers, no icons-just-for-decoration.

---

## 4. In-App Design System Rules

These are concrete rules a coding agent can implement without judgement calls.

### 4.1 Color palette usage

**Canonical token set — use these names; retire all aliases over time.**

Surfaces (paper):
- `--bg-canvas` — `#F8F5EE` — page background and sidebar (was `linear-gradient`; flatten)
- `--bg-surface` — `#FEFCF7` — workbench shell, panel bodies, table bodies, drawer bodies
- `--bg-surface-alt` — `#F2EDE3` — section header strips, table headers, KPI strip backgrounds, footer strips
- `--bg-surface-sunk` — `#E9E0D1` — progress-bar tracks, sunk surfaces
- `--bg-hover` — `#EFE8DA` — hover state for rows and ghost buttons
- `--bg-selected` — `#F4E6E0` — selected row, selected card, soft rust selected state

Borders (rules):
- `--border-subtle` — `#E5DECE` — row dividers, KPI cell dividers, in-panel inner rules
- `--border-default` — `#D8D0BD` — panel borders, table borders, section dividers
- `--border-strong` — `#8F816F` — emphasis borders for selected groups, focus targets

Text:
- `--text` — `#1A1814` — primary text, titles, KPI values
- `--text-muted` — `#6E7A8A` — secondary text, body labels, section descriptions
- `--text-subtle` — `#9AA5B4` — tertiary text, timestamps, hints
- `--text-disabled` — `#B9C2CF` — disabled controls only
- `--text-inverse` — `#FFFFFF` — on dark/rust surfaces only

Brand accent (rust):
- `--accent` / `--brand-rust` — `#7B2D26` — primary buttons, active tab underline, focus ring, section overline dot, sidebar active rail
- `--accent-hover` / `--brand-rust-hover` — `#5E2018`
- `--accent-soft` / `--brand-rust-soft` — `#F4E6E0` — selected row tint, filter chip fill

Risk tiers (semantic only — never use red/amber/green outside these):
- `--risk-critical` `#9F1D1D`, `--risk-critical-bg` `#FBEFEC`, `--risk-critical-bd` `#E8B5AB`
- `--risk-high` `#B6512A`, `--risk-high-bg` `#FAEFE7`, `--risk-high-bd` `#ECC6AC`
- `--risk-medium` `#8B6A14`, `--risk-medium-bg` `#F7F0DA`, `--risk-medium-bd` `#E5D194`
- `--risk-low` `#2F6B43`, `--risk-low-bg` `#E8F1E6`, `--risk-low-bd` `#B5D2A8`

Informational (steel — non-risk status):
- `--info` `#415A72`, `--info-bg` `#EDF1F4`, `--info-bd` `#BCC8D3`

**Token cleanup**: retire `--text-primary`, `--text-secondary`, `--text-tertiary`, `--bg-subtle`, `--bg-muted`, `--bg-inset`, `--border` (unsuffixed). Replace each usage with the canonical name above. The redundant block in `globals.css:117-178` should be removed in Phase 1 once usage is migrated. Keep the shadcn legacy aliases (`--background`, `--foreground`, `--card`, etc.) untouched — they're consumed by primitives.

**No raw hex in component files.** Every color must come through `var(--…)`. Today's offenders (Phase 1 cleanup): `Badge.tsx` (CHIP_STYLES, SOLID_STYLES), `Tabs.tsx` (lines 39, 45, 61, 62), `RiskScoreBadge.tsx`, `ConfidenceBadge.tsx`, `MetricCard.tsx` (TONE_COLOR), `AuditCharts.tsx` (TIERS palette), `Sidebar.tsx` (`#F6F1E8`, `#7B2D26`), `dashboard/page.tsx`, `customers/page.tsx`, `chargebacks/page.tsx`.

### 4.2 Background layers

A page has at most four surface levels, in this order:
1. **Canvas** (`--bg-canvas`) — everything outside the workbench shell, including sidebar and page padding.
2. **Workbench shell body** (`--bg-surface`) — the bordered surface that contains the page.
3. **Section header / KPI strip / footer strip** (`--bg-surface-alt`) — header rows inside the workbench.
4. **Sunk / tracks** (`--bg-surface-sunk`) — progress-bar backgrounds, deeply sunk inset elements.

Never stack a card inside a card (no `--bg-surface` inside `--bg-surface`). If you need a sub-section inside a panel, use a 1px `--border-subtle` rule, not a nested surface.

### 4.3 Cards / surfaces

There is exactly one card primitive: **`WorkbenchPanel`** for in-page sections, and **`WorkbenchPage`** for the page shell.

Rules:
- `WorkbenchPage` shell: `1px var(--border-default)`, `borderRadius: 4`, body `--bg-surface`, header `--bg-surface-alt`, soft hairline shadow `0 1px 0 rgba(26,24,20,0.04), 0 20px 54px -42px rgba(26,24,20,0.30)`.
- `WorkbenchPanel`: `1px var(--border-default)`, `borderRadius: 4`, header `--bg-surface-alt` with overline title + rust dot.
- No `hover:shadow-*`. No `hover:scale-*`. No `transition-shadow` on cards.
- No `rounded-lg`, `rounded-xl`, `rounded-2xl` anywhere in `app/(app)` or shared in-app components. The only place `rounded-full` is allowed: badges/pills (already correct in `Badge.tsx`) and the small loading spinner.
- Retire `customers/page.tsx` cohort cards as standalone cards; they should live as a row inside the action bar or as a compact strip above the table, not as floating cards with hover shadows.

### 4.4 Borders

- Default border: 1px `--border-default`.
- Inner rules and row dividers: 1px `--border-subtle`.
- Emphasis border (selected group, focus container): 1px `--border-strong`.
- Selected table row: `borderLeft: 2px solid var(--accent)` (already correct in `DataTable.tsx`).
- Sidebar active item: `2px var(--accent)` left rail (already correct).
- Never use `border-dashed` except in the upload dropzone idle state.

### 4.5 Shadows

The product has only four shadow contexts. Anything else, none.
- **Workbench shell**: `0 1px 0 rgba(26,24,20,0.04), 0 20px 54px -42px rgba(26,24,20,0.30)` (already in `WorkbenchPage`).
- **AppHeader** sticky: subtle inner border + backdrop-filter only, no drop shadow.
- **Drawer**: `--shadow-drawer` (already in tokens).
- **Modal / popover / dropdown**: `--shadow-modal` (already in tokens).

Remove all other `boxShadow`, `shadow-sm`, `shadow-md` usage from in-app components. The primary button currently has `boxShadow: '0 1px 0 rgba(94,32,24,0.18)'` — keep that one (it adds depth without elevation).

### 4.6 Typography scale

Apply these classes / sizes everywhere. Retire ad-hoc `style={{ fontSize: 12 }}` usage in favor of the named classes.

- `text-display` — 24/32, 600, `-0.01em` — used only on the dashboard hero numbers if any
- `text-h1` — 20/28, 600, `-0.005em` — `WorkbenchPage` titles
- `text-h2` — 16/24, 600 — section panel titles inside drawers/detail
- `text-h3` — 14/20, 600 — subsection titles
- `text-body` — 14/20, 400 — body text
- `text-body-strong` — 14/20, 500 — emphasized body text
- `text-small` — 13/18, 400 — secondary body, table descriptions
- `text-caption` — 12/16, 500, `0.005em` — metadata, hints
- `text-meta` — 12/16, 500, `0.02em` — timestamps, IDs in non-mono contexts
- `text-overline` — 11/16, 600, `0.12em`, uppercase — KPI labels, section headers, table headers
- `text-mono-sm` — 12/16, 500 mono with `tnum + ss01` — small mono values
- `text-mono-md` — 13/18, 500 mono — table cells with IDs, scores
- `text-mono-lg` — 16/22, 500 mono — KPI values

**Add one editorial serif accent.** Load DM Serif Display (or, if a closer aesthetic match exists, an Inter-companion serif like Source Serif 4) via the existing `next/font` setup. Use it for exactly two contexts in the in-app UI:
1. `WorkbenchPage` `h1` title (replaces `text-heading-lg`/`text-h1` on workbench pages only).
2. The single hero KPI value when present (the "Exposure at risk" leading number on `/dashboard`, the "Reference" number on a generated evidence package detail page).

Do not use the serif anywhere else. Do not use it in tables, sidebars, drawers, badges, or charts. This one serif touch is the entire brand cohesion lever — it must be quiet.

### 4.7 Table styling

`DataTable.tsx` is canonical. Migrate every page-level table to use it. The hand-built table in `chargebacks/page.tsx:110-188` is the most visible offender; convert it. The dashboard rows in `dashboard/page.tsx:338-372` should remain as link rows (they're case rows, not a true table), but they should adopt the same row height (44px), border-subtle dividers, and selected/hover treatment as `DataTable`.

Rules baked into `DataTable`:
- Header row: `--bg-surface-alt`, 34px, 10px overline labels in `--text-tertiary` / `--text-muted` (use `--text-muted`).
- Body row: 36px compact, 40-44px default, 52px relaxed.
- Row hover: `--bg-hover` background.
- Row selected: `--bg-selected` background + 2px `--accent` left border.
- Sort icon: thin chevron, `currentColor` with 0.35 opacity inactive, 1 opacity active.
- Cell padding: 14px horizontal, vertical centered.
- Numerics in cells: `--font-mono`, tabular-nums.
- Sticky header optional via `position: sticky; top: 0`.

Action column: always far-right, 10-12px caption, "Open", "Review", "View", "Download" — no arrow glyphs in the action column, no rust color on the action text (it's already a link row).

### 4.8 Chart styling

Replace the donut + bar combo on the audit detail page with a calmer pattern. Across all charts:
- **Palette**: ink `#1A1814`, rust `#7B2D26`, dark grey `#4A4640`, warm grey `#888078`, plus `--risk-*` for risk-specific series.
- **Strokes**: 1.2-1.5px max, no glow, no gradient fills.
- **Grid**: `--border-subtle`, dashed `3 3`, horizontal only (`vertical={false}`).
- **Axis**: 10px `--text-subtle`, no axis line, no tick line, minimal labels.
- **Tooltip**: paper bg `#FFFFFF`, `1px var(--border-default)`, 6px radius, 12px text, mono values, rust dot prefix in the header.
- **No legend boxes**. Use inline color-square + label rows below or beside the chart.

Preferred chart types (in priority order):
1. Horizontal compact bar (counts and ratios).
2. Sparkline (trend; embed in KPI cells where useful).
3. Stepped or smoothed line for time series with a single end-point label.
4. Stacked horizontal evidence-bar (for "with/without signals", "definite/probable/possible/weak").

Avoid: donuts (replace the current one on audit detail with a horizontal stacked bar + legend), pie charts, gauges, 3D anything, area charts with heavy fills.

### 4.9 Button hierarchy

`Button.tsx` is canonical. Tune it per:
- **Primary**: `var(--accent)` background, `var(--accent-fg-on-500)` text, 1px solid `var(--accent)` border, `boxShadow: 0 1px 0 rgba(94,32,24,0.18)`. Radius 4. Used once or twice per page maximum.
- **Secondary**: `var(--bg-surface)` background, `var(--text)` text, 1px solid `var(--border-default)` border. Radius 4. Hover `--bg-hover`.
- **Ghost**: transparent background, `var(--text-muted)` text. Hover `--bg-hover`. For toolbar / inline tertiary actions.
- **Danger**: `var(--risk-critical)` background, paper text. Only for destructive confirmation actions, never inline.
- **Link**: no padding, no border, `var(--text-muted)`, underline on hover. Reserved for inline "View all", "Clear", "Cancel".

Sizes: sm 28px, md 32px, lg 36px. Cap at lg — no XL buttons in the product.

Hierarchy rule: max one primary button per page. Two if the page genuinely has two equal-weight terminal actions (`Generate from Customer` + `Export queue` for example) — and then they should sit in a single button group.

### 4.10 Badge / status styling

`Badge.tsx` is canonical for status pills. `ConfidenceBadge.tsx` and `RiskScoreBadge.tsx` should both delegate to `Badge` (they currently partially do). Consolidate so they only carry the grade→tone mapping and pass it to `Badge`.

Rules baked in:
- Radius 3px (already correct).
- Font size 10px, weight 700, letter-spacing 0.06em, uppercase.
- Height 16 (sm), 18 (md).
- Padding 5-7px horizontal.
- Tones: `neutral`, `info`, `accent`, `success`, `warning`, `danger`, `critical`. All seven backed by tokens.
- Variant: `subtle` (default), `solid`, `outline`. No new variants.
- Optional `dot` prop for a leading 6px filled circle (already supported).

**Refactor**: pull `CHIP_STYLES` and `SOLID_STYLES` in `Badge.tsx` from hard-coded hex to `var(--…)` references. Add a token alias per tone if needed (e.g., `--badge-accent-bg: var(--accent-soft)`).

### 4.11 Spacing rhythm

Standardize on the 4-pixel scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80.

Page-level:
- Page padding: `p-4 md:p-6` (16px mobile, 24px desktop). `WorkbenchPage` already enforces this; remove the redundant `p-4 md:p-6` wrappers that some pages still add inside the main body.
- Gap between standalone panels (when not sharing a border inside a workbench): 16px.
- Workbench internal gaps: zero — sections share borders.
- KPI strip cell padding: 16px (`px-4 py-3`).
- Section header padding: `px-4 py-2`.
- Table cell padding: `px-3.5 py-0` (14px horizontal, vertical centered to row height).
- Form field row gap: 16px.
- Form field internal label-to-input gap: 6px.
- Action bar internal gap: 8-12px depending on density.

### 4.12 Icon usage

- Lucide React, stroke width 1.5 (default is 2 — override globally in a wrapper or per-component).
- Sizes: 14px in dense table rows and sidebar, 16px in buttons and section headers, 20px in empty states, 28px maximum in onboarding-style flows.
- Color: `var(--icon-muted)` default, `var(--icon)` (`--text`) on hover. Active sidebar item: `var(--icon)`.
- Never use icons decoratively. Every icon is paired with a label or sits inside a clickable target.
- One canonical icon per action across the app:
  - Upload / new audit → `Upload` or `PlusSquare` (Sidebar uses `PlusSquare`; standardize)
  - Download → `Download`
  - Filter → `SlidersHorizontal`
  - Search → `Search` (or the inline magnifier SVG already in AppHeader)
  - Save → `Bookmark`
  - Export → `ArrowDownToLine` or `Download`
  - Open in drawer → no icon (text only)
  - Close → `X`
  - More menu → `MoreHorizontal`

### 4.13 Page headers

Inside the workbench, the page header is always rendered by `WorkbenchPage`:
- Optional local nav row at top (`WorkbenchNav`).
- Title `text-h1` in the new serif accent (see 4.6).
- Optional subtitle `text-body-sm` in `--text-muted`, max-width 720px.
- Optional right-side actions cluster (primary + secondary).
- Optional KPI strip directly below.
- Optional action bar directly below the KPI strip.

Outside the workbench, use `PageHeader.tsx` for non-workbench pages (settings, help articles). Reconcile `PageHeader` to share the same title styling and rust-dot eyebrow.

Retire bespoke per-page headers. The `dashboard/page.tsx` inline nav should migrate to `WorkbenchNav`.

### 4.14 Sidebar / navigation states

- Flatten the gradient. `linear-gradient(180deg, var(--bg-canvas) 0%, #F6F1E8 100%)` → `var(--bg-canvas)`.
- Keep the 2px rust left rail on active items.
- Active item: `--bg-surface-alt` background, `--text` text, semibold.
- Default item: `--text-muted`, hover `--bg-hover`.
- Group label: 10px uppercase, `--text-subtle`, rust dot prefix (already correct).
- Sidebar logo row: 56px height, wordmark only, no merchant name there (move merchant name to AppHeader env chip — already done).
- Footer: paper bg, top 1px `--border-default`, Help + Settings + Sign out, plus the legal links row. Already correct.
- Collapsed width 56px, expanded width 240px. Collapse toggle remains as is.
- Mobile drawer behavior unchanged.

### 4.15 Forms and filters

Define a **Field** component (new) that combines:
- Label above input — `text-caption` weight 500 `--text-muted`.
- Input / Select / TextArea — uses canonical `Input` / `Select` primitives.
- Optional leading icon (`14px`, `--icon-muted`, absolute positioned).
- Helper text below — `text-caption` `--text-subtle`.
- Error state — input border `--risk-critical-bd`, helper text `--risk-critical-fg`.
- Required marker — rust asterisk after the label.

Inputs themselves:
- Height 32px (sm 28px for table filters, lg 36px for forms).
- Radius 6px (slightly softer than panels — looks intentional, not toy).
- Border 1px `--border-default`, focus 1px `--accent` + 3px focus ring `--shadow-focus`.
- Background `--bg-surface`.
- Placeholder `--text-subtle`.
- Disabled `--text-disabled` + `--bg-surface-sunk`.

Filter bar (`WorkbenchActionBar`):
- Left: search + filter sheet trigger.
- Middle: saved views or chip row (optional).
- Right: page size, export, primary action.
- Active filter chips: rust outline `1px var(--accent)`, `--accent-soft` fill, `--accent` text, 12px height, 3px radius. Already mostly correct in `customers/page.tsx`; extract into a `FilterChip` shared component.
- Saved-view pills: same shape as filter chips but `--border-default` outline, `transparent` fill, `--text-muted` text. Retire `rounded-full`.

### 4.16 Empty / loading / error states

**One empty-state primitive**: `WorkbenchEmptyState`. Migrate all in-app usages to it. Retire `components/ui/EmptyState.tsx` from `app/(app)` (keep it for onboarding/first-run flows if needed, but stop importing it elsewhere).

`WorkbenchEmptyState` rules:
- Lives inside a panel or workbench body.
- 32-48px vertical padding, 16-24px horizontal.
- Title with leading 6px rust dot, `text-body-md` weight 600.
- Description `text-caption` `--text-muted`, max 360px.
- Single action — link or button, never two.
- Optional rule line above if it sits inside a long body.

**Loading**:
- Skeleton rows in tables — `DataTable` handles it; pages need to pass `loading` prop.
- Skeleton blocks for KPI strips — render `<div className="skeleton" style={{height: 18, width: 80}} />` in the value slot during loading.
- Skeleton blocks for charts — fixed-height container with shimmer.
- Avoid full-page spinners. The shell renders, and individual sections show skeletons.

**Errors**:
- Inline error inside the panel that failed. Use the data-fetch failure language already established: "Unavailable" for KPI values, "Could not load — try again" with retry link inside panel.
- Never show a blocking error page when one section fails.
- Critical full-page errors use a centered ErrorBoundary card with `text-h2` title, brief description, single "Reload" action.

---

## 5. Page-by-Page / Component-by-Component Recommendations

For each item: **Currently weak / Preserve / Change / Why / Priority**.

### 5.1 Global tokens (`app/globals.css`)
- **Currently weak**: two token namespaces (spec + legacy), duplicated `--bg-surface` / `--border-subtle` definitions, mixed naming across components.
- **Preserve**: spec tokens (`--bg-canvas`, `--bg-surface`, `--bg-surface-alt`, `--bg-surface-sunk`, `--bg-hover`, `--bg-selected`, `--border-subtle`, `--border-default`, `--border-strong`, `--text` family, `--brand-*`, `--accent-*`, `--risk-*`, `--shadow-*`, `--space-*`, `--radius-*`, `--font-*`, `--ease-*`, `--duration-*`, type scale, `.skeleton`, `.hover-*` utilities, scrollbar styling).
- **Change**: remove the duplicated legacy block at lines 117-178 once components are migrated. Keep shadcn aliases at the bottom. Eliminate `--text-primary`, `--text-secondary`, `--text-tertiary`, `--bg-subtle`, `--bg-muted`, `--bg-inset`, `--border` (unsuffixed). Add `--font-serif` next to `--font-sans` and `--font-mono`.
- **Why**: a single name per concept is the foundation. Today's drift across components flows directly from token duplication.
- **Priority**: **High**.

### 5.2 App shell (`app/(app)/layout.tsx`)
- **Currently weak**: layout passes `merchantName` and `userEmail` correctly; no visual change needed at the layout level.
- **Preserve**: full-height flex shell, sticky header, scrollable main, demo banner slot.
- **Change**: nothing in the layout file itself, but ensure pages no longer add an outer `p-4 md:p-6` since `WorkbenchPage` already does so. Audit each page; delete redundant outer padding.
- **Why**: removes the "card-on-card" rhythm.
- **Priority**: **Medium**.

### 5.3 Sidebar (`components/nav/Sidebar.tsx`)
- **Currently weak**: vertical gradient on the sidebar surface (`linear-gradient(180deg, var(--bg-canvas) 0%, #F6F1E8 100%)`), hard-coded `#7B2D26` on the active rail, slight inconsistency in icon stroke width.
- **Preserve**: 240px expanded / 56px collapsed widths, hover-to-expand behavior, active rail concept, group labels with rust dot, footer block with Help/Settings/Sign out + legal links.
- **Change**: flatten the gradient to `var(--bg-canvas)`. Replace `background: '#7B2D26'` on the active rail with `var(--accent)`. Standardize all icon strokes to 1.5. Replace the `border-r border-[var(--border-default)]` with `borderRight: '1px solid var(--border-default)'` inline to be consistent. Add a 1px `var(--border-subtle)` rule between the nav block and the footer block.
- **Why**: a flat sidebar reads as more deliberate; the gradient is below the "intentional" threshold and reads as accidental.
- **Priority**: **Medium**.

### 5.4 AppHeader (`components/layout/AppHeader.tsx`)
- **Currently weak**: minor — the search trigger could use the same 6px radius as form inputs to align with the new field system; breadcrumb mixes `text-caption` and inline `fontSize: 11` / `12px`.
- **Preserve**: 56px sticky, `backdrop-filter: blur(8px) saturate(130%)`, `rgba(248, 245, 238, 0.92)` background, breadcrumb with rust dot on the active segment, MerchantEnvChip, ⌘K search, AvatarMenu, CommandPalette.
- **Change**: pull breadcrumb font sizes to canonical (`text-caption` for non-last, `text-overline` for the active page) and remove the inline `fontSize` overrides. Standardize the search trigger to 28px height, 6px radius, `--bg-surface` background. Replace the inline magnifier SVG with the Lucide `Search` icon at 14px for consistency.
- **Why**: small consistency wins in a high-visibility area.
- **Priority**: **Medium**.

### 5.5 Dashboard (`app/(app)/dashboard/page.tsx`)
- **Currently weak**: the local nav is inlined (hand-coded loop over `WORKBENCH_NAV`) instead of using `WorkbenchNav`; the cases queue is a grid of link rows instead of a `DataTable`; the right rail's "Trend" progress bar at the bottom is the only chart-like element on the page and looks orphaned; the bottom footer has a `k >= 3 gate · HMAC-SHA256 · 0 PII fields stored` strip — keep that, but make it consistent with the workbench footer pattern.
- **Preserve**: single workbench shell holding everything, 5-cell KPI strip with mono values, dense queue rows with confidence badge + match status, right rail with three stacked sections (cluster exposure, top signals, activity).
- **Change**:
  - Replace inline nav with `<WorkbenchNav items={WORKBENCH_NAV} activeKey="overview" />`.
  - Convert the cases queue rows to use the same 44px row height, `--border-subtle` dividers, and hover/selected treatment as `DataTable` — implement as link rows but adopt the shared visual rules.
  - Add a sparkline microchart to the "Avg match rate" KPI cell (use existing `SparklineChip`).
  - Move the bottom "Trend" strip into the right rail as a proper labeled section instead of an unlabeled progress bar.
  - Apply the new serif accent to the dashboard page title (if you keep a title — currently `WORKBENCH_NAV` replaces it; if so, add a small `text-overline` "WORKBENCH" eyebrow + serif "Overview" h1 to the header strip).
  - Remove all inline `style={{ background: 'var(--bg-surface-alt)' }}` repeats that already exist in `WorkbenchPanel`.
- **Why**: visual consistency across pages, clearer hierarchy, the serif touch lands first on the most-viewed page.
- **Priority**: **High**.

### 5.6 Inbox / Cases (`app/(app)/inbox/page.tsx`, `components/inbox/InboxClient.tsx`)
- **Currently weak**: the empty state copy is fine, but `InboxClient` needs to be checked — confirm rows match the same `DataTable` density and selection rules.
- **Preserve**: 5-cell KPI strip (Open / Value at risk / Definite / Probable / Total), nav + action cluster on the right, export queue link, page-size selector.
- **Change**: ensure `InboxClient` uses `DataTable` with `density="default"` (44px rows). Standardize row click target so the whole row routes to `/customers/[id]` when a profile id is present, else `/audit/[runId]/transaction/[id]`. Add a far-right "Open" link column.
- **Why**: row consistency across cases / clusters / audit transactions.
- **Priority**: **High**.

### 5.7 Customers / Clusters (`app/(app)/customers/page.tsx`, `components/customers/CustomersTableClient.tsx`, `components/customers/CustomerIntelligenceDrawer.tsx`)
- **Currently weak**: cohort cards (lines 326-350) are floating cards with hover-shadow; saved-view pills are `rounded-full`; filter chips are defined inline; drawer chip styles are JS object constants with hard-coded values.
- **Preserve**: server-side filtering, full filter sheet, paged table, drawer-driven detail with "View full profile" route.
- **Change**:
  - **Remove cohort cards as cards.** Convert them into a compact strip of segmented filter chips that sit inside `WorkbenchActionBar` middle slot. Same data, no hovering cards.
  - Replace saved-view `rounded-full` pills with the standard `FilterChip` shape (3px radius, 12px height, `--border-default` outline by default, rust outline when active).
  - Extract `FilterChip` into `components/ui/FilterChip.tsx` and reuse on `/customers`, `/inbox`, `/history`, `/watchlist`.
  - Move drawer CHIP constants to `var(--…)` tokens; align with `Badge` so the drawer reuses `Badge` directly.
  - Apply serif accent to the page title "Clusters."
- **Why**: removes the strongest "SaaS marketing" visual hold-over on the page; consolidates filter primitives across pages.
- **Priority**: **High**.

### 5.8 Audit detail (`app/(app)/audit/[runId]/page.tsx`, `components/audit/AuditCharts.tsx`, `components/audit/CustomerProfileCard.tsx`, `components/audit/RiskDistributionStrip.tsx`)
- **Currently weak**: hard-coded `#1A1814` action button colors; repeated pagination (top/middle/bottom); donut chart reads as generic; risk distribution strip and donut overlap conceptually.
- **Preserve**: dense distribution strip, transactions tab + customers tab pattern, audit metadata header.
- **Change**:
  - Wrap the page in `WorkbenchPage` with local nav (`Overview`, `Customers`, `Transactions`, `Data quality`).
  - Replace the action buttons' hard-coded `#1A1814` with `var(--brand-ink)`.
  - Collapse the donut into a horizontal stacked evidence-bar (definite / probable / possible / weak) with inline color squares and counts. Retire the pie.
  - Keep the horizontal bar chart in `AuditCharts.tsx` but apply the new chart rules (1.5px stroke, dashed grid, mono tooltip, no axis lines).
  - Eliminate the second and third pagination control sets; one canonical pagination at the bottom of the table.
  - Consolidate "tier chip" hex constants in `CustomerProfileCard.tsx` into a single `riskTone()` helper that returns a `Badge` tone; render via `Badge`.
- **Why**: the audit detail page is the most visible "still feels dated" page; consolidating it closes the largest cohesion gap.
- **Priority**: **High**.

### 5.9 Evidence packages / Reports (`app/(app)/chargebacks/page.tsx`, `app/(app)/chargebacks/[id]/page.tsx`, evidence components)
- **Currently weak**: hand-built table in `chargebacks/page.tsx:110-188`; the "Eligible ✓" status uses bare green text + checkmark; download/view actions are mixed link styles.
- **Preserve**: KPI strip, "Generate from Customer" CTA, package detail with summary + evidence + narrative + transactions + download.
- **Change**:
  - Convert the inline table to `DataTable` with columns: Reference (mono), Customer (masked), Generated (mono date), CE3 (Badge tone=success), Cross-merchant (Badge tone=info), Actions (Download / View).
  - Replace "Eligible ✓" green text with a `Badge tone="success" size="sm"` reading "CE3.0".
  - Standardize action column to "Download" (`Download` icon + label) and "Open" (no icon, rust-on-hover).
  - The evidence package detail page should use `WorkbenchPanel` for each section (Summary, Evidence strength, Narrative, Transactions, Download). Apply the serif accent to the "Reference" number at the top.
- **Why**: aligns the highest-stakes deliverable surface (PDFs go to acquirers) with the brand.
- **Priority**: **High**.

### 5.10 Upload (`app/(app)/upload/page.tsx`, `components/upload/UploadClient.tsx`)
- **Currently weak**: dropzone takes a lot of vertical real estate; stage headers can be sharper.
- **Preserve**: stage flow (Upload → Map → Context → Process), processing progress, duplicate warning, column mapping helper.
- **Change**:
  - Use stage headers in `01 Upload`, `02 Map`, `03 Context`, `04 Process` format (already specified in the prior design doc) with the rust dot prefix and `text-overline` styling.
  - Reduce the dropzone footprint: cap height at 160px and add a right-hand "Data guide" rail.
  - Standardize the active step indicator: 2px rust border on the active step, `--border-default` on others.
- **Why**: brings the upload flow into the same workbench rhythm.
- **Priority**: **Medium**.

### 5.11 Audit history (`app/(app)/history/page.tsx`)
- **Currently weak**: minor — the table sorts and densities should match the new `DataTable` defaults.
- **Preserve**: KPI strip (Audits / Rows / Matched / Last / Failed), table of runs with row → `/audit/[runId]`.
- **Change**: ensure `DataTable` is used directly with `density="default"`. Apply serif title.
- **Priority**: **Low**.

### 5.12 Watchlist (`app/(app)/watchlist/page.tsx`, `components/watchlist/WatchlistTableClient.tsx`)
- **Currently weak**: the custom `--watchlist-*` color tokens add a third color family. The "Appeared in recent audits" section sits beside the main watchlist table as a separate sub-panel.
- **Preserve**: search + remove inline action, KPI strip, paged table.
- **Change**: collapse `--watchlist-*` into the existing `--info` family (steel) for the badge color, since the watchlist is informational, not a risk tier. Use `Badge tone="info"` for the watchlist marker. Move "Appeared in recent audits" into a right rail instead of a parallel sub-panel.
- **Why**: removes a third color family — every status pill should reduce to risk-tier, info, neutral, or accent.
- **Priority**: **Medium**.

### 5.13 Saved views (`app/(app)/saved/page.tsx`)
- **Currently weak**: nothing significant; it's a placeholder.
- **Preserve**: workbench layout, empty state.
- **Change**: ensure the empty state uses `WorkbenchEmptyState`.
- **Priority**: **Low**.

### 5.14 Help (`app/(app)/help/page.tsx` and sub-pages)
- **Currently weak**: article cards are inline JSX; no shared component; cards have slight `rounded-lg` drift.
- **Preserve**: top-level workbench with article list.
- **Change**: extract a `HelpArticleRow` component that renders as a ruled link row (no card), with icon + title + one-line description + "Read →" link, 56px height, `--border-subtle` divider between rows. Match the dashboard's case row pattern.
- **Why**: pulls help into the same ledger/row vocabulary.
- **Priority**: **Low**.

### 5.15 Settings (`app/(app)/settings/account/page.tsx`, `settings/team/page.tsx`, `settings/audit-trail/page.tsx`)
- **Currently weak**: hand-rolled forms inside `SectionCard`; danger zone uses raw `rgba(159,29,29,0.30)` border; no shared field component.
- **Preserve**: section structure (Profile / Notifications-Password / Account / Danger), inline save status, redirect to login on sign-out.
- **Change**:
  - Wrap each settings page in `WorkbenchPage` with local nav: Account / Team / Audit trail.
  - Convert each `SectionCard` to `WorkbenchPanel`.
  - Introduce the new `Field` component (see 4.15) for all form inputs.
  - Danger zone: `WorkbenchPanel` with `--risk-critical-bd` border and a "DANGER" overline; replace the hard-coded rgba border with `var(--risk-critical-bd)`.
  - Rename the misleading "Notifications" section.
- **Why**: settings is currently the weakest sub-system visually and the strongest signal of "still a starter SaaS template."
- **Priority**: **Medium**.

### 5.16 Drawers (`components/ui/Drawer.tsx`, `components/customers/CustomerIntelligenceDrawer.tsx`, evidence detail drawers)
- **Currently weak**: drawer chip / status styling is hand-rolled per drawer; drawer headers don't all use the same title style.
- **Preserve**: 560px default width, focus trap, ESC to close, sticky header + footer, body scroll.
- **Change**:
  - Drawer header: paper bg, 56px height, 1px `--border-default` bottom, `text-h2` title in serif (small serif touch on detail surfaces).
  - Body padding: 20px.
  - Footer: paper bg, top 1px `--border-default`, padding 12-16px, action cluster right-aligned.
  - Inside `CustomerIntelligenceDrawer`, replace inline CHIP constants with `Badge` directly.
- **Priority**: **Medium**.

### 5.17 Shared primitives — Buttons, Badges, Inputs, Tabs, MetricCard, RiskScoreBadge, ConfidenceBadge
- **Currently weak**: hard-coded hex values; multiple parallel grade-to-tone mappings.
- **Preserve**: API surface — variant / tone / size props; everywhere they're imported.
- **Change**:
  - `Badge.tsx`: move `CHIP_STYLES` and `SOLID_STYLES` to `var(--…)` references. Add per-tone tokens if needed.
  - `Tabs.tsx`: replace `#7B2D26` and `#FBEFEC` with `var(--accent)` and `var(--accent-soft)`.
  - `RiskScoreBadge.tsx`: delegate fully to `Badge` and `ConfidenceBadge`; remove the parallel `LEVEL_STYLES` hex map.
  - `ConfidenceBadge.tsx`: keep the `GRADE_TONE` map but ensure it returns `Badge` tones (`success`, `info`, `warning`, `danger`, `critical`) directly.
  - `MetricCard.tsx`: move `TONE_COLOR` to tokens (`var(--risk-low-fg)`, `var(--risk-critical-fg)`, `var(--text-muted)`). Use the canonical 4px radius and `--border-default`.
  - `Input.tsx` / `Select.tsx`: bump radius to 6, add focus ring `--shadow-focus`, ensure padding is 8-10px vertical at the default height.
- **Priority**: **High** (these primitives propagate everywhere).

### 5.18 Charts (`components/audit/AuditCharts.tsx`, `components/audit/RiskDistributionStrip.tsx`, `components/internal/NetworkMetricsCharts.tsx`)
- **Currently weak**: donut chart, generic tooltip, axis defaults.
- **Preserve**: data sources and computed series.
- **Change**:
  - Replace the donut with a horizontal stacked evidence-bar.
  - Apply the chart rules from 4.8 universally (palette, strokes, grid, axes, tooltips).
  - Inline color-square legend instead of recharts' default `<Legend>`.
  - Add a rust dot to the tooltip header line.
- **Priority**: **Medium**.

### 5.19 Loading and skeletons (`components/ui/LoadingState.tsx`)
- **Currently weak**: not wired up consistently across pages.
- **Preserve**: `.skeleton` shimmer class in globals, `LoadingState` component.
- **Change**: wire `loading` prop through every `DataTable` consumer; render skeleton blocks in KPI strip values during initial server-component pending state where applicable.
- **Priority**: **Low**.

---

## 6. Implementation Sequence

Each phase has a clear "touch list," a "design changes" list, "verify" gate, and a "do not change in this phase" guard.

### Phase 1 — Global tokens and layout foundations

**Files**: `app/globals.css`, `tailwind.config.ts` (if present), `next/font` setup files, `app/(app)/layout.tsx`.

**Changes**:
- Reconcile token namespace. Retire `--text-primary`, `--text-secondary`, `--text-tertiary`, `--bg-subtle`, `--bg-muted`, `--bg-inset`, `--border`. Keep the spec block at the top of `globals.css`. Remove the duplicated legacy block at lines 117-178 only after a codebase-wide grep confirms no consumer still uses the legacy names.
- Add `--font-serif` to the token block. Load DM Serif Display (or chosen serif) via `next/font/google` alongside the existing DM Sans / DM Mono setup. Expose as `--font-dm-serif` and `--font-serif` for compatibility.
- Confirm `--accent` is `var(--brand-rust)` (#7B2D26) and `--accent-hover` is `var(--brand-rust-hover)` (#5E2018).
- Confirm `--shadow-focus` is `0 0 0 3px rgba(123,45,38,0.24)`.
- Flatten `Sidebar` background to `var(--bg-canvas)`.

**Verify**:
- `npm run build` passes.
- Visual smoke test: dashboard, customers, inbox, audit detail, chargebacks render without color regressions.
- Grep for `--text-primary` and `--bg-subtle` in `app/(app)` and shared component dirs — should return 0 hits.

**Do not change in this phase**: per-page layouts, charts, or table cell content.

### Phase 2 — Navigation, page shells, headers, background surfaces

**Files**: `components/nav/Sidebar.tsx`, `components/layout/AppHeader.tsx`, `components/workbench/WorkbenchPage.tsx`, `components/workbench/WorkbenchNav.tsx`, `components/ui/PageHeader.tsx`.

**Changes**:
- Flatten sidebar gradient, replace hard-coded rust with `var(--accent)`, normalize icon stroke widths to 1.5.
- `WorkbenchPage`: change `borderRadius: 5` → 4 to align with the scale.
- Add serif typeface to `WorkbenchPage` `h1` title only.
- `AppHeader`: pull breadcrumb font sizes to canonical classes; switch search trigger to 28px / 6px / `--bg-surface`; swap inline magnifier for Lucide `Search` at 14px.
- `PageHeader.tsx`: align with `WorkbenchPage` header style; serif title (where used outside workbench).
- Reconcile dashboard's inline local nav to use `WorkbenchNav`.

**Verify**:
- Sidebar reads flat and confident, no gradient seam.
- AppHeader breadcrumb reads consistently across all pages.
- Every workbench page renders the serif title.
- No regression in the command palette or avatar menu.

**Do not change in this phase**: tables, forms, charts, or filter chips.

### Phase 3 — Cards, tables, forms, filters

**Files**: `components/ui/DataTable.tsx`, `components/ui/Input.tsx`, `components/ui/Select.tsx`, new `components/ui/Field.tsx`, new `components/ui/FilterChip.tsx`, `components/workbench/WorkbenchActionBar.tsx`, `app/(app)/chargebacks/page.tsx`, `app/(app)/customers/page.tsx`, `app/(app)/settings/account/page.tsx`, `app/(app)/settings/team/page.tsx`, `app/(app)/settings/audit-trail/page.tsx`.

**Changes**:
- Confirm `DataTable` row heights, headers, hover/selected styles match §4.7.
- Migrate `chargebacks/page.tsx` table from hand-built to `DataTable`.
- Extract `FilterChip` shared component; use on customers, inbox, history, watchlist.
- Convert customers cohort cards into a chip strip inside `WorkbenchActionBar`.
- Add `Field` component; migrate settings forms to use it.
- `Input` / `Select`: 6px radius, `--shadow-focus` on focus, 8-10px vertical padding at default size.
- Standardize spacing: remove redundant `p-4 md:p-6` wrappers inside `WorkbenchPage` children.

**Verify**:
- Every table on every page uses `DataTable` and reads with the same density.
- Customer page no longer has hovering cohort cards.
- Settings forms render with consistent label / input / helper spacing.
- Filter chips look identical on customers, inbox, history.

**Do not change in this phase**: charts, badges, or the audit detail page (those land in Phase 4).

### Phase 4 — Charts, badges, states, detail views

**Files**: `components/ui/Badge.tsx`, `components/ui/ConfidenceBadge.tsx`, `components/ui/RiskScoreBadge.tsx`, `components/ui/MetricCard.tsx`, `components/ui/Tabs.tsx`, `components/audit/AuditCharts.tsx`, `components/audit/RiskDistributionStrip.tsx`, `components/audit/CustomerProfileCard.tsx`, `app/(app)/audit/[runId]/page.tsx`, `components/customers/CustomerIntelligenceDrawer.tsx`, `components/evidence/*`, `app/(app)/chargebacks/[id]/page.tsx`.

**Changes**:
- Move all `CHIP_STYLES`, `SOLID_STYLES`, `LEVEL_STYLES`, `TONE_COLOR` from hex maps to `var(--…)` references.
- `RiskScoreBadge`, `ConfidenceBadge` delegate to `Badge` for visual rendering; they only carry the grade-to-tone mapping.
- `Tabs`: replace hex with `var(--accent)` / `var(--accent-soft)`.
- `AuditCharts`: replace pie with horizontal stacked evidence-bar; apply chart rules (1.5px stroke, dashed grid, mono tooltip, no axis lines, rust-dot tooltip header).
- `audit/[runId]/page.tsx`: wrap in `WorkbenchPage` with local nav, collapse multiple pagination clusters into one, replace `#1A1814` with `var(--brand-ink)`.
- `CustomerProfileCard`: consolidate tier chip styles into a single `riskTone()` helper → `Badge`.
- Evidence package detail: wrap each section in `WorkbenchPanel`, apply serif accent to reference number.
- Drawer headers: serif title, paper bg, 56px header, 20px body padding, 12-16px footer padding.

**Verify**:
- No hex literals in shared primitives.
- Audit detail page reads at the same density and rhythm as `/dashboard` and `/customers`.
- Charts feel calm and editorial — no donut, no axis lines, no default recharts legend.
- Drawer detail surfaces share one header pattern.

**Do not change in this phase**: any landing page asset, any onboarding visual, any login/signup page.

### Phase 5 — Final polish and visual QA

**Files**: any leftover route under `app/(app)`, plus `components/ui/EmptyState.tsx` migration, accessibility passes.

**Changes**:
- Confirm `WorkbenchEmptyState` is the only empty state in use across `app/(app)`.
- Confirm every numeric value in tables, KPIs, drawers, and detail pages has `font-feature-settings: "tnum" 1` (via `.num` utility or the mono classes).
- Confirm focus rings are visible and consistent (3px rust focus ring on all interactive elements).
- Run axe / Lighthouse a11y; address contrast issues if any text falls below WCAG AA on paper canvas.
- Run a full visual pass: dashboard, inbox, customers + drawer + detail, audit detail, history, upload, chargebacks list + detail, evidence creation, watchlist, saved, settings (account / team / audit-trail), help (index + each article), 404 / error states.

**Verify**:
- All eight acceptance criteria below are satisfied.
- A screenshot of any in-app page placed next to the landing artifact's `MerchantDashboard.tsx` reads as the same product system.

**Do not change in this phase**: introduce new features, refactor data fetching, add new dependencies, or touch any page outside `app/(app)`.

---

## 7. Acceptance Criteria

Each criterion must be visually verifiable by a reviewer comparing screenshots before and after.

1. **Premium feel**: every page reads as deliberate. No accidental shadows, no `rounded-lg` cards, no hover-scale, no gradient surfaces, no default Tailwind chrome.
2. **Modern feel**: typography is sharp (DM Sans body + DM Mono numerics + a single serif accent on page titles). Spacing is rhythmic on the 4px scale. Borders and rules carry hierarchy where shadows would in a generic dashboard.
3. **Enterprise-grade**: density is consistent. KPI strips are compact. Tables use the same row heights and dividers everywhere. Action bars use the same primitives across pages.
4. **Brand cohesion**: rust appears only as the brand accent, on primary actions, focus rings, the sidebar active rail, the breadcrumb dot, the section overline dot, the active tab underline, the filter-chip outline, the workbench-panel accent. The brand wordmark renders crisply in the sidebar. A serif accent on workbench titles signals the editorial brand voice in the product without bleeding into chrome.
5. **Calm and trustworthy**: no animation outside `--duration-fast` color/background transitions, the AppHeader backdrop blur, the workbench shell hairline shadow, and the drawer/modal slide-in.
6. **Tables and charts credible**: every table is `DataTable` or follows its visual rules; every chart uses the calm chart palette + 1.5px strokes + dashed `--border-subtle` grid + paper tooltip + rust-dot tooltip header. The audit detail page no longer has a donut.
7. **Hierarchy is clear**: every page has one workbench title (serif h1), one optional KPI strip below, one optional action bar below that, one main body, one optional right rail, one optional footer. Sections inside the workbench use `WorkbenchPanel` with overline + rust dot.
8. **Density feels intentional**: page padding is `p-4 md:p-6`, KPI cells are 16px, table rows are 36-44px, panel header strips are 32-36px tall, action bars are 44-48px tall.
9. **Usable and not overdesigned**: nothing decorative survives the audit. Every visual element either communicates state, communicates hierarchy, or carries a brand signal.
10. **Functionality preserved**: every existing route, every existing data flow, every permission/RLS guard, every export/download endpoint, every analytics event continues to work. No new dependencies that change product behavior.
11. **Token discipline**: a grep for `#[0-9A-F]{6}` (case-insensitive) in `components/` and `app/(app)/` returns only the canonical token definitions in `globals.css`, the logo SVGs, and any explicitly-justified exception (with a short comment explaining why). All other hex usage is replaced by `var(--…)`.
12. **One primitive per concept**: one empty-state, one page header (inside workbench → `WorkbenchPage`; outside → `PageHeader`), one filter chip, one table, one button family, one badge family, one input family.

---

## 8. Instructions for the Coding Agent

Hand this block directly to the implementation model.

```
You are implementing the in-app UI improvement plan in
`docs/internal/design/IN_APP_PREMIUM_UI_IMPLEMENTATION.md`.

Constraints:
- Scope is the authenticated product UI under `app/(app)` and shared
  components in `components/ui`, `components/nav`, `components/layout`,
  `components/workbench`, `components/audit`, `components/customers`,
  `components/inbox`, `components/evidence`, `components/upload`,
  `components/watchlist`, `components/settings`.
- Do not touch any landing-page asset under `app/(public)/landing`,
  any marketing page, hero, signup, login, reset, public audit, or
  legal pages.
- Do not change product logic, data fetching, permissions, RLS
  behavior, fraud scoring, evidence narrative generation, exports,
  or analytics. Preserve every existing route and every existing
  function signature.
- Do not introduce new paid libraries. The only new dependency
  permitted is a serif typeface (DM Serif Display or Source Serif 4)
  loaded via the existing `next/font/google` setup.
- Do not perform broad rewrites. This is a calm, surgical refinement.
  Touch the smallest number of lines that achieves each change.
- Do not change copy unless directly required for visual clarity
  (e.g., misleading section titles in settings).
- Prefer extending existing primitives and shared components over
  introducing new ones. The only new components to add are
  `components/ui/Field.tsx` and `components/ui/FilterChip.tsx`.

Sequence:
1. Phase 1 — global tokens and layout foundations.
2. Phase 2 — navigation, page shells, headers, background surfaces.
3. Phase 3 — cards, tables, forms, filters.
4. Phase 4 — charts, badges, states, detail views.
5. Phase 5 — final polish and visual QA.

Each phase has a "touch list," a "changes" list, a "verify" gate,
and a "do not change" guard. Follow them in order. Do not start a
later phase before the verify gate of the prior phase passes.

After each phase:
- Run `npm run build` and any relevant unit tests.
- Visually verify the dashboard, customers (list + drawer + detail),
  inbox, audit detail, chargebacks (list + detail), upload, history,
  watchlist, and settings (account / team / audit-trail). For UI
  changes you must start the dev server and use a browser-based
  verification — type checks alone are not sufficient.
- Summarize the files you edited in that phase. Keep the summary
  under 200 words.

Acceptance criteria are listed in §7 of the plan. Do not declare a
phase complete until every applicable criterion is met.

If you encounter a conflict between this plan and an existing design
doc under `docs/internal/design/`, this plan takes precedence for
in-app UI work. If the conflict touches product logic or data flow,
stop and ask the human.

Begin with Phase 1.
```

---

### Notes for the human (not for the coding agent)

- This plan deliberately keeps the workbench architecture Codex established. The path to "premium" runs through token rigor, primitive consolidation, and one editorial serif accent — not through a redesign.
- The single highest-leverage move is **token discipline**: a grep-clean `#hex`-free `app/(app)` tree. It removes 80% of the residual "dated SaaS" feel by itself.
- The second-highest-leverage move is **the audit detail page** — it's the most-screenshotted page in the product and currently the visible outlier.
- The third is **the serif accent on `WorkbenchPage` titles** — one quiet typographic move that pulls the brand voice into the product. Do not let the coding agent expand the serif beyond workbench page titles and evidence-package reference numbers.
- If any single phase blows the budget, it will be Phase 4 (charts + audit detail). Budget accordingly.
