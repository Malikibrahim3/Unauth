import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { normaliseEmail } from '@/lib/identity/normalise';
import {
  fetchMerchantScopedCustomerProfile,
  fetchMerchantScopedCustomerTransactions,
} from '@/lib/supabase/merchantHelpers';
import { performV1Lookup, type LookupAuth } from '@/lib/api/v1/lookup';
import { makeSignedToken, hashSignedToken } from '@/lib/api/signedAccess';
import { env } from '@/lib/utils/env';
import { gorgiasWidgetLog } from '@/lib/gorgias/widgetLog';
import {
  findMerchantCustomerByEmail,
  type MerchantCustomerLookupDiagnostics,
} from '@/lib/gorgias/findMerchantCustomerByEmail';

// ---------------------------------------------------------------------------
// Widget stats — the core data backing the comparison table rows
// ---------------------------------------------------------------------------

export type WidgetStats = {
  /** Orders processed at this merchant for this customer. */
  storeOrders: number;
  /** Claims at this merchant. */
  storeClaims: number;
  /** Top claim reason if one reason accounts for ≥50% of claims; otherwise
   *  "N different reasons"; null when no claims. */
  primaryReason: string | null;
  /** Claims at this merchant in the last 90 days. */
  storeRecentClaims: number;
  /** Total orders across all merchants (from customer_profiles.total_orders). */
  networkOrders: number;
  /** Total claims across all merchants. */
  networkClaims: number;
  /** Number of distinct merchants. */
  networkMerchants: number;
  /** Claims network-wide in the last 90 days (from refund_timestamps). */
  networkRecentClaims: number;
};

// Minimal select — only what we need for stats; avoids pulling heavy JSON blobs.
const WIDGET_TX_SELECT = 'id,refund_claimed,refund_reason,processed_at';

function ninetyDayCutoff(): string {
  return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
}

function computePrimaryReason(
  claimedTxs: Array<Record<string, unknown>>
): string | null {
  const reasons = claimedTxs
    .map(tx => (typeof tx.refund_reason === 'string' && tx.refund_reason.trim() ? tx.refund_reason.trim() : null))
    .filter((r): r is string => r !== null);

  if (reasons.length === 0) return null;

  const counts = new Map<string, number>();
  for (const r of reasons) counts.set(r, (counts.get(r) ?? 0) + 1);

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [topReason, topCount] = sorted[0];

  if (topCount / reasons.length >= 0.5) {
    const pct = Math.round((topCount / reasons.length) * 100);
    return `"${topReason}" · ${pct}%`;
  }

  const n = counts.size;
  return `${n} different ${n === 1 ? 'reason' : 'reasons'} used`;
}

