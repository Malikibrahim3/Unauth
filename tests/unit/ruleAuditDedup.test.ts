import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AUDIT_DEDUPE_WINDOW_MS,
  buildDedupeKey,
  hashRules,
  hashSignals,
} from '@/lib/claims/decision/auditHashes';
import { writeClaimRuleEvaluationAudit, writeRuleEvaluationAudit } from '@/lib/rules/store';
import type { MerchantRule, RuleEvaluationResult } from '@/lib/rules-engine';

const baseSignals = {
  confidence_grade: 'probable' as const,
  network_claim_count: 0,
  merchant_claim_count: 2,
  days_since_last_claim: 10,
  has_cross_merchant_identity: false,
  network_merchant_count: 1,
  claim_types: ['item_not_received'],
  order_value_usd: 100,
  account_age_days: 200,
  is_network_flagged: false,
  evidence_score: 40,
  evidence_level: 'some' as const,
  has_sufficient_data: true,
  claim_type: 'item_not_received',
};

const baseRules: MerchantRule[] = [
  {
    id: 'r1',
    merchant_id: 'm1',
    name: 'Test rule',
    description: null,
    is_active: true,
    priority: 0,
    conditions: [{ id: 'a', field: 'merchant_claim_count', operator: 'gte', value: 1 }],
    action: 'manual_review',
    condition_operator: 'and',
  },
];

const baseResult: RuleEvaluationResult = {
  recommendation: 'manual_review',
  rule_id: 'r1',
  rule_name: 'Test rule',
  matched_conditions: [],
  justification: 'Rule matched',
  justification_lines: ['Rule "Test rule" triggered'],
};

