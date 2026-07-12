import type { RecoveryCaseEventType, RecoveryCaseStatus } from '@/lib/recoveries/types';

/**
 * Board columns group every recovery status into a visible column so a card can
 * never disappear by entering an un-rendered status. Each column may hold more
 * than one status (e.g. submitted + waiting_response live together).
 */
export const RECOVERY_BOARD_COLUMNS: Array<{ key: string; label: string; statuses: RecoveryCaseStatus[] }> = [
  { key: 'collecting_evidence', label: 'Collecting evidence', statuses: ['draft', 'evidence_needed'] },
  { key: 'pack_ready', label: 'Pack ready', statuses: ['ready_to_submit'] },
  { key: 'submitted_or_waiting', label: 'Submitted / waiting', statuses: ['submitted', 'waiting_response'] },
  { key: 'needs_correspondence', label: 'Needs correspondence', statuses: ['chase_due'] },
  { key: 'source_approved', label: 'Source approved', statuses: ['approved', 'partially_approved'] },
  { key: 'source_denied', label: 'Source denied', statuses: ['rejected', 'appealed'] },
  { key: 'recovered', label: 'Recovered', statuses: ['paid'] },
  { key: 'closed', label: 'Closed unrecoverable', statuses: ['closed_unrecoverable'] },
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
