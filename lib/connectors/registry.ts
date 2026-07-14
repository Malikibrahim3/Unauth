/**
 * Connector registry. The single place generic routes/runtime resolve a
 * provider adapter. Adding a new connector means registering it here — no edits
 * to the generic connect/sync/disconnect routes.
 *
 * `lib/integrations/registry.ts` remains as a compatibility shim that delegates
 * to this module.
 *
 * See docs/IMPL_source_agnostic_connected_ecosystem.md §5.
 */
import type { ConnectorAdapter } from '@/lib/connectors/types';
import { connectorNotRegistered } from '@/lib/connectors/errors';
import { shopifyConnector } from '@/lib/connectors/providers/shopify';
import { gorgiasConnector } from '@/lib/connectors/providers/gorgias';
import { fedexConnector, upsConnector } from '@/lib/connectors/providers/carriers';
import { shipbobConnector } from '@/lib/connectors/providers/shipbob';
import { documentUploadConnector } from '@/lib/connectors/providers/documentUpload';

const ADAPTERS: ConnectorAdapter[] = [
  shopifyConnector,
  gorgiasConnector,
  upsConnector,
  fedexConnector,
  shipbobConnector,
  documentUploadConnector,
];

const byId = new Map<string, ConnectorAdapter>(ADAPTERS.map((a) => [a.manifest.id, a]));

export function listConnectors(): ConnectorAdapter[] {
  return [...ADAPTERS];
}

export function getConnector(providerId: string): ConnectorAdapter | null {
  return byId.get(providerId) ?? null;
}

/** Throws a typed `connector_not_registered` error for unknown providers. */
export function requireConnector(providerId: string): ConnectorAdapter {
  const adapter = byId.get(providerId);
  if (!adapter) throw connectorNotRegistered(providerId);
  return adapter;
}

export function isConnectorRegistered(providerId: string): boolean {
  return byId.has(providerId);
}

/** Connectors whose merchant-facing card should show (launchVisible). */
export function launchVisibleConnectors(): ConnectorAdapter[] {
  return ADAPTERS.filter((a) => a.manifest.launchVisible);
}
