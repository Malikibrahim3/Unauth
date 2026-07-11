import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import type { NormalizedEvidenceItem } from '@/lib/integrations/types';

/**
 * Canonical evidence writer (Phase 7.1). Integration and claim-gate evidence
 * is persisted into the single canonical `evidence_items` store plus a
 * `evidence_links` row for the support payout case, retiring the legacy
 * `integration_evidence_items` table.
 *
 * Provider/provenance fields map onto flat canonical columns so readers keep
 * simple (join-free) filters:
 *   source_provider  → source_system
 *   raw_reference    → source_record_id
 *   supportPayoutCaseId → claim_id  (+ evidence_links.support_payout_case_id)
 * The provider-shaped extras (source_category, string confidence label, value)
 * live in structured_value / source_metadata for lossless reconstruction.
 */

const CONFIDENCE_NUMERIC: Record<string, number> = { high: 1, medium: 0.6, low: 0.3 };

export function canonicalEvidenceItemRows(items: NormalizedEvidenceItem[]) {
  return items.map((item) => ({
    id: item.id,
    merchant_id: item.merchantId,
    claim_id: item.supportPayoutCaseId ?? null,
    evidence_type: item.evidenceType,
    title: item.title,
    summary: item.summary,
    confidence: CONFIDENCE_NUMERIC[item.confidence] ?? null,
    source_system: item.sourceProvider,
    source_record_id: item.rawReference ?? null,
    source_created_at: item.occurredAt ?? null,
    structured_value: { value: item.value === undefined ? null : item.value },
    source_metadata: {
      source_category: item.sourceCategory,
      confidence_label: item.confidence,
      migration_key: `integration_evidence:${item.id}`,
    },
    created_at: item.createdAt,
  }));
}

/**
 * Reconstruct the provider-shaped evidence row (matching the legacy
 * `integration_evidence_items` select shape) from a canonical `evidence_items`
 * row, so existing reader/normalisation code is unchanged.
 */
export type CanonicalEvidenceRow = {
  id?: string;
  merchant_id?: string;
  claim_id?: string | null;
  evidence_type: string;
  title?: string;
  summary: string | null;
  confidence?: number | null;
  source_system?: string | null;
  source_record_id?: string | null;
  source_created_at?: string | null;
  structured_value?: { value?: unknown } | null;
  source_metadata?: { source_category?: string; confidence_label?: string } | null;
  created_at?: string;
};

export function providerShapeFromCanonical(row: CanonicalEvidenceRow) {
  return {
    id: row.id,
    merchant_id: row.merchant_id,
    support_payout_case_id: row.claim_id ?? null,
    source_provider: row.source_system ?? null,
    source_category: row.source_metadata?.source_category ?? null,
    evidence_type: row.evidence_type,
    title: row.title,
    summary: row.summary,
    confidence: row.source_metadata?.confidence_label ?? null,
    value: row.structured_value?.value ?? null,
    occurred_at: row.source_created_at ?? null,
    raw_reference: row.source_record_id ?? null,
    created_at: row.created_at,
  };
}

export async function writeCanonicalEvidence(
  client: SupabaseClient,
  items: NormalizedEvidenceItem[],
): Promise<void> {
  if (items.length === 0) return;
  const rows = canonicalEvidenceItemRows(items);
  const { error } = await client
    .from(TABLES.EVIDENCE_ITEMS as never)
    .upsert(rows as never, { onConflict: 'id' });
  if (error) throw new Error(`canonical_evidence_items_write_failed: ${error.message}`);

  const linkRows = items
    .filter((item) => item.supportPayoutCaseId)
    .map((item) => ({
      merchant_id: item.merchantId,
      evidence_item_id: item.id,
      support_payout_case_id: item.supportPayoutCaseId as string,
    }));
  if (linkRows.length > 0) {
    const { error: linkError } = await client
      .from(TABLES.EVIDENCE_LINKS as never)
      .upsert(linkRows as never, {
        onConflict: 'evidence_item_id,support_payout_case_id',
        ignoreDuplicates: true,
      });
    if (linkError) throw new Error(`canonical_evidence_links_write_failed: ${linkError.message}`);
  }
}
