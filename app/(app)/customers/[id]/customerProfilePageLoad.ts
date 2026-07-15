import { notFound, redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { TABLES } from "@/lib/supabase/tables";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { buildBehavioralNarrative } from "@/lib/customers/narrative";
import type { CustomerIntelligencePanel } from "@/app/api/customers/[id]/route";
import { ACTIVE_CLAIM_STATUSES } from "@/lib/claims/sla";
import {
  parseAndVerifySignedToken,
  hashSignedToken,
} from "@/lib/api/signedAccess";
import { getConnectionState } from "@/lib/connections/getConnectionState";
import type { ConnectionState } from "@/lib/connections/getConnectionState";
import {
  type RoadmapTransaction,
} from "@/app/(app)/customers/[id]/customerProfilePageLabels";
import {
  resolveIdentitySiblingCustomers,
  resolveRepresentativeCustomerIdForIdentity,
} from "@/lib/customers/identityNetwork";
import { merchantHasEntitlement } from "@/lib/product/requireEntitlement";
import { dominantCurrency } from "@/lib/utils/format";

export type CustomerProfileSearchParams = {
  view_token?: string;
  source?: string;
  ticket_id?: string;
};

export type CustomerProfilePageParams = { id: string };

export type CustomerProfileBlockedReason = "link_expired" | "access_denied";

type LoadBlockResult = { blocked: true; reason: CustomerProfileBlockedReason };
type LoadSuccessResult = {
  blocked: false;
  props: CustomerProfilePageViewProps;
};

export type CustomerProfileLoadResult = LoadBlockResult | LoadSuccessResult;

export type CustomerProfileDisplay = {
  id: string;
  names: string[];
  emails: string[];
  addresses: string[];
  card_last4s: string[];
  phones: string[];
  ips: string[];
  primary_email: string | null;
  first_seen: string;
  last_seen: string;
  fraud_flags: string[];
  identity_signals?: string[];
  investigation_status?: string;
  /** Count of OTHER linked source_customers records collapsed into this identity (0 if none). */
  sibling_count?: number;
};

export type LinkedAccountRow = {
  entityType: string;
  entityValue: string;
  confidence: number;
};

export type ClaimSummaryRow = {
  id: string;
  claim_type: string;
  status: string;
  shopify_order_id?: string | null;
  order_ref?: string | null;
  submitted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ActivityLogEntry = {
  id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  created_at: string;
};

export type CustomerProfilePageViewProps = {
  connectionState: ConnectionState;
  viewToken: string;
  gorgiasSource: string | null;
  gorgiasTicketId: string | null;
  profile: CustomerProfileDisplay;
  displayName: string;
  hasCleanRecord: boolean;
  merchantClaimCount: number;
  merchantChargebackCount: number;
  merchantOrderCount: number;
  localClaimRatePct: number;
  totalOrderValue: number;
  totalRefundedValue: number;
  displayCurrency: string;
  transactions: RoadmapTransaction[];
  identityTimeline: CustomerIntelligencePanel["identityTimeline"];
  variantCount: number;
  merchantNarrative: string;
  linkedAccounts: LinkedAccountRow[];
  activityLog: ActivityLogEntry[];
  openClaimCount: number;
  latestClaim: ClaimSummaryRow | null;
  merchantRefundRate: number;
};

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
};

type SourceOrderRow = {
  id: string;
  external_id: string;
  order_number: string | null;
  source_customer_id: string | null;
  email: string | null;
  phone: string | null;
  total_price: number | string | null;
  currency: string | null;
  card_last4: string | null;
  browser_ip: string | null;
  source: string | null;
  placed_at: string | null;
  shipping_address_id: string | null;
};

type SourceAddressRow = {
  id: string;
  line1: string | null;
  line2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
};

type ClaimRow = {
  id: string;
  claim_type: string;
  status: string;
  source_order_id: string | null;
  reason_normalized: string | null;
  reason_raw: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values.map((v) => v?.trim()).filter((v): v is string => Boolean(v)),
    ),
  );
}

