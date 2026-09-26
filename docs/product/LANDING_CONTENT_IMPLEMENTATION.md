# Landing content implementation

Prepared: 16 September 2026  
Status: **Implemented locally — the 16 September merchant-story revision is in place; rendered, type and focused interaction checks remain separate from release readiness.**  
Parent authority: [Merchant Clarity implementation](MERCHANT_CLARITY_IMPLEMENTATION.md), P10 public explanation.  
Permanent constraints: [GLOBAL_RULES.md](../../GLOBAL_RULES.md). Visual owner: [DESIGN.md](../../DESIGN.md).

## 1 Objective and boundaries

Explain Unauth's breadth without making visitors learn its operational detail before understanding its value. The audience is merchant operations, support, loss-prevention and finance teams dealing with post-purchase problems. The page must connect investigation, decisions, team follow-up, recovery, reconciliation and reporting into one understandable story.

The primary action remains exploring the three fictional cases; workspace creation remains secondary. Keep the adopted light Linear composition, typography, brand assets, restrained styling and desktop support policy. This is a content and hierarchy revision, not a new visual identity or product capability.

This document specifies and records the implemented replacement copy and structure. The 16 September owner instruction supersedes the 12 September section order and copy below while retaining its truth, fixture, visual and verification boundaries. Do not change phase verdicts or imply release approval.

## Current revision — 16 September 2026

The reachable page now follows a benefit-led Loop-style reading path for merchant owners and operations leaders:

1. **Hero:** “Make refund and replacement decisions with confidence.” The supporting sentence names the evidence gate, merchant-controlled decision, human/AI intent and financial follow-through; AI-agent connections remain explicitly pre-launch.
2. **Three merchant questions:** “Know what happened. Decide what’s next. Follow the money.” This replaces the five internal stages as the first explanation of the product.
3. **Sample cases:** Legitimate claim, duplicate payout and recoverable fulfilment loss retain the canonical fixture and demo links, with shorter descriptions focused on what changes the next step.
4. **Gate:** Human team, Unauth and external AI roles are named separately. The rules-based recommendation remains distinct from the merchant decision and external execution.
5. **Recovery:** Three plain-language groups introduce recovery, while the precise eligibility, provider response, receipt, matching, reconciliation and remaining-loss stages remain available under “How recovery is tracked”.
6. **Operations, sources and questions:** Team follow-up, policy checks, loss patterns, planned integration coverage and eight merchant FAQs explain the wider product without implying automatic execution, provider availability or realised savings.

The page retains the existing public anchors, artwork placeholders, canonical demo fixtures, pricing destination, desktop workflow boundary and Loop-derived public styling. No backend, API, schema, integration, provider or commercial contract changed.

Validation for this revision: the landing components pass scoped ESLint and the application TypeScript check; `tests/components/publicTransformation.test.tsx` passes 8/8; surface-manifest verification reports 65 page modules, 120 audited surfaces and 255 scenarios; and `git diff --check` is clean for the task-owned paths. Rendered browser review covered 1440×900, 1024×720 and 390×844 marketing layouts with zero horizontal overflow, working mobile navigation, the three sample tabs, the recovery disclosure, the primary demo link and the pricing link. Browser console errors were absent on the reviewed landing render. Production build, saved-reference parity, native accessibility and release approval remain separate open gates.

Implemented scope: `/landing` copy, section sequence, existing artwork placement/captions, necessary scoped layout adjustments, page metadata and the registered landing reference expectations. Out of scope: authenticated workflows, demo state or facts, provider capability, pricing, new routes, new integrations, backend changes, new tracking, migrations, commit, push and deployment.

Applicable rules: DEMO-01–06, PROD-01/03/05/06, TRUTH-01/03/04/07, MONEY-03/09/12, SOURCE-01–08, POL-03–06, REPORT-01–03, DESK-01–06, VIS-05–10, SAFE-01–03 and TEST-01/04–08.

## 2 Findings and editorial approach

The 12 September review read the reachable landing source and inspected the local rendered page, including the hero, comparison and policy/reporting areas. It was a content review, not complete runtime or release acceptance.

- The same damage claim and resolution comparison recur in the hero artwork, preview facts, example cards, comparison artwork and table.
- The overall workflow appears after detailed examples, delaying understanding of the product as a whole.
- Team coordination has little explanation. Recovery and finance appear mainly through an illustrative amount bridge.
- Policy, patterns and sources lead with sample limitations instead of the merchant task they support.
- “Know who owes you” can imply established liability where eligibility or evidence remains uncertain.

