'use client';

import Link from 'next/link';
import { CalendarDays, CircleDollarSign, Info, ReceiptText, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui';
import { KeyInsightCallout } from '@/components/ui/KeyInsightCallout';
import { AuthenticatedPageHeader } from '@/components/authenticated/AuthenticatedPageHeader';
import pageStyles from '@/components/authenticated/AuthenticatedPageChrome.module.css';
import { formatDateAbsolute, formatMoney, formatNumber } from '@/lib/utils/format';
import { useBreadcrumbLabel } from '@/components/layout/BreadcrumbOverrideContext';
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

export function CustomerProfilePageHero({
  auditRunId,
  displayName,
  profile,
  profileGrade,
  hasCleanRecord,
  merchantClaimCount,
  merchantChargebackCount,
  merchantOrderCount,
  localClaimRatePct,
  viewToken,
  openClaimCount,
  isEligibleForEvidence,
  totalOrderValue,
  totalRefundedValue,
  displayCurrency,
  merchantsSeen,
  profileWideOrders,
  localOrderSharePct,
  networkChargebackRatePct,
  thisStoreMerchantSharePct,
  density,
  primaryIdentifier,
  identitySignalRows,
  merchantNarrative,
  gorgiasSource,
  gorgiasTicketId,
  evidenceDisplay,
}: CustomerProfilePageHeroProps) {
  useBreadcrumbLabel(displayName);
  void auditRunId;
  void isEligibleForEvidence;
  void profileGrade;
  void primaryIdentifier;
  void identitySignalRows;
  void density;
  void merchantsSeen;
  void profileWideOrders;
  void localOrderSharePct;
  void networkChargebackRatePct;
  void thisStoreMerchantSharePct;
  void evidenceDisplay;

  const averageOrderValue = merchantOrderCount > 0 ? totalOrderValue / merchantOrderCount : 0;
  const status = openClaimCount > 0
    ? <Badge tone="warning" size="sm" dot>{openClaimCount} open case{openClaimCount === 1 ? '' : 's'}</Badge>
    : hasCleanRecord
      ? <Badge tone="success" size="sm" dot>No payout case history</Badge>
      : <Badge tone="neutral" size="sm">Past case history</Badge>;

  const primaryAction = profile.possible_match_count > 0
    ? { label: `Review matches (${profile.possible_match_count})`, href: '#identity' }
    : openClaimCount > 0
      ? { label: 'Review open cases', href: '#cases' }
      : merchantClaimCount > 0
        ? { label: 'View case history', href: '#cases' }
        : null;

  return (
    <>
      <AuthenticatedPageHeader
        title={displayName}
        subtitle={profile.primary_email ?? 'Email unavailable'}
        breadcrumbs={[{ label: 'Customers', href: '/customers' }, { label: displayName }]}
        actions={<>{status}{!viewToken && primaryAction ? <Link href={primaryAction.href} className="inline-flex h-8 items-center rounded-[var(--ua-radius-control)] bg-[var(--ua-action-primary)] px-3 text-[length:var(--ua-text-micro-size)] font-semibold text-[var(--ua-action-primary-fg)]">{primaryAction.label}</Link> : null}</>}
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)]"><CalendarDays className="h-3 w-3" aria-hidden="true" />Customer since {formatDateAbsolute(profile.first_seen)} · Last active {formatDateAbsolute(profile.last_seen)}</span>
            {gorgiasSource === 'gorgias' ? <span className="inline-flex items-center gap-1.5 text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-secondary)]"><Info className="h-3 w-3" aria-hidden="true" />From Gorgias{gorgiasTicketId ? ` · case #${gorgiasTicketId}` : ''}</span> : null}
          </>
        }
      />
      <div className={pageStyles.pageBody}>
        <div className={pageStyles.workbenchStack}>
          <div className={pageStyles.kpiStrip} style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}>
            {[
              { label: 'Lifetime value', value: formatMoney(Math.round(totalOrderValue * 100), displayCurrency), icon: CircleDollarSign },
              { label: 'Orders', value: formatNumber(merchantOrderCount), icon: ReceiptText },
              { label: 'Average order', value: formatMoney(Math.round(averageOrderValue * 100), displayCurrency), icon: ReceiptText },
              { label: 'Case rate', value: `${localClaimRatePct.toFixed(0)}%`, icon: ShieldCheck },
              { label: 'Refund requests · 365d', value: formatNumber(profile.refund_requests_365d), icon: TriangleAlert },
              { label: 'Value tied to cases', value: formatMoney(Math.round(totalRefundedValue * 100), displayCurrency), icon: TriangleAlert },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className={pageStyles.kpiItem}>
                <p className={`${pageStyles.kpiLabel} flex items-center gap-1.5`}><Icon className="h-3 w-3" aria-hidden="true" />{label}</p>
                <p className={pageStyles.kpiValue}>{value}</p>
              </div>
            ))}
          </div>
          <KeyInsightCallout
            icon={<Info className="h-4 w-4" aria-hidden="true" />}
            tone={merchantClaimCount > 0 ? 'warning' : 'neutral'}
            detail={merchantChargebackCount > 0 ? `${formatNumber(merchantChargebackCount)} chargeback${merchantChargebackCount === 1 ? '' : 's'}` : undefined}
          >
            {merchantNarrative}
          </KeyInsightCallout>
        </div>
      </div>
    </>
  );
}
