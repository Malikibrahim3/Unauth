'use client';

import Link from 'next/link';
import { CalendarDays, CircleDollarSign, Info, ReceiptText, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Badge, Card } from '@/components/ui';
import { formatDateAbsolute, formatMoney, formatNumber } from '@/lib/utils/format';
import { useBreadcrumbLabel } from '@/components/layout/BreadcrumbOverrideContext';
import type {
  CustomerProfileDisplay,
} from '@/app/(app)/customers/[id]/customerProfilePageLoad';

export type CustomerProfilePageHeroProps = {
  displayName: string;
  profile: CustomerProfileDisplay;
  hasCleanRecord: boolean;
  merchantClaimCount: number;
  merchantChargebackCount: number;
  merchantOrderCount: number;
  localClaimRatePct: number;
  viewToken: string;
  openClaimCount: number;
  totalOrderValue: number;
  totalRefundedValue: number;
  displayCurrency: string;
  gorgiasSource?: string | null;
  gorgiasTicketId?: string | null;
};

export function CustomerProfilePageHero({
  displayName,
  profile,
  hasCleanRecord,
  merchantClaimCount,
  merchantChargebackCount,
  merchantOrderCount,
  localClaimRatePct,
  viewToken,
  openClaimCount,
  totalOrderValue,
  totalRefundedValue,
  displayCurrency,
  gorgiasSource,
  gorgiasTicketId,
}: CustomerProfilePageHeroProps) {
  useBreadcrumbLabel(displayName);
  const averageOrderValue = merchantOrderCount > 0 ? totalOrderValue / merchantOrderCount : 0;
  return (
    <>
      {gorgiasSource === 'gorgias' ? (
        <Card unstyled variant="inset" className="mb-3 flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)]">
          <Info className="h-4 w-4" aria-hidden="true" /> From Gorgias{gorgiasTicketId ? ` · case #${gorgiasTicketId}` : ''}
        </Card>
      ) : null}
      <header className="mb-6">
        <Link href="/customers" className="text-xs font-semibold text-[var(--accent)]">Customer directory</Link>
        <Card unstyled variant="flat" className="mt-3 overflow-hidden p-0 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5 border-b border-[var(--border-muted)] bg-[var(--surface-sunken)] p-5 sm:p-6">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-lg font-semibold text-[var(--text-primary)] shadow-sm ring-1 ring-[var(--border)]">
                {displayName.split(/\s+|@/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'C'}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-semibold text-[var(--text-primary)]">{displayName}</h1>
                  {openClaimCount > 0 ? <Badge tone="warning" size="sm" dot>{openClaimCount} open case{openClaimCount === 1 ? '' : 's'}</Badge> : hasCleanRecord ? <Badge tone="success" size="sm" dot>No payout case history</Badge> : <Badge tone="neutral" size="sm">Past case history</Badge>}
                </div>
                <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">{profile.primary_email ?? 'Email unavailable'}</p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Customer since {formatDateAbsolute(profile.first_seen)} · Last active {formatDateAbsolute(profile.last_seen)}</p>
              </div>
            </div>
            {!viewToken ? <Link href="#cases" className="rounded-md bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--accent-fg-on-500)]">{openClaimCount > 0 ? 'Review open cases' : 'View case history'}</Link> : null}
          </div>

          <div className="grid grid-cols-2 gap-px bg-[var(--border-muted)] lg:grid-cols-4">
            {[
              { label: 'Lifetime value', value: formatMoney(Math.round(totalOrderValue * 100), displayCurrency), hint: `${formatNumber(merchantOrderCount)} store orders`, icon: CircleDollarSign },
              { label: 'Average order', value: formatMoney(Math.round(averageOrderValue * 100), displayCurrency), hint: 'Across this store', icon: ReceiptText },
              { label: 'Value tied to cases', value: formatMoney(Math.round(totalRefundedValue * 100), displayCurrency), hint: `${formatNumber(merchantClaimCount)} payout cases`, icon: TriangleAlert },
              { label: 'Case rate', value: `${localClaimRatePct.toFixed(0)}%`, hint: `${formatNumber(merchantChargebackCount)} store chargebacks`, icon: ShieldCheck },
            ].map(({ label, value, hint, icon: Icon }) => (
              <div key={label} className="bg-[var(--surface)] p-4 sm:p-5">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]"><Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}</div>
                <div className="mt-2 text-xl font-semibold tabular-nums text-[var(--text-primary)]">{value}</div>
                <div className="mt-1 text-xs text-[var(--text-secondary)]">{hint}</div>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2.5 border-t border-[var(--border-muted)] px-5 py-3.5 text-sm text-[var(--text-secondary)]">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{merchantOrderCount === 0 ? 'No merchant-owned order history is linked to this customer.' : merchantClaimCount === 0 ? `This customer has placed ${formatNumber(merchantOrderCount)} orders in your store with no linked payout cases.` : `${formatNumber(merchantClaimCount)} of ${formatNumber(merchantOrderCount)} orders have linked payout cases. Review the order and case history below before taking action.`}</p>
          </div>
        </Card>
      </header>
    </>
  );
}
