# Architecture and authority index

Status: current authority index, updated 6 September 2026. Deployment evidence
retains its own dated verdict in the registered status documents.

This is the index, not a second product specification. Each concern has one
binding owner. [GLOBAL_RULES.md](GLOBAL_RULES.md) supplies the permanent app-wide
constraints and conflict-resolution order for all owners. Historical plans,
screenshots, completion reports, and local tool state are evidence only.

## Canonical owners

| Concern | Binding owner | Projection or boundary |
|---|---|---|
| Public presentation replacement | `docs/product/PUBLIC_EXPERIENCE_TRANSFORMATION.md` | Historical Loop-derived rollout and provenance, superseded for current public styling by the 23 September Ramp-led cross-surface alignment in `DESIGN.md`. Product and release boundaries persist. |
| Landing upgrade execution plan | `docs/product/LANDING_UPGRADE_IMPLEMENTATION.md` | Subordinate plan for eight landing hierarchy, copy, navigation, colour, interaction, responsive and footer improvements. Artefact content is excluded. Owner authorised implementation 18 September 2026; LU-01–08 implemented locally with partial verification; dated receipt in the plan; the public transformation remains the parent authority. |
| Product-led landing rollout | `docs/product/LANDING_PRODUCT_LED_IMPLEMENTATION.md` | Owner-authorised 21 September 2026 Ramp composition: flat navigation, broad hero/workspace stage, 2+3 product media grid, evidence assembly and alternating chapters. Existing public owners and canonical facts; independent rendered review required. The 20 September split hero is superseded. Product and release boundaries persist. |
| Landing merchant-story follow-up | `docs/product/LANDING_MERCHANT_STORY_IMPLEMENTATION.md` | Owner-commissioned follow-up, 21 September 2026: fragmented-source positioning, qualified source-app examples, artefact clarity, local provenance, accessibility and evidence-backed availability. The subsequent Customer decisions refinement replaces its blurry app crop with a canonical fictional HTML/SVG artefact. Subordinate to the active Ramp presentation and existing product owners; dated evidence in artifacts/landing-merchant-story/2026-09-21/receipt.md and artifacts/landing-decision-artifact/2026-09-21/receipt.md. |
| Landing app-story implementation follow-up | `docs/product/LANDING_APP_STORY_IMPLEMENTATION.md` | Implementation authorised 21 September 2026. Current first-time-merchant narrative, app-specific artefact, concise disclosure and current-offer work within the preserved Ramp composition. Earlier landing receipts remain scoped historical evidence; product, capability and release owners are unchanged. Current completion is recorded in the plan and its separate receipt. |
| Landing merchant-impact implementation follow-up | `docs/product/LANDING_MERCHANT_IMPACT_IMPLEMENTATION.md` | Records the 24 September local clarity revisions, including revision-5 compression. The subsequent owner-requested `docs/product/LANDING_MERCHANT_STORY_RESEARCH.md` is supporting research and a proposed broader merchant-benefit narrative, not a new product authority or implemented revision. Product/design owners, minimum-9 acceptance, merchant validation and publication retain their separate roles. |
| Landing forensic art direction (historical presentation) | `docs/product/LANDING_FORENSIC_IMPLEMENTATION.md` | Owner-requested 23 September landing presentation revision: genuine Overview hero, original gate/evidence/finance compositions, concise source-to-case map and supervised action wording. Its visual choices are now superseded by the owner’s polished landing restoration below. `GLOBAL_RULES.md`, `DESIGN.md`, public components and canonical fixture retain their respective ownership; local status is not release approval. |
| Permanent app-wide product, design, safety, engineering, and verification constraints | `GLOBAL_RULES.md` | Read before every IDE task via `AGENTS.md` and `CLAUDE.md`; all domain owners comply with it. Documentation adoption is not runtime acceptance. |
| Merchant clarity and desktop overhaul execution | `docs/product/MERCHANT_CLARITY_IMPLEMENTATION.md` | One phased plan combining F01–F48, C001–C180, and the earlier decision-workflow requirements; cannot weaken global rules or grant release approval. |
| Landing content revision | `docs/product/LANDING_CONTENT_IMPLEMENTATION.md` | Subordinate P10 content implementation record, 12 September 2026; implemented locally with scoped rendered/build checks. Broader visual, accessibility and saved-reference gates remain open; it does not supersede global/design constraints. |
| Product semantics, evidence, money, permissions, provider truth | `PRODUCT.md` | The 23 September owner vision adopts a connected authenticated MVP target: claim intake, policy gate, exact authorised resolution, eligible recovery and verified money for a declared supported setup. RCV-01–06, POL-01, EXE-01–03, FIN-01 and DAT-01 are intended contracts; MVP-01–08 and T01–T32 are delivery and acceptance obligations. `GLOBAL_RULES.md` governs current versus gated external execution. The current implementation plan maps these to existing domain owners and reports evidence; target scope is not released capability. |
| Visual identity, scoped composition, archive provenance and styling | `DESIGN.md` | Records the Ramp-led alignment of public, authentication and authenticated surfaces, including the 24 September below-hero artefact refinement. Supplied visual markup remains the operational geometry and content baseline; `lib/surfaces/manifest.ts` maps every page to a canonical route. |
| Visual source crosswalk, page/state ownership, and requirement-to-scenario projection | `lib/surfaces/manifest.ts` | Projects the supplied package and scoped revisions; planned scenarios are obligations, not runtime proof. F/C/M wording and delivery phases remain in the current plan. Historical cutover phase fields do not authorise new replacement. Generated page inventory and acceptance ledgers are descriptive evidence only. |
| Canonical URLs and route permissions | `lib/navigation/appRoutes.ts` | Route names, permissions, and URL-backed state. |
| Compatibility redirects | `lib/navigation/aliases.js` | Redirect table only; it does not own page routes. |
| Redirect delivery and rewrites | `next.config.js` | Consumes the redirect table and owns framework rewrites. |
| Merchant-ready MVP+ scope | `docs/product/MVP_PLUS_SCOPE.md` | Scope is bounded by the selected certification profile. |
| Provider identity and lifecycle maturity | `lib/integrations/registry.ts` | Provider metadata and lifecycle only. |
| Executable provider adapters | `lib/connectors/registry.ts` | Runtime adapter catalogue; intentionally separate from lifecycle. |
| Controlled connector action intent and replay | `lib/connectors/actions/execute.ts`, `connector_action_runs` | Persist and claim an exact action before a bounded provider call; retain ambiguous results for verification. This is a safety foundation, not proof that refund, replacement or claim submission is supported. |
| Plans, entitlements, credits, billable events | `lib/billing/plans.ts` | Current Core/Scale/Enterprise offer and historical plan records; pricing and saved plan requests derive from this catalogue. Provider checkout and incident-capacity enforcement remain separately gated. |
| Environment contract | `lib/utils/env.ts` | `.env.local.example` documents the contract and test-only additions. |
| Permissions and role vocabulary | `lib/permissions/constants.ts`, `lib/permissions/roles.ts` | Consumers import values; no route-local copies. |
| Notification vocabulary | `lib/notifications/kinds.ts` | Notification projection and UI labels derive from this module. |
| Claim and case state transitions | `lib/claims/statusMachine.ts`, `lib/cases/stateMachine.ts` | Claim status and multi-axis case state remain distinct. |
| Claim-rule evaluation, current-evidence preview and versioned publication | `lib/rules-engine.ts`, `lib/rules/store.ts`, `lib/rules/impactRead.ts` | Shared pure interpretation; transient signed previews; source/configuration revision and atomic publication guards in `supabase/migrations/20260906200000_merchant_clarity_p08_policy_preview.sql`. Preview reads never persist business or billing events. |
| Evidenced submitted-case patterns and exact export scope | `lib/reporting/claimPatternRead.ts`, `lib/reporting/claimPatterns.ts`, `lib/reporting/export.ts` | Bounded tenant reads, canonical origin references, non-additive counts and unallocated money; existing case investigation owner retains writes. |
| Authenticated Asterlane screenshot fixtures | `lib/demo/screenshotAccount.ts` | Exact merchant ID plus server-owned demo flag; read-only illustrative source activity and context, never provider or money mutation. |
| Public fictional case facts, launch sequence and browser-local simulation | `lib/demo/merchantCaseV1.ts` | `DEMO_LAUNCH_STORY` owns the fully built landing case, policy, setup, dated recovery and money sequence. `DEMO_CASES` and browser-local progress separately own the safe interactive simulation. Neither performs live mutation or business persistence. |
| Money formatting and canonical aggregates | `lib/utils/format.ts`, `lib/financial/canonicalAggregates.ts` | Integer minor units and currency scope remain explicit. |
| Database history and ordering | `scripts/release-migration-manifest.mjs`, `supabase/migrations/` | Applied migrations are immutable history. |
| Capability evidence and external release blockers | `docs/product/CAPABILITY_STATUS.md`, `docs/product/MR6_HANDOFF.md` | These documents report status; they cannot grant release approval. |
| UX9 acceptance status | `docs/product/UX9_STATUS.md` | Implementation and independent rendered acceptance are separate. |
| Deployment-candidate evidence | `docs/product/DEPLOYMENT_READINESS.md` | Repository readiness only; MR1/MR6/legal gates remain external. |
| Current full-app acceptance execution | `docs/product/MERCHANT_CLARITY_IMPLEMENTATION.md` | P12 owns current acceptance; historical closure documents supply reusable fixture methods and dated evidence only. |

