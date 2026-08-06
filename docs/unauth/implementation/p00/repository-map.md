# P00 repository map

**PROVISIONAL — NOT CERTIFICATION EVIDENCE**

## Repository truth

- VCS root: `/Users/malikibrahim/Downloads/Unauth`
- Base revision: `c9aecf461471f5d9e7abefe12e1089374cbb0a02`
- Base state: dirty before P00; preserved in `observed-base-manifest.json`
- Application: Next.js 16 App Router, React 19, TypeScript 5.9
- Package/runtime: npm 10.9.2 on Node 22.14.0; `package-lock.json` present
- Data/runtime services: Supabase/Postgres, Vercel metadata and cron declarations
- UI: CSS/Tailwind PostCSS plus repository component libraries; Recharts 3.10.1
- Verification: Jest/Testing Library, Playwright, ESLint, TypeScript, custom verification scripts

## Logical architecture mapping

| Logical responsibility | Observed repository location | Classification |
|---|---|---|
| contracts | `lib/api`, `lib/canonical`, `lib/financial`, route-local Zod/TypeScript contracts | PRESENT; fragmented, P02 gap |
| server/domain/financial | `lib/financial`, `lib/finance`, `lib/reconciliation`, Supabase functions/migrations | PRESENT; does not yet match v1.1 P02 schema |
| client/domain/financial | `lib/financial`, `lib/canonical`, `lib/reporting`, component formatters | PRESENT; generated-decoder boundary NOT_PRESENT |
| domain/entities | `lib/claims`, `lib/cases`, `lib/losses`, `lib/recoveries`, `lib/customers`, `lib/rules`, `lib/workflows`, `lib/sources` | PRESENT |
| ui/foundations | `styles/authenticated`, `app/globals.css`, `components/ui`, `components/authenticated` | PRESENT |
| ui/operating | `components/canonical`, `components/charts`, `components/claims`, `components/workbench`, `components/reporting` | PRESENT |
| routes | `app`, `lib/navigation/appRoutes.ts`, `lib/navigation/aliases.ts`, `next.config.js`, `proxy.ts` | PRESENT; generated single registry NOT_PRESENT |
| fixtures | `tests/fixtures`, `test-data`, `synthetic-lab`, seed scripts | PRESENT; P00 display fixture created separately |
| evidence | `docs/phase-reports`, `artifacts`, `.impeccable`, `test-results`, `docs/audits` | PRESENT; P00 binding root uses `docs/unauth/implementation/evidence/P00` |

## Packages and deployable boundaries

- Root Next.js web application: repository root.
- Chrome extension: `extensions/chrome` (own `package.json` and lockfile).
- Shopify checkout extension: `extensions/unauth-checkout` (own `package.json`).
- Zendesk extension: `extensions/zendesk`.
- Database schema and forward migrations: `supabase/migrations`; archived pre-canonical history is non-active.
- Vercel schedules: `vercel.json`; build command is repository `npm run build`.

## Commands observed

| Mechanism | Exact command | Status/evidence |
|---|---|---|
| install | `npm install` | README and lockfile; network mutation not run in P00 |
| dev | `npm run dev` | package script |
| production build | `npm run build` | package script |
| production serve | `npm run start` | package script |
| unit/integration tests | `npm test -- --runInBand` | package script/Jest config |
| P00 slice | `npm test -- --runInBand tests/p00` | registered P00 test |
| lint | `npm run lint` | package script |
| type-check | `npm run typecheck` | package script |
| browser/visual test | `npm run test:e2e`; `npm run test:redesign`; `npm run evidence:redesign` | package scripts/Playwright config |
| design contract | `npm run verify:design-contract` | package script |
| local release suite | `npm run test:release-browser`; `npm run release:readiness` | package scripts; requires environment |
| deploy | `NOT_PRESENT` | Vercel config exists, but no repository deploy script/CLI command is declared; ADR-P00-011 keeps deployment external and locked |
| feature flags | environment variables via `lib/utils/env.ts` and direct server reads | PRESENT; observed names recorded in baseline |

No stack replacement is authorised. Existing repository conventions remain controlling until a later phase's approved ADR changes a boundary.
