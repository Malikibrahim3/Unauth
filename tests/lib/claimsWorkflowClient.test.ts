import { submitClaim, submitEvidence, submitOutcome } from '@/lib/claims/workflowClient';

describe('claims workflow client', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
  });

  it('claim create flow succeeds', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ claim: { id: 'c1' } }) });
    const res = await submitClaim({ shop_domain: 'x.myshopify.com', claim_type: 'other', customer_claim_reason: 'test' });
    expect(res.claimId).toBe('c1');
  });

  it('outcome submission succeeds', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ outcome: { id: 'o1' } }) });
    const res = await submitOutcome('c1', { decision: 'approved', outcome: 'recovered' });
    expect(res.message).toBe('Outcome saved');
  });

  it('invalid state handling returns message', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: 'Invalid claim payload' }) });
    const res = await submitClaim({ shop_domain: 'x.myshopify.com', claim_type: 'bad_enum' });
    expect(res.message).toBe('Invalid claim payload');
  });

  it('permission-denied UI state message', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: 'Forbidden' }) });
    const res = await submitEvidence('c1', { evidence_type: 'tracking', source: 'manual' });
    expect(res.message).toBe('Permission denied');
  });

  it('sanitizes claim text fields', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ claim: { id: 'c2' } }) });
    await submitClaim({ shop_domain: 'x.myshopify.com', claim_type: 'other', customer_claim_reason: '<script>x</script>' });
    const payload = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(payload.customer_claim_reason).toBe('scriptx/script');
  });
});
