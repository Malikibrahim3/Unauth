# Full-App Acceptance Remaining Closure — Implementation Authority

Status: historical acceptance evidence and reusable fixture procedures; superseded for current execution.  
Created: 31 August 2026  
Recorded local functional verdict: **BLOCKED**  
Recorded deployed verdict: **BLOCKED by Vercel deployment protection**  
Parent authority: `docs/product/FULL_APP_ACCEPTANCE_FIXES_IMPLEMENTATION.md`  
Current evidence root: `artifacts/full-app-acceptance-2026-08-30/`

Supersession recorded 6 September 2026: read
[GLOBAL_RULES.md](../../GLOBAL_RULES.md) for permanent app-wide constraints and
[MERCHANT_CLARITY_IMPLEMENTATION.md](MERCHANT_CLARITY_IMPLEMENTATION.md) for the
current phase sequence and acceptance gates. The historical viewport/theme
expectations, phase allow-lists, ordering, and verdicts below do not instruct
current implementation. Reuse its guarded fixture and persisted-read-back
methods under the current plan. Do not rewrite dated evidence as if it tested
the new desktop contract.

## 1. Authority and purpose

This records the historical follow-on acceptance execution for work left after the
full-app acceptance implementation reached 212 passed, 8 partial, 2 blocked,
and 0 untested scenarios.

At the time, it superseded the parent document only for the remaining-closure queue,
execution order, allow-lists, and final verdict. The parent authority remains
the historical record for FAA-0 through FAA-10 and the frozen baseline. This
document does not replace:

1. `PRODUCT.md` for product, evidence, financial, permission, tenancy,
   mutation, audit, billing, and provider truth;
2. `lib/surfaces/manifest.ts` for the canonical 65 page modules, 120 audited
   surfaces, and 223 scenario contracts;
3. `lib/navigation/appRoutes.ts`, `lib/navigation/aliases.js`, and
   `next.config.js` for canonical navigation and redirects;
4. `DESIGN.md` for the supplied page markup, state, accessibility, and viewport
   boundary. The package recorded there is the only visual authority; this
   document does not own a theme, shell, style system, or presentation path;
5. accepted behavioural tests for established implementation contracts.

This document records acceptance execution boundaries only. It does not
authorise a visual system, a parallel registry, or a competing render path.

## 2. Current evidence and exact remaining scope

The canonical current snapshot is:

| Gate | Current evidence | Closure target |
| --- | ---: | ---: |
| Page modules | 65/65 mapped | Preserve 65/65 |
| Audited surfaces | 120/120 mapped | Preserve 120/120 |
| Manifest scenarios | 212 passed, 8 partial, 2 blocked | 223 passed locally |
| Aliases and root redirect | 56/56 passed | Preserve 56/56 |
| Roles and delegated profiles | 6/6 passed | Preserve 6/6 |
| Exact role-fixture restoration | Passed; fingerprints match | Preserve exact restoration |
| Production acceptance build | Passed; 105 static pages | Pass on the final exact source |
| Release browser | 102/103 plus a focused retry | One uninterrupted 103/103 run |
| Impeccable detector | One malformed invocation reached no targets | One new preflighted recovery invocation |
| Deployed preview | Redirected to Vercel login | Read-only proof of the expected revision |

Only these ten manifest scenarios are in implementation scope:

| Scenario | Phase | Current | Closure class |
| --- | --- | --- | --- |
| `pricing-plan-unavailable` | P07 | Partial | Small product repair plus independent state proof |
| `api-keys-empty` | P06 | Partial | State identity plus eligible empty fixture |
| `audit-trail-empty` | P06 | Partial | State identity plus successful empty response |
| `billing-unavailable` | P06 | Partial | State identity plus unconfigured local fixture |
| `root-not-found` | Shared/P08 | Partial | Independent public root-not-found proof |
| `invite-member-and-transfer-ownership-modals` | P06 | Partial | Existing local team contract on a disposable merchant |
| `create-reveal-and-revoke-api-key-modals` | P06 | Blocked | Existing API-key contract on a disposable Scale fixture |
| `data-erasure-and-account-deletion-modals` | P06 | Partial | Existing destructive contracts on purpose-created data |
| `agreement-upload-and-review-overlays` | P06 | Partial | Existing local upload/review contract and exact cleanup |
| `billing-plan-change-modal` | P06 | Blocked | Guarded local provider-free downgrade path |

