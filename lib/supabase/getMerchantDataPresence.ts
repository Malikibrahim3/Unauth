import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from './tables';

export type MerchantDataPresence = {
  hasAnyData: boolean;
  sources: {
    customerProfiles: number;
    csvJobs: number;
    claims: number;
    evidencePackages: number;
  };
};

/**
 * Checks all merchant-owned tables for any useful data.
 *
 * customer_profiles has no merchant_id scalar — it uses merchant_ids (Json array).
 * We use PostgREST containment filters to match both the current merchantId and,
 * for legacy profiles created before the merchants table, the auth userId.
 *
 * public_audits is excluded — it is a landing-page free-audit table, not merchant data.
 */
export async function getMerchantDataPresence(
  serviceClient: SupabaseClient,
  merchantId: string,
  userId?: string,
): Promise<MerchantDataPresence> {
  // Build the containment filter for customer_profiles.
  // New profiles: merchant_ids contains merchantId.
  // Legacy profiles (pre-merchants-table): merchant_ids contains userId.
  const profileFilter =
    userId && userId !== merchantId
      ? [
          `merchant_ids.cs.${JSON.stringify([merchantId])}`,
          `merchant_ids.cs.${JSON.stringify([userId])}`,
        ].join(',')
      : `merchant_ids.cs.${JSON.stringify([merchantId])}`;

  const [
    { count: customerProfiles },
    { count: csvJobs },
    { count: evidencePackages },
    { count: claims },
  ] = await Promise.all([
    serviceClient
      .from(TABLES.CUSTOMER_PROFILES)
      .select('id', { count: 'exact', head: true })
      .or(profileFilter),
    serviceClient
      .from(TABLES.PROCESSING_JOBS)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId)
      .eq('hidden_by_merchant', false),
    serviceClient
      .from('evidence_packages' as never)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId),
    serviceClient
      .from('merchant_claims' as never)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId),
  ]);

  const sources = {
    customerProfiles: customerProfiles ?? 0,
    csvJobs: csvJobs ?? 0,
    evidencePackages: evidencePackages ?? 0,
    claims: claims ?? 0,
  };

  const hasAnyData =
    sources.customerProfiles > 0 ||
    sources.csvJobs > 0 ||
    sources.claims > 0 ||
    sources.evidencePackages > 0;

  return { hasAnyData, sources };
}
