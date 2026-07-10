import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import type { ClaimGateClaimType, ClaimGateEvidence } from '@/lib/claim-gate/types';
import type { LossSourceClassification, RecommendedRecoveryTask } from '@/lib/accountability/types';

export type RecoveryEligibility = true | false | 'pending_evidence' | 'unknown';

export type MatchedAgreementRule = {
  id: string;
  agreement_id: string;
  rule_code: string;
  rule_name: string;
  rule_type: string;
  result: Record<string, unknown>;
  counterparty_name: string | null;
};

export type AgreementRuleEvaluationResult = {
  recovery_eligible: RecoveryEligibility;
  recovery_route: string;
  reason: string;
  matched_rules: MatchedAgreementRule[];
  required_evidence: string[];
  missing_evidence: string[];
  deadline: string | null;
  expected_recovery_amount: number;
  recommended_task: RecommendedRecoveryTask['task_type'] | null;
  warning: string | null;
};

type AgreementRuleRow = {
  id: string;
  agreement_id: string;
  rule_code: string;
  rule_name: string;
  rule_type: string;
  applies_to_claim_type: string;
  conditions: Record<string, unknown>;
  result: Record<string, unknown>;
  priority: number;
  counterparty_name: string | null;
};

function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (!acc || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[part];
  }, obj);
}

function compare(condition: Record<string, unknown>, context: Record<string, unknown>): boolean {
  const actual = getPath(context, String(condition.field ?? ''));
  const expected = condition.value;
  switch (condition.op) {
    case 'eq': return actual === expected;
    case 'neq': return actual !== expected;
    case 'gte': return Number(actual ?? 0) >= Number(expected);
    case 'lte': return Number(actual ?? 0) <= Number(expected);
    case 'gt': return Number(actual ?? 0) > Number(expected);
    case 'lt': return Number(actual ?? 0) < Number(expected);
    case 'in': return Array.isArray(expected) && expected.includes(actual);
    case 'missing': return actual == null || actual === false || actual === '';
    case 'contains': return String(actual ?? '').toLowerCase().includes(String(expected ?? '').toLowerCase());
    default: return false;
  }
}

function evaluateConditions(conditions: Record<string, unknown>, context: Record<string, unknown>): boolean {
  const all = Array.isArray(conditions.all) ? conditions.all as Record<string, unknown>[] : null;
  const any = Array.isArray(conditions.any) ? conditions.any as Record<string, unknown>[] : null;
  if (all) return all.every((condition) => compare(condition, context));
  if (any) return any.some((condition) => compare(condition, context));
  return false;
}

