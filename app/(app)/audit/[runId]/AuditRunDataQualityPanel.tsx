import { formatCurrency } from '@/lib/utils/format';
import DataQualityBanner from '@/components/audit/DataQualityBanner';
import type { AuditRunPageViewProps } from '@/app/(app)/audit/[runId]/auditRunPageViewTypes';

type AuditRunDataQualityPanelProps = Pick<
  AuditRunPageViewProps,
  'runData' | 'jobId' | 'dataQuality' | 'summary' | 'valueAtRisk' | 'estimatedExposure'
>;

export function AuditRunDataQualityPanel({
  runData,
  jobId,
  dataQuality,
  summary,
  valueAtRisk,
  estimatedExposure,
}: AuditRunDataQualityPanelProps) {
  return (
    <div className="space-y-4">
      {dataQuality ? (
        <DataQualityBanner report={dataQuality} runId={jobId} />
      ) : (
        <div className="rounded-md p-6 text-center border" style={{ background: 'var(--success-bg)', borderColor: 'var(--success-bd)' }}>
          <p className="text-body-sm font-semibold" style={{ color: 'var(--success)' }}>No data quality issues detected in this upload.</p>
          <p className="text-caption mt-1" style={{ color: 'var(--success)' }}>All required fields were present and properly formatted.</p>
        </div>
      )}
      <div className="rounded-md px-5 py-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--border-muted)' }}>
        <h3 className="text-body-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Coverage summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total rows', value: runData.total_rows.toLocaleString() },
            { label: 'Processed', value: `${runData.processed_rows.toLocaleString()} (${runData.total_rows > 0 ? ((runData.processed_rows / runData.total_rows) * 100).toFixed(1) : 0}%)` },
            { label: 'Matched rows', value: summary.flaggedTransactions.toLocaleString() },
            { label: 'Order value (matched)', value: formatCurrency(valueAtRisk) },
            { label: 'Linked order value est.', value: formatCurrency(estimatedExposure) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-caption mb-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</p>
              <p className="text-body-sm font-semibold font-mono" style={{ color: 'var(--text)' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
