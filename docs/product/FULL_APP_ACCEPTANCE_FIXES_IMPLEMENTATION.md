# Full-App Acceptance Fixes and Closure — Implementation Authority

Status: historical implementation evidence; recorded functional acceptance was **BLOCKED**.  
Historical follow-on: `docs/product/FULL_APP_ACCEPTANCE_REMAINING_CLOSURE_IMPLEMENTATION.md` records the prior remaining queue. Neither document owns current execution.  
Baseline commit: `640739df7f7e2d5ce3d2230c56065012c37516a6`  
Branch at handoff: `codex/deployment-readiness-20260826`  
Acceptance evidence date: `2026-08-30`  
Primary evidence root: `artifacts/full-app-acceptance-2026-08-30/`

Supersession recorded 6 September 2026: use
[GLOBAL_RULES.md](../../GLOBAL_RULES.md) and
[MERCHANT_CLARITY_IMPLEMENTATION.md](MERCHANT_CLARITY_IMPLEMENTATION.md) for all
new work. The historical instructions, mobile/appearance expectations, phase
allow-lists, and completion targets below are preserved evidence only. Safe
fixture methods remain useful when applied through the current contracts.

## 1. Purpose and required outcome

This document is the implementation handoff for every repair and acceptance-closure item identified by the full-app physical pass. It separates:

- confirmed product defects that have already been repaired;
- acceptance-harness defects that still need correction;
- declared product states that are partial or untested and must be activated before deciding whether source repair is needed;
- fixture, environment, provider, billing, and deployed-preview limits that must not be disguised as product passes.

This document does not replace the product, design, surface, navigation, permission, schema, or provider authorities. It translates the current evidence into an executable sequence.

The work is complete only when:

- 65/65 page modules remain accounted for;
- 120/120 stable surfaces remain accounted for;
- all 223 manifest scenarios have independent passing behavioural evidence;
- all 55 aliases plus the root redirect preserve their canonical destinations and declared query policy;
- every runtime-discovered control is owned by an existing manifest surface and passes;
- the final release-browser suite is green on the exact final build;
- no P0, P1, or functional P2 defect remains;
- no serious or critical accessibility violation, unexpected page or console error, permission failure, external destructive action, or truth-model violation remains;
- the documented preview has a separate read-only verdict based on the deployed revision actually reached.

A blocked or untested row prevents a full-pass verdict. Formal UX9 visual acceptance remains separate and still requires two independent scores of at least 9.0 for every owned surface.

## 2. Current result

| Area | Current result | Required closure |
| --- | ---: | --- |
| Page modules | 65/65 mapped | Keep 65/65 |
| Stable surfaces | 120/120 mapped | Keep 120/120 |
| Manifest scenarios | 223/223 mapped | Move all 223 to passed |
| Scenario verdicts | 83 passed, 18 partial, 9 blocked, 112 untested | 222 passed |
| Route patterns | 60/60 passed | Preserve |
| Aliases and root | 56/56 passed | Preserve |
| Role browser pass | 4/4 canonical roles passed | Expand delegated permission profiles and full surface matrix |
| Declared overlays | 9 passed, 11 partial, 9 blocked, 2 untested | 31 passed or retain an explicit non-pass verdict |
| Jest | 411 suites passed, 2 skipped; 2,915 tests passed, 6 skipped | Green after every batch |
| Production build | Passed; 105 static pages | Green on final exact build |
| Release browser | 102/103; timing-sensitive performance gate failed | 103/103 on final exact build |
| Local verdict | Blocked | Pass only after all rows close |
| Deployed verdict | Blocked by Vercel protection | Read-only validation of reachable deployed revision |

The current local evidence has no unresolved P0, P1, or established functional P2 source defect. The non-pass scenario count is primarily missing or incomplete evidence. Test the state first; repair production code only after a reproducible product failure is observed.

## 3. Canonical authority and precedence

Use this order whenever two sources appear to conflict:

1. `PRODUCT.md` owns product purpose, evidence, money, permission, mutation, audit, tenancy, billing, and provider truth.
2. `lib/surfaces/manifest.ts` owns page modules, surface ownership, scenario IDs, kinds, routes, states, overlays, and coverage.
3. `lib/navigation/appRoutes.ts`, `lib/navigation/aliases.js`, and `next.config.js` own canonical navigation and compatibility redirects.
4. `DESIGN.md` records the supplied visual package and its interaction,
   accessibility, viewport, and component boundary. This acceptance document
   does not own or preserve a theme, shell, style system, or visual renderer.
5. Existing accepted behavioural tests own established implementation contracts.
6. `artifacts/full-app-acceptance-2026-08-30/acceptance-ledger.json` and its evidence files record the current acceptance snapshot; they do not redefine product scope.
7. This document sequences repairs and evidence closure; it does not create a parallel route, scenario registry, or visual render path.

The executable manifest currently verifies 223 scenarios. Treat the manifest verifier as the count authority and keep the prose count aligned after the scenario ledger is stable. `.impeccable/design.json` records the supplied package and must not describe a competing system.

## 4. Non-negotiable product truth

Every implementation and test must preserve these distinctions:

- unknown, unavailable, partial, stale, mixed-currency, available, and verified zero;
- source fact, evidence gap, recommendation, merchant decision, provider action, and audit history;
- expected recovery, filed recovery, provider acceptance, received credit, matched credit, reconciled money, reversal, and write-off;
- provider catalogue support, merchant configuration, credential state, connection health, freshness, returned proof, and action capability;
- integer minor units, currency, period, timezone, source, freshness, comparison scope, and reconciliation scope;
- role defaults, delegated permissions, tenant membership, and action-specific permission checks.

Recommendations must never become merchant decisions. Provider acceptance must never be presented as received, matched, or reconciled money. Missing or unavailable values must never become zero. Reversals and write-offs append new records and retain the original ledger event.

## 5. Safety and repository boundary

Preserve the existing dirty worktree. In particular, `docs/product/CLAUDE_CODE_UI_UX_REBUILD_CONTEXT.md` was already untracked before the acceptance work and belongs to the user.

Do not reset, stash, clean, broadly format, commit, push, deploy, migrate a remote database, contact a provider, send real email, change billing, or mutate the protected preview. Do not alter tests, thresholds, the manifest, or product copy merely to hide a failure.

Allowed mutation boundary:

- disposable loopback Supabase data only;
- synthetic `.invalid` accounts only;
- reversible or disposable local workflow mutations only;
- preview validation is read-only;
- external actions stop at the truthful review or assisted-handoff boundary.

If a defect requires a public route, API contract, database migration, real provider, billing provider, email delivery, or deployed-environment change, record it as blocked and request separate authority.

## 6. Confirmed product repairs already implemented

Do not rewrite these fixes unless a regression proves the current implementation is insufficient.

### FIX-001 — Cases preview dismissal

Problem: closing a URL-selected case preview left the server prop unchanged, so the selection effect immediately reopened the same case.

Implementation:

- `app/(app)/cases/ClaimsQueueClient.tsx` treats URL selection as an initial hint;
- it adopts a new URL selection only when the incoming selection changes;
- explicit dismissal clears `selected` and remains dismissed;
- filtered-row continuity still selects the first remaining case when appropriate.

Regression:

- `tests/components/claimsQueueSelection.test.tsx` covers dismissal of an initial URL selection;
- Chromium evidence: `physical/fix-case-close-confirmed.png`.

Status: implemented and physically retested.

### FIX-002 — Work inspector dismissal

Problem: closing the Work inspector cleared local state but retained the URL selection and triggered the first-item fallback, reopening the inspector.

Implementation:

- `components/work/WorkQueueOperations.tsx` records explicit dismissal;
- it removes `selected` with `history.replaceState`;
- it suppresses the no-query fallback for the corresponding dismissal cycle;
- selecting a new row resets the dismissal marker.

Regression:

- `tests/components/workQueueResultModel.test.tsx` covers URL clearing and the empty inspector state;
- Chromium evidence: `physical/fix-work-close-confirmed.png`.

Status: implemented and physically retested.

### FIX-003 — CSV URL-backed step synchronisation

Problem: Next client navigation changed `?step=upload`, but the mounted CSV client retained the history view until a hard refresh.

Implementation:

- `components/imports/CanonicalCsvImportClient.tsx` mirrors valid `initialStep` prop changes;
- it does not pretend that browser-selected files or mappings survive URL navigation;
- it shows a continuity notice when a non-upload step cannot restore the local file.

Regression:

- `tests/components/canonicalCsvImportClient.test.tsx` covers in-place query navigation;
- Chromium evidence: `physical/fix-csv-step-confirmed.png`.

Status: implemented and physically retested.

## 7. Acceptance-harness fixes required first

These are real implementation defects or incompletenesses in the new acceptance tooling. Complete them before using the ledger as final acceptance evidence.

### HAR-001 — Correct roles versus personas

Current issue: `scripts/generate-full-acceptance-ledger.ts` emits `owner`, `administrator`, `analyst`, `viewer`, `finance`, and `support` as roles. The canonical database roles are exactly `owner`, `admin`, `analyst`, and `viewer`. Finance and support are merchant personas or delegated-permission profiles, not `member_role` values.

Required implementation:

- import the canonical `Role` and permission types from `lib/permissions/roles.ts` and `lib/permissions/constants.ts`;
- emit `rolesToExercise: Role[]` using `owner`, `admin`, `analyst`, and `viewer` only;
- add a separate `permissionProfiles` or `personas` field for finance/support workflows;
- model a persona as a canonical role plus explicit delegated permission grants;
- update `scripts/run-role-browser-acceptance.mjs` to test the four roles and any relevant delegated profiles without adding database enum values;
- regenerate the ledger and role receipt.

Acceptance:

- no generated row names a non-existent database role;
- every permission-sensitive action is checked both allowed and denied;
- route visibility, control visibility, API enforcement, and persisted audit denial agree.

### HAR-002 — Remove the hard-coded role password

Current issue: the role prepare and browser scripts fall back to the static password `release-role-browser-only`, while the receipt states that the password is held only in the runner environment.

Required implementation:

- require `RELEASE_ROLE_PASSWORD` or generate a high-entropy per-run password in a guarded local orchestrator;
- never write the raw password to a receipt, screenshot, trace, console, or committed file;
- fail closed if the variable is absent when scripts are run independently;
- keep all account emails under `example.invalid`.

