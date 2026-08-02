import type { ReactNode } from 'react';
import Link from 'next/link';
import { CalendarDays, Info } from 'lucide-react';
import { Badge, MetricGroup } from '@/components/ui';
import type { Breadcrumb } from '@/components/authenticated/AuthenticatedPageHeader';
import { formatDateAbsolute, formatMoney, formatNumber } from '@/lib/utils/format';
import type {
  CustomerEvidenceDisplay,
  CustomerProfileDisplay,
  IdentitySignalRow,
} from '@/app/(app)/customers/[id]/customerProfilePageLoad';
import type { ConfidenceGradeValue } from '@/lib/confidence';

export type CustomerProfilePageHeroProps = {
  auditRunId: string | null;
  displayName: string;
  profile: CustomerProfileDisplay;
  profileGrade: ConfidenceGradeValue;
  hasCleanRecord: boolean;
  merchantClaimCount: number;
  merchantChargebackCount: number;
  merchantOrderCount: number;
  localClaimRatePct: number;
  viewToken: string;
  openClaimCount: number;
  isEligibleForEvidence: boolean;
  totalOrderValue: number;
  totalRefundedValue: number;
  displayCurrency: string;
  merchantsSeen: number;
  profileWideOrders: number;
  localOrderSharePct: number;
  networkChargebackRatePct: number;
  thisStoreMerchantSharePct: number;
  density: number[];
  primaryIdentifier: string;
  identitySignalRows: IdentitySignalRow[];
  merchantNarrative: string;
  gorgiasSource?: string | null;
  gorgiasTicketId?: string | null;
  evidenceDisplay?: CustomerEvidenceDisplay | null;
};

/** Builds the `PageFrame` header props for the customer profile route (§8.1 consolidation). */
export function buildCustomerProfileHeroHeader({
  displayName,
  profile,
  hasCleanRecord,
  merchantClaimCount,
  viewToken,
  openClaimCount,
  isEligibleForEvidence,
  gorgiasSource,
  gorgiasTicketId,
}: Pick<
  CustomerProfilePageHeroProps,
  | 'displayName'
  | 'profile'
  | 'hasCleanRecord'
  | 'merchantClaimCount'
  | 'viewToken'
  | 'openClaimCount'
  | 'isEligibleForEvidence'
  | 'gorgiasSource'
  | 'gorgiasTicketId'
>): { title: string; subtitle: string; breadcrumbs: Breadcrumb[]; actions: ReactNode; meta: ReactNode } {
  const status = openClaimCount > 0
    ? <Badge tone="warning" size="sm" dot>{openClaimCount} open case{openClaimCount === 1 ? '' : 's'}</Badge>
    : hasCleanRecord
      ? <Badge tone="success" size="sm" dot>No case history</Badge>
      : <Badge tone="neutral" size="sm">Past case history</Badge>;

  const primaryAction = profile.possible_match_count > 0
    ? { label: `Review matches (${profile.possible_match_count})`, href: '#identity' }
    : openClaimCount > 0
      ? { label: 'Review open cases', href: '#cases' }
      : merchantClaimCount > 0
        ? { label: 'View case history', href: '#cases' }
        : null;
  const evidenceAction = isEligibleForEvidence
    ? { label: 'Build evidence package', href: `/customers/${profile.id}/evidence/new` }
    : null;
  const headerAction = evidenceAction ?? primaryAction;

  return {
    title: displayName,
    subtitle: profile.primary_email ?? 'Email unavailable',
    breadcrumbs: [{ label: 'Customers', href: '/customers' }, { label: displayName }],
    actions: (
      <>
        {status}
        {!viewToken && headerAction ? (
          <Link href={headerAction.href} className="ua-text-label inline-flex h-8 items-center rounded-[var(--ua-radius-control)] bg-[var(--ua-action-primary)] px-3 text-[var(--ua-action-primary-fg)]">
            {headerAction.label}
          </Link>
        ) : null}
      </>
    ),
    meta: (
      <>
        <span className="inline-flex items-center gap-1.5 text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]"><CalendarDays className="h-3 w-3" aria-hidden="true" />Customer since {formatDateAbsolute(profile.first_seen)} · Last active {formatDateAbsolute(profile.last_seen)}</span>
        {gorgiasSource === 'gorgias' ? <span className="inline-flex items-center gap-1.5 text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-secondary)]"><Info className="h-3 w-3" aria-hidden="true" />From Gorgias{gorgiasTicketId ? ` · case #${gorgiasTicketId}` : ''}</span> : null}
      </>
    ),
  };
}

/** The `metrics` slot for the customer profile `PageFrame` (§8.1 consolidation). */
export function CustomerProfileMetrics({
  merchantOrderCount,
  merchantClaimCount,
  merchantChargebackCount,
  totalOrderValue,
  totalRefundedValue,
  localClaimRatePct,
  displayCurrency,
  merchantNarrative,
}: Pick<
  CustomerProfilePageHeroProps,
  | 'merchantOrderCount'
  | 'merchantClaimCount'
  | 'merchantChargebackCount'
  | 'totalOrderValue'
  | 'totalRefundedValue'
  | 'localClaimRatePct'
  | 'displayCurrency'
  | 'merchantNarrative'
>) {
  const averageOrderValue = merchantOrderCount > 0 ? totalOrderValue / merchantOrderCount : 0;
  return (
    <MetricGroup aria-label="Customer record summary" items={[
      { label: 'Lifetime value', value: formatMoney(Math.round(totalOrderValue * 100), displayCurrency), description: 'Merchant-owned orders' },
      { label: 'Orders', value: formatNumber(merchantOrderCount), description: `Average ${formatMoney(Math.round(averageOrderValue * 100), displayCurrency)}` },
      { label: 'Case context', value: merchantClaimCount > 0 ? `${merchantClaimCount} case${merchantClaimCount === 1 ? '' : 's'}` : 'No recorded cases', description: merchantChargebackCount > 0 ? `${merchantChargebackCount} chargeback${merchantChargebackCount === 1 ? '' : 's'}` : merchantNarrative },
      { label: 'Value tied to cases', value: formatMoney(Math.round(totalRefundedValue * 100), displayCurrency), description: `${localClaimRatePct.toFixed(0)}% case rate` },
    ]} />
  );
}
