import type { SupabaseClient } from '@supabase/supabase-js';
import {
  normaliseEmail,
  normaliseIP,
  normaliseAddress,
  normaliseCard,
} from '@/lib/identity/normalise';
import { hashIdentifier } from '@/lib/identity/hash';
import { maskEmail } from '@/lib/privacy/mask';
import { K_ANONYMITY_MIN } from '@/lib/engine/weights';
import type { ConfidenceGrade } from '@/lib/engine/weights';
import { crossMerchantSummary } from '@/lib/api/v1/signals';
import { logPublicApiAccess } from '@/lib/api/v1/audit';
import { incrementAndCheckDailyLookupLimit } from '@/lib/api/v1/rateLimit';
import { hashSupportEmail } from '@/lib/support/intake/store';

export type LookupParams = {
  rawEmail: string;
  rawName: string;
  rawAddress: string;
  rawCard: string;
  rawIp: string;
  /** Optional exact phone identifier — a direct-identifier match, like email. */
  rawPhone?: string;
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
  primary_phone: string | null;
  fraud_flags: string[] | unknown;
  total_merchants_seen_at: number;
  total_refund_claims: number;
  total_chargebacks: number | null;
  merchant_ids: string[];
};

/**
 * The factual claims record + identity grade returned to widget surfaces.
 *
 * PRODUCT CONTRACT (see lib/identity/productContract.ts):
 *   - `confidence` reflects identity certainty ONLY (who the person is).
 *     It is NEVER derived from a risk/fraud score and is NEVER conditioned
 *     on claim history existing. A single exact email OR phone match is a
 *     direct identifier match → 'definite'.
 *   - The claims record is a separate, factual list of what the person has
 *     done (refund / chargeback counts) with an explicit source.
 *   - No risk score, risk grade, risk band, or recommendation is emitted.
 */
export type LookupBody = {
  email: string;
  confidence: ConfidenceGrade;
  matched_on: string[];
  claims_record: {
    refunds: number;
    chargebacks: number;
    /** 'your_store' (siloed) or 'network' (cross-merchant). */
    source: 'your_store' | 'network';
    cross_merchant: { merchant_count: number; claim_count: number } | null;
    /** Total refund value of THIS merchant's own claims (own data; null if none). */
    refund_value: number | null;
    /** ISO date of THIS merchant's most recent claim (own data; null if none). */
    last_claim_at: string | null;
  };
  /** True when documented cross-merchant prior-transaction history exists. */
  ce3_evidence_available: boolean;
  looked_up_at: string;
};

export type LookupResult =
  | { ok: true; body: LookupBody }
  | { ok: false; status: number; error: string };

