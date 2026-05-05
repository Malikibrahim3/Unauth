import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { buildBehavioralNarrative } from '@/lib/customers/narrative';
import IdentityTimeline from '@/components/customers/IdentityTimeline';
import WatchlistStarButton from '@/components/audit/WatchlistStarButton';
import CustomerNotes from '@/components/audit/CustomerNotes';
import { ConfidenceBadge, riskLevelToNewGrade } from '@/components/ui/ConfidenceBadge';
import { RiskScoreBadge } from '@/components/ui/RiskScoreBadge';
import { SectionCard } from '@/components/ui/SectionCard';
import { MetricCard } from '@/components/ui/MetricCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import InvestigationStatusSelect from '@/components/customers/InvestigationStatusSelect';
import type { CustomerIntelligencePanel } from '@/app/api/customers/[id]/route';
import { riskBadgeStyle, riskBarStyle } from '@/lib/utils/riskStyles';
import { formatCurrencyNullable, formatDateShort } from '@/lib/utils/format';

interface PageProps {
  params: { id: string };
  searchParams: { audit?: string };
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

  // The ?audit=runId param is set when navigating here from an audit context.
  // It is used to build a contextual back link so users can return to the audit
  // instead of being dropped at the global /customers list.
  const auditRunId = searchParams.audit ?? null;

  const svc = createServiceClient();
  const { data: merchantRow } = await svc
    .from('merchants')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  const merchantId = merchantRow?.id ?? null;

  const { id } = params;
  const profileId = id;

  // -------------------------------------------------------------------------
  // Fetch profile
  // -------------------------------------------------------------------------
  const merchantFilter = merchantId
    ? `merchant_ids.cs.${JSON.stringify([user.id])},merchant_ids.cs.${JSON.stringify([merchantId])}`
    : `merchant_ids.cs.${JSON.stringify([user.id])}`;

  const { data: profileRow } = await svc
    .from('customer_profiles')
    .select('*')
    .eq('id', profileId)
    .or(merchantFilter)
    .single() as unknown as { data: Record<string, unknown> | null };

  if (!profileRow) notFound();

  const profile = profileRow as any;

  // -------------------------------------------------------------------------
  // Watchlist check
  // -------------------------------------------------------------------------
  const { data: watchlistRow } = await svc
    .from('watchlist_entries')
    .select('id')
    .eq('customer_profile_id', profileId)
    .eq('merchant_id', merchantId ?? user.id)
    .eq('removed_by_merchant', false)
    .maybeSingle() as unknown as { data: { id: string } | null };

  // -------------------------------------------------------------------------
  // Audit appearances → fetch transactions
  // -------------------------------------------------------------------------
  const { data: appearances } = await svc
    .from('customer_profile_audit_appearances')
    .select('audit_id')
    .eq('profile_id', profileId) as unknown as { data: { audit_id: string }[] | null };

  const auditIds = (appearances ?? []).map((a) => a.audit_id);

  let transactions: Array<any> = [];

