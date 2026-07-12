/**
 * lib/rules/summary.ts
 *
 * Pure helpers that render rule conditions as natural language for the UI.
 * Used by RuleCard, RuleTemplatesDrawer, and the live preview in
 * RuleBuilderDrawer. Shares the field/operator catalogue + labels so copy
 * stays consistent with the engine's justification output.
 */

import { FIELD_LABELS, OPERATOR_LABELS, type RuleCondition } from '@/lib/rules-engine';
import { FIELD_DEFS_BY_NAME } from '@/lib/rules/fields';

function optionLabel(field: string, value: string): string {
  const def = FIELD_DEFS_BY_NAME[field];
  return def?.options?.find((o) => o.value === value)?.label ?? value;
}

function formatConditionValue(field: string, value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((v) => optionLabel(field, String(v))).join(' or ');
  }
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (field === 'order_value_usd' && typeof value === 'number') {
    return `$${value.toLocaleString()}`;
  }
  const def = FIELD_DEFS_BY_NAME[field];
  if (def && (def.type === 'enum' || def.type === 'string_array')) {
    return optionLabel(field, String(value));
  }
  return String(value ?? '—');
}

export function summarizeCondition(condition: Partial<RuleCondition>): string {
  const fieldLabel = condition.field ? FIELD_LABELS[condition.field] ?? condition.field : '—';
  const opLabel = condition.operator ? OPERATOR_LABELS[condition.operator] ?? condition.operator : '';
  const valueLabel =
    condition.value === undefined || condition.value === null
      ? '…'
      : formatConditionValue(condition.field ?? '', condition.value);
  return `${fieldLabel} ${opLabel} ${valueLabel}`.replace(/\s+/g, ' ').trim();
}

export function summarizeConditions(
  conditions: Array<Partial<RuleCondition>>,
  operator: 'and' | 'or',
): string {
  if (conditions.length === 0) return 'Matches every identity (no conditions)';
  const joiner = operator === 'and' ? ' AND ' : ' OR ';
  return conditions.map(summarizeCondition).join(joiner);
}

export const ACTION_LABELS: Record<string, string> = {
  approve: 'Approve payout',
  manual_review: 'Manual review',
  deny: 'Deny under policy',
};

export const ACTION_TONES: Record<string, 'success' | 'warning' | 'danger'> = {
  approve: 'success',
  manual_review: 'warning',
  deny: 'danger',
};
