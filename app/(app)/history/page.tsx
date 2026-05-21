import { createClient, createServiceClient } from '@/lib/supabase/server';
import Link from 'next/link';
import AuditHistoryTableClient from '@/components/audit/AuditHistoryTableClient';
import type { Database } from '@/lib/supabase/types';
import PageSizeSelect from '@/components/common/PageSizeSelect';
import { Button, WorkbenchPage, WorkbenchActionBar, WorkbenchEmptyState, WorkbenchKpiStrip } from '@/components/ui';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { redirect } from 'next/navigation';

type RunRow = Database['public']['Tables']['processing_jobs']['Row'];

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;

export default async function HistoryPage({ searchParams }: { searchParams?: { page?: string; pageSize?: string } }) {
  const supabase = createClient();
  const serviceClient = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_HISTORY);
  if (denied) {
    redirect('/dashboard');
  }
  const sp = (await Promise.resolve(searchParams)) ?? {};
  const page = Math.max(1, parseInt(sp?.page ?? '1', 10));
  const requestedPageSize = parseInt(sp?.pageSize ?? String(DEFAULT_PAGE_SIZE), 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedPageSize as (typeof PAGE_SIZE_OPTIONS)[number])
    ? requestedPageSize
    : DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  const { data: runs, count } = await serviceClient
    .from('processing_jobs')
    .select('*', { count: 'exact' })
    .eq('merchant_id', ctx.merchantId)
    .eq('hidden_by_merchant', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  const typedRuns = (runs ?? []) as unknown as RunRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const baseSearchParams = sp ?? {};

  return (
    <WorkbenchPage
      title="Audits"
      subtitle={`Showing ${total === 0 ? 0 : offset + 1}-${Math.min(offset + pageSize, total)} of ${total.toLocaleString()} runs`}
      navItems={[
        { key: 'overview', label: 'Overview', href: '/dashboard' },
        { key: 'cases', label: 'Cases', href: '/inbox' },
        { key: 'clusters', label: 'Clusters', href: '/customers?merchantsMin=2' },
        { key: 'audits', label: 'Audits', href: '/history' },
        { key: 'reports', label: 'Reports', href: '/chargebacks' },
      ]}
      activeNavKey="audits"
      actions={
        <Link href="/upload">
          <Button size="sm">New Audit</Button>
        </Link>
      }
      kpiStrip={
        <WorkbenchKpiStrip
          items={[
            { label: 'Audits', value: total.toLocaleString(), hint: 'Visible runs' },
            { label: 'Rows processed', value: typedRuns.reduce((sum, row) => sum + row.total_rows, 0).toLocaleString(), hint: 'Current page scope' },
            { label: 'Matched', value: typedRuns.reduce((sum, row) => sum + (row.flagged_count ?? 0), 0).toLocaleString(), hint: 'Current page scope' },
            { label: 'Last upload', value: typedRuns[0]?.created_at ? new Date(typedRuns[0].created_at).toLocaleDateString('en-GB') : '-', hint: 'Most recent run' },
            { label: 'Failed', value: typedRuns.filter((row) => row.status === 'failed').length.toLocaleString(), hint: 'Current page scope' },
          ]}
        />
      }
      actionBar={
        <WorkbenchActionBar
          left={<PageSizeSelect pathname="/history" searchParams={baseSearchParams} pageSize={pageSize} />}
          right={
            totalPages > 1 ? (
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>Page {page} of {totalPages}</span>
                {page > 1 && (
                  <Link href={`/history?${new URLSearchParams({ ...baseSearchParams, page: String(page - 1), pageSize: String(pageSize) }).toString()}`}>
                    <Button variant="secondary" size="sm">Prev</Button>
                  </Link>
                )}
                {page < totalPages && (
                  <Link href={`/history?${new URLSearchParams({ ...baseSearchParams, page: String(page + 1), pageSize: String(pageSize) }).toString()}`}>
                    <Button variant="secondary" size="sm">Next</Button>
                  </Link>
                )}
              </div>
            ) : null
          }
        />
      }
      main={
        typedRuns.length === 0 ? (
          <WorkbenchEmptyState
            title="No audits yet"
            description="Upload your first CSV to start reviewing identity match patterns."
            action={<Link href="/upload" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>Upload your first CSV</Link>}
          />
        ) : (
          <AuditHistoryTableClient rows={typedRuns} />
        )
      }
    />
  );
}
