import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import { scoreToGrade, gradeToLetter, type ConfidenceGrade } from '@/lib/engine/weights';
import { CONFIDENCE_TIER_LABELS } from '@/lib/copy/merchantUx';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import AuditRiskChart from '@/components/audit/AuditRiskChart';
import type { AuditRunPageViewProps } from '@/app/(app)/audit/[runId]/auditRunPageViewTypes';

type AuditRunOverviewPanelProps = Pick<
  AuditRunPageViewProps,
  | 'runData'
  | 'jobId'
  | 'summary'
  | 'gradeCounts'
  | 'hasFlags'
  | 'isRunComplete'
  | 'allCustomers'
  | 'customerPage'
  | 'txPage'
  | 'customerPageSize'
  | 'txPageSize'
>;

export function AuditRunOverviewPanel({
  runData,
  jobId,
  summary,
  gradeCounts,
  hasFlags,
  isRunComplete,
  allCustomers,
  customerPage,
  txPage,
  customerPageSize,
  txPageSize,
}: AuditRunOverviewPanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-3">
        {([
          { grade: 'definite', tileLabel: CONFIDENCE_TIER_LABELS.definite },
          { grade: 'probable', tileLabel: CONFIDENCE_TIER_LABELS.probable },
          { grade: 'possible', tileLabel: CONFIDENCE_TIER_LABELS.possible },
          { grade: 'weak', tileLabel: CONFIDENCE_TIER_LABELS.weak },
        ] as const).map(({ grade, tileLabel }) => (
          <Link key={grade} href={`/audit/${jobId}?tab=customers&grade=${grade}`}>
            <div
              className="rounded-md border px-4 py-3 transition-colors hover:bg-[var(--surface-overlay)] group"
              style={{
                background: 'var(--surface-raised)',
                borderColor: 'var(--surface-border)',
                borderTop: `3px solid ${
                  grade === 'definite' ? 'var(--sev-clear)' :
                  grade === 'probable' ? 'var(--sev-probable)' :
                  'var(--sev-neutral)'
                }`,
              }}
            >
              <div className="mb-1"><ConfidenceBadge grade={gradeToLetter(grade as ConfidenceGrade)} size="sm" /></div>
              <div className="text-heading-sm font-mono group-hover:underline" style={{ color: 'var(--text)' }}>{gradeCounts[grade].toLocaleString()}</div>
              <div className="text-caption mt-0.5" style={{ color: 'var(--text-muted)' }}>{tileLabel}</div>
            </div>
          </Link>
        ))}
      </div>

      <AuditRiskChart counts={gradeCounts} totalRows={runData.total_rows} totalFlagged={summary.flaggedTransactions} />

      {!isRunComplete ? (
        <div className="rounded-xl px-6 py-8 text-center border space-y-3" style={{ background: 'var(--info-bg)', borderColor: 'var(--info-bd)' }}>
          <p className="text-body-sm font-semibold" style={{ color: 'var(--info)' }}>Still analyzing your upload</p>
          <p className="text-caption" style={{ color: 'var(--text-muted)' }}>
            Match counts and risk grades update when processing finishes. Refresh this page in a moment.
          </p>
        </div>
      ) : null}

      {isRunComplete && !hasFlags ? (
        <div className="rounded-xl px-6 py-8 text-center border space-y-3" style={{ background: 'var(--success-bg)', borderColor: 'var(--success-bd)' }}>
          <p className="text-body-sm font-semibold" style={{ color: 'var(--success)' }}>No identity match signals were found in this upload.</p>
          <p className="text-caption" style={{ color: 'var(--success)' }}>Upload a longer date range to surface slower repeat claim patterns.</p>
          <div className="flex items-center justify-center gap-3 pt-1 flex-wrap">
            <Link href="/upload" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md transition-colors" style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}>
              Upload a longer range
            </Link>
            <Link href={`/audit/${runData.id}?tab=transactions`} className="text-sm font-medium hover:underline" style={{ color: 'var(--text-muted)' }}>
              View all transactions
            </Link>
          </div>
        </div>
      ) : null}

      {hasFlags && allCustomers.length > 0 ? (
        <div>
          <h2 className="text-body-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Top matched profiles</h2>
          <div className="rounded-lg overflow-hidden border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
                  <th className="text-left px-4 py-2.5 text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Customer</th>
                  <th className="text-right px-4 py-2.5 text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Orders ↓</th>
                  <th className="text-right px-4 py-2.5 text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Total spend</th>
                  <th className="text-right px-4 py-2.5 text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Confidence ↓</th>
                  <th className="px-4 py-2.5" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {allCustomers.slice(0, 10).map(([email, stats]) => (
                  <tr key={email} className="border-b transition-colors hover-bg-subtle" style={{ borderColor: 'var(--border-subtle)' }}>
                    <td className="px-4 py-2.5 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{email}</td>
                    <td className="px-4 py-2.5 text-right font-mono" style={{ color: 'var(--text)' }}>{stats.orderCount}</td>
                    <td className="px-4 py-2.5 text-right font-mono" style={{ color: 'var(--text)' }}>{formatCurrency(stats.totalSpend)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold" style={{ color: 'var(--text)' }}>{Math.round(stats.maxScore)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/audit/${jobId}?tab=customers&customerEmail=${encodeURIComponent(email)}&customerPage=${customerPage}&txPage=${txPage}&customerPageSize=${customerPageSize}&txPageSize=${txPageSize}`}
                        className="inline-flex items-center gap-0.5 text-xs font-semibold hover:underline"
                        style={{ color: 'var(--text)' }}
                      >
                        View <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
