'use client';

import { useCallback, useMemo, useReducer, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { autoMapHeaders, REQUIRED_FIELDS, type RequiredField } from '@/lib/csv/headerAliases';
import { sniffFile } from '@/lib/csv/sniffer';
import { friendlyUploadError } from '@/lib/copy/uploadErrors';
import { assessDataQualityFromMapping } from '@/lib/csv/dataQuality';
import { track } from '@/lib/analytics/amplitude';
import { createClient } from '@/lib/supabase/client';
import {
  checkDuplicateFile,
  hashFile,
  storageUploadErrorMessage,
  validateCsvFile,
} from '@/components/upload/uploadClientApi';
import { startAuditProgressPolling } from '@/components/upload/uploadClientPoll';
import {
  createUploadClientInitialState,
  uploadClientReducer,
  type UploadClientAction,
} from '@/components/upload/uploadClientReducer';
import type { AuditProgressJob, BatchItem, BatchItemStatus, UploadClientState } from '@/components/upload/uploadClientTypes';

function isCsvFile(f: File): boolean {
  const lowerName = f.name.toLowerCase();
  return lowerName.endsWith('.csv') || f.type === 'text/csv' || f.type === 'application/vnd.ms-excel';
}

function applyHeaderMapping(headers: string[]) {
  const { exact, fuzzy } = autoMapHeaders(headers);
  const fuzzyKeys = Object.keys(fuzzy) as RequiredField[];
  return {
    columnMap: { ...exact, ...fuzzy },
    fuzzyFields: fuzzyKeys,
  };
}

export function useUploadClient() {
  const router = useRouter();
  const [state, dispatch] = useReducer(uploadClientReducer, undefined, createUploadClientInitialState);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchQueueRef = useRef<BatchItem[]>([]);
  const runIdRef = useRef<string | null>(null);
  const fileHashRef = useRef<string | null>(null);
  const autoRecoverAttemptedRef = useRef<Set<string> | null>(null);
  const stopPollingRef = useRef<(() => void) | null>(null);

  if (autoRecoverAttemptedRef.current === null) {
    autoRecoverAttemptedRef.current = new Set();
  }

  const patch = useCallback((patchValue: Partial<UploadClientState>) => {
    dispatch({ type: 'patch', patch: patchValue });
    if (patchValue.batchQueue) batchQueueRef.current = patchValue.batchQueue;
  }, []);

  const failPreflight = useCallback((message: string) => {
    dispatch({ type: 'preflightFailed', message });
  }, []);

  const requiredUnmapped = REQUIRED_FIELDS.filter((f) => !state.columnMap[f]);
  const canSubmit = requiredUnmapped.length === 0;

  const dataQuality = useMemo(() => {
    if (state.phase !== 'mapping' && state.phase !== 'context') return null;
    if (state.csvHeaders.length === 0) return null;
    return assessDataQualityFromMapping(state.columnMap);
  }, [state.columnMap, state.csvHeaders.length, state.phase]);

  const isProcessing =
    state.phase === 'uploading' || state.phase === 'processing' || state.phase === 'recovering';
  const stepIndex =
    state.phase === 'mapping' ? 1 : state.phase === 'context' || isProcessing || state.phase === 'complete' ? 2 : 0;

  const stopPolling = useCallback(() => {
    stopPollingRef.current?.();
    stopPollingRef.current = null;
  }, []);

  const handleProcessingJob = useCallback(
    (currentRunId: string, job: AuditProgressJob): 'continue' | 'complete' | 'failed' => {
      if (job.rowCount > 0) {
        patch({ totalRows: job.rowCount, progress: job.progressPercent ?? 0 });
      }
      if (job.status === 'complete') {
        stopPolling();
        patch({ phase: 'complete' });
        router.push(`/audit/${currentRunId}`);
        return 'complete';
      }
      if (job.status === 'failed') {
        if (job.canRecover === true && !autoRecoverAttemptedRef.current!.has(currentRunId)) {
          autoRecoverAttemptedRef.current!.add(currentRunId);
          patch({ phase: 'recovering', statusText: 'Recovering - finalising your audit…' });
          void (async () => {
            const recoverRes = await fetch(`/api/audit/${currentRunId}/recover`, {
              method: 'POST',
              cache: 'no-store',
            });
            const recoverBody = await recoverRes.json().catch(() => ({}));
            if (recoverRes.ok && recoverBody.recovered) {
              patch({ phase: 'processing', statusText: 'Recovery complete - loading results…' });
              return;
            }
            const rawMsg = job.errorMessage ?? 'Processing failed.';
            console.error('[UploadClient] job failed:', rawMsg, job);
            stopPolling();
            patch({
              canRecover: job.canRecover === true,
              phase: 'error',
              rawErrorDetail: rawMsg,
              friendlyError: friendlyUploadError(rawMsg),
            });
          })();
          return 'continue';
        }
        const rawMsg = job.errorMessage ?? 'Processing failed.';
        console.error('[UploadClient] job failed:', rawMsg, job);
        stopPolling();
        patch({
          canRecover: job.canRecover === true,
          phase: 'error',
          rawErrorDetail: rawMsg,
          friendlyError: friendlyUploadError(rawMsg),
        });
        return 'failed';
      }
      const processed = job.rowCount > 0 ? Math.round(((job.progressPercent ?? 0) / 100) * job.rowCount) : 0;
      patch({
        statusText:
          job.status === 'processing'
            ? job.stalled
              ? `Still processing in background… ${processed.toLocaleString()} of ${job.rowCount.toLocaleString()} orders`
              : `Processing ${processed.toLocaleString()} of ${job.rowCount.toLocaleString()} orders`
            : 'Queued for processing…',
      });
      return 'continue';
    },
    [patch, router, stopPolling],
  );

  const beginRunPolling = useCallback(
    (runId: string) => {
      runIdRef.current = runId;
      stopPolling();
      stopPollingRef.current = startAuditProgressPolling(runId, (job) => handleProcessingJob(runId, job));
    },
    [handleProcessingJob, stopPolling],
  );

  const handleFile = useCallback(
    (f: File) => {
      patch({
        file: f,
        batchQueue: [],
        duplicateWarning: null,
        uploadWarnings: [],
      });
      batchQueueRef.current = [];
      void hashFile(f).then((hex) => {
        fileHashRef.current = hex;
      });
      void sniffFile(f).then(async ({ headers, collisions }) => {
        const preflight = await validateCsvFile(f, headers);
        if (!preflight.ok) {
          failPreflight(preflight.message ?? 'Invalid CSV upload.');
          return;
        }
        if (preflight.warnings?.length) {
          patch({ uploadWarnings: preflight.warnings });
        }
        if (collisions.length > 0) {
          console.warn(
            '[UploadClient] Header collisions detected:',
            collisions.map((c) => `${c.field}: [${c.headers.join(', ')}]`).join(' | '),
          );
        }
        const mapping = applyHeaderMapping(headers);
        patch({
          csvHeaders: headers,
          ...mapping,
          phase: 'mapping',
        });
      });
    },
    [failPreflight, patch],
  );

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      const csvFiles: File[] = [];
      for (const f of files) {
        if (isCsvFile(f)) csvFiles.push(f);
      }
      if (csvFiles.length === 0) {
        failPreflight('Please upload one or more .csv files.');
        return;
      }
      if (csvFiles.length !== files.length) {
        failPreflight('Please upload only .csv files. Remove any PDFs, spreadsheets, or text files and try again.');
        return;
      }
      if (csvFiles.length === 1) {
        handleFile(csvFiles[0]!);
        return;
      }

      const items: BatchItem[] = csvFiles.map((f) => ({
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        file: f,
        hash: null,
        status: 'queued' as BatchItemStatus,
        runId: null,
        progress: 0,
        statusText: 'Queued',
        error: null,
      }));

      void Promise.all(
        items.map(async (item) => {
          const h = await hashFile(item.file);
          dispatch({ type: 'updateBatchItem', id: item.id, patch: { hash: h } });
        }),
      );

      batchQueueRef.current = items;
      patch({ batchQueue: items, file: csvFiles[0]! });

      const { headers, collisions } = await sniffFile(csvFiles[0]!);
      const preflight = await validateCsvFile(csvFiles[0]!, headers);
      if (!preflight.ok) {
        failPreflight(preflight.message ?? 'Invalid CSV upload.');
        return;
      }
      if (preflight.warnings?.length) {
        patch({ uploadWarnings: preflight.warnings });
      }
      if (collisions.length > 0) console.warn('[UploadClient] batch header collisions:', collisions);
      const mapping = applyHeaderMapping(headers);
      patch({
        csvHeaders: headers,
        ...mapping,
        phase: 'mapping',
      });
    },
    [failPreflight, handleFile, patch],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      patch({ dragOver: false });
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length > 1) void handleFiles(dropped);
      else if (dropped[0]) handleFile(dropped[0]);
    },
    [handleFile, handleFiles, patch],
  );

  const onFileInputChange = useCallback(
    (files: File[]) => {
      if (files.length > 1) void handleFiles(files);
      else if (files[0]) handleFile(files[0]);
    },
    [handleFile, handleFiles],
  );

  const proceedToContext = useCallback(() => {
    patch({ phase: 'context' });
  }, [patch]);

  const runAudit = useCallback(
    async (forceReupload = false) => {
      const { file, columnMap, uploadLabel, dateRangeStart, dateRangeEnd, uploadType } = state;
      if (!file || !canSubmit) return;
      patch({
        phase: 'uploading',
        statusText: `Uploading - ${(file.size / 1024 / 1024).toFixed(1)} MB…`,
        friendlyError: null,
        rawErrorDetail: null,
        uploadWarnings: [],
        showErrorDetail: false,
      });
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        const hash = fileHashRef.current ?? (await hashFile(file));
        fileHashRef.current = hash;
        if (!forceReupload) {
          patch({ statusText: 'Checking for duplicate uploads…' });
          const duplicate = await checkDuplicateFile(hash);
          if (duplicate) {
            patch({ phase: 'context', duplicateWarning: duplicate });
            return;
          }
        }
        const filePath = `${user.id}/${Date.now()}_${file.name}`;
        let uploadedToStorage = false;
        patch({ statusText: `Uploading - staging ${(file.size / 1024 / 1024).toFixed(1)} MB to storage…` });
        const { error: uploadError } = await supabase.storage.from('merchant-csv-uploads-2').upload(filePath, file, {
          contentType: 'text/csv',
          upsert: false,
          cacheControl: '3600',
        });
        if (uploadError) {
          throw new Error(`Storage upload failed: ${storageUploadErrorMessage(uploadError)}`);
        }
        uploadedToStorage = true;
        patch({ statusText: 'Uploaded - starting analysis…' });
        const res = await fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath,
            columnMap,
            label: uploadLabel.trim() || undefined,
            dateRangeStart: dateRangeStart || undefined,
            dateRangeEnd: dateRangeEnd || undefined,
            uploadType,
            fileHash: hash,
            forceReupload,
          }),
        });
        if (res.status === 409) {
          const body = await res.json();
          patch({
            phase: 'context',
            duplicateWarning: {
              existingRunId: body.existingRunId,
              existingFilename: body.existingFilename,
              existingLabel: body.existingLabel,
              existingCreatedAt: body.existingCreatedAt,
              existingStatus: body.existingStatus,
            },
          });
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (uploadedToStorage) {
            await supabase.storage.from('merchant-csv-uploads-2').remove([filePath]).catch(() => {});
          }
          throw new Error(body.error ?? `HTTP ${res.status} from /api/audit`);
        }
        const { runId: newRunId } = await res.json();
        patch({ phase: 'processing', statusText: 'Queued for processing…' });
        track('CSV Uploaded', {
          uploadType,
          hasLabel: !!uploadLabel.trim(),
          hasDateRange: !!(dateRangeStart || dateRangeEnd),
          dataQualityGrade: dataQuality?.grade ?? null,
        });
        beginRunPolling(newRunId);
      } catch (err) {
        const rawMsg = err instanceof Error ? err.message : String(err);
        console.error('[UploadClient] runAudit failed:', err);
        patch({
          phase: 'error',
          rawErrorDetail: rawMsg,
          friendlyError: friendlyUploadError(rawMsg),
        });
      }
    },
    [beginRunPolling, canSubmit, dataQuality?.grade, patch, state],
  );

  const runBatchAudit = useCallback(async () => {
    if (!canSubmit || state.batchQueue.length === 0) return;
    patch({ batchRunning: true });
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      patch({ batchRunning: false });
      return;
    }

    const updateItem = (id: string, itemPatch: Partial<BatchItem>) => {
      dispatch({ type: 'updateBatchItem', id, patch: itemPatch });
      batchQueueRef.current = batchQueueRef.current.map((i) => (i.id === id ? { ...i, ...itemPatch } : i));
    };

    const pollItem = async (id: string, rid: string): Promise<void> => {
      let attemptedRecover = false;
      return new Promise((resolve) => {
        const tick = async () => {
          try {
            const res = await fetch(`/api/audit/${rid}/progress`, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const job = await res.json();
            if (job.rowCount > 0) {
              updateItem(id, { progress: job.progressPercent ?? 0 });
            }
            if (job.status === 'complete') {
              updateItem(id, { status: 'complete', statusText: 'Complete', runId: rid });
              return resolve();
            }
            if (job.status === 'failed') {
              if (job.canRecover === true && !attemptedRecover) {
                attemptedRecover = true;
                updateItem(id, { statusText: 'Recovering - finalising audit…' });
                const recoverRes = await fetch(`/api/audit/${rid}/recover`, {
                  method: 'POST',
                  cache: 'no-store',
                });
                const recoverBody = await recoverRes.json().catch(() => ({}));
                if (recoverRes.ok && recoverBody.recovered) {
                  setTimeout(tick, 2000);
                  return;
                }
              }
              updateItem(id, {
                status: 'error',
                statusText: 'Failed',
                error: job.errorMessage ?? 'Processing failed',
              });
              return resolve();
            }
            const processed = job.rowCount > 0 ? Math.round((job.progressPercent / 100) * job.rowCount) : 0;
            updateItem(id, {
              statusText:
                job.status === 'processing'
                  ? job.stalled
                    ? `Still processing in background… ${processed.toLocaleString()} of ${job.rowCount.toLocaleString()} rows`
                    : `Processing ${processed.toLocaleString()} of ${job.rowCount.toLocaleString()} rows`
                  : 'Queued…',
            });
          } catch {
            /* swallow */
          }
          setTimeout(tick, 5000);
        };
        tick();
      });
    };

    const uploadQueuedItem = async (item: BatchItem): Promise<void> => {
      if (item.status !== 'queued') return;
      updateItem(item.id, {
        status: 'uploading',
        statusText: `Uploading ${(item.file.size / 1024 / 1024).toFixed(1)} MB…`,
      });
      try {
        const hash = item.hash ?? (await hashFile(item.file));
        updateItem(item.id, { hash });
        const duplicate = await checkDuplicateFile(hash);
        if (duplicate) {
          updateItem(item.id, {
            status: 'error',
            statusText: 'Duplicate file',
            error: `Already uploaded as ${duplicate.existingLabel ?? duplicate.existingFilename}`,
          });
          return;
        }
        const filePath = `${user.id}/${Date.now()}_${item.file.name}`;
        let uploadedToStorage = false;
        const { error: uploadError } = await supabase.storage
          .from('merchant-csv-uploads-2')
          .upload(filePath, item.file, { contentType: 'text/csv', upsert: false, cacheControl: '3600' });
        if (uploadError) throw new Error(storageUploadErrorMessage(uploadError));
        uploadedToStorage = true;

        const res = await fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath,
            columnMap: state.columnMap,
            label: state.uploadLabel.trim() || undefined,
            dateRangeStart: state.dateRangeStart || undefined,
            dateRangeEnd: state.dateRangeEnd || undefined,
            uploadType: state.uploadType,
            fileHash: hash,
            forceReupload: false,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (uploadedToStorage) {
            await supabase.storage.from('merchant-csv-uploads-2').remove([filePath]).catch(() => {});
          }
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const { runId: newRunId } = await res.json();
        updateItem(item.id, { status: 'processing', statusText: 'Processing…', runId: newRunId });
        track('CSV Uploaded', {
          uploadType: state.uploadType,
          hasLabel: !!state.uploadLabel.trim(),
          hasDateRange: !!(state.dateRangeStart || state.dateRangeEnd),
          dataQualityGrade: dataQuality?.grade ?? null,
        });
        await pollItem(item.id, newRunId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        updateItem(item.id, { status: 'error', statusText: 'Error', error: msg });
      }
    };

    const uploadQueuedItems = async (index: number): Promise<void> => {
      if (index >= batchQueueRef.current.length) return;
      await uploadQueuedItem(batchQueueRef.current[index]!);
      return uploadQueuedItems(index + 1);
    };

    batchQueueRef.current = [...state.batchQueue];
    await uploadQueuedItems(0);
    patch({ batchRunning: false });
  }, [canSubmit, dataQuality?.grade, patch, state]);

  const attemptRecovery = useCallback(async () => {
    const runId = runIdRef.current;
    if (!runId) return;
    patch({
      phase: 'recovering',
      statusText: 'Recovering - finalising your audit…',
      friendlyError: null,
      rawErrorDetail: null,
      uploadWarnings: [],
    });
    try {
      const res = await fetch(`/api/audit/${runId}/recover`, { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.recovered) {
        patch({ phase: 'processing' });
        beginRunPolling(runId);
        return;
      }
      const msg = body.error ?? body.reason ?? 'Recovery failed - please re-upload.';
      patch({
        phase: 'error',
        rawErrorDetail: msg,
        friendlyError: friendlyUploadError(msg),
        canRecover: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      patch({
        phase: 'error',
        rawErrorDetail: msg,
        friendlyError: friendlyUploadError(msg),
        canRecover: false,
      });
    }
  }, [beginRunPolling, patch]);

  const dispatchAction = useCallback((action: UploadClientAction) => {
    dispatch(action);
    if (action.type === 'patch' && action.patch.batchQueue) {
      batchQueueRef.current = action.patch.batchQueue;
    }
    if (action.type === 'updateBatchItem') {
      batchQueueRef.current = batchQueueRef.current.map((i) =>
        i.id === action.id ? { ...i, ...action.patch } : i,
      );
    }
    if (action.type === 'removeBatchItem') {
      batchQueueRef.current = batchQueueRef.current.filter((i) => i.id !== action.id);
    }
  }, []);

  return {
    state,
    dispatch: dispatchAction,
    patch,
    dataQuality,
    requiredUnmapped,
    canSubmit,
    isProcessing,
    stepIndex,
    fileInputRef,
    onDrop,
    onFileInputChange,
    proceedToContext,
    runAudit,
    runBatchAudit,
    attemptRecovery,
    handleFile,
    handleFiles,
    stopPolling,
  };
}
