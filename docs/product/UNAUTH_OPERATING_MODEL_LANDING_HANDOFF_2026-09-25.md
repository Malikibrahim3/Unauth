# Unauth operating model and landing handoff

Prepared 25 September 2026 for a landing-page review by Claude. This is a
source-grounded analysis and copy/artefact brief, not a second product authority,
runtime acceptance receipt or publication approval. `GLOBAL_RULES.md` controls
global constraints; `PRODUCT.md` owns the intended behaviour; `DESIGN.md` owns
presentation; the current implementation and capability status decide what is
actually available. The observations below are from the current dirty source
tree. No live merchant, provider or rendered-browser run was used for this audit.

## The product in one paragraph

Unauth is the merchant-controlled operating layer between a post-purchase
customer claim and its complete outcome. Participating claims enter one case;
Unauth assembles available order, conversation, fulfilment, delivery, payment,
customer-history and agreement evidence; applies the merchant's published
resolution policy; and records the exact reason and next route. In a released
automatic mode, conclusive in-scope positive remedies execute through verified
provider actions. Unclear, high-value, excluded or unsupported actions become
automatically assigned human work. Separately, Unauth tests whether the event
and event-date partner terms support reimbursement, prepares or submits through
an authorised route, follows the claim, and accounts for actual received and
reconciled cash or applied credit. The customer remedy does not wait for the
partner's payment. The same case preserves evidence, decisions, actions, owners
and remaining loss; later pattern review informs a deliberately published rule.

## What goes in and what comes out

| Input | Question answered | Output and limit |
|---|---|---|
| Commerce orders, line items, payment/refund and replacement records | What was bought, paid, refunded or already promised? | Canonical order/item scope, proposed remedy and fresh duplicate-concession check. A missing feed is unknown, not zero prior refunds. |
| Helpdesk messages, attachments and requested remedy | What does the customer say happened and what evidence did they supply? | One claim and evidence requests; a customer report alone is not a verified delivery or fault finding. |
| 3PL pick, pack, inventory, exception and handover records | What was packed, and when did custody move? | Evidenced fulfilment facts and candidate 3PL investigation. Handover alone does not exonerate the warehouse. |
| Carrier scans, proof of delivery, investigation and response | Was the parcel collected, delivered, damaged or confirmed lost? | Delivery assessment and possible carrier route. No scan, a delivered scan and a confirmed-loss response have different meanings. |
| First-party claim and concession history | Has the same order/item already received a remedy or been claimed? | Conflict hold or permitted remaining entitlement, with source coverage and identity quality shown. Repetition alone is not abuse. |
| Uploaded carrier/3PL/supplier/insurer agreements and amendments | What terms govern this service, account, country and event date? | Clause-cited, merchant-approved recovery rules: claimant, exclusions, deadline, evidence, cap/deductible and route. An uploaded file or model extraction is not an approved term. |
| Provider responses, remittances, bank/ERP evidence or applied credits | Was a claim accepted, approved, paid, matched and reconciled? | Stage-specific recovery and remaining-loss records. Approval is not receipt; issued credit is not applied value. |
| Merchant policy and team configuration | Which outcome may Unauth select, what can execute automatically, and who reviews exceptions? | Versioned decision, action-specific permission and owner/queue assignment. Policy may be stricter than an example threshold. |

Case output must expose **facts used, facts missing, matched customer-policy
rule, separate recovery-term basis, customer route, recovery route, action mode,
actor, owner, deadline/review date, external result and money stage**. Source
IDs, observation times, policy/term versions and uncertainty remain inspectable
without placing every field in the landing's first visual.

There are **two different rule sources**. The merchant's customer-resolution
policy can be configured directly. If Unauth offers upload of returns, warranty
or support-policy documents, their text may propose customer rules but requires
clause review, customer-rights review, effect preview and merchant publication.
Carrier, 3PL, supplier and insurer agreements instead establish possible
recovery rights and submission requirements. Neither document type becomes an
active rule merely because it was uploaded or extracted. The audited routes do
not establish a completed customer-policy-document ingestion pipeline.

## How automation should actually work

1. **Automatic intake and evaluation.** A participating ticket/event creates or
   updates the same case before a person or connected AI confirms a remedy.
   Evidence refresh and rules run against the supported source coverage. Missing
   required inputs cause a specific hold or evidence request.