Owned files:

- `scripts/prepare-role-acceptance.mjs`;
- `scripts/run-role-browser-acceptance.mjs`;
- any new local-only orchestrator under `scripts/acceptance/`.

### HAR-003 — Restore the exact role-fixture pre-state

Current issue: cleanup removed the three non-owner accounts but retained the synthetic owner because the database enforces exactly one active owner. The receipt is truthful, but this is not full fixture restoration.

Required implementation:

- snapshot the exact pre-run merchant membership and owner state before mutation;
- prefer a dedicated disposable merchant whose whole lifecycle can be created and removed locally;
- otherwise restore the original owner atomically before deleting the synthetic owner;
- verify membership count, role, user linkage, and active-owner invariant after cleanup;
- retain a before/after fingerprint in the cleanup receipt;
- refuse cleanup if the fixture marker, merchant ID, or pre-state fingerprint does not match.

Owned files:

- `scripts/prepare-role-acceptance.mjs`;
- `scripts/cleanup-role-acceptance.mjs`;
- `artifacts/.../role-fixture.json` and `role-fixture-cleanup.json` schemas.

Acceptance: no synthetic acceptance account or membership remains unless the frozen pre-state already contained it.

### HAR-004 — Make evidence independent and internally consistent

Current issues:

- a route screenshot must not stand in for a separately declared loading, error, not-found, forbidden, empty, or overlay state;
- `physical/interactions.json` says direct recommendation read-back is unavailable in one summary while its mutation receipt records six immutable snapshot rows;
- generic evidence paths can make a scenario look covered without proving its exact activation recipe.

Required implementation:

- give every scenario its own evidence directory or exact evidence files;
- require a scenario receipt containing activation, viewport, theme, role/profile, final URL, console errors, page errors, failed requests, screenshot or trace, mutation receipt, cleanup, and verdict;
- reject a passing state or overlay row whose evidence is only the owning route capture;
- reconcile the recommendation-readback wording with the six-row local receipt;
- validate that every non-untested row has existing files and that every passing row proves its declared kind;
- leave `baseline.json` frozen.

Owned files:

- `scripts/generate-full-acceptance-ledger.ts`;
- `scripts/generate-physical-evidence-index.mjs`;
- a new validator such as `scripts/verify-full-acceptance-evidence.mjs`;
- generated evidence files only under the ignored timestamped artifact root.

### HAR-005 — Make the local acceptance build reproducible

Current issue: the successful production build required loopback Supabase public variables at build time and was produced with an ad hoc environment wrapper.

Required implementation:

- add `scripts/build-local-acceptance.mjs` with the same fail-closed loopback checks as `start-local-acceptance.mjs`;
- obtain local Supabase values from `supabase status -o env` without printing secrets;
- inject only the exact build variables required by the current app;
- record commit, dirty-tree fingerprint, build ID, manifest hashes, Node/Next versions, and redacted endpoint in an environment receipt;
- expose `npm run build:acceptance`;
- refuse non-loopback Supabase or non-local app origins.

Do not change font configuration to mask sandbox DNS. Record an un-escalated Google Fonts failure as network availability and use the approved equivalent build environment.

### HAR-006 — Resolve or conclusively classify the release-browser timing gate

Current evidence: the post-repair run passed 102/103. Sidebar navigation p75 was 4,148 ms against a 4,000 ms limit; a separate retry stalled on the Loss ledger loading state. Earlier equivalent runs passed 103/103.

Required sequence:

1. Rebuild once with `build:acceptance` and reuse that exact build.
2. Warm every measured route using the same fixture and server process.
3. Record per-route server logs, client navigation timing, RSC request timing, Supabase query timing, CPU/memory pressure, and whether compilation occurred.
4. Reproduce the failure on three controlled attempts before changing product code.
5. If it is environment-only, make the harness eliminate cold-start/contended-run noise and retain the production thresholds.
6. If `/financials/losses` or another route is the repeatable source, repair the smallest loader/query/render bottleneck and add a route-specific regression.
7. Never raise, remove, skip, or soften the `<4,000 ms` p75 and `<8,000 ms` maximum gates merely to obtain green output.

Initial investigative allow-list:

- `tests/current/release-performance.spec.ts`;
- `scripts/run-local-release-browser.mjs`;
- `scripts/start-local-acceptance.mjs`;
- `app/(app)/financials/losses/page.tsx` and its directly imported loaders/components;
- `components/navigation/AuthenticatedSidebar.tsx` and direct navigation helpers.

Acceptance: one complete final run passes 103/103 on the exact final build with no unexpected page errors. Diagnostic retries are evidence, not substitutes for the final run.

### HAR-007 — Reconcile the documented scenario count

After all manifest-derived tooling is stable, keep the prose count in `DESIGN.md` aligned with the current verified 223 scenarios. Do not edit manifest IDs to match an old prose count. `.impeccable/design.json` records the supplied package and must not describe a competing system.

## 8. Scenario-led implementation model

The manifest remains the only scenario registry. Scenario-led tests may derive a typed runtime model from it, but must not duplicate IDs or routes by hand.

