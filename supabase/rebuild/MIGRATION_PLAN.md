# Unauth Schema Rebuild — Assessment, Migration Plan, and Decision Log

Investigated live via service-role PostgREST (project `lquvbikyvmbjbfffrlky`) plus all
139 migration files. New schema: [001_new_schema.sql](./001_new_schema.sql).

---

## 1. Frank assessment of the current schema

**76 tables, of which ~25 are empty and ~15 are dead or deprecated.** The schema is
four overlapping product generations that were never reconciled:

1. **Gen 1 (migrations 0001–0005)** — hashed, k-anonymous identity store
   (`identities`, `identity_signal_links`). Dropped in 0078, but its RPC
   `upsert_identity_v2` was left behind, orphaned and still exposed.
2. **Gen 2 (0009–0011)** — `fraud_entities` / `fraud_entity_co_occurrences` /
   `fraud_identity_clusters`: per-VALUE aggregates with **plaintext normalized
   emails/addresses/cards**, readable until 2026-06-08 by *any authenticated user*
   (network-wide PII leak; only locked down two days ago).
3. **Gen 3 (0012)** — `customer_profiles`: the UI-facing entity. Plaintext PII in
   jsonb arrays *and* parallel hash arrays (both kept), tenancy via jsonb
   `merchant_ids @> [...]` containment, sentinel values (`fastest_claim_days =
   99999`) reintroduced by 0047 after 0033 had removed them.
4. **Gen 4 (0080 + 20260608\*)** — `global_identity_attributes/...` (already
   commented DEPRECATED) and `identity_identifiers` + `identifier_co_occurrence_edges`
   (the new graph, hashed, sound design — but only days old, 243 + 9 rows, and it
   coexists with all of the above).

**Three stores answer "have we seen this email before" with three different answers.**
A fourth (`identity_link_candidates`) exists and is empty.

### Specific defects

- **Tenancy chaos.** Two competing conventions (`merchant_id = auth.users.id` vs
  `merchant_id = merchants.id` via `merchants.user_id`) caused the same RLS bug to be
  re-fixed in at least six migrations (0037, 0048, 0073, 0079, 0082, 20260608212524).
  `merchants` has `UNIQUE(user_id)` — one merchant per user — despite a team-member
  table existing.
- **PII policy is contradictory.** Plaintext email/phone/address/IP in
  `audit_transactions`, `merchant_identities`, `customer_profiles`,
  `customer_profile_identities`, `fraud_entities`, `global_identity_attributes`;
  hashed-only in `support_case_intake`, `customer_identity_signals`,
  `identity_identifiers`. `watchlist_entries.email_hash` is 32-hex (MD5-length) while
  everything else is SHA-256. `tracking_number` is plaintext in `order_claim_context`
  but hashed in `shopify_fulfillment_events`. Shopify OAuth tokens are **plaintext**
  in `shopify_merchants.access_token` while Woo/BigCommerce and helpdesk creds are
  encrypted.
- **Three connection models for one concept**: `shopify_merchants` +
  `merchant_shopify_connections` (shop_domain-keyed, plaintext token) vs
  `commerce_store_connections` (merchant-keyed, encrypted, explicitly excludes
  Shopify from its CHECK).
- **Two keying systems**: shopify_* event tables and `merchant_identities` are
  `shop_domain`-keyed with no merchant FK; everything newer is `merchant_id`-keyed.
- **`audit_transactions` is a 50-column accretion disk** carrying three incompatible
  grade vocabularies on one table (`identity_confidence_grade`
  definite/probable/possible/weak, `match_status` none/candidate/probable/definite,
  `identity_match_grade` none/candidate/probable/confirmed), plus a legacy shim view
  acknowledging it needs to be split.
- **Claim truth is split three ways**: `merchant_claims.status` terminal values vs
  `merchant_case_outcomes.decision/outcome` vs `support_case_intake.decision/outcome`.
  `claim_events` carries duplicate column pairs (`previous_status/new_status` AND
  `from_state/to_state`).