## Non-negotiable boundaries

- Preserve HTTP routes, request/response contracts, database values,
  permissions, audit effects, redirects, and truth semantics unless a duplicate
  is proven obsolete and the affected gates pass.
- Recommendations, merchant decisions, provider actions, provider responses,
  recovery states, and ledger outcomes are separate records and projections.
- Unknown, unavailable, partial, stale, mixed-currency, and verified-zero
  values remain distinct; missing data never becomes a fabricated zero.
- `DESIGN.md` owns one Unauth identity with explicit surface scopes under
  `GLOBAL_RULES.md` VIS-01–15: the Ramp-led landing palette and controls now
  extend to account entry and app pages while operational geometry remains.
  Public components/tokens stay scoped; the app uses its existing render boundary.
  Historical reference mixtures and old
  acceptance documents cannot override the current scope or device policy.
- Responsive marketing applies to landing, pricing and public legal only.
  Desktop-only support applies to authentication, onboarding, demo and merchant
  workflows. Device notices, compact desktop layouts, and
  desktop magnification follow the global contract; current code compliance
  must be verified through the implementation plan.
- Supabase migrations are append-only history. A later migration may repair or
  supersede behaviour but never deletes an applied migration.

## Documentation rules

Current instructions link to the owners above. Archived plans may be linked
only as explicitly labelled evidence or reusable verification methods. The page
inventory is regenerated from the manifest. Any new binding concern must first
be assigned one owner here; duplicate authority claims are a verifier failure.

