import { SectionCard } from '@/components/ui/SectionCard';
import { MetricCard } from '@/components/ui/MetricCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrencyNullable, formatDateTime, formatNumber } from '@/lib/utils/format';
import { formatFiledDate } from '@/lib/claims/sla';
import {
  CLAIM_STATUS_LABELS,
  CLAIM_TYPE_LABELS,
} from '@/app/(app)/customers/[id]/customerProfilePageLabels';
import type {
  ClaimSummaryRow,
  CustomerProfileDisplay,
} from '@/app/(app)/customers/[id]/customerProfilePageLoad';

export type CustomerProfilePageSidebarProps = {
  profile: CustomerProfileDisplay;
  merchantOrderCount: number;
  merchantClaimCount: number;
  totalOrderValue: number;
  totalRefundedValue: number;
  merchantRefundRate: number;
  openClaimCount: number;
  latestClaim: ClaimSummaryRow | null;
};

export function CustomerProfilePageSidebar({
  profile,
  merchantOrderCount,
  merchantClaimCount,
  totalOrderValue,
  totalRefundedValue,
  merchantRefundRate,
  openClaimCount,
  latestClaim,
}: CustomerProfilePageSidebarProps) {
  return (
    <div className="space-y-[var(--space-5)] xl:sticky xl:top-16 xl:self-start xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto">
      <SectionCard title="Record">
        <div className="grid grid-cols-2 gap-[var(--space-3)] mb-[var(--space-4)]">
          <MetricCard label="Merchant orders" value={merchantOrderCount} hint={formatCurrencyNullable(totalOrderValue)} density="compact" />
          <MetricCard label="Merchant claims" value={merchantClaimCount} hint={`${merchantRefundRate}% refund rate`} density="compact" />
          <MetricCard label="Refunded" value={formatCurrencyNullable(totalRefundedValue)} density="compact" />
          <MetricCard label="Chargebacks" value={profile.total_chargebacks} density="compact" />
          <MetricCard label="Fastest claim" value={profile.fastest_claim_days != null ? `${profile.fastest_claim_days}d` : '—'} density="compact" />
          <MetricCard label="Avg claim" value={profile.avg_claim_days != null ? `${Math.round(profile.avg_claim_days)}d` : '—'} density="compact" />
        </div>

        <div className="space-y-3 pt-[var(--space-4)]" style={{ borderTop: '1px solid var(--border-muted)' }}>
          <div className="grid grid-cols-2 gap-3 text-caption">
            <div>
              <p style={{ color: 'var(--text-secondary)' }}>First seen</p>
              <p className="font-medium" style={{ color: 'var(--text)' }}>{formatDateTime(profile.first_seen)}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)' }}>Last seen</p>
              <p className="font-medium" style={{ color: 'var(--text)' }}>{formatDateTime(profile.last_seen)}</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Dispute context" description="Summary you can reference when responding in Gorgias, Zendesk, or Shopify.">
        {latestClaim ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Open disputes" value={formatNumber(openClaimCount)} density="compact" />
              <MetricCard label="Latest status" value={CLAIM_STATUS_LABELS[latestClaim.status] ?? latestClaim.status} density="compact" />
            </div>
            <div className="rounded-md border p-3" style={{ borderColor: 'var(--border-muted)', background: 'var(--bg-inset)' }}>
              <p className="text-caption" style={{ color: 'var(--text-secondary)' }}>Latest dispute signal</p>
              <p className="text-body-sm font-semibold" style={{ color: 'var(--text)' }}>{CLAIM_TYPE_LABELS[latestClaim.claim_type] ?? latestClaim.claim_type}</p>
              <p className="font-mono text-caption" style={{ color: 'var(--text-secondary)' }}>{latestClaim.shopify_order_id ?? latestClaim.order_ref ?? latestClaim.id.slice(0, 8)}</p>
              <p className="mt-2 text-caption" style={{ color: 'var(--text-secondary)' }}>Filed {formatFiledDate(latestClaim)}</p>
            </div>
          </div>
        ) : (
          <EmptyState title="No dispute signals" description="When Shopify or your PSP reports a claim, context will appear here for your helpdesk ticket." />
        )}
      </SectionCard>
    </div>
  );
}