The following are gates, not additional manifest scenarios:

- one complete 103/103 release-browser run on the final acceptance build;
- one correctly targeted Impeccable detector recovery invocation;
- read-only access to the documented deployed preview and revision;
- one internally consistent final ledger, evidence index, regression receipt,
  defect report, and cleanup receipt.

No other page, surface, feature, route, manifest row, design system, billing
plan, permission, provider, or schema is in scope unless a reproducible
regression in one of these ten rows proves a directly owned dependency is
broken.

## 3. Required outcome and verdict model

### 3.1 Local verdict

`localFunctionalVerdict` may be `passed` only when all of the following are
true on the exact final build:

- all 223 manifest scenarios have independent passing receipts;
- the evidence validator passes without route-level evidence standing in for
  a state or unopened overlay;
- the four canonical roles and both delegated profiles pass;
- all 55 aliases and the root redirect pass;
- one uninterrupted release-browser run passes 103/103;
- static gates, one uninterrupted full Jest run, and the production acceptance
  build pass;
- the detector recovery invocation has no unresolved error or warning;
- all purpose-created data is deleted or restored to its exact pre-state;
- no real provider, email, billing, preview, or non-disposable merchant action
  occurred.

Focused retries diagnose a failure but do not replace the required broad run.
Receipts from different builds must never be combined into a green final gate.

### 3.2 Deployed verdict

`deployedVerdict` is separate. It may be `passed` only when the documented
preview is reached through an existing approved session, the expected revision
is identified, and the reachable public and authenticated surfaces are checked
read-only. If Vercel protection, missing access, revision mismatch, or provider
availability blocks the check, `deployedVerdict` remains `blocked` even if the
local verdict passes.

### 3.3 Programme boundaries

This authority does not grant UX9 visual acceptance, MR release approval, legal
approval, provider certification, production readiness, or deployment
approval. Those verdicts remain governed by their own authorities.

## 4. Non-negotiable truth and safety boundary

Preserve these distinctions everywhere:

- unknown, unavailable, partial, stale, mixed-currency, available, and
  verified zero;
- source fact, evidence, recommendation, merchant decision, provider action,
  and audit history;
- requested plan, persisted subscription intent, provider-confirmed
  subscription, and local acceptance fixture;
- provider approval, received credit, matched credit, and reconciled money;
- role defaults, delegated grants, tenant membership, and API enforcement;
- local synthetic proof, deployed proof, live-provider proof, and production
  proof.

Preserve the existing dirty worktree. In particular,
`docs/product/CLAUDE_CODE_UI_UX_REBUILD_CONTEXT.md` belongs to the user's
pre-existing untracked baseline. Do not reset, stash, clean, broadly format,
commit, push, deploy, migrate a remote database, contact a provider, send real
email, alter a real subscription, or mutate the protected preview.

Allowed runtime mutation is limited to:

- loopback Supabase and loopback app origins;
- purpose-created merchants, users, customers, agreements, keys, and billing
  records marked with the acceptance run identifier;
- `.invalid` email addresses and the local Supabase mail catcher;
- an existing approved preview session used read-only;
- exact-ID cleanup with pre/post fingerprints.

Every local guard must require all of:

- `RELEASE_E2E_LOCAL=1`;
- loopback `NEXT_PUBLIC_APP_URL`;
- loopback Supabase URL;
- `VERCEL_ENV` other than `preview` or `production`;
- a manifest-owned scenario ID supplied by
  `x-unauth-acceptance-scenario`;
- a purpose-created fixture marker that matches the current run receipt.

A guard that is active in ordinary local development, preview, staging, or
production is a P0 defect.

## 5. Fixture and evidence architecture

### 5.1 New immutable evidence root

Use a new ignored root:

`artifacts/full-app-acceptance-remaining-2026-08-31/`

Do not rewrite
`artifacts/full-app-acceptance-2026-08-30/baseline.json`. At FAR-0, write:

- `baseline.json` containing commit, branch, dirty status, phase-owned file
  hashes, manifest/navigation hashes, environment classification, and exact
  pre-existing untracked paths;
