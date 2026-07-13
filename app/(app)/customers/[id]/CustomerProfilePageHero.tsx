'use client';

import Link from 'next/link';
import { Info } from 'lucide-react';
import { PanelCard } from '@/components/ui';
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
  void hasCleanRecord;
  void openClaimCount;
  void isEligibleForEvidence;
  void totalOrderValue;
  void merchantsSeen;
  void profileWideOrders;
  void localOrderSharePct;
  void networkChargebackRatePct;
  void thisStoreMerchantSharePct;
  void primaryIdentifier;
  void identitySignalRows;
  void density;
  void evidenceDisplay;
  return (
    <>
      {gorgiasSource === 'gorgias' ? (
        <PanelCard variant="appInset" className="mb-3 flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)]">
          <Info className="h-4 w-4" aria-hidden="true" /> From Gorgias{gorgiasTicketId ? ` · case #${gorgiasTicketId}` : ''}
        </PanelCard>
      ) : null}
      <header className="mb-5 border-b border-[var(--border-muted)] pb-5">
        <Link href="/customers" className="text-xs font-semibold text-[var(--accent)]">← Customers</Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{displayName}</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {profile.primary_email ?? 'Email unavailable'} · First seen {formatDateAbsolute(profile.first_seen)}
            </p>
          </div>
          {!viewToken ? <Link href="#cases" className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold">View payout cases</Link> : null}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
          {[
            ['Orders', formatNumber(merchantOrderCount)],
            ['Payout cases', formatNumber(merchantClaimCount)],
            ['Refund rate', `${localClaimRatePct.toFixed(0)}%`],
            ['Chargebacks', formatNumber(profile.total_chargebacks)],
          ].map(([metric, value]) => (
            <div key={metric} className="bg-[var(--surface)] p-3">
              <dt className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">{metric}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-[var(--text-primary)]">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          {formatNumber(merchantOrderCount)} orders since {formatDateAbsolute(profile.first_seen)}; {formatNumber(merchantClaimCount)} became payout cases ({localClaimRatePct.toFixed(0)}%) · {formatMoney(Math.round(totalRefundedValue * 100), displayCurrency)} refunded.
        </p>
      </header>
    </>
  );
}
