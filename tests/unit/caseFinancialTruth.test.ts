import {
  financialEntryStateIsKnown,
  trustedFinancialStatesByCurrency,
} from '@/lib/finance/caseFinancialTruth';

describe('case financial truth', () => {
  it('does not turn an unlinked zero-value paid row into provider payment', () => {
    expect(financialEntryStateIsKnown({
      currency: 'GBP',
      state: 'paid',
      amount_minor: 0,
      case_outcome_event_id: null,
      source_record_id: null,
    })).toBe(false);
  });

  it('accepts positive paid value only when it is linked to outcome/source evidence', () => {
    expect(financialEntryStateIsKnown({
      currency: 'GBP',
      state: 'paid',
      amount_minor: 2500,
      case_outcome_event_id: 'outcome-1',
    })).toBe(true);
    expect(financialEntryStateIsKnown({
      currency: 'GBP',
      state: 'paid',
      amount_minor: 2500,
    })).toBe(false);
  });

  it('does not call an approved projection a merchant decision without its decision record', () => {
    const entry = { currency: 'GBP', state: 'approved', amount_minor: 0 };
    expect(financialEntryStateIsKnown(entry, { merchantDecisionRecorded: false })).toBe(false);
    expect(financialEntryStateIsKnown(entry, { merchantDecisionRecorded: true })).toBe(true);
  });

  it('keeps internal stages while filtering unsupported paid and recovered states', () => {
    expect(trustedFinancialStatesByCurrency([
      { currency: 'gbp', state: 'requested', amount_minor: 2500 },
      { currency: 'GBP', state: 'approved', amount_minor: 2500 },
      { currency: 'GBP', state: 'paid', amount_minor: 0 },
      { currency: 'GBP', state: 'recovered', amount_minor: 2500 },
      { currency: 'USD', state: 'paid', amount_minor: 5000, source_record_id: 'source-1' },
    ], { merchantDecisionRecorded: false })).toEqual({
      GBP: ['requested'],
      USD: ['paid'],
    });
  });
});
