import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { TABLES } from '@/lib/supabase/tables';
import { resolveCallerContext } from '@/lib/permissions';
import {
  getMerchantProfileById,
  mergeMerchantSettings,
  parseMerchantSettings,
} from '@/lib/account/merchantProfile';

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
  const existingContext = await resolveCallerContext(serviceClient, input.userId);
  const existingProfile = existingContext
    ? await getMerchantProfileById(serviceClient, existingContext.merchantId)
    : null;

  const storeName =
    cleanValue(input.storeName) ??
    cleanValue(existingProfile?.name) ??
    cleanValue(input.email) ??
    'My Store';
  const platform =
    cleanValue(input.platform) ?? cleanValue(existingProfile?.platform);
  const monthlyOrderVolume =
    cleanValue(input.monthlyOrderVolume) ?? cleanValue(existingProfile?.monthly_order_volume);
  const primaryFraudConcern =
    cleanValue(input.primaryFraudConcern) ?? cleanValue(existingProfile?.primary_fraud_concern);
  const setupComplete =
    input.setupComplete === true || Boolean(existingProfile?.setup_complete);

  const settingsPatch = {
    platform,
    monthly_order_volume: monthlyOrderVolume,
    primary_fraud_concern: primaryFraudConcern,
    setup_complete: setupComplete,
  };

  if (existingContext) {
    const { data: merchantRow, error: loadError } = await serviceClient
      .from(TABLES.MERCHANTS)
      .select('settings')
      .eq('id', existingContext.merchantId)
      .maybeSingle();

    if (loadError) {
      throw new Error(`Failed to load merchant profile: ${loadError.message}`);
    }

    const { error: updateError } = await serviceClient
      .from(TABLES.MERCHANTS)
      .update({
        name: storeName,
        settings: mergeMerchantSettings(merchantRow?.settings, settingsPatch),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingContext.merchantId);

    if (updateError) {
      throw new Error(`Failed to save merchant profile: ${updateError.message}`);
    }

    return { id: existingContext.merchantId, setup_complete: setupComplete };
  }

  const invitedEmail = cleanValue(input.email) ?? `user-${input.userId}@placeholder.local`;
  const { data: createdMerchant, error: createError } = await serviceClient
    .from(TABLES.MERCHANTS)
    .insert({
      name: storeName,
      settings: mergeMerchantSettings(null, settingsPatch),
    })
    .select('id')
    .single();

  if (createError || !createdMerchant) {
    throw new Error(`Failed to create merchant profile: ${createError?.message ?? 'unknown error'}`);
  }

  const merchantId = (createdMerchant as { id: string }).id;
  const { error: memberError } = await serviceClient.from(TABLES.MERCHANT_MEMBERS).insert({
    merchant_id: merchantId,
    user_id: input.userId,
    invited_email: invitedEmail,
    role: 'owner',
    invite_status: 'active',
    accepted_at: new Date().toISOString(),
  });

  if (memberError) {
    throw new Error(`Failed to create merchant membership: ${memberError.message}`);
  }

  return { id: merchantId, setup_complete: setupComplete };
}

export function merchantProfileFromRow(row: {
  id: string;
  name: string;
  settings?: unknown;
}) {
  return {
    id: row.id,
    name: row.name,
    ...parseMerchantSettings(row.settings),
  };
}
