import {
  FINANCIAL_TIMEZONE,
  financialPeriodBounds,
  financialPeriodForInstant,
  isWithinFinancialScope,
} from '@/lib/financial/periods';

describe('financial periods', () => {
  it('uses exact Europe/London month boundaries across BST transitions', () => {
    expect(financialPeriodBounds('2026-03')).toMatchObject({
      start: new Date('2026-03-01T00:00:00.000Z'),
      end: new Date('2026-03-31T23:00:00.000Z'),
    });
    expect(financialPeriodBounds('2026-10')).toMatchObject({
      start: new Date('2026-09-30T23:00:00.000Z'),
      end: new Date('2026-11-01T00:00:00.000Z'),
    });
  });

  it('assigns the local period and keeps the end boundary exclusive', () => {
    expect(financialPeriodForInstant(new Date('2026-09-30T23:30:00.000Z'))).toBe('2026-10');
    const bounds = financialPeriodBounds('2026-10');
    expect(bounds).not.toBeNull();
    const scope = {
      from: bounds!.start.toISOString(),
      to: bounds!.end.toISOString(),
      timezone: FINANCIAL_TIMEZONE,
      timeBasis: 'case_submitted_at' as const,
      population: 'merchant_support_payout_cases' as const,
      boundary: 'start_inclusive_end_exclusive' as const,
      asOf: bounds!.end.toISOString(),
    };
    expect(isWithinFinancialScope(scope.from, scope)).toBe(true);
    expect(isWithinFinancialScope(scope.to, scope)).toBe(false);
  });
});
