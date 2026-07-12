import type { SupabaseClient } from '@supabase/supabase-js';
import { getIntegrationCredential } from '@/lib/integrations/auth';
import { createServiceClient } from '@/lib/supabase/server';

type SupportedProvider = 'aftership' | 'shipbob';

function stringCredential(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Resolves integration credentials for a provider.
 * Checks merchant-specific encrypted credentials first. Environment fallback
 * is development/test-only and is never used after a production lookup failure.
 */
export async function getProviderCredential(
  merchantId: string,
  provider: SupportedProvider,
  fallbackEnvVar: string,
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
    if (process.env.NODE_ENV === 'production') return null;
  }
  return process.env.NODE_ENV === 'production' ? null : process.env[fallbackEnvVar]?.trim() || null;
}
