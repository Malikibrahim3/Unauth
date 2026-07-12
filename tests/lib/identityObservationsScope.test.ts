import { signalsForEntity, type ObservationEntity } from '@/lib/identity/observations';

const base: ObservationEntity = {
  provenance: { customerId: 'sc-1' },
  source: 'shopify',
  platformCustomerExternalId: 'CUST-123',
  helpdeskContactExternalId: null,
};

function keyFor(type: string, e: ObservationEntity): string | undefined {
  return signalsForEntity(e).find((s) => s.type === type)?.hash;
}

describe('identity observation account-scoped namespace', () => {
  it('preserves the historical ${source}:${id} key when no account key is supplied', () => {
    // This is the frozen-identity guarantee: single-account merchants must keep
    // byte-for-byte identical keys so existing links are not broken.
    expect(keyFor('platform_customer_id', base)).toBe('shopify:CUST-123');
  });

  it('scopes the key by account when a source account key is supplied', () => {
    const scoped: ObservationEntity = { ...base, sourceAccountKey: 'store-uk' };
    expect(keyFor('platform_customer_id', scoped)).toBe('shopify:store-uk:CUST-123');
  });

  it('two accounts of the same provider reusing an external id produce distinct keys', () => {
    const a: ObservationEntity = { ...base, sourceAccountKey: 'store-uk' };
    const b: ObservationEntity = { ...base, sourceAccountKey: 'store-us' };
    expect(keyFor('platform_customer_id', a)).not.toBe(keyFor('platform_customer_id', b));
  });

  it('applies the same scoping to helpdesk_contact_id', () => {
    const e: ObservationEntity = {
      provenance: { ticketId: 't-1' },
      source: 'gorgias',
      helpdeskContactExternalId: 'CONTACT-9',
      sourceAccountKey: 'support-eu',
    };
    expect(keyFor('helpdesk_contact_id', e)).toBe('gorgias:support-eu:CONTACT-9');
  });
});
