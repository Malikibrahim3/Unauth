'use client';

import Link from 'next/link';
import { CalendarDays, CircleDollarSign, Info, ReceiptText, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Badge, PanelCard } from '@/components/ui';
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
  gorgiasSource,
  gorgiasTicketId,
  evidenceDisplay,
}: CustomerProfilePageHeroProps) {
  useBreadcrumbLabel(displayName);
  void auditRunId;
  void profileGrade;
  void isEligibleForEvidence;
  void merchantsSeen;
  void profileWideOrders;
  void localOrderSharePct;
  void networkChargebackRatePct;
  void thisStoreMerchantSharePct;
  void primaryIdentifier;
  void identitySignalRows;
  void density;
  void evidenceDisplay;
  const averageOrderValue = merchantOrderCount > 0 ? totalOrderValue / merchantOrderCount : 0;
  const status = openClaimCount > 0
    ? <Badge tone="warning" size="sm" dot>{openClaimCount} open case{openClaimCount === 1 ? '' : 's'}</Badge>
    : hasCleanRecord
      ? <Badge tone="success" size="sm" dot>No payout case history</Badge>
      : <Badge tone="neutral" size="sm">Past case history</Badge>;
  const assessment = merchantOrderCount === 0
    ? 'No merchant-owned order history is linked to this customer.'
    : merchantClaimCount === 0
      ? `This customer has placed ${formatNumber(merchantOrderCount)} orders in your store with no linked payout cases.`
      : `${formatNumber(merchantClaimCount)} of ${formatNumber(merchantOrderCount)} orders have linked payout cases. Review the order and case history below before taking action.`;

  return (
    <>
      <AuthenticatedPageHeader
        eyebrow="Customer record"
        title={displayName}
        subtitle={profile.primary_email ?? 'Email unavailable'}
        breadcrumbs={[{ label: 'Customers', href: '/customers' }, { label: displayName }]}
        actions={<>{status}{!viewToken ? <Link href="#cases" className="inline-flex h-8 items-center rounded-[var(--ua-radius-input)] bg-[var(--accent)] px-3 text-[11px] font-semibold text-white">{openClaimCount > 0 ? 'Review open cases' : 'View case history'}</Link> : null}</>}
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary)]"><CalendarDays className="h-3 w-3" aria-hidden="true" />Customer since {formatDateAbsolute(profile.first_seen)} · Last active {formatDateAbsolute(profile.last_seen)}</span>
            {gorgiasSource === 'gorgias' ? <span className="inline-flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]"><Info className="h-3 w-3" aria-hidden="true" />From Gorgias{gorgiasTicketId ? ` · case #${gorgiasTicketId}` : ''}</span> : null}
          </>
        }
      />
      <div className={pageStyles.pageBody}>
        <div className={pageStyles.workbenchStack}>
          <div className={pageStyles.kpiStrip} style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
            {[
              { label: 'Lifetime value', value: formatMoney(Math.round(totalOrderValue * 100), displayCurrency), hint: `${formatNumber(merchantOrderCount)} store orders`, icon: CircleDollarSign },
              { label: 'Average order', value: formatMoney(Math.round(averageOrderValue * 100), displayCurrency), hint: 'Across this store', icon: ReceiptText },
              { label: 'Value tied to cases', value: formatMoney(Math.round(totalRefundedValue * 100), displayCurrency), hint: `${formatNumber(merchantClaimCount)} payout cases`, icon: TriangleAlert },
              { label: 'Case rate', value: `${localClaimRatePct.toFixed(0)}%`, hint: `${formatNumber(merchantChargebackCount)} store chargebacks`, icon: ShieldCheck },
            ].map(({ label, value, hint, icon: Icon }) => (
              <div key={label} className={pageStyles.kpiItem}>
                <p className={`${pageStyles.kpiLabel} flex items-center gap-1.5`}><Icon className="h-3 w-3" aria-hidden="true" />{label}</p>
                <p className={pageStyles.kpiValue}>{value}</p>
                <p className={pageStyles.kpiHint}>{hint}</p>
              </div>
            ))}
          </div>
          <PanelCard variant="appInset" className="flex items-start gap-2.5 px-4 py-3 text-[11px] leading-5 text-[var(--text-secondary)]">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <p>{assessment}</p>
          </PanelCard>
        </div>
      </div>
    </>
  );
}
