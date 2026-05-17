# IDE prompt: Unauth landing page premium enhancement pass

You are working on the Unauth landing page. The goal is not a redesign from scratch. Keep the current core direction: editorial fraud-intelligence brief, cream paper surface, rust/black accents, dense case-file artifact, cross-merchant identity story, and serious compliance tone. The task is to raise the execution quality until it can sit near Ramp and Stripe in perceived polish, clarity, trust, and product conviction, within the realistic limits of an AI-built early-stage product.

## Source of truth

Use the most recent landing-page version in git, not stale local files.

- Latest landing branch inspected: `origin/claude/distracted-kepler-52f46f`
- Commit inspected: `b8a8927 Add premium viewport-triggered animations in Ramp/Stripe style`
- Local worktree observed at: `/Users/malikibrahim/Downloads/EXPO - Car App/Unauth/distracted-kepler-52f46f`
- Route: `http://localhost:3000/landing`
- Main branch at inspection time was `96acb00` and did not include this latest landing pass.

If your IDE is opened in `/Users/malikibrahim/Downloads/Unauth`, be careful: that worktree has untracked landing files and is on `main`. Do not accidentally enhance the wrong version. Either switch to the `claude/distracted-kepler-52f46f` worktree or port the latest branch into your working branch intentionally.

## What was inspected

I used Playwright against `http://localhost:3000/landing` from the `b8a8927` worktree.

Observed viewports:

- Desktop: `1440x900`
- Tablet: `820x1180`
- Mobile: `390x844`
- No-JS desktop
- Immediate screenshot after page load
- Scrolled section-by-section screenshots

Metrics observed:

- Desktop full document height: about `9013px`
- Mobile full document height: about `16269px`
- Console errors/warnings in the in-app browser: `0`
- Desktop overflow: `0`
- Tablet overflow: `2` elements, both footnote/superscript related
- Mobile overflow: `5` elements, including comparison-table content and a footnote
- No-JS desktop above-the-fold content is hidden because `.ua-reveal` stays `opacity: 0`

The page has strong bones. It has a real point of view, a memorable product artifact, and unusually specific fraud language. The gap is execution discipline: too much content, too much hidden-by-animation behavior, not enough product proof above the fold, weak mobile adaptation for dense artifacts, and CTAs that still feel like app-login placeholders rather than a premium acquisition funnel.

## Current benchmark read

Use Ramp and Stripe as quality references, not visual skins to copy.

Stripe's current homepage leads with a direct category promise, visible product/business proof, global scale metrics, customer stories, developer infrastructure, and repeated CTAs. Ramp's current homepage leads with a plain ROI promise, email capture, customer/market proof, and product automation narrative. Unauth should not mimic either palette. It should borrow their discipline:

- One unmistakable first-screen promise.
- Product surface visible immediately.
- Proof and credibility close to the claim.
- Clear CTA mechanics.
- Dense sections broken into scannable product modules.
- Motion that supports comprehension and never hides essential content.
- Mobile that feels intentionally composed, not desktop squeezed down.

## Harsh critique of the current page

### 1. The hero is strong but not yet premium enough

What works:

- "Resolve the buyer your store has never seen" is a good conceptual hook.
- The case-file artifact is much better than a generic dashboard mockup.
- The editorial "fraud intelligence brief" mood is distinctive and could be ownable.

What fails:

- The first fold reads more like a beautifully designed article than a conversion-grade SaaS landing page.
- "Issue 04", "12 min read", and "filed under identity resolution" are flavorful, but they make the page feel like content marketing before it feels like software.
- The product artifact is excellent on desktop, but on mobile the first viewport contains only copy and industry labels; the product proof is pushed below the fold.
- The primary CTA sends users to `/login`, which feels wrong for a pilot request. Ramp has an input/funnel right there; Stripe has direct account/contact options. Unauth currently says "request pilot" but behaves like "sign in".

### 2. The reveal animation system is a critical production risk

Observed issue:

- No-JS desktop renders only the sticky header and blank cream space. The hero copy and product artifact exist in the DOM but are hidden by `.ua-reveal { opacity: 0; }`.
- Immediate CLI screenshots can also catch a blank first viewport before reveal state is applied.

Why this matters:

- It hurts perceived load.
- It creates bad social-card/screenshot/preview behavior.
- It creates a poor no-JS fallback.
- It risks SEO/crawler and accessibility weirdness.
- It is the opposite of Stripe/Ramp discipline: those sites can be cinematic, but the content does not vanish if the motion layer misses.

