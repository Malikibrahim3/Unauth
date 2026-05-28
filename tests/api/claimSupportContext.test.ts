import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));

jest.mock('@/lib/permissions', () => ({
  PERMISSIONS: {
    SUBMIT_FRAUD_FEEDBACK: 'submit_fraud_feedback',
    VIEW_CUSTOMERS: 'view_customers',
  },
  requirePermission: jest.fn(),
}));

jest.mock('@/lib/support/intake/supportCaseReadModel', () => ({
  listSupportCasesForClaimContext: jest.fn(),
}));

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/permissions';
import { listSupportCasesForClaimContext } from '@/lib/support/intake/supportCaseReadModel';
import { GET } from '@/app/api/claims/[claimId]/support-context/route';

const CLAIM_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_MERCHANT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const MERCHANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const linkedCase = {
  id: '6f5b78fb-2757-4989-a949-4b6b2bb64864',
  provider: 'gorgias',
  external_case_id: 'g-live-verify-1007',
  external_url: 'https://live-link-verify.gorgias.com/app/ticket/g-live-verify-1007',
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

function setupAuth(ok: boolean) {
  (createClient as jest.Mock).mockReturnValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: ok ? { id: 'user-1' } : null } }) },
  });
}

function setupPermission(merchantId: string) {
  (requirePermission as jest.Mock).mockResolvedValue({
    denied: null,
    ctx: { merchantId, userId: 'user-1' },
  });
}

function setupServiceClient(claim: Record<string, unknown> | null) {
  (createServiceClient as jest.Mock).mockReturnValue({
    from: (table: string) => ({
      select: () => ({
        eq: (_column: string, value: string) => ({
          eq: (_column2: string, merchantId: string) => ({
            maybeSingle: async () => {
              if (table !== 'merchant_claims' || !claim) {
                return { data: null, error: null };
              }
              if (claim.merchant_id !== merchantId || claim.id !== value) {
                return { data: null, error: null };
              }
              return { data: claim, error: null };
            },
          }),
        }),
      }),
    }),
  });
}

describe('GET /api/claims/[claimId]/support-context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listSupportCasesForClaimContext as jest.Mock).mockReset();
  });

  it('returns linked support cases for the same Shopify order context', async () => {
    setupAuth(true);
    setupPermission(MERCHANT_ID);
    setupServiceClient({
      id: CLAIM_ID,
      merchant_id: MERCHANT_ID,
      shopify_order_id: '16848379281777',
      shop_domain: 'unauth-test.myshopify.com',
    });
    (listSupportCasesForClaimContext as jest.Mock).mockResolvedValue([linkedCase]);

    const response = await GET(
      new NextRequest(`http://localhost/api/claims/${CLAIM_ID}/support-context`),
      { params: { claimId: CLAIM_ID } }
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.support_cases).toHaveLength(1);
    expect(json.support_cases[0].shopify_order_id).toBe('16848379281777');
    expect(listSupportCasesForClaimContext).toHaveBeenCalledWith(
      expect.anything(),
      MERCHANT_ID,
      expect.objectContaining({
        merchantClaimId: CLAIM_ID,
        shopifyOrderId: '16848379281777',
        shopDomain: 'unauth-test.myshopify.com',
      })
    );
  });

  it('does not expose raw email or raw payload fields', async () => {
    setupAuth(true);
    setupPermission(MERCHANT_ID);
    setupServiceClient({
      id: CLAIM_ID,
      merchant_id: MERCHANT_ID,
      shopify_order_id: '16848379281777',
      shop_domain: 'unauth-test.myshopify.com',
    });
    (listSupportCasesForClaimContext as jest.Mock).mockResolvedValue([linkedCase]);

    const response = await GET(
      new NextRequest(`http://localhost/api/claims/${CLAIM_ID}/support-context`),
      { params: { claimId: CLAIM_ID } }
    );
    const body = await response.text();

    expect(body).not.toContain('shopper@');
    expect(body).not.toContain('raw_payload');
    expect(body).not.toContain('customer_email');
  });

  it('rejects claims owned by another merchant', async () => {
    setupAuth(true);
    setupPermission(MERCHANT_ID);
    setupServiceClient({
      id: CLAIM_ID,
      merchant_id: OTHER_MERCHANT_ID,
      shopify_order_id: '16848379281777',
      shop_domain: 'unauth-test.myshopify.com',
    });

    const response = await GET(
      new NextRequest(`http://localhost/api/claims/${CLAIM_ID}/support-context`),
      { params: { claimId: CLAIM_ID } }
    );

    expect(response.status).toBe(404);
    expect(listSupportCasesForClaimContext).not.toHaveBeenCalled();
  });

  it('returns an empty safe list when no support cases exist', async () => {
    setupAuth(true);
    setupPermission(MERCHANT_ID);
    setupServiceClient({
      id: CLAIM_ID,
      merchant_id: MERCHANT_ID,
      shopify_order_id: '16848379281777',
      shop_domain: 'unauth-test.myshopify.com',
    });
    (listSupportCasesForClaimContext as jest.Mock).mockResolvedValue([]);

    const response = await GET(
      new NextRequest(`http://localhost/api/claims/${CLAIM_ID}/support-context`),
      { params: { claimId: CLAIM_ID } }
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.support_cases).toEqual([]);
    expect(JSON.stringify(json)).not.toContain('@');
  });
});
