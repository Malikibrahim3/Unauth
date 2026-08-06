import { TABLES } from "@/lib/supabase/tables";
import {
  deriveSourceLink,
  loadSourceLinkContext,
  type SourceLinkRow,
} from "@/lib/relationships/sourceLinking";

export const CONNECTED_OBJECT_TYPES = [
  "order",
  "ticket",
  "shipment",
  "refund",
  "return",
  "dispute",
] as const;
export type ConnectedObjectType = (typeof CONNECTED_OBJECT_TYPES)[number];
type Client = { from: (table: string) => any };

const CONFIG: Record<
  ConnectedObjectType,
  { table: string; reference: string; date: string; amount?: string }
> = {
  order: {
    table: TABLES.SOURCE_ORDERS,
    reference: "order_number",
    date: "updated_at",
    amount: "total_price",
  },
  ticket: {
    table: TABLES.SOURCE_TICKETS,
    reference: "external_id",
    date: "updated_at",
  },
  shipment: {
    table: TABLES.SOURCE_SHIPMENTS,
    reference: "tracking_number",
    date: "updated_at",
  },
  refund: {
    table: TABLES.SOURCE_REFUNDS,
    reference: "external_id",
    date: "ingested_at",
    amount: "amount",
  },
  return: {
    table: TABLES.SOURCE_RETURNS,
    reference: "external_id",
    date: "updated_at",
  },
  dispute: {
    table: TABLES.SOURCE_DISPUTES,
    reference: "external_id",
    date: "ingested_at",
    amount: "amount",
  },
};

export type ObjectLink = {
  type: string;
  id: string;
  reference: string;
  href: string;
  externalId?: string | null;
  externalHref?: string | null;
  externalSource?: string | null;
  state?: string | null;
};
export type ObjectFact = {
  label: string;
  value: string | number | boolean | null;
  kind?: "text" | "number" | "date" | "money" | "boolean";
  currency?: string | null;
};
export type ObjectTimelineEvent = {
  label: string;
  detail: string | null;
  at: string | null;
};
export type ObjectItem = {
  id: string;
  title: string;
  sku: string | null;
  quantity: number | null;
  amount: number | null;
  currency: string | null;
};
export type ObjectEvidence = {
  id: string;
  title: string;
  summary: string;
  type: string;
  provider: string;
  confidence: string;
  occurredAt: string | null;
  reference: string | null;
};
export type ObjectConversationEntry = {
  id: string;
  kind: "message" | "activity";
  title: string;
  summary: string | null;
  actor: string | null;
  visibility: string | null;
  at: string | null;
};
export type ObjectProvenance = {
  sourceSystem: string;
  externalId: string;
  sourceUrl: string | null;
  freshness: string;
  syncState: string;
  lastSyncedAt: string | null;
  sourceCreatedAt: string | null;
  sourceUpdatedAt: string | null;
  connectorVersion: string | null;
  payloadHash: string | null;
};
export type ObjectSummary = {
  id: string;
  type: ConnectedObjectType;
  reference: string;
  sourceId: string | null;
  provider: string | null;
  state: string | null;
  updatedAt: string | null;
  amount: number | null;
  currency: string | null;
  sourceOrderId: string | null;
  customer: ObjectLink | null;
  connected: ObjectLink[];
  facts: ObjectFact[];
  items: ObjectItem[];
  timeline: ObjectTimelineEvent[];
  conversation: ObjectConversationEntry[];
  evidence: ObjectEvidence[];
  payoutCases: ObjectLink[];
  provenance: ObjectProvenance | null;
};

