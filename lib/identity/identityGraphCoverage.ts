import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

/** Raw platform/helpdesk IDs written by verify-dual-write-graph.ts — keep in sync with SQL default. */
export const SYNTHETIC_RAW_IDENTIFIER_PREFIXES = ['dual_write_verify_20260608'] as const;

export type CoverageBreakdownRow = {
  count: number;
};

export type IdentifierTypeBreakdown = CoverageBreakdownRow & {
  identifier_type: string;
};

export type SourceProviderBreakdown = CoverageBreakdownRow & {
  source_provider: string;
};

export type MerchantEdgeBreakdown = CoverageBreakdownRow & {
  merchant_id: string;
};

export type EdgePairTypeBreakdown = CoverageBreakdownRow & {
  left_identifier_type: string;
  right_identifier_type: string;
};

export type IdentityGraphCoverageSnapshot = {
  generated_at: string;
  identity_identifiers: {
    total: number;
    by_type: IdentifierTypeBreakdown[];
    by_source_provider: SourceProviderBreakdown[];
    synthetic_raw_count: number;
    plaintext_pii_violations: number;
  };
  identifier_co_occurrence_edges: {
    total: number;
    by_source_provider: SourceProviderBreakdown[];
    by_merchant_id: MerchantEdgeBreakdown[];
    by_pair_type: EdgePairTypeBreakdown[];
    seen_count_gt_1: number;
    link_strength_avg: number;
    link_strength_max: number;
    distinct_merchants: number;
    activity: {
      last_24h: number;
      last_7d: number;
      last_30d: number;
    };
    synthetic_count: number;
    real_csv_edges: number;
    real_support_commerce_edges: number;
  };
  cross_merchant: {
    total_edge_tuples: number;
    cross_merchant_tuples: number;
  };
  legacy: {
    fraud_entities: number;
    fraud_entity_co_occurrences: number;
  };
  synthetic_detection: {
    raw_prefixes: string[];
    note: string;
  };
};

export type Step7CriterionStatus = 'pass' | 'fail' | 'manual';

export type Step7ReadinessCriterion = {
  id: string;
  label: string;
  status: Step7CriterionStatus;
  detail: string;
};

export type Step7ReadinessReport = {
  ready: boolean;
  criteria: Step7ReadinessCriterion[];
  summary: string;
};

/** Minimum non-synthetic edges before Step 7 cutover is considered. */
export const STEP7_MIN_REAL_EDGES = 100;

/** Minimum share of edges that must be non-synthetic (0–1). */
export const STEP7_MIN_REAL_EDGE_SHARE = 0.95;

/** Minimum legacy co-occurrence coverage ratio (new / legacy) before legacy read removal. */
export const STEP7_MIN_NEW_TO_LEGACY_EDGE_RATIO = 0.1;

type ServiceClient = SupabaseClient<Database>;

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseBreakdown<T extends CoverageBreakdownRow>(
  rows: unknown,
  extraKeys: (row: Record<string, unknown>) => Omit<T, 'count'>
): T[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      count: asNumber(r.count),
      ...extraKeys(r),
    } as T;
  });
}

/** Parse RPC JSON into a typed coverage snapshot. */
export function parseIdentityGraphCoverageSnapshot(raw: unknown): IdentityGraphCoverageSnapshot {
  const data = (raw ?? {}) as Record<string, unknown>;
  const ids = (data.identity_identifiers ?? {}) as Record<string, unknown>;
  const edges = (data.identifier_co_occurrence_edges ?? {}) as Record<string, unknown>;
  const activity = (edges.activity ?? {}) as Record<string, unknown>;
  const cross = (data.cross_merchant ?? {}) as Record<string, unknown>;
  const legacy = (data.legacy ?? {}) as Record<string, unknown>;
  const synthetic = (data.synthetic_detection ?? {}) as Record<string, unknown>;

  return {
    generated_at: String(data.generated_at ?? ''),
    identity_identifiers: {
      total: asNumber(ids.total),
      by_type: parseBreakdown<IdentifierTypeBreakdown>(ids.by_type, (r) => ({
        identifier_type: String(r.identifier_type ?? ''),
      })),
      by_source_provider: parseBreakdown<SourceProviderBreakdown>(ids.by_source_provider, (r) => ({
        source_provider: String(r.source_provider ?? ''),
      })),
      synthetic_raw_count: asNumber(ids.synthetic_raw_count),
      plaintext_pii_violations: asNumber(ids.plaintext_pii_violations),
    },
    identifier_co_occurrence_edges: {
      total: asNumber(edges.total),
      by_source_provider: parseBreakdown<SourceProviderBreakdown>(edges.by_source_provider, (r) => ({
        source_provider: String(r.source_provider ?? ''),
      })),
      by_merchant_id: parseBreakdown<MerchantEdgeBreakdown>(edges.by_merchant_id, (r) => ({
        merchant_id: String(r.merchant_id ?? ''),
      })),
      by_pair_type: parseBreakdown<EdgePairTypeBreakdown>(edges.by_pair_type, (r) => ({
        left_identifier_type: String(r.left_identifier_type ?? ''),
        right_identifier_type: String(r.right_identifier_type ?? ''),
      })),
      seen_count_gt_1: asNumber(edges.seen_count_gt_1),
      link_strength_avg: asNumber(edges.link_strength_avg),
      link_strength_max: asNumber(edges.link_strength_max),
      distinct_merchants: asNumber(edges.distinct_merchants),
      activity: {
        last_24h: asNumber(activity.last_24h),
        last_7d: asNumber(activity.last_7d),
        last_30d: asNumber(activity.last_30d),
      },
      synthetic_count: asNumber(edges.synthetic_count),
      real_csv_edges: asNumber(edges.real_csv_edges),
      real_support_commerce_edges: asNumber(edges.real_support_commerce_edges),
    },
    cross_merchant: {
      total_edge_tuples: asNumber(cross.total_edge_tuples),
      cross_merchant_tuples: asNumber(cross.cross_merchant_tuples),
    },
    legacy: {
      fraud_entities: asNumber(legacy.fraud_entities),
      fraud_entity_co_occurrences: asNumber(legacy.fraud_entity_co_occurrences),
    },
    synthetic_detection: {
      raw_prefixes: Array.isArray(synthetic.raw_prefixes)
        ? synthetic.raw_prefixes.map(String)
        : [...SYNTHETIC_RAW_IDENTIFIER_PREFIXES],
      note: String(synthetic.note ?? ''),
    },
  };
}

