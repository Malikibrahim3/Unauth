import { renderToStaticMarkup } from 'react-dom/server';
import { MoneyValue, formatMoneyMinorUnits } from '@/components/ui/ProductValue';

describe('ProductValue financial semantics', () => {
  it('formats safe integer minor units through the canonical money formatter', () => {
    expect(formatMoneyMinorUnits(12_345, 'GBP')).toContain('123.45');
    expect(() => formatMoneyMinorUnits(12.34, 'GBP')).toThrow(/safe integer count/i);
  });

  it('keeps verified zero distinct from unknown and unavailable values', () => {
    const zero = renderToStaticMarkup(<MoneyValue minorUnits={0} currency="GBP" />);
    const unknown = renderToStaticMarkup(<MoneyValue minorUnits={null} currency="GBP" />);
    const unavailable = renderToStaticMarkup(
      <MoneyValue minorUnits={null} currency="GBP" availability="unavailable" />,
    );

    expect(zero).toContain('data-value-state="verified-zero"');
    expect(zero).toContain('verified zero');
    expect(unknown).toContain('data-value-state="unknown"');
    expect(unavailable).toContain('data-value-state="unavailable"');
    expect(unknown).not.toContain('verified-zero');
  });

  it('never guesses a currency for an otherwise available amount', () => {
    const markup = renderToStaticMarkup(<MoneyValue minorUnits={500} currency={null} />);
    expect(markup).toContain('Currency scope is missing');
    expect(markup).not.toContain('£5.00');
    expect(markup).not.toContain('$5.00');
  });
});
