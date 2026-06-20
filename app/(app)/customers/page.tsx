// TODO(product-gating): require CUSTOMER_SEARCH entitlement when ENFORCE_PRODUCT_GATES is enabled.
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { getConnectionState } from '@/lib/connections/getConnectionState';
import { getMerchantDataPresence } from '@/lib/supabase/getMerchantDataPresence';
import { resolveMerchantSetupState } from '@/lib/connections/getMerchantSetupState';
import { redirect } from 'next/navigation';
import { requirePermission, PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions';
import { escapePostgrestFilterValue } from '@/lib/supabase/merchantHelpers';
import { isOrderReferenceSearchTerm, orderReferenceIlike } from '@/lib/customers/orderSearch';
import { hashIdentifier } from '@/lib/identity/hash';
import { normaliseEmail } from '@/lib/identity/normalise';
import { lookupIdentityGradesByEmailHash } from '@/lib/customers/identityNetwork';
import type { IdentityGradeBadge } from '@/lib/customers/identityNetwork';
import { CustomersOverviewPageView } from '@/app/(app)/customers/CustomersOverviewPageView';
import { resolveCustomerActions } from '@/app/(app)/customers/customersOverviewPageUtils';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;

const OPEN_CLAIM_STATUSES = ['pending', 'open', 'escalated'] as const;
const CHARGEBACK_CLAIM_TYPE = 'chargeback';

type SourceCustomerRow = {
  id: string;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  orders_count: number | null;
  total_spent: number | string | null;
  account_created_at: string | null;
  created_at: string;
  updated_at: string;
};

type OrderAggRow = {
  id: string;
  source_customer_id: string | null;
  placed_at: string | null;
};

type ClaimAggRow = {
  id: string;
  claim_type: string;
  status: string;
  source_order_id: string | null;
};

function displayNames(row: SourceCustomerRow): string[] {
  const name = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
  return name ? [name] : [];
}

function fullName(row: SourceCustomerRow): string {
  return [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
}

function uniqueNonEmptyStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((v) => v?.trim()).filter((v): v is string => Boolean(v))));
}

/**
 * Upper bound on source_customers scanned to build identity groups for one
 * list render. Grouping must happen before pagination, so we read the filtered
 * customer set into memory; this caps that read. Merchants beyond the cap get
 * grouping over the most-recent slice (logged) until this moves to a persisted
 * (merchant_id, identity_id) projection / RPC.
 */
const IDENTITY_GROUP_SCAN_CAP = 4000;

