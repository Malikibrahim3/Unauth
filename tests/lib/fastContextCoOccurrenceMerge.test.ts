import {
  buildHashToLegacyLookup,
  identifierEdgeToCoOccurrence,
  mergeCoOccurrenceSources,
  type CoOccurrence,
  type IdentifierCoOccurrenceEdgeRow,
} from '@/lib/engine/fastContext';
import { hashIdentifier } from '@/lib/identity/hash';
import { normaliseEmail, normaliseAddress, normaliseIP } from '@/lib/identity/normalise';
import type { NormalisedOrder } from '@/lib/engine/types';

const EMAIL = 'user@example.com';
const ADDRESS = '1 main street london';
const EMAIL_HASH = hashIdentifier(normaliseEmail(EMAIL)!);
const ADDRESS_HASH = hashIdentifier(normaliseAddress(ADDRESS)!);

function makeOrder(): NormalisedOrder {
  return {
    orderId: 'ORD-1',
    orderDate: new Date('2026-01-01'),
    customerNameNorm: 'user',
    emailHash: EMAIL_HASH,
    addressHash: ADDRESS_HASH,
    phoneHash: null,
    ipHash: hashIdentifier('203.0.113.1'),
    orderTotal: 100,
    currency: 'USD',
    orderStatus: 'completed',
    refundStatus: 'none',
    refundReason: null,
    refundDate: null,
    refundAmount: null,
    paymentMethod: 'visa',
    _rawEmail: EMAIL,
    _rawAddress: ADDRESS,
    _rawIP: '203.0.113.1',
  } as NormalisedOrder;
}

