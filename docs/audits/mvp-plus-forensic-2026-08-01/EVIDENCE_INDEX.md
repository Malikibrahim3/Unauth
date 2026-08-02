# Evidence index

This index is the evidence map for the forensic audit. Each entry identifies
the exact command, test, source location or sanitized observation behind the
claims in the report and matrices. No tokens, cookies, merchant IDs, customer
records or raw provider payloads are retained here.

## E-01 — Repository baseline

- Source: repository `/Users/malikibrahim/Downloads/Unauth`.
- Command: `git status --short --branch`; `git rev-parse HEAD`; `git log -1`.
- Result: branch `codex/hotfix-vercel-investigation-env`; HEAD
  `76503cb464c17724ef5cac9e5e59cfd3ce13bc23`.
- Related report: [environment](FINAL_REPORT.md#environment-tested).

## E-02 — Final source gates

- Commands: `npm run typecheck`; `npm run lint -- --max-warnings=0`;
  `npm run build`; `npm test -- --runInBand --silent --no-colors`;
  `git diff --check`.
- Result: all PASS. Jest: 376 suites passed, 1 skipped; 2,843 tests passed,
  3 skipped; 1 snapshot passed.
- Related report: [test results](FINAL_REPORT.md#test-results).

## E-03 — Contract and governance gates

- Commands: `npm run lint:authenticated-design`; `npm run
  audit:supabase-contract`; `npm run verify:merchant-copy`; `npm run
  verify:schema-preflight`.
- Result: design ratchets 0/0 across 506 files; 143 live tables checked;
  579 source files and 15 copy checks; local schema preflight 6 relations,
  40 columns, 3 foreign keys and 7 grant sets.
- Source: [required schema](../../../lib/supabase/requiredSchema.json),
  [repair migration](../../../supabase/migrations/20260801120000_repair_release1_investigation_schema_drift.sql).

## E-04 — Decision, route and P0 ledgers

- Commands: `npm run verify:decision-ledger`; `npm run verify:p0-ledger`.
- Result: decision ledger PASS with 65 route entries and 279 ledger entries;
  P0 ledger command completed with 322 unique rows, 153 PASS and 169
  UNVERIFIED.
- Source: [decision ledger verifier](../../../scripts/verify-decision-ledger.mjs),
  [P0 ledger verifier](../../../scripts/verify-p0-ledger.mjs).

## E-05 — Final visual-system check

- Command: Impeccable detector over all changed UI targets.
- Result: PASS, detector output `[]`.
- Source targets include [WorkQueue](../../../components/work/WorkQueue.tsx),
  [CommandPalette](../../../components/layout/CommandPalette.tsx),
  [LossVisuals](../../../components/losses/LossVisuals.tsx),
  [responsive surfaces](../../../styles/authenticated/surfaces.css).

## E-06 — Critical browser journey

- Command: final serial Playwright run for `tests/current/current-product.spec.ts`.
- Result: 18/18 passed.
- Scope: authenticated current-product routes and primary interactions against
  the local production server.
- Source: [current-product suite](../../../tests/current/current-product.spec.ts).

## E-07 — Sidebar and route coverage

- Command: final serial Playwright run for `tests/current/sidebar-route-matrix.spec.ts`.
- Result: 12/12 passed.
- Scope: authenticated sidebar route matrix, navigation and route-level
  rendering.
- Source: [sidebar route suite](../../../tests/current/sidebar-route-matrix.spec.ts).

## E-08 — Accessibility and responsive matrix

- Command: final Playwright run for `tests/current/accessibility-responsive.spec.ts`.
- Result: 59/59 passed: 28 serious/critical axe checks, 28 responsive checks
  at 320, 390, 768, 1024 and 1440px, plus command-palette Escape coverage.
- Source: [accessibility suite](../../../tests/current/accessibility-responsive.spec.ts).
- Before/after: failures in losses, reports and settings/team were corrected;
  the final matrix is green. No failure screenshots or traces remain in the
  sanitized audit artifacts.

## E-09 — Tenant isolation

- Command: `npm run verify:tenant-boundaries`.
- Result: PASS for two-merchant RLS, RPC and storage boundary acceptance,
  including substituted and guessed identifiers.
- Related source/tests: tenant boundary verifier and merchant isolation tests
  under [tests](../../../tests).

## E-10 — Webhook event safety

- Command: `npm run verify:webhook-event-safety`.
- Result: PASS for duplicate/sequential concurrency and object-order handling.
- Related source/tests: webhook event safety verifier and webhook tests under
  [lib](../../../lib) and [tests](../../../tests).

## E-11 — Privacy erasure and retention

- Command: `npm run verify:privacy-erasure`.
- Result: PASS for privacy erasure, storage cleanup and retention behavior.
- Related source/tests: privacy verifier and account/privacy tests under
  [lib](../../../lib) and [tests](../../../tests).

## E-12 — Durable audit and investigation runtime

- Commands: `npm run verify:durable-audit-runtime`; `npm run
  verify:investigations-runtime`.
- Result: both PASS in rollback-only local Postgres transactions. The
  investigation fixture was made deterministic and its state transitions,
  idempotency and audit assertions passed.
- Source: [investigation SQL fixture](../../../tests/sql/release1-investigation-lifecycle.sql),
  [investigation libraries](../../../lib/investigations).

## E-13 — Financial and recovery runtime

- Command: `npm run verify:source-to-recovery`.
- Result: PASS for source-to-recovery reconciliation, financial entries,
  idempotency, mixed currency and denied viewer behavior in a rollback-only
  local runtime.
- Related source/tests: [financial libraries](../../../lib/financial),
  [recovery libraries](../../../lib/recoveries), and the verifier under
  [scripts](../../../scripts).

## E-14 — Safe migration validation

- Commands: `npm run verify:schema-preflight`; disposable temporary database
  replay of all 21 canonical migrations; rollback-only repair migration check.
- Result: temporary replay PASS with 143 tables, 2 views, 90 functions and
  161 policies. Repair migration rollback validation PASS. Existing local DB
  was not reset or mutated by the replay.
- Detailed sanitized output: [migration validation](artifacts/migration-validation.txt).
- Source: [repair migration](../../../supabase/migrations/20260801120000_repair_release1_investigation_schema_drift.sql).

## E-15 — Remote schema-drift observation

- Observation: authenticated production-like browser navigation reached
  `/rules/recovery`, but the configured remote Supabase target could not load
  investigation settings because the `merchants.investigation_response_sla_hours`
  column was absent.
- Evidence type: sanitized browser/server observation; raw logs and token-
  bearing session material were not retained.
- Impact: P0 remote migration-parity blocker; see
  [P0-01](FINAL_REPORT.md#findings).

## E-16 — Provider proof boundary

- Commands not run: `validate:live-connectors`, provider E2E runner/preflight,
  safe mail-sink rehearsal, provider credential revocation/retry/DLQ run,
  provider claim/payment submission.
- Result: provider runtime proof UNVERIFIED. Catalogue and adapter unit tests
  are not counted as live proof.
- Related report: [provider-proof result](FINAL_REPORT.md#provider-proof-result).

## E-17 — Clean/upgrade and release rehearsal boundary

- Not run: canonical `supabase db reset --local` and
  `verify:rollout-rehearsal`, because they reset or repair migration history
  in the existing local database.
- Result: clean/upgrade migration proof FAIL/UNVERIFIED for release purposes.
- Related report: [data and migration result](FINAL_REPORT.md#data-and-migration-result).

## E-18 — Remediation before/after source evidence

- Focus-trap race: [useOverlayPresence](../../../lib/design/useOverlayPresence.ts).
- Canonical case labels: [labels](../../../lib/ui/labels.ts) and
  [case drawer](../../../components/cases/CaseContextDrawer.tsx).
- Nested controls: [WorkQueue](../../../components/work/WorkQueue.tsx).
- Dialog semantics: [CommandPalette](../../../components/layout/CommandPalette.tsx).
- CSV paste handling: [CanonicalCsvImportClient](../../../components/imports/CanonicalCsvImportClient.tsx).
- Definition-list semantics: [LeadSummary](../../../components/ui/LeadSummary.tsx)
  and [surfaces](../../../styles/authenticated/surfaces.css).
- Responsive fixes: [LossVisuals](../../../components/losses/LossVisuals.tsx),
  [CumulativeAreaLineChart](../../../components/charts/authenticated/cartesian/CumulativeAreaLineChart.tsx),
  [table containment](../../../styles/authenticated/tables.css),
  [authenticated chrome](../../../components/authenticated/AuthenticatedPageChrome.module.css),
  and [loading skeletons](../../../components/navigation/skeletons/pageSkeletons.tsx).
- Final outcome: E-08 is green at 59/59 and E-05 is clean.

## Sanitized artifacts

- [Artifact README](artifacts/README.md) documents retention and redaction.
- [Browser summary](artifacts/browser-summary.txt) records final route counts.
- [Migration validation](artifacts/migration-validation.txt) records safe
  disposable replay and rollback-only results.
- No screenshots, traces, network exports or raw server logs are retained;
  the final browser suites were green and the intermediate failure artifacts
  were not copied into the audit package.
