import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));

jest.mock('@/lib/permissions', () => ({
  PERMISSIONS: { VIEW_CUSTOMERS: 'view_customers' },
  requirePermission: jest.fn(),
}));

jest.mock('@/lib/supabase/merchantHelpers', () => ({
  fetchMerchantScopedSourceCustomer: jest.fn(),
}));

jest.mock('@/lib/support/intake/supportCaseReadModel', () => ({
  listSupportCasesForCustomerProfile: jest.fn(),
}));

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/permissions';
import { fetchMerchantScopedSourceCustomer } from '@/lib/supabase/merchantHelpers';
import { listSupportCasesForCustomerProfile } from '@/lib/support/intake/supportCaseReadModel';
import { GET } from '@/app/api/customers/[id]/support-cases/route';

const PROFILE_ID = '6ac24686-2fd4-4a27-9eb3-cb1751a9548c';
const MERCHANT_ID = '00000000-0000-4000-8000-000000000001';

const linkedCase = {
  id: '6f5b78fb-2757-4989-a949-4b6b2bb64864',
  provider: 'gorgias',
  external_case_id: 'g-live-verify-1007',
  external_url: 'https://example.gorgias.com/app/ticket/g-live-verify-1007',
  case_status: 'open',
  claim_reason: 'refund_request',
  customer_message_summary: 'Please refund Shopify order #1007',
  agent_notes_summary: null,
  tags: ['refund'],
  link_status: 'linked',
  shopify_order_id: '16848379281777',
  order_ref: '1007',
  claim_candidate: true,
  merchant_claim_id: null,
  updated_at_provider: '2026-05-28T09:30:00+00:00',
};

describe('GET /api/customers/[id]/support-cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createServiceClient as jest.Mock).mockReturnValue({});
    (createClient as jest.Mock).mockReturnValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    });
    (requirePermission as jest.Mock).mockResolvedValue({
      denied: null,
      ctx: { merchantId: MERCHANT_ID, userId: 'user-1' },
    });
  });

  it('returns linked support cases for a scoped customer profile', async () => {
    (fetchMerchantScopedSourceCustomer as jest.Mock).mockResolvedValue({ id: PROFILE_ID, merchant_customer_id: null });
    (listSupportCasesForCustomerProfile as jest.Mock).mockResolvedValue([linkedCase]);

    const response = await GET(
      new NextRequest(`http://localhost/api/customers/${PROFILE_ID}/support-cases`),
      { params: Promise.resolve({ id: PROFILE_ID }) }
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.support_cases).toHaveLength(1);
    expect(json.support_cases[0].external_case_id).toBe('g-live-verify-1007');
    expect(fetchMerchantScopedSourceCustomer).toHaveBeenCalledWith(
      expect.anything(),
      MERCHANT_ID,
      PROFILE_ID,
    );
  });

  it('does not expose raw email or payload fields', async () => {
    (fetchMerchantScopedSourceCustomer as jest.Mock).mockResolvedValue({ id: PROFILE_ID, merchant_customer_id: null });
    (listSupportCasesForCustomerProfile as jest.Mock).mockResolvedValue([linkedCase]);

    const response = await GET(
      new NextRequest(`http://localhost/api/customers/${PROFILE_ID}/support-cases`),
      { params: Promise.resolve({ id: PROFILE_ID }) }
    );
    const body = await response.text();

    expect(body).not.toContain('shopper@');
    expect(body).not.toContain('raw_payload');
    expect(body).not.toContain('customer_email');
  });

  it('returns 404 when profile is outside merchant scope', async () => {
    (fetchMerchantScopedSourceCustomer as jest.Mock).mockResolvedValue(null);

    const response = await GET(
      new NextRequest(`http://localhost/api/customers/${PROFILE_ID}/support-cases`),
      { params: Promise.resolve({ id: PROFILE_ID }) }
    );

    expect(response.status).toBe(404);
    expect(listSupportCasesForCustomerProfile).not.toHaveBeenCalled();
  });
});
