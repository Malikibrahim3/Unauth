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

/** Atomic per-minute cap for a single API key (shared across serverless instances). */
export async function incrementAndCheckApiKeyMinuteLimit(
  service: SupabaseClient,
  keyId: string,
  limitPerMinute: number
): Promise<{ allowed: true; count: number } | { allowed: false; count: number }> {
  const windowMinute = Math.floor(Date.now() / 60000);

  const { data: newCount, error } = await service.rpc(
    'increment_api_key_minute_count' as never,
    { p_key_id: keyId, p_window_minute: windowMinute }
  );

  if (error) {
    console.error('[api-rate-limit] minute limiter DB error; failing open', {
      keyId,
      code: error.code,
      message: error.message,
    });
    return { allowed: true, count: 0 };
  }

  const count = newCount as number;
  if (count > limitPerMinute) {
    return { allowed: false, count };
  }
  return { allowed: true, count };
}
