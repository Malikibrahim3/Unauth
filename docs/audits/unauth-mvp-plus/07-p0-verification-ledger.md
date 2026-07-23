# 07 — P0 Verification Ledger

**Original verification date:** 2026-07-21
**Remediation recheck:** 2026-07-22
**Branch:** `perf/architecture-overhaul`
**Original mode:** Read-only product/code/runtime verification. The historical
sections below preserve that pre-remediation evidence; current remediation
status is recorded in §0 and the atomic contract recheck in §9.
**Purpose:** Independently verify — with direct evidence and adversarial reasoning, **not** grep counts — the reported P0 launch blockers, then retain an atomic remediation recheck without rewriting the original findings.

Scope covers the seven focus areas in Task 0: (1) tenant isolation / scoped-client usage; (2) RLS + storage policy coverage; (3) integration "live" truthfulness; (4) audit-log durability/completeness; (5) webhook signature/replay/idempotency; (6) deletion/retention canonical-vs-legacy; (7) the release-readiness gate. All application/API/background/callback routes are classified in §2.

> **How to read this ledger.** The prior audit (`00`–`06`) is treated as evidence, not fact. Several of its claims are confirmed with tighter evidence; **two are materially corrected** (RLS coverage; the reachability of some "legacy" routes). Corrections are called out explicitly in §5.

> **Remediation status vocabulary.** The 2026-07-21 sections below preserve the original forensic states for provenance. Current remediation uses only `PASS`, `FAIL`, and `UNVERIFIED`. The atomic 318-row P0 recheck is recorded in §9; historical labels such as `PROVEN DEFECT`, `RESOLVED`, and `PARTIAL` do not substitute for a current contract status.

## 0. Previously proven blocker groups — remediation recheck

| Blocker group | Current status | Current evidence | Remaining evidence gap |
|---|---|---|---|
| P0-1 release gate | UNVERIFIED | The 2026-07-21 gate was green after correcting three stale tests (§3.2), but Stages A–E materially changed code, schema and the gate itself. | The complete unmodified final gate must be rerun in Stage I. |
| P0-2 durable audit | PASS | `09-durable-audit-inventory.md`; `scripts/verify-durable-audit-runtime.sql/.mjs`; PostgreSQL 17.6 proves transactional capture/rollback, one logical event, immutable/idempotent projection, bounded retry/dead-letter/recovery, actor context and the exact 26-table inventory. | — |
| P0-3 provider truthfulness | PASS | `08-provider-proof-matrix.md`; `deriveProviderDisplayStage()` requires complete current artifact-backed controlled proof for Live; catalogue regression tests prove the current Live set is empty. | Provider capability execution remains `UNVERIFIED` where controlled external evidence is unavailable, but it can no longer create a false Live claim. |
| P0-4 URL-borne webhook secrets | PASS | `webhook-callback-inventory.md`; helpdesk authentication reads custom/native signature headers only; route and URL-generation tests reject query secrets. | Existing deployed provider registrations need coordinated rotation during the later approved rollout. |
| P0-5 verify-before-parse | UNVERIFIED | Local raw-body bounds, signature ordering and event safety pass in `scripts/verify-webhook-event-safety.sql/.mjs` plus provider route tests. | Live provider delivery/signature evidence is unavailable; non-native helpdesk shared headers remain truthfully Partial. |
| P0-6 canonical merchant removal | PASS | `app/api/settings/bulk-delete/route.ts`; `tests/api/bulkDeleteCanonical.test.ts`; real canonical view-state fields are used and UI copy names the deliberately limited scope. | — |
| P0-7 per-subject erasure | UNVERIFIED | `20260722300000_privacy_erasure_retention.sql`; `scripts/verify-privacy-erasure-runtime.sql/.mjs`; two-merchant synthetic runtime proves scoped, idempotent pseudonymisation with retained reconciliable money/audit envelopes. | Historical unlinked inbox ownership and legacy external payload-reference deletion cannot be resolved without an explicit data contract. |
| P0-8 retention no-op | UNVERIFIED | The cron now executes explicit-deadline terminal-payload retention and leased Storage cleanup; runtime tests prove purge/retain/block counts. | No approved retention period exists for canonical, evidence, audit or financial history; the code intentionally does not invent one. |

---

## 1. Headline

The reported blocker set is **substantially accurate**, with two material corrections and several severity refinements:

- **Confirmed PROVEN DEFECTS (block launch):** false-"live" providers (Zendesk/Freshdesk/UPS/FedEx); fire-and-forget + incomplete audit trail; support-webhook secret acceptable via URL query param + Zendesk/Freshdesk parse-before-auth + BigCommerce parse-before-verify; merchant data-removal targets legacy tables only + no per-subject erasure + retention cron is a no-op; the release gate is red.
- **Corrected:** the "RLS covers only ~32 tables" claim is **inaccurate** — RLS is enabled on ~130 tables with `is_merchant_member` policies (including write policies on canonical tables). RLS coverage is a *strength*, not a gap. The real, narrower truth is that the service-role code path bypasses RLS, so runtime isolation still rests on a hand-written `.eq('merchant_id')` convention.
- **Refined to UNVERIFIED RISK (not proven defect):** cross-tenant isolation. No cross-tenant leak was found in any authorization path examined; the deficiency is **assurance** (no static guard against unscoped service-role queries; the only live cross-tenant test is skipped), not a proven exploit.
- **Corrected reachability:** `fraud-feedback` and in-app `demo` are **retired (HTTP 410)**, and `test/e2e-auth` is disabled in production — so parts of the "reachable legacy surface" narrative do not apply as written.

---

## 2. Route classification (all routes)

Method: every `app/**/route.ts` (194 handler files) + `app/(auth)/callback` was matched against its actual guard primitive, then the security-relevant routes were read end-to-end to confirm the real authorization chain (authentication → active workspace membership → permission → target ownership → query scoping). Guard-primitive matching was used only to *locate* the chain, never as the security conclusion.

**Authorization chains in use (verified in source):**

| Chain | Where verified | What it enforces |
|---|---|---|
| `requirePermission(service, user.id, PERM)` → `resolveCallerContext` → `hasPermission` | `lib/permissions/index.ts:349`, `:167`, `:248` | Authn (`auth.getUser()`), **active** membership (`merchant_users` `invite_status='active'`, `lib/permissions/index.ts:200-204`), role/delegated-grant permission. Returns `{denied}` on failure. |
| `requirePagePermission(PERM)` (RSC pages) | `lib/auth/requestContext.ts:67` | Same, honouring the active-merchant cookie; pages `redirect` on `null`. **File is untracked** (see §4.7). |
| `requirePermissionForMerchant(service, user.id, merchantId, PERM)` | `lib/permissions/index.ts:387` | Binds a pre-selected merchant to the caller before an OAuth callback; rejects if `ctx.merchantId !== merchantId`. |
| `validateApiKey` / `validateApiKeyPlaintext` | `lib/api/validateApiKey`; e.g. `app/api/v1/customers/route.ts:16`, `app/api/checkout-signals/link-order/route.ts:25` | External API-key bearer auth; `merchantId` derived from the key, never the body. |
| `validateWidgetToken` | `app/api/rules/evaluate/route.ts:34` | Helpdesk-widget token; `merchantId` from the token. |
| Provider signature/secret | webhook routes (§4.5) | HMAC or shared-secret verification in lieu of user auth. |
| `Bearer ${CRON_SECRET}` | cron routes (e.g. `app/api/cron/recompute-evidence-scores/route.ts:44`) | Scheduled-job secret; cross-merchant by design. |
| Internal signing secret | `app/api/internal/support/ingest`, `app/api/checkout-signals/ingest` | Dedicated internal secret. |

