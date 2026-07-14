# Multi-tenant connector architecture validation — final results report

**Programme date:** 2026-07-14 (Europe/London)  
**Report status:** Comprehensive results at the latest completed checkpoint  
**Controlling specification:** Multi-tenant connector architecture and merchant self-service validation  
**Production revision verified:** `559eb092cfa6f58e80f92a068395e09f63fde93c` on `main`  
**Production deployment verified:** `AaHLsRFaZzU7rmdHwbySdnxr3Y7r`  
**Production domain verified:** `unauth-pi.vercel.app`

## Executive summary

The programme replaced several unsafe or incomplete connector boundaries with a reusable, connection-owned architecture. OAuth transactions now bind the intended merchant, user, provider, environment, callback, and account hint; merchant credentials are encrypted per connection; source-account ownership is claim-safe; jobs, imports, webhook delivery, canonical records, reconciliation, health, capabilities, disconnect, and reconnect logic use explicit merchant and connection boundaries.

The repaired code was validated with 2,065 passing tests, ESLint, TypeScript, a successful Next.js production build, live Supabase migration preflights and application of nine migrations, controlled Shopify and ShipBob probes, two idempotent post-repair ShipBob syncs, production-shaped multi-merchant fixtures, Safari walkthroughs, a secret scan, a focused Git delivery, a fast-forward push to `main`, and an explicitly verified Vercel production deployment.

The current result is not yet eligible for either verified verdict. A critical deployment-configuration item remains open until eight obsolete merchant-scoped Vercel variables are deleted from Production and Preview. Clean Merchant C has not completed a provider authorization from an empty state, and the live UPS and FedEx calls require owner login or secret entry. Several repaired critical/high defects therefore remain `fixed-awaiting-validation` rather than `verified`.

## Final verdict

**Multi-tenant merchant connector architecture not verified**

This verdict is deliberately conservative. It does not mean that the repaired design failed its automated or controlled live tests. It means the controlling specification prohibits a verified verdict while a critical item remains open, while clean-new-merchant authorization is incomplete, or while required production lifecycle evidence is outstanding.

## Governing constraints applied

- The architecture specification governed every overlapping decision.
- The current controlled accounts were treated only as Merchant A test inputs.
- No merchant, store, carrier account, ShipBob channel, or connection identifier was added as a platform default.
- No current merchant credential was copied into application-level environment configuration.
- Shared deployment configuration is limited to platform OAuth application credentials and other legitimate platform secrets.
- Normal onboarding must create merchant-owned connection and source-account records; manual database insertion is not an accepted onboarding route.
- Repairs were implemented generically and tested across at least two tenant contexts where verification status is claimed.
- Evidence is labelled `CODE`, `FIXTURE`, `LIVE`, or `BLOCKED`; controlled-account success is not treated as proof of multi-tenant readiness by itself.
- Existing unrelated UI/design changes in the original worktree were preserved and excluded from the focused delivery.
- Browser work used Safari, as requested.

## Evidence model

| Label | Meaning | Examples in this programme |
|---|---|---|
| `CODE` | Repository inspection, migration inspection, static analysis, or automated test | OAuth transaction tests, RLS policies, secret scan, production build |
| `FIXTURE` | Production-shaped storage, authorization, worker, or lifecycle evidence using isolated merchant contexts | Merchant B identical-ID, job, capability, reconnect, and reconciliation scenarios |
| `LIVE` | Controlled provider, linked Supabase, GitHub, Vercel, or production Safari evidence | Shopify read probe, ShipBob sync, applied migrations, production deployment |
| `BLOCKED` | Evidence requires an owner-only login, 2FA, secret entry, approval, or irreversible decision | UPS secret entry, FedEx login and secret entry |

## Programme chronology and checkpoints

### Checkpoint 0 — baseline and preservation

- Read the controlling specification in full.
- Recorded a persistent repository checklist rather than relying on conversation memory.
- Captured the starting branch, HEAD, Vercel linkage, Git remote, toolchain, and dirty-worktree state.
- Identified overlapping pre-existing connector files and treated them as owner work until inspected.
- Preserved the substantial unrelated UI/design work in `/Users/malikibrahim/Downloads/Unauth`.

### Checkpoint 1 — connector and coupling inventory

