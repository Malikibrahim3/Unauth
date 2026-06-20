/**
 * Deterministic ticket → claim resolution for claim decision evaluation.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { ACTIVE_CLAIM_STATUSES } from '@/lib/claims/sla';
import { TABLES } from '@/lib/supabase/tables';

export type ClaimResolutionCandidate = {
  claimId: string;
  status: string | null;
  claimType: string | null;
  sourceTicketId: string | null;
  sourceOrderId: string | null;
  createdAt: string | null;
};

export type ClaimResolutionStatus =
  | 'resolved'
  | 'created'
  | 'not_claim'
  | 'ambiguous'
  | 'not_found';

export type ClaimResolutionResult = {
  status: ClaimResolutionStatus;
  claimId: string | null;
  sourceTicketId: string | null;
  reason: string;
  candidates?: ClaimResolutionCandidate[];
};

const ACTIVE = new Set<string>(ACTIVE_CLAIM_STATUSES);

function isActiveStatus(status: string | null | undefined): boolean {
  return ACTIVE.has(String(status ?? ''));
}

function sortByRecency(a: ClaimResolutionCandidate, b: ClaimResolutionCandidate): number {
  const aTs = a.createdAt ? Date.parse(a.createdAt) : 0;
  const bTs = b.createdAt ? Date.parse(b.createdAt) : 0;
  return bTs - aTs;
}

/**
 * Pure selection from candidate claims — prefer active, then claim type match,
 * never pick blindly when multiple plausible active claims remain.
 */
export function pickClaimFromCandidates(
  candidates: ClaimResolutionCandidate[],
  claimType?: string | null,
): Pick<ClaimResolutionResult, 'status' | 'claimId' | 'reason' | 'candidates'> {
  if (candidates.length === 0) {
    return { status: 'not_found', claimId: null, reason: 'no_claim_candidates' };
  }

  let pool = [...candidates];
  if (claimType) {
    const typed = pool.filter((c) => c.claimType === claimType);
    if (typed.length > 0) pool = typed;
  }

  const active = pool.filter((c) => isActiveStatus(c.status));
  if (active.length === 1) {
    return {
      status: 'resolved',
      claimId: active[0].claimId,
      reason: 'single_active_claim_on_ticket',
    };
  }
  if (active.length > 1) {
    return {
      status: 'ambiguous',
      claimId: null,
      reason: 'multiple_active_claims_on_ticket',
      candidates: active.sort(sortByRecency),
    };
  }

  if (pool.length === 1) {
    return {
      status: 'resolved',
      claimId: pool[0].claimId,
      reason: 'single_claim_on_ticket',
    };
  }

  return {
    status: 'ambiguous',
    claimId: null,
    reason: 'multiple_claims_on_ticket',
    candidates: pool.sort(sortByRecency),
  };
}

function mapClaimRow(row: Record<string, unknown>): ClaimResolutionCandidate {
  return {
    claimId: String(row.id),
    status: (row.status as string) ?? null,
    claimType: (row.claim_type as string) ?? null,
    sourceTicketId: (row.source_ticket_id as string) ?? null,
    sourceOrderId: (row.source_order_id as string) ?? null,
    createdAt: (row.created_at as string) ?? (row.submitted_at as string) ?? null,
  };
}

async function loadClaimsByTicketId(
  client: SupabaseClient,
  merchantId: string,
  sourceTicketId: string,
): Promise<ClaimResolutionCandidate[]> {
  const { data, error } = await client
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id, status, claim_type, source_ticket_id, source_order_id, created_at, submitted_at')
    .eq('merchant_id', merchantId)
    .eq('source_ticket_id', sourceTicketId);
  if (error) throw new Error(`resolveClaimForTicketDecision: ticket claims failed: ${error.message}`);
  return (data ?? []).map((row) => mapClaimRow(row as Record<string, unknown>));
}

