import { NextRequest, NextResponse } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));
jest.mock('@/lib/permissions', () => ({
  PERMISSIONS: { BULK_DELETE: 'bulk_delete' },
  requirePermission: jest.fn(),
}));
jest.mock('@/lib/ratelimit', () => ({ getClientIp: jest.fn(() => '192.0.2.1') }));
jest.mock('@/lib/privacy/storageCleanup', () => ({ processPrivacyStorageCleanup: jest.fn() }));

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/permissions';
import { processPrivacyStorageCleanup } from '@/lib/privacy/storageCleanup';
import { POST } from '@/app/api/settings/data-subject-erasure/route';

const USER_ID = '10000000-0000-4000-8000-000000000001';
const MERCHANT_ID = '10000000-0000-4000-8000-000000000010';
const SUBJECT_ID = '10000000-0000-4000-8000-000000000011';

function request(body: unknown) {
  return new NextRequest('http://localhost/api/settings/data-subject-erasure', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function setup(options: { authenticated?: boolean; denied?: boolean; rpcError?: unknown } = {}) {
  const rpc = jest.fn().mockResolvedValue(
    options.rpcError
      ? { data: null, error: options.rpcError }
      : {
          data: {
            receipt_id: '10000000-0000-4000-8000-000000000099',
            replayed: false,
            counts: { cases_preserved: 1 },
          },
          error: null,
        },
  );
  const service = { rpc };
  (createClient as jest.Mock).mockReturnValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: options.authenticated === false ? null : { id: USER_ID } },
      }),
    },
  });
  (createServiceClient as jest.Mock).mockReturnValue(service);
  (requirePermission as jest.Mock).mockResolvedValue(
    options.denied
      ? { denied: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), ctx: null }
      : { denied: null, ctx: { merchantId: MERCHANT_ID, userId: USER_ID, role: 'owner' } },
  );
  (processPrivacyStorageCleanup as jest.Mock).mockResolvedValue({ claimed: 1, completed: 1, failed: 0 });
  return { rpc };
}

describe('POST /api/settings/data-subject-erasure', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects unauthenticated callers before opening a service client', async () => {
    setup({ authenticated: false });
    const response = await POST(request({ subjectId: SUBJECT_ID, idempotencyKey: 'request-123', confirm: 'ERASE' }));
    expect(response.status).toBe(401);
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it('requires the destructive confirmation and a canonical UUID', async () => {
    setup();
    const response = await POST(request({ subjectId: 'not-an-id', idempotencyKey: 'request-123', confirm: 'erase' }));
    expect(response.status).toBe(400);
  });

  it('passes only the authenticated merchant and actor to the service-only RPC', async () => {
    const { rpc } = setup();
    const response = await POST(request({ subjectId: SUBJECT_ID, idempotencyKey: 'request-123', confirm: 'ERASE' }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('erase_release1_merchant_data_subject', expect.objectContaining({
      p_merchant_id: MERCHANT_ID,
      p_subject_id: SUBJECT_ID,
      p_actor_user_id: USER_ID,
      p_idempotency_key: 'request-123',
    }));
    expect(processPrivacyStorageCleanup).toHaveBeenCalledWith(
      expect.anything(),
      { receiptId: '10000000-0000-4000-8000-000000000099' },
    );
  });

  it('does not disclose a customer belonging to another merchant', async () => {
    setup({ rpcError: { code: 'P0002', message: 'subject_not_found' } });
    const response = await POST(request({ subjectId: SUBJECT_ID, idempotencyKey: 'request-123', confirm: 'ERASE' }));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Customer not found in this workspace.' });
  });

  it('returns a durable database success while making deferred Storage cleanup explicit', async () => {
    setup();
    (processPrivacyStorageCleanup as jest.Mock).mockRejectedValueOnce(new Error('storage unavailable'));
    const response = await POST(request({ subjectId: SUBJECT_ID, idempotencyKey: 'request-123', confirm: 'ERASE' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      storageCleanup: null,
      storageCleanupError: 'Storage cleanup remains queued for retry.',
    });
  });
});
