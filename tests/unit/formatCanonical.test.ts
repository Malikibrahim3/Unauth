import {
  formatMoney,
  formatMoneyOrDash,
  formatDate,
  formatDateAbsolute,
  formatDateTime,
} from '@/lib/utils/format';

describe('formatMoney (canonical, currency required)', () => {
  it('renders the row currency symbol — never a guessed one', () => {
    expect(formatMoney(21450, 'GBP')).toBe('£214.50');
    expect(formatMoney(21450, 'USD')).toContain('214.50');
    expect(formatMoney(21450, 'USD')).toContain('$');
  });

  it('honours each currency’s natural precision', () => {
    expect(formatMoney(1234, 'JPY')).toContain('1,234');
    expect(formatMoney(1234, 'JPY')).not.toContain('.00');
  });

  it('never invents a symbol for an unusable currency code', () => {
    const out = formatMoney(21450, 'UNKNOWN');
    expect(out).toBe('214.50');
    expect(out).not.toContain('$');
    expect(out).not.toContain('£');
  });
});

describe('formatMoneyOrDash', () => {
  it('shows the amount when both amount and currency are present', () => {
    expect(formatMoneyOrDash(21450, 'GBP')).toBe('£214.50');
    expect(formatMoneyOrDash(0, 'GBP')).toBe('£0.00');
  });

  it('returns a dash — never the wrong symbol — when either is missing', () => {
    expect(formatMoneyOrDash(null, 'GBP')).toBe('—');
    expect(formatMoneyOrDash(undefined, 'GBP')).toBe('—');
    expect(formatMoneyOrDash(21450, null)).toBe('—');
    expect(formatMoneyOrDash(21450, undefined)).toBe('—');
    expect(formatMoneyOrDash(21450, 'XXX')).toBe('—');
  });
});

describe('formatDate (relative under 7 days, else day-month)', () => {
  const now = new Date('2026-06-14T12:00:00Z');

  it('renders relative forms under 7 days, no seconds', () => {
    expect(formatDate('2026-06-14T11:59:30Z', now)).toBe('just now');
    expect(formatDate('2026-06-14T09:00:00Z', now)).toBe('3h ago');
    expect(formatDate('2026-06-13T12:00:00Z', now)).toBe('1d ago');
  });

  it('renders "14 Jun" in the current year past 7 days', () => {
    expect(formatDate('2026-06-06T12:00:00Z', now)).toBe('6 Jun');
  });

  it('renders "14 Jun 2025" for other years', () => {
    expect(formatDate('2025-06-14T12:00:00Z', now)).toBe('14 Jun 2025');
  });

  it('never renders US ordering or ISO', () => {
    const out = formatDate('2025-06-14T12:00:00Z', now);
    expect(out).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(out).not.toMatch(/^\d{1,2}\/\d{1,2}/);
  });
});

describe('formatDateAbsolute', () => {
  it('always includes the year in day-month-year order', () => {
    expect(formatDateAbsolute('2026-06-14T12:00:00Z')).toBe('14 Jun 2026');
  });
});

describe('formatDateTime (timelines/audit only)', () => {
  it('renders "14 Jun, 09:42" with no seconds and no year', () => {
    expect(formatDateTime('2026-06-14T09:42:00Z')).toBe('14 Jun, 09:42');
  });
});
