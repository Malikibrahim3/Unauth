# Unauth

Unauth is an evidence-led operations console for merchant cases, recoveries,
reconciliation, and source health.

## Local setup

- Use Node `22.x` and npm `10.x` (`npm@10.9.2` is the pinned toolchain).
- Copy `.env.local.example` to `.env.local` and fill only the values needed for
  the local surface or test you are running. Server-only secrets never belong in
  client code, fixtures, screenshots, or commits.
- Install reproducibly with `npm ci`, then start with `npm run dev`.

## Canonical owners

`ARCHITECTURE.md` is the authority index. Product semantics and truth boundaries
live in `PRODUCT.md`; visual, responsive, and theme rules live in `DESIGN.md`;
MVP+ scope lives in `docs/product/MVP_PLUS_SCOPE.md`; routes and redirects live
in the files listed by the authority index; page ownership is the executable
`lib/surfaces/manifest.ts`; provider lifecycle and executable adapters remain
separate registries; billing is `lib/billing/plans.ts`; environment validation
is `lib/utils/env.ts`; migration order is the release migration manifest plus
immutable files under `supabase/migrations`.

## Verification

- `npm run verify:ci` runs deterministic repository, type, lint, Jest, eval,
  extension, and production-build gates without touching staging or production.
- Focused checks include `npm run verify:authority`, `npm run verify:env`,
  `npm run verify:vercel`, `npm run verify:surface-manifest`,
  `npm run verify:ui-integrity`, `npm run verify:merchant-copy`,
  `npm run verify:migration-layout`, and `npm run audit:supabase-contract`.
- `npm run verify:dead-code` is a framework-aware report-only candidate scan.
  Candidates require static, dynamic, manifest, script, runtime-file, and test
  evidence before deletion; uncertain paths stay and are recorded.
- The guarded local release/browser suites require a positively identified
  disposable loopback Supabase. Staging/provider lifecycle checks are manual or
  protected by environment credentials.

## Deployment boundary

A preview may be created for read-only smoke testing. Production deployment,
merge, remote migrations, provider writes, real-user invitations, and legal or
release approval are separate decisions. Current external blockers and UX9
acceptance status are recorded in `docs/product/DEPLOYMENT_READINESS.md`,
`docs/product/MR6_HANDOFF.md`, and `docs/product/UX9_STATUS.md`.
