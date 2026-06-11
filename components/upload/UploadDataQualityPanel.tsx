'use client';

import Link from 'next/link';
import { AlertCircle, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import type { DataQualityReport } from '@/lib/csv/dataQuality';
import {
  uploadHighRiskIconStyle,
  uploadHighRiskPanelStyle,
  uploadMutedTextStyle,
  uploadSuccessIconStyle,
  uploadSuccessPanelStyle,
  uploadTextStyle,
} from '@/components/upload/uploadClientStyles';

type UploadDataQualityPanelProps = {
  dataQuality: DataQualityReport;
  exportFieldsOpen: boolean;
  onToggleExportFields: () => void;
};

export function UploadDataQualityPanel({
  dataQuality,
  exportFieldsOpen,
  onToggleExportFields,
}: UploadDataQualityPanelProps) {
  const { grade, missingHighValue, score, presentFields } = dataQuality;

  if (grade === 'rich' || grade === 'adequate') {
    return (
      <div className="flex items-center gap-2 rounded-md px-3 py-2 text-sm border" style={uploadSuccessPanelStyle}>
        <CheckCircle className="h-4 w-4 flex-shrink-0" style={uploadSuccessIconStyle} />
        <span style={uploadTextStyle}>
          <strong>Good data quality</strong> - identity matching will work well. Fields include{' '}
          {presentFields.slice(0, 3).join(', ')}
          {presentFields.length > 3 && ` +${presentFields.length - 3} more`}.
        </span>
      </div>
    );
  }

  if (grade === 'minimal') {
    return (
      <div className="rounded-md px-4 py-3 space-y-2 border" style={uploadHighRiskPanelStyle}>
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={uploadHighRiskIconStyle} />
          <div>
            <p className="text-sm font-semibold" style={uploadTextStyle}>
              Minimal data - results will be limited
            </p>
            <p className="text-sm mt-0.5" style={uploadMutedTextStyle}>
              Only required fields found ({score} of 17 identity fields). Results will be limited.
            </p>
          </div>
        </div>
        <Link
          href="/help/csv-export"
          target="_blank"
          className="inline-block px-3 py-1.5 text-xs font-semibold rounded"
          style={{ background: 'var(--risk-high-bd)', color: 'var(--text)' }}
        >
          Improve my export →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-md px-4 py-3 space-y-2 border" style={uploadHighRiskPanelStyle}>
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={uploadHighRiskIconStyle} />
        <div>
          <p className="text-sm font-semibold" style={uploadTextStyle}>
            Limited identity data detected
          </p>
          <p className="text-sm mt-0.5" style={uploadMutedTextStyle}>
            Your export includes {presentFields.length} of 17 identity fields ({score}% coverage).
          </p>
          {missingHighValue.length > 0 && (
            <p className="text-xs mt-1" style={uploadMutedTextStyle}>
              Missing:{' '}
              {missingHighValue
                .slice(0, 3)
                .map((f) => f.replace(/_/g, ' '))
                .join(', ')}
              {missingHighValue.length > 3 && ` +${missingHighValue.length - 3} more`}.
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onToggleExportFields}
        className="flex items-center gap-1 text-xs font-semibold hover:underline"
        style={uploadMutedTextStyle}
      >
        {exportFieldsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        How to add these fields
      </button>
      {exportFieldsOpen && (
        <div
          className="mt-2 pl-4 text-xs space-y-1"
          style={{ borderLeft: '2px solid var(--risk-high-bd)', color: 'var(--text-secondary)' }}
        >
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Card last 4 / phone / billing address:</strong> included in the default Orders export.
            </li>
            <li>
              <strong>IP address:</strong> requires a third-party export app.
            </li>
            <li>
              <strong>Card fingerprint / device ID:</strong> requires PSP-level data.
            </li>
          </ul>
          <Link href="/help/csv-export" target="_blank" className="underline" style={uploadMutedTextStyle}>
            Full field guide →
          </Link>
        </div>
      )}
    </div>
  );
}
