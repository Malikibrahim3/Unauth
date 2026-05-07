# Audit Pipeline Performance — Root-Cause Audit & Implementation Plan

**Date:** 2026-05-07
**Branch:** `claude/audit-implementation-doc-5bOIF`
**Symptom:** Audit job `50fc0444-…` ran for **>1 hour** end-to-end. Target: **< 3 minutes** (excluding Supabase free-tier ceilings).
**Status of prior fixes:** `UPLOAD_PIPELINE_AUDIT.md` (2026-05-03) addressed the polling-loop death, missing migrations, the per-row Supabase upserts, and the job-claim race. Those fixes hold. The remaining hour is caused by a **different class of problem** that only manifests at >10k-row scale. This document is additive to that audit, not a replacement.

---

## 1. What the logs actually tell us

Pulled directly from the run you pasted:

| Log line | What it really means |
|---|---|
| `[entityResolution] or(emails) failed: <Cloudflare 521 HTML>` | Supabase REST gateway returned an upstream-down page. Either PostgREST died/restarted, or our request hammered the pool until CF gave up. |
| `[entityResolution] or(emails) failed: Could not query the database for the schema cache. Retrying.` (×40+) | PostgREST reloaded its schema cache mid-flight. This happens when Postgres gets restarted **or** when too many parallel reqs hit a cold pool. |
| `[worker] bulk_upsert_co_occurrences RPC failed: upstream request timeout` | The HTTP edge gave up waiting (>60s). RPC is too big or too slow. |
| `[worker] bulk_upsert_fraud_entities RPC failed: canceling statement due to statement timeout` | Postgres killed the query at its own statement timeout (likely 30s). |
| `[entityResolution] bulk: 0 updated, 1592 created` then `2306 updated, 3776 created` then `2797 updated, 3390 created` | Entity resolution ran **three times** for the same job. Either we re-run per chunk *and* the run is split into 3 chunks, or there's a re-entry. |
| `GET /api/audit/.../progress 200 in 55s` (application-code: 50s) | The progress endpoint itself is doing 50 seconds of DB work per poll. |

**These are not independent failures.** They form a single pathology: entity resolution saturates the PostgREST connection pool → schema-cache thrash → RPC timeouts → fallback paths re-fire the same load → progress endpoint can't get a connection → polls hang for 50s → client retries → more load.

---

## 2. Root causes (ranked by wall-clock impact)

### RC-1 — Entity resolution is on the critical path and has no concurrency cap *(≈60% of runtime)*

**Files:** `lib/analysis/entityResolution.ts:463–491`, `lib/processing/worker.ts:610–640`

- `fetchProfilesByOverlap` chunks input into 100-element groups and fires every chunk via `Promise.all` with **no semaphore**. For a 15k-row batch with ~2k unique emails / 2k unique IPs / 500 cards, that's ~45 chunks fired in parallel **per identity column**, and three columns are themselves run in parallel (`Promise.all` at line 488).
- The `fastContext` semaphore (`MAX_CONCURRENT_FETCHES = 20`, `lib/engine/fastContext.ts:17–41`) does **not** protect this path.
- When the pipeline is processing 5 chunks concurrently, this multiplies to ~600 in-flight PostgREST requests. The pool has nowhere near that capacity → schema-cache reload → 521s.
- The `.or(emails.cs.["v"],…)` pattern over a JSONB array forces a sequential scan with `@>` per value; with the table at >10k profiles each query is 100–500 ms even uncontended.

### RC-2 — Entity resolution runs **after** the four parallel writers, serialising the pipeline *(structural)*

**File:** `lib/processing/worker.ts:610–640`

Today the worker does:
```
parallel { upsertAllBatches, writeFraudEntities, writeCoOccurrences, writeIdentityClusters }
→ then await processProfilesForBatch(...)
```
`processProfilesForBatch` is the slowest task. Putting it after the join means everything else finished and is waiting. It must either run in parallel with the writers or be removed from the per-batch critical path entirely.

### RC-3 — `bulk_upsert_*` RPC payloads exceed the statement-timeout budget *(≈25% of runtime)*

**Files:** `supabase/migrations/0023_bulk_write_rpcs.sql`, `lib/processing/worker.ts:874–954`

