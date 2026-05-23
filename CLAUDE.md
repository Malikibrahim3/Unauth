# CLAUDE.md — Contributor Guide for AI Assistants

## Ground Rules

1. **Do not change any scoring formula, weighting logic, matching algorithm, or cluster-building logic** unless explicitly instructed.
2. **Do not use `as any`** anywhere in production code. Fix the type properly.
3. **Do not add `// eslint-disable` comments.** Fix the underlying issue instead.
4. **Work through refactoring tasks sequentially**; complete each group before starting the next.
5. Files previously marked "frozen" may be modified when the task explicitly authorises it.

---

## Single Source of Truth (SSOT) Rules

### Constants

| Constant | Canonical file | Notes |
|---|---|---|
| `SIGNAL_WEIGHTS` | `lib/engine/weights.ts` | Behavioral fraud signal weights |
| `RISK_TIER_THRESHOLDS` | `lib/engine/weights.ts` | medium/high/critical |
| `FLAG_THRESHOLD` | `lib/engine/weights.ts` | Default 44; reads from `env.FLAG_THRESHOLD` |
| `IDENTITY_SIGNAL_WEIGHTS` | `lib/engine/weights.ts` | Canonical: device:35, card:30, phone:20, email:12, ip:8, shipping_address:15 |
| `CONFIDENCE_THRESHOLDS` | `lib/engine/weights.ts` | DEFINITE:85, PROBABLE:65, POSSIBLE:45 |
| `GRADE_ORDER` | `lib/engine/weights.ts` | definite:4, probable:3, possible:2, weak:1 |
| `ESTIMATED_CHARGEBACK_RATE` | `lib/engine/weights.ts` | 0.42 |
| `K_ANONYMITY_MIN` | `lib/engine/weights.ts` | 3 |
| `CE3_PRIOR_ORDER_WINDOW_DAYS` | `lib/engine/weights.ts` | 120 |
| `ADDRESS_TOKEN_OVERLAP_THRESHOLD` | `lib/engine/weights.ts` | 0.6 |
| Table names | `lib/supabase/tables.ts` | `TABLES`, `STORAGE_BUCKETS`, `COLUMNS` |
| PostgREST filters | `lib/supabase/filters.ts` | `buildReviewableFilter()` |
| Grade UI styles | `lib/utils/confidenceStyles.ts` | `GRADE_COLOURS`, `GRADE_LABELS` |
| Risk level logic | `lib/utils/riskUtils.ts` | `scoreToRiskLevel`, `RiskLevel` |

### Types

| Type | Canonical file |
|---|---|
| `ConfidenceGrade` (`'definite'\|'probable'\|'possible'\|'weak'`) | `lib/engine/weights.ts` |
| `ConfidenceLetterGrade` (`'A'\|'B'\|'C'\|'D'`) | `lib/engine/weights.ts` |
| `IdentitySignalName` | `lib/engine/types.ts` |

### Functions

| Function | Canonical file |
|---|---|
| `scoreToGrade(score)` | `lib/engine/weights.ts` |
| `gradeToLetter(grade)` | `lib/engine/weights.ts` |
| `normaliseEmail` | `lib/identity/normalise.ts` |
| `normaliseAddress` | `lib/identity/normalise.ts` |
| `normaliseAddressTokens` | `lib/identity/normalise.ts` |
| `normalisePhone` | `lib/identity/hash.ts` (re-exported from normalise) |
| `hashIdentifier` | `lib/identity/hash.ts` |
| Identity cluster helpers | `lib/engine/identityHelpers.ts` |

---

## Signal Weights — Internal vs Canonical

`lib/scorer.ts` has a constant `SCORER_INTERNAL_SIGNAL_WEIGHTS` with values calibrated for the `scoreIdentityFromSignals()` function's specific point-accumulation system. These weights have different values from `IDENTITY_SIGNAL_WEIGHTS` in `weights.ts` because they operate on a different scoring scale. **Do not replace with canonical weights without explicit instruction and recalibration.**

## fastScore.ts Thresholds — Pending Calibration

`lib/engine/fastScore.ts` uses thresholds `75/50/25` for `confidenceGrade` assignment. These operate on a **weighted composite fraud signal score**, not on the same point-accumulation scale as `scorer.ts`. The canonical `CONFIDENCE_THRESHOLDS` (85/65/45) cannot be applied directly. Before changing these thresholds, you must trace the full score distribution and determine the equivalent thresholds on the fastScore scale. **Do not change fastScore.ts thresholds without explicit instruction.**

---

## Scripts and Synthetic Lab — Intentional Isolation

Files under `scripts/`, `scripts/tune/`, `scripts/eval/`, and `synthetic-lab/` are standalone tools that do not run in production. They may have their own local copies of normalisation and scoring functions. This is intentional — they should not import from the production `lib/` stack as they may run against different data or have different calibration needs. Do not "fix" these by importing from `lib/` without understanding the script's purpose.

---

## Environment Variables

All env vars used in server-side code must be accessed via `env` from `lib/utils/env.ts`, not `process.env` directly. Exception: test files, scripts, and `NEXT_PUBLIC_*` vars in route files that pre-date the Zod schema.

The `env` object is validated at startup via Zod. Add new vars to the schema in `lib/utils/env.ts`.

---

## Scoring Paths

There are two independent scoring paths. Do not conflate them.

1. **`lib/engine/fastScore.ts` → `scoreBatch()`**: Used by the CSV processing pipeline. Takes pre-built `EnrichedOrder[]`. Outputs `ScoredResult`.
2. **`lib/scorer.ts` → `scoreIdentityFromSignals()`**: Used by the identity resolution layer. Takes identity signals. Outputs `ScoredCluster`.

---

## ESLint Rules (Phase 4)

- `no-restricted-imports`: `scoreToGrade` must come from `@/lib/engine/weights`, not `@/lib/utils/riskStyles`.
- `no-restricted-imports`: `CONFIDENCE_THRESHOLDS` must come from `@/lib/engine/weights`, not `@/lib/utils/confidenceStyles`.
