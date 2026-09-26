# Unauth merchant UI and UX teardown

Merchant desktop overhaul brief and acceptance checklist

Prepared for Malik Ibrahim by Codex on 6 September 2026. Based on the fictional Asterlane demo workspace, recovered visual evidence from the interrupted task, additional browser inspection, and current repository contracts.

## 1 The decision

Unauth has a credible merchant operations model and a recognisable visual identity. The interface currently makes merchants do too much work to establish which figures, statuses, and actions they can trust. The first upgrade must make the operational picture consistent: the same entity, money stage, reporting period, and source state must mean the same thing wherever it appears. Then improve the speed and clarity of investigation, decisions, recovery, and reconciliation.

The audit found concrete contradictions in pricing, financial scope, case recoverability, rule editing, and source health. These are more consequential than decorative polish. Some screens combine useful runtime content with example dates, people, counts, and claims inherited from the visual reference. Better typography alone would make those contradictions more convincing. Correct the binding and meaning first.

**Desktop only is an explicit requirement from the user.** The overhaul must remove functional mobile journeys and claims of mobile support. Authentication, onboarding, the interactive demo, and the merchant workspace must follow the same support policy. Unsupported devices receive a small, accessible desktop-required notice. The implementation must also work properly on smaller supported desktop windows; desktop only is not permission to leave the 1024 and 1280 layouts broken.

This document contains **48 prioritised findings and 180 acceptance checklist items**, a proposed merchant experience, an implementation order, a coverage ledger, and a ready-to-use overhaul prompt. It is an evidence report and proposed backlog. It does not implement changes, replace the adopted visual authority, or approve release.

### Immediate priorities

| Order | Work to complete | Merchant benefit |
| --- | --- | --- |
| 1 | Resolve pricing and credit terms; remove example facts from operational headers | Merchants understand the commercial contract and can trust what they read |
| 2 | Align financial periods, amounts, stage definitions, and drilldowns | Finance can explain every total and trace it to supporting records |
| 3 | Repair rule operator rendering, customer context, and recoverability labels | Operators can make decisions without being misled by the interface |
| 4 | Establish desktop support and repair compact layouts, dialogs, and controls | The supported workspace is usable with a mouse and keyboard |
| 5 | Improve work triage, evidence reading, recovery navigation, and source repair | Merchants can finish common tasks with less searching and repetition |
| 6 | Verify every mapped route and state, including errors and permissions | A polished default screen does not conceal a broken edge state |

### Preserve these strengths

- Keep the distinction between evidence, recommendations, merchant decisions, provider actions, and money outcomes. It is the product's strongest organising principle.
- Keep the Cases registry, bounded preview, and canonical case detail as separate levels of investigation.
- Keep explicit unavailable and blocked states where they are already honest: unsupported API access, incomplete claim packs, missing settlement snapshots, and disabled email delivery.
- Keep source lineage, supporting-record links, provider ceilings, and append-only history. Improve their presentation without removing information needed to justify a decision.
- Retain the adopted warm neutral identity, restrained orange emphasis, Inter and IBM Plex Mono, and familiar desktop structure unless a specific replacement is deliberately adopted into the single design authority.

## 2 Scope and evidence

The frozen task was recovered as **Audit merchant UI and UX**, task `01a0740b-2bc9-7432-828b-d5d16e6b8093`. Its screenshots, DOM captures, detector results, and route notes were preserved in the repository. The completion pass revisited Overview, pricing, billing review, empty Imports and Flows, onboarding, the desktop-required boundary, and password reset.

The evidence set contains 101 recovered screenshots and 11 continuation screenshots. All 112 were visually inspected during recovery and completion. A screenshot documents the captured state only. Repeated screenshots, tab variants, and narrow-width captures are not additional routes or proof of every interaction.

The current manifest lists **65 page modules, 120 audited surface owners, and 223 scenarios**, including four adapter scenarios. The reference crosswalk contains 79 shipping references and four behavioural references. These counts were regenerated from the current manifest; historical acceptance totals were not reused as current proof.

**Degraded review provenance:** the original task started independent A and B reviews. A left screenshots and a route ledger but no completed written assessment. B completed a bounded detector and browser assessment; its expanded pass was interrupted by development-server failures. This document completes their evidence in one context. It does not claim a completed independent dual review or full 223-scenario acceptance.

Evidence labels used below:

- **Observed:** rendered screenshot, DOM, or a recorded interaction establishes the visible behaviour in this demo.
- **Source corroborated:** relevant source supports the observation or narrows its mechanism. Source inspection alone is not visual acceptance.
- **Requirement:** the user's desktop-only instruction or a current product contract defines the necessary outcome.
- **Proposal:** a design improvement inferred from the observed friction; it still needs verification with merchants.

The audit used the existing local demo session at `localhost:3000`. The `127.0.0.1:3000` session showed onboarding instead of the same operational context. No new provider connection, invite, claim submission, refund, write-off, billing change, privacy operation, or publication was performed during completion. The original audit briefly selected Dark and restored Light. Opening a read view may still generate its normal application audit or run receipt.

The [evidence gallery](../../artifacts/merchant-uiux-audit-2026-09-06/evidence-index.html), [route coverage](../../artifacts/merchant-uiux-audit-2026-09-06/route-coverage.csv), and [scenario coverage](../../artifacts/merchant-uiux-audit-2026-09-06/scenario-coverage.csv) are supporting records for this document. The Word file is a reading copy of this master, not a separate authority.

### Authority and scope changes

`PRODUCT.md` owns product meaning, `DESIGN.md` owns presentation, `ARCHITECTURE.md` owns implementation ownership, `lib/surfaces/manifest.ts` owns coverage, and `lib/billing/plans.ts` owns commercial terms. The adopted Cases design archive remains the exclusive visual source until specific changes are adopted. The September clarification already permits real data-dependent copy to replace example facts.

The latest desktop-only request supersedes the earlier proposed mobile allowance for public, authentication, and onboarding workflows **in this overhaul brief**. Implementation must update the existing authorities consistently, rather than add a competing mobile policy or second design system. Existing inherited contrast exceptions are not newly discovered regressions; any change to those prescribed colours needs to be recorded as an intentional upgrade. Keyboard access, accessible names, semantic structure, and useful targets remain separate requirements.

## 3 What strong operational products teach us

These are selected, documented patterns to borrow, not an empirical ranking of the best applications or a request to copy their appearance. Recommendations are tailored to Unauth's merchant tasks.