function mockAuditClient(options?: { existingId?: string; existingDedupeKey?: string }) {
  const inserts: Record<string, unknown>[] = [];
  const existingId = options?.existingId ?? null;
  const existingDedupeKey = options?.existingDedupeKey ?? null;

  return {
    client: {
      from: (table: string) => {
        if (table !== 'rule_evaluations') throw new Error(`unexpected table ${table}`);
        return {
          select: () => ({
            eq: () => ({
              eq: (_col: string, dedupeKey: string) => ({
                gte: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({
                      data:
                        existingId && existingDedupeKey && dedupeKey === existingDedupeKey
                          ? { id: existingId }
                          : null,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
          insert: async (row: Record<string, unknown>) => {
            inserts.push(row);
            return { error: null };
          },
        };
      },
    } as unknown as SupabaseClient,
    inserts,
  };
}

describe('auditHashes', () => {
  it('builds stable dedupe keys for identical inputs', () => {
    const signalsHash = hashSignals(baseSignals);
    const rulesHash = hashRules(baseRules);
    const keyA = buildDedupeKey({
      claimId: 'c1',
      evaluationSource: 'gorgias_widget',
      signalsHash,
      rulesHash,
    });
    const keyB = buildDedupeKey({
      claimId: 'c1',
      evaluationSource: 'gorgias_widget',
      signalsHash,
      rulesHash,
    });
    expect(keyA).toBe(keyB);
  });

  it('changes dedupe key when signals change', () => {
    const rulesHash = hashRules(baseRules);
    const keyA = buildDedupeKey({
      claimId: 'c1',
      evaluationSource: 'gorgias_widget',
      signalsHash: hashSignals(baseSignals),
      rulesHash,
    });
    const keyB = buildDedupeKey({
      claimId: 'c1',
      evaluationSource: 'gorgias_widget',
      signalsHash: hashSignals({ ...baseSignals, merchant_claim_count: 5 }),
      rulesHash,
    });
    expect(keyA).not.toBe(keyB);
  });

  it('uses a five-minute dedupe window constant', () => {
    expect(AUDIT_DEDUPE_WINDOW_MS).toBe(5 * 60 * 1000);
  });
});

describe('writeClaimRuleEvaluationAudit', () => {
  it('writes audit on first evaluation', async () => {
    const { client, inserts } = mockAuditClient();
    const status = await writeClaimRuleEvaluationAudit(client, {
      merchantId: 'm1',
      claimId: 'c1',
      sourceTicketId: 't1',
      signals: baseSignals,
      rules: baseRules,
      result: baseResult,
      evaluationSource: 'gorgias_widget',
    });
    expect(status).toBe('written');
    expect(inserts).toHaveLength(1);
    expect(inserts[0].source_ticket_id).toBe('t1');
    expect(inserts[0].dedupe_key).toBeTruthy();
    expect(inserts[0].justification_summary).toContain('Test rule');
  });

  it('dedupes duplicate widget refresh within window', async () => {
    const signalsHash = hashSignals(baseSignals);
    const rulesHash = hashRules(baseRules);
    const dedupeKey = buildDedupeKey({
      claimId: 'c1',
      evaluationSource: 'gorgias_widget',
      signalsHash,
      rulesHash,
    });
    const { client, inserts } = mockAuditClient({ existingId: 'existing-audit', existingDedupeKey: dedupeKey });
    const status = await writeClaimRuleEvaluationAudit(client, {
      merchantId: 'm1',
      claimId: 'c1',
      signals: baseSignals,
      rules: baseRules,
      result: baseResult,
      evaluationSource: 'gorgias_widget',
    });
    expect(status).toBe('deduped');
    expect(inserts).toHaveLength(0);
  });

  it('writes new audit when signals hash changes', async () => {
    const { client, inserts } = mockAuditClient();
    const status = await writeClaimRuleEvaluationAudit(client, {
      merchantId: 'm1',
      claimId: 'c1',
      signals: { ...baseSignals, merchant_claim_count: 9 },
      rules: baseRules,
      result: baseResult,
      evaluationSource: 'gorgias_widget',
    });
    expect(status).toBe('written');
    expect(inserts).toHaveLength(1);
  });

  it('writes new audit when rules change', async () => {
    const signalsHash = hashSignals(baseSignals);
    const rulesHash = hashRules(baseRules);
    const dedupeKey = buildDedupeKey({
      claimId: 'c1',
      evaluationSource: 'gorgias_widget',
      signalsHash,
      rulesHash,
    });
    const changedRules: MerchantRule[] = [
      { ...baseRules[0], id: 'r2', name: 'Changed rule' },
    ];
    const { client, inserts } = mockAuditClient({ existingId: 'existing-audit', existingDedupeKey: dedupeKey });
    const status = await writeClaimRuleEvaluationAudit(client, {
      merchantId: 'm1',
      claimId: 'c1',
      signals: baseSignals,
      rules: changedRules,
      result: { ...baseResult, rule_id: 'r2', rule_name: 'Changed rule' },
      evaluationSource: 'gorgias_widget',
    });
    expect(status).toBe('written');
    expect(inserts).toHaveLength(1);
  });

  it('snapshots the full winning rule definition, not just its id', async () => {
    const { client, inserts } = mockAuditClient();
    await writeClaimRuleEvaluationAudit(client, {
      merchantId: 'm1',
      claimId: 'c1',
      signals: baseSignals,
      rules: baseRules,
      result: baseResult,
      evaluationSource: 'gorgias_widget',
    });
    expect(inserts[0].rule_snapshot).toEqual(baseRules[0]);
  });

  it('snapshots null on no_match', async () => {
    const { client, inserts } = mockAuditClient();
    await writeClaimRuleEvaluationAudit(client, {
      merchantId: 'm1',
      claimId: 'c1',
      signals: baseSignals,
      rules: baseRules,
      result: { ...baseResult, rule_id: null, rule_name: null, recommendation: 'no_match' },
      evaluationSource: 'gorgias_widget',
    });
    expect(inserts[0].rule_snapshot).toBeNull();
  });
});

describe('writeRuleEvaluationAudit', () => {
  it('snapshots the full winning rule definition alongside rule_id', async () => {
    const { client, inserts } = mockAuditClient();
    await writeRuleEvaluationAudit(client, {
      merchantId: 'm1',
      claimId: 'c1',
      signals: baseSignals,
      rules: baseRules,
      result: baseResult,
    });
    expect(inserts).toHaveLength(1);
    expect(inserts[0].rule_id).toBe('r1');
    expect(inserts[0].rule_snapshot).toEqual(baseRules[0]);
  });

  it('remains accurate to the rule as evaluated even if the same rule id is later edited', async () => {
    const { client, inserts } = mockAuditClient();
    await writeRuleEvaluationAudit(client, {
      merchantId: 'm1',
      claimId: 'c1',
      signals: baseSignals,
      rules: baseRules,
      result: baseResult,
    });
    const editedRule: MerchantRule = { ...baseRules[0], action: 'deny', priority: 5 };
    expect(inserts[0].rule_snapshot).not.toEqual(editedRule);
    expect((inserts[0].rule_snapshot as MerchantRule).action).toBe('manual_review');
  });
});
