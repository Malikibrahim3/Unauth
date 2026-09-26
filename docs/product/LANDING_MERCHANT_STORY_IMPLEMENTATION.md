# Landing merchant story: implementation plan

Status: implementation commissioned and completed locally, 21 September 2026. The owner subsequently requested implementation of this plan. S01–S14 are implemented within the preserved Ramp composition; verification and its limits are recorded in [the implementation receipt](../../artifacts/landing-merchant-story/2026-09-21/receipt.md). This is not provider, merchant-research or release approval.

Current implementation follow-up: [LANDING_APP_STORY_IMPLEMENTATION.md](LANDING_APP_STORY_IMPLEMENTATION.md) owns the narrative, app-to-artefact, concise disclosure and current-offer revisions for a first-time merchant. Implementation was authorised on 21 September. Its explicit scoped revisions replace the corresponding hero, caption and availability instructions below; this plan's dated completion evidence remains unchanged and does not certify the new requirements.

Preserve the successful Ramp composition. Make the reason to choose Unauth explicit, then make the artefacts demonstrate it: supported records become one investigation, a reasoned decision, prepared recovery work and a financial outcome the team can verify.

## 1. Authority, evidence and intended result

Read [GLOBAL_RULES](../../GLOBAL_RULES.md), [ARCHITECTURE](../../ARCHITECTURE.md), [PRODUCT](../../PRODUCT.md) and [DESIGN](../../DESIGN.md) before implementation. This is a subordinate content, artefact and accessibility follow-up to [LANDING_PRODUCT_LED_IMPLEMENTATION](LANDING_PRODUCT_LED_IMPLEMENTATION.md), not a new visual system or product specification. PRODUCT's **Why merchants should use Unauth** owns the fragmented-tools positioning. The existing public transformation and merchant-clarity boundaries continue to apply.

The [21 September critique](../../.impeccable/critique/2026-09-21T14-37-44Z__app-public-landing-page-tsx.md) combines two independent reviewers and a parent review of the rendered page. It covered the whole page at 1710×909 and key sections at 390×844. Its screenshots were inspected inline, not saved. Its 24/32 heuristic score is expert judgment, not measured merchant understanding. The earlier [Ramp completion receipt](../../artifacts/landing-ramp/2026-09-21/receipt.md) records a separate, dated acceptance scope; it does not prove these new requirements.

Audience: an ecommerce support, operations or finance lead who already uses a store platform, helpdesk and fulfilment tools. They should recognise the work of switching systems, copying evidence and chasing colleagues, understand how Unauth connects that work, and know what they can try and what their team still does.

The intended merchant takeaway is:

> Our tools each hold part of the story. Unauth brings supported records into one case, so we can investigate once, use that context to decide and prepare eligible recovery, keep the work owned, and check what money actually came back.

“Investigate once” describes evidence reuse, not a guarantee that new evidence or later investigation will never be needed. Do not claim that other tools never integrate, that Unauth replaces them, or that no competitor offers any similar capability. Do not invent time savings, recovery rates or conversion results.

## 2. Preserve the Ramp design

The fourteen supplied Ramp screenshots and the adopted values in DESIGN remain the visual authority. Keep the flat navigation, broad regular-weight hero, authentic workspace stage, slim five-stage workflow, 2+3 product grid, open evidence assembly, three alternating chapters, operational pair, availability, FAQ and closing action, in that order.

| Preserve | Implementation constraint |
|---|---|
| Hierarchy and typography | Keep the H1 “Resolve claims. Pursue money back.” and bundled Inter. Retain the adopted 64/64 desktop hero, 40/42 section hierarchy and responsive optical adjustments. Do not solve longer copy by shrinking type. |
| Widths and rhythm | Retain the 1440px outer container, adopted 64/48/32/16px gutters, 24px desktop grid gaps and 128px desktop / 64px phone chapter rhythm. DESIGN remains the value owner. |
| Colour and material | White and paper surfaces, graphite text, muted secondary copy and orange actions. Retain 12px media corners, fine rules and shallow paper overlap. No new colour system, heavy gradients or raised navigation. |
| Media composition | Keep two broad panels followed by three narrow panels and the existing chapter proportions. Fix internal composition and text placement before changing the media frame. |
| Motion | Preserve the single restrained hero sequence, Pause/Replay, offscreen/hidden-document pause and complete static fallbacks. Source logos and evidence connectors remain static. |
| Scope | Use the existing landing components and landing-scoped rules in `components/public/public.module.css`. Preserve pricing, legal, authentication, onboarding, `/demo` styling and authenticated workflows. |

