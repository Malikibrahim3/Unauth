# Test Failure Remediation — Implementation Handoff

**Audience:** an implementing agent/engineer executing fixes.
**Author context:** produced after a root-cause investigation of the 14 failing test suites on `main` (commit `7f24e2d`). Each item below states the **proven root cause**, the **direction of the fix** (fix code vs. fix test), and an exact change.

> ⚠️ **READ THIS FIRST — non-negotiable guardrails (from `CLAUDE.md`):**
> 1. **DO NOT** change any scoring formula, weighting logic, matching algorithm, or cluster-building logic. This includes `lib/scorer.ts`, `lib/engine/weights.ts`, `lib/engine/fastScore.ts`, `lib/linker.ts`, `lib/processing/clusterExpansion.ts`.
> 2. **DO NOT** make a failing test pass by editing its assertions if that test guards a frozen zone (Part B). Changing those assertions is a product decision, not a mechanical fix.
> 3. No `as any` in production code. No `// eslint-disable`. Server env vars via `lib/utils/env.ts`.
> 4. `lib/processing/chunkedDispatch.ts` is a LOCKED file — do not touch.
> 5. Work top-to-bottom. **Part A is safe to execute now. Part B requires a human decision recorded before you touch anything.**

---

## Baseline & how to verify

- **Current state:** 14 test suites fail (`npx jest`). This is the pre-existing baseline — it is NOT caused by recent integration work.
- **Golden rule:** after each task, run the named suite and confirm it goes green, then run the **full** suite (`npx jest`) and confirm the failing-suite count only went **down** (never introduce a new failure).
- **Typecheck after any code edit:** `npx tsc --noEmit` must stay clean.

| Command | Use |
|---|---|
| `npx jest <path>` | Run one suite |
| `npx jest` | Full suite (watch the `Test Suites:` line) |
| `npx tsc --noEmit` | Type safety |

---

# PART A — SAFE FIXES (execute now)

All four are **test-infrastructure debt**: production code was refactored or hardened, and the tests' mocks / static scans were never updated to match. Fixing the test to reflect the (correct) current production behavior is the right direction. None of these touch a frozen zone.

---

## A1 — `routeSecurity.test.ts`: teach the static scan about non-session auth

**Suite:** `tests/api/routeSecurity.test.ts` → *"every service-role route is explicitly protected…"*

**Root cause (proven):** The test scans service-role route files and only recognizes session auth (`auth.getUser` + `requirePermission`) or HMAC/internal secrets. It flags 12 routes as "missing auth." **All 12 are in fact authenticated** — just by mechanisms the scan doesn't know about. Verified per-route:

| Route(s) | Actual auth mechanism (verified) |
|---|---|
| `app/api/v1/profile-link`, `v1/lookup`, `v1/evidence`, `v1/evidence/[id]/signed-url`, `v1/evidence/[id]/pdf`, `v1/customers` | `validateApiKey(request)` |
| `app/api/v1/evidence/[id]/download` | single-use **signed token** — `parseAndVerifySignedToken` + `merchant_id` match + `used_at` consume |
| `app/api/gorgias/widget`, `gorgias/evidence` | `validateWidgetToken` |
| `app/api/shopify/install`, `shopify/callback` | OAuth handshake — `shopify_oauth_state` cookie (+ `verifyOAuthHmac` on callback) |
| `app/api/cron/process-csv-queue` | `CRON_SECRET` |

**Direction:** Fix the **test** (extend recognized auth). The routes are correct.

**Exact change** — in `tests/api/routeSecurity.test.ts`, immediately **before** the `const hasUserAuth = content.includes('auth.getUser');` block, add:

```js
// Routes legitimately protected by non-session mechanisms (API key, widget
// token, single-use signed token, OAuth handshake, or cron secret).
const hasApiKeyAuth = content.includes('validateApiKey');
const hasWidgetAuth = content.includes('validateWidgetToken');
const hasSignedTokenAuth =
  content.includes('parseAndVerifySignedToken') || content.includes('signedAccess');
const hasOAuthHandshake =
  content.includes('shopify_oauth_state') || content.includes('verifyOAuthHmac');
const hasCronAuth = content.includes('CRON_SECRET');
if (hasApiKeyAuth || hasWidgetAuth || hasSignedTokenAuth || hasOAuthHandshake || hasCronAuth) {
  continue;
}
```