function text(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === "string" && value.trim() ? value : null;
}
function numberValue(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function fact(
  label: string,
  value: ObjectFact["value"],
  kind: ObjectFact["kind"] = "text",
  currency?: string | null,
): ObjectFact {
  return { label, value, kind, currency };
}
function event(
  label: string,
  at: string | null,
  detail: string | null = null,
): ObjectTimelineEvent {
  return { label, at, detail };
}
function compactFacts(values: ObjectFact[]) {
  return values.filter((item) => item.value !== null && item.value !== "");
}

function textList(row: Record<string, unknown>, key: string): string[] {
  const value = row[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function isCommerceObject(
  type: ConnectedObjectType,
): type is "order" | "shipment" | "refund" | "return" {
  return type === "order" || type === "shipment" || type === "refund" || type === "return";
}

function lineAmount(row: Record<string, unknown>): number | null {
  const minor = numberValue(row, "total_minor");
  return minor === null ? null : minor / 100;
}

async function loadItems(
  client: Client,
  merchantId: string,
  type: ConnectedObjectType,
  id: string,
  orderId: string | null,
): Promise<ObjectItem[]> {
  if (!isCommerceObject(type)) return [];

  if (type === "shipment") {
    const result = await client
      .from(TABLES.SOURCE_SHIPMENT_LINES)
      .select("id,external_product_ref,sku,quantity_recorded")
      .eq("merchant_id", merchantId)
      .eq("source_shipment_id", id)
      .limit(50);
    if (result.error)
      throw new Error(`connected_object_shipment_items_failed:${result.error.message}`);
    return ((result.data as Record<string, unknown>[] | null) ?? []).map((item) => ({
      id: text(item, "id")!,
      title: text(item, "external_product_ref") ?? text(item, "sku") ?? "Shipment item",
      sku: text(item, "sku"),
      quantity: numberValue(item, "quantity_recorded"),
      amount: null,
      currency: null,
    }));
  }

  if (!orderId) return [];
  const result = await client
    .from(TABLES.SOURCE_ORDER_LINES)
    .select("id,title,sku,quantity,total_minor,currency")
    .eq("merchant_id", merchantId)
    .eq("source_order_id", orderId)
    .limit(50);
  if (result.error)
    throw new Error(`connected_object_items_failed:${result.error.message}`);
  return ((result.data as Record<string, unknown>[] | null) ?? []).map((item) => ({
    id: text(item, "id")!,
    title: text(item, "title") ?? text(item, "sku") ?? "Order item",
    sku: text(item, "sku"),
    quantity: numberValue(item, "quantity"),
    amount: lineAmount(item),
    currency: text(item, "currency"),
  }));
}

async function loadSourceRecord(
  client: Client,
  merchantId: string,
  type: ConnectedObjectType,
  id: string,
  row: SourceLinkRow,
): Promise<SourceLinkRow | null> {
  const columns =
    "id,source_system,source_entity_type,external_id,source_url,source_account_id,connection_id,freshness_state,sync_state,last_synced_at,source_created_at,source_updated_at,connector_version,payload_hash";
  const sourceRecordId = text(row, "source_record_id");
  let query = client
    .from(TABLES.SOURCE_RECORDS)
    .select(columns)
    .eq("merchant_id", merchantId);
  if (sourceRecordId) {
    query = query.eq("id", sourceRecordId);
  } else {
    const externalId = text(row, "external_id");
    const sourceSystem = text(row, "source") ?? text(row, "provider");
    if (externalId && sourceSystem) {
      query = query
        .eq("source_system", sourceSystem)
        .eq("source_entity_type", type)
        .eq("external_id", externalId);
      const sourceAccountId = text(row, "source_account_id");
      if (sourceAccountId) query = query.eq("source_account_id", sourceAccountId);
    } else {
      query = query
        .eq("canonical_entity_id", id)
        .eq("canonical_entity_type", type);
    }
  }
  const result = await query.order("last_synced_at", { ascending: false }).limit(1);
  if (result.error) throw new Error(`connected_object_source_record_failed:${result.error.message}`);
  return ((result.data as SourceLinkRow[] | null) ?? [])[0] ?? null;
}

function factsFor(
  type: ConnectedObjectType,
  row: Record<string, unknown>,
): ObjectFact[] {
  const currency = text(row, "currency");
  if (type === "order")
    return compactFacts([
      fact(
        "Placed",
        text(row, "placed_at") ?? text(row, "processed_at"),
        "date",
      ),
      fact(
        "Total",
        numberValue(row, "total_price") ?? numberValue(row, "order_value"),
        "money",
        currency,
      ),
      fact("Subtotal", numberValue(row, "subtotal_price"), "money", currency),
      fact("Discounts", numberValue(row, "total_discounts"), "money", currency),
      fact("Financial status", text(row, "financial_status")),
      fact("Fulfilment", text(row, "fulfillment_state")),
      fact("Line items", numberValue(row, "line_items_count"), "number"),
      fact("Payment gateway", text(row, "payment_gateway")),
      fact("Cancelled", text(row, "cancelled_at"), "date"),
      fact("Cancel reason", text(row, "cancel_reason")),
    ]);
  if (type === "ticket")
    return compactFacts([
      fact("Subject", text(row, "subject")),
      fact("Status", text(row, "status")),
      fact("Channel", text(row, "channel")),
      fact("Messages", numberValue(row, "message_count"), "number"),
      fact(
        "Customer replies",
        numberValue(row, "customer_reply_count"),
        "number",
      ),
      fact("Reopened", row.was_reopened === true, "boolean"),
      fact("Satisfaction", numberValue(row, "satisfaction_score"), "number"),
      fact(
        "Opened",
        text(row, "opened_at_provider") ?? text(row, "created_at_provider"),
        "date",
      ),
      fact("Closed", text(row, "closed_at_provider"), "date"),
    ]);
  if (type === "shipment")
    return compactFacts([
      fact("Carrier", text(row, "carrier")),
      fact("Service", text(row, "service")),
      fact("Tracking number", text(row, "tracking_number")),
      fact("Canonical status", text(row, "status")),
      fact("Source status", text(row, "source_status")),
      fact("Shipped", text(row, "shipped_at"), "date"),
      fact("Delivered", text(row, "delivered_at"), "date"),
    ]);
  if (type === "refund")
    return compactFacts([
      fact("Amount", numberValue(row, "amount"), "money", currency),
      fact(
        "Scope",
        row.is_full_refund === true
          ? "Full refund"
          : row.is_full_refund === false
            ? "Partial refund"
            : null,
      ),
      fact("Reason", text(row, "reason")),
      fact("Refunded", text(row, "refunded_at"), "date"),
      fact("Ingested", text(row, "ingested_at"), "date"),
    ]);
  if (type === "return")
    return compactFacts([
      fact("Canonical status", text(row, "status")),
      fact("Source status", text(row, "source_status")),
      fact("Disposition", text(row, "disposition")),
      fact("Requested", text(row, "requested_at"), "date"),
      fact("Received", text(row, "received_at"), "date"),
      fact("Inspected", text(row, "inspected_at"), "date"),
      fact("Refund reference", text(row, "refund_reference")),
      fact("Replacement reference", text(row, "replacement_reference")),
    ]);
  return compactFacts([
    fact("Dispute type", text(row, "dispute_type")),
    fact("Status", text(row, "status")),
    fact("Reason", text(row, "reason")),
    fact("Amount", numberValue(row, "amount"), "money", currency),
    fact("Initiated", text(row, "initiated_at"), "date"),
    fact("Finalized", text(row, "finalized_at"), "date"),
    fact("Ingested", text(row, "ingested_at"), "date"),
  ]);
}

function timelineFor(
  type: ConnectedObjectType,
  row: Record<string, unknown>,
): ObjectTimelineEvent[] {
  const values: ObjectTimelineEvent[] = [];
  if (type === "order") {
    values.push(
      event(
        "Order placed",
        text(row, "placed_at") ?? text(row, "processed_at"),
        text(row, "financial_status"),
      ),
      event(
        "Order updated",
        text(row, "updated_at"),
        text(row, "fulfillment_state"),
      ),
      event(
        "Order cancelled",
        text(row, "cancelled_at"),
        text(row, "cancel_reason"),
      ),
    );
  }
  if (type === "ticket") {
    values.push(
      event(
        "Ticket opened",
        text(row, "opened_at_provider") ?? text(row, "created_at_provider"),
        text(row, "channel"),
      ),
      event(
        "Source updated",
        text(row, "updated_at_provider") ?? text(row, "updated_at"),
        text(row, "status"),
      ),
      event("Ticket closed", text(row, "closed_at_provider"), null),
    );
  }
  if (type === "shipment") {
    values.push(
      event("Shipment created", text(row, "created_at"), text(row, "carrier")),
      event("Shipped", text(row, "shipped_at"), text(row, "source_status")),
      event(
        "Delivered",
        text(row, "delivered_at"),
        text(row, "tracking_number"),
      ),
      event("Source updated", text(row, "updated_at"), text(row, "status")),
    );
  }
  if (type === "refund") {
    values.push(
      event("Refund issued", text(row, "refunded_at"), text(row, "reason")),
      event("Refund ingested", text(row, "ingested_at"), null),
    );
  }
  if (type === "return") {
    values.push(
      event(
        "Return requested",
        text(row, "requested_at") ?? text(row, "created_at"),
        text(row, "source_status"),
      ),
      event("Return received", text(row, "received_at"), null),
      event(
        "Return inspected",
        text(row, "inspected_at"),
        text(row, "disposition"),
      ),
      event("Return updated", text(row, "updated_at"), text(row, "status")),
    );
  }
  if (type === "dispute") {
    values.push(
      event(
        "Dispute initiated",
        text(row, "initiated_at"),
        text(row, "reason"),
      ),
      event(
        "Dispute finalized",
        text(row, "finalized_at"),
        text(row, "status"),
      ),
      event("Dispute ingested", text(row, "ingested_at"), null),
    );
  }
  return values
    .filter((item) => item.at)
    .sort((left, right) => Date.parse(left.at!) - Date.parse(right.at!));
}

export function isConnectedObjectType(
  value: string,
): value is ConnectedObjectType {
  return CONNECTED_OBJECT_TYPES.includes(value as ConnectedObjectType);
}

/** Merchant-scoped, object-specific read model for detail, preview and search links. */
export async function getObjectSummary(
  client: Client,
  merchantId: string,
  type: ConnectedObjectType,
  id: string,
): Promise<ObjectSummary | null> {
  const config = CONFIG[type];
  const { data, error } = await client
    .from(config.table)
    .select("*")
    .eq("merchant_id", merchantId)
    .eq("id", id)
    .maybeSingle();
  if (error)
    throw new Error(`connected_object_read_failed:${type}:${error.message}`);
  const row = data as Record<string, unknown> | null;
  if (!row) return null;
  const sourceLinkContext = await loadSourceLinkContext(client, merchantId);
  const orderId = type === "order" ? id : text(row, "source_order_id");
  let order: Record<string, unknown> | null = type === "order" ? row : null;
  if (orderId && !order) {
    const result = await client
      .from(TABLES.SOURCE_ORDERS)
      .select("id,external_id,order_number,source_customer_id,source,connection_id,source_account_id")
      .eq("merchant_id", merchantId)
      .eq("id", orderId)
      .maybeSingle();
    if (result.error)
      throw new Error(`connected_object_order_failed:${result.error.message}`);
    order = result.data as Record<string, unknown> | null;
  }
  const sourceCustomerId =
    text(row, "source_customer_id") ??
    (order ? text(order, "source_customer_id") : null);
  let customer: ObjectLink | null = null;
  if (sourceCustomerId) {
    const result = await client
      .from(TABLES.SOURCE_CUSTOMERS)
      .select("id,merchant_customer_id,first_name,last_name,email,external_id,source,connection_id")
      .eq("merchant_id", merchantId)
      .eq("id", sourceCustomerId)
      .maybeSingle();
    if (result.error)
      throw new Error(
        `connected_object_customer_failed:${result.error.message}`,
      );
    const sourceCustomer = result.data as Record<string, unknown> | null;
    if (sourceCustomer) {
      const canonicalId =
        text(sourceCustomer, "merchant_customer_id") ??
        text(sourceCustomer, "id")!;
      customer = {
        type: "customer",
        id: canonicalId,
        reference:
          [
            text(sourceCustomer, "first_name"),
            text(sourceCustomer, "last_name"),
          ]
            .filter(Boolean)
            .join(" ") ||
          text(sourceCustomer, "email") ||
          "Unnamed customer",
        href: `/customers/${canonicalId}`,
      };
      const customerLink = deriveSourceLink({
        context: sourceLinkContext,
        entityType: "customer",
        row: sourceCustomer,
      });
      customer.externalHref = customerLink?.sourceUrl ?? null;
      customer.externalSource = customerLink?.sourceSystem ?? null;
    }
  }

  const connected: ObjectLink[] = [];
  if (orderId) {
    if (type !== "order" && order)
      (() => {
        const orderLink = deriveSourceLink({
          context: sourceLinkContext,
          entityType: "order",
          row: order,
        });
        connected.push({
          type: "order",
          id: text(order, "id")!,
          reference:
            text(order, "order_number") ??
            text(order, "external_id") ??
            text(order, "id")!,
          href: `/orders/${text(order, "id")}`,
          externalId: text(order, "external_id"),
          externalHref: orderLink?.sourceUrl ?? null,
          externalSource: orderLink?.sourceSystem ?? null,
        });
      })();
    const families = [
      ["shipment", TABLES.SOURCE_SHIPMENTS, "tracking_number", "status", "id,tracking_number,status,external_id,source_account_id,source_record_id"],
      ["refund", TABLES.SOURCE_REFUNDS, "external_id", null, "id,external_id"],
      ["return", TABLES.SOURCE_RETURNS, "external_id", "status", "id,external_id,status,source_account_id,source_record_id"],
      ["dispute", TABLES.SOURCE_DISPUTES, "external_id", "status", "id,external_id,status"],
    ] as const;
    const relationshipResults = await Promise.all(
      families
        .filter(([childType]) => childType !== type)
        .map(async ([childType, table, referenceField, stateField, fields]) => {
          const result = await client
            .from(table)
            .select(fields)
            .eq("merchant_id", merchantId)
            .eq("source_order_id", orderId)
            .limit(20);
          if (result.error)
            throw new Error(
              `connected_object_relationship_failed:${childType}:${result.error.message}`,
            );
          return {
            childType,
            referenceField,
            stateField,
            rows: (result.data as Record<string, unknown>[] | null) ?? [],
          };
        }),
    );
    for (const {
      childType,
      referenceField,
      stateField,
      rows,
    } of relationshipResults) {
      for (const child of rows) {
        const childId = text(child, "id")!;
        const childLink = deriveSourceLink({
          context: sourceLinkContext,
          entityType: childType,
          row: child,
          parentOrder: order,
        });
        connected.push({
          type: childType,
          id: childId,
          reference: text(child, referenceField) ?? childId,
          state: stateField ? text(child, stateField) : null,
          href: `/${childType}s/${childId}`,
          externalId: text(child, "external_id"),
          externalHref: childLink?.sourceUrl ?? null,
          externalSource: childLink?.sourceSystem ?? null,
        });
      }
    }
  }
  if (customer) connected.unshift(customer);

  // Tickets retain provider order references as source facts. Read those links
  // into the existing connected-record spine rather than presenting identifiers
  // or requiring a second support-specific record model.
  if (type === "ticket") {
    const orderExternalIds = textList(row, "linked_order_external_ids").slice(0, 20);
    if (orderExternalIds.length) {
      const orderResult = await client
        .from(TABLES.SOURCE_ORDERS)
        .select("id,external_id,order_number,source,connection_id,source_account_id")
        .eq("merchant_id", merchantId)
        .in("external_id", orderExternalIds)
        .limit(20);
      if (orderResult.error)
        throw new Error(`connected_object_ticket_orders_failed:${orderResult.error.message}`);
      const ticketOrders = (orderResult.data as Record<string, unknown>[] | null) ?? [];
      for (const ticketOrder of ticketOrders) {
        const ticketOrderId = text(ticketOrder, "id");
        if (!ticketOrderId || connected.some((item) => item.type === "order" && item.id === ticketOrderId)) continue;
        const ticketOrderLink = deriveSourceLink({
          context: sourceLinkContext,
          entityType: "order",
          row: ticketOrder,
        });
        connected.push({
          type: "order",
          id: ticketOrderId,
          reference: text(ticketOrder, "order_number") ?? text(ticketOrder, "external_id") ?? "Connected order",
          href: `/orders/${ticketOrderId}`,
          externalId: text(ticketOrder, "external_id"),
          externalHref: ticketOrderLink?.sourceUrl ?? null,
          externalSource: ticketOrderLink?.sourceSystem ?? null,
        });
      }

      const ticketOrderIds = ticketOrders.map((item) => text(item, "id")).filter((item): item is string => Boolean(item));
      if (ticketOrderIds.length) {
        const refundResult = await client
          .from(TABLES.SOURCE_REFUNDS)
          .select("id,external_id,source_order_id")
          .eq("merchant_id", merchantId)
          .in("source_order_id", ticketOrderIds)
          .limit(20);
        if (refundResult.error)
          throw new Error(`connected_object_ticket_refunds_failed:${refundResult.error.message}`);
        for (const refund of (refundResult.data as Record<string, unknown>[] | null) ?? []) {
          const refundId = text(refund, "id");
          if (!refundId) continue;
          connected.push({
            type: "refund",
            id: refundId,
            reference: text(refund, "external_id") ?? "Connected refund",
            href: `/refunds/${refundId}`,
            externalId: text(refund, "external_id"),
          });
        }
      }
    }
  }

  let caseQuery = client
    .from(TABLES.MERCHANT_CLAIMS)
    .select("id,status,claim_type,updated_at")
    .eq("merchant_id", merchantId)
    .limit(20);
  if (type === "ticket") caseQuery = caseQuery.eq("source_ticket_id", id);
  else if (orderId) caseQuery = caseQuery.eq("source_order_id", orderId);
  else caseQuery = caseQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  const caseResult = await caseQuery;
  if (caseResult.error)
    throw new Error(
      `connected_object_cases_failed:${caseResult.error.message}`,
    );
  const payoutCases: ObjectLink[] = (
    (caseResult.data as Record<string, unknown>[] | null) ?? []
  ).map((claim) => ({
    type: "payout case",
    id: text(claim, "id")!,
    reference: `${(text(claim, "claim_type") ?? "payout").replaceAll("_", " ")} · ${text(claim, "id")!.slice(0, 8)}`,
    state: text(claim, "status"),
    href: `/cases/${text(claim, "id")}`,
  }));
  connected.push(...payoutCases);

  const caseIds = payoutCases.map((claim) => claim.id);
  let evidence: ObjectEvidence[] = [];
  if (caseIds.length) {
    const evidenceResult = await client
      .from(TABLES.INTEGRATION_EVIDENCE_ITEMS)
      .select(
        "id,title,summary,evidence_type,source_provider,confidence,occurred_at,raw_reference",
      )
      .eq("merchant_id", merchantId)
      .in("support_payout_case_id", caseIds)
      .order("occurred_at", { ascending: false })
      .limit(20);
    if (evidenceResult.error)
      throw new Error(
        `connected_object_evidence_failed:${evidenceResult.error.message}`,
      );
    evidence = (
      (evidenceResult.data as Record<string, unknown>[] | null) ?? []
    ).map((item) => ({
      id: text(item, "id")!,
      title: text(item, "title") ?? "Source evidence",
      summary: text(item, "summary") ?? "No summary supplied",
      type: text(item, "evidence_type") ?? "evidence",
      provider: text(item, "source_provider") ?? "connected source",
      confidence: text(item, "confidence") ?? "unknown",
      occurredAt: text(item, "occurred_at"),
      reference: text(item, "raw_reference"),
    }));
  }

  const sourceRecord = await loadSourceRecord(client, merchantId, type, id, row);
  let timeline = timelineFor(type, row);
  if (type === "shipment") {
    const trackingResult = await client
      .from(TABLES.SOURCE_TRACKING_EVENTS)
      .select("id,status,source_status,location_text,event_at,source_event_at")
      .eq("merchant_id", merchantId)
      .eq("source_shipment_id", id)
      .order("source_event_at", { ascending: true })
      .limit(50);
    if (trackingResult.error)
      throw new Error(
        `connected_object_tracking_events_failed:${trackingResult.error.message}`,
      );
    const trackingEvents = (
      (trackingResult.data as Record<string, unknown>[] | null) ?? []
    ).map((tracking) =>
      event(
        "Carrier update",
        text(tracking, "source_event_at") ?? text(tracking, "event_at"),
        [
          text(tracking, "source_status") ?? text(tracking, "status"),
          text(tracking, "location_text"),
        ]
          .filter(Boolean)
          .join(" · ") || null,
      ),
    );
    timeline = [...timeline, ...trackingEvents]
      .filter((item) => item.at)
      .sort((left, right) => Date.parse(left.at!) - Date.parse(right.at!));
  }
  let conversation: ObjectConversationEntry[] = [];
  if (type === "ticket") {
    const [messagesResult, activityResult] = await Promise.all([
      client
        .from(TABLES.SOURCE_MESSAGES)
        .select("id,actor_type,channel,visibility,summary,sent_at,source_sent_at,created_at")
        .eq("merchant_id", merchantId)
        .eq("source_ticket_id", id)
        .order("source_sent_at", { ascending: true })
        .limit(100),
      client
        .from(TABLES.SUPPORT_CASE_EVENTS)
        .select("id,event_type,actor_type,summary,occurred_at,created_at")
        .eq("merchant_id", merchantId)
        .eq("source_ticket_id", id)
        .order("occurred_at", { ascending: true })
        .limit(100),
    ]);
    if (messagesResult.error)
      throw new Error(`connected_object_ticket_messages_failed:${messagesResult.error.message}`);
    if (activityResult.error)
      throw new Error(`connected_object_ticket_activity_failed:${activityResult.error.message}`);
    const messages = ((messagesResult.data as Record<string, unknown>[] | null) ?? []).map((message) => ({
      id: text(message, "id")!,
      kind: "message" as const,
      title: "Message",
      summary: text(message, "summary"),
      actor: text(message, "actor_type"),
      visibility: text(message, "visibility"),
      at: text(message, "source_sent_at") ?? text(message, "sent_at") ?? text(message, "created_at"),
    }));
    const activity = ((activityResult.data as Record<string, unknown>[] | null) ?? []).map((item) => ({
      id: text(item, "id")!,
      kind: "activity" as const,
      title: text(item, "event_type") ?? "Ticket activity",
      summary: text(item, "summary"),
      actor: text(item, "actor_type"),
      visibility: null,
      at: text(item, "occurred_at") ?? text(item, "created_at"),
    }));
    conversation = [...messages, ...activity].sort((left, right) => {
      if (!left.at) return 1;
      if (!right.at) return -1;
      return Date.parse(left.at) - Date.parse(right.at);
    });
  }
  const items = await loadItems(client, merchantId, type, id, orderId);
  const firstShipment = connected.find((item) => item.type === "shipment");
  const mainSourceLink = deriveSourceLink({
    context: sourceLinkContext,
    entityType: type,
    row,
    parentOrder: order,
    sourceRecord,
    relatedShipmentExternalId: firstShipment?.externalSource === "shipbob" ? firstShipment?.externalId : null,
  });
  const derivedSourceUrl =
    mainSourceLink?.sourceUrl ??
    (type === "ticket" ? text(row, "external_url") : null);
  const provenance: ObjectProvenance | null = sourceRecord
    ? {
        sourceSystem: text(sourceRecord, "source_system") ?? "connected source",
        externalId:
          text(sourceRecord, "external_id") ?? text(row, "external_id") ?? id,
        sourceUrl:
          text(sourceRecord, "source_url") ??
          derivedSourceUrl,
        freshness: text(sourceRecord, "freshness_state") ?? "unknown",
        syncState: text(sourceRecord, "sync_state") ?? "unknown",
        lastSyncedAt: text(sourceRecord, "last_synced_at"),
        sourceCreatedAt: text(sourceRecord, "source_created_at"),
        sourceUpdatedAt: text(sourceRecord, "source_updated_at"),
        connectorVersion: text(sourceRecord, "connector_version"),
        payloadHash: text(sourceRecord, "payload_hash"),
      }
    : mainSourceLink
      ? {
          sourceSystem: mainSourceLink.sourceSystem,
          externalId: mainSourceLink.externalId,
          sourceUrl: derivedSourceUrl,
          freshness: "unknown",
          syncState: "unknown",
          lastSyncedAt: null,
          sourceCreatedAt: null,
          sourceUpdatedAt: null,
          connectorVersion: null,
          payloadHash: null,
        }
      : null;

  return {
    id,
    type,
    reference: text(row, config.reference) ?? text(row, "external_id") ?? id,
    sourceId: text(row, "external_id"),
    provider:
      text(row, "provider") ??
      text(row, "source") ??
      text(row, "carrier") ??
      provenance?.sourceSystem ??
      null,
    state: text(row, "status") ?? text(row, "financial_status"),
    updatedAt: text(row, config.date),
    amount: config.amount ? numberValue(row, config.amount) : null,
    currency: text(row, "currency"),
    sourceOrderId: orderId,
    customer,
    connected,
    facts: factsFor(type, row),
    items,
    timeline,
    conversation,
    evidence,
    payoutCases,
    provenance,
  };
}
