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
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import {
  fetchMerchantScopedCustomerProfile,
  fetchMerchantScopedCustomerTransactions,
  TX_SAFE_SELECT,
} from '@/lib/supabase/merchantHelpers';
import { buildBehavioralNarrative } from '@/lib/customers/narrative';
import WatchlistStarButton from '@/components/audit/WatchlistStarButton';
import CustomerNotes from '@/components/audit/CustomerNotes';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { riskLevelToNewGrade } from '@/lib/confidence';
import { RiskScoreBadge } from '@/components/ui/RiskScoreBadge';
import { SectionCard } from '@/components/ui/SectionCard';
import { MetricCard } from '@/components/ui/MetricCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import InvestigationStatusSelect from '@/components/customers/InvestigationStatusSelect';
import IdentityTimeline from '@/components/customers/IdentityTimeline';
import BehaviorRoadmap from '@/components/customers/BehaviorRoadmap';
import CaseSummaryStrip from '@/components/customers/CaseSummaryStrip';
import type { CustomerIntelligencePanel } from '@/app/api/customers/[id]/route';
import { labelFor } from '@/lib/copy/labels';
import { riskBadgeStyle, riskBarStyle, riskTok } from '@/lib/utils/riskStyles';
import { formatCurrencyNullable, formatDate, formatDateMode } from '@/lib/utils/format';
import { getEventStream } from '@/lib/analysis/customerIntelligence';
import { FLAG_EXPERIENCE_POLISH_V1 } from '@/lib/flags';

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
  searchParams: Promise<{ audit?: string }> | { audit?: string };
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
  const tier = riskTok(tx.risk_level);
  if (tier === 'critical' || tier === 'high') return 'Order requiring review';
  return 'Order placed';
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
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-caption font-semibold uppercase" style={riskBadgeStyle(tx.risk_level)}>
                {tx.risk_level}
              </span>
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
          <TimelineDetail icon={ShieldCheck} label="Match score" value={tx.match_score != null ? `${Math.round(tx.match_score)} / 100` : null} />
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
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);

  // The ?audit=runId param is set when navigating here from an audit context.
  // It is used to build a contextual back link so users can return to the audit
  // instead of being dropped at the global /customers list.
  const auditRunId = resolvedSearchParams.audit ?? null;

