/**
 * Maintains the customer_claim_summary rollup (one row per merchant+customer)
 * and exposes cross-merchant network aggregation.
 *
 * total_claims is counted from support_case_intake (is_claim = true).
 * total_orders is taken from the order count the payload exposes for this
 * customer at this merchant (knownOrderCount); it is floored at total_claims so
 * claim_rate never exceeds 1. Network totals are the sum across merchants that
 * share the same customer_email_hash.
 */
import { TABLES } from '@/lib/supabase/tables';

type ServiceClient = { from: (table: string) => Record<string, unknown> };

type ClaimRow = {
  claim_type: string | null;
  created_at_provider: string | null;
  updated_at_provider: string | null;
  requires_merchant_review: boolean;
};

export type CustomerClaimSummaryRow = {
  customer_email_hash: string;
  merchant_id: string;
  total_orders: number;
  total_claims: number;
  claim_rate: number;
  primary_reason: string | null;
  last_claim_at: string | null;
  updated_at: string;
};

export type NetworkClaimSummary = {
  total_orders: number;
  total_claims: number;
  claim_rate: number;
  primary_reason: string | null;
  merchant_count: number;
};

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function modeOf(values: Array<string | null>): string | null {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

function latest(values: Array<string | null>): string | null {
  let best: string | null = null;
  let bestMs = -Infinity;
  for (const value of values) {
    if (!value) continue;
    const ms = Date.parse(value);
    if (!Number.isNaN(ms) && ms > bestMs) {
      best = value;
      bestMs = ms;
    }
  }
  return best;
}

async function loadClaimRows(
  supabase: ServiceClient,
  merchantId: string,
  emailHash: string
): Promise<ClaimRow[]> {
  const { data, error } = await (supabase.from(TABLES.SUPPORT_CASE_INTAKE) as {
    select: (columns: string) => {
      eq: (col: string, val: string) => {
        eq: (col2: string, val2: string) => {
          eq: (col3: string, val3: boolean) => Promise<{
            data: Array<Record<string, unknown>> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  })
    .select('claim_type, created_at_provider, updated_at_provider, requires_merchant_review')
    .eq('merchant_id', merchantId)
    .eq('customer_email_hash', emailHash)
    .eq('is_claim', true);

  if (error) throw new Error(`load_claim_rows_failed: ${error.message}`);

  return (data ?? []).flatMap((row) =>
    row.requires_merchant_review === true
      ? []
      : [{
          claim_type: asString(row.claim_type),
          created_at_provider: asString(row.created_at_provider),
          updated_at_provider: asString(row.updated_at_provider),
          requires_merchant_review: row.requires_merchant_review === true,
        }],
  );
}

/**
 * Recompute and upsert the per-merchant claim summary for a customer.
 * Returns the upserted summary, or null when the customer has no email hash.
 */
export async function recomputeCustomerClaimSummary(
  supabase: unknown,
  input: { merchantId: string; emailHash: string | null; knownOrderCount?: number | null }
): Promise<CustomerClaimSummaryRow | null> {
  if (!input.emailHash) return null;
  const client = supabase as ServiceClient;

  const rows = await loadClaimRows(client, input.merchantId, input.emailHash);
  const totalClaims = rows.length;
  const totalOrders = Math.max(input.knownOrderCount ?? 0, totalClaims);
  const claimRate = totalOrders > 0 ? Number((totalClaims / totalOrders).toFixed(4)) : 0;
  const primaryReason = modeOf(rows.map((r) => r.claim_type));
  const lastClaimAt = latest(rows.map((r) => r.created_at_provider ?? r.updated_at_provider));

  const payload: CustomerClaimSummaryRow = {
    customer_email_hash: input.emailHash,
    merchant_id: input.merchantId,
    total_orders: totalOrders,
    total_claims: totalClaims,
    claim_rate: claimRate,
    primary_reason: primaryReason,
    last_claim_at: lastClaimAt,
    updated_at: new Date().toISOString(),
  };

  const { error } = await (client.from(TABLES.CUSTOMER_CLAIM_SUMMARY) as {
    upsert: (
      values: Record<string, unknown>,
      opts: { onConflict: string }
    ) => { select: () => { single: () => PromiseLike<{ error: { message: string } | null }> } };
  })
    .upsert(payload, { onConflict: 'merchant_id,customer_email_hash' })
    .select()
    .single();

  if (error) throw new Error(`upsert_customer_claim_summary_failed: ${error.message}`);
  return payload;
}

/** Aggregate every merchant's summary for one customer into a network view. */
export async function getNetworkClaimSummary(
  supabase: unknown,
  emailHash: string
): Promise<NetworkClaimSummary> {
  const client = supabase as ServiceClient;
  const { data, error } = await (client.from(TABLES.CUSTOMER_CLAIM_SUMMARY) as {
    select: (columns: string) => {
      eq: (col: string, val: string) => Promise<{
        data: Array<Record<string, unknown>> | null;
        error: { message: string } | null;
      }>;
    };
  })
    .select('merchant_id, total_orders, total_claims, primary_reason')
    .eq('customer_email_hash', emailHash);

  if (error) throw new Error(`network_claim_summary_failed: ${error.message}`);

  const rows = data ?? [];
  const totalOrders = rows.reduce((sum, r) => sum + (Number(r.total_orders) || 0), 0);
  const totalClaims = rows.reduce((sum, r) => sum + (Number(r.total_claims) || 0), 0);
  const primaryReason = modeOf(rows.map((r) => asString(r.primary_reason)));

  return {
    total_orders: totalOrders,
    total_claims: totalClaims,
    claim_rate: totalOrders > 0 ? Number((totalClaims / totalOrders).toFixed(4)) : 0,
    primary_reason: primaryReason,
    merchant_count: rows.length,
  };
}
