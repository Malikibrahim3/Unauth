import { capability } from '@/lib/connectors/capabilities';
import { resolveCapabilityAvailability } from '@/lib/connectors/runtime';

const healthy = { status: 'connected', grantedScopes: ['read_orders'], writebackEnabled: true };

describe('runtime capability availability', () => {
  it('is enabled when supported, scoped, healthy', () => {
    const r = resolveCapabilityAvailability(
      capability('orders.read', 'read', { requiredScopes: ['read_orders'] }),
      healthy,
    );
    expect(r.availability).toBe('enabled');
  });

  it('is permission_missing when a required scope is absent', () => {
    const r = resolveCapabilityAvailability(
      capability('orders.read', 'read', { requiredScopes: ['read_orders'] }),
      { ...healthy, grantedScopes: [] },
    );
    expect(r.availability).toBe('permission_missing');
  });

  it('is merchant_disabled for write/act when writeback is off', () => {
    const r = resolveCapabilityAvailability(
      capability('tickets.write_note', 'write'),
      { ...healthy, writebackEnabled: false },
    );
    expect(r.availability).toBe('merchant_disabled');
  });

  it('is degraded when the connection is unhealthy', () => {
    const r = resolveCapabilityAvailability(
      capability('orders.read', 'read', { requiredScopes: ['read_orders'] }),
      { ...healthy, status: 'error' },
    );
    expect(r.availability).toBe('degraded');
  });

  it('reports a revoked connection as degraded before considering stale scopes', () => {
    const r = resolveCapabilityAvailability(
      capability('orders.read', 'read', { requiredScopes: ['read_orders'] }),
      { status: 'revoked', grantedScopes: [], writebackEnabled: false },
    );
    expect(r.availability).toBe('degraded');
  });

  it('is unsupported when the connector declares no support', () => {
    const r = resolveCapabilityAvailability(
      capability('refund.issue', 'act', { support: 'unsupported' }),
      healthy,
    );
    expect(r.availability).toBe('unsupported');
  });
});
