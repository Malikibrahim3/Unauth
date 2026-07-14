import type { SupabaseClient } from '@supabase/supabase-js';
import { getIntegrationCredential } from '@/lib/integrations/auth';
import { createServiceClient } from '@/lib/supabase/server';

type SupportedProvider = 'shipbob';

function stringCredential(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Resolves integration credentials for a provider.
 * Checks only merchant-specific encrypted credentials. Provider tokens never
 * fall back to application environment variables in any environment.
 */
export async function getProviderCredential(
  merchantId: string,
  provider: SupportedProvider,
  client?: SupabaseClient,
): Promise<string | null> {
  try {
    const credential = await getIntegrationCredential(client ?? createServiceClient(), merchantId, provider);
    const stored =
      stringCredential(credential?.apiKey) ??
      stringCredential(credential?.pat) ??
      stringCredential(credential?.accessToken);
    if (stored) return stored;
  } catch {
    return null;
  }
  return null;
}
