import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('ShipBob install route', () => {
  const source = readFileSync(
    join(process.cwd(), 'app/api/integrations/shipbob/install/route.ts'),
    'utf8',
  );

  it('requests a server-readable OAuth response mode', () => {
    expect(source).toContain("authorizeUrl.searchParams.set('response_mode', 'form_post')");
  });

  it('seals the per-connection environment into the OAuth transaction', () => {
    expect(source).toContain("request.nextUrl.searchParams.get('environment')");
    expect(source).toContain('environment,');
  });
});

describe('ShipBob form-post callback', () => {
  const source = readFileSync(
    join(process.cwd(), 'app/api/integrations/shipbob/callback/route.ts'),
    'utf8',
  );

  it('uses the sealed initiating user when SameSite cookies are absent', () => {
    expect(source).toContain("request.method === 'POST' ? oauthState.userId : null");
    expect(source).toContain('userId: callbackUserId');
  });

  it('converts the provider form POST into a browser GET redirect', () => {
    expect(source).toContain('NextResponse.redirect(url, 303)');
    expect(source).toContain('NextResponse.redirect(selectionUrl, 303)');
  });

  it('still checks the initiating user permission for the transaction merchant', () => {
    expect(source).toContain('callbackUserId,\n      transaction.merchantId,');
    expect(source).toContain('PERMISSIONS.MANAGE_SETTINGS');
  });
});
