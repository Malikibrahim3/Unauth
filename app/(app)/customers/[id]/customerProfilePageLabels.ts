import { labelFor } from "@/lib/copy/labels";
import { shortRef } from "@/lib/ui/displayRef";
import { label } from "@/lib/ui/labels";

export function labelize(value: string) {
  return labelFor(value);
}

export type RoadmapTransaction = {
  source_order_id: string;
  order_id: string;
  external_href?: string | null;
  external_source?: string | null;
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
  line_items?: Array<{
    title: string | null;
    quantity: number | null;
    unit_price_minor: number | null;
    total_minor: number | null;
    currency: string | null;
  }> | null;
  shipment?: {
    carrier: string | null;
    status: string | null;
    tracking_number: string | null;
    shipped_at: string | null;
    delivered_at: string | null;
    external_href?: string | null;
    external_source?: string | null;
  } | null;
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

export function customerClaimSummaryDisplay(claim: {
  id: string;
  claim_type: string;
  status: string;
  order_ref?: string | null;
  shopify_order_id?: string | null;
}) {
  return {
    status: label('caseStatus', claim.status),
    claimType: label('claimType', claim.claim_type),
    orderReference:
      shortRef(claim.order_ref ?? claim.shopify_order_id, claim.id),
  };
}

export function firstArrayValue(value: unknown): string | null {
  return Array.isArray(value) && typeof value[0] === "string" && value[0].trim()
    ? value[0].trim()
    : null;
}
