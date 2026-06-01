import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { normaliseEmail } from '@/lib/identity/normalise';
import {
  fetchMerchantScopedCustomerProfile,
  fetchMerchantScopedCustomerTransactions,
} from '@/lib/supabase/merchantHelpers';
import { performV1Lookup, type LookupAuth } from '@/lib/api/v1/lookup';
import type { ConfidenceGrade } from '@/lib/engine/weights';
import { makeSignedToken, hashSignedToken } from '@/lib/api/signedAccess';
import { env } from '@/lib/utils/env';
import { gorgiasWidgetLog } from '@/lib/gorgias/widgetLog';
import {
  findMerchantCustomerByEmail,
  type MerchantCustomerLookupDiagnostics,
} from '@/lib/gorgias/findMerchantCustomerByEmail';
import { hashSupportEmail } from '@/lib/support/intake/store';
import type { ClaimType } from '@/lib/support/intake/classifyClaim';

// ---------------------------------------------------------------------------
// Widget stats — the core data backing the comparison table rows
// ---------------------------------------------------------------------------

export type WidgetStats = {
  /** Orders processed at this merchant for this customer. */
  storeOrders: number;
  /** Claims at this merchant. */
  storeClaims: number;
  /** Top claim reason if one reason accounts for >50% of claims; otherwise
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
  /** Identity confidence grade — who the person is, NOT how risky they are. */
  confidenceGrade: ConfidenceGrade | null;
  totalOrders: number;
  totalRefunds: number;
  firstSeen: string | null;
  lastSeen: string | null;
};

/** A factual, sourced claims record — what the person has done. No risk scoring. */
export type WidgetClaimsRecord = {
  refunds: number;
  chargebacks: number;
  source: 'your_store' | 'network';
  cross_merchant: { merchant_count: number; claim_count: number } | null;
};