Required fix:

- Essential content must be visible by default.
- Motion must enhance visible content, not gate it.
- Above-the-fold hero text and product artifact must never start at `opacity: 0`.
- Reduced-motion and no-JS modes must show final content.

### 3. The page is too long and repetitive

The current desktop page is around 9000px tall and mobile is over 16000px. That is too long for the current story. The page repeats the same pattern:

- Eyebrow
- Large H2
- Serif paragraph
- Dense artifact/table
- Footnote

This makes the design feel editorially consistent, but also monotonous. Ramp and Stripe vary section shapes aggressively: product tiles, proof bands, customer proof, calculators, customer story modules, developer panes, comparison areas, CTA bands.

Required fix:

- Keep the editorial system, but introduce stronger section variety.
- Merge or tighten sections where the page makes the same point twice.
- Move from "article scroll" to "product proof narrative".

### 4. Mobile is not yet acceptable for a premium landing page

Observed issues:

- The product case file is clipped/truncated on mobile. Merchant names and dense rows are cut off.
- The comparison table overflows and the "Unauth" column is partially off-screen.
- Some anchor scroll positions place headings under the sticky header.
- Dense tables remain tables on mobile when they should become cards.
- Footnote superscripts can escape the viewport.

Required fix:

- Every dense artifact needs a mobile-specific presentation.
- Tables become stacked comparison cards.
- Product case files become either horizontal scroll areas with visible affordance or carefully reflowed cards.
- Add `scroll-margin-top` to anchored sections.
- Run Playwright mobile screenshots and assert no horizontal overflow.

### 5. The proof system is not credible enough yet

The page uses many numbers and invented case details, but it also has many disclaimers saying the data is synthetic. Transparency is good, but too many synthetic-looking claims can lower trust.

Current examples:

- "1 of 312 resolved this week"
- "11,408 identity clusters resolved"
- "What two pilot merchants saw in 90 days"
- Named quotes and merchant-style stories, then footnotes saying names/metrics are synthetic

Required fix:

- Do not fabricate logos, customer names, or named testimonials.
- If metrics are synthetic or illustrative, label them as sample output, not as social proof.
- Separate "sample engine output" from "real company proof".
- If real proof is not available, use product proof instead: sample data schema, real security controls, real workflow timing, sample evidence PDF, demo CSV path, and precise merchant use cases.

### 6. The visual system is distinctive but too one-note

The cream/rust/black editorial palette is memorable, but long stretches of beige paper plus burgundy labels become flat. The dark sections help, but they are huge blocks and sometimes feel heavy rather than surgical.

Required fix:

- Keep cream/rust/black as the brand base.
- Add a restrained secondary accent for product state only: blue for secure/system, green for verified/live, amber for review, red/rust for risk.
- Use depth, layers, and product chrome more than decoration.
- Avoid gradient blobs, generic bokeh, or AI-looking decorative shapes.
- Make data visualizations feel like operating software, not placeholder charts.

### 7. The product artifact is the best asset, but it needs to become a product system

The case-file artifact is strong because it shows:

- Identity resolution
- Signals fired
- Merchant footprint
- Recommended action
- Evidence packet

But it is currently too static and too print-like. The page should make this artifact feel like the actual Unauth product surface.

Required fix:

- Turn the artifact into reusable landing components:
  - `HeroCaseFile`
  - `IdentityLedger`
  - `SignalStack`
  - `EvidencePacketPreview`
  - `RiskDecisionPanel`
  - `NetworkFootprint`
- Add subtle interaction:
  - Tabs for Identity / Signals / Evidence / Action
  - Hover/focus states on signal rows
  - "Assemble CE 3.0 packet" action state
  - A visible sample PDF/download preview
- Keep it tasteful. No fake real-time overload.

## Implementation brief

### Primary objective

Enhance the existing landing page so that a first-time ecommerce fraud/risk operator understands, within 10 seconds:

1. Unauth resolves repeat refund/INR abusers across merchants.
2. It works from standard order/refund/return data without checkout integration.
3. Raw PII is hashed before transmission.
4. It returns explainable evidence packets for chargeback/dispute workflows.
5. The user can request a pilot or upload a CSV sample without confusion.

### Preserve these core design choices

