import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import {
  GorgiasSidebarRegistrationError,
  gorgiasApiBaseUrl,
  gorgiasApiRequest,
} from '@/lib/support/gorgias/registerSidebarWidget';
import {
  decryptGorgiasApiCredentials,
  type GorgiasApiCredentials,
} from '@/lib/support/gorgias/credentialCrypto';

export const GORGIAS_RECONNECT_REQUIRED_ERROR = 'gorgias_api_auth_failed';

export async function verifyGorgiasStoredCredentials(input: {
  providerBaseUrl: string;
  credentials: GorgiasApiCredentials;
}): Promise<void> {
  const apiBaseUrl = gorgiasApiBaseUrl(input.providerBaseUrl);
  await gorgiasApiRequest<Record<string, unknown>>(
    apiBaseUrl,
    '/account',
    input.credentials,
    { method: 'GET' },
  );
}

export async function markGorgiasConnectionReconnectRequired(
  supabase: SupabaseClient,
  connectionId: string,
  detail?: string,
): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .update({
      status: 'error',
      last_error: detail ?? GORGIAS_RECONNECT_REQUIRED_ERROR,
      updated_at: now,
    } as never)
    .eq('id', connectionId);
}

export async function verifyGorgiasConnectionOrMarkReconnectRequired(input: {
  supabase: SupabaseClient;
  connectionId: string;
  providerBaseUrl: string;
  accessTokenEncrypted: string;
}): Promise<boolean> {
  try {
    const credentials = decryptGorgiasApiCredentials(input.accessTokenEncrypted);
    await verifyGorgiasStoredCredentials({
      providerBaseUrl: input.providerBaseUrl,
      credentials,
    });
    return true;
  } catch (error) {
    const status =
      error instanceof GorgiasSidebarRegistrationError ? error.status : null;
    if (status === 401 || status === 403) {
      await markGorgiasConnectionReconnectRequired(
        input.supabase,
        input.connectionId,
        GORGIAS_RECONNECT_REQUIRED_ERROR,
      );
      return false;
    }
    throw error;
  }
}