**Done when:** `npx jest tests/api/routeSecurity.test.ts` is green. (The inbox-page sub-test in the same file shares this fix; confirm both pass.)

**Guard against over-fixing:** Do NOT delete the existing checks or blanket-whitelist directories. The scan must still fail for a service-role route with *no* recognized auth. Sanity check: temporarily add a dummy `createServiceClient()` route with no auth and confirm the test flags it; then remove it.

---

## A2 — Scoped-client & isolation tests: update mocks to current PostgREST calls

**Suites:**
- `tests/api/scopedClient.test.ts` (3 cases)
- `tests/security/evidenceIsolation.test.ts` (1 case)
- `tests/security/customerApiMerchantIsolation.test.ts` (2 cases)

**Root cause (proven):**
`lib/supabase/scoped.ts` `applyTenantFilter()` applies the tenant filter for JSONB-array columns via **`builder.or(\`${col}.cs.${JSON.stringify([merchantId])}\`)`**. Real Supabase builders expose `.or()`; the **unit-test mock only defines `.contains`**, so the call throws `builder.or is not a function`. The two security suites use their own `QueryBuilder` mock that likewise doesn't simulate the `.or(...cs...)` containment, so they return the wrong row set. For `customerApiMerchantIsolation`, the merchant-scoping logic **moved out of the route into `lib/api/v1/customers.ts` (`performV1CustomerProfile`)**; the test still statically greps the route file for `from('processing_jobs')`.

> 🔎 **Correction to an earlier verbal report:** Group C was previously called a possible "production data-isolation hole / red line." That was **overstated**. Investigation shows these are **test-infrastructure gaps** — production calls a real PostgREST method that works at runtime, and customer scoping is enforced in the lib layer via the API-key's `merchantId`. There is **no proven leak**. See the recommended live check at the end of A2.

**Direction:** Fix the **tests/mocks**. There is one **optional** production hardening (A2.4) that a reviewer should approve.

### A2.1 `tests/api/scopedClient.test.ts`
Add `.or` to the mock query builder (next to the existing `contains`):
```js
or: jest.fn(() => builder),
```
Then ensure the containment assertion targets `.or` with the exact string production builds:
```js
expect(builder.or).toHaveBeenCalledWith(`merchant_ids.cs.${JSON.stringify([MERCHANT_ID])}`);
```
(Use whatever `MERCHANT_ID` constant the test already defines. Read `lib/supabase/scoped.ts` `applyTenantFilter` to confirm the exact format before writing the assertion.)

### A2.2 `tests/security/evidenceIsolation.test.ts`
The `QueryBuilder` mock needs an `or(expr)` method that records the filter and makes `applyFilters()` honor JSONB containment. Add:
```js
or(expr) { this._orExpr = expr; return this; }
```
and in `applyFilters()`, when `_orExpr` matches `^(\w+)\.cs\.(\[.*\])$`, keep only rows whose `row[col]` array includes the merchant id parsed from the JSON. Expected result returns to `["tx-a"]`.

### A2.3 `tests/security/customerApiMerchantIsolation.test.ts`
The scoping now lives in `lib/api/v1/customers.ts`. **First read that file** to confirm the current scoping mechanism, then point the test at the real source:
```js
import { readFileSync } from 'fs';
const src = readFileSync('lib/api/v1/customers.ts', 'utf-8'); // not the route file
```
Update the assertions to match the **actual** scoping `performV1CustomerProfile` performs.
- If it resolves `processing_jobs` → `job_id` scoping, keep that assertion (now pointed at the right file).
- If it scopes differently (e.g. directly by `merchant_id` on `customer_profiles`), rewrite the assertion to verify *that* mechanism. **Do not force the old `processing_jobs` assertion if the model changed** — assert whatever correctly proves the query is bounded to `authResult.merchantId`.

