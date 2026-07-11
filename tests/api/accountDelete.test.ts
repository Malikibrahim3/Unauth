import { NextRequest, NextResponse } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));

jest.mock('@/lib/permissions', () => ({
  PERMISSIONS: { GRANT_PERMISSIONS: 'grant_permissions' },
  requirePermission: jest.fn(),
}));

jest.mock('@/lib/ratelimit', () => ({
  enforceRateLimit: jest.fn().mockResolvedValue(null),
  getClientIp: jest.fn(() => '127.0.0.1'),
  limitFromEnv: jest.fn(() => ({ limit: 3, window: 3600 })),
  rateLimitKey: jest.fn((name: string, ip: string) => `${name}:${ip}`),
}));

import { createAdminClient, createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/permissions';
import { POST } from '@/app/api/account/delete/route';

const USER_ID = 'user-1';
const MERCHANT_ID = 'merchant-1';

type DeleteOperation =
  | { table: string; method: 'eq'; column: string; value: string }
  | { table: string; method: 'in'; column: string; values: string[] };

type MockOptions = {
  authed?: boolean;
  denied?: NextResponse | null;
  deleteErrors?: Record<string, string>;
};

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/account/delete', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function makeService(options: MockOptions = {}) {
  const deleteOperations: DeleteOperation[] = [];
  const selects: Array<{ table: string; column: string; value: string }> = [];
  const removals: Array<{ bucket: string; paths: string[] }> = [];
  const rpcCalls: Array<{ fn: string; args: unknown }> = [];

  const dataByTable: Record<string, unknown[]> = {
    csv_upload_queue: [{ storage_path: 'uploads/raw.csv' }],
    public_audits: [{ csv_path: 'public/raw.csv' }],
    evidence_packages: [{ pdf_storage_path: 'legacy/evidence.pdf' }],
    claim_evidence: [{ storage_path: 'claims/evidence.pdf' }],
    integration_documents: [{ file_path: 'docs/terms.pdf' }],
    support_payout_cases: [{ id: 'case-1' }],
    sync_jobs: [{ id: 'job-1' }],
  };

  const service = {
    deleteOperations,
    selects,
    removals,
    rpcCalls,
    from(table: string) {
      let operation: 'select' | 'delete' | null = null;
      const builder = {
        select: jest.fn(() => {
          operation = 'select';
          return builder;
        }),
        delete: jest.fn(() => {
          operation = 'delete';
          return builder;
        }),
        eq: jest.fn((column: string, value: string) => {
          if (operation === 'delete') {
            deleteOperations.push({ table, method: 'eq', column, value });
          } else {
            selects.push({ table, column, value });
          }
          return builder;
        }),
        in: jest.fn((column: string, values: string[]) => {
          if (operation === 'delete') {
            deleteOperations.push({ table, method: 'in', column, values });
          }
          return builder;
        }),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        then(resolve: (value: { data: unknown[] | null; error: { message: string } | null }) => unknown) {
          const error = operation === 'delete' && options.deleteErrors?.[table]
            ? { message: options.deleteErrors[table] }
            : null;
          return Promise.resolve(resolve({ data: operation === 'select' ? dataByTable[table] ?? [] : null, error }));
        },
      };
      return builder;
    },
    rpc: jest.fn((fn: string, args: unknown) => {
      rpcCalls.push({ fn, args });
      // PostgREST rpc builders are thenable and resolve to { data, error }.
      return {
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        then: (resolve: (v: { data: unknown; error: null }) => unknown) =>
          Promise.resolve(resolve({ data: null, error: null })),
      };
    }),
    storage: {
      from(bucket: string) {
        return {
          list: jest.fn().mockResolvedValue({ data: [], error: null }),
          remove: jest.fn((paths: string[]) => {
            removals.push({ bucket, paths });
            return Promise.resolve({ data: null, error: null });
          }),
        };
      },
    },
  };

  return service;
}

function setup(options: MockOptions = {}) {
  const { authed = true, denied = null } = options;
  const service = makeService(options);
  const deleteUser = jest.fn().mockResolvedValue({ error: null });

  (createClient as jest.Mock).mockReturnValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: authed ? { id: USER_ID } : null } }) },
  });
  (createServiceClient as jest.Mock).mockReturnValue(service);
  (createAdminClient as jest.Mock).mockReturnValue({
    auth: { admin: { deleteUser } },
  });
  (requirePermission as jest.Mock).mockResolvedValue(
    denied ? { denied, ctx: null } : { denied: null, ctx: { merchantId: MERCHANT_ID } },
  );

  return { service, deleteUser };
}

