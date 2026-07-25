import { createInitialOnboardingState } from '@/components/Onboarding/onboardingReducer';

const baseInput = {
  initialStoreName: '',
  initialPlatform: '',
  initialAnnualVolume: '',
  initialPrimaryConcern: '',
  initialUsesWms3pl: '',
  initialUsesReturnsPlatform: '',
  profileComplete: false,
  shopifyConnected: false,
  helpdeskConnected: false,
  shopifyShopDomain: '',
};

describe('onboarding initial state', () => {
  it('starts at the profile until the profile is saved', () => {
    expect(createInitialOnboardingState(baseInput)).toMatchObject({
      activeStep: 0,
      profileSaved: false,
    });
  });

  it('resumes at Shopify after the profile is saved', () => {
    expect(
      createInitialOnboardingState({
        ...baseInput,
        profileComplete: true,
      }),
    ).toMatchObject({
      activeStep: 1,
      profileSaved: true,
    });
  });

  it('requires server verification on the helpdesk step even when both connections exist', () => {
    expect(
      createInitialOnboardingState({
        ...baseInput,
        profileComplete: true,
        shopifyConnected: true,
        helpdeskConnected: true,
      }),
    ).toMatchObject({
      activeStep: 2,
      profileSaved: true,
    });
  });
});
