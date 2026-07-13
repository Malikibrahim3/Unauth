import { CONNECTED_OBJECT_TYPES, isConnectedObjectType } from '@/lib/relationships/objectSummary';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Phase 4 connected-object contract', () => {
  it('admits exactly the supported first-class source objects', () => {
    expect(CONNECTED_OBJECT_TYPES).toEqual(['order', 'ticket', 'shipment', 'refund', 'return', 'dispute']);
    for (const type of CONNECTED_OBJECT_TYPES) expect(isConnectedObjectType(type)).toBe(true);
    expect(isConnectedObjectType('customer')).toBe(false);
    expect(isConnectedObjectType('__proto__')).toBe(false);
  });

  it.each(['orders', 'tickets', 'shipments', 'refunds', 'returns', 'disputes'])('%s has a real detail route', (folder) => {
    const source = readFileSync(join(process.cwd(), 'app', '(app)', folder, '[id]', 'page.tsx'), 'utf8');
    expect(source).toContain('connectedObjectPage');
  });

  it('does not send supported object search results to the generic claims queue', () => {
    const source = readFileSync(join(process.cwd(), 'app/api/search/route.ts'), 'utf8');
    expect(source).toContain('href: `/orders/${o.id}`');
    expect(source).toContain('href: `/tickets/${t.id}`');
    expect(source).toContain('href: `/shipments/${s.id}`');
  });
});
