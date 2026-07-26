import type { SupabaseClient } from '@supabase/supabase-js';
import type { Json } from '@/lib/supabase/types';
import { TABLES } from '@/lib/supabase/tables';

export type MerchantSettingsProfile = {
  platform: string | null;
  monthly_order_volume: string | null;
  primary_fraud_concern: string | null;
  onboarding_profile_complete: boolean;
  setup_complete: boolean;
};

export type MerchantProfile = {
  id: string;
  name: string;
} & MerchantSettingsProfile;

export function parseMerchantSettings(settings: unknown): MerchantSettingsProfile {
  const record =
    settings && typeof settings === 'object' && !Array.isArray(settings)
      ? (settings as Record<string, unknown>)
      : {};

  return {
    platform: typeof record.platform === 'string' ? record.platform : null,
    monthly_order_volume:
      typeof record.monthly_order_volume === 'string' ? record.monthly_order_volume : null,
    primary_fraud_concern:
      typeof record.primary_fraud_concern === 'string' ? record.primary_fraud_concern : null,
    onboarding_profile_complete:
      record.onboarding_profile_complete === true || record.setup_complete === true,
    setup_complete: record.setup_complete === true,
  };
}

export function mergeMerchantSettings(
  existing: unknown,
  patch: Partial<MerchantSettingsProfile>,
): Json {
  const current =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};

  if (patch.platform !== undefined) current.platform = patch.platform;
  if (patch.monthly_order_volume !== undefined) {
    current.monthly_order_volume = patch.monthly_order_volume;
  }
  if (patch.primary_fraud_concern !== undefined) {
    current.primary_fraud_concern = patch.primary_fraud_concern;
  }
  if (patch.onboarding_profile_complete !== undefined) {
    current.onboarding_profile_complete = patch.onboarding_profile_complete;
  }
  if (patch.setup_complete !== undefined) current.setup_complete = patch.setup_complete;

  return current as Json;
}

export async function getMerchantProfileById(
  serviceClient: SupabaseClient,
  merchantId: string,
): Promise<MerchantProfile | null> {
  const { data, error } = await serviceClient
    .from(TABLES.MERCHANTS)
    .select('id, name, settings')
    .eq('id', merchantId)
    .maybeSingle();

  if (error) {
    throw new Error(`get_merchant_profile_failed: ${error.message}`);
  }

  if (!data) return null;

  const row = data as { id: string; name: string; settings: unknown };
  return {
    id: row.id,
    name: row.name,
    ...parseMerchantSettings(row.settings),
  };
}
