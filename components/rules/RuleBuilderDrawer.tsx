'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { Button, Drawer, Input, Textarea } from '@/components/ui';
import type { ConditionOperator, MerchantRule, RuleAction, RuleCondition } from '@/lib/rules-engine';
import { RULE_FIELDS } from '@/lib/rules/fields';
import { ACTION_LABELS, summarizeConditions } from '@/lib/rules/summary';
import { ConditionBlock } from './ConditionBlock';
import styles from './AutomationControls.module.css';

export interface RuleDraftPayload {
  name: string;
  description: string | null;
  conditions: RuleCondition[];
  action: RuleAction;
  condition_operator: ConditionOperator;
}

interface RuleBuilderDrawerProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialRule?: MerchantRule | null;
  existingRules?: MerchantRule[];
  onClose: () => void;
  /** Returns true on success so the drawer can close itself. */
  onSubmit: (payload: RuleDraftPayload, id?: string) => Promise<boolean>;
  overlayId?: string;
}

const ACTIONS: RuleAction[] = ['approve', 'manual_review', 'deny'];

function newConditionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `c-${Math.floor(performance.now() * 1000)}`;
}

/** A payout-policy seed condition: claim type is the most common first filter. */
function blankCondition(): RuleCondition {
  const def = RULE_FIELDS.find((field) => field.field === 'claim_type') ?? RULE_FIELDS[0]!;
  const operator = def.operators.includes('eq') ? 'eq' : def.operators[0]!;
  return { id: newConditionId(), field: def.field, operator, value: def.options?.[0]?.value ?? '' };
}

/**
 * Form state initialises directly from props. The parent passes a `key` that
 * changes on each open / target rule, so the component remounts with fresh
 * state — no synchronising effect needed.
 *
 * The builder is payout-policy-led: rules are expressed as conditions over
 * payout-case facts (claim type, requested action, exposure, evidence,
 * recoverability). There is no risk-score band model in the merchant UI.
 */
