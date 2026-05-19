# Landing Background Redesign — Implementation Brief

**Author:** Claude (review pass)
**Status:** Proposal — not yet implemented. Hand to whoever picks up the execution.
**Files in scope:** `app/(public)/landing/page.tsx`, `app/globals.css` (lines ~700–1070).

---

## 1. Verdict on the current state

Your other AI was right, but for a more specific reason than "childish."

The cream/burgundy palette itself is good — it's an editorial, FT/Economist-adjacent base that reads serious. The problem is what's been layered on top of it. There are **34 hard-coded rainbow colour stops** scattered through `globals.css` — purple (`rgba(185,110,245,...)`, `#B96EF5`), saffron yellow (`rgba(246,192,87,...)`, `#F6B84F`), warm orange (`rgba(255,183,77,...)`), blue (`rgba(76,130,229,...)`) — all stacked as conic gradients, organic-blob radial fills, and animated drift.

That combination — multi-hue conic gradient + wobbly clip-paths + drift animation — is the exact aesthetic GPT/Claude produces when asked to "make it look modern." It's also the late-2022 glassmorphism trend that has aged badly. Stripe and Ramp do not use this.

Concrete evidence from the screenshots:

| Section | What's pulling the page down |
| --- | --- |
| Hero | Big yellow→orange→purple conic blob in the top-right corner. Reads as decorative glow puddle. |
| `ua-section-flow` (network, post-network) | Pink/purple cross-fade between sections — looks like a child's pastel watercolour. |
| `ua-section-evidence` (the four step icons) | Each step tile has a peach + lavender + yellow soft gradient behind it. These look like Apple-Pay-style stickers or kids'-app badges. **Biggest single offender.** |
| `.ua-glass-card::after` | Hard-coded 4-stop rainbow line (`#7B2D26 → #F6B84F → #B96EF5 → #4C82E5`) on top of every glass card. |
| `<hr>` dividers | Same 4-stop rainbow as a horizontal rule. |
| Audit CTA section | Conic rainbow at top-right of the dark panel. |

What's already working and **should be kept**:

- Burgundy `#7B2D26` + cream `#F8F5EE` brand discipline.
- Dark `#15140F` data panels (network metrics, security section). These read like Bloomberg terminals — leave alone.
- The editorial typography (DM Sans display + serif italic accents + DM Mono labels).
- The `NetworkChart`, animated counters, typed text, parallax case-file cards — these are the things that *give the page life* without being decorative. Keep all of them.
- The faint dot grid pattern in `.ua-network-canvas::before` — that's the right register. Use it as the template.

---

## 2. Design principles to commit to

**Throughline (the tiebreaker for every future call):** Unauth's identity is *forensic precision, not warmth*. Any choice that adds colour, softness, or decoration has to justify itself against that brief. If it doesn't carry information or signal an action zone, it goes.

Borrowed directly from Stripe/Ramp/Mercury/Linear:

1. **One hue per surface.** Each section gets a single colour story (burgundy, dark, or neutral cream). Never a rainbow.
2. **Geometry over goo.** Dot grids, line grids, and SVG line "beams" over blob gradients.
3. **Atmosphere via spotlights and noise, not paint.** A single radial vignette in brand colour + a film-grain SVG noise overlay produces more depth than five mesh blobs.
4. **Motion only where it carries information.** Counters animate. Bars fill. The fraud network draws. Animated grid cells lighting up across the network section *demonstrate the product working* — that earns its keep. Decorative drift loops do not.
5. **Whitespace over dividers.** Section labels (`§ 1 — WHY IT MATTERS`) carry the rhythm. `<hr>` rules are redundant — delete them entirely.
6. **Peach is a scalpel, not a wash.** `#F4E8E5` / `#B85C4A` appear in exactly two places (evidence step tiles, audit CTA dark panel) and nowhere else. The restriction is what gives the colour weight when it does appear — it signals "this is an action zone."

---

## 3. Recommended libraries

All free, MIT, copy-paste (shadcn-style — no extra dependency burden). I checked your `package.json`: you have Tailwind + Radix but no animation runtime, which is fine — the components below are pure CSS/SVG or use a small optional `motion` runtime.

### Primary: Magic UI — https://magicui.design

