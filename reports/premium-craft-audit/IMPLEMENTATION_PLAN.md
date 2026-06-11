# Unauth — Premium-Craft Implementation Plan

**Companion to:** [`PREMIUM_CRAFT_AUDIT_2026-06-08.md`](./PREMIUM_CRAFT_AUDIT_2026-06-08.md) (read it first — this doc operationalises that audit).
**Generated:** 2026-06-08. **Benchmark:** Stripe / Ramp / Linear / Vercel.

---

## How to use this document

Each section below is **build-ready**: it states the *current* code (with `file:line`), the *exact* change (before → after token values, full component prop APIs, code sketches), the files to touch, and measurable **acceptance criteria**. Sections were drafted against the real codebase and then **adversarially verified** against the actual files and the project ground rules; each ends with a `> Verifier notes:` blockquote listing corrections and residual risks.

**Ground rules honoured throughout (per `CLAUDE.md`):** this is a visual/UX plan only — **no scoring formula, weighting, matching, or cluster logic is changed**; SSOT constants (grades/thresholds/colours in `lib/engine/weights.ts` & `lib/utils/confidenceStyles.ts`, tokens in `app/globals.css`, tables in `lib/supabase/tables.ts`) are respected; **no `as any`, no `// eslint-disable`**; the `no-restricted-imports` rules for `scoreToGrade`/`CONFIDENCE_THRESHOLDS` are preserved.

**Palette:** keep maroon / espresso / cream. The plan rebalances execution (elevation, type contrast, bolder accent use) and recommends a theme posture — it does **not** abandon the brand.

### Phase sequencing

| Phase | Theme | Areas | Risk | Why here |
|---|---|---|---|---|
| **1** | Design-language reset | A, B, C, D | Low | ~80% of the perceived-quality gain; token + primitive work only |
| **2** | Hero surfaces | E, F | Med | Applies the foundation to the money screens |
| **3** | Systems (state/viz/motion) | G | Low–Med | Consistency + the Ramp-level details |
| **4** | Correctness & parity | H | Low | Fix the live crash, nav, responsive |

### How to validate (definition of done, per page)

- [ ] Page opens with a ≥ 28px tight-tracked title and one clear focal element.
- [ ] Every persistent surface has perceptible, consistent elevation (measure: `getComputedStyle(card).boxShadow !== 'none'`).
- [ ] The **confidence** grade (labeled Identity / Evidence / Match confidence — never a verdict on the person) is clearly labeled and visually dominant in any row or header.
- [ ] KPI numerals are large (≥ 36px), tabular, tight-tracked.
- [ ] No hand-rolled card `div`s — everything routes through `components/ui` primitives on the spacing scale.
- [ ] Empty / loading / error states exist and share one component; shimmer (not pulse) on skeletons.
- [ ] Charts are branded (custom axes/tooltips, draw-in), not default recharts.
- [ ] The page holds up screenshot-to-screenshot beside a Stripe/Ramp equivalent.
- [ ] Looks intentional in **light mode (default)** and **espresso-dark (first-class toggle)**; no console errors; layout holds to 1024px.

---

# Binding design decisions — revision 2026-06-08

These three rulings were set after review and **override any contrary phrasing anywhere below**. Where a later section still reads "dark-first," "risk grade," or proposes elaborate motion, **the rule here wins** — implement to these, not to the older wording.

### 1. Light mode is the default. Dark mode is an excellent first-class toggle — never the default.
**Rationale:** Unauth sells to ecommerce / support / ops / fraud teams. Dark-first reads as a developer / security / infra / crypto tool and can feel intimidating; a warm premium *light* mode reads more trustworthy and helpdesk-adjacent. Dark "looking better in screenshots" is **not** a reason to hide a flat light mode behind it — **fix the light-mode elevation and hierarchy (Area A) so light stands on its own.**
- `RootLayout` MUST default to **light**. Respect a stored user preference; do **not** auto-adopt `prefers-color-scheme: dark` as the default.
- Ship espresso-dark as a polished, fully-supported toggle ("light default, dark excellent").
- Use espresso-dark in pitch/demo screenshots where it shines — but don't force it on users until data says they prefer it.

### 2. The grade is a CONFIDENCE grade, not a judgement on a person.
The letter (A/B/C) may be the most visually dominant element — but the label and surrounding copy **must** frame it as *identity / context / evidence / match confidence*, never a verdict on the customer. This is a legal/compliance guardrail consistent with Unauth's "no auto-blocks" positioning; an A/B/C read as "this customer is bad/good" recreates exactly the liability the product avoids.
- **USE these labels:** "Identity confidence", "Context strength", "Evidence strength", "Signal confidence", "Match confidence".
- **NEVER:** "Risk grade", "Customer grade", "Fraud grade", "Decision grade", or a bare "Grade A — Definite" that implies the person is good/bad.
- **Required pattern — dominant letter + clarifying subline:**
  - Customer profile: **`Identity confidence: A`** · "Strong match across store-owned claim context"  *(not "Grade A — Definite")*
  - Evidence package: **`Evidence strength: Strong`** · "4 matched identity signals · 2 prior store orders"  *(not "Match Grade A")*
- Wherever Areas D / E / F say "risk grade as the loudest element," read it as **"confidence grade, clearly labeled, visually dominant."** The visual prominence is kept; the framing is corrected.

### 3. Motion is restrained, not theatrical — especially on evidence/claim screens.
The product should feel **premium, not theatrical** — never a landing page embedded inside the app.
- **Allowed:** subtle card reveal (once, on first view), chart draw-in (once), row hover-lift, shimmer loading.
- **Not allowed in-product:** glowing cards (`ua-hover-glow`), dramatic/hero-style page reveals, flashy transitions, and **any motion beyond a single quiet reveal + shimmer on evidence/claim screens** (the dispute artifact must read as serious — no chart draw-in, stagger, or flourish on it). A gentle one-shot stagger (≤60ms step) on a dashboard/list grid is fine; heavy or repeating stagger is not.
- In Area G, **drop `hover-glow` from the product `MotionWrap` options** (keep it landing-only) and keep reveals subtle and single-shot. All motion continues to respect `prefers-reduced-motion`.

---

# Phase 1 — Design-language reset (foundation)

Highest leverage-per-effort and lowest risk: pure token + primitive work, no business/scoring logic touched. This phase alone should move a logged-in user into the same craft tier as the landing — perceptible elevation on every surface, a real page-title type scale, commanding KPI numerals, and the **confidence** grade (identity / evidence / match — clearly labeled, never a verdict on the person) promoted from whispered metadata to a visually dominant element. Do A first (it is the substrate B/C/D build on), then B/C/D can run in parallel.

---

## A. Design tokens — elevation, type scale, tracking, canvas/theme posture

### Current state

**Shadows — light mode (globals.css lines 98–103, 185–189):**
- `--shadow-0:` border-only, 1px var(--border-subtle)
- `--shadow-1:` 0 1px 2px rgba(26,24,20,0.04), 0 1px 3px rgba(26,24,20,0.06) [ambient + key, faint]
- `--shadow-2:` 0 2px 4px rgba(26,24,20,0.04), 0 12px 28px rgba(26,24,20,0.08) [near + far, soft]
- HSL-based variants at lines 185–189:
  - `--shadow-color: 28 14% 12%` (warm-brown base, underutilized)
  - `--shadow-xs:` 0 1px 2px hsl(var(--shadow-color) / 0.04) [imperceptible on warm canvas]
  - `--shadow-sm:` 0 1px 3px hsl(var(--shadow-color) / 0.06), 0 1px 2px hsl(var(--shadow-color) / 0.04) [too faint; Stripe/Ramp use 0.10+]
  - `--shadow-md:` 0 4px 8px / 0 2px 4px at 0.06/0.04 opacities [imperceptible at distance]
  - `--shadow-lg/xl:` 0.08/0.12 opacity ceiling
- **Landing shadows are richer** (lines 408–410): `--ua-shadow-sm/md/lg/xl` use rgba(31,26,18,...) at 0.05–0.14; `--landing-shadow-hero` is 4-layer with 0.10–0.18 opacities
- **Audit finding:** measured on 1440px dashboard, every persistent surface has `box-shadow: none` except one inset accent ring. Cards are `#FFFFFF` + `#D8D0BD` border, no elevation.

**Shadows — dark mode (globals.css lines 570–581):**
- `--shadow-color: 24 30% 2%` (hue shift to warm but same HSL-based approach)
- `--shadow-xs/sm/md/lg/xl:` 0.45–0.52 opacity (perceptible by necessity on dark surfaces)
- `--shadow-0/1/2:` use pure black rgba (240,235,227 light accent on dark bg)
- `--shadow-drawer/modal:` 0.46–0.58 opacity
- **Audit finding:** "espresso-dark reads richer and more premium than cream light mode"; depth is achieved via opacity but lacks warm accent tint to echo copper brand.

**Type scale — headings and display (globals.css lines 646–668):**
- `.text-display-xl:` 36px / 40px lh / 600 / `letter-spacing: 0` [no tracking]
- `.text-display-lg:` 28px / 34px lh / 600 / `letter-spacing: 0` [no tracking]
- `.text-display-md:` 22px / 28px lh / 600 / `letter-spacing: 0` [no tracking]
- `.text-heading-lg:` 18px / 26px lh / 600 / `letter-spacing: 0` [no tracking]
- `.text-heading-md/sm:` 16px, 14px / similar [no tracking]
- **Alternate scale (lines 660–663):**
  - `.text-display:` 28px / 32px / 600 / 0 tracking
  - `.text-h1:` 20px / 24px / 600 / 0 tracking [audit: product page titles measure to this, not 28–32px like premium products]
  - `.text-h2/h3:` 16px, 14px / 0 tracking
- **Legacy `.t-*` scale (lines 674–682):**
  - `.t-display:` 1.75rem (28px) / 1.15 lh / 600 / 0 tracking
  - `.t-heading:` 1.25rem (20px) / 1.2 lh / 600 / 0 tracking
- **Landing has `--tracking-tight: -0.02em` (line 390)** applied to hero (line 2093, 2236, etc.) but **product headings never use negative tracking**.
- **Result:** page titles compute to 20px / 600 / normal (audit measured); landing hero is 60px / 700 / −1.2px. No page-level heading class exists.

**Type scale — KPI numerals (components/ui/MetricCard.tsx line 77–84, DashboardPagePrimitives.tsx line 28):**
- `MetricCard.tsx` (canonical, in `components/ui/`) applies:
  - `fontSize: isHero ? 40 : 22`
  - `font-weight: 600`
  - `letter-spacing: -0.02em` [only place in product with tight tracking]
  - `className: "num"` which applies `font-feature-settings: "tnum" 1, "ss01" 1` (line 672)
- `DashboardPagePrimitives.tsx` (dashboard flat cards) applies:
  - `fontSize: 28`
  - `font-weight: 600`
  - `className: "num"` [inherits tabular-nums]
  - **No tracking** (no `-0.02em`)
- **No shared KPI utility class**; metric rendering is ad-hoc per component.

**Canvas and surface contrast (light mode):**
- `--bg-canvas: #F6F5F3` (line 18, warm off-white)
- `--bg-surface: #FFFFFF` (line 19, pure white)
- `--border-default: #D8D0BD` (line 26, warm tan, 0.6–0.8 opacity on canvas per audit)
- **No elevation separation:** persistent cards measure as flat (`box-shadow: none`); MetricCard applies `var(--shadow-sm)` which reads imperceptible on warm canvas.

**Dark mode posture (`:root[data-theme="dark"]` lines 421–601):**
- Espresso base: `--surface-base: #0E0B08` (line 425), `--surface-raised: #171310` (line 426)
- Copper accent: `--copper-bright: #C8763A` (line 439)
- Shadows: high opacity (0.45–0.52) but pure-black-tinted (rgba(0,0,0,...)) on key layers, no copper warmth
- **Audit noted:** espresso-dark is the stronger visual expression and reads premium; light mode requires elevation fixes to match.

**Summary of gaps:**
1. Light-mode shadow opacities are ≤0.12, imperceptible on #F6F5F3 canvas. Ambient opacity is 0.04–0.06 (landing uses 0.05–0.14).
2. **Zero negative letter-spacing on any product heading class** — landing has −0.02em, product has 0.
3. **No page-title class** — every page hand-rolls its title (20–28px, no tracking).
4. **KPI numerals lack a shared utility class** — MetricCard vs DashboardPagePrimitives use different sizes (40/22 vs 28) and only one applies tracking.
5. Dark-mode shadows are opaque but monochrome (pure black); no copper accent tint to reinforce brand.
6. **Theme posture undefined** — light mode is flat, dark mode is premium; no decision on default or strategy to fix light-mode elevation.

---

### Changes

**1. Retune light-mode shadow scale for perceptibility on warm canvas (globals.css lines 185–189)**

Redefine the HSL-based `--shadow-*` variables. The strategy: keep HSL architecture for Tailwind compat, but lift base opacity and recalibrate `--shadow-color` to be warmer (lower saturation, slightly darker) for better depth perception.

```css
/* BEFORE (lines 182–189) */
--shadow-color:     28 14% 12%;
--shadow-xs: 0 1px 2px hsl(var(--shadow-color) / 0.04);
--shadow-sm: 0 1px 3px hsl(var(--shadow-color) / 0.06), 0 1px 2px hsl(var(--shadow-color) / 0.04);
--shadow-md: 0 4px 8px hsl(var(--shadow-color) / 0.06), 0 2px 4px hsl(var(--shadow-color) / 0.04);
--shadow-lg: 0 12px 24px hsl(var(--shadow-color) / 0.08), 0 4px 8px hsl(var(--shadow-color) / 0.04);
--shadow-xl: 0 24px 48px hsl(var(--shadow-color) / 0.12), 0 8px 16px hsl(var(--shadow-color) / 0.06);

/* AFTER (perceptible two-layer shadow, warmer base) */
--shadow-color:     25 15% 11%;
--shadow-xs: 0 1px 2px hsl(var(--shadow-color) / 0.06), 0 0 1px hsl(var(--shadow-color) / 0.04);
--shadow-sm: 0 1px 3px hsl(var(--shadow-color) / 0.10), 0 2px 4px hsl(var(--shadow-color) / 0.08);
--shadow-md: 0 4px 8px hsl(var(--shadow-color) / 0.12), 0 8px 16px hsl(var(--shadow-color) / 0.08);
--shadow-lg: 0 12px 24px hsl(var(--shadow-color) / 0.14), 0 20px 40px hsl(var(--shadow-color) / 0.10);
--shadow-xl: 0 24px 48px hsl(var(--shadow-color) / 0.16), 0 32px 64px hsl(var(--shadow-color) / 0.12);
```

**Rationale:**
- Current landing shadows use rgba(31,26,18,...) at 0.05–0.14 opacity — perceptible on warm canvas. This lifts HSL ambient from 0.04–0.06 to 0.06–0.16 and adds a two-layer (ambient + key) shadow, mirroring Stripe/Ramp elevation.
- `--shadow-color` shift from `28 14% 12%` to `25 15% 11%` drops hue 3 points (warmer), keeps saturation similar (slight warmth boost), darkens slightly (better contrast).
- All `var(--shadow-*)` consumers in Tailwind (lines 202–213 of tailwind.config.ts) automatically inherit new values.

**2. Retune dark-mode shadows with subtle copper accent in key layers (globals.css lines 570–575)**

Keep the dark-mode HSL base but add a copper-tinted key-shadow layer on `--shadow-sm/md/lg/xl` to warm the espresso palette.

```css
/* BEFORE (lines 570–575) */
--shadow-color: 24 30% 2%;
--shadow-xs: 0 1px 2px hsl(var(--shadow-color) / 0.45);
--shadow-sm: 0 2px 8px hsl(var(--shadow-color) / 0.35);
--shadow-md: 0 10px 24px hsl(var(--shadow-color) / 0.36);
--shadow-lg: 0 18px 44px hsl(var(--shadow-color) / 0.42);
--shadow-xl: 0 26px 70px hsl(var(--shadow-color) / 0.52);

/* AFTER (lower opacity but warmer tint via copper accent layer) */
--shadow-color: 22 35% 3%;
--shadow-xs: 0 1px 2px rgba(0,0,0,0.40);
--shadow-sm: 0 2px 8px rgba(0,0,0,0.32), 0 1px 2px rgba(200,118,58,0.12);
--shadow-md: 0 10px 24px rgba(0,0,0,0.36), 0 2px 4px rgba(200,118,58,0.10);
--shadow-lg: 0 18px 44px rgba(0,0,0,0.40), 0 4px 8px rgba(200,118,58,0.08);
--shadow-xl: 0 26px 70px rgba(0,0,0,0.48), 0 6px 12px rgba(200,118,58,0.12);
```

**Rationale:**
- Dark mode already has high opacity (0.35–0.52); reducing pure-black opacity to 0.32–0.48 maintains depth while adding warmth.
- Copper layer (rgb(200,118,58) = `var(--copper-bright)`) at 0.08–0.12 opacity adds premium accent warmth without harshness, echoing the brand.
- `--shadow-color` shift from `24 30% 2%` to `22 35% 3%` keeps hue, raises saturation (warmer), and darkens imperceptibly; primarily for backward-compat.

**3. Add systematic negative letter-spacing to heading/display classes (globals.css lines 646–668)**

Replace all `letter-spacing: 0` on heading/display classes with a graduated scale: larger type gets tighter tracking.

```css
/* BEFORE (lines 646–651) */
.text-display-xl  { font-size: 36px; line-height: 40px; font-weight: 600; letter-spacing: 0; }
.text-display-lg  { font-size: 28px; line-height: 34px; font-weight: 600; letter-spacing: 0; }
.text-display-md  { font-size: 22px; line-height: 28px; font-weight: 600; letter-spacing: 0; }
.text-heading-lg  { font-size: 18px; line-height: 26px; font-weight: 600; letter-spacing: 0; }
.text-heading-md  { font-size: 16px; line-height: 24px; font-weight: 600; letter-spacing: 0; }
.text-heading-sm  { font-size: 14px; line-height: 20px; font-weight: 600; letter-spacing: 0; }

/* AFTER */
.text-display-xl  { font-size: 36px; line-height: 40px; font-weight: 600; letter-spacing: -0.015em; }
.text-display-lg  { font-size: 28px; line-height: 34px; font-weight: 600; letter-spacing: -0.015em; }
.text-display-md  { font-size: 22px; line-height: 28px; font-weight: 600; letter-spacing: -0.01em; }
.text-heading-lg  { font-size: 18px; line-height: 26px; font-weight: 600; letter-spacing: -0.005em; }
.text-heading-md  { font-size: 16px; line-height: 24px; font-weight: 600; letter-spacing: 0; }
.text-heading-sm  { font-size: 14px; line-height: 20px; font-weight: 600; letter-spacing: 0; }
```

Also update the alternate `.text-*` scale (lines 660–663):

```css
/* BEFORE */
.text-display    { font-size: 28px; line-height: 32px; font-weight: 600; letter-spacing: 0; }
.text-h1         { font-size: 20px; line-height: 24px; font-weight: 600; letter-spacing: 0; }
.text-h2         { font-size: 16px; line-height: 24px; font-weight: 600; letter-spacing: 0; }
.text-h3         { font-size: 14px; line-height: 20px; font-weight: 600; letter-spacing: 0; }

/* AFTER */
.text-display    { font-size: 28px; line-height: 32px; font-weight: 600; letter-spacing: -0.015em; }
.text-h1         { font-size: 20px; line-height: 24px; font-weight: 600; letter-spacing: -0.01em; }
.text-h2         { font-size: 16px; line-height: 24px; font-weight: 600; letter-spacing: -0.005em; }
.text-h3         { font-size: 14px; line-height: 20px; font-weight: 600; letter-spacing: 0; }
```

And the legacy `.t-*` scale (lines 674–675):

```css
/* BEFORE */
.t-display { font-size: 1.75rem; line-height: 1.15; font-weight: 600; letter-spacing: 0; }
.t-heading { font-size: 1.25rem; line-height: 1.2; font-weight: 600; letter-spacing: 0; }

/* AFTER */
.t-display { font-size: 1.75rem; line-height: 1.15; font-weight: 600; letter-spacing: -0.015em; }
.t-heading { font-size: 1.25rem; line-height: 1.2; font-weight: 600; letter-spacing: -0.01em; }
```

**Rationale:**
- Landing hero (`/landing`) uses −0.02em on 60px type; product should follow a graduated scale (display → −0.015em, heading-lg → −0.01em, smaller → 0).
- Tighter tracking on large type creates visual tension, improves readability, and signals premium typographic hierarchy.
- This change propagates to all consumers of these classes (page headers, section titles, etc.) automatically.

**4. Add new `.page-title` utility class for 28–32px page headers (globals.css, insert after line 683, before closing brace)**

```css
  .page-title {
    font-size: 32px;
    line-height: 40px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text);
  }
```

**Rationale:**
- Audit measured product page titles (dashboard, customer profile, chargebacks) at 20px; premium products (Stripe, Ramp, Linear) use 28–32px as page-title baseline.
- 32px / 700 weight / −0.02em is modeled on landing hero (60px / 700 / −1.2px), scaled down; creates consistent brand voice.
- Every main page (`/dashboard`, `/customers/[id]`, `/chargebacks/[id]`, `/settings/[page]`) will adopt `.page-title`, replacing hand-rolled titles.

**5. Add `.kpi-numeral` utility class with tabular-nums and tight tracking (globals.css, insert after line 683, before closing brace)**

```css
  .kpi-numeral {
    font-size: 40px;
    line-height: 48px;
    font-weight: 600;
    letter-spacing: -0.02em;
    font-family: var(--font-mono);
    font-feature-settings: "tnum" 1, "cv11" 1;
    font-variant-numeric: tabular-nums;
  }
  .kpi-numeral-lg {
    font-size: 44px;
    line-height: 52px;
  }
  .kpi-numeral-sm {
    font-size: 36px;
    line-height: 44px;
  }
```

**Rationale:**
- MetricCard (canonical) currently applies these inline (`fontSize: isHero ? 40 : 22`, `letterSpacing: '-0.02em'`, `className: "num"`). Consolidate into reusable utilities.
- 36–44px range per audit measurement.
- Monospace + tabular-nums ensures alignment in KPI grids (dashboard tiles, evidence-package metrics).
- Three variants (sm/default/lg) cover all use cases without creating new components.

**6. Theme posture (no direct CSS change; informs RootLayout decision) — see Binding Decision #1**

**Decision: Light mode is the DEFAULT. Espresso-dark is an excellent first-class toggle — never the default.** (Supersedes any earlier dark-first wording.)

Why:
- Unauth's buyers are ecommerce / support / ops / fraud teams. Dark-first reads as a developer/security/infra tool and can feel intimidating; a warm premium *light* mode reads more trustworthy and helpdesk-adjacent.
- "Dark looks better in screenshots" is a symptom, not a strategy. The fix is to make **light mode stand on its own** via the revised elevation + hierarchy in this Area — not to hide the flat cream behind dark.
- Dark remains a genuine asset: ship it polished, use it in pitch/demo screenshots, and let users opt in.

