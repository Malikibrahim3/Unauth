/**
 * ShipBob connector adapter (wrapper).
 *
 * Wraps existing ShipBob warehouse code. Produces fulfilment/shipment/return
 * canonical records; warehouse-accountability evidence is projected from those.
 */
import { capability } from '@/lib/connectors/capabilities';
import { verifyShipBobPat } from '@/lib/integrations/providers/shipbob';
import { deleteShipBobSubscription, listShipBobLocations, listShipBobOrders, listShipBobReturns, listShipBobSubscriptions, shipBobToken, type ShipBobCredentials } from '@/lib/connectors/providers/shipbob/api';
import { getAppUrl } from '@/lib/utils/appUrl';
import { mapShipBobOrder } from '@/lib/connectors/providers/shipbob/mappings';
import type {
  ConnectorAdapter,
  ConnectorContext,
  ConnectionTestResult,
  DeepLinkInput,
  DisconnectResult,
  IngestionResult,
  NormalizedRecord,
  SyncPage,
  UnsupportedResult,
  WebhookContext,
} from '@/lib/connectors/types';

type ShipBobCursor = { phase: 'locations' | 'orders' | 'returns'; cursor: string | null };

function credentialsFromContext(ctx: ConnectorContext): ShipBobCredentials {
  const credentials = ctx.credentials ?? {};
  return {
    apiKey: typeof credentials.apiKey === 'string' ? credentials.apiKey : undefined,
    accessToken: typeof credentials.accessToken === 'string' ? credentials.accessToken : undefined,
    refreshToken: typeof credentials.refreshToken === 'string' ? credentials.refreshToken : undefined,
    sandbox: credentials.environment === 'sandbox' || credentials.sandbox === true,
    channelId: typeof credentials.channelId === 'string' ? credentials.channelId : undefined,
    providerAccountId: typeof credentials.providerAccountId === 'string' ? credentials.providerAccountId : undefined,
  };
}

function cursorFrom(value: Record<string, unknown> | null | undefined): ShipBobCursor {
  const phase = value?.phase === 'orders' || value?.phase === 'returns' ? value.phase : 'locations';
  return { phase, cursor: typeof value?.cursor === 'string' ? value.cursor : null };
}

function pageResult(records: NormalizedRecord[], next: ShipBobCursor | null): SyncPage {
  return { records, nextCursor: next, hasMore: next !== null };
}

