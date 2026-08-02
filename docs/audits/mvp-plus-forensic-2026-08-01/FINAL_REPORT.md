# Unauth MVP+ forensic audit — 2026-08-01

VERDICT: NOT PROVABLE

Critical capabilities proved: 0/18
Prohibited actions safely blocked: 24/29
Mandatory journeys passed: 0/12
Open P0 findings: 2
Open P1 findings: 1
Critical unverified requirements: 8

Typecheck: PASS
Lint: PASS
Production build: PASS
Unit/integration tests: PASS
Browser journeys: PASS
Accessibility: PASS
Tenant isolation: PASS
Financial reconciliation: PASS
Clean/upgrade migrations: FAIL
Provider runtime proof: UNVERIFIED

RELEASE DECISION: NO-GO

## Executive summary

The repository is materially stronger after remediation. The final source gates,
full Jest suite, local database integrity checks, tenant-boundary checks, full
authenticated route accessibility/reflow matrix, critical browser journeys and
Impeccable detector are green. The remediation fixed real defects in focus
trapping, semantic labels, nested interactive controls, command palette
mounting, CSV paste handling, definition-list semantics, selected-card contrast,
and narrow responsive layouts.

The release cannot be certified. The authenticated production-like browser run
against the configured remote Supabase target logged a real schema drift error:
`/rules/recovery` could not load investigation settings because
`merchants.investigation_response_sla_hours` was absent. A repair migration was
added and validated only in a rollback-only local transaction; it was not
applied to the remote target. The intended provider stack, safe mail sink,
clean-and-upgrade migration path, fresh-account rehearsal and all twelve
end-to-end journeys were not proved. Under the supplied release rule, that is
`NOT PROVABLE`, therefore `NO-GO`.

## Environment tested

- Repository: `/Users/malikibrahim/Downloads/Unauth`
- Branch: `codex/hotfix-vercel-investigation-env`
- HEAD: `76503cb464c17724ef5cac9e5e59cfd3ce13bc23` (`add password visibility toggle to login`)
- Framework: Next.js 16.2.7; Node.js 22.x; local production build via webpack
- Browser: Playwright desktop Chromium, with 320, 390, 768, 1024 and 1440px checks
- Browser target: local production server on `http://localhost:3001`, authenticated through the workspace's safe E2E bootstrap
- Database target: local `supabase_db_Unauth` for read-only or rollback-only checks; the browser session also exercised the configured remote Supabase target
- No secrets, auth tokens, cookies, merchant IDs, customer records or raw provider payloads are included in this report

## Tools used

`rg`, Git, npm scripts, TypeScript, ESLint, Jest, Next production build,
Playwright, Chromium, local Supabase/Postgres Docker checks, Supabase migration
inspection, the Impeccable context/detector, and the Codex browser workflow.

## Tools unavailable or intentionally not used

- Provider live actions and `validate:live-connectors`: not run. No external
  provider mutation was authorized or needed to produce this audit.
- Provider E2E runner/preflight: not run. Its preflight can create a second
  merchant when configuration is absent, so it was not treated as read-only.
- Safe mail sink: unavailable/not configured for this run.
- Canonical `supabase db reset --local`: not run; the safety reviewer blocked a
  destructive reset of the existing local database.
- `verify:rollout-rehearsal`: not run; the script resets and repairs migration
  history and can mutate the local database.
- Deployment, remote migration application, commit, push, PR and release
  actions: not requested and not performed.
- Performance budgets, backup/restore, credential rotation and production
  observability: not measured or proved.

## Changes made

### Product/runtime remediation

- Repaired the overlay focus-trap race and focus restoration timing in
  `lib/design/useOverlayPresence.ts`.
- Replaced unmapped case status/next-action text with the canonical label
  registry and added payout next-action coverage.
- Fixed nested interactive controls in the work queue's desktop table.
- Rebuilt the command palette on the shared overlay portal with explicit dialog
  semantics and Escape handling.
