# Product polish — Phase 3

- Status: COMPLETE
- Active IDs: COPY-01–COPY-17
- Result: 17/17 PASS

## Changes

- COPY-01 — aligned authenticated navigation, case detail, customer narratives, notifications, recovery, and public demo copy on Case; retained Claim only for provider submissions and Chargeback for payment disputes.
- COPY-02 — added exact major-unit money parsing/formatting at form boundaries and removed merchant-facing minor-unit language.
- COPY-03 — shortened Rules copy and moved version-history detail beside version controls.
- COPY-04 — changed Flows copy to create, test, publish, and pause with one direct availability explanation.
- COPY-05 — made connection copy provider-specific and focused on last successful sync and repair actions.
- COPY-06 — added state-specific Work empty and disconnected copy, including No open work and Connect a source to create work.
- COPY-07 — made reconciliation matching the explicit action and removed manual refresh sequencing.
- COPY-08 — changed unmatched rules to No rule applies with standard review fallback and Review rules guidance.
- COPY-09 — added count-aware missing-item copy and source timestamp semantics.
- COPY-10 — applied pluralisation helpers across customer and recovery narratives.
- COPY-11 — humanised status/source values, replaced opaque references, and separated Unavailable from zero and error.
- COPY-12 — enforced the confirmed-loss bound before eligible recovery or recovered cash enters reporting aggregates.
- COPY-13 — added provider-preserving sentence-case event-title formatting.
- COPY-14 — removed decorative Generated timestamps from Overview and Reports hero compositions.
- COPY-15 — updated stale route actions and loading/error copy to Overview, Work, Cases, and current object names.
- COPY-16 — published and reused one six-stage financial label/definition map across detail, ledgers, reports, and exports.
- COPY-17 — added explicit zero, unavailable, inapplicable, loading, error, stale, disconnected, and source-identification states.

## Requirement ledger

| ID | Requirement | Result |
|---|---|---|
| COPY-01 | Canonical vocabulary | PASS |
| COPY-02 | Major-unit money | PASS |
| COPY-03 | Rules copy | PASS |
| COPY-04 | Flows availability | PASS |
| COPY-05 | Integration copy | PASS |
| COPY-06 | Work states | PASS |
| COPY-07 | Matching flow | PASS |
| COPY-08 | Rule fallback | PASS |
| COPY-09 | Missing-item counts | PASS |
| COPY-10 | Customer pluralisation | PASS |
| COPY-11 | Report states and references | PASS |
| COPY-12 | Financial truth bound | PASS |
| COPY-13 | Provider casing | PASS |
| COPY-14 | Freshness copy | PASS |
| COPY-15 | Current route actions | PASS |
| COPY-16 | Financial-stage map | PASS |
| COPY-17 | Data-state semantics | PASS |

## Checks

- `npm run verify:merchant-copy` — PASS.
- `npm test -- --runInBand tests/unit/uiLabels.test.ts tests/unit/moneyFormatting.test.ts` — PASS.
- Financial truth and export contract tests — PASS.
- Seeded browser rendered copy pass on `/landing` — PASS: no raw UUIDs, machine enums, stale route names, minor-unit leakage, or prohibited generic nouns; Gorgias casing preserved.
- `npm run typecheck` — PASS.
- `npm run lint -- --max-warnings=0` — PASS.
- `git diff --check` — PASS.

## Remaining issues
None.