No new hero logo wall, competitor matrix, carousel, screenshot collage, prose-card grid or additional full-width section. The new source key lives inside the existing sources section. Captions are short live text, integrated into the present composition.

## 3. Review-to-fix coverage

Every row needs a confirming capture or behavioural check in the implementation receipt. No row is implemented by this document.

| ID | Finding | Required change | Phase |
|---|---|---|---|
| S01 · P1 | The reason to add Unauth to existing tools is implicit. | Name fragmented records in the hero; show shared context and evidence reuse in sources, recovery and team copy. | MS-01, MS-02 |
| S02 · P2 | The assembly collects facts without fully explaining the recommendation. | Label source families and show one concise causal explanation using canonical SAMPLE-248 facts. | MS-02 |
| S03 · P2 | The recovery pack mostly lists files. | Show a short prepared claim extract, reuse cue, unresolved submission requirements and the merchant's next action. | MS-03 |
| S04 · P2 | The early recovery next action is outside its media crop. | Recompose the paper so the ceiling and next action are visible at every required width. | MS-03 |
| S05 · P2 | Current availability is too general to evaluate. | Publish specific evidence-backed scope and merchant responsibility in the existing availability rows. | MS-00, MS-05 |
| S06 · P2 | Several overviews repeat without adding understanding. | Assign each section one job; retain composition while removing redundant overview copy. | MS-01 |
| S07 · P2 | Readers must remember which case and money state they are seeing. | Use local case/state captions; keep Asterlane captures separate from SAMPLE-248 and its hypothetical ending. | MS-03, MS-04 |
| S08 · P2 | A rule-preview table is presented near a recurring-pattern promise. | Show investigation and deliberate rule review as distinct steps; label the existing table as a three-case check preview. | MS-04 |
| S09 · P2 | Visible and accessible sample names differ. | Make accessible names match the visible tabs, retaining keyboard and panel relationships. | MS-04 |
| S10 · P2 | Shared provenance is too far from cards on phones. | Place concise fictional/manual/state qualifications beside each affected card, in accessible live text. | MS-03 |
| S11 · P2 | Screenshot text is miniature or clipped; the hero resembles a finance dashboard at small sizes. | Treat captures as product context; supply readable live explanations and intentional crops without altering screenshot pixels. | MS-03 |
| S12 · P2 | “Gate” and permitted-route language require interpretation. | Define the gate at first use as a check of evidence and rules before a decision. Retain the human/AI distinction. | MS-01, MS-02 |
| S13 · Refinement | The ending is vague and the demo has a different presentation. | Make the closing promise specific; describe the fictional desktop walkthrough and preserve the correct Inspect destination. Do not reskin the demo. | MS-05 |
| S14 · Owner suggestion | Recognisable apps could make fragmentation concrete. | Add three qualified source-app examples and one generic records source inside `#sources`; omit competitor logos. | MS-02 |

## 4. Section specification and copy

### Opening and page sequence

Keep the H1 and both hero CTA labels/destinations. Replace the lead with this working copy, allowing small editorial shortening to preserve the existing measure:

> Your store, helpdesk and fulfilment tools each hold part of the story. Unauth brings supported records into one case, so your team can resolve the claim, pursue eligible recovery and track the money together.

Align page metadata with the same promise. Keep a concise, adjacent link to availability and the public AI pre-launch qualification. Do not turn the lead into an integration guarantee or imply that Unauth executes the external actions. Avoid forced desktop line breaks that create fragments on intermediate widths.

