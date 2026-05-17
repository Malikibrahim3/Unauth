# Landing Page — Ramp-Level Upgrade Plan

Honest critique of the current state at http://localhost:3000 against ramp.com's execution standard, with a prioritized implementation roadmap.

Reference screenshots (already captured to `/tmp/`):
- `run_01_hero.png` — Hero viewport
- `run_02_pattern.png` — §1 Pattern + IdentityFeed
- `run_03_stats.png` — §2 Stats with charts
- `run_05_api.png` — §3 API response card
- `run_06_pipeline.png` — §3.4 Pipeline steps
- `run_07_data.png` — §4a Data fields cards
- `run_08_security.png` — §4b Security grid
- `run_09_table.png` — §4c Comparison table
- `run_10_cta.png` — §5 CTA + Notes

---

## Honest gap analysis

We have a **well-designed editorial layout**. Ramp has an **interactive product showcase**. The gap isn't taste — it's *content density and motion*.

| Dimension | Current state | Ramp standard | Gap |
|---|---|---|---|
| **Header** | Logo + Sign in. Static. | Frosted-glass sticky nav with anchor links and gradient ghost-line beneath | Major |
| **Hero typography** | 60px headline max | 84-120px display type, tight line-height, often two-line bold statement | Major |
| **Hero composition** | Text left, static card right | Text + animated product UI mockup (cursor moves, data updates), often 50/50 with decorative depth elements | Major |
| **Trust signals** | None | "Trusted by 500+ merchants" + 6-12 logo strip directly below hero | Major |
| **Section variety** | All cream backgrounds except 2 dark sections | Alternating full-bleed colored sections, gradient sections, oversized typography sections | Major |
| **Pipeline visualization** | Vertical list of 5 text blocks with ghost numerals | Horizontal animated flow diagram with connected nodes, hover reveals, or pinned-scroll narrative | Major |
| **Code/API demo** | Single static JSON response | Tabbed code switcher (cURL / Node / Python) with copy buttons, animated typing on scroll, paired with mock terminal output | Major |
| **Cross-merchant visual** | Text describing the concept + Identity feed table | Animated network graph showing buyer-node connected across 7 merchant-nodes, lighting up sequentially | Major |
| **Hero CTAs** | Two inline | Primary + secondary CTA, plus dedicated CTA module per section | Medium |
| **Bento/feature grids** | None — sections are 2-col text-and-card | Mixed-size card grids with images + stats + quotes | Medium |
| **Pull-quote moments** | None | Oversized single-statement moments between sections | Medium |
| **Footer** | Minimal one-line | 4-column mega footer with brand mark, links, social, legal | Medium |
| **Page progress** | None | Thin progress bar at top showing scroll position | Small |
| **Background grain** | Dot grid overlay only on hero | Subtle SVG noise filter site-wide for "paper" feel | Small |
| **Hover depth** | Scale-up only | Cards lift, reveal hidden content, internal elements shift parallax | Medium |

---

## Implementation roadmap

Five waves, ordered by visual ROI. Each wave is independently shippable.

### Wave 1 — Structural visual moments (highest impact)

These are the changes that, in isolation, would move us 60% of the gap.

#### 1.1 Sticky frosted header with anchor nav

Replace the current minimal header with a sticky bar.

