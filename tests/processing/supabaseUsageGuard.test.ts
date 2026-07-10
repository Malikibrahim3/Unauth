import fs from 'fs';
import path from 'path';

const exists = (relativePath: string) => fs.existsSync(path.join(process.cwd(), relativePath));
const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('CSV-only database usage guard retirement', () => {
  it('removes the CSV run usage guard', () => {
    expect(exists('lib/processing/supabaseUsageGuard.ts')).toBe(false);
  });

  it('removes CSV-only usage limits from the server env schema', () => {
    const source = read('lib/utils/env.ts');
    expect(source).not.toContain('SUPABASE_DB_USAGE_LIMIT_MB');
    expect(source).not.toContain('SUPABASE_DB_USAGE_HEADROOM_MB');
  });
});
