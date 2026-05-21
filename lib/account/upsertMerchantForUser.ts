import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

type ServiceClient = SupabaseClient<Database>;

export interface MerchantSetupInput {
  userId: string;
  email?: string | null;
  storeName?: string | null;
  platform?: string | null;
  monthlyOrderVolume?: string | null;
  primaryFraudConcern?: string | null;
  setupComplete?: boolean;
}

function cleanValue(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function upsertMerchantForUser(
  serviceClient: ServiceClient,
  input: MerchantSetupInput
): Promise<{ id: string; setup_complete: boolean }> {
  const existingResult = await serviceClient
    .from('merchants')
    .select('id, name, platform, monthly_order_volume, primary_fraud_concern, setup_complete')
    .eq('user_id', input.userId)
    .maybeSingle();

  if (existingResult.error) {
    throw new Error(`Failed to load merchant profile: ${existingResult.error.message}`);
  }

  const storeName =
    cleanValue(input.storeName) ??
    cleanValue((existingResult.data as { name?: string | null } | null)?.name) ??
    cleanValue(input.email) ??
    'My Store';
  const platform =
    cleanValue(input.platform) ??
    cleanValue((existingResult.data as { platform?: string | null } | null)?.platform);
  const monthlyOrderVolume =
    cleanValue(input.monthlyOrderVolume) ??
    cleanValue((existingResult.data as { monthly_order_volume?: string | null } | null)?.monthly_order_volume);
  const primaryFraudConcern =
    cleanValue(input.primaryFraudConcern) ??
    cleanValue((existingResult.data as { primary_fraud_concern?: string | null } | null)?.primary_fraud_concern);
  const setupComplete =
    input.setupComplete === true ||
    Boolean((existingResult.data as { setup_complete?: boolean } | null)?.setup_complete);

  const upsertResult = await serviceClient
    .from('merchants')
    .upsert(
      {
        user_id: input.userId,
        name: storeName,
        platform,
        monthly_order_volume: monthlyOrderVolume,
        primary_fraud_concern: primaryFraudConcern,
        setup_complete: setupComplete,
      } as never,
      { onConflict: 'user_id' }
    )
    .select('id, setup_complete')
    .single();

  if (upsertResult.error || !upsertResult.data) {
    throw new Error(`Failed to save merchant profile: ${upsertResult.error?.message ?? 'unknown error'}`);
  }

  return upsertResult.data as { id: string; setup_complete: boolean };
}
