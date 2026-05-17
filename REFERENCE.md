# REFERENCE.md — Unauth Landing Page Rebuild

**Master prompt for landing page rebuilds. Read this entire document before writing code.**

---

## WHAT YOU ARE BUILDING

A landing page for Unauth — a cross-merchant fraud intelligence platform that resolves buyer identities across ecommerce stores. It detects friendly fraud, refund abuse, and INR claims by linking the same person across multiple merchants, even when they rotate email, card, or address. It generates Visa CE 3.0 evidence packets for chargeback disputes.

The audience is fraud ops analysts, risk leads, and CFOs at growth-stage DTC ecommerce brands.

The conversion target is: "Run a CSV pilot" → /login.
No other conversion matters.

---

## THE QUALITY BAR. READ THIS CAREFULLY.

The page must be indistinguishable in quality from:
- stripe.com
- ramp.com

Not "inspired by." Not "similar to." Indistinguishable in craft, restraint, and product credibility.

This is not aspirational language. It is the literal pass/fail criterion. If a senior designer at Stripe or Ramp looked at this page, they should not be able to identify it as AI-generated.

You will use Playwright to screenshot every section at:
- 1440×900
- 1280×800
- 390×844

You will run a minimum of 4 full visual review passes before declaring done. Each pass has specific criteria defined below. You do not stop iterating until every pass criterion is met.

---

## THE PREVIOUS OUTPUT WAS REJECTED. HERE IS THE EXACT DIAGNOSIS.

The previous implementation produced AI slop. Study this diagnosis so you understand exactly what went wrong and do not repeat it.

**FAILURE 1 — THE HUB-AND-SPOKE DIAGRAM**

The graph section rendered a central dark pill labelled "Unauth Fraud Graph" with dashed arrows fanning left (CSV inputs) and right (outputs). This is the single most overused diagram in enterprise SaaS marketing. It appears on thousands of landing pages. It communicates nothing specific about Unauth. A fraud analyst looking at it would learn nothing. It is a visual placeholder pretending to be a product explanation. It was rejected immediately.

Do not build a hub-and-spoke input → engine → output diagram. Under any circumstances. Even if it looks clean. Even if the nodes are labelled correctly. The pattern itself is the problem.

**FAILURE 2 — THE DECORATIVE GRAPH**

The identity graph section rendered circle nodes labelled M·A, M·B, @a, @b with dashed connecting lines. This looks like a network diagram from a 2021 blockchain whitepaper. It communicates the concept of "connected things" but looks nothing like actual fraud investigation software. A fraud analyst does not use diagrams that look like this.

**FAILURE 3 — THE LOGO WAS WRONG**

