import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import type { ComponentType, CSSProperties, ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  CreditCard,
  FileText,
  GitBranch,
  Mail,
  MapPin,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
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
import WatchlistStarButton from '@/components/audit/WatchlistStarButton';
import CustomerNotes from '@/components/audit/CustomerNotes';
import CustomerSupportCasesSection from '@/components/customers/CustomerSupportCasesSection';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { SectionCard } from '@/components/ui/SectionCard';
import { MetricCard } from '@/components/ui/MetricCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { PrivacyBadge } from '@/components/ui/PrivacyBadge';
import InvestigationStatusSelect from '@/components/customers/InvestigationStatusSelect';
import IdentityTimeline from '@/components/customers/IdentityTimeline';
import BehaviorRoadmap from '@/components/customers/BehaviorRoadmap';
import CaseSummaryStrip from '@/components/customers/CaseSummaryStrip';
import type { CustomerIntelligencePanel } from '@/app/api/customers/[id]/route';
import { labelFor } from '@/lib/copy/labels';
import { formatCurrencyNullable, formatDate, formatDateMode } from '@/lib/utils/format';
import { getEventStream } from '@/lib/analysis/customerIntelligence';
import { FLAG_EXPERIENCE_POLISH_V1 } from '@/lib/flags';
import { ACTIVE_CLAIM_STATUSES, formatFiledDate } from '@/lib/claims/sla';
import { parseAndVerifySignedToken, hashSignedToken } from '@/lib/api/signedAccess';

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
  searchParams: Promise<{ audit?: string; view_token?: string }> | { audit?: string; view_token?: string };
}

// TX_SAFE_SELECT is imported from merchantHelpers — it includes identity fields
// and is kept in one place to prevent drift between the page and API route.
const TX_SELECT = TX_SAFE_SELECT;

function labelize(value: string) {
  return labelFor(value);
}

function TimelineDetail({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  if (value == null || value === '') return null;
  return (
    <div className="min-w-0 rounded-md border p-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}>
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-subtle)' }} />
        <p className="text-caption" style={{ color: 'var(--text-subtle)' }}>{label}</p>
      </div>
      <p className={`mt-1 text-body-sm break-words ${mono ? 'font-mono' : ''}`} style={{ color: 'var(--text)' }}>{value}</p>
    </div>
  );
}

function IdentityDatum({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-caption mb-1" style={{ color: 'var(--text-muted)' }}>{label}</dt>
      <dd className="space-y-1">{children}</dd>
    </div>
  );
}

function roadmapTitle(tx: any) {
  if (tx.chargeback_filed) return 'Chargeback filed';
  if (tx.refund_claimed) return 'Refund claim recorded';
  return 'Order placed';
}

const CLAIM_TYPE_LABELS: Record<string, string> = {
  missing_parcel: 'Missing parcel',
  damaged: 'Damaged item',
  wrong_item: 'Wrong item',
  refund_request: 'Refund request',
  chargeback: 'Chargeback',
  return_abuse: 'Return abuse',
  other: 'Other',
};

const CLAIM_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  under_review: 'Under review',
  evidence_requested: 'Evidence requested',
  pending: 'Pending external evidence',
  escalated: 'Escalated',
  resolved: 'Resolved',
  closed: 'Closed',
};

function confidenceTone(grade: string) {
  const g = grade.toUpperCase();
  if (g === 'A') return { label: 'Definite', bg: 'var(--sev-definite-fill)', fg: 'var(--sev-definite)' };
  if (g === 'B') return { label: 'Probable', bg: 'var(--sev-probable-fill)', fg: 'var(--sev-probable)' };
  if (g === 'C') return { label: 'Possible', bg: 'var(--sev-neutral-fill)', fg: 'var(--sev-neutral)' };
  return { label: 'Weak', bg: 'var(--surface-muted)', fg: 'var(--ink-tertiary)' };
}

function ConfidencePill({ grade }: { grade: string }) {
  const tone = confidenceTone(grade);
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: tone.bg, color: tone.fg }}
    >
      {tone.label}
    </span>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  csv: 'CSV',
  shopify: 'Shopify',
  zendesk: 'Zendesk',
  gorgias: 'Gorgias',
  api: 'API',
};

function firstArrayValue(value: unknown): string | null {
  return Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()
    ? value[0].trim()
    : null;
}

