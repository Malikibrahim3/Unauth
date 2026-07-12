import fs from 'fs';
import path from 'path';

const exists = (relativePath: string) => fs.existsSync(path.join(process.cwd(), relativePath));
const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('WooCommerce CSV adapter retirement', () => {
  it('removes the WooCommerce-to-CSV adapter', () => {
    expect(exists('lib/commerce/woocommerce/woocommerceOrderToCsvRow.ts')).toBe(false);
  });

  it('keeps dormant v2 ingestion typed without the CSV adapter', () => {
    expect(read('lib/commerce/woocommerce/processOrderWebhook.ts')).toContain(
      "@/lib/commerce/woocommerce/orderTypes",
    );
  });
});
