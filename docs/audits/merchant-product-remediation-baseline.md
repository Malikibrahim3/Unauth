# Merchant product remediation baseline

**Date:** 13 July 2026  
**Baseline source:** `merchant-product-surface-audit.md`; reconciled against local `main`, the checked-out `ui-craft-overhaul` branch, current route code, migrations, the public deployment, and the latest validation material available in this workspace.

## Evidence and decision rule

The older surface audit is an inventory, not current truth. `main` is at
`e3cfe883`; the checked-out branch contains the focused UI-remediation commits
through `39826f11`. The public deployment at `https://unauth-pi.vercel.app`
responded and its login page identifies the product as **Post-Purchase Payout
Control**. Authenticated production data was not inspected: that requires a
safe merchant session and is not inferred from a public response.

There is conflicting validation evidence on the same date. The forensic audit
claims a complete 97/100 release pass, while the Phase 12 validation explicitly
withholds the release gate for the live Shopify credential, deployed cron proof,
the noncanonical recovery seed, and an end-to-end financial trace. This
baseline gives the more conservative Phase 12 evidence precedence for release
claims, while accepting later code/UI fixes when they are present in the branch.

Connector reconciliation: the launch blueprint records ShipBob connect/sync,
warehouse evidence and isolation hardening as completed. The older Phase 12
matrix predates that statement and has no ShipBob row. ShipBob is therefore
treated as implemented and sandbox-validated in code/documentation, but not as
proof of a production-account workflow. Shopify remains fixture-verified in the
latest conservative validation despite earlier development-store evidence.

## Audit defect reclassification

| Audit item | Current evidence | Classification | Action / scope |
|---|---|---|---|
| DEF-001 complete source-to-final financial journey | Phase 12 has no built-app loss/recovery/final-report trace; no later safe proof is present. | Still valid | External validation gate: repair the sandbox, create data through services, capture the case/loss/recovery/report/audit chain. No synthetic seed may stand in for it. |
| DEF-002 unverified integrations | Shopify token was 401 in Phase 12. The product documents ShipBob sandbox import and isolation; Gorgias has read-only proof. | Partially valid | Preserve the current readiness UI and disclose source coverage. Shopify credential repair and provider-account proof are external setup, not a UI rewrite. |
| DEF-003 deployed reconciliation proof | `vercel.json` contains the scheduled route; Phase 12 has no successful deployed run or configured secret evidence. | Still valid | Deployment owner must configure/verify `CRON_SECRET` and record an idempotent run. |
| DEF-004 orphan, mixed-currency recovery seed | `DATA-VAL-001` remains expressly excluded from proof; normal recovery creation requires a loss. | Still valid for validation data; fixed in product invariant | Do not delete legacy data. Isolate/replace the seed only in a controlled validation dataset. |
| DEF-005 competing navigation | `/watchlist`, `/global`, `/catches`, `/lookup`, `/store`, and `/chargebacks` redirect to canonical routes. This pass removes `/partners` from workbench/command discovery and adds visible Settings in canonical order. | Partially valid, remediated further in this pass | Keep redirect compatibility; no destructive legacy removal. Continue to keep identity/network concepts out of merchant discovery. |
| DEF-006 distributed financial definitions | `case_financial_summaries` and the reporting bridge are used, but losses/recoveries retain additional read paths and Phase 12 found labels not fully consolidated. | Still valid | Keep the existing canonical ledger; add a shared read model only when a concrete inconsistency is reproduced. Do not create a second financial engine. |
| DEF-007 missing case/customer context | APP-VAL-004 was fixed with source-customer resolution and tests; identity-less/order-less cases deliberately have no fetch. | Already fixed | Retain the explicit unavailable state; no fabricated context. |
| DEF-008 lost audit metadata / incomplete financial audit proof | APP-VAL-005 was fixed; Phase 12 still lacks a completed financial-chain audit record. | Partially valid | Code defect is fixed. Complete audit-chain proof belongs to the external end-to-end validation gate. |
| DEF-009 customer 404 and fragmented object routes | Current branch includes the customer profile/drawer repair and connected-record return paths; the pre-fix screenshot is historical. | Partially valid | Validate against a safe merchant after the current uncommitted customer work is settled; keep object routes lightweight and case-linked. |
| DEF-010 hidden/confusing administration | Settings functions exist; this pass exposes Settings in primary navigation. Billing remains conditional on real entitlement/billing state. | Partially valid, remediated further in this pass | Do not advertise unavailable billing/email capabilities. |
| DEF-011 fresh browser walkthrough unavailable | The earlier audit could not reach local app from the in-app browser; later checked-in browser suites claim coverage. | Partially valid | Treat screenshots and suites as evidence, not a substitute for a fresh authenticated walkthrough in the target environment. |
| DEF-012 durable external email | Latest validation finds in-app notifications only. | Intentionally deferred | Outside pilot release unless an email provider/queue is explicitly approved. |
| DEF-013 broken `legacy_v1` functions | Phase 12 reports database-lint failures in retained legacy functions. | Intentionally deferred | Requires an approved legacy cleanup/migration plan; do not delete tables merely to tidy the route surface. |
| DEF-014 warnings and dependency advisories | Phase 12 listed 73 warnings/seven advisories; the later forensic report claims clean scoped lint/audit, but no new command was run in this pass. | Partially valid / evidence conflict | Re-run the release gate before any readiness claim; do not make a security claim from the conflicting reports alone. |

