'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Check, FileCheck2, Upload } from 'lucide-react';
import { Button, Input, Modal, OperationalState, Select, Textarea } from '@/components/ui';
import { FormField } from '@/components/ui/FormField';
import { formatDateAbsolute } from '@/lib/utils/format';
import styles from '@/components/settings/OperationsSettings.module.css';

export type AgreementSummary = {
  id: string;
  agreement_type: string;
  counterparty_name: string | null;
  service_name: string | null;
  document_name: string | null;
  source_url?: string | null;
  file_mime_type?: string | null;
  file_size_bytes?: number | null;
  status: string;
  effective_from: string | null;
  effective_to: string | null;
  version_label: string | null;
  created_at: string;
};

type UploadState = { status: 'idle' | 'saving' } | { status: 'success'; agreementId: string } | { status: 'error'; message: string };
type RuleState = { status: 'idle' | 'saving' | 'success' } | { status: 'error'; message: string };
type PendingRule = Record<string, string | number | string[] | null>;

const AGREEMENT_TYPES = [['COURIER', 'Carrier'], ['WAREHOUSE_3PL', 'Warehouse'], ['PAYMENT_PROVIDER', 'Payments'], ['INSURANCE', 'Insurer'], ['RETURNS_PLATFORM', 'Returns platform'], ['MARKETPLACE', 'Marketplace'], ['INTERNAL_POLICY', 'Internal policy'], ['OTHER', 'Other']] as const;

function fileSize(value?: number | null) {
  if (value == null) return '— Size unavailable';
  return value < 1_048_576 ? `${Math.max(1, Math.round(value / 1024))} KB` : `${(value / 1_048_576).toFixed(1)} MB`;
}

function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function stateLabel(value: string) {
  if (value === 'active' || value === 'approved') return 'Approved';
  if (value === 'needs_review' || value === 'draft') return 'Awaiting review';
  return humanize(value);
}

function stateTone(value: string) {
  if (value === 'active' || value === 'approved') return 'positive';
  if (value === 'needs_review' || value === 'draft') return 'warning';
  return 'muted';
}