- Inventoried modern catalogue connectors, legacy settings connectors, backend-only providers, manual sources, placeholders, provider routes, workers, migrations, tests, and documentation.
- Searched for merchant IDs, source-account IDs, connection IDs, provider domains, ShipBob channel selection, singleton queries, unscoped lookups, environment-based merchant tokens, demo fallbacks, and browser-session coupling.
- Classified Shopify, ShipBob, Gorgias, UPS, FedEx, Zendesk, Freshdesk, BigCommerce, WooCommerce, document upload, CSV, API intake, self-fulfilment, Stripe, carrier claims, and stale AfterShip material.
- Created the architecture document, connector matrix, friction register, defect register, and checkpoint checklist.

### Checkpoint 2 — connection architecture

- Introduced protected OAuth transaction state with hashed state storage, expiry, one-time consumption, and exact merchant/user/provider/environment/callback binding.
- Removed default-workspace callback behaviour from Shopify, BigCommerce, and ShipBob.
- Added claim-safe provider-account ownership so one provider account cannot be reassigned to another merchant.
- Made encrypted credentials connection-owned rather than provider-owned or deployment-owned.
- Added explicit ShipBob channel selection when discovery returns more than one channel.
- Defined an MVP policy of one active connection per merchant/provider while retaining disconnected history.

### Checkpoint 3 — processing and data isolation

- Scoped active-job deduplication, job claiming, credential resolution, cursor state, retries, and failure handling to the exact connection.
- Required connection or source-account boundaries for parent lookups and reconciliation.
- Added tenant-consistent composite relationships across the canonical processing graph.
- Hardened webhook routing, signatures, timestamps, unknown/revoked connection handling, idempotency, and current-state reconciliation.
- Verified repeated external IDs can coexist across merchants and connections.
- Added a provider-neutral Shopify → ShipBob → UPS/FedEx scenario without merchant-specific literals.

### Checkpoint 4 — authorization and lifecycle

- Restricted credential-bearing tables to service writes and merchant-scoped reads where appropriate.
- Added missing RLS to legacy canonical connector tables and removed unsafe direct authenticated mutation.
- Scoped direct-ID operations by merchant and provider/connection.
- Made health, capabilities, readiness, history selection, disconnect, reconnect, and revocation connection-aware.
- Replaced raw provider/database error persistence and responses with stable allowlisted categories.
- Unified the legacy ShipBob API-key route with the canonical connection path.

### Checkpoint 5 — controlled live and multi-merchant validation

- Verified Merchant A Shopify with an exact-connection read probe and 13 imported source orders.
- Verified Merchant A ShipBob in its stored sandbox environment with 81 imported source records and completed initial/incremental jobs.
- Recorded Gorgias truthfully as degraded with the stable `gorgias_400` category and no raw provider response.
- Verified reusable, unprefilled UPS and FedEx connect forms in Safari.
- Verified Merchant B with production-shaped isolation fixtures.
- Reproduced and repaired the ShipBob canonical-fulfilment defect, then ran two consecutive idempotent live syncs.
- Did not claim the populated production onboarding session as clean Merchant C evidence.

### Checkpoint 6 — quality gates

- Passed the complete Jest suite on the exact `main`-based delivery: 276 suites and 2,065 tests passed; one suite and three tests were intentionally skipped.
- Passed ESLint and TypeScript.
- Passed a production Next.js build with 95 of 95 static pages generated.
- Passed `git diff --check` and high-confidence changed-file secret scans.
- Verified no high-confidence credential pattern was introduced.

### Checkpoint 7 — migration and delivery

- Ran live-data migration preflights before writes.
- Applied nine ordered connector migrations to the linked Supabase project.
- Regenerated Supabase TypeScript types.
- Repeated the preflight after migration with zero conflicts.
- Created focused commits in a clean worktree based directly on `origin/main`.
- Pushed a clean fast-forward from `a4a43601` to `559eb092` on `main`.
- Verified Vercel deployment `AaHLsRFaZzU7rmdHwbySdnxr3Y7r` reports Ready for branch `main` and commit `559eb092`.

## Required 28-point final report

### 1. Architecture assessment

The implemented architecture is connection-owned and tenant-explicit. A merchant owns a canonical connection; the connection owns provider credentials, environment, provider-account identity, source accounts, sync jobs, webhook routing state, health, capabilities, and audit history. Canonical records preserve merchant and source provenance. This is the correct reusable shape for future merchants, but the programme cannot declare the overall architecture verified until the open production-configuration and clean-onboarding conditions are closed.