The supplied archive remains an external input to verification and is not a
runtime dependency. Its recorded checksum must match the package used to build
the source-derived implementation.

Landing colour refinement (18 September 2026): DESIGN.md#landing-palette-refinement--18-september-2026 owns the landing-only token roles in the existing public CSS module; the landing upgrade plan records verification.


### Landing scroll journey — 18 September 2026

Historical presentation record: the 20 September product-led landing revision supersedes its `/landing` geometry, ring, type and artwork-preservation instructions. Product truth remains binding.

The owner commissions an original scroll-driven circular Unauth workflow at
`/landing#workflow`, replacing the three static checkpoints. This revises the
previous workflow composition freeze under GOV-07 and VIS-05/14, preserving the
hero and all other existing visuals. LandingJourney.tsx and the existing public
CSS module own the presentation. A substantial segmented graphite orbit with orange progress
traces claim, evidence, merchant decision, eligible recovery and financial outcome.
It is a conceptual workflow, not a metric or guaranteed successful recovery.
Native scrolling pins the stage below navigation on sufficiently large screens,
then releases it; reverse scrolling rewinds. No wheel interception or body lock.
Mobile, short windows, reduced motion and no-JavaScript show the full static
ordered explanation. A skip link reaches the next section. Product execution
boundaries and money-stage distinctions remain unchanged. Evidence and current
verification: artifacts/landing-journey/2026-09-18/receipt.md.

