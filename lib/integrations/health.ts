export type CoverageStatus = 'complete' | 'partial' | 'missing' | 'not_applicable' | 'error' | 'stale';
export const COVERAGE_CATEGORIES = ['orders','support_tickets','payments_disputes','tracking_delivery_proof','warehouse_fulfilment','returns','product_cost','policies_agreements','notifications'] as const;
const ENTITY_CATEGORIES: Record<string, typeof COVERAGE_CATEGORIES[number]> = { order: 'orders', ticket: 'support_tickets', payment: 'payments_disputes', transaction: 'payments_disputes', dispute: 'payments_disputes', shipment: 'tracking_delivery_proof', tracking_event: 'tracking_delivery_proof', fulfilment: 'warehouse_fulfilment', return: 'returns', product: 'product_cost', agreement: 'policies_agreements', message: 'notifications' };

export function coverageFromRecords(records: Array<{ source_entity_type: string; freshness_state: string; sync_state: string }>, applicable: Partial<Record<typeof COVERAGE_CATEGORIES[number], boolean>> = {}) {
  return COVERAGE_CATEGORIES.map((category) => {
    if (applicable[category] === false) return { category, status: 'not_applicable' as CoverageStatus, recordCount: 0 };
    const rows = records.filter((row) => ENTITY_CATEGORIES[row.source_entity_type] === category);
    if (!rows.length) return { category, status: 'missing' as CoverageStatus, recordCount: 0 };
    if (rows.some((row) => row.sync_state === 'failed')) return { category, status: 'error' as CoverageStatus, recordCount: rows.length };
    if (rows.every((row) => row.freshness_state === 'stale')) return { category, status: 'stale' as CoverageStatus, recordCount: rows.length };
    if (rows.some((row) => row.freshness_state === 'stale' || row.sync_state === 'pending')) return { category, status: 'partial' as CoverageStatus, recordCount: rows.length };
    return { category, status: 'complete' as CoverageStatus, recordCount: rows.length };
  });
}

export function connectionFreshness(value: string | null, nowMs: number): 'current' | 'stale' | 'unknown' {
  if (!value) return 'unknown'; const parsed = Date.parse(value); if (Number.isNaN(parsed)) return 'unknown'; return nowMs - parsed > 24 * 60 * 60 * 1000 ? 'stale' : 'current';
}
