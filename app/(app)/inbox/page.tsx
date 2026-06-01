import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getConnectionState } from '@/lib/connections/getConnectionState';
import { PageConnectionGate } from '@/components/connections/PageConnectionGate';
import { requirePermission, PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions';
import Link from 'next/link';
import InboxClient from '@/components/inbox/InboxClient';
import TrackPageView from '@/components/common/TrackPageView';
import { formatCurrencyNullable } from '@/lib/utils/format';
import { signalLabel } from '@/lib/copy/signalLabels';
import PageSizeSelect from '@/components/common/PageSizeSelect';
import { fetchMerchantReviewQueueRows, fetchReviewQueueProfileIds } from '@/lib/supabase/merchantHelpers';
import { Button, WorkbenchActionBar, WorkbenchEmptyState, WorkbenchKpiStrip, WorkbenchPage } from '@/components/ui';
import { WORKBENCH_NAV_ITEMS } from '@/components/workbench/workbenchNavItems';
import { ACTIVE_CLAIM_STATUSES, formatClaimAge } from '@/lib/claims/sla';
import { fetchClaimQueueCounts } from '@/lib/claims/queueCounts';

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
  // Permission denied: route to the best available app page instead of chaining through /dashboard.
  if (denied) redirect(await resolveDefaultAppPath(serviceClient, user.id));

  const connectionState = await getConnectionState(serviceClient, ctx.merchantId);

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
    customer_profile_id?: string | null;
    claim_id?: string | null;
    first_viewed_at?: string | null;
    assigned_to?: string | null;
    snoozed_until?: string | null;
    status?: string | null;
  }> = [];
  let total = 0;

  // Use shared review-queue definition: identity fields, merchant scoped,
  // excludes dismissed. Ordered by identity_score.
  const { rows, ownedJobIds } = await fetchMerchantReviewQueueRows(serviceClient, ctx.merchantId, {
    from: offset,
    to: offset + pageSize - 1,
  });
  const profileIdByTransactionId = await fetchReviewQueueProfileIds(
    serviceClient,
    ownedJobIds,
    rows.map((row: any) => row.id).filter(Boolean),
  );
  const profileIds = Array.from(new Set(Array.from(profileIdByTransactionId.values()).filter(Boolean) as string[]));
  const activeClaimByProfileId = new Map<string, any>();
  if (profileIds.length > 0) {
    let { data: claimRows, error: claimRowsError } = await serviceClient
      .from('merchant_claims' as any)
      .select('id,customer_id,status,first_viewed_at,assigned_to,snoozed_until,submitted_at,created_at,updated_at')
      .eq('merchant_id', ctx.merchantId)
      .in('customer_id', profileIds)
      .in('status', [...ACTIVE_CLAIM_STATUSES])
      .order('updated_at', { ascending: false });
    if (claimRowsError) {
      const fallback = await serviceClient
        .from('merchant_claims' as any)
        .select('id,customer_id,status,submitted_at,created_at,updated_at')
        .eq('merchant_id', ctx.merchantId)
        .in('customer_id', profileIds)
        .in('status', [...ACTIVE_CLAIM_STATUSES])
        .order('updated_at', { ascending: false });
      claimRows = fallback.data;
    }
    for (const claim of claimRows ?? []) {
      if (!activeClaimByProfileId.has(claim.customer_id)) activeClaimByProfileId.set(claim.customer_id, claim);
    }
  }

  // Get total count separately (paginate with id-only select)
  const { rows: allRows } = await fetchMerchantReviewQueueRows(serviceClient, ctx.merchantId, {
    paginate: true,
    select: 'id',
  });
  total = allRows.length;

  items = rows.map((row: any) => {
    const profileId = profileIdByTransactionId.get(row.id) ?? null;
    const claim = profileId ? activeClaimByProfileId.get(profileId) : null;
    return ({
    id: row.id,
    order_id: row.order_id,
    identity_score: row.identity_score ?? 0,
    identity_confidence_grade: row.identity_confidence_grade ?? null,
    match_status: row.match_status ?? null,
    processed_at: row.processed_at,
    processing_job_id: row.job_id,
    order_value: row.order_value ?? null,
    reason: topReason(row.signals_matched),
    customer_profile_id: profileId,
    claim_id: claim?.id ?? null,
    first_viewed_at: claim?.first_viewed_at ?? null,
    assigned_to: claim?.assigned_to ?? null,
    snoozed_until: claim?.snoozed_until ?? null,
    status: claim?.status ?? null,
  });
  });

  const claimQueueCounts = await fetchClaimQueueCounts(serviceClient, ctx.merchantId, user.id);

  const totalValueAtRisk = items.reduce((sum, item) => sum + (item.order_value ?? 0), 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <PageConnectionGate requires="both" connection={connectionState} pageName="Inbox" pageDescription="The inbox shows matched orders awaiting identity review, linked to active claim work from your helpdesk. Without both sources connected, this queue will be empty or missing claim context.">
    <WorkbenchPage
      title="Inbox"
      subtitle="Matched orders awaiting identity review"
      navItems={WORKBENCH_NAV_ITEMS}
      activeNavKey="inbox"
      actions={
        <div className="flex items-center gap-2">
          <a href="/api/inbox/export"><Button variant="secondary" size="sm">Export queue</Button></a>
          <Link href="/upload"><Button size="sm">New audit</Button></Link>
        </div>
      }
      kpiStrip={
        <WorkbenchKpiStrip
          items={[
            { label: 'Active inbox', value: total.toLocaleString(), hint: 'Unresolved identity reviews' },
            { label: 'Order value', value: formatCurrencyNullable(totalValueAtRisk), hint: 'Current page total' },
            { label: 'High confidence', value: items.filter((i) => i.match_status === 'definite' || (i.identity_score ?? 0) >= 85).length.toLocaleString(), hint: 'Definite matches on this page' },
            { label: 'Probable matches', value: items.filter((i) => i.match_status === 'probable' || (i.identity_score ?? 0) >= 70).length.toLocaleString(), hint: 'Probable tier on this page' },
            { label: 'Claims active', value: claimQueueCounts.active.toLocaleString(), hint: 'Unresolved claim work' },
            { label: 'Claims new/unread', value: claimQueueCounts.unread.toLocaleString(), hint: 'Not yet opened' },
            { label: 'Claims overdue', value: claimQueueCounts.overdue.toLocaleString(), hint: '>72h open' },
            { label: 'Total queue', value: total.toLocaleString(), hint: 'All pages' },
          ]}
        />
      }
      actionBar={
        <WorkbenchActionBar
          left={
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Case status">
              {[
                { label: 'Active work', href: '/inbox' },
                { label: 'Claims queue', href: '/claims' },
                { label: 'Resolved history', href: '/claims?queue=history' },
              ].map((tab, index) => (
                <Link
                  key={tab.label}
                  href={tab.href}
                  className="t-label border-b-2 pb-1"
                  style={{
                    color: index === 0 ? 'var(--ink-primary)' : 'var(--ink-tertiary)',
                    borderBottomColor: index === 0 ? 'var(--copper-bright)' : 'transparent',
                  }}
                >
                  {tab.label}
                </Link>
              ))}
            </nav>
          }
          middle={
            <Suspense fallback={<span className="text-xs" style={{ color: 'var(--text-muted)' }}>Rows per page…</span>}>
              <PageSizeSelect pathname="/inbox" pageSize={pageSize} />
            </Suspense>
          }
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
          description="No matched orders need review right now."
          action={<Link href="/upload" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>Upload a CSV to get started</Link>}
        />
      ) : (
        <InboxClient initialItems={items} claimQueueCounts={claimQueueCounts} />
      )}
    />
    </PageConnectionGate>
  );
}
