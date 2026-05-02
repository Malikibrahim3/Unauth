import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { buildBehavioralNarrative } from '@/lib/customers/narrative';
import IdentityTimeline from '@/components/customers/IdentityTimeline';
import WatchlistStarButton from '@/components/audit/WatchlistStarButton';
import CustomerNotes from '@/components/audit/CustomerNotes';
import ConfidenceGrade, { riskLevelToGrade } from '@/components/ConfidenceGrade';
import type { CustomerIntelligencePanel } from '@/app/api/customers/[id]/route';

interface PageProps {
  params: { id: string };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import type { CSSProperties } from 'react';

function riskBarStyle(level: string): CSSProperties {
  const t = ['low','medium','high','critical'].includes(level) ? level : 'low';
  return { background: `var(--risk-${t})` };
}

function riskBadgeStyle(level: string): CSSProperties {
  const t = ['low','medium','high','critical'].includes(level) ? level : 'low';
  return { background: `var(--risk-${t}-bg)`, color: `var(--risk-${t})`, border: `1px solid var(--risk-${t}-bd)` };
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatCurrency(n: number | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
}



// ---------------------------------------------------------------------------
// Page — server component
// ---------------------------------------------------------------------------

export default async function CustomerProfilePage({ params }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { id } = params;
  const profileId = id;

  // -------------------------------------------------------------------------
  // Fetch profile
  // -------------------------------------------------------------------------
  const { data: profileRow } = await supabase
    .from('customer_profiles')
    .select('*')
    .eq('id', profileId)
    .contains('merchant_ids', JSON.stringify([user.id]))
    .single() as unknown as { data: Record<string, unknown> | null };

  if (!profileRow) notFound();

  const profile = profileRow as any;

  // -------------------------------------------------------------------------
  // Watchlist check
  // -------------------------------------------------------------------------
  const { data: watchlistRow } = await supabase
    .from('watchlist_entries')
    .select('id')
    .eq('customer_profile_id', profileId)
    .eq('merchant_id', user.id)
    .maybeSingle() as unknown as { data: { id: string } | null };

  // -------------------------------------------------------------------------
  // Audit appearances → fetch transactions
  // -------------------------------------------------------------------------
  const { data: appearances } = await supabase
    .from('customer_profile_audit_appearances')
    .select('audit_id')
    .eq('profile_id', profileId) as unknown as { data: { audit_id: string }[] | null };

  const auditIds = (appearances ?? []).map((a) => a.audit_id);

  let transactions: Array<any> = [];

  if (auditIds.length > 0 && (profile.emails.length > 0 || profile.card_last4s.length > 0)) {
    let txQuery = supabase
      .from('audit_transactions')
      .select(
        'order_id,customer_email,customer_name,shipping_address,device_ip,card_last4,order_value,match_score,identity_signals,risk_level,refund_claimed,refund_reason,processed_at'
      )
      .in('job_id', auditIds)
      .order('processed_at', { ascending: true })
      .limit(200);

    if (profile.emails.length > 0) {
      txQuery = txQuery.in('customer_email', profile.emails);
    } else {
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
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        <Link href="/customers" className="hover:underline">
          Customers
        </Link>
        <span>/</span>
        <span className="font-medium truncate max-w-xs" style={{ color: 'var(--text)' }}>{displayName}</span>
      </nav>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-heading-lg">{displayName}</h1>
          {profile.primary_email && profile.names[0] && (
            <p className="text-body-sm mt-1" style={{ color: 'var(--text-muted)' }}>{profile.primary_email}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <ConfidenceGrade grade={riskLevelToGrade(profile.risk_level)} />
          <WatchlistStarButton
            customerProfileId={profile.id}
            displayName={profile.names[0] ?? undefined}
            displayEmail={profile.primary_email ?? undefined}
            lastSeenRisk={profile.risk_level}
            initialWatchlisted={!!watchlistRow}
          />
          <Link
            href={`/customers/${profile.id}/evidence/new`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
            style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
          >
            Generate evidence package
          </Link>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left column — 60% */}
        <div className="lg:col-span-3 space-y-8">
          {/* Risk overview */}
          <section className="rounded-xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <h2 className="text-overline mb-4">Identity Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-caption mb-1" style={{ color: 'var(--text-muted)' }}>Match confidence</p>
                <p className="text-display-sm font-bold" style={{ color: 'var(--text)' }}>
                  {Math.round(profile.risk_score)}
                </p>
              </div>
              <div>
                <p className="text-caption mb-1" style={{ color: 'var(--text-muted)' }}>Orders</p>
                <p className="text-display-sm font-bold" style={{ color: 'var(--text)' }}>{profile.total_orders}</p>
              </div>
              <div>
                <p className="text-caption mb-1" style={{ color: 'var(--text-muted)' }}>Refund rate</p>
                <p className="text-display-sm font-bold" style={{ color: 'var(--text)' }}>
                  {Math.round(profile.refund_rate * 100)}%
                </p>
              </div>
              <div>
                <p className="text-caption mb-1" style={{ color: 'var(--text-muted)' }}>Profile confidence</p>
                <p className="text-display-sm font-bold" style={{ color: 'var(--text)' }}>{profile.profile_confidence}%</p>
              </div>
            </div>

            {/* Risk bar */}
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
              <div
                className="h-full rounded-full"
                style={{ ...riskBarStyle(profile.risk_level), width: `${Math.min(profile.risk_score, 100)}%` }}
              />
            </div>

            {(profile.identity_signals ?? profile.fraud_flags ?? []).length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {(profile.identity_signals ?? profile.fraud_flags ?? []).map((f: string, i: number) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 rounded text-caption font-medium"
                    style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Behavioral context */}
          <section className="rounded-xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <h2 className="text-overline mb-3">Behavioral Context</h2>
            <p className="text-body-sm leading-relaxed" style={{ color: 'var(--text)' }}>{narrative}</p>
            {profile.refund_acceleration_score > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-caption mb-1" style={{ color: 'var(--text-muted)' }}>
                  <span>Refund acceleration score</span>
                  <span className="font-semibold" style={{ color: 'var(--text)' }}>
                    {profile.refund_acceleration_score}
                  </span>
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
          </section>

          {/* Order history */}
          <section className="rounded-xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <h2 className="text-overline mb-4">Order History ({transactions.length})</h2>
            {transactions.length === 0 ? (
              <p className="text-body-sm italic" style={{ color: 'var(--text-muted)' }}>No orders in current dataset.</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx, i) => (
                  <div
                    key={i}
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
                      <span>{formatDate(tx.processed_at)}</span>
                      <span className="font-medium text-right" style={{ color: 'var(--text)' }}>
                        {formatCurrency(tx.order_value)}
                      </span>
                      {tx.customer_email && <span className="truncate col-span-2">{tx.customer_email}</span>}
                    </div>
                    {tx.refund_claimed && (
                      <p className="mt-1.5 text-caption font-medium" style={{ color: 'var(--risk-high)' }}>
                        Refund claimed{tx.refund_reason ? ` · ${tx.refund_reason}` : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right column — 40% */}
        <div className="lg:col-span-2 space-y-8">
          {/* Identity data */}
          <section className="rounded-xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <h2 className="text-overline mb-4">Identity Data</h2>
            <dl className="space-y-3 text-body-sm">
              {profile.emails.length > 0 && (
                <div>
                  <dt className="text-caption mb-1" style={{ color: 'var(--text-muted)' }}>
                    Email{profile.emails.length > 1 ? 's' : ''}
                  </dt>
                  <dd className="space-y-0.5">
                    {profile.emails.map((e: string, i: number) => (
                      <p key={i} className="font-mono text-caption truncate" style={{ color: 'var(--text)' }}>{e}</p>
                    ))}
                  </dd>
                </div>
              )}
              {profile.names.length > 0 && (
                <div>
                  <dt className="text-caption mb-1" style={{ color: 'var(--text-muted)' }}>
                    Name{profile.names.length > 1 ? 's' : ''}
                  </dt>
                  <dd className="space-y-0.5">
                    {profile.names.map((n: string, i: number) => (
                      <p key={i} className="text-caption" style={{ color: 'var(--text)' }}>{n}</p>
                    ))}
                  </dd>
                </div>
              )}
              {profile.addresses.length > 0 && (
                <div>
                  <dt className="text-caption mb-1" style={{ color: 'var(--text-muted)' }}>
                    Address{profile.addresses.length > 1 ? 'es' : ''}
                  </dt>
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
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div>
                  <dt className="text-caption" style={{ color: 'var(--text-muted)' }}>First seen</dt>
                  <dd className="text-caption font-medium" style={{ color: 'var(--text)' }}>{formatDate(profile.first_seen)}</dd>
                </div>
                <div>
                  <dt className="text-caption" style={{ color: 'var(--text-muted)' }}>Last seen</dt>
                  <dd className="text-caption font-medium" style={{ color: 'var(--text)' }}>{formatDate(profile.last_seen)}</dd>
                </div>
              </div>
            </dl>
          </section>

          {/* Identity timeline */}
          {identityTimeline.length > 0 && (
            <section className="rounded-xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <h2 className="text-overline mb-4">
                Identity Timeline
                {variantCount > 0 && (
                  <span className="ml-2 normal-case font-normal" style={{ color: 'var(--risk-high)' }}>
                    · {variantCount} change{variantCount > 1 ? 's' : ''}
                  </span>
                )}
              </h2>
              <IdentityTimeline entries={identityTimeline} />
            </section>
          )}

          {/* Merchant notes */}
          <section className="rounded-xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <h2 className="text-overline mb-4">Merchant Notes</h2>
            <CustomerNotes customerProfileId={profile.id} />
          </section>
        </div>
      </div>
    </div>
  );
}
