# Pre-canonical migration evidence (immutable archive)

This directory preserves the 223-file migration set that existed immediately
before the production-derived canonical baseline became the active local
reconstruction history on 22 July 2026.

Do not execute, edit, rename, reorder, or copy these files back into
`supabase/migrations`. They are forensic evidence only: production records 222
of the versions as applied, while `20260721120000_durable_sensitive_audit.sql`
was repository-only. The production live schema, not this file set, is the
authoritative reconstruction source because tracked and recorded statements
omit production objects and contain content drift.

Integrity and provenance:

- `docs/audits/unauth-mvp-plus/legacy-migration-sha256.txt` contains one SHA-256
  entry for each of the 223 archived SQL files.
- `docs/audits/unauth-mvp-plus/12-migration-provenance-register.md` and its JSON
  companion classify every version against the captured production history.
- `docs/audits/unauth-mvp-plus/11-production-schema-manifest.md` records why the
  live production schema is the only faithful canonical baseline source.

The repository-only durable-audit file in this archive includes the two local
runtime corrections found before activation: it targets canonical
`identity_notes` instead of phantom `customer_notes`, and does not attach a row
trigger to the `commerce_store_connections` compatibility view. Production has
never applied this version.
