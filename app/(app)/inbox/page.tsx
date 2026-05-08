import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import Link from 'next/link';
import InboxClient from '@/components/inbox/InboxClient';
import TrackPageView from '@/components/common/TrackPageView';
import { signalLabel } from '@/lib/copy/signalLabels';
import PageSizeSelect from '@/components/common/PageSizeSelect';
import { PageHeader } from '@/components/common/PageHeader';
import { fetchMerchantReviewQueueRows } from '@/lib/supabase/merchantHelpers';

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;

function topReason(signals: unknown): string {
  if (!Array.isArray(signals) || signals.length === 0) return 'Needs manual review';
  const first = signals.find((s) => typeof s === 'string') as string | undefined;
  if (!first) return 'Needs manual review';
  return signalLabel(first).short;
}

export default async function InboxPage({ searchParams }: { searchParams?: Promise<{ page?: string; pageSize?: string }> }) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();

  // Unauthenticated users must be redirected to login, not shown an empty queue.
  if (!user) {
    redirect('/login');
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const page = Math.max(1, parseInt(resolvedSearchParams.page ?? '1', 10));
  const requestedPageSize = parseInt(resolvedSearchParams.pageSize ?? String(DEFAULT_PAGE_SIZE), 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedPageSize as (typeof PAGE_SIZE_OPTIONS)[number])
    ? requestedPageSize
    : DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;
  const querySearchParams = resolvedSearchParams;

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  // Permission denied: return an access denied page (App Router pages must return React nodes, not Response objects).
  if (denied) {
    return (
      <div className="p-8">
        <h1 className="text-heading-lg">Access denied</h1>
        <p className="text-body-sm mt-2" style={{ color: 'var(--text-muted)' }}>
          You do not have permission to view the inbox.
        </p>
      </div>
    );
  }

  let items: Array<{
    id: string;
    order_id: string;
    identity_score: number;
    identity_confidence_grade: string | null;
    match_status: string | null;
    processed_at: string;
    processing_job_id: string;
    order_value?: number | null;
    reason?: string;
  }> = [];
  let total = 0;

  // Use shared review-queue definition: identity fields, merchant scoped,
  // excludes dismissed. Ordered by identity_score.
  const { rows } = await fetchMerchantReviewQueueRows(serviceClient, ctx.merchantId, {
    from: offset,
    to: offset + pageSize - 1,
  });

  // Get total count separately (paginate with id-only select)
  const { rows: allRows } = await fetchMerchantReviewQueueRows(serviceClient, ctx.merchantId, {
    paginate: true,
    select: 'id',
  });
  total = allRows.length;

  items = rows.map((row: any) => ({
    id: row.id,
    order_id: row.order_id,
    identity_score: row.identity_score ?? 0,
    identity_confidence_grade: row.identity_confidence_grade ?? null,
    match_status: row.match_status ?? null,
    processed_at: row.processed_at,
    processing_job_id: row.job_id,
    order_value: row.order_value ?? null,
    reason: topReason(row.signals_matched),
  }));

  const totalValueAtRisk = items.reduce((sum, item) => sum + (item.order_value ?? 0), 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Inbox"
        subtitle="Identity-flagged transactions awaiting review"
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
          Approximate order value under review: {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(totalValueAtRisk)}
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
