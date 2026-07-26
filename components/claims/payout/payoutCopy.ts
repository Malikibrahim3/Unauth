/**
 * components/claims/payout/payoutCopy.ts
 *
 * Approved, non-accusatory copy + tone helpers for the in-app payout case view.
 * Kept free of banned terms (see tests/banned-terms.test.ts). Color is used for
 * hierarchy, not alarm — restrained tones only.
 */
import type {
  AttributionConfidence,
  EvidenceStrength,
  Money,
  Recoverability,
} from '@/lib/payouts/types';
import { formatCurrency } from '@/lib/utils/format';
import { evidenceKeyLabel } from '@/lib/payouts/config';

export const PAYOUT_DISCLAIMER =
  'Compensation context and recovery route are recommendations from the available evidence. Responsibility remains separate and your team owns the customer decision.';

export type PayoutTone = 'success' | 'warning' | 'neutral';

export const TONE_STYLE: Record<PayoutTone, { bg: string; color: string }> = {
  success: { bg: 'var(--ua-success-bg)', color: 'var(--ua-success)' },
  warning: { bg: 'var(--ua-warning-bg)', color: 'var(--ua-warning)' },
  neutral: { bg: 'var(--ua-surface-secondary)', color: 'var(--ua-text-secondary)' },
};

export function strengthTone(strength: EvidenceStrength): PayoutTone {
  switch (strength) {
    case 'strong':
      return 'success';
    case 'weak':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function confidenceTone(confidence: AttributionConfidence): PayoutTone {
  switch (confidence) {
    case 'high':
      return 'success';
    case 'low':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function recoverabilityTone(recoverability: Recoverability): PayoutTone {
  switch (recoverability) {
    case 'recoverable':
      return 'success';
    case 'possibly_recoverable':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function formatPayoutMoney(money: Money): string {
  return formatCurrency(money.amount, money.currency ?? undefined);
}

/** Humanize a checklist item key (e.g. proof_of_delivery → "proof of delivery"). */
export function humanizeEvidenceKey(key: string): string {
  return evidenceKeyLabel(key);
}

/**
 * Defensive repair for persisted prose that may embed raw snake_case evidence
 * tokens (e.g. a `recovery_next_action` string written before the label layer
 * existed). Replaces any snake_case token with its human label so raw enums
 * never reach the DOM, and leaves ordinary words untouched.
 */
export function humanizeEvidenceProse(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g, (token) =>
    evidenceKeyLabel(token),
  );
}
