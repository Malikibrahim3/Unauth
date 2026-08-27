/**
 * RUN-09 — currency truth.
 *
 * A record's money value renders in that record's own currency or not at all.
 * Substituting a merchant or platform default is what made GBP records display
 * as USD, so a missing code must produce the unavailable marker plus a
 * monitored data-quality report — never a confidently wrong number.
 */
import {
  UNAVAILABLE,
  formatCurrency,
  formatCurrencyNullable,
  formatMoneyOrDash,
} from '@/lib/utils/format';
import { dataQualityEvents, resetDataQuality } from '@/lib/observability/dataQuality';
import { evidencePackageOrderAmount } from '@/components/evidence/evidencePackageOrderAmount';

describe('RUN-09 currency truth', () => {
  beforeEach(() => resetDataQuality());

  it('renders a record in its own currency', () => {
    expect(formatCurrency(55, 'GBP')).toBe('£55.00');
    expect(formatCurrencyNullable(55, 'GBP')).toBe('£55.00');
    expect(formatMoneyOrDash(5500, 'GBP')).toBe('£55.00');
  });

  it('never substitutes a default currency for a missing one', () => {
    for (const rendered of [
      formatCurrency(42, null),
      formatCurrency(42, undefined),
      formatCurrencyNullable(42, null),
      formatMoneyOrDash(4200, null),
    ]) {
      expect(rendered).toBe(UNAVAILABLE);
      expect(rendered).not.toContain('$');
      expect(rendered).not.toContain('US');
    }
  });

  it('reports a missing currency as a monitored data-quality failure', () => {
    formatCurrency(42, null);
    const events = dataQualityEvents();
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('money.currency_missing');
  });

  it('reports an unrecognised currency separately from a missing one', () => {
    formatCurrency(42, 'NOTACURRENCY');
    expect(dataQualityEvents().map((event) => event.kind)).toEqual(['money.currency_unrecognised']);
  });

  it('de-duplicates a repeated bad value instead of flooding the log', () => {
    for (let index = 0; index < 50; index += 1) formatCurrency(index, null);
    const events = dataQualityEvents();
    expect(events).toHaveLength(1);
    expect(events[0].count).toBe(50);
  });

  it('keeps a known zero distinct from an unavailable value', () => {
    // A real, observed zero is a fact and must render as money.
    expect(formatCurrency(0, 'GBP')).toBe('£0.00');
    expect(formatMoneyOrDash(0, 'GBP')).toBe('£0.00');
    // Absence of the amount, or of the currency, is not a zero.
    expect(formatCurrencyNullable(null, 'GBP')).toBe(UNAVAILABLE);
    expect(formatMoneyOrDash(null, 'GBP')).toBe(UNAVAILABLE);
    expect(dataQualityEvents()).toHaveLength(0);
  });

  it('does not report a data-quality failure for well-formed money', () => {
    formatCurrency(10, 'GBP');
    formatCurrency(10, 'eur');
    expect(dataQualityEvents()).toHaveLength(0);
  });

  it('renders evidence-order major units only with an explicit source currency', () => {
    expect(evidencePackageOrderAmount({ amount: 55, currency: 'GBP' })).toBe('£55.00');
    expect(evidencePackageOrderAmount({ amount: 55, currency: null })).toBe('Amount unavailable — currency missing');
    expect(evidencePackageOrderAmount({ amount: null, currency: 'GBP' })).toBe('Amount unavailable — source amount missing');
  });
});
