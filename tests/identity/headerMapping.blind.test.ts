import path from 'node:path';
import fs from 'node:fs';
import { sniffHeaders } from '../../lib/csv/sniffer';
import { ensureBlindFixtures, generatedDir, parseMerchantCsv } from './blindHarness';
import { normaliseAddress } from '../../lib/identity/normalise';

const expectedFormats = [
  'header_chaos_shopify.csv',
  'header_chaos_woocommerce.csv',
  'header_chaos_amazon.csv',
  'header_chaos_etsy_semicolon_bom.csv',
  'header_chaos_stripe_pipe.csv',
  'header_chaos_custom_mixed_case.csv',
];

describe('blind header mapping and delimiter sniffer', () => {
  beforeAll(() => {
    ensureBlindFixtures();
  });

  test.each(expectedFormats)('%s maps required fields and preserves address cardinality', async (fileName) => {
    const parsed = await parseMerchantCsv(fileName);
    expect(parsed.valid).toBe(true);
    expect(parsed.rowCount).toBe(72);
    expect(parsed.missingRequired).toEqual([]);
    expect(parsed.headers).toEqual(expect.arrayContaining(['order_id', 'order_date', 'customer_email', 'order_total']));
    expect(parsed.headers).toContain('shipping_address');

    const addresses = new Set(parsed.rows.map((row) => normaliseAddress((row as any).shipping_address)).filter(Boolean));
    expect(addresses.size).toBeGreaterThanOrEqual(25);
    expect(addresses.size).not.toBe(1);
    expect([...addresses]).not.toEqual(['gb']);
  }, 30_000);

  test('BOM, tab, semicolon, pipe, and quoted delimiter headers are sniffed correctly', () => {
    const cases = [
      { file: 'header_chaos_amazon.csv', delimiter: '\t' },
      { file: 'header_chaos_etsy_semicolon_bom.csv', delimiter: ';', bom: true },
      { file: 'header_chaos_stripe_pipe.csv', delimiter: '|' },
    ];
    for (const c of cases) {
      const text = fs.readFileSync(path.join(generatedDir, c.file), 'utf8');
      const sniffed = sniffHeaders(text);
      expect(sniffed.delimiter).toBe(c.delimiter);
      expect(sniffed.hasBom).toBe(Boolean(c.bom));
      expect(sniffed.headers).toContain(c.file.includes('stripe') ? 'metadata, merchant note' : sniffed.headers[0]);
    }
  });

  test('duplicate headers surface a collision warning instead of corrupting important fields', () => {
    const text = fs.readFileSync(path.join(generatedDir, 'header_chaos_duplicate_headers.csv'), 'utf8');
    const sniffed = sniffHeaders(text);
    const collisionFields = sniffed.collisions.map((c) => c.field);
    expect(collisionFields).toContain('customer_phone');
    expect(collisionFields).not.toContain('order_id');
    expect(collisionFields).not.toContain('customer_email');
  });

  test('shipping country must not map as shipping address when real address is missing', async () => {
    const parsed = await parseMerchantCsv('header_chaos_missing_important.csv');
    expect(parsed.valid).toBe(true);
    expect(parsed.headers).toContain('shipping_country');
    expect(parsed.headers).not.toContain('shipping_address');
    expect(parsed.rows.some((row) => Object.prototype.hasOwnProperty.call(row, 'shipping_address'))).toBe(false);
  });

  test('unmapped extra columns are warnings, not fatal parse errors', async () => {
    const parsed = await parseMerchantCsv('header_chaos_custom_mixed_case.csv');
    expect(parsed.valid).toBe(true);
    expect(parsed.unmappedHeaders).toContain('extra_column');
  });
});
