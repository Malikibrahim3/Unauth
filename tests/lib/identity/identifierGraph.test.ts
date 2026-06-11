import {
  buildV1EdgePairsFromIdentifiers,
  canonicalizeEdgePair,
  computeLinkStrengthAfterUpsert,
  extractV1IdentifiersFromOrder,
  isV1IdentifierType,
} from '@/lib/identity/identifierGraph';
import type { NormalisedOrder } from '@/lib/engine/types';

describe('identifierGraph', () => {
  it('canonicalizeEdgePair swaps when left key is greater', () => {
    const result = canonicalizeEdgePair(
      { type: 'platform_order_id', hash: '1001' },
      { type: 'normalized_email_hash', hash: 'email_a' }
    );
    expect(result.left.type).toBe('normalized_email_hash');
    expect(result.left.hash).toBe('email_a');
    expect(result.right.type).toBe('platform_order_id');
    expect(result.right.hash).toBe('1001');
  });

  it('canonicalizeEdgePair keeps order when already canonical', () => {
    const left = { type: 'normalized_email_hash' as const, hash: 'a' };
    const right = { type: 'phone_e164_hash' as const, hash: 'b' };
    expect(canonicalizeEdgePair(left, right)).toEqual({ left, right });
  });

  it('canonicalizeEdgePair produces identical output regardless of input order', () => {
    const a = { type: 'normalized_email_hash' as const, hash: 'email_a' };
    const b = { type: 'phone_e164_hash' as const, hash: 'phone_b' };
    expect(canonicalizeEdgePair(a, b)).toEqual(canonicalizeEdgePair(b, a));
  });

  it('computeLinkStrengthAfterUpsert with count_delta=1 on first insert yields seen_count=1 and link_strength=1.0', () => {
    expect(computeLinkStrengthAfterUpsert(0, 1)).toEqual({
      seenCount: 1,
      linkStrength: 1.0,
    });
  });

  it('computeLinkStrengthAfterUpsert with count_delta=1 on conflict yields seen_count=2 and link_strength=1.5', () => {
    expect(computeLinkStrengthAfterUpsert(1, 1)).toEqual({
      seenCount: 2,
      linkStrength: 1.5,
    });
  });

  it('computeLinkStrengthAfterUpsert with count_delta=2 on conflict yields seen_count=3 and link_strength=2.0', () => {
    expect(computeLinkStrengthAfterUpsert(1, 2)).toEqual({
      seenCount: 3,
      linkStrength: 2.0,
    });
  });

  it('isV1IdentifierType rejects device_fingerprint before DB write path', () => {
    expect(isV1IdentifierType('device_fingerprint')).toBe(false);
    expect(isV1IdentifierType('ip_hash')).toBe(false);
    expect(isV1IdentifierType('card_last4')).toBe(false);
    expect(isV1IdentifierType('normalized_email_hash')).toBe(true);
  });

  it('extractV1IdentifiersFromOrder excludes ip and card signals', () => {
    const order = {
      orderId: '1001',
      emailHash: 'email_hash',
      phoneHash: 'phone_hash',
      addressHash: 'ship_hash',
      billingAddressHash: 'bill_hash',
      ipHash: 'ip_hash',
      cardLast4: 'card_hash',
      deviceIdHash: 'device_hash',
    } as NormalisedOrder & { _rawAccountId?: string };
    order._rawAccountId = 'cust_99';

    const ids = extractV1IdentifiersFromOrder(order);
    expect(ids.map((id) => id.type)).toEqual([
      'normalized_email_hash',
      'phone_e164_hash',
      'full_normalized_shipping_address_hash',
      'full_normalized_billing_address_hash',
      'platform_customer_id',
      'platform_order_id',
    ]);
    expect(ids.every((id) => isV1IdentifierType(id.type))).toBe(true);
    expect(ids.some((id) => id.hash === 'ip_hash')).toBe(false);
    expect(ids.some((id) => id.hash === 'device_hash')).toBe(false);
  });

  it('buildV1EdgePairsFromIdentifiers emits canonical pairs only', () => {
    const identifiers = extractV1IdentifiersFromOrder({
      orderId: '1001',
      emailHash: 'email_hash',
      phoneHash: 'phone_hash',
    } as NormalisedOrder);
    const pairs = buildV1EdgePairsFromIdentifiers(identifiers);
    expect(pairs.length).toBe(3);
    expect(pairs.every((pair) => `${pair.left.type}:${pair.left.hash}` < `${pair.right.type}:${pair.right.hash}`)).toBe(true);
  });
});
