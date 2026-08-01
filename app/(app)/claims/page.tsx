import { redirect } from 'next/navigation';
import { TABLES } from '@/lib/supabase/tables';
import { sumSameCurrency } from '@/lib/utils/format';
import { PERMISSIONS } from '@/lib/permissions';
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from '@/lib/auth/requestContext';
import { getCachedConnectionState } from '@/lib/connections/getConnectionState';
import { ACTIVE_CLAIM_STATUSES, getClaimSlaState } from '@/lib/claims/sla';
import { fetchClaimQueueCounts } from '@/lib/claims/queueCounts';
import { claimsListTotalForView, formatClaimsResultText, resolveClaimsListView } from '@/lib/claims/claimsQueueUi';
import { ClaimsPageView } from '@/app/(app)/claims/ClaimsPageView';
import type { ClaimsFilterTab } from '@/app/(app)/claims/ClaimsPageView';
import { merchantHasEntitlement } from '@/lib/product/requireEntitlement';
import { buildClaimsQueryString } from '@/app/(app)/claims/claimsPageLogic';
import {
  type ClaimRow,
  type CustomerProfileSummary,
  type EvidencePackageRow,
} from '@/app/(app)/claims/claimsPageData';

export const dynamic = 'force-dynamic';

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;
const FINAL_CLAIM_STATUSES = ['closed', 'resolved_refunded', 'resolved_won', 'resolved_lost', 'resolved_denied', 'resolved_exchanged', 'voided'] as const;

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
type ClaimsSearchParams = {
  search?: string;
  status?: string;
  workflow?: string;
  sort?: string;
  sla?: string;
  page?: string;
  pageSize?: string;
  queue?: string;
  owner?: string;
  viewed?: string;
  focus?: string;
};

type SearchIdRow = { id: string };

function ilikePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

/**
 * Resolve the primary Cases search against merchant-owned source records, then
 * constrain the registry query to the matching case ids. Keeping this work on
 * the server means the browser never receives an unfiltered case collection.
 */
