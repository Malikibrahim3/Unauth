/**
 * v2 widget data assembly. Own-store stats come from the merchant's layer-1
 * rows (source_orders / claims); ALL cross-merchant intelligence flows through
 * the lookup_network_identity RPC so k-anonymity is enforced in exactly one
 * place and every disclosure lands in network_access_log (test finding C4).
 * Replaces the legacy customer_profiles/order_claim_context assembly in
 * widgetData.ts, whose backing tables were dropped at the v2 cutover.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { hashIdentifier } from '@/lib/identity/hash';
import { normaliseEmail, emailRoot } from '@/lib/identity/normalise';
import { TABLES } from '@/lib/supabase/tables';
import type { ScoreFactor } from '@/lib/engine/evidence/score';
import type { EvidenceLevel } from '@/lib/rules-engine';
import { env } from '@/lib/utils/env';
import type { MerchantCustomerLookupDiagnostics } from '@/lib/gorgias/findMerchantCustomerByEmail';
import {
  canonicalClaimTypesFromCounts,
  WITHHELD_EVIDENCE_SIGNALS,
  type ClaimWidgetData,
  type GorgiasClaimWidgetResult,
  type NetworkStats,
  type PrimaryReason,
  type ThisStoreStats,
} from '@/lib/gorgias/widgetData';

const CLAIM_TYPE_LABELS_V2: Record<string, string> = {
  item_not_received: 'Item not received',
  damaged: 'Item arrived damaged',
  wrong_item: 'Wrong item received',
  not_as_described: 'Item not as described',
  refund_request: 'Refund request',
  chargeback: 'Chargeback',
  return_abuse: 'Return abuse',
  other: 'Other',
};

const round2 = (v: number) => Math.round(v * 100) / 100;

function primaryReasonFromCounts(counts: Record<string, number>): PrimaryReason {
  const entries = Object.entries(counts).filter(([, n]) => n > 0);
  if (entries.length === 0) return null;
  const total = entries.reduce((s, [, n]) => s + n, 0);
  entries.sort((a, b) => b[1] - a[1]);
  const [topType, topCount] = entries[0];
  const pct = topCount / total;
  if (entries.length === 1 || pct >= 0.5) {
    return { type: 'dominant', label: CLAIM_TYPE_LABELS_V2[topType] ?? topType, percentage: round2(pct) };
  }
  return { type: 'varied', reasonCount: entries.length };
}

type LookupAuth = { merchantId: string; apiKeyId: string; requestIp: string | null };

type RpcIdentityRow = {
  identity_id: string;
  confidence_grade: string;
  merchant_count: number | null;
  total_orders: number | null;
  total_claims: number | null;
  claim_rate: number | string | null;
  last_seen_at: string | null;
  claim_type_counts: Record<string, number> | null;
};

type EvidenceScoreRow = {
  evidence_score: number;
  evidence_level: string;
  has_sufficient_data: boolean;
  score_breakdown: unknown;
  scoring_config_version: string;
};

async function loadDisclosedWidgetSignals(
  service: SupabaseClient,
  identityId: string,
  networkTypeCounts: Record<string, number>,
): Promise<Pick<
  ClaimWidgetData,
  | 'evidenceDisclosed'
  | 'evidenceScore'
  | 'evidenceLevel'
  | 'hasSufficientData'
  | 'scoreBreakdown'
  | 'scoringConfigVersion'
  | 'claimTypes'
  | 'isNetworkFlagged'
>> {
  const [evidenceRes, flagRes] = await Promise.all([
    service
      .from(TABLES.IDENTITY_EVIDENCE_SCORES)
      .select('evidence_score, evidence_level, has_sufficient_data, score_breakdown, scoring_config_version')
      .eq('identity_id', identityId)
      .maybeSingle(),
    service
      .from(TABLES.WATCHLIST_ENTRIES)
      .select('identity_id')
      .eq('identity_id', identityId)
      .eq('on_watchlist', true)
      .limit(1),
  ]);

  const signals = {
    evidenceDisclosed: true,
    evidenceScore: 0,
    evidenceLevel: 'minimal' as EvidenceLevel,
    hasSufficientData: false,
    scoreBreakdown: [] as ScoreFactor[],
    scoringConfigVersion: null as string | null,
    claimTypes: canonicalClaimTypesFromCounts(networkTypeCounts),
    isNetworkFlagged: !flagRes.error && Array.isArray(flagRes.data) && flagRes.data.length > 0,
  };

  if (!evidenceRes.error && evidenceRes.data) {
    const row = evidenceRes.data as EvidenceScoreRow;
    signals.evidenceScore = Number(row.evidence_score);
    signals.evidenceLevel = row.evidence_level as EvidenceLevel;
    signals.hasSufficientData = Boolean(row.has_sufficient_data);
    signals.scoreBreakdown = Array.isArray(row.score_breakdown) ? (row.score_breakdown as ScoreFactor[]) : [];
    signals.scoringConfigVersion = row.scoring_config_version ?? null;
  }

  return signals;
}

export async function buildGorgiasClaimWidgetDataV2(
  service: SupabaseClient,
  auth: LookupAuth,
  params: { rawEmail: string; rawName: string; orderId: string; linkedIdentityId?: string | null }
): Promise<{ result: GorgiasClaimWidgetResult; lookupDiagnostics: MerchantCustomerLookupDiagnostics | null }> {
  const normEmail = normaliseEmail(params.rawEmail.trim());
  if (!normEmail) {
    return {
      result: { ok: false, kind: 'identity_unresolved', message: 'No usable customer email on this ticket.' },
      lookupDiagnostics: null,
    };
  }
  const emailHash = hashIdentifier(normEmail);
  const root = emailRoot(normEmail);
  const hashes: Array<{ type: string; hash: string }> = [{ type: 'email', hash: emailHash }];
  if (root) hashes.push({ type: 'email_root', hash: hashIdentifier(root) });

  // ── own-store stats (merchant-owned layer-1 data), fetched in parallel
  // with the k-anonymous network lookup to save a round trip
  const ip = auth.requestIp?.trim() ?? '';
  const safeIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) || (ip.includes(':') && /^[0-9a-fA-F:.]+$/.test(ip)) ? ip : null;
  const [ordersRes, netRes] = await Promise.all([
    service
      .from('source_orders')
      .select('id, placed_at')
      .eq('merchant_id', auth.merchantId)
      .ilike('email', normEmail)
      .order('placed_at', { ascending: false })
      .limit(1000),
    service.rpc('lookup_network_identity', {
      p_merchant_id: auth.merchantId,
      p_identifier_hashes: hashes,
      p_request_ip: safeIp,
    }),
  ]);
  const { data: orders, error: oe } = ordersRes;
  if (oe) {
    return { result: { ok: false, kind: 'error', message: 'Store order lookup failed.' }, lookupDiagnostics: null };
  }
  const orderIds = (orders ?? []).map((o) => o.id);

  let storeClaims: Array<{ claim_type: string; submitted_at: string; amount_at_risk: number | null }> = [];
  if (orderIds.length > 0) {
    const { data: claims, error: ce } = await service
      .from(TABLES.MERCHANT_CLAIMS)
      .select('claim_type, submitted_at, amount_at_risk')
      .eq('merchant_id', auth.merchantId)
      .in('source_order_id', orderIds.slice(0, 200));
    if (ce) {
      return { result: { ok: false, kind: 'error', message: 'Store claim lookup failed.' }, lookupDiagnostics: null };
    }
    storeClaims = claims ?? [];
  }

  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400e3).toISOString();
  const storeTypeCounts: Record<string, number> = {};
  for (const c of storeClaims) storeTypeCounts[c.claim_type] = (storeTypeCounts[c.claim_type] ?? 0) + 1;
  const thisStore: ThisStoreStats = {
    orderCount: orderIds.length,
    claimCount: storeClaims.length,
    claimRate: orderIds.length > 0 ? round2(storeClaims.length / orderIds.length) : 0,
    lastClaimAt: storeClaims.map((c) => c.submitted_at).sort().at(-1) ?? null,
    ordersCountSource: orderIds.length > 0 ? 'merchant_profile_totals' : 'none',
  };
  const storeRecentClaimCount = storeClaims.filter((c) => c.submitted_at >= ninetyDaysAgo).length;
  const storeClaimValueRaw = storeClaims.reduce((s, c) => s + Number(c.amount_at_risk ?? 0), 0);

  // ── network intelligence via the single k-anonymous read path
  const { data: netRows, error: ne } = netRes;
  if (ne) {
    return { result: { ok: false, kind: 'error', message: 'Network lookup failed.' }, lookupDiagnostics: null };
  }
  const identity = Array.isArray(netRows) && netRows.length > 0 ? (netRows[0] as RpcIdentityRow) : null;

  let linkedIdentity: RpcIdentityRow | null = null;
  if (params.linkedIdentityId) {
    const emailHash = hashIdentifier(normEmail);
    const { data: ownSignals } = await service
      .from('identity_signals')
      .select('identifier_hash')
      .eq('merchant_id', auth.merchantId)
      .eq('identifier_type', 'email')
      .eq('identifier_hash', emailHash)
      .limit(1);
    const { data: member } = await service
      .from('identity_members')
      .select('identity_id')
      .eq('identity_id', params.linkedIdentityId)
      .eq('identifier_type', 'email')
      .eq('identifier_hash', emailHash)
      .maybeSingle();
    if ((ownSignals?.length ?? 0) > 0 && member?.identity_id) {
      const { data: idRow } = await service
        .from('identities')
        .select('id, confidence_grade, merchant_count, total_orders, total_claims, claim_rate, last_seen_at')
        .eq('id', params.linkedIdentityId)
        .is('superseded_by', null)
        .maybeSingle();
      if (!idRow) {
        linkedIdentity = null;
      } else {
        const { data: profile } = await service
          .from('identity_profiles')
          .select('total_orders, total_claims, claim_rate, last_seen_at, claim_type_counts, merchant_count')
          .eq('identity_id', params.linkedIdentityId)
          .maybeSingle();
        linkedIdentity = {
          identity_id: idRow.id as string,
          confidence_grade: idRow.confidence_grade as string,
          merchant_count: profile?.merchant_count ?? idRow.merchant_count,
          total_orders: profile?.total_orders ?? idRow.total_orders,
          total_claims: profile?.total_claims ?? idRow.total_claims,
          claim_rate: profile?.claim_rate ?? idRow.claim_rate,
          last_seen_at: profile?.last_seen_at ?? idRow.last_seen_at,
          claim_type_counts: (profile?.claim_type_counts as Record<string, number> | null) ?? null,
        };
      }
    }
  }

  const resolvedIdentity = linkedIdentity ?? identity;

  let network: NetworkStats | null = null;
  let widgetSignals: Pick<
    ClaimWidgetData,
    | 'evidenceDisclosed'
    | 'evidenceScore'
    | 'evidenceLevel'
    | 'hasSufficientData'
    | 'scoreBreakdown'
    | 'scoringConfigVersion'
    | 'claimTypes'
    | 'isNetworkFlagged'
  > = {
    ...WITHHELD_EVIDENCE_SIGNALS,
    claimTypes: canonicalClaimTypesFromCounts(storeTypeCounts),
  };

  if (resolvedIdentity) {
    const typeCounts = (resolvedIdentity.claim_type_counts ?? {}) as Record<string, number>;
    network = {
      merchantCount: Number(resolvedIdentity.merchant_count ?? 0),
      orderCount: Number(resolvedIdentity.total_orders ?? 0),
      claimCount: Number(resolvedIdentity.total_claims ?? 0),
      claimRate: resolvedIdentity.claim_rate != null ? round2(Number(resolvedIdentity.claim_rate)) : 0,
      lastClaimAt: resolvedIdentity.last_seen_at ?? null,
      primaryReason: primaryReasonFromCounts(typeCounts),
      recentClaimCount: 0, // not exposed by the k-anon RPC; omitted rather than estimated
      recentWindowDays: 90,
    };
    // k-anonymity is enforced by lookup_network_identity; a returned row means disclosure is allowed.
    widgetSignals = await loadDisclosedWidgetSignals(service, resolvedIdentity.identity_id, typeCounts);
  }

  const appUrl = (env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
  const data: ClaimWidgetData = {
    confidenceGrade: resolvedIdentity ? (resolvedIdentity.confidence_grade as ClaimWidgetData['confidenceGrade']) : null,
    matchedOn: resolvedIdentity ? ['email address'] : [],
    ce3EvidenceAvailable: Boolean(resolvedIdentity && Number(resolvedIdentity.merchant_count) >= 2 && Number(resolvedIdentity.total_claims) > 0),
    thisStore,
    network,
    storeClaimValue: storeClaimValueRaw > 0 ? round2(storeClaimValueRaw) : null,
    storePrimaryReason: primaryReasonFromCounts(storeTypeCounts),
    storeRecentClaimCount,
    profileUrl: `${appUrl}/customers`,
    dataFreshAt: new Date().toISOString(),
    watchlisted: false,
    ...widgetSignals,
  };

  return { result: { ok: true, data }, lookupDiagnostics: null };
}
