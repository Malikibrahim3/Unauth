import type { ReactNode } from 'react';
import Link from 'next/link';
import { CalendarDays, Info } from 'lucide-react';
import { Badge, MetricGroup, UnavailableValue } from '@/components/ui';
import type { Breadcrumb } from '@/components/authenticated/AuthenticatedPageHeader';
import { formatDateAbsolute } from '@/lib/utils/format';
import { buildCustomerProfileMetricLabels, type CustomerDataCoverage } from '@/app/(app)/customers/[id]/customerProfilePageLabels';
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
  hasCleanRecord: boolean | null;
  orderCoverage: CustomerDataCoverage;
  caseCoverage: CustomerDataCoverage;
  merchantClaimCount: number | null;
  merchantChargebackCount: number | null;
  merchantOrderCount: number | null;
  viewToken: string;
  openClaimCount: number | null;
  isEligibleForEvidence: boolean;
  totalOrderValue: number | null;
  totalRefundedValue: number | null;
  displayCurrency: string | null;
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
  caseCoverage,
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
  | 'caseCoverage'
  | 'merchantClaimCount'
  | 'viewToken'
  | 'openClaimCount'
  | 'isEligibleForEvidence'
  | 'gorgiasSource'
  | 'gorgiasTicketId'
>): { title: string; subtitle: string; breadcrumbs: Breadcrumb[]; actions: ReactNode; meta: ReactNode } {
  const status = openClaimCount != null && openClaimCount > 0
    ? <Badge tone="neutral" size="sm" dot>{openClaimCount} open case{openClaimCount === 1 ? '' : 's'}</Badge>
    : hasCleanRecord
      ? <Badge tone="neutral" size="sm" dot>No case history</Badge>
      : caseCoverage === 'complete'
        ? <Badge tone="neutral" size="sm">Past case history</Badge>
        : <Badge tone="neutral" size="sm">Case history unavailable</Badge>;

  const primaryAction = profile.possible_match_count > 0
    ? { label: `Review matches (${profile.possible_match_count})`, href: `/customers/${profile.id}?tab=identity` }
    : openClaimCount != null && openClaimCount > 0
      ? { label: 'Review open cases', href: `/customers/${profile.id}?tab=cases` }
      : merchantClaimCount != null && merchantClaimCount > 0
        ? { label: 'View case history', href: `/customers/${profile.id}?tab=cases` }
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
          <Link href={headerAction.href} className="ua-text-label inline-flex h-8 items-center rounded-[var(--uo-route-radius-control)] bg-[var(--uo-route-action-primary)] px-3 text-[var(--uo-route-action-primary-fg)]">
            {headerAction.label}
          </Link>
        ) : null}
      </>
    ),
    meta: (
      <>
        <span className="inline-flex items-center gap-1.5 text-[length:var(--uo-route-text-metadata-size)] text-[var(--uo-route-text-tertiary)]"><CalendarDays className="h-3 w-3" aria-hidden="true" />Customer since {formatDateAbsolute(profile.first_seen)} · Last active {formatDateAbsolute(profile.last_seen)}</span>
        {gorgiasSource === 'gorgias' ? <span className="inline-flex items-center gap-1.5 text-[length:var(--uo-route-text-metadata-size)] text-[var(--uo-route-text-secondary)]"><Info className="h-3 w-3" aria-hidden="true" />From Gorgias{gorgiasTicketId ? ` · case #${gorgiasTicketId}` : ''}</span> : null}
      </>
    ),
  };
}

/**
 * A headline KPI value must never truncate or wrap mid-word (§16.1). `MetricGroup`
 * itself has no long-value treatment, so a value that would overflow its slot
 * reuses `MetricCard`'s existing "shrink, then allow a clean wrap" class rather
 * than the default fixed 24px line. A bare "Unavailable" string routes through
 * `UnavailableValue` so the dash + word is drawn exactly once (F-27).
 */
function metricGroupValue(value: string): ReactNode {
  if (value === 'Unavailable') return <UnavailableValue placement="metric" />;
  if (value.length > 10) return <span className="ua-metric-card__value--long">{value}</span>;
  return value;
}

/** The `metrics` slot for the customer profile `PageFrame` (§8.1 consolidation). */
export function CustomerProfileMetrics({
  merchantOrderCount,
  orderCoverage,
  caseCoverage,
  merchantClaimCount,
  merchantChargebackCount,
  totalOrderValue,
  totalRefundedValue,
  displayCurrency,
  merchantNarrative,
}: Pick<
  CustomerProfilePageHeroProps,
  | 'merchantOrderCount'
  | 'orderCoverage'
  | 'caseCoverage'
  | 'merchantClaimCount'
  | 'merchantChargebackCount'
  | 'totalOrderValue'
  | 'totalRefundedValue'
  | 'displayCurrency'
  | 'merchantNarrative'
>) {
  const labels = buildCustomerProfileMetricLabels({
    orderCoverage,
    caseCoverage,
    merchantOrderCount,
    merchantClaimCount,
    merchantChargebackCount,
    totalOrderValue,
    totalRefundedValue,
    displayCurrency,
    merchantNarrative,
  });
  return (
    <MetricGroup aria-label="Customer record summary" items={[
      { label: 'Lifetime value', value: metricGroupValue(labels.lifetimeValue), description: labels.lifetimeValueDescription },
      { label: 'Orders', value: metricGroupValue(labels.orders), description: labels.averageOrder },
      { label: 'Case context', value: metricGroupValue(labels.caseContext), description: labels.caseDescription },
      { label: 'Value tied to cases', value: metricGroupValue(labels.tiedValue), description: labels.caseRate },
    ]} />
  );
}
