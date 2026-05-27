# Unauth — UI Modernization Audit & Implementation Plan

**Scope:** Every authenticated/app page and supporting routes **except the landing page**, audited for *visual modernity* against a Stripe-tier bar (Stripe Radar/Dashboard, Signifyd console, Kount case management, SEON/Sardine enrichment views, Chargebacks911/DisputeHelp evidence).
**Lens:** This is **not** the prior `audit/report.md` (that was ASOS workflow-readiness). This audit answers one question only: *why does the product feel slightly dated, and exactly what to change to make it feel current and high-end — without touching the brown/burgundy palette the user loves.*
**Method:** Design-token + component-library read (the components define every page), cross-checked against rendered screenshots of 7 page archetypes (`audit/screenshots/`, `simulation/screenshots/`). Findings cite `file:line`.
**Date:** 2026-05-27.

---

## 1. Verdict

The bones are good and the palette is genuinely distinctive — warm copper-on-cream is a real asset and most products in this category look like cold blue-grey dashboards. **The problem is not the colour. It's the execution layer sitting on top of it.** The app currently reads as a *competent 2017-era admin template that happens to be brown*, not as a 2025 Stripe-tier instrument.

The "dated" feeling is **not vague and not subjective** — it traces to a small number of concrete, systemic decisions baked into the shared components. Because everything is built from `Button`, `SectionCard`, `MetricCard`, `DataTable`, `PageHeader`, and `Tabs`, the same five or six smells repeat on **every** page. That's the good news: fix the components and the whole product moves at once.

**The five things dragging it into the past, in priority order:**

1. **Uppercase everything.** Buttons, section headers, table headers, KPI labels, breadcrumbs, nav groups, segmented toggles — all `text-transform: uppercase` with letter-spacing. This single choice is the loudest "old enterprise software" signal in the entire app.
2. **Monospace numbers as the default figure style.** Every KPI and score renders in DM Mono. It reads as a *terminal readout*, not a premium financial figure.
3. **Flat, border-drawn boxes with zero elevation.** `shadow-0` is literally a 1px ring. Cards separate by hairline borders, never by light/depth. Nothing floats. There are even cards inside cards.
4. **Cold data-viz inside a warm brand.** Secondary chart series are teal/slate (`privacy-ink`, `sev-neutral`) while the brand is copper. On real data the cold colours dominate and the dashboard stops looking like "ours."
5. **A repetitive "■ + tiny uppercase label" header motif** stamped on every single section card, which makes even rich pages feel like a settings form.

None of these require changing a single brand colour. They're about **casing, weight, scale, elevation, and where the brand colour is applied.**

**Honest score against a Stripe-tier bar: 62/100 today.** Phase 0 alone (shared-component fixes, ~2 days) gets it to ~78. The full plan gets it to ~90.

---

## 2. Root-cause findings (systemic — these touch every page)

> Each finding: what it is → why it reads dated → the peer benchmark → the palette-safe fix.

### R1 — Default-uppercase buttons  ★★★ highest leverage
`components/ui/Button.tsx:17` — `BASE` includes `uppercase`; `:95` adds `letterSpacing: '0.04em'`; `:94` hard-codes `borderRadius: 4`.
- **Why dated:** Uppercase tracked-out button labels are the defining tic of 2012–2016 Material/Bootstrap admin themes. Stripe, Linear, Vercel, Mercury, Ramp all use **sentence case** buttons.
- **Benchmark:** Stripe primary button = "Save changes" (sentence case), 6–8px radius, medium weight, no tracking.
- **Fix:** Remove `uppercase` and the `0.04em` tracking from `BASE`; set radius to `var(--radius-md)` (6px) or 8px; keep the copper fill. Labels become "Save changes", "New audit", "Export queue". *Zero colour change, instantly modern.*

