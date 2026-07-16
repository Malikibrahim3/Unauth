import type { SupabaseClient } from '@supabase/supabase-js';

import { TABLES } from '@/lib/supabase/tables';
import { escapePostgrestFilterValue } from '@/lib/supabase/merchantHelpers';

type MerchantCustomerIdentityRow = { identity_id?: string | null };

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );
}

/**
 * Merchant-scoped customer text search across merchant-owned customer records.
 *
 * Names and emails are merchant data in `merchant_customers`; the network-level
 * `identities` table intentionally contains neither. Candidate identity IDs are
 * therefore derived only from rows explicitly scoped to the caller's merchant.
 *
 * `merchantFilter` is retained in the signature for call-site compatibility but
 * is intentionally unused — do not reintroduce an unscoped `identities` scan.
 */
export async function findCustomerProfileIdsByText(
  service: SupabaseClient,
  opts: {
    merchantIds: string[];
    merchantFilter: string;
    query: string;
    limit?: number;
  }
): Promise<string[]> {
  const q = opts.query.trim();
  if (q.length < 2) return [];

  const merchantIds = uniqueNonEmpty(opts.merchantIds);
  if (!merchantIds.length) return [];

  const limit = opts.limit ?? 500;
  const safeLike = `%${escapePostgrestFilterValue(q)}%`;
  const [nameResult, emailResult] = await Promise.all([
    service
      .from(TABLES.MERCHANT_CUSTOMERS)
      .select('identity_id')
      .in('merchant_id', merchantIds)
      .ilike('display_name', safeLike)
      .limit(limit),
    service
      .from(TABLES.MERCHANT_CUSTOMERS)
      .select('identity_id')
      .in('merchant_id', merchantIds)
      .ilike('email', safeLike)
      .limit(limit),
  ]);

  const ids = new Set<string>();
  for (const row of [
    ...((nameResult.data ?? []) as MerchantCustomerIdentityRow[]),
    ...((emailResult.data ?? []) as MerchantCustomerIdentityRow[]),
  ]) {
    if (row.identity_id) ids.add(row.identity_id);
  }

  return [...ids];
}
