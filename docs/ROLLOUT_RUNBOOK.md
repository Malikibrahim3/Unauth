# Authenticated product rollout runbook

## Gates

1. Rehearse additive migrations on a staging clone. Record row counts before and after; rollback means reverting application traffic first, then leaving additive tables/columns dormant.
2. Run `npm run release:readiness`. Any failed check blocks rollout.
3. Exercise login, workspace switch, Overview, Work, payout-case read, loss/recovery read, customer preview, search, Rules, Flows, Integrations and Settings without creating a real payout.
4. Run authenticated axe and keyboard checks at 320, 375, 768, 1024, 1280, 1440 and 1920 pixels.
5. Verify `/api/rollout/health` returns `healthy` for the rollout merchant and that financial, loss, recovery, task and connection counts are plausible.

## Controlled release

- Start with internal/demo merchants, then a small named cohort. Do not infer enablement from client-only flags.
- Monitor API 5xx/409 rates, route latency, failed ingestion events, dead letters, source freshness, financial reconciliation warnings, workflow failures and support volume.
- Stop expansion if tenant-isolation, financial reconciliation, decision idempotency, workflow idempotency or connector signature checks fail.

## Legacy redirects

Redirect responses include `x-unauth-legacy-route` and `x-unauth-canonical-route`, preserve query parameters and emit `legacy_route_redirect` structured logs. Retire a redirect only after 90 days with no legitimate hits, all stored links are migrated and route tests pass.

## Incident response

- Disable the affected server-enforced capability or cohort.
- Preserve request IDs, audit events and append-only financial/decision history.
- Do not delete or rewrite historical ledger, rule-version or workflow-run records.
- For connector incidents, stop sync/action execution while leaving merchant records readable and marked stale.
