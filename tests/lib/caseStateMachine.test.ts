import {
  canTransitionDecisionState,
  canTransitionRecoveryState,
  validateCaseTransition,
} from '@/lib/cases/stateMachine';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CaseVersionConflictError, transitionCase } from '@/lib/cases/transitionCase';
import { TABLES } from '@/lib/supabase/tables';
import { createMemoryClient, rowsOf } from '@/tests/lib/supabaseMemoryClient';

describe('case state machine', () => {
  it('uses the persisted workflow axis values', () => {
    expect(canTransitionDecisionState('undecided', 'approve_refund')).toBe(true);
    expect(canTransitionDecisionState('decision_recorded', 'reversed')).toBe(true);
    expect(canTransitionDecisionState('decision_recorded', 'approve_refund')).toBe(false);
    expect(canTransitionRecoveryState('recovery_possible', 'recovery_opened')).toBe(true);
    expect(canTransitionRecoveryState('recovery_opened', 'recovery_submitted')).toBe(true);
    expect(canTransitionRecoveryState('recovery_submitted', 'recovery_paid')).toBe(true);
  });

  it('rejects invalid axes without accepting a partial transition', () => {
    expect(validateCaseTransition(
      { status: 'open', payoutDecisionState: 'undecided', recoveryState: 'no_recovery_needed' },
      { status: 'pending', payoutDecisionState: 'reversed' },
    )).toEqual({ ok: false, rejected: ['status', 'payout_decision_state'] });
  });

  it('allows one concurrent transition and rejects the stale writer', async () => {
    const memory = createMemoryClient();
    memory.__store.set(TABLES.MERCHANT_CLAIMS, [{
      id: 'case-1', merchant_id: 'merchant-1', status: 'open', state_version: 1,
      payout_decision_state: 'undecided', recovery_state: 'no_recovery_needed',
    }]);
    const client = memory as unknown as SupabaseClient;
    const input = {
      merchantId: 'merchant-1', caseId: 'case-1', expectedVersion: 1,
      patch: { status: 'manual_review' }, reason: 'Concurrent review',
    };
    const results = await Promise.allSettled([
      transitionCase(client, { ...input, idempotencyKey: 'case-transition-writer-1' }),
      transitionCase(client, { ...input, idempotencyKey: 'case-transition-writer-2' }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    expect(rejected?.reason).toBeInstanceOf(CaseVersionConflictError);
    expect(rowsOf(memory, TABLES.MERCHANT_CLAIMS)[0].state_version).toBe(2);
  });
});
