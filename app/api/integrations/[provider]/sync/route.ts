import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import {
  assertLiveProvider,
  getIntegrationCredential,
  getShopifyCredential,
  resolveActiveIntegrationConnectionId,
  upsertMerchantIntegration,
} from '@/lib/integrations/auth';
import {
  mapCarrierProofToEvidence,
  mapShipBobFulfillmentToEvidence,
  mapShopifyDisputeToEvidence,
} from '@/lib/integrations/evidenceMapper';
import { writeCanonicalEvidence } from '@/lib/integrations/canonicalEvidence';
import { fetchFedExDeliveryProof } from '@/lib/integrations/providers/fedex';
import { fetchShopifyPaymentDisputes } from '@/lib/integrations/providers/shopify';
import { fetchUpsDeliveryProof } from '@/lib/integrations/providers/ups';
import {
  getOrderByReferenceId,
  getReturnForOrder,
  getShipmentTimeline,
} from '@/lib/integrations/providers/shipbob';
import { requireIntegrationProvider } from '@/lib/integrations/registry';
import { refreshShipBobCredentialsIfNeeded } from '@/lib/integrations/providers/shipbobOAuth';
import { env } from '@/lib/utils/env';
import { refreshCarrierCredentials } from '@/lib/integrations/providers/carrierCredentials';
import type { NormalizedEvidenceItem } from '@/lib/integrations/types';
import { safeConnectionErrorCode } from '@/lib/integrations/publicErrors';
import {
  resolveLinkedCarrierTracking,
  resolveShipBobOrderReference,
} from '@/lib/integrations/orderLinking';

