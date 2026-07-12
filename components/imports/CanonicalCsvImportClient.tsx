'use client';

import { useMemo, useState } from 'react';

const DATASETS = ['orders', 'refunds', 'customers'] as const;
type Dataset = (typeof DATASETS)[number];

const CANONICAL_FIELDS: Record<Dataset, string[]> = {
  orders: ['external_id', 'order_number', 'currency', 'total_minor', 'financial_status', 'fulfillment_status', 'customer_email'],
  refunds: ['external_id', 'order_external_id', 'amount_minor', 'currency', 'reason'],
  customers: ['external_id', 'email', 'name', 'phone'],
};

type ValidateResponse = {
  total_rows: number;
  valid_count: number;
  error_count: number;
  duplicates_skipped: number;
  errors: Array<{ row: number; field: string; code: string; message: string }>;
};

function parseHeaders(csv: string): string[] {
  const firstLine = csv.split(/\r?\n/)[0] ?? '';
  return firstLine.split(',').map((h) => h.trim()).filter(Boolean);
}

export function CanonicalCsvImportClient() {
  const [dataset, setDataset] = useState<Dataset>('orders');
  const [csv, setCsv] = useState('');
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ValidateResponse | null>(null);
  const [committed, setCommitted] = useState<{ job_id: string; persisted: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = useMemo(() => parseHeaders(csv), [csv]);

  async function post(path: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dataset, mapping, csv }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.message ?? json.error ?? 'Request failed'); return null; }
      return json;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium">
        Dataset
        <select
          className="mt-1 block rounded border px-2 py-1"
          value={dataset}
          onChange={(e) => { setDataset(e.target.value as Dataset); setMapping({}); setResult(null); setCommitted(null); }}
        >
          {DATASETS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </label>

      <label className="block text-sm font-medium">
        CSV
        <textarea
          className="mt-1 block h-40 w-full rounded border p-2 font-mono text-xs"
          placeholder="external_id,currency,total_minor&#10;ORDER-1,GBP,8400"
          value={csv}
          onChange={(e) => { setCsv(e.target.value); setResult(null); setCommitted(null); }}
        />
      </label>

      {headers.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium">Map columns</p>
          {headers.map((h) => (
            <div key={h} className="flex items-center gap-2 text-sm">
              <span className="w-40 truncate font-mono">{h}</span>
              <span>→</span>
              <select
                className="rounded border px-2 py-1"
                value={mapping[h] ?? ''}
                onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value }))}
              >
                <option value="">(ignore)</option>
                {CANONICAL_FIELDS[dataset].map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || !csv}
          className="rounded bg-secondary px-3 py-1.5 text-sm disabled:opacity-50"
          onClick={async () => { const r = await post('/api/imports/csv/validate'); if (r) setResult(r); }}
        >
          Validate
        </button>
        <button
          type="button"
          disabled={busy || !result || result.valid_count === 0}
          className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          onClick={async () => {
            const res = await fetch('/api/imports/csv/commit', {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ dataset, mapping, csv }),
            });
            const json = await res.json();
            if (res.ok) setCommitted(json); else setError(json.message ?? json.error ?? 'Import failed');
          }}
        >
          Import valid rows
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && (
        <div className="rounded border p-3 text-sm">
          <p>{result.valid_count} valid · {result.error_count} errors · {result.duplicates_skipped} duplicates skipped · {result.total_rows} rows</p>
          {result.errors.length > 0 && (
            <ul className="mt-2 max-h-40 space-y-0.5 overflow-auto text-xs text-destructive">
              {result.errors.map((e, i) => <li key={i}>Row {e.row}: {e.field} — {e.message}</li>)}
            </ul>
          )}
        </div>
      )}

      {committed && (
        <p className="text-sm font-medium text-primary">Imported {committed.persisted} record(s). Job {committed.job_id}.</p>
      )}
    </div>
  );
}
