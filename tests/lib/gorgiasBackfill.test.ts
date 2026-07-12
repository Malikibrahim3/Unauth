import type { SupabaseClient } from '@supabase/supabase-js';
import { backfillGorgiasSupportCases } from '@/lib/support/gorgias/backfill';

jest.mock('@/lib/support/gorgias/merchantApiAccess', () => ({
  getActiveGorgiasMerchantApiAccess: jest.fn(),
}));

jest.mock('@/lib/support/gorgias/registerSidebarWidget', () => ({
  gorgiasApiBaseUrl: (url: string) => `${url.replace(/\/$/, '')}/api`,
  gorgiasApiRequest: jest.fn(),
}));

jest.mock('@/lib/support/gorgias/fetchTicket', () => ({
  fetchGorgiasTicketById: jest.fn(),
}));

jest.mock('@/lib/support/gorgias/verifyStoredCredentials', () => ({
  verifyGorgiasConnectionOrMarkReconnectRequired: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/support/gorgias/reconcileDeletedTickets', () => ({
  reconcileDeletedGorgiasTickets: jest.fn().mockResolvedValue({ checked: 0, marked_deleted: 0 }),
}));

jest.mock('@/lib/support/intake/ingestSupportCase', () => ({
  ingestSupportCase: jest.fn(),
}));

const { getActiveGorgiasMerchantApiAccess } = jest.requireMock(
  '@/lib/support/gorgias/merchantApiAccess',
) as { getActiveGorgiasMerchantApiAccess: jest.Mock };

const { gorgiasApiRequest } = jest.requireMock(
  '@/lib/support/gorgias/registerSidebarWidget',
) as { gorgiasApiRequest: jest.Mock };

const { ingestSupportCase } = jest.requireMock('@/lib/support/intake/ingestSupportCase') as {
  ingestSupportCase: jest.Mock;
};

function mockSupabase() {
  const updateEq = jest.fn().mockResolvedValue({ error: null });
  const update = jest.fn().mockReturnValue({ eq: updateEq });
  const maybeSingle = jest.fn().mockResolvedValue({
    data: {
      access_token_encrypted: 'gorgias-api-credentials:token',
      provider_base_url: 'https://acme.gorgias.com',
    },
    error: null,
  });
  const selectChain = {
    eq: jest.fn().mockReturnThis(),
    maybeSingle,
  };
  return {
    from: jest.fn().mockReturnValue({ update, select: jest.fn().mockReturnValue(selectChain) }),
    updateEq,
  } as unknown as SupabaseClient;
}

describe('backfillGorgiasSupportCases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getActiveGorgiasMerchantApiAccess.mockResolvedValue({
      providerBaseUrl: 'https://acme.gorgias.com',
      credentials: { email: 'agent@acme.com', api_key: 'key' },
    });
    ingestSupportCase.mockResolvedValue({ external_case_id: '1' });
  });

  it('ingests tickets within the lookback window and stops at older tickets', async () => {
    const recent = new Date();
    const old = new Date();
    old.setFullYear(old.getFullYear() - 3);

    gorgiasApiRequest
      .mockResolvedValueOnce({
        data: [
          { id: 101, created_datetime: recent.toISOString(), subject: 'Refund', messages: [] },
          { id: 102, created_datetime: old.toISOString(), subject: 'Old', messages: [] },
        ],
        meta: { next_cursor: null },
      });

    const supabase = mockSupabase();
    const result = await backfillGorgiasSupportCases({
      supabase,
      merchantId: 'merchant-1',
      providerConnectionId: 'conn-1',
      shopDomain: 'acme.myshopify.com',
    });

    expect(result.tickets_listed).toBe(2);
    expect(result.ingested).toBe(1);
    expect(ingestSupportCase).toHaveBeenCalledTimes(1);
    expect(ingestSupportCase).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        merchant_id: 'merchant-1',
        provider: 'gorgias',
        event_type: 'ticket_backfill',
        shop_domain: 'acme.myshopify.com',
      }),
    );
  });

  it('paginates with cursor until next_cursor is empty', async () => {
    const recent = new Date().toISOString();
    gorgiasApiRequest
      .mockResolvedValueOnce({
        data: [{ id: 1, created_datetime: recent, subject: 'A', messages: [] }],
        meta: { next_cursor: 'cursor-2' },
      })
      .mockResolvedValueOnce({
        data: [{ id: 2, created_datetime: recent, subject: 'B', messages: [] }],
        meta: { next_cursor: null },
      });

    const result = await backfillGorgiasSupportCases({
      supabase: mockSupabase(),
      merchantId: 'merchant-1',
      providerConnectionId: 'conn-1',
    });

    expect(gorgiasApiRequest).toHaveBeenCalledTimes(2);
    expect(result.ingested).toBe(2);
  });
});
