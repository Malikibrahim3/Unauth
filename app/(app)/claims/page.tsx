import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { getConnectionState } from '@/lib/connections/getConnectionState';
import { PageConnectionGate } from '@/components/connections/PageConnectionGate';
import { WorkbenchPage, WorkbenchKpiStrip, WorkbenchEmptyState, Button } from '@/components/ui';
import { WORKBENCH_NAV_ITEMS } from '@/components/workbench/workbenchNavItems';
import { TABLES } from '@/lib/supabase/tables';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { riskLevelToNewGrade } from '@/lib/confidence';
import { formatCurrencyNullable } from '@/lib/utils/format';
import { ACTIVE_CLAIM_STATUSES, formatClaimAge, formatFiledDate, getClaimSlaState } from '@/lib/claims/sla';
import { fetchClaimQueueCounts } from '@/lib/claims/queueCounts';
import { claimsListTotalForView, formatClaimsResultText, resolveClaimsListView } from '@/lib/claims/claimsQueueUi';
import PageSizeSelect from '@/components/common/PageSizeSelect';

export const dynamic = 'force-dynamic';

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;
const FINAL_CLAIM_STATUSES = ['resolved_refunded', 'resolved_won', 'resolved_lost', 'resolved_denied', 'resolved_exchanged', 'voided', 'stale'] as const;

/** Columns that exist on all deployed merchant_claims schemas (order_ref may be absent). */
const CLAIM_LIST_SELECT =
  'id,customer_id,shop_domain,shopify_order_id,claim_type,status,amount_at_risk,currency,submitted_at,created_at,updated_at,first_viewed_at,first_viewed_by,assigned_to,assigned_at,snoozed_until,snooze_reason';

const CLAIM_TYPE_LABELS: Record<string, string> = {
  missing_parcel: 'Missing parcel',
  damaged: 'Damaged item',
  wrong_item: 'Wrong item',
  refund_request: 'Refund request',
  chargeback: 'Chargeback',
  return_abuse: 'Return abuse',
  other: 'Other',
};

const DECISION_LABELS: Record<string, string> = {
  approved: 'Merchant approved',
  denied: 'Merchant declined',
  escalated: 'Escalated for review',
  partial_refund: 'Partial refund',
  full_refund: 'Full refund',
  chargeback_disputed: 'CB disputed',
  blacklist: 'Added to watchlist',
  no_action: 'No action',
};

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  open:               { label: 'Open',               bg: 'var(--bg-subtle)',                   text: 'var(--text-muted)' },
  pending:            { label: 'Pending external evidence', bg: 'var(--sev-medium-fill,#FEF3C7)', text: 'var(--sev-medium,#B45309)' },
  escalated:          { label: 'Escalated',           bg: 'var(--risk-critical-bg,#FEE2E2)',    text: 'var(--risk-critical,#991B1B)' },
  resolved_refunded:  { label: 'Resolved: refunded',  bg: 'var(--sev-clear-fill,#DCFCE7)',      text: 'var(--sev-clear,#166534)' },
  resolved_won:       { label: 'Resolved: won',       bg: 'var(--sev-clear-fill,#DCFCE7)',      text: 'var(--sev-clear,#166534)' },
  resolved_lost:      { label: 'Resolved: lost',      bg: 'var(--sev-high-fill,#FEE2E2)',       text: 'var(--sev-high,#991B1B)' },
  resolved_denied:    { label: 'Resolved: denied',    bg: 'var(--bg-subtle)',                   text: 'var(--text-muted)' },
  resolved_exchanged: { label: 'Resolved: exchanged', bg: 'var(--sev-clear-fill,#DCFCE7)',      text: 'var(--sev-clear,#166534)' },
  voided:             { label: 'Voided',              bg: 'var(--bg-subtle)',                   text: 'var(--text-muted)' },
  stale:              { label: 'Stale',               bg: 'var(--bg-subtle)',                   text: 'var(--text-muted)' },
};