function legacyEmailAddressRow(overrides: Partial<CoOccurrence> = {}): CoOccurrence {
  return {
    id: 'legacy-email-addr-1',
    entity_a_type: 'email',
    entity_a_value: normaliseEmail(EMAIL)!,
    entity_b_type: 'address',
    entity_b_value: normaliseAddress(ADDRESS)!,
    co_occurrence_count: 3,
    first_seen: '2025-01-01T00:00:00Z',
    last_seen: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

function newEmailAddressRow(overrides: Partial<IdentifierCoOccurrenceEdgeRow> = {}): IdentifierCoOccurrenceEdgeRow {
  return {
    id: 'new-email-addr-1',
    left_identifier_type: 'normalized_email_hash',
    left_identifier_hash: EMAIL_HASH,
    right_identifier_type: 'full_normalized_shipping_address_hash',
    right_identifier_hash: ADDRESS_HASH,
    seen_count: 7,
    first_seen_at: '2026-03-01T00:00:00Z',
    last_seen_at: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

describe('mergeCoOccurrenceSources — pre-backfill dual-read', () => {
  const hashToLegacy = buildHashToLegacyLookup([makeOrder()]);

  it('returns new-table-only rows mapped to legacy CoOccurrence shape', () => {
    const merged = mergeCoOccurrenceSources([], [newEmailAddressRow()], hashToLegacy);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toEqual({
      id: 'new-email-addr-1',
      entity_a_type: 'email',
      entity_a_value: normaliseEmail(EMAIL),
      entity_b_type: 'address',
      entity_b_value: normaliseAddress(ADDRESS),
      co_occurrence_count: 7,
      first_seen: '2026-03-01T00:00:00Z',
      last_seen: '2026-06-01T00:00:00Z',
    });
    expect(merged[0]).not.toHaveProperty('source');
  });

  it('returns legacy-only rows unchanged', () => {
    const legacy = legacyEmailAddressRow();
    const merged = mergeCoOccurrenceSources([legacy], [], hashToLegacy);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toBe(legacy);
    expect(merged[0].co_occurrence_count).toBe(3);
  });

  it('prefers new-table row when both sources share the same v1 dedup key', () => {
    const legacy = legacyEmailAddressRow({ co_occurrence_count: 3, id: 'legacy-id' });
    const newer = newEmailAddressRow({ seen_count: 9, id: 'new-id' });
    const merged = mergeCoOccurrenceSources([legacy], [newer], hashToLegacy);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('new-id');
    expect(merged[0].co_occurrence_count).toBe(9);
  });

  it('passes ip/card legacy pairs through without dedup against v1 rows', () => {
    const ipEmailLegacy: CoOccurrence = {
      id: 'legacy-ip-email',
      entity_a_type: 'ip',
      entity_a_value: normaliseIP('203.0.113.1')!,
      entity_b_type: 'email',
      entity_b_value: normaliseEmail(EMAIL)!,
      co_occurrence_count: 2,
      first_seen: '2025-01-01T00:00:00Z',
      last_seen: '2025-06-01T00:00:00Z',
    };
    const cardAddressLegacy: CoOccurrence = {
      id: 'legacy-card-address',
      entity_a_type: 'card_last4',
      entity_a_value: '4242',
      entity_b_type: 'address',
      entity_b_value: normaliseAddress(ADDRESS)!,
      co_occurrence_count: 1,
      first_seen: '2025-02-01T00:00:00Z',
      last_seen: '2025-06-01T00:00:00Z',
    };
    const merged = mergeCoOccurrenceSources(
      [ipEmailLegacy, cardAddressLegacy],
      [newEmailAddressRow()],
      hashToLegacy
    );
    expect(merged).toHaveLength(3);
    expect(merged.find((r) => r.id === 'legacy-ip-email')).toEqual(ipEmailLegacy);
    expect(merged.find((r) => r.id === 'legacy-card-address')).toEqual(cardAddressLegacy);
    expect(merged.find((r) => r.id === 'new-email-addr-1')?.co_occurrence_count).toBe(7);
  });
});

describe('identifierEdgeToCoOccurrence', () => {
  it('maps v1 phone edges to legacy phone entity types (v1-only signal)', () => {
    const phoneHash = hashIdentifier('+15551234567');
    const hashToLegacy = new Map<string, string>([
      [`phone_e164_hash:${phoneHash}`, '+15551234567'],
    ]);
    const row: IdentifierCoOccurrenceEdgeRow = {
      id: 'phone-edge-1',
      left_identifier_type: 'normalized_email_hash',
      left_identifier_hash: EMAIL_HASH,
      right_identifier_type: 'phone_e164_hash',
      right_identifier_hash: phoneHash,
      seen_count: 1,
      first_seen_at: '2026-06-01T00:00:00Z',
      last_seen_at: '2026-06-01T00:00:00Z',
    };
    const co = identifierEdgeToCoOccurrence(row, hashToLegacy);
    expect(co.entity_a_type).toBe('email');
    expect(co.entity_b_type).toBe('phone');
    expect(co.entity_b_value).toBe('+15551234567');
    expect(co).not.toHaveProperty('source');
  });
});

describe('buildFastContext — dual-read integration', () => {
  it('queries identifier_co_occurrence_edges in parallel and indexes merged new-table rows', async () => {
    const order = makeOrder();
    const hashToLegacy = buildHashToLegacyLookup([order]);
    const newRow = newEmailAddressRow();
    const tablesQueried: string[] = [];

    const client = {
      from: (table: string) => {
        tablesQueried.push(table);
        const chain: Record<string, unknown> = {
          select: () => chain,
          eq: () => chain,
          in: () => {
            if (table === 'identifier_co_occurrence_edges') {
              return Promise.resolve({ data: [newRow], error: null });
            }
            return Promise.resolve({ data: [], error: null });
          },
          gte: () => chain,
          or: () => Promise.resolve({ data: [], error: null }),
          then: (onF: (v: unknown) => unknown) =>
            Promise.resolve({ data: [], error: null }).then(onF),
        };
        return chain;
      },
      rpc: () => Promise.resolve({ data: [], error: { message: 'skip rpc in test' } }),
    };

    const { buildFastContext } = await import('@/lib/engine/fastContext');
    const ctx = await buildFastContext([order], client as never);

    expect(tablesQueried).toContain('fraud_entity_co_occurrences');
    expect(tablesQueried).toContain('identifier_co_occurrence_edges');

    const expected = identifierEdgeToCoOccurrence(newRow, hashToLegacy);
    const indexed = ctx.historicalCoOccurrenceMap.get(
      `${expected.entity_a_type}:${expected.entity_a_value}`
    );
    expect(indexed?.some((row) => row.id === 'new-email-addr-1')).toBe(true);
  });
});
