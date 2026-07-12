/**
 * Shopify connector adapter (wrapper).
 *
 * Wraps existing Shopify OAuth/API/normalizer code; it does not re-implement it.
 * Sync/webhook currently run through the dedicated Shopify routes, so those
 * methods return a typed `unsupported` result here (verificationStatus:
 * 'partial') rather than reporting a false success — the Phase 2 route refactor
 * will route them through the durable sync engine.
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
  reason: 'Shopify sync/webhook run through the dedicated Shopify routes pending Phase 2 runtime wiring.',
};

export const shopifyConnector: ConnectorAdapter = {
  manifest: {
    id: 'shopify',
    name: 'Shopify',
    category: 'commerce',
    authMode: 'oauth',
    verificationStatus: 'partial',
    launchVisible: true,
    connectorVersion: '2026-01',
    description: 'Orders, refunds, fulfilments, and Shopify Payments disputes.',
    capabilities: [
      capability('orders.read', 'read', { requiredScopes: ['read_orders'], description: 'Read orders' }),
      capability('orders.sync', 'sync', { requiredScopes: ['read_orders'], description: 'Backfill/sync orders' }),
      capability('refunds.read', 'read', { requiredScopes: ['read_orders'], description: 'Read refunds' }),
      capability('fulfilments.read', 'read', { requiredScopes: ['read_fulfillments'], description: 'Read fulfilments' }),
      // Shopify's disputes webhook topic requires the separate
      // read_shopify_payments_disputes scope. It is intentionally not part of
      // the pilot grant, so dispute ingestion remains a documented limitation.
      capability('disputes.read', 'read', { requiredScopes: ['read_shopify_payments_disputes'], description: 'Read payment disputes' }),
      capability('orders.subscribe', 'subscribe', { description: 'Order webhooks' }),
      // MVP+ boundary: automatic refund issuance stays unsupported.
      capability('refund.issue', 'act', { support: 'unsupported', description: 'Issue refund (forbidden in MVP+)' }),
    ],
  },

  async testConnection(ctx: ConnectorContext): Promise<ConnectionTestResult> {
    const creds = ctx.credentials ?? {};
    const shopDomain = typeof creds.shopDomain === 'string' ? creds.shopDomain : null;
    const accessToken = typeof creds.accessToken === 'string' ? creds.accessToken : null;
    if (!shopDomain || !accessToken) {
      return { ok: false, errorCode: 'test_connection_failed', message: 'Missing shop domain or access token.' };
    }
    return { ok: true, providerAccountId: shopDomain, providerAccountName: shopDomain };
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
    if (input.sourceEntityType === 'order') {
      const externalId = String(raw.id ?? raw.external_id ?? '');
      if (!externalId) return [];
      return [{
        canonicalEntityType: 'order',
        sourceEntityType: 'order',
        externalId,
        sourceCreatedAt: typeof raw.created_at === 'string' ? raw.created_at : null,
        sourceUpdatedAt: typeof raw.updated_at === 'string' ? raw.updated_at : null,
        data: raw,
      }];
    }
    return [];
  },

  deepLink(input: DeepLinkInput): string | null {
    const base = input.providerAccountBaseUrl?.replace(/\/$/, '');
    if (input.sourceUrl) return input.sourceUrl;
    if (!base) return null;
    if (input.entityType === 'order') return `${base}/admin/orders/${input.externalId}`;
    return null;
  },

  async disconnect(): Promise<DisconnectResult> {
    return { ok: true };
  },
};
