export type DemoStep = 0 | 1 | 2 | 3;

export type AuditDemoState = {
  step: DemoStep;
  email: string;
  platform: string;
  volume: string;
  problem: string;
  loading: boolean;
  showHighVolumeFork: boolean;
  emailError: string;
};

export type AuditDemoAction =
  | { type: 'patch'; patch: Partial<AuditDemoState> }
  | { type: 'startAudit' }
  | { type: 'selectPlatform'; value: string }
  | { type: 'selectVolume'; value: string; isHigh: boolean }
  | { type: 'continueAfterHighVolume' }
  | { type: 'goBack' };

export function createAuditDemoInitialState(initialEmail: string): AuditDemoState {
  return {
    step: initialEmail ? 1 : 0,
    email: initialEmail,
    platform: '',
    volume: '',
    problem: '',
    loading: false,
    showHighVolumeFork: false,
    emailError: '',
  };
}

export function auditDemoReducer(state: AuditDemoState, action: AuditDemoAction): AuditDemoState {
  switch (action.type) {
    case 'patch':
      return { ...state, ...action.patch };
    case 'startAudit':
      return { ...state, emailError: '', step: 1 };
    case 'selectPlatform':
      return { ...state, platform: action.value, step: 2 };
    case 'selectVolume':
      return {
        ...state,
        volume: action.value,
        showHighVolumeFork: action.isHigh,
        step: action.isHigh ? state.step : 3,
      };
    case 'continueAfterHighVolume':
      return { ...state, step: 3 };
    case 'goBack':
      if (state.step === 2) {
        return { ...state, step: 1, showHighVolumeFork: false };
      }
      if (state.step === 3) {
        return { ...state, step: 2 };
      }
      return state;
    default:
      return state;
  }
}

export const AUDIT_DEMO_CONTEXT_KEY = 'auditDemoContext:v1';
