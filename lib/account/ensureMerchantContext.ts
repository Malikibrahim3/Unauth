import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveCallerContext, type CallerContext } from '@/lib/permissions';
import { upsertMerchantForUser } from '@/lib/account/upsertMerchantForUser';

export function canRehydrateMerchantFromAuth(user: Pick<User, 'email' | 'user_metadata'>): boolean {
  return user.user_metadata?.setup_complete === true && Boolean(user.email);
}

export async function ensureMerchantContextForUser(
  serviceClient: SupabaseClient,
  user: Pick<User, 'id' | 'email' | 'user_metadata'>,
  selectedMerchantId?: string | null,
): Promise<CallerContext | null> {
  const existingContext = await resolveCallerContext(serviceClient, user.id, selectedMerchantId);
  if (existingContext) return existingContext;

  if (!canRehydrateMerchantFromAuth(user)) return null;

  await upsertMerchantForUser(serviceClient as never, {
    userId: user.id,
    email: user.email,
    storeName: (user.user_metadata?.store_name as string | undefined) ?? user.email ?? null,
    platform: (user.user_metadata?.platform as string | undefined) ?? null,
    monthlyOrderVolume: (user.user_metadata?.monthly_order_volume as string | undefined) ?? null,
    primaryFraudConcern: (user.user_metadata?.primary_fraud_concern as string | undefined) ?? null,
    setupComplete: true,
  });

  return resolveCallerContext(serviceClient, user.id);
}
