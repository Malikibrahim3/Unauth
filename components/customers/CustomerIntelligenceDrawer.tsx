'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentType, CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CalendarDays,
  CreditCard,
  ExternalLink,
  FileText,
  GitBranch,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { ConfidenceBadge, riskLevelToNewGrade } from '@/components/ui/ConfidenceBadge';
import WatchlistStarButton from '@/components/audit/WatchlistStarButton';
import CustomerNotes from '@/components/audit/CustomerNotes';
import type { CustomerIntelligencePanel, OrderHistoryEntry } from '@/app/api/customers/[id]/route';
import { STATUS_LABELS, STATUS_OPTIONS, statusStyle } from '@/lib/utils/investigationStatus';
import { riskBadgeStyle, riskBarStyle, riskTok } from '@/lib/utils/riskStyles';
import { formatCurrencyNullable, formatDate } from '@/lib/utils/format';
import { Badge } from '@/components/ui/Badge';
import type { BadgeTone } from '@/components/ui/Badge';

function DrawerSkeleton() {
  return (
    <div className="animate-pulse p-6 space-y-5">
      <div className="h-6 rounded w-2/3" style={{ background: 'var(--bg-subtle)' }} />
      <div className="h-4 rounded w-1/2" style={{ background: 'var(--bg-subtle)' }} />
      <div className="grid grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-20 rounded-lg" style={{ background: 'var(--bg-subtle)' }} />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 rounded-lg" style={{ background: 'var(--bg-subtle)' }} />
        ))}
      </div>
    </div>
  );
}

function RoadmapSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="pt-5 mt-5 first:pt-0 first:mt-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <h3 className="text-overline mb-3">{title}</h3>
      {children}
    </section>
  );
}

function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}>
      <p className="text-caption" style={{ color: 'var(--text-subtle)' }}>{label}</p>
      <p className="mt-1 text-base font-semibold" style={{ color: 'var(--text)' }}>{value}</p>
      {hint && <p className="mt-1 text-caption truncate" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  );
}

function DetailLine({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  if (value == null || value === '') return null;
  return (
    <div className="flex items-start gap-2 min-w-0">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-subtle)' }} />
      <div className="min-w-0">
        <p className="text-[11px] leading-4" style={{ color: 'var(--text-subtle)' }}>{label}</p>
        <p className={`text-xs leading-5 break-words ${mono ? 'font-mono' : ''}`} style={{ color: 'var(--text)' }}>
          {value}
        </p>
      </div>
    </div>
  );
}