The owner’s follow-up amplifies this same journey: the current explanation sits
inside the larger orbit, stage names form direct navigation, and each checkpoint
changes state with the scroll. Existing copy, palette and native-scroll/reduced-
motion boundaries persist. Refinement evidence: artifacts/landing-journey/2026-09-18/refinement/receipt.md.

Merchant explanation refinement: the owner now requests detailed merchant-facing
explanations on the left, replacing the centre paragraphs and bare stage names.
Each stage describes inputs, Unauth’s role and the practical result. The circle
retains a short takeaway. Existing local source-system logos illustrate record
types only, with adjacent availability qualification; no partnership or universal
connection claim. Original motion, palette and static fallbacks persist. Evidence:
artifacts/landing-journey/2026-09-18/merchant-explanation/receipt.md.


### Landing gate-first correction — 18 September 2026

Historical presentation record: the 20 September product-led landing revision supersedes its `/landing` geometry, ring, type and artwork-preservation instructions. Product truth remains binding.

The owner explicitly restores the gate as the public entry point: proposed human
or AI actions are checked against evidence and merchant rules before proceeding.
This supersedes recent generic case-management journey copy and the hero copy
freeze, not PROD-03/07 or actual release constraints. Landing must also clearly
explain investigation, decision/override accountability, Work ownership, recovery,
reconciliation and policy/pattern review. An illustrative source map replaces the
unexplained landing logo carousel, linking each record family to the question it
helps answer. Preserve the current palette, geometry and scroll journey. Logos
are source examples, not partnership or universal connection claims; Stripe
merchant evidence remains planned, distinct from subscription billing. Current
merchant review, pre-launch AI connections and integration-dependent enforcement
must remain explicit. Evidence: artifacts/landing-gate-story/2026-09-18/receipt.md.


### The gate as the whole landing story — 18 September 2026

Historical presentation record: the 20 September product-led landing revision supersedes its `/landing` geometry, ring, type and artwork-preservation instructions. Product truth remains binding.

The owner's follow-up makes the gate the organising idea of the entire landing,
not an entry feature followed by a separate operations pitch. The journey now
explains the proposed action, evidence, rule check, review and decision record.
Sources supply the gate; examples explain its different recommendations; team
work and policy preview operate it; recovery and reconciliation trace the
consequences of its decisions. This supersedes the prior five-stage lifecycle
copy and section-order freeze on /landing only. Keep the existing palette,
geometry, scroll mechanics, fixture facts and destinations. Current review,
pre-launch AI connections and integration-dependent enforcement remain explicit.
Current implementation evidence: artifacts/landing-gate-story/2026-09-18/whole-story/receipt.md.


### Cleaner gate ring — 18 September 2026

Historical presentation record: the 20 September product-led landing revision supersedes its `/landing` geometry, ring, type and artwork-preservation instructions. Product truth remains binding.

The owner requests Loop's cleaner circular explanation. For /landing#workflow,
replace the left-side accordion and segmented narrow orbit with one centred,
continuous broad ring and five short statements around its edge. This supersedes
the earlier left-side explanation composition, not the gate narrative. Preserve
Unauth colours, native scroll pin/release, keyboard stage selection, a skip link
and static mobile/reduced-motion reading. Keep source detail in the existing
source section and one nearby capability qualification. Live Loop DOM/CSS
provenance and bounded local evidence: artifacts/landing-journey/2026-09-18/clean-ring/.
No Loop brand assets, wording, fonts or scripts are copied.


### Ring hero texture and personality — 18 September 2026

Historical presentation record: the 20 September product-led landing revision supersedes its `/landing` geometry, ring, type and artwork-preservation instructions. Product truth remains binding.