### R2 — Monospace as the default number style  ★★★
`components/ui/MetricCard.tsx:81` forces `fontFamily: var(--font-mono)` on every KPI value; `ConfidenceBadge` and most score readouts also default to mono.
- **Why dated:** Mono figures signal "raw machine output." Premium fintech uses a **proportional sans with tabular-nums** for headline numbers and reserves mono for IDs/hashes/code only.
- **Benchmark:** Stripe/ Mercury balances and metrics are sans + `font-variant-numeric: tabular-nums`. Mono appears only on API keys and JSON.
- **Fix:** KPI/score values → `var(--font-sans)` + `.num` (tabular-nums is already defined, `globals.css:641`). Keep DM Mono **only** for order IDs, card-ending, IPs, hashes, dates-as-data. This alone makes every dashboard and metric strip look more expensive.

### R3 — No elevation; separation is 100% borders  ★★★
`SectionCard.tsx:29-34`, `MetricCard.tsx:47-52`, `DataTable.tsx` rows — all use `1px solid border` + `radius-md` and **no box-shadow**. `shadow-0` (`globals.css:98`) is a 1px ring, not a shadow.
- **Why dated:** A grid of hairline-bordered rectangles is the visual language of phpMyAdmin-era tools. Modern surfaces use **soft layered shadows** and very light (or no) borders so cards feel like physical layers.
- **Benchmark:** Stripe cards: `border: 1px solid rgba(0,0,0,0.04)` + `0 1px 1px, 0 2px 5px` soft shadow; hover lifts. The shadow tokens you *already have* (`--shadow-sm/md`, `:185-188`) are barely used.
- **Fix:** Give `SectionCard`/`MetricCard` `box-shadow: var(--shadow-sm)` and soften borders to `--border-subtle`; add `hover:shadow-md` + 1px translate on interactive cards/rows. **Eliminate nested cards** (see R8).

### R4 — The "■ + uppercase eyebrow" header on every card  ★★★
`SectionCard.tsx:44-68` renders a tinted header strip + a 10px/0.12em uppercase title + a 5×5 **square** copper bullet. The same motif is hard-coded into `PageHeader` eyebrow (`:72-98`), `MetricCard` label (`:55-66`), `DataTable` `<th>` (`:107-118`), and the sidebar group labels (`Sidebar.tsx:167-190`).
- **Why dated:** Repeating one ornamental motif on *every* container flattens hierarchy and screams "templated." The tinted header strip + square dot is pure admin-panel.
- **Benchmark:** Stripe section headers are sentence-case 14–15px medium, no fill strip, no bullet; hierarchy comes from weight and spacing.
- **Fix:** Redesign `SectionCard` header → sentence-case ~14px/600 title on the card surface (no tinted strip, no square bullet, or at most a thin copper rule under the title). Reserve uppercase **eyebrows** for genuine overlines (1 per page region max).

### R5 — Cold charts in a warm brand  ★★
`components/dashboard/DashboardCharts.tsx`: volume bars `fill="var(--privacy-ink)"` (teal, `:346`); identity-match donut "possible" tier = `var(--sev-neutral)` (slate, `:69`); distributions likewise. The fraud line *is* copper (`:324`) — but secondary series and the dominant "possible" tier are cold. `globals.css:1376` themes `react-flow` edges to `--surface-muted` (grey).
- **Why dated/off-brand:** On the demo data (mostly "possible"), the dashboard is dominated by teal/slate and stops looking like the copper brand. Cold + warm in the same view reads as "default chart library."
- **Benchmark:** Stripe Radar / SEON tint their entire viz system from the brand: one accent + warm tints + neutral grids, gradient area fills under lines, branded category ramps.
- **Fix:** Build a **brand chart ramp** from the existing tokens — copper-bright → copper-mid → amber (`--landing-amber #C07838`) → warm neutral — and apply it to bars, donut tiers, and distributions. Add subtle area-gradient fills under lines. Re-skin `react-flow` edges/nodes (`graph`, identity clusters) to copper/cream. Touch points: `DashboardCharts.tsx`, `AuditCharts.tsx`, `AuditRiskChart.tsx`, `NetworkMetricsCharts.tsx`, `IdentityClusterGraph.tsx`, `GlobalIdentityGraphClient.tsx`.

