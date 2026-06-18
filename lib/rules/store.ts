/**
 * lib/rules/store.ts
 *
 * Persistence + orchestration for the merchant rules engine.
 *
 * Pure evaluation logic lives in lib/rules-engine.ts. This module owns:
 *   - Zod request schemas for the /api/rules routes
 *   - fetching a merchant's active rules
 *   - running an evaluation AND writing the audit row (rule_evaluations)
 *
 * Merchant isolation: every query here is scoped to a merchantId that the
 * caller has already resolved from the authenticated session / widget token —
 * never from the request body.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { TABLES } from '@/lib/supabase/tables';
import {
  AUDIT_DEDUPE_WINDOW_MS,
  buildDedupeKey,
  hashRules,
  hashSignals,
} from '@/lib/claims/decision/auditHashes';
import {
  evaluateRules,
  type IdentitySignals,
  type MerchantRule,
  type RuleAction,
  type RuleCondition,
  type RuleEvaluationResult,
  type RuleSignals,
} from '@/lib/rules-engine';

// ---------------------------------------------------------------------------
// Request schemas
// ---------------------------------------------------------------------------

const conditionSchema = z.object({
  id: z.string().min(1),
  field: z.string().min(1),
  operator: z.string().min(1),
  value: z.unknown(),
});

const actionSchema = z.enum(['approve', 'manual_review', 'deny']);
const operatorSchema = z.enum(['and', 'or']);

export const createRuleSchema = z.object({
  name: z.string().trim().min(1, 'Rule name is required').max(120),
  description: z.string().trim().max(500).nullish(),
  conditions: z.array(conditionSchema).default([]),
  action: actionSchema,
  condition_operator: operatorSchema.default('and'),
  priority: z.number().int().min(0).optional(),
});

export const updateRuleSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).nullable(),
    conditions: z.array(conditionSchema),
    action: actionSchema,
    condition_operator: operatorSchema,
    is_active: z.boolean(),
    priority: z.number().int().min(0),
  })
  .partial();

export const reorderSchema = z.object({
  order: z
    .array(z.object({ id: z.string().uuid(), priority: z.number().int().min(0) }))
    .min(1),
});

export const evaluateSchema = z.object({
  claim_id: z.string().uuid().nullish(),
  identity_id: z.string().uuid().nullish(),
  signals: z.object({
    confidence_grade: z.enum(['definite', 'probable', 'possible', 'weak']),
    network_claim_count: z.number(),
    merchant_claim_count: z.number(),
    days_since_last_claim: z.number().nullable(),
    has_cross_merchant_identity: z.boolean(),
    network_merchant_count: z.number(),
    claim_types: z.array(z.string()),
    order_value_usd: z.number().nullable(),
    account_age_days: z.number().nullable(),
    is_network_flagged: z.boolean(),
    evidence_score: z.number(),
    evidence_level: z.enum(['minimal', 'some', 'substantial', 'extensive']),
    has_sufficient_data: z.boolean(),
  }),
});

export type CreateRuleInput = z.infer<typeof createRuleSchema>;
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>;

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

interface MerchantRuleRow {
  id: string;
  merchant_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  priority: number;
  conditions: unknown;
  action: string;
  condition_operator: string;
}

export function mapRuleRow(row: MerchantRuleRow): MerchantRule {
  return {
    id: row.id,
    merchant_id: row.merchant_id,
    name: row.name,
    description: row.description,
    is_active: row.is_active,
    priority: row.priority,
    conditions: Array.isArray(row.conditions) ? (row.conditions as RuleCondition[]) : [],
    action: row.action as RuleAction,
    condition_operator: row.condition_operator === 'or' ? 'or' : 'and',
  };
}

const RULE_COLUMNS =
  'id, merchant_id, name, description, is_active, priority, conditions, action, condition_operator, is_default_template, created_at, updated_at';

export { RULE_COLUMNS };

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function fetchActiveMerchantRules(
  client: SupabaseClient,
  merchantId: string,
): Promise<MerchantRule[]> {
  const { data, error } = await client
    .from(TABLES.MERCHANT_RULES)
    .select(RULE_COLUMNS)
    .eq('merchant_id', merchantId)
    .eq('is_active', true)
    .order('priority', { ascending: true });
  if (error) throw new Error(`Failed to load merchant rules: ${error.message}`);
  return (data ?? []).map((row) => mapRuleRow(row as MerchantRuleRow));
}

// ---------------------------------------------------------------------------
// Evaluation + audit
// ---------------------------------------------------------------------------

export interface RunEvaluationInput {
  client: SupabaseClient;
  merchantId: string;
  claimId?: string | null;
  identityId?: string | null;
  signals: RuleSignals;
}

/**
 * Per-rule trace written to rule_evaluations.all_rules_evaluated for audit.
 * First matching rule by priority wins; this records what every active rule did.
 */
interface RuleTraceEntry {
  rule_id: string;
  rule_name: string;
  priority: number;
  matched: boolean;
  is_winner: boolean;
}

