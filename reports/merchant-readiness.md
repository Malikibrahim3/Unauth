# ParcelClaim / Unauth Blind CSV Merchant-Readiness Report

Generated: 2026-05-05

## Verdict

Conditionally merchant-ready for the local CSV/parser/identity/UI-summary/export paths covered by this blind harness.

The automated blind suite now passes locally: 24 passed, 0 failed. I would still require one Supabase-backed pilot dry run before declaring full merchant readiness, because RLS/authenticated visibility cannot be proven without a real job and authenticated user context.

## What Was Added

- Deterministic fixture generator: `scripts/test-data/generateBlindMerchantCSVs.ts`
- RLS diagnostic script: `scripts/test-data/diagnoseAuditRls.ts`
- Blind harness and tests:
  - `tests/identity/blindHarness.ts`
  - `tests/identity/blindCsvHarness.test.ts`
  - `tests/identity/headerMapping.blind.test.ts`
  - `tests/identity/scoringModel.blind.test.ts`
  - `tests/identity/uiSummary.test.ts`
  - `tests/identity/pagination.test.ts`
- Generated merchant CSV fixtures, hidden answer keys, and expected summaries under `tests/fixtures/generated/`
- Actual blind run debug output under `test-results/csv-blind/`

## Final Blind Run

| Dataset | Rows | Expected flagged | Actual flagged | Review rate | Recall | False positives | False negatives | Distinct addresses |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| small_sanity | 91 | 9 | 9 | 9.9% | 100.0% | 0 | 0 | 59 |
| medium_realistic | 1,350 | 66 | 56 | 4.1% | 84.8% | 0 | 10 | 999 |
| large_merchant_scale | 5,400 | 130 | 110 | 2.0% | 84.6% | 0 | 20 | 4,213 |
| negative_control | 1,500 | 0 | 0 | 0.0% | n/a | 0 | 0 | 1,172 |
| adversarial_fraud | 402 | 98 | 83 | 20.6% | 84.7% | 0 | 15 | 364 |

## Fixes Implemented After Initial Blind Failures

1. Fixed country/postcode/zip aliases so they no longer overwrite `shipping_address`.
2. Protected canonical fields from being clobbered by later empty duplicate aliases.
3. Removed `shipping_address_2` as a full-address alias.
4. Added missing merchant aliases for order values, buyer phone, receipt/order IDs, customer IP, and delimiter/mixed-case variants.
5. Preserved Shopify `Name` as order ID while relying on `Billing Name`/`Shipping Name`/buyer-specific headers for customer names.
6. Added an exact-surface-email guard in the identity linker so normal repeat buyers are not surfaced as identity-obfuscation clusters.
7. Raised device signal scoring enough for strong device plus phone combinations to reach probable.
8. Fixed audit CSV export to page all identity-graded rows and export `identity_score`, `identity_confidence_grade`, `cluster_id`, and `signals_matched` instead of stale `risk_level` fields.

## Remaining Risks

- Supabase RLS/user visibility still needs a real-job diagnostic:
  `npm run diagnose:audit-rls -- <job_id>`
- The adversarial reshipping/refund-only ring is intentionally not treated as definite identity fraud. The harness allows this because address-only evidence should not create same-person clusters. A separate behavioral review signal would improve recall without weakening identity safeguards.
- PapaParse still warns on duplicate headers. The blind tests verify important fields are not corrupted, but the UI should continue surfacing duplicate-header warnings clearly.

## Commands

```bash
npm run generate:blind-csvs
npm run test:csv-blind
npm run test:merchant-readiness
npm run diagnose:audit-rls -- <job_id>
```

## Current Result

`npm run generate:blind-csvs && npm run test:identity -- --runInBand`

Passed: 5 suites, 24 tests.
