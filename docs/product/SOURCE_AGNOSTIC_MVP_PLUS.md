# Source-Agnostic MVP+ — Product Contract

**Status:** Authoritative for source/connector architecture decisions.
**Precedence:** This document supersedes **only the integration-specific limits** in the
current steering material (see §Precedence). Everything else in
`MVP_STEERING.md`, `PRODUCT_PRINCIPLES.md`, and `TERMINOLOGY.md` remains authoritative.

Companion implementation plan: `docs/IMPL_source_agnostic_connected_ecosystem.md`.

---

## Precedence

When the current MVP steering conflicts with source independence, **this document wins**
for the following, and only the following, topics:

- whether the architecture may assume Shopify/Gorgias — it may **not**;
- whether canonical CSV / API / webhook / manual intake is in scope — it **is**;
- whether a support payout case must be anchored to a Shopify order or a known helpdesk
  ticket — it must **not** be required to.

For all other topics (product positioning, neutral language, merchant-controlled
decisions, frozen scoring/matching calibration, Gorgias widget compression) the existing
steering documents remain authoritative and this document does not override them.

---

## Core requirement

Shopify and Gorgias remain the **first production connectors**, but no core case,
evidence, loss, recovery, financial, search, workflow, or UI behavior may depend on
either provider.

If a merchant moves from Gorgias to Zendesk, or adds a second storefront, or has no
supported connector at all, Unauth must still:

- create and work a complete support payout case;
- capture and score evidence;
- apply merchant rules;
- classify attribution and recoverability;
- open recovery cases;
- report recovered / rejected / prevented / leaked outcomes.

## What is now in scope (previously out)

- A **canonical connector contract** with Read/Sync/Link/Write/Act/Subscribe
  capability levels and runtime availability separate from declared support.
- A **canonical intake surface**: authenticated webhook, entity-upsert API, CSV import,
  and manual case creation — none of which pretend to be full connectors.
- A **provider-neutral domain-event stream / outbox** with idempotent handlers.
- A **source-record registry** giving every imported record source / account /
  external-ID / provenance / freshness traceability.
- **Explicit record matching** (confirmed / probable / ambiguous / unmatched) that never
  silently merges uncertain records.
- One canonical writer each for **case state, evidence, loss, recovery, task, and
  finance**, with money stored as integer minor units plus ISO currency.

## What remains out of scope (unchanged)

- Building every named commerce/helpdesk/WMS/returns/payment connector.
- Public connector SDK or merchant-authored code execution.
- Automatic carrier claim submission, automatic refund issuance, autonomous denial.
- AI contract extraction, network benchmarks, WMS/ERP integrations, full enterprise APIs.
- Cross-merchant data sharing or network claims.
- Replacing the legacy identity-resolution / scoring engine.

## Distinct data states (never collapse to `null` / "not connected")

A **missing source**, **unsupported capability**, **missing permission**,
**absent record**, **stale record**, and **failed sync** are six different states and
must render and behave differently everywhere they appear.

## Merchant acceptance statement

> We use Shopify and Gorgias today, but if we move to Zendesk or add another storefront,
> Unauth does not stop working. When something changes in one system, the relevant case
> updates everywhere. We can see where every fact came from, what is missing or stale,
> who owns the work, and what financial outcome followed.
