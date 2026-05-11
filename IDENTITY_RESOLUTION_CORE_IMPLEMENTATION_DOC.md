# Identity Resolution Core Implementation Plan

Date: 2026-05-11
Scope: fix the ASOS-facing identity engine semantics, scoring, export, tests, and UI copy.
Primary principle: this product is an identity-resolution tool, not a fraud classifier.

## 1. Product Contract

The app should tell a merchant:

> A customer has placed a new order. Some data points have changed, but the identity graph suggests this is the same underlying customer because of these matched identifiers.

The core engine must answer only:

1. Are these orders/customer records likely the same person or household/account entity?
2. Which data points caused that conclusion?
3. Which data points changed?
4. How confident is the identity link?

The core engine must not answer:

1. Is this person a fraudster?
2. Should the merchant decline automatically?
3. Is this order bad because the row has a refund, chargeback, or dispute label?

Refund rate, dispute history, INR claims, refund timing, value escalation, chargeback history, and CE 3.0-style facts are merchant decision support only. They may appear as contextual panels after an identity has been linked, but they must never drive the identity match score, match grade, cluster expansion, or "same customer" claim.

## 2. Current Failure Pattern

The recent 50k ASOS-shaped export shows the engine has drifted into a mixed identity/risk scorer:

| Observation | Why It Breaks The Contract |
|---|---|
| 49,993 of 50,000 rows received an `identity_score`. | Almost every customer becomes a surfaced identity match, so the review queue is not useful. |
| `name` appeared in almost every `signals_matched` value. | Common names are not an identity anchor. They can corroborate, but must not create or inflate a match. |
| `postcode; name` rows scored as probable in examples. | Postcode + name is too weak for "same customer" at ASOS scale. |
| Current refund/chargeback labels feed scoring and expansion paths. | This leaks outcome/context labels into the core identity claim. |
| Row evidence and row score can disagree. | A row can inherit a high cluster score while only showing weak row-level evidence. |
| Export omits `match_status`, candidate/confirmed IDs, context flags, and explanation fields. | ASOS cannot audit why the app made a claim. |

The fix is not "tune fraud weights." The fix is to split identity evidence from merchant context and make every merchant-visible score explainable from identity data points only.

## 3. Target Architecture

### 3.1 Core Identity Linker

Owner files:

- `lib/linker.ts`
- `lib/identity/normalise.ts`
- `lib/processing/signals.ts`
- new `lib/identity/evidence.ts`

Responsibilities:

- Normalize merchant-provided data points.
- Build candidate pairs from matching identifiers.
- Score identity evidence only.
- Return pair-level evidence and cluster-level connected components.

Allowed core identity evidence:

| Category | Examples | Role |
|---|---|---|
| Strong anchors | PSP card fingerprint, device ID, browser fingerprint, cookie ID, merchant account ID, phone number, verified email/account login ID | Can anchor an identity link. |
| Medium anchors | Normalized email variant, email username across domains, full payment token surrogate, full shipping/billing address, billing-shipping cross-match | Can anchor with corroboration. |
| Corroborators | Postcode, IP, IP subnet, customer name, address token overlap, card BIN + last4, payment method family | Can increase confidence only after an anchor exists. |
| Non-core context | refund requested, refund reason, chargeback filed, dispute history, refund rate, order value anomaly, INR speed | Never used for identity score or cluster membership. |

Hard rule: a row with only name, postcode, address, IP, BIN+last4, or payment method must not produce a probable/confirmed identity match.

### 3.2 Identity Match Scorer

Create a new module:

- `lib/identity/matchScorer.ts`

Responsibilities:

- Convert pair/row identity evidence into:
  - `identity_match_score`
  - `identity_match_grade`
  - `match_status`
  - `matched_datapoints`
  - `changed_datapoints`
  - `evidence_summary`

Do not reuse the current `lib/scorer.ts` for core identity scoring. Keep `lib/scorer.ts` or a renamed context module for contextual insights only.

Target statuses:

| Status | Meaning | Persistence Rule |
|---|---|---|
| `none` | No meaningful identity relationship. | No cluster/profile relationship. |
| `candidate` | Weak but useful signal; analyst can inspect. | No profile merge. |
| `probable` | Strong enough to group in review UI. | Candidate profile relationship only. |
| `confirmed` | High-confidence same identity. | Confirmed identity relationship. |
| `merchant_confirmed` | Merchant manually confirmed. | Confirmed by human action. |
| `dismissed` | Merchant rejected the link. | Suppress future surfacing unless stronger new evidence appears. |

Suggested grade gates:

