import { createClient, createServiceClient } from '@/lib/supabase/server';
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

export const dynamic = 'force-dynamic';

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
  const dataClient = createServiceClient();

  // Fetch all transactions for this job in batches so merchants can inspect
  // every customer represented in the upload.
  const transactions: TransactionRow[] = [];
  const BATCH = 1000;
  for (let offset = 0; ; offset += BATCH) {
    const { data } = await dataClient
      .from('audit_transactions')
      .select('*')
      .eq('job_id', runData.id)
      .order('match_score', { ascending: false })
      .range(offset, offset + BATCH - 1);
    if (!data || data.length === 0) break;
    transactions.push(...(data as unknown as TransactionRow[]));
    if (data.length < BATCH) break;
  }
  const profiles = buildCustomerProfiles(transactions);

  const linkedGroups = profiles.filter((p) => p.emails.length > 1).length;
  const withFlags = profiles.filter((p) => p.flags.length > 0).length;
  const highRefund = profiles.filter((p) => p.refundRate > 0.5 && p.refundCount >= 2).length;

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      {/* Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2 text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
          <Link href="/dashboard" className="hover:opacity-80 transition-colors">Dashboard</Link>
          <span>/</span>
          <Link href={`/audit/${params.runId}`} className="hover:opacity-80 transition-colors">Audit</Link>
          <span>/</span>
          <span className="font-medium" style={{ color: 'var(--text)' }}>Customers</span>
        </div>
        <div className="flex items-center gap-4 mt-1">
          <h1 className="text-heading-lg">Customers in this upload</h1>
          <Link
            href={`/audit/${params.runId}`}
            className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Back to Audit
          </Link>
        </div>
        <p className="text-body-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Upload from {formatDate(runData.created_at)} &middot; {transactions.length.toLocaleString()} transactions
        </p>
      </div>

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