const syncSchema = z.object({
  supportPayoutCaseId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  trackingNumber: z.string().trim().min(1).optional(),
  orderReference: z.string().trim().min(1).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await params;
  const provider = requireIntegrationProvider(providerId);
  assertLiveProvider(provider);

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid sync payload.' }, { status: 400 });

  const activeConnectionId = await resolveActiveIntegrationConnectionId(
    serviceClient,
    ctx.merchantId,
    provider.id,
  );
  try {
    const now = new Date().toISOString();
    let normalized: NormalizedEvidenceItem[] = [];

    if (provider.id === 'shopify') {
      const shopify = await getShopifyCredential(serviceClient, ctx.merchantId);
      if (!shopify) return NextResponse.json({ error: 'Shopify is not connected.' }, { status: 400 });
      const disputes = await fetchShopifyPaymentDisputes(shopify);
      normalized = disputes.flatMap((dispute) => mapShopifyDisputeToEvidence(dispute, {
        merchantId: ctx.merchantId,
        supportPayoutCaseId: parsed.data.supportPayoutCaseId,
        now,
      }));
      for (const dispute of disputes) {
        const externalOrderId = dispute.order?.legacyResourceId ? String(dispute.order.legacyResourceId) : null;
        let sourceOrderId: string | null = null;
        if (externalOrderId) {
          const { data: order } = await serviceClient
            .from('source_orders')
            .select('id')
            .eq('merchant_id', ctx.merchantId)
            .eq('source', 'shopify')
            .eq('connection_id', shopify.connectionId)
            .eq('external_id', externalOrderId)
            .maybeSingle();
          sourceOrderId = order?.id ?? null;
        }
        await serviceClient.from('source_disputes').upsert({
          merchant_id: ctx.merchantId,
          source_order_id: sourceOrderId,
          external_id: String(dispute.legacyResourceId ?? dispute.id),
          dispute_type: dispute.type ?? null,
          reason: dispute.reasonDetails?.reason ?? dispute.reasonDetails?.networkReasonCode ?? null,
          amount: dispute.amount?.amount != null ? Number(dispute.amount.amount) : null,
          currency: dispute.amount?.currencyCode ?? null,
          status: dispute.status ?? null,
          initiated_at: dispute.initiatedAt ?? null,
          finalized_at: dispute.finalizedOn ?? null,
        }, { onConflict: 'merchant_id,source_order_id,external_id' });
      }
    } else if (provider.id === 'shipbob') {
      // ShipBob OAuth tokens live ~1 hour — refresh before use or this fetch
      // starts failing an hour after the merchant connects.
      const credentials = env.SHIPBOB_OAUTH_CLIENT_ID && env.SHIPBOB_OAUTH_CLIENT_SECRET
        ? activeConnectionId
          ? await refreshShipBobCredentialsIfNeeded(serviceClient, ctx.merchantId, {
              connectionId: activeConnectionId,
              clientId: env.SHIPBOB_OAUTH_CLIENT_ID,
              clientSecret: env.SHIPBOB_OAUTH_CLIENT_SECRET,
            })
          : null
        : await getIntegrationCredential(serviceClient, ctx.merchantId, provider.id, { connectionId: activeConnectionId });
      if (!credentials) return NextResponse.json({ error: 'ShipBob is not connected.' }, { status: 400 });
      const token = credentials?.accessToken ?? credentials?.apiKey;
      if (!token) return NextResponse.json({ error: 'ShipBob is not connected.' }, { status: 400 });
      const orderReference = await resolveShipBobOrderReference(
        serviceClient,
        ctx.merchantId,
        parsed.data.orderId,
        parsed.data.orderReference,
      );
      if (!orderReference) {
        return NextResponse.json({ error: 'Order reference is required for ShipBob sync.' }, { status: 400 });
      }
      const shipbobOrder = await getOrderByReferenceId(
        orderReference,
        String(token),
        credentials.environment === 'sandbox' || credentials.sandbox === true,
        typeof credentials.providerAccountId === 'string' ? credentials.providerAccountId : typeof credentials.channelId === 'string' ? credentials.channelId : undefined,
      );
      if (!shipbobOrder) {
        return NextResponse.json({ error: 'Order was not found in ShipBob.' }, { status: 404 });
      }
      const timelineGroups = await Promise.all(
        shipbobOrder.shipments.map((shipment) => getShipmentTimeline(shipment.id, String(token), credentials.environment === 'sandbox' || credentials.sandbox === true)),
      );
      const returnOrder = await getReturnForOrder(shipbobOrder.id, String(token), credentials.environment === 'sandbox' || credentials.sandbox === true);
      normalized = mapShipBobFulfillmentToEvidence(shipbobOrder, timelineGroups.flat(), returnOrder, {
        merchantId: ctx.merchantId,
        supportPayoutCaseId: parsed.data.supportPayoutCaseId,
        now,
      });
    } else if (provider.id === 'ups' || provider.id === 'fedex') {
      const credentials = activeConnectionId
        ? await refreshCarrierCredentials(serviceClient, {
            merchantId: ctx.merchantId,
            connectionId: activeConnectionId,
            providerId: provider.id,
          })
        : null;
      if (!credentials?.accessToken) return NextResponse.json({ error: `${provider.name} is not connected.` }, { status: 400 });
      const tracking = await resolveLinkedCarrierTracking(
        serviceClient,
        ctx.merchantId,
        parsed.data.orderId,
        parsed.data.trackingNumber,
      );
      const trackingNumber = tracking?.trackingNumber ?? null;
      if (!trackingNumber) return NextResponse.json({ error: 'Tracking number is required for carrier proof sync.' }, { status: 400 });
      const payload = provider.id === 'ups'
        ? await fetchUpsDeliveryProof({ credentials, trackingNumber })
        : await fetchFedExDeliveryProof({ credentials, trackingNumber });
      normalized = mapCarrierProofToEvidence(provider.id, payload, {
        merchantId: ctx.merchantId,
        supportPayoutCaseId: parsed.data.supportPayoutCaseId,
        trackingNumber,
        now,
      });
    } else if (provider.id === 'gorgias') {
      normalized = [];
    }

    await writeCanonicalEvidence(serviceClient, normalized);
    await upsertMerchantIntegration(serviceClient, ctx.merchantId, provider, 'connected', {
      ...(activeConnectionId ? { connectionId: activeConnectionId } : {}),
      lastSyncAt: now,
      lastError: null,
    });
    return NextResponse.json({ ok: true, provider: provider.id, evidence_items: normalized.length });
  } catch (error) {
    const code = safeConnectionErrorCode(error instanceof Error ? error.message : null)
      ?? `${provider.id}_sync_failed`;
    if (activeConnectionId) {
      await upsertMerchantIntegration(serviceClient, ctx.merchantId, provider, 'error', {
        connectionId: activeConnectionId,
        lastError: code,
      });
    }
    return NextResponse.json({ error: `Failed to sync ${provider.name}.`, code }, { status: 500 });
  }
}