/** Service-role RPC fetch for identity graph coverage. */
export async function fetchIdentityGraphCoverage(
  serviceClient: ServiceClient,
  options?: { syntheticRawPrefixes?: readonly string[] }
): Promise<IdentityGraphCoverageSnapshot> {
  const prefixes = options?.syntheticRawPrefixes ?? SYNTHETIC_RAW_IDENTIFIER_PREFIXES;
  const { data, error } = await serviceClient.rpc('get_identity_graph_coverage' as never, {
    p_synthetic_raw_prefixes: [...prefixes],
  } as never);
  if (error) {
    throw new Error(`get_identity_graph_coverage failed: ${error.message}`);
  }
  return parseIdentityGraphCoverageSnapshot(data);
}

/** Derive Step 7 readiness from a coverage snapshot (automated checks only). */
export function assessStep7Readiness(
  snapshot: IdentityGraphCoverageSnapshot,
  thresholds?: {
    minRealEdges?: number;
    minRealEdgeShare?: number;
    minNewToLegacyEdgeRatio?: number;
  }
): Step7ReadinessReport {
  const minRealEdges = thresholds?.minRealEdges ?? STEP7_MIN_REAL_EDGES;
  const minRealEdgeShare = thresholds?.minRealEdgeShare ?? STEP7_MIN_REAL_EDGE_SHARE;
  const minNewToLegacyRatio =
    thresholds?.minNewToLegacyEdgeRatio ?? STEP7_MIN_NEW_TO_LEGACY_EDGE_RATIO;

  const edges = snapshot.identifier_co_occurrence_edges;
  const realEdges = Math.max(0, edges.total - edges.synthetic_count);
  const realEdgeShare = edges.total > 0 ? realEdges / edges.total : 0;
  const newToLegacyRatio =
    snapshot.legacy.fraud_entity_co_occurrences > 0
      ? edges.total / snapshot.legacy.fraud_entity_co_occurrences
      : 0;

  const criteria: Step7ReadinessCriterion[] = [
    {
      id: 'meaningful_real_edges',
      label: 'New edges include meaningful real (non-synthetic) data',
      status:
        realEdges >= minRealEdges && realEdgeShare >= minRealEdgeShare ? 'pass' : 'fail',
      detail: `${realEdges} real edges (${(realEdgeShare * 100).toFixed(1)}% non-synthetic); need ≥${minRealEdges} edges and ≥${(minRealEdgeShare * 100).toFixed(0)}% real`,
    },
    {
      id: 'csv_import_path',
      label: 'At least one real CSV/import path has generated edges',
      status: edges.real_csv_edges > 0 ? 'pass' : 'fail',
      detail: `${edges.real_csv_edges} non-synthetic csv edges`,
    },
    {
      id: 'support_helpdesk_path',
      label: 'At least one real support/helpdesk/commerce path has generated edges',
      status: edges.real_support_commerce_edges > 0 ? 'pass' : 'fail',
      detail: `${edges.real_support_commerce_edges} non-synthetic gorgias/shopify/commerce edges`,
    },
    {
      id: 'fastcontext_parity',
      label: 'fastContext.ts returns equivalent or better context for sampled profiles',
      status: 'manual',
      detail: 'Sample merchant profiles and compare dual-read merge output before removing legacy reads',
    },
    {
      id: 'legacy_dependency_low',
      label: 'Legacy-only co-occurrence dependency is measured and low enough',
      status: newToLegacyRatio >= minNewToLegacyRatio ? 'pass' : 'fail',
      detail: `new/legacy edge ratio ${(newToLegacyRatio * 100).toFixed(2)}% (${edges.total} new vs ${snapshot.legacy.fraud_entity_co_occurrences} legacy); need ≥${(minNewToLegacyRatio * 100).toFixed(0)}%`,
    },
    {
      id: 'no_plaintext_pii',
      label: 'No plaintext PII in new graph identifier registry',
      status: snapshot.identity_identifiers.plaintext_pii_violations === 0 ? 'pass' : 'fail',
      detail: `${snapshot.identity_identifiers.plaintext_pii_violations} plaintext PII violation(s) in identity_identifiers`,
    },
    {
      id: 'rls_security',
      label: 'No RLS/security regression on network graph tables',
      status: 'manual',
      detail: 'Confirm identity_identifiers, identifier_co_occurrence_edges, and coverage RPC remain service_role only',
    },
  ];

  const automated = criteria.filter((c) => c.status !== 'manual');
  const ready =
    automated.every((c) => c.status === 'pass') &&
    criteria.every((c) => c.status !== 'fail');

  const failCount = criteria.filter((c) => c.status === 'fail').length;
  const manualCount = criteria.filter((c) => c.status === 'manual').length;
  const summary = ready
    ? 'All automated Step 7 criteria pass; complete manual checks before legacy cleanup.'
    : `${failCount} automated criterion/criteria failing, ${manualCount} manual check(s) pending — Step 7 remains blocked.`;

  return { ready, criteria, summary };
}

