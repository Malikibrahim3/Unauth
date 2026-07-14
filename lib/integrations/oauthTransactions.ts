import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

const TABLE = 'oauth_connection_transactions';

export type OAuthConnectionEnvironment = 'sandbox' | 'production';

export type OAuthConnectionTransaction = {
  merchantId: string;
  userId: string;
  providerId: string;
  environment: OAuthConnectionEnvironment;
  callbackUrl: string;
  providerAccountHint: string | null;
  expiresAt: string;
};

function stateHash(state: string): string {
  return crypto.createHash('sha256').update(state, 'utf8').digest('hex');
}

/**
 * Creates an opaque, server-owned OAuth transaction. The browser receives only
 * high-entropy state; tenant/user/provider/callback binding remains in the
 * service-role-only ledger.
 */
export async function beginOAuthConnectionTransaction(
  serviceClient: SupabaseClient,
  input: Omit<OAuthConnectionTransaction, 'expiresAt'> & { ttlSeconds?: number; state?: string },
): Promise<string> {
  const ttlSeconds = Math.min(Math.max(input.ttlSeconds ?? 600, 60), 900);
  const state = input.state ?? crypto.randomBytes(32).toString('base64url');
  if (Buffer.byteLength(state, 'utf8') < 32) throw new Error('oauth_transaction_state_too_short');
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const { error } = await serviceClient.from(TABLE).insert({
    state_hash: stateHash(state),
    merchant_id: input.merchantId,
    user_id: input.userId,
    provider_id: input.providerId,
    environment: input.environment,
    callback_url: input.callbackUrl,
    provider_account_hint: input.providerAccountHint,
    expires_at: expiresAt,
  });
  if (error) throw new Error(`oauth_transaction_create_failed:${error.message}`);
  return state;
}

/** Atomically consumes one transaction. A failed/expired/replayed state is indistinguishable. */
export async function consumeOAuthConnectionTransaction(
  serviceClient: SupabaseClient,
  input: {
    state: string;
    userId: string;
    providerId: string;
    callbackUrl: string;
    providerAccountId?: string | null;
  },
): Promise<OAuthConnectionTransaction> {
  const consumedAt = new Date().toISOString();
  let query = serviceClient
    .from(TABLE)
    .update({ consumed_at: consumedAt })
    .eq('state_hash', stateHash(input.state))
    .eq('user_id', input.userId)
    .eq('provider_id', input.providerId)
    .eq('callback_url', input.callbackUrl)
    .is('consumed_at', null)
    .gt('expires_at', consumedAt);

  if (input.providerAccountId) {
    query = query.eq('provider_account_hint', input.providerAccountId);
  }

  const { data, error } = await query
    .select('merchant_id,user_id,provider_id,environment,callback_url,provider_account_hint,expires_at')
    .maybeSingle();
  if (error) throw new Error(`oauth_transaction_consume_failed:${error.message}`);
  if (!data) throw new Error('oauth_transaction_invalid_expired_or_replayed');

  return {
    merchantId: data.merchant_id,
    userId: data.user_id,
    providerId: data.provider_id,
    environment: data.environment as OAuthConnectionEnvironment,
    callbackUrl: data.callback_url,
    providerAccountHint: data.provider_account_hint,
    expiresAt: data.expires_at,
  };
}