async function resolveCaseSearchIds(
  serviceClient: ReturnType<typeof getRequestServiceClient>,
  merchantId: string,
  rawSearch: string,
): Promise<Set<string>> {
  const pattern = ilikePattern(rawSearch);
  const normalizedCaseSearch = rawSearch.toLowerCase().replace(/[^a-z0-9]/g, '');
  const [
    caseRefResult,
    orderNumberResult,
    orderExternalResult,
    orderEmailResult,
    orderCustomerNameResult,
    ticketRefResult,
    ticketSubjectResult,
    customerFirstNameResult,
    customerLastNameResult,
    customerEmailResult,
    identityNameResult,
  ] = await Promise.all([
    // Postgres cannot apply `ilike` to the UUID case id. Fetch the small,
    // merchant-scoped id set and match both the storage id and the short case
    // reference rendered in the UI (for example, the short code in `Case A1B2C`).
    serviceClient.from(TABLES.MERCHANT_CLAIMS).select('id').eq('merchant_id', merchantId).limit(1000),
    serviceClient.from(TABLES.SOURCE_ORDERS).select('id').eq('merchant_id', merchantId).ilike('order_number', pattern).limit(100),
    serviceClient.from(TABLES.SOURCE_ORDERS).select('id').eq('merchant_id', merchantId).ilike('external_id', pattern).limit(100),
    serviceClient.from(TABLES.SOURCE_ORDERS).select('id').eq('merchant_id', merchantId).ilike('email', pattern).limit(100),
    serviceClient.from(TABLES.SOURCE_ORDERS).select('id').eq('merchant_id', merchantId).ilike('customer_name', pattern).limit(100),
    serviceClient.from(TABLES.SOURCE_TICKETS).select('id').eq('merchant_id', merchantId).ilike('external_id', pattern).limit(100),
    serviceClient.from(TABLES.SOURCE_TICKETS).select('id').eq('merchant_id', merchantId).ilike('subject', pattern).limit(100),
    serviceClient.from('source_customers').select('id').eq('merchant_id', merchantId).ilike('first_name', pattern).limit(100),
    serviceClient.from('source_customers').select('id').eq('merchant_id', merchantId).ilike('last_name', pattern).limit(100),
    serviceClient.from('source_customers').select('id').eq('merchant_id', merchantId).ilike('email', pattern).limit(100),
    serviceClient.from(TABLES.MERCHANT_IDENTITY_STATE).select('identity_id').eq('merchant_id', merchantId).ilike('display_name', pattern).limit(100),
  ]);

  const failedSearch = [
    caseRefResult,
    orderNumberResult,
    orderExternalResult,
    orderEmailResult,
    orderCustomerNameResult,
    ticketRefResult,
    ticketSubjectResult,
    customerFirstNameResult,
    customerLastNameResult,
    customerEmailResult,
    identityNameResult,
  ].find((result) => result.error);
  if (failedSearch?.error) {
    throw new Error(`Failed to search cases: ${failedSearch.error.message}`);
  }

  const orderIds = Array.from(new Set([
    ...((orderNumberResult.data ?? []) as SearchIdRow[]).map((row) => row.id),
    ...((orderExternalResult.data ?? []) as SearchIdRow[]).map((row) => row.id),
    ...((orderEmailResult.data ?? []) as SearchIdRow[]).map((row) => row.id),
    ...((orderCustomerNameResult.data ?? []) as SearchIdRow[]).map((row) => row.id),
  ]));
  const ticketIds = Array.from(new Set([
    ...((ticketRefResult.data ?? []) as SearchIdRow[]).map((row) => row.id),
    ...((ticketSubjectResult.data ?? []) as SearchIdRow[]).map((row) => row.id),
  ]));
  const sourceCustomerIds = Array.from(new Set([
    ...((customerFirstNameResult.data ?? []) as SearchIdRow[]).map((row) => row.id),
    ...((customerLastNameResult.data ?? []) as SearchIdRow[]).map((row) => row.id),
    ...((customerEmailResult.data ?? []) as SearchIdRow[]).map((row) => row.id),
  ]));
  const identityIds = ((identityNameResult.data ?? []) as Array<{ identity_id: string }>).map((row) => row.identity_id);

  const [
    orderCaseResult,
    ticketCaseResult,
    sourceCustomerOrderIdsResult,
    sourceCustomerTicketIdsResult,
    identityCaseResult,
  ] = await Promise.all([
    orderIds.length > 0
      ? serviceClient.from(TABLES.MERCHANT_CLAIMS).select('id').eq('merchant_id', merchantId).in('source_order_id', orderIds)
      : Promise.resolve({ data: [], error: null }),
    ticketIds.length > 0
      ? serviceClient.from(TABLES.MERCHANT_CLAIMS).select('id').eq('merchant_id', merchantId).in('source_ticket_id', ticketIds)
      : Promise.resolve({ data: [], error: null }),
    sourceCustomerIds.length > 0
      ? serviceClient.from(TABLES.SOURCE_ORDERS).select('id').eq('merchant_id', merchantId).in('source_customer_id', sourceCustomerIds)
      : Promise.resolve({ data: [], error: null }),
    sourceCustomerIds.length > 0
      ? serviceClient.from(TABLES.SOURCE_TICKETS).select('id').eq('merchant_id', merchantId).in('source_customer_id', sourceCustomerIds)
      : Promise.resolve({ data: [], error: null }),
    identityIds.length > 0
      ? serviceClient.from(TABLES.MERCHANT_CLAIMS).select('id').eq('merchant_id', merchantId).in('identity_id', identityIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const failedLink = [
    orderCaseResult,
    ticketCaseResult,
    sourceCustomerOrderIdsResult,
    sourceCustomerTicketIdsResult,
    identityCaseResult,
  ].find((result) => result.error);
  if (failedLink?.error) {
    throw new Error(`Failed to resolve case search results: ${failedLink.error.message}`);
  }

  const sourceCustomerOrderIds = ((sourceCustomerOrderIdsResult.data ?? []) as SearchIdRow[]).map((row) => row.id);
  const sourceCustomerTicketIds = ((sourceCustomerTicketIdsResult.data ?? []) as SearchIdRow[]).map((row) => row.id);
  const [sourceCustomerOrderCases, sourceCustomerTicketCases] = await Promise.all([
    sourceCustomerOrderIds.length > 0
      ? serviceClient.from(TABLES.MERCHANT_CLAIMS).select('id').eq('merchant_id', merchantId).in('source_order_id', sourceCustomerOrderIds)
      : Promise.resolve({ data: [], error: null }),
    sourceCustomerTicketIds.length > 0
      ? serviceClient.from(TABLES.MERCHANT_CLAIMS).select('id').eq('merchant_id', merchantId).in('source_ticket_id', sourceCustomerTicketIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const failedCustomerLink = [sourceCustomerOrderCases, sourceCustomerTicketCases].find((result) => result.error);
  if (failedCustomerLink?.error) {
    throw new Error(`Failed to resolve customer case search results: ${failedCustomerLink.error.message}`);
  }

  const matchingCaseRefs = ((caseRefResult.data ?? []) as SearchIdRow[])
    .filter((row) => {
      const normalizedId = row.id.toLowerCase().replace(/[^a-z0-9]/g, '');
      const shortReference = normalizedId.slice(-5);
      return normalizedId.includes(rawSearch.toLowerCase())
        || (normalizedCaseSearch.length > 0 && shortReference.includes(normalizedCaseSearch))
        || (normalizedCaseSearch.length > 0 && `case${shortReference}`.includes(normalizedCaseSearch));
    })
    .map((row) => row.id);

  return new Set([
    ...matchingCaseRefs,
    ...((orderCaseResult.data ?? []) as SearchIdRow[]).map((row) => row.id),
    ...((ticketCaseResult.data ?? []) as SearchIdRow[]).map((row) => row.id),
    ...((sourceCustomerOrderCases.data ?? []) as SearchIdRow[]).map((row) => row.id),
    ...((sourceCustomerTicketCases.data ?? []) as SearchIdRow[]).map((row) => row.id),
    ...((identityCaseResult.data ?? []) as SearchIdRow[]).map((row) => row.id),
  ]);
}

export default async function ClaimsPage({
  searchParams,
}: {
  searchParams?: Promise<ClaimsSearchParams>;
}) {
  const user = await getRequestUser();
  if (!user) redirect('/login');

  const serviceClient = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_INBOX);
  if (!ctx) redirect('/dashboard');
  const [hasQueueEntitlement, connectionState, resolvedParams] = await Promise.all([
    merchantHasEntitlement(serviceClient, ctx.merchantId, 'CLAIM_REVIEW_QUEUE'),
    getCachedConnectionState(ctx.merchantId),
    searchParams ?? Promise.resolve<ClaimsSearchParams>({}),
  ]);
  if (!hasQueueEntitlement) {
    redirect('/settings/billing?required=CLAIM_REVIEW_QUEUE');
  }
  const sp: Record<string, string | undefined> = { ...(resolvedParams ?? {}) };
  const searchTerm = resolvedParams.search?.trim().slice(0, 80) ?? '';
  const searchedCaseIds = searchTerm
    ? await resolveCaseSearchIds(serviceClient, ctx.merchantId, searchTerm)
    : null;
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
  const sort = resolvedParams.sort === 'age' || resolvedParams.sort === 'filed_desc' || resolvedParams.sort === 'value'
    ? resolvedParams.sort
    : 'updated';
  const slaFilter = resolvedParams.sla === 'overdue' || resolvedParams.sla === 'approaching' ? resolvedParams.sla : null;
  /*
   * `sort=value` orders by exposure so the largest decisions surface first. It
   * was previously accepted in links but never honoured here, so the queue
   * silently fell back to `updated`.
   */
  const orderColumn = sort === 'value'
    ? 'amount_at_risk'
    : sort === 'age' || sort === 'filed_desc' ? 'submitted_at' : 'updated_at';
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
  if (searchedCaseIds) {
    listQuery = listQuery.in('id', Array.from(searchedCaseIds));
  }
  listQuery = listQuery.range(listOffset, listOffset + listCap - 1);

  // Generation 1: the list page, queue counts, and recovery metrics all depend
  // only on the merchant — run them concurrently instead of serially.
  const [
    { data: rawClaims, error: claimsQueryError, count: listCount },
    queueCounts,
    { data: recoveryMetricRows },
  ] = await Promise.all([
    searchedCaseIds && searchedCaseIds.size === 0
      ? Promise.resolve({ data: [], error: null, count: 0 })
      : listQuery,
    fetchClaimQueueCounts(serviceClient, ctx.merchantId, user.id),
    serviceClient
      .from(TABLES.MERCHANT_CLAIMS)
      .select('status,total_estimated_loss,amount_at_risk,currency,recoverability,recovery_owner')
      .eq('merchant_id', ctx.merchantId),
  ]);
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
  const sourceOrderIds = Array.from(new Set(claimRows.flatMap((c) => (c.source_order_id ? [c.source_order_id] : []))));
  const sourceTicketIds = Array.from(new Set(claimRows.flatMap((c) => (c.source_ticket_id ? [c.source_ticket_id] : []))));
  const identityIds = Array.from(new Set(claimRows.flatMap((c) => (c.identity_id ? [c.identity_id] : []))));
  const investigationRowsPromise = claimIds.length > 0
    ? (async () => {
        const primary = await serviceClient
          .from(TABLES.CASE_CLARIFICATION_REQUESTS)
          .select('support_payout_case_id,status,target_type,target_name,partner_id,is_primary,due_at,evidence_gap,response_summary,updated_at')
          .eq('merchant_id', ctx.merchantId)
          .in('support_payout_case_id', claimIds)
          .order('is_primary', { ascending: false })
          .order('updated_at', { ascending: false });
        if (
          primary.error?.code !== '42703'
          || !primary.error.message.includes('partner_id')
        ) {
          return primary;
        }
        const legacy = await serviceClient
          .from(TABLES.CASE_CLARIFICATION_REQUESTS)
          .select('support_payout_case_id,status,target_type,target_name,due_at,response_summary,updated_at')
          .eq('merchant_id', ctx.merchantId)
          .in('support_payout_case_id', claimIds)
          .order('updated_at', { ascending: false });
        return {
          data: (legacy.data ?? []).map((row: Record<string, unknown>) => ({
            ...row,
            partner_id: null,
            is_primary: false,
            evidence_gap: '',
          })),
          error: legacy.error,
        };
      })()
    : Promise.resolve({ data: [], error: null });

  // Generation 2: the lookups below each depend only on the claim rows,
  // not on each other — run them concurrently.
  const [
    { data: outcomeRows },
    { data: orderRows },
    { data: ticketRows },
    { data: stateRows },
    { data: investigationRows, error: investigationRowsError },
  ] =
    await Promise.all([
      claimIds.length > 0
        ? serviceClient
            .from('claim_outcomes')
            .select('claim_id,decision,outcome,updated_at')
            .in('claim_id', claimIds)
        : Promise.resolve({ data: [] }),
      sourceOrderIds.length > 0
        ? serviceClient
            .from('source_orders')
            .select('id,order_number,email,source_customer:source_customers(first_name,last_name,email)')
            .eq('merchant_id', ctx.merchantId)
            .in('id', sourceOrderIds)
        : Promise.resolve({ data: [] }),
      sourceTicketIds.length > 0
        ? serviceClient
            .from('source_tickets')
            .select('id,external_id')
            .eq('merchant_id', ctx.merchantId)
            .in('id', sourceTicketIds)
        : Promise.resolve({ data: [] }),
      identityIds.length > 0
        ? serviceClient
            .from('merchant_identity_state')
            .select('identity_id,display_name')
            .eq('merchant_id', ctx.merchantId)
            .in('identity_id', identityIds)
        : Promise.resolve({ data: [] }),
      investigationRowsPromise,
    ]);
  if (investigationRowsError) {
    console.error('Claims investigation summary query failed', investigationRowsError);
  }

  // claim_outcomes has a UNIQUE claim_id (one row per claim) — no latest-by-updated_at dedupe needed.
  const latestOutcomeByClaimId = new Map<string, { decision: string; outcome: string; updated_at: string }>();
  for (const row of outcomeRows ?? []) {
    latestOutcomeByClaimId.set(row.claim_id, {
      decision: row.decision,
      outcome: row.outcome,
      updated_at: row.updated_at,
    });
  }

  // source_orders join (with the linked source_customer) recovers the customer
  // display (name, email) and order ref in a single query.
  const orderById = new Map<string, { order_number: string | null; email: string | null; customer_name: string | null }>();
  type OrderJoinRow = {
    id: string;
    order_number: string | null;
    email: string | null;
    source_customer: { first_name: string | null; last_name: string | null; email: string | null } | null;
  };
  for (const row of (orderRows ?? []) as unknown as OrderJoinRow[]) {
    const customerName = [row.source_customer?.first_name, row.source_customer?.last_name]
      .filter((part): part is string => !!part && part.trim().length > 0)
      .join(' ')
      .trim();
    orderById.set(row.id, {
      order_number: row.order_number,
      email: row.email ?? row.source_customer?.email ?? null,
      customer_name: customerName.length > 0 ? customerName : null,
    });
  }

  // source_tickets join recovers the helpdesk ticket reference shown in the case header.
  const ticketRefById = new Map<string, string | null>();
  for (const row of ticketRows ?? []) {
    ticketRefById.set(row.id, row.external_id ?? null);
  }

  // Merchant-scoped display name for each identity (its own labelling, not network data).
  const displayNameByIdentityId = new Map<string, string>();
  for (const row of stateRows ?? []) {
    if (row.display_name) displayNameByIdentityId.set(row.identity_id, row.display_name);
  }

  type InvestigationQueueRow = {
    support_payout_case_id: string;
    status: string;
    target_type: string;
    target_name: string | null;
    partner_id: string | null;
    is_primary: boolean;
    due_at: string | null;
    evidence_gap: string;
    response_summary: string | null;
    updated_at: string;
  };
  type InvestigationQueueSummary = {
    open: number;
    overdue: number;
    awaitingReview: number;
    waitingTarget: string | null;
    waitingParty: string | null;
    nextDueAt: string | null;
    evidenceGap: string | null;
    latestResponse: string | null;
  };
  const investigationByClaimId = new Map<string, InvestigationQueueSummary>();
  const partnerIds = Array.from(new Set(
    ((investigationRows ?? []) as unknown as InvestigationQueueRow[])
      .flatMap((row) => row.partner_id ? [row.partner_id] : []),
  ));
  const { data: partnerRows } = partnerIds.length > 0
    ? await serviceClient
        .from(TABLES.PARTNERS)
        .select('id,name')
        .eq('merchant_id', ctx.merchantId)
        .in('id', partnerIds)
    : { data: [] as Array<{ id: string; name: string }> };
  const resolvedPartnerRows = (partnerRows ?? []) as Array<{ id: string; name: string }>;
  const partnerNameById = new Map<string, string>(
    resolvedPartnerRows.map((partner) => [partner.id, partner.name]),
  );
  const nowMs = Date.now();
  for (const row of (investigationRows ?? []) as unknown as InvestigationQueueRow[]) {
    const summary = investigationByClaimId.get(row.support_payout_case_id) ?? {
      open: 0,
      overdue: 0,
      awaitingReview: 0,
      waitingTarget: null,
      waitingParty: null,
      nextDueAt: null,
      evidenceGap: null,
      latestResponse: null,
    };
    const isOpen = !['closed', 'cancelled'].includes(row.status);
    if (isOpen) summary.open += 1;
    if (row.status === 'response_received') summary.awaitingReview += 1;
    if (
      row.status === 'waiting_response'
      && row.due_at
      && Date.parse(row.due_at) < nowMs
    ) {
      summary.overdue += 1;
    }
    if (
      row.status === 'waiting_response'
      && row.due_at
      && (!summary.nextDueAt || row.due_at < summary.nextDueAt)
    ) {
      summary.nextDueAt = row.due_at;
    }
    if (
      isOpen
      && (
        summary.waitingTarget === null
        || row.is_primary
      )
    ) {
      summary.waitingTarget = row.target_type;
      summary.waitingParty = (row.partner_id ? partnerNameById.get(row.partner_id) : null) ?? row.target_name;
      summary.evidenceGap = row.evidence_gap;
    }
    if (!summary.latestResponse && row.response_summary) {
      summary.latestResponse = row.response_summary;
    }
    investigationByClaimId.set(row.support_payout_case_id, summary);
  }

  // Map v2 rows onto the view-model the JSX expects. customer_id = identity_id,
  // shopify_order_id = order_number, shop_domain = null (no v2 source).
  const claims: ClaimRow[] = claimRows.map((c) => {
    const order = c.source_order_id ? orderById.get(c.source_order_id) ?? null : null;
    const investigation = investigationByClaimId.get(c.id);
    return {
      id: c.id,
      // Identity is the customer key when resolved; otherwise fall back to a
      // per-claim key so the order-derived customer summary still attaches.
      customer_id: c.identity_id ?? c.id,
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
      investigation_open_count: investigation?.open ?? 0,
      investigation_overdue_count: investigation?.overdue ?? 0,
      investigation_awaiting_review_count: investigation?.awaitingReview ?? 0,
      investigation_waiting_target: investigation?.waitingTarget ?? null,
      investigation_waiting_party: investigation?.waitingParty ?? null,
      investigation_next_due_at: investigation?.nextDueAt ?? null,
      investigation_evidence_gap: investigation?.evidenceGap ?? null,
      investigation_latest_response: investigation?.latestResponse ?? null,
    };
  });

  // Build the CustomerProfileSummary view-model from identity + merchant-scoped order/state.
  const customerById = new Map<string, CustomerProfileSummary>();
  for (const c of claimRows) {
    const customerKey = c.identity_id ?? c.id;
    if (customerById.has(customerKey)) continue;
    const order = c.source_order_id ? orderById.get(c.source_order_id) ?? null : null;
    const displayName =
      (c.identity_id ? displayNameByIdentityId.get(c.identity_id) : null) ??
      order?.customer_name ??
      null;
    if (!displayName && !order?.email) continue;
    customerById.set(customerKey, {
      id: customerKey,
      names: displayName ? [displayName] : null,
      primary_email: order?.email ?? null,
      risk_level: 'none',
    });
  }

  /*
   * RUN-08: this used to force every entry to null with a "no v2 equivalent"
   * comment, so a case with a generated package still read as "no evidence
   * package" in the registry while its detail page said otherwise. The table
   * does exist in the canonical schema, so the registry now reads the real
   * projection and links a package by the order it was generated for.
   */
  const evidenceByClaimId = new Map<string, EvidencePackageRow | null>();
  const packageByOrderId = new Map<string, EvidencePackageRow>();
  if (sourceOrderIds.length > 0) {
    const { data: evidencePackageRows, error: evidencePackageError } = await serviceClient
      .from(TABLES.EVIDENCE_PACKAGES)
      .select('id,customer_profile_id,generated_for_order_id,reference_number,generated_at')
      .eq('merchant_id', ctx.merchantId)
      .in('generated_for_order_id', sourceOrderIds)
      .order('generated_at', { ascending: false });
    if (evidencePackageError) {
      // Surfaced rather than swallowed: an unreadable projection must not look
      // identical to "this case has no package".
      throw new Error(`Failed to load evidence packages: ${evidencePackageError.message}`);
    }
    for (const row of (evidencePackageRows ?? []) as EvidencePackageRow[]) {
      if (!row.generated_for_order_id) continue;
      if (!packageByOrderId.has(row.generated_for_order_id)) {
        packageByOrderId.set(row.generated_for_order_id, row);
      }
    }
  }
  for (const claim of claimRows) {
    const orderId = claim.source_order_id;
    evidenceByClaimId.set(claim.id, orderId ? (packageByOrderId.get(orderId) ?? null) : null);
  }

  // Sum only rows in the dominant currency; mixed-currency rows are excluded
  // rather than silently added into a single-currency total.
  const { total: totalAtRisk } = sumSameCurrency(
    (recoveryMetricRows ?? []) as Array<{ amount_at_risk: number | null; currency: string | null }>,
    (c) => c.amount_at_risk,
    (c) => c.currency,
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
    totalMatching: searchTerm ? totalForPager : (slaFilter ? totalForPager : listViewTotal),
    view: slaFilter === 'overdue' ? { kind: 'sla', sla: 'overdue' } : slaFilter === 'approaching' ? { kind: 'sla', sla: 'approaching' } : listView,
    search: searchTerm || undefined,
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
      searchTerm={searchTerm}
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
