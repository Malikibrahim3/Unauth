import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { normaliseEmail } from '@/lib/identity/normalise';
import { fetchMerchantScopedCustomerProfile } from '@/lib/supabase/merchantHelpers';
import { performV1Lookup, type LookupAuth } from '@/lib/api/v1/lookup';
import { makeSignedToken, hashSignedToken } from '@/lib/api/signedAccess';
import { env } from '@/lib/utils/env';
import { gorgiasWidgetLog } from '@/lib/gorgias/widgetLog';
import { findMerchantCustomerByEmail } from '@/lib/gorgias/findMerchantCustomerByEmail';

export type MerchantProfileSummary = {
  profileId: string;
  riskScore: number;
  totalOrders: number;
  totalRefunds: number;
  firstSeen: string | null;
  lastSeen: string | null;
};

export type WidgetRiskTier = 'high' | 'medium' | 'low';

export type GorgiasWidgetModel =
  | { state: 'error'; message: string }
  | { state: 'not_found' }
  | {
      state: 'merchant_profile';
      profileId: string;
      riskLevel: string;
      riskScore: number;
      fraudFlags: string[];
      identityConfidenceGrade: string | null;
      profileUrl: string | null;
    }
  | {
      state: 'risk';
      tier: WidgetRiskTier;
      lookup: {
        risk_grade: string;
        confidence: string;
        risk_score: number;
        signals: string[];
        cross_merchant: {
          merchant_count: number;
          claim_count: number;
          flagged?: boolean;
        } | null;
      };
      merchantProfile: MerchantProfileSummary | null;
      showEvidence: boolean;
      profileUrl: string | null;
    }
  | {
      state: 'low_clear';
      merchantProfile: MerchantProfileSummary;
      noCrossMerchant: boolean;
      profileUrl: string | null;
    };

function riskTierFromLookup(lookup: {
  risk_grade: string;
  confidence: string;
  risk_score: number;
}): WidgetRiskTier {
  const { risk_grade: grade, confidence, risk_score: score } = lookup;

  if (grade === 'A' || confidence === 'definite' || score >= 75) return 'high';
  if (grade === 'B' || confidence === 'probable' || score >= 55) return 'medium';
  return 'low';
}

async function resolveMerchantProfile(
  service: SupabaseClient,
  merchantId: string,
  normEmail: string
): Promise<MerchantProfileSummary | null> {
  const row = await findMerchantCustomerByEmail(service, merchantId, normEmail);
  if (!row) return null;

  const profile = await fetchMerchantScopedCustomerProfile(service, merchantId, row.id);
  if (!profile) return null;

  return {
    profileId: row.id,
    riskScore: Number(profile.risk_score ?? 0),
    totalOrders: Number(profile.total_orders ?? 0),
    totalRefunds: Number(profile.total_refund_claims ?? 0),
    firstSeen: typeof profile.first_seen === 'string' ? profile.first_seen : null,
    lastSeen: typeof profile.last_seen === 'string' ? profile.last_seen : null,
  };
}

async function issueProfileUrl(
  service: SupabaseClient,
  merchantId: string,
  profileId: string
): Promise<string | null> {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const token = makeSignedToken({
    profile_id: profileId,
    merchant_id: merchantId,
    expires_at: expiresAt,
  });

  const { error } = await service.from(TABLES.PROFILE_VIEW_TOKENS).insert({
    profile_id: profileId,
    merchant_id: merchantId,
    token_hash: hashSignedToken(token),
    expires_at: expiresAt,
  });
  if (error) return null;

  const appBase = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  return `${appBase}/customers/${profileId}?view_token=${encodeURIComponent(token)}`;
}

