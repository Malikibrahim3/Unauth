import { labelFor } from "@/lib/copy/labels";

export function labelize(value: string) {
  return labelFor(value);
}

export type RoadmapTransaction = {
  source_order_id: string;
  order_id: string;
  processed_at: string;
  order_value: number | string | null;
  currency?: string | null;
  customer_email?: string | null;
  /** Alias email when this order came from a linked sibling record (not the primary). */
  via_email?: string | null;
  customer_name?: string | null;
  shipping_address?: string | null;
  card_last4?: string | null;
  device_ip?: string | null;
  source?: string | null;
  chargeback_filed?: boolean | null;
  refund_claimed?: boolean | null;
  chargeback_date?: string | null;
  chargeback_reason_code?: string | null;
  refund_reason?: string | null;
  fraud_flags?: string[] | null;
  risk_level?: string | null;
};

export const CLAIM_TYPE_LABELS: Record<string, string> = {
  missing_parcel: "Missing parcel",
  damaged: "Damaged item",
  wrong_item: "Wrong item",
  refund_request: "Refund request",
  chargeback: "Chargeback",
  return_abuse: "Return abuse",
  other: "Other",
};

export const CLAIM_STATUS_LABELS: Record<string, string> = {
  open: "Open",
  under_review: "Under review",
  evidence_requested: "Evidence requested",
  pending: "Pending external evidence",
  escalated: "Escalated",
  resolved: "Resolved",
  closed: "Closed",
};

export function firstArrayValue(value: unknown): string | null {
  return Array.isArray(value) && typeof value[0] === "string" && value[0].trim()
    ? value[0].trim()
    : null;
}
