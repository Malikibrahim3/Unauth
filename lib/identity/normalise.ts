/**
 * Canonical entity normalisers.
 *
 * IMPORTANT: every write to fraud_entities / fraud_entity_co_occurrences /
 * fraud_identity_clusters AND every read/lookup against those maps MUST
 * pass entity values through these functions. If the write-side and the
 * read-side normalisation drift apart by even a single character, lookups
 * silently miss and repeat customers go undetected.
 *
 * These four functions are the *only* sanctioned normalisers for cross-CSV
 * entity matching. Other normalisers in the codebase (e.g.
 * lib/identity/hash.ts:normaliseEmail, lib/engine/identityMatching.ts) exist
 * for different purposes (PII hashing, in-batch fuzzy matching) and must
 * NOT be substituted here.
 */

export const normaliseEmail = (email: string | null | undefined): string => {
  if (!email) return '';
  return email.trim().toLowerCase();
};

export const normaliseIP = (ip: string | null | undefined): string => {
  if (!ip) return '';
  return ip.trim();
};

export const normaliseAddress = (address: string | null | undefined): string => {
  if (!address) return '';
  return address
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // remove punctuation
    .replace(/\s+/g, ' ')     // collapse whitespace
    .trim()
    // Normalise common abbreviations
    .replace(/\bflat\b/g, 'flat')
    .replace(/\bapartment\b|\bapt\b/g, 'apt')
    .replace(/\bstreet\b|\bst\b/g, 'st')
    .replace(/\broad\b|\brd\b/g, 'rd')
    .replace(/\blane\b|\bln\b/g, 'ln')
    .replace(/\bclose\b|\bcl\b/g, 'cl');
};

export const normaliseCard = (card: string | null | undefined): string => {
  if (!card) return '';
  return card.trim().replace(/\D/g, '').slice(-4);
};