export const shipbobConnector: ConnectorAdapter = {
  manifest: {
    id: 'shipbob',
    name: 'ShipBob',
    category: 'warehouse_3pl',
    authMode: 'oauth',
    verificationStatus: 'verified',
    launchVisible: true,
    connectorVersion: '1',
    description: 'Warehouse fulfilment, pick/pack, shipments, and returns.',
    capabilities: [
      capability('fulfilments.read', 'read', { description: 'Read fulfilments/pick-pack' }),
      capability('shipments.read', 'read', { description: 'Read shipments' }),
      capability('returns.read', 'read', { requiredScopes: ['returns_read'], description: 'Read returns' }),
      capability('locations.read', 'read', { requiredScopes: ['locations_read'], description: 'Read locations' }),
      capability('shipments.subscribe', 'subscribe', { requiredScopes: ['webhooks_write'], description: 'Receive order and shipment webhooks' }),
    ],
  },

  async testConnection(ctx: ConnectorContext): Promise<ConnectionTestResult> {
    const credentials = credentialsFromContext(ctx);
    const token = shipBobToken(credentials);
    if (!token) return { ok: false, errorCode: 'test_connection_failed', message: 'Missing access token.' };
    try {
      const access = await verifyShipBobPat(
        token,
        credentials.sandbox,
        credentials.channelId,
      );
      return {
        ok: true,
        providerAccountId: access.channels[0]?.id ?? null,
        providerAccountName: access.channels[0]?.name ?? null,
      };
    } catch {
      return { ok: false, errorCode: 'test_connection_failed', message: 'ShipBob rejected the read-only connection test.' };
    }
  },

  async initialImport(ctx, rawCursor): Promise<SyncPage | UnsupportedResult> {
    const credentials = credentialsFromContext(ctx);
    const cursor = cursorFrom(rawCursor);
    if (!shipBobToken(credentials)) return { supported: false, reason: 'shipbob_access_token_missing' };
    if (cursor.phase === 'locations') {
      const page = await listShipBobLocations(credentials, cursor.cursor);
      const records = page.items.flatMap((location): NormalizedRecord[] => {
        const id = String(location.id ?? '');
        return id ? [{ canonicalEntityType: 'location', sourceEntityType: 'location', externalId: id, sourceUpdatedAt: typeof location.updated_at === 'string' ? location.updated_at : null, data: location }] : [];
      });
      return pageResult(records, page.next ? { phase: 'locations', cursor: page.next } : { phase: 'orders', cursor: null });
    }
    if (cursor.phase === 'orders') {
      const page = await listShipBobOrders(credentials, cursor.cursor);
      const records = page.items.flatMap((order): NormalizedRecord[] => {
        const id = String(order.id ?? order.order_id ?? '');
        if (!id) return [];
        const mapped = mapShipBobOrder(order);
        const output: NormalizedRecord[] = [{ canonicalEntityType: 'order', sourceEntityType: 'order', externalId: id, sourceCreatedAt: typeof order.created_at === 'string' ? order.created_at : null, sourceUpdatedAt: typeof order.updated_at === 'string' ? order.updated_at : null, data: order }];
        output.push(...mapped.fulfilments.map((fulfilment) => ({ canonicalEntityType: 'fulfilment', sourceEntityType: 'fulfilment', externalId: fulfilment.externalId, data: { ...fulfilment, order } })));
        output.push(...mapped.shipments.map((shipment) => ({ canonicalEntityType: 'shipment', sourceEntityType: 'shipment', externalId: shipment.externalId, data: { ...shipment, order } })));
        return output;
      });
      return pageResult(records, page.next ? { phase: 'orders', cursor: page.next } : { phase: 'returns', cursor: null });
    }
    const page = await listShipBobReturns(credentials, cursor.cursor);
    const records = page.items.flatMap((ret): NormalizedRecord[] => {
      const id = String(ret.id ?? ret.return_id ?? '');
      return id ? [{ canonicalEntityType: 'return', sourceEntityType: 'return', externalId: id, sourceCreatedAt: typeof ret.created_at === 'string' ? ret.created_at : null, sourceUpdatedAt: typeof ret.updated_at === 'string' ? ret.updated_at : null, data: ret }] : [];
    });
    return pageResult(records, page.next ? { phase: 'returns', cursor: page.next } : null);
  },
  async incrementalSync(ctx, rawCursor): Promise<SyncPage | UnsupportedResult> {
    // ShipBob webhooks provide low-latency updates; reconciliation reuses the
    // same paginated order/return reads with a cursor and remains idempotent.
    return this.initialImport(ctx, rawCursor);
  },
  async processWebhook(_ctx: WebhookContext): Promise<IngestionResult | UnsupportedResult> {
    return { accepted: true, reason: 'shipbob_webhook_is_verified_and_enqueued_by_the_inbound_route' };
  },

  async normalize(input): Promise<NormalizedRecord[]> {
    const raw = input.raw;
    if (input.sourceEntityType === 'fulfilment') {
      const externalId = String(raw.id ?? raw.external_id ?? '');
      if (!externalId) return [];
      return [{ canonicalEntityType: 'fulfilment', sourceEntityType: 'fulfilment', externalId, data: raw }];
    }
    if (input.sourceEntityType === 'shipment' || input.sourceEntityType === 'return' || input.sourceEntityType === 'location' || input.sourceEntityType === 'order') {
      const externalId = String(raw.id ?? raw.external_id ?? raw.order_id ?? raw.return_id ?? '');
      if (!externalId) return [];
      return [{ canonicalEntityType: input.sourceEntityType, sourceEntityType: input.sourceEntityType, externalId, data: raw }];
    }
    return [];
  },

  deepLink(input: DeepLinkInput): string | null {
    return input.sourceUrl ?? null;
  },

  async disconnect(ctx: ConnectorContext): Promise<DisconnectResult> {
    // Best-effort: remove our webhook subscriptions so ShipBob stops POSTing
    // to a dead connection and reconnects don't accumulate ghost
    // subscriptions. Failure never blocks the disconnect itself.
    const credentials = credentialsFromContext(ctx);
    if (!shipBobToken(credentials)) return { ok: true };
    try {
      const ourUrlPrefix = `${getAppUrl()}/api/integrations/shipbob/webhook`;
      const existing = await listShipBobSubscriptions(credentials);
      const ours = existing.items.filter((subscription) => subscription.url?.startsWith(ourUrlPrefix));
      for (const subscription of ours) {
        await deleteShipBobSubscription(credentials, subscription.id);
      }
      return { ok: true };
    } catch {
      return { ok: true, message: 'shipbob_webhook_cleanup_failed' };
    }
  },
};
