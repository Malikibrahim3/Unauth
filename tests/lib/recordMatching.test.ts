import { createMemoryClient, rowsOf } from '@/tests/lib/supabaseMemoryClient';
import { deriveMatchResult, methodPriority, isStrongMethod } from '@/lib/relationships/matchTypes';
import { matchOrder } from '@/lib/relationships/matchOrder';
import { matchCustomer } from '@/lib/relationships/matchCustomer';
import { matchShipment } from '@/lib/relationships/matchShipment';
import { applyMatch } from '@/lib/relationships/applyMatch';
import { TABLES } from '@/lib/supabase/tables';

const MERCHANT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('deriveMatchResult', () => {
  it('confirms a single strong-method candidate', () => {
    const r = deriveMatchResult([{ entityType: 'order', entityId: 'o1', method: 'order_number' }]);
    expect(r.status).toBe('confirmed');
    expect(r.selected?.entityId).toBe('o1');
  });

  it('marks a single weak (email) candidate probable', () => {
    const r = deriveMatchResult([{ entityType: 'order', entityId: 'o1', method: 'email' }]);
    expect(r.status).toBe('probable');
  });

  it('marks multiple same-strength candidates ambiguous', () => {
    const r = deriveMatchResult([
      { entityType: 'order', entityId: 'o1', method: 'email' },
      { entityType: 'order', entityId: 'o2', method: 'email' },
    ]);
    expect(r.status).toBe('ambiguous');
    expect(r.selected).toBeNull();
  });

  it('is unmatched with no candidates', () => {
    expect(deriveMatchResult([]).status).toBe('unmatched');
  });

  it('orders methods strongest first', () => {
    expect(methodPriority('connector_declared')).toBeLessThan(methodPriority('email'));
    expect(isStrongMethod('order_number')).toBe(true);
    expect(isStrongMethod('email')).toBe(false);
  });
});

function seedOrders(rows: Array<Record<string, unknown>>) {
  const client = createMemoryClient();
  client.__store.set('source_orders', rows.map((r) => ({ merchant_id: MERCHANT, ...r })));
  return client;
}

describe('matchOrder', () => {
  it('confirms an exact order-number match', async () => {
    const client = seedOrders([{ id: 'o1', order_number: '1013', external_id: 'X1' }]);
    const r = await matchOrder(client as never, { merchantId: MERCHANT, orderNumbers: ['1013'] });
    expect(r.status).toBe('confirmed');
    expect(r.selected?.entityId).toBe('o1');
    expect(r.method).toBe('order_number');
  });

  it('returns ambiguous for two orders sharing one email and never picks one', async () => {
    const client = seedOrders([
      { id: 'o1', email: 'a@b.com', placed_at: '2026-01-01' },
      { id: 'o2', email: 'a@b.com', placed_at: '2026-02-01' },
    ]);
    const r = await matchOrder(client as never, { merchantId: MERCHANT, email: 'a@b.com' });
    expect(r.status).toBe('ambiguous');
    expect(r.selected).toBeNull();
    expect(r.candidates.map((c) => c.entityId).sort()).toEqual(['o1', 'o2']);
  });

  it('prefers a strong order-number match over a weaker email match', async () => {
    const client = seedOrders([
      { id: 'o1', order_number: '1013', email: 'a@b.com' },
      { id: 'o2', email: 'a@b.com' },
    ]);
    const r = await matchOrder(client as never, { merchantId: MERCHANT, orderNumbers: ['1013'], email: 'a@b.com' });
    expect(r.status).toBe('confirmed');
    expect(r.selected?.entityId).toBe('o1');
  });

  it('resolves an order via tracking number through shipments', async () => {
    const client = seedOrders([{ id: 'o1', order_number: '9' }]);
    client.__store.set(TABLES.SOURCE_SHIPMENTS, [
      { id: 's1', merchant_id: MERCHANT, tracking_number: 'TRK1', source_order_id: 'o1' },
    ]);
    const r = await matchOrder(client as never, { merchantId: MERCHANT, trackingNumbers: ['TRK1'] });
    expect(r.status).toBe('confirmed');
    expect(r.selected?.entityId).toBe('o1');
    expect(r.method).toBe('tracking_number');
  });
});

describe('matchCustomer / matchShipment', () => {
  it('matches a customer by source id', async () => {
    const client = createMemoryClient();
    client.__store.set(TABLES.SOURCE_CUSTOMERS, [{ id: 'c1', merchant_id: MERCHANT, email: 'a@b.com' }]);
    const r = await matchCustomer(client as never, { merchantId: MERCHANT, sourceCustomerId: 'c1' });
    expect(r.status).toBe('confirmed');
  });

  it('matches a shipment by tracking number', async () => {
    const client = createMemoryClient();
    client.__store.set(TABLES.SOURCE_SHIPMENTS, [{ id: 's1', merchant_id: MERCHANT, tracking_number: 'TRK1' }]);
    const r = await matchShipment(client as never, { merchantId: MERCHANT, trackingNumbers: ['TRK1'] });
    expect(r.status).toBe('confirmed');
    expect(r.selected?.entityId).toBe('s1');
  });
});

describe('applyMatch persistence', () => {
  it('upserts a confirmed relationship and emits relationship.confirmed', async () => {
    const client = seedOrders([{ id: 'o1', order_number: '1013' }]);
    const result = await matchOrder(client as never, { merchantId: MERCHANT, orderNumbers: ['1013'] });
    const outcome = await applyMatch(client as never, {
      merchantId: MERCHANT,
      subjectEntityType: 'case',
      subjectEntityId: 'case-1',
      result,
    });
    expect(outcome.status).toBe('confirmed');
    const edges = rowsOf(client, TABLES.ENTITY_RELATIONSHIPS);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      from_entity_type: 'case', to_entity_type: 'order', to_entity_id: 'o1', match_status: 'confirmed',
      relationship_type: 'case_order',
    });
    const events = rowsOf(client, 'domain_events');
    expect(events.some((e) => e.event_type === 'relationship.confirmed')).toBe(true);
  });

  it('records candidates and no edge for an ambiguous match', async () => {
    const client = seedOrders([
      { id: 'o1', email: 'a@b.com' },
      { id: 'o2', email: 'a@b.com' },
    ]);
    const result = await matchOrder(client as never, { merchantId: MERCHANT, email: 'a@b.com' });
    const outcome = await applyMatch(client as never, {
      merchantId: MERCHANT,
      subjectEntityType: 'case',
      subjectEntityId: 'case-1',
      result,
    });
    expect(outcome.status).toBe('ambiguous');
    expect(rowsOf(client, TABLES.ENTITY_RELATIONSHIPS)).toHaveLength(0);
    expect(rowsOf(client, TABLES.RECORD_MATCH_CANDIDATES)).toHaveLength(2);
    const events = rowsOf(client, 'domain_events');
    expect(events.some((e) => e.event_type === 'relationship.ambiguous')).toBe(true);
  });
});
