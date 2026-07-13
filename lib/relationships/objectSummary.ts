import { TABLES } from "@/lib/supabase/tables";

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
  timeline: ObjectTimelineEvent[];
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
  const orderId = type === "order" ? id : text(row, "source_order_id");
  let order: Record<string, unknown> | null = type === "order" ? row : null;
  if (orderId && !order) {
    const result = await client
      .from(TABLES.SOURCE_ORDERS)
      .select("id,external_id,order_number,source_customer_id")
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
      .select("id,merchant_customer_id,first_name,last_name,email")
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
    }
  }

  const connected: ObjectLink[] = [];
  if (orderId) {
    if (type !== "order" && order)
      connected.push({
        type: "order",
        id: text(order, "id")!,
        reference:
          text(order, "order_number") ??
          text(order, "external_id") ??
          text(order, "id")!,
        href: `/orders/${text(order, "id")}`,
      });
    const families = [
      ["shipment", TABLES.SOURCE_SHIPMENTS, "tracking_number", "status"],
      ["refund", TABLES.SOURCE_REFUNDS, "external_id", null],
      ["return", TABLES.SOURCE_RETURNS, "external_id", "status"],
      ["dispute", TABLES.SOURCE_DISPUTES, "external_id", "status"],
    ] as const;
    const relationshipResults = await Promise.all(
      families
        .filter(([childType]) => childType !== type)
        .map(async ([childType, table, referenceField, stateField]) => {
          const fields = ["id", referenceField, stateField]
            .filter(Boolean)
            .join(",");
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
        connected.push({
          type: childType,
          id: childId,
          reference: text(child, referenceField) ?? childId,
          state: stateField ? text(child, stateField) : null,
          href: `/${childType}s/${childId}`,
        });
      }
    }
  }
  if (customer) connected.unshift(customer);

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
    href: `/claims/${text(claim, "id")}`,
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

  const sourceRecordId = text(row, "source_record_id");
  let provenanceQuery = client
    .from(TABLES.SOURCE_RECORDS)
    .select(
      "source_system,external_id,source_url,freshness_state,sync_state,last_synced_at,source_created_at,source_updated_at,connector_version,payload_hash",
    )
    .eq("merchant_id", merchantId);
  provenanceQuery = sourceRecordId
    ? provenanceQuery.eq("id", sourceRecordId)
    : provenanceQuery
        .eq("canonical_entity_id", id)
        .eq("canonical_entity_type", type);
  const provenanceResult = await provenanceQuery
    .order("last_synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (provenanceResult.error)
    throw new Error(
      `connected_object_provenance_failed:${provenanceResult.error.message}`,
    );
  const sourceRecord = provenanceResult.data as Record<string, unknown> | null;
  const provenance: ObjectProvenance | null = sourceRecord
    ? {
        sourceSystem: text(sourceRecord, "source_system") ?? "connected source",
        externalId:
          text(sourceRecord, "external_id") ?? text(row, "external_id") ?? id,
        sourceUrl:
          text(sourceRecord, "source_url") ??
          (type === "ticket" ? text(row, "external_url") : null),
        freshness: text(sourceRecord, "freshness_state") ?? "unknown",
        syncState: text(sourceRecord, "sync_state") ?? "unknown",
        lastSyncedAt: text(sourceRecord, "last_synced_at"),
        sourceCreatedAt: text(sourceRecord, "source_created_at"),
        sourceUpdatedAt: text(sourceRecord, "source_updated_at"),
        connectorVersion: text(sourceRecord, "connector_version"),
        payloadHash: text(sourceRecord, "payload_hash"),
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
    timeline: timelineFor(type, row),
    evidence,
    payoutCases,
    provenance,
  };
}
