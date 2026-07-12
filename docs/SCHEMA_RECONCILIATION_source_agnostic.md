# Schema baseline reconciliation — Source-Agnostic MVP+ (Phase 0)

**Date:** 2026-07-11
**Baseline:** `codex/refocus-claim-gate-map`
**Purpose:** Phase 0 gate item — reconcile the schema sources before any Phase 1 DDL is
authored. See `docs/IMPL_source_agnostic_connected_ecosystem.md` §3.

## Schema sources compared

| Source | Role | Last touched |
|---|---|---|
| `supabase/migrations/` (168 files) | Authoritative migration ledger | through 2026-07-10 |
| `supabase/rebuild/001_new_schema.sql` | v2 clean-install baseline | 2026-06-19 |
| `supabase/manual/*.sql` | Out-of-band manual SQL | 2026-06-15 |
| `supabase/full_schema.sql` | Point-in-time dump snapshot | 2026-07-05 |
| `lib/supabase/types.ts` | Generated TS types | **regenerated 2026-07-08** |

## Key finding — generated types and full_schema.sql are stale

The accountability suite migration
`supabase/migrations/20260621120000_accountability_agreements.sql` creates
`evidence_items`, `loss_sources`, `recovery_tasks`, and `accountability_events`.

Per `docs/product/LAUNCH_BLUEPRINT.md` ("Done 2026-07-10"), that migration **was applied
to the live database on 2026-07-10**.

However:

- `lib/supabase/types.ts` was last regenerated **2026-07-08** (commit `06c2b74f`) and does
  **not** contain any of these four tables.
- `supabase/full_schema.sql` (2026-07-05) also predates them and does **not** contain them.
- Several migrations landed **after** the 2026-07-08 types regen and are therefore also
  absent from `types.ts`:
  `20260708120000_missing_account_eval_rpcs.sql`,
  `20260710120000_founding_merchant_applications.sql`,
  `20260710120100_founding_applications_grants.sql`,
  `20260710130000_restore_context_credit_rpcs.sql`,
  `20260710140000_restore_v2_evidence_artifacts.sql`,
  `20260710140100_fix_evidence_customer_anchor.sql`.

### Reconciliation verdict

This is **generated-types staleness**, not a genuine live-schema-vs-history divergence:
the migration ledger and the applied-migration log agree that the four accountability
tables exist. Only `types.ts` and `full_schema.sql` lag.

**Consequence for Phase 1 (binding):**

1. Treat the **migration DDL** (not `types.ts`, not `full_schema.sql`) as ground truth for
   `evidence_items`, `loss_sources`, `recovery_tasks`, `accountability_events`, and every
   post-2026-07-08 migration.
2. `lib/supabase/types.ts` must be regenerated from the linked project (or an isolated
   verification environment) **before** Phase 1 code relies on typed access to these
   tables. This step is **DB-gated and was not run in this environment** (no isolated
   verification DB available; the plan forbids running against production for this).
   Command: `SUPABASE_PROJECT_ID=<id> npm run gen:supabase-types`.
3. Do not author Phase 1 DDL that assumes `full_schema.sql` is current — it is a 2026-07-05
   snapshot.

## Account-scoped uniqueness — confirmed collision risk

`supabase/rebuild/001_new_schema.sql` confirms the identity-scoping gap the plan calls out:

- `source_customers`: `unique (merchant_id, source, external_id)` (`:346`)
- `source_orders`: `unique (merchant_id, source, external_id)` (`:410`)
- `source_tickets`: provider-scoped uniqueness (same pattern)

`source` is the `signal_source` **enum** (provider), not a connection/account. Two accounts
of the same provider that reuse an external ID would collide. Phase 1's account-scoped
identity migration (IMPL §4) must replace these with connection/account-scoped uniqueness,
preceded by a collision report. **No enum/weight/threshold change** — identity-key scoping
only.

## DB-gated items — RESOLVED 2026-07-11 (live DB access authorised by owner)

The user authorised connecting to the linked Supabase project (`lquvbikyvmbjbfffrlky`) and
applying migrations. Results:

- **`types.ts` regenerated** from the live schema. The four accountability tables
  (`evidence_items`, `loss_sources`, `recovery_tasks`, `accountability_events`) and every
  post-2026-07-08 migration are now present. The staleness is resolved.
- **Live existence confirmed** via REST: all four accountability tables return `200`
  (exist, 0 rows). `merchant_integrations` = 2 rows, `source_orders` = 5743 rows
  (merchant_id 5743/5743 non-null → safe to column-scope later).
- **Migration ledger in sync**: `supabase migration list` shows local == remote through
  `20260710140100`; nothing pending before Phase 1.
- Toolchain: `supabase db push` applies migrations; `supabase gen types` regenerates types;
  REST (service key) verifies. Direct `psql`/`db dump` are unavailable (dead pooler
  password + Docker down) but are not needed.

Row-count / collision reports for the constraint-tightening backfill remain a **Phase 2**
step (they only matter when provider-scoped uniqueness is actually replaced), not a blocker
for the additive Phase 1 foundation, which has been applied and verified.

## Static presence matrix (verified 2026-07-11)

| Table | In migrations/SQL | In `types.ts` (2026-07-08) |
|---|---|---|
| `evidence_items` | yes (20260621) | **no (stale)** |
| `loss_sources` | yes (20260621) | **no (stale)** |
| `recovery_tasks` | yes (20260621) | **no (stale)** |
| `accountability_events` | yes (20260621) | **no (stale)** |
| all other consolidated tables | yes | yes |
