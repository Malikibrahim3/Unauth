import React, { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Info, ReceiptText, ShieldCheck } from 'lucide-react';
import WatchlistStarButton from '@/components/audit/WatchlistStarButton';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { GradeBadge } from '@/components/ui/GradeBadge';
import { GradeHeader } from '@/components/ui/GradeHeader';
import { NetworkFootprint } from '@/components/ui/NetworkFootprint';
import InvestigationStatusSelect from '@/components/customers/InvestigationStatusSelect';
import CaseSummaryStrip from '@/components/customers/CaseSummaryStrip';
import { CustomerProfileEvidenceTrigger } from '@/components/evidence/CustomerProfileEvidenceTrigger';
import { letterGradeTone } from '@/lib/utils/confidenceStyles';
import { formatCurrencyNullable, formatDateMode } from '@/lib/utils/format';
import { FLAG_EXPERIENCE_POLISH_V1 } from '@/lib/flags';
import { ConfidencePill } from '@/app/(app)/customers/[id]/CustomerProfilePageParts';
import type {
  CustomerProfileDisplay,
  IdentitySignalRow,
} from '@/app/(app)/customers/[id]/customerProfilePageLoad';
import type { ConfidenceGradeValue } from '@/lib/confidence';

const DENSITY_WEEK_KEYS = [
  'week-11', 'week-10', 'week-9', 'week-8', 'week-7', 'week-6',
  'week-5', 'week-4', 'week-3', 'week-2', 'week-1', 'week-0',
] as const;

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
}: CustomerProfilePageHeroProps) {
  const maxDensity = Math.max(...density, 1);
  const refundPct = totalOrderValue > 0 ? Math.min((totalRefundedValue / totalOrderValue) * 100, 100) : 0;
  const keptPct = 100 - refundPct;
  const storeSharePct = profileWideOrders > 0 ? Math.min((merchantOrderCount / profileWideOrders) * 100, 100) : 0;
  return (
    <>
      {gorgiasSource === 'gorgias' && (
        <div
          className="mb-4 flex items-center gap-3 rounded-md border px-4 py-2.5 text-sm"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
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
        </div>
      )}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={auditRunId ? `/audit/${auditRunId}?tab=customers` : '/customers'}
          className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          {auditRunId ? 'Back to Audit' : 'Back to Customers'}
        </Link>
        {auditRunId && (
          <>
            <span style={{ color: 'var(--border)' }}>/</span>
            <Link href="/customers" className="text-sm transition-colors hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>All Customers</Link>
          </>
        )}
        <span style={{ color: 'var(--border)' }}>/</span>
        <span className="text-sm font-medium truncate max-w-xs" style={{ color: 'var(--text)' }}>{displayName}</span>
      </div>

      <section className="mb-5 overflow-hidden rounded-md border" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="grid gap-4 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="t-page-title truncate" style={{ color: 'var(--text-primary)' }}>{displayName}</h1>
              <GradeBadge grade={profileGrade} size="lg" showLabel={true} />
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
              Identity evidence record for this customer. Use an evidence package when you need dispute documentation.
            </p>
            <NetworkFootprint
              className="mt-4"
              merchants={merchantsSeen}
              claims={merchantClaimCount}
              grade={profileGrade === 'F' ? null : profileGrade}
              kSatisfied={merchantsSeen >= 3}
            />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <InvestigationStatusSelect profileId={profile.id} initialStatus={profile.investigation_status ?? 'new'} />
              <WatchlistStarButton />
              {!viewToken && (
                <Link
                  href={`/customers/${profile.id}/claims`}
                  className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors hover:opacity-80"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-secondary)' }}
                >
                  <ReceiptText className="h-3.5 w-3.5" />
                  {openClaimCount > 0 ? `Claim records (${openClaimCount})` : 'Claim records'}
                </Link>
              )}
              <Suspense
                fallback={
                  <span
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold btn-accent"
                    style={{ opacity: 0.85 }}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Build evidence package
                  </span>
                }
              >
                <CustomerProfileEvidenceTrigger
                  profileId={profile.id}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors btn-accent"
                  style={!isEligibleForEvidence ? { opacity: 0.85 } : undefined}
                  title={isEligibleForEvidence ? undefined : 'Available when refund or chargeback activity is present'}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Build evidence package
                </CustomerProfileEvidenceTrigger>
              </Suspense>
            </div>
          </div>

          <div className="grid gap-px overflow-hidden rounded-md border" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', borderColor: 'var(--border)', background: 'var(--border)' }}>
            {([
              { label: 'Identity confidence', node: <GradeHeader grade={profileGrade} label="Identity confidence" supportingText={hasCleanRecord ? 'No claims in your data' : `${merchantClaimCount} of ${merchantOrderCount} orders had claims`} /> },
              { label: 'Cross-merchant', text: merchantsSeen > 1 ? `${merchantsSeen} merchants` : 'This store only', color: 'var(--text-primary)' },
              { label: 'Order value', text: formatCurrencyNullable(totalOrderValue), color: 'var(--text-primary)' },
              { label: 'Claims', text: merchantClaimCount.toLocaleString(), color: 'var(--text-primary)' },
              { label: 'Last seen', text: formatDateMode(profile.last_seen, 'table'), color: 'var(--data-date)', mono: true },
            ] as Array<{ label: string; node?: React.ReactNode; text?: string; color?: string; mono?: boolean }>).map((metric) => (
              <div key={metric.label} className="min-w-0 p-4" style={{ background: 'var(--surface)' }}>
                <p className="t-label" style={{ color: 'var(--text-tertiary)' }}>{metric.label}</p>
                {metric.node ? (
                  <div className="mt-1">{metric.node}</div>
                ) : (
                  <p className={`mt-1 leading-tight font-semibold num ${metric.mono ? 'font-mono' : ''}`} style={{ color: metric.color, fontSize: 16, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {metric.text}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex h-10 items-center gap-4 border-t px-4" style={{ background: 'var(--border)', borderColor: 'var(--border)' }}>
          <div
            className="flex flex-1 items-end gap-0.5 cursor-help"
            style={{ height: 28 }}
            title="Activity timeline — each bar is one week of orders and refund claims across all merchants"
          >
            {density.map((value, index) => {
              const heightPct = value > 0 ? Math.max((value / maxDensity) * 100, 20) : 12;
              return (
                <span
                  key={DENSITY_WEEK_KEYS[index]}
                  className="flex-1 rounded-sm"
                  style={{
                    height: `${heightPct}%`,
                    background: value > 0 ? 'var(--text-tertiary)' : 'var(--surface-sunken)',
                    opacity: value > 0 ? 0.85 : 0.35,
                  }}
                />
              );
            })}
          </div>
          <span className="t-mono whitespace-nowrap" style={{ color: 'var(--data-date)' }}>
            Last seen {formatDateMode(profile.last_seen, 'recent')}
          </span>
        </div>
      </section>

      {FLAG_EXPERIENCE_POLISH_V1 && !hasCleanRecord && (
        <div className="mb-[var(--space-5)]">
          <CaseSummaryStrip
            flaggedAt={profile.first_seen}
            orders={merchantOrderCount}
            exposure={totalOrderValue}
            cadence={Math.min(5, Math.max(1, Math.ceil(merchantOrderCount / 3)))}
            lastSeen={profile.last_seen}
            density={density}
          />
        </div>
      )}

      <section className="mb-[var(--space-5)] rounded-md border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p className="text-caption font-semibold" style={{ color: 'var(--text-secondary)' }}>Evidence scope</p>
          <span className="text-caption" style={{ color: 'var(--text-secondary)' }}>
            Compare what was observed in this store vs pseudonymous network exposure
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-md border p-3" style={{ borderColor: 'var(--border-muted)', background: 'var(--bg-inset)' }}>
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
                <div className="flex h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-sunken)' }}>
                  <div style={{ width: `${keptPct}%`, background: 'var(--neutral)', flexShrink: 0 }} />
                  <div style={{ width: `${refundPct}%`, background: 'var(--success)', flexShrink: 0 }} />
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <div className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-[2px] shrink-0" style={{ background: 'var(--neutral)' }} />
                    <span className="text-caption" style={{ color: 'var(--text-tertiary)' }}>Kept {keptPct.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-[2px] shrink-0" style={{ background: 'var(--success)' }} />
                    <span className="text-caption" style={{ color: 'var(--text-tertiary)' }}>Refunded {refundPct.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="rounded-md border p-3" style={{ borderColor: 'var(--border-muted)', background: 'var(--bg-inset)' }}>
            <p className="text-caption font-semibold mb-2" style={{ color: 'var(--text)' }}>Merchant-wide network</p>
            <div className="grid grid-cols-2 gap-y-1.5 text-caption">
              <span style={{ color: 'var(--text-secondary)' }}>Merchants seen</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>
                {merchantsSeen.toLocaleString()} (this store {thisStoreMerchantSharePct.toFixed(1)}%)
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>Profile orders</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>
                {profileWideOrders.toLocaleString()} (100%)
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>Chargebacks</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>
                {profile.total_chargebacks.toLocaleString()} ({networkChargebackRatePct.toFixed(1)}%)
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>First seen → last seen</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>
                {formatDateMode(profile.first_seen, 'table')} → {formatDateMode(profile.last_seen, 'table')}
              </span>
            </div>
            {profileWideOrders > 0 && merchantOrderCount > 0 && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-muted)' }}>
                <div className="flex items-center justify-between mb-1.5 text-caption" style={{ color: 'var(--text-tertiary)' }}>
                  <span>This store's share of profile orders</span>
                  <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{storeSharePct.toFixed(1)}%</span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-sunken)' }}>
                  <div style={{ width: `${storeSharePct}%`, background: 'var(--neutral)', flexShrink: 0 }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mb-[var(--space-5)] rounded-md border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <p className="text-caption font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Identity confidence · cross-store signals</p>
        <div className="rounded-md border overflow-hidden" style={{ borderColor: 'var(--border-muted)' }}>
          <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_110px_90px_140px] gap-3 px-3 py-2" style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-muted)' }}>
            <span className="text-caption font-semibold" style={{ color: 'var(--text-secondary)' }}>Primary identifier</span>
            <span className="text-caption font-semibold" style={{ color: 'var(--text-secondary)' }}>Linked signal</span>
            <span className="text-caption font-semibold" style={{ color: 'var(--text-secondary)' }}>Signal type</span>
            <span className="text-caption font-semibold" style={{ color: 'var(--text-secondary)' }}>Confidence</span>
            <span className="text-caption font-semibold" style={{ color: 'var(--text-secondary)' }}>Observed</span>
          </div>
          {identitySignalRows.map((signal) => {
            const observed = `${formatDateMode(profile.first_seen, 'table')} → ${formatDateMode(profile.last_seen, 'table')}`;
            return (
              <div key={`${signal.signalType}-${signal.value}`}>
                <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_110px_90px_140px] gap-3 px-3 py-2 border-t" style={{ borderColor: 'var(--border-muted)', background: 'var(--bg-inset)' }}>
                  <span className="font-mono text-caption truncate" style={{ color: 'var(--text)' }}>{primaryIdentifier}</span>
                  <span className="text-caption truncate" style={{ color: 'var(--text)' }}>{signal.value}</span>
                  <span className="text-caption" style={{ color: 'var(--text-secondary)' }}>{signal.signalType}</span>
                  <ConfidencePill grade={signal.grade} />
                  <span className="font-mono text-caption" style={{ color: 'var(--text-secondary)' }}>{observed}</span>
                </div>
                <div className="md:hidden border-t p-3 space-y-2" style={{ borderColor: 'var(--border-muted)', background: 'var(--bg-inset)' }}>
                  <div><span className="text-caption" style={{ color: 'var(--text-secondary)' }}>Primary</span><p className="font-mono text-caption break-all" style={{ color: 'var(--text)' }}>{primaryIdentifier}</p></div>
                  <div><span className="text-caption" style={{ color: 'var(--text-secondary)' }}>Linked signal</span><p className="text-caption break-all" style={{ color: 'var(--text)' }}>{signal.value}</p></div>
                  <div className="flex items-center justify-between gap-2"><span className="text-caption" style={{ color: 'var(--text-secondary)' }}>{signal.signalType}</span><ConfidencePill grade={signal.grade} /></div>
                  <div><span className="text-caption" style={{ color: 'var(--text-secondary)' }}>Observed</span><p className="font-mono text-caption" style={{ color: 'var(--text-secondary)' }}>{observed}</p></div>
                </div>
              </div>
            );
          })}
          {identitySignalRows.length === 0 && (
            <div className="p-3 border-t" style={{ borderColor: 'var(--border-muted)', background: 'var(--bg-inset)' }}>
              <p className="text-caption" style={{ color: 'var(--text-secondary)' }}>
                More signals appear as cross-store data accumulates
              </p>
            </div>
          )}
        </div>
        <p className="text-caption mt-2" style={{ color: 'var(--text-secondary)' }}>
          Signals are derived from merchant-scoped audit records. “Observed” shows when this profile first and most recently carried the linked signal in your available dataset.
        </p>
      </section>
    </>
  );
}
