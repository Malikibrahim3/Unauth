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

const USER_ID = '11111111-1111-4111-8111-111111111111';
const MERCHANT_ID = '22222222-2222-4222-8222-222222222222';
const TASK_ID = '33333333-3333-4333-8333-333333333333';

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

it('rejects snoozing another operator task on the server without executing a transition', async () => {
  const rpc = setup();
  const query = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: { owner_user_id: 'other-user', state_version: 3 }, error: null }) };
  (createServiceClient as jest.Mock).mockReturnValue({ rpc, from: jest.fn(() => query) });
  const response = await PATCH(taskRequest({ action: 'snooze', expectedVersion: 3, until: '2099-01-01T12:00:00Z' }), { params: Promise.resolve({ id: TASK_ID }) });
  expect(response.status).toBe(403); expect(rpc).not.toHaveBeenCalled();
  expect(query.eq).toHaveBeenCalledWith('merchant_id', MERCHANT_ID);
});
it('fails closed when task ownership cannot be read', async () => {
  const rpc = setup();
  const query = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: 'unavailable' } }) };
  (createServiceClient as jest.Mock).mockReturnValue({ rpc, from: jest.fn(() => query) });
  const response = await PATCH(taskRequest({ action: 'snooze', expectedVersion: 3, until: '2099-01-01T12:00:00Z' }), { params: Promise.resolve({ id: TASK_ID }) });
  expect(response.status).toBe(503); expect(rpc).not.toHaveBeenCalled();
});
it('enforces missing manage permission before loading or updating a task', async () => {
  const rpc = setup(); (requirePermission as jest.Mock).mockResolvedValue({ denied: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), ctx: null });
  const response = await PATCH(taskRequest({ action: 'start', expectedVersion: 3 }), { params: Promise.resolve({ id: TASK_ID }) });
  expect(response.status).toBe(403); expect(rpc).not.toHaveBeenCalled();
});
