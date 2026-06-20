# Unauth MVP Steering Document

Post-Purchase Payout Control + Recovery Workflow

---

## 1. Product Direction

Unauth is now focused on:

**Post-purchase loss accountability for ecommerce merchants.**

The MVP should help merchants control, evidence, track, recover, and prevent losses that happen after checkout.

The MVP is not a generic fraud tool.

The MVP is not a full enterprise loss operating system yet.

The MVP is:

A Shopify/Gorgias payout-control workflow that helps support teams make better refund/reship decisions, capture evidence, apply merchant rules, open recovery cases where appropriate, and track outcomes.

The product should make merchants feel:

> "Before money leaves the business, Unauth helps us understand the case, apply policy, collect evidence, and decide what should happen next. If money does leave, Unauth helps us recover it or prevent the same loss happening again."

---

## 2. One-Sentence Product Description

Unauth turns refund, reship, damaged item, missing item, wrong item, item-not-received, chargeback, and support-payout cases into evidenced, rule-based, recoverable or preventable loss cases.

Shorter:

> Control payouts. Recover where possible. Prevent where not.

---

## 3. MVP Goal

The MVP should prove this:

**Merchants want a system that stops support payouts from becoming invisible losses.**

A support payout is any action where the merchant gives money or value after purchase:

- refund;
- reship;
- replacement;
- store credit;
- discount;
- returnless refund;
- goodwill credit;
- chargeback loss;
- exception outside policy.

The MVP should make these events visible, structured, evidenced, and trackable.

---

## 4. What the MVP Is

The MVP is made of five core layers:

1. **Gorgias widget** — a compressed 4-line decision card inside the support ticket.
2. **Support payout case system** — full case view inside Unauth.
3. **Evidence checklist** — shows what evidence exists and what is missing.
4. **Rules-led recommendation engine** — merchant policy decides recommended action.
5. **Recovery workflow** — creates recovery cases when a carrier, 3PL, warehouse, supplier, returns provider, or payment/dispute route may be responsible.

The MVP should feel like an operational product, not a dashboard-only product.

---

## 5. What the MVP Is Not

Do not build the full future platform yet.

The MVP should not include:

- automatic carrier claim submission;
- AI contract extraction;
- full network benchmarks;
- full enterprise API ingestion;
- WMS/ERP integrations;
- all helpdesk integrations;
- all returns platform integrations;
- full supplier management;
- full chargeback automation;
- deep finance reconciliation;
- complex AI decisioning;
- full rebrand of every legacy identity/risk page;
- removing identity/network logic;
- replacing all existing claims code.

The MVP should be additive and focused.

---

## 6. Product Feeling

The merchant should feel three things.

### 6.1 Control

Before an agent refunds or reships, the merchant should see:

- what the customer is asking for;
- how much money is at risk;
- what evidence exists;
- what evidence is missing;
- what merchant rule applies;
- what action should happen next.

The product should reduce panic and guesswork.

It should not feel accusatory.

It should feel like:

> "Here is the policy, evidence, money at risk, and next action."

### 6.2 Accountability

If the merchant loses money, the product should not let the loss disappear.

Every loss should end up classified as one of:

- recoverable;
- possibly recoverable;
- unrecoverable;
- prevention-only;
- merchant policy loss;
- customer-disputed;
- unknown.

The product should answer:

> "Who owns the next step?"

Not always:

> "Who is to blame?"

Use cautious attribution language:

- likely carrier issue;
- possible 3PL issue;
- supplier defect pattern;
- customer-disputed delivery;
- merchant policy loss;
- evidence insufficient;
- recovery unlikely;
- prevention-only.

Avoid definitive blame unless evidence and merchant rule clearly support it.

### 6.3 Results

The merchant should see tangible results:

- fewer blind refunds/reships;
- better evidence collection;
- clearer support decisions;
- recoverable cases not forgotten;
- recovery cases chased on time;
- unrecoverable cases identified quickly;
- repeated loss causes surfaced;
- policy leakage visible.

The product should make post-purchase losses feel measurable and manageable.

---

## 7. Core User Personas

### 7.1 Support Agent

The support agent is in Gorgias.

They need speed.

They should not need to understand the full platform.

They need to answer:

- Can I refund?
- Can I reship?
- Should I ask for evidence?
- Should I escalate?
- Is this recoverable?
- Should I open the full Unauth case?

The widget must be extremely compressed.

### 7.2 Support Manager

The support manager uses the Unauth dashboard.

They need consistency.

They want to know:

- Are agents following policy?
- Which cases need review?
- Which cases were paid outside recommendation?
- Which claim types are rising?
- Where are we leaking money?

### 7.3 Operations / Logistics

Ops uses the recovery board.

They need chase-up workflow.

They want to know:

- Which carrier/3PL/warehouse/supplier cases need evidence?
- Which recovery cases are ready to submit?
- Which cases are chase due?
- Which partner is causing repeat losses?
- Which cases were rejected and why?

### 7.4 Finance

Finance cares about money.

They want to see:

- total payout exposure reviewed;
- actual refunds/reships issued;
- estimated recoverable amount;
- recovered amount;
- rejected amount;
- write-offs;
- policy leakage;
- prevention opportunities.

---

## 8. Main MVP Workflow

The core flow is:

```
Order placed
→ Order fulfilled
→ Customer opens support ticket
→ Unauth creates support payout case
→ Widget shows 4-line decision card
→ Agent follows recommendation or records override
→ Evidence is requested/added if needed
→ Merchant outcome is recorded
→ Recovery case opens if recoverable
→ Ops chases carrier/3PL/supplier/etc.
→ Recovery is paid/rejected/closed
→ Dashboard shows results and prevention insights
```

---

## 9. Source Systems for MVP

The MVP should focus on:

**Required**

- Shopify order data;
- Gorgias ticket data;
- existing Unauth case/rules/evidence system.

**Optional / fallback**

- manual/demo data;
- seeded cases;
- manual evidence entries;
- manual recovery status updates.

**Not required yet**

- Zendesk;
- Freshdesk;
- Salesforce Service Cloud;
- Loop/Narvar/returns platforms;
- WMS/ERP;
- carrier claim APIs;
- 3PL APIs;
- supplier systems;
- payment dispute APIs.

Design the data model to be source-aware, but do not overbuild integrations.

---

## 10. Core Object: Support Payout Case

The MVP should centre around:

**SupportPayoutCase**

This represents a post-purchase event where money or value may leave the business.

Examples:

- item not received;
- damaged item;
- wrong item;
- missing item;
- late delivery;
- refund request;
- replacement request;
- returnless refund;
- store credit request;
- chargeback-related case;
- policy exception;
- goodwill payout.

A support payout case should include:

```ts
type SupportPayoutCase = {
  id: string
  merchantId: string
  sourceSystem: 'gorgias' | 'shopify' | 'manual' | 'demo'
  sourceTicketId?: string
  sourceOrderId?: string
  claimType:
    | 'item_not_received'
    | 'damaged_item'
    | 'wrong_item'
    | 'missing_item'
    | 'late_delivery'
    | 'refund_request'
    | 'replacement_request'
    | 'returnless_refund'
    | 'store_credit_request'
    | 'chargeback_related'
    | 'policy_exception'
    | 'other'
  requestedAction:
    | 'refund'
    | 'reship'
    | 'replacement'
    | 'store_credit'
    | 'discount'
    | 'return_label'
    | 'investigation'
    | 'unknown'
  payoutExposureAmount: number
  currency: string
  evidenceStrength: 'strong' | 'medium' | 'weak' | 'unknown'
  recommendation:
    | 'approve_payout'
    | 'ask_for_evidence'
    | 'manual_review'
    | 'deny_under_policy'
    | 'approve_and_open_recovery'
    | 'open_investigation'
    | 'prevention_only'
  lossAttribution:
    | 'carrier'
    | 'three_pl'
    | 'warehouse'
    | 'supplier'
    | 'returns_provider'
    | 'payment_dispute'
    | 'customer_disputed'
    | 'merchant_policy'
    | 'support_process'
    | 'unknown'
    | 'prevention_only'
  attributionConfidence: 'high' | 'medium' | 'low'
  recoverability:
    | 'recoverable'
    | 'possibly_recoverable'
    | 'unrecoverable'
    | 'prevention_only'
    | 'unknown'
  status:
    | 'new'
    | 'waiting_evidence'
    | 'manual_review'
    | 'resolved'
    | 'recovery_opened'
    | 'closed'
  outcome?: {
    actionTaken:
      | 'refunded'
      | 'reshipped'
      | 'replaced'
      | 'store_credit_issued'
      | 'discount_issued'
      | 'denied'
      | 'escalated'
      | 'evidence_requested'
      | 'no_action'
    amountPaid?: number
    reason?: string
    followedRecommendation?: boolean
  }
  createdAt: string
  updatedAt: string
}
```

