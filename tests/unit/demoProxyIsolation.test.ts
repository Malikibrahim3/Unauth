import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { proxy } from '../../proxy';

jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }));
jest.mock('@/lib/ratelimit', () => ({ enforceRateLimit: jest.fn(), getClientIp: jest.fn(), limitFromEnv: jest.fn(), rateLimitKey: jest.fn() }));
jest.mock('@/lib/log', () => ({ createRequestId: () => 'demo-test-request', merchantIdHeader: 'x-merchant-id', requestIdHeader: 'x-request-id' }));

describe('public demo proxy isolation', () => {
  beforeEach(() => jest.clearAllMocks());
  test.each(['GET', 'HEAD'])('%s does not construct an auth client or refresh cookies, even with session-shaped input', async method => {
    const request = new NextRequest('http://localhost:3000/demo?case=duplicate&step=outcome', { method, headers: { cookie: 'sb-example-auth-token=fictional-test-only' } });
    const response = await proxy(request);
    expect(response.status).toBe(200);
    expect(createServerClient).not.toHaveBeenCalled();
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(response.headers.get('x-request-id')).toBe('demo-test-request');
  });
  test.each(['/cases', '/demo/private'])('does not exempt protected route %s', async pathname => {
    (createServerClient as jest.Mock).mockReturnValue({ auth: { getUser: async () => ({ data: { user: null } }) } });
    const response = await proxy(new NextRequest(`http://localhost:3000${pathname}`));
    expect(createServerClient).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login');
  });
});
