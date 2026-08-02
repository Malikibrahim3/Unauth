'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { Button, Drawer, Input, Card } from '@/components/ui';
import type { ConditionOperator, MerchantRule, RuleAction, RuleCondition } from '@/lib/rules-engine';
import { RULE_FIELDS } from '@/lib/rules/fields';
import { ACTION_LABELS, summarizeConditions } from '@/lib/rules/summary';
import { cn } from '@/lib/utils';
import { ConditionBlock } from './ConditionBlock';

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
      footer={
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          {error ? (
            <span className="text-caption" style={{ color: 'var(--ua-risk-high)' }}>{error}</span>
          ) : (
            <span className="text-caption" style={{ color: 'var(--ua-text-tertiary)' }}>
              Unauth runs your rules — you own the decision.
            </span>
          )}
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={!canSave} loading={saving}>
              Save rule
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-6 p-5">
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
          <textarea
            value={description}
            placeholder="e.g. Item-not-received over £75 with no proof of delivery should go to manual review before a reship."
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="ua-text-body w-full resize-none px-3 py-2 focus:outline-none"
            style={{
              background: 'var(--ua-surface-muted)',
              border: '1px solid var(--ua-border-default)',
              borderRadius: 'var(--ua-radius-control)',
              color: 'var(--ua-text-primary)',
            }}
          />
        </Field>

        {/* Causal rule anatomy: a case reaches the rule, conditions decide a match, then Unauth recommends. */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="ua-text-working-title" style={{ color: 'var(--ua-text-primary)' }}>If</span>
              <p className="mt-0.5 text-caption" style={{ color: 'var(--ua-text-tertiary)' }}>
                When a case reaches this rule, check these conditions.
              </p>
            </div>
            {conditions.length > 1 && (
              <div
                className="inline-flex overflow-hidden rounded-[var(--ua-radius-control)]"
                style={{ border: '1px solid var(--ua-border-default)' }}
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
              className="flex items-start gap-2 rounded-[var(--ua-radius-control)] p-3 text-caption"
              style={{ background: 'var(--ua-surface-muted)', color: 'var(--ua-risk-medium, var(--ua-text-secondary))' }}
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
        </div>

        {/* Recommended action */}
        <Field label="Recommend" hint="What Unauth recommends when this rule matches. An authorised merchant user still decides the case.">
          <div className="grid grid-cols-3 gap-2">
            {ACTIONS.map((a) => {
              const active = action === a;
              return (
                <button
                  key={a}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setAction(a)}
                  className={cn('ua-option-tile', active && 'is-selected')}
                >
                  {ACTION_LABELS[a]}
                </button>
              );
            })}
          </div>
        </Field>

        {/* Live preview */}
        <Card unstyled variant="muted" className="p-4">
          <span className="ua-text-metadata" style={{ color: 'var(--ua-text-tertiary)' }}>
            When → If → Recommend
          </span>
          <p className="mt-2 text-body-sm" style={{ color: 'var(--ua-text-primary)' }}>
            If {preview}
          </p>
          <p className="ua-text-working-title mt-3" style={{ color: 'var(--ua-text-primary)' }}>
            Recommend: {ACTION_LABELS[action]}
          </p>
        </Card>
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
      <span className="ua-text-working-title" style={{ color: 'var(--ua-text-primary)' }}>
        {label}
        {required && <span style={{ color: 'var(--ua-risk-high)' }}> *</span>}
      </span>
      {children}
      {hint && (
        <span className="text-caption" style={{ color: 'var(--ua-text-tertiary)' }}>{hint}</span>
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
        background: active ? 'var(--ua-action-primary)' : 'transparent',
        color: active ? 'var(--ua-action-primary-fg)' : 'var(--ua-text-secondary)',
      }}
    >
      {children}
    </button>
  );
}
