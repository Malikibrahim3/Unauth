import { notFound, redirect } from "next/navigation";
import { TABLES } from "@/lib/supabase/tables";
import { PERMISSIONS } from "@/lib/permissions";
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from "@/lib/auth/requestContext";
import { buildBehavioralNarrative } from "@/lib/customers/narrative";
import { riskLevelToNewGrade } from "@/lib/confidence";
import type { ConfidenceGradeValue } from "@/lib/confidence";
import type { CustomerIntelligencePanel } from "@/app/api/customers/[id]/route";
import { ACTIVE_CLAIM_STATUSES } from "@/lib/claims/sla";
import {
  parseAndVerifySignedToken,
  hashSignedToken,
} from "@/lib/api/signedAccess";
import { getCachedConnectionState } from "@/lib/connections/getConnectionState";
import type { ConnectionState } from "@/lib/connections/getConnectionState";
import {
  CLAIM_TYPE_LABELS,
  firstArrayValue,
  type RoadmapTransaction,
} from "@/app/(app)/customers/[id]/customerProfilePageLabels";
import {
  buildCustomerIdentifierHashes,
  lookupNetworkIdentity,
  resolveIdentitySiblingCustomers,
} from "@/lib/customers/identityNetwork";
import { getEventStream } from "@/lib/analysis/customerIntelligence";
import { normaliseAddress } from "@/lib/identity/normalise";
import type { BehaviorRoadmapEvent } from "@/components/customers/BehaviorRoadmap";
import type { EvidenceLevel, ScoreFactor } from "@/lib/engine/evidence/score";
import type { ConfidenceGrade } from "@/lib/engine/weights";
import { merchantHasEntitlement } from "@/lib/product/requireEntitlement";
import { dominantCurrency } from "@/lib/utils/format";
import {
  loadMerchantCustomerHistory,
  resolveMerchantCustomerId,
} from "@/lib/customers/merchantCustomerHistory";
import {
  deriveSourceLink,
  loadSourceLinkContext,
} from "@/lib/relationships/sourceLinking";

export type CustomerProfileSearchParams = {
  audit?: string;
  view_token?: string;
  buildEvidence?: string;
  disputedOrder?: string;
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
  risk_level: string;
  total_orders: number;
  total_refund_claims: number;
  total_chargebacks: number;
  total_merchants_seen_at: number;
  refund_rate: number;
  fastest_claim_days: number | null;
  avg_claim_days: number | null;
  refund_acceleration_score: number;
  first_seen: string;
  last_seen: string;
  fraud_flags: string[];
  identity_signals?: string[];
  investigation_status?: string;
  /** Count of OTHER linked source_customers records collapsed into this identity (0 if none). */
  sibling_count?: number;
  refund_requests_365d: number;
  completed_refunds_365d: number;
  completed_refund_amounts_by_currency: Record<string, number>;
  possible_match_count: number;
};

export type LinkedAccountRow = {
  entityType: string;
  entityValue: string;
  confidence: number;
};

export type IdentitySignalRow = {
  value: string;
  signalType: string;
  grade: string;
};

export type MerchantSignalPill = {
  merchantLabel: string;
  claimType: string;
};