export function RuleBuilderDrawer({
  open,
  mode,
  initialRule,
  onClose,
  onSubmit,
  overlayId,
}: RuleBuilderDrawerProps) {
  const [name, setName] = useState(() => (mode === 'edit' ? initialRule?.name ?? '' : ''));
  const [description, setDescription] = useState(() => (mode === 'edit' ? initialRule?.description ?? '' : ''));
  const [conditions, setConditions] = useState<RuleCondition[]>(() =>
    mode === 'edit' && initialRule ? initialRule.conditions.map((c) => ({ ...c })) : [blankCondition()],
  );
  const [operator, setOperator] = useState<ConditionOperator>(() =>
    mode === 'edit' ? initialRule?.condition_operator ?? 'and' : 'and',
  );
  const [action, setAction] = useState<RuleAction>(() =>
    mode === 'edit' ? initialRule?.action ?? 'manual_review' : 'manual_review',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => summarizeConditions(conditions, operator), [conditions, operator]);
  const canSave = name.trim().length > 0 && !saving;

  const updateCondition = (index: number, next: RuleCondition) => {
    setConditions((prev) => prev.map((c, i) => (i === index ? next : c)));
  };
  const removeCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Rule name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const ok = await onSubmit(
      {
        name: name.trim(),
        description: description.trim() ? description.trim() : null,
        conditions,
        action,
        condition_operator: operator,
      },
      mode === 'edit' ? initialRule?.id : undefined,
    );
    setSaving(false);
    if (ok) onClose();
    else setError('Could not save the rule. Check the conditions and try again.');
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={620}
      title={mode === 'edit' ? 'Edit payout rule' : 'New payout rule'}
      overlayId={overlayId}
      signalRail={mode === 'edit'}
      footer={
        <div className={styles.editorFooter}>
          {error ? (
            <span className="text-caption" style={{ color: 'var(--uo-route-risk-high)' }}>{error}</span>
          ) : (
            <span className="text-caption" style={{ color: 'var(--uo-route-text-tertiary)' }}>
              Unauth runs your rules — you own the decision.
            </span>
          )}
          <div className={styles.editorActions}>
            <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={!canSave} loading={saving}>
              Save rule
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-1 p-5">
        <ol className={styles.builderGuide} aria-label="Rule draft steps">
          {['Goal', 'Conditions', 'Recommendation', 'Review'].map((step, index) => (
            <li key={step} data-current={index === 0 ? 'true' : undefined}><span>{index + 1}</span>{step}</li>
          ))}
        </ol>
        {/* Name */}
        <Field label="Rule name" required>
          <Input
            value={name}
            placeholder="e.g. Manual review high-value refunds"
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        {/* Description */}
        <Field label="Description" hint="Optional — explains when this claim review rule should hold a case.">
          <Textarea
            value={description}
            placeholder="e.g. Item-not-received over £75 with no proof of delivery should go to manual review before a reship."
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </Field>

        {/* Causal rule anatomy: a case reaches the rule, conditions decide a match, then Unauth recommends. */}
        <section className={styles.editorSection}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="ua-text-working-title" style={{ color: 'var(--uo-route-text-primary)' }}>If</span>
              <p className="mt-0.5 text-caption" style={{ color: 'var(--uo-route-text-tertiary)' }}>
                When a case reaches this rule, check these conditions.
              </p>
            </div>
            {conditions.length > 1 && (
              <div
                className="inline-flex overflow-hidden rounded-[var(--uo-route-radius-control)]"
                style={{ border: '1px solid var(--uo-route-border-default)' }}
              >
                <SegmentButton active={operator === 'and'} onClick={() => setOperator('and')}>
                  Match ALL
                </SegmentButton>
                <SegmentButton active={operator === 'or'} onClick={() => setOperator('or')}>
                  Match ANY
                </SegmentButton>
              </div>
            )}
          </div>

          {conditions.map((condition, index) => (
            <ConditionBlock
              key={condition.id}
              condition={condition}
              onChange={(next) => updateCondition(index, next)}
              onRemove={() => removeCondition(index)}
            />
          ))}

          {conditions.length === 0 && (
            <div
              className="flex items-start gap-2 rounded-[var(--uo-route-radius-control)] p-3 text-caption"
              style={{ background: 'var(--uo-route-surface-muted)', color: 'var(--uo-route-risk-medium, var(--uo-route-text-secondary))' }}
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>This rule has no conditions — it will match every case and always recommend <strong>{ACTION_LABELS[action]}</strong>.</span>
            </div>
          )}

          <div>
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={<Plus className="h-4 w-4" />}
              onClick={() => setConditions((prev) => [...prev, blankCondition()])}
            >
              Add condition
            </Button>
          </div>
        </section>

        {/* Recommended action */}
        <Field label="Recommend" hint="What Unauth recommends when this rule matches. An authorised merchant user still decides the case.">
          <div className={styles.choiceList} role="radiogroup" aria-label="Recommendation">
            {ACTIONS.map((a) => {
              const active = action === a;
              return (
                <button
                  key={a}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setAction(a)}
                    className={styles.choice}
                    data-active={active}
                >
                  {ACTION_LABELS[a]}
                </button>
              );
            })}
          </div>
        </Field>

        {/* Live preview */}
        <section className={styles.editorSection}>
          <span className={styles.factLabel}>
            When → If → Recommend
          </span>
          <p className={styles.detailCopy}>
            If {preview}
          </p>
          <p className={styles.surfaceTitle}>
            Recommend: {ACTION_LABELS[action]}
          </p>
          <p className={styles.reviewBoundary}>
            Saving creates or updates a draft only. It does not simulate, publish, record a merchant decision, contact a provider, or move money.
          </p>
        </section>
      </div>
    </Drawer>
  );
}


function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="ua-text-working-title" style={{ color: 'var(--uo-route-text-primary)' }}>
        {label}
        {required && <span style={{ color: 'var(--uo-route-risk-high)' }}> *</span>}
      </span>
      {children}
      {hint && (
        <span className="text-caption" style={{ color: 'var(--uo-route-text-tertiary)' }}>{hint}</span>
      )}
    </label>
  );
}

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1 text-caption font-medium transition-colors"
      style={{
        background: active ? 'var(--uo-route-action-primary)' : 'transparent',
        color: active ? 'var(--uo-route-action-primary-fg)' : 'var(--uo-route-text-secondary)',
      }}
    >
      {children}
    </button>
  );
}
