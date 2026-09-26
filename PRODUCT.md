# Product

<!-- impeccable:product-schema 1 -->

Permanent app-wide constraints and conflict resolution are defined in
[GLOBAL_RULES.md](GLOBAL_RULES.md). This document owns what Unauth does when
fully built and launched for a merchant's configured, supported scope. The
**fully built launch operating model** and **launch landing story** below are
the product authority for launch-facing work. MVP, Build 1, Build 2 and status
notes describe how to deliver that product; they are not a smaller promise for
the landing page. Implementation and release evidence remain in
[MERCHANT_CLARITY_IMPLEMENTATION.md](docs/product/MERCHANT_CLARITY_IMPLEMENTATION.md)
and the registered capability and release owners.

## Fully built launch promise — 25 September 2026

Unauth automatically takes participating post-purchase claims into one case,
assembles available evidence, applies the merchant's published customer policy,
executes eligible merchant-enabled actions, and assigns every exception to an
accountable person or queue. It separately applies reviewed carrier, 3PL,
supplier or insurer terms to pursue eligible reimbursement, then verifies what
was actually received and reconciled. A customer remedy can finish while a
partner claim is still blocked or unpaid. The merchant can see exactly which
facts and rules led to each outcome, which facts are missing, what Unauth did,
what a person must do, and what money remains recorded or unresolved.
Automatic means an authorised action actually runs and its result is recorded.
A recommendation or prepared draft is a different state; reimbursement is
never guaranteed.

This launch promise covers connected accounts, case types, countries, services
and actions that the merchant has enabled within Unauth's supported scope. It
does not claim to control independent actions taken in unrelated tools or to
recover money where evidence, contractual rights or provider access are absent.
The optional cross-merchant intelligence evaluation in Build 2 is not needed
for this complete product.

## Delivery strategy and evidence context — 22 September 2026

**This section records delivery priorities and commercial hypotheses. The fully
built launch promise above and operating model below govern the landing story.**

The product is one connected, merchant-controlled workflow: **evidence → policy gate → authorised customer resolution → eligible recovery → verified financial outcome**. Deliver that whole job for a declared supported scope before broadening coverage.

This revision removes the proposed standalone operational-incident/corrective-action system and its separate premium tier. Keep lightweight case-pattern review and owned next steps in Core. Do not build carrier rerouting, warehouse-process management or a second incident workspace. The company must earn its subscription through everyday decisions, completed resolutions, recovery and financial follow-through—not a presumed frequency of major operational discoveries.

The commercial direction is a **fixed subscription with monthly or annual payment, never a percentage of recovered money**. Core includes the connected workflow. MVP, Build 1 and Build 2 below are delivery phases, not separately purchased steps or compulsory upsells. Current Core, Scale and Enterprise prices, annual equivalents and capacity are owned by `lib/billing/plans.ts`; the Core and Scale annual terms represent ten paid months for twelve months of service. Do not restore a Free public tier.

### Build order at a glance

| Phase | Deliver | Do not add |
|---|---|---|
| **MVP** | One paid-ready, supported case workflow: evidence, merchant gate, approved actions, eligible recovery and verified money. | A recommendations-only launch, broad connector catalogue or shared customer network. |
| **Build 1** | Make that same Core repeatable: bounded automation, validated additional recovery routes, better financial ingestion and embedded workflows. | A separate operational-correction product or essential-step upsells. |
| **Build 2** | Scale proven control across entities and supported AI systems; evaluate network intelligence only behind evidence/data-rights gates. | An automatic commitment to build a shared identity network. |

Detailed deliverables, acceptance checks and expansion decisions below are binding intended scope. Dates and staffing estimates must come from the repository audit, not this plan.

### Evidence and authority boundary

The owner supplied `/Users/malikibrahim/Downloads/Product.md` as the new vision and requested its authenticated MVP capabilities. The phase sequence, buyer hypothesis and commercial tests remain proposed decisions to validate, not measured market facts. Published competitor descriptions are evidence of overlap, not comparative performance.

The current implementation plan records owner mapping, observed status and
release blockers. Those observations do not narrow the fully built product
defined here. Historical presentation records remain evidence; this document
controls launch-state product semantics subject to the global rules.

## Platform

web

## Users

Unauth is used by merchant operations, loss-prevention, support and finance teams who investigate post-purchase exceptions, make evidence-backed decisions, coordinate recovery and reconcile financial outcomes.

**Initial buyer hypothesis:** established physical-goods merchants with recurring missing, incomplete or damaged-order cases, material work connecting support to recovery/finance, and a named budget owner. An existing helpdesk, returns tool or carrier portal is not a disqualifier; the merchant must identify work those tools leave unfinished. Multiple 3PLs are not required.

Qualify by actual workflow volume, available evidence, collectible opportunities and willingness to pay—not an invented revenue threshold. Do not target only a rare contractual edge case. Conversely, decline an initial deployment where the current suite already completes the agreed job adequately, required evidence is inaccessible, or implementation effort overwhelms the merchant's plausible benefit.

The US and UK are target markets, not a claim of universal launch coverage. Release specific provider/account/service/issue/country combinations with their own terms, permissions and tests.

## Product Purpose

Unauth starts with a required evidence gate: customer claims from participating tools reach it automatically before a person or external AI agent confirms a resolution. The gate evaluates supplied information, supported source records, the merchant's own customer history and versioned merchant rules. It returns a concrete route, reasons, uncertainty and the exact scope eligible for authorisation.

The case joins this checkpoint to investigation, attributable decisions and
exceptions, controlled external execution, evidenced recovery and financial
verification. Supported refunds, replacements, claim submissions and approved
messages are carried out through verified adapters. Steps outside the
merchant's configured scope become explicit, owned manual handoffs.

Customer resolution and reimbursement pursuit remain independent. Unauth must not make an otherwise permitted customer remedy wait for a carrier or supplier to accept or pay a claim. A party's involvement does not establish liability; a claimed or approved amount is not money collected.

Success means the merchant can explain the decision, verify the action, see the next recovery task, account for actual cash or applied credit, and identify the remaining recorded loss. Adoption and incremental value must be demonstrated against the merchant's real existing process.

## Positioning

**Launch promise:** “One controlled workflow from customer claim to resolution, eligible recovery and verified money back—across your existing tools, for a predictable monthly fee.”

The gate is the organising control, not a separate product. Recovering eligible money remains a primary selling point alongside fair, supported customer decisions. Evidence gathered once should support both jobs without repeated investigation or re-entry.

Do not position Unauth as a replacement helpdesk, returns portal, warehouse system, accounting package, insurer or general-purpose AI assistant. “Complete” means the complete agreed workflow within declared coverage—not every type of dispute and every provider.

### Why merchants should use Unauth

**Remove the handoffs left between existing tools.** A case should carry its evidence, merchant policy, authorised remedy, external result, recovery claim and settlement history across support, operations and finance. Each open task has an owner and next action. A second dashboard that leaves the team copying facts between systems is not the target.

The buying hypothesis is less coordination work and a better overall financial/customer outcome, not an unsupported claim that no competitor offers these capabilities. Narvar, Claimlane, Reveni and Reclaimit already publish substantial overlapping functionality; consolidation also appears in a vendor-published Claimlane customer case. [E01][E02][E03][E04][E06]

Launch with one complete supported setup that can demonstrate that advantage using the merchant's cases. Do not sell a weak gate today on the promise that recovery or reconciliation will become useful in a later paid module.

### Automatic claim entry and decision routing

Retain the 19 September clarification: the gate is the required entry point in the participating workflow, not an optional retrospective check. Import the claim before a resolution decision, retain missing/stale information, evaluate merchant rules and return a concrete next step with its evidence.

For people, permitted actions and reasoned exceptions are attributable. For connected AI, the action must pass the same server-enforced authorisation boundary. AI cannot bypass a block, widen its permission, approve its own exception or substitute an instruction in a customer message for a merchant policy.

A recommendation, an actor field, a tool schema or a successful API call is not enforcement. Each integration must demonstrate how it prevents a supported action without current authorisation and reports the actual result. List manual/admin paths and other tools that can still bypass Unauth. Never promise universal interception of every refund in a merchant's stack.

Routes include refund, same-item replacement, evidence collection, human review,
or a permitted no-refund recommendation; eligible recovery proceeds separately.
Disputed denials, ambiguous rights, settlement acceptance and material
exceptions go to human review. No-refund advice does not automatically send a
denial.

