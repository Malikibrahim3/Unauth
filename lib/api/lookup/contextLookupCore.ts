import type { SupabaseClient } from '@supabase/supabase-js';
import type { ContextUnlockType } from '@/lib/billing/contextCredits';
import { hashIdentifier } from '@/lib/identity/hash';
import { normaliseEmail } from '@/lib/identity/normalise';
import { TABLES } from '@/lib/supabase/tables';

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

type StoreOrderRow = {
  id: string;
  email: string | null;
  placed_at: string | null;
};

type StoreClaimRow = {
  source_order_id: string | null;
  submitted_at: string | null;
};

/**
 * Builds store-scoped claim history for a widget unlock. Network disclosure is
 * intentionally absent from the launch path.
 */
export async function runWidgetContextProfileSearch(
  service: SupabaseClient,
  merchantId: string,
  identifiers: ContextLookupIdentifiers,
): Promise<ContextLookupSearchResult> {
  const normEmail = normaliseEmail(identifiers.rawEmail?.trim() ?? '');
  if (!normEmail) return { ok: true, queriedHashes: [], rawRows: [] };

  const emailHash = hashIdentifier(normEmail);
  const { data: orderData, error: orderError } = await service
    .from(TABLES.AUDIT_TRANSACTIONS)
    .select('id, email, placed_at')
    .eq('merchant_id', merchantId)
    .ilike('email', normEmail)
    .order('placed_at', { ascending: true })
    .limit(1000);

  if (orderError) {
    return { ok: false, queriedHashes: [emailHash], error: orderError.message };
  }

  const orders = (orderData ?? []) as StoreOrderRow[];
  if (orders.length === 0) {
    return { ok: true, queriedHashes: [emailHash], rawRows: [] };
  }

  const orderIds = orders.map((order) => order.id);
  const { data: claimData, error: claimError } = await service
    .from(TABLES.MERCHANT_CLAIMS)
    .select('source_order_id, submitted_at')
    .eq('merchant_id', merchantId)
    .in('source_order_id', orderIds.slice(0, 200));

  if (claimError) {
    return { ok: false, queriedHashes: [emailHash], error: claimError.message };
  }

  const claims = (claimData ?? []) as StoreClaimRow[];
  const firstSeen = orders.find((order) => order.placed_at)?.placed_at ?? null;
  const lastSeen = [...orders].reverse().find((order) => order.placed_at)?.placed_at ?? null;

  return {
    ok: true,
    queriedHashes: [emailHash],
    rawRows: [
      {
        id: `store:${emailHash}`,
        merchant_ids: [merchantId],
        primary_email: normEmail,
        total_orders: orders.length,
        total_refund_claims: claims.length,
        refund_rate: orders.length > 0 ? claims.length / orders.length : 0,
        first_seen: firstSeen,
        last_seen: lastSeen,
      },
    ],
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
  _contextType: ContextUnlockType,
  rawRows: Record<string, unknown>[],
): FormattedContextResult[] {
  return rawRows
    .filter((row) => Array.isArray(row.merchant_ids) && row.merchant_ids.includes(merchantId))
    .map((row) => {
      const claimCount = Number(row.total_refund_claims ?? 0);
      return {
        id: String(row.id),
        context_scope: 'store_only' as const,
        context_points: [
          claimCount > 0
            ? `${claimCount} previous store claim${claimCount === 1 ? '' : 's'} found`
            : 'No previous store claims found',
        ],
        store_context: {
          orders: Number(row.total_orders ?? 0),
          claims: claimCount,
          refundRate: Number(row.refund_rate ?? 0),
          firstSeen: row.first_seen,
          lastSeen: row.last_seen,
          primaryEmail: typeof row.primary_email === 'string' ? row.primary_email : null,
        },
        network_context: null,
        identity_consistency: [],
      };
    });
}

export const CONTEXT_REVIEW_DISCLAIMER =
  'Unauth provides store-scoped context for merchant review. Unauth does not make refund, fulfilment, account, or customer eligibility decisions.';
