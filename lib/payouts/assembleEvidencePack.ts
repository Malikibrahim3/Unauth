import type { SupabaseClient } from '@supabase/supabase-js';
import {
  mapGorgiasTicketToEvidence,
  mapApprovedPartnerTermsToEvidence,
  mapShopifyFulfillmentToEvidence,
  mapShopifyOrderToEvidence,
  mapShopifyRefundToEvidence,
} from '@/lib/integrations/evidenceMapper';
import { getStoredIntegrationViews } from '@/lib/integrations/auth';
import { providerShapeFromCanonical } from '@/lib/integrations/canonicalEvidence';
import { getIntegrationProvider, INTEGRATION_PROVIDERS } from '@/lib/integrations/registry';
import type {
  EvidenceCapability,
  EvidencePack,
  MissingEvidenceItem,
  NormalizedEvidenceItem,
  ProviderConnectionView,
} from '@/lib/integrations/types';

export type AssembleEvidencePackInput = {
  client: SupabaseClient;
  merchantId: string;
  supportPayoutCaseId?: string;
  orderId?: string | null;
  customerId?: string | null;
  ticketId?: string | null;
  trackingNumber?: string | null;
};

function hasConnected(views: ProviderConnectionView[], providerId: string): boolean {
  return views.some((view) => view.id === providerId && view.status === 'connected');
}

function missing(
  views: ProviderConnectionView[],
  providerId: string,
  capability: EvidenceCapability,
  reason: MissingEvidenceItem['reason'],
  message: string,
  attempted = false,
): MissingEvidenceItem {
  const provider =
    views.find((view) => view.id === providerId) ??
    INTEGRATION_PROVIDERS.find((candidate) => candidate.id === providerId)!;
  return {
    providerId,
    providerName: provider.name,
    category: provider.category,
    capability,
    reason,
    message,
    attempted,
  };
}

