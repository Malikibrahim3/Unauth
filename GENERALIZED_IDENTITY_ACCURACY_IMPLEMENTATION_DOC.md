# Generalized Identity Accuracy Fix And Test Plan

## Purpose

Fix the identity/audit output so it works across merchant CSVs and export styles, not just the current ASOS-like file.

The current result has excellent recall on the supplied answer key but an unusably high review rate. The fix must separate:

- normal repeat-customer identity evidence
- review-worthy identity-obscuration evidence
- contextual refund/return/chargeback risk

Do not tune against one merchant file, one brand, one country, or one set of column names.

## Baseline From The Supplied Files

Files used:

- Source CSV: `/Users/malikibrahim/Downloads/MERCHANT CVS 2.csv`
- Expected positives: `/Users/malikibrahim/Downloads/MERCHANT CVS ANSWERS.csv`
- Actual audit output: `/Users/malikibrahim/Downloads/audit-1b25b773.csv`

Observed baseline:

- Source rows: 105,000
- Audit output rows: 104,990
- Expected positive rows: 1,650
- Expected positives caught: 1,639
- Expected positives missed: 11
- Rows surfaced as identity review by current output: 17,164
- Surfaced rows not in the answer key: 15,525
- Recall against answer key: 99.33%
- Precision if the answer key is exhaustive: 9.55%

This is not ready to hand to a merchant as an operational review queue. It catches nearly all seeded positives but floods the queue with ordinary repeat customers.

Missed expected IDs:

```text
ORD-7010524
ORD-7013419
ORD-7021701
ORD-7032905
ORD-7038932
ORD-7071196
ORD-7072445
ORD-7076071
ORD-7082608
ORD-7101384
ORD-7102669
```

Missed scenario families:

- `FR-LOW-VALUE-SLOW-BURN`: 2
- `FR-ADDRESS-OCR-FUZZY`: 2
- `FR-RETURN-ABUSE-RING`: 2
- `FR-CROSS-BORDER-ALIAS`: 2
- `FR-UK-STUDENT-MIMIC`: 1
- `FR-ES-REFUND-FARM`: 1
- `FR-EMAIL-PHONE-SPARSE`: 1

Top extra surfaced signal combinations in the supplied audit:

```text
account; email; name                   5,469
email; name                            4,114
account; email; postcode; name         1,308
name                                   1,211
account; email                         1,159
email; postcode; name                  1,041
```

These are mostly normal same-customer or weak repeat-customer relationships. They should not be treated as suspicious identity review rows by default.

## Root Cause Hypothesis

The engine currently conflates "same person" with "review-worthy identity risk".

Relevant code areas:

- `lib/linker.ts`
- `lib/identity/matchScorer.ts`
- `lib/processing/clusterExpansion.ts`
- `lib/processing/worker.ts`
- `tests/identity/blindHarness.ts`
- `tests/identity/blindCsvHarness.test.ts`
- `tests/eval/*`

Specific likely causes:

1. Exact email, exact account, and exact name repeat orders are allowed to become candidate/probable review rows. For a merchant, this is normal customer history, not identity evasion.
2. `candidate_cluster_id` can be populated even when `match_status` or `identity_match_grade` is `none`. The supplied audit had over 1,000 such extra surfaced rows. This breaks the output contract.
3. Context signals such as refund rate are present on rows with no identity match. They are useful decision-support signals, but must not set identity cluster fields or identity review status.
4. The test harness does not fully mirror the persisted worker path. It uses older cluster scoring paths in `tests/identity/blindHarness.ts`, so tests can pass while exported audit semantics drift.
5. Source row count and audit output row count differ by 10 rows. That must be treated as a cardinality regression until explained.

## Target Product Contract

Implement these semantics consistently in code, DB fields, exports, and tests.

### 1. Normal Customer Entity

Rows sharing stable primary identifiers are normal customer history unless there is an identity-obscuration cue.

Examples that should not be review-worthy by themselves:

- same exact normalized email
- same exact merchant account/customer ID
- same exact email plus same name
- same exact account plus same email plus same name
- same exact customer reordering with a new card, new delivery address, or changed postcode

These relationships may be used internally for customer history and profile aggregation, but should not set:

- `match_status`
- `candidate_cluster_id`
- `confirmed_identity_id`
- `cluster_id`
- `identity_confidence_grade`

unless a separate review-worthy gate passes.

### 2. Review-Worthy Identity Link

A row is review-worthy for identity only when there is evidence of cross-surface reuse or evasion, for example:

- same phone across different emails or different accounts
- same card fingerprint across different emails or accounts
- same device/browser/cookie fingerprint across different emails or accounts
- email variant or alias pattern plus another independent signal
- same address or address-near-match plus another independent signal across different emails/accounts
- same billing/shipping cross-match plus another independent signal
- account reuse with changed email surface and a second independent signal

Weak signals must not create identity review rows alone:

- name only
- postcode only
- IP only
- BIN plus last4 only
- exact email only
- exact account only
- exact email plus exact name only
- exact account plus exact email plus exact name only

### 3. Contextual Abuse Signal

Refund, return, INR, delivery, or chargeback behavior can surface a transaction as contextual risk, but the export must label it as context risk and not as confirmed/candidate identity linkage unless identity gates also pass.

Context can affect:

- `context_flags`
- `context_summary`
- a separate `review_reason` or risk reason

Context must not affect:

- `identity_match_score`
- `identity_match_grade`
- `match_status`
- `candidate_cluster_id`
- `confirmed_identity_id`
- `cluster_id`

### 4. Field Invariants

Add invariant tests and enforce these before write/export:

```text
if match_status == "none":
  candidate_cluster_id == null
  confirmed_identity_id == null
  cluster_id == null
  identity_confidence_grade == null or "none"

if identity_match_grade == "none":
  match_status == "none"
  candidate_cluster_id == null
  confirmed_identity_id == null
  cluster_id == null

if confirmed_identity_id != null:
  match_status in {"definite", "confirmed", "merchant_confirmed"}

context_flags may be non-empty when match_status == "none"
```

## Implementation Plan

### Step 1 - Add A General Evaluation Harness

Create a reusable harness that can evaluate any source CSV, any answer key, and any audit export.

Suggested file:

- `scripts/eval/auditCsvAgainstAnswer.ts`

Inputs:

```bash
npm run eval:audit -- \
  --source "/path/source.csv" \
  --answers "/path/answers.csv" \
  --audit "/path/audit.csv" \
  --answers-exhaustive true \
  --out "test-results/external-audit-eval/latest.json"
```

Required behavior:

- Preserve IDs as strings.
- Preserve phone, postcode, card BIN, and last4 as strings.
- Treat `answers.expected_flag == true` as positive.
- If `answers-exhaustive=true`, treat all source rows not in the answer key as negative.
- Compute row cardinality: source rows vs audit rows.
- Compute precision, recall, F1, review rate, false-positive IDs, false-negative IDs.
- Break metrics down by `scenario_tag` when present.
- Break false positives down by `match_status`, `identity_match_grade`, `signals_matched`, and `matched_datapoints`.
- Fail with non-zero exit when acceptance thresholds are not met.

Add package script:

```json
"eval:audit": "ts-node --transpile-only --compiler-options '{\"module\":\"commonjs\",\"moduleResolution\":\"node\"}' scripts/eval/auditCsvAgainstAnswer.ts"
```

Do not hardcode ASOS or these file names. The CLI must work for any merchant CSV with configurable column names:

- order ID column default: `order_id`
- answer ID column default: `order_id`
- audit ID column default: `order_id`
- answer flag column default: `expected_flag`

### Step 2 - Make The Harness Mirror Worker Semantics

The current blind harness uses older scoring paths. Update it so tests evaluate the same logic that persistence uses.

Files:

- `tests/identity/blindHarness.ts`
- `lib/processing/worker.ts` helper extraction if needed

Recommended extraction:

- Move pure, no-DB identity review classification out of `worker.ts` into `lib/identity/reviewClassifier.ts`.
- Export a pure function such as:

```ts
export interface IdentityReviewClassification {
  matchStatus: 'none' | 'candidate' | 'probable' | 'definite';
  identityGrade: 'none' | 'candidate' | 'probable' | 'confirmed';
  identityScore: number | null;
  candidateClusterId: string | null;
  confirmedIdentityId: string | null;
  clusterId: string | null;
  reviewWorthy: boolean;
  reasonCodes: string[];
}
```

Then call that function from both:

- `lib/processing/worker.ts`
- `tests/identity/blindHarness.ts`

This avoids green tests for one code path while the export uses another.

### Step 3 - Split Baseline Identity From Review-Worthy Identity

Do not let normal exact-repeat identity edges become audit review rows.

Recommended approach:

1. Keep `linkIdentities()` capable of finding same-person relationships if other code needs them.
2. Add a second gate after clustering and before persistence: `isReviewWorthyIdentity(row, clusterRows, evidence)`.
3. The gate must require both:
   - at least one anchor or valid multi-signal identity link
   - at least one cross-surface or evasion cue

