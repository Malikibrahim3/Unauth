'use client';

import { Trash2 } from 'lucide-react';
import { Input, Select } from '@/components/ui';
import { OPERATOR_LABELS, type RuleCondition } from '@/lib/rules-engine';
import {
  CATEGORY_LABELS,
  FIELD_DEFS_BY_NAME,
  FIELD_LABELS,
  RULE_FIELDS,
  type RuleFieldCategory,
  type RuleFieldDef,
} from '@/lib/rules/fields';
import styles from './AutomationControls.module.css';

interface ConditionBlockProps {
  condition: RuleCondition;
  onChange: (next: RuleCondition) => void;
  onRemove: () => void;
  disabled?: boolean;
}

// Merchant-facing claim review rules lead with payout-case facts and merchant
// history. Network identity fields and raw scores are not selectable.
const CATEGORY_ORDER: RuleFieldCategory[] = [
  'current_claim',
  'payout',
  'claim_evidence',
  'delivery',
  'claim_history',
  'order',
  'outcome_history',
];

/** A sensible default value for a freshly-selected field + operator pairing. */
function defaultValueFor(def: RuleFieldDef, operator: string): unknown {
  switch (def.type) {
    case 'integer':
    case 'decimal':
      return 0;
    case 'boolean':
      return true;
    case 'enum':
      return operator === 'in' || operator === 'not_in' ? [] : (def.options?.[0]?.value ?? '');
    case 'string_array':
      return operator === 'contains_any' ? [] : (def.options?.[0]?.value ?? '');
    default:
      return null;
  }
}

export function ConditionBlock({ condition, onChange, onRemove, disabled }: ConditionBlockProps) {
  const def = FIELD_DEFS_BY_NAME[condition.field];

  const handleFieldChange = (field: string) => {
    const nextDef = FIELD_DEFS_BY_NAME[field]!;
    const operator = nextDef.operators[0]!;
    onChange({ ...condition, field, operator, value: defaultValueFor(nextDef, operator) });
  };

  const handleOperatorChange = (operator: string) => {
    if (!def) return;
    onChange({ ...condition, operator, value: defaultValueFor(def, operator) });
  };

  const toggleMulti = (optionValue: string) => {
    const current = Array.isArray(condition.value) ? (condition.value as string[]) : [];
    const next = current.includes(optionValue)
      ? current.filter((v) => v !== optionValue)
      : [...current, optionValue];
    onChange({ ...condition, value: next });
  };

  const isMulti =
    def != null &&
    ((def.type === 'enum' && (condition.operator === 'in' || condition.operator === 'not_in')) ||
      (def.type === 'string_array' && condition.operator === 'contains_any'));

  return (
    <div className={styles.conditionBlock}>
          {/* Field */}
          <Select
            aria-label="Condition field"
            value={condition.field}
            disabled={disabled}
            onChange={(e) => handleFieldChange(e.target.value)}
          >
            {CATEGORY_ORDER.map((category) => {
              const fields = RULE_FIELDS.filter(
                (f) =>
                  f.category === category,
              );
              if (fields.length === 0) return null;
              return (
                <optgroup key={category} label={CATEGORY_LABELS[category]}>
                  {fields.map((f) => (
                    <option key={f.field} value={f.field}>
                      {FIELD_LABELS[f.field] ?? f.field}
                    </option>
                  ))}
                </optgroup>
              );
            })}
            {/* Keep an existing (e.g. legacy/advanced) selection editable even if
                it is no longer part of the payout-policy field set. */}
            {def && !CATEGORY_ORDER.includes(def.category) && (
              <optgroup label="Advanced">
                <option value={condition.field}>{FIELD_LABELS[condition.field] ?? condition.field}</option>
              </optgroup>
            )}
          </Select>

          {/* Operator */}
          <Select
            aria-label="Condition operator"
            value={condition.operator}
            disabled={disabled || !def}
            onChange={(e) => handleOperatorChange(e.target.value)}
          >
            {(def?.operators ?? []).map((op) => (
              <option key={op} value={op}>
                {OPERATOR_LABELS[op] ?? op}
              </option>
            ))}
          </Select>
        <div>{renderValueInput()}</div>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label="Remove condition"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--uo-route-radius-control)] text-[var(--uo-route-text-tertiary)] hover:bg-[var(--uo-route-surface-hover)] hover:text-[var(--uo-route-risk-high)]"
        >
          <Trash2 className="h-4 w-4" />
        </button>
    </div>
  );

  function renderValueInput() {
    if (!def) return null;

    if (isMulti) {
      const selected = Array.isArray(condition.value) ? (condition.value as string[]) : [];
      return (
        <div className={styles.choiceList}>
          {(def.options ?? []).map((opt) => {
            const active = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => toggleMulti(opt.value)}
                className={styles.choice}
                data-active={active}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      );
    }

    if (def.type === 'boolean') {
      return (
        <Select
          aria-label="Condition value"
          value={condition.value === true ? 'true' : 'false'}
          disabled={disabled}
          onChange={(e) => onChange({ ...condition, value: e.target.value === 'true' })}
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </Select>
      );
    }

    if (def.type === 'enum' || def.type === 'string_array') {
      // single-select (eq/neq, or contains/not_contains for claim_types)
      const value = typeof condition.value === 'string' ? condition.value : '';
      return (
        <Select
          aria-label="Condition value"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
        >
          <option value="" disabled>
            Select a value…
          </option>
          {(def.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      );
    }

    // numeric
    const numericValue = typeof condition.value === 'number' ? condition.value : '';
    return (
      <Input
        type="number"
        aria-label="Condition value"
        inputMode={def.type === 'integer' ? 'numeric' : 'decimal'}
        step={def.type === 'integer' ? 1 : 'any'}
        value={numericValue}
        disabled={disabled}
        placeholder={def.field === 'order_value_usd' ? 'e.g. 500' : 'e.g. 3'}
        onChange={(e) => {
          const raw = e.target.value;
          onChange({ ...condition, value: raw === '' ? null : Number(raw) });
        }}
      />
    );
  }
}
