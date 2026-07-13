import Link from 'next/link';
import { ArrowLeft, Info, ReceiptText, ShieldCheck } from 'lucide-react';
import CaseSummaryStrip from '@/components/customers/CaseSummaryStrip';
import { PanelCard } from '@/components/ui';
import { formatCurrencyNullable, formatDateMode } from '@/lib/utils/format';
import { FLAG_EXPERIENCE_POLISH_V1 } from '@/lib/flags';
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
  const refundPct = totalOrderValue > 0 ? Math.min((totalRefundedValue / totalOrderValue) * 100, 100) : 0;
  const keptPct = 100 - refundPct;
  void profileGrade;
  void isEligibleForEvidence;
  void merchantsSeen;
  void profileWideOrders;
  void localOrderSharePct;
  void networkChargebackRatePct;
  void thisStoreMerchantSharePct;
  void primaryIdentifier;
  void identitySignalRows;
  void evidenceDisplay;
  return (
    <>
      {gorgiasSource === 'gorgias' && (
        <PanelCard
          variant="app"
          className="mb-4 flex items-center gap-3 px-4 py-2.5 text-sm"
          style={{
            color: 'var(--text-secondary)',
          }}
        >
          <Info className="h-4 w-4 shrink-0" aria-hidden="true" style={{ color: 'var(--text-tertiary)' }} />
          <span>
            Source: Gorgias
            {gorgiasTicketId && (
              <> · case <span className="font-mono">#{gorgiasTicketId}</span></>
            )}
          </span>
        </PanelCard>
      )}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          {auditRunId ? 'Back to Audit' : 'Back to customer history'}
        </Link>
        {auditRunId && (
          <>
            <span style={{ color: 'var(--border)' }}>/</span>
            <Link href="/customers" className="text-sm transition-colors hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>Customer history</Link>
          </>
        )}
        <span style={{ color: 'var(--border)' }}>/</span>
        <span className="text-sm font-medium truncate max-w-xs" style={{ color: 'var(--text)' }}>{displayName}</span>
      </div>

      <PanelCard as="section" variant="app" className="mb-5 overflow-hidden p-0" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="grid gap-4 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="t-page-title truncate" style={{ color: 'var(--text-primary)' }}>{displayName}</h1>
            </div>
            {hasCleanRecord ? (
              <p
                className="mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-body-sm"
                style={{
                  background: 'var(--sev-clear-fill)',
                  borderColor: 'color-mix(in srgb, var(--neutral) 35%, transparent)',
                  color: 'var(--neutral)',
                }}
              >
                <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
                Clean record: no claims or chargebacks in your data.
              </p>
            ) : (
              <p className="mt-3 text-body-sm" style={{ color: 'var(--text-primary)' }}>
                <span className="font-semibold">This store:</span>{' '}
                {merchantClaimCount.toLocaleString()} of {merchantOrderCount.toLocaleString()} orders had claims
                {merchantOrderCount > 0 ? ` (${localClaimRatePct.toFixed(1)}%)` : ''}
                <span style={{ color: 'var(--text-tertiary)' }}> · </span>
                <span className="font-semibold">Merchant-wide:</span>{' '}
                {profile.total_chargebacks.toLocaleString()} chargeback{profile.total_chargebacks === 1 ? '' : 's'}
              </p>
            )}
            <p className="mt-2 t-mono break-all" style={{ color: 'var(--data-id)' }}>
              {profile.primary_email ?? profile.id}
            </p>
            <p className="mt-2 max-w-2xl text-body-sm" style={{ color: 'var(--text-secondary)' }}>
              Customer payout-history context for support decisions. Use this page to understand prior orders, payout cases, outcomes, and open exposure before reviewing the active case.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {!viewToken && (
                <Link
                  href={`/customers/${profile.id}/claims`}
                  className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors hover:opacity-80"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-secondary)' }}
                >
                  <ReceiptText className="h-3.5 w-3.5" />
                  {openClaimCount > 0 ? `Payout case history (${openClaimCount})` : 'Payout case history'}
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border sm:grid-cols-2" style={{ borderColor: 'var(--border)', background: 'var(--border)' }}>
            {([
              { label: 'Order value', text: formatCurrencyNullable(totalOrderValue), color: 'var(--text-primary)' },
              { label: 'Prior payout cases', text: merchantClaimCount.toLocaleString(), color: 'var(--text-primary)' },
              { label: 'Refunded', text: formatCurrencyNullable(totalRefundedValue), color: 'var(--text-primary)' },
              { label: 'Chargebacks', text: profile.total_chargebacks.toLocaleString(), color: 'var(--text-primary)' },
              { label: 'Last seen', text: formatDateMode(profile.last_seen, 'table'), color: 'var(--data-date)', mono: true },
            ] as Array<{ label: string; text?: string; color?: string; mono?: boolean }>).map((metric, index) => (
              <div key={metric.label} className={`min-w-0 p-4 ${index === 4 ? 'sm:col-span-2' : ''}`} style={{ background: 'var(--surface)' }}>
                <p className="t-label" style={{ color: 'var(--text-tertiary)' }}>{metric.label}</p>
                <p className={`mt-1 leading-tight font-semibold num ${metric.mono ? 'font-mono' : ''}`} style={{ color: metric.color, fontSize: 16, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  {metric.text}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex min-h-10 items-center justify-end border-t px-4" style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)' }}>
          <span className="t-mono whitespace-nowrap" style={{ color: 'var(--data-date)' }}>
            Last seen {formatDateMode(profile.last_seen, 'recent')}
          </span>
        </div>
      </PanelCard>

      {FLAG_EXPERIENCE_POLISH_V1 && !hasCleanRecord && (
        <div className="mb-[var(--space-5)]">
          <CaseSummaryStrip
            flaggedAt={profile.first_seen}
            orders={merchantOrderCount}
            exposure={totalOrderValue}
            lastSeen={profile.last_seen}
            density={density}
          />
        </div>
      )}

      <PanelCard as="section" variant="app" className="mb-[var(--space-5)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p className="text-caption font-semibold" style={{ color: 'var(--text-secondary)' }}>Evidence scope</p>
          <span className="text-caption" style={{ color: 'var(--text-secondary)' }}>
            Prior orders, payouts, and first/last seen dates for this merchant context
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <PanelCard variant="appInset" className="p-3">
            <p className="text-caption font-semibold mb-2" style={{ color: 'var(--text)' }}>This store</p>
            <div className="grid grid-cols-2 gap-y-1.5 text-caption">
              <span style={{ color: 'var(--text-secondary)' }}>Orders</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>
                {merchantOrderCount.toLocaleString()} ({localOrderSharePct.toFixed(1)}%)
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>Claims</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>
                {merchantClaimCount.toLocaleString()} ({localClaimRatePct.toFixed(1)}%)
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>Order value</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>{formatCurrencyNullable(totalOrderValue)}</span>
              <span style={{ color: 'var(--text-secondary)' }}>Refunded</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>{formatCurrencyNullable(totalRefundedValue)}</span>
            </div>
            {totalOrderValue > 0 && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-muted)' }}>
                <dl className="grid grid-cols-2 gap-2 text-caption"><div><dt style={{ color: 'var(--text-tertiary)' }}>Kept</dt><dd className="font-mono" style={{ color: 'var(--text)' }}>{formatCurrencyNullable(totalOrderValue - totalRefundedValue)} · {keptPct.toFixed(1)}%</dd></div><div><dt style={{ color: 'var(--text-tertiary)' }}>Refunded</dt><dd className="font-mono" style={{ color: 'var(--text)' }}>{formatCurrencyNullable(totalRefundedValue)} · {refundPct.toFixed(1)}%</dd></div></dl>
              </div>
            )}
          </PanelCard>
          <PanelCard variant="appInset" className="p-3">
            <p className="text-caption font-semibold mb-2" style={{ color: 'var(--text)' }}>Payout history</p>
            <div className="grid grid-cols-2 gap-y-1.5 text-caption">
              <span style={{ color: 'var(--text-secondary)' }}>Merchant orders</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>
                {merchantOrderCount.toLocaleString()}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>Prior payout cases</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>
                {merchantClaimCount.toLocaleString()}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>Chargebacks</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>
                {profile.total_chargebacks.toLocaleString()}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>First seen → last seen</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>
                {formatDateMode(profile.first_seen, 'table')} → {formatDateMode(profile.last_seen, 'table')}
              </span>
            </div>
          </PanelCard>
        </div>
      </PanelCard>
    </>
  );
}
