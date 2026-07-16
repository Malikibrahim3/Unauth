# Controlled Shopify + Gorgias verification

This suite verifies one concrete provider path against real Shopify, Gorgias,
Supabase, and application endpoints. It complements the source-agnostic unit
and contract suites; it is not the release gate for every supported provider.

## Safety boundary

The suite mutates remote state. It creates and deletes provider fixtures, writes
Supabase rows, rotates the selected merchant's Gorgias connection secret, and
may create a second test merchant. Run it only with dedicated test accounts and
an isolated non-production merchant.

Before running it, verify every URL, account, project, and merchant identifier
in `.env.local`. The suite intentionally has no production override.

## Commands

```bash
npm run test:provider-e2e:preflight
npm run test:provider-e2e
npm run test:provider-e2e -- --scenario 3
npm run test:provider-e2e -- --skip-preflight
npx tsc --noEmit -p scripts/e2e/tsconfig.check.json
```

Preflight validates required variables, provider connectivity, Supabase access,
and application endpoint reachability. A zero exit code means every selected
scenario passed; a non-zero exit code means the run is not a release signal.

## Required configuration

Copy the provider-E2E block from `.env.local.example`. The important contracts
are:

- `E2E_MERCHANT_ID` identifies an isolated test merchant.
- `E2E_MERCHANT_ID_B` identifies a second isolated merchant. Preflight can
  create one when omitted, which is a remote write.
- `E2E_WEBHOOK_URL` is the public application endpoint registered with Gorgias.
- `E2E_INGEST_URL`, when set, redirects the suite's direct webhook delivery to
  another non-production build. Leave it unset to exercise the registered app.
- `INTERNAL_HMAC_SECRET` and `IDENTITY_SALT` must match the application receiving
  the webhook, or identity and signature assertions are invalid.
- Shopify credentials need read access. Scenarios that create Shopify resources
  also require the corresponding customer, order, and fulfillment write scopes.

The shopper fixture email must be an external address. Gorgias account, agent,
channel, and support-inbox addresses are intentionally excluded from customer
identity resolution.

## What the suite covers

The eleven scenarios exercise connection registration, benign and claim ticket
ingestion, macro outcomes, chargeback language, cross-merchant identity,
first-day claim signals, widget output, invalid-secret rejection, idempotency,
and connection disable/re-enable behavior.

When Shopify write scopes are unavailable, the commerce portion uses a
Shopify-shaped webhook fixture while continuing through the real application and
database pipeline. Treat that as integration coverage, not proof of Shopify
resource creation.

All created resources are registered for cleanup. Scenario 1's connection is
kept for later scenarios; Scenario 11 restores a clean active connection.
Cleanup failures print the affected identifiers and must be resolved before the
test account is reused.

## Layout

```text
preflight.ts              environment and connectivity checks
runE2E.ts                 scenario runner and summary
helpers/                  provider, webhook, database, and logging helpers
scenarios/                scenario01 through scenario11
tsconfig.check.json       isolated static-check configuration
```

Do not turn a successful historical run into a permanent claim in this file.
Record environment-specific verification in the release record instead.