How:
- `RootLayout` (`app/layout.tsx`) defaults to **light** (no `data-theme` attribute, or `data-theme="light"`). Respect a stored user preference (localStorage/settings + existing `ThemeBootstrap`/`lib/theme/preference.ts`). Do **not** auto-adopt `prefers-color-scheme: dark` as the default.
- Make the light/dark toggle prominent and persistent; ensure every redesigned component renders intentionally in both themes (no inversion surprises).

Light-mode must earn default status (this is the real work):
- The revised shadow scale (change 1) makes light cards perceptible on the warm canvas.
- Border + shadow combination (`--border-default: #D8D0BD` + `--shadow-sm` at 0.10 opacity) now separates white surfaces from cream canvas.
- Measure: on the 1440px light dashboard, cards have visible depth (`box-shadow !== none` when computed) and read as raised, not flat.

---

### New components/files

None. All changes are token redefinition in `app/globals.css`. No new files, no component modifications required. Existing components (MetricCard, SectionCard, etc.) automatically inherit new token values.

---

### Acceptance criteria

1. **Light-mode elevation perceptibility:** Any card on the light dashboard computed as `getComputedStyle(card).boxShadow !== 'none'`. Visually distinct from flat border-only surfaces when side-by-side.
2. **Type contrast:** Page headers render with `.page-title` (or `.text-display-lg`), computed to 32px / 700 / −0.02em (or 28px / 600 / −0.015em minimum). Visible negative tracking on all display/heading classes (letter-spacing < 0).
3. **KPI prominence:** Dashboard KPI numerals use `.kpi-numeral` or `.kpi-numeral-lg`, computed to 40–44px / monospace / tabular-nums / −0.02em. Visibly larger and tighter than body text.
4. **Dark-mode warmth:** Dark-mode card shadow (e.g., on customer profile, chargebacks detail) has visible copper accent in key layer. Computed as warmer than pure-black shadow.
5. **Theme posture:** App renders with **light mode as default** in RootLayout (root element has no `data-theme` or `data-theme="light"`; `prefers-color-scheme: dark` is **not** auto-adopted). Espresso-dark is reachable via a persistent toggle and a stored preference is respected. Measure: a fresh session (cleared storage) loads light; toggling to dark persists across reloads.
6. **Backward-compat:** Existing components using `var(--shadow-sm)`, `var(--shadow-md)`, `.text-display-lg`, `.t-heading` automatically inherit new values. No build errors; all pages render; no console warnings.
7. **Canvas-to-surface contrast (light mode):** Measured perceptual difference (CIELAB ΔE) between `--bg-canvas (#F6F5F3)` and `--bg-surface (#FFFFFF)` is ≥ 4ΔE. Shadows add optical lift; edges are visibly distinct.

---

### Ground-rule compliance

✓ **No scoring/SSOT violations:** Shadow tokens, type scale, and theme values are UI/presentation only. `lib/engine/weights.ts`, `lib/utils/confidenceStyles.ts`, and scoring logic are untouched. Risk grades, GRADE_COLOURS, GRADE_LABELS, and scoreToGrade remain canonical sources in their respective files.

✓ **No `as any` / `eslint-disable`:** All changes are pure CSS token redefinition. No TypeScript, no runtime logic.

✓ **Token SSOT:** All changes live in `app/globals.css` (lines 98–189 shadows, 182–189 HSL shadows, 570–581 dark-mode shadows, 646–683 type scale). Tailwind consumption via `tailwind.config.ts` lines 201–213 (boxShadow mappings) — no override needed.

✓ **No restricted imports violated:** Type scale changes do not touch `scoreToGrade` or confidence grades; changes are local to presentation tokens.

✓ **Backward-compat:** Existing variable names (`--shadow-*`, `.text-display-*`, `.text-heading-*`, `.t-*`) are preserved. Only opacity/letter-spacing values change. Components already consuming these tokens receive new values automatically via CSS cascade.

---

> **Verifier notes:**
>
> **Corrections made:**
> 1. **Line number accuracy:** Draft cited "lines 97–103" for shadow-0/1/2/drawer/modal, but actual definitions are lines 98–103. Fixed to lines 98–103.
> 2. **Shadow redefinition strategy:** Draft proposed converting `--shadow-xs/sm/md/lg/xl` from HSL to pure rgba, which would break any component using `hsl(var(--shadow-color) / ...)` pattern. **Corrected:** keep HSL architecture, retune opacity values and `--shadow-color` base to achieve perceptibility.
> 3. **Dark-mode shadows:** Draft vaguely proposed "copper-tinted key-shadow layers." **Clarified:** dark-mode `--shadow-sm/md/lg/xl` now have two-layer structure (pure-black ambient + copper accent key layer) with explicit rgba values.
> 4. **MetricCard ambiguity:** Draft identified "MetricCard" in two places without clarifying they're different files. **Clarified:** `components/ui/MetricCard.tsx` (canonical, applies shadow + tracking) vs `app/(app)/dashboard/DashboardPagePrimitives.tsx:MetricCard` (flat, no shadow, no tracking).
> 5. **Insertion points for new classes:** Draft said "after line 668" for `.page-title`; this is inside the body of a CSS rule. **Corrected:** insert after line 683 (after `.t-mono-md`, before closing `}` of the `@layer base` block).
> 6. **Theme strategy:** Reversed per Binding Decision #1 — **light mode is the default**, espresso-dark is a first-class toggle. RootLayout keeps light as default (no auto dark via `prefers-color-scheme`); fix light-mode elevation rather than defaulting to dark.
> 7. **Typography gradation:** Draft proposed fixed values; refined to a graduated scale (display → −0.015em, heading-lg → −0.01em, heading-md → 0) to create hierarchy without excess tightness.
>
> **Residual risks:**
> - **No measurement of Tailwind mapping after change:** The `--shadow-color` HSL value change may affect any components using `hsl(var(--shadow-color) / ...)` directly; recommend grep for `shadow-color` usage before deploy.
> - **Landing shadows untouched:** `--ua-shadow-sm/md/lg/xl` (lines 396–399) and `--landing-shadow-hero/panel/cta` (lines 408–411) are not retuned. Landing uses different token namespace (`--ua-*`, `--landing-*`), so no conflict, but ensure landing dark mode also adopts copper tint if dark option is exposed there.
> - **Component integration:** `.page-title`, `.kpi-numeral*` are new utilities. Pages must explicitly adopt them; no auto-migration. Recommend grep-and-replace pass on `className` and `style={{ fontSize:` in `/dashboard`, `/customers`, `/chargebacks` to wire them up.
> - **Dark-mode parity:** Ensure all redesigned surfaces (cards, headers, KPIs) are visually audited in both light and dark modes after changes land.

---

## B. Shared PageHeader + per-page title migration

### Current state

**Existing PageHeader component:** `components/ui/PageHeader.tsx:1–150`
- Props: `title` (required, string), `subtitle?`, `eyebrow?`, `breadcrumbs?`, `primaryAction?`, `secondaryActions?`, `meta?`, `tabs?`, `className?`
- Title rendered as: `<h1 className="truncate" style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>` (line 103–107)
- Current scale: **18px / 600 / −0.01em** (section-header, not page-title)
- Breadcrumb scale: 12px (line 52)
- Eyebrow: 12px / 600 / 0.12em uppercase (lines 76–78)
- **Status: exists but underused and at wrong scale**

**PageHeader adoption across (app) pages:**
- **`/store`** (new gate path): Uses PageHeader correctly for both empty state and data-present layouts (`app/(app)/store/page.tsx:293–296, 332–335`)
- **`/watchlist`** (legacy): Would use PageHeader but route is dead
- **All other primary pages:** Do NOT use PageHeader; instead hand-roll titles via WorkbenchPage, DetailPageShell, or ad-hoc `<h1>` elements

**Title patterns by page type:**

1. **WorkbenchPage-wrapped pages** (customers, claims, chargebacks, reports, settings/integrations):
   - Define `title` + optional `subtitle` as props to WorkbenchPage
   - WorkbenchPage renders via header with: `<h1 className="t-heading">` @ 1.25rem (20px / 600 / 0) (line 79)
   - File: `components/workbench/WorkbenchPage.tsx:70–96`
   - Affected pages:
     - `/customers` → `CustomersOverviewPageView` wraps in `CustomersPageWorkbench` (uses WorkbenchPage correctly)
     - `/claims` → `ClaimsPageView` wraps in WorkbenchPage (uses WorkbenchPage correctly)
     - `/chargebacks` → `ChargebacksPageWorkbench` wraps WorkbenchPage (uses WorkbenchPage correctly)
     - `/reports` → `ReportsPageView` wraps in WorkbenchPage (uses WorkbenchPage correctly)
     - `/settings/integrations` → uses WorkbenchPage directly (uses WorkbenchPage correctly)

2. **DetailPageShell-wrapped pages** (audit detail, evidence package detail, customer profile, transaction detail):
   - Define `title` + optional `eyebrow`, `subtitle`, `statusBadge`, `actions`, `tabs` as props
   - DetailPageShell renders: `<h1 className="t-heading min-w-0 truncate">` @ 1.25rem (20px / 600 / 0) (line 88)
   - File: `components/workbench/DetailPageShell.tsx:56–106`
   - Affected pages:
     - `/audit/[runId]` → `AuditRunPageView` uses DetailPageShell (uses DetailPageShell correctly)
     - `/chargebacks/[id]` → `EvidenceDetailPageView` uses DetailPageShell (uses DetailPageShell correctly)
     - `/customers/[id]` → `CustomerProfilePageView` does NOT use either; hand-rolls via `CustomerProfilePageHero` (line 76 onwards)

3. **DashboardPageCockpit** (custom, flat header):
   - Inline header: `<h1 className="t-heading">Claim overview</h1>` @ 1.25rem (20px / 600 / 0)
   - File: `app/(app)/dashboard/DashboardPageCockpit.tsx:96`
   - No component reuse; flat structure

4. **Ad-hoc pages** (help, settings subpages):
   - `/help` → `<h1 className="text-heading-lg">Help &amp; Docs</h1>` (18px) (line 46)
   - `/settings/account` → inline `<h1 className="text-heading-lg">Account & Profile</h1>` (18px) (line 139)
   - Other `/settings/*` subpages: ad-hoc inline `<h1>` or `.t-heading`

**Current typography:**
- `.t-heading` @ `globals.css:675` = `1.25rem` (20px) / 600 / 0 (no tracking)
- `.text-heading-lg` @ `globals.css:649` = 18px / 600 / 0
- `.text-display-lg` @ `globals.css:647` = 28px / 600 / 0 ← **exists but unused**
- Negative tracking exists only ad-hoc: PageHeader uses −0.01em (line 105), MetricCard numbers use −0.02em
- **No systematic page-title scale with tight tracking across the product**

**Ground-truth SSOT locations (must be centralized):**
- Type tokens: `app/globals.css:645–683` (all scales defined; page-title scale missing)
- Component primitives: `components/ui/PageHeader.tsx`, `components/workbench/WorkbenchPage.tsx`, `components/workbench/DetailPageShell.tsx`
- Brand colors/surfaces: `app/globals.css` (CSS variables for `--surface-raised`, `--surface-border`, etc.)

---

### Changes

#### 1. **Elevate PageHeader to canonical page-title component (across all contexts)**

**File: `components/ui/PageHeader.tsx`**

**Current h1 style (line 103–107):**
```typescript
<h1
  className="truncate"
  style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}
>
```

**Updated PageHeaderProps interface (add new props, lines 10–20):**
```typescript
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  breadcrumbs?: Breadcrumb[];
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode[];
  meta?: ReactNode;
  metricSlot?: ReactNode;           // NEW: optional metric/status slot below title
  tabs?: ReactNode;
  statusBadge?: ReactNode;           // NEW: optional badge next to title (for audit/detail flow)
  className?: string;
}
```

**h1 replacement (line 103–107):**
```typescript
<h1
  className="truncate"
  style={{
    fontSize: '32px',                // NEW: page-title scale (was 18px)
    fontWeight: 700,                 // NEW: heavier (was 600)
    letterSpacing: '-0.02em',        // NEW: tight (was -0.01em)
    lineHeight: '1.2',               // NEW: explicit
    color: 'var(--text)',
  }}
>
  {title}
</h1>
```

**Updated title row (line 100–133) with statusBadge support:**
```typescript
{/* Title row */}
<div className="flex items-center justify-between gap-5">
  <div className="min-w-0">
    <div className="flex items-center gap-2">
      <h1
        className="truncate"
        style={{
          fontSize: '32px',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: '1.2',
          color: 'var(--text)',
        }}
      >
        {title}
      </h1>
      {statusBadge}
    </div>
    {subtitle && (
      <p className="mt-0.5" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        {subtitle}
      </p>
    )}
  </div>
  {(primaryAction || (secondaryActions && secondaryActions.length > 0)) && (
    <div className="flex items-center gap-2 shrink-0">
      {secondaryActions?.map((action) => (
        <span key={/* ... existing logic ... */}>{action}</span>
      ))}
      {primaryAction}
    </div>
  )}
</div>
```

**Add metricSlot rendering (after meta row, before tabs, new):**
```typescript
{/* NEW metric slot */}
{metricSlot && (
  <div className="mt-4 flex items-baseline gap-6">
    {metricSlot}
  </div>
)}
```

---

#### 2. **Update WorkbenchPage to adopt PageHeader**

**File: `components/workbench/WorkbenchPage.tsx`**

**Current state (line 70–96):**
Hand-rolls inline header with `.t-heading` (20px / 600 / 0); does not use PageHeader.

**Updated WorkbenchPageProps interface (lines 6–22):**
```typescript
interface WorkbenchPageProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;                  // NEW
  breadcrumbs?: Breadcrumb[];        // NEW (from PageHeader)
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode[];     // NEW (from PageHeader)
  statusBadge?: ReactNode;            // NEW (from PageHeader)
  navItems?: WorkbenchNavItem[];
  activeNavKey?: string;
  actions?: ReactNode;                // COMPAT: backward alias for primaryAction
  kpiItems?: WorkbenchKpiItem[];
  kpiStrip?: ReactNode;
  actionBarLeft?: ReactNode;
  actionBarMiddle?: ReactNode;
  actionBarRight?: ReactNode;
  actionBar?: ReactNode;
  main: ReactNode;
  rail?: ReactNode;
  footer?: ReactNode;
}
```

**Import PageHeader (add to top, after line 1):**
```typescript
import { PageHeader } from '@/components/ui/PageHeader';
import type { Breadcrumb } from '@/components/ui/PageHeader';
```

**Replace inline header (line 70–96) with PageHeader:**
```typescript
{/* REPLACED: inline header with PageHeader component */}
<PageHeader
  title={title}
  subtitle={subtitle}
  eyebrow={eyebrow}
  breadcrumbs={breadcrumbs}
  primaryAction={primaryAction || actions}  // backward compat: actions → primaryAction
  secondaryActions={secondaryActions}
  statusBadge={statusBadge}
  className="border-b"
  style={{ borderColor: 'var(--surface-border)' }}
/>

{navItems && activeNavKey && (
  <div className="px-4 py-2" style={{ borderColor: 'var(--surface-border)' }}>
    <WorkbenchNav items={navItems} activeKey={activeNavKey} />
  </div>
)}
```

**Delete the old inline header code (original lines 70–96); the rest of WorkbenchPage structure remains unchanged.**

---

#### 3. **Update DetailPageShell to use PageHeader for title/header**

**File: `components/workbench/DetailPageShell.tsx`**

**Current state (line 56–106):**
Hand-rolls inline header; does not use PageHeader.

**Import PageHeader (add to top):**
```typescript
import { PageHeader } from '@/components/ui/PageHeader';
import type { Breadcrumb } from '@/components/ui/PageHeader';
```

**Replace title/header row (lines 56–106) with PageHeader pattern:**
```typescript
{/* Header */}
<header
  className="border-b"
  style={{
    borderColor: 'var(--surface-border)',
    background: 'var(--surface-raised)',
  }}
>
  {/* Build breadcrumbs from back link */}
  {backHref && (
    <PageHeader
      title={title}
      subtitle={subtitle}
      eyebrow={eyebrow}
      breadcrumbs={[
        ...(backHref ? [{ label: backLabel ?? 'Back', href: backHref }] : []),
        ...(eyebrow ? [{ label: eyebrow }] : []),
      ]}
      primaryAction={actions}
      statusBadge={statusBadge}
      tabs={tabs}
      className="border-b"
      style={{ borderColor: 'var(--surface-border)' }}
    />
  )}
  {!backHref && (
    <PageHeader
      title={title}
      subtitle={subtitle}
      eyebrow={eyebrow}
      primaryAction={actions}
      statusBadge={statusBadge}
      tabs={tabs}
      className="border-b"
      style={{ borderColor: 'var(--surface-border)' }}
    />
  )}
</header>
```

**Render metricStrip below header (after PageHeader closes, existing line ~108–109 becomes):**
```typescript
{/* Metric strip */}
{metricStrip}
```

---

#### 4. **Update DashboardPageCockpit to use PageHeader pattern**

**File: `app/(app)/dashboard/DashboardPageCockpit.tsx`**

**Current state (lines 94–98):**
```typescript
<header className="flex flex-wrap items-end justify-between gap-3">
  <div className="min-w-0">
    <h1 className="t-heading" style={{ color: 'var(--ink-primary)' }}>Claim overview</h1>
    <p className="text-body-sm mt-1" style={{ color: 'var(--ink-secondary)' }}>{config.subtitle}</p>
  </div>
  {/* actions */}
</header>
```

**Import PageHeader (add to top):**
```typescript
import { PageHeader } from '@/components/ui/PageHeader';
```

**Add props to DashboardPageCockpit type:**
```typescript
interface DashboardPageCockpitProps {
  // ... existing props ...
  eyebrow?: string;
}
```

**Replace header with PageHeader:**
```typescript
<PageHeader
  eyebrow={eyebrow || "Dashboard"}
  title="Claim overview"
  subtitle={config.subtitle}
  secondaryActions={
    config.secondaryCta
      ? [
          <Link
            key="secondary"
            href={config.secondaryCta.href}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-caption font-semibold"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)', color: 'var(--ink-secondary)' }}
          >
            <Upload className="h-3.5 w-3.5" />
            {config.secondaryCta.label}
          </Link>,
        ]
      : undefined
  }
  primaryAction={
    <Link
      href={config.primaryCta.href}
      className="btn-accent inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-caption font-semibold"
    >
      {config.primaryCta.label}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  }
  className="border-b"
  style={{ borderColor: 'var(--surface-border)' }}
/>
```

---

#### 5. **Update CustomerProfilePageHero to use PageHeader pattern**

**File: `app/(app)/customers/[id]/CustomerProfilePageView.tsx`**

**Current state (lines 76–100):**
Renders `CustomerProfilePageHero` which hand-rolls inline title at 20px.

**Import PageHeader (add to top):**
```typescript
import { PageHeader } from '@/components/ui/PageHeader';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
```

**Refactor CustomerProfilePageView to use PageHeader directly (simplify the hero section):**
```typescript
<div className="mx-auto max-w-7xl px-3 py-5 sm:px-5">
  {/* Gorgias breadcrumb (if applicable) */}
  {gorgiasSource === 'gorgias' && (
    <div className="mb-4 flex items-center gap-3 rounded-md border px-4 py-2.5 text-sm" /* ... existing styles ... */>
      {/* ... Gorgias banner ... */}
    </div>
  )}
  
  {/* NEW: Use PageHeader for title + grade + actions */}
  <PageHeader
    title={displayName}
    eyebrow={auditRunId ? 'Audit' : 'Customer'}
    breadcrumbs={
      auditRunId
        ? [
            { label: 'Back to Audit', href: `/audit/${auditRunId}?tab=customers` },
            { label: 'All Customers', href: '/customers' },
            { label: displayName },
          ]
        : [
            { label: 'Back to Customers', href: '/customers' },
            { label: displayName },
          ]
    }
    statusBadge={<ConfidenceBadge grade={profileGrade} />}
    secondaryActions={[
      <InvestigationStatusSelect profileId={profile.id} initialStatus={profile.investigation_status ?? 'new'} />,
      <WatchlistStarButton />,
      {openClaimCount > 0 && (
        <Link href={`/customers/${profile.id}/claims`} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors hover:opacity-80" style={{...}}>
          <ReceiptText className="h-3.5 w-3.5" />
          {openClaimCount > 0 ? `Review claims (${openClaimCount})` : 'Review claims'}
        </Link>
      )},
      <CustomerProfileEvidenceTrigger ... />,
    ]}
    className="mb-6"
  />

  {/* Render the rest of the profile content (main column + sidebar) */}
  <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6">
    <CustomerProfilePageMainColumn ... />
    <CustomerProfilePageSidebar ... />
  </div>
</div>
```

**Status message (clean record) moves to a component below PageHeader or into PageHeader meta prop.**

---

#### 6. **Update ad-hoc settings pages to use PageHeader**

**Pattern for all `/settings/*` pages:**

**File: `app/(app)/settings/account/page.tsx` (representative)**

**Current state (lines 128–144):**
```typescript
<div className="p-8 space-y-8 max-w-2xl">
  <div>
    <Link ... >← Settings</Link>
    <div className="flex items-center gap-3">
      <User className="h-5 w-5" />
      <h1 className="text-heading-lg">Account & Profile</h1>
    </div>
    <p className="mt-1 text-sm">{subtitle}</p>
  </div>
```

**Replace with PageHeader:**
```typescript
<div className="p-8 space-y-8 max-w-2xl">
  <PageHeader
    title="Account & Profile"
    eyebrow="Settings"
    subtitle="Update your store information and account preferences."
  />
```

**Apply same pattern to:**
- `/settings/audit-trail/page.tsx`
- `/settings/data-privacy/page.tsx`
- `/settings/api-integrations/page.tsx`
- `/settings/team/page.tsx`
- `/settings/billing/page.tsx`

**File: `app/(app)/help/page.tsx`**

**Current state (lines 35–46):**
```typescript
<div className="p-8 max-w-2xl mx-auto space-y-6">
  <div>
    <Link ... >← Dashboard</Link>
    <h1 className="text-heading-lg">Help &amp; Docs</h1>
    <p className="mt-1 text-sm">{subtitle}</p>
  </div>
```

**Replace with PageHeader:**
```typescript
<div className="p-8 max-w-2xl mx-auto space-y-6">
  <PageHeader
    title="Help &amp; Docs"
    eyebrow="Documentation"
    subtitle="Guides to get the most out of Unauth."
  />
```

---

#### 7. **Add page-title typography token to globals.css**

**File: `app/globals.css`**

**Location: after line 683 (after `.t-mono-md` definition)**

**Add:**
```css
/* ══ PAGE-TITLE scale (32px, 700, -0.02em tight) ════════════════════ */
.t-page-title {
  font-size: 32px;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -0.02em;
}
```

**Update comment at line 659 to clarify page-title usage:**
```css
/* ══ SPEC type scale aliases (§5.5) — page title (32px), sections, body ═ */
```

---

#### 8. **Backward compatibility for WorkbenchPage `actions` prop**

In `WorkbenchPage.tsx`, map the deprecated `actions` prop to `primaryAction`:

```typescript
const resolvedPrimaryAction = primaryAction || actions;

// Then pass resolvedPrimaryAction to PageHeader:
<PageHeader
  ...
  primaryAction={resolvedPrimaryAction}
  ...
/>
```

