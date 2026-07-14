# Multi-tenant connector validation programme checklist

Updated: 2026-07-14 (Europe/London)

This file is the persistent source of truth for the coordinated multi-tenant connector architecture validation and the Shopify, ShipBob, UPS, and FedEx end-to-end scenario. The architecture specification is controlling. Controlled accounts are Merchant A test inputs only and must never become application defaults or hidden dependencies.

## Operating constraints

- [x] Apply the stricter overlapping requirement and preserve shared evidence once.
- [x] Never hardcode a merchant, store, carrier account, channel, or connection identifier.
- [x] Keep platform OAuth application credentials separate from encrypted, merchant-owned provider credentials.
- [x] Do not use manual connection-row insertion as normal onboarding.
- [x] Stop only for owner-only login, 2FA, secret entry, approval, commercial approval, or an irreversible decision.
- [x] Preserve unrelated pre-existing worktree changes; record any overlap before editing it.
- [x] Update this checklist after every major checkpoint and continue automatically.

## Evidence labels

- `CODE`: repository inspection or automated test evidence.
- `FIXTURE`: isolated Merchant B/C evidence using production-shaped storage and authorization boundaries.
- `LIVE`: controlled provider, Supabase, Vercel, or production browser evidence.
- `BLOCKED`: evidence unavailable because an owner-only action is required.

## Checkpoint 0 — programme baseline

Status: **complete**

- [x] Read the governing architecture specification in full.
- [x] Establish the architecture specification as controlling for the live scenario.
- [x] Record the persistent programme checklist in the repository.
- [x] Confirm the repository already contains unrelated modified and untracked files.
- [x] Capture the current branch, HEAD, deployment linkage, toolchain, and relevant pre-existing changes without exposing secrets.
- [x] Identify whether any pre-existing changes overlap connector validation files before editing.

Evidence:

- `CODE` Workspace: `/Users/malikibrahim/Downloads/Unauth`.
- `CODE` Starting branch: `ui-craft-overhaul`.
- `CODE` Starting HEAD: `e53c9a09138f0b6a800e81273221459255064f59`.
- `CODE` `ui-craft-overhaul` is 15 commits ahead of `origin/main` with no divergent commits; local `main` is stale and must not be used as the programme base without fast-forwarding.
- `CODE` The worktree contains substantial pre-existing UI/design changes plus pre-existing connector-adjacent changes; they are treated as owner work until proven otherwise.
- `CODE` Vercel project metadata links the workspace to project `unauth`; the production branch setting still requires explicit Vercel verification before delivery.
- `CODE` No `gh` or `vercel` CLI is installed. Git remains connected to `https://github.com/Malikibrahim3/Unauth.git`.
- `CODE` The in-app browser has no released signed-in tabs. Live dashboard work will use a signed-in browser session if available later; otherwise login is an owner-only blocker at that checkpoint.
- `CODE` Pre-existing uncommitted overlap exists in `app/api/shopify/verify/route.ts`, `app/api/settings/gorgias/support-connection/verify/route.ts`, and `supabase/migrations/20260714183000_connection_live_verification.sql`. These changes will be preserved and inspected as owner work before any overlapping edit.

## Checkpoint 1 — connector and coupling inventory

Status: **complete**

- [x] Inventory every connector in product UI, routes, provider registries, workers, migrations, tests, and documentation.
- [x] Classify authentication, credential ownership, environment, account discovery, imports, webhooks, reconciliation, disconnect/reconnect, health, capabilities, and onboarding.
- [x] Classify each connector as self-service, founder-assisted reusable, internal-only, fixture-only, placeholder, or unsafe.
- [x] Search for merchant IDs, connection IDs, provider account IDs, domains, ShipBob channels, carrier accounts, singleton/first-row queries, unscoped lookups, merchant tokens in environment variables, global environments, demo fallbacks, and browser-session coupling.
- [x] Record every match as legitimate platform configuration, development-only, fixture, safe fallback, unsafe production coupling, or false positive.
- [x] Create/update the required connector matrix and defect register with inventory evidence.

Evidence:

- `CODE` The modern merchant catalogue contains Shopify, Gorgias, UPS, FedEx, ShipBob, and document upload; a separate compatibility registry and provider-specific routes represent additional legacy, backend-only, placeholder, and manual surfaces.
- `CODE` Shopify/BigCommerce callback state, cross-merchant provider-account claims, provider-level credential uniqueness, ShipBob first-channel selection, provider-level jobs/disconnect, and unscoped reconciliation were reproduced as critical/high defects.
- `CODE` Controlled merchant/account identifiers remain in test/support tooling and a ShipBob deployment-PAT fallback remains in production provider code; both are repair items, not accepted configuration.
- `CODE` Required architecture, matrix, friction-register, and defect-register files now preserve the inventory independently of conversation memory.

