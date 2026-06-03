# Landing Page Implementation Plan — Top-Tier Rebuild

Date: 2026-06-03
Companion to: `LANDING_PAGE_STRIPE_RAMP_GAP_ANALYSIS.md` (the *why*). This doc is the *how* — a buildable, file-by-file spec to take `/landing` from "looks AI-made" to Stripe/Ramp-level.

**Read order:** §1 (what we already have) → §2 (foundations — build these first) → §3 (section-by-section) → §4 (global) → §5 (sequence) → §6 (acceptance).

## 0. Ground rules (from CLAUDE.md — do not violate)
- **Landing-only.** Do not touch authenticated app pages, signup internals, billing logic, Supabase, entitlements, or scoring/matching. Edits live under `app/(public)/landing/**`, `app/globals.css`, and new files in `components/ui/**` (landing-scoped).
- **No `as any`. No `// eslint-disable`.** Fix types properly.
- **Tokens, never raw hex** in landing components — use `_tokens.ts` / CSS vars. Add new tokens to `globals.css` `:root`.
- **Radius ≤ 8px** — use `--radius-sm` (4), `--radius-md` (6), `--radius-lg` (8). Landing default is `--landing-radius` (6px).
- Respect `prefers-reduced-motion` (the codebase already gates motion on `.ua-motion-ready`, which is skipped under reduced-motion).

---

## 1. What we already have (do NOT reinstall)

Verified in `package.json` / `components/ui/`:

| Capability | Already present | Use it for |
|---|---|---|
| Animation | **`motion` v12** (Framer Motion, new package name) | scroll-linked stepper, count-ups, spring hovers |
| Icons | **`lucide-react` v0.460** | every feature/outcome/pricing/workflow item |
| Class utils | **`clsx` + `tailwind-merge`** → `cn()` at `@/lib/utils` | all component styling |
| Buttons | `components/ui/Button.tsx` + `buttonStyles.ts` (variants primary/secondary/ghost/danger/link; sizes sm/md/lg) | base pattern — but it uses **app** tokens (`--accent`), not landing tokens. See §2.6 |
| Badges | `components/ui/Badge.tsx` + `badgeStyles.ts` | base for landing badges |
| Effects | `border-beam.tsx`, `meteors.tsx`, `spotlight.tsx`, `dot-pattern.tsx`, `animated-grid-pattern.tsx` | featured pricing card beam, dark-section glow |
| Fonts (next/font) | **DM Sans** (`--font-dm-sans`, 300–700), **DM Mono** (`--font-dm-mono`), **Source Serif 4** (`--font-serif`, incl. italic) | DM Sans = workhorse; DM Mono = data only; Source Serif = the editorial tell to remove (see §2.1) |
| Reveal | `Reveal.tsx` — hides `.ua-reveal` only after JS adds `.ua-motion-ready`, then IntersectionObserver toggles `.is-visible` | keep for **below-fold** only; remove from hero (see §2.5) |
| Tokens | `globals.css` `:root` already has landing color tokens incl. the recently added `--landing-graphite`, `--landing-info` | extend with type/elevation/space scales (§2.2–2.4) |

**Conclusion:** ~0 installs needed. The work is (a) a foundations/token pass, (b) two new components (`ProductFrame`, landing `Cta`/`Tag`), (c) adopting `motion` + `lucide` + existing effects in the sections, (d) deleting the AI-tells.

> If we later want a more distinctive display typeface (recommended for true top-tier — see §2.1), that is the *only* potential add, and it's a one-line `next/font/google` import.

---

## 2. Foundations — build these first (everything in §3 depends on them)

### 2.1 Typography system

**Decision: one workhorse + one display + mono-for-data. Remove the serif from headings.**

- **Body / UI:** keep **DM Sans**. It's fine; the problem was never DM Sans.
- **Display (H1/H2/eyebrow):** add **one** characterful grotesk for headings only. Recommended free options via `next/font/google` (pick one):
  - **Bricolage Grotesque** — warm, slightly editorial, pairs with the paper brand. *(default recommendation)*
  - **Hanken Grotesk** — cleaner, more neutral/Ramp-like.
  - **Instrument Sans** — tight, modern, free.
  - *(Paid, if budget: söhne / GT America / Suisse — true Stripe tier.)*
