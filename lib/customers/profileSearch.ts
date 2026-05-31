import type { SupabaseClient } from '@supabase/supabase-js';

import { TABLES } from '@/lib/supabase/tables';
import { escapePostgrestFilterValue } from '@/lib/supabase/merchantHelpers';

type ProfileIdRow = { id?: string | null };
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
 * Merchant-scoped customer text search across profile primary_email and all
 * normalized identity anchors. This avoids PostgREST cast filters like
 * `emails::text.ilike`, which fail to parse and make the Customers page show
 * zero results for valid linked identities.
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

  const [{ data: primaryEmailRows }, { data: identityRows }] = await Promise.all([
    service
      .from(TABLES.CUSTOMER_PROFILES)
      .select('id')
      .or(opts.merchantFilter)
      .ilike('primary_email', safeLike)
      .limit(limit) as unknown as Promise<{ data: ProfileIdRow[] | null; error: unknown }>,
    service
      .from(TABLES.CUSTOMER_PROFILE_IDENTITIES)
      .select('customer_profile_id')
      .in('merchant_id', merchantIds)
      .ilike('identity_value', safeLike)
      .limit(limit) as unknown as Promise<{ data: IdentityProfileIdRow[] | null; error: unknown }>,
  ]);

  for (const row of primaryEmailRows ?? []) {
    if (row.id) ids.add(row.id);
  }
  for (const row of identityRows ?? []) {
    if (row.customer_profile_id) ids.add(row.customer_profile_id);
  }

  return [...ids];
}
