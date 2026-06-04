import { TABLES } from '@/lib/supabase/tables';
import {
  decryptZendeskApiCredentials,
  type ZendeskApiCredentials,
} from '@/lib/support/zendesk/credentialCrypto';

type Row = {
  id: string;
  status: string | null;
  provider_base_url: string | null;
  access_token_encrypted: string | null;
};

type ListableSupabase = {
  from: (table: string) => {
    select: (columns?: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          order: (
            column: string,
            options: { ascending: boolean },
          ) => {
            limit: (n: number) => {
              maybeSingle: () => Promise<{
                data: Row | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };
    };
  };
};

export type ZendeskMerchantApiAccess = {
  connectionId: string;
  providerBaseUrl: string;
  credentials: ZendeskApiCredentials;
};

export async function getActiveZendeskMerchantApiAccess(
  supabase: unknown,
  merchantId: string,
): Promise<ZendeskMerchantApiAccess | null> {
  const { data, error } = await (supabase as ListableSupabase)
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .select('id, status, provider_base_url, access_token_encrypted')
    .eq('merchant_id', merchantId)
    .eq('provider', 'zendesk')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  if (data.status !== 'active' || !data.provider_base_url || !data.access_token_encrypted) {
    return null;
  }

  return {
    connectionId: data.id,
    providerBaseUrl: data.provider_base_url,
    credentials: decryptZendeskApiCredentials(data.access_token_encrypted),
  };
}
