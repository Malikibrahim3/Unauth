'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, Plus } from 'lucide-react';
import { Badge, Button, Drawer, Input } from '@/components/ui';
import type { ConditionOperator, MerchantRule, RuleAction, RuleCondition } from '@/lib/rules-engine';
import { RULE_FIELDS } from '@/lib/rules/fields';
import {
  DEFAULT_MANUAL_REVIEW_RANGE,
  activeRiskScoreRanges,
  clampRiskScore,
  findOverlappingRiskControl,
  formatRiskScoreRange,
  makeRiskScoreRangeConditions,
  parseRiskScoreRange,
  riskScorePolicyCoverageError,
  type RiskScoreRange,
} from '@/lib/rules/riskBands';
import { ACTION_LABELS, ACTION_TONES, summarizeConditions } from '@/lib/rules/summary';
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

function blankCondition(): RuleCondition {
  const def = RULE_FIELDS.find((field) => field.field === 'evidence_score') ?? RULE_FIELDS[0]!;
  const operator = def.operators.includes('gte') ? 'gte' : def.operators[0]!;
  return { id: newConditionId(), field: def.field, operator, value: DEFAULT_MANUAL_REVIEW_RANGE.lower };
}

/**
 * Form state initialises directly from props. The parent passes a `key` that
 * changes on each open / target rule, so the component remounts with fresh
 * state — no synchronising effect needed.
 */