function uniqueByStableKey(items: NormalizedEvidenceItem[]): NormalizedEvidenceItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = [
      item.sourceProvider,
      item.evidenceType,
      item.rawReference ?? '',
      item.title,
      item.value ?? '',
    ].join(':');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function assembleEvidencePack(input: AssembleEvidencePackInput): Promise<EvidencePack> {
  const generatedAt = new Date().toISOString();
  const views = await getStoredIntegrationViews(input.client, input.merchantId);
  const items: NormalizedEvidenceItem[] = [];
  const missingEvidence: MissingEvidenceItem[] = [];
  // Canonical evidence store (Phase 7.1): integration evidence now lives in
  // evidence_items with flat provenance columns (source_system / source_record_id
  // / claim_id). Rows are reconstructed into the provider shape below.
  const evidenceFilters = [
    input.supportPayoutCaseId ? `claim_id.eq.${input.supportPayoutCaseId}` : '',
    input.trackingNumber ? `source_record_id.eq.${input.trackingNumber}` : '',
    input.orderId ? `source_record_id.eq.${input.orderId}` : '',
  ].filter(Boolean);
  let integrationEvidenceQuery = input.client
    .from('evidence_items')
    .select('*')
    .eq('merchant_id', input.merchantId);
  if (evidenceFilters.length > 0) {
    integrationEvidenceQuery = integrationEvidenceQuery.or(evidenceFilters.join(','));
  }

  const [
    ticketRes,
    orderRes,
    refundRes,
    fulfillmentRes,
    integrationEvidenceRes,
    partnerTermsRes,
  ] = await Promise.all([
    input.ticketId
      ? input.client
          .from('source_tickets')
          .select('id,external_id,subject,status,created_at,updated_at,provider')
          .eq('merchant_id', input.merchantId)
          .eq('id', input.ticketId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    input.orderId
      ? input.client
          .from('source_orders')
          .select('id,external_id,order_number,total_price,currency,line_items_count,placed_at,created_at')
          .eq('merchant_id', input.merchantId)
          .eq('id', input.orderId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    input.orderId
      ? input.client
          .from('source_refunds')
          .select('id,external_id,amount,currency,reason,refunded_at,ingested_at')
          .eq('merchant_id', input.merchantId)
          .eq('source_order_id', input.orderId)
      : Promise.resolve({ data: [], error: null }),
    input.orderId
      ? input.client
          .from('source_fulfillments')
          .select('id,external_id,status,shipment_status,tracking_company,tracking_number,occurred_at,updated_at_source')
          .eq('merchant_id', input.merchantId)
          .eq('source_order_id', input.orderId)
      : Promise.resolve({ data: [], error: null }),
    integrationEvidenceQuery,
    input.orderId || input.supportPayoutCaseId
      ? input.client
          .from('extracted_partner_terms')
          .select('*')
          .eq('merchant_id', input.merchantId)
          .not('approved_at', 'is', null)
      : Promise.resolve({ data: [], error: null }),
  ]);

  // Evidence inclusion is driven by the presence of canonical source-graph data
  // for this case (source_tickets / source_orders / source_refunds /
  // source_fulfillments), NOT by which provider happens to be connected. The
  // map* helpers remain provider-shaped adapters over those canonical rows.
  // Connection state only informs the missing-evidence coverage hints below.
  if (ticketRes.data) {
    items.push(...mapGorgiasTicketToEvidence(ticketRes.data as any, {
      merchantId: input.merchantId,
      supportPayoutCaseId: input.supportPayoutCaseId,
      now: generatedAt,
    }));
  } else if (!hasConnected(views, 'gorgias')) {
    missingEvidence.push(missing(views, 'gorgias', 'ticket_messages', 'not_connected', 'Gorgias is not connected.'));
  }

  if (orderRes.data) {
    items.push(...mapShopifyOrderToEvidence(orderRes.data as any, {
      merchantId: input.merchantId,
      supportPayoutCaseId: input.supportPayoutCaseId,
      now: generatedAt,
    }));
  } else if (!hasConnected(views, 'shopify')) {
    missingEvidence.push(missing(views, 'shopify', 'order_value', 'not_connected', 'Shopify is not connected.'));
  }
  for (const refund of (refundRes.data ?? []) as any[]) {
    items.push(mapShopifyRefundToEvidence(refund, {
      merchantId: input.merchantId,
      supportPayoutCaseId: input.supportPayoutCaseId,
      now: generatedAt,
    }));
  }
  for (const fulfillment of (fulfillmentRes.data ?? []) as any[]) {
    items.push(...mapShopifyFulfillmentToEvidence(fulfillment, {
      merchantId: input.merchantId,
      supportPayoutCaseId: input.supportPayoutCaseId,
      now: generatedAt,
    }));
  }

  for (const canonicalRow of (integrationEvidenceRes.data ?? []) as any[]) {
    const row = providerShapeFromCanonical(canonicalRow) as any;
    if (!row.source_provider) continue;
    const provider = getIntegrationProvider(row.source_provider);
    if (!provider || provider.buildStatus === 'slot_only') continue;
    items.push({
      id: row.id,
      merchantId: row.merchant_id,
      supportPayoutCaseId: row.support_payout_case_id ?? undefined,
      sourceProvider: row.source_provider,
      sourceCategory: row.source_category,
      evidenceType: row.evidence_type,
      title: row.title,
      summary: row.summary,
      confidence: row.confidence,
      value: row.value,
      occurredAt: row.occurred_at ?? undefined,
      rawReference: row.raw_reference ?? undefined,
      createdAt: row.created_at,
    });
  }

  for (const provider of ['aftership', 'ups', 'fedex']) {
    if (!hasConnected(views, provider)) {
      const capability =
        provider === 'aftership' ? 'tracking_events' :
        'delivery_photo';
      missingEvidence.push(missing(views, provider, capability, 'not_connected', `${views.find((view) => view.id === provider)?.name ?? provider} is not connected.`));
    }
  }

  for (const terms of (partnerTermsRes.data ?? []) as any[]) {
    items.push(...mapApprovedPartnerTermsToEvidence(terms, {
      merchantId: input.merchantId,
      supportPayoutCaseId: input.supportPayoutCaseId,
      now: generatedAt,
    }));
  }

  if (!hasConnected(views, 'document_upload')) {
    missingEvidence.push(missing(views, 'document_upload', 'contract_terms', 'not_connected', 'No approved contract documents are connected yet.'));
  }

  if (views.some((view) => view.id === 'self_fulfillment_pack') && !hasConnected(views, 'self_fulfillment_pack')) {
    missingEvidence.push(missing(
      views,
      'self_fulfillment_pack',
      'self_reported_pack_confirmation',
      'not_connected',
      'Self-fulfillment pack confirmation is not enabled.',
    ));
  }

  for (const provider of views.filter((candidate) => candidate.buildStatus === 'slot_only')) {
    missingEvidence.push(missing(
      views,
      provider.id,
      provider.evidenceCapabilities[0] ?? 'contract_terms',
      'not_connected',
      `${provider.name} is not connected. This slot shows the evidence it would add once a live connector is implemented for this merchant.`,
    ));
  }

  const normalized = uniqueByStableKey(items);
  const deliveryProof = normalized.filter((item) => item.evidenceType === 'delivery_photo' || item.evidenceType === 'signature');
  for (const item of deliveryProof) {
    if (item.value == null) {
      missingEvidence.push(missing(
        views,
        item.sourceProvider,
        item.evidenceType,
        'attempted_unavailable',
        item.summary,
        true,
      ));
    }
  }

  const connectedSources = views
    .filter((view) => view.status === 'connected' && view.buildStatus === 'live')
    .map((view) => {
      const sourceItems = normalized.filter((item) => item.sourceProvider === view.id);
      return {
        providerId: view.id,
        providerName: view.name,
        status: view.status,
        summaries: sourceItems.length > 0
          ? sourceItems.map((item) => item.summary).slice(0, 3)
          : ['Connected, no matching evidence found for this case yet'],
      };
    });

  return {
    merchantId: input.merchantId,
    supportPayoutCaseId: input.supportPayoutCaseId,
    generatedAt,
    items: normalized,
    groups: {
      ticket: normalized.filter((item) => item.sourceCategory === 'helpdesk'),
      orderAndRefund: normalized.filter((item) => item.evidenceType === 'order_value' || item.evidenceType === 'line_items' || item.evidenceType === 'refund_history' || item.evidenceType === 'reship_history'),
      tracking: normalized.filter((item) => item.evidenceType === 'tracking_number' || item.evidenceType === 'tracking_events' || item.evidenceType === 'delivery_status'),
      deliveryProof,
      dispute: normalized.filter((item) => item.evidenceType === 'dispute_status' || item.evidenceType === 'chargeback_evidence'),
      contractTerms: normalized.filter((item) => item.evidenceType === 'contract_terms' || item.evidenceType === 'recovery_deadline'),
      selfFulfillment: normalized.filter((item) => item.evidenceType === 'self_reported_pack_confirmation' || item.evidenceType === 'self_reported_pack_photo'),
    },
    missingEvidence,
    connectedSources,
  };
}