- Cream paper background.
- Editorial fraud brief vibe.
- Rust/burgundy risk accent.
- Black/dark inversion sections.
- Dense case-file artifact.
- Monospace labels for system detail.
- Serif italics as a small editorial accent.
- Square/low-radius geometry.
- Cross-merchant identity narrative.

### Do not do these things

- Do not turn this into a generic blue/purple SaaS page.
- Do not add decorative gradient blobs or floating orb backgrounds.
- Do not invent real customer logos or named testimonials.
- Do not make the hero a marketing-only hero with no product surface.
- Do not hide essential content behind JS animation.
- Do not add giant cards inside cards.
- Do not use mobile horizontal overflow as a lazy fix unless it is clearly signposted and genuinely usable.
- Do not let every section use the same H2 + paragraph + table rhythm.

## Specific build tasks

### Task 1: Fix reveal/progressive enhancement

Files likely involved:

- `app/(public)/landing/_components/Reveal.tsx`
- `app/globals.css`
- Possibly `app/layout.tsx` or `app/(public)/layout.tsx`

Requirements:

- No-JS must display all content.
- Reduced-motion must display all content.
- Hero copy and hero product artifact must be visible immediately.
- Reveal animations may animate transform/opacity only after the element is already safely visible, or only for non-critical below-fold elements.
- Do not globally set `.ua-reveal { opacity: 0; }` without a no-JS fallback.

Suggested approach:

- Add an `initialVisible` or `critical` prop to `Reveal`.
- Use `initialVisible` for hero left and hero artifact.
- For below-fold sections, prefer `opacity: 1` default plus subtle transform animation when `.is-visible` is added.
- Add a CSS fallback such as:

```css
.ua-reveal {
  opacity: 1;
  transform: none;
}

.ua-motion-ready .ua-reveal:not(.is-visible) {
  opacity: 0;
  transform: translate3d(0, 14px, 0);
}

@media (prefers-reduced-motion: reduce) {
  .ua-reveal {
    opacity: 1 !important;
    transform: none !important;
    animation: none !important;
  }
}
```

Only add `.ua-motion-ready` after the client has loaded and only for elements where hiding before reveal is acceptable. Better: do not hide text-heavy content at all; animate child accents instead.

Acceptance checks:

- `javaScriptEnabled: false` screenshot at desktop shows the H1 and artifact.
- Immediate screenshot at desktop shows the H1 and at least the top of the artifact.
- Mobile first viewport shows H1 and a visible product signal, not just text.

### Task 2: Tighten the hero into a premium conversion surface

Files likely involved:

- `app/(public)/landing/page.tsx`
- New optional components in `app/(public)/landing/_components`

Hero direction:

- Keep the headline concept, but make it shorter and more decisive.
- Suggested H1 options:
  - "Resolve the repeat buyer your store has never seen."
  - "Catch refund abusers before the dispute window closes."
  - "Find the buyer repeating across stores."
- Keep "never seen" as the italic/rust emotional hook if desired, but reduce italic use elsewhere.
- Replace "Fraud Intelligence Brief - Issue 04" as the dominant eyebrow with a product-category eyebrow:
  - "Cross-merchant fraud graph for ecommerce"
  - "Refund abuse, INR claims, and chargeback evidence"
- Move the "Issue 04" motif lower or into a small metadata chip. It should support the editorial voice, not lead the product.

CTA requirements:

- Primary: "Request a pilot"
- Secondary: "View sample evidence packet"
- Optional tertiary text link: "See data requirements"
- Do not point "Request pilot" to `/login` unless that route is truly the acquisition flow.
- If there is no pilot route, create or point to a simple mailto/contact/demo route:
  - `/demo`
  - `mailto:hello@unauth.app?subject=Unauth%20pilot`
  - or a lightweight `/landing#pilot` form area

Hero layout:

- Desktop: H1 and copy left, product artifact right, both visible above fold at 1440x900.
- Mobile: H1, CTA row, and a condensed product proof module visible before or near the first fold.
- Avoid pushing the mobile product artifact 700px down before it appears.

Suggested above-fold proof chips:

- "CSV pilot in about 10 minutes"
- "Client-side HMAC hashing"
- "CE 3.0 packet output"
- "No checkout integration"

### Task 3: Make the product artifact responsive and more product-like

Files likely involved:

- `app/(public)/landing/page.tsx`
- New `HeroCaseFile.tsx`
- New `SignalStack.tsx`
- New `NetworkFootprint.tsx`
- New `EvidencePacketPreview.tsx`

Desktop artifact:

