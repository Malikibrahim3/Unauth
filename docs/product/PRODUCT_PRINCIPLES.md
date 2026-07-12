# Unauth Product Principles

This document distils the operating principles from [MVP_STEERING.md](./MVP_STEERING.md). For full context, scenarios, and implementation priorities, read the steering doc.

---

## What Unauth is

Unauth is a **post-purchase loss accountability platform** for ecommerce merchants.

Core product sentence:

> Control payouts. Recover where possible. Prevent where not.

Unauth is not primarily a cross-merchant fraud/risk network. Legacy identity and pattern context may exist, but the MVP centres on support payout control, evidence, rules, attribution, recoverability, and recovery operations.

---

## Three product feelings

### 1. Control

Before money leaves the business, merchants and agents should see policy, evidence, payout exposure, and the recommended next action. The product reduces guesswork without sounding accusatory.

### 2. Accountability

Losses should not disappear. Every case should be classified for recoverability and ownership of the next step — not definitive blame unless evidence and merchant policy clearly support it.

### 3. Results

Merchants should see measurable outcomes: payout exposure reviewed, recoverable amount identified, amount recovered, cases chased on time, prevention opportunities, and policy leakage surfaced.

---

## Who decides

**Merchant rules make recommendations. Unauth does not make autonomous payout decisions.**

Unauth surfaces:

- evidence;
- matched rule;
- payout exposure;
- attribution;
- recoverability;
- next action.

Never frame output as Unauth denying or accusing a customer.

---

## Surface hierarchy

| Surface | Role |
|---|---|
| Gorgias widget | Compressed 4-line decision card for agents |
| Support payout case page | Full operating record for managers |
| Recovery board | Ops chase-up workflow |
| Partner rulebook | Recoverability rules per partner type |
| Dashboard | Operational results, not vanity risk metrics |

The widget is the front-line decision surface. It is not the full product.

---

## Build priority

When improving the product, prioritise in this order:

1. Support payout case clarity
2. 4-line Gorgias widget
3. Evidence checklist
4. Rules-led recommendations
5. Recovery cases
6. Recovery board
7. Partner rulebook v1
8. Dashboard metrics

---

## Out of MVP scope

Do not overbuild until the core workflow is proven:

- automatic carrier claim submission;
- AI contract extraction;
- network benchmarks as the product story;
- WMS/ERP integrations;
- full enterprise APIs;
- complex AI decisioning;
- destructive replacement of legacy identity/network code.

The MVP is additive and focused.

> **MVP+ source architecture override (see `docs/product/SOURCE_AGNOSTIC_MVP_PLUS.md`).**
> The items above stay out of scope. What is now **in** scope: canonical CSV / webhook /
> API / manual intake and the source-agnostic connector/event foundation. This is a new
> canonical business-record importer, **not** a revival of the deleted fraud-audit CSV
> worker. Shopify/Gorgias remain the launch connectors but must not be architectural
> assumptions.

---

## Language

See [TERMINOLOGY.md](./TERMINOLOGY.md) for preferred and avoided terms.

If legacy identity/network context appears in UI, phrase it as **claim-history context** or **pattern context** — not fraud network match or cross-merchant accusation.