| Grade | Minimum Evidence |
|---|---|
| `confirmed` | Two independent strong anchors, or one high-entropy anchor plus at least two corroborators. |
| `probable` | One strong anchor plus one corroborator, or two medium anchors. |
| `candidate` | One medium anchor, or one weak anchor plus multiple corroborators. |
| `none` | Single soft signal, name-only, postcode-only, IP-only, address-only, BIN+last4-only. |

Important: these are evidence rules first, numeric scores second. Numeric weights must not allow a pile of weak signals to outrank missing anchor evidence.

### 3.3 Context Enrichment

Create or clarify a separate module:

- `lib/identity/contextInsights.ts`

Responsibilities:

- Calculate extras after identity matching:
  - refund rate
  - dispute history
  - prior chargebacks
  - INR patterns
  - refund timing
  - order value context
  - CE 3.0 supporting facts

Output fields must be named as context, not identity:

- `context_flags`
- `context_summary`
- `merchant_decision_context`
- `ce3_context`

Rule: context can change sort order inside a merchant review view, but cannot change `identity_match_score`, `identity_match_grade`, `match_status`, `cluster_id`, `candidate_cluster_id`, or `confirmed_identity_id`.

## 4. Implementation Phases

### Phase 1 - Rename The Model Contract Without Behaviour Changes

Goal: stop product and code from implying this is a fraud score.

Files:

- `lib/processing/types.ts`
- `lib/supabase/types.ts`
- `supabase/migrations/*`
- `components/audit/*`
- `components/customers/*`
- `lib/copy/*`
- `app/api/audit/[runId]/export/route.ts`

Tasks:

1. Add additive DB columns:
   - `identity_match_score numeric`
   - `identity_match_grade text`
   - `identity_evidence jsonb not null default '[]'::jsonb`
   - `matched_datapoints jsonb not null default '[]'::jsonb`
   - `changed_datapoints jsonb not null default '[]'::jsonb`
   - `context_flags jsonb not null default '[]'::jsonb`
   - `context_summary jsonb`
2. Keep legacy columns for compatibility:
   - `identity_score`
   - `identity_confidence_grade`
   - `signals_matched`
3. Update copy:
   - Replace "fraud score" with "identity match score" where the field is identity-specific.
   - Replace "risk" language on identity rows with "confidence" or "match strength".
   - Use "context" for refund/dispute facts.
4. Update export headers to prepare for the new contract, even if initially backfilled from old values.

Acceptance:

- Existing ingest still works.
- Existing UI still renders.
- No merchant-facing copy says refund/dispute context is part of the identity proof.

### Phase 2 - Build A Pure Identity Match Scorer

Goal: compute identity confidence from identifiers only.

Files:

- new `lib/identity/matchScorer.ts`
- `lib/linker.ts`
- `lib/processing/signals.ts`
- `tests/identity/*`

Tasks:

1. Implement an evidence object:

```ts
export type IdentityEvidence = {
  signal: 'device' | 'account' | 'phone' | 'email' | 'card' | 'shipping_address' | 'billing_address' | 'postcode' | 'ip' | 'name';
  tier: 'strong' | 'medium' | 'corroborator';
  matchType: 'exact' | 'variant' | 'partial' | 'cross_match' | 'fuzzy';
  matchedValueLabel: string;
  points: number;
  anchor: boolean;
};
```

2. Add hard caps:
   - no anchor evidence -> max `none`
   - one soft/corroborator only -> max `none`
   - name-only -> max `none`
   - postcode+name -> max `candidate`, preferably `none` for large merchants
   - IP+postcode -> max `candidate` unless a strong anchor also exists
   - BIN+last4 only -> max `none`
3. Score per row against the cluster, not just the cluster against itself.
4. Generate `matched_datapoints` and `changed_datapoints` for each row:
   - matched: "same phone", "same shipping address", "same email base"
   - changed: "new email surface form", "different IP", "new card last4"
5. Build a plain-English explanation:
   - "Likely same customer: phone and shipping address match prior orders; email changed from `x` to `y`."

Acceptance:

- Flipping `refund_requested` or `chargeback_filed` in a test fixture does not change any identity score, grade, status, or cluster assignment.
- A row cannot inherit a high score unless its own row evidence supports that score.
- `name`, `postcode`, `ip`, `address`, or BIN+last4 alone never produce probable/confirmed.

### Phase 3 - Remove Behaviour From Cluster Expansion

Goal: expansion must find hidden identities, not suspicious behaviour.

Files:

- `lib/processing/clusterExpansion.ts`
- `lib/processing/worker.ts`
- `tests/linker/*`
- `tests/identity/*`

Current issue:

- `expandSuspiciousClusters()` uses refund/chargeback behaviour to promote or add rows to clusters.

Replacement:

- Promote candidate groups only when identity evidence passes a stricter identity-only gate.
- Expand from seed clusters only when the candidate row has enough identity evidence against the seed cluster.
- Do not require or inspect `refund_requested`, `chargeback_filed`, `refund_reason`, or refund amount.

Identity-only expansion examples:

| Candidate Evidence | Expansion Result |
|---|---|
| Same phone + same shipping address | Add as probable/confirmed depending on score. |
| Same email base + same account ID | Add as confirmed/probable. |
| Same IP + same postcode only | Candidate at most; do not merge. |
| Same name + same postcode | Do not merge. |
| Same BIN+last4 + same postcode | Candidate at most; do not merge unless another anchor exists. |
| Refund requested + same postcode | No identity expansion. |

Acceptance:

- Current outcome labels have zero effect on expansion.
- Known shared-address and corporate-IP traps remain unmerged.
- Identity rings with changed email/phone/card still surface when there is real anchor evidence.

### Phase 4 - Persist Core Identity And Context Separately

Goal: the database should make misuse difficult.

Files:

- `lib/processing/worker.ts`
- `lib/processing/types.ts`
- `supabase/migrations/*`
- `lib/analysis/entityResolution.ts`
- `lib/analysis/customerIntelligence.ts`

Tasks:

1. Write core identity fields:
   - `identity_match_score`
   - `identity_match_grade`
   - `match_status`
   - `identity_evidence`
   - `matched_datapoints`
   - `changed_datapoints`
   - `candidate_cluster_id`
   - `confirmed_identity_id`
2. Write context fields separately:
   - `context_flags`
   - `context_summary`
   - `ce3_eligible`
   - `ce3_qualifying_transactions`
3. Preserve old fields during migration:
   - mirror new score into old `identity_score` only if needed for UI compatibility
   - add TODO and follow-up migration to remove legacy dependence
4. Ensure customer profiles only merge from:
   - `confirmed`
   - `merchant_confirmed`
   - optionally `probable` as candidate relationship only, never confirmed profile merge

Acceptance:

- Database queries can distinguish identity evidence from decision context.
- Profile merge logic never uses refund/dispute context.
- Candidate relationships do not become confirmed identities automatically.

### Phase 5 - Rebuild The Export For ASOS

Goal: export should be defensible in a merchant review.

File:

- `app/api/audit/[runId]/export/route.ts`

New export columns:

```text
order_id
processed_at
order_value
customer_email
customer_name
match_status
identity_match_score
identity_match_grade
cluster_id
candidate_cluster_id
confirmed_identity_id
matched_datapoints
changed_datapoints
identity_evidence
evidence_summary
context_flags
context_summary
recommended_review_reason
```

Column semantics:

- `identity_*` columns must contain only identity evidence.
- `context_*` columns may contain refund/dispute/rate information.
- `recommended_review_reason` should be generated from identity first, then context second:
  - good: "Same phone and address as prior orders; email changed. Context: prior refund claims exist."
  - bad: "High refund rate means same customer."

Acceptance:

- ASOS can audit every high-confidence row from the CSV alone.
- Rows with weak evidence do not show high confidence.
- Export row count and order values reconcile to upload.

### Phase 6 - Update UI To Match The Contract

Goal: analysts understand that the product finds repeat identities, not guilt.

Files:

- `components/audit/AuditCustomersTableClient.tsx`
- `components/audit/CustomerProfileCard.tsx`
- `components/audit/RecommendedAction.tsx`
- `components/audit/AuditTabs.tsx`
- `components/customers/*`
- `lib/copy/*`

UI changes:

1. Primary row label:
   - "Identity match"
   - "Likely same customer"
   - "Changed data points"
2. Evidence section:
   - Matched identifiers
   - Changed identifiers
   - Missing identifiers
3. Context section:
   - Refund/dispute context
   - Prior merchant history
   - CE 3.0 context
4. Avoid:
   - "fraud score"
   - "fraud ring"
   - "criminal"
   - any claim that context proves identity

Acceptance:

- A merchant can tell exactly why the app thinks the customer is the same person.
- Refund/dispute cards are visually secondary and labelled as context.
- Candidate/probable/confirmed states are visually distinct.

## 5. Test Plan

### 5.1 Core Invariance Tests

Add tests that duplicate the same CSV rows while flipping only:

- `refund_requested`
- `refund_reason`
- `refund_amount`
- `chargeback_filed`
- `refund_status`

Expected result:

- identical `identity_match_score`
- identical `identity_match_grade`
- identical `match_status`
- identical cluster assignments
- context fields may change

