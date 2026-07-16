'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button, Input, Select } from '@/components/ui';
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
};

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function RecoveryRulebookClient({ partners, rules, canManage }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [partnerType, setPartnerType] = useState<PartnerType>('carrier');
  const [ruleName, setRuleName] = useState('');
  const [rulePartnerId, setRulePartnerId] = useState('');
  const [recoveryType, setRecoveryType] = useState<PartnerRecoveryType>('carrier_claim');
  const [claimType, setClaimType] = useState<PartnerRuleClaimType>('item_not_received');
  const [requiredEvidence, setRequiredEvidence] = useState('tracking, proof_of_value');
  const [claimableCosts, setClaimableCosts] = useState('refund, replacement_shipping');
  const [deadlineDays, setDeadlineDays] = useState('14');

  async function createPartner() {
    if (!partnerName.trim()) return;
    setBusy(true);
    await fetch('/api/partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: partnerName, partner_type: partnerType }),
    });
    setPartnerName('');
    setBusy(false);
    router.refresh();
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
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-[var(--radius-md)] border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border-muted)' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Recovery rules</p>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border-muted)' }}>
          {rules.length === 0 ? (
            <p className="p-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>No partner recovery rules configured yet.</p>
          ) : rules.map((rule) => (
            <article key={rule.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{rule.rule_name}</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {RECOVERY_TYPE_LABELS[rule.recovery_type]} · {rule.applies_to_claim_type.replaceAll('_', ' ')} · {rule.partner?.name ?? 'Default rule'}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {rule.required_evidence.slice(0, 5).map((item) => (
                    <span key={item} className="rounded-[var(--radius-sm)] px-2 py-0.5 text-[11px]" style={{ background: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>
                      {item.replaceAll('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-xs md:text-right" style={{ color: 'var(--text-tertiary)' }}>
                <p>{rule.active ? 'Active' : 'Inactive'}</p>
                <p>{rule.deadline_days ?? '-'} day deadline</p>
                <p>{rule.confidence} confidence</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-[var(--radius-md)] border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Partners</p>
          <div className="mt-3 space-y-2">
            {partners.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No partners configured.</p>
            ) : partners.map((partner) => (
              <div key={partner.id} className="rounded-[var(--radius-md)] border px-3 py-2" style={{ borderColor: 'var(--border-muted)', background: 'var(--surface-sunken)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{partner.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{PARTNER_TYPE_LABELS[partner.partner_type]}</p>
              </div>
            ))}
          </div>
          {canManage ? (
            <div className="mt-4 grid gap-2">
              <Input aria-label="Partner name" placeholder="Partner name" value={partnerName} onChange={(event) => setPartnerName(event.target.value)} />
              <Select aria-label="Partner type" value={partnerType} onChange={(event) => setPartnerType(event.target.value as PartnerType)}>
                {PARTNER_TYPES.map((type) => <option key={type} value={type}>{PARTNER_TYPE_LABELS[type]}</option>)}
              </Select>
              <Button type="button" onClick={() => void createPartner()} loading={busy} leadingIcon={<Plus />}>Add partner</Button>
            </div>
          ) : null}
        </section>

        {canManage ? (
          <section className="rounded-[var(--radius-md)] border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>New recovery rule</p>
            <div className="mt-3 grid gap-2">
              <Input aria-label="Rule name" placeholder="Rule name" value={ruleName} onChange={(event) => setRuleName(event.target.value)} />
              <Select aria-label="Rule partner" value={rulePartnerId} onChange={(event) => setRulePartnerId(event.target.value)}>
                <option value="">Default rule</option>
                {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
              </Select>
              <Select aria-label="Recovery type" value={recoveryType} onChange={(event) => setRecoveryType(event.target.value as PartnerRecoveryType)}>
                {RECOVERY_TYPES.map((type) => <option key={type} value={type}>{RECOVERY_TYPE_LABELS[type]}</option>)}
              </Select>
              <Select aria-label="Claim type" value={claimType} onChange={(event) => setClaimType(event.target.value as PartnerRuleClaimType)}>
                {PARTNER_RULE_CLAIM_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}
              </Select>
              <Input aria-label="Required evidence" placeholder="Required evidence, comma separated" value={requiredEvidence} onChange={(event) => setRequiredEvidence(event.target.value)} />
              <Input aria-label="Claimable costs" placeholder="Claimable costs, comma separated" value={claimableCosts} onChange={(event) => setClaimableCosts(event.target.value)} />
              <Input aria-label="Deadline days" type="number" min="0" placeholder="Deadline days" value={deadlineDays} onChange={(event) => setDeadlineDays(event.target.value)} />
              <Button type="button" onClick={() => void createRule()} loading={busy} leadingIcon={<Plus />}>Add rule</Button>
            </div>
          </section>
        ) : null}
      </aside>
    </div>
  );
}
