import { NextRequest, NextResponse } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));

jest.mock('@/lib/permissions', () => ({
  ACTIVE_MERCHANT_COOKIE: 'unauth.active_merchant',
  PERMISSIONS: { GRANT_PERMISSIONS: 'grant_permissions' },
  requirePermission: jest.fn(),
}));

jest.mock('@/lib/ratelimit', () => ({
  enforceRateLimit: jest.fn().mockResolvedValue(null),
  getClientIp: jest.fn(() => '127.0.0.1'),
  limitFromEnv: jest.fn(() => ({ limit: 6, window: 3600 })),
  rateLimitKey: jest.fn((name: string, ip: string) => `${name}:${ip}`),
}));

jest.mock('@/lib/privacy/workspaceDeletion', () => {
  class WorkspaceDeletionRunError extends Error {
    constructor(public jobId: string, public stage: string, message: string) {
      super(message);
    }
  }
  return {
    createWorkspaceDeletionJob: jest.fn(),
    getWorkspaceDeletionJob: jest.fn(),
    resumeWorkspaceDeletionJob: jest.fn(),
    WorkspaceDeletionRunError,
  };
});

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/permissions';
import {
  createWorkspaceDeletionJob,
  getWorkspaceDeletionJob,
  resumeWorkspaceDeletionJob,
  WorkspaceDeletionRunError,
} from '@/lib/privacy/workspaceDeletion';
import { GET, POST } from '@/app/api/account/delete/route';

const USER_ID = '30000000-0000-4000-8000-000000000001';
const MERCHANT_ID = '10000000-0000-4000-8000-000000000001';
const JOB_ID = '20000000-0000-4000-8000-000000000001';
const IDEMPOTENCY_KEY = '40000000-0000-4000-8000-000000000001';

function job(overrides: Record<string, unknown> = {}) {
  return {
    id: JOB_ID,
    merchant_reference: MERCHANT_ID,
    actor_user_reference: USER_ID,
    idempotency_key: IDEMPOTENCY_KEY,
    status: 'pending',
    stage: 'preflight',
    attempts: 0,
    preflight: {},
    storage_manifest: [],
    progress: {},
    verification: {},
    last_error: null,
    receipt_id: null,
    created_at: '2026-08-23T00:00:00.000Z',
    updated_at: '2026-08-23T00:00:00.000Z',
    completed_at: null,
    ...overrides,
  } as never;
}

function request(body: unknown) {
  return new NextRequest('http://localhost/api/account/delete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function setup({ authenticated = true, role = 'owner' } = {}) {
  (createClient as jest.Mock).mockReturnValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: authenticated ? { id: USER_ID } : null } }) },
  });
  (createServiceClient as jest.Mock).mockReturnValue({ service: true });
  (requirePermission as jest.Mock).mockResolvedValue({
    denied: null,
    ctx: { userId: USER_ID, merchantId: MERCHANT_ID, role },
  });
  (createWorkspaceDeletionJob as jest.Mock).mockResolvedValue(job());
  (resumeWorkspaceDeletionJob as jest.Mock).mockResolvedValue(job({
    status: 'completed',
    stage: 'completed',
    attempts: 3,
    receipt_id: '50000000-0000-4000-8000-000000000001',
    completed_at: '2026-08-23T00:05:00.000Z',
    verification: { merchant_row_absent: true, auth_identity_retained: true },
  }));
}

describe('/api/account/delete resumable workspace job', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('requires authentication and an explicit confirmation', async () => {
    setup({ authenticated: false });
    expect((await POST(request({ confirm: 'DELETE', idempotencyKey: IDEMPOTENCY_KEY }))).status).toBe(401);

    setup();
    expect((await POST(request({ confirm: 'delete', idempotencyKey: IDEMPOTENCY_KEY }))).status).toBe(400);
  });

  it('creates an owner-only idempotent job and returns its verified receipt', async () => {
    const response = await POST(request({ confirm: 'DELETE', idempotencyKey: IDEMPOTENCY_KEY }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(createWorkspaceDeletionJob).toHaveBeenCalledWith(
      expect.anything(),
      { merchantId: MERCHANT_ID, actorUserId: USER_ID, idempotencyKey: IDEMPOTENCY_KEY },
    );
    expect(resumeWorkspaceDeletionJob).toHaveBeenCalled();
    expect(body).toMatchObject({
      ok: true,
      jobId: JOB_ID,
      status: 'completed',
      stage: 'completed',
      receiptId: '50000000-0000-4000-8000-000000000001',
    });
    expect(response.cookies.get('unauth.active_merchant')).toMatchObject({ value: '' });
  });

  it('rejects a non-owner even if a bad permission fixture grants the capability', async () => {
    setup({ role: 'admin' });
    const response = await POST(request({ confirm: 'DELETE', idempotencyKey: IDEMPOTENCY_KEY }));
    expect(response.status).toBe(403);
    expect(createWorkspaceDeletionJob).not.toHaveBeenCalled();
  });

  it('resumes an actor-owned job after membership data is no longer available', async () => {
    (getWorkspaceDeletionJob as jest.Mock).mockResolvedValue(job({ status: 'failed', stage: 'database_cleanup', attempts: 2 }));
    const response = await POST(request({ confirm: 'DELETE', jobId: JOB_ID }));

    expect(response.status).toBe(200);
    expect(requirePermission).not.toHaveBeenCalled();
    expect(getWorkspaceDeletionJob).toHaveBeenCalledWith(expect.anything(), JOB_ID, USER_ID);
  });

  it('returns resumable state when a stage fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const failedJob = job({ status: 'failed', stage: 'database_cleanup', attempts: 2, last_error: 'simulated' });
    (resumeWorkspaceDeletionJob as jest.Mock).mockRejectedValue(
      new WorkspaceDeletionRunError(JOB_ID, 'database_cleanup' as never, 'simulated'),
    );
    (getWorkspaceDeletionJob as jest.Mock).mockResolvedValue(failedJob);
    const response = await POST(request({ confirm: 'DELETE', jobId: JOB_ID }));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({ resumable: true, jobId: JOB_ID, status: 'failed', stage: 'database_cleanup' });
    expect(consoleError).toHaveBeenCalledWith('[workspace-delete] resumable job failed', expect.objectContaining({ jobId: JOB_ID }));
    consoleError.mockRestore();
  });

  it('exposes status only for the authenticated job actor', async () => {
    (getWorkspaceDeletionJob as jest.Mock).mockResolvedValue(job({ status: 'failed', stage: 'storage_cleanup' }));
    const response = await GET(new NextRequest(`http://localhost/api/account/delete?jobId=${JOB_ID}`));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ jobId: JOB_ID, stage: 'storage_cleanup' });
    expect(getWorkspaceDeletionJob).toHaveBeenCalledWith(expect.anything(), JOB_ID, USER_ID);
  });
});