| Section | One job | What changes |
|---|---|---|
| Hero workspace | Show the product's breadth. | Preserve the current capture and its separate-workspace provenance. Explain that the adjacent walkthrough follows a fictional case. Do not suggest the dashboard totals belong to that case. |
| Five-stage strip | Give the whole job a simple order. | Retain the five stages and anchors. State that customer resolution and recovery are separate tracks; recovery does not automatically hold up helping the customer. |
| 2+3 grid | Make five benefits easy to scan. | Retain benefit headings and distinct media. Local captions carry context; the grid does not retell every chapter. |
| Sources and gate | Explain why combined records improve the decision. | Add the source key and causal explanation below. This is the primary demonstration of the fragmented-tools value. |
| Three sample cases | Let merchants compare decisions. | Keep all three variants, factual disclosures and case-specific demo links. Default to Wrong item. |
| Recovery chapter | Show useful work prepared from the investigation. | Make reuse and prepared wording visible, with the manual handoff and unresolved checks. |
| Money chapter | Explain how an outcome is verified. | Retain separate approval, receipt, match and reconciliation meanings; connect the hypothetical ending to SAMPLE-248. |
| Operational pair | Show shared responsibility and controlled improvement. | Same context for support, recovery and finance; investigate supporting cases before considering a rule change. |
| Availability and FAQ | Answer buying and execution questions. | Replace broad availability repetition with verified rows; reserve FAQ for genuine follow-up detail. |
| Closing | Offer a concrete next step. | “Start with one case. Follow it through.” Keep the sample and pricing actions. |

### Sources: include app examples, omit competitor logos

**Decision: use source-app logos.** Recognisable tools make the starting problem tangible. Competitor logos would change the section into a comparison and require evidence for claims the page does not currently make.

Use the existing `#sources` introduction, with the supporting line:

> The conversation is in your helpdesk. The order is in your store. Packing evidence may be in a fulfilment tool or a document. Bring the supported records together, then carry the same context into the next step.

Add a quiet source key immediately before the fictional assembly. It has four items, each with a name and a useful record type:

| Example | Label | Existing local asset | Truth boundary |
|---|---|---|---|
| Shopify | Orders and earlier refunds | `public/providers/shopify-wordmark.svg` | Supported record types depend on the workspace connection, permissions and coverage. |
| Gorgias | Customer conversations | `public/providers/gorgias-wordmark.svg` | A conversation source, not evidence that Unauth sends customer messages. |
| ShipBob | Fulfilment records · partial coverage | `public/providers/shipbob-wordmark.svg` | A qualified source-family example; not the warehouse responsible for SAMPLE-248. |
| Imports and documents | Supporting evidence | `public/providers/document-upload.svg` | Generic source, not a brand or universal ingestion claim. |

Use provider identity and display status from `lib/integrations/registry.ts`; keep adapters owned by `lib/connectors/registry.ts`. Do not build a second integration catalogue. Validate the selected assets against [WORDMARK_SOURCES](../../public/providers/WORDMARK_SOURCES.md) and their original sources during implementation; the asset directory alone is not proof of permitted usage or a partnership. Reuse a documented suitable variant without recolouring or distorting it. If an asset cannot be validated, retain its text name or a generic source-family icon and record the omission.

Desktop: a compact row with generous whitespace and restrained logo sizes; optical balance matters more than equal wordmark widths. Phone: a readable 2×2 layout that can collapse to one column under magnification. Use ordinary labels at the established secondary-text size, intrinsic image dimensions and no scrolling strip. Logos are static identifiers, not fake links or badges. If a visible brand name supplies the accessible label, the adjacent image is decorative to avoid duplicate announcements.

Place this local qualification with the key: **“Source examples. Coverage depends on your connection and permissions; ShipBob coverage is partial.”** Keep the no-partnership qualification in the availability area. The brands must remain visually separate from the sample's source fragments: use a small “Fictional example · SAMPLE-248” divider before the assembly. Do not put a ShipBob logo on the warehouse acknowledgement or a Gorgias logo on the fictional message. The fixture does not establish those origins.

Retain the open four-fragment assembly. Label the fragments by source family: **Store record**, **Fulfilment evidence**, **Refund history**, **Customer conversation**. Refund history is a supplied commerce fact here, not proof of a live bank/Stripe feed. Connectors depict records meeting in a case, not APIs running or actions being executed. Avoid “these apps do not talk to each other”; they can have integrations while still leaving this merchant workflow fragmented.

