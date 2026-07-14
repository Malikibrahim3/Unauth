# Multi-tenant connector architecture validation

Updated: 2026-07-14 (Europe/London)

Status: implementation and local quality gates complete; safe migrations, production delivery, clean Merchant C, and owner-only carrier steps remain.

## Governing boundary

Every provider connection is owned by one merchant and one deliberately selected provider/source account. Controlled Shopify, ShipBob, UPS, and FedEx accounts are Merchant A test inputs only. They are not deployment defaults and are not required by application code, migrations, normal onboarding, or production environment variables.

Platform OAuth application credentials may be shared deployment configuration. Provider access/refresh tokens, private-app tokens, carrier client credentials, webhook secrets, provider account identities, environments, scopes, cursors, jobs, source records, health, and audit history are merchant- and connection-owned data.

The reusable lifecycle is:

`authenticated merchant member -> exact merchant authorization -> protected OAuth/API credential exchange -> provider-account ownership claim -> source-account discovery/selection -> encrypted connection credential -> scoped import job -> scoped webhook/sync -> canonical records -> disconnect/reconnect`

## Connector inventory

- The merchant catalogue contains Shopify, Gorgias, UPS, FedEx, ShipBob, and document upload.
- CSV and merchant API intake are merchant-scoped non-provider ingestion paths.
- Zendesk and Freshdesk have reusable secure-form backends but are founder-assisted because they are not in the primary catalogue.
- BigCommerce and WooCommerce have isolated backend implementations but no reachable normal merchant onboarding path.
- The legacy registry also mentions self-fulfilment upload, Stripe, and carrier claims. Stripe and carrier claims are request-only placeholders.
- AfterShip is not a production connector. Remaining historical documentation/fixture references do not constitute support.

The connector matrix records authentication, credential ownership, onboarding, processing, and evidence status for every represented connector.

## Ownership and credential model

Canonical provider connections store merchant, provider, provider account, environment, status, scopes, timestamps, import/webhook health, and the selected source account. Encrypted credentials require the owning connection and merchant; provider-wide merchant credential lookup is prohibited.

Global provider-account ownership constraints prevent the same Shopify store, helpdesk account, or canonical provider account from being claimed by another merchant. The MVP policy is one active connection per merchant/provider while retaining disconnected history. Historical records remain bound to their original connection and merchant.

Vercel may retain only platform configuration such as Shopify/ShipBob OAuth application credentials. Legacy merchant Gorgias/ShipBob/intake and AfterShip variables discovered in Production and Preview are tracked as MT-022 and must be removed after the replacement production revision is verified.

## OAuth and source-account discovery

Shopify, BigCommerce, and ShipBob use a service-only OAuth transaction ledger containing only a hash of the browser state. The transaction binds the intended merchant, initiating user, provider, environment, callback URL, optional account hint, expiry, and one-time consumption. The callback rechecks the exact merchant role and cannot fall back to the current browser workspace or first user membership.

Shopify derives the store identity from the provider callback. ShipBob discovers all channels; one channel completes automatically and several channels create a short-lived encrypted selection handoff that requires the merchant to choose. Gorgias derives the account identity from the credentialed account. UPS and FedEx validate merchant-supplied client credentials and persist account/environment metadata per connection.

## Processing, webhooks, and canonical isolation

Initial and incremental jobs are unique and claimed per merchant/connection. Credential resolution, cursor state, retry state, manual sync, worker writes, and failure handling retain that boundary. One failed job does not stop the due-job loop for other merchants.

Webhook handlers resolve an exact active connection, validate provider/per-connection authentication, and scope idempotency to the provider connection. ShipBob uses connection-owned secrets and account scope, rejects stale signatures, ignores unknown topics, and schedules current-state reconciliation rather than trusting event order. Shopify, BigCommerce, and WooCommerce reject unknown/revoked stores and include the store connection in record and event identity. Gorgias rejects a missing secret before account discovery and cannot use a production deployment-secret fallback.

Canonical connector parents and children carry merchant ownership. Composite foreign keys protect source accounts, records, jobs, ingestion/domain events, orders, fulfilments, locations, shipments, and returns even when a service-role worker bypasses RLS. Natural keys include the required merchant, provider, connection, or source-account boundary. Matching refuses merchant-only parent lookup where a connection/source boundary is required.

## Authorization, capabilities, health, and lifecycle

Credential-bearing tables are service-only. Merchant users receive redacted connection views; canonical connections and jobs are merchant-readable, while all mutation is performed by permission-checked server routes. Legacy source entities and exception decisions use merchant-member read/service-write RLS. Direct cross-merchant ID manipulation is rejected by both route predicates and database ownership constraints.

Capabilities are calculated from the selected active connection, actual scopes, health, and merchant configuration. A historical revoked row cannot override the active connection. Unsupported or missing-scope write actions remain disabled. Shopify, Gorgias, ShipBob, UPS, and FedEx have exact-connection live probes that persist stable categories only.

Disconnect targets one merchant/provider connection, stops its work, removes its credential, performs provider subscription cleanup where supported, and retains source history. Reconnect reuses the canonical connection/source-account identity and record keys, preventing duplicate active connections and canonical rows.

## Extensibility boundary

Downstream processing consumes canonical source records, domain events, and capability contracts. Provider adapters own authentication, discovery, import/sync, webhook validation, normalization, health, deep-link, and disconnect behavior. A future connector in an existing category can implement that boundary without adding a merchant-specific deployment variable or bypassing the canonical pipeline.

## Validation evidence

- `CODE` 2,065 tests passed across 277 suites; three tests are intentionally skipped. TypeScript, ESLint, `git diff --check`, and the Next.js production build (95/95 static pages) passed.
- `CODE` A linked Supabase dry-run lists the nine required migrations in order. The reusable live-data preflight found zero ownership conflicts, ambiguous credential backfills, active-job duplicates, future unique-key conflicts, or composite tenant-parent mismatches.
- `FIXTURE` Merchant B proves identical provider/external IDs, different scopes, concurrent jobs, webhook idempotency, reconciliation, failures, and reconnect state remain isolated.
- `LIVE` Merchant A's Shopify and ShipBob connections pass exact-connection read probes. Two consecutive post-repair ShipBob syncs completed with stable counts: 81 source records, 5 orders, 5 fulfilments, 66 locations, 5 shipments, and no returns, without revealing credentials.
- `LIVE` Gorgias is truthfully degraded with a stable `gorgias_400` category. UPS and FedEx render clean unconnected states and reusable merchant credential forms in Safari.
- `BLOCKED` Clean Merchant C completion, live carrier credential entry, provider disconnect/reconnect, and production verification remain required before a final verdict.

The persistent checkpoint checklist and defect register remain the authoritative execution record. No live result from Merchant A substitutes for Merchant B/C isolation evidence.