- Keep the existing case-file structure but improve hierarchy:
  - Top bar: status, sample label, risk/confidence badges
  - Left: resolved identity summary
  - Right: signals with bars
  - Bottom: network footprint rows and action strip
- Add a front-layer action panel or side rail:
  - "Recommended action"
  - "Assemble CE 3.0 packet"
  - "2 open disputes"
  - "Evidence ready"
- Add a subtle "sample data" tag to avoid overclaiming.

Mobile artifact:

- Do not cram the whole desktop table into 342px.
- Convert to stacked cards:
  - Identity
  - Signals
  - Network footprint
  - Action
- Truncate merchant names deliberately with accessible full text, not accidental clipping.
- Keep numeric columns aligned with tabular numerals.
- Ensure no content escapes the viewport.

Acceptance checks:

- Mobile artifact screenshot has no clipped columns.
- Merchant rows remain readable at `390px`.
- The "Risk 0.92 / Definite" signal is visible without horizontal scrolling.

### Task 4: Restructure the page narrative

Target page architecture:

1. Sticky header
2. Hero with product artifact and proof chips
3. Small trust/fit strip: merchant categories, no fake logos
4. Problem section: "One buyer. Seven stores. Zero shared signal."
5. Product demo section: cross-merchant graph + identity ledger
6. How it works: 4 steps, compact and visual
7. Evidence output: sample CE 3.0 packet with tabs
8. Data/security: inputs required + hashing/security controls
9. Comparison: why Unauth differs from blocklists and checkout scoring
10. Pilot CTA: upload CSV or request pilot
11. Notes/legal footer

Reduce repetition:

- Merge the current "Network" and "Problem" content if they are making the same point.
- Merge "Data schema" and "Security" into a tighter "Data handling" sequence unless the security module gets stronger.
- Keep pilot outcomes only if framed as sample or internal pilot evidence without fake testimonials.

### Task 5: Add section variety without losing the editorial system

Use a mix of:

- Full-width paper sections
- Dark product lab sections
- Product artifact modules
- Narrow text notes
- Comparison matrix
- Proof/stat strips
- CTA band

Avoid:

- Every section as a large H2 followed by a big table.
- Huge empty beige blocks.
- Oversized dark sections with sparse content.

Specific visual adjustments:

- Reduce section vertical padding where the content is compact.
- Increase contrast in dark sections for captions and axes.
- Use one display moment per section, not three competing typographic gestures.
- Use serif italics sparingly: one phrase in H1/H2, not every section.

### Task 6: Improve the network/product visualization

Current chart is useful but not memorable enough by itself.

Add or improve:

- A cross-merchant identity graph: center buyer cluster connected to merchant nodes.
- Edge labels such as "same card BIN", "address variant", "refund pattern".
- A side ledger showing seven observed identities resolving into one cluster.
- Keep animation subtle: edges draw once, then settle.
- Provide static fallback for reduced-motion/no-JS.

Use existing dependencies where reasonable:

- `recharts` is already in the project.
- `lucide-react` is already available.
- For simple graph lines, inline SVG is fine.

Do not introduce a heavy graph library unless the result materially improves maintainability.

### Task 7: Fix mobile comparison and tables

Observed problem:

- The comparison table overflows on mobile and the Unauth column is clipped.

Required mobile behavior:

- Convert comparison table to stacked feature rows:
  - Feature name
  - Blocklists status
  - Checkout scoring status
  - Unauth status
- Use icons/dots with labels, not tiny unlabeled dots alone.
- Keep "Unauth" visually highlighted, but do not put it off-screen.

For evidence and ledger tables:

- Use card rows on mobile.
- Use `display: grid` with named columns on desktop.
- For mobile, use label/value pairs.

Acceptance checks:

- `document.documentElement.scrollWidth === window.innerWidth` at `390x844`.
- No element right edge exceeds viewport by more than 1px.

### Task 8: Strengthen trust without overclaiming

Do:

- Keep clear notes for synthetic examples.
- Say "sample output" where the artifact is illustrative.
- State real security posture plainly:
  - Client-side HMAC hashing
  - Per-tenant salt
  - Raw PII not transmitted
  - K-anonymity threshold
  - Audit logging
  - DPA available
  - SOC 2/ISO not yet held if still true
- Add "what we need" and "what we never need" lists.

Do not:

- Invent named customers.
- Use fake quotes that read like real testimonials.
- Present synthetic outcomes as achieved customer outcomes.

