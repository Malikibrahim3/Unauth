# Unauth — Forensic Premium-Craft Audit

**Benchmark:** Stripe, Ramp, Linear, Vercel
**Date:** 2026-06-08
**Method:** Authenticated walkthrough of the live app (seeded demo merchant *Elara & Co*) at 1440×900, with computed-style measurements (`getComputedStyle`) on rendered elements, plus three parallel source-code audits of the component library, the empty/loading/error system, and the page-header/density/chart patterns. No code was changed.

> **Bottom line:** The brand and the design *system* are premium-capable. The problem is **execution and consistency inside the product**. The marketing site was built to a Stripe/Ramp standard; the authenticated product behind it was built to a noticeably lower bar. Closing that gap is mostly mechanical — apply the design tokens that already exist, lift surfaces off the page, and fix a collapsed type hierarchy. The palette can stay.

---

## 0. The one-sentence diagnosis

**Unauth has a marketing-grade front door bolted onto a mid-tier product.** A prospect sees a 60px, tightly-tracked hero with layered shadows, dark bands, framed product mocks and motion — then signs in and lands on a flat, shadowless workbench with 20px section-header titles. The *drop in craft from landing → product* is the single biggest reason it doesn't feel premium, and no amount of further landing polish will fix it.

### The proof, in measurements

| Surface | Page title | Display type tracking | Card elevation |
|---|---|---|---|
| **Landing hero** (`/landing`) | **60px / 700 / −1.2px** (−0.02em), 4-layer hero shadow | tight, intentional | layered (`--landing-shadow-hero`, `-panel`, `-card`) |
| **Dashboard** (`/dashboard`) | **20px / 600 / normal** | none | **`box-shadow: none`** |
| **Customer profile** (`/customers/[id]`) | **20px / 600 / normal** | none | **`box-shadow: none`** |

Forensic elevation sweep of the entire dashboard: of *every* element on the page, only **three** carry any box-shadow — an inset accent ring on one card and two transient overlay elements (a dropdown + a popover). **Every persistent content surface — KPI tiles, panels, list containers — has zero shadow.** The light UI is literally flat: `#FFFFFF` cards with a `#D8D0BD` border sitting on a `#F6F5F3` warm-white canvas, with no elevation anywhere.

That is the textbook "looks like AI built it" signature: borders doing all the work, no light model, no depth.

---

## 1. The systemic root causes

These are cross-cutting and explain ~90% of the "not premium" feeling. Fix these and most page-level complaints evaporate.

### R1 — Flat elevation (the #1 tell) — *measured*
Persistent surfaces render with **no box-shadow**. The design system *defines* a full shadow scale (`--shadow-xs…xl`, `--shadow-1/2`, warm-tinted), but:
- The dashboard hand-rolls its own flat cards in `app/(app)/dashboard/DashboardPagePrimitives.tsx` (border-only, `minHeight:108`, no shadow) instead of the canonical `components/ui/MetricCard.tsx` (which *does* apply `--shadow-sm`).
- Even where `--shadow-sm` *is* applied, it is `0 1px 3px /0.06, 0 1px 2px /0.04` — so faint on a warm near-white canvas that it reads as flat. Stripe/Ramp use a perceptible two-part ambient+key shadow on every raised surface.
- Net effect: white-on-warm-white cards separated only by a fairly heavy tan border (`#D8D0BD`). Boxes drawn on paper, not surfaces floating above a canvas.

### R2 — Collapsed type hierarchy — *measured*
Product page titles are **18–20px / weight 600 / normal tracking** — i.e. *section-header* scale, not page-title scale. There is **no shared `PageHeader` for the main pages** (`globals.css:674` `.t-heading = 1.25rem`); each page hand-rolls its title. Negative letter-spacing exists in the system but is applied **ad-hoc** — only on `MetricCard` hero numbers (`-0.02em`), never on the heading/display classes (`globals.css` heading classes are all `letter-spacing: 0`). The result is a page with almost no typographic contrast: title, section heads and body all sit within a 14–20px band. Premium products open a page at 28–32px tight-tracked, then step down hard.