The nav rendered "UI UNAUTH" in all-caps sans-serif. This is completely wrong. The canonical mark is "Unauth." — the word "Unauth" set in Source Serif 4 weight 600, followed by a terminal dot rendered as a positioned circle span. Crimson (#8A2828) on light, cream (#F4F0E8) on dark. This must be correct before anything else is reviewed.

**FAILURE 4 — GENERIC CARD PATTERNS**

The product surface cards used the standard "icon top-left, title, body paragraph, mini-widget" bento pattern. This pattern is on every SaaS template site. The cards did not feel like product modules. They felt like marketing cards pretending to be product modules.

**FAILURE 5 — TEMPLATE SPACING AND HIERARCHY**

The page had the visual rhythm of a Framer or Webflow template. Oversized headlines, generous whitespace, then a card grid. This is the default structure every AI model produces when asked to "make a SaaS landing page." It needs to be unlearned entirely.

---

## AI SLOP REFERENCE — WHAT NOT TO BUILD

The following patterns indicate AI-generated design and will result in immediate rejection. Memorise them.

**PATTERN 1 — The Hub-and-spoke pipeline**
- Left column: labelled input nodes with icons.
- Centre: dark box with product name.
- Right column: output nodes.
- Connecting dashed arrows.
- → BANNED. Always generic. Never specific.

**PATTERN 2 — The bento card grid**
- 2×2 or 3×2 grid of identical cards.
- Each card: small icon, bold title, two-line description, mini widget at bottom.
- Rounded corners, subtle shadow, all same height.
- → BANNED unless card content is so specific and data-rich that the pattern disappears behind the content.

**PATTERN 3 — The floating dashboard mockup**
- A browser chrome frame containing a fake dashboard.
- KPI cards in a row. A chart below. A table below that.
- Rotated slightly. Soft drop shadow.
- → BANNED. It looks like a Dribbble shot, not a product.

**PATTERN 4 — The glowing feature section**
- Dark background. Centred headline. Below it, cards or feature rows. Each feature has a gradient icon or glow.
- → BANNED. This is the default dark-section treatment every AI model uses.

**PATTERN 5 — The abstract network graph**
- Circles connected by lines. Node labels are letters or short codes. Edges are dashed. One node is bigger or darker than the others to indicate "selected."
- → BANNED as a decorative element. Only permitted if it looks like actual investigation software with real data fields, signal labels, and operational context.

**PATTERN 6 — The default Recharts chart**
- A bar chart with default blue bars. Or a line chart with the default Recharts stroke colour. No custom styling.
- → BANNED. Every chart must be visually customised to match the Unauth design system.

**PATTERN 7 — The stat trio**
- Three large numbers in a row. "$89B+" / "1 in 5" / "2.7×".
- Each with a label below and an icon or coloured bar above.
- → Permitted only if the surrounding page treatment is strong enough to carry it. On its own it is generic.

**PATTERN 8 — The trust badge row**
- "SOC 2 in progress" · "HMAC-SHA256" · "CE 3.0 ready" displayed as pills or icon-badge pairs in a horizontal row.
- → Permitted as a secondary element only. Not as a hero trust section.

**PATTERN 9 — Aceternity / Magic UI defaults**
- Beam animations, spotlight effects, dot-grid backgrounds, glowing orbs, animated gradient borders, particle effects.
- → BANNED entirely. None of these.

**PATTERN 10 — Generic product headline structure**
- "The [noun] for [audience]."
- "[Verb] [noun] in [time]."
- "Everything your [team] needs."
- → These headlines signal AI generation immediately. Write copy that is specific to Unauth's actual mechanism.

---

## WHAT STRIPE AND RAMP ACTUALLY DO

Study these principles. They are not aesthetic preferences. They are structural decisions that make pages feel real.

**STRIPE:**
- Product visuals show actual UI that developers recognise as real. The code blocks look like code a developer would write. The API responses contain real field names.
- The atmosphere is created through colour discipline, not decoration. The purple gradient is used once, in the hero, in exactly the right amount.
- Typography does most of the design work. The hierarchy is clear without needing visual ornament.
- Every section has a specific job and stops when that job is done. No padding sections.

**RAMP:**
- Product mockups look like the actual Ramp dashboard. An existing Ramp customer would recognise the UI.
- Cards have density. They contain real field names, real workflow states, real data patterns.
- Spacing is calm but not empty. The grid is tight.
- The page does not try to explain the whole product. It shows you enough to understand the value, then asks you to sign up.
- Motion is used once or twice, barely, to draw attention to the right thing.

**UNAUTH SHOULD DO:**
- Product visuals that a fraud ops analyst would recognise as a real investigation tool.
- Data fields that match real ecommerce exports (order_id, email_hash, refund_reason, carrier, tracking_number, chargeback_status).
- Risk signals with real names: refund_rate_over_60pct, cross_merchant_inr_pattern, denial_then_chargeback, shipping_address_variant, claim_velocity_7d.
- Cluster IDs that look like real identifiers: cluster_u_7f31a, not "Cluster #001".
- Evidence packet fields that match CE 3.0 requirements.
- Copy that names the actual mechanism: identity resolution, signal clustering, hash-based matching, confidence grading.

---

## DESIGN SYSTEM — NON-NEGOTIABLE

Read `app/globals.css` before touching anything. These tokens are the design system. Use them.

**CANVAS:** `--bg-canvas` `#FAF6EF` (warm cream)
This is not negotiable. Do not change it to white, off-white, or any other value. The warm cream is a deliberate brand decision that differentiates Unauth from every dark-navy fraud tool. Keep it.

**FONTS:**
- Body / UI: DM Sans (already loaded)
- Data / IDs / scores / hashes: DM Mono (already loaded)
- Logo: Source Serif 4 weight 600 (must be loaded)
- Every number, ID, score, hash, percentage, date, signal name → DM Mono, `font-variant-numeric: tabular-nums`.
- No exceptions.

**ACCENT:** `--accent-500` `#2563EB`
Used for interactive elements only. CTAs, links, active states. Not for decorative colour.

**RISK PALETTE** (only inside data/product surfaces):
- Critical: `#8A2828` on `#F7EAEA`
- High: `#7C3C0A` on `#FEF2E2`
- Medium: `#8B6A14` on `#F7F0DA`
- Low: `#2F6B43` on `#E8F1E6`

Never use risk colours for decorative purposes.

**LOGO — THE CANONICAL MARK:**

"Unauth." — Source Serif 4 weight 600.
Terminal dot is a positioned `<span>` with `border-radius: 50%`.
- dot: `#8A2828` on light backgrounds.
- dot: `#F4F0E8` on dark backgrounds.

The slash variant "Unauth/" was a placeholder. It is dead. Do not use it. Do not reference it.

**Logo sizes:**
- Nav size (22px type): dot 2.5px diameter, 0.18em gap.
- Footer size (15px): dot 2px, 0.15em gap.
- Display size (48px+): dot 5.5px, 0.12em gap.

**Component:** `components/ui/UnauthLogo.tsx`
Props: `variant` ('light'|'dark'|'mono'), `size` ('nav'|'footer'|'display')

**TOKEN CHANGE REQUIRED:**
- `--risk-critical-fg`: change from `#9F1D1D` to `#8A2828`
- Verify `--risk-critical-bg` `#FBEFEC` still passes WCAG AA.
- If not, adjust background to `#F7EAEA`.

---

## LIBRARIES

First: read `package.json`. Know what is already installed.

You have permission to use any of the following if they improve quality. Do not use them if they produce default styling that looks generic.

**PERMITTED:**
- **Recharts:** for charts. You must override every default colour, stroke, and label. A Recharts chart with default blue bars is worse than no chart.
- **Lucide React:** for icons. Use sparingly.
- **shadcn/ui:** for primitives (Table, Badge, etc). You must restyle every component so it matches the Unauth design system. Do not use shadcn defaults.
- **Framer Motion:** only for transitions so subtle that removing them would not be noticed. If the animation draws attention to itself, remove it.
- **React Flow / XYFlow:** ONLY if you are building a graph that looks like actual investigation software. Not for a decorative network illustration.

**BANNED:**
- Aceternity UI: any component from this library.
- Magic UI: any component from this library.
- Any pre-built "landing page" component library.
- Any gradient or glow effect from a component library.
- Three.js, WebGL, canvas animations.
- Any library that requires configuration to look generic before it can look good.

If you are unsure whether something looks AI-generated, it does. Remove it.

---

## SYNTHETIC DATA — USE THESE EXACT VALUES

Every visible data field in every mockup uses this data. Do not invent variants. Do not round numbers. Do not use placeholder values. Use exactly these strings.

**IDENTITY CLUSTER:**
```
cluster_id: cluster_u_7f31a
risk_score: 0.92
confidence: 0.86
merchants_seen: 7
signals_fired: 14
evidence_eligible: true
```

**SIGNALS:**
```
refund_rate_over_60pct          HIGH
cross_merchant_inr_pattern      HIGH
denial_then_chargeback          HIGH
shipping_address_variant        MED
claim_velocity_7d               MED
card_bin_reuse                  LOW
```

**ORDERS (in this cluster):**
```
ORD-7F31A  a***@gm…  24 Mason St          $239.00  0.92
ORD-7E2C9  a***@yh…  24 Mason Street      $184.50  0.88
ORD-7D11B  al***@…   24 Maison St         $312.00  0.81
ORD-7C04A  a***@gm…  24 Mason St, Apt 2   $76.40   0.62
```

**CSV AUDIT:**
```
filename: ORDERS_Q1.CSV
rows: 48,219
columns_mapped: 31
status: LINKING
clusters_found: 284
high_risk: 47
```

**EVIDENCE PACKET:**
```
packet_id: e_7f31a_01
ce_version: 2025-08
evidence_items: 14
pii_masked: true
size: 184 KB
status: DISPUTE_READY
```

**API:**
```
endpoint: POST https://api.unauth.app/v1/score
order_id: ORD-7F31A
merchant_id: mrc_murmuraudio
latency: 38ms
```

**MERCHANTS IN NETWORK:**
```
HeyGlow Skincare     $340    3 orders    2 refunds
Murmur Audio         $1,210  3 orders    2 INR
RidgePath Outdoor    $612    2 orders    2 INR
Aster & Vale         $284    1 order     1 refund
Northbound Goods     $890    2 orders    1 INR
[2 more withheld]
```

---

## PAGE SECTIONS

You have creative authority over execution. You do not have authority over the strategic direction.

The sections are:
1. Nav
2. Hero
3. Product surfaces (3–4 panels)
4. How it works (pipeline)
5. Security / privacy
6. Comparison table
7. CTA section
8. Footer

For each section, ask before building:
"If a fraud ops analyst at a Series B DTC brand saw this section, would they recognise it as a real tool they could use? Or would they see a marketing mockup?"

If the answer is the second: rebuild.

---

## PLAYWRIGHT REVIEW PROCESS — MANDATORY

You must run Playwright after every meaningful change. You do not trust your code. You look at screenshots.

Screenshot every section independently:
- `#hero` at 1440×900
- `#product` at 1440×900
- `#how-it-works` at 1440×900
- `#security` at 1440×900
- full page at 1280×800
- full page at 390×844 (mobile)

Run exactly 4 review passes. You cannot skip passes. You cannot merge passes.

### PASS 1 — THE LOGO PASS

Before reviewing anything else:
Is the nav logo "Unauth." in Source Serif 4 with a crimson terminal dot?

If no: stop. Fix the logo. Run Playwright again.
Do not proceed to Pass 2 until this is correct.

### PASS 2 — THE SLOP ELIMINATION PASS

Look at every section screenshot. For each section ask:
Does this contain any of the 10 banned AI slop patterns defined above?

Checklist:
- [ ] No hub-and-spoke diagram
- [ ] No bento card grid with generic content
- [ ] No floating browser mockup with fake dashboard
- [ ] No glowing feature section on dark background
- [ ] No abstract network graph with letter-labelled nodes
- [ ] No default-styled Recharts chart
- [ ] No stat trio without strong surrounding context
- [ ] No Aceternity/Magic UI effects
- [ ] No generic headline structures
- [ ] No "Everything your team needs" type copy

If any box is unchecked: rebuild that section.
Do not proceed to Pass 3 until all boxes are checked.

### PASS 3 — THE PRODUCT REALISM PASS

Look at every product surface. For each one ask:

1. Does every visible data field use real ecommerce field names? (order_id, email_hash, refund_reason, carrier, chargeback_status — not "Field 1", "Value")

2. Does every risk signal use the exact signal names from the synthetic data section above?

3. Does the layout reflect a real workflow? Could a fraud analyst explain what they would do next after looking at this screen?

4. Is the data density appropriate? Real investigation tools are dense. Marketing mockups are sparse.

5. Are all numbers in DM Mono with tabular-nums?

If any answer is no: rebuild that surface.
Do not proceed to Pass 4 until all answers are yes.

### PASS 4 — THE STRIPE/RAMP COMPARISON PASS

This is the hardest pass. It requires honest judgment.

Open stripe.com and ramp.com in separate tabs.
Take a screenshot of their hero sections.
Take a screenshot of your hero section.
Look at all three side by side.

Ask:
1. Is the typographic hierarchy equally strong?
2. Is the spacing equally intentional?
3. Are the product visuals equally credible?
4. Is the colour discipline equally controlled?
5. Would a designer who worked on Stripe or Ramp think this page was designed by a serious team?

If any answer is no: identify specifically what is weaker and fix it. Screenshot again. Re-evaluate.

You do not pass Pass 4 by saying "yes" to all questions. You pass Pass 4 only when you can look at the screenshots and genuinely believe a reasonable person could not identify which one was AI-generated.

If you cannot reach this standard after 3 revision cycles on a section: acknowledge it explicitly in your report and describe exactly what is preventing it.

---

## BUILD VERIFICATION

`npm run build` — zero errors, zero type warnings.

Also verify:
- [ ] Logo is Source Serif 4 with terminal dot in all contexts
- [ ] `--risk-critical-fg` is `#8A2828` in computed styles
- [ ] No horizontal scroll at 390px
- [ ] All sample data labelled "synthetic · sample"
- [ ] No claims: "SOC 2 certified", "ISO 27001 certified"
- [ ] Permitted: "SOC 2 in progress", "designed for GDPR"
- [ ] No "AI-powered" anywhere in rendered HTML
- [ ] No "unlock", "empower", "revolutionize", "supercharge"
- [ ] No fake customer quotes with invented names
- [ ] No fabricated live merchant counts
- [ ] All CTAs go to /login

---

## FINAL REPORT REQUIRED

When done, report:

1. Which sections were rebuilt vs preserved from previous.
2. Which libraries were used and why.
3. Pass-by-pass Playwright review summary. For each pass: what failed first, what was changed, final state.
4. Honest assessment of Pass 4 result. Do not claim Stripe/Ramp parity if you did not achieve it. Describe any remaining gaps specifically.
5. Build status.
6. Remaining risks.

Do not say "the page looks premium."
Do not say "the design feels professional."
Do not say "it achieves Stripe-level quality."

These are claims that require screenshot evidence and a specific comparison. If you make these claims, include the Playwright screenshot filenames that support them.

If the page still looks like an AI-generated SaaS template after 4 passes, say so and describe exactly why. That honest answer is more useful than a false claim of success.

---

## REFERENCE SCREENSHOTS

**Location:** `screenshots/` folder (30 reference images)

These screenshots are available for Pass 4 comparison (Stripe/Ramp parity calibration) and section-by-section quality benchmarking. They capture reference implementations and design standards to maintain during rebuild.

**Available:** 30 timestamped PNG files taken May 16, 2026 from 02:17–02:38.
Use these for visual calibration during iterative passes.

---

**Ready for reference screenshots and rebuild initiation.**
