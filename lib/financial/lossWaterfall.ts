export type LossWaterfallAmount = {
  realisedLossMinor: number | null;
  estimatedLossMinor: number | null;
  recoveredMinor: number | null;
};

export type LossWaterfallStepModel = {
  key: string;
  label: string;
  valueMinor: number | null;
  direction: 'total' | 'add' | 'subtract';
};

export function buildLossWaterfall(
  loss: Record<string, unknown>,
  amount: LossWaterfallAmount,
): { steps: LossWaterfallStepModel[]; reconciled: boolean } {
  const lossMinor = amount.realisedLossMinor ?? amount.estimatedLossMinor;
  const recoveredMinor = amount.recoveredMinor;
  const lossLabel = amount.realisedLossMinor != null ? 'Confirmed loss' : 'Estimated loss';
  const adjustmentMinor = typeof loss.adjustment_minor === 'number' && Number.isSafeInteger(loss.adjustment_minor)
    ? loss.adjustment_minor
    : 0;
  if (lossMinor == null || recoveredMinor == null) return { steps: [
    { key: 'loss', label: lossLabel, valueMinor: lossMinor, direction: 'total' },
    { key: 'received-matched', label: 'Received and matched', valueMinor: recoveredMinor, direction: 'subtract' },
    { key: 'net', label: 'Final net loss', valueMinor: null, direction: 'total' },
  ], reconciled: false };

  const net = Math.max(0, lossMinor + adjustmentMinor - recoveredMinor);
  const steps: LossWaterfallStepModel[] = [
    { key: 'loss', label: lossLabel, valueMinor: lossMinor, direction: 'total' },
  ];
  if (adjustmentMinor !== 0) {
    steps.push({
      key: 'adjustments',
      label: 'Recorded adjustments',
      valueMinor: Math.abs(adjustmentMinor),
      direction: adjustmentMinor > 0 ? 'add' : 'subtract',
    });
  }
  steps.push(
    { key: 'received-matched', label: 'Received and matched', valueMinor: recoveredMinor, direction: 'subtract' },
    { key: 'net', label: 'Final net loss', valueMinor: net, direction: 'total' },
  );
  return { steps, reconciled: true };
}