### R3 — A sophisticated token system that the product under-uses
This is the crux and the good news. `app/globals.css` is 4,281 lines of genuinely thoughtful tokens — surfaces, warm-tinted shadows, a type scale, motion easings, an espresso dark mode, even a landing-specific shadow set. **The product just doesn't apply it.** Component audit found **~60% adoption** of the canonical primitives; the rest are hand-rolled `div`s with inline styles (e.g. `app/(app)/dashboard/DashboardPageCockpit.tsx:132`, `app/(app)/customers/[id]/CustomerProfilePageMainColumn.tsx:65`). Utility primitives hardcode magic numbers instead of tokens — Button heights `30/34/38`, `Input` height `36`, `Badge` radius `3px` (`components/ui/badgeStyles.ts`), `ConfidenceBadge` widths in JS. This is "iterative refactor that was never finished," and it's why the app feels inconsistent screen to screen.

### R4 — Weak focal points / low data-ink in big white voids — *observed*
KPI numbers render at ~28px and sit in cards that occupy a fraction of a wide white canvas. The dashboard, audit-results view, and especially the **evidence-package detail** have large empty regions (the evidence page is a sparse left-aligned checklist filling ~40% of the width on a white void). Ramp/Stripe pages have a clear commanding element per view and far less dead space. Right now every page reads at one volume — quiet.

### R5 — Semantic hierarchy inversion (the product's whole point is whispered)
Unauth's entire value proposition is *the confidence grade* (identity / context / evidence / match confidence). On the customer profile, the "Definite" grade — the strongest possible *confidence* signal — computes to **12px, weight 600, muted grey-brown (`#7A6F65`), no fill, no border**. The most important datum on the page is rendered as quiet metadata. The grade should be the most visually dominant element in any row or header (solid color-coded fills, larger, unmistakable).

> **Framing guardrail (revised 2026-06-08):** make the letter *visually* dominant, but **label and frame it as a confidence grade, never a verdict on the person.** Use "Identity confidence / Context strength / Evidence strength / Match confidence"; never "Risk grade / Customer grade / Fraud grade / Decision grade" or a bare "Grade A — Definite". Pattern: `Identity confidence: A` · "Strong match across store-owned claim context". An A/B/C read as "this customer is bad/good" recreates the exact legal/compliance liability the product's "no auto-blocks" stance avoids.

### R6 — Charts are functional, not bespoke
`recharts` is used with near-default axis/grid/tooltip styling; custom bars (`GradeDistBar`, `ReadinessFunnel`) are fine but minimal. No animated draw-in, no refined axis typography, thin data-viz vocabulary. Ironically the **landing already has** `ua-chart-draw` (line draw-in) and a richer treatment — the product doesn't inherit it.

### R7 — First impression is a wall of connect-gates
Despite seeded data existing, `/claims` and the dashboard gate on connection state and present "Connect Shopify + Gorgias to use Claims" empty states. The empty states themselves are reasonably crafted, but a brand-new user's first authenticated impression is *blocked panels*, not the product's intelligence. The richest views (customer profile, evidence package, chargebacks) are reachable but not foregrounded.

### R8 — State systems built but not wired / not complete
- A `.skeleton` shimmer keyframe **exists** in `globals.css:733` but the skeleton `Bone` primitive uses plain `animate-pulse` instead — the premium shimmer is built and unused.
- `error.tsx` / `loading.tsx` coverage is partial: missing on `/claims` (error), `/reports`, `/store`, `/global`, and all `/settings/*` subpages.
- Empty states are fragmented across 3+ patterns (`EmptyDashboardHero`, `WorkbenchEmptyState`, ad-hoc) with no single component.

### R9 — Motion lives only on the landing
The landing has reveals, hover-lift, pulse dots, border beams, chart draw-in. The product has effectively none — pages snap in. Premium products carry a *restrained* version of their motion language into the app (load reveals, number count-ups, row hover, panel transitions).

### R10 — Mobile is hard-blocked
There is an `app/mobile-unsupported` route. Defensible for a dense ops tool, but Ramp/Stripe degrade gracefully. At minimum the desktop layout should hold down to ~1024px.

