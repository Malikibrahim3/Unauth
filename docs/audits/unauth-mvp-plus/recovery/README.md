# recovery/ — non-schema restoration requirements & baseline notes (Task 2E)

Baseline `baseline_schema.sql` is the redaction-safe reconstruction from the
read-only production capture. On 2026-07-22 it replayed cleanly in two
independently blank databases and through two consecutive official local
Supabase PostgreSQL 17.6 `db reset --local` runs. The active schema-equivalent
copy is `supabase/migrations/20260720000000_canonical_production_baseline.sql`.

The implementation corrected three deterministic capture/render defects before
activation: relation targets emitted as `public."public.table"`, foreign keys
emitted before referenced primary/unique keys, and both referenced sequences
left as comments. It also found that the capture renderer had treated every
string boolean as true and marked all 1,811 columns `NOT NULL`. Nullability was
reconciled for 1,806 columns from the existing production-generated Supabase
type contract and for the five newer columns from their content-equivalent
migration DDL. The resulting local generated types match the application
contract and pass TypeScript.

## Storage buckets (id/name/public/size/mime only — no objects/owners)

- `merchant-csv-uploads-2`: private; 524,288,000 bytes; `text/csv`, `application/csv`, `text/plain`
- `evidence-packages`: private; 104,857,600 bytes; `application/pdf`
- `integration-documents`: private; environment default size/MIME limits
- `pack-confirmation-photos`: private; environment default size/MIME limits

## Cron jobs (name/schedule/db/active; command redacted+parameterized)

- `cleanup-rate-limits`: `*/5 * * * *`, active; redaction-safe local command
  deletes only expired `ingest_rate_limits` rows.

## Publications
- `supabase_realtime` allTables=False ins/upd/del/trunc=True/True/True/True; member tables: 0

## Grants / default privileges

- The official stack supplies the captured 27 managed default-ACL entries; the
  local `pg_cron` install adds three environment-managed `cron` entries.
- The supplement grants the server role explicit table/sequence/function
  access and derives authenticated DML privileges from the captured RLS policy
  commands. RLS remains authoritative; anon receives only the captured `plans`
  read grant.
- Task 2E retained aggregate evidence for 132 production relations with ACLs,
  but not the expanded per-object ACL strings. Exact ACL byte parity therefore
  remains `UNVERIFIED`; the locally reconstructed grants are least-privilege and
  runtime-verifiable rather than inferred as a parity PASS.

## Excluded / parameterized sensitive content
- Migration `20260615100000_identity_catch_events` statements contain one **email/PII** (sha `b64cfbcf836e`) — NOT included; if a data/seed step needs it, parameterize at deploy time. No HIGH-severity secrets found anywhere.

## Objects requiring out-of-band-DDL reconstruction (no create in repo OR recorded statements)
- Tables and enums listed in `../11-production-schema-manifest.md` were applied to production outside tracked migrations; the baseline above reconstructs them from the LIVE captured structure (the only ground truth).
