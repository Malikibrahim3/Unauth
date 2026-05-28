import type { SupabaseClient } from '@supabase/supabase-js';
import {
  normaliseEmail,
  normaliseIP,
  normaliseAddress,
  normaliseCard,
} from '@/lib/identity/normalise';
import { hashIdentifier } from '@/lib/identity/hash';
import { maskEmail } from '@/lib/privacy/mask';
import { scoreToGrade, gradeToLetter, K_ANONYMITY_MIN, FLAG_THRESHOLD } from '@/lib/engine/weights';
import { humanizeFraudFlags, crossMerchantSummary } from '@/lib/api/v1/signals';
import { logPublicApiAccess } from '@/lib/api/v1/audit';
import { incrementAndCheckDailyLookupLimit } from '@/lib/api/v1/rateLimit';

export type LookupParams = {
  rawEmail: string;
  rawName: string;
  rawAddress: string;
  rawCard: string;
  rawIp: string;
};

export type LookupAuth = {
  merchantId: string;
  apiKeyId: string;
  requestIp: string;
  /** Override access_audit_log query_type (e.g. gorgias_widget). */
  auditQueryType?: string;
};

type SearchRow = {
  id: string;
  primary_email: string | null;
  risk_score: number;
  fraud_flags: string[] | unknown;
  total_merchants_seen_at: number;
  total_refund_claims: number;
  merchant_ids: string[];
};

export type LookupResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; status: number; error: string };

export async function performV1Lookup(
  service: SupabaseClient,
  auth: LookupAuth,
  params: LookupParams
): Promise<LookupResult> {
  const { rawEmail, rawName, rawAddress, rawCard, rawIp } = params;
  const auditType = auth.auditQueryType ?? 'api_v1_lookup';

  if (!rawEmail && !rawName && !rawAddress && !rawCard && !rawIp) {
    return { ok: false, status: 400, error: 'email is required unless other identifiers are provided' };
  }

  if (!rawEmail) {
    return { ok: false, status: 400, error: 'email query parameter is required' };
  }

  try {
    const rate = await incrementAndCheckDailyLookupLimit(service, auth.merchantId);
    if (!rate.allowed) {
      return {
        ok: false,
        status: 429,
        error: 'Daily lookup limit reached. Limit resets at 00:00 UTC.',
      };
    }
  } catch {
    return { ok: false, status: 500, error: 'Rate limit check failed' };
  }

  const normEmail = normaliseEmail(rawEmail);
  if (!normEmail) {
    return { ok: false, status: 400, error: 'Invalid email address' };
  }
  const normCard = rawCard ? normaliseCard(rawCard) : null;
  const normIp = rawIp ? normaliseIP(rawIp) : null;
  const normAddress = rawAddress ? normaliseAddress(rawAddress) : null;
  const normName = rawName ? rawName.toLowerCase() : null;

  const queriedHashes = [
    hashIdentifier(normEmail),
    normAddress ? hashIdentifier(normAddress) : null,
    normIp ? hashIdentifier(normIp) : null,
    normCard ? hashIdentifier(normCard) : null,
  ].filter(Boolean) as string[];

  const { data: rows, error } = await service.rpc('search_customer_profiles', {
    p_email: normEmail || null,
    p_name: normName || null,
    p_address: normAddress || null,
    p_card: normCard && normCard.length === 4 ? normCard : null,
    p_ip: normIp || null,
  });

  if (error) {
    await logPublicApiAccess(service, {
      merchantId: auth.merchantId,
      queryType: auditType,
      kAnonymitySatisfied: false,
      resultReturned: false,
      queriedHashes,
      matchedMerchantCount: 0,
      requestIp: auth.requestIp,
      apiKeyId: auth.apiKeyId,
    });
    return { ok: false, status: 500, error: 'Search failed' };
  }

  const results = (rows ?? []) as SearchRow[];
  await new Promise((r) => setTimeout(r, 10 + Math.random() * 40));

  if (results.length === 0) {
    await logPublicApiAccess(service, {
      merchantId: auth.merchantId,
      queryType: auditType,
      kAnonymitySatisfied: false,
      resultReturned: false,
      queriedHashes,
      matchedMerchantCount: 0,
      requestIp: auth.requestIp,
      apiKeyId: auth.apiKeyId,
    });
    return { ok: false, status: 404, error: 'No matching identity found' };
  }

  const best = results[0];
  const merchantIds = Array.isArray(best.merchant_ids) ? best.merchant_ids : [];
  const merchantCount = best.total_merchants_seen_at ?? merchantIds.length;
  const flags = Array.isArray(best.fraud_flags) ? (best.fraud_flags as string[]) : [];
  const riskScore = Number(best.risk_score ?? 0);
  const confidence = scoreToGrade(riskScore);
  const kAnonOk = merchantCount >= K_ANONYMITY_MIN;

  await logPublicApiAccess(service, {
    merchantId: auth.merchantId,
    queryType: 'api_v1_lookup',
    kAnonymitySatisfied: kAnonOk,
    resultReturned: true,
    queriedHashes,
    matchedMerchantCount: merchantCount,
    requestIp: auth.requestIp,
    apiKeyId: auth.apiKeyId,
  });

  const crossMerchant = crossMerchantSummary(
    merchantCount,
    best.total_refund_claims ?? 0,
    riskScore >= FLAG_THRESHOLD
  );

  return {
    ok: true,
    body: {
      email: maskEmail(rawEmail) ?? 'masked',
      risk_grade: gradeToLetter(confidence),
      confidence,
      risk_score: Math.round(riskScore),
      signals: humanizeFraudFlags(flags),
      cross_merchant: crossMerchant,
      looked_up_at: new Date().toISOString(),
    },
  };
}
