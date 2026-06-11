# Step 6.6 — Identity Graph Coverage Observability

**Date:** 2026-06-08  
**Status:** Complete  
**Step 7:** Blocked (automated criteria failing)

---

## Deliverables

| Item | Location |
|---|---|
| Service-role RPC | `get_identity_graph_coverage(text[])` — migration `20260608213000_identity_graph_coverage_observability.sql` |
| TypeScript helper | `lib/identity/identityGraphCoverage.ts` |
| Report script | `scripts/identity-graph-coverage.ts` |
| Unit tests | `tests/lib/identity/identityGraphCoverage.test.ts` (5 passing) |

**Run:**

```bash
DOTENV_CONFIG_PATH=.env.local npx ts-node --project tsconfig.scripts.json \
  --transpile-only -r tsconfig-paths/register -r dotenv/config \
  scripts/identity-graph-coverage.ts

# JSON output
... scripts/identity-graph-coverage.ts --json
```

**Security:** RPC is `SECURITY DEFINER`, `REVOKE ALL FROM PUBLIC`, `GRANT EXECUTE TO service_role` only. No plaintext PII — aggregates and UUID `merchant_id` only.

---

## Live coverage snapshot (2026-06-08)

### Registry (`identity_identifiers`)

| Metric | Value |
|---|---:|
| Total | 243 |
| `normalized_email_hash` | 124 |
| `full_normalized_shipping_address_hash` | 114 |
| `phone_e164_hash` | 1 |
| `platform_order_id` | 2 |
| `helpdesk_customer_id` | 1 |
| `helpdesk_ticket_id` | 1 |

**By source_provider:** manual 236 · csv 3 · gorgias 4  
**Synthetic raw identifiers:** 4 (prefix `dual_write_verify_20260608`)  
**Plaintext PII violations:** 0

### Edges (`identifier_co_occurrence_edges`)

| Metric | Value |
|---|---:|
| Total | 9 |
| Synthetic (prefix-detected) | 6 |
| Non-synthetic (hash-only pairs) | 3 |
| Distinct merchants | 1 |
| `seen_count > 1` | 9 |
| `link_strength` avg / max | 2.00 / 2.00 |
| Activity 24h / 7d / 30d | 9 / 9 / 9 |

**By source_provider:** csv 6 · gorgias 3  
**Real csv edges (non-prefix):** 3  
**Real support/commerce edges:** 0  

**Cross-merchant tuples:** 0 / 9 edge tuples

### Legacy comparison

| Table | Count |
|---|---:|
| `fraud_entities` | 361 |
| `fraud_entity_co_occurrences` | 461 |

New/legacy edge ratio: **1.95%** (9 / 461)

---

## Synthetic detection note

Hashed PII cannot be reversed. Detection uses **raw platform/helpdesk ID prefixes** only (`dual_write_verify_20260608`).

Three csv verification edges (email↔phone, email↔address, address↔phone) contain only HMAC hashes and appear as “real csv” in automated stats. Treat all 9 current edges as verification artifacts until production imports run.

---

## Step 7 readiness checklist

| # | Criterion | Status | Detail |
|---|---|---|---|
| 1 | Meaningful real (non-synthetic) edge data | **FAIL** | 3 hash-only edges; need ≥100 real edges and ≥95% non-synthetic |
| 2 | Real CSV/import path edges | **PASS*** | 3 hash-only csv edges (*verification artifacts) |
| 3 | Real support/helpdesk path edges | **FAIL** | 0 non-synthetic gorgias/commerce edges |
| 4 | fastContext.ts parity on sampled profiles | **MANUAL** | Compare dual-read merge before legacy removal |
| 5 | Legacy dependency low enough | **FAIL** | 1.95% new/legacy ratio; need ≥10% |
| 6 | No plaintext PII in new graph | **PASS** | 0 violations |
| 7 | No RLS/security regression | **MANUAL** | Confirm service_role-only on graph tables + RPC |

**Verdict:** Step 7 remains **blocked**. Phase 2 is functionally complete except legacy cleanup.

---

## Thresholds (configurable in `identityGraphCoverage.ts`)

| Constant | Default |
|---|---:|
| `STEP7_MIN_REAL_EDGES` | 100 |
| `STEP7_MIN_REAL_EDGE_SHARE` | 0.95 |
| `STEP7_MIN_NEW_TO_LEGACY_EDGE_RATIO` | 0.10 |

Adjust when production volume patterns are known.

---

## When to re-run

- After each production CSV import or Shopify sync batch
- After helpdesk webhook intake (Gorgias/Freshdesk/Zendesk)
- Before any Step 7 cleanup discussion

When automated criteria pass **and** manual fastContext/RLS checks complete, Step 7 can be scheduled.
