# Reconciliation schedule

Vercel invokes `GET /api/cron/reconcile` every day at `06:00 UTC` from
[`vercel.json`](/Users/malikibrahim/Downloads/Unauth/vercel.json). Set `CRON_SECRET`
in the deployed environment; the scheduler must send it as `Authorization: Bearer
<CRON_SECRET>`.

The endpoint is read/exception-write only. It never guesses unavailable external
outcomes or posts financial facts from a probable match. It returns
`nextCursor` when more than 100 merchants remain; invoke the same endpoint with
`?cursor=<nextCursor>` to resume. For one safe tenant smoke test, use
`?merchantId=<merchant UUID>` and inspect only the aggregate detector counts.
The response includes `failureCount` and returns HTTP 500 if any detector or
merchant sweep fails, after allowing the remaining independent checks to finish.
Treat any non-zero failure count as a failed run; safe retries converge on the
same exception keys.

Example:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "$APP_URL/api/cron/reconcile?merchantId=$MERCHANT_ID"
```

For the repeatable local production-build smoke, set `E2E_MERCHANT_ID` (or
`RECONCILIATION_SMOKE_MERCHANT_ID`) to a safe test merchant and run:

```bash
npm run build
npm run smoke:reconciliation
```

The smoke runner creates an ephemeral in-memory cron secret, verifies missing
and invalid authorization, runs one merchant-scoped sweep, repeats it, and
requires the second unchanged sweep to raise zero new exceptions. It never
prints or writes the secret.

Run this against the E2E or demo merchant first. Repeating an unchanged sweep
must report zero newly raised exceptions because exception keys are stable.
