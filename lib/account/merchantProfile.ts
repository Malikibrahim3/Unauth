import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';

export type MerchantSettingsProfile = {
  platform: string | null;
  monthly_order_volume: string | null;
  primary_fraud_concern: string | null;
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
    setup_complete: record.setup_complete === true,
  };
}

export function mergeMerchantSettings(
  existing: unknown,
  patch: Partial<MerchantSettingsProfile>,
): Record<string, unknown> {
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
  if (patch.setup_complete !== undefined) current.setup_complete = patch.setup_complete;

  return current;
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