### R6 — Type is small, dense, and fragmented  ★★
Body is **13px/19.5px** (`globals.css:591-592`); page `<h1>` is **18px** (`PageHeader.tsx:105`); KPI "hero" tops out at **28px** (`MetricCard.tsx:78`); labels are 10px. And there are **4+ parallel type scales actively in use** — `t-heading` (22 files), `text-heading-lg` (15), `t-display` (9), plus `text-h1/h2`, `text-display-*`, `text-mono-*` (`globals.css:614-651`).
- **Why dated:** 13px dense body + tiny 10px labels = "information-dense legacy console." Four competing scales guarantee inconsistent headings across pages (a real source of the "slightly off" feeling). Your own Ramp-level bar calls for commanding numeric moments; 28px hero doesn't deliver one.
- **Benchmark:** Stripe base 14–15px; page titles 20–28px; ONE documented scale.
- **Fix:** Base → 14px. `<h1>` → 20–24px. Collapse to **one** canonical scale (keep `text-display/h1/h2/body/meta/overline`, delete the rest, codemod usages). Allow one genuine hero number (≥40px sans) on the dashboard.

### R7 — Native `<select>` everywhere  ★★
`components/ui/Select.tsx` is a bare native `<select>` (OS chevron + OS dropdown). Visible on Settings → "Monthly order volume" / "Primary review focus".
- **Why dated:** Native selects render the OS widget — instantly inconsistent with the custom inputs beside them; the #1 tell that a form wasn't fully designed.
- **Benchmark:** Stripe/Linear use custom listbox menus matching input styling, with a custom chevron.
- **Fix:** Replace with a styled menu (Radix Select or a custom listbox) sharing `Input`'s height/border/radius and a copper focus ring. Bump input height ~36→40px while you're in there.

### R8 — Nested cards (card-in-card)  ★★
Audit results "Anchor metric" is a `SectionCard` containing another bordered metric block (`44_audit_results.png`); customer profile "Merchant notes" wraps a "Notes" card (`09_maya_customer_d_profile.png`).
- **Why dated:** Double borders/double headers are the hallmark of components composed without a layout system.
- **Fix:** One container per concept. Inner content uses spacing/dividers, never a second bordered+headed card.

### R9 — Flat, low-affordance navigation  ★
`Sidebar.tsx:108` nav items are `rounded-none`; active state is only bolder text + copper icon + a 3px rail (`:121-127`); hover is a colour change with no background. Active breadcrumb renders **uppercase** (`AppHeader.tsx:126`, `text-overline`).
- **Why dated:** Modern app nav gives the active item a **filled, rounded** background (a "pill") for a tactile, oriented feel; square hover-less rows feel inert.
- **Fix:** Active item → subtle `--bg-selected`/copper-glow rounded-md fill (keep the rail or drop it); hover → faint rounded fill. Active breadcrumb → sentence case.

### R10 — Inconsistent chrome & redundant controls  ★
`AppHeader.tsx:69-71` returns **null on `/dashboard`** only — so the dashboard is the one page with no top bar (orientation/search/avatar all vanish). The customers list renders pagination **twice** (top toolbar *and* above the table — `47_customers_populated.png`), and stacks three rows of controls (search/sort/status, then filter chips, then saved-views) before the table.
- **Why dated:** Missing/!= chrome and duplicated controls read as unfinished. Dense stacked toolbars feel like a legacy data grid.
- **Fix:** Give the dashboard the standard `AppHeader` (or deliberately, consistently, suppress it on no page). De-dupe pagination. Consolidate the customers controls into one toolbar row + an overflow "Filters" popover.

