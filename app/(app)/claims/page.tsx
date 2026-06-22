import { redirect } from 'next/navigation';
// TODO(product-gating): require CLAIM_REVIEW_QUEUE entitlement when ENFORCE_PRODUCT_GATES is enabled.
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
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
const FINAL_CLAIM_STATUSES = ['closed', 'resolved_refunded', 'resolved_won', 'resolved_lost', 'resolved_denied', 'resolved_exchanged', 'voided', 'stale'] as const;

/** v2 `claims` columns surfaced to the queue view-model. */
const CLAIM_LIST_SELECT =
  'id,identity_id,source_order_id,source_ticket_id,claim_type,status,amount_at_risk,total_estimated_loss,currency,loss_attribution,attribution_confidence,recoverability,recovery_owner,recovery_required_evidence,recovery_next_action,payout_decision_state,recovery_state,next_action,next_action_reason,submitted_at,created_at,updated_at,first_viewed_at,assigned_to,assigned_at,snoozed_until';

const ALLOWED_STATUSES = [
  'new',
  'evidence_needed',
  'awaiting_customer_evidence',
  'awaiting_carrier_response',
  'awaiting_3pl_response',
  'awaiting_supplier_response',
  'ready_for_decision',
  'manual_review',
  'decision_recorded',
  'recovery_opened',
  'pending',
  'open',
  'escalated',
  ...FINAL_CLAIM_STATUSES,
] as const;
const WORKFLOW_FILTERS = [
  'needs_evidence',
  'awaiting_carrier',
  'awaiting_3pl',
  'awaiting_supplier',
  'ready_for_decision',
  'manual_review',
  'closed',
] as const;
type WorkflowFilter = (typeof WORKFLOW_FILTERS)[number];

