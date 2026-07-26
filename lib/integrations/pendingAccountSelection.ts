import type { SupabaseClient } from '@supabase/supabase-js';
import { decryptIntegrationCredentials, encryptIntegrationCredentials } from '@/lib/integrations/secrets';

const TABLE = 'pending_provider_account_selections';

// Channel selection happens after the provider OAuth round trip. Give a
// merchant enough time to choose the right channel, while keeping the
// credential-bearing handoff short-lived and bounded server-side.
export const PENDING_ACCOUNT_SELECTION_TTL_SECONDS = 30 * 60;

export type DiscoveredProviderAccount = { id: string; name: string | null };

export type PendingAccountSelection = {
  id: string;
  merchantId: string;
  userId: string;
  providerId: string;
  environment: 'sandbox' | 'production';
  accounts: DiscoveredProviderAccount[];
  expiresAt: string;
};

function normalizeAccounts(value: unknown): DiscoveredProviderAccount[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const raw = item as Record<string, unknown>;
    if (typeof raw.id !== 'string' || !raw.id.trim()) return [];
    return [{ id: raw.id, name: typeof raw.name === 'string' ? raw.name : null }];
  });
}

export async function createPendingAccountSelection(
  serviceClient: SupabaseClient,
  input: {
    merchantId: string;
    userId: string;
    providerId: string;
    environment: 'sandbox' | 'production';
    accounts: DiscoveredProviderAccount[];
    credentialPayload: Record<string, unknown>;
    ttlSeconds?: number;
  },
): Promise<string> {
  if (input.accounts.length < 2) throw new Error('pending_account_selection_requires_multiple_accounts');
  const expiresAt = new Date(
    Date.now() + Math.min(Math.max(input.ttlSeconds ?? PENDING_ACCOUNT_SELECTION_TTL_SECONDS, 60), PENDING_ACCOUNT_SELECTION_TTL_SECONDS) * 1000,
  ).toISOString();
  const { data, error } = await serviceClient.from(TABLE).insert({
    merchant_id: input.merchantId,
    user_id: input.userId,
    provider_id: input.providerId,
    environment: input.environment,
    accounts: input.accounts,
    encrypted_payload: encryptIntegrationCredentials(input.credentialPayload),
    expires_at: expiresAt,
  }).select('id').single();
  if (error || !data) throw new Error(`pending_account_selection_create_failed:${error?.message ?? 'missing_row'}`);
  return data.id;
}

export async function getPendingAccountSelection(
  serviceClient: SupabaseClient,
  input: { id: string; userId: string; providerId: string },
): Promise<PendingAccountSelection | null> {
  const now = new Date().toISOString();
  const { data, error } = await serviceClient.from(TABLE)
    .select('id,merchant_id,user_id,provider_id,environment,accounts,expires_at')
    .eq('id', input.id)
    .eq('user_id', input.userId)
    .eq('provider_id', input.providerId)
    .is('consumed_at', null)
    .gt('expires_at', now)
    .maybeSingle();
  if (error) throw new Error(`pending_account_selection_lookup_failed:${error.message}`);
  if (!data) return null;
  return {
    id: data.id,
    merchantId: data.merchant_id,
    userId: data.user_id,
    providerId: data.provider_id,
    environment: data.environment,
    accounts: normalizeAccounts(data.accounts),
    expiresAt: data.expires_at,
  };
}

export async function consumePendingAccountSelection(
  serviceClient: SupabaseClient,
  input: { id: string; userId: string; providerId: string; merchantId: string; selectedAccountId: string },
): Promise<{ selection: PendingAccountSelection; credentialPayload: Record<string, unknown> }> {
  const pending = await getPendingAccountSelection(serviceClient, {
    id: input.id,
    userId: input.userId,
    providerId: input.providerId,
  });
  if (!pending || pending.merchantId !== input.merchantId) {
    throw new Error('pending_account_selection_invalid_expired_or_replayed');
  }
  if (!pending.accounts.some((account) => account.id === input.selectedAccountId)) {
    throw new Error('selected_provider_account_not_discovered');
  }
  const now = new Date().toISOString();
  const { data, error } = await serviceClient.from(TABLE)
    .update({ consumed_at: now })
    .eq('id', input.id)
    .eq('user_id', input.userId)
    .eq('provider_id', input.providerId)
    .eq('merchant_id', input.merchantId)
    .is('consumed_at', null)
    .gt('expires_at', now)
    .select('id,merchant_id,user_id,provider_id,environment,accounts,encrypted_payload,expires_at')
    .maybeSingle();
  if (error) throw new Error(`pending_account_selection_consume_failed:${error.message}`);
  if (!data) throw new Error('pending_account_selection_invalid_expired_or_replayed');
  const accounts = normalizeAccounts(data.accounts);
  return {
    selection: {
      id: data.id,
      merchantId: data.merchant_id,
      userId: data.user_id,
      providerId: data.provider_id,
      environment: data.environment,
      accounts,
      expiresAt: data.expires_at,
    },
    credentialPayload: decryptIntegrationCredentials(data.encrypted_payload),
  };
}
