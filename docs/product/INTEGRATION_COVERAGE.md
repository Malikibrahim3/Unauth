# Integration Coverage

The Integration Hub separates live connectors from visible slots. A provider is either connected with real merchant credentials or it is not connected; there is no demo-connected state.

Live in this phase:

- Shopify, including Shopify Payments dispute evidence.
- Gorgias.
- AfterShip for tracking status, carrier, scan history, exception events, and delivery dates.
- UPS and FedEx direct carrier connectors for attempted signature and delivery-photo proof.
- Merchant-approved document uploads for carrier agreements, 3PL SLAs, supplier terms, and insurance policies.

Visible slots only:

- WMS / 3PL: ShipBob, ShipHero, Extensiv, ShipMonk.
- Returns: Loop, ReturnGO, Narvar.
- Alternative payments/disputes: Stripe, PayPal, Adyen.
- Carrier claims: UPS/FedEx Claims API for claim submission status, outcome, approved amount, and paid amount.

Full coverage is per merchant, based on that merchant's actual stack. A merchant needs their commerce platform, helpdesk, tracking aggregator, direct carrier proof connector, relevant WMS, relevant returns platform, relevant payment gateway, carrier-claims API, and approved contract documents. They do not need every slot in the registry connected at once.

GPS delivery location is intentionally not part of the coverage map. UPS, FedEx, and AfterShip do not expose delivery GPS coordinates through the standard APIs used here, so the product must not represent GPS as collectible now or later. Delivery photo and signature are also carrier- and service-level-dependent: the connector can attempt retrieval, but the value may be unavailable for a shipment.

Evidence completeness is forward-looking. A connector wired today does not backfill proof that was never captured for shipments that left before the connection existed.