2. **Three modes, per action.** Observe-only records what would happen;
   human-approved mode prepares an exact permission for a person; bounded
   automatic mode authorises and dispatches only a merchant-enabled positive
   action with complete evidence, current source checks, action/aggregate limits,
   provider proof and stop controls. The initial MVP uses human approval for
   financial actions; bounded autonomy is the Build 1 direction in `PRODUCT.md`.
3. **Illustrative threshold.** If a merchant sets **proposed GBP refund > £500**
   to manual review, exactly £500 can be automatic only if every other rule and
   release condition passes. The landing currently says “under £500” and also
   “£500 or more” elsewhere; Claude should use one boundary. Retail order value,
   proposed refund and partner recovery ceiling must not be swapped.
4. **Automatic Work assignment.** If a person must act, create or reuse one
   case-linked task with the precise blocker, requested evidence, accountable
   owner/team, external deadline or merchant review date and safe next action.
   Unavailable owners fall back to a visible accountable queue. Customer,
   recovery and finance tasks may remain open independently.
5. **Execution and result.** Before dispatch, recheck the exact order/item,
   prior and reserved concessions, evidence/policy version, currency, account,
   destination and permission. Persist intent first; use the same business
   operation identity across retries. A timeout becomes **outcome unknown** and
   is verified, never blindly sent again. Created replacement is not dispatch;
   sent claim is not accepted; provider approval is not money back.

Automating the *decision* and automating the *provider action* are separate
capabilities. A system-selected refund displayed on a page does not prove a
refund was issued. Human review is a deliberate outcome, not failure of the
product. Neither AI nor a human outside the supported action boundary is
magically intercepted.

## The agreement pipeline that is missing from the story

The merchant uploads or authorises import of the agreement and amendments.
Unauth must then keep seven distinct stages:

1. **Source stored safely:** tenant-scoped original, file type/content checks,
   quarantine and malware screening before extraction.
2. **Candidate extraction:** text/OCR as needed, clause and page anchors,
   extraction confidence and unresolved text. Model output is a proposal.
3. **Coverage mapping:** counterparty, legal entity/account, service, country,
   effective dates, amendment precedence and event type. No generic carrier
   term should apply to every service or old shipment.
4. **Term interpretation:** covered events, exclusions, custody/fault conditions,
   claimant, channel, deadline start/window, evidence checklist, currency,
   cap/deductible and any allocation or dispute process.
5. **Merchant approval:** a permitted person compares each proposed term with
   the exact clause, corrects it and publishes a versioned operational rule.
   Conflicting or unclear clauses stay pending review.
6. **Case-time application:** select the event-date terms and combine them with
   corroborated event evidence. Distinguish *what happened*, *who may be
   responsible*, *what is contractually claimable* and *what has been paid*.
7. **Change and audit:** preserve the rule and source snapshot used for an old
   claim; amendments affect only events to which they apply. Review expiring
   terms and changed submission channels.

This is a central part of Unauth's value. It makes “carrier/3PL recovery” more
than a logo or a speculative recommendation. The page needs one concise,
visible explanation or artefact showing **agreement uploaded → clause reviewed
→ rule applied to this loss → eligible claim route**, while keeping the
customer decision in its own lane. It need not become a dense legal chapter.

## Decision examples for the landing and product

These are *target outcomes under the merchant's configured policy*, not claims
that current code executed them. “Automatic refund” below assumes the exact
refund action has passed provider proof and merchant enablement.

