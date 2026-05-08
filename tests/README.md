# Playwright Audit Suite

This suite combines Playwright browser automation with content compliance checks.

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

## Content compliance

The compliance tests check for:
- Banned words (e.g., "fraud")
- Technical jargon that shouldn't appear in merchant-facing text
- Canonical confidence grade terminology

Any occurrence of the word `fraud` in merchant-facing text is an automatic failure.

## Updating content rules

Update banned terms in:

- `tests/compliance/no-fraud-language.spec.ts`
- `tests/compliance/content-rules.spec.ts`
