import { TABLES } from "@/lib/supabase/tables";
import { getCachedConnectionState } from "@/lib/connections/getConnectionState";
import { getMerchantDataPresence } from "@/lib/supabase/getMerchantDataPresence";
import { resolveMerchantSetupState } from "@/lib/connections/getMerchantSetupState";
import { redirect } from "next/navigation";
import {
  PERMISSIONS,
  resolveDefaultAppPath,
} from "@/lib/permissions";
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from "@/lib/auth/requestContext";
import { escapePostgrestFilterValue } from "@/lib/supabase/merchantHelpers";
import {
  isOrderReferenceSearchTerm,
  orderReferenceIlike,
} from "@/lib/customers/orderSearch";
import { hashIdentifier } from "@/lib/identity/hash";
import { normaliseEmail } from "@/lib/identity/normalise";
import { lookupIdentityGradesByEmailHash } from "@/lib/customers/identityNetwork";
import type { IdentityGradeBadge } from "@/lib/customers/identityNetwork";
import { CustomersOverviewPageView } from "@/app/(app)/customers/CustomersOverviewPageView";
import { resolveCustomerActions } from "@/app/(app)/customers/customersOverviewPageUtils";
import { merchantHasEntitlement } from "@/lib/product/requireEntitlement";
import { ACTIVE_CLAIM_STATUSES } from "@/lib/claims/sla";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;

const CHARGEBACK_CLAIM_TYPE = "chargeback";

type SourceCustomerRow = {
  id: string;
  merchant_customer_id: string | null;
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
  merchant_customer_id: string | null;
  placed_at: string | null;
  total_price: number | string | null;
  currency: string | null;
};

function displayNames(row: SourceCustomerRow): string[] {
  const name = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
  return name ? [name] : [];
}

