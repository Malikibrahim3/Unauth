import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import InboxClient from '@/components/inbox/InboxClient';
import TrackPageView from '@/components/common/TrackPageView';
import { signalLabel } from '@/lib/copy/signalLabels';
import PageSizeSelect from '@/components/common/PageSizeSelect';
import { PageHeader } from '@/components/common/PageHeader';

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;

function topReason(signals: unknown): string {
  if (!Array.isArray(signals) || signals.length === 0) return 'Needs manual review';
  const first = signals.find((s) => typeof s === 'string') as string | undefined;
  if (!first) return 'Needs manual review';
  return signalLabel(first).short;
}

export default async function InboxPage({ searchParams }: { searchParams?: { page?: string; pageSize?: string } }) {
  const supabase = createClient();
  const page = Math.max(1, parseInt(searchParams?.page ?? '1', 10));
  const requestedPageSize = parseInt(searchParams?.pageSize ?? String(DEFAULT_PAGE_SIZE), 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedPageSize as (typeof PAGE_SIZE_OPTIONS)[number])
    ? requestedPageSize
    : DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;
  const querySearchParams = searchParams ?? {};

  const { data: flagged, count } = await supabase
    .from('audit_transactions')
    .select('id, order_id, match_score, risk_level, processed_at, job_id, customer_profile_id, order_value, signals_matched', { count: 'exact' })
    .in('risk_level', ['high', 'critical'])
    .is('dismissed_by_merchant', false)
    .order('match_score', { ascending: false })
    .range(offset, offset + pageSize - 1);

  // Map job_id → processing_job_id to match the InboxClient interface
  const items = (flagged ?? []).map((row: unknown) => ({
    ...(row as unknown as Record<string, unknown>),
    processing_job_id: (row as unknown as { job_id: string }).job_id,
    reason: topReason((row as unknown as { signals_matched?: unknown }).signals_matched),
  })) as unknown as Array<{
    id: string;
    order_id: string;
    match_score: number;
    risk_level: string;
    processed_at: string;
    processing_job_id: string;
    customer_profile_id: string | null;
    order_value?: number | null;
    reason?: string;
  }>;

  const totalValueAtRisk = items.reduce((sum, item) => sum + (item.order_value ?? 0), 0);
  const total = count ?? items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Inbox"
        subtitle="High and critical transactions awaiting review"
        actions={<div className="flex items-center gap-2">
          <a
            href="/api/inbox/export"
            className="px-3 py-2 text-sm font-semibold rounded-md border transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            Export Review Queue
          </a>
          <Link href="/upload" className="btn-accent px-4 py-2 text-sm font-semibold rounded-md transition-colors">
            New Audit
          </Link>
        </div>}
      />
      <div className="rounded-lg px-4 py-3 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          {items.length.toLocaleString()} cases in queue
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Approximate value at risk: {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(totalValueAtRisk)}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <PageSizeSelect pathname="/inbox" searchParams={querySearchParams} pageSize={pageSize} />
        {totalPages > 1 && (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>Page {page} of {totalPages}</span>
            {page > 1 && (
              <Link
                href={`/inbox?${new URLSearchParams({ ...querySearchParams, page: String(page - 1), pageSize: String(pageSize) }).toString()}`}
                className="px-2 py-1 rounded border"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/inbox?${new URLSearchParams({ ...querySearchParams, page: String(page + 1), pageSize: String(pageSize) }).toString()}`}
                className="px-2 py-1 rounded border"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                Next →
              </Link>
            )}
          </div>
        )}
      </div>
      <InboxClient initialItems={items} />
      <TrackPageView event="Inbox Viewed" properties={{ pendingCount: items.length }} />
    </div>
  );
}