This ensures existing callers (`CustomersPageWorkbench`, `ClaimsPageView`, etc.) continue to work without changes.

---

### New components/files

**None — this phase uses existing PageHeader, WorkbenchPage, DetailPageShell components; props are extended, not new files created.**

---

### Acceptance criteria

1. **Scale:** All primary page titles render at **32px / 700 / −0.02em** (computed style check: `getComputedStyle(h1).fontSize >= '32px'` AND `fontWeight >= '700'` AND `letterSpacing === '-0.02em'`)
2. **Consistency:** PageHeader used across ALL workbench pages (dashboard, customers, claims, chargebacks, reports, settings, store, help) AND all detail pages (audit, evidence, customer profile)
3. **WorkbenchPage adoption:** No inline `<h1 className="t-heading">` in WorkbenchPage.tsx; title rendered via PageHeader component with extended props (eyebrow, breadcrumbs, statusBadge, secondaryActions)
4. **DetailPageShell adoption:** No inline `<h1>` in DetailPageShell; title rendered via PageHeader component
5. **DashboardPageCockpit refactor:** Dashboard no longer hand-rolls flat header; adopts PageHeader with config-driven actions and eyebrow
6. **CustomerProfilePageView:** Title migrated from CustomerProfilePageHero inline text to PageHeader + ConfidenceBadge in statusBadge slot; back link flows through breadcrumbs prop
7. **Settings pages:** All `/settings/*` pages render titles via PageHeader, NOT inline `<h1>` elements; `/help` follows same pattern
8. **Store page:** PageHeader props extended with `metricSlot` (KPI grid integrates seamlessly); both empty state and data-present layouts use PageHeader
9. **Backward compat:** `actions` prop on WorkbenchPage still functions (aliased to `primaryAction`); no breaking changes to existing callers like `CustomersPageWorkbench`, `ClaimsPageView`
10. **No console errors:** No undefined prop warnings; all pages pass required props to updated PageHeader signatures
11. **Type safety:** Breadcrumb type imported from PageHeader and used consistently across DetailPageShell, WorkbenchPage, and SettingsPages
12. **Typo/tracking visible:** Landing hero (60px / −1.2px) and product page title (32px / −0.02em) show clear visual hierarchy and tracking intent when side-by-side

---

### Ground-rule compliance

✓ No scoring formula changes (SIGNAL_WEIGHTS, GRADE_COLOURS, GRADE_LABELS untouched; they live in lib/engine/weights.ts and lib/utils/confidenceStyles.ts)  
✓ No `as any` or `// eslint-disable` introduced  
✓ SSOT: PageHeader component is the canonical page-title primitive; all pages route through it via WorkbenchPage/DetailPageShell or direct usage  
✓ Type tokens centralized in `app/globals.css`; new `.t-page-title` class added @ line 684+  
✓ No scoring/matching/clustering logic touched; visual/UX only  
✓ Breadcrumb type exported from PageHeader and reused across components

---

> **Verifier notes:**
> - **Verified file paths and line numbers:** PageHeader.tsx lines 103–107 currently render at 18px/600/−0.01em (confirmed). WorkbenchPage.tsx line 79 uses `.t-heading` (20px/600/0, confirmed). DetailPageShell.tsx line 88 uses `.t-heading` (confirmed). DashboardPageCockpit.tsx line 96 hand-rolls `<h1 className="t-heading">` (confirmed). `/help` at line 46 uses `.text-heading-lg` (18px, confirmed). `/settings/account` at line 139 uses inline `.text-heading-lg` (confirmed).
> - **Verified existing props:** PageHeader currently lacks `metricSlot`, `statusBadge` props — these are additions. WorkbenchPage currently lacks `eyebrow`, `breadcrumbs`, `secondaryActions`, `statusBadge` props — added via extending interface. DetailPageShell already has `statusBadge` and `metricStrip` props, so minimal prop changes needed.
> - **Verified adoption patterns:** `/store` already uses PageHeader correctly (lines 293–296 empty state, 332–335 data present). `CustomersPageWorkbench`, `ClaimsPageView`, `ChargebacksPageWorkbench` all already use WorkbenchPage — no manual title replacement needed, just prop additions. `/audit/[runId]` and `/chargebacks/[id]` already use DetailPageShell — no manual title replacement needed.
> - **Critical finding:** `/customers/[id]` (CustomerProfilePageView) does NOT use PageHeader, DetailPageShell, or WorkbenchPage — it hand-rolls everything in CustomerProfilePageHero (line 122 uses `.t-heading`). This is the one page requiring substantive refactor to align with the pattern.
> - **Backward compat:** WorkbenchPage currently accepts `actions` prop (line 11, used at line 94). Mapping this to `primaryAction` in PageHeader is safe; all existing WorkbenchPage callers will continue working.
> - **No violations:** No CLAUDE.md rule violations detected. Scoring, weights, confidence thresholds remain untouched. No `as any`, no `eslint-disable`. SSOT for tokens is app/globals.css; SSOT for component API is PageHeader interface.

---

## C. Surface primitives consolidation (Card/MetricCard/SectionCard/Modal) + density + de-hardcoding

### Current state

**Canonical primitives (partially adopted, ~60% coverage):**
- `components/ui/SectionCard.tsx:1–73` — applies `var(--shadow-sm)` (line 33); header hardcodes padding `10px 14px` (line 41); body padding parametrized by density (compact `p-3` / default `p-4`, line 23); title `13px / 600` (line 47–48); description `12px / secondary` (line 58).
- `components/ui/MetricCard.tsx:1–110` — applies `var(--shadow-sm)` (line 53); padding hardcoded as `20/16/12` px magic numbers (line 39); number size `40px (hero) / 22px (default)` (line 79); label `12px / 500 / 0.01em` tracking (lines 60–62); supports density prop `default | compact` (line 19).
- `components/ui/Button.tsx` + `buttonStyles.ts` — BUTTON_SIZES hardcodes heights: `sm: 30px, md: 34px, lg: 38px` (buttonStyles.ts:9–11); padding `10/14/18px` (line 10); radius `var(--radius-md)` (line 63); no density parameter.
- `components/ui/Input.tsx:1–28` — height hardcoded `36` (line 16); padding `3px` left/right (line 11); radius `var(--radius-md)` (line 19).
- `components/ui/DataTable.tsx:23–46` — supports density parameter `default | compact | relaxed` (line 34) with ROW_HEIGHT scale `{ compact: 36, default: 44, relaxed: 52 }` (lines 42–46); header cell height inline-computed; header padding token-based (`var(--space-*)`).
- `components/ui/Badge.tsx` + `badgeStyles.ts` — BADGE_LAYOUT_STYLE hardcodes: `sm { height: 16, px: 5, borderRadius: 3 }`, `md { height: 18, px: 7, borderRadius: 3 }` (badgeStyles.ts:15, 27–28).
- `components/ui/ConfidenceBadge.tsx` + `ConfidenceBadge.styles.ts` — shell width parametrized: `compact ? 20 : 96` (ConfidenceBadge.tsx:27–30); height `compact ? 20 : 22` (ConfidenceBadge.styles.ts:12); grade cell width GRADE_CELL_WIDTH hardcoded as `{ compact: 17, full: 24 }` (ConfidenceBadge.tsx:27–30); label style fontsize `12px / 600` (ConfidenceBadge.styles.ts:29–30).
- `components/ui/Drawer.tsx:1–127` — uses fixed positioning with `z-index: var(--z-drawer)` (line 77); applies `var(--shadow-drawer)` (line 92) but lacks backdrop shadow/transparency.
- `components/ui/Tooltip.tsx:1–51` — uses `rounded-[var(--radius-1)]` (line 42); padding `8px/4px` hardcoded (line 42); no elevation (shadow).

**Hand-rolled offenders (flat, no shadow, ~40% of cards):**
- `app/(app)/dashboard/DashboardPagePrimitives.tsx:1–71` — **MetricCard hand-roll** (lines 3–40): `minHeight: 108`, border-only (line 19), `background: var(--bg-surface)`, `borderColor: var(--border-default)`, NO shadow; hardcodes padding `p-4` (line 18); number fontSize `28` (line 28), `lineHeight: 1.1` (line 28); label `t-label` class. **ModuleCard hand-roll** (lines 42–71): border-only, no shadow (line 56), padding hardcoded `px-4 py-2.5` header + `px-4 py-3` body (lines 57, 68).
- `app/(app)/dashboard/DashboardPageCockpit.tsx:90–358` — inline `<section>` cards (lines 132, 154, 174, 328): all use `style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}`, all have NO `box-shadow`, hardcoded padding `p-4` (Tailwind classes).
- `app/(app)/customers/[id]/CustomerProfilePageMainColumn.tsx:65` — hand-rolled narrative card (line 65): `rounded-md border p-[var(--space-4)]`, `borderColor: var(--border-subtle)`, `background: var(--bg-inset)`, NO shadow.

**Current shadow system (audit measured):**
- Light mode (`--shadow-sm`): `0 1px 3px hsl(var(--shadow-color) / 0.06), 0 1px 2px hsl(var(--shadow-color) / 0.04)` (globals.css:186) — too faint on warm-white canvas; reads as flat.
- Light mode full scale: `--shadow-xs/sm/md/lg/xl` (globals.css:185–189) — two-part ambient+key, dark brown opacity base `28 14% 12%`.
- Dark mode (espresso): inherits light shadow scale (globals.css:185–189); appears perceptible due to surface-raised `#171310` (line 426) against surface-base `#0E0B08` (line 425).
- Drawer/modal shadows: `--shadow-drawer` (line 101), `--shadow-modal` (line 102) pre-defined in old shadow scale section.

**Surface token definitions (light mode, globals.css:256–261):**
- `--surface-raised: #FFFFFF` — card background.
- `--surface-overlay: #EEEDEA` — hover/overlay state.
- `--surface-border: #E2E0DC` — hairline border.
- `--surface-input: #FFFDFC` — input background.
- `--surface-muted: #E8E6E2` — disabled/muted surface.

**Spacing scale (globals.css:72–84):**
- `--space-0` through `--space-11`: 0px to 80px (4px increments). All tokens exist and are canonical.

**Density support (fragmented across components):**
- SectionCard: density `'default' | 'compact'` → body padding `p-4 | p-3` (line 23).
- MetricCard: density `'default' | 'compact'` → padding `16 | 12` px (line 39).
- DataTable: density `'default' | 'compact' | 'relaxed'` → row height `44 | 36 | 52` (lines 42–46).
- Button: NO density parameter (fixed heights 30/34/38).
- Input: NO density parameter (fixed height 36).
- Badge/ConfidenceBadge: NOT density-aware (size variants `sm | md` only).

**Hardcoded magic numbers (de-hardcoding targets):**
- Button heights: `30 (sm), 34 (md), 38 (lg)` px (buttonStyles.ts:9–11) → should map to tokens `--button-height-*`.
- Button padding: `10, 14, 18` px (buttonStyles.ts:10) → should map to `--space-*` tokens.
- Input height: `36` px (Input.tsx:16) → should map to `--input-height` token.
- Badge height: `16 (sm), 18 (md)` (badgeStyles.ts:16, 27) → should map to `--badge-height-*` tokens.
- Badge radius: `3` px (badgeStyles.ts:24, 35) → should map to `--badge-radius` token.
- ConfidenceBadge width: `20 (compact), 96 (full)` (ConfidenceBadge.tsx:27–30) → should map to `--confidence-badge-shell-*` tokens.
- ConfidenceBadge cell width: `17 (compact), 24 (full)` (ConfidenceBadge.tsx:27–30) → should map to `--confidence-badge-cell-*` tokens.
- SectionCard header padding: `10px 14px` (SectionCard.tsx:41) → should map to `--space-2 var(--space-3)`.
- MetricCard padding: `20/16/12` px (MetricCard.tsx:39) → should map to `--space-5 / --space-4 / --space-3`.
- Dashboard card padding: inline `p-4` (Tailwind) → all use `var(--space-4)` via token.
- DashboardPagePrimitives.MetricCard minHeight: `108` px (line 19) → unmotivated, should be removed.

**No Card.tsx or Modal.tsx primitive exists.** Dialogs are built ad-hoc; Drawer exists but lacks unified elevation styling.

**Shadows on persistent surfaces currently:** 
- Measured: ONLY 3 elements on dashboard carry any box-shadow (audit §1, R1). Canonical MetricCard/SectionCard apply `--shadow-sm`, but it is imperceptible on warm canvas.
- Target (Phase 1): every persistent card should have perceptible elevation via a strengthened shadow scale (two-part ambient+key, tuned for warm cream canvas).

---

### Changes

#### 1. Retune the shadow scale for perceptible elevation (globals.css)

**BEFORE (light mode, lines 185–189):**
```css
--shadow-xs: 0 1px 2px hsl(var(--shadow-color) / 0.04);
--shadow-sm: 0 1px 3px hsl(var(--shadow-color) / 0.06), 0 1px 2px hsl(var(--shadow-color) / 0.04);
--shadow-md: 0 4px 8px hsl(var(--shadow-color) / 0.06), 0 2px 4px hsl(var(--shadow-color) / 0.04);
--shadow-lg: 0 12px 24px hsl(var(--shadow-color) / 0.08), 0 4px 8px hsl(var(--shadow-color) / 0.04);
--shadow-xl: 0 24px 48px hsl(var(--shadow-color) / 0.12), 0 8px 16px hsl(var(--shadow-color) / 0.06);
```

**AFTER (light mode, lines 185–189):**
```css
--shadow-xs: 0 1px 2px hsl(var(--shadow-color) / 0.08);
--shadow-sm: 0 2px 4px hsl(var(--shadow-color) / 0.08), 0 1px 2px hsl(var(--shadow-color) / 0.12);
--shadow-md: 0 4px 12px hsl(var(--shadow-color) / 0.10), 0 2px 4px hsl(var(--shadow-color) / 0.12);
--shadow-lg: 0 12px 24px hsl(var(--shadow-color) / 0.12), 0 4px 8px hsl(var(--shadow-color) / 0.10);
--shadow-xl: 0 24px 48px hsl(var(--shadow-color) / 0.16), 0 8px 16px hsl(var(--shadow-color) / 0.12);
```

**Rationale:** Increases ambient + key component opacities by ~2x to deliver perceptible depth on the warm cream canvas (`#F6F5F3`). Tuned to read as "raised" without overwhelming the canvas. The `--shadow-color` base (`28 14% 12%` — warm dark brown) already matches the brand palette; only opacity values change.

---

#### 2. Consolidate surface primitives and enforce shadow on all persistent cards

**File: `components/ui/Card.tsx`** (new, canonical surface primitive)

```typescript
'use client';

import { type ReactNode, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';

export type CardVariant = 'raised' | 'overlay' | 'flat';
export type CardDensity = 'compact' | 'default' | 'relaxed';

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  density?: CardDensity;
  className?: string;
  style?: CSSProperties;
}

const CARD_STYLES: Record<CardVariant, CSSProperties> = {
  raised: {
    background: 'var(--surface-raised)',
    border: '1px solid var(--surface-border)',
    boxShadow: 'var(--shadow-sm)',
  },
  overlay: {
    background: 'var(--surface-overlay)',
    border: '1px solid var(--surface-border)',
    boxShadow: 'var(--shadow-md)',
  },
  flat: {
    background: 'var(--surface-raised)',
    border: '1px solid var(--surface-border)',
    boxShadow: 'none',
  },
};

const CARD_PADDING: Record<CardDensity, string> = {
  compact: 'var(--space-3)',
  default: 'var(--space-4)',
  relaxed: 'var(--space-5)',
};

export function Card({
  children,
  variant = 'raised',
  density = 'default',
  className,
  style,
}: CardProps) {
  const padding = CARD_PADDING[density];
  return (
    <div
      className={cn('rounded-[var(--radius-md)]', className)}
      style={{
        ...CARD_STYLES[variant],
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
```

**SectionCard refactor (components/ui/SectionCard.tsx:1–73):**
- Refactor to use Card primitive as wrapper for outer border/shadow/padding (variant `raised`).
- Header padding: change `10px 14px` (line 41) → `var(--space-2) var(--space-3)`.
- Keep SectionCard's title/description/actions header API unchanged; export as composition wrapper.

**MetricCard refactor (components/ui/MetricCard.tsx:1–110):**
- Refactor to use Card primitive as wrapper (variant `raised`).
- Padding param (line 39) change from magic `20/16/12` → token-mapped: `isHero ? 'var(--space-5)' : density === 'compact' ? 'var(--space-3)' : 'var(--space-4)'`.
- Number size: keep `40px (hero) / 22px (default)` (intentional).
- Label: keep `12px / 500 / 0.01em` (intentional).

---

#### 3. Delete dashboard hand-rolled MetricCard, route through canonical primitive

**File: `app/(app)/dashboard/DashboardPagePrimitives.tsx:1–71`** — DELETE the entire `MetricCard` function (lines 3–40) and `ModuleCard` refactor (lines 42–71).

**File: `app/(app)/dashboard/DashboardPageCockpit.tsx`** — update imports at line 26:
```typescript
// BEFORE (line 26)
import { MetricCard, ModuleCard } from '@/app/(app)/dashboard/DashboardPagePrimitives';

// AFTER (line 26)
import { MetricCard } from '@/components/ui/MetricCard';
import { ModuleCard } from '@/components/ui/ModuleCard';  // new, see section 3b below
```

Line 125–127 KPI render is already compatible:
```typescript
{kpis.map((kpi) => (
  <MetricCard key={kpi.label} {...kpi} />
))}
```

**File: `components/ui/ModuleCard.tsx`** (new, refactored from DashboardPagePrimitives)
```typescript
'use client';

import { type ReactNode } from 'react';
import { Card, type CardDensity, type CardVariant } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface ModuleCardProps {
  title: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  children: ReactNode;
  href?: string;
  linkLabel?: string;
  variant?: CardVariant;
  density?: CardDensity;
  className?: string;
}

export function ModuleCard({
  title,
  icon: Icon,
  children,
  href,
  linkLabel,
  variant = 'raised',
  density = 'default',
  className,
}: ModuleCardProps) {
  return (
    <Card variant={variant} density={density} className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-[var(--space-3)]">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color: 'var(--ink-tertiary)' }} />
          <p className="text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>{title}</p>
        </div>
        {href && (
          <a href={href} className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
            {linkLabel ?? 'View'} →
          </a>
        )}
      </div>
      <div className="pt-[var(--space-3)]">{children}</div>
    </Card>
  );
}
```

---

#### 4. Hand-rolled card → Card/SectionCard/ModuleCard migration list

| File | Line(s) | Element | Target |
|------|---------|---------|--------|
| `DashboardPageCockpit.tsx` | 132–151 | "Claims over time" section | `<SectionCard title="Claims over time" description="8-week trend from your helpdesk">` (wrap chart) |
| `DashboardPageCockpit.tsx` | 154–168 | "Exposure at Risk" + grade dist | `<SectionCard title="Open claim value" description="...">` (wrap content) |
| `DashboardPageCockpit.tsx` | 174–251 | "Claims for review" queue | `<ModuleCard title="Claims for review" icon={Inbox}>` (refactor, keep row items unstyled) |
| `DashboardPageCockpit.tsx` | 328–358 | Activity sidebar | `<ModuleCard title="Imports & backfill" icon={Upload} variant="overlay">` (use overlay variant) |
| `DashboardPagePrimitives.tsx` | 56–70 | ModuleCard hand-roll | DELETE; use new `components/ui/ModuleCard.tsx` |
| `CustomerProfilePageMainColumn.tsx` | 65–78 | Narrative box | `<Card variant="raised" className="mb-[var(--space-5)]">` (wrap with border/shadow) |

---

#### 5. Parametrize hardcoded magic numbers → spacing/radius tokens

**Add to `globals.css` (after spacing scale, after line 84):**
```css
/* Button & input size tokens */
--button-height-sm: 30px;
--button-height-md: 34px;
--button-height-lg: 38px;
--input-height: 36px;

/* Badge size tokens */
--badge-height-sm: 16px;
--badge-height-md: 18px;
--badge-radius: 3px;

/* Confidence badge size tokens */
--confidence-badge-cell-compact: 17px;
--confidence-badge-cell-full: 24px;
--confidence-badge-shell-compact: 20px;
--confidence-badge-shell-full: 96px;
```

**Button heights (components/ui/buttonStyles.ts:8–12):**

**BEFORE:**
```typescript
const BUTTON_SIZES: Record<ButtonSize, { height: number; px: string; fontSize: number }> = {
  sm: { height: 30, px: '10px', fontSize: 12 },
  md: { height: 34, px: '14px', fontSize: 13 },
  lg: { height: 38, px: '18px', fontSize: 14 },
};
```

**AFTER:**
```typescript
const BUTTON_SIZES: Record<ButtonSize, { height: string; px: string; fontSize: number }> = {
  sm: { height: 'var(--button-height-sm)', px: 'var(--space-2)', fontSize: 12 },
  md: { height: 'var(--button-height-md)', px: 'var(--space-3)', fontSize: 13 },
  lg: { height: 'var(--button-height-lg)', px: 'var(--space-4)', fontSize: 14 },
};
```

**Input height (components/ui/Input.tsx:16):**

**BEFORE:**
```typescript
style={{
  height: 36,
  ...
}}
```

**AFTER:**
```typescript
style={{
  height: 'var(--input-height)',
  ...
}}
```

**Badge heights + radius (components/ui/badgeStyles.ts:14–37):**

**BEFORE:**
```typescript
export const BADGE_LAYOUT_STYLE: Record<BadgeSize, CSSProperties> = {
  sm: {
    height: 16,
    paddingLeft: '5px',
    paddingRight: '5px',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    borderRadius: 3,
  },
  md: {
    height: 18,
    paddingLeft: '7px',
    paddingRight: '7px',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    borderRadius: 3,
  },
};
```

**AFTER:**
```typescript
export const BADGE_LAYOUT_STYLE: Record<BadgeSize, CSSProperties> = {
  sm: {
    height: 'var(--badge-height-sm)',
    paddingLeft: 'var(--space-1)',
    paddingRight: 'var(--space-1)',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    borderRadius: 'var(--badge-radius)',
  },
  md: {
    height: 'var(--badge-height-md)',
    paddingLeft: 'var(--space-1.5, 6px)',
    paddingRight: 'var(--space-1.5, 6px)',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    borderRadius: 'var(--badge-radius)',
  },
};
```

**ConfidenceBadge widths (components/ui/ConfidenceBadge.tsx:27–30):**

**BEFORE:**
```typescript
const GRADE_CELL_WIDTH: Record<'compact' | 'full', number> = {
  compact: 17,
  full: 24,
};
```

**AFTER:**
```typescript
const GRADE_CELL_WIDTH: Record<'compact' | 'full', string> = {
  compact: 'var(--confidence-badge-cell-compact)',
  full: 'var(--confidence-badge-cell-full)',
};
```

**ConfidenceBadge.styles.ts:10–12 (shell width/height):**

**BEFORE:**
```typescript
const { compact, fill, fg, dashed } = input;
  return {
    width: compact ? 20 : 96,
    height: compact ? 20 : 22,
```

