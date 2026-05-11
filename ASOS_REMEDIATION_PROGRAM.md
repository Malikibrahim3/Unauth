# ASOS Remediation Program — Sequenced Execution Plan

> Companion to the audit at `~/.claude/plans/you-are-acting-as-atomic-comet.md`.
> This is NOT another audit. It is a sequenced execution plan an engineering team can follow safely.
> All paths are relative to the repository root unless absolute. All file/line references are evidence-grounded against the working tree on `claude/gracious-sutherland-cd43cf`.

---

## 0. PROGRAM PURPOSE AND SHAPE

**Outcome targets, in order of priority.**

1. The product survives a 30-minute live demo to ASOS without a demo-fatal bug.
2. The product passes an ASOS security questionnaire and a DPO review at "pilot" depth (not yet "production").
3. The product processes ASOS-shaped daily volume (≥150k rows) inside the team's stated <30-minute target.
4. The product has the integrations and operational maturity needed for a production rollout.

The program is **phased, sequenced, and gated**. Each phase has explicit verification criteria. No phase begins until the prior phase's gate is green. Phases that *can* run in parallel are flagged; everything else is sequential by default.

**This document does not relitigate findings.** Where rationale is needed, it points back to the audit. Where a fix is mechanical, it is described enough for an IDE agent. Where a fix touches security, multi-tenancy, scoring, or migrations, it is described enough for a senior engineer plus a code review.

---

## 1. PROGRAM PRINCIPLES

These rules apply to every phase, every branch, every PR.

1. **Stabilise before you build.** Fix CI before doing anything else. A green CI is the safety net for everything that follows. Phase 0 is non-negotiable.
2. **One concern per PR.** Especially for security and migration changes. A PR that mixes "rename middleware" with "add CSP headers" with "fix evidence flow" is a PR that cannot be safely reverted.
3. **Reversible-first.** Prefer additive migrations (new columns, new tables, new RPCs) over destructive ones. Never combine an additive migration with a destructive change in the same migration file.
4. **Multi-tenancy is sacred.** Every change that touches data access must be reviewed against the rule: *can a merchant see data they didn't upload?* If you can't answer "no" with confidence, the change does not ship.
5. **Scoring engine is sacred.** Files marked `🔒 FROZEN CORE` (e.g., [lib/linker.ts](lib/linker.ts), [lib/processing/worker.ts](lib/processing/worker.ts)) require explicit sign-off to change. The frozen-core comments are not decorative.
6. **Doc/code drift is a bug.** When you change a weight, threshold, or signal, the README, model card, and any user-facing copy update in the same PR. CI gate enforces this in Phase 0.
7. **No silent deletes.** Soft delete is the contract. Until it is implemented, any code path that calls `.delete()` on Supabase tables is treated as a bug.
8. **No new internal jargon in user-facing copy.** All merchant-visible labels go through `lib/copy/`. CI gate enforces this in Phase 1.
9. **Every API route validates input with Zod and asserts merchant scope.** No exceptions. CI gate enforces this in Phase 2.
10. **Performance changes ship behind a feature flag** until they have been measured against a real-sized dataset on staging.

---

## 2. GIT BRANCH STRATEGY

**Trunk: `main`.** Always deployable. Protected. Required reviews: 1 for low-risk changes, 2 for security/migration/scoring changes. CI must be fully green.

**Long-lived release branch: `release/asos-pilot`.** Cut from `main` after Phase 3. All pilot-blocking work merges here. Production-only work continues in `main` afterwards.

**Short-lived feature branches.** Naming convention:

```
fix/phase-<N>-<topic>          # bug fixes
chore/phase-<N>-<topic>        # cleanup, deps, docs
sec/phase-<N>-<topic>          # security-relevant changes
mig/phase-<N>-<topic>          # database migrations
feat/phase-<N>-<topic>         # new functionality
```

Examples:
- `sec/phase-2-middleware`
- `mig/phase-3-soft-delete`
- `fix/phase-1-evidence-no-orders-found`

**Never rebase shared branches.** Always merge with `--no-ff` for the feature → trunk transition so the merge commit captures the PR boundary.

**One PR = one phase item.** A phase item is one row in the action plan tables below. If you cannot describe the PR in one sentence, it is too big.

**Feature flags > long branches.** If a fix needs more than five working days, ship behind a feature flag, merge to `main` weekly, and flip the flag when ready.

**Migrations always merge separately from app changes that depend on them.** Migration PR lands first, deploys to staging, is verified, then the app PR that uses the new column/table/RPC merges next.

---

## 3. CI STRATEGY

**Currently disabled CI is the single biggest risk multiplier.** Phase 0 re-establishes it.

### CI gates (every PR to `main`)

| Gate | Tool | Blocks merge? | Notes |
|------|------|---------------|-------|
| `npm run build` | Next.js | Yes | Currently failing on nullable `order_value`. Fix in Phase 0. |
| `npm test` (Jest) | Jest | Yes | Currently 3 known failures. Resolve before re-enabling. |
| `npm run lint` | ESLint | Yes | Add as a gate. |
| TypeScript strict | `tsc --noEmit` | Yes | Add as a gate. |
| `npm run audit:security` | custom | Yes | Already exists in `package.json`; verify it actually runs. |
| Multi-tenant isolation suite | Jest (`tests/security/*`, `tests/api/merchantIsolation*`) | Yes | Tag and run separately. |
| Engine eval regression | Jest (`tests/eval/*`) | Yes | Currently failing. |
| Playwright critical-path | Playwright (`tests/playwright.config.ts --project=critical`) | Yes after Phase 2 | Currently disabled; re-enable in Phase 2. |
| Migration replay | shell script | Yes after Phase 3 | Apply migrations to a fresh DB; smoke-test critical RPCs. |
| Doc drift check | shell script | Yes after Phase 1 | Asserts README signal/weight table matches `lib/engine/weights.ts`. |
| Header label drift | shell script | Yes after Phase 1 | Asserts user-facing strings come from `lib/copy/`. |

### CI environments

| Environment | Trigger | Database | Purpose |
|-------------|---------|----------|---------|
| **Local** | manual | Supabase local | Developer iteration |
| **Preview** | PR open/update | dedicated PR project (Supabase preview branches) or shared-staging-branched | Per-PR preview deploy on Vercel |
| **Staging** | merge to `main` | dedicated `unauth-staging` Supabase project with seed data | Integration testing, Playwright runs |
| **Pilot/Production** | tag push or manual | dedicated `unauth-prod` Supabase project | Real merchant data |

The current repo lacks at least staging. Phase 3 makes it a hard requirement.

### CI hygiene rules

- No skipped tests in `main`. Use `it.todo` or remove. `it.skip` is banned.
- No `--no-verify` commits. Hooks are mandatory.
- Snapshot test diffs must be reviewed; do not blanket-update snapshots.
- Long-running jobs (Playwright, load tests) run on a separate workflow with concurrency caps.
- Secrets ride in GitHub Actions secrets. Never echo them.

---

## 4. ENVIRONMENT STRATEGY

**Three Supabase projects:**

| Project | Purpose | Service-role secret holder | Migrations applied | Data |
|---------|---------|----------------------------|--------------------|------|
| `unauth-dev` (local) | Developer iteration | Each developer | manually via `supabase db push` | seed data + scratch |
| `unauth-staging` | CI + Playwright + ASOS sandbox | CI secrets | every migration on merge to `main` | seed data + synthetic tenants |
| `unauth-prod` | Real merchants | restricted to Vercel deploy | every migration after staging burn-in | real merchant data |

**Three Vercel environments** mirror this — `Preview`, `Staging`, `Production`.

**Demo merchant** lives in staging only and is reset by a scheduled job nightly. Never share credentials between staging demo and production.

**Two domains.** `app.unauth.example` (production) and `staging.unauth.example` (staging). Demo merchant URL is `staging.unauth.example/(public)/demo` so prospects never see real data.

---

## 5. RISK MATRIX FOR HIGH-IMPACT AREAS

**These areas are architecturally fragile and MUST NOT be touched without senior engineer + code review.**

| Area | File(s) / Migrations | Why fragile | Required gating |
|------|----------------------|-------------|-----------------|
| Identity linker | [lib/linker.ts](lib/linker.ts), [lib/identity/normalise.ts](lib/identity/normalise.ts), [lib/identity/hash.ts](lib/identity/hash.ts) | Frozen core. Changes ripple into clusters, scoring, and evidence. | 2 reviewers, eval suite must pass with delta < ε |
| Scoring engine | [lib/engine/fastScore.ts](lib/engine/fastScore.ts), [lib/engine/weights.ts](lib/engine/weights.ts), `lib/engine/signals/*` | Frozen core. Threshold drift invalidates evidence packages. | 2 reviewers, regression suite + blind harness must pass |
| Processing worker | [lib/processing/worker.ts](lib/processing/worker.ts), [lib/processing/chunkedDispatch.ts](lib/processing/chunkedDispatch.ts) | Frozen core. Concurrency and idempotency invariants. | 2 reviewers, processing test suite + load test |
| Multi-tenant boundary | every file in [app/api/](app/api), [lib/supabase/](lib/supabase), `supabase/migrations/0017_*.sql`, `0027_*.sql` | A single missed `merchant_id` filter is a tenant leak. | 2 reviewers, isolation tests + scoped-query lint rule |
| Auth & session | [proxy.ts](proxy.ts) (to become `middleware.ts`), `app/(auth)/*`, [lib/supabase/server.ts](lib/supabase/server.ts) | Edge auth governs all protected routes. | 2 reviewers, full route smoke test, manual login flows in 3 browsers |
| RLS migrations | every `supabase/migrations/*_security_hardening*.sql`, `*_rls*.sql` | Wrong policy = data exposure or app outage. | 2 reviewers, isolation tests on staging before prod |
| Cross-merchant tables | `fraud_entities`, `fraud_entity_co_occurrences`, `customer_profiles` and the migrations that create them (`0009`, `0012`, `0017`) | Reads are global today; tightening must not break the legitimate cross-merchant signal. | 2 reviewers, security test for inference attacks |
| Evidence narrative | [lib/evidence/narrative.ts](lib/evidence/narrative.ts), [lib/evidence/buildPackage.ts](lib/evidence/buildPackage.ts), [lib/evidence/ce3.ts](lib/evidence/ce3.ts) | Output is legally relied upon. Word "fraud" is banned, narrative invariants exist. | 2 reviewers, narrative snapshot tests |

**"Do not touch" warnings during this program:**

- **Do not touch [lib/linker.ts](lib/linker.ts) at all** unless explicitly delegated. The frozen-core comment is a live constraint.
- **Do not touch the scoring weights in [lib/engine/weights.ts](lib/engine/weights.ts)** without a paired update to the README signal table and the blind-harness expectations. Phase 0 has a dedicated workstream for the existing weight/test mismatch — let that workstream finish first.
- **Do not run `supabase db reset` against staging or production.** The migrations must be replayable but the data must not be lost.
- **Do not edit any file under `sonnet-fix-pass-*.tar.gz`.** Those are archived snapshots from prior fix passes; they are not source.
- **Do not delete `proxy.ts` outright.** Phase 2 replaces it with `middleware.ts` deliberately. A premature deletion leaves the codebase with neither.
- **Do not edit migrations 0001 through 0028 retroactively.** Add a new migration. Even when the right answer is "fix the original," migrations are an immutable log.
- **Do not commit `.env*` files.** `.env.local.example` is the canonical contract.
- **Do not change Supabase RLS policies on staging without first applying them to a local DB and running the isolation suite.**

---

## 6. PHASE OVERVIEW

| Phase | Theme | Duration | Gates pilot? | Gates production? |
|-------|-------|----------|--------------|-------------------|
| **0** | Stabilise CI and freeze regressions | 2–3 days | — | — |
| **1** | Demo-critical fixes | 4–6 days | — | — |
| **2** | Security demo + pilot blockers | 5–7 days | yes | yes |
| **3** | Compliance and legal pack | 5–7 days (parallel with 2) | yes | yes |
| **4** | Pilot-quality UX, governance, observability | 8–12 days | yes | — |
| **5** | Scalability and pipeline | 7–10 days | partial | yes |
| **6** | Production readiness (DSAR, SOC 2 prep, real-time API) | 15–20 days | — | yes |
| **7** | Integrations and platform polish | 20–30 days | — | post-pilot |

Phases 2 and 3 can run in parallel because they touch disjoint files (Phase 2: middleware/headers/RLS; Phase 3: legal pages, soft-delete migration, DSAR). Phase 4 and Phase 5 can partially overlap once Phase 0–3 are merged.

