'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import IdentityTimeline from './IdentityTimeline';
import ConfidenceGrade, { riskLevelToGrade } from '@/components/ConfidenceGrade';
import WatchlistStarButton from '@/components/audit/WatchlistStarButton';
import CustomerNotes from '@/components/audit/CustomerNotes';
import type { CustomerIntelligencePanel } from '@/app/api/customers/[id]/route';
import { STATUS_LABELS, STATUS_OPTIONS, statusStyle } from '@/lib/utils/investigationStatus';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function riskTok(level: string) {
  if (level === 'critical' || level === 'high' || level === 'medium' || level === 'low') return level;
  return 'low';
}

function riskBadgeStyle(level: string): React.CSSProperties {
  const t = riskTok(level);
  return {
    background: `var(--risk-${t}-bg)`,
    borderColor: `var(--risk-${t}-bd)`,
    color: `var(--risk-${t})`,
    border: `1px solid var(--risk-${t}-bd)`,
  };
}

function riskBarStyle(level: string): React.CSSProperties {
  return { background: `var(--risk-${riskTok(level)})` };
}

function fmt(n: number, max = 100) {
  return Math.round((n / max) * 100);
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch { return iso; }
}

function formatCurrency(n: number | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function DrawerSkeleton() {
  return (
    <div className="animate-pulse p-6 space-y-5">
      <div className="h-6 rounded w-2/3" style={{ background: 'var(--bg-subtle)' }} />
      <div className="h-4 rounded w-1/2" style={{ background: 'var(--bg-subtle)' }} />
      <div className="space-y-3 mt-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 rounded w-full" style={{ background: 'var(--bg-subtle)' }} />
        ))}
      </div>
      <div className="h-32 rounded mt-4" style={{ background: 'var(--bg-subtle)' }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pt-5 mt-5 first:pt-0 first:mt-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <h3 className="text-overline mb-3">{title}</h3>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main drawer
// ---------------------------------------------------------------------------

interface CustomerIntelligenceDrawerProps {
  profileId: string | null;
  onClose: () => void;
}

export default function CustomerIntelligenceDrawer({
  profileId,
  onClose,
}: CustomerIntelligenceDrawerProps) {
  const [panel, setPanel] = useState<CustomerIntelligencePanel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ordersExpanded, setOrdersExpanded] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Fetch data whenever a new profileId is selected
  useEffect(() => {
    if (!profileId) {
      setPanel(null);
      return;
    }

    setLoading(true);
    setError(null);
    setPanel(null);
    setOrdersExpanded(false);

    fetch(`/api/customers/${profileId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: CustomerIntelligencePanel) => {
        setPanel(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [profileId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Click outside
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const isOpen = !!profileId;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={handleOverlayClick}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Customer intelligence panel"
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[624px] shadow-2xl transform transition-transform duration-300 ease-in-out overflow-y-auto flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: 'var(--bg-surface)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <h2 className="text-heading-sm">Customer Profile</h2>
          <div className="flex items-center gap-3">
            {profileId && (
              <Link
                href={`/customers/${profileId}`}
                onClick={onClose}
                className="text-xs px-2.5 py-1 rounded border transition-colors hover:bg-[var(--bg-subtle)]"
                style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
              >
                Full page →
              </Link>
            )}
            <button
              onClick={onClose}
              aria-label="Close panel"
              className="p-1.5 rounded-md transition-colors"
              style={{ color: 'var(--icon-muted)' }}
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-6">
          {loading && <DrawerSkeleton />}

          {error && (
            <div className="rounded-lg p-4 text-sm border" style={{ background: 'var(--risk-critical-bg)', borderColor: 'var(--risk-critical-bd)', color: 'var(--risk-critical)' }}>
              Failed to load customer data. Please try again.
            </div>
          )}

          {panel && !loading && (
            <DrawerContent
              panel={panel}
              ordersExpanded={ordersExpanded}
              onToggleOrders={() => setOrdersExpanded((v) => !v)}
            />
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Inner content — separated to keep the outer component readable
// ---------------------------------------------------------------------------

function DrawerContent({
  panel,
  ordersExpanded,
  onToggleOrders,
}: {
  panel: CustomerIntelligencePanel;
  ordersExpanded: boolean;
  onToggleOrders: () => void;
}) {
  const { profile, orderHistory, identityTimeline, linkedAccounts, narrative } = panel;
  const visibleOrders = ordersExpanded ? orderHistory : orderHistory.slice(0, 10);
  const variantCount = identityTimeline.filter((e) => e.isVariant).length;

  // Optimistic investigation status
  const [status, setStatus] = useState<string>((profile as any).investigation_status ?? 'new');
  const [statusSaving, setStatusSaving] = useState(false);

  async function handleStatusChange(newStatus: string) {
    const prev = status;
    setStatus(newStatus);
    setStatusSaving(true);
    const res = await fetch(`/api/customers/${profile.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) setStatus(prev);
    setStatusSaving(false);
  }

  // Derive recommended next action
  const grade = riskLevelToGrade(profile.risk_level);
  const refundRate = Math.round(profile.refund_rate * 100);
  const isEligibleForEvidence = orderHistory.some((o) => o.refundClaimed) || profile.total_chargebacks > 0;
  let recommendedAction = '';
  if (grade === 'definite' || grade === 'probable') {
    if (isEligibleForEvidence) recommendedAction = 'Generate evidence package and submit to payment processor.';
    else recommendedAction = 'Manually review order history and flag for investigation.';
  } else if (grade === 'possible') {
    recommendedAction = 'Monitor for repeat claims before escalating.';
  } else {
    recommendedAction = 'No immediate action required.';
  }

  return (
    <div>
      {/* ── Compact confidence block ──────────────────────────────── */}
      <div className="mb-5 rounded-xl p-4 border" style={{ background: 'var(--accent-soft)', borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-base font-semibold truncate" style={{ color: 'var(--text)' }}>
              {profile.names[0] ?? profile.primary_email ?? 'Unknown'}
            </p>
            {profile.primary_email && profile.names[0] && (
              <p className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>{profile.primary_email}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ConfidenceGrade grade={grade} />
            <WatchlistStarButton
              customerProfileId={profile.id}
              displayName={profile.names[0] ?? undefined}
              displayEmail={profile.primary_email ?? undefined}
              lastSeenRisk={profile.risk_level}
              initialWatchlisted={profile.on_watchlist}
              watchlistEntryId={profile.watchlist_entry_id ?? null}
            />
          </div>
        </div>

        {/* Key metrics row */}
        <div className="grid grid-cols-4 gap-3 mb-3">
          {[
            { label: 'Score', value: Math.round(profile.risk_score) },
            { label: 'Orders', value: profile.total_orders },
            { label: 'Refunds', value: profile.total_refund_claims },
            { label: 'Refund rate', value: `${refundRate}%` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] uppercase font-medium tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
              <p className="text-sm font-semibold font-mono" style={{ color: 'var(--text)' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Recommended action */}
        <div className="rounded-lg px-3 py-2.5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-[10px] uppercase font-medium tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>Recommended action</p>
          <p className="text-xs" style={{ color: 'var(--text)' }}>{recommendedAction}</p>
        </div>

        {/* Status + Generate evidence row */}
        <div className="flex items-center gap-2 mt-3">
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={statusSaving}
            className="text-xs rounded-md px-2.5 py-1.5 font-medium focus:outline-none cursor-pointer disabled:opacity-60 flex-1"
            style={statusStyle(status)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          {isEligibleForEvidence ? (
            <Link
              href={`/customers/${profile.id}/evidence/new`}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex-shrink-0"
              style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
            >
              Generate evidence
            </Link>
          ) : (
            <span
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold opacity-40 cursor-not-allowed"
              title="No eligible orders found — customer needs at least one refund claim or chargeback"
              style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              Generate evidence
            </span>
          )}
        </div>
        {!isEligibleForEvidence && (
          <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-subtle)' }}>
            Evidence generation requires at least one refund claim or chargeback in the customer history.
          </p>
        )}
      </div>

      {/* ── Behavioral context ────────────────────────────────────── */}
      <Section title="Behavioral context">
        <p className="text-body-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{narrative}</p>
        {((profile as any).identity_signals ?? profile.fraud_flags ?? []).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {((profile as any).identity_signals ?? profile.fraud_flags ?? []).map((f: string, i: number) => (
              <span
                key={i}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
              >
                {f}
              </span>
            ))}
          </div>
        )}
        {profile.refund_acceleration_score > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
              <span>Refund acceleration</span>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>{profile.refund_acceleration_score}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(profile.refund_acceleration_score, 100)}%`,
                  background: profile.refund_acceleration_score >= 75 ? 'var(--risk-critical)' :
                              profile.refund_acceleration_score >= 50 ? 'var(--risk-high)' :
                              'var(--risk-medium)',
                }}
              />
            </div>
          </div>
        )}
      </Section>

      {/* ── Prior dispute / refund pattern ───────────────────────── */}
      <Section title="Order & refund history">
        {orderHistory.length === 0 ? (
          <p className="text-body-sm italic" style={{ color: 'var(--text-muted)' }}>No orders in current dataset.</p>
        ) : (
          <>
            <div className="space-y-2">
              {visibleOrders.map((order, i) => (
                <div
                  key={i}
                  className="rounded-lg p-3 text-sm"
                  style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-xs truncate" style={{ color: 'var(--text-muted)' }}>{order.orderId}</span>
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold uppercase"
                      style={riskBadgeStyle(order.riskLevel)}
                    >
                      {order.riskLevel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>{formatDate(order.date)}</span>
                    <span className="font-medium" style={{ color: 'var(--text)' }}>{formatCurrency(order.orderValue)}</span>
                  </div>
                  {order.refundClaimed && (
                    <p className="mt-1 text-xs font-medium" style={{ color: 'var(--risk-high)' }}>
                      Prior dispute/refund pattern{order.refundReason ? ` · ${order.refundReason}` : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {orderHistory.length > 10 && (
              <button
                onClick={onToggleOrders}
                className="mt-3 text-xs hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                {ordersExpanded ? 'Show fewer' : `Show all ${orderHistory.length} orders`}
              </button>
            )}
          </>
        )}
      </Section>

      {/* ── Identity timeline ─────────────────────────────────────── */}
      {identityTimeline.length > 0 && (
        <Section title={`Identity timeline${variantCount > 0 ? ` · ${variantCount} change${variantCount > 1 ? 's' : ''}` : ''}`}>
          <IdentityTimeline entries={identityTimeline} />
        </Section>
      )}

      {/* ── Linked accounts ───────────────────────────────────────── */}
      {linkedAccounts.length > 0 && (
        <Section title={`Linked identities (${linkedAccounts.length})`}>
          <ul className="space-y-2">
            {linkedAccounts.slice(0, 8).map((acc, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium shrink-0"
                  style={{ background: 'var(--watchlist-bg)', color: 'var(--watchlist)', border: '1px solid var(--watchlist-bd)' }}
                >
                  {acc.entityType}
                </span>
                <span className="font-mono break-all text-xs" style={{ color: 'var(--text)' }}>{acc.entityValue}</span>
                <span className="text-xs shrink-0 ml-auto" style={{ color: 'var(--text-subtle)' }}>{acc.confidence}%</span>
              </li>
            ))}
            {linkedAccounts.length > 8 && (
              <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>+{linkedAccounts.length - 8} more</p>
            )}
          </ul>
        </Section>
      )}

      {/* ── Merchant notes ────────────────────────────────────────── */}
      <Section title="Merchant notes">
        <CustomerNotes customerProfileId={profile.id} />
      </Section>

    </div>
  );
}