Use existing schema where possible. Do not destructively replace current models if similar fields already exist.

---

## 11. Gorgias Widget MVP

The Gorgias widget is not the full product.

It is a **4-line decision card**.

Its job is:

**Tell the support agent what to do before they issue money.**

The widget should follow this structure:

```txt
[Claim type] · [Requested action] · [Amount at risk]
Evidence: [key evidence present] · [key evidence missing]
Rule: [merchant rule fired] → [recommendation]
Recovery: [recoverability] · [next action] · Open case →
```

**Example: Strong proof-of-delivery INR**

```txt
INR claim · Reship requested · £86 at risk
Evidence: delivered + delivery photo present
Rule: Strong POD + £75+ order → Manual review
Recovery: carrier unlikely · Ask follow-up · Open case →
```

**Example: Carrier lost parcel**

```txt
INR claim · Reship requested · £64 at risk
Evidence: no delivery scan · tracking stale 10d
Rule: Lost-in-transit → Approve reship
Recovery: carrier possible · Open recovery →
```

**Example: Damaged item**

```txt
Damaged item · Replacement requested · £42 at risk
Evidence: damage photo present · packaging photo missing
Rule: packaging photo required before replacement
Recovery: possible · Ask for packaging photo →
```

**Example: Wrong item**

```txt
Wrong item · Replacement requested · £58 at risk
Evidence: customer photo present · pick record missing
Rule: approve replacement + open 3PL review
Recovery: 3PL possible · Open case →
```

**Example: Refund outside policy**

```txt
Refund request · Return required · £72 at risk
Evidence: item not returned
Rule: return required before refund
Recovery: none · Send return instructions →
```

Do not put full investigation details in the widget.

The widget should link to the full Unauth case.

---

## 12. Full Case Page MVP

The full case page should show the details that cannot fit in the widget.

It should include:

### Header

- claim type;
- requested action;
- amount at risk;
- current status;
- recommendation;
- source ticket/order;
- customer/order summary.

### Recommendation Card

Show:

- recommended action;
- merchant rule fired;
- why the rule fired;
- matched conditions;
- confidence;
- next step.

Copy should be direct:

> "Manual review recommended because this is an item-not-received claim over £75 with strong proof of delivery."

Not:

> "Customer is suspicious."

### Evidence Checklist

Show:

- evidence present;
- evidence missing;
- evidence required before payout;
- evidence required for recovery;
- evidence strength.

Evidence types needed for MVP:

```ts
type EvidenceType =
  | 'tracking_status'
  | 'delivery_scan'
  | 'delivery_photo'
  | 'customer_message'
  | 'damage_photo'
  | 'packaging_photo'
  | 'wrong_item_photo'
  | 'proof_of_value'
  | 'proof_of_dispatch'
  | 'packing_slip'
  | 'warehouse_pick_pack_record'
  | 'weight_scan'
  | 'refund_proof'
  | 'reship_proof'
  | 'chargeback_notice'
  | 'note'
  | 'other'
```

Keep backwards compatibility with existing evidence types.

### Attribution Card

Show:

- likely owner;
- confidence;
- reason;
- missing evidence;
- whether external recovery is realistic.

Examples:

- Likely owner: Carrier — Confidence: Medium — Reason: Tracking has not updated for 10 days and no delivery proof exists.
- Attribution: Customer-disputed delivery — Confidence: High — Reason: Delivery scan and delivery photo are present. Carrier recovery is unlikely.
- Likely owner: 3PL / warehouse — Confidence: Medium — Reason: Ordered SKU differs from item shown in customer photo. Missing evidence: pick/pack record.

Avoid definitive blame.

### Outcome Logging

The merchant should be able to record:

