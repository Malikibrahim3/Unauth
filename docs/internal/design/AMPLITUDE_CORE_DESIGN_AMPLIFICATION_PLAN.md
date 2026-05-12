 # Amplitude-Core Design Amplification Plan

> **Plan deliverable.** This document is the complete content to be written to:
> `docs/internal/design/AMPLITUDE_CORE_DESIGN_AMPLIFICATION_PLAN.md`
>
> Plan-mode constraints stage it here. On approval, this content is copied verbatim to the final docs path. No production UI, CSS, tokens, components, routes, backend, scoring, or schema are modified by this document — it is documentation only.

---

## Context

The product is a fraud-intelligence and financial-operations platform targeting ASOS-scale enterprise buyers. The current codebase already has a deliberate Amplitude-inspired core — warm parchment canvas (`#FAF6EF`), single blue accent (`#2563EB`), 4-tier risk palette with `bg/fg/line` semantic tokens, DM Sans + DM Mono with tabular numerics, mature spec token scale (spacing `--space-0..11`, radius `--radius-1..4` + `pill`, shadow `--shadow-0..2 + drawer/modal/focus`, motion `--duration-fast/default/slow` with `--ease-standard/emphasized`), 56px sticky `AppHeader` with breadcrumbs + ⌘K command palette, collapsible sidebar, and clean spec-aware UI primitives (Button, Badge, MetricCard, DataTable, Drawer).

Two parallel programs frame this work:

- **ASOS_REMEDIATION_PROGRAM.md** — the sequenced engineering execution plan covering CI stabilisation, security, compliance, pilot UX, and scale. It defines frozen-core files (linker, scoring engine, processing worker, evidence narrative) that must not be touched without senior review.
- **AMPLITUDE_DESIGN_AUDIT.md** — the strategic design audit identifying the most important structural shift: records-based → exploration-based mental model. It calls for analytics dashboard, segmented cohort workspace, chart-to-table drilldown, saved views, and an evidence workflow with proper loading/eligibility states.

This plan amplifies, it does not redesign. The intent is to harden, sharpen, and add 2–3 calibrated wow moments so the product reads as a premium enterprise fraud-intelligence platform during an ASOS demo, while preserving the calm analytical Amplitude core that already works.

---

## 1. Executive Design Thesis

### How the Amplitude core should evolve without being replaced

The current visual layer is approximately 70% of the way to "premium analytical fraud intelligence." Token foundations are mature, the primitives respect them, and the warm parchment + blue accent + neutral-grey-with-semantic-risk pattern is genuinely distinctive — it reads as a *financial document* rather than a *generic SaaS console*. Stripe has a similar restraint; Linear has a similar precision; Amplitude has the analytical clarity. The product already shares DNA with all three.

What is missing is enterprise *finish*: deliberate hierarchy on hero surfaces, evidence-strength visualisation, dispute-readiness storytelling, a single audit narrative instead of three competing customer renderers, and the kind of microinteraction polish that signals "this product is taken seriously by its makers." None of that requires a redesign. All of it requires concentration on the right 8–12 moments.

### What design amplification means here

**Amplification = pushing the existing system further along its own axis, not introducing a competing one.**

- Same warm parchment canvas — but with more deliberate use of `--bg-surface-alt` and `--bg-surface-sunk` to create page rhythm.
- Same single blue accent — but with disciplined hierarchy (primary action only; never decoration).
- Same 4-tier risk palette — but applied through semantic risk components that *explain* themselves (strength, confidence, evidence-state), never as raw colour.
- Same DM Sans + DM Mono with tabular numerics — but with a stricter type scale on hero surfaces so a £974.99 exposure number reads with the weight of a financial figure, not an inline label.
- Same `MetricCard`, `Badge`, `DataTable`, `Drawer`, `PageHeader` — but with a small number of new composite components (`HeroMetric`, `EvidenceStrengthMeter`, `DisputeReadinessPanel`, `RiskTimeline`) that compose existing primitives and tokens rather than introducing new ones.

### Why the app needs more wow factor without losing operational seriousness

ASOS-scale buyers do not buy "clean UI." They buy *credibility*. Credibility on a 30-minute demo is a function of:

1. The first 8 seconds of the dashboard.
2. The moment a real CSV is uploaded and processed.
3. The moment they open a high-confidence flagged customer.
4. The moment they see a generated evidence package.

If any of those four moments feels like an internal admin tool, the deal is harder. If all four feel like an enterprise intelligence platform, the deal is easier. Wow factor here is not animation, not gradients, not crypto-shine — it is *operational confidence*: showing the analyst exactly the right information at the right altitude with the right weight, plus one or two anchored visualisations (identity cluster, risk timeline, evidence strength meter) that no generic admin template would have.

### Influence model

