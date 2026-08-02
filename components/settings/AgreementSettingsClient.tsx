'use client';

import { useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, FileText, Upload } from 'lucide-react';
import { Button, InsetGroup, JoinedSection, Surface } from '@/components/ui';

export type AgreementSummary = {
  id: string;
  agreement_type: string;
  counterparty_name: string | null;
  service_name: string | null;
  document_name: string | null;
  status: string;
  effective_from: string | null;
  effective_to: string | null;
  version_label: string | null;
  created_at: string;
};

type UploadState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'success'; agreementId: string }
  | { status: 'error'; message: string };
type RuleState = { status: 'idle' | 'saving' | 'success' } | { status: 'error'; message: string };

const AGREEMENT_TYPES = [
  ['COURIER', 'Courier'], ['WAREHOUSE_3PL', 'Warehouse / 3PL'],
  ['PAYMENT_PROVIDER', 'Payment provider'], ['INSURANCE', 'Insurance'],
  ['RETURNS_PLATFORM', 'Returns platform'], ['MARKETPLACE', 'Marketplace'],
  ['INTERNAL_POLICY', 'Internal policy'], ['OTHER', 'Other'],
] as const;

function agreementStatus(status: string) {
  if (status === 'active') return 'Active terms';
  if (status === 'archived') return 'Archived';
  return 'Needs verified terms';
}

function Input({ children: _children, ...props }: React.ComponentProps<'input'>) {
  return <input {...props} className="ua-text-body mt-1 block h-9 w-full rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-3 outline-none focus:border-[var(--ua-border-focus)] focus:shadow-[var(--ua-shadow-focus)]" />;
}

