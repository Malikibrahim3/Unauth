jest.mock('@/lib/integrations/auth', () => ({ getIntegrationCredential: jest.fn() }));
jest.mock('@/lib/supabase/server', () => ({ createServiceClient: jest.fn(() => ({})) }));
import { getIntegrationCredential } from '@/lib/integrations/auth';
import { getProviderCredential } from '@/lib/integrations/getProviderCredential';

describe('provider credential security', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  afterEach(() => { Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, configurable: true, writable: true }); delete process.env.TEST_PROVIDER_KEY; jest.resetAllMocks(); });
  it('never falls back to a global credential in production', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true, writable: true }); process.env.TEST_PROVIDER_KEY = 'global-secret';
    (getIntegrationCredential as jest.Mock).mockRejectedValue(new Error('lookup failed'));
    await expect(getProviderCredential('merchant-1', 'aftership', 'TEST_PROVIDER_KEY', {} as never)).resolves.toBeNull();
  });
  it('allows a development-only fallback', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', configurable: true, writable: true }); process.env.TEST_PROVIDER_KEY = 'development-key';
    (getIntegrationCredential as jest.Mock).mockResolvedValue(null);
    await expect(getProviderCredential('merchant-1', 'aftership', 'TEST_PROVIDER_KEY', {} as never)).resolves.toBe('development-key');
  });
});
