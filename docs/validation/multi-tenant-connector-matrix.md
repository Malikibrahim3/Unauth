# Multi-tenant connector matrix

Updated: 2026-07-14 (Europe/London)

Status: checkpoint-5 classification. `FIXTURE` means production-shaped storage/worker/authorization isolation passed; `LIVE` means a controlled provider or Safari state was inspected without exposing credentials.

| Provider | Authentication | Merchant credentials | Self-service | Import | Webhooks | Reconciliation | Isolation verified | Limitation |
|---|---|---|---:|---:|---:|---:|---:|---|
| Shopify | Platform OAuth | Encrypted merchant token; platform client/secret shared | Yes | Yes | Yes | Partial | LIVE + FIXTURE | Merchant A read probe passed; OAuth is tenant-bound and replay-safe. Live disconnect/reconnect remains pending. |
| ShipBob | Platform OAuth with PKCE; legacy PAT alias | Encrypted token/PAT, webhook secret, environment and selected channel per connection | Yes | Yes | Yes | Yes | LIVE + FIXTURE | Merchant A read probe and completed imports passed. Several channels require explicit selection; live disconnect/reconnect remains pending. |
| UPS | Merchant client credentials | Encrypted client ID/secret, account number, token and environment per connection | Yes | On demand | No | Evidence only | LIVE UI + FIXTURE | Safari verified the unconnected state and reusable form. Live token/evidence call requires owner secret entry. |
| FedEx | Merchant client credentials | Encrypted client ID/secret, account number, token and environment per connection | Yes | On demand | No | Evidence only | LIVE UI + FIXTURE | Safari verified the reusable form. Provider login has timed out; live token/evidence call requires owner login and secret entry. |
| Gorgias | Merchant API token | Encrypted merchant token and webhook secret | Yes | Yes | Yes | Partial | LIVE + FIXTURE | Merchant A is truthfully degraded (`gorgias_400`); ownership, routing, redaction, and production fallback boundaries pass. |
| Zendesk | Merchant API credentials | Encrypted merchant credentials and webhook secret | Founder-assisted reusable | Yes | Yes | Partial | No | Secure backend exists but provider is absent from the main connector registry/catalogue flow. |
| Freshdesk | Merchant API token | Encrypted merchant token and webhook secret | Founder-assisted reusable | Yes | Yes | Partial | No | Secure backend exists but provider is absent from the main connector registry/catalogue flow. |
| BigCommerce | Platform OAuth | Encrypted merchant token; platform client/secret shared | No | Yes | Yes | Partial | FIXTURE | Backend ownership and callback isolation are repaired, but normal merchant onboarding remains deliberately unavailable. |
| WooCommerce | Merchant store/API credentials | Encrypted merchant credentials and webhook secret | No | Yes | Yes | Partial | FIXTURE | Backend ownership and webhook isolation are repaired, but normal merchant onboarding remains deliberately unavailable. |
| Document upload | Authenticated application session | No provider credential | Yes | Manual | No | Document linking | Pending | Manual-only by design; connector manifest currently labels verification as partial. |
| CSV import | Authenticated application session | No provider credential | Yes | Manual | No | Normalized import | Pending | Batch intake, not a live provider connection. |
| Merchant API intake | Merchant API key | Hashed merchant-owned API key | Yes | Push API | Push API | Canonical events | Pending | External callers must implement their own provider polling/webhook bridge. |
| Self-fulfilment pack | Authenticated application session | No provider credential | Legacy only | Manual | No | Manual | No | Live in the legacy registry but absent from the modern merchant catalogue. |
| Stripe | None | None | No | No | No | No | N/A | Request-only placeholder; Shopify Payments disputes are handled through Shopify data. |
| Carrier claims | None | None | No | No | No | No | N/A | Request-only placeholder. |
| AfterShip | None in production code | None | No | No | No | No | N/A | Removed production connector; remaining references are stale historical/fixture material. |

## Inventory classification

- Merchant self-service surfaces: Shopify, Gorgias, UPS, FedEx, ShipBob, document upload, CSV import, merchant API intake.
- Founder-assisted reusable backend surfaces: Zendesk and Freshdesk.
- Backend present but normal onboarding unavailable: BigCommerce and WooCommerce.
- Legacy/internal manual surface: self-fulfilment pack.
- Placeholders: Stripe and carrier claims.
- Removed/stale only: AfterShip.

## Active connection-count policy

| Provider family | MVP active-count policy | Connecting another account | Record distinction |
|---|---:|---|---|
| Shopify, BigCommerce, WooCommerce | One active store per merchant/provider | Reject while another active store exists; reconnect the retained connection after disconnect | Merchant + store connection + provider external ID |
| ShipBob | One active connection; one explicitly selected channel | Reject a second active connection; multiple discovered channels require selection before persistence | Merchant + connection + source account/channel + external ID |
| UPS and FedEx | One active carrier account per merchant/provider | Reject while active; reconnect preserves stored environment/account identity | Merchant + carrier connection + tracking reference |
| Gorgias, Zendesk, Freshdesk | One active helpdesk per merchant/provider | Reject while active; reconnect/credential rotation updates the same owned account | Merchant + helpdesk connection + ticket/message external ID |
| Document/CSV/API intake | Multiple independent batches/API keys as designed | Coexist; they are not singleton provider credentials | Merchant + source/batch/key + external ID |
