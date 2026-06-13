import { redirect } from 'next/navigation';
// TODO(product-gating): require CLAIM_REVIEW_QUEUE entitlement when ENFORCE_PRODUCT_GATES is enabled.
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { getConnectionState } from '@/lib/connections/getConnectionState';
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

/** v2 `claims` columns surfaced to the queue view-model. */
const CLAIM_LIST_SELECT =
  'id,identity_id,source_order_id,claim_type,status,amount_at_risk,currency,submitted_at,created_at,updated_at,first_viewed_at,assigned_to,assigned_at,snoozed_until';

const ALLOWED_STATUSES = ['pending', 'open', 'escalated', ...FINAL_CLAIM_STATUSES] as const;

/** Raw shape of a v2 claims row as selected above. */
type ClaimQueryRow = {
  id: string;
  identity_id: string | null;
  source_order_id: string | null;
  claim_type: string;
  status: string;
  amount_at_risk: number | null;
  currency: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  first_viewed_at: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
  snoozed_until: string | null;
};
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
  const queueFilter = resolvedParams.queue === 'history' || resolvedParams.queue === 'snoozed' || (statusFilter && (FINAL_CLAIM_STATUSES as readonly string[]).includes(statusFilter))
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
    .from('claims')
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
  if (claimsQueryError) {
    console.error('Claims page query failed', claimsQueryError);
  }

  let claimRows = ((rawClaims ?? []) as unknown as ClaimQueryRow[]);
  let totalForPager = slaFilter ? claimRows.length : (claimsQueryError ? claimRows.length : (listCount ?? claimRows.length));

  if (slaFilter) {
    claimRows = claimRows.filter((claim) => getClaimSlaState(claim).state === slaFilter);
    totalForPager = claimRows.length;
    const slaOffset = (page - 1) * pageSize;
    claimRows = claimRows.slice(slaOffset, slaOffset + pageSize);
  }

  const totalPages = Math.max(1, Math.ceil(totalForPager / pageSize));

  const claimIds = claimRows.map((c) => c.id);

  // claim_outcomes has a UNIQUE claim_id (one row per claim) — no latest-by-updated_at dedupe needed.
  const latestOutcomeByClaimId = new Map<string, { decision: string; outcome: string; updated_at: string }>();
  if (claimIds.length > 0) {
    const { data: outcomeRows } = await serviceClient
      .from('claim_outcomes')
      .select('claim_id,decision,outcome,updated_at')
      .in('claim_id', claimIds);
    for (const row of outcomeRows ?? []) {
      latestOutcomeByClaimId.set(row.claim_id, {
        decision: row.decision,
        outcome: row.outcome,
        updated_at: row.updated_at,
      });
    }
  }

  // Join source_orders for each claim to recover the customer display (email) and order ref.
  const sourceOrderIds = Array.from(new Set(claimRows.flatMap((c) => (c.source_order_id ? [c.source_order_id] : []))));
  const orderById = new Map<string, { order_number: string | null; email: string | null }>();
  if (sourceOrderIds.length > 0) {
    const { data: orderRows } = await serviceClient
      .from('source_orders')
      .select('id,order_number,email')
      .eq('merchant_id', ctx.merchantId)
      .in('id', sourceOrderIds);
    for (const row of orderRows ?? []) {
      orderById.set(row.id, { order_number: row.order_number, email: row.email });
    }
  }

  // Identity grade comes from the network identities table (service-role only).
  // k-anonymity: only surface a cross-merchant identity when merchant_count >= 3.
  // The merchant always sees its own claim/order data regardless.
  const identityIds = Array.from(new Set(claimRows.flatMap((c) => (c.identity_id ? [c.identity_id] : []))));
  const gradeByIdentityId = new Map<string, string>();
  if (identityIds.length > 0) {
    const { data: identityRows } = await serviceClient
      .from('identities')
      .select('id,confidence_grade,merchant_count')
      .in('id', identityIds);
    for (const row of identityRows ?? []) {
      if ((row.merchant_count ?? 0) >= 3) {
        gradeByIdentityId.set(row.id, row.confidence_grade);
      }
    }
  }

  // Merchant-scoped display name for each identity (its own labelling, not network data).
  const displayNameByIdentityId = new Map<string, string>();
  if (identityIds.length > 0) {
    const { data: stateRows } = await serviceClient
      .from('merchant_identity_state')
      .select('identity_id,display_name')
      .eq('merchant_id', ctx.merchantId)
      .in('identity_id', identityIds);
    for (const row of stateRows ?? []) {
      if (row.display_name) displayNameByIdentityId.set(row.identity_id, row.display_name);
    }
  }

  // Map v2 rows onto the view-model the JSX expects. customer_id = identity_id,
  // shopify_order_id = order_number, shop_domain = null (no v2 source).
  const claims: ClaimRow[] = claimRows.map((c) => {
    const order = c.source_order_id ? orderById.get(c.source_order_id) ?? null : null;
    return {
      id: c.id,
      customer_id: c.identity_id,
      shop_domain: null,
      shopify_order_id: order?.order_number ?? null,
      claim_type: c.claim_type,
      status: c.status,
      amount_at_risk: c.amount_at_risk,
      currency: c.currency,
      submitted_at: c.submitted_at,
      created_at: c.created_at,
      updated_at: c.updated_at,
      first_viewed_at: c.first_viewed_at,
      assigned_to: c.assigned_to,
      assigned_at: c.assigned_at,
      snoozed_until: c.snoozed_until,
    };
  });

  // Build the CustomerProfileSummary view-model from identity + merchant-scoped order/state.
  const customerById = new Map<string, CustomerProfileSummary>();
  for (const c of claimRows) {
    if (!c.identity_id || customerById.has(c.identity_id)) continue;
    const order = c.source_order_id ? orderById.get(c.source_order_id) ?? null : null;
    const displayName = displayNameByIdentityId.get(c.identity_id) ?? null;
    customerById.set(c.identity_id, {
      id: c.identity_id,
      names: displayName ? [displayName] : null,
      primary_email: order?.email ?? null,
      risk_level: gradeByIdentityId.get(c.identity_id) ?? 'none',
    });
  }

  // evidence_packages has no v2 equivalent — no evidence badge/package surfaced.
  const evidenceByClaimId = new Map<string, EvidencePackageRow | null>();
  for (const claim of claims) {
    evidenceByClaimId.set(claim.id, null);
  }

  const [queueCounts, { data: allAmountRows }] = await Promise.all([
    fetchClaimQueueCounts(serviceClient, ctx.merchantId, user.id),
    serviceClient
      .from('claims')
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
      label: 'All claims',
      count: queueCounts.active,
      href: `/claims${buildClaimsQueryString(sp, { queue: undefined, viewed: undefined, owner: undefined, status: undefined, sla: undefined, page: '1' })}`,
      active: listView.kind === 'active',
    },
    {
      label: 'New evidence',
      count: queueCounts.unread,
      href: `/claims${buildClaimsQueryString(sp, { viewed: 'unread', queue: undefined, owner: undefined, status: undefined, sla: undefined, page: '1' })}`,
      active: listView.kind === 'unread',
    },
    {
      label: 'Needs review',
      count: queueCounts.unassigned,
      href: `/claims${buildClaimsQueryString(sp, { owner: 'unassigned', viewed: undefined, queue: undefined, status: undefined, sla: undefined, page: '1' })}`,
      active: listView.kind === 'unassigned',
    },
    {
      label: 'Strong identity links',
      count: queueCounts.open,
      href: `/claims${buildClaimsQueryString(sp, { status: 'open', viewed: undefined, owner: undefined, queue: undefined, sla: undefined, page: '1' })}`,
      active: listView.kind === 'status' && listView.status === 'open',
    },
    {
      label: 'Ageing claims',
      count: queueCounts.overdue,
      href: `/claims${buildClaimsQueryString(sp, { sla: 'overdue', sort: 'age', viewed: undefined, owner: undefined, status: undefined, queue: undefined, page: '1' })}`,
      active: slaFilter === 'overdue',
    },
    {
      label: 'Waiting on source data',
      count: queueCounts.awaitingInfo,
      href: `/claims${buildClaimsQueryString(sp, { status: 'pending', viewed: undefined, owner: undefined, queue: undefined, sla: undefined, page: '1' })}`,
      active: listView.kind === 'status' && listView.status === 'pending',
    },
    {
      label: 'High evidence density',
      count: queueCounts.escalated,
      href: `/claims${buildClaimsQueryString(sp, { status: 'escalated', viewed: undefined, owner: undefined, queue: undefined, sla: undefined, page: '1' })}`,
      active: listView.kind === 'status' && listView.status === 'escalated',
    },
    {
      label: 'Outcome recorded',
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
