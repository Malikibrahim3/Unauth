/**
 * ShipBob connector adapter (wrapper).
 *
 * Wraps existing ShipBob warehouse code. Produces fulfilment/shipment/return
 * canonical records; warehouse-accountability evidence is projected from those.
 */
import { capability } from '@/lib/connectors/capabilities';
import { verifyShipBobPat } from '@/lib/integrations/providers/shipbob';
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

const RUNTIME_PENDING: UnsupportedResult = {
  supported: false,
  reason: 'ShipBob sync/webhook run through the dedicated warehouse routes pending Phase 2 runtime wiring.',
};

export const shipbobConnector: ConnectorAdapter = {
  manifest: {
    id: 'shipbob',
    name: 'ShipBob',
    category: 'warehouse_3pl',
    authMode: 'api_key',
    verificationStatus: 'partial',
    launchVisible: true,
    connectorVersion: '1',
    description: 'Warehouse fulfilment, pick/pack, shipments, and returns.',
    capabilities: [
      capability('fulfilments.read', 'read', { description: 'Read fulfilments/pick-pack' }),
      capability('shipments.read', 'read', { description: 'Read shipments' }),
      capability('returns.read', 'read', { description: 'Read returns' }),
    ],
  },

  async testConnection(ctx: ConnectorContext): Promise<ConnectionTestResult> {
    const token = ctx.credentials && typeof (ctx.credentials.apiKey ?? ctx.credentials.accessToken) === 'string'
      ? String(ctx.credentials.apiKey ?? ctx.credentials.accessToken)
      : null;
    if (!token) return { ok: false, errorCode: 'test_connection_failed', message: 'Missing access token.' };
    try {
      const access = await verifyShipBobPat(
        token,
        ctx.credentials?.sandbox === true,
        typeof ctx.credentials?.channelId === 'string' ? ctx.credentials.channelId : undefined,
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

  async initialImport(): Promise<SyncPage | UnsupportedResult> {
    return RUNTIME_PENDING;
  },
  async incrementalSync(): Promise<SyncPage | UnsupportedResult> {
    return RUNTIME_PENDING;
  },
  async processWebhook(_ctx: WebhookContext): Promise<IngestionResult | UnsupportedResult> {
    return RUNTIME_PENDING;
  },

  async normalize(input): Promise<NormalizedRecord[]> {
    const raw = input.raw;
    if (input.sourceEntityType === 'fulfilment') {
      const externalId = String(raw.id ?? raw.external_id ?? '');
      if (!externalId) return [];
      return [{ canonicalEntityType: 'fulfilment', sourceEntityType: 'fulfilment', externalId, data: raw }];
    }
    return [];
  },

  deepLink(input: DeepLinkInput): string | null {
    return input.sourceUrl ?? null;
  },

  async disconnect(): Promise<DisconnectResult> {
    return { ok: true };
  },
};
