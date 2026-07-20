import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';

export type MerchantCustomerHistory = {
  merchantCustomerId: string | null;
  refundRequests365d: number;
  payoutCases365d: number;
  completedRefunds365d: number;
  completedRefundAmountByCurrency: Record<string, number>;
  possibleMatches: Array<{
    candidateId: string;
    displayName: string | null;
    email: string | null;
    confidence: number | null;
    matchedTypes: string[];
  }>;
};

type Client = SupabaseClient<any>;

const EMPTY_HISTORY: MerchantCustomerHistory = {
  merchantCustomerId: null,
  refundRequests365d: 0,
  payoutCases365d: 0,
  completedRefunds365d: 0,
  completedRefundAmountByCurrency: {},
  possibleMatches: [],
};

function trailing365Start(): string {
  return new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
}

export async function resolveMerchantCustomerId(
  client: Client,
  merchantId: string,
  profileId: string,
): Promise<string | null> {
  const { data: canonical } = await client
    .from(TABLES.MERCHANT_CUSTOMERS)
    .select('id, resolution_status, superseded_by')
    .eq('merchant_id', merchantId)
    .eq('id', profileId)
    .maybeSingle();
  if (canonical?.id) {
    const supersededBy = canonical.superseded_by as string | null | undefined;
    return supersededBy ?? String(canonical.id);
  }

  const { data: sourceCustomer } = await client
    .from(TABLES.SOURCE_CUSTOMERS)
    .select('merchant_customer_id')
    .eq('merchant_id', merchantId)
    .eq('id', profileId)
    .maybeSingle();
  const linkedId = sourceCustomer?.merchant_customer_id as string | null | undefined;
  if (!linkedId) return null;
  const { data: linkedCanonical } = await client
    .from(TABLES.MERCHANT_CUSTOMERS)
    .select('id, superseded_by')
    .eq('merchant_id', merchantId)
    .eq('id', linkedId)
    .maybeSingle();
  const supersededBy = linkedCanonical?.superseded_by as string | null | undefined;
  return supersededBy ?? linkedId;
}

