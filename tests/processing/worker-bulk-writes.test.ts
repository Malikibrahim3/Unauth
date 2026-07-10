import fs from 'fs';
import path from 'path';

const exists = (relativePath: string) => fs.existsSync(path.join(process.cwd(), relativePath));
const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('CSV and legacy fraud worker retirement', () => {
  it('removes the production CSV worker', () => {
    expect(exists('lib/processing/worker.ts')).toBe(false);
  });

  it('removes the orphaned Shopify audit bridge', () => {
    expect(exists('lib/shopify/auditBridge.ts')).toBe(false);
  });

  it('removes the orphaned WooCommerce audit bridge', () => {
    expect(exists('lib/commerce/woocommerce/auditBridge.ts')).toBe(false);
  });

  it('removes the orphaned BigCommerce audit bridge', () => {
    expect(exists('lib/commerce/bigcommerce/auditBridge.ts')).toBe(false);
  });

  it('keeps Shopify history on the v2 order ingest path', () => {
    expect(read('lib/shopify/backfill.ts')).toContain('processShopifyOrderPayload');
  });

  it('does not call processCsvJob from the v2 Shopify backfill', () => {
    expect(read('lib/shopify/backfill.ts')).not.toContain('processCsvJob');
  });

  it('writes Shopify history into source_orders', () => {
    expect(read('lib/shopify/ingest.ts')).toContain(".from('source_orders')");
  });

  it('does not write dropped fraud intelligence tables from Shopify ingest', () => {
    const source = read('lib/shopify/ingest.ts');
    expect(source).not.toContain('fraud_entities');
    expect(source).not.toContain('co_occurrences');
  });
});
