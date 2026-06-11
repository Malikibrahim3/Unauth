# Unauth Schema Rebuild — Phase 2 Implementation Spec

**Status:** Approved. Phase 1 audit complete. RLS hotfix applied and verified live.

**Prerequisite verification (2026-06-08):**
- Migration `lockdown_network_graph_rls` recorded in `supabase_migrations.schema_migrations`
- Live policies: `fraud_entities_service_only`, `co_occurrences_service_only`, `identity_clusters_service_only` — all `service_role` only
- `authenticated` and `anon` have `SELECT = false` on all three tables
- Production paths use service-role client (`worker.ts`, `cross-merchant/route.ts`) — unaffected

---

## Hard implementation order

Execute steps in sequence. **Do not skip or reorder.**

```
Step 1  New tables + RLS + indexes
Step 2  Dual-write ingestion mappers (legacy tables STILL written)
Step 3  Compatibility views
Step 4  Migrate callers away from old tables
Step 5  fastContext.ts migrated and verified        ← HARD GATE
Step 6  Backfill / re-hash runs                      ← BLOCKED until Step 5 complete
Step 7  Legacy cleanup (stop dual-write, drop deprecated tables/views)
```

### Step 5 → Step 6 hard dependency

**The backfill/re-hash step MUST NOT run until `fastContext.ts` is migrated and verified.**

Reason: legacy `fraud_entity_co_occurrences` stores normalised plaintext values; new `identifier_co_occurrence_edges` stores HMAC hashes. A SQL compatibility view cannot bridge plaintext queries to hashed storage. The migration lives in the query layer — `fastContext.ts` must hash lookup inputs before querying new tables.

Verification gate for Step 5:
- [x] `fastContext.ts` queries new tables with HMAC-hashed keys
- [x] Unit/integration tests pass for CSV scoring path
- [x] Dual-read fallback to legacy tables still works during transition
- [x] Grep confirms no remaining plaintext-value lookups against new edge table

Only after all four checks pass may Step 6 (backfill) begin.

---

## Migration strategy

**Dual-write with compatibility views.** No big-bang cutover.

- Legacy tables remain written until Step 7
- New tables receive parallel writes from Step 2 onward
- Compatibility views (`v_audit_transactions_legacy`, etc.) bridge old callers during Step 4
- 150+ call sites migrate incrementally; grep verification before legacy cleanup

---

## Core new tables (Step 1)

### `identity_identifiers`

Pseudonymous identifier registry. HMAC hashes only — no raw PII.

```sql
-- identifier_type enum (v1 write paths only):
--   normalized_email_hash
--   phone_e164_hash
--   full_normalized_shipping_address_hash
--   full_normalized_billing_address_hash
--   platform_customer_id
--   helpdesk_customer_id
--   platform_order_id
--   helpdesk_ticket_id
-- Address hash variants (postcode+house, etc.) — NOT in v1; add when normalisation functions exist

UNIQUE (identifier_type, identifier_hash)
```

### `identifier_co_occurrence_edges`

Core identity graph. See constraints below.

### Deprecate (Step 7, not Step 1)

- `global_identity_clusters`
- `global_identity_cluster_attributes`

Add deprecation comments in Step 1 migration; drop in Step 7 after data migration.

---

## CONSTRAINT: `link_strength` calculation

**This is the canonical rule. Do not invent alternatives or hardcode unrelated values.**

On **first observation** of a merchant-scoped edge `(merchant_id, left_type, left_hash, right_type, right_hash)`:

```
seen_count    = 1
link_strength = 1.0
```

On **subsequent upsert** of the same tuple at the same merchant:

```
seen_count    = seen_count + 1
link_strength = 1.0 + (seen_count - 1) * 0.5
```

Examples: seen_count 1 → 1.0, 2 → 1.5, 3 → 2.0, 4 → 2.5, 10 → 5.5

**No ceiling in v1.** Review when real merchant data exists.

`link_strength` is a confidence weight for identity linking — **not a risk score**. It does not feed scoring formulas in `fastScore.ts` or `scorer.ts`.

### Promotion from `identity_link_candidates`

