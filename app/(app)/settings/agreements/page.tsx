'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, FileText, Upload } from 'lucide-react';
import { SettingsPageShell } from '@/components/ui';

type UploadState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'success'; agreementId: string; jobId: string }
  | { status: 'error'; message: string };

type RuleState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'success' }
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
  const [ruleState, setRuleState] = useState<RuleState>({ status: 'idle' });
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
      setRuleState({ status: 'idle' });
      formRef.current?.reset();
    } catch (error) {
      setUploadState({ status: 'error', message: error instanceof Error ? error.message : 'Agreement upload failed.' });
    }
  }

  async function handleRuleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploadState.status !== 'success') return;
    setRuleState({ status: 'saving' });
    const formData = new FormData(event.currentTarget);
    const deadline = String(formData.get('deadline_days') ?? '').trim();
    const requiredEvidence = String(formData.get('required_evidence') ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    try {
      const response = await fetch(`/api/agreements/${uploadState.agreementId}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule_name: String(formData.get('rule_name') ?? ''),
          rule_type: String(formData.get('rule_type') ?? ''),
          applies_to_claim_type: String(formData.get('applies_to_claim_type') ?? ''),
          recovery_eligible: String(formData.get('recovery_eligible') ?? ''),
          recovery_route: String(formData.get('recovery_route') ?? ''),
          reason: String(formData.get('reason') ?? ''),
          deadline_days: deadline ? Number(deadline) : null,
          required_evidence: requiredEvidence,
          priority: 100,
        }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Agreement rule approval failed.');
      setRuleState({ status: 'success' });
    } catch (error) {
      setRuleState({ status: 'error', message: error instanceof Error ? error.message : 'Agreement rule approval failed.' });
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
                Upload the source PDF, then enter the terms you have verified.
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
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Choose PDF (10 MB max)</span>
            <input name="file" type="file" required className="sr-only" accept=".pdf,application/pdf" />
          </label>

          {uploadState.status === 'error' ? (
            <p className="rounded-[var(--radius-sm)] border px-3 py-2 text-sm" style={{ borderColor: 'var(--risk-critical-bd)', color: 'var(--risk-critical)' }}>
              {uploadState.message}
            </p>
          ) : null}
          {uploadState.status === 'success' ? (
            <p className="flex items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2 text-sm" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Agreement uploaded. Enter its verified terms to activate it.
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

        <section className="rounded-[var(--radius-sm)] border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Verified terms</h2>
          {uploadState.status !== 'success' ? (
            <div className="mt-4 space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <p>Upload a PDF first. Unapproved documents never affect claim decisions.</p>
              <p>After upload, enter the recovery rule exactly as it appears in the agreement.</p>
            </div>
          ) : (
            <form onSubmit={handleRuleSubmit} className="mt-4 space-y-4">
              <label className="block space-y-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Rule name
                <input name="rule_name" required maxLength={160} className="w-full rounded-[var(--radius-sm)] border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-canvas)' }} placeholder="Lost parcel recovery eligibility" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Claim type
                  <select name="applies_to_claim_type" className="w-full rounded-[var(--radius-sm)] border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-canvas)' }} defaultValue="LOST_PARCEL">
                    <option value="LOST_PARCEL">Lost parcel</option>
                    <option value="ITEM_NOT_RECEIVED">Item not received</option>
                    <option value="DELIVERED_NOT_RECEIVED">Delivered not received</option>
                    <option value="DAMAGED_ITEM">Damaged item</option>
                    <option value="MISSING_ITEM">Missing item</option>
                    <option value="WRONG_ITEM">Wrong item</option>
                    <option value="DELAYED_DELIVERY">Delayed delivery</option>
                    <option value="RETURN_EXCEPTION">Return exception</option>
                    <option value="CHARGEBACK">Chargeback</option>
                    <option value="ANY">Any claim</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Rule effect
                  <select name="rule_type" className="w-full rounded-[var(--radius-sm)] border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-canvas)' }} defaultValue="RECOVERY_ELIGIBILITY">
                    <option value="RECOVERY_ELIGIBILITY">Recovery eligibility</option>
                    <option value="EVIDENCE_REQUIREMENT">Evidence requirement</option>
                    <option value="DEADLINE">Deadline</option>
                    <option value="LIABILITY_CAP">Liability cap</option>
                    <option value="EXCLUSION">Exclusion</option>
                    <option value="ESCALATION">Escalation</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Recovery status
                  <select name="recovery_eligible" className="w-full rounded-[var(--radius-sm)] border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-canvas)' }} defaultValue="eligible">
                    <option value="eligible">Eligible</option>
                    <option value="not_eligible">Not eligible</option>
                    <option value="pending_evidence">Pending evidence</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Claim deadline (days)
                  <input name="deadline_days" type="number" min={1} max={3650} className="w-full rounded-[var(--radius-sm)] border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-canvas)' }} placeholder="30" />
                </label>
              </div>
              <label className="block space-y-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Recovery route
                <input name="recovery_route" required maxLength={120} className="w-full rounded-[var(--radius-sm)] border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-canvas)' }} placeholder="CARRIER_CLAIM" />
              </label>
              <label className="block space-y-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Required evidence (comma separated)
                <input name="required_evidence" className="w-full rounded-[var(--radius-sm)] border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-canvas)' }} placeholder="tracking scan, invoice, proof of value" />
              </label>
              <label className="block space-y-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Decision reason
                <textarea name="reason" required maxLength={1000} rows={3} className="w-full rounded-[var(--radius-sm)] border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-canvas)' }} placeholder="Describe the verified agreement term." />
              </label>
              {ruleState.status === 'error' ? <p className="text-sm" style={{ color: 'var(--risk-critical)' }}>{ruleState.message}</p> : null}
              {ruleState.status === 'success' ? <p className="text-sm" style={{ color: 'var(--success)' }}>Agreement rule approved and active.</p> : null}
              <button type="submit" disabled={ruleState.status === 'saving' || ruleState.status === 'success'} className="rounded-[var(--radius-sm)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ background: 'var(--accent)' }}>
                {ruleState.status === 'saving' ? 'Activating...' : 'Approve and activate'}
              </button>
            </form>
          )}
        </section>
      </div>
    </SettingsPageShell>
  );
}
