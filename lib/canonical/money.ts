/**
 * Canonical money — integer minor units + ISO 4217 currency.
 *
 * Source-Agnostic MVP+ stores all new financial values as integer minor units
 * plus an ISO currency code. Conversion MUST use the currency's ISO exponent;
 * never assume every currency has 2 decimals (JPY has 0, BHD has 3).
 *
 * See ARCHITECTURE.md for the canonical money and ledger owners.
 */

/** Currencies whose minor-unit exponent is NOT the default of 2. */
const NON_DEFAULT_EXPONENTS: Record<string, number> = {
  // 0-decimal currencies
  BIF: 0, CLP: 0, DJF: 0, GNF: 0, ISK: 0, JPY: 0, KMF: 0, KRW: 0,
  PYG: 0, RWF: 0, UGX: 0, VND: 0, VUV: 0, XAF: 0, XOF: 0, XPF: 0,
  // 3-decimal currencies
  BHD: 3, IQD: 3, JOD: 3, KWD: 3, LYD: 3, OMR: 3, TND: 3,
  // 4-decimal
  CLF: 4, UYW: 4,
};

const DEFAULT_EXPONENT = 2;

export function normaliseCurrency(currency: string): string {
  return currency.trim().toUpperCase();
}

const intlWithSupportedValues = Intl as typeof Intl & {
  supportedValuesOf?: (key: 'currency') => string[];
};

const SUPPORTED_CURRENCY_CODES = new Set(
  intlWithSupportedValues.supportedValuesOf?.('currency') ?? [],
);

/**
 * Return a usable ISO-4217 display code, or null for missing/source sentinel
 * values. Presentation code must never pass an untrusted source value directly
 * to Intl.NumberFormat.
 */
export function normaliseCurrencyOrNull(currency: unknown): string | null {
  if (typeof currency !== 'string') return null;
  const code = normaliseCurrency(currency);
  if (!/^[A-Z]{3}$/.test(code) || code === 'XXX') return null;

  if (SUPPORTED_CURRENCY_CODES.size > 0) {
    return SUPPORTED_CURRENCY_CODES.has(code) ? code : null;
  }

  try {
    new Intl.NumberFormat('en-US', { style: 'currency', currency: code });
    return code;
  } catch {
    return null;
  }
}

export function isSupportedCurrency(currency: unknown): boolean {
  return normaliseCurrencyOrNull(currency) !== null;
}

/** ISO minor-unit exponent for a currency (defaults to 2 for unknown codes). */
export function minorUnitExponent(currency: string): number {
  const code = normaliseCurrencyOrNull(currency) ?? normaliseCurrency(currency);
  return Object.prototype.hasOwnProperty.call(NON_DEFAULT_EXPONENTS, code)
    ? NON_DEFAULT_EXPONENTS[code]
    : DEFAULT_EXPONENT;
}

/**
 * Convert a decimal amount (e.g. 84.00) to integer minor units for its currency
 * (e.g. 8400 for GBP, 84 for JPY, 84000 for BHD). Rounds half-away-from-zero.
 */
export function toMinorUnits(amount: number, currency: string): number {
  if (!Number.isFinite(amount)) {
    throw new Error(`toMinorUnits: amount is not finite (${amount})`);
  }
  const factor = 10 ** minorUnitExponent(currency);
  const scaled = amount * factor;
  return Math.sign(scaled) * Math.round(Math.abs(scaled));
}

/** Convert integer minor units back to a decimal amount for display. */
export function fromMinorUnits(minor: number, currency: string): number {
  const factor = 10 ** minorUnitExponent(currency);
  return minor / factor;
}