When a candidate is promoted to a confirmed edge (see promotion rules below), use the candidate's `link_confidence` as the **initial** `link_strength` on first write, then apply the increment rule on subsequent observations.

---

## CONSTRAINT: `merchant_id` on edges

**One row per merchant per observation.** Not one global row with a boolean flag.

When the same `(left_identifier_type, left_identifier_hash, right_identifier_type, right_identifier_hash)` pair is observed at merchant A and merchant B:

- Row 1: `merchant_id = A`, `seen_count`, `link_strength` tracked independently
- Row 2: `merchant_id = B`, `seen_count`, `link_strength` tracked independently

**`is_cross_merchant` is NOT a stored column.** It is derived in a view:

```sql
-- v_identifier_edges_cross_merchant (regular view, not materialized)
SELECT
  left_identifier_type,
  left_identifier_hash,
  right_identifier_type,
  right_identifier_hash,
  COUNT(DISTINCT merchant_id) AS participating_merchant_count,
  COUNT(DISTINCT merchant_id) >= 2 AS is_cross_merchant  -- derived boolean
FROM identifier_co_occurrence_edges
GROUP BY 1, 2, 3, 4;
```

Cross-merchant signal = same `(left_type, left_hash, right_type, right_hash)` tuple appearing across **multiple distinct `merchant_id` values**. Aggregation thresholds (k-anonymity ≥ 3) applied at query/service layer, not stored on edge rows.

---

## CONSTRAINT: `identity_link_candidates` promotion path

Keep `identity_link_candidates` as a **separate candidate queue**. Do not collapse into edge table prematurely.

```
Gorgias/Freshdesk intake
  → upsert identity_link_candidates (best-effort, no threshold)

Promotion to identifier_co_occurrence_edges when ALL true:
  1. link_confidence >= 0.8
  2. participating_merchant_count >= K_ANONYMITY_MIN (3) — from lib/engine/weights.ts
  3. No existing confirmed edge for same tuple at promoting merchant

Candidates never surface in widget/dashboard/evidence queries directly.
Only promoted edges feed network intelligence views.
```

---

## v1 edge types and write paths

Write at ingestion time unless noted. Atomic upsert of both identifiers + edge in one transaction.

| Edge | Trigger | Left | Right |
|------|---------|------|-------|
| email ↔ platform_customer_id | Order webhook / CSV | `hash(normaliseEmail(email))` | platform customer ID |
| email ↔ phone | Order webhook / CSV | email hash | `hash(normalisePhone(phone))` |
| email ↔ shipping_address | Order webhook / CSV | email hash | `hash(normaliseAddress(shipping))` |
| billing ↔ shipping | Order webhook / CSV | billing hash | shipping hash |
| phone ↔ shipping | Order webhook / CSV | phone hash | shipping hash |
| helpdesk_customer_id ↔ email | Gorgias ticket webhook | ticket customer ID | email hash |
| helpdesk_ticket_id ↔ platform_order_id | Ticket linked to order | ticket ID | platform order ID |
| platform_order_id ↔ email | Order webhook / CSV | order ID | email hash |

**Excluded from v1 edge writes:** IP, device, card_last4, name-derived, address variants (postcode+house etc.)

**Address hash variants:** phased after core edge table. Ship core table first; add variant edges when `lib/identity/normalise.ts` implements variant functions.

---

## Dual-write scope (Step 2)

| Legacy table | New target | Dual-write until |
|-------------|------------|------------------|
| `fraud_entities` | `identity_identifiers` | Step 7 |
| `fraud_entity_co_occurrences` | `identifier_co_occurrence_edges` | Step 7 |
| `audit_transactions` (order facts) | `platform_order_events` + `order_scoring_results` | Step 7 |
| `shopify_order_signals` | `platform_order_events` | Step 7 |
| `merchant_identities` | `identity_identifiers` + `merchant_identifier_mappings` | Step 7 |
| `customer_profiles` | `merchant_identity_profiles` | Step 7 |
| `global_identity_attributes/appearances` | `identity_identifiers` + observations | Step 7 |

Legacy tables continue receiving writes through Step 6. Step 7 stops legacy writes only after caller migration verified.

