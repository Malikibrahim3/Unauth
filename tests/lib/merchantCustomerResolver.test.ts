import { classifyMerchantEvidence } from '@/lib/identity/merchantCustomerResolver';

describe('merchant-local identity evidence gates', () => {
  it('confirms a scoped provider customer identifier', () => {
    const result = classifyMerchantEvidence(['platform_customer_id', 'shipping_address']);
    expect(result.status).toBe('confirmed');
    expect(result.reason).toBe('same_account_scoped_provider_identifier');
  });

  it('confirms two independent strong signals', () => {
    const result = classifyMerchantEvidence(['email', 'phone']);
    expect(result.status).toBe('confirmed');
    expect(result.reason).toBe('two_independent_strong_signals');
  });

  it('keeps one strong signal as a candidate', () => {
    const result = classifyMerchantEvidence(['email']);
    expect(result.status).toBe('candidate');
    expect(result.score).toBe(0.5);
  });

  it('allows a probable suggestion from one strong signal plus support', () => {
    const result = classifyMerchantEvidence(['phone', 'shipping_address']);
    expect(result.status).toBe('probable');
  });

  it('never auto-confirms address, email-root, IP, or last-four overlap', () => {
    expect(classifyMerchantEvidence(['shipping_address']).status).toBe('none');
    expect(classifyMerchantEvidence(['email_root', 'ip']).status).toBe('candidate');
    expect(classifyMerchantEvidence(['payment_fingerprint', 'shipping_address']).status).toBe('candidate');
  });

  it('does not treat two aliases of the same signal class as independent', () => {
    const result = classifyMerchantEvidence(['email', 'email_root']);
    expect(result.status).toBe('probable');
    expect(result.independentStrongTypes).toEqual(['email']);
  });
});