- `fixture-plan.json` containing generated fixture identifiers but no secrets;
- `changed-targets.json` containing the acceptance-owned UI target inventory;
- `execution.json` containing phase states and command receipts.

### 5.2 Purpose-created fixtures

Use separate merchants so destructive work cannot contaminate reversible work:

1. **Settings merchant** — owner, active second member, active Scale-shaped
   local subscription, zero API keys, zero agreements, and a reversible billing
   subscription fixture.
2. **Privacy merchant** — one owner, one disposable customer with related
   non-financial personal data plus retained financial/audit facts, and no
   unrelated records.
3. **Workspace-deletion merchant** — one owner and only the minimum rows needed
   to exercise the resumable deletion job.

All names and emails include a high-entropy run ID. Snapshot exact table rows,
storage objects, auth users, memberships, owner invariant, and hashes before
mutation. Refuse mutation or cleanup when the run marker, merchant ID, user ID,
or fingerprint differs from the receipt.

### 5.3 Secret handling

- Generate passwords and API-key material in memory.
- Never write raw passwords, magic links, access tokens, API-key secrets,
  widget tokens, service-role keys, or session cookies to disk or output.
- Assert reveal-once secrets in memory by format and non-empty length only.
- Mask the secret region in screenshots and omit it from traces and receipts.
- Receipts may retain only non-secret prefixes, stable row IDs, scopes, rate
  limit, timestamps, hashes, and revocation state.

### 5.4 Mutation receipt

Each submitted mutation must record:

1. scenario ID and run ID;
2. exact merchant, actor, canonical role, and delegated grants;
3. pre-state fingerprint;
4. request path, method, redacted payload, and idempotency key;
5. visible pending/validation/success/error behaviour;
6. persisted canonical read-back;
7. audit/version/deletion-job consequence;
8. replay or idempotency result;
9. proof that external provider, email, billing, and preview calls were zero;
10. exact cleanup and matching post-cleanup fingerprint.

Opening a modal is not mutation proof. A successful response without persisted
read-back is not mutation proof. Local provider-free behaviour is not Stripe or
live-provider proof.

## 6. FAR-0 — Freeze the remaining-closure baseline

Do this before product edits or fixture mutation.

### Owned files

- `scripts/acceptance/prepare-remaining-closure.mjs` — new;
- `scripts/acceptance/cleanup-remaining-closure.mjs` — new;
- `scripts/acceptance/remaining-closure-runtime.mjs` — new if shared helpers
  are required;
- `package.json` — scripts only;
- generated files under the new evidence root.

Reuse `scripts/acceptance/local-runtime.mjs`; do not create a second environment
or route registry.

### Required work

1. Freeze `git status --short`, the parent baseline reference, and current file
   hashes without modifying the worktree.
2. Prove the app and Supabase URLs are loopback and fail closed otherwise.
3. Generate in-memory credentials and exact fixture identifiers.
4. Create the three disposable merchants and required local auth identities.
5. Write a cleanup plan before any scenario mutation.
6. Add a `finally`-safe orchestrator so test failure still invokes exact-ID
   cleanup.
7. Refuse broad deletes, pattern deletes, or cleanup of any unmarked row.

### Exit criteria

- the baseline and fixture receipts validate;
- no secret is present in artifacts or console output;
- a dry-run cleanup resolves every exact target without deleting it;
- no product, provider, billing, preview, or remote state changed.

## 7. FAR-1 — Close the five independent state rows

### 7.1 `pricing-plan-unavailable`

Current cause: the active `/pricing` renderer is `Challenge6Pricing`; the
unavailable-plan state exists only in a non-owning legacy renderer.

Implement in:

- `components/public/Challenge6PublicPages.tsx`;
- `components/public/Challenge6Public.module.css` only if existing state styles
  cannot express the notice;
- `tests/current/full-app-p07-entry.spec.ts`;
- focused component tests if needed.

Required behaviour:

- when a non-empty `plan` query cannot be parsed by
  `parseRequestedPlanId`, render a bounded status with
  `data-state-id="pricing-plan-unavailable"`;
- state that no plan selection or subscription change occurred;
- continue to render only the canonical plan catalogue;
- do not persist an intent, redirect, or infer a fallback selection;
- absent and valid plan queries render without the unavailable notice.

Evidence: 390×844 light and 1440×900 light, invalid query preserved, valid and
absent-query negative checks, no request or mutation.

