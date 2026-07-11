/**
 * AfterShip connector adapter (wrapper).
 *
 * Wraps existing AfterShip tracking code. Produces shipment/tracking-event
 * canonical records; evidence is projected from those records, not the only
 * persisted result. Standard tracking APIs do not expose delivery GPS — the
 * capability set reflects that truthfully (no GPS/location-proof capability).
 */
import { capability } from '@/lib/connectors/capabilities';
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
  reason: 'AfterShip sync/webhook run through the dedicated tracking routes pending Phase 2 runtime wiring.',
};

export const aftershipConnector: ConnectorAdapter = {
  manifest: {
    id: 'aftership',
    name: 'AfterShip',
    category: 'tracking',
    authMode: 'api_key',
    verificationStatus: 'partial',
    launchVisible: true,
    connectorVersion: '1',
    description: 'Carrier tracking status and delivery events (no GPS proof).',
    capabilities: [
      capability('shipments.read', 'read', { description: 'Read shipments/trackings' }),
      capability('tracking_events.read', 'read', { description: 'Read tracking events' }),
      capability('shipments.subscribe', 'subscribe', { description: 'Tracking webhooks' }),
    ],
  },

  async testConnection(ctx: ConnectorContext): Promise<ConnectionTestResult> {
    const apiKey = ctx.credentials && typeof ctx.credentials.apiKey === 'string' ? ctx.credentials.apiKey : null;
    if (!apiKey) return { ok: false, errorCode: 'test_connection_failed', message: 'Missing API key.' };
    return { ok: true };
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
    if (input.sourceEntityType === 'shipment') {
      const externalId = String(raw.id ?? raw.tracking_number ?? '');
      if (!externalId) return [];
      return [{
        canonicalEntityType: 'shipment',
        sourceEntityType: 'shipment',
        externalId,
        data: raw,
      }];
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
