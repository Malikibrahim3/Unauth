# Authenticated craft-completion validation

Finalized: 2026-07-14
Branch: `ui-craft-overhaul`

## Result

The reopened authenticated craft gate is **verified with documented limitations**. The application fixes, route matrix, responsive checks, real light/dark control, build, unit/integration suite, critical workflows, compliance scan, and fresh masked evidence all pass. No production deployment or merge to `main` was performed.

## Implemented completion work

- Replaced the cosmetic-only authenticated dark setting with a real neutral dark token scope and removed decorative gradients, KPI rails, ordinary shadows, and fake empty-state decoration.
- Rebuilt Dashboard and Reports around separate-currency bridges, a wide linear exposure/recovery trend, ranked cause bars, a reconciled recovery ledger, explicit no-data states, custom token tooltips, and accessible source tables. No currency is guessed and currencies are never combined.
- Completed Work with real counts for every view, reduced repeated narration, honest unassigned owners, and guarded whole-row keyboard/pointer navigation.
- Restored the populated case workspace by changing the case-list read permission from decision-write to inbox-read, while preserving write permissions on mutations. Case identity, evidence, recommendation, payout exposure, recovery and audit history now resolve on mount.
- Aligned customer-directory and drawer open-case definitions to the canonical active-case statuses and removed the misleading case-to-order percentage.
- Replaced the hidden sidebar Suspense spacer with a semantic full-shell skeleton, simplified Settings hierarchy, removed hardcoded light-only surfaces, completed readable flow-condition copy, and removed decorative textual-arrow CTAs.

## Verification

| Gate | Result |
|---|---|
| TypeScript | Passed |
| ESLint (`app components lib`, zero warnings) | Passed |
| Authenticated design guard | Passed, 375 files |
| Optimized Next.js build | Passed, 94 static pages plus dynamic routes |
| Jest | Passed: 266 suites, 2,028 tests; 1 suite / 3 tests intentionally skipped |
| Critical product Playwright | Passed after updating the obsolete “Reports has no charts” assertion to the binding chart contract |
| Content compliance Playwright | Passed |
| Authenticated redesign matrix | Passed: 9/9 across desktop, tablet and mobile |
| Evidence capture | Passed: 26 masked screenshots |
| Diff whitespace check | Passed |

## Route and viewport coverage

An independent final filesystem inventory found 67 route files and 67 unique normalized routes across `app/(app)`, `app/onboarding`, and `app/audit-running`, matching the frozen manifest count. `tests/current/authenticated-redesign.spec.ts` opened every manifest pattern at 1440×900, 1024×900 and 390×844, then rediscovered and opened seeded dynamic destinations. A separate 1280×900 capture verifies the laptop breakpoint.

Fresh evidence is indexed in `design-evidence/2026-07-14-authenticated-craft-completion/README.md`. The actual appearance button was used for `26-dark-overview.png`; dark mode was not forced by test-only CSS.

## Documented limitations

- The safe merchant has sparse recovery activity in the selected 30-day period. The zero-value recovery ledger is therefore verified as a truthful no-data state; its populated arithmetic and mixed-currency separation are covered by Jest rather than a fabricated browser fixture.
- Some dynamic compatibility routes intentionally resolve to redirects, not distinct visual pages. They are covered by the route matrix at the canonical destination.
- The production server often completes route transitions before a screenshot can be taken. The semantic full-shell loading skeleton was inspected in the slower live development transition; the evidence set uses the deterministic asynchronous setup state rather than adding test-only latency to the product.
- Public marketing surfaces were intentionally excluded and unchanged.

## Release state

The feature branch is pushed. Release remains intentionally withheld: the prompt requires explicit user confirmation before merging to `main` or deploying production.