async function loadOpenClaimsByOrderId(
  client: SupabaseClient,
  merchantId: string,
  sourceOrderId: string,
): Promise<ClaimResolutionCandidate[]> {
  const { data, error } = await client
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id, status, claim_type, source_ticket_id, source_order_id, created_at, submitted_at')
    .eq('merchant_id', merchantId)
    .eq('source_order_id', sourceOrderId)
    .in('status', [...ACTIVE_CLAIM_STATUSES]);
  if (error) throw new Error(`resolveClaimForTicketDecision: order claims failed: ${error.message}`);
  return (data ?? []).map((row) => mapClaimRow(row as Record<string, unknown>));
}

async function resolveSourceTicketId(
  client: SupabaseClient,
  merchantId: string,
  ticketExternalId: string | null,
  ticketId: string | null,
): Promise<string | null> {
  if (ticketId?.trim()) return ticketId.trim();
  if (!ticketExternalId?.trim()) return null;
  const { data } = await client
    .from('source_tickets')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('external_id', ticketExternalId.trim())
    .maybeSingle();
  return data?.id ? String(data.id) : null;
}

async function resolveSourceOrderId(
  client: SupabaseClient,
  merchantId: string,
  orderReference: string | null,
): Promise<string | null> {
  if (!orderReference?.trim()) return null;
  const ref = orderReference.replace(/^#/, '').trim();
  const { data } = await client
    .from('source_orders')
    .select('id')
    .eq('merchant_id', merchantId)
    .or(`order_number.eq.${ref},external_id.eq.${ref}`)
    .limit(1)
    .maybeSingle();
  return data?.id ? String(data.id) : null;
}

export async function resolveClaimForTicketDecision(
  client: SupabaseClient,
  input: {
    merchantId: string;
    ticketExternalId?: string | null;
    ticketId?: string | null;
    orderReference?: string | null;
    claimType?: string | null;
    allowEnsureClaim?: boolean;
  },
): Promise<ClaimResolutionResult> {
  const sourceTicketId = await resolveSourceTicketId(
    client,
    input.merchantId,
    input.ticketExternalId ?? null,
    input.ticketId ?? null,
  );

  if (sourceTicketId) {
    const ticketClaims = await loadClaimsByTicketId(client, input.merchantId, sourceTicketId);
    const picked = pickClaimFromCandidates(ticketClaims, input.claimType ?? null);
    if (picked.status === 'resolved') {
      return {
        ...picked,
        sourceTicketId,
      };
    }
    if (picked.status === 'ambiguous') {
      return {
        ...picked,
        sourceTicketId,
      };
    }
  }

  const sourceOrderId = await resolveSourceOrderId(
    client,
    input.merchantId,
    input.orderReference ?? null,
  );
  if (sourceOrderId) {
    const openOrderClaims = await loadOpenClaimsByOrderId(client, input.merchantId, sourceOrderId);
    if (openOrderClaims.length === 1) {
      return {
        status: 'resolved',
        claimId: openOrderClaims[0].claimId,
        sourceTicketId,
        reason: 'single_open_claim_on_order',
      };
    }
    if (openOrderClaims.length > 1) {
      const typed = input.claimType
        ? openOrderClaims.filter((c) => c.claimType === input.claimType)
        : openOrderClaims;
      if (typed.length === 1) {
        return {
          status: 'resolved',
          claimId: typed[0].claimId,
          sourceTicketId,
          reason: 'single_matching_open_claim_on_order',
        };
      }
      return {
        status: 'ambiguous',
        claimId: null,
        sourceTicketId,
        reason: 'multiple_open_claims_on_order',
        candidates: openOrderClaims.sort(sortByRecency),
      };
    }
  }

  if (sourceTicketId) {
    return {
      status: 'not_found',
      claimId: null,
      sourceTicketId,
      reason: 'ticket_exists_no_claim_row',
    };
  }

  return {
    status: 'not_found',
    claimId: null,
    sourceTicketId: null,
    reason: 'ticket_not_ingested',
  };
}

/** @deprecated Use resolveClaimForTicketDecision */
export async function resolveClaimIdForTicket(
  client: SupabaseClient,
  merchantId: string,
  ticketExternalId: string | null,
  orderRef: string | null,
): Promise<string | null> {
  const result = await resolveClaimForTicketDecision(client, {
    merchantId,
    ticketExternalId,
    orderReference: orderRef,
  });
  return result.status === 'resolved' ? result.claimId : null;
}
