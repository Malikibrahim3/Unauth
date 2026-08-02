# Operations

## Environments

Use `.env.local.example` as the variable-name contract. Local secrets belong only in `.env.local`; hosted values belong in the deployment provider's encrypted environment. Server code reads the validated `env` object from `lib/utils/env.ts`. Test and maintenance scripts may load `.env.local` explicitly.

Production and preview require the base Supabase, application URL, email, cron, rate-limit, internal-signing, and Shopify variables enforced by the environment schema. Optional integrations require their own credentials only when enabled. Redeploy after changing hosted values.

Identity-salt rotation is exceptional because every derived hash must be rebuilt consistently. Review the target environment, take a database backup, and use `npm run rotate:identity-salt` rather than changing the value directly.

## Database changes

`supabase/migrations` is an ordered, append-only history. Never edit or reorder an applied migration. Add a timestamped forward migration, include merchant-scoped indexes and RLS changes where relevant, and validate generated types after schema changes with `npm run gen:supabase-types`.

Before release, inspect the migration diff and exercise rollback at the application layer. Destructive schema cleanup should be a later migration after the old application path has stopped reading the data.

## Release gate

Run `npm run release:readiness -- --allow-destructive-local-reset` for the deterministic local gate described in [`TESTING.md`](TESTING.md), and only against an approved disposable local database. The unflagged command refuses to reset or replay the existing local database. Then exercise the affected integration against an isolated staging merchant. Confirm webhook verification, retries, idempotency, tenant-isolation, financial totals, and audit history.

Remote migration comparison is deliberately excluded from the default gate, and `release:readiness` rejects `--remote-migrations`. Remote metadata/history reconciliation is allowed only through the target-checked, backup-gated sequence in [`audits/unauth-mvp-plus/13-production-rollout-approval-packet.md`](audits/unauth-mvp-plus/13-production-rollout-approval-packet.md) after explicit approval.

Stop expansion if tenant-isolation, authorization, signature verification, ledger integrity, or idempotency checks fail. Roll back the application deployment first; use a forward migration for database correction.

For controlled-account provider verification, set an explicit isolated merchant and run `npm run validate:live-connectors`. Adding `-- --sync-shipbob` performs a live ShipBob synchronization and therefore requires an intentional state-changing test window.

Compatibility redirects live only in `next.config.js`. The web platform owner may retire an entry after production access logs show no requests for 90 days and all known external links have been updated.

## Scheduled work

Cron routes require `CRON_SECRET`. Reconciliation workers must be safe to retry, bounded per merchant, and observable. Operational scripts that mutate remote state require an explicit target environment and merchant; never point fixture or browser automation at production.