// ── Auth + permission ──────────────────────────────────────────────────
  const svc = createServiceClient();
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

  const merchantId = ctx.merchantId;
  const { id } = resolvedParams;
  const profileId = id;

  // ── Fetch profile (merchant-scoped) ────────────────────────────────────
  const profileRow = await fetchMerchantScopedCustomerProfile(svc, merchantId, profileId);
  if (!profileRow) notFound();

  const profile = profileRow as any;

  // ── Watchlist check ────────────────────────────────────────────────────
  const { data: watchlistRow } = await svc
    .from('watchlist_entries')
    .select('id')
    .eq('customer_profile_id', profileId)
    .eq('merchant_id', merchantId)
    .eq('removed_by_merchant', false)
    .maybeSingle() as unknown as { data: { id: string } | null };

  // ── Transactions (merchant-scoped — no cross-tenant leak) ──────────────
  // fetchMerchantScopedCustomerTransactions scopes all reads through
  // merchant-owned processing_jobs.id and never falls back to unconstrained
  // email/card/IP queries.
  const transactions: Array<any> = await fetchMerchantScopedCustomerTransactions(
    svc,
    merchantId,
    profileId,
    profile,
    { select: TX_SELECT }
  );

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

  // -------------------------------------------------------------------------
  // Build narrative
  // -------------------------------------------------------------------------
  const narrative = buildBehavioralNarrative({
    totalOrders: profile.total_orders,
    totalRefundClaims: profile.total_refund_claims,
    refundRate: profile.refund_rate,
    fastestClaimDays: profile.fastest_claim_days,
    avgClaimDays: profile.avg_claim_days,
    refundAccelerationScore: profile.refund_acceleration_score,
    firstSeen: profile.first_seen,
    lastSeen: profile.last_seen,
    fraudFlags: profile.identity_signals ?? profile.fraud_flags,
    linkedAccountCount: 0,
  });

  const displayName = profile.names[0] ?? profile.primary_email ?? 'Unknown Customer';
  const variantCount = identityTimeline.filter((e) => e.isVariant).length;

  // -------------------------------------------------------------------------
  // Fetch activity log
  // -------------------------------------------------------------------------
  const { data: activityRows } = await svc
    .from('customer_activity_log' as any)
    .select('id, event_type, event_data, created_at')
    .eq('profile_id', profileId)
    .eq('merchant_id', merchantId ?? user.id)
    .order('created_at', { ascending: false })
    .limit(20) as unknown as { data: Array<{ id: string; event_type: string; event_data: Record<string, unknown>; created_at: string }> | null };

  const activityLog = activityRows ?? [];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  const refundRate = Math.round(profile.refund_rate * 100);
  const isEligibleForEvidence = transactions.some((tx: any) => tx.refund_claimed || tx.chargeback_filed) || profile.total_chargebacks > 0;
  const totalOrderValue = transactions.reduce((sum: number, tx: any) => sum + (Number(tx.order_value) || 0), 0);
  const totalRefundedValue = 0;
  const claimCount = transactions.filter((tx: any) => tx.refund_claimed || tx.chargeback_filed).length;
  const identitySignals = ((profile as any).identity_signals ?? profile.fraud_flags ?? []) as string[];
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
    })),
    identityTimeline,
    notes: [],
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
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

      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <div className="flex items-center gap-[var(--space-3)] mb-2">
            <h1 className="text-h1">{displayName}</h1>
            <ConfidenceBadge grade={riskLevelToNewGrade(profile.risk_level)} />
            <RiskScoreBadge score={Math.round(profile.risk_score)} level={profile.risk_level} />
          </div>
          {profile.primary_email && profile.names[0] && (
            <p className="text-body-sm mt-1" style={{ color: 'var(--text-muted)' }}>{profile.primary_email}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
          <WatchlistStarButton
            customerProfileId={profile.id}
            displayName={profile.names[0] ?? undefined}
            displayEmail={profile.primary_email ?? undefined}
            lastSeenRisk={profile.risk_level}
            initialWatchlisted={!!watchlistRow}
          />
          <InvestigationStatusSelect profileId={profile.id} initialStatus={(profile as any).investigation_status ?? 'new'} />
          {isEligibleForEvidence ? (
            <Link
              href={`/customers/${profile.id}/evidence/new`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
              style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
            >
              <FileText className="h-3.5 w-3.5" />
              Generate evidence package
            </Link>
          ) : (
            <span
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold opacity-40 cursor-not-allowed"
              title="No eligible orders for evidence generation"
              style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              <FileText className="h-3.5 w-3.5" />
              Generate evidence package
            </span>
          )}
        </div>
      </div>

      {FLAG_EXPERIENCE_POLISH_V1 && (
        <div className="mb-[var(--space-5)]">
          <CaseSummaryStrip
            flaggedAt={profile.first_seen}
            orders={profile.total_orders}
            exposure={totalOrderValue}
            cadence={Math.min(5, Math.max(1, Math.ceil(profile.total_orders / 3)))}
            lastSeen={profile.last_seen}
            density={density}
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-[var(--space-6)]">
        <div className="xl:col-span-8 space-y-[var(--space-5)]">
          <SectionCard title="Customer Roadmap" description="Chronological order, with the transaction and claim details a merchant needs to act on.">
            <div className="mb-[var(--space-5)] rounded-lg border p-[var(--space-4)]" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}>
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <p className="text-body-sm leading-relaxed" style={{ color: 'var(--text)' }}>{narrative}</p>
              </div>

              <div className="mt-[var(--space-4)]">
                <div className="flex items-center justify-between text-caption mb-1" style={{ color: 'var(--text-muted)' }}>
                  <span>Review priority</span>
                  <span className="font-semibold" style={{ color: 'var(--text)' }}>{Math.round(profile.risk_score)} / 100</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
                  <div className="h-full rounded-full" style={{ ...riskBarStyle(profile.risk_level), width: `${Math.min(profile.risk_score, 100)}%` }} />
                </div>
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
              <MetricCard label="Orders" value={profile.total_orders} hint={formatCurrencyNullable(totalOrderValue)} density="compact" />
              <MetricCard label="Claims" value={claimCount || profile.total_refund_claims} hint={`${refundRate}% refund rate`} density="compact" />
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

          {identityTimeline.length > 0 && (
            <SectionCard title="Identity Trail" description={variantCount > 0 ? `${variantCount} change${variantCount > 1 ? 's' : ''} detected` : undefined}>
              <IdentityTimeline entries={identityTimeline} />
            </SectionCard>
          )}

          <SectionCard title={`Linked identities (${linkedAccounts.length})`}>
            {linkedAccounts.length === 0 ? (
              <EmptyState title="No linked identities" description="No additional identity records were connected to this customer." />
            ) : (
              <ul className="space-y-2">
                {linkedAccounts.map((acc: any, index: number) => (
                  <li key={index} className="rounded-lg border p-3" style={{ background: 'var(--watchlist-bg)', borderColor: 'var(--watchlist-bd)' }}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-caption font-semibold uppercase" style={{ color: 'var(--watchlist)' }}>{labelize(acc.entityType)}</span>
                      <span className="text-caption" style={{ color: 'var(--text-muted)' }}>{acc.confidence}%</span>
                    </div>
                    <p className="mt-1 font-mono break-all text-caption" style={{ color: 'var(--text)' }}>{acc.entityValue}</p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

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