function fullName(row: SourceCustomerRow): string {
  return [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
}

function uniqueNonEmptyStrings(
  values: Array<string | null | undefined>,
): string[] {
  return Array.from(
    new Set(
      values.map((v) => v?.trim()).filter((v): v is string => Boolean(v)),
    ),
  );
}

/**
 * Upper bound on source_customers scanned to build identity groups for one
 * list render. Grouping must happen before pagination, so we read the filtered
 * customer set into memory; this caps that read. Merchants beyond the cap get
 * grouping over the most-recent slice (logged) until this moves to a persisted
 * (merchant_id, identity_id) projection / RPC.
 */
const IDENTITY_GROUP_SCAN_CAP = 4000;

/** Upper bound on payout cases aggregated for directory counts. */
const CASE_AGG_LIMIT = 5000;

export default async function CustomersOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getRequestUser();
  if (!user) redirect("/login");

  const svc = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_CUSTOMERS);
  if (!ctx) return redirect(await resolveDefaultAppPath(svc, user.id));
  // Entitlement, source state, and URL state are independent after tenancy is resolved.
  const [hasCustomerSearch, [connectionState, dataPresence], sp] = await Promise.all([
    merchantHasEntitlement(svc, ctx.merchantId, "CUSTOMER_SEARCH"),
    Promise.all([
      getCachedConnectionState(ctx.merchantId),
      getMerchantDataPresence(svc, ctx.merchantId, user.id),
    ]),
    Promise.resolve(searchParams).then((p) => p ?? {}),
  ]);
  if (!hasCustomerSearch) {
    redirect("/settings/billing?required=CUSTOMER_SEARCH");
  }
  const setupState = resolveMerchantSetupState(connectionState, dataPresence);

  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const requestedPageSize = parseInt(
    sp.pageSize ?? String(DEFAULT_PAGE_SIZE),
    10,
  );
  const PAGE_SIZE = PAGE_SIZE_OPTIONS.includes(
    requestedPageSize as (typeof PAGE_SIZE_OPTIONS)[number],
  )
    ? requestedPageSize
    : DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * PAGE_SIZE;

  // Basic
  const q = sp.q?.trim() || sp.email?.trim() || "";
  const hasRefunds = sp.hasRefunds === "1";
  const hasChargebacks = sp.hasChargebacks === "1";
  /** Legacy query params — ignored (watchlist / review-status workflow retired). */
  void (sp.watchlisted === "1");
  void sp.risk;
  void sp.status;
  const openClaimsOnly = sp.openClaims === "1";
  const requestedSort = sp.sort ?? "recent";
  const sort = ["recent", "orders", "cases", "name"].includes(requestedSort)
    ? requestedSort
    : "recent";

  // -------------------------------------------------------------------------
  // Customer ID pre-filters (search / claims-derived filters).
  //
  // The merchant's own customer list comes from layer-1 source_customers /
  // source_orders / claims.
  // -------------------------------------------------------------------------
  const isOrderReferenceSearch = isOrderReferenceSearchTerm(q);
  let restrictToCustomerIds: string[] | null = null;
  let restrictToMerchantCustomerIds: string[] | null = null;

  if (isOrderReferenceSearch) {
    const ilike = orderReferenceIlike(q);
    const { data: orderRows } = (await svc
      .from("source_orders")
      .select("source_customer_id, merchant_customer_id")
      .eq("merchant_id", ctx.merchantId)
      .or(`external_id.ilike.${ilike},order_number.ilike.${ilike}`)
      .limit(200)) as unknown as {
      data: Array<{ source_customer_id: string | null; merchant_customer_id: string | null }> | null;
    };
    restrictToCustomerIds = Array.from(
      new Set(
        (orderRows ?? []).flatMap((r) =>
          r.source_customer_id ? [r.source_customer_id] : [],
        ),
      ),
    );
    restrictToMerchantCustomerIds = Array.from(
      new Set(
        ((orderRows ?? []) as Array<{ merchant_customer_id: string | null }>).flatMap((r) =>
          r.merchant_customer_id ? [r.merchant_customer_id] : [],
        ),
      ),
    );
  }

  const claimFiltersActive = hasRefunds || hasChargebacks || openClaimsOnly;
  if (claimFiltersActive) {
    let claimQuery = svc
      .from(TABLES.MERCHANT_CLAIMS)
      .select(
        "source_order_id, merchant_customer_id, claim_type, status, source_orders(source_customer_id)",
      )
      .eq("merchant_id", ctx.merchantId);
    if (hasChargebacks && !hasRefunds)
      claimQuery = claimQuery.eq("claim_type", CHARGEBACK_CLAIM_TYPE);
    if (openClaimsOnly)
      claimQuery = claimQuery.in("status", [...ACTIVE_CLAIM_STATUSES]);
    const { data: claimRows } = (await claimQuery.limit(2000)) as unknown as {
      data: Array<{
        merchant_customer_id: string | null;
        source_orders: { source_customer_id: string | null } | null;
      }> | null;
    };
    const claimCustomerIds = Array.from(
      new Set(
        (claimRows ?? []).flatMap((r) =>
          r.source_orders?.source_customer_id
            ? [r.source_orders.source_customer_id]
            : [],
        ),
      ),
    );
    const claimMerchantCustomerIds = Array.from(
      new Set(
        (claimRows ?? []).flatMap((r) =>
          r.merchant_customer_id ? [r.merchant_customer_id] : [],
        ),
      ),
    );
    const claimCustomerIdSet = new Set(claimCustomerIds);
    restrictToCustomerIds = restrictToCustomerIds
      ? restrictToCustomerIds.filter((id) => claimCustomerIdSet.has(id))
      : claimCustomerIds;
    restrictToMerchantCustomerIds = restrictToMerchantCustomerIds
      ? restrictToMerchantCustomerIds.filter((id) => claimMerchantCustomerIds.includes(id))
      : claimMerchantCustomerIds;
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
  // The identity lookup is used ONLY to collapse duplicate records; nothing
  // confidence-related is rendered on this page.
  // -------------------------------------------------------------------------
  let scanQuery = svc
    .from("source_customers")
    .select(
      "id, merchant_customer_id, email, phone, first_name, last_name, orders_count, total_spent, account_created_at, created_at, updated_at",
    )
    .eq("merchant_id", ctx.merchantId);

  if (q.length >= 2 && !isOrderReferenceSearch) {
    const safeLike = `%${escapePostgrestFilterValue(q)}%`;
    scanQuery = scanQuery.or(
      `email.ilike.${safeLike},first_name.ilike.${safeLike},last_name.ilike.${safeLike}`,
    );
  }
  if (restrictToCustomerIds !== null) {
    const sourceFilter = restrictToCustomerIds.length > 0
      ? `id.in.(${restrictToCustomerIds.join(",")})`
      : null;
    const canonicalFilter = restrictToMerchantCustomerIds && restrictToMerchantCustomerIds.length > 0
      ? `merchant_customer_id.in.(${restrictToMerchantCustomerIds.join(",")})`
      : null;
    const filters = [sourceFilter, canonicalFilter].filter(Boolean).join(",");
    scanQuery = filters
      ? scanQuery.or(filters)
      : scanQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  } else if (restrictToMerchantCustomerIds !== null) {
    scanQuery = restrictToMerchantCustomerIds.length > 0
      ? scanQuery.in("merchant_customer_id", restrictToMerchantCustomerIds)
      : scanQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  }
  // Most-recent-first so the cap, when hit, keeps the freshest records.
  scanQuery = scanQuery
    .order("updated_at", { ascending: false })
    .limit(IDENTITY_GROUP_SCAN_CAP);

  // Gracefully fall back to empty results on any query error.
  // Server-level timeout is provided by the `maxDuration` export at the top of this file.
  // Note: Supabase query builders are thenable but do not implement .catch() — use try/catch.
  let scanned: SourceCustomerRow[] = [];
  try {
    const result = (await scanQuery) as unknown as {
      data: SourceCustomerRow[] | null;
    };
    scanned = result.data ?? [];
  } catch {
    scanned = [];
  }
  if (scanned.length >= IDENTITY_GROUP_SCAN_CAP) {
    console.warn(
      "[customers] identity-group scan hit cap; grouping bounded to most-recent slice",
      {
        merchantId: ctx.merchantId,
        cap: IDENTITY_GROUP_SCAN_CAP,
      },
    );
  }

  // Canonical rows are also created for guest orders and support-only contacts,
  // which have no source_customers record to scan. Add a lightweight synthetic
  // row for those aggregates so the directory can link to the same dossier as
  // identified customers. Existing source-customer-backed canonical rows are
  // skipped to avoid duplicate directory entries.
  try {
    let canonicalQuery = svc
      .from(TABLES.MERCHANT_CUSTOMERS)
      .select("id, display_name, email, created_at, updated_at")
      .eq("merchant_id", ctx.merchantId)
      .order("updated_at", { ascending: false })
      .limit(IDENTITY_GROUP_SCAN_CAP);
    if (q.length >= 2 && !isOrderReferenceSearch) {
      const safeLike = `%${escapePostgrestFilterValue(q)}%`;
      canonicalQuery = canonicalQuery.or(`email.ilike.${safeLike},display_name.ilike.${safeLike}`);
    }
    const { data: canonicalRows } = (await canonicalQuery) as unknown as {
      data: Array<{
        id: string;
        display_name: string | null;
        email: string | null;
        created_at: string;
        updated_at: string;
      }> | null;
    };
    const linkedCanonicalIds = new Set(
      scanned.flatMap((customer) => customer.merchant_customer_id ? [customer.merchant_customer_id] : []),
    );
    for (const canonical of canonicalRows ?? []) {
      if (linkedCanonicalIds.has(canonical.id)) continue;
      const nameParts = (canonical.display_name ?? "").trim().split(/\s+/).filter(Boolean);
      scanned.push({
        id: canonical.id,
        merchant_customer_id: canonical.id,
        email: canonical.email,
        phone: null,
        first_name: nameParts[0] ?? null,
        last_name: nameParts.slice(1).join(" ") || null,
        orders_count: null,
        total_spent: null,
        account_created_at: canonical.created_at,
        created_at: canonical.created_at,
        updated_at: canonical.updated_at,
      });
    }
  } catch {
    // Older deployments can render the source-customer directory normally.
  }

  // Resolve each scanned customer to its network identity (own-signal + k-anon
  // disciplined). Chunk the hash lookups to keep request URLs bounded.
  const emailHashByCustomer = new Map<string, string>();
  for (const c of scanned) {
    const norm = normaliseEmail(c.email);
    if (norm) emailHashByCustomer.set(c.id, hashIdentifier(norm));
  }
  const distinctEmailHashes = Array.from(
    new Set([...emailHashByCustomer.values()]),
  );
  const chunks: string[][] = [];
  for (let i = 0; i < distinctEmailHashes.length; i += 300) {
    chunks.push(distinctEmailHashes.slice(i, i + 300));
  }
  const gradeByEmailHash = new Map<string, IdentityGradeBadge>();
  const chunkResults = await Promise.all(
    chunks.map((chunk) =>
      lookupIdentityGradesByEmailHash(svc, ctx.merchantId, chunk),
    ),
  );
  for (const map of chunkResults) {
    for (const [hash, badge] of map) gradeByEmailHash.set(hash, badge);
  }

  // Group: identity_id when resolved, else a singleton keyed by the record id.
  type CustomerGroup = { key: string; members: SourceCustomerRow[] };
  const groupsByKey = new Map<string, CustomerGroup>();
  for (const c of scanned) {
    const hash = emailHashByCustomer.get(c.id);
    const identityId = hash
      ? gradeByEmailHash.get(hash)?.identityId
      : undefined;
    const key = c.merchant_customer_id
      ? `merchant:${c.merchant_customer_id}`
      : identityId
        ? `identity:${identityId}`
        : `solo:${c.id}`;
    let group = groupsByKey.get(key);
    if (!group) {
      group = { key, members: [] };
      groupsByKey.set(key, group);
    }
    group.members.push(c);
  }
  const groups = [...groupsByKey.values()];

  // -------------------------------------------------------------------------
  // Merchant-wide payout case aggregate (single bounded query). Feeds the KPI
  // strip, the "Most payout cases" sort, and the per-row case counts.
  // -------------------------------------------------------------------------
  const caseAggByCustomer = new Map<string, { total: number; open: number }>();
  const caseAggByMerchantCustomer = new Map<string, { total: number; open: number }>();
  try {
    const { data: caseRows } = (await svc
      .from(TABLES.MERCHANT_CLAIMS)
      .select("status, merchant_customer_id, source_orders(source_customer_id)")
      .eq("merchant_id", ctx.merchantId)
      .limit(CASE_AGG_LIMIT)) as unknown as {
      data: Array<{
        status: string;
        merchant_customer_id: string | null;
        source_orders: { source_customer_id: string | null } | null;
      }> | null;
    };
    for (const r of caseRows ?? []) {
      const customerId = r.source_orders?.source_customer_id;
      const merchantCustomerId = r.merchant_customer_id;
      const add = (map: Map<string, { total: number; open: number }>, key: string) => {
        const agg = map.get(key) ?? { total: 0, open: 0 };
        agg.total += 1;
        if ((ACTIVE_CLAIM_STATUSES as readonly string[]).includes(r.status)) agg.open += 1;
        map.set(key, agg);
      };
      // A canonical claim is authoritative; legacy source-customer claims are
      // retained as a fallback for rows not yet linked by the migration.
      if (merchantCustomerId) add(caseAggByMerchantCustomer, merchantCustomerId);
      else if (customerId) add(caseAggByCustomer, customerId);
    }
  } catch {
    // Case counts degrade to zero — the directory still renders.
  }

  // One merchant-wide order projection supplies both full-directory KPIs and
  // page rows. This avoids trusting source_customers.orders_count, which may be
  // stale or absent even when canonical source_orders exist.
  const scannedCustomerIds = new Set(scanned.map((customer) => customer.id));
  const scannedMerchantCustomerIds = new Set(
    scanned.flatMap((customer) => customer.merchant_customer_id ? [customer.merchant_customer_id] : []),
  );
  const ordersByCustomer = new Map<
    string,
    { count: number; last: string | null; totals: Map<string, number> }
  >();
  const ordersByMerchantCustomer = new Map<
    string,
    { count: number; last: string | null; totals: Map<string, number> }
  >();
  try {
    const { data: orderRows } = (await svc
      .from("source_orders")
      .select("id, source_customer_id, merchant_customer_id, placed_at, total_price, currency")
      .eq("merchant_id", ctx.merchantId)
      .limit(10000)) as unknown as { data: OrderAggRow[] | null };

    for (const order of orderRows ?? []) {
      const add = (
        map: Map<string, { count: number; last: string | null; totals: Map<string, number> }>,
        key: string,
      ) => {
        const aggregate = map.get(key) ?? {
          count: 0,
          last: null,
          totals: new Map<string, number>(),
        };
        aggregate.count += 1;
        if (order.placed_at && (!aggregate.last || order.placed_at > aggregate.last)) {
          aggregate.last = order.placed_at;
        }
        const currency = order.currency?.trim().toUpperCase();
        const amount = Number(order.total_price);
        if (currency && Number.isFinite(amount)) {
          aggregate.totals.set(currency, (aggregate.totals.get(currency) ?? 0) + amount);
        }
        map.set(key, aggregate);
      };
      if (order.merchant_customer_id && scannedMerchantCustomerIds.has(order.merchant_customer_id)) {
        add(ordersByMerchantCustomer, order.merchant_customer_id);
      } else if (order.source_customer_id && scannedCustomerIds.has(order.source_customer_id)) {
        // Legacy/unlinked rows are still visible under their source customer.
        add(ordersByCustomer, order.source_customer_id);
      }
    }
  } catch {
    // Directory still renders with explicit unavailable values.
  }

  // Group-level meta for sorting + KPI aggregation.
  type GroupMeta = {
    group: CustomerGroup;
    ordersCountSum: number;
    caseTotal: number;
    caseOpen: number;
    name: string;
    lastSeen: string;
  };
  const metas: GroupMeta[] = [];
  for (const g of groups) {
    const lastSeen =
      uniqueNonEmptyStrings(g.members.map((m) => m.updated_at))
        .sort()
        .slice(-1)[0] ?? g.members[0].updated_at;
    let caseTotal = 0;
    let caseOpen = 0;
    const merchantCustomerId = g.members.find((m) => m.merchant_customer_id)?.merchant_customer_id ?? null;
    const canonicalCases = merchantCustomerId ? caseAggByMerchantCustomer.get(merchantCustomerId) : null;
    if (canonicalCases) {
      caseTotal += canonicalCases.total;
      caseOpen += canonicalCases.open;
    }
    for (const m of g.members) {
      const agg = caseAggByCustomer.get(m.id);
      if (agg) {
        caseTotal += agg.total;
        caseOpen += agg.open;
      }
    }
    const name =
      g.members.map(fullName).find((n) => n.length > 0) ??
      g.members
        .map((m) => m.email?.trim())
        .find((e): e is string => Boolean(e)) ??
      "";
    const meta = {
      group: g,
      ordersCountSum: g.members.reduce((sum, member) => {
        const actual = ordersByCustomer.get(member.id)?.count;
        return sum + (actual ?? member.orders_count ?? 0);
      }, ordersByMerchantCustomer.get(merchantCustomerId ?? "")?.count ?? 0),
      caseTotal,
      caseOpen,
      name,
      lastSeen,
    };
    if (meta.ordersCountSum > 0 || meta.caseTotal > 0) metas.push(meta);
  }

  switch (sort) {
    case "orders":
      metas.sort(
        (a, b) =>
          b.ordersCountSum - a.ordersCountSum ||
          b.lastSeen.localeCompare(a.lastSeen),
      );
      break;
    case "cases":
      metas.sort(
        (a, b) =>
          b.caseTotal - a.caseTotal || b.lastSeen.localeCompare(a.lastSeen),
      );
      break;
    case "name":
      metas.sort(
        (a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) ||
          b.lastSeen.localeCompare(a.lastSeen),
      );
      break;
    case "recent":
    default:
      metas.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  }

  // KPI strip — computed over the full filtered (pre-pagination) set.
  const kpiTotalCustomers = metas.length;
  const kpiOpenCaseCustomers = metas.filter((m) => m.caseOpen > 0).length;
  const kpiPastCaseCustomers = metas.filter((m) => m.caseTotal > 0).length;
  const kpiTotalOrders = metas.reduce((s, m) => s + m.ordersCountSum, 0);

  const total = metas.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageMetas = metas.slice(offset, offset + PAGE_SIZE);

  // -------------------------------------------------------------------------
  // Per-page aggregates: own-store orders across each group's records.
  // -------------------------------------------------------------------------
  const rows = pageMetas.map((m) => {
    const members = m.group.members;
    const merchantCustomerId = members.find((member) => member.merchant_customer_id)?.merchant_customer_id ?? null;
    const canonicalOrders = merchantCustomerId ? ordersByMerchantCustomer.get(merchantCustomerId) : null;
    let totalOrders = canonicalOrders?.count ?? 0;
    let lastOrderAt: string | null = canonicalOrders?.last ?? null;
    const totalsByCurrency = new Map<string, number>();
    for (const [currency, amount] of canonicalOrders?.totals ?? []) {
      totalsByCurrency.set(currency, amount);
    }
    // Representative record = the one with the most own-store orders (the face
    // of the merged row; its id drives the profile link).
    let representative = members[0];
    let repOrderCount = -1;
    for (const c of members) {
      const orders = ordersByCustomer.get(c.id);
      const orderCount = orders?.count ?? (merchantCustomerId ? 0 : c.orders_count ?? 0);
      totalOrders += orderCount;
      for (const [currency, amount] of orders?.totals ?? []) {
        totalsByCurrency.set(
          currency,
          (totalsByCurrency.get(currency) ?? 0) + amount,
        );
      }
      if (orders?.last && (!lastOrderAt || orders.last > lastOrderAt))
        lastOrderAt = orders.last;
      if (orderCount > repOrderCount) {
        repOrderCount = orderCount;
        representative = c;
      }
    }
    const linkedNames = uniqueNonEmptyStrings(members.map(fullName));
    const singleCurrencyTotal =
      totalsByCurrency.size === 1 ? [...totalsByCurrency.entries()][0] : null;
    return {
      id: merchantCustomerId ?? representative.id,
      primary_email: representative.email,
      names:
        linkedNames.length > 0 ? linkedNames : displayNames(representative),
      total_orders: totalOrders,
      total_spent: singleCurrencyTotal?.[1] ?? 0,
      total_spent_currency: singleCurrencyTotal?.[0] ?? null,
      has_mixed_currency: totalsByCurrency.size > 1,
      payout_cases_total: m.caseTotal,
      payout_cases_open: m.caseOpen,
      last_order_at: lastOrderAt,
    };
  });

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);
  const noFilters = !q && !hasRefunds && !hasChargebacks && !openClaimsOnly;

  const { primary: primaryAction } = resolveCustomerActions(
    setupState,
    connectionState,
  );

  return (
    <CustomersOverviewPageView
      connectionState={connectionState}
      setupState={setupState}
      hasData={dataPresence.hasCustomerProfiles}
      pageActions={{
        primary: primaryAction,
        subtitle: "Order, claim, and payout history for every customer.",
      }}
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
      hasRefunds={hasRefunds}
      hasChargebacks={hasChargebacks}
      openClaimsOnly={openClaimsOnly}
      kpis={{
        totalCustomers: kpiTotalCustomers,
        openCaseCustomers: kpiOpenCaseCustomers,
        pastCaseCustomers: kpiPastCaseCustomers,
        totalOrders: kpiTotalOrders,
      }}
    />
  );
}
