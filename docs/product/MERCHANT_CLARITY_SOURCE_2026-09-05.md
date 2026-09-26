# Historical merchant clarity handoff source

Status: preserved source evidence from 5 September 2026; superseded for execution.

Recovered from the complete original inline handoff in task `01a06f22-ec9e-7da1-a4a5-7586617c2674`. The original plan body follows unchanged; conversation wrappers and its old memory citation are omitted. In particular, the historical 390-pixel workflow requirement below is superseded by the later desktop-only decision.

Use [GLOBAL_RULES.md](../../GLOBAL_RULES.md) for permanent app-wide rules and [MERCHANT_CLARITY_IMPLEMENTATION.md](MERCHANT_CLARITY_IMPLEMENTATION.md) for current implementation. This file cannot authorise work or override them.

---

# Unauth MVP+ — Merchant Clarity and Decision Workflows

## 1. Objective and implementation boundaries

Implement all four improvements:

1. A clearer landing page and three genuinely interactive demonstrations.
2. Resolution comparison inside case review, including a complete manual replacement workflow.
3. A preview showing how proposed policies change recommendations.
4. Actionable carrier, SKU and warehouse claim patterns.

Also correct the defects below.

**Success means a merchant can understand the value, compare a decision, trace its evidence, prepare the next action and distinguish potential recovery from money actually received.**

### Scope rules

- Extend existing cases, rules, evidence, Work, recovery and reconciliation capabilities. Do not rebuild them.
- Retain the current visual style, typography, colours and application shell. Layout and copy changes are permitted on the affected surfaces.
- Maintain [PRODUCT.md](/Users/malikibrahim/Downloads/Unauth/PRODUCT.md), [DESIGN.md](/Users/malikibrahim/Downloads/Unauth/DESIGN.md) and [ARCHITECTURE.md](/Users/malikibrahim/Downloads/Unauth/ARCHITECTURE.md) as canonical authorities. Register this implementation scope and its limited visual exceptions.
- Update affected visual references and verification expectations. Do not disable visual verification or introduce competing renderers.
- Preserve unrelated work already present in the repository.
- Read the repository’s local Next.js guidance before implementation.
- No automatic refunds, replacement orders, claim submissions, customer messages or partner contact.
- No new AI assistant, identity network, statistical prediction engine or integration expansion.
- Deployment and existing external release requirements remain separate.

## 2. Confirmed issues to fix

The public demo defects were observed in the running app. The other findings were established through source inspection.

| Issue | Required correction |
|---|---|
| Demo choices are inert, but the next screen announces a refund decision. | Implement actual branching. Never announce an unmade choice. |
| The same demonstration changes evidence facts between screens. | Use one shared scenario model. |
| The demo requests a photo after explaining that the photo cannot exist. | Offer only feasible evidence requests. |
| Public copy describes automatic claim submission and Shopify staging that the demonstrated flow does not perform. | Describe prepared manual actions accurately. |
| Synthetic figures appear as recovery benchmarks, typical merchant results or implied savings. | Remove unsupported claims; label illustrative figures beside their use. |
| Public pricing advertises £99/£249 and case-based credits, conflicting with the canonical £249/£599 catalogue and operation-based credits. | Render commercial terms from the canonical catalogue. |
| Identity-match confidence appears as general decision confidence. | Label identity confidence precisely; show evidence completeness separately. |
| Rule reorder preview substitutes zero for unavailable evidence/history and lacks safe currency semantics. | Preserve unknown inputs and bind monetary conditions to explicit currencies. |
| Reports labelled “By carrier” and “By SKU” display different underlying measures. | Provide the named groupings or explicit unavailable states. |
| Reported issue types become asserted warehouse/vendor causes. | Separate reported issue, association and confirmed responsibility. |
| Confirmed loss is labelled absorbed loss. | Use the actual financial stage represented by each metric. |
| Onboarding contains fixed timing/verification claims and duplicate destination buttons. | Derive status and the next action from actual connection/import state. |

**Implementation hazard:** generic approval currently prepares a refund handoff. Replacement must receive explicit action semantics throughout persistence and downstream processing before its confirmation button is enabled.

## 3. Landing page: explain the merchant outcome