function buildRulesTrace(
  signals: RuleSignals,
  rules: MerchantRule[],
  winnerRuleId: string | null,
): RuleTraceEntry[] {
  return [...rules]
    .filter((r) => r.is_active)
    .sort((a, b) => a.priority - b.priority)
    .map((rule) => {
      // Evaluate this rule in isolation to record its individual match outcome.
      const single = evaluateRules(signals, [rule]);
      return {
        rule_id: rule.id,
        rule_name: rule.name,
        priority: rule.priority,
        matched: single.recommendation !== 'no_match',
        is_winner: rule.id === winnerRuleId,
      };
    });
}

/**
 * Writes the audit row for an evaluation. Never skipped — even for no_match.
 * A failed audit write is logged but does not throw, so it can never break the
 * recommendation surface.
 */
export async function writeRuleEvaluationAudit(
  client: SupabaseClient,
  input: {
    merchantId: string;
    claimId?: string | null;
    identityId?: string | null;
    signals: RuleSignals;
    rules: MerchantRule[];
    result: RuleEvaluationResult;
  },
): Promise<void> {
  const trace = buildRulesTrace(input.signals, input.rules, input.result.rule_id);
  const { error } = await client.from(TABLES.RULE_EVALUATIONS).insert({
    merchant_id: input.merchantId,
    claim_id: input.claimId ?? null,
    identity_id: input.identityId ?? null,
    rule_id: input.result.rule_id,
    recommendation: input.result.recommendation,
    matched_conditions: input.result.matched_conditions,
    all_rules_evaluated: trace,
  });
  if (error) {
    console.error('[rules-engine] failed to write rule_evaluations audit row', error.message);
  }
}

export type RuleAuditStatus = 'written' | 'deduped' | 'failed';

export interface ClaimRuleEvaluationAuditInput {
  merchantId: string;
  claimId: string;
  identityId?: string | null;
  sourceTicketId?: string | null;
  signals: RuleSignals;
  rules: MerchantRule[];
  result: RuleEvaluationResult;
  evaluationSource: string;
  actorId?: string | null;
  evaluatedAt?: string;
}

/**
 * Writes a claim-bound audit row with full traceability metadata embedded in
 * all_rules_evaluated (preserves array shape for existing verify scripts).
 */
export async function writeClaimRuleEvaluationAudit(
  client: SupabaseClient,
  input: ClaimRuleEvaluationAuditInput,
): Promise<RuleAuditStatus> {
  const evaluatedAt = input.evaluatedAt ?? new Date().toISOString();
  const signalsHash = hashSignals(input.signals);
  const rulesHash = hashRules(input.rules);
  const dedupeKey = buildDedupeKey({
    claimId: input.claimId,
    evaluationSource: input.evaluationSource,
    signalsHash,
    rulesHash,
  });

  const since = new Date(Date.now() - AUDIT_DEDUPE_WINDOW_MS).toISOString();
  const { data: recent } = await client
    .from(TABLES.RULE_EVALUATIONS)
    .select('id')
    .eq('merchant_id', input.merchantId)
    .eq('dedupe_key', dedupeKey)
    .gte('evaluated_at', since)
    .limit(1)
    .maybeSingle();

  if (recent?.id) {
    return 'deduped';
  }

  const trace = buildRulesTrace(input.signals, input.rules, input.result.rule_id);
  const justificationSummary =
    input.result.justification_lines.length > 0
      ? input.result.justification_lines.join(' · ')
      : input.result.justification;

  const auditPayload = [
    ...trace,
    {
      _kind: 'claim_evaluation_metadata',
      evaluation_source: input.evaluationSource,
      source_ticket_id: input.sourceTicketId ?? null,
      actor_id: input.actorId ?? null,
      evaluated_at: evaluatedAt,
      signals_snapshot: input.signals,
      signals_hash: signalsHash,
      rules_hash: rulesHash,
      dedupe_key: dedupeKey,
      justification_lines: input.result.justification_lines,
    },
  ];

  const { error } = await client.from(TABLES.RULE_EVALUATIONS).insert({
    merchant_id: input.merchantId,
    claim_id: input.claimId,
    identity_id: input.identityId ?? null,
    source_ticket_id: input.sourceTicketId ?? null,
    evaluation_source: input.evaluationSource,
    signals_hash: signalsHash,
    context_hash: signalsHash,
    rules_hash: rulesHash,
    justification_summary: justificationSummary,
    dedupe_key: dedupeKey,
    rule_id: input.result.rule_id,
    recommendation: input.result.recommendation,
    matched_conditions: input.result.matched_conditions,
    all_rules_evaluated: auditPayload,
    evaluated_at: evaluatedAt,
  });
  if (error) {
    console.error('[rules-engine] failed to write claim rule_evaluations audit row', {
      message: error.message,
      claimId: input.claimId,
      evaluationSource: input.evaluationSource,
    });
    return 'failed';
  }
  return 'written';
}

/**
 * Runs the engine against the merchant's active rules, writes the audit row,
 * and returns the evaluation result.
 */
export async function runRuleEvaluation(
  input: RunEvaluationInput,
): Promise<RuleEvaluationResult> {
  const { client, merchantId, claimId, identityId, signals } = input;

  const rules = await fetchActiveMerchantRules(client, merchantId);
  const result = evaluateRules(signals, rules);
  await writeRuleEvaluationAudit(client, { merchantId, claimId, identityId, signals, rules, result });
  return result;
}
