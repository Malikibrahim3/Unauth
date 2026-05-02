import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Inbox } from 'lucide-react';

export default async function InboxPage() {
  const supabase = createClient();

  // Fetch high/critical transactions that haven't been dismissed and have no feedback yet
  const { data: flagged } = await supabase
    .from('transactions')
    .select('id, order_id, match_score, risk_level, processed_at, processing_job_id')
    .in('risk_level', ['high', 'critical'])
    .is('dismissed_at', null)
    .is('merchant_feedback', null)
    .order('match_score', { ascending: false })
    .limit(50);

  const items = (flagged ?? []) as unknown as Array<{
    id: string;
    order_id: string;
    match_score: number;
    risk_level: string;
    processed_at: string;
    processing_job_id: string;
  }>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>Inbox</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            High and critical transactions awaiting review
          </p>
        </div>
        <Link
          href="/upload"
          className="btn-accent px-4 py-2 text-sm font-semibold rounded-md transition-colors"
        >
          New Audit
        </Link>
      </div>

      {items.length === 0 ? (
        <div
          className="rounded-lg p-12 flex flex-col items-center gap-3 text-center"
          style={{ border: '1.5px dashed var(--border)' }}
        >
          <Inbox className="h-8 w-8" style={{ color: 'var(--icon-muted)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            You&apos;re all caught up
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No high or critical transactions need review.
          </p>
          <Link
            href="/upload"
            className="mt-2 text-sm font-medium underline underline-offset-2"
            style={{ color: 'var(--text-muted)' }}
          >
            Upload a CSV to get started →
          </Link>
        </div>
      ) : (
        <div
          className="rounded-lg overflow-hidden border"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b"
                style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}
              >
                <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>
                  Order ID
                </th>
                <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>
                  Risk
                </th>
                <th className="text-right px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>
                  Score
                </th>
                <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>
                  Date
                </th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {items.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b hover-bg-subtle transition-colors"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                    {tx.order_id}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-xs font-medium"
                      style={{
                        background:
                          tx.risk_level === 'critical'
                            ? 'var(--risk-critical-bg)'
                            : 'var(--risk-high-bg)',
                        color:
                          tx.risk_level === 'critical'
                            ? 'var(--risk-critical)'
                            : 'var(--risk-high)',
                        borderColor:
                          tx.risk_level === 'critical'
                            ? 'var(--risk-critical-bd)'
                            : 'var(--risk-high-bd)',
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                        style={{ background: 'currentColor' }}
                        aria-hidden="true"
                      />
                      {tx.risk_level}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 text-right font-mono font-semibold"
                    style={{ color: 'var(--text)' }}
                  >
                    {Math.round(tx.match_score)}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(tx.processed_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/audit/${tx.processing_job_id}/transaction/${tx.id}`}
                      className="text-xs font-semibold hover:underline"
                      style={{ color: 'var(--text)' }}
                    >
                      Review →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
