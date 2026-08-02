'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus } from 'lucide-react';
import { Button, Checkbox, Input, Modal, Select, Textarea } from '@/components/ui';
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

type Props = {
  partners: Partner[];
  rules: PartnerRecoveryRule[];
  canManage: boolean;
  investigationSettings: InvestigationSettings;
  emailDispatchAvailable: boolean;
};

export type InvestigationSettings = {
  investigation_response_sla_hours: number;
  investigation_reply_to: string | null;
  investigation_email_enabled: boolean;
};

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function RecoveryRulebookClient({
  partners,
  rules,
  canManage,
  investigationSettings: initialInvestigationSettings,
  emailDispatchAvailable,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [partnerType, setPartnerType] = useState<PartnerType>('carrier');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerUrl, setPartnerUrl] = useState('');
  const [partnerChannel, setPartnerChannel] = useState<'email' | 'portal' | 'manual' | 'api'>('manual');
  const [partnerSlaHours, setPartnerSlaHours] = useState('48');
  const [partnerInstructions, setPartnerInstructions] = useState('');
  const [ruleName, setRuleName] = useState('');
  const [rulePartnerId, setRulePartnerId] = useState('');
  const [recoveryType, setRecoveryType] = useState<PartnerRecoveryType>('carrier_claim');
  const [claimType, setClaimType] = useState<PartnerRuleClaimType>('item_not_received');
  const [requiredEvidence, setRequiredEvidence] = useState('tracking, proof_of_value');
  const [claimableCosts, setClaimableCosts] = useState('refund, replacement_shipping');
  const [deadlineDays, setDeadlineDays] = useState('14');
  const [settings, setSettings] = useState(initialInvestigationSettings);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [partnerError, setPartnerError] = useState<string | null>(null);

  function resetPartnerForm(partner?: Partner | null) {
    setEditingPartner(partner ?? null);
    setPartnerName(partner?.name ?? '');
    setPartnerType(partner?.partner_type ?? 'carrier');
    setPartnerEmail(partner?.contact_email ?? '');
    setPartnerUrl(partner?.contact_url ?? '');
    setPartnerChannel(partner?.default_contact_channel ?? 'manual');
    setPartnerSlaHours(String(partner?.response_sla_hours ?? 48));
    setPartnerInstructions(partner?.contact_instructions ?? '');
    setPartnerError(null);
  }

  function openPartnerModal(partner?: Partner | null) {
    resetPartnerForm(partner);
    setPartnerModalOpen(true);
  }

  async function savePartner() {
    if (!partnerName.trim()) return;
    setBusy(true);
    setPartnerError(null);
    const response = await fetch(
      editingPartner
        ? `/api/partners/${encodeURIComponent(editingPartner.id)}`
        : '/api/partners',
      {
      method: editingPartner ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: partnerName,
        partner_type: partnerType,
        contact_email: partnerEmail,
        contact_url: partnerUrl,
        default_contact_channel: partnerChannel,
        response_sla_hours: Number(partnerSlaHours),
        contact_instructions: partnerInstructions,
      }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setPartnerError(body.error ?? 'Unable to save partner.');
      return;
    }
    setPartnerModalOpen(false);
    resetPartnerForm();
    router.refresh();
  }

  async function saveInvestigationSettings() {
    setBusy(true);
    setSettingsMessage(null);
    const response = await fetch('/api/settings/investigations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const body = (await response.json().catch(() => ({}))) as {
      settings?: InvestigationSettings;
      error?: string;
    };
    setBusy(false);
    if (!response.ok || !body.settings) {
      setSettingsMessage(body.error ?? 'Unable to save investigation settings.');
      return;
    }
    setSettings(body.settings);
    setSettingsMessage('Investigation settings saved.');
  }

  async function createRule() {
    if (!ruleName.trim()) return;
    setBusy(true);
    await fetch('/api/partner-recovery-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partner_id: rulePartnerId || null,
        rule_name: ruleName,
        recovery_type: recoveryType,
        applies_to_claim_type: claimType,
        required_evidence: splitList(requiredEvidence),
        claimable_costs: splitList(claimableCosts),
        excluded_costs: [],
        deadline_days: deadlineDays ? Number(deadlineDays) : null,
        source_type: 'merchant_configured',
        confidence: 'medium',
        active: true,
      }),
    });
    setRuleName('');
    setBusy(false);
    setRuleModalOpen(false);
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-[var(--ua-radius-surface)] border" style={{ borderColor: 'var(--ua-border-default)', background: 'var(--ua-surface-primary)' }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--ua-border-subtle)' }}>
          <p className="ua-text-label" style={{ color: 'var(--ua-text-secondary)' }}>Recovery rules</p>
          {canManage ? (
            <Button type="button" variant="secondary" size="sm" leadingIcon={<Plus />} onClick={() => setRuleModalOpen(true)}>Add rule</Button>
          ) : null}
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--ua-border-subtle)' }}>
          {rules.length === 0 ? (
            <p className="ua-text-body p-4" style={{ color: 'var(--ua-text-tertiary)' }}>No partner recovery rules configured yet.</p>
          ) : rules.map((rule) => (
            <article key={rule.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <p className="ua-text-working-title" style={{ color: 'var(--ua-text-primary)' }}>{rule.rule_name}</p>
                <p className="ua-text-metadata mt-1" style={{ color: 'var(--ua-text-tertiary)' }}>
                  {RECOVERY_TYPE_LABELS[rule.recovery_type]} · {rule.applies_to_claim_type.replaceAll('_', ' ')} · {rule.partner?.name ?? 'Default rule'}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {rule.required_evidence.slice(0, 5).map((item) => (
                    <span key={item} className="rounded-[var(--ua-radius-control)] px-2 py-0.5 text-[length:var(--ua-text-metadata-size)]" style={{ background: 'var(--ua-surface-secondary)', color: 'var(--ua-text-secondary)' }}>
                      {item.replaceAll('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
              <div className="ua-text-metadata md:text-right" style={{ color: 'var(--ua-text-tertiary)' }}>
                <p>{rule.active ? 'Active' : 'Inactive'}</p>
                <p>{rule.deadline_days ?? '-'} day deadline</p>
                <p>{rule.confidence} confidence</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-[var(--ua-radius-surface)] border p-4" style={{ borderColor: 'var(--ua-border-default)', background: 'var(--ua-surface-primary)' }}>
          <div className="flex items-center justify-between">
            <p className="ua-text-label" style={{ color: 'var(--ua-text-secondary)' }}>Partners</p>
            {canManage ? (
              <Button type="button" variant="secondary" size="sm" leadingIcon={<Plus />} onClick={() => openPartnerModal()}>Add partner</Button>
            ) : null}
          </div>
          <div className="mt-3 space-y-2">
            {partners.length === 0 ? (
              <p className="ua-text-body" style={{ color: 'var(--ua-text-tertiary)' }}>No partners configured.</p>
            ) : partners.map((partner) => (
              <div key={partner.id} className="rounded-[var(--ua-radius-surface)] border px-3 py-2.5" style={{ borderColor: 'var(--ua-border-subtle)', background: 'var(--ua-surface-muted)' }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="ua-text-working-title" style={{ color: 'var(--ua-text-primary)' }}>{partner.name}</p>
                    <p className="ua-text-metadata" style={{ color: 'var(--ua-text-tertiary)' }}>
                      {PARTNER_TYPE_LABELS[partner.partner_type]}
                      {partner.default_contact_channel ? ` · ${partner.default_contact_channel}` : ''}
                      {partner.response_sla_hours ? ` · ${partner.response_sla_hours}h SLA` : ''}
                    </p>
                    {partner.contact_email || partner.contact_url ? (
                      <p className="ua-text-caption-role mt-1 truncate" style={{ color: 'var(--ua-text-secondary)' }}>
                        {partner.contact_email ?? partner.contact_url}
                      </p>
                    ) : null}
                  </div>
                  {canManage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Edit ${partner.name}`}
                      leadingIcon={<Pencil />}
                      onClick={() => openPartnerModal(partner)}
                    >
                      Edit
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[var(--ua-radius-surface)] border p-4" style={{ borderColor: 'var(--ua-border-default)', background: 'var(--ua-surface-primary)' }}>
          <p className="ua-text-label" style={{ color: 'var(--ua-text-secondary)' }}>
            Investigation delivery
          </p>
          <p className="ua-text-caption-role mt-1 leading-relaxed" style={{ color: 'var(--ua-text-tertiary)' }}>
            {emailDispatchAvailable
              ? 'Email remains disabled until a reply-to address is configured. Manual and portal sends stay available.'
              : 'Outbound email is disabled for this environment. Existing settings are retained; manual and portal sends remain separate.'}
          </p>
          <div className="mt-3 grid gap-3">
            <label className="ua-text-body grid gap-1 font-medium" style={{ color: 'var(--ua-text-secondary)' }}>
              Default response SLA (hours)
              <Input
                type="number"
                min="1"
                max="2160"
                disabled={!canManage || busy}
                value={settings.investigation_response_sla_hours}
                onChange={(event) => setSettings((current) => ({
                  ...current,
                  investigation_response_sla_hours: Number(event.target.value),
                }))}
              />
            </label>
            <label className="ua-text-body grid gap-1 font-medium" style={{ color: 'var(--ua-text-secondary)' }}>
              Reply-to address
              <Input
                type="email"
                placeholder="operations@example.com"
                disabled={!canManage || busy}
                value={settings.investigation_reply_to ?? ''}
                onChange={(event) => setSettings((current) => ({
                  ...current,
                  investigation_reply_to: event.target.value || null,
                }))}
              />
            </label>
            <label className="ua-text-body flex items-start gap-2" style={{ color: 'var(--ua-text-secondary)' }}>
              <Checkbox
                className="mt-0.5"
                disabled={
                  !canManage
                  || busy
                  || !emailDispatchAvailable
                  || !settings.investigation_reply_to
                }
                checked={settings.investigation_email_enabled}
                onChange={(event) => setSettings((current) => ({
                  ...current,
                  investigation_email_enabled: event.target.checked,
                }))}
              />
              <span>
                <span className="block font-medium">Enable configured outbound email</span>
                <span className="ua-text-caption-role block" style={{ color: 'var(--ua-text-tertiary)' }}>
                  {emailDispatchAvailable
                    ? 'Requests only become sent after provider acceptance.'
                    : 'Requires the controlled environment transport gate.'}
                </span>
              </span>
            </label>
            {canManage ? (
              <Button type="button" size="sm" loading={busy} onClick={() => void saveInvestigationSettings()}>
                Save investigation settings
              </Button>
            ) : null}
            {settingsMessage ? (
              <p
                role={settingsMessage.includes('saved') ? 'status' : 'alert'}
                className="ua-text-caption-role"
                style={{ color: settingsMessage.includes('saved') ? 'var(--ua-success)' : 'var(--ua-risk-critical)' }}
              >
                {settingsMessage}
              </p>
            ) : null}
          </div>
        </section>
      </aside>

      {canManage ? (
        <Modal
          open={partnerModalOpen}
          onClose={() => {
            setPartnerModalOpen(false);
            resetPartnerForm();
          }}
          title={editingPartner ? 'Edit partner' : 'Add partner'}
          description="Contact and deadline defaults are snapshotted onto each investigation request."
          size="md"
          actions={[
            {
              label: busy ? 'Saving…' : editingPartner ? 'Save partner' : 'Add partner',
              onClick: () => void savePartner(),
              disabled: busy || !partnerName.trim() || !partnerSlaHours,
            },
          ]}
        >
          <div className="grid gap-3">
            {partnerError ? (
              <p role="alert" className="ua-text-body rounded-md border border-[var(--ua-risk-critical-border)] bg-[var(--ua-risk-critical-bg)] p-3 text-[var(--ua-risk-critical)]">
                {partnerError}
              </p>
            ) : null}
            <label className="ua-text-body grid gap-1 font-medium" style={{ color: 'var(--ua-text-secondary)' }}>
              Partner name
              <Input aria-label="Partner name" placeholder="e.g. Royal Mail" value={partnerName} onChange={(event) => setPartnerName(event.target.value)} />
            </label>
            <label className="ua-text-body grid gap-1 font-medium" style={{ color: 'var(--ua-text-secondary)' }}>
              Partner type
              <Select aria-label="Partner type" value={partnerType} onChange={(event) => setPartnerType(event.target.value as PartnerType)}>
                {PARTNER_TYPES.map((type) => <option key={type} value={type}>{PARTNER_TYPE_LABELS[type]}</option>)}
              </Select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="ua-text-body grid gap-1 font-medium" style={{ color: 'var(--ua-text-secondary)' }}>
                Contact email
                <Input type="email" placeholder="claims@partner.com" value={partnerEmail} onChange={(event) => setPartnerEmail(event.target.value)} />
              </label>
              <label className="ua-text-body grid gap-1 font-medium" style={{ color: 'var(--ua-text-secondary)' }}>
                Portal URL
                <Input type="url" placeholder="https://partner.example/claims" value={partnerUrl} onChange={(event) => setPartnerUrl(event.target.value)} />
              </label>
              <label className="ua-text-body grid gap-1 font-medium" style={{ color: 'var(--ua-text-secondary)' }}>
                Default channel
                <Select value={partnerChannel} onChange={(event) => setPartnerChannel(event.target.value as typeof partnerChannel)}>
                  <option value="manual">Manual / copy</option>
                  <option value="email">Email</option>
                  <option value="portal">Partner portal</option>
                  <option value="api">External API reference</option>
                </Select>
              </label>
              <label className="ua-text-body grid gap-1 font-medium" style={{ color: 'var(--ua-text-secondary)' }}>
                Response SLA (hours)
                <Input type="number" min="1" max="2160" value={partnerSlaHours} onChange={(event) => setPartnerSlaHours(event.target.value)} />
              </label>
            </div>
            <label className="ua-text-body grid gap-1 font-medium" style={{ color: 'var(--ua-text-secondary)' }}>
              Contact instructions
              <Textarea
                maxLength={4000}
                placeholder="Reference format, portal steps, or escalation contact."
                value={partnerInstructions}
                onChange={(event) => setPartnerInstructions(event.target.value)}
              />
            </label>
          </div>
        </Modal>
      ) : null}

      {canManage ? (
        <Modal
          open={ruleModalOpen}
          onClose={() => setRuleModalOpen(false)}
          title="Add recovery rule"
          description="How a loss against this partner is chased, and what evidence the claim needs."
          size="md"
          actions={[
            { label: busy ? 'Adding…' : 'Add rule', onClick: () => void createRule(), disabled: busy || !ruleName.trim() },
          ]}
        >
          <div className="grid gap-3">
            <label className="ua-text-body grid gap-1 font-medium" style={{ color: 'var(--ua-text-secondary)' }}>
              Rule name
              <Input aria-label="Rule name" placeholder="e.g. Royal Mail non-delivery" value={ruleName} onChange={(event) => setRuleName(event.target.value)} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="ua-text-body grid gap-1 font-medium" style={{ color: 'var(--ua-text-secondary)' }}>
                Partner
                <Select aria-label="Rule partner" value={rulePartnerId} onChange={(event) => setRulePartnerId(event.target.value)}>
                  <option value="">Default rule</option>
                  {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
                </Select>
              </label>
              <label className="ua-text-body grid gap-1 font-medium" style={{ color: 'var(--ua-text-secondary)' }}>
                Recovery type
                <Select aria-label="Recovery type" value={recoveryType} onChange={(event) => setRecoveryType(event.target.value as PartnerRecoveryType)}>
                  {RECOVERY_TYPES.map((type) => <option key={type} value={type}>{RECOVERY_TYPE_LABELS[type]}</option>)}
                </Select>
              </label>
              <label className="ua-text-body grid gap-1 font-medium" style={{ color: 'var(--ua-text-secondary)' }}>
                Applies to claim type
                <Select aria-label="Claim type" value={claimType} onChange={(event) => setClaimType(event.target.value as PartnerRuleClaimType)}>
                  {PARTNER_RULE_CLAIM_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}
                </Select>
              </label>
              <label className="ua-text-body grid gap-1 font-medium" style={{ color: 'var(--ua-text-secondary)' }}>
                Deadline (days)
                <Input aria-label="Deadline days" type="number" min="0" placeholder="14" value={deadlineDays} onChange={(event) => setDeadlineDays(event.target.value)} />
              </label>
            </div>
            <label className="ua-text-body grid gap-1 font-medium" style={{ color: 'var(--ua-text-secondary)' }}>
              Required evidence
              <Input aria-label="Required evidence" placeholder="Required evidence, comma separated" value={requiredEvidence} onChange={(event) => setRequiredEvidence(event.target.value)} />
            </label>
            <label className="ua-text-body grid gap-1 font-medium" style={{ color: 'var(--ua-text-secondary)' }}>
              Claimable costs
              <Input aria-label="Claimable costs" placeholder="Claimable costs, comma separated" value={claimableCosts} onChange={(event) => setClaimableCosts(event.target.value)} />
            </label>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
