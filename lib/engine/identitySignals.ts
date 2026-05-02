/**
 * Identity Signals — Pair-Comparison Functions
 *
 * Each function compares TWO orders and returns an IdentitySignalResult.
 * Identity signals require comparison — they have no meaning for a single order in isolation.
 *
 * Signal philosophy:
 *   - Hardware/PSP identifiers (card fingerprint, device, browser, cookie) → strongest
 *   - Soft signals (email variant, name, address, IP) → corroborating, not definitive alone
 *   - IP alone is never sufficient to link two orders (see ipCluster guard)
 */

import type { NormalisedOrder, IdentitySignalResult } from './types';

// Internal helper type for orders that carry their raw/normalised string values
type OrderWithRaw = NormalisedOrder & {
  _rawEmail?: string;
  _rawAddress?: string | null;
  _rawIP?: string | null;
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Strip plus-alias and collapse dots (gmail-style normalisation applied broadly).
 * Used to detect deliberate email obfuscation — not the canonical normaliser.
 */
export function stripEmailVariants(email: string): string {
  const lower = email.toLowerCase().trim();
  const atIdx = lower.indexOf('@');
  if (atIdx === -1) return lower;
  const local = lower.slice(0, atIdx);
  const domain = lower.slice(atIdx + 1);
  // strip dots from local (gmail-style, applied broadly for matching)
  const stripped = local.replace(/\./g, '').split('+')[0];
  return `${stripped}@${domain}`;
}

/**
 * Iterative Levenshtein distance.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  // Use two rows for memory efficiency
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i, ...Array(n).fill(0)];
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1];
      } else {
        curr[j] = 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
      }
    }
    prev = curr;
  }
  return prev[n];
}

// =============================================================================
// SIGNAL FUNCTIONS
// =============================================================================

/**
 * deviceMatch — composite hardware signal.
 * Sub-signals: card_fingerprint (20pts), browser_fingerprint (8pts),
 *              cookie_id (5pts), device_id (5pts). Max 35.
 * Fires when score >= 8 (browser OR cookie match minimum).
 */
export function deviceMatch(
  orderA: NormalisedOrder,
  orderB: NormalisedOrder
): IdentitySignalResult {
  const dataPointsUsed: string[] = [];
  const dataPointsMissing: string[] = [];
  let score = 0;
  const evidence: string[] = [];

  if (orderA.cardFingerprint && orderB.cardFingerprint) {
    dataPointsUsed.push('card_fingerprint');
    if (orderA.cardFingerprint === orderB.cardFingerprint) {
      score += 20;
      evidence.push('identical card fingerprint');
    }
  } else {
    dataPointsMissing.push('card_fingerprint');
  }

  if (orderA.browserFingerprint && orderB.browserFingerprint) {
    dataPointsUsed.push('browser_fingerprint');
    if (orderA.browserFingerprint === orderB.browserFingerprint) {
      score += 8;
      evidence.push('identical browser fingerprint');
    }
  } else {
    dataPointsMissing.push('browser_fingerprint');
  }

  if (orderA.cookieIdHash && orderB.cookieIdHash) {
    dataPointsUsed.push('cookie_id');
    if (orderA.cookieIdHash === orderB.cookieIdHash) {
      score += 5;
      evidence.push('identical cookie ID');
    }
  } else {
    dataPointsMissing.push('cookie_id');
  }

  if (orderA.deviceIdHash && orderB.deviceIdHash) {
    dataPointsUsed.push('device_id');
    if (orderA.deviceIdHash === orderB.deviceIdHash) {
      score += 5;
      evidence.push('identical device ID');
    }
  } else {
    dataPointsMissing.push('device_id');
  }

  const normalisedScore = Math.min(35, score);

  return {
    signal: 'deviceMatch',
    fired: normalisedScore >= 8,
    confidence: normalisedScore,
    evidence: evidence.length > 0 ? evidence.join(', ') : 'no device overlap found',
    dataPointsUsed,
    dataPointsMissing,
  };
}

/**
 * cardMatch — PSP card matching.
 * card_fingerprint alone → 30pts (near-definitive)
 * last4 + bin → 18pts (strong but cards get reissued)
 * last4 alone → 8pts (weak — cards are shared in households)
 */
export function cardMatch(
  orderA: NormalisedOrder,
  orderB: NormalisedOrder
): IdentitySignalResult {
  const dataPointsUsed: string[] = [];
  const dataPointsMissing: string[] = [];
  let score = 0;
  const evidence: string[] = [];

  if (orderA.cardFingerprint && orderB.cardFingerprint) {
    dataPointsUsed.push('card_fingerprint');
    if (orderA.cardFingerprint === orderB.cardFingerprint) {
      score = 30;
      evidence.push('same PSP card fingerprint');
    }
  } else {
    dataPointsMissing.push('card_fingerprint');
  }

  if (score === 0) {
    if (orderA.cardLast4 && orderB.cardLast4 && orderA.cardBin && orderB.cardBin) {
      dataPointsUsed.push('card_last4', 'card_bin');
      if (orderA.cardLast4 === orderB.cardLast4 && orderA.cardBin === orderB.cardBin) {
        score = 18;
        evidence.push('same card BIN and last 4 digits');
      }
    } else if (!orderA.cardBin || !orderB.cardBin) {
      dataPointsMissing.push('card_bin');
    }
  }

  if (score === 0 && orderA.cardLast4 && orderB.cardLast4) {
    if (!dataPointsUsed.includes('card_last4')) dataPointsUsed.push('card_last4');
    if (orderA.cardLast4 === orderB.cardLast4) {
      score = 8;
      evidence.push('same card last 4 digits');
    }
  }

  if (!orderA.cardLast4 || !orderB.cardLast4) {
    if (!dataPointsMissing.includes('card_last4')) dataPointsMissing.push('card_last4');
  }

  return {
    signal: 'cardMatch',
    fired: score > 0,
    confidence: score,
    evidence: evidence[0] ?? 'no card overlap',
    dataPointsUsed,
    dataPointsMissing,
  };
}

/**
 * emailVariant — deliberate email obfuscation detection.
 * Only fires when the BASE email (after plus-alias removal and dot-stripping)
 * is the same but the surface email is different.
 * A direct email match is NOT a signal — entity resolution handles that.
 */
export function emailVariant(
  orderA: NormalisedOrder,
  orderB: NormalisedOrder
): IdentitySignalResult {
  const a = orderA as OrderWithRaw;
  const b = orderB as OrderWithRaw;

  if (!a._rawEmail || !b._rawEmail) {
    return {
      signal: 'emailVariant',
      fired: false,
      confidence: 0,
      evidence: 'email missing',
      dataPointsUsed: [],
      dataPointsMissing: ['customer_email'],
    };
  }

  const rawA = a._rawEmail.toLowerCase().trim();
  const rawB = b._rawEmail.toLowerCase().trim();

  // Exact match → entity resolution handles it
  if (rawA === rawB) {
    return {
      signal: 'emailVariant',
      fired: false,
      confidence: 0,
      evidence: 'identical email — handled by entity resolution',
      dataPointsUsed: ['customer_email'],
      dataPointsMissing: [],
    };
  }

  const baseA = stripEmailVariants(rawA);
  const baseB = stripEmailVariants(rawB);

  if (baseA === baseB) {
    return {
      signal: 'emailVariant',
      fired: true,
      confidence: 12,
      evidence: `email variants of same base address (${baseA})`,
      dataPointsUsed: ['customer_email'],
      dataPointsMissing: [],
    };
  }

  // Numeric suffix pattern: john1@domain and john2@domain or john@domain and john99@domain
  const numericSuffixPattern = /^([a-z]+)\d+@/;
  const matchA = rawA.match(numericSuffixPattern);
  const matchB = rawB.match(numericSuffixPattern);
  if (
    matchA &&
    matchB &&
    matchA[1] === matchB[1] &&
    rawA.split('@')[1] === rawB.split('@')[1]
  ) {
    return {
      signal: 'emailVariant',
      fired: true,
      confidence: 10,
      evidence: `numeric email variants from same root (${matchA[1]}@${rawA.split('@')[1]})`,
      dataPointsUsed: ['customer_email'],
      dataPointsMissing: [],
    };
  }

  return {
    signal: 'emailVariant',
    fired: false,
    confidence: 0,
    evidence: 'no email variant pattern found',
    dataPointsUsed: ['customer_email'],
    dataPointsMissing: [],
  };
}

/**
 * addressCluster — same normalised address, different identity fields.
 * Uses word-overlap on the normalised address string.
 * >= 80% overlap → 15pts; >= 60% → 8pts.
 */
export function addressCluster(
  orderA: NormalisedOrder,
  orderB: NormalisedOrder
): IdentitySignalResult {
  const a = orderA as OrderWithRaw;
  const b = orderB as OrderWithRaw;

  if (!a._rawAddress || !b._rawAddress) {
    return {
      signal: 'addressCluster',
      fired: false,
      confidence: 0,
      evidence: 'address missing',
      dataPointsUsed: [],
      dataPointsMissing: ['shipping_address'],
    };
  }

  const wordsA = new Set(a._rawAddress.split(/\s+/).filter((w) => w.length > 1));
  const wordsB = new Set(b._rawAddress.split(/\s+/).filter((w) => w.length > 1));

  if (wordsA.size === 0 || wordsB.size === 0) {
    return {
      signal: 'addressCluster',
      fired: false,
      confidence: 0,
      evidence: 'address too short to compare',
      dataPointsUsed: ['shipping_address'],
      dataPointsMissing: [],
    };
  }

  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  const overlap = intersection / union;

  let score = 0;
  let evidenceText = 'insufficient address overlap';

  if (overlap >= 0.8) {
    score = 15;
    evidenceText = `address word overlap ${(overlap * 100).toFixed(0)}%`;
  } else if (overlap >= 0.6) {
    score = 8;
    evidenceText = `partial address word overlap ${(overlap * 100).toFixed(0)}%`;
  }

  return {
    signal: 'addressCluster',
    fired: score > 0,
    confidence: score,
    evidence: evidenceText,
    dataPointsUsed: ['shipping_address'],
    dataPointsMissing: [],
  };
}

/**
 * ipCluster — same IP across different identity presentations.
 * Weakest soft signal — IPs are shared widely.
 * Requires corroborating signals OR historical flagged_count >= 2.
 * NEVER fires as the only signal — callers enforce the IP-only guard.
 */
export function ipCluster(
  orderA: NormalisedOrder,
  orderB: NormalisedOrder,
  otherSignalsFired: boolean,
  ipFlaggedCount: number
): IdentitySignalResult {
  if (!orderA.ipHash || !orderB.ipHash) {
    const asymmetric = Boolean(orderA.ipHash) !== Boolean(orderB.ipHash);
    return {
      signal: 'ipCluster',
      fired: false,
      confidence: 0,
      evidence: asymmetric
        ? 'IP address missing on one order — cannot compare'
        : 'IP address missing on both orders',
      dataPointsUsed: asymmetric ? ['ip_address'] : [],
      dataPointsMissing: ['ip_address'],
    };
  }

  if (orderA.ipHash !== orderB.ipHash) {
    return {
      signal: 'ipCluster',
      fired: false,
      confidence: 0,
      evidence: 'different IP addresses',
      dataPointsUsed: ['ip_address'],
      dataPointsMissing: [],
    };
  }

  // IP match — fire with low confidence if alone, higher if corroborated
  if (otherSignalsFired || ipFlaggedCount >= 2) {
    return {
      signal: 'ipCluster',
      fired: true,
      confidence: 10,
      evidence:
        'same IP address' +
        (ipFlaggedCount >= 2 ? ` (historically flagged ${ipFlaggedCount}×)` : ''),
      dataPointsUsed: ['ip_address'],
      dataPointsMissing: [],
    };
  }

  // IP match with no corroboration — fire with low confidence.
  // The IP-only guard in clusterBatch will intercept this before clustering.
  return {
    signal: 'ipCluster',
    fired: true,
    confidence: 4,
    evidence: 'same IP address (no corroboration — guarded against clustering)',
    dataPointsUsed: ['ip_address'],
    dataPointsMissing: [],
  };
}

/**
 * nameVariant — similar names suggesting same person.
 * Uses Levenshtein distance on normalised name.
 * Distance 1–2 with length >= 5 → 8pts; distance 3 with length >= 8 → 4pts.
 */
export function nameVariant(
  orderA: NormalisedOrder,
  orderB: NormalisedOrder
): IdentitySignalResult {
  if (!orderA.customerNameNorm || !orderB.customerNameNorm) {
    return {
      signal: 'nameVariant',
      fired: false,
      confidence: 0,
      evidence: 'name missing',
      dataPointsUsed: [],
      dataPointsMissing: ['customer_name'],
    };
  }

  const nameA = orderA.customerNameNorm;
  const nameB = orderB.customerNameNorm;

  if (nameA === nameB) {
    return {
      signal: 'nameVariant',
      fired: false,
      confidence: 0,
      evidence: 'identical names — not a variant signal',
      dataPointsUsed: ['customer_name'],
      dataPointsMissing: [],
    };
  }

  const dist = levenshtein(nameA, nameB);
  let score = 0;
  let evidenceText = 'name similarity too low';

  if (dist <= 2 && nameA.length >= 5 && nameB.length >= 5) {
    score = 8;
    evidenceText = `name differs by ${dist} character${dist === 1 ? '' : 's'} ("${nameA}" vs "${nameB}")`;
  } else if (dist <= 3 && nameA.length >= 8 && nameB.length >= 8) {
    score = 4;
    evidenceText = `name differs by ${dist} characters ("${nameA}" vs "${nameB}")`;
  }

  return {
    signal: 'nameVariant',
    fired: score > 0,
    confidence: score,
    evidence: evidenceText,
    dataPointsUsed: ['customer_name'],
    dataPointsMissing: [],
  };
}

/**
 * accountLink — same merchant platform account ID across different surface identities.
 * Highest-trust soft signal — merchant controls this namespace.
 * A single accountLink alone is allowed to reach 'probable' (unlike all other soft signals).
 */
export function accountLink(
  orderA: NormalisedOrder,
  orderB: NormalisedOrder
): IdentitySignalResult {
  if (!orderA.accountIdHash || !orderB.accountIdHash) {
    return {
      signal: 'accountLink',
      fired: false,
      confidence: 0,
      evidence: 'account ID missing',
      dataPointsUsed: [],
      dataPointsMissing: ['account_id'],
    };
  }

  if (orderA.accountIdHash === orderB.accountIdHash) {
    return {
      signal: 'accountLink',
      fired: true,
      confidence: 25,
      evidence: 'same merchant account ID',
      dataPointsUsed: ['account_id'],
      dataPointsMissing: [],
    };
  }

  return {
    signal: 'accountLink',
    fired: false,
    confidence: 0,
    evidence: 'different account IDs',
    dataPointsUsed: ['account_id'],
    dataPointsMissing: [],
  };
}

/**
 * phoneMatch — same normalised phone number, different email.
 * Phone numbers change but less often than emails.
 */
export function phoneMatch(
  orderA: NormalisedOrder,
  orderB: NormalisedOrder
): IdentitySignalResult {
  if (!orderA.phoneHash || !orderB.phoneHash) {
    return {
      signal: 'phoneMatch',
      fired: false,
      confidence: 0,
      evidence: 'phone number missing',
      dataPointsUsed: [],
      dataPointsMissing: ['customer_phone'],
    };
  }

  if (orderA.phoneHash === orderB.phoneHash) {
    return {
      signal: 'phoneMatch',
      fired: true,
      confidence: 20,
      evidence: 'same normalised phone number',
      dataPointsUsed: ['customer_phone'],
      dataPointsMissing: [],
    };
  }

  return {
    signal: 'phoneMatch',
    fired: false,
    confidence: 0,
    evidence: 'different phone numbers',
    dataPointsUsed: ['customer_phone'],
    dataPointsMissing: [],
  };
}
