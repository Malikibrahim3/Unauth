import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import type {
  ClaimGateClaimType,
  ClaimGateEvidence,
  ClaimGateEvidenceSummary,
  ClaimGateFulfillmentEvidence,
  ClaimGateShipBobEvidence,
} from '@/lib/claim-gate/types';
import { getIntegrationCredential, resolveActiveIntegrationConnectionId } from '@/lib/integrations/auth';
import { fetchFedExDeliveryProof } from '@/lib/integrations/providers/fedex';
import { fetchUpsDeliveryProof } from '@/lib/integrations/providers/ups';
import { refreshCarrierCredentials } from '@/lib/integrations/providers/carrierCredentials';
import type { IntegrationCredentialPayload } from '@/lib/integrations/types';
import {
  getOrderByReferenceId,
  getReturnForOrder,
  getShipmentTimeline,
  type ShipBobOrder,
  type ShipBobReturn,
  type ShipBobTimelineEvent,
} from '@/lib/integrations/providers/shipbob';
import { stableEvidenceId } from '@/lib/integrations/stableEvidenceId';
import { refreshShipBobCredentialsIfNeeded } from '@/lib/integrations/providers/shipbobOAuth';
import { env } from '@/lib/utils/env';

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

type DirectCarrier = 'ups' | 'fedex';

function directCarrier(company: string | null, trackingNumber: string): DirectCarrier | null {
  const normalized = company?.toLowerCase() ?? '';
  if (normalized.includes('ups') || /^1Z[A-Z0-9]{16}$/i.test(trackingNumber)) return 'ups';
  if (normalized.includes('fedex') || normalized.includes('federal express')) return 'fedex';
  if (/^\d{12,22}$/.test(trackingNumber)) return 'fedex';
  return null;
}

