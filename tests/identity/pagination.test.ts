import fs from 'node:fs';
import path from 'node:path';

describe('blind pagination and export guards', () => {
  test('legacy audit export is absent after CSV retirement', () => {
    const route = path.resolve(process.cwd(), 'app/api/audit/[runId]/export/route.ts');
    expect(fs.existsSync(route)).toBe(false);
  });
});
