# Unauth landing design audit — commit `84dd12b`

Date audited: 2026-05-16  
Route audited: `http://localhost:3000/landing`  
Git target: `origin/claude/distracted-kepler-52f46f`  
Commit: `84dd12b Fix no-JS safety, mobile overflow, CTAs, and proof chips`

## Verdict

The page is better than the previous version technically, but it is still not meaningfully close to Ramp/Stripe polish.

It has a compelling visual voice: editorial fraud brief, cream paper, rust/black risk tone, dense case-file artifact. That should stay. The problem is that the page still behaves like a beautiful long-form report about the product instead of a product-led conversion page. Ramp and Stripe are not just "prettier"; they are brutally clear about category, proof, product surface, customer trust, and next action within seconds.

Unauth currently feels like:

> A smart founder's fraud intelligence memo with a polished synthetic artifact.

It needs to feel like:

> A serious risk product that lets an ecommerce operator understand the workflow, trust the data handling, and start a pilot immediately.

## What improved since the previous audit

- No-JS desktop no longer shows a blank hero. `.ua-reveal` is visible by default now.
- Desktop overflow is clean at `1440x900`.
- CTA destinations are more honest: "Request pilot" goes to `mailto:hello@unauth.app?subject=Unauth%20pilot%20request` instead of `/login`.
- Hero proof chips were added.
- Mobile comparison was partially reworked into stacked cards.
- Header and anchor structure are more deliberate.

These are useful fixes. They do not solve the core design gap.

## Playwright findings

Screenshots captured to:

- `/tmp/unauth-landing-audit-84dd12b/desktop-after-wait-top.png`
- `/tmp/unauth-landing-audit-84dd12b/mobile-after-wait-top.png`
- `/tmp/unauth-landing-audit-84dd12b/desktop-nojs-top.png`
- `/tmp/unauth-landing-audit-84dd12b/desktop-after-wait-full.png`
- `/tmp/unauth-landing-audit-84dd12b/mobile-after-wait-full.png`
- section screenshots under `/tmp/unauth-landing-audit-84dd12b/`

Measured states:

- Desktop document: `1440 x 9042`
- Mobile document: `390 x 16852`
- Desktop overflow: `0`
- Tablet overflow: `2`, both footnote/superscript related
- Mobile overflow: `42`, mostly the identity ledger/table around the "One buyer" section
- Console errors/warnings: `0`
- No-JS hidden above fold: `0`

The no-JS blank-page failure is fixed. The mobile layout is still not.

## Benchmark framing

Stripe's current homepage opens with a clear category claim, direct CTAs, product/business proof, and huge credibility numbers such as payments volume and uptime. Ramp opens with a short ROI headline, an email capture, customer proof, and a repeated "get started" path. Both pages use polish in service of conversion, not decoration.

Unauth should not copy their visuals. It should copy their discipline:

- Immediate category clarity.
- Visible product proof in the first viewport.
- Trust proof close to claims.
- A real conversion mechanism.
- Dense information broken into premium product modules.
- Mobile as a first-class composition, not an afterthought.

## Design scorecard

Current overall: `6.2 / 10`

- Visual identity: `7.5 / 10`
- Hero clarity: `6.5 / 10`
- Product proof: `6 / 10`
- Conversion path: `4 / 10`
- Credibility/trust: `5 / 10`
- Mobile polish: `4 / 10`
- Section variety: `5 / 10`
- Enterprise/SOC-grade seriousness: `6 / 10`
- Ramp/Stripe-adjacent polish: `5 / 10`

The visual taste is not the main blocker. The hierarchy and product narrative are.

## Critical issues

### 1. Mobile still fails the first impression

At `390x844`, the first viewport shows:

- Logo/header
- Eyebrow
- Headline
- Paragraph
- CTA
- Proof chips
- A partial "active pilots" line

It does not show the product artifact. The page claims a product, but the mobile user sees a text page first. This is not Ramp/Stripe-grade behavior. Those pages put proof, product, or conversion mechanics immediately into the opening composition.

Required change:

- Add a compact mobile product proof module directly below the H1/CTA within the first viewport.
- It can be a mini case-file strip:
  - `RISK 0.92`
  - `cluster #u_kessler.07`
  - `4 signals fired`
  - `CE 3.0 packet ready`
- Do not wait until 700+ px down the page to show the product.

### 2. Mobile overflow is still unacceptable

Playwright found `42` overflow offenders at `390px`. The main offender is the identity ledger in the "One buyer. Seven stores. Zero shared signal." section. It is still a desktop table squeezed into mobile:

