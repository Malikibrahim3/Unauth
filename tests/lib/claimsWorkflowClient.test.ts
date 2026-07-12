import { submitClaim, submitEvidence, submitOutcome } from '@/lib/claims/workflowClient';

describe('claims workflow client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn(async (input: any) => {
      const url = String(input);
      if (url.startsWith('/api/claims/') && url.endsWith('/outcome')) {
        return { ok: true, json: async () => ({ ok: true }) } as any;
      }
      if (url.startsWith('/api/claims/') && url.endsWith('/evidence')) {
        return { ok: true, json: async () => ({ ok: true }) } as any;
      }
      return { ok: true, json: async () => ({ claim: { id: 'c1' } }) } as any;
    }) as any;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('submits claim and returns claim id', async () => {
    const res = await submitClaim({ shop_domain: 's.myshopify.com', shopify_order_id: 'o1', customer_id: 'p1', claim_type: 'missing_parcel', status: 'under_review' });
    expect(res.message).toBe('Claim saved');
    expect(res.claimId).toBe('c1');
  });

  it('submits outcome', async () => {
    const res = await submitOutcome('c1', { decision: 'denied', outcome: 'loss' });
    expect(res.message).toBe('Outcome saved');
  });

  it('submits evidence', async () => {
    const res = await submitEvidence('c1', { evidence_type: 'tracking', source: 'shopify', metadata: { a: 1 } });
    expect(res.message).toBe('Evidence saved');
  });
});
