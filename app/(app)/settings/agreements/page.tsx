'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, FileText, Upload } from 'lucide-react';
import { SettingsPageShell } from '@/components/ui';

type UploadState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'success'; agreementId: string; jobId: string }
  | { status: 'error'; message: string };

const agreementTypes = [
  ['COURIER', 'Courier'],
  ['WAREHOUSE_3PL', 'Warehouse / 3PL'],
  ['PAYMENT_PROVIDER', 'Payment provider'],
  ['INSURANCE', 'Insurance'],
  ['RETURNS_PLATFORM', 'Returns platform'],
  ['MARKETPLACE', 'Marketplace'],
  ['INTERNAL_POLICY', 'Internal policy'],
  ['OTHER', 'Other'],
] as const;

export default function AgreementSettingsPage() {
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadState({ status: 'saving' });
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/agreements/upload', {
        method: 'POST',
        body: formData,
      });
      const body = await response.json().catch(() => ({})) as {
        error?: string;
        agreement?: { id?: string };
        document_upload_job?: { id?: string };
      };
      if (!response.ok) throw new Error(body.error ?? 'Agreement upload failed.');
      setUploadState({
        status: 'success',
        agreementId: body.agreement?.id ?? '',
        jobId: body.document_upload_job?.id ?? '',
      });
      formRef.current?.reset();
    } catch (error) {
      setUploadState({ status: 'error', message: error instanceof Error ? error.message : 'Agreement upload failed.' });
    }
  }

  return (
    <SettingsPageShell
      title="Agreements"
      subtitle="Upload courier, 3PL, payment, and policy documents that define recoverability rules."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,680px)_minmax(280px,1fr)]">
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="space-y-5 rounded-[var(--radius-sm)] border p-5"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <div className="flex items-center gap-3">
            <span
              className="grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] border"
              style={{ borderColor: 'var(--border)', color: 'var(--accent)' }}
            >
              <FileText className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Upload agreement</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Extracted clauses and rules stay in review until approved.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Agreement type
              <select
                name="agreement_type"
                required
                className="w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-canvas)' }}
                defaultValue="COURIER"
              >
                {agreementTypes.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Counterparty
              <input
                name="counterparty_name"
                className="w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-canvas)' }}
                placeholder="DHL, ShipBob, Stripe"
              />
            </label>
            <label className="space-y-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Service
              <input
                name="service_name"
                className="w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-canvas)' }}
                placeholder="Express, pick-pack, dispute handling"
              />
            </label>
            <label className="space-y-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Version
              <input
                name="version_label"
                className="w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-canvas)' }}
                placeholder="2026 master services agreement"
              />
            </label>
            <label className="space-y-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Effective from
              <input
                name="effective_from"
                type="date"
                className="w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-canvas)' }}
              />
            </label>
            <label className="space-y-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Effective to
              <input
                name="effective_to"
                type="date"
                className="w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-canvas)' }}
              />
            </label>
          </div>

          <label
            className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-[var(--radius-sm)] border border-dashed p-6 text-center"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-canvas)', color: 'var(--text-secondary)' }}
          >
            <Upload className="h-6 w-6" aria-hidden />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Choose PDF, DOCX, or text file</span>
            <input name="file" type="file" required className="sr-only" accept=".pdf,.doc,.docx,.txt,.md,application/pdf,text/plain" />
          </label>

          {uploadState.status === 'error' ? (
            <p className="rounded-[var(--radius-sm)] border px-3 py-2 text-sm" style={{ borderColor: 'var(--risk-critical-bd)', color: 'var(--risk-critical)' }}>
              {uploadState.message}
            </p>
          ) : null}
          {uploadState.status === 'success' ? (
            <p className="flex items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2 text-sm" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Agreement uploaded and queued for extraction.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={uploadState.status === 'saving'}
            className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: 'var(--accent)' }}
          >
            <Upload className="h-4 w-4" aria-hidden />
            {uploadState.status === 'saving' ? 'Uploading...' : 'Upload agreement'}
          </button>
        </form>

        <section
          className="rounded-[var(--radius-sm)] border p-5"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Rule activation</h2>
          <div className="mt-4 space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <p>Uploaded agreements create a queued document job.</p>
            <p>Extracted clauses can generate draft agreement rules with clause provenance.</p>
            <p>Only active agreement rules are evaluated by the claim gate.</p>
          </div>
        </section>
      </div>
    </SettingsPageShell>
  );
}