**Classification (all 194 handlers):**

| Category | Count | Auth mechanism | Notable members |
|---|---:|---|---|
| **Authenticated merchant** (user session) | ~150 | `requirePermission` / `requirePagePermission` / caller-context, then **manual** `.eq('merchant_id', ctx.merchantId)` | all `claims/*`, `customers/*`, `recoveries/*`, `losses/*`, `rules/*`, `workflows/*`, `partners/*`, `settings/*`, `integrations/*` (non-callback), `team/*`, `reports/*`, `notifications/*`, `evidence/*`, `imports/*`, etc. **16** of these route merchant I/O through `createScopedClient` (§4.1). |
| **External API-key / widget-token** | ~18 | `validateApiKey` / `validateApiKeyPlaintext` / `validateWidgetToken`; merchant from key/token | all `app/api/v1/*` (customers, evidence×3, gate×2, ingest×4, lookup, profile-link, helpdesk-ticket-context), `checkout-signals/link-order`, `rules/evaluate`, `gorgias/widget` + `gorgias/widget/unlock*`, `gorgias/evidence`, `claim-gate/check` |
| **Provider callback / webhook** | 13 | HMAC/secret or `requirePermissionForMerchant`+state | `shopify/webhooks`, `woocommerce/webhooks`, `bigcommerce/webhooks`, `integrations/shipbob/webhook`, `webhooks/stripe`, `gorgias/support-webhook`, `zendesk/support-webhook`, `freshdesk/support-webhook`, `fulfillment/pack-confirmation`; OAuth callbacks `shopify/callback`, `bigcommerce/callback`, `integrations/shipbob/callback`, `(auth)/callback` |
| **Cron / job** | 9 | `Bearer CRON_SECRET` | `cron/{billing-lifecycle, mark-stale-claims, process-domain-events, process-sync-jobs, project-notifications, purge-expired-audits, recompute-evidence-scores, reconcile, verify-connections}` |
| **Internal / admin** | 2 | dedicated internal secret (+HMAC) | `internal/support/ingest`, `checkout-signals/ingest` |
| **Public (unauthenticated by design)** | 2 | none | `csp-report` (204 sink), `(auth)/callback` (Supabase session exchange) |
| **Obsolete / retired** | 3 | returns 410 / prod-disabled | `fraud-feedback` (410, `app/api/fraud-feedback/route.ts:16`), `demo` (410, `app/api/demo/route.ts:10`), `test/e2e-auth` (disabled unless `isE2eTestAuthEnabled()`, `app/api/test/e2e-auth/route.ts:37`) |

Notes:
- `app/api/integrations/[provider]/api-key/route.ts` re-exports `POST` from the canonical `../connect/route` (`requirePermission`) — the "no-guard" grep hit was a false positive.
- `claim-gate/check` is API-key authed and **writes to canonical `support_payout_cases`** with `.eq('merchant_id')` and a `parsed.merchant_id !== auth.merchantId → 403` check (`app/api/claim-gate/check/route.ts:138,159,89`). It is a live "gate" path, not dead — but it is not an unauthenticated one.

---

## 3. Release-gate baseline (Focus area 7)

Command (unmodified): `npm run release:readiness`.

### 3.1 Original baseline (2026-07-21, pre-fix) — RED

Full log captured. **Result: `{"status":"blocked","failedChecks":1,...}`, process exit code 1 (RED).**

| Stage | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | **PASS** |
| Lint (`eslint … --max-warnings=0`) | **PASS** |
| Authenticated design guard | **PASS** (395 files) |
| Supabase contract audit | **PASS** (131 live tables) |
| Provider-suite TypeScript | **PASS** |
| Full Jest suite (`jest --runInBand`) | **FAIL** |
| Production build (`next build`) | **PASS** |
| Whitespace integrity (`git diff --check`) | **PASS** |
| Migration history (timestamp sanity) | **PASS** (140 timestamped files) |
| Remote migration dry-run | SKIP (by design, no `--remote-migrations`) |

Jest tally: **Test Suites: 2 failed, 1 skipped, 291 passed (293/294)**; **Tests: 3 failed, 3 skipped, 2247 passed (2253)**. Exact failures:

1. `tests/api/routeSecurity.test.ts:697` — asserts the claims page contains `"if (denied) redirect('/dashboard')"`. Actual page uses `requirePagePermission(PERMISSIONS.VIEW_INBOX)` + `if (!ctx) redirect('/dashboard')`. **Stale assertion** against the pre-refactor `{denied}` symbol.
2. `tests/api/routeSecurity.test.ts:1563` — asserts the dashboard page contains `"denied"` / `/if\s*\(\s*denied\s*\)/`. Actual page uses `if (!ctx) redirect(...)`. **Stale assertion.**
3. `tests/components/caseContextDrawer.test.tsx:51` — `fireEvent.click(getAllByRole("button",{name:"Close panel"})[1])` throws "Unable to fire a click event" because index `[1]` is now `undefined` (one Close button). **Stale DOM assertion.**

The skipped suite is `tests/security/sourceAgnosticRls.test.ts` (`describe.skip` unless `RUN_LIVE_DB=1`, `:39`).

**Interpretation:** enforcement on the two pages is intact and arguably improved (active-merchant-cookie-aware); the tests assert the *old* control-flow symbols. `lib/auth/requestContext.ts` and the modified pages are uncommitted/untracked (git status). The gate cannot pass as-is.

**Evidence state (at time of Task 0): PROVEN DEFECT** (SEC-002, QAT-009). The gate was red for exactly the reasons reported.

### 3.2 Task 0A — gate restored to GREEN (2026-07-21)

Before editing, `lib/auth/requestContext.ts` and its five callers (`app/(app)/{claims,dashboard,layout,rules,settings/data-privacy}/page.tsx`) were re-inspected diff-by-diff against `git diff`. Confirmed: this is an intentional pre-existing performance/dedup refactor (`react.cache()`-memoized per-request auth), not an accidental weakening — `requirePagePermission` still resolves authentication (`getRequestUser`), **active** membership + role/grant permission (via `getRequestCallerContext` → `resolveCallerContext`/`hasPermission`, unchanged), and returns `null` on any denial, which every caller checks before touching merchant-scoped data. This confirms §4.7's original conclusion; no product defect was found, so no product code was touched.

Both stale tests were rewritten to assert the **security/interaction invariant** rather than a literal implementation string, and each was verified to still fail when the underlying behaviour is removed (temporary mutation, then reverted — confirmed byte-identical via `diff` against a pre-mutation backup):

- **`tests/api/routeSecurity.test.ts`** (`Claims page —…` and `dashboard/page.tsx — fail-closed…`): now dynamically discovers the variable capturing `requirePagePermission(PERMISSIONS.VIEW_INBOX|VIEW_DASHBOARD)`'s result from the source, then asserts (a) that variable is checked for a falsy/denied result, (b) the check gates a `redirect(`, and (c) for the claims page, the gate appears **before** the first merchant-scoped data use (`resultVar.merchantId`) — fail-closed ordering, not just presence. Verified: deleting the claims-page guard, or renaming the checked variable so the dashboard guard silently no-ops, each independently fails its respective test; reverted after confirming (`diff` against backup: identical).
- **`tests/components/caseContextDrawer.test.tsx`**: replaced `getAllByRole(...)[1]` (positional, now `undefined` since the drawer has one `"Close panel"` backdrop button and a separately-named `"Close"` header button, not two same-named ones) with `getByRole("button", { name: "Close" })` plus a `toHaveFocus()` assertion proving the drawer's initial-focus-management effect actually moves focus to that control before the click. Verified: temporarily no-opping the focus effect in `components/ui/Drawer.tsx` fails the new assertion; the file was restored and confirmed byte-identical to its pre-mutation state via `diff`.