```tsx
// New: components/landing/StickyHeader.tsx (client)
const [scrolled, setScrolled] = useState(false);
useEffect(() => {
  const onScroll = () => setScrolled(window.scrollY > 32);
  window.addEventListener('scroll', onScroll);
  return () => window.removeEventListener('scroll', onScroll);
}, []);
return (
  <header style={{
    position: 'sticky', top: 0, zIndex: 50,
    background: scrolled ? 'rgba(248,245,238,0.78)' : 'transparent',
    backdropFilter: scrolled ? 'blur(12px) saturate(140%)' : 'none',
    WebkitBackdropFilter: scrolled ? 'blur(12px) saturate(140%)' : 'none',
    borderBottom: scrolled ? '1px solid rgba(216,208,189,0.5)' : '1px solid transparent',
    transition: 'background 0.3s ease, border-color 0.3s ease',
  }}>
    <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-4 flex items-center justify-between">
      <UnauthLogo variant="wordmark-light" size={24} />
      <nav className="hidden md:flex items-center gap-8">
        {['Pattern', 'Network', 'How it works', 'Security', 'Pricing'].map(item => (
          <a key={item} href={`#${item.toLowerCase().replace(/\s/g,'-')}`}
             style={{ fontFamily:'var(--font-dm-sans, sans-serif)', fontSize:13, color:'#4A4640', textDecoration:'none', letterSpacing:'0.02em' }}>
            {item}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-4">
        <a href="/login" style={{ fontSize:13, color:'#4A4640' }}>Sign in</a>
        <a href="/login" style={{
          background:'linear-gradient(135deg, #8C3129 0%, #7B2D26 100%)',
          color:'#E8E4D8', padding:'9px 18px', fontSize:13, fontWeight:600,
          boxShadow:'0 2px 12px rgba(123,45,38,0.25)',
        }}>Get started</a>
      </div>
    </div>
  </header>
);
```

Add corresponding `id="..."` anchors on each section.

#### 1.2 Page scroll-progress bar

Razor-thin burgundy bar at top of viewport tracking scroll percentage. 4px height. Uses Framer Motion's `useScroll` + `useTransform`.

```tsx
// In LandingAnimations.tsx
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 100,
        background: 'linear-gradient(90deg, #7B2D26 0%, #C4935A 100%)',
        transformOrigin: '0%',
        scaleX: scrollYProgress,
      }}
    />
  );
}
```

#### 1.3 Hero typography overhaul

Bump headline to commanding size. Add a kinetic word treatment.

- Current: `clamp(36px, 5vw, 60px)`, weight 500
- New: `clamp(44px, 7vw, 96px)`, weight 500, line-height 1.02, letter-spacing -0.035em
- Split into 3 lines with deliberate breaks
- Word "resolves" gets a hand-drawn underline SVG (burgundy, slightly imperfect) animating in 800ms after mount
- Add a small eyebrow badge: pulsing dot + "LIVE PILOT — 12 merchants resolved 2.4M orders this week" (synthetic but plausible, marked as illustrative if needed)
- Reduce paragraph copy to ONE sentence under headline, not two

```tsx
<h1 style={{
  fontSize: 'clamp(44px, 7vw, 96px)',
  fontWeight: 500,
  letterSpacing: '-0.035em',
  lineHeight: 1.02,
}}>
  Unauth resolves<br/>
  the buyer your store<br/>
  has <span style={{ position:'relative', display:'inline-block' }}>
    never seen
    <svg /* hand-drawn underline */ />
  </span>.
</h1>
```

#### 1.4 Hero animated product mockup (replace static case file)

The case file is rich content but it's *static* — Ramp's heroes have motion. Two options:

**Option A (cheaper):** Add a "tape" of live-feeling micro-animations to the existing case file:
- Risk score 0.92 animates from 0.00 with easing on mount
- "DECLINE NEXT ORDER" CTA pulses every 4s
- A subtle scanning gradient line traverses top-to-bottom every 6s (like a CRT scanline)
- Network footprint rows reveal sequentially with the IdentityFeed's existing pattern

**Option B (real impact):** Render TWO stacked artifacts:
1. The case file (left/back, slightly rotated/offset)
2. A "Recommended action" panel (right/front) sliding in with `ASSEMBLE CE 3.0 PACKET` button
Both with depth shadows. Creates a "stacked product views" feel like Ramp's hero.

#### 1.5 Trust strip — pilot merchants

Directly below the hero, full-bleed strip with subdued background:

```tsx
<section style={{
  borderTop: '1px solid rgba(216,208,189,0.6)',
  borderBottom: '1px solid rgba(216,208,189,0.6)',
  background: 'rgba(248,245,238,0.5)',
  padding: '32px 0',
}}>
  <div className="mx-auto max-w-[1400px] px-4 md:px-6">
    <p style={{ /* eyebrow */ }}>
      IN PILOT WITH MERCHANTS ACROSS
    </p>
    <div className="flex items-center justify-between flex-wrap gap-8">
      {/* 6 vertical industry labels, monospace, low contrast */}
      {['DTC FASHION','MARKETPLACE','AUDIO HARDWARE','SUBSCRIPTION BEAUTY','HOME GOODS','SUPPLEMENTS'].map(...)}
    </div>
  </div>
