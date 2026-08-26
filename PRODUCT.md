# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Unauth is used by merchant operations, loss-prevention, support and finance teams who investigate post-purchase exceptions, make evidence-backed decisions, coordinate recovery and reconcile financial outcomes.

## Product Purpose

Unauth turns connected commerce and support records into an auditable operating system for cases, losses, recoveries and reconciliation. Success means an operator can trace a financial result to its source and scope, distinguish a recommendation from a merchant decision or external action, and take the next permitted step without losing operational context.

## Positioning

Unauth joins source evidence, merchant decisions, recovery work and append-only financial history in one traceable workflow instead of treating fraud review, support resolution and loss reporting as separate dashboards.

## Operating Context

Operators work across case queues, customer and commerce records, recovery partners, reconciliation exceptions, reports and connected sources. The signed-in product is desktop-only below 1024px; it does not provide a reduced mobile triage mode. Public, authentication, and onboarding routes remain responsive through 390px.

## Capabilities and Constraints

- Preserve canonical routes, URL-backed filters and scope, permissions, tenancy, loaders, backend mutations and audit consequences.
- Money is stored and presented from integer minor units. Currency, date range, timezone, comparison scope, source, freshness and reconciliation state remain explicit wherever they affect meaning.
- Unknown or unavailable values are never presented as verified zero. Mixed currencies are separated rather than silently summed.
- Source facts, recommendations, merchant decisions, external actions, responsibility, recovery and ledger entries are distinct records.
- The financial ledger is append-only. Reversals and write-offs create new immutable entries and retain the original event.
- High-impact actions use a review boundary that states the object, scope and audit consequence.
- Missing backend capability or source data uses a truthful unavailable state; the frontend does not invent support.
- Provider code maturity, merchant configuration, live health, import state, object-family freshness, and action capability are separate axes. No one axis implies another.
- Pricing, signup, onboarding, billing, entitlements, credit allowances, billable events, and top-ups derive from `lib/billing/plans.ts`. A URL may propose a plan; only server-owned intent plus provider confirmation changes subscription state.

## Brand Commitments

The product name is Unauth. Product language is direct, operational and evidence-led. Existing Unauth wordmark and symbol assets under `public/brand/unauth-r1/` remain the authoritative marks.

## Evidence on Hand

- Current authority index: `ARCHITECTURE.md`.
- Visual and interaction authority: `DESIGN.md`.
- Executable route and surface inventory: `lib/surfaces/manifest.ts` and its verification script.
- Connected source fixtures and current backend loaders provide product data. The UI must not fabricate customer claims, benchmarks or financial outcomes.

## Product Principles

- Make every financial result traceable.
- Keep evidence, advice, decisions, actions and ledger consequences distinct.
- Prefer explicit unavailable states over plausible-looking inference.
- Preserve operator context through filters, selection and connected records.
- Make consequential actions reviewable and auditable.

## Accessibility & Inclusion

The authenticated product must support keyboard operation, visible focus, meaningful loading/empty/unavailable/error states, readable compact layouts and chart data-table alternatives. Color is never the only carrier of financial or lifecycle meaning.