Re-run result: **`{"status":"ready","failedChecks":0,"remoteMigrations":false}`, exit code 0 (GREEN).**

| Stage | Result |
|---|---|
| TypeScript | **PASS** |
| Lint (zero warnings) | **PASS** |
| Authenticated design guard | **PASS** |
| Supabase contract audit | **PASS** |
| Provider-suite TypeScript | **PASS** |
| Full Jest suite | **PASS** — Test Suites: 293/294 passed, 1 skipped (0 failed); Tests: 2250 passed, 3 skipped, 0 failed |
| Production build | **PASS** |
| Whitespace integrity | **PASS** |
| Migration history | **PASS** (140 timestamped files) |
| Remote migration dry-run | SKIP (by design) |

The 1 skipped suite / 3 skipped tests are the same intentional `RUN_LIVE_DB`-gated `sourceAgnosticRls.test.ts` from §3.1 — unchanged, and tracked as the open item in §7 (live two-merchant suite), not a new gap.

**Files changed:** `tests/api/routeSecurity.test.ts`, `tests/components/caseContextDrawer.test.tsx`. No product code was modified (the temporary mutations used to verify test meaningfulness were reverted and confirmed byte-identical before the final gate run). `lib/auth/requestContext.ts` and its callers remain uncommitted/untracked, as they were before this task — committing them was out of scope for a test-focused fix and was not requested.

**Evidence state: RESOLVED.** P0-1 in §6 is closed; the backlog entry is updated accordingly.

---

## 4. Per-claim verification

### 4.1 Tenant isolation — "only a small subset of routes use the scoped client" (SEC-001, GOV-012, SCP-011, ACC-001)

**Factual sub-claim (scoped-client usage): PROVEN (accurate).**
`createScopedClient` (`lib/supabase/scoped.ts:190`) is genuinely fail-closed: it auto-injects `.eq('merchant_id', …)` on select/update/delete, sets it on insert/upsert, rejects a mismatched caller-supplied `merchant_id` (`:119-125`), and **throws** on any unclassified table (`:215`) so a mis-mapped table can never run an unscoped service-role query. It classifies ~30 `COLUMN_SCOPES` tables (`:42-85`). Exactly **16 of 194** route files route merchant I/O through it (`audit-trail`, `customers/[id]`, `demo/runs`, `evidence`, `evidence/[id]/pdf`, `imports/[jobId]`, `shipbob/sync-account`, `shipbob/webhook`, `jobs/[id]/hide`, `search`, `settings/bulk-delete`, `team`, `team/[memberId]`, `team/[memberId]/permissions`, `transactions/[id]/dismiss`, `work-tasks/[id]`). The other ~163 use `createServiceClient()` + a hand-written `.eq('merchant_id', ctx.merchantId)`.