### R11 — A core page is currently broken (functional, not cosmetic)
`/customers` (the list) throws `TypeError: query.abortSignal(...).catch is not a function` in `CustomersOverviewPage` and falls back to the "Customers unavailable" error card. The error boundary is graceful, but the customer *list* — a primary navigation target — is down in the current working tree (`app/(app)/customers/CustomersOverviewPageView.tsx` is among the modified files). This must be fixed regardless of the redesign.

---

## 2. Page-by-page findings

Legend: ✅ strength · ⚠️ gap · ⛔ broken

### Landing (`/landing`) — *the high-water mark*
- ✅ 60px/−1.2px hero, dark bands, framed product mocks, numbered sections (01–08), layered shadows, motion. This is genuinely premium and should be the *reference* for the product.
- ⚠️ Pricing section is an even-weight 4-column grid; the price numerals (`£99/month`) are mid-sized — not a "dramatic type moment." The "comparison" and "data model" sections are strong; pricing is the weakest landing block.
- ⚠️ `next/image` aspect-ratio warnings in console (integration logos) — minor polish.

### Login (`/(auth)/login`)
- ✅ Split layout with a dark trust panel + mini case-file preview is on-brand and premium.
- ⚠️ Right-hand form card uses the faint `0 2px 4px / 0 12px 28px` shadow — acceptable here; just ensure it matches the new elevation scale.

### Dashboard (`/dashboard`) — "Claim overview"
- ⚠️ Title 20px; KPI numbers 28px; **all surfaces flat (measured)**.
- ⚠️ Large dead space; no single commanding element. Four small stat tiles + an "Offline" card read as equal-weight.
- ⚠️ Connect-gate banners dominate the top.
- ✅ The "Claims for review" queue and "Dispute evidence" modules are good raw material for a strong focal layout.

### Customers list (`/customers`) — ⛔ **crashes** (R11).
### Customer profile (`/customers/[id]`) — *dense, but flat*
- ✅ Genuinely information-rich (identity grade, cross-merchant count, order value, this-store vs network breakdown). The bones of a premium "case file" are here.
- ⚠️ 20px title, flat panels, and the grade rendered as muted 12px text (R5). Header right side is empty white. This page should feel like a Ramp vendor profile / a credit report — it currently feels like a form.

### Claims (`/claims`)
- ⚠️ Shows the "Connect Shopify + Gorgias" gate (R7) rather than the seeded queue. The underlying `ClaimsQueueClient` table is well-built (tabular nums, left-border selection) per source audit.

### Chargebacks / Evidence packages (`/chargebacks`)
- ✅ Dense list + a "package readiness" funnel + KPI row. One of the better-composed pages.
- ⚠️ A secondary horizontal tab bar (Dashboard/Customers/Claims/Evidence/Reports/Import) duplicates the sidebar — two competing navs.

### Evidence package detail (`/chargebacks/[id]`) — *the hero artifact, underwhelming*
- ⛔ (craft) This is the **deliverable a merchant submits to win a dispute** and it presents as a sparse, left-aligned checklist (CE3 match · narrative · identity signals) floating in ~60% empty white. Small type, flat. No document framing, no print-ready gravitas, no sense of an authoritative dossier. **This is the single highest-value redesign target in the app.**

### Audit run (`/audit/[runId]`)
- ✅ Tabbed (Overview/Customers/Transactions/Data quality), match-strength segmented bar, completed-state pill.
- ⚠️ Flat tiles, modest numbers ("69", "0", "3") in white space. Reads as a functional report, not a premium analysis.

### Reports (`/reports`)
- ⚠️ Compact, small line chart trending down, segmented grade bar. Functional. Live/CSV toggle is good. No `error.tsx`/`loading.tsx` gaps (R8).

### Settings → Integrations (`/settings/integrations`)
- ✅ Clean left-subnav + provider rows (Shopify/Woo/BigCommerce/Magento + Gorgias). Conventional and fine.
- ⚠️ Small logos, low typographic contrast; the "Finish setup" / "Activate claim intelligence" sections could carry more guidance weight.