</section>
```

If logos can't be added (pre-revenue), use vertical-typeset industry category labels with monospace as faux logos — feels editorial and on-brand.

#### 1.6 Network graph visualization for §1

This is the biggest concept-clarity win. Replace (or add alongside) the IdentityFeed with an animated SVG showing 1 buyer node connected to 7 merchant nodes, edges pulsing in sequence.

```tsx
// Pseudocode: 7 merchant nodes arranged in circle, center buyer node
// On scroll into view: edges animate in one by one (stroke-dasharray + stroke-dashoffset)
// Each merchant node tooltip on hover: "$340 · 3 orders · 2 refunds" etc.
// Center buyer node has the same #u_kessler.07 label
```

This makes the abstract "cross-merchant" concept concrete.

---

### Wave 2 — Pipeline & API showcase upgrades

#### 2.1 Pipeline as horizontal flow diagram

Replace the vertical list with a horizontal 5-stage flow with animated connectors.

Desktop layout:
```
┌────┐  →  ┌────┐  →  ┌────┐  →  ┌────┐  →  ┌────┐
│ 01 │     │ 02 │     │ 03 │     │ 04 │     │ 05 │
└────┘     └────┘     └────┘     └────┘     └────┘
Import     Normalise  Graph      Score      Export
[icon]     [icon]     [icon]     [icon]     [icon]
```

- Each card: 200px wide, raised on hover, contains step number, custom SVG icon (24px), title, 1-line caption
- Connectors: animated burgundy line drawn left-to-right on scroll, with arrowhead pulse
- Below the flow: a "tab" UI revealing the longer description for the currently-active/hovered step
- On click, the connector lights up to that point and the detail panel scrolls into view

Mobile: stack vertically with downward arrows (current ghost-numeral layout is fine for mobile).

#### 2.2 Tabbed API code switcher

Replace the single JSON pre-block with a tabbed component:

```
┌──────────────────────────────────────┐
│ cURL │ Node.js │ Python │ Go │  ⋯    │ ← active tab is cURL
├──────────────────────────────────────┤
│ $ curl -X POST https://api.unauth... │
│ {                                    │
│   "order_id": "ORD-77241",           │
│   ...                                │
│ }                                    │
└──────────────────────────────────────┘
```

- Tabs: monospace, active tab has burgundy bottom-border + slight bg lift
- Code block re-renders on tab change with a brief fade
- Copy button top-right of the code area
- Below the request block: a second block showing the response (current JSON) — split-pane treatment

Each tab content (3 examples, all 8-15 lines):
- **cURL**: `curl -X POST ... -H "Authorization: Bearer ..."`
- **Node.js**: `const result = await unauth.score({ order_id: 'ORD-77241' })`
- **Python**: `result = unauth.score(order_id='ORD-77241')`

#### 2.3 API section left column — fill the void

Currently §3 left column is 2 short paragraphs floating in a tall column. Add below them:

- A small "INTEGRATION TIME" metric: `< 8 minutes` (huge font, burgundy accent)
- 3 small feature bullets with checkmark icons:
  - ✓ One endpoint, one response
  - ✓ Client-side hashing — we never see raw PII
  - ✓ Idempotent — replay-safe with deterministic IDs
- A secondary CTA: "View the full API reference →" (text link, burgundy)

---

### Wave 3 — New high-impact sections

These are net-new sections to inject between existing ones.

#### 3.1 Bento feature grid (new §1.5 or after §1)

A 3-column × 2-row bento grid showing 6 features in mixed sizes:

```
┌──────────────────────┬────────────┐
│  CROSS-MERCHANT      │            │
│  IDENTITY GRAPH      │  CONFIDENCE│
│  [animated nodes]    │  GRADES    │
│  (spans 2 cols)      │  [pill UI] │
├──────────┬───────────┼────────────┤
│ EVIDENCE │ HASHED    │  REAL-TIME │
│ PACKETS  │ PII       │  + BATCH   │
│ [icon]   │ [icon]    │  [icon]    │
└──────────┴───────────┴────────────┘
```

Each tile:
- Cream background, 1px border, multi-layer shadow
- Eyebrow label (uppercase, 10px, burgundy)
- Headline (16-20px, weight 600)
- 1-2 sentence description (serif)
- A custom mini visualization (SVG or styled HTML)

#### 3.2 Pull-quote moment (new section between §3 and §3.4)

A full-bleed pale-cream section with a single oversized typographic statement:

```tsx
<section style={{ background:'#F2ECE0', padding:'140px 0' }}>
  <div className="mx-auto max-w-[1080px] px-6">
    <p style={{
      fontFamily:'var(--font-serif, serif)',
      fontStyle:'italic',
      fontSize:'clamp(28px, 4.5vw, 56px)',
      lineHeight:1.2,
      color:'#1A1814',
      letterSpacing:'-0.01em',
      maxWidth:'880px',
    }}>
      "Your fraud rules see one customer. Our graph sees the
      <span style={{ color:'#7B2D26' }}> same person across seven </span>
      merchants — and the pattern only your network can resolve."
    </p>
    <p style={{ /* small attribution */ }}>
      — From the Unauth product brief
    </p>
  </div>
