# Disconnect and reconnect evidence

Date: 2026-07-15 (Europe/London)

## Shopify

- The controlled merchant completed a live disconnect and reconnect.
- The final state contains exactly one active Shopify connection.
- Connection digest cdd7bece2620629d and store digest 72b4f4e81c60b29d remained stable.
- Thirteen orders remained stable with digest e03b7f8c0946ec74.
- Three customers remained stable with digest 360f101bdfd49e52.
- No duplicate active connection, store, order, or customer identity was introduced.

Result: LIVE verified.

## ShipBob two-tenant isolation

Initial provider state contained exactly two enabled Unauth subscriptions: one for Merchant A and one for Merchant C. Each used a unique exact connection URL and the same required five event topics.

During the first completion attempt, the live disconnect exposed MT-026: prefix-based webhook cleanup deleted both subscriptions. The repair changed cleanup to the exact connection URL, and Merchant A's subscription was restored through the provider API.

The repaired live disconnect then produced:

- Provider subscriptions: two to exactly one.
- Merchant A: remained connected, subscribed, and webhook healthy.
- Merchant C: revoked; no credential remained.
- Merchant C retained its source records and content digests.
- Merchant C subscription metadata was cleared after the MT-027 generic disconnect repair.

Merchant C then completed normal OAuth reconnect and sync:

- Connection digest: 270aa6253372efc4.
- Source-account digest: a4884e7e5f7e4412.
- Exactly one encrypted credential rebound to Merchant C's connection.
- Final provider subscriptions: exactly two enabled Unauth subscriptions with unique URLs and five topics each.
- Final source counts: 81 records, five orders, five fulfilments, five shipments, 66 locations, zero returns.
- Five completed jobs, zero failed records, no job error.

Merchant A final state:

- Merchant digest: 5209d5c1da9db6a9.
- Connection digest: 13cc757e00af993d.
- Provider-account digest: 720f4a8b33723beb.
- Connected, subscribed, and webhook healthy.

Merchant C final state:

- Merchant digest: fbf757e160ea7e23.
- Connection digest: 270aa6253372efc4.
- Provider-account digest: f8951e7b0dc06221.
- Connected, subscribed, and webhook healthy.

Result: LIVE verified. Disconnect is exact-connection scoped, retained data is preserved, the other tenant is unaffected, reconnect restores credentials/webhooks, and canonical/source identity remains idempotent.