### 2. Connectors inspected

Inspected merchant-ready Shopify, ShipBob, Gorgias, UPS, FedEx, document upload, CSV import, and merchant API intake; founder-assisted Zendesk and Freshdesk; backend-present BigCommerce and WooCommerce; the legacy self-fulfilment surface; Stripe and carrier-claims placeholders; and stale AfterShip references. Inspection covered UI, route handlers, registries, workers, migrations, RLS, persistence, normalization, reconciliation, tests, and deployment configuration.

### 3. Hardcoded assumptions found

Findings included controlled-merchant fallbacks in support/E2E tooling, a ShipBob deployment PAT fallback, first-channel selection, provider-level credential uniqueness, merchant/provider-level jobs, merchant-only reconciliation lookups, callback default-workspace resolution, production-capable webhook fallbacks, incomplete lifecycle ranking, raw error propagation, and merchant-scoped Vercel variables. No current merchant identifier or provider account was introduced by the repair.

### 4. Unsafe assumptions removed

Removed controlled-merchant defaults from test/support scripts, removed the ShipBob PAT deployment fallback, removed `PUBLIC_INTAKE_MERCHANT_ID` from application environment resolution, required explicit test-only merchant/case inputs, eliminated first-channel selection, bound callbacks to protected transaction state, made job/reconciliation/disconnect logic connection-specific, and made provider/account ownership claim-safe.

### 5. Platform-versus-merchant credential model

Platform OAuth app credentials may remain shared deployment configuration. Merchant access/refresh tokens, API tokens, client credentials, webhook secrets, selected source accounts, provider environments, and provider account metadata are encrypted and stored against the merchant-owned connection. Current-account credentials are not legitimate application defaults. Eight obsolete Vercel variables remain queued for deletion and keep MT-022 open until removed.

### 6. OAuth merchant-binding result

`CODE` OAuth transactions bind merchant, user, provider, environment, callback, optional account hint, expiry, and one-time consumption. Only the state hash is stored. Shopify, BigCommerce, and ShipBob callbacks authorize the exact selected merchant rather than resolving a default workspace. Replay, expiry, wrong-user, wrong-merchant, wrong-provider, and callback-binding regression cases are covered.

### 7. Environment-isolation result

`CODE` Connection environment is stored and used per connection for ShipBob, UPS, and FedEx. Health, refresh, token exchange, and provider endpoint selection derive from the stored connection. `LIVE` Merchant A ShipBob verified in its stored sandbox environment. Environment isolation is not finally verified for live UPS/FedEx until credentials are entered and both endpoint families are exercised.

### 8. Source-account discovery result

`CODE` Shopify/commerce account identity is claimed safely. ShipBob discovers all channels and requires an explicit, short-lived, one-time selection if several channels are returned. Selected account/channel metadata is persisted with the connection and source account. No store, channel, or provider account is selected from a deployment default.

### 9. Import-job isolation result

`CODE` Active-job uniqueness, lookup, cursor state, credential resolution, retry execution, claiming, and error handling use merchant plus connection boundaries. One failing merchant job does not terminate processing for another merchant. `LIVE` Merchant A ShipBob initial and incremental jobs completed; `FIXTURE` Merchant B job state remained separate.

### 10. Webhook-routing isolation result

`CODE` Shopify and ShipBob resolve an exact active connection, reject unknown/revoked sources, validate provider authentication, scope idempotency to connection/account identity, and avoid global merchant-secret fallbacks. BigCommerce and WooCommerce follow the same active-store and connection-scoped identity rule. Out-of-order ShipBob delivery nudges current-state sync instead of directly overwriting canonical state.

### 11. Canonical-data isolation result

`CODE` Composite merchant-parent constraints prevent service-role writes from combining one tenant's merchant ID with another tenant's connection, source account, parent order, record, ingestion event, or domain event. `FIXTURE` identical external IDs persist as separate records by tenant and connection. The linked preflight found zero tenant-parent conflicts across 21 relationship checks.

### 12. Matching-isolation result

`CODE` Exact, probable, ambiguous, unmatched, and conflicting record matching remains merchant-scoped. Reconciliation refuses merchant-only parent lookups and requires a connection/source account. The provider-neutral scenario reconciles Shopify order references with ShipBob fulfilment/shipment data and carrier evidence while retaining source provenance.

### 13. RLS/server-authorization result