/** Format coverage snapshot as a human-readable report string. */
export function formatIdentityGraphCoverageReport(
  snapshot: IdentityGraphCoverageSnapshot,
  readiness?: Step7ReadinessReport
): string {
  const lines: string[] = [
    '=== Identity Graph Coverage (Step 6.6) ===',
    `Generated: ${snapshot.generated_at}`,
    '',
    '--- Registry (identity_identifiers) ---',
    `Total: ${snapshot.identity_identifiers.total}`,
    ...snapshot.identity_identifiers.by_type.map(
      (r) => `  ${r.identifier_type}: ${r.count}`
    ),
    'By source_provider:',
    ...snapshot.identity_identifiers.by_source_provider.map(
      (r) => `  ${r.source_provider}: ${r.count}`
    ),
    `Synthetic raw identifiers: ${snapshot.identity_identifiers.synthetic_raw_count}`,
    `Plaintext PII violations: ${snapshot.identity_identifiers.plaintext_pii_violations}`,
    '',
    '--- Edges (identifier_co_occurrence_edges) ---',
    `Total: ${snapshot.identifier_co_occurrence_edges.total}`,
    `Non-synthetic: ${Math.max(0, snapshot.identifier_co_occurrence_edges.total - snapshot.identifier_co_occurrence_edges.synthetic_count)}`,
    `Synthetic (detected): ${snapshot.identifier_co_occurrence_edges.synthetic_count}`,
    `Distinct merchants: ${snapshot.identifier_co_occurrence_edges.distinct_merchants}`,
    `seen_count > 1: ${snapshot.identifier_co_occurrence_edges.seen_count_gt_1}`,
    `link_strength avg/max: ${snapshot.identifier_co_occurrence_edges.link_strength_avg} / ${snapshot.identifier_co_occurrence_edges.link_strength_max}`,
    'Activity (last_seen_at):',
    `  24h: ${snapshot.identifier_co_occurrence_edges.activity.last_24h}`,
    `  7d:  ${snapshot.identifier_co_occurrence_edges.activity.last_7d}`,
    `  30d: ${snapshot.identifier_co_occurrence_edges.activity.last_30d}`,
    'By source_provider:',
    ...snapshot.identifier_co_occurrence_edges.by_source_provider.map(
      (r) => `  ${r.source_provider}: ${r.count}`
    ),
    'Real path edges (non-synthetic):',
    `  csv: ${snapshot.identifier_co_occurrence_edges.real_csv_edges}`,
    `  support/commerce: ${snapshot.identifier_co_occurrence_edges.real_support_commerce_edges}`,
    'By pair type:',
    ...snapshot.identifier_co_occurrence_edges.by_pair_type.map(
      (r) => `  ${r.left_identifier_type} ↔ ${r.right_identifier_type}: ${r.count}`
    ),
    'By merchant_id:',
    ...snapshot.identifier_co_occurrence_edges.by_merchant_id.map(
      (r) => `  ${r.merchant_id}: ${r.count}`
    ),
    '',
    '--- Cross-merchant (v_identifier_edges_cross_merchant) ---',
    `Edge tuples: ${snapshot.cross_merchant.total_edge_tuples}`,
    `Cross-merchant tuples: ${snapshot.cross_merchant.cross_merchant_tuples}`,
    '',
    '--- Legacy comparison ---',
    `fraud_entities: ${snapshot.legacy.fraud_entities}`,
    `fraud_entity_co_occurrences: ${snapshot.legacy.fraud_entity_co_occurrences}`,
  ];

  if (readiness) {
    lines.push('', '--- Step 7 readiness ---', readiness.summary);
    for (const c of readiness.criteria) {
      const icon = c.status === 'pass' ? '✓' : c.status === 'fail' ? '✗' : '?';
      lines.push(`  [${icon}] ${c.label}`);
      lines.push(`      ${c.detail}`);
    }
  }

  return lines.join('\n');
}