Define the gate in ordinary text at its first visible use: **“The gate checks the evidence and your rules before a decision.”** Keep the human recommendation and intended participating-AI route separate. Beneath the recommended route, show this short causal explanation in live text:

> The packing evidence and warehouse acknowledgement support the wrong-item claim. With no prior refund, the recommended customer action is a refund. The separate agreement sets a £150 recovery ceiling.

Derive the facts and amount from `merchantCaseV1.ts`. The sample recommendation remains reviewable; missing weight/location do not establish carrier liability. The agreement ceiling does not establish claimant eligibility, a submission channel, payment or a guarantee.

### Recovery: show the prepared work and keep its next action visible

The broad grid card is a compact preview; the recovery chapter is the fuller explanation. Keep one shared fact source and consistent wording, with different amounts of detail. Do not duplicate a large paper at a smaller, unreadable scale.

Grid card, in order: SAMPLE-248 / recovery preparation; £150 eligible agreement ceiling with “not money received”; a two-line preview of the prepared wording; **“Review the pack. Submit in your tool.”** Keep all four inside the visible media frame. Condense or remove redundant file rows and the large internal headline before changing the established 4:3 composition. Move an essential instruction into a live caption if it cannot remain comfortably legible in the paper.

The 1710px review found a 483px-high media frame while the next-action text was roughly 550–566px below its top. Acceptance must check actual rendered bounds, not just the presence of the text in the DOM. Internal `overflow: hidden` is not permission to conceal the next action.

The detailed pack shows the cue **“Prepared from the same case evidence”**, existing supporting records and a short extract:

> SAMPLE-248 concerns a £248 refund request for the wrong item. The packing evidence and warehouse acknowledgement record a packing error. The fictional agreement WH-DEMO-01 caps eligible recovery at £150.

Label the extract **“Illustrative claim wording · review before sending”**. Generate money strings through canonical `formatMoney` from integer minor units. If presentation metadata is needed, extend the existing public fixture without inventing new business facts or changing demo progress/version semantics.

Keep **“Claimant and channel: confirm before sending”** and **“Submission reference: record after you submit.”** Keep deadline checking in the chapter instructions; the fixture supplies no deadline. Retain owned follow-up, verification of unpaid approvals and justified challenges as intended capabilities subject to the availability evidence. Do not render a fabricated submitted state, recipient, provider response or recovery deadline.

### Readability, local provenance and the same case

Keep the authentic workspace capture. Adjust its CSS framing only to improve emphasis; do not edit screenshot pixels, splice facts into it or imply it is SAMPLE-248. The owner's subsequent 21 September request replaces the blurry Customer decisions evidence crop with an original HTML/SVG artefact matching the other grid scenes. Use the canonical SAMPLE-248 request, packing evidence, prior-refund amount and recommendation, with live text and adjacent fictional/manual-action context. This supersedes preservation of that crop only; retain its source image as historical evidence.

Provide these concise live captions beside the relevant media, refining length only if their meaning survives:

| Media | Required local meaning |
|---|---|
| Workspace screenshot | Current UI from a separate Asterlane demo workspace; the adjacent fictional walkthrough is a different example. |
| Customer decisions grid artefact | Fictional SAMPLE-248; acknowledged packing error and no earlier refund support a recommendation for team review. External actions remain manual. |
| Recovery grid and chapter | Fictional SAMPLE-248; £150 is an eligible ceiling, not money received; the merchant reviews and submits. |
| Money grid and chapter | A hypothetical completed path for the same case, conditional on the refund being paid and recovery being reconciled. |
| Team media | Fictional responsibilities/assignment. The named date is merchant-set review time, not a provider deadline. |
| Rule media | A fictional proposed-check preview; an authorised person decides whether to publish a change. |

Keep a shared grid note if useful, but it cannot carry the only qualification. At 390px the existing note was about 2,218px after the recovery card began. The local caption must be the next reading element for its media, with no other card between them, and remain visible without a tooltip or disclosure.

Several media wrappers use `aria-hidden`. Put essential case, provenance, reason and action summaries outside those wrappers, or expose a carefully structured equivalent. Do not simply expose every decorative fragment and force a screen reader through duplicate prose. The meaningful explanation must survive images failing, CSS crop changes and JavaScript being disabled.

