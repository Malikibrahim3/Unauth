import type { AutoMapResult } from '@/lib/csv/headerAliases';

const PREFILL_KEY = 'auditPrefillEmail';

function readAuditPrefillEmail(): string {
  if (typeof window === 'undefined') return '';
  const prefill = sessionStorage.getItem(PREFILL_KEY);
  if (prefill) sessionStorage.removeItem(PREFILL_KEY);
  return prefill ?? '';
}

export type AuditUploadFormState = {
  email: string;
  emailError: string;
  file: File | null;
  fileError: string;
  rowCount: number | null;
  submitError: string;
  loading: boolean;
  isDragging: boolean;
  schemaOpen: boolean;
};

export type AuditUploadFormAction =
  | { type: 'patch'; patch: Partial<AuditUploadFormState> }
  | { type: 'fileDetected'; file: File; rowCount: number }
  | { type: 'clearFile' };

export function createAuditUploadInitialState(): AuditUploadFormState {
  return {
    email: readAuditPrefillEmail(),
    emailError: '',
    file: null,
    fileError: '',
    rowCount: null,
    submitError: '',
    loading: false,
    isDragging: false,
    schemaOpen: false,
  };
}

export function auditUploadFormReducer(
  state: AuditUploadFormState,
  action: AuditUploadFormAction,
): AuditUploadFormState {
  switch (action.type) {
    case 'patch':
      return { ...state, ...action.patch };
    case 'fileDetected':
      return {
        ...state,
        file: action.file,
        rowCount: action.rowCount,
        fileError: '',
        submitError: '',
      };
    case 'clearFile':
      return { ...state, file: null, rowCount: null, fileError: '' };
    default:
      return state;
  }
}

export type { AutoMapResult };
