import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createHash } from 'crypto';
import { formatDate, formatCurrency } from '@/lib/utils/format';
import { signalLabel } from '@/lib/copy/signalLabels';
import ConfidenceGrade from '@/components/ConfidenceGrade';
import RiskLegend from '@/components/common/RiskLegend';
import DismissTransactionButton from '@/components/audit/DismissTransactionButton';
import FeedbackButtons from '@/components/audit/FeedbackButtons';
import DataQualityBanner from '@/components/audit/DataQualityBanner';
import AuditRiskChart from '@/components/audit/AuditRiskChart';
import { computeAuditSummary } from '@/lib/analysis/auditSummary';
import type { DataQualityReport } from '@/lib/csv/dataQuality';
import type { Database } from '@/lib/supabase/types';

type RunRow = Database['public']['Tables']['processing_jobs']['Row'];
type TxRow = Database['public']['Tables']['audit_transactions']['Row'];

interface RunPageProps {
  params: { runId: string };
  searchParams: { page?: string };
}

const PAGE_SIZE = 50;

export default async function AuditRunPage({ params, searchParams }: RunPageProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  const { data: run } = await supabase
    .from('processing_jobs')
    .select('*')
    .eq('id', params.runId)
    .single();

  if (!run) notFound();

  const runData = run as unknown as RunRow;
  const dataQuality = (run as unknown as { data_quality?: DataQualityReport }).data_quality ?? null;

  // ── Summary fetch: lightweight columns only, used for counts + metrics ──────
  // Intentionally does NOT filter by risk_level — uses identity_confidence_grade
  // NOTE: use params.runId (the route param / job_id) — NOT runData.id (the PK of processing_jobs)
  const jobId = params.runId;

  // Debug log — confirm which IDs we have
  console.log('[AuditPage] route runId=%s | runData.id=%s | runData.job_id=%s | querying job_id=%s',
    params.runId,
    (runData as any).id,
    (runData as any).job_id ?? '(none)',
    jobId,
  );

  const { data: summaryRows, error: summaryError } = await supabase
    .from('audit_transactions')
    .select('identity_confidence_grade, order_value, cluster_id')
    .eq('job_id', jobId);

  if (summaryError) {
    console.error('[AuditPage] summaryRows query error:', summaryError);
  }

  const summary = computeAuditSummary((summaryRows ?? []) as any);

  // Debug log — visible in Next.js server stdout
  console.log('[AuditPage] runId=%s rows_fetched=%d grade_counts=%j first3=%j',
    params.runId,
    (summaryRows ?? []).length,
    { definite: summary.definite, probable: summary.probable, possible: summary.possible, weak: summary.weak, ungraded: summary.ungraded },
    (summaryRows ?? []).slice(0, 3),
  );

  const gradeCounts = {
    definite: summary.definite,
    probable: summary.probable,
    possible: summary.possible,
    weak:     summary.weak,
  };

  // ── Paginated flagged-transactions table (graded rows only) ─────────────────
  const { data: transactions, count: flaggedTotal } = await supabase
    .from('audit_transactions')
    .select('*', { count: 'exact' })
    .eq('job_id', jobId)
    .not('identity_confidence_grade', 'is', null)
    .order('identity_score', { ascending: false, nullsFirst: false })
    .range(offset, offset + PAGE_SIZE - 1);

  // ── Top-customers table: graded rows, grouped by email ─────────────────────
  const { data: riskTx } = await supabase
    .from('audit_transactions')
    .select('customer_email, identity_score, identity_confidence_grade, order_value, cluster_id, signals_matched')
    .eq('job_id', jobId)
    .not('identity_confidence_grade', 'is', null)
    .order('identity_score', { ascending: false, nullsFirst: false })
    .limit(2000);

  const customerScores = new Map<string, { maxScore: number; orderCount: number; totalSpend: number }>();
  for (const tx of (riskTx ?? []) as unknown as Array<{
    customer_email: string | null;
    identity_score: number | null;
    order_value: number | null;
  }>) {
    if (tx.customer_email) {
      const existing = customerScores.get(tx.customer_email) ?? { maxScore: 0, orderCount: 0, totalSpend: 0 };
      customerScores.set(tx.customer_email, {
        maxScore:   Math.max(existing.maxScore, tx.identity_score ?? 0),
        orderCount: existing.orderCount + 1,
        totalSpend: existing.totalSpend + (tx.order_value ?? 0),
      });
    }
  }

  const topCustomers = Array.from(customerScores.entries())
    .sort((a, b) => b[1].maxScore - a[1].maxScore)
    .slice(0, 20);

  const hasFlags = summary.flaggedTransactions > 0;
  const totalFlagged = flaggedTotal ?? 0;
  const totalPages = Math.ceil(totalFlagged / PAGE_SIZE);

  const valueAtRisk       = summary.valueAtRisk;
  const estimatedExposure = summary.estimatedExposure;

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-body-sm mb-1" style={{ color: 'var(--text-muted)' }}>
            <Link href="/dashboard" className="inline-flex items-center gap-1 hover:opacity-80 transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Dashboard
            </Link>
            <span>/</span>
            <span>Audit</span>
          </div>
          <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>Audit Results</h1>
          <p className="text-body-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatDate(runData.created_at)}</p>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-sm border text-xs font-medium" style={{
          background:   runData.status === 'completed' ? 'var(--success-bg)'        : runData.status === 'processing' ? 'var(--info-bg)'    : 'var(--risk-critical-bg)',
          color:        runData.status === 'completed' ? 'var(--success)'           : runData.status === 'processing' ? 'var(--info)'       : 'var(--risk-critical)',
          borderColor:  runData.status === 'completed' ? 'var(--success-bd)'        : runData.status === 'processing' ? 'var(--info-bd)'    : 'var(--risk-critical-bd)',
        }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'currentColor' }} aria-hidden="true" />
          {runData.status}
        </span>
      </div>

      <RiskLegend />

      {/* Data quality banner — only shown for sparse/minimal uploads */}
      {dataQuality && (
        <DataQualityBanner report={dataQuality} runId={runData.id} />
      )}

      {/* Customers CTA */}
      <Link
        href={`/audit/${runData.id}/customers`}
        className="flex items-center justify-between rounded-xl px-6 py-4 border transition-shadow hover:shadow-md group"
        style={{ background: 'var(--accent-soft)', borderColor: 'var(--border)' }}
      >
        <div>
          <h2 className="text-body-sm font-semibold" style={{ color: 'var(--text)' }}>See all customers from this upload</h2>
          <p className="text-caption mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Grouped by identity, with linked accounts detected.
          </p>
        </div>
        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ color: 'var(--icon-muted)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </Link>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Transactions', value: runData.total_rows.toLocaleString() },
          { label: 'Processed', value: `${runData.processed_rows.toLocaleString()} (${runData.total_rows > 0 ? ((runData.processed_rows / runData.total_rows) * 100).toFixed(1) : 0}%)` },
          { label: 'Value at risk', value: formatCurrency(valueAtRisk) },
          { label: 'Definite flags', value: gradeCounts.definite.toLocaleString() },
          { label: 'Estimated exposure', value: formatCurrency(estimatedExposure), title: 'Total order value for probable and definite identity matches. Where CE3.0 criteria are met, this exposure may be recoverable through chargeback representment.' },
        ].map(({ label, value, title }) => (
          <div key={label} className="rounded-lg px-5 py-4 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }} title={title}>
            <div className="text-caption mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
            <div className="text-heading-md font-mono" style={{ color: 'var(--text)' }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3">
        {(['weak', 'possible', 'probable', 'definite'] as const).map((grade) => (
          <div key={grade} className="rounded-lg px-4 py-3 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            <div className="mb-1"><ConfidenceGrade grade={grade} size="sm" /></div>
            <div className="text-heading-sm font-mono" style={{ color: 'var(--text)' }}>{gradeCounts[grade].toLocaleString()}</div>
          </div>
        ))}
      </div>

      <AuditRiskChart counts={gradeCounts} totalRows={runData.total_rows} totalFlagged={summary.flaggedTransactions} />

      {!hasFlags && (
        <div className="rounded-xl px-6 py-6 text-center border" style={{ background: 'var(--success-bg)', borderColor: 'var(--success-bd)' }}>
          <p className="text-body-sm font-semibold mb-1" style={{ color: 'var(--success)' }}>Good news &mdash; no customers in this upload showed suspicious patterns.</p>
          <p className="text-caption" style={{ color: 'var(--success)' }}>Upload a longer date range to surface slower repeat abusers.</p>
        </div>
      )}

      {hasFlags && page > 1 && (transactions ?? []).length === 0 && (
        <div className="rounded-xl px-6 py-8 text-center border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
          <p className="text-body-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>No more transactions on this page.</p>
          <Link href={`/audit/${runData.id}`} className="text-caption hover:underline" style={{ color: 'var(--text-muted)' }}>← Back to page 1</Link>
        </div>
      )}

      {hasFlags && <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-body-sm font-semibold" style={{ color: 'var(--text)' }}>
            Flagged transactions
            {totalFlagged > 0 && <span className="ml-1 font-normal" style={{ color: 'var(--text-muted)' }}>({totalFlagged.toLocaleString()} total)</span>}
          </h2>
          <div className="flex items-center gap-2">
            <a
              href={`/api/audit/${runData.id}/export`}
              className="text-xs rounded px-2 py-1 border transition-colors hover-bg-subtle"
              style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
              download
            >
              ↓ Export CSV
            </a>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>Page {page} of {totalPages}</span>
              {page > 1 && (
                <Link href={`/audit/${runData.id}?page=${page - 1}`} className="px-2 py-1 border rounded transition-colors hover-bg-subtle" style={{ borderColor: 'var(--border)' }}>&larr; Prev</Link>
              )}
              {page < totalPages && (
                <Link href={`/audit/${runData.id}?page=${page + 1}`} className="px-2 py-1 border rounded transition-colors hover-bg-subtle" style={{ borderColor: 'var(--border)' }}>Next &rarr;</Link>
              )}
            </div>
          )}
          </div>
        </div>
        <div className="rounded-lg overflow-hidden border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
                <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Order ID</th>
                <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Date</th>
                <th className="text-right px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Total</th>
                <th className="text-right px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Score</th>
                <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Grade</th>
                <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Top signal</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {((transactions ?? []) as unknown as TxRow[]).map((tx) => {
                const flags = ((tx as any).signals_matched as string[]) ?? ((tx as any).identity_signals as string[]) ?? ((tx as any).fraud_flags as string[]) ?? [];
                const topFlag = flags[0];
                return (
                  <tr key={tx.id} className="border-b transition-colors hover-bg-subtle" style={{ borderColor: 'var(--border-subtle)' }}>
                    <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{tx.order_id}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(tx.processed_at)}</td>
                    <td className="px-4 py-2.5 text-right font-mono" style={{ color: 'var(--text)' }}>{formatCurrency(tx.order_value ?? 0)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold" style={{ color: 'var(--text)' }}>{Math.round((tx as any).identity_score ?? (tx as any).match_score ?? 0)}</td>
                    <td className="px-4 py-2.5">
                      <ConfidenceGrade grade={((tx as any).identity_confidence_grade ?? 'weak') as any} size="sm" />
                    </td>
                    <td className="px-4 py-2.5 text-xs max-w-xs" style={{ color: 'var(--text-muted)' }}>
                      <div className="truncate">{topFlag ? signalLabel(topFlag).short : '—'}</div>
                      <FeedbackButtons
                        transactionId={tx.id}
                        signalsThatFired={flags}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/audit/${runData.id}/transaction/${tx.id}`} className="text-xs font-semibold hover:underline" style={{ color: 'var(--text)' }}>
                          Details →
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
      </div>}

      {hasFlags && <div>
        <h2 className="text-body-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Top 20 flagged customers (by max score)</h2>
        <div className="rounded-lg overflow-hidden border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
                <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Customer</th>
                <th className="text-right px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Orders</th>
                <th className="text-right px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Total spend</th>
                <th className="text-right px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Max score</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.map(([email, stats]) => {
                const customerHash = createHash('sha256').update(email.toLowerCase()).digest('hex');
                return (
                  <tr key={email} className="border-b transition-colors hover-bg-subtle" style={{ borderColor: 'var(--border-subtle)' }}>

                    <td className="px-4 py-2.5 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{email}</td>
                    <td className="px-4 py-2.5 text-right font-mono" style={{ color: 'var(--text)' }}>{stats.orderCount}</td>
                    <td className="px-4 py-2.5 text-right font-mono" style={{ color: 'var(--text)' }}>{formatCurrency(stats.totalSpend)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold" style={{ color: 'var(--text)' }}>{Math.round(stats.maxScore)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Link href={`/audit/${runData.id}/customer/${customerHash}`} className="text-xs font-semibold hover:underline" style={{ color: 'var(--text)' }}>View &rarr;</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>}
    </div>
  );
}