| Evidence and rule | Customer route | Separate recovery/Work route | Reason to show |
|---|---|---|---|
| Carrier confirms loss after collection; canonical order/item and no earlier concession are verified; proposed GBP refund £248; merchant auto limit is >£500 review. | Automatic full refund when released; otherwise exact refund approval task. | If applicable carrier terms establish a £150 ceiling but claimant/channel are missing, prepare the pack and assign claimant/channel verification; do not call it ready to submit. | Customer remedy can finish while reimbursement is blocked. |
| Customer reports non-delivery but carrier lookup is unavailable or stale. | Request supported evidence or human review; no conclusive automatic fault/refund solely from absence. | Carrier responsibility, deadline and claimability remain unknown; assign a source repair or investigation task. | Missing is not proof. |
| Delivered scan exists but proof of delivery is unavailable and the customer disputes receipt. | Review the conflict; do not auto-deny or accuse the customer. | Investigate whether a carrier claim is possible under applicable terms and evidence. | A scan and receipt by the customer are different facts. |
| Fully evidenced claim otherwise qualifies, but proposed GBP refund is £501 under this example policy. | Human review with exact amount, evidence and suggested remedy. | Recovery may still be investigated independently. | Threshold controls the action, not the entire case. |
| Same original item was already fully refunded or has a pending reserved refund. | Block another automatic payout; only a permitted, recorded exception can grant more. | Reuse the existing loss/claim identities. | Prevent duplicate compensation without calling it fraud or proven savings. |
| Wrong item: pack image plus 3PL acknowledgement confirms a packing error. | Merchant policy may allow a refund or same-item replacement, subject to fresh entitlement and mode. | Apply the specific 3PL agreement, evidence, claimant, deadline and cap; pursue only the eligible amount. | Operational fault and contractual reimbursement are different checks. |
| Wrong item is reported but there is no corroborated pack evidence or acknowledgement. | Request evidence or review; an independently permitted customer remedy may still proceed. | 3PL fault and recovery remain unconfirmed. | Claim type alone cannot assign warehouse liability. |
| Loss is confirmed but the relevant agreement is absent, expired, contradicted or unapproved. | Customer remedy follows its own policy and rights. | Recovery stays unknown or blocked with an owned terms/claimant task. | No default ceiling, deadline or liability. |
| Partner approved £150, but receipt feeds are incomplete or no matching cash/applied credit is evidenced. | Customer decision remains separate. | Keep approval visible; mark collection partial/unknown, follow up with an owner and verify any actual receipt. | Approved is not paid. |
| Provider refund call times out after dispatch. | Hold the exact reservation as outcome unknown; verify the provider result. | No second refund and no falsely successful ledger event. | Safe automatic work needs a reliable unknown state. |

## Source audit: runtime gaps and landing corrections

| Finding | Evidence in this checkout | Consequence / required correction |
|---|---|---|
| Controlled refunds and claim submission are still unreleased. | `lib/connectors/capabilities.ts` forces `refund.issue` and `claim.submit` unsupported; `lib/connectors/actions/execute.ts` bars high-risk actions. `docs/product/CAPABILITY_STATUS.md` records the supervised boundary. | Present the automatic action as an end-state scenario until each exact provider action is proven. The API gate's route or a landing illustration is not a successful provider action. |
| The document routes do not yet provide the full upload-to-clause-to-rule chain. | `app/api/agreements/upload/route.ts` stores a PDF as `needs_review`; `/api/agreements/[id]/rules` receives manually entered terms. The separate `/api/integrations/documents/[id]/extract` only changes status; its approve route receives supplied term fields. `components/settings/AgreementSettingsClient.tsx` says clause locations and approved rule values are unavailable. | Choose one canonical agreement workflow, add actual safe extraction and clause-cited review, then prove rule publication and correction before marketing document ingestion as automatic. |
| Customer-resolution policy documents have no proven ingestion-to-publication path. | The audited `app/api/rules/*` routes govern rule editing/publication; the audited document routes concern agreements. No evidence here shows returns or warranty text being extracted into a previewed, approved customer rule. | Show the merchant-published customer rule on the landing. Do not imply that uploaded returns/warranty documents currently drive decisions. If document import is added, retain clause, rights, preview and publication gates. |
| Agreement matching can overstate eligibility. | `app/api/agreements/[id]/rules/route.ts` inserts `conditions: { all: [] }`. `lib/agreements/evaluateAgreementRules.ts` filters active rules by claim type but does not first constrain agreement service, country, account or event-date validity; `all: []` matches. It can also fall back to a candidate loss amount and carrier route. | Require positive scope match and explicit required facts. No match or ambiguity remains unknown. Verify cap, deductible, currency, claimant and deadline from approved terms. |
| Some evidence shortcuts can turn missing data into apparent certainty. | `lib/claim-gate/buildEvidence.ts` may choose the latest order by email when no order ID is supplied, reports zero prior history when no email/order matches, and falls back to a default currency. `lib/claim-gate/buildRecommendation.ts` contains generic carrier windows. `lib/accountability/classifyLossSource.ts` creates a 3PL candidate from wrong/missing claim type alone. | Canonical identity and actual coverage must gate automatic decisions. Do not sell generic windows or source-type guesses as merchant-agreement findings. |
| Landing launch facts were separate hardcoded copy. **Resolved in the current landing source.** | `DEMO_LAUNCH_STORY` now owns the case identity, example threshold, policy and agreement setup, refund result, blocker and dated recovery/money sequence. `LandingCanvasBody.tsx` and its detail copy consume that record; the supervised interactive demo retains its separate progress contract. | Keep new launch facts in the versioned owner and extend its consistency test before using them on the page. |
| A handover was used to imply warehouse exoneration. **Resolved.** | The landing now states the evidenced custody handover and carrier loss. Detail copy says the applicable published agreement determines the recovery route. | Preserve separate event, responsibility and contractual-eligibility checks. |
| The recovery blocker and later paid state appeared simultaneous. **Resolved.** | The recovery card is explicitly the 10 September snapshot. The financial card is explicitly the later result and preserves submitted, approved, received, matched and reconciled as dated stages. | Keep every new stage dated and retain the earlier blocker in history. |
| Recovery copy implied guaranteed collection. **Resolved for the launch narrative.** | The current copy covers rejection, short payment, receipt and reconciliation, and labels £98 as the unrecovered refund balance. | Provider enablement and release evidence remain separate runtime obligations. |
| The landing did not explain how document text becomes an applicable rule. **Resolved at the product-story level.** | The gate now shows upload/connect, clause-cited candidate extraction, merchant review and publication, followed by the exact published customer policy and carrier agreement used by the case. | Runtime document ingestion and clause review still require the implementation and acceptance described above. |