### Dark mode — espresso (`:root[data-theme="dark"]`) — *the hidden strength*
- ✅ The deep espresso (`#0E0B08`) + copper (`#C8763A`) theme reads **richer and more premium than the cream light mode.** Atmosphere and accent give the depth the light surfaces lack. This is a strategic asset (see §3).

---

## 3. The palette decision

**Recommendation: keep maroon / espresso / cream — it is premium-capable.** The gap is execution, not hue. But *rebalance*:

1. **Keep light mode as the default; make espresso-dark an excellent first-class toggle.** *(Revised 2026-06-08 — see the binding decision in the implementation plan.)* Dark reads more premium in screenshots, but defaulting an ecommerce/support/ops/fraud product to dark makes it feel like a developer/security tool and can intimidate. The right move is "light default, dark excellent": **fix the flat light mode (elevation + hierarchy) rather than hiding it behind dark.** Ship dark polished, use it in pitch/demo screenshots, and let users opt in — don't force it until data says they prefer it.
2. **If you stay light-first, the cream canvas must earn its keep.** Fix it by (a) giving surfaces real elevation so white cards read as *raised* off the cream, and/or (b) deepening/cooling the canvas a touch and adding a very-low-opacity warm texture/gradient (Ramp does this) so white surfaces pop. Flat white-on-warm-white is the worst of both worlds.
3. **Use the accents with conviction.** Maroon as the unambiguous action/brand color; copper for data, accents and highlights. Right now color is timid; the confidence/severity palette in particular is under-deployed (R5).

You do **not** need to abandon the palette to hit Stripe/Ramp level. You need elevation, type contrast, and bolder accent use.

---

## 4. The fix plan — four phases

Phases are ordered by *leverage-per-effort*. Phase 1 is ~80% of the perceived-quality gain and is low-risk (token + primitive changes, no scoring/logic touched).

### Phase 1 — Design-language reset (foundation; do this first)
*Goal: a logged-in user should feel the same craft tier as the landing.*
1. **Rebuild the elevation system.** Retune `--shadow-sm/md/lg` to perceptible two-part ambient+key shadows calibrated for the warm canvas. Make the canonical `Card`/`SectionCard`/`MetricCard` the **only** surface primitives — hairline border **+** real shadow. Delete the dashboard's hand-rolled flat cards (`DashboardPagePrimitives.tsx`) and route through the primitive.
2. **Install a real product type scale via one shared `PageHeader`** used by every page: page title **28–32px / −0.02em / 600–700**, eyebrow/section 18–20px, body 14px. Apply negative tracking to the heading/display classes in `globals.css` systematically (not ad-hoc).
3. **Make KPI numbers commanding:** 36–44px, tabular, tight tracking, with a clear single focal stat per view.
4. **Fix the semantic inversion (R5):** rebuild the confidence badge as the dominant element — solid color-coded fills, proper size — **labeled as confidence (Identity/Evidence/Match), never a verdict on the person** — and use it consistently in rows and headers.
5. **Theme posture (§3) — decided:** light mode is the default; **fix the light canvas-to-surface contrast so it stands on its own**, and ship espresso-dark as a first-class toggle. Don't leave light flat, and don't default to dark.

*Validation:* screenshot dashboard + customer profile side-by-side with a Stripe/Ramp dashboard. Titles, elevation and focal hierarchy should now be in the same league.

### Phase 2 — Consolidate the system + rebuild the three hero surfaces
*Goal: kill inconsistency; make the money screens unmistakably premium.*
1. **Finish the primitive migration.** Replace the ~40% hand-rolled `div` cards with `ui` primitives; parametrize all hardcoded sizes onto the spacing scale; add a real `Modal` primitive; unify a single `density` system across Button/Input/Table/Card.
2. **Redesign the Evidence Package detail (highest value)** into a dense, authoritative, document-like dossier — strong header (case ID, grade, amount, deadline as the focal block), evidence sections with real weight, signal table, print/PDF-grade gravitas. This is what wins disputes; it should *look* like it.
3. **Redesign the Customer Profile** into a premium "case file": commanding grade header, identity-signal bars, this-store-vs-network comparison, activity timeline — fill the empty right rail.
4. **Redesign the Dashboard** around one commanding focal element + the review queue; collapse equal-weight tiles into a clear hierarchy; remove dead space.

