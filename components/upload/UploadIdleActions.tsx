'use client';

import { downloadTemplate } from '@/components/upload/uploadClientApi';
import { uploadPrimaryButtonStyle, uploadSecondaryButtonStyle } from '@/components/upload/uploadClientStyles';

type UploadIdleActionsProps = {
  isProcessing: boolean;
  onChooseFile: () => void;
};

export function UploadIdleActions({ isProcessing, onChooseFile }: UploadIdleActionsProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onChooseFile}
        disabled={isProcessing}
        className="px-5 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-[var(--accent-hover)]"
        style={uploadPrimaryButtonStyle}
      >
        Choose file
      </button>
      <button
        type="button"
        onClick={downloadTemplate}
        className="px-4 py-2 text-sm font-semibold rounded-md transition-colors border hover:bg-[var(--bg-subtle)]"
        style={uploadSecondaryButtonStyle}
      >
        Download template
      </button>
    </div>
  );
}
