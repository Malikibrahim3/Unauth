'use client';

import { OverlayPortal } from '@/components/ui/OverlayPortal';
import { useOverlayPresence } from '@/lib/design/useOverlayPresence';
import { RuleImpactPreview } from './RuleImpactPreview';
import { useMemo, useState } from 'react';
import { normalizeRuleCondition, type ConditionOperator, type MerchantRule, type RuleAction, type RuleCondition } from '@/lib/rules-engine';
import { RULE_FIELDS, validateConditions } from '@/lib/rules/fields';
import { ACTION_LABELS, summarizeConditions } from '@/lib/rules/summary';
import { ConditionBlock } from './ConditionBlock';

export interface RuleDraftPayload {
  name: string;
  description: string | null;
  conditions: RuleCondition[];
  priority?: number;
  action: RuleAction;
  condition_operator: ConditionOperator;
}

interface RuleBuilderDrawerProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialRule?: MerchantRule | null;
  existingRules?: MerchantRule[];
  onClose: () => void;
  onSubmit: (payload: RuleDraftPayload, id?: string) => Promise<boolean>;
  overlayId?: string;
}

const ACTIONS: RuleAction[] = ['approve', 'manual_review', 'deny'];
const fieldStyle = { boxSizing: 'border-box', width: '100%', minWidth: 0, height: 36, padding: '0 10px', border: 0, borderRadius: 9, outline: 'none', background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.14)', color: '#1c1f23', font: "400 12px/1 'Inter',sans-serif" } as const;

function newConditionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `c-${Math.floor(performance.now() * 1000)}`;
}

function blankCondition(): RuleCondition {
  const def = RULE_FIELDS.find((field) => field.field === 'claim_type') ?? RULE_FIELDS[0]!;
  const operator = def.operators.includes('eq') ? 'eq' : def.operators[0]!;
  return { id: newConditionId(), field: def.field, operator, value: def.options?.[0]?.value ?? '' };
}

function FormField({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ color: '#1c1f23', font: "500 12px/1.4 'Inter',sans-serif" }}>{label}{required ? <span style={{ color: '#b0431a' }}> *</span> : null}</span>{children}{hint ? <span style={{ color: '#64686d', font: "400 10.5px/1.4 'Inter',sans-serif" }}>{hint}</span> : null}</label>;
}

