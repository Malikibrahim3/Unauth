import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn(), createServiceClient: jest.fn() }));
jest.mock('@/lib/permissions', () => ({
  PERMISSIONS: { MANAGE_WORK: 'manage_work' },
  requirePermission: jest.fn(),
}));
jest.mock('@/lib/claims/externalAction', () => ({ transitionExternalAction: jest.fn() }));
jest.mock('@/lib/claims/replacement', () => ({ reportReplacementDispatch: jest.fn() }));

import { POST } from '@/app/api/external-actions/[actionId]/route';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/permissions';
import { transitionExternalAction } from '@/lib/claims/externalAction';
import { reportReplacementDispatch } from '@/lib/claims/replacement';

const userId = '11111111-1111-4111-8111-111111111111';
const merchantId = '22222222-2222-4222-8222-222222222222';

function request(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/external-actions/action-1', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'idempotency-key': 'external-action-test-1' },
    body: JSON.stringify(body),
  });
}

function setup(capabilityId: string) {
  (createClient as jest.Mock).mockReturnValue({ auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: userId } } }) } });
  (requirePermission as jest.Mock).mockResolvedValue({ denied: null, ctx: { merchantId } });
  const maybeSingle = jest.fn().mockResolvedValue({ data: { capability_id: capabilityId }, error: null });
  const chain: any = { select: () => chain, eq: () => chain, maybeSingle };
  (createServiceClient as jest.Mock).mockReturnValue({ from: () => chain });
}

describe('external action route', () => {
  beforeEach(() => jest.resetAllMocks());

  it('uses the receipt-enforcing replacement boundary for replacement handoffs', async () => {
    setup('replacement.manual_handoff');
    (reportReplacementDispatch as jest.Mock).mockResolvedValue({ action: { id: 'action-1', action_state: 'merchant_reported_attempt' }, replayed: false });
    const response = await POST(request({ expectedVersion: 1, method: 'manual_shopify_handoff', externalReference: 'R-1001' }), { params: Promise.resolve({ actionId: 'action-1' }) });
    expect(response.status).toBe(200);
    expect(reportReplacementDispatch).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      merchantId, actionId: 'action-1', expectedVersion: 1, externalReference: 'R-1001',
    }));
    expect(transitionExternalAction).not.toHaveBeenCalled();
  });

  it('retains the generic lifecycle for non-replacement handoffs', async () => {
    setup('refund.manual_handoff');
    (transitionExternalAction as jest.Mock).mockResolvedValue({ action: { id: 'action-1' }, replayed: false });
    const response = await POST(request({ expectedVersion: 1, method: 'manual_shopify_handoff', externalReference: null }), { params: Promise.resolve({ actionId: 'action-1' }) });
    expect(response.status).toBe(200);
    expect(transitionExternalAction).toHaveBeenCalled();
    expect(reportReplacementDispatch).not.toHaveBeenCalled();
  });

  it('requires a replacement reference or retained receipt', async () => {
    setup('replacement.manual_handoff');
    (reportReplacementDispatch as jest.Mock).mockRejectedValue(new Error('replacement_dispatch_receipt_required'));
    const response = await POST(request({ expectedVersion: 1, method: 'manual_shopify_handoff' }), { params: Promise.resolve({ actionId: 'action-1' }) });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain('reference or retained receipt');
  });
});