- Ensured pasted CSV text reaches validation through `onChange`/`onInput`.
- Corrected `LeadSummary` definition-list semantics and preserved its visual
  style through the canonical `dd` selector.
- Improved selected case metadata contrast to satisfy core axe checks.
- Made the loss chart, report trend chart, loading skeleton and scrollable data
  tables safe at narrow widths; the final route matrix is 59/59.

### Contract/test remediation

- Updated stale current-product route and terminology assertions to the current
  product contract.
- Repaired the deterministic investigation lifecycle SQL fixture and aligned
  the Phase 01 runner with the active product scope.
- Added the investigation schema requirements to
  `lib/supabase/requiredSchema.json`.
- Added, but did not apply remotely,
  `supabase/migrations/20260801120000_repair_release1_investigation_schema_drift.sql`.
  It adds missing investigation settings/partner columns and guarded
  constraints while refusing cross-merchant partner references.

## Test results

| Gate | Result | Evidence |
|---|---|---|
| `npm run typecheck` | PASS | No TypeScript errors |
| `npm run lint -- --max-warnings=0` | PASS | No ESLint warnings/errors |
| `npm run build` | PASS | Next.js production build; 94 static pages generated |
| `npm test -- --runInBand --silent --no-colors` | PASS | 376 suites passed, 1 skipped; 2,843 tests passed, 3 skipped |
| `npm run lint:authenticated-design` | PASS | 506 files; all three ratchets 0/0 |
| `npm run audit:supabase-contract` | PASS | 143 live tables checked |
| `npm run verify:merchant-copy` | PASS | 579 source files and 15 prohibited-copy checks |
| `npm run verify:schema-preflight` | PASS | Local: 6 relations, 40 columns, 3 FKs, 7 grant sets |
| `npm run verify:p0-ledger` | PASS with unresolved ledger items | 322 rows: 153 PASS, 169 UNVERIFIED |
| `npm run verify:decision-ledger` | PASS | 65 route entries and 279 ledger entries |
| Final Impeccable detector | PASS | `[]` for all changed UI targets |
| Critical browser journey | PASS | 18/18 |
| Sidebar route journey | PASS | 12/12 |
| Accessibility/reflow matrix | PASS | 59/59 |
| Tenant boundary runtime | PASS | Two-merchant RLS/RPC/storage acceptance |
| Webhook event safety runtime | PASS | Duplicate claim and object-order concurrency acceptance |
| Privacy erasure runtime | PASS | Erasure, storage cleanup and retention acceptance |
| Durable audit runtime | PASS | Rollback-only Postgres acceptance |
| Investigation lifecycle runtime | PASS | Rollback-only Postgres acceptance |
| Source-to-recovery runtime | PASS | Financial/recovery/idempotency/currency acceptance |
| Remote investigation settings load | FAIL | `/rules/recovery` missing remote merchant SLA column |
| Clean/upgrade migration proof | UNVERIFIED | Safe temporary replay passed; canonical reset not run |
| Provider runtime proof | UNVERIFIED | No controlled provider/mail-sink run |

## Capability scores

Scores use the supplied scale: `1` represented UI/mock, `2` functional locally,
`3` proved end-to-end in the intended production-like environment. The
capability matrix contains the complete traceability rows. No capability is
counted as proved at score 3 because the target environment and/or required
provider journey remained unverified.

