import fs from 'fs';
import path from 'path';

const exists = (relativePath: string) => fs.existsSync(path.join(process.cwd(), relativePath));
const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('legacy CSV finalizer retirement', () => {
  it('removes the one-shot chunk finalizer', () => {
    expect(exists('lib/processing/chunkQueue.ts')).toBe(false);
  });

  it('does not depend on dropped processing_jobs during Shopify backfill', () => {
    expect(read('lib/shopify/backfill.ts')).not.toContain('processing_jobs');
  });
});