- refunded;
- reshipped;
- replaced;
- store credit issued;
- discount issued;
- denied;
- escalated;
- evidence requested;
- no action.

Also record:

- amount paid;
- whether recommendation was followed;
- reason/note;
- agent/user;
- timestamp.

This is essential for later analytics.

---

## 13. Recovery Case MVP

A recovery case should be created only when there is a realistic recovery or chase-up route.

Do not create recovery cases for every support payout.

**Create recovery cases when:**

- recoverability is recoverable or possibly_recoverable;
- likely owner is carrier/3PL/warehouse/supplier/returns provider/payment dispute;
- merchant rule recommends recovery;
- evidence suggests partner accountability.

**Do not create recovery cases when:**

- carrier proof is strong and recovery is unlikely;
- case is merchant-policy/goodwill only;
- case is prevention-only;
- there is no evidence and no likely owner;
- the loss is too small to chase if merchant rules say not worth it.

A recovery case should include:

```ts
type RecoveryCase = {
  id: string
  merchantId: string
  supportPayoutCaseId: string
  recoveryType:
    | 'carrier_claim'
    | 'three_pl_claim'
    | 'warehouse_error'
    | 'supplier_defect'
    | 'returns_provider_claim'
    | 'chargeback_evidence'
    | 'internal_policy_fix'
    | 'other'
  ownerType:
    | 'carrier'
    | 'three_pl'
    | 'warehouse'
    | 'supplier'
    | 'returns_provider'
    | 'payment_dispute_provider'
    | 'merchant_support'
    | 'merchant_ops'
    | 'merchant_finance'
    | 'unknown'
  status:
    | 'evidence_needed'
    | 'ready_to_submit'
    | 'submitted'
    | 'waiting_response'
    | 'chase_due'
    | 'approved'
    | 'partially_approved'
    | 'rejected'
    | 'paid'
    | 'closed_unrecoverable'
  merchantLossAmount: number
  estimatedRecoverableMin?: number
  estimatedRecoverableMax?: number
  amountRecovered?: number
  currency: string
  requiredEvidence: string[]
  missingEvidence: string[]
  evidenceComplete: boolean
  deadlineAt?: string
  nextChaseAt?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}
```

---

## 14. Recovery Board MVP

Create a simple recovery board.

**Columns:**

- Needs evidence
- Ready to submit
- Submitted
- Waiting response
- Chase due
- Approved
- Rejected
- Paid
- Closed unrecoverable

Each card should show:

- linked payout case;
- order/ticket reference;
- recovery type;
- owner;
- merchant loss amount;
- estimated recoverable amount;
- evidence completeness;
- deadline;
- next chase date;
- status.

**Quick actions:**

- mark evidence added;
- mark ready to submit;
- mark submitted;
- mark chased;
- mark approved;
- mark rejected;
- mark paid;
- close unrecoverable.

This can be manual in the MVP.

Do not build automatic carrier claim submission yet.

The product value is that recoverable cases no longer disappear into spreadsheets or inboxes.

---

## 15. Partner Rulebook MVP

Add a lightweight partner rulebook.

The rulebook tells Unauth:

- what claim types may be recoverable;
- what evidence is needed;
- what deadlines apply;
- what costs are claimable;
- what costs are excluded;
- who owns the recovery;
- how to submit or track it.

Partner types:

```ts
type PartnerType =
  | 'carrier'
  | 'three_pl'
  | 'warehouse'
  | 'supplier'
  | 'returns_provider'
  | 'payment_dispute_provider'
  | 'internal_team'
  | 'other'
```

**Rule example: Carrier claim — lost parcel**

- Applies to: item_not_received
- Required evidence: tracking number, proof of dispatch, proof of value
- Deadline: 14 days
- Claimable: item value, shipping cost
- Excluded: goodwill credit, support time

**Another example: 3PL claim — wrong item**

- Applies to: wrong_item
- Required evidence: ordered SKU, customer photo, packing slip, pick/pack record
- Claimable: replacement item cost, replacement shipping

The MVP can use merchant-configured/default rules.

Do not build AI contract extraction yet.

---

## 16. Recommendation Vocabulary

Avoid pure fraud-style outputs.

Use operational recommendations:

```ts
type Recommendation =
  | 'approve_payout'
  | 'ask_for_evidence'
  | 'manual_review'
  | 'deny_under_policy'
  | 'approve_and_open_recovery'
  | 'open_investigation'
  | 'prevention_only'
```

Each recommendation must include:

- rule fired;
- explanation;
- next action;
- evidence required if any;
- whether recovery should be opened.

**Example:**

- Recommendation: Ask for evidence
- Rule fired: Damaged item requires packaging photo before replacement
- Reason: Damage photo is present, but packaging photo is missing. Carrier/supplier recovery may fail without it.
- Next action: Ask customer for packaging photo.

---

## 17. Required MVP Scenarios

The MVP should fully support these five scenarios.

### Scenario 1 — Strong POD, customer says item not received

**Input:**

- customer claims item not received;
- delivery scan present;
- delivery photo present;
- order value over threshold.

**Expected output:**

- Recommendation: Manual review / ask structured follow-up
- Evidence strength: Strong
- Recoverability: Unrecoverable or low
- Attribution: Customer-disputed delivery / post-delivery issue
- Recovery case: Not created
- Prevention: Signature/pickup point if repeated

**Purpose:** proves the product does not force blame; prevents weak reships; shows policy control.

### Scenario 2 — Carrier lost parcel

**Input:**

- item not received;
- tracking stale;
- no delivery scan;
- no delivery photo;
- merchant wants to reship.

**Expected output:**

- Recommendation: Approve reship + open recovery
- Evidence strength: Medium
- Attribution: Carrier
- Recoverability: Possibly recoverable
- Recovery case: Carrier claim

**Purpose:** proves direct recovery workflow.

### Scenario 3 — Damaged item

**Input:**

- customer reports damage;
- damage photo present;
- packaging photo missing.

**Expected output:**

- Recommendation: Ask for packaging photo before replacement
- Evidence strength: Medium
- Attribution: Carrier / supplier / packaging unknown
- Recoverability: Possibly recoverable
- Recovery case: Not ready until evidence complete

**Purpose:** proves evidence collection before payout.

### Scenario 4 — Wrong item

**Input:**

- customer says wrong item received;
- ordered SKU differs from customer photo;
- replacement requested.

**Expected output:**

- Recommendation: Approve replacement + open 3PL/warehouse recovery
- Evidence strength: Medium
- Attribution: 3PL / warehouse
- Recoverability: Possibly recoverable
- Recovery case: Created

**Purpose:** proves customer-friendly support + operational accountability.

### Scenario 5 — Refund outside policy

**Input:**

- customer asks for refund;
- merchant policy requires return first;
- item has not been returned.

**Expected output:**

- Recommendation: Send return instructions / deny immediate refund under policy
- Recoverability: None
- Attribution: Merchant policy if refund issued anyway
- Recovery case: Not created
- Prevention: Policy leakage insight

**Purpose:** proves prevention value even without external recovery.

---

## 18. Dashboard MVP

The dashboard should show operational results, not vanity risk metrics.

**Required metrics:**

- Payout exposure reviewed
- Refunds/reships issued
- Recoverable amount identified
- Recovery cases open
- Amount recovered
- Rejected/unrecoverable amount
- Prevention-only losses
- Merchant policy losses
- Top claim types
- Top likely loss owners
- Cases missing evidence
- Cases chase due

**Example dashboard copy:**

- £42,800 payout exposure reviewed this month
- £11,400 identified as recoverable
- £3,200 recovered
- £5,700 currently chase due
- £8,900 prevention-only losses identified

This helps merchants understand ROI without needing a recovered-money commission.

---

## 19. Product Copy Rules

Use language like:

- payout exposure;
- support payout case;
- evidence strength;
- evidence missing;
- merchant rule fired;
- recommended action;
- loss attribution;
- recoverability;
- recovery owner;
- chase due;
- prevention opportunity;
- policy leakage;
- partner accountability.

Avoid language like:

- fraudster;
- bad actor;
- blacklist;
- guilty;
- caught;
- blame;
- scammer;
- cross-merchant accusation.

If identity/network context is shown, phrase it as:

- "Claim-history context"

or:

- "Pattern context"

Not:

- "Fraud network match."

---

## 20. How It Should Feel in Use

### In Gorgias

It should feel like:

> "Before I refund or reship, I have a clear 4-line decision."

The agent should not need to leave Gorgias unless the case needs deeper review.

The widget should be quick, compressed, and action-oriented.

### In the Unauth case page

It should feel like:

> "This is the complete operating record for this payout decision."

A manager should understand:

- what the customer asked for;
- what evidence existed;
- what rule fired;
- what support did;
- whether the action was recoverable;
- whether a recovery case exists;
- what happened next.

### In the recovery board

It should feel like:

> "These are the losses we can still do something about."

Ops should be able to work the board every day.

They should see:

- what needs evidence;
- what is ready;
- what was submitted;
- what needs chasing;
- what was approved;
- what was rejected;
- what was paid.

### In dashboards

It should feel like:

> "We finally know where post-purchase money is leaking."

Leadership should see:

- money reviewed;
- money recovered;
- losses prevented;
- recurring causes;
- partner performance;
- policy leakage.

---

## 21. Expected Results for Merchant

The MVP should help merchants achieve:

**Immediate results**

- fewer blind refunds/reships;
- better support consistency;
- faster evidence requests;
- clearer escalation decisions;
- less manual investigation.

**Operational results**

- recoverable carrier/3PL/supplier cases no longer forgotten;
- evidence needed for recovery is captured earlier;
- chase-up work is visible;
- partner rejection reasons are recorded;
- support outcomes are auditable.

**Financial results**

- payout exposure measured;
- recoverable losses identified;
- recovered amount tracked;
- unrecoverable losses categorized;
- policy leakage surfaced;
- prevention opportunities identified.

**Strategic results**

- merchants see which claim types cost the most;
- merchants see which partners cause repeated losses;
- merchants see which policies leak money;
- merchants can tighten rules based on evidence.

---

## 22. MVP Success Criteria

The MVP is successful if a merchant can say:

> Unauth helped us understand which support payouts were justified, which needed evidence, which were recoverable, which were not worth chasing, and which patterns we need to prevent.

More specifically, the MVP succeeds if it can show:

- total payout exposure reviewed;
- number of cases where evidence was requested before payout;
- number of payouts prevented or escalated;
- number of recovery cases opened;
- amount recovered;
- amount rejected/unrecoverable;
- policy leakage identified;
- repeated operational causes found.

---

## 23. Implementation Priorities

Build in this order:

1. **Core case clarity** — make support_payout_cases the centre; ensure claim type, requested action, payout exposure, evidence status, recommendation, attribution, and recoverability are visible.
2. **Gorgias 4-line widget** — compress the decision into the widget; link to full case.
3. **Evidence checklist** — evidence present/missing; evidence required before payout; evidence required for recovery.
4. **Rules-led recommendations** — merchant rule fired; matched conditions; clear next action.
5. **Recovery cases** — create recovery cases for recoverable/possibly recoverable losses; do not create them for strong-POD unrecoverable cases.
6. **Recovery board** — status columns; manual chase workflow; amount recovered/rejected/closed.
7. **Partner rulebook v1** — carrier/3PL/supplier/default rules; required evidence; deadlines; claimable/excluded costs.
8. **Dashboard** — payout exposure; recoverable amount; recovered amount; prevention-only; policy leakage; top owners/claim types.

---

## 24. Hard Constraints

Do not make Unauth the decision-maker.

Merchant rules make the recommendation.

Unauth surfaces:

- evidence;
- matched rule;
- payout exposure;
- attribution;
- recoverability;
- next action.

Do not say:

> "Unauth denied this customer."

Say:

> "Merchant rule recommends manual review because strong delivery proof exists and the order is above the review threshold."

Do not force blame.

If attribution is uncertain, show:

- "Unknown"
- "Possible carrier issue"
- "Possible 3PL issue"
- "Recovery unlikely"
- "Prevention-only"

---

## 25. Final MVP Definition

The MVP is:

> A Shopify/Gorgias-based post-purchase payout-control system that creates support payout cases, shows a 4-line agent decision card, applies merchant rules, tracks evidence, classifies attribution/recoverability, opens manual recovery cases where appropriate, and reports what was recovered, rejected, prevented, or leaked.

It should feel to the merchant like:

> "We finally have control over refunds, reships, evidence, recoveries, and preventable post-purchase losses."