export function RuleBuilderDrawer({
  open,
  mode,
  initialRule,
  existingRules = [],
  onClose,
  onSubmit,
}: RuleBuilderDrawerProps) {
  const initialRange = initialRule ? parseRiskScoreRange(initialRule) : null;
  const [name, setName] = useState(() => (mode === 'edit' ? initialRule?.name ?? '' : 'Manual review threshold'));
  const [description, setDescription] = useState(() => (mode === 'edit' ? initialRule?.description ?? '' : ''));
  const [lowerScore, setLowerScore] = useState(() => initialRange?.lower ?? DEFAULT_MANUAL_REVIEW_RANGE.lower);
  const [upperScore, setUpperScore] = useState(() => initialRange?.upper ?? DEFAULT_MANUAL_REVIEW_RANGE.upper);
  const [conditions, setConditions] = useState<RuleCondition[]>(() =>
    mode === 'edit' && initialRule
      ? initialRule.conditions.map((c) => ({ ...c }))
      : makeRiskScoreRangeConditions(DEFAULT_MANUAL_REVIEW_RANGE),
  );
  const [operator, setOperator] = useState<ConditionOperator>(() =>
    mode === 'edit' ? initialRule?.condition_operator ?? 'and' : 'and',
  );
  const [advancedOpen, setAdvancedOpen] = useState(() => mode === 'edit' && initialRule != null && initialRange == null);
  const [action, setAction] = useState<RuleAction>(() =>
    mode === 'edit' ? initialRule?.action ?? 'manual_review' : 'manual_review',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scoreRange: RiskScoreRange = useMemo(
    () => ({ lower: lowerScore, upper: upperScore }),
    [lowerScore, upperScore],
  );
  const rangeError = lowerScore > upperScore ? 'The lower score must be less than or equal to the upper score.' : null;
  const overlappingRule = !advancedOpen && !rangeError
    ? findOverlappingRiskControl(existingRules, scoreRange, mode === 'edit' ? initialRule?.id : null)
    : null;
  const overlapError = overlappingRule
    ? `This range overlaps "${overlappingRule.name}". Score bands cannot overlap.`
    : null;
  const coverageError = !advancedOpen && !rangeError && !overlapError
    ? riskScorePolicyCoverageError(
        activeRiskScoreRanges(existingRules, {
          range: scoreRange,
          excludeRuleId: mode === 'edit' ? initialRule?.id : null,
        }),
      )
    : null;
  const validationError = rangeError ?? overlapError ?? coverageError;
  const effectiveConditions = useMemo(
    () => (advancedOpen ? conditions : makeRiskScoreRangeConditions(scoreRange)),
    [advancedOpen, conditions, scoreRange],
  );
  const preview = useMemo(
    () => (advancedOpen ? summarizeConditions(conditions, operator) : formatRiskScoreRange(scoreRange)),
    [advancedOpen, conditions, operator, scoreRange],
  );
  const canSave = name.trim().length > 0 && !saving && !validationError;

  const updateCondition = (index: number, next: RuleCondition) => {
    setConditions((prev) => prev.map((c, i) => (i === index ? next : c)));
  };
  const removeCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };
  const toggleAdvanced = () => {
    if (!advancedOpen) setConditions(makeRiskScoreRangeConditions(scoreRange));
    setAdvancedOpen((value) => !value);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Rule name is required.');
      return;
    }
    if (validationError) return;
    setSaving(true);
    setError(null);
    const ok = await onSubmit(
      {
        name: name.trim(),
        description: description.trim() ? description.trim() : null,
        conditions: effectiveConditions,
        action,
        condition_operator: advancedOpen ? operator : 'and',
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
      title={mode === 'edit' ? 'Edit risk control' : 'New risk control'}
      footer={
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          {validationError ? (
            <span className="text-caption" style={{ color: 'var(--risk-high)' }}>{validationError}</span>
          ) : error ? (
            <span className="text-caption" style={{ color: 'var(--risk-high)' }}>{error}</span>
          ) : (
            <span className="text-caption" style={{ color: 'var(--text-tertiary)' }}>
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
        <Field label="Control name" required>
          <Input
            value={name}
            placeholder="e.g. Manual review high-risk claims"
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        {/* Description */}
        <Field label="Description" hint="Optional — explains what behaviour this threshold is meant to catch.">
          <textarea
            value={description}
            placeholder="e.g. Repeat claim behaviour, network signals, and weak delivery context push this above our review threshold."
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full resize-none px-3 py-2 text-sm focus:outline-none"
            style={{
              background: 'var(--surface-sunken)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
            }}
          />
        </Field>

        {/* Risk range */}
        <Field label="Risk score range" hint="Unauth scores behaviour from 0 to 100. Every score must be covered by exactly one active control.">
          <div
            className="rounded-[var(--radius-md)] p-4"
            style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-muted)' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-display-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {lowerScore}-{upperScore}
                </div>
                <div className="text-caption" style={{ color: 'var(--text-tertiary)' }}>
                  Apply when {formatRiskScoreRange(scoreRange)}
                </div>
              </div>
              <div className="grid w-44 grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-caption" style={{ color: 'var(--text-tertiary)' }}>
                  From
                  <Input
                    type="number"
                    aria-label="Risk score range lower bound"
                    min={0}
                    max={100}
                    step={1}
                    value={lowerScore}
                    onChange={(e) => setLowerScore(clampRiskScore(Number(e.target.value)))}
                  />
                </label>
                <label className="flex flex-col gap-1 text-caption" style={{ color: 'var(--text-tertiary)' }}>
                  To
                  <Input
                    type="number"
                    aria-label="Risk score range upper bound"
                    min={0}
                    max={100}
                    step={1}
                    value={upperScore}
                    onChange={(e) => setUpperScore(clampRiskScore(Number(e.target.value)))}
                  />
                </label>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  marginLeft: `${lowerScore}%`,
                  width: `${lowerScore <= upperScore ? Math.max(1, upperScore - lowerScore) : 0}%`,
                  background: validationError ? 'var(--risk-high)' : 'var(--accent)',
                }}
              />
            </div>
            <div className="mt-2 flex justify-between text-caption" style={{ color: 'var(--text-tertiary)' }}>
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
            {validationError && (
              <p className="mt-3 text-caption" style={{ color: 'var(--risk-high)' }}>
                {validationError}
              </p>
            )}
          </div>
        </Field>

        {/* Control */}
        <Field label="Control to apply" hint="This is the recommended action your team sees when the threshold is crossed.">
          <div className="grid grid-cols-3 gap-2">
            {ACTIONS.map((a) => {
              const active = action === a;
              const tone = ACTION_TONES[a];
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAction(a)}
                  className="rounded-[var(--radius-md)] px-3 py-2 text-body-sm font-medium transition-colors"
                  style={{
                    background: active ? `var(--risk-${tone === 'success' ? 'low' : tone === 'warning' ? 'medium' : 'high'}-bg, var(--surface-sunken))` : 'var(--surface-sunken)',
                    border: `1px solid ${active ? `var(--risk-${tone === 'success' ? 'low' : tone === 'warning' ? 'medium' : 'high'}, var(--accent))` : 'var(--border)'}`,
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  {ACTION_LABELS[a]}
                </button>
              );
            })}
          </div>
        </Field>

        {/* Advanced conditions */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={toggleAdvanced}
            className="flex items-center justify-between rounded-[var(--radius-md)] px-3 py-2 text-left text-body-sm font-semibold transition-colors hover:bg-[var(--surface-hover)]"
            style={{ border: '1px solid var(--border-muted)', color: 'var(--text-primary)' }}
          >
            <span>Advanced conditions</span>
            <ChevronDown
              className="h-4 w-4 transition-transform"
              style={{ transform: advancedOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>

          {advancedOpen && (
            <>
          <div className="flex items-center justify-between">
            <span className="text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Conditions
            </span>
            {conditions.length > 1 && (
              <div
                className="inline-flex overflow-hidden rounded-[var(--radius-md)]"
                style={{ border: '1px solid var(--border)' }}
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
              className="flex items-start gap-2 rounded-[var(--radius-md)] p-3 text-caption"
              style={{ background: 'var(--surface-sunken)', color: 'var(--risk-medium, var(--text-secondary))' }}
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>This rule has no conditions — it will match every identity and always recommend <strong>{ACTION_LABELS[action]}</strong>.</span>
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
            </>
          )}
        </div>

        {/* Live preview */}
        <div
          className="rounded-[var(--radius-md)] p-4"
          style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-muted)' }}
        >
          <span className="text-caption font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
            Preview
          </span>
          <p className="mt-2 text-body-sm" style={{ color: 'var(--text-primary)' }}>
            If {preview}
          </p>
          <div className="mt-3">
            <Badge tone={ACTION_TONES[action]} variant="subtle" dot>
              Apply {ACTION_LABELS[action]}
            </Badge>
          </div>
        </div>
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
      <span className="text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        {label}
        {required && <span style={{ color: 'var(--risk-high)' }}> *</span>}
      </span>
      {children}
      {hint && (
        <span className="text-caption" style={{ color: 'var(--text-tertiary)' }}>{hint}</span>
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
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? 'var(--accent-contrast, #fff)' : 'var(--text-secondary)',
      }}
    >
      {children}
    </button>
  );
}
