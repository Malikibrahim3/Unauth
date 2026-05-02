import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/format';
import { buildCustomerProfiles, type TransactionRow } from '@/lib/analysis/customerIntelligence';
import type { Database } from '@/lib/supabase/types';
import CustomerList from '@/components/audit/CustomerList';

type RunRow = Database['public']['Tables']['processing_jobs']['Row'];

interface PageProps {
  params: { runId: string };
}

export default async function CustomersPage({ params }: PageProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: run } = await supabase
    .from('processing_jobs')
    .select('*')
    .eq('id', params.runId)
    .single();

  if (!run) notFound();
  const runData = run as unknown as RunRow;

  const TX_LIMIT = 2000;
  // Fetch transactions for this job with a row cap to prevent memory exhaustion on large uploads.
  const { data: rawTx } = await supabase
    .from('audit_transactions')
    .select('*')
    .eq('job_id', runData.id)
    .order('match_score', { ascending: false })
    .limit(TX_LIMIT);

  const transactions = (rawTx ?? []) as unknown as TransactionRow[];
  const wasCapped = transactions.length === TX_LIMIT;
  const profiles = buildCustomerProfiles(transactions);

  const linkedGroups = profiles.filter((p) => p.emails.length > 1).length;
  const withFlags = profiles.filter((p) => p.flags.length > 0).length;
  const highRefund = profiles.filter((p) => p.refundRate > 0.5 && p.refundCount >= 2).length;

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      {/* Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2 text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
          <Link href="/dashboard" className="hover:underline">Dashboard</Link>
          <span>/</span>
          <Link href={`/audit/${params.runId}`} className="hover:underline">Audit</Link>
          <span>/</span>
          <span className="font-medium" style={{ color: 'var(--text)' }}>Customers</span>
        </div>
        <h1 className="text-heading-lg">Customers in this upload</h1>
        <p className="text-body-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Upload from {formatDate(runData.created_at)} &middot; {transactions.length.toLocaleString()} transactions{wasCapped ? ` (showing top ${TX_LIMIT} by score)` : ''}
        </p>
      </div>

      {wasCapped && (
        <div className="rounded-lg px-4 py-3 text-body-sm" style={{ background: 'var(--risk-high-bg)', border: '1px solid var(--risk-high-bd)', color: 'var(--risk-high)' }}>
          This upload contains more than {TX_LIMIT.toLocaleString()} transactions. Showing the {TX_LIMIT.toLocaleString()} highest-scored orders. Use the full export (coming soon) to see all results.
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Unique customers" value={profiles.length.toLocaleString()} sub="identified from data" />
        <SummaryCard
          label="Linked accounts"
          value={linkedGroups.toLocaleString()}
          sub="multi-email groups"
          highlight={linkedGroups > 0}
        />
        <SummaryCard
          label="Suspicious activity"
          value={withFlags.toLocaleString()}
          sub="with changes detected"
          highlight={withFlags > 0}
        />
        <SummaryCard
          label="High refund rate"
          value={highRefund.toLocaleString()}
          sub="above 50% refunds"
          highlight={highRefund > 0}
        />
      </div>

      {/* Customer list (client component for interactivity) */}
      <CustomerList profiles={profiles} />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-lg px-5 py-4"
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${highlight ? 'var(--risk-high-bd)' : 'var(--border-subtle)'}`,
      }}
    >
      <div className="text-caption mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="text-heading-sm" style={{ color: highlight ? 'var(--risk-high)' : 'var(--text)' }}>{value}</div>
      <div className="text-caption mt-0.5" style={{ color: 'var(--text-subtle)' }}>{sub}</div>
    </div>
  );
}