Use three reading depths: headings convey the full product story; short paragraphs explain benefits and boundaries; sample cases provide operational detail. Every section must add a distinct idea. Retain adjacent fictional provenance and material qualifications, while removing repeated paragraphs about the same sample.

Editorial defaults: one H1; seven main sections; body introductions normally 25–45 words; feature descriptions normally 15–30 words. These are editing targets, not truncation limits. Never shorten a financial label until its meaning changes. The 12 September revision did not need additional feature-directory UI; the current revision retains the existing case tabs, evidence accordion, capability tabs and compact integration carousel where they provide progressive disclosure. Invented testimonials and performance claims remain out of scope.

## Historical 12 September section sequence and copy

The section below is retained as implementation history. Its five-stage wording and section order are superseded by the current revision above; its evidence, money and capability boundaries continue to apply.

The quoted text below is the implemented copy. Dynamic sample titles, references, amounts and evidence continue to derive from the existing demo authority. Capability copy remains bounded by the claim checks in section 5; unsupported claims block that dependent copy rather than triggering backend work.

### 1. Hero — identify the job

No eyebrow: let the first line lead directly into the merchant problem.

H1: **The evidence gate before refunds and replacements.**

Description: “Built for claims handled by people or AI agents. Bring evidence and your rules together before a refund or replacement, then trace responsibility, recovery and the financial outcome.”

Primary CTA: **Explore three sample cases** → `/demo`. Secondary CTA: **Create a workspace** → `/signup`.

Use the 13 September 2026 authenticated Asterlane Overview capture as the single hero product illustration. Show its complete 16:9 frame without cropping and keep the adjacent `Fictional staging data · GBP` caption. The capture is the owner-authorised screenshot fixture, not a live customer or provider-health claim. The hero heading, introduction and actions must fit comfortably at supported desktop sizes without shrinking essential text.

Use the same new headline and description for page title, description, Open Graph and Twitter metadata through the existing constants. Append the existing Unauth title suffix. Do not add structured-data claims.

### 2. Workflow — explain the whole product early

13 September owner gate follow-up: restored the review gate in the hero description and this chapter, using the existing `lib/claim-gate/buildRecommendation.ts` hold/proceed recommendation, reasons and limitations contract. The gate informs a merchant decision; it does not intercept external payouts. The current headline, screenshot and CSS are retained. Local rendered checks confirmed the new copy, working Workflow anchor, unchanged 526px hero artwork start at 1440px, and no horizontal overflow at 1024/1280/1440px. Targeted ESLint and source/design diff checks passed. Page SHA-256: `91149c1cb5ebd4d2c38317b96d892169c5efda991cba7491177ad6e8f0ac6e27`. No production build was rerun for this copy-only follow-up.

H2: **Your team or AI. Your evidence. Your rules.**

Use the existing four-step presentation immediately after the hero illustration:

1. **Check the facts behind the request.** “Bring the order, prior refunds, conversations and fulfilment evidence together. See missing records and conflicting accounts before choosing a resolution.”
2. **Apply your rules at the gate.** “Get a recommendation to proceed, hold, request evidence or escalate, with the matched rules and reasons. Designed to give people and AI agents the same policy checkpoint.”
3. **Keep the decision accountable.** “Compare resolutions and known costs. Record the decision, its reasoning and any override, then keep the next action and its owner in view.”
4. **Follow through after the payout.** “Investigate responsibility, prepare eligible recovery work and follow received payments through reconciliation to the remaining loss.”

Visible supporting boundary: “Unauth gathers evidence, records your decision and prepares the next step. Refunds, replacements and claim submissions are completed in your existing tools.” Reuse `DEMO_CAPABILITY` if it retains this meaning; do not change the shared constant just to vary wording.

No second large artwork here. The compact overview introduces the later examples and financial section.

### 3. Claim examples — show practical range

H2: **Three claims. Different decisions.**

Introduction: “Explore how the evidence changes the next step. These fictional cases use illustrative GBP amounts; they are not customer results.”

Retain the three existing fixture-backed titles, figures and amounts. Replace concatenated evidence paragraphs with these concise descriptions, checked against the fixtures:

