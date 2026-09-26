import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn(), createServiceClient: jest.fn() }));
jest.mock('@/lib/permissions', () => ({
  PERMISSIONS: { VIEW_AUDIT: 'view_audit' },
  requirePermission: jest.fn(),
}));
jest.mock('@/lib/product/requireEntitlement', () => ({ merchantHasEntitlement: jest.fn() }));
jest.mock('@/lib/reporting/intelligence', () => ({
  REPORT_RANGES: ['7d', '30d', '90d', 'all'],
  normalizeReportTimezone: (value: string) => value,
  loadIntelligenceReport: jest.fn(),
}));

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/permissions';
import { merchantHasEntitlement } from '@/lib/product/requireEntitlement';
import { loadIntelligenceReport } from '@/lib/reporting/intelligence';
import { POST } from '@/app/api/reports/runs/route';

const USER_ID = '10000000-0000-4000-8000-000000000001';
const MERCHANT_ID = '10000000-0000-4000-8000-000000000010';
const report = {
  range: '30d', timezone: 'Europe/London', generatedAt: '2026-08-31T12:00:00.000Z',
  bridges: [{ currency: 'GBP' }], trend: [], causes: [], operations: [], recoveries: [], coverage: [],
  reconciliation: { ok: true, issues: [], confidence: { state: 'complete', issueCount: 0, affectedCurrencies: [], affectedMetrics: [], excludedRecordCount: 0, currencyExcludedRecordCount: 0, unreconciledExcludedRecordCount: 0 } },
  recordCount: 218,
};

function request(body: unknown, key = 'report-run-test-key') {
  return new NextRequest('http://localhost/api/reports/runs', {
    method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': key }, body: JSON.stringify(body),
  });
}

function setup(rpcResult: { data: unknown; error: unknown } = { data: { run: { id: 'run-1' }, auditReceipt: { domainEventId: 'event-1' }, replayed: false, writesPerformed: 1 }, error: null }) {
  const rpc = jest.fn().mockResolvedValue(rpcResult);
  (createClient as jest.Mock).mockReturnValue({ auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }) } });
  (createServiceClient as jest.Mock).mockReturnValue({ rpc });
  (requirePermission as jest.Mock).mockResolvedValue({ denied: null, ctx: { merchantId: MERCHANT_ID } });
  (merchantHasEntitlement as jest.Mock).mockResolvedValue(true);
  (loadIntelligenceReport as jest.Mock).mockResolvedValue(report);
  return rpc;
}

describe('POST /api/reports/runs', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requires an idempotency key before opening the service client', async () => {
    (createClient as jest.Mock).mockReturnValue({ auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }) } });
    const response = await POST(request({ reportId: 'financial', range: '30d', timezone: 'Europe/London', currency: 'GBP', measure: 'amount' }, ''));
    expect(response.status).toBe(400);
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it('persists the exact on-demand scope with delivery disabled', async () => {
    const rpc = setup();
    const response = await POST(request({ reportId: 'financial', range: '30d', timezone: 'Europe/London', currency: 'GBP', measure: 'amount' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ writesPerformed: 1, deliveryEnabled: false, auditReceipt: { domainEventId: 'event-1' } });
    expect(rpc).toHaveBeenCalledWith('record_report_run_snapshot', expect.objectContaining({
      p_merchant_id: MERCHANT_ID,
      p_report_definition_id: 'financial',
      p_scope: { range: '30d', timezone: 'Europe/London', currency: 'GBP', measure: 'amount' },
      p_record_count: 218,
    }));
  });

  it('fails closed when immutable report storage is absent', async () => {
    setup({ data: null, error: { message: 'function record_report_run_snapshot does not exist' } });
    const response = await POST(request({ reportId: 'financial', range: '30d', timezone: 'Europe/London', currency: 'GBP', measure: 'amount' }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'report_runs_not_built', writesPerformed: 0, deliveryEnabled: false });
  });
});
