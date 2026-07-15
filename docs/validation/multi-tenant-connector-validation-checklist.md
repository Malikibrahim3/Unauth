# Multi-tenant connector validation programme checklist

Updated: 2026-07-15 (Europe/London)

Status: complete

Verdict: **Multi-tenant merchant connector architecture verified with documented limitations**

## Operating constraints

- [x] Preserve unrelated owner changes.
- [x] Use no merchant/account/channel identifiers as platform defaults.
- [x] Store no merchant credential in deployment configuration.
- [x] Require normal onboarding rather than manual database rows.
- [x] Label CODE, FIXTURE, LIVE, and PRODUCTION evidence.
- [x] Exclude Gorgias, per user instruction.
- [x] Do not rotate non-critical test credentials, per user instruction.

## Checkpoint 0 — baseline

- [x] Record repository, branch, remote, Vercel linkage, toolchain, and dirty-worktree state.
- [x] Isolate focused delivery from unrelated work.
- [x] Create persistent architecture, matrix, defect, friction, checklist, and final-report records.

## Checkpoint 1 — inventory and coupling

- [x] Inventory catalogue, legacy, backend-only, manual, placeholder, and historical connectors.
- [x] Inspect authentication, credentials, environments, discovery, imports, webhooks, reconciliation, lifecycle, health, and capabilities.
- [x] Scan for merchant defaults, singleton lookups, unscoped parent queries, global credentials, and stale production claims.
- [x] Classify every connector truthfully.

## Checkpoint 2 — connection architecture

- [x] Protect OAuth state with merchant/user/provider/environment/callback binding, expiry, and one-time consume.
- [x] Make credentials encrypted and connection-required.
- [x] Enforce claim-safe provider-account ownership.
- [x] Make ShipBob channel selection explicit and expiring.
- [x] Store carrier environment/account metadata per connection.
- [x] Define one-active-connection policies.

## Checkpoint 3 — processing and data isolation

- [x] Scope jobs, cursors, locks, retries, and failures by merchant and connection.
- [x] Scope webhook authentication, routing, idempotency, and revoked handling by exact connection/account.
- [x] Enforce composite merchant-parent relationships.
- [x] Preserve identical external IDs across tenants/connections.
- [x] Scope reconciliation to merchant plus connection/source provenance.
- [x] Validate provider-neutral Shopify, ShipBob, and carrier mapping fixtures.

## Checkpoint 4 — authorization and lifecycle

- [x] Apply service-write and membership-read RLS.
- [x] Reject cross-merchant direct-ID manipulation.
- [x] Derive health, capabilities, and readiness from the selected connection.
- [x] Normalize provider/database errors and scan for secrets.
- [x] Verify exact-connection disconnect/reconnect and retained history.

## Checkpoint 5 — live Merchant A/B/C evidence

- [x] Merchant A Shopify exact-connection probe and stable disconnect/reconnect.
- [x] Merchant A ShipBob import, webhook, and final healthy state.
- [x] Merchant B production-shaped multi-tenant fixtures.
- [x] Clean Merchant C ordinary signup and server-owned workspace bootstrap.
- [x] Merchant C ShipBob-first OAuth and explicit provider-account selection.
- [x] Merchant C initial/incremental jobs: 81 records, zero failures.
- [x] Live ShipBob two-subscription disconnect isolation and reconnect.
- [x] Final two-tenant distinct credential/account/source bindings.
- [x] UPS production/sandbox OAuth and official sample tracking.
- [x] FedEx sandbox OAuth and official mock tracking.
- [x] Canonical carrier evidence idempotency.
- [x] Record Gorgias as excluded rather than verified.
- [x] Record the absence of a same-real-order cross-provider sample.

## Checkpoint 6 — defects and production configuration

- [x] Verify MT-001 through MT-014 and MT-016 through MT-023.
- [x] Accept and clearly classify MT-015.
- [x] Fix and verify clean signup MT-024.
- [x] Fix and verify ShipBob-first gate MT-025.
- [x] Fix and verify exact ShipBob webhook cleanup MT-026.
- [x] Fix and verify disconnect metadata MT-027.
- [x] Remove all eight obsolete merchant-scoped Vercel variables from Production and Preview.
- [x] Verify production remains healthy after configuration removal.

## Checkpoint 7 — quality and delivery

- [x] Apply preflighted database migrations and regenerate types.
- [x] Pass focused connector and multi-tenant regression suites.
- [x] Pass complete Jest suite: 279 suites and 2,079 tests; one suite and three tests intentionally skipped.
- [x] Pass TypeScript.
- [x] Pass ESLint.
- [x] Pass Next.js production build with 95 of 95 static pages generated.
- [x] Pass git diff validation.
- [x] Pass changed-file secret scan.
- [x] Commit and push focused repairs to main.
- [x] Verify a Ready Vercel production deployment.
- [x] Complete all ten required validation/evidence documents.

## Final production state

- Two connected ShipBob merchants use different provider accounts, source accounts, encrypted credentials, and exact webhook URLs.
- Merchant C contains 81 stable source records and five successful jobs with zero failures.
- Shopify contains exactly one active post-reconnect connection with stable data.
- UPS and FedEx live adapter calls and repeated canonical persistence passed in their verified environments.
- No obsolete merchant-scoped connector variable remains in Production or Preview.

## Documented limitations

- Gorgias was excluded by explicit user instruction.
- Live carriers used official provider samples rather than a single merchant order shared with Shopify/ShipBob.
- The samples did not expose real signature, delivery-photo, or POD artifacts.
- FedEx was verified with sandbox credentials; its production endpoint correctly rejected that sandbox project.
- MT-015 remains an accepted product-surface limitation.

## Current blockers

None for the stated verdict.

## Next automatic action

None. Future work would expand provider-content coverage, not close an unverified tenant-isolation boundary.