export function AgreementSettingsClient({ initialAgreements }: { initialAgreements: AgreementSummary[] }) {
  const [agreements, setAgreements] = useState(initialAgreements);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' });
  const [rule, setRule] = useState<RuleState>({ status: 'idle' });
  const [pendingRule, setPendingRule] = useState<PendingRule | null>(null);
  const uploadForm = useRef<HTMLFormElement>(null);
  const requestedStatus = searchParams.get('status') ?? 'all';
  const requestedType = searchParams.get('type') ?? 'all';
  const knownStatuses = useMemo(() => new Set(agreements.map((item) => item.status)), [agreements]);
  const knownTypes = useMemo(() => new Set(agreements.map((item) => item.agreement_type)), [agreements]);
  const status = requestedStatus === 'all' || knownStatuses.has(requestedStatus) ? requestedStatus : 'all';
  const type = requestedType === 'all' || knownTypes.has(requestedType) ? requestedType : 'all';
  const filteredAgreements = useMemo(() => agreements.filter((item) => (status === 'all' || item.status === status) && (type === 'all' || item.agreement_type === type)), [agreements, status, type]);
  const requestedSelectedId = searchParams.get('selected');
  const selectedId = filteredAgreements.some((item) => item.id === requestedSelectedId) ? requestedSelectedId : filteredAgreements[0]?.id ?? null;
  const selected = useMemo(() => agreements.find((item) => item.id === selectedId) ?? null, [agreements, selectedId]);

  function updateQuery(updates: Partial<Record<'status' | 'type' | 'selected', string | null>>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || ((key === 'status' || key === 'type') && value === 'all')) next.delete(key);
      else next.set(key, value);
    }
    router.replace(`${pathname}${next.size ? `?${next.toString()}` : ''}`, { scroll: false });
  }

  useEffect(() => { setAgreements(initialAgreements); }, [initialAgreements]);

  async function uploadAgreement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUpload({ status: 'saving' });
    try {
      const response = await fetch('/api/agreements/upload', { method: 'POST', body: new FormData(event.currentTarget) });
      const body = await response.json().catch(() => ({})) as { error?: string; agreement?: AgreementSummary };
      if (!response.ok || !body.agreement?.id) throw new Error(body.error ?? 'Agreement upload failed.');
      const nextAgreement = { ...body.agreement, status: body.agreement.status ?? 'needs_review' };
      setAgreements((current) => [nextAgreement, ...current.filter((item) => item.id !== nextAgreement.id)]);
      updateQuery({ status: null, type: null, selected: nextAgreement.id });
      setUpload({ status: 'success', agreementId: nextAgreement.id });
      setUploadOpen(false);
      setRule({ status: 'idle' });
      uploadForm.current?.reset();
      router.refresh();
    } catch (error) {
      setUpload({ status: 'error', message: error instanceof Error ? error.message : 'Agreement upload failed.' });
    }
  }

  function reviewTerms(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const deadline = String(data.get('deadline_days') ?? '').trim();
    setPendingRule({
      rule_name: String(data.get('rule_name') ?? ''),
      rule_type: String(data.get('rule_type') ?? ''),
      applies_to_claim_type: String(data.get('applies_to_claim_type') ?? ''),
      recovery_eligible: String(data.get('recovery_eligible') ?? ''),
      recovery_route: String(data.get('recovery_route') ?? ''),
      reason: String(data.get('reason') ?? ''),
      deadline_days: deadline ? Number(deadline) : null,
      required_evidence: String(data.get('required_evidence') ?? '').split(',').map((item) => item.trim()).filter(Boolean),
      priority: 100,
    });
  }

  async function approveTerms() {
    if (!selected || !pendingRule) return;
    setRule({ status: 'saving' });
    try {
      const response = await fetch(`/api/agreements/${selected.id}/rules`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pendingRule) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Agreement terms could not be approved.');
      setRule({ status: 'success' });
      setPendingRule(null);
      setAgreements((current) => current.map((item) => item.id === selected.id ? { ...item, status: 'active' } : item));
    } catch (error) {
      setRule({ status: 'error', message: error instanceof Error ? error.message : 'Agreement terms could not be approved.' });
    }
  }

  return (
    <div className={styles.agreementStack} data-operations-surface="agreements" data-overlay-id="agreement-review">
      {upload.status === 'success' ? <p role="status" className={styles.message} data-tone="success">Document uploaded. Review its source facts before approving a term.</p> : null}
      <section className={styles.card}>
        <div className={styles.cardHeading}><div><h2>Stored agreements</h2><p>Recovery terms are read from these documents. A rule cannot claim under an agreement that is not approved.</p></div><Button size="sm" leadingIcon={<Upload size={14} />} onClick={() => { setUpload({ status: 'idle' }); setUploadOpen(true); }}>Upload an agreement</Button></div>
        <div className={styles.agreementToolbar}><Select value={type} aria-label="Filter agreement type" onChange={(event) => updateQuery({ type: event.target.value, selected: null })}><option value="all">Type · all</option>{Array.from(knownTypes).sort().map((value) => <option value={value} key={value}>{humanize(value)}</option>)}</Select><Select value={status} aria-label="Filter agreement state" onChange={(event) => updateQuery({ status: event.target.value, selected: null })}><option value="all">State · all</option>{Array.from(knownStatuses).sort().map((value) => <option value={value} key={value}>{stateLabel(value)}</option>)}</Select><span>{filteredAgreements.length} documents · {agreements.filter((item) => item.status !== 'active' && item.status !== 'approved').length} need attention</span></div>
        {agreements.length === 0 ? <OperationalState kind="empty" title="No agreements on file" description="Upload a PDF source document to begin merchant verification. Uploading never activates extracted terms." action={<Button size="sm" onClick={() => setUploadOpen(true)}>Upload agreement</Button>} /> : filteredAgreements.length === 0 ? <OperationalState kind="filtered-empty" title="No agreements match this scope" description="Clear a filter to review all loaded agreement documents." action={<Button size="sm" variant="secondary" onClick={() => updateQuery({ status: null, type: null, selected: null })}>Clear filters</Button>} /> : <div className={styles.agreementTable} role="table" aria-label="Stored agreements" tabIndex={0}>
          <div role="row" className={styles.agreementHeader}><span role="columnheader">Document</span><span role="columnheader">Version</span><span role="columnheader">Type</span><span role="columnheader">Effective</span><span role="columnheader">Claim window</span><span role="columnheader">Cap</span><span role="columnheader">Evidence</span><span role="columnheader">State</span></div>
          {filteredAgreements.map((agreement) => <button type="button" role="row" key={agreement.id} className={styles.agreementRow} data-selected={agreement.id === selectedId} onClick={() => { updateQuery({ selected: agreement.id }); setRule({ status: 'idle' }); }}><span role="cell" title={agreement.counterparty_name ?? agreement.document_name ?? 'Untitled agreement'}>{agreement.counterparty_name ?? agreement.document_name ?? 'Untitled agreement'}</span><span role="cell">{agreement.version_label ?? '—'}</span><span role="cell">{humanize(agreement.agreement_type)}</span><span role="cell">{agreement.effective_from ? formatDateAbsolute(agreement.effective_from) : '— Not in force'}</span><span role="cell">— Unavailable</span><span role="cell">— Unavailable</span><span role="cell">— Unavailable</span><span role="cell"><em data-tone={stateTone(agreement.status)}>{stateLabel(agreement.status)}</em></span></button>)}
        </div>}
        <p className={styles.tableFootnote}>Unreviewed documents never supply a claim window, cap or evidence requirement. Missing extracted terms are shown as unavailable, not inferred.</p>
      </section>

      {selected ? <>
        <section className={styles.card}>
          <div className={styles.cardHeading}><div><h2>{selected.counterparty_name ?? selected.document_name ?? 'Selected agreement'} {selected.version_label ?? ''}</h2><p>Extracted terms, each traceable to a clause in the uploaded PDF.</p></div>{selected.source_url ? <a href={selected.source_url} target="_blank" rel="noreferrer" className="ua-button ua-button--secondary ua-button--sm">Open the PDF</a> : <span className="ua-text-caption-role text-[var(--uo-route-text-secondary)]">PDF unavailable</span>}</div>
          <div className={styles.agreementDetailGrid}>
            <dl><dt>Document</dt><dd>{selected.document_name ?? '— Not retained'} · {fileSize(selected.file_size_bytes)}</dd><dt>Uploaded</dt><dd>{formatDateAbsolute(selected.created_at)}</dd><dt>Approved</dt><dd>{selected.status === 'active' || selected.status === 'approved' ? `${formatDateAbsolute(selected.effective_from ?? selected.created_at)} · reviewer not retained` : '— Awaiting review'}</dd><dt>Effective period</dt><dd>{selected.effective_from ? formatDateAbsolute(selected.effective_from) : '— Not in force'}{selected.effective_to ? ` – ${formatDateAbsolute(selected.effective_to)}` : ''}</dd></dl>
            <dl><dt>Claim window</dt><dd>— Unavailable</dd><dt>Cap per claim</dt><dd>— Unavailable</dd><dt>Excluded goods</dt><dd>— Unavailable</dd><dt>Evidence required</dt><dd>— Unavailable</dd></dl>
          </div>
          <p className={styles.agreementTruth}>Extracted terms are reviewed by a person before they become claimable. Nothing here is inferred from the document automatically.</p>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeading}><div><h2>Where these terms are used</h2><p>One agreement, several dependent surfaces.</p></div></div>
          <div className={styles.agreementDependencies}><div><strong>Recovery rulebook</strong><p>Approved eligibility and routing terms</p></div><div><strong>Recovery detail</strong><p>Deadline, evidence and cap context</p></div><div><strong>Reports</strong><p>Eligible recovery bounded by approved terms</p></div><div><strong>Work queue</strong><p>Deadline-driven chase tasks</p></div></div>
          <p className={styles.tableFootnote}>Replacing this agreement with a later version does not change claims already submitted under the selected version.</p>
        </section>

        {selected.status !== 'active' && selected.status !== 'approved' ? <section className={styles.card}>
          <div className={styles.cardHeading}><div><h2>Verify one recovery term</h2><p>The source stays visible above. Approval is audited and activates only this rule.</p></div></div>
          <form onSubmit={reviewTerms} className={styles.agreementForm}><FormField label="Rule name"><Input name="rule_name" required maxLength={160} placeholder="Lost parcel recovery eligibility" /></FormField><div className={styles.agreementFormGrid}><FormField label="Claim type"><Select name="applies_to_claim_type" defaultValue="LOST_PARCEL"><option value="LOST_PARCEL">Lost parcel</option><option value="DAMAGED_ITEM">Damaged item</option><option value="ANY">Any claim</option></Select></FormField><FormField label="Rule effect"><Select name="rule_type" defaultValue="RECOVERY_ELIGIBILITY"><option value="RECOVERY_ELIGIBILITY">Recovery eligibility</option><option value="EVIDENCE_REQUIREMENT">Evidence requirement</option><option value="DEADLINE">Deadline</option></Select></FormField><FormField label="Recovery status"><Select name="recovery_eligible" defaultValue="eligible"><option value="eligible">Eligible</option><option value="not_eligible">Not eligible</option><option value="pending_evidence">Pending evidence</option></Select></FormField><FormField label="Deadline days" optional><Input name="deadline_days" type="number" min={1} max={3650} /></FormField></div><FormField label="Recovery route"><Input name="recovery_route" required maxLength={120} placeholder="Carrier claim" /></FormField><FormField label="Required evidence" optional><Input name="required_evidence" placeholder="Tracking scan, invoice" /></FormField><FormField label="Verified reason"><Textarea name="reason" required maxLength={1000} rows={3} placeholder="Describe the exact verified agreement term." /></FormField>{rule.status === 'error' ? <p role="alert" className={styles.message} data-tone="error">{rule.message}</p> : null}{rule.status === 'success' ? <p role="status" className={styles.message} data-tone="success"><Check size={14} aria-hidden="true" /> Verified term approved and active.</p> : null}<div><Button type="submit" variant="commit" disabled={rule.status === 'success'}>Review approval</Button></div></form>
        </section> : null}
      </> : null}

      <Modal open={uploadOpen} onClose={() => upload.status !== 'saving' && setUploadOpen(false)} title="Upload an agreement" description="PDF only, up to 10 MB. Uploading stores a source document but never activates extracted terms." size="md" overlayId="agreement-upload" closeOnBackdrop={upload.status !== 'saving'} closeOnEscape={upload.status !== 'saving'} showCloseButton={upload.status !== 'saving'}>
        <form ref={uploadForm} onSubmit={uploadAgreement} className="grid gap-4"><div className="ua-form-grid"><FormField label="Agreement type"><Select name="agreement_type" required defaultValue="COURIER">{AGREEMENT_TYPES.map(([value, title]) => <option key={value} value={value}>{title}</option>)}</Select></FormField><FormField label="Counterparty"><Input name="counterparty_name" placeholder="Carrier or provider" /></FormField><FormField label="Service"><Input name="service_name" placeholder="Service covered" /></FormField><FormField label="Version"><Input name="version_label" placeholder="Agreement version" /></FormField><FormField label="Effective from"><Input name="effective_from" type="date" /></FormField><FormField label="Effective to" optional><Input name="effective_to" type="date" /></FormField></div><label className="ua-file-drop"><FileCheck2 size={20} aria-hidden="true" /><span><strong>Choose a PDF</strong><small>Source document, maximum 10 MB</small></span><input name="file" type="file" required accept=".pdf,application/pdf" /></label>{upload.status === 'error' ? <p role="alert" className={styles.message} data-tone="error">{upload.message}</p> : null}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={upload.status === 'saving'} onClick={() => setUploadOpen(false)}>Cancel</Button><Button type="submit" loading={upload.status === 'saving'} leadingIcon={<Upload size={15} />}>Upload agreement</Button></div></form>
      </Modal>

      <Modal open={pendingRule != null} onClose={() => rule.status !== 'saving' && setPendingRule(null)} title="Approve verified agreement term?" description="This activates a merchant policy used during future recovery review." size="sm" overlayId="agreement-term-approval" closeOnBackdrop={rule.status !== 'saving'} closeOnEscape={rule.status !== 'saving'} showCloseButton={rule.status !== 'saving'}>{pendingRule ? <div className="grid gap-5"><dl className="grid gap-3"><div><dt className="ua-text-metadata">Source document</dt><dd className="ua-text-body mt-1">{selected?.document_name ?? 'Source PDF unavailable'}</dd></div><div><dt className="ua-text-metadata">Rule</dt><dd className="ua-text-body mt-1">{String(pendingRule.rule_name)}</dd></div><div><dt className="ua-text-metadata">Audit consequence</dt><dd className="ua-text-body mt-1">A new active agreement rule is appended and attributed to this merchant approval.</dd></div></dl><div className="flex justify-end gap-2"><Button variant="secondary" disabled={rule.status === 'saving'} onClick={() => setPendingRule(null)}>Cancel</Button><Button variant="commit" loading={rule.status === 'saving'} onClick={() => void approveTerms()}>Approve term</Button></div></div> : null}</Modal>
    </div>
  );
}
