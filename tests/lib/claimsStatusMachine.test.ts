import {
  assertClaimStatusTransition,
  canTransitionClaimStatus,
  claimStatusForOutcome,
} from '@/lib/claims/statusMachine';

describe('claim status machine', () => {
  it('maps merchant outcomes to specific terminal statuses', () => {
    expect(claimStatusForOutcome({ decision: 'full_refund', outcome: 'loss' })).toBe('resolved_refunded');
    expect(claimStatusForOutcome({ decision: 'denied', outcome: 'legitimate' })).toBe('resolved_denied');
    expect(claimStatusForOutcome({ decision: 'chargeback_disputed', outcome: 'pending' })).toBe('escalated');
    expect(claimStatusForOutcome({ decision: 'no_action', outcome: 'chargeback_won' })).toBe('resolved_won');
    expect(claimStatusForOutcome({ decision: 'no_action', outcome: 'chargeback_lost' })).toBe('resolved_lost');
  });

  it('blocks backwards transitions without explicit reopen', () => {
    expect(canTransitionClaimStatus('resolved_refunded', 'open')).toBe(false);
    expect(() => assertClaimStatusTransition('resolved_refunded', 'open')).toThrow(
      'illegal_claim_status_transition: resolved_refunded -> open'
    );
  });

  it('allows explicit reopen from final or stale claims to open', () => {
    expect(assertClaimStatusTransition('resolved_won', 'open', { allowReopen: true })).toBe('open');
    expect(assertClaimStatusTransition('stale', 'open', { allowReopen: true })).toBe('open');
  });

  it('allows stale only from pending without reopen', () => {
    expect(assertClaimStatusTransition('pending', 'stale')).toBe('stale');
    expect(canTransitionClaimStatus('open', 'stale')).toBe(false);
  });

  it('blocks backward or unsupported transitions in the canonical diagram', () => {
    expect(canTransitionClaimStatus('open', 'pending')).toBe(false);
    expect(canTransitionClaimStatus('escalated', 'resolved_refunded')).toBe(false);
    expect(canTransitionClaimStatus('escalated', 'resolved_won')).toBe(true);
    expect(canTransitionClaimStatus('open', 'voided')).toBe(true);
  });

  it('allows forward progress through the v2 payout pipeline', () => {
    expect(canTransitionClaimStatus('open', 'manual_review')).toBe(true);
    expect(canTransitionClaimStatus('new', 'evidence_needed')).toBe(true);
    expect(canTransitionClaimStatus('evidence_needed', 'awaiting_carrier_response')).toBe(true);
    expect(canTransitionClaimStatus('ready_for_decision', 'decision_recorded')).toBe(true);
    expect(canTransitionClaimStatus('manual_review', 'recovery_opened')).toBe(true);
    expect(canTransitionClaimStatus('open', 'resolved_refunded')).toBe(true);
  });

  it('blocks transitions back to the pending entry state', () => {
    expect(canTransitionClaimStatus('manual_review', 'pending')).toBe(false);
    expect(canTransitionClaimStatus('ready_for_decision', 'pending')).toBe(false);
  });

  it('treats final statuses as terminal except void or explicit reopen', () => {
    expect(canTransitionClaimStatus('closed', 'manual_review')).toBe(false);
    expect(canTransitionClaimStatus('resolved_refunded', 'voided')).toBe(true);
    expect(canTransitionClaimStatus('recovery_opened', 'closed')).toBe(true);
  });
});
