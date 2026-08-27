import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));

jest.mock('@/lib/permissions', () => ({
  ACTIVE_MERCHANT_COOKIE: 'unauth.active_merchant',
  PERMISSIONS: { VIEW_CUSTOMERS: 'view_customers', VIEW_INBOX: 'view_inbox' },
  requirePermissionForMerchant: jest.fn().mockResolvedValue({ denied: null }),
  resolveCallerContext: jest.fn(),
  resolvePermissions: jest.fn(),
}));

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { resolveCallerContext, resolvePermissions } from '@/lib/permissions';
import { GET } from '@/app/api/search/route';

const MERCHANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const RESULT_ID = '550e8400-e29b-41d4-a716-446655440001';
const rpc = jest.fn();

function request(query = 'maya', extra = '') {
  return new NextRequest(`http://localhost/api/search?q=${encodeURIComponent(query)}${extra}`);
}

function setup(options: {
  authed?: boolean;
  context?: boolean;
  permissions?: string[];
  payload?: Record<string, unknown>;
  rpcError?: { code: string; message: string } | null;
} = {}) {
  const {
    authed = true,
    context = true,
    permissions = ['view_customers', 'view_inbox'],
    payload = {
      items: [{
        type: 'customer',
        id: RESULT_ID,
        label: 'Maya Chen',
        sublabel: 'maya@merchant.test',
        href: `/customers/${RESULT_ID}`,
        source: 'shopify',
        sortAt: '2026-08-23T10:00:00.000Z',
      }],
      counts: { all: 1, customer: 1 },
      total: 1,
      hasMore: false,
    },
    rpcError = null,
  } = options;
  (createClient as jest.Mock).mockReturnValue({
    auth: { getUser: async () => ({ data: { user: authed ? { id: 'user-1' } : null } }) },
  });
  (resolveCallerContext as jest.Mock).mockResolvedValue(context
    ? { userId: 'user-1', merchantId: MERCHANT_ID, role: 'owner', memberId: null }
    : null);
  (resolvePermissions as jest.Mock).mockResolvedValue(permissions);
  rpc.mockResolvedValue({ data: rpcError ? null : payload, error: rpcError });
  (createServiceClient as jest.Mock).mockReturnValue({ rpc });
}

describe('GET /api/search server projection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthenticated and context-free callers', async () => {
    setup({ authed: false });
    expect((await GET(request())).status).toBe(401);
    setup({ context: false });
    expect((await GET(request())).status).toBe(403);
  });

  it('returns exact counts and the canonical destination from the RPC projection', async () => {
    setup();
    const response = await GET(request('maya', '&types=customers&source=shopify'));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      total: 1,
      counts: { all: 1, customer: 1 },
      source: 'shopify',
      results: [{ type: 'customer', id: RESULT_ID, href: `/customers/${RESULT_ID}`, source: 'shopify' }],
    });
    expect(rpc).toHaveBeenCalledWith('workspace_search_page_v1', expect.objectContaining({
      p_merchant_id: MERCHANT_ID,
      p_types: ['customers'],
      p_source: 'shopify',
      p_limit: 20,
    }));
  });

  it('returns a resumable cursor only when the projection reports another row', async () => {
    setup({ payload: {
      items: [{ type: 'order', id: RESULT_ID, label: 'Order 1042', href: `/orders/${RESULT_ID}`, source: 'shopify', sortAt: '2026-08-23T10:00:00.000Z' }],
      counts: { all: 2, order: 2 }, total: 2, hasMore: true,
    } });
    const first = await GET(request('1042', '&types=orders'));
    const firstBody = await first.json();
    expect(firstBody.nextCursor).toEqual(expect.any(String));

    rpc.mockClear();
    await GET(request('1042', `&types=orders&cursor=${encodeURIComponent(firstBody.nextCursor)}`));
    expect(rpc).toHaveBeenCalledWith('workspace_search_page_v1', expect.objectContaining({
      p_cursor_id: RESULT_ID,
      p_cursor_result_type: 'order',
      p_cursor_sort_at: '2026-08-23T10:00:00.000Z',
    }));
  });

  it('rejects unsupported types, sources, and malformed cursors', async () => {
    setup();
    expect((await GET(request('value', '&types=transactions'))).status).toBe(400);
    expect((await GET(request('value', '&source=unknown'))).status).toBe(400);
    expect((await GET(request('value', '&cursor=not-a-cursor'))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('fails the complete page closed when the exact projection is unavailable', async () => {
    setup({ rpcError: { code: '42P01', message: 'projection unavailable' } });
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Workspace search is unavailable' });
  });
});
