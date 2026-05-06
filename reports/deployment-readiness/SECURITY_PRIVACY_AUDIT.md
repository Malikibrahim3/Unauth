# Security And Privacy Audit

Verdict: **Not enterprise-ready**.

## Blockers

### Service-role customer reads bypass tenant boundaries

`app/api/customers/[id]/route.ts` verifies profile access, but then service-role queries `audit_transactions` by email/card/IP and appearance IDs without guaranteeing every returned transaction belongs to `ctx.merchantId`.

Evidence:
- `app/api/customers/[id]/route.ts:166-180`
- `app/api/customers/[id]/route.ts:192-230`
- `app/api/customers/[id]/route.ts:341-372`

Fix:
- Resolve merchant-owned job IDs first.
- Add `.in('job_id', ownedJobIds)` to every transaction query.
- Scope `customer_profile_audit_appearances` through owned jobs.
- Return cross-merchant linked identity as counts/signals only, not raw entity values.

### CSV export injection

`app/api/audit/[runId]/export/route.ts:87-100` quotes CSV cells but does not neutralize formula-leading values.

Fix:
- Use a shared CSV exporter that escapes quotes/newlines and prefixes cells beginning with `=`, `+`, `-`, `@`, tab, or carriage return.

### Service-role surface is too broad

Static scan found 111 service-role references and 49 broad `select('*')` patterns. Many are legitimate, but service-role paths should be treated as privileged code and audited by route.

Evidence file: `reports/deployment-readiness/benchmarks/security-static-scan.json`.

## High Findings

- Public demo page uses service role against a fixed demo merchant (`app/(public)/demo/page.tsx:47-58`). This can be acceptable if heavily tested, but it is a high-scrutiny route.
- API error responses sometimes include internal detail, e.g. evidence generation returns `detail: String(err)` or DB insert messages.
- Legacy `/api/process-csv-job` remains available alongside chunked worker, increasing attack surface.
- No obvious rate limiting on upload, lookup, export, evidence generation, or customer search APIs.

## Medium Findings

- Client upload accepts `.csv` only, but backend validation should also enforce content type/extension consistently.
- Export access control checks job ownership correctly in `app/api/audit/[runId]/export/route.ts`.
- Evidence PDF route checks merchant ownership before download.
- RLS migrations exist for `processing_jobs` and `audit_transactions`, but service role bypasses RLS.

## Privacy Language

Merchant-facing banned fraud language tests pass in the full suite, but several backend/table names still include `fraud_*`. That is acceptable internally but should not surface in UI, exports, or docs.

