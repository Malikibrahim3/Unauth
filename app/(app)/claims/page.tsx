import { redirect } from 'next/navigation';
// TODO(product-gating): require CLAIM_REVIEW_QUEUE entitlement when ENFORCE_PRODUCT_GATES is enabled.
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { getConnectionState } from '@/lib/connections/getConnectionState';
import { TABLES } from '@/lib/supabase/tables';
import { ACTIVE_CLAIM_STATUSES, getClaimSlaState } from '@/lib/claims/sla';
import { fetchClaimQueueCounts } from '@/lib/claims/queueCounts';
import { claimsListTotalForView, formatClaimsResultText, resolveClaimsListView } from '@/lib/claims/claimsQueueUi';
import { ClaimsPageView } from '@/app/(app)/claims/ClaimsPageView';
import type { ClaimsFilterTab } from '@/app/(app)/claims/ClaimsPageView';
import {
  buildClaimsQueryString,
  claimNextAction,
} from '@/app/(app)/claims/claimsPageLogic';
import {
  CLAIM_TYPE_LABELS,
  DECISION_LABELS,
  type ClaimRow,
  type CustomerProfileSummary,
  type EvidencePackageRow,
} from '@/app/(app)/claims/claimsPageData';

export const dynamic = 'force-dynamic';

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;
const FINAL_CLAIM_STATUSES = ['resolved_refunded', 'resolved_won', 'resolved_lost', 'resolved_denied', 'resolved_exchanged', 'voided', 'stale'] as const;

/** Columns that exist on all deployed merchant_claims schemas (order_ref may be absent). */
const CLAIM_LIST_SELECT =
  'id,customer_id,shop_domain,shopify_order_id,claim_type,status,amount_at_risk,currency,submitted_at,created_at,updated_at,first_viewed_at,first_viewed_by,assigned_to,assigned_at,snoozed_until,snooze_reason';

const ALLOWED_STATUSES = ['pending', 'open', 'escalated', ...FINAL_CLAIM_STATUSES] as const;
type ClaimStatus = (typeof ALLOWED_STATUSES)[number];

