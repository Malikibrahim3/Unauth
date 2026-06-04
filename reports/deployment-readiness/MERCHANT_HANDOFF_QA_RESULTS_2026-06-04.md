# Merchant Handoff QA Results

Date: 2026-06-04  
Release candidate SHA: `9f745c86eafdca5acd866960bfb64ef7014beaa8`  
Scope: Executed automated and environment-feasible merchant handoff checks from the QA checklist and implementation plan.

## Verdict

Overall decision: **NO-GO** for merchant handoff.

This is not a close call. The release currently fails three top-level launch gates:

1. Build integrity is broken.
2. Dependency/security integrity is broken.
3. Test integrity is broken across merchant-critical areas including route security, billing, widget JSON, claims metrics, and scoring behavior.

There are also environment gaps that block parts of the staging validation surface:

- `IDENTITY_SALT` missing
- `NEXT_PUBLIC_APP_URL` missing
- Upstash Redis vars missing
- Stripe secrets missing
- Playwright merchant account creation unstable in Supabase from this environment

## Release Context

- Working tree status: only the two new readiness docs were untracked.
- Node: `v22.14.0`
- npm: `10.9.2`
- `.env.local` exists.

## Executed Checks

### Core gates

| Check | Result | Notes |
| --- | --- | --- |
| `npm audit --audit-level=moderate` | Fail | 4 vulnerabilities: 1 high (`next`), 3 moderate (`brace-expansion`, `postcss`, `ws`) |
| `npm run build` | Fail | TypeScript build error in `app/(app)/customers/page.tsx` using `TABLES.MERCHANT_CLAIMS` which is not defined |
| `npm test -- --runInBand` | Fail | 12 failed suites, 32 failed tests, 122 passed suites, 1204 passed tests |

### Secondary automated gates

| Check | Result | Notes |
| --- | --- | --- |
| `npm run audit:security` | Pass with severe findings | Scanner runs, but reports 866 active findings |
| `npm run test:merchant-readiness` | Pass | Identity blind harness passed: 8 suites, 64 tests |
| `npm run audit:identity` | Pass | Script returned success and wrote `identity-jest-output.txt` |
| `npm run audit:csv` | Fail | Script cannot resolve `@/lib/utils/env` under `ts-node` |
| `npm run docs:check` | Pass | README fraud signals table is in sync |
| `npm run test:critical` | Blocked / incomplete | Initially failed with no local app at `localhost:3000`; rerun against local dev server got past login page probe but did not complete cleanly |
| `npm run test:compliance` | Fail / blocked by env | One run timed out reaching `localhost:3000/login`; rerun with local dev server failed creating test merchant account in Supabase |
| `npm run smoke:support-intake` | Fail | Missing required env var `IDENTITY_SALT` |
| `npm run build:extension` | Pass | Extension builds successfully |

## Hard Failures

### 1. Dependency gate failed

`npm audit --audit-level=moderate` failed with:

- `next`: high severity advisory set
- `brace-expansion`: moderate
- `postcss`: moderate
- `ws`: moderate

Impact:

- This alone blocks merchant handoff under the checklist.

### 2. Build gate failed

`npm run build` failed on:

- [app/(app)/customers/page.tsx](/Users/malikibrahim/Downloads/Unauth/app/(app)/customers/page.tsx:197)

Failure:

- `TABLES.MERCHANT_CLAIMS` is referenced, but [lib/supabase/tables.ts](/Users/malikibrahim/Downloads/Unauth/lib/supabase/tables.ts:1) does not define `MERCHANT_CLAIMS`.

Impact:

- Production build is not shippable.

### 3. Test integrity failed

Full Jest run result:

- 12 failed suites
- 32 failed tests
- 122 passed suites
- 1204 passed tests

The failing areas are merchant-significant, not low-risk cleanup.

## Highest-Risk Test Failures

### Route and permission security regressions

`tests/api/routeSecurity.test.ts` failed on multiple fronts:

- Service-role guardrail violations reported in:
  - `app/api/woocommerce/webhooks/route.ts`
  - `app/api/nav-counts/route.ts`
  - `app/api/gorgias/support-webhook/route.ts`
  - `app/api/bigcommerce/webhooks/route.ts`
  - `app/api/bigcommerce/install/route.ts`
  - `app/api/bigcommerce/callback/route.ts`
- `/inbox` contract tests fail because [app/(app)/inbox/page.tsx](/Users/malikibrahim/Downloads/Unauth/app/(app)/inbox/page.tsx:1) is now a redirect-only alias, while tests still expect the old protected inbox implementation.
- `countMerchantReviewQueueProfiles` behavioral tests now return `0` where distinct profile counts were expected.
- Dashboard fail-closed copy expectation failed: `"Unavailable"` is not present in the current dashboard source the way the test expects.

Impact:

- This is a direct merchant-safety problem because it mixes real security concerns with stale-but-important route contract breaks.

### Widget JSON export contract broken

`tests/lib/gorgiasFindMerchantCustomer.test.ts` and `tests/lib/gorgiasWidgetJson.test.ts` fail because:

- `gorgiasWidgetModelToJson` is not exported as the tests expect from [lib/gorgias/widgetJson.ts](/Users/malikibrahim/Downloads/Unauth/lib/gorgias/widgetJson.ts:1)

Impact:

- Gorgias widget serialization contract is broken or has been renamed without test alignment.
- This is merchant-facing if the helpdesk/widget surface is exposed.

### Billing and credits regressions

`tests/lib/billingActivation.test.ts` and `tests/lib/resolveMonthlyCreditAllowance.test.ts` fail because:

- Free-tier allowance resolves to `100` instead of expected `50`

`tests/lib/contextUnlockFlow.test.ts` fails because:

- Subscription lookup now requires a real `.from()`-capable Supabase client path where the test harness expected lighter behavior

Impact:

- Plan entitlements and context credit behavior are not stable enough for paid merchant rollout.

### Claims reporting regression

`tests/lib/claimsReporting.test.ts` fails because:

- `resolvedClaims` returned `0` instead of expected `1`

Impact:

- Claims metrics, dashboards, or reporting can be lying about operational status.

### Scoring behavior regressions

`tests/engine/returns_vs_friendly_fraud.test.ts` fails because:

- Friendly-fraud scenarios no longer land in the expected high/critical range
- Single refund scenario no longer stays low/medium as expected

`tests/engine/postDeliveryClaimRate.test.ts` fails because:

- Low-evidence INR scenario scores too high
- Repeated post-delivery INR target row does not produce the expected tier at the checked index/path

Impact:

- Risk scoring behavior has shifted enough to invalidate some merchant-facing review semantics.

### App route registry mismatch

`tests/lib/appRoutes.test.ts` fails snapshot because:

- `Watchlist` disappeared from the sidebar labels

Impact:

- This may be intentional product change, but the contract and test suite are out of sync.

### Merchant isolation contract drift

`tests/api/merchantIsolation.test.ts` fails because:

- Watchlist retirement page no longer matches the old merchant-scoped implementation assumptions.

Impact:

- Likely part stale test, part route deprecation contract drift. Still needs explicit resolution before release because isolation tests are meant to be crisp.

### Webhook response contract changed

`tests/api/gorgiasWebhookLogs.test.ts` fails because:

- Invalid payload response now includes an extra `rejection` object beyond the expected `{ ok: false, error: 'invalid_ticket_payload' }`

Impact:

- This is probably safe behaviorally, but the contract changed and should be intentional/documented.

## Environment And Staging Gaps

From the local environment check:

- `NEXT_PUBLIC_SUPABASE_URL`: set
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: set
- `SUPABASE_SERVICE_ROLE_KEY`: set
- `IDENTITY_SALT`: missing
- `NEXT_PUBLIC_APP_URL`: missing
- `UPSTASH_REDIS_REST_URL`: missing
- `UPSTASH_REDIS_REST_TOKEN`: missing
- `STRIPE_SECRET_KEY`: missing
- `STRIPE_WEBHOOK_SECRET`: missing

Observed consequences:

- Rate limiter falls back to in-memory mode during tests and warns it is not suitable for production.
- `smoke:support-intake` hard-fails on missing `IDENTITY_SALT`.
- Playwright setup is unstable because it relies on real Supabase user creation and a reachable base URL.

## Security Audit Snapshot

`npm run audit:security` completed and reported:

- `service-role`: 322 active
- `csv-export`: 295 active
- `broad-select`: 100 active
- `fixed-limit`: 13 active
- `unsafe-html`: 27 active
- `banned-language`: 109 active
- Total active findings: 866

Suppressed findings:

- Total suppressed: 448

Interpretation:

- The scanner running successfully is good.
- The actual result is still far above anything acceptable for merchant handoff.

## Positive Signals

These passed and are worth keeping in view:

- `npm run test:merchant-readiness`
  - Identity blind merchant harness passed cleanly.
- `npm run audit:identity`
  - Identity targeted audit passed.
- `npm run docs:check`
  - Signal documentation is in sync.
- `npm run build:extension`
  - Chrome extension packages successfully.

This suggests the release is not uniformly unstable. The breakage clusters around:

- route/security contracts
- billing/credits
- claims metrics
- widget serialization
- build/table constant drift
- environment completeness

## Checks Blocked By Environment Or External Services

These could not be cleanly concluded from the current environment:

- Full Playwright critical-path validation
  - blocked by missing local server on first run
  - then partially blocked/stalled after login-page setup on rerun
- Playwright compliance validation
  - one run failed with app not reachable at `localhost:3000`
  - rerun failed creating test merchant account in Supabase
- Support intake smoke
  - blocked by missing `IDENTITY_SALT`
- Stripe/billing external validation
  - blocked by missing Stripe secrets
- Production-grade rate-limit behavior
  - blocked by missing Upstash env vars

## Immediate Fix List Before Re-Running Merchant Handoff QA

1. Fix build break:
   - resolve `TABLES.MERCHANT_CLAIMS` usage vs table constant source of truth.

2. Close or intentionally re-baseline route contract changes:
   - `/inbox` alias tests
   - watchlist deprecation tests
   - dashboard unavailable-state expectations

3. Resolve service-role guardrail violations surfaced by `tests/api/routeSecurity.test.ts`.

4. Restore or intentionally rename the Gorgias widget JSON export contract:
   - `gorgiasWidgetModelToJson`

5. Fix billing allowance regressions:
   - free-plan allowance mismatch
   - context unlock flow harness compatibility

6. Fix claims metrics regression:
   - resolved claim counting

7. Reconcile scoring regressions in:
   - returns vs friendly fraud
   - post-delivery claim rate

8. Make the CSV benchmark script runnable:
   - fix `@/` alias resolution in `scripts/deployment-readiness/run-benchmarks.ts`

9. Complete environment requirements:
   - `IDENTITY_SALT`
   - `NEXT_PUBLIC_APP_URL`
   - Upstash vars
   - Stripe vars

10. Re-run Playwright against a stable staging or local app with healthy Supabase test account provisioning.

## Bottom Line

Merchant handoff should not happen from this release candidate.

The strongest blockers are:

- production build is broken
- security/dependency gate is red
- merchant-critical tests are red
- staging/test environment is incomplete for several operational surfaces

The next best move is not broader manual QA. It is a focused stabilization pass on the failed gates above, followed by a fresh rerun of the same checklist.