At launch, merchants can choose observe-only, human-approved or bounded
automatic execution per provider and action. Onboarding can begin with review;
once the merchant enables an action within published limits, fully evidenced
eligible cases run automatically. A connected account alone grants no write
permission. A review rule or missing prerequisite routes the specific action
to owned Work while other independent parts of the case continue.

### Fully connected operating model: automation, evidence and agreements

This section defines the complete workflow available at launch for a merchant's
configured and supported provider, action, issue, service and country scope. It
elaborates POL-01, EXE-01–03, RCV-01–06 and FIN-01. Product and landing work
should use this behaviour rather than the order in which internal phases built
it.

**1. The merchant supplies the authority.** During setup the merchant connects
commerce, helpdesk, fulfilment, carrier and financial accounts; selects the
records and history Unauth may use; names owners and fallback teams; and
publishes versioned customer-resolution rules. Each rule states the covered
case/order/item scope, required evidence, eligible remedy, amount and currency
limits, strict threshold boundary, action mode, exception conditions and
priority. A merchant can author a rule directly or upload its returns, warranty
or support-policy documents. Unauth extracts clause-cited candidate terms,
shows conflicts and likely case effects, and a permitted person corrects and
publishes the rule after applicable customer-rights review. Uploaded text and
AI interpretation never become a financial rule by themselves.

**2. Partner documents become a separate recovery rulebook.** The merchant
uploads or authorises import of carrier, 3PL, supplier or insurer agreements,
published terms and amendments. Unauth safely stores and screens each original,
extracts text/OCR and candidate clauses with page or section anchors, and
presents ambiguities for merchant review. The approved rule records the
counterparty and eligible claimant; legal entity/account, service, country and
effective dates; covered events, exclusions and custody or fault conditions;
submission channel and deadline basis; evidence checklist; cap, deductible and
currency; and amendment precedence. Only a reviewed, published version can
govern a case. If applicability or an essential clause is missing or conflicts,
Unauth assigns a clarification task rather than inventing liability, a
recoverable amount or a deadline. A rule change never rewrites the terms
captured for an earlier event.

**3. Participating claims enter automatically.** A participating customer
claim, return-related request, delivery exception or other merchant-configured
event creates or updates one case before a person or connected AI confirms a
resolution. Unauth links the merchant,
customer, canonical order and line items, shipment, ticket and previous related
cases. It gathers the customer statement and attachments; order, payment,
refund, replacement and reservation history; support conversation; 3PL
pick/pack/inventory/handover records; carrier tracking, proof and
investigation; relevant partner responses; and applicable policy and agreement
versions. Each fact retains its source, observation time, freshness, identity
quality and coverage. Missing information remains unknown: an absent carrier
scan is not proof of loss, missing refund history is not zero concessions, and
handover alone does not establish that the warehouse is fault-free.

**4. Unauth decides the customer route and evaluates recovery separately.**
Published merchant rules combine required facts, prior concessions, current
entitlement and customer rights to select a permitted full or partial refund,
same-item replacement, evidence request, no-additional-payout recommendation
or human review. A separate recovery assessment asks what happened, what
operational responsibility the evidence supports, what the applicable partner
terms permit, who may claim, through which channel, by when, for what amount and
with which evidence. Being connected to a carrier or reporting a wrong item
does not itself establish fault or contractual reimbursement. A customer remedy
never waits solely for a partner to pay.

**5. Routine eligible work runs automatically.** The merchant can use
observe-only, human-approved or automatic mode for each exact action. Once an
action is enabled, conclusive cases within its published evidence, rights,
provider, currency and individual/aggregate limits receive a recorded system
decision and execute through the connected provider. Unauth can issue the
authorised refund, create a permitted same-item replacement, send an approved
evidence request, submit an eligible claim or send routine follow-up where each
exact channel is enabled. It rechecks order/item entitlement, prior and
reserved concessions, policy/evidence version, account, destination and stop
controls immediately before dispatch. Intent is persisted first; retries reuse
one business-operation identity. An unknown provider outcome is verified, not
blindly repeated. Creating a replacement order does not prove dispatch or
delivery; sending a claim does not prove acceptance.

A merchant might set **proposed GBP refund above £500 → manual review**. A
fully evidenced £248 or exactly £500 refund can execute automatically if every
other condition passes; £500.01 cannot under that rule. The threshold is the
proposed refund amount in the specified currency, not retail order value or
potential partner recovery. This is an example configuration, not a global
Unauth limit. Other merchant policies may use different amounts, case types,
remedies and review rules.

**6. Every exception is assigned automatically.** Missing or contradictory
evidence, uncertain identity or prior concessions, threshold breaches,
unapproved terms, claimant/channel gaps, disabled permissions, disputed
denials, goodwill exceptions, waivers, settlements and unknown external
outcomes create or reuse one case-linked Work item per specific blocker. It
shows what is missing, why that action stopped, the accountable person or team,
the external deadline or review date and the next safe step. Availability and
merchant routing rules choose an owner; if nobody is available, an accountable
fallback queue remains visible. Customer, recovery and finance work are
independent. One completed task cannot silently mark the other routes done.
A connected AI follows the same permissioned route and cannot approve its own
exception.

**7. Recovery is pursued to an evidenced outcome.** When the event and
event-date terms support a claim and the claimant, channel, required evidence
and merchant permission are established, Unauth builds the exact pack and
submits through the enabled route. Otherwise it assigns the missing step.
It records prepared, dispatched, acknowledged, accepted, rejected, approved
and challenged states separately; follows deadlines and responses; sends
approved routine reminders when permitted; and assigns disputed appeals,
shortfalls or settlement decisions. A claim remains owned until actual
collection is verified or a person records an authorised reason to end pursuit.
Approval is never presented as cash received, and collection is not guaranteed.

**8. Finance closes the loop.** Unauth ingests provider remittances, bank/ERP
records or credit evidence within the merchant's connected scope. It matches
actual cash or applied credit to the correct loss, handles partial/batched
receipts, reversals and unmatched amounts, and reconciles stage-specific
ledger entries. Claimed, approved, received, matched, reconciled, written-off
and remaining recorded loss stay separate. If a credit note was issued but
never applied, or receipt coverage is incomplete, the benefit is not called
collected. The same case supplies audit, reports, historical opportunity
review and evidence-backed policy preview. Rule changes are previewed and
deliberately published; model output cannot silently change policy.

**What the case tells the merchant.** Every result exposes the facts used and
missing, their sources and times, the matched customer rule and separate
recovery clause/version, the chosen route and reason, action mode and actor,
observed provider result, outstanding owner and deadline, and money stage.
The first view states the answer and next action; deeper evidence remains
inspectable without making operators reconstruct the case.

| Example inputs and missing condition | Customer outcome | Separate recovery or Work outcome |
|---|---|---|
| Carrier confirms loss after collection; canonical order/item and prior-concession coverage are complete; proposed GBP refund is £248 under the example £500 rule. | Unauth issues the enabled automatic refund and records the provider result. | If the applicable agreement supports a £150 ceiling but claimant or channel is unknown, Unauth prepares evidence and assigns that exact blocker; it does not call the claim submitted or £150 received. Once the route is established, enabled submission can run. |
| The same evidence supports a proposed £500.01 refund. | Unauth assigns human approval with the exact evidence, amount and reason. | Recovery eligibility is assessed independently. |
| Customer reports non-delivery but carrier evidence is unavailable or stale. | Unauth requests permitted evidence or assigns investigation; it does not infer a confirmed loss from silence. | Responsibility and claimability remain unknown, with source repair or investigation owned. |
| Wrong item is supported by pack evidence and 3PL acknowledgement; the relevant 3PL terms apply. | An enabled policy may issue a refund or same-item replacement. | Unauth pursues only the contractually eligible amount. Without corroboration or applicable terms, 3PL fault/reimbursement remains unconfirmed. |
| A delivered scan is disputed and proof of delivery is missing, or the item was already fully refunded. | The dispute goes to review; a duplicate payout is blocked unless a person grants a recorded exception. | Work retains the precise evidence or concession conflict; no unsupported fraud finding. |
| A partner approves a claim but receipt records are incomplete. | The customer remedy keeps its own completed or open state. | Approval remains visible; Unauth follows up and records collection only after actual cash or applied credit is evidenced and reconciled. |

### Merchant story for the landing

