import { capability, FORBIDDEN_MVP_CAPABILITIES } from '@/lib/connectors/capabilities';

describe('connector capability model', () => {
  it('defaults support to supported and enabledByDefault to true', () => {
    const c = capability('orders.read', 'read');
    expect(c.support).toBe('supported');
    expect(c.enabledByDefault).toBe(true);
    expect(c.risk).toBe('low');
  });

  it('assigns higher risk to write/act levels', () => {
    expect(capability('tickets.write_note', 'write').risk).toBe('medium');
    expect(capability('something.act', 'act').risk).toBe('high');
  });

  it('structurally forces forbidden MVP+ capabilities to unsupported/disabled', () => {
    for (const id of FORBIDDEN_MVP_CAPABILITIES) {
      const c = capability(id, 'act', { support: 'supported', enabledByDefault: true });
      expect(c.support).toBe('unsupported');
      expect(c.enabledByDefault).toBe(false);
    }
  });

  it('carries required scopes through', () => {
    expect(capability('orders.read', 'read', { requiredScopes: ['read_orders'] }).requiredScopes)
      .toEqual(['read_orders']);
  });
});
