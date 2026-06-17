/**
 * lib/rules/fields.ts
 *
 * Single source of truth for the rule field catalogue: which fields exist,
 * their value type, which operators are valid for each, and the enum options.
 *
 * Used by:
 *   - the dashboard rule builder UI (field/operator/value pickers)
 *   - server-side condition validation (validateConditions)
 *
 * Display labels live in lib/rules-engine.ts (FIELD_LABELS / OPERATOR_LABELS)
 * and are re-exported here so there is one place to change copy.
 */

import {
  FIELD_LABELS,
  OPERATOR_LABELS,
  type ConfidenceGrade,
  type RuleAction,
  type RuleCondition,
} from '@/lib/rules-engine';
import { CANONICAL_CLAIM_TYPES, CLAIM_TYPE_LABELS } from '@/lib/claims/claimTypes';

export { FIELD_LABELS, OPERATOR_LABELS };

export type RuleFieldType = 'integer' | 'decimal' | 'boolean' | 'enum' | 'string_array';
export type RuleFieldCategory = 'evidence' | 'identity' | 'claim_history' | 'order';

export interface EnumOption {
  value: string;
  label: string;
}

export interface RuleFieldDef {
  field: string;
  type: RuleFieldType;
  category: RuleFieldCategory;
  operators: string[];
  /** For enum + string_array fields, the selectable options. */
  options?: EnumOption[];
}

const NUMERIC_OPERATORS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'];
const BOOLEAN_OPERATORS = ['eq'];
const ENUM_OPERATORS = ['eq', 'neq', 'in', 'not_in'];
const STRING_ARRAY_OPERATORS = ['contains', 'not_contains', 'contains_any'];

export const CONFIDENCE_GRADE_OPTIONS: EnumOption[] = [
  { value: 'definite', label: 'Definite' },
  { value: 'probable', label: 'Probable' },
  { value: 'possible', label: 'Possible' },
  { value: 'weak', label: 'Weak' },
];

// Canonical = the DB `claim_type` enum (single source of truth for stored/evaluated
// values). Friendly labels are display-only. Legacy shorthand (INR/refund) is gone.
export const CLAIM_TYPE_OPTIONS: EnumOption[] = CANONICAL_CLAIM_TYPES.map((value) => ({
  value,
  label: CLAIM_TYPE_LABELS[value],
}));

export const EVIDENCE_LEVEL_OPTIONS: EnumOption[] = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'some', label: 'Some' },
  { value: 'substantial', label: 'Substantial' },
  { value: 'extensive', label: 'Extensive' },
];

export const RULE_FIELDS: RuleFieldDef[] = [
  // Evidence
  { field: 'evidence_score', type: 'integer', category: 'evidence', operators: NUMERIC_OPERATORS },
  { field: 'evidence_level', type: 'enum', category: 'evidence', operators: ENUM_OPERATORS, options: EVIDENCE_LEVEL_OPTIONS },
  { field: 'has_sufficient_data', type: 'boolean', category: 'evidence', operators: BOOLEAN_OPERATORS },
  // Identity
  { field: 'confidence_grade', type: 'enum', category: 'identity', operators: ENUM_OPERATORS, options: CONFIDENCE_GRADE_OPTIONS },
  { field: 'has_cross_merchant_identity', type: 'boolean', category: 'identity', operators: BOOLEAN_OPERATORS },
  { field: 'is_network_flagged', type: 'boolean', category: 'identity', operators: BOOLEAN_OPERATORS },
  // Claim history
  { field: 'network_claim_count', type: 'integer', category: 'claim_history', operators: NUMERIC_OPERATORS },
  { field: 'merchant_claim_count', type: 'integer', category: 'claim_history', operators: NUMERIC_OPERATORS },
  { field: 'days_since_last_claim', type: 'integer', category: 'claim_history', operators: NUMERIC_OPERATORS },
  { field: 'network_merchant_count', type: 'integer', category: 'claim_history', operators: NUMERIC_OPERATORS },
  { field: 'claim_types', type: 'string_array', category: 'claim_history', operators: STRING_ARRAY_OPERATORS, options: CLAIM_TYPE_OPTIONS },
  // Order
  { field: 'order_value_usd', type: 'decimal', category: 'order', operators: NUMERIC_OPERATORS },
  { field: 'account_age_days', type: 'integer', category: 'order', operators: NUMERIC_OPERATORS },
];

