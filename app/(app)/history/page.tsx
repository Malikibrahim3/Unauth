import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import Link from 'next/link';
import AuditHistoryTableClient from '@/components/audit/AuditHistoryTableClient';
import type { Database } from '@/lib/supabase/types';
import { ButtonLink, WorkbenchEmptyState } from '@/components/ui';
import { HistoryPageWorkbench } from '@/app/(app)/history/HistoryPageWorkbench';
import { WORKBENCH_NAV_ITEMS } from '@/components/workbench/workbenchNavItems';
import { requirePermission, PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions';
import { getConnectionState } from '@/lib/connections/getConnectionState';
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
    redirect(await resolveDefaultAppPath(serviceClient, user.id));
  }
  const sp = (await Promise.resolve(searchParams)) ?? {};
  const page = Math.max(1, parseInt(sp?.page ?? '1', 10));
  const requestedPageSize = parseInt(sp?.pageSize ?? String(DEFAULT_PAGE_SIZE), 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedPageSize as (typeof PAGE_SIZE_OPTIONS)[number])
    ? requestedPageSize
    : DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  const [{ data: runs, count }, connection] = await Promise.all([
    serviceClient
      .from(TABLES.PROCESSING_JOBS)
      .select('*', { count: 'exact' })
      .eq('merchant_id', ctx.merchantId)
      .eq('hidden_by_merchant', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1),
    getConnectionState(serviceClient, ctx.merchantId),
  ]);

  const typedRuns = (runs ?? []) as unknown as RunRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const baseSearchParams = sp ?? {};

  return (
    <HistoryPageWorkbench
      title="Import history"
      subtitle={`Showing ${total === 0 ? 0 : offset + 1}-${Math.min(offset + pageSize, total)} of ${total.toLocaleString()} imports`}
      navItems={WORKBENCH_NAV_ITEMS}
      actions={
        <ButtonLink href="/upload" size="sm">Import CSV</ButtonLink>
      }
      kpiItems={[
        { label: 'Imports', value: total.toLocaleString(), hint: 'Visible imports' },
        { label: 'Rows processed', value: typedRuns.reduce((sum, row) => sum + row.total_rows, 0).toLocaleString(), hint: 'Current page scope' },
        { label: 'Matched', value: typedRuns.reduce((sum, row) => sum + (row.flagged_count ?? 0), 0).toLocaleString(), hint: 'Current page scope' },
        { label: 'Last import', value: typedRuns[0]?.created_at ? new Date(typedRuns[0].created_at).toLocaleDateString('en-US') : '-', hint: 'Most recent import' },
        { label: 'Failed', value: typedRuns.filter((row) => row.status === 'failed').length.toLocaleString(), hint: 'Current page scope' },
      ]}
      page={page}
      totalPages={totalPages}
      pageSize={pageSize}
      baseSearchParams={baseSearchParams as Record<string, string>}
      main={
        typedRuns.length === 0 ? (
          <WorkbenchEmptyState
            title="No CSV imports yet"
            description={
              connection.bothConnected
                ? 'Your live Shopify and helpdesk sources are your primary feed. CSV import is optional — use it to backfill historical orders that predate your connection.'
                : connection.orderSourceConnected || connection.helpdesk
                  ? 'CSV import is an optional backfill. Connect both Shopify and your helpdesk for live monitoring, or import a historical order export here.'
                  : 'Import a historical order export to backfill identity matching. For live monitoring, connect Shopify and your helpdesk.'
            }
            action={<Link href="/upload" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>Import CSV</Link>}
          />
        ) : (
          <AuditHistoryTableClient rows={typedRuns} />
        )
      }
    />
  );
}
