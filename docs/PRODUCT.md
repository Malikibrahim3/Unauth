# Product contract

Unauth is a source-agnostic evidence reconciliation, decision-support, and recovery-control platform.

It gives merchants one operational model and timeline across commerce, helpdesk, fulfillment, payments, and imports. The product reconciles identities, events, and money, then produces three independent recommendations: what to do for the customer, where responsibility appears to sit, and how to recover the merchant’s cost. The merchant makes the final decision and Unauth observes the resulting refund, replacement, concession, or no-payout outcome.

## Product model

The primary surfaces are Overview, Work, Cases, Losses, Recovery, Customers, Rules and Flows, Reports, Integrations, and Settings. The canonical route remains `/claims` for compatibility, while the product category is evidence reconciliation and recovery control.

A case is the shared unit of work. Provider records enrich that case; they do not create provider-specific product models. The case reconciles ticket → order → SKU → fulfilment → parcel → carrier, stores one evidence timeline, and keeps customer treatment separate from responsibility and recovery. The compressed helpdesk widget is a front-line decision surface, while full context and history live on the Unauth case page.

Merchant rules must be inspectable and explain why a recommendation appeared. Unauth does not automatically approve, deny, refund, accuse a customer, or close a case.

## Language

Prefer neutral operational terms: customer action, responsibility, recovery route, evidence fact, unresolved, merchant-confirmed, customer concession, economic loss, provider credit, reconciled recovery, and net unrecovered loss.

Avoid accusatory or verdict language such as fraudster, scammer, guilty, caught, blacklist, or bad actor. Historical code can model observed risk signals, but merchant-facing copy must describe facts and decisions without presenting inference as guilt.

## Product constraints

- Merchant isolation is absolute.
- Every displayed fact retains source provenance.
- One case timeline covers evidence, recommendations, decisions, outcomes, losses, and recoveries.
- Reconciliation happens at claimed item × parcel level; split shipments are first-class.
- Source facts, human findings, and inferences remain distinct.
- A provider system record or delivery scan is not silently promoted to physical proof.
- Financial values use explicit currency and auditable calculations.
- Customer concessions and merchant economic loss are separate ledgers; only reconciled credits reduce net unrecovered loss.
- New providers extend capabilities through shared contracts rather than duplicating workflows.
- Automatic carrier claims, contract extraction, and other expansion work follow validated merchant demand; they do not fragment the core model.