- Header columns extend to `x=559` in a `390px` viewport.
- Address/card/status columns are off-screen.
- Rows are only partially readable.

Required change:

- Replace the mobile ledger with stacked identity cards.
- Each card should show:
  - Merchant
  - Email variant
  - Address variant
  - Card suffix/status
- Use label/value pairs. No wide grid.
- Run a hard Playwright assertion that no element crosses the viewport at `390px`.

### 3. The page is far too long for how repetitive it is

Desktop is about `9042px`; mobile is about `16852px`. Long pages can work, but only if every section earns its space. This one repeats too much:

- Section number
- H2
- Serif paragraph
- Dense table/artifact
- Synthetic note

By the middle of the page, the user has learned "cross-merchant identity + evidence packet + no checkout integration" several times. The extra scroll is not adding enough new product conviction.

Required change:

- Collapse to 6 or 7 high-intent sections:
  1. Hero + product artifact + CTA
  2. Problem/product fit
  3. Live case-file demo
  4. How it works
  5. Data handling/security
  6. Comparison
  7. Pilot CTA
- Remove or merge the "pilot outcomes" section unless there are real customer outcomes.

### 4. The hero is tasteful but underpowered

The hero H1 maxes at `56px`. It is handsome, but it lacks the scale and compression of a category-defining SaaS hero. The copy is also still a full paragraph, not a knife.

Current H1:

> Resolve the buyer your store has never seen.

That is good. But the surrounding treatment is too quiet. The page needs stronger opening hierarchy, less editorial metadata, and a clearer product payoff.

Suggested H1:

> Find the refund abuser repeating across stores.

Or:

> Resolve repeat refund abuse across merchants.

Or keep the current H1 but make the subhead harder:

> Upload order, refund, and delivery history. Unauth links repeat abusers across the network, hashes PII before transmission, and returns CE 3.0-ready evidence packets.

Required change:

- Increase desktop H1 scale to around `clamp(44px, 5.4vw, 76px)` if keeping the two-column layout.
- Tighten the paragraph by 30-40%.
- Move "Issue 04" into secondary metadata, not the first mental object.
- Keep proof chips, but make them more visually credible and less tag-like.

### 5. The conversion path is still weak

Changing `/login` to `mailto:` is more honest, but it is still not premium. Ramp has an email field directly in the hero. Stripe has "Get started" and "Contact sales" paths. Unauth has "Request pilot" which opens an email client.

That feels early, manual, and fragile. It is acceptable for an MVP, but it will not feel like Ramp/Stripe.

Required change:

- Add a real pilot module with an email field, even if it posts to a simple endpoint later.
- If there is no backend, use a visually real form with a clear mailto fallback.
- Capture:
  - Work email
  - Store URL
  - Monthly order volume range
- Make "View sample evidence packet" a real sample route or generated PDF, not just an anchor.

### 6. Credibility is diluted by synthetic proof

The page uses strong claims and numbers, then repeatedly disclaims that names/metrics are synthetic. This creates a credibility wobble:

- "Active pilots across"
- "What two pilot merchants saw in 90 days"
- Named people and merchant-style quotes
- Notes saying names/metrics are synthetic

This does not read like Stripe/Ramp proof. It reads like staged proof.

Required change:

- Remove named synthetic testimonials.
- Replace "pilot outcomes" with "sample output" or "example audit report".
- Use actual proof categories:
  - Controls and data handling
  - Sample evidence packet
  - Supported data exports
  - Risk workflow fit
  - Clear limitations
- If real pilots exist, use truthful anonymized phrasing: "A pilot fashion merchant..." only if it is real.

### 7. Product surfaces are still too static

The case-file artifact is the best part of the page, but it remains mostly a static print artifact. Ramp and Stripe show systems in motion: product states, flows, inputs, outputs, dashboards, infrastructure, customer stories.

Unauth should show a workflow:

1. CSV/data enters.
2. PII hashes in browser.
3. Cluster resolves.
4. Signals explain why.
5. Evidence packet becomes ready.
6. Merchant chooses action.

Required change:

- Turn the hero artifact into a small product sequence.
- Add tabs or segmented states:
  - `Identity`
  - `Signals`
  - `Evidence`
  - `Action`
- On desktop, show a layered product composition rather than one flat document.
- On mobile, show the same flow as four cards.

### 8. Full-page screenshots still show blank reveal regions

