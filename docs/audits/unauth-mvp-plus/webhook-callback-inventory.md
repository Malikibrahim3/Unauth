# Webhook, callback and event-intake inventory

Date: 2026-07-22
Scope: local remediation only; production and staging were not contacted or changed.

## Status vocabulary

- **PASS** — the stated local control is implemented and exercised by controlled tests/runtime evidence.
- **PARTIAL** — the route is usable only with the explicitly stated limitation; it must not be described as provider-verified or Live.
- **UNVERIFIED** — live provider/deployment evidence or configuration is unavailable and was not inferred.

The local-control status and live-provider status are deliberately separate. Mocked provider requests and a local PostgreSQL acceptance run do not constitute a real provider delivery.

## Active paths

| Path | Boundary before parse/mutation | Freshness, replay, ordering and retry | Local status | Live/provider status |
|---|---|---|---|---|
| `POST /api/shopify/webhooks` | Bounded exact raw body; Shopify HMAC header verified before JSON or database work | Delivery ID + payload-hash conflict; single-owner lease; merchant/store scope; order version ordering; stale events observed/ignored; partial failure returns 5xx and is reclaimable | PASS | UNVERIFIED |
| `POST /api/woocommerce/webhooks` | Bounded exact raw body; WooCommerce HMAC verified before JSON or database work | Official delivery ID (not subscription ID); payload conflict; store scope; order modified-time ordering; retryable partial failure | PASS | UNVERIFIED |
| `POST /api/bigcommerce/webhooks` | Bounded exact raw body; Standard Webhooks ID/timestamp/signature verified before JSON or database work | 300-second signature freshness; store scope; object lease/version ordering; retryable partial failure | PASS | UNVERIFIED |
| `POST /api/webhooks/stripe` | Bounded exact raw body; Stripe SDK signature construction before JSON or billing mutation | Stripe event ID; default signature tolerance; account/customer subscription scope; Stripe event-time ordering; completion only after billing effects | PASS | UNVERIFIED |
| `POST /api/integrations/shipbob/webhook` | Bounded exact raw body; Standard Webhooks/Svix ID/timestamp/signature before enqueue | 300-second freshness; ShipBob account scope; ingestion-inbox payload conflict/idempotency; 5xx on failure | PASS | UNVERIFIED |
| `POST /api/gorgias/support-webhook` | Active connection resolved from non-secret account identity; connection secret accepted from a custom header only and verified before rate-limit mutation/body parsing | Bounded body; hydrated ticket snapshot scoped by merchant+connection; provider timestamp orders ticket versions; exact replay returns stored result; stale versions ignored; failed work reclaimable | PARTIAL — shared-header authentication, not a provider-native signed request | UNVERIFIED |
| `POST /api/freshdesk/support-webhook` | Same fail-closed connection/header-secret boundary; URL-borne secrets are rejected | Same hydrated ticket claim/order/replay/retry controls; source-ticket events also have a database uniqueness key | PARTIAL — shared-header authentication, not a provider-native signed request | UNVERIFIED |
| `POST /api/zendesk/support-webhook` | Same fail-closed connection/header-secret boundary; URL-borne secrets are rejected | Same hydrated ticket claim/order/replay/retry controls | PARTIAL — Zendesk supports native timestamped signatures, but the current connection retains only a one-way manual-secret hash and has no controlled Zendesk signing-secret configuration | UNVERIFIED |
| `POST /api/fulfillment/pack-confirmation` | HMAC-signed, expiring link is checked before body/database access | Body capped at 6 MiB; photo capped at 5 MiB with JPEG/PNG/WebP magic/type agreement; single-owner claim; database uniqueness; deterministic photo path; canonical-evidence retry resumes from an existing confirmation | PASS | UNVERIFIED |
| `GET /api/shopify/callback` | OAuth state cookie and Shopify callback HMAC; malformed-length HMAC fails closed | Connection persistence is transactional/idempotent; callback has no unbounded body | PASS | UNVERIFIED |
| `GET /api/bigcommerce/callback` | Signed OAuth callback/state validation before credential persistence | Connection transaction, webhook registration and collector registration are observable; failures do not silently claim success | PASS | UNVERIFIED |
| `GET/POST /api/integrations/shipbob/callback` | Signed OAuth state before exchange; POST form body is streamed/capped at 16 KiB | One connection transaction; account selection is explicit; callback errors are categorized without token disclosure | PASS | UNVERIFIED |
| `GET /(auth)/callback` | Supabase PKCE authorization-code exchange; no request body | Code exchange is provider-owned one-time state; onboarding writes occur only after a returned authenticated user | PASS | UNVERIFIED |
| `POST /api/v1/ingest/events` | Merchant is derived from API key before a bounded 512 KiB body is read | Ingestion inbox atomically distinguishes accepted, duplicate and modified-payload conflict; status is observable | PASS | Not applicable |
| `POST /api/v1/ingest/{orders,customers,cases}` | Merchant is derived from API key; bounded body and validated idempotency key before domain mutation | Merchant+resource+key claim; modified payload is 409; concurrent owner is retryable; exact stored HTTP response is replayed; cases have a second database uniqueness boundary and resumable links | PASS | Not applicable |
| `POST /api/internal/support/ingest` | Internal secret is verified before rate-limit mutation; body capped at 512 KiB | Source ticket natural keys and source-ticket-event idempotency keys protect repeated intake | PASS | Not applicable |
| `GET /api/checkout-signals/config`; `POST /api/checkout-signals/ingest` | Active platform/store bootstrap returns a short-lived merchant-bound collector token; token is verified before rate-limit mutation | 32 KiB body cap; client event ID (legacy timestamped payload fallback); atomic `(merchant_id,idempotency_key)` uniqueness; duplicate insert is a successful replay | PARTIAL — deliberately low-trust browser telemetry; the public bootstrap does not prove storefront origin | Not applicable |