## Missing-capability reclassification

| Missing capability from source audit | Current position | Resolution / scope |
|---|---|---|
| Live end-to-end financial accountability proof | Still absent in conservative evidence | Release-blocking external validation scenario. |
| One financial vocabulary everywhere | Partially delivered by canonical money formatting, labels, ledger summaries and report bridge | Keep as a targeted correctness backlog; no second engine. |
| One next action for partial/stale/conflicting data | Implemented in readiness, exception, queue and case patterns; not re-proven on every route | Validate in browser with partial coverage. |
| Live recovery against a canonical loss | Not proven; orphan seed excluded | External safe-data scenario. |
| Live Shopify connect/import/reconcile proof | Not proven with the current credential | Connector-owner action. |
| Consistent account/team/audit/notification administration | Improved by visible Settings; some sections remain conditional/deferred | Keep only working functions discoverable. |
| Seamless connected-object navigation | Current detail routes and repaired customer flow provide it for supported objects | Verify case → source → case and report → record → case; do not build a graph module. |
| KPI traceability with uniform date/currency/provenance | Reporting bridge separates currencies and drills into records; full financial-chain reconciliation absent | Prove with canonical data, not dashboard fixtures alone. |
| Production cron and external notification reliability | Cron unverified; email intentionally out of scope | Deployment task / deferred capability. |
| Legacy identity/network language containment | Redirects exist and primary discovery now excludes Partners/legacy surfaces | Retain compatibility code/data, but never present it as merchant product capability. |

## Adopted product contracts

- Canonical merchant navigation: Overview, Work, Payout Control, Losses,
  Recoveries, Customers, Rules, Flows, Reports, Integrations, Settings.
- Canonical object chain: payout case → loss → recovery; a recovery is not
  financial proof without its canonical loss.
- Money is presented per ISO currency. Exposure, loss, prevented and recovered
  are separate values; unknown data is not rendered as zero.
- Recommendations are advisory. Probable matches remain exceptions until a
  merchant decision is recorded and audited.
- Shopify, ShipBob and every other source are represented by coverage, freshness
  and provenance—not by an assumed connected state.

## Out of scope for this remediation

Cross-merchant identity/network products, watchlists/global patterns as a
merchant proposition, full chargeback/helpdesk/WMS/ERP replacement, automatic
refunds/denials/claims submission, unrestricted automation, enterprise custom
connectors and unapproved live email delivery are intentionally outside MVP+.
