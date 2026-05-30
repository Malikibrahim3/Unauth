# Unauth E2E Integration Suite

End-to-end test of the full **Shopify → Gorgias connection → webhook
auto-registration → ticket ingest → Supabase → widget query** flow against
**real APIs** (no mocks). See **Verification status** below for exactly what has
been proven live versus what still requires production-grade credentials.

## Usage

```bash
npx tsx scripts/e2e/preflight.ts             # env + connectivity checks only
npx tsx scripts/e2e/runE2E.ts                # preflight + all 11 scenarios
npx tsx scripts/e2e/runE2E.ts --scenario 3   # one scenario (Scenario 1 runs first)
npx tsx scripts/e2e/runE2E.ts --skip-preflight   # repeat run, skip checks
```

Exit code `0` = all passed, `1` = any failure. Failing assertions print
`Expected / Received / Hint`.

## Environment

Add the E2E block from `.env.local.example` to `.env.local`. Preflight prints
every required var with present/missing status and stops on the first gap.

Two things that are easy to miss:

- **`INTERNAL_HMAC_SECRET` (and `IDENTITY_SALT`) must match the deployed app.**
  The per-connection webhook secret is hashed with this pepper and stored in
  Supabase; the deployed app re-hashes the incoming secret to verify it. If the
  secrets differ, every signed webhook returns `401`.
- **`E2E_WEBHOOK_URL` becomes `NEXT_PUBLIC_APP_URL`** for the suite process
  (`helpers/loadEnv.ts`), so calling the connection helpers directly registers
  the Gorgias webhook + sidebar against the deployed endpoint. `SUPABASE_URL` is
  bridged from `NEXT_PUBLIC_SUPABASE_URL` automatically.

## ⚠ Safety note — run against TEST/DEMO merchants only

**Scenario 1 (and Scenario 11) disable + recreate merchant A's Gorgias
connection and rotate its webhook secret.** The original webhook secret is
discarded and a new one is generated (shown once, not saved). The Gorgias sidebar
+ webhook integrations are deregistered and re-registered. Do **not** point
`E2E_MERCHANT_ID` at a live production merchant unless you are intentionally
testing production credentials and accept the secret rotation. Use a test/demo
merchant.

## Verification status (as of live run 2026-05-30)

### 1. Currently verified live — 11/11 scenarios passing
Proven end-to-end, no mocks:
- Real **Gorgias API** — account `unauth.gorgias.com`.
- Real **Gorgias tickets, macros, and integrations** (created, applied, registered, deleted).
- Real **signed HTTP webhook delivery** to a live `/api/gorgias/support-webhook` endpoint.
- Real **latest-code ingest route**, reached via `E2E_INGEST_URL=http://localhost:3000`
  (a local `next dev` running the current code).
- Real **Supabase** writes and reads (the shared project database).
- Real **classification, claim summaries, cross-merchant identity links, widget
  data, and cleanup** — all asserted against live rows.

### 2. NOT fully verified yet
- **Real Shopify customer/order/fulfillment creation.** The only working store
  token (`unauth-test.myshopify.com`) is **read-only** (`read_orders`,
  `read_all_orders`, `read_customers`). The suite synthesizes the order payload
  instead (the webhook body is what drives ingestion) and warns. Shopify *writes*
  are unproven.