export async function buildGorgiasWidgetModel(
  service: SupabaseClient,
  auth: LookupAuth,
  params: { rawEmail: string; rawName: string; orderId: string }
): Promise<GorgiasWidgetModel> {
  const normEmail = normaliseEmail(params.rawEmail.trim());
  if (!normEmail) {
    return { state: 'error', message: 'A valid customer email is required.' };
  }

  const merchantCustomer = await findMerchantCustomerByEmail(service, auth.merchantId, normEmail);
  if (merchantCustomer) {
    const profileUrl = await issueProfileUrl(service, auth.merchantId, merchantCustomer.id);
    return {
      state: 'merchant_profile',
      profileId: merchantCustomer.id,
      riskLevel: merchantCustomer.risk_level,
      riskScore: merchantCustomer.risk_score,
      fraudFlags: merchantCustomer.fraud_flags,
      identityConfidenceGrade: merchantCustomer.identity_confidence_grade,
      profileUrl,
    };
  }

  gorgiasWidgetLog('v1_lookup_before', { merchantId: auth.merchantId });
  const lookupResult = await performV1Lookup(
    service,
    { ...auth, auditQueryType: 'gorgias_widget' },
    {
      rawEmail: params.rawEmail.trim(),
      rawName: params.rawName.trim(),
      rawAddress: '',
      rawCard: '',
      rawIp: '',
    }
  );
  gorgiasWidgetLog('v1_lookup_after', {
    merchantId: auth.merchantId,
    ok: lookupResult.ok,
    status: lookupResult.ok ? 200 : lookupResult.status,
  });

  if (lookupResult.ok) {
    const body = lookupResult.body;
    const tier = riskTierFromLookup({
      risk_grade: String(body.risk_grade),
      confidence: String(body.confidence),
      risk_score: Number(body.risk_score),
    });

    const crossMerchant = body.cross_merchant as {
      merchant_count: number;
      claim_count: number;
      flagged?: boolean;
    } | null;

    if (tier === 'low' && !crossMerchant) {
      const merchantProfile = await resolveMerchantProfile(service, auth.merchantId, normEmail);
      if (merchantProfile) {
        const profileUrl = await issueProfileUrl(service, auth.merchantId, merchantProfile.profileId);
        return {
          state: 'low_clear',
          merchantProfile,
          noCrossMerchant: true,
          profileUrl,
        };
      }
    }

    const merchantProfile = await resolveMerchantProfile(service, auth.merchantId, normEmail);
    const profileUrl = merchantProfile
      ? await issueProfileUrl(service, auth.merchantId, merchantProfile.profileId)
      : null;

    return {
      state: 'risk',
      tier,
      lookup: {
        risk_grade: String(body.risk_grade),
        confidence: String(body.confidence),
        risk_score: Number(body.risk_score),
        signals: Array.isArray(body.signals) ? (body.signals as string[]) : [],
        cross_merchant: crossMerchant,
      },
      merchantProfile,
      showEvidence: tier === 'high' || tier === 'medium',
      profileUrl,
    };
  }

  if (lookupResult.status === 429) {
    return { state: 'error', message: lookupResult.error };
  }

  if (lookupResult.status === 404) {
    const merchantProfile = await resolveMerchantProfile(service, auth.merchantId, normEmail);
    if (merchantProfile) {
      const profileUrl = await issueProfileUrl(service, auth.merchantId, merchantProfile.profileId);
      return {
        state: 'low_clear',
        merchantProfile,
        noCrossMerchant: true,
        profileUrl,
      };
    }
    return { state: 'not_found' };
  }

  if (lookupResult.status === 401) {
    return { state: 'error', message: 'Invalid API key. Check Unauth → Settings → API & Integrations.' };
  }

  return {
    state: 'error',
    message: lookupResult.error || 'Could not load fraud intelligence.',
  };
}

export function formatRelativeFirstSeen(iso: string | null): string {
  if (!iso) return 'Unknown';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const days = Math.floor((now - then) / (1000 * 60 * 60 * 24));
  if (days < 1) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

export function confidenceLabel(confidence: string): string {
  return confidence.charAt(0).toUpperCase() + confidence.slice(1);
}

export function tierHeadline(tier: WidgetRiskTier): string {
  if (tier === 'high') return 'HIGH RISK';
  if (tier === 'medium') return 'ELEVATED RISK';
  return 'LOW RISK';
}