### 7.2 `api-keys-empty`

The existing UI already distinguishes Enterprise unavailability from an
eligible workspace with no keys. Add exact state identity to the successful
empty branch; do not label the Enterprise gate as empty.

Implement in:

- `components/settings/ApiIntegrationsKeyDialogs.tsx`;
- `tests/current/full-app-p06-settings.spec.ts` or a new manifest-derived
  remaining-state spec.

Fixture: the Settings merchant has a local active Scale-shaped subscription
and zero `merchant_api_keys` rows.

Evidence: API response succeeds with `keys: []`; 1440×900 light and 1024×900
dark render `data-state-id="api-keys-empty"`; Create key remains available;
Enterprise-unavailable state is absent.

### 7.3 `audit-trail-empty`

Add exact state identity only when the audit request succeeded and returned
zero rows. A request error or a filter with no matches must remain different.

Implement in:

- `components/settings/AuditTrailClient.tsx`;
- `tests/current/full-app-p06-settings.spec.ts` or the remaining-state spec;
- `app/api/audit-trail/route.ts` only if a loopback-only deterministic empty
  response is required after the disposable fixture is tried first.

Activation order:

1. try the dedicated Settings merchant before any scenario mutation;
2. accept the state only when the canonical response is `200` with zero rows;
3. if fixture creation itself necessarily creates visible audit rows, add a
   guarded scenario response that returns the same successful empty contract;
4. keep that guard inert outside the exact local scenario.

Evidence: empty state, filtered-empty negative check, error negative check,
light/dark supported widths, and successful retry/read-back.

### 7.4 `billing-unavailable`

Use the existing `status: "not_configured"` contract. Add exact state identity
to the unavailable rendering; do not convert the response to an error or zero
credit balance.

Implement in:

- `components/billing/BillingSettingsClient.tsx`;
- `tests/current/full-app-p06-settings.spec.ts` or the remaining-state spec.

Fixture: a purpose-created merchant with no billing record. Evidence must show
`200 { status: "not_configured" }`, no plan/balance/payment values, retry
behaviour, 1440×900 light, and 1024×900 dark.

### 7.5 `root-not-found`

The active implementation already exists in `app/not-found.tsx`. Do not change
it unless the independent test finds a product defect.

Implement evidence in:

- `tests/current/full-app-shared-states.spec.ts` or a new
  `tests/current/full-app-root-not-found.spec.ts`;
- `app/not-found.tsx` only after a reproducible failure.

Evidence must independently navigate to a well-formed unknown root URL, assert
`data-surface-id` and `data-state-id` equal `root-not-found`, preserve permanent
light mode at 390×844 and 1440×900, exercise both safe-return links, and record
zero mutations. `authenticated-not-found` and `root-global-error` receipts do
not substitute for this row.

### FAR-1 exit criteria

- all five scenario receipts are independently passing;
- empty, unavailable, error, filtered-empty, and not-found remain distinct;
- no production-only test hook or manifest change was introduced;
- focused typecheck, lint, tests, accessibility, responsive, and `git diff
  --check` pass.

## 8. FAR-2 — Close reversible Settings mutations

### 8.1 Team invite and ownership transfer

Use the existing `/api/team` and `/api/team/[memberId]` contracts. Do not add a
new invite or ownership API.

Owned implementation and tests:

- `scripts/acceptance/prepare-remaining-closure.mjs`;
- `scripts/acceptance/cleanup-remaining-closure.mjs`;
- `tests/current/full-app-p06-mutations.spec.ts` — new;
- `components/settings/TeamManagementClient.tsx`,
  `components/settings/TeamInviteDialog.tsx`, and team API routes only if the
  scenario exposes a reproducible product defect.

Required flow:

1. sign in as the disposable owner;
2. validate the invite form and pending-dismissal protection;
3. invite a unique `.invalid` address through loopback Supabase;
4. prove only the local mail catcher was addressed and retain no magic link;
5. activate the disposable member locally;
6. open ownership transfer, test the `TRANSFER` confirmation, and submit once;
7. prove exactly one active owner, the former owner demotion, persisted
   membership, append-only audit event, and idempotent replay;
8. delete the entire purpose-created merchant and local auth identities.

