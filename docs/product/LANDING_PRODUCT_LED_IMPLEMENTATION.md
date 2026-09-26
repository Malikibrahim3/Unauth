# Unauth landing: Ramp composition, Unauth identity

Status: owner approved implementation on 21 September 2026. Implementation and bounded local validation are complete. Independent visual finish: pass. Release approval is outside this task. This is the active `/landing` presentation plan. It supersedes the 20 September split-hero plan, heavy type, raised capsule navigation and prose-led illustrations. The preceding plan and its dated receipt are preserved at `artifacts/landing-ramp/2026-09-21/before/docs/product/LANDING_PRODUCT_LED_IMPLEMENTATION.md`. They do not certify this revision.

Commissioned merchant-story follow-up: [LANDING_MERCHANT_STORY_IMPLEMENTATION.md](LANDING_MERCHANT_STORY_IMPLEMENTATION.md) covers the subsequent merchant review, source-app examples, artefact explanations, accessibility and availability clarity while preserving this Ramp composition. Implementation was commissioned on 21 September; its separate receipt records the actual follow-up acceptance. The RMP completion record below does not certify those additional requirements.

Current implementation follow-up: [LANDING_APP_STORY_IMPLEMENTATION.md](LANDING_APP_STORY_IMPLEMENTATION.md) specifies the full product story for a first-time merchant, app-specific artefacts and concise local disclosure within this preserved composition. Implementation was authorised on 21 September. Its scoped hero-subject, copy and availability revisions supersede those instructions below; its acceptance gates and receipt remain separate from this plan's completed work.

## Authority and scope

Read GLOBAL_RULES, ARCHITECTURE, PRODUCT and DESIGN. The supplied fourteen Ramp screenshots from 20 September are the visual authority. DESIGN records the adopted measurements and intentional Unauth adaptations. Public transformation is the parent; merchant clarity owns product behaviour. This task changes the landing presentation from navigation through footer, including its media and interactions. It does not authorise provider actions, migrations, authentication changes, deployment or release.

Keep the current route `app/(public)/landing/page.tsx`, shared public components and `components/public/public.module.css`. Consolidate obsolete landing overrides into one scoped system. Other public and authenticated routes retain their appearance. Preserve unrelated dirty work and active servers; before hashes and copies are recorded in `artifacts/landing-ramp/2026-09-21/baseline.json`.

## Research and rejection rules

