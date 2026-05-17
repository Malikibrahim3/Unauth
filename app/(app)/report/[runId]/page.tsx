import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { summarizeAuditResults } from '@/lib/audit/resultsSummary';
import { formatCurrency, formatDate } from '@/lib/utils/format';

interface ReportPageProps {
  params: Promise<{ runId: string }>;
}

type ReportRow = {
  id: string;
  customer_email: string | null;
  customer_name: string | null;
  cluster_id: string | null;
  order_value: number | null;
  identity_match_score: number | null;
  identity_confidence_grade: string | null;
  match_status: string;
  fraud_flags: unknown;
  behavioural_flags: unknown;
  signals_matched: unknown;
  context_flags: unknown;
};

function displayIdentity(row: ReportRow): string {
  return row.customer_email ?? row.customer_name ?? `Order ${row.id.slice(0, 8)}`;
}

function displayRisk(row: ReportRow): string {
  if (typeof row.identity_match_score === 'number') {
    return row.identity_match_score.toFixed(2);
  }
  return row.identity_confidence_grade ?? row.match_status;
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { runId } = await params;
  const supabase = createClient();
  const serviceClient = createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/report/${runId}`);

  const { denied } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_AUDIT);
  if (denied) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-medium">Access denied</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          You do not have permission to view this audit report.
        </p>
      </div>
    );
  }

  const { data: run } = await supabase
    .from('processing_jobs')
    .select('id, filename, created_at, status')
    .eq('id', runId)
    .maybeSingle();

  if (!run) notFound();

  const { data: rows } = await supabase
    .from('audit_transactions')
    .select('id, customer_email, customer_name, cluster_id, order_value, identity_match_score, identity_confidence_grade, match_status, fraud_flags, behavioural_flags, signals_matched, context_flags')
    .eq('job_id', runId)
    .or('identity_confidence_grade.in.(probable,definite),match_status.in.(probable,definite)')
    .not('dismissed_by_merchant', 'is', true)
    .order('identity_match_score', { ascending: false, nullsFirst: false })
    .limit(100);

  const reportRows = ((rows ?? []) as ReportRow[]);
  const summary = summarizeAuditResults(reportRows);

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: '#7B2D26' }}>
              Siloed audit
            </p>
            <h1 className="mt-2 text-3xl font-medium tracking-tight" style={{ color: 'var(--text)' }}>
              Audit report
            </h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              {run.filename} · {formatDate(run.created_at)}
            </p>
          </div>
          <Link href={`/audit/${runId}`} className="inline-flex items-center rounded-sm border px-4 py-2 text-sm font-medium" style={{ borderColor: 'var(--border-default)', color: 'var(--text)' }}>
            View full audit
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Repeat identity clusters" value={summary.repeatIdentityClusters.toLocaleString()} />
          <MetricCard label="Orders linked to refund patterns" value={summary.refundPatternOrders.toLocaleString()} />
          <MetricCard label="Accounts flagged for INR behaviour" value={summary.inrFlaggedAccounts.toLocaleString()} />
          <MetricCard label="Estimated exposure" value={formatCurrency(summary.estimatedExposure, 'USD')} />
        </div>

        <div className="overflow-hidden rounded-sm border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
          <table className="w-full text-left text-sm">
            <thead style={{ background: 'var(--bg-subtle)' }}>
              <tr>
                <th className="px-4 py-3 font-medium">Flagged identity</th>
                <th className="px-4 py-3 font-medium">Cluster ID</th>
                <th className="px-4 py-3 font-medium">Risk score</th>
                <th className="px-4 py-3 font-medium">Exposure</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                    No review-worthy identities have been surfaced for this run yet.
                  </td>
                </tr>
              ) : (
                reportRows.map((row) => (
                  <tr key={row.id} className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                    <td className="px-4 py-3">{displayIdentity(row)}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{row.cluster_id ?? 'Pending'}</td>
                    <td className="px-4 py-3">{displayRisk(row)}</td>
                    <td className="px-4 py-3">{formatCurrency(row.order_value ?? 0, 'USD')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border px-4 py-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
      <p className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className="mt-2 text-2xl font-medium" style={{ color: 'var(--text)' }}>
        {value}
      </p>
    </div>
  );
}