function RoadmapOrderCard({ tx, isLast }: { tx: any; isLast: boolean }) {
  const hasClaim = !!(tx.refund_claimed ?? tx.chargeback_filed);
  const eventDate = tx.processed_at;
  const flags = Array.isArray(tx.fraud_flags) ? tx.fraud_flags : [];

  return (
    <li className="relative pl-10 pb-5 last:pb-0">
      {!isLast && (
        <span
          aria-hidden="true"
          className="absolute left-[13px] top-8 bottom-0 w-px"
          style={{ background: 'var(--border-subtle)' }}
        />
      )}
      <span
        aria-hidden="true"
        className="absolute left-0 top-1 flex h-7 w-7 items-center justify-center rounded-full border"
        style={{
          background: hasClaim ? 'var(--risk-high-bg)' : 'var(--bg-surface)',
          borderColor: hasClaim ? 'var(--risk-high-bd)' : 'var(--border)',
          color: hasClaim ? 'var(--risk-high)' : 'var(--text-muted)',
        }}
      >
        {tx.chargeback_filed ? <AlertTriangle className="h-4 w-4" /> : hasClaim ? <RotateCcw className="h-4 w-4" /> : <ReceiptText className="h-4 w-4" />}
      </span>

      <article className="rounded-lg border bg-[var(--bg-surface)]" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-h2" style={{ color: 'var(--text-primary)' }}>{roadmapTitle(tx)}</h3>
              {tx.source && (
                <span className="inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                  {SOURCE_LABELS[tx.source] ?? tx.source}
                </span>
              )}
            </div>
            <p className="mt-1 text-caption font-mono" style={{ color: 'var(--text-muted)' }}>{tx.order_id}</p>
          </div>
          <div className="text-right">
            <p className="text-body-strong num" style={{ color: 'var(--text)' }}>{formatCurrencyNullable(tx.order_value)}</p>
            <p className="text-caption" style={{ color: 'var(--text-muted)' }}>{formatDate(eventDate)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
          <TimelineDetail icon={Mail} label="Email used" value={tx.customer_email} mono />
          <TimelineDetail icon={UserRound} label="Name used" value={tx.customer_name} />
          <TimelineDetail icon={MapPin} label="Shipping address" value={tx.shipping_address} />
          <TimelineDetail icon={CreditCard} label={labelFor('card')} value={tx.card_last4 ? `•••• ${tx.card_last4}` : null} mono />
          <TimelineDetail icon={GitBranch} label={labelFor('device_ip')} value={tx.device_ip} mono />
          <TimelineDetail icon={ReceiptText} label="Processed timestamp" value={formatDate(tx.processed_at)} />
        </div>

        {(tx.refund_claimed ?? tx.chargeback_filed) && (
          <div className="mx-4 mb-4 rounded-md border p-3" style={{ borderColor: 'var(--risk-high-bd)', background: 'var(--risk-high-bg)' }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <p className="text-caption" style={{ color: 'var(--risk-high)' }}>Claim status</p>
                <p className="text-body-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {tx.chargeback_filed ? 'Chargeback filed' : 'Refund claimed'}
                </p>
              </div>
              <div>
                <p className="text-caption" style={{ color: 'var(--risk-high)' }}>Timestamp</p>
                <p className="text-body-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {formatDate(tx.chargeback_date ?? tx.processed_at)}
                </p>
              </div>
              <div>
                <p className="text-caption" style={{ color: 'var(--risk-high)' }}>Reason</p>
                <p className="text-body-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {tx.refund_reason || tx.chargeback_reason_code || 'Not provided'}
                </p>
              </div>
            </div>
          </div>
        )}

        {flags.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pb-4">
            {flags.map((flag: string) => (
              <Badge key={flag} tone="neutral" variant="subtle" size="sm">{labelize(flag)}</Badge>
            ))}
          </div>
        )}
      </article>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Page — server component
// ---------------------------------------------------------------------------

export default async function CustomerProfilePage({ params, searchParams }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { id } = resolvedParams;
  const profileId = id;
  const viewToken = resolvedSearchParams.view_token?.trim() ?? '';

  // The ?audit=runId param is set when navigating here from an audit context.
  // It is used to build a contextual back link so users can return to the audit
  // instead of being dropped at the global /customers list.
  const auditRunId = resolvedSearchParams.audit ?? null;

// ── Auth + permission ──────────────────────────────────────────────────
  const svc = createServiceClient();
  let merchantId = '';
  let permissionUserId: string | undefined;

  if (viewToken) {
    const parsed = parseAndVerifySignedToken(viewToken);
    if (!parsed || parsed.profile_id !== profileId || new Date(parsed.expires_at).getTime() <= Date.now()) {
      return (
        <div className="p-8">
          <h1 className="text-heading-lg">Link expired</h1>
          <p className="text-body-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            This link has expired. Ask your team for a new one from Unauth.
          </p>
          <a href="https://unauth.co" className="text-body-sm mt-3 inline-block underline" style={{ color: 'var(--text)' }}>
            Go to unauth.co
          </a>
        </div>
      );
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
      return (
        <div className="p-8">
          <h1 className="text-heading-lg">Link expired</h1>
          <p className="text-body-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            This link has expired. Ask your team for a new one from Unauth.
          </p>
          <a href="https://unauth.co" className="text-body-sm mt-3 inline-block underline" style={{ color: 'var(--text)' }}>
            Go to unauth.co
          </a>
        </div>
      );
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
      return (
        <div className="p-8">
          <h1 className="text-heading-lg">Access denied</h1>
          <p className="text-body-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            You do not have permission to view this customer profile.
          </p>
        </div>
      );
    }

    merchantId = ctx.merchantId;
    permissionUserId = ctx.userId;
  }

  // ── Fetch profile (merchant-scoped) ────────────────────────────────────
  const profileRow = await fetchMerchantScopedCustomerProfile(svc, merchantId, profileId, permissionUserId);
  if (!profileRow) {
    if (viewToken) {
      return (
        <div className="p-8">
          <h1 className="text-heading-lg">Link expired</h1>
          <p className="text-body-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            This link has expired. Ask your team for a new one from Unauth.
          </p>
          <a href="https://unauth.co" className="text-body-sm mt-3 inline-block underline" style={{ color: 'var(--text)' }}>
            Go to unauth.co
          </a>
        </div>
      );
    }
    notFound();
  }

  const profile = profileRow as any;

  // ── Watchlist check ────────────────────────────────────────────────────
  const { data: watchlistRow } = await svc
    .from(TABLES.WATCHLIST_ENTRIES)
    .select('id')
    .eq('customer_profile_id', profileId)
    .eq('merchant_id', merchantId)
    .eq('removed_by_merchant', false)
    .maybeSingle() as unknown as { data: { id: string } | null };

  // ── Transactions (merchant-scoped — no cross-tenant leak) ──────────────
  // fetchMerchantScopedCustomerTransactions scopes all reads through
  // merchant-owned processing_jobs.id and never falls back to unconstrained
  // email/card/IP queries.
  let transactions: Array<any> = await fetchMerchantScopedCustomerTransactions(
    svc,
    merchantId,
    profileId,
    profile,
    { select: TX_SELECT }
  );

  if (transactions.length === 0 && Array.isArray(profile.emails) && profile.emails.length > 0) {
    const ownedJobIds = await getMerchantOwnedJobIds(svc, merchantId);
    if (ownedJobIds.length > 0) {
      const { data: fallbackRows } = await svc
        .from(TABLES.AUDIT_TRANSACTIONS)
        .select(TX_SELECT)
        .in('job_id', ownedJobIds)
        .in('customer_email', profile.emails)
        .order('processed_at', { ascending: true })
        .limit(200) as unknown as { data: Array<any> | null };
      transactions = fallbackRows ?? [];
    }
  }

  // -------------------------------------------------------------------------
  // Build identity timeline
  // -------------------------------------------------------------------------
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

// ── Linked identity signals (derived only from merchant-owned transactions) ─
  // SECURITY: We must NOT read fraud_identity_clusters here.
  // That table contains cross-merchant data. Exposing cluster existence, counts,
  // entity types, or confidence from it would reveal cross-merchant PII signals
  // without an explicit privacy-reviewed product contract.
  //
  // Instead, we derive linked-identity signals solely from the already-fetched
  // merchant-scoped transactions. No global cluster reads are performed.
  const linkedAccounts: Array<{ entityType: string; entityValue: string; confidence: number }> = [];
  {
    // Collect identity attributes that appear in more than one transaction
    // (indicating the customer has used multiple identifiers within THIS merchant)
    const emailSet = new Set<string>();
    const cardSet = new Set<string>();
    const ipSet = new Set<string>();
    for (const tx of transactions as any[]) {
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

  // -------------------------------------------------------------------------
  // Fetch activity log
  // -------------------------------------------------------------------------
  const { data: activityRows } = await svc
    .from('customer_activity_log' as any)
    .select('id, event_type, event_data, created_at')
    .eq('profile_id', profileId)
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
    .limit(20) as unknown as { data: Array<{ id: string; event_type: string; event_data: Record<string, unknown>; created_at: string }> | null };

  const activityLog = activityRows ?? [];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  const refundRate = Math.round(profile.refund_rate * 100);
  const isEligibleForEvidence = transactions.some((tx: any) => tx.refund_claimed || tx.chargeback_filed) || profile.total_chargebacks > 0;
  const shopifyCommerceStats = await countShopifyCommerceOrdersForProfile(svc, merchantId, profileId);
  const commerceStats = deriveCanonicalCommerceOrderStats({
    shopifyOrderCount: shopifyCommerceStats.orderCount,
    shopifyTotalValue: shopifyCommerceStats.totalValue,
    auditTransactions: transactions.map((tx: any) => ({
      order_id: tx.order_id,
      order_value: tx.order_value,
    })),
    profileTotalOrders: profile.total_orders,
  });
  const totalOrderValue = commerceStats.totalValue;
  const totalRefundedValue = transactions
    .filter((tx: any) => tx.refund_claimed || tx.chargeback_filed)
    .reduce((sum: number, tx: any) => sum + (Number(tx.order_value) || 0), 0);
  const claimCount = transactions.filter((tx: any) => tx.refund_claimed || tx.chargeback_filed).length;
  const merchantOrderCount = commerceStats.orderCount;
  const merchantClaimCount = transactions.length > 0 ? claimCount : profile.total_refund_claims;
  const merchantRefundRate = merchantOrderCount > 0 ? Math.round((merchantClaimCount / merchantOrderCount) * 100) : refundRate;
  const identitySignals = ((profile as any).identity_signals ?? profile.fraud_flags ?? []) as string[];
  const networkSignalCount = transactions.filter((tx: any) => {
    const signals = [...(Array.isArray(tx.signals_matched) ? tx.signals_matched : []), ...(Array.isArray(tx.fraud_flags) ? tx.fraud_flags : [])];
    return signals.some((signal: string) => signal.toLowerCase().includes('crossmerchant'));
  }).length;
  const density = Array.from({ length: 12 }, () => 0);
  for (const tx of transactions) {
    const diffDays = Math.floor((Date.now() - new Date(tx.processed_at).getTime()) / 86400000);
    const weekIndex = Math.min(11, Math.max(0, 11 - Math.floor(diffDays / 7)));
    density[weekIndex] += 1;
  }
  const roadmapEvents = getEventStream({
    orderHistory: transactions.map((tx: any) => ({
      orderId: tx.order_id,
      processedAt: tx.processed_at,
      orderValue: Number(tx.order_value) || null,
      riskLevel: tx.risk_level,
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
  const identityConfidence = deriveProfileIdentityConfidence(profile, transactions);
  const profileGrade = identityConfidence.letter;
  const merchantSignalCount = Math.max(0, Number(profile.total_merchants_seen_at ?? 1));
  let { data: profileClaims, error: profileClaimsError } = await svc
    .from('merchant_claims' as any)
    .select('id,claim_type,status,shopify_order_id,order_ref,submitted_at,created_at,updated_at')
    .eq('merchant_id', merchantId)
    .eq('customer_id', profileId)
    .order('updated_at', { ascending: false })
    .limit(20);
  if (profileClaimsError) {
    const fallback = await svc
      .from('merchant_claims' as any)
      .select('id,claim_type,status,shopify_order_id,submitted_at,created_at,updated_at')
      .eq('merchant_id', merchantId)
      .eq('customer_id', profileId)
      .order('updated_at', { ascending: false })
      .limit(20);
    profileClaims = fallback.data;
  }
  const claimSummaryRows = (profileClaims ?? []) as Array<{ id: string; claim_type: string; status: string; shopify_order_id?: string | null; order_ref?: string | null; submitted_at?: string | null; created_at?: string | null; updated_at?: string | null }>;
  const openClaimCount = claimSummaryRows.filter((claim) => ACTIVE_CLAIM_STATUSES.includes(claim.status as any)).length;
  const latestClaim = claimSummaryRows[0] ?? null;
  const profileWideOrders = Math.max(0, Number(profile.total_orders ?? merchantOrderCount));
  const merchantsSeen = Math.max(1, Number(profile.total_merchants_seen_at ?? 1));
  const localOrderSharePct = profileWideOrders > 0 ? (merchantOrderCount / profileWideOrders) * 100 : 0;
  const localClaimRatePct = merchantOrderCount > 0 ? (merchantClaimCount / merchantOrderCount) * 100 : 0;
  const networkChargebackRatePct = profileWideOrders > 0 ? (profile.total_chargebacks / profileWideOrders) * 100 : 0;
  const thisStoreMerchantSharePct = (1 / merchantsSeen) * 100;
  const merchantSignalPills = merchantSignalCount > 0
    ? Array.from({ length: merchantSignalCount }).map((_, i) => ({
      merchantLabel: `Merchant #${String.fromCharCode(65 + (i % 26))}`,
      claimType: CLAIM_TYPE_LABELS[claimSummaryRows[i % Math.max(claimSummaryRows.length, 1)]?.claim_type ?? 'other'] ?? 'Other',
    }))
    : [];

  const primaryIdentifier = profile.primary_email ?? firstArrayValue(profile.emails) ?? 'primary';
  const identitySignalRows = [
    ...((Array.isArray(profile.emails) ? profile.emails : []) as string[])
      .filter((email) => email && email !== profile.primary_email)
      .map((email) => ({
        value: email,
        signalType: 'email variant',
        grade: 'B',
      })),
    firstArrayValue(profile.addresses)
      ? { value: firstArrayValue(profile.addresses)!, signalType: 'address match', grade: 'B' }
      : null,
    firstArrayValue(profile.phones)
      ? { value: firstArrayValue(profile.phones)!, signalType: 'phone match', grade: 'A' }
      : null,
    firstArrayValue(profile.ips)
      ? { value: firstArrayValue(profile.ips)!, signalType: 'device/ip match', grade: 'C' }
      : null,
  ].filter(Boolean) as Array<{ value: string; signalType: string; grade: string }>;

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-5">
      {/* Back navigation — context-aware: returns to audit if ?audit=runId is set */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={auditRunId ? `/audit/${auditRunId}?tab=customers` : '/customers'}
          className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          {auditRunId ? 'Back to Audit' : 'Back to Customers'}
        </Link>
        {auditRunId && (
          <>
            <span style={{ color: 'var(--border)' }}>/</span>
            <Link href="/customers" className="text-sm transition-colors hover:opacity-80" style={{ color: 'var(--text-muted)' }}>All Customers</Link>
          </>
        )}
        <span style={{ color: 'var(--border)' }}>/</span>
        <span className="text-sm font-medium truncate max-w-xs" style={{ color: 'var(--text)' }}>{displayName}</span>
      </div>

      <section className="mb-5 overflow-hidden rounded-md border" style={{ background: 'var(--surface-raised)', borderColor: 'var(--surface-border)' }}>
        <div className="grid gap-4 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(560px,0.9fr)]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="t-heading truncate" style={{ color: 'var(--ink-primary)' }}>{displayName}</h1>
              <ConfidenceBadge grade={profileGrade} />
            </div>
            <p className="mt-2 t-mono break-all" style={{ color: 'var(--data-id)' }}>
              {profile.primary_email ?? profile.id}
            </p>
            <p className="mt-2 max-w-2xl text-body-sm" style={{ color: 'var(--ink-secondary)' }}>
              Take this intelligence back to your Gorgias or Zendesk ticket. Use an evidence package in your Shopify dispute or bank portal when you need documentation.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <InvestigationStatusSelect profileId={profile.id} initialStatus={(profile as any).investigation_status ?? 'new'} />
              <WatchlistStarButton
                customerProfileId={profile.id}
                displayName={profile.names[0] ?? undefined}
                displayEmail={profile.primary_email ?? undefined}
                lastSeenRisk={profile.risk_level}
                initialWatchlisted={!!watchlistRow}
              />
              <Link
                href={`/customers/${profile.id}/evidence/new`}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors btn-accent"
                style={!isEligibleForEvidence ? { opacity: 0.85 } : undefined}
                title={isEligibleForEvidence ? undefined : 'Available when refund or chargeback activity is present'}
              >
                <FileText className="h-3.5 w-3.5" />
                Build evidence package
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border md:grid-cols-5" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-border)' }}>
            {[
              { label: 'Identity grade', value: profileGrade, color: 'var(--data-score)' },
              { label: 'Cross-merchant', value: merchantsSeen > 1 ? `${merchantsSeen} merchants` : 'This store only', color: 'var(--data-score)' },
              { label: 'Exposure', value: formatCurrencyNullable(totalOrderValue), color: 'var(--data-currency)' },
              { label: 'Last seen', value: formatDateMode(profile.last_seen, 'table'), color: 'var(--data-date)', mono: true },
            ].map((metric) => (
              <div key={metric.label} className="p-4" style={{ background: 'var(--surface-raised)' }}>
                <p className="t-label" style={{ color: 'var(--ink-tertiary)' }}>{metric.label}</p>
                <p className={metric.mono ? 't-mono-md mt-2 num' : 't-display mt-1 num'} style={{ color: metric.color }}>
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex h-10 items-center gap-4 border-t px-4" style={{ background: 'var(--surface-border)', borderColor: 'var(--surface-border)' }}>
          <div
            className="flex flex-1 gap-1 cursor-help"
            title="Activity timeline — each bar is one week of orders and refund claims across all merchants"
          >
            {density.map((value, index) => (
              <span
                key={index}
                className="h-2 flex-1 rounded-sm"
                style={{ background: value > 0 ? 'var(--copper-bright)' : 'var(--surface-muted)', opacity: value > 0 ? 0.9 : 0.55 }}
              />
            ))}
          </div>
          <span className="t-mono whitespace-nowrap" style={{ color: 'var(--data-date)' }}>
            Last seen {formatDateMode(profile.last_seen, 'recent')}
          </span>
        </div>
      </section>

      {FLAG_EXPERIENCE_POLISH_V1 && (
        <div className="mb-[var(--space-5)]">
          <CaseSummaryStrip
            flaggedAt={profile.first_seen}
            orders={merchantOrderCount}
            exposure={totalOrderValue}
            cadence={Math.min(5, Math.max(1, Math.ceil(merchantOrderCount / 3)))}
            lastSeen={profile.last_seen}
            density={density}
          />
        </div>
      )}

      <section className="mb-[var(--space-5)] rounded-md border p-4" style={{ background: 'var(--surface-raised)', borderColor: 'var(--surface-border)' }}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p className="text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Evidence scope</p>
          <span className="text-caption" style={{ color: 'var(--text-muted)' }}>
            Compare what was observed in this store vs merchant-wide network exposure
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-md border p-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}>
            <p className="text-caption font-semibold mb-2" style={{ color: 'var(--text)' }}>This store</p>
            <div className="grid grid-cols-2 gap-y-1.5 text-caption">
              <span style={{ color: 'var(--text-muted)' }}>Orders</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>
                {merchantOrderCount.toLocaleString()} ({localOrderSharePct.toFixed(1)}%)
              </span>
              <span style={{ color: 'var(--text-muted)' }}>Claims</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>
                {merchantClaimCount.toLocaleString()} ({localClaimRatePct.toFixed(1)}%)
              </span>
              <span style={{ color: 'var(--text-muted)' }}>Exposure</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>{formatCurrencyNullable(totalOrderValue)}</span>
              <span style={{ color: 'var(--text-muted)' }}>Refunded</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>{formatCurrencyNullable(totalRefundedValue)}</span>
            </div>
          </div>
          <div className="rounded-md border p-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}>
            <p className="text-caption font-semibold mb-2" style={{ color: 'var(--text)' }}>Merchant-wide network</p>
            <div className="grid grid-cols-2 gap-y-1.5 text-caption">
              <span style={{ color: 'var(--text-muted)' }}>Merchants seen</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>
                {merchantsSeen.toLocaleString()} (this store {thisStoreMerchantSharePct.toFixed(1)}%)
              </span>
              <span style={{ color: 'var(--text-muted)' }}>Profile orders</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>
                {profileWideOrders.toLocaleString()} (100%)
              </span>
              <span style={{ color: 'var(--text-muted)' }}>Chargebacks</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>
                {profile.total_chargebacks.toLocaleString()} ({networkChargebackRatePct.toFixed(1)}%)
              </span>
              <span style={{ color: 'var(--text-muted)' }}>First seen → last seen</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>
                {formatDateMode(profile.first_seen, 'table')} → {formatDateMode(profile.last_seen, 'table')}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-[var(--space-5)] rounded-md border p-4" style={{ background: 'var(--surface-raised)', borderColor: 'var(--surface-border)' }}>
        <p className="text-caption font-semibold mb-3" style={{ color: 'var(--ink-secondary)' }}>Cross-store signals</p>
        <div className="rounded-md border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_110px_90px_140px] gap-3 px-3 py-2" style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="text-caption font-semibold" style={{ color: 'var(--text-muted)' }}>Primary identifier</span>
            <span className="text-caption font-semibold" style={{ color: 'var(--text-muted)' }}>Linked signal</span>
            <span className="text-caption font-semibold" style={{ color: 'var(--text-muted)' }}>Signal type</span>
            <span className="text-caption font-semibold" style={{ color: 'var(--text-muted)' }}>Confidence</span>
            <span className="text-caption font-semibold" style={{ color: 'var(--text-muted)' }}>Observed</span>
          </div>
          {identitySignalRows.map((signal, i) => {
            const observed = `${formatDateMode(profile.first_seen, 'table')} → ${formatDateMode(profile.last_seen, 'table')}`;
            return (
              <div key={`${signal.value}-${i}`}>
                <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_110px_90px_140px] gap-3 px-3 py-2 border-t" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}>
                  <span className="font-mono text-caption truncate" style={{ color: 'var(--text)' }}>{primaryIdentifier}</span>
                  <span className="text-caption truncate" style={{ color: 'var(--text)' }}>{signal.value}</span>
                  <span className="text-caption" style={{ color: 'var(--text-muted)' }}>{signal.signalType}</span>
                  <ConfidencePill grade={signal.grade} />
                  <span className="font-mono text-caption" style={{ color: 'var(--text-muted)' }}>{observed}</span>
                </div>
                <div className="md:hidden border-t px-3 py-3 space-y-2" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}>
                  <div><span className="text-caption" style={{ color: 'var(--text-muted)' }}>Primary</span><p className="font-mono text-caption break-all" style={{ color: 'var(--text)' }}>{primaryIdentifier}</p></div>
                  <div><span className="text-caption" style={{ color: 'var(--text-muted)' }}>Linked signal</span><p className="text-caption break-all" style={{ color: 'var(--text)' }}>{signal.value}</p></div>
                  <div className="flex items-center justify-between gap-2"><span className="text-caption" style={{ color: 'var(--text-muted)' }}>{signal.signalType}</span><ConfidencePill grade={signal.grade} /></div>
                  <div><span className="text-caption" style={{ color: 'var(--text-muted)' }}>Observed</span><p className="font-mono text-caption" style={{ color: 'var(--text-muted)' }}>{observed}</p></div>
                </div>
              </div>
            );
          })}
          {identitySignalRows.length === 0 && (
            <div className="px-3 py-3 border-t" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}>
              <p className="text-caption" style={{ color: 'var(--text-muted)' }}>
                More signals appear as cross-store data accumulates
              </p>
            </div>
          )}
        </div>
        <p className="text-caption mt-2" style={{ color: 'var(--text-muted)' }}>
          Signals are derived from merchant-scoped audit records. “Observed” shows when this profile first and most recently carried the linked signal in your available dataset.
        </p>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-[var(--space-6)]">
        <div className="xl:col-span-8 space-y-[var(--space-5)]">
          {identityTimeline.length > 0 && (
            <SectionCard title="Identity timeline" description={variantCount > 0 ? `${variantCount} identifier change${variantCount > 1 ? 's' : ''} across orders` : 'How identifiers evolved over time'}>
              <IdentityTimeline entries={identityTimeline} />
            </SectionCard>
          )}

          <SectionCard title="Behavioral history" description="Chronological orders and claim events — use this narrative in your helpdesk reply.">
            <div className="mb-[var(--space-5)] rounded-lg border p-[var(--space-4)]" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}>
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <p className="text-body-sm leading-relaxed" style={{ color: 'var(--text)' }}>{merchantNarrative}</p>
              </div>

              {identitySignals.length > 0 && (
                <div className="mt-[var(--space-3)] flex flex-wrap gap-[var(--space-2)]">
                  {identitySignals.map((flag, index) => (
                    <Badge key={index} tone="neutral" variant="subtle" size="sm">{labelize(flag)}</Badge>
                  ))}
                </div>
              )}
            </div>

            {transactions.length === 0 ? (
              <EmptyState title="No orders in dataset" description="No transactions found for this customer in the current dataset." />
            ) : FLAG_EXPERIENCE_POLISH_V1 ? (
              <BehaviorRoadmap events={roadmapEvents} />
            ) : (
              <ol>
                {transactions.map((tx: any, index: number) => (
                  <RoadmapOrderCard key={`${tx.order_id}-${index}`} tx={tx} isLast={index === transactions.length - 1} />
                ))}
              </ol>
            )}
          </SectionCard>
        </div>

        <div className="xl:col-span-4 space-y-[var(--space-5)]">
          <SectionCard title="Merchant dossier">
            <div className="grid grid-cols-2 gap-[var(--space-3)] mb-[var(--space-4)]">
              <MetricCard label="Merchant orders" value={merchantOrderCount} hint={formatCurrencyNullable(totalOrderValue)} density="compact" />
              <MetricCard label="Merchant claims" value={merchantClaimCount} hint={`${merchantRefundRate}% refund rate`} density="compact" />
              <MetricCard label="Refunded" value={formatCurrencyNullable(totalRefundedValue)} density="compact" />
              <MetricCard label="Chargebacks" value={profile.total_chargebacks} density="compact" />
              <MetricCard label="Fastest claim" value={profile.fastest_claim_days != null ? `${profile.fastest_claim_days}d` : '—'} density="compact" />
              <MetricCard label="Avg claim" value={profile.avg_claim_days != null ? `${Math.round(profile.avg_claim_days)}d` : '—'} density="compact" />
            </div>

            <div className="space-y-3 pt-[var(--space-4)]" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <div>
                <div className="flex items-center justify-between text-caption mb-1" style={{ color: 'var(--text-muted)' }}>
                  <span>Profile confidence</span>
                  <span className="font-semibold" style={{ color: 'var(--text)' }}>{profile.profile_confidence}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
                  <div className="h-full rounded-full" style={{ width: `${profile.profile_confidence}%`, background: 'var(--info)' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-caption">
                <div>
                  <p style={{ color: 'var(--text-muted)' }}>First seen</p>
                  <p className="font-medium" style={{ color: 'var(--text)' }}>{formatDate(profile.first_seen)}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)' }}>Last seen</p>
                  <p className="font-medium" style={{ color: 'var(--text)' }}>{formatDate(profile.last_seen)}</p>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Dispute context" description="Summary you can reference when responding in Gorgias, Zendesk, or Shopify.">
            {latestClaim ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="Open disputes" value={openClaimCount.toLocaleString()} density="compact" />
                  <MetricCard label="Latest status" value={CLAIM_STATUS_LABELS[latestClaim.status] ?? latestClaim.status} density="compact" />
                </div>
                <div className="rounded-md border p-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}>
                  <p className="text-caption" style={{ color: 'var(--text-muted)' }}>Latest dispute signal</p>
                  <p className="text-body-sm font-semibold" style={{ color: 'var(--text)' }}>{CLAIM_TYPE_LABELS[latestClaim.claim_type] ?? latestClaim.claim_type}</p>
                  <p className="font-mono text-caption" style={{ color: 'var(--text-muted)' }}>{latestClaim.shopify_order_id ?? latestClaim.order_ref ?? latestClaim.id.slice(0, 8)}</p>
                  <p className="mt-2 text-caption" style={{ color: 'var(--text-muted)' }}>Filed {formatFiledDate(latestClaim)}</p>
                </div>
              </div>
            ) : (
              <EmptyState title="No dispute signals" description="When Shopify or your PSP reports a claim, context will appear here for your helpdesk ticket." />
            )}
          </SectionCard>

          <SectionCard
            title="Network footprint"
            description={<span className="inline-flex items-center gap-2"><span>Privacy-safe cross-store context</span><PrivacyBadge /></span>}
          >
            <div className="grid grid-cols-3 gap-3">
              <MetricCard label="Merchants" value={profile.total_merchants_seen_at ?? 1} density="compact" />
              <MetricCard label="Profile orders" value={profile.total_orders ?? merchantOrderCount} density="compact" />
              <MetricCard label="Privacy" value="Privacy-safe" density="compact" />
            </div>
            {merchantSignalPills.length === 0 ? (
              <EmptyState title="No merchant signals" description="No cross-merchant claim signals are available for this profile yet." />
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {merchantSignalPills.map((pill, idx) => (
                  <span
                    key={`${pill.merchantLabel}-${idx}`}
                    className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs"
                    style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)', color: 'var(--text)' }}
                    title="Cross-merchant signal summary"
                  >
                    <span className="font-semibold">{pill.merchantLabel}</span>
                    <span>·</span>
                    <span>{pill.claimType}</span>
                    <span>·</span>
                    <ConfidencePill grade={profileGrade} />
                  </span>
                ))}
              </div>
            )}
            <p className="text-caption mt-3" style={{ color: 'var(--text-muted)' }}>
              Other merchant names, customer IDs, and order IDs are hidden — only aggregate presence is shown.
            </p>
          </SectionCard>

          <SectionCard title="Identity details">
            <dl className="space-y-4 text-body-sm">
              {profile.emails.length > 0 && (
                <IdentityDatum label={profile.emails.length > 1 ? labelFor('emails') : labelFor('email')}>
                  {profile.emails.map((e: string, i: number) => (
                    <p key={i} className="font-mono text-caption break-all" style={{ color: 'var(--text)' }}>{e}</p>
                  ))}
                </IdentityDatum>
              )}
              {profile.names.length > 0 && (
                <IdentityDatum label={profile.names.length > 1 ? labelFor('names') : labelFor('name')}>
                  {profile.names.map((n: string, i: number) => (
                    <p key={i} className="text-caption" style={{ color: 'var(--text)' }}>{n}</p>
                  ))}
                </IdentityDatum>
              )}
              {profile.addresses.length > 0 && (
                <IdentityDatum label={profile.addresses.length > 1 ? labelFor('addresses') : labelFor('address')}>
                  {profile.addresses.map((a: string, i: number) => (
                    <p key={i} className="text-caption" style={{ color: 'var(--text)' }}>{a}</p>
                  ))}
                </IdentityDatum>
              )}
              {profile.card_last4s.length > 0 && (
                <IdentityDatum label={labelFor('cards')}>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.card_last4s.map((c: string, i: number) => (
                      <span key={i} className="font-mono text-caption px-1.5 py-0.5 rounded border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                        •••• {c}
                      </span>
                    ))}
                  </div>
                </IdentityDatum>
              )}
              {profile.phones && profile.phones.length > 0 && (
                <IdentityDatum label={profile.phones.length > 1 ? labelFor('phones') : labelFor('phone')}>
                  {profile.phones.map((p: string, i: number) => (
                    <p key={i} className="font-mono text-caption" style={{ color: 'var(--text)' }}>{p}</p>
                  ))}
                </IdentityDatum>
              )}
              {profile.ips && profile.ips.length > 0 && (
                <IdentityDatum label={profile.ips.length > 1 ? labelFor('ips') : labelFor('ip')}>
                  {profile.ips.map((ip: string, i: number) => (
                    <p key={i} className="font-mono text-caption break-all" style={{ color: 'var(--text)' }}>{ip}</p>
                  ))}
                </IdentityDatum>
              )}
            </dl>
          </SectionCard>

          <SectionCard title={`Linked identities (${linkedAccounts.length})`}>
            {linkedAccounts.length === 0 ? (
              <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
                No linked identities yet. They appear when signals connect this profile to other customer records in your data or the network.
              </p>
            ) : (
              <ul className="space-y-2">
                {linkedAccounts.map((acc: any, index: number) => (
                  <li key={index} className="grid grid-cols-[minmax(0,1fr)_60px_36px] items-center gap-3">
                    <div className="min-w-0">
                      <p className="t-label" style={{ color: 'var(--ink-tertiary)' }}>{labelize(acc.entityType)}</p>
                      <p className="t-caption truncate font-mono" style={{ color: 'var(--ink-secondary)' }}>{acc.entityValue}</p>
                    </div>
                    <div className="h-0.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-muted)' }}>
                      <div className="h-full" style={{ width: `${acc.confidence}%`, background: 'var(--copper-bright)' }} />
                    </div>
                    <span className="t-mono text-right" style={{ color: 'var(--ink-secondary)' }}>{acc.confidence}%</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <CustomerSupportCasesSection profileId={profile.id} />

          <SectionCard title="Merchant notes">
            <CustomerNotes customerProfileId={profile.id} />
          </SectionCard>

          <SectionCard title="Case activity">
            {activityLog.length === 0 ? (
              <EmptyState title="No activity yet" description="Actions and changes will appear here." />
            ) : (
              <ol className="space-y-3">
                {activityLog.map((entry) => {
                  const d = entry.event_data as Record<string, unknown>;
                  let description = '';
                  switch (entry.event_type) {
                    case 'profile_created': description = 'Profile created from audit'; break;
                    case 'status_changed': description = `Status changed to ${d.to}`; break;
                    case 'note_added': description = `Note added: ${d.note_preview ?? ''}`; break;
                    case 'note_deleted': description = 'Note removed'; break;
                    case 'watchlist_added': description = 'Added to watchlist'; break;
                    case 'watchlist_removed': description = 'Removed from watchlist'; break;
                    case 'evidence_generated': description = `Evidence package generated (${d.reference_number})`; break;
                    case 'audit_appearance': description = `Appeared in ${d.audit_label ?? 'an audit'} with ${d.score ?? ''} confidence`; break;
                    case 'manually_reviewed': description = 'Marked as manually reviewed'; break;
                    default: description = labelize(entry.event_type);
                  }
                  return (
                    <li key={entry.id} className="flex items-start gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}>
                      <Activity className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-body-sm" style={{ color: 'var(--text)' }}>{description}</p>
                        <p className="text-caption" style={{ color: 'var(--text-subtle)' }} title={formatDate(entry.created_at)}>{formatDateMode(entry.created_at, 'recent')}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
