import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  encryptWooCommerceCredentials,
} from '@/lib/commerce/credentialCrypto';
import {
  getActiveCommerceStoreConnection,
  upsertCommerceStoreConnection,
  type CommerceStoreConnectionRow,
} from '@/lib/commerce/connectionStore';
import { validateWooCommerceCredentials } from '@/lib/commerce/woocommerce/woocommerceApi';
import { normalizeWooCommerceStoreUrl } from '@/lib/commerce/woocommerce/normalizeStoreUrl';
import {
  buildWooCommerceWebhookDeliveryUrl,
  registerWooCommerceWebhooks,
} from '@/lib/commerce/woocommerce/registerWebhooks';
import {
  WooCommerceCredentialsError,
  type WooCommerceConnectionSettings,
} from '@/lib/commerce/woocommerce/woocommerceConnectionShared';

export const woocommerceConnectionInputSchema = z.object({
  store_url: z.string().trim().min(1),
  consumer_key: z.string().trim().min(1),
  consumer_secret: z.string().trim().min(1),
});

export type WooCommerceConnectionInput = z.infer<typeof woocommerceConnectionInputSchema>;

function toWooCommerceConnectionSettings(
  row: CommerceStoreConnectionRow,
): WooCommerceConnectionSettings {
  return {
    id: row.id,
    store_key: row.store_key,
    store_url: row.store_url,
    status: row.status,
    last_sync_at: row.last_sync_at,
    last_error: row.last_error,
    credentials_configured: Boolean(row.credentials_encrypted?.trim()),
    webhook_url: buildWooCommerceWebhookDeliveryUrl(),
  };
}

export async function getMerchantWooCommerceConnection(
  supabase: SupabaseClient,
  merchantId: string,
): Promise<WooCommerceConnectionSettings | null> {
  const row = await getActiveCommerceStoreConnection(supabase, merchantId, 'woocommerce');
  if (!row) {
    const { data } = await supabase
      .from('commerce_store_connections' as never)
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('platform', 'woocommerce')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return toWooCommerceConnectionSettings(data as CommerceStoreConnectionRow);
  }
  return toWooCommerceConnectionSettings(row);
}

export type CreateWooCommerceConnectionResult = {
  connection: WooCommerceConnectionSettings;
  webhooks_registered: string[];
  webhooks_failed: Array<{ topic: string; error: string }>;
};

export async function createMerchantWooCommerceConnection(
  supabase: SupabaseClient,
  merchantId: string,
  input: WooCommerceConnectionInput,
): Promise<CreateWooCommerceConnectionResult> {
  const parsed = woocommerceConnectionInputSchema.parse(input);
  const { store_url, store_key } = normalizeWooCommerceStoreUrl(parsed.store_url);

  const credentials = {
    consumer_key: parsed.consumer_key,
    consumer_secret: parsed.consumer_secret,
  };

  try {
    await validateWooCommerceCredentials(store_url, credentials);
  } catch (error) {
    if (error instanceof WooCommerceCredentialsError) throw error;
    throw new WooCommerceCredentialsError();
  }

  const existing = await getMerchantWooCommerceConnection(supabase, merchantId);
  if (existing?.status === 'active' && existing.credentials_configured) {
    throw new Error('woocommerce_connection_already_exists');
  }

  const credentialsEncrypted = encryptWooCommerceCredentials(credentials);
  const row = await upsertCommerceStoreConnection(supabase, {
    merchant_id: merchantId,
    platform: 'woocommerce',
    store_key,
    store_url,
    status: 'active',
    credentials_encrypted: credentialsEncrypted,
    last_error: null,
    uninstalled_at: null,
  });

  const webhookResult = await registerWooCommerceWebhooks(store_url, credentials);
  if (webhookResult.failed.length > 0) {
    const summary = webhookResult.failed.map((f) => `${f.topic}: ${f.error}`).join('; ');
    await supabase
      .from('commerce_store_connections' as never)
      .update({ last_error: `webhook_register_partial: ${summary.slice(0, 500)}` } as never)
      .eq('id', row.id);
  }

  const connection = toWooCommerceConnectionSettings(row);
  return {
    connection,
    webhooks_registered: webhookResult.registered,
    webhooks_failed: webhookResult.failed,
  };
}

export async function updateMerchantWooCommerceConnection(
  supabase: SupabaseClient,
  merchantId: string,
  input: WooCommerceConnectionInput,
): Promise<{ connection: WooCommerceConnectionSettings }> {
  const parsed = woocommerceConnectionInputSchema.parse(input);
  const existing = await getMerchantWooCommerceConnection(supabase, merchantId);
  if (!existing) {
    throw new Error('woocommerce_connection_not_found');
  }

  const { store_url, store_key } = normalizeWooCommerceStoreUrl(parsed.store_url);
  const credentials = {
    consumer_key: parsed.consumer_key,
    consumer_secret: parsed.consumer_secret,
  };

  try {
    await validateWooCommerceCredentials(store_url, credentials);
  } catch (error) {
    if (error instanceof WooCommerceCredentialsError) throw error;
    throw new WooCommerceCredentialsError();
  }

  const credentialsEncrypted = encryptWooCommerceCredentials(credentials);
  const row = await upsertCommerceStoreConnection(supabase, {
    merchant_id: merchantId,
    platform: 'woocommerce',
    store_key,
    store_url,
    status: 'active',
    credentials_encrypted: credentialsEncrypted,
    last_error: null,
    uninstalled_at: null,
  });

  return { connection: toWooCommerceConnectionSettings(row) };
}

export async function disableMerchantWooCommerceConnection(
  supabase: SupabaseClient,
  merchantId: string,
): Promise<WooCommerceConnectionSettings> {
  const existing = await getMerchantWooCommerceConnection(supabase, merchantId);
  if (!existing) {
    throw new Error('woocommerce_connection_not_found');
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('commerce_store_connections' as never)
    .update({
      status: 'disabled',
      uninstalled_at: now,
      last_error: null,
      updated_at: now,
    } as never)
    .eq('id', existing.id)
    .eq('merchant_id', merchantId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`disable_woocommerce_connection_failed: ${error?.message ?? 'unknown'}`);
  }

  return toWooCommerceConnectionSettings(data as CommerceStoreConnectionRow);
}

export async function loadWooCommerceCredentialsForStore(
  supabase: SupabaseClient,
  storeKey: string,
): Promise<{ store_url: string; credentials_encrypted: string } | null> {
  const { data, error } = await supabase
    .from('commerce_store_connections' as never)
    .select('store_url, credentials_encrypted')
    .eq('platform', 'woocommerce')
    .eq('store_key', storeKey)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    throw new Error(`load_woocommerce_credentials_failed: ${error.message}`);
  }

  const row = data as { store_url?: string; credentials_encrypted?: string } | null;
  if (!row?.store_url || !row.credentials_encrypted?.trim()) return null;
  return { store_url: row.store_url, credentials_encrypted: row.credentials_encrypted };
}
