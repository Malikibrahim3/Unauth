const originalEnv = process.env;

const deployedEnv: NodeJS.ProcessEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  IDENTITY_SALT: 'test-identity-salt-at-least-32-characters',
  NEXT_PUBLIC_APP_URL: 'https://preview.example.com',
  RESEND_API_KEY: 'test-resend-key',
  CRON_SECRET: 'test-cron-secret',
  UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'test-upstash-token',
  INTERNAL_HMAC_SECRET: 'test-internal-hmac-secret-at-least-32-characters',
  SHOPIFY_API_KEY: 'test-shopify-key',
  SHOPIFY_API_SECRET: 'test-shopify-secret',
  SHOPIFY_WEBHOOK_SECRET: 'test-shopify-webhook-secret',
  VERCEL_ENV: 'preview',
};

function loadEnvironment() {
  return jest.requireActual<typeof import('@/lib/utils/env')>('@/lib/utils/env');
}

describe('environment validation', () => {
  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  it('allows deployed builds without scanner credentials when investigations are disabled', () => {
    process.env = { ...deployedEnv, INVESTIGATIONS_ENABLED: 'false' };

    expect(() => {
      jest.isolateModules(loadEnvironment);
    }).not.toThrow();
  });

  it('fails closed when investigations are enabled without scanner credentials', () => {
    process.env = { ...deployedEnv, INVESTIGATIONS_ENABLED: 'true' };

    expect(() => {
      jest.isolateModules(loadEnvironment);
    }).toThrow(
      'Missing or invalid environment variables: INVESTIGATION_MALWARE_SCAN_URL, INVESTIGATION_MALWARE_SCAN_TOKEN',
    );
  });

  it('allows investigations when both scanner credentials are configured', () => {
    process.env = {
      ...deployedEnv,
      INVESTIGATIONS_ENABLED: 'true',
      INVESTIGATION_MALWARE_SCAN_URL: 'https://scanner.example.com/scan',
      INVESTIGATION_MALWARE_SCAN_TOKEN: 'test-scanner-token',
    };

    expect(() => {
      jest.isolateModules(loadEnvironment);
    }).not.toThrow();
  });
});