## Checkpoint 2 — connection architecture

Status: **complete**

- [x] Validate and repair per-merchant encrypted credential storage.
- [x] Validate connection ownership and source-account uniqueness.
- [x] Validate OAuth state signing, expiry, merchant/user/provider/environment/callback binding, role checks, and replay protection.
- [x] Validate connection-specific sandbox/production environments.
- [x] Validate automatic source-account discovery and explicit selection where several accounts exist.
- [x] Define and enforce provider connection-count policies.
- [x] Add focused regression tests for all repairs.

Evidence:

- `CODE` OAuth transactions now store only a state hash and bind merchant, user, provider, environment, callback, account hint, expiry, and one-time consumption before credentials are exchanged or persisted.
- `CODE` Shopify, BigCommerce, and ShipBob callbacks authorize the exact selected merchant instead of falling back to the caller's highest-role workspace.
- `CODE` Canonical, store, and helpdesk provider-account ownership is claim-safe and backed by uniqueness preflights/constraints; an account owned by Merchant A cannot be reassigned by Merchant B.
- `CODE` Encrypted provider credentials are keyed by connection and protected by a connection/merchant consistency constraint; merchant credentials are no longer deployment environment fallbacks.
- `CODE` ShipBob discovers every channel and requires an explicit, short-lived, one-time account selection when discovery returns more than one channel.
- `CODE` The MVP policy is one active connection per merchant/provider, while retaining disconnected history; disconnect and reconnect target one canonical connection.
- `CODE` Focused Jest suite: 64/64 passed across OAuth replay, selected workspace, ownership, credential scope, ShipBob lifecycle, disconnect, job isolation, reconciliation, mapping, and provider-credential security.
- `CODE` TypeScript passed after the checkpoint repairs. A full local production build also completed successfully (95/95 static pages).

## Checkpoint 3 — processing and data isolation

Status: **complete**

- [x] Validate initial import, incremental sync, retries, cursors, locks, rate limits, reconciliation, and active-job deduplication per merchant and connection.
- [x] Validate webhook routing, signatures, opaque routing identity, unknown/disconnected/revoked handling, replay, ordering, malformed payloads, and scoped idempotency.
- [x] Validate canonical ownership and uniqueness with identical external IDs across Merchant A and Merchant B.
- [x] Validate exact/probable/ambiguous/unmatched/conflicting record matching remains merchant-scoped.
- [x] Validate Shopify → ShipBob → UPS/FedEx normalization and reconciliation without merchant-specific identifiers.
- [x] Add focused regression tests for all repairs.

Evidence:

- `CODE` Sync-job active uniqueness, job lookup, cursor state, credential resolution, and retry execution are connection-scoped; a provider failure for Merchant A no longer stops Merchant B's claimed job.
- `CODE` Reconciliation refuses merchant-only parent lookups and requires a connection or source-account boundary. Identical source external IDs write separate provenance rows for two merchant connections.
- `CODE` Canonical account/order/record/event relationships now use composite merchant foreign keys, preventing a service-role worker from attaching one tenant's child record to another tenant's account or parent.
- `CODE` ShipBob webhook delivery validates an exact active connection and connection-owned secret, enforces timestamp tolerance, uses account/connection-scoped idempotency, hashes missing event IDs, ignores unknown topics, and nudges a current-state reconciliation sync so out-of-order events do not overwrite canonical state directly.
- `CODE` Shopify ignores unknown and revoked stores, scopes customer/order identity to the store connection, and includes the connection in canonical/domain idempotency keys. BigCommerce and WooCommerce backend handlers now apply the same active-store and connection-scoped record policy.
- `FIXTURE` Provider-neutral scenario maps a Shopify order reference to ShipBob fulfillment/shipment records and UPS/FedEx evidence without a merchant/store/carrier literal; repeated order/tracking identifiers remain distinct between Merchant A and Merchant B.
- `CODE` Checkpoint-3 Jest suite: 176/176 passed across Shopify/BigCommerce/WooCommerce/ShipBob webhooks, jobs, retries, ingestion idempotency, canonical mapping, reconciliation, merchant isolation, identity match gating, and the multi-provider scenario.
- `CODE` Supabase linked migration dry-run lists the eight pending migrations in order and performs no writes. Docker is not running, so local database execution remains for the migration checkpoint.

