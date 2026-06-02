'use client';

import type { RequiredField } from '@/lib/csv/headerAliases';
import { EMPTY_RECENT_IMPORTS } from '@/components/upload/uploadClientConstants';
import type { RecentImport } from '@/components/upload/uploadClientTypes';
import { useUploadClient } from '@/components/upload/useUploadClient';
import { UploadAdvancedIntegrations } from '@/components/upload/UploadAdvancedIntegrations';
import { UploadBatchQueuePanel } from '@/components/upload/UploadBatchQueuePanel';
import { UploadColumnMappingPanel } from '@/components/upload/UploadColumnMappingPanel';
import { UploadContextPanel } from '@/components/upload/UploadContextPanel';
import { UploadDropzone } from '@/components/upload/UploadDropzone';
import { UploadErrorBanner } from '@/components/upload/UploadErrorBanner';
import { UploadExportGuide } from '@/components/upload/UploadExportGuide';
import { UploadIdleActions } from '@/components/upload/UploadIdleActions';
import { UploadProgressSection } from '@/components/upload/UploadProgressSection';
import { UploadRecentImports } from '@/components/upload/UploadRecentImports';
import { UploadStepIndicator } from '@/components/upload/UploadStepIndicator';
import { uploadSubtleTextStyle } from '@/components/upload/uploadClientStyles';

type UploadClientProps = {
  recentImports?: RecentImport[];
};

export default function UploadClient({ recentImports = EMPTY_RECENT_IMPORTS }: UploadClientProps) {
  const workbench = useUploadClient();
  const { state } = workbench;

  const showBatchPanel =
    state.batchQueue.length > 1 &&
    (state.batchRunning || state.batchQueue.some((item) => item.status !== 'queued'));

  return (
    <div className="space-y-6">
      {state.phase === 'idle' && recentImports.length > 0 ? (
        <UploadRecentImports recentImports={recentImports} />
      ) : null}

      <UploadStepIndicator stepIndex={workbench.stepIndex} />

      <UploadExportGuide
        open={state.exportGuideOpen}
        onToggle={() => workbench.dispatch({ type: 'toggleExportGuide' })}
      />

      {state.phase !== 'mapping' ? (
        <UploadDropzone
          file={state.file}
          batchQueue={state.batchQueue}
          dragOver={state.dragOver}
          isProcessing={workbench.isProcessing}
          fileInputRef={workbench.fileInputRef}
          onDrop={workbench.onDrop}
          onDragOver={(e) => {
            e.preventDefault();
            workbench.patch({ dragOver: true });
          }}
          onDragLeave={() => workbench.patch({ dragOver: false })}
          onBrowse={() => {
            if (!workbench.isProcessing) workbench.fileInputRef.current?.click();
          }}
          onFilesSelected={workbench.onFileInputChange}
        />
      ) : null}

      {state.phase === 'idle' ? (
        <p className="t-caption max-w-2xl" style={{ color: 'var(--ink-tertiary)' }}>
          Your uploaded data is processed to identify patterns within your own order history. Data handling details are
          available in your merchant agreement.
        </p>
      ) : null}

      {state.phase === 'mapping' && state.csvHeaders.length > 0 ? (
        <UploadColumnMappingPanel
          csvHeaders={state.csvHeaders}
          columnMap={state.columnMap}
          fuzzyFields={state.fuzzyFields}
          batchQueue={state.batchQueue}
          advancedOpen={state.advancedOpen}
          exportFieldsOpen={state.exportFieldsOpen}
          dataQuality={workbench.dataQuality}
          canSubmit={workbench.canSubmit}
          requiredUnmappedCount={workbench.requiredUnmapped.length}
          onSetColumnField={(field: RequiredField, header) =>
            workbench.dispatch({ type: 'setColumnField', field, header })
          }
          onToggleAdvanced={() => workbench.dispatch({ type: 'toggleAdvanced' })}
          onToggleExportFields={() => workbench.dispatch({ type: 'toggleExportFields' })}
          onCancel={() => workbench.dispatch({ type: 'resetMapping' })}
          onContinue={workbench.proceedToContext}
        />
      ) : null}

      {state.phase === 'mapping' ? <UploadAdvancedIntegrations /> : null}

      {state.phase === 'context' ? (
        <UploadContextPanel
          uploadLabel={state.uploadLabel}
          dateRangeStart={state.dateRangeStart}
          dateRangeEnd={state.dateRangeEnd}
          uploadType={state.uploadType}
          duplicateWarning={state.duplicateWarning}
          uploadWarnings={state.uploadWarnings}
          batchQueueLength={state.batchQueue.length}
          batchRunning={state.batchRunning}
          dataQuality={workbench.dataQuality}
          onLabelChange={(value) => workbench.patch({ uploadLabel: value })}
          onDateRangeStartChange={(value) => workbench.patch({ dateRangeStart: value })}
          onDateRangeEndChange={(value) => workbench.patch({ dateRangeEnd: value })}
          onUploadTypeChange={(value) => workbench.patch({ uploadType: value })}
          onBack={() => workbench.patch({ phase: 'mapping' })}
          onSubmit={() => void workbench.runAudit()}
          onForceSubmit={() => void workbench.runAudit(true)}
          onBatchSubmit={() => void workbench.runBatchAudit()}
        />
      ) : null}

      {showBatchPanel ? (
        <UploadBatchQueuePanel
          batchQueue={state.batchQueue}
          batchRunning={state.batchRunning}
          onRemoveItem={(id) => workbench.dispatch({ type: 'removeBatchItem', id })}
          onAddMore={() => workbench.fileInputRef.current?.click()}
        />
      ) : null}

      {state.friendlyError ? (
        <UploadErrorBanner
          friendlyError={state.friendlyError}
          rawErrorDetail={state.rawErrorDetail}
          showErrorDetail={state.showErrorDetail}
          canRecover={state.canRecover}
          totalRows={state.totalRows}
          onToggleErrorDetail={() => workbench.dispatch({ type: 'toggleErrorDetail' })}
          onRecover={() => void workbench.attemptRecovery()}
        />
      ) : null}

      {state.phase === 'recovering' ? (
        <UploadProgressSection
          phase="recovering"
          statusText={state.statusText}
          progress={state.progress}
          totalRows={state.totalRows}
        />
      ) : null}

      {state.phase === 'uploading' || state.phase === 'processing' ? (
        <UploadProgressSection
          phase={state.phase}
          statusText={state.statusText}
          progress={state.progress}
          totalRows={state.totalRows}
        />
      ) : null}

      {state.phase === 'idle' || state.phase === 'error' ? (
        <UploadIdleActions
          isProcessing={workbench.isProcessing}
          onChooseFile={() => workbench.fileInputRef.current?.click()}
        />
      ) : null}

      <p className="text-xs" style={uploadSubtleTextStyle}>
        Exporting from WooCommerce, BigCommerce or Magento? Any CSV with orders, customers and refund info will work -
        we&apos;ll help you match the columns.
      </p>
    </div>
  );
}