---

## fastContext.ts migration (Step 5 detail)

**Session scope:** TypeScript changes to `lib/engine/fastContext.ts` only — no schema changes, no migrations. Output: parallel dual-read, hash-based lookup against new tables, result merge, tests confirming new-table rows are returned when present. Old table reads stay in place; removal is Step 7.

### Pre-flight (confirmed — do not re-discover at runtime)

| Check | Status |
|-------|--------|
| HMAC key | Single SSOT: `env.IDENTITY_SALT` via `hashIdentifier()` in `lib/identity/hash.ts`. No `IDENTIFIER_HMAC_SECRET`. No hardcoded identity HMAC in production `lib/`. |
| Service role | `buildFastContext` receives injected client. Production callers (`worker.ts`, `lookup/quick-score`) pass `createServiceClient()`. New tables are service-role-only — authenticated client = silent zero rows. |
| Legacy entity types | `email`, `ip`, `address`, `card_last4` only. **No phone** in `fraud_entity_co_occurrences`. Phone is v1-new (`identifier_co_occurrence_edges` only). |
| Legacy storage format | `fraud_entities.entity_value` is **already normalised plaintext** (`writeFraudEntities` called `normaliseEmail()` etc. before storage). Do **not** re-normalise before hashing. |

### Legacy → v1 type mapping (merge function only)

```typescript
// email → normalized_email_hash: hash entity_value directly
hashIdentifier(legacyRow.entity_value)

// address → full_normalized_shipping_address_hash: hash entity_value directly
hashIdentifier(legacyRow.entity_value)

// ip, card_last4 → no v1 mapping, pass through as legacy-only, skip dedup
// No phone rows exist in legacy table — no phone mapping needed
```

**Do not implement `normaliseLegacyValue()`.** Double-normalising would produce a different hash and break dedup. `hashIdentifier(legacyRow.entity_value)` is sufficient.

### Dual-read merge strategy (pre-backfill — canonical)

```
1. Fetch legacy rows (normalised plaintext), new rows (hashed) in parallel
2. For legacy rows:
   - email type → normalized_email_hash, hash entity_value with hashIdentifier()
   - address type → full_normalized_shipping_address_hash, hash entity_value with hashIdentifier()
   - ip / card_last4 → no v1 mapping, include as legacy-only, skip dedup
   - No phone rows exist in legacy table
3. Canonicalize each legacy pair after hashing
4. Build dedup map keyed on canonical (left_type, left_hash, right_type, right_hash)
5. Seed map with new-table rows (authoritative)
6. Add legacy rows only where key not already present
```

**Not sequential.** Fire legacy and new queries in the same `Promise.all` batch as existing reads. Sequential fallback-on-miss adds full second-query latency on every miss — unacceptable on the widget render critical path.

### Lookup keys for new-table queries

Use hash values already on `NormalisedOrder`: `order.emailHash`, `order.phoneHash`, `order.addressHash`, `order.billingAddressHash`. Same values written by `writeIdentifierGraph.ts` via `normaliseRow()`.

After backfill completes and dual-read shows zero legacy-only hits, remove legacy fallback (Step 7).

### Step 5 session constraints (applied)

- **Output type is source-agnostic** — merged rows use legacy `CoOccurrence` shape; no `source` field; return signature unchanged.
- **Tests cover pre-backfill reality:** new-table-only, legacy-only, both-present prefers new, ip/card legacy-only pass-through.

### Step 6 scope (locked — Option B) ✅ APPLIED 2026-06-08

**Executed:** `scripts/backfill-identity-identifiers.ts --execute` (twice — idempotent rerun verified)

**Before:** `identity_identifiers` = 0  
**After:** `identity_identifiers` = 236 (`normalized_email_hash`: 123, `full_normalized_shipping_address_hash`: 113, all `source_provider`: manual)  
**Legacy unchanged:** `fraud_entities` = 361, `fraud_entity_co_occurrences` = 461

**Decision:** Do **not** backfill `fraud_entity_co_occurrences` → `identifier_co_occurrence_edges`. Legacy edges continue to be served by `fastContext.ts` dual-read at query time. Merchant-scoped edges accumulate via dual-write going forward.