### A2.4 (OPTIONAL, reviewer-approved) production guard consistency
In `lib/supabase/scoped.ts`, `applyTenantFilter` guards on `typeof builder.contains === 'function'` but calls `builder.or(...)`. The guard should test the method actually invoked:
```js
if (scope.kind === 'jsonb-array' && typeof builder.or === 'function') {
  return builder.or(`${scope.column}.cs.${JSON.stringify([merchantId])}`);
}
```
This is a 1-line correctness tidy, not a behavior change (prod builders have both). **Because this file is the tenant-isolation boundary, get a reviewer's eyes before merging.** If unsure, skip it — the mock fixes above are sufficient to green the suites.

**Done when:** all three suites green; full suite shows no new failures.

**Recommended one-time live assurance (not a code task):** because the automated guard wasn't exercising the real PostgREST path, do a single manual cross-merchant check before onboarding: with two merchants' API keys, call `GET /api/v1/customers?email=` for a customer that exists only under merchant B using merchant A's key, and confirm an empty/forbidden result.

---

## A3 — `getExposureAtRisk` test: mock the current query chain

**Suite:** `tests/unit/merchantHelpers.getExposureAtRisk.test.ts` (3 cases) — returns `null` where a number is expected.

**Root cause (proven):** `lib/supabase/merchantHelpers.ts` `getExposureAtRisk` (line ~906) was refactored to (1) page `processing_jobs` by `merchant_id` via `.range()`, then (2) sum `audit_transactions.order_value` across **two clauses** with `.in('job_id', ids).not('dismissed_by_merchant','is',true).range(...)`. The test's mock doesn't implement `.not()` / `.range()` / the second clause, so a call returns an error shape and the function's error path returns `null`.

**Direction:** Fix the **test mock** to satisfy the current chain. Production logic is sound.

**Exact change:** In the test's Supabase mock, ensure the chained builder supports **all** methods the function calls and returns seeded data:
- `from(PROCESSING_JOBS).select('id').eq('merchant_id', m).range(a,b)` → resolve `{ data: [{id:'job-1'}], error:null }` for the first page, `{ data: [], error:null }` after.
- `from(AUDIT_TRANSACTIONS).select('order_value').in('job_id', ids).not('dismissed_by_merchant','is',true).range(a,b)` → resolve seeded `order_value` rows (mix of string-NUMERIC and `null`, per the existing test intent), empty after first page.

Make each intermediate method (`select`, `eq`, `in`, `not`, `range`) return the builder (`this`/`builder`) and only the terminal page-fetch resolve. Read the current mock and add the missing methods rather than rewriting wholesale.

**Done when:** all 3 cases green: 150.00 sum, combined-clause no-double-count, and null-`order_value` skipped without error.

---

## A4 — Soft-delete compliance (2 cases)

**Suite:** `tests/compliance/softDelete.test.ts`

### A4.1 Hard-delete static scan — add an intentional-delete allowlist
**Root cause (proven):** The scan (regex `/\.from\s*\([^;]*?\.delete\s*\(/s`) flags **any** `.from().delete()` and currently catches two **legitimate** hard deletes:
- `app/api/settings/api-keys/route.ts` — a **rollback**: if widget-token insert fails, the just-created API-key row is deleted so no orphaned partial key remains. Hard delete is correct here.
- `app/api/cron/purge-expired-audits/route.ts` — a **retention purge** of expired audits (deliberate, compliance-required).

**Direction:** Fix the **test** — add an allowlist for files where hard delete is intentional.

**Exact change:** define an allowlist and skip those files in the scan loop:
```js
const INTENTIONAL_HARD_DELETE = [
  'app/api/settings/api-keys/route.ts',          // rollback of partial key creation
  'app/api/cron/purge-expired-audits/route.ts',  // retention purge
];
// inside the per-file loop:
if (INTENTIONAL_HARD_DELETE.includes(relPath)) continue;
```

