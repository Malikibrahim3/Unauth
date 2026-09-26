# Landing upgrade implementation

Date: 18 September 2026  
Status: LU-01–08 implemented locally; verification partial (18 September 2026).  
Target: `/landing`, including its navigation and footer.  
Mode: Persuade — help merchant operations, support, loss-prevention and finance teams understand the evidence gate and choose to inspect a sample case.  
Parent execution authority: [Public experience transformation](PUBLIC_EXPERIENCE_TRANSFORMATION.md).

## Superseded presentation scope — 20 September 2026

LANDING_PRODUCT_LED_IMPLEMENTATION.md now owns `/landing` composition, including
hero scale, section order, compact overview and commissioned original visuals.
The instructions below are historical LU scope; fixture, manual-action, device
and release boundaries remain binding. Other public consumers are unchanged.

## 1. Outcome and authorisation

Implement all eight recommendations from the preceding landing-page review. Keep
the Loop-derived warm ivory, warm paper, charcoal, Unauth orange, Inter, existing
brand marks, bold display statements, rounded controls and generous composition.
The upgrade comes from hierarchy, section composition, concise copy, purposeful
colour changes and consistent interaction quality.

The owner's instruction to ignore the places where artefacts should be is a
scope boundary: this plan commissions no artwork and does not treat missing
artwork as a layout defect. Existing diagrams, evidence visuals, sample facts,
placeholder contents and their identities remain intact.

This request authorises this document and its authority links only. Under
[GLOBAL_RULES.md](../../GLOBAL_RULES.md) SAFE-02, it does not start runtime
implementation. A later instruction to implement this plan authorises its
bounded phases; do not ask again for each already-specified design choice. An
instruction for one named phase covers that phase only. Commit, push, deployment,
provider actions and production release remain outside this plan.

The intended exit is **landing composition and interactions implemented and
locally verified, with existing artefacts preserved and final artwork still a
separate dependency**. It is not full-app acceptance or launch approval.

## 2. Eight required changes

| ID | Requirement | Implementation result | Main phase |
|---|---|---|---|
| LU-01 | More typographic range | Preserve the hero's current scale; distinguish major statements, supporting section titles and ordinary headings; shorten the recovery title. | LU-P1 |
| LU-02 | Deliberate scroll rhythm | Compact workflow, selected split introductions, concentrated evidence explanation and distinct supporting sections. | LU-P1 |
| LU-03 | Less repeated explanation | Shorter marketing copy, larger useful body text, with all consequential qualifications retained beside their claims. | LU-P1 |
| LU-04 | Stronger navigation and actions | Sticky rounded landing header, clear action hierarchy and 50–52px prominent buttons. | LU-P2 |
| LU-05 | Stronger changes of background | Intentional ivory/paper/charcoal sequence and an orange closing CTA with ivory text. | LU-P2 |
| LU-06 | Consistent interactive details | Coherent selection, focus, hover and expansion feedback across sample tabs, operational controls and disclosures. | LU-P3 |
| LU-07 | Deliberate mobile composition | Shorter hero introduction, full-width primary action, organised secondary links, readable stacked sections and truthful desktop handoffs. | LU-P3 |
| LU-08 | A stronger FAQ and footer | Compact left-hand FAQ introduction, right-hand questions, larger existing brand mark and footer alignment with the main grid. | LU-P2 |

All eight are required. Shipping only typography, copy and spacing does not
complete this plan.

## 3. Evidence and starting point

