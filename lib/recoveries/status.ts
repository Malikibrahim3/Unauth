import type { RecoveryCaseEventType, RecoveryCaseStatus } from '@/lib/recoveries/types';

export type EvidencePackStatus = 'not_applicable' | 'complete' | 'partial';

export function evidencePackStatus(input: {
  evidence_required: readonly string[];
  evidence_missing: readonly string[];
  evidence_complete: boolean;
}): EvidencePackStatus {
  if (input.evidence_required.length === 0) return 'not_applicable';
  const missing = new Set(input.evidence_missing);
  return input.evidence_complete
    && input.evidence_missing.length === 0
    && input.evidence_required.every((requirement) => !missing.has(requirement))
    ? 'complete'
    : 'partial';
}

/**
 * Board columns group every recovery status into a visible column so a card can
 * never disappear by entering an un-rendered status. Each column may hold more
 * than one status (e.g. submitted + waiting_response live together).
 */
export const RECOVERY_BOARD_COLUMNS: Array<{ key: string; label: string; statuses: RecoveryCaseStatus[] }> = [
  { key: 'prepare', label: 'Prepare', statuses: ['draft', 'evidence_needed', 'ready_to_submit'] },
  { key: 'external', label: 'Submitted / follow up', statuses: ['submitted', 'waiting_response', 'chase_due'] },
  { key: 'outcome', label: 'Source outcome', statuses: ['approved', 'partially_approved', 'rejected', 'appealed'] },
  { key: 'reconciled', label: 'Reconciled', statuses: ['paid', 'closed_unrecoverable'] },
];

export function eventTypeForStatus(status: RecoveryCaseStatus): RecoveryCaseEventType {
  switch (status) {
    case 'submitted':
      return 'submitted';
    // 'chase_due' means a chase is now DUE — it is not a completed chase, so it
    // records a neutral status change. An actual chase is a separate 'chased'
    // event (see markRecoveryCaseChased).
    case 'approved':
      return 'approved';
    case 'partially_approved':
      return 'partially_approved';
    case 'rejected':
      return 'rejected';
    case 'appealed':
      return 'appealed';
    case 'paid':
      return 'paid';
    case 'closed_unrecoverable':
      return 'closed';
    default:
      return 'status_changed';
  }
}

export function nextStatusPatch(status: RecoveryCaseStatus): Record<string, string | null> {
  if (status === 'submitted') {
    const nextChase = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    return { next_chase_at: nextChase, last_chased_at: null };
  }
  // 'chase_due' must NOT touch last_chased_at — the chase has not happened yet.
  if (status === 'paid' || status === 'closed_unrecoverable') {
    return { next_chase_at: null };
  }
  return {};
}
