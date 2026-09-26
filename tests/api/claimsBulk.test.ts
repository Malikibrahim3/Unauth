import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));
jest.mock('@/lib/permissions', () => ({
  PERMISSIONS: { SUBMIT_PAYOUT_DECISIONS: 'submit_payout_decisions' },
  requirePermission: jest.fn(),
}));

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/permissions';
import { POST } from '@/app/api/claims/bulk/route';

const USER_ID = '10000000-0000-4000-8000-000000000001';
const MERCHANT_ID = '10000000-0000-4000-8000-000000000010';
const CASE_ID = '10000000-0000-4000-8000-000000000011';

function request(body: unknown, idempotencyKey = 'bulk-test-key') {
  return new NextRequest('http://localhost/api/claims/bulk', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
    body: JSON.stringify(body),
  });
}

function chain(result: unknown) {
  const query: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'in']) query[method] = jest.fn(() => query);
  query.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject);
  return query;
}

function setup(options: { claims?: unknown[]; rpc?: { data: unknown; error: unknown } } = {}) {
  const rpc = jest.fn().mockResolvedValue(options.rpc ?? { data: null, error: { code: '42883', message: 'function bulk_transition_payout_cases does not exist' } });
  const service = {
    from: jest.fn(() => chain({ data: options.claims ?? [{ id: CASE_ID, merchant_id: MERCHANT_ID, state_version: 1, status: 'open', snoozed_until: null }], error: null })),
    rpc,
  };
  (createClient as jest.Mock).mockReturnValue({ auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }) } });
  (createServiceClient as jest.Mock).mockReturnValue(service);
  (requirePermission as jest.Mock).mockResolvedValue({ denied: null, ctx: { merchantId: MERCHANT_ID, userId: USER_ID, role: 'owner' } });
  return { service, rpc };
}

describe('POST /api/claims/bulk', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requires an idempotency key before opening the service client', async () => {
    (createClient as jest.Mock).mockReturnValue({ auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }) } });
    const response = await POST(request({ action: 'assign', items: [{ caseId: CASE_ID, expectedStateVersion: 1, assignment: 'assign_to_me' }] }, ''));
    expect(response.status).toBe(400);
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it('rejects stale items without invoking the write RPC', async () => {
    const { rpc } = setup();
    const response = await POST(request({ action: 'assign', items: [{ caseId: CASE_ID, expectedStateVersion: 2, assignment: 'assign_to_me' }] }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ writesPerformed: 0, code: 'bulk_preflight_failed' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('fails closed when the reviewed atomic database capability is absent', async () => {
    const { rpc } = setup();
    const response = await POST(request({ action: 'assign', items: [{ caseId: CASE_ID, expectedStateVersion: 1, assignment: 'assign_to_me' }] }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ writesPerformed: 0, code: 'bulk_action_not_built' });
    expect(rpc).toHaveBeenCalledWith('bulk_transition_payout_cases', expect.objectContaining({ p_merchant_id: MERCHANT_ID, p_action: 'assign' }));
  });
});
