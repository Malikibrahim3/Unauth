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
  verifyGorgiasConnection: jest.fn(),
  persistLiveVerification: jest.fn().mockResolvedValue(undefined),
}));

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/permissions';
import { verifyGorgiasConnection, persistLiveVerification } from '@/lib/connections/liveVerification';
import { GET } from '@/app/api/settings/gorgias/support-connection/verify/route';

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

describe('GET /api/settings/gorgias/support-connection/verify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects an unauthenticated caller with 401', async () => {
    setupAuth(false);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, reason: 'unauthorized' });
    expect(verifyGorgiasConnection).not.toHaveBeenCalled();
  });

  it('reports not_connected when no row exists for the caller\'s merchant', async () => {
    setupAuth(true);
    setupPermission(MERCHANT_A);
    (createServiceClient as jest.Mock).mockReturnValue(
      createFakeSupabaseClient({ helpdesk_connections: [] }),
    );
    const res = await GET();
    expect(await res.json()).toEqual({ ok: false, reason: 'not_connected' });
  });

  it('only ever checks the caller\'s own merchant row, never another merchant\'s', async () => {
    setupAuth(true);
    setupPermission(MERCHANT_A);
    (createServiceClient as jest.Mock).mockReturnValue(
      createFakeSupabaseClient({
        helpdesk_connections: [
          { id: 'conn-b', merchant_id: MERCHANT_B, provider: 'gorgias', provider_base_url: 'b.gorgias.com', access_token_encrypted: 'x', status: 'active', updated_at: '2026-01-01T00:00:00Z' },
        ],
      }),
    );
    const res = await GET();
    expect(await res.json()).toEqual({ ok: false, reason: 'not_connected' });
    expect(verifyGorgiasConnection).not.toHaveBeenCalled();
  });

  it('returns ok:true and persists verification on a successful check', async () => {
    setupAuth(true);
    setupPermission(MERCHANT_A);
    (createServiceClient as jest.Mock).mockReturnValue(
      createFakeSupabaseClient({
        helpdesk_connections: [
          { id: 'conn-a', merchant_id: MERCHANT_A, provider: 'gorgias', provider_base_url: 'a.gorgias.com', access_token_encrypted: 'x', status: 'active', updated_at: '2026-01-01T00:00:00Z' },
        ],
      }),
    );
    (verifyGorgiasConnection as jest.Mock).mockResolvedValue({ status: 'verified' });
    const res = await GET();
    expect(await res.json()).toEqual({ ok: true });
    expect(persistLiveVerification).toHaveBeenCalledWith(
      expect.anything(),
      'helpdesk_connections',
      MERCHANT_A,
      'conn-a',
      'active',
      { status: 'verified' },
    );
  });

  it('reports a hard credential failure with its reason, unsanitized at the route layer', async () => {
    setupAuth(true);
    setupPermission(MERCHANT_A);
    (createServiceClient as jest.Mock).mockReturnValue(
      createFakeSupabaseClient({
        helpdesk_connections: [
          { id: 'conn-a', merchant_id: MERCHANT_A, provider: 'gorgias', provider_base_url: 'a.gorgias.com', access_token_encrypted: 'x', status: 'active', updated_at: '2026-01-01T00:00:00Z' },
        ],
      }),
    );
    (verifyGorgiasConnection as jest.Mock).mockResolvedValue({ status: 'failed', reason: 'decrypt_failed' });
    const res = await GET();
    expect(await res.json()).toEqual({ ok: false, reason: 'decrypt_failed' });
  });
});
