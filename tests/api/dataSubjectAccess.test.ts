import { NextRequest, NextResponse } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));
jest.mock('@/lib/permissions', () => ({
  PERMISSIONS: { BULK_DELETE: 'bulk_delete' },
  requirePermission: jest.fn(),
}));
jest.mock('@/lib/ratelimit', () => ({ getClientIp: jest.fn(() => '192.0.2.5') }));

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/permissions';
import { GET } from '@/app/api/settings/data-subject-access/route';

const USER_ID = '10000000-0000-4000-8000-000000000001';
const MERCHANT_ID = '10000000-0000-4000-8000-000000000010';
const SUBJECT_ID = '10000000-0000-4000-8000-000000000011';

function request(subjectId = SUBJECT_ID) {
  return new NextRequest(`http://localhost/api/settings/data-subject-access?subjectId=${subjectId}`);
}

function setup(options: { authenticated?: boolean; denied?: boolean; rpcError?: { code?: string; message: string } } = {}) {
  const rpc = jest.fn().mockResolvedValue(options.rpcError
    ? { data: null, error: options.rpcError }
    : { data: { contract_version: 1, subject: { id: SUBJECT_ID }, cases: [] }, error: null });
  const service = { rpc };
  (createClient as jest.Mock).mockReturnValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: options.authenticated === false ? null : { id: USER_ID } } }) },
  });
  (createServiceClient as jest.Mock).mockReturnValue(service);
  (requirePermission as jest.Mock).mockResolvedValue(options.denied
    ? { denied: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), ctx: null }
    : { denied: null, ctx: { merchantId: MERCHANT_ID, userId: USER_ID, role: 'owner' } });
  return { rpc };
}

describe('GET /api/settings/data-subject-access', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects unauthenticated callers before creating a service client', async () => {
    setup({ authenticated: false });
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it('requires permission and a canonical UUID', async () => {
    setup({ denied: true });
    expect((await GET(request())).status).toBe(403);

    jest.clearAllMocks();
    setup();
    expect((await GET(request('not-an-id'))).status).toBe(400);
  });

  it('exports only the authenticated merchant subject as a non-cacheable attachment', async () => {
    const { rpc } = setup();
    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('content-disposition')).toBe(`attachment; filename="subject-access-${SUBJECT_ID}.json"`);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(rpc).toHaveBeenCalledWith('export_merchant_data_subject_v1', {
      p_merchant_id: MERCHANT_ID,
      p_subject_id: SUBJECT_ID,
      p_requested_by: USER_ID,
    });
    expect(createServiceClient).toHaveBeenLastCalledWith({
      audit: expect.objectContaining({ actorId: USER_ID, actorRole: 'owner', requestIp: '192.0.2.5' }),
    });
  });

  it('does not reveal whether the subject belongs to another merchant', async () => {
    setup({ rpcError: { code: 'P0002', message: 'subject_not_found' } });
    const response = await GET(request());
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Customer not found in this workspace.' });
  });
});
