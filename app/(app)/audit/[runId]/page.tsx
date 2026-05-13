import { createClient } from '@/lib/supabase/server';
import { Download, Users, ArrowRight } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { formatDate, formatCurrency } from '@/lib/utils/format';
import { scoreToGrade } from '@/lib/utils/riskStyles';
import { signalLabel } from '@/lib/copy/signalLabels';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import type { ConfidenceGradeValue } from '@/lib/confidence';
import DismissTransactionButton from '@/components/audit/DismissTransactionButton';
import FeedbackButtons from '@/components/audit/FeedbackButtons';
import DataQualityBanner from '@/components/audit/DataQualityBanner';
import AuditRiskChart from '@/components/audit/AuditRiskChart';
import AuditTabs from '@/components/audit/AuditTabs';
import type { DataQualityReport } from '@/lib/csv/dataQuality';
import type { Database } from '@/lib/supabase/types';
import PageSizeSelect from '@/components/common/PageSizeSelect';
import AuditCustomersTableClient from '@/components/audit/AuditCustomersTableClient';
import { PageHeader } from '@/components/common/PageHeader';

type RunRow = Database['public']['Tables']['processing_jobs']['Row'];
type TxRow = Database['public']['Tables']['audit_transactions']['Row'];

interface RunPageProps {
  params: Promise<{ runId: string }>;
  searchParams: Promise<{ page?: string; txPage?: string; customerPage?: string; txPageSize?: string; customerPageSize?: string; tab?: string; customerEmail?: string }>;
}

const TX_PAGE_SIZE = 50;
const CUSTOMER_PAGE_SIZE = 100;
const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

function normalizePageSize(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value ?? String(fallback), 10);
  return PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number]) ? parsed : fallback;
}

