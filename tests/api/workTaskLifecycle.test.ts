import { NextRequest, NextResponse } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));

jest.mock('@/lib/permissions', () => ({
  PERMISSIONS: { MANAGE_WORK: 'manage_work' },
  requirePermission: jest.fn(),
}));

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/permissions';
import { PATCH } from '@/app/api/work-tasks/[id]/route';
import { PATCH as PATCH_BULK_TOMBSTONE } from '@/app/api/work-tasks/bulk/route';
import { POST } from '@/app/api/external-actions/[actionId]/route';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const MERCHANT_ID = '22222222-2222-4222-8222-222222222222';
const TASK_ID = '33333333-3333-4333-8333-333333333333';
const ACTION_ID = '44444444-4444-4444-8444-444444444444';

function setup(error: string | null = null) {
  const rpc = jest.fn().mockResolvedValue(error
    ? { data: null, error: { message: error } }
    : { data: { task: { id: TASK_ID, state_version: 4 }, replayed: false }, error: null });
  (createClient as jest.Mock).mockReturnValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }) },
  });
  (createServiceClient as jest.Mock).mockReturnValue({ rpc });
  (requirePermission as jest.Mock).mockResolvedValue({
    denied: null,
    ctx: { merchantId: MERCHANT_ID, userId: USER_ID, role: 'analyst' },
  });
  return rpc;
}

function taskRequest(body: unknown, key: string | null = 'task-action-001') {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (key) headers['Idempotency-Key'] = key;
  return new NextRequest(`http://localhost/api/work-tasks/${TASK_ID}`, {
    method: 'PATCH', headers, body: JSON.stringify(body),
  });
}

describe('canonical Work lifecycle APIs', () => {
  afterEach(() => jest.clearAllMocks());

  it('passes tenant, actor, optimistic version and idempotency to the atomic task transition', async () => {
    const rpc = setup();
    const response = await PATCH(
      taskRequest({ action: 'start', expectedVersion: 3 }),
      { params: Promise.resolve({ id: TASK_ID }) },
    );
    expect(response.status).toBe(200);
    expect(requirePermission).toHaveBeenCalledWith(expect.anything(), USER_ID, 'manage_work');
    expect(rpc).toHaveBeenCalledWith('transition_work_task_v1', {
      p_merchant_id: MERCHANT_ID,
      p_task_id: TASK_ID,
      p_actor_user_id: USER_ID,
      p_action: 'start',
      p_expected_version: 3,
      p_idempotency_key: 'task-action-001',
      p_until: null,
      p_outcome: null,
      p_allow_release_other: false,
    });
  });

  it('rejects a mutation without an idempotency key before calling the database', async () => {
    const rpc = setup();
    const response = await PATCH(
      taskRequest({ action: 'complete', expectedVersion: 3 }, null),
      { params: Promise.resolve({ id: TASK_ID }) },
    );
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('fails closed for stale clients that call the retired bulk endpoint', async () => {
    const response = await PATCH_BULK_TOMBSTONE();
    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringMatching(/bulk task transitions are unavailable/i),
    });
  });

  it('returns a conflict when the optimistic version is stale', async () => {
    setup('work_task_version_conflict');
    const response = await PATCH(
      taskRequest({ action: 'start', expectedVersion: 2 }),
      { params: Promise.resolve({ id: TASK_ID }) },
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringMatching(/changed/i) });
  });

  it('records a merchant external attempt without granting source authority', async () => {
    const rpc = setup();
    rpc.mockResolvedValueOnce({ data: { action: { id: ACTION_ID, action_state: 'merchant_reported_attempt' }, replayed: false }, error: null });
    const response = await POST(
      new NextRequest(`http://localhost/api/external-actions/${ACTION_ID}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Idempotency-Key': 'external-action-001' },
        body: JSON.stringify({ expectedVersion: 1, method: 'shopify_admin', externalReference: 'refund-42' }),
      }),
      { params: Promise.resolve({ actionId: ACTION_ID }) },
    );
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('transition_external_action_v1', expect.objectContaining({
      p_merchant_id: MERCHANT_ID,
      p_action_id: ACTION_ID,
      p_actor_user_id: USER_ID,
      p_authority: 'merchant',
      p_target_state: 'merchant_reported_attempt',
      p_expected_version: 1,
      p_idempotency_key: 'external-action-001',
      p_external_reference: 'refund-42',
      p_method: 'shopify_admin',
    }));
  });

  it('honours a denied Work permission', async () => {
    setup();
    (requirePermission as jest.Mock).mockResolvedValueOnce({
      denied: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      ctx: null,
    });
    const response = await PATCH(
      taskRequest({ action: 'start', expectedVersion: 3 }),
      { params: Promise.resolve({ id: TASK_ID }) },
    );
    expect(response.status).toBe(403);
  });
});
