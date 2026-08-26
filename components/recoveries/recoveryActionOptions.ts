import type { RecoveryCase } from '@/lib/recoveries/types';

export type RecoveryAction =
  | 'ready'
  | 'submitted'
  | 'chased'
  | 'approved'
  | 'partially_approved'
  | 'rejected'
  | 'appealed'
  | 'closed_unrecoverable';

export type RecoveryActionOption = {
  action: RecoveryAction;
  label: string;
  statuses: RecoveryCase['status'][];
  amountKind?: 'approved';
};

export const RECOVERY_ACTIONS: RecoveryActionOption[] = [
  { action: 'ready', label: 'Mark ready', statuses: ['draft', 'evidence_needed'] },
  { action: 'submitted', label: 'Record submission', statuses: ['ready_to_submit'] },
  { action: 'chased', label: 'Record chase', statuses: ['submitted', 'waiting_response', 'chase_due'] },
  { action: 'approved', label: 'Record approval', statuses: ['submitted', 'waiting_response', 'chase_due'], amountKind: 'approved' },
  { action: 'partially_approved', label: 'Record partial approval', statuses: ['submitted', 'waiting_response', 'chase_due'], amountKind: 'approved' },
  { action: 'rejected', label: 'Record rejection', statuses: ['submitted', 'waiting_response', 'chase_due'] },
  { action: 'appealed', label: 'Record appeal', statuses: ['rejected'] },
  { action: 'closed_unrecoverable', label: 'Write off outstanding', statuses: ['draft', 'evidence_needed', 'ready_to_submit', 'submitted', 'waiting_response', 'chase_due', 'approved', 'partially_approved', 'rejected', 'appealed'] },
];

export function recoveryActionAvailable(item: RecoveryCase, option: RecoveryActionOption) {
  if (!option.statuses.includes(item.status)) return false;
  if (option.action === 'ready') return item.evidence_complete && item.evidence_missing.length === 0;
  return true;
}

export function recoveryNextAction(item: RecoveryCase) {
  if (item.status === 'evidence_needed') return 'Complete missing evidence';
  if (item.status === 'draft') return 'Review recovery pack';
  if (item.status === 'ready_to_submit') return 'Submit externally, then record it';
  if (item.status === 'chase_due') return 'Contact the external owner';
  if (item.status === 'submitted' || item.status === 'waiting_response') return 'Await or chase source response';
  if (item.status === 'approved' || item.status === 'partially_approved') return 'Await a source credit, then match and reconcile it';
  if (item.status === 'rejected') return 'Review rejection or appeal';
  if (item.status === 'appealed') return 'Await appeal outcome';
  if (item.status === 'paid') return 'Recovery reconciled';
  return 'Closed as unrecoverable';
}

export function recoveryActionConsequence(action: RecoveryAction) {
  if (action === 'submitted') return 'Records that the merchant submitted externally. Unauth does not send the claim or correspondence.';
  if (action === 'approved' || action === 'partially_approved') return 'Records the amount approved by the source. Approval is not recovered cash.';
  if (action === 'closed_unrecoverable') return 'Appends a written-off recovery outcome. Prior evidence, correspondence and financial entries remain visible.';
  if (action === 'rejected') return 'Records the source rejection and keeps the recovery available for an appeal when policy permits.';
  return 'Appends a recovery activity event without editing earlier events.';
}