- **Migration history is corrupted**: 0056–0076 are a byte-identical replay of
  0025–0049; 0034/0035 identical; two files share prefix 0079; internal header
  comments carry wrong numbers; 0008 ends in a stray orphan `USING` clause that
  cannot have executed verbatim. `record_signal_feedback`, `seed_fraud_intelligence`,
  and `update_fraud_entity_with_intelligence` still reference the pre-rename table
  `fraud_transactions` / column `fraud_score_avg` — **they are broken and have been
  for months**.
- **Missing entirely** for the stated product goal: there is no order table that
  stores what the platforms actually return (line items count, landing/referring
  site, user agent, accept-language, gateway), no atomic address components anywhere,
  no helpdesk message/event model that survives provider rotation, no derived-email
  matching support (gmail dots, plus-addressing), no merge/split lineage for
  identities, and k-anonymity is enforced in exactly one of the four read paths.

### What is actually good (and kept)

- `identifier_co_occurrence_edges`' canonical-ordering CHECK and additive upsert.
- `support_case_intake`'s hash-only discipline and summary-not-body storage.
- The claim status/decision/outcome enums (post-20260601 vocabulary).
- The atomic-progress and chunk-claiming RPCs (they fixed real races).
- The billing stack (20260603) — recent, coherent, orthogonal; carried over as-is.
- `processed_webhooks`' idempotency-key model.

---

## 2. The new architecture (commentary on major decisions)

**Six layers, one direction of data flow** — see header of `001_new_schema.sql`.

1. **One connection model per integration class** (`store_connections`,
   `helpdesk_connections`), always-encrypted credentials, `(platform, store_key)`
   unique. Shopify stops being special. *Why:* the three-way split was the root of
   the shop_domain/merchant_id keying schism.