`CODE` Credential tables are service-only. Merchant-readable connection/job/canonical tables are protected by membership-scoped RLS; mutation remains behind role-checked server routes. Legacy source/canonical tables now enable RLS. Direct-ID routes include merchant and provider/connection predicates. A previously permissive credential policy and direct authenticated exception mutation were removed.

### 14. Clean-merchant onboarding result

Not complete. `LIVE` Safari loaded production onboarding, but the signed-in profile was already populated and therefore was not labelled Merchant C. No existing profile was overwritten and no manual connection/source row was inserted. A truly empty merchant must still complete normal profile setup and provider authorization without code or database intervention before a verified verdict is allowed.

### 15. Provider connection-count policy

The MVP permits one active connection per merchant/provider while retaining disconnected history. Connecting another active account is rejected; reconnect reuses the retained canonical identity. Document, CSV, and API-intake sources may have multiple independent batches or keys because they are not singleton provider accounts. The policy and record distinction are documented in the connector matrix.

### 16. Per-merchant capability result

`CODE` Runtime capabilities derive from the selected active connection, granted scopes, provider manifest, environment, and health rather than global provider state. `FIXTURE` Merchant A and Merchant B can have different granted scopes and resulting capabilities. Historical revoked rows cannot override the active connection.

### 17. Per-merchant health/readiness result

`CODE` Shopify, Gorgias, ShipBob, UPS, and FedEx have exact-connection verification paths. Health output is merchant-safe and uses stable categories. `LIVE` Shopify and ShipBob passed; Gorgias is truthfully degraded as `gorgias_400`; UPS and FedEx remain unconnected. Readiness counts use active connection state rather than newer revoked history.

### 18. Disconnect/reconnect result

`CODE` and `FIXTURE` disconnect targets one merchant-owned canonical connection, revokes/deletes only its credentials, preserves retained source history, and rejects cross-merchant direct-ID manipulation. Reconnect reuses the same connection/source-account identity without duplicate rows. Live Merchant A disconnect/reconnect was not performed because it would revoke a working controlled connection and require owner reauthorization.

### 19. Secret/logging result

`CODE` Audit metadata is allowlisted; callbacks, installs, backfills, health, and API errors emit stable categories rather than raw provider/database text. Changed-file secret scans found no high-confidence credential. No provider value was opened, copied, printed, or placed in documentation. `LIVE` Vercel still contains eight obsolete variables; their presence is an open critical configuration defect even though the deployed code no longer reads them.

### 20. Future-connector extensibility result

The adapter contract separates authentication, account discovery, connection persistence, imports, webhook handling, normalization, reconciliation, capabilities, and health. Canonical records/events preserve merchant, connection, source-account, provider, environment, and external identity. New connectors can use these contracts without adding merchant-specific branches or global credentials.

### 21. Live versus fixture tests

`LIVE`: linked Supabase preflight/migrations, exact Shopify probe, exact ShipBob probe, completed ShipBob jobs, two post-repair ShipBob syncs, Gorgias degraded state, UPS/FedEx forms, GitHub `main` push, Vercel production deployment, and production Safari loading.  
`FIXTURE`: Merchant B identical-ID isolation, concurrent job behaviour, capabilities, reconciliation, direct-ID rejection, disconnect/reconnect, webhook routing, and provider-neutral Shopify/ShipBob/carrier normalization.  
`BLOCKED`: clean Merchant C provider authorization, UPS secret entry, FedEx login and secret entry, and live disconnect/reconnect requiring reauthorization.

### 22. Defects fixed

Twenty-three defects were recorded. Verified defects are MT-008, MT-009, MT-014, MT-017, MT-021, and MT-023. MT-015 is an accepted limitation because the affected providers are not represented as merchant-ready. The remaining repaired defects are `fixed-awaiting-validation`, including critical MT-001, MT-003, MT-004, MT-018, MT-019, and MT-022. MT-022 remains materially open until deployment-variable deletion is completed.

The most important live-discovered repair was MT-023. ShipBob fulfilment source records used the provider's internal order ID while canonical parent lookup preferred the merchant order reference. The repair prefers the embedded provider ID for same-source linkage and retains the merchant reference for cross-provider reconciliation. Two consecutive live reruns stabilized at 81 source records, 5 orders, 5 fulfilments, 66 locations, 5 shipments, and 0 returns without duplicates.

### 23. Tests run

