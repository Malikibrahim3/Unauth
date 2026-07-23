import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createScopedClient } from '@/lib/supabase/scoped';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { enforceEntitlement } from '@/lib/product/requireEntitlement';
import { logAction } from '@/lib/permissions/audit';
import { buildBehavioralNarrative } from '@/lib/customers/narrative';
import { withRequestLogging } from '@/lib/log';
import {
  buildCustomerIdentifierHashes,
  lookupNetworkIdentity,
  resolveIdentitySiblingCustomers,
} from '@/lib/customers/identityNetwork';
import {
  loadMerchantCustomerHistory,
  resolveMerchantCustomerId,
} from '@/lib/customers/merchantCustomerHistory';

export const dynamic = 'force-dynamic';

function uniqueValues(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.flatMap((value) => {
    const v = value?.trim();
    return v ? [v] : [];
  })));
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IdentityTimelineEntry {
  date: string;
  field: 'email' | 'name' | 'address' | 'ip' | 'card_last4';
  value: string;
  isVariant: boolean; // different from the first-ever value seen for this field
}

export interface OrderHistoryEntry {
  /** source_orders.id — used for evidence package generation */
  transactionId: string;
  orderId: string;
  orderDate: string | null;
  processedAt: string;
  email: string | null;
  /** Alias email this order came from, when it belongs to a linked sibling record (not the primary). */
  viaEmail?: string | null;
  name: string | null;
  address: string | null;
  ip: string | null;
  cardLast4: string | null;
  orderValue: number | null;
  fraudScore: number;
  riskLevel: string;
  fraudFlags: string[];
  // Refund / claim fields
  refundStatus: string | null;
  refundRequested: boolean;
  refundReason: string | null;
  refundDate: string | null;
  refundAmount: number | null;
  returnRequested: boolean;
  // Chargeback fields
  chargebackFiled: boolean;
  chargebackDate: string | null;
  chargebackReasonCode: string | null;
}

export interface LinkedAccount {
  entityType: string;
  entityValue: string;
  confidence: number;
  matchReasons: string[];
}

export interface CustomerIntelligencePanel {
  profile: {
    id: string;
    primary_email: string | null;
    emails: string[];
    names: string[];
    addresses: string[];
    ips: string[];
    card_last4s: string[];
    phones: string[];
    risk_score: number;
    risk_level: string;
    fraud_flags: string[];
    total_orders: number;
    commerce_total_value?: number;
    commerce_order_source?: string;
    total_refund_claims: number;
    total_chargebacks: number;
    total_merchants_seen_at: number;
    /** Count of OTHER linked source_customers records collapsed into this identity (0 if none). */
    sibling_count?: number;
    /** Distinct emails across the linked records (incl. primary). */
    linked_customer_emails?: string[];
    refund_requests_365d: number;
    completed_refunds_365d: number;
    completed_refund_amounts_by_currency: Record<string, number>;
    possible_match_count: number;
    refund_rate: number;
    fastest_claim_days: number | null;
    avg_claim_days: number | null;
    refund_acceleration_score: number;
    first_seen: string;
    last_seen: string;
    profile_confidence: number;
    manually_reviewed: boolean;
    /** @deprecated Always false — customer watchlists retired. */
    on_watchlist: boolean;
    /** @deprecated Always null — customer watchlists retired. */
    watchlist_entry_id: string | null;
  };
  orderHistory: OrderHistoryEntry[];
  identityTimeline: IdentityTimelineEntry[];
  linkedAccounts: LinkedAccount[];
  narrative: string;
}

type SourceCustomerRow = {
  id: string;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  other_emails: unknown;
  orders_count: number | null;
  account_created_at: string | null;
  created_at: string;
  updated_at: string;
  merchant_customer_id?: string | null;
};

type SourceOrderRow = {
  id: string;
  external_id: string;
  order_number: string | null;
  source_customer_id: string | null;
  email: string | null;
  phone: string | null;
  total_price: number | string | null;
  card_last4: string | null;
  browser_ip: string | null;
  placed_at: string | null;
  shipping_address_id: string | null;
};

type ClaimRow = {
  id: string;
  claim_type: string;
  status: string;
  source_order_id: string | null;
  reason_normalized: string | null;
  reason_raw: string | null;
  amount_at_risk: number | string | null;
  submitted_at: string | null;
};

