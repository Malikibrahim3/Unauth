import { labelFor } from "@/lib/copy/labels";
import { shortRef } from "@/lib/ui/displayRef";
import { label } from "@/lib/ui/labels";
import { formatCurrencyNullable, formatNumber } from "@/lib/utils/format";

export type CustomerDataCoverage = "complete" | "partial" | "unavailable";

function observedCount(value: number | null, coverage: CustomerDataCoverage, noun: string): string {
  if (coverage === "complete") {
    if (value == null) return "Unavailable";
    return `${formatNumber(value)} ${noun}${value === 1 ? "" : "s"}`;
  }
  if (value != null && value > 0) return `${formatNumber(value)} ${noun}${value === 1 ? "" : "s"} observed · partial`;
  return "Unavailable";
}

export function buildCustomerProfileMetricLabels(input: {
  orderCoverage: CustomerDataCoverage;
  caseCoverage: CustomerDataCoverage;
  merchantOrderCount: number | null;
  merchantClaimCount: number | null;
  merchantChargebackCount: number | null;
  totalOrderValue: number | null;
  totalRefundedValue: number | null;
  displayCurrency: string | null;
  merchantNarrative: string;
}) {
  const orderValueKnown = input.totalOrderValue != null && input.displayCurrency != null;
  const caseValueKnown = input.totalRefundedValue != null && input.displayCurrency != null;
  const lifetimeValue = orderValueKnown
    ? `${formatCurrencyNullable(input.totalOrderValue, input.displayCurrency)}${input.orderCoverage === "complete" ? "" : " observed · partial"}`
    : "Unavailable";
  const orders = input.merchantOrderCount == null
    ? "Unavailable"
    : input.orderCoverage === "complete"
      ? formatNumber(input.merchantOrderCount)
      : input.merchantOrderCount > 0
        ? `${formatNumber(input.merchantOrderCount)} observed · partial`
        : "Unavailable";
  const averageOrder = input.orderCoverage === "complete"
    && input.merchantOrderCount != null
    && input.merchantOrderCount > 0
    && orderValueKnown
    ? `Average ${formatCurrencyNullable(input.totalOrderValue! / input.merchantOrderCount, input.displayCurrency)}`
    : "Average unavailable";
  const caseContext = input.caseCoverage === "complete" && input.merchantClaimCount === 0
    ? "No recorded cases"
    : observedCount(input.merchantClaimCount, input.caseCoverage, "case");
  const caseDescription = input.merchantChargebackCount != null && input.merchantChargebackCount > 0
    ? observedCount(input.merchantChargebackCount, input.caseCoverage, "chargeback")
    : input.caseCoverage === "complete"
      ? input.merchantNarrative
      : "Case history coverage incomplete";
  const tiedValue = caseValueKnown
    ? `${formatCurrencyNullable(input.totalRefundedValue, input.displayCurrency)}${input.orderCoverage === "complete" && input.caseCoverage === "complete" ? "" : " observed · partial"}`
    : "Unavailable";
  const caseRate = input.orderCoverage === "complete"
    && input.caseCoverage === "complete"
    && input.merchantOrderCount != null
    && input.merchantOrderCount > 0
    && input.merchantClaimCount != null
    ? `${Math.round((input.merchantClaimCount / input.merchantOrderCount) * 100)}% case rate`
    : "Case rate unavailable";

  return {
    lifetimeValue,
    lifetimeValueDescription: input.orderCoverage === "complete" ? "Merchant-owned orders" : "Observed merchant-owned orders",
    orders,
    averageOrder,
    caseContext,
    caseDescription,
    tiedValue,
    caseRate,
  };
}

export function linkageIndicatorBasis(input: {
  identifierCount: number;
  signalLabel: string;
  observedOrderCount: number;
}): string {
  return `Basis: ${formatNumber(input.identifierCount)} distinct ${input.signalLabel} identifier${input.identifierCount === 1 ? "" : "s"} across ${formatNumber(input.observedOrderCount)} observed order${input.observedOrderCount === 1 ? "" : "s"}.`;
}

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
