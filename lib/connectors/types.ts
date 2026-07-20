/**
 * The single connector contract. Every source provider (Shopify, Gorgias,
 * UPS, FedEx, ShipBob, document upload, and future connectors) implements this
 * interface, so generic routes/runtime never branch on provider IDs.
 *
 * Provider adapter modules are WRAPPERS around existing proven OAuth/API/
 * signature/normalizer code — they do not re-implement it.
 *
 * See ARCHITECTURE.md §5.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { IntegrationAuthMode, IntegrationCategory } from '@/lib/integrations/types';
import type { ConnectorCapability } from '@/lib/connectors/capabilities';

/** Whether the connector's full lifecycle is implemented + tested. */
export type ConnectorVerificationStatus = 'verified' | 'partial' | 'unverified';

export type ConnectorManifest = {
  id: string;
  name: string;
  category: IntegrationCategory;
  authMode: IntegrationAuthMode;
  capabilities: ConnectorCapability[];
  /**
   * Runtime availability + verification are independent of merchant-facing
   * launch visibility (Woo/BigCommerce are implemented but "coming soon").
   */
  verificationStatus: ConnectorVerificationStatus;
  launchVisible: boolean;
  description?: string;
  connectorVersion: string;
};

export type ConnectorContext = {
  client: SupabaseClient;
  merchantId: string;
  connectionId?: string | null;
  sourceAccountId?: string | null;
  /** Decrypted credential material, provided by the runtime, never logged. */
  credentials?: Record<string, unknown> | null;
};

export type WebhookContext = {
  client: SupabaseClient;
  /** Raw request bytes — verify signatures against these BEFORE parsing JSON. */
  rawBody: string;
  headers: Record<string, string>;
  /** Merchant/connection resolved by the route from the credential, never body. */
  merchantId?: string | null;
  connectionId?: string | null;
};

export type ConnectionTestResult = {
  ok: boolean;
  providerAccountId?: string | null;
  providerAccountName?: string | null;
  errorCode?: string;
  message?: string;
};

export type SyncCursor = Record<string, unknown> | null;

/** A single normalized record ready for canonical persistence + registry. */
export type NormalizedRecord = {
  canonicalEntityType: string;
  externalId: string;
  sourceEntityType: string;
  sourceUrl?: string | null;
  sourceCreatedAt?: string | null;
  sourceUpdatedAt?: string | null;
  data: Record<string, unknown>;
};

export type SyncPage = {
  records: NormalizedRecord[];
  nextCursor: SyncCursor;
  hasMore: boolean;
};

export type IngestionResult = {
  accepted: boolean;
  ingestionEventId?: string;
  duplicate?: boolean;
  reason?: string;
};

export type DeepLinkInput = {
  entityType: string;
  externalId: string;
  sourceUrl?: string | null;
  providerAccountBaseUrl?: string | null;
  providerEnvironment?: "sandbox" | "production" | string | null;
  /** Parent provider order id when linking a shipment/fulfilment. */
  relatedOrderExternalId?: string | null;
  /** Child ShipBob shipment id when linking a ShipBob order. */
  relatedShipmentExternalId?: string | null;
};

export type ConnectorAction = {
  id: string;
  capabilityId: string;
  payload: Record<string, unknown>;
};

export type ActionResult = {
  ok: boolean;
  reversible: boolean;
  message?: string;
};

export type DisconnectResult = { ok: boolean; message?: string };

/** Result union for sync methods a connector does not implement. */
export type UnsupportedResult = { supported: false; reason: string };

export interface ConnectorAdapter {
  manifest: ConnectorManifest;
  testConnection(ctx: ConnectorContext): Promise<ConnectionTestResult>;
  initialImport(ctx: ConnectorContext, cursor?: SyncCursor): Promise<SyncPage | UnsupportedResult>;
  incrementalSync(ctx: ConnectorContext, cursor?: SyncCursor): Promise<SyncPage | UnsupportedResult>;
  processWebhook(ctx: WebhookContext): Promise<IngestionResult | UnsupportedResult>;
  normalize(input: { sourceEntityType: string; raw: Record<string, unknown> }): Promise<NormalizedRecord[]>;
  deepLink(input: DeepLinkInput): string | null;
  executeAction?(ctx: ConnectorContext, action: ConnectorAction): Promise<ActionResult>;
  disconnect(ctx: ConnectorContext): Promise<DisconnectResult>;
}

export function isUnsupported(
  result: SyncPage | IngestionResult | UnsupportedResult,
): result is UnsupportedResult {
  return (result as UnsupportedResult).supported === false;
}
