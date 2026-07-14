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