function flagLabel(flag: string) {
  return flag
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

/** Derives a concise recommended action string from risk level. */
function recommendedAction(riskLevel: string): { label: string; tone: BadgeTone } {
  switch ((riskLevel ?? '').toLowerCase()) {
    case 'critical':
      return { label: 'Block & escalate', tone: 'critical' };
    case 'high':
      return { label: 'Hold for review', tone: 'danger' };
    case 'medium':
      return { label: 'Monitor closely', tone: 'warning' };
    case 'low':
      return { label: 'Clear to fulfil', tone: 'success' };
    default:
      return { label: 'Pending review', tone: 'neutral' };
  }
}

/** One-line "why" from the narrative or fallback signals. */
function triageWhySummary(
  riskLevel: string,
  riskScore: number,
  claimCount: number,
  variantCount: number,
): string {
  const level = (riskLevel ?? '').toLowerCase();
  const parts: string[] = [];
  if (riskScore >= 80) parts.push(`risk score ${Math.round(riskScore)}/100`);
  if (claimCount > 0) parts.push(`${claimCount} claim${claimCount !== 1 ? 's' : ''}`);
  if (variantCount > 0) parts.push(`${variantCount} identity variant${variantCount !== 1 ? 's' : ''}`);
  if (parts.length === 0) return 'No critical signals detected at this time.';
  const prefix =
    level === 'critical' || level === 'high'
      ? 'Flagged due to'
      : level === 'medium'
      ? 'Elevated risk from'
      : 'Low risk —';
  return `${prefix} ${parts.join(', ')}.`;
}

function lifecycleTitle(order: OrderHistoryEntry) {
  if (order.chargebackFiled) return 'Chargeback filed';
  if (order.refundRequested) return 'Refund or return claim';
  if (riskTok(order.riskLevel) === 'critical' || riskTok(order.riskLevel) === 'high') return 'Order requiring review';
  return 'Order placed';
}

function OrderRoadmapCard({ order, isLast }: { order: OrderHistoryEntry; isLast: boolean }) {
  const hasClaim = order.refundRequested || order.returnRequested || order.chargebackFiled;

  return (
    <li className="relative pl-9 pb-4 last:pb-0">
      {!isLast && (
        <span
          aria-hidden="true"
          className="absolute left-[11px] top-7 bottom-0 w-px"
          style={{ background: 'var(--border-subtle)' }}
        />
      )}
      <span
        aria-hidden="true"
        className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border"
        style={{
          background: hasClaim ? 'var(--risk-high-bg)' : 'var(--bg-surface)',
          borderColor: hasClaim ? 'var(--risk-high-bd)' : 'var(--border)',
          color: hasClaim ? 'var(--risk-high)' : 'var(--text-muted)',
        }}
      >
        {order.chargebackFiled ? <AlertTriangle className="h-3.5 w-3.5" /> : hasClaim ? <RotateCcw className="h-3.5 w-3.5" /> : <ReceiptText className="h-3.5 w-3.5" />}
      </span>

      <article className="rounded-lg border p-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{lifecycleTitle(order)}</p>
            <p className="mt-0.5 text-caption font-mono truncate" style={{ color: 'var(--text-muted)' }}>{order.orderId}</p>
          </div>
          <span className="inline-flex shrink-0 items-center px-1.5 py-0.5 rounded text-caption font-semibold uppercase" style={riskBadgeStyle(order.riskLevel)}>
            {order.riskLevel}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <DetailLine icon={CalendarDays} label="Timestamp" value={formatDate(order.orderDate ?? order.processedAt)} />
          <DetailLine icon={ReceiptText} label="Order value" value={formatCurrencyNullable(order.orderValue)} />
          <DetailLine icon={Mail} label="Email used" value={order.email} mono />
          <DetailLine icon={UserRound} label="Name used" value={order.name} />
          <DetailLine icon={MapPin} label="Ship-to address" value={order.address} />
          <DetailLine icon={CreditCard} label="Card" value={order.cardLast4 ? `•••• ${order.cardLast4}` : null} mono />
        </div>

        {(order.refundRequested || order.returnRequested || order.chargebackFiled) && (
          <div className="mt-3 rounded-md border p-2" style={{ borderColor: 'var(--risk-high-bd)', background: 'var(--risk-high-bg)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--risk-high)' }}>
              {order.chargebackFiled ? 'Chargeback' : order.returnRequested ? 'Return / refund activity' : 'Refund activity'}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text)' }}>
              {order.refundAmount != null && `${formatCurrencyNullable(order.refundAmount)} `}
              {order.refundReason || order.chargebackReasonCode || order.refundStatus || 'Claim recorded'}
              {(order.refundDate || order.chargebackDate || order.processedAt) && ` · ${formatDate(order.refundDate ?? order.chargebackDate ?? order.processedAt)}`}
            </p>
          </div>
        )}

        {order.fraudFlags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {order.fraudFlags.slice(0, 5).map((flag) => (
              <span key={flag} className="rounded border px-1.5 py-0.5 text-[11px] font-medium" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                {flagLabel(flag)}
              </span>
            ))}
            {order.fraudFlags.length > 5 && (
              <span className="text-[11px]" style={{ color: 'var(--text-subtle)' }}>+{order.fraudFlags.length - 5} more</span>
            )}
          </div>
        )}
      </article>
    </li>
  );
}

interface CustomerIntelligenceDrawerProps {
  profileId: string | null;
  onClose: () => void;
  prefetchedPanel?: CustomerIntelligencePanel | null;
}

