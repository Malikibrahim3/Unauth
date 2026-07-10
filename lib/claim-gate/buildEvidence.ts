import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ClaimGateClaimType,
  ClaimGateEvidence,
  ClaimGateEvidenceSummary,
  ClaimGateFulfillmentEvidence,
  ClaimGateShipBobEvidence,
} from '@/lib/claim-gate/types';
import { getTracking, type AfterShipTracking } from '@/lib/integrations/providers/aftership';
import {
  getOrderByReferenceId,
  getReturnForOrder,
  getShipmentTimeline,
  type ShipBobOrder,
  type ShipBobReturn,
  type ShipBobTimelineEvent,
} from '@/lib/integrations/providers/shipbob';
import { getProviderCredential } from '@/lib/integrations/getProviderCredential';
import { stableEvidenceId } from '@/lib/integrations/stableEvidenceId';

const DEFAULT_CURRENCY = 'GBP';
const CARRIER_CLAIM_WINDOWS_DAYS: Record<string, number> = {
  'royal-mail': 80,
  evri: 28,
  dpd: 28,
  dhl: 30,
  ups: 60,
  fedex: 60,
  usps: 60,
  default: 30,
};

function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

function numberValue(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function stringValue(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

async function findOrder(
  client: SupabaseClient,
  merchantId: string,
  externalOrderId: string | null,
  customerEmail?: string | null,
) {
  const select = 'id, external_id, order_number, email, customer_email, currency, total_price, order_value, subtotal_price, financial_status, fulfillment_state, placed_at';
  if (externalOrderId) {
    const clean = externalOrderId.replace(/^#/, '').trim();
    const { data: byExternal, error: externalError } = await client
      .from('source_orders')
      .select(select)
      .eq('merchant_id', merchantId)
      .eq('external_id', clean)
      .order('placed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (externalError) throw new Error(`claim_gate_order_lookup_failed: ${externalError.message}`);
    if (byExternal) return byExternal as Record<string, unknown>;

    const { data: byNumber, error: numberError } = await client
      .from('source_orders')
      .select(select)
      .eq('merchant_id', merchantId)
      .eq('order_number', clean)
      .order('placed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (numberError) throw new Error(`claim_gate_order_number_lookup_failed: ${numberError.message}`);
    if (byNumber) return byNumber as Record<string, unknown>;
  }

  if (!customerEmail?.trim()) return null;

  const { data, error } = await client
    .from('source_orders')
    .select(select)
    .eq('merchant_id', merchantId)
    .ilike('email', normaliseEmail(customerEmail))
    .order('placed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`claim_gate_email_order_lookup_failed: ${error.message}`);
  return (data ?? null) as Record<string, unknown> | null;
}

async function findTicket(
  client: SupabaseClient,
  merchantId: string,
  externalTicketId: string | null | undefined,
  platform: string | null | undefined,
) {
  if (!externalTicketId?.trim()) return null;
  const provider =
    platform === 'zendesk' || platform === 'freshdesk' || platform === 'gorgias'
      ? platform
      : 'gorgias';
  const { data, error } = await client
    .from('source_tickets')
    .select('id, external_id, subject, status, channel, linked_order_external_ids, created_at_provider, updated_at_provider')
    .eq('merchant_id', merchantId)
    .eq('provider', provider)
    .eq('external_id', externalTicketId)
    .maybeSingle();
  if (error) throw new Error(`claim_gate_ticket_lookup_failed: ${error.message}`);
  return (data ?? null) as Record<string, unknown> | null;
}

async function findShipments(client: SupabaseClient, merchantId: string, sourceOrderId: string | null) {
  if (!sourceOrderId) return [];
  const { data, error } = await client
    .from('source_fulfillments')
    .select('id, status, shipment_status, tracking_company, tracking_number, occurred_at, updated_at_source')
    .eq('merchant_id', merchantId)
    .eq('source_order_id', sourceOrderId)
    .order('occurred_at', { ascending: false })
    .limit(10);
  if (error) throw new Error(`claim_gate_shipment_lookup_failed: ${error.message}`);
  return (data ?? []) as Array<Record<string, unknown>>;
}

async function claimHistory(client: SupabaseClient, merchantId: string, customerEmail?: string | null) {
  if (!customerEmail?.trim()) {
    return { priorDnrClaims120d: 0, priorRefunds120d: 0, priorReplacements120d: 0 };
  }
  const cutoff = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();
  const { data: orders, error: ordersError } = await client
    .from('source_orders')
    .select('id')
    .eq('merchant_id', merchantId)
    .ilike('email', normaliseEmail(customerEmail));
  if (ordersError) throw new Error(`claim_gate_history_orders_failed: ${ordersError.message}`);

  const orderIds = (orders ?? []).map((row: { id: string }) => row.id);
  if (orderIds.length === 0) {
    return { priorDnrClaims120d: 0, priorRefunds120d: 0, priorReplacements120d: 0 };
  }

  const [claimsRes, refundsRes, outcomesRes] = await Promise.all([
    client
      .from('support_payout_cases')
      .select('id, claim_type, submitted_at')
      .eq('merchant_id', merchantId)
      .in('source_order_id', orderIds)
      .gte('submitted_at', cutoff),
    client
      .from('source_refunds')
      .select('id')
      .eq('merchant_id', merchantId)
      .in('source_order_id', orderIds)
      .gte('refunded_at', cutoff),
    client
      .from('claim_outcomes')
      .select('decision, claim:support_payout_cases!inner(merchant_id, source_order_id, submitted_at)')
      .eq('claim.merchant_id', merchantId)
      .in('claim.source_order_id', orderIds)
      .gte('claim.submitted_at', cutoff),
  ]);
  if (claimsRes.error) throw new Error(`claim_gate_history_claims_failed: ${claimsRes.error.message}`);
  if (refundsRes.error) throw new Error(`claim_gate_history_refunds_failed: ${refundsRes.error.message}`);
  if (outcomesRes.error) throw new Error(`claim_gate_history_outcomes_failed: ${outcomesRes.error.message}`);

  const claims = claimsRes.data ?? [];
  const priorDnrClaims120d = claims.filter((row: { claim_type: string }) => row.claim_type === 'item_not_received').length;
  const priorReplacements120d = (outcomesRes.data ?? []).filter((row: { decision: string }) =>
    row.decision === 'approved' || row.decision === 'full_refund' || row.decision === 'partial_refund',
  ).length;

  return {
    priorDnrClaims120d,
    priorRefunds120d: (refundsRes.data ?? []).length,
    priorReplacements120d,
  };
}

function deliveryStatus(order: Record<string, unknown> | null, shipment: Record<string, unknown> | null): ClaimGateEvidenceSummary['delivery_status'] {
  const raw = `${stringValue(shipment?.shipment_status) ?? ''} ${stringValue(shipment?.status) ?? ''} ${stringValue(order?.fulfillment_state) ?? ''}`.toLowerCase();
  if (raw.includes('delivered') || raw.includes('success')) return 'DELIVERED';
  if (raw.includes('transit') || raw.includes('shipped') || raw.includes('fulfilled')) return 'IN_TRANSIT';
  if (raw.includes('pending')) return 'PENDING';
  return 'UNKNOWN';
}

function inferCarrierClaimWindow(shipment: Record<string, unknown> | null) {
  const deliveredAt = stringValue(shipment?.occurred_at);
  if (!deliveredAt) return 'UNKNOWN' as const;
  const daysSinceDelivery = (Date.now() - Date.parse(deliveredAt)) / 86400000;
  if (!Number.isFinite(daysSinceDelivery)) return 'UNKNOWN' as const;
  if (daysSinceDelivery <= 14) return 'OPEN' as const;
  if (daysSinceDelivery <= 28) return 'CLOSING_SOON' as const;
  return 'LIKELY_CLOSED' as const;
}

function carrierSlug(value: string | null | undefined): string {
  const raw = value?.trim().toLowerCase() ?? '';
  if (raw.includes('ups')) return 'ups';
  if (raw.includes('fedex')) return 'fedex';
  if (raw.includes('usps')) return 'usps';
  if (raw.includes('royal')) return 'royal-mail';
  if (raw.includes('evri') || raw.includes('hermes')) return 'evri';
  if (raw.includes('dpd')) return 'dpd';
  if (raw.includes('dhl')) return 'dhl';
  return raw.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'default';
}

function claimDeadline(deliveryTimestamp: string | null | undefined, carrier: string) {
  if (!deliveryTimestamp) return { open: false, deadline: undefined as string | undefined };
  const deliveredAt = Date.parse(deliveryTimestamp);
  if (!Number.isFinite(deliveredAt)) return { open: false, deadline: undefined as string | undefined };
  const windowDays = CARRIER_CLAIM_WINDOWS_DAYS[carrierSlug(carrier)] ?? CARRIER_CLAIM_WINDOWS_DAYS.default;
  const deadlineMs = deliveredAt + windowDays * 24 * 60 * 60 * 1000;
  return {
    open: Date.now() < deadlineMs,
    deadline: new Date(deadlineMs).toISOString().slice(0, 10),
  };
}

function isDelivered(status: string): boolean {
  return status.toLowerCase().includes('delivered');
}

function afterShipEvidence(tracking: AfterShipTracking, fallbackCarrier: string): ClaimGateFulfillmentEvidence {
  const carrier = tracking.slug && tracking.slug !== 'unknown' ? tracking.slug : fallbackCarrier;
  const deliveryScanPresent = isDelivered(tracking.current_status);
  const exception = tracking.checkpoints.find((checkpoint) =>
    checkpoint.tag.toLowerCase().includes('exception')
  );
  const claimWindow = claimDeadline(tracking.delivery_timestamp, carrier);
  const podPresent = Boolean(tracking.proof_of_delivery);
  const evidenceStrength: ClaimGateFulfillmentEvidence['evidence_strength'] =
    exception || !deliveryScanPresent
      ? 'weak'
      : podPresent
        ? 'strong'
        : 'moderate';

  return {
    tracking_number: tracking.tracking_number,
    carrier,
    carrier_identified_via: tracking.slug && tracking.slug !== fallbackCarrier ? 'aftership_slug' : 'source_fulfillments',
    current_status: tracking.current_status,
    delivery_scan_present: deliveryScanPresent,
    ...(tracking.delivery_timestamp ? { delivery_timestamp: tracking.delivery_timestamp } : {}),
    pod_present: podPresent,
    ...(tracking.proof_of_delivery?.url ? { pod_url: tracking.proof_of_delivery.url } : {}),
    ...(tracking.proof_of_delivery?.type ? { pod_type: tracking.proof_of_delivery.type } : {}),
    last_checkpoint_message: tracking.last_checkpoint.message,
    last_checkpoint_time: tracking.last_checkpoint.checkpoint_time,
    exception_present: Boolean(exception),
    ...(exception ? { exception_reason: exception.message } : {}),
    carrier_claim_window_open: claimWindow.open,
    ...(claimWindow.deadline ? { carrier_claim_deadline: claimWindow.deadline } : {}),
    tracking_source: 'aftership',
    evidence_strength: evidenceStrength,
  };
}

async function writeIntegrationEvidence(input: {
  client: SupabaseClient;
  merchantId: string;
  sourceProvider: string;
  sourceCategory: string;
  evidenceType: string;
  title: string;
  summary: string;
  confidence: string;
  value: Record<string, unknown> | Array<unknown> | string | number | boolean | null;
  rawReference: unknown;
  occurredAt?: string | null;
  stableKey: string;
}) {
  const row = {
    id: stableEvidenceId(input.merchantId, input.sourceProvider, input.evidenceType, input.stableKey),
    merchant_id: input.merchantId,
    source_provider: input.sourceProvider,
    source_category: input.sourceCategory,
    evidence_type: input.evidenceType,
    title: input.title,
    summary: input.summary,
    confidence: input.confidence,
    value: input.value,
    raw_reference: JSON.stringify(input.rawReference),
    occurred_at: input.occurredAt ?? null,
  };
  const { error } = await input.client
    .from('integration_evidence_items')
    .upsert(row, { onConflict: 'id' });
  if (error) {
    console.warn('claim_gate_integration_evidence_write_failed', {
      provider: input.sourceProvider,
      evidenceType: input.evidenceType,
      message: error.message,
    });
  }
}

async function fetchAfterShipEvidence(input: {
  client: SupabaseClient;
  merchantId: string;
  shipments: Array<Record<string, unknown>>;
  apiKey: string | null;
}): Promise<{ evidence: ClaimGateFulfillmentEvidence[]; fetched: boolean }> {
  const apiKey = input.apiKey;
  if (!apiKey) return { evidence: [], fetched: false };
  const evidence: ClaimGateFulfillmentEvidence[] = [];
  let fetched = false;
  for (const shipment of input.shipments) {
    const trackingNumber = stringValue(shipment.tracking_number);
    if (!trackingNumber) continue;
    const carrier = stringValue(shipment.tracking_company) ?? 'default';
    try {
      const tracking = await getTracking(trackingNumber, carrier, apiKey);
      fetched = true;
      if (!tracking) {
        const fallback: ClaimGateFulfillmentEvidence = {
          tracking_number: trackingNumber,
          carrier,
          carrier_identified_via: 'source_fulfillments',
          current_status: 'Tracking not found',
          delivery_scan_present: false,
          pod_present: false,
          last_checkpoint_message: 'Tracking not found in AfterShip',
          last_checkpoint_time: new Date().toISOString(),
          exception_present: false,
          carrier_claim_window_open: false,
          tracking_source: 'aftership',
          evidence_strength: 'weak',
        };
        evidence.push(fallback);
        await writeIntegrationEvidence({
          client: input.client,
          merchantId: input.merchantId,
          sourceProvider: 'aftership',
          sourceCategory: 'tracking',
          evidenceType: 'tracking',
          title: 'AfterShip tracking',
          summary: fallback.last_checkpoint_message,
          confidence: 'low',
          value: fallback,
          rawReference: { tracking_number: trackingNumber, not_found: true },
          stableKey: trackingNumber,
        });
        continue;
      }
      const mapped = afterShipEvidence(tracking, carrier);
      evidence.push(mapped);
      await writeIntegrationEvidence({
        client: input.client,
        merchantId: input.merchantId,
        sourceProvider: 'aftership',
        sourceCategory: 'tracking',
        evidenceType: 'tracking',
        title: 'AfterShip tracking',
        summary: `${mapped.current_status}: ${mapped.last_checkpoint_message}`,
        confidence: mapped.evidence_strength === 'strong' ? 'high' : mapped.evidence_strength === 'moderate' ? 'medium' : 'low',
        value: mapped,
        rawReference: tracking.raw,
        occurredAt: mapped.delivery_timestamp ?? mapped.last_checkpoint_time,
        stableKey: trackingNumber,
      });
    } catch (error) {
      console.warn('claim_gate_aftership_lookup_failed', {
        trackingNumber,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { evidence, fetched };
}

function shipBobEvidence(order: ShipBobOrder | null, timelines: ShipBobTimelineEvent[], returnOrder: ShipBobReturn | null): ClaimGateShipBobEvidence {
  if (!order) return { order_found: false, shipment_count: 0, pick_pack_events: 0, exception_present: false };
  const exception = timelines.find((event) => /exception|failed|delay|short|missing|damage/i.test(event.description));
  const pickPackEvents = timelines.filter((event) => /pick|pack|fulfill|ship/i.test(event.description)).length;
  return {
    order_found: true,
    order_id: order.id,
    order_status: order.status,
    shipment_count: order.shipments.length,
    pick_pack_events: pickPackEvents,
    exception_present: Boolean(exception),
    ...(exception ? { exception_reason: exception.description } : {}),
    ...(returnOrder ? { return_status: returnOrder.status, return_items: returnOrder.products } : {}),
  };
}

async function fetchShipBobEvidence(input: {
  client: SupabaseClient;
  merchantId: string;
  order: Record<string, unknown> | null;
  pat: string | null;
}): Promise<{ evidence: ClaimGateShipBobEvidence | null; fetched: boolean }> {
  const pat = input.pat;
  if (!pat) return { evidence: null, fetched: false };
  const reference = stringValue(input.order?.order_number) ?? stringValue(input.order?.external_id);
  if (!reference) return { evidence: null, fetched: false };
  try {
    const order = await getOrderByReferenceId(reference, pat);
    if (!order) {
      const empty = shipBobEvidence(null, [], null);
      await writeIntegrationEvidence({
        client: input.client,
        merchantId: input.merchantId,
        sourceProvider: 'shipbob',
        sourceCategory: 'warehouse_3pl',
        evidenceType: 'warehouse_pick_pack',
        title: 'ShipBob fulfillment',
        summary: 'Order not found in ShipBob',
        confidence: 'low',
        value: empty,
        rawReference: { reference_id: reference, not_found: true },
        stableKey: reference,
      });
      return { evidence: empty, fetched: true };
    }
    const timelineGroups = await Promise.all(order.shipments.map((shipment) => getShipmentTimeline(shipment.id, pat)));
    const timelines = timelineGroups.flat();
    const returnOrder = await getReturnForOrder(order.id, pat);
    const mapped = shipBobEvidence(order, timelines, returnOrder);
    await writeIntegrationEvidence({
      client: input.client,
      merchantId: input.merchantId,
      sourceProvider: 'shipbob',
      sourceCategory: 'warehouse_3pl',
      evidenceType: mapped.exception_present ? 'warehouse_exception' : 'warehouse_pick_pack',
      title: 'ShipBob fulfillment',
      summary: mapped.exception_present
        ? `ShipBob exception: ${mapped.exception_reason}`
        : `${mapped.shipment_count} shipment(s), ${mapped.pick_pack_events} fulfillment event(s)`,
      confidence: mapped.exception_present ? 'medium' : 'high',
      value: mapped,
      rawReference: { order: order.raw, timelines, return: returnOrder?.raw ?? null },
      stableKey: order.id || reference,
    });
    return { evidence: mapped, fetched: true };
  } catch (error) {
    console.warn('claim_gate_shipbob_lookup_failed', {
      reference,
      message: error instanceof Error ? error.message : String(error),
    });
    return { evidence: null, fetched: false };
  }
}

function inferChargebackRisk(claimText: string, history: { priorDnrClaims120d: number }): ClaimGateEvidenceSummary['chargeback_risk'] {
  const text = claimText.toLowerCase();
  if (text.includes('chargeback') || text.includes('bank') || text.includes('dispute')) return 'HIGH';
  if (history.priorDnrClaims120d >= 2) return 'MEDIUM';
  return 'LOW';
}

export async function buildEvidence(input: {
  client: SupabaseClient;
  merchantId: string;
  customerEmail?: string | null;
  externalOrderId?: string | null;
  externalTicketId?: string | null;
  platform?: string | null;
  claimText: string;
  claimType: ClaimGateClaimType;
}): Promise<ClaimGateEvidence> {
  const order = await findOrder(
    input.client,
    input.merchantId,
    input.externalOrderId ?? null,
    input.customerEmail ?? null,
  );
  const resolvedEmail =
    input.customerEmail ??
    stringValue(order?.customer_email) ??
    stringValue(order?.email);

  const [ticket, history] = await Promise.all([
    findTicket(input.client, input.merchantId, input.externalTicketId, input.platform),
    claimHistory(input.client, input.merchantId, resolvedEmail),
  ]);
  const shipments = await findShipments(input.client, input.merchantId, stringValue(order?.id));
  const shipment = shipments[0] ?? null;
  // Resolve provider credentials once so connection state (connected vs not) is
  // explicit. A null credential means the source is not connected — the gate
  // cannot speak to that dimension and must say so, rather than treating an
  // empty result as "no evidence found".
  const [aftershipKey, shipbobPat] = await Promise.all([
    getProviderCredential(input.merchantId, 'aftership', 'AFTERSHIP_API_KEY', input.client),
    getProviderCredential(input.merchantId, 'shipbob', 'SHIPBOB_PAT', input.client),
  ]);
  const [aftershipResult, shipbobResult] = await Promise.all([
    fetchAfterShipEvidence({ client: input.client, merchantId: input.merchantId, shipments, apiKey: aftershipKey }),
    fetchShipBobEvidence({ client: input.client, merchantId: input.merchantId, order, pat: shipbobPat }),
  ]);
  const fulfillmentEvidence = aftershipResult.evidence;
  const shipbobEvidenceResult = shipbobResult.evidence;
  const connections = {
    carrier_tracking: aftershipResult.fetched,
    warehouse: shipbobResult.fetched,
    helpdesk: Boolean(ticket),
  };
  const status = deliveryStatus(order, shipment);
  const deliveredEvidence = fulfillmentEvidence.find((item) => item.delivery_scan_present);
  const moneyAtRisk = numberValue(order?.total_price ?? order?.order_value);
  const currency = stringValue(order?.currency) ?? DEFAULT_CURRENCY;
  const proofOfDelivery = fulfillmentEvidence.some((item) => item.pod_present)
    ? 'PRESENT'
    : status === 'DELIVERED' && stringValue(shipment?.tracking_number)
      ? 'UNKNOWN'
      : 'MISSING';
  const summary: ClaimGateEvidenceSummary = {
    order_value: moneyAtRisk,
    order_number: stringValue(order?.order_number),
    delivery_status: deliveredEvidence ? 'DELIVERED' : status,
    proof_of_delivery: proofOfDelivery,
    carrier: deliveredEvidence?.carrier ?? stringValue(shipment?.tracking_company),
    delivered_at: deliveredEvidence?.delivery_timestamp ?? (status === 'DELIVERED' ? stringValue(shipment?.occurred_at) : null),
    prior_dnr_claims_120d: history.priorDnrClaims120d,
    prior_refunds_120d: history.priorRefunds120d,
    prior_replacements_120d: history.priorReplacements120d,
    carrier_claim_window: fulfillmentEvidence.some((item) => item.carrier_claim_window_open)
      ? 'OPEN'
      : inferCarrierClaimWindow(shipment),
    chargeback_risk: inferChargebackRisk(input.claimText, history),
  };

  return {
    order,
    ticket,
    shipment,
    connections,
    claimHistory: history,
    moneyAtRisk,
    currency,
    summary,
    fulfillmentEvidence,
    shipbobEvidence: shipbobEvidenceResult,
  };
}