| ID | Score | Status | Main reason |
|---|---:|---|---|
| M-01 | 2 | UNVERIFIED | UI and local setup contracts work; fresh-account/provider onboarding not proved |
| M-02 | 2 | UNVERIFIED | Local financial/report checks and browser surfaces pass; exact target reconciliation not complete |
| M-03 | 2 | UNVERIFIED | Queue, task, view and accessibility controls pass locally; full safe-bulk journey not complete |
| M-04 | 2 | UNVERIFIED | Case registry and isolation tests pass; all required issue/parcel journey variants not run end-to-end |
| M-05 | 2 | UNVERIFIED | Workspace route and case contracts pass; full provider-backed chronology not exercised |
| M-06 | 2 | UNVERIFIED | Evidence semantics and truthfulness tests pass locally; target provider provenance not proved |
| M-07 | 2 | UNVERIFIED | Lifecycle transaction passes; safe mail sink, delivery, attachments and notifications not exercised |
| M-08 | 2 | UNVERIFIED | Responsibility protections pass unit/security checks; later-evidence UI journey not complete |
| M-09 | 2 | UNVERIFIED | Decision APIs and reversal contracts pass; external outcome journey not proved |
| M-10 | 2 | UNVERIFIED | Ledger/reconciliation/mixed-currency checks pass locally; intended target data not fully reconciled |
| M-11 | 2 | UNVERIFIED | Recovery state/calculation contracts pass; provider submission/payment lifecycle not proved |
| M-12 | 2 | UNVERIFIED | Identity graph and match-gating tests pass; full confirm/reverse UI and PII roles not proved |
| M-13 | 2 | FAIL | Local rules tests pass, but remote `/rules/recovery` has schema drift |
| M-14 | 2 | UNVERIFIED | Bounded workflow contracts pass; enabled-provider execution history not proved |
| M-15 | 2 | UNVERIFIED | Reports/browser/export contracts pass locally; exact target export reconciliation not complete |
| M-16 | 2 | UNVERIFIED | Catalogue and webhook controls pass; no controlled provider runtime proof |
| M-17 | 2 | UNVERIFIED | Search/notification/widget contracts and command search pass; all target channels not proved |
| M-18 | 2 | UNVERIFIED | Settings/team APIs and local permissions pass; full role/PII/rotation rehearsal not proved |

## Forbidden-action result

Repository search and local negative/security tests found no proven automatic
refund, credit, reship, replacement, blame, recovery-payment or audit-history
mutation path. Explicit recording endpoints are distinct from provider-side
execution and retain evidence/permission gates. The negative matrix records 24
passing local controls and five requirements that remain unverified because
they depend on provider runtime or intended-environment PII proof.

The five unverified rows are carrier claim submission, 3PL claim submission,
supplier claim submission, secrets/excess-PII exposure in the intended target,
and live-integration truthfulness. Any executable forbidden action discovered
in the intended environment remains a P0 release blocker.

## Mandatory journeys

The browser route suite is green, but it is not evidence that all twelve
business journeys passed. The journey report therefore records 0/12 full
passes. Local rollback-only runtime checks provide strong sub-control evidence
for tenant isolation, webhook idempotency/order, investigation lifecycle,
financial reconciliation and privacy erasure, but they do not substitute for
the missing provider-backed, fresh-account and mail-sink journeys.

## Findings

### P0 — release blockers

1. **P0-01 — Remote schema drift.** The configured remote target is missing
   `merchants.investigation_response_sla_hours`; `/rules/recovery` raised a
   server error while loading investigation settings. The local schema is
   current, but the repair migration has not been applied to the target.
2. **P0-02 — Intended release proof is incomplete.** Provider runtime,
   clean/upgrade migration replay, fresh merchant onboarding, safe mail-sink
   investigation flows and all twelve mandatory journeys remain unverified.
   This directly meets the supplied P0 rule for a critical pilot requirement
   that remains unverified.

### P1 — major

1. **P1-01 — E2E auth bootstrap console error.** The in-app/browser session
   emitted a Supabase client recovery error during the safe E2E bootstrap.
   Routes still passed, but a clean authenticated console/session proof was not
   established. The raw message/token-bearing logs were not retained.

### P2 and P3

No additional open P2/P3 defect was left after the final responsive and
accessibility remediation. The remaining lower-severity concerns are captured
as unverified release proof, not silently downgraded defects.

