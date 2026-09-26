'use client';
import { MONETARY_RULE_FIELDS } from '@/lib/rules-engine';

import { OPERATOR_LABELS, type RuleCondition } from '@/lib/rules-engine';
import { normalizeRuleOperator } from '@/lib/rules-engine';
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
  const operator = normalizeRuleOperator(condition.operator);
  const operatorSupported = Boolean(operator && def?.operators.includes(operator));

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
    ((def.type === 'enum' && (operator === 'in' || operator === 'not_in')) ||
      (def.type === 'string_array' && operator === 'contains_any'));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) minmax(150px, .7fr) minmax(180px, 1fr) 32px', gap: 8, alignItems: 'start', padding: 10, border: '1px solid #e4e3e0', borderRadius: 10, background: '#ffffff' }}>
          {/* Field */}
          <select
            aria-label="Condition field"
            value={condition.field}
            disabled={disabled}
            onChange={(e) => handleFieldChange(e.target.value)}
            style={controlStyle}
          >
            {!def ? <option value={condition.field} disabled>Unsupported field: {condition.field}</option> : null}
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
          </select>

          {/* Operator */}
          <select
            aria-label="Condition operator"
            value={operatorSupported ? operator! : condition.operator}
            disabled={disabled || !def}
            onChange={(e) => handleOperatorChange(e.target.value)}
            style={controlStyle}
          >
            {!operatorSupported ? <option value={condition.operator} disabled>Unsupported: {condition.operator || "missing operator"}</option> : null}
            {(def?.operators ?? []).map((op) => (
              <option key={op} value={op}>
                {OPERATOR_LABELS[op] ?? op}
              </option>
            ))}
          </select>
        <div>{renderValueInput()}</div>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label="Remove condition"
          style={{ width: 32, height: 32, flex: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 0, borderRadius: 8, background: 'transparent', color: '#6f6a63', cursor: disabled ? 'default' : 'pointer' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><path d="M2.8 4h8.4M5 4V2.6h4V4M4.2 4l.5 7.2h4.6l.5-7.2M5.9 6v3.2M8.1 6v3.2" /></svg>
        </button>
          {MONETARY_RULE_FIELDS.has(condition.field) ? <label style={{ gridColumn: '1 / -1', color: '#40454a', fontSize: 12 }}>Threshold currency (explicit confirmation)
        <input aria-label="Threshold currency" placeholder="ISO code, e.g. GBP" value={condition.currency ?? ''} disabled={disabled} maxLength={3} onChange={event => onChange({ ...condition, currency: event.target.value.toUpperCase() || null })} style={{ ...controlStyle, marginLeft: 8, width: 160 }} />
        {!condition.currency ? <span> Legacy currency is unknown; monetary comparisons remain inconclusive.</span> : null}
      </label> : null}
    </div>
  );

  function renderValueInput() {
    if (!def) return null;

    if (isMulti) {
      const selected = Array.isArray(condition.value) ? (condition.value as string[]) : [];
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(def.options ?? []).map((opt) => {
            const active = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => toggleMulti(opt.value)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 30, padding: '0 9px', border: '1px solid #ddd8d1', borderRadius: 8, background: selected ? '#fff3e9' : '#fff', color: selected ? '#7a5310' : '#40454a', fontSize: 11 }}
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
        <select
          aria-label="Condition value"
          value={condition.value === true ? 'true' : 'false'}
          disabled={disabled}
          onChange={(e) => onChange({ ...condition, value: e.target.value === 'true' })}
          style={controlStyle}
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    }

    if (def.type === 'enum' || def.type === 'string_array') {
      // single-select (eq/neq, or contains/not_contains for claim_types)
      const value = typeof condition.value === 'string' ? condition.value : '';
      return (
        <select
          aria-label="Condition value"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          style={controlStyle}
        >
          <option value="" disabled>
            Select a value…
          </option>
          {(def.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    // numeric
    const numericValue = typeof condition.value === 'number' ? condition.value : '';
    return (
      <input
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
        style={controlStyle}
      />
    );
  }
}

const controlStyle = { boxSizing: 'border-box', width: '100%', minWidth: 0, height: 34, padding: '0 9px', border: 0, borderRadius: 8, outline: 'none', background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.13)', color: '#1c1f23', font: "400 11.5px/1 'Inter',sans-serif" } as const;
