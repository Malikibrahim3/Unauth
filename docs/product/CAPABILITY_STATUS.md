# Capability status

Status: current MR0 implementation projection, 23 August 2026. This document records evidence strength; it does not claim a current merchant connection.

The 23 September 2026 `PRODUCT.md` vision targets a paid-ready authenticated MVP with controlled customer actions, one live recovery submission route and verified financial outcomes. The table below remains the observed supervised baseline. The target has not changed the current provider or action availability, and the landing page is outside the current implementation request. `MERCHANT_CLARITY_IMPLEMENTATION.md#authenticated-mvp-direction--23-september-2026` tracks the MVP-01–08 deltas and test gates.

## Selected provider stack

| Provider | Code maturity | Derived product stage | Selected role | Current proof boundary |
|---|---|---|---|---|
| Shopify | complete | Beta | Commerce and Shopify Payments authority | Automated lifecycle coverage exists; complete controlled-runtime matrix is absent |
| Gorgias | complete | Beta | Helpdesk | Automated lifecycle coverage exists; complete controlled-runtime matrix is absent |
| ShipBob | partial | Beta | Fulfilment | A bounded connector exists; complete controlled-runtime matrix is absent |
| UPS | partial | Partial | Carrier | Read-only, on-demand paths only; no claim submission |
| Stripe | slot only | Planned | Unauth billing processor only | No merchant evidence connector is available |

The product stage above is derived by `deriveProviderDisplayStage`. The signed-in merchant state is derived separately by `loadProviderConnectionReadModel`, then composed by `projectProviderCapabilityStatus` into configuration, import, object-family freshness, and action axes.

## Object-family position

| Object family | Selected source | MR0 position |
|---|---|---|
| Orders and refunds | Shopify | Implemented read paths; currentness remains merchant-specific |
| Payments and disputes | Shopify Payments via Shopify | Partial; controlled field and settlement coverage is not proven |
| Tickets and messages | Gorgias | Implemented read paths; currentness remains merchant-specific |
| Fulfilments and warehouse exceptions | ShipBob | Partial connector; controlled proof pending |
| Tracking and delivery proof | UPS | On-demand and partial; unsupported proof types remain unavailable |
| Provider responses | None | Unavailable unless a factual response is manually recorded |
| Credits and fees | Shopify/ShipBob as applicable | Partial and source-specific; no inferred value |
| Settlements | Shopify Payments | Unavailable until a controlled settlement read model is proven |

## Action boundary

| Capability | State |
|---|---|
| Read selected source facts | Merchant-specific; available only when configured and healthy |
| Bounded write | Gated per connector and merchant permission; never inferred from read health |
| `refund.issue` | Unreleased; selected-provider MVP action contract and proof required |
| `request.deny` | Unreleased; automatic customer denial is outside the initial MVP |
| `claim.submit` | Unreleased; selected recovery channel and claimant rights required |

## Environment switches

| Switch | Capability held behind it |
|---|---|
| `BILLING_ACTIVE` | Paid entitlement enforcement and billing mode |
| `ENFORCE_PRODUCT_GATES` / public companion | Product entitlement gates; production must not rely on a public-only value |
| `NETWORK_CONTEXT_ENABLED` | Network context check; currently gated off |
| `INVESTIGATIONS_ENABLED` | Investigation workflow availability |
| `INVESTIGATION_EMAIL_DISPATCH_ENABLED` | External investigation email dispatch |
| `WORKFLOW_PUBLICATION_ENABLED` | Workflow publication |
| `GENERIC_EVENT_INGESTION_ENABLED` | Generic event ingestion |
| `PUBLIC_CLAIM_GATE_ENABLED` | Public claim-gate access |

Provider credentials and account permissions are required runtime configuration, not feature flags and not evidence of healthy data delivery.
