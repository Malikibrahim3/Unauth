import { filterAndSortLossRows, summarizeLossMinor } from '@/lib/losses/queryState';

const base = {
  category: 'delivery_loss',
  attribution: 'carrier_claim',
  counterpartyType: 'carrier',
  counterpartyName: 'Parcel Network',
  status: 'open',
  recoverability: 'recoverable',
  financialState: 'confirmed',
  preventionOnly: false,
  writtenOff: false,
  estimatedLossMinor: null,
  supportPayoutCaseId: 'case-1',
};

describe('loss URL scope', () => {
  it('applies date, source, status and search before sorting the represented rows', () => {
    const rows = [
      { ...base, id: 'older', source: 'carrier', realisedLossMinor: 400, netUnrecoveredMinor: 300, updatedAt: '2026-07-01T00:00:00.000Z' },
      { ...base, id: 'newer', source: 'carrier', realisedLossMinor: 900, netUnrecoveredMinor: 850, updatedAt: '2026-08-10T00:00:00.000Z' },
      { ...base, id: 'unknown-source', source: null, realisedLossMinor: 1200, netUnrecoveredMinor: 1100, updatedAt: '2026-08-11T00:00:00.000Z' },
    ];

    expect(filterAndSortLossRows(rows, {
      cutoff: '2026-08-01T00:00:00.000Z',
      source: 'carrier',
      status: 'recoverable',
      search: 'parcel network',
      sort: 'loss_desc',
    }).map((row) => row.id)).toEqual(['newer']);
  });

  it('qualifies a known zero when another represented row remains unavailable', () => {
    expect(summarizeLossMinor([
      { currency: 'GBP', writtenOff: false, amount: 0 },
      { currency: 'GBP', writtenOff: false, amount: null },
    ], (row) => row.amount)).toEqual({
      totalMinor: 0,
      currency: 'GBP',
      mixedCount: 0,
      omittedCount: 1,
      known: true,
    });
  });
});
