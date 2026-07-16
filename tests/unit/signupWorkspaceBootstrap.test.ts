import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const signup = fs.readFileSync(path.join(root, 'app/(public)/signup/page.tsx'), 'utf8');
const setupRoute = fs.readFileSync(path.join(root, 'app/api/account/setup/route.ts'), 'utf8');

describe('clean-account workspace bootstrap', () => {
  it('uses the server-owned membership path instead of the removed merchants.user_id shape', () => {
    expect(signup).toContain("fetch('/api/account/setup'");
    expect(signup).toContain('bootstrapOnly: true');
    expect(signup).not.toContain("onConflict: 'user_id'");
  });

  it('creates only an incomplete placeholder workspace during signup', () => {
    expect(setupRoute).toContain('const isBootstrap = body.bootstrapOnly === true');
    expect(setupRoute).toContain('!isBootstrap && body.setupComplete === true');
    expect(setupRoute).toContain('!isBootstrap && !isSkipAction && !isDemo');
  });
});