### A4.2 Team-member soft-delete — **requires a 1-line schema decision** ⚠️
**Root cause (proven):** The test expects removing a team member to set **`deleted_at`** (it asserts `state.rows.merchant_members[0].deleted_at` is a timestamp and expects HTTP 200). The handler `app/api/team/[memberId]/route.ts` `DELETEHandler` instead sets **`invite_status: 'revoked'`** (and uses `as any`). The test returns 500 because the handler's behavior and query chain diverge from what the mock models.

**This is NOT a blind mechanical fix** — the two represent different soft-delete conventions. **Decide first:**

> **DECISION D-TEAM:** What is the canonical soft-delete for an *accepted* `merchant_members` row?
> - **(a) `deleted_at` timestamp** — then fix the **handler**: set `{ deleted_at: <iso> }` for accepted members (keep `invite_status:'revoked'` only for pending invites), ensure the team **GET** filters `deleted_at IS NULL`, and remove the `as any` by typing the update. Test stays as-is.
> - **(b) `invite_status:'revoked'`** — then fix the **test** to assert `invite_status === 'revoked'` instead of `deleted_at`, and update the mock chain (`.neq(...)`) so the handler returns 200.

Confirm by inspecting the `merchant_members` migration/schema (search `supabase/migrations` for the table) for which column exists. Implement only the matching branch. **No `as any`** in whichever code path you touch.

**Done when:** both `softDelete` cases green and `npx tsc --noEmit` clean.

---

# PART B — FROZEN ZONE (decision required BEFORE any edit)

These 8 failing-suite entries (Groups A, E, B) all sit on logic that `CLAUDE.md` explicitly freezes. **The tests are failing because production scoring/cluster/limit values were changed after the tests were written.** "Fixing" them means choosing whether the **new code** is correct (→ update the test expectations, blessing the change) or the change was a **regression** (→ revert the code). That choice is a product/eng-lead decision and must be **recorded by a human** before an implementer touches anything. Do not guess. Do not edit weights, thresholds, the linker, or the locked invariant to chase green.

For each, the implementer's job is: (1) surface the decision, (2) once answered, execute the single approved branch, (3) verify.

---

## B1 — Identity scorer calibration drift (5 suites)

**Suites:** `tests/engine/identityScoring.test.ts`, `tests/identity/scoringModel.blind.test.ts`, `tests/engine/ip_clustering_guard.test.ts`, `tests/identity/blindCsvHarness.test.ts`, `tests/identity/uiSummary.test.ts`.

**Evidence (proven):** `lib/scorer.ts` `SCORER_INTERNAL_SIGNAL_WEIGHTS` currently sums `phone:30 + account:25 + email:35 + ip:8 = 98` for `["phone","account","email","ip"]`. The test expects **95** with the comment `// 30+30+25+10` — i.e. it encodes an **older** weight table (`email:30`, `ip:10`). `lib/engine/weights.ts` was last modified **2026-05-26** ("Add post-delivery claim rate signal"); the scorer tests haven't been touched since **2026-05-05**. The downstream blind/UI/cap suites fail for the same reason — score and grade distributions shifted with the recalibration.

> **DECISION D-SCORER:** Is the current weighting (email 30→35, ip 10→8, plus the post-delivery-claim-rate signal) the intended calibration?
> - **(a) Yes, blessed** → update the **test expectations** to the current outputs (recompute each expected score/grade from the live weights; fix the stale `// 30+30+25+10` comments). This is a deliberate re-baseline and should be reviewed by whoever owns scoring.
> - **(b) No / unknown** → treat as a regression and have the scoring owner restore the intended weights in `lib/engine/weights.ts` / `lib/scorer.ts`. **An implementing agent must not pick the numbers.**

**Until D-SCORER is recorded, do not modify these files or their tests.**

---

## B2 — Cluster expansion (1 suite, 3 cases)

**Suite:** `tests/linker/clusterExpansion.test.ts` — e.g. `ORD-633229` no longer joins `bell-seed-cluster`; the "≥2 suspicious rows to promote" guard changed.

