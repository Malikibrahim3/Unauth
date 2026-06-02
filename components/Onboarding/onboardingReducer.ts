export type OnboardingState = {
  activeStep: number;
  storeName: string;
  platform: string;
  annualVolume: string;
  primaryConcern: string;
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
  shopifyShopDomain: string;
}): OnboardingState {
  return {
    activeStep: 0,
    storeName: input.initialStoreName,
    platform: input.initialPlatform,
    annualVolume: input.initialAnnualVolume,
    primaryConcern: input.initialPrimaryConcern,
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
