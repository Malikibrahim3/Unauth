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

## UI craft release gate

1. Run `npx tsc --noEmit && npx eslint app components lib --max-warnings=0 && npx jest --silent`.
2. At 1440×900, walk `/dashboard`, `/work`, `/claims`, the first payout case, `/customers`, a customer drawer and profile, `/recoveries`, `/losses`, a loss detail, `/rules`, a rule detail, `/reports`, `/partners`, `/integrations`, `/notifications`, `/settings`, and `/login`.
3. Repeat `/dashboard`, `/work`, the first payout case, `/customers`, a customer profile, and `/settings` at 390px. Confirm there is no horizontal page overflow and the decision rail follows the main case content.
4. Repeat the core-page walk in light and dark themes. Check visible focus rings, keyboard access, reduced-motion behaviour, status contrast, and drawer/menu/toast transitions.
5. Block release if rendered copy contains a UUID or raw snake-case status, if a GBP workspace renders a dollar amount, if dates bypass the canonical formatter, or if a screen repeats the same fact in multiple cards.
6. Capture the core pages with the authenticated visual suite and compare them with the approved baseline. Add regression assertions for `/\$\d/` in GBP workspaces and `/[a-z]+_[a-z]+/` in rendered status cells.

## Legacy redirects

Redirect responses include `x-unauth-legacy-route` and `x-unauth-canonical-route`, preserve query parameters and emit `legacy_route_redirect` structured logs. Retire a redirect only after 90 days with no legitimate hits, all stored links are migrated and route tests pass.

## Incident response

- Disable the affected server-enforced capability or cohort.
- Preserve request IDs, audit events and append-only financial/decision history.
- Do not delete or rewrite historical ledger, rule-version or workflow-run records.
- For connector incidents, stop sync/action execution while leaving merchant records readable and marked stale.