Pure-CSS / SVG components that drop into shadcn projects. License: MIT. Use these components:

| Component | Where it goes | Why |
| --- | --- | --- |
| `DotPattern` | Hero background, how-it-works background | Stripe/Linear-style precision dots. Pure SVG, no JS. Parameterised colour + opacity. |
| `GridPattern` | Optional alt for network section | Same family as DotPattern but lines. |
| `AnimatedGridPattern` | Network insights section | Grid cells light up subtly — reads as fraud cells flagging. Locked to one colour. |
| `Meteors` | Audit CTA dark panel | Sparse falling streaks. Recolour to `#B85C4A` (already in your dark palette). |
| `BorderBeam` | The active "how-it-works" step | Animated single-hue border sweep — Stripe uses this on CTAs. |
| `NumberTicker` | Optional replacement for current `Counter.tsx` | More polished, but yours already works — only swap if you want. |

### Secondary: Aceternity UI — https://ui.aceternity.com

License: MIT. Be selective — most of their hero components are too flashy. Use only:

| Component | Where it goes |
| --- | --- |
| `Spotlight` | Hero — single radial spotlight in `#7B2D26` at low opacity. Replaces the conic rainbow. |
| `BackgroundBeamsWithCollision` | Optional, evidence section | Animated SVG lines hitting a baseline. Recolour to burgundy. Single hue. |

**Avoid** (too playful for finance): `WavyBackground`, `Vortex`, `BackgroundGradientAnimation`, `Sparkles`, `LampContainer`.

### Static fallback: Hero Patterns — https://heropatterns.com

License: CC BY 4.0. SVG patterns by Steve Schoger. Zero JS. Use the **"Topography"** or **"Hideout"** or **"Wiggle"** pattern at ~6% opacity in burgundy if you want pure CSS, no JS at all. This is what to fall back to if you don't want to copy any component code.

### Texture: SVG noise / grain

A 4kb inline SVG `<feTurbulence>` filter for very faint film grain over the whole page. Ramp uses this. Drop it as a fixed-position overlay at 3–4% opacity. No library needed — example snippet at the end of this doc.

### Motion runtime (only if needed)

