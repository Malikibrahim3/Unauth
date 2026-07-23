import {
  isLossWrittenOff,
  lossFinancialDisplay,
  summarizeKnownLossExposure,
} from '@/lib/losses/financialDisplay';

describe('loss financial display provenance', () => {
  it('treats the terminal unrecoverable status as written off even before a timestamp is backfilled', () => {
    expect(isLossWrittenOff('closed_unrecoverable', null)).toBe(true);
    expect(isLossWrittenOff('collecting_evidence', '2026-07-22T12:00:00.000Z')).toBe(true);
    expect(isLossWrittenOff('collecting_evidence', null)).toBe(false);
  });

  it('keeps zero-defaulted unknown stages unavailable', () => {
    expect(lossFinancialDisplay({
      confirmed_loss_minor: 0,
      estimated_loss_minor: 0,
      recoverable_minor: 0,
      recovered_minor: 0,
      known_states: [],
    }, null)).toEqual({
      realisedLossMinor: null,
      estimatedLossMinor: null,
      recoverableMinor: null,
      recoveredMinor: null,
    });
  });

  it('preserves a proven zero and the independent recovery estimate fallback', () => {
    expect(lossFinancialDisplay({
      confirmed_loss_minor: 0,
      estimated_loss_minor: 900,
      recoverable_minor: 0,
      recovered_minor: 0,
      known_states: ['confirmed_loss', 'recovered'],
    }, 375)).toEqual({
      realisedLossMinor: 0,
      estimatedLossMinor: null,
      recoverableMinor: 375,
      recoveredMinor: 0,
    });
  });

  it('distinguishes an aggregate proven zero from no represented value', () => {
    const base = {
      estimatedLossMinor: null,
      currency: 'GBP',
      writtenOff: false,
    };
    expect(summarizeKnownLossExposure([
      { ...base, realisedLossMinor: 0 },
    ])).toEqual({ total: 0, currency: 'GBP', mixedCount: 0, known: true });
    expect(summarizeKnownLossExposure([
      { ...base, realisedLossMinor: null },
    ])).toEqual({ total: null, currency: null, mixedCount: 0, known: false });
  });

  it('chooses the dominant currency from known values only', () => {
    expect(summarizeKnownLossExposure([
      { realisedLossMinor: null, estimatedLossMinor: null, currency: 'USD', writtenOff: false },
      { realisedLossMinor: null, estimatedLossMinor: null, currency: 'USD', writtenOff: false },
      { realisedLossMinor: 2500, estimatedLossMinor: null, currency: 'GBP', writtenOff: false },
    ])).toEqual({ total: 25, currency: 'GBP', mixedCount: 0, known: true });
  });
});
