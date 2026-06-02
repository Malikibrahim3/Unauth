import type { RequiredField } from '@/lib/csv/headerAliases';
import { friendlyUploadError } from '@/lib/copy/uploadErrors';
import { readExportGuideOpenPreference } from '@/components/upload/uploadClientConstants';
import type { BatchItem, UploadClientState } from '@/components/upload/uploadClientTypes';

export type UploadClientAction =
  | { type: 'patch'; patch: Partial<UploadClientState> }
  | { type: 'preflightFailed'; message: string }
  | { type: 'setColumnField'; field: RequiredField; header: string | undefined }
  | { type: 'clearFuzzy'; field: RequiredField }
  | { type: 'toggleExportFields' }
  | { type: 'toggleAdvanced' }
  | { type: 'toggleExportGuide' }
  | { type: 'toggleErrorDetail' }
  | { type: 'resetMapping' }
  | { type: 'updateBatchItem'; id: string; patch: Partial<BatchItem> }
  | { type: 'removeBatchItem'; id: string };

export function createUploadClientInitialState(): UploadClientState {
  return {
    phase: 'idle',
    file: null,
    dragOver: false,
    csvHeaders: [],
    columnMap: {},
    fuzzyFields: [],
    progress: 0,
    totalRows: 0,
    statusText: 'Uploading…',
    friendlyError: null,
    rawErrorDetail: null,
    uploadWarnings: [],
    showErrorDetail: false,
    canRecover: false,
    uploadLabel: '',
    dateRangeStart: '',
    dateRangeEnd: '',
    uploadType: 'standard',
    duplicateWarning: null,
    batchQueue: [],
    batchRunning: false,
    exportGuideOpen: readExportGuideOpenPreference(),
    exportFieldsOpen: false,
    advancedOpen: false,
  };
}

export function uploadClientReducer(state: UploadClientState, action: UploadClientAction): UploadClientState {
  switch (action.type) {
    case 'patch':
      return { ...state, ...action.patch };
    case 'preflightFailed':
      return {
        ...state,
        file: null,
        batchQueue: [],
        csvHeaders: [],
        columnMap: {},
        fuzzyFields: [],
        phase: 'error',
        canRecover: false,
        uploadWarnings: [],
        rawErrorDetail: action.message,
        friendlyError: friendlyUploadError(action.message),
      };
    case 'setColumnField': {
      const nextMap = { ...state.columnMap };
      if (action.header) nextMap[action.field] = action.header;
      else delete nextMap[action.field];
      const nextFuzzy = state.fuzzyFields.filter((f) => f !== action.field);
      return { ...state, columnMap: nextMap, fuzzyFields: nextFuzzy };
    }
    case 'clearFuzzy':
      return { ...state, fuzzyFields: state.fuzzyFields.filter((f) => f !== action.field) };
    case 'toggleExportFields':
      return { ...state, exportFieldsOpen: !state.exportFieldsOpen };
    case 'toggleAdvanced':
      return { ...state, advancedOpen: !state.advancedOpen };
    case 'toggleExportGuide': {
      const next = !state.exportGuideOpen;
      try {
        localStorage.setItem('unauth.exportGuide.open', next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return { ...state, exportGuideOpen: next };
    }
    case 'toggleErrorDetail':
      return { ...state, showErrorDetail: !state.showErrorDetail };
    case 'resetMapping':
      return {
        ...state,
        file: null,
        csvHeaders: [],
        columnMap: {},
        fuzzyFields: [],
        phase: 'idle',
        uploadLabel: '',
        dateRangeStart: '',
        dateRangeEnd: '',
        uploadType: 'standard',
      };
    case 'updateBatchItem':
      return {
        ...state,
        batchQueue: state.batchQueue.map((item) =>
          item.id === action.id ? { ...item, ...action.patch } : item,
        ),
      };
    case 'removeBatchItem':
      return { ...state, batchQueue: state.batchQueue.filter((item) => item.id !== action.id) };
    default:
      return state;
  }
}
