import fs from 'fs';
import path from 'path';

const TARGET_FILES = [
  'app/(app)/claims/page.tsx',
  'app/(app)/customers/page.tsx',
  'app/(app)/watchlist/page.tsx',
  'app/(app)/chargebacks/page.tsx',
];

describe('link/button composition', () => {
  it('does not nest Button inside Link on primary app surfaces', () => {
    const offenders: string[] = [];
    const pattern = /<Link[^>]*>[\s\S]*?<Button\b/;

    for (const file of TARGET_FILES) {
      const abs = path.join(process.cwd(), file);
      const source = fs.readFileSync(abs, 'utf8');
      if (pattern.test(source)) offenders.push(file);
    }

    expect(offenders).toEqual([]);
  });
});
