# Unauth merchant clarity and desktop implementation

Version: 1.0  
Prepared: 6 September 2026  
Scope: the complete merchant desktop overhaul and MVP+ decision workflows  
Execution status: **P00 and P05 retain bounded local PASS receipts. Other phase verdicts retain their scoped evidence. P12 PARTIAL / NOT READY, 10 September 2026: guarded local Supabase acceptance is available and confirmed UI defects have been repaired; current build-bound results and exact remaining clauses are recorded in the [forensic report](../../artifacts/merchant-clarity-implementation/2026-09-09-ui-forensics-01/P12/ui-forensics/report.md). Complete behavioural coverage, revised visual parity, native accessibility/zoom and independent review remain open. No release approval.**
Permanent rules: [GLOBAL_RULES.md](../../GLOBAL_RULES.md)  
Owner index: [ARCHITECTURE.md](../../ARCHITECTURE.md)

This is the single execution plan combining the merchant UI/UX teardown and the earlier Merchant Clarity and Decision Workflows handoff. It retains all 48 findings, all 180 teardown acceptance checks, and the detailed requirements for resolution comparison, manual replacement, three interactive demos, policy preview, actionable reports, onboarding, and pricing. It sequences the work so visible improvements rest on coherent product behaviour and financial meaning.

## Authenticated MVP direction — 23 September 2026

The owner's new vision in `PRODUCT.md` supersedes the earlier manual-only delivery ceiling for the authenticated product. The existing P00–P12 receipts remain dated evidence for their original scope, not certification of MVP-01–08. The earlier instruction to run only one named phase per task does not limit this owner-requested MVP change; the implementation and acceptance obligations remain here in the same plan. The landing page and its presentation work are excluded from this request.

The first implementation candidate is the existing Asterlane Shopify/Gorgias/ShipBob/UPS certification stack. Asterlane is synthetic; the actual paid-pilot merchant, its accounts, provider rights, issue/service/country coverage, recovery route and financial evidence must be selected from real access before any provider action is enabled. UPS is currently read-only, so it does not satisfy the required live submission path. The active `MVP_PLUS_SCOPE.md` and `CAPABILITY_STATUS.md` describe the previous supervised baseline until this target is implemented and verified; neither document is a competing product vision.

| Requirement | Existing owner and current source evidence | 23 September status and required delta |
|---|---|
| MVP-01 intake and facts | `lib/support/intake/*`, `lib/shopify/ingest.ts`, `lib/claim-gate/createOrUpdateClaim.ts`, `app/api/v1/ingest/cases/route.ts` | PARTIAL. Case intake and evidence reads exist; prove automatic participating entry, canonical order/item identity, own-customer coverage and missing/stale states for the selected setup. |
| MVP-02 policy gate | `lib/rules-engine.ts`, `lib/rules/store.ts`, `lib/rules/impactRead.ts`, `app/api/claims/[claimId]/decision/route.ts` | PARTIAL. Rule versions, preview and manual decisions exist; prove conflict handling, exact authorised scope, current evidence and exceptions through the same decision path. |
| MVP-03 enforced action boundary | `lib/claims/externalAction.ts`, `lib/connectors/actions/execute.ts`, `connector_action_runs`, `lib/claim-gate/releaseGate.ts` | BLOCKED FOR LIVE ACTION. Current gate is advisory to third-party writers. This request locally corrected the bounded low-risk connector path to persist and claim one intent before dispatch and hold uncertain outcomes for review; cross-case reservations, fresh concession checks, reconciliation and a real private-client enforcement test remain required. |
| MVP-04 refund and replacement | `lib/claims/replacement.ts`, P05 replacement migration, `lib/connectors/providers/shopify.ts`, `lib/connectors/capabilities.ts` | ABSENT FOR PROVIDER EXECUTION. Same-item manual authorisation and source corroboration exist. Refund issue and replacement order creation are explicitly unsupported; each needs its own verified action contract and controlled result tests before UI enablement. |
| MVP-05 recovery route and submission | `lib/recoveries/*`, `app/api/recoveries/*`, `lib/work/store.ts` | PARTIAL. Packs, manual submission reference and follow-up records exist; RCV-01–06 need bounded end-to-end proof, and one claimant/right/channel-specific real submission path remains absent. |
| MVP-06 verified money | `lib/finance/financialLedger.ts`, `lib/reconciliation/*`, `app/api/recoveries/[id]/credits/*` | PARTIAL. Recorded stages and manual matching exist; prove cash/issued-versus-applied credit evidence, partial/batched allocations, duplicate-benefit prevention, reversals and remaining loss on one declared basis. |
| MVP-07 shared Work and patterns | `lib/work/*`, `lib/reporting/claimPatterns.ts`, authenticated Work/Cases/Recovery views | PARTIAL. Existing task ownership and linked-case reporting are usable foundations; prove one case context across helpdesk action, recovery, receipt, audit/export and source linkback. |
| MVP-08 onboarding and paid offer | `components/OnboardingClient.tsx`, `lib/billing/plans.ts`, `lib/billing/subscriptionIntent.ts` | PARTIAL. The owner has now adopted Core/Scale monthly and annual offers plus custom Enterprise. This task adds public terms and saves plan/payment-frequency intent; provider checkout, incident-capacity enforcement and existing-account migration remain open. |

25 September operating-model clarification: `PRODUCT.md#fully-connected-operating-model-automation-evidence-and-agreements` now states the target progression from observe-only to human-approved to individually released automatic positive actions. A merchant example sends proposed GBP refunds **above £500** to review; the boundary, currency, evidence and exact action permission remain explicit. This does not change the MVP default of human approval or certify a Build 1 automatic mode. MVP-05 must also prove the single reviewed document-to-rule path: safe upload, clause-cited candidate extraction, merchant approval, event-date/service/counterparty matching, claimant/channel evidence and a non-fabricated ceiling. Existing `/api/agreements/*` and `/api/integrations/documents/*` paths are partial, separate mechanisms; their presence does not satisfy that path. MVP-07 must prove idempotent assignment or accountable queue fallback for every review and recovery blocker. `PRODUCT.md` T33/T34/T36 make these MVP checks explicit; T35 is the separate Build 1 automatic threshold/action proof. Add them to the existing acceptance and surface ledger when implementing them; the observed statuses above remain unchanged.

Delivery order for this request: reconcile product authority and status; close durable low-risk connector intent/replay semantics; then build the selected commerce action contracts and recovery channel behind per-action disabled-by-default gates; connect the case and Work UI to persisted action/result states; prove finance and complete-case acceptance. T01–T26, T29–T34 and T36 in `PRODUCT.md` are the MVP test set for released scope, with T28's default-disabled network check; T35 applies when bounded automatic action is implemented. Unit tests and synthetic fixtures can establish local invariants but cannot establish provider entitlement, merchant consent, live result verification or a paid-ready release. The current verdict remains **NOT MVP READY** until those gates pass.

Local evidence for the first safety change: `tests/lib/connectorActionExecution.test.ts` and `tests/lib/connectorActions.test.ts` pass 10 focused assertions. They cover intent-before-call ordering, no provider call on persistence failure, replay without resend, uncertain result retention, changed-payload and cross-workspace case rejection, and no fake handoff for a disabled connector. Scoped ESLint, TypeScript and diff checks also pass. This does not prove a durable queue worker, source-observed completion, refund/replacement/claim submission, provider idempotency or live account permission. The authenticated UI was not changed in this safety slice, so there is no new rendered acceptance claim.

The capability guard remains disabled for refund issue, claim submission and automatic denial while using release-specific language rather than the superseded permanent MVP+ prohibition. Five affected Jest suites pass 60 tests in total, including the 10 action assertions. `verify:authority` still fails on the pre-existing stale `.impeccable/design.json` projection, two references to the absent 9 September forensic report and two references to an old `DESIGN.md` heading; this request did not regenerate design evidence or rewrite historical links.

The authenticated source-setup permissions screen now says that connection alone enables no customer or money action and that each action needs its own verified release and merchant approval. Its existing component suite passes 4 tests; the Impeccable detector reports no findings. A signed-in browser render was not available at the checked loopback origin, so visual acceptance remains open. The shipping case and recovery screens retain truthful manual-action copy until a verified action exists.

P10 documentation follow-up, 12 September 2026: [Landing content implementation](LANDING_CONTENT_IMPLEMENTATION.md) records the implemented broader product story, replacement copy, section order and bounded checks. It remains subordinate to this plan and the global/design owners; the local content revision does not change existing phase verdicts or release gates.

The permanent app-wide rules live in `GLOBAL_RULES.md`. This document defines this initiative's work, dependencies, and evidence; it cannot weaken those rules. Creating these documents and wiring repository instructions does not implement the product, authorise real-system mutations, or establish release readiness.

## 1 Sources and evidence boundary

| Source | Located material | Use and limitation |
|---|---|---|
| Merchant UI and UX teardown | `artifacts/merchant-uiux-audit-2026-09-06/Unauth_Merchant_UI_UX_Teardown.docx` | Word source inspected; SHA-256 `a99e3cf9c974da25e1e302feeb8caf1a002b318a402887242987eb62c46a5ccd`. Contains F01–F48 and C001–C180. |
| Teardown Markdown master | [MERCHANT_UI_UX_TEARDOWN_2026-09-06.md](MERCHANT_UI_UX_TEARDOWN_2026-09-06.md) | Word identifies itself as a reading copy of this master. All finding/check IDs were matched. Preserve dated observations and evidence links. Its proposed execution order is superseded by this plan. |
| Unauth MVP+ — Merchant Clarity and Decision Workflows | [Preserved original handoff](MERCHANT_CLARITY_SOURCE_2026-09-05.md) | Recovered the complete original inline plan from task `01a06f22-ec9e-7da1-a4a5-7586617c2674`. The reference copy retains the historical content; it is not another active plan. |
| Current contracts and implementation | `PRODUCT.md`, `DESIGN.md`, `ARCHITECTURE.md`, navigation, surface, billing, permission, state-machine and financial owners | Inspected to identify actual owners and contradictions. Candidate paths below must be rechecked at phase entry because the worktree is heavily modified. |
| Audit evidence | `artifacts/merchant-uiux-audit-2026-09-06/evidence-index.html`, `route-coverage.csv`, `scenario-coverage.csv` | Dated local synthetic evidence, not fresh behaviour or release proof. |

Verified during document preparation: the authority check and surface-manifest check passed. The current manifest reports **65 page modules, 120 surface owners, 223 scenarios, 55 aliases plus the root redirect**, and a crosswalk of **79 shipping references plus four behavioural references**. These are baseline observations, not a permanent ceiling. New workflows must add their required scenarios to the existing manifest.

The teardown reports 112 inspected screenshots, persisted visual evidence for 56 page modules, 69 scenarios with an inspected state, three partly inspected composite scenarios, and 151 unexercised scenarios. Its interrupted reviews do not establish complete independent acceptance. The 48 findings include observed defects, source-supported mechanisms, requirements, and proposals; the 180 boxes are acceptance obligations, not 180 separately observed bugs.

Document preparation observed 803 worktree status entries. P00 froze a fresh baseline of 809 status entries and 2,484 file records (2,382 present hashes and 102 pre-existing absent files) before editing. Its current development captures reproduce specific pricing, reset, device and demo findings and record additional route states; they do not establish that every dated defect still reproduces. See the P00 receipt for source identity, fixture safety and capture limitations. Close an already-fixed finding only with current proof.

## 2 Decisions that resolve the source conflicts

| Conflict | Controlling decision | Required implementation consequence |
|---|---|---|
| Earlier handoff and current docs permit 390-pixel public/auth/onboarding workflows; teardown requires desktop-only throughout | Adopt the later desktop-only requirement app-wide | Unsupported phone/tablet workflows become the accessible desktop notice. Retain desktop zoom and compact-desktop usability. Update existing route boundary, tests, and reference expectations. |
| Exact package parity forbids structural changes; both inputs require targeted usability changes | Retain one supplied theme; permit the specifically scoped hierarchy, layout, copy, semantics, and interaction changes in this plan | Register revisions in `DESIGN.md` and the existing manifest crosswalk. Preserve unaffected references; no second renderer or blanket snapshot reset. |
| Teardown says resolve commercial intent; original handoff explicitly preserves the canonical catalogue | Preserve current canonical terms unless Malik explicitly changes them; the owner supplied revised terms on 24 September 2026 | Correct public consumers to the revised Core/Scale/Enterprise offer. The Free/Pro/Growth/Enterprise values recorded at preparation are historical cross-checks only; retain existing account rows until a deliberate migration. Runtime imports the catalogue. |
| A later demo stage could describe a predefined example state; original handoff prohibits invented prerequisite decisions | Use the stricter causal navigation contract | An Outcome URL without a recorded decision returns to Decide with an explanation. It cannot fabricate a choice. |
| Teardown offers UI fixes while earlier plan adds complete replacement semantics | Both are required | Build persistent replacement action semantics before enabling the replacement confirmation. Preserve generic approval/refund compatibility. |
| Existing reports and policy preview already exist but are incomplete | Extend actual owners | No replacement reporting platform, separate rule engine, second cost registry, new identity network, or generic AI assistant. |
| Historical acceptance documents appear executable | This plan owns the current initiative; global rules own enduring constraints | Mark old plans superseded for current execution. Reuse safe fixture methods without importing stale scope, theme, viewport, or completion claims. |

Documentation adoption permits planning and authority wiring now. A later instruction to implement a named phase authorises that bounded runtime work. It does not authorise every subsequent phase, real-provider activity, commit, push, migration to a remote database, or deployment.

## 3 Model and thinking recommendation

**Use GPT-6 Astra (`gpt-6-astra`) with Extra high (`xhigh`) thinking as the default executor.** Use **Max (`max`)** for P02, P05, P08, and P12 because they concentrate money, persistent action semantics, rule uncertainty, and integrated acceptance. Keep one model family across the initiative so the contract remains consistent.

