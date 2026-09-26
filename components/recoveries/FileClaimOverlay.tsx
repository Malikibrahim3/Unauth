'use client';

import { useCallback, useRef, useState } from 'react';
import { toMinorUnits } from '@/lib/canonical/money';
import { claimNarrative } from '@/lib/recoveries/claimNarrative';
import { useOverlayPresence } from '@/lib/design/useOverlayPresence';
import { OverlayPortal } from '@/components/ui/OverlayPortal';
import { useRouter } from 'next/navigation';
import type { CaseEvidenceFile, CaseEvidenceRecord } from '@/lib/claims/caseEvidenceFile';
import { hashId } from '@/lib/ui/displayRef';
import { formatDayMonthInTimeZone, formatMinorCurrencyNullable } from '@/lib/utils/format';

const ink = '#1c1f23';
const body = '#40454a';
const muted = '#64686d';
const faint = '#64686d';
const grouped = '#f4f3f1';
const line = '#eae8e5';
const red = '#b0431a';
const green = '#1a7f4b';
const amberText = '#7a5310';
const sans = "'Inter',sans-serif";
const mono = "'IBM Plex Mono',monospace";
const panelShadow = '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)';

function human(value: string | null | undefined, fallback = 'Unavailable') {
  if (!value?.trim()) return fallback;
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function money(value: number | null | undefined, currency: string | null | undefined) {
  return value == null || !currency ? 'unavailable' : formatMinorCurrencyNullable(value, currency);
}

function compactDate(value: string | null | undefined) {
  if (!value) return 'unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatDayMonthInTimeZone(date, 'UTC');
}

function daysRemaining(value: string | null | undefined) {
  if (!value) return null;
  const end = Date.parse(value);
  if (!Number.isFinite(end)) return null;
  return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
}

function evidenceMatching(file: CaseEvidenceFile, matcher: RegExp): CaseEvidenceRecord | null {
  return file.evidence.find((entry) => entry.allowedInProviderPack && entry.factKind === 'source_fact' && matcher.test(`${entry.evidenceType} ${entry.title} ${entry.summary}`)) ?? null;
}

function Check({ present }: { present: boolean }) {
  return present ? (
    <span style={{ width: 14, height: 14, flex: 'none', borderRadius: 4, marginTop: 1, background: ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 5.2 4.1 7.3 8 3.2"/></svg>
    </span>
  ) : <span style={{ width: 14, height: 14, flex: 'none', borderRadius: 4, marginTop: 1, boxShadow: 'inset 0 0 0 1.3px rgba(28,27,25,.18)' }}/>;
}

function EvidenceRequirement({ title, detail, present }: { title: string; detail: string; present: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
      <Check present={present}/>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', font: `400 12px/1.45 ${sans}`, color: ink }}>{title}</span>
        <span style={{ display: 'block', font: `400 11px/1.45 ${sans}`, color: muted, marginTop: 2 }}>{detail}</span>
      </span>
    </div>
  );
}

function SummaryRow({ label, value, tone = ink }: { label: string; value: string; tone?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
      <span style={{ flex: 1, font: `400 12px/1.5 ${sans}`, color: '#64686d' }}>{label}</span>
      <span style={{ font: `400 12px/1.5 ${mono}`, color: tone, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function actionButton(primary = false, disabled = false): React.CSSProperties {
  return {
    padding: '7px 13px',
    border: 0,
    borderRadius: 9,
    background: primary ? ink : '#ffffff',
    boxShadow: primary ? undefined : 'inset 0 0 0 1px rgba(28,27,25,.11)',
    color: primary ? '#ffffff' : body,
    font: `${primary ? 500 : 400} 12.5px/1 ${sans}`,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? .45 : 1,
  };
}

export function FileClaimOverlay({ file, canManage }: { file: CaseEvidenceFile; canManage: boolean }) {
  const router = useRouter();
  const recovery = file.recoveryCase;
  const provider = recovery?.partner?.name ?? human(recovery?.owner_type, 'provider');
  const currency = recovery?.currency ?? file.claim.currency;
  const orderValue = file.claim.amountAtRiskMinor;
  const eligible = recovery?.eligible_loss_amount != null && Number.isFinite(recovery.eligible_loss_amount) && recovery.eligible_loss_amount >= 0 && recovery.currency ? toMinorUnits(recovery.eligible_loss_amount, recovery.currency) : null;
  const ceiling = recovery?.amount_sought_minor ?? null;
  const tracking = evidenceMatching(file, /tracking|transit|carrier acceptance|dispatch/i);
  const invoice = evidenceMatching(file, /invoice|proof.of.value|order.line|order created/i);
  const customerStatement = evidenceMatching(file, /customer.statement|customer message|support.ticket|helpdesk/i);
  const packagingPhoto = evidenceMatching(file, /packaging.photo|pack.photo/i);
  const lastTransit = file.custodyChain.find((entry) => entry.id === 'courier_transit');
  const remaining = daysRemaining(recovery?.deadline_at);
  const ruleDays = file.partnerRule?.deadline_days;
  const caseRef = `CASE-${hashId(file.claim.id).replace('#', '')}`;
  const attached = [invoice, tracking, customerStatement, packagingPhoto].filter(Boolean).length;
  const defaultNarrative = claimNarrative(file);
  const [narrative, setNarrative] = useState('');
  const [busy, setBusy] = useState<'draft' | 'final' | null>(null);
  const [attempted, setAttempted] = useState<false | 'draft' | 'final'>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const draftKey = useRef(globalThis.crypto?.randomUUID?.() ?? `draft-${Date.now()}`);
  const finalKey = useRef(globalThis.crypto?.randomUUID?.() ?? `final-${Date.now()}`);
  const readiness = file.providerClaimReadiness.readiness === 'ready_to_submit';

  const inFlight = useRef(false);
  const close = useCallback(() => { if (!inFlight.current) router.push('/financials/recovery'); }, [router]);
  const { containerRef } = useOverlayPresence({ open: true, onClose: close, trapFocus: true, restoreFocus: true, lockBodyScroll: true, closeOnEscape: busy == null });

  async function createPack(finalize: boolean) {
    if (!recovery || !canManage || inFlight.current || (finalize && !readiness)) return;
    inFlight.current = true;
    setAttempted(finalize ? 'final' : 'draft');
    setBusy(finalize ? 'final' : 'draft');
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/recoveries/${encodeURIComponent(recovery.id)}/claim-packs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': finalize ? finalKey.current : draftKey.current,
        },
        body: JSON.stringify({ finalize, notes: narrative.trim() || null }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? 'The claim pack could not be prepared.');
      setAttempted(false);
      setMessage(finalize
        ? `Claim pack finalised. Unauth did not submit it to ${provider}; a person must send it and record the provider receipt.`
        : 'Draft claim pack saved with its source manifest and hashes.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The claim pack could not be prepared.');
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }

  const submitDisabled = !canManage || !recovery || !readiness || busy != null || attempted === 'draft';
  const draftDisabled = !canManage || !recovery || busy != null || attempted === 'final';
  const filingCopy = remaining == null
    ? 'The filing deadline is unavailable. Provider terms must be confirmed before this claim can be sent.'
    : `The filing window closes in ${remaining} ${remaining === 1 ? 'day' : 'days'}. ${ruleDays == null ? 'The captured filing period is unavailable.' : `Captured filing period: ${ruleDays} days.`} Preparation does not establish provider eligibility or payment.`;
  const trackingRef = tracking?.sourceRecordId ?? file.itemParcelMatrix.find((entry) => entry.parcelId)?.parcelId ?? 'unavailable';

  return (
    <OverlayPortal><div data-screen-label="File a claim" role="presentation" style={{ pointerEvents: 'auto', position: 'fixed', zIndex: 80, inset: 0, background: 'rgba(34,29,23,.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div ref={containerRef as React.RefObject<HTMLDivElement>} tabIndex={-1} aria-busy={busy != null} role="dialog" aria-modal="true" aria-labelledby="file-claim-title" style={{ width: 700, maxHeight: '100%', background: '#ffffff', borderRadius: 14, boxShadow: '0 30px 70px rgba(28,22,14,.34),0 2px 8px rgba(28,22,14,.18)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '17px 18px 15px', borderBottom: `1px solid ${line}`, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div id="file-claim-title" style={{ font: `500 15px/1.3 ${sans}`, color: ink }}>File a claim · {caseRef} · {provider}</div>
            <div style={{ font: `400 12px/1.5 ${sans}`, color: '#64686d', marginTop: 4 }}>{filingCopy}</div>
          </div>
          <button type="button" aria-label="Close file claim" disabled={busy != null} onClick={close} style={{ flex: 'none', marginTop: 0, border: 0, padding: 9, background: 'transparent', cursor: 'pointer' }}>
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="#64686d" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M2.6 2.6 9.4 9.4M9.4 2.6 2.6 9.4"/></svg>
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>
          <div style={{ background: grouped, borderRadius: 12, padding: 11, display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '1px 3px 0' }}>
              <span style={{ flex: 1, font: `600 10px/1 ${sans}`, letterSpacing: '.09em', color: '#64686d' }}>REQUESTED RECOVERY</span>
              <span style={{ font: `400 9.5px/1 ${mono}`, color: faint }}>{file.partnerRule?.liability_cap_basis === 'declared_value' ? 'declared value was set before this claim' : 'review the captured terms and claim gates'}</span>
            </div>
            <div style={{ background: '#ffffff', borderRadius: 10, boxShadow: panelShadow, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SummaryRow label="Case exposure" value={money(orderValue, file.claim.currency)}/>
              <SummaryRow label="Requested recovery" value={money(ceiling, currency)} tone={ceiling == null ? faint : amberText}/>
              <SummaryRow label="Recorded eligible ceiling" value={money(eligible, recovery?.currency)} tone={faint}/>
              
              <SummaryRow label="Carrier" value={`${provider} · ${recovery?.partner?.external_reference ?? 'account unavailable'}`}/>
              <SummaryRow label="Tracking source record" value={trackingRef}/>
              <SummaryRow label="Last scan" value={lastTransit?.occurredAt ? `${compactDate(lastTransit.occurredAt)} · ${lastTransit.summary}` : 'unavailable'} tone={lastTransit ? red : faint}/>
              <div style={{ font: `400 11px/1.5 ${sans}`, color: muted, borderTop: '1px solid #f4f2ef', paddingTop: 8 }}>Requested recovery is not a confirmed ceiling, provider approval or received credit. <a href={recovery ? `/financials/recovery/${recovery.id}` : `/cases/${file.claim.id}`}>Review recovery record</a></div>
            </div>
          </div>

          <div style={{ background: grouped, borderRadius: 12, padding: 11, display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '1px 3px 0' }}>
              <span style={{ flex: 1, font: `600 10px/1 ${sans}`, letterSpacing: '.09em', color: '#64686d' }}>ATTACHED SOURCE COVERAGE</span>
              <span style={{ font: `400 9.5px/1 ${mono}`, color: faint }}>{attached} of 4 already attached</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <EvidenceRequirement title="Commercial invoice" present={Boolean(invoice)} detail={invoice ? `${invoice.title} · ${sourceLabel(invoice.system)}` : 'No permitted value source is attached'}/>
              <EvidenceRequirement title="Tracking history" present={Boolean(tracking)} detail={tracking ? `${tracking.summary} · ${sourceLabel(tracking.system)}` : 'No carrier tracking source is attached'}/>
              <EvidenceRequirement title="Customer statement" present={Boolean(customerStatement)} detail={customerStatement ? `${customerStatement.title} · ${compactDate(customerStatement.eventAt ?? customerStatement.sourceCreatedAt)}` : 'No customer or helpdesk statement is attached'}/>
              <EvidenceRequirement title="Photo of packaging" present={Boolean(packagingPhoto)} detail={packagingPhoto ? `${packagingPhoto.title} · ${sourceLabel(packagingPhoto.system)}` : 'Not attached or not applicable'}/>
            </div>
          </div>

          <div style={{ background: grouped, borderRadius: 12, padding: 11, display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '1px 3px 0' }}>
              <span style={{ flex: 1, font: `600 10px/1 ${sans}`, letterSpacing: '.09em', color: '#64686d' }}>CLAIM DRAFT</span>
              <span style={{ font: `400 9.5px/1 ${mono}`, color: faint }}>Source facts and missing inputs; manual handoff only</span>
            </div>
            <div style={{ background: '#ffffff', borderRadius: 10, boxShadow: panelShadow, padding: '12px 13px' }}>
              <p style={{ whiteSpace: 'pre-wrap', marginTop: 0, font: `400 11.5px/1.7 ${sans}` }}>{defaultNarrative}</p>
              <label htmlFor="claim-notes" style={{ font: `400 11.5px/1.6 ${sans}` }}>Merchant notes — not independently verified</label>
              <textarea id="claim-notes" maxLength={2000} disabled={busy != null || Boolean(attempted)} aria-label="Merchant notes" value={narrative} onChange={(event) => { setNarrative(event.target.value); draftKey.current = crypto.randomUUID(); finalKey.current = crypto.randomUUID(); }} rows={5} style={{ display: 'block', width: '100%', resize: 'vertical', padding: 0, border: 0, outline: 0, background: '#ffffff', font: `400 11.5px/1.7 ${mono}`, color: body }}/>
            </div>
          </div>
          <ul aria-label="Missing claim inputs" style={{ margin: 0, paddingLeft: 18, font: `400 11.5px/1.6 ${sans}`, color: body }}>{file.providerClaimReadiness.gates.filter((gate) => !['met', 'not_applicable'].includes(gate.state)).map((gate) => <li key={gate.id}>{gate.headline} · {gate.state}: {gate.nextAction}</li>)}</ul>
          <a style={{ font: `400 11.5px/1.6 ${sans}`, color: '#9b470d' }} href={`/cases/${file.claim.id}`}>Review case evidence and resolve missing inputs</a>
          {message ? <div role="status" style={{ font: `400 11px/1.5 ${sans}`, color: green }}>{message}</div> : null}
          {attempted && !busy ? <p>Notes are held for a retry of this same preparation attempt. Review the recovery record before starting another pack.</p> : null}
          {error ? <div role="alert" style={{ font: `400 11px/1.5 ${sans}`, color: red }}>{error}</div> : null}
        </div>
        <div style={{ padding: '13px 18px', borderTop: `1px solid ${line}`, display: 'flex', alignItems: 'center', gap: 10, background: '#ffffff' }}>
          <span style={{ flex: 1, minWidth: 0, font: `400 10.5px/1.45 ${mono}`, color: faint }}>{readiness ? `${human(file.partnerRule?.submission_method, 'manual')} handoff · Unauth prepares the pack, a person sends it` : `${file.providerClaimReadiness.hardGateIds.length} hard ${file.providerClaimReadiness.hardGateIds.length === 1 ? 'gate' : 'gates'} unresolved · final pack unavailable`}</span>
          <button type="button" disabled={busy != null} onClick={close} style={actionButton()}>Cancel</button>
          <button type="button" disabled={draftDisabled} onClick={() => void createPack(false)} style={actionButton(false, draftDisabled)}>{busy === 'draft' ? 'Saving…' : 'Save draft'}</button>
          <button type="button" disabled={submitDisabled} onClick={() => void createPack(true)} style={actionButton(true, submitDisabled)}>{busy === 'final' ? 'Preparing…' : 'Prepare final pack'}</button>
        </div>
      </div>
    </div></OverlayPortal>
  );
}

function sourceLabel(value: string | null | undefined) {
  if (!value) return 'source unavailable';
  const lower = value.toLowerCase();
  if (lower.includes('shopify')) return 'Shopify';
  if (lower.includes('gorgias')) return 'Gorgias';
  if (lower.includes('ups')) return 'UPS';
  if (lower.includes('fedex')) return 'FedEx';
  if (lower.includes('dpd')) return 'DPD';
  return human(value);
}