The live [Ramp homepage](https://ramp.com/) was inspected at 1280px: H1 64/64px at weight 400, max-width 1440px outer box, responsive gutters 16/32/48/64px, 24px product gaps and 12px media corners. Broad panels approximate 644:483; narrow panels 421:526. The provided screenshots remain authoritative when the live site changes. Commercial fonts, company branding, copy, proof and artwork are not transferred.

[NN/G's AI prototyping evaluation](https://www.nngroup.com/articles/ai-prototyping/) identifies reference specificity, visual hierarchy, grouping and spacing as important weaknesses to check. [Google's first-impression research](https://research.google/pubs/the-role-of-visual-complexity-and-prototypicality-regarding-first-impression-of-websites-working-towards-understanding-aesthetic-judgments/) supports clear structure and controlled visual complexity. These are research-informed craft criteria, not evidence of Unauth conversion performance.

Reject:
- A split hero, floating capsule navigation or heavy display type.
- Grey media panels whose principal content is explanatory prose.
- Repeated icon cards, nested containers or identical screenshot arrangements.
- Tiny focal text, blurry captures, accidental cuts or mismatched borders/alignment.
- Decorative finance charts, fabricated activity, logos, testimonials or outcome claims.
- Excessive badges, monospace decoration, gradients, glow and unrelated imagery.
- Competing autonomous motion, scroll hijacking or information hidden by animation.
- Disclaimers dominating the story, or qualifications too distant to keep media honest.

Cards, restrained dots and shallow overlapping shadows are deliberate reference features.

## Reference map and build specification

| Page section | Supplied screenshots | Construction and intentional adaptation |
|---|---|---|
| Flat nav, broad headline, workspace stage | 1–3 | White header and fine rule, 64px regular Inter, product media below copy. Unauth orange replaces lime; shallow desktop frame replaces the phone overlay. |
| Workflow strip | 3 | Five linked stages replace the live activity ticker; no activity claims. |
| Product grid | 5–8 | Two broad 4:3 panels, three narrow 4:5 panels; distinct subjects: decision, recovery, money, ownership and rules. |
| Evidence assembly | 9 | Order, conversation, packing and payment fragments converge on the same case/gate. Plain text explains the human recommendation and intended participating-AI route. |
| Three alternating chapters | 10–12 | Approximately 533:755 text/media proportions, alternating direction. Cases, recovery preparation, then money verification. |
| Operational pair | 13 | Two substantial visuals for owned work and policy/pattern review; no globe. |
| Availability, FAQ, closing and footer | 4, 11, 14 spacing only | Honest product demonstrations replace unsupported endorsements; sample and pricing actions retain existing destinations. |

Hero: **Resolve claims. Pursue money back.** Concise lead, **Try a sample case** and **See how it works**, then a wide current Unauth workspace view with one dominant subject. Focused overlays use the canonical SAMPLE-248 context and are explicitly separate from any staging workspace figures.

Grid: **Customer decisions**, **Eligible recovery**, **Money verification**, **Team ownership**, **Rules and recurring issues**. Each panel has one meaningful destination, a short heading and substantial visual material. No fake interactive controls.

Evidence: meaningful record fragments and connector relationships, not a wall of explanatory paragraphs. People receive a recommendation with reasons and make permissioned decisions or recorded exceptions. Intended participating AI follows the permitted route or escalates; it cannot approve its own exception. Public AI connections remain pre-launch.

Chapters:
1. **Resolve with the facts.** Retain all three samples and working keyboard selector, default recoverable.
2. **Give recovery a next step.** Evidence pack, merchant submission handoff, reference capture, owned follow-up and justified challenges where supported.
3. **Check what actually came back.** Approval, receipt, matching and reconciliation remain separate. Explain a hypothetical completed financial bridge apart from the initial open case.

Keep meaningful existing anchors: workflow, sources, evidence, examples, recovery, money, controls, faq. All stage links must land below the measured sticky header.

## Visual system

| Property | Adopted value |
|---|---|
| Container | Centred max1440px outer; 64px desktop gutters gives 1312px content at 1440px |
| Gutters | 64px at1280+, 48px at1024+, 32px at768+, 16px phone |
| Type | Bundled Inter, display weight400; hero64/64, tablet48/50; phone nominal40/42 with the permitted optical adjustment to approximately38/42 at390px |
| Titles | Main40/42, supporting28/32; phone sections32/35 |
| Text | Body18/28; supporting/qualifications15/23; readable product focal details |
| Palette | Existing graphite/neutral Unauth roles; orange #ff7a30 actions with graphite text |
| Controls | 6px corners, 44px minimum target; hero48px |
| Media | 12px corners, fine neutral rules, shallow shadows only for overlap |
| Rhythm | Major chapters128px desktop/64px phone; media grid gaps24px |
| Texture | Fine dots around opening stage only; clear ordinary reading surfaces |

Optical adjustments are permitted to prevent awkward fragments and retain hierarchy at intermediate widths.

## Facts, capability and asset contract

`lib/demo/merchantCaseV1.ts` remains the only public fictional fact and transition owner. Amounts use integer minor units and canonical formatMoney. SAMPLE-248 has a £248 request, £150 eligible agreement ceiling, no initial paid refund/submission/receipt, and a separately labelled hypothetical £98 unrecovered refund balance. The latter is not total loss, profit or promised savings. Presentation metadata may extend the fixture without changing demo progress semantics or version.

| Claim | Evidence owner | Permitted public wording / boundary |
|---|---|---|
| Evidence-informed resolution | PRODUCT, canonical cases, existing case UI | Gather supported records and review a recommendation; missing facts remain missing. |
| Automatic entry and AI route | PRODUCT, releaseGate | Intended participating-tool workflow; public AI pre-launch, no universal interception. |
| Recovery assistance | PRODUCT active recovery; recovery/work UI | Prepare evidence, identify manual submission and keep follow-up owned. Availability varies by step. |
| Paid recovery | Financial projection and demo transitions | Approval is not cash. Receipt, match and reconciliation are distinct. |
| Rule/pattern review | Rules preview and case pattern UI | Inspect supporting cases and preview before authorised publication. No automatic policy change. |
| Connections | Connector catalogue | Shopify/Gorgias support; UPS/FedEx/ShipBob partial. Imports/documents. Merchant payment evidence planned; subscription billing separate. |

Every crop needs source URL, capture timestamp, dimensions, SHA-256, fictional fixture, intended slot and accessible description in the asset register. Exclude legacy Northstar captures and stale presentation assets. Current authorised screenshot workspace data is not interchangeable with SAMPLE-248. Never imply a figure in a staging screenshot is a live Unauth result.

Use authored HTML/SVG for annotations and diagrams. No new UI/animation library initially. Next Image uses responsive sizes, reserved intrinsic dimensions and lazy loading below the fold. Screenshot capture and asset fallback are verified visually, not assumed from source.

## Motion and resilience

One approximately eight-second hero emphasis, once: evidence → recommendation → separate recovery opportunity. It never animates a refund, submission, receipt or success into existence. Pause and Replay remain available, motion pauses offscreen and when the document is hidden. Reduced-motion/no-JS keep a complete static explanation. [W3C pause guidance](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) informs the controls. No scroll interception.

Retain semantic reading order, accessible ordinary explanation, sample tabs, FAQ, mobile menu, anchors/history and desktop handoff. The landing must not read/write demo progress, billing or provider state. Missing-media states preserve the story and dimensions.

## Implementation and acceptance ledger

| ID | Requirement | Status |
|---|---|---|
| RMP-00 | Baseline, research, reference map, authority reconciliation | Complete · baseline, research, reference map and authority recorded |
| RMP-01 | Hero and 2+3 grid built and visually compared at full size | Pass · measured hero and full-size 2+3 grid |
| RMP-02 | Whole page, original media and concise qualified story | Complete · current UI crops and original record compositions |
| RMP-03 | Independent finish review and material corrections | Pass · substantive corrections and independent final review |
| RMP-04 | Responsive and behavioural verification | Pass locally · six widths and required resilience/interaction checks; see receipt for boundaries |
| RMP-05 | Typecheck, lint, existing tests, build and comparable performance | Pass · build, typecheck, scoped lint, relevant tests and production transfer comparison |
| RMP-06 | Built-world design documentation and final receipt | Complete · DESIGN, manifest, asset register and final receipt |

Required matrix:390,768,1024,1280,1440,1710px, short windows,200%zoom, keyboard navigation, samples, FAQ, menu, anchors/history, reduced motion, offscreen pause, no-JS, desktop handoffs, missing-media fallback, console errors and preview isolation. Check shared public consumers for leakage.

Prove hero/grid before extending the page. Inspect both full-page rhythm and readable section crops. Record each material mismatch, correction and confirming evidence in the defect ledger. Supply the original screenshots, approved specification and actual captures to an independent reviewer; continue substantive corrections until material findings are resolved. A passing build or one attractive viewport is insufficient.

Current evidence directory: `artifacts/landing-ramp/2026-09-21/`. Final receipt must distinguish visual acceptance, functional checks, inherited failures, unperformed checks and release scope. Merchant comprehension research and deployment remain separate.

Completion evidence: [final receipt](../../artifacts/landing-ramp/2026-09-21/receipt.md), [independent review](../../artifacts/landing-ramp/2026-09-21/independent-finish-review.md), and [defect ledger](../../artifacts/landing-ramp/2026-09-21/defects.md). The 1280px final grid capture supersedes its earlier clipping defects. Mobile Ramp inspection was completed in Chrome; the supplied desktop screenshots remain the primary visual authority.
