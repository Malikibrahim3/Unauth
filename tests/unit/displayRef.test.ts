import {
  shortRef,
  caseDisplay,
  hashId,
  objectDisplayRef,
  sourceRefLabel,
} from '@/lib/ui/displayRef';

describe('displayRef — object identity', () => {
  it('prefers a human source ref', () => {
    expect(shortRef('ELARA-07402', 'b6fe415d-0000-4000-8000-000000000000')).toBe('ELARA-07402');
    expect(caseDisplay({ customer_name: 'Leah Patel', ref: 'ELARA-07402', id: 'x' })).toBe(
      'Leah Patel · ELARA-07402',
    );
  });

  it('never prints a UUID or seed/smoke slug', () => {
    const uuid = 'b6fe415d-1a2b-4c3d-8e4f-000000012345';
    expect(shortRef(null, uuid)).toBe('Case #12345');
    expect(shortRef('seed-demo-v2-elara-07', uuid)).toBe('Case #12345');
    expect(shortRef('smoke-abc', uuid)).toBe('Case #12345');
    expect(shortRef(uuid, uuid)).toBe('Case #12345');
    expect(caseDisplay({ customer_name: 'seed-demo-v2-customer', ref: null, id: uuid })).toBe(
      'Case #12345',
    );
  });

  it('derives a bare short handle for non-case objects', () => {
    expect(hashId('b6fe415d-1a2b-4c3d-8e4f-000000abcde')).toBe('#ABCDE');
  });

  it('turns Shopify GIDs into compact source references', () => {
    expect(sourceRefLabel('gid://shopify/Order/814150')).toBe('Order #814150');
    expect(shortRef('gid://shopify/Order/814150', 'case-1')).toBe('Order #814150');
    expect(objectDisplayRef('refund', 'gid://shopify/Refund/880001', 'refund-1')).toBe(
      'Refund #880001',
    );
  });

  it('never exposes URLs or URNs as connected-object titles', () => {
    expect(objectDisplayRef('shipment', 'urn:carrier:parcel:123', 'shipment-abcde')).toBe(
      'Shipment #ABCDE',
    );
    expect(objectDisplayRef('return', 'https://provider.example/returns/44', 'return-12345')).toBe(
      'Return #12345',
    );
  });
});
