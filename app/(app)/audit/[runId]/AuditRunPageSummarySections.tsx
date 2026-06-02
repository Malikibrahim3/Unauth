import Link from 'next/link';
import { Download, Users } from 'lucide-react';
import { formatDate } from '@/lib/utils/format';
import { formatDateMode } from '@/lib/utils/format';
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

  return (
    <div className="space-y-4 px-4 pt-4">
      <SectionCard title="Summary">
        <p className="text-body-sm" style={{ color: 'var(--ink-primary)' }}>
          <strong>{summary.flaggedTransactions.toLocaleString()}</strong> of{' '}
          <strong>{(runData.processed_rows ?? runData.total_rows ?? 0).toLocaleString()}</strong> orders matched a known
          identity in this upload
          {networkLinkedCount > 0 ? (
            <>
              {' '}
              · <strong>{networkLinkedCount.toLocaleString()}</strong> linked across other merchants
            </>
          ) : (
            <> · 0 linked across other merchants</>
          )}
          .
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption" style={{ color: 'var(--ink-secondary)' }}>
          <span><strong style={{ color: 'var(--ink-primary)' }}>{(runData.processed_rows ?? runData.total_rows ?? 0).toLocaleString()}</strong> orders ingested</span>
          <span style={{ color: 'var(--surface-border)' }}>·</span>
          <span><strong style={{ color: 'var(--ink-primary)' }}>{networkLinkedCount.toLocaleString()}</strong> identities linked</span>
          <span style={{ color: 'var(--surface-border)' }}>·</span>
          <span><strong style={{ color: 'var(--ink-primary)' }}>{summary.flaggedTransactions.toLocaleString()}</strong> with prior claim history</span>
          {failedRows > 0 ? (
            <>
              <span style={{ color: 'var(--surface-border)' }}>·</span>
              <span>{failedRows.toLocaleString()} rows skipped (could not be parsed)</span>
            </>
          ) : null}
        </div>
        <div className="mt-4">
          <Link
            href="/settings/integrations"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors hover:opacity-80"
            style={{ border: '1px solid var(--surface-border)', color: 'var(--ink-secondary)', background: 'transparent' }}
          >
            Connect your helpdesk (Zendesk / Gorgias) →
          </Link>
        </div>
      </SectionCard>

      {hasFlags ? (
        <SectionCard title="Actions">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-body-sm flex-1" style={{ color: 'var(--ink-secondary)' }}>
              <strong style={{ color: 'var(--ink-primary)' }}>{summary.flaggedTransactions.toLocaleString()} orders</strong> with likely identity links.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/audit/${jobId}?tab=customers`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors"
                style={{ background: 'var(--copper-bright)', color: 'var(--ink-inverse)' }}
              >
                <Users className="h-4 w-4" />
                Review likely identities
              </Link>
              <a
                href={`/api/audit/${jobId}/export`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors hover:opacity-80"
                style={{ border: '1px solid var(--surface-border)', color: 'var(--ink-secondary)', background: 'transparent' }}
                download
              >
                <Download className="h-4 w-4" />
                Export CSV
              </a>
              <Link
                href={`/audit/${jobId}?tab=transactions`}
                className="text-sm font-medium hover:underline"
                style={{ color: 'var(--ink-tertiary)' }}
              >
                View all transactions
              </Link>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 pb-4">
        <Link href={`/audit/${jobId}?tab=transactions`} className="block">
          <MetricCard label="Orders analysed" value={runData.total_rows} />
        </Link>
        <Link href={`/audit/${jobId}?tab=transactions`} className="block">
          <MetricCard label="Linked across stores" value={networkLinkedCount.toLocaleString()} hint="Shoppers seen at multiple merchants" />
        </Link>
        <div className="md:col-span-2">
          <SectionCard title="Match strength breakdown">
            <RiskDistributionStrip definite={gradeCounts.definite} probable={gradeCounts.probable} candidate={gradeCounts.possible} weak={gradeCounts.weak} />
          </SectionCard>
        </div>
        <Link href={`/audit/${jobId}?tab=customers&grade=definite`} className="block">
          <MetricCard label="Strong matches" value={gradeCounts.definite} hint="Highest confidence" />
        </Link>
        <MetricCard label="Completed" value={formatDateMode(runData.created_at, 'recent')} hint={formatDate(runData.created_at)} />
      </div>
    </div>
  );
}
