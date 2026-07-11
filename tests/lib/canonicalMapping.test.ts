import * as fs from 'fs';
import * as path from 'path';
import { mapShopifyOrder } from '@/lib/connectors/providers/shopify/mappings';
import { mapCanonicalOrder, mapCanonicalRefund, mapCanonicalShipment } from '@/lib/canonical/entities';

const FX = path.join(process.cwd(), 'tests/fixtures/source-agnostic');
const load = (f: string) => JSON.parse(fs.readFileSync(path.join(FX, f), 'utf8'));

describe('canonical order mapping — source independence', () => {
  it('Shopify and canonical inputs produce the same canonical order (business fields)', () => {
    const shopify = mapShopifyOrder(load('shopify-order-created.json').payload);
    const canonical = mapCanonicalOrder(load('canonical-order-created.json').data);

    expect(shopify.order).not.toBeNull();
    expect(canonical.order).not.toBeNull();
    const s = shopify.order!;
    const c = canonical.order!;

    const businessFields = (o: typeof s) => ({
      currency: o.currency,
      totalMinor: o.totalMinor,
      subtotalMinor: o.subtotalMinor,
      financialStatus: o.financialStatus,
      fulfillmentStatus: o.fulfillmentStatus,
      email: o.customer?.email,
      name: o.customer?.name,
      line0: o.lines[0] && { sku: o.lines[0].sku, quantity: o.lines[0].quantity, unitPriceMinor: o.lines[0].unitPriceMinor, totalMinor: o.lines[0].totalMinor },
    });

    expect(businessFields(s)).toEqual(businessFields(c));
    expect(businessFields(s)).toEqual({
      currency: 'GBP', totalMinor: 8400, subtotalMinor: 8000,
      financialStatus: 'paid', fulfillmentStatus: 'unfulfilled',
      email: 'casey@example.com', name: 'Casey Rivers',
      line0: { sku: 'EXAMPLE-SKU-A', quantity: 1, unitPriceMinor: 8000, totalMinor: 8000 },
    });
  });

  it('preserves provider-native status separately and maps unknowns canonically', () => {
    const { order } = mapShopifyOrder({ id: 1, currency: 'GBP', financial_status: 'weird_status', line_items: [] });
    expect(order?.financialStatus).toBe('unknown');
    expect(order?.sourceFinancialStatus).toBe('weird_status');
  });

  it('normalizes a timestamp with an offset to ISO UTC', () => {
    const { order } = mapCanonicalOrder({
      external_id: 'O1', currency: 'GBP', financial_status: 'paid', fulfillment_status: 'unfulfilled',
      placed_at: '2026-07-11T10:00:00+01:00', lines: [],
    });
    expect(order?.placedAt).toBe('2026-07-11T09:00:00.000Z');
  });

  it('handles a 0-decimal currency without multiplying by 100', () => {
    const { order } = mapCanonicalOrder({
      external_id: 'O-JPY', currency: 'JPY', financial_status: 'paid', fulfillment_status: 'unfulfilled',
      total_minor: 84, lines: [],
    });
    expect(order?.currency).toBe('JPY');
    expect(order?.totalMinor).toBe(84);
  });

  it('rejects an invalid currency (no partial entity)', () => {
    const { order, errors } = mapCanonicalOrder({ external_id: 'O1', currency: 'GB', financial_status: 'paid', fulfillment_status: 'unfulfilled', lines: [] });
    expect(order).toBeNull();
    expect(errors.some((e) => e.field.includes('currency'))).toBe(true);
  });

  it('reports a required-field error when external_id is missing', () => {
    const { order, errors } = mapCanonicalOrder({ currency: 'GBP', financial_status: 'paid', fulfillment_status: 'unfulfilled', lines: [] });
    expect(order).toBeNull();
    expect(errors.some((e) => e.code === 'required_field_missing')).toBe(true);
  });

  it('does not carry forbidden/sensitive raw fields into the canonical record', () => {
    const { order } = mapShopifyOrder({
      id: 1, currency: 'GBP', financial_status: 'paid', line_items: [],
      customer: { id: 5, email: 'x@y.com', card_number: '4111111111111111', cvv: '123' },
    });
    const serialized = JSON.stringify(order);
    expect(serialized).not.toContain('4111111111111111');
    expect(serialized).not.toContain('cvv');
  });
});

describe('canonical refund + shipment mapping', () => {
  it('maps a canonical refund (minor units preserved)', () => {
    const { refund } = mapCanonicalRefund(load('canonical-refund-created.json').data);
    expect(refund).toMatchObject({ externalId: 'REFUND-3001', orderExternalId: 'ORDER-1001', amountMinor: 8400, currency: 'GBP' });
  });

  it('maps a canonical shipment, mapping status while preserving source_status', () => {
    const { shipment } = mapCanonicalShipment(load('canonical-shipment-delivered.json').data);
    expect(shipment?.status).toBe('delivered');
    expect(shipment?.sourceStatus).toBe('DELIVERED');
    expect(shipment?.trackingNumber).toBe('EX123456789GB');
    expect(shipment?.deliveredAt).toBe('2026-07-12T14:05:00.000Z');
  });
});
