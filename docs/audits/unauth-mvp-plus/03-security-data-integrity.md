# 03 — Security & Data Integrity

**Coverage:** Deep, agent-verified (Security/Isolation/Privacy/Audit domain agent) plus lead spot-checks of the scoped client, Shopify webhook, RSC page authorization, and the RBAC model. **Confidence: high.** Runtime/live cross-tenant behaviour is *not* exercised (static + test-gate only) and is flagged where relevant.

This file distinguishes **proven vulnerabilities** from **suspected risks requiring verification**, as required.

---

## A. Headline

Isolation and financial-history *architecture* are sound where reviewed — `createScopedClient` fails closed, financial/event history is append-only at the DB layer, credentials are AES-256-GCM encrypted, and evidence downloads use expiring single-use signed tokens. **No proven cross-tenant leak, financial corruption, or secret exposure was found in the paths examined.** The gaps are **assurance and systematisation**: isolation is enforced by hand-written convention on ~163/179 routes rather than by RLS or the scoped client; the authenticated cross-merchant boundary is never tested live; and the audit trail is fire-and-forget and incomplete. By the contract's P0 bar these still block launch.

---

## B. Authentication & session handling

- RSC pages resolve auth via `lib/auth/requestContext.ts` (`getRequestUser` → `getRequestCallerContext` → `requirePagePermission`), memoised per request with `react.cache`. `requirePagePermission` returns the caller context only when `hasPermission` passes, else `null`; pages `redirect` on `null` (e.g. `app/(app)/dashboard/page.tsx:26-33`, `app/(app)/claims/page.tsx`). **Authorization is enforced server-side.**
- API routes use `requirePermission(serviceClient, user.id, PERMISSION)` returning `{ denied, ctx }`, with `if (denied) return denied` (e.g. `app/api/claims/[claimId]/decision/route.ts:28-29`). Verified pattern across mutation routes.
- **Finding (Low, release-confidence):** the RSC auth refactor (`lib/auth/requestContext.ts`) is **uncommitted/untracked** and two `routeSecurity` tests still assert the *old* `{ denied }` page pattern, so they fail red even though enforcement is intact and arguably improved (the new context honours the active-merchant cookie, fixing a cross-workspace layout/data mismatch). *Fix the tests, commit the refactor.* → SEC-002, SEC-010.
- **Not verified:** password reset / session expiry / MFA (out of the authenticated-product scope per contract §0, but the login handoff was not exercised).

## C. Tenant isolation (SEC-001, SEC-010, GOV-012, SCN-013)

**Status: PARTIAL / High.**

- **Strength:** `lib/supabase/scoped.ts` `createScopedClient` is genuinely fail-closed — an unclassified table **throws** rather than running an unscoped service-role query; it auto-injects `.eq('merchant_id', …)` on select/update/delete, sets it on insert/upsert, and rejects a caller-supplied `merchant_id` that mismatches the scope. `tests/api/scopedClient.test.ts` is a static guard over this.
- **Gap:** only **16 of 179** API route files use `createScopedClient`; ~163 call `createServiceClient()` directly and rely on a **hand-written `.eq('merchant_id', ctx.merchantId)`**. RLS (`enable row level security`) is present on only **~32 tables / ~88 policies** (`is_merchant_member()` exists, migration `20260711120000`). Because the service role bypasses RLS, most canonical tables are isolated **only by the code path**, with no DB backstop. A single omitted filter leaks or mutates another tenant's rows.
- **Gap (assurance):** the only cross-tenant DB test, `tests/security/sourceAgnosticRls.test.ts`, is **skipped** (RUN_LIVE_DB gate) and even when run checks anon rejection + service-role read, **not** authenticated merchant-A-vs-B reads. The real SCN-013 attack is never exercised end-to-end.
- **Reviewed vectors that ARE correctly scoped:** customer search resolves only merchant-owned profile IDs; evidence download requires `token.merchant_id === row.merchant_id`; connector callbacks resolve the connection by `merchant_id`; `requirePermissionForMerchant` binds an OAuth callback to a pre-selected merchant. Broad unit isolation suites exist (`evidenceIsolation`, `customerApiMerchantIsolation`, `connectorOwnershipIsolation`, `multiProviderScenarioIsolation`, `sourceRecordTenantIsolation`, `shipbobWebhookIsolation`).
- **Recommendation:** route all merchant I/O through the scoped client **or** add `is_merchant_member` RLS to every `merchant_id` table; add a static lint/test forbidding raw `createServiceClient().from(<merchant table>)` without a filter; add a **live authenticated two-merchant suite** across routes/search/exports/storage/jobs/callbacks; un-skip the RLS test. Standardise not-found responses so existence never leaks (404 vs 403).

## D. Authorization & roles (SEC-002, ACC-*)