export default function CustomerIntelligenceDrawer({
  profileId,
  onClose,
  prefetchedPanel = null,
}: CustomerIntelligenceDrawerProps) {
  const [panel, setPanel] = useState<CustomerIntelligencePanel | null>(prefetchedPanel);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ordersExpanded, setOrdersExpanded] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const isNotFoundError = error?.startsWith('HTTP 404');

  useEffect(() => {
    if (prefetchedPanel) {
      setPanel(prefetchedPanel);
      setLoading(false);
      setError(null);
      return;
    }

    if (!profileId) {
      setPanel(null);
      setLoading(false);
      setError(null);
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
  }, [profileId, prefetchedPanel]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const isOpen = !!profileId;

  return (
    <>
      <div
        aria-hidden="true"
        onClick={handleOverlayClick}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Customer roadmap panel"
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[680px] shadow-2xl transform transition-transform duration-300 ease-in-out overflow-y-auto flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: 'var(--bg-surface)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <div>
            <p className="text-overline">Customer Roadmap</p>
            <h2 className="text-heading-sm">What happened, in order</h2>
          </div>
          <div className="flex items-center gap-2">
            {profileId && (
              <Link
                href={`/customers/${profileId}`}
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-[var(--bg-subtle)]"
                style={{ color: 'var(--text)', borderColor: 'var(--border)' }}
              >
                Full profile <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
            <button
              onClick={onClose}
              aria-label="Close panel"
              className="rounded-md p-1.5 transition-colors hover:bg-[var(--bg-subtle)]"
              style={{ color: 'var(--icon-muted)' }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 p-6">
          {loading && <DrawerSkeleton />}

          {error && (
            <div className="rounded-lg p-4 text-sm border" style={{ background: 'var(--risk-critical-bg)', borderColor: 'var(--risk-critical-bd)', color: 'var(--risk-critical)' }}>
              {isNotFoundError
                ? 'Customer record could not be found for this merchant.'
                : 'Failed to load customer data. Please try again.'}
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
  const visibleOrders = ordersExpanded ? orderHistory : orderHistory.slice(0, 6);
  const variantCount = identityTimeline.filter((e) => e.isVariant).length;
  const identitySignals = ((profile as any).identity_signals ?? profile.fraud_flags ?? []) as string[];
  const totalOrderValue = orderHistory.reduce((sum, order) => sum + (order.orderValue ?? 0), 0);
  const totalRefundValue = orderHistory.reduce((sum, order) => sum + (order.refundAmount ?? 0), 0);
  const claimCount = orderHistory.filter((order) => order.refundRequested || order.returnRequested || order.chargebackFiled).length;
  const displayName = profile.names[0] ?? profile.primary_email ?? 'Unknown customer';

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

  const isEligibleForEvidence = orderHistory.some((order) => order.refundRequested) || profile.total_chargebacks > 0;
  const action = recommendedAction(profile.risk_level);
  const whySummary = triageWhySummary(profile.risk_level, profile.risk_score, claimCount, variantCount);

  return (
    <div>
      {/* ── TRIAGE ZONE ─────────────────────────────────────────────── */}
      <div
        className="rounded-xl border mb-4 overflow-hidden"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-inset)' }}
      >
        {/* Top stripe */}
        <div
          className="flex flex-wrap items-center gap-2 px-4 py-3"
          style={{
            background:
              profile.risk_level?.toLowerCase() === 'critical'
                ? 'var(--risk-critical-bg)'
                : profile.risk_level?.toLowerCase() === 'high'
                ? 'var(--risk-high-bg)'
                : profile.risk_level?.toLowerCase() === 'medium'
                ? 'var(--risk-medium-bg)'
                : 'var(--risk-low-bg)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          {/* Risk grade badge */}
          <span
            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide"
            style={riskBadgeStyle(profile.risk_level)}
          >
            {profile.risk_level ?? 'Unknown'}
          </span>

          {/* Confidence badge */}
          <ConfidenceBadge
            grade={riskLevelToNewGrade(profile.risk_level)}
            score={Math.round(profile.risk_score)}
            size="sm"
          />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Recommended action */}
          <Badge tone={action.tone} variant="solid" size="sm">
            {action.label}
          </Badge>

          {/* Watchlist toggle */}
          <WatchlistStarButton
            customerProfileId={profile.id}
            displayName={profile.names[0] ?? undefined}
            displayEmail={profile.primary_email ?? undefined}
            lastSeenRisk={profile.risk_level}
            initialWatchlisted={profile.on_watchlist}
            watchlistEntryId={profile.watchlist_entry_id ?? null}
          />
        </div>

        {/* One-line "why" summary */}
        <div className="px-4 py-2.5">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="font-semibold" style={{ color: 'var(--text)' }}>Why flagged: </span>
            {whySummary}
          </p>
        </div>
      </div>
      {/* ── END TRIAGE ZONE ─────────────────────────────────────────── */}
      <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-inset)' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold truncate" style={{ color: 'var(--text)' }}>{displayName}</h3>
              <ConfidenceBadge grade={riskLevelToNewGrade(profile.risk_level)} />
            </div>
            {profile.primary_email && (
              <p className="mt-1 truncate text-sm" style={{ color: 'var(--text-muted)' }}>{profile.primary_email}</p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            <span>Review priority</span>
            <span className="font-semibold" style={{ color: 'var(--text)' }}>{Math.round(profile.risk_score)} / 100</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(Math.round(profile.risk_score), 100)}%`, ...riskBarStyle(profile.risk_level) }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Investigation status</span>
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={statusSaving}
            className="text-xs rounded-md px-2.5 py-1 font-medium focus:outline-none cursor-pointer disabled:opacity-60"
            style={statusStyle(status)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatTile label="Orders" value={profile.total_orders} hint={`${formatCurrencyNullable(totalOrderValue)} total`} />
        <StatTile label="Claims" value={claimCount || profile.total_refund_claims} hint={`${Math.round(profile.refund_rate * 100)}% refund rate`} />
        <StatTile label="Chargebacks" value={profile.total_chargebacks} hint={totalRefundValue > 0 ? `${formatCurrencyNullable(totalRefundValue)} refunded` : undefined} />
        <StatTile label="Identity changes" value={variantCount} hint={`${profile.profile_confidence}% profile confidence`} />
        <StatTile label="Linked IDs" value={linkedAccounts.length} hint={linkedAccounts[0]?.entityType ? flagLabel(linkedAccounts[0].entityType) : undefined} />
        <StatTile label="First seen" value={`${formatDate(profile.first_seen)}`} hint={`Last seen ${formatDate(profile.last_seen)}`} />
      </div>

      <RoadmapSection title="Roadmap summary">
        <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
            <p className="text-body-sm leading-relaxed" style={{ color: 'var(--text)' }}>{narrative}</p>
          </div>
          {identitySignals.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {identitySignals.map((flag) => (
                <span key={flag} className="rounded border px-1.5 py-0.5 text-[11px] font-medium" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                  {flagLabel(flag)}
                </span>
              ))}
            </div>
          )}
        </div>
      </RoadmapSection>

      <RoadmapSection title={`Customer roadmap (${orderHistory.length})`}>
        {orderHistory.length === 0 ? (
          <p className="text-body-sm italic" style={{ color: 'var(--text-muted)' }}>No orders in current dataset.</p>
        ) : (
          <>
            <ol>
              {visibleOrders.map((order, index) => (
                <OrderRoadmapCard key={`${order.orderId}-${index}`} order={order} isLast={index === visibleOrders.length - 1} />
              ))}
            </ol>
            {orderHistory.length > 6 && (
              <button
                onClick={onToggleOrders}
                className="mt-1 text-xs font-semibold hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                {ordersExpanded ? 'Show fewer moments' : `Show all ${orderHistory.length} roadmap moments`}
              </button>
            )}
          </>
        )}
      </RoadmapSection>

      {(identityTimeline.length > 0 || linkedAccounts.length > 0) && (
        <RoadmapSection title="Identity trail">
          <div className="grid grid-cols-1 gap-3">
            {identityTimeline.slice(0, 8).map((entry, index) => (
              <div key={`${entry.field}-${entry.value}-${index}`} className="flex items-start gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--border-subtle)', background: entry.isVariant ? 'var(--info-bg)' : 'var(--bg-surface)' }}>
                <GitBranch className="mt-0.5 h-4 w-4 shrink-0" style={{ color: entry.isVariant ? 'var(--info)' : 'var(--text-muted)' }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{flagLabel(entry.field)}</p>
                    <p className="text-caption shrink-0" style={{ color: 'var(--text-subtle)' }}>{formatDate(entry.date)}</p>
                  </div>
                  <p className="mt-1 break-words text-sm" style={{ color: 'var(--text)' }}>{entry.value}</p>
                </div>
              </div>
            ))}
            {linkedAccounts.slice(0, 5).map((acc, index) => (
              <div key={`${acc.entityType}-${acc.entityValue}-${index}`} className="flex items-start gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--watchlist-bd)', background: 'var(--watchlist-bg)' }}>
                <GitBranch className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--watchlist)' }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--watchlist)' }}>{flagLabel(acc.entityType)}</p>
                    <p className="text-caption shrink-0" style={{ color: 'var(--text-muted)' }}>{acc.confidence}%</p>
                  </div>
                  <p className="mt-1 break-all font-mono text-xs" style={{ color: 'var(--text)' }}>{acc.entityValue}</p>
                </div>
              </div>
            ))}
          </div>
        </RoadmapSection>
      )}

      <RoadmapSection title="Stored identity details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DetailLine icon={Mail} label="Emails" value={profile.emails.join(', ')} mono />
          <DetailLine icon={UserRound} label="Names" value={profile.names.join(', ')} />
          <DetailLine icon={MapPin} label="Addresses" value={profile.addresses.slice(0, 3).join(' / ')} />
          <DetailLine icon={Phone} label="Phones" value={profile.phones.join(', ')} mono />
          <DetailLine icon={CreditCard} label="Cards" value={profile.card_last4s.map((c) => `•••• ${c}`).join(', ')} mono />
          <DetailLine icon={GitBranch} label="IP addresses" value={profile.ips.slice(0, 5).join(', ')} mono />
        </div>
      </RoadmapSection>

      <RoadmapSection title="Merchant notes">
        <CustomerNotes customerProfileId={profile.id} />
      </RoadmapSection>

      <div className="pt-4 mt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        {isEligibleForEvidence ? (
          <Link
            href={`/customers/${profile.id}/evidence/new`}
            className="flex w-full items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-colors border"
            style={{
              background: 'var(--bg-subtle)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
          >
            <FileText className="h-4 w-4" />
            Generate evidence
          </Link>
        ) : (
          <span
            className="flex w-full items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold border opacity-40 cursor-not-allowed"
            title="No eligible orders found — customer needs at least one refund claim or chargeback"
            style={{
              background: 'var(--bg-subtle)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
          >
            <FileText className="h-4 w-4" />
            Generate evidence
          </span>
        )}
      </div>
    </div>
  );
}