export default async function CustomersOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const svc = createServiceClient();
  const { denied, ctx } = await requirePermission(svc, user.id, PERMISSIONS.VIEW_CUSTOMERS);
  if (denied) return redirect(await resolveDefaultAppPath(svc, user.id));

  // Run connection state and search-param resolution in parallel — neither blocks the other.
  const [[connectionState, dataPresence], sp] = await Promise.all([
    Promise.all([
      getConnectionState(svc, ctx.merchantId),
      getMerchantDataPresence(svc, ctx.merchantId, user.id),
    ]),
    Promise.resolve(searchParams).then((p) => p ?? {}),
  ]);
  const setupState = resolveMerchantSetupState(connectionState, dataPresence);

  const page = Math.max(1, parseInt(sp.page ?? '1', 10));
  const requestedPageSize = parseInt(sp.pageSize ?? String(DEFAULT_PAGE_SIZE), 10);
  const PAGE_SIZE = PAGE_SIZE_OPTIONS.includes(requestedPageSize as (typeof PAGE_SIZE_OPTIONS)[number])
    ? requestedPageSize
    : DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * PAGE_SIZE;

  // Basic
  const q               = sp.q?.trim() || sp.email?.trim() || '';
  const riskFilter      = sp.risk ?? '';
  const hasRefunds      = sp.hasRefunds === '1';
  const hasChargebacks  = sp.hasChargebacks === '1';
  /** Legacy query param — ignored (watchlist filter retired). */
  void (sp.watchlisted === '1');
  const openClaimsOnly = sp.openClaims === '1';
  const sort            = sp.sort ?? 'risk';

  // Investigation status (merchant_identity_state.investigation_status)
  const statusFilter = sp.status?.trim() ?? '';

  // -------------------------------------------------------------------------
  // Customer ID pre-filters (search / claims-derived filters).
  //
  // The merchant's own customer list comes from layer-1 source_customers /
  // source_orders / claims. Identity grade is a per-row enrichment (below) —
  // never a base-table join, since identities are network-level.
  // -------------------------------------------------------------------------
  const isOrderReferenceSearch = isOrderReferenceSearchTerm(q);
  let restrictToCustomerIds: string[] | null = null;

  if (isOrderReferenceSearch) {
    const ilike = orderReferenceIlike(q);
    const { data: orderRows } = await svc
      .from('source_orders')
      .select('source_customer_id')
      .eq('merchant_id', ctx.merchantId)
      .or(`external_id.ilike.${ilike},order_number.ilike.${ilike}`)
      .not('source_customer_id', 'is', null)
      .limit(200) as unknown as { data: Array<{ source_customer_id: string | null }> | null };
    restrictToCustomerIds = Array.from(
      new Set((orderRows ?? []).flatMap((r) => (r.source_customer_id ? [r.source_customer_id] : []))),
    );
  }

  const claimFiltersActive = hasRefunds || hasChargebacks || openClaimsOnly;
  if (claimFiltersActive) {
    let claimQuery = svc
      .from(TABLES.MERCHANT_CLAIMS)
      .select('source_order_id, claim_type, status, source_orders!inner(source_customer_id)')
      .eq('merchant_id', ctx.merchantId)
      .not('source_order_id', 'is', null);
    if (hasChargebacks && !hasRefunds) claimQuery = claimQuery.eq('claim_type', CHARGEBACK_CLAIM_TYPE);
    if (openClaimsOnly) claimQuery = claimQuery.in('status', [...OPEN_CLAIM_STATUSES]);
    const { data: claimRows } = await claimQuery.limit(2000) as unknown as {
      data: Array<{ source_orders: { source_customer_id: string | null } | null }> | null;
    };
    const claimCustomerIds = Array.from(
      new Set(
        (claimRows ?? []).flatMap((r) =>
          r.source_orders?.source_customer_id ? [r.source_orders.source_customer_id] : [],
        ),
      ),
    );
    restrictToCustomerIds = restrictToCustomerIds
      ? restrictToCustomerIds.filter((id) => claimCustomerIds.includes(id))
      : claimCustomerIds;
  }

  // -------------------------------------------------------------------------
  // Identity-centric customer list (layer-1 records collapsed by identity).
  //
  // A single shopper can appear as several source_customers — e.g. checkouts
  // under multiple emails that the resolver linked into one network identity
  // via a shared card / address / phone. The list shows ONE row per resolved
  // identity, aggregating that identity's records, instead of one row per raw
  // source_customer. Records with no resolved identity stay as their own row.
  //
  // Grouping has to happen before pagination (counts and page boundaries are
  // identity-based), so we scan the filtered customer set into memory (capped),
  // resolve+group, paginate the groups, then enrich only the current page.
  // Identity resolution stays own-signal + k-anonymity disciplined inside
  // lookupIdentityGradesByEmailHash — never a network-level base-table join.
  // -------------------------------------------------------------------------
  let scanQuery = svc
    .from('source_customers')
    .select('id, email, phone, first_name, last_name, orders_count, total_spent, account_created_at, created_at, updated_at')
    .eq('merchant_id', ctx.merchantId);

  if (q.length >= 2 && !isOrderReferenceSearch) {
    const safeLike = `%${escapePostgrestFilterValue(q)}%`;
    scanQuery = scanQuery.or(`email.ilike.${safeLike},first_name.ilike.${safeLike},last_name.ilike.${safeLike}`);
  }
  if (restrictToCustomerIds !== null) {
    scanQuery = restrictToCustomerIds.length > 0
      ? scanQuery.in('id', restrictToCustomerIds)
      : scanQuery.eq('id', '00000000-0000-0000-0000-000000000000');
  }
  // Most-recent-first so the cap, when hit, keeps the freshest records.
  scanQuery = scanQuery.order('updated_at', { ascending: false }).limit(IDENTITY_GROUP_SCAN_CAP);

  // Gracefully fall back to empty results on any query error.
  // Server-level timeout is provided by the `maxDuration` export at the top of this file.
  // Note: Supabase query builders are thenable but do not implement .catch() — use try/catch.
  let scanned: SourceCustomerRow[] = [];
  try {
    const result = await scanQuery as unknown as { data: SourceCustomerRow[] | null };
    scanned = result.data ?? [];
  } catch {
    scanned = [];
  }
  if (scanned.length >= IDENTITY_GROUP_SCAN_CAP) {
    console.warn('[customers] identity-group scan hit cap; grouping bounded to most-recent slice', {
      merchantId: ctx.merchantId,
      cap: IDENTITY_GROUP_SCAN_CAP,
    });
  }

  // Resolve each scanned customer to its network identity (own-signal + k-anon
  // disciplined). Chunk the hash lookups to keep request URLs bounded.
  const emailHashByCustomer = new Map<string, string>();
  for (const c of scanned) {
    const norm = normaliseEmail(c.email);
    if (norm) emailHashByCustomer.set(c.id, hashIdentifier(norm));
  }
  const gradeByEmailHash = new Map<string, IdentityGradeBadge>();
  const distinctEmailHashes = Array.from(new Set([...emailHashByCustomer.values()]));
  for (let i = 0; i < distinctEmailHashes.length; i += 300) {
    const chunk = distinctEmailHashes.slice(i, i + 300);
    const map = await lookupIdentityGradesByEmailHash(svc, ctx.merchantId, chunk);
    for (const [hash, badge] of map) gradeByEmailHash.set(hash, badge);
  }

  // Group: identity_id when resolved, else a singleton keyed by the record id.
  type CustomerGroup = { key: string; identityId: string | null; grade: IdentityGradeBadge | undefined; members: SourceCustomerRow[] };
  const groupsByKey = new Map<string, CustomerGroup>();
  for (const c of scanned) {
    const hash = emailHashByCustomer.get(c.id);
    const grade = hash ? gradeByEmailHash.get(hash) : undefined;
    const key = grade ? `identity:${grade.identityId}` : `solo:${c.id}`;
    let group = groupsByKey.get(key);
    if (!group) {
      group = { key, identityId: grade?.identityId ?? null, grade, members: [] };
      groupsByKey.set(key, group);
    }
    group.members.push(c);
    // Strongest grade wins the badge (defensive — same identity ⇒ same grade).
    if (grade && (!group.grade || grade.score > group.grade.score)) {
      group.grade = grade;
      group.identityId = grade.identityId;
    }
  }
  const groups = [...groupsByKey.values()];

  // Merchant-side investigation status for every grouped identity (pre-paginate
  // so the status filter is correct). Chunked.
  const stateByIdentity = new Map<string, string>();
  const allIdentityIds = Array.from(
    new Set(groups.map((g) => g.identityId).filter((id): id is string => Boolean(id))),
  );
  for (let i = 0; i < allIdentityIds.length; i += 300) {
    const chunk = allIdentityIds.slice(i, i + 300);
    const { data: stateRows } = await svc
      .from('merchant_identity_state')
      .select('identity_id, investigation_status')
      .eq('merchant_id', ctx.merchantId)
      .in('identity_id', chunk) as unknown as {
        data: Array<{ identity_id: string; investigation_status: string }> | null;
      };
    for (const r of stateRows ?? []) stateByIdentity.set(r.identity_id, r.investigation_status);
  }

  // Group-level meta for sorting + identity-dependent filtering.
  type GroupMeta = {
    group: CustomerGroup;
    score: number;
    grade: IdentityGradeBadge['grade'] | 'none';
    merchantCount: number;
    investigationStatus: string;
    ordersCountSum: number;
    firstSeen: string;
    lastSeen: string;
  };
  let metas: GroupMeta[] = groups.map((g) => {
    const status = (g.identityId && stateByIdentity.get(g.identityId)) ?? 'new';
    const firstSeen = uniqueNonEmptyStrings(g.members.map((m) => m.account_created_at ?? m.created_at)).sort()[0]
      ?? g.members[0].created_at;
    const lastSeen = uniqueNonEmptyStrings(g.members.map((m) => m.updated_at)).sort().slice(-1)[0]
      ?? g.members[0].updated_at;
    return {
      group: g,
      score: g.grade?.score ?? 0,
      grade: g.grade?.grade ?? 'none',
      merchantCount: g.grade?.merchantCount ?? 1,
      investigationStatus: status,
      ordersCountSum: g.members.reduce((s, m) => s + (m.orders_count ?? 0), 0),
      firstSeen,
      lastSeen,
    };
  });

  // Identity-dependent filters (apply before pagination).
  if (riskFilter) metas = metas.filter((m) => m.grade === riskFilter);
  if (statusFilter) metas = metas.filter((m) => m.investigationStatus === statusFilter);

  switch (sort) {
    case 'oldest':
      metas.sort((a, b) => a.firstSeen.localeCompare(b.firstSeen));
      break;
    case 'orders':
      metas.sort((a, b) => b.ordersCountSum - a.ordersCountSum || b.lastSeen.localeCompare(a.lastSeen));
      break;
    case 'recent':
      metas.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
      break;
    case 'risk':
    default:
      // Highest identity confidence first; recency breaks ties.
      metas.sort((a, b) => b.score - a.score || b.lastSeen.localeCompare(a.lastSeen));
  }

  const total = metas.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageMetas = metas.slice(offset, offset + PAGE_SIZE);

  // -------------------------------------------------------------------------
  // Per-page aggregates: own-store orders + claims across each group's records.
  // -------------------------------------------------------------------------
  const ordersByCustomer = new Map<string, { count: number; first: string | null; last: string | null }>();
  const claimsByCustomer = new Map<string, { claims: number; chargebacks: number }>();
  const pageCustomerIds = pageMetas.flatMap((m) => m.group.members.map((c) => c.id));

  if (pageCustomerIds.length > 0) {
    const { data: orderRows } = await svc
      .from('source_orders')
      .select('id, source_customer_id, placed_at')
      .eq('merchant_id', ctx.merchantId)
      .in('source_customer_id', pageCustomerIds)
      .limit(10000) as unknown as { data: OrderAggRow[] | null };

    const orderCustomer = new Map<string, string>();
    for (const order of orderRows ?? []) {
      if (!order.source_customer_id) continue;
      orderCustomer.set(order.id, order.source_customer_id);
      const agg = ordersByCustomer.get(order.source_customer_id) ?? { count: 0, first: null, last: null };
      agg.count += 1;
      if (order.placed_at) {
        if (!agg.first || order.placed_at < agg.first) agg.first = order.placed_at;
        if (!agg.last || order.placed_at > agg.last) agg.last = order.placed_at;
      }
      ordersByCustomer.set(order.source_customer_id, agg);
    }

    const orderIds = Array.from(orderCustomer.keys());
    if (orderIds.length > 0) {
      const { data: claimRows } = await svc
        .from(TABLES.MERCHANT_CLAIMS)
        .select('id, claim_type, status, source_order_id')
        .eq('merchant_id', ctx.merchantId)
        .in('source_order_id', orderIds)
        .limit(10000) as unknown as { data: ClaimAggRow[] | null };
      for (const claim of claimRows ?? []) {
        const customerId = claim.source_order_id ? orderCustomer.get(claim.source_order_id) : undefined;
        if (!customerId) continue;
        const agg = claimsByCustomer.get(customerId) ?? { claims: 0, chargebacks: 0 };
        agg.claims += 1;
        if (claim.claim_type === CHARGEBACK_CLAIM_TYPE) agg.chargebacks += 1;
        claimsByCustomer.set(customerId, agg);
      }
    }
  }

  const rows = pageMetas.map((m) => {
    const members = m.group.members;
    let totalOrders = 0;
    let totalClaims = 0;
    let totalChargebacks = 0;
    let firstSeen: string | null = null;
    let lastSeen: string | null = null;
    // Representative record = the one with the most own-store orders (the face
    // of the merged row; its id drives the profile drawer).
    let representative = members[0];
    let repOrderCount = -1;
    for (const c of members) {
      const orders = ordersByCustomer.get(c.id);
      const orderCount = Math.max(orders?.count ?? 0, c.orders_count ?? 0);
      totalOrders += orderCount;
      const claims = claimsByCustomer.get(c.id);
      if (claims) {
        totalClaims += claims.claims;
        totalChargebacks += claims.chargebacks;
      }
      const f = orders?.first ?? c.account_created_at ?? c.created_at;
      const l = orders?.last ?? c.updated_at;
      if (f && (!firstSeen || f < firstSeen)) firstSeen = f;
      if (l && (!lastSeen || l > lastSeen)) lastSeen = l;
      if (orderCount > repOrderCount) {
        repOrderCount = orderCount;
        representative = c;
      }
    }
    const linkedEmails = uniqueNonEmptyStrings(members.map((c) => c.email));
    const linkedNames = uniqueNonEmptyStrings(members.map(fullName));
    return {
      id: representative.id,
      risk_score: m.score,
      // Identity confidence grade (displayed as confidence, never a verdict).
      risk_level: m.grade,
      total_orders: totalOrders,
      total_refund_claims: totalClaims,
      total_chargebacks: totalChargebacks,
      refund_rate: totalOrders > 0 ? totalClaims / totalOrders : 0,
      refund_acceleration_score: 0,
      total_merchants_seen_at: m.merchantCount,
      fastest_claim_days: null as number | null,
      primary_email: representative.email,
      names: linkedNames.length > 0 ? linkedNames : displayNames(representative),
      manually_reviewed: false,
      last_seen: lastSeen ?? representative.updated_at,
      first_seen: firstSeen ?? representative.account_created_at ?? representative.created_at,
      profile_confidence: m.score,
      investigation_status: m.investigationStatus,
      // Collapse metadata for the row UI ("+N linked").
      linked_customer_count: members.length,
      linked_emails: linkedEmails,
    };
  });

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);
  const noFilters = !q && !riskFilter && !hasRefunds && !hasChargebacks && !openClaimsOnly && !statusFilter;

  const { primary: primaryAction, subtitle: pageSubtitle } = resolveCustomerActions(setupState, connectionState);

  return (
    <CustomersOverviewPageView
      connectionState={connectionState}
      setupState={setupState}
      hasData={dataPresence.hasCustomerProfiles}
      pageActions={{ primary: primaryAction, subtitle: pageSubtitle }}
      sp={sp}
      rows={rows}
      totalCount={total}
      page={page}
      PAGE_SIZE={PAGE_SIZE}
      totalPages={totalPages}
      from={from}
      to={to}
      noFilters={noFilters}
      q={q}
      riskFilter={riskFilter}
      statusFilter={statusFilter}
      hasRefunds={hasRefunds}
      hasChargebacks={hasChargebacks}
      openClaimsOnly={openClaimsOnly}
    />
  );
}