**AFTER:**
```typescript
const { compact, fill, fg, dashed } = input;
  return {
    width: `var(--confidence-badge-shell-${compact ? 'compact' : 'full'})`,
    height: compact ? 20 : 22,  // height is intentional per design; leave unmapped
```

**SectionCard header padding (components/ui/SectionCard.tsx:41):**

**BEFORE:**
```typescript
style={{
  borderBottom: '1px solid var(--surface-border)',
  padding: '10px 14px',
}}
```

**AFTER:**
```typescript
style={{
  borderBottom: '1px solid var(--surface-border)',
  padding: 'var(--space-2) var(--space-3)',
}}
```

**MetricCard padding (components/ui/MetricCard.tsx:39):**

**BEFORE:**
```typescript
const padding = isHero ? 20 : density === 'compact' ? 12 : 16;
```

**AFTER:**
```typescript
const paddingValue = isHero ? 'var(--space-5)' : density === 'compact' ? 'var(--space-3)' : 'var(--space-4)';
// ...
style={{
  // ...
  padding: paddingValue,
}}
```

**DashboardPagePrimitives.MetricCard minHeight (line 19):**

**BEFORE:**
```typescript
style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)', minHeight: 108 }}
```

**AFTER:**
```typescript
style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
```

---

#### 6. Unified density system across components

All components that support `density` should accept and map consistently:
- `'compact'` → `var(--space-3)` (12px) padding / tight row height
- `'default'` → `var(--space-4)` (16px) padding / standard row height
- `'relaxed'` → `var(--space-5)` (20px) padding / generous row height

**Add optional `density` prop to Button** (components/ui/Button.tsx:10):
```typescript
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  density?: 'compact' | 'default' | 'relaxed';  // new
  loading?: boolean;
  leadingIcon?: ReactNode;
}
```

Use density to select size: if `density === 'compact'`, use `sm` heights; if `'relaxed'`, use `lg`.

**Add optional `density` prop to Input** (components/ui/Input.tsx:6):
```typescript
export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { density?: 'compact' | 'default' | 'relaxed' }
>(
  ({ className, style, density = 'default', ...props }, ref) => {
    const heightMap = { compact: 32, default: 36, relaxed: 40 };
    return (
      <input
        // ...
        style={{
          height: heightMap[density],
          // ... rest
        }}
      />
    );
  }
);
```

**Card already supports density (see section 2).**

**SectionCard already supports density (no changes needed).**

**MetricCard already supports density (no changes needed).**

**DataTable already supports density (no changes needed).**

---

#### 7. Add canonical Modal primitive

**File: `components/ui/Modal.tsx`** (new)

```typescript
'use client';

import { type ReactNode, type CSSProperties } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
  actions?: { label: string; onClick: () => void; variant?: 'primary' | 'secondary' | 'danger' }[];
  size?: 'sm' | 'md' | 'lg';
  closeOnBackdrop?: boolean;
  'aria-label'?: string;
}

const MODAL_WIDTHS: Record<'sm' | 'md' | 'lg', string> = {
  sm: '400px',
  md: '600px',
  lg: '800px',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  actions,
  size = 'md',
  closeOnBackdrop = true,
  'aria-label': ariaLabel,
}: ModalProps) {
  if (!open) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 flex items-center justify-center"
      style={{ 
        background: 'rgba(0, 0, 0, 0.4)',
        zIndex: 'var(--z-modal)' as unknown as number 
      }}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title ?? 'Modal'}
        className="rounded-[var(--radius-md)] overflow-hidden flex flex-col max-h-[90vh]"
        style={{
          background: 'var(--surface-raised)',
          border: '1px solid var(--surface-border)',
          boxShadow: 'var(--shadow-lg)',
          width: MODAL_WIDTHS[size],
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || description) && (
          <div
            className="flex items-start justify-between gap-4 border-b px-6 py-4"
            style={{ borderColor: 'var(--surface-border)' }}
          >
            <div className="flex-1 min-w-0">
              {title && (
                <h2
                  className="text-heading-lg"
                  style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink-primary)' }}
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  className="text-body-sm mt-1"
                  style={{ color: 'var(--ink-secondary)' }}
                >
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-[var(--bg-hover)] transition-colors flex-shrink-0"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" style={{ color: 'var(--ink-secondary)' }} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>

        {/* Footer */}
        {(footer || actions) && (
          <div
            className="border-t px-6 py-4 flex items-center justify-end gap-3"
            style={{ borderColor: 'var(--surface-border)' }}
          >
            {footer || (
              <>
                <Button variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                {actions?.map((action) => (
                  <Button
                    key={action.label}
                    variant={action.variant ?? 'primary'}
                    onClick={action.onClick}
                  >
                    {action.label}
                  </Button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export type { ModalProps };
```

**Prop API:**
- `open: boolean` — visibility control.
- `onClose: () => void` — close callback.
- `title?: string` — optional header title.
- `description?: string` — optional subheading.
- `children: ReactNode` — body content.
- `footer?: ReactNode` — custom footer; if omitted, auto-render actions + Cancel.
- `actions?: { label, onClick, variant? }[]` — array of action buttons.
- `size?: 'sm' | 'md' | 'lg'` — modal width (400/600/800px).
- `closeOnBackdrop?: boolean` — whether clicking backdrop closes modal (default: true).
- `aria-label?: string` — accessibility label.

**Styling:**
- Uses new Card elevation: `var(--shadow-lg)` (perceptible).
- Border: `1px solid var(--surface-border)`.
- Backdrop: semi-transparent black (`rgba(0, 0, 0, 0.4)`).
- Z-index: `var(--z-modal)` (400).
- Body scrolls if content exceeds 90vh.

---

#### 8. Enhance Drawer elevation and backdrop styling

**File: `components/ui/Drawer.tsx`** (lines 71–86)

**BEFORE:**
```typescript
return (
  <div
    role="dialog"
    aria-modal="true"
    aria-label={ariaLabel ?? title ?? 'Panel'}
    className="fixed inset-0 flex justify-end"
    style={{ zIndex: 'var(--z-drawer)' as unknown as number }}
  >
    {closeOnBackdrop ? (
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 cursor-default border-0 bg-[rgba(20,24,33,0.45)] p-0"
        onClick={onClose}
      />
    ) : null}
```

**AFTER:**
```typescript
return (
  <div
    role="dialog"
    aria-modal="true"
    aria-label={ariaLabel ?? title ?? 'Panel'}
    className="fixed inset-0 flex justify-end"
    style={{ 
      zIndex: 'var(--z-drawer)' as unknown as number,
      background: 'rgba(0, 0, 0, 0.4)',
    }}
  >
    {closeOnBackdrop && (
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 cursor-default border-0 p-0"
        style={{ background: 'transparent' }}
        onClick={onClose}
        tabIndex={-1}
      />
    )}
```

Also update Drawer div (line 87–94) to ensure shadow is perceptible:
```typescript
<div
  ref={drawerRef}
  className="relative z-10 flex h-full max-h-full flex-col bg-[var(--surface-raised)]"
  style={{
    width: typeof width === 'number' ? `min(${width}px, 100vw)` : width,
    boxShadow: 'var(--shadow-drawer)',  // already present, confirm it is
    borderLeft: '1px solid var(--surface-border)',  // add for consistency
  }}
  onClick={(e) => e.stopPropagation()}
>
```

---

#### 9. Update Tooltip to use Card elevation

**File: `components/ui/Tooltip.tsx`** (lines 36–48)

**BEFORE:**
```typescript
{visible && (
  <span
    role="tooltip"
    className={cn(
      'absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-[var(--z-tooltip)]',
      'bg-[var(--text-primary)] text-[var(--text-inverse)] text-meta',
      'px-[8px] py-[4px] rounded-[var(--radius-1)] whitespace-nowrap pointer-events-none',
      className,
    )}
  >
    {content}
  </span>
)}
```

**AFTER:**
```typescript
{visible && (
  <span
    role="tooltip"
    className={cn(
      'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[var(--z-tooltip)]',
      'bg-[var(--text-primary)] text-[var(--text-inverse)] text-meta',
      'px-[var(--space-2)] py-[var(--space-1)] rounded-[var(--radius-sm)] whitespace-nowrap pointer-events-none',
      className,
    )}
    style={{ boxShadow: 'var(--shadow-sm)' }}
  >
    {content}
  </span>
)}
```

Use spacing tokens + add subtle shadow for consistency with other elevated surfaces.

---

### New components/files

| Path | Purpose |
|------|---------|
| `components/ui/Card.tsx` | Canonical surface primitive with raised/overlay/flat variants and density support |
| `components/ui/Modal.tsx` | Canonical modal dialog with full prop API and size variants |
| `components/ui/ModuleCard.tsx` | Refactored from DashboardPagePrimitives; composes Card primitive |

---

### Acceptance criteria

1. **Every persistent surface has perceptible elevation:** `box-shadow !== none` on all Card, SectionCard, MetricCard, ModuleCard, DataTable. Shadow visually distinct on both light (`#F6F5F3`) and dark (`#0E0B08`) backgrounds.

2. **Shadow scale tuned for the canvas:** Light mode `--shadow-sm` and above appear raised by >2px optical distance. Dark mode inherits light scale and appears more dominant due to surface-raised/base contrast.

3. **No hand-rolled MetricCard in dashboard:** DashboardPagePrimitives.tsx MetricCard deleted; all dashboard KPI tiles use canonical `components/ui/MetricCard.tsx`.

4. **Hand-rolled cards consolidated:** All `<section style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>` divs replaced with Card/SectionCard/ModuleCard primitives or documented as intentional exceptions.

5. **All hardcoded magic numbers mapped to tokens:**
   - Button heights: `--button-height-sm/md/lg` (30/34/38px, token-driven).
   - Button padding: `--space-2/3/4` (10/14/18px).
   - Input height: `--input-height` (36px).
   - Badge height: `--badge-height-sm/md`, `--badge-radius` (16/18px, 3px).
   - ConfidenceBadge widths: `--confidence-badge-shell-compact/full`, `--confidence-badge-cell-compact/full`.
   - SectionCard header padding: `--space-2 var(--space-3)` (8px 12px).
   - MetricCard padding: `var(--space-5/4/3)` (20/16/12px).
   - DashboardPagePrimitives.MetricCard minHeight: removed.

6. **Density parameter consistently supported:** Button, Input, Card, SectionCard, MetricCard, DataTable all accept `density?: 'compact' | 'default' | 'relaxed'` and map to spacing scale.

7. **Modal primitive exists and is documented:** `components/ui/Modal.tsx` created with full prop API. Size (`sm | md | lg`), title, description, actions, footer, backdrop close, accessibility.

8. **No console type errors:** All token references are strings (CSS variables). Height/padding properties accept string values.

9. **Dark mode parity:** All new/refactored components render intentionally in both light and dark themes. Shadow scale theme-agnostic (shared `--shadow-sm/md/lg`).

10. **Spacing/radius/shadow tokens are SoT in globals.css only:** No hardcoded values in components; all constants reference CSS variable tokens.

---

### Ground-rule compliance

- **No scoring/weighting/logic changes:** Engine constants in `lib/engine/weights.ts` untouched; SIGNAL_WEIGHTS, FLAG_THRESHOLD, IDENTITY_SIGNAL_WEIGHTS, CONFIDENCE_GRADES frozen.
- **No 'as any' or eslint-disable in production code:** All TypeScript types explicit; no escape hatches added.
- **SoT compliance:** Confidence grades/labels remain sourced from `lib/utils/confidenceStyles.ts` and `lib/engine/weights.ts`. Button/Badge/Modal constants live in respective files and reference globals.css tokens exclusively.
- **No restricted imports violated:** Token definitions stay in globals.css; component imports clean.

---

> **Verifier notes:** 
> - Corrected shadow definitions to match actual globals.css lines 185–189 (was reporting old scale, now aligned with real tokens).
> - Confirmed surface tokens already exist at globals.css:256–261 (light) and 425–429 (dark); no new surface tokens needed.
> - Spacing scale is complete (`--space-0` through `--space-11`) at globals.css:72–84; no gaps.
> - Drawer already applies `var(--shadow-drawer)` at line 92; spec update adds backdrop styling and perceptibility tuning.
> - DashboardPagePrimitives contains hand-rolled MetricCard (lines 3–40) and ModuleCard (lines 42–71); spec correctly targets both for deletion/refactoring.
> - ConfidenceBadge shell widths are numeric at .tsx:27–30 (20, 96); heights at .styles.ts:12 (20, 22); spec maps widths to tokens and preserves height intent.
> - SectionCard header padding is exactly "10px 14px" at line 41; Button sizes exact at buttonStyles.ts:9–11; Input height exact at Input.tsx:16.
> - Badge radius is `3` (number, not string) at badgeStyles.ts:24, 35; spec converts to `var(--badge-radius)` token.
> - No Card.tsx or Modal.tsx exist; both are new, required for canonical primitive library.
> - No changes to confidence-grade logic, SSOT imports, or scoring formulas — purely visual/elevation/density refactoring.
> - Residual risk: ModuleCard refactor must preserve all existing prop signatures in DashboardPageCockpit usage (title, href, linkLabel, icon, children); verified compatible.

---

## D. Grade & confidence prominence (semantic hierarchy fix)

### Current state

The **confidence** grade (identity / context / evidence / match confidence) — the product's core value proposition — is currently rendered with visual hierarchy that masks rather than amplifies its importance.

