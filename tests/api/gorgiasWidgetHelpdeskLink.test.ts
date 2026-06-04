import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: jest.fn(),
}));

jest.mock('@/lib/api/widgetTokens', () => ({
  validateWidgetToken: jest.fn(),
}));

jest.mock('@/lib/support/gorgias/settingsConnection', () => ({
  getMerchantGorgiasSupportConnection: jest.fn(),
}));

jest.mock('@/lib/gorgias/widgetData', () => ({
  buildGorgiasClaimWidgetData: jest.fn(),
}));

jest.mock('@/lib/gorgias/resolveWidgetCustomerIdentity', () => ({
  resolveWidgetCustomerIdentity: jest.fn(),
}));

jest.mock('@/lib/billing/contextCredits', () => ({
  getContextCreditSnapshot: jest.fn().mockResolvedValue({ tier: 'pro', allowance: 100 }),
  CONTEXT_UNLOCK_CTA_LABELS: {
    basic_context: 'Basic',
    full_context: 'Full',
    evidence_summary: 'Evidence',
  },
}));

import { createServiceClient } from '@/lib/supabase/server';
import { validateWidgetToken } from '@/lib/api/widgetTokens';
import { getMerchantGorgiasSupportConnection } from '@/lib/support/gorgias/settingsConnection';
import { resolveWidgetCustomerIdentity } from '@/lib/gorgias/resolveWidgetCustomerIdentity';
import { GET } from '@/app/api/gorgias/widget/route';

const MERCHANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const WIDGET_TOKEN = 'unauth_wt_abcd1234567890abcd1234567890ab';

describe('GET /api/gorgias/widget helpdesk link', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createServiceClient as jest.Mock).mockReturnValue({});
    (validateWidgetToken as jest.Mock).mockResolvedValue({
      merchantId: MERCHANT_ID,
      apiKeyId: 'key-1',
      tokenId: 'token-1',
    });
  });

  it('returns helpdesk_disconnected when no active credentialed connection', async () => {
    (getMerchantGorgiasSupportConnection as jest.Mock).mockResolvedValue({
      id: 'conn-1',
      status: 'active',
      gorgias_api_configured: false,
      sidebar_widget_registered: false,
    });

    const res = await GET(
      new NextRequest(
        `http://localhost/api/gorgias/widget?widget_token=${WIDGET_TOKEN}&email=agent@example.com`,
      ),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.claims).toBe('Reconnect Gorgias');
  });

  it('does not return helpdesk_disconnected when helpdesk is linked', async () => {
    (getMerchantGorgiasSupportConnection as jest.Mock).mockResolvedValue({
      id: 'conn-1',
      status: 'active',
      gorgias_api_configured: true,
      sidebar_widget_registered: true,
    });
    (resolveWidgetCustomerIdentity as jest.Mock).mockResolvedValue({
      identityUnresolved: true,
      rawEmail: '',
    });

    const res = await GET(
      new NextRequest(
        `http://localhost/api/gorgias/widget?widget_token=${WIDGET_TOKEN}&email=agent@example.com`,
      ),
    );
    const json = await res.json();

    expect(json.claims).not.toBe('Reconnect Gorgias');
  });
});
