# MR6 — Reliability and controlled pilot release proof

## 1. Result and authority

**Result: PARTIAL / NO-GO.**

MR6's local implementation and evidence tooling are complete for the approved disposable environment. The final identified production build passes the guarded release harness, populated logical restore, and 103-check traced browser matrix. MR6 is not `PASS`: the entry checkout is not a clean commit, and staging, selected-provider lifecycle, non-founder, named-owner, and signed-agreement evidence are absent.

The merchant owner's acceptance of MR5's legal limitation allowed MR6 sequencing only. It did not approve public legal reliance, provider or remote mutations, deployment, or a real merchant invitation.

## 2. Frozen candidate

| Field | Frozen value |
|---|---|
| Candidate kind | Identified dirty-working-tree production build |
| Branch | Historical implementation branch; superseded by the deployment-candidate branch recorded in `DEPLOYMENT_READINESS.md` |
| Base commit | Historical dirty-tree build; current candidate commit is recorded in the final deployment receipt |
| Clean commit | No |
| Worktree paths at freeze | 893 |
| Next build ID | `skBTCLjermRyop8z1nfwX` |
| Build ID SHA-256 | `ab5a429e102743dd5049a087631432d4924270e0dd418c818dcbe9c4c72dde56` |
| Routes manifest SHA-256 | `ac540a7889b2e649a0c19d476837b5cebcf1bc97ef731cd2d6551e049e27be05` |
| App paths manifest SHA-256 | `0c402b838060270a63b86a1a8d7b101e9e3717152c8d3915a240b4a00e82c984` |
| MR6 implementation file-set SHA-256 | `12accca88c9e12502b3a75990a47e0315180f522dc07b03197e72cf980c1f5de` |
| Schema | 32 migrations through `20260823190000` |
| Normalised public schema SHA-256 | `0dfb4b880981fad7fcee185bd2d77533f4546256d97622ef6622ebac30ac3479` |
| Environment | Local production server + approved disposable loopback Supabase + synthetic Elara fixture |
| Freeze time | `2026-08-24T15:30:14.026Z` |

Canonical authorities remained fixed:

- surface manifest `a715a3d729503ddc50ab5971628a6ddc9b2f57b57e63cd9f0b62c657f4db9048`;
- app routes `a461fca8eac150144e8e910ecb79a27c2a0a2580e0dbfd815fe8241db4108198`;
- aliases `0ed720ad76cee70078c4421f61dc6420fa213ebca63b5847943d942ad7cd0687`;
- plan catalogue `a2381b625eedd4bc5b5c73593d15a39ba24b3e61d76c4f90d003ca6e4edce056`;
- provider registry `e362609538acf942bcb51954dfa4ff93f7c972eada43bba41a54d198632bf680`.

Machine-readable candidate receipt: `artifacts/mr6-2026-08-24/candidate.json`.

## 3. Required-work and acceptance matrix

| MR6 requirement | Result | Evidence or blocker |
|---|---|---|
| One clean, identified commit/build | Partial | Exact build and checksums frozen; clean commit unavailable because the user-owned entry worktree was already heavily dirty and no commit authority was supplied. |
| Guarded local release harness | Pass | Explicit disposable-local guard retained; zero failed checks. |
| Focused browser journeys and receipts | Pass locally | 103/103 passed on the frozen build with 103 trace archives. |
| Staging schema/config reconciliation | Blocked / not run | No staging or remote-migration mutation authority or environment receipt. |
| Two-merchant adversarial tenancy | Pass locally | RLS, RPC, Storage, route/search/export/job/callback/error contracts passed local runtime and automated gates. |
| Credential/webhook/replay/backlog/dead letter | Partial | Local concurrency, replay, reconciliation and failure-state contracts passed; applicable provider credential and webhook recovery lifecycles remain unproved. |
| Subject access/erasure and workspace deletion | Pass locally | Access/erasure, retention, resumable deletion, completion receipt, and local privacy runtime passed. |
| Backup and restore | Pass locally | Populated logical archive restored into an isolated scratch database with schema and data fingerprints equal. Hosted recovery remains unproved. |
| Keyboard/accessibility/supported widths | Pass locally | Serious/critical axe gate, keyboard escape, and 320/390/768/1024/1440 behaviour passed; signed-in surfaces truthfully retain the desktop boundary below 1024. |
| Non-founder full run | Unproven | No independent operator completed activation through administration on this candidate. |
| Complete signed pilot packet | Partial | Candidate/provider/journey/local evidence is frozen; named support/rollback contacts, success approval, and signed pilot/data agreements are absent. |

Because the missing rows are release criteria rather than optional observations, the correct phase verdict is `PARTIAL / NO-GO`.

## 4. Implementation delivered

Release and restore tooling:

- `scripts/run-local-release-browser.mjs` provides a fail-closed loopback-only production browser runner and exact-build reuse.
- `scripts/verify-backup-restore.mjs` requires explicit destructive-local authority, validates the exact Supabase container, restores a logical archive into a unique scratch database, compares schema/data fingerprints, and cleans up.
- `scripts/release-readiness.mjs` now includes the guarded logical restore gate.
- `package.json` exposes `test:release-browser:local` and `verify:backup-restore`.
- `tests/playwright.config.ts` prevents the local release proof from reusing a stale server.

Provider preflight hardening:

- `scripts/e2e/preflight.ts` adds read-only operation and prevents Merchant B creation in that mode.
- `scripts/e2e/helpers/envVars.ts` and `scripts/e2e/helpers/shopify.ts` prefer current Shopify client credentials while retaining the bounded legacy-token fallback.
- `scripts/validate-controlled-live-connectors.ts` loads environment configuration before validation.

Product defects closed for the candidate:

- source detail processing-history enum mapping in `app/(app)/sources/[sourceId]/SourceDetailPage.tsx`;
- canonical workflow labels in `app/(app)/financials/losses/[lossId]/LossDetailPage.tsx`, `lib/ui/labels.ts`, and `tests/unit/uiLabels.test.ts`;
- accessible semantics for Cases facts, source progress, report tables, privacy/audit tables, notifications, and recovery rulebook headers;
- contrast and supported-width repairs across `styles/operations/foundation.css`, `styles/evidence-operations.css`, `styles/operations/workspace.css`, `styles/operations/surfaces.css`, and the affected component modules;
- deterministic current-product, dynamic-surface, workflow, and performance contracts in `tests/current/`.

No roadmap capability, provider write, automatic money action, or customer communication was enabled.

## 5. Verification receipts

Final guarded release harness, completed `2026-08-24T15:30:14.026Z`:

- lint passed with zero warnings;
- application, operational-script, and provider-suite typechecks passed;
- 404 Jest suites passed, 2 skipped; 2,879 tests passed, 6 skipped;
- engine evaluation passed at F1 `0.76` with zero false-positive cost;
- 32 migrations replayed to schema hash `0dfb4b880981fad7fcee185bd2d77533f4546256d97622ef6622ebac30ac3479`;
- schema preflight, durable audit, tenancy, webhook concurrency/replay, privacy, investigations, and source-to-recovery runtimes passed;
- Chrome extension and Next production builds passed;
- 35/35 canonical production route checks passed;
- whitespace integrity passed;
- remote migration reconciliation remained explicitly excluded.

Final same-build browser proof, completed `2026-08-24T15:36:28.342Z`:

- 103 expected, 0 unexpected, 0 flaky, 0 skipped;
- 103 retained trace archives;
- merchant routes, dynamic details, accessibility, supported widths, keyboard behaviour, workflow continuity, truth states, sidebar continuity, and warmed navigation budget passed;
- no data-quality warning remained in the final run.

Populated local restore, completed `2026-08-24T15:30:24.093Z`:

- archive SHA-256 `4a7dd535ffef799cc1e3c7f9666673d3cd87891cff84abd023f698470a470788`, 1,803,067 bytes;
- equal source/restored fingerprints for 32 migrations, 150 public tables, 2 views, 126 functions, 166 policies, 1 merchant, 1 merchant member, 1 auth user, 24 orders, 24 cases, 14 recoveries, 105 financial entries, 1 notification, and 5 storage buckets;
- scratch database and archive cleanup passed;
- cluster-bound `pg_cron` installation, jobs/run history, and its grant event trigger were explicitly excluded.

`git diff --check` passed. The Chrome extension dependency audit still reports 1 moderate and 3 high vulnerabilities; no force/breaking audit mutation was authorised.

## 6. Provider and journey evidence

The complete provider matrix is `artifacts/mr6-2026-08-24/provider-evidence-matrix.json`; the 15-journey result matrix is `artifacts/mr6-2026-08-24/journey-evidence-matrix.md`.

Read-only provider evidence is deliberately bounded:

- Shopify account/credential read passed.
- UPS credential read passed.
- Gorgias direct account access passed, but the selected merchant had no active Gorgias connection and its merchant-scoped probe returned `gorgias_400`.
- ShipBob reported `credentials_revoked`.
- Shopify Payments and Stripe Billing provider-confirmed lifecycles are unproved.
- FedEx credential read passed but is not part of the frozen selected stack and cannot substitute for UPS.

No connect/disconnect, sync, credential rotation/revocation, webhook recovery, note/tag writeback, refund, carrier submission, checkout, deployment, or remote migration was performed.

## 7. Known limitations and release blockers

- MR1 controlled source/provider activation and lifecycle proof remains unpassed.
- The candidate is an identified dirty-working-tree build, not a clean release commit.
- Staging schema, grants, Storage, cron, feature switches, hosted restore/PITR, and production-like delivery were not reconciled.
- Selected-provider revoke/reconnect, webhook suppression/recovery, provider backlog/dead-letter, live import, bounded writeback, recovery submission, credit observation, and payment lifecycle receipts are absent.
- The full non-founder journey is absent.
- Named pilot merchant, support, rollback, legal, privacy, and security owners are absent.
- Signed pilot/data agreements and approved legal/controller/retention/subprocessor facts are absent; public legal routes remain non-operative.
- The wider programme remains `NO-GO`; local success must not be presented as live-provider or release approval.

## 8. Preservation, stop state, and next authority

The user-owned dirty baseline was preserved. No reset, stash, clean, commit, push, deploy, remote migration, provider mutation, real-user invitation, or production/staging data action occurred. The only destructive operations were explicitly guarded resets of the approved disposable local database and isolated scratch-database restore cleanup.

MR6 stops here as `PARTIAL / NO-GO`. Separate explicit authority and environments are required before any of these next actions:

1. create a clean release commit and reconcile staging/remote migrations;
2. execute controlled selected-provider lifecycle and payment evidence;
3. conduct and retain the independent non-founder run;
4. bind named owners, success/stop measures, and signed agreements;
5. deploy or invite any real merchant.