Suggested cross-surface cues:

```text
different normalized email across linked rows
different account/customer ID across linked rows
email alias/variant pattern
same phone reused across different email/account
same card/card fingerprint reused across different email/account
same device/browser/cookie reused across different email/account
same address/near-address reused across different email/account plus one other independent signal
billing/shipping cross-match across different email/account plus one other independent signal
```

Suggested suppressions:

```text
same exact normalized email and no cross-surface cue
same exact account ID and no cross-surface cue
same exact email plus name only
same exact account plus email plus name only
name-only
postcode-only
IP-only
BIN+last4-only
address-only
name plus postcode only
```

Where to implement:

- Prefer `lib/identity/reviewClassifier.ts` for new policy.
- Keep `lib/identity/matchScorer.ts` pure and identity-only.
- Use `lib/processing/worker.ts` only to orchestrate and persist the classifier result.

Important: `lib/processing/worker.ts` is marked as locked. The user has requested this accuracy fix, so changes are allowed, but keep them minimal and route policy into a pure helper.

### Step 4 - Fix Candidate Cluster ID Leakage

Current output shows rows with `match_status = none` but `candidate_cluster_id` populated. Fix this directly.

Files:

- `lib/processing/worker.ts`
- `lib/processing/restitchAuditIdentity.ts`
- tests under `tests/processing/*`

Rules:

- Never write `candidate_cluster_id`, `cluster_id`, or `confirmed_identity_id` for `none`.
- When expansion inherits a cluster result, recompute the row's own classification instead of copying a cluster member's IDs blindly.
- Add a final sanitization function before upsert/export:

```ts
export function sanitizePersistedIdentityResult(result: PersistedIdentityResult): PersistedIdentityResult {
  if (result.matchStatus === 'none' || result.identityMatchResult?.identity_match_grade === 'none') {
    return {
      ...result,
      grade: null,
      identityScore: null,
      clusterId: null,
      candidateClusterId: null,
      confirmedIdentityId: null,
      recommendedAction: null,
    };
  }
  return result;
}
```

Make the exact implementation type-safe rather than using this snippet blindly.

### Step 5 - Preserve Recall For The Missed General Scenario Families

Do not add ASOS-specific rules. Add generic fixtures for the missed scenario families.

Create or extend generated fixture scenarios in:

- `scripts/test-data/generateBlindMerchantCSVs.ts`
- `tests/fixtures/generated/*`

Add scenario families:

- low-value slow-burn repeat abuse
- OCR/fuzzy address variants
- return abuse ring with weak but repeated cross-surface evidence
- cross-border alias identity reuse
- student/shared-accommodation mimic, with negative controls
- refund farm using address and contact reuse
- sparse email-phone identity reuse

Each positive scenario must have a matching negative-control scenario that is similar but legitimate:

- same household surname/postcode, different people
- corporate office or campus address
- common IP/shared Wi-Fi
- same BIN plus last4 collision
- exact same account/email repeat buyer
- gift shipping/new address from same customer

The goal is not to make every weak scenario identity-confirmed. It is acceptable to surface context-risk or candidate-review rows, as long as the exported reason is accurate and review rate stays bounded.

### Step 6 - Strengthen CSV Generality

The fix must work across CSV shapes and merchant exports.

Files:

- `lib/csv/headerAliases.ts`
- `lib/csv/normalise.ts`
- `lib/csv/schema.ts`
- `lib/processing/streamParser.ts`
- `tests/csv/*`
- `tests/identity/headerMapping.blind.test.ts`

Requirements:

- Compose shipping address from address parts when full address is absent:
  - `shipping_address1`
  - `shipping_address2`
  - `shipping_city`
  - `shipping_postcode`
  - `shipping_country`
- Compose billing address similarly.
- Preserve strings for leading-zero-sensitive values:
  - phone
  - postcode
  - card BIN
  - card last4
  - order IDs
  - tracking numbers
- Support common merchant aliases without brand-specific code:
  - Shopify
  - WooCommerce
  - Stripe
  - Amazon
  - marketplace exports
  - custom mixed case headers
- Support delimiters already covered by tests:
  - comma
  - semicolon
  - tab
  - pipe
- Continue warning on duplicate and unmapped headers.

### Step 7 - Add Acceptance Tests

Add or update tests so a lesser model can know when it is done.

Required unit tests:

- `lib/identity/reviewClassifier.ts`
  - exact email repeat is not review-worthy
  - exact account repeat is not review-worthy
  - account plus email plus name is not review-worthy by itself
  - email plus name is not review-worthy by itself
  - name-only is not review-worthy
  - postcode-only is not review-worthy
  - IP-only is not review-worthy
  - BIN plus last4-only is not review-worthy
  - phone reused across different emails is review-worthy
  - card fingerprint reused across different emails is review-worthy
  - device reused across different accounts is review-worthy
  - address near-match across different emails plus phone/card is review-worthy
  - context flags do not alter identity grade

Required processing tests:

- `match_status = none` implies all cluster IDs are null.
- `identity_match_grade = none` implies all cluster IDs are null.
- context-only rows can have `context_flags` without identity cluster IDs.
- expansion does not copy a cluster member's candidate ID onto a row whose own evidence grades to `none`.
- output row count equals input valid row count.

Required harness tests:

- current generated blind fixtures still pass.
- new negative-control fixture has review rate at or below threshold.
- new repeat-customer fixture with many normal repeat buyers has near-zero identity review rows.
- external answer-key harness computes the same metrics from CSV exports as in-memory tests.

Suggested commands:

```bash
npm run test:csv-blind
npm test -- tests/identity --runInBand
npm test -- tests/processing --runInBand
npm test -- tests/csv --runInBand
npm run build
```

For the supplied files, the new harness should be run manually:

```bash
npm run eval:audit -- \
  --source "/Users/malikibrahim/Downloads/MERCHANT CVS 2.csv" \
  --answers "/Users/malikibrahim/Downloads/MERCHANT CVS ANSWERS.csv" \
  --audit "/Users/malikibrahim/Downloads/audit-1b25b773.csv" \
  --answers-exhaustive true \
  --out "test-results/external-audit-eval/merchant-cvs-2-baseline.json"
```

After implementation, rerun the source CSV through the app or an in-memory worker-equivalent path and evaluate the new audit export.

## Acceptance Criteria

Use these as the initial release gate. Adjust only with a written product decision.

For generated blind fixtures:

- All existing `expectMerchantReadiness()` checks pass.
- Negative control review rate stays within its fixture threshold.
- Large merchant-scale dataset still processes all rows and does not cap at 1,000.
- No row has `candidate_cluster_id` when `match_status = none`.

For answer-key evaluation where answers are exhaustive:

- Audit output row count equals valid source row count.
- Recall >= 0.98 on seeded expected positives.
- Precision >= 0.80.
- Review rate <= max(5%, 2.5x expected positive base rate).
- False positives from exact-repeat customers are near zero.
- False positives from `account; email; name`, `email; name`, and `name` are eliminated or explicitly classified as non-identity context-only rows.

For the supplied baseline specifically:

- Source rows: 105,000
- Required audit rows after rerun: 105,000, unless invalid rows are reported explicitly.
- Expected positive base rate: 1.57%
- Target review rate: <= 5%
- Target recall: >= 98%
- Target precision: >= 80%

## Do Not Do

- Do not hardcode ASOS, order ID ranges, scenario names, domains, countries, or postcodes.
- Do not solve precision by requiring only `confirmed` matches. That will hide useful candidate review rows and lose recall.
- Do not let refund/return behavior raise identity confidence.
- Do not suppress all address-based scenarios. Address reuse can be useful when paired with independent cross-surface evidence.
- Do not count normal repeat orders from the same exact account/email as identity risk.
- Do not rely on UI filtering alone. Persisted/exported fields must be correct.
- Do not accept green tests unless the exported CSV metrics are also green.

## Suggested Handoff Order

1. Build `scripts/eval/auditCsvAgainstAnswer.ts` and record the current failing metrics.
2. Add invariant tests for cluster ID leakage.
3. Extract `reviewClassifier` and make worker and blind harness use it.
4. Suppress normal repeat-customer relationships from identity review.
5. Recompute expansion rows using per-row classification.
6. Add generic missed-scenario fixtures and negative controls.
7. Fix row cardinality if audit output still drops 10 rows.
8. Run the full test set and the external CSV evaluation.
9. Write a short before/after report in `reports/merchant-readiness.md` or a new dated report.

## Final Deliverable Expected From The Implementer

The implementing model should return:

- Files changed.
- Before/after metrics from the external harness.
- False-positive and false-negative counts by scenario.
- Review rate before/after.
- Confirmation that row count equals valid input count.
- Exact commands run and their results.
- Any remaining false negatives with generic reason categories.
