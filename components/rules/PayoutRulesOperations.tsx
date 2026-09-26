'use client';

import Link from 'next/link';
import { RuleOrderPreview } from './RuleOrderPreview';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { RuleBuilderDrawer, type RuleDraftPayload } from '@/components/rules/RuleBuilderDrawer';
import type { MerchantRule, RuleAction, RuleCondition } from '@/lib/rules-engine';

export type RuleIndexRecord = {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  currentVersion: number | null;
  currentVersionId: string | null;
  currentStatus: 'draft' | 'published' | 'retired' | 'discarded' | 'disabled';
  hasDraft: boolean;
  publishedVersion: number | null;
  updatedAt: string;
  action: RuleAction;
  conditions: RuleCondition[];
  conditionOperator: import('@/lib/rules-engine').ConditionOperator;
};

const actionLabels: Record<RuleAction, string> = {
  approve: 'Recommend approval',
  manual_review: 'Send to Work for human review',
  deny: 'Recommend decline with a recorded reason',
};

const actionNotes: Record<RuleAction, string> = {
  approve: 'A person still records the merchant decision',
  manual_review: 'Ordered by value at risk',
  deny: 'A person still confirms the outcome',
};

function lifecycle(rule: RuleIndexRecord) {
  if (rule.currentStatus === 'published' && rule.hasDraft) return 'TESTING';
  if (rule.currentStatus === 'published') return 'LIVE';
  if (rule.currentStatus === 'disabled' || rule.currentStatus === 'retired') return 'PAUSED';
  return 'DRAFT';
}

function sentence(value: unknown) {
  if (Array.isArray(value)) return value.join(', ');
  return String(value ?? '—').replaceAll('_', ' ');
}

function conditionSummary(conditions: RuleCondition[], operator: string) {
  if (!conditions.length) return 'all evaluated cases';
  return conditions.map((condition, index) => (
    `${index ? `${operator === 'or' ? ' | ' : ' & '}` : ''}${condition.field.replaceAll('_', '.')} ${sentence(condition.operator)} ${sentence(condition.value)}`
  )).join('');
}

function asMerchantRule(rule: RuleIndexRecord): MerchantRule {
  return {
    id: rule.id,
    merchant_id: '',
    name: rule.name,
    description: rule.description,
    is_active: rule.currentStatus === 'published',
    priority: rule.priority,
    conditions: rule.conditions,
    action: rule.action,
    condition_operator: rule.conditionOperator,
  };
}

function StatePill({ rule }: { rule: RuleIndexRecord }) {
  const state = lifecycle(rule);
  const dormant = state === 'PAUSED';
  const draft = state === 'DRAFT' || state === 'TESTING';
  return (
    <span style={{ padding: '2px 7px', borderRadius: 5, background: dormant ? '#fdf0e6' : draft ? '#fff3e9' : '#eef6f1', color: dormant ? '#b0431a' : draft ? '#7a5310' : '#1a6b43', font: "500 10px/1.5 'Inter',sans-serif" }}>
      {state}
    </span>
  );
}


/** Keep the actual query-navigation opener available to modal focus restoration. */
export function NewPayoutRuleLink() {
  return <Link href="/controls/rules?new=1" onClick={(event) => event.currentTarget.focus()} style={{ padding: '6px 11px', borderRadius: 9, background: '#1c1f23', color: '#fff', font: "500 12.5px/1 'Inter',sans-serif", textDecoration: 'none' }}>New rule</Link>;
}