Owner clarification: the patterned non-white hero means /landing#workflow,
not the opening headline hero. Restore the opening hero's previous surface,
spacing and illustration treatment. The ring stage uses the existing paper
neutral, a restrained orange wash and the local miniature gate-bracket pattern.
Five original line icons identify request, evidence, rules, review and record;
a gate mark anchors the centre. Preserve concise copy, broad orange scroll fill,
keyboard selection, native pin/release and complete static fallbacks. This
corrects the earlier texture placement under GOV-07 and VIS-05/06/13 without
changing product claims or shared surfaces. Bounded correction evidence:
artifacts/landing-polish/2026-09-18/ring-correction/receipt.md.


Recovery-led landing clarification (18 September 2026): PRODUCT.md#positioning
owns recovery as a primary commercial benefit, with the gate as the evidence
and decision mechanism. DESIGN.md records early recovery placement and existing
recoverable-sample entry; PUBLIC_EXPERIENCE_TRANSFORMATION.md records verification.
Earlier gate-first records remain valid for the mechanism, superseded for
gate-only headline emphasis and late recovery placement. No capability expansion.


Complete merchant story (19 September 2026): PRODUCT.md#merchant-story-for-the-landing
is the narrative owner for the five connected stages. DESIGN.md owns the
commissioned artefact changes; PUBLIC_EXPERIENCE_TRANSFORMATION.md owns delivery
and verification. Earlier gate-only/recovery-first presentation records are
superseded for sequence and artefact meaning, not capability or evidence truth.


### Automatic gate entry and human/AI routing — 19 September 2026

The owner clarifies that participating claims enter the gate automatically before
any resolution decision. PRODUCT.md#automatic-claim-entry-and-decision-routing
and GLOBAL_RULES.md PROD-07 govern the intended semantics: recommendations with
reasons for people; enforced authorised routes and human escalation for connected
AI. This supersedes passive or optional pre-action-check phrasing, while keeping
the complete recovery-led story and current external-action boundary. Hero,
source introduction, circle, gate routes and FAQ explain the same distinction.
The existing illustration gains two plain-language human/AI explanations using
the adopted styles. No runtime integration or backend capability is added.
Bounded verification: artifacts/landing-active-gate/2026-09-19/receipt.md.

Landing v2 artefacts, 23 September 2026: DESIGN.md records the supplied gate-and-recovery brief as the local marketing target, superseding the five-module artwork and illustrated hero only. The existing landing app-story plan tracks this bounded follow-up; artifacts/landing-artefacts/2026-09-23/receipt.md records source checks, verification and publication blockers. Product execution and release owners remain unchanged.

Landing artefact polish, 23 September 2026: DESIGN.md#landing-artefact-polish--23-september-2026 records the restrained refinement and fresh live Asterlane hero request. The existing landing app-story plan tracks delivery; artifacts/landing-polish/2026-09-23/receipt.md records verification and capture access.

Landing v3, 23 September 2026: the owner adopts shorter full-product copy and restores the Unauth-centred evidence spider diagram within connected tools. Existing landing owners remain canonical; GLOBAL_RULES.md and DESIGN.md record the bounded presentation revision. Evidence and publication claim register: `artifacts/landing-v3/2026-09-23/receipt.md`.

Landing clarity refinement, 23 September 2026: the existing landing app-story plan owns LCR-00–06, including unified gate examples, fresh case capture, recovery chronology and operational tool handoffs. It supersedes the v3 spider/hero preservation only within this task. Current evidence: `artifacts/landing-refinement/2026-09-23/receipt.md`; publication remains separately gated. The 24 September merchant-story revision in PRODUCT.md and DESIGN.md supersedes revision 5's page compression; `docs/product/LANDING_MERCHANT_STORY_RESEARCH.md` is its supporting research and presentation map, not a capability or release authority.

### Landing presentation restoration — 23 September 2026 (historical baseline; revised 24 September)