  if (auditIds.length > 0) {
    let txQuery = svc
      .from('audit_transactions')
      .select(
        'order_id,order_date,customer_email,customer_name,shipping_address,device_ip,card_last4,order_value,match_score,fraud_flags,risk_level,refund_status,refund_claimed,refund_requested,refund_reason,refund_date,refund_amount,return_requested,chargeback_dispute,chargeback_date,chargeback_reason_code,processed_at'
      )
      .in('job_id', auditIds)
      .order('processed_at', { ascending: true })
      .limit(200);

    if (profile.emails.length > 0) {
      txQuery = txQuery.in('customer_email', profile.emails);
    } else if (profile.card_last4s.length > 0) {
      txQuery = txQuery.in('card_last4', profile.card_last4s);
    }

    const { data: txData } = await txQuery as unknown as { data: typeof transactions | null };
    transactions = txData ?? [];
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

  // -------------------------------------------------------------------------
  // Fetch linked accounts (clusters)
  // -------------------------------------------------------------------------
  const linkedAccounts: Array<{ entityType: string; entityValue: string; confidence: number }> = [];
  if (profile.emails && profile.emails.length > 0) {
    const { data: clusterRows } = await svc
      .from('fraud_identity_clusters')
      .select('cluster_id,entity_type,entity_value,confidence')
      .in('entity_value', profile.emails)
      .limit(50) as unknown as { data: Array<{ cluster_id: string; entity_type: string; entity_value: string; confidence: number; }> | null };

    if (clusterRows && clusterRows.length > 0) {
      const clusterIds = [...new Set(clusterRows.map((r) => r.cluster_id))];
      const { data: allClusterMembers } = await svc
        .from('fraud_identity_clusters')
        .select('cluster_id,entity_type,entity_value,confidence')
        .in('cluster_id', clusterIds)
        .not('entity_value', 'in', `(${profile.emails.map((e: string) => `"${e}"`).join(',')})`)
        .limit(100) as unknown as { data: Array<{ cluster_id: string; entity_type: string; entity_value: string; confidence: number; }> | null };

      for (const member of allClusterMembers ?? []) {
        linkedAccounts.push({ entityType: member.entity_type, entityValue: member.entity_value, confidence: member.confidence });
      }
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
  const isEligibleForEvidence = transactions.some((tx: any) => tx.refund_requested ?? tx.refund_claimed) || profile.total_chargebacks > 0;

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
              Generate evidence package
            </Link>
          ) : (
            <span
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold opacity-40 cursor-not-allowed"
              title="No eligible orders for evidence generation"
              style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              Generate evidence package
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-[var(--space-6)]">
        <div className="xl:col-span-8 space-y-[var(--space-5)]">
          <SectionCard title="Identity Overview">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--space-3)] mb-[var(--space-4)]">
              <MetricCard label="Risk score" value={Math.round(profile.risk_score)} density="compact" />
              <MetricCard label="Orders" value={profile.total_orders} density="compact" />
              <MetricCard label="Refund claims" value={profile.total_refund_claims} density="compact" />
              <MetricCard label="Chargebacks" value={profile.total_chargebacks} density="compact" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--space-3)] mb-[var(--space-4)] pt-[var(--space-4)]" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <MetricCard label="Refund rate" value={`${refundRate}%`} density="compact" />
              <MetricCard label="Merchants" value={profile.total_merchants_seen_at} density="compact" />
              <MetricCard label="Fastest claim" value={profile.fastest_claim_days != null ? `${profile.fastest_claim_days}d` : '—'} density="compact" />
              <MetricCard label="Avg claim" value={profile.avg_claim_days != null ? `${Math.round(profile.avg_claim_days)}d` : '—'} density="compact" />
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between text-caption mb-1" style={{ color: 'var(--text-muted)' }}>
                <span>Risk score</span>
                <span className="font-semibold" style={{ color: 'var(--text)' }}>{Math.round(profile.risk_score)}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
                <div className="h-full rounded-full" style={{ ...riskBarStyle(profile.risk_level), width: `${Math.min(profile.risk_score, 100)}%` }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-caption mb-1" style={{ color: 'var(--text-muted)' }}>
                <span>Profile confidence</span>
                <span className="font-semibold" style={{ color: 'var(--text)' }}>{profile.profile_confidence}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
                <div className="h-full rounded-full" style={{ width: `${profile.profile_confidence}%`, background: 'var(--info)' }} />
              </div>
            </div>

            {((profile as any).identity_signals ?? profile.fraud_flags ?? []).length > 0 && (
              <div className="mt-[var(--space-3)] flex flex-wrap gap-[var(--space-2)]">
                {((profile as any).identity_signals ?? profile.fraud_flags ?? []).map((flag: string, index: number) => (
                  <Badge key={index} tone="neutral" variant="subtle" size="sm">{flag}</Badge>
                ))}
              </div>
            )}
          </SectionCard>

          {linkedAccounts.length > 0 && (
            <SectionCard title={`Linked Identities (${linkedAccounts.length})`}>
              <ul className="space-y-2">
                {linkedAccounts.slice(0, 8).map((acc: any, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium shrink-0" style={{ background: 'var(--watchlist-bg)', color: 'var(--watchlist)', border: '1px solid var(--watchlist-bd)' }}>{acc.entityType}</span>
                    <span className="font-mono break-all text-xs" style={{ color: 'var(--text)' }}>{acc.entityValue}</span>
                    <span className="text-xs shrink-0 ml-auto" style={{ color: 'var(--text-subtle)' }}>{acc.confidence}%</span>
                  </li>
                ))}
                {linkedAccounts.length > 8 && (
                  <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>+{linkedAccounts.length - 8} more</p>
                )}
              </ul>
            </SectionCard>
          )}

          <SectionCard title="Behavioral Context">
            <p className="text-body-sm leading-relaxed" style={{ color: 'var(--text)' }}>{narrative}</p>
            {profile.refund_acceleration_score > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-caption mb-1" style={{ color: 'var(--text-muted)' }}>
                  <span>Refund acceleration score</span>
                  <span className="font-semibold" style={{ color: 'var(--text)' }}>{profile.refund_acceleration_score}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      background: profile.refund_acceleration_score >= 75
                        ? 'var(--risk-critical)'
                        : profile.refund_acceleration_score >= 50
                          ? 'var(--risk-high)'
                          : 'var(--risk-medium)',
                      width: `${Math.min(profile.refund_acceleration_score, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard title={`Order History (${transactions.length})`}>
            {transactions.length === 0 ? (
              <EmptyState title="No orders in dataset" description="No transactions found for this customer in the current dataset." />
            ) : (
              <div className="space-y-3">
                {transactions.map((tx: any, index: number) => (
                  <div
                    key={index}
                    className="rounded-lg p-4"
                    style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-caption" style={{ color: 'var(--text-muted)' }}>{tx.order_id}</span>
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-caption font-semibold uppercase"
                        style={riskBadgeStyle(tx.risk_level)}
                      >
                        {tx.risk_level}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-caption" style={{ color: 'var(--text-muted)' }}>
                      <span>{formatDateShort(tx.order_date ?? tx.processed_at)}</span>
                      <span className="font-medium text-right" style={{ color: 'var(--text)' }}>
                        {formatCurrencyNullable(tx.order_value)}
                      </span>
                      {tx.customer_email && <span className="truncate col-span-2">{tx.customer_email}</span>}
                    </div>
                    {(tx.refund_requested ?? tx.refund_claimed) && (
                      <p className="mt-1.5 text-caption font-medium" style={{ color: 'var(--risk-high)' }}>
                        Refund requested{tx.refund_reason ? ` · ${tx.refund_reason}` : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="xl:col-span-4 space-y-[var(--space-5)]">
          <SectionCard title="Identity Data">
            <dl className="space-y-3 text-body-sm">
              {profile.emails.length > 0 && (
                <div>
                  <dt className="text-caption mb-1" style={{ color: 'var(--text-muted)' }}>Email{profile.emails.length > 1 ? 's' : ''}</dt>
                  <dd className="space-y-0.5">
                    {profile.emails.map((e: string, i: number) => (
                      <p key={i} className="font-mono text-caption truncate" style={{ color: 'var(--text)' }}>{e}</p>
                    ))}
                  </dd>
                </div>
              )}
              {profile.names.length > 0 && (
                <div>
                  <dt className="text-caption mb-1" style={{ color: 'var(--text-muted)' }}>Name{profile.names.length > 1 ? 's' : ''}</dt>
                  <dd className="space-y-0.5">
                    {profile.names.map((n: string, i: number) => (
                      <p key={i} className="text-caption" style={{ color: 'var(--text)' }}>{n}</p>
                    ))}
                  </dd>
                </div>
              )}
              {profile.addresses.length > 0 && (
                <div>
                  <dt className="text-caption mb-1" style={{ color: 'var(--text-muted)' }}>Address{profile.addresses.length > 1 ? 'es' : ''}</dt>
                  <dd className="space-y-0.5">
                    {profile.addresses.slice(0, 3).map((a: string, i: number) => (
                      <p key={i} className="text-caption" style={{ color: 'var(--text)' }}>{a}</p>
                    ))}
                    {profile.addresses.length > 3 && (
                      <p className="text-caption" style={{ color: 'var(--text-subtle)' }}>+{profile.addresses.length - 3} more</p>
                    )}
                  </dd>
                </div>
              )}
              {profile.card_last4s.length > 0 && (
                <div>
                  <dt className="text-caption mb-1" style={{ color: 'var(--text-muted)' }}>Cards (last 4)</dt>
                  <dd className="flex flex-wrap gap-1">
                    {profile.card_last4s.map((c: string, i: number) => (
                      <span key={i} className="font-mono text-caption px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                        •••• {c}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
              {profile.phones && profile.phones.length > 0 && (
                <div>
                  <dt className="text-caption mb-1" style={{ color: 'var(--text-muted)' }}>Phone{profile.phones.length > 1 ? 's' : ''}</dt>
                  <dd className="space-y-0.5">
                    {profile.phones.map((p: string, i: number) => (
                      <p key={i} className="font-mono text-caption" style={{ color: 'var(--text)' }}>{p}</p>
                    ))}
                  </dd>
                </div>
              )}
              {profile.ips && profile.ips.length > 0 && (
                <div>
                  <dt className="text-caption mb-1" style={{ color: 'var(--text-muted)' }}>IP{profile.ips.length > 1 ? 's' : ''}</dt>
                  <dd className="space-y-0.5">
                    {profile.ips.slice(0, 5).map((ip: string, i: number) => (
                      <p key={i} className="font-mono text-caption" style={{ color: 'var(--text)' }}>{ip}</p>
                    ))}
                    {profile.ips.length > 5 && (
                      <p className="text-caption" style={{ color: 'var(--text-subtle)' }}>+{profile.ips.length - 5} more</p>
                    )}
                  </dd>
                </div>
              )}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div>
                  <dt className="text-caption" style={{ color: 'var(--text-muted)' }}>First seen</dt>
                  <dd className="text-caption font-medium" style={{ color: 'var(--text)' }}>{formatDateShort(profile.first_seen)}</dd>
                </div>
                <div>
                  <dt className="text-caption" style={{ color: 'var(--text-muted)' }}>Last seen</dt>
                  <dd className="text-caption font-medium" style={{ color: 'var(--text)' }}>{formatDateShort(profile.last_seen)}</dd>
                </div>
              </div>
            </dl>
          </SectionCard>

          {identityTimeline.length > 0 && (
            <SectionCard
              title="Identity Timeline"
              description={variantCount > 0 ? `${variantCount} change${variantCount > 1 ? 's' : ''} detected` : undefined}
            >
              <IdentityTimeline entries={identityTimeline} />
            </SectionCard>
          )}

          <SectionCard title="Merchant Notes">
            <CustomerNotes customerProfileId={profile.id} />
          </SectionCard>

          <SectionCard title="Activity">
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
                    case 'note_added': description = `Note added: ${d.note_preview ?? ''}…`; break;
                    case 'note_deleted': description = 'Note removed'; break;
                    case 'watchlist_added': description = 'Added to watchlist'; break;
                    case 'watchlist_removed': description = 'Removed from watchlist'; break;
                    case 'evidence_generated': description = `Evidence package generated (${d.reference_number})`; break;
                    case 'audit_appearance': description = `Appeared in ${d.audit_label ?? 'an audit'} with ${d.score ?? ''} confidence`; break;
                    case 'manually_reviewed': description = 'Marked as manually reviewed'; break;
                    default: description = entry.event_type.replace(/_/g, ' ');
                  }
                  const relativeTime = (() => {
                    const ms = Date.now() - new Date(entry.created_at).getTime();
                    const mins = Math.floor(ms / 60000);
                    if (mins < 1) return 'just now';
                    if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
                    const hrs = Math.floor(mins / 60);
                    if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
                    const days = Math.floor(hrs / 24);
                    return `${days} day${days !== 1 ? 's' : ''} ago`;
                  })();
                  return (
                    <li key={entry.id} className="flex items-start gap-2.5 text-sm">
                      <span className="mt-0.5 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--text-subtle)', marginTop: '6px' }} />
                      <span className="flex-1" style={{ color: 'var(--text)' }}>{description}</span>
                      <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-subtle)' }}>{relativeTime}</span>
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
