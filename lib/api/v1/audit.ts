import type { SupabaseClient } from '@supabase/supabase-js';

export async function logPublicApiAccess(
  service: SupabaseClient,
  params: {
    merchantId: string;
    queryType: string;
    lookupType?: string;
    kAnonymitySatisfied: boolean;
    resultReturned: boolean;
    queriedHashes: string[];
    matchedMerchantCount: number;
    requestIp: string;
    apiKeyId: string;
  }
): Promise<void> {
  const { error } = await service.from('access_audit_log').insert({
    merchant_id: params.merchantId,
    query_type: params.queryType,
    lookup_type: params.lookupType ?? params.queryType,
    k_anonymity_satisfied: params.kAnonymitySatisfied,
    result_returned: params.resultReturned,
    queried_hashes: params.queriedHashes,
    matched_merchant_count: params.matchedMerchantCount,
    request_ip: params.requestIp,
  });

  if (error) {
    console.error('[public-api] audit_log insert failed:', error.message);
  }
}
