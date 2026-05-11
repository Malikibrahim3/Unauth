# ParcelClaim

CSV-based refund fraud audit tool for ecommerce merchants.

## What it does

Ingests a merchant's historical order data via CSV, runs it through a deterministic fraud scoring engine, and produces a dashboard showing which transactions and customers exhibit refund abuse, INR (item not received) abuse, and friendly fraud patterns.

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

Run the SQL in `supabase/migrations/0001_initial.sql` against your Supabase project via the SQL editor or `supabase db push`.

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
| `inrSpeed` | 10 | INR claim within 48h of order |
| `emailPattern` | 8 | Disposable or aliased email patterns |
| `addressClustering` | 9 | Multiple emails shipping to the same address |
| `valueAnomaly` | 5 | Order value far outside the customer's norm |
| `paymentChurn` | 15 | Tight-window payment-method churn |
| `refundPattern` | 20 | Historical refund-pattern intelligence |
| `crossMerchant` | 24 | Cross-network refund or INR history (k-anon >=3) |
| `disputeHistory` | 40 | Prior disputes, refund requests, or return requests |
| `addressMismatch` | 4 | Billing and shipping address mismatch |
<!-- signals-table:end -->

Phase 0.1 calibration decision: `lib/engine/weights.ts` is the source of truth for blend weights. The scoring tests assert raw 0-100 signal outputs; this table documents the relative weights used when fired signals are combined.

## Risk tiers

- Scores below `FLAG_THRESHOLD` (default 45) are not flagged for the review queue.
- **Low** (0–24): Not flagged
- **Medium** (25–49): Review tier
- **High** (50–74): Flagged for review
- **Critical** (75–100): Flagged, recommended action

## Privacy & data flow

### Raw PII
- **Within a merchant's own scope**: `fraud_transactions` stores raw `customer_email`, `customer_name`, `shipping_address`, and `billing_address`. These are scoped by `job_id` → `processing_jobs.merchant_id` via RLS. Only the merchant who uploaded the CSV can read their own rows.
- **Cross-merchant graph**: Email, address, phone, and card identifiers are normalised then HMAC-SHA256 hashed (with `IDENTITY_SALT`) before entering `customer_profiles`, `fraud_entities`, and co-occurrence tables. Raw values never cross the merchant boundary.

### K-anonymity
- Cross-merchant signals and live lookup results only surface when a customer profile has been seen at **≥3 merchants**. Profiles with 1–2 merchants return nothing in lookup and do not trigger cross-merchant scoring.
- Every live lookup is counted in `lookup_daily_counts` (100/day/merchant cap) and logged.

### GDPR / right to deletion
1. A merchant requests deletion for a specific email address.
2. Compute `email_hash = HMAC(email, IDENTITY_SALT)`.
3. Find matching `customer_profiles` via `emails @> '["hash"]'`.
4. Delete or redact `fraud_transactions` rows where `customer_email` matches.
5. Delete the profile from `customer_profiles` (cascades to `customer_profile_audit_appearances`).
6. Log the deletion event in a manual audit trail (TODO: automate via support ticket).

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
