# Unauth

Unauth is claim decision infrastructure for ecommerce merchants. It links helpdesk claims with order, delivery, customer, prior-claim, evidence, and merchant-rule context so support teams can make explainable decisions. Unauth can recommend approve, manual review, or deny based on available context and configured rules, but the merchant remains responsible for the final outcome.

## Current product surface

- Claim review queue for active and historical customer claims.
- Gorgias and Shopify connection paths for ticket, order, and fulfillment context.
- Merchant-owned claim rules with approve, manual review, and deny recommendation actions.
- Evidence records and evidence package support for claim and dispute review.
- Customer profiles with same-store identity context and pseudonymous cross-merchant network context.
- Outcome recording and audit trail records for decision history.
- Analytics for connected claim operations and legacy imported context where it already exists.

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

## Privacy and network context

Unauth keeps merchant-scoped raw records inside the merchant's own workspace. Cross-merchant context is based on pseudonymous identity signals and aggregate history, not shared plaintext customer identities. Network context is useful only when enough participating merchants and records exist to produce a meaningful signal.

## Legacy and internal assets

This repository still contains legacy ingestion, synthetic evaluation, and historical audit code used by tests, internal analysis, or previously imported merchant data. Those paths should not be treated as the current merchant-facing product unless a route or component explicitly exposes them in the app.
