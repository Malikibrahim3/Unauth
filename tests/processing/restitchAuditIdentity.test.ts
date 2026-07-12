import fs from 'fs';
import path from 'path';

const exists = (relativePath: string) => fs.existsSync(path.join(process.cwd(), relativePath));

describe('legacy audit identity re-stitch retirement', () => {
  it('removes the re-stitch entry point', () => {
    expect(exists('lib/processing/restitchAuditIdentity.ts')).toBe(false);
  });

  it('preserves calibration-frozen scoring and cluster helpers', () => {
    expect(exists('lib/scorer.ts')).toBe(true);
    expect(exists('lib/engine/fastScore.ts')).toBe(true);
    expect(exists('lib/processing/clusterExpansion.ts')).toBe(true);
  });
});
