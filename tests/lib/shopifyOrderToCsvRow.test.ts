import fs from 'fs';
import path from 'path';

const exists = (relativePath: string) => fs.existsSync(path.join(process.cwd(), relativePath));
const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('Shopify CSV adapter retirement', () => {
  it('removes the Shopify-to-CSV adapter', () => {
    expect(exists('lib/shopify/shopifyOrderToCsvRow.ts')).toBe(false);
  });

  it('uses the v2 order processor for historical imports', () => {
    expect(read('lib/shopify/backfill.ts')).toContain('processShopifyOrderPayload');
  });

  it('starts the 24-month backfill through the shared window helper', () => {
    expect(read('lib/shopify/backfill.ts')).toContain('integrationBackfillSinceIso');
  });
});
