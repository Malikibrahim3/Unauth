# Multi-tenant connector matrix

Updated: 2026-07-15 (Europe/London)

LIVE means a controlled provider call or production browser/database state was verified. FIXTURE means production-shaped isolation evidence. CODE means implementation and automated tests. PRODUCTION means deployed configuration or migrations.

| Provider | Authentication and credential owner | Self-service | Data path | Isolation evidence | Current classification and limitation |
|---|---|---:|---|---|---|
| Shopify | Platform OAuth; merchant token encrypted per connection | Yes | Imports, webhooks, canonical orders/customers | CODE + FIXTURE + LIVE | Verified live disconnect/reconnect. One active store per merchant/provider. |
| ShipBob | Platform OAuth with PKCE; merchant token, environment, channel, and webhook secret per connection | Yes | Imports, webhooks, orders, fulfilments, shipments, locations | CODE + FIXTURE + LIVE | Verified for two live merchants and distinct provider accounts. Explicit channel choice is required when several exist. |
| UPS | Merchant client credentials encrypted per connection | Yes | On-demand tracking/evidence | CODE + LIVE | Production OAuth and official public sample tracking passed. Sample had no provider signature/photo; canonical unavailability is explicit. |
| FedEx | Merchant client credentials encrypted per connection | Yes | On-demand tracking/evidence | CODE + LIVE | Sandbox OAuth and official mock tracking passed. Production OAuth correctly rejected the sandbox project. Signature/photo/POD was unavailable. |
| Gorgias | Merchant API token encrypted per connection | Yes | Imports and webhooks | CODE + FIXTURE; LIVE excluded | User explicitly excluded Gorgias from the completion pass. No provider-health claim is made. |
| Zendesk | Merchant API credentials per connection | Founder-assisted | Imports and webhooks | CODE | Reusable secure backend is absent from the main catalogue flow. |
| Freshdesk | Merchant API token per connection | Founder-assisted | Imports and webhooks | CODE | Reusable secure backend is absent from the main catalogue flow. |
| BigCommerce | Platform OAuth; merchant token per connection | No | Imports and webhooks | CODE + FIXTURE | Ownership and callback isolation are repaired; normal onboarding is unavailable. |
| WooCommerce | Merchant store/API credentials per connection | No | Imports and webhooks | CODE + FIXTURE | Ownership and webhook isolation are repaired; normal onboarding is unavailable. |
| Document upload | Authenticated application session | Yes | Manual document linking | CODE | Manual source by design, not a live provider connection. |
| CSV import | Authenticated application session | Yes | Batch normalized import | CODE | Manual batch source by design. |
| Merchant API intake | Hashed merchant-owned API key | Yes | Push API and canonical events | CODE | External caller supplies its own provider bridge. |
| Self-fulfilment pack | Authenticated application session | Legacy | Manual | CODE | Legacy/internal surface, absent from the modern catalogue. |
| Stripe | None | No | None | N/A | Request-only placeholder. |
| Carrier claims | None | No | None | N/A | Request-only placeholder; direct carrier evidence routes are implemented separately. |
| AfterShip | None in production | No | None | CODE + PRODUCTION | Removed connector; any remaining references are historical or fixture-only. |

## Active connection-count policy

| Provider family | Active policy | Connecting another account | Record distinction |
|---|---:|---|---|
| Shopify, BigCommerce, WooCommerce | One active store per merchant/provider | Reject while active; reconnect retained identity after disconnect | Merchant + connection + provider external ID |
| ShipBob | One active connection and one explicitly selected channel | Reject a second active connection; require selection among discovered channels | Merchant + connection + source account/channel + external ID |
| UPS and FedEx | One active carrier account per merchant/provider | Reject while active; reconnect retains environment/account identity | Merchant + connection + tracking reference |
| Helpdesks | One active account per merchant/provider | Reject while active; reconnect or credential rotation retains owned identity | Merchant + connection + ticket/message external ID |
| Document, CSV, API intake | Multiple independent batches or keys | Coexist by design | Merchant + source/batch/key + external ID |

The included live completion scope is Shopify, ShipBob, UPS, and FedEx. Gorgias is excluded by explicit instruction. A single real order traversing all four included providers was not available; carrier calls used official provider samples and are not represented as merchant-order correlation proof.
