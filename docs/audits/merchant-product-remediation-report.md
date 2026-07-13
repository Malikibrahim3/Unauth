# Merchant product remediation report

**Date:** 13 July 2026  
**Status:** **Authenticated merchant product ready with documented limitations**

## Executive result

The authenticated product now presents a coherent payout-control operating
environment for a controlled design partner: canonical navigation exposes
Overview, Work, Payout Control, Losses, Recoveries, Customers, Rules, Flows,
Reports, Integrations and Settings in that order. Legacy identity/network and
parallel recovery-partner surfaces are retained only for compatibility, not
merchant discovery.

Core UI routes, connected records, status/money presentation and the
loss-to-recovery invariant are implemented and covered by prior validation.
The conservative evidence does **not** support a claim that all financial
values reconcile in a live provider workflow, because the required complete
source-to-final-financial-result demonstration has not yet been performed.
Source freshness/coverage and provenance are product concepts; live Shopify
and deployed reconciliation proof remain outstanding.

## Product-surface result

| Surface | Purpose and merchant action | Result and limitation |
|---|---|---|
| Overview | See exposure, loss/recovery context and open work; drill into records. | Current reporting bridge is currency-aware; live final-loss reconciliation remains unproven. |
| Work | Act on assigned tasks and exceptions from one queue. | Current operational queue is implemented; representative live task volume needs persona validation. |
| Payout Control / case | Review evidence, recommendation, decision and linked financial/recovery work. | Canonical case workspace is current; final external outcome needs live proof. |
| Exceptions | Resolve what automation cannot conclude safely. | Current exception-to-case flow is covered; no live financial-resolution chain was observed. |
| Losses / Recovery | Trace confirmed loss, attribution, recovery eligibility and outcome. | Invariant is enforced in application services; the retained orphan validation seed is excluded. |
| Customers / connected records | Move between customer, source objects and payout case without duplicate identity products. | Customer contract was repaired; verify the current in-progress customer changes before release. |
| Rules / Flows | Configure advisory policy and bounded operational routing. | Implemented and versioned; not an unrestricted automation platform. |
| Reports | Understand causes and reconcile drill-down records. | Per-currency report bridge exists; needs a live completed chain. |
| Integrations | Connect sources and understand coverage, freshness and readiness. | Preserve validated setup/readiness UX; Shopify and production cron proof are external blockers. |
| Settings | Manage real account/team/policy/audit functions. | Now visible in primary navigation; unavailable delivery/billing functions must remain conditional. |

## Changes in this remediation increment

- Added the mandatory remediation baseline, reconciling the older surface audit
  with branch, deployment and validation evidence.
- Made Settings a primary navigation destination and placed Reports before
  Integrations/Settings to match canonical route ownership.
- Removed the legacy `/partners` recovery configuration from workbench and
  command-palette discovery while retaining its route and data compatibility.
- Added navigation regression coverage for the containment decision.

## Flow result

| Flow | Status |
|---|---|
| Review a payout case and resolve an exception | Completed in current product evidence |
| Create/track a loss and recovery through application services | Partially completed; canonical invariant exists, live proof missing |
| Shopify refund case to final report | Blocked on working sandbox credential and safe controlled event |
| ShipBob fulfilment context | Completed in code/sandbox documentation; production-account proof deferred |
| Rules/flows, collaboration and in-app notifications | Completed for bounded MVP+ operation |
| External email, automatic carrier claims, full chargeback automation | Intentionally deferred |

## Validation

- Public production check: `https://unauth-pi.vercel.app` redirected to
  `/landing`; `/login` returned 200 and identified the current payout-control
  product.
- Current branch and `main` were compared; `ui-craft-overhaul` contains the
  post-main UI remediation commits through `39826f11`.
- Prior evidence consulted: Phase 12 full-system validation, coverage matrix,
  defect/deferred registers, integration verification status, launch blueprint
  and the July 13 forensic audit.
- This increment runs the focused navigation unit test before handoff. A full
  build/test/deployment certification is deliberately not asserted here.

## Remaining work

**Release-blocking evidence:** repair Shopify sandbox access; execute one
canonical source → case → loss → recovery → final-report/audit scenario; prove
the deployed scheduled reconciliation runs idempotently; replace/isolate the
noncanonical recovery validation seed.

**External setup:** controlled provider credentials, `CRON_SECRET` deployment
configuration and safe design-partner data.

**Connector-specific:** ShipBob production-account proof, deferred Gorgias /
AfterShip coverage where controlled accounts are unavailable.

**Optional post-pilot:** provider-backed email, automated external recovery
submission, advanced roles and legacy database cleanup under a migration plan.
