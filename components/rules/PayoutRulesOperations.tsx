'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { RuleBuilderDrawer, type RuleDraftPayload } from '@/components/rules/RuleBuilderDrawer';
import type { RuleIndexRecord } from '@/components/rules/RulesIndexClient';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime } from '@/lib/utils/format';
import type { MerchantRule, RuleAction, RuleCondition } from '@/lib/rules-engine';
import styles from './PayoutRulesOperations.module.css';

const actionLabels: Record<RuleAction, string> = {
  approve: 'Recommend: approve the request',
  manual_review: 'Recommend: send to manual review',
  deny: 'Recommend: decline with a recorded reason',
};

function lifecycle(rule: RuleIndexRecord) {
  if (rule.currentStatus === 'published' && rule.hasDraft) return 'Testing';
  if (rule.currentStatus === 'published') return 'Published';
  if (rule.currentStatus === 'disabled' || rule.currentStatus === 'retired') return 'Paused';
  return 'Draft';
}

function sentence(value: unknown) {
  if (Array.isArray(value)) return value.join(', ');
  return String(value ?? '— Unavailable').replaceAll('_', ' ');
}

function conditionSummary(conditions: RuleCondition[], operator: string, action: RuleAction) {
  if (!conditions.length) return `IF every evaluated case THEN ${actionLabels[action].toLowerCase()}`;
  const summary = conditions.slice(0, 2).map((condition, index) => (
    `${index === 0 ? 'IF' : operator.toUpperCase()} ${condition.field.replaceAll('_', ' ')} ${sentence(condition.operator)} ${sentence(condition.value)}`
  )).join(' ');
  return `${summary} THEN ${actionLabels[action].toLowerCase()}`;
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

export function PayoutRulesOperations({ rules, canManage }: { rules: RuleIndexRecord[]; canManage: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const orderedRules = [...rules].sort((left, right) => left.priority - right.priority);
  const selectedId = searchParams.get('selected');
  const selected = orderedRules.find((rule) => rule.id === selectedId) ?? orderedRules[0] ?? null;
  const [createRequested, setCreateRequested] = useState(false);
  const creating = createRequested || searchParams.get('new') === '1';
  const [editing, setEditing] = useState(false);
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
    try {
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Rule draft could not be created');
      toast({ title: 'Rule saved as draft', description: 'It has no effect until it is tested and explicitly published.', tone: 'success' });
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
      toast({ title: 'Rule draft saved', description: 'The published recommendation remains unchanged.', tone: 'success' });
      setEditing(false);
      router.refresh();
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Rule draft could not be saved');
      return false;
    }
  }

  return (
    <div className={styles.root} data-operations-surface="payout-rules">
      <p className={styles.notice}><i />Rules recommend, they never decide.</p>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}

      <div className={styles.layout}>
        <section className={styles.tableCard} aria-label="Payout rules">
          <header><div><h2>Rules</h2><p>Evaluated top to bottom · first match wins</p></div><span>{orderedRules.length} rules</span>{canManage ? <Button size="sm" onClick={() => setCreateRequested(true)}>Create rule</Button> : null}</header>
          <div className={styles.tableHead} aria-hidden="true"><span>Order</span><span>Rule</span><span>State / version</span><span>Owner</span><span>Last change</span><span>Next task</span></div>
          <div className={styles.rows}>
            {orderedRules.length ? orderedRules.map((rule) => {
              const state = lifecycle(rule);
              return (
                <button type="button" key={rule.id} className={styles.ruleRow} data-selected={selected?.id === rule.id} aria-label={`Select ${rule.name}, ${state}${rule.currentVersion ? ` version ${rule.currentVersion}` : ''}`} onClick={() => selectRule(rule.id)}>
                  <span className={styles.drag} aria-hidden="true" />
                  <span className={styles.ruleIdentity}><b>{rule.name}</b><small>{conditionSummary(rule.conditions, rule.conditionOperator, rule.action)}</small></span>
                  <span className={styles.ruleState}><i className={styles.state} data-state={state.toLowerCase()}>{state}</i><small>{rule.currentVersion ? `v${rule.currentVersion}` : 'Version unavailable'}</small></span>
                  <span className={styles.unavailable}>Owner unavailable</span>
                  <time className={styles.ruleChanged}>{formatDateTime(rule.updatedAt)}</time>
                  <span className={styles.nextTask}>{state === 'Draft' || state === 'Testing' ? 'Test draft' : state === 'Published' ? 'Review rule' : 'Review state'}</span>
                </button>
              );
            }) : (
              <div className={styles.empty} data-state-id="rules-empty-state"><b>No payout rules yet</b><p>Create a draft, test it on source-backed cases, then publish it explicitly. No rule records a merchant decision.</p>{canManage ? <Button size="sm" onClick={() => setCreateRequested(true)}>Create rule</Button> : null}</div>
            )}
          </div>
          <footer>Matched counts and value stay unavailable until per-rule evaluation receipts are retained by the source.</footer>
        </section>

        <aside className={styles.inspector} aria-label="Selected rule">
          {selected ? (
            <>
              <header><div><h2>{selected.name}</h2><p>{lifecycle(selected)}{selected.currentVersion ? ` v${selected.currentVersion}` : ''} · owner unavailable · edited {formatDateTime(selected.updatedAt)}</p></div><i className={styles.state} data-state={lifecycle(selected).toLowerCase()}>{lifecycle(selected)}</i></header>
              <section><h3>Conditions</h3><div className={styles.conditions}>{selected.conditions.length ? selected.conditions.map((condition, index) => <div key={condition.id || `${condition.field}-${index}`}><span>{index === 0 ? 'IF' : selected.conditionOperator.toUpperCase()}</span><b>{condition.field.replaceAll('_', ' ')}</b><em>{sentence(condition.operator)} {sentence(condition.value)}</em></div>) : <p>No conditions are recorded. This draft would match every evaluated case and must be reviewed before publication.</p>}</div>{canManage ? <Button size="sm" variant="secondary" className={styles.fullButton} onClick={() => setEditing(true)}>+ Add condition</Button> : null}</section>
              <section><h3>Then recommend</h3><div className={styles.recommend}><b>{actionLabels[selected.action]}</b><p>This pre-fills advice only. A person still confirms and records the merchant decision.</p></div></section>
              <section><div className={styles.sectionHead}><h3>Impact, last 30 days</h3><span>source not retained</span></div><div className={styles.unavailablePanel}><b><i />Impact unavailable</b><p>Per-rule recommendation and follow-through receipts are not retained by the current evaluation source. Publication state is not proof of impact.</p></div></section>
              <section><div className={styles.sectionHead}><h3>Test run</h3><i className={styles.advisory}>No real events created</i></div><div className={styles.testFigures}><div><span>Would have matched</span><b>— Unavailable</b></div><div><span>Value in scope</span><b>— Unavailable</b></div></div><Link className={styles.testButton} href={`/controls/rules/${selected.id}?tab=logic`}>Run test on last 30 days</Link></section>
              <footer><Link className="ua-button ua-button--primary ua-button--sm" href={`/controls/rules/${selected.id}`}>{lifecycle(selected) === 'Draft' ? 'Start test run' : 'Review rule'}</Link>{canManage ? <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Save draft</Button> : <Link className="ua-button ua-button--secondary ua-button--sm" href={`/controls/rules/${selected.id}?tab=history`}>Version history</Link>}</footer>
            </>
          ) : <div className={styles.empty}><b>Select a rule</b><p>Its conditions, recommendation boundary and test state appear here.</p></div>}
        </aside>
      </div>

      <RuleBuilderDrawer key={creating ? 'create-open' : 'create-closed'} open={creating} mode="create" overlayId="rule-builder-drawer" onClose={closeCreate} onSubmit={createRule} />
      {selected && editing ? <RuleBuilderDrawer key={`${selected.id}-${selected.currentVersionId ?? 'draft'}`} open mode="edit" initialRule={asMerchantRule(selected)} overlayId="rule-builder-drawer" onClose={() => setEditing(false)} onSubmit={saveDraft} /> : null}
    </div>
  );
}
