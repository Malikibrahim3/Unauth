# Migration-history canonical recovery plan (Task 2B)

**Date:** 2026-07-21
**Mode:** Read-only forensic planning (Task 2B) + authorized read-only production evidence capture (Task 2C). **No committed migration, no database, and no migration-history table was changed.** No `db push` / `db reset --linked` / `migration repair` / `db pull` / `link` was run. The Task 2C pooler connection was rejected (dead credential, §6a); under Task 2D authorization a read-only evidence capture then **succeeded via the Supabase Management API** using a short-lived least-privilege role that was **verifiably removed** — production received only the authorized role create/drop + read-only SELECTs; no schema/data/history change (see §6b + manifest `11-…`).
**Depends on:** Task 2A collision ledger (`scratchpad/COLLISION_LEDGER.md`), local-stack evidence, and [`09-durable-audit-inventory.md`](09-durable-audit-inventory.md).
**Status of dependent work:** Task 2A durable-audit runtime (AUD-001–AUD-004, RLY-004), Task 3 tenant isolation, and final MVP+ certification **remain BLOCKED** until this remediation is implemented and a clean fresh replay succeeds.

> **Scope honesty:** three read-only forensic subagents (full 223-row register, exhaustive git trace, exhaustive non-schema sweep) were launched but terminated early when the org hit its monthly API spend limit. The **defect-relevant** forensics below were completed directly and are evidence-complete. The **exhaustive per-file 223-row register** is only partially built; producing it in full is folded into Implementation Stage 2 with the method specified. No canonical decision in this plan rests on an incomplete register or on filename similarity alone.

---

## 1. What is broken, and why fresh replay fails

Runtime-proven on an isolated local Supabase stack (**PostgreSQL 17.6**, image `supabase/postgres:17.6.1.113`, local-only, never linked). The committed 223-file history **cannot** `supabase db reset` from zero. Four independent defect classes, plus a fifth that is fatal to any repo-only reconstruction:

| Class | Where | Symptom |
|---|---|---|
| Syntax corruption | `0008_csv_upload_queue.sql` | orphaned duplicate `USING(...)` on the `storage.objects` DELETE policy → `syntax error at or near "USING"` |
| Duplicated/renumbered block | `0060–0077` duplicate the stems of `0029–0049` | duplicate-object collisions (`policy/index already exists`) |
| Broken post-rename reference | `0073_fix_audit_transactions_rls.sql` | `DROP POLICY … ON fraud_transactions` after `0031` renamed it → `relation "fraud_transactions" does not exist` |
| Dependency-ordering violation | `20260528054700_merchant_widget_tokens` FK→`merchant_api_keys` (`20260528120000`) | `relation "merchant_api_keys" does not exist` |
| **Lost migration (fatal)** | `merchant_members`→`merchant_users` + enum conversion | referenced by 9 migrations + app + `types.ts`; **never created on any git ref** |

The release gate is green because its migration check only asserts timestamp-prefix uniqueness and runs `db push --dry-run`, which compares **recorded migration names** and **never executes SQL**. A fresh `db reset` is the only thing that exercises the real failure, and it is not in CI.

---

## 2. Git provenance of every implicated defect

All hashes verified read-only via `git log/show/cat-file` on this repo.

| Commit | Date | Role in the corruption |
|---|---|---|
| `de5669c0` | 2026-05-02 | **Initial commit.** Contained an early numbering scheme (0027/0029_evidence/0035/0036_permissions …). |
| `7777685e` | 2026-05-11 | "ASOS remediation phases 0–4." **Added the current `0030–0059` block** (e.g. `0030_evidence_packages`, `0036_team_members` first appear here). |
| `50032e73` | 2026-05-07 | "…add audit_transactions performance indexes." **Edited already-shipped `0008`** and left the orphaned second `USING(...)` on the storage DELETE policy (Class 1). Editing an applied migration is the original immutability violation. |
| `9146a372` | (audit waves) | "Production-readiness audit waves 5–9." **Added the duplicate `0060–0077` block** (`0060`,`0062`,`0066`,`0077` all first appear here) *alongside* the already-present `0030–0059`. **This — not the 2026-07-20 76-conflict merge — is the duplication origin** (correcting the Task 2A hypothesis). |
| — | — | **Lost migration:** `git log --all -S 'RENAME TO merchant_users'`, `-S 'member_role'`, `-S 'invite_status'` over `supabase/migrations/*` return **nothing** on any local/remote branch, tag, reflog, or stash. `-S 'merchant_users'` hits only migrations that *reference* it in RLS policies (`cde030cf`, `90e14d78`, `44b65b02`, `0b66bb1a`, …), never one that defines it. The rename+enum migration was applied to production out-of-band and was never committed. |

