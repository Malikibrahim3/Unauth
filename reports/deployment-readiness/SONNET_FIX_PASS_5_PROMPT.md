# Sonnet Fix Pass 5 Prompt

You are fixing the fifth-pass enterprise readiness audit for a Next.js + Supabase app handling sensitive merchant/customer/order data.

The tests are green, but the app is still not at the requested 9-10/10 enterprise bar. Do not optimize for green tests. Fix the truthful remaining issues and add tests that would have caught them.

Read first:

- `reports/deployment-readiness/FIFTH_PASS_AUDIT.md`
- `reports/deployment-readiness/FOURTH_PASS_AUDIT.md`
- `reports/deployment-readiness/NPM_AUDIT_MITIGATIONS.md`

Fix in this order.

## 1. Fix raw PostgREST filter interpolation everywhere

`app/api/customers/search/route.ts` is still unsafe:

- It sets `const like = \`%${q}%\`;`
- It calls `.or(\`primary_email.ilike.${like},names.cs.{${q}}\`)`
- It does not import or use `escapePostgrestFilterValue`.

Fix it.

Requirements:

- Import and use `escapePostgrestFilterValue`.
- Do not place raw `q` into `.or()` strings.
- Prefer avoiding composite `.or()` if possible.
- Keep merchant scoping via `.contains('merchant_ids', [ctx.merchantId])`.
- Keep auth + `requirePermission(..., PERMISSIONS.VIEW_CUSTOMERS)`.
- Add tests that feed commas, parentheses, braces, double quotes, single quotes, percent signs, backslashes, and combined hostile input, and assert those raw values never appear in the generated `.or()` filters.

## 2. Fix incomplete escaping in the customers page

`app/(app)/customers/page.tsx` currently does:

```ts
const safeQ = q.replace(/[(),{}"'%\\]/g, (c) => encodeURIComponent(c));
```

That is insufficient because `encodeURIComponent('(')`, `encodeURIComponent(')')`, and `encodeURIComponent("'")` do not encode those characters.

Fix it.

Requirements:

- Import and use the shared `escapePostgrestFilterValue`.
- Do not reimplement escaping locally.
- Add tests for the page source path or a shared query-builder helper proving the same hostile inputs are escaped.

## 3. Remove cross-merchant cluster aggregate exposure from customer API

`app/api/customers/[id]/route.ts` still reads `fraud_identity_clusters`:

- It queries by `entity_value`.
- Then it queries all cluster members by `cluster_id`.
- It returns aggregated linked-account count, entity type, confidence, and match reasons.

Raw PII is masked, but this still exposes cross-merchant graph existence and signal metadata.

Fix it.

Requirements:

- Do not read `fraud_identity_clusters` in merchant-facing customer API routes.
- Derive linked identity signals only from merchant-owned `audit_transactions`, using existing merchant-scoped helpers.
- Do not expose cross-merchant cluster existence, counts, entity types, confidence, or match reasons.
- Add tests that fail if `app/api/customers/[id]/route.ts` imports or queries `fraud_identity_clusters`.
- Add behavioral tests that returned linked identities are derived from merchant-owned transactions only.

## 4. Make npm-audit mitigation truthful

`next.config.js` currently says:

- "Only the Supabase storage bucket for this project is permitted."
- "No wildcard patterns are allowed."

But it uses:

```js
hostname: '*.supabase.co'
```

Fix this mismatch.

Preferred fix:

- Use a specific Supabase project hostname in `remotePatterns`.
- If the project ref must come from env, fail closed or omit image optimization in a documented way.
- Do not allow wildcard hostnames.
- Update `NPM_AUDIT_MITIGATIONS.md`.
- Strengthen tests so any wildcard in `images.remotePatterns.hostname` fails, including `*.supabase.co`.

If a project-specific hostname is unavailable, revise the mitigation doc to explicitly admit the wildcard risk. Do not claim a stronger mitigation than the code implements.

## 5. Replace legacy summary semantics

The app still mixes old risk semantics with the new identity confidence model:

- `app/api/process-csv-chunk/route.ts` computes `flagged_count` with `.in('risk_level', ['high', 'critical'])`.
- `app/(app)/dashboard/page.tsx` computes review queue KPIs from `customer_profiles.risk_level`.
- Dashboard flag rates use `processing_jobs.flagged_count`, which may be legacy-derived.

Fix it.

Requirements:

- Create or reuse one shared helper for review-worthy transaction counts:
  - `identity_confidence_grade IS NOT NULL`
  - OR `match_status IN ('candidate','probable','definite')`
  - exclude `dismissed_by_merchant IS TRUE`
  - scoped to merchant-owned jobs.
- Use this helper for job finalisation, dashboard review metrics, audit history where practical, and exports if applicable.
- Do not use `risk_level` for review queue / flagged-count semantics.
- Add tests proving normal rows are excluded, graded null-status rows are included, `match_status='none'` null-grade rows are excluded, dismissed rows are excluded, and the dashboard/job finalisation use the same definition.

## 6. Strengthen tests that missed the bugs

Add or strengthen tests so this cannot regress:

- `/api/customers/search` must have hostile-input behavioral tests, not only source-inspection auth tests.
- `app/(app)/customers/page.tsx` must use the shared escape helper.
- `next.config.js` test must fail for any wildcard hostname in `images.remotePatterns`.
- `app/api/customers/[id]/route.ts` must fail if `fraud_identity_clusters` appears.
- Any route/page/helper composing `.or()` strings from user input must use `escapePostgrestFilterValue` or avoid string composition.

Do not weaken the clean eval warning. It should continue to state the 26.5% clean flag rate truthfully and remain non-gating only if that is an explicit product decision.

## Run and report

Run:

```bash
npm run build
npm test -- --runInBand
npm run audit:deployment
npm run dev
npm run audit:ux
npm audit --audit-level=moderate
```

Return:

- Files changed.
- Exact blockers fixed.
- Tests added or strengthened.
- Exact command results.
- Remaining risks with severity.

The target is minimum 9/10 across security/privacy, data correctness, identity reliability, CSV robustness, UX flow, performance, and maintainability. Do not claim 9/10 while any service-role raw filter interpolation or cross-merchant identity aggregate exposure remains.
