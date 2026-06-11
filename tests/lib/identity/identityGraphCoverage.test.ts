import {
  assessStep7Readiness,
  formatIdentityGraphCoverageReport,
  parseIdentityGraphCoverageSnapshot,
  STEP7_MIN_REAL_EDGES,
  type IdentityGraphCoverageSnapshot,
} from '@/lib/identity/identityGraphCoverage';

function baseSnapshot(overrides: Partial<IdentityGraphCoverageSnapshot> = {}): IdentityGraphCoverageSnapshot {
  return {
    generated_at: '2026-06-08T12:00:00Z',
    identity_identifiers: {
      total: 236,
      by_type: [
        { identifier_type: 'normalized_email_hash', count: 123 },
        { identifier_type: 'full_normalized_shipping_address_hash', count: 113 },
      ],
      by_source_provider: [{ source_provider: 'manual', count: 236 }],
      synthetic_raw_count: 0,
      plaintext_pii_violations: 0,
      ...overrides.identity_identifiers,
    },
    identifier_co_occurrence_edges: {
      total: 9,
      by_source_provider: [
        { source_provider: 'csv', count: 6 },
        { source_provider: 'gorgias', count: 3 },
      ],
      by_merchant_id: [{ merchant_id: '9aaf4c63-fc4e-4bc7-8384-fdbac91b9ab4', count: 9 }],
      by_pair_type: [
        {
          left_identifier_type: 'normalized_email_hash',
          right_identifier_type: 'phone_e164_hash',
          count: 1,
        },
      ],
      seen_count_gt_1: 9,
      link_strength_avg: 1.5,
      link_strength_max: 1.5,
      distinct_merchants: 1,
      activity: { last_24h: 9, last_7d: 9, last_30d: 9 },
      synthetic_count: 9,
      real_csv_edges: 0,
      real_support_commerce_edges: 0,
      ...overrides.identifier_co_occurrence_edges,
    },
    cross_merchant: {
      total_edge_tuples: 9,
      cross_merchant_tuples: 0,
      ...overrides.cross_merchant,
    },
    legacy: {
      fraud_entities: 361,
      fraud_entity_co_occurrences: 461,
      ...overrides.legacy,
    },
    synthetic_detection: {
      raw_prefixes: ['dual_write_verify_20260608'],
      note: 'test',
      ...overrides.synthetic_detection,
    },
  };
}

describe('parseIdentityGraphCoverageSnapshot', () => {
  it('parses RPC JSON into typed snapshot', () => {
    const raw = {
      generated_at: '2026-06-08T12:00:00Z',
      identity_identifiers: {
        total: 10,
        by_type: [{ identifier_type: 'normalized_email_hash', count: 10 }],
        by_source_provider: [{ source_provider: 'manual', count: 10 }],
        synthetic_raw_count: 0,
        plaintext_pii_violations: 0,
      },
      identifier_co_occurrence_edges: {
        total: 2,
        by_source_provider: [{ source_provider: 'csv', count: 2 }],
        by_merchant_id: [{ merchant_id: 'm-1', count: 2 }],
        by_pair_type: [
          {
            left_identifier_type: 'normalized_email_hash',
            right_identifier_type: 'phone_e164_hash',
            count: 2,
          },
        ],
        seen_count_gt_1: 1,
        link_strength_avg: 1.25,
        link_strength_max: 1.5,
        distinct_merchants: 1,
        activity: { last_24h: 2, last_7d: 2, last_30d: 2 },
        synthetic_count: 0,
        real_csv_edges: 2,
        real_support_commerce_edges: 0,
      },
      cross_merchant: { total_edge_tuples: 2, cross_merchant_tuples: 0 },
      legacy: { fraud_entities: 100, fraud_entity_co_occurrences: 200 },
      synthetic_detection: { raw_prefixes: ['dual_write_verify_20260608'], note: 'n' },
    };

    const snapshot = parseIdentityGraphCoverageSnapshot(raw);
    expect(snapshot.identity_identifiers.total).toBe(10);
    expect(snapshot.identifier_co_occurrence_edges.real_csv_edges).toBe(2);
    expect(snapshot.cross_merchant.cross_merchant_tuples).toBe(0);
  });
});

describe('assessStep7Readiness', () => {
  it('blocks Step 7 when only synthetic edges exist', () => {
    const report = assessStep7Readiness(baseSnapshot());
    expect(report.ready).toBe(false);
    expect(report.criteria.find((c) => c.id === 'meaningful_real_edges')?.status).toBe('fail');
    expect(report.criteria.find((c) => c.id === 'csv_import_path')?.status).toBe('fail');
    expect(report.criteria.find((c) => c.id === 'support_helpdesk_path')?.status).toBe('fail');
    expect(report.criteria.find((c) => c.id === 'no_plaintext_pii')?.status).toBe('pass');
  });

  it('passes automated criteria when real edge coverage is sufficient', () => {
    const realEdges = STEP7_MIN_REAL_EDGES + 10;
    const snapshot = baseSnapshot({
      identifier_co_occurrence_edges: {
        total: realEdges + 5,
        by_source_provider: [
          { source_provider: 'csv', count: realEdges },
          { source_provider: 'gorgias', count: 5 },
        ],
        by_merchant_id: [{ merchant_id: 'm-1', count: realEdges + 5 }],
        by_pair_type: [],
        seen_count_gt_1: 0,
        link_strength_avg: 1,
        link_strength_max: 1,
        distinct_merchants: 2,
        activity: { last_24h: 50, last_7d: realEdges, last_30d: realEdges },
        synthetic_count: 5,
        real_csv_edges: realEdges,
        real_support_commerce_edges: 5,
      },
      legacy: { fraud_entities: 361, fraud_entity_co_occurrences: 500 },
    });

    const report = assessStep7Readiness(snapshot);
    const automated = report.criteria.filter((c) => c.status !== 'manual');
    expect(automated.every((c) => c.status === 'pass')).toBe(true);
    expect(report.criteria.filter((c) => c.status === 'manual')).toHaveLength(2);
  });

  it('fails when plaintext PII violations are present', () => {
    const snapshot = baseSnapshot({
      identity_identifiers: {
        total: 1,
        by_type: [],
        by_source_provider: [],
        synthetic_raw_count: 0,
        plaintext_pii_violations: 2,
      },
    });
    const report = assessStep7Readiness(snapshot);
    expect(report.criteria.find((c) => c.id === 'no_plaintext_pii')?.status).toBe('fail');
  });
});

describe('formatIdentityGraphCoverageReport', () => {
  it('includes key sections and readiness summary', () => {
    const snapshot = baseSnapshot();
    const readiness = assessStep7Readiness(snapshot);
    const text = formatIdentityGraphCoverageReport(snapshot, readiness);
    expect(text).toContain('Identity Graph Coverage');
    expect(text).toContain('fraud_entity_co_occurrences: 461');
    expect(text).toContain('Step 7 readiness');
    expect(text).toContain('Step 7 remains blocked');
  });
});
