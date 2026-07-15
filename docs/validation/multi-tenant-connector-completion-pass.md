# Multi-tenant connector completion pass

Date: 2026-07-15 (Europe/London)

## Outcome

**Multi-tenant merchant connector architecture verified with documented limitations**

The completion pass closed every outstanding critical/high tenant-isolation item in the included scope. It used normal production signup and provider flows, did not insert or repair merchant connection rows manually, did not expose credentials, and did not place merchant credentials in deployment configuration.

## Scope decisions

- Included live providers: Shopify, ShipBob, UPS, and FedEx.
- Gorgias: excluded by explicit user instruction; no provider-health or lifecycle claim is made.
- Zendesk, Freshdesk, BigCommerce, and WooCommerce: classified according to their existing founder-assisted or unavailable product surfaces; they were not promoted to merchant-ready.
- Test-account credential rotation: not performed by explicit user instruction.

## Completed evidence

| Area | Completion evidence | Label |
|---|---|---|
| Deployment coupling | Removed all eight obsolete merchant-scoped variables from Vercel Production and Preview; production remained healthy. | PRODUCTION |
| Clean tenant | Created Merchant C through normal signup/profile setup; merchant digest fbf757e160ea7e23. No manual database row was used. | LIVE |
| Connector choice | Merchant C completed ShipBob-first onboarding after the Shopify-forcing gate was repaired. | LIVE |
| ShipBob ownership | Merchant A and C are simultaneously connected to distinct provider accounts, with distinct connection, source-account, and encrypted-credential bindings. | LIVE |
| ShipBob import | Merchant C imported 81 records: five orders, five fulfilments, five shipments, and 66 locations, with zero failures. | LIVE |
| Webhook isolation | A live Merchant C disconnect moved provider subscriptions from two to one while Merchant A remained enabled and healthy. | LIVE |
| Reconnect | Merchant C reconnected and resynced to the same stable canonical counts without duplicate source records. | LIVE |
| Shopify lifecycle | Live disconnect/reconnect left exactly one active connection with stable account and data digests. | LIVE |
| UPS | Production and sandbox OAuth calls passed; official public sample tracking passed; five canonical evidence types were stored idempotently. | LIVE |
| FedEx | Sandbox OAuth and official mock tracking passed; production OAuth correctly rejected sandbox credentials; five canonical evidence types were stored idempotently. | LIVE |
| Data isolation | Composite ownership, RLS, job, webhook, reconciliation, direct-ID, and identical-external-ID tests passed across tenant contexts. | CODE + FIXTURE + PRODUCTION |
| Deployment | Fixes through revision 9b1256b8 were pushed to main and the production deployment reached Ready. | PRODUCTION |

## Live ShipBob final state

| Tenant | Merchant digest | Connection digest | Provider-account digest | State |
|---|---|---|---|---|
| Merchant A | 5209d5c1da9db6a9 | 13cc757e00af993d | 720f4a8b33723beb | Connected; subscribed; webhook healthy |
| Merchant C | fbf757e160ea7e23 | 270aa6253372efc4 | f8951e7b0dc06221 | Connected; subscribed; webhook healthy |

The provider reported exactly two enabled Unauth subscriptions, each with the exact five required topics and a unique connection URL. Each tenant has exactly one encrypted credential bound to its own merchant, connection, provider, and key version.

## Defects discovered during completion

- MT-024: clean signup could not bootstrap a workspace through the browser. Fixed with a server-owned membership bootstrap and verified by clean production signup.
- MT-025: a completed profile was still forced through Shopify. Fixed with a profile-based onboarding gate and verified by ShipBob-first onboarding.
- MT-026: ShipBob webhook cleanup used a URL prefix and deleted both tenants' subscriptions. Fixed with exact connection URL matching and verified by a live two-to-one disconnect.
- MT-027: revoked connections retained healthy webhook metadata. Fixed by clearing subscription and webhook-health state on disconnect and covered by regression tests.

## Documented limitations

1. Gorgias was excluded from the pass and is not part of the live completion claim.
2. UPS and FedEx evidence used provider-official sample tracking identifiers. No single real merchant order was available across Shopify, ShipBob, UPS, and FedEx, so same-order cross-provider correlation is not claimed.
3. The samples did not provide an actual signature, delivery photo, or proof-of-delivery document. The canonical evidence model recorded those types as unavailable rather than inventing proof.
4. FedEx production OAuth returned the expected rejection for a sandbox project; the verified FedEx environment is sandbox.
5. MT-015 remains an accepted product-surface limitation for founder-assisted/backend-only connectors.

These limitations constrain provider/content coverage, not the verified tenant ownership, credential, job, webhook, canonical-data, authorization, and lifecycle boundaries.
