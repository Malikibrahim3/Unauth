import { shouldRequireOnboarding } from '@/lib/account/onboardingGate';
import { canRehydrateMerchantFromAuth } from '@/lib/account/ensureMerchantContext';

describe('shouldRequireOnboarding', () => {
  it('requires onboarding when there is no merchant context', () => {
    expect(shouldRequireOnboarding({ hasMerchantContext: false, setupComplete: true, auditRunCount: 3 })).toBe(true);
  });

  it('does not require onboarding for completed merchant setup', () => {
    expect(shouldRequireOnboarding({ hasMerchantContext: true, setupComplete: true, auditRunCount: 0 })).toBe(false);
  });

  it('does not treat merchants with existing audit history as new users', () => {
    expect(shouldRequireOnboarding({ hasMerchantContext: true, setupComplete: false, auditRunCount: 1 })).toBe(false);
  });

  it('requires onboarding only for merchants with incomplete setup and no audit history', () => {
    expect(shouldRequireOnboarding({ hasMerchantContext: true, setupComplete: false, auditRunCount: 0 })).toBe(true);
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