Retain the money example: £248 refund paid, £150 recovery reconciled, £98 unrecovered refund balance. Those values belong to a separately labelled hypothetical completed path, not the initial open case. Keep “not total business loss or profit.” Never collapse approval into receipt or describe the remainder as a proven saving.

### Ownership, recurring issues and rule review

Preserve Amelia Reed, the canonical action and the merchant-set review date from `DEMO_WORK_EXAMPLE`. Explain **“Support, recovery and finance use the same case context”** next to the ownership visual. Role labels describe responsibilities; they must not imply that support waits for recovery or finance before an otherwise permitted customer resolution.

Keep the existing policy table as a **“Proposed prior-refund check · three fictional case previews.”** It demonstrates which cases a check would affect; it is not a detected recurring pattern.

Within the existing policy media, add a compact conceptual path: **Notice a recurring issue → inspect supporting cases → investigate the cause → preview a rule if appropriate.** Keep the table as the concrete preview beneath or beside that path. Retain the separate authorised publication step in the caption. If the composition becomes dense, simplify the table's internal framing rather than adding another section or reducing type.

Label the path **“Illustrative review process”** and show no invented counts, trends, root-cause verdicts or measured impact. The three varied sample cases cannot demonstrate recurrence. Any future factual pattern display must use the reporting owner and the global minimum evidence threshold of five cases across three orders; producing that dataset is outside this refinement. A recurring issue may warrant an operational investigation rather than a new rule.

### Sample accessibility and handoff

In `PublicInteractions.tsx`, keep the visible labels **Damaged item**, **Prior refund**, **Wrong item**. Remove the conflicting `aria-label` override so visible text supplies each tab's accessible name; retain canonical case titles where useful within the panel. Preserve IDs, `aria-controls`, `aria-labelledby`, `aria-selected`, roving tab index, ArrowLeft/ArrowRight wrap, Home/End and selection-linked content. Update affected tests to query the actual visible names rather than renaming the case fixture.

Retain working facts disclosures and all case-specific destinations. Selection on the landing must not advance demo progress, write local storage or send provider/business mutations. Preserve no-JS access to the default example and links to the other cases.

Closing copy:

> **Start with one case. Follow it through.**
>
> See how the same evidence supports a customer decision, a recovery handoff and the checks on any money received.

Keep **Try a sample case** and **Explore pricing**. Add the modest expectation **“Fictional walkthrough · interactive case requires a desktop.”** The primary destination remains `demoUrl('recoverable')`, entering Inspect. Verify the sample identity and device handoff, including query retention and browser Back. `/demo` keeps its existing scoped presentation; do not use this observation to widen the task into a demo redesign.

## 5. Availability: evidence before labels

Replace broad statements such as “availability varies by step” with useful scope in the existing rows. Each row must answer **what Unauth supports, for which records/conditions, and what the merchant does**. Keep technical flag names, certification vocabulary and internal maturity states out of product copy.

The current provider registry and [CAPABILITY_STATUS](CAPABILITY_STATUS.md) are starting evidence. The latter is a dated projection, and implemented code or a fictional preview alone does not prove a capability is enabled and usable by a merchant. MS-00 must reconcile the relevant current code, release gates and existing runtime evidence without connecting accounts or executing external actions.

| Row to publish | Scope to establish | Merchant responsibility / limitation |
|---|---|---|
| Bring records into a case | Verify Shopify orders/refunds, Gorgias conversations, imports/documents and partial fulfilment coverage at record level. | State supported connections, permissions and any material gaps. Never promise every app or all historical records. |
| Review the customer decision | Verify evidence inspection, rules/recommendation scope and permissioned decision recording. | Your team reviews the recommendation. Refunds, replacements and messages are completed in existing tools. |
| Prepare and pursue recovery | Separately verify evidence collection, prepared wording, next-action ownership, follow-up and justified challenges. | Your team confirms the claimant, terms, deadline and channel, sends the claim/follow-up and records the reference. If a step is planned or unverified, name that step explicitly. |
| Check money received | Verify how actual receipts are recorded, matched and reconciled, and which source records are supported. | Approval is not receipt. Identify any manual recording/checking; do not imply a bank feed or Stripe merchant evidence. |
| Automatic entry and AI routes | Read `lib/claim-gate/releaseGate.ts` and the current public capability gate. | Keep public AI connections pre-launch; enforcement requires a participating integration. |
| Historical recovery review | Verify the planned status against the current owner. | Planned review does not initiate claims or create work; original terms, deadlines and existing claims matter. |