export default async function AuditRunPage({ params, searchParams }: RunPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const txPage = Math.max(1, parseInt(resolvedSearchParams.txPage ?? resolvedSearchParams.page ?? '1', 10));
  const txPageSize = normalizePageSize(resolvedSearchParams.txPageSize, TX_PAGE_SIZE);
  const txOffset = (txPage - 1) * txPageSize;
  const customerPage = Math.max(1, parseInt(resolvedSearchParams.customerPage ?? '1', 10));
  const customerPageSize = normalizePageSize(resolvedSearchParams.customerPageSize, CUSTOMER_PAGE_SIZE);
  const customerOffset = (customerPage - 1) * customerPageSize;
  const defaultTab = resolvedSearchParams.tab ?? 'overview';
  const selectedCustomerEmail = resolvedSearchParams.customerEmail ?? null;

  const { data: run } = await supabase
    .from('processing_jobs')
    .select('*')
    .eq('id', resolvedParams.runId)
    .single();

  if (!run) notFound();

  const runData = run as unknown as RunRow;
  const dataQuality = (run as unknown as { data_quality?: DataQualityReport }).data_quality ?? null;
  const jobId = resolvedParams.runId;

  // Debug log — confirm which IDs we have
  console.log('[AuditPage] route runId=%s | runData.id=%s | runData.job_id=%s | querying job_id=%s',
    resolvedParams.runId,
    (runData as any).id,
    (runData as any).job_id ?? '(none)',
    jobId,
  );

  const [
    definiteCount,
    probableCount,
    possibleCount,
    weakCount,
    flaggedCount,
    linkedCount,
  ] = await Promise.all([
    supabase.from('audit_transactions').select('*', { count: 'exact', head: true }).eq('job_id', jobId).eq('identity_confidence_grade', 'definite'),
    supabase.from('audit_transactions').select('*', { count: 'exact', head: true }).eq('job_id', jobId).eq('identity_confidence_grade', 'probable'),
    supabase.from('audit_transactions').select('*', { count: 'exact', head: true }).eq('job_id', jobId).eq('identity_confidence_grade', 'possible'),
    supabase.from('audit_transactions').select('*', { count: 'exact', head: true }).eq('job_id', jobId).eq('identity_confidence_grade', 'weak'),
    supabase.from('audit_transactions').select('*', { count: 'exact', head: true }).eq('job_id', jobId).or('identity_confidence_grade.in.(probable,definite),match_status.in.(probable,definite)').not('dismissed_by_merchant', 'is', true),
    supabase.from('audit_transactions').select('cluster_id', { count: 'exact', head: true }).eq('job_id', jobId).not('cluster_id', 'is', null),
  ]);

  const summary = {
    definite: definiteCount.count ?? 0,
    probable: probableCount.count ?? 0,
    possible: possibleCount.count ?? 0,
    weak: weakCount.count ?? 0,
    flaggedTransactions: flaggedCount.count ?? 0,
    ungraded: Math.max((runData.total_rows ?? 0) - ((definiteCount.count ?? 0) + (probableCount.count ?? 0) + (possibleCount.count ?? 0) + (weakCount.count ?? 0)), 0),
    linkedClusters: linkedCount.count ?? 0,
    valueAtRisk: 0,
    estimatedExposure: 0,
  };

  const gradeCounts = {
    definite: summary.definite,
    probable: summary.probable,
    possible: summary.possible,
    weak: summary.weak,
  };

  // ── Paginated all-transactions table (full run truth) ───────────────────────
  const { data: transactions, count: transactionTotal } = await supabase
    .from('audit_transactions')
    .select('*', { count: 'exact' })
    .eq('job_id', jobId)
    .order('processed_at', { ascending: false, nullsFirst: false })
    .range(txOffset, txOffset + txPageSize - 1);

  // ── All-customers aggregation: fetch in batches, no silent cap ─────────────
  const allCustomers: Array<[string, { maxScore: number; orderCount: number; totalSpend: number }]> = [];
  const pagedCustomers = allCustomers.slice(customerOffset, customerOffset + customerPageSize);
  const totalCustomers = allCustomers.length;
  const customerPages = Math.max(1, Math.ceil(totalCustomers / customerPageSize));

  const hasFlags = summary.flaggedTransactions > 0;
  const totalTransactions = transactionTotal ?? runData.total_rows ?? 0;
  const txPages = Math.max(1, Math.ceil(totalTransactions / txPageSize));

  const valueAtRisk       = summary.valueAtRisk;
  const estimatedExposure = summary.estimatedExposure;

  const statusBadge = (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm border text-xs font-medium" style={{
      background:   runData.status === 'completed' ? 'var(--success-bg)'        : runData.status === 'processing' ? 'var(--info-bg)'    : 'var(--risk-critical-bg)',
      color:        runData.status === 'completed' ? 'var(--success)'           : runData.status === 'processing' ? 'var(--info)'       : 'var(--risk-critical)',
      borderColor:  runData.status === 'completed' ? 'var(--success-bd)'        : runData.status === 'processing' ? 'var(--info-bd)'    : 'var(--risk-critical-bd)',
    }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'currentColor' }} aria-hidden="true" />
      {runData.status}
    </span>
  );

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Audit Results"
        subtitle={`${runData.filename} · ${formatDate(runData.created_at)}`}
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Audit result' }]}
        actions={statusBadge}
      />

      {/* ── Action bar ───────────────────────────────────────────────── */}
      {hasFlags && (
        <div className="flex items-center gap-3 flex-wrap rounded-lg px-4 py-3 border" style={{ background: 'var(--accent-soft)', borderColor: 'var(--border)' }}>
          <p className="text-body-sm flex-1" style={{ color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text)' }}>{summary.flaggedTransactions.toLocaleString()} orders</strong> with likely identity links.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/audit/${jobId}?tab=customers`}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md transition-colors"
              style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
            >
              <Users className="h-4 w-4" />
              Review likely identities
            </Link>
            <a
              href={`/api/audit/${jobId}/export`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-md transition-colors border"
              style={{ color: 'var(--text)', borderColor: 'var(--border)' }}
              download
            >
              <Download className="h-4 w-4" />
              Export report
            </a>
            <Link
              href={`/audit/${jobId}?tab=transactions`}
              className="text-sm font-medium hover:underline"
              style={{ color: 'var(--text-muted)' }}
            >
              View all transactions
            </Link>
          </div>
        </div>
      )}

      {/* ── Audit summary hero ────────────────────────────────────────── */}
      <div className="rounded-xl p-5 border" style={{ background: 'var(--accent-soft)', borderColor: 'var(--border)' }}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {[
            { label: 'Orders analysed', value: runData.total_rows.toLocaleString() },
            { label: 'Likely identity links', value: summary.flaggedTransactions.toLocaleString(), highlight: summary.flaggedTransactions > 0 ? 'var(--risk-high)' : null },
            { label: 'Definite matches', value: gradeCounts.definite.toLocaleString(), highlight: gradeCounts.definite > 0 ? 'var(--risk-critical)' : null },
            { label: 'Linked-order value', value: formatCurrency(estimatedExposure), title: 'Total order value for probable and definite same-person identity matches.' },
            { label: 'Completed', value: formatDate(runData.created_at) },
          ].map(({ label, value, highlight, title }) => (
            <div key={label} title={title}>
              <p className="text-caption mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
              <p className="text-heading-sm font-mono" style={{ color: highlight ?? 'var(--text)' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Data quality banner ───────────────────────────────────────── */}
      {dataQuality && (
        <DataQualityBanner report={dataQuality} runId={runData.id} />
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <AuditTabs
        defaultTab={defaultTab}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'customers', label: 'Customers' },
          { id: 'transactions', label: `Transactions (${totalTransactions.toLocaleString()})` },
          { id: 'data_quality', label: 'Data quality' },
        ]}
        panels={{
          overview: (
            <div className="space-y-6">
              {/* Grade cards */}
              <div className="grid grid-cols-4 gap-3">
                {([
                  { grade: 'weak',     tileLabel: 'Low signals' },
                  { grade: 'possible', tileLabel: 'Possible signals found' },
                  { grade: 'probable', tileLabel: 'Probable connections' },
                  { grade: 'definite', tileLabel: 'Linked accounts' },
                ] as const).map(({ grade, tileLabel }) => (
                  <div key={grade} className="rounded-lg px-4 py-3 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                    <div className="mb-1"><ConfidenceBadge grade={({'weak':'D','possible':'C','probable':'B','definite':'A'} as const)[grade]} size="sm" /></div>
                    <div className="text-heading-sm font-mono" style={{ color: 'var(--text)' }}>{gradeCounts[grade].toLocaleString()}</div>
                    <div className="text-caption mt-0.5" style={{ color: 'var(--text-muted)' }}>{tileLabel}</div>
                  </div>
                ))}
              </div>

              <AuditRiskChart counts={gradeCounts} totalRows={runData.total_rows} totalFlagged={summary.flaggedTransactions} />

              {!hasFlags && (
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
              )}

              {hasFlags && allCustomers.length > 0 && (
                <div>
                  <h2 className="text-body-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Top matched profiles</h2>
                  <div className="rounded-lg overflow-hidden border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
                          <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Customer</th>
                          <th className="text-right px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Orders ↓</th>
                          <th className="text-right px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Total spend</th>
                          <th className="text-right px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Max score ↓</th>
                          <th className="px-4 py-2.5"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {allCustomers.slice(0, 10).map(([email, stats]) => {
                          return (
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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ),

          customers: (
            <div className="space-y-4">
              {allCustomers.length > 0 && (
                <div>
                  <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs border-b" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)', background: 'var(--bg-subtle)' }}>
                    <span>
                      Showing {totalCustomers === 0 ? 0 : customerOffset + 1}–{Math.min(customerOffset + customerPageSize, totalCustomers)} of {totalCustomers.toLocaleString()} customers
                    </span>
                    <PageSizeSelect pathname={`/audit/${jobId}`} searchParams={{ ...resolvedSearchParams, txPage: String(txPage), customerPage: String(customerPage), txPageSize: String(txPageSize), customerPageSize: String(customerPageSize) }} pageSize={customerPageSize} label="Customers per page" />
                  </div>
                  <AuditCustomersTableClient
                    runId={runData.id}
                    rows={pagedCustomers.map(([email, stats]) => {
                      return {
                        email,
                        orderCount: stats.orderCount,
                        totalSpend: stats.totalSpend,
                        maxScore: stats.maxScore,
                        grade: scoreToGrade(stats.maxScore),
                      };
                    })}
                    initialEmail={defaultTab === 'customers' ? selectedCustomerEmail : null}
                  />
                  {customerPages > 1 && (
                    <div className="px-4 py-2.5 flex items-center justify-end gap-2 text-xs border-t" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }}>
                      <span>Page {customerPage} of {customerPages}</span>
                      {customerPage > 1 && (
                        <Link href={`/audit/${jobId}?customerPage=${customerPage - 1}&txPage=${txPage}&customerPageSize=${customerPageSize}&txPageSize=${txPageSize}`} className="px-2 py-1 border rounded" style={{ borderColor: 'var(--border)' }}>&larr; Prev</Link>
                      )}
                      {customerPage < customerPages && (
                        <Link href={`/audit/${jobId}?customerPage=${customerPage + 1}&txPage=${txPage}&customerPageSize=${customerPageSize}&txPageSize=${txPageSize}`} className="px-2 py-1 border rounded" style={{ borderColor: 'var(--border)' }}>Next &rarr;</Link>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ),

          transactions: (
            <div className="space-y-4">
              {txPage > 1 && (transactions ?? []).length === 0 && (
                <div className="rounded-xl px-6 py-8 text-center border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
                  <p className="text-body-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>No more transactions on this page.</p>
                  <Link href={`/audit/${jobId}`} className="text-caption hover:underline" style={{ color: 'var(--text-muted)' }}>← Back to page 1</Link>
                </div>
              )}

              {totalTransactions > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-body-sm font-semibold" style={{ color: 'var(--text)' }}>
                      All transactions
                      <span className="ml-1 font-normal" style={{ color: 'var(--text-muted)' }}>({totalTransactions.toLocaleString()} total)</span>
                    </h2>
                    {txPages > 1 && (
                      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span>Page {txPage} of {txPages}</span>
                        {txPage > 1 && (
                          <Link href={`/audit/${jobId}?txPage=${txPage - 1}&customerPage=${customerPage}&customerPageSize=${customerPageSize}&txPageSize=${txPageSize}`} className="px-2 py-1 border rounded" style={{ borderColor: 'var(--border)' }}>&larr; Prev</Link>
                        )}
                        {txPage < txPages && (
                          <Link href={`/audit/${jobId}?txPage=${txPage + 1}&customerPage=${customerPage}&customerPageSize=${customerPageSize}&txPageSize=${txPageSize}`} className="px-2 py-1 border rounded" style={{ borderColor: 'var(--border)' }}>Next &rarr;</Link>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mb-3 flex items-center justify-end">
                    <PageSizeSelect pathname={`/audit/${jobId}`} searchParams={{ ...resolvedSearchParams, txPage: String(txPage), customerPage: String(customerPage), txPageSize: String(txPageSize), customerPageSize: String(customerPageSize) }} pageSize={txPageSize} label="Transactions per page" />
                  </div>
                  <div className="rounded-lg overflow-hidden border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
                          <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Order ID</th>
                          <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Date ↓</th>
                          <th className="text-right px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Total</th>
                          <th className="text-right px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Score ↓</th>
                          <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Grade</th>
                          <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Top signal</th>
                          <th className="px-4 py-2.5"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {((transactions ?? []) as unknown as TxRow[]).map((tx) => {
                          const flags = ((tx as any).signals_matched as string[]) ?? ((tx as any).identity_signals as string[]) ?? ((tx as any).fraud_flags as string[]) ?? [];
                          const topFlag = flags[0];
                          const idGrade = (tx as any).identity_confidence_grade as 'definite' | 'probable' | 'possible' | 'weak' | null | undefined;
                          const letterGrade: ConfidenceGradeValue | null =
                            idGrade === 'definite' ? 'A'
                            : idGrade === 'probable' ? 'B'
                            : idGrade === 'possible' ? 'C'
                            : idGrade === 'weak'     ? 'D'
                            : null;
                          return (
                            <tr key={tx.id} className="border-b transition-colors hover-bg-subtle" style={{ borderColor: 'var(--border-subtle)' }}>
                              <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{tx.order_id}</td>
                              <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(tx.processed_at)}</td>
                              <td className="px-4 py-2.5 text-right font-mono" style={{ color: 'var(--text)' }}>{formatCurrency(tx.order_value ?? 0)}</td>
                              <td className="px-4 py-2.5 text-right font-mono font-semibold" style={{ color: 'var(--text)' }}>{Math.round((tx as any).identity_score ?? (tx as any).match_score ?? 0)}</td>
                              <td className="px-4 py-2.5">
                                {letterGrade
                                  ? <ConfidenceBadge grade={letterGrade} size="sm" />
                                  : <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>Ungraded</span>}
                              </td>
                              <td className="px-4 py-2.5 text-xs max-w-xs" style={{ color: 'var(--text-muted)' }}>
                                <div className="truncate">{topFlag ? signalLabel(topFlag).short : '—'}</div>
                                <FeedbackButtons transactionId={tx.id} signalsThatFired={flags} />
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Link href={`/audit/${jobId}/transaction/${tx.id}`} className="inline-flex items-center gap-0.5 text-xs font-semibold hover:underline" style={{ color: 'var(--text)' }}>
                                    Details <ArrowRight className="h-3 w-3" />
                                  </Link>
                                  <DismissTransactionButton txId={tx.id} />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {totalTransactions === 0 && (
                <div className="rounded-xl px-6 py-8 text-center border space-y-3" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
                  <p className="text-body-sm font-semibold" style={{ color: 'var(--text)' }}>No transactions found for this audit.</p>
                  <p className="text-caption" style={{ color: 'var(--text-muted)' }}>This audit may still be processing, or the file had no recognised order rows.</p>
                  <div className="flex items-center justify-center gap-3 pt-1">
                    <Link href="/upload" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md transition-colors" style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}>
                      Run a new audit
                    </Link>
                    <Link href="/history" className="text-sm font-medium hover:underline" style={{ color: 'var(--text-muted)' }}>View audit history</Link>
                  </div>
                </div>
              )}
            </div>
          ),

          data_quality: (
            <div className="space-y-4">
              {dataQuality ? (
                <DataQualityBanner report={dataQuality} runId={jobId} />
              ) : (
                <div className="rounded-lg p-6 text-center border" style={{ background: 'var(--success-bg)', borderColor: 'var(--success-bd)' }}>
                  <p className="text-body-sm font-semibold" style={{ color: 'var(--success)' }}>No data quality issues detected in this upload.</p>
                  <p className="text-caption mt-1" style={{ color: 'var(--success)' }}>All required fields were present and properly formatted.</p>
                </div>
              )}
              <div className="rounded-lg px-5 py-4 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                <h3 className="text-body-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Coverage summary</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Total rows', value: runData.total_rows.toLocaleString() },
                    { label: 'Processed', value: `${runData.processed_rows.toLocaleString()} (${runData.total_rows > 0 ? ((runData.processed_rows / runData.total_rows) * 100).toFixed(1) : 0}%)` },
                    { label: 'Matched rows', value: summary.flaggedTransactions.toLocaleString() },
                    { label: 'Order value under review', value: formatCurrency(valueAtRisk) },
                    { label: 'Estimated exposure', value: formatCurrency(estimatedExposure) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-caption mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                      <p className="text-body-sm font-semibold font-mono" style={{ color: 'var(--text)' }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ),
        }}
      />
    </div>
  );
}

// Duplicate JSX removed — original return already rendered the full page.
