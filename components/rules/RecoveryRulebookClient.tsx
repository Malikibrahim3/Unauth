'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BeforeYouConfirm, Input, Modal, Select, Textarea } from '@/components/ui';
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
import { formatCurrency } from '@/lib/utils/format';
import styles from './AutomationControls.module.css';

type Props = {
  partners: Partner[];
  rules: PartnerRecoveryRule[];
  canManage: boolean;
};

function splitList(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function sentence(value: string) {
  const text = value.replaceAll('_', ' ');
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Unavailable';
}

export function RecoveryRulebookClient({ partners, rules, canManage }: Props) {
  const router = useRouter();
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
    if (requested === 'partner') {
      setEditingPartner(null);
      setPartnerName('');
      setPartnerType('carrier');
      setPartnerEmail('');
      setPartnerUrl('');
      setPartnerChannel('manual');
      setPartnerSlaHours('48');
      setPartnerInstructions('');
      setPartnerError(null);
      setPartnerModalOpen(true);
    } else {
      setEditingRule(null);
      setRuleName('');
      setRulePartnerId('');
      setRecoveryType('carrier_claim');
      setClaimType('item_not_received');
      setRequiredEvidence('tracking, proof_of_value');
      setClaimableCosts('refund, replacement_shipping');
      setDeadlineDays('14');
      setRuleError(null);
      setRuleModalOpen(true);
    }
    const next = new URLSearchParams(searchParams.toString());
    next.delete('modal');
    router.replace(`${pathname}${next.size ? `?${next.toString()}` : ''}`, { scroll: false });
  }, [canManage, pathname, router, searchParams]);

  function openPartner(partner?: Partner) {
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

  function openRule(rule?: PartnerRecoveryRule) {
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
    if (!partnerName.trim()) return;
    setBusy(true);
    setPartnerError(null);
    const response = await fetch(editingPartner ? `/api/partners/${encodeURIComponent(editingPartner.id)}` : '/api/partners', {
      method: editingPartner ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: partnerName.trim(),
        partner_type: partnerType,
        contact_email: partnerEmail.trim() || null,
        contact_url: partnerUrl.trim() || null,
        default_contact_channel: partnerChannel,
        response_sla_hours: Number(partnerSlaHours),
        contact_instructions: partnerInstructions.trim() || null,
      }),
    });
    const body = await response.json().catch(() => ({})) as { error?: string };
    setBusy(false);
    if (!response.ok) { setPartnerError(body.error ?? 'Unable to save partner.'); return; }
    setPartnerModalOpen(false);
    setMessage(editingPartner ? 'Partner updated. Existing recoveries retain their captured agreement facts.' : 'Recovery partner added. No recovery rule has been published automatically.');
    router.refresh();
  }

  async function saveRule() {
    if (!ruleName.trim()) return;
    setBusy(true);
    setRuleError(null);
    const response = await fetch(editingRule ? `/api/partner-recovery-rules/${editingRule.id}` : '/api/partner-recovery-rules', {
      method: editingRule ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partner_id: rulePartnerId || null,
        rule_name: ruleName.trim(),
        recovery_type: recoveryType,
        applies_to_claim_type: claimType,
        required_evidence: splitList(requiredEvidence),
        claimable_costs: splitList(claimableCosts),
        excluded_costs: editingRule?.excluded_costs ?? [],
        deadline_days: deadlineDays ? Number(deadlineDays) : null,
        source_type: editingRule?.source_type ?? 'merchant_configured',
        confidence: editingRule?.confidence ?? 'medium',
        active: editingRule?.active ?? false,
      }),
    });
    const body = await response.json().catch(() => ({})) as { error?: string };
    setBusy(false);
    if (!response.ok) { setRuleError(body.error ?? 'Unable to save recovery rule.'); return; }
    setRuleModalOpen(false);
    setMessage(editingRule ? 'Recovery rule updated. Historical uses remain unchanged.' : 'Recovery rule saved as a draft. It has no effect until published.');
    router.refresh();
  }

  const ruleForPartner = (partnerId: string) => rules.find((rule) => rule.partner_id === partnerId) ?? null;
  const capForRule = (rule: PartnerRecoveryRule | null) => rule?.liability_cap_amount != null && rule.liability_cap_currency
    ? formatCurrency(rule.liability_cap_amount, rule.liability_cap_currency)
    : '— Unavailable';

  return (
    <div className={styles.recoveryRulebook} data-operations-surface="recovery-rulebook">
      {message ? <p className={styles.message} role="status">{message}</p> : null}

      <div className={styles.rulebookSummaryGrid}>
        <section className={styles.rulebookSummaryCard}>
          <span>Recoverable value in scope</span>
          <strong>— Unavailable</strong>
          <p>Live confirmed-loss value is not stored in rulebook configuration.</p>
          <div className={styles.rulebookSummarySegments} aria-label="Configured partner coverage">
            {partners.slice(0, 5).map((partner, index) => <i key={partner.id} style={{ flex: Math.max(1, rules.filter((rule) => rule.partner_id === partner.id && rule.active).length) }} data-tone={index % 3} title={`${partner.name} · ${rules.filter((rule) => rule.partner_id === partner.id && rule.active).length} active rules`} />)}
          </div>
          <small>{partners.length} partners · {rules.filter((rule) => rule.active).length} active rules</small>
        </section>
        <section className={styles.rulebookSummaryCard}>
          <span>Not recoverable</span>
          <strong>— Unavailable</strong>
          <p>No live loss scope is queried on this configuration surface.</p>
          <div className={styles.rulebookUnavailableRows}>
            <div><span>Partners with no agreement rule</span><b>{partners.filter((partner) => !ruleForPartner(partner.id)).length}</b></div>
            <div><span>Inactive recovery rules</span><b>{rules.filter((rule) => !rule.active).length}</b></div>
            <div><span>Loss value behind those gaps</span><b>— Unavailable</b></div>
          </div>
        </section>
        <section className={styles.rulebookSummaryCard}>
          <span>What the rulebook may do</span>
          <div className={styles.rulebookBoundaries}>
            <p><b data-tone="may">May</b> recommend a partner, an evidence set and a deadline for a loss.</p>
            <p><b data-tone="may">May</b> hold work for review when no agreement covers the loss.</p>
            <p><b data-tone="never">Never</b> files a claim, records a merchant decision or moves money.</p>
            <p><b data-tone="never">Never</b> writes off an outstanding recovery on its own.</p>
          </div>
        </section>
      </div>

      <section className={styles.rulebookTableCard}>
        <header><h2>Recovery partners</h2><p>Contact, channel, deadline, cap and evidence requirements, maintained centrally.</p></header>
        <div>
          <div className={`${styles.partnerGrid} ${styles.rulebookTableHead}`}><span>Partner</span><span>Type</span><span>Agreement</span><span>Claim window</span><span>Cap</span><span>Evidence</span><span>Confidence</span><span>Status</span></div>
          {partners.length ? partners.map((partner) => {
            const partnerRule = ruleForPartner(partner.id);
            const cells = <><span>{partner.name}</span><span>{PARTNER_TYPE_LABELS[partner.partner_type]}</span><span>{partnerRule?.rule_name ?? '— No agreement recorded'}</span><span>{partnerRule?.deadline_days == null ? '— Unavailable' : `${partnerRule.deadline_days} days`}</span><span>{capForRule(partnerRule)}</span><span>{partnerRule ? `${partnerRule.required_evidence.length} required` : '— Unavailable'}</span><span>{partnerRule ? `${sentence(partnerRule.confidence)} · ${sentence(partnerRule.source_type)}` : '— No basis'}</span><span><i className={styles.rulebookState} data-state={partnerRule?.active ? 'active' : partnerRule ? 'inactive' : 'unavailable'}>{partnerRule?.active ? 'Active' : partnerRule ? 'Inactive' : 'No agreement'}</i></span></>;
            return canManage ? <button type="button" className={`${styles.partnerGrid} ${styles.rulebookTableRow}`} key={partner.id} onClick={() => openPartner(partner)}>{cells}</button> : <div className={`${styles.partnerGrid} ${styles.rulebookTableRow}`} key={partner.id}>{cells}</div>;
          }) : <div className={styles.rulebookEmpty} data-state-id="recovery-rulebook-empty">No partners are configured. Add one before assigning partner-specific recovery rules.</div>}
        </div>
        <footer>{partners.some((partner) => !ruleForPartner(partner.id)) ? 'Partners without an agreement have no stated claim window, cap or evidence set. Those fields remain unavailable, never zero.' : 'Every configured partner has at least one recorded recovery rule.'}</footer>
      </section>

      <section className={styles.rulebookTableCard}>
        <header><h2>Recovery rules</h2><p>Ordered by priority. The first matching rule recommends a route; a merchant still opens the claim.</p></header>
        <div>
          <div className={`${styles.ruleGrid} ${styles.rulebookTableHead}`}><span>#</span><span>When a loss looks like this</span><span>Recommend</span><span>Evidence set</span><span>Deadline</span><span>State</span></div>
          {rules.length ? rules.map((rule, index) => {
            const cells = <><span>{index + 1}</span><span>{sentence(rule.applies_to_claim_type)} · {RECOVERY_TYPE_LABELS[rule.recovery_type]}</span><span>{rule.partner ? `Route to ${rule.partner.name}` : 'Use the default recovery route'}</span><span>{rule.required_evidence.length ? rule.required_evidence.map(sentence).join(', ') : 'None recorded'}</span><span>{rule.deadline_days == null ? '— Unavailable' : `${rule.deadline_days} days`}</span><span><i className={styles.rulebookState} data-state={rule.active ? 'active' : 'draft'}>{rule.active ? 'Active' : 'Draft'}</i></span></>;
            return canManage ? <button type="button" className={`${styles.ruleGrid} ${styles.rulebookTableRow}`} key={rule.id} onClick={() => openRule(rule)}>{cells}</button> : <div className={`${styles.ruleGrid} ${styles.rulebookTableRow}`} key={rule.id}>{cells}</div>;
          }) : <div className={styles.rulebookEmpty}>No recovery rules exist yet. Add one to connect partner requirements to future recovery work.</div>}
        </div>
        <footer>Draft rules do not affect recovery recommendations. Existing recoveries retain the rule facts captured when they were opened.</footer>
      </section>

      {canManage ? <Modal open={partnerModalOpen} onClose={() => setPartnerModalOpen(false)} title={editingPartner ? 'Edit recovery partner' : 'Add a recovery partner'} description={editingPartner ? 'Changes apply to future recovery work; existing cases retain captured facts.' : 'Rulebook · no agreement on file yet'} size="md" overlayId="partner-and-recovery-rule-modals" actions={[{ label: busy ? 'Saving…' : editingPartner ? 'Save partner' : 'Add partner', onClick: () => void savePartner(), disabled: busy || !partnerName.trim() || !partnerSlaHours }]}>
        <div className="grid gap-3">
          {partnerError ? <p role="alert" className={styles.message} data-tone="error">{partnerError}</p> : null}
          <label className="ua-text-label grid gap-1">Partner name<Input value={partnerName} onChange={(event) => setPartnerName(event.target.value)} placeholder="e.g. Royal Mail" /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="ua-text-label grid gap-1">Partner type<Select value={partnerType} onChange={(event) => setPartnerType(event.target.value as PartnerType)}>{PARTNER_TYPES.map((type) => <option value={type} key={type}>{PARTNER_TYPE_LABELS[type]}</option>)}</Select></label>
            <label className="ua-text-label grid gap-1">Claim contact channel<Select value={partnerChannel} onChange={(event) => setPartnerChannel(event.target.value as typeof partnerChannel)}><option value="manual">Manual</option><option value="email">Email</option><option value="portal">Partner portal</option><option value="api">External API</option></Select></label>
            <label className="ua-text-label grid gap-1">Contact email<Input type="email" value={partnerEmail} onChange={(event) => setPartnerEmail(event.target.value)} placeholder="claims@partner.com" /></label>
            <label className="ua-text-label grid gap-1">Portal URL<Input type="url" value={partnerUrl} onChange={(event) => setPartnerUrl(event.target.value)} placeholder="https://partner.test/claims" /></label>
            <label className="ua-text-label grid gap-1">Response SLA (hours)<Input type="number" min="1" max="2160" value={partnerSlaHours} onChange={(event) => setPartnerSlaHours(event.target.value)} /></label>
          </div>
          <label className="ua-text-label grid gap-1">Instructions<Textarea value={partnerInstructions} onChange={(event) => setPartnerInstructions(event.target.value)} placeholder="Reference format, portal steps, or escalation contact." /></label>
          <p className="ua-text-metadata text-[var(--uo-route-text-secondary)]">A partner record does not create an agreement, cap, evidence set or claim window. Add those facts in a recovery rule.</p>
          <BeforeYouConfirm
            objectSummary={`${editingPartner ? editingPartner.name : 'New recovery partner'} · ${partnerName.trim() || 'unnamed'}`}
            valueSummary="No financial value changes."
            externalAction="None. No partner is contacted and no claim is filed."
            reversible="Yes. A later configuration change supersedes this record; existing recoveries retain captured facts."
            appendOnly="A recovery-partner configuration event and its audit entry. No agreement or recovery rule is created automatically."
          />
        </div>
      </Modal> : null}

      {canManage ? <Modal open={ruleModalOpen} onClose={() => setRuleModalOpen(false)} title={editingRule ? 'Edit recovery rule' : 'New recovery rule'} description={editingRule ? 'Existing recoveries keep the rule facts captured when they were opened.' : 'Draft · has no effect until published'} size="md" overlayId="partner-and-recovery-rule-modals" actions={[{ label: busy ? 'Saving…' : editingRule ? 'Save rule' : 'Save draft', onClick: () => void saveRule(), disabled: busy || !ruleName.trim() }]}>
        <div className="grid gap-3">
          {ruleError ? <p role="alert" className={styles.message} data-tone="error">{ruleError}</p> : null}
          <label className="ua-text-label grid gap-1">Rule name<Input value={ruleName} onChange={(event) => setRuleName(event.target.value)} placeholder="e.g. Royal Mail non-delivery" /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="ua-text-label grid gap-1">Partner<Select value={rulePartnerId} onChange={(event) => setRulePartnerId(event.target.value)}><option value="">Default rule</option>{partners.map((partner) => <option value={partner.id} key={partner.id}>{partner.name}</option>)}</Select></label>
            <label className="ua-text-label grid gap-1">Recovery type<Select value={recoveryType} onChange={(event) => setRecoveryType(event.target.value as PartnerRecoveryType)}>{RECOVERY_TYPES.map((type) => <option value={type} key={type}>{RECOVERY_TYPE_LABELS[type]}</option>)}</Select></label>
            <label className="ua-text-label grid gap-1">Loss condition<Select value={claimType} onChange={(event) => setClaimType(event.target.value as PartnerRuleClaimType)}>{PARTNER_RULE_CLAIM_TYPES.map((type) => <option value={type} key={type}>{sentence(type)}</option>)}</Select></label>
            <label className="ua-text-label grid gap-1">Claim window (days)<Input type="number" min="0" value={deadlineDays} onChange={(event) => setDeadlineDays(event.target.value)} placeholder="14" /></label>
          </div>
          <label className="ua-text-label grid gap-1">Required evidence<Input value={requiredEvidence} onChange={(event) => setRequiredEvidence(event.target.value)} placeholder="Tracking, proof of value" /><span className="ua-text-metadata font-normal">Comma-separated. Missing evidence blocks approval, not automatic submission.</span></label>
          <label className="ua-text-label grid gap-1">Claimable costs<Input value={claimableCosts} onChange={(event) => setClaimableCosts(event.target.value)} placeholder="Refund, replacement shipping" /></label>
          <p className="ua-text-metadata text-[var(--uo-route-text-secondary)]">Saving a draft does not file a claim, record a merchant decision, write off value or move money.</p>
          <BeforeYouConfirm
            objectSummary={`${editingRule ? editingRule.rule_name : 'New recovery rule'} · ${ruleName.trim() || 'unnamed draft'}`}
            valueSummary="No financial value changes."
            externalAction="None. Saving does not contact a partner, file a claim or move money."
            reversible="Yes while draft. Publishing is a separate explicit action; existing recoveries keep their captured rule facts."
            appendOnly="A draft recovery-rule version and an audit entry. The draft has no effect until published."
          />
        </div>
      </Modal> : null}
    </div>
  );
}