- Legitimate claim: “Review damage evidence and compare a refund with a same-item replacement.”
- Duplicate payout: “Check a confirmed earlier refund before deciding how to handle another request for the same item.”
- Recoverable fulfilment loss: “Review a packing error, the supporting agreement and the next steps for an eligible recovery.”

Keep existing case-specific Inspect links via `demoUrl(sample.id)`. Keep fictional labels beside each illustration. Do not turn the duplicate amount into savings or the recovery ceiling into received cash.

Remove the separate full-width resolution comparison chapter, its duplicate artwork and cost table from the landing composition. The hero illustration already introduces costs; the demo retains the detailed comparison and all three choices. Do not delete shared demo behaviour or alter its facts. If `ResolutionBento` becomes unused, removing that export is permitted only after a reference search proves it has no other consumers.

### 4. Recovery and finance — explain what follows a decision

H2: **Resolving the claim isn’t the end of the loss**

Introduction: “A customer refund can still leave a carrier or fulfilment issue to investigate. Review who may be responsible, check the evidence against agreement terms and pursue eligible recovery work. See what has actually come back and what remains a loss.”

Two concise supporting points before the existing outcome illustration:

- **Establish the recovery route.** “Review responsibility and eligibility against the evidence. Keep applicable terms, deadlines, ownership and the prepared handoff together.”
- **Trace the financial outcome.** “Follow received payments through matching and reconciliation, with a record of the remaining balance.”

Retain `OutcomeBento`, deriving its simulated stages and figures from the canonical pure transitions. Change its editorial figure label from “Recovery deducted once” to **An example financial outcome**; retain the sample reference and adjacent **Simulated completed path · GBP** caption. Preserve the precise amount labels, stage distinctions and explanation that received and reconciled refer to the same recovery at different stages. Do not rename the unrecovered refund balance as total loss, profit or savings.

### 5. Wider operations — demonstrate breadth compactly

H2: **Keep the wider operation in view**

Introduction: “Use the cases behind each decision and loss to guide follow-up, review your policies and investigate recurring operational problems.”

Use three text-led columns in the existing landing visual language, with natural-height text and no decorative controls:

- **Give every follow-up an owner.** “See assigned work, recorded deadlines and outstanding tasks so the next step stays clear.”
- **See what a rule change would affect.** “Compare proposed gate rules against available case evidence. Inspect the affected cases and exposure before publishing a change.”
- **Understand where claims and losses arise.** “Explore reported issues and supported carrier, product and warehouse groupings, with the underlying cases available for investigation.”

Retain `PolicyBento` and `PatternsBento` beneath this text as the existing paired illustrations. Caption them as fictional previews. Remove the long sample-specific prose under each artwork; retain “affected exposure,” “no policy published” and the existing below-threshold warning beside the corresponding figures. The three-case chart must never imply a demonstrated recurring problem, failure rate or liability. Do not create a larger synthetic dataset to make the chart look stronger.

### 6. Sources and setup — explain fit

H2: **Bring the records behind each case together**

Introduction: “Use supported connections and imports to bring commerce, support and delivery records into your investigations. See which evidence is available, what is missing and where source information needs attention.”

Retain `CoverageBento` and its adjacent fictional/no-provider-connected caption. Supporting note: “Available records depend on your sources, permissions and retained data. Source status helps distinguish setup from freshness.”

No provider-logo wall, universal compatibility claim, automatic historical import promise or setup-time estimate. Keep provider-specific eligibility and configuration detail in existing onboarding and source surfaces. Do not send unauthenticated marketing visitors directly into protected source settings.

### 7. Closing action — invite exploration

H2: **See how a case comes together**

Introduction: “Follow a request through evidence, policy and a decision, then explore recovery and the simulated financial outcome.”

Primary CTA: **Explore three sample cases** → `/demo`. Secondary CTA: **Create a workspace** → `/signup`. Retain **See current plans and pricing** → `/pricing` and the existing desktop-required supporting sentence.

Preserve header, sign-in and legal destinations. Avoid adding repeated demo buttons to every supporting feature. Retain existing section anchors where their sections survive. Preserve `#workflow`, `#examples`, `#policy-and-patterns`, `#evidence-coverage` and `#get-started`; keep the legacy `#comparison` anchor on the hero section so old fragment links reach the new product overview. Use a new `#recovery-and-finance` ID only for the distinct financial section.

## 4 Implementation owners and sequence

Primary runtime allow-list:

