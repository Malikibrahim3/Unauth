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

  it('requires onboarding when Shopify is not connected, even with setup complete', () => {
    expect(
      shouldRequireOnboarding({
        hasMerchantContext: true,
        setupComplete: true,
        auditRunCount: 5,
        shopifyConnected: false,
        helpdeskConnected: true,
      }),
    ).toBe(true);
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
});
