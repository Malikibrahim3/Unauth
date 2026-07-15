# Multi-tenant connector architecture validation — final report

Programme completed: 2026-07-15 (Europe/London)

Production domain: unauth-pi.vercel.app

Production code revision verified: 9b1256b8

Production deployment: dpl_7yrY2QcTyLPyAmYtHmmKXu8pg9Xn

## Executive summary

The connector architecture is tenant-explicit and connection-owned. OAuth state, encrypted credentials, provider account identity, source accounts, jobs, cursors, webhook routing, canonical records, reconciliation, health, capabilities, disconnect, and reconnect are all bound to a merchant-owned connection. Composite ownership constraints and RLS enforce the same boundary in storage.

The final production pass created a genuinely clean Merchant C through normal signup, completed ShipBob-first OAuth and explicit channel selection, imported 81 records with zero failures, isolated a live disconnect from Merchant A, and reconnected without duplicate data. Shopify also completed a stable live disconnect/reconnect. UPS production and FedEx sandbox carrier calls passed with idempotent canonical evidence. All eight obsolete merchant-scoped Vercel variables were removed from Production and Preview.

## Final verdict

**Multi-tenant merchant connector architecture verified with documented limitations**

The verified scope covers the reusable multi-tenant architecture and the included live connectors: Shopify, ShipBob, UPS, and FedEx. Gorgias was excluded by explicit user instruction. Carrier proof used official provider samples, so one real order correlated across every included provider and advanced signature/photo/POD artifacts are not claimed.

## Governing constraints

- No merchant, store, carrier, connection, or ShipBob channel identifier is a platform default.
- No merchant credential is stored in application deployment configuration.
- Platform OAuth application credentials may be shared; merchant credentials are encrypted per connection.
- Normal onboarding creates tenant-owned rows; manual database preparation is not accepted evidence.
- Repairs are generic and tested across multiple tenant contexts.
- Evidence labels distinguish CODE, FIXTURE, LIVE, and PRODUCTION.
- Credentials and test identities are omitted; documentation uses digests, counts, and states.
- Gorgias is left unchanged and excluded.
- Test credentials were not rotated, per user instruction.

## Evidence labels

| Label | Meaning |
|---|---|
| CODE | Repository implementation, migration, static analysis, or automated regression test |
| FIXTURE | Production-shaped multi-tenant storage, authorization, worker, webhook, or reconciliation evidence |
| LIVE | Controlled provider or production browser/database behavior |
| PRODUCTION | Applied cloud configuration, database migration, Git main, or Vercel deployment evidence |

## Required 28-point result

### 1. Architecture assessment

Verified with documented limitations. A canonical merchant connection owns credentials, provider environment/account identity, source accounts, jobs, webhooks, health, capabilities, and history. Canonical data retains merchant, connection, source, and provider provenance.

### 2. Connectors inspected

Shopify, ShipBob, UPS, FedEx, Gorgias, Zendesk, Freshdesk, BigCommerce, WooCommerce, document upload, CSV import, merchant API intake, self-fulfilment, Stripe, carrier claims, and historical AfterShip material were inspected across UI, routes, workers, migrations, RLS, normalization, reconciliation, tests, and deployment configuration. Gorgias live behavior was later excluded by instruction.

### 3. Hardcoded assumptions found

The programme found default-workspace callbacks, first-channel selection, provider-level credentials/jobs/disconnect, merchant-only reconciliation, production-capable webhook fallbacks, controlled-merchant support defaults, a deployment ShipBob PAT fallback, incomplete lifecycle ranking, raw error propagation, and merchant-scoped Vercel variables.

### 4. Unsafe assumptions removed

Callbacks use protected selected-workspace state; channel selection is explicit; credentials, jobs, reconciliation, webhooks, health, and lifecycle target an exact connection; provider-account ownership is claim-safe; controlled defaults and deployment merchant credentials were removed.

### 5. Platform-versus-merchant credential model

Only legitimate platform application secrets are shared deployment configuration. Merchant access/refresh tokens, API tokens, client credentials, webhook secrets, environment, and account metadata are encrypted and bound to a merchant-owned connection. All eight obsolete Vercel merchant variables were removed from Production and Preview.

### 6. OAuth merchant-binding result

