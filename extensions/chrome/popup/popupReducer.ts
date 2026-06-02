import type { EvidenceResponse, LookupResponse } from '../shared/types';

export type Screen = 'setup' | 'lookup' | 'loading' | 'results' | 'error' | 'settings';

export type PopupState = {
  screen: Screen;
  apiKey: string | null;
  setupKey: string;
  email: string;
  name: string;
  orderId: string;
  address: string;
  showOptional: boolean;
  lookup: LookupResponse | null;
  errorText: string;
  saving: boolean;
  checking: boolean;
  showEvidenceForm: boolean;
  evidenceOrderId: string;
  evidenceLoading: boolean;
  evidence: EvidenceResponse | null;
  evidenceError: string;
};

export type PopupAction =
  | { type: 'patch'; patch: Partial<PopupState> }
  | { type: 'bootstrapFailed'; error: string }
  | { type: 'bootstrapReady'; apiKey: string | null; email?: string }
  | { type: 'saveApiKeyStarted' }
  | { type: 'saveApiKeyFailed'; error: string }
  | { type: 'saveApiKeySucceeded'; apiKey: string }
  | { type: 'disconnected' }
  | { type: 'lookupStarted' }
  | { type: 'lookupFailed'; error: string }
  | { type: 'lookupSucceeded'; lookup: LookupResponse; evidenceOrderId?: string }
  | { type: 'evidenceStarted' }
  | { type: 'evidenceFailed'; error: string }
  | { type: 'evidenceSucceeded'; evidence: EvidenceResponse }
  | { type: 'resetLookup' }
  | { type: 'goToSetupForKeyUpdate' };

export const initialPopupState: PopupState = {
  screen: 'loading',
  apiKey: null,
  setupKey: '',
  email: '',
  name: '',
  orderId: '',
  address: '',
  showOptional: false,
  lookup: null,
  errorText: '',
  saving: false,
  checking: false,
  showEvidenceForm: false,
  evidenceOrderId: '',
  evidenceLoading: false,
  evidence: null,
  evidenceError: '',
};

export function popupReducer(state: PopupState, action: PopupAction): PopupState {
  switch (action.type) {
    case 'patch':
      return { ...state, ...action.patch };
    case 'bootstrapFailed':
      return { ...state, screen: 'error', errorText: action.error };
    case 'bootstrapReady':
      return {
        ...state,
        apiKey: action.apiKey,
        email: action.email ?? state.email,
        screen: action.apiKey ? 'lookup' : 'setup',
      };
    case 'saveApiKeyStarted':
      return { ...state, saving: true, errorText: '' };
    case 'saveApiKeyFailed':
      return { ...state, saving: false, errorText: action.error };
    case 'saveApiKeySucceeded':
      return {
        ...state,
        saving: false,
        apiKey: action.apiKey,
        setupKey: '',
        screen: 'lookup',
      };
    case 'disconnected':
      return {
        ...state,
        apiKey: null,
        lookup: null,
        evidence: null,
        screen: 'setup',
      };
    case 'lookupStarted':
      return {
        ...state,
        checking: true,
        screen: 'loading',
        errorText: '',
        evidence: null,
        evidenceError: '',
      };
    case 'lookupFailed':
      return {
        ...state,
        checking: false,
        screen: 'error',
        errorText: action.error,
      };
    case 'lookupSucceeded':
      return {
        ...state,
        checking: false,
        lookup: action.lookup,
        evidenceOrderId: action.evidenceOrderId ?? state.evidenceOrderId,
        screen: 'results',
      };
    case 'evidenceStarted':
      return { ...state, evidenceLoading: true, evidenceError: '' };
    case 'evidenceFailed':
      return { ...state, evidenceLoading: false, evidenceError: action.error };
    case 'evidenceSucceeded':
      return {
        ...state,
        evidenceLoading: false,
        evidence: action.evidence,
        showEvidenceForm: false,
      };
    case 'resetLookup':
      return { ...state, lookup: null, screen: 'lookup' };
    case 'goToSetupForKeyUpdate':
      return { ...state, setupKey: '', screen: 'setup' };
    default:
      return state;
  }
}
