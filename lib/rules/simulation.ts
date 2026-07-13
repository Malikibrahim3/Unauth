import { FIELD_DEFS_BY_NAME } from '@/lib/rules/fields';
import type { RuleCondition, RuleSignalBag } from '@/lib/rules-engine';

export function validateSimulationSignals(
  conditions: RuleCondition[],
  input: unknown,
): { ok: true; signals: RuleSignalBag } | { ok: false; error: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'Structured simulation fields are required' };
  const values = input as Record<string, unknown>;
  if (Object.keys(values).length > 50) return { ok: false, error: 'Too many simulation fields' };
  const required = [...new Set(conditions.map((condition) => condition.field))];
  for (const field of required) {
    const def = FIELD_DEFS_BY_NAME[field];
    if (!def) return { ok: false, error: `Stored rule references unsupported field ${field}` };
    if (!(field in values)) return { ok: false, error: `Simulation value required for ${field}` };
    const value = values[field];
    if (value === null) continue;
    if ((def.type === 'integer' || def.type === 'decimal') && (typeof value !== 'number' || !Number.isFinite(value))) return { ok: false, error: `${field} must be numeric or unavailable` };
    if (def.type === 'integer' && typeof value === 'number' && !Number.isInteger(value)) return { ok: false, error: `${field} must be a whole number` };
    if (def.type === 'boolean' && typeof value !== 'boolean') return { ok: false, error: `${field} must be yes, no or unavailable` };
    if (def.type === 'enum' && typeof value !== 'string') return { ok: false, error: `${field} must be one supported value or unavailable` };
    if (def.type === 'string_array' && (!Array.isArray(value) || !value.every((item) => typeof item === 'string'))) return { ok: false, error: `${field} must be a list of values or unavailable` };
  }
  return { ok: true, signals: Object.fromEntries(required.map((field) => [field, values[field]])) };
}
