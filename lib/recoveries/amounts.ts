export type RecoveryAmounts = { sought: number; recovered: number; writtenOff: number };

export type RecoveryAmountSource = {
  merchant_loss_amount: number;
  eligible_loss_amount?: number | null;
  estimated_recoverable_max?: number | null;
  amount_recovered?: number | null;
};

/**
 * The amount actively pursued. An explicit recovery estimate is the bounded
 * claim amount; eligibility is a ceiling, not an amount automatically sought.
 */
export function recoverySoughtAmount(input: RecoveryAmountSource): number {
  const planned = input.estimated_recoverable_max
    ?? input.eligible_loss_amount
    ?? input.merchant_loss_amount;
  return Math.max(planned, input.amount_recovered ?? 0);
}

export function recoveryOutstanding({ sought, recovered, writtenOff }: RecoveryAmounts): number {
  if (![sought, recovered, writtenOff].every(Number.isFinite)) throw new Error('Recovery amounts must be finite');
  if (sought < 0 || recovered < 0 || writtenOff < 0) throw new Error('Recovery amounts cannot be negative');
  if (recovered + writtenOff > sought) throw new Error('Recovered plus written-off amount cannot exceed amount sought');
  return sought - recovered - writtenOff;
}

export function validateCumulativeRecovery(input: { sought: number; previousRecovered: number; nextRecovered: number }) {
  if (input.nextRecovered < input.previousRecovered) throw new Error('Cumulative recovery cannot decrease; record a reversal instead');
  recoveryOutstanding({ sought: input.sought, recovered: input.nextRecovered, writtenOff: 0 });
  return input.nextRecovered;
}