function carrierPayloadEvidence(
  provider: DirectCarrier,
  payload: Record<string, any>,
  trackingNumber: string,
): ClaimGateFulfillmentEvidence {
  const details = provider === 'ups'
    ? (() => {
        const shipment = payload.trackResponse?.shipment?.[0] ?? {};
        const pkg = shipment.package?.[0] ?? {};
        const events = Array.isArray(pkg.activity) ? pkg.activity : [];
        const latest = events[0] ?? {};
        return {
          status: stringValue(pkg.currentStatus?.description ?? pkg.currentStatus?.code) ?? 'Status unavailable',
          events,
          deliveryTime: stringValue(pkg.deliveryDate?.[0]?.date ?? latest.date),
          lastMessage: stringValue(latest.status?.description ?? latest.location?.address?.city) ?? 'No scan message returned',
          lastTime: stringValue(latest.gmtDate ?? latest.date) ?? new Date().toISOString(),
          podUrl: stringValue(pkg.deliveryInformation?.signature?.image ?? pkg.signatureImage),
          podType: stringValue(pkg.deliveryInformation?.signature?.type) ?? undefined,
        };
      })()
    : (() => {
        const result = payload.output?.completeTrackResults?.[0]?.trackResults?.[0] ?? {};
        const events = Array.isArray(result.scanEvents) ? result.scanEvents : [];
        const latest = events[0] ?? {};
        const dates = Array.isArray(result.dateAndTimes) ? result.dateAndTimes : [];
        return {
          status: stringValue(result.latestStatusDetail?.description ?? result.latestStatusDetail?.code) ?? 'Status unavailable',
          events,
          deliveryTime: stringValue(dates.find((entry: any) => entry.type === 'ACTUAL_DELIVERY')?.dateTime),
          lastMessage: stringValue(latest.eventDescription ?? latest.derivedStatus) ?? 'No scan message returned',
          lastTime: stringValue(latest.date ?? latest.dateTime) ?? new Date().toISOString(),
          podUrl: stringValue(result.deliveryDetails?.signatureProofOfDeliveryUrl),
          podType: stringValue(result.deliveryDetails?.signedByName) ? 'signature' : undefined,
        };
      })();
  const deliveryScanPresent = isDelivered(details.status);
  const exception = details.events.find((event: any) => /exception|failed|delay/i.test(JSON.stringify(event)));
  const claimWindow = claimDeadline(details.deliveryTime, provider);
  const podPresent = Boolean(details.podUrl || details.podType);
  const evidenceStrength: ClaimGateFulfillmentEvidence['evidence_strength'] =
    exception || !deliveryScanPresent
      ? 'weak'
      : podPresent
        ? 'strong'
        : 'moderate';

  return {
    tracking_number: trackingNumber,
    carrier: provider,
    carrier_identified_via: provider === 'ups' ? 'ups_api' : 'fedex_api',
    current_status: details.status,
    delivery_scan_present: deliveryScanPresent,
    ...(details.deliveryTime ? { delivery_timestamp: details.deliveryTime } : {}),
    pod_present: podPresent,
    ...(details.podUrl ? { pod_url: details.podUrl } : {}),
    ...(details.podType ? { pod_type: details.podType } : {}),
    last_checkpoint_message: details.lastMessage,
    last_checkpoint_time: details.lastTime,
    exception_present: Boolean(exception),
    ...(exception ? { exception_reason: stringValue((exception as any).eventDescription) ?? 'Carrier exception reported' } : {}),
    carrier_claim_window_open: claimWindow.open,
    ...(claimWindow.deadline ? { carrier_claim_deadline: claimWindow.deadline } : {}),
    tracking_source: provider,
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
  // Canonical evidence store (Phase 7.1). Provider/provenance fields map onto
  // flat canonical columns; provider-shaped extras live in structured_value /
  // source_metadata (see lib/integrations/canonicalEvidence.ts).
  const confidenceNumeric: Record<string, number> = { high: 1, medium: 0.6, low: 0.3 };
  const row = {
    id: stableEvidenceId(input.merchantId, input.sourceProvider, input.evidenceType, input.stableKey),
    merchant_id: input.merchantId,
    evidence_type: input.evidenceType,
    title: input.title,
    summary: input.summary,
    confidence: confidenceNumeric[input.confidence] ?? null,
    source_system: input.sourceProvider,
    source_record_id: JSON.stringify(input.rawReference),
    source_created_at: input.occurredAt ?? null,
    structured_value: { value: input.value },
    source_metadata: {
      source_category: input.sourceCategory,
      confidence_label: input.confidence,
    },
  };
  const { error } = await input.client
    .from(TABLES.EVIDENCE_ITEMS as never)
    .upsert(row as never, { onConflict: 'id' });
  if (error) {
    console.warn('claim_gate_integration_evidence_write_failed', {
      provider: input.sourceProvider,
      evidenceType: input.evidenceType,
      message: error.message,
    });
  }
}

async function fetchCarrierEvidence(input: {
  client: SupabaseClient;
  merchantId: string;
  shipments: Array<Record<string, unknown>>;
  credentials: Partial<Record<DirectCarrier, IntegrationCredentialPayload | null>>;
}): Promise<{ evidence: ClaimGateFulfillmentEvidence[]; fetched: boolean }> {
  const evidence: ClaimGateFulfillmentEvidence[] = [];
  let fetched = false;
  for (const shipment of input.shipments) {
    const trackingNumber = stringValue(shipment.tracking_number);
    if (!trackingNumber) continue;
    const provider = directCarrier(stringValue(shipment.tracking_company), trackingNumber);
    if (!provider) continue;
    const credentials = input.credentials[provider];
    if (!credentials?.accessToken) continue;
    try {
      const payload = provider === 'ups'
        ? await fetchUpsDeliveryProof({ credentials, trackingNumber })
        : await fetchFedExDeliveryProof({ credentials, trackingNumber });
      fetched = true;
      const mapped = carrierPayloadEvidence(provider, payload, trackingNumber);
      evidence.push(mapped);
      await writeIntegrationEvidence({
        client: input.client,
        merchantId: input.merchantId,
        sourceProvider: provider,
        sourceCategory: 'carrier',
        evidenceType: 'tracking',
        title: `${provider === 'ups' ? 'UPS' : 'FedEx'} tracking`,
        summary: `${mapped.current_status}: ${mapped.last_checkpoint_message}`,
        confidence: mapped.evidence_strength === 'strong' ? 'high' : mapped.evidence_strength === 'moderate' ? 'medium' : 'low',
        value: mapped,
        rawReference: payload,
        occurredAt: mapped.delivery_timestamp ?? mapped.last_checkpoint_time,
        stableKey: trackingNumber,
      });
    } catch (error) {
      console.warn('claim_gate_carrier_lookup_failed', {
        provider,
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
  credentials: IntegrationCredentialPayload | null;
}): Promise<{ evidence: ClaimGateShipBobEvidence | null; fetched: boolean }> {
  const token = stringValue(input.credentials?.accessToken) ?? stringValue(input.credentials?.apiKey);
  if (!token) return { evidence: null, fetched: false };
  const sandbox = input.credentials?.environment === 'sandbox' || input.credentials?.sandbox === true;
  const channelId = stringValue(input.credentials?.providerAccountId) ?? stringValue(input.credentials?.channelId) ?? undefined;
  const reference = stringValue(input.order?.order_number) ?? stringValue(input.order?.external_id);
  if (!reference) return { evidence: null, fetched: false };
  try {
    const order = await getOrderByReferenceId(reference, token, sandbox, channelId);
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
    const timelineGroups = await Promise.all(order.shipments.map((shipment) => getShipmentTimeline(shipment.id, token, sandbox)));
    const timelines = timelineGroups.flat();
    const returnOrder = await getReturnForOrder(order.id, token, sandbox);
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
  const [upsConnectionId, fedexConnectionId, shipbobConnectionId] = await Promise.all([
    resolveActiveIntegrationConnectionId(input.client, input.merchantId, 'ups'),
    resolveActiveIntegrationConnectionId(input.client, input.merchantId, 'fedex'),
    resolveActiveIntegrationConnectionId(input.client, input.merchantId, 'shipbob'),
  ]);
  const [upsCredentials, fedexCredentials] = await Promise.all([
    upsConnectionId
      ? refreshCarrierCredentials(input.client, { merchantId: input.merchantId, connectionId: upsConnectionId, providerId: 'ups' })
      : null,
    fedexConnectionId
      ? refreshCarrierCredentials(input.client, { merchantId: input.merchantId, connectionId: fedexConnectionId, providerId: 'fedex' })
      : null,
  ]);
  const shipbobCredentials = shipbobConnectionId
    ? env.SHIPBOB_OAUTH_CLIENT_ID && env.SHIPBOB_OAUTH_CLIENT_SECRET
      ? await refreshShipBobCredentialsIfNeeded(input.client, input.merchantId, {
          connectionId: shipbobConnectionId,
          clientId: env.SHIPBOB_OAUTH_CLIENT_ID,
          clientSecret: env.SHIPBOB_OAUTH_CLIENT_SECRET,
        })
      : await getIntegrationCredential(input.client, input.merchantId, 'shipbob', { connectionId: shipbobConnectionId })
    : null;
  const [carrierResult, shipbobResult] = await Promise.all([
    fetchCarrierEvidence({
      client: input.client,
      merchantId: input.merchantId,
      shipments,
      credentials: { ups: upsCredentials, fedex: fedexCredentials },
    }),
    fetchShipBobEvidence({ client: input.client, merchantId: input.merchantId, order, credentials: shipbobCredentials }),
  ]);
  const fulfillmentEvidence = carrierResult.evidence;
  const shipbobEvidenceResult = shipbobResult.evidence;
  const connections = {
    carrier_tracking: carrierResult.fetched,
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
