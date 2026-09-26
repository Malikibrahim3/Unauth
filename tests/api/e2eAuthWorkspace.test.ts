import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';
import { GET } from '@/app/api/test/e2e-auth/route';

jest.mock('@/lib/supabase/server', () => ({ createAdminClient: jest.fn() }));
jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }));
jest.mock('@/lib/permissions', () => ({ ACTIVE_MERCHANT_COOKIE: 'unauth.active_merchant' }));
const merchant = 'a1000000-0000-4000-8000-000000000010';
const original = { ...process.env };
const verifyOtp = jest.fn();
beforeEach(() => {
  process.env.VERCEL_ENV = 'development';
  process.env.E2E_AUTH_SECRET = 'local-unit-only';
  process.env.E2E_MERCHANT_ID = merchant;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'unit-placeholder';
  const query: Record<string, jest.Mock> = {};
  for (const method of ['select', 'eq', 'limit']) query[method] = jest.fn(() => query);
  query.maybeSingle = jest.fn(async () => ({ data: { invited_email: 'fixture@example.invalid' }, error: null }));
  (createAdminClient as jest.Mock).mockReturnValue({ from: () => query, auth: { admin: { generateLink: async () => ({ data: { properties: { hashed_token: 'unit-token' } }, error: null }) } } });
  verifyOtp.mockResolvedValue({ error: null });
  (createServerClient as jest.Mock).mockReturnValue({ auth: { verifyOtp } });
});
afterAll(() => { process.env = original; });
function request(id = merchant, secret = 'local-unit-only') {
  return new NextRequest(`http://127.0.0.1:3017/api/test/e2e-auth?merchant_id=${id}&secret=${secret}&redirect=/cases`, { headers: { host: '127.0.0.1:3017', cookie: 'unauth.active_merchant=stale-fixture' } });
}
it('selects the allow-listed fixture after OTP verification, overriding stale workspace state', async () => {
  const response = await GET(request());
  expect(response.status).toBe(307);
  expect(verifyOtp).toHaveBeenCalled();
  expect(response.cookies.get('unauth.active_merchant')).toMatchObject({ value: merchant, httpOnly: true, sameSite: 'lax', path: '/', secure: false });
  expect(response.headers.get('location')).toBe('http://127.0.0.1:3017/cases');
});
it.each(['preview', 'production'])('remains disabled on %s deployments', async (environment) => {
  process.env.VERCEL_ENV = environment;
  const response = await GET(request());
  expect(response.status).toBe(404);
  expect(response.cookies.get('unauth.active_merchant')).toBeUndefined();
});
it.each([['unlisted-merchant', 'local-unit-only'], [merchant, 'wrong-secret']])('rejects unauthorized fixture bootstrap', async (id, secret) => {
  const response = await GET(request(id, secret));
  expect(response.status).toBe(403);
  expect(response.cookies.get('unauth.active_merchant')).toBeUndefined();
});
it('does not select a workspace when session verification fails', async () => {
  verifyOtp.mockResolvedValue({ error: { message: 'invalid' } });
  const response = await GET(request());
  expect(response.status).toBe(500);
  expect(response.cookies.get('unauth.active_merchant')).toBeUndefined();
});