export default async function ClaimsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; sort?: string; sla?: string; page?: string; pageSize?: string; queue?: string; owner?: string; viewed?: string }>;
}) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied) redirect('/dashboard');

  const connectionState = await getConnectionState(serviceClient, ctx.merchantId);

  const resolvedParams = (await searchParams) ?? {};
  const sp: Record<string, string | undefined> = { ...resolvedParams };
  const statusFilter = ALLOWED_STATUSES.includes(resolvedParams.status as ClaimStatus)
    ? (resolvedParams.status as ClaimStatus)
    : null;
  const queueFilter = resolvedParams.queue === 'history' || resolvedParams.queue === 'snoozed' || (statusFilter && FINAL_CLAIM_STATUSES.includes(statusFilter as any))
    ? resolvedParams.queue === 'snoozed' ? 'snoozed' : 'history'
    : 'active';
  const ownerFilter = resolvedParams.owner === 'me' || resolvedParams.owner === 'unassigned' ? resolvedParams.owner : null;
  const viewedFilter = resolvedParams.viewed === 'unread' || resolvedParams.viewed === 'viewed' ? resolvedParams.viewed : null;
  const sort = resolvedParams.sort === 'age' || resolvedParams.sort === 'filed_desc' ? resolvedParams.sort : 'updated';
  const slaFilter = resolvedParams.sla === 'overdue' || resolvedParams.sla === 'approaching' ? resolvedParams.sla : null;
  const orderColumn = sort === 'age' || sort === 'filed_desc' ? 'submitted_at' : 'updated_at';
  const orderAscending = sort === 'age';
  const page = Math.max(1, parseInt(resolvedParams.page ?? '1', 10));
  const requestedPageSize = parseInt(resolvedParams.pageSize ?? String(DEFAULT_PAGE_SIZE), 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedPageSize as (typeof PAGE_SIZE_OPTIONS)[number])
    ? requestedPageSize
    : DEFAULT_PAGE_SIZE;

  // SLA filters apply after fetch - load all matching status rows (merchant-scoped, capped).
  const listCap = slaFilter ? 1000 : pageSize;
  const listOffset = slaFilter ? 0 : (page - 1) * pageSize;

  let listQuery = serviceClient
    .from('merchant_claims' as any)
    .select(CLAIM_LIST_SELECT, slaFilter ? undefined : { count: 'exact' })
    .eq('merchant_id', ctx.merchantId)
    .order(orderColumn, { ascending: orderAscending });

  if (statusFilter) {
    listQuery = listQuery.eq('status', statusFilter);
  } else if (queueFilter === 'history') {
    listQuery = listQuery.in('status', [...FINAL_CLAIM_STATUSES]);
  } else if (queueFilter === 'snoozed') {
    listQuery = listQuery.in('status', [...ACTIVE_CLAIM_STATUSES]).not('snoozed_until', 'is', null).gt('snoozed_until', new Date().toISOString());
  } else {
    listQuery = listQuery.in('status', [...ACTIVE_CLAIM_STATUSES]).or(`snoozed_until.is.null,snoozed_until.lte.${new Date().toISOString()}`);
  }
  if (ownerFilter === 'me') listQuery = listQuery.eq('assigned_to', user.id);
  if (ownerFilter === 'unassigned') listQuery = listQuery.is('assigned_to', null);
  if (viewedFilter === 'unread') listQuery = listQuery.is('first_viewed_at', null);
  if (viewedFilter === 'viewed') listQuery = listQuery.not('first_viewed_at', 'is', null);
  listQuery = listQuery.range(listOffset, listOffset + listCap - 1);

  const { data: rawClaims, error: claimsQueryError, count: listCount } = await listQuery;

  let fallbackClaims: any[] | null = null;
  if (claimsQueryError) {
    console.error('Claims page query failed', claimsQueryError);
    let fallbackQuery = serviceClient
      .from('merchant_claims' as any)
      .select('id,customer_id,shop_domain,shopify_order_id,claim_type,status,amount_at_risk,currency,submitted_at,created_at,updated_at', slaFilter ? undefined : { count: 'exact' })
      .eq('merchant_id', ctx.merchantId)
      .order(orderColumn, { ascending: orderAscending });
    if (statusFilter) {
      fallbackQuery = fallbackQuery.eq('status', statusFilter);
    } else if (queueFilter === 'history') {
      fallbackQuery = fallbackQuery.in('status', [...FINAL_CLAIM_STATUSES]);
    } else {
      fallbackQuery = fallbackQuery.in('status', [...ACTIVE_CLAIM_STATUSES]);
    }
    if (ownerFilter === 'me') fallbackQuery = fallbackQuery.eq('assigned_to', user.id);
    if (ownerFilter === 'unassigned') fallbackQuery = fallbackQuery.is('assigned_to', null);
    if (viewedFilter === 'unread') fallbackQuery = fallbackQuery.is('first_viewed_at', null);
    if (viewedFilter === 'viewed') fallbackQuery = fallbackQuery.not('first_viewed_at', 'is', null);
    const fallback = await fallbackQuery.range(listOffset, listOffset + listCap - 1);
    fallbackClaims = fallback.data ?? [];
  }

  let claims = ((claimsQueryError ? fallbackClaims : rawClaims) ?? []) as ClaimRow[];
  let totalForPager = slaFilter ? claims.length : (claimsQueryError ? claims.length : (listCount ?? claims.length));

  if (slaFilter) {
    claims = claims.filter((claim) => getClaimSlaState(claim).state === slaFilter);
    totalForPager = claims.length;
    const slaOffset = (page - 1) * pageSize;
    claims = claims.slice(slaOffset, slaOffset + pageSize);
  }

  const totalPages = Math.max(1, Math.ceil(totalForPager / pageSize));

  const claimIds = claims.map((c) => c.id);
  let latestOutcomeByClaimId = new Map<string, { decision: string; outcome: string; updated_at: string }>();
  if (claimIds.length > 0) {
    const { data: outcomeRows } = await serviceClient
      .from('merchant_case_outcomes' as any)
      .select('claim_id,decision,outcome,updated_at')
      .in('claim_id', claimIds)
      .order('updated_at', { ascending: false });
    for (const row of (outcomeRows ?? []) as Array<{ claim_id: string; decision: string; outcome: string; updated_at: string }>) {
      if (!latestOutcomeByClaimId.has(row.claim_id)) {
        latestOutcomeByClaimId.set(row.claim_id, { decision: row.decision, outcome: row.outcome, updated_at: row.updated_at });
      }
    }
  }

  const customerIds = Array.from(new Set(claims.flatMap((c) => c.customer_id ? [c.customer_id] : []) as string[]));
  const customerById = new Map<string, CustomerProfileSummary>();
  if (customerIds.length > 0) {
    const { data: profileRows } = await serviceClient
      .from(TABLES.CUSTOMER_PROFILES)
      .select('id, names, primary_email, risk_level')
      .in('id', customerIds);
    for (const row of (profileRows ?? []) as CustomerProfileSummary[]) {
      customerById.set(row.id, row);
    }
  }

  const orderRefs = Array.from(new Set(claims.flatMap((c) => c.shopify_order_id ? [c.shopify_order_id] : []) as string[]));

  const orderIdByOrderRef = new Map<string, string>();
  if (orderRefs.length > 0) {
    const { data: orderRows } = await serviceClient
      .from('fraud_transactions' as any)
      .select('id,order_id')
      .eq('merchant_id', ctx.merchantId)
      .in('order_id', orderRefs)
      .limit(500);
    for (const row of (orderRows ?? []) as Array<{ id: string; order_id: string }>) {
      orderIdByOrderRef.set(row.order_id, row.id);
    }
  }

  const evidenceByClaimId = new Map<string, EvidencePackageRow | null>();
  if (customerIds.length > 0) {
    const { data: evidenceRows } = await serviceClient
      .from('evidence_packages' as any)
      .select('id,customer_profile_id,generated_for_order_id,reference_number,generated_at')
      .eq('merchant_id', ctx.merchantId)
      .in('customer_profile_id', customerIds)
      .order('generated_at', { ascending: false })
      .limit(1000);

    const rows = (evidenceRows ?? []) as EvidencePackageRow[];
    const evidenceByCustomerId = new Map<string, EvidencePackageRow[]>();
    const evidenceByCustomerAndOrder = new Map<string, EvidencePackageRow>();
    for (const row of rows) {
      if (!row.customer_profile_id) continue;
      const bucket = evidenceByCustomerId.get(row.customer_profile_id) ?? [];
      bucket.push(row);
      evidenceByCustomerId.set(row.customer_profile_id, bucket);
      if (row.generated_for_order_id) {
        evidenceByCustomerAndOrder.set(
          `${row.customer_profile_id}:${row.generated_for_order_id}`,
          row,
        );
      }
    }
    for (const claim of claims) {
      const claimOrderRef = claim.shopify_order_id ?? null;
      const disputedOrderId = claimOrderRef ? orderIdByOrderRef.get(claimOrderRef) ?? null : null;
      const exact = disputedOrderId && claim.customer_id
        ? evidenceByCustomerAndOrder.get(`${claim.customer_id}:${disputedOrderId}`) ?? null
        : null;
      const customerMatch = claim.customer_id
        ? evidenceByCustomerId.get(claim.customer_id) ?? []
        : [];
      evidenceByClaimId.set(claim.id, exact ?? customerMatch[0] ?? null);
    }
  }

  const [queueCounts, { data: allAmountRows }] = await Promise.all([
    fetchClaimQueueCounts(serviceClient, ctx.merchantId, user.id),
    serviceClient
      .from('merchant_claims' as any)
      .select('amount_at_risk')
      .eq('merchant_id', ctx.merchantId),
  ]);

  const totalAtRisk = (allAmountRows ?? []).reduce(
    (s: number, c: { amount_at_risk: number | null }) => s + (c.amount_at_risk ?? 0),
    0,
  );

  const listView = resolveClaimsListView({
    queue: queueFilter,
    owner: ownerFilter ?? undefined,
    viewed: viewedFilter ?? undefined,
    status: statusFilter ?? undefined,
    sla: slaFilter ?? undefined,
  });
  const listViewTotal = claimsListTotalForView(listView, queueCounts);
  const resultText = formatClaimsResultText({
    showing: claims.length,
    totalMatching: slaFilter ? totalForPager : listViewTotal,
    view: slaFilter === 'overdue' ? { kind: 'sla', sla: 'overdue' } : slaFilter === 'approaching' ? { kind: 'sla', sla: 'approaching' } : listView,
  });


  const filterTabs: ClaimsFilterTab[] = [
    {
      label: 'Active',
      count: queueCounts.active,
      href: `/claims${buildClaimsQueryString(sp, { queue: undefined, viewed: undefined, owner: undefined, status: undefined, sla: undefined, page: '1' })}`,
      active: listView.kind === 'active',
    },
    {
      label: 'New / unread',
      count: queueCounts.unread,
      href: `/claims${buildClaimsQueryString(sp, { viewed: 'unread', queue: undefined, owner: undefined, status: undefined, sla: undefined, page: '1' })}`,
      active: listView.kind === 'unread',
    },
    {
      label: 'Assigned to me',
      count: queueCounts.assignedToMe,
      href: `/claims${buildClaimsQueryString(sp, { owner: 'me', viewed: undefined, queue: undefined, status: undefined, sla: undefined, page: '1' })}`,
      active: listView.kind === 'assigned_me',
    },
    {
      label: 'Unassigned',
      count: queueCounts.unassigned,
      href: `/claims${buildClaimsQueryString(sp, { owner: 'unassigned', viewed: undefined, queue: undefined, status: undefined, sla: undefined, page: '1' })}`,
      active: listView.kind === 'unassigned',
    },
    {
      label: 'Overdue',
      count: queueCounts.overdue,
      href: `/claims${buildClaimsQueryString(sp, { sla: 'overdue', sort: 'age', viewed: undefined, owner: undefined, status: undefined, queue: undefined, page: '1' })}`,
      active: slaFilter === 'overdue',
    },
    {
      label: 'Awaiting info',
      count: queueCounts.awaitingInfo,
      href: `/claims${buildClaimsQueryString(sp, { status: 'pending', viewed: undefined, owner: undefined, queue: undefined, sla: undefined, page: '1' })}`,
      active: listView.kind === 'status' && listView.status === 'pending',
    },
    {
      label: 'Snoozed',
      count: queueCounts.snoozed,
      href: `/claims${buildClaimsQueryString(sp, { queue: 'snoozed', viewed: undefined, owner: undefined, status: undefined, sla: undefined, page: '1' })}`,
      active: listView.kind === 'snoozed',
    },
    {
      label: 'Escalated',
      count: queueCounts.escalated,
      href: `/claims${buildClaimsQueryString(sp, { status: 'escalated', viewed: undefined, owner: undefined, queue: undefined, sla: undefined, page: '1' })}`,
      active: listView.kind === 'status' && listView.status === 'escalated',
    },
    {
      label: 'History',
      count: queueCounts.resolved,
      href: `/claims${buildClaimsQueryString(sp, { queue: 'history', viewed: undefined, owner: undefined, status: undefined, sla: undefined, page: '1' })}`,
      active: listView.kind === 'history',
    },
  ];

  const isEmpty = queueCounts.total === 0;

  return (
    <ClaimsPageView
      connectionState={connectionState}
      queueCounts={queueCounts}
      isEmpty={isEmpty}
      resultText={resultText}
      pageSize={pageSize}
      filterTabs={filterTabs}
      queueFilter={queueFilter}
      sp={sp}
      sort={sort}
      slaFilter={slaFilter}
      claims={claims}
      listView={listView}
      latestOutcomeByClaimId={latestOutcomeByClaimId}
      evidenceByClaimId={evidenceByClaimId}
      customerById={customerById}
      currentUserId={user.id}
      totalAtRisk={totalAtRisk}
      page={page}
      totalPages={totalPages}
    />
  );
}
