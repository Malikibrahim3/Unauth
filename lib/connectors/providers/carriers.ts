import { capability } from '@/lib/connectors/capabilities';
import type { ConnectorAdapter, ConnectorContext, ConnectionTestResult, DisconnectResult, IngestionResult, NormalizedRecord, SyncPage, UnsupportedResult, WebhookContext } from '@/lib/connectors/types';
import { exchangeFedExClientCredentials } from '@/lib/integrations/providers/fedex';
import { exchangeUpsClientCredentials } from '@/lib/integrations/providers/ups';

const RUNTIME_PENDING: UnsupportedResult = {
  supported: false,
  reason: 'Carrier evidence is fetched on demand for matching case tracking numbers.',
};

function credentials(ctx: ConnectorContext) {
  return {
    clientId: typeof ctx.credentials?.clientId === 'string' ? ctx.credentials.clientId : '',
    clientSecret: typeof ctx.credentials?.clientSecret === 'string' ? ctx.credentials.clientSecret : '',
    environment: ctx.credentials?.environment === 'sandbox' ? 'sandbox' as const : 'production' as const,
  };
}

function carrierConnector(providerId: 'ups' | 'fedex', name: 'UPS' | 'FedEx'): ConnectorAdapter {
  return {
    manifest: {
      id: providerId,
      name,
      category: 'carrier',
      authMode: 'oauth',
      verificationStatus: 'partial',
      launchVisible: true,
      connectorVersion: '1',
      description: `Direct ${name} tracking, scan history, and delivery proof when available.`,
      capabilities: [
        capability('shipments.read', 'read', { description: 'Read shipment tracking details' }),
        capability('tracking_events.read', 'read', { description: 'Read detailed carrier scan events' }),
        capability('delivery_proof.read', 'read', { description: 'Read available signature and photo proof' }),
      ],
    },
    async testConnection(ctx: ConnectorContext): Promise<ConnectionTestResult> {
      const input = credentials(ctx);
      if (!input.clientId || !input.clientSecret) {
        return { ok: false, errorCode: 'test_connection_failed', message: 'Missing OAuth client credentials.' };
      }
      try {
        if (providerId === 'ups') await exchangeUpsClientCredentials(input);
        else await exchangeFedExClientCredentials(input);
        return { ok: true };
      } catch {
        return {
          ok: false,
          errorCode: 'test_connection_failed',
          message: `${name} credentials were rejected or the provider is temporarily unavailable.`,
        };
      }
    },
    async initialImport(): Promise<SyncPage | UnsupportedResult> { return RUNTIME_PENDING; },
    async incrementalSync(): Promise<SyncPage | UnsupportedResult> { return RUNTIME_PENDING; },
    async processWebhook(_ctx: WebhookContext): Promise<IngestionResult | UnsupportedResult> { return RUNTIME_PENDING; },
    async normalize(input): Promise<NormalizedRecord[]> {
      const externalId = String(input.raw.trackingNumber ?? input.raw.tracking_number ?? input.raw.id ?? '');
      if (!externalId) return [];
      return [{ canonicalEntityType: input.sourceEntityType === 'tracking_event' ? 'tracking_event' : 'shipment', sourceEntityType: input.sourceEntityType, externalId, data: input.raw }];
    },
    deepLink(): string | null { return null; },
    async disconnect(): Promise<DisconnectResult> { return { ok: true }; },
  };
}

export const upsConnector = carrierConnector('ups', 'UPS');
export const fedexConnector = carrierConnector('fedex', 'FedEx');
