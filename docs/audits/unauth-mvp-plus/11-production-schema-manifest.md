# Production schema — redacted structural manifest (Task 2C/2D)

**Date:** 2026-07-21
**Source:** production project `lquvbikyvmbjbfffrlky` ("Unauth New"), PostgreSQL 17.6.1.121, eu-west-1.
**Method:** read-only capture via Supabase Management API; a short-lived NOLOGIN passwordless least-privilege role (`unauth_2d_readonly_capture`) was created, used via `SET ROLE` for all structural reads, and **verifiably dropped** (`has_table_privilege` confirmed it held no SELECT on `merchants`/`domain_events`). Only `pg_catalog` + `supabase_migrations.schema_migrations` (version/name) + `cron.job` (no command bodies) were read. **No application rows, no secrets, no vault/auth/storage data.** Local secret/PII scan: **clean**.

> This manifest is derived, normalized structural metadata only. The raw capture was scanned, hashed, and securely removed; no raw dump or credential is retained.

## Object counts (public schema unless noted)
- base tables: **131**  | views: 2  | enums: **45**
- columns: 1811 | constraints: 658 | indexes: 477 | functions: 47 | triggers: 57
- RLS policies: public=149, storage=6 | tables with grants (relacl): 132 | default-ACL entries: 27
- publications: 1 (supabase_realtime); publication tables: 0
- extensions: pg_cron=1.6.4, pg_stat_statements=1.11, pgcrypto=1.3, plpgsql=1.0, supabase_vault=0.3.1, uuid-ossp=1.1
- cron jobs (names/schedules only): cleanup-rate-limits [*/5 * * * *]