The preceding review inspected the live local landing page at 1440×900 and
390×844, inspected the live [Loop homepage](https://www.loopreturns.com/), and
operated the landing's operational controls. It was a design review, not a full
accessibility, browser or performance acceptance run. Re-capture the before state
at implementation time; the review did not produce a saved acceptance bundle.

Current source confirms the following starting points:

- The reachable route is `app/(public)/landing/page.tsx`; its presentation owner
  is `components/public/public.module.css`.
- `.display` currently caps the hero at 71.604px with weight 900 and .94 leading.
  `.heading` applies a common 58px cap, weight 900 and uppercase treatment to
  nearly every major section. Do not restore an older, larger hero scale.
- The long recovery title wrapped across five lines in the desktop review.
- `.chapter` uses one general spacing treatment. The evidence section repeats
  explanatory copy before its five-input accordion.
- `PublicNav` is in normal flow, uses a rounded raised frame, and makes workspace
  creation its filled action. The hero's filled action is the sample case.
- Shared `.button` controls currently have a 44px minimum height. At 390px, the
  hero paragraph is long and its three actions wrap into two uneven rows.
- The FAQ title is centred above full-width questions. The footer does not use
  the landing's main container alignment. The closing band uses warm paper.
- Existing controls already have keyboard/state handling and some transitions.
  Improve these owners; do not replace them with decorative controls.

Documentation baseline: branch `codex/deployment-readiness-20260826`, HEAD
`640739df7f7e2d5ce3d2230c56065012c37516a6`, with 1,012 dirty/untracked status
entries when this plan was created. HEAD alone does not identify the current
rendered design. LU-P0 must capture a fresh dirty baseline and exact before bytes.

Existing reference provenance remains in the parent plan's construction ledger,
`artifacts/public-experience-2026-09-16/reference/`, and
[Loop interaction study](LOOP_INTERACTION_STUDY_2026-09-16.md). These are dated
evidence. Reinspect any new reference construction before porting it, recording
the URL, selector, timestamp, viewport, rendered HTML, complete relevant CSS,
variables, media queries and dependencies as VIS-11 requires. This upgrade does
not claim to reproduce Loop's source or commission its artwork or choreography.

## 4. Authority and bounded scope

Read [GLOBAL_RULES.md](../../GLOBAL_RULES.md) completely before execution, then
[ARCHITECTURE.md](../../ARCHITECTURE.md), [PRODUCT.md](../../PRODUCT.md),
[DESIGN.md](../../DESIGN.md), the parent plan and the current implementation.
Applicable rules include GOV-01–09, PROD-03/05/07, TRUTH-01–09, MONEY-03/09/12,
SOURCE-01/08, DEMO-01–06, DESK-01–06, VIS-01–15, UX-01/03/06/07/10/11,
ENG-01–07, SAFE-01–06 and TEST-01/03–08.

### Planned revisions to register before runtime edits

This document is a subordinate implementation plan, not a second visual-token or
product authority. The existing active specification continues to describe the
current design until LU-P0 adopts the following bounded changes as part of an
authorised implementation.

| Existing instruction | Planned revision | Adoption owner |
|---|---|---|
| 16 September distinction refinement preserves copy and composition. | Permit the landing-only copy compression and section compositions specified here. Preserve the existing section order and anchors. | `GLOBAL_RULES.md` owner revision; `DESIGN.md`; parent plan |
| Personality refinement gives section headings a uniform uppercase/900 treatment. | Keep bold uppercase major statements; adopt smaller supporting-title roles without flattening the whole page. | `DESIGN.md` |
| Existing header is normal-flow and workspace-led. | Adopt the landing's sticky variant and sample-led action hierarchy. Shared defaults retain their existing behaviour. | `DESIGN.md`; parent construction/deviation ledger |
| Existing closing band uses paper. | Use the existing accent as a large landing surface, with verified text, action and focus contrast. | `DESIGN.md` |
| Shared public owners serve landing, pricing, legal, auth, demo and states. | Add explicit landing presentation variants in those same owners. Do not restyle every consumer to achieve a landing change. | `DESIGN.md`; existing public components |

Record these revisions in the existing documents, not in new global-rule files.
The instruction to implement this plan supplies the bounded design decision;
document it without reopening settled choices. Update any directly conflicting
brand wording in `PRODUCT.md` only if needed, without altering product semantics.
The original Loop evidence and historical receipts remain available as history.

### File allow-list for future implementation

| File | Permitted work |
|---|---|
| `app/(public)/landing/page.tsx` | Landing composition, marketing copy, metadata consistency, section roles and selection of shared variants. |
| `components/public/public.module.css` | Canonical public presentation owner; add scoped landing roles/variants and control feedback. Preserve unrelated defaults and protected visual declarations. |
| `components/public/PublicUI.tsx` | Extend existing `PublicNav`, `PublicLink` and `PublicFooter` with explicit, default-preserving presentation options. Keep `ArtworkSlot` and `AuthShell` behaviour intact. |
| `components/public/PublicInteractions.tsx` | Condense surrounding copy, organise evidence content, and refine existing tab/disclosure presentation and keyboard semantics. Preserve fixture bindings and visual children. |
| `tests/components/publicTransformation.test.tsx` | Extend meaningful interaction/isolation coverage where behaviour changes. Do not write tests that simply assert CSS values or every new sentence. |
| `GLOBAL_RULES.md`, `DESIGN.md`, `ARCHITECTURE.md`, parent plan, this document | Register the bounded revision, construction mapping, status and actual evidence. |
| `.impeccable/design.json` | Refresh the descriptive projection after the adopted design is final; preserve unrelated authority/package metadata. |
| `lib/surfaces/manifest.ts`, `docs/page-inventory.md` | Update the existing landing revision/state projection; regenerate the inventory through its generator. No second route inventory. |
| `PRODUCT.md` | Conditional wording reconciliation only, as described above. |

No new runtime file or dependency is expected. If a necessary new file is found,
record its exact purpose and scope here before creating it; do not introduce a
parallel landing renderer or stylesheet.

### Protected areas

- `PublicEvidenceVisuals.tsx`, `lib/demo/merchantCaseV1.ts`, demo simulation and
  financial logic, artwork assets, `ArtworkSlot` contents/ratios/IDs/descriptions,
  and the hero, case and evidence visuals are read-only for this task.
- Preserve the current `recovery-financial` and `control-0/1/2` placeholders.
  Do not recreate historical placeholder IDs for visuals that have since been
  implemented. Do not remove fictional provenance, replay or reduced-motion
  behaviour from existing visuals.
- Surrounding copy and layout may move an intact visual down the page. Normal
  responsive reflow is allowed. Do not crop, redraw, rescale its internal content,
  change its intrinsic proportions or alter its factual input to fill space.
- `ToolCarousel.tsx` and its logos, category filtering, pause/view-all mechanics
  and pre-launch qualification remain intact. Only its surrounding section is
  recomposed here.
- Do not change global CSS, authenticated/onboarding components, business APIs,
  schemas, credentials, providers, billing, pricing, legal text or auth contracts.
- Do not revive `landing.module.css`, `LandingBento.tsx` or legacy landing
  components as alternative owners. Do not edit generated visual-authority HTML.

## 5. Page composition

Keep the route, main landmark, heading semantics and anchors `workflow`,
`examples`, `evidence`, `recovery`, `controls`, `sources` and `faq`. Preserve this
order. The difference should be visible in a whole-page comparison even when
every artefact region is disregarded.

| Section | Intended composition | Background and hierarchy |
|---|---|---|
| Navigation | Existing rounded floating frame, sticky within the landing page; compact links, one filled primary action. | Ivory, restrained existing shadow family. |
| Hero | Centred current headline; shorter lead; deliberate primary/secondary/tertiary actions; adjacent qualification. Existing hero visual remains intact. | Ivory; the page's largest display type. |
| Workflow | Compact introduction and three readable checkpoints. Retain the desktop connecting rule and ordered mobile sequence. | Warm paper band; supporting heading size. |
| Sample cases | Heading left and short explanation right at wide desktop; existing sample selector and case content below. | Ivory; major section title. |
| Evidence | One integrated introduction: statement and short lead side by side, concise role explanation below, then the existing checks. Remove the second repetitive explanatory lead. | Ivory; major title, subordinate checks heading. |
| Recovery | Short two-clause statement, concise introduction and three clear recovery groups. Keep the disclosure and existing visual. | Charcoal; high-contrast major statement. |
| Operational controls | Split section introduction; retain the existing selector and panels, align explanatory content deliberately and keep visual children intact. | Ivory; supporting title below the major statement tier. |
| Sources | Compact introductory band with a shorter title, brief explanation and the existing tool rail. | Ivory; supporting title, no new logo wall. |
| FAQ | Approximately one-third introduction and two-thirds questions on desktop; stacked on smaller screens. All eight questions remain available. | Ivory; supporting title. |
| Closing CTA | One short display statement, filled contrasting sample action and secondary pricing action. | Existing orange accent surface with ivory headline. |
| Footer | Existing mark enlarged modestly, brand statement and two real link groups aligned to the main container. | Ivory; quiet reading hierarchy. |

Use the existing container width and gutter system. At 1024px, stack split
introductions whenever the columns cannot preserve readable line lengths. Do
not sacrifice text width to retain a desktop pose. On mobile, DOM order and
visual order must agree.

Start major chapter spacing at 96–112px on wide desktop, compact transitions at
56–72px, and mobile chapter spacing at 48–64px. Keep related title/lead/control
groups closer together, usually 20–32px. These are starting layout targets, not
fixed empty heights or a second token catalogue. Final adopted values belong in
`DESIGN.md` and the existing CSS owner. Remove duplicated gaps before adding more
page length. Do not add scroll snapping, pinning sequences or scroll hijacking.

## 6. Typography and copy

### Type roles

| Role | Planned treatment |
|---|---|
| Hero | Preserve the current responsive scale, 900 weight and centred composition; retain two lines at 1440px where the current copy fits. |
| Major statements: cases, evidence, recovery, close | Approximately 44–56px on wide desktop and 30–36px on mobile, weight 900, uppercase, carefully balanced wrapping. |
| Supporting section titles: workflow, controls, sources, FAQ | Approximately 32–40px desktop and 26–30px mobile; retain bold character without competing with major statements. |
| Subheadings and functional headings | Approximately 20–28px according to level, mixed case, clear separation from display type. |
| Section leads | Approximately 18–20px desktop and 16–18px mobile, comfortable leading and constrained reading width. |
| Explanatory body copy | Approximately 16–18px with 1.45–1.6 leading; do not leave key explanations at tiny sizes under huge headings. |
| Qualifications | Readable 12–13px minimum in the edited marketing copy, with sufficient contrast. This does not restyle protected artefact labels. |

Retain Inter and existing IBM Plex Mono uses. Do not introduce a replacement font,
thin display style, decorative outline type or new icon family. Heading levels
follow document structure independently of visual size. Use deliberate clause
breaks; avoid isolated words such as the current recovery title's standalone
“end”. Check real wrapping at every required width, not just a design canvas.

### Planned copy

The following supplies the implementation's copy direction. Small adjustments
for natural wrapping are allowed if they preserve the same claim and boundary.
Keep the current hero headline exactly. Do not rewrite fixture facts or legal
content to meet a word-count target.

| Placement | Planned wording or instruction |
|---|---|
| Hero headline | “Make refund and replacement decisions with confidence.” |
| Hero lead | “Check claim evidence against your rules. Record the decision, then follow recovery and the financial outcome—whether your team or an AI agent handles the request.” |
| Hero qualification | Retain “Merchant-controlled decisions today. AI agent connections are pre-launch.” immediately beside the hero proposition/actions. |
| Workflow title | Retain “Know what happened. Decide what’s next. Follow the money.” at the supporting title scale. |
| Workflow explanations | One short explanation per checkpoint: assemble evidence and expose gaps; compare permitted options and record the merchant decision/override reason; prepare eligible recovery and trace the financial result. |
| Workflow execution boundary | Retain the clear statement that refunds, replacement orders and provider claims are completed in the merchant's existing tools. |
| Cases title | Retain “The right next step depends on the evidence.” |
| Cases lead | “Explore three claims and the evidence behind the next step.” Follow with the visible fictional-case/illustrative-GBP qualification; preserve each case's own provenance. |
| Evidence title | Retain “Your team or AI. Your evidence. Your rules.” |
| Evidence lead | “See which evidence and policy support the next step, what is missing and who owns the decision.” |
| Role explanations | Your team reviews and decides, recording override reasons. Unauth checks evidence against rules and explains recommendations/gaps. External AI connections are intended to use the same checkpoint and remain pre-launch/access-controlled. |
| Recovery title | “Resolve the claim. Follow the money.” |
| Recovery lead | “Keep investigating after the customer is helped. Check eligibility, prepare recovery and track what is actually received.” |
| Controls introduction | Keep “Keep every next step owned.” with a short lead about follow-up, policy review and investigating recurring losses. Avoid repeating the heading verbatim in the default panel. |
| Sources title | “Evidence from the tools you use.” |
| Sources lead | “Bring available commerce, support, fulfilment, delivery and payment records into the investigation. Keep missing or stale information visible.” Preserve the rail's separate planned-integration qualification. |
| FAQ introduction | “Practical questions.” followed, if needed, by one sentence about decisions, availability and getting started. |
| Closing title | Retain “See what changes when evidence comes first.” |
| Footer statement | Retain “Evidence before the decision. Accountability through the outcome.” |

Aim for roughly 25% less repeated marketing explanation across the hero, workflow,
evidence/roles and section introductions combined. Record before/after word counts
for that same set of nodes. Exclude fixture text, artefact content, required
qualifications, detailed disclosures, FAQs and legal links from the comparison.
The percentage is an editorial target, not permission to delete necessary truth.
Report a smaller reduction honestly if preserving meaning requires it.

Retain distinctions between recommendations and decisions, source association and
liability, eligibility and approval, approval and money received, receipt and
reconciliation, and remaining loss and proven savings. Keep AI availability,
fictional examples and planned integrations visible beside the corresponding
claims. FAQs may expand the explanation; they must not be the only place where a
headline claim is qualified. Keep pricing details in the existing pricing owner.

Update the landing's metadata from the same approved story. If metadata mentions
AI agent connections, include their pre-launch status in that metadata; it cannot
rely on a qualification visible only in the page body.

## 7. Header, actions, colour and footer

Implement presentation variants in the existing shared components. An explicit
landing variant on `PublicNav`/`PublicFooter` and a prominent/inverse option on
`PublicLink` is sufficient; equivalent small APIs are acceptable. Preserve
default render output for non-landing consumers. Do not add pathname-dependent
global CSS, duplicate components or a second public theme. Keep the landing page
server-rendered, with interactive code confined to the existing client owners.

- Use CSS sticky positioning for the landing header. Preserve its rounded frame
  and restrained shadow. Maintain its flow height so it causes no jump on scroll.
  Verify ancestor overflow and the public/device boundary before assuming it
  can stick. Bound the expanded mobile menu within the viewport and keep every
  link reachable in short windows.
- Keep How it works, Sample cases and Pricing. Keep both Sign in and Create a
  workspace discoverable. Make Try a sample case the filled landing navigation
  action; workspace creation becomes a quieter link. Do not proliferate CTAs.
- Hero: prominent sample action, secondary workspace action, tertiary See the
  data link. Close: prominent sample action and secondary Explore pricing.
  Preserve destinations and use the canonical `demoUrl` helper for case entry.
- Prominent hero/closing buttons use a 50–52px minimum height, around 15–16px
  labels, generous horizontal padding and the existing pill silhouette. Header
  actions can remain more compact while retaining at least 44px hit targets.
- Use existing `--public-*` colour roles. Introduce no new palette. The paper
  workflow band, charcoal recovery section and orange close are distinct chapter
  signals; ordinary reading areas remain warm ivory.
- On the orange close, use ivory headline text and a contrasting ivory primary
  button with charcoal text. The secondary action and all hover/focus states must
  remain legible against orange. Do not place an orange button on orange or rely
  on colour alone to distinguish actions.
- Use the existing footer lockup, approximately 44–48px high on desktop and
  32–36px on mobile. Align footer content and bottom rule with the same container
  as the landing. Retain Explore Unauth, Legal & data, all current destinations
  and the desktop-use notice. No newsletter form, invented trust badges, social
  links, customer logos or new claims.

## 8. Interaction and responsive contract

### Controls and motion

Preserve the three sample cases, five evidence checks, three operational controls,
eight FAQ questions, recovery disclosure and their actual content changes.

- Sample tabs retain roving focus, ArrowLeft/ArrowRight and Home/End behaviour,
  selected state and correct tab/panel relationships. The selected case link must
  still enter that case at Inspect; selecting a preview must not write progress.
- Operational tabs retain their current content mapping. Match keyboard semantics
  to orientation: Up/Down for a vertical list, Left/Right for a horizontal list,
  plus Home/End. Expose the corresponding orientation to assistive technology.
- Evidence checks keep exactly one input open and continue selecting the matching
  existing evidence visual. The FAQ keeps at most one answer open and allows
  closing it. A visual transition must not desynchronise `aria-expanded`, expose
  hidden focusable content or leave stale text visible.
- Standardise control feedback around 150–180ms for hover/focus colour changes
  and 180–240ms for selection/answer transitions. Use one short easing family and
  small optional arrow movement. No bouncing, continuous section animation or
  scroll-triggered hiding of essential copy.
- Animate the edited control/explanation layer only. Do not add another animation
  to protected visual children or change their replay/selection inputs. Avoid
  moving surrounding content unnecessarily; never use fixed heights that clip
  long answers, zoomed text or translated browser text.
- Under reduced motion, state changes remain immediate and fully readable.
  Focus rings remain visible on ivory, paper, charcoal and orange. Hover has an
  equivalent focus treatment; touch users do not need hover to discover content.

### Responsive behaviour

- At 390px, use one full-width hero primary action and a deliberate secondary
  link row beneath it. Allow that row to stack if enlarged text requires it.
  Preserve at least 44px targets and readable separation.
- Shorten the hero lead rather than shrinking its type to fit a desktop layout.
  Keep headline clause breaks natural and qualification visible before leaving
  the hero's explanatory content.
- Stack section introductions, workflow steps, FAQ columns and footer groups in
  reading order. Retain usable horizontal tab overflow where needed; the page
  itself must not overflow horizontally.
- Check 768px as its own composition, not merely an enlarged phone. At 1024px
  retain desktop workflow access but choose stacked marketing layouts where
  necessary. Do not alter the existing device-classification policy.
- Sticky navigation must not cover anchor targets, focused controls, skip-link
  destinations or the content of an expanded menu. Resolve scroll offsets from
  the actual header height at each breakpoint, including zoom and short heights.
- Mobile sample, signup and sign-in links continue through the existing desktop
  handoff. Preserve case/step/return/plan context. Pricing, research and legal
  pages remain readable on mobile. Do not mount functional demo/auth flows behind
  a notice, collect an email or claim that an email has been sent.

## 9. Execution phases

| Phase | Work and required evidence | Exit |
|---|---|---|
| LU-P0 — baseline and adoption | Capture branch, HEAD, dirty status, exact before bytes and hashes. Capture rendered desktop/mobile baseline and control states. Verify reachable owners and shared consumers. Register section 4's bounded revisions in existing authorities. Read installed Next.js guides for the files to be changed. Inventory artefacts and protected selectors. | A reproducible baseline, explicit scope and reconciled design decision; no unrecorded override. |
| LU-P1 — hierarchy, composition and copy | Implement LU-01/02/03 together. Use the section blueprint and copy table; maintain anchors, order and artefact children. Record copy counts and the adopted type/spacing roles. | Complete static page composition and accurate copy, ready for chrome/interaction work. |
| LU-P2 — navigation, surfaces and ending | Implement LU-04/05/08 through explicit shared variants. Add sticky landing navigation, action hierarchy, paper workflow, orange close, split FAQ and aligned footer. | Every specified chapter and action has its intended presentation; shared defaults remain intact. |
| LU-P3 — controls and responsive behaviour | Implement LU-06/07; complete responsive styles, selection feedback, keyboard semantics, reduced motion and sticky/menu offsets. Reuse current state owners and fixture inputs. | All eight requirements implemented in source; no local acceptance claim yet. |
| LU-P4 — acceptance and handoff | Run section 10's checks, one batched visual review, one consolidated repair batch and at most one confirmation pass. Update existing manifest/inventory and descriptive design sidecar; record actual outcomes and remaining gaps. | All scoped acceptance items have explicit evidence or an honestly reported unresolved status. |

Do not freeze a half-finished phase as successful to fit a time budget. If only
one phase was requested, stop at its exit and report the remaining phases. For
an instruction to implement the whole plan, continue through LU-P4 without
repeated approvals for the already-defined work.

Refresh `.impeccable/design.json` from the final adopted `DESIGN.md` and actual
implementation using the Impeccable document refresh workflow. This is a targeted
projection refresh, not permission to replace `DESIGN.md`, drop its history or
rewrite unrelated authenticated design. Preserve the visual-authority package
record and contract metadata; updating the source hash alone is not a refresh.

## 10. Acceptance and verification

### Requirement checks

| ID | Observable acceptance |
|---|---|
| LU-01 | Hero keeps its current scale; major and supporting headings are visibly distinct. Recovery uses the short title without isolated-word wrapping at desktop. Useful body copy is readable without magnification. |
| LU-02 | Whole-page inspection shows the specified compact workflow, split introductions and concentrated evidence section. Order/anchors remain; blank artefact regions are excluded from the judgement. |
| LU-03 | Before/after counts cover the same marketing nodes. Duplication is reduced, the narrative remains understandable without interaction, and every adjacent truth qualification survives. |
| LU-04 | Header remains available through the landing, primary sample entry is clear, all destinations remain reachable, and sticky chrome never hides focus or anchor targets. |
| LU-05 | Workflow/recovery/close use the planned paper/charcoal/orange roles. Text, actions and focus indicators pass contrast checks in every edited state. |
| LU-06 | All tab/disclosure states work by pointer and keyboard, preserve their content mapping, and remain usable with reduced motion. No preview persistence or external action is introduced. |
| LU-07 | At 390/768px the hero actions and section reading order are deliberate, no page overflow occurs, and existing desktop handoffs preserve destination context. |
| LU-08 | FAQ uses the desktop split and mobile stack; all eight questions remain. Footer uses the main grid, larger existing mark and all real legal/navigation links. |

### Rendered matrix

Capture and inspect the entire landing, not just its first viewport:

- Desktop: 1024×720, 1280×720, 1440×900 and a 1280×600 short-height pass.
- Responsive marketing: 390×844 and 768×1024. Use actual mobile-device emulation
  when checking the device handoff; viewport width alone is not that proof.
- 200% browser zoom, keyboard-only navigation, visible focus, reduced motion,
  long FAQ content and expanded mobile navigation. Record which browser was used.
- Every sample selection, each evidence input, every operational tab, one full
  FAQ open/close cycle plus access to all questions, and the recovery disclosure.
- Direct hash entry and header navigation to workflow/examples; Back/Forward
  behaviour after navigation; sample entry and the intended case/Inspect URL.
- New colour pairs: WCAG AA contrast of at least 4.5:1 for normal text, 3:1 for
  large text and relevant UI boundaries/focus indicators. This does not establish
  full accessibility conformance or expand inherited contrast exceptions.

Inspect shared consumers before finalising the implementation: `/landing/data`,
`/pricing`, all four public legal pages, `/login`, `/signup`, reset/shared public
states, `/demo` and the desktop-required notice. Compare unchanged default
variants with equivalent before states. Do not submit auth, billing or provider
actions for a presentation regression check. Confirm protected authenticated and
onboarding styles through the unchanged dependency boundary and an existing
read-only local rendered session when available; report unavailable proof.

Use the currently available browser tooling for live review. A stitched full-page
capture with repeated/blank bands is not evidence of a runtime defect; confirm
with viewport captures and the rendered DOM before reporting one.

### Code and document checks for implementation

Use the repository's existing commands and focused tests. The following commands
were present when this plan was written; recheck scripts at execution time:

```sh
npm run typecheck
npx eslint 'app/(public)/landing/page.tsx' components/public/PublicUI.tsx components/public/PublicInteractions.tsx
npm test -- --runInBand tests/components/publicTransformation.test.tsx tests/components/desktopRequiredBoundary.test.tsx
npm run verify:surface-manifest
npm run generate:page-inventory
npm run verify:authority
```

Run the Impeccable detector once over the changed markup owners after the complete
UI is ready, and classify genuine findings versus false positives. Use the loaded
skill's current `scripts/detect.mjs` path. Do not repeatedly scan or add tests that
only mirror cosmetic implementation details.

Run the production build with the existing repository build/isolated-output
procedure while preserving the active preview. `npm run build` is the current
package entry point; inspect the local runner and output-directory policy before
using it. Record the exact invocation, output and exit status. A compile message
without build completion is not a pass. Preserve baseline generated-file changes.

The existing Playwright configuration has global auth setup and teardown. Do not
run the whole E2E suite blindly for this public presentation task. Inspect fixture
effects first and use a bounded local route/interaction run; if the available
browser cannot emulate a required condition, report that check as unverified.

### Evidence and completion record

Keep one dated run directory under `artifacts/landing-upgrade/` with before bytes,
baseline hashes, viewport/state captures, any new reference extraction, exact
commands/results, copy comparison, changed-file diff and acceptance receipt.
These are verification artefacts, distinct from the excluded page artwork.

Update this plan's status and the parent plan's receipt from that evidence. Keep
implementation, visual/behavioural acceptance, protected-surface regression,
artwork readiness and release status separate. Do not replace old references
with the new render to manufacture parity or call the new look exact Loop code.
If a regression requires reverting this task, use the saved before bytes and
review intervening changes; never reset the dirty repository to HEAD.

## 11. Current status and known dependencies

| Area | Status when the plan was created |
|---|---|
| Implementation document and eight-change coverage | Prepared; documentation validation receipt below. |
| LU-P0–LU-P4 runtime work | Not started. |
| New rendered/interaction/build acceptance | Not run; this turn changes documentation only. |
| Artefact creation/replacement | Excluded from this task. |
| Final artwork / broad public transformation gates | Existing outstanding work; this plan does not close it. |
| Commit, deployment and release | Not authorised by this document request. |

`npm run verify:authority` was run before editing this document and reported five
existing issues: a stale `.impeccable/design.json` projection of `DESIGN.md`, two
references to the missing P12 `ui-forensics/report.md`, and two references to the
historical `linear-landing-revision-7-september-2026` heading. The sidecar refresh
is covered above. Missing historical evidence must not be fabricated or silently
removed to obtain a green check; report inherited failures separately from new
regressions. They do not prevent this bounded document from being written.

### Documentation-only validation receipt

Completed 18 September 2026:

- All eight LU-01–08 requirements have implementation targets and individual
  observable acceptance criteria; LU-P0–P4 are present.
- All seven local Markdown links in this plan resolve. The architecture index
  and parent public plan both register this document.
- Exact before/after review of the two existing documents confirms only the
  intended authority row and planned-follow-up section were added by this task.
- Eleven snapshotted runtime, fixture and existing contract files are unchanged.
  The new document's whitespace/fence checks and scoped existing-document
  `git diff --check` passed.
- The post-write authority check reports the same five baseline issues listed
  above, with no new authority error.

Only this document, `ARCHITECTURE.md` and the parent public plan were edited.
No runtime tests, new browser acceptance or production build were run for this
documentation-only change. No runtime acceptance is claimed by this receipt.

### Runtime implementation receipt — 18 September 2026

The owner instructed implementation of this plan. All eight changes are now
present in the existing landing/public owners, with explicit default-preserving
variants. LU-P1/P2/P3 source work is complete; LU-P0 saved desktop baseline and
LU-P4 acceptance remain partial. This supersedes the planning-only status above.

Evidence: [dated receipt](../../artifacts/landing-upgrade/2026-09-18/receipt.md),
exact before bytes, baseline hashes, task diff, copy counts and command/browser
results in the same directory. Copy is 233 → 154 words (33.9% reduction).
Typecheck, scoped lint, 19 tests, surface manifest and the detector passed.
Six live viewport widths showed no page overflow; all sample/evidence/control/
FAQ selections and sticky-menu/anchor checks passed. Protected source hashes and
pre-existing CSS declarations are unchanged. New colour pairs pass AA.

Build was interrupted at compilation (exit 130), without a build pass. Authority
verification retains four inherited broken links. Full-page stitching affected
some captures; native zoom, mobile-device emulation, complete reduced-motion and
protected/auth/shared-state rendered acceptance remain unverified. See the receipt
for precise evidence limits, including the overwritten desktop before capture.
The sidecar was substantively refreshed; generated Next files restored exactly.
Final artwork, broad transformation acceptance and release gates remain open.

## Landing palette refinement — 18 September 2026

The subsequent owner instruction adopts neutral white, graphite and bright orange
for `/landing`, superseding earlier warm-palette/orange-closing requirements on
that route only. DESIGN.md owns the exact roles. Composition, content, assets,
behaviour and other consumers are preserved. Verification is recorded in
`artifacts/landing-colour/2026-09-18/receipt.md`; earlier broader acceptance gaps
remain open.

## Scroll journey — 18 September 2026

Owner-authorised original circular workflow replaces the previous three static
checkpoints at #workflow. DESIGN.md#landing-scroll-journey--18-september-2026
supersedes that composition requirement. Local scroll, responsive and source
verification is recorded in artifacts/landing-journey/2026-09-18/receipt.md.
Earlier broader acceptance and production-build limitations remain open.

Journey amplification follow-up: larger segmented orbit, central explanation and direct stage navigation implemented. Current local evidence: `artifacts/landing-journey/2026-09-18/refinement/receipt.md`. Earlier journey imagery is retained as baseline evidence.

Merchant-explanation follow-up supersedes centre-paragraph journey presentation: detailed left-side stages, brief chart takeaways and illustrative local source logos. Current evidence: `artifacts/landing-journey/2026-09-18/merchant-explanation/receipt.md`. Broader acceptance gates remain unchanged.

## Landing gate and source explanation — 18 September 2026

The owner's subsequent clarification restores the pre-action evidence gate as the
landing's primary product story, followed by decision accountability,
investigation, recovery and financial reconciliation. SourceEvidenceMap replaces
the landing carousel with five evidence families and specific source
contributions. Current review, planned AI connections and integration-dependent
enforcement are distinguished explicitly. Current bounded verification:
[gate story receipt](../../artifacts/landing-gate-story/2026-09-18/receipt.md).
Earlier production-build and broader transformation acceptance gaps remain open.

Whole-story gate follow-up: the owner makes the gate the organising idea of the
entire landing. Journey, source evidence, example recommendations, merchant
oversight and downstream accountability now explain one checkpoint and its
consequences. Section order changes within existing anchors. Current receipt:
[whole gate story](../../artifacts/landing-gate-story/2026-09-18/whole-story/receipt.md).
Broader build and release gaps remain unchanged.

Cleaner gate ring follow-up: the owner's Loop reference replaces the text-heavy
workflow sidebar with a centred continuous ring and five short perimeter
statements. Gate meaning, source detail elsewhere, native scrolling and static
reading remain. [Local receipt](../../artifacts/landing-journey/2026-09-18/clean-ring/receipt.md)
records final desktop/mobile and native-scroll verification. Broader gates remain open.

Hero texture and ring polish: owner-requested understated patterned paper hero
and clearer ring states are implemented locally. [Dated receipt](../../artifacts/landing-polish/2026-09-18/receipt.md)
records desktop/mobile, five-width bounds and contrast checks. Broader gates remain open.