**Why (live diagnostics 2026-06-08):**

| Metric | Value |
|--------|-------|
| Total `fraud_entity_co_occurrences` rows | **461** |
| Distinct `entity_a_value` | **249** |
| Distinct `entity_b_value` | **248** |
| Join fan-out (`audit_transactions` email match, user's query) | **94** rows |
| Distinct co-occurrence rows attributable via email → `audit_transactions.merchant_id` | **31 / 461 (6.7%)** |
| Distinct co rows via address → `audit_transactions.shipping_address` | **0 (0%)** — normalisation mismatch |
| Distinct co rows via `customer_profile_identities` (email) | **1 / 461** |
| Attributable rows with **multi-merchant ambiguity** (email join) | **12 / 31** |

**Structural blocker:** `identifier_co_occurrence_edges.merchant_id NOT NULL`; `fraud_entity_co_occurrences` has no `merchant_id`. No reliable join path recovers merchant attribution at scale. Alternative paths (`global_identity_appearances`) store attribute IDs, not co-occurrence entity plaintext — no direct join.

**Pair type breakdown (all 461 rows involve ip or card_last4 except 124 address↔email):**

| entity_a | entity_b | count |
|----------|----------|------:|
| address | email | 124 |
| email | ip | 74 |
| card_last4 | email | 73 |
| address | ip | 64 |
| address | card_last4 | 63 |
| card_last4 | ip | 63 |

337 rows have no v1 identifier mapping (ip/card). Even the 124 email↔address rows lack reliable merchant_id attribution.

#### What Step 6 backfills

**Only `fraud_entities` → `identity_identifiers`** (registry — no `merchant_id` required).

- Re-hash with `hashIdentifier(entity_value)` directly — **no second normalisation** (same rule as Step 5 merge)
- Map legacy types: `email` → `normalized_email_hash`, `address` → `full_normalized_shipping_address_hash`
- **Skip entirely:** `ip`, `card_last4` (no v1 identifier type mapping — same as merge function)
- **Skip entirely:** `fraud_entity_co_occurrences` edge migration (Option B)

#### Implementation constraints

- **Standalone data script, NOT a schema migration.** No `supabase db push`, no MCP `apply_migration`, no DDL. Batching, progress logging, idempotent `ON CONFLICT` upsert. Requires explicit `--execute` flag to write; default is dry-run.
- **Read-only on legacy graph.** Must NOT modify, delete, or "clean up" `fraud_entities` or `fraud_entity_co_occurrences`. Legacy rows remain required at runtime via `fastContext.ts` dual-read.
- **No edge backfill.** Do NOT write to `identifier_co_occurrence_edges`. Do NOT infer merchant IDs.
- **`source_provider`:** use `manual` for backfill rows — closest allowed value because `legacy_backfill` is not in the CHECK constraint. These are not manually entered identifiers; do not alter the CHECK for this backfill. Existing dual-write providers are preserved on conflict.
- **`successful_order_scope`:** not applicable to `identity_identifiers` (no such column). Apply `claim_adjacent_only` only if Step 6 writes network-scope metadata elsewhere.
- Use direct upsert with timestamp merge (earliest `first_seen_at`, latest `last_seen_at`) — not the bulk RPC, which does not preserve legacy timestamps.

**Script:** `scripts/backfill-identity-identifiers.ts`  
**Logic:** `lib/identity/backfillFraudEntities.ts`  
**Tests:** `tests/lib/backfillFraudEntities.test.ts`

---

## RLS pattern

### Merchant-scoped (RLS by merchant_id)

`processing_jobs`, `order_scoring_results`, `merchant_identity_profiles`, `merchant_claims`, `evidence_packages`, billing tables, etc.

Use merchant_members-aware policy:
```sql
merchant_id IN (
  SELECT id FROM merchants WHERE user_id = auth.uid()
  UNION
  SELECT merchant_id FROM merchant_members
  WHERE user_id = auth.uid() AND invite_status = 'active'
)
```

Fix broken policies on: `evidence_packages`, `customer_profiles`, `customer_activity_log`, `csv_upload_queue`

### Network-level (service-role only)

`identity_identifiers`, `identifier_co_occurrence_edges`, network views, `identity_link_candidates`

Never queryable by merchant authenticated client. All network surfaces go through API routes with k-anonymity + aggregation thresholds.

**No plan-tier logic in RLS or schema.**

---

## Views (regular only — no materialized views in v1)

### Step 3 scope (applied)

| View | Purpose | Access |
|------|---------|--------|
| `v_identifier_edges_cross_merchant` | Derives `is_cross_merchant` when same edge tuple appears across ≥2 `merchant_id` values | service_role only |
| `v_audit_transactions_legacy` | Structural shim over `audit_transactions` for Step 4 caller migration | inherits `audit_transactions` RLS via `SECURITY INVOKER` — **no REVOKE** until end of Step 4 |
| `v_time_to_claim_buckets` | Bucket enum from time-to-claim days | service_role only |

**`v_audit_transactions_legacy` RLS note:** Intentionally no `REVOKE` from `authenticated` during Step 4 migration — revoking would break existing callers before they migrate. Same security posture as querying `audit_transactions` directly via `SECURITY INVOKER`. **Required at end of Step 4:** add `REVOKE ALL ON v_audit_transactions_legacy FROM anon, authenticated` once all callers are migrated off the shim.

### Step 4 scope (in progress)

**Required (Step 4a — done):**
- [x] Add `order_claim_context.time_to_claim_days` column
- [x] Write `time_to_claim_days` at claim ingestion (`commerceSignals.ts` → `store.ts`)
- [x] Update `v_time_to_claim_buckets` to `COALESCE(time_to_claim_days, days_since_delivery_at_claim)` — **required view update, not optional**
- [x] Add `VIEWS` constants to `lib/supabase/tables.ts`

**Remaining (Step 4b — caller migration):**
- [x] Fix broken RLS on `evidence_packages`, `customer_profiles`, `customer_activity_log`, `csv_upload_queue` (+ `customer_profile_audit_appearances`)
- [ ] Migrate read/write callers from `audit_transactions` toward `v_audit_transactions_legacy` / future split tables (incremental grep verification — most paths already use service_role)
- [ ] **End of Step 4:** REVOKE on `v_audit_transactions_legacy` after caller migration verified

**Do NOT start Step 5 (`fastContext.ts` dual-read) in the same session as Step 4b unless explicitly approved.**

### Deferred views (after Step 4 caller migration)

- `v_merchant_identity_store_history`
- `v_network_cluster_intelligence` — must aggregate `MIN(first_seen_at)` / `MAX(last_seen_at)` across merchants from `identifier_co_occurrence_edges` for `recent_network_activity_window` (not present on `v_identifier_edges_cross_merchant` today)
- `v_network_identifier_reach`

### Later steps

---

## Fields intentionally excluded from v1

- Device/browser/IP fingerprint columns (remove active writes to `device_fingerprint`, `ip_hash` on intake)
- Payment instrument fingerprint / BIN / last4 (except legacy CSV compat during migration)
- Real-time checkout/cart tables
- Address hash variants until normalisation functions exist
- Bank/acquirer licensing fields (nullable scaffold only, not wired to queries)
- `network_successful_orders_observed` (claim-adjacent ingestion only)
- Materialized views
- Plan-tier visibility in database layer

---

## Step 7 legacy cleanup checklist

- [ ] Grep: zero reads from `fraud_entities`, `fraud_entity_co_occurrences`, `fraud_identity_clusters`
- [ ] Grep: zero reads from `global_identity_clusters`, `global_identity_cluster_attributes`
- [ ] Grep: zero `as any` introduced
- [ ] Stop dual-write in worker
- [ ] Drop deprecated tables (after compatibility period)
- [ ] Regenerate `lib/supabase/types.ts`
- [ ] Update `lib/supabase/tables.ts`
- [ ] Run verification checklist: typecheck, unit tests, RLS checks, forbidden term grep

---

## Phase 1 audit reference

Full table-by-table audit, co-occurrence write path map, and backward-compatibility caller list: see conversation Phase 1 output (2026-06-08).
