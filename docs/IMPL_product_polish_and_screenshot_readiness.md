# IMPL — Product polish and landing-page screenshot readiness

- **Status:** Execution-ready phased specification; Phase 1 is in progress and landing-page capture remains unavailable until Phase 13
- **Date:** 27 July 2026
- **Scope:** Authenticated shell, all primary product routes, deterministic marketing seed, runtime integrity, supported-desktop behaviour, accessibility, and screenshot production
- **Audit baseline:** Local full-merchant review using `npm run seed:simeon` at 1280px, with additional historical narrow-width evidence now superseded by the desktop-only boundary in §0.3
- **Binding visual contract:** [`IMPL_quiet_precision_product_ui.md`](IMPL_quiet_precision_product_ui.md)
- **Binding contributor rules:** [`../styles/authenticated/README.md`](../styles/authenticated/README.md)
- **Related product contract:** [`IMPL_merchant_operations_experience.md`](IMPL_merchant_operations_experience.md)

This document converts the 26 July visual audit into an implementation backlog. It records what was wrong, the required change, and a measurable success condition for every observed issue. It does not authorise a different product theme, conceal truthful unavailable states, invent production data, or weaken the supervised-decision product boundary.

---

## 0. Executive decision

The application has a credible visual foundation. Its shell is restrained, compact, and substantially more considered than the gradient-heavy, oversized, low-information dashboard style commonly associated with generic AI-generated products. The work required before landing-page screenshots is not a redesign. It is a product-coherence and finish pass.

The reviewed build is **not screenshot-ready** because four kinds of unfinished state are visible:

1. The seeded merchant tells contradictory stories across identity, connections, cases, customers, losses, and reports.
2. Important detail routes expose missing schema, failed requests, empty compatibility panels, and developer-facing language.
3. Too many routes reuse the same KPI strip → callout → rounded work surface → summary rail composition, creating structural “AI slop” even though the palette itself is restrained.
4. Desktop-width, contrast, chart-legibility, and capture-stability defects would become more obvious after landing-page scaling and compression.

Landing screenshots may begin only after all 13 phases and the full §2 gate pass against a dedicated, safe, deterministic marketing merchant.

### 0.1 What should be preserved

- The neutral near-white shell, graphite type, fine borders, restrained semantic colour, and compact controls.
- The 200px sidebar, 48px utility header, information density, and general route structure.
- The master/detail approach on operational registries.
- The visual restraint of Rules, Notifications, and Integrations.
- The product’s explicit distinction between recommendation, merchant decision, confirmed outcome, loss, recoverable value, and recovered cash.
- Truthful null, partial, stale, disconnected, and unsupported states in production.

### 0.2 What this programme must not do

- Do not manufacture fake production values to remove dashes.
- Do not turn every section into a new card or introduce gradients, glows, oversized headings, decorative illustrations, or a saturated brand accent.
- Do not change financial definitions merely to make cross-screen totals appear equal.
- Do not expose a real person, email address, store domain, support account, or customer record in marketing captures.
- Do not make a screenshot-only CSS fork. The captured interface must be the real product using a dedicated fixture and capture-safe runtime.
- Do not describe autonomous payout, refund, recovery, liability, or claim-submission behaviour that the product does not perform.

### 0.3 Supported viewport and retired mobile scope

Authenticated product routes support CSS layout viewports of **1024px and wider**. At 1023px and below, the application must render one shared, accessible “Desktop required” boundary instead of the authenticated shell or route UI.

- Enforce the boundary once at the authenticated root/layout, using viewport width rather than user-agent or device detection.
- At 1024px the full product remains operable. At 1023px and below, authenticated navigation, content, and controls are absent from the accessibility tree.
- The boundary provides a concise explanation and no imitation mobile product, route-specific card/list conversion, bottom navigation, compact workflow, or screenshot mode.
- Resizing and direct deep links must transition consistently across the boundary without leaking protected content.
- Desktop accessibility remains required. This programme targets the applicable WCAG requirements at supported widths; it does **not** claim full WCAG 2.2 AA conformance because narrow-viewport reflow and some browser-zoom scenarios are intentionally unsupported.

The following mobile-only requirements were retired by owner decision on 27 July 2026. They are deleted from phase ownership and require no implementation, test, evidence, or PASS result:

| Retired ID | Superseded intent |
|---|---|
| OVR-06 | Mobile action stacking |
| OVR-08 | Mobile filter/control composition |
| CUST-05 | Mobile customer-card/list conversion |
| A11Y-07 | Wrapped mobile KPI dividers |
| A11Y-13 | Mobile Overview priority order |

`SYS-12` now owns the single shared boundary implementation and `A11Y-03` owns its accessibility and threshold verification. This decision overrides conflicting mobile/responsive clauses in the linked visual, contributor, and merchant-experience contracts for this programme. All other mobile/tablet engineering described in earlier planning material is out of scope.

### 0.4 Priority and scope

| Marker | Meaning |
|---|---|
| **P0** | Blocks landing-page screenshots or demonstrates broken product/data truth |
| **P1** | Clearly visible polish, hierarchy, consistency, supported-desktop, or accessibility defect |
| **P2** | Small fit-and-finish improvement that should ship in the same programme |
| **Product** | Fix belongs in normal application behaviour |
| **Fixture** | Fix belongs in the deterministic marketing merchant |
| **Both** | Product behaviour and fixture data must change together |
| **Capture** | Fix belongs in screenshot tooling or acceptance workflow |

---

## 1. Benchmark and evidence

### 1.1 Research standard

The implementation must be reviewed against:

