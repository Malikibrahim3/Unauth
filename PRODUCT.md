# Product

<!-- impeccable:product-schema 1 -->

This is the canonical durable product record for visual and product-design
work. It consolidates the existing contract in [`docs/PRODUCT.md`](docs/PRODUCT.md)
and the current release map without changing product scope.

## Platform

web

## Users

Unauth is primarily used by ecommerce operations, support, loss-prevention,
finance, and recovery teams. They work for sustained periods on desktop
displays, often under time pressure, and need to move between customer context,
commerce records, fulfilment evidence, financial exposure, decisions, and
recovery work without losing the thread of a case.

Secondary users include administrators configuring sources, rules, flows,
permissions, billing, and data controls, plus support agents using compact
helpdesk or browser-extension views.

## Product Purpose

Unauth is a source-agnostic evidence reconciliation, decision-support, and
recovery-control platform. It brings commerce, helpdesk, fulfilment, payments,
and imported records into one operational model and timeline.

The product helps a merchant understand what happened, decide what to do for
the customer, determine where responsibility appears to sit, and pursue
recovery. The merchant retains every final decision.

## Positioning

Unauth does not merely score a customer or display disconnected provider
records. Its distinct mechanism is the reconciliation of source-labelled facts,
human findings, inference, customer action, responsibility, financial loss, and
recovery into one auditable case while keeping those concepts separate.

## Operating Context

- A case is the shared unit of work.
- Operators move between Overview, Work, Cases, Losses, Recovery, Customers,
  Rules, Flows, Reports, Integrations, and Settings.
- A unified case timeline carries evidence, recommendations, investigations,
  decisions, outcomes, losses, and recoveries.
- Provider records enrich the case rather than creating provider-specific
  product models.
- Compact embedded views support front-line lookup; full context remains in
  the Unauth workspace.
- Marketing and demo surfaces use real product truth and deterministic,
  privacy-safe examples rather than screenshot-only mock products.

## Capabilities and Constraints

- Merchant isolation is absolute.
- Every displayed fact retains source provenance and freshness where relevant.
- Source facts, human findings, and inferences remain visibly distinct.
- Reconciliation occurs at claimed-item × parcel level and supports split
  shipments.
- Customer treatment, responsibility, and recovery remain independent.
- Unauth does not automatically approve, deny, refund, accuse, close a case,
  submit an external claim, or assign responsibility.
- Financial values use explicit currency and auditable calculations.
- Missing, partial, stale, unsupported, and unavailable data never become zero
  or healthy presentation.
- Existing permissions, entitlements, routes, redirects, deep links, exports,
  query state, audit history, and mutation behaviour are contractual.
- The authenticated product is optimised for viewports from 1024 CSS pixels,
  and remains fully operable through responsive reflow when the viewport,
  browser zoom, or text scaling produces a narrower working width.
- Public, entry, onboarding, and embedded surfaces must remain usable at their
  real responsive or host-constrained sizes.

## Brand Commitments

- Product name: Unauth.
- Voice: neutral, precise, calm, evidence-first, and non-accusatory.
- Prefer operational language such as customer action, responsibility,
  recovery route, evidence fact, unresolved, merchant-confirmed, economic loss,
  reconciled recovery, and net unrecovered loss.
- Avoid language that presents risk or inference as guilt.
- Apple is a quality discipline—clarity, hierarchy, consistency, fit, feedback,
  and restraint—not a visual theme or permission to imitate iOS or macOS.
- Stripe and Ramp are execution benchmarks for precision and polish, not
  templates to copy.

## Evidence on Hand

- Existing application code and its production route manifest.
- [`docs/PRODUCT.md`](docs/PRODUCT.md), the detailed product contract.
- [`unauth-product-map-release-1.md`](unauth-product-map-release-1.md), the
  current capability and workflow map.
- [`DESIGN.md`](DESIGN.md), the current visual system.
- Deterministic demo and capture fixtures used by the existing visual evidence
  tooling.
- No fabricated customers, outcomes, benchmarks, or commercial claims may be
  introduced for visual completeness.

## Product Principles

1. Reconcile evidence; do not flatten it.
2. Keep the merchant in control of consequential decisions.
3. Make money, provenance, uncertainty, and next action explicit.
4. Preserve one operational thread across systems and lifecycle stages.
5. Prefer truthful incompleteness over false certainty.

## Accessibility & Inclusion

The web product targets WCAG 2.2 AA. All essential work must remain available
to keyboard and pointer users, at 200% zoom, with reduced motion, forced
colours, and non-colour state cues. Dense operational information must remain
legible rather than being reduced to tiny text.
