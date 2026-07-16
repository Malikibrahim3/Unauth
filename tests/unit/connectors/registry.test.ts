import {
  getConnector,
  requireConnector,
  isConnectorRegistered,
  listConnectors,
  launchVisibleConnectors,
} from '@/lib/connectors/registry';
import { ConnectorError } from '@/lib/connectors/errors';
import { getIntegrationProvider } from '@/lib/integrations/registry';

describe('connector registry', () => {
  it('resolves registered connectors by id', () => {
    expect(getConnector('shopify')?.manifest.id).toBe('shopify');
    expect(getConnector('gorgias')?.manifest.id).toBe('gorgias');
    expect(isConnectorRegistered('ups')).toBe(true);
    expect(isConnectorRegistered('fedex')).toBe(true);
    expect(isConnectorRegistered('aftership')).toBe(false);
  });

  it('returns null / false for unknown providers', () => {
    expect(getConnector('does_not_exist')).toBeNull();
    expect(isConnectorRegistered('does_not_exist')).toBe(false);
  });

  it('requireConnector throws a typed connector_not_registered error', () => {
    try {
      requireConnector('does_not_exist');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ConnectorError);
      expect((e as ConnectorError).code).toBe('connector_not_registered');
      expect((e as ConnectorError).providerId).toBe('does_not_exist');
    }
  });

  it('exposes launch-visible connectors as a subset of all connectors', () => {
    const all = listConnectors().map((c) => c.manifest.id);
    const visible = launchVisibleConnectors().map((c) => c.manifest.id);
    expect(visible.every((id) => all.includes(id))).toBe(true);
    expect(all).toEqual(expect.arrayContaining(['shopify', 'gorgias', 'ups', 'fedex', 'shipbob', 'document_upload']));
  });

  it('derives shared provider metadata from the canonical integration registry', () => {
    for (const connector of listConnectors()) {
      const provider = getIntegrationProvider(connector.manifest.id);
      expect(provider).not.toBeNull();
      const sharedMetadata = {
        id: provider?.id,
        name: provider?.name,
        category: provider?.category,
        authMode: provider?.authMode,
        ...(provider?.description ? { description: provider.description } : {}),
      };
      expect(connector.manifest).toMatchObject(sharedMetadata);
    }
  });
});