Do not send external email or reuse the main acceptance merchant.

### 8.2 API-key create, reveal, and revoke

Use the existing machine-access entitlement and API-key routes. Do not weaken
`merchantHasMachineApiAccess` or grant machine access to non-Scale plans.

Owned implementation and tests:

- `tests/current/full-app-p06-mutations.spec.ts`;
- fixture orchestration files from FAR-0;
- API-key components and routes only after a reproducible failure.

Required flow:

1. prove a non-eligible fixture receives the existing unavailable/403 result;
2. use the eligible Settings merchant and verify the independent empty state;
3. open Create key, test required name/scope/rate-limit validation, and submit;
4. assert the secret and widget token in memory without logging or capturing
   them;
5. close the reveal and prove it cannot be recovered from list/read APIs;
6. read back prefix, scopes, rate limit, creator/audit consequence, and active
   state;
7. open revoke, test pending dismissal, submit, and prove `revoked_at`;
8. replay revocation and record the defined idempotent/not-found result;
9. delete the purpose-created merchant and auth identities.

### 8.3 Agreement upload and review

Use the existing local Supabase storage and agreement routes. The scenario does
not authorise a new merchant-facing removal feature.

Owned implementation and tests:

- `tests/current/full-app-p06-mutations.spec.ts`;
- `tests/fixtures/acceptance/` for one small synthetic non-personal PDF if no
  suitable fixture exists;
- agreement components and routes only after a reproducible failure.

Required flow:

1. reject invalid extension, MIME, oversize, and empty content;
2. upload one synthetic PDF to loopback storage;
3. prove pending state, persisted agreement row, storage object, uploader,
   hash/metadata, status, and audit event;
4. open the review overlay through the canonical URL/query contract;
5. exercise keyboard traversal, focus return, Escape, and safe close;
6. remove the exact storage object and row through fixture teardown, because
   the product does not currently declare a removal control;
7. prove the post-cleanup fingerprint matches.

### FAR-2 exit criteria

- the three overlay scenario receipts pass;
- raw credentials and document contents are absent from evidence artifacts;
- all mutations have persisted read-back, audit consequence, replay result,
  and exact cleanup;
- no provider, real email, external storage, or non-disposable row was touched.

## 9. FAR-3 — Close destructive privacy overlays

The combined scenario requires independent proof of subject erasure and
workspace deletion. Never run either against the existing merchant fixture.

### Owned implementation and tests

- `tests/current/full-app-p06-privacy-mutations.spec.ts` — new;
- FAR-0 fixture and cleanup scripts;
- `components/settings/SubjectErasureClient.tsx`;
- `components/settings/BulkDeleteClient.tsx`;
- `app/api/settings/data-subject-erasure/route.ts`;
- `app/api/settings/bulk-delete/route.ts`;
- `app/api/account/delete/route.ts`;
- `lib/privacy/workspaceDeletion.ts`;
- the listed product files only after a reproducible defect.

### Subject-erasure proof

1. Create a disposable customer with identifiers, address/contact fields,
   ticket content, a financial fact, and an audit fact.
2. Open Preview erasure and verify the removed/retained scope.
3. Require the exact `ERASE` confirmation and pending-dismissal protection.
4. Submit once with a unique idempotency key.
5. Prove personal fields and supported content are anonymised or removed.
6. Prove financial and append-only audit facts remain, now referring to an
   erased subject without reconstructing identity.
7. Replay the request and record idempotency.

### Workspace-deletion proof

1. Use the separate workspace-deletion merchant and its owner session.
2. Verify the exact workspace-name confirmation and irreversible scope.
3. Submit the existing owner-only resumable deletion job.
4. Prove unauthorised roles are denied independently by the UI and API.
5. Prove the job reaches its durable completed receipt and only the intended
   merchant-scoped rows/storage are removed.
6. Prove the owner authentication identity is handled according to the
   existing contract and remove any remaining local acceptance auth identity
   through exact fixture cleanup.
7. Confirm no unrelated merchant fingerprint changed.

### FAR-3 exit criteria

- `data-erasure-and-account-deletion-modals` passes with two distinct mutation
  receipts;
- retained money/audit truth is proven rather than inferred;
- both permission denial and owner success paths pass;
- no deletion target existed before FAR-0.

