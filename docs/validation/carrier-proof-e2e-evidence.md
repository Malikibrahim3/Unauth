# Carrier proof end-to-end evidence

Date: 2026-07-15 (Europe/London)

## Evidence path exercised

For each included carrier, the completion pass exercised:

1. Resolve the authenticated merchant and exact carrier connection.
2. Decrypt that connection's merchant-owned credentials.
3. Select provider endpoints from the stored environment.
4. Acquire a provider access token.
5. Request tracking for a provider-official sample.
6. Normalize the response into canonical carrier evidence.
7. Persist evidence with merchant, connection, carrier, and tracking provenance.
8. Repeat the product request and confirm stable counts/digest.

## Results

| Carrier | Environment result | Tracking result | Canonical types | Stable digest |
|---|---|---|---|---|
| UPS | Production OAuth 200; sandbox OAuth 200 | Official public sample returned 200 | delivery_photo, delivery_status, signature, tracking_events, tracking_number | 506c956676934f41 |
| FedEx | Sandbox OAuth 200; production 403 expected for sandbox project | Official mock returned 200 with one scan | delivery_photo, delivery_status, signature, tracking_events, tracking_number | bdaee05bb8f34a0e |

The product evidence route was executed twice for each carrier. Counts and digests remained stable, proving idempotent canonical persistence for the tested references.

## Truthful proof availability

- The UPS sample did not supply an actual signature or delivery photo.
- The FedEx mock did not supply a signature, photo, or downloadable proof-of-delivery document.
- FedEx tracking-document/SPOD requests returned not found, and advanced proof entitlements were absent.
- Canonical evidence records distinguish unavailable artifacts from present artifacts; no placeholder is described as real proof.

## Cross-provider correlation

The repository's provider-neutral fixtures validate Shopify to ShipBob to carrier reconciliation without tenant literals. The live carrier identifiers, however, are provider-official samples and do not correspond to the controlled Shopify and ShipBob orders.

Accordingly:

- LIVE verifies carrier credential isolation, environment selection, provider calls, normalization, persistence, and idempotency.
- FIXTURE verifies the generic cross-provider correlation rules and tenant isolation.
- No claim is made that one real merchant order traversed Shopify, ShipBob, UPS, and FedEx during this pass.

This is a documented evidence limitation, not a failed multi-tenant architecture boundary.