### 5.2 False Positive Trap Fixtures

Create fixtures under `tests/fixtures/identity/`:

| Fixture | Expected |
|---|---|
| 1,000 customers named common names across shared postcodes | no probable/confirmed matches |
| Student hall / office address with many legitimate customers | no merge from address/name alone |
| Corporate IP shared by many customers | no merge from IP alone |
| BIN+last4 collision across different customers | no merge from card partial alone |
| Same surname at same address but different accounts/phones/emails | candidate at most, no confirmed |
| Refund-heavy customer with no identity overlap | no identity match |
| Chargeback-labelled row with only name overlap | no identity match |

### 5.3 Positive Identity Fixtures

Create fixtures where the answer key is `true_identity_id`, not fraud/refund labels:

| Scenario | Expected |
|---|---|
| Same phone + changed email + same address | probable/confirmed |
| Same device/account + changed email/card | confirmed |
| Same email base plus new card and IP | probable |
| Same billing address + same phone + changed shipping address | probable/confirmed |
| Same account ID + same email username across domains | probable/confirmed |
| New order where all visible data changed except strong device/account token | confirmed |

### 5.4 Export Tests

Add API/export tests:

- exported row count equals ingested valid row count
- every `identity_match_score >= probable` row has anchor evidence
- `context_flags` do not appear inside `identity_evidence`
- CSV escaping still prevents formula injection
- `candidate_cluster_id` and `confirmed_identity_id` follow match-status rules

### 5.5 Metrics To Report

Stop reporting fraud precision/recall as the core engine metric.

Report identity-resolution metrics:

| Metric | Meaning |
|---|---|
| Pairwise precision | Of surfaced pairs, how many share the same `true_identity_id`? |
| Pairwise recall | Of true same-identity pairs, how many were surfaced? |
| Cluster purity | Are clusters contaminated with unrelated identities? |
| Confirmed precision | Confirmed links should be extremely high precision. |
| Candidate recall | Candidate can be broader, but must be labelled as review-only. |
| Row evidence consistency | Every row's score is supported by its own evidence. |

Minimum ASOS demo gate:

- confirmed/probable pairwise precision: >= 98%
- confirmed cluster purity: >= 99%
- no confirmed links from soft-only evidence
- candidate false-positive rate on clean/shared-address fixtures: <= 0.5%
- zero score changes when refund/dispute labels are flipped

## 6. PR Sequence

### PR 1 - Contract And Schema

Add new columns, types, and copy labels. No scoring changes.

Gate:

- build passes
- migrations apply cleanly
- old UI still works

### PR 2 - Pure Identity Scorer

Introduce `lib/identity/matchScorer.ts` and tests. Keep old scorer available for context.

Gate:

- invariance tests pass
- false-positive traps pass
- positive identity fixtures pass

### PR 3 - Identity-Only Expansion

Remove behaviour gates from `clusterExpansion`.

Gate:

- refund/chargeback flips do not change clusters
- shared IP/address/name traps do not merge

### PR 4 - Worker Persistence Split

Write core identity fields and context fields separately.

Gate:

- database rows show identity/context split
- customer profile merges only from confirmed identity states

### PR 5 - Export And UI

Ship ASOS-defensible export and update merchant-facing UI copy.

Gate:

- export audit tests pass
- UI shows matched and changed data points
- context is visibly secondary

### PR 6 - Eval Harness

Replace fraud-label eval with identity-answer-key eval.

Gate:

- pairwise precision/recall and cluster purity reported
- regression fixtures added to CI
- ASOS demo dataset has a `true_identity_id` answer key

## 7. Non-Negotiable Rules

1. No refund/dispute/chargeback/current outcome field may affect core identity score or cluster membership.
2. A row's grade must be explainable from that row's own matched data points.
3. Weak signals can corroborate but cannot anchor a same-customer claim.
4. Candidate links are not confirmed identities.
5. Merchant context must be useful but visually and technically separate from identity proof.
6. Export must be understandable without reading the app code.
7. Every scorer threshold change ships with fixture updates and metric output.

## 8. Definition Of Done

The work is complete when a merchant can upload an ASOS-shaped file and receive an export/UI that says:

- which rows are likely the same customer
- what matched
- what changed
- how confident the app is
- what extra refund/dispute context exists, clearly labelled as context

And the system can prove through tests that:

- customer outcome labels do not influence identity matching
- common names, shared postcodes, shared IPs, and partial card collisions do not create high-confidence matches
- high-confidence identity links are supported by strong evidence
- context is available for merchant judgement but never disguised as identity proof

