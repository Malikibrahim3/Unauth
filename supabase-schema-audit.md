# Supabase schema cleanup audit

**Date:** 2026-06-03  
**Scope:** Full `public` schema vs current Unauth application (not billing-only).  
**Policy:** Conservative — no destructive drops in this pass unless provably safe.  

---

## Executive summary

| Category | Count (approx.) |
|----------|-----------------|
| Tables expected live in production | ~55 |
| Tables already dropped in migrations (historical) | 6 |
| **Active** | ~48 |
| **Active but messy** | ~8 |
| **Legacy / product-retired UI but DB still written** | ~3 |
| **Unreferenced in app (candidates for review)** | ~4 |
| **Safe DROP in this pass** | **0** |
| **Deprecation migration in this pass** | **0** |

**Actions taken in this pass**

1. Produced this inventory and classification.
2. Fixed **broken app references** to renamed/dropped tables (no schema migration):
   - `app/(app)/claims/page.tsx`: `fraud_transactions` → `audit_transactions`
   - `app/api/search/route.ts`: dropped `transactions` table query → `customer_profile_audit_appearances`
3. **Did not** run DROP/RENAME migrations — several objects are unused in app code but still referenced by seeds, workers, or may hold production data.

**Critical follow-ups**

- Regenerate `lib/supabase/types.ts` — it is **stale** (missing `subscriptions`, `context_credit_events`, support-intake tables, commerce tables, etc.).
- `analytics_events` has schema + RLS but **no application writes** yet (billing placeholder).
- Watchlist tables remain written by CSV pipeline though UI route is retired — product decision needed before deprecation.

---

## Methodology

1. Parsed `supabase/migrations/*.sql` for `CREATE TABLE`, `DROP TABLE`, `RENAME`, RPCs.
2. Cross-checked `lib/supabase/tables.ts`, `lib/supabase/types.ts`, and repo-wide `.from()` / `.rpc()` / raw SQL.
3. Included tests, `scripts/`, `design-audit/`, `simulation/` where they affect “is this still used?”
4. Traced RLS/policy/trigger dependencies only where removal was considered (none removed).

---

## Historical drops (do not expect in DB)

| Object | Removed by | Notes |
|--------|------------|-------|
| `identities` | `0078_drop_legacy_tables.sql` | Replaced by customer/identity model |
| `identity_sightings` | 0078 | Legacy |
| `identity_signal_links` | 0078 | Legacy |
| `identity_merges` | 0078 | Legacy |
| `transactions` (eval) | `0078_drop_legacy_tables.sql` | **App had stale reference** in `app/api/search/route.ts` — fixed |
| `audit_runs` | `0027` / `0058` | Replaced by `processing_jobs` |
| `fraud_transactions` | Renamed → `audit_transactions` (`0031` / `0061`) | **App had stale reference** in claims page — fixed |

---

## RPC / functions (application-called)

| Function | Called from | Verdict |
|----------|-------------|---------|
| `search_customer_profiles` | lookup, widget unlock, Gorgias | **Active — preserve** |
| `consume_context_credits_if_available` | `lib/billing/contextCredits.ts` | **Active — preserve** |
| `increment_lookup_count` | merchant lookup, quick-score | **Active** |
| `increment_job_progress` | `lib/processing/job.ts` | **Active** |
| `register_processing_job_chunks` | `lib/processing/chunkQueue.ts` | **Active** |
| `begin_processing_job_chunk` / `complete_*` / `fail_*` / `next_pending_*` / `try_claim_job_finalize` | chunk queue | **Active** |
| `bulk_upsert_fraud_entities` / `bulk_upsert_co_occurrences` | `lib/processing/worker.ts` | **Active** (network intelligence) |
| `search_cross_merchant_profiles` | `lib/engine/fastContext.ts` | **Active** |
| `refresh_audit_customer_summaries` | `lib/supabase/merchantHelpers.ts` | **Active** |
| `generate_evidence_reference` | `lib/evidence/buildPackage.ts` | **Active** |
| `record_signal_feedback` | `app/api/fraud-feedback/route.ts` | **Active** |
| `increment_api_key_minute_count` | `lib/api/v1/rateLimit.ts` | **Active** |
| `current_database_size_bytes` | `lib/processing/supabaseUsageGuard.ts` | **Active** |
| `upsert_identity_v2` | `lib/identity/lookup.ts` | **Active** (legacy identity path) |
| `delete_orphan_customer_profiles` | `app/api/account/delete/route.ts` | **Active** |
| `get_eval_history` | `app/(internal)/eval/page.tsx` | **Active** (internal) |
| `seed_fraud_intelligence` / `upsert_fraud_entity` / `upsert_refund_pattern` / `record_refund_claim` | types only; scripts/inspect-db | **Legacy RPCs — keep** (may be used in ops/scripts) |

---

## Storage buckets

| Bucket | Code reference | Verdict |
|--------|----------------|---------|
| `merchant-csv-uploads-2` | `STORAGE_BUCKETS.MERCHANT_CSV_UPLOADS`, upload pipeline | **Active** |
| `evidence-packages` | evidence POST/PDF, account delete | **Active** |

