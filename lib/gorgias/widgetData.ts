import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { normaliseEmail } from '@/lib/identity/normalise';
import { fetchMerchantScopedCustomerProfile } from '@/lib/supabase/merchantHelpers';
import { performV1Lookup, type LookupAuth } from '@/lib/api/v1/lookup';

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
    }
  | {
      state: 'low_clear';
      merchantProfile: MerchantProfileSummary;
      noCrossMerchant: boolean;
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
  const filters = `merchant_ids.cs.${JSON.stringify([merchantId])}`;
  const { data: row } = await service
    .from(TABLES.CUSTOMER_PROFILES)
    .select('id')
    .contains('emails', JSON.stringify([normEmail]))
    .or(filters)
    .order('risk_score', { ascending: false })
    .limit(1)
    .maybeSingle() as unknown as { data: { id: string } | null };

  if (!row?.id) return null;

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

export async function buildGorgiasWidgetModel(
  service: SupabaseClient,
  auth: LookupAuth,
  params: { rawEmail: string; rawName: string; orderId: string }
): Promise<GorgiasWidgetModel> {
  const normEmail = normaliseEmail(params.rawEmail.trim());
  if (!normEmail) {
    return { state: 'error', message: 'A valid customer email is required.' };
  }

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
        return {
          state: 'low_clear',
          merchantProfile,
          noCrossMerchant: true,
        };
      }
    }

    const merchantProfile = await resolveMerchantProfile(service, auth.merchantId, normEmail);

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
    };
  }

  if (lookupResult.status === 429) {
    return { state: 'error', message: lookupResult.error };
  }

  if (lookupResult.status === 404) {
    const merchantProfile = await resolveMerchantProfile(service, auth.merchantId, normEmail);
    if (merchantProfile) {
      return {
        state: 'low_clear',
        merchantProfile,
        noCrossMerchant: true,
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