export async function performV1Lookup(
  service: SupabaseClient,
  auth: LookupAuth,
  params: LookupParams
): Promise<LookupResult> {
  const { rawEmail, rawName, rawAddress, rawCard, rawIp, rawPhone } = params;
  const auditType = auth.auditQueryType ?? 'api_v1_lookup';

  if (!rawEmail && !rawName && !rawAddress && !rawCard && !rawIp && !rawPhone) {
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
  const normPhone = rawPhone ? rawPhone.replace(/[^\d+]/g, '') : null;

  const queriedHashes = [
    hashIdentifier(normEmail),
    normPhone ? hashIdentifier(normPhone) : null,
    normAddress ? hashIdentifier(normAddress) : null,
    normIp ? hashIdentifier(normIp) : null,
    normCard ? hashIdentifier(normCard) : null,
  ].filter(Boolean) as string[];

  const { data: rows, error } = await service.rpc('search_customer_profiles', {
    p_email: null,
    p_name: normName || null,
    p_address: null,
    p_card: null,
    p_ip: null,
    p_email_hash: normEmail ? hashIdentifier(normEmail) : null,
    p_address_hash: normAddress ? hashIdentifier(normAddress) : null,
    p_card_hash: normCard && normCard.length === 4 ? hashIdentifier(normCard) : null,
    p_ip_hash: normIp ? hashIdentifier(normIp) : null,
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
  const kAnonOk = merchantCount >= K_ANONYMITY_MIN;

  await logPublicApiAccess(service, {
    merchantId: auth.merchantId,
    queryType: auditType,
    kAnonymitySatisfied: kAnonOk,
    resultReturned: true,
    queriedHashes,
    matchedMerchantCount: merchantCount,
    requestIp: auth.requestIp,
    apiKeyId: auth.apiKeyId,
  });

  if (!kAnonOk) {
    return { ok: false, status: 404, error: 'No matching identity found' };
  }

  // ---------------------------------------------------------------------------
  // Identity confidence grade — identity signals ONLY (productContract.ts).
  // Direct identifier match (exact email or exact phone) short-circuits to
  // DEFINITE regardless of any score and regardless of claim history.
  // ---------------------------------------------------------------------------
  const emailMatched =
    !!best.primary_email && normaliseEmail(best.primary_email) === normEmail;
  const phoneMatched =
    !!normPhone &&
    !!best.primary_phone &&
    best.primary_phone.replace(/[^\d+]/g, '') === normPhone;

  // Medium/corroborating identifiers that were supplied alongside email but did
  // not themselves constitute a direct identifier match. Name never anchors.
  const corroborators = [normAddress, normCard, normIp].filter(Boolean).length;

  const matched_on: string[] = [];
  let confidence: ConfidenceGrade;

  if (emailMatched || phoneMatched) {
    confidence = 'definite';
    if (emailMatched) matched_on.push('email address');
    if (phoneMatched) matched_on.push('phone number');
  } else if (corroborators >= 2) {
    confidence = 'probable';
  } else if (corroborators === 1) {
    confidence = 'possible';
  } else {
    confidence = 'weak';
  }

  if (!emailMatched && !phoneMatched) {
    if (normAddress) matched_on.push('shipping address');
    if (normCard) matched_on.push('card (BIN+last4)');
    if (normIp) matched_on.push('IP address');
  }

  // ---------------------------------------------------------------------------
  // Claims record — a factual, sourced list of what the person has done.
  // ---------------------------------------------------------------------------
  const refunds = Number(best.total_refund_claims ?? 0);
  const chargebacks = Number(best.total_chargebacks ?? 0);
  const claimSource: 'your_store' | 'network' = merchantCount > 1 ? 'network' : 'your_store';

  const crossMerchant = crossMerchantSummary(
    merchantCount,
    best.total_refund_claims ?? 0
  );

  // Amount + date are sourced ONLY from THIS merchant's own claims (own data) —
  // never aggregated across the network, which would expose other merchants'
  // dollar figures and break the anonymity model.
  const { refundValue, lastClaimAt } = await sumOwnClaimAmounts(
    service,
    auth.merchantId,
    normEmail
  );

  return {
    ok: true,
    body: {
      email: maskEmail(rawEmail) ?? 'masked',
      confidence,
      matched_on,
      claims_record: {
        refunds,
        chargebacks,
        source: claimSource,
        cross_merchant: crossMerchant,
        refund_value: refundValue,
        last_claim_at: lastClaimAt,
      },
      ce3_evidence_available: !!crossMerchant && refunds + chargebacks > 0,
      looked_up_at: new Date().toISOString(),
    },
  };
}

/**
 * Sum the calling merchant's OWN refund amounts and find the most recent claim
 * date for this customer, from order_claim_context joined to support_case_intake.
 * Store-scoped only (own data) — never cross-merchant.
 */
async function sumOwnClaimAmounts(
  service: SupabaseClient,
  merchantId: string,
  normEmail: string
): Promise<{ refundValue: number | null; lastClaimAt: string | null }> {
  let emailHash: string;
  try {
    emailHash = hashSupportEmail(normEmail);
  } catch {
    return { refundValue: null, lastClaimAt: null };
  }

  const { data, error } = await service
    .from('order_claim_context')
    .select(
      'refund_amount_approved, refund_amount_requested, order_value, support_case_intake!inner(customer_email_hash, merchant_id, is_claim, created_at_provider)'
    )
    .eq('merchant_id', merchantId)
    .eq('support_case_intake.customer_email_hash', emailHash)
    .eq('support_case_intake.is_claim', true);

  if (error || !Array.isArray(data) || data.length === 0) {
    return { refundValue: null, lastClaimAt: null };
  }

  let total = 0;
  let hasValue = false;
  let lastClaimAt: string | null = null;
  for (const row of data as Array<{
    refund_amount_approved?: number | null;
    refund_amount_requested?: number | null;
    order_value?: number | null;
    support_case_intake?: { created_at_provider?: string | null } | { created_at_provider?: string | null }[];
  }>) {
    const amount =
      row.refund_amount_approved ?? row.refund_amount_requested ?? row.order_value ?? null;
    if (amount != null) {
      total += Number(amount);
      hasValue = true;
    }
    const sci = Array.isArray(row.support_case_intake) ? row.support_case_intake[0] : row.support_case_intake;
    const when = sci?.created_at_provider ?? null;
    if (when && (!lastClaimAt || when > lastClaimAt)) lastClaimAt = when;
  }

  return { refundValue: hasValue ? Math.round(total) : null, lastClaimAt };
}