- **Mono:** keep **DM Mono**, but restrict to genuine data (schema fields, hashes, timings, IDs). Remove from eyebrows and chips.
- **Serif (Source Serif 4):** **remove from all headlines.** Allowed *once* on the page as a single pull-quote if you want a warm accent — otherwise drop the import.

**Add a real type scale as tokens** (`globals.css` `:root`):
```css
/* Type scale — landing */
--ua-font-display: var(--font-bricolage, var(--font-dm-sans));
--text-display-1: clamp(40px, 5vw, 60px);  /* hero H1 */
--text-display-2: clamp(30px, 3.4vw, 42px);/* section H2 */
--text-h3: 22px;
--text-body-lg: 18px;
--text-body: 16px;
--text-caption: 13px;
--tracking-tight: -0.02em;   /* display */
--tracking-eyebrow: 0.14em;  /* uppercase labels */
--leading-display: 1.05;
--leading-body: 1.6;
```
Then refactor `.ua-landing-headline`, `.ua-landing-section-title`, eyebrows to consume these. Delete `.ua-landing-headline-accent` (serif italic) and `.ua-landing-section-title-italic` usages.

Add the font in `app/layout.tsx`:
```ts
import { Bricolage_Grotesque } from 'next/font/google';
const display = Bricolage_Grotesque({ subsets:['latin'], variable:'--font-bricolage', display:'swap', weight:['500','600','700'] });
// add `${display.variable}` to <html> className
```

### 2.2 Elevation scale (kills the "wireframe" flat-border look)

Add to `:root` and use instead of bare 1px borders on product frames, hover states, featured cards:
```css
--ua-shadow-sm: 0 1px 2px rgba(31,26,18,0.05), 0 1px 1px rgba(31,26,18,0.04);
--ua-shadow-md: 0 4px 12px rgba(31,26,18,0.07), 0 1px 3px rgba(31,26,18,0.06);
--ua-shadow-lg: 0 12px 32px rgba(31,26,18,0.10), 0 3px 8px rgba(31,26,18,0.06);
--ua-shadow-xl: 0 24px 60px rgba(31,26,18,0.14), 0 6px 16px rgba(31,26,18,0.08);
```
(Warm-tinted shadows, not pure black — matches the paper brand.)

### 2.3 Spacing scale

Replace ad-hoc `pt-14/16/20` with a consistent rhythm. Standardize section padding to `py-20 md:py-28` (or tokens `--ua-section-y`). Define one band-to-band rhythm and apply everywhere.

### 2.4 Contrast bands (the single biggest visual lever)

Stop the beige monotone. Establish a **4-band rhythm** using existing tokens, applied as *full-bleed section backgrounds*:

| Band | Background | Use for |
|---|---|---|
| Paper | `--landing-bg` (cream) | hero, outcomes, network text |
| White-product | `--landing-paper` (#fff) | integrations, framed product modules |
| Graphite/dark | `--landing-graphite` (#20242B) | **evidence/dashboard** + FAQ (already dark) |
| Accent-wash | subtle burgundy/info tint | one CTA band |

Rule: never two identical adjacent bands. Put the dashboard proof on a **dark band** so the white product frame glows (Ramp's signature move).

### 2.5 Motion primitives (and the hero fix)

**Fix the hero first (P0):** the hero currently sits inside `<Reveal>`, so `.ua-motion-ready` hides it until the observer fires → empty first paint. **Remove `<Reveal>` from the hero left column and the product panel.** Render them as plain markup so they're in the first SSR paint. (Keep `<Reveal>` for below-fold sections — it's fine there.)

**Add `motion` for specific, purposeful moments** (additive — do NOT rip out `Reveal` globally):
- A tiny client wrapper for hover elevation on cards:
```tsx
'use client';
import { motion } from 'motion/react';
export function Lift({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    >{children}</motion.div>
  );
}
```
- Count-up on stat numbers (`motion`'s `useMotionValue` + `animate`), gated to `whileInView` once.
- The workflow stepper: drive step state from `useScroll`/`useTransform` instead of the auto-rotating `setInterval` carousel.
- All `motion` usage must respect reduced-motion: wrap with `useReducedMotion()` and skip transforms when true.

### 2.6 Landing button + tag components (replace the `ua-landing-link-*` classes and mono chips)

The app `Button` uses app-theme tokens, so don't reuse it directly on the landing (color mismatch). Create **landing-scoped** components that mirror the existing API but consume landing tokens:

`app/(public)/landing/_components/ui/Cta.tsx`
```tsx
import Link from 'next/link';
import { cn } from '@/lib/utils';
type Props = { href: string; variant?: 'primary'|'secondary'; children: React.ReactNode; className?: string };
export function Cta({ href, variant='primary', children, className }: Props) {
  return (
    <Link href={href} className={cn('ua-cta', `ua-cta--${variant}`, className)}>{children}</Link>
  );
}
```
With CSS (globals.css) using `--landing-accent`, `--ua-shadow-sm`, real hover/active/`focus-visible` rings, height ~44px, icon slot. Secondary = bordered with hover fill (not a flat grey box).

`Tag.tsx` — replaces the mono "form-input" chips. A real badge: small, medium-weight DM Sans, subtle fill + 1px border + optional leading dot/icon, `--radius-sm`. Variants: `neutral`, `status-live` (green dot), `info`.

### 2.7 `ProductFrame` component (turn screenshots into product proof)

The highest-leverage new component. Wraps any screenshot in app/browser chrome with real elevation and optional annotation overlays.

`app/(public)/landing/_components/ui/ProductFrame.tsx`
```tsx
import Image from 'next/image';
type Annotation = { label: string; x: string; y: string };      // % positions
type Props = {
  src: string; alt: string; chrome?: 'browser'|'app'|'none';
  priority?: boolean; annotations?: Annotation[]; className?: string;
};
// Renders: rounded ≤8px container, --ua-shadow-xl, top bar (3 dots + URL pill for 'browser'
// or sidebar rail for 'app'), the Image (priority when above-fold), and absolutely-positioned
// annotation badges with a thin connector line + small dot. Reuse <Tag> for the badge.
```
Requirements:
- Hero usage sets `priority` (eager) — this becomes the deliberate LCP element.
- Never let the frame bleed off-screen un-contained; it must be fully framed.
- Annotations point at real UI ("Confidence grade", "Evidence ready", "k-anonymity gate").

### 2.8 Iconography

Adopt **Lucide** across the page, one consistent size (20px) and stroke (1.75). Mapping:
- Outcomes: `ShieldCheck` (own-store truth), `ListChecks` (claim ops), `UserSearch` (customer context), `Network` (network).
- Workflow: `PlugZap` (connect), `RefreshCw` (sync), `GitBranch`/`Fingerprint` (resolve), `Gavel`/`ClipboardCheck` (review).
- Pricing bullets: small `Check` in accent.
- Comparison yes/partial/no: `Check` / `Minus` / `X`.

---

## 3. Section-by-section implementation

Each section: **Goal → Changes → Files → Acceptance.**

### 3.1 Hero — `LandingHeroSection.tsx` *(P0, highest impact)*
**Goal:** fully painted on first byte; dense, legible; product is framed proof.
**Changes:**
- Remove `<Reveal>` wrappers (render static). Keep an optional CSS entrance that starts *visible* (no hidden state).
- Headline: DM Sans / display grotesk, weight 600–700, `--text-display-1`, tracking-tight. **Delete the serif-italic span.** One-line value prop + 2-line subhead.
- Eyebrow: drop "Issue 04 · date" affectation. Keep "Live claim intelligence for ecommerce teams" in display/mono caps.
- CTAs: `<Cta variant="primary">Create workspace</Cta>` + `<Cta variant="secondary">View demo</Cta>` (real bordered secondary, icon, hover/active/focus).
- Chips → `<Tag>` components (status-live for "Order source connected" etc.).
- Product: `<ProductFrame src="/screenshots/inbox.png" chrome="app" priority annotations={[…]} />`, fully in frame, with 2 overlays. Add `spotlight`/soft glow behind it on the band.
- Remove `dot-pattern` + the gradient blob from the hero.
**Files:** `LandingHeroSection.tsx`, new `Cta.tsx`/`Tag.tsx`/`ProductFrame.tsx`, `globals.css`.
**Acceptance:** disable JS → hero fully visible. LCP image eager. No off-edge bleed. No serif. Fold is full at 1440×900.

### 3.2 Trust strip — NEW component *(P1)*
**Goal:** the missing credibility layer.
**Changes:** new `LandingTrustStrip.tsx` directly under the hero: a row of platform/customer logos (grayscale, low opacity → color on hover), a metrics band (e.g. "claims analyzed", "evidence packs", with count-up), and a security/compliance badge row (HMAC-SHA256, k-anonymity, GDPR-aware) using `<Tag>`.
**Acceptance:** present above the fold-2; logos load; metrics animate once in view.

### 3.3 Integrations — `LandingIntegrationsSection.tsx` *(keep, polish — P1)*
This is the strongest section. Polish only:
- Add a category icon to each card header.
- Add an animated connecting line/`border-beam` between source-group → output card (respect reduced-motion).
- `Lift` hover on provider tiles.

### 3.4 Outcomes — `LandingProductTierSection.tsx` (outcomes block) *(P1)*
- Add a Lucide icon to each module.
- Make module 1 dominant: span 2 cols with a small `ProductFrame` thumbnail; the other 3 standard.
- `--ua-shadow-md`, `Lift` on hover.

### 3.5 Workflow — `PipelineTabs.tsx` *(P2)*
- Replace the `setInterval` auto-advance with a **scroll-linked** stepper (`useScroll` on the section, `useTransform` → active step). Keep click-to-jump and pause affordance.
- Each step shows a framed, **annotated** `ProductFrame` (Connect/Sync/Resolve/Review) instead of bare screenshots.
- Add step icons.

### 3.6 Evidence — `LandingDashboardSection.tsx` *(P1)*
- Put this section on a **dark/graphite band** so the white product frame glows.
- Wrap `dashboard.png` in `ProductFrame chrome="app"` with 2–3 annotations.
- Stat chips → `<Tag>` + count-up.

### 3.7 Network — `LandingNetworkSection.tsx` *(P2)*
- Replace the text wall with a small **identity-graph / k-anonymity diagram** (SVG or a light `motion` animation showing nodes meeting the N≥3 threshold). Keep copy tight beside it.

### 3.8 Pricing — `LandingPricingSection.tsx` *(P1)*
- **Feature one tier** (e.g. Pro): elevated card, `border-beam`, "Most popular" `<Tag>`.
- Lucide `Check` on every bullet.
- `--ua-shadow-lg` on featured, `--ua-shadow-sm` on others; `Lift` on hover.
- Optional monthly/annual toggle if relevant.

### 3.9 Comparison — `LandingComparisonSection.tsx` *(P2)*
- Lighten: icons for yes/partial/no (`Check`/`Minus`/`X`), sticky header row, more whitespace, lower border weight. Keep the mobile matrix.

### 3.10 FAQ — `LandingFaqSection.tsx` *(keep)*
- It's the existing dark anchor and works. Leave structure; align type to the new scale.

### 3.11 Footer — `LandingFooterSection.tsx` *(P1)*
- Ensure the Trust strip (§3.2) or a metrics/security row sits *above* the footer as the last impression.
- Align type/spacing to tokens.

---

## 4. Global passes

- **Delete AI-tells:** remove `dot-pattern` and the gradient blob from hero/sections. Remove serif-italic headline classes. Remove mono from chrome.
- **Bands:** apply the §2.4 rhythm across all sections.
- **Perf/SSR:** hero static + `priority` LCP image; keep `Reveal` below-fold; verify CLS≈0.
- **Reduced motion:** every `motion` component checks `useReducedMotion()`; the `border-beam`/count-ups no-op under reduce.
- **Responsive:** re-verify 320 / 390 / 768 / 1280 / 1440 — no overflow, frames scale, annotations hide on mobile if cramped.

---

## 5. Build sequence (milestones)

**M0 — Foundations (do first):** §2.1 type tokens + display font, §2.2 elevation, §2.4 bands, §2.6 `Cta`/`Tag`, §2.7 `ProductFrame`. *No section looks right until these exist.*

**M1 — P0 hero:** §3.1. Ship this alone first — it's the biggest perceived-quality jump and validates the foundations.

**M2 — P1 credibility & depth:** §3.2 trust strip, §3.4 outcomes, §3.6 evidence (dark band), §3.8 pricing featured, §3.3 integrations polish, §3.11 footer.

**M3 — P2 motion & signature:** §3.5 scroll-linked workflow, §3.7 network diagram, §3.9 comparison, one signature moment (spotlight/border-beam/optional WebGL gradient behind the dark band).

Rough effort: M0 ≈ 0.5–1 day · M1 ≈ 0.5 day · M2 ≈ 2–3 days · M3 ≈ 2–3 days.

---

## 6. Acceptance & verification

Run after each milestone:
1. `npx tsc --noEmit` — clean (no `as any`).
2. `npm run lint` — clean (no disables).
3. Preview at **1440, 1280, 768, 390, 320** — no horizontal overflow; frames contained; annotations don't clip.
4. **Disable JS** (or throttle) → hero fully visible (proves SSR).
5. Lighthouse: **LCP < 2.5s, CLS < 0.05**; hero image is the LCP and is eager.
6. **Reduced-motion** emulation → no transforms/beams/count-ups animate; content fully visible.
7. `rg -n "ua-landing-headline-accent|dot-pattern|Issue 04" app/\(public\)/landing` → no hero matches (tells removed).

**Definition of done (from gap analysis §6):**
- [ ] Hero complete in first paint (JS off).
- [ ] One display + one body typeface; serif removed from headings; mono = data only.
- [ ] LCP image eager; LCP<2.5s, CLS<0.05.
- [ ] ≥3 contrast bands in the scroll.
- [ ] Every product screenshot in a `ProductFrame`; ≥2 annotated.
- [ ] No dot-grid, no blob.
- [ ] Every feature/outcome/pricing/workflow item has a Lucide icon.
- [ ] `Cta` + `Tag` real components with hover/active/focus-visible.
- [ ] One featured pricing tier; cards not all equal.
- [ ] Trust layer exists (logos / metrics / security).
- [ ] ≥1 scroll-linked or product animation that explains the product.
- [ ] Nothing reads as a template to a senior designer.

---

## 7. New files / touch list (quick reference)

**New:**
- `app/(public)/landing/_components/ui/Cta.tsx`
- `app/(public)/landing/_components/ui/Tag.tsx`
- `app/(public)/landing/_components/ui/ProductFrame.tsx`
- `app/(public)/landing/_components/ui/Lift.tsx` (motion hover)
- `app/(public)/landing/_components/sections/LandingTrustStrip.tsx`

**Modify:**
- `app/layout.tsx` (display font)
- `app/globals.css` (type/elevation/space tokens; bands; `.ua-cta`/`.ua-tag`; delete serif-italic + dot-grid)
- `LandingHeroSection.tsx`, `LandingIntegrationsSection.tsx`, `LandingProductTierSection.tsx`, `PipelineTabs.tsx`/`PipelineTabsParts.tsx`, `LandingDashboardSection.tsx`, `LandingComparisonSection.tsx`, `LandingFaqSection.tsx`, `LandingFooterSection.tsx`, `page.tsx`

**Do not touch:** anything outside `app/(public)/landing/**`, `app/globals.css`, `app/layout.tsx` (font line only), and the new landing-scoped `components`. No billing/scoring/Supabase/entitlements.