## 10. FAR-4 — Close the billing plan-change modal without Stripe

The acceptance build runs as production code, so the existing development-only
Stripe bypass is not a valid final-build path. Do not configure real Stripe,
raise environment privileges, send email, or weaken billing truth.

### Authorised narrow repair

Permit one local acceptance-only **scheduled downgrade** path through the
existing `/api/billing/actions` contract. It must:

- require every guard in section 4;
- require scenario ID `billing-plan-change-modal`;
- accept only `action: "downgrade"` and a canonical lower plan;
- call the existing `scheduleDowngrade` and subscription-intent logic;
- make zero Stripe and email calls;
- retain explicit provenance `local-acceptance-provider-free` in the mutation
  receipt, never in merchant-facing production state;
- remain unreachable for checkout, upgrade, portal, top-up, cancel, resume, or
  Scale-contact actions;
- be covered by negative tests proving preview, production, non-loopback,
  missing-header, wrong-scenario, wrong-action, and wrong-fixture requests do
  not enter the branch.

### Owned files

- `app/api/billing/actions/route.ts`;
- a narrow helper under `lib/testing/` if needed;
- `tests/api/` billing route tests;
- `tests/current/full-app-p06-billing-mutation.spec.ts` — new;
- FAR-0 fixture and cleanup scripts;
- `components/billing/BillingSettingsClient.tsx` only if browser execution
  proves a UI defect.

### Required proof

1. Seed the Settings merchant on a higher canonical plan with no Stripe IDs.
2. Open the existing plan-change modal for a lower plan.
3. Verify requested plan, current plan, effective timing, audit consequence,
   focus, Escape, outside-click policy, and pending dismissal.
4. Submit once; assert zero external requests.
5. Read back the scheduled downgrade and subscription intent separately from
   the still-current subscription.
6. Replay the idempotency key and prove no duplicate transition.
7. Restore or delete the purpose-created merchant and match its pre-state.

### FAR-4 exit criteria

- `billing-plan-change-modal` passes locally;
- the existing `billing-unavailable` state still passes;
- no receipt or UI calls the local result Stripe-confirmed, paid, or deployed;
- all guard-negative tests pass.

## 11. FAR-5 — Cross-cutting regression, performance, and detector recovery

### 11.1 Changed-surface review

For every UI owner changed by FAR-1 through FAR-4, run one batched browser pass
covering:

- authenticated 1440×900 light and 1024×900 dark;
- public 390×844 and 1440×900 permanent light;
- the below-1024 authenticated desktop-required boundary where applicable;
- keyboard-only traversal, visible focus, trap/return, Escape, outside click,
  and pending dismissal;
- 200% zoom/text scaling and reduced motion;
- automated serious/critical accessibility checks;
- query, refresh, back/forward, safe-return, and error recovery;
- console errors, page exceptions, failed requests, and unexpected redirects.

Use the incumbent Operate mode for Settings and the incumbent Persuade mode for
Pricing. Do not redesign, add decorative treatment, or refresh
`.impeccable/design.json` as part of closure.

### 11.2 Release-browser performance

1. Produce one `npm run build:acceptance` build and record its build ID and
   dirty-tree fingerprint.
2. Reuse only that build for state, role, alias, and release-browser tests.
3. Warm every measured route in the same server process.
4. Run one uninterrupted `test:release-browser:local -- --reuse-build` pass.
5. Retain the `<4,000 ms` p75 and `<8,000 ms` maximum thresholds.
6. Record route, RSC, Supabase, CPU, memory, and compilation evidence.
7. If the run fails, diagnose and repair the smallest reproducible owner; a
   focused retry does not close the broad gate.

### 11.3 One detector recovery invocation

The previous FAA-10 invocation reached no file because shell quoting turned the
targets into inaccessible literals. It is neither a pass nor a valid detector
result. This follow-on authority explicitly permits exactly one new recovery
invocation after a non-detector preflight succeeds.

Add:

- `scripts/acceptance/run-final-impeccable.mjs` — new;
- `changed-targets.json` and detector receipt under the new evidence root.

The wrapper must:

1. derive acceptance-owned UI targets from the frozen parent/current baseline
   plus FAR-owned changes;
2. exclude docs, tests, scripts, artifacts, generated files, and unrelated
   dirty baseline paths;