- `app/(public)/landing/page.tsx` — copy, section order, metadata, anchors and composition.
- `app/(public)/landing/_components/LandingBento.tsx` — bounded caption/anchor changes and proven unused-export removal only.
- `app/(public)/landing/landing.module.css` — minimal layout changes for the earlier workflow and three-column supporting features; preserve adopted tokens and identity.

Documentation/reference owners: this document, GLOBAL_RULES.md's existing landing exception, DESIGN.md's landing revision, ARCHITECTURE.md's owner index and the parent implementation plan. Change the existing surface crosswalk or generated inventory only if the affected reference contract requires it. Do not edit legacy unmounted landing implementations or generated visual-authority templates.

Implementation order:

1. Read repository rules and relevant installed Next.js guides; capture the current dirty baseline and exact allowed files. Recheck that the reachable page still matches the inspected composition.
2. Verify the capability statements below and record their supporting owners and evidence limits. Adopt the bounded content revision in the existing authority documents before changing the page.
3. Recompose the existing page using section 3. Keep server rendering and native links; introduce no new client state, API, public type, dependency or data loader.
4. Retain fixture derivation, money formatting and factual captions. Remove redundant landing-only markup without changing the demo.
5. Run the checks below, inspect the rendered page and fix findings in one bounded pass. Record results and remaining gaps in this document and link the receipt from the parent plan without changing unrelated phase verdicts.

No database migration, API/interface change or rollout infrastructure is required. Rollback is the exact task-owned landing diff, preserving the pre-existing dirty baseline. Publishing remains separately authorised.

## 5 Capability and truth checks

These are implementation-entry checks, not claims of full current acceptance. Existing phase receipts may support investigation but do not prove a new build.

| Proposed statement | Inspect the existing owner | Boundary to preserve |
|---|---|---|
| Evidence and customer history in an investigation | Canonical case detail/read models and connected-record routes registered in the surface manifest | Missing and stale records remain explicit; do not imply every provider supplies every record. |
| Comparing and recording resolutions | `lib/claims/decision/resolutionComparison.ts` and canonical case decision controls | Merchant decides; known immediate cost is separate from speculative recovery. |
| Ownership, deadlines and follow-up | `components/work/ExactWorkQueueOperations.tsx` and Work projection/action owners | No automatic external resolution or guarantee that every task has a deadline. |
| Recovery evidence, agreements and handoffs | Canonical recovery detail and claim-preparation owners in the surface manifest | Eligibility is evidenced; preparation is distinct from submission or provider approval. |
| Received payments and reconciliation | `lib/reconciliation/periodReadModel.ts` and canonical financial reads | Received, matched and reconciled remain distinct; no fabricated loss or recovered amount. |
| Policy preview | `lib/rules/impactRead.ts` and `components/rules/RuleImpactPreview.tsx` | Current-evidence comparison; unknown inputs remain uncertain; preview does not publish. |
| Carrier, product, warehouse and reported-issue groupings | `lib/reporting/claimPatterns.ts` and its read owner | Only supported relationships; no inference of responsibility or statistical recurrence from three examples. |
| Connections and imports | Registered source catalogue/read models and existing import owners | Support, configuration and freshness differ; do not promise unverified provider availability. |

If current evidence contradicts a proposed sentence, stop that sentence's adoption and record the precise mismatch here. The task does not authorise implementing a missing product feature to make marketing copy true. Preserve supported independent work.

## 6 Acceptance and delivery

Checks below record this implementation run. Documentation completion, local implementation, rendered acceptance, saved-reference parity and release readiness remain separate verdicts.