OAuth transactions bind merchant, user, provider, environment, callback, optional account hint, expiry, and one-time consumption; only a state hash is stored. Replay, expiry, wrong-user, wrong-merchant, wrong-provider, and callback-binding tests pass. Shopify and ShipBob completed live reconnects; Merchant C completed clean ShipBob OAuth.

### 7. Environment-isolation result

ShipBob, UPS, and FedEx resolve environment from the selected connection. Merchant C ShipBob ran in sandbox. UPS production and sandbox OAuth returned 200. FedEx sandbox OAuth returned 200 while production correctly returned 403 for the sandbox project.

### 8. Source-account discovery result

Commerce ownership claims are cross-tenant safe. ShipBob discovers channels and requires an expiring, one-time explicit selection when several are returned. Merchant C selected and persisted a provider account distinct from Merchant A without a default or database edit.

### 9. Import-job isolation result

Job uniqueness, lookup, cursor, credential resolution, retry, claim, and errors are merchant/connection scoped. Multi-tenant failure-isolation tests pass. Merchant C completed one initial and four incremental jobs, each processing 81 records with zero failures.

### 10. Webhook-routing isolation result

Webhooks resolve exact active connections, validate provider authentication, scope idempotency to connection/account identity, and reject unknown or revoked sources. Live ShipBob disconnect exposed and repaired prefix-based cleanup; exact URL cleanup then removed only Merchant C while Merchant A remained enabled.

### 11. Canonical-data isolation result

Composite tenant-parent constraints prevent service writes from combining one merchant with another tenant's connection, source account, parent order, record, ingestion event, or domain event. Identical external IDs remain distinct across tenants and connections.

### 12. Matching-isolation result

Exact, probable, ambiguous, unmatched, and conflicting reconciliation remains merchant-scoped and requires connection/source provenance. Provider-neutral fixtures cover Shopify to ShipBob to carrier matching. Live carrier samples did not correspond to the controlled commerce orders, so a same-real-order claim is excluded.

### 13. RLS/server-authorization result

Credential tables are service-only. Merchant-readable connections, jobs, and canonical tables use membership-scoped RLS; mutations stay behind role-checked server routes. Legacy source/canonical tables now have RLS. Direct-ID operations include merchant and provider/connection predicates.

### 14. Clean-merchant onboarding result

Passed LIVE. Merchant C digest fbf757e160ea7e23 was created by ordinary production signup and server-owned workspace bootstrap. Profile setup, ShipBob-first connector choice, OAuth, channel selection, connection/source creation, credential storage, and initial sync completed with no database repair or tenant-specific deployment value.

### 15. Provider connection-count policy

The MVP permits one active connection per merchant/provider while retaining disconnected history. Another active account is rejected; reconnect reuses retained canonical identity. Manual/API sources may have multiple independent batches or keys.

### 16. Per-merchant capability result

Runtime capabilities derive from the exact active connection, granted scopes, environment, manifest, and health. Multi-tenant tests show merchants can have different grants. Revoked history cannot override an active connection.

### 17. Per-merchant health/readiness result

Shopify, ShipBob, UPS, and FedEx exact-connection paths passed included live checks. Errors are normalized and merchant-safe. Both final live ShipBob connections are connected, subscribed, and webhook healthy. Gorgias is excluded and receives no final health claim.

### 18. Disconnect/reconnect result

Shopify ended with exactly one active connection and stable store/order/customer digests. ShipBob live isolation moved two provider subscriptions to one without altering Merchant A, retained Merchant C records while revoked, then restored exactly one credential and subscription on reconnect with stable 81-record counts.

### 19. Secret/logging result

Audit metadata and errors use allowlisted categories. Changed-file secret scans expose no credential. Documentation records only digests/counts/status. Eight obsolete deployment variables were deleted without opening their values. No test credential was rotated, by instruction.

### 20. Future-connector extensibility result

Provider adapters separate authentication, discovery, persistence, imports, webhooks, normalization, reconciliation, capabilities, health, and lifecycle. New connectors can use canonical merchant/connection/source contracts without merchant-specific branches or global credentials.

### 21. Live versus fixture tests

LIVE: clean Merchant C signup and ShipBob-first connection; two-tenant ShipBob subscriptions, import, disconnect, reconnect, and webhook health; Shopify disconnect/reconnect; UPS OAuth/tracking; FedEx OAuth/tracking; production browser states. FIXTURE: repeated IDs, cross-tenant authorization, jobs, capabilities, webhooks, reconciliation, and generic Shopify/ShipBob/carrier mapping. PRODUCTION: migrations, environment cleanup, main delivery, and Ready deployment.

