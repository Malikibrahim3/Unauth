import { createFakeSupabaseClient } from '../helpers/fakeSupabaseClient';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));

jest.mock('@/lib/permissions', () => ({
  PERMISSIONS: { VIEW_INBOX: 'view_inbox' },
  requirePermission: jest.fn(),
}));

jest.mock('@/lib/connections/liveVerification', () => ({
  ...jest.requireActual('@/lib/connections/liveVerification'),
  verifyShopifyConnection: jest.fn(),
  persistLiveVerification: jest.fn().mockResolvedValue(undefined),
}));

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/permissions';
import { verifyShopifyConnection, persistLiveVerification } from '@/lib/connections/liveVerification';
import { GET } from '@/app/api/shopify/verify/route';

function setupAuth(ok: boolean) {
  (createClient as jest.Mock).mockReturnValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: ok ? { id: 'user-1' } : null } }) },
  });
}

function setupPermission(merchantId: string | null) {
  (requirePermission as jest.Mock).mockResolvedValue(
    merchantId
      ? { denied: null, ctx: { merchantId, userId: 'user-1' } }
      : { denied: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }), ctx: null },
  );
}

const MERCHANT_A = 'merchant-a';
const MERCHANT_B = 'merchant-b';

describe('GET /api/shopify/verify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects an unauthenticated caller with 401', async () => {
    setupAuth(false);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, reason: 'unauthorized' });
    expect(verifyShopifyConnection).not.toHaveBeenCalled();
  });

  it('reports not_connected when no row exists for the caller\'s merchant', async () => {
    setupAuth(true);
    setupPermission(MERCHANT_A);
    (createServiceClient as jest.Mock).mockReturnValue(
      createFakeSupabaseClient({ store_connections: [] }),
    );
    const res = await GET();
    expect(await res.json()).toEqual({ ok: false, reason: 'not_connected' });
    expect(verifyShopifyConnection).not.toHaveBeenCalled();
  });

  it('only ever checks the caller\'s own merchant row, never another merchant\'s', async () => {
    setupAuth(true);
    setupPermission(MERCHANT_A);
    (createServiceClient as jest.Mock).mockReturnValue(
      createFakeSupabaseClient({
        store_connections: [
          { id: 'conn-b', merchant_id: MERCHANT_B, platform: 'shopify', store_key: 'b.myshopify.com', credentials_encrypted: 'x', status: 'active', installed_at: '2026-01-01T00:00:00Z' },
        ],
      }),
    );
    (verifyShopifyConnection as jest.Mock).mockResolvedValue({ status: 'verified' });
    const res = await GET();
    // Merchant A has no row of their own — merchant B's row must never surface.
    expect(await res.json()).toEqual({ ok: false, reason: 'not_connected' });
    expect(verifyShopifyConnection).not.toHaveBeenCalled();
  });

  it('returns ok:true and persists verification on a successful check', async () => {
    setupAuth(true);
    setupPermission(MERCHANT_A);
    (createServiceClient as jest.Mock).mockReturnValue(
      createFakeSupabaseClient({
        store_connections: [
          { id: 'conn-a', merchant_id: MERCHANT_A, platform: 'shopify', store_key: 'a.myshopify.com', credentials_encrypted: 'x', status: 'active', installed_at: '2026-01-01T00:00:00Z' },
        ],
      }),
    );
    (verifyShopifyConnection as jest.Mock).mockResolvedValue({ status: 'verified' });
    const res = await GET();
    expect(await res.json()).toEqual({ ok: true });
    expect(persistLiveVerification).toHaveBeenCalledWith(
      expect.anything(),
      'store_connections',
      MERCHANT_A,
      'conn-a',
      'active',
      { status: 'verified' },
    );
  });

  it('surfaces an inconclusive result as retryable, not a hard failure', async () => {
    setupAuth(true);
    setupPermission(MERCHANT_A);
    (createServiceClient as jest.Mock).mockReturnValue(
      createFakeSupabaseClient({
        store_connections: [
          { id: 'conn-a', merchant_id: MERCHANT_A, platform: 'shopify', store_key: 'a.myshopify.com', credentials_encrypted: 'x', status: 'active', installed_at: '2026-01-01T00:00:00Z' },
        ],
      }),
    );
    (verifyShopifyConnection as jest.Mock).mockResolvedValue({ status: 'inconclusive', reason: 'network_or_timeout' });
    const res = await GET();
    expect(await res.json()).toEqual({ ok: false, reason: 'network_or_timeout', inconclusive: true });
  });

  it('reports a hard failure with its reason', async () => {
    setupAuth(true);
    setupPermission(MERCHANT_A);
    (createServiceClient as jest.Mock).mockReturnValue(
      createFakeSupabaseClient({
        store_connections: [
          { id: 'conn-a', merchant_id: MERCHANT_A, platform: 'shopify', store_key: 'a.myshopify.com', credentials_encrypted: 'x', status: 'active', installed_at: '2026-01-01T00:00:00Z' },
        ],
      }),
    );
    (verifyShopifyConnection as jest.Mock).mockResolvedValue({ status: 'failed', reason: 'decrypt_failed' });
    const res = await GET();
    expect(await res.json()).toEqual({ ok: false, reason: 'decrypt_failed' });
  });
});