### Required copy

**Headline:**  
“Decide claims confidently. Know who owes you.”

**Supporting copy:**  
“Unauth brings orders, support conversations and delivery evidence into one case. Compare refund and replacement options, record your decision, prepare recovery work and track what actually comes back.”

**Primary action:** “Explore three sample cases”  
**Secondary action:** “Create a workspace”

**Capability statement:**  
“Unauth gathers evidence, records your decision and prepares the next step. Refunds, replacements and claim submissions are completed in your existing tools.”

### Required page order

1. Headline, supporting copy and concise product preview.
2. Three selectable examples: legitimate claim, duplicate payout, recoverable fulfilment loss.
3. Resolution comparison: show the decision and the evidence that changes it.
4. Process: gather evidence → record decision → prepare action → verify outcome.
5. Policy preview and claim-pattern examples, clearly labelled sample data.
6. Source coverage/freshness, current capability statement and final CTA.

The page should explain operational value before presenting detailed audit terminology.

### Must not do

- Call synthetic data a “real case.”
- Promise seven-year retention, setup times, recovery rates or typical financial results without an approved factual basis.
- Imply that an installed connector is healthy, complete or authorised to execute actions.
- Imply that Unauth universally intercepts refunds initiated elsewhere.
- Present future AI execution as available today.
- Make unsupported superiority claims about competitors.

A subordinate future-direction sentence may describe support for authorised AI workflows over time. It must not contradict today’s manual execution boundary.

## 4. Interactive demo: three cases, real choices

Each case uses **Inspect → Decide → Outcome**.

The visitor must see meaningful consequences from their choices. All records remain explicitly simulated.

### Fixed scenarios

| Case | Example facts | Available decisions | Demonstrated outcome |
|---|---|---|---|
| Legitimate claim | £96 order; matching damage photograph; no previous concession; example policy permits refund or same-item replacement. Replacement example cost: £28 goods plus £5 shipping. | Refund; replace; request review. | Decision and manual handoff first. Separate simulation controls record an observed refund or replacement dispatch. |
| Duplicate payout | £128 order; an earlier £128 refund is confirmed; the new request covers the same items. | No additional payout; escalate; goodwill exception with required rationale. | Show £128 duplicate exposure identified. A goodwill exception prepares another £128 refund; only a separate simulated observation raises total refunds to £256. |
| Recoverable fulfilment loss | £248 refund request; example packing evidence and warehouse acknowledgement; fictional agreement caps recovery at £150. | Refund and prepare recovery; request review. | Refund and recovery advance separately. Final example: £248 refunded, £150 reconciled recovery, £98 unrecovered refund balance. |

These facts, costs, agreements and acknowledgements are fictional. The £98 balance is **not** total economic loss or profit.

### Interaction rules

- Selecting an option opens a confirmation explaining the decision and prepared next action.
- Confirming records only the simulated merchant decision.
- External progress requires explicit controls such as **“Simulate refund observed”** or **“Simulate replacement dispatched.”**
- Recovery advances separately through prepared, submitted, approved, received, matched and reconciled.
- Approval does not increase received money. Receipt does not increase reconciled money.
- Repeated clicks cannot duplicate events or amounts.
- Requesting review leaves the case unresolved.
- After recording a decision, changing it requires **Reset this case**.
- Never show “You chose…” before a recorded choice.

### State and navigation

- Use one versioned scenario authority for every screen, landing preview, amount and event.
- Reuse applicable pure domain calculations; do not duplicate financial logic.
- Store demo progress locally, keyed by scenario version and case ID.
- URLs contain only recognised case and step identifiers.
- Back, Forward, refresh and case switching preserve valid progress.
- Reset clears only the selected case.
- An outcome deep link without a decision returns to Decide with an explanation.
- Unknown parameters open the legitimate case at Inspect.
- Preserve old demo links through explicit step mapping; never fabricate prerequisite decisions.
- Completion offers **Try the next case** and **Create a workspace**.

**Acceptance:** every branch works without account changes, database writes, provider calls or billing events.

## 5. Case review: compare resolutions and complete manual replacements

### Resolution comparison

Place comparison beside the existing recommendation in canonical case detail.

Offer:

