import type { WorkflowCondition } from '@/lib/workflows/types';

function get(payload: Record<string, unknown>, path: string): unknown { return path.split('.').reduce<unknown>((value, key) => value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, payload); }
export function evaluateConditions(conditions: WorkflowCondition[], payload: Record<string, unknown>): boolean {
  return conditions.every((condition) => {
    const actual = get(payload, condition.field);
    if (condition.operator === 'exists') return actual !== undefined && actual !== null;
    if (condition.operator === 'eq') return actual === condition.value;
    if (condition.operator === 'neq') return actual !== condition.value;
    return Array.isArray(condition.value) && condition.value.includes(actual);
  });
}
