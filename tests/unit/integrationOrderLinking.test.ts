import {
  resolveLinkedCarrierTracking,
  resolveShipBobOrderReference,
} from '@/lib/integrations/orderLinking';

type Row = Record<string, any>;

class Query {
  private filters: Array<(row: Row) => boolean> = [];
  private limitCount: number | null = null;

  constructor(private readonly rows: Row[]) {}

  select() { return this; }
  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }
  not(column: string, operator: string, value: unknown) {
    if (operator === 'is' && value === null) this.filters.push((row) => row[column] !== null && row[column] !== undefined);
    return this;
  }
  order() { return this; }
  limit(count: number) { this.limitCount = count; return this; }

  private result() {
    const rows = this.rows.filter((row) => this.filters.every((filter) => filter(row)));
    return this.limitCount == null ? rows : rows.slice(0, this.limitCount);
  }

  async maybeSingle() {
    return { data: this.result()[0] ?? null, error: null };
  }

  then<TResult1 = { data: Row[]; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: Row[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve({ data: this.result(), error: null }).then(onfulfilled, onrejected);
  }
}

function client(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      return new Query(tables[table] ?? []);
    },
  } as any;
}

describe('cross-provider order linking', () => {
  it('finds ShipBob shipment tracking from the linked Shopify order', async () => {
    const db = client({
      source_orders: [
        { id: 'shopify-order', merchant_id: 'm1', source: 'shopify', external_id: '6321001', order_number: '1157' },
        { id: 'shipbob-order', merchant_id: 'm1', source: 'shipbob', external_id: '9811', order_number: '6321001' },
      ],
      source_fulfillments: [],
      source_shipments: [
        { source_order_id: 'shipbob-order', merchant_id: 'm1', tracking_number: '449044304137821', carrier: 'FedEx' },
      ],
    });

    await expect(resolveLinkedCarrierTracking(db, 'm1', 'shopify-order')).resolves.toEqual({
      trackingNumber: '449044304137821',
      carrier: 'FedEx',
    });
  });

  it('finds Shopify fulfillment tracking from the linked ShipBob order', async () => {
    const db = client({
      source_orders: [
        { id: 'shopify-order', merchant_id: 'm1', source: 'shopify', external_id: '6321001', order_number: '1157' },
        { id: 'shipbob-order', merchant_id: 'm1', source: 'shipbob', external_id: '9811', order_number: '6321001' },
      ],
      source_fulfillments: [
        { source_order_id: 'shopify-order', merchant_id: 'm1', tracking_number: '449044304137821', tracking_company: 'Federal Express' },
      ],
      source_shipments: [],
    });

    await expect(resolveLinkedCarrierTracking(db, 'm1', 'shipbob-order')).resolves.toEqual({
      trackingNumber: '449044304137821',
      carrier: 'Federal Express',
    });
  });

  it('uses Shopify external id—not its display order number—as ShipBob reference', async () => {
    const db = client({
      source_orders: [
        { id: 'shopify-order', merchant_id: 'm1', source: 'shopify', external_id: '6321001', order_number: '1157' },
        { id: 'shipbob-order', merchant_id: 'm1', source: 'shipbob', external_id: '9811', order_number: '6321001' },
      ],
    });

    await expect(resolveShipBobOrderReference(db, 'm1', 'shopify-order')).resolves.toBe('6321001');
    await expect(resolveShipBobOrderReference(db, 'm1', 'shipbob-order')).resolves.toBe('6321001');
    await expect(resolveShipBobOrderReference(db, 'm1', undefined, '#1157')).resolves.toBe('1157');
  });
});
