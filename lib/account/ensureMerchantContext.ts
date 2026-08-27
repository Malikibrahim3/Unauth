import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveCallerContext, type CallerContext } from '@/lib/permissions';
import { upsertMerchantForUser } from '@/lib/account/upsertMerchantForUser';

export function canRehydrateMerchantFromAuth(user: Pick<User, 'email' | 'user_metadata'>): boolean {
  const deferredAt = user.user_metadata?.onboarding_deferred_at;
  return Boolean(user.email) && (
    user.user_metadata?.setup_complete === true
    || (typeof deferredAt === 'string' && deferredAt.trim().length > 0)
  );
}

export async function ensureMerchantContextForUser(
  serviceClient: SupabaseClient,
  user: Pick<User, 'id' | 'email' | 'user_metadata'>,
  selectedMerchantId?: string | null,
): Promise<CallerContext | null> {
  const existingContext = await resolveCallerContext(serviceClient, user.id, selectedMerchantId);
  if (existingContext) return existingContext;

  // An invalid explicit selection or an ambiguous multi-workspace account is
  // an authorization failure, not evidence that the user needs a new tenant.
  // Rehydration is only safe when no active membership exists at all.
  const { data: activeMembership } = await serviceClient
    .from('merchant_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('invite_status', 'active')
    .limit(1)
    .maybeSingle();
  if (activeMembership) return null;

  if (!canRehydrateMerchantFromAuth(user)) return null;

  const setupComplete = user.user_metadata?.setup_complete === true;
  const deferredAt = user.user_metadata?.onboarding_deferred_at;

  await upsertMerchantForUser(serviceClient as never, {
    userId: user.id,
    email: user.email,
    storeName: (user.user_metadata?.store_name as string | undefined) ?? user.email ?? null,
    platform: (user.user_metadata?.platform as string | undefined) ?? null,
    monthlyOrderVolume: (user.user_metadata?.monthly_order_volume as string | undefined) ?? null,
    primaryFraudConcern: (user.user_metadata?.primary_fraud_concern as string | undefined) ?? null,
    onboardingDeferredAt:
      !setupComplete && typeof deferredAt === 'string' ? deferredAt : null,
    setupComplete,
  });

  return resolveCallerContext(serviceClient, user.id);
}
