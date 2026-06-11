'use client';

import Link from 'next/link';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import { gradeToLetter, type ConfidenceGrade } from '@/lib/engine/weights';
import { CONFIDENCE_TIER_LABELS } from '@/lib/copy/merchantUx';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { AnalyticsDonutChart } from '@/components/analytics/AnalyticsDonutChart';
import { LIGHT_TOKENS } from '@/components/charts/echartsTheme';
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

const GRADE_CHART_COLORS = {
  definite: LIGHT_TOKENS.sev_clear,
  probable: LIGHT_TOKENS.sev_probable,
  possible: LIGHT_TOKENS.sev_neutral,
  weak: LIGHT_TOKENS.sev_weak,
};

export function AuditRunOverviewPanel({
  runData,
  jobId,
  gradeCounts,
  hasFlags,
  isRunComplete,
  allCustomers,
  customerPage,
  txPage,
  customerPageSize,
  txPageSize,
}: AuditRunOverviewPanelProps) {
  const totalGrades = gradeCounts.definite + gradeCounts.probable + gradeCounts.possible + gradeCounts.weak;

  const donutData = (Object.keys(gradeCounts) as ConfidenceGrade[])
    .filter((g) => gradeCounts[g] > 0)
    .map((g) => ({
      label: `${gradeToLetter(g)} · ${CONFIDENCE_TIER_LABELS[g]}`,
      value: gradeCounts[g],
      color: GRADE_CHART_COLORS[g],
    }));

  return (
    <div className="space-y-6">

      {/* ── Grade summary tiles (click to filter) ───────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {(['definite', 'probable', 'possible', 'weak'] as const).map((grade) => (
          <Link key={grade} href={`/audit/${jobId}?tab=customers&grade=${grade}`}>
            <div
              className="group rounded-[var(--radius-md)] border px-4 py-3 transition-colors hover:bg-[var(--surface)]"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                boxShadow: 'var(--shadow-1)',
              }}
            >
              <div className="mb-2"><ConfidenceBadge grade={gradeToLetter(grade as ConfidenceGrade)} size="sm" /></div>
              <div className="text-heading-sm font-mono group-hover:underline" style={{ color: 'var(--text)' }}>
                {gradeCounts[grade].toLocaleString()}
              </div>
              <div className="text-caption mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {CONFIDENCE_TIER_LABELS[grade]}
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-sunken)' }}>
                <div
                  style={{
                    width: `${totalGrades > 0 ? (gradeCounts[grade] / totalGrades) * 100 : 0}%`,
                    background: GRADE_CHART_COLORS[grade],
                    height: '100%',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
              {totalGrades > 0 && (
                <div className="text-[10px] mt-1 font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {((gradeCounts[grade] / totalGrades) * 100).toFixed(0)}% of run
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* ── Grade distribution donut ─────────────────────────────────────── */}
      {totalGrades > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div
            className="rounded-[var(--radius-md)] border p-4"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-1)' }}
          >
            <p className="text-body-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
              Signal confidence by grade
            </p>
            <AnalyticsDonutChart
              data={donutData}
              height={220}
              gradePalette={false}
              emptyLabel="No grade data"
            />
          </div>
        </div>
      )}

      {/* ── In-progress notice ────────────────────────────────────────────── */}
      {!isRunComplete ? (
        <div className="rounded-md px-6 py-8 text-center border space-y-3" style={{ background: 'var(--info-bg)', borderColor: 'var(--info-bd)' }}>
          <p className="text-body-sm font-semibold" style={{ color: 'var(--info)' }}>Still analyzing your upload</p>
          <p className="text-caption" style={{ color: 'var(--text-secondary)' }}>
            Match counts and confidence grades update when processing finishes. Refresh this page in a moment.
          </p>
        </div>
      ) : null}

      {/* ── No-signals state (only when ALL counts are truly zero) ──────── */}
      {isRunComplete && !hasFlags ? (
        <div className="rounded-md px-6 py-8 text-center border space-y-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-body-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            No identity match signals were found in this upload.
          </p>
          <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>
            Upload a longer date range to surface slower repeat patterns.
          </p>
          <div className="flex items-center justify-center gap-3 pt-1 flex-wrap">
            <Link href="/upload" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md transition-colors" style={{ background: 'var(--accent)', color: 'white' }}>
              Upload a longer range
            </Link>
            <Link href={`/audit/${runData.id}?tab=transactions`} className="text-sm font-medium hover:underline" style={{ color: 'var(--text-secondary)' }}>
              View all transactions
            </Link>
          </div>
        </div>
      ) : null}

      {/* ── Top matched profiles table ───────────────────────────────────── */}
      {hasFlags && allCustomers.length > 0 ? (
        <div>
          <h2 className="text-body-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Top matched profiles</h2>
          <div className="overflow-hidden rounded-[var(--radius-md)] border bg-[var(--surface)]" style={{ borderColor: 'var(--border)', boxShadow: 'var(--shadow-1)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <th className="px-4 py-3 text-left text-caption font-medium" style={{ color: 'var(--text-tertiary)' }}>Customer</th>
                  <th className="px-4 py-3 text-right text-caption font-medium" style={{ color: 'var(--text-tertiary)' }}>
                    <span className="inline-flex items-center justify-end gap-1">Orders <ArrowDown className="h-3 w-3" aria-hidden="true" /></span>
                  </th>
                  <th className="px-4 py-3 text-right text-caption font-medium" style={{ color: 'var(--text-tertiary)' }}>Total spend</th>
                  <th className="px-4 py-3 text-right text-caption font-medium" style={{ color: 'var(--text-tertiary)' }}>
                    <span className="inline-flex items-center justify-end gap-1">Confidence <ArrowDown className="h-3 w-3" aria-hidden="true" /></span>
                  </th>
                  <th className="px-4 py-3" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {allCustomers.slice(0, 10).map(([email, stats]) => (
                  <tr key={email} className="border-b transition-colors hover:bg-[var(--surface)]" style={{ borderColor: 'var(--border-muted)' }}>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{email}</td>
                    <td className="px-4 py-3 text-right font-mono" style={{ color: 'var(--text)' }}>{stats.orderCount}</td>
                    <td className="px-4 py-3 text-right font-mono" style={{ color: 'var(--text)' }}>{formatCurrency(stats.totalSpend)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold" style={{ color: 'var(--text)' }}>{Math.round(stats.maxScore)}</td>
                    <td className="px-4 py-3 text-right">
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
