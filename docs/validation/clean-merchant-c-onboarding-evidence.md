# Clean Merchant C onboarding evidence

Date: 2026-07-15 (Europe/London)

The test identity and credentials are intentionally omitted. Only non-reversible digests, counts, and lifecycle state are recorded.

## Clean-start criteria

- Account created through the normal production signup UI.
- Workspace created through the production account-setup service.
- No merchant, membership, connection, source-account, credential, or import row inserted manually.
- Profile completed through the normal onboarding UI.
- ShipBob selected as the first connector; Shopify was not required.
- Provider OAuth consent and explicit channel selection completed through normal product/provider screens.

## Final state

| Property | Evidence |
|---|---|
| Merchant digest | fbf757e160ea7e23 |
| Setup state | Complete |
| First selected platform | Shopify profile classification with ShipBob chosen as the first connector |
| Volume band | under_10k |
| ShipBob connection digest | 270aa6253372efc4 |
| Provider-account digest | f8951e7b0dc06221 |
| Source-account digest | a4884e7e5f7e4412 |
| Provider account | Distinct from Merchant A and non-synthetic |
| Environment | Sandbox |
| Connection state | Connected |
| Webhook state | Subscribed and healthy |
| Credential rows | Exactly one encrypted row, correctly bound to merchant/connection/provider, key version 1 |
| Last successful sync | 2026-07-15T00:32:47.126+00:00 |

## Imported data

| Type | Count | Digest |
|---|---:|---|
| All source records | 81 | 6b08f9637b500a0c |
| Orders | 5 | 23821444503e5327 |
| Fulfilments | 5 | 16aad1df8ec1ee5b |
| Shipments | 5 | 16aad1df8ec1ee5b |
| Locations | 66 | 86d885d60e589905 |
| Returns | 0 | e3b0c44298fc1c14 |

Five jobs completed: one initial and four incremental. Every job processed 81 records, failed zero records, and recorded no error.

## Defects proven and repaired by the clean path

1. MT-024: the browser could not create a workspace through a legacy direct insert. The server now owns workspace/membership bootstrap.
2. MT-025: the connector gate forced Shopify after profile completion. The gate now permits the selected supported connector.
3. The ShipBob callback completed after explicit channel selection and persisted the selected account on both the connection and source account.

## Conclusion

The clean-new-merchant requirement passed in production without code edits, deployment variables, credential copying, database preparation, or tenant-specific defaults.