Replace named synthetic quotes with:

- "Sample pilot outcome"
- "Illustrative merchant profile"
- "Modeled from pilot workflow"

Or remove quotes entirely and use product evidence.

### Task 9: CTA and conversion path

The page needs a real next step.

CTA module requirements:

- Primary action: "Request a pilot"
- Secondary action: "View sample evidence packet"
- Optional form field: work email
- Assurance copy:
  - "No card required"
  - "CSV sample accepted"
  - "Raw PII is hashed before upload"
  - "Response inside two business hours"

Do not send all CTAs to `/login` unless login is truly the pilot request flow. If login remains necessary, change button copy to be honest: "Sign in to upload CSV". Otherwise use `/demo`, mailto, or a new pilot route.

### Task 10: Accessibility and interaction quality

Required:

- Add `scroll-margin-top` to all anchor targets.
- All CTAs must have visible focus states.
- Icon-only or symbol-heavy controls must have accessible labels.
- Reduced-motion mode must remove nonessential animation and show final content.
- Use semantic headings in order.
- Avoid tiny low-contrast monospace text for critical content.
- Ensure dark-section captions meet contrast guidelines or are nonessential.

### Task 11: Technical cleanup

The current landing page is a huge single file. Refactor carefully into components, but do not over-abstract.

Suggested component split:

- `LandingHeader.tsx`
- `HeroCaseFile.tsx`
- `ProofChips.tsx`
- `IdentityLedger.tsx`
- `NetworkGraph.tsx`
- `PipelineSteps.tsx`
- `EvidencePacket.tsx`
- `DataHandlingPanel.tsx`
- `ComparisonMatrix.tsx`
- `PilotCTA.tsx`
- `LandingFooter.tsx`

Keep style tokens near the landing components or in `globals.css` only if they are truly global. Do not pollute app-wide tokens unnecessarily.

### Task 12: Verification workflow

After implementation, run the app and verify with Playwright.

Required screenshots:

- Desktop top: `1440x900`
- Desktop full page after scrolling through sections
- Mobile top: `390x844`
- Mobile artifact section
- Mobile comparison section
- Desktop no-JS top
- Reduced-motion desktop top

Required automated checks:

```js
// In Playwright, after loading /landing at 390x844:
const overflow = await page.evaluate(() => {
  const offenders = Array.from(document.querySelectorAll('body *')).filter(el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && (r.right > innerWidth + 1 || r.left < -1);
  });
  return offenders.map(el => ({
    tag: el.tagName,
    text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
    rect: el.getBoundingClientRect().toJSON?.() || null
  }));
});
expect(overflow).toEqual([]);
```

```js
// No-JS check:
const context = await browser.newContext({
  javaScriptEnabled: false,
  viewport: { width: 1440, height: 900 }
});
const page = await context.newPage();
await page.goto('http://localhost:3000/landing');
await expect(page.getByRole('heading', { name: 'Resolve the buyer your store has never seen.' })).toBeVisible();
```

Also verify:

- No console errors.
- No heading hidden under sticky nav after clicking anchors.
- First viewport is not blank in an immediate screenshot.
- CTA links go to intentional destinations.
- Mobile top includes a visible product proof, not only text.

## Design acceptance criteria

The pass is successful when:

- The page still feels like Unauth, not a Stripe clone.
- The first fold communicates the product, not just the brand mood.
- The case-file artifact is readable on both desktop and mobile.
- Motion never hides essential content.
- No-JS and reduced-motion are graceful.
- There is no horizontal overflow at 390px or 820px.
- The page has fewer repetitive article-like sections.
- Synthetic examples are transparently labeled and never presented as real customer proof.
- CTAs feel like a real pilot funnel.
- The final page can be shown next to Ramp and Stripe without looking amateur in spacing, responsiveness, or interaction discipline.

## Suggested first implementation order

1. Fix reveal/no-JS/critical hero visibility.
2. Fix mobile overflow and responsive artifact/table behavior.
3. Rewrite hero CTA destinations and copy.
4. Refactor the product artifact into reusable responsive components.
5. Tighten page narrative and remove repetitive sections.
6. Add stronger network/product visualization.
7. Improve CTA module.
8. Run Playwright verification across desktop, mobile, no-JS, and reduced-motion.

Do not start with ornamental animation. The current page already has enough aesthetic direction. The next level comes from trust, responsiveness, product clarity, and ruthless execution.
