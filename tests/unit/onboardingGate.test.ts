import { shouldRequireOnboarding } from '@/lib/account/onboardingGate';
import { canRehydrateMerchantFromAuth } from '@/lib/account/ensureMerchantContext';

describe('shouldRequireOnboarding', () => {
  it('requires onboarding when there is no merchant context', () => {
    expect(
      shouldRequireOnboarding({
        hasMerchantContext: false,
        setupComplete: true,
        auditRunCount: 3,
        shopifyConnected: true,
        helpdeskConnected: true,
      }),
    ).toBe(true);
  });

  it('does not require onboarding for completed merchant setup with both connections', () => {
    expect(
      shouldRequireOnboarding({
        hasMerchantContext: true,
        setupComplete: true,
        auditRunCount: 0,
        shopifyConnected: true,
        helpdeskConnected: true,
      }),
    ).toBe(false);
  });

  it('does not treat merchants with existing audit history as new users', () => {
    expect(
      shouldRequireOnboarding({
        hasMerchantContext: true,
        setupComplete: false,
        auditRunCount: 1,
        shopifyConnected: true,
        helpdeskConnected: true,
      }),
    ).toBe(false);
  });

  it('allows a saved profile to enter connector settings before final setup verification', () => {
    expect(
      shouldRequireOnboarding({
        hasMerchantContext: true,
        profileComplete: true,
        setupComplete: false,
        auditRunCount: 0,
        shopifyConnected: false,
        helpdeskConnected: false,
      }),
    ).toBe(false);
  });

  it('allows an authenticated merchant to defer onboarding and return later', () => {
    expect(
      shouldRequireOnboarding({
        hasMerchantContext: true,
        profileComplete: false,
        onboardingDeferred: true,
        setupComplete: false,
        auditRunCount: 0,
        shopifyConnected: false,
        helpdeskConnected: false,
      }),
    ).toBe(false);
  });

  it('requires onboarding only for merchants with incomplete setup and no audit history', () => {
    expect(
      shouldRequireOnboarding({
        hasMerchantContext: true,
        setupComplete: false,
        auditRunCount: 0,
        shopifyConnected: true,
        helpdeskConnected: true,
      }),
    ).toBe(true);
  });

  it('lets a completed merchant choose a non-Shopify first connector', () => {
    expect(
      shouldRequireOnboarding({
        hasMerchantContext: true,
        setupComplete: true,
        auditRunCount: 5,
        shopifyConnected: false,
        helpdeskConnected: true,
      }),
    ).toBe(false);
  });

  it('allows a completed Shopify merchant to add other integrations before helpdesk setup', () => {
    expect(
      shouldRequireOnboarding({
        hasMerchantContext: true,
        setupComplete: true,
        auditRunCount: 5,
        shopifyConnected: true,
        helpdeskConnected: false,
      }),
    ).toBe(false);
  });
});

describe('canRehydrateMerchantFromAuth', () => {
  it('allows a completed auth profile to be restored into a merchant context', () => {
    expect(canRehydrateMerchantFromAuth({
      email: 'simeonmurray123@gmail.com',
      user_metadata: { setup_complete: true },
    })).toBe(true);
  });

  it('does not create merchant records for genuinely incomplete signups', () => {
    expect(canRehydrateMerchantFromAuth({
      email: 'new@example.com',
      user_metadata: { setup_complete: false },
    })).toBe(false);
  });

  it('can restore a deliberately deferred onboarding workspace without marking setup complete', () => {
    expect(canRehydrateMerchantFromAuth({
      email: 'developer@example.com',
      user_metadata: {
        setup_complete: false,
        onboarding_deferred_at: '2026-08-14T14:00:00.000Z',
      },
    })).toBe(true);
  });
});
