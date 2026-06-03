import { Suspense } from 'react';
import Link from 'next/link';
import { FileText, ReceiptText, ShieldCheck } from 'lucide-react';
import WatchlistStarButton from '@/components/audit/WatchlistStarButton';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
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
}: CustomerProfilePageHeroProps) {
  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={auditRunId ? `/audit/${auditRunId}?tab=customers` : '/customers'}
          className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          {auditRunId ? 'Back to Audit' : 'Back to Customers'}
        </Link>
        {auditRunId && (
          <>
            <span style={{ color: 'var(--border)' }}>/</span>
            <Link href="/customers" className="text-sm transition-colors hover:opacity-80" style={{ color: 'var(--text-muted)' }}>All Customers</Link>
          </>
        )}
        <span style={{ color: 'var(--border)' }}>/</span>
        <span className="text-sm font-medium truncate max-w-xs" style={{ color: 'var(--text)' }}>{displayName}</span>
      </div>

      <section className="mb-5 overflow-hidden rounded-md border" style={{ background: 'var(--surface-raised)', borderColor: 'var(--surface-border)' }}>
        <div className="grid gap-4 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="t-heading truncate" style={{ color: 'var(--ink-primary)' }}>{displayName}</h1>
              <ConfidenceBadge grade={profileGrade} />
            </div>
            {hasCleanRecord ? (
              <p
                className="mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-body-sm"
                style={{
                  background: 'var(--sev-clear-fill)',
                  borderColor: 'color-mix(in srgb, var(--sev-clear) 35%, transparent)',
                  color: 'var(--sev-clear)',
                }}
              >
                <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
                Clean record: no claims or chargebacks in your data.
              </p>
            ) : (
              <p className="mt-3 text-body-sm" style={{ color: 'var(--ink-primary)' }}>
                <span className="font-semibold">This store:</span>{' '}
                {merchantClaimCount.toLocaleString()} of {merchantOrderCount.toLocaleString()} orders had claims
                {merchantOrderCount > 0 ? ` (${localClaimRatePct.toFixed(1)}%)` : ''}
                <span style={{ color: 'var(--ink-tertiary)' }}> · </span>
                <span className="font-semibold">Merchant-wide:</span>{' '}
                {profile.total_chargebacks.toLocaleString()} chargeback{profile.total_chargebacks === 1 ? '' : 's'}
              </p>
            )}
            <p className="mt-2 t-mono break-all" style={{ color: 'var(--data-id)' }}>
              {profile.primary_email ?? profile.id}
            </p>
            <p className="mt-2 max-w-2xl text-body-sm" style={{ color: 'var(--ink-secondary)' }}>
              Take this context back to your Gorgias or Zendesk ticket. Use an evidence package when you need documentation, and keep final merchant decisions outside Unauth.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <InvestigationStatusSelect profileId={profile.id} initialStatus={profile.investigation_status ?? 'new'} />
              <WatchlistStarButton />
              {!viewToken && (
                <Link
                  href={`/customers/${profile.id}/claims`}
                  className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors hover:opacity-80"
                  style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)', color: 'var(--ink-secondary)' }}
                >
                  <ReceiptText className="h-3.5 w-3.5" />
                  {openClaimCount > 0 ? `Review claims (${openClaimCount})` : 'Review claims'}
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

          <div className="grid gap-px overflow-hidden rounded-md border" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', borderColor: 'var(--surface-border)', background: 'var(--surface-border)' }}>
            {[
              { label: 'Identity grade', value: profileGrade, color: letterGradeTone(profileGrade).fg },
              {
                label: 'Cross-merchant',
                value: merchantsSeen > 1 ? `${merchantsSeen} merchants` : 'This store only',
                color: 'var(--data-score)',
              },
              { label: 'Order value', value: formatCurrencyNullable(totalOrderValue), color: 'var(--data-score)' },
              { label: 'Claims', value: merchantClaimCount.toLocaleString(), color: 'var(--data-score)' },
              { label: 'Last seen', value: formatDateMode(profile.last_seen, 'table'), color: 'var(--data-date)', mono: true },
            ].map((metric) => (
              <div key={metric.label} className="min-w-0 p-4" style={{ background: 'var(--surface-raised)' }}>
                <p className="t-label" style={{ color: 'var(--ink-tertiary)' }}>{metric.label}</p>
                <p className={`mt-1 leading-tight font-semibold num ${metric.mono ? 'font-mono' : ''}`} style={{ color: metric.color, fontSize: 16, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex h-10 items-center gap-4 border-t px-4" style={{ background: 'var(--surface-border)', borderColor: 'var(--surface-border)' }}>
          <div
            className="flex flex-1 gap-1 cursor-help"
            title="Activity timeline — each bar is one week of orders and refund claims across all merchants"
          >
            {density.map((value, index) => (
              <span
                key={DENSITY_WEEK_KEYS[index]}
                className="h-2 flex-1 rounded-sm"
                style={{ background: value > 0 ? 'var(--ink-tertiary)' : 'var(--surface-muted)', opacity: value > 0 ? 0.85 : 0.55 }}
              />
            ))}
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

      <section className="mb-[var(--space-5)] rounded-md border p-4" style={{ background: 'var(--surface-raised)', borderColor: 'var(--surface-border)' }}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p className="text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Evidence scope</p>
          <span className="text-caption" style={{ color: 'var(--text-muted)' }}>
            Compare what was observed in this store vs pseudonymous network exposure
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-md border p-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}>
            <p className="text-caption font-semibold mb-2" style={{ color: 'var(--text)' }}>This store</p>
            <div className="grid grid-cols-2 gap-y-1.5 text-caption">
              <span style={{ color: 'var(--text-muted)' }}>Orders</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>
                {merchantOrderCount.toLocaleString()} ({localOrderSharePct.toFixed(1)}%)
              </span>
              <span style={{ color: 'var(--text-muted)' }}>Claims</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>
                {merchantClaimCount.toLocaleString()} ({localClaimRatePct.toFixed(1)}%)
              </span>
              <span style={{ color: 'var(--text-muted)' }}>Order value</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>{formatCurrencyNullable(totalOrderValue)}</span>
              <span style={{ color: 'var(--text-muted)' }}>Refunded</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>{formatCurrencyNullable(totalRefundedValue)}</span>
            </div>
          </div>
          <div className="rounded-md border p-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}>
            <p className="text-caption font-semibold mb-2" style={{ color: 'var(--text)' }}>Merchant-wide network</p>
            <div className="grid grid-cols-2 gap-y-1.5 text-caption">
              <span style={{ color: 'var(--text-muted)' }}>Merchants seen</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>
                {merchantsSeen.toLocaleString()} (this store {thisStoreMerchantSharePct.toFixed(1)}%)
              </span>
              <span style={{ color: 'var(--text-muted)' }}>Profile orders</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>
                {profileWideOrders.toLocaleString()} (100%)
              </span>
              <span style={{ color: 'var(--text-muted)' }}>Chargebacks</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>
                {profile.total_chargebacks.toLocaleString()} ({networkChargebackRatePct.toFixed(1)}%)
              </span>
              <span style={{ color: 'var(--text-muted)' }}>First seen → last seen</span>
              <span className="font-mono text-right" style={{ color: 'var(--text)' }}>
                {formatDateMode(profile.first_seen, 'table')} → {formatDateMode(profile.last_seen, 'table')}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-[var(--space-5)] rounded-md border p-4" style={{ background: 'var(--surface-raised)', borderColor: 'var(--surface-border)' }}>
        <p className="text-caption font-semibold mb-3" style={{ color: 'var(--ink-secondary)' }}>Identity confidence · cross-store signals</p>
        <div className="rounded-md border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_110px_90px_140px] gap-3 px-3 py-2" style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="text-caption font-semibold" style={{ color: 'var(--text-muted)' }}>Primary identifier</span>
            <span className="text-caption font-semibold" style={{ color: 'var(--text-muted)' }}>Linked signal</span>
            <span className="text-caption font-semibold" style={{ color: 'var(--text-muted)' }}>Signal type</span>
            <span className="text-caption font-semibold" style={{ color: 'var(--text-muted)' }}>Confidence</span>
            <span className="text-caption font-semibold" style={{ color: 'var(--text-muted)' }}>Observed</span>
          </div>
          {identitySignalRows.map((signal) => {
            const observed = `${formatDateMode(profile.first_seen, 'table')} → ${formatDateMode(profile.last_seen, 'table')}`;
            return (
              <div key={`${signal.signalType}-${signal.value}`}>
                <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_110px_90px_140px] gap-3 px-3 py-2 border-t" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}>
                  <span className="font-mono text-caption truncate" style={{ color: 'var(--text)' }}>{primaryIdentifier}</span>
                  <span className="text-caption truncate" style={{ color: 'var(--text)' }}>{signal.value}</span>
                  <span className="text-caption" style={{ color: 'var(--text-muted)' }}>{signal.signalType}</span>
                  <ConfidencePill grade={signal.grade} />
                  <span className="font-mono text-caption" style={{ color: 'var(--text-muted)' }}>{observed}</span>
                </div>
                <div className="md:hidden border-t p-3 space-y-2" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}>
                  <div><span className="text-caption" style={{ color: 'var(--text-muted)' }}>Primary</span><p className="font-mono text-caption break-all" style={{ color: 'var(--text)' }}>{primaryIdentifier}</p></div>
                  <div><span className="text-caption" style={{ color: 'var(--text-muted)' }}>Linked signal</span><p className="text-caption break-all" style={{ color: 'var(--text)' }}>{signal.value}</p></div>
                  <div className="flex items-center justify-between gap-2"><span className="text-caption" style={{ color: 'var(--text-muted)' }}>{signal.signalType}</span><ConfidencePill grade={signal.grade} /></div>
                  <div><span className="text-caption" style={{ color: 'var(--text-muted)' }}>Observed</span><p className="font-mono text-caption" style={{ color: 'var(--text-muted)' }}>{observed}</p></div>
                </div>
              </div>
            );
          })}
          {identitySignalRows.length === 0 && (
            <div className="p-3 border-t" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}>
              <p className="text-caption" style={{ color: 'var(--text-muted)' }}>
                More signals appear as cross-store data accumulates
              </p>
            </div>
          )}
        </div>
        <p className="text-caption mt-2" style={{ color: 'var(--text-muted)' }}>
          Signals are derived from merchant-scoped audit records. “Observed” shows when this profile first and most recently carried the linked signal in your available dataset.
        </p>
      </section>
    </>
  );
}