Keep Stripe merchant payment evidence explicitly planned and separate from subscription billing. Provider adapter functions do not override PRODUCT's manual external-action boundary.

During implementation, save a small claim/evidence ledger: proposed public sentence, owning module, exact capability/record scope, dated proof, current limitation, final sentence. Where usable scope cannot be established, say **“Availability not yet confirmed for [specific step]”** or retain the accurate planned/pre-launch status. Do not publish “Available now,” silently promote maturity, or finish this item with the same vague blanket caveat. This task clarifies availability; it does not build missing backend capabilities.

## 6. Implementation owners and phases

Use the existing owners below. A new private presentational helper inside the existing landing modules is acceptable; a parallel landing system, integration registry or money model is not.

| Owner | Expected edit |
|---|---|
| `app/(public)/landing/page.tsx` | Hero/metadata, sources explanation, recovery copy, availability rows, FAQ and closing. |
| `components/public/LandingScenes.tsx` | Customer decisions artefact, source key/assembly, compact recovery scene, ownership and policy-review composition. |
| `components/public/LandingOutcomeVisuals.tsx` | Prepared recovery extract, handoff clarity and local hypothetical money context. |
| `components/public/LandingProductGrid.tsx` | CustomerDecisionScene placement, per-card accessible captions and intentional media composition. |
| `components/public/LandingProductStage.tsx` | Clear separate-workspace provenance, readable companion explanation and preserved media fallback. |
| `components/public/PublicInteractions.tsx` | Sample accessible names; narrowly scoped changes because the module has other consumers. |
| `components/public/LandingJourney.tsx` | Only copy needed for the whole-job explanation and separate resolution/recovery tracks. |
| `components/public/public.module.css` | Landing-scoped source key, caption placement and crop/fit corrections using current tokens. |
| `lib/demo/merchantCaseV1.ts` | Only necessary presentation metadata derived from existing facts; preserve amounts, transitions and storage version. |
| `public/providers/WORDMARK_SOURCES.md` and selected existing SVGs | Record actual provenance checks; reuse validated assets. No new logos required for this plan. |
| Existing focused tests and a public-only browser config | Update stale name/structure assumptions and cover the meaningful changed behaviour. |
| `lib/surfaces/manifest.ts`, current design/plan and evidence records | At completion, register changed expectations and actual evidence without changing unrelated surface scope. |

Start with a fresh, bounded edit allow-list, hashes and before copies. The implementation baseline must cover shared modules and protected consumers as well as landing files. Read applicable `AGENTS.md` and installed Next.js guidance before framework code changes. Preserve unrelated dirty work and active servers. Bind evidence to the actual source/build and preview; do not assume the review's port 3026 still identifies the intended build.

| Phase | Work and deliverable | Dependencies / exit condition | Status |
|---|---|---|---|
| MS-00 | Baseline, review ledger, capability evidence and selected asset provenance. | Confirm owners, existing failures, exact file scope and what current public availability can truthfully say. | Implemented; receipt records evidence |
| MS-01 | Hero and distinct section jobs; first-use gate explanation. | MS-00; opening clearly explains fragmented records while preserving hero geometry and current CTA behaviour. | Implemented; receipt records evidence |
| MS-02 | Qualified source-app key, family labels and evidence-to-recommendation explanation. | MS-00/01; logo context cannot be mistaken for a partnership, universal connection or sample provenance. | Implemented; receipt records evidence |
| MS-03 | Recovery extract and crop correction; local captions; screenshot and financial continuity. | MS-01/02; focal facts, manual next action and qualifications visible on desktop and phone. | Implemented; receipt records evidence |
| MS-04 | Shared ownership, honest pattern/rule distinction and accessible sample names. | MS-03; preview is not recurrence proof; keyboard and assistive names match the visible control. | Implemented; receipt records evidence |
| MS-05 | Evidence-backed availability, FAQ deduplication and concrete closing/handoff. | MS-00 evidence plus preceding copy; no unsupported “available now” claims or destination drift. | Implemented; receipt records evidence |
| MS-06 | Rendered verification, independent finish review, focused checks and final receipt. | All preceding phases; every S01–S14 row has a result, evidence and any remaining limitation. | Implemented; receipt records evidence |