Headcount assumption: **2 senior engineers + 1 frontend engineer + 1 part-time DPO/lawyer**. With more capacity the calendar compresses; with less the calendar extends but the dependency graph holds.

---

# PHASE 0 — Stabilise CI and Freeze Regressions

**Estimated calendar: 2–3 days. Risk: Medium (touches CI infra).**
**MUST complete before any other phase begins.**

## 0.1 Triage and resolve the 3 failing Jest scoring tests

**Objective.** Establish whether the failing tests in [tests/engine/cross_merchant_no_leak.test.ts](tests/engine/cross_merchant_no_leak.test.ts), [tests/engine/addressClustering.test.ts](tests/engine/addressClustering.test.ts), and [tests/eval/regression.test.ts](tests/eval/regression.test.ts) reflect (a) a deliberate weight change, (b) an accidental regression in scoring logic, or (c) stale tests after a justified refactor.

**Rationale.** Until this is resolved, no other engine or test work can be trusted. The cross-merchant test expecting ≥30 and getting 24 looks suspiciously aligned with [lib/engine/weights.ts](lib/engine/weights.ts) where `crossMerchant: 24` is now the value (the README still says 30). That is the smoking-gun: someone changed the weight without updating the test.

**Risk level.** High — semantic, not mechanical. Get this wrong and you either ship a regression or rewrite a correct test.

**Effort.** 1–2 days for the senior engine engineer.

**Dependencies.** None.

**Files & routes.**
- [lib/engine/weights.ts](lib/engine/weights.ts) — current weights.
- README.md `## Fraud signals` table — old weights.
- [tests/engine/cross_merchant_no_leak.test.ts](tests/engine/cross_merchant_no_leak.test.ts), [tests/engine/addressClustering.test.ts](tests/engine/addressClustering.test.ts), [tests/eval/regression.test.ts](tests/eval/regression.test.ts).
- `threshold-recommendations.json` — last-known-good benchmark.
- `friendly_fraud_blind_test_2000.csv` — reference dataset.

**Migrations required.** None.

**Test suites impacted.** Engine, eval, identity (downstream of weights via blind harness).

**Regression risks.** If weights are reverted to "fix" the tests, the previously-tuned behaviour around address-clustering corroboration (the ×0.45 penalty) and cross-merchant signal calibration may be wrong. If tests are updated to the new weights, the team has accepted the new precision/recall floor.

**Verification checklist.**

- [ ] Decision recorded in PR description: "weights are correct, tests stale" OR "tests are correct, weights drifted"
- [ ] If updating tests: rationale references the commit that changed the weights; eval F1 regenerated and committed in `threshold-recommendations.json`
- [ ] If reverting weights: blind harness still passes (`npm run test:identity`)
- [ ] `npm test` exits zero
- [ ] PR is reviewed by a second engineer

**Deployment notes.** Not user-visible. Lives entirely in test/code.

**Do not parallelise with.** Any other engine change.

**IDE agent suitability.** **No.** This is a semantic decision requiring human judgement and context that the agent doesn't have.

**Suggested human discussion prompt.** "Compare README weights vs `lib/engine/weights.ts`. Compare the failing test expectations vs current code behaviour. Decide whether the weight changes were deliberate (and if so, find the commit that introduced them and confirm the rationale was sound). Document the decision in the PR."

---

## 0.2 Fix the production build (`order_value` nullable)

**Objective.** Make `npm run build` succeed.

**Rationale.** A build that fails cannot be deployed and cannot be measured by Lighthouse, performance budgets, or bundle-size CI gates. Trivial to fix; blocks everything.

**Risk level.** Low.

**Effort.** 0.5 day.

**Dependencies.** None.

**Files.** [app/(app)/audit/[runId]/transaction/[id]/page.tsx](app/(app)/audit/[runId]/transaction/[id]/page.tsx) line ~76 (per `ASOS_READY_UI_UX_IMPLEMENTATION_DOC.md`).

**Migrations.** None.

**Tests impacted.** None directly. Run the full Jest suite afterwards.

**Regression risks.** If you "fix" by coercing `null` to `0`, you display `£0.00` for transactions with no order value, which is misleading. Use a `formatCurrencyNullable` helper that renders `—` (em dash) for null.

**Verification.**

- [ ] `npm run build` succeeds with exit code 0
- [ ] Transaction detail page renders both a real value and a null value correctly
- [ ] No new lint or type warnings introduced

**IDE agent suitability.** **Yes**, with the explicit guidance below.

**Suggested IDE prompt.** "Open [app/(app)/audit/[runId]/transaction/[id]/page.tsx](app/(app)/audit/[runId]/transaction/[id]/page.tsx) at the line where `formatCurrency(order_value)` is called. The argument's type is `number | null`. Add a nullable currency formatter at `lib/utils/formatCurrency.ts` (or extend the existing one) that returns `'—'` for null and the formatted currency string otherwise. Replace the call. Do not change any business logic; do not coerce null to zero. Run `npm run build` to confirm. Add a unit test in `tests/utils/formatCurrency.test.ts` covering null and non-null inputs."

---

## 0.3 Re-enable Playwright workflow against staging

**Objective.** Restore the Playwright workflow that was deleted in commit `796f7fc`. Configure it to run against a stable staging URL with seeded test data.

**Rationale.** Without E2E tests, Phase 1 fixes (evidence flow, hydration, inbox) cannot be verified end-to-end. Critical-path Playwright is the safety net for Phase 1 and Phase 2.

**Risk level.** Medium (CI infra, can flake if not configured carefully).

**Effort.** 2–3 days.

**Dependencies.** Phase 0.1, 0.2 must be merged first (so `main` is buildable and the test suite is green).

**Files.** `.github/workflows/playwright-audit.yml` (re-create), `tests/playwright.config.ts`, `tests/utils/seed*.ts`, `PLAYWRIGHT_SETUP_TODO.md` (move into `docs/internal/`).

**Migrations.** None (but staging Supabase project needs all migrations applied).

**Tests impacted.** All Playwright suites under `tests/` with `*.spec.ts`.

**Regression risks.** Flaky tests in CI block merges. Mitigate by tagging known-stable tests with `@critical` and running only that subset until stability is proven.

**Verification.**

