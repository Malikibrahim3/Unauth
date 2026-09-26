/**
 * RUN-17 — customer aggregates derived from linked orders.
 *
 * Count, lifetime value, last order, average order and the detail denominator
 * all come from one projection over the same merchant-scoped orders, so the
 * registry and the detail page cannot disagree.
 *
 * The final assertions run against a purpose-created guarded local fixture, so this is checked
 * against real linked rows rather than only hand-built inputs.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import {
  aggregateCustomerOrders,
  type LinkedOrder,
} from '@/lib/customers/aggregates';

const projectId = readFileSync('supabase/config.toml', 'utf8').match(/^project_id\s*=\s*"([A-Za-z0-9_-]+)"/m)?.[1];
const CONTAINER = `supabase_db_${projectId}`;
const MERCHANT_ID = randomUUID();
const HERO_CUSTOMER = randomUUID();
const NO_ORDER_CUSTOMER = randomUUID();
const fixtureReceipt = `/private/tmp/unauth-customer-aggregates-${MERCHANT_ID}.json`;
let fixtureCreated = false;

function sql(statement: string): string[] {
  const result = spawnSync(
    'docker',
    ['exec', CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-v', 'ON_ERROR_STOP=1', '-At', '-F', '|', '-c', statement],
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

describeWithDatabase('customer aggregates against a purpose-created local fixture', () => {
    beforeAll(() => {
      const endpoint = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
      if (process.env.RELEASE_E2E_LOCAL !== '1' || !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(endpoint).hostname)) {
        throw new Error('Customer database acceptance requires the guarded loopback runtime.');
      }
      writeFileSync(fixtureReceipt, JSON.stringify({ merchantId: MERCHANT_ID, customerIds: [HERO_CUSTOMER, NO_ORDER_CUSTOMER], state: 'preparing' }));
      sql(`BEGIN;
        INSERT INTO public.merchants(id,name,is_demo,is_internal,settings) VALUES
          ('${MERCHANT_ID}','Local customer aggregate proof',true,true,'{"fixture":"customer-aggregates-local"}');
        INSERT INTO public.source_customers(id,merchant_id,source,external_id) VALUES
          ('${HERO_CUSTOMER}','${MERCHANT_ID}','shopify','aggregate-with-orders'),
          ('${NO_ORDER_CUSTOMER}','${MERCHANT_ID}','shopify','aggregate-no-orders');
        INSERT INTO public.source_orders(merchant_id,source,external_id,source_customer_id,total_price,currency,processed_at) VALUES
          ('${MERCHANT_ID}','shopify','aggregate-gbp','${HERO_CUSTOMER}',10,'GBP','2026-09-01T12:00:00Z'),
          ('${MERCHANT_ID}','shopify','aggregate-eur','${HERO_CUSTOMER}',20,'EUR','2026-09-02T12:00:00Z'),
          ('${MERCHANT_ID}','shopify','aggregate-unknown','${HERO_CUSTOMER}',30,null,'2026-09-03T12:00:00Z');
        COMMIT;`);
      fixtureCreated = true;
    });

    afterAll(() => {
      if (!fixtureCreated) return;
      sql(`BEGIN;
        DO $guard$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM public.merchants WHERE id='${MERCHANT_ID}' AND is_demo AND is_internal AND settings->>'fixture'='customer-aggregates-local') THEN
            RAISE EXCEPTION 'Refusing cleanup outside the exact aggregate fixture';
          END IF;
        END $guard$;
        SET LOCAL app.allow_domain_event_purge='on';
        DELETE FROM public.source_orders WHERE merchant_id='${MERCHANT_ID}';
        DELETE FROM public.source_customers WHERE merchant_id='${MERCHANT_ID}';
        DELETE FROM public.domain_event_deliveries WHERE merchant_id='${MERCHANT_ID}';
        DELETE FROM public.domain_events WHERE merchant_id='${MERCHANT_ID}';
        DELETE FROM public.merchant_rule_input_versions WHERE merchant_id='${MERCHANT_ID}';
        DELETE FROM public.merchants WHERE id='${MERCHANT_ID}';
        COMMIT;`);
      expect(sql(`SELECT count(*) FROM public.merchants WHERE id='${MERCHANT_ID}'`)).toEqual(['0']);
      expect(sql(`SELECT count(*) FROM public.source_orders WHERE merchant_id='${MERCHANT_ID}'`)).toEqual(['0']);
      expect(sql(`SELECT count(*) FROM public.source_customers WHERE merchant_id='${MERCHANT_ID}'`)).toEqual(['0']);
      expect(sql(`SELECT count(*) FROM public.domain_events WHERE merchant_id='${MERCHANT_ID}'`)).toEqual(['0']);
      writeFileSync(fixtureReceipt, JSON.stringify({ merchantId: MERCHANT_ID, customerIds: [HERO_CUSTOMER, NO_ORDER_CUSTOMER], state: 'cleaned-and-verified' }));
    });
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