export type GorgiasWidgetModel =
  | { state: 'error'; message: string }
  | { state: 'not_found' }
  | {
      state: 'merchant_profile';
      profileId: string;
      /** Identity confidence grade — who the person is, NOT how risky. */
      confidenceGrade: ConfidenceGrade | null;
      profileUrl: string | null;
      /** Rich stats for the comparison table. null when the profile fetch failed. */
      stats: WidgetStats | null;
    }
  | {
      /** Customer is in the network but not (yet) known at this store. */
      state: 'network_match';
      confidenceGrade: ConfidenceGrade;
      matchedOn: string[];
      claimsRecord: WidgetClaimsRecord;
      ce3EvidenceAvailable: boolean;
      merchantProfile: MerchantProfileSummary | null;
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

/** Normalise a stored grade string to a ConfidenceGrade, or null. */
function toConfidenceGrade(value: unknown): ConfidenceGrade | null {
  if (value === 'definite' || value === 'probable' || value === 'possible' || value === 'weak') {
    return value;
  }
  return null;
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
    confidenceGrade: toConfidenceGrade(profile.identity_confidence_grade),
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
        confidenceGrade: toConfidenceGrade(merchantCustomer.identity_confidence_grade),
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
    const crossMerchant = body.claims_record.cross_merchant;
    const hasClaims = body.claims_record.refunds + body.claims_record.chargebacks > 0;

    // No cross-merchant footprint and no claims on record → resolve as the
    // merchant's own clean customer (green "no prior claims" confirmation).
    if (!crossMerchant && !hasClaims) {
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
        state: 'network_match',
        confidenceGrade: body.confidence,
        matchedOn: body.matched_on,
        claimsRecord: body.claims_record,
        ce3EvidenceAvailable: body.ce3_evidence_available,
        merchantProfile,
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

/** Plain-English label for an identity confidence grade (DEFINITE/PROBABLE/…). */
export function gradeHeadline(grade: ConfidenceGrade | null): string {
  switch (grade) {
    case 'definite': return 'DEFINITE';
    case 'probable': return 'PROBABLE';
    case 'possible': return 'POSSIBLE';
    case 'weak': return 'WEAK';
    default: return 'NO MATCH';
  }
}

// ===========================================================================
// Claim-intelligence widget data layer
//
// Sources the rendered widget from the claim-intelligence tables:
//   • thisStore  ← customer_claim_summary (per-merchant rollup)
//   • network    ← the identity-graph engine (v1 lookup + customer_profiles
//                  aggregates surfaced through GorgiasWidgetModel). The v1
//                  lookup remains the cross-merchant detector; customer_profiles
//                  supplies the network order/claim aggregates.
//   • primaryReason ← support_case_intake.claim_type across all merchants
//
// No risk score and no "fraud" wording is emitted from this layer (see the
// JSON/HTML renderers). claim_events is deliberately NOT queried: it is the
// append-only status-transition log and carries neither customer_email_hash
// nor claim_type.
// ===========================================================================

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  INR: 'Item not received',
  damaged: 'Item arrived damaged',
  wrong_item: 'Wrong item received',
  not_as_described: 'Item not as described',
  other: 'Other',
};

export type PrimaryReason =
  | { type: 'dominant'; label: string; percentage: number }
  | { type: 'varied'; reasonCount: number }
  | null;

export type ThisStoreOrdersSource =
  | 'customer_claim_summary'
  | 'audit_transactions'
  | 'shopify_identities'
  | 'merchant_profile_totals'
  | 'none';

export type ThisStoreStats = {
  orderCount: number;
  claimCount: number;
  /** 0–1, rounded to 2dp. */
  claimRate: number;
  lastClaimAt: string | null;
  ordersCountSource: ThisStoreOrdersSource;
};

export type NetworkStats = {
  merchantCount: number;
  orderCount: number;
  claimCount: number;
  /** 0–1, rounded to 2dp. 0 when the order denominator is unknown. */
  claimRate: number;
  lastClaimAt: string | null;
  primaryReason: PrimaryReason;
  recentClaimCount: number;
  recentWindowDays: 90;
};

export type ClaimWidgetData = {
  /** Identity confidence grade — the PRIMARY element. Who the person is. */
  confidenceGrade: ConfidenceGrade | null;
  /** Factual identifiers this match was established on, e.g. "email address". */
  matchedOn: string[];
  /** True when documented cross-merchant prior-transaction history exists. */
  ce3EvidenceAvailable: boolean;
  thisStore: ThisStoreStats;
  network: NetworkStats | null;
  /** Total refund value of this store's own claims (own data; null if none). */
  storeClaimValue: number | null;
  /** Store-scoped primary reason when there is no network footprint. */
  storePrimaryReason: PrimaryReason;
  storeRecentClaimCount: number;
  profileUrl: string;
  dataFreshAt: string;
  watchlisted: boolean;
};

export type GorgiasClaimWidgetResult =
  | { ok: true; data: ClaimWidgetData }
  | {
      ok: false;
      kind: 'error' | 'not_found' | 'identity_unresolved';
      message?: string;
    };

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Total refund value of THIS merchant's own claims for the customer, from
 * order_claim_context joined to support_case_intake. Store-scoped (own data)
 * only — never aggregated across the network.
 */
async function sumStoreClaimAmount(
  service: SupabaseClient,
  merchantId: string,
  emailHash: string
): Promise<number | null> {
  const { data, error } = await service
    .from('order_claim_context')
    .select(
      'refund_amount_approved, refund_amount_requested, order_value, support_case_intake!inner(customer_email_hash, merchant_id, is_claim, requires_merchant_review)'
    )
    .eq('merchant_id', merchantId)
    .eq('support_case_intake.customer_email_hash', emailHash)
    .eq('support_case_intake.is_claim', true)
    .eq('support_case_intake.requires_merchant_review', false);

  if (error || !Array.isArray(data) || data.length === 0) return null;

  let total = 0;
  let has = false;
  for (const row of data as Array<{
    refund_amount_approved?: number | null;
    refund_amount_requested?: number | null;
    order_value?: number | null;
  }>) {
    const amt = row.refund_amount_approved ?? row.refund_amount_requested ?? row.order_value ?? null;
    if (amt != null) {
      total += Number(amt);
      has = true;
    }
  }
  return has ? Math.round(total) : null;
}

/** customer_claim_summary row shape we read (subset). */
type ClaimSummaryRow = {
  total_orders: number;
  total_claims: number;
  claim_rate: number;
  last_claim_at: string | null;
  updated_at: string | null;
};

/** Count Shopify order rows linked to this email at the merchant's connected shop(s). */
export async function countShopifyOrdersAtMerchant(
  service: SupabaseClient,
  merchantId: string,
  normEmail: string
): Promise<number> {
  const { data: connections, error } = await service
    .from('merchant_shopify_connections' as never)
    .select('shop_domain')
    .eq('merchant_id', merchantId)
    .eq('active', true);

  if (error || !connections?.length) return 0;

  const directEmailOrderIds = new Set<string>();
  const directEmailCustomerIdsByShop = new Map<string, Set<string>>();
  const countSignalRowsForCustomerIds = async (customerIdsByShop: Map<string, Set<string>>) => {
    const orderIds = new Set<string>();
    for (const [shopDomain, customerIds] of customerIdsByShop.entries()) {
      const ids = [...customerIds];
      if (!ids.length) continue;
      const { data: signalRows } = await service
        .from('shopify_order_signals' as never)
        .select('shopify_order_id, order_number')
        .eq('shop_domain', shopDomain)
        .in('customer_id', ids);

      for (const signal of (signalRows ?? []) as Array<{
        shopify_order_id?: string | number | null;
        order_number?: string | number | null;
      }>) {
        const orderNumber = signal.order_number == null ? null : String(signal.order_number).trim();
        if (orderNumber && !/^\d+$/.test(orderNumber)) continue;
        if (signal.shopify_order_id != null) {
          orderIds.add(`${shopDomain}:${String(signal.shopify_order_id)}`);
        }
      }
    }
    return orderIds;
  };

  for (const row of connections as Array<{ shop_domain: string }>) {
    const shopDomain = row.shop_domain?.trim();
    if (!shopDomain) continue;

    const { data: identityRows } = await service
      .from('merchant_identities' as never)
      .select('source_id, customer_id')
      .eq('shop_domain', shopDomain)
      .eq('source', 'order')
      .eq('email', normEmail);

    for (const identity of (identityRows ?? []) as Array<{
      source_id?: string | number | null;
      customer_id?: string | number | null;
    }>) {
      if (identity.source_id != null) {
        directEmailOrderIds.add(`${shopDomain}:${String(identity.source_id)}`);
      }
      if (identity.customer_id != null) {
        const customerIds = directEmailCustomerIdsByShop.get(shopDomain) ?? new Set<string>();
        customerIds.add(String(identity.customer_id));
        directEmailCustomerIdsByShop.set(shopDomain, customerIds);
      }
    }
  }

  const directEmailSignalOrderIds = await countSignalRowsForCustomerIds(directEmailCustomerIdsByShop);

  const { data: emailIdentityRows } = await service
    .from(TABLES.CUSTOMER_PROFILE_IDENTITIES)
    .select('customer_profile_id')
    .eq('merchant_id', merchantId)
    .eq('identity_type', 'email')
    .eq('identity_value', normEmail);

  const profileIds = Array.from(
    new Set(
      ((emailIdentityRows ?? []) as Array<{ customer_profile_id?: string | null }>)
        .map((row) => row.customer_profile_id?.trim())
        .filter((id): id is string => Boolean(id))
    )
  );

  const profileCustomerIdsByShop = new Map<string, Set<string>>();
  if (profileIds.length > 0) {
    const { data: customerIdentityRows } = await service
      .from(TABLES.CUSTOMER_PROFILE_IDENTITIES)
      .select('identity_value')
      .eq('merchant_id', merchantId)
      .eq('identity_type', 'shopify_customer_id')
      .in('customer_profile_id', profileIds);

    const profileCustomerIds = Array.from(
      new Set(
        ((customerIdentityRows ?? []) as Array<{ identity_value?: string | null }>)
          .map((row) => row.identity_value?.trim())
          .filter((id): id is string => Boolean(id))
      )
    );
    if (profileCustomerIds.length > 0) {
      for (const row of connections as Array<{ shop_domain: string }>) {
        const shopDomain = row.shop_domain?.trim();
        if (shopDomain) profileCustomerIdsByShop.set(shopDomain, new Set(profileCustomerIds));
      }
    }
  }

  const profileSignalOrderIds = await countSignalRowsForCustomerIds(profileCustomerIdsByShop);
  const signalOrderCount = Math.max(directEmailSignalOrderIds.size, profileSignalOrderIds.size);
  return signalOrderCount > 0 ? signalOrderCount : directEmailOrderIds.size;
}

export async function readThisStoreSummary(
  service: SupabaseClient,
  merchantId: string,
  emailHash: string
): Promise<ClaimSummaryRow | null> {
  const { data, error } = await service
    .from(TABLES.CUSTOMER_CLAIM_SUMMARY)
    .select('total_orders, total_claims, claim_rate, last_claim_at, updated_at')
    .eq('merchant_id', merchantId)
    .eq('customer_email_hash', emailHash)
    .maybeSingle();

  if (error || !data) return null;

  const { data: confirmedClaims, error: confirmedError } = await service
    .from(TABLES.SUPPORT_CASE_INTAKE)
    .select('created_at_provider, updated_at_provider')
    .eq('merchant_id', merchantId)
    .eq('customer_email_hash', emailHash)
    .eq('is_claim', true)
    .eq('requires_merchant_review', false);

  if (confirmedError || !Array.isArray(confirmedClaims)) {
    return {
      total_orders: Number(data.total_orders ?? 0),
      total_claims: Number(data.total_claims ?? 0),
      claim_rate: Number(data.claim_rate ?? 0),
      last_claim_at: typeof data.last_claim_at === 'string' ? data.last_claim_at : null,
      updated_at: typeof data.updated_at === 'string' ? data.updated_at : null,
    };
  }

  const confirmedClaimCount = confirmedClaims.length;
  const totalOrders = Math.max(Number(data.total_orders ?? 0), confirmedClaimCount);
  const lastConfirmedClaimAt = confirmedClaims
    .map((row: Record<string, unknown>) => {
      const createdAt = typeof row.created_at_provider === 'string' ? row.created_at_provider : null;
      const updatedAt = typeof row.updated_at_provider === 'string' ? row.updated_at_provider : null;
      return createdAt ?? updatedAt;
    })
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;

  return {
    total_orders: totalOrders,
    total_claims: confirmedClaimCount,
    claim_rate: totalOrders > 0 ? round2(confirmedClaimCount / totalOrders) : 0,
    last_claim_at: lastConfirmedClaimAt,
    updated_at: typeof data.updated_at === 'string' ? data.updated_at : null,
  };
}

/**
 * Network-wide adaptive primary reason, computed from claim_type counts across
 * ALL merchants for this identity in support_case_intake (is_claim = true).
 */
export async function derivePrimaryReasonAtMerchant(
  service: SupabaseClient,
  merchantId: string,
  emailHash: string
): Promise<PrimaryReason> {
  const { data, error } = await service
    .from(TABLES.SUPPORT_CASE_INTAKE)
    .select('claim_type')
    .eq('merchant_id', merchantId)
    .eq('customer_email_hash', emailHash)
    .eq('is_claim', true)
    .eq('requires_merchant_review', false);

  if (error || !data) return null;

  const types = (data as Array<{ claim_type: unknown }>)
    .map((r) => (typeof r.claim_type === 'string' ? r.claim_type : null))
    .filter((t): t is ClaimType => t !== null && t in CLAIM_TYPE_LABELS);

  return derivePrimaryReasonFromTypes(types);
}

export async function countStoreRecentClaims(
  service: SupabaseClient,
  merchantId: string,
  emailHash: string
): Promise<number> {
  const cutoff = ninetyDayCutoff();
  // support_case_intake has no `created_at` column — the claim timestamp is
  // created_at_provider. Filtering on the missing column errored and silently
  // returned 0, so "recent 90 days" was always 0.
  const { count, error } = await service
    .from(TABLES.SUPPORT_CASE_INTAKE)
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)
    .eq('customer_email_hash', emailHash)
    .eq('is_claim', true)
    .eq('requires_merchant_review', false)
    .gte('created_at_provider', cutoff);

  if (error || typeof count !== 'number') return 0;
  return count;
}

export async function derivePrimaryReason(
  service: SupabaseClient,
  emailHash: string
): Promise<PrimaryReason> {
  const { data, error } = await service
    .from(TABLES.SUPPORT_CASE_INTAKE)
    .select('claim_type')
    .eq('customer_email_hash', emailHash)
    .eq('is_claim', true)
    .eq('requires_merchant_review', false);

  if (error || !data) return null;

  const types = (data as Array<{ claim_type: unknown }>)
    .map((r) => (typeof r.claim_type === 'string' ? r.claim_type : null))
    .filter((t): t is ClaimType => t !== null && t in CLAIM_TYPE_LABELS);

  return derivePrimaryReasonFromTypes(types);
}

/** Pure: adaptive primary-reason from a list of claim types. */
export function derivePrimaryReasonFromTypes(types: ClaimType[]): PrimaryReason {
  if (types.length === 0) return null;

  const counts = new Map<ClaimType, number>();
  for (const t of types) counts.set(t, (counts.get(t) ?? 0) + 1);

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [topType, topCount] = sorted[0];

  if (topCount / types.length > 0.5) {
    return {
      type: 'dominant',
      label: CLAIM_TYPE_LABELS[topType],
      percentage: Math.round((topCount / types.length) * 100),
    };
  }
  return { type: 'varied', reasonCount: counts.size };
}

/**
 * Pure transform: assemble the claim-intelligence widget data from the gathered
 * model, the per-store summary row, and the network primary reason.
 */
function thisStoreFromSummaryRow(summary: ClaimSummaryRow): ThisStoreStats {
  return {
    orderCount: summary.total_orders,
    claimCount: summary.total_claims,
    claimRate: round2(summary.claim_rate),
    lastClaimAt: summary.last_claim_at,
    ordersCountSource: 'customer_claim_summary',
  };
}

function thisStoreFromSummaryWithShopifyOrderCount(
  summary: ClaimSummaryRow,
  orderCount: number
): ThisStoreStats {
  return {
    orderCount,
    claimCount: summary.total_claims,
    claimRate: orderCount > 0 ? round2(summary.total_claims / orderCount) : 0,
    lastClaimAt: summary.last_claim_at,
    ordersCountSource: 'shopify_identities',
  };
}

function thisStoreFromWidgetStats(stats: WidgetStats): ThisStoreStats {
  const storeOrders = stats.storeOrders;
  const storeClaims = stats.storeClaims;
  return {
    orderCount: storeOrders,
    claimCount: storeClaims,
    claimRate: storeOrders > 0 ? round2(storeClaims / storeOrders) : 0,
    lastClaimAt: null,
    ordersCountSource: 'audit_transactions',
  };
}

function thisStoreFromShopifyOrderCount(orderCount: number): ThisStoreStats {
  return {
    orderCount,
    claimCount: 0,
    claimRate: 0,
    lastClaimAt: null,
    ordersCountSource: 'shopify_identities',
  };
}

function resolveThisStoreStats(input: {
  model: GorgiasWidgetModel;
  summary: ClaimSummaryRow | null;
  shopifyOrderCount: number;
}): ThisStoreStats {
  if (input.summary) {
    if (input.shopifyOrderCount > input.summary.total_orders) {
      return thisStoreFromSummaryWithShopifyOrderCount(input.summary, input.shopifyOrderCount);
    }
    return thisStoreFromSummaryRow(input.summary);
  }

  // Ticket-email Shopify rows match what the agent sees in the Gorgias Shopify panel.
  if (input.shopifyOrderCount > 0) {
    return thisStoreFromShopifyOrderCount(input.shopifyOrderCount);
  }

  if (input.model.state === 'merchant_profile' && input.model.stats) {
    return thisStoreFromWidgetStats(input.model.stats);
  }

  if (input.model.state === 'low_clear') {
    const profile = input.model.merchantProfile;
    const orderCount = profile.totalOrders;
    const claimCount = profile.totalRefunds;
    return {
      orderCount,
      claimCount,
      claimRate: orderCount > 0 ? round2(claimCount / orderCount) : 0,
      lastClaimAt: null,
      ordersCountSource: 'merchant_profile_totals',
    };
  }

  return {
    orderCount: 0,
    claimCount: 0,
    claimRate: 0,
    lastClaimAt: null,
    ordersCountSource: 'none',
  };
}

export function assembleClaimWidgetData(input: {
  model: GorgiasWidgetModel;
  summary: ClaimSummaryRow | null;
  primaryReason: PrimaryReason;
  storePrimaryReason: PrimaryReason;
  storeRecentClaimCount: number;
  profileUrl: string | null;
  nowIso: string;
  shopifyOrderCount?: number;
  storeClaimValue?: number | null;
  watchlisted?: boolean;
}): GorgiasClaimWidgetResult {
  const { model, summary, primaryReason, storePrimaryReason } = input;

  if (model.state === 'error') {
    return { ok: false, kind: 'error', message: model.message };
  }

  const thisStore = resolveThisStoreStats({
    model,
    summary,
    shopifyOrderCount: input.shopifyOrderCount ?? 0,
  });

  const hasKnownCommerce =
    thisStore.ordersCountSource !== 'none' ||
    thisStore.orderCount > 0 ||
    thisStore.claimCount > 0 ||
    Boolean(summary);

  if (model.state === 'not_found' && !hasKnownCommerce) {
    return { ok: false, kind: 'not_found' };
  }

  const network = deriveNetworkStats(model, primaryReason);
  const profileUrl =
    input.profileUrl ?? ('profileUrl' in model ? (model.profileUrl ?? '') : '') ?? '';

  // Identity confidence grade — independent of any claim history.
  let confidenceGrade: ConfidenceGrade | null = null;
  let matchedOn: string[] = [];
  if (model.state === 'merchant_profile') confidenceGrade = model.confidenceGrade;
  else if (model.state === 'network_match') { confidenceGrade = model.confidenceGrade; matchedOn = model.matchedOn; }
  else if (model.state === 'low_clear') confidenceGrade = model.merchantProfile.confidenceGrade;

  const ce3EvidenceAvailable =
    model.state === 'network_match'
      ? model.ce3EvidenceAvailable
      : Boolean(network && network.claimCount > 0 && network.merchantCount > 1);

  return {
    ok: true,
    data: {
      confidenceGrade,
      matchedOn,
      ce3EvidenceAvailable,
      thisStore,
      network,
      storeClaimValue: input.storeClaimValue ?? null,
      storePrimaryReason,
      storeRecentClaimCount: input.storeRecentClaimCount,
      profileUrl: profileUrl || '',
      dataFreshAt: summary?.updated_at ?? input.nowIso,
      watchlisted: input.watchlisted ?? false,
    },
  };
}

function deriveNetworkStats(
  model: GorgiasWidgetModel,
  primaryReason: PrimaryReason
): NetworkStats | null {
  if (model.state === 'merchant_profile') {
    const s = model.stats;
    // No cross-merchant footprint → no network history.
    if (!s || s.networkMerchants <= 1) return null;
    return {
      merchantCount: s.networkMerchants,
      orderCount: s.networkOrders,
      claimCount: s.networkClaims,
      claimRate: s.networkOrders > 0 ? round2(s.networkClaims / s.networkOrders) : 0,
      lastClaimAt: null,
      primaryReason,
      recentClaimCount: s.networkRecentClaims,
      recentWindowDays: 90,
    };
  }

  if (model.state === 'network_match' && model.claimsRecord.cross_merchant) {
    const cm = model.claimsRecord.cross_merchant;
    return {
      merchantCount: cm.merchant_count,
      orderCount: 0, // network order denominator not exposed by the lookup
      claimCount: cm.claim_count,
      claimRate: 0,
      lastClaimAt: null,
      primaryReason,
      recentClaimCount: 0,
      recentWindowDays: 90,
    };
  }

  // low_clear / risk-without-cross-merchant → no network history.
  return null;
}

/**
 * Build the claim-intelligence widget data. Reuses buildGorgiasWidgetModel as
 * the network-engine gatherer (v1 lookup + profile resolution + signed profile
 * URL), then assembles the claim-intelligence shape with thisStore from
 * customer_claim_summary and the network primary reason from support_case_intake.
 */
export async function buildGorgiasClaimWidgetData(
  service: SupabaseClient,
  auth: LookupAuth,
  params: { rawEmail: string; rawName: string; orderId: string }
): Promise<{ result: GorgiasClaimWidgetResult; lookupDiagnostics: MerchantCustomerLookupDiagnostics | null }> {
  const { model, lookupDiagnostics } = await buildGorgiasWidgetModel(service, auth, params);

  const normEmail = normaliseEmail(params.rawEmail.trim());
  let emailHash: string | null = null;
  if (normEmail) {
    try {
      emailHash = hashSupportEmail(normEmail);
    } catch {
      emailHash = null;
    }
  }

  const shopifyOrderCountPromise = normEmail
    ? countShopifyOrdersAtMerchant(service, auth.merchantId, normEmail)
    : Promise.resolve(0);

  const [summary, primaryReason, storePrimaryReason, storeRecentClaimCount, shopifyOrderCount, storeClaimValue] =
    emailHash
      ? await Promise.all([
          readThisStoreSummary(service, auth.merchantId, emailHash),
          derivePrimaryReason(service, emailHash),
          derivePrimaryReasonAtMerchant(service, auth.merchantId, emailHash),
          countStoreRecentClaims(service, auth.merchantId, emailHash),
          shopifyOrderCountPromise,
          sumStoreClaimAmount(service, auth.merchantId, emailHash),
        ])
      : [null, null, null, 0, await shopifyOrderCountPromise, null];

  const profileUrl = 'profileUrl' in model ? (model.profileUrl ?? null) : null;

  // Check if this customer is on the merchant's watchlist
  let watchlisted = false;
  const resolvedProfileId =
    model.state === 'merchant_profile' ? model.profileId :
    model.state === 'network_match' ? (model as { profileId?: string | null }).profileId ?? null :
    model.state === 'low_clear' ? (model as { profileId?: string | null }).profileId ?? null :
    null;

  if (resolvedProfileId) {
    const { data: wlRow } = await service
      .from('watchlist_entries')
      .select('id')
      .eq('customer_profile_id', resolvedProfileId)
      .eq('merchant_id', auth.merchantId)
      .eq('removed_by_merchant', false)
      .maybeSingle();
    watchlisted = !!wlRow;
  }

  const result = assembleClaimWidgetData({
    model,
    summary,
    primaryReason,
    storePrimaryReason,
    storeRecentClaimCount,
    profileUrl,
    nowIso: new Date().toISOString(),
    shopifyOrderCount,
    storeClaimValue: typeof storeClaimValue === 'number' ? storeClaimValue : null,
    watchlisted,
  });

  gorgiasWidgetLog('claim_widget.sources', {
    modelState: model.state,
    hasClaimSummary: Boolean(summary),
    shopifyOrderCount,
    thisStoreOrders: result.ok ? result.data.thisStore.orderCount : null,
    thisStoreClaims: result.ok ? result.data.thisStore.claimCount : null,
    ordersCountSource: result.ok ? result.data.thisStore.ordersCountSource : null,
    hasNetwork: result.ok ? result.data.network !== null : false,
    storeOrdersFromStats:
      model.state === 'merchant_profile' && model.stats ? model.stats.storeOrders : null,
  });

  return { result, lookupDiagnostics };
}