No-JS is fixed, but full-page screenshots taken from the top still show blank placeholder areas where below-fold reveal content has not intersected. This is less severe than before, but it is still not ideal for QA, marketing exports, and automated visual review.

Required change:

- Do not hide large below-fold content blocks wholesale.
- Prefer animating accents, lines, counters, and decorative deltas.
- For major content modules, keep opacity at `1` and animate transform only, or reveal child accents.

### 9. The visual rhythm is too monotonous

There is a clear system, but it becomes a trap:

- Cream section
- Dark section
- Cream section
- Dark section
- Repeated rules and labels
- Repeated serif italic emphasis

This feels editorially consistent, not premium-product dynamic.

Required change:

- Introduce 2-3 different module shapes:
  - Compact proof band
  - Interactive product panel
  - Data/security split pane
  - Short comparison cards
  - Final pilot form
- Reduce repeated section-number ceremony.
- Use the rust italic treatment only in the hero and final CTA, not everywhere.

### 10. The charts and metrics do not feel believable enough

The dark network chart is visually on-brand, but it reads like a generic line chart with animated counters. It does not teach the core product idea as powerfully as a network graph or identity resolution sequence would.

Required change:

- Replace or supplement the line chart with a true cross-merchant graph:
  - One resolved buyer cluster
  - Seven merchant nodes
  - Edges labelled by signal type
  - K-anonymity gate shown explicitly
- Keep the chart if needed, but do not make it the primary "network" proof.

## What to do next

Do not spend the next pass adding more polish to the current sections. The correct next pass is a restructuring pass.

### Next-pass order

1. Fix mobile overflow completely.
2. Put product proof in the mobile first viewport.
3. Replace the synthetic pilot outcome section.
4. Collapse the page from 11 sections to 7.
5. Rebuild the hero around product proof + real pilot CTA.
6. Convert desktop tables into responsive product modules.
7. Add a true sample evidence packet route or PDF preview.
8. Replace the generic network line chart with a cross-merchant identity graph.
9. Run Playwright visual QA again at `1440x900`, `820x1180`, and `390x844`.

## IDE implementation prompt

Use this exact instruction for the next design pass:

> Improve the Unauth landing page at `app/(public)/landing/page.tsx` from commit `84dd12b`. Preserve the editorial fraud-brief identity, cream/rust/black palette, dense case-file artifact, square geometry, and serious compliance tone. Do not redesign it into a generic SaaS page. The goal is to make it feel much closer to Ramp/Stripe-level polish by improving product clarity, conversion, credibility, and mobile composition.
>
> First, fix mobile. At `390px`, there must be zero horizontal overflow. The identity ledger and evidence packet cannot remain desktop grids on mobile; convert them into stacked cards with label/value rows. The mobile first viewport must show not only headline/copy/CTA but also a compact product proof module: risk score, resolved cluster, signals fired, and evidence-ready state.
>
> Second, rebuild the hero. Keep the core idea, but make the H1 more decisive and the subhead shorter. Add a real pilot conversion surface: work email/store URL/order volume or, if no backend exists, a visually real form with mailto fallback. Keep "Request pilot" and "View sample evidence packet" as the two actions. Do not send primary CTAs to login.
>
> Third, restructure the page. Reduce the current 11-section article into roughly 7 product-led sections: hero, problem/product fit, live case-file demo, how it works, data handling/security, comparison, pilot CTA. Remove the synthetic named testimonial/pilot outcome section unless there is real evidence. Label all sample data as sample output, not proof.
>
> Fourth, make the product artifact a system, not a flat report. Split it into responsive components: hero case file, identity ledger, signal stack, evidence packet preview, risk action panel. Add subtle tabs or state changes for Identity / Signals / Evidence / Action. Keep motion restrained and never hide important content wholesale.
>
> Fifth, improve visual rhythm. Use fewer repeated section-number blocks, fewer serif italics, and more varied product modules. Keep the editorial look but make the page feel like operational software. Add a true cross-merchant identity graph instead of relying on a generic line chart.
>
> Verify with Playwright. Required checks: no console errors, no horizontal overflow at `390x844` and `820x1180`, no hidden hero content in no-JS, no blank major modules in full-page screenshots, visible focus states, and anchor targets not hidden under the sticky header. Capture desktop top, mobile top, mobile ledger, mobile comparison, no-JS desktop, and full-page screenshots before finishing.

## Bottom line

The current page has taste. It does not yet have the ruthless conversion clarity or product proof density of Ramp/Stripe. The next pass should be less "make it prettier" and more "make it unmistakably useful, credible, and ready to buy."