These commissioned phases form one bounded follow-up. Do not silently expand into provider execution, account connection, product workflows, migrations, commits, deployment or release. Genuine missing capability evidence remains an explicit limitation rather than a reason to invent a claim.

## 7. Acceptance and verification

### Rendered and behavioural acceptance

| Check | Pass condition |
|---|---|
| First screen | A reader can identify the fragmented-record problem, connected workflow and two commercial jobs without reaching the FAQ. Original H1, Ramp hierarchy and both actions remain. |
| Source key | At most three source brands plus generic records; record roles and partial coverage are readable. Clear separation from fictional SAMPLE-248; no competitor comparison, partnership implication or animated connection claim. |
| Assembly | A reader can explain which facts support the recommendation and distinguish the separate recovery ceiling. Gate language is defined; missing facts stay missing. |
| Recovery | Both the small preview and detailed chapter show prepared work and a visible manual next action. Confirm text bounds at 390, 768, 1024, 1280, 1440 and 1710px; DOM presence is insufficient. |
| Context and money | Local case/state captions survive stacked layouts. No Asterlane/SAMPLE-248 blending; the £98 balance is conditional, correctly labelled and never presented as total loss or savings. |
| Ownership and learning | Same case context is reused without blocking customer help. The illustrative process and three-case rule preview do not assert an observed pattern or automatically published change. |
| Availability | Each material step has a supported, dated scope and clear merchant responsibility, or a precise planned/pre-launch/unconfirmed status. No missing backend capability is implied by a sample. |
| Accessible interaction | Visible names match accessible tabs and panels; arrows, Home/End, focus, disclosures, menu and anchors work. Essential media summaries are available outside decorative hidden wrappers. |
| Resilience | Readable at required widths, short desktop window and actual 200% zoom. No page overflow or cut-off actions. Reduced motion, no-JS and failed media retain the explanation and destinations. |
| Existing behaviour | Hero Pause/Replay and pause conditions, section/history links, case-specific Inspect links and desktop handoff remain correct. Landing selection does not write demo progress or make business mutations. |
| Visual preservation | Compare hero, both grid rows, assembly and chapters against the adopted Ramp references and before captures. Shared pricing/legal/demo presentation remains unchanged. |

Capture a complete-page view for rhythm and readable section views for every changed artefact. Record viewport, route, build/source identity and screenshot filename. Review full-size text and accessible structure, not just thumbnails or source code. Check browser console/network findings and distinguish inherited issues from regressions. A native screen-reader check is separate from an accessibility-tree inspection; report which was actually performed.

### Focused engineering checks

Run relevant checks once changes stabilise, rerunning affected checks after substantive corrections:

- `npm run verify:authority` and `npm run verify:merchant-copy`; report inherited failures separately.
- `npm run typecheck`, with the previously documented larger Node heap only if needed; scoped ESLint for edited code rather than broad formatting.
- Existing meaningful Jest coverage, including `tests/components/publicTransformation.test.tsx`, `tests/components/landingProductStage.test.tsx` and `tests/unit/demoFixture.test.ts` where affected.
- `tests/current/landing-page.spec.ts` against the actual loopback preview using a public-only Playwright configuration. The existing `tests/playwright.config.ts` runs authenticated global setup and must not be used unchanged for this landing-only task. Add a minimal `tests/landing.public.config.ts` if needed, with only this spec, an explicit loopback base URL, no auth state/global setup and no provider/seed actions.
- A production build and bounded production preview checks, retaining the source/build identity. Compare asset transfer if media payload changes materially; do not infer Web Vitals from a successful build or local response timing.
- Surface-manifest/page-inventory verification if those expectations change, plus an allow-list/hash comparison for protected files and unrelated work.

