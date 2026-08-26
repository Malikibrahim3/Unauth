# Deployment-candidate readiness

Status: repository cleanup in progress; no production deployment or merge,
26 August 2026.

## Candidate boundary

This document certifies only repository and reproducibility work. A Vercel
preview and read-only public smoke are allowed. Production deploys, merges,
remote migrations, provider writes, real-user invitations, and legal/release
approval remain outside this task.

## Required repository gates

- A clean branch contains logical commits, is reconciled with the latest
  `origin/main`, and has no tracked secrets, generated evidence, private state,
  or unclassified paths.
- `npm ci` from the lockfile passes on the pinned Node 22/npm toolchain.
- Lint, all TypeScript checks, Jest, engine evaluation, authority/docs,
  environment, Vercel cron, surface/UI/copy, migration, Supabase-contract,
  extension, and production-build checks pass.
- A guarded disposable loopback Supabase run may exercise local release and
  exact-build browser suites. Staging/provider checks require protected
  credentials and are reported as blocked when absent.
- Dependency updates leave zero unresolved high/critical production
  vulnerabilities. Moderate or development-only findings require a bounded
  rationale; `npm audit fix --force` is prohibited.

## External blockers retained

MR1 controlled provider lifecycle and source-runtime proof remain unpassed.
MR6 remains `PARTIAL / NO-GO` until staging reconciliation, selected-provider
lifecycles, hosted restore, non-founder operation, named owners, clean release
receipt, and signed legal/data agreements are evidenced. UX9 implementation is
not formal acceptance until the rendered evidence and dual reviews in
`UX9_STATUS.md` exist. The public legal routes remain non-operative pending
owner/counsel approval. See `MR6_HANDOFF.md` and `RELEASE_READINESS.md`; this
cleanup must not change those verdicts.

## Evidence receipt

The final receipt will record commit SHA, latest-main reconciliation, build ID,
test counts, failures/skips, browser coverage, dependency findings, checksums,
GitHub Actions results, optional preview URL/smoke result, and clean-worktree
proof. The receipt cannot grant the external approvals above.
