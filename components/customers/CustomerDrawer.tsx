'use client';

/**
 * CustomerDrawer — redesigned per §9 of the UI/UX Refinement Plan.
 *
 * This is the CANONICAL customer side-panel. It replaces
 * components/customers/CustomerIntelligenceDrawer.tsx after migration (Phase 6).
 *
 * Uses:
 * - useCustomerIntelligence hook (shared with full page)
 * - CustomerIntelligence type (§8)
 * - Shared UI kit components (§6)
 *
 * §9.12: Opening updates URL search param ?customer=<id>
 * §9.13: No tabs; sections stacked; no local one-offs.
 */

import { useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { MoreHorizontal, X, Copy, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCustomerIntelligence } from '@/lib/hooks/useCustomerIntelligence';
import {
  Drawer,
  Button,
  ConfidenceBadge,
  RiskScoreBadge,
  MetricCard,
  SectionCard,
  RecommendedActionCard,
  EvidenceList,
  LinkedIdentityList,
  SignalBadge,
  ActionBar,
  DataTable,
  EmptyState,
  LoadingState,
  Skeleton,
} from '@/components/ui';
import { formatCurrencyNullable, formatDateShort, formatPercent } from '@/lib/utils/format';
import type { Transaction } from '@/types/customer';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface CustomerDrawerProps {
  profileId: string | null;
  onClose: () => void;
  onAction?: (action: string, profileId: string) => void;
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------
function Avatar({ initials }: { initials: string }) {
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold"
      style={{ background: 'var(--bg-surface-sunk)', color: 'var(--text-secondary)' }}
    >
      {initials}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton matching drawer layout
// ---------------------------------------------------------------------------
function DrawerLoading() {
  return (
    <div className="p-[var(--space-5)] space-y-[var(--space-5)]">
      {/* Header skeleton */}
      <div className="flex items-center gap-[var(--space-3)]">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-[var(--space-2)]">
          <Skeleton style={{ width: '55%', height: 20 }} />
          <Skeleton style={{ width: '40%', height: 14 }} />
        </div>
        <Skeleton style={{ width: 60, height: 24 }} />
      </div>
      {/* Sections */}
      <Skeleton style={{ width: '100%', height: 100 }} className="rounded-[var(--radius-3)]" />
      <Skeleton style={{ width: '100%', height: 140 }} className="rounded-[var(--radius-3)]" />
      <Skeleton style={{ width: '100%', height: 200 }} className="rounded-[var(--radius-3)]" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function CustomerDrawer({ profileId, onClose, onAction }: CustomerDrawerProps) {
  const { data: customer, loading, error } = useCustomerIntelligence(profileId);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // §9.12 — deep-linkable URL param
  useEffect(() => {
    if (!profileId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('customer', profileId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [profileId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('customer');
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    onClose();
  }, [onClose, pathname, router, searchParams]);

  // -------- Recommended action CTA label --------
  const primaryCTALabel =
    customer?.recommendation.action === 'block' ? 'Block customer'
    : customer?.recommendation.action === 'watch' ? 'Add to watchlist'
    : customer?.recommendation.action === 'review' ? 'Mark for review'
    : customer?.recommendation.action === 'allow' ? 'Mark as safe'
    : 'Take action';

  // -------- Footer --------
  const footer = customer ? (
    <ActionBar
      leftActions={
        <>
          <Button variant="secondary" size="sm" onClick={() => onAction?.('mark_safe', customer.id)}>
            Mark safe
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onAction?.('watchlist', customer.id)}>
            Add to watchlist
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onAction?.('dismiss', customer.id)}>
            Dismiss
          </Button>
        </>
      }
      primaryAction={
        <Button
          variant={customer.recommendation.action === 'block' ? 'danger' : 'primary'}
          size="sm"
          onClick={() => onAction?.(customer.recommendation.action, customer.id)}
        >
          {primaryCTALabel}
        </Button>
      }
    />
  ) : null;

  return (
    <Drawer
      open={!!profileId}
      onClose={handleClose}
      width={720}
      footer={footer}
      aria-label="Customer intelligence panel"
    >
      {loading && <DrawerLoading />}

      {error && !loading && (
        <div className="p-[var(--space-5)]">
          <div
            className="rounded-[var(--radius-3)] border p-[var(--space-5)]"
            style={{ borderColor: 'var(--risk-critical-line)', background: 'var(--risk-critical-bg)' }}
          >
            <p className="text-body-strong text-[var(--risk-critical-fg)]">Failed to load customer</p>
            <p className="text-small text-[var(--text-secondary)] mt-[var(--space-1)]">{error}</p>
          </div>
        </div>
      )}

      {customer && !loading && (
        <>
          {/* §9.2 — Sticky header */}
          <div
            className="flex items-center gap-[var(--space-3)] px-[var(--space-5)] bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]"
            style={{ height: 72, position: 'sticky', top: 0, zIndex: 'var(--z-sticky)' as unknown as number }}
          >
            {/* Left cluster */}
            <Avatar initials={customer.primary.avatarInitials} />
            <div className="flex-1 min-w-0">
              <p className={cn('text-h1', customer.primary.name ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]')}>
                {customer.primary.name ?? 'Unknown customer'}
              </p>
              <div className="flex items-center gap-[var(--space-2)] group">
                <p className="text-small text-[var(--text-secondary)] truncate">{customer.primary.email}</p>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(customer.primary.email)}
                  className="opacity-0 group-hover:opacity-100 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-opacity"
                  aria-label="Copy email"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right cluster */}
            <div className="flex items-center gap-[var(--space-2)] shrink-0">
              <ConfidenceBadge grade={customer.confidence.grade} score={customer.confidence.score} />
              <RiskScoreBadge score={customer.risk.score} level={customer.risk.level} />
              {/* Overflow menu */}
              <div className="relative">
                <Button variant="ghost" size="sm" aria-label="More actions">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
              {/* Close */}
              <Button variant="ghost" size="sm" onClick={handleClose} aria-label="Close">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Body sections */}
          <div className="p-[var(--space-5)] space-y-[var(--space-5)]">

            {/* §9.3 — Recommended action */}
            <RecommendedActionCard
              action={customer.recommendation.action}
              confidence={customer.recommendation.confidence}
              rationale={customer.recommendation.rationale}
              supportingEvidence={customer.evidence
                .filter((e) => customer.recommendation.supportingEvidenceIds.includes(e.id))
                .map((e) => ({ ...e, icon: undefined }))}
              falsePositiveRisk={{
                level: customer.recommendation.falsePositiveRisk.level,
                explanation: customer.recommendation.falsePositiveRisk.explanation,
                contradictingEvidence: customer.evidence
                  .filter((e) => customer.recommendation.falsePositiveRisk.contradictingEvidenceIds.includes(e.id))
                  .map((e) => ({ ...e, icon: undefined })),
              }}
              onPrimaryAction={() => onAction?.(customer.recommendation.action, customer.id)}
              onMarkSafe={() => onAction?.('mark_safe', customer.id)}
            />

            {/* §9.4 — Snapshot metrics (2×3 grid) */}
            <div className="grid grid-cols-2 gap-[var(--space-3)]">
              <MetricCard label="Confidence" value={`${customer.confidence.grade} · ${customer.confidence.score}`} density="compact" />
              <MetricCard label="Risk score" value={customer.risk.score} hint={customer.risk.level} density="compact" />
              <MetricCard label="Order value" value={formatCurrencyNullable(customer.metrics.totalOrderValue)} density="compact" />
              <MetricCard label="Refunded" value={formatCurrencyNullable(customer.metrics.totalRefundedValue)} density="compact" />
              <MetricCard label="Linked identities" value={customer.metrics.linkedIdentityCount} density="compact" />
              <MetricCard label="Chargebacks" value={customer.metrics.chargebackCount} density="compact" />
            </div>

            {/* §9.5 — Why flagged */}
            <SectionCard title="Why this customer is flagged">
              <p className="text-body-strong text-[var(--text-primary)] mb-[var(--space-3)]">
                {customer.whyFlagged.headline}
              </p>
              <ul className="space-y-[var(--space-3)]">
                {customer.whyFlagged.bullets.slice(0, 6).map((b, i) => (
                  <li key={i} className="flex items-start gap-[var(--space-3)]">
                    <SignalBadge signal={b.signalType} size="sm" />
                    <span className="text-body text-[var(--text-secondary)]">{b.text}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>

            {/* §9.6 — Linked identities */}
            <SectionCard
              title="Linked identities"
              actions={
                customer.linkedIdentities.length > 5 ? (
                  <Link href={`/customers/${customer.id}#identity-graph`} className="text-small text-[var(--text-link)] hover:underline">
                    View all in profile
                  </Link>
                ) : undefined
              }
            >
              {customer.linkedIdentities.length === 0 ? (
                <EmptyState title="No linked identities" description="No accounts have been linked to this customer." />
              ) : (
                <LinkedIdentityList
                  identities={customer.linkedIdentities.slice(0, 5).map((id) => ({
                    id: id.id,
                    name: id.name,
                    email: id.emails[0],
                    phone: id.phones[0],
                    address: id.addresses[0]?.line1,
                    confidence: id.confidence,
                    linkedBy: id.linkedBy,
                  }))}
                  onViewClick={(id) => router.push(`/customers/${customer.id}#identity-graph`)}
                />
              )}
            </SectionCard>

            {/* §9.7 — Key evidence */}
            <SectionCard
              title="Key evidence"
              actions={
                <Link href={`/customers/${customer.id}#evidence`} className="text-small text-[var(--text-link)] hover:underline">
                  View all evidence ({customer.evidence.length})
                </Link>
              }
            >
              {customer.evidence.length === 0 ? (
                <EmptyState title="No evidence" description="No signals have been recorded for this customer." />
              ) : (
                <EvidenceList items={customer.evidence.slice(0, 5).map((e) => ({ ...e, icon: undefined }))} />
              )}
            </SectionCard>

            {/* §9.8 — Recent transactions */}
            <SectionCard
              title="Recent transactions"
              actions={
                <Link href={`/customers/${customer.id}#transactions`} className="text-small text-[var(--text-link)] hover:underline">
                  View all in profile
                </Link>
              }
            >
              <TransactionMiniTable transactions={customer.transactions.slice(0, 5)} />
            </SectionCard>

            {/* §9.9 — Shared signals */}
            <SectionCard title="Shared signals">
              {customer.sharedSignals.length === 0 ? (
                <EmptyState title="No shared signals" description="No cross-identity signals detected." />
              ) : (
                <ul className="divide-y divide-[var(--border-subtle)]">
                  {customer.sharedSignals.slice(0, 6).map((sig) => (
                    <li
                      key={sig.signalType}
                      className="flex items-center gap-[var(--space-3)] px-[var(--space-4)] py-[var(--space-3)]"
                    >
                      <SignalBadge signal={sig.signalType} strength={sig.strength} />
                      <span className="ml-auto text-body-strong num text-[var(--text-primary)]">{sig.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

          </div>
        </>
      )}
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Compact transaction table for drawer
// ---------------------------------------------------------------------------
const TXN_COLUMNS = [
  {
    key: 'date',
    header: 'Date',
    render: (t: Transaction) => (
      <span className="text-small text-[var(--text-secondary)] num">{formatDateShort(t.date)}</span>
    ),
  },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right' as const,
    render: (t: Transaction) => (
      <span className="text-body num">{formatCurrencyNullable(t.amount, t.currency)}</span>
    ),
  },
  {
    key: 'refund',
    header: 'Refund',
    render: (t: Transaction) => (
      t.refund.status !== 'none' ? (
        <span className="text-small text-[var(--risk-medium-fg)]">
          {t.refund.status === 'full' ? 'Full' : 'Partial'}
        </span>
      ) : (
        <span className="text-small text-[var(--text-tertiary)]">—</span>
      )
    ),
  },
  {
    key: 'risk',
    header: 'Risk',
    render: (t: Transaction) => (
      <RiskScoreBadge score={t.riskScore} level={t.riskScore >= 85 ? 'critical' : t.riskScore >= 70 ? 'high' : t.riskScore >= 50 ? 'medium' : 'low'} size="sm" />
    ),
  },
];

function TransactionMiniTable({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return <EmptyState title="No transactions" description="No transaction history available." />;
  }
  return (
    <DataTable
      columns={TXN_COLUMNS}
      rows={transactions}
      getRowKey={(t) => t.id}
      density="compact"
    />
  );
}
