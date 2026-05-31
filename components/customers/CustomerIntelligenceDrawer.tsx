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
import { formatCurrencyNullable, formatDate } from '@/lib/utils/format';
import IdentityTimeline from '@/components/customers/IdentityTimeline';
import BehaviorRoadmap from '@/components/customers/BehaviorRoadmap';
import CaseSummaryStrip from '@/components/customers/CaseSummaryStrip';
import { getEventStream } from '@/lib/analysis/customerIntelligence';
import { formatDateMode } from '@/lib/utils/format';
import {
  GRADE_COLOURS,
  GRADE_FILL_COLOURS,
  GRADE_LABELS,
} from '@/lib/utils/confidenceStyles';
import type { ConfidenceGrade } from '@/lib/engine/weights';
import { BuildEvidencePackageDrawer } from '@/components/evidence/BuildEvidencePackageDrawer';
import { labelFor } from '@/lib/copy/labels';

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

function riskLevelToConfidenceGrade(riskLevel: string): ConfidenceGrade {
  switch ((riskLevel ?? '').toLowerCase()) {
    case 'definite':
      return 'definite';
    case 'probable':
      return 'probable';
    case 'possible':
    case 'candidate':
      return 'possible';
    default:
      return 'weak';
  }
}

// Identity confidence grade chip — certainty colours, not fraud severity.
function tierChip(grade: string): CSSProperties {
  const mapped = riskLevelToConfidenceGrade(grade);
  const fg = GRADE_COLOURS[mapped];
  return {
    ...CHIP,
    background: GRADE_FILL_COLOURS[mapped],
    color: fg,
    border: `1px solid color-mix(in srgb, ${fg} 40%, transparent)`,
  };
}

function tierLabel(grade: string): string {
  const mapped = riskLevelToConfidenceGrade(grade);
  const base = GRADE_LABELS[mapped];
  return mapped === 'weak' ? 'Weak signals' : `${base} match`;
}

function buildPlainVerdict(
  linkedCount: number,
  _riskScore: number,
  _grade: string,
  variantCount: number,
  _profileConfidence: number,
): string {
  if (linkedCount > 0) {
    const accountWord = linkedCount === 1 ? 'account' : 'accounts';
    return `Resolves to the same shopper as ${linkedCount} other ${accountWord}, based on your store data.`;
  }
  if (variantCount > 0) {
    return `Multiple identity signals on this customer (${variantCount} variant${variantCount !== 1 ? 's' : ''}) in your store data.`;
  }
  return `Identity resolved from your store data — no linked accounts found.`;
}