- Refund, including supported partial refunds.
- Same-item replacement.
- Request feasible evidence.
- Escalate.
- No additional payout when an existing concession makes that relevant.

For each option show:

| Information | Required behaviour |
|---|---|
| Customer resolution | State exactly what the customer would receive. |
| Immediate amount/cost | Show known components, currency and missing components. |
| Cost basis | Distinguish source facts, merchant estimates and retail value. |
| Eligibility | Explain policy conditions and unresolved restrictions. |
| Evidence | Show supporting facts, contradictions and material gaps. |
| Next action | State what recording the decision will prepare. |
| Recovery | Show eligibility, supporting terms and known deadline separately. |

Reuse existing persisted cost fields and expose them through the decision context. Do not create a second cost registry.

**Unknown cost is not zero. Retail price is not replacement cost. Speculative recovery must not reduce displayed immediate cost.**

Do not sum mutually exclusive options, automatically recommend the cheapest option, invent customer lifetime value or introduce an unvalidated fraud probability.

### Recording a decision

Selecting an option only prepares the existing review boundary.

Final confirmation must validate:

- User permission and merchant ownership.
- Current case, evidence and policy versions.
- Exact financial amount/currency where applicable.
- Required rationale and any policy exception.
- Idempotency and concurrent changes.

A stale comparison must refresh before submission. Preserve the compared facts and selected resolution in the immutable decision record.

Non-financial evidence requests must not require a fabricated payout amount.

### Complete manual replacement flow

Support **same SKU/variant, same order and confirmed claimed items**.

Do not support substitutions, exchanges, address changes, stock reservation or automatic order creation in this scope.

Requirements:

1. Confirm affected order lines using the existing item-matching workflow.
2. Require positive integer quantities and reject duplicate line identifiers.
3. Reject quantities exceeding eligible claimed/ordered quantities after confirmed replacements and outstanding replacement authorisations.
4. Surface prior refunds as a duplicate-concession conflict requiring explicit justification.
5. Require a known currency and nonnegative authorised replacement-cost budget. Merchant estimates are permitted when clearly labelled.
6. Carry an explicit replacement action through validation, persistence, audit events, read models and handoff preparation.
7. Preserve existing approval semantics for legacy records. Never reinterpret historical generic approvals as replacements.

The handoff contains the original order reference, confirmed items/quantities, authorised budget, rationale and manual instructions.

Provide:

- **Copy instructions**
- **Open original order**
- **Record external reference/receipt**

Copying instructions or opening Shopify does not complete a replacement.

A receipt entered by an operator is **merchant-confirmed**, not provider-observed. Subsequent source evidence may corroborate it without creating a duplicate outcome or ledger entry.

Authorisation, dispatch, economic cost and recovery remain separate. Correcting an authorisation does not claim to recall an external shipment.

**Acceptance:** replacement never produces a refund handoff, including after retries, reloads and partial failures.

## 6. Policy preview: “What would change?”

### Required capability

Add **Preview impact** to rule creation, editing and reordering.

Compare:

> Current published policy versus proposed policy, using facts available now.

Evaluate the proposed change within the complete ruleset, preserving priority and existing matching semantics.

This is a current-evidence comparison. Do not describe it as reconstructing historical decisions.

### Scope and results

- Default period: 30 days; options: 7, 30 and 90 days.
- Maximum: 500 cases per run.
- If the scope exceeds the maximum, require narrowing it. Do not silently sample.
- Freeze the run’s cutoff, policy versions and case/source versions.
- Display 50 result rows per page.

Show:

- Number of cases evaluated.
- Unchanged and changed recommendations.
- Cases with insufficient evidence.
- Before/after recommendation counts.
- Affected exposure, separated by currency.
- Per-case before/after rules, reasons and missing inputs.
- Links to canonical case evidence.

Call money **affected exposure**, never savings.

### Missing data and currencies

- Unavailable evidence/history remains unknown.
- If missing inputs could change the winning rule, mark the result insufficient evidence.
- Exclude uncertain comparisons from definite-change totals.
- Known irrelevant gaps must not invalidate an otherwise conclusive comparison.
- Monetary thresholds require an explicit currency matching the case.
- No implicit USD conversion or foreign-exchange assumptions.
- Legacy monetary rules without a proven currency require owner confirmation before they can produce a definite monetary recommendation.
- Correct the shared live/preview interpretation; do not create a preview engine that disagrees with production.
- Preserve historical records without retroactively relabelling their currencies.

