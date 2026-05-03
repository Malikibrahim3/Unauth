import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/format';
import DeleteAuditButton from '@/components/audit/DeleteAuditButton';
import type { Database } from '@/lib/supabase/types';

type RunRow = Database['public']['Tables']['processing_jobs']['Row'];

function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return '—';
  const fmt = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${day} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(m)-1]} ${y}`;
  };
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  return `To ${fmt(end!)}`;
}

const UPLOAD_TYPE_LABELS: Record<string, string> = {
  standard: 'Regular',
  historical: 'Historical',
  investigation: 'Investigation',
};

export default async function HistoryPage() {
  const supabase = createClient();

  const { data: runs } = await supabase
    .from('processing_jobs')
    .select('*')
    .eq('hidden_by_merchant', false)
    .order('created_at', { ascending: false })
    .limit(50);

  const typedRuns = (runs ?? []) as unknown as RunRow[];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-heading-lg">Upload history</h1>
        <Link
          href="/upload"
          className="px-4 py-2 text-sm font-semibold rounded-md transition-colors"
          style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
        >
          New Audit
        </Link>
      </div>

      {typedRuns.length === 0 ? (
        <div className="rounded-lg p-10" style={{ border: '1.5px dashed var(--border)' }}>
          <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>No audits yet.</p>
          <Link href="/upload" className="mt-4 inline-block text-sm font-medium underline" style={{ color: 'var(--text)' }}>
            Upload your first CSV &rarr;
          </Link>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
                <th className="text-left px-4 py-2.5 text-overline">Label</th>
                <th className="text-left px-4 py-2.5 text-overline">Type</th>
                <th className="text-left px-4 py-2.5 text-overline">Period</th>
                <th className="text-left px-4 py-2.5 text-overline">Status</th>
                <th className="text-right px-4 py-2.5 text-overline">Rows</th>
                <th className="text-right px-4 py-2.5 text-overline">Flagged</th>
                <th className="text-left px-4 py-2.5 text-overline">Uploaded</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {typedRuns.map((run) => {
                const flagRate = run.total_rows > 0 ? (run.flagged_count ?? 0) / run.total_rows : 0;
                const anyRun = run as any;
                const displayLabel = anyRun.label || run.filename;
                const period = formatDateRange(anyRun.date_range_start, anyRun.date_range_end);
                const typeLabel = UPLOAD_TYPE_LABELS[anyRun.upload_type ?? 'standard'] ?? 'Regular';
                return (
                  <tr key={run.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="px-4 py-3 max-w-xs">
                      <span className="text-sm font-medium truncate block" style={{ color: 'var(--text)' }}>{displayLabel}</span>
                      {anyRun.label && (
                        <span className="text-xs font-mono truncate block" style={{ color: 'var(--text-subtle)' }}>{run.filename}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
                        style={{
                          background: anyRun.upload_type === 'investigation' ? 'var(--info-bg)' :
                                      anyRun.upload_type === 'historical'    ? 'var(--bg-subtle)' : 'var(--bg-subtle)',
                          borderColor: anyRun.upload_type === 'investigation' ? 'var(--info-bd)' : 'var(--border)',
                          color: anyRun.upload_type === 'investigation' ? 'var(--info)' : 'var(--text-muted)',
                        }}
                      >
                        {typeLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{period}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
                        style={{
                          background: run.status === 'completed'  ? 'var(--success-bg)' :
                                      run.status === 'processing' ? 'var(--info-bg)' :
                                      run.status === 'pending'    ? 'var(--bg-subtle)' : 'var(--risk-critical-bg)',
                          borderColor: run.status === 'completed'  ? 'var(--success-bd)' :
                                       run.status === 'processing' ? 'var(--info-bd)' :
                                       run.status === 'pending'    ? 'var(--border)' : 'var(--risk-critical-bd)',
                          color: run.status === 'completed'  ? 'var(--success)' :
                                 run.status === 'processing' ? 'var(--info)' :
                                 run.status === 'pending'    ? 'var(--text-muted)' : 'var(--risk-critical)',
                        }}
                      >
                        {run.status === 'completed' ? 'Completed' : run.status === 'processing' ? 'Processing' : run.status === 'pending' ? 'Pending' : 'Failed'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: 'var(--text)' }}>{run.total_rows.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right" style={{ color: 'var(--text)' }}>
                      {(run.flagged_count ?? 0).toLocaleString()}
                      {run.total_rows > 0 && (
                        <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          ({(flagRate * 100).toFixed(1)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(run.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {(run.status === 'complete' || run.status === 'completed') && (
                          <Link href={`/audit/${run.id}`} className="text-sm font-medium hover:underline" style={{ color: 'var(--text)' }}>
                            View &rarr;
                          </Link>
                        )}
                        <DeleteAuditButton jobId={run.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
