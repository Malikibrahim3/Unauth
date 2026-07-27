# Product polish — Phase 2

- Status: COMPLETE
- Active IDs: SEED-01–SEED-28
- Result: 28/28 PASS

## Changes

- SEED-01 — introduced the fictional Alder & Ash merchant, Morgan Ellis operator, `.invalid` identities, and a safe Shopify domain; validator deny-list and browser scan passed.
- SEED-02 — aligned the shell, Integrations, cases, and customer activity on one Gorgias support story; browser inspection showed no disconnected-helpdesk contradiction.
- SEED-03 — seeded Shopify, Gorgias, and ShipBob as healthy plus one recoverable UPS attention state; validator and Integrations row/summary counts passed.
- SEED-04 — linked all 24 source customers to 102 dated GBP orders and complete spend aggregates; validator coverage passed.
- SEED-05 — derived customer order counts from the linked order collection; the hero profile rendered `Latest 6 of 6`.
- SEED-06 — completed the decision-ready hero with order/item, shipment, ticket, evidence, investigation, recommendations, rule, finance, owner, timeline, and recovery context; validator passed.
- SEED-07 — removed fixture-style visible tags; validator and route text scan found no fixture language.
- SEED-08 — seeded source-labelled, valued GBP loss records with responsibility and supporting references; validator passed.
- SEED-09 — varied recovery routes, stages, owners, deadlines, source updates, evidence composition, and amount pairs; validator and board inspection passed.
- SEED-10 — distributed case submission/status ages independently of update timestamps; validator found at least four distinct waiting ages.
- SEED-11 — seeded three named team members plus unassigned work; validator passed.
- SEED-12 — interleaved issue types, sources, states, values, and owners; first-viewport distribution check passed.
- SEED-13 — created uneven, varied notifications whose deep links resolve to their source objects; validator passed.
- SEED-14 — created descriptive rules with published/draft and version variation; hero rule linkage passed.
- SEED-15 — created two active flows, one draft, and deterministic successful run history; validator passed.
- SEED-16 — added named products, variants, quantities, fulfilment, and six hero-customer orders with ordinary purchases; validator passed.
- SEED-17 — added a production-resolvable merchant identity note, Gorgias history, and team activity; hero customer browser inspection passed.
- SEED-18 — made the merchant graph self-contained and merchant-scoped; clean seed, validation, and second seed produced identical counts.
- SEED-19 — attached range, capture clock, currency, and inclusion metadata to financial entries and reconciled every state to its same-scope summary; validator passed.
- SEED-20 — prohibited fixture implementation strings and enforced sentence-case merchant copy; validator and route scan passed.
- SEED-21 — isolated cleanup and validation to the stable marketing merchant namespace; database and seed counts agreed at 785 records.
- SEED-22 — supplied merchant-recognisable account names for every connection; validator and Integrations inspection passed.
- SEED-23 — added `recovery_cases.last_source_event_at` and made Recovery use it instead of internal `updated_at`; validator and board inspection passed.
- SEED-24 — added stable semantic capture IDs and URLs for every named record; validator printed and checked the capture inventory.
- SEED-25 — curated decision-ready, active-recovery, and resolved/recovered hero cases with complete evidence, activity, rules, recommendations, finance, and investigations; validator passed.
- SEED-26 — kept case-linked orders below 25% and included ordinary orders for every hero customer; validator passed.
- SEED-27 — generated non-consecutive references and varied adjacent case records; validator distribution checks passed.
- SEED-28 — reconciled line quantities, prices, discounts, tax, shipping, order totals, claimed lines, and financial projections to the penny; validator passed.

## Checks

- `npm run seed:marketing -- --as-of=2026-07-26T12:00:00.000Z` — PASS
- `npm run validate:marketing-seed -- --as-of=2026-07-26T12:00:00.000Z` — PASS (785 records, three hero cases, stable capture URLs)
- second identical `npm run seed:marketing -- --as-of=2026-07-26T12:00:00.000Z` — PASS with no duplicate growth
- Overview, Cases, decision-ready case, Customers, hero customer, Recovery, Reports, and Integrations at 1440px — PASS for coherent story, settled data, forbidden text, and horizontal overflow
- `npm run typecheck` — PASS
- `npm run lint -- --max-warnings=0` — PASS
- marketing script syntax checks — PASS
- `git diff --check` — PASS

## Remaining

None.
