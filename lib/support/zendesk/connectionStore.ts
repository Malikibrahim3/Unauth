import { upsertSupportProviderConnection } from '@/lib/support/intake/store';
import {
  normalizeZendeskSubdomain,
  zendeskBaseUrlFromSubdomain,
} from '@/lib/support/zendesk/accountIdentity';

export type UpsertZendeskSupportConnectionInput = {
  merchant_id: string;
  provider_account_id?: string | null;
  provider_account_name?: string | null;
  provider_base_url?: string | null;
  subdomain?: string | null;
  status?: 'active' | 'disabled' | 'revoked' | 'error';
  last_error?: string | null;
  accessTokenEncrypted?: string | null;
};

export async function upsertZendeskSupportConnection(
  supabase: Parameters<typeof upsertSupportProviderConnection>[0],
  input: UpsertZendeskSupportConnectionInput,
) {
  const subdomain = input.subdomain ? normalizeZendeskSubdomain(input.subdomain) : null;
  const providerBaseUrl =
    input.provider_base_url ?? (subdomain ? zendeskBaseUrlFromSubdomain(subdomain) : null);
  const providerAccountId = input.provider_account_id ?? subdomain ?? null;

  return upsertSupportProviderConnection(supabase, {
    merchant_id: input.merchant_id,
    provider: 'zendesk',
    provider_account_id: providerAccountId,
    provider_account_name: input.provider_account_name ?? null,
    provider_base_url: providerBaseUrl,
    status: input.status ?? 'active',
    last_error: input.last_error ?? null,
    ...(input.accessTokenEncrypted !== undefined
      ? { access_token_encrypted: input.accessTokenEncrypted }
      : {}),
  });
}