`motion` (the rebranded framer-motion, https://motion.dev) — MIT, ~60kb gzipped. Required by `BorderBeam`, `Meteors`, `AnimatedGridPattern` if you use the JS versions. If you stick to `DotPattern` + `Spotlight` + Hero Patterns + noise, you don't need motion at all and the bundle stays where it is.

```bash
npm install motion          # only if using JS-driven Magic UI / Aceternity components
```

---

## 4. Section-by-section swap plan

### 4.1 Hero (`ua-hero-canvas`)

**Remove:**
- `.ua-hero-canvas::before` — the giant conic rainbow blob with `ua-gradient-drift` animation.
- `.ua-hero-canvas::after` — the diagonal yellow/purple stripe panel with the rotated clip-path.

**Replace with, in order top-to-bottom:**
1. `DotPattern` (Magic UI) as `position: absolute; inset: 0;` — 1px dots, `#7B2D26` at 8% opacity, 32px grid, masked with `radial-gradient(ellipse at 70% 30%, black, transparent 70%)` so it fades.
2. `Spotlight` (Aceternity) at top-right — single radial, `rgba(123,45,38,0.18)` to transparent. No animation.
3. Optionally an inline noise SVG at 3% opacity over everything.

The two floating `.ua-hero-float` cards (96% / Evidence packet) — keep them, but change their background from `rgba(246,192,87,0.24)` radial to `rgba(123,45,38,0.16)` radial. Same shape, brand-correct hue.

### 4.2 Network section (`ua-section-prism`, lines ~933, ~2302)

**Remove:** the conic + 3-radial multi-hue cocktail in `.ua-section-prism::before`.

**Replace with:** `AnimatedGridPattern` from Magic UI, 56px cells, `strokeWidth=0.4`, colour `#7B2D26`, mask-image fade. This subtly twinkles cells on and off — reads as "fraud cells lighting up across the network" which is on-brief. Single hue.

### 4.3 How-it-works (`ua-section-flow`, lines ~1320, ~2617)

**Remove:** the multi-radial pink/purple/orange blob field in `.ua-section-flow::before`.

**Replace with:** `DotPattern` again, but offset 16px so the texture varies vs. the hero. Add `BorderBeam` to the currently-active step card if you want one subtle motion cue.

### 4.4 Evidence (`ua-section-evidence`, line ~1720) — **highest-impact fix**

**Remove:** the per-tile peach/lavender/yellow gradient fills behind the four step icons (Upload / Hash / Resolve / Return). Currently each tile has its own colour wash and they collectively look like rainbow stickers.

**Replace with:** monochrome icons on the existing cream surface, with a 2px burgundy underline that fills on hover (your `ua-hover-lift` already handles motion). The icons themselves stay coloured `#7B2D26`. A single shared `Spotlight` overhead, not per-tile.

Also remove the multi-hue conic in `.ua-section-evidence::before`. Same `AnimatedGridPattern` treatment as 4.2 works here, or just `DotPattern`.

### 4.5 Quiet trust (`ua-section-quiet`, line ~2098)

**Remove:** purple radial in `.ua-section-quiet::before`. Also remove the yellow `rgba(255,183,77,...)` radial.

**Replace with:** SVG noise overlay (grain) at 4% over the existing cream canvas. No peach here — per the restriction in §2, peach is reserved for evidence tiles and the audit CTA only. This section stays cream-and-grain, full stop. The whitespace plus the `§` label is the visual language.

### 4.6 Audit CTA (`ua-audit-canvas`, line ~2813)

**Remove:** the conic yellow/purple/blue gradient in `.ua-audit-canvas::before`.

**Replace with:** Magic UI `Meteors` (≤8 streaks, slow, brand peach `#B85C4A`) over the existing burgundy radial. Keep the dark panel CSS as-is — it's good.

### 4.7 Cross-cutting fixes (independent of any library)

These are the single biggest "kill the rainbow" wins and you can land them with zero new dependencies:

| Line in `globals.css` | Current | Change to |
| --- | --- | --- |
| 765 (`.ua-hero-stage::before`) | yellow + burgundy radial mix | burgundy radial only |
| 794 (`.ua-hero-float`) | radial yellow `rgba(246,192,87,0.24)` | radial burgundy `rgba(123,45,38,0.16)` |
| 879 (`.ua-premium-surface::before`) | 3 radials: yellow + burgundy + purple | burgundy + peach `#F4E8E5` only |
| 954–962 (`<hr>` rules in every section) | 4-stop rainbow | **Delete the rule entirely.** Whitespace + `§` section labels carry the rhythm. Remove every `<hr>` from `page.tsx` too, and drop the selector block from `globals.css`. |
| 1010 (`.ua-glass-card::before`) | yellow + purple radials | drop entirely, or burgundy radial only |
| 1021 (`.ua-glass-card::after`) | 4-stop rainbow top stripe | drop, or use 2px solid `#7B2D26` at 18% opacity |
| 1032 (`.ua-dark-panel::before`) | burgundy + purple | burgundy only (`#B85C4A`) |
| 1042 (`.ua-dark-panel::after`) | 3-stop rainbow stripe | 2px `#B85C4A` at 40% |

These eight edits, in isolation and without any new library, would already remove ~70% of the AI-template feel. The library additions then add back the "life" you don't want to lose.

---

## 5. Locked palette to enforce going forward

Pin these in `globals.css` as the canonical values; reject anything outside:

```css
--brand-burgundy:      #7B2D26;
--brand-burgundy-soft: rgba(123, 45, 38, 0.16);
--brand-rust:          #B85C4A;   /* RESTRICTED — audit CTA dark panel only */
--brand-peach:         #F4E8E5;   /* RESTRICTED — evidence step tiles only */
--brand-cream:         #FAF6EF;   /* canvas */
--brand-cream-2:       #F8F5EE;   /* sunken */
--brand-cream-3:       #FDFBF6;   /* card */
--brand-line:          #D8D0BD;
--brand-ink:           #1A1814;
--brand-ink-2:         #15140F;   /* dark panel */
```

**Peach discipline (non-negotiable):** `--brand-peach` and `--brand-rust` appear in two locations only — the four evidence step tiles and the audit CTA dark panel. Grep the codebase before merging: any new usage outside those two surfaces should be rejected in review. The restriction is what makes those surfaces read as "action zone" rather than ambient warmth.

Banned (currently used, should be deleted): `#F6B84F`, `#B96EF5`, `#4C82E5`, `rgba(185,110,245,...)`, `rgba(246,192,87,...)`, `rgba(255,183,77,...)`, `rgba(177,123,229,...)`, `rgba(178,98,226,...)`, `rgba(132,94,247,...)`, `rgba(68,112,214,...)`, `rgba(84,132,226,...)`, `rgba(76,130,229,...)`.

---

## 6. Snippets

### 6.1 SVG film grain overlay (zero deps)

Add once to layout, fixed at z-index 0:

```tsx
<svg className="pointer-events-none fixed inset-0 -z-0 opacity-[0.035] mix-blend-multiply"
     xmlns="http://www.w3.org/2000/svg" aria-hidden>
  <filter id="noise">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/>
    <feColorMatrix values="0 0 0 0 0.10  0 0 0 0 0.09  0 0 0 0 0.07  0 0 0 1 0"/>
  </filter>
  <rect width="100%" height="100%" filter="url(#noise)"/>
</svg>
```

### 6.2 Hero spotlight (zero deps)

Replace the entirety of `.ua-hero-canvas::before` with:

```css
.ua-hero-canvas::before {
  content: '';
  position: absolute;
  inset: -10% -10% auto auto;
  width: min(70vw, 900px);
  height: min(60vw, 700px);
  z-index: -1;
  pointer-events: none;
  background: radial-gradient(ellipse at 70% 30%,
    rgba(123, 45, 38, 0.22) 0%,
    rgba(123, 45, 38, 0.08) 30%,
    transparent 60%);
  filter: blur(40px);
}
```

### 6.3 Magic UI `DotPattern` install (copy-paste, no deps)

From https://magicui.design/docs/components/dot-pattern. The component is ~40 lines of TSX, drop into `components/ui/dot-pattern.tsx`. Usage in hero:

```tsx
<DotPattern
  width={32} height={32} cx={1} cy={1} cr={1}
  className="absolute inset-0 -z-10 text-[#7B2D26]
             [mask-image:radial-gradient(ellipse_at_70%_30%,white,transparent_72%)]
             opacity-[0.18]"
/>
```

---

## 7. Suggested execution order

`motion` is in scope — install it during Pass B so Pass C drops in clean. The `AnimatedGridPattern` on the network section is the one effect that *demonstrates the product working* (cells flagging across a graph = what Unauth literally does), so it's not optional decoration. It earns the dep.

1. **Pass A — Rainbow extraction + `<hr>` deletion (1–2 hours, zero deps).**
   Apply §4.7 cross-cutting fixes, the locked palette in §5, and delete every `<hr>` from `page.tsx` plus the corresponding selector block in `globals.css`. This is almost pure deletion + a colour-token sweep. Ship as standalone PR — the AI-template feel is gone after this pass alone, and the rest of the work becomes easier to judge against a clean baseline.
2. **Pass B — Hero + how-it-works backgrounds (2–4 hours, adds `motion`).**
   `npm install motion`. Copy `DotPattern` (Magic UI) and `Spotlight` (Aceternity) into `components/ui/`. Wire them into the hero and how-it-works sections per §4.1 and §4.3. Add the noise SVG to the root layout.
3. **Pass C — Demonstrative motion (half a day).**
   Copy `AnimatedGridPattern` into network section, `Meteors` into audit CTA, `BorderBeam` onto the active how-it-works step.
4. **Pass D — Rebuild evidence tiles (separate session).**
   This is the only piece that's a real UI rewrite rather than a CSS swap. Monochrome icons on cream, peach reserved for hover/active state only.

---

## 8. What I did NOT change

- The actual content / copy of the landing page.
- The `Reveal`, `Counter`, `AnimatedBar`, `TypedText`, `NetworkChart`, `ParallaxController` components — these are the substance of the page and they're good.
- The dark `#15140F` panels — they're already in the right register.
- The header/nav, the case-file card, the audit form, the footer.
- The mobile layout — it currently reads cleaner than desktop because the rainbow blobs are clipped off-screen, so the proposed changes will only improve it.
