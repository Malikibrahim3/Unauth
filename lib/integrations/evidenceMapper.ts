import { randomUUID } from 'node:crypto';
import type { ShopifyDisputeNode } from '@/lib/integrations/providers/shopify';
import { getIntegrationProvider, requireIntegrationProvider } from '@/lib/integrations/registry';
import type {
  EvidenceCapability,
  IntegrationCategory,
  NormalizedEvidenceItem,
} from '@/lib/integrations/types';

type BaseMapInput = {
  merchantId: string;
  supportPayoutCaseId?: string | null;
  now?: string;
};

function createEvidence(input: BaseMapInput & {
  sourceProvider: string;
  sourceCategory?: IntegrationCategory;
  evidenceType: EvidenceCapability;
  title: string;
  summary: string;
  confidence?: 'high' | 'medium' | 'low';
  value?: string | number | boolean | null;
  occurredAt?: string | null;
  rawReference?: string | null;
}): NormalizedEvidenceItem {
  const provider = requireIntegrationProvider(input.sourceProvider);
  return {
    id: randomUUID(),
    merchantId: input.merchantId,
    supportPayoutCaseId: input.supportPayoutCaseId ?? undefined,
    sourceProvider: input.sourceProvider,
    sourceCategory: input.sourceCategory ?? provider.category,
    evidenceType: input.evidenceType,
    title: input.title,
    summary: input.summary,
    confidence: input.confidence ?? 'high',
    value: input.value,
    occurredAt: input.occurredAt ?? undefined,
    rawReference: input.rawReference ?? undefined,
    createdAt: input.now ?? new Date().toISOString(),
  };
}

function stringifyValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const stringValue = stringifyValue(value);
    if (stringValue) return stringValue;
  }
  return null;
}

function firstDate(...values: unknown[]): string | null {
  for (const value of values) {
    const stringValue = stringifyValue(value);
    if (!stringValue) continue;
    const ms = Date.parse(stringValue);
    if (Number.isFinite(ms)) return new Date(ms).toISOString();
  }
  return null;
}

export function mapGorgiasTicketToEvidence(
  ticket: Record<string, any> | null | undefined,
  input: BaseMapInput,
): NormalizedEvidenceItem[] {
  if (!ticket) return [];
  const items: NormalizedEvidenceItem[] = [];
  const subject = firstString(ticket.subject, ticket.external_id) ?? 'Gorgias ticket';
  items.push(createEvidence({
    ...input,
    sourceProvider: 'gorgias',
    evidenceType: 'ticket_messages',
    title: 'Support ticket on file',
    summary: subject,
    value: ticket.external_id ?? ticket.id ?? null,
    occurredAt: firstDate(ticket.created_at, ticket.updated_at),
    rawReference: ticket.id ?? ticket.external_id ?? null,
  }));
  if (ticket.reason_raw || ticket.reason_normalized) {
    items.push(createEvidence({
      ...input,
      sourceProvider: 'gorgias',
      evidenceType: 'customer_claim_reason',
      title: 'Customer claim reason',
      summary: firstString(ticket.reason_normalized, ticket.reason_raw) ?? 'Claim reason captured from helpdesk',
      value: firstString(ticket.reason_normalized, ticket.reason_raw),
      confidence: ticket.reason_normalized ? 'high' : 'medium',
      rawReference: ticket.id ?? ticket.external_id ?? null,
    }));
  }
  return items;
}

export function mapShopifyOrderToEvidence(
  order: Record<string, any> | null | undefined,
  input: BaseMapInput,
): NormalizedEvidenceItem[] {
  if (!order) return [];
  const title = order.order_number ? `Shopify order ${order.order_number}` : 'Shopify order';
  const items: NormalizedEvidenceItem[] = [
    createEvidence({
      ...input,
      sourceProvider: 'shopify',
      evidenceType: 'order_value',
      title,
      summary: order.total_price != null ? `Order value ${order.currency ?? ''} ${order.total_price}`.trim() : 'Order value captured',
      value: order.total_price ?? null,
      occurredAt: firstDate(order.placed_at, order.created_at),
      rawReference: order.id ?? order.external_id ?? null,
    }),
  ];
  if (order.line_items_count != null) {
    items.push(createEvidence({
      ...input,
      sourceProvider: 'shopify',
      evidenceType: 'line_items',
      title: 'Line items on order',
      summary: `${order.line_items_count} line item(s) recorded`,
      value: Number(order.line_items_count),
      rawReference: order.id ?? order.external_id ?? null,
    }));
  }
  return items;
}