The owner requests the earlier polished landing from this conversation, fitted
to the current information. Restore the composition archived in
`artifacts/landing-v3/2026-09-23/before/`: full-frame genuine Asterlane hero,
light typography, open evidence-to-gate diagram, separate case chapter, recovery
folder, light receipt and conditional outcome, shared team panels, supporting
strip and configuration. This supersedes later v3, LCR and forensic presentation
choices only. Current supervised handoffs, pre-launch AI, on-demand courier
records, claimant eligibility and verified-money distinctions remain binding.
Do not restore obsolete execution claims. No backend, release, subscription,
permission or provider capability changes are authorised by this restoration.
Evidence: `artifacts/landing-restoration/2026-09-23/receipt.md`.

Landing copy and first-hero caption revision, 23 September 2026: the owner
removes selected repeated marketing copy and the visible first-hero description
while preserving desktop handoff, AI status, image provenance in alt text and
the capture manifest. `GLOBAL_RULES.md` records the bounded VIS-14 exception;
`DESIGN.md` owns its presentation detail. No product or release authority moves.

Landing artefact alignment, 24 September 2026: `LandingArtifact.tsx` owns the shared
below-hero frame and native in-place disclosure; existing story, case and outcome
components retain their content. `LandingIntegrations.tsx` projects selected
providers from `lib/integrations/registry.ts` into a static logo composition and
grouped coverage details. All styling stays in the existing public CSS owner.
The first hero is excluded. DESIGN records the Ramp reference and adaptations;
the existing landing app-story plan records delivery. Evidence:
`artifacts/landing-ramp-alignment/2026-09-24/receipt.md`.

Owner correction, 25 September 2026: `LandingArtifact.tsx` and `SampleCases` open
their existing explanations through `LandingDetailModal.tsx`, which uses the
shared accessible `Modal.tsx` and the existing public CSS owner. Their native
`details` elements remain as the no-JavaScript fallback; with JavaScript, the
page stays in place behind the dialog.

The subsequent premium-finish request refines only the existing below-hero
artefact block in `components/public/public.module.css`. Components, content,
disclosure behaviour and the first hero are preserved. DESIGN records the
material/typographic treatment; bounded evidence is in
`artifacts/landing-ramp-alignment/2026-09-24/premium-polish/receipt.md`.

Source-case correction, 25 September 2026: `ConnectedWorkStory` projects
`DEMO_SOURCE_PRESENTATION` and the existing recoverable `DEMO_CASES` entry from
`lib/demo/merchantCaseV1.ts` into the source sheet and shared-case continuation.
The canonical SAMPLE-248 wrong-item case replaces the 24 September delayed-order
enquiry and continues through work and the rule preview. Existing interactive
demo cases, persistence and financial transitions are unchanged.
The public CSS owner supplies aligned columns and responsive stacking. The first
hero remains protected; DESIGN and the existing app-story plan record the change.

Landing policy-outcome follow-up, 25 September 2026: the existing
`lib/demo/merchantCaseV1.ts` owns `DEMO_LANDING_POLICY_OUTCOMES`, a labelled
presentation of intended automatic outcomes under example merchant rules.
LandingScenes, LandingStoryChapters, PublicInteractions and LandingOutcomeVisuals
consume it. Current recommendation, demo transition and provider execution
owners are unchanged. GLOBAL_RULES, PRODUCT and DESIGN record the scope.

Not-received lead story, 25 September 2026: merchantCaseV1 owns
DEMO_FEATURED_CASE_IDS and DEMO_DELIVERY_RECOVERY_PRESENTATION alongside the
new isolated not-received case. Featured landing/demo navigation has three
cases; the legacy duplicate URL remains valid. Existing progress and financial
transition functions retain their contracts. The desktop handoff recognises
the same canonical case registry.


Owner correction, 25 September 2026: remove landing-page provenance and capability disclaimer copy, including fictional/sample captions, intended/illustrated automation labels, supervised/pre-launch notices and desktop walkthrough labels. Keep the product story direct and let the case show Unauth selecting outcomes. This overrides earlier landing disclaimer requirements only; canonical fixtures and the interactive demo retain their provenance and execution boundaries. Financial stages and actual case blockers remain distinct.
