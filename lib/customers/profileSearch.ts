import type { SupabaseClient } from '@supabase/supabase-js';

import { TABLES } from '@/lib/supabase/tables';
import { escapePostgrestFilterValue } from '@/lib/supabase/merchantHelpers';

type IdentityProfileIdRow = { customer_profile_id?: string | null };

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
 * Merchant-scoped customer text search across all normalized identity anchors.
 *
 * SECURITY: the ONLY tenant boundary here is customer_profile_identities.merchant_id.
 * `identities` (TABLES.CUSTOMER_PROFILES) is a network-level table with no
 * merchant_id column, so it must never be filtered by a `merchant_ids` predicate
 * (that column does not exist post-v2 — the old primary_email query silently ran
 * unscoped and could surface other merchants' profiles). Candidate IDs are
 * derived solely from the merchant-scoped anchor table; callers fetch display
 * rows by these already-owned IDs.
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
  const ids = new Set<string>();

  const { data: identityRows } = (await service
    .from(TABLES.CUSTOMER_PROFILE_IDENTITIES)
    .select('customer_profile_id')
    .in('merchant_id', merchantIds)
    .ilike('identity_value', safeLike)
    .limit(limit)) as unknown as { data: IdentityProfileIdRow[] | null; error: unknown };

  for (const row of identityRows ?? []) {
    if (row.customer_profile_id) ids.add(row.customer_profile_id);
  }

  return [...ids];
}
