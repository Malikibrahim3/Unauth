'use client';

import { AlertCircle } from 'lucide-react';
import type { FriendlyError } from '@/lib/copy/uploadErrors';
import {
  uploadCriticalIconStyle,
  uploadCriticalPanelStyle,
  uploadMutedTextStyle,
  uploadPrimaryButtonStyle,
  uploadSubtleTextStyle,
  uploadTextStyle,
} from '@/components/upload/uploadClientStyles';

type UploadErrorBannerProps = {
  friendlyError: FriendlyError;
  rawErrorDetail: string | null;
  showErrorDetail: boolean;
  canRecover: boolean;
  totalRows: number;
  onToggleErrorDetail: () => void;
  onRecover: () => void;
};

export function UploadErrorBanner({
  friendlyError,
  rawErrorDetail,
  showErrorDetail,
  canRecover,
  totalRows,
  onToggleErrorDetail,
  onRecover,
}: UploadErrorBannerProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg px-4 py-3 border" style={uploadCriticalPanelStyle}>
      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={uploadCriticalIconStyle} />
      <div className="flex-1">
        <p className="text-sm font-semibold" style={uploadTextStyle}>
          {friendlyError.headline}
        </p>
        <p className="text-sm mt-0.5" style={uploadMutedTextStyle}>
          {friendlyError.body}
        </p>
        <p className="text-xs mt-1" style={uploadSubtleTextStyle}>
          Code: {friendlyError.code}
        </p>
        {canRecover && (
          <div className="mt-3">
            <button
              type="button"
              onClick={onRecover}
              className="px-4 py-2 text-sm font-semibold rounded-md transition-colors hover:bg-[var(--accent-hover)]"
              style={uploadPrimaryButtonStyle}
            >
              Recover audit →
            </button>
            <p className="text-xs mt-1" style={uploadSubtleTextStyle}>
              All {totalRows.toLocaleString()} rows were written. Recovery will finalise the audit without
              re-uploading.
            </p>
          </div>
        )}
        {rawErrorDetail ? (
          <div className="mt-2">
            <button
              type="button"
              onClick={onToggleErrorDetail}
              className="text-xs font-semibold hover:underline"
              style={uploadMutedTextStyle}
            >
              {showErrorDetail ? 'Hide technical details' : 'Show technical details'}
            </button>
            {showErrorDetail && (
              <pre
                className="mt-2 text-xs whitespace-pre-wrap break-all p-2 rounded"
                style={{ background: 'var(--bg-inset)', color: 'var(--text-muted)', maxHeight: '200px', overflow: 'auto' }}
              >
                {rawErrorDetail}
              </pre>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