describe('POST /api/account/delete', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthenticated deletion', async () => {
    setup({ authed: false });

    const res = await POST(makeRequest({ confirm: 'DELETE' }));

    expect(res.status).toBe(401);
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it('requires explicit destructive confirmation', async () => {
    setup();

    const res = await POST(makeRequest({ confirm: 'delete' }));

    expect(res.status).toBe(400);
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it('deletes current v2 merchant-owned tables before deleting the merchant and auth user', async () => {
    const { service, deleteUser } = setup();

    const res = await POST(makeRequest({ confirm: 'DELETE' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });

    const deletedTables = service.deleteOperations.map((op) => op.table);
    expect(deletedTables).toEqual(expect.arrayContaining([
      'source_orders',
      'source_customers',
      'source_tickets',
      'source_ticket_events',
      'support_payout_cases',
      'claim_events',
      'claim_evidence',
      'claim_outcomes',
      'recovery_cases',
      'recovery_case_events',
      'partner_recovery_rules',
      'merchant_rules',
      'rule_evaluations',
      'identity_signals',
      'identity_edges',
      'identity_notes',
      'merchant_identity_state',
      'store_connections',
      'helpdesk_connections',
      'merchant_integrations',
      'integration_credentials',
      'integration_evidence_items',
      'integration_documents',
      'extracted_partner_terms',
      'evidence_download_tokens',
      'profile_view_tokens',
      'evidence_packages',
      'agreement_rule_evaluations',
      'agreement_rules',
      'agreement_clauses',
      'document_upload_jobs',
      'agreements',
      'accountability_events',
      'work_tasks',
      'recovery_tasks',
      'evidence_links',
      'loss_attribution_candidates',
      'loss_sources',
      'evidence_items',
      'category_applicability',
      'pack_confirmations',
      'sync_jobs',
      'sync_job_chunks',
      'merchant_users',
      'merchants',
      // Canonical entity model (Phase 3)
      'source_order_lines',
      'source_payments',
      'source_transactions',
      'source_replacements',
      'source_shipments',
      'source_tracking_events',
      'source_returns',
      'source_messages',
      'merchant_customers',
      'ingestion_field_errors',
    ]));
    // Source-agnostic foundation tables (incl. append-only domain_events and
    // case_financial_entries) are purged via the flag-gated RPC before the
    // generic loop deletes support_payout_cases (which they cascade from).
    expect(service.rpcCalls).toEqual(
      expect.arrayContaining([
        { fn: 'purge_merchant_source_agnostic', args: { p_merchant_id: MERCHANT_ID } },
      ]),
    );
    expect(deleteUser).toHaveBeenCalledWith(USER_ID);
  });

  it('scopes all direct v2 deletes to the authenticated merchant', async () => {
    const { service } = setup();

    await POST(makeRequest({ confirm: 'DELETE' }));

    const merchantScopedDeletes = service.deleteOperations.filter(
      (op) => op.method === 'eq' && op.column === 'merchant_id',
    );
    expect(merchantScopedDeletes.length).toBeGreaterThan(25);
    expect(merchantScopedDeletes.every((op) => op.value === MERCHANT_ID)).toBe(true);
    expect(service.deleteOperations).toContainEqual({
      table: 'claim_outcomes',
      method: 'in',
      column: 'claim_id',
      values: ['case-1'],
    });
    expect(service.deleteOperations).toContainEqual({
      table: 'sync_job_chunks',
      method: 'in',
      column: 'job_id',
      values: ['job-1'],
    });
    expect(service.deleteOperations).toContainEqual({
      table: 'merchants',
      method: 'eq',
      column: 'id',
      value: MERCHANT_ID,
    });
  });

  it('does not query dropped legacy tables or orphan-profile RPCs', async () => {
    const { service, deleteUser } = setup();

    const res = await POST(makeRequest({ confirm: 'DELETE' }));

    expect(res.status).toBe(200);
    expect(deleteUser).toHaveBeenCalledWith(USER_ID);
    const touchedTables = [
      ...service.selects.map((operation) => operation.table),
      ...service.deleteOperations.map((operation) => operation.table),
    ];
    expect(touchedTables).not.toEqual(expect.arrayContaining([
      'public_audits',
      'csv_upload_queue',
      'customer_profiles',
      'customer_profile_audit_appearances',
    ]));
    // The only RPC the purge may call is the source-agnostic purge; no legacy
    // orphan-profile RPCs.
    expect(service.rpcCalls.map((c) => c.fn)).toEqual(['purge_merchant_source_agnostic']);
  });

  it('does not delete the auth user when a current v2 cleanup table fails', async () => {
    const { deleteUser } = setup({
      deleteErrors: {
        source_orders: 'database unavailable',
      },
    });

    const res = await POST(makeRequest({ confirm: 'DELETE' }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain('Failed to delete all merchant data');
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('removes integration document storage objects as part of credential cleanup', async () => {
    const { service } = setup();

    await POST(makeRequest({ confirm: 'DELETE' }));

    expect(service.removals).toContainEqual({
      bucket: 'integration-documents',
      paths: ['docs/terms.pdf'],
    });
  });
});
