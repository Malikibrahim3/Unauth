# Unauth

Unauth is a post-purchase loss accountability platform for ecommerce merchants.

> Control payouts. Recover where possible. Prevent where not.

The MVP is a Shopify/Gorgias payout-control workflow: support payout cases, a compressed Gorgias decision card, evidence checklist, merchant rules, attribution/recoverability, manual recovery cases, recovery board, and operational dashboards.

**Product source of truth:** [`docs/product/MVP_STEERING.md`](docs/product/MVP_STEERING.md)

Merchant rules make recommendations. Unauth surfaces evidence, payout exposure, attribution, recoverability, and next actions — the merchant remains responsible for the final outcome.

## Current product surface

- Support payout case queue (claims) for active and historical post-purchase loss cases.
- Gorgias 4-line decision widget and Shopify connection paths for ticket, order, and fulfillment context.
- Merchant-owned rules with operational recommendations (approve, ask for evidence, manual review, deny under policy, open recovery).
- Evidence checklist and evidence records for payout and recovery review.
- Loss attribution, recoverability classification, and recovery cases with recovery board.
- Partner rulebook for carrier/3PL/supplier recoverability rules.
- Outcome recording and audit trail for support decisions.
- Dashboard metrics for payout exposure, recovery, prevention, and policy leakage.
- Legacy customer profiles and pattern context where already integrated (not the primary product story).

## What Unauth does not do today

- It does not automatically approve, deny, refund, or close claims.
- It does not expose order-blocking tools as a merchant product.
- It does not automate refunds or claim resolution.
- It does not license raw or identifiable customer data to banks or institutions.
- It does not share cross-merchant plaintext PII with merchants.
- It does not position machine learning or an AI classifier as the production decision engine.
- It does not use manual file uploads or free batch audits as the current merchant onboarding path.

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

```bash
NEXT_PUBLIC_SUPABASE_URL=<your supabase url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
SUPABASE_SERVICE_ROLE_KEY=<your service role key>
IDENTITY_SALT=<64+ random hex chars>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate a salt:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

For a full local, GitHub, and Vercel setup checklist, see [ENV_SETUP.md](/Users/malikibrahim/Downloads/Unauth/ENV_SETUP.md).

### 3. Apply database migrations

Run the SQL in `supabase/migrations/` against your Supabase project via the SQL editor or `supabase db push`.

### 4. Start the dev server

```bash
npm run dev
```

Visit `http://localhost:3000` and sign in with magic link.

### 5. Run tests

```bash
npm test
```

## Privacy and legacy context

Unauth keeps merchant-scoped raw records inside the merchant's own workspace. Legacy identity/pattern context may exist in the codebase but is not the primary MVP product story. See [`docs/product/TERMINOLOGY.md`](docs/product/TERMINOLOGY.md) for preferred language.

## Legacy and internal assets

This repository still contains legacy ingestion, synthetic evaluation, and historical audit code used by tests, internal analysis, or previously imported merchant data. Those paths should not be treated as the current merchant-facing product unless a route or component explicitly exposes them in the app.
