import { TABLES } from '@/lib/supabase/tables';
import { upsertSupportProviderConnection } from '@/lib/support/intake/store';
import {
  gorgiasBaseUrlFromDomain,
  normalizeGorgiasDomain,
} from '@/lib/support/gorgias/accountIdentity';

export type UpsertGorgiasSupportConnectionInput = {
  merchant_id: string;
  provider_account_id?: string | null;
  provider_account_name?: string | null;
  provider_base_url?: string | null;
  domain?: string | null;
  status?: 'active' | 'disabled' | 'revoked' | 'error';
};

type PatchableSupabase = {
  from: (table: string) => {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
    };
  };
};

export async function upsertGorgiasSupportConnection(
  supabase: Parameters<typeof upsertSupportProviderConnection>[0],
  input: UpsertGorgiasSupportConnectionInput
) {
  const domain = input.domain ? normalizeGorgiasDomain(input.domain) : null;
  const providerBaseUrl =
    input.provider_base_url ?? (domain ? gorgiasBaseUrlFromDomain(domain) : null);
  const providerAccountId = input.provider_account_id ?? domain ?? null;

  return upsertSupportProviderConnection(supabase, {
    merchant_id: input.merchant_id,
    provider: 'gorgias',
    provider_account_id: providerAccountId,
    provider_account_name: input.provider_account_name ?? null,
    provider_base_url: providerBaseUrl,
    status: input.status ?? 'active',
    last_error: null,
  });
}

export async function touchGorgiasSupportConnectionSync(
  supabase: unknown,
  connectionId: string
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await (supabase as PatchableSupabase)
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .update({
      last_sync_at: now,
      last_error: null,
      updated_at: now,
    })
    .eq('id', connectionId);

  if (error) {
    throw new Error(`touch_gorgias_connection_failed: ${error.message}`);
  }
}

export async function recordGorgiasSupportConnectionError(
  supabase: unknown,
  connectionId: string,
  safeErrorCode: string
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await (supabase as PatchableSupabase)
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .update({
      last_error: safeErrorCode.slice(0, 500),
      updated_at: now,
    })
    .eq('id', connectionId);

  if (error) {
    throw new Error(`record_gorgias_connection_error_failed: ${error.message}`);
  }
}