const OVERLINE: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.01em',
  color: 'var(--ink-secondary)',
  lineHeight: 1,
};

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function DrawerSkeleton() {
  return (
    <div className="animate-pulse p-5 space-y-4">
      <div style={{ height: 20, borderRadius: 3, width: '55%', background: 'var(--surface-muted)' }} />
      <div style={{ height: 14, borderRadius: 3, width: '35%', background: 'var(--surface-muted)' }} />
      <div className="grid grid-cols-3 gap-2 mt-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ height: 60, borderRadius: 4, background: 'var(--surface-muted)' }} />
        ))}
      </div>
      <div className="space-y-3 mt-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{ height: 80, borderRadius: 4, background: 'var(--surface-muted)' }} />
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
    <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 14, marginTop: 14 }}>
      <div className="flex items-center justify-between mb-3">
        <div style={OVERLINE}>
          <span aria-hidden="true" className="ua-section-dot" />
          {title}
        </div>
        {count != null && (
          <span style={{ ...CHIP, background: 'var(--surface-muted)', color: 'var(--ink-secondary)', border: '1px solid var(--surface-border)' }}>
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
      background: 'var(--surface-raised)',
      border: '1px solid var(--surface-border)',
      borderRadius: 4,
      padding: '8px 10px',
    }}>
      <p style={{ ...OVERLINE, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-primary)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{value}</p>
      {hint && <p style={{ fontSize: 10, color: 'var(--ink-tertiary)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hint}</p>}
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
        <p style={{ fontSize: 11, color: 'var(--ink-secondary)', lineHeight: 1.4 }}>{label}</p>
        <p style={{ fontSize: 12, color: 'var(--ink-primary)', fontFamily: mono ? 'var(--font-mono)' : undefined, wordBreak: 'break-word' }}>
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
  return labelFor(flag);
}

function lifecycleTitle(order: OrderHistoryEntry) {
  if (order.chargebackFiled) return 'Chargeback filed';
  if (order.refundRequested) return 'Refund or return claim';
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
            background: 'var(--surface-border)',
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
          background: isCritical ? 'var(--sev-definite-fill)' : hasClaim ? 'var(--sev-probable-fill)' : 'var(--sev-neutral-fill)',
          border: `1px solid ${isCritical ? 'color-mix(in srgb, var(--sev-definite) 40%, transparent)' : hasClaim ? 'color-mix(in srgb, var(--sev-probable) 40%, transparent)' : 'var(--surface-border)'}`,
          color: isCritical ? 'var(--sev-definite)' : hasClaim ? 'var(--sev-probable)' : 'var(--sev-neutral)',
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
        background: 'var(--surface-raised)',
        border: `1px solid ${isCritical ? 'color-mix(in srgb, var(--sev-definite) 40%, transparent)' : hasClaim ? 'color-mix(in srgb, var(--sev-probable) 40%, transparent)' : 'var(--surface-border)'}`,
        borderRadius: 4,
        padding: '8px 10px',
      }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-primary)' }}>{lifecycleTitle(order)}</p>
            <p style={{ fontSize: 11, marginTop: 1, color: 'var(--data-id)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
            background: isCritical ? 'var(--sev-definite-fill)' : 'var(--sev-probable-fill)',
            border: `1px solid ${isCritical ? 'color-mix(in srgb, var(--sev-definite) 40%, transparent)' : 'color-mix(in srgb, var(--sev-probable) 40%, transparent)'}`,
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: isCritical ? 'var(--sev-definite)' : 'var(--sev-probable)' }}>
              {order.chargebackFiled ? 'Chargeback' : order.returnRequested ? 'Return' : 'Refund'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--ink-primary)', marginTop: 2 }}>
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
                background: 'var(--surface-muted)',
                color: 'var(--ink-secondary)',
                border: '1px solid var(--surface-border)',
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
// Signal summary
// ---------------------------------------------------------------------------

function signalSummary(_riskScore: number, claimCount: number, variantCount: number): string {
  const parts: string[] = [];
  if (claimCount > 0) parts.push(`${claimCount} claim${claimCount !== 1 ? 's' : ''} on record`);
  if (variantCount > 0) parts.push(`${variantCount} identity variant${variantCount !== 1 ? 's' : ''} observed`);
  if (parts.length === 0) return 'No overlapping signals detected in this dataset.';
  return `Signals include: ${parts.join(', ')}.`;
}

// ---------------------------------------------------------------------------
// Main drawer
// ---------------------------------------------------------------------------

interface CustomerIntelligenceDrawerProps {
  profileId: string | null;
  onClose: () => void;
  prefetchedPanel?: CustomerIntelligencePanel | null;
  /** Keep the drawer mounted/open even when profileId is null (e.g. audit-only customers) */
  open?: boolean;
  /** Parent is resolving audit → profile; show skeleton until profileId or prefetchedPanel is set */
  resolving?: boolean;
}

export default function CustomerIntelligenceDrawer({
  profileId,
  onClose,
  prefetchedPanel = null,
  open: openProp = false,
  resolving = false,
}: CustomerIntelligenceDrawerProps) {
  const [panel, setPanel] = useState<CustomerIntelligencePanel | null>(prefetchedPanel);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ordersExpanded, setOrdersExpanded] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceOrderId, setEvidenceOrderId] = useState<string | undefined>();
  const drawerRef = useRef<HTMLDivElement>(null);
  const isNotFoundError = error?.startsWith('HTTP 404');

  useEffect(() => {
    // profileId always wins: fetch from /api/customers/[id] (same source as customers page)
    if (profileId) {
      setLoading(true); setError(null); setPanel(null); setOrdersExpanded(false);
      fetch(`/api/customers/${profileId}`)
        .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then((data: CustomerIntelligencePanel) => { setPanel(data); setLoading(false); })
        .catch((err: Error) => { setError(err.message); setLoading(false); });
      return;
    }
    // No profileId — use prefetched panel if available (audit-only / skeleton)
    if (prefetchedPanel) { setPanel(prefetchedPanel); setLoading(false); setError(null); return; }
    setPanel(null); setLoading(false); setError(null);
  }, [profileId, prefetchedPanel]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }, [onClose]);
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) onClose();
  };

  const isOpen = !!(profileId || openProp);
  const resolvedProfileId = profileId || panel?.profile.id || null;
  const showLoading = resolving || loading || (!!profileId && !panel && !error);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={handleOverlayClick}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(14, 11, 8, 0.62)',
          transition: 'opacity 200ms',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? undefined : 'none',
        }}
      />

      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Customer summary"
        style={{
          position: 'fixed', top: 0, right: 0, zIndex: 50,
          height: '100%', width: '100%', maxWidth: 629,
          background: 'var(--surface-raised)',
          borderLeft: '1px solid var(--surface-border)',
          boxShadow: '-16px 0 40px rgba(0,0,0,0.38)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 200ms ease-in-out',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Sticky header ─────────────────────────────────────────── */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'var(--surface-raised)',
          borderBottom: '1px solid var(--surface-border)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}>
          <div>
            <div style={OVERLINE}>
              <span aria-hidden="true" className="ua-section-dot" />
              Customer summary
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-secondary)', marginTop: 2 }}>
              What happened, in order
            </p>
          </div>
          <div className="flex items-center gap-2">
            {resolvedProfileId && (
              <Link
                href={`/customers/${resolvedProfileId}`}
                onClick={onClose}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  height: 28, paddingLeft: 10, paddingRight: 10,
                  borderRadius: 4, border: '1px solid var(--surface-border)',
                  fontSize: 11, fontWeight: 600, color: 'var(--ink-primary)',
                  background: 'var(--surface-overlay)',
                  textDecoration: 'none',
                  transition: 'background 120ms',
                }}
                className="hover:bg-[var(--surface-muted)]"
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
                color: 'var(--ink-tertiary)', background: 'none', border: 'none',
                cursor: 'pointer',
              }}
              className="hover:bg-[var(--surface-overlay)] transition-colors"
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────────── */}
        <div style={{ flex: 1, padding: 16 }}>
          {showLoading && <DrawerSkeleton />}

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 4, fontSize: 12,
              background: 'var(--sev-definite-fill)', border: '1px solid color-mix(in srgb, var(--sev-definite) 40%, transparent)', color: 'var(--sev-definite)',
            }}>
              {isNotFoundError
                ? 'Customer record could not be found for this merchant.'
                : 'Failed to load customer data. Please try again.'}
            </div>
          )}

          {panel && !showLoading && (
            <DrawerContent
              panel={panel}
              ordersExpanded={ordersExpanded}
              onToggleOrders={() => setOrdersExpanded((v) => !v)}
              onClose={onClose}
              onBuildEvidence={(orderId) => {
                setEvidenceOrderId(orderId);
                setEvidenceOpen(true);
              }}
            />
          )}
        </div>
      </div>

      {resolvedProfileId && (
        <BuildEvidencePackageDrawer
          open={evidenceOpen}
          onClose={() => setEvidenceOpen(false)}
          profileId={resolvedProfileId}
          preselectedOrderId={evidenceOrderId}
        />
      )}
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
  onClose,
  onBuildEvidence,
}: {
  panel: CustomerIntelligencePanel;
  ordersExpanded: boolean;
  onToggleOrders: () => void;
  onClose: () => void;
  onBuildEvidence: (preselectedOrderId?: string) => void;
}) {
  const { profile, orderHistory, identityTimeline, linkedAccounts, narrative } = panel;
  const visibleOrders = ordersExpanded ? orderHistory : orderHistory.slice(0, 6);
  const variantCount = identityTimeline.filter((e) => e.isVariant).length;
  const identitySignals = ((profile as any).identity_signals ?? profile.fraud_flags ?? []) as string[];
  const totalOrderValue = Number(profile.commerce_total_value ?? 0) ||
    orderHistory.reduce((sum, o) => sum + (o.orderValue ?? 0), 0);
  const totalRefundValue = orderHistory.reduce((sum, o) => sum + (o.refundAmount ?? 0), 0);
  const claimCount = orderHistory.filter((o) => o.refundRequested || o.returnRequested || o.chargebackFiled).length;
  const hasCleanRecord = claimCount === 0 && profile.total_chargebacks === 0;
  const displayName = profile.names[0] ?? profile.primary_email ?? 'Unknown customer';
  const summary = signalSummary(profile.risk_score, claimCount, variantCount);
  const hasProfileId = Boolean(profile.id?.trim());
  const isEligibleForEvidence =
    orderHistory.some((o) => o.refundRequested || o.returnRequested || o.chargebackFiled) ||
    profile.total_chargebacks > 0 ||
    profile.total_refund_claims > 0;
  const disputedOrder = orderHistory.find(
    (o) => o.refundRequested || o.chargebackFiled,
  );
  function openEvidenceCompile() {
    if (!hasProfileId) return;
    onBuildEvidence(disputedOrder?.transactionId);
  }
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

  const plainVerdict = buildPlainVerdict(
    linkedAccounts.length,
    profile.risk_score,
    profile.risk_level,
    variantCount,
    profile.profile_confidence,
  );
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
      <div
        style={{
          background: 'var(--surface-overlay)',
          border: '1px solid var(--surface-border)',
          borderLeft: '3px solid var(--copper-bright)',
          borderRadius: 4,
          padding: '12px 14px',
          marginBottom: 12,
        }}
      >
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.01em', color: 'var(--ink-secondary)', marginBottom: 6 }}>
          What this means
        </p>
        <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.45, color: 'var(--ink-primary)' }}>
          {plainVerdict}
        </p>
        <p style={{ fontSize: 11, color: 'var(--ink-tertiary)', marginTop: 8, lineHeight: 1.5 }}>
          {hasCleanRecord
            ? 'No claims or chargebacks in your data for this customer. Identity details are below.'
            : 'Refund and chargeback claims on record are listed below, with their source. Compile the signal data into an evidence package if you need documentation.'}
        </p>
      </div>

      {hasCleanRecord && (
        <p
          className="mb-3 rounded-md border px-3 py-2 text-body-sm"
          style={{
            background: 'var(--sev-clear-fill)',
            borderColor: 'color-mix(in srgb, var(--sev-clear) 35%, transparent)',
            color: 'var(--sev-clear)',
          }}
        >
          Clean record — no claims or chargebacks in your data.
        </p>
      )}

      {/* ── Case file header card ────────────────────────────────── */}
      <div style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--surface-border)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 12,
      }}>
        {/* Case ID bar */}
        <div style={{
          background: 'var(--surface-base)',
          borderBottom: '1px solid var(--surface-border)',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}>
          <div className="flex items-center gap-2">
            <span style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: GRADE_COLOURS[riskLevelToConfidenceGrade(profile.risk_level)],
            }} aria-hidden="true" />
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.01em', color: 'var(--ink-secondary)' }}>
              Customer review
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <span style={tierChip(profile.risk_level)}>{tierLabel(profile.risk_level)}</span>
            {hasProfileId && (
              <WatchlistStarButton
                customerProfileId={profile.id}
                displayName={profile.names[0] ?? undefined}
                displayEmail={profile.primary_email ?? undefined}
                lastSeenRisk={profile.risk_level}
                initialWatchlisted={profile.on_watchlist}
                watchlistEntryId={profile.watchlist_entry_id ?? null}
              />
            )}
          </div>
        </div>

        {/* Subject row */}
        <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid var(--surface-border)' }}>
          <div style={{ ...OVERLINE, marginBottom: 4 }}>Subject</div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-primary)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </p>
          {profile.primary_email && profile.names[0] && (
            <p style={{ fontSize: 11, color: 'var(--data-id)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{profile.primary_email}</p>
          )}
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid var(--surface-border)' }}>
          {[
            { label: 'ORDERS',  value: profile.total_orders },
            { label: 'CLAIMS',  value: claimCount || profile.total_refund_claims },
            { label: 'CHARGE.', value: profile.total_chargebacks },
            { label: 'LINKED',  value: linkedAccounts.length },
          ].map(({ label, value }, i) => (
            <div key={label} style={{
              padding: '7px 10px',
              borderRight: i < 3 ? '1px solid var(--surface-border)' : undefined,
              textAlign: 'center',
            }}>
              <div style={{ ...OVERLINE, marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: value > 1 ? 'var(--copper-bright)' : 'var(--ink-primary)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Signal summary strip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px',
          background: 'var(--surface-overlay)',
          borderLeft: '3px solid var(--surface-border)',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.01em',
              color: 'var(--ink-secondary)',
              marginBottom: 1,
            }}>
              Signal summary
            </div>
            <p style={{ fontSize: 11, color: 'var(--ink-secondary)' }}>
              {summary}
            </p>
          </div>
        </div>
      </div>

      {/* ── Review status ────────────────────────────────────────── */}
      {hasProfileId && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: '8px 12px',
          background: 'var(--surface-raised)',
          border: '1px solid var(--surface-border)',
          borderRadius: 4,
          marginBottom: 4,
        }}>
          <span style={{ fontSize: 11, color: 'var(--ink-secondary)' }}>Review status</span>
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
              border: '1px solid var(--surface-border)',
            }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Stat tiles ───────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <StatTile label="Total spend" value={formatCurrencyNullable(totalOrderValue) ?? '—'} hint={`${profile.total_orders} orders`} />
        <StatTile label="Refund rate" value={`${Math.round(profile.refund_rate * 100)}%`} hint={totalRefundValue > 0 ? formatCurrencyNullable(totalRefundValue) ?? undefined : undefined} />
        <StatTile label="First seen" value={formatDate(profile.first_seen)} hint={`Last seen ${formatDate(profile.last_seen)}`} />
      </div>

      {/* ── Narrative ────────────────────────────────────────────── */}
      <Section title="Roadmap summary">
        <div style={{
          background: 'var(--surface-raised)',
          border: '1px solid var(--surface-border)',
          borderRadius: 4,
          padding: '10px 12px',
        }}>
          <div className="flex items-start gap-2">
            <ShieldCheck style={{ marginTop: 1, width: 14, height: 14, flexShrink: 0, color: 'var(--copper-bright)' }} />
            <p style={{ fontSize: 12, color: 'var(--ink-primary)', lineHeight: 1.6 }}>{narrative}</p>
          </div>
          {!hasCleanRecord && identitySignals.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {identitySignals.map((flag) => (
                <span key={flag} style={{ ...CHIP, background: 'var(--surface-muted)', color: 'var(--ink-secondary)', border: '1px solid var(--surface-border)' }}>
                  {flagLabel(flag)}
                </span>
              ))}
            </div>
          )}
        </div>
      </Section>

      {!hasCleanRecord && (
        <CaseSummaryStrip
          flaggedAt={profile.first_seen}
          orders={profile.total_orders}
          exposure={totalOrderValue}
          cadence={Math.min(5, Math.max(1, Math.ceil(profile.total_orders / 3)))}
          lastSeen={profile.last_seen}
          density={density}
        />
      )}

      {!hasCleanRecord && (
      <Section title="Order & claim history" count={orderHistory.length}>
        {orderHistory.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--ink-secondary)', fontStyle: 'italic' }}>No orders in current dataset.</p>
        ) : (
          <>
            <BehaviorRoadmap events={(ordersExpanded ? roadmapEvents : roadmapEvents.slice(0, 6))} />
            {orderHistory.length > 6 && (
              <button
                onClick={onToggleOrders}
                style={{
                  marginTop: 8, fontSize: 11, fontWeight: 600,
                  color: 'var(--copper-bright)', background: 'none', border: 'none',
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
      )}

      {/* ── Identity trail ───────────────────────────────────────── */}
      {(identityTimeline.length > 0 || linkedAccounts.length > 0) && (
        <Section title="Identity trail">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {identityTimeline.length > 0 && <IdentityTimeline entries={identityTimeline.slice(0, 8)} />}
            {linkedAccounts.slice(0, 5).map((acc, index) => (
              <div key={`${acc.entityType}-${acc.entityValue}-${index}`} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '7px 10px',
                background: 'var(--surface-overlay)',
                border: '1px solid var(--surface-border)',
                borderRadius: 3,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: 'var(--copper-bright)' }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="flex items-center justify-between gap-3">
                    <p style={{ ...OVERLINE, color: 'var(--copper-bright)' }}>{flagLabel(acc.entityType)}</p>
                    <p style={{ fontSize: 10, color: 'var(--ink-tertiary)', flexShrink: 0 }}>{acc.confidence}% conf. · {formatDateMode(profile.last_seen, 'recent')}</p>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--data-id)', marginTop: 2, wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>{acc.entityValue}</p>
                </div>
                <span style={{ ...CHIP, background: 'var(--copper-glow)', color: 'var(--copper-bright)', border: '1px solid color-mix(in srgb, var(--copper-bright) 40%, transparent)', flexShrink: 0 }}>LINKED</span>
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
      {hasProfileId && (
        <Section title="Merchant notes">
          <CustomerNotes customerProfileId={profile.id} />
        </Section>
      )}

      {/* ── Signal data CTA ─────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 12, marginTop: 12 }}>
        {hasProfileId ? (
          <button
            type="button"
            onClick={openEvidenceCompile}
            style={{
              display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center',
              gap: 7, height: 34, borderRadius: 4, fontSize: 12, fontWeight: 600,
              background: 'var(--copper-bright)', color: 'var(--ink-inverse)',
              border: 'none', cursor: 'pointer', transition: 'background 120ms',
              opacity: isEligibleForEvidence ? 1 : 0.85,
            }}
            className="hover:bg-[var(--copper-mid)]"
            title={isEligibleForEvidence ? undefined : 'No refund or chargeback on record — you can still compile a signal report'}
          >
            <FileText style={{ width: 14, height: 14 }} />
            Build evidence package
          </button>
        ) : (
          <span
            style={{
              display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center',
              gap: 7, height: 34, borderRadius: 4, fontSize: 12, fontWeight: 600,
              background: 'var(--surface-muted)', color: 'var(--ink-tertiary)',
              border: '1px solid var(--surface-border)', opacity: 0.65, cursor: 'not-allowed',
            }}
            title={
              !hasProfileId
                ? 'Save this customer to a profile before compiling signal data'
                : 'No refund claims or chargebacks on record for this customer'
            }
          >
            <FileText style={{ width: 14, height: 14 }} />
            Build evidence package
          </span>
        )}
        <p style={{ fontSize: 10, color: 'var(--ink-tertiary)', marginTop: 6, lineHeight: 1.5 }}>
          Signal data may help when preparing a dispute response. Confirm what your payment processor needs before you submit.
        </p>
      </div>
    </div>
  );
}