### Phase 3 — Data, density & state systems
*Goal: the details that separate "good" from "Ramp."*
1. **Bespoke data-viz:** restyle recharts (custom axes/grid/tooltips, espresso/copper palette) and bring the landing's `ua-chart-draw` draw-in into the product.
2. **Tighten density** and eliminate white voids across pages; raise data-ink ratio.
3. **Unify the state systems:** one `EmptyState` component; wire the existing `.skeleton` shimmer into `Bone`; add the missing `loading.tsx`/`error.tsx` to `/reports`, `/store`, `/global`, `/claims`, `/settings/*`.
4. **Bring motion into the product — restrained, never theatrical** *(revised 2026-06-08)*: subtle one-shot reveals, single chart draw-in, row hover-lift, shimmer loading. **No glowing cards, no dramatic page reveals, no flashy transitions** — and evidence/claim screens get at most a single quiet reveal + shimmer (the dispute artifact must read as serious). Reuse the landing's `ua-*` vocabulary selectively; keep `ua-hover-glow` landing-only.
5. **Rethink the first-run path (R7):** lead with product value, not connect-gates; let seeded/sample data showcase the intelligence before connection.

### Phase 4 — Parity, responsiveness, correctness & QA
*Goal: ship-ready polish and no broken edges.*
1. **Fix the `/customers` crash (R11)** and sweep for other runtime errors.
2. **Dark-mode (espresso) parity pass:** ensure every redesigned component is intentional in both themes.
3. **Responsive:** hold the layout to ~1024px; make `mobile-unsupported` graceful (or begin real tablet support).
4. **Resolve the duplicate nav** on chargebacks/sub-tab pages; settle on one navigation model.
5. **Final side-by-side QA** vs Stripe/Ramp on every page against the checklist below.

---

## 5. Definition of done (per page)

- [ ] Page opens with a 28–32px tight-tracked title and a single clear focal element.
- [ ] Every persistent surface has perceptible, consistent elevation (measure: `box-shadow !== none`).
- [ ] The confidence grade (labeled Identity / Evidence / Match confidence — never a verdict on the person) is clearly labeled and visually dominant in any row or header.
- [ ] KPI numerals are large, tabular, tight-tracked.
- [ ] No hand-rolled card `div`s; everything routes through `ui` primitives on the spacing scale.
- [ ] Empty / loading / error states exist and share one component; shimmer (not pulse) on skeletons.
- [ ] Charts are branded (custom axes/tooltips, draw-in), not default recharts.
- [ ] The page holds up screenshot-to-screenshot next to a Stripe/Ramp equivalent.
- [ ] Works in both espresso-dark and the chosen light treatment.
- [ ] No console errors; layout holds to 1024px.

---

## Appendix — key file references
- Tokens / type scale / shadows / dark mode: `app/globals.css` (e.g. headings `:646–683`, `.skeleton` `:733`, dark mode `:421+`, landing shadows `:408–411`).
- Canonical primitives: `components/ui/SectionCard.tsx`, `components/ui/MetricCard.tsx`, `components/ui/Button.tsx`(+`buttonStyles.ts`), `components/ui/Badge.tsx`(+`badgeStyles.ts`), `components/ui/DataTable.tsx`, `components/ui/PageHeader.tsx`, `components/ui/ConfidenceBadge.tsx`.
- Hand-rolled / flat offenders: `app/(app)/dashboard/DashboardPagePrimitives.tsx`, `app/(app)/dashboard/DashboardPageCockpit.tsx:132`, `app/(app)/customers/[id]/CustomerProfilePageMainColumn.tsx:65`.
- Broken: `app/(app)/customers/CustomersOverviewPageView.tsx` (`query.abortSignal().catch` TypeError).
- Skeletons: `components/navigation/skeletons/primitives.tsx` (uses `animate-pulse`, not `.skeleton`).
- Prior landing-only audit (for reference, already largely actioned): `reports/landing-page-audit/`.