async function fetchWidgetStats(
  service: SupabaseClient,
  merchantId: string,
  profileId: string,
  profile: Record<string, unknown>
): Promise<WidgetStats> {
  const cutoff = ninetyDayCutoff();

  // Merchant-scoped transactions — gives "This Store" numbers.
  const txs = await fetchMerchantScopedCustomerTransactions(
    service,
    merchantId,
    profileId,
    profile,
    { select: WIDGET_TX_SELECT }
  );

  const storeOrders = txs.length;
  const storeClaimed = txs.filter(tx => tx.refund_claimed === true);
  const storeClaims = storeClaimed.length;
  const storeRecentClaims = storeClaimed.filter(
    tx => typeof tx.processed_at === 'string' && tx.processed_at >= cutoff
  ).length;
  const primaryReason = computePrimaryReason(storeClaimed);

  // Global profile aggregates — gives "Network" numbers.
  const networkOrders = Number(profile.total_orders ?? 0);
  const networkClaims = Number(profile.total_refund_claims ?? 0);
  const networkMerchants = Number(profile.total_merchants_seen_at ?? 0);

  const rawTimestamps = profile.refund_timestamps;
  const refundTimestamps: unknown[] = Array.isArray(rawTimestamps) ? rawTimestamps : [];
  const networkRecentClaims = refundTimestamps.filter(
    ts => typeof ts === 'string' && ts >= cutoff
  ).length;

  return {
    storeOrders,
    storeClaims,
    primaryReason,
    storeRecentClaims,
    networkOrders,
    networkClaims,
    networkMerchants,
    networkRecentClaims,
  };
}

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

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
      /** Rich stats for the comparison table. null when the profile fetch failed. */
      stats: WidgetStats | null;
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  const { customer } = await findMerchantCustomerByEmail(service, merchantId, normEmail);
  if (!customer) return null;

  const profile = await fetchMerchantScopedCustomerProfile(service, merchantId, customer.id);
  if (!profile) return null;

  return {
    profileId: customer.id,
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

// ---------------------------------------------------------------------------
// Public helpers used by the HTML renderer
// ---------------------------------------------------------------------------

export type BuildGorgiasWidgetResult = {
  model: GorgiasWidgetModel;
  lookupDiagnostics: MerchantCustomerLookupDiagnostics | null;
};

export async function buildGorgiasWidgetModel(
  service: SupabaseClient,
  auth: LookupAuth,
  params: { rawEmail: string; rawName: string; orderId: string }
): Promise<BuildGorgiasWidgetResult> {
  const normEmail = normaliseEmail(params.rawEmail.trim());
  if (!normEmail) {
    return {
      model: { state: 'error', message: 'A valid customer email is required.' },
      lookupDiagnostics: null,
    };
  }

  const { customer: merchantCustomer, diagnostics } = await findMerchantCustomerByEmail(
    service,
    auth.merchantId,
    normEmail
  );
  if (merchantCustomer) {
    const profileUrl = await issueProfileUrl(service, auth.merchantId, merchantCustomer.id);

    // Fetch the full profile row (needed for network stats and the transaction helper).
    const profile = await fetchMerchantScopedCustomerProfile(service, auth.merchantId, merchantCustomer.id);
    const stats = profile
      ? await fetchWidgetStats(service, auth.merchantId, merchantCustomer.id, profile)
      : null;

    return {
      model: {
        state: 'merchant_profile',
        profileId: merchantCustomer.id,
        riskLevel: merchantCustomer.risk_level,
        riskScore: merchantCustomer.risk_score,
        fraudFlags: merchantCustomer.fraud_flags,
        identityConfidenceGrade: merchantCustomer.identity_confidence_grade,
        profileUrl,
        stats,
      },
      lookupDiagnostics: diagnostics,
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
          model: {
            state: 'low_clear',
            merchantProfile,
            noCrossMerchant: true,
            profileUrl,
          },
          lookupDiagnostics: diagnostics,
        };
      }
    }

    const merchantProfile = await resolveMerchantProfile(service, auth.merchantId, normEmail);
    const profileUrl = merchantProfile
      ? await issueProfileUrl(service, auth.merchantId, merchantProfile.profileId)
      : null;

    return {
      model: {
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
      },
      lookupDiagnostics: diagnostics,
    };
  }

  if (lookupResult.status === 429) {
    return {
      model: { state: 'error', message: lookupResult.error },
      lookupDiagnostics: diagnostics,
    };
  }

  if (lookupResult.status === 404) {
    const merchantProfile = await resolveMerchantProfile(service, auth.merchantId, normEmail);
    if (merchantProfile) {
      const profileUrl = await issueProfileUrl(service, auth.merchantId, merchantProfile.profileId);
      return {
        model: {
          state: 'low_clear',
          merchantProfile,
          noCrossMerchant: true,
          profileUrl,
        },
        lookupDiagnostics: diagnostics,
      };
    }
    return { model: { state: 'not_found' }, lookupDiagnostics: diagnostics };
  }

  if (lookupResult.status === 401) {
    return {
      model: { state: 'error', message: 'Invalid API key. Check Unauth → Settings → API & Integrations.' },
      lookupDiagnostics: diagnostics,
    };
  }

  return {
    model: {
      state: 'error',
      message: lookupResult.error || 'Could not load identity intelligence.',
    },
    lookupDiagnostics: diagnostics,
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
