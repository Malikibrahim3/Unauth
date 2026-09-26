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
import { GET, POST } from '@/app/api/settings/data-subject-erasure/route';

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

function statusRequest(query: string) {
  return new NextRequest(`http://localhost/api/settings/data-subject-erasure?${query}`, {
    method: 'GET',
    headers: { accept: 'application/json' },
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

  it('blocks erasure before persistence when verified preview is unavailable', async () => {
    const { rpc } = setup();
    const response = await POST(request({ subjectId: SUBJECT_ID, idempotencyKey: 'request-123', confirm: 'ERASE' }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'erasure_preview_unavailable' });
    expect(rpc).not.toHaveBeenCalled();
    expect(processPrivacyStorageCleanup).not.toHaveBeenCalled();
  });
  it('does not disclose subject existence through the unavailable preview boundary', async () => {
    const { rpc } = setup({ rpcError: { code: 'P0002', message: 'subject_not_found' } });
    const response = await POST(request({ subjectId: SUBJECT_ID, idempotencyKey: 'request-123', confirm: 'ERASE' }));
    expect(response.status).toBe(409);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('retains permission denial even while preview is unavailable', async () => {
    const { rpc } = setup({ denied: true });
    expect((await POST(request({ subjectId: SUBJECT_ID, idempotencyKey: 'request-123', confirm: 'ERASE' }))).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

});

describe('GET /api/settings/data-subject-erasure', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the merchant-scoped receipt and retryable cleanup state without exposing object paths', async () => {
    setup();
    const receipt = {
      id: '10000000-0000-4000-8000-000000000099',
      subject_reference: SUBJECT_ID,
      merchant_customer_reference: SUBJECT_ID,
      scope_counts: { cases_preserved: 1 },
      effective_at: '2026-08-31T12:00:00.000Z',
      recorded_at: '2026-08-31T12:00:00.000Z',
      meaning: 'Merchant-scoped data subject erasure completed',
    };
    const jobs = [
      {
        id: '10000000-0000-4000-8000-000000000101',
        status: 'failed',
        attempts: 2,
        max_attempts: 8,
        next_attempt_at: '2026-08-31T13:00:00.000Z',
        completed_at: null,
        last_error: 'storage unavailable',
        created_at: '2026-08-31T12:00:00.000Z',
        updated_at: '2026-08-31T12:30:00.000Z',
      },
    ];
    const makeChain = (data: unknown, error: unknown = null) => {
      const result = { data, error };
      const chain: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'order', 'limit']) chain[method] = jest.fn(() => chain);
      chain.maybeSingle = jest.fn().mockResolvedValue(result);
      chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject);
      return chain;
    };
    const service = {
      from: jest.fn((table: string) => table === 'data_subject_erasure_receipts' ? makeChain(receipt) : makeChain(jobs)),
    };
    (createServiceClient as jest.Mock).mockReturnValue(service);

    const response = await GET(statusRequest(`subjectId=${SUBJECT_ID}`));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      writesPerformed: 0,
      receipt: { id: receipt.id, subject_reference: SUBJECT_ID },
      storageCleanup: {
        totalJobs: 1,
        counts: { failed: 1 },
        retryable: true,
        nextAttemptAt: '2026-08-31T13:00:00.000Z',
        lastError: 'storage unavailable',
      },
      steps: [
        { key: 'database', state: 'completed' },
        { key: 'storage', state: 'queued' },
        { key: 'backupCycle', state: 'unavailable' },
      ],
    });
    expect(JSON.stringify(body)).not.toContain('object_path');
  });
});