---

## Table inventory and classification

### A. Keep — core product (active)

| Table | Purpose | App / test refs |
|-------|---------|-----------------|
| `merchants` | Tenant root | Throughout app |
| `merchant_members` | Team / auth | Layout, permissions, team APIs |
| `subscriptions` | Billing tier | `lib/billing/getMerchantTier.ts` |
| `context_credit_events` | Credit ledger / audit | `lib/billing/contextCredits.ts` |
| `processing_jobs` | CSV/import jobs | Upload, dashboard, worker |
| `processing_job_chunks` | Chunked jobs | `chunkQueue`, cron |
| `csv_upload_queue` | Upload queue rows | `process-csv-job`, purge cron |
| `audit_transactions` | Scored order/claim rows (renamed from fraud_transactions) | Worker, customers, claims, search |
| `customer_profiles` | Network identity rollup | Lookup, customers, worker |
| `customer_profile_identities` | Merchant-scoped profile links | Widget, profile pages |
| `customer_profile_audit_appearances` | Profile ↔ job appearances | Migrations, search (fixed), purge |
| `fraud_entities` | Cross-merchant entity store | `fastContext`, worker bulk upsert |
| `fraud_entity_co_occurrences` | Entity co-occurrence | Worker |
| `fraud_identity_clusters` | Cluster persistence from worker | `lib/processing/worker.ts` |
| `access_audit_log` | Lookup/widget API audit | Lookup routes |
| `lookup_daily_counts` | Rate limits | Lookup RPC |
| `merchant_api_keys` | API auth | Settings, v1 API |
| `api_key_minute_counts` | API rate limit | v1 rate limit RPC |
| `merchant_widget_tokens` | Gorgias widget auth | Widget routes |
| `evidence_packages` | Case evidence PDFs | Evidence API, chargebacks |
| `evidence_download_tokens` | Signed downloads | v1 evidence download |
| `profile_view_tokens` | Signed profile views | Customer profile, widget |
| `support_provider_connections` | Gorgias/Freshdesk/etc. | Intake, settings |
| `support_case_intake` | Helpdesk cases | Claims, widget, intake |
| `support_case_events` | Case event log | Intake store |
| `order_claim_context` | Per-order claim context | Intake, widget |
| `customer_identity_signals` | Identity signals | Intake linking |
| `customer_claim_summary` | Per-merchant claim rollup | Widget, claims |
| `identity_link_candidates` | Link suggestions | `identityLinking.ts`, e2e |
| `webhook_logs` | Integration webhook log | Intake store |
| `merchant_claims` | Claim review queue | Claims app, APIs |
| `merchant_case_outcomes` | Outcomes | Claims store |
| `claim_evidence_items` | Claim evidence lines | Claims store |
| `claim_events` | Claim status history | Claims events |
| `merchant_shopify_connections` | Shopify OAuth | Shopify routes, widget |
| `shopify_merchants` | Shopify shop registry | Shopify sync |
| `shopify_order_signals` | Order signals for widget | `widgetData.ts` |
| `shopify_refund_events` / `shopify_fulfillment_events` | Shopify webhooks | `app/api/shopify/webhooks` |
| `merchant_identities` | Shopify customer bridge | Widget, profile |
| `commerce_store_connections` | Woo/BigCommerce stores | Commerce integrations |
| `processed_webhooks` | Webhook idempotency | Commerce webhooks |
| `merchant_claim_tag_configs` | Tag-based claim detection | `tagClaimDetection.ts` |
| `customer_notes` | Internal notes | Customer notes API |
| `customer_activity_log` | Activity feed | Profile page, evidence |
| `user_action_log` | Permissions audit | Team, account |
| `user_permission_grants` | Fine-grained perms | Team permissions API |
| `engine_versions` | Scoring version FK | Worker / audit_transactions |
| `signal_performance` | Adaptive weights | `fastContext.ts` |
| `normalisation_learning` | Self-learning | Worker (scoped), account delete |
| `public_audits` | Public free audit funnel | Landing audit flow, purge cron |
| `network_metrics_snapshots` | Network health metrics | `scripts/snapshot-network-metrics.ts` |
| `audit_customer_summaries` / `audit_result_summaries` | Audit run summaries | Audit run pages |
| `background_intelligence_jobs` | Post-job intelligence queue | Worker |
| `identity_false_positive_reports` | FP reports | `report-false-positive` API |
| `identity_transitions` | Identity transitions | Schema/types (engine) |
| `eval_history` | Internal eval | `(internal)/eval` |
| `founding_merchant_applications` | Acquisition | `founding-merchant-applications` API |
| `global_identity_attributes` | Global graph attributes | `globalIdentityStore.ts` |
| `global_identity_appearances` | Global graph appearances | `globalIdentityStore.ts` |

### B. Keep but messy / refactor later