## Controlled evidence

- `npm run verify:webhook-event-safety` passes against local Supabase PostgreSQL 17.6. It covers modified-payload conflict, wrong-token fencing, failed-work retry, stored-response replay, same delivery ID in two source accounts, out-of-order object versions, stale-event observation, expired-lease recovery, true concurrent duplicate claims and true concurrent versions of one object.
- The focused provider/callback suite passes 23 suites / 243 tests before the final helpdesk and pack-confirmation additions. Dedicated follow-up runs pass the pack-confirmation callback suite (7 tests), helpdesk ordering helper (3 tests), and Gorgias/Freshdesk/Zendesk route suites (48 tests).
- `npm run verify:canonical-db` passes with eight active migrations, 223 archived migration hashes, generated-type parity, and normalized public-schema hash `268f248ddb10d292172af9adc559e96b8e5f227723ee775ba985f0ba765f236d`.
- `npm run typecheck` passes after regeneration from the local schema.

## Provider evidence used

- [Shopify webhook verification and delivery behavior](https://shopify.dev/docs/apps/build/webhooks/verify-deliveries)
- [WooCommerce webhook signature, delivery ID and retry behavior](https://developer.woocommerce.com/docs/apis/rest-api/v2/webhooks)
- [BigCommerce Standard Webhooks signing](https://docs.bigcommerce.com/developer/docs/integrations/webhooks/https)
- [ShipBob webhook signing](https://developer.shipbob.com/webhooks/)
- [Stripe webhook signature, duplicates and event ordering](https://docs.stripe.com/webhooks?lang=node)
- [Zendesk webhook signature verification](https://developer.zendesk.com/documentation/webhooks/verifying/)
- [Freshdesk automation custom headers](https://support.freshdesk.com/support/articles/132589-using-webhooks-in-the)
- [Gorgias webhook authentication headers](https://developers.gorgias.com/docs/sync-gorgias-data-with-a-database)

## External rollout blockers retained truthfully

1. No controlled provider account delivered a signed request, retry sequence or out-of-order sequence to this build. All provider rows therefore remain live-runtime **UNVERIFIED**.
2. Existing deployed helpdesk registrations may contain the retired `unauth_whsec` query parameter. The local routes now reject URL-borne secrets. Production rollout must coordinate header configuration plus secret rotation/re-registration in the single approval batch; applying code first could interrupt helpdesk intake.
3. Zendesk native HMAC verification needs the actual Zendesk signing secret and a controlled configuration/rotation path. The existing one-way manual connection-secret hash cannot be repurposed or reversed. Until supplied and proven, Zendesk remains **PARTIAL**, never Live.
4. Gorgias and Freshdesk are protected by evidenced custom-header secrets plus replay/order controls, but no provider-native signed timestamp was evidenced for these configured automation paths. They remain **PARTIAL**.