The launch landing describes the **fully built product above** in direct,
present-tense merchant language. It is not an MVP roadmap, a recommendation-only
product or a sequence of disconnected dashboards. Its organising promise is
that Unauth joins evidence, a merchant-controlled automatic decision, the
actual customer action, eligible partner recovery, owned exceptions and
verified money in one case. Do not narrow the story to today's implementation
status or fill the page with phased-capability disclaimers. Do not turn a
fictional case into a claim of measured merchant performance or a guaranteed
provider payout. DESIGN.md owns the established Ramp-led composition and visual
hierarchy; this document owns the meaning.

Lead with costly failures merchants recognise: duplicate compensation,
evidenced fulfilment errors left with the merchant, eligible reimbursement
never pursued, and partner approval mistaken for cash. Show one case moving
through each relevant consequence. The primary example is **item not
received**; wrong item and damaged item demonstrate different evidence and
policy conditions. The featured set does not need a duplicate-payout tab to
explain the fresh-concession check. Keep the genuine first hero image and the
canonical fictional case identity.

The not-received example uses the versioned SAMPLE-NR248 facts: a £248
customer remedy, 3PL handover, carrier-confirmed loss after collection and
a separate example agreement with a £150 recovery ceiling. A customer report
alone is not the confirmed loss; handover alone does not exonerate the
warehouse. Under a merchant-published rule that reviews proposed GBP refunds
**above £500**, show Unauth selecting and, in the launch-state action sequence,
executing the £248 refund after the order/item, prior-concession and provider
checks pass. The ceiling is a possible partner claim amount, not money already
received. If the claimant or channel remains unconfirmed, show the claim
blocked with an automatically assigned owner and next step. A later
submission, approval, receipt, match and reconciliation may be shown only
as a separate, causally complete progression once the missing route is
resolved. Keep the fixture and every artefact in sync with the state shown.

A compact setup-to-case bridge shows **merchant policy published** and
**partner agreement uploaded, clauses reviewed, event-applicable rule
published**. This explains why Unauth can apply a rule automatically to
many cases without treating model-extracted contract text as authority.
Within the case, make the decisive facts, missing facts, matched rule,
result and blocker visible without forcing the visitor to open a legal
document or read a dense source map. The detailed clause and evidence
trail remain available for inspection.

| Landing beat | Merchant answer it must provide |
|---|---|
| Claim and evidence | What happened, which order/item is affected, which records corroborate it and what is missing? |
| Customer decision and action | Which merchant rule matched, was the action automatic or assigned, and did the provider actually execute it? |
| Recovery and Work | Which reviewed terms allow a claim, what is its cap/claimant/channel/deadline, and who owns any blocker or follow-up? |
| Money and learning | What was claimed, approved, actually received, matched and reconciled; what remains; and which supported pattern merits a deliberate rule review? |

Keep the customer remedy and partner recovery visibly independent. A complete
customer refund can coexist with a blocked or unpaid carrier claim. An
automatic review assignment is a useful product outcome, not a failed
automation. Positive routine actions run automatically where the merchant
has enabled them and all evidence, rights and provider conditions pass.
Disputed denials, goodwill exceptions, unclear liability and uncertain
external outcomes remain accountable human work. Never present claim
submission, approval or collection as one undifferentiated success.

The page should feel like a complete working product at launch. It must not
claim universal interception of independent tools, automatic liability
findings from a claim type, guaranteed recovery, invented deadlines or
received money before receipt evidence. Provider marks identify actual
supported connections, not partnerships inferred from a logo. The same
case facts and stages must hold across hero, artefacts, demo destination
and mobile layout.

## Active recovery assistance

At launch, recovery work runs through the enabled merchant/provider/action
route after the applicable terms and evidence are established. Identifying a
potentially responsible party or eligible amount is only the start of that
work. Missing or excluded routes become assigned tasks with a reason and next
step.

1. **Establish the recovery route.** Capture the applicable agreement/version, eligible claimant and account, channel, evidence requirements, calculation/ceiling and supported deadline. Retain uncertainty and event-applicable terms. A carrier name or delivered scan alone does not establish responsibility.
2. **Obtain the required evidence.** Reuse case evidence and turn genuine gaps into owned tasks. Send proportionate missing-evidence requests through merchant-approved templates and enabled channels; otherwise assign the exact manual handoff. Missing recovery evidence must not automatically block the independent customer remedy.
3. **Prepare the submission.** Produce a usable evidence pack, fields, supported calculation and claim wording with provenance. Keep source terms, an interpretation and an approved operational rule distinct. No fabricated liability, evidence or entitlement.
4. **Submit through the correct route.** Execute only through a verified, enabled adapter. Retain the exact payload/version, submission evidence and external reference. Keep prepared, sent, acknowledged and accepted-for-processing states distinct. A downloaded pack, opened portal or sent email is not provider approval. Reuse claim identity across retries; preserve manual handoffs for unsupported routes.
5. **Drive follow-up.** Every open recovery has an owner and next action or explicit wait/review date. Send merchant-approved routine follow-ups only through enabled channels, with recipient/content controls and frequency limits. Stop obsolete sends after replies, settlement or closure. Distinguish provider promises from internal reminders.
6. **Support justified challenges.** Compare rejection reasons and partial offers with evidence and captured terms. Prepare a challenge only where a supported route exists. Keep ambiguous appeals, admissions, waivers and settlement decisions human-approved; no invented rights or success probabilities.
7. **Verify collection and closure.** Match actual cash or evidenced applied credits to the relevant loss; keep partial receipts, shortfalls and unmatched records visible. Approval is not collection. Closing pursuit needs an authorised reason, does not fabricate a receipt, and does not automatically close the customer case or write off a balance.

The execution contract below, merchant permissions and the repository authority process govern every external action. Recovery extends existing Cases, Work, evidence, recovery and finance owners rather than creating a parallel product. Supplier/3PL cooperation, actual agreements and lawful submission access are business dependencies, not UI features. UPS's published US/UK guidance illustrates why claimant/account restrictions and country-specific requirements must be verified rather than inferred. [E09][E10]

## Recovery and decision workflow requirements

Owner adoption, 18 September 2026, retained and amended by this revision: the following six requirements remain binding intended-product requirements. They extend the active recovery workflow above and existing Cases, Work, source imports, decision, recovery and finance capabilities. Their adoption does not establish runtime implementation, measured merchant demand, savings or release readiness. This section is the canonical semantic owner; the implementation plan maps delivery and verification without duplicating these contracts.

### RCV-01 Daily recovery action queue

The existing Work and recovery surfaces must answer “What needs doing today to get our money back?” Expose claims approaching a supported submission deadline, claims ready to submit, claims blocked by missing evidence, responses needing attention, and approved reimbursements still unpaid. Each actionable record shows its owner, reason, next action, relevant stage-labelled amount and currency where known, and actual deadline or merchant-selected review date. Keep unknown amounts and dates explicit. Link directly to the relevant claim, evidence or follow-up action; preserve existing filters, lifecycle and task deduplication. Distinguish provider deadlines from internal reminders and waiting states. Do not count completed work as open, sum incompatible money stages or currencies, or invent a provider promise to create urgency.

Merchant outcome: a concrete daily recovery workload rather than only an outstanding-loss total.

### RCV-02 Evidence collection during the customer conversation

Surface the applicable recovery evidence checklist during the original case investigation while support is still handling the customer request. Derive requirements from the relevant provider, agreement, service, issue and available source facts; retain their provenance and applicable version. Generate a specific request that reuses evidence already held; send it through an approved template and enabled support channel when policy permits, or assign it for review. Where supported by the applicable requirements, explain which photographs or packaging must be retained before they become unavailable. Missing or uncertain recovery requirements remain explicit and lead to a clarification task, not a fabricated universal checklist. Requests must be feasible and proportionate; recovery preparation must not automatically delay an otherwise permitted customer resolution. Draft wording alone does not authorise contact. Sending requires the controlled-execution contract, approved content/channel and explicit merchant enablement; unsupported contact remains assigned manual work.

Merchant outcome: obtain the evidence needed for recovery at the point it is easiest to collect.

### RCV-03 Correct claimant and submission route

