import type { SupabaseClient } from '@supabase/supabase-js';
import { backfillZendeskSupportCases } from '@/lib/support/zendesk/backfill';

jest.mock('@/lib/support/zendesk/merchantApiAccess', () => ({
  getActiveZendeskMerchantApiAccess: jest.fn(),
}));

jest.mock('@/lib/support/zendesk/zendeskApi', () => ({
  zendeskApiRequest: jest.fn(),
}));

jest.mock('@/lib/support/zendesk/fetchTicket', () => ({
  fetchZendeskTicketWithComments: jest.fn(),
}));

jest.mock('@/lib/support/intake/ingestSupportCase', () => ({
  ingestSupportCase: jest.fn(),
}));

const { getActiveZendeskMerchantApiAccess } = jest.requireMock(
  '@/lib/support/zendesk/merchantApiAccess',
) as { getActiveZendeskMerchantApiAccess: jest.Mock };

const { zendeskApiRequest } = jest.requireMock('@/lib/support/zendesk/zendeskApi') as {
  zendeskApiRequest: jest.Mock;
};

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

describe('backfillZendeskSupportCases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getActiveZendeskMerchantApiAccess.mockResolvedValue({
      connectionId: 'conn-1',
      providerBaseUrl: 'https://acme.zendesk.com',
      credentials: { email: 'agent@acme.com', api_token: 'token' },
    });
    ingestSupportCase.mockResolvedValue({ external_case_id: '1' });
  });

  it('ingests tickets from search results within the lookback window', async () => {
    const recent = new Date().toISOString();
    zendeskApiRequest.mockResolvedValueOnce({
      results: [
        { id: 101, created_at: recent, description: 'Missing order', comments: [] },
      ],
      next_page: null,
    });

    const result = await backfillZendeskSupportCases({
      supabase: mockSupabase(),
      merchantId: 'merchant-1',
      providerConnectionId: 'conn-1',
    });

    expect(result.ingested).toBe(1);
    expect(ingestSupportCase).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        provider: 'zendesk',
        event_type: 'ticket_backfill',
      }),
    );
  });
});
