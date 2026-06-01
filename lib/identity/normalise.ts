/**
 * SINGLE SOURCE OF TRUTH — Identity normalisation
 *
 * All normalisation functions are defined here and only here.
 * Do not define, redefine, or duplicate these functions anywhere else.
 * Do not import normalisation from any other file.
 *
 * See ARCHITECTURE.md and CLAUDE.md for the full rules.
 */

const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

/**
 * Email: lowercase every address. For Gmail/Googlemail only, strip plus
 * aliases and remove dots before @ because Google treats those as one mailbox.
 * For all other domains, preserve the local part after lowercasing; dots and
 * plus tags may be significant on business/custom domains.
 *
 * Returns null for invalid/empty input.
 */
export function normaliseEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  const at = lower.indexOf('@');
  if (at < 1 || at === lower.length - 1) return null;
  const domain = lower.slice(at + 1);
  const rawLocal = lower.slice(0, at);
  const localPart = GMAIL_DOMAINS.has(domain)
    ? rawLocal.split('+')[0].replace(/\./g, '')
    : rawLocal;
  if (!localPart) return null;
  return `${localPart}@${domain}`;
}

const ADDRESS_ABBREVIATIONS: Record<string, string> = {
  st: 'street',
  rd: 'road',
  ave: 'avenue',
  av: 'avenue',
  ln: 'lane',
  cl: 'close',
  dr: 'drive',
  blvd: 'boulevard',
  bvd: 'boulevard',
  ct: 'court',
  pl: 'place',
  sq: 'square',
};

const UNIT_DESIGNATORS = '(?:apt|apartment|unit|suite|ste|flat|fl)';

/**
 * Address: lowercase, canonicalise common UK/US street and unit terms, strip
 * punctuation, collapse whitespace, return the token array sorted
 * alphabetically. Secondary-unit markers are preserved as unit:<value> tokens
 * so "Apt 4", "Unit 4", "Ste 4", and "#4" compare consistently while
 * different units in the same building remain distinguishable.
 *
 * Sorting tokens means "23 Baker Street" and "Baker Street 23" produce
 * identical arrays — the rare cases where sort order actually carries
 * meaning (e.g. apartment numbers) are covered by postcode matching,
 * not street-text matching.
 */
export function normaliseAddressTokens(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const unitNormalised = raw
    .toLowerCase()
    .replace(/#\s*([a-z0-9-]+)/g, ' unit:$1 ')
    .replace(new RegExp(`\\b${UNIT_DESIGNATORS}\\.?\\s*#?\\s*([a-z0-9-]+)\\b`, 'g'), ' unit:$1 ');
  const cleaned = unitNormalised
    .replace(/[^a-z0-9:\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return [];
  const tokens = cleaned.split(' ').map((t) => ADDRESS_ABBREVIATIONS[t] ?? t);
  return tokens.sort();
}

/**
 * Full normalised address as a single string (tokens joined by space).
 * Returns null for blank input.
 *
 * This is the canonical form used for entity matching and storage.
 * For token-set operations (e.g. Jaccard overlap), use normaliseAddressTokens.
 */
export function normaliseAddress(raw: string | null | undefined): string | null {
  const tokens = normaliseAddressTokens(raw);
  return tokens.length > 0 ? tokens.join(' ') : null;
}

export const normaliseIP = (ip: string | null | undefined): string => {
  if (!ip) return '';
  return ip.trim();
};

export const normaliseCard = (card: string | null | undefined): string => {
  if (!card) return '';
  return card.trim().replace(/\D/g, '').slice(-4);
};

function isPlausibleE164Digits(digits: string): boolean {
  return digits.length >= 8 && digits.length <= 15;
}

/**
 * Phone: normalise to E.164 where possible. US/Canada 10-digit local numbers
 * default to +1; UK local numbers beginning with 0 are preserved for legacy
 * UK imports as +44. Bare international country-code numbers are accepted when
 * they are already long enough to be plausible E.164 digits.
 */
export function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withoutExtension = trimmed.replace(/\b(?:ext|extension|x)\.?\s*\d+\s*$/i, '');
  const digits = withoutExtension.replace(/\D/g, '');
  if (!digits) return null;

  if (withoutExtension.trim().startsWith('+')) {
    return isPlausibleE164Digits(digits) ? `+${digits}` : null;
  }

  if (digits.startsWith('00')) {
    const international = digits.slice(2);
    return isPlausibleE164Digits(international) ? `+${international}` : null;
  }

  if (digits.startsWith('011')) {
    const international = digits.slice(3);
    return isPlausibleE164Digits(international) ? `+${international}` : null;
  }

  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if ((digits.length === 10 || digits.length === 11) && digits.startsWith('0')) {
    const ukNational = digits.replace(/^0+/, '');
    return isPlausibleE164Digits(`44${ukNational}`) ? `+44${ukNational}` : null;
  }
  if (digits.length > 11 && digits.length <= 15) return `+${digits}`;

  return null;
}
