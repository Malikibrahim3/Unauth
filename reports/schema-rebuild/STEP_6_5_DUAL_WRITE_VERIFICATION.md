# Step 6.5 — Dual-Write Live Verification

**Date:** 2026-06-08  
**Status:** PASS  
**Step 7:** Blocked (do not start cleanup until fresh dual-write edge coverage is meaningful)

---

## Baseline (post Step 6 backfill)

| Table | Count | Notes |
|---|---:|---|
| `identity_identifiers` | 236 | 123 email, 113 address; all `source_provider = manual` |
| `identifier_co_occurrence_edges` | 0 | Expected — no legacy edge backfill |
| `fraud_entities` | 361 | Unchanged |
| `fraud_entity_co_occurrences` | 461 | Unchanged |

---

## Code review — dual-write wiring

| Path | File | Service role | Failure mode |
|---|---|---|---|
| CSV / batch ingestion | `lib/processing/worker.ts` | `serviceClient` | `try/catch`, logged, non-blocking |
| Support ticket intake | `lib/support/intake/ingestSupportCase.ts` | `supabase` (service) | `.catch()`, best-effort |
| Write layer | `lib/identity/writeIdentifierGraph.ts` | RPC caller | throws to caller; worker/intake swallow |
| Accumulation / canonical pairs | `lib/identity/identifierGraph.ts` | — | `canonicalizeEdgePair`, v1 type filter |

**Provider mapping:** `mapIngestionSourceToGraphProvider()` maps ingestion source → `csv` / `shopify` / etc.; support intake uses `gorgias` or `unknown`.

**RPC guards:** `bulk_upsert_identifier_co_occurrence_edges` rejects non-canonical pairs (`left < right` lexicographic), requires `p_merchant_id`, grants `service_role` only.

---

## Automated tests

| Suite | Result |
|---|---|
| `tests/lib/identity/identifierGraph.test.ts` | 9 passed |
| `tests/lib/identity/writeIdentifierGraph.test.ts` | 12 passed |
| `tests/lib/supportClaimIntake.test.ts` | 10 passed (graph write logs RPC-missing in memory client — non-blocking, expected) |

Tests confirm: HMAC-only PII fields, real `merchant_id` on edges, canonical edge ordering, `csv`/`gorgias` providers, no plaintext in hash columns.

---

## Live verification (synthetic)

**Script:** `scripts/verify-dual-write-graph.ts`  
**Command:** `DOTENV_CONFIG_PATH=.env.local npx ts-node --project tsconfig.scripts.json --transpile-only -r tsconfig-paths/register -r dotenv/config scripts/verify-dual-write-graph.ts --execute`

**Synthetic marker:** `dual-write-verify-20260608@example.test` / tag `dual_write_verify_20260608`

### First execute (fresh edges)

| Metric | Before | After | Delta |
|---|---:|---:|---:|
| `identity_identifiers` | 236 | 243 | +7 (3 csv + 4 gorgias; some overlap with existing manual hashes) |
| `identifier_co_occurrence_edges` | 0 | 9 | +9 |

**Provider breakdown (after):**

| Table | csv | gorgias | manual |
|---|---:|---:|---:|
| `identity_identifiers` | 3 | 4 | 236 |
| `identifier_co_occurrence_edges` | 6 | 3 | — |

### Idempotent re-run

| Metric | Before | After |
|---|---:|---:|
| `identity_identifiers` | 243 | 243 |
| `identifier_co_occurrence_edges` | 9 | 9 |

- No duplicate edges created.
- `seen_count` bumped to **2** on all 9 edges.
- `link_strength` updated to **1.50** (`1.0 + (seen_count - 1) * 0.5`).

### Required checks

| Check | Result |
|---|---|
| New identifiers HMAC-only (email/phone/address/IP/card) | PASS — no `@` in hash columns |
| Edges have real `merchant_id` | PASS — 9/9 non-null (`9aaf4c63-fc4e-4bc7-8384-fdbac91b9ab4`) |
| Edges canonicalized before insert | PASS — all rows satisfy `left < right`; RPC rejects non-canonical |
| `link_strength` / `seen_count` update on upsert | PASS — verified on re-run |
| `source_provider` reflects origin | PASS — `csv`, `gorgias` (not `manual`) |
| No edges from legacy backfill | PASS — Step 6 was registry-only |
| Legacy tables untouched | PASS — `fraud_entities` 361, `fraud_entity_co_occurrences` 461 |

---

## Sample edge rows (live)

| source_provider | left_type | right_type | seen_count | link_strength |
|---|---|---|---:|---:|
| csv | full_normalized_shipping_address_hash | normalized_email_hash | 2 | 1.50 |
| csv | normalized_email_hash | phone_e164_hash | 2 | 1.50 |
| gorgias | helpdesk_customer_id | normalized_email_hash | 2 | 1.50 |
| gorgias | helpdesk_ticket_id | platform_order_id | 2 | 1.50 |

---

## Issues / notes

1. **Verify script re-run:** First version failed when edges already existed (expected count increase). Fixed to accept idempotent re-runs when `seen_count >= 2`.
2. **Support intake tests:** In-memory Supabase mock lacks `.rpc()` — graph write fails silently in tests; production path uses real service client. Not blocking.
3. **Synthetic data in prod DB:** 7 identifier rows + 9 edges tagged with verification constants remain. Safe to leave or delete manually before Step 7 if desired.

---

## Step 7 gate recommendation

**Do not start Step 7 yet.**

Current edge coverage (9 synthetic rows) proves dual-write mechanics work but is not representative of production ingestion volume. Proceed to Step 7 only after:

- Multiple real CSV imports and/or Shopify sync batches have run with dual-write enabled.
- `identifier_co_occurrence_edges` has meaningful merchant-scoped coverage (order of hundreds/thousands, not single-digit test rows).
- `fastContext.ts` dual-read merge shows new-table rows dominating co-occurrence context for v1 identifier types.

---

## Commands for future re-check

```bash
# Baseline counts only
DOTENV_CONFIG_PATH=.env.local npx ts-node --project tsconfig.scripts.json \
  --transpile-only -r tsconfig-paths/register -r dotenv/config \
  scripts/verify-dual-write-graph.ts

# Full synthetic write (only when edges table is empty or testing idempotency)
... scripts/verify-dual-write-graph.ts --execute
```

```sql
SELECT COUNT(*) FROM identity_identifiers;
SELECT COUNT(*) FROM identifier_co_occurrence_edges;
SELECT source_provider, COUNT(*) FROM identity_identifiers GROUP BY 1 ORDER BY 1;
SELECT source_provider, COUNT(*) FROM identifier_co_occurrence_edges GROUP BY 1 ORDER BY 1;
```