| Table | Issue |
|-------|--------|
| `watchlist_entries` | UI retired (`/watchlist` explains case-scoped model) but still used by nav-counts, widget, bulk-delete, CSV worker paths — **blacklist-adjacent naming** |
| `watchlist_appearances` | Tied to flagged transactions from CSV jobs; purge cron; **legacy “watch” semantics** |
| `customer_profiles.risk_level`, `on_watchlist` | Columns + UI fields use “risk” language; core to existing pages — rename/copy pass later |
| `audit_transactions.recommended_action`, `risk_level` | Legacy scoring columns; still populated by worker |
| `fraud_entities` / `fraud_identity_clusters` | Internal names; power network context — not merchant-facing blacklist |
| `lib/supabase/types.ts` | Missing many live tables — **regenerate required** |
| `lib/supabase/tables.ts` | Incomplete vs live schema (no `merchant_claims`, `subscriptions`, etc.) |

### C. Deprecation candidates (not migrated this pass)

| Object | Why not dropped |
|--------|-----------------|
| `global_identity_clusters` | Only used in `scripts/seed-realistic-platform.mjs`, not worker `persistGlobalIdentityGraph` — may be future clustering; FK from `global_identity_cluster_attributes` |
| `global_identity_cluster_attributes` | Same as above |
| `watchlist_entries` / `watchlist_appearances` | Still written by `process-csv-job` / finalize; deleting breaks ingest without code change |
| `analytics_events` | New billing table; no writers yet — keep for planned product analytics |

### D. Drop candidates (none approved this pass)

No table met “no references in app, tests, migrations, triggers, seeds, and safe to drop” without product sign-off.

---

## Sensitive / blacklist-adjacent schema

| Object | Status | Recommendation |
|--------|--------|----------------|
| `watchlist_entries` | **Active writes** | Product: stop writes + deprecate rename after pipeline change |
| `watchlist_appearances` | **Active writes** | Same |
| `customer_profiles.on_watchlist` | Column exists | Soft-deprecate in UI; do not drop without migration plan |
| `fraud_entities` | Active (pseudonymous network) | Keep — internal; not merchant export |
| `fraud_identity_clusters` | Worker | Keep — not a customer list export |
| No `blacklist`, `blocklist`, `risky_customers` tables found | — | — |

---

## Generated types gap

`lib/supabase/types.ts` includes only a subset of live tables. **Missing examples** (present in migrations + app code):

`subscriptions`, `context_credit_events`, `analytics_events`, `support_*`, `order_claim_context`, `merchant_claims`, `commerce_store_connections`, `processed_webhooks`, `merchant_widget_tokens`, `processing_job_chunks`, `shopify_*`, `merchant_claim_tag_configs`, …

**Recommendation:** Run project’s Supabase type generation against linked project (no command found in `package.json` — document manual `supabase gen types` for maintainers).

---

## Cleanup plan (four sections)

### A. Keep

All tables listed in **“A. Keep — core product”** above, plus RLS policies and RPCs they depend on.

### B. Keep but refactor later

See section B table (watchlist naming, risk columns, types SSOT, `tables.ts` expansion).

### C. Deprecate (future pass — requires product + code)

1. `watchlist_entries` → `_deprecated_watchlist_entries_YYYYMMDD` after removing worker/nav writes.
2. `watchlist_appearances` → same, after CSV pipeline no longer upserts appearances.
3. `global_identity_clusters` + `_cluster_attributes` if clustering feature abandoned.

### D. Drop (future pass only)

1. None in this audit.
2. Consider dropping unused RPCs only after confirming no ops scripts: e.g. `seed_fraud_intelligence` if never run in prod.

---

## Migrations added in this pass

**None** (schema unchanged intentionally).

---

## Code references updated

| File | Change |
|------|--------|
| `app/(app)/claims/page.tsx` | `fraud_transactions` → `TABLES.AUDIT_TRANSACTIONS` |
| `app/api/search/route.ts` | Removed query to dropped `transactions` table; scope customers via `customer_profile_audit_appearances.profile_id` + job ids |

---

## Verification performed

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Pass (after code fixes) |
| Targeted billing/credit tests | Not re-run full suite in this pass |
| `npm run lint` | Pre-existing failure (`next lint` invalid project dir) |
| Post-fix grep `fraud_transactions` in `app/` | Should be 0 |
| Post-fix grep `from('transactions'` in `app/` | Should be 0 |

---

## Recommended next cleanup pass

1. **Regenerate Supabase types** and extend `lib/supabase/tables.ts` to match live schema.
2. **Product decision on watchlist**: stop CSV worker writes → deprecation rename migration.
3. **Wire `analytics_events`** or document as reserved.
4. **Evaluate `global_identity_clusters`**: implement in worker or deprecate.
5. **Scripts-only stale refs**: update `scripts/migrate-customer-profiles.ts`, `scripts/test-performance.ts` to use `audit_transactions` (low priority; not production paths).
6. **Column-level deprecation** for `recommended_action`, `on_watchlist` — long-term, case-scoped model only.

---

## Risk statement

Automatic schema cleanup without production data inspection is **high risk**. This pass intentionally produced audit + minimal broken-reference fixes only. Any DROP requires:

- Row counts / backup
- Confirmation no Supabase Dashboard queries depend on object
- Dependency chain review (FK, policies, triggers, views)
- Staged deprecation rename before DROP