Each executed row must retain:

- manifest scenario ID and owning surface;
- merchant goal and expected behaviour;
- canonical route, dynamic fixture ID, and query state;
- canonical role plus delegated permission profile where applicable;
- data dependencies and deterministic activation recipe;
- state or overlay kind;
- viewport, theme, reduced-motion, zoom, and text-scale context;
- mutation boundary, pre-state, request, visible result, persisted read-back, audit consequence, idempotency, and cleanup;
- screenshot, trace, console, page-error, failed-request, and environment paths;
- one verdict: passed, partial, blocked, or untested;
- a blocker category separate from product severity.

Recommended scenario-led Playwright files:

- `tests/current/full-app-shared-states.spec.ts`;
- `tests/current/full-app-p02-operations.spec.ts`;
- `tests/current/full-app-p03-financials.spec.ts`;
- `tests/current/full-app-p04-controls.spec.ts`;
- `tests/current/full-app-p05-sources.spec.ts`;
- `tests/current/full-app-p06-settings.spec.ts`;
- `tests/current/full-app-p07-entry.spec.ts`;
- `tests/current/full-app-cross-cutting.spec.ts`.

These specs must select scenarios from the manifest-derived model. They must not carry a second list of canonical routes.

## 9. Deterministic state activation

Use these techniques in order:

1. Existing checked-in or locally seeded data state.
2. A disposable local fixture created through existing APIs or tables.
3. Browser-level network delay or exact request failure for loading/retry behaviour.
4. A guarded local-only failure injector only when a server-rendered state cannot otherwise be reached.

Any failure injector must:

- require `RELEASE_E2E_LOCAL=1`;
- require a loopback app origin and loopback Supabase;
- accept only manifest scenario IDs;
- be inert in preview, staging, production, and ordinary local development;
- never weaken authentication, tenancy, permissions, or external-action guards;
- live under an internal testing boundary rather than a public route or query contract.

State-specific requirements:

- Loading: capture reserved final geometry before settlement, then prove settlement.
- Empty: prove the query succeeded and returned no rows; do not use a failed request.
- Unavailable: show why the capability or source is unavailable and preserve unknown values.
- Partial/stale: show freshness and missing scope without implying completion.
- Verified zero: prove the scoped query completed and distinguish it from unavailable.
- Mixed currency: keep currencies separated; never silently sum.
- Forbidden: prove the control is absent or disabled and the server/API independently denies the action.
- Error/retry: preserve route/query context, retry successfully, and avoid data mutation before retry.
- Not found: use a well-formed unknown identifier and retain a safe return path.
- Overlay: independently open, keyboard traverse, test focus trap/return, Escape, outside-click policy, pending dismissal, validation, success/error, and audit consequence.

## 10. Implementation packets

Execute these packets in order. Freeze evidence after each packet and stop if the packet introduces a contract, schema, or provider requirement outside the approved boundary.

### FAA-0 — Harness correctness and stable build

Scope: HAR-001 through HAR-007.

Exit criteria:

- canonical roles and delegated profiles are modelled correctly;
- role fixtures restore their exact pre-state;
- no password is hard-coded or logged;
- state evidence cannot be satisfied by route-only proof;
- the local acceptance build is reproducible;
- the release-performance failure is either repaired or truthfully retained as blocked;
- the ledger regenerates without count drift or broken evidence paths.

### FAA-1 — Shared loading, not-found, and error boundaries

Owned implementation:

- `app/(app)/loading.tsx`;
- `app/(app)/not-found.tsx`;
- `app/global-error.tsx`;
- route-level `loading.tsx`, `error.tsx`, and `not-found.tsx` files selected by the manifest row;
- `components/states/OperationalRouteError.tsx`;
- `components/system/RouteReadinessBoundary.tsx`;
- `components/navigation/skeletons/LoadingRecovery.tsx`.

Required scenarios:

- `authenticated-route-loading-shell`;
- `authenticated-not-found`;
- `route-error-boundaries`;
- `root-global-error`.

Exit criteria: each state has independent light/dark and supported-width evidence, retry or return behaviour, preserved context, no unexpected exception, and no production-only test hook.

### FAA-2 — P02 operational work, cases, customers, and connected records

Primary page-module allow-list:

- `app/(app)/overview/page.tsx`;
- `app/(app)/work/page.tsx`;
- `app/(app)/cases/page.tsx`;
- `app/(app)/cases/[caseId]/page.tsx`;
- `app/(app)/customers/page.tsx`;
- `app/(app)/customers/[id]/page.tsx`;
- `app/(app)/customers/[id]/evidence/new/page.tsx`;
- the existing order, refund, return, shipment, ticket, and dispute detail page modules listed in the ledger.

Required work:

- close all empty, search, loading, error, forbidden, and not-found states;
- independently exercise URL filters, selection, history, refresh, pagination, sorting, keyboard shortcuts, and safe-return links;
- complete local decision/reversal, investigation, responsibility, delivery-photo, evidence-package, and customer-note workflows where existing backend support permits;
- verify owner/admin/analyst/viewer plus relevant delegated finance/support permission profiles;
- verify every submitted mutation, audit consequence, idempotency, and cleanup.

