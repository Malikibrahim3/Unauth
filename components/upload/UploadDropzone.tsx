'use client';

import type { RefObject } from 'react';
import { FileText } from 'lucide-react';
import type { BatchItem } from '@/components/upload/uploadClientTypes';
import { uploadDropzoneStyle, uploadMutedTextStyle, uploadTextStyle } from '@/components/upload/uploadClientStyles';

type UploadDropzoneProps = {
  file: File | null;
  batchQueue: BatchItem[];
  dragOver: boolean;
  isProcessing: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onBrowse: () => void;
  onFilesSelected: (files: File[]) => void;
};

export function UploadDropzone({
  file,
  batchQueue,
  dragOver,
  isProcessing,
  fileInputRef,
  onDrop,
  onDragOver,
  onDragLeave,
  onBrowse,
  onFilesSelected,
}: UploadDropzoneProps) {
  return (
    <button
      type="button"
      disabled={isProcessing}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={onBrowse}
      className="flex min-h-[480px] w-full flex-col items-center justify-center border-2 border-dashed rounded-md p-10 text-center transition-colors disabled:cursor-default"
      style={uploadDropzoneStyle(dragOver, isProcessing)}
      aria-label="Upload CSV file"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        multiple
        disabled={isProcessing}
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          onFilesSelected(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
      {file ? (
        <div>
          <div className="flex items-center justify-center gap-2 text-sm font-semibold" style={uploadTextStyle}>
            <FileText className="h-4 w-4" />
            {batchQueue.length > 1 ? `${batchQueue.length} files selected` : file.name}
          </div>
          <p className="text-xs mt-1" style={uploadMutedTextStyle}>
            {batchQueue.length > 1
              ? `${(batchQueue.reduce((sum, item) => sum + item.file.size, 0) / 1024 / 1024).toFixed(1)} MB total`
              : `${(file.size / 1024).toFixed(0)} KB`}
          </p>
        </div>
      ) : (
        <div>
          <p className="t-subhead" style={{ color: 'var(--text-primary)' }}>
            Drop one or more CSVs here, or click to browse
          </p>
          <p className="t-caption mt-2" style={{ color: 'var(--text-tertiary)' }}>
            Accepted formats: CSV. Batch upload supported. Max 200 MB per file.
          </p>
        </div>
      )}
    </button>
  );
}