- [x] Heading-only reading explains investigation, decisions, recovery/finance, wider operations and source fit in sequence.
- [x] First-screen copy identifies the merchant problem; the early workflow explains the product and supervised boundary before detailed sample decisions.
- [x] All three fictional examples remain available. Every displayed amount, reference and stage agrees with the canonical fixture and demo; no invented performance, liability or provider claim appears.
- [x] The separate preview strip and full comparison chapter are removed; detailed comparison remains available in the demo. Supporting sections add distinct capabilities rather than repeat fixture prose.
- [x] Fictional and simulated labels remain adjacent to illustrations; financial qualifications and recurrence warnings remain readable without hover.
- [ ] Read the rendered page at 1024, 1280 and 1440 CSS-pixel desktop widths, including a 720px and shorter window. Check line wrapping, natural-height columns, artwork labels, sticky-header anchor offsets and reachable actions.
- [x] Check the default rendered desktop heading order, visible links, skip link, fictional/simulated labels and no horizontal overflow. 1024/1440, short-height, 200% zoom, native screen-reader and unsupported-device checks remain open.
- [x] Clicked/inspected the retained case and CTA destinations in the rendered page; no account creation or real workspace mutation was used. Legacy fragment, Back and reload checks remain open.
- [ ] Run scoped lint for changed TSX, `npm run typecheck`, `npm run verify:authority` and `npm run verify:surface-manifest`. Scoped lint, typecheck and surface-manifest passed; authority remains blocked by the pre-existing `.impeccable/design.json` projection drift. Demo regression tests passed 29/29 with the project heap setting.
- [x] Preserved original references and recorded the adopted revised landing expectation. The Impeccable detector and production build passed; saved-reference parity remains planned.
- [x] Reviewed the task-owned implementation diff against the dirty baseline. Exact code/build checks and remaining gaps are recorded below; no inherited app-wide or release pass is claimed.

Editorial comprehension target: a reader can answer who Unauth is for, what records it brings together, what the merchant decides, how follow-up and finance connect, and which external actions stay in existing tools. A human comprehension check may validate this target; agent heading/copy review alone must not be presented as user research.

### Status record

12 September 2026: implemented the bounded landing content revision in `page.tsx`, `LandingBento.tsx`, the existing landing CSS module, and the registered landing/design documentation owners. Default 1280×720 rendered review confirmed the new story and links; 1024×720 and 1440×900 confirmed fit with no horizontal overflow. Local implementation and build evidence are recorded; capability certification, complete visual/accessibility acceptance and release approval remain open. Production build ID: `7dslKUD-CK-KNREQC8l_N`. Source hashes: page `3af2cf73bc25392c57339925dbe9e8ba1445c3d27acc18ac82be5228648e93d9`, bento `618928d8eb2a0b03d30eff0d91b40f5c95a4aae60fbd9ee0dd71e42f14d3ddd0`, stylesheet `00d307d07b021fe566b7b5579e767b7f4a895ee16ec97ddc70b88bb37c3a2e56`.

13 September 2026: replaced only the main hero artefact with the authenticated Asterlane Overview capture. The source is a 3420×1920 PNG from the owner-authorised fictional screenshot account and is shown uncropped in a restrained product frame with an adjacent staging-data label. Rendered checks at 1024×720 and 1440×900 found no horizontal overflow; the screenshot, label and image alternative are present in the accessibility tree. Scoped lint, high-memory typecheck, surface-manifest verification, the Impeccable detector and visual-revision contract tests 7/7 passed. Production build ID: `oUSkQRJc38uT1kzg7hu4C` (109 generated pages). Source hashes: screenshot `ae164dfa34749fa306c3293d04fc118e997630b0e2b47410fbbcef1ca3e74c9a`, page `0bf68e037a4fc5ee66bdc18ccc5b2caf3053cc2a6f3c50876a01be0b24c6ef30`, stylesheet `dfd4928fed13a6b2089a5be908de63da517e3648da998a69eb1cd9ef378cdceb`.

13 September 2026 owner placement follow-up: inspected the live Linear desktop hero at 1440×900 and matched its measured artwork geometry. The landing wrapper now starts at y=526px, spans the viewport, and keeps a centered 1320px product frame with a 60px side inset. The complete Asterlane capture remains uncropped. Rendered checks at 1024×720, 1280×720 and 1440×900 confirmed the corresponding 904px, 1160px and 1320px frame widths, zero horizontal overflow, intact image alternative and staging caption. This CSS-only follow-up uses stylesheet hash `b5544daf49eba0d3eac7cb18574e9458dc9883e3c90ff29f67c752ec5dfabb0a`; the production build receipt above remains the prior capture build.

13 September 2026 owner alignment follow-up: matched Linear's live 1440px hero content relationship by moving the landing headline to x=78px, supporting copy to x=80px, and keeping the product frame at x=60px. The header now uses the same 60px outer alignment, 32px nav controls, padded text targets, divider and compact sign-up action, with accurate Unauth route and section labels (`Product`, `Workflow`, `Cases`, `Pricing`, `Log in`, `Sign up`). Browser checks at 1024×720, 1280×720, 1440×900 and the narrow desktop boundary found no horizontal overflow or header-link overflow; the local 1440px measurements match Linear's y=272 headline and y=526 artwork start. This CSS/label follow-up preserves the existing copy, capture, lower sections and P10 status. Current source hashes: page `9b12d4a9c3674b0e98e1f765c8a2fba2894a75a379bdaf0e8f2301c56d007f76`, stylesheet `484245ccb59ca9fb61d60250d4b01db305d55f6aafbbb14cd9517696fdd1457e`.