/** Cached network evidence score for the customer profile badge (service-role fetch). */
export type CustomerEvidenceDisplay = {
  evidence_disclosed: boolean;
  evidence_score: number;
  evidence_level: EvidenceLevel;
  has_sufficient_data: boolean;
  score_breakdown: ScoreFactor[];
  confidence_grade: ConfidenceGrade | null;
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
  auditRunId: string | null;
  viewToken: string;
  gorgiasSource: string | null;
  gorgiasTicketId: string | null;
  profile: CustomerProfileDisplay;
  displayName: string;
  profileGrade: ConfidenceGradeValue;
  hasCleanRecord: boolean;
  merchantClaimCount: number;
  merchantChargebackCount: number;
  merchantOrderCount: number;
  localClaimRatePct: number;
  isEligibleForEvidence: boolean;
  totalOrderValue: number;
  totalRefundedValue: number;
  displayCurrency: string;
  merchantsSeen: number;
  profileWideOrders: number;
  localOrderSharePct: number;
  networkChargebackRatePct: number;
  thisStoreMerchantSharePct: number;
  density: number[];
  primaryIdentifier: string;
  identitySignalRows: IdentitySignalRow[];
  identitySignals: string[];
  transactions: RoadmapTransaction[];
  roadmapEvents: BehaviorRoadmapEvent[];
  identityTimeline: CustomerIntelligencePanel["identityTimeline"];
  variantCount: number;
  merchantNarrative: string;
  linkedAccounts: LinkedAccountRow[];
  merchantSignalPills: MerchantSignalPill[];
  activityLog: ActivityLogEntry[];
  openClaimCount: number;
  latestClaim: ClaimSummaryRow | null;
  merchantRefundRate: number;
  evidenceDisplay: CustomerEvidenceDisplay | null;
  billingAddress: string | null;
  identitySignalSummary: IdentitySignalSummaryRow[];
  possibleMatches: PossibleMatchRow[];
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
  currency: string | null;
  card_last4: string | null;
  browser_ip: string | null;
  source: string | null;
  connection_id: string | null;
  source_account_id: string | null;
  placed_at: string | null;
  shipping_address_id: string | null;
  merchant_customer_id?: string | null;
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

type OrderLineRow = {
  source_order_id: string;
  title: string | null;
  quantity: number | null;
  unit_price_minor: number | null;
  total_minor: number | null;
  currency: string | null;
};

type ShipmentRow = {
  source_order_id: string;
  external_id: string;
  source_account_id: string | null;
  source_record_id: string | null;
  carrier: string | null;
  status: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
};

export type IdentitySignalSummaryRow = {
  signalType: string;
  distinctCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  seenCount: number;
};

export type PossibleMatchRow = {
  candidateId: string;
  displayName: string | null;
  email: string | null;
  confidence: number | null;
  matchedTypes: string[];
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

function buildIdentitySignalRows(
  profile: CustomerProfileDisplay,
): IdentitySignalRow[] {
  const rows: IdentitySignalRow[] = [];
  for (const email of profile.emails) {
    if (email && email !== profile.primary_email) {
      rows.push({ value: email, signalType: "email variant", grade: "B" });
    }
  }
  const address = firstArrayValue(profile.addresses);
  if (address)
    rows.push({ value: address, signalType: "address match", grade: "B" });
  const phone = firstArrayValue(profile.phones);
  if (phone) rows.push({ value: phone, signalType: "phone match", grade: "A" });
  const ip = firstArrayValue(profile.ips);
  if (ip) rows.push({ value: ip, signalType: "device/ip match", grade: "C" });
  return rows;
}

export async function loadCustomerProfilePage(
  profileId: string,
  searchParams: CustomerProfileSearchParams,
): Promise<CustomerProfileLoadResult> {
  const viewToken = searchParams.view_token?.trim() ?? "";
  const auditRunId = searchParams.audit ?? null;
  const gorgiasSource =
    searchParams.source?.trim() === "gorgias" ? "gorgias" : null;
  const gorgiasTicketId = searchParams.ticket_id?.trim() || null;

  const svc = getRequestServiceClient();
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
    const user = await getRequestUser();
    if (!user) redirect("/login");

    const ctx = await requirePagePermission(PERMISSIONS.VIEW_CUSTOMERS);
    if (!ctx) {
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
    getCachedConnectionState(merchantId),
    svc
      .from("source_customers")
      .select(
        "id, email, phone, first_name, last_name, other_emails, orders_count, account_created_at, created_at, updated_at, merchant_customer_id",
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
        "id, email, phone, first_name, last_name, other_emails, orders_count, account_created_at, created_at, updated_at, merchant_customer_id",
      )
      .eq("merchant_id", merchantId)
      .eq("id", profileId)
      .maybeSingle()) as unknown as { data: SourceCustomerRow | null };
    customer = fallback.data;
  }
  if (!customer) {
    const { data: canonicalCustomer } = await svc
      .from("merchant_customers")
      .select("id, display_name, email, updated_at, created_at")
      .eq("merchant_id", merchantId)
      .eq("id", profileId)
      .maybeSingle() as unknown as {
        data: {
          id: string;
          display_name: string | null;
          email: string | null;
          updated_at: string;
          created_at: string;
        } | null;
      };
    if (canonicalCustomer) {
      const nameParts = (canonicalCustomer.display_name ?? "").trim().split(/\s+/).filter(Boolean);
      customer = {
        id: canonicalCustomer.id,
        email: canonicalCustomer.email,
        phone: null,
        first_name: nameParts[0] ?? null,
        last_name: nameParts.slice(1).join(" ") || null,
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
    if (viewToken) {
      return { blocked: true, reason: "link_expired" };
    }
    notFound();
  }

  const merchantCustomerId =
    (await resolveMerchantCustomerId(svc, merchantId, profileId)) ??
    customer.merchant_customer_id ??
    null;
  const merchantHistory = await loadMerchantCustomerHistory(svc, merchantId, profileId);

  // Sibling records linked by the network identity (same merchant, own-signal
  // disciplined). Orders/claims are aggregated across all linked records so the
  // dossier reflects the whole resolved identity, not just the clicked record.
  let resolvedIdentityId: string | null = null;
  let identityCustomerIds: string[] = [customer.id];
  let siblings: Array<{ id: string; email: string | null; name: string | null; ordersCount: number | null }> = [];
  if (merchantCustomerId) {
    const { data: canonicalSiblings } = await svc
      .from("source_customers")
      .select("id, email, first_name, last_name, orders_count")
      .eq("merchant_id", merchantId)
      .eq("merchant_customer_id", merchantCustomerId);
    siblings = (canonicalSiblings ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      email: (row.email as string | null) ?? null,
      name: [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || null,
      ordersCount: row.orders_count == null ? null : Number(row.orders_count),
    }));
    identityCustomerIds = siblings.length > 0 ? siblings.map((s) => s.id) : [customer.id];
  } else {
    const siblingResolution = await resolveIdentitySiblingCustomers(svc, merchantId, customer);
    resolvedIdentityId = siblingResolution.identityId;
    identityCustomerIds = siblingResolution.customerIds;
    siblings = siblingResolution.siblings;
  }
  const siblingById = new Map(siblings.map((s) => [s.id, s]));
  const siblingCount = Math.max(identityCustomerIds.length - 1, 0);

  // Own-store orders (layer 1), across all linked records.
  const orderSelect =
    "id, external_id, order_number, source_customer_id, merchant_customer_id, email, phone, total_price, currency, card_last4, browser_ip, source, connection_id, source_account_id, placed_at, shipping_address_id";
  let orderRows: SourceOrderRow[] = [];
  if (merchantCustomerId) {
    const canonicalOrders = (await svc
      .from("source_orders")
      .select(orderSelect)
      .eq("merchant_id", merchantId)
      .eq("merchant_customer_id", merchantCustomerId)
      .order("placed_at", { ascending: true })
      .limit(2000)) as unknown as { data: SourceOrderRow[] | null; error?: { message: string } | null };
    orderRows = canonicalOrders.data ?? [];
    if (canonicalOrders.error) {
      const legacyOrders = (await svc
        .from("source_orders")
        .select(
          "id, external_id, order_number, source_customer_id, email, phone, total_price, currency, card_last4, browser_ip, source, connection_id, source_account_id, placed_at, shipping_address_id",
        )
        .eq("merchant_id", merchantId)
        .in("source_customer_id", identityCustomerIds)
        .order("placed_at", { ascending: true })
        .limit(2000)) as unknown as { data: SourceOrderRow[] | null };
      orderRows = legacyOrders.data ?? [];
    }
  } else {
    const legacyOrders = (await svc
      .from("source_orders")
      .select(
        "id, external_id, order_number, source_customer_id, email, phone, total_price, currency, card_last4, browser_ip, source, connection_id, source_account_id, placed_at, shipping_address_id",
      )
      .eq("merchant_id", merchantId)
      .in("source_customer_id", identityCustomerIds)
      .order("placed_at", { ascending: true })
      .limit(2000)) as unknown as { data: SourceOrderRow[] | null };
    orderRows = legacyOrders.data ?? [];
  }
  const orders = orderRows;

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
  if (merchantCustomerId) {
    const { data: canonicalClaimRows } = (await svc
      .from(TABLES.MERCHANT_CLAIMS)
      .select(
        "id, claim_type, status, source_order_id, reason_normalized, reason_raw, submitted_at, created_at, updated_at",
      )
      .eq("merchant_id", merchantId)
      .eq("merchant_customer_id", merchantCustomerId)
      .order("updated_at", { ascending: false })
      .limit(500)) as unknown as { data: ClaimRow[] | null };
    const byId = new Map(claimRows.map((claim) => [claim.id, claim]));
    for (const claim of canonicalClaimRows ?? []) byId.set(claim.id, claim);
    claimRows = [...byId.values()].sort((a, b) =>
      String(b.updated_at).localeCompare(String(a.updated_at)),
    );
  }

  const claimsByOrder = new Map<string, ClaimRow[]>();
  for (const claim of claimRows) {
    if (!claim.source_order_id) continue;
    const list = claimsByOrder.get(claim.source_order_id) ?? [];
    list.push(claim);
    claimsByOrder.set(claim.source_order_id, list);
  }

  // Order line items (products/qty/price) for the order history breakdown.
  let lineRows: OrderLineRow[] = [];
  if (orderIds.length > 0) {
    const { data } = (await svc
      .from(TABLES.SOURCE_ORDER_LINES)
      .select("source_order_id, title, quantity, unit_price_minor, total_minor, currency")
      .eq("merchant_id", merchantId)
      .in("source_order_id", orderIds)) as unknown as { data: OrderLineRow[] | null };
    lineRows = data ?? [];
  }
  const linesByOrder = new Map<string, OrderLineRow[]>();
  for (const line of lineRows) {
    const list = linesByOrder.get(line.source_order_id) ?? [];
    list.push(line);
    linesByOrder.set(line.source_order_id, list);
  }

  // Shipments (delivery status/carrier/tracking) for the order history.
  let shipmentRows: ShipmentRow[] = [];
  if (orderIds.length > 0) {
    const { data } = (await svc
      .from(TABLES.SOURCE_SHIPMENTS)
      .select("source_order_id, external_id, source_account_id, source_record_id, carrier, status, tracking_number, shipped_at, delivered_at")
      .eq("merchant_id", merchantId)
      .in("source_order_id", orderIds)) as unknown as { data: ShipmentRow[] | null };
    shipmentRows = data ?? [];
  }
  const shipmentsByOrder = new Map<string, ShipmentRow[]>();
  for (const shipment of shipmentRows) {
    const list = shipmentsByOrder.get(shipment.source_order_id) ?? [];
    list.push(shipment);
    shipmentsByOrder.set(shipment.source_order_id, list);
  }

  const sourceLinkContext = await loadSourceLinkContext(svc, merchantId);

  // Billing/other addresses not tied to a specific order's shipping address.
  const customerAddressIds = identityCustomerIds;
  let extraAddressRows: (SourceAddressRow & { source_customer_id: string; kind: string })[] = [];
  if (customerAddressIds.length > 0) {
    const { data } = (await svc
      .from(TABLES.SOURCE_ADDRESSES)
      .select("id, source_customer_id, kind, line1, line2, city, region, postal_code, country")
      .eq("merchant_id", merchantId)
      .in("source_customer_id", customerAddressIds)) as unknown as {
      data: (SourceAddressRow & { source_customer_id: string; kind: string })[] | null;
    };
    extraAddressRows = data ?? [];
  }
  const billingAddress = extraAddressRows.find((row) => row.kind === "billing");
  const billingAddressDisplay = billingAddress ? formatAddress(billingAddress) : null;

  // Identity-signal footprint (hashed identifiers) — counts and freshness per
  // signal type, not the raw values, since only hashes are stored.
  let identitySignalSummary: IdentitySignalSummaryRow[] = [];
  if (merchantCustomerId) {
    const { data } = (await svc
      .from(TABLES.MERCHANT_CUSTOMER_SIGNALS)
      .select("identifier_type, identifier_hash, first_seen_at, last_seen_at, seen_count")
      .eq("merchant_id", merchantId)
      .eq("merchant_customer_id", merchantCustomerId)) as unknown as {
      data: Array<{
        identifier_type: string;
        identifier_hash: string;
        first_seen_at: string;
        last_seen_at: string;
        seen_count: number;
      }> | null;
    };
    const byType = new Map<
      string,
      { hashes: Set<string>; firstSeenAt: string; lastSeenAt: string; seenCount: number }
    >();
    for (const row of data ?? []) {
      const current = byType.get(row.identifier_type) ?? {
        hashes: new Set<string>(),
        firstSeenAt: row.first_seen_at,
        lastSeenAt: row.last_seen_at,
        seenCount: 0,
      };
      current.hashes.add(row.identifier_hash);
      if (row.first_seen_at < current.firstSeenAt) current.firstSeenAt = row.first_seen_at;
      if (row.last_seen_at > current.lastSeenAt) current.lastSeenAt = row.last_seen_at;
      current.seenCount += row.seen_count;
      byType.set(row.identifier_type, current);
    }
    identitySignalSummary = [...byType.entries()]
      .map(([signalType, agg]) => ({
        signalType,
        distinctCount: agg.hashes.size,
        firstSeenAt: agg.firstSeenAt,
        lastSeenAt: agg.lastSeenAt,
        seenCount: agg.seenCount,
      }))
      .sort((a, b) => b.seenCount - a.seenCount);
  }

  // ---------------------------------------------------------------------------
  // Network identity (layers 3/5) — via the k-anonymous RPC only.
  // ---------------------------------------------------------------------------
  const identifierHashes = buildCustomerIdentifierHashes(customer);
  const network = await lookupNetworkIdentity(
    svc,
    merchantId,
    identifierHashes,
  );
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

  // Network evidence score (service-role table; disclosed only when k-anon RPC matched).
  let evidenceDisplay: CustomerEvidenceDisplay | null = null;
  if (network) {
    const { data: evidenceRow } = (await svc
      .from(TABLES.IDENTITY_EVIDENCE_SCORES)
      .select(
        "evidence_score, evidence_level, has_sufficient_data, score_breakdown",
      )
      .eq("identity_id", network.identityId)
      .maybeSingle()) as unknown as {
      data: {
        evidence_score: number;
        evidence_level: string;
        has_sufficient_data: boolean;
        score_breakdown: unknown;
      } | null;
    };

    evidenceDisplay = {
      evidence_disclosed: true,
      evidence_score: Number(evidenceRow?.evidence_score ?? 0),
      evidence_level: (evidenceRow?.evidence_level ??
        "minimal") as EvidenceLevel,
      has_sufficient_data: Boolean(evidenceRow?.has_sufficient_data),
      score_breakdown: Array.isArray(evidenceRow?.score_breakdown)
        ? (evidenceRow.score_breakdown as ScoreFactor[])
        : [],
      confidence_grade: network.confidenceGrade,
    };
  } else if (identityId || identifierHashes.length > 0) {
    evidenceDisplay = {
      evidence_disclosed: false,
      evidence_score: 0,
      evidence_level: "minimal",
      has_sufficient_data: false,
      score_breakdown: [],
      confidence_grade: null,
    };
  }

  // ---------------------------------------------------------------------------
  // Display assembly (own-store data first; network aggregates where disclosed).
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
    // Identity confidence grade (displayed as confidence, never a verdict).
    risk_level: network?.confidenceGrade ?? "none",
    total_orders: Math.max(network?.totalOrders ?? 0, merchantOrderCount),
    total_refund_claims: Math.max(
      network?.totalClaims ?? 0,
      merchantClaimCount,
    ),
    total_chargebacks: Math.max(
      network?.totalChargebacks ?? 0,
      merchantChargebacks,
    ),
    total_merchants_seen_at: Math.max(network?.merchantCount ?? 1, 1),
    sibling_count: siblingCount,
    refund_rate:
      network?.claimRate ??
      (merchantOrderCount > 0 ? merchantClaimCount / merchantOrderCount : 0),
    fastest_claim_days: network?.fastestClaimDays ?? null,
    avg_claim_days: null,
    refund_acceleration_score: 0,
    first_seen: network?.firstSeenAt ?? firstSeenLocal,
    last_seen: network?.lastSeenAt ?? lastSeenLocal,
    fraud_flags: [],
    identity_signals: [],
    investigation_status: investigationStatus,
    refund_requests_365d: merchantHistory.refundRequests365d,
    completed_refunds_365d: merchantHistory.completedRefunds365d,
    completed_refund_amounts_by_currency: merchantHistory.completedRefundAmountByCurrency,
    possible_match_count: merchantHistory.possibleMatches.length,
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
    const shipment = shipmentsByOrder.get(order.id)?.[0] ?? null;
    const orderLink = deriveSourceLink({
      context: sourceLinkContext,
      entityType: "order",
      row: order,
      relatedShipmentExternalId: shipment?.external_id ?? null,
    });
    const shipmentLink = shipment
      ? deriveSourceLink({
          context: sourceLinkContext,
          entityType: "shipment",
          row: shipment,
          parentOrder: order,
        })
      : null;
    return {
      source_order_id: order.id,
      order_id: order.order_number ?? order.external_id,
      external_href: orderLink?.sourceUrl ?? null,
      external_source: orderLink?.sourceSystem ?? null,
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
      line_items: (linesByOrder.get(order.id) ?? []).map((line) => ({
        title: line.title,
        quantity: line.quantity,
        unit_price_minor: line.unit_price_minor,
        total_minor: line.total_minor,
        currency: line.currency,
      })),
      shipment: (() => {
        if (!shipment) return null;
        return {
          carrier: shipment.carrier,
          status: shipment.status,
          tracking_number: shipment.tracking_number,
          shipped_at: shipment.shipped_at,
          delivered_at: shipment.delivered_at,
          external_href: shipmentLink?.sourceUrl ?? null,
          external_source: shipmentLink?.sourceSystem ?? null,
        };
      })(),
    };
  });

  type TimelineField = "email" | "name" | "address" | "ip" | "card_last4";
  const identityTimeline: CustomerIntelligencePanel["identityTimeline"] = [];
  const firstSeen: Record<string, string> = {};

  // Compare on a normalised key so formatting differences (e.g. "St" vs
  // "Street") don't register as a false identity change; the raw value is
  // still what's displayed and deduplicated against.
  function comparisonKey(field: TimelineField, value: string): string {
    return field === "address" ? (normaliseAddress(value) ?? value) : value;
  }

  function addEntry(
    date: string,
    field: TimelineField,
    value: string | null | undefined,
  ) {
    const v = (value ?? "").trim();
    if (!v) return;
    const key = comparisonKey(field, v);
    if (!(field in firstSeen)) {
      firstSeen[field] = key;
      identityTimeline.push({ date, field, value: v, isVariant: false });
    } else if (firstSeen[field] !== key) {
      const alreadyAdded = identityTimeline.some(
        (e) => e.field === field && comparisonKey(field, e.value) === key,
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

  const isEligibleForEvidence =
    transactions.some((tx) => tx.refund_claimed || tx.chargeback_filed) ||
    profile.total_chargebacks > 0;
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
      : Math.round(profile.refund_rate * 100);
  const hasCleanRecord =
    merchantClaimCount === 0 && profile.total_chargebacks === 0;
  const identitySignals: string[] = [];

  const density = Array.from({ length: 12 }, () => 0);
  for (const tx of transactions) {
    const diffDays = Math.floor(
      (Date.now() - new Date(tx.processed_at).getTime()) / 86400000,
    );
    const weekIndex = Math.min(11, Math.max(0, 11 - Math.floor(diffDays / 7)));
    density[weekIndex] += 1;
  }

  const roadmapEvents = getEventStream({
    orderHistory: transactions.map((tx) => ({
      orderId: tx.order_id,
      processedAt: tx.processed_at,
      orderValue: Number(tx.order_value) || null,
      riskLevel: tx.risk_level ?? null,
      refundRequested: !!tx.refund_claimed,
      refundReason: tx.refund_reason ?? null,
      chargebackFiled: !!tx.chargeback_filed,
      chargebackReasonCode: tx.chargeback_reason_code ?? null,
      fraudFlags: Array.isArray(tx.fraud_flags) ? tx.fraud_flags : [],
      address: tx.shipping_address,
      email: tx.customer_email,
      cardLast4: tx.card_last4,
      source: tx.source ?? null,
    })),
    identityTimeline,
    notes: [],
  });

  const merchantNarrative = buildBehavioralNarrative({
    totalOrders: merchantOrderCount,
    totalRefundClaims: merchantClaimCount,
    refundRate:
      merchantOrderCount > 0
        ? merchantClaimCount / merchantOrderCount
        : profile.refund_rate,
    fastestClaimDays: profile.fastest_claim_days,
    avgClaimDays: profile.avg_claim_days,
    refundAccelerationScore: profile.refund_acceleration_score,
    firstSeen: transactions[0]?.processed_at ?? profile.first_seen,
    lastSeen:
      transactions[transactions.length - 1]?.processed_at ?? profile.last_seen,
    fraudFlags: profile.identity_signals ?? profile.fraud_flags,
    linkedAccountCount: linkedAccounts.length,
  });

  const profileGrade = riskLevelToNewGrade(network?.confidenceGrade ?? null);

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
  const profileWideOrders = Math.max(0, profile.total_orders);
  const merchantsSeen = Math.max(1, profile.total_merchants_seen_at);
  const localOrderSharePct =
    profileWideOrders > 0 ? (merchantOrderCount / profileWideOrders) * 100 : 0;
  const localClaimRatePct =
    merchantOrderCount > 0
      ? (merchantClaimCount / merchantOrderCount) * 100
      : 0;
  const networkChargebackRatePct =
    profileWideOrders > 0
      ? (profile.total_chargebacks / profileWideOrders) * 100
      : 0;
  const thisStoreMerchantSharePct = (1 / merchantsSeen) * 100;

  // Cross-merchant claim-type mix from the k-anonymous rollup only. Counts are
  // aggregates; no per-merchant identification is possible or implied.
  const merchantSignalPills: MerchantSignalPill[] = network
    ? Object.entries(network.claimTypeCounts).flatMap(
        ([claimType, claimCount]) => {
          const label = CLAIM_TYPE_LABELS[claimType] ?? "Other";
          const safeCount = Math.max(0, Math.min(Number(claimCount) || 0, 12));
          return Array.from({ length: safeCount }, () => ({
            merchantLabel: "Network report",
            claimType: label,
          }));
        },
      )
    : [];

  const primaryIdentifier =
    profile.primary_email ?? firstArrayValue(profile.emails) ?? "primary";
  const identitySignalRows = buildIdentitySignalRows(profile);

  const possibleMatches: PossibleMatchRow[] = merchantHistory.possibleMatches.map((match) => ({
    candidateId: match.candidateId,
    displayName: match.displayName,
    email: match.email,
    confidence: match.confidence,
    matchedTypes: match.matchedTypes,
  }));

  const props: CustomerProfilePageViewProps = {
    connectionState: connectionState as ConnectionState,
    auditRunId,
    viewToken,
    gorgiasSource,
    gorgiasTicketId,
    profile,
    displayName,
    profileGrade,
    hasCleanRecord,
    merchantClaimCount,
    merchantChargebackCount: merchantChargebacks,
    merchantOrderCount,
    localClaimRatePct,
    isEligibleForEvidence,
    totalOrderValue,
    totalRefundedValue,
    displayCurrency,
    merchantsSeen,
    profileWideOrders,
    localOrderSharePct,
    networkChargebackRatePct,
    thisStoreMerchantSharePct,
    density,
    primaryIdentifier,
    identitySignalRows,
    identitySignals,
    transactions,
    roadmapEvents,
    identityTimeline,
    variantCount,
    merchantNarrative,
    linkedAccounts,
    merchantSignalPills,
    activityLog,
    openClaimCount,
    latestClaim,
    merchantRefundRate,
    evidenceDisplay,
    billingAddress: billingAddressDisplay,
    identitySignalSummary,
    possibleMatches,
  };

  return { blocked: false, props };
}
