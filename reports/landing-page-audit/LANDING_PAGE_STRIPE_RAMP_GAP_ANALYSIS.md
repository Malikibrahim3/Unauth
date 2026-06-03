# Landing Page Gap Analysis — Unauth vs. Stripe / Ramp

Date: 2026-06-03
Scope: the marketing landing page (`/landing`) only. This is a **judgment + reference document**, not an edit. It exists to be worked off of directly: every gap has a "what they do," a "what we do," and a "how to close it."

References used:
- Stripe gradient/engineering writeups — [bram.us](https://www.bram.us/2021/10/13/how-to-create-the-stripe-website-gradient-effect/), [kevinhufnagl.com](https://kevinhufnagl.com/how-to-stripe-website-gradient-effect/), [getdesign.md/stripe](https://getdesign.md/stripe/design-md)
- Ramp design system case study — [Bakken & Baeck](https://bakkenbaeck.com/case/ramp)
- Component-library landscape — [shadcn alternatives](https://dev.to/tailwindcss/best-shadcn-alternatives-1jh0), [Aceternity guide](https://ui.aceternity.com/guides/best-react-ui-components-2026), [Tailwind libraries 2026](https://designrevision.com/blog/best-tailwind-component-libraries)

---

## 0. TL;DR — the one-line diagnosis

Our page has a **coherent concept** (warm "claim-intelligence ledger" brand) but **amateur execution**. Stripe and Ramp don't win because of *what* they put on the page — they win on **density, depth, motion, type craft, and product realism**. We are missing all five. The result reads as "AI-generated editorial-SaaS template": a beige page with a serif-italic headline, mono-font pill chips that look like disabled form inputs, evenly-weighted flat cards, and a hero that is **literally empty on first paint**.

The brand is *not* the problem. The **craft** is. You can be Stripe-level and warm. Right now we are neither cool-and-precise (Ramp) nor warm-and-crafted (e.g. Mercury, Linear-in-light-mode) — we're warm-and-rough.

---

## 1. What I actually observed on our page

Captured live from the running dev server at 1440×900 and 320–390 mobile.

**Hero, first paint (scroll 0):** almost the entire first viewport is **empty beige**. The H1, subhead, CTAs, chips, and product image are all `opacity: 0` until the `Reveal` IntersectionObserver fires. So the most important screen real estate on the site shows *nothing* for the first frames, then fades in. This is the opposite of Stripe/Ramp, where the hero is fully painted and dense on first byte.

**Hero, revealed state:**
- H1 mixes a heavy geometric **sans** ("Connect your store and helpdesk.") with a large **serif italic in burgundy** ("Know which claims to trust…"). The serif-italic reads *editorial / newspaper*, not *product*. It's the single most "template-y" tell on the page.
- Eyebrow says `LIVE CLAIM INTELLIGENCE… Issue 04 · 2026-06-03`. The "Issue 04 / date" affectation is magazine cosplay; it adds nothing and signals "designed by vibes."
- CTAs: solid burgundy primary is fine; **"View demo" is a flat grey box** with no hierarchy, no icon, no hover life.
- Trust chips are **mono-font pills with thin borders** — they look like read-only text inputs, not polished badges.
- The product screenshot sits in a frame that **bleeds off the right edge** of the viewport and is **lazy-loaded** (so it's the LCP element *and* deferred — worst case for perceived speed). It's not composed: no browser chrome, no intentional crop, no layered overlays. It just runs off the page.
- Background: faint dot-grid + a faint top-right gradient blob. Generic.

**Integrations section (the strongest part):** the order-source + helpdesk → graphite workspace architecture is genuinely good — real logos, a dark output card for contrast, clean mobile stacking. **This is the only section operating near the target bar.** It proves the team *can* hit it; the rest of the page just hasn't.

**Everything below:** same vocabulary repeated — beige section, eyebrow in mono, serif-italic accent in the H2, a flat 4-up card grid, repeat. No light/dark rhythm, no depth, no motion beyond fade-up, no product imagery except two static PNGs.

---

## 2. The gap, dimension by dimension

Each row: **Stripe/Ramp standard → what we do → how to close it.**

### 2.1 First impression & hero density
- **Them:** Hero is fully painted instantly, high information density, one unmistakable focal point (animated gradient for Stripe; a real, pixel-crisp product UI for Ramp). You understand the product in <2s without scrolling.
- **Us:** Empty on first paint; when revealed, sparse left column + a screenshot bleeding off-edge. Lots of dead beige.
- **Close it:**
  - Kill the fade-in on the hero. Hero content must be in the first server-rendered paint. Reserve `Reveal` for *below-the-fold* sections only.
  - Set the hero product image to `priority` (eager), and make it the deliberate LCP.
  - Fill the fold: tighten the left column, bring the product panel **fully into frame** inside a real device/browser frame, and add 2–3 floating UI "proof" chips *on* the product (not as form pills beside it).

### 2.2 Typography
- **Them:** Stripe uses **söhne** (Klim Type Foundry) — a single, premium grotesk — across the whole site, with tight tracking and confident weight contrast (300 body ↔ 600/700 display). Ramp uses a custom grotesk type scale defined as a system (Bakken & Baeck built explicit type scales for low- and high-density contexts). **One typeface family, many weights, ruthless consistency.**
- **Us:** Three-way split — geometric sans + serif italic (Georgia-ish) + DM Mono — used decoratively. The serif-italic is the problem child. Mono is overused for eyebrows *and* chips *and* metadata.
- **Close it:**
  - Pick **one** high-quality sans as the spine (see §4). Demote or **delete the serif italic** from headlines — or, if you keep a warm editorial accent, use it *once* on the page (e.g. a single pull-quote), never in every H2.
  - Restrict mono to genuine data/code contexts (schema fields, hashes, timings) — not chrome.
  - Build a real type scale: e.g. display 56/48/40, heading 28/22, body 17/15, caption 13 — with defined line-height and tracking per step, as tokens. Right now sizes are ad hoc `clamp()`s.

### 2.3 Color, contrast & light/dark rhythm
- **Them:** Cool neutrals + one saturated brand accent + **deliberate dark sections** that create rhythm and let product UI glow. High contrast. Ramp pairs near-black surfaces with crisp white product frames.
- **Us:** Beige-on-beige for ~80% of the page. The only contrast moments are the graphite integration card and the dark FAQ. Burgundy is the lone accent and it's muddy against cream.
- **Close it:**
  - Introduce a **3–4 band rhythm**: warm-paper → white-product → graphite/dark → warm-paper. Already half-built (graphite + info tokens were added) — now *use* them as full-bleed section backgrounds, not just one card.
  - Raise contrast: pure-white product panels with real shadows against the cream; a true dark section (not just FAQ) to host the dashboard/case-file proof.
  - Keep the warm base if you want the brand — but it must be **punctuated**, not uniform.

### 2.4 Product as proof (imagery)
- **Them:** The product *is* the hero art. Stripe animates real dashboards; Ramp shows pixel-perfect, purpose-built product frames (often re-rendered at 2x, in a browser/app chrome, with motion). Every claim is shown, not told.
- **Us:** Two static PNG screenshots (`inbox.png`, `dashboard.png`) — one bleeding off-edge, both un-framed, plus a generic 4-step auto-rotating tab. No annotation, no composition, no motion that explains the product.
- **Close it:**
  - Wrap product shots in a **consistent frame component**: browser chrome or app shell, rounded corners ≤8px, layered shadow, optional subtle perspective.
  - Add **annotation overlays** that point at real UI ("Confidence grade", "Evidence ready", "k-anonymity gate") — this is how Stripe makes a screenshot teach.
  - Consider one **"hero moment" animation**: a claim flowing Connect → Sync → Resolve → Review with the real UI updating. Even a 6-frame Lottie/Rive beats a static PNG.

### 2.5 Motion & interaction
- **Them:** Purposeful motion everywhere — the Stripe WebGL gradient (their `minigl` + `ScrollObserver`), scroll-linked product reveals, hover states with spring physics, number tickers, sticky scroll-jacking that narrates. Motion *explains*.
- **Us:** A single `fade + translateY` on scroll, plus an auto-advancing tab carousel. No hover craft, no scroll-linked storytelling, no spring. The one bit of motion (reveal) actively *hurts* us because it leaves the fold blank.
- **Close it:**
  - Adopt a real animation lib (Motion / Framer Motion — see §4) and add: hover elevation on cards, button press/hover springs, a count-up on stats, and **one** scroll-linked product sequence.
  - If you want the Stripe signature: a WebGL/canvas gradient is a well-trodden, copyable technique (the `stripe-gradient`/`minigl` port). Use it *once*, behind a dark section, masked — not the whole page.

### 2.6 Depth & elevation
- **Them:** Layered shadows, soft ambient + key shadow pairs, subtle borders, glassmorphism on overlays. Things sit *above* the page.
- **Us:** Mostly flat 1px borders on cards. The `ua-glass-card` exists but is barely used; most cards are `border: 1px solid var(--landing-border)` with no shadow.
- **Close it:** Define an elevation scale (e.g. `shadow-sm/md/lg/xl` as tokens with realistic 2-layer shadows) and apply it to product frames, pricing's featured tier, and hover states. Borders alone read as "wireframe."

### 2.7 Spacing, grid & rhythm
- **Them:** A strict spacing scale and a real grid; vertical rhythm is consistent; sections breathe but never feel empty because density is high *within* the breathing room.
- **Us:** Section padding is inconsistent (`pt-14/16/20`, ad hoc), the hero has dead space, and card grids are evenly weighted (every card same size = no focal point).
- **Close it:**
  - Commit to an 8px spacing scale as tokens; replace ad-hoc paddings.
  - Break the "4 equal cards" monotony: make one outcome/pricing card dominant (featured tier, bigger first outcome with an image).
  - Tighten the hero so the fold is full at 900px height.

### 2.8 Iconography
- **Them:** A single coherent icon set (custom or one library), consistent stroke weight, used to anchor every feature.
- **Us:** Almost **no icons** — bullets are literal `·` middots and tiny coloured dots. Feels unfinished.
- **Close it:** Adopt one icon set (Lucide or Phosphor — see §4) and give every outcome module, pricing tier, and workflow step a real icon at consistent size/stroke.

### 2.9 Component craft (buttons, chips, cards)
- **Them:** Buttons have considered padding, weight, hover/active, focus rings, optional leading/trailing icons, and loading states. Chips/badges are designed objects.
- **Us:** Primary button OK; secondary is a flat grey rectangle. Chips look like inputs. Cards are flat. No focus-visible styling worth noting.
- **Close it:** Build a real `Button` (variants: primary/secondary/ghost, sizes, icon slots, focus ring) and `Badge` component. shadcn/ui gives you these in an hour (see §4) — restyle to the brand.

### 2.10 Background & texture
- **Them:** Texture is subtle and *intentional* (Stripe's mesh gradient; Ramp's product-graphic system). Never a default dot-grid.
- **Us:** Faint dot-grid + faint gradient blob = the two most overused "SaaS starter" textures. The earlier brief even said "no orbs/blobs" — we still have a blob.
- **Close it:** Remove the dot-grid and blob. Replace with either (a) nothing (clean paper) or (b) one crafted gradient/mesh behind a single dark section.

### 2.11 Copy microcraft & voice
- **Them:** Tight, confident, specific. Verb-first. No filler. Stripe's copy is so clear the animations alone explain the product.
- **Us:** Mostly good (the integration-first rewrite landed), but the "Issue 04 · date" and some hedgy compound sentences ("Start with live sources; use CSV only for historical backfill when you need it." as a bolded fragment) read awkwardly.
- **Close it:** Drop the magazine affectations. One idea per line. Bold the *claim*, not the caveat.

### 2.12 Social proof & trust
- **Them:** Logo walls of recognizable customers, hard metrics ("$X processed"), security/compliance badges, testimonials with faces.
- **Us:** None. No customer logos, no metrics with provenance, no testimonials, no SOC2/GDPR badge row (despite privacy being a core pitch).
- **Close it:** Add a logo strip (even "works with" platform logos if no customers yet), a metrics band, and a security/compliance badge row. This is a whole missing layer.

### 2.13 Performance & first paint
- **Them:** Hero is server-rendered and instant; LCP is fast; motion never blocks content.
- **Us:** Hero depends on client JS reveal → empty first paint, likely poor LCP, and the LCP image is `loading="lazy"`. This is both a perf bug and a perceived-quality bug.
- **Close it:** SSR the hero fully; `priority` the hero image; gate `Reveal` to below-the-fold only; verify LCP < 2.5s and CLS ~0.

---

## 3. Section-by-section punch list

| Section | Biggest gap | Fix |
|---|---|---|
| **Hero** | Empty on first paint; off-edge un-framed screenshot; editorial serif H1; form-like chips | SSR + fill fold; frame the product with overlays; one typeface; badge component; eager LCP image |
| **Integrations** | *Closest to target* — keep | Add hover states + a connecting animated line; consistent icon for each provider category |
| **Outcomes (02)** | 4 identical flat cards, no icons, no imagery | Add icons; make card 1 dominant with a product thumbnail; elevation on hover |
| **Workflow (03)** | Auto-rotating tab carousel feels canned; static PNGs | Scroll-linked stepper with real UI updating per step; pause on hover; progress affordance |
| **Evidence (04)** | Single static dashboard PNG, un-framed | Frame it; annotate it; put it on a dark band so it glows |
| **Network (05)** | Wall of text, no visual | Add a small k-anonymity / identity-graph diagram or animation |
| **Pricing (06)** | 4 equal flat cards; no featured tier; no toggle | Elevate/feature one tier; add icons per bullet; clearer value ladder; annual/monthly toggle if relevant |
| **Comparison** | Dense table, heavy | Lighten; iconography for yes/partial/no; sticky column header |
| **FAQ** | Fine structurally; only dark moment on page | Keep; it's a good rhythm anchor — replicate the dark treatment elsewhere |
| **Footer** | Generic | Add the logo/metrics/security row *above* it; it's the last impression |
| **Global** | Beige monotone, no depth, no icons, dot-grid + blob, fade-in everywhere | See §2; this is 80% of the perceived-quality gap |

---

## 4. The toolkit — what they use, what we should use

### 4.1 What Stripe & Ramp actually use (so we calibrate expectations)
- **Stripe:** fully **bespoke**. Custom typeface (**söhne**, licensed from Klim), in-house **WebGL** gradient engine (their `minigl`), custom design system, custom everything. They do **not** use an off-the-shelf UI kit. Lesson: top-tier craft is custom — but the *techniques* (WebGL gradient, scroll-linked motion, framed product UI) are all reproducible.
- **Ramp:** bespoke design system built **with [Bakken & Baeck](https://bakkenbaeck.com/case/ramp)** — they defined a color palette, **motion expressions**, **type scales**, and a flexible **product-graphic grid** that scales from abstract images to dense multi-currency animations. Built on standard web tech (React/Next), just executed at a high bar. Lesson: a *system* (tokens, scales, motion rules) is what creates consistency — not individual pretty screens.

**Takeaway:** neither uses a component library as their "look." The library gives you *correct, accessible primitives fast*; the *brand layer on top* is what you must craft. Don't expect shadcn to make you look like Stripe — expect it to remove 80% of the plumbing so you can spend time on the 20% that's craft.

### 4.2 Recommended stack for *us* (pragmatic, we're on Next + Tailwind already)

| Layer | Recommendation | Why / notes |
|---|---|---|
| **Primitives** | **Radix UI** (via **shadcn/ui**) | Accessible, unstyled base for Button/Dialog/Tabs/Accordion/Tooltip. shadcn copies code into the repo so we fully own/restyle it. Industry standard. |
| **Animation** | **Motion** (formerly Framer Motion) | Springs, layout animation, scroll-linked (`useScroll`/`useTransform`). This is the single highest-leverage add for "premium feel." |
| **Premium prebuilt blocks** | **Aceternity UI** and/or **Magic UI** | Spotlight, parallax, animated beams, bento grids, marquees — copy-paste, Motion-based. Use *sparingly* as starting points, then restyle to brand or they'll look generic. ([Aceternity](https://ui.aceternity.com/guides/best-react-ui-components-2026)) |
| **Icons** | **Lucide** (default) or **Phosphor** | One set, consistent stroke. Lucide pairs natively with shadcn. |
| **Typeface** | License a real grotesk **or** use a top-tier free one | Paid: söhne / GT America / Suisse Int'l. Free/near-free: **Geist** (Vercel), **Inter Tight**, **Instrument Sans**, or **Pangram Pangram**'s free faces. Pick ONE; build the scale. |
| **Gradient / texture** | `stripe-gradient` / `minigl` port, or **shader-gradient** | For one signature dark-section gradient. ([how-to](https://www.bram.us/2021/10/13/how-to-create-the-stripe-website-gradient-effect/)) |
| **Product motion** | **Rive** or **Lottie** | For the "claim flowing through the pipeline" hero moment, if we want true product animation without a video. |
| **Section primitives** | **Tailwind** (have it) + a tokens pass | Formalize spacing/elevation/type as tokens; we already have color tokens. |

> Constraint check: the project rules cap radius at ≤8px and warn against `as any`/eslint-disable — none of the above requires breaking those. shadcn components are plain TS/React and can be restyled to 6–8px radius and brand tokens.

### 4.3 What NOT to do
- Don't bolt Aceternity/Magic UI blocks on unchanged — they have a recognizable "look" and will read as *more* templated, not less.
- Don't add a second decorative font. The serif-italic is already one too many.
- Don't keep the dot-grid + blob.
- Don't animate the whole page; motion is seasoning.

---

## 5. Prioritized remediation plan

**P0 — kills the "amateur" read (do first, highest ROI):**
1. SSR the hero; remove fade-in above the fold; `priority` the hero image. *(perf + first impression)*
2. Frame the product screenshots (browser/app chrome + real shadow + overlays); bring the hero shot fully into frame.
3. One typeface decision: remove the serif-italic from headings; build a proper type scale. *(or commit to using it exactly once)*
4. Replace mono "form-input" chips with a real `Badge` component; build a real secondary `Button`.
5. Remove dot-grid + gradient blob.

**P1 — reaches "credible/premium":**
6. Add light/dark section rhythm using the existing graphite/info tokens (full-bleed bands).
7. Add an icon set; give every outcome/pricing/workflow item an icon.
8. Add elevation scale + hover states on all cards; feature one pricing tier.
9. Add the missing trust layer: logo strip + metrics band + security/compliance badges.

**P2 — reaches "Stripe/Ramp-adjacent":**
10. Introduce Motion: scroll-linked workflow stepper, count-ups, spring hovers.
11. One signature moment: WebGL gradient behind a dark section, or a Rive product animation in the hero.
12. Re-shoot product imagery at 2x in-frame; annotate.

Rough effort: P0 ≈ 1–2 focused days, P1 ≈ 3–4 days, P2 ≈ 1 week+. P0 alone moves us from "looks AI-made" to "looks intentional."

---

## 6. Definition of done (measure against this)

- [ ] Hero is fully visible in the first server-rendered paint (disable JS → hero still complete).
- [ ] Exactly **one** typeface family for UI/headings (mono only for data); serif-italic removed or used once.
- [ ] LCP image is eager/`priority`; Lighthouse LCP < 2.5s, CLS < 0.05.
- [ ] At least **3 contrast bands** (paper / white-product / dark) in the scroll.
- [ ] Every product screenshot is inside a consistent frame with realistic shadow; ≥2 have annotation overlays.
- [ ] No dot-grid, no gradient blob.
- [ ] Every feature/outcome/pricing/workflow item has an icon from one set.
- [ ] Buttons and badges are real components with hover/active/focus-visible states.
- [ ] One featured pricing tier; cards are not all visually equal.
- [ ] A trust layer exists (logos and/or metrics and/or security badges).
- [ ] At least one scroll-linked or product animation that *explains* the product.
- [ ] Nothing on the page would make a senior designer say "this looks like a template."

---

## 7. Honest note on strategy

Two viable directions, pick one and commit:

- **A) Stay warm, get crafted** (recommended — it's differentiated): keep the paper/burgundy brand, but execute it like a premium editorial-fintech product (think Mercury's warmth, Stripe's rigor). Requires the type, depth, motion, and product-framing fixes above. The warmth becomes an asset instead of an excuse.
- **B) Go cool & operational** (safer, more derivative): shift toward Ramp's neutral, dense, near-black-and-white product aesthetic. Lower risk, but you give up the one thing that makes the brand memorable.

Either way, the work is the same five things: **density, depth, motion, type, product-realism.** The brand color is not what's holding us back — the absence of craft is.
