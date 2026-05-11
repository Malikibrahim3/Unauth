import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import AuditHistoryTableClient from '@/components/audit/AuditHistoryTableClient';
import type { Database } from '@/lib/supabase/types';
import PageSizeSelect from '@/components/common/PageSizeSelect';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState, Button } from '@/components/ui';

type RunRow = Database['public']['Tables']['processing_jobs']['Row'];

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;

export default async function HistoryPage({ searchParams }: { searchParams?: { page?: string; pageSize?: string } }) {
  const supabase = createClient();
  const sp = (await Promise.resolve(searchParams)) ?? {};
  const page = Math.max(1, parseInt(sp?.page ?? '1', 10));
  const requestedPageSize = parseInt(sp?.pageSize ?? String(DEFAULT_PAGE_SIZE), 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedPageSize as (typeof PAGE_SIZE_OPTIONS)[number])
    ? requestedPageSize
    : DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  const { data: runs, count } = await supabase
    .from('processing_jobs')
    .select('*', { count: 'exact' })
    .eq('hidden_by_merchant', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  const typedRuns = (runs ?? []) as unknown as RunRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const baseSearchParams = sp ?? {};

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Upload history"
        subtitle={`Showing ${total === 0 ? 0 : offset + 1}–${Math.min(offset + pageSize, total)} of ${total.toLocaleString()} audits`}
        actions={
          <Link href="/upload">
            <Button size="sm">New Audit</Button>
          </Link>
        }
      />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <PageSizeSelect pathname="/history" searchParams={baseSearchParams} pageSize={pageSize} />
        {totalPages > 1 && (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>Page {page} of {totalPages}</span>
            {page > 1 && (
              <Link href={`/history?${new URLSearchParams({ ...baseSearchParams, page: String(page - 1), pageSize: String(pageSize) }).toString()}`}>
                <Button variant="secondary" size="sm">← Prev</Button>
              </Link>
            )}
            {page < totalPages && (
              <Link href={`/history?${new URLSearchParams({ ...baseSearchParams, page: String(page + 1), pageSize: String(pageSize) }).toString()}`}>
                <Button variant="secondary" size="sm">Next →</Button>
              </Link>
            )}
          </div>
        )}
      </div>

      {typedRuns.length === 0 ? (
        <EmptyState
          title="No audits yet"
          description="Upload your first CSV to start reviewing identity match patterns."
          action={<Link href="/upload"><Button variant="secondary" size="sm">Upload your first CSV →</Button></Link>}
        />
      ) : (
        <AuditHistoryTableClient rows={typedRuns} />
      )}
    </div>
  );
}