| Gate | Result |
|---|---|
| Complete Jest gate on exact main-based delivery | 276 passed suites; 2,065 passed tests; 1 suite/3 tests intentionally skipped |
| Focused OAuth/ownership/credential/discovery suite | 64/64 passed |
| Processing, webhook, job, reconciliation, and matching suite | 176/176 passed |
| Authorization, lifecycle, capability, health, and RLS suite | 106/106 passed |
| Post-repair focused ShipBob suite | 30/30 passed |
| ESLint | Passed |
| TypeScript `tsc --noEmit` | Passed |
| Next.js production build | Passed; 95/95 static pages generated |
| `git diff --check` | Passed for the focused delivery |
| Changed-file secret scan | No high-confidence matches |

### 24. Migrations

Nine ordered migrations were preflighted and applied to the linked Supabase project:

1. `20260714183000`
2. `20260714200000`
3. `20260714201000`
4. `20260714202000`
5. `20260714203000`
6. `20260714204000`
7. `20260714205000`
8. `20260714206000`
9. `20260714206500`

The post-migration linked dry-run reports the remote database up to date. The integrity preflight inspected 13 integrations, 1 credential, 48 jobs, 12 source accounts, 81 source records, 5,748 source orders, future uniqueness constraints, and 21 tenant-parent relationships with zero conflicts. Generated Supabase types were refreshed and TypeScript passed afterward. Database lint still reports pre-existing broken `legacy_v1` functions outside connector scope.

### 25. Deployment result

The original main deployment `7ARft1Bug` for `a4a43601` failed because committed UI consumers referenced missing primitives/contracts. The delivery added the minimal missing `DataTableServer`, `FilterChip`, `SegmentedControl`, barrel exports, and Card API contract required by already-committed consumers. The exact delivery passed local quality gates, then `main` fast-forwarded to `559eb092`.

Vercel deployment `AaHLsRFaZzU7rmdHwbySdnxr3Y7r` explicitly reports Ready, Production, branch `main`, commit `559eb092`, and a 2m26s build. Safari loaded `unauth-pi.vercel.app`. Deployment is therefore verified; final production lifecycle validation is still incomplete.

### 26. Manual steps required from a merchant

- Approve Shopify OAuth in the intended store.
- Approve ShipBob OAuth and select a channel if several are discovered.
- Enter merchant-owned UPS/FedEx client credentials and choose production/test environment.
- Enter merchant-owned Gorgias account/API credentials.
- Reauthorize a provider after a deliberate disconnect or provider-side revocation.
- Complete normal store profile setup for a clean merchant.

These are provider consent or merchant-secret steps. No merchant should supply a merchant ID, connection ID, channel ID, or token to a platform environment variable, and no merchant should require a database insert.

### 27. Manual steps required from an administrator/founder

- Confirm deletion of the eight obsolete Vercel variables after the replacement deployment was verified.
- Provide support only for connectors truthfully classified as founder-assisted (currently Zendesk/Freshdesk) rather than representing them as fully self-service.
- Resolve or explicitly retire legacy `legacy_v1` database functions outside this connector programme.
- Supply commercial/provider app approval where a provider requires it; never supply a merchant's provider credential as platform configuration.

Normal Shopify, ShipBob, Gorgias, UPS, and FedEx onboarding must not require an administrator to insert connection records or change merchant-specific deployment configuration.

### 28. Remaining limitations

1. Critical MT-022 remains open until these Production/Preview Vercel variables are deleted without revealing their values: `AFTERSHIP_API_KEY`, `GORGIAS_API_EMAIL`, `GORGIAS_API_TOKEN`, `GORGIAS_BASE_URL`, `GORGIAS_SUPPORT_WEBHOOK_SECRET`, `PUBLIC_INTAKE_MERCHANT_ID`, `SHIPBOB_PAT`, and `SHIPBOB_SANDBOX`.
2. Clean Merchant C has not completed a provider connection from an empty profile using only normal onboarding.
3. UPS live evidence requires owner entry of the provider-issued secret.
4. FedEx live evidence requires owner login followed by owner credential entry.
5. Live disconnect/reconnect remains pending because it would revoke controlled working connections and require reauthorization.
6. Merchant A Gorgias is degraded with the stable `gorgias_400` result.
7. Zendesk and Freshdesk remain founder-assisted rather than primary-catalogue self-service connectors.
8. BigCommerce and WooCommerce have reusable backend isolation but no normal merchant onboarding surface.
9. Document upload, CSV intake, and Merchant API intake have not received the same live external-provider lifecycle proof.
10. Several critical/high repairs remain `fixed-awaiting-validation` until the remaining production and clean-merchant evidence is completed.

