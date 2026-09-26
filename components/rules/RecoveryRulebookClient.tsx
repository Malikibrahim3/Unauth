'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { OverlayPortal } from '@/components/ui/OverlayPortal';
import { useOverlayPresence } from '@/lib/design/useOverlayPresence';
import {
  PARTNER_RULE_CLAIM_TYPES,
  PARTNER_TYPE_LABELS,
  PARTNER_TYPES,
  RECOVERY_TYPE_LABELS,
  RECOVERY_TYPES,
  type Partner,
  type PartnerRecoveryRule,
  type PartnerRuleClaimType,
  type PartnerRecoveryType,
  type PartnerType,
} from '@/lib/partners/types';

type Props = { partners: Partner[]; rules: PartnerRecoveryRule[]; canManage: boolean };

const fieldStyle = { width: '100%', height: 34, border: 0, borderRadius: 8, padding: '0 9px', background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#1c1f23', font: "400 12px/1.3 'Inter',sans-serif", outline: 'none' } as const;
const labelStyle = { display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, color: '#64686d', font: "400 9.5px/1 'IBM Plex Mono',monospace", letterSpacing: '.05em' } as const;

function splitList(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function sentence(value: string) {
  const text = value.replaceAll('_', ' ');
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Unavailable';
}

function EditorModal({ title, description, error, busy, action, actionLabel, onClose, restoreFocusTarget, children }: { title: string; description: string; error: string | null; busy: boolean; action: () => void; actionLabel: string; onClose: () => void; restoreFocusTarget: RefObject<HTMLElement | null>; children: ReactNode }) {
  const overlay = useOverlayPresence({ open: true, onClose, closeOnEscape: !busy, trapFocus: true, lockBodyScroll: true, restoreFocusTarget });
  return (
    <OverlayPortal><div data-overlay-id="partner-and-recovery-rule-modals" onMouseDown={(event) => { if (!busy && event.target === event.currentTarget) onClose(); }} style={{ position: 'fixed', pointerEvents: 'auto', zIndex: 80, inset: 0, background: 'rgba(34,29,23,.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <section ref={overlay.containerRef} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} data-overlay-state={overlay.phase} style={{ width: 720, maxWidth: '100%', maxHeight: '100%', background: '#fff', borderRadius: 14, boxShadow: '0 30px 70px rgba(28,22,14,.34),0 2px 8px rgba(28,22,14,.18)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '17px 18px 15px', borderBottom: '1px solid #eae8e5', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "500 15px/1.3 'Inter',sans-serif", color: '#1c1f23' }}>{title}</div><div style={{ font: "400 12px/1.5 'Inter',sans-serif", color: '#64686d', marginTop: 4 }}>{description}</div></div>
          <button type="button" aria-label="Close dialog" onClick={onClose} disabled={busy} style={{ flex: 'none', marginTop: 3, padding: 0, border: 0, background: 'transparent', cursor: 'pointer' }}><svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="#64686d" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M2.6 2.6 9.4 9.4M9.4 2.6 2.6 9.4" /></svg></button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>
          {error ? <div role="alert" style={{ padding: '10px 12px', borderRadius: 10, background: '#fdf0e6', color: '#b0431a', font: "400 11.5px/1.5 'Inter',sans-serif" }}>{error}</div> : null}
          {children}
        </div>
        <div style={{ padding: '13px 18px', borderTop: '1px solid #eae8e5', display: 'flex', alignItems: 'center', gap: 10, background: '#ffffff' }}>
          <span style={{ flex: 1, minWidth: 0, color: '#64686d', font: "400 10.5px/1.45 'IBM Plex Mono',monospace" }}>saving configuration does not contact a partner, file a claim, or move money</span>
          <button type="button" onClick={onClose} disabled={busy} style={{ padding: '7px 12px', border: 0, borderRadius: 9, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a', font: "400 12.5px/1 'Inter',sans-serif", cursor: 'pointer' }}>Cancel</button>
          <button type="button" onClick={action} disabled={busy} style={{ padding: '7px 13px', border: 0, borderRadius: 9, background: '#1c1f23', color: '#fff', font: "500 12.5px/1 'Inter',sans-serif", opacity: busy ? .55 : 1, cursor: 'pointer' }}>{busy ? 'Saving…' : actionLabel}</button>
        </div>
      </section>
    </div></OverlayPortal>
  );
}

function ConsequenceSummary({ object, appendOnly }: { object: string; appendOnly: string }) {
  const rows = [
    ['OBJECT', object],
    ['VALUE', 'No financial value changes.'],
    ['EXTERNAL ACTION', 'None. No partner is contacted and no claim is filed.'],
    ['REVERSIBLE', 'Yes. Later configuration may supersede this record; existing recoveries retain captured facts.'],
    ['APPEND-ONLY', appendOnly],
  ];
  return <div style={{ borderRadius: 10, background: '#f4f3f1', padding: '5px 12px' }}>{rows.map(([label, value]) => <div key={label} style={{ display: 'grid', gridTemplateColumns: '118px 1fr', gap: 12, padding: '8px 0', borderTop: '1px solid #e4e3e0' }}><span style={{ color: '#64686d', font: "400 9.5px/1.4 'IBM Plex Mono',monospace" }}>{label}</span><span style={{ color: '#64686d', font: "400 11px/1.45 'Inter',sans-serif" }}>{value}</span></div>)}</div>;
}

export function RecoveryRulebookClient({ partners, rules, canManage }: Props) {
  const router = useRouter();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const editorOpener = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [partnerError, setPartnerError] = useState<string | null>(null);
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [partnerName, setPartnerName] = useState('');
  const [partnerType, setPartnerType] = useState<PartnerType>('carrier');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerUrl, setPartnerUrl] = useState('');
  const [partnerChannel, setPartnerChannel] = useState<'email' | 'portal' | 'manual' | 'api'>('manual');
  const [partnerSlaHours, setPartnerSlaHours] = useState('48');
  const [partnerInstructions, setPartnerInstructions] = useState('');
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PartnerRecoveryRule | null>(null);
  const [ruleName, setRuleName] = useState('');
  const [rulePartnerId, setRulePartnerId] = useState('');
  const [recoveryType, setRecoveryType] = useState<PartnerRecoveryType>('carrier_claim');
  const [claimType, setClaimType] = useState<PartnerRuleClaimType>('item_not_received');
  const [requiredEvidence, setRequiredEvidence] = useState('tracking, proof_of_value');
  const [claimableCosts, setClaimableCosts] = useState('refund, replacement_shipping');
  const [deadlineDays, setDeadlineDays] = useState('14');

  useEffect(() => {
    const requested = searchParams.get('modal');
    if (!canManage || (requested !== 'partner' && requested !== 'rule')) return;
    if (requested === 'partner') openPartner();
    else openRule();
    const next = new URLSearchParams(searchParams.toString());
    next.delete('modal');
    router.replace(`${pathname}${next.size ? `?${next.toString()}` : ''}`, { scroll: false });
  }, [canManage, pathname, router, searchParams]);

  function openPartner(partner?: Partner, opener?: HTMLElement) {
    editorOpener.current = opener ?? surfaceRef.current;
    setEditingPartner(partner ?? null);
    setPartnerName(partner?.name ?? '');
    setPartnerType(partner?.partner_type ?? 'carrier');
    setPartnerEmail(partner?.contact_email ?? '');
    setPartnerUrl(partner?.contact_url ?? '');
    setPartnerChannel(partner?.default_contact_channel ?? 'manual');
    setPartnerSlaHours(String(partner?.response_sla_hours ?? 48));
    setPartnerInstructions(partner?.contact_instructions ?? '');
    setPartnerError(null);
    setPartnerModalOpen(true);
  }

  function openRule(rule?: PartnerRecoveryRule, opener?: HTMLElement) {
    editorOpener.current = opener ?? surfaceRef.current;
    setEditingRule(rule ?? null);
    setRuleName(rule?.rule_name ?? '');
    setRulePartnerId(rule?.partner_id ?? '');
    setRecoveryType(rule?.recovery_type ?? 'carrier_claim');
    setClaimType(rule?.applies_to_claim_type ?? 'item_not_received');
    setRequiredEvidence((rule?.required_evidence ?? ['tracking', 'proof_of_value']).join(', '));
    setClaimableCosts((rule?.claimable_costs ?? ['refund', 'replacement_shipping']).join(', '));
    setDeadlineDays(rule?.deadline_days == null ? '' : String(rule.deadline_days));
    setRuleError(null);
    setRuleModalOpen(true);
  }

  async function savePartner() {
    if (!partnerName.trim()) { setPartnerError('Partner name is required.'); return; }
    setBusy(true);
    setPartnerError(null);
    try {
      const response = await fetch(editingPartner ? `/api/partners/${encodeURIComponent(editingPartner.id)}` : '/api/partners', {
        method: editingPartner ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: partnerName.trim(), partner_type: partnerType, contact_email: partnerEmail.trim() || null, contact_url: partnerUrl.trim() || null, default_contact_channel: partnerChannel, response_sla_hours: Number(partnerSlaHours), contact_instructions: partnerInstructions.trim() || null }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Unable to save partner.');
      setPartnerModalOpen(false);
      setMessage(editingPartner ? 'Partner updated. Existing recoveries retain their captured agreement facts.' : 'Recovery partner added. No recovery rule has been published automatically.');
      router.refresh();
    } catch (reason) {
      setPartnerError(reason instanceof Error ? reason.message : 'Unable to save partner.');
    } finally {
      setBusy(false);
    }
  }

  async function saveRule() {
    if (!ruleName.trim()) { setRuleError('Rule name is required.'); return; }
    setBusy(true);
    setRuleError(null);
    try {
      const response = await fetch(editingRule ? `/api/partner-recovery-rules/${editingRule.id}` : '/api/partner-recovery-rules', {
        method: editingRule ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_id: rulePartnerId || null, rule_name: ruleName.trim(), recovery_type: recoveryType, applies_to_claim_type: claimType, required_evidence: splitList(requiredEvidence), claimable_costs: splitList(claimableCosts), excluded_costs: editingRule?.excluded_costs ?? [], deadline_days: deadlineDays ? Number(deadlineDays) : null, source_type: editingRule?.source_type ?? 'merchant_configured', confidence: editingRule?.confidence ?? 'medium', active: editingRule?.active ?? false }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Unable to save recovery rule.');
      setRuleModalOpen(false);
      setMessage(editingRule ? 'Recovery rule updated. Historical uses remain unchanged.' : 'Recovery rule saved as a draft. It has no effect until published.');
      router.refresh();
    } catch (reason) {
      setRuleError(reason instanceof Error ? reason.message : 'Unable to save recovery rule.');
    } finally {
      setBusy(false);
    }
  }

  const ruleForPartner = (partnerId: string) => rules.find((rule) => rule.partner_id === partnerId) ?? null;
  const unroutedPartner = partners.find((partner) => !ruleForPartner(partner.id)) ?? null;

  return (
    <div ref={surfaceRef} role="region" aria-label="Recovery rulebook" tabIndex={-1} style={{ flex: 1, minHeight: 0, padding: '16px 22px 20px', display: 'flex', gap: 14, overflow: 'auto' }} data-screen-label="Recovery rulebook" data-visual-world="supplied-package" data-surface-id="recovery-rulebook" data-archetype="P8" data-operations-surface="recovery-rulebook">
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {message ? <div role="status" style={{ padding: '9px 12px', borderRadius: 9, background: '#eef6f1', color: '#1a6b43', font: "400 11px/1.45 'Inter',sans-serif" }}>{message}</div> : null}
        <section style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', padding: '12px 16px 10px', flex: '1 0 auto', display: 'flex', flexDirection: 'column' }} aria-label="Partners and their windows">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 8 }}><span style={{ flex: 1, font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>PARTNERS AND THEIR WINDOWS</span><span style={{ width: 150, flex: 'none', font: "400 9.5px/1 'Inter',sans-serif", letterSpacing: '.06em', color: '#64686d' }}>FILING WINDOW</span><span style={{ width: 86, flex: 'none', textAlign: 'right', font: "400 9.5px/1 'Inter',sans-serif", letterSpacing: '.06em', color: '#64686d' }}>PAYS</span><span style={{ width: 96, flex: 'none', textAlign: 'right', font: "400 9.5px/1 'Inter',sans-serif", letterSpacing: '.06em', color: '#64686d' }}>MEDIAN WAIT</span></div>
          {partners.length ? partners.map((partner) => {
            const partnerRule = ruleForPartner(partner.id);
            const row = <><div style={{ flex: 1, minWidth: 0 }}><div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}><span style={{ font: "500 12.5px/1.35 'Inter',sans-serif", color: '#1c1f23' }}>{partner.name}</span><span style={{ font: "400 10.5px/1.4 'IBM Plex Mono',monospace", color: '#64686d' }}>{PARTNER_TYPE_LABELS[partner.partner_type]} · {partnerRule ? RECOVERY_TYPE_LABELS[partnerRule.recovery_type] : 'no route'}</span></div><div style={{ font: "400 11px/1.5 'Inter',sans-serif", color: '#64686d', marginTop: 3 }}>Requires: {partnerRule?.required_evidence.length ? partnerRule.required_evidence.map(sentence).join(', ') : '— No evidence set recorded'}</div></div><span style={{ width: 150, flex: 'none', font: "400 11.5px/1.5 'Inter',sans-serif", color: partnerRule ? '#40454a' : '#64686d' }}>{partnerRule?.deadline_days == null ? '— Unavailable' : `${partnerRule.deadline_days} days`}</span><span style={{ width: 86, flex: 'none', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}><span style={{ font: "400 12.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>—</span><span style={{ width: 64, height: 4, borderRadius: 2, background: '#f2f0ed', display: 'block' }} /></span><span style={{ width: 96, flex: 'none', textAlign: 'right', font: "400 11.5px/1.5 'IBM Plex Mono',monospace", color: '#64686d' }}>—</span></>;
            return canManage ? <button type="button" key={partner.id} onClick={(event) => openPartner(partner, event.currentTarget)} style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 0', border: 0, borderTop: '1px solid #f4f2ef', background: '#fff', textAlign: 'left', cursor: 'pointer' }}>{row}</button> : <div key={partner.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 0', borderTop: '1px solid #f4f2ef' }}>{row}</div>;
          }) : <div data-state-id="recovery-rulebook-empty" style={{ flex: 1, minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64686d', font: "400 11.5px/1.5 'Inter',sans-serif" }}>No partners are configured. Add one before assigning partner-specific recovery rules.</div>}
          <div style={{ flex: 1 }} />
          <div style={{ borderTop: '1px solid #e4e3e0', marginTop: 8, paddingTop: 10, font: "400 11.5px/1.5 'Inter',sans-serif", color: '#64686d' }}>Payout rate and median wait remain unavailable because the rulebook stores configuration, not provider outcomes.</div>
        </section>

        <section style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', padding: '12px 16px 10px', flex: 'none' }} aria-label="Claim rules">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, paddingBottom: 7 }}><div style={{ font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>CLAIM RULES</div><div style={{ flex: 1 }} /><span style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>first match recommends the partner · confidence is the rulebook&apos;s, not the carrier&apos;s</span></div>
          {rules.length ? rules.map((rule) => {
            const row = <><span style={{ flex: 1, minWidth: 0, font: "400 12px/1.4 'Inter',sans-serif", color: '#1c1f23' }}>{sentence(rule.applies_to_claim_type)}</span><svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="#a7abad" strokeWidth="1.3" strokeLinecap="round" style={{ flex: 'none' }} aria-hidden="true"><path d="M2 6h7M6.4 3.4 9.6 6 6.4 8.6" /></svg><span style={{ width: 220, flex: 'none', font: "400 12px/1.4 'Inter',sans-serif", color: rule.partner ? '#40454a' : '#64686d' }}>{rule.partner ? `${rule.partner.name} · ${RECOVERY_TYPE_LABELS[rule.recovery_type]}` : 'Default recovery route'}</span><span style={{ width: 190, flex: 'none', font: "400 11.5px/1.4 'Inter',sans-serif", color: '#64686d' }}>{rule.claimable_costs.length ? rule.claimable_costs.map(sentence).join(', ') : '— No costs recorded'}</span><span style={{ width: 44, flex: 'none', textAlign: 'right', font: "400 11.5px/1.4 'IBM Plex Mono',monospace", color: '#1c1f23' }}>{rule.confidence === 'high' ? '0.90' : rule.confidence === 'medium' ? '0.60' : '0.30'}</span><span style={{ width: 86, flex: 'none', textAlign: 'right' }}><span style={{ padding: '2px 7px', borderRadius: 5, background: rule.active ? '#eef6f1' : '#fff3e9', font: "500 10px/1.5 'Inter',sans-serif", color: rule.active ? '#1a6b43' : '#7a5310' }}>{rule.active ? 'LIVE' : 'DRAFT'}</span></span></>;
            return canManage ? <button type="button" key={rule.id} onClick={(event) => openRule(rule, event.currentTarget)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', border: 0, borderTop: '1px solid #f4f2ef', background: '#fff', textAlign: 'left', cursor: 'pointer' }}>{row}</button> : <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: '1px solid #f4f2ef' }}>{row}</div>;
          }) : <div style={{ padding: '22px 0', color: '#64686d', font: "400 11.5px/1.5 'Inter',sans-serif" }}>No recovery rules exist yet. Add one to connect partner requirements to future recovery work.</div>}
        </section>
      </div>

      <aside style={{ width: 300, flex: 'none', background: '#f4f3f1', borderRadius: 13, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 11 }} aria-label="Rulebook sources">
        <div style={{ font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>WHERE THESE TERMS COME FROM</div>
        <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 9 }}>
          {rules.slice(0, 2).map((rule, index) => <div key={rule.id} style={{ paddingTop: index ? 9 : 0, borderTop: index ? '1px solid #f4f2ef' : 0 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ flex: 1, font: "500 12.5px/1.3 'Inter',sans-serif", color: '#1c1f23' }}>{rule.rule_name}</span><span style={{ padding: '2px 7px', borderRadius: 5, background: rule.source_type === 'contract_extracted' ? '#eef6f1' : '#fff3e9', font: "500 10px/1.5 'Inter',sans-serif", color: rule.source_type === 'contract_extracted' ? '#1a6b43' : '#7a5310' }}>{sentence(rule.source_type).toUpperCase()}</span></div><div style={{ font: "400 11px/1.5 'Inter',sans-serif", color: '#64686d', marginTop: 5 }}>{sentence(rule.confidence)} confidence · {rule.required_evidence.length} evidence requirement{rule.required_evidence.length === 1 ? '' : 's'} recorded.</div></div>)}
          {!rules.length ? <div style={{ font: "400 11px/1.5 'Inter',sans-serif", color: '#64686d' }}>No agreement or merchant-configured terms are recorded.</div> : null}
        </div>
        <div style={{ font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>THE BLOCKED ROUTE</div>
        <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(176,67,26,.3)', padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ font: "500 12.5px/1.35 'Inter',sans-serif", color: '#1c1f23' }}>{unroutedPartner ? unroutedPartner.name : 'Evidence-source coverage'}</div>
          <div style={{ font: "400 11px/1.5 'Inter',sans-serif", color: '#64686d' }}>{unroutedPartner ? 'This partner has no configured agreement route. A claim window, cap and evidence set remain unavailable.' : 'The rulebook does not retain a joined evidence-source health result, so blocked source coverage cannot be asserted here.'}</div>
          <Link href="/sources/browse" style={{ alignSelf: 'flex-start', padding: '6px 11px', borderRadius: 8, background: '#1c1f23', color: '#fff', font: "500 11.5px/1 'Inter',sans-serif", marginTop: 3, textDecoration: 'none' }}>Connect a returns source</Link>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ font: "400 11px/1.5 'Inter',sans-serif", color: '#64686d', borderTop: '1px solid #e4e3e0', paddingTop: 10 }}>Changing a window here changes future recommendations. Open recoveries retain the captured terms shown on the <Link href="/financials/recovery" style={{ color: '#9b470d', textDecoration: 'none' }}>recovery board</Link>.</div>
      </aside>

      {canManage && partnerModalOpen ? <EditorModal restoreFocusTarget={editorOpener} title={editingPartner ? 'Edit recovery partner' : 'Add a recovery partner'} description={editingPartner ? 'Changes apply to future recovery work; existing cases retain captured facts.' : 'Rulebook · no agreement on file yet'} error={partnerError} busy={busy} action={() => void savePartner()} actionLabel={editingPartner ? 'Save partner' : 'Add partner'} onClose={() => setPartnerModalOpen(false)}>
        <div style={{ background: '#f4f3f1', borderRadius: 12, padding: 11, display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
          <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>PARTNER NAME<input style={fieldStyle} value={partnerName} onChange={(event) => setPartnerName(event.target.value)} placeholder="e.g. Royal Mail" /></label>
          <label style={labelStyle}>PARTNER TYPE<select style={fieldStyle} value={partnerType} onChange={(event) => setPartnerType(event.target.value as PartnerType)}>{PARTNER_TYPES.map((type) => <option value={type} key={type}>{PARTNER_TYPE_LABELS[type]}</option>)}</select></label>
          <label style={labelStyle}>CLAIM CONTACT CHANNEL<select style={fieldStyle} value={partnerChannel} onChange={(event) => setPartnerChannel(event.target.value as typeof partnerChannel)}><option value="manual">Manual</option><option value="email">Email</option><option value="portal">Partner portal</option><option value="api">External API</option></select></label>
          <label style={labelStyle}>CONTACT EMAIL<input style={fieldStyle} type="email" value={partnerEmail} onChange={(event) => setPartnerEmail(event.target.value)} placeholder="claims@partner.com" /></label>
          <label style={labelStyle}>PORTAL URL<input style={fieldStyle} type="url" value={partnerUrl} onChange={(event) => setPartnerUrl(event.target.value)} placeholder="https://partner.test/claims" /></label>
          <label style={labelStyle}>RESPONSE SLA · HOURS<input style={fieldStyle} type="number" min="1" max="2160" value={partnerSlaHours} onChange={(event) => setPartnerSlaHours(event.target.value)} /></label>
          <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>INSTRUCTIONS<textarea style={{ ...fieldStyle, height: 62, padding: 9, resize: 'vertical' }} value={partnerInstructions} onChange={(event) => setPartnerInstructions(event.target.value)} placeholder="Reference format, portal steps, or escalation contact." /></label>
        </div>
        <ConsequenceSummary object={`${editingPartner?.name ?? 'New recovery partner'} · ${partnerName.trim() || 'unnamed'}`} appendOnly="A recovery-partner configuration event and its audit entry. No agreement or recovery rule is created automatically." />
      </EditorModal> : null}

      {canManage && ruleModalOpen ? <EditorModal restoreFocusTarget={editorOpener} title={editingRule ? 'Edit recovery rule' : 'New recovery rule'} description={editingRule ? 'Existing recoveries keep the rule facts captured when they were opened.' : 'Draft · has no effect until published'} error={ruleError} busy={busy} action={() => void saveRule()} actionLabel={editingRule ? 'Save rule' : 'Save draft'} onClose={() => setRuleModalOpen(false)}>
        <div style={{ background: '#f4f3f1', borderRadius: 12, padding: 11, display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
          <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>RULE NAME<input style={fieldStyle} value={ruleName} onChange={(event) => setRuleName(event.target.value)} placeholder="e.g. Royal Mail non-delivery" /></label>
          <label style={labelStyle}>PARTNER<select style={fieldStyle} value={rulePartnerId} onChange={(event) => setRulePartnerId(event.target.value)}><option value="">Default rule</option>{partners.map((partner) => <option value={partner.id} key={partner.id}>{partner.name}</option>)}</select></label>
          <label style={labelStyle}>RECOVERY TYPE<select style={fieldStyle} value={recoveryType} onChange={(event) => setRecoveryType(event.target.value as PartnerRecoveryType)}>{RECOVERY_TYPES.map((type) => <option value={type} key={type}>{RECOVERY_TYPE_LABELS[type]}</option>)}</select></label>
          <label style={labelStyle}>LOSS CONDITION<select style={fieldStyle} value={claimType} onChange={(event) => setClaimType(event.target.value as PartnerRuleClaimType)}>{PARTNER_RULE_CLAIM_TYPES.map((type) => <option value={type} key={type}>{sentence(type)}</option>)}</select></label>
          <label style={labelStyle}>CLAIM WINDOW · DAYS<input style={fieldStyle} type="number" min="0" value={deadlineDays} onChange={(event) => setDeadlineDays(event.target.value)} /></label>
          <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>REQUIRED EVIDENCE<input style={fieldStyle} value={requiredEvidence} onChange={(event) => setRequiredEvidence(event.target.value)} /></label>
          <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>CLAIMABLE COSTS<input style={fieldStyle} value={claimableCosts} onChange={(event) => setClaimableCosts(event.target.value)} /></label>
        </div>
        <ConsequenceSummary object={`${editingRule?.rule_name ?? 'New recovery rule'} · ${ruleName.trim() || 'unnamed draft'}`} appendOnly="A draft recovery-rule version and an audit entry. The draft has no effect until published." />
      </EditorModal> : null}
    </div>
  );
}
