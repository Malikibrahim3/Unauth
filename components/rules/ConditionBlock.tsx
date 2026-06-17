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

interface ConditionBlockProps {
  condition: RuleCondition;
  onChange: (next: RuleCondition) => void;
  onRemove: () => void;
  disabled?: boolean;
}

const CATEGORY_ORDER: RuleFieldCategory[] = ['evidence', 'identity', 'claim_history', 'order'];

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
    <div
      className="flex flex-col gap-2 rounded-[var(--radius-md)] p-3"
      style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-muted)' }}
    >
      <div className="flex items-start gap-2">
        <div className="grid flex-1 grid-cols-2 gap-2">
          {/* Field */}
          <Select
            aria-label="Condition field"
            value={condition.field}
            disabled={disabled}
            onChange={(e) => handleFieldChange(e.target.value)}
          >
            {CATEGORY_ORDER.map((category) => (
              <optgroup key={category} label={CATEGORY_LABELS[category]}>
                {RULE_FIELDS.filter((f) => f.category === category).map((f) => (
                  <option key={f.field} value={f.field}>
                    {FIELD_LABELS[f.field] ?? f.field}
                  </option>
                ))}
              </optgroup>
            ))}
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
        </div>

        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label="Remove condition"
          className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--risk-high)]"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Value */}
      <div>{renderValueInput()}</div>
    </div>
  );

  function renderValueInput() {
    if (!def) return null;

    if (isMulti) {
      const selected = Array.isArray(condition.value) ? (condition.value as string[]) : [];
      return (
        <div className="flex flex-wrap gap-1.5">
          {(def.options ?? []).map((opt) => {
            const active = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => toggleMulti(opt.value)}
                className="rounded-full px-2.5 py-1 text-caption font-medium transition-colors"
                style={{
                  background: active ? 'var(--accent)' : 'var(--surface)',
                  color: active ? 'var(--accent-contrast, #fff)' : 'var(--text-secondary)',
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                }}
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
