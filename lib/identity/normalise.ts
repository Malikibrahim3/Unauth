/**
 * SINGLE SOURCE OF TRUTH — Identity normalisation
 *
 * All normalisation functions are defined here and only here.
 * Do not define, redefine, or duplicate these functions anywhere else.
 * Do not import normalisation from any other file.
 *
 * See ARCHITECTURE.md and CLAUDE.md for the full rules.
 */

/**
 * Consumer email providers that ignore dots in the local part. Only for these
 * domains do we strip dots — for business/custom domains, dots distinguish
 * different people (john.doe@acmecorp.com ≠ johndoe@acmecorp.com).
 */
const DOT_IGNORING_DOMAINS = new Set([
  'gmail.com', 'googlemail.com',
  'icloud.com', 'me.com', 'mac.com',
  'proton.me', 'protonmail.com', 'pm.me',
  'fastmail.com', 'fastmail.fm',
  'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'live.com', 'live.co.uk', 'msn.com',
  'yahoo.com', 'yahoo.co.uk', 'ymail.com',
]);

/**
 * Email: strip plus aliases, lowercase. Remove dots before @ only for
 * consumer providers known to ignore them (Gmail, iCloud, Proton, etc.).
 * For business/custom domains dots are significant — stripping them would
 * create false-positive identity links between different employees.
 *
 * Plus-alias stripping is universal (RFC 5233 sub-addressing).
 *
 * Returns null for invalid/empty input.
 */
export function normaliseEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  const at = lower.indexOf('@');
  if (at < 1 || at === lower.length - 1) return null;
  const plusStripped = lower.slice(0, at).split('+')[0];
  const domain = lower.slice(at + 1);
  const localPart = DOT_IGNORING_DOMAINS.has(domain)
    ? plusStripped.replace(/\./g, '')
    : plusStripped;
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
  apt: 'apartment',
};

/**
 * Address: lowercase, expand common UK/US abbreviations to full form,
 * strip punctuation, collapse whitespace, return the token array sorted
 * alphabetically.
 *
 * Sorting tokens means "23 Baker Street" and "Baker Street 23" produce
 * identical arrays — the rare cases where sort order actually carries
 * meaning (e.g. apartment numbers) are covered by postcode matching,
 * not street-text matching.
 */
export function normaliseAddressTokens(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
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