- [ ] Staging Supabase project provisioned with all 28 migrations applied
- [ ] Seed data generation script runs in CI (`tests/utils/generate-fixtures.ts`)
- [ ] Workflow runs against `staging.unauth.example` (or a stable preview URL)
- [ ] At minimum: login, dashboard load, customers list, customer drawer, evidence list pass
- [ ] Workflow runs to completion in <15 minutes (otherwise developers won't wait for it)

**Deployment notes.** Workflow on `pull_request` and `push` to `main`. Cron weekly for full suite.

**Do not parallelise with.** 0.1, 0.2.

**IDE agent suitability.** **Partial.** The workflow YAML and seed scripts are mechanical; the staging environment provisioning is human.

**Suggested IDE prompt.** "Restore the Playwright workflow. Create `.github/workflows/playwright-audit.yml` that: (1) runs on PR and on push to main, (2) uses the secrets `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_SERVICE_ROLE_KEY`, `STAGING_BASE_URL`, (3) runs `npm ci`, then `npx playwright install --with-deps`, then `PLAYWRIGHT_BASE_URL=$STAGING_BASE_URL npx playwright test --config=tests/playwright.config.ts --project=critical --project=mobile`, (4) uploads the HTML report as a workflow artifact. Add Node 20 cache. Do not skip flaky tests; tag them and route them to a separate non-blocking job."

---

## 0.4 Add the doc-drift CI check

**Objective.** Generate the README signal/weight table from [lib/engine/weights.ts](lib/engine/weights.ts) and fail CI if the README is out of sync.

**Rationale.** The README/code drift in the audit was a credibility blow because it implied the team doesn't keep docs current with code. Mechanically fixing it is easy; preventing recurrence requires CI enforcement.

**Risk level.** Low.

**Effort.** 0.5 day.

**Dependencies.** 0.1 (so the weights are in their final state for this phase).

**Files.** Add `scripts/generate-signals-readme.mjs`. Add a CI step that runs it with `--check` mode.

**Verification.**

- [ ] `npm run docs:check` passes locally and in CI
- [ ] README signal table now matches [lib/engine/weights.ts](lib/engine/weights.ts) byte-for-byte
- [ ] CI fails if a developer edits weights without re-running generation

**IDE agent suitability.** **Yes.**

**Suggested IDE prompt.** "Create `scripts/generate-signals-readme.mjs`. It imports `SIGNAL_WEIGHTS` from [lib/engine/weights.ts](lib/engine/weights.ts) (use ts-node or compile on the fly) and emits a markdown table with columns `Signal | Weight | What it detects`. Read descriptions from a co-located `lib/engine/signal-descriptions.ts` (create if missing, one human description per signal). The script supports two modes: `--write` updates README.md between two HTML comments `<!-- signals-table:start --> ... <!-- signals-table:end -->`, and `--check` exits non-zero if the file would change. Add `npm run docs:generate` and `npm run docs:check`. Add the latter to the CI workflow."

---

## 0.5 Phase 0 gate

Phase 0 is complete when:

- [ ] `npm run build` succeeds in CI
- [ ] `npm test` succeeds in CI
- [ ] `npm run lint` succeeds in CI
- [ ] Playwright `--project=critical` runs green against staging
- [ ] README signals match `lib/engine/weights.ts`
- [ ] All four PRs above merged to `main`

**Cut a tag** `v0.5.0-foundation` so a known-good state exists for rollbacks.

---

# PHASE 1 — Demo-Critical Fixes

**Estimated calendar: 4–6 days. Risk: Mostly Low/Medium (mechanical UI/API fixes).**

These fixes are the difference between a demo that ASOS will respect and one they will quietly close. They touch what an executive sees in the first 15 minutes.

## 1.1 Fix evidence "no orders found" flow

**Objective.** A customer that visibly has orders on `/customers/[id]` must show those orders on `/customers/[id]/evidence/new` and allow evidence generation.

**Rationale.** This is the single most demo-fatal bug. Per `ASOS_READY_UI_UX_IMPLEMENTATION_DOC.md` (P0 #6), the evidence-new page issues a query that returns no rows for customers that the customer-detail page successfully renders.

**Risk level.** Medium (touches data joins; getting the wrong fix may include orders from other tenants).

**Effort.** 1–2 days.

**Dependencies.** Phase 0 complete.

**Files & routes.**
- `app/(app)/customers/[id]/page.tsx` — current (working) order query.
- `app/(app)/customers/[id]/evidence/new/page.tsx` — broken page.
- `app/api/evidence/route.ts` (or wherever evidence creation lives).
- [lib/customers/](lib/customers) — likely contains the helper that the working page uses.

**Migrations.** None expected.

**Test suites impacted.** `tests/evidence/`, `tests/customers/`, Playwright critical-path.

**Regression risks.** If the fix copies the customer-detail query verbatim into the evidence page, but the original query didn't apply the `merchant_id` filter via RLS (only via JOIN), you may surface orders the merchant doesn't own. The evidence page must apply the same defence-in-depth scoping pattern as [app/api/customers/[id]/route.ts](app/api/customers/[id]/route.ts) lines 118–154.

**Verification.**

- [ ] On staging, upload [test-data/mixed.csv](test-data/mixed.csv) (or equivalent), open a customer with ≥3 orders, click "Generate evidence package", page now lists those orders
- [ ] Multi-tenant isolation test added: `tests/security/evidenceIsolation.test.ts` — Tenant A cannot generate evidence using Tenant B's order IDs
- [ ] Playwright e2e: critical path "upload → customers → generate evidence" passes
- [ ] `tests/evidence/*` passes
- [ ] PR description explicitly states which scoping pattern was applied and why

**Deployment notes.** Standard PR → staging burn-in → `main`.

**Do not parallelise with.** Customer profile renderer consolidation (1.6) — that touches the same routes.

**IDE agent suitability.** **Partial.** The fix is mechanical *if* the agent is told to mirror the existing scoping pattern. The agent must NOT invent a new pattern.

**Suggested IDE prompt.** "Open `app/(app)/customers/[id]/page.tsx` and document (in the PR description) the exact query that fetches the customer's orders, including any merchant_id / job_id filters. Then open `app/(app)/customers/[id]/evidence/new/page.tsx` and replace its order-fetching query with the same pattern. **Critical:** preserve the defence-in-depth scoping seen in `app/api/customers/[id]/route.ts` lines 118–154 — fetch the merchant's owned `job_id`s and constrain orders to those. Do NOT bypass RLS without app-side scoping. Add `tests/security/evidenceIsolation.test.ts` that constructs two merchants, asserts merchant A cannot list orders belonging to merchant B's customer profile."

---

## 1.2 Fix hydration error (`button` inside `button`)

**Objective.** Eliminate the React hydration warning emitted by `CustomerProfileCard` where a `WatchlistStarButton` is nested inside a clickable wrapper `<button>` (or `<div role="button">`).

**Rationale.** Browser console errors during a live demo destroy credibility instantly.

**Risk level.** Low.

**Effort.** 0.5 day.

**Dependencies.** Phase 0 complete.

**Files.**
- [components/audit/CustomerProfileCard.tsx](components/audit/CustomerProfileCard.tsx) lines 32–38 (per the audit).
- [components/audit/WatchlistStarButton.tsx](components/audit/WatchlistStarButton.tsx).

**Verification.**

- [ ] No "validateDOMNesting" / "button cannot be a descendant of button" warnings in the browser console on `/customers`, `/audit/[id]`, `/customers/[id]`
- [ ] Keyboard navigation: pressing Enter/Space on the card still opens the drawer; pressing Enter/Space on the star toggles the watchlist independently
- [ ] Star button retains its existing optimistic UI and undo countdown

**IDE agent suitability.** **Yes.**

**Suggested IDE prompt.** "Fix the nested-button hydration error in [components/audit/CustomerProfileCard.tsx](components/audit/CustomerProfileCard.tsx). The card is rendered as a `<button>` (or `<div role='button'>`) and contains a `WatchlistStarButton` which is itself a `<button>`. Refactor so the card uses a non-button wrapper (`<article>` or `<div>`) with an explicit `<button>` child for the row's primary action, OR turn the star into a standalone overlay positioned absolutely outside the row's clickable region. Preserve existing keyboard semantics: Enter/Space on the row opens the drawer, Enter/Space on the star toggles the watchlist. Verify by checking the browser console on `/customers` is clean."

---

## 1.3 Populate the inbox correctly

**Objective.** When an audit run flags transactions, those flagged transactions appear in the user's inbox on `/inbox`.

**Rationale.** Per `ASOS_READY_UI_UX_IMPLEMENTATION_DOC.md` (P0 #8), an audit run can produce 9 high-risk transactions while the inbox stays empty. This breaks the "review the queue" workflow that fraud analysts rely on.

**Risk level.** Medium (defines a producer/consumer contract that may not exist yet).

**Effort.** 1 day.

**Dependencies.** Phase 0 complete.

**Files & routes.**
- `app/(app)/inbox/page.tsx` and `components/inbox/*`.
- The audit-run consumer that should write inbox entries — likely `lib/processing/worker.ts` (FROZEN — read-only here) or a post-processing hook in [app/api/process-csv-job/route.ts](app/api/process-csv-job/route.ts).
- `components/inbox/InboxList.tsx` and friends.

**Migrations required.** Possibly: a new `inbox_items` table or a view over `audit_transactions` filtered by status. Decide before writing code; document the decision in the PR.

**Test suites.** `tests/api/`, Playwright e2e.

**Regression risks.** Writing inbox items from inside the worker (frozen core) is unsafe — instead, add a post-job hook OR make the inbox a *query* (a `SELECT` over `audit_transactions WHERE status = 'flagged' AND merchant_id = ?`).

**Recommendation.** Implement inbox as a *view*, not a separate write path. The flagged-transactions table already exists; surface it.

**Verification.**

- [ ] Upload `test-data/mixed.csv` (which contains labelled fraud rows) on staging; inbox shows the high-risk rows immediately
- [ ] Inbox row count matches the dashboard's "live review queue count" KPI
- [ ] Inbox respects `merchant_id` scoping (cross-tenant leak test)
- [ ] Inbox has at least one filter (today / week / all-time)
- [ ] Inbox row click opens the customer drawer (consistent with `/customers`)

**IDE agent suitability.** **Yes**, given the architectural decision (view, not write path) is made first.

**Suggested IDE prompt.** "Define the inbox as a *query* over `audit_transactions` filtered by `merchant_id` (via owned job IDs, defence-in-depth as in `app/api/customers/[id]/route.ts:118–154`) and `score >= FLAG_THRESHOLD` and a status that is not 'reviewed'. Implement `app/api/inbox/route.ts` if missing. Render in `app/(app)/inbox/page.tsx`. Add a tabs UI (Today / This week / All open). Each row shows: date, customer (masked email), score, primary signal, action: open drawer. Test on staging with `test-data/mixed.csv`."

---

## 1.4 Replace internal jargon with merchant-facing copy

**Objective.** All user-visible labels — `disputeHistory`, `cluster ID`, `elevated_refund_rate`, `value_escalation`, `signals_matched`, `card`, `email`, `ip`, etc. — are routed through a centralised copy module and rendered as English merchants understand.

**Rationale.** Internal jargon in the UI signals an incomplete product. ASOS analysts will distrust the engine if they don't understand the labels. The audit identified ~15 problem terms.

**Risk level.** Low.

**Effort.** 1–2 days.

**Dependencies.** Phase 0 complete.

**Files.**
- New canonical module: extend [lib/copy/](lib/copy) with `lib/copy/labels.ts` and `lib/copy/signals.ts`.
- All components in [components/customers/](components/customers), [components/audit/](components/audit), [components/dashboard/](components/dashboard) that render these labels.
- Filter components: [app/(app)/customers/page.tsx](app/(app)/customers/page.tsx) and `CustomersFilterSheet`.

**Migrations.** None.

**Test suites.** Playwright "banned words" check (the existing UX-audit suite already does this — re-enable it).

**Regression risks.** Translation must not change *meaning*. "Elevated refund rate" → "High refund claim rate" is fine; "Disputed" must not become "Fraud" (the engine never uses that word for a reason).

**Verification.**

- [ ] No occurrence of `disputeHistory`, `cluster_id`, `elevated_refund_rate`, `value_escalation`, `signals_matched` in any `app/(app)/**/*.tsx` or `app/(public)/**/*.tsx` rendered output
- [ ] Playwright "banned words" suite passes
- [ ] Filter chips on `/customers` show user-facing labels
- [ ] Customer drawer "Why flagged" panel uses sentence-case English

**IDE agent suitability.** **Yes.**

**Suggested IDE prompt.** "Create `lib/copy/labels.ts` exporting a typed map from internal-key → user-facing label, e.g. `elevated_refund_rate: 'High refund claim rate'`. Create `lib/copy/signals.ts` exporting per-signal display name + one-line explanation. Find every JSX file under `app/(app)/`, `app/(public)/`, and `components/` that renders a raw internal key (grep for the literal strings: 'disputeHistory', 'elevated_refund_rate', 'value_escalation', 'signals_matched', 'cluster_id', 'cluster ID', 'IP', 'card', 'email', 'phone' — ignore type definitions, only JSX text or attribute values). Replace each with the corresponding `LABELS[key]`. Do not change any data shapes, types, or API responses; only the rendered text. After change, search the rendered output of `/customers`, `/dashboard`, `/audit/[id]` and confirm all chips/labels are in English."

---

## 1.5 Add `loading.tsx` and `error.tsx` to every `(app)` route group

**Objective.** No more blank-canvas page transitions on long-running pages (audit, customers, dashboard).

**Rationale.** Loading flashes are an MVP smell. ASOS executives will notice on a 10k-row audit page.

**Risk level.** Low.

**Effort.** 1 day.

**Dependencies.** Phase 0 complete.

**Files.** Add `loading.tsx` and `error.tsx` for each of:

- `app/(app)/dashboard/`
- `app/(app)/upload/`
- `app/(app)/customers/`
- `app/(app)/customers/[id]/`
- `app/(app)/history/`
- `app/(app)/chargebacks/`
- `app/(app)/chargebacks/[id]/`
- `app/(app)/watchlist/`
- `app/(app)/inbox/`
- `app/(app)/lookup/`
- `app/(app)/saved/`
- `app/(app)/settings/`
- `app/(app)/help/`
- `app/(app)/onboarding/`
- `app/(app)/audit/[runId]/`
- `app/(app)/audit/[runId]/transaction/[id]/`

Reuse `components/ui/LoadingState.tsx` (already exists per `components/ui/`) and a new `ErrorBoundaryUI` if needed.

**Verification.**

- [ ] Every `(app)/*` route has `loading.tsx` and `error.tsx`
- [ ] On staging, throttle network to "Slow 3G", navigate between pages, verify skeletons appear
- [ ] Force an error in `app/(app)/customers/[id]/page.tsx` (e.g., throw in dev), verify `error.tsx` renders gracefully with a "try again" button

**IDE agent suitability.** **Yes.**

**Suggested IDE prompt.** "Add `loading.tsx` and `error.tsx` files to every immediate subdirectory of `app/(app)/`. Each `loading.tsx` returns the existing `<LoadingState>` skeleton (from `components/ui/LoadingState.tsx`) sized to fit the route's primary content. Each `error.tsx` is a 'use client' component that takes `{ error, reset }` props and renders a simple card with the error name (NOT message — never leak DB errors), a 'Try again' button calling `reset()`, and a 'Go to dashboard' link. Do not add `loading.tsx` to leaf segments where the parent already renders skeleton — minimum scope is the tabs above."

---

## 1.6 Consolidate three customer profile renderers (advisory; can defer to Phase 4)

**Objective.** Replace `CustomerProfileCard`, `CustomerIntelligenceDrawer`, and `customers/[id]/page.tsx` body with a single `<CustomerProfilePanel mode="card|drawer|page">`.

**Rationale.** Three renderers means three places to update for any change. ASOS will see inconsistencies.

**Risk level.** Medium (touches multiple routes; UI regression possible).

**Effort.** 3–4 days.

**Dependencies.** 1.2 (hydration fix) must merge first.

**Recommendation.** **Defer to Phase 4.** Demo-critical it is not. Listed here for awareness.

---

## 1.7 Remove "draft" markers from public legal pages (after final review)

**Objective.** `app/(public)/legal/dpa/*` and adjacent pages have all "draft" / "final review" markers removed and a final review pass applied.

**Rationale.** ASOS Procurement will refuse a draft DPA on sight.

**Risk level.** Medium-Low (legal content is meaningful; do not just remove the word, do an actual final review).

**Effort.** 0.5 day engineering + 1–2 days legal calendar time.

**Dependencies.** Phase 0 complete. Legal/DPO review.

**Files.** `app/(public)/legal/dpa/page.tsx`, `app/(public)/legal/privacy/page.tsx`, `app/(public)/legal/data-handling/page.tsx`.

**Verification.**

- [ ] No string "draft" or "final review" appears in any `app/(public)/legal/**/*.tsx`
- [ ] Document version, last-revised date, and effective date are explicit
- [ ] DPA references are accurate (Supabase = EU storage; Vercel sub-processor; Amplitude flow corrected per 1.8 and 2.4)

**Deployment notes.** Should NOT ship before 1.8 (Amplitude PII fix) or it would publicise an inaccurate claim.

**IDE agent suitability.** **No.** Legal copy. Human only, with legal review.

---

## 1.8 Stop sending merchant PII to Amplitude

**Objective.** [components/common/AmplitudeInit.tsx](components/common/AmplitudeInit.tsx) and [lib/analytics/amplitude.ts](lib/analytics/amplitude.ts) call `identify()` with only the anonymised `merchantId` (UUID) and event counts. `storeName`, `monthlyOrderVolume`, `primaryConcern` are no longer transmitted.

**Rationale.** The DPA claims Amplitude receives only anonymised data. Today this is false. ASOS DPO will catch this in the questionnaire.

**Risk level.** Low.

**Effort.** 2 hours.

**Dependencies.** None.

**Files.**
- [lib/analytics/amplitude.ts](lib/analytics/amplitude.ts) — change the `identify()` signature.
- [components/common/AmplitudeInit.tsx](components/common/AmplitudeInit.tsx) — remove the PII-bearing call.
- All callers (grep for `identify(`).

**Verification.**

- [ ] Browser network tab on production confirms no `storeName`, `email`, or merchant business identifiers are sent to Amplitude
- [ ] DPA copy (after 1.7 ships) accurately reflects the new flow
- [ ] Existing event tracking (page views, feature usage) still flows
- [ ] An internal "user properties" panel in Amplitude is not relied upon by the team's analytics dashboards (audit Amplitude project for this)

**Deployment notes.** Must ship at the same time as the DPA correction (1.7). Use a feature flag if the merge order is uncertain.

**IDE agent suitability.** **Yes.**

**Suggested IDE prompt.** "Modify [lib/analytics/amplitude.ts](lib/analytics/amplitude.ts) so `identify()` accepts only `merchantId` (UUID) and an optional `accountTier` enum (no PII). Remove the existing `storeName`, `monthlyOrderVolume`, `primaryConcern` parameters and properties. Update the only caller in [components/common/AmplitudeInit.tsx](components/common/AmplitudeInit.tsx) accordingly. Grep the codebase for any other call site and update. Add a comment block at the top of `amplitude.ts` documenting the privacy contract: 'Only anonymised merchant identifier and event-level metadata are transmitted. No PII, no merchant business names.'"

---

## 1.9 Pre-load demo merchant with realistic data

**Objective.** `staging.unauth.example/(public)/demo` shows live audit runs against a realistic synthetic ASOS-shaped dataset, rather than "demo coming soon".

**Rationale.** Demo readiness. The demo page exists but renders nothing if `NEXT_PUBLIC_DEMO_MERCHANT_ID` is unset or the demo merchant has no runs.

**Risk level.** Low.

**Effort.** 1 day.

**Dependencies.** Phase 0 complete; staging environment provisioned.

**Files.** `scripts/test-data/generateBlindMerchantCSVs.ts` (existing) — extend or pair with a new `scripts/seed-demo-merchant.mjs`. `app/(public)/demo/page.tsx`.

**Verification.**

- [ ] Demo merchant has at least 3 audit runs covering small / medium / large data sizes
- [ ] At least one run includes a labelled chargeback so an evidence package can be generated and shown
- [ ] Demo banner appears on every page (`components/layout/DemoBanner` if present)
- [ ] Reset script runs nightly via GitHub Actions cron

**IDE agent suitability.** **Yes.**

**Suggested IDE prompt.** "Create `scripts/seed-demo-merchant.mjs` that uses the existing CSV generators and the [app/api/audit/route.ts](app/api/audit/route.ts) flow (or directly via service-role Supabase client) to: (1) create or recreate a demo merchant with id `NEXT_PUBLIC_DEMO_MERCHANT_ID`, (2) generate three CSVs sized 200 / 1500 / 5400 rows using the existing fashion-leaning fixture generator, (3) upload each via the audit API, (4) wait for processing to complete, (5) generate one evidence package on the highest-risk customer. Add a GitHub Actions workflow `.github/workflows/seed-demo.yml` that runs this script on a daily cron and on manual dispatch, against the staging Supabase project. Surface the script as `npm run seed:demo`."

---

## 1.10 Phase 1 gate

Phase 1 complete when:

- [ ] All Phase 0 gates still green
- [ ] Evidence flow works end-to-end on staging for a non-empty customer
- [ ] No browser console errors on `/customers`, `/dashboard`, `/audit/[id]`
- [ ] Inbox populated by audit run
- [ ] No internal jargon in user-facing surfaces (Playwright banned-words gate green)
- [ ] Skeleton loading state on every `(app)` page
- [ ] DPA finalised
- [ ] Amplitude PII removed
- [ ] Demo merchant seeded with realistic data

Cut tag `v0.6.0-demo-credible`. **At this point a private demo to a friendly stakeholder is plausible** — but not yet to ASOS, because security and compliance are still gaps.

---

# PHASE 2 — Security: Demo & Pilot Blockers

**Estimated calendar: 5–7 days. Risk: HIGH (auth, multi-tenancy). Two reviewers required for every PR.**

Phase 2 can run in parallel with Phase 3 (compliance) because the file surfaces are disjoint.

## 2.1 Rename `proxy.ts` → `middleware.ts` and verify edge auth on every protected route

**Objective.** Make the existing edge auth function actually run by giving it the filename and export name Next.js requires.

**Rationale.** Currently [proxy.ts](proxy.ts) at the project root is dead code: Next.js does not invoke a file named `proxy.ts`. Every protected route is therefore relying on per-page server checks. This is the single most important security finding in the audit and the easiest to fix mechanically — but the *verification* is the hard part. Skipping verification is how you ship a broken auth gate.

**Risk level.** **CRITICAL.** A bad rename can either (a) lock everyone out, (b) leave routes unprotected, or (c) break the magic-link callback.

**Effort.** 0.5 day for the rename + 2 days for full verification.

**Dependencies.** Phase 0 complete (so Playwright can validate). Must merge BEFORE 2.2 (security headers) so the headers can be tested under real auth.

**Files.**
- Delete or rename [proxy.ts](proxy.ts) → `middleware.ts` (project root). Rename the exported function from `proxy` to `middleware`. Keep the same `config.matcher`.
- Verify `app/(auth)/callback/route.ts` and `app/(auth)/login/page.tsx` still work — the matcher excludes auth routes by virtue of the prefix logic in the function body.
- Audit every server component under `app/(app)/` for redundant `auth.getUser()` calls. Decide whether to keep them as defence-in-depth (recommended) or remove (more risk, less code).

**Migrations.** None.

**Test suites.** Playwright critical-path full sweep. Add a new suite `tests/security/middlewareGate.spec.ts`.

**Regression risks.**
- **Lockout:** if the matcher inadvertently catches the static asset paths or the API routes, every request 302s to `/login` and the app is unusable. The current matcher in `proxy.ts` excludes `_next/static`, `_next/image`, `favicon.ico`, and image extensions. Preserve this exactly.
- **Open routes:** if the function returns `NextResponse.next()` too early, protected routes leak.
- **Magic-link callback failure:** if the auth callback path is caught by the matcher and the `/auth` prefix check is wrong, login breaks for new users.
- **Cookie write race:** the existing function rewrites `supabaseResponse` when `cookies.set` fires. Keep this logic intact during the rename.

**Verification checklist (manual + automated).**

Manual:

- [ ] In a logged-out browser, visit `/dashboard`, `/customers`, `/customers/[id]`, `/upload`, `/audit/[id]`, `/inbox`, `/watchlist`, `/saved`, `/settings`, `/chargebacks`, `/help`, `/onboarding`, `/(internal)/eval`, `/(internal)/network-metrics`. Every one redirects to `/login`.
- [ ] In a logged-out browser, visit `/login` and `/`. Both render normally.
- [ ] In a logged-out browser, visit `/(public)/demo` and `/(public)/legal/*`. Both render normally.
- [ ] Sign in with magic link end-to-end — callback completes, landing page is `/dashboard`.
- [ ] Sign in with password — same outcome.
- [ ] When already logged in, `/login` redirects to `/dashboard`.
- [ ] API routes under `/api/*` are reachable (the function correctly skips them so the routes can apply their own auth).
- [ ] Static assets are not redirected.

Automated:

- [ ] New Playwright suite `tests/security/middlewareGate.spec.ts` covers: "logged out + protected route → 307/308 to /login"; "logged in + login → 307/308 to /dashboard"; "static assets are not redirected".
- [ ] Existing Playwright critical-path passes.
- [ ] Internal-route protection: a non-`is_internal` user redirected away from `/(internal)/*`. Add this to the middleware (currently only checked at component level).

**Deployment notes.**
- Deploy to staging FIRST. Run the manual checklist above against staging.
- Cut a tag `v0.7.0-edge-auth` before deploying to prod.
- If anything regresses in prod, revert by reverting the merge commit; the file rename will undo cleanly.

**Do not parallelise with.** Any other security or auth work. This PR ships alone.

**IDE agent suitability.** **No.** A senior engineer with auth experience must own this.

**Suggested human checklist.** "Before merging, do the verification matrix in two browsers (Chrome + Safari) for two account types (logged-out, logged-in). Confirm Vercel preview deploy passes the manual checks. Confirm the Playwright `tests/security/middlewareGate.spec.ts` is green."

---

## 2.2 Add security headers in `next.config.js`

**Objective.** [next.config.js](next.config.js) emits CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy on every response.

**Rationale.** ASOS security questionnaire failure today. Header-only fix; no app-logic change.

**Risk level.** Medium. CSP can break legitimate scripts (Amplitude SDK, Supabase realtime, fonts) if too strict.

**Effort.** 1 day (mostly tuning the CSP for Amplitude + Supabase + fonts).

**Dependencies.** 2.1 must merge first. 1.8 must merge first (so Amplitude isn't sending PII through the CSP'd connection).

**Files.** [next.config.js](next.config.js) — add a `headers()` function returning the security headers.

**Migrations.** None.

**Test suites.** Playwright critical-path (verifies the app still works under CSP). New `tests/security/headers.spec.ts`.

**Regression risks.**
- CSP `script-src` too strict blocks Amplitude or Vercel analytics.
- CSP `connect-src` too strict blocks Supabase realtime or storage.
- CSP `font-src` too strict blocks Google Fonts (DM Sans).
- `frame-ancestors 'none'` is correct for the app but breaks any future embedded widget; document.

**Verification.**

- [ ] `curl -I https://staging.unauth.example/` shows all six headers
- [ ] No CSP violations in browser console on `/dashboard`, `/customers`, `/upload`, `/onboarding`
- [ ] Amplitude SDK loads and fires events
- [ ] Supabase auth callback works
- [ ] Image domain restriction (existing `remotePatterns`) still functional
- [ ] [Mozilla Observatory](https://observatory.mozilla.org/) score ≥ B (aim A− with the report linked in the PR)

**Deployment notes.**
- Roll out CSP in **report-only mode** first (`Content-Security-Policy-Report-Only`). Leave it in report-only for 48 hours, monitor reports, then flip to enforce.
- Provide a CSP-report endpoint `app/api/csp-report/route.ts` (low-risk, just logs).

**Do not parallelise with.** Any client-side feature change that adds a new external script (e.g., a new analytics provider).

**IDE agent suitability.** **Partial.** The headers config is mechanical; the CSP tuning needs human verification with the running app.

**Suggested IDE prompt.** "In [next.config.js](next.config.js), add an async `headers()` function returning the following on `source: '/(.*)'`: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. Add a `Content-Security-Policy-Report-Only` header (NOT enforced) with: `default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.amplitude.com https://*.amplitude.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.amplitude.com; img-src 'self' data: https://*.supabase.co; font-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; report-uri /api/csp-report`. Create `app/api/csp-report/route.ts` that POSTs are accepted and logged via `console.warn`. Verify on staging with browser devtools showing zero violations after 48 hours, then in a follow-up PR rename `Content-Security-Policy-Report-Only` → `Content-Security-Policy`."

---

## 2.3 Tighten cross-merchant `fraud_entities` access

**Objective.** Replace authenticated-read access on `fraud_entities` and `fraud_entity_co_occurrences` with a `SECURITY DEFINER` RPC parameterised by `merchant_id` that returns only k-anonymous, masked aggregates.

**Rationale.** Today any authenticated user can `SELECT * FROM fraud_entities` and infer cross-merchant fraud patterns. ASOS will not accept this in a multi-tenant deployment.

**Risk level.** **HIGH.** Touches a frozen-core data path used by the cross-merchant signal in [lib/engine/fastScore.ts](lib/engine/fastScore.ts).

**Effort.** 3 days.

**Dependencies.** 2.1 complete (so middleware-protected routes are real). Phase 0 (CI green).

**Files.**
- New migration `supabase/migrations/00XX_fraud_entities_scoped_access.sql` — revokes SELECT from `authenticated`, creates `SECURITY DEFINER` function `get_fraud_entity_signals(p_merchant_id uuid, p_entity_type text, p_entity_value_hash text)` that returns k-anonymous aggregates (only when `total_merchants >= 3`).
- [lib/engine/fastScore.ts](lib/engine/fastScore.ts) — replace direct table reads with the RPC call. Frozen-core file; requires sign-off.
- [lib/analysis/entityResolution.ts](lib/analysis/entityResolution.ts) (or wherever `fetchProfilesByOverlap` lives) — same.
- New test `tests/security/crossMerchantInferenceAttack.test.ts`.

**Migrations.** Yes — additive: create the RPC, then a follow-up that revokes table SELECT. Do these in two separate migration files so the revoke can be rolled back independently.

**Test suites.** Engine, eval, identity, security.

**Regression risks.** Cross-merchant signal misfiring or silently stopping firing. Eval F1 will move; capture the delta in the PR description.

**Verification.**

- [ ] As a non-admin authenticated user, `SELECT FROM fraud_entities` returns rows only via the RPC (direct SELECT denied)
- [ ] Engine eval passes with bounded delta (precision/recall change documented)
- [ ] Inference attack test (`tests/security/crossMerchantInferenceAttack.test.ts`) confirms a merchant cannot enumerate the underlying entities table or the merchant counts beyond k-anonymous aggregates
- [ ] Lookup endpoint (`/api/lookup`) still works (it already uses an RPC; verify the new RPC pattern is consistent)
- [ ] Performance: RPC latency under the engine's expected SLA (<200ms median for the scoring path)

**Deployment notes.**
- Deploy migration to staging.
- Run a backfill check: ensure the RPC returns the same data shape the engine expects.
- Run engine on `friendly_fraud_blind_test_2000.csv` and compare F1 against `threshold-recommendations.json`. If F1 moves > 0.02, hold and investigate.
- Gate the RPC behind `LOOKUP_FF_RPC=true` env flag for the first deploy if you want a quick-revert lever.

**Do not parallelise with.** Any other engine work. Frozen-core touch.

**IDE agent suitability.** **No.** Frozen core + multi-tenant boundary + migration + RPC author. Senior engineer + security review.

---

## 2.4 Add MIME / magic-byte validation on uploads

**Objective.** [app/api/audit/route.ts](app/api/audit/route.ts) (and any other upload endpoints) validate that the uploaded file is actually a CSV before processing.

**Rationale.** Today, anything with a `.csv` extension is processed. A malicious or accidental upload of a `.exe` or `.json` is silently accepted.

**Risk level.** Medium.

**Effort.** 1 day.

**Dependencies.** Phase 0 complete.

**Files.** [app/api/audit/route.ts](app/api/audit/route.ts), [lib/csv/parse.ts](lib/csv/parse.ts), `app/api/process-csv-job/*`.

**Verification.**

- [ ] Upload a `.png` renamed to `.csv` — rejected with 400
- [ ] Upload a `.csv` with valid magic bytes (UTF-8 text + BOM) — accepted
- [ ] Upload a `.csv` without BOM — accepted (BOM is optional)
- [ ] Upload a 60 MB file — rejected (cap stays at 50 MB; see Phase 5 for raising)
- [ ] No false-rejections on real ASOS-shaped synthetic CSVs

**IDE agent suitability.** **Yes**, with care.

**Suggested IDE prompt.** "In [app/api/audit/route.ts](app/api/audit/route.ts), after the file is downloaded from storage, sniff the first 512 bytes. Reject (400) if any of: (a) filename does not end in `.csv` or `.tsv`, (b) the first 512 bytes contain a null byte (binary file detection), (c) the first 512 bytes do not match either UTF-8 BOM + ASCII or pure ASCII text. Use a small helper at `lib/csv/sniffMagicBytes.ts`. Add `tests/csv/magicBytes.test.ts` covering: PNG renamed to .csv, JSON renamed to .csv, valid CSV with BOM, valid CSV without BOM, 0-byte file, 1-byte file, file with leading whitespace. Do not change the file-size cap; that's a Phase 5 item."

---

## 2.5 Add per-route rate limiting

**Objective.** Auth, audit, evidence, watchlist, fraud-feedback, and lookup endpoints have per-IP and per-merchant rate limits.

**Rationale.** Brute-force protection on auth, abuse protection on evidence generation, noisy-neighbour protection on heavy endpoints.

**Risk level.** Medium (legitimate users hitting rate limits during demos is embarrassing; tune carefully).

**Effort.** 2 days.

**Dependencies.** 2.1 complete (so the middleware can host the rate-limit middleware).

**Files.** New `lib/ratelimit.ts`. Apply in [proxy.ts → middleware.ts](proxy.ts), [app/api/audit/route.ts](app/api/audit/route.ts), `app/api/evidence/*`, `app/api/watchlist/*`, `app/api/fraud-feedback/*`, `/api/lookup` (which already has in-memory limiting; consolidate).

**Verification.**

- [ ] Auth endpoint: 5 attempts per IP per minute → 429
- [ ] Evidence generation: 60 per merchant per hour → 429
- [ ] Audit upload: 10 per merchant per hour → 429
- [ ] Lookup: existing limits preserved
- [ ] 429 response includes `Retry-After` header
- [ ] Limits are configurable via env vars

**Deployment notes.** Use Vercel KV or Upstash Redis. In-memory limiters work in dev only. **Do not** ship in-memory limiters to production behind a multi-instance Vercel function — the limit becomes per-instance, not per-merchant.

**IDE agent suitability.** **Yes** with a clear infra choice.

**Suggested IDE prompt.** "Add `lib/ratelimit.ts` using Upstash Redis (read URL/token from env). Export `rateLimit(key: string, max: number, windowSeconds: number)` returning `{ allowed: boolean, retryAfter: number }`. Wrap [app/api/audit/route.ts](app/api/audit/route.ts) (10 / hour / merchant), `app/api/evidence/[id]/route.ts` (60 / hour / merchant), `app/api/watchlist/route.ts` (120 / hour / merchant). Wrap the auth POST endpoints (5 / minute / IP). On 429, return `{ error: 'rate_limited', retryAfter: seconds }` and the standard `Retry-After` header. Limits read from env: `RL_AUDIT_PER_HOUR`, etc., defaulting to the values above. Do not block static assets or middleware-skipped routes."

---

## 2.6 Build a "scoped service client" wrapper

**Objective.** A single `lib/supabase/scoped.ts` exports a function that wraps the service-role client and enforces `merchant_id` on every query at the framework level.

**Rationale.** Today, every API route writes its own merchant-scoping. A single forgotten `.eq('merchant_id', m)` is a tenant leak. The audit identified [app/api/customers/[id]/route.ts](app/api/customers/[id]/route.ts:118) as the gold standard; replicating that pattern by hand across 17 API routes is fragile.

**Risk level.** **HIGH** (touches every API route).

**Effort.** 3 days.

**Dependencies.** 2.1, 2.3 complete.

**Files.** New `lib/supabase/scoped.ts`. Update every API route to use it.

**Verification.**

- [ ] All 17 route groups under [app/api/](app/api) use the scoped wrapper or have a documented exemption (e.g., `process-csv-chunk` uses HMAC and not user-merchant scoping)
- [ ] Multi-tenant isolation suite (`tests/api/merchantIsolation.test.ts`) covers every route
- [ ] Eslint custom rule (or a TypeScript type guard) prevents direct service-role table access in route handlers — make it a CI gate

**Deployment notes.** This refactor is large. Ship per-route in separate PRs, not one mega-PR.

**Do not parallelise with.** Any feature work in `app/api/`.

**IDE agent suitability.** **Partial.** Wrapper authoring + per-route migration is mechanical; verifying tenant isolation requires human review.

**Suggested IDE prompt.** "Create `lib/supabase/scoped.ts`. Export `createScopedClient(merchantId: string): ScopedSupabaseClient`, where the returned client wraps the service-role client and exposes a `from(table)` method that returns a query builder pre-filtered with `.eq('merchant_id', merchantId)` for tables in a known allowlist (declare `const TENANT_TABLES = ['audit_transactions', 'customer_profiles', 'watchlist_entries', 'customer_notes', 'processing_jobs', 'evidence_packages', ...]`). For tables NOT in the allowlist (e.g., `merchants`), pass through unchanged. Throw if `merchantId` is empty or null. Migrate one route at a time, starting with [app/api/audit/route.ts](app/api/audit/route.ts). Do NOT touch routes inside `app/api/process-csv-chunk/` (those use HMAC, not user merchant scoping). Add a CI lint rule (or a Jest test that scans the codebase) ensuring no other route uses `.from('audit_transactions')` directly without going through the scoped client."

---

## 2.7 Phase 2 gate

Phase 2 complete when:

- [ ] Middleware verified across every protected and public route in two browsers
- [ ] CSP report-only mode running on staging for ≥48 hours with zero unexplained violations
- [ ] `fraud_entities` no longer has authenticated SELECT; RPC mediates access
- [ ] Magic-byte validation in place
- [ ] Per-route rate limiting active on staging
- [ ] Scoped service client adopted by ≥80% of API routes
- [ ] Multi-tenant isolation Jest suite covers every API route
- [ ] Mozilla Observatory score ≥ B

Cut tag `v0.8.0-security-pilot-ready`. **At this point ASOS Security can be engaged for a questionnaire conversation** — the answers map to evidence in the repo and on the live staging deployment.

---

# PHASE 3 — Compliance and Legal Pack

**Estimated calendar: 5–7 days. Risk: Medium (data integrity for soft delete; otherwise low). Can run in parallel with Phase 2.**

## 3.1 Implement real soft delete

**Objective.** Replace the no-op [supabase/migrations/0019_soft_delete.sql](supabase/migrations/0019_soft_delete.sql) with a working implementation: `deleted_at` columns, RLS exclusion, app-side updates instead of deletes, and a periodic purge job for the 30-day retention window.

**Rationale.** GDPR Article 17 + the README's documented deletion flow + ASOS DPO's expected questions.

**Risk level.** **HIGH.** RLS policy changes can cause outages.

**Effort.** 3–5 days.

**Dependencies.** Phase 0 + 2.1.

**Files.**
- New migration `supabase/migrations/00XX_soft_delete_columns.sql` — adds `deleted_at TIMESTAMPTZ` to: `audit_transactions`, `customer_profiles`, `watchlist_entries`, `customer_notes`, `processing_jobs`, `evidence_packages` (or wherever evidence lives), and any other tenant-scoped table.
- New migration `supabase/migrations/00XX+1_soft_delete_rls.sql` — updates RLS policies to add `AND deleted_at IS NULL` to SELECT/UPDATE policies. **Two-step migration** so the first deploy is reversible.
- App-side: every `.delete()` call must be replaced with `.update({ deleted_at: now() })`. Grep the codebase for `.delete(` and audit each. Likely call sites: `app/api/settings/bulk-delete/route.ts`, `app/api/watchlist/route.ts` (remove from watchlist), `app/api/customers/[id]/notes/route.ts`.
- New scheduled job `app/api/cron/purge-soft-deleted/route.ts` — purges rows where `deleted_at < now() - interval '30 days'`. Runs daily via Vercel Cron. **Restricted to a CRON_SECRET-bearing caller.**

**Migrations.** Two — column add (safe to reverse), then RLS update (safer to deploy after column has propagated). Never combine.

**Test suites.** `tests/security/`, `tests/api/`. Add `tests/compliance/softDelete.test.ts` and `tests/compliance/retentionPurge.test.ts`.

**Regression risks.**
- **RLS lockout:** if the SELECT policy is updated incorrectly, users see no rows. Test on staging.
- **Dashboard counts:** any aggregate query that does `SELECT COUNT(*) FROM audit_transactions` now sees soft-deleted rows unless the RLS update lands. Audit dashboards.
- **Foreign key cascades:** if a parent is soft-deleted, what about children? Document the policy: parents soft-delete; children remain referenceable until parent is purged.

**Verification.**

- [ ] Adding `.delete()` anywhere in `app/api/` fails CI (lint rule `no-restricted-syntax`)
- [ ] `delete a customer note` flow: row's `deleted_at` is set; `GET /api/customers/[id]/notes` no longer returns it
- [ ] After 30 days (test by manipulating `deleted_at`), the cron job purges
- [ ] DSAR request (Phase 6) can identify soft-deleted-but-not-yet-purged rows

**Deployment notes.**
- Migration 1 (column add): deploy to staging, then prod the same day. Reversible.
- Wait 24 hours.
- App-side change (replace `.delete()` with `.update()`): merge after migration 1 is in prod.
- Migration 2 (RLS update): merge AFTER app-side is deployed and verified for 24 hours.
- Cron job: deploy last.

**Do not parallelise with.** Any feature that adds new tenant-scoped tables (would need to inherit the convention).

**IDE agent suitability.** **Partial.** The mechanical replacement of `.delete()` with `.update({ deleted_at })` is agent-suitable; the migrations and RLS are not.

**Suggested IDE prompt for the app-side replacement (DO NOT include the migrations):** "Grep the entire repository under `app/api/` for `.delete()` calls on Supabase queries (NOT JS array methods). For each, replace with `.update({ deleted_at: new Date().toISOString() })`. Preserve all other filters. Do NOT touch any code under `lib/processing/` (frozen). Do NOT touch any test fixtures. Add a Jest test asserting that 'remove from watchlist' soft-deletes (not hard-deletes) and that the row remains in the database with `deleted_at` set. Do not write or modify migrations; that's a separate PR."

---

## 3.2 Author DPIA and Article 22 statement

**Objective.** A `docs/legal/dpia.md` and `docs/legal/article-22-statement.md` exist; the latter is also surfaced as a public page or DPA appendix.

**Rationale.** UK GDPR Article 35 (DPIA) and Article 22 (automated decision-making) are explicit ASOS DPO/Legal expectations.

**Risk level.** Low engineering, medium legal (gets it wrong and the document is worthless).

**Effort.** 1 week of legal calendar time + 1 day of engineering authoring + review.

**Dependencies.** None (parallel-able).

**Files.**
- `docs/legal/dpia.md` (new).
- `docs/legal/article-22-statement.md` (new).
- `app/(public)/legal/article-22/page.tsx` (new) — the public surface.
- `app/(public)/legal/dpa/page.tsx` (existing) — link from here.

**Verification.**

- [ ] DPIA covers: data subjects, processing purposes, lawful basis, retention, sub-processors, transfer mechanism, risks, mitigations, residual risk
- [ ] Article 22 statement covers: what is automated, what isn't, how human review is triggered, how to contest a decision, who reviews appeals, the SLA on appeals
- [ ] Legal review sign-off is in the PR (link to email or signed document)
- [ ] DPA links to the Article 22 statement
- [ ] No public-facing legal page is marked "draft"

**IDE agent suitability.** **No.** Legal authoring with engineering input. The agent can scaffold the page structure but the content is human.

---

## 3.3 Build an "appeal" workflow primitive

**Objective.** A customer (or merchant on their behalf) can request human review of an automated flag. The investigation status enum gains an `Appealed` value. A SLA timer starts. The appeal is logged.

**Rationale.** Article 22's "right to contest" requires a workable mechanism, not just policy text.

**Risk level.** Low.

**Effort.** 2 days.

**Dependencies.** 3.2 complete (the policy informs the workflow).

**Files.**
- New migration `supabase/migrations/00XX_investigation_appeals.sql` — extends the investigation_status enum.
- `components/customers/InvestigationStatusSelect.tsx` — adds the new option with the SLA timer field.
- `app/api/customers/[id]/appeal/route.ts` — new endpoint.

**Verification.**

- [ ] Appeal can be raised on a customer detail page
- [ ] Appeal generates an audit log entry
- [ ] Appeal sets a `appeal_due_at` timestamp (default: 30 days from now)
- [ ] Inbox surfaces appeals nearing their SLA

**IDE agent suitability.** **Yes**, given the schema decision is made first.

---

## 3.4 Phase 3 gate

- [ ] `0019_soft_delete.sql` is no longer a no-op (or a follow-up migration supersedes it)
- [ ] No `.delete()` calls in `app/api/`
- [ ] DPIA + Article 22 statement signed off
- [ ] Public legal pages have no "draft" markers
- [ ] Appeal primitive exists in the data model and UI

Cut tag `v0.9.0-compliance-pilot-ready`.

---

# PHASE 4 — Pilot-Quality UX, Governance, Observability

**Estimated calendar: 8–12 days. Risk: Medium. Can partially parallel with Phase 5.**

## 4.1 Build the Settings → Team UI on `lib/permissions`

**Objective.** Replace the dead redirect at `/settings/team` with a working team management surface: invite, list, role change, audit trail of role changes.

**Rationale.** ASOS will not pilot without ability to add their own analysts. The role model exists in code; the UI does not.

**Risk level.** Medium (touches RBAC enforcement; a wrong role assignment is a privilege escalation).

**Effort.** 3–5 days.

**Dependencies.** Phase 2 complete (rate limiting in place; scoped client adopted).

**Files.** `app/(app)/settings/team/page.tsx` (rebuild), `app/api/team/*` (audit and complete), `components/settings/*`.

**Migrations.** Possibly: an `audit_team_changes` table if not already covered by the existing audit infra.

**Verification.**

- [ ] Owner can invite a user with role `admin` / `analyst` / `viewer`
- [ ] Invited user receives a magic-link email and is auto-assigned the role
- [ ] Owner can change another user's role
- [ ] An `analyst` cannot change roles
- [ ] Every role change logs to the audit trail
- [ ] Rate limit applies (max 50 invites per merchant per hour)

**IDE agent suitability.** **Partial.** Mechanical UI with careful permission checks. Senior reviewer required.

---

## 4.2 Build saved views

**Objective.** A user can save the current `/customers` filter set as a named view and recall it from `/saved`.

**Rationale.** Analysts return to the same filters daily. Without saved views, they bookmark URLs — losing filter changes.

**Risk level.** Low.

**Effort.** 2–3 days.

**Dependencies.** Phase 0.

**Files.** `app/(app)/saved/page.tsx`, new `app/api/saved-views/route.ts`, new migration for `saved_views` table, `components/customers/CustomersFilterSheet.tsx` (add Save / Load buttons).

**Verification.**

- [ ] Saving a complex filter and recalling it reproduces the same result set
- [ ] Saved views are merchant-scoped and per-user
- [ ] Renaming and deleting work
- [ ] Default view per user (e.g., "Today's high-risk")

**IDE agent suitability.** **Yes.**

---

## 4.3 Mobile drawer + responsive table card mode

**Objective.** Below the `md` breakpoint (768px), the sidebar collapses behind a hamburger drawer; tables transform into stacked cards; the audit/customers/dashboard pages are usable on mobile.

**Rationale.** Existing `meta-375-mobile-*.png` artifacts confirm the app is unusable on phones today. ASOS analysts on the go (during peak season) will judge the app on this.

**Risk level.** Medium (touches the app shell).

**Effort.** 3–5 days.

**Dependencies.** 1.2, 1.5 complete.

**Files.** `app/(app)/layout.tsx`, `components/nav/Sidebar.tsx`, `components/layout/AppHeader.tsx`, table components in `components/customers/`, `components/audit/`, `components/dashboard/`.

**Verification.**

- [ ] At 375px, dashboard, customers, customer drawer, audit detail, evidence list are all usable
- [ ] Hamburger drawer animates and is keyboard-accessible (Escape closes)
- [ ] Tables transform to cards below `md`
- [ ] Sticky table headers on desktop (≥md)
- [ ] Touch targets ≥ 44×44px

**IDE agent suitability.** **Yes.**

---

## 4.4 Build the ROI / fraud-savings panel

**Objective.** Dashboard surfaces "estimated savings" — a calculated figure based on flagged disputes × average dispute amount × win rate.

**Rationale.** Executive-level demo moment. Procurement-level commercial story.

**Risk level.** Low.

**Effort.** 3 days.

**Dependencies.** 1.3 (inbox population).

**Files.** `components/dashboard/SavingsPanel.tsx` (new), `app/(app)/dashboard/page.tsx`.

**Verification.**

- [ ] Panel renders a £ figure with hover-explained methodology
- [ ] Methodology page or modal explains: "We estimated savings as flagged-dispute-count × £X average × Y% win rate"
- [ ] Defaults are configurable per merchant in settings
- [ ] Panel hides for merchants with <30 days of data (insufficient signal)

**IDE agent suitability.** **Yes.**

---

## 4.5 Add Sentry + structured logging

**Objective.** Production errors are captured in Sentry. Server logs are JSON-structured with request IDs propagating from middleware → API route → DB call.

**Rationale.** No observability today. ASOS will not trust the team to detect their own incidents.

**Risk level.** Low.

**Effort.** 2 days.

**Dependencies.** 2.1 (middleware) for request-ID injection.

**Files.** New `lib/log/index.ts`. New `lib/sentry.ts`. Initialise in `app/(app)/layout.tsx` (client) and in middleware (server). Replace `console.error`/`console.log` across [app/api/](app/api).

**Verification.**

- [ ] Forced error in staging surfaces in Sentry within 30 seconds
- [ ] All API routes log structured JSON with `requestId`, `merchantId`, `route`, `status`, `durationMs`
- [ ] Sensitive fields (email, address, IP) redacted automatically by the logger
- [ ] Sentry sampling rate documented (10% transactions, 100% errors)

**IDE agent suitability.** **Yes.**

---

## 4.6 Add `/api/health` and a private status page

**Objective.** A health endpoint exposes app-up + DB-up + queue-up. A private status page (statuspage.io or self-hosted) summarises uptime to ASOS during the pilot.

**Rationale.** ASOS Engineering Integration will set up monitoring on day one.

**Risk level.** Low.

**Effort.** 1 day for health; 1 day for status page setup.

**Dependencies.** 4.5 (logging/observability).

**Files.** `app/api/health/route.ts`.

**Verification.**

- [ ] `GET /api/health` returns 200 with `{ status: 'ok', checks: { db: 'ok', auth: 'ok', amplitude: 'ok' } }`
- [ ] On a forced DB failure (use a feature flag), returns 503 with the failing check listed
- [ ] Status page accessible to ASOS-pilot-shared dashboard

**IDE agent suitability.** **Yes.**

---

## 4.7 Outcome tracking on evidence packages

**Objective.** Each evidence package can be marked `submitted`, `won`, `lost`, `abandoned` with dates per state.

**Rationale.** The chargebacks team needs to know which packages won. The team needs to know which signals correlate with wins. ASOS will not pilot a chargeback tool without this.

**Risk level.** Low.

**Effort.** 1 week (UI + reporting + audit log).

**Dependencies.** 1.1 (evidence flow fixed).

**Files.** New migration `supabase/migrations/00XX_evidence_outcomes.sql`. `app/(app)/chargebacks/page.tsx`, `app/(app)/chargebacks/[id]/page.tsx`, `app/api/evidence/[id]/outcome/route.ts`.

**Verification.**

- [ ] Each package has an outcome dropdown
- [ ] Status history is visible
- [ ] An "outcome dashboard" surfaces win-rate per signal

**IDE agent suitability.** **Yes.**

---

## 4.8 Phase 4 gate

- [ ] Settings → Team UI live; analyst invitation flow tested
- [ ] Saved views live
- [ ] Mobile usable below 768px
- [ ] Savings panel live
- [ ] Sentry catching errors; logs structured
- [ ] `/api/health` and status page live
- [ ] Evidence outcome tracking live

Cut tag `v1.0.0-pilot-ready-ui`. **ASOS analyst onboarding is now plausible.**

---

# PHASE 5 — Scalability and Pipeline

**Estimated calendar: 7–10 days. Risk: HIGH (frozen-core touch, performance regression). Senior engine engineer owns.**

This phase implements the six-step plan from `PIPELINE_PERF_AUDIT_2026-05-07.md`. The plan is already specified there; this section is a wrapper that ties it into our governance.

## 5.1 Step 1 of pipeline audit: cap entity-resolution concurrency

**Per `PIPELINE_PERF_AUDIT_2026-05-07.md` Step 1.** Implement a global semaphore around `fetchProfilesByOverlap` capping at 8 concurrent requests.

**Risk: HIGH** (frozen-core processing path).

**Effort.** 2 days.

**Files.** [lib/engine/dbSemaphore.ts](lib/engine/dbSemaphore.ts), [lib/analysis/entityResolution.ts](lib/analysis/entityResolution.ts).

**Verification.** Per-step acceptance criteria in `PIPELINE_PERF_AUDIT_2026-05-07.md`. Run a 15k-row job on staging; expect ≤15 minutes.

**Do not parallelise with.** Steps 2–6.

---

## 5.2 Steps 2–3: bulk-RPC sizing and progress endpoint

**Per `PIPELINE_PERF_AUDIT_2026-05-07.md` Steps 2–3.** Reduce bulk_upsert payloads to fit Postgres statement timeout. Replace exact `COUNT(*)` on the progress endpoint with the atomic counter from migration `0022_atomic_job_progress.sql`.

**Risk: Medium.**

**Effort.** 2 days.

**Files.** [lib/processing/worker.ts](lib/processing/worker.ts) (frozen — sign-off required), [app/api/jobs/[id]/progress/route.ts](app/api/jobs/[id]/progress/route.ts).

**Verification.** 15k-row job under 8 minutes.

---

## 5.3 Steps 4–6: retries, backoff, dedupe entity resolution

**Per `PIPELINE_PERF_AUDIT_2026-05-07.md` Steps 4–6.** Add exponential backoff to RPC calls; ensure entity resolution runs once per job, not per chunk; surface failed chunks in the UI.

**Risk: Medium.**

**Effort.** 3 days.

**Files.** [lib/engine/dbSemaphore.ts](lib/engine/dbSemaphore.ts), [lib/processing/worker.ts](lib/processing/worker.ts) (frozen), [lib/processing/chunkedDispatch.ts](lib/processing/chunkedDispatch.ts) (frozen).

**Verification.** 15k-row job under 4 minutes; 200k-row job under 30 minutes.

---

## 5.4 Move chunk dispatch from fire-and-forget HTTP to a real worker

**Objective.** Replace the fire-and-forget `fetch()` in [lib/processing/chunkedDispatch.ts](lib/processing/chunkedDispatch.ts) with a queue-backed worker (Inngest, Trigger.dev, or a Postgres-backed queue using the existing migrations).

**Rationale.** Vercel function timeouts (300s on Enterprise) cap chunk processing. A real worker with its own runtime gives larger budgets, observable retries, and proper idempotency.

**Risk: HIGH** (frozen-core change; replacing the dispatch primitive).

**Effort.** 2 weeks.

**Dependencies.** 5.1–5.3 complete.

**Files.** [lib/processing/chunkedDispatch.ts](lib/processing/chunkedDispatch.ts) (frozen — full sign-off), [lib/processing/worker.ts](lib/processing/worker.ts) (frozen), new `lib/processing/queue.ts`.

**Verification.** A 200k-row job completes inside 25 minutes with full idempotency (re-running a chunk produces identical scoring rows; `audit_score_history` shows one entry, not duplicates).

**Do not parallelise with.** Anything in `lib/processing/`.

**IDE agent suitability.** **No.**

---

## 5.5 Stream CSV parsing for files >50 MB

**Objective.** Replace `parseCsvBuffer()` (which loads the whole file into memory) with a streaming parser. Raise the file-size cap to 250 MB for ASOS-shaped daily files.

**Risk: Medium.**

**Effort.** 3 days.

**Dependencies.** 5.1–5.3 complete.

**Files.** [lib/csv/parse.ts](lib/csv/parse.ts), [lib/processing/streamParser.ts](lib/processing/streamParser.ts) (existing — extend).

**Verification.** A 200 MB CSV completes parsing without exceeding 512 MB process memory.

---

## 5.6 Phase 5 gate

- [ ] 15k-row job in <4 minutes on staging
- [ ] 200k-row job in <30 minutes on staging
- [ ] Memory peak <512 MB for 200 MB CSV
- [ ] Job failure surfaced in UI with retry option
- [ ] Cost per job documented (Supabase + Vercel + queue)

Cut tag `v1.1.0-scaled`.

---

# PHASE 6 — Production Readiness (DSAR, SOC 2 Prep, Real-Time API, Backup/DR)

**Estimated calendar: 15–20 days. Risk: Medium-High. Spans engineering, legal, and procurement.**

## 6.1 DSAR endpoints

**Objective.** Merchants can self-serve account export and account deletion. `app/api/admin/dsar/export/route.ts` returns a CSV/JSON archive of all merchant-owned data. `app/api/admin/dsar/delete/route.ts` initiates soft-delete + a 30-day retention window before purge.

**Risk: Medium.**

**Effort.** 1 week.

**Dependencies.** 3.1 (soft delete) complete.

**Verification.** Initiating an export produces a downloadable archive containing all rows the merchant owns; initiating a delete soft-deletes everything and schedules purge; reversing within 30 days restores access.

---

## 6.2 SOC 2 Type 1 letter of intent

**Objective.** An auditor is engaged. A target Type 1 audit date is set. A control inventory is drafted.

**Rationale.** Procurement gate.

**Effort.** 2 weeks calendar; minimal engineering.

**Deliverables.** Letter of intent from auditor; draft control inventory; control evidence checklist.

---

## 6.3 Backup / DR documentation and tested restore

**Objective.** Document RPO/RTO. Test a full database restore from Supabase backup against a staging project. Document the runbook.

**Effort.** 3 days.

**Verification.** Restore performed; document timing; published as `docs/internal/runbooks/db-restore.md`.

---

## 6.4 Real-time `POST /api/orders` ingestion

**Objective.** ASOS can POST new orders directly. The API supports idempotency keys, batching, and webhook callbacks for processing complete events.

**Effort.** 2 weeks.

**Dependencies.** Phase 2 (security), Phase 5 (queue worker).

**Verification.** A canary test pushes 10k orders over an hour and observes scoring within 60s of receipt.

---

## 6.5 Score-history versioning

**Objective.** A new `audit_score_history` table records every (re)score with timestamp, model_version, and the contributing signals. The customer drawer surfaces score-over-time.

**Effort.** 1 week.

**Verification.** Re-running an audit on the same dataset produces a new history row, not an in-place update.

---

## 6.6 Per-merchant signal-weight overrides

**Objective.** A `merchant_signal_weights` table allows ASOS to tune individual signal weights without a code deploy. Surface in `/settings/risk-policy`.

**Effort.** 1 week.

**Verification.** Setting `addressClustering = 0` for a test merchant disables that signal in their scoring; default merchant unaffected.

---

## 6.7 Phase 6 gate

- [ ] DSAR endpoints live and tested
- [ ] SOC 2 letter of intent in legal pack
- [ ] DR runbook tested
- [ ] Real-time orders API live (behind feature flag for ASOS)
- [ ] Score-history versioning live
- [ ] Per-merchant weight overrides live

Cut tag `v2.0.0-production-pilot`.

---

# PHASE 7 — Integrations and Platform Polish

**Estimated calendar: 20–30 days. Post-pilot. Sequenced by ASOS demand.**

7.1. SSO / SAML via Supabase paid tier.
7.2. Shopify direct connector (OAuth + scheduled sync).
7.3. Magento + BigCommerce connectors (parallelisable with Shopify).
7.4. Webhooks subscription model (`customer_flagged`, `evidence_generated`, `watchlist_added`).
7.5. Zendesk app for embeddable customer-status widget.
7.6. Verifi/Ethoca chargeback alert integration.
7.7. Identity-cluster network graph visualisation (the missing "wow").
7.8. Wardrobe-fraud signal (return-then-reorder detection).
7.9. Phonetic address matching (Soundex/Metaphone).
7.10. Real adaptive feedback loop on `app/api/fraud-feedback/*`.

These are not pilot-blocking; they are post-pilot expansion. Each is a separate workstream.

---

# 14-DAY EXECUTION SPRINT

This is what an engineering team should actually do, day-by-day, starting Monday.

| Day | Phase | Workstream A (senior eng) | Workstream B (frontend) | Workstream C (legal/PM) |
|-----|-------|---------------------------|--------------------------|--------------------------|
| 1 | 0 | 0.1 triage failing tests | 0.2 fix nullable order_value | DPA review starts |
| 2 | 0 | 0.1 cont. + 0.4 doc-drift CI | 0.2 PR up | DPA review |
| 3 | 0 | 0.3 Playwright re-enable | 1.2 hydration fix | DPA review |
| 4 | 0 | 0.3 cont. — staging seed | 1.5 loading/error states | DPIA outline |
| 5 | 0 → 1 | **Phase 0 gate** + start 1.1 evidence flow | 1.4 jargon → labels | DPIA cont. |
| 6 | 1 | 1.1 cont. | 1.4 cont. | DPA finalisation |
| 7 | 1 | 1.3 inbox | 1.5 cont. | DPIA finalisation |
| 8 | 1 | 1.3 cont. + 1.8 amplitude | 1.9 demo merchant seed | Article 22 statement |
| 9 | 1 → 2 | **Phase 1 gate** + start 2.1 middleware | 1.7 DPA copy fix | Legal sign-off |
| 10 | 2 | 2.1 cont. — verification matrix | 4.5 Sentry+logging start | — |
| 11 | 2 | 2.1 ship + start 2.2 CSP | 4.5 cont. | — |
| 12 | 2 | 2.2 cont. (CSP report-only) | 4.6 health endpoint | — |
| 13 | 2 + 3 | 2.4 magic bytes + 3.1 soft delete migration 1 | 4.4 savings panel | — |
| 14 | 2 + 3 | **Phase 2 gate** (pre-pilot security) + 3.1 cont. | 4.4 cont. | — |

**End of sprint state:** Phases 0, 1, 2 complete. Phase 3 in progress. Phase 4 partially started. Demo to a friendly stakeholder is safe; ASOS demo is plausible if scripted; ASOS pilot conversation can begin with a known gap on soft delete + DPIA.

---

# 30-DAY ASOS READINESS ROADMAP

| Week | Theme | Outcome |
|------|-------|---------|
| **Week 1** | Phase 0 + Phase 1 | CI green, demo bugs fixed, demo merchant live, DPA finalised |
| **Week 2** | Phase 2 + start of Phase 3 | Edge auth real, CSP enforced, Amplitude PII gone, soft-delete migration in motion, Sentry installed |
| **Week 3** | Phase 3 + Phase 4 | Soft delete shipped, DPIA + Article 22 published, Settings → Team UI live, Saved views live, mobile usable |
| **Week 4** | Phase 4 + start of Phase 5 | Savings panel live, Outcome tracking live, Pipeline Step 1 cap live, Playwright catching regressions |

**Day 30 milestone.** ASOS can be approached with: a working demo, a credible security questionnaire response, a finalised legal pack including DPA + DPIA + Article 22, a SOC 2 letter of intent in flight, a pilot proposal scoped as 4-week shadow + 4-week live, and a documented commitment to backtest against ASOS data before any production rollout.

---

# MINIMUM VIABLE ASOS DEMO SCOPE

The shortest path that produces a demo ASOS will respect.

**Scope.** Phases 0 and 1 complete. The middleware fix (2.1) deployed. CSP in report-only mode (2.2). Amplitude PII removed (1.8). DPA finalised (1.7).

**Demo flow (scripted, 30 minutes):**

1. **Login.** Magic-link to a real-looking merchant. Fast. Clean.
2. **Dashboard.** Reviewer queue, KPI cards, recent runs. "This is what your fraud lead sees on Monday morning."
3. **Customers.** Filter to "Definite" confidence + "high refund rate". Open a customer.
4. **Customer drawer.** Show identity panel, signal explanations, order history. Highlight that every flag has a plain-English reason.
5. **Generate evidence.** From the customer page. Open the PDF. Walk through CE3.0 prior transactions, narrative, provenance footer.
6. **Internal eval.** Show `/eval` to ASOS's data lead. F1, precision, recall on the synthetic dataset. Be honest: "We need to backtest on your data — that's what the pilot is for."
7. **Watchlist.** Add the customer; show the recent-appearances panel. Acknowledge governance gaps; pitch them as the first pilot deliverable.
8. **Inbox.** Show the populated inbox. Walk through how an analyst's day starts here.
9. **Architecture overview.** One slide. Multi-tenant Supabase, RLS, HMAC-hashed identifiers, k-anonymous cross-merchant intelligence, deterministic scoring. Distinguish from black-box ML competitors.
10. **Pilot proposal.** 4-week shadow + 4-week live + phased rollout. Success metrics and exit criteria.

**Anti-scope (do not show in this demo):**

- Mobile (until 4.3 ships).
- The "Generate evidence" button on a fresh customer with no orders (until 1.1 is verified end-to-end on the demo data).
- The Settings → Team page (until 4.1 ships).
- The `/saved` page (until 4.2 ships).
- The `/help` page (until content is finalised).
- The chargebacks list outcome columns (until 4.7 ships).
- Real-time API (until Phase 6).

**Demo dataset.** A 5,000-row ASOS-shaped fashion CSV with realistic disputes (3–5%), refund-only customers (1–2%), and a labelled reshipping ring of ~10 customers across 3 addresses. Generate via `scripts/test-data/generateBlindMerchantCSVs.ts` extended with fashion-specific patterns.

**Demo environment.** Staging. Never production. Always reset to a known good state by the nightly seed job (1.9).

---

# SAFE TO SHOW NOW vs NOT SAFE TO SHOW

## Safe to show (after Phases 0 + 1 land)

| Surface | Why it's safe |
|---------|---------------|
| Evidence package PDF | Polished, CE3.0-aware, narrative is defensible. One of the strongest surfaces. |
| Customer investigation drawer | Rich, well-structured; signal explanations are clear. |
| Internal `/eval` page | Honest metrics. Builds credibility with data-savvy stakeholders. Frame as "synthetic — let's pilot on your data". |
| Audit run detail page | Coherent, density appropriate. |
| Upload flow | Strongest core path; template + auto-mapping + data-quality assessment is genuinely good. |
| Identity hashing primitive | HMAC-SHA256 with environment salt; correct primitive; defensible to security teams. |
| RLS / multi-tenant scoping (after 2.1) | Defence-in-depth, post-middleware fix. |
| Demo merchant dashboard (after 1.9) | Will look like a real product. |
| Privacy/legal page (after 1.7) | Final, not draft. |

## Not safe to show today (until each fix lands)

| Surface | Why it's risky | Fix |
|---------|----------------|-----|
| Production build status | Fails on `order_value` nullable | 0.2 |
| `/customers/[id]/evidence/new` button on a fresh customer | Says "no orders found" | 1.1 |
| Browser console on `/customers` | Hydration error | 1.2 |
| `/inbox` after an audit run | Empty | 1.3 |
| `/settings/team`, `/settings/audit-trail` | Dead redirects | 4.1 |
| `/saved` | Empty state placeholder | 4.2 |
| Mobile | Sidebar crushes content | 4.3 |
| Any page with raw labels (`elevated_refund_rate`, `cluster_id`) | Internal jargon | 1.4 |
| Public `/legal/dpa` | "Draft" markers | 1.7 |
| Public demo page | "Demo coming soon" if not seeded | 1.9 |
| `npm test` / CI | 3 failing scoring tests; Playwright disabled | 0.1, 0.3 |
| README signal table | Out of sync with code | 0.4 |
| `proxy.ts` to a security reviewer | Dead code; auth not gated at edge | 2.1 |
| Response headers | No CSP, HSTS, X-Frame, etc. | 2.2 |
| Soft-delete claim in DPA | Code is a no-op | 3.1 |
| `fraud_entities` access | Authenticated-read for any user | 2.3 |
| Pipeline running a 200k-row job live | >60 minutes today | 5.1–5.5 |
| Any real-time API claim | None implemented | 6.4 |
| Outcome tracking on chargebacks | Not implemented | 4.7 |

---

# ROLLBACK STRATEGY (PER PHASE)

## Phase 0 rollbacks
- Test fixes: revert the test-update commit; tests fail as before.
- Build fix: revert; build fails as before.
- Playwright re-enable: disable the workflow file (do not delete this time — comment out the `on:` block).
- README generator: harmless to revert.

## Phase 1 rollbacks
- Each fix is small and isolated. `git revert <sha>` works for all of them.
- Demo merchant seed script: re-run with the prior dataset.
- Loading/error files: revert deletes them; pages go back to blank flashes.

## Phase 2 rollbacks (HIGHER RISK)
- **Middleware (2.1):** revert the rename. Be aware that the *moment* `middleware.ts` is reverted, all per-page auth checks (still in place if you kept them as defence-in-depth) are the only protection. If those were also removed in the same PR, do NOT roll back partially.
- **CSP (2.2):** flip back to report-only. Already separated; safe.
- **`fraud_entities` RPC (2.3):** revert the migration that revoked SELECT (the migration is two-step on purpose).
- **Magic-byte (2.4):** revert; existing extension check remains.
- **Rate limiting (2.5):** disable the rate-limit middleware via env flag.
- **Scoped client (2.6):** routes can be migrated back one at a time.

## Phase 3 rollbacks (MIGRATION-CRITICAL)
- **Soft delete (3.1):** the two-step migration design means the column-add can be rolled back without affecting data; the RLS update can be rolled back independently. App-side `.update({ deleted_at })` continues to work after the column add is reverted (column is just nullable). **If the RLS update is reverted, soft-deleted rows become visible again** — communicate to support.
- **DPIA / Article 22:** documents only; safe to revert.
- **Appeal primitive:** drop the enum value (Postgres requires creating a new type); plan accordingly.

## Phase 4–5 rollbacks
- Most are additive (Sentry, health endpoint, savings panel, outcome tracking). Revert is cheap.
- Pipeline performance fixes: revert the semaphore/RPC sizing change. Performance regresses but data is unaffected.

## Phase 6 rollbacks
- DSAR: feature-flag the endpoints.
- SSO: feature-flag.
- Real-time API: feature-flag and deprecate via API version header.

**Universal rule.** Every PR that touches data access or migrations includes a "Rollback steps" section in the PR description. CI lints for its presence on `mig/*` and `sec/*` branches.

---

# DEPLOYMENT ORDER (CHECKPOINTED)

The order in which PRs land in `main` for the next 14 days.

```
1. fix/phase-0-build-nullable-order-value     (0.2)
2. fix/phase-0-failing-jest-tests              (0.1)
3. chore/phase-0-doc-drift-ci                  (0.4)
4. chore/phase-0-playwright-re-enable          (0.3)
   ── Phase 0 gate ──
5. fix/phase-1-hydration-button                (1.2)
6. fix/phase-1-loading-error-states            (1.5)
7. fix/phase-1-jargon-to-labels                (1.4)
8. fix/phase-1-evidence-no-orders              (1.1)
9. fix/phase-1-inbox-population                (1.3)
10. chore/phase-1-amplitude-pii                (1.8)
11. chore/phase-1-dpa-final                    (1.7)  [LEGAL APPROVAL REQUIRED]
12. chore/phase-1-demo-merchant-seed           (1.9)
    ── Phase 1 gate ──
13. sec/phase-2-middleware-rename              (2.1)  [SOLO PR — DO NOT BUNDLE]
14. sec/phase-2-csp-report-only                (2.2)
15. sec/phase-2-magic-byte-validation          (2.4)
16. mig/phase-3-soft-delete-columns            (3.1 step 1 — column add)
17. feat/phase-4-sentry                        (4.5)
18. sec/phase-2-rate-limit                     (2.5)
19. mig/phase-3-soft-delete-rls                (3.1 step 2 — RLS, after 2-day burn)
20. mig/phase-2-fraud-entities-rpc             (2.3 step 1 — RPC)
21. mig/phase-2-fraud-entities-revoke          (2.3 step 2 — revoke after engine sign-off)
    ── Phase 2 + 3 partial gate ──
```

Each PR is gated by Phase 0 CI (build + test + lint). Each `sec/*` and `mig/*` PR requires 2 reviewers. Each `mig/*` PR is deployed to staging at least 24 hours before its dependent app PR.

---

# IDE AGENT BRIEFING NOTES

The agent (Cursor, Claude Code, etc.) is a useful collaborator for **mechanical** changes but unsafe for **architectural** ones. Use this matrix.

| Change type | Safe to delegate to IDE agent? | Caveats |
|-------------|--------------------------------|---------|
| Type errors (nullable → guard) | Yes | Must include a unit test |
| Hydration error refactor | Yes | Verify keyboard semantics post-change |
| Adding `loading.tsx` / `error.tsx` | Yes | Reuse existing skeletons; do not invent |
| String/label replacement (jargon → English) | Yes | Constrained by `lib/copy/labels.ts` map |
| README signal-table generator script | Yes | Pure script; no app behaviour change |
| Doc-drift CI workflow | Yes | YAML; verify in CI |
| Adding security headers in `next.config.js` | Yes | But CSP tuning requires human eyes on browser console |
| Replacing `console.error` with structured logger | Yes | Confirm sensitive-field redaction |
| Adding Sentry init | Yes | Confirm sampling rates |
| Adding health endpoint | Yes | Trivial route |
| Adding magic-byte sniffing on uploads | Yes | Include unit tests for edge cases |
| Adding rate-limit middleware (with infra chosen) | Yes | Confirm envs not blocking dev |
| Mechanical `.delete()` → `.update({ deleted_at })` | Yes | DO NOT touch frozen-core; DO NOT touch migrations |
| Settings → Team UI scaffolding | Yes | Senior reviewer for permission gates |
| Saved-views CRUD UI/API | Yes | Standard CRUD; verify scoping |
| Mobile drawer + responsive table cards | Yes | Snapshot tests at breakpoints |
| Savings panel | Yes | Pure UI |
| Outcome tracker UI | Yes | After data-model decision |
| Auth callback / login flow | **No** | Security |
| `proxy.ts` → `middleware.ts` | **No** | Security |
| RLS migrations | **No** | Multi-tenancy |
| `fraud_entities` RPC + revoke | **No** | Multi-tenancy + frozen-core |
| Soft-delete migrations | **No** | Data integrity |
| Pipeline performance changes | **No** | Frozen-core |
| Identity linker | **No** | Frozen-core |
| Scoring weights | **No** | Frozen-core |
| Evidence narrative changes | **No** | Legal copy |
| DPA / DPIA / Article 22 | **No** | Legal |

**Universal rules for IDE agent prompts in this program:**

1. **Always tell the agent which files NOT to touch.** Repeat the frozen-core list in every prompt that lives in `lib/`.
2. **Always ask for tests.** A change without a test is not done.
3. **Always ask the agent to flag uncertainty.** "If you're unsure whether to do X, stop and ask."
4. **Never let the agent decide multi-tenancy.** Manually specify scoping rules.
5. **Never let the agent change weights, thresholds, or signal definitions.** Engine changes are human.
6. **Never let the agent author legal copy.** Even small phrasing changes need legal eyes.
7. **Always specify the verification path.** "Run `npm run build`, `npm test`, and Playwright critical-path. Report results."
8. **Always require a PR description with a Rollback section** for any change in `app/api/`, `lib/`, or `supabase/migrations/`.

---

# STAGING / TESTING RECOMMENDATIONS

## Required staging environment

- A dedicated `unauth-staging` Supabase project with all migrations applied.
- A seed dataset including: 1 owner merchant, 1 admin merchant, 1 analyst-only merchant, 1 demo merchant, 5 synthetic data merchants for isolation testing.
- A nightly cron that resets the demo merchant to a known dataset (1.9).
- Sentry pointed at staging with the same DSN format as production but a different project.
- Vercel "Preview" environment auto-deploys every PR against staging Supabase.
- A staging-only domain `staging.unauth.example` with a different favicon and a visible "STAGING" banner so testers don't confuse environments.

## Required test types

| Test type | Tool | When run | Owner |
|-----------|------|----------|-------|
| Unit (engine, csv, identity) | Jest | Every PR | Eng |
| Unit (utils, components) | Jest + RTL | Every PR | Eng |
| Multi-tenant isolation | Jest | Every PR | Senior eng review |
| Engine eval regression | Jest | Every PR | Engine eng |
| Blind merchant-readiness | Jest | Daily on `main` | Engine eng |
| Critical-path E2E | Playwright | Every PR (after 0.3) | Eng |
| Compliance (banned words) | Playwright | Every PR | Eng |
| Security headers | Playwright | Every PR (after 2.2) | Eng |
| Load (200k rows) | k6 | Weekly + before pilot | Senior eng |
| Manual exploratory | Human | Pre-Phase-2 gate; pre-Phase-4 gate; pre-pilot | Eng + Product |

## "Do not test against production" rules

- No load test runs on production.
- No DSAR test runs on production.
- No fixture seeding writes to production.
- No e2e test logs in as a real merchant.
- No queue-replay test runs on production unless explicitly approved.

---

# COMMUNICATIONS PLAN (INTERNAL)

| Audience | Cadence | Channel | Content |
|----------|---------|---------|---------|
| Engineering | Daily standup | Slack/Linear | Phase progress, blockers |
| Product | Weekly | Async update | Demo state, ASOS conversation status |
| Legal/DPO | Bi-weekly | Sync meeting | DPA/DPIA progress, Article 22 review |
| Founders | Weekly | Live demo on staging | Tangible progress against this plan |
| ASOS sponsor (post-engagement) | Weekly | Status email | Pilot prep progress vs plan |

---

# FINAL: WHAT GOOD LOOKS LIKE AT DAY 30

A senior engineer at ASOS can do the following without anything embarrassing happening:

1. Open the staging URL and the public demo. Both render. No console errors.
2. Sign up. Magic link arrives. Lands on dashboard. Skeleton briefly. KPIs render.
3. Upload `test-data/mixed.csv`. Progress bar moves. Audit completes in <10 minutes.
4. Open `/customers`. Filters work. Customer drawer is rich.
5. Click "Generate evidence" on a customer with orders. PDF generates. Download. Open. Read it. It is defensible.
6. Inbox is populated.
7. Open `/settings/team`. Invite a colleague. Magic link arrives.
8. Open `/(public)/legal/dpa`. Final, not draft. Article 22 statement linked.
9. View browser network tab. CSP enforced. No inline scripts. No PII flowing to Amplitude.
10. View Sentry. Errors are captured.
11. Read the DPIA in `docs/legal/dpia.md`. Coherent.
12. Read the security questionnaire response. Backed by code.
13. Mobile: open on iPhone. Drawer works. Tables transform. Usable.
14. Read the README signal table. Matches `lib/engine/weights.ts`. No drift.
15. Run `npm run build`, `npm test`, `npm run lint`. All green.

If all 15 of those work, the team can credibly invite ASOS for a discovery conversation. If any of them doesn't, fix the one before scheduling the call.

---

*End of remediation program. This document supersedes any prior implementation plan in this repository for the purpose of ASOS pilot preparation. Update by PR; do not edit in place without recording rationale.*
