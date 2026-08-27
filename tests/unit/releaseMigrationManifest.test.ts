import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('release migration proof contract', () => {
  it('covers every timestamped active migration exactly once', () => {
    const files = fs
      .readdirSync(path.join(root, 'supabase/migrations'))
      .filter((file) => /^\d{14}_.+\.sql$/.test(file))
      .sort();
    const manifest = read('scripts/release-migration-manifest.mjs');
    const listed = [...manifest.matchAll(/'(?<file>\d{14}_[^']+\.sql)'/g)].map(
      (match) => match.groups?.file,
    );

    expect(listed).toEqual(files);
    expect(new Set(listed.map((file) => file?.slice(0, 14))).size).toBe(files.length);
  });

  it('keeps the active replay verifier on the shared manifest', () => {
    expect(read('scripts/verify-canonical-database.mjs')).toContain(
      "from './release-migration-manifest.mjs'",
    );
    expect(read('scripts/verify-canonical-database.mjs')).toContain(
      '--allow-destructive-local-reset',
    );
  });
});
