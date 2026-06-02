import type { RequiredField } from '@/lib/csv/headerAliases';

export type SignupFlowStep = 'account' | 'upload';

export type SignupFlowState = {
  step: SignupFlowStep;
  fullName: string;
  workEmail: string;
  storeName: string;
  password: string;
  confirmPassword: string;
  selectedFile: File | null;
  rowCount: number | null;
  hashedFile: File | null;
  accountLoading: boolean;
  uploadLoading: boolean;
  error: string;
  verificationFallback: boolean;
};

export type SignupFlowAction = { type: 'patch'; patch: Partial<SignupFlowState> };

export const initialSignupFlowState: SignupFlowState = {
  step: 'account',
  fullName: '',
  workEmail: '',
  storeName: '',
  password: '',
  confirmPassword: '',
  selectedFile: null,
  rowCount: null,
  hashedFile: null,
  accountLoading: false,
  uploadLoading: false,
  error: '',
  verificationFallback: false,
};

export function signupFlowReducer(state: SignupFlowState, action: SignupFlowAction): SignupFlowState {
  if (action.type === 'patch') return { ...state, ...action.patch };
  return state;
}

export type SignupColumnMap = Partial<Record<RequiredField, string>>;
