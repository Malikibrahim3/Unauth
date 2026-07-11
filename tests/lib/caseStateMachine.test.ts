import {
  canTransitionDecisionState,
  canTransitionRecoveryState,
  validateCaseTransition,
} from '@/lib/cases/stateMachine';

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
});
