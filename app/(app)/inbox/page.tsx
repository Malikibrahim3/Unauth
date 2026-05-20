import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import Link from 'next/link';
import InboxClient from '@/components/inbox/InboxClient';
import TrackPageView from '@/components/common/TrackPageView';
import { signalLabel } from '@/lib/copy/signalLabels';
import PageSizeSelect from '@/components/common/PageSizeSelect';
import { fetchMerchantReviewQueueRows } from '@/lib/supabase/merchantHelpers';
import { Button, WorkbenchActionBar, WorkbenchEmptyState, WorkbenchKpiStrip, WorkbenchPage } from '@/components/ui';

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
  // Permission denied: redirect to dashboard rather than returning a NextResponse from a page component.
  if (denied) redirect('/dashboard');

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
    <WorkbenchPage
      title="Cases"
      subtitle="Identity-flagged transactions awaiting review"
      navItems={[
        { key: 'overview', label: 'Overview', href: '/dashboard' },
        { key: 'cases', label: 'Cases', href: '/inbox' },
        { key: 'clusters', label: 'Clusters', href: '/customers?merchantsMin=2' },
        { key: 'audits', label: 'Audits', href: '/history' },
        { key: 'reports', label: 'Reports', href: '/chargebacks' },
      ]}
      activeNavKey="cases"
      actions={
        <div className="flex items-center gap-2">
          <a href="/api/inbox/export"><Button variant="secondary" size="sm">Export Queue</Button></a>
          <Link href="/upload"><Button size="sm">New Audit</Button></Link>
        </div>
      }
      kpiStrip={
        <WorkbenchKpiStrip
          items={[
            { label: 'Open cases', value: items.length.toLocaleString(), hint: 'Current page' },
            { label: 'Value at risk', value: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(totalValueAtRisk), hint: 'Current page estimate' },
            { label: 'Definite', value: items.filter((i) => i.match_status === 'definite').length.toLocaleString(), hint: 'Queue' },
            { label: 'Probable', value: items.filter((i) => i.match_status === 'probable').length.toLocaleString(), hint: 'Queue' },
            { label: 'Total queue', value: total.toLocaleString(), hint: 'All pages' },
          ]}
        />
      }
      actionBar={
        <WorkbenchActionBar
          left={<PageSizeSelect pathname="/inbox" searchParams={querySearchParams} pageSize={pageSize} />}
          right={totalPages > 1 ? (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>Page {page} of {totalPages}</span>
              {page > 1 && <Link href={`/inbox?${new URLSearchParams({ ...querySearchParams, page: String(page - 1), pageSize: String(pageSize) }).toString()}`}><Button variant="secondary" size="sm">Prev</Button></Link>}
              {page < totalPages && <Link href={`/inbox?${new URLSearchParams({ ...querySearchParams, page: String(page + 1), pageSize: String(pageSize) }).toString()}`}><Button variant="secondary" size="sm">Next</Button></Link>}
            </div>
          ) : null}
        />
      }
      main={items.length === 0 ? (
        <WorkbenchEmptyState
          title="You're all caught up"
          description="No high or critical transactions need review right now."
          action={<Link href="/upload" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>Upload a CSV to get started</Link>}
        />
      ) : (
        <InboxClient initialItems={items} />
      )}
    />
  );
}
