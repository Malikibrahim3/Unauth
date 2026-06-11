import Link from 'next/link';
import { Download, Users } from 'lucide-react';
import { formatDate, formatDateMode } from '@/lib/utils/format';
import { SectionCard, MetricCard } from '@/components/ui';
import { RiskDistributionStrip } from '@/components/audit/RiskDistributionStrip';
import type { AuditRunPageViewProps } from '@/app/(app)/audit/[runId]/auditRunPageViewTypes';

type AuditRunPageSummarySectionsProps = Pick<
  AuditRunPageViewProps,
  'runData' | 'jobId' | 'summary' | 'gradeCounts' | 'networkLinkedCount' | 'hasFlags'
>;

export function AuditRunPageSummarySections({
  runData,
  jobId,
  summary,
  gradeCounts,
  networkLinkedCount,
  hasFlags,
}: AuditRunPageSummarySectionsProps) {
  const failedRows = (runData as unknown as { failed_rows?: number }).failed_rows ?? 0;
  const totalAnalysed = runData.processed_rows ?? runData.total_rows ?? 0;
  const matchedProfiles = summary.flaggedTransactions;
  const strongMatches = gradeCounts.definite;

  return (
    <div className="space-y-4 px-4 pt-4">

      {/* ── Header summary strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link href={`/audit/${jobId}?tab=transactions`} className="block">
          <MetricCard label="Orders analysed" value={totalAnalysed.toLocaleString()} />
        </Link>
        <Link href={`/audit/${jobId}?tab=customers`} className="block">
          <MetricCard
            label="Matched profiles"
            value={matchedProfiles.toLocaleString()}
            hint={matchedProfiles > 0 ? 'Identity signals found' : 'No signals in this upload'}
          />
        </Link>
        <Link href={`/audit/${jobId}?tab=customers&grade=definite`} className="block">
          <MetricCard
            label="Strong matches"
            value={strongMatches.toLocaleString()}
            hint="High corroboration"
          />
        </Link>
        <MetricCard
          label="Linked across merchants"
          value={networkLinkedCount.toLocaleString()}
          hint="Seen at other stores"
        />
      </div>

      {/* ── Match strength chart ─────────────────────────────────────────── */}
      {hasFlags && (
        <div className="md:w-1/2">
          <SectionCard title="Signal confidence breakdown">
            <RiskDistributionStrip
              definite={gradeCounts.definite}
              probable={gradeCounts.probable}
              candidate={gradeCounts.possible}
              weak={gradeCounts.weak}
            />
          </SectionCard>
        </div>
      )}

      {/* ── Insight panel (replaces contradictory empty state) ─────────────── */}
      {hasFlags ? (
        <SectionCard title="Audit insight">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1 flex-1 min-w-0">
              <p className="text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {matchedProfiles.toLocaleString()} matched profile{matchedProfiles !== 1 ? 's' : ''} found in this upload.
              </p>
              {strongMatches > 0 && (
                <p className="t-caption" style={{ color: 'var(--text-secondary)' }}>
                  {strongMatches.toLocaleString()} strong match{strongMatches !== 1 ? 'es' : ''} — high-corroboration identity evidence.
                </p>
              )}
              {failedRows > 0 && (
                <p className="t-caption" style={{ color: 'var(--text-tertiary)' }}>
                  {failedRows.toLocaleString()} rows could not be parsed and were skipped.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <Link
                href={`/audit/${jobId}?tab=customers`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                <Users className="h-4 w-4" />
                View matched profiles
              </Link>
              <a
                href={`/api/audit/${jobId}/export`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors hover:opacity-80"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'transparent' }}
                download
              >
                <Download className="h-4 w-4" />
                Export CSV
              </a>
            </div>
          </div>
        </SectionCard>
      ) : (
        /* Only shown when ALL match counts are genuinely zero */
        <SectionCard title="No signals found">
          <div className="py-4 space-y-2">
            <p className="text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              No identity match signals were found in this upload.
            </p>
            <p className="t-caption" style={{ color: 'var(--text-secondary)' }}>
              Try uploading a longer date range to surface repeat patterns across more orders.
            </p>
            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <Link
                href="/upload"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                Upload a longer range
              </Link>
              <Link
                href={`/audit/${jobId}?tab=transactions`}
                className="text-sm font-medium hover:underline"
                style={{ color: 'var(--text-tertiary)' }}
              >
                View all transactions
              </Link>
            </div>
          </div>
        </SectionCard>
      )}

      {/* ── Helpdesk connection nudge ────────────────────────────────────── */}
      <div className="pb-1">
        <Link
          href="/settings/integrations"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors hover:opacity-80"
          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'transparent' }}
        >
          Connect your helpdesk for claim context →
        </Link>
        <span className="ml-3 t-caption" style={{ color: 'var(--text-tertiary)' }}>
          Completed {formatDateMode(runData.created_at, 'recent')} · {formatDate(runData.created_at)}
        </span>
      </div>
    </div>
  );
}