3. require every target to exist and have an allowed web source extension;
4. store the exact sorted target list and hashes before invocation;
5. invoke
   `/Users/malikibrahim/.codex/skills/impeccable/scripts/detect.mjs` with
   `child_process.spawn`, an argument array, and `shell: false`;
6. avoid shell arrays, command substitution, `eval`, `xargs`, and quoted path
   literals;
7. write exactly one invocation receipt and refuse a second detector spawn;
8. retain raw JSON output and a reviewed finding disposition.

Preflight may validate paths and hashes but must not execute the detector. The
single recovery invocation occurs only after all UI edits are finished. Final
closure requires no unresolved error or warning; advisories must be resolved or
documented as an incumbent-authority match with file/line evidence.

### FAR-5 exit criteria

- one uninterrupted release-browser run passes 103/103;
- the detector recovery receipt proves every target was accessed;
- no unresolved detector error/warning remains;
- cross-cutting evidence is fresh on the exact build.

## 12. FAR-6 — Read-only deployed-preview validation

This phase needs external access state, not source repair.

1. Use the exact URL recorded in the prior `physical/preview.json` unless a
   newer approved preview for the same final revision is supplied.
2. Use only an existing approved signed-in Vercel/browser session or an access
   mechanism explicitly supplied by the user.
3. Identify the deployed commit/build metadata before testing.
4. Check public landing, pricing unavailable query, demo, legal, root
   not-found, aliases, and any already-accessible authenticated Settings routes
   read-only.
5. Record final URLs, revision, viewport, protection state, screenshots,
   console/page errors, and failed requests.
6. Do not sign up, reset credentials, invite users, connect providers, create
   keys, upload agreements, change billing, erase data, or delete a workspace.

If protection remains, stop this phase and record `deployedVerdict: blocked`.
Do not bypass protection, deploy a substitute, or promote local screenshots to
deployed evidence.

## 13. FAR-7 — Final regeneration and closure

### Required order

Run focused checks after each phase. After the last source change, use this
order once on the exact final source:

```bash
npm run verify:surface-manifest
npm run verify:authority
npm run verify:env
npm run verify:vercel
npm run verify:ui-integrity
npm run verify:merchant-copy
npm run typecheck:scripts
npm run typecheck:e2e
npm run lint
npm test -- --runInBand
npm run build:acceptance
```

Prepare the final disposable fixtures, start the exact build once, and run:

```bash
npm run prepare:role-acceptance
npm run prepare:remaining-closure
npm run test:role-acceptance
npm run test:alias-acceptance
npm run test:full-app-shared-states:local -- --reuse-build
npm run test:full-app-p02-states:local -- --reuse-build
npm run test:full-app-p02-workflows:local -- --reuse-build
npm run test:full-app-p03-states:local -- --reuse-build
npm run test:full-app-p03-mutations:local -- --reuse-build
npm run test:full-app-p04-states:local -- --reuse-build
npm run test:full-app-p04-workflows:local -- --reuse-build
npm run test:full-app-p05-states:local -- --reuse-build
npm run test:full-app-p05-workflows:local -- --reuse-build
npm run test:full-app-p06-settings:local -- --reuse-build
npm run test:full-app-p06-audit:local -- --reuse-build
npm run test:full-app-p06-mutations:local -- --reuse-build
npm run test:full-app-p06-privacy-mutations:local -- --reuse-build
npm run test:full-app-p06-billing-mutation:local -- --reuse-build
npm run test:full-app-p07-entry:local -- --reuse-build
npm run test:full-app-p07-auth:local -- --reuse-build
npm run test:release-browser:local -- --reuse-build
```

Then, without changing source or build:

```bash
npm run acceptance:physical-index
npm run acceptance:map
npm run verify:full-acceptance-evidence
npm run acceptance:impeccable-final
npm run cleanup:remaining-closure
npm run cleanup:role-acceptance
git diff --check
```

The implementation may add the named missing package scripts, but it must not
change thresholds or skip existing suites. The fixture orchestrator must invoke
both cleanup commands from `finally` when an intermediate command fails.

### Final evidence invariants

- every passing scenario has its own receipt and exact files;
- all 223 receipts name the same final build ID and dirty-tree fingerprint, or
  a prior receipt is reused only when its complete owner dependency hash is
  identical and the final ledger records that lineage explicitly;
