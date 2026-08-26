import { CONNECTED_OBJECT_TYPES, isConnectedObjectType, type ObjectLink, type ObjectSummary } from '@/lib/relationships/objectSummary';
import { buildOrderEvidenceSpine, resolveConnectedObjectBackLink, safeInternalReturn, uniqueObjectLinks } from '@/components/relationships/ConnectedObjectDetail';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('UXR2 connected-object contract', () => {
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
    const source = readFileSync(join(process.cwd(), 'supabase/migrations/20260823190000_mr5_merchant_administration.sql'), 'utf8');
    expect(source).toContain("'/orders/' || orders.id::text");
    expect(source).toContain("'/tickets/' || ticket.id::text");
    expect(source).toContain("'/shipments/' || shipment.id::text");
  });

  it('projects a linked payout case as workflow fact, never a merchant decision', () => {
    const object: ObjectSummary = {
      id: 'order-1', type: 'order', reference: '#1001', sourceId: null, provider: 'shopify',
      state: 'paid', updatedAt: null, amount: 10, currency: 'GBP', sourceOrderId: null,
      customer: null, connected: [], facts: [], items: [], timeline: [], conversation: [], evidence: [],
      payoutCases: [{ type: 'case', id: 'case-1', reference: 'CASE-1', href: '/cases/case-1', state: 'awaiting_carrier_response' }],
      provenance: null,
    };
    const linkedCase = buildOrderEvidenceSpine(object).find((item) => item.key === 'case-case-1');
    expect(linkedCase).toMatchObject({
      authority: 'fact',
      label: 'Linked case',
      meta: 'Workflow state: Awaiting Carrier Response',
    });
    expect(buildOrderEvidenceSpine(object).some((item) => item.authority === 'decision')).toBe(false);
  });

  it.each([
    ['external origin', 'https://host'],
    ['protocol-relative origin', '//host'],
    ['literal backslash', '/\\host'],
    ['encoded backslash', '/%5Chost'],
    ['control character', '/work\u0000'],
    ['leading whitespace', ' /work'],
    ...['/orders', '/shipments', '/tickets', '/refunds', '/returns', '/disputes'].map((path) => [`forbidden ${path}`, path]),
  ])('rejects unsafe connected-object return: %s', (_label, value) => {
    expect(safeInternalReturn(value)).toBeNull();
  });

  it('retains a valid internal path with query and hash', () => {
    expect(safeInternalReturn('/work?view=open#queue')).toBe('/work?view=open#queue');
  });

  it('deduplicates role-less links while preserving explicitly distinct roles', () => {
    const links: ObjectLink[] = [
      { type: 'customer', id: 'customer-1', reference: 'Ada', href: '/customers/customer-1' },
      { type: 'customer', id: 'customer-1', reference: 'Ada', href: '/customers/customer-1' },
      { type: 'order', id: 'order-1', reference: '#1001', href: '/orders/order-1', role: 'replacement order' },
      { type: 'order', id: 'order-1', reference: '#1001', href: '/orders/order-1', role: 'original order' },
    ];
    expect(uniqueObjectLinks(links)).toEqual([links[0], links[2], links[3]]);
  });

  it('resolves requested return, customer, then encoded search fallback in order', () => {
    const object: ObjectSummary = {
      id: 'order-1', type: 'order', reference: '#1001 / London', sourceId: null, provider: 'shopify',
      state: 'paid', updatedAt: null, amount: 10, currency: 'GBP', sourceOrderId: null,
      customer: { type: 'customer', id: 'customer-1', reference: 'Ada', href: '/customers/customer-1' },
      connected: [], facts: [], items: [], timeline: [], conversation: [], evidence: [], payoutCases: [], provenance: null,
    };
    expect(resolveConnectedObjectBackLink(object, '/work?view=open#queue')).toEqual({ href: '/work?view=open#queue', label: 'Back to work' });
    expect(resolveConnectedObjectBackLink(object, '/orders')).toEqual({ href: '/customers/customer-1', label: 'Back to customer' });
    expect(resolveConnectedObjectBackLink({ ...object, customer: null }, 'https://host')).toEqual({ href: '/search?q=%231001%20%2F%20London', label: 'Search workspace' });
  });
});