**Security conclusion (adversarial, not grep): UNVERIFIED RISK — assurance gap, no proven leak.**
- The authorization chain is real and enforced (§2): `resolveCallerContext` requires an **active** `merchant_users` row; `requirePermission` gates on role/grant.
- Adversarial sampling of every route that touches the core claims table `support_payout_cases`: each user-facing route carries `requirePermission` + `.eq('merchant_id', ctx.merchantId)` (or `createScopedClient`). The single route with no merchant filter is `cron/recompute-evidence-scores` — a `CRON_SECRET`-authed, deliberately cross-merchant worker (`:44`, paginates all identities), which is correct for a background job, not a user leak.
- No cross-tenant read/write path was found in any route examined. Broad unit isolation suites pass (`merchantIsolation`, `evidenceIsolation`, `customerApiMerchantIsolation`, `sourceRecordTenantIsolation`, `connectorOwnershipIsolation`, `multiProviderScenarioIsolation`, `shipbobWebhookIsolation`, `scopedClient`).
- **The genuine risk is systematisation, not a current bug:** because the service role bypasses RLS, a *future* omitted `.eq` on one of the ~163 routes would leak with no DB backstop, and there is **no static guard** forbidding raw `createServiceClient().from(<merchant table>)` without a filter (`tests/api/scopedClient.test.ts` guards only the scoped client's own table map). The one live authenticated cross-merchant test is skipped (§3), so SCN-013 is never exercised end-to-end.

→ Not a PROVEN DEFECT (no exploit demonstrated); a real **UNVERIFIED RISK** to be closed by a static guard + a live two-merchant suite. Matches the contract's "High, not proven-Critical".

### 4.2 RLS & storage-policy coverage (SEC-001, GOV-012) — **CORRECTION**

**RLS coverage claim ("only ~32 tables / ~88 policies"): PROVEN INACCURATE.**
Across 222 migrations there are **215 `CREATE POLICY`** statements and RLS is enabled on **~130 distinct tables**. A `public.is_merchant_member(merchant_id)` predicate is used pervasively, including **write** policies on canonical tables:
- `supabase/migrations/20260711140000_phase7_canonical_operations.sql:306` — `for all … using (is_merchant_member(merchant_id)) with check (…)` over `evidence_links, case_decisions, case_outcomes, loss_attribution_candidates, work_tasks`.
- `…/20260711120000_source_agnostic_foundation.sql:545-567` — enables RLS + `is_merchant_member` select policies on `source_accounts, source_records, domain_events, entity_relationships, record_match_candidates, record_match_resolutions, case_financial_entries, case_financial_summaries`.
- `…/20260711130000_canonical_entity_model.sql:253`, `…/20260620120000_integration_layer_connectors.sql`, `…/20260711180000_phase9_collaboration_notifications.sql:81-87`, `…/20260713090000_phase6_configuration_versions.sql:29`, `…/20260714206500_sensitive_connection_rls.sql`, `…/20260718100000_merchant_local_identity_resolution.sql:100`.
- The canonical claims table `support_payout_cases` carries RLS via its `claims_member_select` / `claims_member_update` policies, renamed with the table (`…/20260619120000_rename_claims_to_support_payout_cases.sql:38,41`).

So RLS coverage is a **strength**, not the reported gap. (Minor open item: the `CREATE FUNCTION … is_merchant_member` statement itself was not located in the tracked migration text via grep; ≥10 policies reference it and the schema applies cleanly / the contract audit passes, so it exists in the applied schema — its definition source should be confirmed. → tracked as a low unverified item in §7.)

**The narrower, correct concern: PROVEN COMPLIANT-with-caveat.** RLS protects the **anon/authenticated-key** path. Every app route here uses the **service-role** client, which **bypasses RLS**. So broad RLS is real defense-in-depth (e.g. against a leaked anon key or a stray user-client query) but is **not** the runtime backstop for the app's own service-role routes — that remains §4.1's manual convention.

**Storage policies: UNVERIFIED RISK (low).** The CSV bucket `merchant-csv-uploads-2` is object-scoped by **user id** folder (`auth.uid() = (storage.foldername(name))[1]`, `…/0008_csv_upload_queue.sql:52-64`), i.e. per-user not per-merchant. Additional buckets are created in `…/20260620120000` and `…/0055_*`; their object policies were not exhaustively enumerated. The sensitive evidence read path does **not** rely on storage RLS — it streams via a server route with a 15-minute single-use signed token and dual merchant match (`app/api/v1/evidence/[id]/download/route.ts`), which is sound. → enumerate remaining bucket policies (test) before relying on storage-layer isolation.

### 4.3 Integrations advertised "live" without controlled proof (INT-002, INT-004, REL-010, CON-002, QAT-005)

**Evidence state: PROVEN DEFECT.**
- `buildStatus: 'live'` is set for **Zendesk** (`lib/integrations/providers/zendesk.ts:9`), **Freshdesk** (`freshdesk.ts:9`), **UPS** (`ups.ts:9`), **FedEx** (`fedex.ts:9`). The merchant-facing `stage` derives directly from it (`lib/connectors/catalogue.ts` `live→live`).
- **Zendesk / Freshdesk:** no executable adapter in `lib/connectors/registry.ts`; no effective-health probe — Zendesk's `verify-install` route merely writes `status:'active'` without an API call (`app/api/settings/zendesk/verify-install/route.ts:19-24`), Freshdesk is absent from `lib/connections/liveVerification.ts` entirely; no deleted-record reconciliation; no controlled e2e (the 11-scenario suite is Gorgias-only). They have real connect/backfill/webhook stacks under `lib/support/{zendesk,freshdesk}/`, so they are not vaporware — but they lack every liveness guarantee Gorgias has.
- **UPS / FedEx:** their own connector manifests say `verificationStatus:'partial'` and their sync/webhook methods return `RUNTIME_PENDING`; "health" is only an OAuth `client_credentials` token exchange (`liveVerification.ts:131-140`), not a tracking/proof-API probe. `live` overstates their own declared state.
- No catalogue invariant enforces `live ⇒ (adapter ∧ probe ∧ e2e)`. Worse, `tests/unit/integrations.test.ts:85-89` **asserts** `zendesk/freshdesk/ups/fedex` are `'live'`, actively enshrining the false labels — correcting the labels requires correcting that test (a correction, not a weakening).
- Inconsistency runs both ways: **ShipBob is `partial`** (`shipbob.ts:9`) yet is the only adapter with `verificationStatus:'verified'` and the only one with controlled sync validation (`scripts/validate-controlled-live-connectors.ts`). Gorgias (`live`) has a real `/users/me` probe (`liveVerification.ts:215-249`) and deleted-ticket reconciliation.

This directly violates REL-010 ("no integration overstates what is live") and INT-002.

### 4.4 Fire-and-forget / lossy audit logging (AUD-001, AUD-002, GOV-009, ACC-003, SEC-007)

**Evidence state: PROVEN DEFECT.**
- `logAction` (`lib/permissions/audit.ts:72`) returns `void`, is **not `async`**, and performs `svc.from('user_action_log').insert(...).then(...)` with only `console.error` on failure (`:78-96`). It is never awaited and never throws, so a failed audit insert is **silently lost** — the file's own header calls it "fire-and-forget".
- The `AuditAction` enum (`:15-56`) is legacy/fraud-shaped (`lookup_customer`, `quick_score`, `add_to_watchlist`, `submit_fraud_feedback`, `view_customer`…). It **omits** the canonical MVP+ sensitive actions: payout decisions, financial reversals/corrections, loss-attribution edits, recovery transitions/amounts, identity links/merges, rule/flow publishes & rollbacks, and evidence export/download issuance.
- The Data & Privacy page markets the opposite: "claim decisions, evidence attachments, and exports are recorded in an append-only audit trail" (`app/(app)/settings/data-privacy/page.tsx:93`) — a claim the enum + export routes do not back (evidence export/download write no audit event). This couples AUD-001 to SEC-007 and a merchant-facing overstatement.

(No correlation id / distinct effective-vs-recorded time / system-actor flag → AUD-002/003, secondary.)

### 4.5 Webhook signature, replay & idempotency (SEC-004, SEC-005, SEC-009, CON-004)

| Provider | Verify before parse/mutate? | Idempotency / replay | Secret transport | State |
|---|---|---|---|---|
| Shopify | ✅ `verifyShopifyWebhookHmac(rawBody,…)` at `route.ts:35` before any parse/mutation | ✅ `claimProcessedWebhook` dedupe (`:45`) | HMAC header | **PROVEN COMPLIANT** |
| WooCommerce | ✅ HMAC at `:57` before `claimProcessedWebhook` (`:63`) | ✅ dedupe | HMAC header | **PROVEN COMPLIANT** |
| ShipBob | ✅ svix-style verify at `:30-36` before enqueue | ✅ ingestion-inbox dedupe | signature header | **PROVEN COMPLIANT** |
| Stripe | ✅ `constructStripeEvent(payload,sig)` at `:22` before handling | Stripe SDK | signature header | **PROVEN COMPLIANT** |
| **BigCommerce** | ❌ `JSON.parse(rawBody)` at `route.ts:29` **before** `verifyBigCommerceWebhookSignature` at `:56` | ✅ dedupe (`claimProcessedWebhook`) | HMAC header | **PROVEN DEFECT (low)** — parse precedes verify; but **all DB mutations are gated behind the `:56` check**, so forged-payload injection is not demonstrated. Hardening, not an exploit. |
| **Gorgias** | ⚠️ secret **presence** gate before parse (`route.ts:148`), but secret **value** compare runs inside ingest after `request.json()` (`:160,167`) | ❌ no timestamp/nonce; static shared secret | header **or** URL query param | **PROVEN DEFECT** — query-param secret |
| **Zendesk** | ❌ `request.json()` at `route.ts:83` with **no** pre-parse auth (verify inside ingest at `:95`) | ❌ no replay defence | header **or** URL query param | **PROVEN DEFECT** |
| **Freshdesk** | ❌ `request.json()` at `route.ts:76` with **no** pre-parse auth (verify inside ingest at `:88`) | ❌ no replay defence | header **or** query param `unauth_whsec` (`:32`) | **PROVEN DEFECT** |

- **Secret-in-query-param — PROVEN DEFECT (SEC-005/SEC-009):** `readGorgiasWebhookSecret` reads the header first, then `GORGIAS_WEBHOOK_SECRET_QUERY_PARAM` (`lib/support/gorgias/webhookAuth.ts:26-34`); Freshdesk accepts `unauth_whsec`. A URL-borne secret lands in server/proxy access logs and referrer history. (Comparison itself is timing-safe / hashed — `verifyGorgiasWebhookAuth`, `:69-100` — that part is sound.)
- **Parse-before-verify — PROVEN DEFECT:** BigCommerce (JSON), Zendesk/Freshdesk (full body + verify inside ingest). Gorgias has been partially hardened with a pre-parse presence gate; Zendesk/Freshdesk have not.
- **Replay — UNVERIFIED RISK:** support webhooks use a **static** shared secret with no per-request signature and no timestamp/nonce, so a captured valid request is replayable. Ingest is keyed by external ticket id (bounding duplicate *case* creation), but replay could still re-trigger gate evaluation / state transitions; the exact harm needs a focused ingest-idempotency test to quantify.

### 4.6 Deletion / retention — legacy vs canonical (PRV-002, PRV-004, PRV-003)

**Evidence state: PROVEN DEFECT (merchant removal) + PROVEN MISSING (subject erasure) + PROVEN DEFECT (retention no-op).**
- Merchant bulk-removal (`app/api/settings/bulk-delete/route.ts`) soft-deletes (good) but its `ALLOWED` map targets only `customer_notes`, `watchlist_entries`, `processing_jobs` (`:17-23`) — **legacy tables**. It never touches canonical v2 data (`support_payout_cases`, `source_records`, `source_customers`, …). The Data & Privacy page nonetheless advertises "Workspace removal controls hide eligible operational context" (`data-privacy/page.tsx:79`) — a merchant-facing overstatement. → **PRV-002 PROVEN DEFECT.**
- No per-customer (data-subject) erasure/pseudonymisation route exists — only the legacy bulk-delete and whole-account deletion. → **PRV-004 PROVEN MISSING.**
- `cron/purge-expired-audits` is a permanent no-op: after `CRON_SECRET` auth it returns `{deleted:0, retired:true}` (`route.ts:13,17`). The page's "retained according to your plan settings" claim is enforced by no job. → retention **PROVEN DEFECT (low).**
- **Contrast (PROVEN COMPLIANT):** full **account** deletion is canonical-aware and thorough — owner-only (`GRANT_PERMISSIONS`, `account/delete/route.ts:218`), typed `confirm==='DELETE'` (`:213`), rate-limited 3/hr (`:202`), purges storage buckets + a `CURRENT_V2_MERCHANT_DELETE_TABLES` list including `support_payout_cases` (`:131`) and `source_customers` (`:139`), plus a flag-gated `purge_merchant_source_agnostic` RPC for the append-only tables (`:110`). The gap is specifically *selective/subject* removal, not account teardown.

### 4.7 Release gate red + uncommitted auth refactor (SEC-002, SEC-010, QAT-009)

**Evidence state: PROVEN DEFECT.** See §3. Additionally, `lib/auth/requestContext.ts` is untracked and `app/(app)/{dashboard,claims,layout,rules,settings/data-privacy}/page.tsx` are modified-uncommitted (git status), so the security-relevant refactor the failing tests target is not yet in version control.

---

## 5. Corrections to the prior audit (`00`–`06`)

1. **RLS coverage.** `00`/`03` state RLS covers "only ~32 tables / ~88 policies." Actual: ~130 RLS-enabled tables, 215 policies, `is_merchant_member` write policies on canonical tables (§4.2). The correct concern is the service-role bypass, not thin RLS.
2. **`fraud-feedback` reachability.** `06` Register G4 marks `app/api/fraud-feedback` "Reachable." It returns **HTTP 410** (retired) (`app/api/fraud-feedback/route.ts:16`). The `SUBMIT_FRAUD_FEEDBACK` *permission* still exists (`lib/permissions/index.ts:43`) — that legacy-RBAC point stands — but the route is not a live write path.
3. **In-app `demo`.** Retired (HTTP 410, `app/api/demo/route.ts:10`).
4. **v1 API surface (G2).** Reachable but **API-key authenticated** with merchant derived from the key and body-merchant mismatch rejected (`v1/gate/evaluate` `:31`; `claim-gate/check` `:159`) — not an unauthenticated legacy surface.
5. **Route/scoped-client counts.** 194 handler files (audit said 179); scoped-client usage is 16 either way (~8%).
6. **Severity of tenant isolation.** Reframed from implied defect to **UNVERIFIED RISK** — no leak found in any path examined (§4.1).

---

## 6. Ordered implementation backlog (PROVEN DEFECTS only)

Ordered by dependency and blast radius. Only proven defects appear here; unverified risks are in §7.

| # | Defect (state) | Contract IDs | Files | Fix summary |
|---|---|---|---|---|
| ~~P0-1~~ | ~~Release gate red~~ — **RESOLVED (Task 0A, 2026-07-21)** | SEC-002, QAT-009 | `tests/api/routeSecurity.test.ts`, `tests/components/caseContextDrawer.test.tsx` | The 3 stale assertions were rewritten to test the underlying security/interaction invariant (fail-closed permission-check ordering; verified focus + accessible-name close interaction) rather than a literal implementation string; each was confirmed to still fail under a reverted test mutation. Full gate is green (`status:ready`, exit 0). See §3.2. `lib/auth/requestContext.ts` + its callers remain uncommitted — committing them was out of this task's scope. |
| P0-2 | Fire-and-forget + incomplete audit (PROVEN DEFECT) | AUD-001, AUD-002, GOV-009, ACC-003, SEC-007 | `lib/permissions/audit.ts`; decision/reversal/recovery/rules/identity/export routes | Make `logAction` awaited/durable (or route via the domain-event outbox with retry); extend the action enum + emit at each site; audit evidence export issuance & download. |
| P0-3 | False-"live" providers (PROVEN DEFECT) | INT-002, INT-004, REL-010, CON-002, QAT-005 | `lib/integrations/providers/{zendesk,freshdesk,ups,fedex}.ts:9`; `tests/unit/integrations.test.ts:85-89`; `lib/connections/liveVerification.ts` | Downgrade the four to `partial`/`planned`; add real health probes (helpdesks) / tracking-API probes (carriers) before reporting "verified"; update the test to assert the corrected labels + add a `live ⇒ adapter∧probe∧e2e` invariant. |
| P0-4 | Webhook secret via URL query param (PROVEN DEFECT) | SEC-005, SEC-009 | `lib/support/gorgias/webhookAuth.ts:26-34`; `zendesk`/`freshdesk` webhookAuth + routes | Accept secrets from headers only; drop the query-param path (coordinate with the live Gorgias e2e suite so intake is not broken). |
| P0-5 | Support/BigCommerce parse-before-verify (PROVEN DEFECT) | SEC-004, CON-004 | `app/api/{bigcommerce/webhooks, zendesk/support-webhook, freshdesk/support-webhook}/route.ts` | Verify signature/secret before `JSON.parse`/ingest; give Zendesk/Freshdesk the same pre-parse gate Gorgias has. |
| P0-6 | Merchant removal hits legacy tables only (PROVEN DEFECT) | PRV-002 | `app/api/settings/bulk-delete/route.ts:17-23`; `data-privacy/page.tsx:79` | Repoint bulk removal at canonical v2 tables (soft-delete/hide preserving financial/audit rows) or correct the merchant-facing claim. |
| P0-7 | No per-subject erasure (PROVEN MISSING) | PRV-004 | new subject-erasure route | Add pseudonymisation of `source_customers`/identity PII preserving `case_financial_entries`/audit; audit the action itself. |
| P0-8 | Retention cron is a no-op (PROVEN DEFECT, low) | PRV-002/PRV-003 | `app/api/cron/purge-expired-audits/route.ts:17` | Implement a real, counted retention job (flag-gated purge pattern) or remove the on-page retention claim until it exists. |

---

## 7. Unverified risks needing tests (NOT proven defects)

| Risk | State | Contract IDs | Test to add |
|---|---|---|---|
| Cross-tenant isolation depends on hand-written `.eq('merchant_id')` on ~163 service-role routes; no static guard; RLS doesn't backstop the service-role path | UNVERIFIED RISK | SEC-001, GOV-012, SCP-011 | Static guard forbidding raw `createServiceClient().from(<merchant table>)` without a filter; **live authenticated two-merchant suite** (un-skip `sourceAgnosticRls`, exercise SCN-013 across routes/search/exports/storage/jobs/callbacks). |
| Support-webhook **replay** (static secret, no nonce/timestamp) | UNVERIFIED RISK | SEC-004 | Replay a captured Gorgias/Zendesk/Freshdesk delivery; assert per-delivery dedupe prevents re-triggered gate/state changes. |
| Storage bucket object policies beyond the CSV bucket (per-user vs per-merchant); MIME/size validation on document + pack-confirmation uploads | UNVERIFIED RISK | SEC-006 | Enumerate all `storage.objects` policies; upload-validation tests for `integration_documents`, `pack_confirmations`, `claim_evidence`. |
| `is_merchant_member` function definition not located in tracked migrations (policies reference it; schema applies) | UNVERIFIED RISK (low) | GOV-012 | Confirm the `CREATE FUNCTION` source (migration vs applied baseline); add a migration if it is not tracked. |
| CSRF / SameSite posture on state-changing POSTs; no step-up re-auth for the most destructive actions | UNVERIFIED RISK | SEC-008 | Inspect auth-cookie `SameSite`; add step-up for account delete + permission grants. |
| Viewer role default-grants `EXPORT_AUDIT`/`VIEW_TEAM`/`VIEW_SETTINGS` (over-permissioned) | UNVERIFIED RISK (confirmed in code, `lib/permissions/index.ts:63-76`) | ACC-002, PRV-006 | Right-size viewer; make audit/export grant-gated; regression test. |

---

## 8. Acceptance-criteria check

- ✅ All seven reported claims have exactly one evidence state with direct, cited evidence (§3–§4).
- ✅ All application / API / background / callback routes are classified (§2), with the real authorization chain recorded per class and every non-standard route named.
- ✅ Tenant conclusions rest on authorization-path analysis + adversarial sampling, **not** grep counts (§4.1); the grep matrix was used only to locate guards.
- ✅ The release gate has a reproducible baseline: `status:blocked`, exit 1, 3 named test failures in 2 suites (§3).
- ✅ No product code or production state was changed; only this ledger was written.
- ✅ Ordered proven-defect backlog (§6) and a separate unverified-risk list (§7), each linked to contract IDs.


---

## 9. Atomic MVP+ P0 remediation recheck

This is the current atomic recheck of the signed-in product contract. It contains
one row for each of the 322 P0 IDs and uses only the remediation states
`PASS`, `FAIL`, and `UNVERIFIED`. A shared evidence key is a pointer to
the concrete proof below, not a substitute for the requirement text in the
source contract. Universal claims remain `UNVERIFIED` when the available
proof covers only a subset.

### Evidence and gap keys

| Key | Concrete evidence or unresolved proof boundary |
|---|---|
| S2R | `20260722400000_source_to_recovery_integrity.sql`; `scripts/verify-source-to-recovery-runtime.sql/.mjs`; `tests/lib/crossModuleFinancialIntegrity.test.ts`; focused decision, lifecycle, financial and recovery suites (9 suites / 64 tests). |
| RPT | Canonical `case_financial_summaries` projection; `lib/reporting/intelligence.ts`; `lib/reporting/export.ts`; `get_financial_report_records`; case financial-history, Overview and Reports consumers; PostgreSQL financial drill-down assertions; 6 focused suites / 32 tests covering per-case formulas, mixed currencies, stable IDs, unknown/proven-zero states and export metadata. |
| OWN | `20260722500000_ownership_transfer_integrity.sql`; explicit-confirmation team API/UI; `scripts/verify-tenant-boundaries.sql/.mjs`; `tests/security/ownershipTransferContract.test.ts`. Runtime proves one-owner cardinality, atomic transfer, exact replay, durable event, unauthorized denial, and zero/two-owner rejection. |
| TEN | `20260722100000_tenant_authorization_hardening.sql`; `scripts/verify-tenant-boundaries.sql/.mjs`; `tests/security/tenantBoundaryContract.test.ts`; route authorization inventory in §2. |
| AUD | `09-durable-audit-inventory.md`; `20260721120000_durable_sensitive_audit.sql`; `scripts/verify-durable-audit-runtime.sql/.mjs`; audit projection/security tests. |
| WHK | `webhook-callback-inventory.md`; `20260722200000_webhook_event_safety.sql`; `scripts/verify-webhook-event-safety.sql/.mjs`; provider duplicate/reorder/signature suites. |
| PRV | `privacy-data-map.md`; `20260722300000_privacy_erasure_retention.sql`; `scripts/verify-privacy-erasure-runtime.sql/.mjs`; deletion/disconnect tests. |
| CAT | `08-provider-proof-matrix.md`; `lib/integrations/registry.ts`; provider catalogue/consistency tests; no provider derives to Live without current controlled proof. |
| UI | Stage H production Playwright gate: 105/105 desktop checks across primary, compatibility and dynamic routes, merchant lifecycle, representative states, axe, five reflow widths, keyboard/dialog behaviour, route security and content truthfulness; focused regression: 9/9 across desktop/tablet/mobile. |
| U-UI | Stage H's primary-route suite passes, but this atomic requirement's universal state/action scope is not directly exercised; no PASS is inferred from page presence. |
| U-A11Y | Axe/reflow and keyboard/dialog checks pass, but the atomic WCAG 2.2, screen-reader, focus-restoration, chart-equivalence or reduced-motion claim is broader than the executed evidence. |
| U-EXT | Controlled provider/staging evidence or credentials are unavailable; no external behaviour is inferred. |
| U-REPORT | The controlled financial slice reconciles, but universal metric/filter/freshness/export coverage outside that slice is not yet complete. |
| U-PERF | Warmed local primary-route navigation passes at p75 628 ms / maximum 717 ms, but the atomic staging-volume, exact-search, large-table, long-job and unbounded-query claims are broader than that representative local check. |
| U-POLICY | Local privacy mechanics pass, but the approved retention/data-reference contract needed for the full claim is absent. |
| U-OBS | Alerting/operational telemetry has not been exercised against a controlled monitoring backend. |
| U-UPLOAD | Some upload paths are tested, but the universal private-storage/type/size/content claim is not proven for every active path. |
| U-EXPORT | Authorization, expiry, masking and audit have not been proven end to end for every export/download path. |
| U-BROAD | Partial code/test evidence exists, but the requirement's full end-to-end or universal scope has not yet been demonstrated. |

| P0 ID | Status | Evidence / gap |
|---|---|---|
| SCP-001 | UNVERIFIED | U-BROAD |
| SCP-002 | PASS | S2R |
| SCP-003 | PASS | S2R |
| SCP-004 | PASS | S2R |
| SCP-005 | PASS | S2R |
| SCP-006 | PASS | TEN |
| SCP-007 | UNVERIFIED | U-BROAD |
| SCP-008 | UNVERIFIED | U-BROAD |
| SCP-009 | UNVERIFIED | U-BROAD |
| SCP-010 | UNVERIFIED | U-EXT |
| SCP-011 | PASS | AUD, TEN |
| REL-001 | UNVERIFIED | U-EXT |
| REL-002 | UNVERIFIED | U-BROAD |
| REL-003 | UNVERIFIED | U-BROAD |
| REL-004 | PASS | S2R |
| REL-005 | PASS | S2R |
| REL-006 | PASS | S2R |
| REL-007 | UNVERIFIED | U-REPORT |
| REL-008 | UNVERIFIED | U-BROAD |
| REL-009 | UNVERIFIED | U-UI |
| REL-010 | PASS | CAT |
| GOV-001 | PASS | S2R |
| GOV-002 | UNVERIFIED | U-BROAD |
| GOV-003 | UNVERIFIED | U-BROAD |
| GOV-004 | PASS | S2R |
| GOV-005 | PASS | S2R |
| GOV-006 | UNVERIFIED | U-BROAD |
| GOV-007 | UNVERIFIED | U-BROAD |
| GOV-008 | UNVERIFIED | U-BROAD |
| GOV-009 | UNVERIFIED | U-BROAD |
| GOV-010 | UNVERIFIED | U-BROAD |
| GOV-011 | UNVERIFIED | U-BROAD |
| GOV-012 | PASS | TEN |
| ACC-001 | PASS | TEN |
| ACC-002 | UNVERIFIED | U-BROAD |
| ACC-003 | PASS | AUD |
| ACC-004 | PASS | AUD |
| ACC-005 | PASS | OWN |
| TAX-001 | PASS | S2R |
| TAX-002 | UNVERIFIED | U-BROAD |
| TAX-003 | UNVERIFIED | U-BROAD |
| FIN-001 | PASS | S2R |
| FIN-002 | PASS | S2R |
| FIN-003 | PASS | S2R |
| FIN-004 | PASS | S2R |
| FIN-005 | UNVERIFIED | U-BROAD |
| FIN-006 | PASS | S2R |
| FIN-007 | PASS | S2R |
| FIN-008 | PASS | S2R |
| FIN-009 | PASS | S2R |
| FIN-010 | PASS | S2R |
| FIN-011 | PASS | S2R |
| FIN-012 | PASS | S2R |
| FIN-013 | PASS | S2R |
| FIN-014 | UNVERIFIED | U-BROAD |
| FIN-015 | PASS | S2R |
| FIN-016 | PASS | S2R |
| FIN-017 | UNVERIFIED | U-BROAD |
| FIN-018 | PASS | S2R |
| FIN-019 | PASS | S2R |
| FIN-020 | PASS | S2R |
| FIN-023 | UNVERIFIED | U-BROAD |
| FIN-024 | PASS | S2R |
| OBJ-001 | UNVERIFIED | U-POLICY |
| OBJ-002 | UNVERIFIED | U-BROAD |
| OBJ-003 | PASS | S2R |
| OBJ-004 | PASS | TEN |
| OBJ-005 | UNVERIFIED | U-BROAD |
| OBJ-006 | UNVERIFIED | U-BROAD |
| OBJ-007 | PASS | S2R |
| OBJ-008 | PASS | S2R |
| OBJ-009 | PASS | S2R |
| OBJ-010 | PASS | S2R |
| OBJ-011 | PASS | S2R |
| OBJ-012 | PASS | S2R |
| OBJ-013 | PASS | S2R |
| OBJ-014 | PASS | S2R |
| OBJ-015 | PASS | S2R |
| OBJ-020 | PASS | TEN |
| OBJ-021 | UNVERIFIED | U-BROAD |
| OBJ-022 | UNVERIFIED | U-BROAD |
| OBJ-023 | UNVERIFIED | U-BROAD |
| OBJ-024 | PASS | S2R |
| OBJ-025 | PASS | PRV |
| LIF-001 | PASS | S2R |
| LIF-002 | PASS | S2R |
| LIF-003 | UNVERIFIED | U-BROAD |
| LIF-004 | PASS | S2R |
| LIF-005 | UNVERIFIED | U-BROAD |
| DEC-001 | PASS | S2R |
| DEC-002 | PASS | S2R |
| DEC-003 | PASS | S2R |
| DEC-004 | PASS | S2R |
| DEC-005 | PASS | S2R |
| ATR-001 | UNVERIFIED | U-BROAD |
| ATR-002 | UNVERIFIED | U-BROAD |
| ATR-003 | UNVERIFIED | U-BROAD |
| ATR-004 | PASS | S2R |
| RCV-001 | PASS | S2R |
| RCV-002 | PASS | S2R |
| RCV-003 | PASS | S2R |
| RCV-004 | PASS | S2R |
| RCV-005 | PASS | S2R |
| RCV-006 | PASS | S2R |
| JRN-001 | UNVERIFIED | U-BROAD |
| JRN-002 | UNVERIFIED | U-BROAD |
| JRN-003 | PASS | CAT |
| JRN-004 | UNVERIFIED | U-BROAD |
| JRN-005 | PASS | CAT |
| JRN-010 | PASS | TEN |
| JRN-011 | PASS | WHK |
| JRN-012 | PASS | CAT |
| JRN-013 | UNVERIFIED | U-BROAD |
| JRN-014 | PASS | PRV |
| JRN-020 | PASS | WHK |
| JRN-021 | UNVERIFIED | U-BROAD |
| JRN-022 | UNVERIFIED | U-BROAD |
| JRN-023 | PASS | S2R |
| JRN-024 | PASS | S2R |
| JRN-030 | PASS | S2R |
| JRN-031 | PASS | S2R |
| JRN-032 | PASS | WHK |
| JRN-040 | UNVERIFIED | U-BROAD |
| JRN-041 | UNVERIFIED | U-BROAD |
| JRN-042 | UNVERIFIED | U-BROAD |
| JRN-050 | UNVERIFIED | U-BROAD |
| JRN-051 | UNVERIFIED | U-BROAD |
| JRN-080 | UNVERIFIED | U-BROAD |
| JRN-081 | UNVERIFIED | U-BROAD |
| JRN-082 | UNVERIFIED | U-BROAD |
| JRN-090 | PASS | S2R |
| JRN-091 | PASS | S2R |
| JRN-092 | UNVERIFIED | U-BROAD |
| JRN-093 | UNVERIFIED | U-BROAD |
| JRN-100 | PASS | S2R, RPT |
| JRN-101 | PASS | RPT |
| IA-001 | PASS | UI |
| IA-002 | PASS | UI |
| IA-003 | UNVERIFIED | U-UI |
| IA-004 | UNVERIFIED | U-UI |
| SHL-001 | UNVERIFIED | U-UI |
| SHL-002 | UNVERIFIED | U-UI |
| SHL-003 | UNVERIFIED | U-UI |
| UX-001 | UNVERIFIED | U-UI |
| UX-002 | UNVERIFIED | U-UI |
| UX-003 | UNVERIFIED | U-UI |
| UX-004 | UNVERIFIED | U-UI |
| UX-005 | UNVERIFIED | U-UI |
| UX-006 | UNVERIFIED | U-UI |
| UX-007 | UNVERIFIED | U-UI |
| UX-008 | UNVERIFIED | U-UI |
| UX-009 | UNVERIFIED | U-UI |
| ONB-001 | UNVERIFIED | U-UI |
| ONB-002 | UNVERIFIED | U-UI |
| ONB-003 | UNVERIFIED | U-UI |
| ONB-004 | UNVERIFIED | U-UI |
| OVR-001 | UNVERIFIED | U-UI |
| OVR-002 | PASS | RPT |
| OVR-003 | UNVERIFIED | U-UI |
| OVR-004 | UNVERIFIED | U-UI |
| OVR-005 | UNVERIFIED | U-UI |
| WRK-001 | UNVERIFIED | U-UI |
| WRK-002 | UNVERIFIED | U-UI |
| WRK-003 | UNVERIFIED | U-UI |
| WRK-004 | UNVERIFIED | U-UI |
| PCL-001 | UNVERIFIED | U-UI |
| PCL-002 | UNVERIFIED | U-UI |
| PCL-003 | UNVERIFIED | U-UI |
| PCL-004 | UNVERIFIED | U-UI |
| PCL-005 | UNVERIFIED | U-UI |
| CAS-001 | UNVERIFIED | U-BROAD |
| CAS-002 | UNVERIFIED | U-BROAD |
| CAS-003 | UNVERIFIED | U-BROAD |
| CAS-004 | UNVERIFIED | U-BROAD |
| CAS-005 | PASS | S2R |
| CAS-006 | PASS | S2R |
| CAS-007 | PASS | S2R |
| CAS-008 | PASS | S2R |
| CAS-009 | UNVERIFIED | U-BROAD |
| LOS-001 | PASS | S2R |
| LOS-002 | UNVERIFIED | U-BROAD |
| LOS-003 | PASS | S2R |
| LOS-004 | UNVERIFIED | U-BROAD |
| LOS-005 | PASS | S2R |
| REC-001 | PASS | S2R |
| REC-002 | PASS | S2R |
| REC-003 | UNVERIFIED | U-BROAD |
| REC-004 | PASS | S2R |
| REC-005 | UNVERIFIED | U-BROAD |
| REC-006 | PASS | S2R |
| CUS-001 | PASS | TEN |
| CUS-002 | PASS | S2R |
| CUS-003 | UNVERIFIED | U-BROAD |
| CUS-004 | UNVERIFIED | U-BROAD |
| CUS-005 | UNVERIFIED | U-BROAD |
| CUS-006 | UNVERIFIED | U-EXPORT |
| RUL-001 | PASS | S2R |
| RUL-002 | UNVERIFIED | U-BROAD |
| RUL-003 | UNVERIFIED | U-BROAD |
| RUL-004 | PASS | S2R |
| RUL-005 | PASS | S2R |
| RUL-006 | PASS | S2R |
| RPT-001 | UNVERIFIED | U-REPORT |
| RPT-002 | UNVERIFIED | U-REPORT |
| RPT-003 | UNVERIFIED | U-REPORT |
| RPT-004 | PASS | RPT |
| RPT-005 | UNVERIFIED | U-REPORT |
| INT-001 | PASS | CAT |
| INT-002 | PASS | CAT |
| INT-003 | PASS | CAT |
| INT-004 | PASS | CAT |
| INT-005 | PASS | CAT |
| INT-006 | UNVERIFIED | U-BROAD |
| INT-007 | PASS | PRV, CAT |
| EXC-001 | UNVERIFIED | U-BROAD |
| EXC-002 | UNVERIFIED | U-BROAD |
| EXC-003 | UNVERIFIED | U-BROAD |
| SEA-001 | PASS | TEN |
| SEA-002 | UNVERIFIED | U-BROAD |
| SEA-003 | UNVERIFIED | U-EXPORT |
| SET-001 | PASS | TEN |
| SET-002 | PASS | AUD |
| SET-003 | PASS | S2R |
| SET-004 | UNVERIFIED | U-BROAD |
| CON-001 | PASS | CAT |
| CON-002 | PASS | CAT |
| CON-003 | PASS | TEN |
| CON-004 | PASS | WHK |
| CON-005 | PASS | WHK |
| CON-006 | UNVERIFIED | U-BROAD |
| CON-007 | UNVERIFIED | U-BROAD |
| CON-008 | PASS | WHK |
| CON-009 | PASS | WHK |
| CON-010 | PASS | PRV |
| CON-011 | PASS | CAT |
| FRS-001 | UNVERIFIED | U-BROAD |
| FRS-002 | UNVERIFIED | U-BROAD |
| FRS-003 | PASS | S2R |
| FRS-004 | UNVERIFIED | U-BROAD |
| FRS-005 | UNVERIFIED | U-BROAD |
| IDN-001 | PASS | TEN |
| IDN-002 | PASS | S2R |
| IDN-003 | PASS | S2R |
| IDN-004 | UNVERIFIED | U-BROAD |
| IDN-005 | UNVERIFIED | U-BROAD |
| IDN-006 | UNVERIFIED | U-BROAD |
| IDN-007 | UNVERIFIED | U-BROAD |
| EVD-001 | UNVERIFIED | U-BROAD |
| EVD-002 | UNVERIFIED | U-BROAD |
| EVD-003 | UNVERIFIED | U-BROAD |
| EVD-004 | PASS | S2R |
| EVD-005 | UNVERIFIED | U-BROAD |
| EVD-006 | UNVERIFIED | U-BROAD |
| MET-001 | UNVERIFIED | U-REPORT |
| MET-003 | PASS | S2R, RPT |
| MET-004 | PASS | S2R, RPT |
| MET-005 | PASS | S2R, RPT |
| MET-006 | PASS | S2R, RPT |
| MET-007 | PASS | S2R, RPT |
| MET-008 | PASS | S2R, RPT |
| MET-009 | PASS | S2R, RPT |
| MET-010 | PASS | S2R, RPT |
| MET-011 | PASS | S2R, RPT |
| MET-021 | UNVERIFIED | U-REPORT |
| MET-022 | UNVERIFIED | U-REPORT |
| MET-030 | UNVERIFIED | U-REPORT |
| MET-031 | UNVERIFIED | U-REPORT |
| MET-032 | UNVERIFIED | U-REPORT |
| MET-033 | PASS | RPT |
| STA-001 | UNVERIFIED | U-UI |
| STA-002 | UNVERIFIED | U-UI |
| STA-003 | UNVERIFIED | U-UI |
| STA-004 | PASS | WHK |
| SEC-001 | UNVERIFIED | U-BROAD |
| SEC-002 | PASS | TEN |
| SEC-003 | PASS | TEN |
| SEC-004 | PASS | WHK |
| SEC-005 | PASS | S2R |
| SEC-006 | UNVERIFIED | U-UPLOAD |
| SEC-007 | UNVERIFIED | U-EXPORT |
| SEC-008 | UNVERIFIED | U-BROAD |
| SEC-009 | UNVERIFIED | U-BROAD |
| SEC-010 | UNVERIFIED | U-BROAD |
| PRV-001 | UNVERIFIED | U-BROAD |
| PRV-002 | UNVERIFIED | U-POLICY |
| PRV-003 | PASS | PRV |
| PRV-004 | UNVERIFIED | U-POLICY |
| PRV-005 | UNVERIFIED | U-BROAD |
| AUD-001 | PASS | AUD |
| AUD-002 | PASS | AUD |
| AUD-003 | PASS | AUD |
| AUD-004 | UNVERIFIED | U-BROAD |
| RLY-001 | PASS | WHK |
| RLY-002 | UNVERIFIED | U-BROAD |
| RLY-003 | UNVERIFIED | U-BROAD |
| RLY-004 | PASS | S2R |
| RLY-005 | UNVERIFIED | U-BROAD |
| RLY-006 | UNVERIFIED | U-BROAD |
| PER-001 | UNVERIFIED | U-PERF |
| PER-002 | UNVERIFIED | U-PERF |
| PER-003 | UNVERIFIED | U-PERF |
| PER-004 | UNVERIFIED | U-PERF |
| PER-005 | UNVERIFIED | U-PERF |
| A11Y-001 | UNVERIFIED | U-A11Y |
| A11Y-002 | UNVERIFIED | U-A11Y |
| A11Y-003 | UNVERIFIED | U-A11Y |
| A11Y-004 | UNVERIFIED | U-A11Y |
| OBS-001 | UNVERIFIED | U-OBS |
| OBS-002 | UNVERIFIED | U-OBS |
| OBS-003 | UNVERIFIED | U-OBS |
| CPY-001 | UNVERIFIED | U-BROAD |
| CPY-002 | PASS | S2R |
| CPY-003 | UNVERIFIED | U-BROAD |
| QAT-001 | PASS | S2R |
| QAT-002 | PASS | AUD |
| QAT-003 | PASS | WHK |
| QAT-004 | UNVERIFIED | U-UI |
| QAT-005 | UNVERIFIED | U-EXT |
| QAT-006 | PASS | S2R, RPT |
| QAT-007 | UNVERIFIED | U-UI |
| QAT-008 | UNVERIFIED | U-PERF |
| QAT-009 | UNVERIFIED | U-BROAD |