**Secondary/polish (lower priority but visible):**
- **Temperature clash in greys:** canonical text greys are *cool* blue-grey (`--text-muted #6E7A8A`, `--text-subtle #9AA5B4`, `globals.css:32-33`) sitting on *warm* cream, while a parallel *warm* ink scale (`--ink-secondary #7A6F65`) also exists. Standardize app text on the warm `ink-*` scale for a coherent warm system.
- **Tables read as ledgers:** every row has a full-width 1px divider (`DataTable.tsx:155`). Lighten to `--border-subtle` or go hover-only separation; add a subtle sticky header shadow on scroll.
- **In-table confidence badge is a weak 20px letter chip** (`ConfidenceBadge.tsx`, compact path) — upgrade to a small pill (grade + dot + optional score) so the risk signal reads as designed, not as a tag.
- **Scores aren't visualized:** a 0 and a 97 get identical treatment in tables. Add a thin score/risk micro-bar or colour-weighted numeral — this is table stakes for Signifyd/Kount/SEON.
- **Almost no motion in-app** while the landing is rich with it. Add restrained micro-interactions (card/row hover lift, tab/underline transitions; count-ups already exist via `useCountUp`).

---

## 3. Page-by-page audit (every route, grouped by archetype)

> Pages are built from the shared components, so the R-findings above apply everywhere. Below are **page-specific** defects on top of the systemic ones.

### Shell — applies to all `(app)` pages
`Sidebar`, `AppHeader`. Issues: R9 (flat nav, uppercase active crumb), R10 (no header on dashboard), R4 (uppercase group labels + square dots). Quirk: `AppHeader.tsx:174` Shopify link ternary points to the same href in both branches (dead conditional).

### A. Dashboard — `/dashboard`
KPI strip + 5 charts. Specific: **R10** (no top header — orientation/search missing here only); **R5** (teal volume bar, slate-dominated donut); **R2/R3** (mono KPIs, flat KPI strip with no dividers); first-run-with-one-audit reads sad (flat lines, single bar, "£0.00 / 0.0%"). The "Charts fill in…" empty state exists but the *one-audit* middle state doesn't get the same care. Add a genuine hero number + delta context.

### B. Table / queue pages
`/customers` (Overview/Cases/Clusters/Audits/Reports tabs), `/inbox`, `/claims`, `/watchlist`, `/chargebacks` (Evidence packages), `/history`, `/reports`, `/audits`, `/saved`, `/clusters`, `/global`; `/lookup` → redirects to `/customers`.
Systemic: R1/R2/R3/R4 + ledger rows + weak badges + unvisualized scores. Specific:
- **/customers:** double pagination + triple-stacked control rows (R10); tiny C/D letter chips; KPI strip flat. Strongest flow content-wise — make it the showcase.
- **/inbox:** decent queue, but RISK shown as a tiny "A" chip; MATCH SIGNALS as plain text; no score visualization; can read empty when only medium-risk exists (also noted in workflow audit).
- **/claims:** colored status pills are good and the most modern table; still ledger rows + uppercase headers. A "1 Issue" dev pill is visible bottom-left in `final_claims_final.png` — confirm it's not shipping to users.
- **/chargebacks (Evidence packages):** label↔route mismatch persists; this is the Chargebacks911/DisputeHelp surface — it deserves evidence-strength visualization, not a plain table.
- **/watchlist, /history, /reports, /audits, /saved, /global, /clusters:** same table archetype; inherit all systemic fixes.

### C. Detail / profile pages
`/customers/[id]`, `/customers/[id]/claims`, `/chargebacks/[id]`, `/audit/[runId]/transaction/[id]`, `/customers/[id]/evidence/new`.
Specific: **R8 nested cards** (Merchant notes → Notes); weak/low-contrast "Save note" primary (looks disabled) — fix via R1 + proper primary; right-rail is a tall stack of flat bordered cards with a big empty main column when scrolled (layout imbalance) — consider a sticky summary and 2-col balance. This is your Kount/SEON "identity + enrichment" surface; the data table of address/IP/card is raw mono rows — group it as a labeled enrichment panel.