The recovery handoff must identify the eligible submitting party, relevant shipping/account or intermediary context, supported destination/channel, applicable agreement and required fields/attachments. Resolve the route from evidenced merchant and shipment context; the carrier name alone does not establish who can claim or which portal to use. Unknown routes or claimant eligibility block a definite submission-ready status and show the next clarification step. Prepare usable claim wording and attachments; when the route is complete and merchant-enabled, Unauth submits the authorised claim automatically. Capture the actual submitted content/version, reference, date and submission evidence through the existing recovery record. A copied message, opened portal or downloaded pack remains a prepared handoff until submission is evidenced. A sent message remains distinct from provider acknowledgement or acceptance. Preserve existing claim identity across retries and avoid duplicate pursuit.

Merchant outcome: submit a supported claim through the correct channel with the required material.

### RCV-04 Approved but unpaid follow-up

Treat provider approval as a collection milestone. Surface evidenced outstanding payment-document or payment-setup requirements, provider responses, partial receipts and unmatched receipts that need investigation. Keep claimed, approved, received, matched and reconciled amounts separate. Derive an unpaid approved balance only from compatible scoped approval and receipt evidence; incomplete receipt coverage must not become a definite nonpayment assertion. Prepare—and through a released, merchant-enabled channel send—the appropriate follow-up with the approval and submission references, assign an owner and review date, and distinguish an agreed payment date from an internal reminder. Handle sensitive payment details through existing protected provider channels rather than exposing them in generated packs or logs. Reconciliation and explicit pursuit closure retain the active-recovery contract above.

Merchant outcome: help turn an approval into verified collection and identify genuine remaining shortfalls.

### RCV-05 Fresh concession check at confirmation

Immediately before reserving a refund or replacement authorisation, and again before dispatch, revalidate the affected order, confirmed items, quantities and monetary scope against completed concessions and outstanding authorisations. Reuse canonical tenant/source/order/line identities across related cases and tickets; do not rely solely on customer identity or human order numbers. Enforce concurrency and idempotency at the persistent decision boundary, so simultaneous operators or participating AI agents cannot both authorise the same remaining eligibility from a stale view. Explain the conflicting action, actor and time where known. A legitimate additional concession requires the existing permissioned duplicate-concession review and rationale; refreshing or retrying must not silently bypass it. Reserve money and item/quantity entitlements atomically. Retain reservations for dispatched actions with an unknown outcome; do not release them merely because a request timed out. Source freshness and external visibility limitations remain explicit. Universal prevention in tools that do not participate in the gate is not promised, and a detected conflict is not automatically proven savings.

Merchant outcome: prevent avoidable duplicate concessions caused by overlapping requests, operators or agents within the enforced scope.

### RCV-06 Historical recovery opportunity review

Use already imported order, refund and loss history to identify older cases that may still have a valid recovery route. Reuse existing evidence, recovery-rule and Work owners rather than introducing a parallel claims system. Define and display the bounded review period, source coverage, freshness and as-of time. For each candidate, show the supporting facts, applicable terms and deadline, missing evidence, uncertainty, and any existing claim, receipt or recovery work. An old refund is not automatically recoverable; unknown or expired eligibility cannot be labelled available money. Do not apply today's terms retrospectively without proof that they govern the original event. Reuse existing claims and work; only a deliberate permissioned action starts new pursuit. Reviewing already imported history must not silently create tasks, claims, ledger entries, provider refreshes or new charges. A separately approved import may expand source coverage; starting pursuit still requires a deliberate permissioned action. Integrate the review into the existing imported-loss/onboarding path when usable data exists, preserving prerequisite and empty/partial-import handling.

Merchant outcome: expose evidenced opportunities in existing records without waiting for a new customer case.

Delivery emphasis: all six requirements have a bounded MVP form. RCV-01/02/04 create daily usefulness; RCV-03 enables a real submission route; RCV-05 protects actions; RCV-06 exposes historical opportunities when valid imported records exist. Their phased delivery does not narrow the launch operating model above. No arbitrary deadline, generic fraud score, automatic policy publication or guaranteed recovery is introduced.

## Scope boundary and anti-bloat rules

### Keep in the connected Core

Merchant policy and human/AI control; first-party customer context; evidence gathering; fresh compensation checks; supported customer actions; partner-specific eligibility, submission and follow-up; historical opportunity review; verified cash/applied-credit accounting; Work ownership; and simple case-pattern review. These are one case lifecycle with separate customer/recovery states—not separate products to purchase.

### Remove from the committed roadmap

The standalone operational-incident workspace, exposed-order containment engine, automated carrier rerouting, warehouse/packaging process changes, physical correction verification, preventive-savings attribution engine and dedicated operational-correction premium tier are removed from MVP, Build 1 and Build 2.

Do not create an `Incident` product lifecycle, new incident navigation or an operational-management service to reintroduce the removed scope under different names. Security/service incidents required to operate Unauth safely are unrelated and remain necessary. Do not delete financial/audit history or existing unrelated code just because the product scope is narrower.

### Keep pattern review lightweight

Use existing Cases, Work and policy review. Show supported groupings, underlying cases, relevant time period, evidence coverage, and a specific next investigation step. Counts are not failure rates without a valid denominator. Correlation is not a proven cause or liability. Deduplicate alerts/tasks and let an operator assign, snooze or dismiss with a reason. Policy changes are previewed and explicitly published. No promise that major operational issues arise every month.

### Conditional, not silently removed

Cross-merchant customer intelligence remains a possible Build 2 extension with explicit evidence/privacy gates. It is not an MVP dependency, a shared blacklist or an automatic denial mechanism. Start with the merchant's own facts; no product value or sales claim may depend on an unbuilt network.

### Outside all three builds

A replacement helpdesk, full returns portal/logistics platform, insurer, reimbursement guarantee, lending, arbitrary bank payouts, checkout fraud engine, chargeback representment service, open-ended litigation/contract negotiation, custom warehouse hardware and a universal “all situations” agent are outside scope. Relevant observed payment disputes may inform the case/compensation record without creating a new disputes product.

## Decision, evidence and execution contracts

These are implementation requirements, not assertions about existing schemas or provider support. Map concepts to canonical owners; do not introduce a second architecture merely to match these names.

### POL-01 Merchant-controlled policy and first-party context

Store versioned, merchant-approved rules with scope, priorities, action limits, evidence requirements and review routes. Apply them to available order/item, customer-history, shipment and prior-resolution facts. Preserve the rule/evidence versions used for each decision. Test conflicting rules and default to review for unresolved precedence or missing required evidence.

AI may extract candidate facts, explain, classify or propose wording, but cannot turn unverified extraction into source truth or publish financial policy by itself. A natural-language rule needs an authorised preview and publication step. Merchant policies must be reviewed for applicable customer rights; a configured rule is not a legal determination.

Customer history means attributable orders, claims, concessions and known outcomes, not a “good/bad customer” label. Identity matches must be scoped and reviewable; a common email/address or displayed order number is not a safe cross-tenant merge key. Repeated genuine failures are not proof of abuse. Permissioned corrections must flow into subsequent decisions without rewriting historical decision evidence.

### EXE-01 Exact permission and persistent coordination

A recommendation is not authorisation; authorisation is not execution. Bind permission to tenant, actor, case, canonical order/items, quantities, amount/currency where applicable, destination, policy/evidence version and expiry. Immediately before action, check scope, freshness, prior concessions, other reservations, remaining entitlement and applicable limits.

Reserve monetary and non-monetary scope atomically using existing persistent transactions. Two tickets, human operators or AI clients cannot authorise the same remaining allowance concurrently. Legitimate goodwill beyond the ordinary allowance requires separately authorised scope and reason—not an AI self-override.

A refund and replacement must not spend the same item entitlement simply because they have different action types. Any permitted combined remedy needs explicit policy scope and limits.

Use distinct states equivalent to **pending review → reserved → dispatched → confirmed success / confirmed non-execution / outcome unknown**. Unused reservations may expire. Sent actions with uncertain results retain their reservation until authoritative reconciliation. A late success must not cause another refund or replacement. Confirmed success records the actual concession once; corrective ledger entries preserve history.

When the gate is unavailable, do not grant implicit permission. Provide the merchant's documented emergency/manual escalation route, clearly outside Unauth's enforced scope. Do not repeat a possibly executed action merely to unblock the queue. Record independent approval, source action reference and any unverified outcome; reconcile bypass activity before re-enabling the dependent automatic path. If the affected entitlement is still uncertain, retain the specific hold/review rather than implying safe remaining allowance.