export const FIELD_DEFS_BY_NAME: Record<string, RuleFieldDef> = Object.fromEntries(
  RULE_FIELDS.map((f) => [f.field, f]),
);

export const RULE_ACTIONS: RuleAction[] = ['approve', 'manual_review', 'deny'];

export const CATEGORY_LABELS: Record<RuleFieldCategory, string> = {
  evidence: 'Evidence',
  identity: 'Identity',
  claim_history: 'Claim history',
  order: 'Order',
};

export function operatorsForField(field: string): string[] {
  return FIELD_DEFS_BY_NAME[field]?.operators ?? [];
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ConditionValidationError {
  index: number;
  message: string;
}

const VALID_GRADES: ConfidenceGrade[] = ['definite', 'probable', 'possible', 'weak'];
const VALID_CLAIM_TYPES = CLAIM_TYPE_OPTIONS.map((o) => o.value);

function valueMatchesType(def: RuleFieldDef, operator: string, value: unknown): string | null {
  switch (def.type) {
    case 'integer':
    case 'decimal': {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return `${def.field} requires a numeric value`;
      }
      if (def.type === 'integer' && !Number.isInteger(value)) {
        return `${def.field} requires a whole number`;
      }
      return null;
    }
    case 'boolean': {
      if (typeof value !== 'boolean') return `${def.field} requires true or false`;
      return null;
    }
    case 'enum': {
      if (operator === 'in' || operator === 'not_in') {
        if (!Array.isArray(value) || value.length === 0) {
          return `${def.field} requires a non-empty list of values`;
        }
        const allowed = def.field === 'confidence_grade' ? VALID_GRADES : (def.options ?? []).map((o) => o.value);
        if (!value.every((v) => allowed.includes(v as ConfidenceGrade))) {
          return `${def.field} contains an invalid option`;
        }
        return null;
      }
      const allowed = def.field === 'confidence_grade' ? VALID_GRADES : (def.options ?? []).map((o) => o.value);
      if (!allowed.includes(value as ConfidenceGrade)) {
        return `${def.field} requires a valid option`;
      }
      return null;
    }
    case 'string_array': {
      if (operator === 'contains' || operator === 'not_contains') {
        if (typeof value !== 'string' || !VALID_CLAIM_TYPES.includes(value)) {
          return `${def.field} requires a valid claim type`;
        }
        return null;
      }
      // contains_any
      if (!Array.isArray(value) || value.length === 0) {
        return `${def.field} requires a non-empty list of claim types`;
      }
      if (!value.every((v) => typeof v === 'string' && VALID_CLAIM_TYPES.includes(v))) {
        return `${def.field} contains an invalid claim type`;
      }
      return null;
    }
    default:
      return 'Unknown field type';
  }
}

/**
 * Validates an array of conditions against the field catalogue.
 * Rejects invalid field names, operators incompatible with the field type, and
 * missing/incorrectly-typed values. Returns [] when every condition is valid.
 *
 * An empty conditions array is allowed (a "matches everything" rule) — the UI
 * surfaces a warning, but the server does not reject it.
 */
export function validateConditions(conditions: unknown): ConditionValidationError[] {
  if (!Array.isArray(conditions)) {
    return [{ index: -1, message: 'Conditions must be an array' }];
  }
  const errors: ConditionValidationError[] = [];
  conditions.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object') {
      errors.push({ index, message: 'Condition must be an object' });
      return;
    }
    const c = raw as Partial<RuleCondition>;
    if (typeof c.id !== 'string' || !c.id.trim()) {
      errors.push({ index, message: 'Condition is missing an id' });
    }
    if (typeof c.field !== 'string' || !(c.field in FIELD_DEFS_BY_NAME)) {
      errors.push({ index, message: `Unknown field "${String(c.field)}"` });
      return;
    }
    const def = FIELD_DEFS_BY_NAME[c.field]!;
    if (typeof c.operator !== 'string' || !def.operators.includes(c.operator)) {
      errors.push({ index, message: `Operator "${String(c.operator)}" is not valid for ${c.field}` });
      return;
    }
    if (c.value === undefined || c.value === null) {
      errors.push({ index, message: `${c.field} requires a value` });
      return;
    }
    const typeError = valueMatchesType(def, c.operator, c.value);
    if (typeError) errors.push({ index, message: typeError });
  });
  return errors;
}