// ---------------------------------------------------------------------------
// GET /api/customers/[id]
// ---------------------------------------------------------------------------

async function GETHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_CUSTOMERS);
  if (denied) return denied;

  const gated = await enforceEntitlement(serviceClient, ctx.merchantId, 'CUSTOMER_DOSSIER');
  if (gated) return gated;

  const customerId = resolvedParams.id;
  const scopedServiceClient = createScopedClient(ctx.merchantId, serviceClient);

  // -------------------------------------------------------------------------
  // 1. The merchant's OWN customer record (layer 1, merchant-scoped).
  // -------------------------------------------------------------------------
  const { data: initialCustomer } = await serviceClient
    .from('source_customers')
    .select('id, email, phone, first_name, last_name, other_emails, orders_count, account_created_at, created_at, updated_at, merchant_customer_id')
    .eq('id', customerId)
    .eq('merchant_id', ctx.merchantId)
    .maybeSingle() as unknown as { data: SourceCustomerRow | null };

  let customer = initialCustomer as SourceCustomerRow | null;
  if (!customer) {
    const { data: canonicalCustomer } = await scopedServiceClient
      .from('merchant_customers')
      .select('id, display_name, email, created_at, updated_at')
      .eq('merchant_id', ctx.merchantId)
      .eq('id', customerId)
      .maybeSingle() as unknown as {
        data: { id: string; display_name: string | null; email: string | null; created_at: string; updated_at: string } | null;
      };
    if (canonicalCustomer) {
      const nameParts = (canonicalCustomer.display_name ?? '').trim().split(/\s+/).filter(Boolean);
      customer = {
        id: canonicalCustomer.id,
        email: canonicalCustomer.email,
        phone: null,
        first_name: nameParts[0] ?? null,
        last_name: nameParts.slice(1).join(' ') || null,
        other_emails: [],
        orders_count: null,
        account_created_at: canonicalCustomer.created_at,
        created_at: canonicalCustomer.created_at,
        updated_at: canonicalCustomer.updated_at,
        merchant_customer_id: canonicalCustomer.id,
      };
    }
  }
  if (!customer) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const merchantCustomerId =
    (await resolveMerchantCustomerId(serviceClient, ctx.merchantId, customerId)) ??
    customer.merchant_customer_id ??
    null;
  const merchantHistory = await loadMerchantCustomerHistory(serviceClient, ctx.merchantId, customerId);

  // -------------------------------------------------------------------------
  // 1b. Sibling records: other source_customers the network identity links to
  //     this one (same merchant, own-signal disciplined). Orders/claims below
  //     are aggregated across all of them so the dossier reflects the whole
  //     resolved identity, not just the record that was clicked.
  // -------------------------------------------------------------------------
  let identityCustomerIds: string[] = [customer.id];
  let siblings: Array<{ id: string; email: string | null; name: string | null; ordersCount: number | null }> = [];
  if (merchantCustomerId) {
    const { data: canonicalSiblings } = await serviceClient
      .from('source_customers')
      .select('id, email, first_name, last_name, orders_count')
      .eq('merchant_id', ctx.merchantId)
      .eq('merchant_customer_id', merchantCustomerId);
    siblings = (canonicalSiblings ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      email: (row.email as string | null) ?? null,
      name: [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || null,
      ordersCount: row.orders_count == null ? null : Number(row.orders_count),
    }));
    identityCustomerIds = siblings.length ? siblings.map((s) => s.id) : [customer.id];
  } else {
    const siblingResolution = await resolveIdentitySiblingCustomers(serviceClient, ctx.merchantId, customer);
    identityCustomerIds = siblingResolution.customerIds;
    siblings = siblingResolution.siblings;
  }
  const siblingById = new Map(siblings.map((s) => [s.id, s]));
  const siblingCount = Math.max(identityCustomerIds.length - 1, 0);

  // -------------------------------------------------------------------------
  // 2. Own-store orders + claims (layers 1 and 4), across all linked records.
  // -------------------------------------------------------------------------
  let orders: SourceOrderRow[] = [];
  if (merchantCustomerId) {
    const { data: canonicalOrders, error: canonicalOrderError } = await serviceClient
      .from('source_orders')
      .select('id, external_id, order_number, source_customer_id, merchant_customer_id, email, phone, total_price, card_last4, browser_ip, placed_at, shipping_address_id')
      .eq('merchant_id', ctx.merchantId)
      .eq('merchant_customer_id', merchantCustomerId)
      .order('placed_at', { ascending: true })
      .limit(2000) as unknown as { data: SourceOrderRow[] | null; error?: { message: string } | null };
    orders = canonicalOrders ?? [];
    if (canonicalOrderError) {
      const { data: fallbackOrders } = await serviceClient
        .from('source_orders')
        .select('id, external_id, order_number, source_customer_id, email, phone, total_price, card_last4, browser_ip, placed_at, shipping_address_id')
        .eq('merchant_id', ctx.merchantId)
        .in('source_customer_id', identityCustomerIds)
        .order('placed_at', { ascending: true })
        .limit(2000) as unknown as { data: SourceOrderRow[] | null };
      orders = fallbackOrders ?? [];
    }
  } else {
    const { data: orderRows } = await serviceClient
      .from('source_orders')
      .select('id, external_id, order_number, source_customer_id, email, phone, total_price, card_last4, browser_ip, placed_at, shipping_address_id')
      .eq('merchant_id', ctx.merchantId)
      .in('source_customer_id', identityCustomerIds)
      .order('placed_at', { ascending: true })
      .limit(2000) as unknown as { data: SourceOrderRow[] | null };
    orders = orderRows ?? [];
  }

  const addressIds = uniqueValues(orders.map((o) => o.shipping_address_id));
  const addressById = new Map<string, string>();
  if (addressIds.length > 0) {
    const { data: addressRows } = await serviceClient
      .from('source_addresses')
      .select('id, line1, line2, city, region, postal_code, country')
      .eq('merchant_id', ctx.merchantId)
      .in('id', addressIds) as unknown as {
        data: Array<{
          id: string;
          line1: string | null;
          line2: string | null;
          city: string | null;
          region: string | null;
          postal_code: string | null;
          country: string | null;
        }> | null;
      };
    for (const row of addressRows ?? []) {
      const formatted = [row.line1, row.line2, row.city, row.region, row.postal_code, row.country]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(', ');
      if (formatted) addressById.set(row.id, formatted);
    }
  }

  const orderIds = orders.map((o) => o.id);
  let claims: ClaimRow[] = [];
  if (orderIds.length > 0) {
    const { data: claimRows } = await serviceClient
      .from(TABLES.MERCHANT_CLAIMS)
      .select('id, claim_type, status, source_order_id, reason_normalized, reason_raw, amount_at_risk, submitted_at')
      .eq('merchant_id', ctx.merchantId)
      .in('source_order_id', orderIds)
      .limit(500) as unknown as { data: ClaimRow[] | null };
    claims = claimRows ?? [];
  }
  if (merchantCustomerId) {
    const { data: canonicalClaimRows } = await serviceClient
      .from(TABLES.MERCHANT_CLAIMS)
      .select('id, claim_type, status, source_order_id, reason_normalized, reason_raw, amount_at_risk, submitted_at')
      .eq('merchant_id', ctx.merchantId)
      .eq('merchant_customer_id', merchantCustomerId)
      .order('submitted_at', { ascending: false })
      .limit(500) as unknown as { data: ClaimRow[] | null };
    const byId = new Map(claims.map((claim) => [claim.id, claim]));
    for (const claim of canonicalClaimRows ?? []) byId.set(claim.id, claim);
    claims = [...byId.values()];
  }
  const claimsByOrder = new Map<string, ClaimRow[]>();
  for (const claim of claims) {
    if (!claim.source_order_id) continue;
    const list = claimsByOrder.get(claim.source_order_id) ?? [];
    list.push(claim);
    claimsByOrder.set(claim.source_order_id, list);
  }

  // -------------------------------------------------------------------------
  // 3. Network identity via the k-anonymous RPC (layers 3/5; service-role-only
  //    tables are never read directly here).
  // -------------------------------------------------------------------------
  const network = await lookupNetworkIdentity(
    serviceClient,
    ctx.merchantId,
    buildCustomerIdentifierHashes(customer),
  );

  // -------------------------------------------------------------------------
  // 4. Build order history
  // -------------------------------------------------------------------------
  const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim() || null;
  const orderHistory: OrderHistoryEntry[] = orders.map((order) => {
    const orderClaims = claimsByOrder.get(order.id) ?? [];
    const chargeback = orderClaims.find((c) => c.claim_type === 'chargeback') ?? null;
    const refundClaim = orderClaims.find((c) => c.claim_type !== 'chargeback') ?? null;
    const viaCustomerId = order.source_customer_id;
    const isSibling = viaCustomerId != null && viaCustomerId !== customer.id;
    const viaEmail = isSibling ? (siblingById.get(viaCustomerId)?.email ?? order.email ?? null) : null;
    return {
      transactionId: order.id,
      orderId: order.order_number ?? order.external_id,
      orderDate: order.placed_at,
      processedAt: order.placed_at ?? customer.created_at,
      email: order.email ?? customer.email,
      viaEmail,
      name: customerName,
      address: order.shipping_address_id ? addressById.get(order.shipping_address_id) ?? null : null,
      ip: order.browser_ip,
      cardLast4: order.card_last4,
      orderValue: order.total_price == null ? null : Number(order.total_price),
      fraudScore: 0,
      // Identity confidence grade applies at identity level in v2, not per order.
      riskLevel: 'none',
      fraudFlags: [],
      refundStatus: refundClaim?.status ?? null,
      refundRequested: Boolean(refundClaim),
      refundReason: refundClaim?.reason_normalized ?? refundClaim?.reason_raw ?? null,
      refundDate: refundClaim?.submitted_at ?? null,
      refundAmount: refundClaim?.amount_at_risk == null ? null : Number(refundClaim.amount_at_risk),
      returnRequested: orderClaims.some((c) => c.claim_type === 'return_abuse'),
      chargebackFiled: Boolean(chargeback),
      chargebackDate: chargeback?.submitted_at ?? null,
      chargebackReasonCode: chargeback?.reason_normalized ?? null,
    };
  });

  // -------------------------------------------------------------------------
  // 5. Build identity timeline — derive first-seen value per field, mark variants
  // -------------------------------------------------------------------------
  const identityTimeline: IdentityTimelineEntry[] = [];
  const firstSeenByField: Record<string, string> = {};

  function addEntry(
    date: string,
    field: IdentityTimelineEntry['field'],
    value: string | null | undefined
  ) {
    const v = (value ?? '').trim();
    if (!v) return;
    if (!(field in firstSeenByField)) {
      firstSeenByField[field] = v;
      identityTimeline.push({ date, field, value: v, isVariant: false });
    } else if (firstSeenByField[field] !== v) {
      const alreadyAdded = identityTimeline.some((e) => e.field === field && e.value === v);
      if (!alreadyAdded) {
        identityTimeline.push({ date, field, value: v, isVariant: true });
      }
    }
  }

  for (const order of orderHistory) {
    addEntry(order.processedAt, 'email', order.email);
    addEntry(order.processedAt, 'name', order.name);
    addEntry(order.processedAt, 'address', order.address);
    addEntry(order.processedAt, 'ip', order.ip);
    addEntry(order.processedAt, 'card_last4', order.cardLast4);
  }

  identityTimeline.sort((a, b) => a.date.localeCompare(b.date));

  // -------------------------------------------------------------------------
  // 6. Linked-identity signals from the merchant's own records only.
  //    Cross-merchant data is confined to the k-anonymous rollup above.
  // -------------------------------------------------------------------------
  const linkedAccounts: LinkedAccount[] = [];
  const variantsByField = new Map<string, Set<string>>();
  for (const entry of identityTimeline) {
    if (!variantsByField.has(entry.field)) {
      variantsByField.set(entry.field, new Set());
    }
    variantsByField.get(entry.field)!.add(entry.value);
  }

  for (const [field, values] of variantsByField.entries()) {
    if (values.size > 1) {
      linkedAccounts.push({
        entityType: field,
        entityValue: `${values.size} distinct values observed`,
        confidence: 0.7,
        matchReasons: ['identity_variant_within_merchant_scope'],
      });
    }
  }

  // -------------------------------------------------------------------------
  // 7. Aggregate stats — own store first, network rollup where disclosed.
  // -------------------------------------------------------------------------
  const totalOrderValue = orders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
  const siblingOrdersCountSum = siblings.reduce((sum, s) => sum + (s.ordersCount ?? 0), 0);
  const computedTotalOrders = Math.max(orders.length, siblingOrdersCountSum, customer.orders_count ?? 0);
  const linkedCustomerEmails = uniqueValues([customer.email, ...siblings.map((s) => s.email)]);
  const computedRefundClaims = claims.filter((c) => c.claim_type !== 'chargeback').length;
  const computedChargebacks = claims.filter((c) => c.claim_type === 'chargeback').length;
  const computedRefundRate = computedTotalOrders > 0 ? claims.length / computedTotalOrders : 0;
  const processedAts = orderHistory.flatMap((o) => (o.processedAt ? [o.processedAt] : []));
  const computedFirstSeen = processedAts.length > 0
    ? processedAts.reduce((min, t) => (t < min ? t : min))
    : customer.account_created_at ?? customer.created_at;
  const computedLastSeen = processedAts.length > 0
    ? processedAts.reduce((max, t) => (t > max ? t : max))
    : customer.updated_at;

  // -------------------------------------------------------------------------
  // 8. Build behavioral narrative
  // -------------------------------------------------------------------------
  const narrative = buildBehavioralNarrative({
    totalOrders: computedTotalOrders,
    totalRefundClaims: computedRefundClaims,
    refundRate: computedRefundRate,
    fastestClaimDays: network?.fastestClaimDays ?? null,
    avgClaimDays: null,
    refundAccelerationScore: 0,
    firstSeen: computedFirstSeen,
    lastSeen: computedLastSeen,
    fraudFlags: [],
    linkedAccountCount: linkedAccounts.length,
  });

  // -------------------------------------------------------------------------
  // 9. Compose response
  // -------------------------------------------------------------------------
  const panel: CustomerIntelligencePanel = {
    profile: {
      id: customer.id,
      primary_email: customer.email,
      emails: uniqueValues([customer.email, ...orderHistory.map((o) => o.email)]),
      names: customerName ? [customerName] : [],
      addresses: uniqueValues(orderHistory.map((o) => o.address)),
      ips: uniqueValues(orderHistory.map((o) => o.ip)),
      card_last4s: uniqueValues(orderHistory.map((o) => o.cardLast4)),
      phones: uniqueValues([customer.phone, ...orders.map((o) => o.phone)]),
      risk_score: network?.confidenceScore ?? 0,
      // Identity confidence grade (displayed as confidence, never a verdict).
      risk_level: network?.confidenceGrade ?? 'none',
      fraud_flags: [],
      total_orders: computedTotalOrders,
      commerce_total_value: totalOrderValue,
      commerce_order_source: orders.length > 0 ? 'source_orders' : 'none',
      total_refund_claims: computedRefundClaims,
      total_chargebacks: computedChargebacks,
      total_merchants_seen_at: Math.max(network?.merchantCount ?? 1, 1),
      sibling_count: siblingCount,
      linked_customer_emails: linkedCustomerEmails,
      refund_requests_365d: merchantHistory.refundRequests365d,
      completed_refunds_365d: merchantHistory.completedRefunds365d,
      completed_refund_amounts_by_currency: merchantHistory.completedRefundAmountByCurrency,
      possible_match_count: merchantHistory.possibleMatches.length,
      refund_rate: computedRefundRate,
      fastest_claim_days: network?.fastestClaimDays ?? null,
      avg_claim_days: null,
      refund_acceleration_score: 0,
      first_seen: computedFirstSeen,
      last_seen: computedLastSeen,
      profile_confidence: network?.confidenceScore ?? 0,
      manually_reviewed: false,
      on_watchlist: false,
      watchlist_entry_id: null,
    },
    orderHistory,
    identityTimeline,
    linkedAccounts,
    narrative,
  };

  await logAction({
    ctx,
    action: 'view_customer',
    resourceType: 'source_customer',
    resourceId: customerId,
    ip,
  });

  return NextResponse.json(panel);
}

export const GET = withRequestLogging('/api/customers/[id]', GETHandler);