- `bulk_upsert_fraud_entities` is called with the full per-batch JSONB blob (~500 KB+ for 15k rows). It does an `INSERT … ON CONFLICT … DO UPDATE` over thousands of rows in one statement.
- On contention (RC-1 holding connections) it hits the 30s statement timeout. The fallback path re-issues the same writes in 500-row chunks **with no backoff**, which prolongs contention.

### RC-4 — `/api/audit/[runId]/progress` does an exact `count` on every poll *(≈10% of runtime, but masks the real progress)*

**File:** `app/api/audit/[runId]/progress/route.ts:43–49`

```ts
.from('audit_transactions')
.select('*', { count: 'exact', head: true })
.eq('job_id', runId)
.not('identity_confidence_grade', 'is', null);
```

`count: 'exact'` forces a full index scan (or worse, seq scan) under concurrent inserts. With the client polling every 3 s and inserts still flowing, each call sits behind row locks. We saw 50 s response times. While the count is locked, the client retries → more polls queue up → application thread starvation.

### RC-5 — No retry/backoff anywhere; failures amplify load

- `entityResolution.ts:478–480` swallows errors and returns `[]`, silently producing wrong results **and** allowing the next chunk to fire immediately into the same broken pool.
- The RPC fallback (`worker.ts:887–954`) immediately re-tries via direct upsert with no jitter.
- The Supabase JS client's internal "Retrying." behaviour kicks in on top, multiplying the request count again.

### RC-6 — Entity resolution appears to run multiple times per job

The three "bulk: … created" log lines for the same job ID strongly suggest `processProfilesForBatch` is being invoked **once per batch** rather than once over the full job (or worse, re-entering on retry). Worth confirming when implementing — if true, deduplicating across batches is a free win.

---

## 3. Why the previous fixes didn't solve it

`UPLOAD_PIPELINE_AUDIT.md` focused on **transport-layer correctness** (polling resilience, claim-race, batched upserts, missing migrations). All of those were genuine bugs. None of them touched:
- the **fan-out shape** of entity resolution (RC-1, RC-2),
- the **payload size** of the bulk RPCs (RC-3),
- the **count-on-poll** in the progress endpoint (RC-4),
- the **lack of backoff** anywhere (RC-5).

So at small-scale the fixes worked; at 15k+ rows the new bottlenecks dominate.

---

## 4. Implementation plan

Ordered so each step yields a measurable speedup independently. **Do not bundle.** Land each, re-run the 15k-row job, record wall-clock.

### Step 1 — Cap entity-resolution concurrency *(expected: hour → ~15 min)*

**File:** `lib/analysis/entityResolution.ts`

1. Lift the `MAX_CONCURRENT_FETCHES` semaphore out of `fastContext.ts` into a shared module (e.g. `lib/engine/dbSemaphore.ts`) exporting `acquire()` / `release()` or a `withSlot(fn)` helper.
2. Wrap every `fetchProfilesByOverlap` chunk request in `withSlot(...)`. Initial cap: **8** global concurrent overlap requests.
3. Change line 478–480: on error, **throw** rather than return `[]`. Caller (`processProfilesForBatch`) wraps in try/catch with one retry after 1 s jittered backoff. Silent empty results were producing wrong cluster assignments.

Acceptance: a single 15k-row job never exceeds 8 concurrent overlap requests. No schema-cache errors.

### Step 2 — Move entity resolution off the per-batch critical path *(expected: 15 min → 6–8 min)*

**File:** `lib/processing/worker.ts:610–640`

Two options — pick one:

- **(a, preferred)** Run `processProfilesForBatch` **in parallel with** the four writers in the same `Promise.all`. It only depends on the in-memory `scored` rows + `txIdMap`; both are available before the writers start.
- **(b)** Defer entity resolution to a single post-job pass over `audit_transactions` once all batches finish. Eliminates the per-batch fan-out entirely. Larger refactor; do this if (a) still isn't fast enough.

Acceptance: writers + entity resolution finish within max(writers, ER), not sum.

### Step 3 — Shrink the bulk RPC payloads & add backoff *(expected: 6–8 min → 4–5 min)*

**Files:** `lib/processing/worker.ts:874–954`, `supabase/migrations/0023_bulk_write_rpcs.sql`