**Duplicate-pair classification** (normalized SQL diff = comments/blank lines stripped, whitespace collapsed; from Task 2A + this pass):

| Lower (`7777685e`) | Upper (`9146a372`) | Norm-diff | Classification |
|---|---|---|---|
| 0029_access_audit_log_cross_merchant | 0060_… | 0 | identical |
| 0030_evidence_packages | 0062_… | 2 | identical-effect (FK `fraud_transactions`→`audit_transactions`, i.e. pre/post `0031` rename) |
| 0031_schema_rename | 0061_… | 18 | **divergent** — 0061 wraps every rename in `IF EXISTS` (idempotent rewrite) |
| 0032_watchlist_appearances | 0063_… | 0 | identical |
| 0036_team_members | 0066_… | 2 | identical (only the table's own `IF NOT EXISTS`) |
| 0038_permissions_audit_trail | 0067_… | 4 | identical (tables' `IF NOT EXISTS`) |
| 0039_customer_activity_log | 0070_… | 0 | identical |
| 0040_identity_match_status | 0075_… | 24 | **divergent** — 0075 drops 0040's `IF EXISTS` column guards |
| 0041_add_file_hash_to_processing_jobs | 0074_… | 0 | identical |
| 0042_network_metrics_snapshots | 0064_… | 0 | identical |
| 0043_demo_merchant | 0065_… | 0 | identical (seed DML — see §4) |
| 0044_upload_context | 0068_… | 0 | identical |
| 0045_soft_delete_watchlist_notes | 0069_… | 0 | identical |
| 0046_identity_results_persistence | 0071_… | 0 | identical |
| 0047_fix_bulk_upsert_fraud_entities_rpc | 0072_… | 0 | identical |
| 0048_fix_audit_transactions_rls | 0073_… | 12 | **divergent + broken** — 0073 references renamed-away `fraud_transactions` (Class 3) |
| 0049_raise_csv_bucket_size_limit | 0076_… | 0 | identical |
| 20260512233551_current_database_size_function | 0077_… | 18 | divergent — both `CREATE OR REPLACE` (idempotent); 0077 adds grants |

`0078_drop_legacy_tables`, `0079_background_intelligence_jobs` are `9146a372`-only (no lower twin) and must be kept in any reconstruction.

**Why neither block is safely droppable:** the two blocks are dependency-interleaved. Dropping `0060–0077` removes creators that later timestamped migrations need (Task 2A: drop-`006x` stops at `merchant_widget_tokens`); dropping `0030–0059` removes `merchant_members` before `0037` uses it (stops at `0037`). Canonical selection therefore cannot be by prefix; it needs the object-level dependency graph plus a production schema reference (§6, §7).

---

## 3. Dependency graph (schema layers and where the breaks fall)

Creation order that a correct fresh build must satisfy (→ = "must precede"):

```
extensions/auth/storage (Supabase base image)
  → merchants
    → merchant_members  ⇒ [LOST]  merchant_users + enums member_role/invite_status   ← BREAK 5 (fatal)
    → audit_transactions (renamed from fraud_transactions by 0031)                     ← BREAK 1 (0008), BREAK 3 (0073)
    → merchant_api_keys (20260528120000) → merchant_widget_tokens (054700)             ← BREAK 4 (ordering)
    → checkout_signals / merchant_rules / identity_* (20260613+, all need merchant_users) ← blocked by BREAK 5
    → claims → (20260619) support_payout_cases
      → source-agnostic foundation: domain_events, domain_event_deliveries,
        case_financial_entries, record_match_resolutions, user_action_log (20260711120000)
        → phase7 canonical operations: case_decisions, case_outcomes, loss_*, recovery_* (20260711140000)
          → DURABLE AUDIT: capture trigger on 27 tables + receipts + RPCs (20260721120000)  ← Task 2A target, unreachable
```

Bounded scratch reconstruction (Task 2A, 8 mechanical repairs) reached **139/223** — through ~2026-06-01 — then stopped at BREAK 5. Everything the durable-audit contract (and Task 3 tenancy) needs is created *after* the break.

---

## 4. Non-schema / non-squashable side-effects (what a schema-only baseline would silently drop)

Direct inventory of `supabase/migrations`:

- **pg_cron:** `20260613092000_ingest_rate_limits.sql` — `cron.schedule('cleanup-rate-limits', …)` / `cron.unschedule`. Cron jobs are **rows in `cron.job`**, not schema — a `--schema-only` dump omits them.
- **Extension:** `CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions` (the only explicit extension; `pgcrypto`/`uuid-ossp` etc. are provided by the base image).
- **Storage buckets (rows in `storage.buckets`)** created across ≥4 migrations: `merchant-csv-uploads-2`, `evidence-packages`, `integration-documents`, `pack-confirmation-photos` (+ a `documents` reference). Plus **`storage.objects` RLS policies** (`0008` and the bucket-creating migrations). Bucket rows + storage policies are omitted by a public-schema-only dump.
- **Vault / webhook secrets:** `20260528160000_support_provider_webhook_secrets.sql`.
- **Realtime publications:** `20260713090000_phase6_configuration_versions.sql`, `20260713110000_atomic_configuration_publication.sql` (`supabase_realtime` publication membership).
- **RPC/role grants:** many migrations `revoke all … / grant execute … to service_role`; these live in `public` and are dump-captured, but must be re-verified after any baseline.
- **DML-bearing migrations: 75 files.** Includes reference/seed data (`0043`/`0065_demo_merchant` — duplicated), backfills (`…connection_backfill`, `phase6_financial_backfill`, `configuration_version_backfill`, `remap_rule_claim_types`), GDPR purges (`source_agnostic_gdpr_purge`, `gdpr_purge_append_only_completion`), and **4 production-data-specific Simeon purges/reseeds** (`20260716090000`, `20260716091000`, `20260718110000`, `20260719090000`).

> **Consequence for strategy:** the 75 DML migrations are largely **production-state-specific** (purge *this* debris, backfill *existing* rows, seed a demo merchant). Replaying them on a fresh empty database is at best a no-op and at worst an error, and they do **not** belong in a clean new-environment build. This is a strong argument **against** "just repair and replay all 223 files" (Strategy A) and **for** capturing a post-backfill baseline (Strategy C) plus a curated, intentional seed.

---

## 5. Canonical-name & generated-type reconciliation (types as evidence, not proof)

`lib/supabase/types.ts` is generated from production and is authoritative for **names**, not full DDL (it omits defaults, check constraints, index/policy bodies, triggers, function source, grants).

- `merchant_users`: present in `types.ts` (2 refs) and 8 code files; **`merchant_members` appears 0 times** in `types.ts`/code. Columns in `types.ts` (`id, merchant_id, user_id, invited_email, role, invite_status, invited_by, created_at, accepted_at`) match `merchant_members` (0036) **except** `role`/`invite_status` are enums (`member_role`, `invite_status`) in prod vs `text`+CHECK in the migration. ⇒ the lost migration did **rename + type-convert**, not a pure rename.
- Enums `member_role`, `invite_status`: expected by `types.ts`; **created by no migration** (confirmed §2).
- Other enum/name reconciliation (`claim_status`, `requested_action`, `loss_attribution`, and the full table set) is **not yet exhaustively cross-checked** — deferred to Stage 2 (the register). Do **not** treat the `types.ts` column list as sufficient to author the lost DDL; the exact enum value lists, defaults, indexes, and RLS policy bodies are unknown from `types.ts` alone.

---

## 6. Production-evidence boundary — authorization required

**The canonical plan cannot be *executed* from repo artifacts alone.** Proven gaps that only production can close:

1. The lost `merchant_members`→`merchant_users`+enum migration exists nowhere in git; its exact DDL (enum value order, defaults, constraints, indexes, RLS, grants) is unknown.
2. There is **no committed record of what production actually applied** (`supabase_migrations.schema_migrations` names) — searched, none in history. Reconciling prod requires that list.
3. Reconstruction reached only 139/223; **additional lost/divergent migrations beyond BREAK 5 are likely** and can only be confirmed against a real prod schema.

**Therefore, before implementation Stage 2, request explicit authorization for a READ-ONLY production capture:**
- `supabase db dump --linked --schema-only -f <artifact>` (schema DDL only), **and** `--schema-only` for the `auth`/`storage`/`extensions` schemas, **plus** a schema-only capture of `cron.job`, `storage.buckets`, and realtime publication membership (definitions, **not** data).
- the applied-migration list: `supabase migration list --linked` (names/versions only).

**Never** captured: production row data, secrets/vault values, `auth.users` data, storage objects. **Never** run `migration repair`/`db push`/writes during capture. **Do not connect automatically** — this is a user decision (§12).

Fallback if authorization is withheld: Strategy D (restore a disposable project from a Supabase **backup**) can substitute for a live dump, but still requires access to a backup artifact and the same "never extract secrets/PII" boundary.

### 6a. Task 2C capture attempt — 2026-07-21 — **BLOCKED (dead credential)**

The user authorized Stage 2's read-only capture using the existing owner credential in a strict read-only session. Credential discovery (redacted, no secrets printed) found the **only** direct DB credential is the project-owner role via `supabase/.temp/pooler-url` (`postgres.lquvbikyvmbjbfffrlky` @ `aws-0-eu-west-1.pooler.supabase.com`); there is **no dedicated read-only role** and the service-role key is API-level only.

A TLS connection was attempted with a `BEGIN TRANSACTION READ ONLY` verification probe (statement/lock/connect timeouts set), on both pooler ports:
- `:6543` (transaction) → `FATAL: password authentication failed for user "postgres"`
- `:5432` (session) → `FATAL: password authentication failed for user "postgres"`

The TLS handshake and server round-trip **succeeded** (the server returned the auth error), so this is authentication failure, not a network/TLS/mode problem: **the stored pooler password is dead** (matching prior project memory). Per the authorization's boundary — *"if no working credential already exists, stop as BLOCKED; do not ask for manual steps"* — Task 2C was **stopped**.

Attestation: production received **zero writes and zero successful reads** (rejected at authentication before any session opened); **no schema, rows, secrets, or migration list were captured**; the password value was never printed, persisted, or placed in history (read from the existing file into `PGPASSWORD` inside a subshell, redacted from all diagnostics); the owner-only temp dir was removed and credential env vars unset; the `pooler-url` file was left untouched; **no raw dump or credential entered the repository or any response.** No redacted structural manifest was produced because no schema was captured.

**Consequence (2C):** the pooler credential path was dead; a future capture needed a working surface.

### 6b. Task 2C/2D capture — 2026-07-21 — **COMPLETED (read-only)**

A working admin surface was found: the **Supabase Management API** via the logged-in CLI (`supabase db query --linked`, which uses the account access token, not the dead DB password). Under explicit Task 2D authorization, a short-lived **NOLOGIN, passwordless, zero-privilege** role (`unauth_2d_readonly_capture`) was created, used via `SET ROLE` (enabled by session-scoped `createrole_self_grant`) for all structural reads, and **verifiably dropped** (`ROLE_REMOVAL_VERIFIED=YES`; `has_table_privilege` confirmed it held no SELECT on `merchants`/`domain_events`). Redacted structural manifest: [`11-production-schema-manifest.md`](11-production-schema-manifest.md).

**Attestation:** production received the role create/drop (authorized) and read-only SELECTs only — no schema/data change, no history mutation, no `db push`/`pull`/`reset`/`repair`. Only `pg_catalog` + `schema_migrations` (version/name) + `cron.job` (names/schedules, no command bodies) were read. **No application rows, secrets, vault, auth, or storage data captured** (local secret/PII scan clean). Raw capture hashed and securely removed; no raw dump or credential entered the repo or any response. One intermediate safety probe issued `count(*)` on `merchants` expecting denial; it was denied (echoed query text in the error was the only "count" token) and `has_table_privilege` confirms the role could not read it — no value surfaced or stored; app-table probes were then discontinued.

**Findings — the picture is worse than "a lost migration":**
1. **Prod applied 222 migration versions, all committed, nothing out-of-band.** The `0060–0079` duplicate block is recorded applied in prod. The only repo file not applied is Task 2's undeployed `20260721120000`.
2. **Large-scale content drift.** **24 of 131 prod tables** and **17 of 45 prod enums** are present in production but created by **no committed migration** — e.g. `source_orders`, `sync_jobs`, `source_customers`, `store_connections`, `helpdesk_connections`, `merchant_users`, `identity_*`, and enums `member_role`, `invite_status`, `claim_status`, `sync_job_status`, … The committed files only `ALTER`/reference these. Corroborated by Task 2A's clean-apply `relation "…" does not exist` failures. **The committed migration set is not a faithful record of production's schema** — it has drifted at scale (applied content ≠ current file content; same class as the `0008`/`50032e73` edit-after-apply violation, but pervasive).
3. **The lost `merchant_members`→`merchant_users` transformation is now fully determined** from captured structure (no guessing): create enums `member_role('owner','admin','analyst','viewer')` and `invite_status('pending','active','revoked')`; rename `merchant_members`→`merchant_users`; retype `role`→`member_role` (default `'analyst'`), `invite_status`→`invite_status` (default `'pending'`).

**Impact on strategy:** this **eliminates Strategy A** (repairing committed files cannot reproduce prod — ~24 tables/17 enums have no file provenance) and **confirms Strategy C/B (baseline from production's actual schema)** as the only viable path. The repo cannot be the source of truth. The structural manifest proves feasibility; the implementation still needs a full **`supabase db dump --linked --schema-only`** (pg_dump-level DDL for all 131 tables/functions/policies) to author the exact baseline — now **UNBLOCKED** (the Management API surface works), and a decision on whether to also capture `schema_migrations.statements` to map each prod object to the content that actually created it.

Task 2A runtime PASS, Task 3, and final certification remain **BLOCKED** pending the (separately-authorized) baseline implementation and a clean fresh replay.

---

## 7. Strategy comparison

### A — Repair the deployed historical files in place for deterministic fresh replay
- **Fresh build:** achievable only after fixing all four mechanical classes **and** committing a reconstructed lost migration — whose DDL needs prod (§6). Fresh builds still replay all 75 DML migrations, incl. prod-specific purges (§4) → noisy/fragile.
- **Prod timestamps:** unchanged versions, but file **content** diverges from recorded `statements` → drift/warnings in `migration list`. The added lost migration is a **new version** absent from prod → requires `migration repair --status applied` on prod anyway.
- **CLI/history ops:** edits + one new migration + prod `migration repair`.
- **Non-schema:** preserved (files kept) — but that includes prod-specific DML that shouldn't run on fresh envs.
- **Rollback:** revert commits; prod untouched at runtime.
- **Auditability:** high (granular history kept) if archived.
- **Blast radius:** edits ~10+ immutable committed files + author a schema-inventing migration → largest correctness surface; contradicts the "immutable migrations" invariant most.
- **Evidence still required:** prod DDL for the lost migration; prod applied-list.
- **Verdict: REJECT as primary.** Keeps the corrupt 223-file timeline alive forever and still can't self-source the lost migration. Its mechanical fixes (0008/0073/guards/reorder) are reusable inside the archived history if granular replay is ever needed.

### B — Canonical baseline/bootstrap for new environments + auditable archive + explicit prod reconciliation
- **Fresh build:** high — new envs start from one deterministic baseline (+ curated post-baseline migrations/seed).
- **Prod timestamps:** legacy versions stay recorded; baseline is reconciled via `migration repair --status applied` (no re-run). Future migrations apply to both.
- **CLI/history ops:** introduce baseline; archive legacy files out of the migrations dir; prod repair.
- **Non-schema:** **must be supplemented explicitly** (§4) — this is the governance wrapper.
- **Rollback:** archive is immutable; revert = restore archived dir; prod untouched.
- **Auditability:** high (archive + provenance doc).
- **Blast radius:** moderate; no edits to broken files (they're frozen).
- **Evidence still required:** the known-good schema source (from C or D).
- **Verdict: ACCEPT as the governance half.**

### C — Supabase squash/baseline from a known-good schema + explicit supplement for DML/cron/storage/vault
- **Fresh build:** high — `supabase db reset` runs baseline (from the prod schema-only dump) then curated supplements.
- **Prod timestamps:** legacy versions recorded; baseline `migration repair --status applied` on prod.
- **CLI/history ops:** `db dump --schema-only` (source) → baseline file (or `supabase migration squash`); `migration repair` on prod; validate against the pinned CLI 2.109.1.
- **Non-schema:** **explicitly supplemented** — a post-baseline migration/seed recreates cron jobs, storage buckets+policies, realtime publications, vault/webhook-secret *structure* (never values), and only the *intentional* seed data (not prod purges).
- **Rollback:** baseline is additive; drop it to fall back to archive; prod untouched until repair (gated).
- **Auditability:** high with archive.
- **Blast radius:** contained (one baseline + supplements). Drops the 75-DML-migration replay noise.
- **Evidence still required:** authorized prod schema-only dump + applied-list (§6).
- **Verdict: ACCEPT as the mechanism half.**

### D — Restore a disposable project from schema/backup, diff vs canonical, make reproducible
- **Fresh build:** high once codified.
- **Prod timestamps:** untouched (restore is to a *new* disposable project).
- **CLI/history ops:** restore from backup; `db diff`/schema compare; codify as baseline.
- **Non-schema:** captured *if* the backup is a full (not schema-only) restore — but that risks importing PII/secrets, so must be scrubbed.
- **Rollback:** disposable project discarded.
- **Auditability:** medium.
- **Blast radius:** highest operational cost (new project, restore, scrub).
- **Evidence still required:** a production backup artifact.
- **Verdict: REJECT as primary; ADOPT its diff technique inside Stage 6** as an independent cross-check of the baseline.

### Recommendation
**Hybrid C + B:** build a **canonical baseline from an authorized read-only production schema-only dump** (C's mechanism), **archive the 223 legacy files immutably** and reconcile production history via `migration repair` (B's governance), **explicitly supplement** the non-schema state (§4), and use **D's restore-and-diff** as an independent Stage-6 validation. This is the only option that (a) proves fresh reconstruction (baseline `db reset` from zero) **and** (b) proves safe continuation of the existing production history (legacy versions frozen, baseline repaired-as-applied, new migrations apply on both), while (c) not depending on inventing the lost migration and (d) shedding the 75 prod-specific DML replays that make Strategy A fragile.

---

## 8. Staged implementation plan (proposed — NOT executed) with stop/go gates

Every command below is **proposed**; none was run. Each stage has an explicit gate; do not proceed past a red gate.

**Stage 1 — Immutable backups & hashes.**
`git tag audit/migration-history-preremediation` (or a `backup/` branch); `shasum -a 256 supabase/migrations/*.sql > docs/audits/.../migration-hashes-preremediation.txt`; snapshot `lib/supabase/types.ts`.
*Gate:* hashes committed and match the pristine set from Task 2A (`original_hashes.txt`).

**Stage 2 — Canonical schema/history capture (AUTH-GATED, read-only).**
On user authorization only: `supabase db dump --linked --schema-only` (public + auth + storage + extensions), schema-only capture of `cron.job`/`storage.buckets`/publication membership definitions, and `supabase migration list --linked`. Complete the 223-row register + full enum/name reconciliation (§5) against the dump.
*Gate:* dump obtained with zero rows/secrets/PII; applied-list obtained; register complete. **STOP and request authorization if not granted** — do not proceed to a canonical baseline without it.

**Stage 3 — Reconstruction in a separate branch/worktree.**
New worktree/branch. Author the baseline (from the Stage-2 dump) + reconstruct the lost `merchant_members`→`merchant_users`+enum migration from the dump's actual DDL + the supplement migrations (§4). Legacy 223 files moved to `supabase/migrations_archive/` (kept, not deleted).
*Gate:* baseline + supplements diff-clean vs the Stage-2 dump on paper.

**Stage 4 — Clean local `supabase db reset` from zero.**
`supabase db reset` on the local stack (already installed) against the canonical set.
*Gate:* reset applies 100% with zero errors; a fresh-replay script exits 0.

**Stage 5 — Upgrade rehearsal from a production-equivalent predecessor state.**
Load the Stage-2 dump into a disposable local DB; in a **local scratch** `supabase_migrations.schema_migrations`, mark the legacy versions + baseline as applied (never touching prod); apply the next real post-remediation migration and confirm it applies without re-running the baseline.
*Gate:* continuation proven — no re-run, no duplicate, no divergence. (Proves the future prod `migration repair` sequence is safe.)

**Stage 6 — Schema / policy / function / trigger / generated-type comparison.**
Diff reconstructed-local schema vs Stage-2 prod dump (tables, columns, enums, constraints, indexes, RLS policies, functions, triggers, views, grants). Regenerate types **locally** and diff vs committed `types.ts` (report drift; do not commit generated-from-partial types — Task 2A rule). Cross-check with a Strategy-D disposable restore if a backup is available.
*Gate:* zero unexplained schema drift; every difference has a documented cause.

**Stage 7 — Preservation/recreation of omitted DML & service config.**
Verify the supplements recreate cron jobs, storage buckets+policies, realtime publications, and vault/webhook-secret *structure*; confirm prod-specific purges/backfills are intentionally **excluded** from fresh builds and a curated seed replaces `demo_merchant`.
*Gate:* a fresh env is functionally complete (cron scheduled, buckets+policies present, publications correct) with no prod data/secrets.

**Stage 8 — Task 2A database-runtime tests.**
Run the full durable-audit runtime suite (atomic rollback, one-event-per-mutation incl. the `dismiss/hide/status` double-audit check, retry/duplicate/dead-letter/recovery, actor/scope/time/correlation projection, PII-minimised erasure receipts, batch/lock, deploy-order) against the canonical schema.
*Gate:* AUD-001–AUD-004, RLY-004 PASS on real PostgreSQL.

**Stage 9 — Task 3 tenant-isolation tests.**
Two synthetic merchants with overlapping external IDs; RLS/merchant-scoping isolation proven on the canonical schema.
*Gate:* isolation PASS.

**Stage 10 — CI fresh-replay enforcement.**
Add a CI job that runs a real fresh `supabase db reset` (or equivalent disposable-DB replay) on every PR touching `supabase/migrations`, so this defect class fails CI instead of hiding behind name-only `db push --dry-run`.
*Gate:* CI red on a deliberately broken migration; green on canonical.

**Stage 11 — Production rollout & rollback approval boundaries.**
Only after Stages 1–10 green **and** explicit user go: on prod, `supabase migration repair --status applied <baseline_version>` (+ reconcile legacy/archived versions per the Stage-5-proven sequence). No `db push` of the baseline (it would re-run). Rollback = restore archived migrations dir + revert the repair. **Approval boundary: a named human must approve the exact repair commands; Claude does not execute prod writes.**

---

## 9. Exact commands proposed (reference — none executed)

```bash
# Stage 1
git tag audit/migration-history-preremediation
shasum -a 256 supabase/migrations/*.sql > docs/audits/unauth-mvp-plus/migration-hashes-preremediation.txt

# Stage 2 (ONLY after explicit authorization; read-only)
supabase db dump --linked --schema-only -f artifacts/prod-schema.sql
supabase db dump --linked --schema-only -s auth,storage,extensions -f artifacts/prod-managed-schema.sql
supabase migration list --linked > artifacts/prod-applied-migrations.txt
# schema-only definitions of cron.job / storage.buckets / publications (no row data)

# Stage 3 (worktree/branch; edits only there)
git worktree add ../unauth-migration-recovery -b fix/migration-history-canonical
# author supabase/migrations/<baseline>.sql from prod-schema.sql; author lost merchant_users migration; move legacy -> supabase/migrations_archive/

# Stage 4 (local only)
supabase db reset            # must apply 100% from zero

# Stage 6 (local only)
supabase gen types typescript --local > /tmp/types.local.ts && diff lib/supabase/types.ts /tmp/types.local.ts   # report drift only

# Stage 11 (PROD — human-approved only; NOT in this plan's scope)
supabase migration repair --status applied <baseline_version>   # reconcile; never db push the baseline
```

---

## 10. Risks

- **Reconstructing the lost migration wrong** → schema drift vs prod. Mitigated by sourcing DDL from the Stage-2 dump (not `types.ts`) and Stage-6 diff.
- **`migration repair` on prod** is a history write; a wrong version string could make prod re-run or skip a migration. Mitigated by Stage-5 rehearsal on a disposable DB and human approval (Stage 11).
- **Schema-only baseline drops non-schema state** (§4) → Stage-7 supplement is mandatory, not optional.
- **More lost/divergent migrations beyond BREAK 5** likely exist; Stage-4 reset is the backstop that surfaces them.
- **CLI version drift:** commands validated against pinned CLI **2.109.1**; re-verify squash/repair semantics at each gate.
- **Spend/authorization limits** already interrupted the exhaustive register; Stage 2 must complete it before canonical choices are finalized.

## 11. Decisions requiring the user
1. **Authorize a read-only production schema-only dump + applied-migration list** (§6)? Without it the canonical baseline cannot be proven. (Recommended: yes, read-only, no data/secrets.)
2. Approve the **recommended Hybrid C+B** strategy (vs A/D)?
3. Approve **archiving** the 223 legacy files (vs keeping them live and repairing in place)?
4. Approve, at Stage 11 only, the **exact prod `migration repair` sequence** (human-executed).

## 12. Acceptance criteria for the future implementation task
- Clean `supabase db reset` from zero applies 100% (fresh reconstruction proven).
- Upgrade rehearsal proves existing prod history continues safely (no re-run/duplicate) — Stage 5.
- Reconstructed schema diff-clean vs the authorized prod dump (schema, policies, functions, triggers, enums, grants).
- Non-schema state (cron, storage buckets+policies, publications, vault/secret structure, curated seed) recreated; prod-specific DML excluded from fresh builds.
- Generated types match the applied canonical schema.
- CI enforces a real fresh replay.
- No production row data, secrets, auth-user data, or storage objects were ever extracted; `schema_migrations` was never written outside the gated Stage 11.
- Task 2A (AUD-001–AUD-004, RLY-004), Task 3, and final certification unblocked **only** after the above.

**Until then: clean complete migration replay = BLOCKED; Task 2A = PARTIAL; Task 3 = BLOCKED; migration-history defect = P0.**

---

## Task 2E finalization (2026-07-22) — exact baseline evidence captured; strategy locked

Under separate explicit authorization, one short-lived `unauth_baseline_capture_*` role (NOLOGIN, zero-privilege, column-level metadata grants only) captured **exact** production DDL + full migration provenance, all read-only and guarded, then was **verifiably removed** (`roles=0, sessions=0`; raw destroyed; secret scan HIGH-clean). Artifacts: manifest addendum ([`11`](11-production-schema-manifest.md)), 223-row register ([`12`](12-migration-provenance-register.md) + `.json`), candidate baseline ([`recovery/baseline_schema.sql`](recovery/baseline_schema.sql) + [`recovery/README.md`](recovery/README.md)).

**Decisive evidence:**
- Provenance of 223 rows: 197 content-equivalent, 25 content-drifted (mostly *empty recorded statements*), 1 repository-only (Task 2's undeployed migration); **zero production-only**.
- **Tracked history is incomplete at both layers:** ~24 tables + 17 enums present in production have **no `CREATE` in the repo files OR in `schema_migrations.statements`** (incl. `merchant_users` + `member_role`/`invite_status`, `source_orders`, `sync_jobs`, `store_connections`, …). Recorded statements still create `merchant_members`, which prod no longer has. Production was partly built by **untracked out-of-band DDL**.

**Strategy — locked.** This **eliminates Strategy A (repair files)** and **Strategy C-from-recorded-statements**: neither the repo nor the recorded migration statements can reproduce production. The **only** faithful source is production's **live schema**. Recommended path is unchanged in shape (baseline + archive + prod `migration repair` reconciliation + non-schema supplement + CI fresh-replay) but its baseline source is now definitively **the live production schema**, already captured structurally here. Implementation Stage 2/3 needs a full `supabase db dump --linked --schema-only` (now UNBLOCKED — Management API works) to finalize exact DDL; `recovery/baseline_schema.sql` is the deterministic candidate to validate via a clean local `supabase db reset`.

**Count reconciliation:** 135 relations = 131 base tables + 2 views + 2 sequences.

**Still blocked (unchanged):** clean complete replay, Task 2A runtime PASS, Task 3, and MVP+ certification — pending the separately-authorized, local-first baseline **implementation** (no production repair executed here).
