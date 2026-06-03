import type { SupabaseClient } from '@supabase/supabase-js';
import { findMerchantCustomerByEmail } from '@/lib/gorgias/findMerchantCustomerByEmail';
import {
  normaliseEmail,
  normaliseIP,
  normaliseAddress,
  normaliseCard,
} from '@/lib/identity/normalise';
import { hashIdentifier } from '@/lib/identity/hash';
import type { ContextUnlockType } from '@/lib/billing/contextCredits';
import { TABLES } from '@/lib/supabase/tables';

/** Fields required by {@link formatContextLookupResults}. */
const WIDGET_CONTEXT_PROFILE_SELECT =
  'id, primary_email, merchant_ids, fraud_flags, total_orders, total_refund_claims, total_merchants_seen_at, refund_rate, fastest_claim_days, first_seen, last_seen';

export type ContextLookupIdentifiers = {
  rawEmail?: string;
  rawName?: string;
  rawAddress?: string;
  rawCard?: string;
  rawIp?: string;
};

export type ContextLookupSearchResult =
  | {
      ok: true;
      queriedHashes: string[];
      rawRows: Record<string, unknown>[];
    }
  | { ok: false; queriedHashes: string[]; error: string };

export async function runContextProfileSearch(
  service: SupabaseClient,
  identifiers: ContextLookupIdentifiers,
): Promise<ContextLookupSearchResult> {
  const rawEmail = identifiers.rawEmail?.trim() ?? '';
  const rawName = identifiers.rawName?.trim() ?? '';
  const rawAddress = identifiers.rawAddress?.trim() ?? '';
  const rawCard = identifiers.rawCard?.trim() ?? '';
  const rawIp = identifiers.rawIp?.trim() ?? '';

  const normEmail = rawEmail ? normaliseEmail(rawEmail) : null;
  const normCard = rawCard ? normaliseCard(rawCard) : null;
  const normIp = rawIp ? normaliseIP(rawIp) : null;
  const normAddress = rawAddress ? normaliseAddress(rawAddress) : null;
  const normName = rawName ? rawName.toLowerCase() : null;

  const queriedHashes = [
    normEmail ? hashIdentifier(normEmail) : null,
    normAddress ? hashIdentifier(normAddress) : null,
    normIp ? hashIdentifier(normIp) : null,
    normCard ? hashIdentifier(normCard) : null,
  ].filter(Boolean) as string[];

  const { data: rows, error } = await service.rpc('search_customer_profiles', {
    p_email: null,
    p_name: normName || null,
    p_address: null,
    p_card: null,
    p_ip: null,
    p_email_hash: normEmail ? hashIdentifier(normEmail) : null,
    p_address_hash: normAddress ? hashIdentifier(normAddress) : null,
    p_card_hash: normCard && normCard.length === 4 ? hashIdentifier(normCard) : null,
    p_ip_hash: normIp ? hashIdentifier(normIp) : null,
  });

  if (error) {
    return { ok: false, queriedHashes, error: error.message };
  }

  return {
    ok: true,
    queriedHashes,
    rawRows: (rows ?? []) as Record<string, unknown>[],
  };
}

/**
 * Gorgias widget unlock: resolve the merchant-scoped profile the sidebar already found,
 * then merge k-anonymity RPC matches for pseudonymous network context on full unlock.
 * The RPC alone omits profiles with total_merchants_seen_at &lt; 3 even when the widget shows them.
 */
