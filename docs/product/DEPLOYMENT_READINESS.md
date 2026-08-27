# Deployment-candidate readiness

Status: clean deployment-candidate branch verified and ready to push; PR/push
and external gates remain pending, 27 August 2026.

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

## Branch and commit receipt

- Branch: `codex/deployment-readiness-20260826`.
- Starting branch: `codex/core-cleanup-refactor` at `fedd6903`.
- Latest fetched `origin/main`: `42089ca7`.
- Reconciliation: normal merge commit `cfd138f7`; after this receipt commit the
  branch is 0 behind and 19 commits ahead of `origin/main`
  (`git rev-list --left-right --count`). Three pre-existing commits from the
  starting branch are retained unchanged; the deployment-candidate sequence
  begins at `1620ad67`.
- Logical deployment sequence: `1620ad67` application baseline,
  `7b8196ee` canonical authorities/dead paths, `f1840123` dependency and
  repository hygiene, `2dfe5202` extension tooling, `4f00fd74` CI gate,
  `7df4dca6` root security baseline, `029080ee` lint navigation,
  `b73b3120` optional environment handling, `57881dcf` ephemeral verification
  artifacts, `30f5cf62` isolated build outputs, `cfd138f7` latest-main merge,
  `890742bb` initial deployment receipt, `2187b8bc` Zendesk environment
  contract, `a1b7a6b4` production-target extension bundle, and `413a40ed`
  deterministic extension packaging in CI. The merge is non-rewriting and no
  force push is permitted.

The requested baseline message is `feat: complete merchant-ready UX9
application`; the authority cleanup is `refactor: consolidate canonical
authorities and remove dead paths`; dependency/repository hygiene is
`chore: update dependencies and repository hygiene`; and CI is
`ci: gate deployment candidates`. Security and test-hardening follow-ups are
additive commits so each change remains reviewable.

## Classification, cleanup, and archive

- Application source, tests, migrations, scripts, configuration, current
  documentation, and required public assets are tracked and reviewed.
- Historical prompts, screenshot/evidence collections, the duplicate visual
  system document, and two unreferenced local scripts were archived outside the
  repository before exact removal. The archive is
  `/Users/malikibrahim/Downloads/Unauth-release-archive/2026-08-26/`.
- The starting source snapshot checksum is
  `884d9b22a12e7fa3a9860f162e3667ac667568a87142377e58e3bf1631b4789d`.
- Historical documentation/evidence archive checksum is
  `3a1478c707b4fa79c83e8aa449984d5c340c00424ccd0f4c0e2895ed1289dd40`.
- Archived duplicate visual-system document checksum is
  `89b0a01bfdefaf8119b6dc0b420a794e9539a1552cea2a42442af627ab23c507`.
- Archived unreferenced-script bundle checksum is
  `d8e90fd85da03f4150272d7dcf4f27f7386369c5d1808430bb5c0eccf672f359`.
- `.codex/`, `.impeccable/`, `private/`, `artifacts/`, `references/`, generated
  screenshots/traces, reports, local credentials, and alternate Next outputs
  are ignored and untracked. `extensions/chrome/dist` remains tracked because
  the runtime download route requires it. Applied Supabase migrations remain
  immutable.
- The dead-code graph found 71 candidates; all uncertain candidates are
  retained and registered in `DEAD_CODE_CANDIDATES.md`.

## Opt-in Jest suites

The two suites reported as skipped by the default offline Jest run are
intentional environment gates, not untracked coverage:

- `tests/integration/customerAggregates.test.ts` runs only with
  `RUN_DB_INTEGRATION=1` against the identified disposable Supabase fixture.
- `tests/security/sourceAgnosticRls.test.ts` runs only with `RUN_LIVE_DB=1`
  and explicit Supabase URL/anon/service credentials; it is never pointed at
  staging or production by the default command.

The default receipt records these as opt-in skips. A disposable local run must
enable them and record its database/build identity separately.

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

The local receipt currently records:

- fresh lockfile install: `npm ci` passed;
- lint: zero warnings; root, script, and E2E TypeScript checks passed;
- Jest: 411 suites passed, 2 intentional opt-in suites skipped, 2,912 tests
  passed, 6 tests skipped, 1 snapshot;
- static contracts: authority, environment (115 keys), Vercel cron (7
  authenticated routes), surface manifest (64 page modules/119 stable
  surfaces/222 scenarios/55 aliases), UI integrity, merchant copy,
  migration layout (32 unique timestamps), and Supabase contract (150 live
  tables) passed;
- engine evaluation: 2,000 rows, F1 0.76, precision 1.00, recall 0.62;
- root audit: full and `--omit=dev` both report zero vulnerabilities; the
  Chrome extension audit also reports zero vulnerabilities;
- exact production build: Next 16.3.3 generated 105/105 routes with a clean
  build directory; build ID `vBX_f9Iv0bN7FV83TeVyZa1b7a6b4b12e63c9061fdcc56079abb78fb409bd`;
  extension build passed and the checked-in bundle targets
  `https://app.unauth.co/*`;
- guarded local browser proof: the disposable loopback Supabase fixture was
  used only with local credentials. The CI-equivalent full run executed 103
  tests and exited green: 102 passed on the first attempt and the one
  `/financials/losses` rapid-navigation case passed on the configured retry
  (Playwright reports it as flaky because of a local Next stream-abort
  condition). The isolated 14-test sidebar suite passed 14/14, including
  `/financials/losses`.

- clean-install receipt: a detached worktree at `a1b7a6b4` ran `npm ci`
  (995 packages, 0 vulnerabilities) and `verify:ci` passed all 17 deterministic
  gates. After `413a40ed`, the production-mode extension rebuild and script
  typecheck passed and left that disposable worktree clean. The final root
  branch is clean before this documentation commit.
- final commit SHA after this documentation receipt, checksums, GitHub Actions
  results, and any optional preview URL/read-only smoke result are recorded
  below or in the pull request when those external systems are available. The
  receipt cannot grant the external approvals above.

## Push and pull-request boundary

The final documentation commit is
`docs: record deployment candidate evidence and blockers`. Before pushing,
create a fresh temporary worktree, run `npm ci` and the complete verification
matrix, confirm an empty `git status --porcelain=v1`, and perform staged/history
secret scans. Push without force and open an unmerged PR titled
`chore: prepare Unauth deployment candidate`. No production deployment, merge,
remote migration, provider write, real-user invitation, or legal/release
approval is authorized.
