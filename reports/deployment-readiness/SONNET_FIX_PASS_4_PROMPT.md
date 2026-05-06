# Sonnet Fix Pass 4 Prompt

You are fixing the fourth-pass enterprise readiness audit. The app is close, but still not at the requested 9-10/10 enterprise bar.

Read first:
1. `reports/deployment-readiness/FOURTH_PASS_AUDIT.md`
2. `reports/deployment-readiness/THIRD_PASS_AUDIT.md`
3. `reports/deployment-readiness/NPM_AUDIT_MITIGATIONS.md`

Do not make tests green by weakening them. The tests are already green. Fix the remaining truthful issues.

Fix in this order:

1. Make npm-audit mitigations real
   - `NPM_AUDIT_MITIGATIONS.md` claims `next.config.js` has explicit `images.remotePatterns`.
   - `next.config.js` does not currently define `images.remotePatterns`.
   - Either add an explicit safe allowlist or revise the mitigation document to remove the false claim.
   - Prefer adding the actual mitigation and documenting it.

2. Strengthen service-role route guard and fix lookup quota route
   - Fix `tests/api/routeSecurity.test.ts`.
   - A service-role route must require `auth.getUser()` AND `requirePermission()` unless it is HMAC/internal or explicitly whitelisted.
   - The current test only requires `auth.getUser()`.
   - Fix `app/api/lookup/remaining/route.ts`:
     - add `requirePermission(service, user.id, PERMISSIONS.LOOKUP_CUSTOMER)`
     - use `ctx.merchantId`, not `user.id`, for `lookup_daily_counts.merchant_id`
     - add tests that the static guard catches auth-only service-role routes.

3. Fix review queue semantics for legacy rows
   - Fix `lib/supabase/merchantHelpers.ts`.
   - Current helper includes graded rows, then applies `.not('match_status','eq','none')`.
   - That can drop rows where `identity_confidence_grade IS NOT NULL` and `match_status IS NULL`.
   - Use one correct inclusion expression:
     - `identity_confidence_grade IS NOT NULL`
     - OR `match_status IN ('candidate','probable','definite')`
   - Exclude dismissed rows separately.
   - Do not add a `not match_status = none` filter that excludes nulls.
   - Add regression tests for:
     - graded + null status is included
     - status none + null grade is excluded
     - dismissed rows are excluded

4. Escape or remove raw PostgREST filter-string interpolation
   - Fix `app/api/customers/search/route.ts`.
   - Fix `app/(app)/customers/page.tsx`.
   - Review `app/api/audit/[runId]/customer/route.ts`.
   - Do not interpolate raw user input directly into `.or()` filter strings.
   - Add a helper to escape PostgREST filter values, or avoid composite `.or()` strings for user-controlled values.
   - Add tests for commas, parentheses, braces, quotes, percent signs, and backslashes.

5. Fix legacy eval warning math
   - Fix `tests/eval/engineEval.test.ts`.
   - The warning currently uses `metrics.baseRate`, causing it to print `0.0%` despite 53 false positives.
   - Use `metrics.flagRate`.
   - Keep it non-gating only if that is explicitly the product decision, but the warning must be truthful.

6. Fix inbox auth/permission behavior
   - Fix `app/(app)/inbox/page.tsx`.
   - If unauthenticated, redirect to login.
   - Use `PERMISSIONS.VIEW_INBOX`, not `PERMISSIONS.VIEW_CUSTOMERS`.
   - Do not silently show an empty queue on permission denial.

7. Reduce remaining customer API duplication
   - `app/api/customers/[id]/route.ts` still has duplicated customer intelligence logic and reads `fraud_identity_clusters`.
   - If feasible without a broad rewrite, route it through the same merchant-scoped helpers used by the page.
   - At minimum, ensure the API route does not expose cross-merchant cluster existence beyond an explicitly approved aggregate.

After changes, run:

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
- Command results.
- Remaining risks.