| Reference | Pattern to borrow | Application to Unauth |
| --- | --- | --- |
| [Shopify index tables](https://shopify.dev/docs/api/app-home/latest/patterns/compositions/index-table) | Search, filtering, sorting, selection, pagination, and feedback belong to one coherent registry | Make Cases, Work, Customers, and source records predictable without hiding their different data meanings |
| [Linear custom views](https://linear.app/docs/custom-views) | Durable filtered views reduce repeated setup; temporary URL filters preserve a shareable context | Preserve queue filters and selection across preview, detail, and Back; sharing a URL must not grant access |
| [Carbon data tables](https://carbondesignsystem.com/components/data-table/usage/) | Distinguish global, row, and batch actions; expose a deliberate selection mode | Remove the dominant zero-selected batch bar and clarify what each action affects |
| [W3C modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | Focus enters the dialog, remains inside it, Escape closes, and focus returns to the trigger | Give each merchant decision and account action a consistent, accessible review and cancel path |
| [Nielsen Norman Group usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) | Visible status, real-world language, consistency, user control, and error recovery | Label money stages and unavailable states precisely; present an explanation and useful next action |
| [W3C target size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | Minimum targets or sufficient spacing reduce accidental activation | Replace the 13-pixel case close target with a named, comfortably clickable button; 44 pixels is a comfort goal, not a blanket WCAG AA rule |
| [W3C reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) | Content should remain usable when magnified, with bounded exceptions for inherently two-dimensional content | Test desktop zoom and dialog reflow; desktop-only support does not establish accessibility conformance |

### Review scorecard

Scores are expert judgement on the observed experience, not measured merchant satisfaction or an automated compliance result. Scale: 0 absent, 1 seriously obstructed, 2 inconsistent, 3 generally effective, 4 strong throughout the inspected scope. Uninspected states cannot receive a pass.

| Dimension | Score out of 4 | Main reason |
| --- | --- | --- |
| Visibility of system status | 1 | Capability readiness is described as freshness; unavailable counts sometimes become zero |
| Merchant language and meaning | 2 | Strong domain vocabulary, weakened by sample identities and money-stage confusion |
| User control and recovery | 2 | Useful review surfaces exist; decision dismissal and blocked next steps need work |
| Consistency and standards | 1 | Public pricing, billing, headers, and drilldowns contradict each other |
| Error prevention | 1 | Operator rendering and recoverable amounts can mislead a decision |
| Recognition and discoverability | 2 | Deep links help, but evidence truncation and weak registries conceal context |
| Efficiency for repeat work | 2 | Queue and preview architecture is sound; scope and pagination add avoidable effort |
| Visual hierarchy and density | 2 | Coherent identity, uneven text density, compressed rows, and oversized empty regions |
| Error explanation and recovery | 2 | Some honest blocked states; generic failures and false success copy remain |
| Help and guidance | 3 | Helpful domain explanations, with terminology and contextual-link gaps |

No production performance, security, or accessibility certification score is assigned. Those require evidence beyond this local review.

## 4 Prioritised findings

P1 means resolve before presenting the overhaul as merchant-ready: a trust, decision, commercial, or explicit support-contract problem. P2 means a material task-completion or usability problem. P3 means a worthwhile refinement. Priorities describe this backlog, not an assertion that every finding is a production incident.

### F01 P1 Establish one desktop only support policy

**Evidence:** requirement plus observed. Authenticated narrow screens reach a desktop notice, while pricing, demo, and onboarding still render clipped desktop layouts at 390 pixels. The existing notice itself clips and suggests that mobile reading or a weekly digest works. Email delivery is separately described as unavailable. Its email-link action does not include the destination URL in the composed body.

**Upgrade:** make Unauth a desktop product throughout entry, setup, and operation. On unsupported devices, show a compact explanation and a useful way to copy or email the desktop URL. Remove mobile triage, mobile workflow promises, and phone mock-ups that imply a working product. Keep only minimal support information on the notice.

**Accept when:** phones and tablets cannot enter merchant workflows, including through direct URLs. Test landscape as well as portrait. Desktop device eligibility and a narrow desktop window receive appropriate, distinct guidance. Supported desktop layouts work at 1024, 1280, and 1440 pixels; 1280 and wider is the recommended working size. Test desktop zoom separately and preserve the user's return route. No mobile redesign is part of this work.

Evidence: [desktop notice](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/continued/desktop-required-mobile-confirmed.png), [onboarding at 390](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/continued/onboarding-store-mobile.png), [pricing at 390](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/continued/pricing-mobile-confirmed.png). Source: `components/system/DesktopRequiredBoundary.tsx`.

### F02 P1 Make public prices agree with billing

**Observed:** public pricing shows Pro £99 and Growth £249; signed-in billing shows Pro £249 and Growth £599. Free, Pro, and Growth allowances also differ: 500, 3000, and 10000 on pricing versus 100, 1000, and 5000 in billing. Merchants cannot establish the actual offer.

**Upgrade:** render every price, allowance, plan name, and qualification from the canonical catalogue. Resolve the intended commercial contract before changing values. **Accept when:** pricing, signup context, billing, plan review, and help agree for every plan, currency, and billing interval; no reference-card value survives as a price source.

Evidence: [public pricing](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/continued/pricing-confirmed.png), [billing](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/billing.png). Sources: `lib/billing/plans.ts`, `components/visual-authority/PricingRuntime.tsx`.

### F03 P1 Explain the actual credit contract

**Observed and source corroborated:** pricing describes a case as one lifetime credit and evidence building as free, while the canonical billable-event catalogue assigns costs to context and evidence events. Public overage claims and a 218-cases-per-month example exhausting 500 credits on day three are not a coherent explanation.

**Upgrade:** state what consumes a credit, when a charge occurs, what retries cost, and what happens at the limit, using the implemented contract. **Accept when:** worked examples reconcile with the catalogue, an action previews its actual cost where material, and unsupported automatic overage billing is not advertised. This finding does not authorise a pricing-policy change.

Evidence: [pricing](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/a/screens/pricing-desktop.png). Source: `BILLABLE_EVENTS` in `lib/billing/plans.ts`.

### F04 P1 Remove reference facts from runtime summaries

**Observed:** Imports reports a last run and 16 held rows while the registry has zero jobs. Flows reports three live flows, one paused flow, 412 runs, and 17 failures while its actual empty state has no flows and explains limited execution support. Search, Reports, Sources, and settings contain similar old dates or example counts.

**Upgrade:** inventory every data-dependent label in the existing surface owners. Bind it to the same scoped read model as the content, or remove the claim when no value exists. Do not solve this with another parallel registry or a broad string-replacement layer. **Accept when:** empty, populated, stale, unavailable, and differently dated fixtures never retain a contradictory example fact.

Evidence: [empty Imports](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/continued/imports-confirmed-empty.png), [empty Flows](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/continued/flows-confirmed-empty.png). Source: `components/layout/ExactAuthenticatedShell.tsx` and each route's runtime adapter.

### F05 P1 Apply the selected period to the whole loss view

**Observed:** Last 30 days shows £35,608.07 across 183 cases, but the list includes March records and the chart spans a different interval. Cause totals describe a much larger population. The 500-row cap is disclosed, but that does not explain the conflicting time scopes.

**Upgrade:** use one explicit period, timezone, currency, population, and aggregation contract for the chart, KPIs, causes, rows, and export. Clearly label a deliberately different comparison. **Accept when:** an out-of-period record cannot contribute to a current-period section; filtered totals and supporting rows reconcile or explicitly explain partial coverage.

Evidence: [Losses](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/losses-desktop.png). Source corroboration: the aggregate uses a cutoff while the registry queries in `LossesPage.tsx` do not apply the same date condition at the inspected read point.

### F06 P1 Reconcile loss list amounts with detail

**Observed:** loss `89c8a498-efc9-4f2c-8ce9-a42d78435272` shows £0 gross, recovered, and net in the list, but £73,600 gross and net in detail. Its effective date, decorative close-period copy, and ledger dates also disagree in presentation.

**Upgrade:** resolve the field mapping and scope behind each number. Show a single monetary definition with linked ledger support. Do not guess a currency-unit conversion as the cause. **Accept when:** the same record and scope give identical list and detail amounts, including verified zero, missing values, adjustments, and mixed-currency exclusions; the close-period label derives from the actual period.

Evidence: [loss list](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/losses-desktop.png), [loss detail](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/loss-detail-desktop.png).

### F07 P1 Make reconciliation period selection effective

**Observed and source corroborated:** the September selector and Close September review coexist with totals and exceptions drawn from a broader population. The route parses `period`, but the inspected reconciliation and aggregate reads do not receive it.

**Upgrade:** propagate the selected period through every relevant read and close-period preview. State whether exceptions are period-specific or outstanding from earlier periods. **Accept when:** changing September to another month changes the underlying scoped records and totals; the review lists the exact eligible period and ledger support. Missing settlement snapshots must continue to block closing. No period was closed in this audit.

Evidence: [reconciliation](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/reconciliation-desktop.png), [close review](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/reconciliation-close-review.png). Source: `app/(app)/financials/reconciliation/page.tsx`.

### F08 P1 Distinguish bank evidence from unresolved case work

**Observed:** a region headed as money arriving in the bank contains 1112 stale-case exceptions with no receipt observed. The rows repeatedly describe an open case with no recent activity. This does not establish a bank transaction feed.

**Upgrade:** label operational exceptions, observed credits, matching work, and reconciled money separately. Present the amount, evidence source, receipt state, and next action together. **Accept when:** a case with no observed receipt is never framed as money received; each match references actual credit evidence and the interface explains unresolved balances without manufacturing a bank event.

Evidence: [reconciliation](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/reconciliation-desktop.png).

### F09 P1 Use consistent money stages and count units

**Observed:** £16,358.55 appears as Reconciled on Overview and as externally repaid or ledger matched in Reports. The named report separates matched £16,358.55 from reconciled and closed £15,193.67. A report also describes 183 receipts where the underlying population is cases; a receipt count was not established.

**Upgrade:** name requested, approved, received, matched, and reconciled amounts precisely. Display the counted entity beside every number. **Accept when:** each headline traces to the same definition in detail and export; cases are never relabelled receipts, and provider approval does not imply received cash.

Evidence: [Overview](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/continued/overview-recovered.png), [Reports](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/reports-desktop.png), [named report](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/named-financial-report.png).

### F10 P1 Make the financial explanation reconcile arithmetically

**Observed:** the report describes gross £35,608.07 less externally repaid £16,358.55 as absorbed £17,149.02. That subtraction is £19,249.52. Other ledger stages may explain the final net figure, but the displayed equation does not.

**Upgrade:** show an actual bridge from gross loss through adjustments and recovery stages to the final net amount. **Accept when:** displayed arithmetic reconciles in minor units, each component has a definition and drilldown, and a stage that is not part of the calculation is not presented as if it were. Do not force the backend into a simplified equation merely to match the current copy.

Evidence: [Reports](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/reports-desktop.png), [named report](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/named-financial-report.png).

### F11 P1 Stop presenting exposure as confirmed recoverability

**Observed:** Connor Reed's case preview shows £31,964.15 recoverable while also describing a policy outcome as not recoverable. The canonical case detail shows £0 recoverable from the provider with eligibility unavailable.

**Upgrade:** use a verified provider ceiling only when eligibility is established. Otherwise distinguish exposure, potentially eligible value, and unknown eligibility. **Accept when:** preview and detail use the same case calculation and truth state; an unavailable ceiling cannot fall back to order value or value at risk and retain the Recoverable label.

Evidence: [Cases preview](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/cases-registry.png), [case detail](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/case-detail.png).

### F12 P1 Preserve rule meaning when opening the editor

**Observed and source corroborated:** a rule displayed as less than 50 opens with is selected. The editor expects short operator codes such as `lt`; the inspected rule uses a different representation. A mismatched native select can display its first option.

**Upgrade:** normalise supported operators at the existing rule boundary, render the actual persisted condition, and block unsupported operators explicitly. **Accept when:** open and cancel leaves the rule unchanged; a no-op save roundtrip preserves meaning; every supported operator renders correctly; unknown operators cannot silently become equality. No save was attempted, so persisted corruption is a risk to test, not an observed outcome.

Evidence: [rule registry](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/payout-rules.png), [rule editor](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/rule-editor.png). Sources: `components/rules/ConditionBlock.tsx`, `components/rules/RuleBuilderDrawer.tsx`.

### F13 P1 Keep customer and search identity attached to the route

**Observed:** Zara Marsh's evidence builder displays Maya Cheng in the breadcrumb. Search for Zara retains a Maya breadcrumb and an old search timestamp or source summary. This is visible context contamination; it is not evidence of cross-tenant data exposure.

**Upgrade:** derive the name, identifier, breadcrumb, return link, and summary from the current route entity or query. **Accept when:** two customers opened successively and in separate tabs never share stale labels; refresh and Back preserve the correct entity; unavailable identity shows a truthful fallback rather than a reference person's name.

Evidence: [customer](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/customer-profile.png), [builder](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/customer-evidence-builder.png), [search](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/search-results.png).

### F14 P1 Separate connection readiness from evidence freshness

**Observed and source corroborated:** Connected sources says five of five layers are Current, while Shopify and ShipBob are stale and Gorgias needs repair. The count measures configured capabilities, not fresh objects.

**Upgrade:** display connection, capability, freshness, and operational health as separate facts, with repair actions attached to the affected source. **Accept when:** a configured but stale provider can be Connected and Stale simultaneously without counting as current; a missing freshness observation remains unknown. Announcements and the visual rail must use the same definitions.

Evidence: [Connected sources](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/connected-sources.png), [independent B assessment](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/b/ASSESSMENT-B.md). Sources: `components/sources/SourcesOperations.tsx`, `lib/sources/evidenceReadiness.ts`.

### F15 P1 Render unknown team counts as unavailable

**Observed:** the Team error state says counts cannot be verified while its header displays zero active seats, pending invites, and owners. The underlying request timed out; the timeout cause is not assigned to the Team UI.

**Upgrade:** give summary values their own loading, unavailable, and verified-zero states. **Accept when:** a failed team read displays an unavailable count and useful retry, without implying the workspace has no owner; a successful empty fixture remains distinguishable. Apply the same rule to every registry summary.

Evidence: [Team error](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/b/screens/team-1440.png). Source: `components/settings/TeamManagementClient.tsx`.

### F16 P1 Show reset confirmation only after a request

**Observed:** the initial password-reset page shows a green link-sent status before an address has been entered or Send the link has been pressed.

**Upgrade:** separate initial, submitting, submitted, and failed states. Retain the privacy-preserving response that does not reveal whether an account exists. **Accept when:** first load has no success claim, successful request feedback follows the actual response, failures allow safe retry, and reset expiry/session information derives from the real flow. No reset email was sent in this audit.

Evidence: [initial reset](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/continued/reset-initial-confirmed.png).

### F17 P2 Make billing review complete and internally consistent

**Observed:** choosing Pro opens a review that promises a move on 18 September without restating the new price and allowances. The main billing explanation says the plan remains until provider confirmation. Initial focus remains on the underlying Choose Pro button. Escape does close this dialog.

**Upgrade:** show the current and requested plan, exact price and limits, effective-time rule, and the distinction between request and confirmation. **Accept when:** the review matches the canonical contract, discloses a limit reduction before submission, focuses inside the modal, and cancel performs no change. Do not claim all dialogs fail Escape on the basis of the Cases finding.

Evidence: [plan review](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/continued/billing-change-plan-review.png), [billing](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/billing.png).

### F18 P2 Give decisions a reliable close and focus model

**Observed:** the case decision dialog has no clear visible close control, and Escape did not dismiss it in the original interaction check. The preview close icon is a 13 by 13 pixel unnamed SVG button. Decision, ownership, and lifecycle controls compete in the review surface.

**Upgrade:** use a named close button, explicit Cancel, correct dialog semantics, focus containment, and focus return. Group consequential decisions separately from assignment and lifecycle management. **Accept when:** keyboard users can open, understand, cancel, and return to the same case; background controls are inert; close targets meet minimum size or spacing requirements; no cancellation writes a decision.

Evidence: [decision dialog](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/case-decision-dialog.png), [B measurements](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/b/ASSESSMENT-B.md).

### F19 P2 Make compact desktop investigation usable

**Observed:** at 1280 pixels the Cases preview covers valuable queue content; at 1024 the remaining registry clips names and important columns. Detail layouts compete for space instead of establishing a clear reading region.

**Upgrade:** implement the adopted compact-desktop behaviour deliberately: collapse secondary navigation, give preview a bounded width and dismiss path, and choose essential registry columns. Preserve the selected row and scroll position. **Accept when:** at 1024 and 1280, users can identify the case, amount, urgency, and next action and reach full detail without overlapping controls or obscured footers. Also test short desktop heights.

Evidence: [Cases 1280](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/cases-1280.png), [Cases 1024](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/cases-1024.png), [detail 1280](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/case-1280.png).

### F20 P2 Prevent connected source rows from shrinking through text

**Observed and measured:** at 1280 by 720, a connected-source row measures 24 pixels high while its content needs 31 to 43 pixels. Twenty-five runtime rows shrink inside a layout inherited from eight reference rows, with hidden overflow cutting off health information.

**Upgrade:** give rows a readable natural minimum height, prevent flex shrink, and allow the correct container to scroll. **Accept when:** all source name, status, freshness, and action text remains visible with 8, 25, and larger realistic row sets at supported desktop sizes; longer provider names do not reintroduce clipping.

Evidence: [Connected sources](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/connected-sources.png), [B assessment and measurements](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/b/ASSESSMENT-B.md). Source: `components/sources/SourcesOperations.tsx`.

### F21 P2 Make essential evidence readable before adding decoration

**Observed:** small uppercase metadata, clipped evidence-gate names, and dense side rails make important conditions hard to read. The case surface spends considerable space on timeline framing while gate explanations are truncated.

**Upgrade:** establish a clear order: decision question, blocking evidence, recommendation and uncertainty, then supporting history. Increase space for essential text, allow full labels, and use progressive disclosure for secondary metadata. **Accept when:** gate names, reasons, amounts, and next actions are readable without hover at each supported size. Preserve all truth-bearing fields. Readability changes to prescribed contrast or type rules must be deliberately adopted, not described as accidental regressions.

Evidence: [case evidence](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/case-detail.png), [recommendation](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/case-recommendation.png).

### F22 P2 Add semantic structure to visual tables and pages

**Observed:** Cases looks like a ledger but lacks table or grid relationships in the accessibility tree. Landing has no semantic heading or main landmark in the inspected state. Connected sources has duplicate top-level headings.

**Upgrade:** adapt the existing visual containers with correct headings, landmarks, table relationships, labels, and keyboard operation. **Accept when:** assistive technology can identify the page and read row values against headers; heading order is coherent; row and nested action activation do not conflict. Use grid semantics only if the complete grid keyboard model is implemented.

Evidence: [Cases](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/cases-registry.png), [Landing](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/a/screens/landing-desktop.png), [B assessment](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/b/ASSESSMENT-B.md).

### F23 P2 Make control appearance match behaviour

**Observed and source corroborated:** Overview's Exposure, Recovered, and Prevented segments are plain spans with no selected metric behaviour. The chart has no useful data-table alternative. Some other chart/table labels also look actionable without clear control semantics; their full click behaviour remains to be verified.

**Upgrade:** either implement the supported selection and accessible state or present the labels as noninteractive information. Add a scoped table alternative for chart data. **Accept when:** all visible controls have an action, state, keyboard equivalent, and feedback; a metric selection changes both chart and accessible data using the same scope.

Evidence: [Overview](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/continued/overview-recovered.png). Source: `components/dashboard/ExactDashboardOverview.tsx`.

### F24 P2 Explain work counts and queue scope

**Observed:** Work shows 23 tasks, a broader count of 1135 combining tasks and 1112 exceptions, and only ten initially displayed rows. Overview shows one open item and two exceptions under another scope. These numbers are not proven to represent the same population, but their relationship is not clear to a merchant.

**Upgrade:** label assigned work, workspace work, integration exceptions, filtered results, and shown rows explicitly. **Accept when:** a user can explain each count and its relationship to the active filters; Show rest states how many rows it reveals; navigation badges use a documented definition.

Evidence: [Work](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/work-queue.png), [Overview](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/continued/overview-recovered.png).

### F25 P2 Align task presentation with lifecycle

**Observed:** Decide today contains work described as closed after denial, its recovery detail has another active outcome, and a cancelled task appears under Open work in a loss detail. Demo data can be stale, but the visible labels still conflict.

**Upgrade:** distinguish task status, case decision, recovery status, and overdue follow-up. Derive eligibility for the active queue from the task's actual state. **Accept when:** cancelled or completed work is absent from open counts unless explicitly shown as historical context; an unresolved recovery follow-up explains why it remains actionable after a case decision.

Evidence: [Work](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/work-queue.png), [review destination](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/work-review.png), [loss detail](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/loss-detail-desktop.png).

### F26 P2 Make recovery stages navigable across the full queue

**Observed:** the recovery board paginates 25 routes over 15 pages. A stage may show no cards on this page while explicitly reporting hundreds on other pages. Page totals are labelled, so this is a discoverability problem rather than a proven false global zero.

**Upgrade:** make stage totals and stage selection useful across the filtered population. Use stage-specific pagination or a clear filtered list, while retaining the board where it helps. **Accept when:** a merchant can open the work represented by a stage count directly; empty-page and globally empty states are unmistakable; totals state their scope.

Evidence: [recovery board](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/recovery-board-desktop.png).

### F27 P2 Reduce competing actions in the work queue

**Observed:** a dominant dark batch-action bar appears with zero selected, every row repeats Review and Snooze, and small evidence indicators demand interpretation. Urgency, ownership, and the reason to act receive less emphasis.

**Upgrade:** lead each row with the job, reason, deadline, and owner. Reveal batch actions after selection; keep one clear row action and place secondary actions predictably. **Accept when:** the first screen answers what needs attention, why, and what happens next; selected and unselected states are distinct; no action changes its target silently when filters change.

Evidence: [Work](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/work-queue.png). Pattern reference: [Carbon data tables](https://carbondesignsystem.com/components/data-table/usage/).

### F28 P2 Organise the evidence builder around completion

**Observed:** the evidence builder mixes a large record selection region with dense gate information and limited context about the immediate missing requirement. An incorrect breadcrumb compounds the problem described in F13.

**Upgrade:** anchor the page to the correct customer and case, state the package purpose, and list missing evidence in order of actionability. Keep provenance and eligibility next to the relevant item. **Accept when:** a merchant can identify the first unresolved hard gate, open its source, and understand what will enter the pack; completeness never implies provider eligibility or successful submission.

Evidence: [evidence builder](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/customer-evidence-builder.png), [case evidence](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/case-detail.png).

### F29 P2 Make connected record gaps useful

**Observed:** order, refund, and return detail often show no retained line items; shipment detail lacks custody scans; a ticket header suggests five messages while its conversation section has zero retained messages. Large empty regions obscure what is known and what the merchant can do.

**Upgrade:** put retained facts, source freshness, source record links, and the specific missing-data explanation first. Distinguish not imported, unavailable, unsupported, and verified empty. **Accept when:** counts derive from retained data, empty sections explain the gap, and any repair or provider link is truthful. Do not fabricate messages, scans, or line items to fill the layout.

Evidence: [order](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/order-detail.png), [shipment](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/shipment-detail.png), [ticket](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/ticket-detail.png), [refund](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/refund-detail.png), [return](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/return-detail.png).

### F30 P2 Give Customers a clear primary task

**Observed:** a large No possible accounts observed panel dominates while a narrow ranking contains customer names. The page does not immediately read as a useful customer registry.

**Upgrade:** make finding and opening the right customer the primary task, then show identity links and account hypotheses in context. Keep observed identity evidence distinct from inferred relationships. **Accept when:** name, email, or order search reaches the correct scoped profile; the main empty state describes the active query; private or unavailable network signals do not imply safety or fraud.

Evidence: [Customers](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/customers-registry.png).

### F31 P2 Disambiguate repeated order references

**Observed:** the evidence builder shows repeated `ALG-048211` references with different dates and amounts, including £23,085 and £160.01. The screenshot does not establish that they are the same underlying order.

**Upgrade:** display enough source and immutable identity context to distinguish records, especially across stores or providers. **Accept when:** identical human order numbers can be told apart before selection; a source, date, and amount accompany the reference; selecting one never silently opens another. Investigate data identity separately before declaring duplicates a database defect.

Evidence: [evidence builder](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/customer-evidence-builder.png), [customer profile](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/customer-profile.png).

### F32 P2 Separate managing connections from discovering providers

**Observed:** Connected sources includes planned and unconfigured entries among its 25 rows. The catalogue's decorative totals also differ from the actual provider list. Merchants must scan unavailable products to find their failing active sources.

**Upgrade:** prioritise connected sources that need attention; keep discovery in the existing catalogue with truthful available, planned, and configured states. **Accept when:** active connection counts derive from real connections, catalogue totals derive from its actual inventory, and a planned provider never presents an actionable connection promise. Retain one provider registry.

Evidence: [connections](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/connected-sources.png), [catalogue](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/source-catalogue.png).

### F33 P2 Repair connector wizard text composition

**Observed:** permissions, history, mapping, and review screens have labels, descriptions, values, and status text running together. Dense run-on groups make it hard to distinguish an explanation from a saved choice.

**Upgrade:** give each setting a readable label, supporting description, current value, and result. Use a stable reading order and deliberate spacing within the existing owner. **Accept when:** every wizard step is readable at 1280 by 720 and 1440 by 960, keyboard focus is visible, and long provider text cannot overlap controls or merge visually with status.

Evidence: [permissions](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/connector-permissions.png), [history](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/connector-history.png), [review](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/connector-review.png).

### F34 P2 Make setup progress represent completed work

**Observed:** seven source-setup steps include screens that cannot be configured before authentication. Capability mapping can appear complete without a verified sample. Onboarding also offers setup stages while the working demo lives on another local origin.

**Upgrade:** ask only for choices that matter at the current step. Distinguish supported capability, authorised access, imported sample, and verified operational readiness. Resume from real persisted progress. **Accept when:** a step cannot be marked verified by merely viewing it; blocked actions explain the prerequisite; completing setup leads to the next real merchant task. Provider authentication and activation were not executed in this audit.

Evidence: [setup](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/connector-setup.png), [mapping](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/connector-mapping.png), [activation](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/connector-activate.png), [onboarding](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/continued/onboarding-alternate-origin.png).

### F35 P2 Explain source permissions in merchant terms

**Observed:** a source detail shows Read and write and an enabled write capability while the operational copy says issuing a refund is forbidden or unsupported. A write capability might refer to another technical operation; it does not prove refund execution exists.

**Upgrade:** state the exact permitted operation and direction, separating reading evidence, managing subscriptions, preparing a handoff, and executing an external action. **Accept when:** connection review, source detail, and help agree; a generic Write badge cannot imply a refund or claim capability that the provider contract does not support.

Evidence: [Shopify source detail](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/source-detail-shopify.png).

### F36 P2 Remove appearance choices that do not produce an appearance

**Observed:** the original audit selected Dark, but the page remained visually light; it then restored Light. The account surface offers Dark and Match the system as usable preferences.

**Upgrade:** expose only an actually supported appearance, or explicitly explain unavailable choices. Do not build an extra theme as an incidental fix while the adopted visual authority specifies one presentation. **Accept when:** each selectable option has the stated visible effect and persists as described, or is removed from the active choice set. Theme variants require their own deliberate adoption and full coverage if commissioned later.

Evidence: [Account](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/settings-account.png), [Dark selected](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/settings-dark.png).

### F37 P2 Make settings location and navigation predictable

**Observed:** the Settings Notifications link leads to the inbox while preferences live elsewhere; some settings surfaces retain an Overview-like active context. Permission wording around financial close and workspace roles is not consistently expressed.

**Upgrade:** separate Inbox from Notification preferences, reflect the actual selected route, and name abilities using the implemented permission model. **Accept when:** every settings destination highlights its actual section; Back returns to the prior context; role-sensitive actions and help use the same permission meaning. The audit does not establish an authorisation vulnerability.

Evidence: [notification preferences](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/settings-notifications.png), [platform defaults](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/settings-platform.png), [roles help](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/help-roles-permissions.png).

### F38 P2 Give account identity and session actions one home

**Observed:** the shell displays Rahul Mehta while the account and Team refer to the demo identity. The shell profile goes to Team, and a clear signed-in sign-out action was not found in the inspected navigation. This is a discoverability finding, not proof that the backend lacks logout.

**Upgrade:** provide one recognisable account menu with the actual signed-in identity, workspace context, account settings, and Sign out. **Accept when:** identity agrees across shell and account views, switching context cannot retain the reference person, and session actions are keyboard discoverable. Verify sign-out in a disposable session without disrupting another active audit session.

Evidence: [Account](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/settings-account.png), [Team](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/settings-team.png).

### F39 P2 Make security posture claims actionable and verifiable

**Observed:** Account says two-factor authentication is required for owners and admins, shows Not configured, and provides no visible enrolment action. Team security coverage is unavailable. These screens do not prove whether enforcement is present elsewhere.

**Upgrade:** derive security state and allowed next steps from the actual account and enforcement contract. **Accept when:** required, enrolled, unavailable, and unsupported have distinct presentation; a supported enrolment or recovery path is reachable; unsupported enforcement is not advertised. Investigate enforcement separately rather than declaring this screenshot a security exploit.

Evidence: [Account](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/settings-account.png), [Team](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/settings-team.png).

### F40 P2 Align account form units and promises with behaviour

**Observed:** Monthly order volume has a saved Over 250000 per year option. Primary loss concern promises to order Work when nothing else is urgent, but this audit did not establish that sorting behaviour.

**Upgrade:** normalise and explain migrated units without silently reinterpreting a saved value. Only describe effects the product actually implements. **Accept when:** monthly and yearly values cannot be confused on load or save; invalid legacy values request a clear correction; the queue-ordering claim has a meaningful behavioural test or is removed.

Evidence: [Account](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/settings-account.png).

### F41 P2 Make notifications specific and delivery claims honest

**Observed:** notifications repeat generic messages, include raw amounts such as £256720.00, and the digest preview exposes route-like text and identifiers. A scheduled digest presentation conflicts with the explicit statement that email delivery is disabled.

**Upgrade:** identify the case or source, explain what changed, state urgency and ownership, format amounts consistently, and link to the relevant action. Present a preview as a preview until scheduling and delivery exist. **Accept when:** no disabled channel implies an active schedule; each notification has a useful destination; preferences clearly apply to future events and the current account.

Evidence: [Inbox](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/notifications.png), [digest preview](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/digest-preview.png), [preferences](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/settings-notifications.png).

### F42 P2 Scope audit summaries to the displayed evidence

**Observed:** the audit log mixes a Last 24 hours presentation with 200 entries over 30 days and larger category counts. Decorative role-change dates and owner summaries also disagree with current Team context.

**Upgrade:** state which values cover the full filtered population and which describe the loaded page. Bind dates and actor summaries to real audit evidence. **Accept when:** changing the interval updates both summary and rows; counts carry their denominator; missing actor data remains unavailable; event detail clearly distinguishes a request from a completed operation.

Evidence: [Audit log](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/audit-log.png).

### F43 P2 Turn upload emptiness into a useful first step

**Observed:** Imports and Agreements use large empty multi-column layouts that give little practical help on what a useful first file looks like. Their actual empty state is undermined by example summaries elsewhere.

**Upgrade:** show accepted formats, required fields or document purpose, a safe sample or mapping explanation, and the actual review process. Preserve the distinction between an uploaded agreement candidate and approved terms. **Accept when:** users can predict validation, retention, and review outcomes before choosing a file; no upload implies approval, provider connection, or completed reconciliation. Upload and ingestion were not executed in this audit.

Evidence: [Imports](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/continued/imports-confirmed-empty.png), [import dialog](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/import-upload-dialog.png), [Agreements](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/agreements.png), [agreement dialog](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/agreement-upload-dialog.png).

### F44 P2 Separate privacy tasks by subject and consequence

**Observed:** raw identifier input and ERASE sit alongside workspace deletion in a permanently prominent area. The UI honestly disables unsupported preview work, but the hierarchy makes safe investigation and destructive intent difficult to distinguish.

**Upgrade:** begin with identifying the subject and showing verified scope, then present the supported review and consequence. Place workspace deletion in a clearly separate, deliberate path. **Accept when:** a user can tell subject erasure from account or workspace deletion; unavailable preview blocks destructive confirmation; permissions, confirmation text, cancellation, and audit receipts match the real action. No privacy action was performed, and this is not a legal compliance assessment.

Evidence: [Data privacy](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/data-privacy.png).

### F45 P3 Connect help to the actual blocked task

**Observed:** Help explains important money and provider distinctions well, but API guidance refers to Scale while billing uses Enterprise. A reconciliation matching link leads to case-investigation guidance. Some copy describes how the product wants to be used rather than answering the merchant's immediate question.

**Upgrade:** use current plan and permission names; link each blocked action to the specific relevant explanation and next step. **Accept when:** contextual links land on the promised topic, examples use current UI labels, and unsupported features do not acquire a help article that implies they work.

Evidence: [API help](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/help-api-access.png), [reconciliation](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/reconciliation-desktop.png), [help index](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/help-index.png).

### F46 P1 Make the public demo causally coherent

**Observed:** demo stages change parcel facts, including weight and delivery location. Direct navigation to Decision says the visitor chose to refund even though no choice was made in that navigation sequence. This audit does not claim a newly reproduced Deny click failure.

**Upgrade:** use one shared fixture state per case, make choices drive the subsequent explanation, and label external progress as simulated. A directly opened later stage must explain its predefined example state. **Accept when:** every stage uses identical source facts, decisions remain distinct from provider results, and the demo makes no provider, database, billing, or customer-contact mutation. Keep the agreed three focused demo cases and the desktop-only boundary.

Evidence: [demo context](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/a/screens/demo-context-desktop.png), [recommendation](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/a/screens/demo-recommendation-desktop.png), [decision](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/a/screens/demo-decision-desktop.png), [recovery](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/a/screens/demo-recovery-desktop.png).

### F47 P3 Shorten the public explanation around merchant value

**Observed and proposal:** the landing page repeats large blocks, contains substantial empty vertical space, and asks readers to absorb dense operational language before seeing the core task clearly. Example figures can read as substantiated customer outcomes if their status is not explicit.

**Upgrade:** lead with the merchant problem, show a short evidence-to-decision-to-outcome example, explain the boundaries, and give one primary desktop next step. Retain useful detail further down the page. **Accept when:** every performance claim has an approved evidential basis or is labelled illustrative, repeated sections earn their place, and the public story agrees with the actual product. Validate comprehension with merchants before claiming conversion improvement.

Evidence: [full landing page](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/a/screens/landing-desktop.png).

### F48 P2 Keep incomplete claim narratives usable and truthful

**Observed:** File a claim correctly disables submission with unresolved hard gates, but the generated draft includes phrases such as a tracking reference unavailable being observed on unavailable. This makes incomplete data look like a partially authored factual statement.

**Upgrade:** omit unsupported assertions, identify missing narrative inputs explicitly, and separate a working draft from an exportable or submittable pack. **Accept when:** incomplete evidence produces a clear checklist rather than invented narrative; only supported facts appear in the final pack; provider rules, eligible ceiling, and submission state remain distinct. Preserve the existing blocked-submit behaviour.

Evidence: [File a claim](../../artifacts/merchant-uiux-audit-2026-09-06/evidence/screens/recovery-file-claim.png).

## 5 The merchant experience to build

The organising question is what the merchant needs to do next and what evidence justifies it. Keep the existing product capabilities; improve the handoffs between them. Do not remove difficult financial distinctions or block useful expert work merely to create a cleaner screenshot.

| Merchant job | Proposed primary path | What completion should mean |
| --- | --- | --- |
| Start the day | Overview to scoped Work view to selected task | The merchant knows urgency, ownership, evidence quality, and the next action |
| Investigate a case | Cases to bounded preview to canonical detail | The same customer, case, amounts, source facts, and gate states remain attached throughout |
| Record a decision | Evidence and recommendation to explicit merchant review | A recorded decision has an actor, reason, time, and outcome; external execution is shown separately |
| Recover an eligible loss | Recovery stage to route detail to supported claim preparation | The merchant understands the ceiling, missing evidence, provider action, and follow-up state |
| Explain the month | Scoped financial summary to supporting records to reconciliation review | Every figure has a definition, period, currency, evidence trail, and honest completeness state |
| Repair missing evidence | Contextual gap to source detail to repair or import guidance | The user knows which source failed, what repair changes, and how success will be verified |

These paths are proposed acceptance tasks, not measured usability results. Observe merchants doing them with realistic fixtures before claiming time savings. Compare task success, wrong-record selections, scope misunderstandings, backtracking, and time to the first correct next action against the current interface. Set improvement targets after the baseline is measured; do not invent a universal three-click rule or a conversion uplift.

### Visual and interaction direction

| Area | Upgrade direction | Guardrail |
| --- | --- | --- |
| Page hierarchy | One clear page title, scoped summary, primary working area, and subordinate context | Keep the current visual owner; remove duplicate chrome rather than adding another shell |
| Typography | Give essential evidence and actions more reading space; reserve compact mono text for identifiers and figures | Do not use tiny uppercase text for the explanation a decision depends on |
| Density | Offer readable rows and deliberate compact desktop columns | Do not compress live rows until text disappears or remove supporting facts for symmetry |
| Spacing and alignment | Align labels, values, units, and actions consistently; let long descriptions wrap | Empty space should separate tasks, not conceal missing or unsupported content |
| Colour and emphasis | Use existing restrained emphasis for priority and selection; add text or icons to status distinctions | Colour alone cannot establish health, eligibility, danger, or success |
| Icons | Keep the adopted icon language; name icon-only controls and enlarge their interactive area | A visual glyph is not an accessible button by itself |
| Tables and boards | Preserve headers, selection, scope, and navigation while making row and batch actions predictable | A page-local board count must not masquerade as a whole-stage view |
| Feedback | Provide pending, completed, blocked, and failed states near the action with persistent detail when needed | Never show success before confirmation or infer external success from a local request |
| Motion | Use brief state transitions to explain opening, selection, and progress where useful | Respect reduced motion; no animation should delay triage or imply work has completed |
| Empty and error states | Explain what is absent, why, and the most useful supported next step | Unknown is not zero; an error screen should preserve safe context and a retry path |

## 6 Implementation order and exit checks

Keep each phase reviewable. Reproduce the relevant baseline before changing it and attach the before and after evidence to the finding IDs. A visually attractive page does not close a finding whose meaning or interaction is still wrong.

### Phase 1 Resolve truth and authority

Address F02 through F16 and F46 first, along with the desktop policy decision in F01. Trace commercial terms, money definitions, query scope, entity context, source health, and rule operators to their current owners. Resolve the intended behaviour in existing authorities where the current contract is ambiguous. Remove example facts from runtime content without altering the adopted visual structure unnecessarily.

Exit when pricing and billing agree, the cited financial contradictions reconcile, no-op rule editing preserves meaning, names follow their route, and stale or unavailable data has honest labels. Use isolated fixtures and persisted read-back for mutations. A screenshot alone cannot prove rule or billing correctness.

### Phase 2 Stabilise the supported desktop workspace

Complete F01 and F17 through F23, plus account navigation in F37 and F38. Establish a shared support boundary, compact desktop layouts, dialog behaviour, table semantics, useful targets, and functional controls. Keep desktop zoom and keyboard usability in the verification matrix.

Exit when the primary merchant journeys work at 1024, 1280, and 1440 widths and short desktop heights without clipped essential content, inaccessible dismissal, or hidden actions. Unsupported devices consistently receive the desktop notice and cannot enter a functional mobile journey.

### Phase 3 Improve operational task completion

Address F24 through F35 and F48. Make Work, Cases, Customers, connected records, source repair, and recovery support the next useful action. Preserve evidence completeness, eligibility, provider state, and money outcomes as different concepts.

Exit when each proposed merchant task can be completed with coherent entity and scope context, truthful missing-data explanations, and clear handoffs. Compare against the baseline and record remaining friction. Do not equate a provider simulation with live-provider proof.

### Phase 4 Align setup and supporting surfaces

Address F36 through F45 and F47. Finish forms, account settings, security posture, notification delivery, audit summaries, imports, agreements, privacy, help, and public explanations. Reuse the same commercial and support contracts.

Exit when every available choice has the stated effect, unavailable functions are explained, form units are consistent, and public promises match the implemented product. Avoid building new backend capabilities merely to justify an existing decorative control.

### Phase 5 Complete independent acceptance

Run the current manifest's full route and state coverage with appropriate local fixtures, role variants, direct URLs, desktop sizes, and meaningful interaction checks. Record state-specific evidence and failures. Obtain a fresh independent review; the interrupted A review and bounded B review do not fulfil that gate.

Exit when every required scenario has current evidence or an explicitly accepted exclusion, every P1 is resolved, and remaining P2 or P3 work is consciously dispositioned. Keep local UI acceptance, provider integration proof, build and deployment checks, and release approval as separate conclusions. Do not reuse earlier 222-scenario acceptance as proof for this 223-scenario manifest.

## 7 Acceptance checklist

All 180 boxes below are deliberately unchecked. They describe what an upgraded product must demonstrate; they are not 180 independently observed defects. Use finding IDs and the current scenario ledger to attach evidence. Mark a box only after its actual behaviour has been verified.

### Desktop support

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

- [ ] C172 Capture the dirty baseline and preserve unrelated work throughout implementation.
- [ ] C173 Verify loading, empty, unavailable, stale, error, denied, and success states independently.
- [ ] C174 Test safe retry, refresh, Back, direct URLs, and multiple tabs without stale entity context.
- [ ] C175 Keep success feedback dependent on the actual result; test premature reset and billing confirmations.
- [ ] C176 Use disposable local fixtures, exact cleanup, and persisted read-back for consequential actions.
- [ ] C177 Exercise every current manifest route and scenario or record an explicit accepted exclusion.
- [ ] C178 Run relevant automated checks plus rendered browser checks without treating either as a substitute for the other.
- [ ] C179 Obtain independent review and distinguish local UI acceptance from provider, deployment, and production evidence.
- [ ] C180 Deliver before and after evidence, resolved finding IDs, remaining blockers, and one updated canonical implementation status.

## 8 Coverage and remaining verification

The teardown inspected all major merchant areas and their available demo states. Persisted visual evidence covers 56 of 65 page modules. The scenario ledger conservatively records 69 scenarios with an inspected state, three partly inspected composite scenarios, and 151 not exercised. An inspected state is not an interaction or release pass. The audit did not exercise every permission, loading boundary, mutation, or provider workflow. The full machine-readable coverage files accompany this report so a later implementation can close the actual gaps rather than infer coverage from screenshot volume.

| Area | Inspected evidence | Important remaining work |
| --- | --- | --- |
| Public and entry | Landing, pricing, five demo stages, signup, initial reset, expired reset session, four legal pages | Signed-out login, submit and error states, all demo decision branches |
| Onboarding | Commerce selection and store profile; desktop and unsupported narrow viewport | Provider authorisation, helpdesk setup, verified completion, resume and failure paths |
| Overview and Work | Populated summaries and queues; work review destination; global search and command palette | Saved-view persistence, loading and failure fixtures, full keyboard and role checks |
| Cases | Registry, preview, six detail tabs, decision dialog, compact desktop widths | Decision persistence and reversal, all investigation overlays, permission and failure states |
| Customers and records | Registry, profile, evidence builder, order, refund, return, shipment, ticket | Dispute detail, alternate entities, evidence generation, notes, denied and missing records |
| Money | Loss list and detail, write-off review, recovery board and detail, claim form, outcome review | Persisted write-off and outcomes, all filters and exports, provider and bank evidence |
| Reconciliation and reports | Period-close review, main reports, supporting records, filters, named financial report | Period-switch behavioural acceptance, real matching and close fixtures, exports and error states |
| Controls | Rules registry and editor, recovery rulebook, empty Flows, new-flow dialog, empty run registry | Operator roundtrip, simulation and publication, populated flow detail and run detail |
| Sources | Connections, catalogue, Shopify detail, seven BigCommerce setup steps, ShipBob selection, empty Imports and upload dialog | OAuth, repair and disconnect outcomes, populated import job, validation and retry fixtures |
| Settings | Account, appearance selection, Team normal and error, invite review, platform, preferences, API gating, audit, privacy, agreements, billing review | Actual save/error/rollback, ownership transfer, API keys, destructive and billing outcomes |
| Notifications and help | Inbox, digest preview, eight help articles | Full preference persistence, delivery implementation, all article and unavailable variants |
| Shared and exceptional states | Command palette and desktop-required boundary; one independently captured Team error | Root/global errors, not-found families, loading skeletons, all role and access boundaries |

Routes without a settled, persisted screenshot in this set include `/login`, `/disputes/[id]`, `/controls/flows/[flowId]`, `/controls/flows/runs/[runId]`, `/sources/imports/[jobId]`, and the four page-module adapters `/controls`, `/financials`, `/sources`, and `/customers/[id]/claims`. The root redirect is also mapped separately by the manifest. Do not count `/controls/flows/runs` as a populated flow workbench or `/sources/imports` as an import-job detail.

Several of these gaps need a purpose-created record or a separate signed-out session. Missing records were not fabricated by clicking production-style actions solely to obtain a screenshot. A later fixture-backed acceptance pass must cover them. Desktop zoom, screen-reader operation, broad contrast measurement, full keyboard traversal, and production performance remain unverified. The current narrow captures are evidence for the desktop support boundary, not a request for a mobile application.

Capture metadata in the interrupted task contains a few duplicate or transient entries. The evidence index uses the last recorded state for a repeated capture name and checks the surviving PNG and DOM. Coverage remains conservative: one route screenshot does not verify that route's errors, overlays, permissions, or write behaviour.

## 9 Other issues encountered

| Issue | Evidence and effect | Disposition |
| --- | --- | --- |
| Frozen original task | The original task did not produce a final report and its A review remained incomplete | Evidence recovered; this document completes the report, not the missing acceptance runs |
| Local runtime failure | B recorded incomplete chunked responses, connection refusal, and navigation timeouts during the expanded pass | Original task restarted a lower-memory Turbopack development server; do not call this a measured production-performance defect |
| Local origin session divergence | Localhost opens Asterlane operations while 127.0.0.1 opens onboarding | Both outcomes observed; origin-specific sessions differ, but the underlying cause was not proven |
| Redirect-related tooling timeout | One continuation navigation expected onboarding but settled on Overview | Classified as an automation expectation/redirect mismatch, not a confirmed product crash |
| Detector limitations | One deterministic scan of 424 reachable markup files returned two Inter-font findings, both prescribed-font false positives | Zero actionable CLI findings from that scan; this does not certify rendered quality or accessibility |
| In-page detector unavailable | Browser evaluation is read-only and no supported live injection path was exposed | No overlay or in-page detector was run; the limitation was respected |
| Screenshot export limitation | The browser's content export action was unsupported | Supported screenshot bytes were saved successfully; evidence was preserved |
| Stale design sidecar | Impeccable context reports `.impeccable/design.json` older than `DESIGN.md` | Refresh from the adopted authority before implementation; do not promote the sidecar over current design rules |
| Unavailable product capabilities | API gating, email delivery, incomplete claim packs, settlement snapshots, and some flow operations are explicitly unavailable | Retain truthful blockers; improve discovery and wording instead of inventing functionality |

No product source files were intentionally edited by this audit. The inherited development server was left running. The working tree contained extensive pre-existing changes; its recovery baseline is saved alongside the evidence. No commit, push, deployment, remote migration, external message, or release approval is part of this work.

Questions skipped: the user asked to recover and complete the audit and supplied the desktop-only correction. No further design preference was needed to finish the report. The original document-template picker was declined; this report therefore uses a plain, readable document format.

## 10 Cleaned up overhaul prompt

The following is the implementation handoff to use after adopting the proposed overhaul. Providing it here does not start implementation.

### Prompt

Continue in the Unauth repository and implement the approved merchant desktop overhaul described in `docs/product/MERCHANT_UI_UX_TEARDOWN_2026-09-06.md`. Use its finding IDs, acceptance checklist, and evidence coverage as the starting backlog. The goal is a merchant experience that is more trustworthy, readable, efficient, and predictable across every supported route and state. Each change must resolve a specific problem and demonstrate an improvement without removing useful product capability.

Start by reading `AGENTS.md`, the relevant installed Next.js guides, `PRODUCT.md`, `DESIGN.md`, `ARCHITECTURE.md`, the current surface manifest, navigation and alias authorities, page inventory, and canonical billing catalogue. Record the current dirty baseline and preserve all unrelated work. Reproduce the relevant findings against the current runtime because the audit is a dated local snapshot. Separate verified defects from proposals and hypotheses.

Unauth is purely a desktop product. Apply one consistent support policy across authentication, onboarding, interactive demos, and the merchant workspace. Remove functional mobile journeys and claims that mobile workflows work. Unsupported phones and tablets must receive a compact, accessible desktop-required notice with a useful desktop link. Keep smaller supported desktop windows usable and test 1024, 1280, and 1440 widths, short heights, keyboard use, and desktop zoom. Do not treat desktop magnification as evidence that the user wants a mobile application.

Preserve the existing product model: source fact, recommendation, merchant decision, provider action, recovery outcome, received credit, matched credit, and reconciled money are distinct. Unknown, unavailable, partial, stale, and verified zero are different. Keep currency and time scope explicit, calculate in canonical minor units, and make every headline agree with its supporting records. Never manufacture provider execution, financial outcomes, messages, source evidence, or pricing terms to make a screen look complete.

Retain one visual and implementation authority. Use the adopted visual package and current owners, with targeted changes to hierarchy, layout, text, semantics, and behaviour where this overhaul justifies them. Reconcile the desktop-only requirement and any intentionally changed design rule in the existing authorities. Do not introduce a competing theme, token system, route owner, registry, or blanket string-replacement layer. Data-dependent example copy must be replaced by real scoped values or honest absence. Do not report prescribed reference styling as a new regression; document deliberate readability improvements as adopted changes.

Implement in this order: commercial and data truth; desktop shell and interaction reliability; operational investigation and recovery; setup and supporting surfaces; then complete independent acceptance. Prioritise the pricing and credit mismatch, loss scope and amount contradictions, reconciliation period handling, money-stage labels, rule operator preservation, incorrect customer context, false source freshness, unavailable counts rendered as zero, premature reset success, and causally inconsistent demo states.

For visual changes, capture the baseline and revised state at matching desktop sizes and with realistic content. For behavioural changes, verify the actual result, not just the click or animation. Test dialogs, keyboard focus, cancel paths, table semantics, selection scope, loading, empty, unavailable, stale, error, denied, and success states. Preserve filtered context across registry, preview, detail, Back, refresh, and shared URLs. Keep every consequential action explicit about its target, consequence, and confirmation state.

Use purpose-created disposable local fixtures for mutations, with exact cleanup and persisted read-back. Do not submit claims, refund, change billing, invite people, connect providers, delete data, publish operating policy, or contact external parties using real accounts merely to obtain visual evidence. Respect existing safety guards. When a supported capability is blocked, improve its honest explanation and record the dependency; do not fake completion or quietly add a new backend product.

Work through the current manifest rather than a representative set of pages. The audit snapshot contains 65 page modules, 120 surface owners, and 223 scenarios, but regenerate those counts before use. Include populated flow and import-job detail, disputes, auth failures, role variants, adapters, global errors, and all relevant overlays that the audit did not finish. A route screenshot is not proof of all its states. Keep the coverage ledger explicit about observed, tested, blocked, and excluded states.

Run the tests and checks relevant to each change and complete the repository's applicable acceptance gates. Add meaningful tests for changed behaviour, including no-op rule roundtrips and financial scope consistency. Do not add shallow tests that merely mirror presentation code. Obtain independent visual and interaction review when the implementation is ready. Distinguish local synthetic acceptance, real-provider evidence, deployment readiness, and production readiness.

Finish with one canonical status update that lists implemented finding IDs, before and after evidence, behavioural verification, exact coverage, remaining issues, and any blocked dependencies. Explain why each changed flow is an upgrade. Do not claim the overhaul is complete while a P1 remains unresolved or a required state is silently untested. Do not commit, push, deploy, run remote migrations, or declare release approval without the user's corresponding instruction.
