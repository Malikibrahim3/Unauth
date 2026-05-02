import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/format';
import { LoadDemoButton } from '@/components/dashboard/LoadDemoButton';
import DeleteAuditButton from '@/components/audit/DeleteAuditButton';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import EmptyDashboardHero from '@/components/EmptyDashboardHero';
import type { Database } from '@/lib/supabase/types';

type RunRow = Database['public']['Tables']['processing_jobs']['Row'];

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: runs } = await supabase
    .from('processing_jobs')
    .select('*')
    .eq('hidden_by_merchant', false)
    .order('created_at', { ascending: false })
    .limit(50);

  const typedRuns = (runs ?? []) as unknown as RunRow[];

  const totalTransactions = typedRuns.reduce((sum, r) => sum + r.total_rows, 0);
  const totalFlagged = typedRuns.reduce((sum, r) => sum + (r.flagged_count ?? 0), 0);

  const isEmpty = typedRuns.length === 0;

  // Cross-merchant status: count identities that fired crossMerchant signal in the latest audit
  let crossMerchantCount = 0;
  if (!isEmpty) {
    const latestRun = typedRuns[0];
    const { data: cmTx } = await supabase
      .from('audit_transactions')
      .select('id')
      .eq('job_id', latestRun.id)
      .contains('identity_signals', ['crossMerchant'] as any);
    crossMerchantCount = cmTx?.length ?? 0;
  }

  // Evidence packages stats
  const { data: evidenceRows } = await supabase
    .from('evidence_packages' as any)
    .select('ce3_eligible');
  const totalPackages = evidenceRows?.length ?? 0;
  const ce3Packages = (evidenceRows as Array<{ ce3_eligible: boolean }> | null)?.filter(p => p.ce3_eligible).length ?? 0;

  // Unreviewed watchlist appearances
  const { count: unreviewedAppearances } = await supabase
    .from('watchlist_appearances' as any)
    .select('id', { count: 'exact', head: true })
    .is('reviewed_at', null);
  const unreviewedCount = unreviewedAppearances ?? 0;

  return (
    <div className="p-8">
      {/* Watchlist appearances amber banner */}
      {unreviewedCount > 0 && (
        <div className="mb-6 flex items-center justify-between rounded-lg px-4 py-3 border" style={{ background: 'var(--warning-bg, #fffbeb)', borderColor: 'var(--warning-bd, #fcd34d)' }}>
          <p className="text-body-sm font-medium" style={{ color: 'var(--warning, #92400e)' }}>
            {unreviewedCount} watchlisted {unreviewedCount === 1 ? 'customer' : 'customers'} appeared in your latest audit.
          </p>
          <Link href="/watchlist#recent-appearances" className="text-body-sm font-semibold ml-4 flex-shrink-0 hover:underline" style={{ color: 'var(--warning, #92400e)' }}>
            Review appearances →
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>Audit Runs</h1>
        </div>
        <Link
          href="/upload"
          className="btn-accent px-4 py-2 rounded-md text-body-sm font-semibold transition-colors"
        >
          New Audit
        </Link>
      </div>

      {/* Aggregate stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Audit Runs', value: typedRuns.length.toLocaleString() },
          { label: 'Transactions Analysed', value: totalTransactions.toLocaleString() },
          { label: 'Flagged', value: totalFlagged.toLocaleString() },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg px-5 py-4 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            <div className="text-caption mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
            <div className="text-display-md font-mono" style={{ color: 'var(--text)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Cross-merchant intelligence status */}
      <div className="rounded-lg px-5 py-4 mb-6 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-2 w-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: 'var(--success)' }} />
          <div>
            <p className="text-body-sm font-semibold" style={{ color: 'var(--text)' }}>
              Cross-merchant intelligence active
            </p>
            <p className="text-body-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {!isEmpty && crossMerchantCount > 0
                ? `${crossMerchantCount.toLocaleString()} ${crossMerchantCount === 1 ? 'identity' : 'identities'} in the Unauth network observed across your most recent audit.`
                : 'Your audits are contributing to the Unauth identity network. This signal activates for an identity once it has been observed at three or more merchants.'}
            </p>
          </div>
        </div>
      </div>

      {/* Evidence packages summary */}
      {totalPackages > 0 && (
        <div className="rounded-lg px-5 py-4 mb-6 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-1.5 h-2 w-2 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />
              <div>
                <p className="text-body-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {totalPackages.toLocaleString()} evidence {totalPackages === 1 ? 'package' : 'packages'} generated
                  {ce3Packages > 0 && (
                    <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
                      {ce3Packages} CE3.0 eligible
                    </span>
                  )}
                </p>
                <p className="text-body-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Visa Compelling Evidence 3.0 packages can be submitted directly to your payment processor during chargeback representment.
                </p>
              </div>
            </div>
            <Link href="/chargebacks" className="text-body-sm font-medium hover:underline flex-shrink-0 ml-4" style={{ color: 'var(--accent)' }}>
              View all →
            </Link>
          </div>
        </div>
      )}

      {isEmpty ? (
        <EmptyDashboardHero />
      ) : (
        <>
          {/* Charts — only shown when there are runs */}
          <DashboardCharts runs={typedRuns.map(r => ({
            id: r.id,
            filename: r.filename,
            total_rows: r.total_rows,
            flagged_count: r.flagged_count ?? 0,
            created_at: r.created_at,
          }))} />

          {/* Audit runs table */}
          <div className="rounded-lg overflow-hidden border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="text-heading-sm" style={{ color: 'var(--text)' }}>Audit Runs</span>
              <span className="text-caption" style={{ color: 'var(--text-subtle)' }}>{typedRuns.length} total</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
                  <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Filename</th>
                  <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Status</th>
                  <th className="text-right px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Rows</th>
                  <th className="text-right px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Flagged</th>
                  <th className="text-right px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Flag %</th>
                  <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Date</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {typedRuns.map((run) => {
                  const flagRate = run.total_rows > 0 ? (run.flagged_count ?? 0) / run.total_rows : 0;
                  return (
                    <tr
                      key={run.id}
                      className="border-b transition-colors hover-bg-subtle"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <td className="px-4 py-3 font-mono text-xs max-w-xs truncate" style={{ color: 'var(--text-muted)' }}>{run.filename}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-xs font-medium" style={{
                          background: run.status === 'completed' ? 'var(--success-bg)' : run.status === 'processing' ? 'var(--info-bg)' : 'var(--risk-critical-bg)',
                          color:      run.status === 'completed' ? 'var(--success)'    : run.status === 'processing' ? 'var(--info)'    : 'var(--risk-critical)',
                          borderColor:run.status === 'completed' ? 'var(--success-bd)' : run.status === 'processing' ? 'var(--info-bd)' : 'var(--risk-critical-bd)',
                        }}>
                          <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: 'currentColor' }} aria-hidden="true" />
                          {run.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono" style={{ color: 'var(--text)' }}>{run.total_rows.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono" style={{ color: 'var(--text)' }}>{(run.flagged_count ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono" style={{ color: 'var(--text-muted)' }}>{(flagRate * 100).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(run.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(run.status === 'complete' || run.status === 'completed') && (
                            <Link href={`/audit/${run.id}`} className="px-2.5 py-1 rounded text-xs font-semibold transition-colors hover:bg-[var(--bg-subtle)]" style={{ color: 'var(--text)' }}>
                              View →
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
        </>
      )}
    </div>
  );
}