- no generic route image satisfies an empty, unavailable, error, not-found, or
  overlay row;
- mutation receipts include persisted read-back and cleanup;
- summary counts are generated from the ledger, never edited independently;
- `coverage-summary.md`, `defects.md`, and `regression.json` agree exactly with
  `acceptance-ledger.json`;
- local, deployed, and programme verdicts remain separate;
- UX9 visual acceptance remains `not_claimed`.

## 14. Phase ownership and hard stops

Execute FAR-0 through FAR-7 in order. Freeze evidence after each phase. Stop
before the next phase when the current phase needs authority outside its
allow-list.

Stop and request separate authority for:

- a public route or externally visible API contract change;
- a database schema change or any remote migration;
- real Stripe configuration, checkout, portal, subscription, invoice, or
  payment mutation;
- real provider/OAuth requests;
- external email or user contact;
- protected-preview mutation, protection bypass, or deployment;
- deletion or mutation of any merchant/data not created by FAR-0;
- weakening machine-access entitlement, role, tenancy, audit, idempotency,
  money, or provider semantics;
- changing a test, threshold, manifest row, or product copy merely to remove a
  failure;
- a cleanup fingerprint mismatch or unidentified target;
- a second Impeccable detector invocation;
- any secret appearing in output or an artifact.

If a hard stop occurs, retain the affected row as partial or blocked, clean up
all verified disposable targets, record the exact blocker, and stop. A waiver
for implementation never becomes acceptance.

## 15. Deliverables

Deliver under the new evidence root:

- frozen remaining-closure baseline and owned-file ledger;
- exact fixture plan, preparation, mutation, and cleanup receipts;
- ten independent scenario directories and receipts;
- final 223-row ledger and physical evidence index;
- role/delegated-profile and alias receipts;
- one full Jest receipt and exact production build receipt;
- one uninterrupted 103/103 release-browser receipt;
- detector target inventory, raw result, review, and single-invocation receipt;
- cross-cutting accessibility/responsive/interaction evidence;
- read-only deployed-preview receipt;
- prioritised defect report and repair log;
- internally consistent coverage summary and regression receipt;
- separate local, deployed, programme, and UX9 verdicts.

Implementation is complete only when the repository and evidence satisfy this
document. Acceptance is complete only when the corresponding verdict gates
pass; code completion alone is not acceptance.

## Appendix A — Canonical evidence inputs

- `artifacts/full-app-acceptance-2026-08-30/acceptance-ledger.json`
- `artifacts/full-app-acceptance-2026-08-30/coverage-summary.md`
- `artifacts/full-app-acceptance-2026-08-30/defects.md`
- `artifacts/full-app-acceptance-2026-08-30/regression.json`
- `artifacts/full-app-acceptance-2026-08-30/build-environment.json`
- `artifacts/full-app-acceptance-2026-08-30/physical/roles.json`
- `artifacts/full-app-acceptance-2026-08-30/physical/aliases.json`
- `artifacts/full-app-acceptance-2026-08-30/physical/preview.json`
- `artifacts/full-app-acceptance-2026-08-30/role-fixture-cleanup.json`

## Appendix B — Current non-pass snapshot

| Scenario | Verdict note |
| --- | --- |
| `pricing-plan-unavailable` | Shared route/context evidence does not independently prove activation. |
| `invite-member-and-transfer-ownership-modals` | Overlay opened; submit and mutation were not executed. |
| `api-keys-empty` | Shared route/context evidence does not independently prove an eligible empty state. |
| `create-reveal-and-revoke-api-key-modals` | Eligible fixture/capability was unavailable; no unsafe mutation was attempted. |
| `audit-trail-empty` | Shared route/context evidence does not independently prove the empty state. |
| `data-erasure-and-account-deletion-modals` | Overlays opened; destructive disposable mutation proof is absent. |
| `agreement-upload-and-review-overlays` | Overlay opened; upload, persisted review, and cleanup proof are absent. |
| `billing-unavailable` | Shared route/context evidence does not independently prove the unconfigured state. |
| `billing-plan-change-modal` | Provider-free final-build capability was unavailable; no billing mutation was attempted. |
| `root-not-found` | Public not-found rendered, but the row lacks its own complete receipt. |