/** Raw shape of a v2 claims row as selected above. */
type ClaimQueryRow = {
  id: string;
  identity_id: string | null;
  source_order_id: string | null;
  source_ticket_id: string | null;
  claim_type: string;
  status: string;
  amount_at_risk: number | null;
  total_estimated_loss: number | null;
  currency: string | null;
  loss_attribution: string | null;
  attribution_confidence: string | null;
  recoverability: string | null;
  recovery_owner: string | null;
  recovery_required_evidence: string[] | null;
  recovery_next_action: string | null;
  payout_decision_state: string | null;
  recovery_state: string | null;
  next_action: string | null;
  next_action_reason: string | null;
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
  searchParams?: Promise<{ status?: string; workflow?: string; sort?: string; sla?: string; page?: string; pageSize?: string; queue?: string; owner?: string; viewed?: string; focus?: string }>;
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
  const workflowFilter = WORKFLOW_FILTERS.includes(resolvedParams.workflow as WorkflowFilter)
    ? (resolvedParams.workflow as WorkflowFilter)
    : null;
  const queueFilter = resolvedParams.queue === 'history' || resolvedParams.queue === 'snoozed' || workflowFilter === 'closed' || (statusFilter && (FINAL_CLAIM_STATUSES as readonly string[]).includes(statusFilter))
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
    .from(TABLES.MERCHANT_CLAIMS)
    .select(CLAIM_LIST_SELECT, slaFilter ? undefined : { count: 'exact' })
    .eq('merchant_id', ctx.merchantId)
    .order(orderColumn, { ascending: orderAscending });

  if (workflowFilter === 'needs_evidence') {
    listQuery = listQuery.in('status', ['evidence_needed', 'awaiting_customer_evidence', 'pending']);
  } else if (workflowFilter === 'awaiting_carrier') {
    listQuery = listQuery.eq('status', 'awaiting_carrier_response');
  } else if (workflowFilter === 'awaiting_3pl') {
    listQuery = listQuery.eq('status', 'awaiting_3pl_response');
  } else if (workflowFilter === 'awaiting_supplier') {
    listQuery = listQuery.eq('status', 'awaiting_supplier_response');
  } else if (workflowFilter === 'ready_for_decision') {
    listQuery = listQuery.in('status', ['ready_for_decision', 'open']);
  } else if (workflowFilter === 'manual_review') {
    listQuery = listQuery.in('status', ['manual_review', 'escalated']);
  } else if (workflowFilter === 'closed') {
    listQuery = listQuery.in('status', [...FINAL_CLAIM_STATUSES]);
  } else if (statusFilter) {
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

  // Join source_tickets to recover the helpdesk ticket reference shown in the case header.
  const sourceTicketIds = Array.from(new Set(claimRows.flatMap((c) => (c.source_ticket_id ? [c.source_ticket_id] : []))));
  const ticketRefById = new Map<string, string | null>();
  if (sourceTicketIds.length > 0) {
    const { data: ticketRows } = await serviceClient
      .from('source_tickets')
      .select('id,external_id')
      .eq('merchant_id', ctx.merchantId)
      .in('id', sourceTicketIds);
    for (const row of ticketRows ?? []) {
      ticketRefById.set(row.id, row.external_id ?? null);
    }
  }

  const identityIds = Array.from(new Set(claimRows.flatMap((c) => (c.identity_id ? [c.identity_id] : []))));
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
      source_ticket_ref: c.source_ticket_id ? ticketRefById.get(c.source_ticket_id) ?? null : null,
      claim_type: c.claim_type,
      status: c.status,
      amount_at_risk: c.amount_at_risk,
      total_estimated_loss: c.total_estimated_loss,
      currency: c.currency,
      loss_attribution: c.loss_attribution,
      attribution_confidence: c.attribution_confidence,
      recoverability: c.recoverability,
      recovery_owner: c.recovery_owner,
      recovery_required_evidence: c.recovery_required_evidence,
      recovery_next_action: c.recovery_next_action,
      payout_decision_state: c.payout_decision_state,
      recovery_state: c.recovery_state,
      next_action: c.next_action,
      next_action_reason: c.next_action_reason,
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
      risk_level: 'none',
    });
  }

  // evidence_packages has no v2 equivalent — no evidence badge/package surfaced.
  const evidenceByClaimId = new Map<string, EvidencePackageRow | null>();
  for (const claim of claims) {
    evidenceByClaimId.set(claim.id, null);
  }

  const [queueCounts, { data: allAmountRows }, { data: recoveryMetricRows }] = await Promise.all([
    fetchClaimQueueCounts(serviceClient, ctx.merchantId, user.id),
    serviceClient
      .from(TABLES.MERCHANT_CLAIMS)
      .select('amount_at_risk')
      .eq('merchant_id', ctx.merchantId),
    serviceClient
      .from(TABLES.MERCHANT_CLAIMS)
      .select('status,total_estimated_loss,amount_at_risk,currency,recoverability,recovery_owner')
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
    workflow: workflowFilter ?? undefined,
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
      label: 'All',
      count: queueCounts.active,
      href: `/claims${buildClaimsQueryString(sp, { workflow: undefined, queue: undefined, viewed: undefined, owner: undefined, status: undefined, sla: undefined, page: '1' })}`,
      active: listView.kind === 'active',
    },
    {
      label: 'Needs evidence',
      count: queueCounts.awaitingEvidence,
      href: `/claims${buildClaimsQueryString(sp, { workflow: 'needs_evidence', viewed: undefined, owner: undefined, queue: undefined, status: undefined, sla: undefined, page: '1' })}`,
      active: listView.kind === 'workflow' && listView.workflow === 'needs_evidence',
    },
    {
      label: 'Awaiting carrier',
      count: queueCounts.awaitingCarrier,
      href: `/claims${buildClaimsQueryString(sp, { workflow: 'awaiting_carrier', viewed: undefined, owner: undefined, queue: undefined, status: undefined, sla: undefined, page: '1' })}`,
      active: listView.kind === 'workflow' && listView.workflow === 'awaiting_carrier',
    },
    {
      label: 'Awaiting 3PL',
      count: queueCounts.awaiting3pl,
      href: `/claims${buildClaimsQueryString(sp, { workflow: 'awaiting_3pl', viewed: undefined, owner: undefined, queue: undefined, status: undefined, sla: undefined, page: '1' })}`,
      active: listView.kind === 'workflow' && listView.workflow === 'awaiting_3pl',
    },
    {
      label: 'Awaiting supplier',
      count: queueCounts.awaitingSupplier,
      href: `/claims${buildClaimsQueryString(sp, { workflow: 'awaiting_supplier', viewed: undefined, owner: undefined, queue: undefined, status: undefined, sla: undefined, page: '1' })}`,
      active: listView.kind === 'workflow' && listView.workflow === 'awaiting_supplier',
    },
    {
      label: 'Ready for decision',
      count: queueCounts.readyForDecision,
      href: `/claims${buildClaimsQueryString(sp, { workflow: 'ready_for_decision', viewed: undefined, owner: undefined, queue: undefined, status: undefined, sla: undefined, page: '1' })}`,
      active: listView.kind === 'workflow' && listView.workflow === 'ready_for_decision',
    },
    {
      label: 'Manual review',
      count: queueCounts.manualReview,
      href: `/claims${buildClaimsQueryString(sp, { workflow: 'manual_review', viewed: undefined, owner: undefined, queue: undefined, status: undefined, sla: undefined, page: '1' })}`,
      active: listView.kind === 'workflow' && listView.workflow === 'manual_review',
    },
    {
      label: 'Closed',
      count: queueCounts.closed,
      href: `/claims${buildClaimsQueryString(sp, { workflow: 'closed', queue: undefined, viewed: undefined, owner: undefined, status: undefined, sla: undefined, page: '1' })}`,
      active: listView.kind === 'workflow' && listView.workflow === 'closed',
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
      initialFocusClaimId={resolvedParams.focus ?? null}
      totalAtRisk={totalAtRisk}
      recoveryMetricRows={(recoveryMetricRows ?? []) as Array<{
        status: string;
        total_estimated_loss: number | null;
        amount_at_risk: number | null;
        currency: string | null;
        recoverability: string | null;
        recovery_owner: string | null;
      }>}
      page={page}
      totalPages={totalPages}
    />
  );
}