function numberResult(result: Record<string, unknown>, key: string, fallback: number): number {
  const n = Number(result[key] ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function taskType(value: unknown): RecommendedRecoveryTask['task_type'] | null {
  const text = typeof value === 'string' ? value : null;
  if (
    text === 'OPEN_CARRIER_CLAIM' ||
    text === 'CONTACT_3PL' ||
    text === 'REQUEST_CUSTOMER_EVIDENCE' ||
    text === 'REQUEST_CARRIER_EVIDENCE' ||
    text === 'ESCALATE_TO_MANAGER' ||
    text === 'PREPARE_CHARGEBACK_EVIDENCE' ||
    text === 'REVIEW_POLICY_OVERRIDE' ||
    text === 'REVIEW_AGENT_ACTION' ||
    text === 'WRITE_OFF_APPROVAL' ||
    text === 'OTHER'
  ) return text;
  return null;
}

function deadlineFromRule(result: Record<string, unknown>, evidence: ClaimGateEvidence): string | null {
  const explicit = typeof result.deadline === 'string' ? result.deadline : null;
  if (explicit) return explicit;
  const days = Number(result.deadline_days);
  if (!Number.isFinite(days)) return null;
  const deliveredAt = evidence.summary.delivered_at ? Date.parse(evidence.summary.delivered_at) : Date.now();
  if (!Number.isFinite(deliveredAt)) return null;
  return new Date(deliveredAt + days * 24 * 60 * 60 * 1000).toISOString();
}

function defaultResult(warning: string | null): AgreementRuleEvaluationResult {
  return {
    recovery_eligible: 'unknown',
    recovery_route: 'NONE',
    reason: warning ?? 'No active agreement rule matched this claim.',
    matched_rules: [],
    required_evidence: [],
    missing_evidence: [],
    deadline: null,
    expected_recovery_amount: 0,
    recommended_task: null,
    warning,
  };
}

export async function evaluateAgreementRules(input: {
  client: SupabaseClient;
  merchantId: string;
  claimId: string;
  claimType: ClaimGateClaimType;
  evidence: ClaimGateEvidence;
  lossSource: LossSourceClassification;
}): Promise<AgreementRuleEvaluationResult> {
  const { data, error } = await input.client
    .from(TABLES.AGREEMENT_RULES)
    .select('id,agreement_id,rule_code,rule_name,rule_type,applies_to_claim_type,conditions,result,priority,counterparty_name')
    .eq('merchant_id', input.merchantId)
    .eq('status', 'active')
    .order('priority', { ascending: true });
  if (error) throw new Error(`agreement_rules_lookup_failed: ${error.message}`);
  const rules = ((data ?? []) as AgreementRuleRow[])
    .filter((rule) => rule.applies_to_claim_type === 'ANY' || rule.applies_to_claim_type === input.claimType);

  if (rules.length === 0) {
    return defaultResult(
      input.lossSource.accountable_party_type === 'CARRIER'
        ? 'No agreement on file for this carrier/service. Recovery eligibility unknown.'
        : null,
    );
  }

  const context: Record<string, unknown> = {
    claim_type: input.claimType,
    order: input.evidence.order ?? {},
    shipment: {
      ...(input.evidence.shipment ?? {}),
      carrier: input.evidence.summary.carrier,
    },
    customer: input.evidence.claimHistory,
    summary: input.evidence.summary,
    days_since_delivery: input.evidence.summary.delivered_at
      ? Math.floor((Date.now() - Date.parse(input.evidence.summary.delivered_at)) / 86400000)
      : null,
    evidence: {
      damage_photos: false,
      packaging_photos: false,
      proof_of_delivery: input.evidence.summary.proof_of_delivery === 'PRESENT',
    },
    loss_source: input.lossSource,
  };

  const matched = rules.filter((rule) => evaluateConditions(rule.conditions, context));
  await Promise.all(rules.map((rule) => input.client.from(TABLES.AGREEMENT_RULE_EVALUATIONS).insert({
    claim_id: input.claimId,
    agreement_id: rule.agreement_id,
    agreement_rule_id: rule.id,
    merchant_id: input.merchantId,
    matched: matched.some((item) => item.id === rule.id),
    evaluation_summary: matched.some((item) => item.id === rule.id) ? `${rule.rule_code} matched` : `${rule.rule_code} did not match`,
    result: rule.result,
  })));

  if (matched.length === 0) return defaultResult(null);
  const primary = matched[0]!;
  const result = primary.result ?? {};
  const recoveryEligible = result.recovery_eligible === false
    ? false
    : result.recovery_eligible === 'pending_evidence'
      ? 'pending_evidence'
      : true;
  const missing = stringArray(result.missing_evidence);
  const required = stringArray(result.required_evidence);
  const deadline = deadlineFromRule(result, input.evidence);
  const reason = typeof result.reason === 'string'
    ? result.reason
    : typeof result.recommended_action === 'string'
      ? result.recommended_action
      : `${primary.rule_name} matched.`;

  return {
    recovery_eligible: recoveryEligible,
    recovery_route: typeof result.recovery_route === 'string' ? result.recovery_route : recoveryEligible === false ? 'NONE' : 'CARRIER_CLAIM',
    reason,
    matched_rules: matched.map((rule) => ({
      id: rule.id,
      agreement_id: rule.agreement_id,
      rule_code: rule.rule_code,
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      result: rule.result,
      counterparty_name: rule.counterparty_name,
    })),
    required_evidence: required,
    missing_evidence: missing,
    deadline,
    expected_recovery_amount: numberResult(result, 'expected_recovery_amount', input.lossSource.potential_recovery_amount),
    recommended_task: taskType(result.task_type),
    warning: null,
  };
}