The architecture is sound in direction: one case across evidence, customer
resolution, recovery, Work and money. Its weak point is *authority*: source
coverage, document interpretation and provider execution have to be proven
before the automatic story can become a current-capability claim. The product
does not need a parallel incident system, generic liability AI or a new
dashboard to solve this.

For the landing's merchant-operator audience, the page should answer in one
scan: **What happened to this order? Which records prove it? Which merchant
rule selected the customer outcome? What did Unauth execute or assign? Which
approved agreement makes reimbursement possible? What money actually came
back?** Keep one dominant case result per scene in the established visual
sequence; reveal detailed evidence and clauses only where they explain that
result. The primary action should open the same coherent case, with desktop
and mobile showing the same financial and execution state.

## Brief to give Claude

> Audit the **shipping** `/landing` source in this checkout, beginning with
> `app/(public)/landing/page.tsx` and its rendered `LandingCanvasBody.tsx`.
> Read `GLOBAL_RULES.md`, `ARCHITECTURE.md`, `PRODUCT.md` (especially “Fully
> connected operating model”), `DESIGN.md`, the canonical public fixture in
> `lib/demo/merchantCaseV1.ts`, and this handoff. Keep the present Ramp-led
> composition, genuine first hero image and Unauth visual identity. Make the
> page explain the full target operating loop: participating claim intake;
> records and missing evidence; merchant policy with a concrete outcome;
> initial review mode and optional bounded automatic positive actions;
> automatic assignment of exceptions; agreement upload, clause review and
> event-applicable recovery rules; separate customer remedy and recovery;
> real submission/follow-up stages; actual receipt, match and reconciliation.
> Use the not-received case as the spine and wrong/damaged examples only where
> they add a different rule or outcome. For the sample £500 GBP policy, define
> whether exactly £500 is eligible; the owner example is **above £500 goes to
> review**. Make the case show **which inputs matched, which are missing, the
> resulting action, why, and the owner of anything blocked**. Keep operational
> fault, contractual liability, possible recovery and money received separate.
> Make the rule origins clear: a merchant publishes customer-resolution policy;
> reviewed partner terms govern possible reimbursement. Uploaded policy text,
> if shown, is a proposal until a merchant approves and publishes its rule.
> Remove unsupported warehouse exoneration, invented deadline, contradictory
> “ready to submit” and same-case completed-money claims. Source every sample
> fact from a canonical versioned fixture. Use confident, concise language
> and strong artefacts; do not bury the page in implementation disclaimers.
> Before treating current-tense external actions as publishable, compare each
> verb, provider and money stage to the current adapter, merchant permission
> and release evidence; present unproven paths as a reviewable local draft.
> Return a claim-by-claim source crosswalk, exact landing edits, rendered
> desktop/mobile evidence and unresolved publication blockers. Do not enable
> provider writes, mutate live accounts, publish or deploy as part of the
> landing work.

### External checks used for this product review

- [Shopify `refundCreate` documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/refundcreate) describes a candidate refund API and its required idempotency key; it does not establish Unauth's merchant-specific release.
- [ICO automated decision-making update](https://ico.org.uk/about-the-ico/what-we-do/legislation-we-cover/data-use-and-access-act-2025/the-data-use-and-access-act-2025-duaa-summary-of-the-changes/data-protection/) explains why automatic adverse customer decisions need jurisdiction-specific rights and safeguard review before enablement.
- [OWASP file-upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) supports screening and validating untrusted uploaded agreements before extraction.