For external AI, prefer an Unauth-controlled executor where possible. A third-party direct executor counts as enforced only when its tested contract consumes current permission and reports actual results. A gate response cannot stop another tool holding independent write credentials. Show the precise coverage boundary.

### EXE-02 Verified adapters and durable actions

Use the repository's connector, job and audit patterns. Persist intent before network dispatch with a durable outbox/queue or equivalent; retain one business-operation identity across retries. Authenticate callbacks where supported, deduplicate imports/events, and reconcile late or out-of-order results.

Each adapter declares verified API/channel and version, required scopes/account rights, supported objects/countries/actions, current health and freshness, merchant enablement, idempotency/retry behaviour, authoritative result lookup and fallback. A connection logo or read token does not prove write support.

Use provider-supported idempotency. When an ambiguous write cannot be looked up safely, hold for review rather than retrying blindly. A successful external action followed by an internal database failure calls for reconciliation, not another external action. Do not claim external exactly-once execution without the required provider guarantees.

For the initial commerce integration, implement refund and supported same-item replacement contracts separately. Validate item quantity, original payment route where applicable, money/tax/shipping treatment, approved destination and remaining entitlement. Creating a replacement order is not dispatch or delivery. Use provider-calculated amounts where required; do not invent financial calculations.

Shopify's current `refundCreate` documentation is evidence that a candidate commerce provider supports programmatic refunds; it does not prove Unauth integration readiness. It also documents a required idempotency directive/key from API version 2026-04. Pin and verify the selected supported version and account capabilities before coding or release. [E08]

### EXE-03 Merchant controls and communications

All modes share server-enforced permissions, action/aggregate currency limits, auditability, risk review and global/merchant/provider/action stop controls. A stop prevents new writes but must allow verification of already dispatched operations. Rollback does not pretend to reverse an external payment.

Customer evidence requests and partner messages require approved recipients, channels, templates/content and a scoped send permission. No unrestricted free-form outreach. Keep sent, delivered where known, acknowledged, accepted, approved and paid states distinct. Cancel stale follow-ups after relevant responses. Unknown writes create owned exception work.

No live external action is enabled solely by a developer flag, connected account, model confidence or subscription upgrade. Merchant onboarding can start in observe-only or human-approved mode; automatic mode is available for each specifically released action after the merchant enables its published bounds.

### FIN-01 Financial evidence and allocation

Keep claimed, approved, cash received, credit issued, credit applied, matched and reconciled stages distinct. An unapplied credit note is not cash or a settled benefit. Record evidence that an applied credit reduced the relevant payable before classifying it as realised value.

Support partial and batched receipts, several receipts per claim, allocations across claims, reversals and unmatched differences. Tenant/currency-safe allocations cannot exceed verified available funds/credits. Re-importing related documents must not count one benefit twice. Incomplete receipt coverage is unknown/partial, not definite nonpayment.

Link candidate recovery routes to the same loss scope and record reimbursements already received through other tools or counterparties. Do not pursue the full same loss again merely because a new provider/claim ID exists. Separate genuinely distinct recoverable cost components under the applicable terms; ambiguous overlapping entitlements require review. A new collection triggers review of overlapping open pursuits. Unexpected excess receipts remain auditable exceptions, not silently deleted money or a new automatic payout.

Use the existing append-only ledger and canonical loss basis. Do not mix refunded selling price, replacement retail value, goods cost, shipping and tax without an explicit cost definition. Show recorded loss, allocated actual recovery and remaining recorded loss with coverage. Preserve unexplained differences and negative adjustments instead of silently clamping totals.

### DAT-01 Access, privacy and evidence safety

Keep tenant isolation, least-privilege credentials, protected secrets, attachment access, retention and audit rules in every phase. Customer and provider content is untrusted data, never permission to act or reveal information. Track evidence provenance, retrieval/observation times, versions and unresolved contradictions.

Readiness includes merchant-authorised data access and applicable platform approvals. Shopify documents protected-customer-data requirements; an installed application is not evidence that all required data is available. [E11] Unauth's historical review must show actual record coverage, not assume a complete customer lifetime.

For example, Shopify's Order documentation states that only the last 60 days of orders are accessible by default; older records require approved access. Use an authorised historical import where appropriate and declare any gaps rather than promise a full back catalogue. [E14]

Sensitive evidence retention/access and immutable financial references need separate controls; auditability is not permission to retain or share every personal detail indefinitely. Preserve required transaction history without treating it as a cross-merchant customer database.

Do not pool identifiable merchant evidence or train a shared customer-risk network in MVP/Build 1. Any future network needs its own authorised design, data-role/lawful-basis review, relevant US/UK legal assessment, platform permissions, correction/appeal process, security and proof of decision benefit. The ICO page requires a lawful basis before sharing personal data and flags that its guidance is under review. Recheck the current requirements with qualified reviewers before deployment; neither that page nor a blanket consent assumption clears this design. [E12]

## Commercial model and adoption

### One complete subscription

Sell Core as the complete agreed case workflow. Evidence, policy/gate, standard supported execution, recovery and reconciliation are not separately locked essential steps. Human and AI users share the same permission boundary; do not add a generic “AI surcharge” solely for the actor type.

Charge a fixed subscription with monthly or annual payment and agreed capacity/coverage. No percentage of claimed, approved or recovered money; no success fee disguised as a recovery-value band. Do not auto-charge top-ups or per-action overages. Review sustained capacity growth with the merchant before changing the subscription. Include normal internal team collaboration and the standard supported connections required for the agreed workflow.

The owner has adopted the current Core and Scale fees and monthly incident/store capacity in `lib/billing/plans.ts`; Enterprise pricing and capacity remain agreed per operation. The catalog is a commercial decision, not evidence of market validation. Record case-processing, model, connector and support costs before committing to unlimited service. Runtime enforcement of incident capacity and paid checkout still need their own implementation and release gates; displaying a plan or saving an intent does not activate a subscription. A separate fixed implementation scope may be proposed for genuinely bespoke work, but not used to conceal ordinary onboarding costs.

Later higher-capacity or multi-entity packages may include demonstrably additional implementation/admin scope. No operational-correction Pro tier is planned. Security, audit, authorisation integrity, existing-case export and truthful financial reporting remain foundational, not premium options.

`lib/billing/plans.ts` remains the canonical billing/entitlement owner. New public offers use monthly incident capacity; existing credit, top-up and billable-event records remain governed by their recorded terms until a deliberate migration is approved. Do not silently change existing subscriptions, erase allowances or create new charges. Server-owned intent and provider confirmation remain required, and monthly versus annual intent must be retained without implying activation.

At capacity limits or cancellation, do not silently abandon authorised in-flight actions, erase open claims or mark them resolved. The agreed service terms must identify the wind-down period, responsible party, exports and access retained for verification. Stop new work according to the explicit agreement; verify already-dispatched results only while permission remains valid and hand off anything that cannot be verified. Revoked authority is not permission to continue sending. New paid capacity or continuation requires merchant agreement, never automatic outcome-linked billing.

### Reduce adoption risk without making the product passive

Offer a scoped monthly paid pilot with written coverage, cancellation/exit terms, permission boundaries and a jointly recorded success test. Start from historical/observe-only evidence where available, then enable approved actions for a limited live workflow. Keep the existing helpdesk and source systems; migrate the relevant work, not the merchant's entire stack.

Show support the next action in its existing ticket context where the selected integration permits it, with a deep link to the shared case when necessary. Write back appropriate status/references once, not duplicate tickets or multiple competing queues. Clearly identify which existing tool/process can be retired and which remains necessary.

Onboarding must capture the current workflow, applicable agreements, intended claimant, source coverage, existing open claims/credits and accountable owners. Reuse existing work rather than starting duplicate pursuit. Do not require a new merchant to grant blanket financial write authority or submit to an annual contract before a bounded trial.

## Delivery phases — MVP, Build 1 and Build 2

These are internal delivery stages, not the launch-facing description of the
fully built product. The launch operating model above includes the committed
automatic workflow and recovery depth that the stages build toward. Phases
are product release boundaries, not dates, effort estimates or automatic
commitments. Existing working capabilities remain; build missing deltas.
Complete the MVP's whole supported case loop before adding provider breadth.
Do not mistake a mock, generic connector framework or disabled button for a
delivered capability.

### Before MVP coding — repository and buyer audit