export function AgreementSettingsClient({ initialAgreements }: { initialAgreements: AgreementSummary[] }) {
  const [agreements, setAgreements] = useState(initialAgreements);
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });
  const [ruleState, setRuleState] = useState<RuleState>({ status: 'idle' });
  const formRef = useRef<HTMLFormElement>(null);

  async function uploadAgreement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadState({ status: 'saving' });
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/agreements/upload', { method: 'POST', body: formData });
      const body = await response.json().catch(() => ({})) as { error?: string; agreement?: AgreementSummary };
      if (!response.ok || !body.agreement?.id) throw new Error(body.error ?? 'Agreement upload failed.');
      setAgreements((current) => [body.agreement!, ...current.filter((item) => item.id !== body.agreement!.id)]);
      setUploadState({ status: 'success', agreementId: body.agreement.id });
      setRuleState({ status: 'idle' });
      formRef.current?.reset();
    } catch (error) {
      setUploadState({ status: 'error', message: error instanceof Error ? error.message : 'Agreement upload failed.' });
    }
  }

  async function approveTerms(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploadState.status !== 'success') return;
    setRuleState({ status: 'saving' });
    const formData = new FormData(event.currentTarget);
    const deadline = String(formData.get('deadline_days') ?? '').trim();
    try {
      const response = await fetch(`/api/agreements/${uploadState.agreementId}/rules`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule_name: String(formData.get('rule_name') ?? ''), rule_type: String(formData.get('rule_type') ?? ''),
          applies_to_claim_type: String(formData.get('applies_to_claim_type') ?? ''),
          recovery_eligible: String(formData.get('recovery_eligible') ?? ''),
          recovery_route: String(formData.get('recovery_route') ?? ''), reason: String(formData.get('reason') ?? ''),
          deadline_days: deadline ? Number(deadline) : null,
          required_evidence: String(formData.get('required_evidence') ?? '').split(',').map((item) => item.trim()).filter(Boolean), priority: 100,
        }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Agreement terms could not be approved.');
      setRuleState({ status: 'success' });
      setAgreements((current) => current.map((item) => item.id === uploadState.agreementId ? { ...item, status: 'active' } : item));
    } catch (error) {
      setRuleState({ status: 'error', message: error instanceof Error ? error.message : 'Agreement terms could not be approved.' });
    }
  }

  return (
    <Surface structure="working" aria-label="Agreement management">
      <JoinedSection className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="ua-text-working-title">Agreements on file</h2><p className="ua-text-body mt-1 text-[var(--ua-text-secondary)]">Documents are merchant-scoped. A review state means terms are not yet used for recommendations.</p></div>
          <span className="ua-text-metadata">{agreements.length} shown</span>
        </div>
        {agreements.length === 0 ? <InsetGroup className="ua-text-body mt-4 p-3 text-[var(--ua-text-secondary)]">No agreement documents are on file. Upload a source document to begin verification.</InsetGroup> : (
          <ul className="mt-4 divide-y divide-[var(--ua-border-subtle)]">
            {agreements.map((agreement) => <li key={agreement.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0"><p className="font-medium text-[var(--ua-text-primary)]">{agreement.counterparty_name ?? agreement.document_name ?? 'Untitled agreement'}</p><p className="ua-text-caption-role mt-1">{agreement.service_name ?? agreement.agreement_type.replace(/_/g, ' ')}{agreement.version_label ? ` · ${agreement.version_label}` : ''}</p></div>
              <div className="ua-text-metadata text-right"><p className={agreement.status === 'active' ? 'font-medium text-[var(--ua-success)]' : 'font-medium text-[var(--ua-text-secondary)]'}>{agreementStatus(agreement.status)}</p><p className="mt-1 text-[var(--ua-text-tertiary)]">{agreement.effective_from ? `From ${agreement.effective_from}` : 'Effective date not recorded'}</p></div>
            </li>)}
          </ul>
        )}
      </JoinedSection>

      <JoinedSection className="p-4 sm:p-5">
        <div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] text-[var(--ua-accent-600)]"><FileText className="h-4 w-4" aria-hidden /></span><div><h2 className="ua-text-working-title">Upload source document</h2><p className="ua-text-body mt-1 text-[var(--ua-text-secondary)]">PDF only, up to 10 MB. Uploading stores the source document; it does not activate terms.</p></div></div>
        <form ref={formRef} onSubmit={uploadAgreement} className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="ua-text-body font-medium">Agreement type<select name="agreement_type" required defaultValue="COURIER" className="ua-text-body mt-1 block h-9 w-full rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-3">{AGREEMENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="ua-text-body font-medium">Counterparty<Input name="counterparty_name" placeholder="Carrier or provider name" /></label>
            <label className="ua-text-body font-medium">Service<Input name="service_name" placeholder="Service covered" /></label>
            <label className="ua-text-body font-medium">Version<Input name="version_label" placeholder="Agreement version" /></label>
            <label className="ua-text-body font-medium">Effective from<Input name="effective_from" type="date" /></label>
            <label className="ua-text-body font-medium">Effective to<Input name="effective_to" type="date" /></label>
          </div>
          <label className="ua-text-body flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-[var(--ua-radius-control)] border border-dashed border-[var(--ua-border-default)] bg-[var(--ua-surface-secondary)] p-4 text-center"><Upload className="h-5 w-5 text-[var(--ua-icon-secondary)]" aria-hidden /><span className="font-medium">Choose a PDF</span><span className="ua-text-caption-role">Maximum file size: 10 MB</span><input name="file" type="file" required className="sr-only" accept=".pdf,application/pdf" /></label>
          {uploadState.status === 'error' ? <p role="alert" className="ua-text-body text-[var(--ua-risk-critical)]">{uploadState.message}</p> : null}
          {uploadState.status === 'success' ? <p role="status" className="ua-text-body flex items-center gap-2 text-[var(--ua-success)]"><CheckCircle2 className="h-4 w-4" aria-hidden />Document uploaded. Verify terms below before they influence recovery review.</p> : null}
          <Button type="submit" loading={uploadState.status === 'saving'}><Upload className="h-4 w-4" aria-hidden />Upload document</Button>
        </form>
      </JoinedSection>

      {uploadState.status === 'success' ? <JoinedSection className="p-4 sm:p-5">
        <h2 className="ua-text-working-title">Verify a recovery term</h2><p className="ua-text-body mt-1 text-[var(--ua-text-secondary)]">Record only a term you have checked in the uploaded document. Approval is audited and activates this single rule.</p>
        <form onSubmit={approveTerms} className="mt-4 space-y-3">
          <label className="block ua-text-body font-medium">Rule name<Input name="rule_name" required maxLength={160} placeholder="Lost parcel recovery eligibility" /></label>
          <div className="grid gap-3 sm:grid-cols-2"><label className="ua-text-body font-medium">Claim type<select name="applies_to_claim_type" defaultValue="LOST_PARCEL" className="ua-text-body mt-1 block h-9 w-full rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-3"><option value="LOST_PARCEL">Lost parcel</option><option value="ITEM_NOT_RECEIVED">Item not received</option><option value="DELIVERED_NOT_RECEIVED">Delivered not received</option><option value="DAMAGED_ITEM">Damaged item</option><option value="MISSING_ITEM">Missing item</option><option value="WRONG_ITEM">Wrong item</option><option value="DELAYED_DELIVERY">Delayed delivery</option><option value="RETURN_EXCEPTION">Return exception</option><option value="CHARGEBACK">Chargeback</option><option value="ANY">Any claim</option></select></label><label className="ua-text-body font-medium">Rule effect<select name="rule_type" defaultValue="RECOVERY_ELIGIBILITY" className="ua-text-body mt-1 block h-9 w-full rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-3"><option value="RECOVERY_ELIGIBILITY">Recovery eligibility</option><option value="EVIDENCE_REQUIREMENT">Evidence requirement</option><option value="DEADLINE">Deadline</option><option value="LIABILITY_CAP">Liability cap</option><option value="EXCLUSION">Exclusion</option><option value="ESCALATION">Escalation</option></select></label><label className="ua-text-body font-medium">Recovery status<select name="recovery_eligible" defaultValue="eligible" className="ua-text-body mt-1 block h-9 w-full rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-3"><option value="eligible">Eligible</option><option value="not_eligible">Not eligible</option><option value="pending_evidence">Pending evidence</option></select></label></div>
          <div className="grid gap-3 sm:grid-cols-2"><label className="ua-text-body font-medium">Recovery route<Input name="recovery_route" required maxLength={120} placeholder="Carrier claim" /></label><label className="ua-text-body font-medium">Deadline (days)<Input name="deadline_days" type="number" min={1} max={3650} placeholder="30" /></label></div>
          <label className="block ua-text-body font-medium">Required evidence<Input name="required_evidence" placeholder="Tracking scan, invoice" /></label><label className="block ua-text-body font-medium">Verified reason<textarea name="reason" required maxLength={1000} rows={3} className="ua-text-body mt-1 block w-full rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-3 py-2" placeholder="Describe the verified agreement term." /></label>
          {ruleState.status === 'error' ? <p role="alert" className="ua-text-body text-[var(--ua-risk-critical)]">{ruleState.message}</p> : null}{ruleState.status === 'success' ? <p role="status" className="ua-text-body text-[var(--ua-success)]">Verified term approved and active.</p> : null}
          <Button type="submit" loading={ruleState.status === 'saving'} disabled={ruleState.status === 'success'}>Approve verified term</Button>
        </form>
      </JoinedSection> : null}
    </Surface>
  );
}
