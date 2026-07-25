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
9. `20260723100000_release1_relationship_credential_integrity.sql` —
   merchant-scoped partner ownership and atomic API-key/widget-token revocation.
10. `20260723150000_release1_case_issue_correction.sql` — audited,
    versioned case-issue correction.
11. `20260723200000_release1_investigations.sql` — investigation lifecycle,
    partner/merchant settings, attachment quarantine, events, and Work tasks.
12. `20260723300000_release1_responsibility_recovery.sql` — protected,
    versioned responsibility confirmation and explicit recovery handoff.
13. `20260723400000_release1_investigation_email_dispatch.sql` — leased,
    idempotent provider dispatch reconciliation.
14. `20260723500000_release1_investigation_privacy.sql` — atomic investigation
    subject redaction and private-object cleanup extension.
15. `20260723600000_release1_reporting_truthfulness.sql` — normalized
    missing-item financial reporting and service-only drill-down hardening.
16. `20260724100000_operational_work_read_model.sql` — exception queue
    deadlines, optimistic state versions, indexed work reads, and a
    service-only count projection.
17. `20260724110000_work_saved_views.sql` — merchant-scoped saved Work views
    with owner/shared visibility and RLS.
18. `20260724120000_exception_resolution_integrity.sql` — lock-protected,
    optimistic-versioned exception settlement for non-match decisions.
19. `20260725100000_evidence_reconciliation_pivot.sql` — additive claimed-item
    and shipment-line reconciliation, independent recommendation snapshots,
    observed outcomes, provider credits, fact provenance, and settlement-stage
    truth.

The superseded 223-file set is preserved under
`supabase/migrations_archive/pre_canonical_20260722` and must never be included
in a fresh replay. Remote migration history is unchanged; any future production
reconciliation requires the separately approved, locally rehearsed
`migration repair` sequence documented in the rollout packet.