## UX and accessibility score

**8/10 for exercised surfaces; not a release certification score.** The final
Impeccable detector is clean, all 28 route axe checks pass, all responsive
checks pass at five widths, and the command palette Escape path passes. The
score is held below complete because full manual keyboard completion of every
business journey, screen-reader review, 200% text-size review, performance
budgets and provider-backed error states were not exercised.

## Security and tenancy

**PASS for local proof.** Two-merchant RLS/RPC/storage boundary acceptance,
merchant isolation API tests, credential-RLS tests, object-level route tests,
webhook safety and durable audit checks pass. This is not a claim of remote
production parity; the remote schema drift remains a P0.

## Data and migration result

The safe disposable replay applied the 21 canonical migrations to a unique
temporary database and observed 143 tables, 2 views, 90 functions and 161
policies. The new repair migration passed rollback-only validation. Local
schema preflight passes.

The intended clean-and-upgrade proof is **FAIL/UNVERIFIED** for release
purposes: the canonical reset was not run because it would mutate the existing
local database, and the remote target has demonstrable drift. The repair SQL is
append-only/guarded and remains unapplied until an authorized deployment.

## Provider-proof result

**UNVERIFIED.** The provider catalogue, adapter contracts, webhook signature
and concurrency controls are covered by unit/local tests. No live connector
validation, safe mail sink, provider credential revocation, provider retry,
claim submission, payment receipt or outbound-domain proof was performed.
Seed/demo data was not counted as provider proof.

## Critical unverified requirements

1. Remote migration parity and application of the repair migration.
2. Controlled runtime proof for the intended Shopify/helpdesk/fulfilment provider stack.
3. Clean install and upgrade migration proof in an approved disposable environment.
4. Fresh non-founder merchant onboarding and resume/reconnect behavior.
5. Safe mail-sink investigation send/chase/response/notification lifecycle.
6. Full identity correction/unmerge and role-based PII visibility journey.
7. Backup/restore and credential-rotation proof.
8. Production performance budgets and clean authenticated console observability.

## Exact release blockers

- Apply and verify `20260801120000_repair_release1_investigation_schema_drift.sql`
  in the intended target; then rerun schema preflight and `/rules/recovery`.
- Produce controlled provider and mail-sink evidence for the applicable
  capabilities; do not label a connector live from catalogue or seed data.
- Run approved clean/upgrade migration rehearsal without resetting the current
  working database.
- Complete J-01 through J-12 with disposable fixtures, persistence checks,
  audit checks and negative controls.
- Resolve or explicitly explain the safe E2E auth bootstrap console error.

## Recommended next action

Have the release owner apply the guarded repair migration through the normal
reviewed deployment path, verify the remote schema and rerun the blocked
runtime route. Then schedule a controlled provider/mail-sink rehearsal and the
clean/upgrade migration test in disposable environments. Re-run this audit
against that exact target; only then can the score move from `NOT PROVABLE`.

## Evidence and traceability

- [Capability matrix](CAPABILITY_MATRIX.md)
- [Forbidden-action matrix](FORBIDDEN_ACTION_MATRIX.md)
- [Journey results](JOURNEY_RESULTS.md)
- [Evidence index](EVIDENCE_INDEX.md)
- [Sanitized evidence artifacts](artifacts/README.md)

VERDICT: NOT PROVABLE

Critical capabilities proved: 0/18
Prohibited actions safely blocked: 24/29
Mandatory journeys passed: 0/12
Open P0 findings: 2
Open P1 findings: 1
Critical unverified requirements: 8

Typecheck: PASS
Lint: PASS
Production build: PASS
Unit/integration tests: PASS
Browser journeys: PASS
Accessibility: PASS
Tenant isolation: PASS
Financial reconciliation: PASS
Clean/upgrade migrations: FAIL
Provider runtime proof: UNVERIFIED

RELEASE DECISION: NO-GO
