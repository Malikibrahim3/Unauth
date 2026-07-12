/**
 * Canonical connection store. Successful auth/callbacks and connection updates
 * finish by writing canonical `merchant_integrations` + `source_accounts` rows
 * through here, so the connection model has one writer regardless of provider.
 *
 * See docs/IMPL_source_agnostic_connected_ecosystem.md §5.
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
  authMode: 'oauth' | 'api_key' | 'webhook' | 'custom';
  status?: ConnectionStatus;
  providerAccountId?: string | null;
  providerAccountName?: string | null;
  providerBaseUrl?: string | null;
  displayName?: string | null;
  grantedScopes?: string[];
  writebackEnabled?: boolean;
  connectorVersion?: string | null;
  capabilitiesSnapshot?: Record<string, unknown>;
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
  const { data: conn, error: connErr } = await client
    .from(TABLES.MERCHANT_INTEGRATIONS)
    .upsert(
      {
        merchant_id: input.merchantId,
        provider_id: input.providerId,
        category: input.category,
        auth_mode: input.authMode,
        status: input.status ?? 'connected',
        provider_account_id: input.providerAccountId ?? null,
        provider_account_name: input.providerAccountName ?? null,
        provider_base_url: input.providerBaseUrl ?? null,
        display_name: input.displayName ?? input.providerAccountName ?? null,
        granted_scopes: input.grantedScopes ?? [],
        writeback_enabled: input.writebackEnabled ?? false,
        connector_version: input.connectorVersion ?? null,
        capabilities_snapshot: input.capabilitiesSnapshot ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'merchant_id,provider_id,provider_account_id' },
    )
    .select('id')
    .single();
  if (connErr) throw connErr;
  const connectionId = (conn as { id: string }).id;

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
