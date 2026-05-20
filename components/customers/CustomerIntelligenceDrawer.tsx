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
  Globe,
  Mail,
  MapPin,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { riskLevelToNewGrade } from '@/lib/confidence';
import WatchlistStarButton from '@/components/audit/WatchlistStarButton';
import CustomerNotes from '@/components/audit/CustomerNotes';
import type { CustomerIntelligencePanel, OrderHistoryEntry } from '@/app/api/customers/[id]/route';
import { STATUS_LABELS, STATUS_OPTIONS, statusStyle } from '@/lib/utils/investigationStatus';
import { riskTok } from '@/lib/utils/riskStyles';
import { formatCurrencyNullable, formatDate } from '@/lib/utils/format';
import { Badge } from '@/components/ui/Badge';
import type { BadgeTone } from '@/components/ui/Badge';
import IdentityTimeline from '@/components/customers/IdentityTimeline';
import BehaviorRoadmap from '@/components/customers/BehaviorRoadmap';
import CaseSummaryStrip from '@/components/customers/CaseSummaryStrip';
import { getEventStream } from '@/lib/analysis/customerIntelligence';
import { formatDateMode } from '@/lib/utils/format';

// ---------------------------------------------------------------------------
// Design constants
// ---------------------------------------------------------------------------

const CHIP: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 18,
  paddingLeft: 7,
  paddingRight: 7,
  borderRadius: 3,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.06em',
  lineHeight: 1,
  whiteSpace: 'nowrap',
};

function tierChip(risk: string): CSSProperties {
  switch ((risk ?? '').toLowerCase()) {
    case 'critical': return { ...CHIP, background: 'var(--brand-ink)',         color: 'var(--text-inverse)',     border: '1px solid var(--brand-ink)' };
    case 'high':     return { ...CHIP, background: 'var(--risk-critical-bg)',   color: 'var(--risk-critical-fg)', border: '1px solid var(--risk-critical-bd)' };
    case 'medium':   return { ...CHIP, background: 'var(--bg-surface-alt)',     color: 'var(--text-muted)',       border: '1px solid var(--border-default)' };
    default:         return { ...CHIP, background: 'var(--bg-surface-alt)',     color: 'var(--text-subtle)',      border: '1px solid var(--border-default)' };
  }
}

function tierLabel(risk: string): string {
  switch ((risk ?? '').toLowerCase()) {
    case 'critical': return 'DEFINITE';
    case 'high':     return 'PROBABLE';
    case 'medium':   return 'CANDIDATE';
    default:         return 'INCONCLUSIVE';
  }
}

