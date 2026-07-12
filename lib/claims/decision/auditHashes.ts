/**
 * Stable hashes for rule evaluation audit deduplication.
 */
import { createHash } from 'crypto';
import type { MerchantRule, RuleSignals } from '@/lib/rules-engine';

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

export function hashSignals(signals: RuleSignals): string {
  return createHash('sha256').update(stableStringify(signals)).digest('hex').slice(0, 16);
}

export function hashRules(rules: MerchantRule[]): string {
  const payload = rules
    .filter((r) => r.is_active)
    .sort((a, b) => a.priority - b.priority)
    .map((r) => ({
      id: r.id,
      priority: r.priority,
      action: r.action,
      condition_operator: r.condition_operator,
      conditions: r.conditions,
    }));
  return createHash('sha256').update(stableStringify(payload)).digest('hex').slice(0, 16);
}

export function buildDedupeKey(input: {
  claimId: string;
  evaluationSource: string;
  signalsHash: string;
  rulesHash: string;
}): string {
  return `${input.claimId}:${input.evaluationSource}:${input.rulesHash}:${input.signalsHash}`;
}

export const AUDIT_DEDUPE_WINDOW_MS = 5 * 60 * 1000;