Read `GLOBAL_RULES.md`, `ARCHITECTURE.md`, `DESIGN.md`, this Product document, `docs/product/MERCHANT_CLARITY_IMPLEMENTATION.md`, and the relevant surface, billing and release-gate owners. Trace one case through actual loaders, mutations, permissions, jobs and finance. Record **requirement → owner/files → implemented/partial/absent/blocked → evidence/test → change required** in the existing implementation plan.

Resolve the manual-execution authority change explicitly; keep unrelated safe work moving when a provider action is blocked. Select the first merchant/setup using actual access, representative cases, recurring pain and submission feasibility—not a fabricated integration priority list.

Shopify plus a helpdesk with documented custom actions is a reasonable candidate to test, not a claim about this repository or the best market segment. Shopify refund support and Gorgias API actions provide technical feasibility evidence, but Gorgias's published test environment does not execute writes in connected apps. A mocked workflow is therefore insufficient live-action proof. [E05][E08]

### MVP — a paid-ready connected workflow

**Merchant promise:** “Run this supported missing/damaged-order workflow through one policy-controlled process, including eligible money recovery, at a fixed subscription fee.”

Start with one repeatable commerce/helpdesk setup, a declared set of non-delivery/missing-item/damage cases, and at least one verifiable carrier or fulfilment-partner recovery route. The narrow limit is the supported setup—not a different recovery-only product or a permanently narrow industry. Resolve the customer's issue even when no reimbursement route exists.

**Coverage charter before sale:** record the actual merchant, commerce/helpdesk versions, provider/account/service/country, supported case types, required remedies, evidence families, submission route, settlement evidence and manual exceptions. From an agreed representative record period, report supported cases as a share of the relevant recurring workload and the human steps still required. Agree what coverage makes the monthly purchase worthwhile before enabling writes; there is no invented universal coverage percentage. One working demo is not enough if most of that merchant's actual work remains outside the product.

Do not require payment before disclosing missing capabilities. A pre-product design-partner engagement must be labelled as such; it is not a paid-ready MVP deployment. Keep one canonical case and Work context across every phase—no separate recovery, AI or pattern queues that require re-entry.

| ID | MVP must deliver | Explicit boundary |
|---|---|---|
| MVP-01 | Automatic participating intake, canonical case/order/item identity, own-customer history and supported order/helpdesk/shipment evidence; reviewed operational evidence imports where available. | No invented packing records, universal integrations or shared identity network. |
| MVP-02 | Merchant-configurable, versioned policy; concrete route and reasons; missing/conflicting evidence; permissioned human exceptions; minimal policy preview on retained cases. | No arbitrary legal conclusions, opaque good/bad labels or automatic policy publication. |
| MVP-03 | One real enforced action path with fresh concession checks, concurrent reservations, idempotency, exact authorisation and human/AI actor accountability; test any claimed AI connection with an actual private external client. | Advisory-only connections cannot be labelled enforced. Private client contract/testing is not public compatibility with every agent. |
| MVP-04 | Human-approved refund and same-item replacement execution in the selected commerce setup; reliable result verification, failure/unknown states and stop controls. | Each action passes its own provider tests. Replacement creation is not shipment. Unsupported paths remain visibly manual. |
| MVP-05 | All RCV-01–06 in a bounded form: evidence checklist, reviewed terms/claimant, claim preparation, one real submission path, approved routine follow-up, daily Work and historical review where data exists. | A copy-and-paste-only recovery workflow is not the paid-ready target; at least one approved API/email channel must genuinely send/submit. |
| MVP-06 | Cash/credit evidence capture, approval-versus-receipt distinctions, applied-credit verification, manual-assisted allocations and remaining-loss reporting on a known basis. | Bank/ERP automation is not required initially; explicit evidence import and review are. Financial truth cannot wait for Build 1. |
| MVP-07 | Shared Work ownership, next actions, helpdesk context/linkback, concise value evidence, audit/export and simple linked-case pattern review. | No separate incident system, broad analytics suite or invented preventive savings. |
| MVP-08 | Onboarding/coverage checks, all baseline safeguards, action-level operating modes and the owner-approved monthly/annual commercial configuration. | Human-approved is the default. New automatic actions require separate enablement and passed release gates. |

**Competitive minimum:** demonstrate from an existing ticket that the merchant can see the evidence, approve a safe action, avoid duplicate compensation, reuse that evidence for an eligible claim, follow up and trace a real receipt/credit—without reconstructing the case. Narvar/Claimlane show decision/execution overlap; Reveni shows recovery automation; Reclaimit shows financial matching. This MVP aims to win on the connected job, not unique components. [E01][E02][E03][E04]

**Release gate:** selected integrations work beyond mocks; the acceptance tests for the released scope pass; the merchant approves coverage/modes; an accountable exception operator exists; and the paid trial has a baseline and costs. Every manual step and unavailable route is disclosed before payment. Do not sell a refund-only implementation as a complete solution to a merchant whose routine remedy is replacement.

### Build 1 — make the same Core repeatable and more automatic

**Merchant promise:** “The same complete workflow, with less manual handling and broader coverage proven by customer demand.”

| ID | Addition | Required evidence before release |
|---|---|---|
| B1-01 | Bounded automatic positive customer remedies and recovery steps; release the validated external AI integration for its declared automatic actions using the same enforced permissions. | Shadow/review comparisons, action/aggregate caps, no-self-override tests, known outcome/retry handling and explicit merchant enablement. |
| B1-02 | Additional demanded carrier/3PL/supplier routes and operational records, using maintained agreement/version playbooks. | Actual cases, access/claimant rights, supported channel and collection evidence for each route; no generic supplier-liability inference. |
| B1-03 | Routine receipt/remittance/credit ingestion and matching suggestions; partial/batched payments and exception queue automation. | Reconciliation/reversal tests; applied credit distinct from issued credit; untrusted suggestions require approval where uncertain. |
| B1-04 | Reusable onboarding maps and evidence capture; deeper helpdesk embedding and status sync; permissioned batch review/pursuit. | Reduced repeat implementation work; no silent historical pursuit, duplicate submissions or duplicate bills. |
| B1-05 | Better own-merchant outcome history, evidence-backed policy previews and denominator-aware pattern alerts through existing Work. | Useful actions on real cases; missing feedback stays unknown; no autonomous policy publication or operational-correction workflow. |
| B1-06 | Extend the verified configuration into the other target geography, or another high-demand setup, without rebuilding the model. | Country/account/service terms, currency/timezone handling, privacy and operational support validated independently. |

Advance after repeated paid use and renewal of the MVP, not because a feature checklist is complete. Keep these core workflow improvements in the connected subscription; volume or genuinely additional complexity may change the fixed subscription price, not a fee on recovered value.

### Build 2 — scalable control and conditional intelligence

**Merchant promise:** “Operate the proven workflow across more brands and supported human/AI systems without losing policy or financial control.”

| ID | Addition | Boundary / evidence gate |
|---|---|---|
| B2-01 | Multi-brand/entity administration, explicit policy inheritance/overrides, scoped roles and separated financial reporting. | No accidental pooling of customer access, legal entities, money or currencies; exceptions stay attributable. |
| B2-02 | Broader external AI/helpdesk integration contracts, supported client examples, repeatable certification and partner deployment tooling. | Each advertised executor demonstrates enforcement and actual outcomes; an open endpoint is not universal compatibility. |
| B2-03 | Demand-led higher-volume reliability, operational monitoring, repeatable deployment and enterprise integration/admin requirements. | Capacity/support tests and paid demand, not speculative feature building; baseline security remains in every package. |
| B2-04 — conditional | External/customer-network intelligence feasibility, first testing whether a permitted specialist signal adds value; an owned network only after separate approval. | Legal/data/platform rights, useful coverage, identity accuracy/correction, false-positive review, incremental decision benefit and sustainable cost. Never a shared merchant blacklist. |

B2-04 is an evaluation gate, not a commitment to build a Riskified clone. Riskified already documents cross-network identity and merchant thresholds; the existence of competitor networks does not establish that Unauth can lawfully access equivalent data or improve on it. [E07] If evidence is insufficient, keep it deferred without weakening the first-party Core. No shipping, claims, finance or pricing feature depends on it.

### Addition-to-phase map

