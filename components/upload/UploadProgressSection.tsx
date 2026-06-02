'use client';

import {
  uploadMutedTextStyle,
  uploadProgressFillStyle,
  uploadProgressTrackStyle,
  uploadPulseProgressStyle,
  uploadSubtleTextStyle,
} from '@/components/upload/uploadClientStyles';

type UploadProgressSectionProps = {
  phase: 'uploading' | 'processing' | 'recovering';
  statusText: string;
  progress: number;
  totalRows: number;
};

export function UploadProgressSection({ phase, statusText, progress, totalRows }: UploadProgressSectionProps) {
  if (phase === 'recovering') {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs" style={uploadMutedTextStyle}>
          <span>{statusText}</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={uploadProgressTrackStyle}>
          <div className="h-full w-full animate-pulse" style={uploadPulseProgressStyle} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs" style={uploadMutedTextStyle}>
        <span>{statusText}</span>
        {phase === 'processing' && totalRows > 0 ? <span>{progress}%</span> : null}
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={uploadProgressTrackStyle}>
        {totalRows === 0 ? (
          <div className="h-full w-full animate-pulse" style={uploadPulseProgressStyle} />
        ) : (
          <div className="h-full transition-colors duration-500 ease-out" style={uploadProgressFillStyle(progress)} />
        )}
      </div>
      {phase === 'processing' && (
        <p className="text-xs" style={uploadSubtleTextStyle}>
          You can leave this page - we&apos;ll keep processing in the background.
        </p>
      )}
    </div>
  );
}