function formatAddress(row: SourceAddressRow): string {
  return [
    row.line1,
    row.line2,
    row.city,
    row.region,
    row.postal_code,
    row.country,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

export async function loadCustomerProfilePage(
  profileId: string,
  searchParams: CustomerProfileSearchParams,
): Promise<CustomerProfileLoadResult> {
  const viewToken = searchParams.view_token?.trim() ?? "";
  const gorgiasSource =
    searchParams.source?.trim() === "gorgias" ? "gorgias" : null;
  const gorgiasTicketId = searchParams.ticket_id?.trim() || null;

  const svc = createServiceClient();
  let merchantId = "";

  if (viewToken) {
    const parsed = parseAndVerifySignedToken(viewToken);
    if (
      !parsed ||
      parsed.profile_id !== profileId ||
      new Date(parsed.expires_at).getTime() <= Date.now()
    ) {
      return { blocked: true, reason: "link_expired" };
    }

    const tokenHash = hashSignedToken(viewToken);
    const { data: tokenRow } = (await svc
      .from(TABLES.PROFILE_VIEW_TOKENS)
      .select("profile_id, merchant_id, expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle()) as unknown as {
      data: {
        profile_id: string;
        merchant_id: string;
        expires_at: string;
      } | null;
    };

    if (
      !tokenRow ||
      tokenRow.profile_id !== profileId ||
      new Date(tokenRow.expires_at).getTime() <= Date.now()
    ) {
      return { blocked: true, reason: "link_expired" };
    }

    merchantId = tokenRow.merchant_id;
  } else {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { denied, ctx } = await requirePermission(
      svc,
      user.id,
      PERMISSIONS.VIEW_CUSTOMERS,
    );
    if (denied) {
      return { blocked: true, reason: "access_denied" };
    }

    merchantId = ctx.merchantId;
  }

  if (!(await merchantHasEntitlement(svc, merchantId, "CUSTOMER_DOSSIER"))) {
    redirect("/settings/billing?required=CUSTOMER_DOSSIER");
  }

  // ---------------------------------------------------------------------------
  // Layer 1 — accept the canonical merchant-customer id while retaining legacy
  // source-customer deep links during the additive migration.
  // ---------------------------------------------------------------------------
  const [connectionState, customerRes] = await Promise.all([
    getConnectionState(svc, merchantId),
    svc
      .from("source_customers")
      .select(
        "id, email, phone, first_name, last_name, other_emails, orders_count, account_created_at, created_at, updated_at",
      )
      .eq("merchant_id", merchantId)
      .or(`id.eq.${profileId},merchant_customer_id.eq.${profileId}`)
      .order("updated_at", { ascending: false })
      .maybeSingle() as unknown as Promise<{ data: SourceCustomerRow | null }>,
  ]);

  // Fall back to the pre-migration source id query. PostgREST rejects the
  // entire `.or(...)` expression when the additive merchant_customer_id column
  // has not been applied yet; a valid legacy deep link must still work.
  let customer = customerRes.data;
  if (!customer) {
    const fallback = (await svc
      .from("source_customers")
      .select(
        "id, email, phone, first_name, last_name, other_emails, orders_count, account_created_at, created_at, updated_at",
      )
      .eq("merchant_id", merchantId)
      .eq("id", profileId)
      .maybeSingle()) as unknown as { data: SourceCustomerRow | null };
    customer = fallback.data;
  }
  // Layer 1b — the id may be an identity_id (e.g. a claim's identity_id used
  // as a deep link target from the payout queue). Resolve it back to one of
  // its merchant-owned source_customers rows.
  if (!customer) {
    const representativeCustomerId = await resolveRepresentativeCustomerIdForIdentity(
      svc,
      merchantId,
      profileId,
    );
    if (representativeCustomerId) {
      const byIdentity = (await svc
        .from("source_customers")
        .select(
          "id, email, phone, first_name, last_name, other_emails, orders_count, account_created_at, created_at, updated_at",
        )
        .eq("merchant_id", merchantId)
        .eq("id", representativeCustomerId)
        .maybeSingle()) as unknown as { data: SourceCustomerRow | null };
      customer = byIdentity.data;
    }
  }
  if (!customer) {
    if (viewToken) {
      return { blocked: true, reason: "link_expired" };
    }
    notFound();
  }

  // Sibling records linked by the network identity (same merchant, own-signal
  // disciplined). Orders/claims are aggregated across all linked records so the
  // dossier reflects the whole resolved identity, not just the clicked record.
  const {
    identityId: resolvedIdentityId,
    customerIds: identityCustomerIds,
    siblings,
  } = await resolveIdentitySiblingCustomers(svc, merchantId, customer);
  const siblingById = new Map(siblings.map((s) => [s.id, s]));
  const siblingCount = Math.max(identityCustomerIds.length - 1, 0);

  // Own-store orders (layer 1), across all linked records.
  const { data: orderRows } = (await svc
    .from("source_orders")
    .select(
      "id, external_id, order_number, source_customer_id, email, phone, total_price, currency, card_last4, browser_ip, source, placed_at, shipping_address_id",
    )
    .eq("merchant_id", merchantId)
    .in("source_customer_id", identityCustomerIds)
    .order("placed_at", { ascending: true })
    .limit(2000)) as unknown as { data: SourceOrderRow[] | null };
  const orders = orderRows ?? [];

  // Shipping addresses for the orders (atomic in v2; render as one string).
  const addressIds = uniqueNonEmpty(orders.map((o) => o.shipping_address_id));
  const addressById = new Map<string, string>();
  if (addressIds.length > 0) {
    const { data: addressRows } = (await svc
      .from("source_addresses")
      .select("id, line1, line2, city, region, postal_code, country")
      .eq("merchant_id", merchantId)
      .in("id", addressIds)) as unknown as { data: SourceAddressRow[] | null };
    for (const row of addressRows ?? []) {
      const formatted = formatAddress(row);
      if (formatted) addressById.set(row.id, formatted);
    }
  }

  // Own-store claims (layer 4, merchant-scoped, linked through orders).
  const orderIds = orders.map((o) => o.id);
  let claimRows: ClaimRow[] = [];
  if (orderIds.length > 0) {
    const { data } = (await svc
      .from(TABLES.MERCHANT_CLAIMS)
      .select(
        "id, claim_type, status, source_order_id, reason_normalized, reason_raw, submitted_at, created_at, updated_at",
      )
      .eq("merchant_id", merchantId)
      .in("source_order_id", orderIds)
      .order("updated_at", { ascending: false })
      .limit(200)) as unknown as { data: ClaimRow[] | null };
    claimRows = data ?? [];
  }

  const claimsByOrder = new Map<string, ClaimRow[]>();
  for (const claim of claimRows) {
    if (!claim.source_order_id) continue;
    const list = claimsByOrder.get(claim.source_order_id) ?? [];
    list.push(claim);
    claimsByOrder.set(claim.source_order_id, list);
  }

  const identityId = resolvedIdentityId;

  // Merchant-side state (watchlist / investigation status) for the identity.
  let investigationStatus: string | undefined;
  if (identityId) {
    const { data: stateRow } = (await svc
      .from("merchant_identity_state")
      .select("investigation_status")
      .eq("merchant_id", merchantId)
      .eq("identity_id", identityId)
      .maybeSingle()) as unknown as {
      data: { investigation_status: string } | null;
    };
    investigationStatus = stateRow?.investigation_status;
  }

  // ---------------------------------------------------------------------------
  // Display assembly from merchant-owned customer, order, and case records.
  // ---------------------------------------------------------------------------
  const customerName = [customer.first_name, customer.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const emails = uniqueNonEmpty([
    customer.email,
    ...orders.map((o) => o.email),
    ...toStringArray(customer.other_emails),
  ]);
  const phones = uniqueNonEmpty([
    customer.phone,
    ...orders.map((o) => o.phone),
  ]);
  const ips = uniqueNonEmpty(orders.map((o) => o.browser_ip));
  const cardLast4s = uniqueNonEmpty(orders.map((o) => o.card_last4));
  const addresses = uniqueNonEmpty(
    orders.map((o) =>
      o.shipping_address_id ? addressById.get(o.shipping_address_id) : null,
    ),
  );

  const siblingOrdersCountSum = siblings.reduce(
    (sum, s) => sum + (s.ordersCount ?? 0),
    0,
  );
  const merchantOrderCount = Math.max(
    orders.length,
    siblingOrdersCountSum,
    customer.orders_count ?? 0,
  );
  const merchantClaimCount = claimRows.length;
  const merchantChargebacks = claimRows.filter(
    (c) => c.claim_type === "chargeback",
  ).length;

  const placedAts = uniqueNonEmpty(orders.map((o) => o.placed_at)).sort();
  const firstSeenLocal =
    placedAts[0] ?? customer.account_created_at ?? customer.created_at;
  const lastSeenLocal = placedAts[placedAts.length - 1] ?? customer.updated_at;

  const profile: CustomerProfileDisplay = {
    id: customer.id,
    names: customerName ? [customerName] : [],
    emails,
    addresses,
    card_last4s: cardLast4s,
    phones,
    ips,
    primary_email: customer.email,
    sibling_count: siblingCount,
    first_seen: firstSeenLocal,
    last_seen: lastSeenLocal,
    fraud_flags: [],
    identity_signals: [],
    investigation_status: investigationStatus,
  };

  const transactions: RoadmapTransaction[] = orders.map((order) => {
    const orderClaims = claimsByOrder.get(order.id) ?? [];
    const chargeback =
      orderClaims.find((c) => c.claim_type === "chargeback") ?? null;
    const refundClaim =
      orderClaims.find((c) => c.claim_type !== "chargeback") ?? null;
    const viaCustomerId = order.source_customer_id;
    const viaEmail =
      viaCustomerId != null && viaCustomerId !== customer.id
        ? (siblingById.get(viaCustomerId)?.email ?? order.email ?? null)
        : null;
    return {
      source_order_id: order.id,
      order_id: order.order_number ?? order.external_id,
      processed_at: order.placed_at ?? customer.created_at,
      order_value: order.total_price,
      currency: order.currency,
      customer_email: order.email ?? customer.email,
      via_email: viaEmail,
      customer_name: customerName || null,
      shipping_address: order.shipping_address_id
        ? (addressById.get(order.shipping_address_id) ?? null)
        : null,
      card_last4: order.card_last4,
      device_ip: order.browser_ip,
      source: order.source,
      chargeback_filed: Boolean(chargeback),
      refund_claimed: Boolean(refundClaim),
      chargeback_date: chargeback?.submitted_at ?? null,
      chargeback_reason_code: chargeback?.reason_normalized ?? null,
      refund_reason:
        refundClaim?.reason_normalized ?? refundClaim?.reason_raw ?? null,
      fraud_flags: [],
      risk_level: null,
    };
  });

  type TimelineField = "email" | "name" | "address" | "ip" | "card_last4";
  const identityTimeline: CustomerIntelligencePanel["identityTimeline"] = [];
  const firstSeen: Record<string, string> = {};

  function addEntry(
    date: string,
    field: TimelineField,
    value: string | null | undefined,
  ) {
    const v = (value ?? "").trim();
    if (!v) return;
    if (!(field in firstSeen)) {
      firstSeen[field] = v;
      identityTimeline.push({ date, field, value: v, isVariant: false });
    } else if (firstSeen[field] !== v) {
      const alreadyAdded = identityTimeline.some(
        (e) => e.field === field && e.value === v,
      );
      if (!alreadyAdded) {
        identityTimeline.push({ date, field, value: v, isVariant: true });
      }
    }
  }

  for (const tx of transactions) {
    addEntry(tx.processed_at, "email", tx.customer_email);
    addEntry(tx.processed_at, "name", tx.customer_name);
    addEntry(tx.processed_at, "address", tx.shipping_address);
    addEntry(tx.processed_at, "ip", tx.device_ip);
    addEntry(tx.processed_at, "card_last4", tx.card_last4);
  }
  identityTimeline.sort((a, b) => a.date.localeCompare(b.date));

  const linkedAccounts: LinkedAccountRow[] = [];
  {
    const emailSet = new Set<string>();
    const cardSet = new Set<string>();
    const ipSet = new Set<string>();
    for (const tx of transactions) {
      if (tx.customer_email) emailSet.add(tx.customer_email);
      if (tx.card_last4) cardSet.add(tx.card_last4);
      if (tx.device_ip) ipSet.add(tx.device_ip);
    }
    if (emailSet.size > 1) {
      linkedAccounts.push({
        entityType: "email",
        entityValue: `${emailSet.size} email addresses observed`,
        confidence: Math.min(90, 40 + emailSet.size * 10),
      });
    }
    if (cardSet.size > 1) {
      linkedAccounts.push({
        entityType: "card",
        entityValue: `${cardSet.size} payment cards observed`,
        confidence: Math.min(85, 35 + cardSet.size * 10),
      });
    }
    if (ipSet.size > 1) {
      linkedAccounts.push({
        entityType: "ip",
        entityValue: `${ipSet.size} IP addresses observed`,
        confidence: Math.min(75, 25 + ipSet.size * 8),
      });
    }
  }

  const displayName =
    profile.names[0] ?? profile.primary_email ?? "Unknown Customer";
  const variantCount = identityTimeline.filter((e) => e.isVariant).length;

  // Activity log: derived from claim_events for this customer's claims
  // (replaces the legacy customer_activity_log table).
  let activityLog: ActivityLogEntry[] = [];
  if (claimRows.length > 0) {
    const { data: eventRows } = (await svc
      .from("claim_events")
      .select(
        "id, event_type, metadata, from_status, to_status, note, created_at",
      )
      .eq("merchant_id", merchantId)
      .in(
        "claim_id",
        claimRows.map((c) => c.id),
      )
      .order("created_at", { ascending: false })
      .limit(20)) as unknown as {
      data: Array<{
        id: string;
        event_type: string;
        metadata: Record<string, unknown> | null;
        from_status: string | null;
        to_status: string | null;
        note: string | null;
        created_at: string;
      }> | null;
    };
    activityLog = (eventRows ?? []).map((row) => ({
      id: row.id,
      event_type: row.event_type,
      event_data: {
        ...(row.metadata ?? {}),
        ...(row.from_status ? { from_status: row.from_status } : {}),
        ...(row.to_status ? { to_status: row.to_status } : {}),
        ...(row.note
          ? { note: row.note, note_preview: row.note.slice(0, 160) }
          : {}),
      },
      created_at: row.created_at,
    }));
  }

  const totalOrderValue = orders.reduce(
    (sum, order) => sum + (Number(order.total_price) || 0),
    0,
  );
  const totalRefundedValue = transactions
    .filter((tx) => tx.refund_claimed || tx.chargeback_filed)
    .reduce((sum, tx) => sum + (Number(tx.order_value) || 0), 0);
  const displayCurrency = dominantCurrency(orders, 'GBP');
  const merchantRefundRate =
    merchantOrderCount > 0
      ? Math.round((merchantClaimCount / merchantOrderCount) * 100)
      : 0;
  const hasCleanRecord =
    merchantClaimCount === 0 && merchantChargebacks === 0;

  const merchantNarrative = buildBehavioralNarrative({
    totalOrders: merchantOrderCount,
    totalRefundClaims: merchantClaimCount,
    refundRate: merchantOrderCount > 0
      ? merchantClaimCount / merchantOrderCount
      : 0,
    fastestClaimDays: null,
    avgClaimDays: null,
    refundAccelerationScore: 0,
    firstSeen: transactions[0]?.processed_at ?? profile.first_seen,
    lastSeen:
      transactions[transactions.length - 1]?.processed_at ?? profile.last_seen,
    fraudFlags: profile.identity_signals ?? profile.fraud_flags,
    linkedAccountCount: 0,
  });

  const claimSummaryRows: ClaimSummaryRow[] = claimRows
    .slice(0, 20)
    .map((claim) => {
      const order = claim.source_order_id
        ? orders.find((o) => o.id === claim.source_order_id)
        : undefined;
      return {
        id: claim.id,
        claim_type: claim.claim_type,
        status: claim.status,
        shopify_order_id: order?.external_id ?? null,
        order_ref: order?.order_number ?? null,
        submitted_at: claim.submitted_at,
        created_at: claim.created_at,
        updated_at: claim.updated_at,
      };
    });
  const openClaimCount = claimSummaryRows.filter((claim) =>
    ACTIVE_CLAIM_STATUSES.includes(
      claim.status as (typeof ACTIVE_CLAIM_STATUSES)[number],
    ),
  ).length;
  const latestClaim = claimSummaryRows[0] ?? null;
  const localClaimRatePct =
    merchantOrderCount > 0
      ? (merchantClaimCount / merchantOrderCount) * 100
      : 0;

  const props: CustomerProfilePageViewProps = {
    connectionState: connectionState as ConnectionState,
    viewToken,
    gorgiasSource,
    gorgiasTicketId,
    profile,
    displayName,
    hasCleanRecord,
    merchantClaimCount,
    merchantChargebackCount: merchantChargebacks,
    merchantOrderCount,
    localClaimRatePct,
    totalOrderValue,
    totalRefundedValue,
    displayCurrency,
    transactions,
    identityTimeline,
    variantCount,
    merchantNarrative,
    linkedAccounts,
    activityLog,
    openClaimCount,
    latestClaim,
    merchantRefundRate,
  };

  return { blocked: false, props };
}
