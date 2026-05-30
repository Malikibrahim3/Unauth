import { resolveWidgetCustomerIdentity } from '@/lib/gorgias/resolveWidgetCustomerIdentity';

jest.mock('@/lib/support/gorgias/fetchTicket', () => ({
  fetchGorgiasTicketById: jest.fn(),
}));

jest.mock('@/lib/support/gorgias/merchantApiAccess', () => ({
  getActiveGorgiasMerchantApiAccess: jest.fn(),
}));

const { fetchGorgiasTicketById } = jest.requireMock('@/lib/support/gorgias/fetchTicket') as {
  fetchGorgiasTicketById: jest.Mock;
};

const { getActiveGorgiasMerchantApiAccess } = jest.requireMock(
  '@/lib/support/gorgias/merchantApiAccess'
) as {
  getActiveGorgiasMerchantApiAccess: jest.Mock;
};

describe('resolveWidgetCustomerIdentity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts a non-agent ticket sender even when it matches the Gorgias API credential email', async () => {
    getActiveGorgiasMerchantApiAccess.mockResolvedValue({
      providerBaseUrl: 'https://unauth.gorgias.com',
      credentials: {
        email: 'simeonmurray123@gmail.com',
        api_key: 'redacted',
      },
    });
    fetchGorgiasTicketById.mockResolvedValue({
      id: '63300918',
      customer: { email: 'simeonmurray123@gmail.com' },
      messages: [
        {
          from_agent: false,
          sender: { email: 'simeonmurray123@gmail.com' },
          body_text: "Hi, I still haven't received order #1008.",
        },
      ],
    });

    const identity = await resolveWidgetCustomerIdentity({} as never, {
      merchantId: 'merchant-1',
      emailParam: 'simeonmurray123@gmail.com',
      customerEmailParam: 'simeonmurray123@gmail.com',
      ticketIdParam: '63300918',
    });

    expect(identity).toEqual({
      rawEmail: 'simeonmurray123@gmail.com',
      source: 'gorgias_ticket_api',
      ticketId: '63300918',
      identityUnresolved: false,
    });
    expect(fetchGorgiasTicketById).toHaveBeenCalledWith({
      providerBaseUrl: 'https://unauth.gorgias.com',
      credentials: {
        email: 'simeonmurray123@gmail.com',
        api_key: 'redacted',
      },
      ticketId: '63300918',
    });
  });
});