| Retained or added capability | First useful release | Later depth / treatment |
|---|---|---|
| Human/AI gate and merchant-owned policy | MVP-02/03 | B1-01; B2-01/02 broaden certified executors/admin. |
| First-party customer and operational evidence | MVP-01 | B1-02/04/05 deepen available sources, not a shared blacklist. |
| Compensation coordination and actual customer actions | MVP-03/04 | B1-01 adds bounded autonomy. |
| RCV-01 daily queue | MVP-05/07 | B1-03/04 reduce exception work. |
| RCV-02 evidence during support | MVP-01/05 | B1-02/04 improve capture and approved automation. |
| RCV-03 claimant/submission route | MVP-05 | B1-02 adds validated routes, including non-carrier routes where evidenced. |
| RCV-04 approved-but-unpaid pursuit | MVP-05/06 | B1-03 improves ingestion/matching. |
| RCV-05 fresh concession check | MVP-03 | Invariant in all later builds. |
| RCV-06 historical opportunities | MVP-05 | B1-04 adds explicitly approved batch operations. |
| Cash/applied-credit verification and actual outcomes | MVP-06/07 | B1-03/05 deepen automation/measurement. |
| Lightweight patterns and deliberate policy improvement | MVP-07 | B1-05 only; no large operational-correction expansion. |
| Embedded integration/distribution readiness | MVP-07/08 | B1-04; B2-02. Real partnerships remain a business task. |
| Cross-merchant intelligence | Not in MVP/Build 1 | B2-04 conditional evaluation, separately approved deployment. |
| Full operational-incident/correction product and its upsell | Removed | No committed phase. |

## Acceptance checks and release safeguards

The following are required tests, not executed results. Map them to the actual repository harness. Mock/unit tests cannot establish provider compatibility; a sandbox cannot by itself establish production entitlement. Critical permission, tenant, financial-integrity or unknown-write failures block the affected live action.

| Test | Scenario | Required result |
|---|---|---|
| T01 | Two human/AI tickets spend the same remaining allowance concurrently. | One valid reservation; the conflicting request is blocked/reviewed with evidence, including tests across a human and a real connected-client request. |
| T02 | Same action retried, webhook duplicated or worker redelivered. | One business action and one internal financial effect; attempts remain auditable. |
| T03 | New external concession or stale required evidence before dispatch. | Revalidate and block/recompute the permission; no stale write. |
| T04 | Tenant, actor, amount, items, destination or permission version altered. | Reject before external action and prevent cross-tenant disclosure. |
| T05 | External write times out or returns an ambiguous result. | Mark unknown, retain its reservation and verify; no blind retry. |
| T06 | Provider succeeds but internal persistence fails; success arrives late. | Reconcile the original operation, not reissue it. |
| T07 | Concurrent actions exceed aggregate currency/quantity limits. | Atomic checks block the excess, including reservations. |
| T08 | Rule conflicts, AI self-override or unpublished policy proposed. | Review/reject as appropriate; no automatic rule publication or self-granted permission. |
| T09 | Gate unavailable, credential revoked or stop activated mid-flight. | Stop new writes; retain known work and verify sent actions. |
| T10 | Recovery evidence absent but the customer remedy is permitted. | Customer resolution can proceed independently; recovery gap becomes owned work. |
| T11 | Unknown claimant, expired/uncertain terms, wrong country or missing submission rights. | No definite ready status; explicit clarification/unsupported route. |
| T12 | Pack downloaded, portal opened or email sent without acceptance evidence. | Preserve prepared/sent/acknowledged/accepted distinctions; no invented success. |
| T13 | Duplicate recovery found via another case or historical scan. | Reuse existing identity and recovery scope; prevent duplicate pursuit. |
| T14 | Follow-up queued after response, waiver request or settlement. | Cancel stale send; human approval for settlement/waiver; recompute next action. |
| T15 | Approval with incomplete payment imports. | Show approval plus unknown/partial collection, not definite nonpayment or cash. |
| T16 | Issued credit later applied; partial/batched cash re-imported. | Bounded allocations; issued/applied distinctions; count benefit once. |
| T17 | Receipt reversal, mixed currency or incomplete cost basis. | Append-only correction and explicit partial/unknown totals. |
| T18 | Historical read-only review or proposed batch pursuit. | No silent writes/refreshes/charges; explicit authorisation starts pursuit. |
| T19 | Customer attachment or provider message requests policy/secrets changes. | Treat as untrusted content; no escalation of permission or data access. |
| T20 | Similar customer identifiers or conflicting customer-history evidence. | Reviewable scoped match; no cross-tenant merge or unsupported abuse label. |
| T21 | External AI bypasses gate or replays expired authorisation. | Block supported executor; disclose genuinely bypassable external paths. |
| T22 | Insufficient pattern denominator or repeat dismissed alert. | No misleading rate/cause; deduplicated Work and deliberate policy review. |
| T23 | Plan capacity reached, subscription cancelled or evidence exported. | No surprise recovery fee/top-up or fabricated completed work; declared exit handling and permissioned export. |
| T24 | Existing routes, filters, responsive marketing and desktop journeys. | Preserve source UX boundaries, permissions, audit links and accessibility. |
| T25 | Released customer-action and recovery adapter contract tests. | Prove real payload/result behaviour outside mocks; track actual production permission separately. |
| T26 | MVP full case from intake to customer action and eligible financial receipt/credit. | Linked reasons, scope, action result, recovery reference and correct remaining loss; safe replay. |
| T27 | Multi-entity policy or financial aggregation in Build 2. | Correct inheritance, permissions and separated monetary/legal-entity scope. |
| T28 | Conditional network intelligence has no approved data rights or fails validation. | Disabled with no pooled data collection; Core continues with first-party evidence. |
| T29 | Another tool/counterparty has already reimbursed the same loss. | Reuse the loss scope, review overlapping pursuits and avoid claiming the same reimbursed amount again. |
| T30 | Cancellation/capacity limit occurs while a write or recovery is open. | Apply the agreed wind-down/hand-off, preserve evidence and verify only with valid authority; no surprise charge. |
| T31 | Historical or protected-customer access is unavailable/partial. | Show actual coverage; no fabricated lifetime history or silent data collection. |
| T32 | Emergency manual action occurs during an outage or unknown write. | No implied gate permission or blind repeated action; capture external evidence and reconcile before restoring dependent automation. |
| T33 | Uploaded agreement has unreadable text, conflicting clauses or an unapproved extraction. | Keep source and clause-cited candidates separate; no active recovery rule, definite ceiling or automatic submission before merchant review and publication. |
| T34 | Same counterparty has different services, accounts, countries, amendments or effective dates. | Select only the proven event-applicable terms; wrong or ambiguous scope remains unknown with owned clarification, never a generic cap or deadline. |
| T35 | Released GBP automatic-refund policy reviews amounts above £500; test £500, £500.01, missing prior-refund coverage, stale evidence and disabled action. | Only the fully evidenced £500 case may auto-dispatch after exact enablement; every other example is held or routed according to its explicit rule, with no provider write on a hold. |
| T36 | Two events produce the same review/recovery blocker; assigned person is unavailable. | Reuse one case-linked Work item, retain reason and deadline, assign a permitted fallback team/queue and do not silently complete the customer, recovery or money state. |

**Test applicability:** MVP requires T01–T26, T29–T34 and T36 for its declared live scope, plus T28's no-network/default-disabled check. T21 must test the actual advertised/private client boundary; internal permission tests alone cannot certify a named third-party platform. Build 1 repeats those tests for each new provider/action/country and autonomous mode, including T35's automatic threshold and action-boundary proof. Build 2 additionally exercises T27 and all network-specific T28 gates before any approved network release. An unavailable non-advertised provider test is recorded as not applicable with scope—not as a pass.

Technical pilot readiness requires passing the selected provider contracts, financial fixtures, permission tests and merchant release approvals. Wider availability additionally requires observed live execution/recovery behaviour and representative merchant adoption evidence. A provider may not pay every eligible-looking claim; do not make “guaranteed collection” a software acceptance criterion. Instead prove truthful lifecycle handling, actual evidence ingestion and measured real outcomes.

The release checklist also needs provider capability/permission evidence; merchant consent and operating limits; exception ownership; audit/monitoring; tested stop/recovery procedures; and accurate public capability copy. Do not enable one action because another passed. Unauth must not describe drafted/simulated behaviour as executed work.

Use additive migrations where possible. Never backfill historical authorisations, liability, successful execution or receipts from guesses. Default new external writes to disabled. A rollback stops new dispatch without deleting history or abandoning already-sent result verification.

## Commercial validation and expansion decisions

