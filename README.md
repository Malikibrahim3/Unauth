# Unauth

Cross-merchant refund and friendly-fraud intelligence network for ecommerce merchants, with Visa Compelling Evidence 3.0 (CE3.0) dispute packages as a flagship output.

## What it does

Ingests merchant order data (CSV upload and integrations), runs a deterministic fraud scoring engine, and surfaces refund-abuse, INR (item not received), and friendly-fraud patterns. Merchants can generate CE3.0-oriented evidence packages for card-not-present disputes.

## Running locally

### Prerequisites

- Node.js 18+
- A Supabase project

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=<your supabase url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
SUPABASE_SERVICE_ROLE_KEY=<your service role key>
IDENTITY_SALT=<64+ random hex chars>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate a salt: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

For a full Local + GitHub + Vercel setup checklist, see [ENV_SETUP.md](/Users/malikibrahim/Downloads/Unauth/ENV_SETUP.md).

### 3. Apply database migrations

Run the SQL in `supabase/migrations/` against your Supabase project via the SQL editor or `supabase db push`.

### 4. Start the dev server

```bash
npm run dev
```

Visit `http://localhost:3000`. Sign in with magic link.

### 5. Run tests

```bash
npm test
```

## CSV format

See the upload page for required columns and a downloadable template.

Required: `order_id`, `order_date`, `customer_email`, `customer_name`, `shipping_address`, `order_total`, `currency`, `order_status`

Optional: `customer_phone`, `billing_address`, `refund_status`, `refund_reason`, `refund_date`, `refund_amount`, `payment_method`, `ip_address`, `device_id`

Include `ground_truth_label` (fraud/legitimate) to get precision/recall metrics on the audit page.

## Fraud signals

<!-- signals-table:start -->
| Signal | Weight | What it detects |
| --- | ---: | --- |
| `refundRate` | 20 | Customer refund rate vs population baseline |
| `inrAbuse` | 25 | Repeated INR claims |
| `velocity` | 18 | Burst ordering across 1h / 24h / 7d windows |
| `inrSpeed` | 10 | INR timing inconsistent with confirmed delivery |
| `postDeliveryClaimRate` | 22 | Rate of INR claims filed after confirmed delivery |
| `emailPattern` | 8 | Disposable or aliased email patterns |
| `addressClustering` | 9 | Multiple emails shipping to the same address |
| `billingAddressClustering` | 9 | Multiple emails linked through billing-address dispute history |
| `billingAddressClusteringActive` | 9 | Billing-address chargeback cluster with current dispute behavior |
| `valueAnomaly` | 5 | Order value far outside the customer's norm |
| `paymentChurn` | 15 | Tight-window payment-method churn |
| `refundPattern` | 20 | Historical refund-pattern intelligence |
| `crossMerchant` | 24 | Cross-network refund or INR history (k-anon >=3) |
| `disputeHistory` | 40 | Prior disputes, refund requests, or return requests |
| `addressMismatch` | 4 | Billing and shipping address mismatch |
| `networkDeviceLink` | 15 | Shared device or network identifier linked to a known fraud cluster |
| `networkDeviceLinkActive` | 25 | Shared device or network identifier plus active current-order dispute evidence |
<!-- signals-table:end -->

Phase 0.1 calibration decision: `lib/engine/weights.ts` is the source of truth for blend weights. The scoring tests assert raw 0-100 signal outputs; this table documents the relative weights used when fired signals are combined.

## Risk tiers

- Scores below `FLAG_THRESHOLD` (default **44**) are not flagged for the review queue.
- **Low** (0–24): Not flagged
- **Medium** (25–49): Review tier
- **High** (50–74): Flagged for review
- **Critical** (75–100): Flagged, recommended action

## Evaluation accuracy

Committed threshold tuning (`threshold-recommendations.json`, synthetic `test-data/realistic_fraud_dataset.csv`) reports approximately **P=1.0 / R=0.62 / F1=0.76** at threshold 44–45. Headline metrics quoted elsewhere (e.g. P=0.985) are **not reproducible from this repo** and reflect author-generated synthetic labels where fraud patterns mirror engine signal names (`scripts/generate-test-data.mjs`). Treat all published accuracy figures as **in-sample on synthetic data; not validated against real merchant fraud** until an independent labelled holdout exists.

## Privacy & data flow

### Raw PII
- **Within a merchant's own scope**: `audit_transactions` and upload pipelines store merchant-scoped order fields (email, name, address, etc.) protected by RLS via `processing_jobs.merchant_id`.
- **Cross-merchant graph**: `customer_profiles` stores **normalised plaintext** identifiers in JSONB arrays (`emails`, `phones`, `addresses`, etc.) for matching, gated by k-anonymity and RLS. The separate `fraud_entities` table stores **normalised** identifier values (same normalisation as the scoring worker) for historical entity statistics — not raw cross-merchant PII export.

### K-anonymity
- Cross-merchant signals and live lookup results only surface when a customer profile has been seen at **≥3 merchants** (`search_customer_profiles` SQL filter plus app-layer 404 for sub-threshold matches).
- Every live lookup is counted in `lookup_daily_counts` (daily cap per merchant) and logged.

### GDPR / right to deletion
1. A merchant requests deletion for a specific email address.
2. Normalise the email (`normaliseEmail`) and locate matching `customer_profiles`.
3. Delete or redact merchant-scoped transaction rows for that customer.
4. Delete the profile from `customer_profiles` (cascades to `customer_profile_audit_appearances` where configured).
5. Log the deletion event in a manual audit trail (TODO: automate via support ticket).

## Milestone status

- [x] Milestone 1: Skeleton (Next.js, auth, DB schema)
- [x] Milestone 2: CSV ingestion (upload, parse, validate, hash, persist)
- [x] Milestone 3: Scoring engine (9 signals + unit tests)
- [x] Milestone 4: Audit dashboard (summary, flagged table, transaction/customer detail)
- [x] Milestone 5: Cross-merchant identity layer (k-anon gated)
- [x] Milestone 6: Evaluation harness (precision/recall/F1)
- [x] Milestone 7: Synthetic test data CSVs

## Test data

Pre-built CSVs live in `test-data/` and are generated by `scripts/generate-test-data.mjs`:

| File | Rows | Description |
|---|---|---|
| `test-data/clean.csv` | 200 | Legitimate orders only — good for smoke-testing ingestion |
| `test-data/mixed.csv` | 400 | ~26% fraud (`ground_truth_label=fraud`) with labelled signals for eval harness |

Fraud patterns covered in `mixed.csv`: `inrAbuse`, `refundRate`, `velocity`, `inrSpeed`, `emailPattern` (disposable domains), `addressClustering`, `valueAnomaly`, `paymentChurn`.

Regenerate at any time:
```bash
node scripts/generate-test-data.mjs
```