- [Shopify App Design Guidelines](https://shopify.dev/docs/apps/design) for merchant-centred, familiar, efficient product UI.
- [Shopify visual design guidance](https://shopify.dev/docs/apps/design/visual-design) for hierarchy, consistency, type, colour, and restrained decoration.
- [Shopify layout guidance](https://shopify.dev/docs/apps/design/layout) for coherent composition and avoiding unnecessary duplication.
- [Shopify content guidance](https://shopify.dev/docs/apps/design/content) for direct, consistent, merchant-facing language.
- [Shopify alert guidance](https://shopify.dev/docs/apps/design/user-experience/alerts) for actionable, non-repetitive status communication.
- [Shopify App Store requirements](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements) for accurate screenshots and truthful product representation.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) for the applicable supported-desktop requirements, including contrast, keyboard access, focus, motion, text spacing, and input behaviour.
- [WCAG 2.2 target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) for a 24×24px minimum target or sufficient spacing.
- [Microsoft dashboard design guidance](https://learn.microsoft.com/en-us/power-bi/create-reports/service-dashboards-design-tips) for question-led dashboards, limited metric competition, and legibility at a glance.

These references support the existing Quiet Precision direction. They do not override Unauth’s product contract or justify making the application resemble Shopify admin.

### 1.2 Reviewed evidence

The audit covered:

- Overview, Work, Cases, case detail, Losses, Recovery, Customers, customer detail, Rules, Flows, Reports, Integrations, Settings/Account, and Notifications.
- A fully seeded merchant containing 151 cases, 56 listed customer profiles, hundreds of orders, financial records, recoveries, work, and notifications.
- Desktop at 1280px, additional overflow checks around 1440px, and a historical Overview check at 390×844 that is superseded by §0.3.
- Browser requests, console output, hydration, loading completion, empty states, and internal copy.

Local audit images were saved outside the repository as `overview-desktop-review.png`, `overview-mobile-review.png`, `integrations-review.png`, `case-detail-review.png`, and `customer-detail-review.png`. The mobile image is historical evidence only; none is an approved marketing asset.

### 1.3 Root causes

| Root cause | Visible result |
|---|---|
| A general demo seed is being used as a marketing merchant | Fixture markers, repeated names and times, sparse detail pages, contradictory integrations, and implausible distributions |
| Applied database schema and application expectations have drifted | Failed case requests, missing relationships/tables, and empty panels that imply an unfinished product |
| Compatibility-era components remain mounted | Duplicate terminology, repeated evidence/decision panels, nested cards, and empty legacy controls |
| Page composition was applied mechanically | Many routes look like variants of the same dashboard template rather than purpose-built workspaces |
| Shared primitives do not fully enforce their own contract | Double frames, inconsistent tables, broken KPI dividers, page-local typography, and repeated status pills |
| Screenshot production is not a first-class test mode | Stale generated times, animation settling, cold compilation, live toasts, and unstable relative dates |

---

## 2. Binding screenshot-readiness gate

All of the following must pass before capture. A single failure blocks the screenshot set.

This is the final programme gate, not a checklist to re-run in every phase. During Phase N, implement and check only that phase’s active owned IDs.

| Gate | Success condition |
|---|---|
| Runtime integrity | Every request needed by the selected capture routes returns 2xx; zero uncaught console errors, hydration warnings, failed mutations, or missing-schema errors |
| Read purity | Opening or refreshing a GET/detail page performs no business mutation and no automatic decision POST |
| Merchant coherence | One fictional merchant name, one coherent operator identity, one safe store domain, one currency, one timezone, and one connection story appear everywhere |
| Fixture hygiene | Zero visible `test`, `demo`, `sample`, `seeded`, fixture tags, personal email addresses, internal merchant IDs, raw UUIDs, or internal capability names |
| Detail completeness | Every captured record detail has real-looking orders/line items, source evidence, history, owner, recommendation or explicit next step, and relevant financial/recovery context |
| Financial truth | List, detail, Overview, Losses, Recovery, and Reports values reconcile by documented date range and currency; unavailable never means zero |
| State truth | Connected, stale, pending, disconnected, and unavailable states agree in the sidebar, summary, row, detail, and alerts |
| Supported-desktop integrity | No page-level horizontal overflow or clipped primary control at 1440, 1280, or 1024px; table/board overflow remains inside its surface |
| Unsupported-width boundary | At 1024px the product is operable; at 1023px and one narrower test width only the shared accessible Desktop required boundary is rendered |
| Accessibility | At supported widths: zero serious/critical automated accessibility violations; keyboard path, focus visibility/restoration, text spacing, reduced motion, and forced-colour checks pass |
| Visual hierarchy | One clear page purpose and primary action; no repeated page-title breadcrumb; no duplicated count/callout that communicates the same fact |
| Capture stability | With a frozen capture clock, each route reaches a named ready state; animations are disabled or settled; two consecutive captures are pixel-stable within the approved tolerance |
| Marketing truth | Every screenshot shows a capability available in the shipping product and contains no browser chrome, developer UI, cursor, toast, open menu, spinner, skeleton, or error fallback |

---

## 3. Lean execution protocol

The 13 phase boundaries remain because they keep product changes small. Verification follows one formula:

> **Implement → run the smallest direct check → inspect the changed result once → record the outcome → stop.**

Confidence comes from testing shipped behaviour, not from building a second system that tests reports, manifests, evidence files, or other test infrastructure.

### 3.1 Invocation prompt

Use this prompt with the current Markdown document:

```text
Implement or resume Phase N.

Read §0–§3 and Phase N. A report may tell you which active IDs already landed,
but it never adds scope or commands. For Phase 1, ignore the obsolete 21-ID
report completely and replace it at the end. Implement the active owned IDs using
the existing product architecture and test tools. Run only the smallest checks
that directly prove changed behaviour, inspect changed UI yourself, update the
ledger/report, and do not begin Phase N+1.

Finish the whole phase in this run while safe owned work remains. Do not stop
after scaffolding, announce a partial count as the outcome, or re-audit an
unchanged passing fix without a concrete failure.

Do not create a verifier for the verifier, phase manifests, persistent JSON
evidence, performance percentile harnesses, duplicate seed systems, checkpoint
commits, or new test infrastructure unless the shipping product genuinely needs
it. One direct check may prove multiple IDs. Do not repeat an unchanged passing
check.

Use isolated local data and preserve unrelated work. The authenticated product
supports widths of 1024 CSS pixels and wider; below that, render only the shared
Desktop required boundary.
```

Replacing `N` is the only phase-specific instruction required.

### 3.2 Evidence economy

1. Prefer an existing test, query, or browser path. Add one focused regression only when a real bug lacks coverage.
2. Test the shipped behaviour directly. Never add tests whose main subject is a phase runner, report parser, manifest, artifact filename, or evidence-file contents.
3. Do not create persistent logs or JSON proof files. Command output and a short report entry are enough; Phase 13 capture images/diffs are the exception.
4. Keep the happy-path seeded merchant healthy. Exercise deliberately invalid data in a unit/component fixture instead of injecting it into the browser smoke and then allow-listing expected errors.
5. Run each expensive command once on the final relevant source. Do not perform triple resets, repeated type generation, repeated builds, or cumulative phase replays without a diagnosed reason.
6. Do not benchmark routine phases. Only Phase 13 measures capture readiness, using three warmed navigations and a five-second limit.
7. Browser-check only routes changed by the phase. Use 1440px as the primary review and 1024px as the supported edge; Phase 12 performs the cross-route accessibility sweep and Phase 13 checks final capture sizes.
8. A single browser session may prove several acceptance bullets. Do not create one test or artifact per bullet.
9. Do not use the current `release:readiness` for this programme: it repeats database/runtime checks and invokes the obsolete `verify:polish` ledger replay. Phase 13 has a smaller explicit final gate. Do not build a replacement wrapper.
10. Preserve unrelated work, use isolated local/test data, never weaken product assertions, and never commit unless the user asks.
11. On resume, trust a prior direct PASS unless its code changed or the phase’s final focused check fails. Do not begin with a broad audit of previous work.

Existing Phase 1 meta-verifiers, percentile evidence, generated auth state, and evidence JSON from the earlier version are **not completion requirements**. Do not extend, audit, repair, or clean them up unless one directly prevents a listed check from running. Preserve useful product fixes and focused regressions; removal of obsolete machinery is a separate task that requires an explicit request.

### 3.3 Phase ownership and status ledger

| Phase | Owned requirement IDs | Count | Primary deliverable | Prerequisite | Status | Completion evidence |
|---|---|---:|---|---|---|---|
| 1 | RUN-01–RUN-06, RUN-08 | 7 | Critical schema/API/read-path unblock | None | IN PROGRESS | `docs/phase-reports/product-polish/phase-01.md` |
| 2 | SEED-01–SEED-28 | 28 | Isolated deterministic marketing merchant | Phase 1 COMPLETE | COMPLETE | `docs/phase-reports/product-polish/phase-02.md` |
| 3 | COPY-01–COPY-17 | 17 | Canonical vocabulary, copy, and data-state language | Phase 2 COMPLETE | COMPLETE | `docs/phase-reports/product-polish/phase-03.md` |
| 4 | SYS-01–SYS-28 | 28 | Shared visual primitives and composition contracts | Phase 3 COMPLETE | COMPLETE | `docs/phase-reports/product-polish/phase-04.md` |
| 5 | SHELL-01–SHELL-06, OVR-01–OVR-05, OVR-07, OVR-09, WORK-01–WORK-09 | 22 | Shell, Overview, and Work | Phase 4 COMPLETE | COMPLETE | `docs/phase-reports/product-polish/phase-05.md` |
| 6 | CASES-01–CASES-10, CDET-01–CDET-17 | 27 | Cases registry and case detail | Phase 5 COMPLETE | NOT STARTED | `docs/phase-reports/product-polish/phase-06.md` |
| 7 | LOSS-01–LOSS-08, LDET-01–LDET-03, REC-01–REC-09, RDET-01–RDET-03 | 23 | Losses and Recovery | Phase 6 COMPLETE | NOT STARTED | `docs/phase-reports/product-polish/phase-07.md` |
| 8 | CUST-01–CUST-04, CUST-06–CUST-08, CPRO-01–CPRO-14 | 21 | Customers registry and customer detail | Phase 7 COMPLETE | NOT STARTED | `docs/phase-reports/product-polish/phase-08.md` |
| 9 | RULE-01–RULE-06, FLOW-01–FLOW-07 | 13 | Rules and Flows | Phase 8 COMPLETE | NOT STARTED | `docs/phase-reports/product-polish/phase-09.md` |
| 10 | REP-01–REP-11, INT-01–INT-13 | 24 | Reports and Integrations | Phase 9 COMPLETE | NOT STARTED | `docs/phase-reports/product-polish/phase-10.md` |
| 11 | SET-01–SET-09, NOTE-01–NOTE-08 | 17 | Settings and Notifications | Phase 10 COMPLETE | NOT STARTED | `docs/phase-reports/product-polish/phase-11.md` |
| 12 | A11Y-01–A11Y-06, A11Y-08–A11Y-12, A11Y-14 | 12 | Desktop accessibility and supported-width boundary proof | Phase 11 COMPLETE | NOT STARTED | `docs/phase-reports/product-polish/phase-12.md` |
| 13 | CAP-01–CAP-12 | 12 | Deterministic capture suite and approved screenshot set | Phase 12 COMPLETE | NOT STARTED | `docs/phase-reports/product-polish/phase-13.md` |

The ledger owns 251 active requirements. Fourteen former RUN IDs were merged into later requirements in §4.2 because they duplicated work already owned by the relevant route, content, data, or capture phase. The five mobile-only IDs in §0.3 remain retired.

Status is deliberately simple:

- `NOT STARTED`: no work has begun.
- `IN PROGRESS`: implementation or the lean final check remains.
- `COMPLETE`: every active owned ID passes and the short report has no remaining issue.

Incomplete work, a failing test, an external constraint, a long phase, or an ending window remains `IN PROGRESS`. Continue all safe in-scope work and note the next executable action; do not stop to ask the user about routine implementation details.

### 3.4 Start procedure

1. Read §0–§3, the requested phase, and its current report.
2. Run `git status --short`; preserve unrelated changes.
3. Reproduce the owned defect with the smallest useful check.
4. Confirm any database/service used is isolated and local.

Reports record outcomes; they never define scope or add gates. For Phase 1 specifically, the existing 21-ID report is historical only: do not audit or execute its continuation queue. Assess the seven active IDs in this MD and replace that report with §3.7’s short format.

### 3.5 Completion formula

Every phase:

1. Run the smallest focused test selection for the code changed.
2. If TypeScript/JavaScript changed, run `npm run typecheck` and `npm run lint -- --max-warnings=0` once after the final change. Always run `git diff --check`.
3. If UI changed, inspect only the changed routes in one browser session at 1440px and 1024px. Check visible completion, console, hydration, required requests, and unintended writes.
4. If schema/data logic changed, run one clean replay or reconciliation check directly related to that change.
5. Update the short report and ledger.

The command block in each phase is an upper-bound shortlist: run the entries relevant to the files actually changed, not unrelated commands for ceremony. Build in Phase 1, Phase 13, or when diagnosing a specifically production-only routing/hydration defect; do not rebuild after every visual phase. Do not run the cumulative `release:readiness` suite; Phase 13’s explicit final commands are the only programme-wide regression pass.

A later section’s “acceptance check” is a checklist for this single focused pass—not a demand for a separate test, fixture, artifact, screenshot, or command per bullet.

Likewise, words such as `test`, `scan`, `audit`, `validator`, or `assertion` inside an individual success metric describe the observable outcome. Satisfy them with the phase’s shared direct check wherever possible; they do not authorise one new harness or file per requirement.

An unrelated failure that demonstrably predates the phase does not expand its scope. Note it once, confirm the changed paths did not cause it, and continue; do not rewrite unrelated legacy suites merely to turn a broad command green.

### 3.6 Completion and constraints

A phase is complete when every active owned ID is implemented, its smallest direct checks pass, changed UI/data has been inspected once, and the report has no remaining issue. One test or browser pass may prove multiple IDs.

Keep working while safe in-scope work remains. If an unavailable external permission, secret, third-party state, or physical resource prevents one check, record that exact constraint under `Remaining`, leave the phase `IN PROGRESS`, and finish everything else. No phase has a planned external dependency: the implementing agent completes the written product-truth, privacy, and visual checklist itself. Optional user aesthetic feedback may follow, but is not required to finish the programme.

### 3.7 Short phase report

```markdown
# Product polish — Phase N

- Status: IN PROGRESS | COMPLETE
- Active IDs:
- Result: X/X PASS

## Changes

- ID — change; direct check

## Checks

- command or browser inspection — PASS

## Remaining

None.
```

Do not include revision hashes, environment inventories, generated evidence manifests, historical correction narratives, checkpoint ceremony, or raw logs. If a window ends, record only completed IDs, remaining IDs, and the next executable action. Only a complete report may say `None`.

### 3.8 Continuation

Continue the same phase until its lean formula passes. Do not ask the user to decide routine implementation details and do not use a prescribed closing phrase. Start Phase N+1 only after Phase N is `COMPLETE`.

---

## 4. Phase 1 — Critical runtime unblock

- **Owned IDs:** RUN-01–RUN-06, RUN-08
- **Prerequisite:** None
- **Phase outcome:** The directly observed Cases and Work blockers are repaired so seeded route polishing can begin. Whole-product data contracts remain with their natural later phases.

### 4.1 Required deliverables

1. Targeted forward migrations and regenerated types for the observed missing schema/grants only.
2. Healthy investigation, claimed-item/match, case-decision, saved-view, and evidence-package paths.
3. Side-effect-free case reads and stable hydration.
4. One minimal local smoke dataset using existing fixture code. Do not build a second seed platform; Phase 2 owns the complete marketing merchant.
5. Direct regression coverage for the seven owned defects, reusing existing suites and adding only the minimum missing cases. One test or browser smoke may prove multiple IDs.

The few seeded records named below are the complete Phase 1 fixture scope. Do not create a matrix, validator, fingerprint, or second seed command.

| ID | Priority / scope | What was wrong before | Required change and implementation notes | Success metric |
|---|---|---|---|---|
| RUN-01 | P0 · Product | Case detail requested `support_payout_cases.responsibility_confirmation_state`, but the reviewed database did not have the column. The resulting decision request returned 500. | Apply the required forward migration, regenerate typed contracts, and include the field in the existing canonical schema check. Do not create a second deployment-verification framework or a silent client fallback. | `npm run verify:canonical-db` is the single clean replay—run no additional reset—and the case decision endpoint returns 2xx for the seeded case. |
| RUN-02 | P0 · Product | Investigations failed because the application expected a `case_clarification_requests → partners` relationship that the active schema/API could not resolve. | Add or correct the foreign key and generated relationship, or query the two resources explicitly if the relationship is intentionally absent. Cover merchant isolation and missing-partner behaviour. | Investigation request returns 2xx and renders the seeded request/response history; no PostgREST relationship error appears. |
| RUN-03 | P0 · Product | Reconciliation matches requested `public.case_claimed_items`, which did not exist in the reviewed environment. | Apply the claimed-items migration before mounting the feature. Add the table to schema-parity verification and seed at least one unambiguous and one resolved match. | Match endpoint returns 2xx; the captured case shows the claimed item and source order line without a retry/error placeholder. |
| RUN-04 | P0 · Product | Opening case detail triggered a background `POST /api/claims/[id]/decision`; a read caused a mutation and could fail while the page appeared to load. | Make initial detail loading read-only. Generate recommendations in an explicit command, idempotent server projection, or controlled background job. A user-initiated refresh may mutate only after clear intent. | Opening and reloading the seeded case produces no business write request and leaves relevant business-row counts unchanged. |
| RUN-05 | P0 · Product | `ClaimLifecycleStatusBar` produced a server/client hydration mismatch because rendered style/state differed between the two passes. | Move time- or client-dependent state behind a stable server value, pass a single status snapshot, and avoid render-time viewport/date branching. Verify it in the one Phase 1 production browser smoke; add no dedicated hydration harness unless the smoke cannot observe it. | Zero hydration warnings in a clean browser session and identical lifecycle markup before and after hydration. |
| RUN-06 | P0 · Product | `/api/work/views` returned 500. The UI swallowed the error and quietly showed no saved views. | Fix the API/schema path and distinguish “none saved” from “saved views unavailable.” Preserve a bounded retry and accessible inline error. Use the existing component test for forced failure/retry and the production smoke only for the healthy seeded view. | Endpoint returns 2xx; an existing seeded view loads; the focused component test proves failure is not rendered as empty. |
| RUN-08 | P0 · Product | Evidence packages were deliberately forced to `null` in the Cases loader, so a rich seeded case could never show package readiness in the registry. | Replace the compatibility stub with the current evidence-package/readiness projection or remove the column/badge until it has a truthful source. | Registry evidence status agrees with the selected seeded case detail; one focused projection test covers any additional fixture records without browser traversal. |

### 4.2 Merged former RUN requirements

These former Phase 1 IDs duplicated later work and no longer exist as separate gates. Preserve useful implementation already produced for them, but prove and finish it only in the owning later phase:

| Former ID | Natural owner |
|---|---|
| RUN-07 | WORK-03 and WORK-06 |
| RUN-09 | SEED-19, SEED-28, COPY-02, and COPY-17 |
| RUN-10 | Route-phase loading/error checks plus CAP-02 and CAP-03 |
| RUN-11 | COPY-11, COPY-15, and COPY-17 |
| RUN-12 | COPY-11/COPY-17 and the relevant route label requirements |
| RUN-13 | CAP-02 capture readiness |
| RUN-14 | SYS-17 and CAP-03 |
| RUN-15 | Phase 2 manifest clock plus CAP-02 and CAP-08 |
| RUN-16 | Phase 7 financial progression/reconciliation and Phase 10 reporting |
| RUN-17 | CUST-01, CPRO-02, and Phase 8 aggregate contract |
| RUN-18 | SHELL-02 and INT-01/INT-02/INT-08 |
| RUN-19 | SEED-10 and CASES-02 |
| RUN-20 | SEED-23, LOSS-02/LOSS-03, REC-07, and INT-08 |
| RUN-21 | REP-02, REP-09, and the Phase 7/10 reconciliation checks |

This is a scope merge, not permission to reintroduce the same work under new infrastructure.

### 4.3 Phase 1 lean completion check

Use existing focused tests where possible:

```bash
npm run verify:canonical-db
npm run seed:phase1-qa
npm test -- --runInBand \
  tests/security/evidenceReconciliationMigration.test.ts \
  tests/security/release1InvestigationMigration.test.ts \
  tests/api/claimsRoutes.test.ts \
  tests/lib/caseReadModel.test.ts \
  tests/unit/reconciliation/caseStore.test.ts \
  tests/components/workQueueResultModel.test.tsx
npm run typecheck
npm run lint -- --max-warnings=0
npm run build
git diff --check
```

Use the already-existing, local-guarded `seed:phase1-qa` exactly once only to supply post-reset smoke data. Do not run its validator, evidence command, idempotency/fingerprint pass, or browser-performance harness, and do not expand the seed beyond what the seven active paths need. Do not use the unguarded `seed:simeon` here.

Then perform one production browser smoke using that local data:

- Open Cases, one seeded case detail, and Work.
- Required requests return 2xx; saved-view unavailable and empty remain distinct.
- Case lifecycle hydrates without warning; claimed item/source line and registry evidence state render truthfully.
- Reload the case once and confirm no business mutation or automatic decision write.
- Console errors and unresolved loading/error UI are zero.

Do not run `verify:polish`, create evidence JSON, repeat the build, calculate percentiles, fingerprint the fixture, or run `release:readiness`. The existing Phase 1 report should be replaced with the short seven-ID format in §3.7; its old 21-ID history is not a completion requirement.

---

## 5. Phase 2 — Dedicated marketing merchant and seed realism

- **Owned IDs:** SEED-01–SEED-28
- **Prerequisite:** Phase 1 `COMPLETE`
- **Phase outcome:** A safe, isolated, deterministic merchant gives every primary route coherent production-shaped data and no visible fixture machinery.

### 5.1 Required deliverables

1. A typed merchant story manifest and dedicated merchant/user namespace.
2. An idempotent `seed:marketing` command with explicit `asOf` and deterministic PRNG seed.
3. A safe reset/reseed path that refuses production/shared targets and affects only the marketing merchant.
4. Complete merchant-owned settings, team, connections, rules, flows, customers, orders/lines, support, cases, evidence, events, decisions, finances, losses, recoveries, work, and notifications.
5. Stable semantic capture keys and at least three complete hero cases.
6. One concise validator covering story coherence, required relationships, financial arithmetic, stable capture keys, and privacy/fixture-language.

The current Simeon seed is useful for coverage but unsuitable for public screenshots. Create a separate `seed:marketing` entry point. It may reuse factories, but it needs a single story manifest, its own validation, and a capture clock.

### 5.2 Merchant story manifest

Define one typed manifest consumed by all seed modules:

| Field | Requirement |
|---|---|
| Merchant | One approved fictional brand name; never `Unauth Test`, `demo`, or the product’s own name |
| Operator | One fictional role-based operator name and safe non-routable email, not a team member’s personal address |
| Commerce | One safe fictional `.myshopify.com` domain and internally consistent Shopify account |
| Support | Choose one primary helpdesk for the marketing story; the sidebar, Integrations, cases, and customer activity must agree |
| Fulfilment/carrier | Connected providers used by case evidence and recovery records |
| Currency/timezone | GBP and Europe/London throughout unless an explicit multi-currency scenario is being demonstrated |
| Clock | Explicit `asOf`, with realistic recent, ageing, overdue, and historical records derived from it |
| Capture records | Stable named IDs for a hero case, hero customer, recovery, loss, rule, flow, report range, and connection |

### 5.3 Seed requirements

| ID | Priority / scope | What was wrong before | Required change and implementation notes | Success metric |
|---|---|---|---|---|
| SEED-01 | P0 · Fixture | Header/workspace showed `Unauth Test`; operator showed `simeonmurray123@gmail.com`; customers used `@simeon-demo.test`; Shopify used `unauth-test.myshopify.com`. | Replace all visible identities from the manifest. Use reserved/safe addresses and a fictional domain. Ensure names are not borrowed from a real merchant or team member. | Automated scan of rendered capture pages finds zero old identity strings, personal data, `test`, or `demo`. |
| SEED-02 | P0 · Both | Sidebar said “Helpdesk not connected” while Gorgias and Zendesk appeared connected/stale/pending in Integrations. | Seed one canonical connection read model and make all shell/page consumers use it. If Gorgias is primary, Zendesk should be absent, disconnected, or clearly secondary—not a contradictory parallel setup. | Sidebar, Integrations summary, row, detail, and case source labels return the same helpdesk configuration and health state. |
| SEED-03 | P0 · Fixture | Integrations claimed six connected and three needing attention, but every visible connection appeared unhealthy. | Choose a believable portfolio: most core sources operational, one recoverable attention state, and optional providers clearly on-demand or disconnected. Summary counts must be derived from exactly those states. | Connected/attention counts equal row counts; at least three important sources are visibly healthy and no “connected” row simultaneously reads as unusable. |
| SEED-04 | P0 · Fixture | Customer registry showed `—` total spend and “No order date” across customers despite hundreds of seeded orders. | Seed and link source customers, canonical profiles, orders, currency, processed dates, and aggregation inputs through the production read model. Add seed validation for join coverage. | ≥95% of listed customers have a last order and lifetime value; every hero customer has both. |
| SEED-05 | P0 · Fixture | Maya’s detail said seven orders while the list section said “Latest 3 of 3.” | Use one authoritative order count and one linked transaction collection. If pagination limits visible orders, label it explicitly. | Registry count, hero KPI, section total, and query total agree for every capture customer. |
| SEED-06 | P0 · Fixture | Case detail had no matched item, no applicable rule, no financial entries, no events, no recovery route, and no useful evidence despite the large seed. | Design one hero case end-to-end: customer message, exact order, named products/variants, claimed line, fulfilment, parcel, tracking, support thread, evidence, investigation, three recommendations, merchant rule, financial history, owner, timeline, and recovery state. | Hero case passes a fixture completeness assertion covering every required relation and renders no setup instruction or empty compatibility section. |
| SEED-07 | P0 · Fixture | Seeded tags exposed `sample data`, `payout control`, and other fixture language in the case UI. | Remove fixture tags from visible domain records. Use plausible operational tags only where a merchant would actually use them. | Zero visible fixture/system tags in route snapshots and text scan. |
| SEED-08 | P0 · Fixture | Loss rows had blank estimated loss and nearly universal “Unknown source.” | Seed explicit source, basis, estimated/realised value, responsibility, timestamps, currency, and supporting case references. Represent unsupported/null only in a non-captured QA fixture. | 100% of capture losses have a named source and at least the financially relevant value for their lifecycle state. |
| SEED-09 | P0 · Fixture | Recovery cards had sequential IDs, identical 9 August deadlines, `2m ago`, identical evidence counts, and loss equal to recoverable value. | Generate heterogeneous recovery routes, owners, amounts, evidence gaps, stage ages, deadlines, expected recovery rates, partners, and updates. Preserve deterministic values with a seeded PRNG. | No more than two visible cards share the same deadline, amount pair, evidence count, or update label; all five stages are meaningfully represented where the board is captured. |
| SEED-10 | P0 · Fixture | Cases showed `0d waiting` despite being roughly 45 days old. | Derive waiting age from the correct status-entered or action-required timestamp, not a newly seeded update timestamp. Seed a plausible distribution of new, ageing, due-today, and overdue cases. | Waiting labels reconcile to the underlying clock within one day; the visible list contains at least four distinct age values. |
| SEED-11 | P0 · Fixture | Every Work owner was `AN / Analyst`. | Seed a small team with distinct names/initials/roles and a mix of assigned/unassigned work that respects permissions. | At least three owners plus an unassigned state appear across the full fixture; no visible row uses generic “Analyst” as a person’s name. |
| SEED-12 | P1 · Fixture | Cases and recoveries appeared in long runs of one archetype, especially chargebacks. | Interleave plausible issue types, customer actions, sources, responsibilities, values, and stages. Avoid sorting by factory insertion order when it creates a visible pattern. | No first viewport contains more than three consecutive records with the same issue type unless a user-applied filter explains it. |
| SEED-13 | P1 · Fixture | Notifications repeated the same archetypes at exact 09:00/10:00/11:00 intervals. | Generate uneven event times from real case/integration/recovery events and vary actor, severity, read state, and action destination. | No obvious arithmetic timing sequence; every notification deep-link resolves to the object that generated it. |
| SEED-14 | P1 · Fixture | Rules were numbered 1–7, all Active, all version 1, with repeated sentence structures. | Seed descriptive policy names, varied priorities, at least one draft or superseded version, realistic conditions/outcomes, and applied-case counts. | Rules list contains meaningful lifecycle/version variation; hero case links to the expected published rule. |
| SEED-15 | P0 · Fixture | Flows had only one draft, no active workflow, and no run/activity story. | Seed at least two active flows, one draft, recent successful runs, one paused/attention state if supported, and varied triggers/actions. Do not seed a live state the product cannot actually execute. | Flows page has a credible active state, meaningful workload distribution, and at least one inspectable run without release-gate copy. |
| SEED-16 | P1 · Fixture | Customer orders lacked named products and enough line-item richness; the visible hero customer’s orders all became payout cases. | Seed product titles, variants, quantities, order values, fulfilment status, and a realistic majority of ordinary orders. | Hero customer has ≥6 orders, named products on all, and a case rate below 50% unless the narrative explicitly explains an outlier. |
| SEED-17 | P1 · Fixture | Customer support cases, notes, and activity were loading or empty, undermining the “real merchant” effect. | Seed one merchant note, a short support history, team activity, and an evidence/recovery transition tied to the hero customer. | The hero customer has non-empty support, notes, and activity sections with coherent actors and dates. |
| SEED-18 | P1 · Fixture | Rules, Flows, connections, team members, audit activity, and evidence packages were partly inherited from remote state rather than owned by the seed. | Make the marketing fixture self-contained and idempotent. Upsert or recreate every required merchant-owned record in dependency order; do not rely on a developer’s pre-existing connection rows. | Running the seed on a clean compatible database yields the same validated page inventory as running it twice. |
| SEED-19 | P0 · Both | Overview showed 30-day figures, Recovery showed all-time figures, and Reports used another selected range without sufficiently prominent scope, creating apparent contradictions. | Store and display explicit `range`, `asOf`, currency, and inclusion definitions with every aggregate. Fixture validation should reconcile same-scope values and permit documented cross-scope differences. | Same-range totals match exactly; different-range totals are visibly labelled before the value and pass a reconciliation test. |
| SEED-20 | P0 · Fixture | The dataset mixed `Seeded sample outcome`, `Sample recovery route`, `demo_seed`, and lower-cased system-style event text into merchant-visible UI. | Prohibit fixture implementation strings in merchant-visible fields. Add a deny-list scan over seeded text and rendered pages. | Deny-list has zero matches; event copy uses sentence case and plausible merchant language. |
| SEED-21 | P1 · Fixture | The seed log and UI counts differed because the remote environment contained additional customers/orders outside the intended fixture cohort. | Give the fixture a stable dataset/version marker used only for cleanup and validation, not UI. Seed into a dedicated merchant and validate merchant-wide totals after cleanup. | Seed log, database validation, and UI totals agree for the dedicated merchant; no unrelated remote rows are included. |
| SEED-22 | P1 · Fixture | Integrations referenced internal-looking accounts such as `sr71labs` and a provider-neutral placeholder. | Use story-manifest account labels and only provider/account names a merchant would recognise. Remove placeholder connections from capture data. | Every connection row answers “which account is this?” without internal/test terminology. |
| SEED-23 | P1 · Fixture | Recovery “last source update” used the recovery row’s `updated_at`, which could be changed by unrelated app actions. | Seed and expose a true source-event timestamp separately from case-record update time. | Displayed source freshness equals the latest underlying source record; an internal note update does not change it. |
| SEED-24 | P1 · Fixture | Rich data existed in aggregate, but the chosen records were not intentionally curated for screenshot composition. | Add stable capture slugs/IDs and fixture assertions for the exact hero records. Keep enough surrounding diversity that lists do not look staged. | Capture code selects records by stable semantic key, never “first row”; selected records remain complete after unrelated seed count changes. |
| SEED-25 | P1 · Fixture | One complete case is not enough to demonstrate decision-ready, active-recovery, and resolved/recovered product states without reusing the same story everywhere. | Curate at least three end-to-end cases with distinct issue types and lifecycle states, all sharing the same merchant story and production read models. | Each hero case has claimed line, ≥4 source-labelled evidence items, ≥4 events, team activity, applied rule, three recommendation outputs, and lifecycle-appropriate finance/recovery data. |
| SEED-26 | P1 · Fixture | Merchant activity was disproportionately made of exceptions/cases, making both customers and aggregate charts look synthetic. | Seed ordinary fulfilled orders, repeat purchases, normal returns, and customers with no case. Ensure case-linked activity is a minority unless the merchant narrative explicitly states otherwise. | Fewer than 25% of merchant orders have a case; each hero customer has an ordinary order; aggregate case rate and customer KPIs reconcile. |
| SEED-27 | P2 · Fixture | Sequential external IDs and records grouped by factory archetype made insertion order visible. | Generate plausible non-consecutive merchant references and deterministically shuffle default list ordering while retaining meaningful operational sort keys. | No first viewport has a run of more than two sequential IDs; neighbouring rows vary by type, state, age, value, and owner. |
| SEED-28 | P1 · Fixture | Order totals and line-item detail were not proven to reconcile, so richer product names could become decorative rather than financially coherent. | Seed price, quantity, discounts, tax, shipping, refunds, and currency through the same canonical commerce model used in production. Validate arithmetic at order and claimed-line level. | Every capture order reconciles to the penny; claimed quantity/value agrees with the selected source line and financial projection. |

### 5.4 Seed validation command

Add a validation command that fails on:

- identity/story mismatch;
- visible forbidden words;
- personal or routable email domains;
- orphaned customer/order/case/evidence/recovery relationships;
- missing or mixed currency on capture records;
- aggregate reconciliation failure;
- impossible timestamps;
- repetitive first-viewport distributions;
- connection count/state disagreement;
- incomplete hero records;
- missing route-ready data.

The validator should print the stable capture URLs and a concise pass/fail report. It must not print customer payloads or secrets.

### 5.5 Phase 2 focused acceptance check

Run one clean seed and one idempotency pass:

```bash
npm run seed:marketing -- --as-of=2026-07-26T12:00:00.000Z
npm run validate:marketing-seed -- --as-of=2026-07-26T12:00:00.000Z
npm run seed:marketing -- --as-of=2026-07-26T12:00:00.000Z
```

The second seed must produce no duplicate growth or changed stable capture keys. The validator must confirm the three hero cases, same-scope financial arithmetic, safe identities, and zero fixture/PII strings. Inspect the seeded Overview, Cases, one hero case, Customers, Recovery, Reports, and Integrations once at 1440px for story contradictions or obvious repetition. Later route phases own visual-width and edge-state testing.

Do not create a second QA fixture, hash/fingerprint ceremony, three-reset proof, per-SEED test file, or persistent validation artifact. Apply §3.5 once.

---

## 6. Phase 3 — Terminology and merchant-facing content

- **Owned IDs:** COPY-01–COPY-17
- **Prerequisite:** Phase 2 `COMPLETE`
- **Phase outcome:** Every merchant-facing string uses one product vocabulary, states exactly what is known, and contains no internal architecture, fixture, or misleading financial language.

### 6.1 Required deliverables

1. One label/definition registry for entity names, financial stages, statuses, sources, providers, time ranges, and unavailable/zero/error semantics.
2. Updated navigation, page titles, breadcrumbs, tabs, actions, forms, empty/loading/error states, notifications, reports, exports, and detail copy.
3. Count-aware pluralisation and major-unit currency input/display helpers.
4. One existing rendered/source copy scan, the two focused label/money tests below, and representative state fixtures. Do not create a second content-compliance framework.

### 6.2 Canonical vocabulary

| Concept | Required merchant-facing term | Terms to remove or restrict |
|---|---|---|
| Core operational object | **Case** | `Payout case`, `claim`, and `dispute` as interchangeable page nouns |
| Provider/carrier submission | **Claim** only when a real provider claim is meant | Generic use for every support case |
| Chargeback | **Chargeback** only for the payment dispute | Generic `dispute` for non-chargeback cases |
| Case events | **Case activity** or **Timeline** | `Claim events`, duplicate `Claim history` |
| Money | Formatted major-unit currency, e.g. `£55.00` | `Amount (minor)` and raw minor-unit values |
| Applied policy | **Rule** | `Immutable version`, `canonical rule` in everyday UI |
| Record origin | **Source** and **Last synced** | `Provenance`, `canonical source`, ambiguous `Last update` |
| Tenant boundary | **Your workspace/store** when it must be explained | `Merchant-scoped` |
| Feature availability | Direct description of what is and is not available | `Release gate`, `release-gated`, `capability ID` |
| Data model | Plain description such as “financial history” | `Canonical loss read model`, `financial invariant` |
| Workflow | **Flow**, **Preview**, **Run** | `Versioned flow workspace`, `dry-run definitions` as primary copy |
| Error | “We couldn’t load …” plus next action | `Recoverable error`, `Page error`, JavaScript error name |

### 6.3 Content fixes

| ID | Priority / scope | What was wrong before | Required change and implementation notes | Success metric |
|---|---|---|---|---|
| COPY-01 | P0 · Product | Cases, Payout case, claim, Claim history, claim events, and dispute appeared in the same experience. | Adopt §6.2 throughout navigation, titles, tabs, badges, empty/error states, and customer narratives. Keep internal database/type names internal. | Rendered-text test finds no prohibited generic uses; a merchant-facing terminology review has zero unexplained noun switches. |
| COPY-02 | P0 · Product | Case reconciliation asked users to understand “Amount (minor).” | Format and edit money in major units with an explicit currency; convert at the API/form boundary and preserve integer minor units internally. | No merchant-facing “minor” label or unformatted integer amount; round-trip tests preserve the exact minor-unit value. |
| COPY-03 | P1 · Product | Rules subtitle used long, abstract language about readable policy, immutable versions, and non-binding recommendations. | Replace with a short outcome-led line: what rules affect and that the merchant remains in control. Move version-history detail beside version controls. | Page subtitle fits on one line at 1280px in English and contains no implementation term. |
| COPY-04 | P1 · Product | Flows repeatedly said preview mode, definitions, dry-run tests, live execution release-gated, and release gate. | State availability once near the primary action. Use ordinary verbs: create, test, publish, pause. If publishing is unavailable, disable it with one plain explanation. | “Preview” or availability warning appears at most once in the initial viewport; `release gate` has zero rendered matches. |
| COPY-05 | P1 · Product | Integrations said “Provider-neutral source connection” and “Health checks update when this page opens.” | Name the actual source/account and describe the useful outcome: last successful sync, current health, and repair action. Remove instrumentation narration. | Every visible connection copy is provider-specific or intentionally category-specific; no page-open implementation copy remains. |
| COPY-06 | P1 · Product | Work’s empty title “Your work queue is ready” was used when there was no work, and the save modal called the page the “Work cockpit.” | Use state-specific plain language: “No open work,” “No results for …,” or “Connect a source to create work.” Call the product surface “Work.” | Empty, filtered-empty, and disconnected fixtures each render distinct copy; `cockpit` has zero matches. |
| COPY-07 | P1 · Product | Case detail instructed “Match the claimed item first, then refresh to produce the three recommendations,” exposing the system sequence. | Present one actionable task with the unmatched item and a clear “Match item” action. Generate/refresh recommendations automatically after a successful explicit match. | User can resolve the state in one obvious flow; no copy tells them to manually refresh a computed model. |
| COPY-08 | P1 · Product | “No merchant rule matched” read like a failure and offered little direction. | Use “No rule applies” with the default recommendation source and an optional “Review rules” link. In the marketing hero case, seed an applicable rule. | Unmatched-rule QA state explains the safe fallback; hero case displays a named applied rule. |
| COPY-09 | P1 · Product | Recovery used “1 evidence missing” and labelled internal row updates as source updates. | Use plural-aware “1 item missing / N items missing” and correct provenance labels per SEED-23. | Grammar tests cover 0, 1, and many; source timestamp label is semantically accurate. |
| COPY-10 | P1 · Product | Customer narrative switched between refund claim, payout case, and dispute; identity grammar said “1 additional identity … share.” | Use “case” in general narrative, reserve “refund request” for the actual request, and apply pluralisation helpers to every count. | Snapshot coverage for 0/1/2 counts passes; no contradictory noun appears in a single customer page. |
| COPY-11 | P1 · Product | Reports displayed “Written off — Unavailable,” dense definitions, raw UUIDs, and underscored machine values in drill-downs. | Use a clearly styled unavailable state with an explanation path, humanise enum values through approved maps, and show merchant references instead of UUIDs. | No raw UUID or underscore enum in product-visible report routes; unavailable is distinguishable from zero and error. |
| COPY-12 | P1 · Product | “Recoverable £1,105.41 — Confirmed loss eligible to pursue” appeared next to confirmed loss of £163.28, making the definition mathematically impossible. | Correct the metric definition and query. Recoverable must be a subset of eligible confirmed loss for the same scope, or be renamed if it includes estimates/exposure. | Reconciliation assertion enforces `recoverable ≤ eligible confirmed loss` for the same scope/currency, or the UI uses the approved non-loss label. |
| COPY-13 | P2 · Product | Notifications included lower-cased “shopify connection needs attention.” | Sentence-case event titles at creation or approved display mapping; preserve provider brand casing. | Notification title lint passes; Shopify/Gorgias/Zendesk casing is correct everywhere. |
| COPY-14 | P2 · Product | “Generated [timestamp]” made Overview and Reports feel like static exports and quickly made screenshots stale. | Prefer “Updated just now/at …” only where freshness changes a decision; omit decorative generation metadata from hero composition. Keep exact generation time in export metadata or tooltip. | No selected landing screenshot includes a stale-looking generated timestamp; production freshness remains accessible where operationally relevant. |
| COPY-15 | P2 · Product | Not-found/error actions still used older “Back to dashboard” and “Open claims” labels. | Point to the current route and vocabulary: Overview, Work, or Cases based on context. | All route state links resolve and match current navigation labels. |
| COPY-16 | P0 · Product | Recommendation, merchant decision, source-observed customer outcome, confirmed loss, eligible recovery, and recovered cash could be compressed into similar “decision/outcome” language. | Publish one label/definition map for the six stages and use it in case detail, ledgers, Recovery, Reports, tooltips, and exports. Do not imply a recommendation executed an action or an approved claim became cash. | Every displayed value/status maps to one stage; calculation/copy contract tests pass and moderated reviewers distinguish recommendation from paid/recovered money. |
| COPY-17 | P1 · Product | Dashes, `Unavailable`, `Unknown source`, zero, and loading could look interchangeable. | Reserve dash for inapplicable/compact absence, use explicit unavailable with cause for missing calculation, use zero only for known zero, and treat missing provenance/load failure as repair/error states. | State fixtures are visually and semantically distinct; no target capture contains an unexplained dash/unavailable/unknown value. |

### 6.4 Phase 3 focused acceptance check

Run one rendered/source copy scan plus the smallest label/money tests:

```bash
npm run verify:merchant-copy
npm test -- --runInBand \
  tests/unit/uiLabels.test.ts \
  tests/unit/moneyFormatting.test.ts
```

In one seeded browser pass, search the visible/accessibility text of the primary routes for prohibited terms, raw UUIDs/enums, stale route names, currency-unit leakage, and provider casing. Sample one pluralisation fixture, one unavailable/error state, and the money round trip. Route phases will verify their own final copy; do not build a second copy-verification framework or open every possible state here. Apply §3.5 once.

---

## 7. Phase 4 — Shared hierarchy, components, and “AI slop” removal

- **Owned IDs:** SYS-01–SYS-28
- **Prerequisite:** Phase 3 `COMPLETE`
- **Phase outcome:** One documented, accessible, visually coherent component/composition system prevents route work from reproducing the same defects locally.

### 7.1 Required deliverables

1. Reconciled Quiet Precision documentation, tokens, contracts, and gallery, checked with the existing design-contract command.
2. A reduced structural primitive set with deprecation/removal path for overlapping surfaces.
3. Correct canonical table semantics/density, metric-grid dividers, tabs/navigation semantics, tooltips, skeletons, empty states, motion, and the shared desktop-only boundary.
4. Enforced one-primary-action, no nested standard surfaces, no repeated-count callout, and status/filter/metadata distinctions.
5. Contrast/type/border/chart-label token corrections that remain restrained at full size and legible after landing-size compression.
6. Representative design-system gallery fixtures for each primitive family, including long labels, odd metric counts, key semantic states, and the supported-width boundary.
7. Use the existing authenticated-design lint for new page-local primitives, unsupported type/spacing values, and static inline styles; do not create another linter or documentation-verification system.

The generic quality is structural, not chromatic. Repeated white rounded rectangles, an icon beside every label, muted explanatory copy, and multiple pills make distinct workflows look mechanically generated. Fix the shared composition before adjusting individual pages.

| ID | Priority / scope | What was wrong before | Required change and implementation notes | Success metric |
|---|---|---|---|---|
| SYS-01 | P0 · Product | Many pages repeated current-location breadcrumb and the same page title immediately below it. | Do not render the current page as a visible breadcrumb when the H1 already names it. Keep a parent breadcrumb only on true nested routes. | Index routes have one visible title; detail routes show parent link + one record title without duplicate current label. |
| SYS-02 | P1 · Product | KPI strip → insight sentence → work surface → summary rail was reused on Customers, Losses, Rules, Flows, and Notifications. | Assign each route its binding page family and remove passive modules that do not change a decision. Registries lead with toolbar/data; boards lead with workflow; settings lead with form; reports lead with one question. | No two adjacent primary routes share the same full module sequence unless they are genuinely the same workflow family. |
| SYS-03 | P1 · Product | Rounded bordered cards were nested inside rounded bordered panels, producing double frames on Customers, case Workbench, dispute context, reconciliation, and Integrations. | A bounded parent owns the edge. Direct children become joined sections, border-top groups, or unbounded content. Reserve nested borders for interactive inset controls with a distinct job. | Gallery and representative capture routes show no standard surface nested inside another standard surface, except a purposeful interactive inset. |
| SYS-04 | P1 · Product | KPI counts were repeated in a callout, table header, page summary, and right rail. | Give each fact one primary location. A secondary occurrence is allowed only when scope or action differs and the label makes that distinction explicit. | Content review finds no same-scope count repeated more than once in the initial viewport. |
| SYS-05 | P1 · Product | Nearly every state and category became a pill, weakening semantic hierarchy. | Use badges only for status, compact counts, or unavoidable metadata. Present source, owner, dates, and ordinary categories as text/columns. Filter chips remain interactive and visually distinct from status. | Initial viewport of each registry averages no more than two non-interactive badges per row/card; selection cannot be mistaken for warning/success. |
| SYS-06 | P1 · Product | Icons appeared beside many KPI labels and headings without adding meaning, reinforcing a template-generated look. | Keep icons for actions, providers, warnings, object identity, or rapid category recognition. Remove repeated decorative icons from KPI labels and prose callouts. | No KPI group repeats a different Lucide icon in every cell; all remaining icons have an identifiable semantic job. |
| SYS-07 | P1 · Product | Page-level primary action hierarchy was often lost among chips, alerts, tabs, and secondary buttons. | Enforce at most one page-level primary and one secondary action in the header. Put row/local actions at the relevant surface. Do not style passive filters as primary. | Visual/DOM check finds at most one primary button in each page header and one in each modal footer. |
| SYS-08 | P1 · Product | Supporting rails stack below the main surface until 1600px, so at common 1440px captures useful context lands below the fold. | Decide per page whether the rail is essential. Essential context joins a two-column layout at a tested 1280/1366/1440 breakpoint; non-essential duplicated rails are removed. Do not globally squeeze data tables. | Selected capture routes show required context above the fold at 1440×900 without reducing the primary work area below its minimum width. |
| SYS-09 | P1 · Product | `DataTable` used a white head and 52px default rows while the binding contract specifies a quiet filled head and 40px operational rows. Some routes hand-rolled tables instead. | Align canonical table styles and density names with the contract. Migrate route tables or formally document the few domain-specific grids that cannot use the primitive. | All capture registries use the canonical header treatment; operational rows are 40–44px unless content demonstrably needs more; no duplicate outer frame. |
| SYS-10 | P1 · Product | Customers wrapped `DataTable` in another bordered rounded container. | Let the canonical table surface own its border, clipping, toolbar, result count, and pagination. | Exactly one visible perimeter surrounds the customers table; focus/overflow behaviour is unchanged. |
| SYS-11 | P1 · Product | Customer detail and other routes still used hand-rolled tables and metric-card pairs inside `SectionCard`. | Convert these to joined rows/definition lists or canonical `DataTable`/metric groups. Use border-top separation instead of card-within-card. | Detail pages contain no hand-rolled table that duplicates the canonical table interaction contract. |
| SYS-12 | P0 · Product | Authenticated routes attempted to adapt their complete product UI to unsupported narrow widths, creating substantial mobile-specific layout work and inconsistent behaviour. | Add one shared root/layout boundary: render the authenticated product at ≥1024 CSS px and a concise accessible Desktop required notice below 1024. Use width, not user-agent detection; direct links and resizing must behave consistently and product controls must not remain in the accessibility tree below the boundary. | At 1024px the complete product is operable; at 1023px and 390px only the shared notice is visible and exposed to assistive technology; resizing and deep links cross the boundary without errors or content leakage. |
| SYS-13 | P1 · Product | Main dashboard gutters used 28px while the binding shell uses 16–20px; some page-local gaps and weights (`650`) escaped the token contract. | Use canonical page gutter, spacing, and 400/500/600 type weights. Rely on the existing authenticated-design lint for prohibited values. | Capture routes contain no 650 weight or out-of-contract page gutter; major content edges align across navigation. |
| SYS-14 | P1 · Product | Initial data-surface animations lasted 420–460ms with a stagger, exceeding the documented 220ms maximum and causing unstable captures. | Reduce to the canonical duration or remove entry motion from routine operational data. Respect reduced motion and expose a capture mode that disables non-essential animation. | Product motion ≤220ms; screenshot readiness fires after zero active animations; reduced-motion run has none. |
| SYS-15 | P1 · Product | Tertiary text on canvas was approximately 4.35:1 and some subtle/default boundaries were around 1.2–1.35:1, disappearing under screenshot compression. | Adjust tokens or usage so normal text reaches 4.5:1 and required controls/graphics reach 3:1. Decorative separators may remain subtle only when not the sole boundary cue. Review one representative compressed thumbnail. | Existing contrast checks pass for the changed token pairs; the representative thumbnail still distinguishes controls, tables, and secondary text. |
| SYS-16 | P1 · Product | Chart labels and some metadata were 10–12px, below the product’s standard compact text and illegible in landing thumbnails. | Use at least 13px for standard chart labels and essential table metadata; reserve 11–12px for genuinely non-essential captions with sufficient contrast. Reduce label count instead of shrinking type. | At the intended landing display width, primary chart labels and values are readable without zoom; essential text is ≥13px. |
| SYS-17 | P1 · Product | Loading, zero, empty, filtered-empty, partial, stale, disconnected, unavailable, permission, and error states were not consistently distinct. | Implement these semantics once in geometry-aware shared states and retain current content during background refresh. Route phases choose only the states they actually use. | The gallery distinguishes each shared state once; changed routes never use empty to hide a fetch failure. |
| SYS-18 | P1 · Product | Generic insight callouts repeated obvious counts and added another bordered rectangle. | Keep a callout only for a non-obvious conclusion, risk, or required action. Otherwise put the sentence in the page subtitle, table caption, or omit it. | Every remaining callout changes what the merchant should understand or do; no callout merely restates adjacent KPIs. |
| SYS-19 | P2 · Product | Surfaces mixed outer rounded capsule tabs with inner underline/tab metaphors, especially case detail. | Use one navigation model per level: attached tabs for sibling sections or a segmented control for a mutually exclusive view. Avoid a second tab metaphor inside the same viewport. | Case detail and settings each expose one visually unambiguous local-navigation system. |
| SYS-20 | P2 · Product | Provider/catalogue cards used the same logo-title-copy-pills-footer template repeatedly. | On management views, prefer compact rows. Reserve catalogue cards for browsing, reduce metadata chips, and vary layout only when information hierarchy requires it—not decoratively. | Connected sources render as operational rows; browse cards expose one clear purpose and no redundant metadata. |
| SYS-21 | P0 · Product | The binding Quiet Precision document and current tokens/contracts have drifted: documented canvas/shell/surface values and primitive ownership do not fully match the current CSS and component inventory. | Make an explicit design decision on the approved token values, then update the long specification, concise README, tokens, gallery, and contract comments together. Use the existing design-contract check; add no new parity layer. | One authoritative token/primitive table agrees with the CSS and representative gallery. |
| SYS-22 | P1 · Product | `Card`, `Panel`, `SectionCard`, `AuthenticatedPanel`, Metric groups, workbench strips, and page-local panels overlap in structural purpose. | Converge on working surface, joined section, inset group, metric group, and floating surface. Deprecate overlapping APIs and keep page modules responsible for composition only. | Every capture-route surface maps to one documented primitive; design lint reports zero new bespoke panel/card systems. |
| SYS-23 | P2 · Product | Some shared primitives own static visual appearance through inline style objects even though the binding contract limits inline styling to data-derived geometry. | Move static colour, border, radius, padding, and type appearance into the authenticated component layer; retain inline custom properties only for data-derived values. | Authenticated-design lint has no static-style exceptions for canonical primitives; a static visual change is made in one component style source. |
| SYS-24 | P0 · Product | Canonical tables make the `<tr>` itself focusable/clickable while also containing links and menus; a row is not a native interactive control, and individual skeleton cells can repeat “Loading row.” | Put a real link in the primary identity cell and explicit buttons in the action cell. Remove row keyboard emulation unless a fully conforming grid is warranted. Mark visual skeleton cells hidden and announce loading once on the containing region. | Accessibility tree contains valid links/buttons, nested actions operate independently, Enter follows the identity link, and screen readers hear one loading announcement. |
| SYS-25 | P0 · Product | Tabs and segmented controls can both use `role="tablist"` without consistently implementing arrow keys, controlled tab panels, or the correct semantics for route-changing links. | Use ordinary navigation semantics for route links, the APG tabs pattern for actual in-page panels, and radio/pressed semantics for view selection where appropriate. Implement arrow/Home/End and focus behaviour only for true tabs. | Automated/manual keyboard tests pass; real tabs have correct `aria-controls`/tabpanel relationships; route links remain links. |
| SYS-26 | P1 · Product | Generic skeleton dimensions do not match resolved headers, table heads/rows, metric groups, or route rails, creating avoidable layout shift. | Build route-family skeletons from the same layout tokens and density values as resolved content. Keep existing content mounted during background refresh. | Core-route CLS from loading to ready is ≤0.05; header, metric, toolbar, table, and rail geometry do not jump. |
| SYS-27 | P2 · Product | The default four-square empty-state motif and generic “No results” treatment reinforce a template-generated feel. | Prefer compact route-specific text and one relevant action. Use an illustration only when it communicates domain meaning; distinguish onboarding-empty from filtered-empty. | No selected screenshot contains the generic empty motif; every empty state names its cause and next step in two short sentences or fewer. |
| SYS-28 | P2 · Product | Small information dots rely on native `title` text, which is weak for mouse and keyboard users. | Use the shared accessible tooltip/popover pattern with a labelled trigger, visible focus, and keyboard access. Essential instructions must remain inline. | Tooltip/help opens by mouse and keyboard; its labelled trigger is at least 24×24px or sufficiently spaced. |

### 7.2 Phase 4 focused acceptance check

Run the existing design contract/lint and the smallest shared-component selection:

```bash
npm run verify:design-contract
npm run lint:authenticated-design
npm test -- --runInBand \
  tests/unit/statusBadge.test.ts \
  tests/components/no-link-button-nesting.test.ts
```

In one gallery/browser session at 1440px and 1024px, sample each changed primitive family in its meaningful default, focus, disabled, loading/error, and long-label state. Check MetricGroup odd/even dividers, native table/tab keyboard behaviour, approved contrast tokens, and the boundary at 1023px. Use one light-mode pass plus representative dark/forced-colour/reduced-motion samples; do not multiply every primitive by every theme, width, and state. Route phases own route composition. Apply §3.5 once.

---

## 8. Route implementation phases

### 8.1 Phase 5 — Shell, Overview, and Work

- **Owned IDs:** SHELL-01–SHELL-06, OVR-01–OVR-05, OVR-07, OVR-09, WORK-01–WORK-09
- **Prerequisite:** Phase 4 `COMPLETE`
- **Phase outcome:** The shared entry experience is coherent, action-first, unclipped, and immediately credible throughout the supported desktop range.

#### 8.1.1 Required deliverables

1. One shell identity/connection/navigation source with no duplicate Settings/current-location labels and truthful count scopes.
2. An action-first Overview composition with compact, legible charts and stable desktop controls/order.
3. A Work view model with visible primary views/Save action, healthy saved-view API, truthful search/filtered counts, varied owners, and one clear toolbar hierarchy.
4. Route-specific loading/empty/error/degraded fixtures and focused shell/dashboard/work tests.
5. One reviewed browser pass for the three routes at 1440px and 1024px.

#### 8.1.2 Global shell and navigation

| ID | Priority / scope | What was wrong before | Required change and implementation notes | Success metric |
|---|---|---|---|---|
| SHELL-01 | P0 · Both | Workspace identity and operator identity exposed test/personal data. | Bind shell identity to the marketing manifest and retain safe truncation/accessible full label. | Header/sidebar contain only approved fictional identity at all target widths. |
| SHELL-02 | P0 · Product | Sidebar connection status contradicted Integrations. | Consume the canonical connection read model and show the primary support-source state, impact, and link. | Same state and repair destination appear in shell and Integrations. |
| SHELL-03 | P1 · Product | Settings appeared both in the main navigation group and again in the footer. | Keep one stable Settings destination. Footer may contain account/help/logout, not a duplicate route. | One Settings link in the expanded and collapsed navigation accessibility tree. |
| SHELL-04 | P1 · Product | Some wide warnings/actions clipped at 1440px. | Give header content a min-width-zero layout, wrap or collapse low-priority actions, and test with long merchant/localised labels. | No shell alert, chip, or action exceeds the viewport from 1024–1440px. |
| SHELL-05 | P2 · Product | Current location was communicated by sidebar selection, breadcrumb, eyebrow, and H1 on some routes. | Keep sidebar selection + H1 for indexes; add a parent breadcrumb only on nested detail. Remove decorative eyebrow when it repeats location. | A route’s current location is clear but named visually no more than twice. |
| SHELL-06 | P1 · Both | Sidebar Cases badge showed `99+` while Overview showed 25 cases in the selected period; neither scope was visible, so the values looked contradictory. | Derive the badge from a named query such as all currently open cases and expose that scope in its accessible label/tooltip. Keep period-bound Overview counts explicitly labelled. The marketing fixture should avoid a gratuitous `99+` unless scale is part of the story. | Badge count reconciles exactly to its documented query; a reviewer does not interpret it as the same scope as the Overview period count. |

#### 8.1.3 Overview

| ID | Priority / scope | What was wrong before | Required change and implementation notes | Success metric |
|---|---|---|---|---|
| OVR-01 | P1 · Product | Priority work appeared below a large Payout performance chart and Data health, even though action is the dashboard’s main job. | Place Priority work immediately after the compact operational summary. Move the main chart after action, or reduce its height enough to keep work above the fold. | At 1440×900, title, core KPIs, and at least three priority items are visible without scrolling. |
| OVR-02 | P1 · Product | Open work was repeated in the page header and Workflow breakdown. | Keep the actionable summary once; use the second area for a different question or remove it. | No same-scope open-work count appears twice in the initial viewport. |
| OVR-03 | P1 · Product | The performance chart dominated the page and delayed priority work. | Set a question-led compact desktop height and preserve the underlying accessible table. Reduce label count rather than shrinking text. | Chart is ≤320px high unless tested data density requires more; priority content remains discoverable at every supported width. |
| OVR-04 | P1 · Product | Chart remainder was transparent, weakening the visual track. | Render an accessible neutral track/remainder with sufficient non-text contrast or change to a simpler bar form. | Values are interpretable without relying on tooltip or colour; track remains visible after compression. |
| OVR-05 | P2 · Product | Generated timestamp made the page look stale. | Apply COPY-14. | No approved Overview capture contains decorative generated metadata. |
| OVR-07 | P0 · Fixture | The reviewed merchant showed 57% source freshness and 464 stale records, making the hero dashboard describe a broadly unhealthy setup. | Seed a mostly healthy operating baseline with one clear, useful exception. Keep a separate degraded fixture for QA; do not simply recolour or hide stale production facts. | Approved Overview capture has a credible freshness rate, one explainable attention state, and data-health totals that reconcile to source records. |
| OVR-09 | P2 · Product | Range labels mixed terse `Last 30d` with `Last 30 days` on the same product surface. | Use one shared range formatter for controls, KPIs, chart labels, exports, and links. | A route text scan finds only the approved range label for a given context. |

#### 8.1.4 Work

| ID | Priority / scope | What was wrong before | Required change and implementation notes | Success metric |
|---|---|---|---|---|
| WORK-01 | P0 · Product | Eleven equal-weight horizontal view chips pushed “Save view” outside the viewport, including at 1440px. | Keep 4–6 high-value system views visible; move remaining views and saved views into an accessible “More views” menu or a compact view selector. Keep Save view as a visible local action. | Save view is visible without horizontal scrolling at 1024–1440px; all views remain keyboard accessible. |
| WORK-02 | P0 · Product | Saved-view API failure was silently treated as no views. | Apply RUN-06 with a local status beside the view selector. | Failure and empty states are distinguishable; retry works. |
| WORK-03 | P0 · Product | Filtered-zero search left an empty table and wrong footer. | Derive rows, selectable IDs, empty state, and footer from one visible-result model; prune selections when rows leave that result set. | One focused test covers 0, 1, and many results, correct counts, and selection that does not return after clearing search. |
| WORK-04 | P1 · Both | Every owner appeared as Analyst. | Apply SEED-11 and show role only as supporting metadata when useful. | First viewport contains a believable owner mix and no repeated generic avatar factory pattern. |
| WORK-05 | P1 · Product | View pills, saved pills, search, selection toolbar, and row badges created too many equal-priority controls. | Establish levels: view selector, search/filter toolbar, then table. Only show bulk toolbar after selection. Use text/columns for non-status metadata. | The default state has one obvious view control and one filter toolbar; status pills do not compete with navigation. |
| WORK-06 | P1 · Product | Footer “Showing N of total” did not state whether N was loaded, filtered, or server total. | Label result counts from a single pagination/filter model: “N results,” or “Showing X–Y of N”; include “filtered from N” only when relevant. | Counts remain correct after view change, search, pagination, and mutation. |
| WORK-07 | P1 · Product | The page could show a wide table plus a below-fold summary rail, diluting the work task. | Remove duplicate summary rail; keep details in row destination/drawer. | At 1440×900, the table owns the main working area and useful rows are above the fold. |
| WORK-08 | P2 · Product | Save modal referred to “Work cockpit” and mixed system/saved-view terminology. | Apply COPY-06 and use one view model in labels and URLs. | Modal, toast, empty state, and navigation all call the surface “Work” and the saved object a “view.” |
| WORK-09 | P2 · Product | One view used “No SLA” while rows and other routes used “No deadline,” creating a second term for the same absence. | Use **No deadline** unless a real service-level agreement is the object being configured or reported. | View label, row, filters, empty state, and modal use the same term. |

#### 8.1.5 Phase 5 focused acceptance check

```bash
npm test -- --runInBand \
  tests/unit/navigationPermissions.test.ts \
  tests/unit/dashboardModel.test.ts \
  tests/components/workQueueResultModel.test.tsx
```

In one browser session at 1440px and 1024px, inspect the shell, Overview, and Work. Confirm navigation/title hierarchy, truthful shell counts/state, priority work above the fold, readable chart labels, visible Save view, and correct zero/many/selection/footer behaviour. Check one healthy saved view and one injected unavailable state; do not exercise every system view when they share the same component path. Console/hydration/required-request/unintended-write failures must be zero. Apply §3.5 once.

### 8.2 Phase 6 — Cases registry and case detail

- **Owned IDs:** CASES-01–CASES-10, CDET-01–CDET-17
- **Prerequisite:** Phase 5 `COMPLETE`
- **Phase outcome:** Cases provides a complete registry and one coherent, decision-led detail workspace with no broken APIs, compatibility residue, empty hero content, or automatic page-load mutation.

#### 8.2.1 Required deliverables

1. Searchable, truthful Cases registry with correct waiting time, evidence status, source warning behaviour, and information-dense preview.
2. Complete hero case detail answering Customer action, Responsibility, and Recovery with linked evidence, rule, investigation, finance, timeline, notes, and source context.
3. Removal of compatibility/duplicated case UI and empty disabled controls.
4. Explicit major-unit decision entry, disabled-state reasons, URL-restorable section navigation, semantic desktop ordering, and stable server-rendered identity.
5. Registry/detail parity, read-purity, amount round-trip, and route-completeness tests.

#### 8.2.2 Cases registry

| ID | Priority / scope | What was wrong before | Required change and implementation notes | Success metric |
|---|---|---|---|---|
| CASES-01 | P0 · Both | Registry data warned values could be zero or missing; evidence-package status was forced null. | Fix the read model and fixture rather than adding a capture-specific disclaimer. Keep a truthful partial-data state only for genuinely partial merchants. | Marketing registry has complete values and no partial-data warning; QA partial fixture still renders the warning. |
| CASES-02 | P0 · Fixture | Every case said `0d waiting` despite materially different ages. | Apply SEED-10 and clarify which deadline/waiting clock is shown. | Displayed age values reconcile and visibly vary. |
| CASES-03 | P1 · Product | Navigation said Cases while H1 said Case reconciliation. | Use **Cases** for the registry. Explain reconciliation in the subtitle only if needed. | Sidebar, breadcrumb, document title, H1, and empty/error states use Cases. |
| CASES-04 | P1 · Product | The disconnected-source warning could clip and competed with the registry toolbar. | Use one compact actionable banner below the header; wrap copy/action and reserve full critical styling for data-impacting states. | Banner fits from 1024–1440px and has one repair action. |
| CASES-05 | P1 · Product | Selected row and detail pane duplicated amount/status without adding decision context. | Let the row provide scan data; let the preview lead with the next action, evidence gap, or decision summary. | At least half of the preview’s initial content is new context rather than repeated row fields. |
| CASES-06 | P1 · Product | Workbench panels nested multiple cards and badges. | Flatten selected-case content into joined sections and use one section navigation model. | One outer workbench boundary; direct child sections use dividers, not independent cards. |
| CASES-07 | P2 · Product | Heavy pills made case rows look mechanically generated. | Keep one lifecycle badge and, if necessary, one urgency badge. Move source/owner/type to columns/text. | No default case row has more than two status/metadata badges. |
| CASES-08 | P2 · Product | Registry/detail naming alternated between case, claim, and payout. | Apply COPY-01. | Terminology snapshot passes. |
| CASES-09 | P1 · Product | A large case registry exposed multiple filters/sort controls but no obvious search by customer, order, ticket, or case reference. | Add one primary search backed by the server query/read model; consolidate advanced filter and sort controls so search remains visible at all supported widths. | Each supported reference finds the expected fixture record; toolbar does not wrap or clip at 1280px. |
| CASES-10 | P2 · Product | “Build evidence” from an empty package could send the operator indirectly to a customer profile rather than the selected case task. | Link to the precise case evidence workflow or label the destination and reason unambiguously. Preserve selected-case context. | CTA lands on a focused evidence action for the same case and browser Back restores the registry selection. |

#### 8.2.3 Case detail

| ID | Priority / scope | What was wrong before | Required change and implementation notes | Success metric |
|---|---|---|---|---|
| CDET-01 | P0 · Product | Missing schema and failed endpoints left the detail route functionally broken. | Complete RUN-01–RUN-05 before visual polish. | All required detail requests are 2xx with zero console/hydration errors. |
| CDET-02 | P0 · Both | A supposedly rich case settled with an empty disabled control in Evidence reconciliation. | Remove orphan controls when no action is valid. For partial states, render a named explanation and next action; for the marketing case, seed a valid selected/matched item. | No disabled blank control in any state; hero case has an intelligible selected value. |
| CDET-03 | P0 · Fixture | Hero case had no events, financial history, recovery route, evidence, comments, or activity. | Apply SEED-06 and SEED-17. | All capture-relevant sections contain coherent content; empty states remain covered separately in QA. |
| CDET-04 | P0 · Both | Seeded rule did not appear to match the case. | Make recommendation inputs deterministic, version the applied rule snapshot, and validate the hero case’s expected rule. | Hero case displays the named rule/version and recommendation test asserts the same ID. |
| CDET-05 | P1 · Product | Compatibility compensation context remained mounted alongside the new reconciliation summary, duplicating decision/evidence concepts. | Remove `PayoutCaseLeadBlock` after migrating the remaining unique value breakdown/actions into the target three-answer workspace. Do not retain a compatibility card in the final UI. | No compatibility-labelled component or duplicated value/evidence block in case detail. |
| CDET-06 | P1 · Product | `ClaimReviewContextColumn` mounted evidence checklist, recommendation, investigation, responsibility, compensation, finance, source evidence, recovery, and history as a long card stack. | Recompose around the three operator questions: customer action, responsibility, recovery. Place evidence and timeline as joined support sections; reveal advanced detail progressively. | Initial viewport answers what happened, recommended next action, why, value, deadline, and owner without scrolling through redundant cards. |
| CDET-07 | P1 · Product | A rounded segmented capsule was used like sticky tabs while lower sections used another history/tab metaphor. | Use one attached section-navigation component with Cases terminology and stable anchors/URL state. | One local navigation pattern; keyboard/URL restoration works; no nested tab metaphor. |
| CDET-08 | P1 · Product | “Match then refresh” and “No merchant rule matched” exposed system sequencing. | Apply COPY-07 and COPY-08. | Each incomplete state offers one direct task and automatically refreshes downstream read state after success. |
| CDET-09 | P1 · Product | Financial history empty copy referred to “canonical financial entries,” and missing values appeared as a largely blank panel. | Use merchant-facing financial stages; if none exist, explain which observed outcome is still required and link to the relevant task. | No internal ledger term; empty state is actionable and cannot be confused with £0. |
| CDET-10 | P1 · Product | Timeline/history sections were empty or repetitive and “Claim history” conflicted with current case. | Merge into **Timeline**, separating current-case activity from links to previous customer cases. | Timeline is chronological, source/actor-labelled, and uses “previous cases” only for distinct records. |
| CDET-11 | P1 · Product | Tags exposed fixture and old product language. | Apply SEED-07; visually de-emphasise tags below operational status. | No fixture tag; tags never compete with status/action in the header. |
| CDET-12 | P1 · Product | Amount editing exposed internal units. | Apply COPY-02 with locale/currency-aware input and validation. | User sees `£55.00`; stored value remains `5500`; error and keyboard tests pass. |
| CDET-13 | P2 · Product | Page initially showed generic “Case” and multiple loading labels, causing layout shift. | Server-render stable case identity and header skeleton dimensions; load optional panels without replacing the title. | H1 and header geometry do not change after hydration; CLS ≤0.05 on the route. |
| CDET-14 | P2 · Product | Previous-case warning used another bordered card in the history stack. | Replace with a compact inline link/count near customer context. | Previous cases remain discoverable without adding a full warning surface. |
| CDET-15 | P1 · Product | A disabled “Record decision” action had no nearby explanation, making the page look broken rather than intentionally incomplete. | Keep consequential choices unselected by default, but expose the unmet requirement/helper text in the form and to assistive technology. Show validation after interaction rather than as a permanent error. | Every disabled state has an announced, visible reason; the pristine form does not imply a default financial/responsibility choice. |
| CDET-16 | P1 · Product | At intermediate desktop widths, a 360px sticky decision rail could compress evidence content and make section order feel incidental. | Define content minimum widths and a semantic desktop order: recommended answer/action → supporting evidence → source/decision history. Only keep the rail sticky while its whole action region remains reachable. | No overflow at 1024/1280; DOM and visual order match; the full sticky action region remains reachable. |
| CDET-17 | P2 · Product | Phrases such as “three independent answers” and repeated advisory disclaimers described system architecture more than the merchant’s task. | Use the three direct labels—Customer action, Responsibility, Recovery—and place the supervised-decision disclaimer once at the consequential action. | Initial viewport is understandable without architecture copy; the control boundary remains explicit at the decision point. |

#### 8.2.4 Phase 6 focused acceptance check

```bash
npm run verify:evidence
npm run verify:rules
npm test -- --runInBand \
  tests/api/claimsRoutes.test.ts \
  tests/lib/caseReadModel.test.ts \
  tests/unit/reconciliation/caseStore.test.ts \
  tests/unit/reconciliation/recommendations.test.ts
```

In one browser session, inspect the registry and primary hero case at 1440px and 1024px. Confirm registry/detail parity, populated required sections, one search/selection path, section navigation, item match/recommendation refresh, the major-unit money round trip, and the consequential decision controls by keyboard. Sample partial/unmatched/no-rule/request-failure states through the smallest existing fixtures rather than reopening the complete route matrix. Reload once to confirm no business write. Console/hydration/required-request failures, raw internal copy, compatibility residue, and blank controls must be zero. Apply §3.5 once.

### 8.3 Phase 7 — Losses and Recovery

- **Owned IDs:** LOSS-01–LOSS-08, LDET-01–LDET-03, REC-01–REC-09, RDET-01–RDET-03
- **Prerequisite:** Phase 6 `COMPLETE`
- **Phase outcome:** Loss and Recovery surfaces present traceable, mathematically reconciled work with useful registries, continuous workflow stages, and complete selected details.

#### 8.3.1 Required deliverables

1. Searchable/filterable Losses ledger with truthful value state, source identity/freshness, range, and canonical table behaviour.
2. Complete loss detail led by business context, financial progression, evidence, attribution, connected records, and activity.
3. A continuous five-stage Recovery board at ≥1280px and an obvious contained horizontal board at 1024px.
4. Action-led, varied recovery cards and a complete recovery detail progression with tasks/correspondence/activity.
5. Executable penny reconciliation and provenance/deadline/source-timestamp tests across Losses, Recovery, and Reports.

#### 8.3.2 Losses

| ID | Priority / scope | What was wrong before | Required change and implementation notes | Success metric |
|---|---|---|---|---|
| LOSS-01 | P0 · Both | Realised/estimated loss KPI was `—` and estimated loss was blank across rows. | Seed lifecycle-appropriate values and make KPI definitions derive from the same ledger/read model. Preserve unavailable only when its required observation is absent. | Capture has no unexplained dash; row totals reconcile to KPI by range/currency. |
| LOSS-02 | P0 · Both | Nearly every row said Unknown source. | Apply SEED-08 and treat missing source as a data-quality state, not an ordinary badge. | 100% capture losses have source; QA missing-source row displays “Source missing” with repair/audit path. |
| LOSS-03 | P1 · Product | “Unknown source” could be paired with a green up-to-date dot. | Derive identity and freshness separately but prohibit a healthy presentation when source identity/provenance is absent. | State-matrix test covers missing + fresh timestamp and renders neutral/attention, never healthy. |
| LOSS-04 | P1 · Product | Large homogeneous chargeback runs made the ledger look generated. | Apply SEED-12 and ensure default ordering is operationally useful rather than insertion order. | First viewport has varied loss causes/sources/ages unless a filter explains otherwise. |
| LOSS-05 | P1 · Product | Ledger had no search/filter toolbar despite being a registry. | Add compact search plus meaningful filters such as lifecycle, source, responsibility, recoverability, and date; keep URL state. | A user can isolate a source/lifecycle in ≤2 interactions; filters survive refresh and have an accessible clear action. |
| LOSS-06 | P1 · Product | KPI strip and summary callout duplicated the ledger’s obvious counts. | Keep a compact value summary tied to the selected range; remove the redundant insight rail. | One same-scope summary group before the table; no repeated count callout. |
| LOSS-07 | P1 · Product | The route used a hand-rolled table with inconsistent surface treatment. | Migrate to canonical table primitives or document and align its domain-specific requirements. | Table meets canonical header, density, overflow, keyboard, and numeric-alignment rules. |
| LOSS-08 | P2 · Product | “Realised,” “estimated,” “recoverable,” and “written off” were visually similar without explaining the lifecycle. | Use concise definitions on demand and stable column/order semantics; do not add more pills. | Merchant test participants can distinguish the stages without reading a glossary page; labels map to ledger definitions. |

#### 8.3.3 Loss detail

| ID | Priority / scope | What was wrong before | Required change and implementation notes | Success metric |
|---|---|---|---|---|
| LDET-01 | P1 · Product | Loss detail led with a category plus hash, leaving merchant, order, customer, and case context secondary. | Lead with the business event/reference and amount/state; keep the internal hash in a copyable technical disclosure only when needed. | A reviewer identifies what happened, to whom, value, source, and linked case from the first viewport. |
| LDET-02 | P1 · Product | Detail used several generic bordered sections and a plain badge for financial lifecycle, repeating the same card-stack problem as case detail. | Use one financial progression/summary and joined Evidence, Attribution, Connected records, and Activity sections. Use the canonical financial-state mapping. | One dominant work surface; no raw enum and no nested generic card stack. |
| LDET-03 | P0 · Fixture | A selected loss could have no evidence or activity, making the record look unfinished. | Curate one complete loss trail with source observation, linked case/order/customer, attribution basis/alternatives, financial entries, owner, and at least three events. | Marketing loss detail, if selected for capture, has named source evidence and ≥3 meaningful activity events with coherent dates. |

#### 8.3.4 Recovery

| ID | Priority / scope | What was wrong before | Required change and implementation notes | Success metric |
|---|---|---|---|---|
| REC-01 | P0 · Fixture | Cards were mechanically identical in timing, values, evidence, and deadlines. | Apply SEED-09. | Distribution/repetition validator passes and the first viewport reads as real work. |
| REC-02 | P1 · Product | Five KPI cells plus another summary rail delayed the board. | Keep 3–4 decision-useful metrics tied to the current board and remove the duplicate rail. | At 1440×900, the first row of recovery cards is visible without scrolling. |
| REC-03 | P1 · Product | Five stages used five columns only at `2xl`, so ordinary screenshot widths wrapped to 3+2 and obscured workflow order. | At ≥1280px, use five constrained columns or a contained five-stage board. At 1024px use a clearly signposted, keyboard-operable contained horizontal board that preserves stage order. | Stage order remains continuous at 1440/1280/1024; no ambiguous 3+2 wrap and no page-level overflow. |
| REC-04 | P1 · Product | Every card followed the same title/amount/deadline/badges template and felt like a card factory. | Make the next action and deadline the card lead, retain only necessary financial context, and reduce metadata pills. Use compact flat items within the board. | Cards can be scanned by action/urgency; default card has at most two badges and one perimeter. |
| REC-05 | P1 · Product | Subtitle “losses you can still do something about…” was long and conversational for an operational page. | Use a direct subtitle such as “Track eligible recovery work and received credits.” | Subtitle fits one line at 1280px and names the actual task. |
| REC-06 | P1 · Product | Repeated “auto-update” language narrated implementation. | Remove it; show source and actual last-synced time where needed. | No auto-update/page-refresh narration in the initial viewport. |
| REC-07 | P1 · Product | “N evidence missing” was ungrammatical and source time was mislabeled. | Apply COPY-09 and SEED-23. | Pluralisation and provenance tests pass. |
| REC-08 | P1 · Product | Navigation said Recovery, breadcrumb Recoveries, and page Recovery board. | Use **Recovery** for the route and title; use “recovery case” for a record. | Navigation, H1, document title, breadcrumb, and empty/error states agree. |
| REC-09 | P2 · Product | Loss and recoverable amounts were often identical, implying guaranteed full recovery. | Show estimated range/eligible amount truthfully; fixture uses varied contract/cost coverage and recovered values. | Fixture recoverable-to-loss ratios vary plausibly; no copy implies eligibility equals cash received. |

#### 8.3.5 Recovery detail

| ID | Priority / scope | What was wrong before | Required change and implementation notes | Success metric |
|---|---|---|---|---|
| RDET-01 | P1 · Product | Recovery detail opened with six equal KPI cells, followed by generic details, evidence, correspondence, tasks, and activity boxes. | Reduce the lead to four decisive values and a clear Prepared → Sent → Acknowledged → Approved → Credited → Reconciled progression. Flatten the rest into joined task/evidence/correspondence/timeline sections. | At 1280×800, financial progression and the first required action are visible without scrolling; no nested card stack. |
| RDET-02 | P0 · Fixture | Candidate recovery records could have empty correspondence, tasks, and activity. | Curate a complete trail with submission, chase, provider response, assigned task, approved/partial credit as appropriate, and financial event. | Selected recovery has ≥1 correspondence, ≥1 task, and ≥3 coherent timeline events; values reconcile to Reports/Losses for the same scope. |
| RDET-03 | P2 · Product | Confirmation copy referred to an “immutable recovery activity event.” | Say that the action is saved to Recovery activity/audit history, and explain whether it can be corrected. | No `immutable` architecture term in merchant UI; the persistence/correction consequence remains clear. |

#### 8.3.6 Phase 7 focused acceptance check

```bash
npm run verify:source-to-recovery
npm run verify:p0-ledger
npm test -- --runInBand \
  tests/unit/recoveryAmounts.test.ts \
  tests/lib/financialLedger.test.ts \
  tests/lib/crossModuleFinancialIntegrity.test.ts
```

In one browser/data pass at 1440px and 1024px, follow one linked hero case through Losses, loss detail, Recovery, recovery detail, and Reports and reconcile its same-scope amounts. Check source/freshness, one search/filter/zero/clear path, the continuous five-stage board, and complete hero detail content. Sample unavailable and partial values with the smallest existing fixtures. Do not inspect arbitrary batches of rows, create screenshot evidence, or repeat every filter/state when the focused tests cover the shared model. Console/hydration/required-request failures must be zero. Apply §3.5 once.

### 8.4 Phase 8 — Customers registry and customer detail

- **Owned IDs:** CUST-01–CUST-04, CUST-06–CUST-08, CPRO-01–CPRO-14
- **Prerequisite:** Phase 7 `COMPLETE`
- **Phase outcome:** Customer list and detail agree with real linked orders, expose complete useful history without sensitive data, and use a stable, flattened desktop composition.

#### 8.4.1 Required deliverables

1. One customer aggregation/query contract for count, spend, recency, average value, case rate, and detail transactions.
2. One coherent registry toolbar/table with canonical surface ownership and compact operational density.
3. Complete hero customer with ordinary and case-linked orders, products, fulfilment, support cases, notes, activity, and latest case context.
4. Correct percentage/unit normalisation, pluralisation, masked synthetic PII, and supported-desktop KPI/rail/table composition.
5. Focused aggregate, privacy, deep-link/loading, and visual checks for the shared customer paths.

#### 8.4.2 Customers registry

| ID | Priority / scope | What was wrong before | Required change and implementation notes | Success metric |
|---|---|---|---|---|
| CUST-01 | P0 · Both | Total spend and last order were blank despite linked orders. | Apply SEED-04 and repair the aggregation/linking read model. | ≥95% capture rows have value/date; hero row is complete and detail agrees. |
| CUST-02 | P1 · Product | Registry used an extra border around `DataTable`. | Apply SYS-10. | Single table perimeter. |
| CUST-03 | P1 · Product | KPI strip and insight callout repeated customer/order counts before the registry. | Keep only metrics that affect segmentation; move ordinary totals to the result caption or remove them. | Table begins higher in the viewport; no repeated total count. |
| CUST-04 | P1 · Product | “No order date” repeated down a populated merchant list, making the UI look broken. | For true nulls use concise `No orders` and make it a deliberate segment/filter; fixture removes accidental nulls. | No capture row shows accidental “No order date”; true no-order QA state is clearly intentional. |
| CUST-06 | P2 · Product | Repeated avatars, chevrons, badges, and metadata made rows templated. | Keep avatar/identity and one clear row affordance; move ordinary metadata into aligned text. | Row hierarchy remains clear with fewer decorative elements and no loss of accessible destination. |
| CUST-07 | P1 · Product | Search/sort action bar, a second Filters surface, and separate active-filter chips created three competing filter metaphors. | Consolidate search, sort, advanced filters, applied-filter summary, and clear-all into one canonical toolbar/filter sheet model. | One filter region in the accessibility tree and first viewport; clear-all resets the visible query and URL state. |
| CUST-08 | P2 · Product | “Completed in store” repeated beneath order counts even when the aggregate did not prove that completion state. | Use a neutral unit such as “orders,” or calculate and label an actual completed-order subset from source status. | Column copy never asserts completion without a backing status query. |

#### 8.4.3 Customer detail

| ID | Priority / scope | What was wrong before | Required change and implementation notes | Success metric |
|---|---|---|---|---|
| CPRO-01 | P0 · Both | Six KPI cells were cramped around the desktop breakpoint and included partially redundant risk/value metrics. | Reduce to four core facts or allow a tested 3×2 layout before the side rail appears. Use canonical `MetricGroup`. | No clipped/wrapped KPI label at 1024–1440px; separators are correct. |
| CPRO-02 | P0 · Both | Seven orders in the hero conflicted with “Latest 3 of 3.” | Apply SEED-05 and use pagination/count semantics from one query. | All displayed totals agree. |
| CPRO-03 | P0 · Fixture | Visible email used `@simeon-demo.test`. | Apply SEED-01. | No old/test domain in page or accessibility tree. |
| CPRO-04 | P1 · Both | Every visible order was a payout case and product names were sparse. | Apply SEED-16. | Hero history has ordinary and case-linked orders, each with useful line-item detail. |
| CPRO-05 | P1 · Product | Dispute context nested two `MetricCard`s and another inset panel inside `SectionCard`. | Replace with a compact definition list or joined “Latest case” row linking to the case. Use Case terminology. | One boundary around the section; no nested metric cards. |
| CPRO-06 | P1 · Product | Orders used a hand-rolled table inside a rounded frame. | Use canonical table styling and contained overflow at the 1024px minimum. | Table aligns with registry primitives, has one perimeter, and causes no page-level overflow. |
| CPRO-07 | P1 · Product | Duplicate shell/body breadcrumb showed Customers / Maya Chen more than once. | Apply SYS-01. | One parent breadcrumb and one H1. |
| CPRO-08 | P1 · Both | Support cases and merchant notes loaded late or appeared empty; activity had no real events. | Apply SEED-17 and the shared required/optional loading-state contract in SYS-17. | Hero page reaches complete state with non-empty sections; required failure cannot masquerade as empty. |
| CPRO-09 | P1 · Product | Identity section exposed an implausible `5500%`, indicating a fraction/percentage formatting error. | Define the field’s unit and clamp/format only after validating its domain. Never convert already-percent values twice. | Unit tests cover 0, fractional, 100%, null, and invalid values; no percentage exceeds its valid domain. |
| CPRO-10 | P1 · Product | Identity grammar failed at singular count. | Apply COPY-10. | 0/1/many snapshots pass. |
| CPRO-11 | P1 · Product | Side rail at `lg` plus six KPIs made 1280px composition dense and reduced useful order width. | Delay or narrow the rail based on content, move critical contact facts above orders on smaller widths, and stack only after a deliberate breakpoint. | 1280px order table retains its minimum useful width; contact/context remains above the fold. |
| CPRO-12 | P2 · Product | Monospace order references and several tiny metadata lines competed with primary content. | Reserve monospace for identifiers, keep it secondary, and raise essential metadata to compact body size. | Name, total, recent order, and latest case remain readable at landing thumbnail size. |
| CPRO-13 | P0 · Fixture | Customer detail can expose email, phone, address, and card fragments, all of which are sensitive even in a synthetic screenshot workflow. | Use clearly fictional, non-routable values and mask fields that do not contribute to the screenshot story. Validate that no seeded value belongs to a real person. | Privacy validator and manual review pass; every visible customer datum is approved synthetic data and unnecessary fields are masked/omitted. |
| CPRO-14 | P2 · Product | Possible matches, identity signals, mini tables, pills, and percentages could overfill the sticky rail and make identity analysis look like a generic risk dashboard. | Lead with confirmed contact/source facts. Put possible matches into a dedicated review action/disclosure and remove any identity signal that does not change a merchant task. | Rail fits and remains reachable at 1024/1280; confirmed identity is first and unresolved matches have one clear action. |

#### 8.4.4 Phase 8 focused completion gate

```bash
npm test -- --runInBand \
  tests/api/customerSupportCases.test.ts \
  tests/customers/orderSearch.test.ts \
  tests/lib/customerIdentityConfidence.test.ts
```

In one browser session at 1440px and 1024px, inspect the registry and hero customer. Reconcile that customer’s headline totals and one ordinary plus one case-linked order, confirm complete support/note/activity context, scan the rendered page for unsafe or fixture-looking PII, and complete one search/filter/deep-link keyboard path. Use focused tests for confidence/count edge cases and inject only one representative required-load failure. Do not reconcile every customer or generate separate proof artifacts. Console/hydration/required-request failures must be zero. Apply §3.5 once.

### 8.5 Phase 9 — Rules and Flows

- **Owned IDs:** RULE-01–RULE-06, FLOW-01–FLOW-07
- **Prerequisite:** Phase 8 `COMPLETE`
- **Phase outcome:** Rules and Flows look actively used, expose real shipping capability, and foreground merchant intent rather than versioning/release-engineering machinery.

#### 8.5.1 Required deliverables

1. Meaningful rule names/effects, lifecycle/version distribution, consistent priority order, and a verified hero-case rule match.
2. Purposeful active/draft/paused Flow states with humanised triggers/actions, inspectable run history, and no fabricated live capability.
3. Removal of duplicated lifecycle counts, one-item charts, repeated preview/release-gate copy, and raw enums.
4. Focused rule-order and Flow lifecycle tests plus one reviewed browser pass.

#### 8.5.2 Rules

| ID | Priority / scope | What was wrong before | Required change and implementation notes | Success metric |
|---|---|---|---|---|
| RULE-01 | P1 · Fixture | All seven rules were Active, version 1, and priority 1–7 with formulaic names/descriptions. | Apply SEED-14. | Lifecycle/version/usage mix appears believable and deterministic. |
| RULE-02 | P1 · Product | Long subtitle foregrounded implementation/version semantics. | Apply COPY-03. | Direct one-line subtitle. |
| RULE-03 | P1 · Product | KPI `7 / 7 / 0`, “7 of 7,” and lifecycle rail repeated the same counts. | Keep one lifecycle summary or filter counts; remove duplicate summary rail. | Same count appears once per scope in initial viewport. |
| RULE-04 | P1 · Product | Every row contained similar badge/priority/version anatomy, making policies look generated. | Lead with rule name and effect; show status/version compactly; only show priority when it changes evaluation order. | Rows are distinguishable by policy content, not numbers/pills. |
| RULE-05 | P2 · Product | “Published versions are immutable” sounds technical and defensive. | Use “Published versions stay in history; edit by creating a draft.” Place beside the edit action. | Merchant understands the action model in usability review without the term immutable. |
| RULE-06 | P1 · Product | Display priority appeared to add one to the stored value, risking an off-by-one disagreement between list, editor, evaluation order, and seed. | Define whether priority is zero- or one-based at the domain boundary and expose one display-order helper used everywhere. Prefer named ordering/reordering controls over synthetic numbers where possible. | API, editor, list, rule match explanation, and tests show the same order for first/middle/last rules. |

#### 8.5.3 Flows

| ID | Priority / scope | What was wrong before | Required change and implementation notes | Success metric |
|---|---|---|---|---|
| FLOW-01 | P0 · Fixture | One draft and no active flows made the feature appear unreleased. | Apply SEED-15 or exclude Flows from marketing if live execution truly is unavailable. Do not fabricate availability. | Captured page shows supported live value; otherwise no landing screenshot uses Flows. |
| FLOW-02 | P1 · Product | Preview/release-gate explanation was repeated in header, card, and workbench. | Apply COPY-04. | Availability message appears once. |
| FLOW-03 | P1 · Product | A one-item “Action load” chart conveyed no pattern and left large empty space. | Replace with recent runs, success/failure distribution, or omit the chart until there is a meaningful series. | No chart with fewer than three meaningful categories/points unless a single value itself answers the question. |
| FLOW-04 | P1 · Product | Approximately 70% of the viewport was empty in the reviewed state. | Use a registry/workbench composition with active flows, recent runs, and a concise empty/activation state. | At 1440×900, supported content occupies the page naturally without filler cards. |
| FLOW-05 | P1 · Product | “Definitions,” “dry-run,” “publication,” and “versioned workspace” led the experience. | Lead with trigger → conditions → actions → last run → status. Keep technical guarantees in secondary help. | A merchant can state what a flow does from the first viewport without reading implementation language. |
| FLOW-06 | P2 · Product | Draft-only controls looked like a disabled product rather than a purposeful preview. | Distinguish Preview from unavailable actions; show what can be tested and one next step. | Preview state has an active test path and no unexplained disabled primary action. |
| FLOW-07 | P1 · Product | Trigger/action identifiers could appear as raw monospace enums, reinforcing an implementation-led workspace. | Map triggers and actions through an exhaustive merchant-facing registry; keep machine identifiers in technical detail only. | No underscore enum or raw trigger ID appears on the index/workbench; unknown values fail a contract test. |

#### 8.5.4 Phase 9 focused completion gate

```bash
npm run verify:rules
npm test -- --runInBand \
  tests/unit/rulesEngine.test.ts \
  tests/lib/workflowEngine.test.ts
```

In one browser session at 1440px and 1024px, inspect one published rule and one representative Flow from list to detail/test or run history. Confirm human labels, stable priority/version semantics, purposeful lifecycle states, no duplicate summaries or one-item charts, and one keyboard path. Sample draft/paused/failed states through the shared component path rather than running a state-by-width matrix. Console/hydration/required-request failures must be zero. Apply §3.5 once.

### 8.6 Phase 10 — Reports and Integrations

- **Owned IDs:** REP-01–REP-11, INT-01–INT-13
- **Prerequisite:** Phase 9 `COMPLETE`
- **Phase outcome:** Reports asks one clear, mathematically valid question while Integrations presents one coherent connection-health story with reliable provider identity and actions.

#### 8.6.1 Required deliverables

1. A question-led report with 4–6 headline metrics, executable financial definitions, meaningful accessible charts, human drill-down records, and prominent scope/action.
2. Same-scope reconciliation across case finance, Losses, Recovery, Overview, and Reports.
3. One Integrations management/browse structure using canonical configuration/health, clear impact/action, stable provider identity/fallbacks, and no duplicate warnings/actions.
4. Metric/range/timezone/chart/table/drill-down and connection shell/summary/row/detail parity tests.
5. One full-size and landing-size browser review of Reports and Integrations.

#### 8.6.2 Reports

| ID | Priority / scope | What was wrong before | Required change and implementation notes | Success metric |
|---|---|---|---|---|
| REP-01 | P0 · Both | A 12-metric wall appeared before any chart and included “Written off — Unavailable.” | Select 4–6 headline metrics tied to the report question; move the full value bridge to a detail section or drill-down. Seed every headline metric or deliberately exclude it. | Initial viewport has one dominant question and ≤6 headline metrics; no unexplained unavailable headline. |
| REP-02 | P0 · Product | Recoverable definition/value contradicted confirmed loss. | Apply COPY-12 and add ledger reconciliation. | Financial invariant passes for each currency/range. |
| REP-03 | P1 · Product | Requested, exposure, and estimated loss appeared visually equal despite different certainty. | Group lifecycle stages and use plain hierarchy/definitions rather than equal KPI cards. Show unavailable and provisional status explicitly. | Users can distinguish requested value, maximum exposure, observed payout, confirmed loss, and recovery without tooltip dependence. |
| REP-04 | P1 · Both | Exposure/recovered chart was sparse and announced unavailable daily gaps. | Seed meaningful daily values for the selected capture range. In production, keep gaps truthful but move the explanatory sentence to a legend/help affordance. | Capture chart has enough data to reveal a pattern; gaps remain gaps in QA tests. |
| REP-05 | P1 · Fixture | Loss-causes chart had only one category. | Seed varied causes or omit the chart from the capture composition. | Captured categorical chart has 3–6 meaningful categories. |
| REP-06 | P1 · Product | Chart labels were too small for landing-page scaling. | Apply SYS-16 and reduce tick density. | Full and thumbnail legibility review passes. |
| REP-07 | P1 · Product | Generated timestamp made the report look stale. | Apply COPY-14; retain selected range and timezone prominently. | Capture shows range/timezone, not stale generation metadata. |
| REP-08 | P1 · Product | Ranked tables and record drill-downs used hand-rolled table styles, raw UUIDs, and machine values. | Migrate table anatomy, display merchant references, and map enums centrally. Keep UUID available only in copy/debug affordance if necessary. | No raw UUID/underscore value in normal view; keyboard and numeric alignment pass. |
| REP-09 | P1 · Product | All-time Recovery and 30-day Reports appeared contradictory without scope emphasis. | Apply SEED-19; place range in the title/controls and include scope in drill-down links. | Cross-route same-scope reconciliation test passes; scope can be identified without reading fine print. |
| REP-10 | P2 · Product | Many definitions were always visible under values, adding text density. | Use concise labels and one shared “How these values work” disclosure for detailed definitions. | Initial metric group is scannable at 100% and 50% size; definitions remain keyboard/screen-reader accessible. |
| REP-11 | P1 · Product | “Needs attention” appeared only after a long metric and chart sequence even though it was the report’s actionable output. | Put a compact actionable summary/link to Work near the headline economic outcome, while keeping the report focused on measurement rather than duplicating the queue. | First viewport communicates both economic outcome and whether action is required; each item opens the correct filtered Work view. |

#### 8.6.3 Integrations

| ID | Priority / scope | What was wrong before | Required change and implementation notes | Success metric |
|---|---|---|---|---|
| INT-01 | P0 · Both | Summary said six connected/three attention while all six visible rows looked unhealthy. | Apply SEED-03 and use canonical configuration + operational health axes. Do not equate configured with healthy. | Summary, filters, rows, sidebar, and details agree exactly. |
| INT-02 | P0 · Both | Sidebar said no helpdesk while Gorgias/Zendesk rows existed. | Apply SEED-02. | One coherent helpdesk story. |
| INT-03 | P0 · Fixture | `unauth-test` and `sr71labs` account identifiers looked internal. | Apply SEED-01 and SEED-22. | Only approved fictional account labels appear. |
| INT-04 | P1 · Product | Summary, attention alert, status row, and sidebar repeated the same warning. | Keep one page-level attention summary with direct repair links; rows retain local status; shell uses a compact global indicator only when it affects current work. | Same provider issue is not described more than twice on the page and each occurrence has a distinct scope. |
| INT-05 | P1 · Product | Page stacked summary, alert, toolbar, connected-surface, catalogue, and import boxes, creating excessive rounded layers. | Separate **Connected** management and **Browse** catalogue as true views/tabs. Flatten content within each view and remove duplicate surface wrappers. | Initial view has one summary and one primary working surface; no stack of independent cards. |
| INT-06 | P1 · Product | “Provider-neutral source connection” and page-open health-check copy sounded like instrumentation. | Apply COPY-05. | No internal placeholder/instrumentation text. |
| INT-07 | P1 · Product | Catalogue card “View details” and “Connect” linked to the same URL. | Use one primary action. If setup and information are the same screen, label it `Set up`; otherwise make the details route informational and connect action direct. | No card exposes two differently labelled actions with identical href/effect. |
| INT-08 | P1 · Product | Connected rows mixed stale, sync pending, verification unavailable, and not syncing without a crisp configuration/health model. | Render configuration, operational health, impact, last successful data, and one repair action from the canonical read model. | Each row answers state, impact, freshness, and next action without contradictory badges. |
| INT-09 | P1 · Product | Catalogue metadata chips such as OAuth and runtime verification competed with merchant outcomes. | Move auth/runtime proof to detail/setup. In browse, lead with the data and workflow enabled. | Browse card has at most one availability badge and one concise capability sentence. |
| INT-10 | P2 · Product | Connected management and catalogue cards used different density and interaction grammar. | Use compact rows for connected sources and cards only for discovery; share provider identity/status/action primitives. | Provider identity and status are consistent across both views. |
| INT-11 | P0 · Product | Provider identity tiles could render as blank white squares, making a polished integration row look like a missing asset. | Fix verified provider assets and add a visible, accessible monogram/glyph fallback with deterministic background/border. Test failed-image and offline states. | No blank provider tile in connected, catalogue, error, or offline fixtures; accessible name still identifies the provider. |
| INT-12 | P2 · Product | “Records indexed” was more technical than the rest of the source-sync language. | Use “Records synced” unless indexing is a distinct, merchant-relevant state, in which case explain the distinction once. | Overview, Integrations, detail, and import use the same approved record-state vocabulary. |
| INT-13 | P1 · Product | Settings called the destination **Connections** while global navigation/route/H1 used **Integrations**, weakening navigation continuity. | Use **Integrations** everywhere, or make Connections a clearly subordinate settings concept rather than an external route tab. | Same destination label in Settings, sidebar, breadcrumb, document title, and H1. |

#### 8.6.4 Phase 10 focused completion gate

```bash
npm test -- --runInBand \
  tests/lib/claimsReporting.test.ts \
  tests/unit/connectionReadModel.test.ts \
  tests/unit/providerCatalogueConsistency.test.ts
```

In one browser/data pass at 1440px and 1024px, reconcile the selected report range and headline metrics to the canonical ledger, verify its chart/accessible summary, and inspect the configured integration set for one coherent shell/summary/row/detail story. Check one failed provider image, one unhealthy source, and catalogue actions with distinct labels. Review the report once at intended landing size. Do not generate a formula dossier or inject every integration state. Console/hydration/required-request failures must be zero. Apply §3.5 once.

### 8.7 Phase 11 — Settings and Notifications

- **Owned IDs:** SET-01–SET-09, NOTE-01–NOTE-08
- **Prerequisite:** Phase 10 `COMPLETE`
- **Phase outcome:** Settings reads as a complete, stable configuration area and Notifications presents believable, correctly linked activity without repeated summaries or inaccessible read state.

#### 8.7.1 Required deliverables

1. Complete seeded account form with server-safe loading, pristine/dirty/saving/saved/error states, coherent naming, consolidated local navigation, and contextual help.
2. One global Settings destination and stable Integrations navigation semantics.
3. Notification list with varied event data, one count model, correct provider casing, valid destinations, independent mark-read, and accessible read/unread/live-region behaviour.
4. Form/navigation/mutation, notification projection/deep-link/read-state, privacy, supported-desktop, and visual tests.

#### 8.7.2 Settings

| ID | Priority / scope | What was wrong before | Required change and implementation notes | Success metric |
|---|---|---|---|---|
| SET-01 | P0 · Fixture | Account email/business name were blank; monthly order volume and review focus were unselected; Save was disabled. | Seed complete merchant/account preferences and load them through production forms. Use a fictional operator email. | Account capture contains no blank required field and no unexplained disabled primary action. |
| SET-02 | P1 · Product | Ten top tabs were cramped. | Group settings into 4–6 stable categories with a persistent local side navigation throughout the supported desktop range. Preserve deep links/aliases. | All settings are reachable and labels fit at 1024px without horizontal tab scrolling. |
| SET-03 | P1 · Product | Breadcrumb said Settings > Account, local tab said Workspace & account, H1 said Account. | Choose one label per level: Settings parent, Workspace & account section, and a descriptive H1 only if it adds meaning. | Navigation, document title, breadcrumb, local nav, and H1 map unambiguously. |
| SET-04 | P1 · Product | Generic “Workspace controls” and “Settings help” rails repeated across pages and often fell below the form. | Keep contextual guidance beside the relevant field/section; remove generic rails. Use one concise settings help destination. | No duplicated generic rail; form column remains 680–820px and primary action is visible. |
| SET-05 | P1 · Product | Settings was duplicated in navigation/footer. | Apply SHELL-03. | One Settings route entry. |
| SET-06 | P1 · Product | Empty values and disabled Save made the screen look unfinished even when no edits existed. | Distinguish `Saved`/clean state from disabled unavailable state. Show Save enabled only after a change, with a quiet persistent status. | Initial form reads as complete and saved; after edit, Save enables; after success, status returns to Saved. |
| SET-07 | P2 · Product | Form section boundaries relied on multiple cards/rails. | Use joined form sections with headings/dividers inside the settings surface. | One primary form surface per settings page; no free-standing card stack. |
| SET-08 | P1 · Product | A visible Connections tab could navigate outside `/settings`, causing the local settings navigation to disappear and making the tab model feel broken. | Treat Integrations as a separate global destination/link, or keep connection settings inside the stable Settings shell. Do not present an external route as a sibling tab. | Activating any true settings tab preserves the local settings navigation; an external Integrations link is labelled and styled as navigation, not a tab. |
| SET-09 | P2 · Product | Profile, appearance, password/security, and danger-zone concerns could coexist on one long Account page without a clear task boundary. | After consolidating navigation, group these with clear anchors/joined sections or separate Security/Appearance destinations. Keep destructive controls out of the initial profile viewport. | Primary workspace/profile task is complete above unrelated destructive controls and every deep link has a stable heading target. |

#### 8.7.3 Notifications

| ID | Priority / scope | What was wrong before | Required change and implementation notes | Success metric |
|---|---|---|---|---|
| NOTE-01 | P1 · Fixture | Repeated archetypes and exact hourly times looked generated. | Apply SEED-13. | Timing/content repetition validator passes. |
| NOTE-02 | P1 · Product | KPI strip and summary repeated unread/read counts. | Put unread count in the page/tab control and keep one result summary; remove secondary rail. | Same unread/read total appears once per scope. |
| NOTE-03 | P1 · Product | Recent activity rail repeated notification counts without adding action. | Remove it or replace it with notification preferences only when contextually relevant. | Primary list begins higher; no duplicate count rail. |
| NOTE-04 | P1 · Product | Notification titles had inconsistent sentence/provider casing. | Apply COPY-13. | Casing lint and snapshots pass. |
| NOTE-05 | P1 · Product | Repetitive icon/badge/list anatomy made events look templated. | Use severity/status only where action urgency differs; let actor/object/title/time create hierarchy. | Default row has no more than one status badge; deep link and read state remain clear without decorative pills. |
| NOTE-06 | P2 · Product | Read/unread was communicated by multiple subtle cues that may disappear under compression. | Use one high-contrast non-colour cue plus accessible text/state. | Read state is distinguishable in greyscale, forced colours, and screen reader output. |
| NOTE-07 | P2 · Product | An always-rendered but empty live-region/status paragraph could create an unexplained gap before the list. | Render the status region only when it has a message, or reserve its space deliberately without creating visible whitespace. Keep announcements concise. | No blank gap in pristine state; mark-read/filter results are still announced once. |
| NOTE-08 | P0 · Both | Seeded notification destinations were not guaranteed to resolve to complete records, and labels could say “Open payout case.” | Validate every distinct fixture destination type, use canonical Case terminology, and ensure mark-read succeeds independently of navigation. | Three representative links spanning the distinct destination types return 200 with populated objects, and read-state mutation succeeds independently. |

#### 8.7.4 Phase 11 focused completion gate

```bash
npm test -- --runInBand \
  tests/lib/platformSettings.test.ts \
  tests/unit/notificationProjection.test.ts \
  tests/components/notificationCentre.test.tsx
```

In one browser session at 1440px and 1024px, inspect Account through pristine → edit → save and one representative failure, then confirm Settings navigation stays coherent. Inspect Notifications, open three representative destination types, mark one item read, reload once, and sample the read/unread cue in forced colours. Confirm there is no blank-form flash, repeated help/count rail, empty live-region gap, or internal copy. Do not traverse every Settings destination or notification. Console/hydration/required-request failures must be zero. Apply §3.5 once.

---

## 9. Phase 12 — Desktop accessibility and supported-width boundary

- **Owned IDs:** A11Y-01–A11Y-06, A11Y-08–A11Y-12, A11Y-14
- **Prerequisite:** Phase 11 `COMPLETE`
- **Phase outcome:** Every core route receives a quick supported-desktop accessibility smoke, distinct interaction patterns receive deeper representative checks, and the unsupported-width boundary is consistent and accessible.

### 9.1 Required deliverables

1. One automated route smoke for supported-width overflow, page structure, and serious/critical axe failures.
2. Manual keyboard and screen-reader checks for one instance of each distinct pattern: registry, detail, board, form, modal/drawer, and chart.
3. Verified 24px minimum target or sufficient-spacing contract plus correct text/control/graphic contrast.
4. Semantic desktop order, contained table/board overflow, and one accessible root boundary below 1024px.
5. One short reviewed accessibility note; no route-by-state artifact matrix.

| ID | Priority / scope | What was wrong before | Required change and implementation notes | Success metric |
|---|---|---|---|---|
| A11Y-01 | P0 · Product | Tertiary text on canvas was below the 4.5:1 normal-text target in observed combinations. | Audit actual rendered token pairs in light/dark and change token or context. Do not use opacity to create hierarchy. | Every normal text pair ≥4.5:1 and large text ≥3:1. |
| A11Y-02 | P0 · Product | Very subtle controls/borders risked falling below 3:1 where the boundary was the only affordance. | Strengthen interactive boundaries or add a non-colour cue. Decorative separators are exempt only when structure remains clear without them. | Inputs, focus, toggles, selected controls, and required meaningful graphics meet 3:1. |
| A11Y-03 | P0 · Product | Narrow widths previously exposed clipped or partially adapted authenticated routes with inconsistent access to controls. | Verify SYS-12 at the exact threshold. At ≥1024px, contain table/board overflow with visible and keyboard-operable affordances. Below 1024px, expose one labelled Desktop required notice and remove the authenticated shell, route content, and product controls from the accessibility tree. | At 1024px the full route is operable without page-level overflow; at 1023px and 390px only the notice is visible/announced; direct links and resizing cross the threshold without errors or protected-content leakage. |
| A11Y-04 | P0 · Product | Small icon-only/card controls could fall below target-size guidance. | Make targets ≥24×24px or provide sufficient spacing and add accessible names. | One shared target/spacing scan plus representative mouse/keyboard inspection finds no failing control pattern. |
| A11Y-05 | P0 · Product | Capture-visible charts relied on small labels and potentially colour/hover. | Provide direct labels/legend and an accessible table/summary; keep null/zero distinct. | Keyboard/screen-reader users access every meaningful value; greyscale view remains interpretable. |
| A11Y-06 | P1 · Product | Entry animation exceeded the motion contract. | Apply SYS-14 and ensure reduced motion removes transforms/transitions that communicate no state. | Reduced-motion suite has no non-essential spatial animation. |
| A11Y-08 | P1 · Product | Focus behaviour for horizontally scrolling tabs/views, drawers, menus, and row-click destinations was not proven across routes. | Follow ARIA patterns, use real links/buttons, trap/restore overlay focus, and keep a visible focus ring without layout shift. | One representative of each distinct control pattern has a complete keyboard path and correct overlay focus restoration. |
| A11Y-09 | P1 · Product | Important layouts were reviewed mostly at default text scale. | Add 200% browser zoom where the resulting CSS viewport remains ≥1024px, plus the WCAG text-spacing override at supported widths. If zoom makes the effective CSS viewport narrower than 1024px, the shared boundary is the expected result. Avoid fixed heights that clip two-line labels. | Core tasks remain available at 200% when the effective CSS viewport is supported; otherwise the boundary appears cleanly. Text-spacing overrides do not clip essential content. |
| A11Y-10 | P1 · Product | Fine borders/status fills could disappear in forced colours. | Add forced-colour styles for boundaries, focus, badges, charts, and selected state. | Windows/high-contrast or Playwright forced-colours review retains state and operability. |
| A11Y-11 | P1 · Product | Loading/refresh completion was visual and not consistently announced. | Use `aria-busy` and concise live-region updates for asynchronous search, filters, saves, and background refresh; avoid chatty announcements. | Screen-reader test hears state changes once and content remains available during refresh. |
| A11Y-12 | P1 · Product | Truncation could hide essential customer, rule, provider, or case labels. | Permit wrapping where layout allows; otherwise add an accessible full-text path available by keyboard, not hover only. | Essential labels are fully available at supported widths and supported zoom/text-spacing states. |
| A11Y-14 | P2 · Product | Dark-mode and theme/system-preference states were not part of the screenshot audit. | Retain the binding light/dark contract and sample each distinct page/primitive family in dark mode even if marketing captures use light mode. | Zero serious visual/accessibility regression in the representative dark-mode sample. |

### 9.2 Risk-based accessibility matrix

Do not create a route × width × state × theme Cartesian product.

- Give every authenticated route one quick production smoke at 1440×900 and 1024×768 for page overflow, visible H1/primary task, keyboard reachability, and serious/critical axe failures. Review 1280×800 only for final capture candidates or a requirement that names that breakpoint.
- For each distinct page pattern—registry, detail, board, form, chart, modal/drawer—choose one representative and check 200% supported zoom, WCAG text spacing, reduced motion, forced colours, and dark mode.
- Run one keyboard and screen-reader path per distinct interaction pattern, not once per route that reuses it.
- Test the root boundary once at 1023×768 and once at 390×844. These are boundary checks only: the authenticated shell and content must not render or enter the accessibility tree.
- Use component fixtures for loading/error/long-label edge states. Reopen another route only when it has genuinely different implementation.

### 9.3 Phase 12 focused acceptance check

```bash
npx playwright test --config=tests/playwright.config.ts tests/current/accessibility-responsive.spec.ts
```

Update that suite in place before running it: replace its obsolete 320/390/768 per-route reflow matrix with 1440/1024 route smokes and one root boundary check at 1023/390. Do not retain mobile `<main>`/H1/reflow assertions or add a new suite beside it. In one browser session, complete the six representative pattern checks and note any exception directly in the short phase report. Serious/critical violations, page-level overflow, clipped primary actions, broken focus restoration, and protected-content leakage below 1024px must be zero. Do not run the larger `test:release-browser` bundle. Apply §3.5 once.

---

## 10. Phase 13 — Deterministic capture and final release proof

- **Owned IDs:** CAP-01–CAP-12
- **Prerequisite:** Phase 12 `COMPLETE`
- **Phase outcome:** A reproducible, privacy-safe, truthful, visually reviewed set of landing-page masters and encoded assets is generated from the shipping product, followed by one final release run.

### 10.1 Required deliverables

1. A compact capture manifest naming each landing slot, route, semantic fixture key, claim, viewport/crop/display size, and app/seed/capture-clock version.
2. `capture:marketing` and fail-closed `capture:marketing:verify` commands that use a clean production build, the dedicated marketing merchant, loaded fonts, a frozen clock, disabled/settled motion, a fixed browser/DPR, and a named `data-capture-ready` contract.
3. One direct required-resource, console/hydration, transient-UI, privacy, and unexpected-write preflight in the capture command.
4. One deterministic comparison for the exact capture states, with an explicit `maxDiffPixelRatio: 0.001`; write current/diff images only when verification fails.
5. Lossless desktop masters plus reviewed WebP/AVIF outputs at the exact landing-page sizes and DPRs.
6. A concise contact sheet and self-review covering product truth, privacy, hierarchy, crop, legibility, and capture cleanliness.

| ID | Priority / scope | What was wrong before | Required change and implementation notes | Success metric |
|---|---|---|---|---|
| CAP-01 | P0 · Capture | Review captures were ad hoc and used 1280×720, which is useful for audit but not a deliberate landing-page art direction. | Define the landing component slots first, then capture at a lossless desktop master size such as 1440×900 and crop from the master. | Every asset has a named destination, aspect ratio, crop, and minimum displayed size before capture. |
| CAP-02 | P0 · Capture | Live time, animations, cold routes, and late client requests could change the image. | Use the fixture `asOf`, frozen browser clock, capture motion override, pre-warmed production build, and explicit `data-capture-ready` signal after required resources/fonts settle. | Two consecutive captures of the same state differ only within an approved ≤0.1% pixel tolerance. |
| CAP-03 | P0 · Capture | A page could look loaded while a required API failed or an optional panel still spun. | Capture runner records network/console and refuses the screenshot on non-2xx required requests, error logs, skeletons, spinners, toasts, or active animations. | One representative injected required-request failure proves the runner fails closed; the approved fixture passes. |
| CAP-04 | P0 · Capture | Screens could expose personal/test data or machine identifiers. | Run one rendered-text/DOM privacy deny-list as part of the capture command, including accessibility labels and hidden text. | Zero PII/fixture/internal matches across the final manifest; capture is blocked automatically on a match. |
| CAP-05 | P0 · Capture | Browser chrome, dev UI, cursor, toasts, tooltips, menus, or scrollbars could make an otherwise good shot look unfinished. | Capture the page viewport only, move pointer off-canvas, close transient UI, use stable scroll position, and hide scrollbars only in capture tooling without changing layout/access. | Approved master contains none of the listed artifacts at 400% inspection. |
| CAP-06 | P1 · Capture | A full dashboard screenshot can become unreadable when placed on a landing page. | Give each shot one message. Choose framing around the feature, preserve enough shell for credibility, and avoid near-duplicate wide screenshots. | At final landing size, a reviewer can name the featured benefit and read the primary title/value without zoom. |
| CAP-07 | P1 · Capture | Fine Quiet Precision borders and small labels lose definition after resize/compression. | Evaluate the actual WebP/AVIF output at 1× and 2× DPR. Adjust product contrast/type only where it also improves the real UI; do not apply screenshot-only sharpening. | Boundaries and essential text remain legible in the shipped asset at its smallest intended size. |
| CAP-08 | P1 · Capture | Generated timestamps and stale relative times make evergreen marketing art date itself. | Choose capture-safe states and apply COPY-14 plus the Phase 2 capture clock. Do not manually edit the pixels after capture. | No approved image contains an avoidably dated generated label or implausibly stale “last update.” |
| CAP-09 | P1 · Capture | There was no stable screenshot record selection. | Use semantic capture keys from SEED-24 and route URLs with explicit view/range/state. | Capture URLs are deterministic and continue selecting the same narrative after unrelated fixture additions. |
| CAP-10 | P1 · Capture | There was no formal visual regression around the marketing merchant. | Keep a small reviewed baseline for the exact capture states only; the capture verifier compares against it and emits current/diff images on failure. | The verifier detects layout/data/copy drift above threshold without introducing a second visual-test framework. |
| CAP-11 | P1 · Capture | Marketing selection could accidentally over-represent mock/staged states or unsupported capabilities. | For each shot, record the shipping capability and claim, then complete the product-truth/privacy/visual checklist. Do not claim unavailable automation or invent external approval. | Every manifest entry has a truthful claim, app/seed/capture revision, and completed self-review with no unresolved concern. |
| CAP-12 | P2 · Capture | Too many similar full-width dashboard shots would fragment the story and make distinct capabilities look templated. | Produce 3–5 desktop feature shots with non-overlapping purposes. Do not use the unsupported-width notice as marketing art. | Final set has no near-duplicate composition and covers operations, detail/evidence, and recovery/reporting with one clear message per shot. |

### 10.2 Proposed capture manifest

The final selection should be made only after Phases 1–12 pass, but the likely candidates are:

| Shot | Purpose | Required preconditions |
|---|---|---|
| Overview desktop | Show immediate operational clarity | OVR-01–OVR-05 and OVR-07, coherent 30-day metrics, priority work above fold |
| Cases registry or Work | Show prioritised merchant workflow | Unclipped views, varied owners/cases, complete evidence status |
| Hero case detail | Show the differentiating evidence/recommendation experience | All CDET P0/P1 items and complete hero case |
| Recovery board or Reports | Show value tracking | Varied stages or meaningful reconciled chart; choose the stronger final state |
| Integrations | Show credible source coverage | Coherent health story, safe account names, flattened layout |

Do not capture Flows, Settings, Losses, or Customers merely to increase image count. Include them only if the fixed state communicates a distinct landing-page benefit better than the candidates above.

This selection rule is not permission to omit a route from the product-wide implementation and Phase 12 review. A route may be absent from the final marketing set because it tells no distinct story, never because it remains visually or functionally defective.

### 10.3 Phase 13 focused completion gate

```bash
npm run seed:marketing
npm run validate:marketing-seed
npm run typecheck
npm run lint -- --max-warnings=0
npm run build
npm run capture:marketing
npm run capture:marketing:verify
git diff --check
```

Use one clean isolated seed and validation. Phase 2 already owns the idempotency check; repeat it here only if the seed implementation changed after Phase 2. Earlier phases already ran their focused regressions, so do not replay all Jest tests—including the obsolete Phase 1 meta-tests—unless Phase 13 changes product code; in that case run only the directly affected tests. Build once, then let the capture verifier perform the required second deterministic capture, network/console/privacy/transient checks, and exact-state comparison. Do not run `release:readiness`, its duplicate database replays, its product-polish ledger replay, or the larger release-browser bundle.

Inspect each master once at full size and once at its smallest landing placement. Confirm legibility, crop safety, one-message hierarchy, truthful data, and absence of browser chrome, cursor, transient UI, fixture language, or sensitive data. Record the concise self-review in the Phase 13 report and mark the phase `COMPLETE` when the commands and visual inspection pass. User preference feedback may refine the final selection later; it is not a blocker or a second verification cycle.

---

## 11. Test and acceptance architecture

### 11.1 Automated gates

Use the existing test stack and extend it only where shipped behaviour lacks direct coverage:

- focused schema/read-purity regressions for observed failures;
- one marketing-seed validator;
- focused terminology, money, aggregate, and connection contracts;
- one shared supported-width/accessibility route smoke;
- one final capture command with readiness, privacy, and deterministic comparison built in.

Do not create a second release runner, phase manifest system, evidence store, test-of-test suite, or one screenshot test per requirement. A direct domain test or representative browser path should cover all consumers of the same shared model.

### 11.2 Existing suites that must not drive extra work

Several broad Playwright/release suites encode the audited defects: old demo banners and headings, the same summary-rail composition on every route, synthetic fixture language, and an 8-second p75/15-second maximum. Do **not** mass-migrate those suites, preserve their obsolete UI expectations, or optimise against their performance benchmark.

- Update an old assertion only when the phase’s changed behaviour directly reaches that exact focused test.
- `release-performance.spec.ts` is not a programme gate; Phase 13’s three warmed ready-signal checks replace its percentile benchmark.
- `prepare-release-e2e.mjs` is not the marketing fixture; Phase 2 owns the only screenshot merchant.
- Evidence specs that merely write image/JSON files are obsolete. Do not extend them.
- The large `test:release-browser` and `release:readiness` bundles duplicate phase checks and are not programme gates.

Mention a materially changed assertion in the short phase report. Do not create a migration dossier or replacement umbrella suite.

### 11.3 Required manual review

Automated checks do not replace:

- full-size visual review at 100%;
- review at the exact landing-page rendered size;
- keyboard-only completion of the featured workflow;
- screen-reader spot check for page title, local navigation, table/list, chart alternative, modal/drawer, and async status;
- 200% zoom while the effective CSS viewport remains supported, plus text-spacing override;
- greyscale and forced-colour review;
- product truth check against the feature claim;
- privacy review of every visible and accessible string.

### 11.4 Capture-readiness timing

Measure the production capture path, not local development compilation:

| Measure | Target |
|---|---|
| Warm route-ready time | ≤5s on each of three consecutive navigations |
| Layout shift | CLS ≤0.05 |
| Required API failure rate in capture sweep | 0% |
| Uncaught client errors/hydration warnings | 0 |
| Capture repeatability | ≤0.1% pixels outside approved threshold |

For every capture candidate, pre-warm the route and record three consecutive production-build navigations to the named `data-capture-ready` signal. Keep the browser, machine, and fixture stable. A miss, hanging required request, layout shift, or runtime error must be diagnosed before capture; no percentile harness or local TTFB optimisation programme is required.

---

## 12. Current implementation hotspots

This is a routing map, not permission to limit the fix to these files. Shared loaders, tests, migrations, and descendants must move together.

| Area | Known current hotspots | Primary requirement IDs |
|---|---|---|
| Schema parity and generated contracts | `supabase/migrations/**`, `lib/supabase/types.ts` | RUN-01–RUN-03 |
| Marketing fixture | `scripts/seed-simeon-big-merchant.mjs`, new marketing-seed modules/validator | SEED-01–28 |
| Case APIs | `app/api/claims/[claimId]/**`, `lib/reconciliation/**`, `lib/claims/decision/**` | RUN-01–05, CDET-01–04 |
| Cases registry | `app/(app)/claims/page.tsx`, case queue/preview descendants | RUN-08, CASES-01–10 |
| Case detail composition | `components/claims/ClaimReviewContextColumn.tsx`, `components/claims/payout/PayoutCaseLeadBlock.tsx`, `components/claims/payout/ReconciliationSummaryCard.tsx` | CDET-05–17 |
| Work | `components/work/WorkQueue.tsx`, `app/api/work/views/**` | RUN-06, WORK-01–WORK-09 |
| Overview | `components/dashboard/DashboardOverview.tsx`, `components/dashboard/dashboardPilot.module.css` | OVR-01–05, OVR-07, OVR-09, SYS-13, SYS-16 |
| Customers registry | `components/customers/CustomersTableClient.tsx`, customer loader/read model | CUST-01–04, CUST-06–08 |
| Customer detail | `app/(app)/customers/[id]/CustomerProfilePageHero.tsx`, `CustomerProfilePageMainColumn.tsx`, `customerProfilePageLoad.ts` | CPRO-01–CPRO-14 |
| Losses | `components/losses/LossLedger.tsx`, `app/(app)/losses/**`, source/financial projections | LOSS-01–08, LDET-01–03 |
| Recovery | `app/(app)/recoveries/RecoveryBoardClient.tsx`, `app/(app)/recoveries/**`, recovery read model | REC-01–09, RDET-01–03 |
| Rules and Flows | `components/rules/RulesIndexClient.tsx`, `FlowsIndexClient.tsx`, `RuleVersionWorkbench.tsx`, `FlowVersionWorkbench.tsx` | RULE-01–06, FLOW-01–07 |
| Reports | `components/reporting/IntelligenceReportView.tsx`, `DashboardCharts.tsx`, `app/(app)/reports/**` | REP-01–11, COPY-12, COPY-16 |
| Integrations | `components/integrations/IntegrationsWorkspace.tsx`, `ConnectorRow.tsx`, `IntegrationsWorkspace.module.css`, connection read model | INT-01–INT-13 |
| Settings | `components/settings/SettingsPageShell.tsx`, `app/(app)/settings/**`, account setup API | SET-01–09 |
| Notifications | `components/notifications/NotificationCentre.tsx`, notification event/label mapping | NOTE-01–08 |
| Page composition and width boundary | `components/workbench/WorkbenchPage.tsx`, `components/authenticated/AuthenticatedPageChrome.module.css`, authenticated root layout | SYS-01–08, SYS-12, SYS-18, desktop rail/boundary acceptance |
| Surfaces and tokens | `styles/authenticated/tokens.css`, `styles/authenticated/surfaces.css`, `styles/authenticated/README.md` | SYS-03, SYS-13–15, SYS-21–23 |
| Tables | `components/ui/DataTable.tsx`, `DataTableServer.tsx`, `dataTableStyles.ts`, `styles/authenticated/tables.css` | SYS-09–11, SYS-24 |
| Metrics, tabs, controls | `components/ui/MetricGroup.tsx`, `Tabs.tsx`, `SegmentedControl.tsx` | SYS-12, SYS-19, SYS-25, A11Y-03–04 |
| Loading/empty/error | `components/ui/LoadingSkeleton.tsx`, `EmptyState.tsx`, `components/states/OperationalRouteError.tsx`, route error boundaries | SYS-17, SYS-26–SYS-27 |
| Capture suite | new production-build capture manifest, fixture validator, route-ready and visual-regression tests | CAP-01–12, §11 |

---

## 13. Definition of done

This programme is complete only when:

1. The written ledger contains 251 active unique requirement IDs with one phase owner each; the five mobile-only IDs in §0.3 and fourteen merged RUN IDs in §4.2 are absent from active ownership. This is a document invariant, not a request for an executable ownership parser or meta-verifier.
2. All 251 active P0, P1, and P2 requirements are implemented and marked `PASS` in their short phase reports using the smallest direct checks. Priority is not a deferral mechanism.
3. All 13 short phase reports exist and the explicit Phase 13 commands in §10.3 pass once on the final recorded state.
4. The dedicated marketing merchant builds in an isolated local database, validates, reseeds without duplicate growth, and never touches an unverified/shared/production merchant.
5. Every authenticated route receives the one populated supported-width smoke in Phase 12. Loading, empty/unavailable, and error variants are covered once per shared component pattern plus any genuinely route-specific path—not once per route. Required requests return 2xx and uncaught console, hydration, schema, silent-data, and unintended-write failures are zero.
6. Product-visible and accessible terminology follows §6 and contains no fixture, internal, personal, raw-identifier, machine-enum, or unsupported-capability language.
7. Same-scope currency, financial, count, customer, connection, provenance, and state values reconcile across index, detail, dashboard, report, notification, and integration consumers.
8. Shared components and route layouts satisfy the binding Quiet Precision contract without nested-card, KPI-wall, pill-soup, repeated-callout, duplicate-title, decorative-status, or mechanically repeated page-template regressions.
9. The single Phase 12 pass satisfies the 1440px/1024px and representative accessibility checks; do not repeat it for Definition of Done. Final capture candidates additionally pass their exact capture size, and the shared Desktop required boundary passes once at 1023px and 390px.
10. Capture masters are produced from the recorded production build, seed, clock, browser, and manifest; two independent runs stay within the 0.1% tolerance; privacy and transient-state preflights pass; encoded assets remain legible at exact landing sizes.
11. No product behaviour, direct regression, screenshot, or threshold was removed or weakened to conceal a defect. Redundant meta-verifiers, proof artifacts, duplicate release runs, and Cartesian test matrices are intentionally out of scope; no active owned TODO or unresolved report item remains.
12. The Phase 13 self-review confirms product truth, privacy, hierarchy, legibility, crop safety, and capture cleanliness for every final image.

While implementation or the direct final check remains, the programme state is **`IN PROGRESS — <remaining requirement IDs>`**. Any external constraint is noted under `Remaining` without creating another status. The successful final state is **`CAPTURE-READY`**.
