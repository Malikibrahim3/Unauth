'use client';

import { useReducer, useRef } from 'react';
import Papa from 'papaparse';
import { t } from './_tokens';
import { autoMapHeaders, REQUIRED_FIELDS, type RequiredField } from '@/lib/csv/headerAliases';

type HashableField =
  | 'customer_email'
  | 'customer_name'
  | 'shipping_address'
  | 'billing_address'
  | 'customer_phone'
  | 'ip_address'
  | 'device_id'
  | 'browser_fingerprint'
  | 'cookie_id'
  | 'account_id'
  | 'card_fingerprint';

const HASHABLE_FIELDS = new Set<HashableField>([
  'customer_email',
  'customer_name',
  'shipping_address',
  'billing_address',
  'customer_phone',
  'ip_address',
  'device_id',
  'browser_fingerprint',
  'cookie_id',
  'account_id',
  'card_fingerprint',
]);

function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

async function sha256Hex(value: string): Promise<string> {
  const buffer = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function hashCsv(file: File): Promise<{
  hashedFile: File;
  rowCount: number;
  columnMap: Partial<Record<RequiredField, string>>;
}> {
  const csvText = await file.text();
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });
  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0]?.message ?? 'We could not read that CSV.');
  }

  const headers = parsed.meta.fields ?? [];
  const { exact, fuzzy } = autoMapHeaders(headers);
  const columnMap = { ...exact, ...fuzzy } as Partial<Record<RequiredField, string>>;
  const missingRequired = REQUIRED_FIELDS.filter((field) => !columnMap[field]);
  if (missingRequired.length > 0) {
    throw new Error(`We could not match required columns: ${missingRequired.join(', ')}`);
  }

  const headerToField = new Map<string, RequiredField>();
  for (const [field, header] of Object.entries(columnMap)) {
    if (header) headerToField.set(header, field as RequiredField);
  }
  const selectedHeaders = headers.filter((header) => headerToField.has(header));
  const salt = crypto.randomUUID();

  const rows = await Promise.all(
    parsed.data.map(async (row) => {
      const nextRow: Record<string, string> = {};
      await Promise.all(
        selectedHeaders.map(async (header) => {
          const field = headerToField.get(header);
          const raw = toCsvValue(row[header]).trim();
          if (field && HASHABLE_FIELDS.has(field as HashableField) && raw) {
            nextRow[header] = await sha256Hex(`${salt}:${field}:${raw.toLowerCase()}`);
          } else {
            nextRow[header] = raw;
          }
        })
      );
      return nextRow;
    })
  );

  const hashedCsv = Papa.unparse(rows, { columns: selectedHeaders });
  return {
    hashedFile: new File([hashedCsv], file.name, { type: 'text/csv' }),
    rowCount: rows.length,
    columnMap,
  };
}

type FormState = {
  email: string;
  file: File | null;
  rowCount: number | null;
  hashedFile: File | null;
  loading: boolean;
  error: string;
};

type FormAction =
  | { type: 'SET_EMAIL'; email: string }
  | { type: 'CLEAR_FILE' }
  | { type: 'FILE_READY'; file: File; rowCount: number; hashedFile: File }
  | { type: 'FILE_ERROR'; error: string }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_END'; error?: string };

const initialState: FormState = {
  email: '',
  file: null,
  rowCount: null,
  hashedFile: null,
  loading: false,
  error: '',
};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_EMAIL':
      return { ...state, email: action.email };
    case 'CLEAR_FILE':
      return { ...state, file: null, rowCount: null, hashedFile: null, error: '' };
    case 'FILE_READY':
      return {
        ...state,
        file: action.file,
        rowCount: action.rowCount,
        hashedFile: action.hashedFile,
        error: '',
      };
    case 'FILE_ERROR':
      return { ...state, file: null, rowCount: null, hashedFile: null, error: action.error };
    case 'SUBMIT_START':
      return { ...state, loading: true, error: '' };
    case 'SUBMIT_END':
      return { ...state, loading: false, error: action.error ?? '' };
    default:
      return state;
  }
}

export default function PublicAuditForm() {
  const [state, dispatch] = useReducer(formReducer, initialState);
  const columnMapRef = useRef<Partial<Record<RequiredField, string>>>({});

  async function onFileSelect(nextFile: File | null) {
    dispatch({ type: 'CLEAR_FILE' });
    columnMapRef.current = {};
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith('.csv')) {
      dispatch({ type: 'FILE_ERROR', error: 'Please upload a CSV file.' });
      return;
    }
    try {
      const hashed = await hashCsv(nextFile);
      columnMapRef.current = hashed.columnMap;
      dispatch({
        type: 'FILE_READY',
        file: nextFile,
        rowCount: hashed.rowCount,
        hashedFile: hashed.hashedFile,
      });
    } catch (err) {
      dispatch({
        type: 'FILE_ERROR',
        error: err instanceof Error ? err.message : 'Could not prepare CSV.',
      });
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!state.hashedFile) return;
    dispatch({ type: 'SUBMIT_START' });
    const formData = new FormData();
    formData.append('email', state.email.trim());
    formData.append('file', state.hashedFile);
    formData.append('columnMap', JSON.stringify(columnMapRef.current));

    const response = await fetch('/api/public-audit/submit', {
      method: 'POST',
      body: formData,
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      dispatch({
        type: 'SUBMIT_END',
        error: typeof body?.error === 'string' ? body.error : 'Could not submit audit.',
      });
      return;
    }
    const auditId = typeof body?.auditId === 'string' ? body.auditId : null;
    if (!auditId) {
      dispatch({ type: 'SUBMIT_END', error: 'Audit submission failed.' });
      return;
    }
    window.location.href = `/audit/${auditId}/submitted`;
  }

  return (
    <form onSubmit={onSubmit}>
      <div style={{ display: 'grid', gap: '10px' }}>
        <input
          type="email"
          required
          aria-label="Email address"
          value={state.email}
          onChange={(event) => dispatch({ type: 'SET_EMAIL', email: event.target.value })}
          placeholder="your@store.com"
          style={{
            width: '100%',
            background: t.bg,
            border: `1px solid ${t.border}`,
            color: t.ink,
            padding: '12px 14px',
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: '14px',
          }}
        />

        <label
          style={{
            display: 'block',
            border: `1px dashed ${t.darkBorder2}`,
            background: t.darkBg,
            padding: '16px',
            cursor: 'pointer',
          }}
        >
          <input
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={(event) => onFileSelect(event.target.files?.[0] ?? null)}
          />
          <p style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '14px', margin: 0 }}>
            Drag and drop your CSV or click to choose
          </p>
          <p style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '12px', color: t.inkTertiary, marginTop: '6px', marginBottom: 0 }}>
            .csv only
          </p>
          {state.file ? (
            <p style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '12px', color: t.darkMuted, marginTop: '10px', marginBottom: 0 }}>
              {state.file.name} · {state.rowCount !== null ? `${state.rowCount.toLocaleString()} rows` : 'preparing…'}
            </p>
          ) : null}
        </label>

        <button
          type="submit"
          disabled={state.loading || !state.hashedFile}
          className="ua-landing-public-audit-submit"
        >
          {state.loading ? 'Starting audit…' : 'Run free audit →'}
        </button>
      </div>

      {state.error ? (
        <p style={{ color: t.errorFg, fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '13px', marginTop: '10px', marginBottom: 0 }}>
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
