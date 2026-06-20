import fs from 'fs';
import path from 'path';

const REDIRECT_PAGES = [
  ['app/(app)/global/page.tsx', '/customers'],
  ['app/(app)/watchlist/page.tsx', '/customers'],
  ['app/(app)/catches/page.tsx', '/claims'],
  ['app/(app)/chargebacks/page.tsx', '/claims'],
  ['app/(app)/chargebacks/[id]/page.tsx', '/claims'],
  ['app/(app)/store/page.tsx', '/dashboard'],
  ['app/(app)/help/how-it-works/page.tsx', '/help'],
  ['app/(app)/help/confidence-grades/page.tsx', '/help'],
  ['app/(app)/help/identity-matching/page.tsx', '/help'],
] as const;

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
}

describe('legacy MVP surfaces', () => {
  it('redirects legacy merchant page modules to payout-control surfaces', () => {
    for (const [file, target] of REDIRECT_PAGES) {
      const source = read(file);
      expect(source).toContain("from 'next/navigation'");
      expect(source).toContain(`redirect('${target}')`);
    }
  });

  it('proxy redirects logged-in legacy URLs before they can render', () => {
    const source = read('proxy.ts');
    for (const route of [
      '/lookup',
      '/global',
      '/watchlist',
      '/catches',
      '/chargebacks',
      '/audit',
      '/store',
      '/network-metrics',
      '/eval',
      '/help/identity-matching',
      '/help/confidence-grades',
      '/help/how-it-works',
    ]) {
      expect(source).toContain(route);
    }
    expect(source).toContain("url.pathname = '/dashboard'");
  });
});
