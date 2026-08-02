# Testing

Run the deterministic local gate from the repository root:

```bash
npm run typecheck
npm run lint
npm run lint:authenticated-design
npm test -- --runInBand
npm run build
```

`npm run release:readiness -- --allow-destructive-local-reset` runs that sequence plus the authenticated design guard, Supabase contract audit, provider-suite typecheck, migration-history sanity check, and whitespace check. Run it only against an approved disposable local database: the gate performs a clean replay and migration-history rehearsal. Without the explicit flag, it exits before starting database-backed checks.

Focused Jest suites are preferred while developing; the full serial run is the release signal. Connector changes also require their adapter and integration registry contract tests. Schema changes require the Supabase contract audit, generated-type check, and `npm run verify:migration-layout`.

Playwright uses `tests/playwright.config.ts`. It requires a non-production deployment, `E2E_AUTH_SECRET`, and an isolated test merchant. The deployed app and test process must use matching Supabase and signing configuration. Never run mutating E2E or provider fixture scripts against production.

Useful browser commands:

```bash
npm run test:critical
npm run test:e2e
```

Provider live tests under `scripts/e2e` additionally require controlled Shopify and Gorgias accounts plus the variables documented in `.env.local.example`. Run preflight before the live suite and review every target URL and merchant ID.

Generated reports, screenshots, traces, and fixture output are build artifacts. Keep them out of version control unless a current test explicitly consumes a small deterministic fixture.