Exit criteria: all 35 non-pass P02 IDs in Appendix A pass; no recommendation, investigation finding, merchant decision, provider action, or case financial consequence is conflated.

### FAA-3 — P03 financial operations and reports

Primary page-module allow-list:

- `app/(app)/financials/losses/page.tsx`;
- `app/(app)/financials/losses/[lossId]/page.tsx`;
- `app/(app)/financials/recovery/page.tsx`;
- `app/(app)/financials/recovery/[recoveryId]/page.tsx`;
- `app/(app)/financials/reconciliation/page.tsx`;
- `app/(app)/financials/reports/page.tsx`;
- `app/(app)/financials/reports/records/page.tsx`;
- `app/(app)/financials/reports/[reportId]/page.tsx`.

Required work:

- activate unavailable, empty, loading, error, and not-found states;
- verify range, timezone, currency, comparison, source, freshness, and query preservation;
- run local write-off, reversal, recovery-action, and reconciliation-resolution paths only against disposable records;
- verify append-only entries, original-event retention, matching state, idempotency, and read-back;
- keep provider approval, received credit, matched credit, and reconciled money separate;
- close named-report unavailable/not-found/error and supporting-record empty/error states.

Exit criteria: all 20 non-pass P03 IDs in Appendix A pass and the final performance budget is green.

### FAA-4 — P04 rules, flows, simulations, and runs

Primary page-module allow-list:

- `app/(app)/controls/rules/page.tsx`;
- `app/(app)/controls/rules/recovery/page.tsx`;
- `app/(app)/controls/rules/[ruleId]/page.tsx`;
- `app/(app)/controls/flows/page.tsx`;
- `app/(app)/controls/flows/[flowId]/page.tsx`;
- `app/(app)/controls/flows/runs/page.tsx`;
- `app/(app)/controls/flows/runs/[runId]/page.tsx`.

Required work:

- seed empty, failed, not-found, draft, published, superseded, and run-payload states;
- validate rule/flow builders, validation, dry test, error, publication review, and version history;
- prove dry tests produce zero writes;
- prove publication creates the documented local audit/version consequence without contacting providers;
- inspect flow-run payloads with sensitive-field and permission boundaries intact.

Exit criteria: all 18 non-pass P04 IDs in Appendix A pass.

### FAA-5 — P05 sources, provider setup, and CSV imports

Primary page-module allow-list:

- `app/(app)/sources/connected/page.tsx`;
- `app/(app)/sources/browse/page.tsx`;
- `app/(app)/sources/imports/page.tsx`;
- `app/(app)/sources/imports/[jobId]/page.tsx`;
- `app/(app)/sources/[sourceId]/page.tsx`;
- `app/(app)/sources/setup/[providerId]/page.tsx`;
- `app/(app)/sources/setup/shipbob/select/page.tsx`.

Required work:

- independently prove source empty/no-results/loading/error/not-found states;
- prove connection capability, credential state, health, freshness, returned data, and action support separately;
- use a local synthetic connector for connect/disconnect consequences; never call a real OAuth or provider endpoint;
- complete replace-file confirmation and retained import-job states;
- test CSV malformed bytes, headers, mapping, row errors, duplicates, currency, validation, commit, retry, idempotency, persisted job read-back, and cleanup;
- prove client-side step history and reload behaviour.

Exit criteria: all 17 non-pass P05 IDs in Appendix A pass. A correct assisted OAuth handoff can pass without provider contact only if the UI stops truthfully before external execution.

### FAA-6 — P06 settings, team, governance, privacy, agreements, and billing

Primary page-module allow-list:

- `app/(app)/settings/workspace/account/page.tsx`;
- `app/(app)/settings/workspace/team/page.tsx`;
- `app/(app)/settings/product/platform/page.tsx`;
- `app/(app)/settings/product/notifications/page.tsx`;
- `app/(app)/settings/developers/api-access/page.tsx`;
- `app/(app)/settings/governance/audit-trail/page.tsx`;
- `app/(app)/settings/legal/data-privacy/page.tsx`;
- `app/(app)/settings/legal/agreements/page.tsx`;
- `app/(app)/settings/billing/page.tsx`.

Required work:

- close error, empty, unavailable, forbidden, save-pending, success, and retry states;
- test team invite, role change, removal, and ownership transfer against disposable local accounts;
- seed and inspect a real local append-only audit event;
- execute customer erasure and workspace deletion only on purpose-created disposable data, with pre/post fingerprints and completion receipts;
- validate agreement file type/size/content, upload review, persistence, and removal locally;
- test API-key and billing overlays only if existing product/backend contracts support a local provider-free path;
- otherwise retain the scenario as a contract/capability blocker and request separate authority rather than inventing support.

Exit criteria: all 18 non-pass P06 IDs in Appendix A pass or the full-app verdict remains blocked.

### FAA-7 — P07 public, auth, onboarding, notifications, search, help, and legal

Primary page-module allow-list:

- `app/(public)/demo/page.tsx`;
- `app/(public)/signup/page.tsx`;
- `app/(public)/legal/data-handling/page.tsx`;
- `app/(auth)/login/page.tsx`;
- `app/(auth)/reset/page.tsx`;
- `app/(auth)/reset/update/page.tsx`;
- `app/onboarding/page.tsx`;
- `app/(app)/notifications/page.tsx`;
- `app/(app)/search/page.tsx`;
- `app/(app)/help/page.tsx`;
- `app/(app)/help/[articleSlug]/page.tsx`.

Required work:

- prove public/auth/onboarding surfaces at 390×844 and 1440×900 in permanent light mode;
- test submitting, validation, invalid-session, sent, success, loading, error, refresh, and safe-return states without sending real email;
- complete disposable signup/onboarding using loopback auth only;
- keep proposed plan query state separate from confirmed billing/subscription state;
- activate notification empty/loading/error and permission variants;
- activate search empty/no-results/partial/error/permission variants without treating unavailable search as zero results;
- test help empty/error/unknown article and legal error/print/long-content behaviour.

Exit criteria: all 27 non-pass P07 IDs in Appendix A pass.

### FAA-8 — Cross-cutting interaction, viewport, theme, and accessibility closure

Run for every affected family after FAA-1 through FAA-7:

- authenticated light and authenticated dark;
- 1440×900 and 1024×900 authenticated layouts;
- below-1024 authenticated desktop-required boundary;
- 390×844 public/auth/onboarding layouts;
- 200% browser zoom and text scaling;
- reduced motion;
- keyboard-only traversal, visible focus, focus trap/return, Escape, outside-click policy, and pending-dismissal protection;
- automated accessibility scan plus manual name/role/value and reading-order review;
- console errors, page exceptions, failed requests, and unexpected redirects;
- back/forward, refresh, deep link, URL query, pagination, selection, sorting, and safe-return continuity.

Do not count one viewport, theme, or unopened overlay as proof of another.

### FAA-9 — Read-only deployed-preview validation

Target: the documented Vercel preview in `physical/preview.json`.

Required sequence:

1. Confirm the expected deployed commit or build metadata where the platform exposes it.
2. Use only an existing approved session; do not bypass deployment protection.
3. Test public, demo, legal, alias, query, and any already-accessible authenticated routes read-only.
4. Record final URL, protection/auth status, revision, viewport, screenshot, console/page errors, and failed requests.
5. Do not sign up, reset credentials, connect providers, invite users, change billing, submit workflows, or mutate preview data.

If protection, authentication, revision mismatch, or provider availability prevents the test, the deployed verdict remains blocked. Local evidence must not be substituted.

### FAA-10 — Final regeneration and regression

After the final UI change:

1. Run the Impeccable detector once over every changed UI target and verify each finding in context.
2. Regenerate the physical evidence index and acceptance ledger.
3. Run the evidence validator and require 223 passing rows.
4. Run all static gates, Jest, production build, role/profile browser checks, aliases, and the full 103-test release-browser suite.
5. Perform one final in-app Chromium confirmation pass over every changed surface family.
6. Produce separate local, deployed, and final functional verdicts.

Do not claim UX9 visual acceptance from this work.

## 11. Non-pass overlay closure matrix

| Scenario | Current | Safe local closure or hard stop |
| --- | --- | --- |
| `confirm-recovery-action-modal` | Partial | Submit against a disposable recovery; verify append-only consequence and cleanup. |
| `reconciliation-resolution-drawer` | Partial | Resolve a disposable exception; verify match/reconciliation state and audit history. |
| `new-flow-draft-modal` | Partial | Create and remove a local draft; verify validation and persisted read-back. |
| `connection-and-disconnection-modals` | Partial | Use a synthetic local connection; never call a real provider. |
| `record-or-reverse-merchant-decision-modals` | Partial | Record and reverse a disposable decision; retain both append-only events. |
| `write-off-outstanding-recovery-modal` | Partial | Write off a disposable recovery; retain original expected/received records. |
| `flow-edit-test-and-publication-modals` | Partial | Dry test with zero writes; publish only locally if the existing contract supports it. |
| `connect-shopify-modal` | Partial | Validate review/cancel/handoff truth; do not follow or complete real OAuth. |
| `invite-member-and-transfer-ownership-modals` | Partial | Use `.invalid` local accounts and restore exact owner/member pre-state. |
| `data-erasure-and-account-deletion-modals` | Partial | Execute only on purpose-created disposable customer/workspace data. |
| `agreement-upload-and-review-overlays` | Partial | Use a synthetic local document and remove it after persisted read-back. |
| `replace-import-file-confirmation` | Blocked | Seed a retained mapped job/file locally; stop if no existing replacement contract exists. |
| `investigation-request-modal` | Blocked | Seed a local case eligible for investigation; no provider/customer contact. |
| `investigation-response-modal` | Blocked | Seed a local investigation response; verify provenance and append-only history. |
| `investigation-lifecycle-action-modal` | Blocked | Exercise local transition guards and idempotency; stop if schema/provider change is required. |
| `recovery-detail-action-modal` | Blocked | Use a disposable recovery with an existing local action path; do not submit externally. |
| `rule-simulation-and-publication-modals` | Blocked | Seed a versioned rule; simulate with zero writes and publish only within existing local contracts. |
| `create-reveal-and-revoke-api-key-modals` | Blocked | Test only if current backend capability exists locally; never invent enterprise availability. |
| `audit-event-detail-drawer` | Blocked | Seed a local audit event through a real local mutation, then inspect it read-only. |
| `billing-plan-change-modal` | Blocked | Use only an existing local/test-provider contract; otherwise retain blocked. |
| `delivery-photo-finding-modal` | Untested | Seed delivery evidence and record a local finding without provider action. |
| `flow-run-payload-inspector` | Untested | Seed a completed/failed flow run and verify redaction, permissions, and payload provenance. |