## Applied migration history (production `schema_migrations`)
- **222** migrations recorded applied; first `0001_initial`, last `20260719090000_purge_orphaned_simeon_shipments`.
- **Every recorded version exists in the repo** (nothing applied out-of-band). The only repo file NOT applied to prod is `20260721120000_durable_sensitive_audit` (Task 2's undeployed migration).
- The duplicate block `0060`–`0079` **is recorded applied in production** — i.e. prod applied those version *names* historically; the collisions seen on clean replay are a property of the current *file contents*, not prod's incremental application.

## CRITICAL — production objects with NO committed-migration provenance
Derived by matching `CREATE TABLE/TYPE`/rename in committed files; corroborated by Task 2A's clean-apply `relation "…" does not exist` failures. Definitive per-object provenance is a Stage-2 task using `schema_migrations.statements`.

**Tables (24 of 131) present in prod but created by no committed migration:**

`claim_evidence`, `claim_outcomes`, `helpdesk_connections`, `identity_edges`, `identity_members`, `identity_notes`, `identity_profiles`, `identity_resolution_events`, `identity_signals`, `merchant_identity_state`, `merchant_users`, `migration_orphans`, `network_access_log`, `source_addresses`, `source_customers`, `source_disputes`, `source_fulfillments`, `source_orders`, `source_refunds`, `source_ticket_events`, `source_tickets`, `store_connections`, `sync_job_chunks`, `sync_jobs`

**Enums (17 of 45) present in prod but created by no committed migration:**

`claim_decision`, `claim_detection_method`, `claim_outcome`, `claim_status`, `claim_type`, `confidence_grade`, `connection_status`, `fulfillment_state`, `helpdesk_kind`, `identifier_type`, `invite_status`, `member_role`, `order_financial_status`, `platform_kind`, `signal_source`, `sync_job_status`, `ticket_channel`

This proves **large-scale content drift**: the committed migration files' *current content* cannot reproduce ~24 tables and ~17 enums of production's actual schema. The committed set is not a faithful record of production.

## Exact lost `merchant_members` → `merchant_users` transformation (fully determined)
Production `merchant_users` columns:
- `id` uuid default `gen_random_uuid()`
- `merchant_id` uuid
- `user_id` uuid
- `invited_email` text
- `role` public.member_role default `'analyst'::public.member_role`
- `invite_status` public.invite_status default `'pending'::public.invite_status`
- `invited_by` uuid
- `created_at` timestamp with time zone default `now()`
- `accepted_at` timestamp with time zone

- enum `member_role` = `['owner', 'admin', 'analyst', 'viewer']` (exactly the old `role` CHECK values)
- enum `invite_status` = `['pending', 'active', 'revoked']` (exactly the old `invite_status` CHECK values)

Reconstruction (for the future implementation task): create enums `member_role`/`invite_status`; rename `merchant_members`→`merchant_users`; alter `role`→`member_role` (default `'analyst'`) and `invite_status`→`invite_status` (default `'pending'`). No guessing required — this is the captured prod structure.

## Raw capture fingerprints (sha256, first 16 hex) — raw files removed after hashing
- `_drop.json`: 215a9062315364ad
- `_drop_verify.json`: 5a0bca69cffeaeb2
- `_dropverify.json`: 23256b1caf7f0da0
- `approw_denied_probe.csv`: e3b0c44298fc1c14
- `columns.csv`: d54dedf42be9a532
- `columns.json`: cf9d337658594a96
- `constraints.csv`: d54dedf42be9a532
- `constraints.json`: 42c38de3af221d7f
- `cron_jobs.json`: eccce42712d7255b
- `defacl.json`: 3749e031f137038c
- `enums.csv`: d54dedf42be9a532
- `enums.json`: 88fcd9fede9af4a8
- `extensions.csv`: d54dedf42be9a532
- `extensions.json`: 0c1a256143f482a2
- `functions.csv`: d54dedf42be9a532
- `functions.json`: 3403c20a384a573c
- `grants.csv`: d54dedf42be9a532
- `grants.json`: 610dc3fcedee039c
- `indexes.csv`: d54dedf42be9a532
- `indexes.json`: 2b363e91359d6f17
- `publications.csv`: d54dedf42be9a532
- `publications.json`: 46028f2f5b5eb491
- `pubtables.csv`: d54dedf42be9a532
- `pubtables.json`: e4527bd6944e147f
- `rls_public.csv`: d54dedf42be9a532
- `rls_public.json`: fa68a4e76d5ad984
- `rls_storage.csv`: d54dedf42be9a532
- `rls_storage.json`: fc4c69f1ca0efbf1
- `schema_migrations.json`: dd8d43fff7813f03
- `schemas.csv`: d54dedf42be9a532
- `schemas.json`: 18a813899c444302
- `tables.csv`: d54dedf42be9a532
- `tables.json`: 92fc518d1439e611
- `triggers.csv`: d54dedf42be9a532
- `triggers.json`: 66a502531c3fd2f2
- `views.csv`: d54dedf42be9a532
- `views.json`: ff46d40681603002

---

## Task 2E addendum (2026-07-22) — exact DDL + provenance capture

**Method:** a second, tighter read-only capture via one short-lived `unauth_baseline_capture_*` role (NOLOGIN, zero-privilege, self-grant `SET ROLE`), granted **column-level** SELECT only on the authorized metadata/config columns; `has_table_privilege` proved no SELECT on `merchants`/`storage.objects`/`schema_migrations`(table-level), with column-level SELECT on `schema_migrations.version` and `storage.buckets.id` only. Every capture ran in `BEGIN TRANSACTION READ ONLY` with statement/lock/idle timeouts and an in-transaction context guard (effective role + read-only asserted). Role **dropped via `DROP OWNED BY`+`DROP ROLE`, independently re-verified `roles=0, sessions=0`.** Raw capture secret-scanned (HIGH-severity: **0**), then destroyed.

**Count reconciliation (135 vs 131):** the public schema holds **131 base tables (relkind `r`) + 2 views + 2 sequences = 135 relations**. "131" = base tables only. (45 enums, 1811 columns, 658 constraints, 477 indexes, 47 functions, 57 triggers, 149 public + 6 storage RLS policies — unchanged.)

**Exact DDL captured** (not just names/hashes): enum labels/order, per-column type/identity/generated/default, `pg_get_constraintdef`, `pg_get_indexdef`, `pg_get_viewdef`, full `pg_get_functiondef` (owner/security/volatility/config/acl), `pg_get_triggerdef`, exact RLS policy expressions/roles/cmd, relacl/default-ACL, publications, storage bucket settings, cron name/schedule/command (redacted). Redaction-safe reconstruction: [`recovery/baseline_schema.sql`](recovery/baseline_schema.sql) + [`recovery/README.md`](recovery/README.md).

**Provenance (223 rows):** [`12-migration-provenance-register.md`](12-migration-provenance-register.md) (+ `.json`). 197 content-equivalent, 25 content-drifted (mostly empty recorded statements), 1 repository-only. **Deeper finding:** ~24 tables + 17 enums exist in prod with **no `CREATE` in either the repo files or the recorded `schema_migrations.statements`** — production's live schema was partly built by untracked out-of-band DDL, so even the recorded history is incomplete. **Only the live schema is authoritative.**

**PII:** one email in `20260615100000_identity_catch_events` statements (sha `b64cfbcf836e`) — excluded from all artifacts; parameterize at deploy if a seed needs it. No HIGH-severity secrets anywhere.