</section>
```

#### 3.3 Live metrics ticker (between Wave-1 hero and §1)

Full-width, full-bleed thin band of running synthetic metrics (clearly labeled "PILOT NETWORK"):

```
┌────────────────────────────────────────────────────────────┐
│ PILOT NETWORK · 2,485,210 ORDERS RESOLVED · 12 MERCHANTS · │
│ 48,392 CLUSTERS · LAST 24H: +12,847 ORDERS · LIVE ◉        │
└────────────────────────────────────────────────────────────┘
```

- Monospace, 13px, low contrast
- Numbers tick up slowly with `requestAnimationFrame`
- Marquee-scrolls horizontally on smaller screens

#### 3.4 Mega footer

Replace the current one-line footer with a 4-column mega footer:

```
[Brand mark]      Product           Resources         Company
                  · How it works    · Documentation   · About
The fraud         · Pricing         · API reference   · Press
intelligence      · Security        · Status          · Careers
network for       · Customers       · Blog            · Contact
ecommerce.                                            · Legal

────────────────────────────────────────────────────────────
© 2026 Unauth · privacy · DPA · data handling    [twitter] [linkedin]
```

---

### Wave 4 — Micro-interaction polish

These are small but they're what separates "good" from "Ramp."

#### 4.1 Card hover depth

Every card should respond to hover with a real motion event, not just CSS scale:
- Mouse-position-based light direction (CSS `radial-gradient` follows cursor via mouse events)
- Inner content shifts parallax (5-8px translate on inner elements)
- Box shadow grows AND tints slightly burgundy on hover

```tsx
// Pattern: track mouse and update CSS custom properties
const onMouseMove = (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  e.currentTarget.style.setProperty('--mx', `${x}%`);
  e.currentTarget.style.setProperty('--my', `${y}%`);
};
// CSS: background: radial-gradient(circle at var(--mx) var(--my), rgba(196,147,90,0.15), transparent 40%), ...
```

#### 4.2 Section-anchor smooth scroll

When clicking nav anchors, smooth scroll with offset for the sticky header.

#### 4.3 Marquee animation between sections

Short scrolling text band between major sections (e.g., between §2 and §3):

```
→ cross-merchant identity · cross-merchant identity · cross-merchant identity →
```

Slow continuous scroll, low contrast, monospace.

#### 4.4 Background paper grain

Site-wide SVG noise filter at very low opacity for paper-like texture:

```tsx
<svg style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:1, opacity:0.025 }}>
  <filter id="noise">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" />
  </filter>
  <rect width="100%" height="100%" filter="url(#noise)" />
