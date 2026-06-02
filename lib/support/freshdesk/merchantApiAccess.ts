import { TABLES } from '@/lib/supabase/tables';
import {
  decryptFreshdeskApiCredentials,
  type FreshdeskApiCredentials,
} from '@/lib/support/freshdesk/credentialCrypto';

type Row = {
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
            options: { ascending: boolean }
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

export type FreshdeskMerchantApiAccess = {
  providerBaseUrl: string;
  credentials: FreshdeskApiCredentials;
};

export async function getActiveFreshdeskMerchantApiAccess(
  supabase: unknown,
  merchantId: string
): Promise<FreshdeskMerchantApiAccess | null> {
  const { data, error } = await (supabase as ListableSupabase)
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .select('status, provider_base_url, access_token_encrypted')
    .eq('merchant_id', merchantId)
    .eq('provider', 'freshdesk')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  if (data.status !== 'active' || !data.provider_base_url || !data.access_token_encrypted) {
    return null;
  }

  return {
    providerBaseUrl: data.provider_base_url,
    credentials: decryptFreshdeskApiCredentials(data.access_token_encrypted),
  };
}