1. Cap the JSONB payload sent to `bulk_upsert_fraud_entities` / `bulk_upsert_co_occurrences` at **2,000 rows per call**. Iterate.
2. Wrap each RPC call in retry-with-exponential-backoff: 500 ms → 1 s → 2 s → 4 s, max 4 attempts, with jitter. Fail the batch (don't fall through to direct upsert) on final failure — surface as a job-level error.
3. In the SQL function, ensure the upsert uses a single statement per call (it does) and that the conflict target columns are indexed (verify against `0050_audit_transactions_performance_indexes.sql` and create equivalents for `fraud_entities`, `co_occurrences`, `fraud_identity_clusters` if missing).

Acceptance: zero `statement timeout` and zero `upstream request timeout` log lines on a 15k-row job.

### Step 4 — Make `/api/audit/[runId]/progress` cheap *(expected: progress responses < 200 ms)*

**File:** `app/api/audit/[runId]/progress/route.ts:43–49`

1. Replace `count: 'exact'` with `count: 'planned'` (Postgres planner estimate) for the in-flight case.
2. Only compute the exact count **once**, when `job.status === 'completed'`, and cache it on the `audit_jobs` row (`flagged_count` column — add migration if absent). Subsequent polls read it from the job row.
3. While job is still running, return progress from the `audit_jobs` row's existing `progress`, `processed_rows`, `total_rows` columns — never query `audit_transactions`.
4. Bump client poll interval from 3 s to 5 s (`components/upload/UploadClient.tsx`). Lower bound on perceived latency is fine; we save 40% of the request volume.

Acceptance: progress endpoint p95 < 300 ms throughout a job.

### Step 5 — Verify entity resolution is single-pass per job *(quick check, possibly free win)*

Add a `console.time('entityResolution:job=' + jobId)` around the call site in `worker.ts`. If the timer fires more than once per job, dedupe at the worker level — collect all batches' `scored` arrays, run resolution once at end-of-job. This may be subsumed by Step 2(b).

### Step 6 — Indexes & connection-pool sanity

1. Confirm `customer_profiles` has GIN indexes on `emails`, `ips`, `card_last4s` (JSONB). Without them every overlap chunk seq-scans the table. Add migration if missing:
   ```sql
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_profiles_emails_gin ON customer_profiles USING gin (emails);
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_profiles_ips_gin ON customer_profiles USING gin (ips);
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_profiles_card_last4s_gin ON customer_profiles USING gin (card_last4s);
   ```
2. Confirm we're using the **pooler** (port 6543, transaction mode) for the service client used by the worker, not the direct connection. Check the env var `SUPABASE_DB_URL` / wherever `serviceClient` is constructed.

Acceptance: `EXPLAIN` on `select … from customer_profiles where emails @> '["x"]'` shows a Bitmap Index Scan, not Seq Scan.

---

## 5. Validation protocol

After each step, run the same 15k-row CSV (`friendly_fraud_blind_test_2000.csv` scaled or the actual job that took an hour). Record:

| Metric | Baseline (today) | Step 1 | Step 2 | Step 3 | Step 4 | Target |
|---|---|---|---|---|---|---|
| End-to-end wall clock | >60 min | | | | | < 3 min |
| Schema-cache errors | 40+ | | | | | 0 |
| RPC timeouts | 2+ | | | | | 0 |
| Progress p95 | 50 s | | | | | < 300 ms |
| Peak in-flight DB reqs | 100+ | | | | | ≤ 8 |

If after Step 3 we're still > 5 min, the next likely culprit is the upserts inside `upsertAllBatches` themselves — profile that before guessing.

---

## 6. Risks & non-goals

- **Free-tier limits:** Supabase free tier caps connections at ~60. Even with all fixes, a job will be limited by Postgres CPU/IO on the free instance. The < 3 min target assumes paid tier or local Postgres for benchmarking.
- **Behaviour change in Step 1.3:** Throwing on overlap errors instead of returning `[]` will surface previously-hidden failures. Expect a few job failures the first day; investigate, don't suppress.
- **Step 4.1 (`count: 'planned'`)** returns an estimate, not exact. Verify the UI tolerates ±5% drift on the in-flight progress number.
- **Not in scope here:** scoring algorithm changes, schema redesign, moving the worker off Next.js. Those are larger projects; the fixes above should hit the < 3 min target without them.
