export type LossWaterfallAmount = {
  realisedLossMinor: number | null;
  estimatedLossMinor: number | null;
  recoveredMinor: number | null;
};

export type LossWaterfallStepModel = {
  key: string;
  label: string;
  valueMinor: number | null;
  direction: 'total' | 'subtract';
};

export function buildLossWaterfall(
  loss: Record<string, unknown>,
  amount: LossWaterfallAmount,
): { steps: LossWaterfallStepModel[]; reconciled: boolean } {
  const lossMinor = amount.realisedLossMinor ?? amount.estimatedLossMinor;
  const recoveredMinor = amount.recoveredMinor;
  const lossLabel = amount.realisedLossMinor != null ? 'Confirmed loss' : 'Estimated loss';
  if (lossMinor == null || recoveredMinor == null) return { steps: [
    { key: 'loss', label: lossLabel, valueMinor: lossMinor, direction: 'total' },
    { key: 'recovered', label: 'Recovered value', valueMinor: recoveredMinor, direction: 'subtract' },
    { key: 'net', label: 'Net unrecovered', valueMinor: null, direction: 'total' },
  ], reconciled: false };

  const gross = typeof loss.order_value_minor === 'number' ? loss.order_value_minor : null;
  const refund = typeof loss.refund_value_minor === 'number' ? loss.refund_value_minor : null;
  const chargeback = typeof loss.chargeback_value_minor === 'number' ? loss.chargeback_value_minor : null;
  const offsets = refund != null && chargeback != null ? refund + chargeback : null;
  const net = Math.max(0, lossMinor - recoveredMinor);
  const sourceNet = gross != null && offsets != null ? Math.max(0, gross - offsets - recoveredMinor) : null;
  if (sourceNet != null) return { steps: [
    { key: 'gross', label: 'Gross exposure', valueMinor: gross, direction: 'total' },
    { key: 'offsets', label: 'Refunds and offsets', valueMinor: offsets, direction: 'subtract' },
    { key: 'recovered', label: 'Recovered value', valueMinor: recoveredMinor, direction: 'subtract' },
    { key: 'net', label: 'Net unrecovered', valueMinor: sourceNet === net ? sourceNet : null, direction: 'total' },
  ], reconciled: sourceNet === net };
  return { steps: [
    { key: 'loss', label: lossLabel, valueMinor: lossMinor, direction: 'total' },
    { key: 'recovered', label: 'Recovered value', valueMinor: recoveredMinor, direction: 'subtract' },
    { key: 'net', label: 'Net unrecovered', valueMinor: net, direction: 'total' },
  ], reconciled: true };
}
