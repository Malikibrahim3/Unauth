'use client';

import { AlertCircle, CheckCircle, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import type { DataQualityReport } from '@/lib/csv/dataQuality';
import type { RequiredField } from '@/lib/csv/headerAliases';
import { UploadDataQualityPanel } from '@/components/upload/UploadDataQualityPanel';
import {
  COLLAPSED_OPTIONAL_FIELD_GROUPS,
  FIELD_LABELS,
  REQUIRED_FIELDS_LIST,
  VISIBLE_OPTIONAL_FIELD_GROUPS,
} from '@/components/upload/uploadClientConstants';
import type { BatchItem } from '@/components/upload/uploadClientTypes';
import {
  uploadCriticalIconStyle,
  uploadInfoChipStyle,
  uploadInsetFieldStyle,
  uploadMappedRowStyle,
  uploadMutedTextStyle,
  uploadSubtleBorderStyle,
  uploadSubtleTextStyle,
  uploadSuccessIconStyle,
  uploadTextStyle,
} from '@/components/upload/uploadClientStyles';

type UploadColumnMappingPanelProps = {
  csvHeaders: string[];
  columnMap: Partial<Record<RequiredField, string>>;
  fuzzyFields: RequiredField[];
  batchQueue: BatchItem[];
  advancedOpen: boolean;
  exportFieldsOpen: boolean;
  dataQuality: DataQualityReport | null;
  canSubmit: boolean;
  requiredUnmappedCount: number;
  onSetColumnField: (field: RequiredField, header: string | undefined) => void;
  onToggleAdvanced: () => void;
  onToggleExportFields: () => void;
  onCancel: () => void;
  onContinue: () => void;
};

function ColumnMappingRow({
  field,
  mapped,
  isFuzzy,
  isUnmapped,
  isImprover,
  csvHeaders,
  onSetColumnField,
}: {
  field: RequiredField;
  mapped: string | undefined;
  isFuzzy: boolean;
  isUnmapped: boolean;
  isImprover: boolean;
  csvHeaders: string[];
  onSetColumnField: (field: RequiredField, header: string | undefined) => void;
}) {
  const labelWidth = isImprover ? 'w-44' : 'w-40';
  return (
    <div key={field} className="flex items-center gap-3 rounded px-3 py-2" style={uploadMappedRowStyle(isUnmapped, isImprover)}>
      <span className={`text-xs ${labelWidth} flex-shrink-0`} style={isImprover ? uploadMutedTextStyle : uploadTextStyle}>
        {FIELD_LABELS[field]}
      </span>
      <span className="text-xs" style={uploadSubtleTextStyle}>
        ←
      </span>
      <select
        value={mapped ?? ''}
        onChange={(e) => onSetColumnField(field, e.target.value || undefined)}
        className="text-xs rounded px-2 py-1 flex-1 focus:outline-none"
        style={uploadInsetFieldStyle}
      >
        <option value="">- not mapped -</option>
        {csvHeaders.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      {mapped && !isFuzzy && <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" style={uploadSuccessIconStyle} />}
      {mapped && isFuzzy && (
        <span
          className="text-xs px-1 py-0.5 rounded font-semibold flex-shrink-0"
          style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
          title="Auto-detected — please confirm this match is correct"
        >
          ?
        </span>
      )}
      {isUnmapped && !isImprover && <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" style={uploadCriticalIconStyle} />}
      {isUnmapped && isImprover && (
        <span
          className="text-xs px-1 py-0.5 rounded flex-shrink-0"
          style={{ background: 'var(--risk-medium-bg)', color: 'var(--risk-medium)' }}
          title="Adding this field improves match accuracy"
        >
          +
        </span>
      )}
    </div>
  );
}

export function UploadColumnMappingPanel({
  csvHeaders,
  columnMap,
  fuzzyFields,
  batchQueue,
  advancedOpen,
  exportFieldsOpen,
  dataQuality,
  canSubmit,
  requiredUnmappedCount,
  onSetColumnField,
  onToggleAdvanced,
  onToggleExportFields,
  onCancel,
  onContinue,
}: UploadColumnMappingPanelProps) {
  const fuzzySet = new Set(fuzzyFields);

  return (
    <div data-testid="column-mapping" className="rounded-md p-5 space-y-4 border" style={uploadSubtleBorderStyle}>
      <div>
        <h3 className="text-sm font-semibold mb-0.5" style={uploadTextStyle}>
          We found {csvHeaders.length} columns in your CSV. Match them:
        </h3>
        {batchQueue.length > 1 && (
          <div className="flex items-center gap-1.5 mb-1 text-xs px-2 py-1 rounded" style={uploadInfoChipStyle}>
            <Layers className="h-3.5 w-3.5 flex-shrink-0" />
            This mapping will be applied to all {batchQueue.length} files in the batch.
          </div>
        )}
        <p className="text-xs" style={uploadSubtleTextStyle}>
          Upload your existing order export. Unauth works with standard order, customer, payment and refund fields.
          Advanced integrations can add device, payment and delivery intelligence later.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={uploadMutedTextStyle}>
          Required columns
        </p>
        {REQUIRED_FIELDS_LIST.map((field) => (
          <ColumnMappingRow
            key={field}
            field={field}
            mapped={columnMap[field]}
            isFuzzy={fuzzySet.has(field)}
            isUnmapped={!columnMap[field]}
            isImprover={false}
            csvHeaders={csvHeaders}
            onSetColumnField={onSetColumnField}
          />
        ))}
      </div>

      {VISIBLE_OPTIONAL_FIELD_GROUPS.map((group) => (
        <div key={group.label} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={uploadMutedTextStyle}>
            {group.label}
          </p>
          {group.fields.map((field) => (
            <ColumnMappingRow
              key={field}
              field={field}
              mapped={columnMap[field]}
              isFuzzy={fuzzySet.has(field)}
              isUnmapped={!columnMap[field]}
              isImprover={group.importance === 'match_improver'}
              csvHeaders={csvHeaders}
              onSetColumnField={onSetColumnField}
            />
          ))}
        </div>
      ))}

      {COLLAPSED_OPTIONAL_FIELD_GROUPS.map((group) => (
        <div key={group.label} className="rounded-md overflow-hidden border" style={uploadSubtleBorderStyle}>
          <button
            type="button"
            onClick={onToggleAdvanced}
            className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--bg-subtle)]"
            style={uploadMutedTextStyle}
          >
            {advancedOpen ? (
              <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
            )}
            <span className="text-xs font-semibold uppercase tracking-wide">{group.label}</span>
          </button>
          {advancedOpen && (
            <div className="px-3 pb-3 space-y-1.5" style={{ borderTop: '1px solid var(--border-muted)' }}>
              <p className="text-xs pt-2" style={uploadSubtleTextStyle}>
                These fields can be exported from some platforms but are not required. Advanced integrations (below)
                provide richer signals.
              </p>
              {group.fields.map((field) => (
                <ColumnMappingRow
                  key={field}
                  field={field}
                  mapped={columnMap[field]}
                  isFuzzy={fuzzySet.has(field)}
                  isUnmapped={false}
                  isImprover={false}
                  csvHeaders={csvHeaders}
                  onSetColumnField={onSetColumnField}
                />
              ))}
            </div>
          )}
        </div>
      ))}

      {dataQuality && canSubmit ? (
        <UploadDataQualityPanel
          dataQuality={dataQuality}
          exportFieldsOpen={exportFieldsOpen}
          onToggleExportFields={onToggleExportFields}
        />
      ) : null}

      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold rounded-md transition-colors border hover:bg-[var(--bg-subtle)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={!canSubmit}
            className="px-5 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-[var(--accent-hover)]"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            {canSubmit
              ? 'Continue →'
              : `${requiredUnmappedCount} required field${requiredUnmappedCount !== 1 ? 's' : ''} unmapped`}
          </button>
        </div>
        {canSubmit && (
          <p className="text-xs" style={uploadSubtleTextStyle}>
            This mapping will be saved as your default for future uploads.
          </p>
        )}
      </div>
    </div>
  );
}
