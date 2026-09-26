# Merchant-ready MVP+ scope

Status: MR0 `PASS`, 23 August 2026.

The status above is historical MR0 evidence. Current app-wide constraints are
in [GLOBAL_RULES.md](../../GLOBAL_RULES.md); the merchant desktop and decision
workflow changes are sequenced in
[MERCHANT_CLARITY_IMPLEMENTATION.md](MERCHANT_CLARITY_IMPLEMENTATION.md).
Their documentation adoption does not change provider or release verdicts.

The owner adopted a new authenticated MVP target on 23 September 2026 in `PRODUCT.md`. This document preserves the prior supervised certification profile and its current exclusions as a baseline; it is not the new delivery ceiling. The selected live merchant and provider/action/country coverage still require evidence and approval before enabled execution. `MERCHANT_CLARITY_IMPLEMENTATION.md#authenticated-mvp-direction--23-september-2026` maps the target to existing owners. This revision makes no real-provider connection or release claim.

## Controlled certification profile

The implementation and pre-pilot verification profile is **Asterlane Commerce Group**, a synthetic controlled certification merchant. It freezes one coherent stack before recruitment. It is not a signed design partner and does not count as real-provider runtime proof.

| Layer | Selected authority | Environment/account position |
|---|---|---|
| Commerce | Shopify | Asterlane synthetic store identity; controlled account proof pending |
| Helpdesk | Gorgias | Asterlane Support synthetic identity; controlled account proof pending |
| Fulfilment | ShipBob | Asterlane UK Fulfilment synthetic identity; controlled account proof pending |
| Carrier | UPS | Asterlane UPS synthetic identity; read-only on-demand proof pending |
| Merchant payment evidence | Shopify Payments | Same selected Shopify shop; refunds, disputes, fees, credits, and settlements require controlled proof |
| Unauth subscription checkout | Stripe Billing | Commercial processor only; not merchant payment evidence |

The synthetic certification operator is Avery Mercer. During pre-pilot certification, the accountable roles are the Unauth product owner for support decisions and the Unauth release operator for rollback. A named real merchant, named human contacts, and signed legal/data agreements are admission criteria before a real merchant is invited; their absence does not block MR0-MR5 implementation.

## Included product boundary

- Selected-stack source connection, import, health, freshness, and evidence projections.
- Evidence-backed case review with recommendations kept separate from merchant decisions.
- Merchant-recorded decisions, investigations, recovery handoff, reconciliation, and append-only financial history where the required source facts exist.
- Canonical Free, Pro, Growth, and Enterprise plan requests; server-owned subscription intent; provider-confirmed activation.
- Successful runtime usage receipts for store context, gated network context, evidence reports, and entitled API enrichment.
- Desktop-only product across public entry, authentication, onboarding, interactive demos, and merchant workflows, with accessible unsupported-device notices and usable compact desktop/zoom states under the global rules.

## Excluded or blocked

- Unauth does not issue refunds, create replacement orders, communicate customer denials, contact customers/partners, or submit provider claims. Recording a merchant decision and preparing a manual handoff are distinct from external execution.
- Stripe as a merchant evidence connector remains planned.
- UPS is on-demand read-only; no outbound carrier submission is promised.
- Scheduled report delivery is unavailable.
- Retention, controller/processor terms, subprocessors, and pilot notices are not release-cleared without named owner and counsel approval.
- Catalogue providers outside the selected stack may remain visible, but planned entries are not connectable or included in the pilot promise.

MR1 connector work may start after an MR0 `PASS` against this frozen certification profile. It must use controlled sandbox/test accounts, keep every provider state evidence-qualified, and must not imply that Asterlane is a real merchant. Binding a real merchant and its exact accounts is a later invitation/release decision.