### D. Results pages
`/audit/[runId]`, `/audit/[runId]/customers`, `/audit/[runId]/transaction/[id]`, `/report/[runId]`, public `/audit/[runId]/report`.
Specific: **R8** (Anchor-metric card-in-card) and **inconsistent KPI card weights** in the same row (the Anchor card is visually 2× its neighbors — `44_audit_results.png`); **R5** (slate match-distribution bars); A/B/C/D tier cards with colored top-borders are a good pattern — extend that polish elsewhere.

### E. Forms / settings
`/settings` (+ `/account`, `/team`, `/integrations`, `/audit-trail`), `/upload` (New audit), `/apply`, `/audits/new`.
Specific: **R7 native selects** (Settings); "Monthly order volume" shows "Select a range…" though set at signup (persistence gap — also in workflow audit); **R1** uppercase "SAVE CHANGES"; section cards use the R4 motif heavily here, reinforcing the "it's all a form" feel. **/upload** is praised in the workflow audit for its mapping UX — protect that; just restyle its chrome with the new tokens.

### F. Content / docs
`/help` (+ `/how-it-works`, `/confidence-grades`, `/identity-matching`, `/csv-export`), `/legal/privacy`, `/legal/dpa`, `/legal/data-handling`, `/legal/pilot-terms`.
Specific: Help reuses the workbench tab bar (contextually meaningless — workflow audit noted this); content pages are otherwise fine but inherit small/dense type (R6) — these benefit most from the 14px base + a real reading measure (max-width ~680px, larger headings).

### G. Auth / onboarding / public funnel
`/login`, `/signup`, `/onboarding`, `/reset`, `/reset/update`, `/demo`, `/audit-demo`, `/audit`, `/audit/submitted`, `/audit/[runId]/submitted`.
Specific: these straddle landing-quality and app-quality. Align them to the (improved) app system: sentence-case buttons, elevated card, real input heights. Login is clean today but minimal; a Stripe-tier auth screen earns trust with a single elevated card, generous spacing, and a confident product mark.

### H. Special / internal
`/graph` & identity-cluster graphs, `/global`, `/network-metrics`, `/eval` (internal), `/mobile-unsupported`, `/audit-running`.
Specific: **graph is the Kount "identity graph traversal" surface** and currently uses default `react-flow` greys (`globals.css:1376`) — re-skin nodes/edges to copper/cream with elevation; this is a signature screen for the category and should look bespoke. Internal pages are low priority.

---

## 4. What we are deliberately NOT changing

- **The palette.** Burgundy `#7B2D26`, cream `#F8F5EE`, espresso `#15140F`, amber accent `#C4935A`/`#C07838` stay. Every fix above is casing/weight/scale/elevation/placement — not hue. Where we "add colour," it's **applying the existing brand** more boldly (charts, active nav), per the user's "more colour, keep the brown" direction.
- **Scoring/matching logic, thresholds, weights** (per `CLAUDE.md` ground rules). This is a pure presentation pass.
- **The information architecture / workflow** (covered by the separate `audit/report.md`). A couple of overlaps are flagged (IA labels, empty states) but not the focus here.

---

## 5. Implementation plan

Phased so each phase is independently shippable and ordered by **ROI per hour**. Phase 0 is ~80% of the perceived improvement because it edits shared components that every page inherits.

### Phase 0 — Component foundation (≈1.5–2 days) — *do this first; biggest visible jump*
Edits are localized to `components/ui/*` and the shell.
1. **Button** (`Button.tsx`): drop `uppercase` + `0.04em` tracking from `BASE`; radius 4→6/8; verify primary/secondary/ghost/danger hierarchy; fix any low-contrast primary usages.
2. **MetricCard** (`MetricCard.tsx`): value font mono→sans + `.num`; raise hero to 36–44px; label sentence-case or keep as a single quiet overline; add `--shadow-sm`.
3. **SectionCard** (`SectionCard.tsx`): remove tinted header strip + square bullet; sentence-case 14px/600 title; add `--shadow-sm`, soften border to `--border-subtle`.
4. **DataTable** (`DataTable.tsx`): `<th>` sentence-case 12px; lighten row dividers to `--border-subtle`; add sticky-header shadow; richer hover.
5. **Tabs / PageHeader / breadcrumb:** sentence-case the active breadcrumb (`AppHeader.tsx:126`); `<h1>` 18→22px (`PageHeader.tsx:105`); keep eyebrow but use sparingly.
6. **Select** (`Select.tsx`): replace native with styled listbox; align heights with `Input` (→40px).
7. **Sidebar** (`Sidebar.tsx`): active/hover → subtle rounded copper-glow fill; sentence-case group labels (or keep tiny overline, drop square dot).
8. **Global:** body 13→14px (`globals.css:591`); re-point app text from cool `--text-*` to warm `--ink-*` greys.

