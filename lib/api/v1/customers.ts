import type { SupabaseClient } from '@supabase/supabase-js';
import { normaliseEmail } from '@/lib/identity/normalise';
import { hashIdentifier } from '@/lib/identity/hash';
import { findMerchantCustomerByEmail } from '@/lib/gorgias/findMerchantCustomerByEmail';
import {
  fetchMerchantScopedCustomerProfile,
  fetchMerchantScopedCustomerTransactions,
} from '@/lib/supabase/merchantHelpers';
import { maskEmail, maskAddress, maskIdentifier } from '@/lib/privacy/mask';
import { scoreToGrade, gradeToLetter, K_ANONYMITY_MIN } from '@/lib/engine/weights';
import { humanizeClaimHistorySignals, crossMerchantSummary } from '@/lib/api/v1/signals';
import { logPublicApiAccess } from '@/lib/api/v1/audit';
import { env } from '@/lib/utils/env';

export type CustomerAuth = {
  merchantId: string;
  apiKeyId: string;
  requestIp: string;
};

export type CustomerResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; status: number; error: string };

function countInrClaims(transactions: Array<Record<string, unknown>>): number {
  return transactions.filter((tx) => {
    const reason = String(tx.refund_reason ?? '').toLowerCase();
    return reason === 'inr' || reason.includes('not received');
  }).length;
}

export async function performV1CustomerProfile(
  service: SupabaseClient,
  auth: CustomerAuth,
  rawEmail: string
): Promise<CustomerResult> {
  if (!rawEmail.trim()) {
    return { ok: false, status: 400, error: 'email query parameter is required' };
  }

  const normEmail = normaliseEmail(rawEmail.trim());
  if (!normEmail) {
    return { ok: false, status: 400, error: 'Invalid email address' };
  }
  const queriedHashes = [hashIdentifier(normEmail)];

  let profileId: string | null;
  try {
    const { customer } = await findMerchantCustomerByEmail(service, auth.merchantId, normEmail);
    profileId = customer?.id ?? null;
  } catch {
    return { ok: false, status: 500, error: 'Profile lookup failed' };
  }

  if (!profileId) {
    await logPublicApiAccess(service, {
      merchantId: auth.merchantId,
      queryType: 'api_v1_customers',
      kAnonymitySatisfied: false,
      resultReturned: false,
      queriedHashes,
      matchedMerchantCount: 0,
      requestIp: auth.requestIp,
      apiKeyId: auth.apiKeyId,
    });
    return { ok: false, status: 404, error: 'Customer not found in your merchant data' };
  }

  const profile = await fetchMerchantScopedCustomerProfile(
    service,
    auth.merchantId,
    profileId
  );

  if (!profile) {
    await logPublicApiAccess(service, {
      merchantId: auth.merchantId,
      queryType: 'api_v1_customers',
      kAnonymitySatisfied: false,
      resultReturned: false,
      queriedHashes,
      matchedMerchantCount: 0,
      requestIp: auth.requestIp,
      apiKeyId: auth.apiKeyId,
    });
    return { ok: false, status: 404, error: 'Customer not found in your merchant data' };
  }

  const transactions = await fetchMerchantScopedCustomerTransactions(
    service,
    auth.merchantId,
    profileId,
    profile
  );

  const storeOrdersAtMerchant = transactions.length;

  const emails = (Array.isArray(profile.emails) ? profile.emails : []) as string[];
  const addresses = (Array.isArray(profile.addresses) ? profile.addresses : []) as string[];
  const cards = (Array.isArray(profile.card_last4s) ? profile.card_last4s : []) as string[];
  // NOTE: `fraud_flags` is the underlying database column name (out of scope
  // to rename here); the local name below is kept neutral per
  // docs/PRODUCT.md.
  const claimHistorySignals = (Array.isArray(profile.fraud_flags) ? profile.fraud_flags : []) as string[];

  const riskScore = Number(profile.risk_score ?? 0);
  const confidence = scoreToGrade(riskScore);
  const merchantCount = Number(profile.total_merchants_seen_at ?? 1);
  const kAnonOk = merchantCount >= K_ANONYMITY_MIN;

  await logPublicApiAccess(service, {
    merchantId: auth.merchantId,
    queryType: 'api_v1_customers',
    kAnonymitySatisfied: kAnonOk,
    resultReturned: true,
    queriedHashes,
    matchedMerchantCount: merchantCount,
    requestIp: auth.requestIp,
    apiKeyId: auth.apiKeyId,
  });

  const crossMerchant = crossMerchantSummary(
    merchantCount,
    Number(profile.total_refund_claims ?? 0)
  );

  const appBase = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');

  return {
    ok: true,
    body: {
      profile_id: profileId,
      // `risk_grade` is a deprecated alias kept for backward compatibility
      // with existing external consumers of this field name. New
      // integrations should read `confidence_grade` instead — same value,
      // neutral naming per docs/PRODUCT.md (this reflects
      // identity/evidence confidence, not an accusation of risk).
      risk_grade: gradeToLetter(confidence),
      confidence_grade: gradeToLetter(confidence),
      confidence,
      risk_score: Math.round(riskScore),
      investigation_status: String(profile.investigation_status ?? 'new'),
      identity_timeline: {
        emails: emails.flatMap((e) => { const v = maskEmail(e); return v ? [v] : []; }),
        addresses: addresses.flatMap((a) => { const v = maskAddress(a); return v ? [v] : []; }),
        cards: cards.flatMap((c) => { const v = maskIdentifier(c, 4); return v ? [v] : []; }),
      },
      behavioral_history: {
        total_orders: Number(profile.total_orders ?? 0),
        store_orders_at_merchant: storeOrdersAtMerchant,
        refund_claims: Number(profile.total_refund_claims ?? 0),
        chargebacks: Number(profile.total_chargebacks ?? 0),
        INR_claims: countInrClaims(transactions),
      },
      cross_merchant: crossMerchant,
      signals: humanizeClaimHistorySignals(claimHistorySignals),
      profile_url: `${appBase}/customers/${profileId}`,
    },
  };
}
