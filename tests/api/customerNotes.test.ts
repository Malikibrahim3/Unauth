import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));

jest.mock('@/lib/permissions', () => ({
  PERMISSIONS: { VIEW_CUSTOMERS: 'view_customers', ADD_CUSTOMER_NOTE: 'add_customer_note' },
  requirePermission: jest.fn(),
}));

jest.mock('@/lib/customers/identityNetwork', () => ({
  resolveIdentityForCustomerRouteId: jest.fn(),
}));

jest.mock('@/lib/log', () => ({
  withRequestLogging: (_path: string, handler: unknown) => handler,
}));

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/permissions';
import { resolveIdentityForCustomerRouteId } from '@/lib/customers/identityNetwork';
import { GET } from '@/app/api/customers/[id]/notes/route';

const MERCHANT_ID = '00000000-0000-4000-8000-000000000001';
const CUSTOMER_ID = 'd1300000-0000-4000-8000-000000000000';

describe('GET /api/customers/[id]/notes', () => {
  const order = jest.fn().mockResolvedValue({
    data: [{ id: 'note-1', body: 'Review return inspection', created_at: '2026-08-24T12:00:00Z' }],
    error: null,
  });
  const is = jest.fn(() => ({ order }));
  const eqIdentity = jest.fn(() => ({ is }));
  const eqMerchant = jest.fn(() => ({ eq: eqIdentity }));
  const select = jest.fn(() => ({ eq: eqMerchant }));
  const service = { from: jest.fn(() => ({ select })) };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    });
    (createServiceClient as jest.Mock).mockReturnValue(service);
    (requirePermission as jest.Mock).mockResolvedValue({
      denied: null,
      ctx: { merchantId: MERCHANT_ID, userId: 'user-1' },
    });
  });

  it('loads notes for a merchant-scoped canonical customer route id', async () => {
    (resolveIdentityForCustomerRouteId as jest.Mock).mockResolvedValue({
      customer: { id: CUSTOMER_ID },
      identityId: 'identity-1',
    });

    const response = await GET(
      new NextRequest(`http://localhost/api/customers/${CUSTOMER_ID}/notes`),
      { params: Promise.resolve({ id: CUSTOMER_ID }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      notes: [{ id: 'note-1', body: 'Review return inspection', created_at: '2026-08-24T12:00:00Z' }],
    });
    expect(resolveIdentityForCustomerRouteId).toHaveBeenCalledWith(
      service,
      MERCHANT_ID,
      CUSTOMER_ID,
    );
  });

  it('returns an honest empty note list when the canonical customer has no identity yet', async () => {
    (resolveIdentityForCustomerRouteId as jest.Mock).mockResolvedValue({
      customer: { id: CUSTOMER_ID },
      identityId: null,
    });

    const response = await GET(
      new NextRequest(`http://localhost/api/customers/${CUSTOMER_ID}/notes`),
      { params: Promise.resolve({ id: CUSTOMER_ID }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ notes: [] });
  });

  it('returns 404 when the customer route id is outside merchant scope', async () => {
    (resolveIdentityForCustomerRouteId as jest.Mock).mockResolvedValue({
      customer: null,
      identityId: null,
    });

    const response = await GET(
      new NextRequest(`http://localhost/api/customers/${CUSTOMER_ID}/notes`),
      { params: Promise.resolve({ id: CUSTOMER_ID }) },
    );

    expect(response.status).toBe(404);
  });
});
