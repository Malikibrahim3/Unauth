# UPS and FedEx implementation evidence

Date: 2026-07-15 (Europe/London)

No client ID, client secret, access token, account number, or raw provider response is recorded here.

## UPS

| Check | Result | Label |
|---|---|---|
| Credential storage | Exactly one encrypted merchant-scoped credential is bound to the UPS connection and stored environment. | LIVE |
| OAuth environment | Production returned 200; sandbox returned 200. | LIVE |
| Tracking input | UPS official public sample 1Z023E2X0214323462. | LIVE |
| Provider tracking | Returned 200. | LIVE |
| Product route | Executed twice against the same connection/reference without duplicate canonical evidence. | LIVE |
| Canonical evidence | Five types: delivery_photo, delivery_status, signature, tracking_events, tracking_number. | LIVE |
| Stable evidence digest | 506c956676934f41. | LIVE |

The provider sample did not contain a signature or delivery photo. Their canonical evidence entries represent truthful unavailability, not a fabricated artifact.

## FedEx

| Check | Result | Label |
|---|---|---|
| Credential storage | Exactly one encrypted merchant-scoped credential is bound to the FedEx connection and sandbox environment. | LIVE |
| OAuth environment | Sandbox returned 200; production returned 403, the expected result for a sandbox project. | LIVE |
| Tracking input | FedEx official mock tracking number 449044304137821. | LIVE |
| Provider tracking | Returned 200 with one scan. | LIVE |
| Product route | Executed twice against the same connection/reference without duplicate canonical evidence. | LIVE |
| Canonical evidence | Five types: delivery_photo, delivery_status, signature, tracking_events, tracking_number. | LIVE |
| Stable evidence digest | bdaee05bb8f34a0e. | LIVE |

FedEx tracking-document/SPOD requests returned not-found responses and the test project exposed no advanced proof entitlement. Signature, photo, and proof-of-delivery document availability is therefore recorded as unavailable.

## Architecture conclusions

- Carrier credentials are merchant-owned, encrypted, and connection-scoped.
- Environment selection is stored on and resolved from the connection, not from a global deployment default.
- Health and evidence requests resolve the exact merchant-owned connection.
- Repeated evidence collection is idempotent and preserves canonical evidence types.
- Provider errors are normalized; no raw credential or token is persisted in evidence.

## Limitation

These are official provider samples, not a real merchant shipment shared with Shopify and ShipBob. They verify carrier authentication, environment isolation, tracking normalization, canonical evidence persistence, and idempotency. They do not prove same-order cross-provider correlation or the availability of advanced proof artifacts for an entitled real shipment.