## 12. Mutation evidence contract

Every submitted local mutation must produce one receipt with:

1. scenario ID, merchant ID, actor ID, canonical role, and delegated grants;
2. exact pre-state fingerprint;
3. request method, path, idempotency key, and redacted payload;
4. visible pending, success, validation, or error result;
5. persisted read-back from the canonical table or API;
6. append-only audit/version/ledger consequence;
7. proof that no provider, email, billing, or preview action occurred;
8. replay/idempotency result where applicable;
9. exact cleanup action;
10. post-cleanup fingerprint equal to the pre-state or an explicit invariant-preserving exception.

An opened confirmation modal is not mutation proof. A successful API response without persisted read-back is not mutation proof. A local provider emulator is not live-provider proof.

## 13. Verification order

Run focused checks after each packet, then use this final order. Generate one high-entropy `RELEASE_ROLE_PASSWORD` for the local run and provide it to the prepare, server, and role-browser processes without writing it to disk.

Static, build, and fixture preparation:

```bash
npm run verify:surface-manifest
npm run verify:authority
npm run verify:env
npm run verify:vercel
npm run verify:ui-integrity
npm run verify:merchant-copy
npm run typecheck:scripts
npm run typecheck:e2e
npm run lint
npm test -- --runInBand
npm run build:acceptance
npm run prepare:role-acceptance
```

Start the role-acceptance server in a dedicated terminal and keep it running:

```bash
npm run start:acceptance -- --host ::1 --port 3019
```

In a second terminal, run the role and alias checks against that server, then stop the server cleanly:

```bash
ROLE_ACCEPTANCE_BASE_URL='http://[::1]:3019' npm run test:role-acceptance
ROLE_ACCEPTANCE_BASE_URL='http://[::1]:3019' npm run test:alias-acceptance
```

The release-browser runner owns its isolated server on its configured port. Run it only after the role server has stopped:

```bash
npm run test:release-browser:local -- --reuse-build
npm run acceptance:physical-index
npm run acceptance:map
npm run verify:full-acceptance-evidence
npm run cleanup:role-acceptance
git diff --check
```

`build:acceptance` and `verify:full-acceptance-evidence` are required deliverables from FAA-0 and do not exist at the handoff baseline. Do not start the final sequence until they are implemented.

## 14. Final deliverables

Keep all runtime artifacts under a new ignored timestamped acceptance directory. Deliver:

- generated 223-row acceptance ledger;
- per-scenario evidence and activation receipts;
- role and delegated-permission matrix;
- alias/root redirect receipt;
- local mutation and cleanup receipts;
- console, page-error, failed-request, screenshot, and trace evidence;
- prioritised defect report with product/environment/fixture/access classification;
- repair log and focused/full regression evidence;
- exact build/environment receipt;
- read-only deployed-preview receipt;
- local verdict, deployed verdict, and final functional verdict.

The existing `artifacts/full-app-acceptance-2026-08-30/baseline.json` stays immutable.

## 15. Hard stops

Stop and request separate authority if any required closure needs:

- a public route or API contract change;
- a database schema or remote migration;
- a real provider request or OAuth completion;
- real email or user contact;
- billing or subscription mutation;
- deployed preview mutation or deployment;
- deletion of non-disposable merchant data;
- a change to money, permission, tenancy, audit, or provider semantics;
- a manifest edit whose purpose is to remove a failing scenario rather than correct genuine ownership.

## Appendix A — Exact remaining scenario IDs

These are the 139 rows that were not passed at the handoff baseline. Statuses are snapshot facts, not permission to weaken the scenario.

### Shared — 4

- `authenticated-route-loading-shell` — untested
- `authenticated-not-found` — untested
- `route-error-boundaries` — untested
- `root-global-error` — untested

### P02 operations — 35

- `overview-unavailable-and-no-work-states` — partial
- `overview-dashboard-loading` — untested
- `overview-error` — untested
- `saved-work-views` — partial
- `work-empty-search-states` — partial
- `operational-list-board-loading-skeleton` — untested
- `work-error` — untested
- `cases-empty-filter-states` — partial
- `cases-registry-loading` — untested
- `cases-error` — untested
- `customers-empty-filter-states` — partial
- `customers-registry-loading` — untested
- `customers-error` — untested
- `operational-detail-loading-skeleton` — untested
- `case-error` — untested
- `record-or-reverse-merchant-decision-modals` — partial
- `investigation-request-modal` — blocked
- `investigation-response-modal` — blocked
- `investigation-lifecycle-action-modal` — blocked
- `delivery-photo-finding-modal` — untested
- `customer-profile-access-blocked-state` — untested
- `customer-not-found` — untested
- `customer-error` — untested
- `evidence-package-no-orders-no-cases-states` — untested
- `evidence-package-builder-loading` — untested
- `evidence-package-error` — untested
- `connected-record-not-found` — untested
- `commerce-object-loading` — untested
- `order-error` — untested
- `refund-error` — untested
- `return-error` — untested
- `shipment-error` — untested
- `support-object-loading` — untested
- `ticket-error` — untested
- `dispute-error` — untested