### Side-effect boundary

Preview must not refresh providers, record decisions, write financial/audit events, consume credits or publish rules.

Publishing remains a separate permissioned confirmation. Policy/draft changes invalidate the preview. Changes to relevant source facts require rerunning it before publication.

A new merchant with no cases may publish an initial policy after explicitly acknowledging that no case-based preview is available.

Do not add a new historical replay platform in this scope.

**Acceptance example:** with GBP cases of £80, £120, £130 and £180, changing a review threshold from £100 to £150 changes exactly the £120 and £130 cases. A fifth case with unknown currency is disclosed as inconclusive, not silently included.

## 7. Reports: turn claim patterns into work

### Groupings

Provide actual views for:

- Reported issue.
- Carrier.
- Affected SKU.
- Warehouse/fulfilment location.

Keep responsibility separate from association.

A damaged-item report does not prove warehouse fault. A claim associated with a carrier does not prove carrier liability.

### Relationship rules

**SKU:** reuse confirmed claimed-item links to canonical order lines. Extracted but unconfirmed text remains separately labelled.

**Carrier:** use the affected shipment established by scoped evidence or an unambiguous relationship to the confirmed affected item. Never select the latest parcel merely because it is available.

**Warehouse:** add the minimum scoped, auditable origin-location reference to the existing fulfilment/evidence model. Reuse canonical locations. Accept explicit source identifiers or operator confirmation supported by evidence.

Until that relationship exists, show **Warehouse not established**. A provider name or tracking-location string is insufficient.

Manual matching establishes the affected object, not responsibility.

### Metrics

Default to cases submitted during the last 30 days, with a fixed “as of” timestamp and explicit timezone.

Show separately:

- Distinct cases.
- Distinct linked orders.
- Known confirmed loss.
- Matched recovery.
- Known final net loss.
- Unassigned/unvalued cases and amounts.

Financial values describe currently known outcomes for the selected case cohort. They are not automatically cash movements occurring within that period.

Requirements:

- Separate currencies.
- Preserve canonical financial eligibility.
- Keep ambiguous groups visible.
- Never duplicate a case’s full monetary amount across multiple SKUs, shipments or warehouses.
- Assign group-level money only where its scope is established; otherwise keep it unallocated.
- Clearly label non-additive counts where one case belongs to multiple affected SKU groups.
- Calculate shares against the entire selected cohort, including unassigned records.
- Failed or incomplete queries must not produce complete-looking totals.

Do not introduce carrier failure rates, SKU defect rates or profitability estimates without complete, correctly matched denominators. Those rates are outside this implementation.

### Actionable findings

Show up to three **Largest recorded concentrations**.

- Default ranking: distinct case count.
- Optional ranking: known final net loss within one currency.
- A recurring finding requires at least five cases across three orders.
- Explain that this threshold is a display rule, not statistical significance.
- Keep isolated expensive cases available in the underlying table.
- Show period comparisons with sample sizes; suppress percentage changes from zero or unavailable baselines.

Each finding opens its exact case set, then canonical evidence.

Show existing Work items before offering **Create investigation**. Reuse existing task lifecycles and deduplication.

Do not automatically create tasks, change policy, assign fault, contact partners or promise recovery.

## 8. Onboarding, pricing and supporting copy

### Onboarding

Derive one primary next action from actual state:

1. Required commerce connection missing → **Connect Shopify**.
2. Import failed without usable records → **Fix import**.
3. Import running without usable records → **View import progress**.
4. Connected but import not started → **Import order history**.
5. Actionable case available → **Review your first case**.
6. Usable loss records without an actionable case → **Review imported losses**.
7. Successful empty import → **Check import coverage**, with the observed period and zero-record result.

Use existing queue priority for the first case.

Optional missing sources and held rows remain visible as secondary tasks unless they block the primary action.

Remove fixed completion times, false verification language and equivalent buttons. Do not accept an unsupported commerce platform and then silently require Shopify.

