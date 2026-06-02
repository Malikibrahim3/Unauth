'use client';

import Link from 'next/link';
import { Calendar, Layers } from 'lucide-react';
import { formatDateShort } from '@/lib/utils/format';
import type { DataQualityReport } from '@/lib/csv/dataQuality';
import { UPLOAD_TYPE_OPTIONS } from '@/components/upload/uploadClientConstants';
import type { DuplicateWarning, UploadType } from '@/components/upload/uploadClientTypes';
import {
  uploadAccentTextStyle,
  uploadIconMutedStyle,
  uploadInsetFieldStyle,
  uploadMediumRiskPanelStyle,
  uploadMutedTextStyle,
  uploadPrimaryButtonStyle,
  uploadSecondaryButtonStyle,
  uploadSubtleBorderStyle,
  uploadSubtleTextStyle,
  uploadTextStyle,
  uploadUploadTypeOptionStyle,
} from '@/components/upload/uploadClientStyles';

type UploadContextPanelProps = {
  uploadLabel: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  uploadType: UploadType;
  duplicateWarning: DuplicateWarning | null;
  uploadWarnings: string[];
  batchQueueLength: number;
  batchRunning: boolean;
  dataQuality: DataQualityReport | null;
  onLabelChange: (value: string) => void;
  onDateRangeStartChange: (value: string) => void;
  onDateRangeEndChange: (value: string) => void;
  onUploadTypeChange: (value: UploadType) => void;
  onBack: () => void;
  onSubmit: () => void;
  onForceSubmit: () => void;
  onBatchSubmit: () => void;
};

export function UploadContextPanel({
  uploadLabel,
  dateRangeStart,
  dateRangeEnd,
  uploadType,
  duplicateWarning,
  uploadWarnings,
  batchQueueLength,
  batchRunning,
  dataQuality,
  onLabelChange,
  onDateRangeStartChange,
  onDateRangeEndChange,
  onUploadTypeChange,
  onBack,
  onSubmit,
  onForceSubmit,
  onBatchSubmit,
}: UploadContextPanelProps) {
  return (
    <div data-testid="upload-context" className="rounded-lg p-5 space-y-5 border" style={uploadSubtleBorderStyle}>
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <Calendar className="h-4 w-4" style={uploadIconMutedStyle} />
          <h3 className="text-sm font-semibold" style={uploadTextStyle}>
            Upload context
          </h3>
        </div>
        <p className="text-xs" style={uploadSubtleTextStyle}>
          Tell us a bit about this upload. All fields are optional - skip anything you don&apos;t need.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="upload-context-label" className="text-xs font-semibold" style={uploadMutedTextStyle}>
          Label
        </label>
        <input
          id="upload-context-label"
          data-testid="upload-label"
          type="text"
          value={uploadLabel}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="e.g. January 2026, Black Friday week, Q1 2026"
          maxLength={120}
          className="w-full text-sm rounded-md px-3 py-2 focus:outline-none"
          style={uploadInsetFieldStyle}
        />
        <p className="text-xs" style={uploadSubtleTextStyle}>
          Appears in your audit history. Leave blank to use the upload date.
        </p>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-semibold" style={uploadMutedTextStyle}>
          Date range this upload covers
        </span>
        <div className="flex items-center gap-2">
          <input
            data-testid="date-range-start"
            type="date"
            aria-label="Date range start"
            value={dateRangeStart}
            onChange={(e) => onDateRangeStartChange(e.target.value)}
            className="flex-1 text-sm rounded-md px-3 py-2 focus:outline-none"
            style={uploadInsetFieldStyle}
          />
          <span className="text-xs" style={uploadMutedTextStyle}>
            to
          </span>
          <input
            data-testid="date-range-end"
            type="date"
            aria-label="Date range end"
            value={dateRangeEnd}
            onChange={(e) => onDateRangeEndChange(e.target.value)}
            className="flex-1 text-sm rounded-md px-3 py-2 focus:outline-none"
            style={uploadInsetFieldStyle}
          />
        </div>
        <p className="text-xs" style={uploadSubtleTextStyle}>
          The order date range your export covers - not the upload date.
        </p>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-semibold" style={uploadMutedTextStyle}>
          Upload type
        </span>
        {UPLOAD_TYPE_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className="flex items-start gap-3 rounded-md px-3 py-2.5 cursor-pointer border transition-colors"
            style={uploadUploadTypeOptionStyle(uploadType === opt.value)}
          >
            <input
              type="radio"
              name="uploadType"
              value={opt.value}
              checked={uploadType === opt.value}
              onChange={() => onUploadTypeChange(opt.value)}
              className="mt-0.5 accent-[var(--accent)]"
            />
            <div>
              <p className="text-sm font-medium" style={uploadTextStyle}>
                {opt.title}
              </p>
              <p className="text-xs mt-0.5" style={uploadMutedTextStyle}>
                {opt.description}
              </p>
            </div>
          </label>
        ))}
      </div>

      {duplicateWarning ? (
        <div className="rounded-lg border px-4 py-3 text-sm" style={uploadMediumRiskPanelStyle}>
          <p className="font-semibold" style={uploadTextStyle}>
            Looks like you&apos;ve already uploaded this file
          </p>
          <p className="mt-0.5" style={uploadMutedTextStyle}>
            {duplicateWarning.existingLabel
              ? `"${duplicateWarning.existingLabel}" was`
              : `"${duplicateWarning.existingFilename}" was`}{' '}
            processed on {formatDateShort(duplicateWarning.existingCreatedAt)}
            {duplicateWarning.existingStatus === 'complete' && (
              <>
                {' - '}
                <Link href={`/audit/${duplicateWarning.existingRunId}`} className="underline" style={uploadAccentTextStyle}>
                  view that audit
                </Link>
              </>
            )}
            .
          </p>
          <p className="mt-1" style={uploadMutedTextStyle}>
            Want to run it again anyway?
          </p>
        </div>
      ) : null}

      {uploadWarnings.length > 0 && (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}
        >
          <p className="font-semibold" style={uploadTextStyle}>
            Review before processing
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5" style={uploadMutedTextStyle}>
            {uploadWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-sm font-semibold rounded-md transition-colors border hover:bg-[var(--bg-subtle)]"
          style={uploadSecondaryButtonStyle}
        >
          ← Back
        </button>
        {duplicateWarning ? (
          <button
            type="button"
            data-testid="submit-upload"
            onClick={onForceSubmit}
            className="px-5 py-2 text-sm font-semibold rounded-md transition-colors hover:bg-[var(--accent-hover)]"
            style={uploadPrimaryButtonStyle}
          >
            Run again anyway
          </button>
        ) : batchQueueLength > 1 ? (
          <button
            type="button"
            data-testid="submit-upload"
            onClick={onBatchSubmit}
            disabled={batchRunning}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-60 hover:enabled:bg-[var(--accent-hover)]"
            style={uploadPrimaryButtonStyle}
          >
            <Layers className="h-4 w-4" />
            {batchRunning ? 'Running batch…' : `Run ${batchQueueLength} audits`}
          </button>
        ) : (
          <button
            type="button"
            data-testid="submit-upload"
            onClick={onSubmit}
            className="px-5 py-2 text-sm font-semibold rounded-md transition-colors hover:bg-[var(--accent-hover)]"
            style={uploadPrimaryButtonStyle}
          >
            {dataQuality?.grade === 'minimal' ? 'Run limited analysis' : 'Upload and run audit'}
          </button>
        )}
      </div>
    </div>
  );
}