export function RuleBuilderDrawer({ open, mode, initialRule, onClose, onSubmit, overlayId }: RuleBuilderDrawerProps) {
  const [name, setName] = useState(() => mode === 'edit' ? initialRule?.name ?? '' : '');
  const [description, setDescription] = useState(() => mode === 'edit' ? initialRule?.description ?? '' : '');
  const [conditions, setConditions] = useState<RuleCondition[]>(() => mode === 'edit' && initialRule ? initialRule.conditions.map((condition, index) => normalizeRuleCondition({ ...condition, id: condition.id || `${initialRule.id}:condition:${index}` })) : [blankCondition()]);
  const [operator, setOperator] = useState<ConditionOperator>(() => mode === 'edit' ? initialRule?.condition_operator ?? 'and' : 'and');
  const [action, setAction] = useState<RuleAction>(() => mode === 'edit' ? initialRule?.action ?? 'manual_review' : 'manual_review');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = useMemo(() => summarizeConditions(conditions, operator), [conditions, operator]);

  const conditionError = validateConditions(conditions)[0]?.message
    ?? (!['and', 'or'].includes(operator) ? 'Unsupported condition grouping. Review this rule before saving.' : null);

  const { containerRef } = useOverlayPresence({ open, onClose, trapFocus: true, lockBodyScroll: true, restoreFocus: true, closeOnEscape: !saving });
  if (!open) return null;

  async function save() {
    if (!name.trim()) { setError('Rule name is required.'); return; }
    if (conditionError || saving) { setError(conditionError); return; }
    setSaving(true);
    setError(null);
    try {
    const ok = await onSubmit({ name: name.trim(), description: description.trim() || null, conditions, action, condition_operator: operator, ...(initialRule ? { priority: initialRule.priority } : {}) }, mode === 'edit' ? initialRule?.id : undefined);
    setSaving(false);
    if (ok) onClose();
    else setError('Could not save the rule. Check the conditions and try again.');
    } catch {
      setError('Could not save the rule. Check your connection and try again.');
    } finally { setSaving(false); }
  }

  return (
    <OverlayPortal><div data-overlay-id={overlayId ?? 'rule-builder-drawer'} role="dialog" aria-modal="true" aria-labelledby="rule-builder-title" style={{ pointerEvents: 'auto', position: 'fixed', zIndex: 80, inset: 0, display: 'flex', justifyContent: 'flex-end', background: 'rgba(34,29,23,.30)' }}>
      <div ref={containerRef as React.RefObject<HTMLDivElement>} style={{ width: 620, maxWidth: 'calc(100vw - 40px)', height: '100%', display: 'flex', flexDirection: 'column', background: '#fff', boxShadow: '-20px 0 54px rgba(28,22,14,.22)' }}>
        <header style={{ padding: '17px 18px 15px', display: 'flex', alignItems: 'flex-start', gap: 12, borderBottom: '1px solid #eae8e5' }}>
          <div style={{ flex: 1 }}><div id="rule-builder-title" style={{ color: '#1c1f23', font: "500 15px/1.3 'Inter',sans-serif" }}>{mode === 'edit' ? 'Edit payout rule' : 'New payout rule'}</div><div style={{ marginTop: 4, color: '#64686d', font: "400 12px/1.5 'Inter',sans-serif" }}>Saving creates a draft. It changes no live recommendation until a separate test and publication action succeeds.</div></div>
          <button type="button" aria-label="Close rule builder" disabled={saving} onClick={onClose} style={{ padding: 2, border: 0, background: 'transparent', color: '#64686d', cursor: 'pointer' }}><svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M2.6 2.6 9.4 9.4M9.4 2.6 2.6 9.4" /></svg></button>
        </header>
        <div style={{ flex: 1, minHeight: 0, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
          <ol style={{ margin: 0, padding: 3, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, borderRadius: 9, background: '#f2f0ed', listStyle: 'none' }} aria-label="Rule draft steps">
            {['Goal', 'Conditions', 'Recommendation', 'Review'].map((step, index) => <li key={step} style={{ padding: '7px 8px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 7, background: index === 0 ? '#fff' : 'transparent', color: index === 0 ? '#1c1f23' : '#64686d', font: "400 10.5px/1 'Inter',sans-serif" }}><span style={{ fontFamily: "'IBM Plex Mono',monospace" }}>{index + 1}</span>{step}</li>)}
          </ol>
          <FormField label="Rule name" required><input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Hold high-value claims for review" style={fieldStyle} /></FormField>
          <FormField label="Description" hint="Optional · explains why this case-review rule exists."><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} placeholder="Explain the policy boundary" style={{ ...fieldStyle, height: 64, padding: 10, resize: 'vertical' }} /></FormField>
          <section style={{ padding: 11, display: 'flex', flexDirection: 'column', gap: 10, borderRadius: 12, background: '#f4f3f1' }} aria-labelledby="rule-conditions-title">
            <div style={{ padding: '1px 3px', display: 'flex', alignItems: 'center', gap: 10 }}><span id="rule-conditions-title" style={{ flex: 1, color: '#64686d', font: "600 10px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>IF THESE CONDITIONS MATCH</span>{conditions.length > 1 ? <div style={{ display: 'flex', padding: 2, borderRadius: 8, background: '#e4e3e0' }}><button type="button" onClick={() => setOperator('and')} style={{ padding: '5px 8px', border: 0, borderRadius: 6, background: operator === 'and' ? '#fff' : 'transparent', color: '#40454a', font: "500 10px/1 'Inter',sans-serif" }}>ALL</button><button type="button" onClick={() => setOperator('or')} style={{ padding: '5px 8px', border: 0, borderRadius: 6, background: operator === 'or' ? '#fff' : 'transparent', color: '#40454a', font: "500 10px/1 'Inter',sans-serif" }}>ANY</button></div> : null}</div>
            {conditions.map((condition, index) => <ConditionBlock key={condition.id} condition={condition} onChange={(next) => setConditions((current) => current.map((entry, entryIndex) => entryIndex === index ? next : entry))} onRemove={() => setConditions((current) => current.filter((_, entryIndex) => entryIndex !== index))} />)}
            {!conditions.length ? <div style={{ padding: 10, borderRadius: 9, background: '#fff3e9', color: '#7a5310', font: "400 11px/1.45 'Inter',sans-serif" }}>No conditions means every evaluated case would match. Test this explicitly before publication.</div> : null}
            <button type="button" onClick={() => setConditions((current) => [...current, blankCondition()])} style={{ alignSelf: 'flex-start', padding: '6px 10px', border: 0, borderRadius: 9, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a', font: "400 11.5px/1 'Inter',sans-serif", cursor: 'pointer' }}>+ Add condition</button>
          </section>
          <FormField label="Then recommend" hint="An authorised merchant user still records the case decision.">
            <div role="radiogroup" aria-label="Recommendation" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7 }}>
              {ACTIONS.map((candidate) => <button key={candidate} type="button" role="radio" aria-checked={action === candidate} onClick={() => setAction(candidate)} style={{ minHeight: 38, padding: '0 10px', border: 0, borderRadius: 9, background: action === candidate ? '#fff3e9' : '#fff', boxShadow: action === candidate ? 'inset 0 0 0 1px #e0a97a' : 'inset 0 0 0 1px #e4e3e0', color: action === candidate ? '#1c1f23' : '#64686d', font: "400 11.5px/1.3 'Inter',sans-serif", cursor: 'pointer' }}>{ACTION_LABELS[candidate]}</button>)}
            </div>
          </FormField>
          <RuleImpactPreview disabled={Boolean(conditionError) || !name.trim()} proposal={{ ...(initialRule ? { ruleId: initialRule.id } : {}), candidate: { name, description: description || null, conditions, action, condition_operator: operator, ...(initialRule ? { priority: initialRule.priority } : {}) } }} />
          <section style={{ padding: '12px 13px', borderRadius: 10, background: '#f4f3f1' }}><div style={{ color: '#64686d', font: "600 9.5px/1 'Inter',sans-serif", letterSpacing: '.08em' }}>WHEN → IF → RECOMMEND</div><div style={{ marginTop: 8, color: '#64686d', font: "400 11.5px/1.5 'Inter',sans-serif" }}>If {preview}</div><div style={{ marginTop: 6, color: '#1c1f23', font: "600 12.5px/1.4 'Inter',sans-serif" }}>Recommend: {ACTION_LABELS[action]}</div></section>
        </div>
        <footer style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid #eae8e5', background: '#ffffff' }}>
          <span style={{ flex: 1, color: error ? '#b0431a' : '#64686d', font: "400 10.5px/1.45 'IBM Plex Mono',monospace" }}>{error ?? conditionError ?? 'Unauth runs the rule · the merchant owns the decision'}</span>
          <button type="button" onClick={onClose} disabled={saving} style={{ padding: '7px 12px', border: 0, borderRadius: 9, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a', font: "400 12.5px/1 'Inter',sans-serif", cursor: 'pointer' }}>Cancel</button>
          <button type="button" onClick={() => void save()} disabled={!name.trim() || saving || Boolean(conditionError)} style={{ padding: '7px 13px', border: 0, borderRadius: 9, background: '#1c1f23', color: '#fff', font: "500 12.5px/1 'Inter',sans-serif", opacity: !name.trim() || saving ? .5 : 1, cursor: 'pointer' }}>{saving ? 'Saving…' : 'Save rule'}</button>
        </footer>
      </div>
    </div></OverlayPortal>
  );
}