export function PayoutRulesOperations({ rules, canManage }: { rules: RuleIndexRecord[]; canManage: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orderedRules = [...rules].sort((left, right) => left.priority - right.priority);
  const selectedId = searchParams.get('selected');
  const selected = orderedRules.find((rule) => rule.id === selectedId) ?? orderedRules[0] ?? null;
  const [createRequested, setCreateRequested] = useState(false);
  const creating = createRequested || searchParams.get('new') === '1';
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function replaceParams(mutator: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(searchParams.toString());
    mutator(next);
    router.replace(`${pathname}${next.size ? `?${next.toString()}` : ''}`, { scroll: false });
  }

  function selectRule(id: string) {
    replaceParams((next) => next.set('selected', id));
  }

  function closeCreate() {
    setCreateRequested(false);
    replaceParams((next) => next.delete('new'));
  }

  async function createRule(payload: RuleDraftPayload) {
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Rule draft could not be created');
      router.push(`/controls/rules/${body.rule.id}`);
      router.refresh();
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Rule draft could not be created');
      return false;
    }
  }

  async function saveDraft(payload: RuleDraftPayload) {
    if (!selected) return false;
    setError(null);
    setMessage(null);
    try {
      const updateExisting = selected.hasDraft && selected.currentVersionId;
      const endpoint = updateExisting
        ? `/api/rules/${selected.id}/versions/${selected.currentVersionId}`
        : `/api/rules/${selected.id}/versions`;
      const response = await fetch(endpoint, {
        method: updateExisting ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Rule draft could not be saved');
      setMessage('Rule draft saved. The published recommendation remains unchanged.');
      setEditing(false);
      router.refresh();
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Rule draft could not be saved');
      return false;
    }
  }

  return (
    <div style={{ flex: 1, minHeight: 0, padding: '16px 22px 20px', display: 'flex', gap: 14, overflow: 'auto' }} data-screen-label="Payout rules" data-visual-world="supplied-package" data-surface-id="payout-rules-registry" data-archetype="P5" data-operations-surface="payout-rules">
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {error || message ? (
          <div role={error ? 'alert' : 'status'} style={{ margin: '0 0 8px 38px', padding: '9px 12px', borderRadius: 9, background: error ? '#fdf0e6' : '#eef6f1', color: error ? '#b0431a' : '#1a6b43', font: "400 11px/1.45 'Inter',sans-serif" }}>{error ?? message}</div>
        ) : null}

        {canManage ? <RuleOrderPreview /> : null}
        {orderedRules.length ? orderedRules.map((rule, index) => {
          const isSelected = selected?.id === rule.id;
          return (
            <div key={rule.id} style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
              <div style={{ width: 38, flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2 }}>
                <span style={{ font: "400 11px/1 'IBM Plex Mono',monospace", color: lifecycle(rule) === 'PAUSED' ? '#b0431a' : '#64686d' }}>{String(index + 1).padStart(2, '0')}</span>
                <div style={{ flex: 1, width: 1, background: '#e4e3e0', marginTop: 7 }} />
              </div>
              <button type="button" onClick={() => selectRule(rule.id)} aria-label={`Select ${rule.name}`} style={{ flex: 1, minWidth: 0, margin: '0 0 8px', border: 0, borderRadius: 10, background: '#fff', boxShadow: isSelected ? '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(201,138,26,.45)' : '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', padding: '12px 14px', display: 'flex', gap: 14, alignItems: 'flex-start', color: '#1c1f23', textAlign: 'left', cursor: 'pointer', font: 'inherit' }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', font: "500 13px/1.35 'Inter',sans-serif", color: '#1c1f23' }}>{rule.name}</span>
                  <span style={{ display: 'block', font: "400 11px/1.5 'IBM Plex Mono',monospace", color: '#64686d', marginTop: 4 }}>{conditionSummary(rule.conditions, rule.conditionOperator)}</span>
                </span>
                <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="#a7abad" strokeWidth="1.3" strokeLinecap="round" style={{ flex: 'none', marginTop: 4 }} aria-hidden="true"><path d="M2 6h7M6.4 3.4 9.6 6 6.4 8.6" /></svg>
                <span style={{ width: 208, flex: 'none', minWidth: 0 }}>
                  <span style={{ display: 'block', font: "500 12.5px/1.35 'Inter',sans-serif", color: '#1c1f23' }}>{actionLabels[rule.action]}</span>
                  <span style={{ display: 'block', font: "400 11px/1.5 'Inter',sans-serif", color: '#64686d', marginTop: 3 }}>{rule.description || actionNotes[rule.action]}</span>
                </span>
                <span style={{ width: 96, flex: 'none', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <span style={{ font: "400 15px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>—</span>
                  <span style={{ width: '100%', height: 4, borderRadius: 3, background: '#f2f0ed', overflow: 'hidden' }} />
                  <span style={{ font: "400 9.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>not retained</span>
                </span>
                <span style={{ width: 88, flex: 'none', textAlign: 'right' }}><StatePill rule={rule} /></span>
              </button>
            </div>
          );
        }) : (
          <div style={{ minHeight: 220, marginLeft: 38, borderRadius: 10, background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', padding: 28, gap: 7 }} data-state-id="rules-empty-state">
            <strong style={{ font: "500 13px/1.35 'Inter',sans-serif" }}>No payout rules yet</strong>
            <span style={{ maxWidth: 430, color: '#64686d', font: "400 11.5px/1.5 'Inter',sans-serif" }}>Create a draft, test it on source-backed cases, then publish it explicitly. Rules recommend; they do not record a merchant decision.</span>
            {canManage ? <button type="button" onClick={(event) => { event.currentTarget.focus(); setCreateRequested(true); }} style={darkButtonStyle}>New rule</button> : null}
          </div>
        )}

        <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
          <div style={{ width: 38, flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2 }}>
            <span style={{ font: "400 11px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>{String(orderedRules.length + 1).padStart(2, '0')}</span>
            <div style={{ flex: 1, width: 1, background: '#e4e3e0', marginTop: 7 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0, marginBottom: 8, background: '#ffffff', borderRadius: 10, boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', padding: '12px 14px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "500 13px/1.35 'Inter',sans-serif", color: '#1c1f23' }}>Everything the rules above did not catch</div><div style={{ font: "400 11px/1.5 'IBM Plex Mono',monospace", color: '#64686d', marginTop: 4 }}>fallback</div></div>
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="#a7abad" strokeWidth="1.3" strokeLinecap="round" style={{ flex: 'none', marginTop: 4 }} aria-hidden="true"><path d="M2 6h7M6.4 3.4 9.6 6 6.4 8.6" /></svg>
            <div style={{ width: 208, flex: 'none', minWidth: 0 }}><div style={{ font: "500 12.5px/1.35 'Inter',sans-serif", color: '#1c1f23' }}>Send to Work</div><div style={{ font: "400 11px/1.5 'Inter',sans-serif", color: '#64686d', marginTop: 3 }}>Ordered by value at risk</div></div>
            <div style={{ width: 96, flex: 'none', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}><span style={{ font: "400 15px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>—</span><span style={{ width: '100%', height: 4, borderRadius: 3, background: '#f2f0ed' }} /><span style={{ font: "400 9.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>not retained</span></div>
            <div style={{ width: 88, flex: 'none', textAlign: 'right' }}><span style={{ padding: '2px 7px', borderRadius: 5, background: '#f4f3f1', font: "500 10px/1.5 'Inter',sans-serif", color: '#40454a' }}>FALLBACK</span></div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}><div style={{ width: 38, flex: 'none', display: 'flex', justifyContent: 'center' }}><div style={{ width: 1, height: 12, background: '#e4e3e0' }} /></div><div style={{ font: "400 10.5px/1.45 'IBM Plex Mono',monospace", color: '#64686d', paddingTop: 2 }}>drag a rule to change its position — order changes outcomes</div></div>

        <div style={{ flex: 'none', marginTop: 8, background: '#fff', borderRadius: 10, boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', padding: '12px 15px 11px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}><span style={{ font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>SIMULATION RECEIPT</span><span style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: '#64686d', whiteSpace: 'nowrap' }}>the current source does not retain per-rule simulation results · nothing published</span><div style={{ flex: 1 }} />{selected ? <Link href={`/controls/rules/${selected.id}?tab=logic`} style={{ font: "500 11.5px/1 'Inter',sans-serif", whiteSpace: 'nowrap', color: '#9f4f08', textDecoration: 'none' }}>Open in the editor</Link> : null}</div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
            {['AUTO-RECOMMENDED', 'SENT TO A PERSON', 'VALUE WITHOUT REVIEW'].map((label) => <div key={label} style={{ flex: label === 'VALUE WITHOUT REVIEW' ? 1.9 : 1, minWidth: 0, overflow: 'hidden' }}><div style={{ font: "400 9.5px/1.4 'IBM Plex Mono',monospace", color: '#64686d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div><div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 6 }}><span style={{ font: "400 14px/1 'IBM Plex Mono',monospace", color: '#1c1f23' }}>—</span><span style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>unavailable</span></div></div>)}
            <div style={{ width: 196, flex: 'none', font: "400 10.5px/1.5 'Inter',sans-serif", color: '#64686d', borderLeft: '1px solid #eae8e5', paddingLeft: 14 }}>A source-backed comparison is required before a change in decision order can be described.</div>
          </div>
        </div>
      </div>

      <aside style={{ width: 300, flex: 'none', background: '#f4f3f1', borderRadius: 13, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 11 }} aria-label="Rule effect">
        <div style={{ font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>EFFECT · 30 DAYS</div>
        <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', padding: '14px 15px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative', flex: 'none' }}><svg width="72" height="72" viewBox="0 0 72 72" style={{ display: 'block', transform: 'rotate(-90deg)' }} aria-hidden="true"><circle cx="36" cy="36" r="32.5" fill="none" stroke="#f2f0ed" strokeWidth="5" /></svg><div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}><span style={{ font: "400 17px/1 'IBM Plex Mono',monospace", color: '#1c1f23' }}>—</span><span style={{ font: "400 8.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>UNAVAILABLE</span></div></div>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "500 12.5px/1.35 'Inter',sans-serif", color: '#1c1f23' }}>Decided without a human</div><div style={{ font: "400 11px/1.5 'Inter',sans-serif", color: '#64686d', marginTop: 4 }}>Per-rule recommendation and follow-through receipts are not retained by the current source.</div></div>
        </div>
        <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {['Decided by rule', 'Refunded automatically', 'Median time to decision', 'Median when a human is needed', 'Overturned by a human'].map((label) => <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}><span style={{ flex: 1, font: "400 11.5px/1.5 'Inter',sans-serif", color: '#64686d' }}>{label}</span><span style={{ font: "400 11.5px/1.5 'IBM Plex Mono',monospace", color: '#64686d' }}>—</span></div>)}
        </div>
        <div style={{ font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d', paddingTop: 2 }}>WHAT HUMANS OVERTURNED</div>
        <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', padding: '4px 13px 10px', display: 'flex', flexDirection: 'column' }}>
          {(selected ? [selected] : orderedRules.slice(0, 1)).map((rule) => <div key={rule.id} style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '9px 0', borderTop: '1px solid #f4f2ef' }}><div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ flex: 1, font: "500 11.5px/1.35 'Inter',sans-serif", color: '#1c1f23' }}>{rule.name}</span><span style={{ font: "400 11px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>—</span></div><div style={{ font: "400 11px/1.45 'Inter',sans-serif", color: '#64686d' }}>Human-overturn receipts are not retained for this rule.</div></div>)}
          {!selected ? <div style={{ padding: '9px 0', font: "400 11px/1.45 'Inter',sans-serif", color: '#64686d' }}>No rule is available.</div> : null}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ font: "400 11px/1.5 'Inter',sans-serif", color: '#64686d', borderTop: '1px solid #e4e3e0', paddingTop: 10 }}>{selected ? <>Selected rule: <strong style={{ color: '#1c1f23', fontWeight: 500 }}>{selected.name}</strong>. {canManage ? <button type="button" onClick={(event) => { event.currentTarget.focus(); setEditing(true); }} style={{ border: 0, padding: 0, background: 'transparent', color: '#9f4f08', font: 'inherit', cursor: 'pointer' }}>Edit its draft</button> : <Link href={`/controls/rules/${selected.id}?tab=history`} style={{ color: '#9f4f08', textDecoration: 'none' }}>View its history</Link>}.</> : 'Create a rule to begin defining the decision order.'}</div>
      </aside>

      <RuleBuilderDrawer key={creating ? 'create-open' : 'create-closed'} open={creating} mode="create" overlayId="rule-builder-drawer" onClose={closeCreate} onSubmit={createRule} />
      {selected && editing ? <RuleBuilderDrawer key={`${selected.id}-${selected.currentVersionId ?? 'draft'}`} open mode="edit" initialRule={asMerchantRule(selected)} overlayId="rule-builder-drawer" onClose={() => setEditing(false)} onSubmit={saveDraft} /> : null}
    </div>
  );
}

const darkButtonStyle = { marginTop: 5, border: 0, borderRadius: 9, padding: '7px 11px', background: '#1c1f23', color: '#fff', font: "500 12.5px/1 'Inter',sans-serif", cursor: 'pointer' } as const;