### Pricing

Use [the canonical billing catalogue](/Users/malikibrahim/Downloads/Unauth/lib/billing/plans.ts) for prices, allowances, seats, stores, features and billable events.

Preserve the current commercial terms:

- Free.
- Pro: £249/month.
- Growth: £599/month.
- Enterprise/custom.

Correct the public page’s stale prices and limits.

Remove unsupported annual discounts, popularity claims, retention promises, case-credit explanations and blanket automatic-overage claims. Explain actual enabled billing behaviour.

The new comparison, preview and reporting reads must not create new credit charges. Existing billable operations retain their existing charging rules.

Pricing links may propose a plan; they must not change a subscription.

### Cross-surface consistency

Check landing, demo, pricing, onboarding, help and affected authenticated screens for conflicting claims.

Remove stale copy from active rendering paths. Verify imports before removing unused components; do not edit an unrouted legacy component and consider the live page fixed.

## 9. Shared contracts and implementation order

### Minimum interface additions

Extend existing contracts to carry:

- Resolution/action, confirmed item quantities, authorised budget and comparison snapshot.
- Cost provenance and explicit unknown states.
- Preview scope, policy/source versions, certainty and currency-aware deltas.
- Confirmed affected-object and warehouse-origin references.
- Report grouping confidence, scope and unallocated amounts.
- Versioned demo scenarios and permitted simulated events.

These are additions to existing domain records, not new parallel systems.

All server operations retain tenancy, permissions, validation and idempotency. Existing clients and historical records remain readable.

### Implementation sequence

1. **Authority and truth corrections:** register scope; correct pricing, misleading copy, confidence labels and report naming.
2. **Decision foundations:** expose cost provenance; implement comparison and complete manual replacement semantics.
3. **Public experience:** landing and three interactive cases using the settled behaviour.
4. **Policy preview:** shared evaluation, currency/unknown handling and publication boundary.
5. **Patterns and onboarding:** evidenced relationships, real groupings, Work links and state-derived next actions.
6. **Integrated acceptance:** verify every affected flow and its failure states.

All phases are required for completion. A polished demo alone does not complete this plan.

## 10. Acceptance and completion evidence

### Required scenarios

| Area | Must demonstrate |
|---|---|
| Demo | Every decision branch; refresh/back/deep links; reset; repeated clicks; consistent facts; no external writes. |
| Comparison | Known, unknown and zero costs; policy conflict; duplicate concession; stale evidence; distinct identity/evidence labels. |
| Replacement | Partial and multi-item quantities; permission denial; cross-tenant rejection; concurrent authorisation; correct persisted action; handoff failure/retry; receipt-backed completion; no double counting. |
| Compatibility | Existing refund paths and historical records retain their meaning. |
| Policy preview | First-match order; AND/OR; unknown relevant inputs; mixed/unknown currencies; cap exceeded; stale previews; no-case publication acknowledgement; no mutations or credit charges. |
| Reports | Ambiguous shipments; unconfirmed SKU; unknown warehouse; multiple affected items; unallocated money; incomplete reads; period/currency boundaries; correct Work deduplication. |
| Onboarding | Every listed destination state, including failed, running, partial and verified-empty imports. |
| Pricing | Public terms match billing/entitlements; invalid plan handling remains safe; no URL-driven subscription mutation. |

### Verification requirements

- Run type checking, lint, relevant automated tests and a production build.
- Run authority, surface-manifest and merchant-copy checks.
- Use guarded local fixtures for mutation tests and verify persisted read-back.
- Physically test affected screens, controls, dialogs and error states.
- Verify public/onboarding layouts at 390px; authenticated layouts at 1024px, 1280px and 1440px, preserving the existing below-1024px boundary.
- Verify keyboard operation, visible focus, readable tables and non-colour status indicators.
- Update scoped visual expectations and retain regression checks for unaffected surfaces.
- Do not claim acceptance from screenshots alone, source scans alone or old test receipts.

The implementation handoff must report completed capabilities, tests actually run, remaining failures and any external release blockers separately.

**Complete only when all four improvements work through their real application boundaries and every listed defect is corrected or explicitly evidenced as unresolved.**
