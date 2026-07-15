import { randomUUID } from 'node:crypto';
import type { ShopifyDisputeNode } from '@/lib/integrations/providers/shopify';
import type {
  ShipBobOrder,
  ShipBobReturn,
  ShipBobTimelineEvent,
} from '@/lib/integrations/providers/shipbob';
import { getIntegrationProvider, requireIntegrationProvider } from '@/lib/integrations/registry';
import { stableEvidenceId } from '@/lib/integrations/stableEvidenceId';
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

type ProviderMapInput = BaseMapInput & {
  sourceProvider: string;
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
  id?: string;
}): NormalizedEvidenceItem {
  const provider = requireIntegrationProvider(input.sourceProvider);
  const rawReference = input.rawReference ?? undefined;
  const id = input.id ?? (
    rawReference
      ? stableEvidenceId(input.merchantId, input.sourceProvider, input.evidenceType, rawReference)
      : randomUUID()
  );
  return {
    id,
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

export function mapShipBobFulfillmentToEvidence(
  order: ShipBobOrder,
  timelines: ShipBobTimelineEvent[],
  returnOrder: ShipBobReturn | null,
  input: BaseMapInput,
): NormalizedEvidenceItem[] {
  const reference = order.reference_id || order.id;
  const pickPackEvents = timelines.filter((event) => /pick|pack|fulfill|ship/i.test(event.description));
  const exception = timelines.find((event) => /exception|failed|delay|short|missing|damage/i.test(event.description));
  const items = [createEvidence({
    ...input,
    sourceProvider: 'shipbob',
    evidenceType: 'warehouse_pick_pack',
    title: 'ShipBob fulfillment record',
    summary: `${order.shipments.length} shipment(s), ${pickPackEvents.length} pick/pack event(s)`,
    confidence: pickPackEvents.length > 0 ? 'high' : 'medium',
    value: pickPackEvents.length,
    occurredAt: firstDate(...timelines.map((event) => event.event_date)),
    rawReference: JSON.stringify({ order: order.raw, timelines }),
    id: stableEvidenceId(input.merchantId, 'shipbob', 'warehouse_pick_pack', reference),
  })];

  if (exception) {
    items.push(createEvidence({
      ...input,
      sourceProvider: 'shipbob',
      evidenceType: 'warehouse_exception',
      title: 'ShipBob fulfillment exception',
      summary: exception.description,
      confidence: 'high',
      value: true,
      occurredAt: firstDate(exception.event_date),
      rawReference: JSON.stringify(exception),
      id: stableEvidenceId(input.merchantId, 'shipbob', 'warehouse_exception', `${reference}:${exception.event_date}`),
    }));
  }

  if (returnOrder) {
    items.push(createEvidence({
      ...input,
      sourceProvider: 'shipbob',
      evidenceType: 'three_pl_sla_claim_status',
      title: 'ShipBob return status',
      summary: `Return ${returnOrder.id}: ${returnOrder.status}`,
      confidence: 'high',
      value: returnOrder.status,
      rawReference: JSON.stringify(returnOrder.raw),
      id: stableEvidenceId(input.merchantId, 'shipbob', 'three_pl_sla_claim_status', returnOrder.id),
    }));
  }

  return items;
}

export function mapSupportTicketToEvidence(
  ticket: Record<string, any> | null | undefined,
  input: ProviderMapInput,
): NormalizedEvidenceItem[] {
  if (!ticket) return [];
  const items: NormalizedEvidenceItem[] = [];
  const providerName = getIntegrationProvider(input.sourceProvider)?.name ?? 'Helpdesk';
  const subject = firstString(ticket.subject, ticket.external_id) ?? `${providerName} ticket`;
  items.push(createEvidence({
    ...input,
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

export function mapCommerceOrderToEvidence(
  order: Record<string, any> | null | undefined,
  input: ProviderMapInput,
): NormalizedEvidenceItem[] {
  if (!order) return [];
  const providerName = getIntegrationProvider(input.sourceProvider)?.name ?? 'Commerce';
  const title = order.order_number ? `${providerName} order ${order.order_number}` : `${providerName} order`;
  const items: NormalizedEvidenceItem[] = [
    createEvidence({
      ...input,
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

export function mapCommerceRefundToEvidence(
  refund: Record<string, any>,
  input: ProviderMapInput,
): NormalizedEvidenceItem {
  return createEvidence({
    ...input,
    evidenceType: 'refund_history',
    title: 'Refund history',
    summary: refund.amount != null ? `Refund ${refund.currency ?? ''} ${refund.amount}`.trim() : 'Refund record found',
    value: refund.amount ?? null,
    occurredAt: firstDate(refund.refunded_at, refund.ingested_at),
    rawReference: refund.id ?? refund.external_id ?? null,
  });
}

export function mapCommerceFulfillmentToEvidence(
  fulfillment: Record<string, any>,
  input: ProviderMapInput,
): NormalizedEvidenceItem[] {
  const trackingNumber = firstString(fulfillment.tracking_number);
  const items: NormalizedEvidenceItem[] = [];
  if (trackingNumber) {
    items.push(createEvidence({
      ...input,
      evidenceType: 'tracking_number',
      title: `Tracking number from ${getIntegrationProvider(input.sourceProvider)?.name ?? 'commerce'} fulfillment`,
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

function extractProofValues(providerId: 'ups' | 'fedex', payload: Record<string, any>) {
  const fedexImages = Array.isArray(payload.output?.completeTrackResults?.[0]?.trackResults?.[0]?.availableImages)
    ? payload.output.completeTrackResults[0].trackResults[0].availableImages
    : [];
  const hasFedexImage = (term: string) =>
    fedexImages.some((image: unknown) => String(image ?? '').toLowerCase().includes(term));
  const signature =
    firstString(payload.signature, payload.signatureImage, payload.signature_image, payload.output?.signatureName) ??
    (providerId === 'fedex' && hasFedexImage('signature') ? 'signature proof available' : null);
  const photo =
    firstString(payload.deliveryPhoto, payload.delivery_photo, payload.photo, payload.image, payload.output?.deliveryPhoto) ??
    (providerId === 'fedex' && (hasFedexImage('photo') || hasFedexImage('picture')) ? 'delivery photo available' : null);
  return {
    providerName: getIntegrationProvider(providerId)?.name ?? providerId,
    signature,
    photo,
  };
}

function carrierTrackingDetails(providerId: 'ups' | 'fedex', payload: Record<string, any>) {
  if (providerId === 'ups') {
    const shipment = payload.trackResponse?.shipment?.[0] ?? {};
    const pkg = shipment.package?.[0] ?? {};
    const events = Array.isArray(pkg.activity) ? pkg.activity : [];
    const status = firstString(pkg.currentStatus?.description, pkg.currentStatus?.code, shipment.currentStatus?.description);
    const lastEvent = events[0] ?? {};
    return {
      status,
      events,
      occurredAt: firstDate(lastEvent.date, lastEvent.time, pkg.deliveryDate?.[0]?.date),
      estimatedAt: firstDate(pkg.deliveryTime?.endTime, pkg.deliveryDate?.[0]?.date),
    };
  }
  const result = payload.output?.completeTrackResults?.[0]?.trackResults?.[0] ?? {};
  const events = Array.isArray(result.scanEvents) ? result.scanEvents : [];
  const dates = Array.isArray(result.dateAndTimes) ? result.dateAndTimes : [];
  const actualDelivery = dates.find((entry: any) => entry.type === 'ACTUAL_DELIVERY')?.dateTime;
  const estimatedDelivery = dates.find((entry: any) => String(entry.type ?? '').includes('ESTIMATED'))?.dateTime;
  return {
    status: firstString(result.latestStatusDetail?.description, result.latestStatusDetail?.code),
    events,
    occurredAt: firstDate(actualDelivery, events[0]?.date, events[0]?.dateTime),
    estimatedAt: firstDate(estimatedDelivery, result.estimatedDeliveryTimeWindow?.window?.ends),
  };
}

export function mapCarrierProofToEvidence(
  providerId: 'ups' | 'fedex',
  payload: Record<string, any>,
  input: BaseMapInput & { trackingNumber?: string | null },
): NormalizedEvidenceItem[] {
  const proof = extractProofValues(providerId, payload);
  const reference = firstString(input.trackingNumber, payload.trackingNumber, payload.trackResponse?.shipment?.[0]?.package?.[0]?.trackingNumber);
  const tracking = carrierTrackingDetails(providerId, payload);
  const exceptionCount = tracking.events.filter((event: any) => {
    const value = JSON.stringify(event).toLowerCase();
    return value.includes('exception') || value.includes('failed') || value.includes('delay');
  }).length;
  return [
    createEvidence({
      ...input,
      sourceProvider: providerId,
      evidenceType: 'tracking_number',
      title: `${proof.providerName} tracking number`,
      summary: `${proof.providerName} ${reference ?? 'tracking reference unavailable'}`,
      value: reference ?? null,
      rawReference: reference,
    }),
    createEvidence({
      ...input,
      sourceProvider: providerId,
      evidenceType: 'delivery_status',
      title: `${proof.providerName} delivery status`,
      summary: tracking.status ?? 'Status unavailable',
      value: tracking.status ?? null,
      confidence: tracking.status ? 'high' : 'medium',
      occurredAt: tracking.occurredAt ?? tracking.estimatedAt ?? undefined,
      rawReference: reference,
    }),
    createEvidence({
      ...input,
      sourceProvider: providerId,
      evidenceType: 'tracking_events',
      title: `${proof.providerName} tracking event history`,
      summary: `${tracking.events.length} tracking event(s)${exceptionCount ? `, ${exceptionCount} exception event(s)` : ''}`,
      value: tracking.events.length,
      confidence: tracking.events.length > 0 ? 'high' : 'medium',
      occurredAt: tracking.occurredAt ?? undefined,
      rawReference: reference,
    }),
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
      sourceProvider: 'document_upload',
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
      sourceProvider: 'document_upload',
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

export function mapSelfFulfillmentPackConfirmationToEvidence(
  confirmation: Record<string, any>,
  input: BaseMapInput,
): NormalizedEvidenceItem[] {
  const reference = firstString(confirmation.order_id, confirmation.fulfillment_id, confirmation.id);
  const confirmedAt = firstDate(confirmation.confirmed_at, confirmation.created_at);
  const items: NormalizedEvidenceItem[] = [
    createEvidence({
      ...input,
      sourceProvider: 'self_fulfillment_pack',
      evidenceType: 'self_reported_pack_confirmation',
      title: 'Self-reported pack confirmation',
      summary: confirmation.item_match_confirmed === true
        ? 'Self-reported by merchant: item, SKU, and quantity confirmed at pack time'
        : 'Self-reported by merchant: pack confirmation recorded without item match confirmation',
      confidence: 'low',
      value: confirmation.item_match_confirmed === true,
      occurredAt: confirmedAt,
      rawReference: reference,
    }),
  ];

  if (confirmation.photo_url) {
    items.push(createEvidence({
      ...input,
      sourceProvider: 'self_fulfillment_pack',
      evidenceType: 'self_reported_pack_photo',
      title: 'Self-reported pack photo',
      summary: 'Self-reported by merchant: optional pack-time photo attached',
      confidence: 'low',
      value: String(confirmation.photo_url),
      occurredAt: confirmedAt,
      rawReference: reference,
    }));
  }

  return items;
}