This is a task-specific recommendation, not a benchmark claim. Official OpenAI documentation describes GPT-6 Astra as its most capable model for difficult end-to-end coding/reasoning and explicitly supports `xhigh` and `max`. Both settings are also available in this task's local model catalogue. The IDE's display label may differ; select the matching reasoning value. Model guidance was checked on 6 September 2026. [Official GPT-6 Astra documentation](https://developers.openai.com/api/docs/models/gpt-6-astra).

Do one named phase per implementation task. At the end, require a recorded exit verdict before the next phase. For P12 obtain a fresh review context that inspects requirements, final source, runtime, and evidence independently; changing the model is not a substitute for independent evidence. Maximum thinking cannot compensate for a missing fixture, contradictory authority, or an untested persistent path.

## 4 Phase map and current status

Run P00 through P12 in order. Each phase requires the preceding phases' exit gates, plus the specific domain prerequisites stated below. A blocked prerequisite is not passed by beginning a dependent screen. Routine substeps within an authorised phase do not need repeated approval.

| Phase | Outcome | Primary finding or requirement ownership | Thinking | Status |
|---|---|---|---|---|
| P00 | Adopt and enforce contracts; establish current baseline | Global enforcement; all-source traceability | xhigh | PASS, 2026-09-06 — [receipt](../../artifacts/merchant-clarity-implementation/2026-09-06-p00/P00/receipt.md); baseline/enforcement only, product acceptance remains open |
| P01 | Correct runtime, commercial, operator, and identity truth | F02–F04, F12–F16; M16 | xhigh | PARTIAL — implemented; local truth proof PASS; visual acceptance open |
| P02 | Make financial amounts, stages, and periods coherent | F05–F11 | max | PARTIAL — implementation/local truth and read-only browser PASS; local database installation, scope and reversal-aware close persistence now PASS; hosted installation and broader visual acceptance open |
| P03 | Make the entire supported desktop shell usable | F01, F17–F23, F36–F38 | xhigh | PARTIAL — implementation/focused local/build and public/device browser proof PASS; compact authenticated cancellation, workspace switching and cross-session sign-out now PASS; full long-data and real screen-reader acceptance open |
| P04 | Complete investigation and resolution comparison | F28–F31; M04–M05 | xhigh | PARTIAL — implementation/focused local/build proof PASS; compact authenticated decision cancel/record/replay/read-back and repeated order identity now PASS; full investigation-state acceptance open |
| P05 | Complete manual replacement through persistence and outcomes | M06–M08 | max | PASS, 2026-09-06 — [receipt](../../artifacts/merchant-clarity-implementation/2026-09-06-p05/P05/receipt.md); local implementation/acceptance only, no provider, remote migration, deploy, or release approval |
| P06 | Make source repair, imports, and onboarding truthful and useful | F32–F35, F43; M15 | xhigh | PARTIAL — repaired; seven-state onboarding and import persistence browser proof PASS; full source lifecycle acceptance open |
| P07 | Make Work and recovery lead to the correct next action | F24–F27, F48 | xhigh | PARTIAL, 2026-09-06 — [receipt](../../artifacts/merchant-clarity-implementation/2026-09-06-p07/P07/receipt.md); implemented, focused/build and authenticated local lifecycle/draft proof PASS; complete-pack, broader role/concurrency and full visual acceptance open; ZIP storage migration verified locally only |
| P08 | Deliver safe current-evidence policy preview | M09–M11; rule/flow acceptance | max | PARTIAL — implementation and bounded proof; see P08 receipt |
| P09 | Deliver evidenced carrier, SKU, and warehouse patterns | M12–M14 | xhigh | PARTIAL, 2026-09-07 — [receipt](../../artifacts/merchant-clarity-implementation/2026-09-07-p09/P09/receipt.md); bounded implementation and source/component proof; authenticated/database/build exit gates remain open |
| P10 | Deliver the public explanation and three causal demos | F46–F47; M01–M03 | xhigh | PARTIAL — implemented; local journeys pass, build/reference gates open |
| P11 | Align account, security, notifications, help, and governance | F39–F42, F44–F45 | xhigh | PARTIAL, 2026-09-07 — [receipt](../../artifacts/merchant-clarity-implementation/2026-09-07-p11/P11/receipt.md); implementation and isolated local checks complete; authenticated persistence and full visual gates open |
| P12 | Complete app-wide behavioural and visual acceptance | Every F, C, and M requirement | max | PARTIAL / NOT READY, 2026-09-10 — [current forensic report](../../artifacts/merchant-clarity-implementation/2026-09-09-ui-forensics-01/P12/ui-forensics/report.md); local Supabase execution restored, authenticated scoped repairs verified, incomplete contracts/native accessibility/revised visual parity/independent review remain open; earlier receipts remain historical evidence |

The source acceptance checks are copied into section 13. Their ownership is assigned by domain; P12 verifies integration across every domain. All checks remain unchecked until actual proof exists. M01–M18 in section 11 retain the earlier handoff's additional obligations. M17 and M18 apply to every phase.

Repair follow-up, 6 September 2026: [P01–P06 repair receipt](../../artifacts/merchant-clarity-implementation/2026-09-06-repair-through-p06/receipt.md) records four passing authenticated browser tests, rollback database proof and the exact local-only migration. Historical receipts remain evidence of their earlier scope. Remaining phase gates are listed in the follow-up; this is not hosted or release approval.

## 5 Common execution contract for every phase

1. Read `AGENTS.md`, `GLOBAL_RULES.md`, `ARCHITECTURE.md`, `PRODUCT.md`, `DESIGN.md`, this phase, and its affected registered owners. Read relevant installed Next.js documentation before code. The inspected installation is Next 16.3.3; recheck at execution time.
2. Record revision, branch, dirty baseline, runtime origin, environment class, fixture identities, current manifest hashes/counts, and relevant rule IDs. Treat localhost and 127.0.0.1 as distinct browser origins with potentially different sessions.
3. Trace the live route through its component, runtime adapter, loader, handler, domain function, storage, and tests. Freeze an **exact file allow-list** in that phase's receipt before editing. The candidate owner lists below are discovery boundaries, not permission for an entire directory rewrite. Add an adjacent dependency only with its reason and rule/requirement link; a new product capability needs an explicit scope revision.
4. Reproduce the assigned dated findings or document current evidence that they were already fixed. Capture before states with matching fixture and viewport. Separate hypotheses and design proposals from verified defects.
5. Implement existing domain and shared owners first, then affected consumers. Keep reference changes limited to recorded revisions. New data-bearing fields need honest loading/unavailable states. Check indirect consumers, exports, notifications, and source links.
6. Test the smallest meaningful unit/integration/browser set and the required invariant cases. Use guarded disposable fixtures for writes and read back persistence. A screenshot cannot prove an action; a unit test cannot prove visual usability.
7. Update relevant owners, manifest scenarios, generated inventory, existing visual expectations, and this plan's phase status. Review only the phase diff against the captured baseline. Preserve all unrelated work.
8. Produce the phase receipt described in section 12. Mark PASS only when its exit gates are evidenced; otherwise report PARTIAL, BLOCKED, or FAIL with exact unresolved IDs. Stop before the next phase unless the user authorised it.

Evidence projections should use `artifacts/merchant-clarity-implementation/<run-id>/` with `P00` through `P12` subdirectories and the existing acceptance-ledger schema where possible. This path is a proposed output location, not evidence that files or successful runs already exist. Do not create a second surface registry or a second product-status document.

## 6 Foundations and shared desktop phases

### P00 Establish enforceable global rules and a current baseline

**Entry:** this documentation package is present. Documentation adoption is complete enough to instruct work, but runtime enforcement and audit closure are unverified.

**Candidate owners:** `GLOBAL_RULES.md`, `AGENTS.md`, `ARCHITECTURE.md`, `PRODUCT.md`, `DESIGN.md`, `docs/product/MVP_PLUS_SCOPE.md`, `scripts/verify-authority-map.mjs`, `scripts/verify-merchant-copy.mjs`, `scripts/verify-surface-manifest.ts`, `scripts/verify-full-app-visual-cutover.mjs`, `scripts/generate-supplied-visual-pages.mjs`, `lib/surfaces/manifest.ts`, existing acceptance-ledger generators and fixture guard, `.impeccable/design.json`, and their targeted tests. Read `lib/navigation/appRoutes.ts`, aliases, `next.config.js`, and current release evidence without changing their contracts incidentally.

**Work:**

- Reconcile the document package and verify no current instruction competes with the global hierarchy, desktop policy, or registered scoped visual changes. Extend the existing authority verifier to require the new global/plan owners and the IDE entry-point reference. Validate this integration with a controlled missing-reference failure; a checker that merely finds an unrelated heading is insufficient.
- Inventory the actual data bindings and reachable visual owners, particularly generated-reference adaptation and headers. Assign every F01–F48 and M01–M18 to its phase and every C001–C180 to the current surface/scenario evidence projection. Add scenarios for new replacement, demo, preview, and report flows; do not cap future coverage at 223.
- Reproduce dated priority findings safely. Capture untested route families with purpose-created records when needed. Do not mutate real accounts to manufacture screenshots.
- Record the permitted design revisions in `DESIGN.md` and map their affected source references through the existing crosswalk. Refresh the stale design sidecar from that owner; it remains generated/descriptive, not an independent style authority. Update parity checks to distinguish an adopted revision from an unexplained deviation while retaining unaffected-source comparisons.
- Attach each important global invariant to its actual enforcement and verification owner using the matrix in section 10. Prefer existing tests and negative cases; do not attempt to prove product safety with a Markdown-string checker alone.

**Exit:** authority and manifest checks pass; all sources/check IDs are accounted for; phase ownership and exact baseline are recorded; revised desktop/design expectations have an explicit scope; fixture safety is established; remaining runtime defects are honestly OPEN. P00 can pass with known planned product defects because its purpose is baseline/enforcement setup. It cannot declare those defects fixed.

**Stop:** ambiguous authority, missing adopted source package, unverified fixture environment, or an inability to preserve the dirty baseline blocks the dependent work. Do not substitute a new design.

### P01 Correct runtime and commercial truth

**Owns:** F02, F03, F04, F12, F13, F14, F15, F16, M16. F17 receives its commercial inputs here and closes with P03's dialog checks.

**Candidate owners:** `lib/billing/plans.ts` as read authority, existing billing read models, `app/(public)/pricing/page.tsx` → `components/public/PublicPricing.tsx`, public signup and auth return routes, `components/billing/BillingSettingsClient.tsx`, `components/layout/ExactAuthenticatedShell.tsx`, the existing page runtime adapters, `components/rules/ConditionBlock.tsx`, `components/rules/RuleBuilderDrawer.tsx`, `lib/rules/fields.ts`, existing rule normalisation/validation, `components/sources/SourcesOperations.tsx`, `lib/sources/evidenceReadiness.ts`, `components/settings/TeamManagementClient.tsx`, search/customer evidence route owners, and reset route/runtime owner. Freeze exact consumers after tracing; do not rewrite every generated file or edit unmounted legacy components.

**Work:**

- Bind commercial surfaces to the revised catalogue, including incident/store capacity, entitlements, currency, billing interval and custom Enterprise. Show only owner-approved annual savings; remove unsupported discount, popularity, automatic-overage, lifetime-case-credit and retention claims. Keep legacy credit terms identified as historical. Do not activate a request without provider confirmation.
- Remove reference people, counts, dates, statuses, and capability claims from active headers, summaries, rails, settings, Imports, Flows, Search, Reports, and Sources. Each value derives from its existing scoped read model or an honest unavailable state. Do not build a global string-replacement layer.
- Normalise persisted rule operators without changing meaning. Support every established representation, block unknown operators, and preserve AND/OR, units, ordering, and structure through no-op edit/save.
- Bind identity and breadcrumbs to the current authenticated actor, route entity, and query. Disambiguate stale or unavailable identity without falling back to a sample person.
- Separate source configuration/capability counts from freshness and health. Represent unavailable Team counts independently from successful zero results.
- Remove reset success from initial state. Implement initial, submitting, submitted, and failed presentation without exposing whether an account exists.

**Exit proof:** revised catalogue parity across current public surfaces; monthly/annual selection survives signup and becomes a server-owned intent without activation; billing links cannot mutate subscriptions; repeatable empty/populated/stale/unavailable header fixtures; sequential and multi-tab customer/query identity; configured-but-stale source; failed Team read versus verified empty; every rule operator and no-op persisted roundtrip; reset initial/success/failure/cancel using a local stub. No real charge or email delivery.

P01 execution receipt (6 September 2026): `artifacts/merchant-clarity-implementation/2026-09-06-p01/P01/receipt.md`. F02–F04, F12–F16 and M16 have implementation and focused local proof: 115 unit/component assertions; 25 guarded browser captures including a persisted, cleaned-up rule draft; 200 deterministic truth states across all 50 shared-shell references with unchanged surrounding chrome. F17 commercial inputs are supplied; P03 owns its dialog closure. The 55 revised-reference candidates remain `planned`: whole-page original/revised parity is not accepted by these component checks, and the inherited P00 visual-cutover failure is not converted into a pass. VIS-05/06/10 and final P12 visual acceptance remain open. No P02 work, production/provider proof, deployment, or release approval is implied.

### P02 Align financial scope stages and arithmetic

**Owns:** F05–F11. **Additional prerequisite:** P01 truth-state handling and canonical commercial terms are stable.

**Candidate owners:** `lib/financial/canonicalAggregates.ts`, `lib/utils/format.ts`, `lib/reconciliation/`, relevant loss/recovery/receipt read models, `app/(app)/financials/losses/LossesPage.tsx`, `app/(app)/financials/losses/[lossId]/LossDetailPage.tsx`, `app/(app)/financials/reconciliation/page.tsx`, `components/reports/SuppliedReportsView.tsx`, `lib/reporting/namedReportContracts.ts`, `components/dashboard/ExactDashboardOverview.tsx`, case preview/detail monetary projections, and affected financial APIs/tests. Only the specific traced files in those domains enter the allow-list.

**Work:**

- Define and propagate start-inclusive/end-exclusive dates, timezone, currency, population, pagination/cap state, and as-of time through KPIs, rows, charts, causes, detail links, exports, and comparisons. Do not apply a selector only to decorative text.
- Reproduce the cited list/detail contradiction on the exact loss ID or an equivalent fixture. Trace fields and units rather than guessing a currency conversion. Make a given record/scope agree at every presentation level.
- Pass reconciliation period into actual relevant reads and close-preview eligibility. Identify earlier outstanding exceptions separately. Keep missing settlement snapshots and insufficient permissions blocking close.
- Separate operational stale-case work from bank/receipt evidence. Keep requested, approved, received, matched, reconciled, and closed totals distinct, with correct counted entities.
- Make the displayed ledger bridge reconcile using its real components. The audit equation `35,608.07 - 16,358.55` equals `19,249.52`; do not present `17,149.02` as that subtraction. Investigate and explain valid additional adjustments instead of changing accounting to fit copy.
- Stop exposure/order value from falling back into Recoverable. Preview and detail consume the same eligibility/ceiling definition. Preserve unknown currency, partial data, unassigned money, and independent economic-cost concepts.

**Exit proof:** same-record list/detail equality; two different months change the supporting population; boundary dates and timezone; zero/unavailable/partial/mixed currencies; adjustment and partial-recovery arithmetic; actual receipt/match lineage; exact close review and blocked close; preview/detail recoverability agreement. Mutation tests use isolated persisted read-back and exact cleanup. No real period close or financial-history rewrite.

P02 execution receipt (6 September 2026): `artifacts/merchant-clarity-implementation/2026-09-06-p02/P02/receipt.md`. F05–F11 have bounded implementation, 79 focused unit/component/security assertions, and four passing read-only 1440×900 browser scenarios covering the cited loss, case preview/detail recoverability, two reconciliation months with a blocked close, and the report money bridge. The additive P02 migration was not installed because no isolated local Docker database was available; persisted mutation/read-back/cleanup proof therefore remains unproven. The P02 exit verdict is PARTIAL. No real close, provider action, deployment, release approval, or P03 work is implied.

### P03 Stabilise desktop access shell controls and accessibility

**Owns:** F01, F17–F23, F36–F38. Applies shared patterns across the whole app, including entry and exceptional states.

**Candidate owners:** `components/system/DesktopRequiredBoundary.tsx`, public/auth/onboarding/app layouts and root boundaries, `components/layout/ExactAuthenticatedShell.tsx`, shared navigation/account/dialog/drawer/table primitives, `components/cases/CaseContextDrawer.tsx`, case decision UI, `components/dashboard/ExactDashboardOverview.tsx`, connected-source row owner, account appearance owner, billing review, existing generated-source contract, route permission/navigation owners where wiring requires it, and relevant browser/accessibility tests.

**Work:**

- Apply one desktop support policy before functional workflows mount. Test known phone/tablet classes in portrait and landscape, direct URLs, auth redirects, onboarding, demo, pricing, and entry. Use an explicit tested classification contract; width or touch alone is insufficient. Do not present this support policy as a security boundary.
- Provide a readable unsupported-device notice with safe return context, Copy link and/or an email composer containing the real URL. Do not imply Unauth sent an email or offers mobile triage/digests. Give narrow desktop windows appropriate guidance; preserve desktop magnification and essential access.
- Make 1024/1280/1440 desktop layouts and 720/600 heights usable. Respect the adopted shell's reference geometry while allowing real viewport fill, scrolling navigation, bounded context drawers, readable essential columns, and accessible footers. Source rows must not shrink through their text at 8, 25, or larger row counts.
- Repair dialog names, visible dismissal, focus entry/containment/return, Escape/Cancel, and pending semantics. Separate decision, assignment, and lifecycle actions. Billing review must show P01's current/requested price, allowances, effective-time rule, and provider confirmation boundary.
- Add meaningful headings/landmarks/table relationships within the existing visual owner. Choose a complete table or grid interaction contract. Make nested row actions and selection safe; enlarge/name the case close target.
- Implement supported metric controls and a scoped chart data alternative, or make unsupported labels noninteractive. Improve critical evidence reading space without hiding facts.
- Expose one working light appearance; do not implement dark mode as a side task. Fix settings active context, Inbox/preferences destinations, actual account identity, account menu, and a discoverable sign-out using a disposable session.

**Exit proof:** desktop/device matrix; no partial mobile workflow behind a notice; keyboard traversal and real screen-reader spot checks across shared primitives; focus restoration and cancellation with no writes; readable large datasets/long names at short heights; correct active nav/return state; chart selection agrees with table; sign-out does not disrupt another session. Compare affected references and retain unaffected visual regressions. Do not claim full accessibility certification.

P03 execution receipt (6 September 2026): `artifacts/merchant-clarity-implementation/2026-09-06-p03/P03/receipt.md`. F01, F17–F23, and F36–F38 have bounded implementation, 53 focused unit/component assertions, a passing production build, and passing read-only loopback device/public checks across phone portrait, tablet landscape, narrow desktop, and 1024/1280/1440 desktop entry surfaces. Local Supabase remained unavailable because Docker was not running, so authenticated long-data/short-height rendering, real screen-reader traversal, persisted cancellation/read-back, and disposable cross-session sign-out proof remain unproven. The P03 exit verdict is PARTIAL. No real write, provider action, email delivery, deployment, release approval, or P04 work is implied.

## 7 Investigation replacement setup and operational phases

### P04 Complete case investigation and resolution comparison

**Owns:** F28–F31, M04–M05. **Prerequisites:** shared identity, financial, desktop, and dialog contracts from P01–P03.

**Candidate owners:** `app/(app)/cases/` canonical queue/detail loaders, `components/cases/CaseContextDrawer.tsx`, `components/claims/CaseDetailOperations.tsx`, existing decision context/read models and `app/api/claims/[claimId]/decision/route.ts`, customer registry/profile/evidence builder, existing order/refund/return/shipment/ticket/dispute detail owners, affected item matching, and relevant tests. Do not create a new Cases route or parallel cost registry.

**Work:**

- Keep registry, bounded preview, and canonical detail separate with consistent identity, eligibility, amount, selected row, filter context, and return path. Make customer lookup the primary Customers task and identity hypotheses subordinate.
- Order case detail around the decision question, blocking evidence, recommendation with its actual uncertainty, comparison, and supporting history. Put the first actionable hard gate, source, freshness, and effect on pack inclusion within reach.
- Compare refund/partial refund, same-item replacement, feasible evidence request, escalation, and no-additional-payout where relevant. Show customer resolution, known cost components, source versus estimate, currency, missing components, policy restrictions, contradictions, prepared next action, and separate recovery terms/deadline.
- Expose existing persisted cost information through the current decision context. Unknown is not zero, retail is not replacement cost, and speculative recovery does not reduce immediate cost. Do not require payout amounts for non-financial actions.
- Record permission, ownership, evidence/policy/case versions, exact resolution and amount/currency, rationale, and the comparison snapshot at confirmation. Refresh stale comparisons before mutation. Preserve legacy decision semantics.
- Disambiguate repeated human order references using source/store, date, amount, and immutable identity. Retained line/message/scan counts must match their sections. Explain not imported, not retained, unsupported, unavailable, and verified empty separately; link useful source repair without fabricated content.

**Exit proof:** known/unknown/zero/estimated costs; missing currency; duplicate concession and policy exception; feasible evidence request; stale comparison; permission/tenant denial; correct decision snapshot and audit; cancel/no-write; two same-number orders cannot open each other; customer navigation across tabs; missing connected record facts remain honest. Replacement may be described in comparison but its confirmation stays unavailable until P05 passes.

P04 execution receipt (6 September 2026): `artifacts/merchant-clarity-implementation/2026-09-06-p04/P04/receipt.md`. F28–F31 and M04–M05 have bounded implementation, 134 focused unit/component/API/security assertions, passing static authority/surface/UI/reference checks, and a passing production build. The versioned server comparison keeps unknown, verified-zero, estimated and known costs distinct, persists the current comparison snapshot for confirmable actions, rejects stale or mismatched confirmation, and leaves same-item replacement confirmation unavailable for P05. Local Supabase and authenticated app acceptance could not run because Docker was not running, so persisted decision/audit read-back, rendered case/customer/evidence navigation, cancellation/no-write, repeated-order isolation and connected-record state proof remain unproven. The P04 exit verdict is PARTIAL. No provider action, migration, deployment, release approval, or P05 work is implied.

### P05 Complete manual replacement end to end

**Owns:** M06–M08. **Prerequisites:** P04 comparison contract and confirmed affected-item identity. This phase needs persistent-boundary tests before enabling the CTA.

**Candidate owners:** existing decision schema/validation, `app/api/claims/[claimId]/decision/route.ts`, `lib/claims/externalAction.ts`, affected case/read/audit models, existing item and external-action storage functions, `lib/claims/statusMachine.ts` and `lib/cases/stateMachine.ts` only where needed, existing outcome/receipt handlers, tests, and additive `supabase/migrations/` plus `scripts/release-migration-manifest.mjs` if the minimum contract requires them. Locate all downstream refund consumers before editing.

**Work:**

- Carry explicit replacement action, original order/confirmed lines, unique item IDs, positive integer quantities, authorised nonnegative budget/currency, rationale, cost provenance, and frozen comparison through request validation, persistence, audit, read models, and handoff.
- Validate eligible quantities after confirmed replacements and outstanding authorisations. Reject duplicate IDs, over-quantity, invalid units, unknown currency, and negative/unknown required budgets. Surface prior refunds as a duplicate-concession conflict requiring justification. Handle simultaneous authorisations atomically at the existing storage boundary.
- Preserve historical generic approvals as refund-compatible historical records; never infer replacement from a label. Ensure replacement cannot enter `REFUND_DECISIONS` handoff logic on success, retries, reloads, partial failures, or legacy fallbacks.
- Prepare manual instructions containing the original order, exact items/quantities, budget, and rationale. Copy instructions and Open original order do not complete dispatch. Record an external reference/receipt only with the correct permission and state.
- Mark operator receipt as merchant-confirmed. Keep authorised, dispatched, cost incurred, provider corroborated, recovery, and reconciled states separate. Deduplicate later source observations against the same external outcome. Reversing authorisation does not pretend to cancel an external shipment.
- Use additive compatible migrations if necessary, with local rollout and forward-repair evidence. Do not execute remote migrations or create replacement orders.

**Exit proof:** complete success and cancellation; partial/multi-item quantities; same SKU/variant restriction; tenant/permission denial; simultaneous requests cannot over-authorise; correct stored action; no refund handoff; handoff retry; stale version; authorised versus dispatched versus cost separation; receipt-backed merchant confirmation; later source corroboration without double count; existing refund and historical-record compatibility; exact local cleanup. No enabled replacement confirmation before all critical invariants pass.

P05 execution receipt (6 September 2026): `artifacts/merchant-clarity-implementation/2026-09-06-p05/P05/receipt.md`. M06–M08 now have explicit same-item replacement validation and storage, atomic quantity accounting, refund-compatible historical semantics, reloadable manual handoff, merchant receipt, actual-cost and source-corroboration separation, forward-compatible migrations, and authenticated desktop evidence. The persistent SQL proof passed concurrency, retry, stale, tenant, reversal, compatibility, deduplication, and exact cleanup cases; 68 focused assertions, the exact-source production build, and the dedicated Playwright workflow passed. This is local evidence only: no provider write, remote migration, deployment, production reconciliation, release approval, or P06 work is implied.

### P06 Align source repair imports and onboarding

Execution receipt (6 September 2026): `artifacts/merchant-clarity-implementation/2026-09-06-p06/P06/receipt.md`. Core source separation, observed-state onboarding routing and import guidance/validation repairs are implemented. The repair follow-up now proves all seven onboarding destinations, partial usable imports and reload, import cancel/commit/retry/read-back, mapping and error download, compact wizard text and agreement cancellation. Full source lifecycle acceptance remains outstanding; this is not phase closure. P01–P04 gaps are carried forward with the user's explicit approval.

**Owns:** F32–F35, F43, M15. **Prerequisites:** P01 provider-state vocabulary and P03 readable shared components.

**Candidate owners:** `components/sources/SourcesOperations.tsx`, `lib/sources/evidenceReadiness.ts`, source detail/catalogue/setup routes, `lib/integrations/registry.ts` as lifecycle authority, `lib/connectors/registry.ts` as adapter authority, `components/OnboardingClient.tsx`, `components/Onboarding/onboardingReducer.ts`, `lib/connections/getMerchantSetupState.ts`, existing import job/mapping/commit owners, agreement upload owner, and targeted tests. No integration expansion.

**Work:**

- Put failing active connections before unconfigured/planned catalogue entries. Use real connection and catalogue populations; name precise supported read/subscription/handoff operations. Retain independent freshness and health states.
- Give each wizard choice a distinct label, explanation, saved value, and verification result. Gate choices on real prerequisites, resume persisted progress, and never mark a step verified merely because it was viewed.
- Explain upload formats, example shape, validation, mapping, duplicate/held rows, retry, retention, and review outcomes before selecting a file. Populate an import-job fixture, including error download, without claiming an upload is approved terms or successful ingestion.
- Derive exactly one primary onboarding next step in order: required commerce missing → Connect Shopify; failed import without usable records → Fix import; running import without usable records → View import progress; connected/not started → Import order history; actionable case → Review your first case; usable losses/no case → Review imported losses; successful empty → Check import coverage with observed period/count.
- Use existing queue priority for the first case. Keep optional missing sources and nonblocking held rows as secondary tasks. Remove fixed time/verification promises, duplicate destinations, and unsupported commerce selections that later silently require Shopify.

**Exit proof:** all seven onboarding destinations plus partial usable imports and resume; blocked authentication/activation never appears verified; truthful provider capabilities; connected/catalogue separation; wizard long text at 1280×720; upload review/cancel/validation/duplicates/retry using disposable data; import detail and error download; empty agreements/imports contain no sample summaries; disconnect retains history under the existing contract. No real connection, import of personal data, or agreement approval.

### P07 Improve Work recovery and claim preparation

**Owner scope clarification, 18 September 2026:** GLOBAL_RULES.md PROD-08 and PRODUCT.md#active-recovery-assistance extend the intended recovery outcome from preparation/tracking to practical assistance through collection. Existing receipts do not prove this added scope. Implementation remains a separately scoped task using the existing owners below; no automatic phase progression or external execution is authorised.

**Owns:** F24–F27, F48. **Prerequisites:** consistent financial/case/item context and usable source repair destinations.

**Candidate owners:** canonical Work read/queue/lifecycle owners under `components/work/`, `app/(app)/work/page.tsx`, `app/(app)/financials/recovery/RecoveryBoardClient.tsx`, recovery detail/preparation/outcome owners, existing evidence-pack narrative generation and hard-gate logic, related case/loss follow-up projections, and their targeted tests.

**Work:**

- Distinguish assigned tasks, workspace tasks, integration exceptions, filtered count, and displayed rows. Show reason, urgency, owner, and next action. Keep cancelled/completed tasks out of open counts; explain legitimate recovery follow-up after a case decision.
- Show batch actions after selection, preserve explicit target population through filters, and keep one clear primary row action. Snooze/assignment/completion remain separate and produce their real outcomes. Show rest states how many records it reveals.
- Make a recovery-stage total navigate to that filtered population with stage-specific pagination or the existing filtered list. Distinguish no cards on this page from no work in the stage; label every monetary total's scope.
- Preserve terms, deadline, eligible ceiling, receipt state, and follow-up action. Generate claim narratives only from supported facts, present missing inputs as an actionable checklist, and distinguish incomplete draft, prepared pack, manual submission, provider response, receipt, and reconciliation.
- Support the adopted active-recovery workflow: evidenced route and claimant selection; specific missing-evidence tasks; usable claim wording and form/channel handoff; actual submission-reference capture; owned follow-up and review dates; prepared additional-evidence responses; justified rejection/shortfall challenges; payment-document blockers and unpaid-approved-balance follow-up; receipt reconciliation or explicit permissioned pursuit closure with a reason. Keep captured terms, amounts, deadlines, provenance and uncertainty intact. Extend existing Cases, Work, evidence, recovery and finance owners.
- Added-scope acceptance must cover uncertain eligibility, wrong/unknown submission route, missing evidence, pack prepared but not submitted, duplicate handoff, overdue follow-up, additional-evidence requests, supported versus unsupported challenges, approved but unpaid, partial receipts, and explicit pursuit closure without fabricated recovery or automatic write-off. Verify permissions, cancellation, persisted read-back and lifecycle independence where consequential writes apply. These are new obligations, not passed checks.
- Retain hard-gate export/submission blockers. Do not introduce automated filing, partner contact, or provider execution.

**Exit proof:** task/case/recovery lifecycle independence; cancelled-task exclusion; accurate filtered counts and page navigation; stable batch targets; stage count opens represented records; empty-page/global-empty distinction; complete/incomplete narratives; no unsupported factual assertions; exact decision/outcome read-back in fixtures; existing hard gates remain blocking. Measure triage tasks against baseline before making efficiency claims.

### Adopted recovery additions — 18 September 2026

The owner adopts all six requirements in [PRODUCT.md — Recovery and decision workflow requirements](../../PRODUCT.md#recovery-and-decision-workflow-requirements), enforced by GLOBAL_RULES.md PROD-09. PRODUCT.md owns their meaning. This table assigns follow-up work to existing phases/domains; earlier phase receipts do not establish acceptance of these additions. All six remain **adopted; implementation and acceptance not assessed for this addition** until a scoped task establishes evidence. Documentation adoption does not start implementation or authorise provider actions.

| Requirement | Existing delivery owners | Required added-scope proof |
|---|---|---|
| RCV-01 Daily recovery action queue | P07 Work/recovery queue and lifecycle owners; P02 scoped financial projections | Exact deadline/ready/blocked/response/unpaid populations; actionable destinations; owner and next step; internal reminder versus provider deadline; empty/partial states; completed-work exclusion; currency/stage-safe totals and deduplication. |
| RCV-02 Early evidence collection | P04 case investigation and evidence requests; P07 evidence-pack requirements | Applicable versioned checklist during the original investigation; reuse held evidence; unknown requirements and infeasible requests; source-linked prepared wording; customer resolution remains independent; no message sent by preparation. |
| RCV-03 Correct claimant and route | P07 recovery terms, preparation and handoff; P06 source/account context | Same carrier with different account/intermediary routes; unknown claimant/channel blocker; supported fields and attachments; prepared versus submitted distinction; captured reference/version; retry and duplicate-pursuit protection. |
| RCV-04 Approved but unpaid | P07 recovery outcomes and Work; P02 receipt matching/reconciliation | Approval without receipt; payment-document blocker; partial and unmatched receipts; incomplete source coverage; compatible amount/currency arithmetic; reviewed prepared follow-up; explicit closure without invented cash or automatic write-off. |
| RCV-05 Fresh concession check | P04/P05 decision validation and persistent authorisation boundary; existing claim-gate consumers | Two simultaneous actors and overlapping tickets; refund/replacement overlap; partial quantities; stale open review; source freshness limitations; permissioned exception; idempotent retry; no double authorisation; tenant/order/line isolation. |
| RCV-06 Historical recovery review | P06 imports and imported-loss/onboarding path; P07 recovery eligibility and Work; P02 loss context | Bounded period and coverage; valid/expired/unknown terms; historical applicability; existing claim/receipt/task deduplication; empty/partial imports; read-only review; deliberate permissioned pursuit; no speculative recoverable totals or new charges. |

Prioritise RCV-01/02/04 as recorded in PRODUCT.md, without dropping RCV-03/05/06 or bypassing their dependencies. Before runtime work, locate the current reachable owners, freeze its allow-list and baseline, and add affected scenarios to the existing surface/acceptance mapping. Use the common action contract for new consequential controls and preserve manual sending/submission boundaries. P12 must include the affected rendered and persistent workflows before claiming full acceptance; old PASS receipts remain historical evidence only.

## 8 Policy reporting public and governance phases

### P08 Deliver current-evidence policy preview

**Owns:** M09–M11 and the rules/flows checklist. **Prerequisites:** P01 operator normalisation, P02 money/currency definitions, and P04 versioned decision context.

**Candidate owners:** `app/api/rules/reorder/preview/route.ts`, rule create/edit/reorder/publish/version routes, `lib/rules-engine.ts`, `lib/rules/fields.ts`, `lib/rules/simulation.ts`, `lib/rules/versioning.ts`, existing version workbench and rule-builder components, their tests, and current flow/run fixtures. Verify the actual evaluator import before freezing the allow-list.

**Work:**

- Add Preview impact to create/edit/reorder. Compare the complete current published ruleset with the complete proposed ruleset, preserving existing priority, first-match, and AND/OR semantics. Replace the existing 30-day-only response safely; maintain established clients or version the change explicitly.
- Use facts available now with a frozen cutoff, policy/draft versions, case/source versions or hashes, timezone, and currency. Expose 7/30/90-day scopes, default 30, at most 500 cases and 50 displayed rows per page. If more than 500 qualify, require a narrower scope before evaluation. Do not silently sample or rerun later pages against changed facts.
- Show evaluated count, changed/unchanged recommendations, insufficient-evidence count, before/after recommendation counts, currency-separated affected exposure, per-case rules/reasons/missing inputs, and canonical evidence links.
- Stop substituting zero for absent evidence/history. If an unknown input could change the winning rule, label insufficient evidence and exclude from definite-change totals. Preserve conclusive results when missing inputs are irrelevant. Monetary rules require proven matching currency; legacy rules without it need explicit owner confirmation before a definite monetary result. Preserve historical records without retroactive currency invention.
- Use the same corrected interpretation in live evaluation. Retain conservative historical compatibility and explicitly test changes to unknown handling; do not add a parallel replay platform.
- Preview performs no provider refresh, publication, decisions, financial/business-audit writes, billing, or tasks. Freeze preview material in the response or an existing permitted transient mechanism; do not introduce a persisted preview/audit product to evade the no-write contract. Publication revalidates policy/source material on the server and cannot trust an unverified client hash.
- Make publication a separate permissioned review. Draft/policy edits or relevant source changes invalidate preview. A no-case initial policy requires explicit acknowledgement that no case-based preview is available. Cancel performs no publication.
- Keep flow draft/preview/published/active/run states and real capabilities truthful. Use populated flow workbench and run-detail fixtures; the runs registry cannot stand in for either. Do not build new execution capabilities merely to satisfy an empty-state illustration.

**Exit proof:** threshold change from £100 to £150 changes exactly the £120 and £130 cases among £80/£120/£130/£180 GBP fixtures; unknown currency is inconclusive; boundary/AND/OR/priority and unsupported operator cases; relevant versus irrelevant missing facts; 500/501 cases; 7/30/90 dates; stable pagination; mixed currency; stale and forged preview rejection; no-case acknowledgement; no business writes or credit changes observed at the actual boundaries; permissioned publish/cancel/read-back in local fixtures; live/preview consistency. Never describe results as savings or historical decision replay.

P08 execution receipt: [implementation, actual checks and remaining gates](../../artifacts/merchant-clarity-implementation/2026-09-06-p08/P08/RECEIPT.md). This bounded implementation does not close predecessor or P12 acceptance.

### P09 Deliver evidenced claim patterns and useful investigations

**Owns:** M12–M14. **Prerequisites:** P02 financial definitions, P04/P05 confirmed items and outcome semantics, and P07 existing Work lifecycle/deduplication.

**Candidate owners:** `lib/reporting/intelligence.ts`, `lib/reporting/namedReportContracts.ts`, `lib/reporting/export.ts`, `lib/reporting/reportRuns.ts`, `components/reports/SuppliedReportsView.tsx`, related reports/records/named-report routes, existing affected-item/shipment/fulfilment/location relationships, existing Work creation/deduplication, and targeted financial/export tests. Only add the minimal auditable origin-location reference where the existing model lacks it.

**Work:**

- Implement real reported-issue, carrier, affected-SKU, and warehouse/fulfilment-location groupings. Use confirmed claimed-item links to canonical order lines; the affected shipment must be evidenced or unambiguous. Do not select the latest parcel by convenience.
- Reuse canonical locations. Warehouse association needs source identity or merchant confirmation supported by evidence; otherwise show Warehouse not established. Extraction confidence and manual object matching never establish responsibility or liability.
- Use a submitted-case cohort, default last 30 days, explicit timezone and fixed as-of timestamp. Show distinct cases, distinct linked orders, known confirmed loss, matched recovery, known final net loss, and unassigned/unvalued cases and amounts separately. State that current known cohort outcomes are not necessarily cash movements within that period.
- Preserve currency separation, financial eligibility, incomplete-query state, unallocated money, and ambiguous groups. Do not duplicate full-case money across multiple items/shipments/warehouses. Label non-additive counts and compute shares against the full selected cohort including unassigned records.
- Show at most three Largest recorded concentrations. Default to distinct-case rank; optionally rank known final net loss within one currency. Recurrence requires at least five cases across three orders, explicitly a display threshold rather than statistical significance. Keep isolated expensive cases in the table and sample sizes beside comparisons; suppress percentages from zero/unavailable baselines.
- Open the exact underlying case set and evidence. Display existing Work before Create investigation; reuse permission, lifecycle, and deduplication. Creation is deliberate, not an automatic side effect of report generation.

**Exit proof:** ambiguous multi-parcel order; unconfirmed SKU; unknown/confirmed warehouse; repeated order numbers; multiple affected items without double allocation; unallocated money retained; mixed currency; failed/partial/capped reads; date boundaries; additive and non-additive counts; 4/5-case and 2/3-order recurrence thresholds; top-three ranking; zero baseline; exact drilldown/export parity; existing-task deduplication and permission denial. No failure rates, defect rates, profitability, causation claims, automatic tasks, provider contact, or new credit charges.

P09 execution receipt (7 September 2026): [bounded implementation, exact checks and remaining gates](../../artifacts/merchant-clarity-implementation/2026-09-07-p09/P09/receipt.md). M12–M14 now have real groupings, explicit unallocated/unknown money, thresholded concentrations, exact supporting cases, existing-investigation navigation, and reviewed-response export checks. The 32 focused tests and isolated desktop component captures do not prove persisted investigation creation, authenticated shell integration, atomic database snapshot consistency or full reference parity. No migration is needed: warehouse origin reuses the existing retained ShipBob shipment/location identity. Local database availability and disk constraints leave exit gates open. P09 remains PARTIAL; P10 and release are not authorised by this receipt.

### P10 Deliver the public explanation and three causal demos

**Owns:** F46–F47, M01–M03. **Prerequisites:** P04/P05 settled resolution semantics, P08/P09 actual preview/report capabilities, and app-wide desktop support. Sample demonstrations remain explicitly fictional even when they reuse pure domain calculations.

**Candidate owners:** `app/(public)/landing/page.tsx`, `app/(public)/demo/page.tsx`, active landing/demo runtime adapters, `components/demo/OperationalCaseDemo.tsx`, `lib/demo/merchantCaseV1.ts`, existing generated Landing/Demo references and generator inputs, safe demo URL mapping, and targeted unit/browser tests. Trace the active render graph first.

**Landing contract:**

| Element | Required content |
|---|---|
| Headline | Resolve customer claims. Track the financial outcome. |
| Supporting copy | Bring orders, conversations and delivery evidence together to investigate damaged deliveries, missing items and repeat refund requests. Compare resolutions, coordinate recovery work and follow the financial outcome in one workspace. |
| Primary action | Explore three sample cases |
| Secondary action | Create a workspace |
| Capability statement | Unauth gathers evidence, records your decision and prepares the next step. Refunds, replacements and claim submissions are completed in your existing tools. |

Use this order: headline and concise product preview; gather evidence → choose resolution → coordinate the next step → follow the money; three selectable examples; recovery and finance; team follow-up, policy preview and claim patterns; truthful source coverage/freshness, capability boundary, and final CTA. Keep detailed resolution comparison in the causal demo rather than repeating it on the landing page. Remove empty repetition and unsupported benchmarks, typical-results, superiority, retention, or setup-time claims. The owner's 7 September landing redesign supersedes warm-neutral presentation for `/landing` only, as recorded in [DESIGN.md](../../DESIGN.md#linear-landing-revision-7-september-2026); the demos retain their existing visual identity. A future-direction sentence cannot describe future AI execution as current capability.

**Demo fixture contract:**

| Case | Immutable fictional facts | Choices | Separate simulated outcome |
|---|---|---|---|
| Legitimate claim | £96 order; matching damage photo; no prior concession; example policy permits refund or same-item replacement; £28 goods plus £5 shipping replacement cost | Refund; replace; request review | Confirm decision and manual handoff first; a separate Simulate refund observed or Simulate replacement dispatched advances the external state |
| Duplicate payout | £128 order; prior confirmed £128 refund; request covers the same items | No additional payout; escalate; goodwill exception with required rationale | £128 duplicate exposure identified; goodwill prepares an additional £128 refund; only a separate simulated observation increases total refunds to £256 |
| Recoverable fulfilment loss | £248 refund request; example packing evidence and warehouse acknowledgement; fictional agreement caps recovery at £150 | Refund and prepare recovery; request review | Refund and recovery advance independently; final example £248 refunded, £150 reconciled recovery, £98 unrecovered refund balance |

The £98 balance is not profit or total economic loss. Do not label the duplicate amount proven savings. Facts, cost basis, terms, parcel weight, location, and identifiers must not drift across screens. Offer only feasible evidence requests.

**State contract:** every case has Inspect → Decide → Outcome. Selection opens review; confirmation records only a simulated merchant choice. Explicit Simulate controls advance external progress. Keep prepared/submitted/approved/received/matched/reconciled recovery separate. Approval cannot increase received money; receipt cannot increase reconciled money. Repeated clicks are idempotent; request review stays unresolved; after decision use Reset this case to choose differently.

Use one versioned scenario authority across landing previews and steps. Keep progress locally by version and case ID; reset only the selected case. URLs accept only recognised case and step identifiers. Back, Forward, refresh, case switching, and legacy step links preserve valid state. Outcome without a decision returns to Decide with explanation; invalid parameters open the legitimate case at Inspect. Completion offers Try the next case and Create a workspace.

**Exit proof:** every choice including goodwill rationale and request-review branch; partial-progress reload; cross-case isolation; reset/version invalidation; invalid and old URLs; unmade decision deep link; repeated events cannot duplicate amounts; immutable facts; exact capability copy/pricing parity; desktop notice; accessible controls at supported sizes. Observe network/storage/business boundaries: no provider requests, database writes, subscriptions, credits, account changes, external messages, or live credentials. Browser-local storage is the only demo-progress persistence.

P10 execution receipt (7 September 2026): [implementation, browser evidence and open gates](../../artifacts/merchant-clarity-implementation/2026-09-07-p10/P10/receipt.md). F46–F47 and M01–M03 have local implementations: the exact landing message and ordered story, one three-case fixture owner, reviewed choices, independent simulated outcomes, validated legacy URLs and browser-local versioned progress. All eight choice branches and local network isolation passed in Chromium. At that receipt, native browser zoom, full original/revised-reference parity and the production build remained unproven; low free disk space prevented a safe production-build attempt. Earlier phase/provider/release gaps remain open. P10 remains PARTIAL and no P11 or release action is authorised by this receipt.

Owner-requested landing revision receipt (7 September 2026, F46–F47/M01): the reachable `/landing` owner now uses the explicitly adopted [Linear landing composition](../../DESIGN.md#linear-landing-revision-7-september-2026). Existing substantive copy, fictional facts, capability boundaries and destinations are retained. Nine labelled artwork spaces mark future assets; no artwork or screenshot files were produced. The manifest records the revised expectation with saved reference parity still planned. This is a bounded landing task, not P10/P12 closure or release approval.

Live browser inspection at 1024×600, 1280×720 and 1440×900 found no horizontal overflow. The native skip link moved keyboard focus into main content, the sample-case destination rendered, and inspected browser logs had no warnings/errors. The independent finish review identified supporting typography differences; these were corrected and confirmed by the implementing agent after the reviewer's browser became unavailable. Automatic approval review rejected screenshot-file creation under the owner's no-artefacts instruction, so this receipt records live observations without asserting archived pixel parity. Native browser zoom and a fresh full demo-branch run remain outside this revision's evidence.

Validation: landing ESLint, scoped `git diff --check`, surface-manifest and authority verification passed; visual-revision contract tests passed 7/7 and demo-fixture/desktop-support tests passed 29/29. The Impeccable detector reported only its Inter warning, retained because Inter is both the explicit reference font and an existing Unauth font. `npm run build` completed successfully, including TypeScript and 109 generated pages. That build compiled before the final inline JSX whitespace adjustment; the final adjustment was separately linted and viewed live. The duplicate standalone typecheck and earlier build were cancelled, not counted as passes.

Source identity: dirty branch `codex/deployment-readiness-20260826`, base `640739df7f7e2d5ce3d2230c56065012c37516a6`; final landing-page SHA-256 `724727f0647a21374063a7df838a6a0664c43be2479575d7988dcf7853292e7f`, stylesheet SHA-256 `9ea93f3454c284cd9ff9c4fa6613d15506762bb759532e4801b37c949f30ac24`. Unrelated pre-existing and concurrent changes were left untouched. No provider, database, deployment or release action was performed.

Light-mode follow-up (7 September 2026, F46–F47/M01; GOV-07, VIS-03/05/09, TEST-01/04): the owner's next instruction replaces the landing palette with the light values registered in `DESIGN.md` and switches both existing marks to graphite. All typography, spacing, content, links and nine deferred artwork positions remain unchanged. Live before/after DOM comparison at 1280×720 confirmed identical text, destinations and heading/artwork geometry. Live inspection at 1024×600 and 1440×900 found no horizontal overflow; both logo assets loaded. Computed text contrast was at least 5.08:1. The independent source/contrast review passed; its browser was unavailable, so rendered verification was completed by the implementing agent. Browser logs contained a development Fast Refresh reload warning and no errors.

Landing ESLint, 7/7 visual-revision contract tests, manifest verification, authority verification, inventory regeneration and scoped diff checks passed. The production build was not rerun for this colour-only follow-up; the prior build receipt is historical evidence. Final SHA-256: page `fcf73aae1f0ac920fe8bde9688ceafd2517f966dc85cbaca8e23952ce191c722`, stylesheet `a0777c302b6e7d1b7f39bcf7214c2959a10e60c98c8d1c9469e0251841be8143`, on the same dirty branch/base recorded above. Artwork, saved screenshots and full reference parity remain deferred; no phase or release gate is closed by this follow-up.

Bento follow-up (8 September 2026, F46–F47/M01; GOV-07, DEMO-02/03, MONEY-01/03/12, DESK-03, VIS-05/07, TEST-01/04/06): the owner-requested landing grids replace all nine deferred artwork positions with server-rendered product compositions. `LandingBento.tsx` and the existing landing CSS module present the case workspace, three claim receipts, resolution costs, a simulated completed recovery path, policy comparison, case-pattern rows and evidence coverage. The adopted light composition, surrounding copy, navigation and destinations remain intact. `GLOBAL_RULES.md`, `ARCHITECTURE.md`, `DESIGN.md`, the existing manifest crosswalk and its Impeccable projection record this bounded revision.

All figures derive from `lib/demo/merchantCaseV1.ts`, with adjacent fictional/simulated provenance. The comparison preserves £96 refund versus £33 replacement (£28 goods plus £5 shipping); duplicate exposure remains £128, not proven savings. The completed illustration uses the fixture's guarded pure transitions and `demoAmounts` for a £248 refund, separate £150 received and reconciled stages, and a £98 unrecovered refund balance. Recovery is deducted once. Canonical `formatMoney` receives integer minor units; unavailable inputs retain an unavailable label. No tenant read, provider action, persistence or new fixture is introduced by the compositions.

Before/after evidence consists of live in-app-browser observations and pre-edit source bytes in `/tmp/unauth-landing-bento-before/`. The final confirmation at 1024×600, 1280×720 and 1440×900 found all nine figures, no page horizontal overflow and no clipped bento descendants. One pattern-panel height clip was corrected by allowing natural panel height. Keyboard traversal showed a visible focus outline and opened the legitimate sample; the duplicate and recoverable sample links and resolution-options link rendered their correct existing demo screens. Inspected tab logs contained no errors. The independent finish review's money-formatting finding was corrected and confirmed at source level. Contrast remains at least 5.08:1 for the reviewed supporting text combinations. The one detector run reported only the explicitly adopted Inter font.

Validation passed: scoped landing ESLint; demo-fixture and desktop-support tests 29/29; desktop-boundary component tests 2/2; visual-revision contract tests 7/7; authority and surface-manifest verification; inventory regeneration and freshness check; scoped diff checks. The final-source production build (`UNAUTH_NEXT_DIST_DIR=.next-landing-bento-build npm run build`) passed compilation, TypeScript and all 109 generated pages; build ID `WoufTlZURbMd7MvDjx1Vw`. Only the temporary generated `tsconfig.json` includes and `next-env.d.ts` imports were returned to their exact pre-build bytes afterward. The older landing end-to-end specification targets the superseded pre-Linear composition and was not represented as current acceptance.

Source identity remains the dirty branch/base recorded above. Final SHA-256: page `7f9d678fdc9e6a968638e2089384d4a63968f369d8e9567caab5d5882760470a`; bento component `0d78c2cbb855ec1c7a7c0e06523a797d61f5f686a6f0f258c9fa27714b6def4c`; stylesheet `63d45533a5b38e804a515a301ffdbcfdb3fae887cd87536ab397f189c7cbb274`. The local preview at `http://localhost:3000/landing` now serves the verified production build; after reload all nine ready figures rendered and inspected browser logs had no errors. A 640px window remains constrained by the existing shared 1024px minimum; native zoom and fresh portable-device rendering are unproved. No saved screenshots or revised reference were produced, so saved-reference parity stays planned. This local landing implementation does not close P10/P12 or any release gate. Unrelated dirty work remains preserved.

Owner rejection and artwork rework (8 September 2026, same bounded F46–F47/M01 task): the owner rejected the first bento set as a whole. Its prior technical checks are not visual acceptance. The replacement removes the uniform nested-panel treatment across all nine positions, using an open layered workspace crop, paper evidence stacks, separate duplicate-refund slips, a branching resolution comparison, an exact recovery waterfall, a policy diff, a five-case threshold plot and a linked evidence diagram. The page's surrounding copy and destinations remain byte-identical. `DESIGN.md` and the existing crosswalk expectation now describe the replacement; no new data owner, theme, provider capability or phase scope is introduced.

The first live inspection covered 1024×600, 1280×720 and 1440×900 without page horizontal overflow. The correction batch keeps the compact hero's original-order amount clear of the foreground panel, separates the overlapping duplicate amounts, removes a case identifier from an order-identifier position and changes the pattern caption to say the sample is too small to establish recurrence. A fresh independent reviewer inspected all nine replacement figures at those three sizes and the live Linear hero, geometric figures and intake scene: disposition **SHIP at the bounded local visual/source scope**, with no further material fixes. All seven artwork links received visible keyboard focus; Enter on Review your options reached the canonical legitimate/decide demo. The review confirmed both duplicate amounts, the waterfall arithmetic, adjacent fictional provenance, explicit missing evidence and at least 5.08:1 supporting-text contrast. Inspected review-tab logs had no warnings/errors. No saved screenshots were produced.

Rework validation passed: scoped landing ESLint, demo-fixture tests 23/23, visual-revision contract tests 7/7, manifest verification, inventory regeneration, authority verification and scoped diff checks. The final-source production build passed compilation, TypeScript and 109 generated pages, build ID `TdmCVZio5Jf6iS0yUL2eO`. Final component SHA-256 `b2b79bb8b26c89cdc09c6bf507f4e318a5a194a534c368a52a1009885834aeb0`; CSS `0d26f273aa93d3ea51646753248e5a526bc38691ae334e23133048b75c56178f`; page bytes and hash remain unchanged from the prior receipt. The existing local preview now serves this production build. Generated TypeScript includes/imports were restored to their exact pre-build bytes. The independent rendered matrix used the development server; production proof is the completed build and bounded reload, not a second full matrix. The same shared 1024px minimum, native-zoom gap and deferred saved-reference boundary remain. Review disposition is not owner aesthetic acceptance, full-app acceptance or release approval; no previous phase gate is promoted.

Landing content revision (12 September 2026, F46–F47/M01; DEMO-01–06, PROD-01/03/05, TRUTH-01/03/04/07, MONEY-03/09/12, SOURCE-01–08, POL-03–06, REPORT-01–03, DESK-01–06, VIS-05–10): the owner authorised the bounded content and hierarchy revision in [LANDING_CONTENT_IMPLEMENTATION.md](LANDING_CONTENT_IMPLEMENTATION.md). The reachable page now leads with customer claims and financial outcomes, places the four-step workflow before detailed examples, removes repeated landing-only preview and comparison prose while retaining detailed comparison in `/demo`, and adds concise explanations for team follow-up, recovery, reconciliation, policy review, reporting and source fit. Existing fixture facts, simulated stages, fictional provenance, money labels, supervised manual-handoff boundary, destinations, light Linear composition and desktop policy remain unchanged. No new public capability, provider action, pricing term, backend path or demo state was introduced.

13 September owner positioning correction supersedes that generic headline and the later human-only gate wording: the gate is the entry point for intended human and AI claim workflows, followed by decision/override accountability, evidenced responsibility, recovery and financial proof. GLOBAL_RULES.md PROD-07 and PRODUCT.md record the distinction between this purpose, public agent connection availability and Unauth's unchanged external execution boundary. The existing landing implementation record owns the revised copy and bounded verification; P10 status is unchanged.

Current local evidence: scoped landing ESLint, `npm run typecheck`, `npm run verify:surface-manifest`, `NODE_OPTIONS=--max-old-space-size=8192 npx jest tests/unit/demoFixture.test.ts tests/unit/desktopSupport.test.ts --runInBand` (29/29), production build (`UNAUTH_NEXT_DIST_DIR=.next-landing-content-build npm run build`, 109 generated pages) and one Impeccable detector run passed. Live in-app-browser review at the default 1280×720 view confirmed the new hero, early workflow, three case links, recovery/finance section, wider operations copy, source coverage and closing actions; inspected AX text showed one H1 and no duplicate comparison section. The authority check remains blocked by the pre-existing `.impeccable/design.json` projection drift; it was not repaired incidentally. The historical landing test still targets the superseded pre-Linear composition and was not counted. A fresh 1024/1440 matrix, 200% zoom, native screen-reader checks and saved-reference parity remain open; P10 remains PARTIAL and no release gate is closed.

Hero product-capture follow-up (13 September 2026, same bounded P10 scope): the owner replaced the main hero bento with a fresh authenticated 3420×1920 capture of the Asterlane Overview. The capture uses the isolated fictional screenshot account, contains no credentials or browser chrome, remains uncropped, and carries an adjacent `Fictional staging data · GBP` label. Lower landing illustrations and demo behaviour are unchanged. Scoped landing ESLint, high-memory typecheck, surface-manifest verification, the Impeccable detector, visual-revision contract tests 7/7 and the production build passed; build ID `oUSkQRJc38uT1kzg7hu4C`, 109 generated pages. Rendered 1024×720 and 1440×900 checks showed the complete responsive frame with no horizontal overflow. Native screen-reader, 200% zoom and saved-reference parity remain open; P10 stays PARTIAL and no release gate is closed.

The owner then requested Linear hero placement parity. Live Linear measurement at 1440×900 recorded an artwork wrapper at y=526px and a centered 1320px product frame with a 60px side inset. The landing CSS now adopts that outer geometry while preserving the uncropped Asterlane capture. Local browser checks at 1024×720, 1280×720 and 1440×900 passed with no horizontal overflow; this CSS-only follow-up does not alter the P10 verdict or the earlier production-build receipt.

The owner then requested full first-viewport alignment. The headline now shares Linear's x=78px position, supporting copy its x=80px position, and the header shares the frame's x=60px edge with the same 32px navigation rhythm, divider and compact sign-up action. Accurate Unauth routes and section anchors remain behind the Linear-like labels. Browser checks at 1024×720, 1280×720, 1440×900 and the narrow desktop boundary passed without horizontal or header-link overflow; the Asterlane capture, caption, accessibility labels and lower landing story remain unchanged.

The owner-approved artefact hierarchy reserves the complete authenticated Overview for the hero, uses a focused real case-detail crop to demonstrate the shared human/AI evidence gate, and varies the remaining proof through smaller fixture compositions, a shallow recovery board, an unequal policy/reporting pair and an open evidence assembly. [LANDING_CONTENT_IMPLEMENTATION.md](LANDING_CONTENT_IMPLEMENTATION.md) owns the bounded implementation and truth limits. This changes presentation only; public AI-agent connectivity, provider execution, recovery eligibility and release status remain unchanged.

### P11 Align account security notifications and governance

**Owns:** F39–F42, F44–F45. Completes supporting-surface integration after shared UI and truth fixes.

**Candidate owners:** actual account/team/platform/notification/API/audit/privacy/agreement/billing settings owners under `app/(app)/settings/` and their components, `lib/notifications/kinds.ts`, permission/role owners as read authority, notification/digest projections, contextual Help and legal-facing product copy, existing mutation routes, and scoped acceptance fixtures/tests. No new legal policy, two-factor platform, email delivery system, or provider capability is implicit.

**Work:**

- Present actual two-factor requirement, enrolment, enforcement, unsupported, and unavailable states and supported next steps. Verify the enforcement contract separately from appearance; remove unsupported promises rather than inventing enrolment.
- Make monthly/yearly order-volume units consistent on load/save. Explicitly migrate a proven unit mapping; require clear correction for ambiguous legacy values. Keep loss-concern/queue-order effects only if implemented and behaviourally evidenced.
- Improve notifications with subject, change, urgency, amount formatting, and useful destination. Keep preview, scheduled, sent, and delivery-unavailable distinct. Notification preferences describe the current account and actual future-event effects.
- Apply audit filters and timeframe to summaries, actors, counts, and rows. Distinguish request from completed operation and preserve unavailable identity rather than reference names.
- Separate subject lookup/review from workspace deletion. Keep unsupported preview blocking destruction. Preserve ownership, API-key reveal/revoke, invite, erasure and deletion permissions, confirmation semantics, cancellation, and audit history. Agreement uploads stay candidates until the existing review actually approves them.
- Align Help and all public/legal-facing capability claims to current plan names and permissions. Link reconciliation matching to matching guidance; distinguish Enterprise display name from legacy internal identifiers. Do not invent compliance approval, retention duration, or working delivery/API capability.

**Exit proof:** unit roundtrip/ambiguous legacy correction; actual preference save/error; known/unavailable security states; canonical owner/admin/analyst/viewer and applicable delegated permission fixtures; API reveal-once/revocation where supported; audit period and actor scope; exact subject/workspace distinction; unavailable privacy preview blocks; notification navigation/formatting/channel truth; contextual help destinations; cancellation and persisted results with exact local cleanup. No real invitations, emails, billing changes, erasure, policy approvals, or workspace deletion.

P11 execution receipt (7 September 2026): [changes, local evidence and open gates](../../artifacts/merchant-clarity-implementation/2026-09-07-p11/P11/receipt.md). No predecessor gate, provider approval or release status is promoted by this bounded implementation.

## 9 P12 Complete app-wide acceptance

The detailed [UI/UX readiness closure programme](#91-uiux-readiness-closure-programme) defines eight planned work packages and the complete requirement crosswalk. Documentation adoption does not change the current PARTIAL verdict.

UI/UX readiness follow-up, 7 September 2026: **PARTIAL**. The [current audit receipt](../../artifacts/merchant-clarity-implementation/2026-09-07-uiux-readiness/P12/receipt.md) extends the existing manifest to 253 scenarios and records entry form activation, label/error associations, recovery-session timing, rejected-request recovery, partial session-revocation feedback, the Enterprise signup CTA correction, and shared legal-table semantics. All eight browser-local demo decision branches were exercised. Bounded component and independent source review do not close authenticated persistence, full final-build merchant journeys, the browser/accessibility matrix, performance budgets, or complete original/revised-reference parity. The new ledger retains every scenario and requirement with explicit remaining dispositions; no phase or release gate is promoted by this follow-up.

**Entry:** P00–P11 exit receipts exist. Every finding and new workflow has implementation evidence; no unresolved P1 is concealed as future polish. Fresh acceptance must evaluate the final build and current manifest, including added scenarios.

**Candidate owners:** existing acceptance harnesses, fixture guards, scenario/state injectors, visual/reference verifiers, test suites, `lib/surfaces/manifest.ts`, generated `docs/page-inventory.md`, this plan's status, and current release-evidence documents. Product fixes discovered here must be attributed to their owning phase and followed by affected regression checks. Do not mask failures in the harness.

**Required coverage:**

- All page modules, stable surfaces, scenarios, aliases/root redirect, overlays, state boundaries, role variants, and runtime-discovered controls. Include populated flow workbench, flow run detail, import job and error download, dispute detail, signed-out login, reset submit/error/expiry, safe auth return, and the four route adapters the audit did not finish.
- Public/entry/onboarding and merchant desktop paths at 1024/1280/1440 widths and short heights; unsupported phone/tablet portrait/landscape notices; long text, 8/25/larger source rows, zoom, reduced motion, keyboard, accessible reading order and chart alternatives. Mobile notice coverage does not become a mobile-workflow pass.
- Loading, verified empty, no-results, unavailable, stale, partial, denied, missing-record, error, pending, success, retry, Back, refresh, direct URL, and multi-tab states. A populated screenshot does not cover them.
- All new decision, replacement, demo, preview, reporting, Work, onboarding, and commercial contracts. Mutations need actual persistent and audit read-back, concurrency/idempotency where relevant, no prohibited side effects, and exact cleanup.
- Source-reference comparison for all 79 original shipping references and four behavioural references plus registered revisions/new states. Use equivalent deterministic inputs. Changed baselines require their recorded reason; unaffected references retain parity. No remnant-only, count-only, source-only, or representative-page acceptance.

**Checks available at preparation:** verify the commands and safety contracts again before running. Local browser/mutation scripts may require disposable fixtures, allowlisted loopback origins and a particular build. Do not invoke them against a remote environment by changing a guard.

| Check | Existing entry point | When |
|---|---|---|
| Owner map and generated projections | `npm run verify:authority` | After authority changes and at final acceptance |
| Surfaces and aliases | `npm run verify:surface-manifest` | After coverage changes and at final acceptance |
| Merchant claims | `npm run verify:merchant-copy` | After public or operational copy changes |
| Generated supplied source | `npm run verify:supplied-visual-pages` | After generator/reference changes |
| Reference/runtime parity | `npm run verify:full-app-visual-cutover` | With the required fresh captures and registered revisions |
| Types and lint | `npm run typecheck`, `npm run lint`; `typecheck:scripts` / `typecheck:e2e` when affected | Appropriate phase checks and final gate |
| Unit/integration tests | Existing Jest scripts and scoped tests from `package.json` | Select meaningful changed-domain tests; full applicable suite at final gate |
| Production build | `npm run build:acceptance` for guarded local acceptance; `npm run build` as required by the release contract | Final source; keep build identity in receipts |
| Shared/route/workflow/settings/entry browser suites | Existing `test:full-app-…:local` commands in `package.json` | Use domain suites during phases; full manifest-derived coverage for P12 |
| Remaining fixture closure | `npm run test:remaining-closure:local` | Reuse verified methods as applicable; old queue coverage is not the new plan's full coverage |
| Release browser | `npm run test:release-browser:local` | Final exact local build under its guard |

Run expensive broad checks once on the final coherent source after focused fixes. Repeat only when new changes or unresolved failures require it. Existing tests encoding the superseded mobile or frozen-example contract must be deliberately updated under the recorded authority changes, with replacement assertions; do not simply delete them.

**Independent review:** obtain a fresh reviewer/context after implementation, with access to the source requirements, current build and evidence. Review truth/behaviour and visual/interaction quality. The reviewer must inspect actual screens, cross-surface definitions, and failure/consequence paths; a rewritten implementation summary is not independent review. Preserve defects and their dispositions. The interrupted old A/B work cannot satisfy this gate.

**Completion gate:**

- Every F01–F48, C001–C180, M01–M18, and added manifest scenario has current evidence and a clear disposition. No unchecked required item is silently ignored.
- All P1s are resolved. Required functional, truth, security, accessibility-within-recorded-exceptions, and new-workflow gates pass. Remaining P2/P3 work requires an explicit owner-approved scope exclusion with its impact; it is not counted as a pass. Without that exclusion the initiative remains partial.
- No competing active authority/theme/renderer, hidden provider execution, false financial stage, missing tenant check, unexplained test failure, or uncleaned fixture remains.
- Report local behavioural acceptance and visual acceptance separately from provider proof, deployment readiness, and production approval. Read current release-gate owners; do not overwrite outstanding external evidence with local PASS.

**Stop after the report.** This plan does not itself authorise commit, push, live-provider operations, remote migration, deployment, or release approval.

### 9.1 UI/UX readiness closure programme

#### 9 September 2026 forensic interaction audit handoff

The owner requested a comprehensive execution handoff after reporting clipped,
unscrollable Cases content and unused drawer space after dismissal. The
[forensic audit runbook](UI_FORENSIC_AUDIT_RUNBOOK.md) supplies detailed manual
recipes and evidence requirements for this existing P12 closure programme. It
is subordinate execution guidance, not a second route inventory, product
authority, completed audit, or permission to begin runtime changes in the
planning task. Its execution prompt scopes a later audit and bounded repair
run. Existing P12 gates and the PARTIAL verdict remain unchanged.

Adopted for documentation: 7 September 2026. **Programme status: IN PROGRESS; app verdict remains PARTIAL.** P12-C01 through P12-C08 are work packages within P12, not additional delivery phases. Original P00–P12 domain ownership and predecessor gates remain controlling. This section turns the latest audit's unresolved obligations into executable closure work; adopting it does not start runtime implementation or mark an acceptance box complete.

#### Current evidence baseline

Autonomous continuation, 7 September 2026: **local environment recovered;
C01–C07 have additional bounded evidence; C08 remains open; app verdict PARTIAL**.
The [autonomous closure receipt](../../artifacts/merchant-clarity-implementation/2026-09-07-autonomous-closure/P12/receipt.md)
records scoped customer-history/financial-copy repairs, exact hash-bound copy
reference dispositions, final build, full lint/typecheck and 3,298 passing Jest
tests. Fresh local six-persona sessions, tenant denials, notification database
read-back, recovery password update, captured local mail, 59 redirect rules and
all eight fictional demo branches were exercised. All run-owned workspaces and
users were removed; 153 original public-table snapshots were restored exactly.
The [current ledger](../../artifacts/merchant-clarity-implementation/2026-09-07-autonomous-closure/P12/ledger/acceptance-ledger.json)
retains 246 requirements and 253 scenarios, with bounded observations marked
PARTIAL. Full visual parity still fails; complete domain-action, browser/AT and
independent acceptance remain open. Local recovery-token proof does not prove
the email-link round trip or release/provider/security/legal readiness.

The following earlier continuation is preserved as historical evidence:

Execution continuation, 7 September 2026: **C01 BLOCKED; C02 PARTIAL**.
The [closure receipt](../../artifacts/merchant-clarity-implementation/2026-09-07-closure/P12/receipt.md)
records current local container filesystem errors, customer lifecycle/order-value
label corrections, Overview/settings unit wording, 15 passing focused tests and
isolated customer before/after renders. The copy scan retains 15 unresolved
matches without suppression. Six-persona authenticated fixtures, complete C02
dispositions and C03–C08 acceptance remain open. This continuation does not
promote a phase or release verdict.

Use the [latest audit receipt](../../artifacts/merchant-clarity-implementation/2026-09-07-uiux-readiness/P12/receipt.md), [complete acceptance ledger](../../artifacts/merchant-clarity-implementation/2026-09-07-uiux-readiness/P12/acceptance-ledger.json), [findings](../../artifacts/merchant-clarity-implementation/2026-09-07-uiux-readiness/P12/findings.json), [final checks](../../artifacts/merchant-clarity-implementation/2026-09-07-uiux-readiness/P12/final-checks.json), and [production observations](../../artifacts/merchant-clarity-implementation/2026-09-07-uiux-readiness/P12/production-observations.json). Preserve these dated receipts; generate a new run instead of overwriting their evidence.

| Baseline item | Verified scope and remaining limit |
|---|---|
| Inventory | 65 page modules, 120 surface owners, 253 scenarios, 246 requirements (48 F, 18 M, 180 C), 55 aliases plus root redirect. Counts are a snapshot, not a ceiling. |
| Rendered audit | Nine public pages and incomplete onboarding observed; no complete scenario or requirement acceptance. Four standard roles and two delegated personas remain unverified as a matrix. |
| UIUX-001–007 | Implemented with bounded proof; retain the fixes and extend verification. No automatic rewrite. |
| ENV-001 | Development Overview was blank; final-build session reached incomplete onboarding. Neither observation proves a particular backend fault. Disposable backing services and a populated role fixture were not established. |
| Final build | `I89HQ_MHg0a4eJVc_SUbt` passed; build-time runtime fingerprint `25e6d535d56e910a4d8abf3810193dcf0e9f639d1f985f110896851d62028ef2`. Public checks only. Saved build configuration differs from post-cleanup configuration only by generated isolated type includes; do not reuse this as a fresh authenticated acceptance build. |
| Tests | 21 final focused tests and changed-owner lint passed. Full Jest had two timeouts; both unchanged suites passed isolated reruns. Full-tree lint was interrupted and remains unverified. |
| Copy/visual gates | Twenty copy-check matches are investigation candidates, not twenty verified UI defects. Complete rendered-reference verification failed; source counts and generated-source checks do not close it. |
| Completion | No owner-approved exclusions. Performance, full browser/accessibility coverage and independent full-app acceptance remain open. |

#### Execution and dependency contract

- Apply section 5 to every package. Before edits, freeze exact route/component/loader/handler/storage/generator/test paths in the new package receipt after tracing the actual render and data path. Candidate owners below are discovery boundaries, not permission to edit whole directories. Record any adjacent addition with its finding, requirement and global-rule IDs before touching it.
- Record implementation status separately from verification verdict and evidence limitations. A bounded test PASS does not promote a scenario or requirement. Preserve `partial`, `blocked` and `untested` distinctions in ledger verdicts; display them explicitly rather than reducing every incomplete result to a defect. Exclusions identify the owner, exact scope, reason and date; they never count as passes.
- Order: C01 establishes baseline and fixture safety; C02 and public/component portions of C03/C05/C06 can proceed independently. Authenticated C03/C04/C05/C06 and measured C07 depend on C01. C04 proceeds through existing domain dependencies: source/identity and money truth before dependent decisions, recovery and reports; preserve P05 compatibility. C08 depends on closure of C01–C07 and every applicable predecessor gate. Do not infer multi-agent execution or concurrent edits from this dependency graph.
- A blocked environment stops dependent mutations, not independent inspection. Do not replace a guard, use hosted accounts, weaken a test, or seed an existing merchant to manufacture a pass. No new public API, price/entitlement policy, provider capability, design system or schema migration is commissioned by this documentation task. Necessary future integration/schema work must be separately scoped to an existing domain contract; absent capability remains a dependency.
- Every package produces: exact source/build/environment identity; finding/requirement/scenario IDs; fixture pre-state; expected and observed results; before/after screenshots and interaction evidence; command exit codes; persistence/audit proof where applicable; cleanup and read-back; remaining IDs; and a bounded exit verdict. Use a new dated directory under `artifacts/merchant-clarity-implementation/<run-id>/P12/`, with package subdirectories. This evidence is not a second execution authority.

#### P12-C01 — Environment and evidence integrity

**Problem/journey:** ENV-001 blocks reliable entry into populated merchant work and consequential-action proof. **Owner:** P00 environment/baseline, P03 session/navigation and P06 setup; P12 integrates. **Rules:** SAFE-01/04/05/06, SEC-01/03/06, TEST-02/03/06/08. **Coverage:** M17, C172/C176 and every fixture-dependent scenario; entry-keyboard-and-request-resilience and recovery-session-lifecycle retain their local-only limits.

**Candidate owners:** `scripts/acceptance/local-runtime.mjs`, existing local build/start/release/role runners and preparation/cleanup scripts, environment contract, authentication/onboarding owners only if a reproducible defect is found.

**Work and fixtures:** Inventory the actual local runtime, database, storage and mail-capture endpoints without exposing credentials. Prove both app origin and backing services are disposable and not an SSH-forwarded hosted service. Reuse existing guard validation and known local fixtures; prepare separate owner/admin/analyst/viewer and finance/support delegated personas, plus another tenant for denial checks. Retain purpose-created identities, pre-state hashes, required schema compatibility and synthetic populated/first-use data. Diagnose blank Overview versus incomplete onboarding using request/session/route evidence before changing code. Use local mail capture for recovery/invitation flows, local storage for packs/uploads and disabled external dispatch; never connect a real source. If local schema is insufficient, record exact missing migration/dependency rather than applying a remote migration or declaring frontend success.

**Verification/cleanup/exit:** Use command groups V1/V3 below. Establish one fresh authenticated production-build session per required role/persona, confirm actual destination content and permitted data, and exercise cross-tenant denial. Prove fixture cleanup targets only run-owned data and compare post-cleanup state. Exit requires verified isolated endpoints, reproducible populated and first-use access, all six persona fixtures, a redacted environment receipt and tested cleanup. Environmental/tool denial stays BLOCKED with exact evidence, not a product-defect diagnosis.

#### P12-C02 — Copy and commercial truth

**Problem/journey:** Copy scan failures and inconsistent wording can mislead merchants about records, units, capability or commercial outcomes. **Owner:** P01 commercial/runtime truth, P06 imports/sources, P10 public story, P11 settings/help/legal-facing claims. **Rules:** GOV-05/06/09, TRUTH-01–05, MONEY-01/03/12, BILL-01–05, UX-11, VIS-05/07/10. **Coverage:** UIUX-001; F02/F03/F04/F17/F35/F47; M01/M16; C151–153/C162 and crosswalk rows below. Scenarios include pricing, create-account, billing review, customer-profile, overview-dashboard, imports and settings consumers selected from their manifest mappings.

**Candidate owners:** `lib/billing/plans.ts`, `CustomerProfilePageView`, `ExactDashboardOverview`, `ImportsVisualClient`, `PlatformSettingsClient`, their live adapters, `scripts/verify-merchant-copy.mjs`, supplied-source generator and registered visual revisions.

**Work:** Resolve all twenty saved matches individually: four customer-profile history/navigation matches, one Overview unit match, three import-unit matches, one platform-setting unit match, and eleven generated-reference matches (command palette, customer detail, evidence package, Overview and source repair). For each retain location, reachable consumer, rendered state, underlying contract, disposition and evidence. Use Cases terminology where it describes the actual case registry; retain provider/legal claim terminology where correct. Replace internal units in ordinary merchant inputs only with correct boundary conversion and regression checks; preserve explicit minor-unit CSV/API contracts and examples. Do not blindly replace strings in generated reference files. Correct adopted source or existing runtime binding as appropriate; any checker exception must be exact, justified by unreachable/reference-only evidence and protected by positive/negative checks. No broad directory suppression. Compare actual billable events, plan requests versus activation and unavailable entitlements across pricing, signup, onboarding, billing, help and legal-facing statements; do not invent legal approval.

**Verification/cleanup/exit:** V1/V2, then all affected live consumers using C01 fixtures and equivalent visual inputs. Each of the twenty candidates has a reviewed disposition; no reachable unsupported claim remains and copy verification passes without weakened coverage. UIUX-001 remains a regression check. Preserve no-write pricing reads, reset browser state and clean only scoped fixture changes. Unresolved legal/product decisions block only their exact dependent claims and remain explicit.

#### P12-C03 — Entry, account and shared interaction

**Problem/journey:** Bounded entry/session/table repairs need real integration and assistive-technology coverage; shared controls must work across consumers. **Owner:** P03 shared desktop/entry and P11 account/security, with P01 reset/commercial truth. **Rules:** SEC-01–06/08, ACT-02–07, UX-01/03/04/06/07/08, TEST-01/02/05. **Coverage:** UIUX-002–007; F15/F16/F18/F22/F23/F36–40/F44; C145–150/C165–167/C175; entry-keyboard-and-request-resilience, recovery-session-lifecycle and all manifest-owned account/modal states.

**Candidate owners:** Existing signup/login/reset/reset-update adapters, `bindSuppliedTree`, `SuppliedRouteSurface`, authenticated shell/account menu, shared dialog/drawer/focus owners and account/security integration handlers. Extend existing owners; do not replace the visual renderer.

**Work:** Retest Enter and mouse submission, visible labels, field-error associations, pending guards, rejection and uncertain outcomes on all four entry forms. Test invalid/expired recovery, deadline after successful lookup, newer auth event versus stale lookup, successful update surviving later events, navigation from invalid/success form branches without another update, and password success with failed other-session revocation. Preserve enumeration protection and safe returns. Verify announced errors/status/pending results, focus containment/restoration, Escape/Cancel, guarded in-flight dismissal, menus/palette and background isolation. Verify all three legal tables with a screen reader as well as DOM roles. Complete actual identity/workspace, settings units, supported appearance and MFA-state checks; source code assertions do not establish live security posture.

**Verification/cleanup/exit:** V2 entry/legal regression suites, V3 entry/auth/account suites and C06 physical checks. Credential changes requiring user handoff must follow the active tool rules; record that dependency rather than bypass it. Local mail/session fixtures are run-owned and cleaned with persisted read-back. Exit requires each repaired finding's affected consumers and state matrix passing, plus no shared focus/activation regression; partial session success remains distinct from failed revocation.

#### P12-C04 — Merchant workflows and persistence

**Problem/journey:** Most populated merchant state and persistent-action contracts remain unverified, not proven broken. **Owner:** P02/P04–P11 retain their exact domain contracts. **Rules:** TRUTH-01–09, MONEY-01–12, ACT-01–08, RES-01–06, POL-01–08, REPORT-01–03 and remaining REPORT rules, SOURCE/OPS/SEC/DEMO rules applicable to each existing owner. **Coverage:** M02–15 and domain F/C rows in the crosswalk; use every associated manifest scenario, not only the examples below.

| Domain and existing owner boundary | Required journey and failure verification |
|---|---|
| Cases, customers, evidence, connected records and disputes — P04 | Registry → bounded preview → detail → source record → compare → review/cancel/record; repeated order numbers, sequential customers, missing records, evidence gaps, current versions, permissions and tenant identity. Include populated dispute detail and file-claim/evidence-pack states. |
| Manual replacement — P05 | Confirmed original lines/SKU/quantity/cost budget → reviewed authorisation → manual handoff → merchant-confirmed/source-observed outcome. Preserve old approvals, limits, replay/concurrency protection and no automatic order creation. |
| Loss, recovery, reconciliation and Work — P02/P07 | Currency/period-scoped supporting records → next task → prepared pack → separately recorded provider outcome/receipt/match/reconciliation. Include partial approvals, reversals, write-off, close blockers, cancelled/completed work, page/stage scope and exact ledger bridge. |
| Sources, imports and onboarding — P06 | Required/missing/failed/running/empty/populated setup states → reviewed local import → job/error download → retained records → correct next action. Verify repair/disconnect cancellation and retained history with fixtures; provider simulation is not real integration proof. |
| Rules and flows — P08 | No-op edit, legacy/unknown operators and currencies, current-evidence preview, caps/unknowns, separately reviewed publication, no-case acknowledgement, workbench and run detail. Preview must cause no business writes, provider refresh or charges. |
| Reports — P09 | Confirmed SKU/shipment/warehouse relationships → cohort chart/table → supporting cases → export/deliberate Work. Verify unknown/unallocated money, non-additive counts, caps, thresholds and permissions. |
| Public demos — P10 | All eight choices on the final build; separate decision/outcome stages, recovery-before-refund where allowed, invalid/deep URLs, Back/refresh/multiple tabs, rationale guards and case-local reset. Prove network/business-write isolation. |
| Account/governance — P11 | Notification preference persistence and actual effects, inbox targets, filtered audit evidence, agreement candidates, subject privacy boundaries, contextual help and unavailable/denied states. Retain real-operation prohibitions. |

**Candidate owners:** The registered domain modules in ARCHITECTURE and candidate owners in sections 6–8, plus their reachable UI/API/persistence/test consumers. Select exact files per reproduced finding; do not build missing backend features merely to satisfy a reference.

**Fixtures/verification/cleanup/exit:** C01 is mandatory for authenticated/persistent paths. Each domain requires first-use/populated/long-data/partial/stale/denied/missing/error fixtures and V2/V3 domain checks. For every consequential action verify target/scope/version, cancel with no write, permission/tenant rejection, stale state, retries/idempotency, relevant concurrency, truthful partial failure, persisted result and audit, then exact cleanup. Exit per domain requires the complete mapped action contract; a successful fixture screen or simulated provider response alone cannot pass it. Reopen only reproduced regressions in existing bounded PASS work.

#### P12-C05 — Complete navigation and state coverage

**Problem/journey:** Route counts and selected screenshots leave unvisited states, overlays and indirect consumers. **Owner:** P03 navigation, each domain owner, P12 inventory. **Rules:** TRUTH-05, UX-01–06, SEC-01/02, DESK-06, TEST-03/04/06/07. **Coverage:** F13/F26/F30/F31/F37/F38/F45, C019–027/C046–054/C174/C177 and all 253 baseline scenarios, 55 aliases and root redirect.

**Candidate owners:** `lib/surfaces/manifest.ts`, canonical routes/aliases and existing acceptance ledger/fixture/state injectors; actual route owners only for reproduced defects.

**Work:** Project every manifest scenario into its route, state, overlay, role, data and viewport obligations. Walk each visible control and actual destination; verify filter/sort/pagination/selection scope, row versus nested control activation, breadcrumbs, safe aliases, direct URLs, Back/Forward, refresh and multiple tabs. Include four route adapters, all 38 overlay scenarios and unavailable/loading/error/not-found boundaries. A URL change without correct content is failure. Add newly discovered controls to the current manifest with domain/requirement ownership, never a separate catalogue.

**Verification/cleanup/exit:** V1 inventory and V3 aliases/shared states plus physical navigation. C01 required for authenticated scopes; public traversal may proceed earlier. Restore URL/scroll/session fixture state and verify no business mutation from navigation/cancel. Exit requires every current scenario and redirect accounted for with linked evidence or an explicit owner-approved exclusion; no orphaned route, state or discovered control. C06/C08 still own full visual and final acceptance.

#### P12-C06 — Desktop, accessibility and visual acceptance

**Problem/journey:** Public samples and semantic checks do not establish supported desktop, assistive-technology or reference compliance. **Owner:** P03 visual/shared desktop, domain owners for affected consumers, P12 parity. **Rules:** DESK-01–06, VIS-01–10, UX-04/06/07/09/10, TEST-04/05. **Coverage:** F01/F19/F20/F21/F22/F36, C001–009/C163–171; desktop-device-and-zoom-matrix and every manifest visual scenario.

**Candidate owners:** Existing desktop boundary, shared shell/tables/dialogs/drawers/charts, actual domain adapters, DESIGN registered revisions, source crosswalk and existing reference verifiers.

**Work/fixtures:** Use equivalent deterministic fixtures at 1024×720, 1280×720, 1440×900 and 1024×600/1280×600; add each scenario's declared variants. Exercise long labels, high rows and 8/25/larger source populations. Test native desktop zoom at 200% and 400%, 200% text expansion, keyboard-only journeys, real screen-reader reading/announcements and chart alternatives, reduced motion, focus visibility, target spacing and prescribed contrast. Inherently two-dimensional data may scroll within bounds; magnification must not become a mobile exclusion. Test phone/tablet portrait and wide-landscape desktop notices separately, including safe copy/email-composer return links without actual sending.

Use the supported-browser contract and record actual browser/OS versions. The current Playwright project names all use Desktop Chrome; its `tablet` label and viewport alone do not prove hardware/device classification or another browser engine. Explicitly retain unavailable browser/AT coverage as open. Compare all 79 original shipping references, four behavioural references and registered revisions; preserve original evidence, explain adopted differences and test unaffected regions. No blanket snapshot replacement, new palette/theme or broad contrast waiver.

**Verification/cleanup/exit:** V3 accessibility/device checks, V4 source and rendered parity, physical keyboard/AT traversal. Reset temporary viewport/zoom/motion overrides and close only run-owned tabs. Exit requires every required matrix cell and reference comparison accepted with actual evidence; inherited exceptions remain exact exclusions, not universal accessibility conformance.

#### P12-C07 — Performance and regression stability

**Problem/journey:** Development/CDP stalls were not production timings; two full-suite timeouts and interrupted full-tree lint are unresolved gates. **Owner:** P12 performance/test integration and affected domain owner. **Rules:** ENG-05/06/07, SAFE-06, TEST-01/06/07. **Coverage:** C045/C173/C178 plus timing/resilience obligations for all affected scenarios.

**Candidate owners:** Existing release-performance specification, local production runner/build lifecycle, actual loader/query/client interaction causing a measured regression, and the unchanged shell/onboarding timeout tests if the failure reproduces.

**Work:** Run an identified production build with C01 fixtures, one controlled runner and recorded resource/test conditions. Preserve warmed sidebar p75 <4,000 ms and maximum <8,000 ms. Reuse other established budgets; record measurements without inventing thresholds where none exists. Measure navigation, record/dialog/drawer opening, typing/filter/sort/pagination, chart interaction, long scrolling and save feedback. Separate network/server wait from frontend work; inspect duplicate requests, layout shifts, unbounded loads and delayed feedback. Exercise safe slow/failure/offline, rapid actions, stale responses, session expiry and retry. Stabilise test isolation and fixture readiness rather than increasing timeouts or reducing assertions without demonstrated cause. Avoid concurrent heavyweight builds/lint/suites that contaminate timings.

**Verification/cleanup/exit:** V2 full Jest/full-tree lint and V5 performance; targeted reruns follow changed code or genuine failures, not indefinite repetition. Retain the original timeout failures and isolated rechecks. Exit requires completed lint, reliable full-suite disposition, unchanged performance budgets met and no unresolved interaction regression. Stop only run-owned processes; retain traces and fixture cleanup evidence.

#### P12-C08 — Final integrated acceptance

**Problem/journey:** No complete final-build merchant journey, role/accessibility matrix or independent full-app verdict exists. **Owner:** P12; every original domain remains accountable. **Rules:** TEST-01–08, SAFE-01/04/05/06, REL-01/02/04. **Coverage:** M18, C178–180 and every F/M/C requirement and manifest scenario.

**Candidate owners:** This plan's status/receipts, existing manifest/ledger and evidence verifiers, existing final acceptance harness; runtime owner changes only if a final regression is reproduced and its package is reopened.

**Work:** After C01–C07, freeze runtime files and build-affecting configuration together, including generated type-path behaviour. Record build ID, source fingerprint, manifest/reference/fixture versions and environment; do not run final tests against a stale build or quietly change configuration afterward. Run V1–V5 and complete final-build merchant journeys across all roles/personas. Request fresh independent review of requirements, final source, rendered interactions, persisted results and evidence. Bounded source review is not independent full-app acceptance. Any corrective edit invalidates affected proof: rebuild as needed, rerun affected checks and renew independent review before closure.

**Cleanup/exit:** Verify local fixture/database/storage/mail cleanup and pre-state comparison, restored browser overrides, closed audit tabs, stopped owned servers and preserved unrelated work. Reconcile denominators and every open ID. UI/UX READY requires all required checks passing and no unapproved UI/UX defect; otherwise PARTIAL or NOT READY with exact blockers. Provider/security/legal/deployment/release gates remain separate. Approved exclusions remove only their named scope and are never test passes.

#### Verification command matrix

Commands below are implementation-stage instructions, not commands executed by this document's adoption. Re-read their current guards, flags, fixture targets and output roots before use. Existing runners can prepare data and have historical default evidence directories; choose a fresh supported output root or record/copy only the new invocation's output into the new run without overwriting historical evidence. Never bypass a guard to change the destination.

| Group | Existing commands/entry points | When and evidence required |
|---|---|---|
| V1 authority/inventory | `npm run verify:authority`; `npm run verify:surface-manifest`; `npm run verify:ui-integrity`; `npm run acceptance:map` | First three validate current owners. Ledger generation uses a new `FULL_APP_ACCEPTANCE_ROOT`; compare 246 requirement IDs and all live scenario IDs, preserving existing evidence. Run `generate:page-inventory` only after an authorised manifest change. |
| V2 code/copy | `npm run typecheck`; `npm run lint`; `npm test -- --runInBand`; `npm run verify:merchant-copy` | Complete broad gates at integration; use focused owner tests during repairs. Typecheck may use the existing 8192 MB allowance. Logs need exit codes; interrupted is not passed. |
| V2 repaired regressions | `npm test -- --runInBand tests/components/authSourceStateRemoval.test.tsx tests/components/privacyTableSemantics.test.tsx tests/components/suppliedTextReplacement.test.ts` | Preserve 21-test bounded baseline; extend only for meaningful missing semantics. Follow with rendered and persistent proof where applicable. |
| V3 safe runtime | Existing `build:acceptance`, `start:acceptance`, `test:role-acceptance:local`, `test:release-browser:local`, `test:alias-acceptance` | C01 proof first; alias execution retains its required local guard/environment. Inspect preparation/cleanup side effects. Standard app build alone does not establish isolated backing services. |
| V3 domain suites | Existing `test:full-app-shared-states:local`, `test:full-app-p02-states:local`, `test:full-app-p02-workflows:local`, P03–P06 state/workflow/mutation scripts, `test:full-app-p07-entry:local`, `test:full-app-p07-auth:local`, `test:full-app-file-claim:local`, `test:full-app-root-not-found:local` | Select by actual spec contents and current domain owner. Harness p02/p07 names are historical suite groupings, not authority to advance current P02/P07. Keep source/mail/provider operations local and disposable. |
| V4 visual | `npm run verify:supplied-visual-pages`; `npm run verify:full-app-visual-cutover`; existing guarded reference capture and physical evidence index | Source-generation checks supplement matching-fixture browser/AT checks; current full rendered-parity failure must be closed, not ignored. |
| V5 performance/final | `node scripts/run-local-release-browser.mjs --performance-only`; `npm run build`; existing final acceptance harness after inspecting its safety/fixture contract | Preserve established thresholds, exact source/build identity and measured conditions. A reused build is allowed only with matching verified runtime/configuration/fixture identity. |

#### Requirement and scenario crosswalk

The table below assigns one primary closure package per existing requirement; original delivery phases are retained, not reassigned. All requirements additionally pass C05 inventory reconciliation, C06 applicable visual/accessibility checks, C07 relevant regression/performance gates and C08 final acceptance. Primary ownership never waives another package's domain contract.

Scenario membership is defined exclusively by the existing manifest's requirement mappings and the latest ledger's `scenarioIds`, not a copied route catalogue here. For each row, expand those exact scenario IDs into the new run, retain their actions/states/overlays/roles/viewports and attach this package's evidence. Additionally C05 and C08 cover **every** live manifest scenario, including any scenario with no current requirement mapping; such an orphan blocks closure until the existing manifest is repaired. Newly discovered requirements/scenarios extend this crosswalk and its denominators.

<!-- BEGIN:UIUX-CLOSURE-CROSSWALK -->

| Requirement ID | Primary closure package | Existing delivery phases | Baseline mapped scenarios |
|---|---|---|---|
| `M01` | P12-C02 | P10 | 7 |
| `M02` | P12-C04 | P10 | 7 |
| `M03` | P12-C04 | P10 | 7 |
| `M04` | P12-C04 | P04 | 2 |
| `M05` | P12-C04 | P04 | 2 |
| `M06` | P12-C04 | P05 | 3 |
| `M07` | P12-C04 | P05 | 3 |
| `M08` | P12-C04 | P05 | 3 |
| `M09` | P12-C04 | P08 | 2 |
| `M10` | P12-C04 | P08 | 2 |
| `M11` | P12-C04 | P08 | 2 |
| `M12` | P12-C04 | P09 | 5 |
| `M13` | P12-C04 | P09 | 5 |
| `M14` | P12-C04 | P09 | 5 |
| `M15` | P12-C04 | P06 | 1 |
| `M16` | P12-C02 | P01, P10, P11 | 6 |
| `M17` | P12-C01 | P00, P01, P02, P03, P04, P05, P06, P07, P08, P09, P10, P11, P12 | 253 |
| `M18` | P12-C08 | P00, P01, P02, P03, P04, P05, P06, P07, P08, P09, P10, P11, P12 | 253 |
| `F01` | P12-C06 | P03 | 6 |
| `F02` | P12-C02 | P01 | 19 |
| `F03` | P12-C02 | P01 | 19 |
| `F04` | P12-C02 | P01 | 19 |
| `F05` | P12-C04 | P02 | 6 |
| `F06` | P12-C04 | P02 | 6 |
| `F07` | P12-C04 | P02 | 3 |
| `F08` | P12-C04 | P02 | 3 |
| `F09` | P12-C04 | P02 | 3 |
| `F10` | P12-C04 | P02 | 6 |
| `F11` | P12-C04 | P02 | 6 |
| `F12` | P12-C04 | P01 | 19 |
| `F13` | P12-C05 | P01 | 19 |
| `F14` | P12-C04 | P01 | 19 |
| `F15` | P12-C03 | P01 | 19 |
| `F16` | P12-C03 | P01 | 19 |
| `F17` | P12-C02 | P03 | 10 |
| `F18` | P12-C03 | P03 | 6 |
| `F19` | P12-C06 | P03 | 6 |
| `F20` | P12-C06 | P03 | 7 |
| `F21` | P12-C06 | P03 | 6 |
| `F22` | P12-C03 | P03 | 7 |
| `F23` | P12-C03 | P03 | 3 |
| `F24` | P12-C04 | P07 | 4 |
| `F25` | P12-C04 | P07 | 4 |
| `F26` | P12-C05 | P07 | 6 |
| `F27` | P12-C04 | P07 | 4 |
| `F28` | P12-C04 | P04 | 5 |
| `F29` | P12-C04 | P04 | 10 |
| `F30` | P12-C05 | P04 | 10 |
| `F31` | P12-C05 | P04 | 10 |
| `F32` | P12-C04 | P06 | 8 |
| `F33` | P12-C04 | P06 | 8 |
| `F34` | P12-C04 | P06 | 8 |
| `F35` | P12-C02 | P06 | 8 |
| `F36` | P12-C03 | P03 | 10 |
| `F37` | P12-C05 | P03 | 7 |
| `F38` | P12-C03 | P03 | 7 |
| `F39` | P12-C03 | P11 | 10 |
| `F40` | P12-C03 | P11 | 10 |
| `F41` | P12-C04 | P11 | 16 |
| `F42` | P12-C04 | P11 | 16 |
| `F43` | P12-C04 | P06 | 7 |
| `F44` | P12-C03 | P11 | 16 |
| `F45` | P12-C05 | P11 | 16 |
| `F46` | P12-C04 | P10 | 7 |
| `F47` | P12-C02 | P10 | 7 |
| `F48` | P12-C04 | P07 | 5 |
| `C001` | P12-C06 | P03, P12 | 6 |
| `C002` | P12-C06 | P03, P12 | 6 |
| `C003` | P12-C06 | P03, P12 | 6 |
| `C004` | P12-C06 | P03, P12 | 6 |
| `C005` | P12-C06 | P03, P12 | 6 |
| `C006` | P12-C06 | P03, P12 | 6 |
| `C007` | P12-C06 | P03, P12 | 6 |
| `C008` | P12-C06 | P03, P12 | 6 |
| `C009` | P12-C06 | P03, P12 | 6 |
| `C010` | P12-C04 | P01, P02, P12 | 19 |
| `C011` | P12-C04 | P01, P02, P12 | 19 |
| `C012` | P12-C04 | P01, P02, P12 | 19 |
| `C013` | P12-C04 | P01, P02, P12 | 19 |
| `C014` | P12-C04 | P01, P02, P12 | 19 |
| `C015` | P12-C04 | P01, P02, P12 | 19 |
| `C016` | P12-C04 | P01, P02, P12 | 19 |
| `C017` | P12-C04 | P01, P02, P12 | 19 |
| `C018` | P12-C04 | P01, P02, P12 | 19 |
| `C019` | P12-C05 | P03, P12 | 7 |
| `C020` | P12-C05 | P03, P12 | 7 |
| `C021` | P12-C05 | P03, P12 | 7 |
| `C022` | P12-C05 | P03, P12 | 7 |
| `C023` | P12-C05 | P03, P12 | 7 |
| `C024` | P12-C05 | P03, P12 | 7 |
| `C025` | P12-C05 | P03, P12 | 7 |
| `C026` | P12-C05 | P03, P12 | 7 |
| `C027` | P12-C05 | P03, P12 | 7 |
| `C028` | P12-C04 | P01, P02, P03, P12 | 3 |
| `C029` | P12-C04 | P01, P02, P03, P12 | 3 |
| `C030` | P12-C04 | P01, P02, P03, P12 | 3 |
| `C031` | P12-C04 | P01, P02, P03, P12 | 3 |
| `C032` | P12-C04 | P01, P02, P03, P12 | 3 |
| `C033` | P12-C04 | P01, P02, P03, P12 | 3 |
| `C034` | P12-C04 | P01, P02, P03, P12 | 3 |
| `C035` | P12-C04 | P01, P02, P03, P12 | 3 |
| `C036` | P12-C04 | P01, P02, P03, P12 | 3 |
| `C037` | P12-C04 | P07, P12 | 4 |
| `C038` | P12-C04 | P07, P12 | 4 |
| `C039` | P12-C04 | P07, P12 | 4 |
| `C040` | P12-C04 | P07, P12 | 4 |
| `C041` | P12-C04 | P07, P12 | 4 |
| `C042` | P12-C04 | P07, P12 | 4 |
| `C043` | P12-C04 | P07, P12 | 4 |
| `C044` | P12-C04 | P07, P12 | 4 |
| `C045` | P12-C07 | P07, P12 | 4 |
| `C046` | P12-C05 | P03, P12 | 7 |
| `C047` | P12-C05 | P03, P12 | 7 |
| `C048` | P12-C05 | P03, P12 | 7 |
| `C049` | P12-C05 | P03, P12 | 7 |
| `C050` | P12-C05 | P03, P12 | 7 |
| `C051` | P12-C05 | P03, P12 | 7 |
| `C052` | P12-C05 | P03, P12 | 7 |
| `C053` | P12-C05 | P03, P12 | 7 |
| `C054` | P12-C05 | P03, P12 | 7 |
| `C055` | P12-C04 | P04, P05, P12 | 6 |
| `C056` | P12-C04 | P04, P05, P12 | 6 |
| `C057` | P12-C04 | P04, P05, P12 | 6 |
| `C058` | P12-C04 | P04, P05, P12 | 6 |
| `C059` | P12-C04 | P04, P05, P12 | 6 |
| `C060` | P12-C04 | P04, P05, P12 | 6 |
| `C061` | P12-C04 | P04, P05, P12 | 6 |
| `C062` | P12-C04 | P04, P05, P12 | 6 |
| `C063` | P12-C04 | P04, P05, P12 | 6 |
| `C064` | P12-C04 | P04, P07, P12 | 5 |
| `C065` | P12-C04 | P04, P07, P12 | 5 |
| `C066` | P12-C04 | P04, P07, P12 | 5 |
| `C067` | P12-C04 | P04, P07, P12 | 5 |
| `C068` | P12-C04 | P04, P07, P12 | 5 |
| `C069` | P12-C04 | P04, P07, P12 | 5 |
| `C070` | P12-C04 | P04, P07, P12 | 5 |
| `C071` | P12-C04 | P04, P07, P12 | 5 |
| `C072` | P12-C04 | P04, P07, P12 | 5 |
| `C073` | P12-C04 | P04, P12 | 10 |
| `C074` | P12-C04 | P04, P12 | 10 |
| `C075` | P12-C04 | P04, P12 | 10 |
| `C076` | P12-C04 | P04, P12 | 10 |
| `C077` | P12-C04 | P04, P12 | 10 |
| `C078` | P12-C04 | P04, P12 | 10 |
| `C079` | P12-C04 | P04, P12 | 10 |
| `C080` | P12-C04 | P04, P12 | 10 |
| `C081` | P12-C04 | P04, P12 | 10 |
| `C082` | P12-C04 | P02, P12 | 6 |
| `C083` | P12-C04 | P02, P12 | 6 |
| `C084` | P12-C04 | P02, P12 | 6 |
| `C085` | P12-C04 | P02, P12 | 6 |
| `C086` | P12-C04 | P02, P12 | 6 |
| `C087` | P12-C04 | P02, P12 | 6 |
| `C088` | P12-C04 | P02, P12 | 6 |
| `C089` | P12-C04 | P02, P12 | 6 |
| `C090` | P12-C04 | P02, P12 | 6 |
| `C091` | P12-C04 | P07, P12 | 6 |
| `C092` | P12-C04 | P07, P12 | 6 |
| `C093` | P12-C04 | P07, P12 | 6 |
| `C094` | P12-C04 | P07, P12 | 6 |
| `C095` | P12-C04 | P07, P12 | 6 |
| `C096` | P12-C04 | P07, P12 | 6 |
| `C097` | P12-C04 | P07, P12 | 6 |
| `C098` | P12-C04 | P07, P12 | 6 |
| `C099` | P12-C04 | P07, P12 | 6 |
| `C100` | P12-C04 | P02, P12 | 3 |
| `C101` | P12-C04 | P02, P12 | 3 |
| `C102` | P12-C04 | P02, P12 | 3 |
| `C103` | P12-C04 | P02, P12 | 3 |
| `C104` | P12-C04 | P02, P12 | 3 |
| `C105` | P12-C04 | P02, P12 | 3 |
| `C106` | P12-C04 | P02, P12 | 3 |
| `C107` | P12-C04 | P02, P12 | 3 |
| `C108` | P12-C04 | P02, P12 | 3 |
| `C109` | P12-C04 | P02, P09, P12 | 8 |
| `C110` | P12-C04 | P02, P09, P12 | 8 |
| `C111` | P12-C04 | P02, P09, P12 | 8 |
| `C112` | P12-C04 | P02, P09, P12 | 8 |
| `C113` | P12-C04 | P02, P09, P12 | 8 |
| `C114` | P12-C04 | P02, P09, P12 | 8 |
| `C115` | P12-C04 | P02, P09, P12 | 8 |
| `C116` | P12-C04 | P02, P09, P12 | 8 |
| `C117` | P12-C04 | P02, P09, P12 | 8 |
| `C118` | P12-C04 | P01, P03, P06, P12 | 8 |
| `C119` | P12-C04 | P01, P03, P06, P12 | 8 |
| `C120` | P12-C04 | P01, P03, P06, P12 | 8 |
| `C121` | P12-C04 | P01, P03, P06, P12 | 8 |
| `C122` | P12-C04 | P01, P03, P06, P12 | 8 |
| `C123` | P12-C04 | P01, P03, P06, P12 | 8 |
| `C124` | P12-C04 | P01, P03, P06, P12 | 8 |
| `C125` | P12-C04 | P01, P03, P06, P12 | 8 |
| `C126` | P12-C04 | P01, P03, P06, P12 | 8 |
| `C127` | P12-C04 | P06, P12 | 7 |
| `C128` | P12-C04 | P06, P12 | 7 |
| `C129` | P12-C04 | P06, P12 | 7 |
| `C130` | P12-C04 | P06, P12 | 7 |
| `C131` | P12-C04 | P06, P12 | 7 |
| `C132` | P12-C04 | P06, P12 | 7 |
| `C133` | P12-C04 | P06, P12 | 7 |
| `C134` | P12-C04 | P06, P12 | 7 |
| `C135` | P12-C04 | P06, P12 | 7 |
| `C136` | P12-C04 | P01, P08, P12 | 9 |
| `C137` | P12-C04 | P01, P08, P12 | 9 |
| `C138` | P12-C04 | P01, P08, P12 | 9 |
| `C139` | P12-C04 | P01, P08, P12 | 9 |
| `C140` | P12-C04 | P01, P08, P12 | 9 |
| `C141` | P12-C04 | P01, P08, P12 | 9 |
| `C142` | P12-C04 | P01, P08, P12 | 9 |
| `C143` | P12-C04 | P01, P08, P12 | 9 |
| `C144` | P12-C04 | P01, P08, P12 | 9 |
| `C145` | P12-C03 | P01, P03, P11, P12 | 10 |
| `C146` | P12-C03 | P01, P03, P11, P12 | 10 |
| `C147` | P12-C03 | P01, P03, P11, P12 | 10 |
| `C148` | P12-C03 | P01, P03, P11, P12 | 10 |
| `C149` | P12-C03 | P01, P03, P11, P12 | 10 |
| `C150` | P12-C03 | P01, P03, P11, P12 | 10 |
| `C151` | P12-C02 | P01, P03, P11, P12 | 10 |
| `C152` | P12-C02 | P01, P03, P11, P12 | 10 |
| `C153` | P12-C02 | P01, P03, P11, P12 | 10 |
| `C154` | P12-C04 | P11, P12 | 16 |
| `C155` | P12-C04 | P11, P12 | 16 |
| `C156` | P12-C04 | P11, P12 | 16 |
| `C157` | P12-C04 | P11, P12 | 16 |
| `C158` | P12-C04 | P11, P12 | 16 |
| `C159` | P12-C04 | P11, P12 | 16 |
| `C160` | P12-C04 | P11, P12 | 16 |
| `C161` | P12-C04 | P11, P12 | 16 |
| `C162` | P12-C02 | P11, P12 | 16 |
| `C163` | P12-C06 | P03, P12 | 9 |
| `C164` | P12-C06 | P03, P12 | 9 |
| `C165` | P12-C06 | P03, P12 | 9 |
| `C166` | P12-C06 | P03, P12 | 9 |
| `C167` | P12-C06 | P03, P12 | 9 |
| `C168` | P12-C06 | P03, P12 | 9 |
| `C169` | P12-C06 | P03, P12 | 9 |
| `C170` | P12-C06 | P03, P12 | 9 |
| `C171` | P12-C06 | P03, P12 | 9 |
| `C172` | P12-C01 | P00, P01, P02, P03, P04, P05, P06, P07, P08, P09, P10, P11, P12 | 253 |
| `C173` | P12-C04 | P00, P01, P02, P03, P04, P05, P06, P07, P08, P09, P10, P11, P12 | 253 |
| `C174` | P12-C05 | P00, P01, P02, P03, P04, P05, P06, P07, P08, P09, P10, P11, P12 | 253 |
| `C175` | P12-C03 | P00, P01, P02, P03, P04, P05, P06, P07, P08, P09, P10, P11, P12 | 253 |
| `C176` | P12-C01 | P00, P01, P02, P03, P04, P05, P06, P07, P08, P09, P10, P11, P12 | 253 |
| `C177` | P12-C05 | P00, P01, P02, P03, P04, P05, P06, P07, P08, P09, P10, P11, P12 | 253 |
| `C178` | P12-C07 | P00, P01, P02, P03, P04, P05, P06, P07, P08, P09, P10, P11, P12 | 253 |
| `C179` | P12-C08 | P00, P01, P02, P03, P04, P05, P06, P07, P08, P09, P10, P11, P12 | 253 |
| `C180` | P12-C08 | P00, P01, P02, P03, P04, P05, P06, P07, P08, P09, P10, P11, P12 | 253 |
<!-- END:UIUX-CLOSURE-CROSSWALK -->

#### Finding and gate disposition crosswalk

| Finding/gate | Primary package | Required disposition |
|---|---|---|
| UIUX-001 | P12-C02 | Preserve implemented Enterprise CTA; complete cross-surface commercial regression. |
| UIUX-002 | P12-C03 | Preserve native forms; finish all entry activation, failure and authenticated-state checks. |
| UIUX-003 | P12-C03 | Preserve deadline/stale-event fix; verify recovery/session lifecycle and real integration limits. |
| UIUX-004 | P12-C03 | Preserve rejected-request recovery; verify retries, retained input and uncertain completion. |
| UIUX-005 | P12-C03 | Preserve password-success/session-revocation distinction and live feedback. |
| UIUX-006 | P12-C03 | Preserve label/error associations; complete keyboard and assistive-technology proof with C06. |
| UIUX-007 | P12-C03 | Preserve all three shared legal-table mappings; complete reading/announcement and visual checks with C06. |
| ENV-001 | P12-C01 | Establish actual isolated fixture/session behaviour; do not infer cause from blank/incomplete routes. |
| Twenty copy-check candidates | P12-C02 | Individual reachable/reference/contract disposition; no blanket suppression or twenty-bug assumption. |
| Full-tree lint and full-suite timeouts | P12-C07 | Completed final checks and demonstrated stability without weakening assertions. |
| Missing full visual/browser/AT coverage | P12-C06 | Complete applicable matrix and original/revised-reference evidence; exclusions explicit. |
| Missing route/state/role/persistence coverage | P12-C04 / P12-C05 | Complete domain action proof and exhaustive manifest projection under C01 guards. |
| Missing final independent acceptance | P12-C08 | Fresh review of final source, runtime and evidence; bounded source review insufficient. |

#### Final completion checklist

These boxes record future programme acceptance only; none is checked by document adoption.

- [ ] Every current F/M/C requirement has one primary closure owner and all mapped scenarios; every live scenario, page, overlay, adapter, alias and discovered control is accounted for, with no orphaned IDs.
- [ ] UIUX-001–007 retain their implemented fixes and have complete affected-consumer regression evidence; all new defects have stable IDs, expected/observed behaviour, severity, owner and before/after proof.
- [ ] Every copy candidate has a justified disposition; no reachable misleading claim or unjustified checker suppression remains.
- [ ] Isolated app/database/storage/mail endpoints and every role/persona fixture are proved; consequential actions have pre-state, cancel/no-write, denial, stale/retry/concurrency, persisted result/audit and cleanup evidence.
- [ ] Every required browser/version, desktop/short-height/device-notice, keyboard/AT/zoom/text/motion matrix cell has explicit results; 79 original references, four behavioural references and adopted revisions are reconciled.
- [ ] Final source and build-affecting configuration are frozen; build, typecheck, full lint/tests, copy, authority, surface, UI-integrity and visual checks have actual exit codes and logs. All required performance budgets pass with recorded conditions.
- [ ] Complete final-build merchant journeys and fresh independent source/runtime/evidence review pass; failed or changed paths are reverified rather than covered by an older receipt.
- [ ] Run-owned fixtures/storage/mail/browser state/processes are cleaned and cleanup verified; unrelated work and historical evidence are preserved.
- [ ] Remaining FAIL, BLOCKED, NOT TESTED and partial scopes, plus any owner-approved exclusions, are enumerated with exact IDs; no unavailable proof is counted as a pass.
- [ ] Update this plan's phase table and current receipt links with the evidence-backed UI/UX READY, PARTIAL or NOT READY verdict. Keep provider, security, legal, deployment and production-release decisions separate.

#### Documentation adoption validation

The documentation task changes only this canonical plan and its dated adoption evidence. Validate authority and surface mappings, parse the generated ledger into a fresh artifact root, and compare the exact F/M/C ID set and scenario set with the captured baseline. Ensure the crosswalk has exactly one primary owner per requirement, every package reference resolves, no requirement wording or phase ownership was changed, and all existing acceptance boxes remain as captured. Backtick-wrapped IDs in the crosswalk deliberately avoid matching the ledger generator's canonical F/M table syntax. Record the validation receipt without changing runtime acceptance or historical ledgers.

## 10 How permanent rules become enforceable

Documentation instructs the IDE; runtime guards, canonical owners, and evidence enforce the product. Implement the following through existing owners. Do not create a generic rules framework or one shallow test per paragraph.

| Global contract | Existing enforcement location | Evidence required |
|---|---|---|
| GOV / owner hierarchy | `AGENTS.md`, `ARCHITECTURE.md`, existing authority verifier | Missing global reference/owner is detected; current conflicting docs reconciled |
| TRUTH / runtime binding | Existing route read models, shell/runtime adapters, export/notification consumers | Different entities, dates, populated/empty/failed reads remain internally consistent |
| MONEY / period and aggregate meaning | `lib/financial/canonicalAggregates.ts`, financial queries and formatting | Fixture arithmetic and scope reconcile across API/UI/detail/export; no double allocation |
| ACT / permission, version and idempotency | Existing server handlers and persistent transition functions | Denied/foreign/stale/duplicate/concurrent requests cannot create unauthorised or duplicate results |
| RES / explicit replacement | Decision validation, persistence, handoff and outcome owners | Stored replacement never becomes refund; quantity and receipt invariants survive retry/concurrency |
| POL / shared evaluator and no-write preview | Existing rule engine, preview and publish routes | Relevant unknowns/currencies agree; preview changes no business rows/credits; stale publication rejected |
| REPORT / attribution and cohort | Existing relationship and reporting owners | Ambiguous/unassigned populations retained; exact case-set and money linkage |
| SOURCE / maturity and freshness | Provider registry, connection/import/evidence read models | Configured-stale, repair, unsupported and verified empty are distinct |
| BILL / catalogue and provider confirmation | `lib/billing/plans.ts`, subscription intent and metering | Cross-surface parity, no URL activation, retry-safe charging |
| SEC / tenancy and privacy | Permission owners, queries, storage/RLS, API/job boundaries | Cross-tenant/role negatives, safe return, secret handling, scoped destructive review |
| DEMO / isolation | Versioned browser-local fixture state and pure calculations | All branches work with no provider/business/database/billing calls |
| DESK / device support | Existing shared layout/boundary and route delivery | Known device/viewport/zoom matrix; no functional mobile journey mounts |
| VIS / one source with recorded revisions | `DESIGN.md`, existing generator/crosswalk/parity verifier | Original versus revised reference evidence; no competing render graph |
| UX / semantics and state reliability | Shared controls and each current surface owner | Keyboard, focus, dialogs, table/reading relationships, chart alternatives, real results |
| SAFE / test boundaries | Existing local fixture/environment guards and cleanup | Exact target/pre-state/read-back/cleanup receipts; a failed guard stops dependent action |
| TEST / evidence scope | Existing manifest, acceptance harnesses and this plan status | Current scenario receipts and separate verdicts; no inherited counts treated as passes |

### P00 located enforcement and verification owners

Current source inspection on 6 September 2026 attached the contracts above to
these existing paths. This is a locator/evidence projection, not a new set of
product semantics. A named test below is not a passing result unless the P00
receipt records that it ran. Newly planned behaviours retain their phase gates.

| Contract | Actual owner chain | Verification owner / remaining proof |
|---|---|---|
| GOV | `AGENTS.md`, `CLAUDE.md`, `scripts/verify-authority-map.mjs` | `tests/unit/authorityMap.test.mjs`: missing file/link/import/owner-cell negatives; does not certify runtime compliance |
| TRUTH | Page owners in the manifest → `components/layout/ExactAuthenticatedShell.tsx`, `components/visual-authority/bindSuppliedTree.tsx`, domain loaders | `tests/components/authenticatedShellRuntime.test.tsx`; current static graphs in the P00 receipt; F04/F13/F15 require fresh varied-data captures |
| MONEY | `lib/financial/canonicalAggregates.ts`, `lib/reconciliation/caseStore.ts`, `lib/reporting/intelligence.ts`, `lib/utils/format.ts` | `tests/unit/canonicalFinancialAggregates.test.ts`, `tests/unit/moneyFormatting.test.ts`, `tests/current/mr4-financial-truth.spec.ts`; P02 persists period/receipt/close proof |
| ACT / RES / supervised operation | `app/api/claims/[claimId]/outcome/route.ts` → `lib/claims/store.ts` → `record_case_decision` in `supabase/migrations/20260722400000_source_to_recovery_integrity.sql`; `lib/claims/externalAction.ts` | `tests/unit/merchantDecisionContract.test.ts`, `tests/unit/externalAction.test.ts`, `tests/api/claimsRoutes.test.ts`; explicit replacement is absent from the current action schema and remains P05 |
| POL | `lib/rules-engine.ts`, `lib/rules/versioning.ts`, `app/api/rules/[id]/simulate/route.ts`, `app/api/rules/[id]/publish/route.ts` | `tests/unit/rulesEngine.test.ts`, `tests/unit/configurationVersioning.test.ts`; existing single-rule simulation is not the P08 cohort/ruleset preview |
| REPORT | `lib/reporting/intelligence.ts`, `lib/reporting/namedReportContracts.ts`, `lib/reporting/export.ts`, `lib/relationships/relationshipStore.ts` | `tests/unit/namedReportContracts.test.ts`, `tests/unit/reportingExport.test.ts`; confirmed carrier/SKU/warehouse allocation and investigation remain P09 |
| SOURCE | `lib/integrations/registry.ts`, `lib/connectors/registry.ts`, `lib/sources/sourceRegistry.ts`, `lib/sources/evidenceReadiness.ts`, `lib/imports/csv/commitImport.ts` | `tests/lib/sourceRegistry.test.ts`, `tests/components/canonicalCsvImportClient.test.tsx`; P06 repair/import/resume fixtures remain required |
| BILL | `lib/billing/plans.ts`, `lib/billing/lifecycle.ts`, `lib/billing/creditUsage.ts`; current pricing route → `components/public/PublicPricing.tsx` | `tests/lib/billingLifecycle.test.ts`, `tests/lib/billingActivation.test.ts`; the current offer and saved interval intent remain distinct from legacy credit billing and provider-confirmed activation |
| SEC | `lib/claims/access.ts`, `lib/permissions/constants.ts`, `lib/permissions/roles.ts`, `lib/auth/safeRedirect.ts`, server handlers and database policies | `tests/security/tenantBoundaryContract.test.ts`, `tests/lib/permissionsAudit.test.ts`, `tests/lib/safeRedirect.test.ts`; these do not replace persistent tenant/role negatives |
| DEMO | `app/(public)/demo/page.tsx` → `components/demo/OperationalCaseDemo.tsx`; `lib/demo/merchantCaseV1.ts` also supplies landing previews | `tests/unit/demoFixture.test.ts`, `scripts/acceptance/p10-public-demo.mjs`; P10 receipt records choice, navigation, browser-local isolation and visual evidence separately |
| DESK | `components/system/DesktopRequiredBoundary.tsx`, public/auth/onboarding/app layouts | `tests/current/accessibility-responsive.spec.ts`, `tests/unit/authRouteRendering.test.ts`; current width-only boundary and unguarded entry layouts need P03 replacement of their device expectations |
| VIS / UX | `scripts/generate-supplied-visual-pages.mjs`, manifest crosswalk, shared controls and reachable supplied adapters, `scripts/verify-full-app-visual-cutover.mjs` | `tests/unit/visualRevisionContract.test.mjs`; original/revised comparison contract is enforced, but full rendered evidence and keyboard/device proof remain unaccepted |
| OPS | `components/work/WorkQueueOperations.tsx`, `components/work/ExactWorkQueueOperations.tsx`, `lib/notifications/kinds.ts`, `lib/collaboration/notificationPreferences.ts` | `tests/components/workQueueResultModel.test.tsx`, `tests/unit/notificationProjection.test.ts`, `tests/lib/notificationPreferences.test.ts`; P07/P11 own behavioural closure |
| SAFE | `scripts/acceptance/local-runtime.mjs`, `scripts/acceptance/remaining-closure-runtime.mjs`, `lib/testing/remainingClosureGuard.ts` | `tests/lib/remainingClosureGuard.test.ts`; live loopback guard and existing synthetic owner marker verified after starting the stopped local VM; eight scoped business-table digests unchanged, disposable auth sessions signed out, task server and VM stopped |
| ENG / TEST | Installed Next.js layouts/pages guide; existing manifest, acceptance generator, runtime content fingerprints and type/lint commands | `tests/unit/runtimeSourceFingerprint.test.ts`, `tests/unit/authorityMap.test.mjs`; current plan is parsed into 246 requirement rows, and 239 scenario rows remain untested |
| REL | `docs/product/MVP_PLUS_SCOPE.md`, `docs/product/RELEASE_READINESS.md`, `docs/product/MR6_HANDOFF.md`, `docs/product/DEPLOYMENT_READINESS.md` | Existing external release/legal/provider/migration gates remain unchanged; P00 supplies no release approval |

## 11 Source requirement traceability

### Earlier handoff requirements retained

| ID | Requirement that must survive implementation | Delivery and acceptance |
|---|---|---|
| M01 | Exact adopted landing message, primary/secondary CTAs, six-part page order, manual capability statement, truthful public claims | P10; inspect live page and current capability/catalogue consumers |
| M02 | Three fixed fictional scenarios with the specified £96/£33, £128/£256, and £248/£150/£98 semantics | P10; all decisions, immutable facts and independent money stages |
| M03 | One versioned local scenario state; real branching, simulated external events, deep links, legacy mapping, refresh/Back/reset/idempotency and no writes | P10; browser and boundary tests |
| M04 | Resolution comparison with known/unknown costs, provenance, feasible options, policy/evidence limitations and separate recovery | P04; realistic comparison fixtures |
| M05 | Permissioned versioned immutable decision snapshot; current evidence/policy, rationale, amount/currency and no fabricated non-financial payout | P04; persistent negative and success cases |
| M06 | Explicit replacement action through storage/audit/read models; same SKU/order/confirmed lines, valid quantities and cost budget; concurrency and historical compatibility | P05; storage boundary and refund-regression evidence |
| M07 | Complete manual handoff with instructions, original order and receipt recording; no automatic ordering, substitution or address/stock work | P05; reload, retry, partial failure, cancel and no-execution evidence |
| M08 | Merchant-confirmed versus source-observed dispatch/receipt; authorisation/cost/recovery separation and no duplicated outcome | P05; corroboration and reversal fixtures |
| M09 | Full-ruleset current-evidence preview; 7/30/90 days, 500-case cap, 50 displayed rows, frozen versions/cutoff and currency-separated deltas | P08; limits, scope, pagination and result assertions |
| M10 | Shared live/preview interpretation, AND/OR/priority, relevant unknowns, legacy/unknown currencies and no implicit exchange rate | P08; £100-to-£150 example and uncertainty fixtures |
| M11 | Preview has no business writes, provider refresh or charges; publication is separately confirmed and revalidated, with no-case acknowledgement | P08; side-effect observation and publish/cancel/read-back |
| M12 | Confirmed affected SKU/shipment/warehouse relationships; association stays separate from responsibility | P09; ambiguous and manual-confirmation fixtures |
| M13 | Explicit cohort/as-of metrics, currencies, unallocated/unvalued population, non-additive counts and no duplicated monetary allocation | P09; accounting, query failure and export parity |
| M14 | Up to three concentrations, five-case/three-order display threshold, supported ranking, sample sizes, exact drilldown and deliberate deduplicated Work | P09; threshold and Work boundary tests |
| M15 | Seven state-derived onboarding destinations, secondary optional blockers, no fixed timings or unsupported commerce detour | P06; full state transition and resume matrix |
| M16 | Canonical commercial terms, actual billable events, no new charges for reads, no URL-driven activation, consistent cross-surface copy | P01, then P10/P11 integration; catalogue and billing boundary tests |
| M17 | Extend existing capabilities; preserve dirty work, manual operation and external release gates; no incidental AI/identity/integration expansion | Every phase; diff and negative side-effect review |
| M18 | Physical affected-state and full integration acceptance, meaningful automated tests, actual persistence and independent evidence | Every phase and P12; all required receipts and final verdicts |

### Teardown finding ownership

Each finding keeps its original ID and priority. Read the original evidence before changing it. The primary phase is responsible for the fix and its proof; P12 repeats the integrated acceptance obligation. Shared prerequisites may be delivered in earlier phases.

| Finding | Priority | Original requirement | Primary phase |
|---|---|---|---|
| F01 | P1 | Establish one desktop only support policy | P03 |
| F02 | P1 | Make public prices agree with billing | P01 |
| F03 | P1 | Explain the actual credit contract | P01 |
| F04 | P1 | Remove reference facts from runtime summaries | P01 |
| F05 | P1 | Apply the selected period to the whole loss view | P02 |
| F06 | P1 | Reconcile loss list amounts with detail | P02 |
| F07 | P1 | Make reconciliation period selection effective | P02 |
| F08 | P1 | Distinguish bank evidence from unresolved case work | P02 |
| F09 | P1 | Use consistent money stages and count units | P02 |
| F10 | P1 | Make the financial explanation reconcile arithmetically | P02 |
| F11 | P1 | Stop presenting exposure as confirmed recoverability | P02 |
| F12 | P1 | Preserve rule meaning when opening the editor | P01 |
| F13 | P1 | Keep customer and search identity attached to the route | P01 |
| F14 | P1 | Separate connection readiness from evidence freshness | P01 |
| F15 | P1 | Render unknown team counts as unavailable | P01 |
| F16 | P1 | Show reset confirmation only after a request | P01 |
| F17 | P2 | Make billing review complete and internally consistent | P03 |
| F18 | P2 | Give decisions a reliable close and focus model | P03 |
| F19 | P2 | Make compact desktop investigation usable | P03 |
| F20 | P2 | Prevent connected source rows from shrinking through text | P03 |
| F21 | P2 | Make essential evidence readable before adding decoration | P03 |
| F22 | P2 | Add semantic structure to visual tables and pages | P03 |
| F23 | P2 | Make control appearance match behaviour | P03 |
| F24 | P2 | Explain work counts and queue scope | P07 |
| F25 | P2 | Align task presentation with lifecycle | P07 |
| F26 | P2 | Make recovery stages navigable across the full queue | P07 |
| F27 | P2 | Reduce competing actions in the work queue | P07 |
| F28 | P2 | Organise the evidence builder around completion | P04 |
| F29 | P2 | Make connected record gaps useful | P04 |
| F30 | P2 | Give Customers a clear primary task | P04 |
| F31 | P2 | Disambiguate repeated order references | P04 |
| F32 | P2 | Separate managing connections from discovering providers | P06 |
| F33 | P2 | Repair connector wizard text composition | P06 |
| F34 | P2 | Make setup progress represent completed work | P06 |
| F35 | P2 | Explain source permissions in merchant terms | P06 |
| F36 | P2 | Remove appearance choices that do not produce an appearance | P03 |
| F37 | P2 | Make settings location and navigation predictable | P03 |
| F38 | P2 | Give account identity and session actions one home | P03 |
| F39 | P2 | Make security posture claims actionable and verifiable | P11 |
| F40 | P2 | Align account form units and promises with behaviour | P11 |
| F41 | P2 | Make notifications specific and delivery claims honest | P11 |
| F42 | P2 | Scope audit summaries to the displayed evidence | P11 |
| F43 | P2 | Turn upload emptiness into a useful first step | P06 |
| F44 | P2 | Separate privacy tasks by subject and consequence | P11 |
| F45 | P3 | Connect help to the actual blocked task | P11 |
| F46 | P1 | Make the public demo causally coherent | P10 |
| F47 | P3 | Shorten the public explanation around merchant value | P10 |
| F48 | P2 | Keep incomplete claim narratives usable and truthful | P07 |

## 12 Task handoff status and evidence format

### Start one phase

Use this instruction with the selected model/thinking from section 4, replacing `P00` with the next authorised phase:

> Read `AGENTS.md`, `GLOBAL_RULES.md`, `ARCHITECTURE.md`, `PRODUCT.md`, `DESIGN.md`, and `docs/product/MERCHANT_CLARITY_IMPLEMENTATION.md`. Implement phase P00 only. Enforce the permanent global rules across every affected layer. Verify prerequisites, capture the dirty baseline, trace actual owners, freeze the exact file allow-list, reproduce the assigned findings, and complete the phase's code, documentation, tests, rendered evidence and exit receipt. Preserve unrelated work and all external-action boundaries. Do not start the next phase or claim release approval. If a required gate cannot pass, complete independent work and report the precise remaining requirement and evidence.

For future unrelated IDE work, reference `GLOBAL_RULES.md` directly and the current domain owners; do not make this initiative's phases a permanent prerequisite for every small task.

### Phase receipt

Record one receipt per phase run in the existing evidence format, with these fields:

| Field | Required content |
|---|---|
| Scope | Phase; F/C/M IDs; applicable global rule IDs; explicit exclusions |
| Source identity | Commit and dirty-source fingerprint; baseline; final changed-file list; relevant reference/manifest hashes |
| Environment | Local origin and build; fixture merchant/actor/role; safe environment classification without credentials |
| Before | Dated finding reproduced, already fixed with current evidence, proposal, or unverified hypothesis |
| Change | Actual user-visible/persistent result and why it addresses the requirement |
| Verification | Commands actually run and outcomes; independent scenario/viewport/state evidence; persistent before/after and audit effects |
| Safety | Prohibited side effects checked; exact cleanup and final state; external gates not exercised |
| Remaining | Failed, blocked, partial, not-run, or owner-approved exclusions with impact and dependency |
| Verdict | Phase PASS/PARTIAL/BLOCKED/FAIL and the next authorised action, without starting it |

Update the phase status table in this file with its receipt link and date. Check acceptance boxes only with current evidence attached in the existing ledger. An accepted exclusion retains its identity and reason; it is not a verified pass. Keep release facts in their registered status owners and reference them here without silently changing their verdict.

### Definition of the finished initiative

The merchant can start the day, investigate the correct case, compare and record a supported resolution, prepare a truthful manual action, follow recovery, explain the month, and repair missing evidence across the supported desktop app. The three public cases demonstrate these boundaries coherently. New policies can be previewed safely. Reports lead from evidenced patterns to deliberate investigation. The final state satisfies every required F/C/M item and current manifest scenario or explicitly records an owner-approved scope exclusion. Local, provider, deployment, and release conclusions remain separate.

## 13 Complete teardown acceptance checklist

All 180 original checks follow, unchanged and initially unchecked. They are part of this plan's execution contract; their source report remains evidence. Domain ownership is indicated under each group, with P12 responsible for final integrated verification. Use current manifest scenario IDs for evidence; do not infer acceptance from a checked box alone.

### Desktop support

Delivery: P03. Final verification: P12.

- [ ] C001 Apply the desktop-only contract to sign-in, signup, reset, onboarding, the interactive demo, and merchant workflows.
- [ ] C002 Block direct mobile and tablet entry, including wide landscape layouts, without exposing a partially functional workspace.
- [ ] C003 Replace clipped phone mock-ups with a readable, accessible desktop-required notice.
- [ ] C004 Make copy or email actions include the correct safe desktop URL and explain what they do.
- [ ] C005 Remove claims that mobile triage, mobile reading, or unavailable digests provide working product access.
- [ ] C006 Verify core workspace layouts at 1024, 1280, and 1440 pixels with real content.
- [ ] C007 Test 720-pixel and shorter desktop heights for reachable footers, menus, and dialog actions.
- [ ] C008 Distinguish unsupported devices from narrow desktop windows and test browser zoom independently.
- [ ] C009 Preserve safe return context across the support notice without putting credentials or sensitive values in a shared URL.

### Data and meaning

Delivery: P01 and P02. Final verification: P12.

- [ ] C010 Derive all runtime people, dates, counts, and statuses from the current scoped data or a truthful unavailable state.
- [ ] C011 Keep source facts, recommendations, merchant decisions, and provider actions separate in copy and state.
- [ ] C012 Distinguish requested, approved, received, matched, reconciled, and written-off money everywhere.
- [ ] C013 Display unknown, unavailable, partial, stale, and verified zero as distinct states.
- [ ] C014 State currency, reporting interval, timezone, and population for every financial summary.
- [ ] C015 Keep arithmetic in canonical minor units and format human-facing amounts consistently.
- [ ] C016 Label the counted entity explicitly, including cases, orders, tasks, receipts, and sources.
- [ ] C017 Explain capped or incomplete populations and avoid presenting sample totals as complete totals.
- [ ] C018 Ensure summary, detail, export, and linked supporting records use the same definitions.

### Shell and navigation

Delivery: P03. Final verification: P12.

- [ ] C019 Give every page one clear title, correct active navigation, and recognisable workspace context.
- [ ] C020 Keep canonical routes and safe legacy redirects without creating duplicate page owners.
- [ ] C021 Preserve filters, sort, pagination, selection, and scroll when entering detail and returning.
- [ ] C022 Keep breadcrumbs tied to the current entity and make every breadcrumb destination meaningful.
- [ ] C023 Provide a consistent account menu containing the real identity and a discoverable Sign out action.
- [ ] C024 Separate inbox navigation from notification preference navigation.
- [ ] C025 Make command-palette items keyboard operable and faithful to current routes and permissions.
- [ ] C026 Give icon-only navigation accessible names and visible focus and selection states.
- [ ] C027 Ensure shared URLs preserve context while leaving tenant and role access enforcement intact.

### Overview

Delivery: P01, P02 and P03. Final verification: P12.

- [ ] C028 Answer what needs attention, why, and which action to take before presenting secondary analytics.
- [ ] C029 Make navigation badge counts and dashboard counts explain their different scopes.
- [ ] C030 Bind headline amounts to named money stages and linked supporting records.
- [ ] C031 Apply range, currency, and comparison selections to all dependent dashboard content.
- [ ] C032 Implement metric selectors as working controls or present them as clearly noninteractive labels.
- [ ] C033 Provide a scoped accessible table alternative for every chart used to make a decision.
- [ ] C034 Explain source freshness and completeness beside figures that depend on them.
- [ ] C035 Distinguish no urgent work from unavailable work and from an unconfigured workspace.
- [ ] C036 Remove decorative historical dates and fixed example activity from the live overview.

### Work and triage

Delivery: P07. Final verification: P12.

- [ ] C037 Separate assigned tasks, workspace work, and integration exceptions with explicit count definitions.
- [ ] C038 Show the reason, deadline, owner, and next action in each actionable row.
- [ ] C039 Keep cancelled and completed tasks out of open counts unless deliberately labelled as history.
- [ ] C040 Explain why follow-up remains active after a case decision or provider outcome.
- [ ] C041 Reveal batch mode after selection and clearly state the selected population.
- [ ] C042 Keep snooze, reassignment, and completion outcomes distinct with appropriate feedback.
- [ ] C043 Make saved views durable and temporary filters visible in the URL where the existing contract supports them.
- [ ] C044 State how many additional items Show rest or pagination will reveal.
- [ ] C045 Measure merchant triage success and backtracking before claiming an efficiency improvement.

### Registries and tables

Delivery: P03, then each domain phase. Final verification: P12.

- [ ] C046 Choose columns around the merchant task while retaining access to all necessary supporting fields.
- [ ] C047 Prevent text clipping when runtime row counts exceed the reference dataset.
- [ ] C048 Provide useful empty-query, no-results, unavailable, and truly empty registry states.
- [ ] C049 Keep sort direction, active filters, page scope, and total population visible.
- [ ] C050 Give rows and headers meaningful table relationships or implement a complete accessible grid model.
- [ ] C051 Separate opening a row from activating nested links, menus, or selection controls.
- [ ] C052 Make row actions available on keyboard focus as well as hover.
- [ ] C053 Keep sticky headers and footers from covering data, focus, or pagination.
- [ ] C054 Preserve selection honestly when changing a filter or page; never silently expand the action target.

### Case investigation and decisions

Delivery: P04 and P05. Final verification: P12.

- [ ] C055 Keep registry, preview, and full case detail as distinct levels of investigation.
- [ ] C056 Display the same customer, case identity, amounts, and eligibility state at every level.
- [ ] C057 Make preview bounded, dismissible, and readable at compact desktop sizes.
- [ ] C058 Put the decision question, unresolved gates, and recommendation uncertainty in a clear reading order.
- [ ] C059 Keep full evidence labels and explanations available without hover-only disclosure.
- [ ] C060 Separate deciding the case from assignment, lifecycle management, and external execution.
- [ ] C061 Require a clear review of the actual decision and consequence before a consequential mutation.
- [ ] C062 Verify cancellation performs no mutation and completion yields an attributable audit record.
- [ ] C063 Test reversal and follow-up states with persisted read-back in disposable fixtures.

### Evidence and claim preparation

Delivery: P04 and P07. Final verification: P12.

- [ ] C064 Anchor evidence packages to the correct customer, case, and source records.
- [ ] C065 Distinguish evidence completeness, identity confidence, recommendation confidence, and provider eligibility.
- [ ] C066 Order missing requirements by what the merchant can actually resolve next.
- [ ] C067 Link each supported fact to its retained source and freshness information.
- [ ] C068 Mark unsupported evidence clearly without fabricating photos, scans, messages, or line items.
- [ ] C069 Keep provider ceilings separate from order value and unresolved exposure.
- [ ] C070 Generate narratives only from supported facts and label incomplete drafts explicitly.
- [ ] C071 Block export or submission when the relevant hard gates require it and explain each blocker.
- [ ] C072 Separate saved draft, prepared pack, submitted claim, provider response, and received money.

### Customers and connected records

Delivery: P04. Final verification: P12.

- [ ] C073 Make customer lookup and opening the correct profile the primary registry task.
- [ ] C074 Test sequential customer navigation and multiple tabs for stale names and breadcrumbs.
- [ ] C075 Disambiguate repeated human order numbers using source, date, amount, and immutable identity.
- [ ] C076 Show retained record counts rather than illustrative message or line-item totals.
- [ ] C077 Explain not imported, not retained, unsupported, and verified empty record sections distinctly.
- [ ] C078 Present source record links and relevant repair guidance beside missing information.
- [ ] C079 Keep inferred identity relationships distinct from observed facts and fraud conclusions.
- [ ] C080 Keep tenant and permission restrictions intact for linked profiles and connected records.
- [ ] C081 Verify dispute detail with a real disposable fixture rather than assuming parity with other record types.

### Loss accounting

Delivery: P02. Final verification: P12.

- [ ] C082 Apply one explicit period and timezone to loss charts, causes, KPIs, rows, and exports.
- [ ] C083 Verify list and detail amounts against the same loss record and scope.
- [ ] C084 Make gross loss, adjustments, recovery stages, and net loss form an explainable ledger bridge.
- [ ] C085 Distinguish case value, loss value, claim ceiling, and outstanding recovery in every summary.
- [ ] C086 Retain unassigned money and explain missing attribution instead of silently excluding it.
- [ ] C087 Prevent mixed currencies from being added without an explicit supported conversion contract.
- [ ] C088 Derive effective dates and close-period labels from actual records.
- [ ] C089 Test write-off review, cancel, permission denial, and persisted outcome in isolated fixtures.
- [ ] C090 Make zero, unavailable, and incomplete ledger coverage visually and semantically distinct.

### Recovery operations

Delivery: P07. Final verification: P12.

- [ ] C091 Make stage counts navigate to the actual filtered stage population.
- [ ] C092 Distinguish empty page, empty stage, and empty workspace on the board.
- [ ] C093 State whether a monetary board total covers the page, stage, or full filtered population.
- [ ] C094 Preserve provider rules, deadline, source evidence, and next action in route detail.
- [ ] C095 Keep prepared, submitted, accepted, rejected, partly approved, and closed states distinct.
- [ ] C096 Do not present provider approval as received or reconciled money.
- [ ] C097 Explain any manual handoff and avoid implying that opening a provider completed it.
- [ ] C098 Verify outcome recording and cancellation against persisted state using disposable data.
- [ ] C099 Keep provider integration proof separate from local simulated claim progress.

### Reconciliation

Delivery: P02. Final verification: P12.

- [ ] C100 Pass the selected period to every applicable reconciliation and aggregate read.
- [ ] C101 Label earlier outstanding exceptions separately from activity in the current period.
- [ ] C102 Show observed credit evidence before describing money as received.
- [ ] C103 Separate operational case exceptions from receipt and match exceptions.
- [ ] C104 Make each match traceable to the actual receipt, loss, currency, and amount.
- [ ] C105 Explain unmatched, partially matched, and reconciled balances without false zeros.
- [ ] C106 Make period-close review display the exact scope, prerequisites, and consequences.
- [ ] C107 Preserve blockers for missing settlement snapshots or insufficient permissions.
- [ ] C108 Verify close, cancel, and invalid-period behaviour with isolated persisted read-back.

### Reports and exports

Delivery: P02 and P09. Final verification: P12.

- [ ] C109 Name the metric and counted entity consistently between Overview, Reports, and named reports.
- [ ] C110 Make displayed equations reconcile and include relevant adjustments explicitly.
- [ ] C111 Keep chart, table, supporting-record, and exported scopes aligned.
- [ ] C112 Show actual run time, timezone, freshness, and coverage instead of a fixed reference timestamp.
- [ ] C113 Distinguish a generated report view from a persisted saved report and delivery schedule.
- [ ] C114 Explain empty, unavailable, partial, and capped report populations.
- [ ] C115 Give users a useful way to inspect the records behind each supported headline.
- [ ] C116 Do not imply causal performance, profitability, or customer outcomes from unsupported aggregates.
- [ ] C117 Verify export labels, row counts, currency, amounts, and permission scope against the visible report.

### Sources and provider setup

Delivery: P01, P03 and P06. Final verification: P12.

- [ ] C118 Separate connection, capability, freshness, and operational health indicators.
- [ ] C119 Prioritise failing active connections before unconfigured or planned catalogue entries.
- [ ] C120 Derive catalogue and connection counts from their respective real inventories.
- [ ] C121 Prevent source rows from shrinking below readable content height.
- [ ] C122 Describe exact read, subscription-management, handoff, and execution capabilities.
- [ ] C123 Give every wizard setting a distinct label, description, value, and status.
- [ ] C124 Mark steps verified only after the relevant authorised or imported evidence exists.
- [ ] C125 Explain repair prerequisites and the expected effect without promising unsupported provider actions.
- [ ] C126 Verify connection and disconnection review in fixtures, including cancellation and retained-history rules.

### Onboarding and imports

Delivery: P06. Final verification: P12.

- [ ] C127 Keep onboarding desktop-only and resume from the actual persisted setup stage.
- [ ] C128 Ask for each workspace setting once and explain any migrated or unrecognised saved value.
- [ ] C129 Distinguish choosing a provider from authorising it and importing usable evidence.
- [ ] C130 Derive the first operational next step from actual connection, import, and case state.
- [ ] C131 Keep progress labels honest when authentication or activation is blocked.
- [ ] C132 Show accepted file formats, required fields, and a useful sample before import.
- [ ] C133 Explain mapping, validation errors, duplicates, retry, and retained import outcomes.
- [ ] C134 Verify a populated import job and its error download with a disposable file fixture.
- [ ] C135 Ensure zero jobs and empty agreements cannot retain example run or document summaries.

### Rules and flows

Delivery: P01 and P08. Final verification: P12.

- [ ] C136 Render every persisted operator with its actual meaning and block unknown operators explicitly.
- [ ] C137 Verify no-op rule edit and save preserve values, units, ordering, and logical structure.
- [ ] C138 Separate draft, preview, published, and active execution states.
- [ ] C139 Explain simulation scope, evidence limits, and the distinction from real execution.
- [ ] C140 Remove live-flow counts and activity claims when there are no live flows or supported execution.
- [ ] C141 Make flow creation and empty states explain the supported next action.
- [ ] C142 Verify flow workbench and run detail with real fixtures instead of substituting the runs registry.
- [ ] C143 Test publication permission, review, cancel, and persisted outcome without changing real operating policy.
- [ ] C144 Preserve source facts and merchant decisions during read-only policy or rule previews.

### Account settings security and billing

Delivery: P01, P03 and P11. Final verification: P12.

- [ ] C145 Bind account identity and team counts to verified current state, including unavailable summaries.
- [ ] C146 Make monthly and yearly order-volume units consistent on load, validation, and save.
- [ ] C147 Advertise setting effects only when the corresponding behaviour is implemented and verified.
- [ ] C148 Expose only working appearance choices under the adopted visual authority.
- [ ] C149 Distinguish two-factor requirement, enrolment, enforcement, and unavailable state with supported next steps.
- [ ] C150 Verify role-sensitive actions and invitations across permitted and denied fixtures.
- [ ] C151 Render public and signed-in plan terms from the same canonical commercial catalogue.
- [ ] C152 Explain credit consumption, exhaustion, limits, and retries with examples that reconcile.
- [ ] C153 Make plan review show price, allowances, effective timing, and request-versus-confirmation semantics.

### Notifications help and governance

Delivery: P11. Final verification: P12.

- [ ] C154 Make each notification identify what changed, its subject, urgency, and useful destination.
- [ ] C155 Format money, dates, and identifiers for reading rather than exposing raw internal strings.
- [ ] C156 Remove delivery and schedule promises for unavailable channels; label digest previews explicitly.
- [ ] C157 Align notification preference copy with per-account future-event behaviour and save feedback.
- [ ] C158 Scope audit summaries, dates, actors, and row counts to the actual filtered evidence.
- [ ] C159 Keep uploaded agreement candidates separate from reviewed or approved terms.
- [ ] C160 Separate subject privacy review from account or workspace deletion and preserve unavailable blockers.
- [ ] C161 Make contextual help land on the promised task with current plan and permission terminology.
- [ ] C162 Verify public, help, and legal-facing product claims against the implemented capability contract without inventing legal approval.

### Visual quality and accessibility

Delivery: P03, then each changed domain. Final verification: P12.

- [ ] C163 Preserve one adopted component and visual owner for each surface and record deliberate authority changes.
- [ ] C164 Make critical evidence, labels, units, and actions readable at supported desktop sizes.
- [ ] C165 Use coherent headings, landmarks, form labels, table relationships, and accessible names.
- [ ] C166 Give every interactive control a visible keyboard focus state and reliable activation behaviour.
- [ ] C167 Move focus into dialogs, contain it appropriately, support Escape and Cancel, and restore the trigger.
- [ ] C168 Meet target-size or spacing requirements; use larger comfortable targets where density permits.
- [ ] C169 Communicate status using text or shape as well as colour, and verify prescribed contrast separately.
- [ ] C170 Test desktop magnification, text expansion, overflow, and reduced-motion preferences without declaring mobile support.
- [ ] C171 Verify chart alternatives and feedback announcements with assistive technology rather than source inspection alone.

### Resilience and completion evidence

Delivery: P00 through P12. Final verification: P12.

- [ ] C172 Capture the dirty baseline and preserve unrelated work throughout implementation.
- [ ] C173 Verify loading, empty, unavailable, stale, error, denied, and success states independently.
- [ ] C174 Test safe retry, refresh, Back, direct URLs, and multiple tabs without stale entity context.
- [ ] C175 Keep success feedback dependent on the actual result; test premature reset and billing confirmations.
- [ ] C176 Use disposable local fixtures, exact cleanup, and persisted read-back for consequential actions.
- [ ] C177 Exercise every current manifest route and scenario or record an explicit accepted exclusion.
- [ ] C178 Run relevant automated checks plus rendered browser checks without treating either as a substitute for the other.
- [ ] C179 Obtain independent review and distinguish local UI acceptance from provider, deployment, and production evidence.
- [ ] C180 Deliver before and after evidence, resolved finding IDs, remaining blockers, and one updated canonical implementation status.

## Functional reachability follow-up — 12 September 2026

Owner-authorized scope after the premium UI rollback: correct clipped/unscrollable
content and inconsistent workspace navigation, retaining the restored visual design.
Use the existing shell and page owners; retain routes, permissions, business data,
action boundaries and unrelated dirty work. No premium phase is resumed.
Before copies, regression results and rendered checks are recorded in
`artifacts/ui-reachability-2026-09-12/`. Existing release and P12 acceptance gaps remain
separate from this bounded repair.
