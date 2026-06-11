import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import type { ScoredOrder } from '@/lib/engine/types';
import {
  accumulateV1IdentifierGraphFromScoredBatch,
  canonicalizeEdgePair,
  isV1IdentifierType,
  type IdentifierGraphSourceProvider,
  type IdentifierRef,
  mapIngestionSourceToGraphProvider,
} from '@/lib/identity/identifierGraph';

type ServiceClient = SupabaseClient<Database>;

export type SupportTicketGraphInput = {
  merchantId: string;
  supportCaseId: string;
  helpdeskTicketId: string;
  helpdeskCustomerId: string | null;
  customerEmailHash: string | null;
  platformOrderId: string | null;
  sourceProvider: IdentifierGraphSourceProvider;
};

function splitIntoBatches<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

/**
 * Dual-write path for the v1 identity graph. Legacy fraud_entities /
 * fraud_entity_co_occurrences writes remain in worker.ts unchanged.
 */
export async function writeIdentifierGraphFromScoredBatch(
  scored: ScoredOrder[],
  serviceClient: ServiceClient,
  input: {
    merchantId: string;
    sourceProvider: IdentifierGraphSourceProvider;
  }
): Promise<{ identifiers: number; edges: number }> {
  const { identifiers, edgeCounts } = accumulateV1IdentifierGraphFromScoredBatch(scored);
  if (identifiers.length === 0 && edgeCounts.size === 0) {
    return { identifiers: 0, edges: 0 };
  }

  const provider = input.sourceProvider;

  if (identifiers.length > 0) {
    const identifierPayload = identifiers
      .filter((id) => isV1IdentifierType(id.type))
      .map((id) => ({
        identifier_type: id.type,
        identifier_hash: id.hash,
        raw_vs_hashed_storage: id.rawVsHashedStorage ?? 'hashed',
      }));
    for (const chunk of splitIntoBatches(identifierPayload, 2000)) {
      const { error } = await serviceClient.rpc('bulk_upsert_identity_identifiers', {
        p_identifiers: chunk,
        p_source_provider: provider,
      });
      if (error) {
        throw new Error(`bulk_upsert_identity_identifiers failed: ${error.message}`);
      }
    }
  }

  if (edgeCounts.size > 0) {
    const edgePayload = Array.from(edgeCounts.values())
      .filter(
        (edge) =>
          isV1IdentifierType(edge.left.type) && isV1IdentifierType(edge.right.type)
      )
      .map((edge) => ({
      left_type: edge.left.type,
      left_hash: edge.left.hash,
      right_type: edge.right.type,
      right_hash: edge.right.hash,
      count_delta: edge.count,
    }));
    for (const chunk of splitIntoBatches(edgePayload, 2000)) {
      const { error } = await serviceClient.rpc('bulk_upsert_identifier_co_occurrence_edges', {
        p_merchant_id: input.merchantId,
        p_edges: chunk,
        p_source_provider: provider,
      });
      if (error) {
        throw new Error(`bulk_upsert_identifier_co_occurrence_edges failed: ${error.message}`);
      }
    }
  }

  return { identifiers: identifiers.length, edges: edgeCounts.size };
}

/** Best-effort helpdesk ticket graph writes at Gorgias/Freshdesk intake. */
export async function writeIdentifierGraphFromSupportTicket(
  serviceClient: ServiceClient,
  input: SupportTicketGraphInput
): Promise<void> {
  const identifiers: IdentifierRef[] = [];
  const pairs: Array<{ left: IdentifierRef; right: IdentifierRef }> = [];

  if (input.customerEmailHash) {
    identifiers.push({
      type: 'normalized_email_hash',
      hash: input.customerEmailHash,
      rawVsHashedStorage: 'hashed',
    });
  }
  if (input.helpdeskCustomerId?.trim()) {
    identifiers.push({
      type: 'helpdesk_customer_id',
      hash: input.helpdeskCustomerId.trim(),
      rawVsHashedStorage: 'raw',
    });
  }
  if (input.helpdeskTicketId?.trim()) {
    identifiers.push({
      type: 'helpdesk_ticket_id',
      hash: input.helpdeskTicketId.trim(),
      rawVsHashedStorage: 'raw',
    });
  }
  if (input.platformOrderId?.trim()) {
    identifiers.push({
      type: 'platform_order_id',
      hash: input.platformOrderId.trim(),
      rawVsHashedStorage: 'raw',
    });
  }

  if (
    input.helpdeskCustomerId?.trim() &&
    input.customerEmailHash
  ) {
    pairs.push(
      canonicalizeEdgePair(
        {
          type: 'helpdesk_customer_id',
          hash: input.helpdeskCustomerId.trim(),
          rawVsHashedStorage: 'raw',
        },
        {
          type: 'normalized_email_hash',
          hash: input.customerEmailHash,
          rawVsHashedStorage: 'hashed',
        }
      )
    );
  }

  if (input.helpdeskTicketId?.trim() && input.platformOrderId?.trim()) {
    pairs.push(
      canonicalizeEdgePair(
        {
          type: 'helpdesk_ticket_id',
          hash: input.helpdeskTicketId.trim(),
          rawVsHashedStorage: 'raw',
        },
        {
          type: 'platform_order_id',
          hash: input.platformOrderId.trim(),
          rawVsHashedStorage: 'raw',
        }
      )
    );
  }

  if (input.customerEmailHash && input.platformOrderId?.trim()) {
    pairs.push(
      canonicalizeEdgePair(
        {
          type: 'normalized_email_hash',
          hash: input.customerEmailHash,
          rawVsHashedStorage: 'hashed',
        },
        {
          type: 'platform_order_id',
          hash: input.platformOrderId.trim(),
          rawVsHashedStorage: 'raw',
        }
      )
    );
  }

  if (identifiers.length === 0 && pairs.length === 0) return;

  if (identifiers.length > 0) {
    const { error } = await serviceClient.rpc('bulk_upsert_identity_identifiers', {
      p_identifiers: identifiers.map((id) => ({
        identifier_type: id.type,
        identifier_hash: id.hash,
        raw_vs_hashed_storage: id.rawVsHashedStorage ?? 'hashed',
      })),
      p_source_provider: input.sourceProvider,
    });
    if (error) {
      throw new Error(`support_bulk_upsert_identity_identifiers failed: ${error.message}`);
    }
  }

  if (pairs.length > 0) {
    const { error } = await serviceClient.rpc('bulk_upsert_identifier_co_occurrence_edges', {
      p_merchant_id: input.merchantId,
      p_edges: pairs.map((pair) => ({
        left_type: pair.left.type,
        left_hash: pair.left.hash,
        right_type: pair.right.type,
        right_hash: pair.right.hash,
        count_delta: 1,
      })),
      p_source_provider: input.sourceProvider,
    });
    if (error) {
      throw new Error(`support_bulk_upsert_identifier_co_occurrence_edges failed: ${error.message}`);
    }
  }
}

export { mapIngestionSourceToGraphProvider };