Documentation verification: relative document links resolve and scoped diff whitespace checks pass. `npm run verify:authority` failed because `.impeccable/design.json` is not a current descriptive projection of DESIGN.md. The sidecar mismatch remains unresolved and was not repaired incidentally.


### Human and AI positioning correction — 13 September 2026

The owner rejected the human-only interpretation of the gate. PRODUCT.md now records the intended gate before human or external AI action and the full request → evidence/policy → decision/override → responsibility → recovery → financial outcome story. This supersedes the generic hero and earlier gate-copy receipt, not the current Linear geometry or screenshot. Applicable rules: PROD-01/03/05, DEMO-01, TRUTH-01/07, MONEY-03/09/12 and VIS-05.

Evidence reviewed: actor types in `lib/claim-gate/types.ts`; request handling in `app/api/claim-gate/check/route.ts`; shared evaluation in `lib/claims/decision/evaluate.ts`; allowed/blocked action advice in `lib/claim-gate/evaluateRules.ts`; gate reasons and limitations in `lib/claim-gate/buildRecommendation.ts`; human/AI attribution and override records in `lib/accountability/types.ts` and `app/api/loss-sources/[id]/override/route.ts`. `lib/claim-gate/releaseGate.ts` keeps public access gated pending canonical lifecycle adoption. Actor recognition and returned advice do not establish enforcement in third-party tools. No live integration, provider call or consequential operation was exercised.

The landing therefore names people and AI agents in the hero and workflow, while stating “AI-agent gate connections are in pre-launch development. The sample cases demonstrate the supervised workspace workflow.” beside the workflow. Recovery copy now explains responsibility after customer resolution, and policy copy connects proposed rules to affected cases and exposure. No new execution capability or performance claim is introduced.

Validation for this correction: scoped ESLint and source/design/product diff checks passed. Live browser inspection covered the hero and workflow at 1024×720 and 1440×900, recovery at 1280×720, working Workflow/home navigation and matching metadata. No horizontal overflow at those three widths; the 1440px headline remains y=272 and the Overview artefact y=526. The new availability note was aligned with the existing workflow boundary after visual review. Page SHA-256 `7d463966b34188987229d476a099000da6b45989d2dd909e57a1b3ebaccbcbf0`; CSS `6083577a77c8eca7c33b96e1768ddc352fa055a293dc842da5b0275ff860c2aa`. No production build, live agent enforcement test or release approval is claimed. Existing Impeccable sidecar drift remains outside this task.

### Mixed artefact implementation — 13 September 2026

The owner approved a varied product-proof system after reviewing the signed-in workspace. Keep the authenticated Overview as the sole full app view. Add a focused real case-detail crop to the workflow so the evidence gate, matched rule, missing evidence and recommended next step are the dominant proof, with separate human and AI request inputs feeding the same checkpoint. Retain the three canonical fictional cases as smaller custom compositions with different silhouettes. Recompose recovery as a wide, shallow operational board plus a compact financial bridge; make policy the dominant member of an unequal policy/reporting pair; keep source coverage as an open evidence assembly. Every product crop or composition preserves adjacent provenance, fixture-derived money and current capability boundaries. The page does not imply public AI-agent connectivity, provider submission, recovery eligibility, provider approval or realised savings.

Implementation evidence: the reachable landing page now renders all eight ready artefacts in the approved hierarchy. Scoped ESLint, TypeScript, surface-manifest verification, demo-fixture and desktop-support tests 29/29, and scoped diff checks passed. Rendered 1024×720, 1280×720 and 1440×900 checks found no horizontal overflow; saved 1024px and 1440px full-page captures show the loaded gate image and complete varied sequence. The independent finish review returned **SHIP** at this bounded visual contract. Its verdict does not close native accessibility, saved-reference, P10/P12, release or owner-acceptance gates. The Impeccable detector reported only the existing adopted Inter warning; the known sidecar drift remains outside this task.