The current browser spec contains older assumptions: canonical titles as visible tab text, an ambiguous repeated recovery selector, an older six-stage money list and a `#sources summary` disclosure no longer in the present composition. Record baseline failures, update those assertions to the adopted current contract, and preserve their actual purposes: state consistency, truthful money stages, no-JS understanding and isolation. Do not remove protections simply to obtain a green run. Scope repeated artefacts by section and assert that every relevant instance remains truthful.

The document-planning baseline ran `npm run verify:authority` before edits. It failed with four diagnostics in `MERCHANT_CLARITY_IMPLEMENTATION.md`: two references to the missing `../../artifacts/merchant-clarity-implementation/2026-09-09-ui-forensics-01/P12/ui-forensics/report.md`, and two references to the absent `../../DESIGN.md#linear-landing-revision-7-september-2026` heading. These are inherited documentation issues, not landing-story implementation results. Preserve the distinction in the final receipt.

### Merchant comprehension and final receipt

An independent expert review should answer the questions below from the rendered page without reading PRODUCT or this plan. Actual target-merchant sessions are separate research; this plan does not claim they happened or authorise unsolicited outreach.

1. Why would I add Unauth when I already have a store, helpdesk and fulfilment tools?
2. Which records come together, and what do the logos actually promise?
3. Why does the wrong-item example recommend this customer action?
4. What work is carried into recovery, and what must my team review or do manually?
5. Does £150 mean an eligible ceiling, an approval or cash already received? When is the £98 balance meaningful?
6. What can I use now, what needs confirmation, and what is planned?
7. What happens when I choose the sample case?

For any genuine merchant study, record participants, prompts and unaided answers. Do not rename an AI critique a merchant test or invent a conversion result. Fail expert acceptance for a material false inference about automatic execution, paid money, provider provenance or availability, even if the page looks polished.

Save implementation evidence under a newly dated `artifacts/landing-merchant-story/` directory. The final receipt must include S01–S14 disposition, actual files changed, selected/fallback logo decision, availability claim evidence, before/after captures, engineering results, independent visual/accessibility findings and protected-file verification. Separate local implementation, rendered acceptance, capability evidence, merchant research and release verdicts. Close this plan's implementation status only when its required work is evidenced; do not overwrite the earlier Ramp receipt or present unperformed checks as passes.

## Historical planning-deliverable checks · 21 September 2026

All fourteen findings are mapped to the seven pending phases. Local Markdown links, selected asset/test paths and whitespace checks pass. Hashes for eighteen protected product, design, runtime and asset files match the planning baseline. The only edits are this document and its registrations in ARCHITECTURE and the Ramp implementation plan. The authority verifier reports the same four inherited broken-reference diagnostics before and after these edits. No runtime tests or new browser checks were needed for this documentation-only change; all implementation acceptance remains pending.

## Implementation closure · 21 September 2026

The subsequent implementation request supersedes the planning-only status above. MS-00–MS-06 and S01–S14 are locally complete. Production build, typecheck, 41 focused Jest cases, 15 public browser checks and the final automated accessibility scan passed. The independent reviewer scored all three requested corrections resolved. The four inherited authority diagnostics and one inherited dashboard copy diagnostic remain separate. Native screen-reader operation, actual merchant research, provider usability and release approval are not established. [The final receipt](../../artifacts/landing-merchant-story/2026-09-21/receipt.md) contains the source/build identity, exact changed-file list, captures, claim evidence and limitations.

## Customer decisions artefact follow-up closure · 21 September 2026

The owner-requested replacement of the blurry Customer decisions crop is implemented by `CustomerDecisionScene` in `LandingScenes.tsx`, placed by `LandingProductGrid.tsx` and styled in the existing public CSS owner. The original HTML/SVG paper uses canonical fictional SAMPLE-248 facts, live text and the adjacent manual-action caption. Content-driven fitting preserves the complete paper at compact widths. The independent finish review returned **ship**, with no material fixes, for this one artefact; the incumbent Ramp composition and broader acceptance boundaries remain. [The bounded receipt](../../artifacts/landing-decision-artifact/2026-09-21/receipt.md) records the source identity, captures at 1440, 1280, 1024, 768, 390 and 320px, actual checks and limitations.