- `lib/permissions/index.ts` defines a capability model + four roles (owner/admin/analyst/viewer) + delegated `user_permission_grants`. `resolveCallerContext` reads `merchant_users` by `user_id` + `invite_status='active'`.
- **Finding (Medium, lead):** the **viewer** role default-grants `EXPORT_AUDIT`, `VIEW_SETTINGS`, `VIEW_TEAM`, and several legacy view capabilities. Contract §4.2 makes viewer view-only "where granted" and audit/export explicitly *grant-gated*. Viewer is over-permissioned by default. → ACC-002, PRV-006.
- **Finding (Medium, legacy):** the permission set still carries fraud-product capabilities — `VIEW_WATCHLIST`, `VIEW_CHARGEBACKS`, `MANAGE_WATCHLIST`, `SUBMIT_FRAUD_FEEDBACK`, `LOOKUP_CUSTOMER` — from the pre-pivot product. → see `06-feature-inventory.md` legacy register.
- **Not verified:** ACC-005 last-owner protection & ownership transfer; ACC-006 grant revocation latency; ACC-007 multi-workspace active-workspace selection — the team/account routes were not fully read in this pass.

## E. Secrets & external credentials (SEC-005)

**Status: PARTIAL / Medium.**

- **Strength:** integration credentials are AES-256-GCM encrypted at rest (`lib/integrations/secrets.ts`); Zendesk stores only a `webhook_secret_hash` compared with `timingSafeEqual`; credentials are decrypted server-side only; account deletion purges `integration_credentials`.
- **Gap:** support-webhook secrets (Gorgias/Zendesk/Freshdesk) can be supplied via **URL query param** (`*_WEBHOOK_SECRET_QUERY_PARAM`), landing in server/proxy access logs and browser/referrer history. The AES key is derived from `INTERNAL_HMAC_SECRET || IDENTITY_SALT` (coupling to the identity salt).
- **Not fully verified:** that credential-create responses never echo the plaintext secret after first issuance across all settings routes.
- **Operational note:** `docs/SECURITY.md` already flags that dev/hosted credentials were exposed in a prior diagnostic session and must be rotated — treat this as an open operational P0 independent of code.

## F. Webhook verification (SEC-004)

**Status: PARTIAL / Medium.**

| Provider | Signature before parse? | Replay defence | Notes |
|---|---|---|---|
| Shopify | ✅ HMAC before parse (`app/api/shopify/webhooks/route.ts:34-37`) | ✅ `claimProcessedWebhook` idempotency | Rate-limited; **lead-verified**. |
| Stripe | ✅ `constructStripeEvent` before handling | Stripe SDK | Internal billing webhook. |
| WooCommerce | ✅ HMAC before `JSON.parse` | ✅ processed-webhook dedupe | |
| ShipBob | ✅ Svix-style id+timestamp+signature before enqueue | ✅ dedupe | |
| **BigCommerce** | ❌ **`JSON.parse` at line 29 BEFORE verify at line 56** | dedupe | Parses untrusted body pre-verify. |
| **Gorgias / Zendesk / Freshdesk** | ❌ static shared secret checked **after** `request.json()` | ❌ **none** (no timestamp/nonce) | Secret also acceptable via query param. |

**Recommendation:** verify signature/secret before any parse (BigCommerce + support providers); add timestamp+nonce or per-delivery dedupe to support webhooks; header-only secrets.

## G. Uploads (SEC-006) — PARTIAL / Medium (low confidence)

- Evidence PDFs are served from a private bucket via a server route with `Content-Disposition: attachment` + `Cache-Control: private`; canonical intake body is capped at 512 KB.
- **Not verified:** MIME/size/content validation on the merchant document and pack-confirmation-photo upload endpoints (`integration_documents`, `pack_confirmations`, `claim_evidence`) — only the evidence-PDF *read* path was confirmed. Flagged as a suspected risk pending review.

## H. Exports (SEC-007) — PARTIAL / Medium

- **Strength:** `lib/api/v1/issueEvidenceDownloadUrl.ts` checks ownership via the scoped client before minting a **15-minute single-use** signed token (`evidence_download_tokens`); the download route verifies signature, expiry, merchant match, and single-use before streaming.
- **Gap (defect):** neither token issuance nor download writes an audit event — exports are unaudited, contradicting SEC-007/AUD-001.

## I. CSRF / rate-limiting (SEC-008) — PARTIAL / Medium (low confidence)

- Broad rate-limiting (`enforceRateLimit`) on webhooks, evidence PDF, account delete (3/hr), search entitlement gating. Account delete requires the typed phrase `DELETE` + owner-only `GRANT_PERMISSIONS`.
- **Not verified / suspected gap:** no explicit CSRF token mechanism found; state-changing POSTs depend on the Supabase auth cookie's `SameSite` setting (not inspected). No step-up re-auth for the most destructive actions.

## J. PII in logs/URLs (SEC-009) — PARTIAL / Medium

- **Good:** webhook error logging uses category-only codes, not payloads.
- **Proven gap:** `app/api/customers/search/route.ts:42` reads the search term `q` from the **GET URL query string** while wrapped in `withRequestLogging` — so a customer email/name entered as a search term is written to request logs, proxy access logs, and browser history. Plus the webhook-secret-in-URL issue (§E). *Move search to POST/hashed; header-only secrets; strip query strings from logs.*

