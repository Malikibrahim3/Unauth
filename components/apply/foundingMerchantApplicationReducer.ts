export type FoundingMerchantApplicationState = {
  storeName: string;
  monthlyOrderVolume: string;
  refundVolume: string;
  lossProblem: string;
  agreed: boolean;
  loading: boolean;
  error: string;
  submitted: boolean;
};

export type FoundingMerchantApplicationAction =
  | { type: 'patch'; patch: Partial<FoundingMerchantApplicationState> };

export const initialFoundingMerchantApplicationState = (
  defaultStoreName: string,
): FoundingMerchantApplicationState => ({
  storeName: defaultStoreName,
  monthlyOrderVolume: '',
  refundVolume: '',
  lossProblem: '',
  agreed: false,
  loading: false,
  error: '',
  submitted: false,
});

export function foundingMerchantApplicationReducer(
  state: FoundingMerchantApplicationState,
  action: FoundingMerchantApplicationAction,
): FoundingMerchantApplicationState {
  if (action.type === 'patch') return { ...state, ...action.patch };
  return state;
}
