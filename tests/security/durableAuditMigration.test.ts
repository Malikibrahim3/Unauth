import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260721120000_durable_sensitive_audit.sql'),
  'utf8',
);

describe('durable sensitive audit migration contract', () => {
  it('captures the mutation and outbox insert in the same database transaction', () => {
    expect(migration).toContain('create trigger trg_durable_audit after insert or update or delete');
    expect(migration).toContain('perform public.record_domain_event(');
    expect(migration).toContain("array['auditTimelineProjection']::text[]");
    expect(migration).not.toMatch(/exception\s+when\s+others[\s\S]{0,300}record_domain_event/i);
  });

  it('covers every inventoried sensitive mutation family', () => {
    for (const table of [
      'support_payout_cases', 'case_decisions', 'case_outcomes', 'case_financial_entries',
      'loss_cases', 'loss_attribution_candidates', 'recovery_cases', 'record_match_resolutions', 'merchant_rule_versions',
      'workflow_definitions', 'rule_evaluations', 'user_permission_grants', 'merchant_users', 'merchant_api_keys',
      'evidence_download_tokens', 'evidence_packages', 'merchant_integrations', 'store_connections',
      'helpdesk_connections', 'source_orders', 'sync_jobs', 'identity_notes',
      'merchant_identity_state', 'accountability_events', 'connector_action_runs',
      'access_audit_log',
    ]) {
      expect(migration).toContain(`'${table}'`);
    }
    expect(migration).toContain('commerce_store_connections is a read-only compatibility view');
    expect(migration).not.toContain("'customer_notes'");
  });

  it('carries trusted request actor context inside the trigger transaction', () => {
    const serverClient = fs.readFileSync(
      path.join(process.cwd(), 'lib/supabase/server.ts'),
      'utf8',
    );
    for (const header of [
      'x-unauth-audit-actor-id',
      'x-unauth-audit-actor-role',
      'x-unauth-audit-correlation-id',
      'x-unauth-audit-request-ip',
    ]) {
      expect(serverClient).toContain(header);
      expect(migration).toContain(header);
    }
  });

  it('does not append a second explicit event after a trigger-backed route mutation', () => {
    const triggerBackedRoutes = [
      'app/api/transactions/[id]/dismiss/route.ts',
      'app/api/inbox/bulk-dismiss/route.ts',
      'app/api/jobs/[id]/hide/route.ts',
      'app/api/customers/[id]/status/route.ts',
      'app/api/customers/[id]/notes/route.ts',
      'app/api/customers/notes/[id]/route.ts',
      'app/api/evidence/route.ts',
      'app/api/settings/bulk-delete/route.ts',
      'app/api/settings/api-keys/route.ts',
      'app/api/settings/api-keys/[keyId]/route.ts',
      'app/api/team/route.ts',
      'app/api/team/[memberId]/route.ts',
      'app/api/team/[memberId]/permissions/route.ts',
      'app/api/settings/gorgias/support-connection/route.ts',
      'app/api/settings/gorgias/support-connection/rotate-secret/route.ts',
      'app/api/settings/gorgias/support-connection/disable/route.ts',
      'app/api/settings/freshdesk/support-connection/route.ts',
      'app/api/settings/freshdesk/support-connection/rotate-secret/route.ts',
      'app/api/settings/freshdesk/support-connection/disable/route.ts',
      'app/api/settings/woocommerce/connection/route.ts',
      'app/api/settings/woocommerce/disconnect/route.ts',
      'app/api/settings/zendesk/connection/route.ts',
      'app/api/shopify/disconnect/route.ts',
      'app/api/bigcommerce/disconnect/route.ts',
      'app/api/bigcommerce/callback/route.ts',
    ];
    for (const route of triggerBackedRoutes) {
      const source = fs.readFileSync(path.join(process.cwd(), route), 'utf8');
      expect(source).not.toContain('logAction');
      expect(source).toContain('audit:');
    }
  });

  it('reclaims expired worker leases and dead-letters the bounded final attempt', () => {
    expect(migration).toContain('domain_event_deliveries_expired_lease_idx');
    expect(migration).toContain("status = 'processing'");
    expect(migration).toContain("last_error = coalesce(last_error, 'delivery lease expired after final attempt')");
    expect(migration).toContain('d.leased_until <= now()');
  });

  it('makes the timeline immutable and delivery idempotent', () => {
    expect(migration).toContain('user_action_log is append-only');
    expect(migration).toContain(
      'create unique index if not exists user_action_log_domain_event_key\n  on public.user_action_log(domain_event_id);',
    );
    expect(migration).not.toMatch(/user_action_log_domain_event_key[\s\S]{0,100}\bwhere\b/i);
    expect(migration).toContain("'audit.action_recorded'");
    expect(migration).toContain("lower(tg_op) || ':' || gen_random_uuid()::text");
    expect(migration).not.toContain("lower(tg_op) || ':' || md5(v_row::text)");
  });

  it('retains append-only receipts for destructive account erasure', () => {
    expect(migration).toContain('account_deletion_audit_receipts');
    expect(migration).toContain('record_account_deletion_receipt');
    expect(migration).toContain('purge_merchant_audit_projection');
    expect(migration).toContain("current_setting('app.allow_audit_purge', true)");
  });

  it('stores effective/recorded time, correlation, actor type, and idempotency reference separately', () => {
    for (const field of ['actor_type', 'correlation_id', 'idempotency_reference', 'effective_at', 'recorded_at', 'meaning']) {
      expect(migration).toContain(field);
    }
  });
});
