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

Example:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "$APP_URL/api/cron/reconcile?merchantId=$MERCHANT_ID"
```

Run this against the E2E or demo merchant first. Repeating an unchanged sweep
must report zero newly raised exceptions because exception keys are stable.
