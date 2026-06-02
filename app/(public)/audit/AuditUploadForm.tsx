'use client';

import { useCallback, useRef, useReducer } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { autoMapHeaders, type AutoMapResult } from '@/lib/csv/headerAliases';
import {
  auditUploadFormReducer,
  createAuditUploadInitialState,
} from '@/app/(public)/audit/auditUploadFormReducer';
import styles from '@/app/(public)/audit/AuditUploadForm.module.css';

const SCHEMA_REQUIRED = [
  'order_id', 'customer_email', 'order_date', 'order_value',
  'is_refund', 'is_inr',
];

const SCHEMA_OPTIONAL = [
  'customer_name', 'shipping_address', 'billing_address', 'customer_phone',
  'ip_address', 'device_fingerprint', 'payment_fingerprint',
  'browser_fingerprint',
];

const MAX_FILE_BYTES = 50 * 1024 * 1024;

function detectCsv(file: File): Promise<{ rowCount: number; columnMap: AutoMapResult }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        preview: 5,
      });
      if (parsed.errors.length > 0) {
        reject(new Error(parsed.errors[0]?.message ?? 'We could not read that CSV.'));
        return;
      }
      const headers = parsed.meta.fields ?? [];
      const columnMap = autoMapHeaders(headers);
      Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        complete: (full) => resolve({ rowCount: full.data.length, columnMap }),
        error: (err: Error) => reject(new Error(err.message)),
      });
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsText(file);
  });
}

export default function AuditUploadForm() {
  const router = useRouter();
  const [state, dispatch] = useReducer(auditUploadFormReducer, undefined, createAuditUploadInitialState);
  const columnMapRef = useRef<AutoMapResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (selected: File) => {
    dispatch({ type: 'patch', patch: { fileError: '', submitError: '', file: null, rowCount: null } });
    columnMapRef.current = null;

    if (!selected.name.toLowerCase().endsWith('.csv')) {
      dispatch({ type: 'patch', patch: { fileError: 'CSV files only. Export your orders as .csv and try again.' } });
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      dispatch({ type: 'patch', patch: { fileError: 'File too large. Maximum 50 MB. Split into smaller exports and try again.' } });
      return;
    }
    try {
      const { rowCount, columnMap } = await detectCsv(selected);
      columnMapRef.current = columnMap;
      dispatch({ type: 'fileDetected', file: selected, rowCount });
    } catch (err) {
      dispatch({
        type: 'patch',
        patch: { fileError: err instanceof Error ? err.message : 'Could not read CSV.' },
      });
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); dispatch({ type: 'patch', patch: { isDragging: true } }); }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); dispatch({ type: 'patch', patch: { isDragging: false } }); }, []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dispatch({ type: 'patch', patch: { isDragging: false } });
    const dropped = e.dataTransfer.files[0];
    if (dropped) processFile(dropped);
  }, [processFile]);

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) processFile(selected);
  }

  function activateDropZone() {
    fileInputRef.current?.click();
  }

  function onDropZoneKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activateDropZone();
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    dispatch({ type: 'patch', patch: { emailError: '', submitError: '' } });
    if (state.fileError === 'Please upload your order export to continue.') {
      dispatch({ type: 'patch', patch: { fileError: '' } });
    }

    let valid = true;
    if (!state.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) {
      dispatch({ type: 'patch', patch: { emailError: 'We need your email to send you the results.' } });
      valid = false;
    }
    if (!state.file) {
      dispatch({ type: 'patch', patch: { fileError: 'Please upload your order export to continue.' } });
      valid = false;
    }
    if (!valid) return;

    dispatch({ type: 'patch', patch: { loading: true } });
    const formData = new FormData();
    formData.append('email', state.email.trim());
    formData.append('file', state.file as File);
    formData.append('columnMap', JSON.stringify(columnMapRef.current ?? {}));

    const response = await fetch('/api/public-audit/submit', { method: 'POST', body: formData });
    const body = await response.json().catch(() => ({}));
    dispatch({ type: 'patch', patch: { loading: false } });

    if (!response.ok) {
      dispatch({ type: 'patch', patch: { submitError: body?.error ?? 'Something went wrong. Try again or email hello@unauth.co' } });
      return;
    }
    const auditId = typeof body?.auditId === 'string' ? body.auditId : null;
    if (!auditId) {
      dispatch({ type: 'patch', patch: { submitError: 'Something went wrong. Try again or email hello@unauth.co' } });
      return;
    }
    router.push(`/audit/submitted?audit=${encodeURIComponent(auditId)}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate className={styles.form}>
      <div className={styles.fieldGroup}>
        <label htmlFor="audit-email" className={styles.label}>
          EMAIL
        </label>
        <input
          id="audit-email"
          type="email"
          value={state.email}
          onChange={(e) => dispatch({ type: 'patch', patch: { email: e.target.value, emailError: '' } })}
          placeholder="your@store.com"
          className={styles.emailInput}
        />
        {state.emailError ? <p className={styles.errorMono}>{state.emailError}</p> : null}
      </div>

      <div className={styles.fieldGroupTight}>
        <label htmlFor="audit-upload-order-export" className={styles.label}>
          ORDER EXPORT
        </label>
        <button
          type="button"
          onClick={activateDropZone}
          onKeyDown={onDropZoneKeyDown}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`${styles.dropZone} ${state.isDragging ? styles.dropZoneDragging : ''}`}
        >
          <input
            id="audit-upload-order-export"
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className={styles.hiddenFileInput}
            onChange={onFileInputChange}
            tabIndex={-1}
            aria-hidden
          />
          {state.file && state.rowCount !== null ? (
            <p className={`${styles.mono} ${styles.hintMono}`} style={{ color: '#1a1814', margin: 0 }}>
              {state.file.name} · {state.rowCount.toLocaleString()} rows detected
            </p>
          ) : state.fileError && state.fileError !== 'Please upload your order export to continue.' ? (
            <p className={styles.errorMono} style={{ margin: 0 }}>{state.fileError}</p>
          ) : (
            <>
              <p className={styles.hintMono}>Drop your CSV here, or click to browse</p>
              <p className={styles.hintMonoSmall}>
                Shopify · WooCommerce · custom OMS · Stripe exports accepted · max 50 MB
              </p>
            </>
          )}
        </button>
        {state.fileError === 'Please upload your order export to continue.' ? (
          <p className={styles.errorSans}>{state.fileError}</p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={state.loading}
        className={styles.submitButton}
      >
        {state.loading ? 'Uploading…' : 'Run free audit →'}
      </button>

      {state.submitError ? <p className={styles.errorSans} style={{ marginTop: '10px' }}>{state.submitError}</p> : null}

      <div style={{ marginTop: '28px' }}>
        <button
          type="button"
          onClick={() => dispatch({ type: 'patch', patch: { schemaOpen: !state.schemaOpen } })}
          className={styles.schemaToggle}
        >
          What fields do we need?
        </button>

        {state.schemaOpen ? (
          <div className={styles.schemaPanel}>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className={styles.schemaHeading}>REQUIRED</p>
                <p className={styles.bodyMono}>{SCHEMA_REQUIRED.join(' · ')}</p>
              </div>
              <div>
                <p className={styles.schemaHeading}>OPTIONAL - ENRICHMENT</p>
                <p className={styles.bodyMono}>{SCHEMA_OPTIONAL.join(' · ')}</p>
              </div>
            </div>
            <p className={styles.bodySans}>
              Don&apos;t have every field? Upload what you have. The engine works with partial data.
            </p>
          </div>
        ) : null}
      </div>
    </form>
  );
}