## Detailed implementation results

### OAuth and account ownership

- Added persistent OAuth transactions with state hashing, expiration, one-time atomic consumption, and merchant/user/provider binding.
- Bound install and callback flows to the selected workspace.
- Prevented provider-account ownership transfer through an upsert.
- Added provider-account uniqueness preflights and database enforcement.
- Preserved explicit account hints and environment through the callback.

### Credential storage

- Required `connection_id` for provider credentials.
- Enforced merchant/connection consistency.
- Kept credentials encrypted at rest.
- Removed production merchant-token fallbacks.
- Kept platform OAuth application credentials separate from merchant access credentials.

### Imports, jobs, and retries

- Scoped active-job uniqueness by connection.
- Scoped job claims, updates, and credential lookups by merchant and connection.
- Isolated per-job failures so one merchant cannot stop another merchant's work.
- Preserved cursors and retry state per connection.
- Prevented duplicate active work while retaining completed history.

### Webhooks

- Required exact active connection resolution.
- Rejected unknown, disconnected, and revoked sources.
- Scoped webhook idempotency to account/connection identity.
- Added timestamp tolerance and stable event hashing where provider event IDs are absent.
- Kept webhook failure metadata secret-safe.
- Used reconciliation for out-of-order ShipBob events.

### Canonical data and reconciliation

- Added composite tenant-parent constraints.
- Required source-account or connection boundaries for parent matching.
- Scoped customers, orders, records, ingestion events, and domain events to the exact source connection.
- Preserved identical external IDs across merchants.
- Repaired ShipBob same-source fulfilment parent lookup while retaining cross-provider merchant references.

### Authorization and RLS

- Added merchant-member read policies and service-role write boundaries.
- Removed permissive credential and exception mutation paths.
- Required merchant/provider predicates on direct-ID operations.
- Protected credential, job, source, webhook, matching, exception, report, and audit surfaces.

### Lifecycle, capabilities, and health

- Enforced one active connection per merchant/provider.
- Reused retained identity on reconnect.
- Prevented historical revoked rows from driving current state.
- Derived capabilities from exact active scopes and provider availability.
- Added exact-connection verification for Shopify, Gorgias, ShipBob, UPS, and FedEx.
- Redacted provider error details from merchant-facing health.

## Focused delivery history

| Commit | Purpose |
|---|---|
| `acff6a20` | Reusable multi-tenant connector architecture repairs, migrations, tests, generated types, and validation documentation |
| `59eb0d03` | Minimal committed UI primitive contracts needed by existing main-branch consumers |
| `559eb092` | Persist exact main-based delivery quality evidence |

The delivery was constructed in `/Users/malikibrahim/Downloads/Unauth-main-delivery`, a clean worktree based directly on `origin/main`. The original `/Users/malikibrahim/Downloads/Unauth` worktree and its unrelated owner UI/design changes were not absorbed.

## Evidence files

- `docs/validation/multi-tenant-connector-validation-checklist.md`
- `docs/validation/multi-tenant-connector-architecture.md`
- `docs/validation/multi-tenant-connector-matrix.md`
- `docs/validation/merchant-onboarding-friction-register.md`
- `docs/validation/multi-tenant-connector-defect-register.md`
- `docs/validation/multi-tenant-connector-final-report.md`

## Conditions for changing the verdict

The verdict may advance to **Multi-tenant merchant connector architecture verified with documented limitations** only after all of the following are evidenced:

1. Delete all eight forbidden Vercel variables from Production and Preview and verify production remains healthy.
2. Complete a clean Merchant C connection through normal onboarding with no database edit or merchant-specific deployment change.
3. Verify the callback creates the merchant-owned connection, discovery selects the right account, credentials are encrypted, initial import starts, and refresh retains state.
4. Complete the remaining required production sync/webhook checks and record exact connection routing.
5. Complete or formally scope the controlled disconnect/reconnect proof without duplicates.
6. Resolve every remaining critical/high defect to `verified`, or document why the controlling specification permits it as a limitation.

Full verification additionally requires live evidence for every condition listed by the controlling specification and no remaining material limitation.
