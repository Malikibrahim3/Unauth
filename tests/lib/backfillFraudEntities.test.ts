import {
  BACKFILL_SKIPPED_LEGACY_ENTITY_TYPES,
  createEmptyBackfillStats,
  identityIdentifierKey,
  mapFraudEntityBatch,
  mapFraudEntityToIdentityIdentifier,
  mergeIdentityIdentifierRows,
  mergeWithExistingIdentifiers,
  type FraudEntityBackfillRow,
  type IdentityIdentifierBackfillRow,
} from '@/lib/identity/backfillFraudEntities';
import { hashIdentifier } from '@/lib/identity/hash';
import { normaliseEmail, normaliseAddress } from '@/lib/identity/normalise';

const EMAIL = 'user@example.com';
const ADDRESS = '1 main street london';

function fraudRow(overrides: Partial<FraudEntityBackfillRow> = {}): FraudEntityBackfillRow {
  return {
    id: 'fe-1',
    entity_type: 'email',
    entity_value: normaliseEmail(EMAIL)!,
    first_seen: '2025-01-01T00:00:00Z',
    last_seen: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

describe('mapFraudEntityToIdentityIdentifier', () => {
  it('maps email → normalized_email_hash using hashIdentifier(entity_value) directly', () => {
    const row = fraudRow();
    const result = mapFraudEntityToIdentityIdentifier(row);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.row.identifier_type).toBe('normalized_email_hash');
    expect(result.row.identifier_hash).toBe(hashIdentifier(row.entity_value));
    expect(result.row.source_provider).toBe('manual');
    expect(result.row.raw_vs_hashed_storage).toBe('hashed');
    expect(result.row.first_seen_at).toBe(row.first_seen);
    expect(result.row.last_seen_at).toBe(row.last_seen);
  });

  it('maps address → full_normalized_shipping_address_hash', () => {
    const norm = normaliseAddress(ADDRESS)!;
    const result = mapFraudEntityToIdentityIdentifier(
      fraudRow({ entity_type: 'address', entity_value: norm })
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.row.identifier_type).toBe('full_normalized_shipping_address_hash');
    expect(result.row.identifier_hash).toBe(hashIdentifier(norm));
  });

  it.each(['ip', 'card_last4', 'phone'])('skips legacy type %s', (entityType) => {
    expect(BACKFILL_SKIPPED_LEGACY_ENTITY_TYPES.has(entityType)).toBe(true);
    const result = mapFraudEntityToIdentityIdentifier(
      fraudRow({ entity_type: entityType, entity_value: 'some-value' })
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('skipped_type');
  });

  it('skips unknown entity types', () => {
    const result = mapFraudEntityToIdentityIdentifier(
      fraudRow({ entity_type: 'device_fingerprint', entity_value: 'x' })
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('skipped_unknown_type');
  });

  it('skips empty entity_value without re-normalising', () => {
    const result = mapFraudEntityToIdentityIdentifier(fraudRow({ entity_value: '   ' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('skipped_invalid_value');
  });
});

describe('mergeIdentityIdentifierRows', () => {
  it('keeps earliest first_seen_at and latest last_seen_at on conflict', () => {
    const existing: IdentityIdentifierBackfillRow = {
      identifier_type: 'normalized_email_hash',
      identifier_hash: hashIdentifier(normaliseEmail(EMAIL)!),
      source_provider: 'manual',
      raw_vs_hashed_storage: 'hashed',
      first_seen_at: '2024-01-01T00:00:00Z',
      last_seen_at: '2025-01-01T00:00:00Z',
    };
    const incoming: IdentityIdentifierBackfillRow = {
      ...existing,
      first_seen_at: '2025-06-01T00:00:00Z',
      last_seen_at: '2026-06-01T00:00:00Z',
    };
    const merged = mergeIdentityIdentifierRows(existing, incoming);
    expect(merged.first_seen_at).toBe('2024-01-01T00:00:00.000Z');
    expect(merged.last_seen_at).toBe('2026-06-01T00:00:00.000Z');
  });

  it('preserves non-manual source_provider from dual-write when merging backfill', () => {
    const existing: IdentityIdentifierBackfillRow = {
      identifier_type: 'normalized_email_hash',
      identifier_hash: hashIdentifier(normaliseEmail(EMAIL)!),
      source_provider: 'csv' as IdentityIdentifierBackfillRow['source_provider'],
      raw_vs_hashed_storage: 'hashed',
      first_seen_at: '2025-01-01T00:00:00Z',
      last_seen_at: '2025-06-01T00:00:00Z',
    };
    const incoming: IdentityIdentifierBackfillRow = {
      ...existing,
      source_provider: 'manual',
      first_seen_at: '2024-01-01T00:00:00Z',
      last_seen_at: '2026-06-01T00:00:00Z',
    };
    const merged = mergeIdentityIdentifierRows(existing, incoming);
    expect(merged.source_provider).toBe('csv');
  });
});

describe('mapFraudEntityBatch', () => {
  it('aggregates skip counts by type for idempotent batch mapping', () => {
    const stats = createEmptyBackfillStats();
    const rows = mapFraudEntityBatch(
      [
        fraudRow(),
        fraudRow({ id: 'fe-2', entity_type: 'ip', entity_value: '203.0.113.1' }),
        fraudRow({ id: 'fe-3', entity_type: 'card_last4', entity_value: '4242' }),
      ],
      stats
    );
    expect(rows).toHaveLength(1);
    expect(stats.totalScanned).toBe(3);
    expect(stats.mapped).toBe(1);
    expect(stats.skippedByType.ip).toBe(1);
    expect(stats.skippedByType.card_last4).toBe(1);
  });
});

describe('mergeWithExistingIdentifiers', () => {
  it('merges mapped rows with existing identity_identifiers for safe rerun', () => {
    const emailHash = hashIdentifier(normaliseEmail(EMAIL)!);
    const mapped: IdentityIdentifierBackfillRow[] = [
      {
        identifier_type: 'normalized_email_hash',
        identifier_hash: emailHash,
        source_provider: 'manual',
        raw_vs_hashed_storage: 'hashed',
        first_seen_at: '2025-01-01T00:00:00Z',
        last_seen_at: '2025-06-01T00:00:00Z',
      },
    ];
    const existing: IdentityIdentifierBackfillRow[] = [
      {
        identifier_type: 'normalized_email_hash',
        identifier_hash: emailHash,
        source_provider: 'shopify' as IdentityIdentifierBackfillRow['source_provider'],
        raw_vs_hashed_storage: 'hashed',
        first_seen_at: '2024-06-01T00:00:00Z',
        last_seen_at: '2026-01-01T00:00:00Z',
      },
    ];
    const merged = mergeWithExistingIdentifiers(mapped, existing);
    expect(identityIdentifierKey(merged[0])).toBe(`normalized_email_hash:${emailHash}`);
    expect(merged[0].source_provider).toBe('shopify');
    expect(merged[0].first_seen_at).toBe('2024-06-01T00:00:00.000Z');
    expect(merged[0].last_seen_at).toBe('2026-01-01T00:00:00.000Z');
  });
});