- **Fully deployed Vercel ingest path.** The deployed build (`unauth-pi.vercel.app`)
  is stale relative to local code: it uses a **different `IDENTITY_SALT`** (so
  email-keyed rows are written under hashes the test can't reproduce) and it
  **predates `webhook_logs`** (writes none). Webhook *acceptance* on deployed is
  confirmed (signed POST → HTTP 200, `INTERNAL_HMAC_SECRET` matches, Scenario 1
  registers a real integration there), but the deployed *email-keyed* and
  *webhook_logs* assertions are not exercised — ingestion is delivered to the
  local latest-code server instead.

### 3. Required to reach full production fidelity
1. Add a Shopify token with **write scopes**: `write_customers`, `write_orders`,
   and the required fulfillment write scope (`write_fulfillments` /
   `write_merchant_managed_fulfillment_orders`).
2. **Deploy the latest code** to Vercel.
3. Ensure the deployed **`IDENTITY_SALT` matches** the intended environment (and
   `INTERNAL_HMAC_SECRET`, already confirmed matching).
4. **Remove `E2E_INGEST_URL`** (or point it at the deployed app) so webhooks are
   delivered to the deployed endpoint.
5. Re-run `npx tsx scripts/e2e/runE2E.ts --skip-preflight` fully against deployed.

## How ingestion is driven

Scenarios create real Gorgias resources (and real Shopify resources **when the
token has write scopes** — otherwise the order payload is synthesized; see
Verification status), then **POST a Gorgias-shaped, signed webhook payload to the
live `/api/gorgias/support-webhook` endpoint** (`helpers/webhook.ts`) rather than
waiting for Gorgias's own asynchronous delivery. This is necessary and faithful:

- The ingestion pipeline derives **all** order / identity / delivery signals from
  the webhook *body* (`lib/support/intake/commerceSignals.ts`). Gorgias's native
  webhook serialises only its ticket (subject, messages, customer, tags) — never
  the Shopify order block, shipping address, delivery date, or `orders_count`.
  So Scenarios 3/6/7 can only be exercised by sending the payload Gorgias *would*
  send if its Shopify integration were attached.
- Auth is a plaintext secret header (`x-unauth-gorgias-secret`) plus an
  account/domain routing header — not a body HMAC. The suite signs with the
  per-connection secret captured in Scenario 1.

Everything downstream of the POST (auth, connection resolution, classification,
persistence, the widget) is the real, unmocked production code path.

## Layout

```
preflight.ts              # 1a env · 1b connectivity · 1c primary conn · 1d merchant B · 1e warnings
runE2E.ts                 # runner (preflight + sequential scenarios + summary)
helpers/
  loadEnv.ts              # dotenv bootstrap + var bridging (import FIRST)
  envVars.ts              # required-var list, accessors, email masking
  log.ts                  # formatting + AssertionError (expected/received/hint)
  shopify.ts              # createCustomer/createOrder/fulfillOrder/deleteCustomer
  gorgias.ts              # createTicket/addMessage/applyMacro/deleteTicket/list+deleteIntegration
  supabase.ts             # service client, read helpers, waitFor, CleanupRegistry, profile seed
  webhook.ts              # build Gorgias payload + fire signed webhook
  state.ts                # cross-scenario connection secrets
scenarios/                # scenario01..11 + common.ts + index.ts
```

## Cleanup

Every scenario registers its resources in a `CleanupRegistry` at the start and
runs cleanup in a `finally`. Shopify customers, Gorgias tickets, and all
claim-intelligence rows (keyed by email hash, across both merchants) are removed.
Scenario 1's Gorgias integration is **preserved** (later scenarios depend on it);
Scenario 11 removes it and then recreates a clean connection so the account is
left working. Cleanup failures are logged with IDs for manual removal.

## Known spec ↔ implementation divergences

These were resolved against the **real code behavior** and are called out in the
relevant scenario files:

| Area | Spec said | Reality / what the suite asserts |
|---|---|---|
| Invalid signature (Scn 9) | HTTP `400` | Code returns **`401`** for an auth/secret failure (`400` is for malformed payloads). Asserts `401` + a logged rejection. |
| Macro outcome (Scn 5) | `claim_outcome` column | Column is **`outcome`** (no `claim_outcome` exists). Asserts `outcome = 'approved'`. |
| Widget (Scn 8) | works from intake alone | Widget needs the customer in the core `customer_profiles` graph, which Gorgias intake never creates. The suite **seeds a minimal, clearly-marked core profile** (registered for cleanup) and asserts the real `buildGorgiasClaimWidgetData` output; `thisStore` still comes from the real ingested claim summary. |
| `buildGorgiasClaimWidgetData` | `(email, merchantId)` | Real signature `(service, auth, params)` — adapted. |
| Cross-merchant (Scn 6) | "same Gorgias account, different merchant" | The connection resolver assumes one account per merchant (two would be ambiguous → 409). Merchant B uses a synthetic account id (`e2e-merchant-b`, no real host) for unambiguous routing; the link is still exercised against the real DB pipeline. |
| Day-1 claimer (Scn 7) | exact body text | That text alone doesn't trip the is-claim detector, so a `refund-requested` tag (how a real day-1 INR ticket is tagged) is attached to make it a claim. |

## Typechecking

```bash
npx tsc --noEmit -p scripts/e2e/tsconfig.check.json
```
