/**
 * Ensures retired watchlist product paths do not write legacy tables during ingest.
 */
import * as fs from 'fs';
import * as path from 'path';

describe('watchlist deprecation — ingest must not write legacy tables', () => {
  it('customers page ignores legacy watchlisted query param', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/customers/page.tsx'),
      'utf-8',
    );
    expect(content).toContain('sp.watchlisted');
    expect(content).not.toContain('watchlistedOnly');
  });

  it('nav-counts does not query watchlist_entries', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/nav-counts/route.ts'),
      'utf-8',
    );
    expect(content).not.toContain('watchlist_entries');
    expect(content).toContain('MERCHANT_CLAIMS');
  });

  it('widget data loader does not query watchlist_entries', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'lib/gorgias/widgetData.ts'),
      'utf-8',
    );
    expect(content).not.toMatch(/from\s*\(\s*['"]watchlist_entries['"]\s*\)/);
  });
});