### P03 financial operations — 20

- `loss-chart-ledger-unavailable-states` — untested
- `losses-error` — untested
- `recovery-board-empty-state` — untested
- `recovery-board-error` — untested
- `confirm-recovery-action-modal` — partial
- `reconciliation-loading-empty-states` — untested
- `reconciliation-error` — untested
- `reconciliation-resolution-drawer` — partial
- `reports-and-records-loading` — untested
- `reports-error` — untested
- `report-records-empty` — untested
- `report-records-error` — untested
- `loss-detail-error` — untested
- `write-off-outstanding-recovery-modal` — partial
- `recovery-not-found` — untested
- `recovery-detail-error` — untested
- `recovery-detail-action-modal` — blocked
- `named-report-not-found` — untested
- `named-report-unavailable` — untested
- `named-report-error` — untested

### P04 controls and automation — 18

- `rules-empty-state` — untested
- `rules-error` — untested
- `recovery-rulebook-empty` — untested
- `recovery-rulebook-error` — untested
- `flows-empty-state` — untested
- `flows-error` — untested
- `new-flow-draft-modal` — partial
- `flow-runs-empty` — untested
- `flow-runs-error` — untested
- `rule-not-found` — untested
- `rule-detail-error` — untested
- `rule-simulation-and-publication-modals` — blocked
- `flow-not-found` — untested
- `flow-detail-error` — untested
- `flow-edit-test-and-publication-modals` — partial
- `flow-run-not-found` — untested
- `flow-run-error` — untested
- `flow-run-payload-inspector` — untested

### P05 sources and imports — 17

- `connected-sources-empty` — untested
- `connected-sources-error` — untested
- `connection-and-disconnection-modals` — partial
- `source-catalogue-no-results` — untested
- `source-catalogue-error` — untested
- `imports-error` — untested
- `replace-import-file-confirmation` — blocked
- `source-not-found` — untested
- `source-error` — untested
- `settings-form-loading-families` — untested
- `connector-setup-error` — untested
- `connect-shopify-modal` — partial
- `shipbob-selection-empty` — untested
- `shipbob-selection-error` — untested
- `import-job-loading` — untested
- `import-job-not-found` — untested
- `import-job-error` — untested

### P06 settings and governance — 18

- `account-settings-error` — untested
- `team-empty` — partial
- `team-error` — untested
- `invite-member-and-transfer-ownership-modals` — partial
- `platform-settings-error` — untested
- `notification-email-unavailable` — untested
- `notification-settings-error` — untested
- `api-access-error` — untested
- `create-reveal-and-revoke-api-key-modals` — blocked
- `audit-trail-error` — untested
- `audit-event-detail-drawer` — blocked
- `privacy-error` — untested
- `data-erasure-and-account-deletion-modals` — partial
- `agreements-empty` — untested
- `agreements-error` — untested
- `agreement-upload-and-review-overlays` — partial
- `billing-error` — untested
- `billing-plan-change-modal` — blocked

### P07 entry and support — 27

- `demo-loading` — untested
- `demo-error` — untested
- `signup-submitting` — untested
- `signup-error` — untested
- `login-submitting` — untested
- `login-error` — untested
- `password-reset-sent-state` — untested
- `password-reset-error` — untested
- `reset-update-invalid-session` — untested
- `reset-update-success` — untested
- `reset-update-error` — untested
- `workspace-onboarding-shopify-connection` — untested
- `workspace-onboarding-helpdesk-connection` — untested
- `workspace-onboarding-setup-verified` — untested
- `onboarding-loading` — untested
- `onboarding-error` — untested
- `notifications-empty-states` — untested
- `notifications-loading` — untested
- `notifications-error` — untested
- `search-empty` — untested
- `search-no-results` — untested
- `search-error` — untested
- `help-empty` — untested
- `help-error` — untested
- `help-article-unknown-slug` — partial
- `help-article-error` — untested
- `legal-document-error` — untested

## Appendix B — Evidence references

- `artifacts/full-app-acceptance-2026-08-30/coverage-summary.md`
- `artifacts/full-app-acceptance-2026-08-30/acceptance-ledger.json`
- `artifacts/full-app-acceptance-2026-08-30/baseline.json`
- `artifacts/full-app-acceptance-2026-08-30/regression.json`
- `artifacts/full-app-acceptance-2026-08-30/defects.md`
- `artifacts/full-app-acceptance-2026-08-30/repair-log.md`
- `artifacts/full-app-acceptance-2026-08-30/physical/interactions.json`
- `artifacts/full-app-acceptance-2026-08-30/physical/scenario-evidence-index.json`
- `artifacts/full-app-acceptance-2026-08-30/physical/preview.json`
- `artifacts/full-app-acceptance-2026-08-30/role-fixture-cleanup.json`
