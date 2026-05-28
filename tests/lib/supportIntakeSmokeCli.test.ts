import {
  parseSmokeSupportIntakeArgs,
  requireSmokeSupabaseEnv,
  SMOKE_SUPPORT_INTAKE_MERCHANT_ID_FLAG,
} from '@/lib/support/intake/smokeCli';

const VALID_MERCHANT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('support intake smoke CLI', () => {
  it('parses --merchant-id', () => {
    expect(
      parseSmokeSupportIntakeArgs(['--merchant-id', VALID_MERCHANT])
    ).toEqual({ merchantId: VALID_MERCHANT });
  });

  it('fails without merchant id', () => {
    expect(() => parseSmokeSupportIntakeArgs([])).toThrow(SMOKE_SUPPORT_INTAKE_MERCHANT_ID_FLAG);
  });

  it('fails on invalid uuid', () => {
    expect(() =>
      parseSmokeSupportIntakeArgs(['--merchant-id', 'not-a-uuid'])
    ).toThrow('must be a UUID');
  });

  it('requireSmokeSupabaseEnv fails when keys missing', () => {
    expect(() =>
      requireSmokeSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: '',
        SUPABASE_SERVICE_ROLE_KEY: '',
      })
    ).toThrow('Missing required env');
  });

  it('requireSmokeSupabaseEnv returns url and key', () => {
    expect(
      requireSmokeSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-key',
      })
    ).toEqual({
      supabaseUrl: 'https://example.supabase.co',
      serviceRoleKey: 'service-key',
    });
  });
});