export async function loadMerchantCustomerHistory(
  client: Client,
  merchantId: string,
  profileId: string,
): Promise<MerchantCustomerHistory> {
  const merchantCustomerId = await resolveMerchantCustomerId(client, merchantId, profileId);
  if (!merchantCustomerId) return { ...EMPTY_HISTORY };
  const since = trailing365Start();

  const { data: caseRows, error: caseError } = await client
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id, claim_type, requested_action, status, submitted_at')
    .eq('merchant_id', merchantId)
    .eq('merchant_customer_id', merchantCustomerId)
    .gte('submitted_at', since);
  if (caseError) {
    // The read path remains compatible with a deployment where the additive
    // migration has not been applied yet.
    return { ...EMPTY_HISTORY, merchantCustomerId };
  }

  const activeCases = (caseRows ?? []).filter(
    (row: Record<string, unknown>) => row.status !== 'voided' && row.status !== 'stale',
  );
  const refundRequests = activeCases.filter((row: Record<string, unknown>) =>
    row.requested_action === 'refund' || row.claim_type === 'refund_request',
  ).length;

  const { data: orderRows } = await client
    .from(TABLES.SOURCE_ORDERS)
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('merchant_customer_id', merchantCustomerId);
  const orderIds = (orderRows ?? []).map((row: { id: string }) => row.id);

  let completedRefunds365d = 0;
  const completedRefundAmountByCurrency: Record<string, number> = {};
  for (let offset = 0; offset < orderIds.length; offset += 200) {
    const chunk = orderIds.slice(offset, offset + 200);
    const { data: refunds } = await client
      .from(TABLES.SOURCE_REFUNDS)
      .select('amount, currency, refunded_at')
      .eq('merchant_id', merchantId)
      .in('source_order_id', chunk)
      .gte('refunded_at', since);
    for (const refund of refunds ?? []) {
      completedRefunds365d += 1;
      const currency = String(refund.currency ?? 'UNK').toUpperCase();
      const amount = Number(refund.amount ?? 0);
      if (Number.isFinite(amount)) {
        completedRefundAmountByCurrency[currency] =
          (completedRefundAmountByCurrency[currency] ?? 0) + amount;
      }
    }
  }

  const { data: possibleRows } = await client
    .from(TABLES.RECORD_MATCH_CANDIDATES)
    .select('candidate_entity_id, subject_entity_type, subject_entity_id, confidence, evidence')
    .eq('merchant_id', merchantId)
    .eq('candidate_entity_type', 'merchant_customer')
    .eq('status', 'open')
    .order('confidence', { ascending: false })
    .limit(500);

  // A candidate row is keyed by the observed source entity, not by the
  // canonical customer. Include candidates where this canonical owns the
  // subject order/ticket/customer as well as candidates that target it.
  const subjectIds = new Set<string>();
  const [subjectCustomers, subjectOrders, subjectTickets] = await Promise.all([
    client
      .from(TABLES.SOURCE_CUSTOMERS)
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('merchant_customer_id', merchantCustomerId),
    client
      .from(TABLES.SOURCE_ORDERS)
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('merchant_customer_id', merchantCustomerId),
    client
      .from(TABLES.SOURCE_TICKETS)
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('merchant_customer_id', merchantCustomerId),
  ]);
  for (const row of subjectCustomers.data ?? []) subjectIds.add(`source_customer:${row.id}`);
  for (const row of subjectOrders.data ?? []) subjectIds.add(`source_order:${row.id}`);
  for (const row of subjectTickets.data ?? []) subjectIds.add(`source_ticket:${row.id}`);
  const relevantPossibleRows = (possibleRows ?? []).filter((row: Record<string, unknown>) =>
    String(row.candidate_entity_id) !== merchantCustomerId &&
    subjectIds.has(`${row.subject_entity_type}:${row.subject_entity_id}`),
  );

  // Multiple subject entities (each order/ticket/customer) can point at the
  // same candidate; group by candidate and keep the strongest evidence.
  const byCandidate = new Map<
    string,
    { confidence: number | null; matchedTypes: Set<string> }
  >();
  for (const row of relevantPossibleRows as Record<string, unknown>[]) {
    const candidateId = String(row.candidate_entity_id);
    const confidence = row.confidence == null ? null : Number(row.confidence);
    const evidence = (row.evidence ?? {}) as Record<string, unknown>;
    const matchedTypes = Array.isArray(evidence.matched_types)
      ? (evidence.matched_types as unknown[]).filter((v): v is string => typeof v === 'string')
      : [];
    const existing = byCandidate.get(candidateId);
    if (!existing) {
      byCandidate.set(candidateId, { confidence, matchedTypes: new Set(matchedTypes) });
    } else {
      if (confidence != null && (existing.confidence == null || confidence > existing.confidence)) {
        existing.confidence = confidence;
      }
      for (const type of matchedTypes) existing.matchedTypes.add(type);
    }
  }

  const candidateIds = [...byCandidate.keys()].slice(0, 20);
  const candidateById = new Map<string, { display_name: string | null; email: string | null }>();
  if (candidateIds.length > 0) {
    const { data: candidateRows } = await client
      .from(TABLES.MERCHANT_CUSTOMERS)
      .select('id, display_name, email')
      .eq('merchant_id', merchantId)
      .in('id', candidateIds);
    for (const row of candidateRows ?? []) {
      candidateById.set(String(row.id), {
        display_name: (row.display_name as string | null) ?? null,
        email: (row.email as string | null) ?? null,
      });
    }
  }

  const possibleMatches = candidateIds
    .map((candidateId) => {
      const match = byCandidate.get(candidateId)!;
      const candidate = candidateById.get(candidateId);
      return {
        candidateId,
        displayName: candidate?.display_name ?? null,
        email: candidate?.email ?? null,
        confidence: match.confidence,
        matchedTypes: [...match.matchedTypes],
      };
    })
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));

  return {
    merchantCustomerId,
    refundRequests365d: refundRequests,
    payoutCases365d: activeCases.length,
    completedRefunds365d,
    completedRefundAmountByCurrency,
    possibleMatches,
  };
}
