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

/** Marker identifying evidence that used to live in the claim_evidence store. */
export const CLAIM_EVIDENCE_ORIGIN = 'claim_evidence';

/**
 * PostgREST `.or()` filter selecting the claim_evidence-origin subset of
 * evidence_items: backfilled rows (legacy_table) and new runtime writes
 * (origin_store). Used by decision/claim readers so counts are identical to the
 * pre-cutover claim_evidence table (preserving frozen decision-context scoring).
 */
export const CLAIM_EVIDENCE_ORIGIN_FILTER =
  `source_metadata->>origin_store.eq.${CLAIM_EVIDENCE_ORIGIN},source_metadata->>legacy_table.eq.${CLAIM_EVIDENCE_ORIGIN}`;

export type ClaimEvidenceInput = {
  id?: string;
  merchantId: string;
  claimId: string;
  evidenceType: string;
  storagePath?: string | null;
  contentHash?: string | null;
  sourceMetadata?: Record<string, unknown>;
  createdBy?: string | null;
  title?: string | null;
  summary?: string | null;
  sourceSystem?: string | null;
  sourceRecordId?: string | null;
  sourceCreatedAt?: string | null;
  structuredValue?: Record<string, unknown> | null;
  externalUrl?: string | null;
};

function claimEvidenceRow(input: ClaimEvidenceInput) {
  const metadataSource = typeof input.sourceMetadata?.source === 'string'
    ? input.sourceMetadata.source
    : null;
  return {
    ...(input.id ? { id: input.id } : {}),
    merchant_id: input.merchantId,
    claim_id: input.claimId,
    evidence_type: input.evidenceType,
    storage_path: input.storagePath ?? null,
    content_hash: input.contentHash ?? null,
    title: input.title ?? null,
    summary: input.summary ?? null,
    source_system: input.sourceSystem ?? metadataSource ?? 'manual',
    source_record_id: input.sourceRecordId ?? null,
    source_created_at: input.sourceCreatedAt ?? null,
    external_url: input.externalUrl ?? null,
    structured_value: input.structuredValue ?? {},
    source_metadata: { ...(input.sourceMetadata ?? {}), origin_store: CLAIM_EVIDENCE_ORIGIN },
    created_by: input.createdBy ?? null,
  };
}

async function linkEvidenceToCase(
  client: SupabaseClient,
  merchantId: string,
  evidenceItemId: string,
  claimId: string,
): Promise<void> {
  await client
    .from(TABLES.EVIDENCE_LINKS as never)
    .upsert(
      { merchant_id: merchantId, evidence_item_id: evidenceItemId, support_payout_case_id: claimId } as never,
      { onConflict: 'evidence_item_id,support_payout_case_id', ignoreDuplicates: true },
    );
}

/**
 * Insert claim-scoped evidence into canonical evidence_items. Returns the raw
 * insert result so callers can honour the fulfillment-sync idempotency index
 * (unique violation code 23505) exactly as the legacy claim_evidence path did.
 */
export async function insertClaimEvidence(
  client: SupabaseClient,
  input: ClaimEvidenceInput,
): Promise<{ id: string | null; error: { code?: string; message: string } | null }> {
  const { data, error } = await client
    .from(TABLES.EVIDENCE_ITEMS as never)
    .insert(claimEvidenceRow(input) as never)
    .select('id')
    .single();
  if (error) return { id: null, error };
  const id = (data as { id: string }).id;
  await linkEvidenceToCase(client, input.merchantId, id, input.claimId);
  return { id, error: null };
}

/** Upsert claim-scoped evidence (onConflict id) into canonical evidence_items. */
export async function upsertClaimEvidence(
  client: SupabaseClient,
  input: ClaimEvidenceInput,
): Promise<Record<string, unknown>> {
  const { data, error } = await client
    .from(TABLES.EVIDENCE_ITEMS as never)
    .upsert(claimEvidenceRow(input) as never, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw new Error(`upsert claim evidence failed: ${error.message}`);
  const row = data as Record<string, unknown>;
  await linkEvidenceToCase(client, input.merchantId, row.id as string, input.claimId);
  return row;
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
