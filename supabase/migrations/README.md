# Active local migration history

Only the canonical reconstruction history belongs in this directory:

1. `20260720000000_canonical_production_baseline.sql` — redaction-safe,
   production-live-schema-derived public schema baseline.
2. `20260720100000_canonical_environment_supplement.sql` — storage bucket,
   publication, cron, and least-privilege ACL configuration with no customer
   rows, secrets, auth identities, storage objects, or production DML.
3. `20260721120000_durable_sensitive_audit.sql` — forward, repository-only
   durable-audit delta.
4. `20260722100000_tenant_authorization_hardening.sql` — locally proven
   tenant/RLS/RPC/Storage boundary hardening.
5. `20260722200000_webhook_event_safety.sql` — payload-aware, leased and
   token-fenced delivery claims plus source-object ordering, retry, stale-event
   and conflict observability.
6. `20260722300000_privacy_erasure_retention.sql` — merchant-scoped subject
   pseudonymisation, immutable receipts, leased Storage cleanup, and raw inbox
   purging only for explicit retention deadlines.
7. `20260722400000_source_to_recovery_integrity.sql` — atomic case decisions
   and lifecycle transitions, append-only financial/recovery corrections,
   prevention observation windows, contradiction exceptions, and closure
   integrity for the controlled source-to-recovery path.
8. `20260722500000_ownership_transfer_integrity.sql` — one-active-owner
   cardinality, atomic/idempotent transfer, and append-only transfer evidence.

The superseded 223-file set is preserved under
`supabase/migrations_archive/pre_canonical_20260722` and must never be included
in a fresh replay. Remote migration history is unchanged; any future production
reconciliation requires the separately approved, locally rehearsed
`migration repair` sequence documented in the rollout packet.
