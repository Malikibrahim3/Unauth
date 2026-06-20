export type OnboardingState = {
  activeStep: number;
  storeName: string;
  platform: string;
  annualVolume: string;
  primaryConcern: string;
  usesWms3pl: string;
  usesReturnsPlatform: string;
  loading: boolean;
  skipLoading: boolean;
  error: string;
  shopDomain: string;
};

export type OnboardingAction =
  | { type: 'patch'; patch: Partial<OnboardingState> };

export function createInitialOnboardingState(input: {
  initialStoreName: string;
  initialPlatform: string;
  initialAnnualVolume: string;
  initialPrimaryConcern: string;
  initialUsesWms3pl: string;
  initialUsesReturnsPlatform: string;
  shopifyShopDomain: string;
}): OnboardingState {
  return {
    activeStep: 0,
    storeName: input.initialStoreName,
    platform: input.initialPlatform,
    annualVolume: input.initialAnnualVolume,
    primaryConcern: input.initialPrimaryConcern,
    usesWms3pl: input.initialUsesWms3pl,
    usesReturnsPlatform: input.initialUsesReturnsPlatform,
    loading: false,
    skipLoading: false,
    error: '',
    shopDomain: input.shopifyShopDomain,
  };
}

export function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  if (action.type === 'patch') return { ...state, ...action.patch };
  return state;
}
