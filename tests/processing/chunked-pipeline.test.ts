import fs from 'fs';
import path from 'path';

const exists = (relativePath: string) => fs.existsSync(path.join(process.cwd(), relativePath));
const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('chunked CSV pipeline retirement', () => {
  it('removes the chunk dispatcher', () => {
    expect(exists('lib/processing/chunkedDispatch.ts')).toBe(false);
  });

  it('removes the chunk queue', () => {
    expect(exists('lib/processing/chunkQueue.ts')).toBe(false);
  });

  it('removes the legacy processing-job updater', () => {
    expect(exists('lib/processing/job.ts')).toBe(false);
  });

  it('removes chunk-only internal authentication', () => {
    expect(exists('lib/processing/internalAuth.ts')).toBe(false);
  });

  it('removes chunk re-stitching', () => {
    expect(exists('lib/processing/restitchAuditIdentity.ts')).toBe(false);
  });

  it('does not expose a process-csv-chunk route', () => {
    expect(exists('app/api/process-csv-chunk/route.ts')).toBe(false);
  });

  it('does not dispatch v2 backfill rows to the retired endpoint', () => {
    expect(read('lib/shopify/backfill.ts')).not.toContain('/api/process-csv-chunk');
  });

  it('preserves the isolated CSV parser used by calibration tests', () => {
    expect(exists('lib/processing/streamParser.ts')).toBe(true);
  });
});