## Checkpoint 4 — authorization and lifecycle

Status: **complete**

- [x] Validate RLS and server authorization for connections, credentials, source data, jobs, webhooks, matching, reports, exceptions, and audits.
- [x] Validate roles and direct-ID manipulation resistance.
- [x] Validate per-connection capabilities, health, setup/readiness, and degraded/revoked states.
- [x] Validate disconnect, reconnect, revocation, and uninstall isolation without duplicates.
- [x] Validate secret-safe code, logs, responses, audit metadata, screenshots, and reports.
- [x] Validate connector extensibility through canonical records/events/capability contracts.
- [x] Add focused regression tests for all repairs.

Evidence:

- `CODE` Credential-bearing connection tables are service-only; canonical connections and jobs are merchant-readable but all mutation remains behind role-checked server routes. A permissive authenticated credential policy that could override the intended deny policy is explicitly removed.
- `CODE` A newly reproduced critical legacy gap is repaired in the pending RLS migration: source orders, customers, fulfilments, disputes, locations, shipments, returns, and exception decisions now enable RLS, allow merchant-member reads, and reserve writes for service-role code.
- `CODE` User-supplied connection IDs are resolved with merchant and provider predicates. Worker job writes, inline claims, webhook follow-up writes, live-verification writes, account lookups, and Shopify dispute parent lookups now include their merchant/connection boundary.
- `FIXTURE` Reconnect of the same merchant/provider account reuses the canonical connection and source-account rows; cross-merchant direct-ID disconnect is rejected and retained source records are untouched.
- `FIXTURE` Merchant A and Merchant B can have different granted scopes and runtime capability availability. Active connections take precedence over newer revoked history, so historical rows cannot drive current readiness or record counts.
- `CODE` Shopify, Gorgias, ShipBob, UPS, and FedEx now have exact-connection live probes. Provider failures persist allowlisted categories only; health responses redact both connection and ingestion detail.
- `CODE` Audit metadata uses an allowlist, OAuth/install/backfill logs emit stable categories, API error responses do not echo provider/database text, and the repository secret scan found only deliberately fake secret-shaped strings in tests.
- `CODE` The legacy ShipBob API-key route is now an alias of the canonical connect implementation, eliminating a duplicated onboarding path that had drifted from the provider authentication model.
- `CODE` Connector adapter-contract, RLS, direct-ID, reconnect, capability, live-health, secret-redaction, job, and lifecycle suite: 106/106 passed across 11 suites. TypeScript passed.
- `CODE` Linked Supabase dry-run succeeded without writes and lists the nine pending migrations in the required order, ending with `20260714206500_sensitive_connection_rls.sql`.

## Checkpoint 5 — Merchant A/B/C and browser/live validation

Status: **in progress**

- [ ] Merchant A: validate controlled Shopify and ShipBob accounts as live evidence only.
- [ ] Merchant B: validate a second controlled account where available or a fully isolated production-shaped fixture connection.
- [ ] Merchant C: validate clean empty onboarding with no prepared source rows or database edits.
- [ ] Test identical IDs, concurrent syncs, webhooks, search, reports, readiness, failures, and permissions across merchants.
- [ ] Walk merchant-ready connectors through connect, discovery, import, refresh, sync, disconnect, and reconnect in the browser.
- [ ] Validate Shopify, ShipBob, UPS, and FedEx end-to-end normalization and reconciliation.
- [ ] Record every unavoidable merchant/founder action in the friction register.
- [ ] Clearly label `LIVE`, `FIXTURE`, and `BLOCKED` evidence.

Evidence:

- `LIVE` Merchant A's canonical Shopify connection passed an exact-connection read probe and exposes 13 imported source orders. The controlled store remains merchant-owned and no store, merchant, or connection identifier is configured as a platform default.
- `LIVE` Merchant A's ShipBob connection passed an exact-connection read probe in its stored sandbox environment. Safari shows the selected account, 81 imported objects, nine recorded scopes, supported read/subscribe capabilities, completed initial and incremental imports, and no active ingestion failures. No token was revealed, copied, generated, or revoked.
- `LIVE` Gorgias is truthfully degraded for Merchant A: the live probe stores only the stable `gorgias_400` category and the integrations screen shows the connection as needing attention without exposing provider response text.
- `LIVE` Safari renders UPS and FedEx as not connected with zero imports and no account-level history. Each reusable connect form requests a merchant-owned client ID, client secret, optional account number, and production/test environment at connection time; neither form is prefilled or coupled to the controlled accounts.
- `FIXTURE` The production-shaped Merchant B scenario proves identical source IDs remain connection/merchant scoped through normalization and reconciliation, with independent scopes, jobs, records, failures, and reconnect state.
- `BLOCKED` A live UPS connection requires the owner to enter the provider-issued secret into the merchant-scoped form. The UPS developer account and Tracking product are present, but no credential was opened or copied.
- `BLOCKED` A live FedEx connection requires an owner login because the developer-portal session has timed out, followed by owner secret entry into the merchant-scoped form. The signed-in FedEx account tab alone is insufficient.
- `LIVE` Vercel production/preview configuration still contains legacy merchant-scoped Gorgias, ShipBob, intake-merchant, and AfterShip variables. Current connector code no longer uses those values as merchant defaults; deletion is deferred until the replacement build is deployed so the serving revision is not broken.
- `LIVE` The first post-migration ShipBob sync exposed MT-023: five fulfilment source records had no canonical fulfilment because same-source parent lookup used the merchant order reference instead of ShipBob's internal order ID. The generic repair now prefers the provider ID for same-source linkage while retaining the merchant reference for cross-provider reconciliation. Two consecutive live reruns completed with stable counts (81 source records, 5 orders, 5 fulfilments, 66 locations, 5 shipments, 0 returns), proving repair and idempotency.

## Checkpoint 6 — quality gates and reports

Status: **in progress**

- [x] Run connector, OAuth, webhook, import/sync, reconciliation, merchant-isolation, RLS, onboarding, typecheck, lint, and production build checks.
- [x] Inspect the full programme diff and scan it for secrets.
- [x] Complete `docs/validation/multi-tenant-connector-architecture.md`.
- [x] Complete `docs/validation/multi-tenant-connector-matrix.md`.
- [ ] Complete `docs/validation/merchant-onboarding-friction-register.md`.
- [ ] Complete `docs/validation/multi-tenant-connector-defect-register.md`.
- [ ] Select exactly one specification-approved final verdict based only on evidence.

Evidence:

- `CODE` Full Jest gate: 277/277 executed suites and 2,065/2,065 executed tests passed; one suite/three tests are intentionally skipped. No test was weakened: the webhook-auth repair added an explicit authenticated malformed-payload setup and retains a separate missing-secret rejection test.
- `CODE` TypeScript, ESLint, `git diff --check`, and the Next.js production build passed. The build compiled the previously failing UI barrel and generated 95/95 static pages.
- `CODE` The changed-file high-confidence secret-pattern scan returned no matches. Merchant identifiers and provider credentials remain confined to explicit test-only tooling or encrypted connection storage; the legacy Vercel variables remain tracked for post-deployment deletion under MT-022.
- `LIVE` Linked migration dry-run passed. The live-data preflight inspected ownership, credential backfill, jobs, future natural keys, and 21 composite tenant-parent relationships with zero conflicts.

## Checkpoint 7 — migration, delivery, and production verification

Status: **pending**

- [x] Apply only safe required migrations and regenerate generated types.
- [ ] Create a focused commit without absorbing unrelated owner changes.
- [ ] Push the validated commit to `main` as requested.
- [ ] Deploy to Vercel production and verify the production commit explicitly.
- [ ] Rerun production multi-merchant browser, sync, webhook, refresh, disconnect, and reconnect checks.
- [ ] Record deployment identifiers and evidence without secrets.
- [ ] Finalize the 28-point report and verdict.

Evidence:

- `LIVE` All nine preflighted connector migrations applied successfully to the linked Supabase project. A second linked dry-run reports the remote database up to date, the post-migration integrity preflight remains zero-conflict, generated database types were refreshed, and TypeScript passed afterward.

## Current blockers

- `LIVE` Vercel deployment `7ARft1Bug` for main commit `a4a4360` failed because `SegmentedControl` was imported but not exported by the committed UI barrel. The missing export/component exists in the current worktree and the current worktree production build passes; delivery remains pending the programme quality gates.
- `BLOCKED` Live UPS validation requires one owner secret-entry step after the safe migration/deployment checkpoints.
- `BLOCKED` Live FedEx validation requires one owner login step because the provider developer session has timed out; secret entry follows only after that login succeeds.

## Next automatic action

Complete migration preflights and the full quality gate, then apply the safe schema changes and deploy the validated main-branch revision before returning to the owner-only UPS/FedEx steps.
