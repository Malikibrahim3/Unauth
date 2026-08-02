import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    'supabase/migrations/20260723200000_release1_investigations.sql',
  ),
  'utf8',
);

describe('Release 1 investigation migration contract', () => {
  it('binds every investigation child to a same-merchant parent', () => {
    expect(migration).toContain('case_investigations_case_merchant_fkey');
    expect(migration).toContain('foreign key (support_payout_case_id, merchant_id)');
    expect(migration).toContain('case_investigations_partner_merchant_fkey');
    expect(migration).toContain('foreign key (partner_id, merchant_id)');
    expect(migration).toContain(
      'case_investigation_dispatches_investigation_merchant_fkey',
    );
    expect(migration).toContain(
      'case_investigation_attachments_investigation_merchant_fkey',
    );
  });

  it('enforces one open primary and immutable sent snapshots', () => {
    expect(migration).toContain('case_investigations_one_open_primary');
    expect(migration).toContain('protect_sent_case_investigation_snapshot');
    expect(migration).toContain('sent_investigation_snapshot_is_immutable');
    expect(migration).toContain('duplicate_open_investigation');
  });

  it('uses server-mediated writes with durable audit and semantic events', () => {
    expect(migration).toContain(
      'revoke insert, update, delete on public.case_clarification_requests',
    );
    expect(migration).toContain(
      'create policy case_investigations_service_all',
    );
    expect(migration).toContain('capture_sensitive_audit_event');
    expect(migration).toContain("'investigation.created'");
    expect(migration).toContain("'investigation.response_recorded'");
    expect(migration).toContain("'workflowHandler'");
  });

  it('keeps attachments private and quarantined until clean', () => {
    expect(migration).toContain("'investigation-evidence'");
    expect(migration).toContain('false,');
    expect(migration).toContain(
      "check (safety_status in ('pending', 'clean', 'rejected', 'failed'))",
    );
    expect(migration).toContain(
      'revoke all on public.case_investigation_attachments from public, anon, authenticated',
    );
  });

  it('contains concurrency-safe idempotency rechecks after row locks', () => {
    expect(migration).toContain(
      'A concurrent retry can only pass the first lookup',
    );
    expect(migration).toContain(
      'Re-check after the row lock',
    );
  });
});

describe('Release 1 investigation schema repair contract', () => {
  const repairMigration = fs.readFileSync(
    path.join(
      process.cwd(),
      'supabase/migrations/20260801120000_repair_release1_investigation_schema_drift.sql',
    ),
    'utf8',
  );

  it('is idempotent and repairs all runtime settings used by investigation routes', () => {
    expect(repairMigration).toContain('add column if not exists partner_id uuid');
    expect(repairMigration).toContain('add column if not exists default_contact_channel text');
    expect(repairMigration).toContain('add column if not exists response_sla_hours integer');
    expect(repairMigration).toContain('add column if not exists contact_instructions text');
    expect(repairMigration).toContain(
      'add column if not exists investigation_response_sla_hours integer not null default 48',
    );
    expect(repairMigration).toContain("where conname = 'case_investigations_partner_merchant_fkey'");
    expect(repairMigration).toContain("where conname = 'merchants_investigation_sla_check'");
  });

  it('fails closed on cross-merchant partners and validates reply-to syntax', () => {
    expect(repairMigration).toContain('case_investigation_partner_tenant_mismatch_repair_failed');
    expect(repairMigration).toContain('partners (id, merchant_id)');
    expect(repairMigration).toContain("investigation_reply_to ~* '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$'");
  });
});
