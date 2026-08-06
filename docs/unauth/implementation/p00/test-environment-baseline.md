# P00 test and environment baseline

**PROVISIONAL — NOT CERTIFICATION EVIDENCE**

Observed 2026-08-03 in Europe/London. No secret values were read or recorded.

## Runtime and host

| Field | Observed value |
|---|---|
| OS | macOS 26.5.2 (build 25F84), arm64 |
| Device | MacBook Air (Mac14,15), Apple M2, 8 CPU cores, 10 GPU cores, 8 GB RAM |
| Power | connected; battery condition Normal |
| Node/npm | 22.14.0 / 10.9.2 |
| Next/TypeScript | 16.2.7 resolved / 5.9.3 |
| Jest/Playwright | 29.7.0 / 1.59.1 |
| Chrome | 151.0.7922.71 |
| Safari exact build | NOT_DISCOVERED from command-line executable |
| Windows Chrome/Edge/Firefox | NOT_PRESENT on local host; required at P12 |
| Disk at observation | 23 GiB available; local volume 89% used |

The host is faster CPU generation but lower RAM than the conservative certification fallback and has no calibrated throttling proof. Results are development-only.

## Environment topology

- Local web process: Next.js production or development server.
- Data: Supabase configuration through validated server environment; local `.env.local` exists but P00 inspected names/conventions only, never values.
- Production metadata: Vercel cron declarations exist. Production project access, deployment, live database access and secrets were not authorised.
- Browser tests: `tests/playwright.config.ts` uses a production server, stored non-production auth state and Desktop Chrome/tablet/mobile projects; external credentials/environment remain prerequisites.

## Active feature flags discovered

`INVESTIGATIONS_ENABLED`, `INVESTIGATION_EMAIL_DISPATCH_ENABLED`, `GENERIC_EVENT_INGESTION_ENABLED`, `WORKFLOW_PUBLICATION_ENABLED`, `PUBLIC_CLAIM_GATE_ENABLED`, `NETWORK_CONTEXT_ENABLED`, `NETWORK_DISCLOSURE_ENABLED`. Documentation also names `CONNECTION_HEALTH_V2_ENABLED`, `WORK_COCKPIT_V2_ENABLED` and `CASE_WORKSPACE_V2_ENABLED`; exact runtime readers for those three were not discovered. `AUTH_UI_ROLLOUT_COOKIE` appears in a verification script, not as an environment flag. Values were not read. Certification lock remains `ON` by governance manifest.

## Baselines

| Domain | Baseline | Classification |
|---|---|---|
| Financial | Existing integer-minor-unit contracts, ledgers, reconciliation tests and migration verification; v1.1 generated value/measure contracts absent | PARTIAL; P02 authority |
| Reliability | Route loading/error boundaries, Jest and Playwright fault suites, release scripts | PRESENT but not one immutable P12 suite |
| Accessibility | shared focus components and accessibility-responsive browser suite | PRESENT; manual AT/browser certification deferred |
| Performance | local build/test timing only; no shaped separate host, fixed dataset or 30-sample protocol | PROVISIONAL_LOCAL; non-certifying |
| Visual | Playwright screenshots/evidence and `.impeccable` artifacts; no Storybook | PRESENT; existing evidence is not P01/P12 certification |

## Fixture capability

Realistic deterministic resources exist in `tests/fixtures`, `test-data`, `synthetic-lab` and seed scripts. Seeded users/workspaces and permissions exist in browser/global setup and phase QA tooling; clocks and failure injection are distributed across tests rather than one certification fixture. Live/demo seed scripts may mutate configured databases and were not run. P00 adds only the non-computing display fixture.

## Local baseline commands

Acceptance uses `npm test -- --runInBand tests/p00`, `npm run typecheck`, `npm run lint`, the fixture validator, inventory generator and `npm run build`. Browser evidence requiring credentials is not claimed by P00; the test-only slice uses a deterministic DOM regression in the actual React/Jest stack.
