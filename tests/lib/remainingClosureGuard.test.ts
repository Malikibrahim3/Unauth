import {
  isLoopbackAcceptanceUrl,
  remainingClosureEnvironmentIsSafe,
} from '@/lib/testing/remainingClosureGuard';

const loopbackEnvironment = {
  RELEASE_E2E_LOCAL: '1',
  NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3016',
  NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  VERCEL_ENV: 'development',
};

describe('remaining closure local-only guard', () => {
  it('accepts only parseable loopback origins', () => {
    expect(isLoopbackAcceptanceUrl('http://127.0.0.1:3016')).toBe(true);
    expect(isLoopbackAcceptanceUrl('http://localhost:54321')).toBe(true);
    expect(isLoopbackAcceptanceUrl('http://[::1]:3016')).toBe(true);
    expect(isLoopbackAcceptanceUrl('https://acceptance.example.test')).toBe(false);
    expect(isLoopbackAcceptanceUrl(undefined)).toBe(false);
  });

  it.each([
    ['missing acknowledgement', { ...loopbackEnvironment, RELEASE_E2E_LOCAL: undefined }],
    ['preview', { ...loopbackEnvironment, VERCEL_ENV: 'preview' }],
    ['production', { ...loopbackEnvironment, VERCEL_ENV: 'production' }],
    ['remote app', { ...loopbackEnvironment, NEXT_PUBLIC_APP_URL: 'https://app.example.test' }],
    ['remote Supabase', { ...loopbackEnvironment, NEXT_PUBLIC_SUPABASE_URL: 'https://db.example.test' }],
    ['missing Supabase', { ...loopbackEnvironment, NEXT_PUBLIC_SUPABASE_URL: undefined }],
  ])('fails closed for %s', (_label, environment) => {
    expect(remainingClosureEnvironmentIsSafe(environment)).toBe(false);
  });

  it('requires both configured loopback origins and the explicit acknowledgement', () => {
    expect(remainingClosureEnvironmentIsSafe(loopbackEnvironment)).toBe(true);
  });
});