</svg>
```

#### 4.5 Counter-up animations for §1 inline stats

Currently `$89 billion` and `1 in 5` appear in §1 paragraph as static text. Make them animated counter spans that count up when scrolled into view (already have `AnimatedCounter` — just inline them).

#### 4.6 Hand-drawn SVG underline on hero "never seen"

Imperfect, slightly wobbly SVG path that draws in with `stroke-dashoffset` animation after the hero mounts. Burgundy stroke, 3px, with subtle hand-drawn-feel jitter on the path.

---

### Wave 5 — Optional ambitions

Only if Waves 1-4 land cleanly and we want to push further.

#### 5.1 Pinned-scroll narrative section

A section that scrolls in place while content reveals — like Stripe/Ramp's "How it works" deep dives. Use Framer Motion's `useScroll` with `useTransform` to control multi-stage scenes:

1. As user scrolls into the pinned section:
   - Stage 1 (0-20%): "1. Buyer creates account at HeyGlow" — illustration appears
   - Stage 2 (20-40%): "2. Files INR claim at HeyGlow" — illustration updates
   - Stage 3 (40-60%): "3. Creates new email, orders at Murmur Audio" — second merchant lights up
   - Stage 4 (60-80%): "4. Same pattern across 5 more merchants" — graph expands
   - Stage 5 (80-100%): "5. Unauth resolves the cluster" — burgundy halo around cluster

Pinned for ~5x viewport scroll. Major engineering lift but massive payoff.

#### 5.2 Interactive risk-score slider

Demo widget where the user moves a slider 0-1 and sees recommended actions change (PASS → REVIEW → DECLINE → ASSEMBLE CE 3.0). Live and tangible.

#### 5.3 Sound design

Subtle 30Hz tactile clicks on CTA hovers (off by default, toggle in header).

---

## Files to create

- `app/(public)/landing/StickyHeader.tsx` — Wave 1.1
- `app/(public)/landing/PilotStrip.tsx` — Wave 1.5
- `app/(public)/landing/NetworkGraph.tsx` — Wave 1.6
- `app/(public)/landing/PipelineFlow.tsx` — Wave 2.1
- `app/(public)/landing/CodeTabs.tsx` — Wave 2.2
- `app/(public)/landing/BentoGrid.tsx` — Wave 3.1
- `app/(public)/landing/PullQuote.tsx` — Wave 3.2
- `app/(public)/landing/MetricsTicker.tsx` — Wave 3.3
- `app/(public)/landing/MegaFooter.tsx` — Wave 3.4

Additions to `LandingAnimations.tsx`:
- `ScrollProgress` (Wave 1.2)
- `Marquee` (Wave 4.3)
- `Underline` SVG component (Wave 4.6)
- `MouseLight` wrapper for card hover (Wave 4.1)
- `PaperGrain` overlay (Wave 4.4)

## Files to modify

- `app/(public)/landing/page.tsx`:
  - Replace `<header>` with `<StickyHeader />`
  - Add `<ScrollProgress />` and `<PaperGrain />` at top
  - Bump hero headline size + split layout
  - Add `<PilotStrip />` directly after hero
  - Add `<MetricsTicker />` after pilot strip
  - Add `<NetworkGraph />` inside §1 (alongside or instead of IdentityFeed)
  - Add `<BentoGrid />` after §1
  - Replace §3 right column with `<CodeTabs />`
  - Replace §3.4 vertical list with `<PipelineFlow />`
  - Add `<PullQuote />` between §3 and §3.4
  - Replace footer block with `<MegaFooter />`
  - Add `id="..."` anchors on each section

- `app/globals.css`:
  - Add `@keyframes marquee` (Wave 4.3)
  - Add `@keyframes pulse-ring` (Wave 1.4)
  - Add `@keyframes draw-line` (Wave 4.6)

## Estimated effort

| Wave | Story points | Visual impact |
|---|---|---|
| Wave 1 | 8 | 60% of gap closed |
| Wave 2 | 6 | 75% closed |
| Wave 3 | 8 | 88% closed |
| Wave 4 | 5 | 95% closed |
| Wave 5 | 13 | 99%+ |

## Recommended starting point

Ship Wave 1 in a single push (sticky header, scroll progress, hero typography, pilot strip, network graph, animated hero artifact). That alone will close most of the perception gap. Then assess before committing to Waves 2-3.

## What we explicitly should NOT do

- Add fake customer testimonials (we removed these earlier — keep them gone)
- Add fake company logos in the trust strip (industry-category labels are honest and on-brand)
- Add fake metric counters that imply specific volumes we haven't done
- Introduce a new accent color outside burgundy/cream/warm-amber palette
- Add cursor-trail or other gimmicky effects that distract from content
- Use stock illustration / icon libraries that betray the editorial brand (must be custom SVG)