export function mapShopifyRefundToEvidence(
  refund: Record<string, any>,
  input: BaseMapInput,
): NormalizedEvidenceItem {
  return createEvidence({
    ...input,
    sourceProvider: 'shopify',
    evidenceType: 'refund_history',
    title: 'Refund history',
    summary: refund.amount != null ? `Refund ${refund.currency ?? ''} ${refund.amount}`.trim() : 'Refund record found',
    value: refund.amount ?? null,
    occurredAt: firstDate(refund.refunded_at, refund.ingested_at),
    rawReference: refund.id ?? refund.external_id ?? null,
  });
}

export function mapShopifyFulfillmentToEvidence(
  fulfillment: Record<string, any>,
  input: BaseMapInput,
): NormalizedEvidenceItem[] {
  const trackingNumber = firstString(fulfillment.tracking_number);
  const items: NormalizedEvidenceItem[] = [];
  if (trackingNumber) {
    items.push(createEvidence({
      ...input,
      sourceProvider: 'shopify',
      evidenceType: 'tracking_number',
      title: 'Tracking number from Shopify fulfillment',
      summary: `${fulfillment.tracking_company ?? 'Carrier'} ${trackingNumber}`.trim(),
      value: trackingNumber,
      occurredAt: firstDate(fulfillment.occurred_at, fulfillment.updated_at_source),
      rawReference: fulfillment.id ?? fulfillment.external_id ?? null,
    }));
  }
  return items;
}

export function mapShopifyDisputeToEvidence(
  dispute: ShopifyDisputeNode | Record<string, any>,
  input: BaseMapInput,
): NormalizedEvidenceItem[] {
  const disputePayload = dispute as Record<string, any>;
  const amount = disputePayload.amount?.amount ?? disputePayload.amount;
  const currency = disputePayload.amount?.currencyCode ?? disputePayload.currency ?? '';
  const reason = firstString(disputePayload.reasonDetails?.reason, disputePayload.reason, disputePayload.reasonDetails?.networkReasonCode) ?? 'Dispute reason not specified';
  const status = firstString(disputePayload.status) ?? 'unknown';
  const initiatedAt = firstDate(disputePayload.initiatedAt, disputePayload.initiated_at);
  const evidenceDueBy = firstDate(disputePayload.evidenceDueBy, disputePayload.evidence_due_by);
  const rawReference = firstString(disputePayload.id, disputePayload.external_id, disputePayload.legacyResourceId);
  return [
    createEvidence({
      ...input,
      sourceProvider: 'shopify',
      evidenceType: 'dispute_status',
      title: 'Shopify Payments dispute',
      summary: `${status} dispute: ${reason}`,
      value: status,
      occurredAt: initiatedAt,
      rawReference,
    }),
    createEvidence({
      ...input,
      sourceProvider: 'shopify',
      evidenceType: 'chargeback_evidence',
      title: 'Dispute amount and reason',
      summary: amount != null ? `${currency} ${amount} disputed for ${reason}`.trim() : reason,
      value: amount != null ? Number(amount) : reason,
      confidence: amount != null ? 'high' : 'medium',
      rawReference,
    }),
    ...(evidenceDueBy
      ? [
          createEvidence({
            ...input,
            sourceProvider: 'shopify',
            evidenceType: 'recovery_deadline',
            title: 'Dispute evidence deadline',
            summary: `Evidence due ${evidenceDueBy}`,
            value: evidenceDueBy,
            occurredAt: evidenceDueBy,
            rawReference,
          }),
        ]
      : []),
  ];
}

export function mapAfterShipTrackingToEvidence(
  tracking: Record<string, any>,
  input: BaseMapInput,
): NormalizedEvidenceItem[] {
  const trackingNumber = firstString(tracking.tracking_number, tracking.trackingNumber);
  const carrier = firstString(tracking.slug, tracking.carrier, tracking.courier_slug, tracking.courier) ?? 'Carrier';
  const status = firstString(tracking.tag, tracking.delivery_status, tracking.status, tracking.subtag_message);
  const checkpoints = Array.isArray(tracking.checkpoints)
    ? tracking.checkpoints
    : Array.isArray(tracking.events)
      ? tracking.events
      : [];
  const exceptionEvents = checkpoints.filter((event: any) => {
    const tag = String(event.tag ?? event.subtag ?? event.message ?? '').toLowerCase();
    return tag.includes('exception') || tag.includes('failed') || tag.includes('delay');
  });

  const items: NormalizedEvidenceItem[] = [];
  if (trackingNumber) {
    items.push(createEvidence({
      ...input,
      sourceProvider: 'aftership',
      evidenceType: 'tracking_number',
      title: 'Tracking number',
      summary: `${carrier} ${trackingNumber}`,
      value: trackingNumber,
      rawReference: firstString(tracking.id, trackingNumber),
    }));
  }
  if (status) {
    items.push(createEvidence({
      ...input,
      sourceProvider: 'aftership',
      evidenceType: 'delivery_status',
      title: 'Tracking status',
      summary: status,
      value: status,
      occurredAt: firstDate(tracking.updated_at, tracking.delivered_at, tracking.shipment_delivery_date),
      rawReference: firstString(tracking.id, trackingNumber),
    }));
  }
  items.push(createEvidence({
    ...input,
    sourceProvider: 'aftership',
    evidenceType: 'tracking_events',
    title: 'Tracking event history',
    summary: `${checkpoints.length} tracking event(s)${exceptionEvents.length ? `, ${exceptionEvents.length} exception event(s)` : ''}`,
    value: checkpoints.length,
    confidence: checkpoints.length > 0 ? 'high' : 'medium',
    occurredAt: firstDate(tracking.shipment_delivery_date, tracking.delivered_at, tracking.expected_delivery, tracking.updated_at),
    rawReference: firstString(tracking.id, trackingNumber),
  }));
  return items;
}

