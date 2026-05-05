# Playwright AI Audit Suite

This suite combines Playwright browser automation with Claude evaluation for merchant-facing user experience and content compliance checks.

## Setup

Install dependencies:

```bash
npm install
npx playwright install chromium
```

Required environment variables:

```bash
PLAYWRIGHT=1
PLAYWRIGHT_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` is used only by `tests/global-setup.ts` to create and delete isolated test accounts.

## Test account lifecycle

The suite is autonomous:

1. `global-setup.ts` deletes the previous account recorded in `tests/.test-credentials.json`.
2. It creates a new confirmed Supabase auth user.
3. It creates the merchant profile.
4. It signs in through the UI.
5. It uploads deterministic CSV fixtures.
6. It attempts to generate one evidence package.
7. `global-teardown.ts` deletes the test account and local test artifacts.

Never commit `tests/.test-credentials.json`.

## Fixtures

Fixtures are generated deterministically by:

```bash
npm run test:fixtures
```

Generated CSVs live in `tests/utils/csv-fixtures/` and are intentionally gitignored.

## Running tests

Critical path tests:

```bash
npm run test:critical
```

Full Playwright suite:

```bash
npm run test:e2e
```

Compliance suite:

```bash
npm run test:compliance
```

HTML report:

```bash
npm run test:e2e:report
```

## Interpreting AI failures

- **80-100**: Strong merchant experience; only minor suggestions.
- **65-79**: Understandable but needs copy or UX improvements.
- **45-64**: Likely confusing to merchants; review before release.
- **0-44**: Serious issue or hard-rule failure.

Any occurrence of the word `fraud` in merchant-facing text is an automatic failure regardless of score.

## Updating content rules

Update banned terms in:

- `tests/compliance/no-fraud-language.spec.ts`
- `tests/utils/ai-evaluator.ts`

Keep hard rules deterministic in Playwright assertions wherever possible, and use AI evaluation for qualitative merchant comprehension.

## Adding AI criteria

Add criteria to the relevant `evaluateMerchantExperience` call. Criteria should be specific and phrased from the merchant’s point of view.
