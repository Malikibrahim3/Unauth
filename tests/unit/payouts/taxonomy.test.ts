import {
  SUPPORT_PAYOUT_CASE_REASONS,
  SUPPORT_PAYOUT_CASE_STATUSES,
  toStoredClaimStatus,
  toStoredClaimType,
  toSupportPayoutCaseReason,
  toSupportPayoutCaseStatus,
} from '@/lib/payouts/taxonomy';
import { REQUESTED_ACTIONS } from '@/lib/payouts/types';

describe('support payout case taxonomy', () => {
  it('defines the MVP status, reason, and requested-action vocabularies', () => {
    expect(SUPPORT_PAYOUT_CASE_STATUSES).toEqual([
      'new',
      'evidence_needed',
      'awaiting_customer_evidence',
      'awaiting_carrier_response',
      'awaiting_3pl_response',
      'awaiting_supplier_response',
      'ready_for_decision',
      'manual_review',
      'decision_recorded',
      'recovery_opened',
      'closed',
    ]);
    expect(SUPPORT_PAYOUT_CASE_REASONS).toEqual(expect.arrayContaining([
      'item_not_received',
      'missing_item',
      'damaged_item',
      'wrong_item',
      'late_delivery',
      'refund_request',
      'reship_request',
      'replacement_request',
      'returnless_refund',
      'store_credit_request',
      'chargeback_related',
      'policy_exception',
      'supplier_defect',
      'warehouse_error',
      'carrier_issue',
      'unknown',
    ]));
    expect(REQUESTED_ACTIONS).toEqual(expect.arrayContaining([
      'refund',
      'reship',
      'replacement',
      'store_credit',
      'discount',
      'return_label',
      'investigation',
      'escalation',
      'unknown',
    ]));
  });

  it('maps legacy stored values to canonical payout-case values', () => {
    expect(toSupportPayoutCaseStatus('pending')).toBe('new');
    expect(toSupportPayoutCaseStatus('open')).toBe('ready_for_decision');
    expect(toSupportPayoutCaseStatus('resolved_denied')).toBe('closed');
    expect(toSupportPayoutCaseStatus('open', true)).toBe('recovery_opened');

    expect(toSupportPayoutCaseReason('damaged')).toBe('damaged_item');
    expect(toSupportPayoutCaseReason('chargeback')).toBe('chargeback_related');
    expect(toSupportPayoutCaseReason('other', 'warehouse_error')).toBe('warehouse_error');
  });

  it('maps canonical case inputs back to compatible stored values', () => {
    expect(toStoredClaimStatus('waiting_evidence')).toBe('evidence_needed');
    expect(toStoredClaimStatus('closed')).toBe('closed');

    expect(toStoredClaimType('missing_item')).toBe('item_not_received');
    expect(toStoredClaimType('damaged_item')).toBe('damaged');
    expect(toStoredClaimType('warehouse_error')).toBe('wrong_item');
    expect(toStoredClaimType('chargeback_related')).toBe('chargeback');
  });
});
