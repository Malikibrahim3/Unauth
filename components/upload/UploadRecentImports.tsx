'use client';

import Link from 'next/link';
import { AnalyticsBarChart } from '@/components/analytics/AnalyticsBarChart';
import { formatDateShort } from '@/lib/utils/format';
import type { RecentImport } from '@/components/upload/uploadClientTypes';
import {
  uploadAccentTextStyle,
  uploadMutedTextStyle,
  uploadSubtleBorderStyle,
  uploadSurfaceCardStyle,
  uploadTextStyle,
} from '@/components/upload/uploadClientStyles';

type UploadRecentImportsProps = {
  recentImports: RecentImport[];
};

export function UploadRecentImports({ recentImports }: UploadRecentImportsProps) {
  const chartData = recentImports
    .slice()
    .reverse()
    .map((run) => ({
      label: formatDateShort(run.createdAt),
      value: run.flaggedCount,
      color: 'var(--accent)',
    }));

  return (
    <div className="rounded-md border px-4 py-3" style={uploadSurfaceCardStyle}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold" style={uploadTextStyle}>
          Recent imports
        </p>
        <Link href="/history" className="text-xs font-semibold hover:underline" style={uploadAccentTextStyle}>
          View all
        </Link>
      </div>
      <div className="mt-3 rounded-md border p-3" style={{ borderColor: 'var(--border-muted)', background: 'var(--bg-inset)' }}>
        <p className="text-xs font-semibold" style={uploadTextStyle}>
          Matched rows across recent imports
        </p>
        <div className="mt-2">
          <AnalyticsBarChart data={chartData} height={180} emptyLabel="No recent imports" />
        </div>
      </div>
      <ul className="mt-2 divide-y" style={uploadSubtleBorderStyle}>
        {recentImports.map((run) => (
          <li key={run.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
            <div className="min-w-0">
              <p className="truncate font-medium" style={uploadTextStyle}>
                {run.label || run.filename || 'Untitled audit'}
              </p>
              <p style={uploadMutedTextStyle}>
                {formatDateShort(run.createdAt)} · {run.totalRows.toLocaleString()} rows ·{' '}
                {run.flaggedCount.toLocaleString()} matched
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="rounded px-2 py-0.5 font-semibold capitalize"
                style={{ background: 'var(--bg-inset)', color: 'var(--text-secondary)' }}
              >
                {run.status.replace(/_/g, ' ')}
              </span>
              {run.status === 'complete' ? (
                <Link href={`/audit/${run.id}`} className="font-semibold hover:underline" style={uploadAccentTextStyle}>
                  Open
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