const ALLOWED_STATUSES = ['pending', 'open', 'escalated', ...FINAL_CLAIM_STATUSES] as const;
type ClaimStatus = (typeof ALLOWED_STATUSES)[number];

type ClaimRow = {
  id: string;
  customer_id: string | null;
  shop_domain: string | null;
  shopify_order_id: string | null;
  order_ref?: string | null;
  claim_type: string;
  status: string;
  amount_at_risk: number | null;
  currency: string | null;
  submitted_at?: string | null;
  created_at?: string | null;
  updated_at: string;
  first_viewed_at?: string | null;
  first_viewed_by?: string | null;
  assigned_to?: string | null;
  assigned_at?: string | null;
  snoozed_until?: string | null;
  snooze_reason?: string | null;
};

type CustomerProfileSummary = {
  id: string;
  names: string[] | null;
  primary_email: string | null;
  risk_level: string;
};

type EvidencePackageRow = {
  id: string;
  customer_profile_id: string | null;
  generated_for_order_id: string | null;
  reference_number: string;
  generated_at: string;
};

function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META['open'];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: m.bg, color: m.text }}
    >
      {m.label}
    </span>
  );
}

function SlaPill({ claim }: { claim: ClaimRow }) {
  const sla = getClaimSlaState(claim);
  const colourMap: Record<string, { bg: string; text: string }> = {
    normal: { bg: 'var(--bg-subtle)', text: 'var(--text-muted)' },
    approaching: { bg: 'var(--sev-medium-fill,#FEF3C7)', text: 'var(--sev-medium,#B45309)' },
    overdue: { bg: 'var(--sev-high-fill,#FEE2E2)', text: 'var(--sev-high,#991B1B)' },
    resolved: { bg: 'var(--sev-clear-fill,#DCFCE7)', text: 'var(--sev-clear,#166534)' },
  };
  const c = colourMap[sla.state] ?? colourMap.normal;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: c.bg, color: c.text }}
    >
      {sla.label}
    </span>
  );
}

function claimNextAction(claim: ClaimRow, latestOutcome: { decision: string; outcome: string; updated_at: string } | null, currentUserId: string) {
  const owner = claim.assigned_to === currentUserId ? 'Assigned to me' : claim.assigned_to ? 'Assigned' : 'Unassigned';
  const snoozedUntil = claim.snoozed_until ? new Date(claim.snoozed_until) : null;
  if (snoozedUntil && snoozedUntil.getTime() > Date.now()) {
    return { stage: 'Snoozed', owner, next: `Follow up ${snoozedUntil.toLocaleDateString('en-US')}` };
  }
  switch (claim.status) {
    case 'open':
      return { stage: claim.first_viewed_at ? 'Viewed' : 'New / unread', owner, next: 'Review linked identity evidence' };
    case 'pending':
      return { stage: 'Awaiting info', owner, next: 'Wait for carrier or customer update' };
    case 'escalated':
      return { stage: 'Escalated', owner, next: 'Review escalation context' };
    case 'resolved_refunded':
    case 'resolved_won':
    case 'resolved_lost':
    case 'resolved_denied':
    case 'resolved_exchanged':
      return { stage: 'Outcome recorded', owner: 'Merchant', next: 'In history' };
    case 'voided':
      return { stage: 'Voided', owner: 'Merchant', next: 'Archived' };
    case 'stale':
      return { stage: 'Stale', owner: 'System', next: 'Reopen if new evidence arrives' };
    default:
      return { stage: 'Review', owner, next: 'Record next action' };
  }
}

function buildClaimsQueryString(
  sp: Record<string, string | undefined>,
  overrides: Record<string, string | undefined> = {},
) {
  const merged: Record<string, string | undefined> = { ...sp, ...overrides };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete merged[key];
  }
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value == null || value === '') continue;
    next.set(key, value);
  }
  const qs = next.toString();
  return qs ? `?${qs}` : '';
}