### 22. Defects fixed

MT-001 through MT-014 and MT-016 through MT-027 are verified. MT-015 is an accepted product-surface limitation. The completion pass discovered and fixed clean-signup bootstrap MT-024, Shopify-forcing gate MT-025, cross-tenant ShipBob webhook deletion MT-026, and stale disconnect metadata MT-027.

### 23. Tests run

The focused programme passed OAuth, ownership, credential, onboarding, connection, import/job, webhook, reconciliation, canonical ownership, RLS, capability, health, disconnect/reconnect, secret-redaction, carrier, and multi-provider regression suites. The exact delivery passed 279 Jest suites and 2,079 tests, with one suite and three tests intentionally skipped. TypeScript, ESLint, a 95-page Next.js production build, git diff validation, and changed-file secret scans also passed.

### 24. Migrations

Live-data preflights reported zero conflicts. Connector ownership, connection-scoped credentials/jobs, canonical relationships, RLS, OAuth transaction state, and pending account selection migrations were applied to the linked production database. The final added grants are migrations 20260714207000 and 20260714208000.

### 25. Deployment result

Changes through revision 9b1256b8 were pushed to main. Vercel deployment dpl_7yrY2QcTyLPyAmYtHmmKXu8pg9Xn reached Ready and serves unauth-pi.vercel.app. Production and Preview contain none of the eight obsolete merchant-scoped variables.

### 26. Manual steps required from a merchant

Create an account/profile, choose a connector, approve provider OAuth, choose the intended ShipBob channel if several are returned, and enter merchant-owned UPS/FedEx credentials/environment. Reauthorization after revocation is provider-required. No merchant needs a database edit or deployment variable.

### 27. Manual steps required from an administrator/founder

Maintain legitimate platform application credentials, migrations, encryption keys, provider applications, production deployment, and monitoring. Founder assistance remains necessary for the deliberately non-catalogue Zendesk/Freshdesk surfaces. Merchant credentials and account IDs must not be added to Vercel.

### 28. Remaining limitations

Gorgias is excluded by instruction. The carrier tests use official public/mock identifiers and do not prove one real order across Shopify, ShipBob, UPS, and FedEx. The samples did not provide actual signature, photo, or POD documents. FedEx is verified with a sandbox project, not production credentials. MT-015 remains accepted for founder-assisted/backend-only connector surfaces.

## Key live evidence

| Evidence | Result |
|---|---|
| Merchant A ShipBob | Merchant 5209d5c1da9db6a9; connection 13cc757e00af993d; account 720f4a8b33723beb; connected and webhook healthy |
| Merchant C ShipBob | Merchant fbf757e160ea7e23; connection 270aa6253372efc4; account f8951e7b0dc06221; 81 records; connected and webhook healthy |
| Merchant C data | Five orders, five fulfilments, five shipments, 66 locations, zero returns; five completed jobs; zero failures |
| Provider subscriptions | Exactly two enabled Unauth subscriptions, unique URLs, five required topics each |
| Shopify | One active connection; 13 orders and three customers with stable reconnect digests |
| UPS | Production/sandbox OAuth 200; tracking 200; evidence digest 506c956676934f41 |
| FedEx | Sandbox OAuth 200; production 403 expected; tracking 200; evidence digest bdaee05bb8f34a0e |

## Evidence files

- docs/validation/multi-tenant-connector-architecture.md
- docs/validation/multi-tenant-connector-matrix.md
- docs/validation/multi-tenant-connector-defect-register.md
- docs/validation/merchant-onboarding-friction-register.md
- docs/validation/multi-tenant-connector-validation-checklist.md
- docs/validation/multi-tenant-connector-completion-pass.md
- docs/validation/ups-fedex-implementation-evidence.md
- docs/validation/clean-merchant-c-onboarding-evidence.md
- docs/validation/disconnect-reconnect-evidence.md
- docs/validation/carrier-proof-e2e-evidence.md

## Verdict-change conditions

The verdict should be downgraded if production reintroduces merchant credentials/default identifiers, if cross-tenant ownership can be reproduced, if disconnect targets more than the selected connection, or if a provider-specific path bypasses canonical authorization. Gorgias and one-real-order carrier proof may expand the evidence scope later but are not prerequisites for the qualified architecture verdict.