function extractProofValues(providerId: 'ups' | 'fedex', payload: Record<string, any>) {
  const json = JSON.stringify(payload);
  const signature =
    firstString(payload.signature, payload.signatureImage, payload.signature_image, payload.output?.signatureName) ??
    (json.toLowerCase().includes('signature') ? 'signature referenced' : null);
  const photo =
    firstString(payload.deliveryPhoto, payload.delivery_photo, payload.photo, payload.image, payload.output?.deliveryPhoto) ??
    (json.toLowerCase().includes('picture proof') || json.toLowerCase().includes('deliveryphoto') ? 'delivery photo referenced' : null);
  return {
    providerName: getIntegrationProvider(providerId)?.name ?? providerId,
    signature,
    photo,
  };
}

export function mapCarrierProofToEvidence(
  providerId: 'ups' | 'fedex',
  payload: Record<string, any>,
  input: BaseMapInput & { trackingNumber?: string | null },
): NormalizedEvidenceItem[] {
  const proof = extractProofValues(providerId, payload);
  const reference = firstString(input.trackingNumber, payload.trackingNumber, payload.trackResponse?.shipment?.[0]?.package?.[0]?.trackingNumber);
  return [
    createEvidence({
      ...input,
      sourceProvider: providerId,
      evidenceType: 'signature',
      title: `${proof.providerName} signature proof`,
      summary: proof.signature ? 'Signature proof found' : 'Signature proof attempted, not available for this shipment',
      value: proof.signature,
      confidence: proof.signature ? 'high' : 'medium',
      rawReference: reference,
    }),
    createEvidence({
      ...input,
      sourceProvider: providerId,
      evidenceType: 'delivery_photo',
      title: `${proof.providerName} delivery photo`,
      summary: proof.photo ? 'Delivery photo found' : 'Delivery photo attempted, not available for this shipment',
      value: proof.photo,
      confidence: proof.photo ? 'high' : 'medium',
      rawReference: reference,
    }),
  ];
}

export function mapApprovedPartnerTermsToEvidence(
  terms: Record<string, any>,
  input: BaseMapInput,
): NormalizedEvidenceItem[] {
  const items: NormalizedEvidenceItem[] = [
    createEvidence({
      ...input,
      sourceProvider: 'source_documents',
      evidenceType: 'contract_terms',
      title: 'Approved partner terms',
      summary: `${terms.partner_type ?? 'Partner'} terms approved`,
      value: terms.required_evidence ? JSON.stringify(terms.required_evidence) : null,
      confidence: terms.confidence === 'low' ? 'low' : terms.confidence === 'medium' ? 'medium' : 'high',
      occurredAt: firstDate(terms.approved_at, terms.created_at),
      rawReference: terms.document_id ?? terms.id ?? null,
    }),
  ];
  if (terms.claim_deadline_days != null) {
    items.push(createEvidence({
      ...input,
      sourceProvider: 'source_documents',
      evidenceType: 'recovery_deadline',
      title: 'Recovery claim deadline',
      summary: `${terms.claim_deadline_days} day claim deadline`,
      value: Number(terms.claim_deadline_days),
      confidence: 'high',
      rawReference: terms.document_id ?? terms.id ?? null,
    }));
  }
  return items;
}

export function evidenceRowsFromNormalized(items: NormalizedEvidenceItem[]) {
  return items.map((item) => ({
    id: item.id,
    merchant_id: item.merchantId,
    support_payout_case_id: item.supportPayoutCaseId ?? null,
    source_provider: item.sourceProvider,
    source_category: item.sourceCategory,
    evidence_type: item.evidenceType,
    title: item.title,
    summary: item.summary,
    confidence: item.confidence,
    value: item.value === undefined ? null : item.value,
    occurred_at: item.occurredAt ?? null,
    raw_reference: item.rawReference ?? null,
    created_at: item.createdAt,
  }));
}