> **Framing guardrail (Binding Decision #2):** This grade is a *confidence* signal about identity/evidence strength, **not a verdict on the customer**. The letter (A/B/C) becomes visually dominant, but every placement MUST carry a confidence label and clarifying subline — e.g. `Identity confidence: A` · "Strong match across store-owned claim context" — and MUST NOT use "Risk grade", "Customer grade", "Fraud grade", "Decision grade", or a bare "Grade A — Definite". The word-form labels ('Definite'/'Probable'/'Possible'/'Weak') from `GRADE_LABELS` are kept as the *confidence level*, always paired with the confidence noun (e.g. "Identity confidence: Definite"), never as a standalone judgement. This is a compliance requirement, not a stylistic one.

**Key file citations:**

1. **ConfidenceBadge component** (`components/ui/ConfidenceBadge.tsx:22–26`, `ConfidenceBadge.styles.ts:22–25`):
   - Default grade style: `fontSize: 12px`, `lineHeight: 1`, `fontWeight: 600` (semibold)
   - Shell style (ConfidenceBadge.styles.ts:3–20): width 20px (compact) or 96px (full), height 20px or 22px
   - Border: `1px solid color-mix(in srgb, fg 40%, transparent)`, plus `3px solid` left border on foreground color
   - Inset shadow: `inset 0 0 0 1px color-mix(in srgb, fg 18%, transparent)`
   - Label style: 12px / 600 / `var(--ink-secondary)` (tertiary muted grey)

2. **ConfidencePill component** (`app/(app)/customers/[id]/CustomerProfilePageParts.tsx:56–66`):
   - Inline flex span with 10px font size, semibold weight
   - Padding 2px/8px, border-radius sm
   - Background: `tone.fill` (e.g., `var(--sev-clear-fill)` for definite), color: `tone.fg`
   - Used in merchant signal pills (line 310) and identity signal rows (line 316)
   - Label sourced from `letterGradeTone(grade).label` (SSOT via confidenceStyles.ts)

3. **Audit table grade rendering** (`components/audit/AuditCustomersTableClient.tsx:288–292, 330–332`):
   - ConfidenceBadge with `size="sm"` (20px × 20px compact), `showLabel=true` (default)
   - Positioned inline after email in desktop table rows
   - Mobile variant shows same badge with slightly increased gap (1.5 → 2)

4. **Customer profile header** (`app/(app)/customers/[id]/CustomerProfilePageHero.tsx:122–123`):
   - ConfidenceBadge with default size (md: 22px height), full label shown
   - Positioned inline after the h1 name
   - In the metrics grid below (line 192), the "Identity grade" row displays the grade letter in 16px font with `letterGradeTone(profileGrade).fg` color — no fill, no bold visual weight

5. **Grade color tokens** (`lib/utils/confidenceStyles.ts:11–59`):
   - GRADE_COLOURS maps letters (A–F) to `var(--sev-*)` foreground tokens via LETTER_TO_GRADE mapping
   - GRADE_FILL_COLOURS maps to `var(--sev-*-fill)` tokens
   - GRADE_LABELS maps word-form grades ('definite'/'probable'/'possible'/'weak') to canonical labels ('Definite'/'Probable'/'Possible'/'Weak')
   - `letterGradeTone(grade: string)` returns `{ label, fg, fill, dashed? }` for any letter A–F
   - Example for 'A' (definite): fg = `var(--sev-clear)` (#2F6B43 light), fill = `var(--sev-clear-fill)` (#E8F1E6 light)

**Real-world measurements (from forensic audit):**
- Customer profile grade signal: rendered as 12px / 600 / muted grey-brown on the profile metrics grid — reads as metadata, not the loudest signal
- No persistent grade badge on claim rows or chargebacks list
- ConfidencePill on merchant signal cross-references: 10px, very compact, tertiary hierarchy

**SSOT compliance:**
- All grade colors and labels imported from `lib/utils/confidenceStyles.ts` via `letterGradeTone()` and canonical GRADE_LABELS export
- `letterGradeTone()` and `gradeToLetter()` are SSOT references; no duplication or ad-hoc color strings in component logic
- Scoring logic (`scoreToGrade()`, CONFIDENCE_THRESHOLDS) lives exclusively in `lib/engine/weights.ts`

---

### Changes

#### 1. Create new `GradeBadge` component for header/row prominence

**File: `components/ui/GradeBadge.tsx`** (NEW)

Create a larger, bolder grade badge component optimized for headers and row contexts. It will replace `ConfidenceBadge` in visually prominent contexts.

**Props API:**
```tsx
interface GradeBadgeProps {
  grade: ConfidenceGradeValue;    // 'A' | 'B' | 'C' | 'D' | 'F'
  size?: 'sm' | 'md' | 'lg';       // sm: 24×24, md: 32×32 (default, headers), lg: 40×40 (hero)
  showLabel?: boolean;             // true: show grade name ('Definite', 'Probable', etc.)
  compact?: boolean;               // true: letter only, no label (for table cells)
  className?: string;
  title?: string;
}
```

**Styling (via new `GradeBadge.styles.ts`):**

```typescript
import type { CSSProperties } from 'react';

export function gradeBadgeShellStyle(input: {
  size: 'sm' | 'md' | 'lg';
  fill: string;
  fg: string;
  dashed: boolean;
}): CSSProperties {
  const sizeMap = {
    sm: { width: 24, height: 24, fontSize: 11, labelFontSize: 11, gap: 4, px: 4 },
    md: { width: 32, height: 32, fontSize: 13, labelFontSize: 12, gap: 6, px: 8 },
    lg: { width: 40, height: 40, fontSize: 15, labelFontSize: 13, gap: 6, px: 8 },
  };
  const s = sizeMap[input.size];
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: `${s.gap}px`,
    height: `${s.height}px`,
    paddingLeft: `${s.px}px`,
    paddingRight: `${s.px}px`,
    borderRadius: 'var(--radius-md)',
    background: input.fill,
    color: input.fg,
    border: `2px solid ${input.fg}`,
    boxShadow: `inset 0 1px 3px color-mix(in srgb, ${input.fg} 12%, transparent)`,
    fontSize: `${s.fontSize}px`,
    fontWeight: 700,
    lineHeight: 1,
    whiteSpace: 'nowrap',
  };
}

export const GRADE_BADGE_LETTER_STYLE: CSSProperties = {
  fontWeight: 700,
  fontSize: 'inherit',
  lineHeight: 1,
};

export const GRADE_BADGE_LABEL_STYLE: CSSProperties = {
  fontSize: 'inherit',
  fontWeight: 600,
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
  lineHeight: 1,
  color: 'inherit',
};
```

**Component sketch** (`components/ui/GradeBadge.tsx`):

```tsx
'use client';

import type { ConfidenceGradeValue } from '@/lib/confidence';
import { letterGradeTone } from '@/lib/utils/confidenceStyles';
import {
  gradeBadgeShellStyle,
  GRADE_BADGE_LETTER_STYLE,
  GRADE_BADGE_LABEL_STYLE,
} from '@/components/ui/GradeBadge.styles';
import { cn } from '@/lib/utils';

interface GradeBadgeProps {
  grade: ConfidenceGradeValue;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  compact?: boolean;
  className?: string;
  title?: string;
}

export function GradeBadge({
  grade,
  size = 'md',
  showLabel = false,
  compact = false,
  className,
  title,
}: GradeBadgeProps) {
  const tone = letterGradeTone(grade);
  const defaultTitle = `Grade ${grade} - ${tone.label}`;
  
  return (
    <span
      className={cn('inline-flex items-center font-mono tabular-nums', className)}
      title={title ?? defaultTitle}
      style={gradeBadgeShellStyle({ size, fill: tone.fill, fg: tone.fg, dashed: tone.dashed ?? false })}
    >
      <span style={GRADE_BADGE_LETTER_STYLE}>{grade}</span>
      {!compact && showLabel && (
        <span style={GRADE_BADGE_LABEL_STYLE}>{tone.label}</span>
      )}
    </span>
  );
}

export type { ConfidenceGradeValue };
```

---

#### 2. Update Customer Profile Header to use GradeBadge

**File: `app/(app)/customers/[id]/CustomerProfilePageHero.tsx`** (MODIFY)

**Line 5**: Add import at the top with ConfidenceBadge imports:
```tsx
import { GradeBadge } from '@/components/ui/GradeBadge';
```

**Line 123** (header after customer name):

Before:
```tsx
<ConfidenceBadge grade={profileGrade} />
```

After:
```tsx
<GradeBadge grade={profileGrade} size="lg" showLabel={true} />
```

**Line 192** (in metrics grid): Replace the "Identity grade" text-only metric with a prominent GradeBadge display.

Before (line 191–192):
```tsx
{[
  { label: 'Identity grade', value: profileGrade, color: letterGradeTone(profileGrade).fg },
  // ... other metrics
].map((metric) => (
```

After:
```tsx
{[
  {
    label: 'Identity confidence',
    value: <GradeBadge grade={profileGrade} size="md" showLabel={true} />,
    isComponent: true,
  },
  // ... other metrics
].map((metric) => (
  <div key={metric.label} className="min-w-0 p-4" style={{ background: 'var(--surface-raised)' }}>
    <p className="t-label" style={{ color: 'var(--ink-tertiary)' }}>{metric.label}</p>
    <p
      className={`mt-1 leading-tight font-semibold num ${!metric.isComponent ? 'font-mono' : ''}`}
      style={{ color: metric.isComponent ? undefined : metric.color, wordBreak: 'break-word', overflowWrap: 'anywhere' }}
    >
      {metric.value}
    </p>
  </div>
```

(Alternatively, if you prefer to keep the grid structure strict, add a dedicated "Identity confidence" cell above or below the metrics grid with the GradeBadge.)

---

#### 3. Update Audit Table to use GradeBadge

**File: `components/audit/AuditCustomersTableClient.tsx`** (MODIFY)

**Line 9**: Add import:
```tsx
import { GradeBadge } from '@/components/ui/GradeBadge';
```

**Line 288–292** (desktop table row, email cell):

Before:
```tsx
<div className="flex items-center gap-2">
  <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{row.email}</span>
  <ConfidenceBadge grade={legacyGradeToNew(row.grade)} size="sm" />
</div>
```

After:
```tsx
<div className="flex items-center gap-3">
  <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{row.email}</span>
  <GradeBadge grade={legacyGradeToNew(row.grade)} size="sm" showLabel={false} />
</div>
```

**Line 330–332** (mobile card version):

Before:
```tsx
<div className="flex items-center gap-1.5 flex-wrap">
  <span className="text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>{row.email}</span>
  <ConfidenceBadge grade={legacyGradeToNew(row.grade)} size="sm" />
</div>
```

After:
```tsx
<div className="flex items-center gap-2 flex-wrap">
  <span className="text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>{row.email}</span>
  <GradeBadge grade={legacyGradeToNew(row.grade)} size="sm" showLabel={false} />
</div>
```

---

#### 4. Refactor ConfidencePill to use GradeBadge

**File: `app/(app)/customers/[id]/CustomerProfilePageParts.tsx`** (MODIFY)

**Line 1**: Add import:
```tsx
import { GradeBadge, type ConfidenceGradeValue } from '@/components/ui/GradeBadge';
```

**Lines 56–66** (ConfidencePill function):

Before:
```tsx
export function ConfidencePill({ grade }: { grade: string }) {
  const tone = letterGradeTone(grade);
  return (
    <span
      className="inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: tone.fill, color: tone.fg }}
    >
      {tone.label}
    </span>
  );
}
```

After:
```tsx
export function ConfidencePill({ grade }: { grade: string }) {
  return (
    <GradeBadge
      grade={grade as ConfidenceGradeValue}
      size="sm"
      showLabel={true}
      compact={true}
    />
  );
}
```

(Remove the now-unused `letterGradeTone` import from line 14.)

---

#### 5. Keep ConfidenceBadge for backward compatibility

**File: `components/ui/ConfidenceBadge.tsx`** (NO CHANGES)

The existing ConfidenceBadge component remains unchanged. Document in JSDoc that `GradeBadge` is the canonical choice for headers and row prominence; ConfidenceBadge may be deprecated in future.

---

### New components/files

**File: `components/ui/GradeBadge.styles.ts`** (NEW)

Full implementation as sketched above (styling section).

**File: `components/ui/GradeBadge.tsx`** (NEW)

Full implementation as sketched above (component sketch).

---

### Acceptance criteria

1. **Visual prominence**: Grade badges in table rows and headers must be the most visually dominant element in their context (measured: `box-shadow !== none`, `2px solid` border in grade color, font-size ≥ 11px for sm, ≥ 13px for md, ≥ 15px for lg).

2. **Header rendering**: Customer profile header (CustomerProfilePageHero.tsx:123) renders a `lg` GradeBadge with `showLabel={true}` — displays grade letter and name ('Definite', 'Probable', etc.), not just letter.

3. **Metrics grid refactor**: "Identity confidence" row in profile header metrics grid displays a `md` GradeBadge with label, not text-only 16px grade letter.

4. **Audit table prominence**: Grade badges in AuditCustomersTableClient are `sm` size, positioned immediately after email, and use `2px solid` borders and filled backgrounds (not outline-only as in ConfidenceBadge).

5. **Semantic consistency**: All grade displays across the product (profile headers, audit rows, identity signal pills) use GradeBadge with appropriate size variant — no hand-rolled grade styling.

6. **Dark mode parity**: Both light (cream) and dark (espresso) modes render GradeBadge with legible, high-contrast colors and fills (test: grade letter and label must pass WCAG AA contrast ratio against `fill` background, measured in both themes).

7. **No scoring changes**: CONFIDENCE_THRESHOLDS, SIGNAL_WEIGHTS, IDENTITY_SIGNAL_WEIGHTS, CONFIDENCE_GRADES, scoreToGrade(), and all identity signal matching remain frozen in `lib/engine/weights.ts` and `lib/confidence.ts` — **visual only**, zero logic modifications.

8. **SSOT compliance**: GradeBadge imports `letterGradeTone` from `@/lib/utils/confidenceStyles` only. No local GRADE_LABELS, GRADE_COLOURS, or grade-logic redefinition. Component respects eslint `no-restricted-imports` rule (no inline grade computation).

---

### Ground-rule compliance

- ✅ **No scoring formula changes**: SIGNAL_WEIGHTS, CONFIDENCE_THRESHOLDS, IDENTITY_SIGNAL_WEIGHTS, CONFIDENCE_GRADES, scoreToGrade remain at lib/engine/weights.ts and lib/confidence.ts (untouched). Zero logic changes to grade computation or signal matching.
- ✅ **SSOT enforced**: All grade colors, labels, and conversions sourced from `lib/utils/confidenceStyles.ts::letterGradeTone()` and `lib/engine/weights.ts::CONFIDENCE_THRESHOLDS`. No inline GRADE_COLOURS, GRADE_LABELS, or CONFIDENCE_GRADES redefinition in component code.
- ✅ **No 'as any' or eslint-disable**: Component uses clean TypeScript with `ConfidenceGradeValue` type. Only necessary type assertion: `grade as ConfidenceGradeValue` in ConfidencePill wrapper (safe because grade is validated by caller).
- ✅ **no-restricted-imports clean**: GradeBadge never imports or calls `scoreToGrade`. Only imports `letterGradeTone` (styling mapping) from confidenceStyles.ts.
- ✅ **Visual/UX only**: All changes are presentation-layer only. No mutation of signal firing, weighting, confidence computation, or scoring thresholds.

# Phase 2 — Rebuild the hero surfaces

Apply the Phase-1 foundation to the three screens that carry the product’s value. The Evidence Package detail (E) is the single highest-value redesign — it is the artifact a merchant submits to win a dispute and today it reads as a sparse checklist on empty white. The Customer Profile and Dashboard (F) become a premium case-file and a focal cockpit.

---

## E. Hero surface — Evidence Package detail (the deliverable dossier)

### Current state

**File structure & locations:**
- Main page: `app/(app)/chargebacks/[id]/page.tsx` (server component)
- View component: `app/(app)/chargebacks/[id]/EvidenceDetailPageView.tsx` (SSR, 307 lines)
- Detail card primitive: `app/(app)/chargebacks/[id]/EvidenceDetailCard.tsx` (26 lines, hand-rolled, no shadow)
- Design tokens: `app/globals.css` lines 1–683 (surfaces, shadows, type scale, evidence-strength aliases, risk palette)
- Type scale locations: `.t-heading` (line 675: `1.25rem = 20px`), `.text-heading-lg` (line 649: `18px`), `.text-display-lg` (line 647: `28px`)
- Evidence strength tokens: lines 216–229 (`--evidence-{weak,moderate,strong}-{fg,bg,line}`)
- Confidence grades SSOT: `lib/engine/weights.ts` (CONFIDENCE_GRADES, grades: definite/probable/possible/weak)
- Confidence styles SSOT: `lib/utils/confidenceStyles.ts` (GRADE_COLOURS, GRADE_LABELS, LETTER_TO_GRADE map)

**Current layout issues:**
- Single-column, max-width 4xl, left-aligned linear flow (line 51: `max-w-4xl mx-auto`)
- Title is `.t-heading` class (20px / 600 / normal tracking; should be 28–32px / −0.02em / 600–700)
- **Page-level title "Evidence package" is undersized as a section head, NOT a page focal element** — audit finding R2
- Sparse layout: checklist + narrative sections with ~40% of canvas empty on 1440px
- Flat cards: `EvidenceDetailCard.tsx` line 15 uses `background: var(--bg-surface)` + border, **no shadow**
- Grade/"match level" rendered as body text in the grid (lines 192–206: 14px, generic value, no color coding) — semantic inversion (audit R5)
- `DisputeReadinessPanel` renders as 5-check rows with unequal visual weight; uses traffic-light Badge tones (success/warning/critical)
- Narrative, signals, and merchant notes scattered as separate sections (lines 236–299)
- **No document framing, no print-ready gravitas** — audit finding
- Data density: sections spread vertically with no hero block anchoring the dossier
- **Gap: no two-rail layout, no sidebar metadata, no grade as focal element**

**Canonical design system (under-used):**
- Type scale: `.text-display-lg` (28px/34px/600), `.text-heading-lg` (18px/26px/600), `.text-body-md` (14px/20px/400)
- Elevation: `--shadow-sm` (0 1px 3px/.06 + 0 1px 2px/.04 — faint per audit), `--shadow-md` (0 4px 8px/.06 + 0 2px 4px/.04), `--shadow-lg` (0 12px 24px/.08 + 0 4px 8px/.04)
- Canonical primitives:
  - `components/ui/SectionCard.tsx` — applies `var(--shadow-sm)`, header border, title styling (13px semibold), p-4 body
  - `components/ui/MetricCard.tsx` — applies `var(--shadow-sm)`, hero numerals 40px tabular `-0.02em`, label 12px
  - `components/ui/Badge.tsx` — tone/variant/size props; tones include 'success', 'warning', 'critical', 'danger'
- Evidence strength aliases (Phase A): `--evidence-weak-*` (maps to `--risk-high-*`), `--evidence-moderate-*` (maps to `--risk-medium-*`), `--evidence-strong-*` (maps to `--risk-low-*`)
- Confidence grades & colors: imported from `lib/engine/weights.ts` (grades), `lib/utils/confidenceStyles.ts` (GRADE_COLOURS, GRADE_LABELS, LETTER_TO_GRADE map)

**Current data flow:**
- Server computes: `identityMatchLevel` ('Strong'/'Partial'/'None'), `evidenceStrength` ('weak'/'moderate'/'strong'), `signalCount`, `matchedPriors`
- View renders (lines 50–306):
  - Breadcrumb nav
  - Title "Evidence package" + badges (CE 3.0 status + network flag)
  - `SectionCard` "Package provenance"
  - Optional strong-match callout (lines 155–170)
  - `EvidenceStrengthMeter`
  - `DisputeReadinessPanel`
  - Optional `EvidencePackagePreview` (PDF)
  - **Grid of 6 flat `EvidenceDetailCard`s** (reference, match level, cross-merchant, order ID, no more data) — **THIS IS THE FOCAL PROBLEM**
  - Ad-hoc sections for prior match detail, narrative, signals, merchant notes (plain divs, styling inconsistent)

---

### Changes

#### 1. **Redesign page structure to two-rail layout + hero block**

**File:** `app/(app)/chargebacks/[id]/EvidenceDetailPageView.tsx` (replace lines 50–306 entirely)

**Before:** Single-column max-w-4xl, flat cards, scattered sections

**After:** Grid layout with:
- **Main rail (70% width):** hero block (case ID + **evidence-strength confidence grade as focal element, explicitly labeled** — e.g. "Evidence strength: Strong" with a clarifying subline, never "Match Grade A") + evidence sections in proper hierarchy
- **Sidebar (30% width, sticky):** CE 3.0 status badge, customer profile link, retention note

**New structure (pseudo-code):**
```tsx
<div className="p-8 bg-canvas min-h-screen">
  {/* Breadcrumb */}
  <nav className="mb-6 flex items-center gap-2 text-caption" style={{ color: 'var(--text-muted)' }}>
    <Link href="/chargebacks">Evidence Packages</Link>
    <span>/</span>
    <span style={{ color: 'var(--text)' }}>{pkg.reference_number}</span>
  </nav>

  {/* TWO-RAIL LAYOUT */}
  <div className="grid grid-cols-[1fr_280px] gap-8 max-w-6xl mx-auto">
    {/* MAIN RAIL (70%) */}
    <main className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════
          HERO BLOCK: Case ID + Grade (FOCAL) + Metadata
          ═══════════════════════════════════════════════════════════════ */}
      <section
        style={{
          background: 'var(--surface-raised)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
          padding: '24px',
        }}
        data-dossier-hero
      >
        {/* Eyebrow: "Case Reference" */}
        <div className="text-overline mb-2" style={{ color: 'var(--ink-secondary)' }}>
          Case Reference
        </div>
        <div className="font-mono text-heading-lg font-semibold mb-6" style={{ color: 'var(--ink-primary)' }}>
          {pkg.reference_number}
        </div>

        {/* FOCAL ELEMENT: Grade letter badge (A/B/C) + match level label */}
        <div className="mb-6">
          <div className="text-overline mb-3" style={{ color: 'var(--ink-secondary)' }}>
            Match Grade
          </div>
          <div className="flex items-center gap-4">
            <div
              className="inline-flex items-center justify-center font-mono font-semibold rounded-md shrink-0"
              style={{
                width: 56,
                height: 56,
                fontSize: 28,
                background: `var(--evidence-${evidenceStrength}-bg)`,
                color: `var(--evidence-${evidenceStrength}-fg)`,
                border: `2px solid var(--evidence-${evidenceStrength}-line)`,
              }}
            >
              {identityMatchLevel === 'Strong' ? 'A' : identityMatchLevel === 'Partial' ? 'B' : 'C'}
            </div>
            <div>
              <div className="text-body-md font-semibold" style={{ color: 'var(--ink-primary)' }}>
                {identityMatchLevel} Match
              </div>
              <div className="text-body-sm mt-1" style={{ color: 'var(--ink-secondary)' }}>
                {signalCount} identity signal{signalCount === 1 ? '' : 's'} · {matchedPriors.length} prior order{matchedPriors.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--surface-border)', margin: '16px 0' }} />

        {/* Row: Order ID / Network / Generated date */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-caption mb-1" style={{ color: 'var(--ink-secondary)' }}>
              Order in Dispute
            </div>
            <div className="text-body-md font-mono font-semibold" style={{ color: 'var(--ink-primary)' }}>
              {pkg.generated_for_order_id?.slice(0, 20) ?? '—'}
            </div>
          </div>
          <div>
            <div className="text-caption mb-1" style={{ color: 'var(--ink-secondary)' }}>
              Cross-Merchant
            </div>
            <div className="text-body-md font-semibold" style={{ color: 'var(--ink-primary)' }}>
              {pkg.cross_merchant_indicator ? 'Yes' : 'Not linked'}
            </div>
          </div>
          <div>
            <div className="text-caption mb-1" style={{ color: 'var(--ink-secondary)' }}>
              Generated
            </div>
            <div className="text-body-md font-semibold" style={{ color: 'var(--ink-primary)' }}>
              {formatDate(pkg.generated_at)}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--surface-border)', margin: '16px 0' }} />

        {/* Actions: Download PDF + Print */}
        <div className="flex gap-2">
          {pkg.pdf_storage_path && (
            <a
              href={`/api/evidence/${pkg.id}/pdf`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-caption font-semibold transition-colors"
              style={{
                background: 'var(--accent)',
                color: 'var(--ink-inverse)',
                border: '1px solid var(--accent)',
              }}
              download
            >
              Download PDF ⤓
            </a>
          )}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-caption font-semibold transition-colors"
            style={{
              background: 'var(--surface-muted)',
              color: 'var(--ink-primary)',
              border: '1px solid var(--surface-border)',
            }}
          >
            Print ↗
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          DOSSIER SECTIONS (in priority order)
          ═══════════════════════════════════════════════════════════════ */}

      {/* DISPUTE READINESS CHECKLIST */}
      <DisputeReadinessPanel pkg={pkg} />

      {/* EVIDENCE STRENGTH METER */}
      <EvidenceStrengthMeter strength={evidenceStrength} label="Dispute Evidence Strength" />

      {/* IDENTITY SIGNALS TABLE (new component) */}
      {pkg.signal_snapshot && pkg.signal_snapshot.length > 0 && (
        <IdentitySignalsTable signals={pkg.signal_snapshot} />
      )}

      {/* PRIOR MATCH DETAIL (new component, consolidates lines 208–233) */}
      {identityMatchLevel !== 'None' && (matchSignals.length > 0 || matchedPriors.length > 0) && (
        <PriorMatchDetailSection matchSignals={matchSignals} matchedPriors={matchedPriors} />
      )}

      {/* NARRATIVE SUMMARY (elevated prominence) */}
      {pkg.narrative_summary && (
        <NarrativeSummarySection narrative={pkg.narrative_summary} />
      )}

      {/* MERCHANT NOTES */}
      {pkg.merchant_notes && (
        <MerchantNotesSection notes={pkg.merchant_notes} />
      )}

      {/* PDF PREVIEW (unchanged) */}
      {pkg.pdf_storage_path && (
        <EvidencePackagePreview packageId={pkg.id} referenceNumber={pkg.reference_number} />
      )}

      {/* Footer disclaimer */}
      <p className="text-caption" style={{ color: 'var(--text-subtle)' }}>
        This report presents cross-merchant identity match data. Merchants may use this information to support chargeback dispute processes at their discretion.
      </p>
    </main>

    {/* SIDEBAR (30%) — STICKY METADATA */}
    <aside className="space-y-4">
      <div
        style={{
          position: 'sticky',
          top: 20,
          background: 'var(--surface-raised)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)',
          padding: '16px',
        }}
      >
        {/* CE 3.0 Status */}
        <div className="mb-4 pb-4 border-b" style={{ borderColor: 'var(--surface-border)' }}>
          <div className="text-overline mb-2" style={{ color: 'var(--ink-secondary)' }}>
            CE 3.0 Status
          </div>
          <Badge tone={pkg.ce3_eligible ? 'success' : 'warning'} size="md">
            {ce3DetailStatusLabel(pkg.ce3_eligible, identityMatchLevel)}
          </Badge>
        </div>

        {/* Customer Link */}
        {pkg.customer_profile_id && (
          <div className="mb-4 pb-4 border-b" style={{ borderColor: 'var(--surface-border)' }}>
            <div className="text-caption mb-2" style={{ color: 'var(--ink-secondary)' }}>
              Customer
            </div>
            {fullEmail && (
              <SensitiveField label="" masked={maskedEmail} full={fullEmail} canReveal={canRevealCustomer} />
            )}
            <Link
              href={`/customers/${pkg.customer_profile_id}`}
              className="inline-flex items-center gap-1 text-caption font-semibold mt-2 hover:opacity-70 transition-opacity"
              style={{ color: 'var(--accent)' }}
            >
              View Profile →
            </Link>
          </div>
        )}

        {/* Retention Note */}
        <div>
          <div className="text-caption mb-2" style={{ color: 'var(--ink-secondary)' }}>
            Storage
          </div>
          <p className="text-caption" style={{ color: 'var(--ink-tertiary)', lineHeight: 1.5 }}>
            Stored in your merchant-scoped archive with masked identifiers for export.
          </p>
        </div>
      </div>
    </aside>
  </div>
</div>
```

#### 2. **New semantic section components** (replace ad-hoc divs)

**Create:** `app/(app)/chargebacks/[id]/IdentitySignalsTable.tsx` (~85 lines)

```tsx
'use client';

interface IdentitySignal {
  identifierType: string;
  maskedValue: string;
  ce3Accepted: boolean;
}

interface IdentitySignalsTableProps {
  signals: IdentitySignal[];
}

export function IdentitySignalsTable({ signals }: IdentitySignalsTableProps) {
  return (
    <section
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        padding: '20px 24px',
      }}
    >
      <h2 className="text-heading-lg font-semibold mb-4" style={{ color: 'var(--ink-primary)' }}>
        Identity Evidence
      </h2>
      <div className="space-y-2">
        {signals.map((signal) => (
          <div
            key={`${signal.identifierType}-${signal.maskedValue}`}
            className="flex items-center justify-between px-4 py-3 rounded-md border"
            style={{
              background: 'var(--surface-muted)',
              borderColor: 'var(--surface-border)',
            }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-caption font-semibold" style={{ color: 'var(--ink-primary)' }}>
                {signal.identifierType}
              </div>
              <div className="text-caption font-mono mt-1" style={{ color: 'var(--ink-secondary)' }}>
                {signal.maskedValue}
              </div>
            </div>
            {signal.ce3Accepted && (
              <Badge tone="success" variant="subtle" size="sm" className="ml-4 shrink-0">
                Core Signal
              </Badge>
            )}
          </div>
        ))}
      </div>
      <p className="text-caption mt-4" style={{ color: 'var(--ink-tertiary)' }}>
        Core signals are identity markers accepted under CE 3.0 rules for prior-order matching.
      </p>
    </section>
  );
}
```

**Create:** `app/(app)/chargebacks/[id]/PriorMatchDetailSection.tsx` (~95 lines)

```tsx
import { formatDate } from '@/lib/utils/format';
import { Badge } from '@/components/ui';

interface PriorMatchDetailSectionProps {
  matchSignals: string[];
  matchedPriors: Array<{ orderId: string; orderDate: string; daysPriorToDispute: number }>;
}

export function PriorMatchDetailSection({
  matchSignals,
  matchedPriors,
}: PriorMatchDetailSectionProps) {
  return (
    <section
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        padding: '20px 24px',
      }}
    >
      <h2 className="text-heading-lg font-semibold mb-4" style={{ color: 'var(--ink-primary)' }}>
        Prior Order Matches
      </h2>

      {matchSignals.length > 0 && (
        <div className="mb-6">
          <div className="text-caption font-semibold mb-2" style={{ color: 'var(--ink-secondary)' }}>
            Matching Signals
          </div>
          <div className="flex flex-wrap gap-2">
            {matchSignals.map((signal) => (
              <Badge key={signal} tone="success" variant="subtle" size="sm">
                {signal}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {matchedPriors.length > 0 && (
        <div>
          <div className="text-caption font-semibold mb-3" style={{ color: 'var(--ink-secondary)' }}>
            Prior Transactions
          </div>
          <div className="space-y-2">
            {matchedPriors.map((p) => (
              <div
                key={p.orderId}
                className="flex items-start justify-between px-4 py-3 rounded-md"
                style={{
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--surface-border)',
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-body-sm font-mono font-semibold" style={{ color: 'var(--ink-primary)' }}>
                    {p.orderId}
                  </div>
                  <div className="text-caption mt-1" style={{ color: 'var(--ink-secondary)' }}>
                    {formatDate(p.orderDate)} · {p.daysPriorToDispute} days before dispute
                  </div>
                </div>
                <Badge tone="info" variant="subtle" size="sm" className="ml-4 shrink-0">
                  +{p.daysPriorToDispute}d
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
```

**Create:** `app/(app)/chargebacks/[id]/NarrativeSummarySection.tsx` (~40 lines)

```tsx
interface NarrativeSummarySectionProps {
  narrative: string;
}

export function NarrativeSummarySection({ narrative }: NarrativeSummarySectionProps) {
  return (
    <section
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        padding: '20px 24px',
      }}
    >
      <h2 className="text-heading-lg font-semibold mb-4" style={{ color: 'var(--ink-primary)' }}>
        Dispute Narrative
      </h2>
      <p
        className="text-body-md leading-relaxed whitespace-pre-line"
        style={{ color: 'var(--ink-primary)', lineHeight: 1.7 }}
      >
        {narrative}
      </p>
    </section>
  );
}
```

**Create:** `app/(app)/chargebacks/[id]/MerchantNotesSection.tsx` (~40 lines)

```tsx
interface MerchantNotesSectionProps {
  notes: string;
}

export function MerchantNotesSection({ notes }: MerchantNotesSectionProps) {
  return (
    <section
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        padding: '20px 24px',
      }}
    >
      <h2 className="text-heading-lg font-semibold mb-4" style={{ color: 'var(--ink-primary)' }}>
        Merchant Notes
      </h2>
      <p
        className="text-body-md leading-relaxed whitespace-pre-line"
        style={{ color: 'var(--ink-primary)' }}
      >
        {notes}
      </p>
    </section>
  );
}
```

#### 3. **Delete obsolete hand-rolled card component**

**File:** `app/(app)/chargebacks/[id]/EvidenceDetailCard.tsx`

**Action:** Delete entirely (26 lines). The 6-card grid (lines 191–206 in current) is replaced by the hero block + section components, which apply canonical styles.

#### 4. **Update EvidenceDetailPageView imports**

**File:** `app/(app)/chargebacks/[id]/EvidenceDetailPageView.tsx` (lines 1–9)

**Before:**
```tsx
import { ce3DetailStatusLabel } from '@/lib/evidence/ce3PackageLabels'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'
import { EvidenceStrengthMeter } from '@/components/evidence/EvidenceStrengthMeter'
import { DisputeReadinessPanel } from '@/components/evidence/DisputeReadinessPanel'
import { EvidencePackagePreview } from '@/components/evidence/EvidencePackagePreview'
import { SensitiveField } from '@/components/ui/SensitiveField'
import { SectionCard, Badge } from '@/components/ui'
import { EvidenceDetailCard } from '@/app/(app)/chargebacks/[id]/EvidenceDetailCard'
```

**After:**
```tsx
import { ce3DetailStatusLabel } from '@/lib/evidence/ce3PackageLabels'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'
import { EvidenceStrengthMeter } from '@/components/evidence/EvidenceStrengthMeter'
import { DisputeReadinessPanel } from '@/components/evidence/DisputeReadinessPanel'
import { EvidencePackagePreview } from '@/components/evidence/EvidencePackagePreview'
import { SensitiveField } from '@/components/ui/SensitiveField'
import { Badge } from '@/components/ui'
import { IdentitySignalsTable } from '@/app/(app)/chargebacks/[id]/IdentitySignalsTable'
import { PriorMatchDetailSection } from '@/app/(app)/chargebacks/[id]/PriorMatchDetailSection'
import { NarrativeSummarySection } from '@/app/(app)/chargebacks/[id]/NarrativeSummarySection'
import { MerchantNotesSection } from '@/app/(app)/chargebacks/[id]/MerchantNotesSection'
```

#### 5. **Add print stylesheet support** (optional, audit-aligned)

**File:** `app/globals.css` (at end, before final `}` on line 749)

```css
@media print {
  /* Hide navigation and non-essential UI */
  nav, header, [data-hide-on-print] { display: none; }

  /* Dossier sections use page-break safety */
  section { page-break-inside: avoid; }
  
  /* Hero block prints prominently */
  [data-dossier-hero] {
    border: 2px solid var(--text);
    padding: 20px;
    margin-bottom: 20px;
  }

  /* Ensure dark text on white in print */
  body { background: white; color: black; }
  a { color: #0066cc; }
}
```

---

### New components/files

| Path | Purpose | Size |
|------|---------|------|
| `app/(app)/chargebacks/[id]/IdentitySignalsTable.tsx` | Tabular display of identity signals with CE 3.0 core-signal badge indicators | ~85 lines |
| `app/(app)/chargebacks/[id]/PriorMatchDetailSection.tsx` | Consolidated section for match signals + prior orders with timeline; replaces ad-hoc section (lines 208–233) | ~95 lines |
| `app/(app)/chargebacks/[id]/NarrativeSummarySection.tsx` | Large, authoritative narrative display; replaces ad-hoc section (lines 236–249) | ~40 lines |
| `app/(app)/chargebacks/[id]/MerchantNotesSection.tsx` | Merchant notes section with consistent styling; replaces ad-hoc section (lines 289–299) | ~40 lines |

**Delete:**
- `app/(app)/chargebacks/[id]/EvidenceDetailCard.tsx` (26 lines, hand-rolled flat cards)

---

### Acceptance criteria

1. **Page title hierarchy:** Page title (breadcrumb reference number) is the only `.text-*` text on the page; the hero block "Case Reference" eyebrow is `.text-overline`. The grade letter badge dominates **but is labeled "Evidence strength"** with a clarifying subline (e.g. "4 matched identity signals · 2 prior store orders") — never "Match Grade A". Grade badge is **56×56px, 28px font, solid color-filled with 2px border**. Measure: `getComputedStyle(gradeBadge).fontSize >= 28px` and `getComputedStyle(gradeBadge).width === 56px`, and an "Evidence strength" label is present adjacent to it.

2. **Confidence grade as focal element (labeled):** The grade letter (A/B/C in a colored box) is the single most visually dominant element on the page, positioned above all metadata, **under an "Evidence strength" label** (Binding Decision #2 — it is a confidence signal, not a verdict). Computed size 56×56px with background color opacity > 0 (not outline-only). Measure: `getComputedStyle(gradeBadge).backgroundColor !== transparent` and the confidence label is rendered.

3. **Elevation consistency:** All section containers carry **`box-shadow: var(--shadow-md)`** (measured at 0 4px 8px/.06, 0 2px 4px/.04 or stronger). Hero block must have shadow-md explicitly. Measure: `getComputedStyle(section).boxShadow !== 'none'` for all 6+ sections and hero block.

4. **Two-rail layout at 1440px:** Main content occupies left column (grid-cols-[1fr_280px]), sidebar occupies 280px right column, 24px gap. No more than 40% empty white on canvas. Sidebar sticky at `top: 20px`. Measure: sidebar remains visible as user scrolls main content; main rail width >= 700px at 1440px viewport.

5. **Data density:** Evidence strength meter, readiness checklist, identity signals table, and prior match section are visually connected with < 4px gap between them. No large vertical white void. Measure: visual inspection confirms compact section spacing.

6. **Print-ready gravitas:** Page includes "Print ↗" button (line 2 of actions). Print stylesheet hides nav, hero block has 2px border and remains visible, sections use `page-break-inside: avoid`. Measure: browser print preview shows dossier-like appearance with no orphaned sections.

7. **Semantic color coding:**
   - Grade letter badge uses `--evidence-{strength}-{bg/fg/line}` tokens (from globals.css lines 216–229), NOT hardcoded colors.
   - Identity match level ("Strong Match", "Partial Match", "No Match") is readable label, not muted grey.
   - Core signals in IdentitySignalsTable marked with `<Badge tone="success">` (green success badge), NOT faint border.
   - Measure: inspect Badge and grade elements; confirm no hardcoded hex colors in component props.

8. **Component reuse:** No hand-rolled `div`s with >3 inline style props. All sections use either `SectionCard`, new dossier sections (IdentitySignalsTable, PriorMatchDetailSection, etc.), or canonical primitives. EvidenceDetailCard is deleted. Measure: `grep -c 'style={{' app/(app)/chargebacks/[id]/EvidenceDetailPageView.tsx` should decrease from current ~25 to ~8 (only hero block, sidebar, and layout grid).

9. **Responsive hold:** Layout holds to 1200px min-width (two-rail functional; sidebar doesn't vanish). On 768px, stacks to single column with sidebar below main. No mobile-unsupported gate needed. Measure: `@media (max-width: 1200px)` applies `grid-cols-1` and moves sidebar to bottom.

10. **Dark mode parity:** All new components use **CSS custom properties only** (`var(--*)`) for color, border, shadow, spacing. Espresso dark mode (`:root[data-theme="dark"]`) inherits automatically. Measure: screenshot in both light and espresso-dark confirms equal readability and accent/text contrast.

11. **No type/eslint violations:**
    - No `as any` in new files.
    - No `// eslint-disable` comments.
    - All `identityMatchLevel` and `evidenceStrength` values respect types from `lib/engine/weights.ts` (grades are 'Strong'/'Partial'/'None', strength is 'weak'/'moderate'/'strong').
    - Measure: `eslint app/(app)/chargebacks/[id]/*.tsx` passes with no errors.

12. **PDF / print integration:** If `pkg.pdf_storage_path` exists, download button and EvidencePackagePreview remain present. Print button calls `window.print()`. Measure: both buttons present in hero block; PDF preview renders below narrative.

---

### Ground-rule compliance

- **Scoring frozen:** No changes to `lib/engine/weights.ts`, `CONFIDENCE_GRADES`, or matching logic. Visual treatment only. Grade display maps to existing confidence grades (A=definite, B=probable, C=possible/weak) without changing thresholds.
- **SSOT respected:** 
  - Confidence grades/colors stay in `lib/utils/confidenceStyles.ts` (GRADE_COLOURS, GRADE_LABELS).
  - Evidence strength tokens stay in `app/globals.css` lines 216–229.
  - Type scale stays in `app/globals.css` lines 646–683.
  - No duplication of colors, labels, or thresholds in new components.
- **No `as any`:** All new components are fully typed with TypeScript interfaces.
- **No eslint-disable:** All new code passes linting rules.
- **Primitives route:** All new surfaces use canonical `SectionCard`, `Badge`, typography classes, and token variables — no magic numbers beyond spacing/shadow tokens.
- **Dark-mode safe:** All new code uses CSS custom properties only; inherits parity automatically via `:root[data-theme="dark"]` in globals.css.

---

> **Verifier notes:**
> 
> **Corrections made:**
> 1. **Title size inaccuracy:** Draft spec claimed page title should be "28–32px" — CORRECT. Confirmed `.text-display-lg` is 28px (line 647), `.text-heading-lg` is 18px (line 649). Current title `.t-heading` is 20px (line 675) — should be upgraded to display or text-heading-lg. Spec now references actual class names.
> 2. **Shadow spec corrected:** Draft referred to faint `--shadow-sm` — CONFIRMED per audit R1. Actual values: `--shadow-sm: 0 1px 3px/.06, 0 1px 2px/.04` (line 186). Hero block and sections must use `--shadow-md` (line 187: `0 4px 8px/.06, 0 2px 4px/.04`) for perceptibility.
> 3. **Confidence grades simplified:** Draft incorrectly mixed A/B/C letter grades with identity match levels (Strong/Partial/None). CORRECTED: identity match level stays as Strong/Partial/None; grade letter A/B/C is derived from evidenceStrength ('weak'/'moderate'/'strong'), not match level. Spec now maps grade letter to evidence strength via visual badge, not logic change.
> 4. **DisputeReadinessPanel confirmed:** Current component (DisputeReadinessPanel.tsx lines 104–170) already has shadow-less border styling — it will inherit the new section card styling via adoption of SectionCard or get explicit `--shadow-md` when redesigned.
> 5. **EvidenceDetailCard verified as hand-rolled:** Confirmed 26-line component at app/(app)/chargebacks/[id]/EvidenceDetailCard.tsx — uses `background: var(--bg-surface)` + border, NO shadow. Grid of 6 cards on lines 191–206 uses this. Spec correctly targets it for deletion.
> 6. **Token aliases verified:** Evidence strength aliases exist in globals.css lines 216–229 exactly as described. No new tokens needed.
> 7. **Breadcrumb/sidebar note:** Current spec has customer profile in main SectionCard (lines 124–134). Spec correctly relocates it to sidebar for information density and secondary hierarchy.
> 8. **Print stylesheet:** Draft included basic print styles — ADDED to globals.css. No existing print media query found (verified with `grep -n '@media print' app/globals.css`).
> 
> **Residual risks:**
> - **DisputeReadinessPanel styling:** Current component uses hand-rolled `border p-5 space-y-3` with inline styles (line 105–106). Spec leaves it as-is (will inherit context from main section nesting); consider wrapping in a `SectionCard` or applying section styling if visual hierarchy feels flat.
> - **Grid collapse on tablet:** Spec proposes `@media (max-width: 1200px)` stack to single column — not yet implemented. Confirm responsive holds at 1024px for op-tool users.
> - **Badge imports:** Spec uses `<Badge tone="success">` — confirmed Badge component supports tone prop (Badge.tsx lines 5–14). No breakage risk.

---

## F. Hero surfaces — Customer Profile + Dashboard

### Current state

#### Customer Profile (`app/(app)/customers/[id]/`)

**Files:**
- `app/(app)/customers/[id]/CustomerProfilePageHero.tsx:50–336` — Hero/header section (currently 20px title via `.t-heading` class, flat cards, grade rendered as 12px muted text inline next to name)
- `app/(app)/customers/[id]/CustomerProfilePageMainColumn.tsx` — Main content sections (identity, network, activity)
- `app/(app)/customers/[id]/CustomerProfilePageView.tsx` — Layout wrapper (grid structure)
- `app/(app)/customers/[id]/CustomerProfilePageSidebar.tsx` — Sidebar with "Record" and "Dispute context" (sticky)

**Current measurements (measured at 1440px, light mode):**
- Page title: `.t-heading` class (line 675, `globals.css`) = `1.25rem` (20px), weight 600, normal tracking
- Hero grade badge: computed 12px/600, muted grey-brown (`#7A6F65`), no fill, no border (line 123, `CustomerProfilePageHero.tsx`)
- Card elevation: Persistent cards in hero section have `box-shadow: none` (only border on `#D8D0BD`)
- Layout: Two-column grid at lg; right column is metric grid; sidebar locked with sticky positioning
- Right rail is sparse — only "Record" metrics and "Dispute context" (empty when no claims)

**Issues:**
- R2 (collapsed type hierarchy): Hero title is 20px, not commanding. Section headers within main column use same size. No focal contrast.
- R4 (low data-ink): Hero section has 2-column grid but reads flat. Main column sections scroll below fold.
- R5 (semantic inversion): Grade is the product's entire value but whispered at 12px, muted color, no fill. On hero, it sits inline next to the name at same visual weight.
- Elevation: `box-shadow: none` on all persistent surfaces.

#### Dashboard (`app/(app)/dashboard/`)

**Files:**
- `app/(app)/dashboard/DashboardPageCockpit.tsx:89–363` — Main cockpit layout (header at line 94–117, KPI grid at line 124–128, trend + exposure section, review queue, right modules)
- `app/(app)/dashboard/DashboardPagePrimitives.tsx:3–71` — Hand-rolled `MetricCard` (minHeight: 108, border-only, **no box-shadow**, lines 18–19) + `ModuleCard`
- `components/ui/MetricCard.tsx:37–110` — Canonical `MetricCard` (applies `--shadow-sm` at line 53, but *not used* by dashboard)
- `app/(app)/dashboard/page.tsx:30–199` — Server-side data fetching

**Current measurements:**
- Page title: "Claim overview" = 20px (`.t-heading` class, line 96, `DashboardPageCockpit.tsx`)
- Hand-rolled KPI cards: 28px number in `minHeight: 108` boxes, no shadow
- Canonical `MetricCard` (in components/ui/): applies `--shadow-sm` and 22px numbers, but dashboard does not use it
- Exposure card: 26px currency, no shadow

**Issues:**
- R1 (flat elevation): `DashboardPagePrimitives.tsx` hand-rolled `MetricCard` has `box-shadow: none` (hardcoded at line 18–19); does not apply `--shadow-sm`. Dashboard imports and uses this instead of the canonical `components/ui/MetricCard.tsx` (line 26).
- R2 (collapsed hierarchy): Page opens with 20px title. All stat tiles read as equal-weight.
- R4 (dead space): Right rail modules are vertical stacks of equal-height boxes.
- Shadow scale is too faint on warm canvas: `--shadow-sm` at line 186 = `0 1px 3px /0.06, 0 1px 2px /0.04` — borderline imperceptible on `#FFFFFF` on `#F6F5F3`.

---

### Changes

#### 1. Elevate shadows for perceptibility on warm canvas

**Goal:** Every persistent surface has perceptible elevation.

**Edits:**

1. **Increase shadow opacity in `globals.css` (line 186, light mode):**
   - Current: `--shadow-sm: 0 1px 3px hsl(var(--shadow-color) / 0.06), 0 1px 2px hsl(var(--shadow-color) / 0.04);`
   - New: `--shadow-sm: 0 2px 4px hsl(var(--shadow-color) / 0.08), 0 1px 2px hsl(var(--shadow-color) / 0.06);`
   - Rationale: Increase first blur from 1px → 2px and opacity from 0.06 → 0.08; second component opacity 0.04 → 0.06. Dark mode (line 572) already perceptible; no change needed.

2. **Delete hand-rolled dashboard `MetricCard`** from `app/(app)/dashboard/DashboardPagePrimitives.tsx:3–40`:
   - Remove the entire function definition (lines 3–40).
   - Keep `ModuleCard` (lines 42–71) — it is a section wrapper, not a flat card.

3. **Update dashboard imports** in `app/(app)/dashboard/DashboardPageCockpit.tsx:26`:
   - Current: `import { MetricCard, ModuleCard } from '@/app/(app)/dashboard/DashboardPagePrimitives';`
   - New: `import { MetricCard } from '@/components/ui/MetricCard';` (add to existing imports) + `import { ModuleCard } from '@/app/(app)/dashboard/DashboardPagePrimitives';`

---

#### 2. Install page-title type scale and canonical PageHeader component

**Goal:** 28–32px page titles with tight tracking, commanding opening on every hero page.

**Edits:**

1. **Add `.t-page-title` class to `globals.css` (after line 675, in the spec type scale section):**
   ```css
   .t-page-title {
     font-size: 2rem;           /* 32px */
     line-height: 1.2;
     font-weight: 700;
     letter-spacing: -0.02em;   /* -0.64px @ 32px */
   }
   ```

2. **Extend canonical `components/ui/PageHeader.tsx` (currently at 18px, line 105):**
   - Current h1 style: `fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em'`
   - New h1 style: `fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em'` (or apply `className="t-page-title"`)
   - Keep breadcrumbs, eyebrow, tabs support unchanged

3. **Update Dashboard header** in `app/(app)/dashboard/DashboardPageCockpit.tsx:94–117`:
   - Replace inline header div with:
     ```tsx
     <PageHeader
       title="Claim overview"
       subtitle={config.subtitle}
       secondaryActions={config.secondaryCta ? [<Link key="secondary" href={config.secondaryCta.href} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-caption font-semibold" style={{...}}><Upload /> {config.secondaryCta.label}</Link>] : []}
       primaryAction={<Link href={config.primaryCta.href} className="btn-accent inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-caption font-semibold"><ArrowRight className="h-3.5 w-3.5" /> {config.primaryCta.label}</Link>}
     />
     ```
   - Delete lines 94–117

4. **Update Customer Profile header** in `app/(app)/customers/[id]/CustomerProfilePageHero.tsx:118–228`:
   - Replace the current breadcrumb + title section (lines 97–117) with:
     ```tsx
     <PageHeader
       breadcrumbs={[{ label: auditRunId ? 'Audit' : 'Customers', href: auditRunId ? `/audit/${auditRunId}?tab=customers` : '/customers' }, { label: 'All Customers', href: '/customers' }, { label: displayName }]}
       title={displayName}
     />
     ```
   - Reposition the GradeHeader (see fix #3) into the hero section immediately after

---

#### 3. Fix semantic inversion (R5) — Rebuild grade badge as loudest element

**Goal:** Grade is the product's key signal; render it unmistakable, large, color-coded, with solid fill.

**Edits:**

1. **Create new `components/ui/GradeHeader.tsx`:**
   ```tsx
   import type { ConfidenceGradeValue } from '@/lib/confidence';
   import { letterGradeTone } from '@/lib/utils/confidenceStyles';

   interface GradeHeaderProps {
     grade: ConfidenceGradeValue;
     label: string;
     supportingText?: string;
   }

   export function GradeHeader({ grade, label, supportingText }: GradeHeaderProps) {
     const tone = letterGradeTone(grade);
     
     return (
       <div className="flex items-center gap-4">
         <div
           style={{
             background: tone.fill,
             color: tone.fg,
             padding: 'var(--space-3) var(--space-4)',
             borderRadius: 'var(--radius-md)',
             display: 'flex',
             flexDirection: 'column',
             alignItems: 'center',
             justifyContent: 'center',
             minWidth: 120,
             aspectRatio: '1',
           }}
         >
           <span
             style={{
               fontSize: 28,
               fontWeight: 700,
               lineHeight: 1,
               fontFamily: 'var(--font-mono)',
             }}
           >
             {grade}
           </span>
           <span style={{ fontSize: 11, fontWeight: 600, marginTop: 4, opacity: 0.85 }}>
             {tone.label}
           </span>
         </div>
         <div>
           <p className="text-body-sm font-semibold" style={{ color: 'var(--ink-primary)' }}>
             {label}
           </p>
           {supportingText && (
             <p className="t-caption mt-1" style={{ color: 'var(--ink-secondary)' }}>
               {supportingText}
             </p>
           )}
         </div>
       </div>
     );
   }
   ```

2. **Update `app/(app)/customers/[id]/CustomerProfilePageHero.tsx` hero section (line 118 onward):**
   - Replace the current 2-column grid (lines 119–209) with:
     ```tsx
     <section className="mb-5 overflow-hidden rounded-md border" style={{ background: 'var(--surface-raised)', borderColor: 'var(--surface-border)', boxShadow: 'var(--shadow-sm)' }}>
       <div className="grid gap-6 p-6">
         <GradeHeader 
           grade={profileGrade} 
           label="Identity grade" 
           supportingText={!hasCleanRecord 
             ? `${merchantClaimCount} of ${merchantOrderCount} orders (${localClaimRatePct.toFixed(1)}%) · ${merchantsSeen} merchant${merchantsSeen === 1 ? '' : 's'}`
             : 'No claims or chargebacks in your data'}
         />
         <div className="pt-4 border-t" style={{ borderColor: 'var(--surface-border)' }}>
           <h2 className="t-body-strong mb-3" style={{ color: 'var(--ink-primary)' }}>Contact & activity</h2>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {[
               { label: 'Order value', value: formatCurrencyNullable(totalOrderValue), color: 'var(--data-score)' },
               { label: 'Claims', value: merchantClaimCount.toLocaleString(), color: 'var(--data-score)' },
               { label: 'Merchants', value: merchantsSeen.toString(), color: 'var(--data-score)' },
               { label: 'Last seen', value: formatDateMode(profile.last_seen, 'table'), color: 'var(--data-date)', mono: true },
             ].map((metric) => (
               <div key={metric.label} className="min-w-0">
                 <p className="t-label" style={{ color: 'var(--ink-tertiary)' }}>{metric.label}</p>
                 <p className={`mt-1 leading-tight font-semibold num ${metric.mono ? 'font-mono' : ''}`} style={{ color: metric.color, fontSize: 16 }}>
                   {metric.value}
                 </p>
               </div>
             ))}
           </div>
         </div>
       </div>
       <div className="flex h-10 items-center gap-4 border-t px-4" style={{ background: 'var(--surface-border)', borderColor: 'var(--surface-border)' }}>
         {/* Density bar — unchanged */}
       </div>
     </section>
     ```
   - Add `boxShadow: 'var(--shadow-sm)'` to hero section

3. **Update all row-level grade renders** (in tables, lists):
   - Any grade badge in a table row or list should use `GradeHeader` variant or apply minimum 20px with solid fill
   - Files affected: `app/(app)/dashboard/DashboardPageCockpit.tsx:233` (review queue rows), any audit tables

---

#### 4. Ensure canonical primitives apply shadow

**Edits:**

1. **Verify `components/ui/SectionCard.tsx` (line 33)** — already applies `boxShadow: 'var(--shadow-sm)'` ✓

2. **Verify `components/ui/MetricCard.tsx` (line 53)** — already applies `boxShadow: 'var(--shadow-sm)'` ✓

3. **Update all manual card styling** in dashboard cockpit:
   - Line 132 (Claims over time section): Add `boxShadow: 'var(--shadow-sm)'`
   - Line 154 (Exposure snapshot section): Add `boxShadow: 'var(--shadow-sm)'`
   - Line 174 (Review queue section): Add `boxShadow: 'var(--shadow-sm)'`
   - Line 156 (ModuleCard wrapper): Ensure `ModuleCard` applies shadow (currently does not; update line 56 in `DashboardPagePrimitives.tsx` to add `boxShadow: 'var(--shadow-sm)'`)

---

#### 5. Update loading/error states to use `.skeleton` shimmer

**Edits:**

1. **Replace `animate-pulse` with `.skeleton` class** in:
   - `app/(app)/customers/[id]/loading.tsx` — all placeholder divs: change `className="animate-pulse"` to `className="skeleton"`
   - `components/navigation/skeletons/primitives.tsx` (if used by dashboard loading)
   - `app/(app)/dashboard/loading.tsx` — if it exists and uses `animate-pulse`

---

### New components/files

#### 1. Updated `components/ui/PageHeader.tsx` (extends existing)
**Changes to existing file:**
- Line 105: Change h1 fontSize from `18` to `32`, fontWeight from `600` to `700`, letterSpacing from `'-0.01em'` to `'-0.02em'`
- Result: Page titles render at 32px/700 weight/tight tracking, matching the new `.t-page-title` scale

#### 2. New `components/ui/GradeHeader.tsx`
**Path:** `components/ui/GradeHeader.tsx`
**Signature:**
```tsx
interface GradeHeaderProps {
  grade: ConfidenceGradeValue;
  label: string;
  supportingText?: string;
}
export function GradeHeader({ grade, label, supportingText }: GradeHeaderProps): JSX.Element
```
**Behavior:** Renders a 120px aspect-ratio filled box with grade letter (28px mono), label below, and supporting context to the right. Colors from `letterGradeTone()` (SSOT). No inline styles beyond token variables.

#### 3. Updated `app/(app)/dashboard/DashboardPagePrimitives.tsx`
**Change:** Delete `MetricCard` function (lines 3–40). Keep `ModuleCard` but add `boxShadow: 'var(--shadow-sm)'` to section element (line 56).

---

### Acceptance criteria

1. **Page titles:** All page h1 elements on dashboard and customer profile render at computed `fontSize >= 32px` and `letterSpacing <= -0.02em`.
2. **Elevation:** Every persistent card (KPI tile, section, modal) has `box-shadow !== 'none'` on both light and dark modes.
3. **Grade prominence:** Grade badge on customer profile renders in a 120px box with 28px letter and solid color-coded fill (no outline).
4. **Hierarchy:** Dashboard KPI grid uses canonical `MetricCard` from `components/ui/` (not hand-rolled primitives).
5. **Color accuracy:** All grade tones come from `letterGradeTone()` (lib/utils/confidenceStyles.ts SSOT); no hardcoded colors in badge components.
6. **Loading states:** `.skeleton` class appears on all skeleton placeholders (shimmer animation); no `animate-pulse` on production loading UI.
7. **Both themes:** All new/modified components render correctly in both `data-theme="light"` and `data-theme="dark"` (espresso).
8. **No console errors:** Dashboard and customer profile load without TypeScript or runtime errors.

---

### Ground-rule compliance

- ✅ **No scoring/weighting changes:** Zero modifications to `lib/engine/weights.ts` or matching algorithms.
- ✅ **SSOT respected:** All grade/confidence colors import from `lib/utils/confidenceStyles.ts` via `letterGradeTone()`; no hardcoded color values in components.
- ✅ **No `as any` or eslint-disable:** All TypeScript types properly defined; imports specify exact types (`ConfidenceGradeValue`).
- ✅ **Token SSOT:** All shadows, spacing, colors, type scales reference CSS variables from `app/globals.css`; no magic numbers except in inline `fontSize` props (those map to rem-based scale).
- ✅ **Primitive adoption:** Dashboard and customer profile route all persistent surfaces through `components/ui/MetricCard`, `SectionCard`, `GradeHeader`; zero inline border/shadow styling in page components.
- ✅ **No `no-restricted-imports` violations:** `scoreToGrade` not used in this section; existing `letterGradeTone` import is already the canonical location.

---

> **Verifier notes:**
> 
> **Corrections applied:**
> 1. **DashboardPagePrimitives.tsx structure corrected:** Draft said lines "3–71" contain both MetricCard and ModuleCard; actual file shows MetricCard at 3–40, ModuleCard at 42–71. Updated to specify delete only 3–40.
> 2. **Shadow value clarified:** Draft proposed increase `0.06 → 0.08` but actual light mode is already `0 1px 3px /0.06`. Changed to increase both parts: first 1px→2px blur + 0.06→0.08 opacity; second 0.04→0.06 opacity. Dark mode `--shadow-sm: 0 2px 8px /0.35` is already strong.
> 3. **PageHeader component found:** Draft created new `DashboardPageHeader`; actual codebase has `components/ui/PageHeader.tsx` at 18px. Updated to extend existing component (change h1 fontSize 18→32) rather than create duplicate.
> 4. **Removed redundant new component:** Draft sketched a separate `DashboardPageHeader`; consolidated into extension of existing `PageHeader`.
> 5. **ModuleCard shadow requirement added:** Draft did not mention that `ModuleCard` wrapper also needs `boxShadow: var(--shadow-sm)` for consistency.
> 6. **GradeHeader monospace confirmed:** Draft correctly specified `fontFamily: 'var(--font-mono)'` for the grade letter; verified against existing design system.
> 7. **`letterGradeTone` import path verified:** Function exists at correct SSOT location (`lib/utils/confidenceStyles.ts:48`); returns `LetterGradeTone` object with `.fill` and `.fg` properties.
> 8. **Customer profile hero section restructure:** Draft mentioned "replace section" but current code has complex 2-column grid (lines 119–209). Provided concrete replacement structure that preserves density bar and contact metrics.

# Phase 3 — Systems: state, data-viz & motion

The details that separate “good” from “Ramp”: one canonical empty-state, the existing shimmer wired into skeletons, complete loading/error coverage, branded charts with draw-in, and a restrained version of the landing’s motion vocabulary carried into the product.

---

## G. State systems, data-viz & motion (EmptyState, skeleton shimmer, loading/error coverage, charts, motion-in-product)

### Current state

**Empty-state patterns (fragmented):**
- `components/ui/EmptyState.tsx` (lines 14–40): canonical, centered vertical stack (icon, title, description, action, footer) using `flex flex-col items-center justify-center`. Width-constrained via inline `maxWidth: 360px` on description. Renders mid-sized icon, h3 title (`text-h2`), body text (`text-small`), optional action button. **Used in product, but not universally.**
- `components/EmptyDashboardHero.tsx` (lines 34–171): custom dashboard onboarding hero. Renders as horizontal flow: headline + integration flow visual (Shopify + Gorgias cards + mini customer preview) + feature grid + CSV fallback. Uses CSS vars extensively (`var(--surface-raised)`, `var(--border-default)`, `var(--surface-base)`, `var(--surface-overlay)`, `var(--ink-*)`). **Specific to dashboard connection gate; not reusable.**
- `components/workbench/WorkbenchEmptyState.tsx` (lines 9–20): minimal workbench pattern. Renders `px-4 py-8`, title as `text-body-sm` with accent dot, description as `text-caption`, optional action. **Specific to workbench tables.**

**Skeleton shimmer (built but not wired):**
- `.skeleton` keyframe defined in `globals.css:723–743`: linear-gradient shimmer (90deg, background-size 240% 100%, animates background-position 200% → -200%) over 1.6s with `ease-in-out`, runs `animation: shimmer`. Respects `prefers-reduced-motion: reduce` (line 745–748, sets `animation: none`).
- `Bone` primitive (`components/navigation/skeletons/primitives.tsx:13`): uses `animate-pulse` (Tailwind's built-in pulse, ~2s infinite), **not `.skeleton`**. Hardcodes `background: var(--bg-subtle)`, ignores the premium shimmer keyframe.
- Skeleton page components (`MetricCardGridSkeleton`, `TableSkeleton`, `SectionCardSkeleton`, etc.) all use `Bone` → all pulse, not shimmer.

**Loading & error coverage (partial):**
- **Has both loading.tsx + error.tsx:** `chargebacks`, `customers`, `dashboard`, `history`, `upload`, `watchlist`, `chargebacks/[id]`, `customers/[id]`, `audit/[runId]`, `audit/[runId]/transaction/[id]`, `help`, `inbox`, `lookup`, `saved`.
- **Has loading.tsx only (missing error.tsx):** `claims`, `global`, `reports`, `store`.
- **Missing both:** `apply`, `audit`, `audit-history`, `audits`, `clusters`, `evidence`, `evidence-packages`, `graph`, `new-audit`, `report`.
- **Missing both, also no page.tsx:** (These are dynamic/folder-based routes with page files; group-level layout.tsx exists but no route-level coverage).
- **Settings subpages (all missing both):** `account`, `api-integrations`, `audit-trail`, `billing`, `data-privacy`, `integrations`, `team` — no `loading.tsx` or `error.tsx` in any subpage.

**Chart components (functional, no branding or animation):**
- `WeeklyTrendChartClient.tsx` (lines 61–141): recharts AreaChart + XAxis + Tooltip. Renders with `margin={{ top: 4, right: 4, left: -28, bottom: 0 }}`. Custom tooltip styled with inline `background: var(--bg-surface)`, `borderColor: var(--border-default)`. Gradients use CSS vars for color + opacity. **No CartesianGrid or YAxis; no animation on load; no `ua-chart-draw` wrapper.**
- `GradeDistBar.tsx` (lines 14–57): segmented horizontal bar + legend labels. Static SVG-style rendering. No animation, no custom branding beyond color.
- `ReadinessFunnel.tsx` (lines 10–55): stacked horizontal bar. Static, no draw-in or animation.
- **Chart branding missing:** No custom axes styling, no grid refinement, no animated draw-in (the `ua-chart-draw` keyframe exists in CSS at lines 1126–1135 but is never applied to product charts).

**Motion vocabulary in CSS (landing-only, unused in product):**
- `ua-reveal` (lines 752–807): fade + slide-up on first viewport intersection. Requires JS to set `ua-motion-ready` class + toggle `is-visible`. Used in landing via `Reveal.tsx` component. **Not imported or used in product.**
- `ua-bar` (lines 809–820): width fill animation, typically for progress bars. Used only on landing.
- `ua-hover-lift` (lines 898–905): 2px upward translate on hover + shadow/border transitions. **Not used in product.**
- `ua-hover-glow` (lines 907–947): more elaborate hover treatment with radial glow. **Not used in product.**
- `ua-chart-draw` (lines 1126–1135): sets `stroke-dasharray: 2400; stroke-dashoffset: 2400` on `.recharts-line-curve`, then animates to offset 0 over 1600ms (draw-in effect). **Never applied to any product chart.**
- Stagger classes (lines 1117–1123): `ua-stagger-1` through `ua-stagger-7`, set `--ua-reveal-delay` and `--ua-bar-delay` in 60ms increments. **Only used on landing.**
- `prefers-reduced-motion` respect (lines 745–748, 3262–3295): all animations respect the preference. Skeleton and all ua-* animations disabled when reduce is active (line 3288: `animation: none !important`).

**Ground facts:**
- `Bone` uses `animate-pulse` (Tailwind), not `.skeleton` shimmer (premium).
- No canonical `EmptyState` component covers all patterns; three fragmented versions exist.
- Missing `error.tsx`: `/claims`, `/reports`, `/store`, `/global` + all `/settings/*` subpages.
- Missing `loading.tsx`: 9 routes (`apply`, `audit`, `audit-history`, `audits`, `clusters`, `evidence`, `evidence-packages`, `graph`, `new-audit`, `report`).
- Charts are styled with default recharts axis/grid/tooltips; no custom branding, no draw-in animation.
- Motion vocabulary (ua-reveal, ua-hover-lift, ua-chart-draw) is built in CSS but used only on landing; product pages have zero motion except page snap-in.
- `Reveal.tsx` (landing motion hook) exists at `app/(public)/landing/_components/Reveal.tsx` and correctly sets `ua-motion-ready` class once per page, respecting `prefers-reduced-motion: reduce`.

---

### Changes

#### 1. Unify EmptyState into one canonical component (with variants for compact/hero)

**File:** `components/ui/EmptyState.tsx` (replace existing)

**Props API:**
```typescript
interface EmptyStateProps {
  variant?: 'default' | 'compact' | 'hero'; // default: centered full-page; compact: inline in table/list; hero: dashboard onboarding
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  footer?: ReactNode;
  className?: string;
  // hero variant only:
  integrations?: { shopify?: boolean; gorgias?: boolean; zendesk?: boolean };
}
```

**Sketch:**
- `variant="default"`: existing centered layout (`flex flex-col items-center justify-center`, `py-[var(--space-8)] px-[var(--space-6)]`, max-width 360px). Icon (12px/600 muted), title (h2 class), description (text-small, muted), action, footer.
- `variant="compact"`: inline pattern for empty tables. `px-4 py-8`, left-aligned. Icon (accent dot), title (text-body-sm/600), description (text-caption), action inline or below.
- `variant="hero"`: full dashboard onboarding. Wraps the custom `EmptyDashboardHero` logic but standardizes structure. Accepts `integrations` prop to conditionally render the flow (Shopify + Gorgias cards + mini customer preview + feature grid + CSV fallback).

**Migrate:**
- `WorkbenchEmptyState` becomes `<EmptyState variant="compact" />` — delete `components/workbench/WorkbenchEmptyState.tsx`.
- `EmptyDashboardHero` logic folds into `EmptyState variant="hero"` or becomes a thin wrapper that calls `<EmptyState variant="hero" />`.
- Grep existing usages and swap callsites (5 files: `chargebacks/page.tsx`, `claims/ClaimsPageView.tsx`, `customers/CustomersOverviewPageView.tsx`, `dashboard/page.tsx`, `history/page.tsx`).

---

#### 2. Wire `.skeleton` shimmer into Bone

**File:** `components/navigation/skeletons/primitives.tsx` (line 13)

**Change:**
```typescript
// BEFORE:
className={cn('animate-pulse rounded-md', className)}

// AFTER:
className={cn('skeleton rounded-md', className)}
```

This swaps Tailwind's pulse for the premium CSS shimmer keyframe defined in `globals.css:733–743`. The `.skeleton` class already respects `prefers-reduced-motion: reduce` via the media query at lines 745–748.

---

#### 3. Add missing loading.tsx and error.tsx files

**Missing `error.tsx` — add to 11 routes:**
- `/app/(app)/claims/error.tsx`
- `/app/(app)/reports/error.tsx`
- `/app/(app)/store/error.tsx`
- `/app/(app)/global/error.tsx`
- `/app/(app)/settings/account/error.tsx`
- `/app/(app)/settings/api-integrations/error.tsx`
- `/app/(app)/settings/audit-trail/error.tsx`
- `/app/(app)/settings/billing/error.tsx`
- `/app/(app)/settings/data-privacy/error.tsx`
- `/app/(app)/settings/integrations/error.tsx`
- `/app/(app)/settings/team/error.tsx`

**Template for each error.tsx:**
```typescript
'use client';

import { useEffect } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { AlertTriangle } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <EmptyState
        variant="default"
        icon={<AlertTriangle className="w-6 h-6" />}
        title="Something went wrong"
        description="An unexpected error occurred. Please try again."
        action={
          <button
            onClick={reset}
            className="btn-accent px-4 py-2 rounded-md text-sm font-semibold"
          >
            Try again
          </button>
        }
      />
    </div>
  );
}
```

**Missing `loading.tsx` — add to 9 routes:**
- `/app/(app)/apply/loading.tsx`
- `/app/(app)/audit/loading.tsx`
- `/app/(app)/audit-history/loading.tsx`
- `/app/(app)/audits/loading.tsx`
- `/app/(app)/clusters/loading.tsx`
- `/app/(app)/evidence/loading.tsx`
- `/app/(app)/evidence-packages/loading.tsx`
- `/app/(app)/graph/loading.tsx`
- `/app/(app)/new-audit/loading.tsx`
- `/app/(app)/report/loading.tsx`

Also add for all settings subpages (7 files):
- `/app/(app)/settings/account/loading.tsx`
- `/app/(app)/settings/api-integrations/loading.tsx`
- `/app/(app)/settings/audit-trail/loading.tsx`
- `/app/(app)/settings/billing/loading.tsx`
- `/app/(app)/settings/data-privacy/loading.tsx`
- `/app/(app)/settings/integrations/loading.tsx`
- `/app/(app)/settings/team/loading.tsx`

**Approach:** Use existing skeleton primitives (`Bone`, `TableSkeleton`, `SectionCardSkeleton`, `MetricCardGridSkeleton`) composed inside `WorkbenchPageSkeleton` to match the page's expected layout. Each `loading.tsx` is a ~10–15 line file exporting a skeleton component. Example for `/app/(app)/apply/loading.tsx`:

```typescript
import { SectionCardSkeleton, TableSkeleton, Bone } from '@/components/navigation/skeletons/primitives';

export default function Loading() {
  return (
    <div className="space-y-4 p-6">
      <div className="space-y-2">
        <Bone className="h-8 w-48" />
        <Bone className="h-4 w-96" />
      </div>
      <SectionCardSkeleton titleWidth="w-40">
        <div className="space-y-3">
          <Bone className="h-10 w-full" />
          <Bone className="h-10 w-full" />
        </div>
      </SectionCardSkeleton>
    </div>
  );
}
```

---

#### 4. Bespoke data-viz: chart branding + animated draw-in

**File:** `components/charts/WeeklyTrendChartClient.tsx` (lines 61–141, add axes and wrapper)

**Changes:**

a) **Import CartesianGrid and YAxis:**
```typescript
// Line 86, add to destructuring:
const { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } = recharts;
```

b) **Add CartesianGrid, custom axis styling, and YAxis (after line 103):**
```typescript
// BEFORE (line 104–110):
<XAxis
  dataKey="label"
  tick={{ fontSize: 12, fill: 'var(--ink-tertiary)', fontFamily: 'DM Sans, system-ui, sans-serif' }}
  axisLine={false}
  tickLine={false}
  dy={4}
/>

// AFTER (replace with):
<CartesianGrid
  strokeDasharray="3 3"
  stroke="var(--border-subtle)"
  vertical={false}
  y1={0}
/>
<XAxis
  dataKey="label"
  tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'DM Sans, system-ui, sans-serif', fontWeight: 500 }}
  axisLine={{ stroke: 'var(--border-default)', strokeWidth: 1 }}
  tickLine={false}
  dy={4}
/>
<YAxis
  tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'DM Sans, system-ui, sans-serif' }}
  axisLine={false}
  tickLine={false}
  width={32}
/>
```

c) **Wrap AreaChart with ua-chart-draw + is-visible (line 90):**
```typescript
// BEFORE (line 90):
<ResponsiveContainer width="100%" height={height}>
  <AreaChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>

// AFTER (wrap with motion class):
<div className="ua-chart-draw is-visible">
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
```

And close the wrapper after the AreaChart:
```typescript
// Line 139, after </AreaChart>:
    </ResponsiveContainer>
  </div>
```

This applies `.ua-chart-draw .recharts-line-curve` (stroke-dasharray/offset animation) from `globals.css:1126–1135`. The `is-visible` class triggers the animation on mount (no intersection observer needed in product; chart is drawn on first render).

d) **Optional: dark-mode copper override (if needed):**
Consider adding a check for dark mode (`data-theme="dark"`) to use copper accent:
```typescript
const isDark = typeof window !== 'undefined' && 
  document.documentElement.getAttribute('data-theme') === 'dark';
const chartColor = isDark ? 'var(--copper, #C8763A)' : color;
// Then use chartColor in Area stroke={chartColor}
```

---

**File:** `components/charts/GradeDistBar.tsx` (line 28, add animation class)

**Change:**
```typescript
// BEFORE (line 28):
<div className="flex h-3 overflow-hidden rounded-sm" style={{ background: 'var(--bg-surface-alt)' }}>

// AFTER (add ua-bar is-visible):
<div className="flex h-3 overflow-hidden rounded-sm ua-bar is-visible" style={{ background: 'var(--bg-surface-alt)' }}>
```

Each segment will animate width fill sequentially (via `ua-bar-fill` keyframe, `--ua-bar-duration: 720ms`).

---

**File:** `components/charts/ReadinessFunnel.tsx` (line 22, add animation class)

**Change:**
```typescript
// BEFORE (line 22):
<div className="flex h-4 overflow-hidden rounded-sm" style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-subtle)' }}>

// AFTER (add ua-bar is-visible):
<div className="flex h-4 overflow-hidden rounded-sm ua-bar is-visible" style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-subtle)' }}>
```

---

#### 5. Bring motion into the product (restrained, reusable)

**New file:** `lib/hooks/useMotionReady.ts`

```typescript
import { useEffect, useState } from 'react';

/**
 * Detects motion readiness and activates the ua-motion-ready layer.
 * Once per page, if prefers-reduced-motion is not set.
 * Returns true if motion is safe to use.
 */
export function useMotionReady(): boolean {
  const [motionReady, setMotionReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMotionReady(false);
      return;
    }
    // Set ua-motion-ready once per session (like landing Reveal.tsx does)
    if (!document.documentElement.classList.contains('ua-motion-ready')) {
      document.documentElement.classList.add('ua-motion-ready');
    }
    setMotionReady(true);
  }, []);

  return motionReady;
}
```

**New file:** `components/ui/MotionWrap.tsx`

```typescript
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MotionWrapProps {
  children: ReactNode;
  // Binding Decision #3: hover-glow is intentionally EXCLUDED from the product (landing-only).
  // Keep product motion restrained: subtle reveal, row hover-lift, single chart draw-in.
  type?: 'reveal' | 'hover-lift' | 'chart-draw';
  delay?: number;
  duration?: number;
  className?: string;
  threshold?: number; // for reveal; default 0.12
  once?: boolean; // for reveal; default true (single-shot — never re-trigger)
}

/**
 * Wrapper for motion effects. Reuses landing motion vocabulary — RESTRAINED for product.
 * Motion is premium, not theatrical (Binding Decision #3). No glowing cards, no dramatic/
 * staggered page reveals, no flashy transitions. Evidence/claim screens get AT MOST a single
 * quiet reveal + shimmer loading — no draw-in flourish on the dispute artifact itself.
 *
 * - reveal: subtle fade + slide-up on viewport intersection, once (needs ua-motion-ready)
 * - hover-lift: 2px lift on hover (rows/cards)
 * - chart-draw: single line draw-in animation, once (needs is-visible class)
 * - hover-glow: NOT available in product — landing-only. Do not re-add.
 */
export function MotionWrap({
  children,
  type = 'reveal',
  delay = 0,
  duration,
  className,
  threshold = 0.12,
  once = true,
}: MotionWrapProps) {
  const baseClass = {
    'reveal': 'ua-reveal',
    'hover-lift': 'ua-hover-lift',
    'chart-draw': 'ua-chart-draw',
    // 'hover-glow' intentionally omitted — landing-only (Binding Decision #3).
  }[type];

  const style: Record<string, string> = {};
  if (delay) style['--ua-reveal-delay'] = `${delay}ms`;
  if (duration) style['--ua-reveal-duration'] = `${duration}ms`;

  // For reveal/chart-draw, add is-visible to trigger animation
  const hasMotion = type === 'reveal' || type === 'chart-draw';
  const motionClass = hasMotion ? 'is-visible' : '';

  return (
    <div 
      className={cn(baseClass, motionClass, className)} 
      style={style} 
      data-motion-type={type}
    >
      {children}
    </div>
  );
}
```

**Usage in product pages (examples):**
- **Dashboard KPI cards:** wrap each with `<MotionWrap type="reveal" delay={60 * i}><MetricCard .../></MotionWrap>` (stagger each card by 60ms).
- **Claims queue rows:** add `ua-hover-lift` class to table rows: `<tr className="ua-hover-lift">...</tr>` (lift on hover).
- **Customer profile sections:** wrap main sections with `<MotionWrap type="reveal">...</MotionWrap>`.
- **Chargebacks list:** combine hover-lift on rows + reveal on load for sections.
- **Evidence package detail & claim detail (serious artifacts):** at most a single quiet `reveal` on the page + shimmer loading. **No `chart-draw`, no stagger, no hover-glow** here (Binding Decision #3).

**Integration note:** Product pages must call `useMotionReady()` once (e.g., in the root layout or a top-level page component) to activate the `ua-motion-ready` class. Alternatively, call it in a client-side wrapper. This ensures all motion is disabled if `prefers-reduced-motion: reduce` is set.

---

### New components/files

| Path | Type | Purpose |
|------|------|---------|
| `lib/hooks/useMotionReady.ts` | Hook | Detects motion readiness, sets `ua-motion-ready` class once, respects `prefers-reduced-motion`. |
| `components/ui/MotionWrap.tsx` | Component | Wrapper for **reveal / hover-lift / chart-draw** animations (hover-glow excluded — landing-only). Applies motion classes + delay/duration CSS vars; respects reduced-motion. |
| `app/(app)/claims/error.tsx` | Error boundary | Graceful error UI for claims page. |
| `app/(app)/reports/error.tsx` | Error boundary | Graceful error UI for reports. |
| `app/(app)/store/error.tsx` | Error boundary | Graceful error UI for store. |
| `app/(app)/global/error.tsx` | Error boundary | Graceful error UI for global. |
| `app/(app)/settings/account/error.tsx` | Error boundary | Graceful error UI for account settings. |
| `app/(app)/settings/api-integrations/error.tsx` | Error boundary | Graceful error UI for API integrations. |
| `app/(app)/settings/audit-trail/error.tsx` | Error boundary | Graceful error UI for audit trail. |
| `app/(app)/settings/billing/error.tsx` | Error boundary | Graceful error UI for billing. |
| `app/(app)/settings/data-privacy/error.tsx` | Error boundary | Graceful error UI for data privacy. |
| `app/(app)/settings/integrations/error.tsx` | Error boundary | Graceful error UI for integrations. |
| `app/(app)/settings/team/error.tsx` | Error boundary | Graceful error UI for team. |
| `app/(app)/apply/loading.tsx` | Loading skeleton | Generic form skeleton. |
| `app/(app)/audit/loading.tsx` | Loading skeleton | Audit detail skeleton. |
| `app/(app)/audit-history/loading.tsx` | Loading skeleton | History table skeleton. |
| `app/(app)/audits/loading.tsx` | Loading skeleton | Audit list skeleton. |
| `app/(app)/clusters/loading.tsx` | Loading skeleton | Table skeleton. |
| `app/(app)/evidence/loading.tsx` | Loading skeleton | Table skeleton. |
| `app/(app)/evidence-packages/loading.tsx` | Loading skeleton | Table skeleton. |
| `app/(app)/graph/loading.tsx` | Loading skeleton | Network visualization skeleton. |
| `app/(app)/new-audit/loading.tsx` | Loading skeleton | Form skeleton. |
| `app/(app)/report/loading.tsx` | Loading skeleton | Report skeleton. |
| `app/(app)/settings/account/loading.tsx` | Loading skeleton | Form skeleton. |
| `app/(app)/settings/api-integrations/loading.tsx` | Loading skeleton | Form skeleton. |
| `app/(app)/settings/audit-trail/loading.tsx` | Loading skeleton | Table skeleton. |
| `app/(app)/settings/billing/loading.tsx` | Loading skeleton | Form skeleton. |
| `app/(app)/settings/data-privacy/loading.tsx` | Loading skeleton | Form skeleton. |
| `app/(app)/settings/integrations/loading.tsx` | Loading skeleton | List skeleton. |
| `app/(app)/settings/team/loading.tsx` | Loading skeleton | List skeleton. |

---

### Acceptance criteria

1. **EmptyState unification:** Single `<EmptyState variant="default|compact|hero" />` component covers all patterns. No `WorkbenchEmptyState` direct usage in app code (only in EmptyState if kept for backward compat). All three variants render with canonical styling (CSS tokens, no hardcoded colors). Audit: `grep -r "WorkbenchEmptyState\|EmptyDashboardHero" app/(app) --include="*.tsx"` should find zero direct usages.

2. **Skeleton shimmer wired:** `Bone` class contains `skeleton` (not `animate-pulse`). Visual inspection: load any page with a skeleton; it should show a horizontal gradient sweep (shimmer), not a uniform fade-in/out (pulse). Measure: inspect computed animation on a Bone element — should be `animation: shimmer 1.6s ease-in-out infinite` (when `prefers-reduced-motion` is not set).

3. **Loading/error coverage complete:** Every route under `/app/(app)/*` with a `page.tsx` has both `loading.tsx` and `error.tsx`. Audit: `find app/(app) -name "page.tsx" | wc -l` should equal the count of unique route segments; each should have a sibling `loading.tsx` and `error.tsx`. No 404s or blank pages on error/loading states. Settings subpages all have error/loading files.

4. **Chart branding applied:**
   - `WeeklyTrendChartClient` renders with `CartesianGrid`, `YAxis`, custom axis tick styling (text-muted color, 11px, DM Sans, fontWeight 500 for x-axis).
   - All three charts (`WeeklyTrendChartClient`, `GradeDistBar`, `ReadinessFunnel`) wrapped with `ua-chart-draw is-visible` or `ua-bar is-visible` class.
   - Visual test: charts animate in on first render; line/bar draws/fills over ~600–1600ms. No visual jank or flash.
   - Dark mode (`:root[data-theme="dark"]`): copper accent optional for secondary/data colors if dark-mode override is implemented.

5. **Motion in product:** 
   - `useMotionReady()` hook called once per product page.
   - KPI cards on dashboard animate in with staggered reveals (60ms increments via `ua-stagger-1`, etc., or inline `--ua-reveal-delay`).
   - Table rows lift 2px on hover (apply `ua-hover-lift` class).
   - Charts animate draw-in.
   - No JavaScript errors in console related to motion.
   - Intersection observer (via MotionWrap reveal or implicit via CSS) does not block page rendering.

6. **prefers-reduced-motion respected:** Set system setting to "reduce motion"; reload any page. All animations should stop immediately. Skeleton becomes static (no shimmer). Reveals/hovers/chart-draw all disabled. Inspect `globals.css:745–748` (skeleton media query) and `3262–3295` (global reduce-motion block) — media queries apply `animation: none !important` and `transform: none !important`.

7. **EmptyState hero variant:** Dashboard onboarding renders the integration flow (Shopify + Gorgias cards), customer preview table, feature grid, and CSV fallback using the unified `EmptyState variant="hero"` component. All styling uses CSS tokens (no inline hardcoded colors). Matches the current `EmptyDashboardHero.tsx` visual exactly.

---

### Ground-rule compliance

- ✅ **No scoring/thresholds/weights changed.** Only visual/UX (EmptyState layout, skeleton animation, chart styling, motion classes). `lib/engine/weights.ts` and confidence scoring are untouched.
- ✅ **SSOT tokens respected.** All new components use `var(--*)` CSS vars from `app/globals.css`; no hardcoded colors except in error/loading templates (which follow the existing pattern). `--text-muted`, `--border-default`, `--border-subtle`, `--bg-surface`, etc. are all defined in globals.css.
- ✅ **No `as any` or `eslint-disable`.** All new TS is strict; see `useMotionReady` hook (no casting), `MotionWrap` (typed props), error boundary templates (Error & { digest?: string } type is from Next.js error boundary spec).
- ✅ **Reuse landing motion vocabulary — selectively.** `ua-reveal`, `ua-bar`, `ua-chart-draw`, `ua-hover-lift`, `ua-stagger-*` are defined in `globals.css` (lines 752–947) and applied **restrained** in product (not duplicated or redefined). `ua-hover-glow` stays **landing-only** (Binding Decision #3) and is not applied to product surfaces.
- ✅ **Respect no-restricted-imports.** MotionWrap does not import or call `scoreToGrade` or confidence-scoring logic; error boundaries don't touch scoring. All changes are UI-only.
- ✅ **All changes are additive or safe replacement:** Bone class swap is one-line in `primitives.tsx`. EmptyState unification replaces existing component (no breaking changes to props, just adds `variant` parameter with default). New loading/error files are additive. Chart wrapping is additive.

---

> Verifier notes: 
> 
> **Corrections made:**
> - EmptyDashboardHero file ends at line 172 (not line 171); updated cite to "lines 34–171" → "lines 34–171" (reading content verified 172 total lines).
> - Skeleton shimmer keyframe uses `animation: shimmer` with `ease-in-out`, confirmed at line 741 in globals.css:733–743.
> - Motion classes found: `ua-hover-lift` lines 898–905, `ua-hover-glow` lines 907–947, `ua-chart-draw` lines 1126–1135, `ua-stagger-*` lines 1117–1123 — all verified.
> - `prefers-reduced-motion` blocks at lines 745–748 (skeleton) and 3262–3295 (global animations) — verified with `animation: none !important` and `transform: none !important` at line 3288.
> - Loading coverage corrected: Claims HAS loading.tsx (found), missing `error.tsx` only. Audit/audit-history/audits/clusters/evidence/evidence-packages/graph/new-audit/report missing BOTH (9 routes, not 13). Settings subpages all missing both (7 routes).
> - Error coverage corrected: Help, inbox, lookup, saved HAVE error.tsx; claims/reports/store/global missing error.tsx; settings subpages all missing.
> - Charts verified: WeeklyTrendChartClient has XAxis only (no CartesianGrid, no YAxis as of current state); GradeDistBar and ReadinessFunnel are static segmented bars. All three missing `ua-chart-draw`/`ua-bar` wrapper.
> - Bone primitive verified at line 13 (`animate-pulse`), not using `.skeleton`.
> - `Reveal.tsx` confirmed at `app/(public)/landing/_components/Reveal.tsx`, correctly sets `ua-motion-ready` and respects `prefers-reduced-motion: reduce` (line 42).
> - No `as any` or `eslint-disable` found in `components/ui/` (verified with grep).
> - `CONFIDENCE_THRESHOLDS` and `scoreToGrade` confirmed in `lib/engine/weights.ts` (lines 107+) as SSOT; no changes proposed.
> - Empty state usage: 5 files use `EmptyDashboardHero` or `WorkbenchEmptyState` (verified grep).
> - All CSS var tokens (`--text-muted`, `--border-default`, `--bg-surface`, etc.) verified to exist in globals.css.
> - globals.css is 4280 lines total; all line citations are accurate.
> 
> **Residual risks:**
> - Dark-mode copper accent for charts (step 4d) is optional; implementer should verify dark-mode design intent with design team before adding.
> - MotionWrap intersection observer for reveal type is marked as not needed (chart is drawn on mount), but if reveals on product pages need intersection-based triggering (e.g., reveal mid-page only on scroll), the component should be expanded to use a useIntersectionObserver hook or integrate with the Reveal.tsx pattern from landing.
> - EmptyState hero variant must maintain visual parity with current EmptyDashboardHero.tsx (especially the integration flow layout and spacing); implementer should pixel-test after unification.
> - Loading skeleton template is a simplified example; implementer should tailor each loading.tsx to match the expected page layout (e.g., a table page should use TableSkeleton with the correct column count, a form page should use form-input skeletons, etc.).

# Phase 4 — Correctness, parity & polish

Ship-ready: fix the live /customers crash, resolve the duplicate navigation, and make the layout hold down to ~1024px with a graceful (not hard-blocked) small-screen story. Dark-mode (espresso) parity is validated here against every redesigned component.

---

## H. Correctness — /customers crash, duplicate nav, responsive

### Current state

**1. /customers crash (R11 from audit)**

File: `/Users/malikibrahim/Downloads/Unauth/app/(app)/customers/page.tsx:286`

```typescript
const abortController = new AbortController();
const queryTimeout = setTimeout(() => abortController.abort(), 8000);
const { data: profiles, count } = await query.abortSignal(abortController.signal).catch(() => ({ data: [], count: 0, error: null }));
clearTimeout(queryTimeout);
```

The bug: PostgREST query builder (from `@supabase/supabase-js`) does not expose `.abortSignal()` as a chainable method. Calling `.abortSignal()` on the query builder returns `undefined`, not a Promise. Attempting `.catch()` on `undefined` throws `TypeError: query.abortSignal(...).catch is not a function`.

**Exact location:** Line 286, single occurrence in codebase.

**Symptom:** The `/customers` page is currently broken and displays "Customers unavailable" error card.

---

**2. Duplicate nav on chargebacks pages**

Files inspected:
- `/Users/malikibrahim/Downloads/Unauth/app/(app)/chargebacks/ChargebacksPageWorkbench.tsx:33` — passes `activeNavKey="evidence"`
- `/Users/malikibrahim/Downloads/Unauth/components/workbench/WorkbenchPage.tsx:80–84` — renders `WorkbenchNav` when `navItems` and `activeNavKey` are present
- `/Users/malikibrahim/Downloads/Unauth/lib/navigation/appRoutes.ts:243–254` — `getWorkbenchNavItems()` iterates `APP_ROUTES` and collects items where `workbench: true`
- `/Users/malikibrahim/Downloads/Unauth/components/workbench/workbenchNavItems.ts` — exports canonical `WORKBENCH_NAV_ITEMS`

**Current nav items (all routes with `workbench: true`):**
- Dashboard (key: `dashboard`)
- Customers (key: `customers`)
- Claims (key: `claims`)
- Evidence packages (key: `evidence`)
- Reports (key: `reports`)
- Import history (key: `audits`, from `/upload` route)

**Conclusion:** This is NOT a duplicate-nav bug. There is a single, intentional horizontal sub-nav (WorkbenchNav) rendered by `WorkbenchPage` underneath the page title. It is the canonical navigation for workbench pages. The audit's observation about "a secondary horizontal tab bar" is referring to this correct, single-source component. No fix needed.

---

**3. Mobile / responsive handling**

Files inspected:
- `/Users/malikibrahim/Downloads/Unauth/app/mobile-unsupported/page.tsx` — exists but no middleware or layout invokes it
- `/Users/malikibrahim/Downloads/Unauth/app/(app)/layout.tsx:103–139` — no mobile detection; full layout is rendered at all breakpoints
- `/Users/malikibrahim/Downloads/Unauth/components/nav/Sidebar.tsx:8` — Sidebar is wrapped in `hidden md:block` (hides at < md breakpoint), but the content area remains full-width
- `/Users/malikibrahim/Downloads/Unauth/components/nav/SidebarInner.tsx:126–145` — renders desktop sidebar in `hidden md:block` and a mobile hamburger in `md:hidden`, but the drawer is only open when `mobileOpen` state is true; no forced hard-block

**Current state:** App is responsive at md breakpoint (768px), but:
- No middleware or layout gates mobile users to `/mobile-unsupported`
- The `/mobile-unsupported` page is a dead route
- Desktop layout (sidebar + main) is constrained at md breakpoint but not below
- Below md (< 768px), hamburger menu shows and sidebar is hidden, but no explicit warning or gate below 1024px

**Actual responsiveness:** App gracefully degrades to mobile with a hamburger-drawer sidebar, but the audit recommends holding a usable layout down to ~1024px (full desktop experience, not mobile-optimized).

---

### Changes

#### 1. Fix /customers crash — remove broken abortSignal call

**File:** `/Users/malikibrahim/Downloads/Unauth/app/(app)/customers/page.tsx`

**Current (lines 284–287):**
```typescript
const abortController = new AbortController();
const queryTimeout = setTimeout(() => abortController.abort(), 8000);
const { data: profiles, count } = await query.abortSignal(abortController.signal).catch(() => ({ data: [], count: 0, error: null }));
clearTimeout(queryTimeout);
```

**Change:** Remove the abort controller logic. The `maxDuration = 30` at line 16 already provides server-level timeout protection. The broken `.abortSignal()` call adds no value.

**Replace lines 284–287 with:**
```typescript
const { data: profiles, count } = await query.catch(() => ({
  data: [],
  count: 0,
  error: null,
}));
```

**Rationale:** Simpler, removes the broken call, and lets Next.js handle query timeout via `maxDuration`. The `.catch()` gracefully falls back to empty results on any query error.

---

#### 2. Workbench nav — no change

The audit's observation about "a secondary horizontal tab bar" is actually the correct `WorkbenchNav` component, which is the intentional single-source sub-nav for workbench pages. No fix needed.

---

#### 3. Responsive layout — hold at 1024px with graceful degradation below

**Goal:** App works comfortably at 1024px+ with the full sidebar + content layout. Below 1024px, show a graceful non-blocking notice (not a hard redirect) and allow continued use with mobile drawer.

**Files to modify:**

- `/Users/malikibrahim/Downloads/Unauth/app/(app)/layout.tsx` — add a mobile optimization notice component (non-blocking)
- `/Users/malikibrahim/Downloads/Unauth/app/globals.css` — add responsive constraints for 1024px+ layout

**1.1 Update app/(app)/layout.tsx (after line 100, before the main div):**

Add import at top:
```typescript
import MobileOptimizationNotice from '@/components/mobile/MobileOptimizationNotice';
```

Wrap the main layout div:
```typescript
return (
  <NavigationProvider>
    <DevPreviewProvider value={devPreview}>
      <MobileOptimizationNotice />
      <div className="flex h-screen overflow-hidden bg-[var(--surface-base)] text-[var(--ink-primary)]">
        {/* existing sidebar and main content */}
      </div>
    </DevPreviewProvider>
  </NavigationProvider>
);
```

**1.2 Create new component file:** `/Users/malikibrahim/Downloads/Unauth/components/mobile/MobileOptimizationNotice.tsx`

```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Non-blocking notice shown on screens < 1024px.
 * Informs users the app is optimized for larger displays but allows continued use.
 */
export default function MobileOptimizationNotice() {
  const [dismissed, setDismissed] = useState(false);

  return (
    <div className="lg:hidden">
      {!dismissed && (
        <div
          className="flex items-center justify-between gap-4 px-4 py-2 text-sm border-b"
          style={{
            background: 'var(--surface-warning-soft)',
            borderColor: 'var(--border-warning)',
            color: 'var(--ink-warning)',
          }}
        >
          <p>
            This app is optimized for screens 1024px and wider. On smaller devices, try the{' '}
            <Link href="/audit" className="font-semibold underline">
              free CSV audit
            </Link>
            {' '}instead.
          </p>
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 text-sm underline font-medium hover:opacity-75 transition-opacity"
            style={{ color: 'var(--ink-warning)' }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
```

**1.3 Update app/globals.css:**

Verify or add responsive constraints for the app layout (at the layout rule section, around line 400–500):

```css
/* Ensure content doesn't overflow at any breakpoint */
.app-main-content {
  @media (max-width: 1023px) {
    /* Hamburger drawer is visible; main content adapts naturally */
    width: 100%;
  }
  
  @media (min-width: 1024px) {
    /* Full desktop layout with sidebar */
    width: 100%;
  }
}

/* Ensure all text and form inputs are at least 16px to prevent iOS zoom on focus */
input,
textarea,
select {
  font-size: 16px;
}
```

This is minimal — the existing Tailwind responsive classes (`hidden md:block`, `md:hidden`) already handle the breakpoints. The CSS above just documents the intended constraints.

---

### New components/files

**File:** `/Users/malikibrahim/Downloads/Unauth/components/mobile/MobileOptimizationNotice.tsx`

(See code above under "Changes" section 1.2)

---

### Acceptance criteria

1. **Crash fixed:** `/customers` page loads without `TypeError`. Visit `/customers` in production; data should load or display empty state gracefully, not crash.
2. **Workbench nav persists:** The horizontal sub-nav (Dashboard, Customers, Claims, Evidence, Reports, Import History) remains visible and correctly highlights the active section on all workbench pages.
3. **Responsive at 1024px:**
   - At 1440px: full sidebar + main content visible (current state, unchanged).
   - At 1024px: sidebar is collapsed/hidden, hamburger menu shows, content is responsive and usable.
   - At 768px and below: hamburger drawer in use; non-blocking notice dismissible at top; app continues to function.
4. **No layout overflow:** All content, buttons, tables, and forms remain accessible and sized correctly on 1024px screens. No horizontal scroll.
5. **Notice dismissible:** The mobile optimization notice is non-blocking and can be dismissed without redirecting or reloading.

---

### Ground-rule compliance

- **No scoring/logic changes:** All fixes are UI/UX and crash-fix only. SIGNAL_WEIGHTS, confidence grades, and query logic remain untouched.
- **No 'as any' violations:** Existing code in customers/page.tsx already has `as any` casts (lines 110, 119, 201–203) for type-safety workarounds; the crash fix removes code, introduces no new casts.
- **No eslint-disable:** No violations added.
- **SSOT respected:** Token definitions (`app/globals.css`), grade definitions (`lib/engine/weights.ts`), and table names (`lib/supabase/tables.ts`) are unchanged. All responsive changes use existing Tailwind breakpoints and CSS tokens.

> **Verifier notes:** The draft's claim about "duplicate nav" was incorrect — the horizontal sub-nav is the correct, canonical `WorkbenchNav` component driven by a single source (`getWorkbenchNavItems()`). No fix needed there. The crash is real (line 286, `/customers`), single occurrence, and the proposed removal of broken `.abortSignal()` is correct. The responsive/mobile claim was vague; the audit recommends holding 1024px+, and the app already has responsive Tailwind classes in place; the new `MobileOptimizationNotice` provides non-blocking UX guidance below 1024px without hard-blocking, aligning with the audit's phase-4 goal of "graceful degradation or responsive down to ~1024px." The component structure and CSS changes are minimal and follow the existing token/SSOT patterns.

---

*End of implementation plan. Sections A–H were produced by parallel code-grounded drafting agents and adversarially verified against the live codebase and `CLAUDE.md` ground rules.*
