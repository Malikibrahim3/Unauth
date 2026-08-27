import type { LabelFamily } from '@/lib/ui/labels';

/**
 * The five canonical visual outcomes from §14.4 / §15.1 of the visual polish
 * plan. Each corresponds 1:1 to a `--ua-outcome-*` token; nothing else may
 * consume those tokens.
 */
export type OutcomeRole = 'prevented' | 'recovered' | 'realised' | 'open' | 'identified';

/**
 * §15.1 canonical outcome mapping — real source values only. This is a pure
 * lookup: no thresholds, no arithmetic, no data access. A value absent from
 * its family's map is not a financial outcome (it belongs to the workflow,
 * urgency, or trust axis instead) and resolves to `null`.
 *
 * `approved` / `partially_approved` (recoveryStatus, lossStatus) and
 * `needs_more_evidence` / `unknown` (recoverability) are deliberately
 * omitted: §15.1 marks them workflow states, not outcomes.
 */
const OUTCOME_MAPS: Partial<Record<LabelFamily, Partial<Record<string, OutcomeRole>>>> = {
  caseStatus: {
    new: 'open',
    open: 'open',
    pending: 'open',
    resolved_won: 'recovered',
    resolved_refunded: 'realised',
    resolved_lost: 'realised',
    resolved_denied: 'prevented',
    voided: 'open',
  },
  recoverability: {
    recoverable: 'open',
    possibly_recoverable: 'open',
    not_recoverable: 'realised',
  },
  recoveryStatus: {
    recovery_possible: 'open',
    recovery_opened: 'open',
    recovery_submitted: 'open',
    no_recovery_needed: 'prevented',
    recovery_paid: 'recovered',
    paid: 'recovered',
    rejected: 'realised',
    closed_unrecoverable: 'realised',
  },
  lossStatus: {
    detected: 'open',
    collecting_evidence: 'open',
    denied: 'realised',
    expired: 'realised',
    closed_unrecoverable: 'realised',
  },
};

/**
 * Map an enum value to its canonical visual outcome. `null` means "this
 * value is not an outcome" — the consumer must then fall back to the
 * workflow, urgency, or trust axis instead of an `--ua-outcome-*` token.
 */
export function outcomeRole(family: LabelFamily, value: string): OutcomeRole | null {
  return OUTCOME_MAPS[family]?.[value] ?? null;
}
