import { sumSameCurrency } from '@/lib/utils/format';

export type LossFinancialSummary = {
  confirmed_loss_minor: number;
  estimated_loss_minor: number;
  recoverable_minor: number;
  recovered_minor: number;
  known_states: string[] | null;
};

export type LossFinancialDisplay = {
  realisedLossMinor: number | null;
  estimatedLossMinor: number | null;
  recoverableMinor: number | null;
  recoveredMinor: number | null;
};

function knownMinor(
  summary: LossFinancialSummary,
  state: string,
  value: number,
): number | null {
  return summary.known_states?.includes(state) ? value : null;
}

/**
 * Converts the zero-defaulted financial projection into display values without
 * turning an absent stage into a proven zero. The loss-case estimate is an
 * independent nullable source and remains a valid fallback for recoverability.
 */
export function lossFinancialDisplay(
  summary: LossFinancialSummary | null | undefined,
  estimatedRecoveryMinor: number | null,
): LossFinancialDisplay {
  if (!summary) {
    return {
      realisedLossMinor: null,
      estimatedLossMinor: null,
      recoverableMinor: estimatedRecoveryMinor,
      recoveredMinor: null,
    };
  }

  return {
    realisedLossMinor: knownMinor(
      summary,
      'confirmed_loss',
      summary.confirmed_loss_minor,
    ),
    estimatedLossMinor: knownMinor(
      summary,
      'estimated_loss',
      summary.estimated_loss_minor,
    ),
    recoverableMinor:
      knownMinor(summary, 'recoverable', summary.recoverable_minor) ??
      estimatedRecoveryMinor,
    recoveredMinor: knownMinor(
      summary,
      'recovered',
      summary.recovered_minor,
    ),
  };
}

export type LossExposureRow = {
  realisedLossMinor: number | null;
  estimatedLossMinor: number | null;
  currency: string | null;
  writtenOff: boolean;
};

export function isLossWrittenOff(
  status: string,
  writtenOffAt: string | null,
): boolean {
  return writtenOffAt != null || status === 'closed_unrecoverable';
}

export type KnownLossExposure = {
  total: number | null;
  currency: string | null;
  mixedCount: number;
  known: boolean;
};

/**
 * Aggregates only renderable, known values. A represented zero stays £0.00;
 * no represented values stay unavailable instead of collapsing to zero.
 */
export function summarizeKnownLossExposure(
  rows: LossExposureRow[],
): KnownLossExposure {
  const represented = rows.filter((row) => {
    const amountMinor = row.realisedLossMinor ?? row.estimatedLossMinor;
    return !row.writtenOff && amountMinor != null && Boolean(row.currency?.trim());
  });

  if (represented.length === 0) {
    return { total: null, currency: null, mixedCount: 0, known: false };
  }

  const result = sumSameCurrency(
    represented,
    (row) =>
      ((row.realisedLossMinor ?? row.estimatedLossMinor) as number) / 100,
    (row) => row.currency,
  );

  return { ...result, known: true };
}