### Phase 1 — Brand data-viz (≈1–1.5 days)
9. Add a brand chart ramp (copper→amber→warm-neutral) and apply across `DashboardCharts.tsx`, `AuditCharts.tsx`, `AuditRiskChart.tsx`, `NetworkMetricsCharts.tsx`; replace `privacy-ink`/`sev-neutral` series colours; add area-gradient fills under lines.
10. Re-skin `react-flow` (`globals.css:1376`, `IdentityClusterGraph.tsx`, `GlobalIdentityGraphClient.tsx`) to copper/cream nodes+edges with elevation.
11. KPI strips: add light dividers/elevation; one hero number on the dashboard; delta context where available.

### Phase 2 — High-traffic page polish (≈2–3 days)
12. **Customers:** de-dupe pagination; consolidate 3 control rows → 1 toolbar + Filters popover; upgrade in-row confidence badge to a pill; add score micro-bar.
13. **Dashboard:** restore standard `AppHeader`; design the one-audit state (not just the zero state).
14. **Profile/detail:** remove nested cards (R8); fix Save-note primary; balance the 2-column layout with a sticky summary; package the address/IP/card rows as a labeled enrichment panel.
15. **Audit results:** normalize KPI card weights; de-nest the Anchor card; brand the distribution bars.
16. **Settings:** custom selects; persist & display monthly volume.

### Phase 3 — System consolidation & finish (≈2 days)
17. Collapse the 4 type scales into one canonical scale; codemod usages; delete dead scales from `globals.css`.
18. Restrained motion pass (card/row hover lift, tab transitions) respecting `prefers-reduced-motion` (already wired).
19. Dark-mode parity check across all changed components (Direction A espresso theme already exists in tokens).
20. Auth/onboarding/help/legal alignment to the new system; brand the graph screen as a signature surface.

### Success criteria (how we'll know it's Stripe-tier)
- Zero default-uppercase buttons; uppercase appears only on intentional eyebrows.
- No headline number in mono; all figures sans + tabular-nums; one commanding hero number on the dashboard.
- Every card has soft elevation and a single border tier; **no** card-in-card anywhere.
- Charts and the identity graph read as copper-brand, not teal/slate.
- One type scale; 14px base; ≥20px page titles.
- Customers/inbox/claims tables visualize risk (not bare numbers) and carry no duplicated controls.
- Side-by-side screenshot diffs vs Stripe Dashboard / Signifyd / SEON read as same-tier on typography, elevation, and figure styling.

---

## Appendix — primary files to touch
`components/ui/Button.tsx`, `MetricCard.tsx`, `SectionCard.tsx`, `DataTable.tsx`, `PageHeader.tsx`, `Tabs.tsx`, `Select.tsx`, `Input.tsx`, `ConfidenceBadge.tsx`; `components/nav/Sidebar.tsx`, `components/layout/AppHeader.tsx`; `components/dashboard/DashboardCharts.tsx`, `components/audit/AuditCharts.tsx`, `components/audit/AuditRiskChart.tsx`, `components/internal/NetworkMetricsCharts.tsx`, `components/customers/IdentityClusterGraph.tsx`, `components/global/GlobalIdentityGraphClient.tsx`; `components/customers/CustomersTableClient.tsx` + `components/workbench/*`; `app/globals.css`.