export async function runWidgetContextProfileSearch(
  service: SupabaseClient,
  merchantId: string,
  identifiers: ContextLookupIdentifiers,
): Promise<ContextLookupSearchResult> {
  const rawEmail = identifiers.rawEmail?.trim() ?? '';
  const normEmail = rawEmail ? normaliseEmail(rawEmail) : null;
  if (!normEmail) {
    return runContextProfileSearch(service, identifiers);
  }

  const merchantScopedHashes = [hashIdentifier(normEmail)];
  const rowsById = new Map<string, Record<string, unknown>>();

  const { customer } = await findMerchantCustomerByEmail(service, merchantId, normEmail);
  if (customer?.id) {
    const { data, error } = await service
      .from(TABLES.CUSTOMER_PROFILES)
      .select(WIDGET_CONTEXT_PROFILE_SELECT)
      .eq('id', customer.id)
      .maybeSingle();

    if (error) {
      return { ok: false, queriedHashes: merchantScopedHashes, error: error.message };
    }
    if (data) {
      rowsById.set(String(data.id), data as Record<string, unknown>);
    }
  }

  const networkSearch = await runContextProfileSearch(service, identifiers);
  if (!networkSearch.ok) {
    if (rowsById.size > 0) {
      return {
        ok: true,
        queriedHashes: merchantScopedHashes,
        rawRows: [...rowsById.values()],
      };
    }
    return networkSearch;
  }

  for (const row of networkSearch.rawRows) {
    rowsById.set(String(row.id), row);
  }

  const queriedHashes = [
    ...new Set([...merchantScopedHashes, ...networkSearch.queriedHashes]),
  ];

  return {
    ok: true,
    queriedHashes,
    rawRows: [...rowsById.values()],
  };
}

export type FormattedContextResult = {
  id: string;
  context_scope: 'store_only' | 'store_and_network';
  context_points: string[];
  store_context: {
    orders: number;
    claims: number;
    refundRate: number;
    firstSeen: unknown;
    lastSeen: unknown;
    primaryEmail: string | null;
  };
  network_context: {
    merchantsSeen: number;
    pseudonymousPatternObserved: boolean;
    note: string;
  } | null;
  identity_consistency: string[];
};

export function formatContextLookupResults(
  merchantId: string,
  contextType: ContextUnlockType,
  rawRows: Record<string, unknown>[],
): FormattedContextResult[] {
  const rawResults = rawRows.map((p) => {
    const merchantIds: string[] = Array.isArray(p.merchant_ids) ? (p.merchant_ids as string[]) : [];
    const merchantContributed = merchantIds.includes(merchantId);

    return {
      id: String(p.id),
      identitySignals: Array.isArray(p.fraud_flags) ? (p.fraud_flags as string[]) : [],
      total_orders: p.total_orders,
      total_refund_claims: p.total_refund_claims,
      total_merchants_seen_at: p.total_merchants_seen_at,
      refund_rate: p.refund_rate,
      fastest_claim_days: p.fastest_claim_days,
      first_seen: p.first_seen,
      last_seen: p.last_seen,
      merchant_contributed: merchantContributed,
      primary_email: merchantContributed ? (p.primary_email as string | null) : null,
    };
  });

  return rawResults
    .filter((row) => contextType === 'full_context' || row.merchant_contributed)
    .map((row) => ({
      id: row.id,
      context_scope: contextType === 'full_context' ? 'store_and_network' : 'store_only',
      context_points: [
        Number(row.total_refund_claims ?? 0) > 0
          ? 'Previous store claims found'
          : 'No previous store claims found',
        row.fastest_claim_days != null
          ? `Fastest prior claim timing: ${row.fastest_claim_days} day${row.fastest_claim_days === 1 ? '' : 's'}`
          : 'No prior claim timing available',
        contextType === 'full_context' && Number(row.total_merchants_seen_at ?? 0) > 1
          ? 'Similar pseudonymous pattern observed across participating merchants'
          : null,
      ].filter((p): p is string => p != null),
      store_context: {
        orders: Number(row.total_orders ?? 0),
        claims: Number(row.total_refund_claims ?? 0),
        refundRate: Number(row.refund_rate ?? 0),
        firstSeen: row.first_seen,
        lastSeen: row.last_seen,
        primaryEmail: row.primary_email,
      },
      network_context:
        contextType === 'full_context'
          ? {
              merchantsSeen: Number(row.total_merchants_seen_at ?? 0),
              pseudonymousPatternObserved: Number(row.total_merchants_seen_at ?? 0) > 1,
              note: 'Network context is derived from pseudonymous linked signals. Raw customer data from other merchants is not exposed.',
            }
          : null,
      identity_consistency: row.identitySignals.slice(0, 5),
    }));
}

export const CONTEXT_REVIEW_DISCLAIMER =
  'Unauth provides contextual information for merchant review. Unauth does not make refund, fulfilment, account, or customer eligibility decisions.';
