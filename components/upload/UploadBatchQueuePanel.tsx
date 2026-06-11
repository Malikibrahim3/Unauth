'use client';

import Link from 'next/link';
import { FileText, Layers, Plus, X } from 'lucide-react';
import type { BatchItem } from '@/components/upload/uploadClientTypes';
import {
  batchStatusColor,
  uploadAccentTextStyle,
  uploadIconMutedStyle,
  uploadMutedTextStyle,
  uploadProgressFillStyle,
  uploadProgressTrackStyle,
  uploadSubtleBorderStyle,
  uploadTextStyle,
} from '@/components/upload/uploadClientStyles';

type UploadBatchQueuePanelProps = {
  batchQueue: BatchItem[];
  batchRunning: boolean;
  onRemoveItem: (id: string) => void;
  onAddMore: () => void;
};

export function UploadBatchQueuePanel({
  batchQueue,
  batchRunning,
  onRemoveItem,
  onAddMore,
}: UploadBatchQueuePanelProps) {
  const completeCount = batchQueue.filter((item) => item.status === 'complete').length;

  return (
    <div className="rounded-md border overflow-hidden" style={uploadSubtleBorderStyle}>
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-muted)' }}
      >
        <div className="flex items-center gap-2 text-sm font-semibold" style={uploadTextStyle}>
          <Layers className="h-4 w-4" style={uploadIconMutedStyle} />
          Batch upload - {completeCount} / {batchQueue.length} complete
        </div>
        {!batchRunning && batchQueue.every((item) => item.status === 'complete') && (
          <Link href="/history" className="text-xs font-semibold hover:underline" style={uploadAccentTextStyle}>
            View all audits →
          </Link>
        )}
      </div>
      <div className="divide-y" style={uploadSubtleBorderStyle}>
        {batchQueue.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
            <FileText className="h-4 w-4 flex-shrink-0" style={uploadIconMutedStyle} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={uploadTextStyle}>
                {item.file.name}
              </p>
              <p className="text-xs" style={{ color: batchStatusColor(item.status) }}>
                {item.statusText}
              </p>
              {(item.status === 'uploading' || item.status === 'processing') && (
                <div className="mt-1 w-full h-1 rounded-full overflow-hidden" style={uploadProgressTrackStyle}>
                  {item.progress > 0 ? (
                    <div className="h-full transition-colors duration-500" style={uploadProgressFillStyle(item.progress)} />
                  ) : (
                    <div className="h-full w-full animate-pulse" style={{ background: 'var(--accent)', opacity: 0.5 }} />
                  )}
                </div>
              )}
              {item.error ? (
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--risk-critical)' }}>
                  {item.error}
                </p>
              ) : null}
            </div>
            {item.status === 'complete' && item.runId ? (
              <Link
                href={`/audit/${item.runId}`}
                className="text-xs font-semibold flex-shrink-0 hover:underline"
                style={uploadAccentTextStyle}
              >
                View →
              </Link>
            ) : null}
            {item.status === 'queued' && !batchRunning ? (
              <button
                type="button"
                aria-label="Remove"
                onClick={() => onRemoveItem(item.id)}
                className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
              >
                <X className="h-3.5 w-3.5" style={uploadMutedTextStyle} />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {!batchRunning && (
        <div className="px-4 py-2 border-t" style={uploadSubtleBorderStyle}>
          <button
            type="button"
            onClick={onAddMore}
            className="flex items-center gap-1.5 text-xs font-semibold hover:underline"
            style={uploadMutedTextStyle}
          >
            <Plus className="h-3.5 w-3.5" /> Add more files
          </button>
        </div>
      )}
    </div>
  );
}
