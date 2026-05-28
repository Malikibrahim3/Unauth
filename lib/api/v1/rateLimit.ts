import type { SupabaseClient } from '@supabase/supabase-js';

export const DAILY_LOOKUP_LIMIT = 200;

/** Shared daily lookup cap (session UI + public API). */
export async function incrementAndCheckDailyLookupLimit(
  service: SupabaseClient,
  merchantId: string
): Promise<{ allowed: true; count: number } | { allowed: false; count: number }> {
  const today = new Date().toISOString().slice(0, 10) as unknown as Date;

  const { data: newCount, error } = await service.rpc(
    'increment_lookup_count' as never,
    { p_merchant_id: merchantId, p_date: today }
  );

  if (error) {
    throw new Error(`Rate limit check failed: ${error.message}`);
  }

  const count = newCount as number;
  if (count > DAILY_LOOKUP_LIMIT) {
    return { allowed: false, count };
  }
  return { allowed: true, count };
}