**The MVP is designed to be sellable; that is not proof that merchants will buy it.** Test the connected workflow against the actual incumbent configuration and staff process, not a deliberately weak spreadsheet baseline. Missing public competitor documentation does not prove exclusivity.

### Proposed pilot experiment

Recruit five independent paid design partners with a repeatable operational setup as a working experiment size, not a representative market sample. Before each pilot agree the coverage, monthly fee, baseline period, success measures, manual work expected and observation window. Use historical evidence only where available and applicable; do not assume future collections appear within an arbitrary trial deadline.

Record the buyer's reason to choose or reject Unauth, existing suppliers/modules, implementation effort, access objections and the specific workflow being replaced. Test recurring usefulness after any initial backlog clean-up. Do not claim monthly customer value solely from a one-off historical recovery.

### Measure both merchant value and Unauth delivery economics

Record eligible case volumes and denominators; resolution/handling time; known complaints, reversals and exceptions; actual cash/applied credits; time to settlement; rejected/partially paid claim reasons; source coverage; and remaining loss on the declared basis. Count both merchant and Unauth operator labour, model/API costs, integration support and onboarding.

For value comparisons, separate observed money, estimated labour capacity, avoided vendor charges and uncertain preventive benefit. Subtract credible baseline outcomes and costs; do not count every blocked refund or all recoveries as incremental Unauth savings. Label observational comparisons and changes in policies/case mix. Prevent double-counting labour, vendor costs and recoveries.

### Decisions after the experiment

As a proposed founder decision rule, seek renewal at the agreed ongoing monthly fee from at least three independent pilot merchants plus repeatable delivery before expanding Build 1. This small-sample threshold is a planning choice, not evidence of product-market fit. Each renewal should have a documented economic/service reason, not just goodwill toward the founder.

Define the merchant-specific minimum worthwhile improvement and acceptable service/error boundaries before the trial; do not invent a universal ROI percentage or margin benchmark. Unresolved critical safety failures stop the affected actions regardless of renewal intent. Incomplete settlement evidence means the recovery result remains unresolved, not a failed or successful claim by default.

If buyers want only a one-off recovery sweep, cannot justify the monthly fee, or require unrecoverable bespoke operating effort, revisit the cohort/scope/pricing before building more modules. Build 2 requires repeated paid demand for its added scope and supportable unit economics. Funding and a £500m+ valuation remain ambitions, not results inferred from a roadmap.

### Non-code work required to win

The business must obtain real merchant records, applicable agreements, claimant rights, submission access and process contacts. Maintain playbooks as terms/channels change. Seek distribution through relevant commerce/helpdesk/integration ecosystems only after proving deployment and value. Code readiness is not a partnership, exclusive data access or supplier cooperation. Record win/loss reasons and use them to choose the next integration rather than expanding the connector catalogue indiscriminately.

## Operating Context

The public `/landing/data` page extends responsive landing marketing with
attributed US-focused industry research on claims abuse, wider fraud costs and
customer friction. It contains no hypothetical merchant calculations. The data
does not represent Unauth savings or customer results; mixed US/Canada studies
retain their actual scope.

Operators work across case queues, customer and commerce records, recovery partners, reconciliation exceptions, reports and connected sources. Landing, pricing and public legal pages support mobile marketing under the 16 September 2026 owner revision. Authentication, onboarding, interactive demos and merchant workflows remain desktop-only. Phones and tablets receive a destination/plan-preserving desktop handoff before these functional journeys, with legal and return links and no email collection. Supported desktop layouts cover 1024, 1280 and 1440 CSS pixels, with 1280 or wider recommended. Narrow desktop windows and desktop magnification remain distinct from unsupported devices.

## Capabilities and Constraints

- Preserve canonical routes, URL-backed filters and scope, permissions, tenancy, loaders, backend mutations and audit consequences.
- Money is stored and presented from integer minor units. Currency, date range, timezone, comparison scope, source, freshness and reconciliation state remain explicit wherever they affect meaning.
- Unknown or unavailable values are never presented as verified zero. Mixed currencies are separated rather than silently summed.
- Source facts, recommendations, merchant decisions, external actions, responsibility, recovery and ledger entries are distinct records.
- The financial ledger is append-only. Reversals and write-offs create new immutable entries and retain the original event.
- High-impact actions use a review boundary that states the object, scope and audit consequence.
- Missing backend capability or source data uses a truthful unavailable state; the frontend does not invent support.
- The fully built product offers merchant-enabled automatic execution for eligible supported actions, with observe-only and human-approved modes available per action. Each external action retains its verified contract, exact permission, provider result and safe unknown state. Unsupported or blocked steps become owned manual handoffs.
- Resolution comparison, same-item replacement, policy preview and evidenced claim patterns follow the launch operating model and global rules. The implementation plan records the separate proof required before release.
- Provider code maturity, merchant configuration, live health, import state, object-family freshness, and action capability are separate axes. No one axis implies another.
- Pricing, signup, onboarding, billing and entitlements derive from `lib/billing/plans.ts`. Current offers use the adopted monthly/annual price and incident-capacity terms; preserve legacy credit subscriptions until a deliberate migration. A URL may propose a plan and payment interval; only server-owned intent plus provider confirmation changes subscription state.

## Brand Commitments

The product name is Unauth. Product language is direct, operational and evidence-led. Existing Unauth wordmark and symbol assets under `public/brand/unauth-r1/` remain the authoritative marks.

The approved `/landing` composition uses Ramp-led hierarchy and Modern Treasury-informed original diagrams with the existing neutral white, graphite and orange roles. Other public routes refine inspected Loop constructions with Unauth-specific navigation and control details, bold
Inter headings, warm ivory/charcoal and Unauth orange. It supersedes the previous
public reference mixture, not the authenticated design. Decorative artwork is
dimensioned placeholders until supplied or explicitly commissioned. The owner-commissioned
hero, sample and evidence diagrams use conceptual labels or canonical fictional
case facts; they are not customer proof.

## Evidence on Hand

- Current authority index: `ARCHITECTURE.md`.
- Visual and interaction authority: `DESIGN.md`.
- Executable route and surface inventory: `lib/surfaces/manifest.ts` and its verification script.
- Connected source fixtures and current backend loaders provide product data. The UI must not fabricate customer claims, benchmarks or financial outcomes.

## Product Principles

- Make every financial result traceable.
- Keep evidence, advice, decisions, actions and ledger consequences distinct.
- Prefer explicit unavailable states over plausible-looking inference.
- Preserve operator context through filters, selection and connected records.
- Make consequential actions reviewable and auditable.

## Accessibility & Inclusion

The authenticated product must support keyboard operation, visible focus, meaningful loading/empty/unavailable/error states, readable compact layouts and chart data-table alternatives. Color is never the only carrier of financial or lifecycle meaning.

The owner-authorised Asterlane staging screenshot account uses the isolated read-only fixture in `lib/demo/screenshotAccount.ts` for connected-looking source health and complete illustrative context. It is fictional product imagery, not live provider or merchant-performance proof; see the 10 September 2026 global revision.


### Unauth personality and evidence motion — 16 September 2026

Historical presentation record: the 20 September product-led landing revision supersedes its `/landing` geometry, ring, type and artwork-preservation instructions. Product truth remains binding.

The owner authorises the follow-up to the live Loop interaction study: restore
bold display typography and rounded controls while preserving the existing warm
public palette and narrative. This supersedes the quieter heading/control choices
in the earlier distinction refinement, not its product truth boundaries.
The owner commissions original code-native diagrams for the hero, sample cases
and evidence checks (VIS-14 scoped exception); remaining artwork slots stay
placeholders. No Loop artwork or animation choreography is reproduced.
The focal sequence traces evidence into the gate and ends at a merchant decision;
it runs once on entry, with an explicit replay and a static reduced-motion path.
Selection changes receive short coordinated transitions. All sample facts remain
owned by merchantCaseV1; previews cannot write demo progress or execute actions.
See docs/product/LOOP_INTERACTION_STUDY_2026-09-16.md for observed references.


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


Owner correction, 25 September 2026: remove landing-page provenance and capability disclaimer copy, including fictional/sample captions, intended/illustrated automation labels, supervised/pre-launch notices and desktop walkthrough labels. Keep the product story direct and let the case show Unauth selecting outcomes. This overrides earlier landing disclaimer requirements only; canonical fixtures and the interactive demo retain their provenance and execution boundaries. Financial stages and actual case blockers remain distinct.
