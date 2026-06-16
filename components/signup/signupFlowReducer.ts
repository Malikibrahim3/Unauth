export type SignupFlowStep = 'account';

export type SignupFlowState = {
  step: SignupFlowStep;
  fullName: string;
  workEmail: string;
  storeName: string;
  password: string;
  confirmPassword: string;
  accountLoading: boolean;
  error: string;
  verificationFallback: boolean;
};

export type SignupFlowAction = { type: 'patch'; patch: Partial<SignupFlowState> };

export function signupFlowReducer(state: SignupFlowState, action: SignupFlowAction): SignupFlowState {
  if (action.type === 'patch') return { ...state, ...action.patch };
  return state;
}

export const initialSignupFlowState: SignupFlowState = {
  step: 'account',
  fullName: '',
  workEmail: '',
  storeName: '',
  password: '',
  confirmPassword: '',
  accountLoading: false,
  error: '',
  verificationFallback: false,
};
