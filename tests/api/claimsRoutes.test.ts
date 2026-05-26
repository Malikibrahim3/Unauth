import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));

jest.mock('@/lib/permissions', () => ({
  PERMISSIONS: { SUBMIT_FRAUD_FEEDBACK: 'submit_fraud_feedback' },
  requirePermission: jest.fn(),
}));

jest.mock('@/lib/claims/store', () => {
  const actual = jest.requireActual('@/lib/claims/store');
  return {
    ...actual,
    upsertMerchantClaim: jest.fn(),
    upsertMerchantCaseOutcome: jest.fn(),
    upsertClaimEvidenceItem: jest.fn(),
  };
});

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/permissions';
import { POST as claimsPost } from '@/app/api/claims/route';
import { POST as outcomePost } from '@/app/api/claims/[claimId]/outcome/route';
import { POST as evidencePost } from '@/app/api/claims/[claimId]/evidence/route';
import { upsertMerchantClaim, upsertMerchantCaseOutcome, upsertClaimEvidenceItem } from '@/lib/claims/store';

function mkReq(url: string, body: any) {
  return new NextRequest(url, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } as any);
}

function setupAuth(ok: boolean) {
  (createClient as jest.Mock).mockReturnValue({ auth: { getUser: jest.fn().mockResolvedValue({ data: { user: ok ? { id: 'user-1' } : null } }) } });
}

function setupPermission() {
  (requirePermission as jest.Mock).mockResolvedValue({ denied: null, ctx: { merchantId: 'm-1' } });
}

function setupServiceClient(opts: { ownsShop?: boolean; claimShopDomain?: string } = {}) {
  const ownsShop = opts.ownsShop ?? true;
  const claimShopDomain = opts.claimShopDomain ?? 'unit-test.myshopify.com';
  const service = {
    from: (table: string) => {
      if (table === 'merchant_shopify_connections') {
        const chain: any = {
          eq: () => chain,
          maybeSingle: async () => ({ data: ownsShop ? { merchant_id: 'm-1' } : null, error: null }),
          then: async (resolve: any) => resolve({ data: ownsShop ? [{ merchant_id: 'm-1', shop_domain: 'unit-test.myshopify.com', active: true }] : [], error: null }),
        };
        return {
          select: () => chain,
        };
      }
      if (table === 'merchant_claims') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { shop_domain: claimShopDomain }, error: null }),
            }),
          }),
        };
      }
      return {};
    },
  };
  (createServiceClient as jest.Mock).mockReturnValue(service);
}

describe('claims routes', () => {
  beforeEach(() => jest.resetAllMocks());

  it('unauthenticated request rejected', async () => {
    setupAuth(false);
    setupServiceClient();
    const res = await claimsPost(mkReq('http://localhost/api/claims', { shop_domain: 'unit-test.myshopify.com', claim_type: 'other' }));
    expect(res.status).toBe(401);
  });

  it('user from wrong merchant rejected', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient({ ownsShop: false });
    const res = await claimsPost(mkReq('http://localhost/api/claims', { shop_domain: 'unit-test.myshopify.com', claim_type: 'other' }));
    expect(res.status).toBe(403);
  });

  it('invalid enum rejected', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient();
    const res = await claimsPost(mkReq('http://localhost/api/claims', { shop_domain: 'unit-test.myshopify.com', claim_type: 'bad_enum' }));
    expect(res.status).toBe(400);
  });

  it('valid claim create/update succeeds', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient();
    (upsertMerchantClaim as jest.Mock).mockResolvedValue({ id: 'c1', shop_domain: 'unit-test.myshopify.com', shopify_order_id: '1001', claim_type: 'missing_parcel', status: 'open' });
    const res = await claimsPost(mkReq('http://localhost/api/claims', { shop_domain: 'unit-test.myshopify.com', shopify_order_id: '1001', claim_type: 'missing_parcel', status: 'open' }));
    expect(res.status).toBe(200);
    expect(upsertMerchantClaim).toHaveBeenCalled();
  });

  it('valid outcome add succeeds', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient();
    (upsertMerchantCaseOutcome as jest.Mock).mockResolvedValue({ id: 'o1', claim_id: 'c1', decision: 'approved', outcome: 'recovered' });
    const res = await outcomePost(
      mkReq('http://localhost/api/claims/c1/outcome', { decision: 'approved', outcome: 'recovered' }),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );
    expect(res.status).toBe(200);
    expect(upsertMerchantCaseOutcome).toHaveBeenCalled();
  });

  it('valid evidence add succeeds', async () => {
    setupAuth(true);
    setupPermission();
    setupServiceClient();
    (upsertClaimEvidenceItem as jest.Mock).mockResolvedValue({ id: 'e1', claim_id: 'c1', evidence_type: 'tracking', source: 'shopify' });
    const res = await evidencePost(
      mkReq('http://localhost/api/claims/c1/evidence', { evidence_type: 'tracking', source: 'shopify' }),
      { params: Promise.resolve({ claimId: '550e8400-e29b-41d4-a716-446655440000' }) }
    );
    expect(res.status).toBe(200);
    expect(upsertClaimEvidenceItem).toHaveBeenCalled();
  });
});
