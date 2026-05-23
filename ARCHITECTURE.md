# ARCHITECTURE.md — System Architecture Reference

## Overview

Unauth is a Next.js App Router TypeScript application for fraud detection. It processes merchant transaction CSVs, clusters customer identities, and scores each order for fraud risk.

---

## Directory Structure

```
app/                      Next.js App Router pages and API routes
  (app)/                  Authenticated merchant app
  (public)/               Public-facing pages (landing, public audit)
  api/                    API route handlers
lib/                      All shared business logic
  csv/                    CSV parsing, normalisation, data quality
  engine/                 Fraud scoring engine
  identity/               Identity normalisation and hashing
  processing/             CSV pipeline (jobs, chunks, dispatch)
  supabase/               Supabase client helpers, query helpers
  utils/                  Formatting, environment, UI utilities
components/               React components
  dashboard/              Dashboard charts and summaries
  customers/              Identity cluster graph
  ui/                     Shared UI primitives
scripts/                  One-off maintenance and benchmark scripts
tests/                    Playwright E2E and unit tests
```

---

## Fraud Scoring Engine

### Behavioral Scoring (`lib/engine/fastScore.ts`)

Used by the CSV pipeline via `scoreBatch()`. Takes `EnrichedOrder[]` and runs signal detectors defined in `lib/engine/signals/`. Signal weights are defined in `lib/engine/weights.ts` (`SIGNAL_WEIGHTS`). The output risk tier is determined by `RISK_TIER_THRESHOLDS` and `FLAG_THRESHOLD`.

### Identity Scoring (`lib/scorer.ts`)

Used by identity resolution via `scoreIdentityFromSignals()`. Takes identity signals and outputs a confidence grade. Has its own internal weights (`SCORER_INTERNAL_SIGNAL_WEIGHTS`) and thresholds (`GRADE_THRESHOLDS`) that were calibrated independently and must not be changed without explicit instruction.

---

## Identity Resolution

### Normalisation (`lib/identity/normalise.ts`)

Single source of truth for all identity normalisation functions:
- `normaliseEmail(email)` → `string | null`
- `normaliseAddress(address)` → `string | null` (canonical form for storage/matching)
- `normaliseAddressTokens(address)` → `string[]` (token array for Jaccard/linker set operations)
- `normaliseIP(ip)` → `string | null`
- `normaliseCard(card)` → `string | null`

### Hashing (`lib/identity/hash.ts`)

HMAC-SHA256 identifiers using `env.IDENTITY_SALT`. Re-exports `normaliseEmail` and `normaliseAddress` for backwards compatibility.

### Clustering (`lib/engine/identityClusterBuilder.ts`)

Union-Find algorithm to cluster orders by identity signals. Helper functions (`extractRawIds`, `chooseAnchor`, `reasonsFromSignals`) live in `lib/engine/identityHelpers.ts`.

### Linker (`lib/linker.ts`)

The linker uses `normaliseAddressTokens` (returns `string[]`) for Jaccard address overlap calculations. It re-exports it as `normaliseAddress` for backwards compatibility. The canonical `normaliseAddress` (returns `string | null`) is re-exported as `normaliseAddressFull`.

---

## Confidence Grade System

Confidence grades are lowercase strings: `'definite' | 'probable' | 'possible' | 'weak'`.

Canonical thresholds (from `lib/engine/weights.ts`):
- `DEFINITE` >= 85
- `PROBABLE` >= 65
- `POSSIBLE` >= 45
- `WEAK` < 45

Letter grades: `'A'` (definite), `'B'` (probable), `'C'` (possible), `'D'` (weak).

Conversion functions `scoreToGrade()` and `gradeToLetter()` are in `lib/engine/weights.ts`.

---

## CSV Processing Pipeline

1. User uploads CSV via `app/api/upload/route.ts` or `app/api/public-audit/submit/route.ts`
2. A `processing_jobs` row is created via `lib/processing/job.ts`
3. CSV is split into chunks and dispatched via `lib/processing/chunkedDispatch.ts`
4. Each chunk is processed by `app/api/process-csv-chunk/route.ts` → calls `scoreBatch()`
5. When all chunks complete, `app/api/process-csv-finalize/route.ts` runs:
   - Watchlist appearance sync
   - Customer summary refresh
   - Identity restitch (`lib/processing/restitchAuditIdentity.ts`)
   - Results email

---

## Supabase Conventions

- Table names: use constants from `lib/supabase/tables.ts` (`TABLES`, `STORAGE_BUCKETS`, `COLUMNS`)
- PostgREST filter strings: use `buildReviewableFilter()` from `lib/supabase/filters.ts`
- Server-side clients: `createServiceClient()` for service role, `createClient()` for user session, `createAdminClient()` for auth admin operations

---

## Environment Variables

Validated at startup via Zod schema in `lib/utils/env.ts`. All server-side code accesses env vars through the `env` object, not `process.env` directly. See `ENV_SETUP.md` for the full variable list.