## K. Consent & suppression

- **Not verified.** The contract's consent/suppression surface (MET/CPY around communication eligibility) is thin because Unauth does not send customer communications at MVP+ (it records decisions; the merchant communicates via its own channels — GOV-001/SCP-103). No customer-messaging pipeline was found to audit, which is consistent with scope. Flag for the deferred journeys audit to confirm no eligibility gate is implied elsewhere.

## L. Idempotency & duplicate prevention

- **Strength (lead + agent):** `claimProcessedWebhook`/`processed_webhooks` dedupes Shopify/Woo/BigCommerce/ShipBob deliveries; the Shopify route short-circuits duplicates. Financial reversal is modelled as an appended entry, not a mutation.
- **Not verified:** the full ingestion→domain-event→projection outbox (RLY-004), retry/backoff/dead-letter behaviour (RLY-002/003), and out-of-order event handling (SCN-002) — this was the `ingestion-jobs-idempotency-reconcile` domain agent that did not complete.

## M. Financial & analytics correctness (cross-referenced from `01`/`04`)

- **PASS/strong (lead-verified):** append-only ledger + reversal (FIN-018), minor-units + ISO currency (FIN-015), per-currency separation with no cross-currency sum (FIN-016), `outstanding = max(0, recoverable − recovered − written_off)` (FIN-011), recovery board completeness (REC-001), one shared metric service for dashboard + reports (RPT-004/MET-033).
- **Not verified:** the SCN-009 end-to-end arithmetic (£100→£50 paid→£30 write-off→net £50) against a live case; FIN-013 (stage measures never summed) in every UI surface; MET-031 (0-denominator shows "unavailable"); the report drill-down/export reconciliation (RPT-001/002/003). Owned by the un-run financial-metrics agent — see `01`.

## N. Data deletion & retention (PRV-002, PRV-003, PRV-004)

- **Strength:** full account deletion is thorough and FK-safe — purges storage prefixes + ~90 tables + a flag-gated `purge_merchant_source_agnostic` RPC for the append-only tables (`app/api/account/delete/route.ts`; migration `20260711121000`). Owner-only.
- **Gap (defect, Medium):** merchant-facing bulk removal targets **legacy tables only** (`customer_notes`, `watchlist_entries`, `processing_jobs`) — not the canonical v2 data. → PRV-002.
- **Gap (MISSING, Medium):** **no per-customer (data-subject) erasure/pseudonymisation** endpoint; only whole-account deletion. A merchant cannot honour an individual erasure request while preserving financial/audit history. → PRV-004.
- **Gap (defect, Low):** `app/api/cron/purge-expired-audits` is a permanent **no-op** (`{deleted:0, retired:true}`), so the retention claims on the Data & Privacy page are enforced by no job.

## O. Audit trail & historical integrity (AUD-001..005) — PARTIAL / High

- **Strength:** `case_financial_entries` and `domain_events` are append-only via DB triggers; config versions immutable (`merchant_rule_versions`, `workflow_definitions`); `logAction` writes `user_action_log` with merchant/actor/role/action/resource/metadata/ip + recorded time; the security log is separately permissioned (`VIEW_AUDIT_TRAIL`, admin/owner only).
- **Gap (defect, High):** `logAction` is **fire-and-forget** — never awaited, never throws, only `console.error` on failure — so a failed audit insert is silently lost. Its action enum **omits** payout decisions, financial reversals/corrections, attribution edits, recovery transitions/amounts, identity links, rule/flow publishes, and evidence exports/downloads. → AUD-001, GOV-009.
- **Gaps:** no correlation/idempotency id or distinct effective-vs-recorded time on audit rows (AUD-002); no explicit `actor_type` system/user discriminator in a unified stream (AUD-003); the "more complete" security log is not demonstrably a superset of the operational timeline (AUD-004); audit-export content not verified (AUD-005, UNVERIFIED).

## P. Proven vs suspected (summary)

**Proven (evidenced) gaps:** customer-search PII in GET URL (SEC-009); webhook-secret-in-URL (SEC-005/009); BigCommerce parse-before-verify + support-webhook secret-after-parse with no replay defence (SEC-004); fire-and-forget/incomplete audit (AUD-001); exports unaudited (SEC-007); merchant removal hits legacy tables only (PRV-002); no subject erasure (PRV-004); retention cron is a no-op; scoped client used by only 16/179 routes (SEC-001).

**Suspected — needs verification:** upload endpoint validation (SEC-006); CSRF/SameSite posture (SEC-008); whether any AUD-001 action is captured operationally rather than in the security log; whether the generic disconnect route succeeds for Zendesk/Freshdesk; the full ingestion outbox/retry semantics (RLY-*).

**No evidence of:** a cross-tenant data leak, financial-history mutation, or plaintext secret returned to the browser, in the paths reviewed.
