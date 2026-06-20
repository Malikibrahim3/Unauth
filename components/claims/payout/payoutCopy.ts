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

export const PAYOUT_DISCLAIMER =
  'Loss attribution and recovery route are advisory estimates from the available evidence. Your team owns the decision.';

export type PayoutTone = 'success' | 'warning' | 'neutral';

export const TONE_STYLE: Record<PayoutTone, { bg: string; color: string }> = {
  success: { bg: 'var(--success-bg)', color: 'var(--success)' },
  warning: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  neutral: { bg: 'var(--bg-inset)', color: 'var(--text-secondary)' },
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

const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', GBP: '£', EUR: '€' };

export function formatPayoutMoney(money: Money): string {
  const amount = money.amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (!money.currency) return amount;
  const symbol = CURRENCY_SYMBOLS[money.currency.toUpperCase()];
  return symbol ? `${symbol}${amount}` : `${money.currency} ${amount}`;
}

/** Humanize a checklist item key (e.g. proof_of_delivery → "proof of delivery"). */
export function humanizeEvidenceKey(key: string): string {
  return key.replace(/_/g, ' ');
}
