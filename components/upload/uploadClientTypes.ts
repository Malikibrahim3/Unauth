import type { FriendlyError } from '@/lib/copy/uploadErrors';
import type { RequiredField } from '@/lib/csv/headerAliases';

export type UploadPhase = 'idle' | 'mapping' | 'context' | 'uploading' | 'processing' | 'recovering' | 'complete' | 'error';
export type UploadType = 'standard' | 'historical' | 'investigation';

export type BatchItemStatus = 'queued' | 'uploading' | 'processing' | 'complete' | 'error';

export type BatchItem = {
  id: string;
  file: File;
  hash: string | null;
  status: BatchItemStatus;
  runId: string | null;
  progress: number;
  statusText: string;
  error: string | null;
};

export type DuplicateWarning = {
  existingRunId: string;
  existingFilename: string;
  existingLabel: string | null;
  existingCreatedAt: string;
  existingStatus: string;
};

export type FilePreflightResult = {
  ok: boolean;
  message?: string;
  warnings?: string[];
};

export type RecentImport = {
  id: string;
  filename: string | null;
  label: string | null;
  status: string;
  createdAt: string;
  totalRows: number;
  flaggedCount: number;
};

export type UploadClientState = {
  phase: UploadPhase;
  file: File | null;
  dragOver: boolean;
  csvHeaders: string[];
  columnMap: Partial<Record<RequiredField, string>>;
  fuzzyFields: RequiredField[];
  progress: number;
  totalRows: number;
  statusText: string;
  friendlyError: FriendlyError | null;
  rawErrorDetail: string | null;
  uploadWarnings: string[];
  showErrorDetail: boolean;
  canRecover: boolean;
  uploadLabel: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  uploadType: UploadType;
  duplicateWarning: DuplicateWarning | null;
  batchQueue: BatchItem[];
  batchRunning: boolean;
  exportGuideOpen: boolean;
  exportFieldsOpen: boolean;
  advancedOpen: boolean;
};

export type AuditProgressJob = {
  rowCount: number;
  progressPercent?: number;
  status: string;
  stalled?: boolean;
  canRecover?: boolean;
  errorMessage?: string;
};