const OVERLINE: CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  lineHeight: 1,
};

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function DrawerSkeleton() {
  return (
    <div className="animate-pulse p-5 space-y-4">
      <div style={{ height: 20, borderRadius: 3, width: '55%', background: 'var(--bg-subtle)' }} />
      <div style={{ height: 14, borderRadius: 3, width: '35%', background: 'var(--bg-subtle)' }} />
      <div className="grid grid-cols-3 gap-2 mt-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ height: 60, borderRadius: 4, background: 'var(--bg-subtle)' }} />
        ))}
      </div>
      <div className="space-y-3 mt-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{ height: 80, borderRadius: 4, background: 'var(--bg-subtle)' }} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({ title, children, count }: { title: string; children: ReactNode; count?: number }) {
  return (
    <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 14, marginTop: 14 }}>
      <div className="flex items-center justify-between mb-3">
        <div style={OVERLINE}>
          <span aria-hidden="true" className="ua-section-dot" />
          {title}
        </div>
        {count != null && (
          <span style={{ ...CHIP, background: 'var(--bg-surface-alt)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat tile — case-file 3-col stat cell
// ---------------------------------------------------------------------------

function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 4,
      padding: '8px 10px',
    }}>
      <p style={{ ...OVERLINE, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{value}</p>
      {hint && <p style={{ fontSize: 10, color: 'var(--text-subtle)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail line
// ---------------------------------------------------------------------------

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
        <p style={{ fontSize: 10, color: 'var(--text-subtle)', lineHeight: 1.4 }}>{label}</p>
        <p style={{ fontSize: 12, color: 'var(--text)', fontFamily: mono ? 'var(--font-mono)' : undefined, wordBreak: 'break-word' }}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Order roadmap card
// ---------------------------------------------------------------------------

function flagLabel(flag: string) {
  return flag.replace(/[_-]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function lifecycleTitle(order: OrderHistoryEntry) {
  if (order.chargebackFiled) return 'Chargeback filed';
  if (order.refundRequested) return 'Refund or return claim';
  if (riskTok(order.riskLevel) === 'critical' || riskTok(order.riskLevel) === 'high') return 'Order requiring review';
  return 'Order placed';
}

function OrderRoadmapCard({ order, isLast }: { order: OrderHistoryEntry; isLast: boolean }) {
  const hasClaim = order.refundRequested || order.returnRequested || order.chargebackFiled;
  const isCritical = order.chargebackFiled;

  return (
    <li className="relative" style={{ paddingLeft: 36, paddingBottom: isLast ? 0 : 14 }}>
      {/* Connector rail */}
      {!isLast && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 11,
            top: 28,
            bottom: 0,
            width: 1,
            background: 'var(--border-default)',
          }}
        />
      )}

      {/* Timeline glyph */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          top: 4,
          width: 24,
          height: 24,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isCritical ? 'var(--risk-critical-bg)' : hasClaim ? 'var(--risk-medium-bg)' : '#FFFFFF',
          border: `1px solid ${isCritical ? 'var(--risk-critical-bd)' : hasClaim ? 'var(--risk-medium-bd)' : 'var(--border-default)'}`,
          color: isCritical ? 'var(--accent)' : hasClaim ? 'var(--risk-medium-fg)' : 'var(--text-muted)',
        }}
      >
        {order.chargebackFiled ? (
          <AlertTriangle style={{ width: 11, height: 11 }} />
        ) : hasClaim ? (
          <RotateCcw style={{ width: 11, height: 11 }} />
        ) : (
          <ReceiptText style={{ width: 11, height: 11 }} />
        )}
      </span>

      {/* Card body */}
      <article style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${isCritical ? 'var(--risk-critical-bd)' : hasClaim ? 'var(--risk-medium-bd)' : 'var(--border-default)'}`,
        borderRadius: 4,
        padding: '8px 10px',
      }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{lifecycleTitle(order)}</p>
            <p style={{ fontSize: 11, marginTop: 1, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {order.orderId}
            </p>
          </div>
          <span style={tierChip(order.riskLevel)}>
            {tierLabel(order.riskLevel)}
          </span>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <DetailLine icon={CalendarDays} label="Date" value={formatDate(order.orderDate ?? order.processedAt)} />
          <DetailLine icon={ReceiptText} label="Value" value={formatCurrencyNullable(order.orderValue)} />
          <DetailLine icon={Mail} label="Email" value={order.email} mono />
          <DetailLine icon={User} label="Name" value={order.name} />
          <DetailLine icon={MapPin} label="Ship-to" value={order.address} />
          <DetailLine icon={CreditCard} label="Card" value={order.cardLast4 ? `···· ${order.cardLast4}` : null} mono />
        </div>

        {hasClaim && (
          <div style={{
            marginTop: 8,
            padding: '5px 8px',
            borderRadius: 3,
            background: isCritical ? 'var(--risk-critical-bg)' : 'var(--risk-medium-bg)',
            border: `1px solid ${isCritical ? 'var(--risk-critical-bd)' : 'var(--risk-medium-bd)'}`,
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: isCritical ? 'var(--accent)' : 'var(--risk-medium-fg)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {order.chargebackFiled ? 'Chargeback' : order.returnRequested ? 'Return' : 'Refund'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text)', marginTop: 2 }}>
              {order.refundAmount != null && `${formatCurrencyNullable(order.refundAmount)} `}
              {order.refundReason || order.chargebackReasonCode || order.refundStatus || 'Claim recorded'}
            </p>
          </div>
        )}

        {order.fraudFlags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {order.fraudFlags.slice(0, 5).map((flag) => (
              <span key={flag} style={{
                ...CHIP,
                background: 'var(--bg-surface-alt)',
                color: 'var(--text-muted)',
                border: '1px solid #D2C9B5',
              }}>
                {flagLabel(flag)}
              </span>
            ))}
            {order.fraudFlags.length > 5 && (
              <span style={{ fontSize: 10, color: 'var(--text-subtle)' }}>+{order.fraudFlags.length - 5} more</span>
            )}
          </div>
        )}
      </article>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Recommended action strip
// ---------------------------------------------------------------------------

function recommendedAction(riskLevel: string): { label: string; tone: BadgeTone } {
  switch ((riskLevel ?? '').toLowerCase()) {
    case 'critical': return { label: 'Block & escalate', tone: 'critical' };
    case 'high':     return { label: 'Hold for review', tone: 'danger' };
    case 'medium':   return { label: 'Monitor closely', tone: 'warning' };
    case 'low':      return { label: 'Clear to fulfil', tone: 'success' };
    default:         return { label: 'Pending review', tone: 'neutral' };
  }
}

function triageWhySummary(riskLevel: string, riskScore: number, claimCount: number, variantCount: number): string {
  const level = (riskLevel ?? '').toLowerCase();
  const parts: string[] = [];
  if (riskScore >= 80) parts.push(`risk score ${Math.round(riskScore)}/100`);
  if (claimCount > 0) parts.push(`${claimCount} claim${claimCount !== 1 ? 's' : ''}`);
  if (variantCount > 0) parts.push(`${variantCount} identity variant${variantCount !== 1 ? 's' : ''}`);
  if (parts.length === 0) return 'No critical signals detected at this time.';
  const prefix = level === 'critical' || level === 'high' ? 'Flagged due to' : level === 'medium' ? 'Elevated risk from' : 'Low risk —';
  return `${prefix} ${parts.join(', ')}.`;
}

// ---------------------------------------------------------------------------
// Main drawer
// ---------------------------------------------------------------------------

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
    if (prefetchedPanel) { setPanel(prefetchedPanel); setLoading(false); setError(null); return; }
    if (!profileId) { setPanel(null); setLoading(false); setError(null); return; }
    setLoading(true); setError(null); setPanel(null); setOrdersExpanded(false);
    fetch(`/api/customers/${profileId}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data: CustomerIntelligencePanel) => { setPanel(data); setLoading(false); })
      .catch((err: Error) => { setError(err.message); setLoading(false); });
  }, [profileId, prefetchedPanel]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }, [onClose]);
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) onClose();
  };

  const isOpen = !!profileId;

  return (
    <>
      <div
        aria-hidden="true"
        onClick={handleOverlayClick}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(26,24,20,0.35)',
          transition: 'opacity 200ms',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? undefined : 'none',
        }}
      />

      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Customer case file"
        style={{
          position: 'fixed', top: 0, right: 0, zIndex: 50,
          height: '100%', width: '100%', maxWidth: 640,
          background: 'var(--bg-canvas)',
          borderLeft: '1px solid var(--border-default)',
          boxShadow: '-4px 0 32px rgba(26,24,20,0.12)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms cubic-bezier(0.32,0,0.15,1)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Sticky header ─────────────────────────────────────────── */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'var(--bg-canvas)',
          borderBottom: '1px solid var(--border-default)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}>
          <div>
            <div style={OVERLINE}>
              <span aria-hidden="true" className="ua-section-dot" />
              Customer case file
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              What happened, in order
            </p>
          </div>
          <div className="flex items-center gap-2">
            {profileId && (
              <Link
                href={`/customers/${profileId}`}
                onClick={onClose}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  height: 28, paddingLeft: 10, paddingRight: 10,
                  borderRadius: 4, border: '1px solid var(--border-default)',
                  fontSize: 11, fontWeight: 600, color: 'var(--text)',
                  background: 'var(--bg-surface)',
                  textDecoration: 'none',
                  transition: 'background 120ms',
                }}
                className="hover:bg-[var(--bg-subtle)]"
              >
                Full profile <ExternalLink style={{ width: 11, height: 11 }} />
              </Link>
            )}
            <button
              onClick={onClose}
              aria-label="Close panel"
              style={{
                width: 28, height: 28, borderRadius: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--icon-muted)', background: 'none', border: 'none',
                cursor: 'pointer',
              }}
              className="hover:bg-[var(--bg-subtle)] transition-colors"
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────────── */}
        <div style={{ flex: 1, padding: 16 }}>
          {loading && <DrawerSkeleton />}

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 4, fontSize: 12,
              background: 'var(--risk-critical-bg)', border: '1px solid #F0C8BE', color: 'var(--accent)',
            }}>
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