export default async function ClaimsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; sort?: string; sla?: string; page?: string; pageSize?: string; queue?: string; owner?: string; viewed?: string }>;
}) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_FRAUD_FEEDBACK);
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

  // SLA filters apply after fetch — load all matching status rows (merchant-scoped, capped).
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

  const customerIds = Array.from(new Set(claims.map((c) => c.customer_id).filter(Boolean) as string[]));
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

  const orderRefs = Array.from(new Set(claims.map((c) => c.shopify_order_id).filter(Boolean) as string[]));

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
    for (const claim of claims) {
      const claimOrderRef = claim.shopify_order_id ?? null;
      const disputedOrderId = claimOrderRef ? orderIdByOrderRef.get(claimOrderRef) ?? null : null;
      const customerMatch = rows.filter((r) => r.customer_profile_id === claim.customer_id);
      const exact = disputedOrderId ? customerMatch.find((r) => r.generated_for_order_id === disputedOrderId) : null;
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

  type FilterTab = {
    label: string;
    count: number;
    href: string;
    active: boolean;
  };

  const filterTabs: FilterTab[] = [
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
    <PageConnectionGate requires="helpdesk" connection={connectionState} pageName="Claims" pageDescription="Claim data comes from your helpdesk integration. Connect Gorgias or Zendesk to see and manage disputes here." hasData={queueCounts.total > 0}>
    <WorkbenchPage
      title="Claims"
      subtitle="Track active claim work and merchant-recorded outcomes"
      navItems={[
        ...WORKBENCH_NAV_ITEMS,
        { key: 'claims', label: 'Claims', href: '/claims' },
      ]}
      activeNavKey="claims"
      kpiStrip={
        <WorkbenchKpiStrip
          items={[
            { label: 'Active queue', value: queueCounts.active.toLocaleString(), hint: 'Unresolved work' },
            { label: 'New / unread', value: queueCounts.unread.toLocaleString(), hint: 'Not yet opened' },
            { label: 'Overdue', value: queueCounts.overdue.toLocaleString(), hint: '>72h open' },
            { label: 'Resolved', value: queueCounts.resolved.toLocaleString(), hint: 'History' },
            { label: 'Total claims', value: queueCounts.total.toLocaleString(), hint: 'All time' },
            { label: 'Open claim value', value: formatCurrencyNullable(totalAtRisk || null), hint: 'All claims' },
          ]}
        />
      }
      main={
        isEmpty ? (
          <WorkbenchEmptyState
            title="No claims yet"
            description="Claims appear here when filed from a customer profile. Open a customer profile, run a claim review, and it will show up in this list."
            action={
              <Link href="/customers" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                Go to Customers →
              </Link>
            }
          />
        ) : (
          <div className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {resultText}
              </p>
              <Suspense fallback={<span className="text-xs" style={{ color: 'var(--text-muted)' }}>Rows per page…</span>}>
                <PageSizeSelect pathname="/claims" pageSize={pageSize} />
              </Suspense>
            </div>

            <div className="flex flex-wrap items-center gap-x-1 gap-y-1 border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }} role="tablist" aria-label="Claims queues">
              {filterTabs.map((tab) => (
                <Link
                  key={tab.label}
                  href={tab.href}
                  role="tab"
                  aria-selected={tab.active}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors"
                  style={{
                    background: tab.active ? 'var(--accent)' : 'var(--bg-subtle)',
                    color: tab.active ? 'var(--text-inverse)' : 'var(--text-muted)',
                  }}
                >
                  {tab.label}
                  <span className="font-mono tabular-nums">{tab.count}</span>
                </Link>
              ))}
            </div>

            <div className="rounded-md border px-3 py-2 text-xs" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)', color: 'var(--text-muted)' }}>
              {queueFilter === 'history'
                ? 'History shows resolved and closed claims with merchant-recorded outcomes.'
                : queueFilter === 'snoozed'
                  ? 'Snoozed claims are hidden from the active queue until follow-up is due.'
                : 'Open/read removes a claim from New / unread but keeps it in Active until resolved. Resolve/close moves it to History.'}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {[
                { label: 'Recently updated', href: `/claims${buildClaimsQueryString(sp, { sort: undefined, sla: undefined, page: '1' })}`, active: sort === 'updated' && !slaFilter },
                { label: 'Oldest first', href: `/claims${buildClaimsQueryString(sp, { sort: 'age', sla: undefined, page: '1' })}`, active: sort === 'age' && !slaFilter },
                { label: 'Newest filed', href: `/claims${buildClaimsQueryString(sp, { sort: 'filed_desc', sla: undefined, page: '1' })}`, active: sort === 'filed_desc' && !slaFilter },
                { label: 'Overdue', href: `/claims${buildClaimsQueryString(sp, { sla: 'overdue', sort: 'age', page: '1' })}`, active: slaFilter === 'overdue' },
                { label: 'Approaching SLA', href: `/claims${buildClaimsQueryString(sp, { sla: 'approaching', sort: 'age', page: '1' })}`, active: slaFilter === 'approaching' },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="px-2.5 py-1 rounded-md font-medium"
                  style={{ background: item.active ? 'var(--accent)' : 'var(--bg-subtle)', color: item.active ? 'var(--text-inverse)' : 'var(--text-muted)' }}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {claims.length === 0 ? (
              <div className="rounded-md border py-12 text-center text-sm" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                <p>
                  {listView.kind === 'unread'
                    ? 'No new unread claims right now.'
                    : listView.kind === 'history'
                      ? 'No resolved claims in history yet.'
                      : listView.kind === 'snoozed'
                        ? 'No snoozed claims right now.'
                        : listView.kind === 'assigned_me'
                          ? 'No claims are assigned to you.'
                          : listView.kind === 'unassigned'
                            ? 'No unassigned active claims.'
                            : slaFilter === 'overdue'
                              ? 'No overdue claims in this view.'
                              : 'No claims match this filter.'}
                </p>
                {queueFilter === 'active' && (
                  <Link href="/claims?queue=history" className="mt-2 inline-block font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                    View history
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-subtle)' }}>
                <table className="w-full min-w-[1080px] text-sm">
                  <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-subtle)' }}>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      {[
                        { label: 'Order ref', className: '' },
                        { label: 'Customer', className: 'min-w-[160px]' },
                        { label: 'Type', className: '' },
                        { label: 'Status', className: '' },
                        { label: 'Stage', className: '' },
                        { label: 'Owner', className: 'hidden xl:table-cell' },
                        { label: 'Next action', className: 'min-w-[150px]' },
                        { label: 'Merchant decision', className: 'hidden xl:table-cell' },
                        { label: 'Filed', className: 'hidden lg:table-cell' },
                        { label: 'Age', className: 'hidden lg:table-cell' },
                        { label: 'SLA', className: '' },
                        { label: 'Evidence', className: 'hidden xl:table-cell' },
                        { label: 'At risk', className: '' },
                        { label: 'Updated', className: 'hidden lg:table-cell' },
                      ].map((col) => (
                        <th
                          key={col.label}
                          className={`text-left px-4 py-2.5 text-xs font-semibold whitespace-nowrap ${col.className}`}
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {col.label}
                        </th>
                      ))}
                      <th
                        className="sticky right-0 px-4 py-2.5 text-xs font-semibold text-right whitespace-nowrap"
                        style={{ color: 'var(--text-muted)', background: 'var(--bg-subtle)' }}
                      >
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((c) => {
                      const orderRef = c.shopify_order_id ?? c.id.slice(0, 8);
                      const latestOutcome = latestOutcomeByClaimId.get(c.id) ?? null;
                      const linkedEvidence = evidenceByClaimId.get(c.id) ?? null;
                      const customer = c.customer_id ? customerById.get(c.customer_id) ?? null : null;
                      const customerName = customer?.names?.[0] ?? null;
                      const customerEmail = customer?.primary_email ?? null;
                      const ops = claimNextAction(c, latestOutcome, user.id);
                      return (
                        <tr
                          key={c.id}
                          className="group border-t hover:bg-[var(--bg-hover)]"
                          style={{ borderColor: 'var(--border-subtle)' }}
                        >
                          <td className="px-4 py-3 font-mono text-xs max-w-[120px] truncate" style={{ color: 'var(--text)' }} title={orderRef}>
                            {orderRef}
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'var(--text)' }}>
                            {c.customer_id ? (
                              <Link href={`/customers/${c.customer_id}`} className="block min-w-0 hover:underline" style={{ color: 'var(--accent)' }}>
                                <span className="block font-semibold truncate">{customerName ?? 'Unknown customer'}</span>
                                {customerEmail && (
                                  <span className="block truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>{customerEmail}</span>
                                )}
                                {customer?.risk_level && (
                                  <span className="mt-1 inline-block">
                                    <ConfidenceBadge grade={riskLevelToNewGrade(customer.risk_level)} size="sm" />
                                  </span>
                                )}
                              </Link>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text)' }}>
                            {CLAIM_TYPE_LABELS[c.claim_type] ?? c.claim_type}
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill status={c.status} />
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text)' }}>
                            {ops.stage}
                          </td>
                          <td className="hidden xl:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                            {ops.owner}
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                            {ops.next}
                          </td>
                          <td className="hidden xl:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                            {latestOutcome ? DECISION_LABELS[latestOutcome.decision] ?? latestOutcome.decision : '—'}
                          </td>
                          <td className="hidden lg:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                            {formatFiledDate(c)}
                          </td>
                          <td className="hidden lg:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                            {formatClaimAge(c)}
                          </td>
                          <td className="px-4 py-3">
                            <SlaPill claim={c} />
                          </td>
                          <td className="hidden xl:table-cell px-4 py-3 text-xs max-w-[100px] truncate" style={{ color: 'var(--text-muted)' }}>
                            {linkedEvidence ? (
                              <Link href={`/chargebacks/${linkedEvidence.id}`} className="hover:underline truncate block" style={{ color: 'var(--accent)' }} title={linkedEvidence.reference_number}>
                                {linkedEvidence.reference_number}
                              </Link>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs tabular-nums whitespace-nowrap" style={{ color: 'var(--text)' }}>
                            {formatCurrencyNullable(c.amount_at_risk, c.currency ?? undefined)}
                          </td>
                          <td className="hidden lg:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                            {new Date(c.updated_at).toLocaleDateString('en-US')}
                          </td>
                          <td
                            className="sticky right-0 px-4 py-3 text-right whitespace-nowrap group-hover:bg-[var(--bg-hover)]"
                            style={{ background: 'var(--surface-raised)' }}
                          >
                            {c.customer_id ? (
                              <Link
                                href={`/customers/${c.customer_id}/claims?claimId=${c.id}`}
                                className="text-xs font-semibold hover:underline"
                                style={{ color: 'var(--accent)' }}
                              >
                                Review & record
                              </Link>
                            ) : (
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>Page {page} of {totalPages}</span>
                {page > 1 && (
                  <Link href={`/claims${buildClaimsQueryString(sp, { page: String(page - 1) })}`}>
                    <Button variant="secondary" size="sm">Previous</Button>
                  </Link>
                )}
                {page < totalPages && (
                  <Link href={`/claims${buildClaimsQueryString(sp, { page: String(page + 1) })}`}>
                    <Button variant="secondary" size="sm">Next</Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        )
      }
    />
    </PageConnectionGate>
  );
}
