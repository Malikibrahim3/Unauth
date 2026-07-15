/**
 * Canonical connection store. Successful auth/callbacks and connection updates
 * finish by writing canonical `merchant_integrations` + `source_accounts` rows
 * through here, so the connection model has one writer regardless of provider.
 *
 * See ARCHITECTURE.md §5.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import type { IntegrationCategory } from '@/lib/integrations/types';

export type ConnectionStatus =
  | 'pending' | 'connected' | 'degraded' | 'syncing' | 'disabled' | 'revoked' | 'error';

export type UpsertConnectionInput = {
  merchantId: string;
  providerId: string;
  category: IntegrationCategory;
  authMode: 'oauth' | 'api_key' | 'manual_upload' | 'webhook' | 'custom';
  status?: ConnectionStatus;
  providerAccountId?: string | null;
  providerAccountName?: string | null;
  providerBaseUrl?: string | null;
  displayName?: string | null;
  grantedScopes?: string[];
  writebackEnabled?: boolean;
  connectorVersion?: string | null;
  capabilitiesSnapshot?: Record<string, unknown>;
  environment?: 'sandbox' | 'production';
};

export type ConnectionRow = { id: string; merchant_id: string; provider_id: string; provider_account_id: string | null };

/**
 * Upsert a canonical connection row (account-scoped conflict target) and ensure
 * a matching source_accounts row exists. Returns the connection + account ids.
 */
export async function upsertConnection(
  client: SupabaseClient,
  input: UpsertConnectionInput,
): Promise<{ connectionId: string; sourceAccountId: string }> {
  const environment = input.environment ?? 'production';
  const connectionValues = {
    category: input.category,
    auth_mode: input.authMode,
    status: input.status ?? 'connected',
    provider_account_name: input.providerAccountName ?? null,
    provider_base_url: input.providerBaseUrl ?? null,
    display_name: input.displayName ?? input.providerAccountName ?? null,
    granted_scopes: input.grantedScopes ?? [],
    writeback_enabled: input.writebackEnabled ?? false,
    connector_version: input.connectorVersion ?? null,
    capabilities_snapshot: input.capabilitiesSnapshot ?? {},
    environment,
    updated_at: new Date().toISOString(),
  };

  let conn: { id: string } | null = null;
  let connErr: { message: string; code?: string } | null = null;
  if (input.providerAccountId) {
    let ownerQuery = client
      .from(TABLES.MERCHANT_INTEGRATIONS)
      .select('id,merchant_id')
      .eq('provider_id', input.providerId)
      .eq('provider_account_id', input.providerAccountId);
    ownerQuery = environment === 'production'
      ? ownerQuery.or('environment.eq.production,environment.is.null')
      : ownerQuery.eq('environment', environment);
    const { data: existing, error: lookupError } = await ownerQuery.limit(1).maybeSingle();
    if (lookupError) throw new Error(`connection_ownership_lookup_failed:${lookupError.message}`);
    if (existing && existing.merchant_id !== input.merchantId) {
      throw new Error('provider_account_already_owned_by_another_merchant');
    }

    if (existing) {
      const result = await client
        .from(TABLES.MERCHANT_INTEGRATIONS)
        .update(connectionValues)
        .eq('id', existing.id)
        .eq('merchant_id', input.merchantId)
        .select('id')
        .single();
      conn = result.data;
      connErr = result.error;
    } else {
      const result = await client
        .from(TABLES.MERCHANT_INTEGRATIONS)
        .insert({
          merchant_id: input.merchantId,
          provider_id: input.providerId,
          provider_account_id: input.providerAccountId,
          ...connectionValues,
        })
        .select('id')
        .single();
      conn = result.data;
      connErr = result.error;
    }
  } else {
    const result = await client
      .from(TABLES.MERCHANT_INTEGRATIONS)
      .upsert(
        {
          merchant_id: input.merchantId,
          provider_id: input.providerId,
          provider_account_id: null,
          ...connectionValues,
        },
        { onConflict: 'merchant_id,provider_id,provider_account_id' },
      )
      .select('id')
      .single();
    conn = result.data;
    connErr = result.error;
  }
  if (connErr || !conn) {
    if (connErr?.code === '23505') throw new Error('provider_account_already_owned_or_provider_policy_conflict');
    throw new Error(`connection_upsert_failed:${connErr?.message ?? 'missing_row'}`);
  }
  const connectionId = conn.id;

  const { data: account, error: accErr } = await client
    .from(TABLES.SOURCE_ACCOUNTS)
    .upsert(
      {
        merchant_id: input.merchantId,
        connection_id: connectionId,
        provider_id: input.providerId,
        external_account_id: input.providerAccountId ?? null,
        display_name: input.displayName ?? input.providerAccountName ?? null,
        base_url: input.providerBaseUrl ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'merchant_id,connection_id,external_account_id' },
    )
    .select('id')
    .single();
  if (accErr) throw accErr;

  return { connectionId, sourceAccountId: (account as { id: string }).id };
}