// ---------------------------------------------------------------------------
// Drawer content
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
  const visibleOrders = ordersExpanded ? orderHistory : orderHistory.slice(0, 6);
  const variantCount = identityTimeline.filter((e) => e.isVariant).length;
  const identitySignals = ((profile as any).identity_signals ?? profile.fraud_flags ?? []) as string[];
  const totalOrderValue = orderHistory.reduce((sum, o) => sum + (o.orderValue ?? 0), 0);
  const totalRefundValue = orderHistory.reduce((sum, o) => sum + (o.refundAmount ?? 0), 0);
  const claimCount = orderHistory.filter((o) => o.refundRequested || o.returnRequested || o.chargebackFiled).length;
  const displayName = profile.names[0] ?? profile.primary_email ?? 'Unknown customer';
  const action = recommendedAction(profile.risk_level);
  const whySummary = triageWhySummary(profile.risk_level, profile.risk_score, claimCount, variantCount);
  const isEligibleForEvidence = orderHistory.some((o) => o.refundRequested) || profile.total_chargebacks > 0;
  const density = Array.from({ length: 12 }, () => 0);
  for (const order of orderHistory) {
    const diffDays = Math.floor((Date.now() - new Date(order.processedAt).getTime()) / 86400000);
    const weekIndex = Math.min(11, Math.max(0, 11 - Math.floor(diffDays / 7)));
    density[weekIndex] += 1;
  }
  const roadmapEvents = getEventStream({
    orderHistory,
    identityTimeline,
    linkedAccounts: linkedAccounts.map((acc) => ({
      entityType: acc.entityType,
      entityValue: acc.entityValue,
      confidence: acc.confidence,
    })),
  });

  const [status, setStatus] = useState<string>((profile as any).investigation_status ?? 'new');
  const [statusSaving, setStatusSaving] = useState(false);

  const caseId = `UN-${(profile.primary_email ?? 'UNKNOWN').split('@')[0].slice(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, '')}-${profile.total_orders}`;

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

  return (
    <div>
      {/* ── Case file header card ────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 12,
      }}>
        {/* Case ID bar */}
        <div style={{
          background: 'var(--bg-canvas)',
          borderBottom: '1px solid var(--border-default)',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}>
          <div className="flex items-center gap-2">
            <span style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: profile.risk_level === 'critical' || profile.risk_level === 'high' ? 'var(--accent)' : 'var(--text-subtle)',
            }} aria-hidden="true" />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              CASE FILE · {caseId}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span style={tierChip(profile.risk_level)}>{tierLabel(profile.risk_level)}</span>
            <span style={{ ...CHIP, background: 'var(--risk-critical-bg)', color: 'var(--accent)', border: '1px solid #F0C8BE' }}>
              RISK {(Math.min(profile.risk_score, 100) / 100).toFixed(2)}
            </span>
            <span style={{ ...CHIP, background: 'var(--bg-surface-alt)', color: 'var(--text-muted)', border: '1px solid #D2C9B5' }}>
              CONF {(profile.profile_confidence / 100).toFixed(2)}
            </span>
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

        {/* Subject row */}
        <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid var(--border-default)' }}>
          <div style={{ ...OVERLINE, marginBottom: 4 }}>Subject</div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </p>
          {profile.primary_email && profile.names[0] && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{profile.primary_email}</p>
          )}
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid var(--border-default)' }}>
          {[
            { label: 'ORDERS',  value: profile.total_orders },
            { label: 'CLAIMS',  value: claimCount || profile.total_refund_claims },
            { label: 'CHARGE.', value: profile.total_chargebacks },
            { label: 'LINKED',  value: linkedAccounts.length },
          ].map(({ label, value }, i) => (
            <div key={label} style={{
              padding: '7px 10px',
              borderRight: i < 3 ? '1px solid var(--border-default)' : undefined,
              textAlign: 'center',
            }}>
              <div style={{ ...OVERLINE, marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: value > 1 ? 'var(--accent)' : 'var(--text)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Recommended action strip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px',
          background: profile.risk_level === 'critical' ? 'var(--brand-ink)' : 'var(--risk-critical-bg)',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: profile.risk_level === 'critical' ? 'var(--text-inverse)' : 'var(--accent)',
          }} aria-hidden="true" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: profile.risk_level === 'critical' ? 'var(--text-inverse)' : 'var(--accent)',
              marginBottom: 1,
            }}>
              {action.label}
            </div>
            <p style={{ fontSize: 11, color: profile.risk_level === 'critical' ? 'var(--text-inverse)' : 'var(--risk-critical-fg)' }}>
              {whySummary}
            </p>
          </div>
        </div>
      </div>

      {/* ── Investigation status ─────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        padding: '8px 12px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 4,
        marginBottom: 4,
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Investigation status</span>
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={statusSaving}
          style={{
            ...statusStyle(status),
            fontSize: 11,
            borderRadius: 4,
            padding: '3px 8px',
            fontWeight: 600,
            cursor: 'pointer',
            outline: 'none',
            border: '1px solid var(--border-default)',
          }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* ── Stat tiles ───────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <StatTile label="Total spend" value={formatCurrencyNullable(totalOrderValue) ?? '—'} hint={`${profile.total_orders} orders`} />
        <StatTile label="Refund rate" value={`${Math.round(profile.refund_rate * 100)}%`} hint={totalRefundValue > 0 ? formatCurrencyNullable(totalRefundValue) ?? undefined : undefined} />
        <StatTile label="First seen" value={formatDate(profile.first_seen)} hint={`Last seen ${formatDate(profile.last_seen)}`} />
      </div>

      {/* ── Narrative ────────────────────────────────────────────── */}
      <Section title="Roadmap summary">
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 4,
          padding: '10px 12px',
        }}>
          <div className="flex items-start gap-2">
            <ShieldCheck style={{ marginTop: 1, width: 14, height: 14, flexShrink: 0, color: 'var(--text-muted)' }} />
            <p style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>{narrative}</p>
          </div>
          {identitySignals.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {identitySignals.map((flag) => (
                <span key={flag} style={{ ...CHIP, background: 'var(--bg-surface-alt)', color: 'var(--text-muted)', border: '1px solid #D2C9B5' }}>
                  {flagLabel(flag)}
                </span>
              ))}
            </div>
          )}
        </div>
      </Section>

      <CaseSummaryStrip
        flaggedAt={profile.first_seen}
        orders={profile.total_orders}
        exposure={totalOrderValue}
        cadence={Math.min(5, Math.max(1, Math.ceil(profile.total_orders / 3)))}
        lastSeen={profile.last_seen}
        density={density}
      />

      {/* ── Behavior roadmap ─────────────────────────────────────── */}
      <Section title={`Customer roadmap`} count={orderHistory.length}>
        {orderHistory.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No orders in current dataset.</p>
        ) : (
          <>
            <BehaviorRoadmap events={(ordersExpanded ? roadmapEvents : roadmapEvents.slice(0, 6))} />
            {orderHistory.length > 6 && (
              <button
                onClick={onToggleOrders}
                style={{
                  marginTop: 8, fontSize: 11, fontWeight: 600,
                  color: 'var(--accent)', background: 'none', border: 'none',
                  cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2,
                  padding: 0,
                }}
              >
                {ordersExpanded ? 'Show fewer' : `Show all ${orderHistory.length} events`}
              </button>
            )}
          </>
        )}
      </Section>

      {/* ── Identity trail ───────────────────────────────────────── */}
      {(identityTimeline.length > 0 || linkedAccounts.length > 0) && (
        <Section title="Identity trail">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {identityTimeline.length > 0 && <IdentityTimeline entries={identityTimeline.slice(0, 8)} />}
            {linkedAccounts.slice(0, 5).map((acc, index) => (
              <div key={`${acc.entityType}-${acc.entityValue}-${index}`} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '7px 10px',
                background: 'var(--bg-surface-alt)',
                border: '1px solid #D2C9B5',
                borderRadius: 3,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: 'var(--text-muted)' }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="flex items-center justify-between gap-3">
                    <p style={{ ...OVERLINE, color: 'var(--text-muted)' }}>{flagLabel(acc.entityType)}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-subtle)', flexShrink: 0 }}>{acc.confidence}% conf. · {formatDateMode(profile.last_seen, 'recent')}</p>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text)', marginTop: 2, wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>{acc.entityValue}</p>
                </div>
                <span style={{ ...CHIP, background: 'var(--bg-surface-alt)', color: 'var(--text-muted)', border: '1px solid #D2C9B5', flexShrink: 0 }}>LINKED</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Stored identity ──────────────────────────────────────── */}
      <Section title="Stored identity details">
        <div className="grid grid-cols-2 gap-3">
          <DetailLine icon={Mail}    label="Emails"      value={profile.emails.join(', ')} mono />
          <DetailLine icon={User}    label="Names"       value={profile.names.join(', ')} />
          <DetailLine icon={MapPin}  label="Addresses"   value={profile.addresses.slice(0, 3).join(' / ')} />
          <DetailLine icon={Globe}   label="IP addresses" value={profile.ips.slice(0, 5).join(', ')} mono />
          <DetailLine icon={CreditCard} label="Cards"   value={profile.card_last4s.map((c) => `···· ${c}`).join(', ')} mono />
        </div>
      </Section>

      {/* ── Notes ────────────────────────────────────────────────── */}
      <Section title="Merchant notes">
        <CustomerNotes customerProfileId={profile.id} />
      </Section>

      {/* ── Evidence CTA ─────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 12, marginTop: 12 }}>
        {isEligibleForEvidence ? (
          <Link
            href={`/customers/${profile.id}/evidence/new`}
            style={{
              display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center',
              gap: 7, height: 34, borderRadius: 4, fontSize: 12, fontWeight: 600,
              background: 'var(--brand-ink)', color: 'var(--text-inverse)',
              textDecoration: 'none', transition: 'background 120ms',
            }}
            className="hover:bg-[#7B2D26]"
          >
            <FileText style={{ width: 14, height: 14 }} />
            Generate evidence package
          </Link>
        ) : (
          <span
            style={{
              display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center',
              gap: 7, height: 34, borderRadius: 4, fontSize: 12, fontWeight: 600,
              background: 'var(--bg-subtle)', color: 'var(--text-muted)',
              border: '1px solid var(--border-default)', opacity: 0.5, cursor: 'not-allowed',
            }}
            title="No eligible orders found — customer needs at least one refund claim or chargeback"
          >
            <FileText style={{ width: 14, height: 14 }} />
            Generate evidence package
          </span>
        )}
      </div>
    </div>
  );
}