**Evidence (proven):** This suite exercises `lib/processing/clusterExpansion.ts` / `lib/linker.ts`. Commit **`4bd348e` "Improve processing scalability and lookup hardening"** changed `lib/linker.ts` (~39 lines) and `lib/engine/fastScore.ts` and adjusted `tests/engine/linker.test.ts` — but **not** this cluster-expansion suite. So cluster-formation behavior moved under a test that still encodes the prior behavior. Cluster-building logic is **frozen** by `CLAUDE.md` rule #1.

> **DECISION D-CLUSTER:** Was the `4bd348e` linker change intended to alter cluster formation?
> - **(a) Yes** → update `clusterExpansion.test.ts` expectations to the new, correct clustering (owner-reviewed).
> - **(b) No** → it's a regression in the lookup-hardening change; the linker owner repairs `lib/linker.ts` / `clusterExpansion.ts`.

**Until D-CLUSTER is recorded, do not modify the linker, clusterExpansion, or this suite.**

---

## B3 — `MAX_ROWS` locked invariant (1 suite)

**Suite:** `tests/processing/chunked-pipeline.test.ts` — *"MAX_ROWS supports millions"* expects `>= 1_000_000`; `lib/processing/streamParser.ts:20` is `MAX_ROWS = 500_000`.

**Evidence (proven):** `MAX_ROWS` was set to `500_000` on **2026-05-25** (`e5fdc43` "app audit deployment"); the invariant test (expecting 1M) predates it (2026-05-13). Lowering the streaming-parse cap has **memory/Supabase implications** — it may be a deliberate safety cap.

> **DECISION D-MAXROWS:** Is the 500k cap intended?
> - **(a) Yes, deliberate cap** → update the invariant to `>= 500_000`, **and** add a visible `log()`/warning where rows are truncated so large uploads don't silently lose data (the audit flagged silent truncation as the real merchant risk).
> - **(b) No, should support 1M+** → restore `MAX_ROWS = 1_000_000` only after confirming the serverless function's memory ceiling tolerates it under the chunked pipeline.

**Note:** `lib/csv/parse.ts` has a separate `MAX_ROWS = 100_000` for the non-streaming path — that is a different constant; do not conflate. **Do not touch `lib/processing/chunkedDispatch.ts` (LOCKED) regardless.**

---

# Execution order & final verification

1. **Part A** (no decisions needed): A1 → A2 → A3 → A4.1. Then resolve **D-TEAM** and do A4.2.
2. Record decisions **D-SCORER, D-CLUSTER, D-MAXROWS** with the scoring/processing owner.
3. Execute only the approved branch of each Part B item.
4. **Final gate:**
   - `npx tsc --noEmit` → clean
   - `npx jest` → **0 failing suites** (or: only suites whose Part B decision was deferred, explicitly listed)
   - `npx eslint .` on changed files → clean (no new `as any`, no disables)
5. Commit Part A and Part B separately (Part B commits should reference the recorded decision).

## Quick reference: failure → bucket

| Suite | Group | Bucket | Direction |
|---|---|---|---|
| `routeSecurity` | D | **A1** | fix test (recognize alt auth) |
| `scopedClient` | C | **A2.1** | fix mock (+ optional A2.4) |
| `evidenceIsolation` | C | **A2.2** | fix mock |
| `customerApiMerchantIsolation` | C | **A2.3** | fix test target |
| `merchantHelpers.getExposureAtRisk` | G | **A3** | fix mock |
| `softDelete` (scan) | F | **A4.1** | fix test (allowlist) |
| `softDelete` (team member) | F | **A4.2** | decision D-TEAM, then code or test |
| `identityScoring` | A | **B1** | decision D-SCORER |
| `scoringModel.blind` | A | **B1** | decision D-SCORER |
| `ip_clustering_guard` | A | **B1** | decision D-SCORER |
| `blindCsvHarness` | A | **B1** | decision D-SCORER |
| `uiSummary` | A | **B1** | decision D-SCORER |
| `clusterExpansion` | E | **B2** | decision D-CLUSTER |
| `chunked-pipeline` (MAX_ROWS) | B | **B3** | decision D-MAXROWS |
