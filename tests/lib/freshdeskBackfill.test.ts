import type { SupabaseClient } from '@supabase/supabase-js';
import { backfillFreshdeskSupportCases } from '@/lib/support/freshdesk/backfill';

jest.mock('@/lib/support/freshdesk/merchantApiAccess', () => ({
  getActiveFreshdeskMerchantApiAccess: jest.fn(),
}));

jest.mock('@/lib/support/freshdesk/freshdeskApi', () => ({
  fetchFreshdeskTicketById: jest.fn(),
  freshdeskApiRequest: jest.fn(),
}));

jest.mock('@/lib/support/intake/ingestSupportCase', () => ({
  ingestSupportCase: jest.fn(),
}));

const { getActiveFreshdeskMerchantApiAccess } = jest.requireMock(
  '@/lib/support/freshdesk/merchantApiAccess',
) as { getActiveFreshdeskMerchantApiAccess: jest.Mock };

const { freshdeskApiRequest, fetchFreshdeskTicketById } = jest.requireMock(
  '@/lib/support/freshdesk/freshdeskApi',
) as { freshdeskApiRequest: jest.Mock; fetchFreshdeskTicketById: jest.Mock };

const { ingestSupportCase } = jest.requireMock('@/lib/support/intake/ingestSupportCase') as {
  ingestSupportCase: jest.Mock;
};

function mockSupabase() {
  const updateEq = jest.fn().mockResolvedValue({ error: null });
  const update = jest.fn().mockReturnValue({ eq: updateEq });
  return {
    from: jest.fn().mockReturnValue({ update }),
    updateEq,
  } as unknown as SupabaseClient;
}

function freshdeskTicket(id: number, createdAt: string): Record<string, unknown> {
  return {
    id,
    created_at: createdAt,
    updated_at: createdAt,
    subject: `Ticket ${id}`,
    description_text: 'Missing order',
    requester: { email: `customer-${id}@example.com` },
  };
}

describe('backfillFreshdeskSupportCases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getActiveFreshdeskMerchantApiAccess.mockResolvedValue({
      providerBaseUrl: 'https://acme.freshdesk.com',
      credentials: { api_key: 'freshdesk-key' },
    });
    ingestSupportCase.mockResolvedValue({ external_case_id: '1' });
  });

  it('ingests tickets within the lookback window and stops at older tickets', async () => {
    const recent = new Date();
    const old = new Date();
    old.setFullYear(old.getFullYear() - 3);

    freshdeskApiRequest.mockResolvedValueOnce([
      freshdeskTicket(101, recent.toISOString()),
      freshdeskTicket(102, old.toISOString()),
    ]);

    const supabase = mockSupabase();
    const result = await backfillFreshdeskSupportCases({
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
        provider: 'freshdesk',
        event_type: 'ticket_backfill',
        shop_domain: 'acme.myshopify.com',
      }),
    );
  });

  it('paginates through Freshdesk tickets while pages are full', async () => {
    const recent = new Date().toISOString();
    freshdeskApiRequest
      .mockResolvedValueOnce(Array.from({ length: 100 }, (_, index) => freshdeskTicket(index + 1, recent)))
      .mockResolvedValueOnce([freshdeskTicket(101, recent)]);

    const result = await backfillFreshdeskSupportCases({
      supabase: mockSupabase(),
      merchantId: 'merchant-1',
      providerConnectionId: 'conn-1',
    });

    expect(freshdeskApiRequest).toHaveBeenCalledTimes(2);
    expect(freshdeskApiRequest.mock.calls[0][1]).toContain('page=1');
    expect(freshdeskApiRequest.mock.calls[1][1]).toContain('page=2');
    expect(result.ingested).toBe(101);
  });

  it('hydrates sparse list tickets before ingesting', async () => {
    const recent = new Date().toISOString();
    freshdeskApiRequest.mockResolvedValueOnce([{ id: 7, created_at: recent }]);
    fetchFreshdeskTicketById.mockResolvedValueOnce(freshdeskTicket(7, recent));

    await backfillFreshdeskSupportCases({
      supabase: mockSupabase(),
      merchantId: 'merchant-1',
      providerConnectionId: 'conn-1',
    });

    expect(fetchFreshdeskTicketById).toHaveBeenCalledWith({
      providerBaseUrl: 'https://acme.freshdesk.com',
      apiKey: 'freshdesk-key',
      ticketId: '7',
    });
    expect(ingestSupportCase).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        raw: expect.objectContaining({ id: 7, description_text: 'Missing order' }),
      }),
    );
  });
});
