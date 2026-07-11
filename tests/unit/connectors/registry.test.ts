import {
  getConnector,
  requireConnector,
  isConnectorRegistered,
  listConnectors,
  launchVisibleConnectors,
} from '@/lib/connectors/registry';
import { ConnectorError } from '@/lib/connectors/errors';

describe('connector registry', () => {
  it('resolves registered connectors by id', () => {
    expect(getConnector('shopify')?.manifest.id).toBe('shopify');
    expect(getConnector('gorgias')?.manifest.id).toBe('gorgias');
    expect(isConnectorRegistered('aftership')).toBe(true);
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
    expect(all).toEqual(expect.arrayContaining(['shopify', 'gorgias', 'aftership', 'shipbob', 'document_upload']));
  });
});