2. **Layer-1 `source_*` tables are platform-agnostic, addendum-faithful.**
   `source_customers`, `source_addresses` (atomic components — constraint #4),
   `source_orders`, `source_refunds`, `source_fulfillments`, `source_disputes`,
   `source_tickets`, `source_ticket_events`. Columns are exactly what the light
   APIs return — `browser_ip`, `user_agent`, `landing_site` exist; device
   fingerprint and session columns deliberately do **not** (they can never be
   populated without a checkout embed; the old `customer_identity_signals.device_fingerprint`
   was NULL in every sampled row). Plaintext PII is allowed here because each row is
   the merchant's own customer data, RLS-confined to that merchant. *Why
   platform-agnostic rather than per-platform tables:* adding Freshdesk or a new
   cart means writing an adapter, not a migration — the stated extensibility goal.

3. **Layer 2 is the only input to resolution.** `identity_signals` (one row per
   identifier observation, HMAC-SHA256, format-CHECKed, provenance FK back to
   exactly one layer-1 row) and `identity_edges` (merchant-scoped co-occurrence,
   canonical ordering kept from the new-gen design). The `identifier_type` enum
   includes **derived types** — `email_root` (catches plus-addressing/gmail-dot
   rotation, constraint #1) and `address_unit` — so fuzzy matching is precomputed
   at ingest rather than queried at read time. `payment_fingerprint` is
   gateway+last4 because that is the best the APIs give us (no instrument tokens).

4. **Layer 3 makes identity a first-class entity with lineage.**
   `identities` (cluster head, single `confidence_grade` enum matching
   `lib/engine/weights.ts`), `identity_members` (identifier→identity, unique per
   identifier, per-membership confidence), `identity_resolution_events`
   (append-only, trigger-enforced: merges, splits, grade changes, FP reports).
   `identities.superseded_by` gives merge lineage — the old schema lost history on
   every re-cluster. *Why a membership table instead of jsonb arrays:* the old
   `customer_profiles.merchant_ids` jsonb arrays made tenancy un-indexable and
   un-FK-able; this was the single most bug-generating decision in the old schema.

5. **Behaviour is modeled separately from identity** (constraint #6): `claims`,
   `claim_events` (append-only), `claim_outcomes` (**one** decision row per claim,
   UNIQUE — ends the three-way truth split), `claim_evidence`. A claim points at an
   identity via nullable `identity_id`; claim data never enters the graph.

6. **Serving layer enforces privacy structurally.** Network tables are
   service-role-only with `REVOKE` belt-and-braces. The single read path,
   `lookup_network_identity()`, enforces k-anonymity (merchant_count ≥ 3, matching
   `K_ANONYMITY_MIN`) *inside* the function and writes `network_access_log`
   (append-only) on every call — restoring the gen-1 discipline that gens 2–3
   abandoned. Per-merchant watchlist/notes/investigation state lives in
   `merchant_identity_state` / `identity_notes`, which reference the network
   identity but disclose nothing cross-merchant.

7. **One RLS predicate.** `is_merchant_member(merchant_id)` is the only tenancy
   check in the schema. Real Postgres enums replace text+CHECK (one grade scale,
   one claim vocabulary). No sentinel values — NULL means unknown, with the
   `fastest_claim_days` 99999 regression called out so the migration scrubs it.

8. **Ops consolidation**: `sync_jobs` + `sync_job_chunks` replace
   `processing_jobs` + `processing_job_chunks` + `csv_upload_queue` +
   `background_intelligence_jobs`. `processed_webhooks` keeps the
   idempotency-key PK design.

---

## 3. Migration plan

Tables with meaningful live row counts (preserved): `audit_transactions` 12,290 ·
`shopify_order_signals` 3,838 · `merchant_identities` 3,811 ·
`customer_profile_audit_appearances` 3,139 · `customer_profiles` 1,044 ·
`merchant_claims` 694 · `claim_events` 631 · `merchant_case_outcomes` 418 ·
`webhook_logs` 401 · `support_case_events` 280 · `identity_identifiers` 243 ·
`processing_jobs` 169 · `customer_profile_identities` 160 · `support_case_intake` 59 ·
`watchlist_entries` 50 · `merchants` 43 + billing/membership tables.

### Pre-Phase-1 verifications (resolved 2026-06-11)

- **`identity_members` uniqueness fixed in the schema**: the global unique index on
  `(identifier_type, identifier_hash)` is now a *partial* unique index covering
  strong identifier types only. `name` and `ip` are shared across thousands of
  people; they remain bridging signals in `identity_signals`/`identity_edges`
  (contributing edge weight) and may appear in many identities' members without
  conflicting. A plain non-unique index keeps lookups fast for weak types.
- **Billing deploy sequence**: `001_new_schema.sql` deliberately contains no billing
  DDL. Phase 0's v2-schema build step must ALSO run `CREATE TABLE v2.<billing>`
  copies of `plans`, `merchant_subscriptions`, `merchant_credits`,
  `context_credit_events`, `credit_topup_log`, `billing_events_log` (same DDL as
  live, FKs repointed to `v2.merchants`) **alongside** the existing public-schema
  billing tables — never instead of them. Live billing keeps serving from `public`
  until the Phase 5 schema swap; Phase 1 copies rows into the v2 twins.
- **`signal_performance` verdict — archive, do not migrate.** Every row shares the
  identical timestamp 2026-05-21T10:00:00Z (seeded, not organically accumulated),
  the RPC that writes it (`record_signal_feedback`) has been broken since the
  0031 table rename (UPDATEs the nonexistent `fraud_transactions`), and rows like
  `device_reuse_observed` track signals the light integrations cannot populate.
  Static weights remain canonical in `lib/engine/weights.ts`. The table stays in
  `legacy_v1` for reference; a fresh `signal_feedback_stats` table is added to v2
  only when the feedback loop is rebuilt against the new claim/outcome model.
- **`merchant_identities` shop_domain → connection mapping (live tally, all 3,811
  rows):** `simeon-murray-store` 3,683 (mapped), `aurora-outfitters` 106 (mapped),
  **`unauth-test` 22 — ORPHAN**: it exists in `shopify_merchants` but has no
  `merchant_shopify_connections` row, so no merchant_id resolves. Action in
  Phase 1: create the missing connection row (the store install exists, only the
  join row is absent) or send those 22 rows to the quarantine table. Also note
  4 of the 6 connection rows are `interaction-audit-*` test stores with zero
  identity rows, and `simulation-test-store` exists in `shopify_merchants` with
  no connection and no identity rows — exclude all of these from Phase 4 input.

### Phase 0 — Freeze & snapshot (1 day)
- `pg_dump` full snapshot; disable ingestion webhooks (return 202 + queue) for the
  cutover window.
- Build new schema in the same database under schema `v2` (all DDL in
  `001_new_schema.sql` prefixed `v2.`), so backfill is plain SQL, not ETL.

### Phase 1 — Tenancy & connections
- `merchants` → `v2.merchants` (copy id, name, is_demo, is_internal; fold
  `default_column_map`, setup fields into `settings`).
- Synthesize owner rows: `merchant_members` → `v2.merchant_users`; **plus** one
  `owner` row per `merchants.user_id` (the old implicit ownership), `invite_status='active'`.
- `merchant_shopify_connections` + `shopify_merchants` → `v2.store_connections`
  (platform='shopify', store_key=shop_domain, **encrypt the plaintext access_token
  during copy**); `commerce_store_connections` is empty — nothing to move.
- `support_provider_connections` → `v2.helpdesk_connections` (column-for-column).
- `merchant_api_keys`, token tables, billing tables: copy unchanged.

### Phase 2 — Layer-1 backfill (the bulk)
- `merchant_identities` (3,811, shop_domain-keyed) → resolve merchant_id via
  connection map → `v2.source_customers` + `v2.source_addresses` (split the
  plaintext address strings through `normaliseAddressTokens` in a worker script —
  atomic components can't be derived in SQL alone; store `normalized_full` now,
  components best-effort).
- `shopify_order_signals` (3,838) → `v2.source_orders` (source='shopify',
  external_id=shopify_order_id, map financial/fulfillment enums).
- `audit_transactions` (12,290): rows with `source='shopify'` dedupe against the
  above on (merchant_id, order_id); CSV rows become `v2.source_orders`
  (source='csv') with their plaintext email/address/ip mapped in, and their job
  linkage becomes `v2.sync_jobs` (from `processing_jobs`). Scoring columns
  (match_score, grades, flags) are **not** migrated as columns — they are engine
  output; re-score after cutover (Phase 4). Keep a `legacy_audit_archive` schema
  with the original table for 90 days.
- `support_case_intake` (59) → `v2.source_tickets`; `support_case_events` (280) →
  `v2.source_ticket_events`. `order_claim_context` (10 rows, all-NULL context
  columns in sampling) → drop; its populated `time_to_claim_days` lives on in the
  profile rollup.

### Phase 3 — Claims
- `merchant_claims` → `v2.claims` (status enum maps 1:1 post-20260601; map
  `missing_parcel`→`item_not_received`; anchor via source_order lookup, else
  source_ticket).
- `claim_events` → `v2.claim_events` (use from_state/to_state where populated,
  else previous/new_status).
- `merchant_case_outcomes` (418) → `v2.claim_outcomes`: where multiple rows per
  claim exist, keep the latest `decided_at` and append the rest into
  `v2.claim_events` as `outcome_superseded` entries.
- `claim_evidence_items` → `v2.claim_evidence`.

### Phase 4 — Identity layer (re-derive, don't copy)
The old identity stores disagree with each other; migrating them would migrate the
disagreement. Instead **re-run resolution from layer 1**:
1. Worker walks `v2.source_orders/customers/tickets`, emits
   `ingest_identity_observations()` payloads (this also backfills the derived
   `email_root`/`address_unit` types the old schema never had).
2. Run the clustering engine to populate `identities`/`identity_members`,
   then `identity_profiles`.
3. Reconcile UI continuity: for each old `customer_profiles` row (1,044), find the
   new identity via its email hash → write a `legacy_profile_id → identity_id`
   mapping table so existing watchlist entries, notes, and evidence packages
   re-point: `watchlist_entries`/`customer_notes` → `merchant_identity_state` /
   `identity_notes`; `customer_profile_audit_appearances` is derivable from
   `identity_signals` provenance and is not migrated.
4. Spot-check: sampled old profiles' merchant counts and claim counts must match
   new rollups within tolerance; the 9 `fastest_claim_days=99999` sentinels become
   NULL.

### Phase 5 — Cutover & teardown
- Repoint `lib/supabase/tables.ts` (`TABLES`) at v2 names; deploy behind env flag;
  replay the queued webhooks; re-enable ingestion.
- After 2 weeks of parity monitoring: `ALTER SCHEMA public RENAME TO legacy_v1`,
  `ALTER SCHEMA v2 RENAME TO public` (or move tables individually if extensions
  pin `public`), drop after 90 days:
  - **Drop immediately** (empty/dead): `identity_link_candidates`,
    `identity_transitions`, `identity_false_positive_reports`,
    `global_identity_cluster_attributes`, `normalisation_learning`, `eval_history`,
    `engine_versions`, `subscriptions` (superseded), `usage_counters`,
    `shopify_refund_events`/`shopify_fulfillment_events` (0 rows),
    `public_audits`, `founding_merchant_applications` (0 rows), plus orphaned
    functions `upsert_identity_v2`, `seed_fraud_intelligence`,
    `record_signal_feedback`, `update_fraud_entity_with_intelligence`,
    `upsert_refund_pattern`.
  - **Drop after re-derivation verified**: `fraud_entities`,
    `fraud_entity_co_occurrences`, `fraud_identity_clusters`,
    `global_identity_attributes/appearances/clusters`, `customer_profiles` and
    satellites, `identity_identifiers`, `identifier_co_occurrence_edges` (their
    content is regenerated into the new graph).

### Risk register
- The clustering re-run is the long pole; do it against v2 while v1 still serves.
- `merchant_identities` has no merchant_id — 3 shop domains must map cleanly via
  connections; any orphan domains go to a quarantine table for manual mapping.
- App code touches dozens of table names; `TABLES` in `lib/supabase/tables.ts` is
  the single choke point — verify no raw string table names remain (`grep -r "from('"`).

---

## CUTOVER EXECUTED — 2026-06-11

- Schema swap complete: `public` → `legacy_v1`, `v2` → `public` (single transaction, grants restored, PostgREST reloaded).
- Snapshots: `snapshots/phase0_public_20260611_0018.sql` (pre-migration) and `snapshots/phase5_v2_pre_swap.sql` (pre-swap v2).
- Broken functions dropped from legacy_v1: upsert_identity_v2, seed_fraud_intelligence, record_signal_feedback, update_fraud_entity_with_intelligence, upsert_refund_pattern. Call sites fixed: lib/identity/lookup.ts (no-op + warn), app/api/fraud-feedback/route.ts (410 Gone).
- 15 empty legacy tables dropped; `global_identity_cluster_attributes` SKIPPED (14 rows — was never zero-row; goes with the schema drop).
- RLS fix applied post-swap: `merchant_role()` SECURITY DEFINER helper replaces self-recursive inline policies on merchant_users/merchants (synced into 001_new_schema.sql).
- TABLES repointed (11 entries); `lib/supabase/types.ts` regenerated from new public schema.
- legacy_v1 teardown reminder scheduled for 2026-09-09 (scheduled task `drop-legacy-v1-schema-reminder`; requires explicit confirmation, takes a final dump first).

### Known post-cutover work (authorized to fix as encountered)
- 26 TypeScript errors in legacy-shape code paths (worker/job pipeline, writeIdentifierGraph, restitchAuditIdentity, upsertMerchantForUser, demo route, audit history component).
- ~217 raw `.from('…')` references bypassing TABLES; highest priority: app/api/shopify/webhooks (ingestion writes to dropped shopify_order_signals shape), customers/dashboard pages reading customer_profile_audit_appearances (no v2 equivalent — needs identity_signals-provenance query).
- Webhook replay: not applicable — no queue existed (V2_MIGRATION_ACTIVE was never configured in this environment; zero legacy ingestion occurred after the Phase 2 backfill cutoff, so no data gap).
