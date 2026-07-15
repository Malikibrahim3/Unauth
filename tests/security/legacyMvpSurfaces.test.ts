import fs from 'fs';
import path from 'path';

describe('legacy MVP surfaces', () => {
  it('removes redirect-only page modules from the application route tree', () => {
    for (const route of ['global', 'watchlist', 'catches', 'chargebacks', 'store', 'lookup']) {
      expect(fs.existsSync(path.join(process.cwd(), 'app/(app)', route, 'page.tsx'))).toBe(false);
    }
  });

  it('removes the retired watchlist API implementation', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'app/api/watchlist/route.ts'))).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), 'app/api/watchlist/[id]/route.ts'))).toBe(false);
  });

  it('keeps compatibility URLs in the single Next.js redirect registry', async () => {
    const config = require('../../next.config.js') as { redirects(): Promise<Array<{ source: string; destination: string }>> };
    const redirects = await config.redirects();
    const sources = new Set(redirects.map((redirect) => redirect.source));
    for (const source of ['/lookup/:path*', '/global/:path*', '/watchlist/:path*', '/catches/:path*', '/chargebacks/:path*', '/audit/:path*', '/store/:path*']) {
      expect(sources).toContain(source);
    }
  });
});