- **Amplitude (foundation, ~60%)** — analytical clarity, data-first density, cohort/segment mental model, calm canvas, chart-to-table drilling, saved-view workflow.
- **Stripe (trust polish, ~25%)** — refined card edges and shadows, premium spacing rhythm, financial-document weight on numeric heroes, restrained iconography, crisp empty states that teach, status badges that read as financial-grade not consumer-grade.
- **Linear (operational sharpness, ~15%)** — keyboard-first workflow, dense but elegant rows, sharp focus states, microinteraction polish on the command palette and row hover, ⌘K as a real product surface.

The proportions matter. Going more than 25% Stripe makes the product feel like a payments dashboard. Going more than 15% Linear makes it feel like an issue tracker. The center of gravity must remain Amplitude.

### Final target feeling — one sentence

**A premium financial-intelligence workspace where a fraud analyst can move at Linear speed through Stripe-grade evidence on an Amplitude-clear canvas, and an executive can read a single page and know exactly what's at risk and what to do.**

---

## 2. Current Design Critique and Diagnosis

This section is grounded directly in the codebase as of `claude/affectionate-zhukovsky-b52795` (commit `d0d4f7f`). Where the codebase contradicts `DESIGN_CHANGES.md` (e.g., canvas hex value, presence of `.dark` mode), the codebase wins.

### Global verdict

The product is **not MVP-feeling** — that needs saying. The token system, primitives, sidebar, header, drawer, and command palette are already at a level that many enterprise apps never reach. But the surface-level *hierarchy* and *narrative* are still records-based: stacked cards of facts rather than a guided investigation flow. This is the gap between "credible operational tool" and "premium enterprise intelligence platform."

### Surface-by-surface critique

#### App shell ([app/(app)/layout.tsx](app/(app)/layout.tsx))

- **Current strength.** Sidebar + 56px sticky header + breadcrumbs + ⌘K is a genuinely good shell. Spec-token usage is consistent. Collapsible sidebar with persisted state. Keyboard shortcut is real.
- **Current weakness.** No user/avatar menu in the header (sign-out only via sidebar). No workspace switcher or merchant context in the header. Header right-side action slot is underused.
- **Enterprise trust risk.** Low. The shell is already credible.
- **Wow-factor opportunity.** Add a compact merchant/environment chip in the header ("ASOS · Staging") plus a workspace-level health indicator (data quality, last upload time). This is a 10-line change with disproportionate enterprise-feel payoff.
- **Preserve.** Sidebar IA, breadcrumb derivation, ⌘K trigger styling, focus ring system.

#### Sidebar ([components/nav/Sidebar.tsx](components/nav/Sidebar.tsx))

- **Current strength.** Clear three-group IA, badge counts on Inbox + Watchlist, collapse/expand persisted, icon set is appropriately restrained.
- **Current weakness.** "Dashboard / Upload / History / New Audit" still feels somewhat overlapping. No section labels distinguishing operational from investigative. The active route highlight uses background-only without an accent rail.
- **Enterprise trust risk.** Low.
- **Wow-factor opportunity.** Add a 2px accent rail on the active item (Linear-style), label the three groups in collapsed-typography, and add a footer chip with the user's identity + role.
- **Preserve.** Icon set, collapse behaviour, three-group structure.

#### Top header ([components/layout/AppHeader.tsx](components/layout/AppHeader.tsx))

- **Current strength.** 56px clean, breadcrumbs, ⌘K bar with subtle border, keyboard-driven.
- **Current weakness.** Almost no right-side density — feels intentionally empty but reads as "we haven't filled this in yet." No environment/merchant chip, no notification indicator, no avatar menu.
- **Enterprise trust risk.** Medium. An enterprise buyer expects an org/environment indicator at all times.
- **Wow-factor opportunity.** Add (in priority order): (1) merchant + environment chip, (2) compact unread-inbox indicator, (3) avatar with menu (account, sign out, theme toggle if/when added).
- **Preserve.** 56px height, breadcrumb rendering, search trigger styling.

#### Dashboard ([app/(app)/dashboard/page.tsx](app/(app)/dashboard/page.tsx))

- **Current strength.** Real KPIs (customers to review, transactions analysed, evidence packages, avg match rate), real insights strip with contextual sentences, latest-audit quick-link card with arrow microinteraction, three quick-link cohort buttons, server-rendered with proper merchant scoping.
- **Current weakness.** No hero metric. All KPIs weigh equally — a £974.99 exposure number and a "0 evidence packages" number look identical. Charts are functional but generic (bar + line + stacked). No time-range control. No segmentation. The page title "Identity Review Overview" is correct but reads like an internal label.
- **Enterprise trust risk.** Medium-high. Dashboard is the first 8 seconds; right now there is no commanding number, no executive ROI framing, no trend annotation.
- **Wow-factor opportunity.** This is the single highest-leverage surface. Add a **Hero Exposure card** (large exposure-at-risk number with delta vs. last period), a **Review Queue Health strip** (open / in review / resolved with progress), and **annotated chart callouts** ("Flag rate up 2.3% since last audit"). Promote the latest-audit link from secondary card to a fully-styled status banner.
- **Preserve.** `MetricCard`, `PageHeader`, `InsightsStrip`, server-rendered data scoping, merchant-aware fallback strings.

... (remaining content preserved in this file)
