/**
 * RUN-17 — customer aggregates derived from linked orders.
 *
 * Count, lifetime value, last order, average order and the detail denominator
 * all come from one projection over the same merchant-scoped orders, so the
 * registry and the detail page cannot disagree.
 *
 * The final assertions run against the seeded QA fixture, so this is checked
 * against real linked rows rather than only hand-built inputs.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  aggregateCustomerOrders,
  type LinkedOrder,
} from '@/lib/customers/aggregates';

const projectId = readFileSync('supabase/config.toml', 'utf8').match(/^project_id\s*=\s*"([A-Za-z0-9_-]+)"/m)?.[1];
const CONTAINER = `supabase_db_${projectId}`;
const MERCHANT_ID = 'f1000000-0000-4000-8000-000000000001';
const HERO_CUSTOMER = 'f1000300-0000-4000-8000-000000000001';
const NO_ORDER_CUSTOMER = 'f1000300-0000-4000-8000-000000000002';

function sql(statement: string): string[] {
  const result = spawnSync(
    'docker',
    ['exec', CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-At', '-F', '|', '-c', statement],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || '').trim());
  return (result.stdout ?? '').trim().split('\n').filter(Boolean);
}

function linkedOrders(customerId: string): LinkedOrder[] {
  return sql(`
    select id, coalesce(round(total_price * 100)::bigint::text, ''), coalesce(currency, ''), coalesce(processed_at::text, '')
    from public.source_orders
    where merchant_id = '${MERCHANT_ID}' and source_customer_id = '${customerId}'
  `).map((line) => {
    const [orderId, totalMinor, currency, processedAt] = line.split('|');
    return {
      orderId,
      totalMinor: totalMinor ? Number(totalMinor) : null,
      currency: currency || null,
      processedAt: processedAt || null,
    };
  });
}

const describeWithDatabase = process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

describeWithDatabase('customer aggregates against the seeded database fixture', () => {
    it('agrees with the linked source orders for the hero customer', () => {
      const orders = linkedOrders(HERO_CUSTOMER);
      expect(orders.length).toBeGreaterThan(0);
      const aggregates = aggregateCustomerOrders(orders);

      // Independent check straight from SQL, so the projection is compared with
      // the database rather than with itself.
      const [row] = sql(`
        select count(*), coalesce(max(processed_at)::text, '')
        from public.source_orders
        where merchant_id = '${MERCHANT_ID}' and source_customer_id = '${HERO_CUSTOMER}'
      `);
      const [count, lastAt] = row.split('|');
      expect(aggregates.orderCount).toBe(Number(count));
      expect(aggregates.lastOrderAt).toBe(lastAt || null);
    });

    it('reports the fixture customer with no orders as unavailable, not zero', () => {
      const aggregates = aggregateCustomerOrders(linkedOrders(NO_ORDER_CUSTOMER));
      expect(aggregates.orderCount).toBe(0);
      expect(aggregates.lifetimeValueMinor).toBeNull();
    });

    it('detects the fixture hero customer spanning currencies', () => {
      // The fixture deliberately gives the hero customer a GBP, a EUR and a
      // currency-less order, so the mixed-currency path is exercised for real.
      const aggregates = aggregateCustomerOrders(linkedOrders(HERO_CUSTOMER));
      expect(aggregates.mixedCurrency).toBe(true);
      expect(aggregates.lifetimeValueMinor).toBeNull();
    });
});
