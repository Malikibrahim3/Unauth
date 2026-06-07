// TODO(product-gating): require CUSTOMER_DOSSIER entitlement when ENFORCE_PRODUCT_GATES is enabled.
import { notFound, redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import {
  fetchMerchantScopedCustomerProfile,
  fetchMerchantScopedCustomerTransactions,
  getMerchantOwnedJobIds,
  TX_SAFE_SELECT,
} from '@/lib/supabase/merchantHelpers';
import { buildBehavioralNarrative } from '@/lib/customers/narrative';
import {
  countShopifyCommerceOrdersForProfile,
  deriveCanonicalCommerceOrderStats,
} from '@/lib/customers/commerceOrders';
import { deriveProfileIdentityConfidence } from '@/lib/customers/identityConfidence';
import type { ConfidenceGradeValue } from '@/lib/confidence';
import type { CustomerIntelligencePanel } from '@/app/api/customers/[id]/route';
import { ACTIVE_CLAIM_STATUSES } from '@/lib/claims/sla';
import { parseAndVerifySignedToken, hashSignedToken } from '@/lib/api/signedAccess';
import { getConnectionState } from '@/lib/connections/getConnectionState';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import {
  CLAIM_TYPE_LABELS,
  firstArrayValue,
  type RoadmapTransaction,
} from '@/app/(app)/customers/[id]/customerProfilePageLabels';
import { getEventStream } from '@/lib/analysis/customerIntelligence';
import type { BehaviorRoadmapEvent } from '@/components/customers/BehaviorRoadmap';

const TX_SELECT = TX_SAFE_SELECT;

export type CustomerProfileSearchParams = {
  audit?: string;
  view_token?: string;
  buildEvidence?: string;
  disputedOrder?: string;
  source?: string;
  ticket_id?: string;
};

export type CustomerProfilePageParams = { id: string };

export type CustomerProfileBlockedReason = 'link_expired' | 'access_denied';

type LoadBlockResult = { blocked: true; reason: CustomerProfileBlockedReason };
type LoadSuccessResult = { blocked: false; props: CustomerProfilePageViewProps };

export type CustomerProfileLoadResult = LoadBlockResult | LoadSuccessResult;

export type CustomerProfileDisplay = {
  id: string;
  names: string[];
  emails: string[];
  addresses: string[];
  card_last4s: string[];
  phones: string[];
  ips: string[];
  primary_email: string | null;
  risk_level: string;
  total_orders: number;
  total_refund_claims: number;
  total_chargebacks: number;
  total_merchants_seen_at: number;
  refund_rate: number;
  fastest_claim_days: number | null;
  avg_claim_days: number | null;
  refund_acceleration_score: number;
  first_seen: string;
  last_seen: string;
  fraud_flags: string[];
  identity_signals?: string[];
  investigation_status?: string;
};

export type LinkedAccountRow = {
  entityType: string;
  entityValue: string;
  confidence: number;
};

export type IdentitySignalRow = {
  value: string;
  signalType: string;
  grade: string;
};

export type MerchantSignalPill = {
  merchantLabel: string;
  claimType: string;
};

export type ClaimSummaryRow = {
  id: string;
  claim_type: string;
  status: string;
  shopify_order_id?: string | null;
  order_ref?: string | null;
  submitted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ActivityLogEntry = {
  id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  created_at: string;
};

export type CustomerProfilePageViewProps = {
  connectionState: ConnectionState;
  auditRunId: string | null;
  viewToken: string;
  gorgiasSource: string | null;
  gorgiasTicketId: string | null;
  profile: CustomerProfileDisplay;
  displayName: string;
  profileGrade: ConfidenceGradeValue;
  hasCleanRecord: boolean;
  merchantClaimCount: number;
  merchantOrderCount: number;
  localClaimRatePct: number;
  isEligibleForEvidence: boolean;
  totalOrderValue: number;
  totalRefundedValue: number;
  merchantsSeen: number;
  profileWideOrders: number;
  localOrderSharePct: number;
  networkChargebackRatePct: number;
  thisStoreMerchantSharePct: number;
  density: number[];
  primaryIdentifier: string;
  identitySignalRows: IdentitySignalRow[];
  identitySignals: string[];
  transactions: RoadmapTransaction[];
  roadmapEvents: BehaviorRoadmapEvent[];
  identityTimeline: CustomerIntelligencePanel['identityTimeline'];
  variantCount: number;
  merchantNarrative: string;
  linkedAccounts: LinkedAccountRow[];
  merchantSignalPills: MerchantSignalPill[];
  activityLog: ActivityLogEntry[];
  openClaimCount: number;
  latestClaim: ClaimSummaryRow | null;
  merchantRefundRate: number;
};

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function toCustomerProfileDisplay(row: Record<string, unknown>): CustomerProfileDisplay {
  return {
    id: String(row.id ?? ''),
    names: toStringArray(row.names),
    emails: toStringArray(row.emails),
    addresses: toStringArray(row.addresses),
    card_last4s: toStringArray(row.card_last4s),
    phones: toStringArray(row.phones),
    ips: toStringArray(row.ips),
    primary_email: typeof row.primary_email === 'string' ? row.primary_email : null,
    risk_level: typeof row.risk_level === 'string' ? row.risk_level : 'low',
    total_orders: Number(row.total_orders ?? 0),
    total_refund_claims: Number(row.total_refund_claims ?? 0),
    total_chargebacks: Number(row.total_chargebacks ?? 0),
    total_merchants_seen_at: Number(row.total_merchants_seen_at ?? 1),
    refund_rate: Number(row.refund_rate ?? 0),
    fastest_claim_days: row.fastest_claim_days == null ? null : Number(row.fastest_claim_days),
    avg_claim_days: row.avg_claim_days == null ? null : Number(row.avg_claim_days),
    refund_acceleration_score: Number(row.refund_acceleration_score ?? 0),
    first_seen: String(row.first_seen ?? ''),
    last_seen: String(row.last_seen ?? ''),
    fraud_flags: toStringArray(row.fraud_flags),
    identity_signals: toStringArray(row.identity_signals),
    investigation_status: typeof row.investigation_status === 'string' ? row.investigation_status : undefined,
  };
}

function toRoadmapTransactions(rows: Record<string, unknown>[]): RoadmapTransaction[] {
  return rows.map((tx) => ({
    order_id: String(tx.order_id ?? ''),
    processed_at: String(tx.processed_at ?? ''),
    order_value: typeof tx.order_value === 'number' || typeof tx.order_value === 'string' ? tx.order_value : null,
    customer_email: typeof tx.customer_email === 'string' ? tx.customer_email : null,
    customer_name: typeof tx.customer_name === 'string' ? tx.customer_name : null,
    shipping_address: typeof tx.shipping_address === 'string' ? tx.shipping_address : null,
    card_last4: typeof tx.card_last4 === 'string' ? tx.card_last4 : null,
    device_ip: typeof tx.device_ip === 'string' ? tx.device_ip : null,
    source: typeof tx.source === 'string' ? tx.source : null,
    chargeback_filed: Boolean(tx.chargeback_filed),
    refund_claimed: Boolean(tx.refund_claimed),
    chargeback_date: typeof tx.chargeback_date === 'string' ? tx.chargeback_date : null,
    chargeback_reason_code: typeof tx.chargeback_reason_code === 'string' ? tx.chargeback_reason_code : null,
    refund_reason: typeof tx.refund_reason === 'string' ? tx.refund_reason : null,
    fraud_flags: toStringArray(tx.fraud_flags),
    risk_level: typeof tx.risk_level === 'string' ? tx.risk_level : null,
  }));
}

function buildIdentitySignalRows(profile: CustomerProfileDisplay): IdentitySignalRow[] {
  const rows: IdentitySignalRow[] = [];
  for (const email of profile.emails) {
    if (email && email !== profile.primary_email) {
      rows.push({ value: email, signalType: 'email variant', grade: 'B' });
    }
  }
  const address = firstArrayValue(profile.addresses);
  if (address) rows.push({ value: address, signalType: 'address match', grade: 'B' });
  const phone = firstArrayValue(profile.phones);
  if (phone) rows.push({ value: phone, signalType: 'phone match', grade: 'A' });
  const ip = firstArrayValue(profile.ips);
  if (ip) rows.push({ value: ip, signalType: 'device/ip match', grade: 'C' });
  return rows;
}

export async function loadCustomerProfilePage(
  profileId: string,
  searchParams: CustomerProfileSearchParams,
): Promise<CustomerProfileLoadResult> {
  const viewToken = searchParams.view_token?.trim() ?? '';
  const auditRunId = searchParams.audit ?? null;
  const gorgiasSource = searchParams.source?.trim() === 'gorgias' ? 'gorgias' : null;
  const gorgiasTicketId = searchParams.ticket_id?.trim() || null;

  const svc = createServiceClient();
  let merchantId = '';
  let permissionUserId: string | undefined;

  if (viewToken) {
    const parsed = parseAndVerifySignedToken(viewToken);
    if (!parsed || parsed.profile_id !== profileId || new Date(parsed.expires_at).getTime() <= Date.now()) {
      return { blocked: true, reason: 'link_expired' };
    }

    const tokenHash = hashSignedToken(viewToken);
    const { data: tokenRow } = await svc
      .from(TABLES.PROFILE_VIEW_TOKENS)
      .select('profile_id, merchant_id, expires_at')
      .eq('token_hash', tokenHash)
      .maybeSingle() as unknown as {
      data: { profile_id: string; merchant_id: string; expires_at: string } | null;
    };

    if (!tokenRow || tokenRow.profile_id !== profileId || new Date(tokenRow.expires_at).getTime() <= Date.now()) {
      return { blocked: true, reason: 'link_expired' };
    }

    merchantId = tokenRow.merchant_id;
  } else {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { denied, ctx } = await requirePermission(svc, user.id, PERMISSIONS.VIEW_CUSTOMERS);
    if (denied) {
      return { blocked: true, reason: 'access_denied' };
    }

    merchantId = ctx.merchantId;
    permissionUserId = ctx.userId;
  }

  const [connectionState, profileRow] = await Promise.all([
    getConnectionState(svc, merchantId),
    fetchMerchantScopedCustomerProfile(svc, merchantId, profileId, permissionUserId),
  ]);

  if (!profileRow) {
    if (viewToken) {
      return { blocked: true, reason: 'link_expired' };
    }
    notFound();
  }

  const profile = toCustomerProfileDisplay(profileRow);

  let transactionRows: Record<string, unknown>[] = await fetchMerchantScopedCustomerTransactions(
    svc,
    merchantId,
    profileId,
    profileRow,
    { select: TX_SELECT },
  );

  if (transactionRows.length === 0 && profile.emails.length > 0) {
    const ownedJobIds = await getMerchantOwnedJobIds(svc, merchantId);
    if (ownedJobIds.length > 0) {
      const { data: fallbackRows } = await svc
        .from(TABLES.AUDIT_TRANSACTIONS)
        .select(TX_SELECT)
        .in('job_id', ownedJobIds)
        .in('customer_email', profile.emails)
        .order('processed_at', { ascending: true })
        .limit(200) as unknown as { data: Record<string, unknown>[] | null };
      transactionRows = fallbackRows ?? [];
    }
  }

  const transactions = toRoadmapTransactions(transactionRows);

  type TimelineField = 'email' | 'name' | 'address' | 'ip' | 'card_last4';
  const identityTimeline: CustomerIntelligencePanel['identityTimeline'] = [];
  const firstSeen: Record<string, string> = {};

  function addEntry(date: string, field: TimelineField, value: string | null | undefined) {
    const v = (value ?? '').trim();
    if (!v) return;
    if (!(field in firstSeen)) {
      firstSeen[field] = v;
      identityTimeline.push({ date, field, value: v, isVariant: false });
    } else if (firstSeen[field] !== v) {
      const alreadyAdded = identityTimeline.some((e) => e.field === field && e.value === v);
      if (!alreadyAdded) {
        identityTimeline.push({ date, field, value: v, isVariant: true });
      }
    }
  }

  for (const tx of transactions) {
    addEntry(tx.processed_at, 'email', tx.customer_email);
    addEntry(tx.processed_at, 'name', tx.customer_name);
    addEntry(tx.processed_at, 'address', tx.shipping_address);
    addEntry(tx.processed_at, 'ip', tx.device_ip);
    addEntry(tx.processed_at, 'card_last4', tx.card_last4);
  }
  identityTimeline.sort((a, b) => a.date.localeCompare(b.date));

  const linkedAccounts: LinkedAccountRow[] = [];
  {
    const emailSet = new Set<string>();
    const cardSet = new Set<string>();
    const ipSet = new Set<string>();
    for (const tx of transactions) {
      if (tx.customer_email) emailSet.add(tx.customer_email);
      if (tx.card_last4) cardSet.add(tx.card_last4);
      if (tx.device_ip) ipSet.add(tx.device_ip);
    }
    if (emailSet.size > 1) {
      linkedAccounts.push({
        entityType: 'email',
        entityValue: `${emailSet.size} email addresses observed`,
        confidence: Math.min(90, 40 + emailSet.size * 10),
      });
    }
    if (cardSet.size > 1) {
      linkedAccounts.push({
        entityType: 'card',
        entityValue: `${cardSet.size} payment cards observed`,
        confidence: Math.min(85, 35 + cardSet.size * 10),
      });
    }
    if (ipSet.size > 1) {
      linkedAccounts.push({
        entityType: 'ip',
        entityValue: `${ipSet.size} IP addresses observed`,
        confidence: Math.min(75, 25 + ipSet.size * 8),
      });
    }
  }

  const displayName = profile.names[0] ?? profile.primary_email ?? 'Unknown Customer';
  const variantCount = identityTimeline.filter((e) => e.isVariant).length;

  const { data: activityRows } = await svc
    .from('customer_activity_log' as never)
    .select('id, event_type, event_data, created_at')
    .eq('profile_id', profileId)
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
    .limit(20) as unknown as { data: ActivityLogEntry[] | null };

  const activityLog = activityRows ?? [];

  const refundRate = Math.round(profile.refund_rate * 100);
  const isEligibleForEvidence = transactions.some((tx) => tx.refund_claimed || tx.chargeback_filed) || profile.total_chargebacks > 0;
  const shopifyCommerceStats = await countShopifyCommerceOrdersForProfile(svc, merchantId, profileId);
  const commerceStats = deriveCanonicalCommerceOrderStats({
    shopifyOrderCount: shopifyCommerceStats.orderCount,
    shopifyTotalValue: shopifyCommerceStats.totalValue,
    auditTransactions: transactions.map((tx) => ({
      order_id: tx.order_id,
      order_value: tx.order_value,
    })),
    profileTotalOrders: profile.total_orders,
  });
  const totalOrderValue = commerceStats.totalValue;
  const totalRefundedValue = transactions
    .filter((tx) => tx.refund_claimed || tx.chargeback_filed)
    .reduce((sum, tx) => sum + (Number(tx.order_value) || 0), 0);
  const claimCount = transactions.filter((tx) => tx.refund_claimed || tx.chargeback_filed).length;
  const merchantOrderCount = commerceStats.orderCount;
  const merchantClaimCount = transactions.length > 0 ? claimCount : profile.total_refund_claims;
  const merchantRefundRate = merchantOrderCount > 0 ? Math.round((merchantClaimCount / merchantOrderCount) * 100) : refundRate;
  const hasCleanRecord = merchantClaimCount === 0 && profile.total_chargebacks === 0;
  const identitySignals = profile.identity_signals ?? profile.fraud_flags ?? [];

  const density = Array.from({ length: 12 }, () => 0);
  for (const tx of transactions) {
    const diffDays = Math.floor((Date.now() - new Date(tx.processed_at).getTime()) / 86400000);
    const weekIndex = Math.min(11, Math.max(0, 11 - Math.floor(diffDays / 7)));
    density[weekIndex] += 1;
  }

  const roadmapEvents = getEventStream({
    orderHistory: transactions.map((tx) => ({
      orderId: tx.order_id,
      processedAt: tx.processed_at,
      orderValue: Number(tx.order_value) || null,
      riskLevel: tx.risk_level ?? null,
      refundRequested: !!tx.refund_claimed,
      refundReason: tx.refund_reason ?? null,
      chargebackFiled: !!tx.chargeback_filed,
      chargebackReasonCode: tx.chargeback_reason_code ?? null,
      fraudFlags: Array.isArray(tx.fraud_flags) ? tx.fraud_flags : [],
      address: tx.shipping_address,
      email: tx.customer_email,
      cardLast4: tx.card_last4,
      source: tx.source ?? null,
    })),
    identityTimeline,
    notes: [],
  });

  const merchantNarrative = buildBehavioralNarrative({
    totalOrders: merchantOrderCount,
    totalRefundClaims: merchantClaimCount,
    refundRate: merchantOrderCount > 0 ? merchantClaimCount / merchantOrderCount : profile.refund_rate,
    fastestClaimDays: profile.fastest_claim_days,
    avgClaimDays: profile.avg_claim_days,
    refundAccelerationScore: profile.refund_acceleration_score,
    firstSeen: transactions[0]?.processed_at ?? profile.first_seen,
    lastSeen: transactions[transactions.length - 1]?.processed_at ?? profile.last_seen,
    fraudFlags: profile.identity_signals ?? profile.fraud_flags,
    linkedAccountCount: 0,
  });

  const identityConfidence = deriveProfileIdentityConfidence(profile, transactionRows);
  const profileGrade = identityConfidence.letter;

  let { data: profileClaims, error: profileClaimsError } = await svc
    .from('merchant_claims' as never)
    .select('id,claim_type,status,shopify_order_id,order_ref,submitted_at,created_at,updated_at')
    .eq('merchant_id', merchantId)
    .eq('customer_id', profileId)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (profileClaimsError) {
    const fallback = await svc
      .from('merchant_claims' as never)
      .select('id,claim_type,status,shopify_order_id,submitted_at,created_at,updated_at')
      .eq('merchant_id', merchantId)
      .eq('customer_id', profileId)
      .order('updated_at', { ascending: false })
      .limit(20);
    profileClaims = fallback.data;
  }

  const claimSummaryRows = (profileClaims ?? []) as ClaimSummaryRow[];
  const openClaimCount = claimSummaryRows.filter((claim) =>
    ACTIVE_CLAIM_STATUSES.includes(claim.status as (typeof ACTIVE_CLAIM_STATUSES)[number]),
  ).length;
  const latestClaim = claimSummaryRows[0] ?? null;
  const profileWideOrders = Math.max(0, Number(profile.total_orders ?? merchantOrderCount));
  const merchantsSeen = Math.max(1, Number(profile.total_merchants_seen_at ?? 1));
  const localOrderSharePct = profileWideOrders > 0 ? (merchantOrderCount / profileWideOrders) * 100 : 0;
  const localClaimRatePct = merchantOrderCount > 0 ? (merchantClaimCount / merchantOrderCount) * 100 : 0;
  const networkChargebackRatePct = profileWideOrders > 0 ? (profile.total_chargebacks / profileWideOrders) * 100 : 0;
  const thisStoreMerchantSharePct = (1 / merchantsSeen) * 100;
  const merchantSignalCount = Math.max(0, Number(profile.total_merchants_seen_at ?? 1));
  const merchantSignalPills: MerchantSignalPill[] = merchantSignalCount > 0
    ? Array.from({ length: merchantSignalCount }, (_, i) => ({
      merchantLabel: `Merchant #${String.fromCharCode(65 + (i % 26))}`,
      claimType: CLAIM_TYPE_LABELS[claimSummaryRows[i % Math.max(claimSummaryRows.length, 1)]?.claim_type ?? 'other'] ?? 'Other',
    }))
    : [];

  const primaryIdentifier = profile.primary_email ?? firstArrayValue(profile.emails) ?? 'primary';
  const identitySignalRows = buildIdentitySignalRows(profile);

  const props: CustomerProfilePageViewProps = {
    connectionState: connectionState as ConnectionState,
    auditRunId,
    viewToken,
    gorgiasSource,
    gorgiasTicketId,
    profile,
    displayName,
    profileGrade,
    hasCleanRecord,
    merchantClaimCount,
    merchantOrderCount,
    localClaimRatePct,
    isEligibleForEvidence,
    totalOrderValue,
    totalRefundedValue,
    merchantsSeen,
    profileWideOrders,
    localOrderSharePct,
    networkChargebackRatePct,
    thisStoreMerchantSharePct,
    density,
    primaryIdentifier,
    identitySignalRows,
    identitySignals,
    transactions,
    roadmapEvents,
    identityTimeline,
    variantCount,
    merchantNarrative,
    linkedAccounts,
    merchantSignalPills,
    activityLog,
    openClaimCount,
    latestClaim,
    merchantRefundRate,
  };

  return { blocked: false, props };
}
