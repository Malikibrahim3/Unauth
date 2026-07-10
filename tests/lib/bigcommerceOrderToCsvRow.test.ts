import fs from 'fs';
import path from 'path';

const exists = (relativePath: string) => fs.existsSync(path.join(process.cwd(), relativePath));
const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('BigCommerce CSV adapter retirement', () => {
  it('removes the BigCommerce-to-CSV adapter', () => {
    expect(exists('lib/commerce/bigcommerce/bigcommerceOrderToCsvRow.ts')).toBe(false);
  });

  it('keeps dormant v2 ingestion typed without the CSV adapter', () => {
    expect(read('lib/commerce/bigcommerce/processOrderWebhook.ts')).toContain(
      "@/lib/commerce/bigcommerce/orderTypes",
    );
  });
});
